# Requirements Document

## Introduction

This document covers the **cross-app tenant user management system** for the DotEvolve platform. It supersedes the earlier govnix-admin–only spec and broadens the scope to three distinct gaps identified after the centralized architecture was established.

### Centralized architecture summary

User identity is owned by **Supabase Auth**. User roles are stored in the `user_tenant_roles` table in Supabase Postgres: `(user_id, tenant_id, app_slug, role)`. The **dot-portal-api** is the single source of truth for all tenant and user management operations. The **dot-admin** super-admin UI is the canonical place to manage users across all apps — it already has a working `UserTable` and `InviteUserModal` backed by dot-portal-api.

App-specific admin dashboards (`govnix-admin`, `floorix-admin`) must **not** duplicate full user management. They may show app-scoped user summaries and delegate write operations to dot-admin or dot-portal-api.

### Gaps addressed by this spec

| Gap | System(s) affected | Nature |
|-----|--------------------|--------|
| Gap 1 | floorix-api, dot-portal-api | Backend: proactive profile sync via webhook |
| Gap 2 | floorix-admin | Frontend: read/write user management UI scoped to floorix |
| Gap 3 | govnix-admin | Frontend: scope correction — read-only summary only |

---

## Glossary

- **Portal_API**: The dot-portal-api service — central registry for tenants, app assignments, user roles, and billing. Base URL: `https://portal-api.dotevolve.net`.
- **Foot_Factory_API**: The floorix-api service — Node.js/Express app backed by MongoDB. Manages floorix domain objects and user profile docs.
- **Foot_Factory_Admin**: The floorix-admin React application — app-specific super-admin UI for floorix.
- **Cos_Admin_Dashboard**: The govnix-admin React application at `https://admin.govnix.net`.
- **Dot_Admin**: The dot-admin React application — the centralized super-admin UI for dot-portal-api. The single place to manage users across all apps.
- **Super_Admin**: An authenticated DotEvolve operator (role: `super-admin`).
- **Tenant**: A SaaS client organisation identified by a UUID in dot-portal-api.
- **Profile_Doc**: A MongoDB User document in Foot_Factory_API that stores floorix–specific profile data for a Supabase user. Fields: `supabaseId`, `email`, `name`, `username`, `tenantId`.
- **Tenant_Role_Record**: A row in the Supabase `user_tenant_roles` table: `(user_id, tenant_id, app_slug, role)`.
- **Webhook_Secret**: A shared service secret stored in the `SERVICE_WEBHOOK_SECRET` environment variable, used to authenticate server-to-server webhook calls. Sent as the `x-service-webhook-secret` request header.
- **Foot_Factory_Webhook_Endpoint**: The new `POST /api/v1/webhooks/user-provisioned` endpoint in Foot_Factory_API that creates a Profile_Doc proactively.
- **Portal_User_API**: The set of user management endpoints on Portal_API: list, invite, grant, revoke, update-role, remove.
- **TenantUsersTab**: The new "Users" tab component rendered inside the Tenants page of Foot_Factory_Admin.
- **UserSummarySection**: The read-only user count sub-section rendered inside the expanded tenant row in Cos_Admin_Dashboard.
- **App_Slug**: The string identifier for an application in the platform. The floorix app slug is `"floorix"`. The govnix app slug is `"govnix"`.
- **apiClient**: The Axios instance in `floorix-admin/src/lib/axios.ts` that attaches the Supabase JWT and handles token refresh.
- **portalApiClient**: A new Axios instance in `floorix-admin/src/lib/portalApi.ts` that points to Portal_API and attaches the Supabase JWT. Used by TenantUsersTab.

---

## Requirements

---

### Requirement 1: Foot-Factory-API — Webhook Endpoint for Proactive Profile Sync

**User Story:** As a platform operator, I want Foot_Factory_API to expose a webhook endpoint that Portal_API can call after granting a user access to the floorix app, so that the user's Profile_Doc exists in MongoDB before they log in for the first time.

#### Acceptance Criteria

