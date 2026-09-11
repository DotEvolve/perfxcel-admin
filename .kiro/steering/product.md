---
inclusion: always
---

# Product: Perfxcel LMS Admin Dashboard

Internal super-admin SPA for the Perfxcel LMS platform. Used exclusively by DotEvolve staff to manage the multi-tenant SaaS infrastructure. Not accessible to tenant users.

## Core Capabilities

- **Tenant Management**: Onboard tenants, manage subscriptions (FREE, STARTER, PROFESSIONAL, ENTERPRISE), view and edit tenant details
- **App Management**: Register and manage platform apps identified by slug (e.g. `perfxcel`)
- **Global Template Management**: Create and manage compliance workflow templates available across all tenants
- **Platform Metrics**: Real-time monitoring of infrastructure and service health
- **Settings**: System-level configuration management

## Users

Internal DotEvolve super admins only. Authentication is via Supabase Auth with SSO support. No tenant-facing access.

## Deployment

- **URL**: `https://admin.perfxcel.net` (Cloudflare Pages)
- **API**: Connects to the API Gateway at `https://api.perfxcel.net` (`VITE_API_GATEWAY_URL`)

## Key Conventions for AI Assistants

### Routing
- Uses `HashRouter` — all routes are hash-based (e.g. `/#/tenants`, `/#/templates`).
- All route definitions live exclusively in `App.tsx`. Never define routes inside page or component files.
- Public routes (e.g. `/login`) sit outside `AuthGuard`. All protected routes are wrapped in `AuthGuard`.

### API Calls
- **Never call `axios` directly in components or hooks.**
- Use `src/lib/api.ts` for general API Gateway calls (attaches Supabase JWT automatically).
- Use `src/lib/adminApi.ts` for admin-specific API calls.
- The Supabase client singleton lives in `src/lib/supabase.ts` — never instantiate a new client inline.

### Auth
- Auth state is managed in `App.tsx` via Supabase `onAuthStateChange`.
- `AuthGuard` protects all non-public routes. Never bypass it.

### Components & Pages
- Pages map 1:1 to routes and must stay thin — delegate logic to hooks and components.
- Components are grouped by domain under `src/components/` (e.g. `components/tenants/`, `components/templates/`).
- Data-fetching and business logic belong in domain-scoped hooks in `src/hooks/`.

### Styling
- Tailwind CSS v4 via `@tailwindcss/vite` — **no `tailwind.config.js`**.
- Apply utility classes directly in JSX. Never use inline `style` props for layout.

### Error Tracking
- Sentry is configured via `@dotevolve/error-utils`. Never configure Sentry directly.
- Wrap risky operations with Sentry breadcrumbs.

### TypeScript
- Strict mode is enabled. No `any` without an explicit justification comment.
- Shared types live in `src/types/`. Use interfaces for object shapes.

### Testing
- Tests live in `src/__tests__/`. Use Vitest with jsdom and `@testing-library/react`.
- Property-based tests use `fast-check` and the `.property.test.tsx` suffix.
- `src/__tests__/infra-endpoint.test.ts` requires a live server — excluded from the default test run.
