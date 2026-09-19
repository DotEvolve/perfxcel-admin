# Implementation Plan: Tenant User Management

## Overview

Implement cross-app tenant user management across four repositories in order:

1. **floorix-api** — webhook endpoint for proactive MongoDB profile sync
2. **dot-portal-api** — fire-and-forget webhook notification after user provisioning
3. **floorix-admin** — portalApiClient + TenantUsersTab + FloorixInviteModal + Tenants.tsx wiring
4. **govnix-admin** — read-only UserSummarySection + Tenants.tsx scope correction

Each group is self-contained and can be reviewed independently. All property tests use fast-check with `{ numRuns: 100 }` and are tagged with `// Feature: tenant-user-management, Property N: <property_text>`.

---

## Tasks

### Group 1 — floorix-api

- [x] 1. Implement `handleUserProvisioned` in `controllers/webhookController.js`
  - Add `exports.handleUserProvisioned = asyncHandler(async (req, res) => { ... })` alongside the existing `handleUserCreated` export
  - Validate `x-service-webhook-secret` header against `process.env.SERVICE_WEBHOOK_SECRET`; throw `new AppError('Unauthorized', 401)` on mismatch (same pattern as `handleUserCreated`)
  - Validate that `req.body` contains `userId`, `email`, and `tenantId`; throw `new AppError('Invalid payload: missing ...', 400)` if any field is absent
  - Idempotency guard: `User.findOne({ supabaseId: userId }).setOptions({ skipTenantFilter: true })`; return `res.status(200).json({ status: 'ok', message: 'already exists' })` if found
  - On new user: `User.create({ supabaseId: userId, email, name: email, username: email.toLowerCase(), tenantId })`; return `res.status(201).json({ status: 'ok' })`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 6.1_

  - [x] 1.1 Write unit tests for `handleUserProvisioned` (`tests/controllers/webhookController.userProvisioned.test.js`)
    - Example: valid payload creates Profile_Doc with correct fields and returns 201
    - Example: missing `userId` returns 400 and does not call `User.create`
    - Example: missing `email` returns 400 and does not call `User.create`
    - Example: missing `tenantId` returns 400 and does not call `User.create`
    - Example: wrong secret returns 401 and does not call `User.create`
    - Example: duplicate call (findOne returns existing doc) returns 200 "already exists" and does not call `User.create`
    - _Requirements: 1.2, 1.3, 1.5, 1.6, 1.7, 1.8_

  - [x] 1.2 Write property test — Property 1: Webhook secret rejection (`tests/property/userProvisionedSecretRejection.property.test.js`)
    - `// Feature: tenant-user-management, Property 1: For any x-service-webhook-secret value that is not equal to SERVICE_WEBHOOK_SECRET, handleUserProvisioned returns 401 and no Profile_Doc is created`
    - Arbitrary: `fc.string()` filtered to exclude the correct secret value
    - Assert: `next` called with `AppError` of `statusCode === 401`; `User.create` not called
    - `{ numRuns: 100 }`
    - _Requirements: 1.2, 1.3, 6.1_

  - [x] 1.3 Write property test — Property 2: Missing-field rejection (`tests/property/userProvisionedMissingField.property.test.js`)
    - `// Feature: tenant-user-management, Property 2: For any authenticated request missing at least one of userId/email/tenantId, handleUserProvisioned returns 400 and no Profile_Doc is created`
    - Arbitrary: `fc.record({ userId: fc.option(fc.uuid()), email: fc.option(fc.emailAddress()), tenantId: fc.option(fc.uuid()) })` with at least one field `null`/`undefined`
    - Assert: `next` called with `AppError` of `statusCode === 400`; `User.create` not called
    - `{ numRuns: 100 }`
    - _Requirements: 1.5_

  - [x] 1.4 Write property test — Property 3: Profile_Doc creation correctness (`tests/property/userProvisionedDocCorrectness.property.test.js`)
    - `// Feature: tenant-user-management, Property 3: For any valid (userId, email, tenantId) where no Profile_Doc exists, handleUserProvisioned creates exactly one Profile_Doc with fields matching the payload`
    - Arbitrary: `fc.record({ userId: fc.uuid(), email: fc.emailAddress(), tenantId: fc.uuid() })`
    - Assert: `User.create` called once with `{ supabaseId: userId, email, name: email, username: email.toLowerCase(), tenantId }`; response is 201
    - `{ numRuns: 100 }`
    - _Requirements: 1.6, 1.8_

  - [x] 1.5 Write property test — Property 4: Webhook idempotency (`tests/property/userProvisionedIdempotency.property.test.js`)
    - `// Feature: tenant-user-management, Property 4: For any valid webhook payload, calling handleUserProvisioned twice produces the same Profile_Doc state as calling it once; the second call returns 200 "already exists"`
    - Arbitrary: `fc.record({ userId: fc.uuid(), email: fc.emailAddress(), tenantId: fc.uuid() })`
    - Simulate first call (findOne → null → create), then second call (findOne → existing doc)
    - Assert: `User.create` called exactly once across both invocations; second response is 200 with `message: 'already exists'`
    - `{ numRuns: 100 }`
    - _Requirements: 1.7_