1. THE Foot_Factory_API SHALL expose a `POST /api/v1/webhooks/user-provisioned` endpoint (the Foot_Factory_Webhook_Endpoint).
2. WHEN a request arrives at the Foot_Factory_Webhook_Endpoint, THE Foot_Factory_API SHALL validate that the `x-service-webhook-secret` request header matches the `SERVICE_WEBHOOK_SECRET` environment variable.
3. IF the `x-service-webhook-secret` header is absent or does not match `SERVICE_WEBHOOK_SECRET`, THEN THE Foot_Factory_Webhook_Endpoint SHALL return HTTP 401 and SHALL NOT create or modify any Profile_Doc.
4. WHEN the Foot_Factory_Webhook_Endpoint receives a valid authenticated request, THE Foot_Factory_API SHALL expect a JSON body containing `userId` (Supabase UUID string), `email` (string), and `tenantId` (string).
5. IF the request body is missing `userId`, `email`, or `tenantId`, THEN THE Foot_Factory_Webhook_Endpoint SHALL return HTTP 400 with a descriptive error message and SHALL NOT create any Profile_Doc.
6. WHEN the Foot_Factory_Webhook_Endpoint receives a valid payload for a `userId` that does not yet have a Profile_Doc, THE Foot_Factory_API SHALL create a Profile_Doc with `supabaseId` set to `userId`, `email` set to the provided email, `name` set to the provided email, `username` set to the provided email (lowercased), and `tenantId` set to the provided tenantId.
7. WHEN the Foot_Factory_Webhook_Endpoint receives a valid payload for a `userId` that already has a Profile_Doc, THE Foot_Factory_API SHALL return HTTP 200 with `{ "status": "ok", "message": "already exists" }` and SHALL NOT modify the existing Profile_Doc.
8. WHEN a Profile_Doc is successfully created by the Foot_Factory_Webhook_Endpoint, THE Foot_Factory_API SHALL return HTTP 201 with `{ "status": "ok" }`.
9. THE Foot_Factory_Webhook_Endpoint SHALL be registered in `webhookRoutes.js` alongside the existing `supabase-user-created` route, following the same authentication pattern.

#### Correctness Properties

- **Idempotency**: FOR ALL valid webhook payloads `p`, calling the Foot_Factory_Webhook_Endpoint with `p` twice SHALL produce the same Profile_Doc state as calling it once. The second call SHALL return HTTP 200 `"already exists"` and the Profile_Doc count for `p.userId` SHALL equal 1.
- **Error conditions**: FOR ALL payloads missing one or more of `userId`, `email`, `tenantId`, THE Foot_Factory_Webhook_Endpoint SHALL return HTTP 400 and the Profile_Doc collection SHALL be unchanged.

---

### Requirement 2: Portal-API — Call Foot-Factory Webhook After User Provisioning

**User Story:** As a platform operator, I want Portal_API to notify Foot_Factory_API whenever a user is granted access to the floorix app, so that the Profile_Doc is created proactively without relying on lazy creation at first login.

#### Acceptance Criteria

1. WHEN Portal_API successfully executes `inviteUser` and the `apps` array in the request body contains `"floorix"`, THE Portal_API SHALL send a POST request to the Foot_Factory_Webhook_Endpoint with the invited user's Supabase `userId`, `email`, and `tenantId`.
2. WHEN Portal_API successfully executes `grantAppAccess` and the `appSlug` in the request body equals `"floorix"`, THE Portal_API SHALL send a POST request to the Foot_Factory_Webhook_Endpoint with the target user's Supabase `userId`, `email`, and `tenantId`.
3. THE Portal_API SHALL include the `x-service-webhook-secret` header (value from `SERVICE_WEBHOOK_SECRET` environment variable) on all requests to the Foot_Factory_Webhook_Endpoint.
4. IF the Foot_Factory_Webhook_Endpoint returns an error response or is unreachable, THEN THE Portal_API SHALL log the error but SHALL NOT fail the original `inviteUser` or `grantAppAccess` response — the user's Tenant_Role_Record has already been created and the invite email has been sent.
5. THE Portal_API SHALL resolve the Foot_Factory_API base URL from the `FOOT_FACTORY_API_URL` environment variable.
6. WHEN Portal_API executes `inviteUser` or `grantAppAccess` for an `app_slug` other than `"floorix"`, THE Portal_API SHALL NOT send any request to the Foot_Factory_Webhook_Endpoint.