- [x] 2. Register `POST /user-provisioned` route in `Routes/webhookRoutes.js`
  - Add `router.post('/user-provisioned', webhookController.handleUserProvisioned);` alongside the existing `supabase-user-created` route
  - _Requirements: 1.1, 1.9_

  - [x] 2.1 Write route registration smoke test (`tests/integration/webhookRoutes.userProvisioned.test.js`)
    - Example: `POST /api/v1/webhooks/user-provisioned` with no secret returns 401 (not 404), confirming the route is registered
    - _Requirements: 1.1, 1.9_

- [ ] 3. Checkpoint — Group 1 complete
  - Ensure all tests pass, ask the user if questions arise.

---

### Group 2 — dot-portal-api

- [x] 4. Create `src/utils/floorixWebhook.ts`
  - Export `async function notifyFloorix(userId: string, email: string, tenantId: string): Promise<void>`
  - POST to `${process.env.FOOT_FACTORY_API_URL}/api/v1/webhooks/user-provisioned` using native `fetch`
  - Include header `x-service-webhook-secret: process.env.SERVICE_WEBHOOK_SECRET`
  - Body: `JSON.stringify({ userId, email, tenantId })`
  - Wrap entire call in `try/catch`; on any error call `console.error` and return — never re-throw
  - _Requirements: 2.3, 2.4, 2.5_

  - [x] 4.1 Write unit tests for `notifyFloorix` (`src/tests/unit/floorixWebhook.test.ts`)
    - Example: successful call sends POST to correct URL with correct headers and body
    - Example: network error is caught and does not throw; `console.error` is called
    - Example: non-2xx response is caught and does not throw
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 4.2 Write property test — Property 5: notifyFloorix fire-and-forget (`src/tests/property/notifyFloorixFireAndForget.property.test.ts`)
    - `// Feature: tenant-user-management, Property 5: For any error thrown or rejection returned by the outgoing fetch call, notifyFloorix resolves without throwing`
    - Arbitrary: `fc.anything()` as the rejection value thrown by the mocked `fetch`
    - Assert: `await notifyFloorix(...)` resolves (does not reject) for every generated error value
    - `{ numRuns: 100 }`
    - _Requirements: 2.4_

- [x] 5. Modify `inviteUser` in `src/controllers/userController.ts` to call `notifyFloorix`
  - Import `notifyFloorix` from `../utils/floorixWebhook`
  - After the successful `upsert` of role records and before `res.status(200)`, add:
    ```ts
    if (apps.includes("floorix")) {
      await notifyFloorix(invitedUserId, email, tenantId);
    }
    ```
  - _Requirements: 2.1, 2.6_

  - [x] 5.1 Write unit tests for `inviteUser` webhook integration (`src/tests/unit/inviteUserWebhook.test.ts`)
    - Example: `apps: ["floorix"]` → `notifyFloorix` called once with correct `(userId, email, tenantId)`
    - Example: `apps: ["govnix"]` → `notifyFloorix` NOT called
    - Example: `apps: ["floorix", "govnix"]` → `notifyFloorix` called once
    - _Requirements: 2.1, 2.6_

  - [x] 5.2 Write property test — Property 6: Foot-factory webhook triggered on invite (`src/tests/property/inviteUserWebhookTrigger.property.test.ts`)
    - `// Feature: tenant-user-management, Property 6: For any inviteUser call where apps contains "floorix", notifyFloorix is called exactly once; for any call where apps does not contain "floorix", notifyFloorix is not called`
    - Arbitrary: `fc.array(fc.string())` for the `apps` field
    - Assert: `notifyFloorix` called iff `apps.includes("floorix")`; call count is exactly 1 when triggered
    - `{ numRuns: 100 }`
    - _Requirements: 2.1, 2.6_

- [x] 6. Modify `grantAppAccess` in `src/controllers/userController.ts` to call `notifyFloorix`
  - After the successful `upsert` and `buildAndWrite` call, add:
    ```ts
    if (appSlug === "floorix") {
      const { data: targetUser } =
        await supabaseAdmin.auth.admin.getUserById(userId);
      if (targetUser?.user?.email) {
        await notifyFloorix(userId, targetUser.user.email, tenantId);
      }
    }
    ```
  - _Requirements: 2.2, 2.6_

  - [x] 6.1 Write unit tests for `grantAppAccess` webhook integration (`src/tests/unit/grantAppAccessWebhook.test.ts`)
    - Example: `appSlug === "floorix"` → `supabaseAdmin.auth.admin.getUserById` called; `notifyFloorix` called once with resolved email
    - Example: `appSlug === "govnix"` → `notifyFloorix` NOT called
    - Example: `getUserById` returns no email → `notifyFloorix` NOT called
    - _Requirements: 2.2, 2.6_

  - [x] 6.2 Write property test — Property 7: Foot-factory webhook triggered on grant (`src/tests/property/grantAppAccessWebhookTrigger.property.test.ts`)
    - `// Feature: tenant-user-management, Property 7: For any grantAppAccess call where appSlug === "floorix", notifyFloorix is called exactly once; for any appSlug !== "floorix", notifyFloorix is not called`
    - Arbitrary: `fc.string()` for `appSlug`
    - Assert: `notifyFloorix` called iff `appSlug === "floorix"`; call count is exactly 1 when triggered
    - `{ numRuns: 100 }`
    - _Requirements: 2.2, 2.6_

- [ ] 7. Checkpoint — Group 2 complete
  - Ensure all tests pass, ask the user if questions arise.

---

### Group 3 — floorix-admin

- [x] 8. Create `src/lib/portalApi.ts` — `portalApiClient` Axios instance
  - Create Axios instance with `baseURL: import.meta.env.VITE_PORTAL_API_URL ?? "https://portal-api.dotevolve.net"` and `headers: { "Content-Type": "application/json" }`
  - Request interceptor: attach `Authorization: Bearer <token>` from `localStorage.getItem("auth_token")` — same pattern as `src/lib/axios.ts`
  - Response interceptor: capture HTTP 5xx to Sentry with `correlationId` from response body — same pattern as `src/lib/axios.ts`
  - Response interceptor: on 401 (non-auth endpoint), reuse the existing `refreshPromise` singleton pattern from `src/lib/axios.ts`, calling `apiClient.get("/auth/refresh")` to obtain a new token, then retry the original portal-api request
  - On refresh failure: remove token from localStorage, redirect to `/login` (same guard as `apiClient`)
  - Export `portalApiClient` as named export
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.3_

  - [x] 8.1 Write unit tests for `portalApiClient` (`src/test/portalApiClient.test.ts`)
    - Example: 5xx response triggers `Sentry.captureException` with `correlationId`
    - Example: 401 triggers refresh via `apiClient` then retries original request with new token
    - Example: failed refresh redirects to `/login`
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 8.2 Write property test — Property 8: portalApiClient JWT attachment (`src/test/portalApiClientJwt.property.test.ts`)
    - `// Feature: tenant-user-management, Property 8: For any auth_token stored in localStorage, every HTTP request made via portalApiClient includes an Authorization: Bearer <auth_token> header`
    - Arbitrary: `fc.string()` for `auth_token`
    - Mock `localStorage.getItem` to return the generated token; intercept the outgoing request config
    - Assert: `config.headers["Authorization"] === \`Bearer \${token}\``
    - `{ numRuns: 100 }`
    - _Requirements: 4.2, 6.3_