---

### Requirement 3: Foot-Factory-Admin — Users Tab in Tenants Page

**User Story:** As a Super_Admin using Foot_Factory_Admin, I want to see and manage the users who have floorix access for a selected tenant, so that I can audit and control access without switching to Dot_Admin.

#### Acceptance Criteria

1. THE Foot_Factory_Admin Tenants page SHALL display a "Users" tab alongside the existing tenant configuration options for the selected tenant.
2. WHEN the Super_Admin selects the "Users" tab for a tenant, THE TenantUsersTab SHALL fetch the user list by calling `GET /api/v1/tenants/:tenantId/users` on Portal_API via `portalApiClient`.
3. WHILE the user list is loading, THE TenantUsersTab SHALL display a loading spinner.
4. WHEN the user list loads successfully, THE TenantUsersTab SHALL display only users who have at least one Tenant_Role_Record with `app_slug = "floorix"` for the selected tenant.
5. WHEN the user list loads successfully, THE TenantUsersTab SHALL display each user's email address and their role for the `"floorix"` app.
6. WHEN the user list is empty (no users with floorix access), THE TenantUsersTab SHALL display a message indicating that no users have floorix access for this tenant.
7. IF Portal_API returns an error when fetching users, THEN THE TenantUsersTab SHALL display an inline error message and a Retry button.
8. WHEN the Super_Admin clicks the Retry button after a fetch error, THE TenantUsersTab SHALL re-fetch the user list from Portal_API.
9. THE TenantUsersTab SHALL display an "Invite User" button that opens an invite modal.
10. WHEN the Super_Admin opens the invite modal from TenantUsersTab, THE invite modal SHALL pre-select `"floorix"` in the app access checkboxes and SHALL NOT allow the Super_Admin to deselect it.
11. WHEN the Super_Admin submits the invite modal with a valid email and role, THE TenantUsersTab SHALL call `POST /api/v1/tenants/:tenantId/users/invite` on Portal_API with `apps: ["floorix"]` included in the request body.
12. WHEN Portal_API returns a success response to the invite request, THE TenantUsersTab SHALL close the modal and refresh the user list.
13. IF Portal_API returns an error response to the invite request, THEN THE invite modal SHALL display an inline error message.
14. THE TenantUsersTab SHALL display a "Revoke Access" button for each user row.
15. WHEN the Super_Admin clicks "Revoke Access" for a user, THE TenantUsersTab SHALL call `DELETE /api/v1/tenants/:tenantId/users/:userId/apps/floorix` on Portal_API.
16. WHEN Portal_API returns a success response to the revoke request, THE TenantUsersTab SHALL remove the user from the displayed list without a full re-fetch.
17. IF Portal_API returns an error response to the revoke request, THEN THE TenantUsersTab SHALL display an inline error message and leave the user list unchanged.
18. WHILE a revoke request is in flight for a specific user, THE TenantUsersTab SHALL disable the "Revoke Access" button for that user.
19. THE TenantUsersTab SHALL use `portalApiClient` for all Portal_API calls and SHALL NOT call `apiClient` (the floorix-api Axios instance) for user management operations.

#### Correctness Properties

- **Filter invariant**: FOR ALL user lists returned by Portal_API, the count of users displayed by TenantUsersTab SHALL be less than or equal to the total count of users in the API response. Every displayed user SHALL have at least one role entry with `app_slug === "floorix"`.
- **Revoke removes from view**: FOR ALL users displayed in TenantUsersTab, after a successful revoke call for that user, the user SHALL NOT appear in the displayed list.

---

### Requirement 4: Foot-Factory-Admin — Portal API Client

**User Story:** As a developer, I want a dedicated Axios instance in Foot_Factory_Admin that points to Portal_API, so that user management calls are cleanly separated from floorix-api calls and the correct base URL and auth headers are used.

#### Acceptance Criteria