- [x] 9. Create `src/components/TenantUsersTab.tsx`
  - Props: `{ tenantId: string }`
  - State: `users: UserRow[]`, `loading: boolean`, `error: string | null`, `revokingId: string | null`, `showInviteModal: boolean`
  - `UserRow` type: `{ userId: string; email?: string; role: string }`
  - On mount: fetch `GET /api/v1/tenants/:tenantId/users` via `portalApiClient`; filter to users with `roles.some(r => r.appSlug === "floorix")`; map to `UserRow[]`
  - Loading state: render a spinner
  - Empty state: render "No users have floorix access for this tenant."
  - Error state: render inline error banner with a Retry button that re-fetches
  - User list: display each user's `email` (fallback to `userId`) and their `floorix` role
  - "Invite User" button: sets `showInviteModal = true`
  - "Revoke Access" button per row: calls `DELETE /api/v1/tenants/:tenantId/users/:userId/apps/floorix` via `portalApiClient`; on success, remove user from local state (optimistic); on error, display inline error and leave list unchanged; disable button while request is in flight
  - Render `<FloorixInviteModal>` when `showInviteModal` is true; on success close modal and re-fetch
  - Use `portalApiClient` for all calls — never `apiClient`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.12, 3.13, 3.14, 3.15, 3.16, 3.17, 3.18, 3.19, 6.4_

  - [x] 9.1 Write unit tests for `TenantUsersTab` (`src/test/TenantUsersTab.test.tsx`)
    - Example: loading spinner shown while fetch is pending
    - Example: empty state shown when API returns no floorix users
    - Example: error banner + Retry button shown on fetch failure
    - Example: Retry button triggers re-fetch
    - Example: Revoke button is disabled while revoke request is in flight
    - Example: inline error shown on revoke failure; list is unchanged
    - Example: 401/403 from portal-api surfaces as inline error message
    - _Requirements: 3.3, 3.6, 3.7, 3.8, 3.17, 3.18, 6.4_

  - [x] 9.2 Write property test — Property 9: TenantUsersTab floorix filter invariant (`src/test/tenantUsersTabFilter.property.test.tsx`)
    - `// Feature: tenant-user-management, Property 9: For any user list returned by the API, the set of users rendered by TenantUsersTab is a subset of the API response and every rendered user has at least one role with appSlug === "floorix"`
    - Arbitrary: `fc.array(fc.record({ userId: fc.uuid(), roles: fc.array(fc.record({ appSlug: fc.string(), role: fc.string() }), { minLength: 0, maxLength: 5 }) }), { minLength: 0, maxLength: 20 })`
    - Mock `portalApiClient` to return the generated user list; render `<TenantUsersTab>`; collect rendered user rows
    - Assert: every rendered user exists in the API response; every rendered user has `roles.some(r => r.appSlug === "floorix")`
    - `{ numRuns: 100 }`
    - _Requirements: 3.4, 3.5_

  - [x] 9.3 Write property test — Property 10: Optimistic revoke removes user from view (`src/test/tenantUsersTabRevoke.property.test.tsx`)
    - `// Feature: tenant-user-management, Property 10: For any user currently displayed in TenantUsersTab, after a successful DELETE response for that user, the user does not appear in the rendered list`
    - Arbitrary: generate a non-empty list of floorix users; pick one to revoke
    - Mock `portalApiClient` DELETE to resolve successfully; render component; trigger revoke for the chosen user
    - Assert: the revoked user's `userId` is not present in the rendered list after the action
    - `{ numRuns: 100 }`
    - _Requirements: 3.16_

- [x] 10. Create `src/components/FloorixInviteModal.tsx`
  - Props: `{ tenantId: string; onClose: () => void; onSuccess: () => void }`
  - Fields: email (required, `type="email"`), role selector (`"user"` default, `"tenant-admin"` option)
  - The `floorix` app is pre-selected and the checkbox/indicator is `disabled` — cannot be deselected
  - On submit: POST to `/api/v1/tenants/:tenantId/users/invite` via `portalApiClient` with body `{ email, role, apps: ["floorix"] }`
  - On success: call `onSuccess()`
  - On error: display inline error message inside the modal
  - _Requirements: 3.9, 3.10, 3.11, 3.12, 3.13_

  - [x] 10.1 Write unit tests for `FloorixInviteModal` (`src/test/FloorixInviteModal.test.tsx`)
    - Example: floorix checkbox/indicator is checked and `disabled`
    - Example: inline error shown on invite failure; modal stays open
    - Example: `onSuccess` called and modal closes on successful invite
    - _Requirements: 3.10, 3.12, 3.13_

  - [x] 10.2 Write property test — Property 11: Invite always includes floorix app (`src/test/floorixInviteModalApps.property.test.tsx`)
    - `// Feature: tenant-user-management, Property 11: For any valid (email, role) pair submitted via FloorixInviteModal, the POST body always includes apps: ["floorix"]`
    - Arbitrary: `fc.emailAddress()` × `fc.constantFrom("user", "tenant-admin")`
    - Mock `portalApiClient.post`; render modal; fill in generated email and role; submit
    - Assert: the captured POST body contains `apps` array that includes `"floorix"`
    - `{ numRuns: 100 }`
    - _Requirements: 3.11_

- [x] 11. Modify `src/pages/Tenants.tsx` in floorix-admin — add Users panel
  - Add state: `usersPanelTenant: { id: string; name: string } | null`
  - Add a "Users" button in the Actions column for each tenant row (alongside the existing "Configure" button): `onClick={() => setUsersPanelTenant({ id: tenant._id, name: tenant.name })}`
  - Create a `TenantUsersPanel` component (inline or separate file) — a slide-out panel (same visual pattern as `TenantConfigPanel`) that renders `<TenantUsersTab tenantId={tenantId} />` with a close button
  - Render `<TenantUsersPanel>` when `usersPanelTenant` is non-null; pass `onClose={() => setUsersPanelTenant(null)}`
  - Do not modify the existing `TenantConfigPanel` or any other existing actions
  - _Requirements: 3.1, 3.2_

- [ ] 12. Checkpoint — Group 3 complete
  - Ensure all tests pass, ask the user if questions arise.

---

### Group 4 — govnix-admin

- [x] 13. Create `src/components/UserSummarySection.tsx`
  - Props: `{ tenantId: string }`
  - State: `count: number | null`, `loading: boolean`, `error: string | null`
  - On mount: fetch `GET /api/v1/tenants/:tenantId/users` via the existing `adminApi` Axios instance
  - Count logic: `(data.users ?? []).filter(u => u.roles.some((r: { appSlug: string }) => r.appSlug === "govnix")).length`
  - Loading state: render a loading indicator (spinner)
  - Error state: render inline error message; do not display a count; include message for 401/403 indicating action is not authorised
  - Success state: render `"X users with govnix access"` and a link labelled "Manage Users in Dot Admin" with `href="https://admin.dotevolve.net"`, `target="_blank"`, `rel="noopener noreferrer"`
  - No invite button, no deactivate action, no write controls of any kind
  - Component unmounts when the tenant row collapses, releasing all state (this is handled by the parent's conditional render)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 6.5_

  - [x] 13.1 Write unit tests for `UserSummarySection` (`src/__tests__/UserSummarySection.test.tsx`)
    - Example: loading indicator shown while fetch is pending
    - Example: error message shown on fetch failure; no count displayed
    - Example: "Manage Users in Dot Admin" link has `href="https://admin.dotevolve.net"` and `target="_blank"`
    - Example: no invite/deactivate buttons rendered
    - Example: correct govnix user count displayed on success
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 13.2 Write property test — Property 12: UserSummarySection govnix count invariant (`src/__tests__/userSummarySectionCount.property.test.tsx`)
    - `// Feature: tenant-user-management, Property 12: For any user list returned by the API, the count displayed by UserSummarySection equals the number of users whose roles array contains at least one entry with appSlug === "govnix"`
    - Arbitrary: `fc.array(fc.record({ userId: fc.uuid(), roles: fc.array(fc.record({ appSlug: fc.string(), role: fc.string() }), { minLength: 0, maxLength: 5 }) }), { minLength: 0, maxLength: 30 })`
    - Mock `adminApi` to return the generated user list; render `<UserSummarySection>`
    - Compute expected count: `users.filter(u => u.roles.some(r => r.appSlug === "govnix")).length`
    - Assert: rendered count text equals expected count
    - `{ numRuns: 100 }`
    - _Requirements: 5.4_

- [x] 14. Modify `src/pages/Tenants.tsx` in govnix-admin — add `UserSummarySection` and remove old write components
  - Import `UserSummarySection` from `../components/UserSummarySection`
  - In the expanded row (`{isExpanded && ...}` block), after `<AppAssignmentsSection tenantId={tenant.id} />`, add:
    ```tsx
    <hr className="my-5 border-slate-200" />
    <UserSummarySection tenantId={tenant.id} />
    ```
  - Remove any imports and usages of `UserService`, `InviteUserModal`, or `TenantUserManagementSection` if they exist in the file
  - _Requirements: 5.1, 5.8, 5.9_

  - [x] 14.1 Write unit test for `Tenants.tsx` integration (`src/__tests__/TenantsUserSummary.test.tsx`)
    - Example: `UserSummarySection` is rendered below `AppAssignmentsSection` in the expanded row
    - Example: no `InviteUserModal`, `UserService`, or `TenantUserManagementSection` components are rendered
    - _Requirements: 5.1, 5.9_

- [ ] 15. Final checkpoint — All groups complete
  - Ensure all tests pass across all four repositories, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `{ numRuns: 100 }` and are tagged with `// Feature: tenant-user-management, Property N: <property_text>`
- floorix-api tests are Jest + CommonJS (`tests/` directory)
- dot-portal-api tests are Vitest + TypeScript (`src/tests/` directory)
- floorix-admin tests are Vitest + RTL + fast-check (`src/test/` directory)
- govnix-admin tests are Vitest + RTL + fast-check (`src/__tests__/` directory)
- The existing `handleUserCreated` handler and `supabase-user-created` route are not modified
- `portalApiClient` reuses `apiClient`'s `/auth/refresh` endpoint for token refresh — no new auth endpoint needed
- `notifyFloorix` is always fire-and-forget; errors never propagate to the caller