1. THE Foot_Factory_Admin SHALL provide a `portalApiClient` Axios instance in `src/lib/portalApi.ts` with `baseURL` set from the `VITE_PORTAL_API_URL` environment variable, falling back to `"https://portal-api.dotevolve.net"`.
2. THE `portalApiClient` SHALL attach the Supabase JWT from `localStorage.getItem("auth_token")` as a `Bearer` token on every request, using the same interceptor pattern as `apiClient`.
3. THE `portalApiClient` SHALL handle 401 responses by attempting a token refresh via `apiClient`'s `/auth/refresh` endpoint, then retrying the original request with the new token.
4. IF the token refresh fails, THEN THE `portalApiClient` SHALL redirect the user to `/login`, consistent with the behaviour of `apiClient`.
5. THE `portalApiClient` SHALL capture HTTP 5xx errors to Sentry with the correlation ID from the response body, consistent with the behaviour of `apiClient`.

---

### Requirement 5: Dot-Cos-Admin-Dashboard — Read-Only User Summary (Scope Correction)

**User Story:** As a Super_Admin using Cos_Admin_Dashboard, I want to see a count of users who have govnix access for a tenant in the expanded tenant row, so that I have a quick audit signal without needing to leave the page for routine checks.

#### Acceptance Criteria

1. THE Cos_Admin_Dashboard expanded tenant row SHALL display a UserSummarySection below the App Assignments section, separated by a horizontal divider.
2. WHEN the tenant row is expanded, THE UserSummarySection SHALL fetch the user list by calling `GET /api/v1/tenants/:tenantId/users` on Portal_API via the existing `adminApi` Axios instance.
3. WHILE the user count is loading, THE UserSummarySection SHALL display a loading indicator.
4. WHEN the user list loads successfully, THE UserSummarySection SHALL display the count of users who have at least one Tenant_Role_Record with `app_slug = "govnix"` for the selected tenant.
5. THE UserSummarySection SHALL display a link labelled "Manage Users in Dot Admin" that navigates to `https://admin.dotevolve.net` in a new browser tab.
6. THE UserSummarySection SHALL NOT display an "Invite User" button, a deactivate action, or any other write control.
7. IF Portal_API returns an error when fetching users, THEN THE UserSummarySection SHALL display an inline error message. THE UserSummarySection SHALL NOT display a count.
8. WHEN the tenant row is collapsed, THE UserSummarySection SHALL be unmounted, releasing all associated state.
9. THE Cos_Admin_Dashboard SHALL remove any previously implemented `UserService`, `InviteUserModal`, or `TenantUserManagementSection` components that duplicate user management functionality already present in Dot_Admin.

#### Correctness Properties

- **Count invariant**: FOR ALL user lists returned by Portal_API, the count displayed by UserSummarySection SHALL equal the number of users in the API response whose `roles` array contains at least one entry with `app_slug === "govnix"`.

---

### Requirement 6: Authentication and Authorisation

**User Story:** As a platform operator, I want all user management API calls and webhook calls to be authenticated, so that tenant user data and profile creation are protected from unauthorised access.

#### Acceptance Criteria

1. THE Foot_Factory_Webhook_Endpoint SHALL reject all requests that do not include the correct `x-service-webhook-secret` header value with HTTP 401.
2. THE Portal_API SHALL authenticate all calls to the Foot_Factory_Webhook_Endpoint using the `x-service-webhook-secret` header.
3. THE `portalApiClient` in Foot_Factory_Admin SHALL attach a valid Supabase JWT on every request to Portal_API.
4. IF Portal_API returns HTTP 401 or 403 to any request from TenantUsersTab, THEN THE TenantUsersTab SHALL display an inline error message indicating that the action is not authorised.
5. IF Portal_API returns HTTP 401 or 403 to any request from UserSummarySection, THEN THE UserSummarySection SHALL display an inline error message indicating that the action is not authorised.
6. THE Portal_User_API endpoints SHALL enforce role-based access: Super_Admin may manage users for any tenant; a `tenant-admin` may only manage users for their own tenant and only for apps they themselves have access to (scoped delegation).
