---
inclusion: always
---

# Project Structure

```
src/
├── __tests__/          # All tests (unit, integration, property-based)
│   └── tenants/        # Tenant-specific tests
├── assets/             # Static assets
├── components/         # Shared/reusable React components
│   ├── templates/      # Template-specific components
│   └── tenants/        # Tenant-specific components
├── config/             # App configuration constants
├── hooks/              # Custom React hooks (e.g. useTenantContext)
├── lib/
│   ├── api.ts          # Axios instance — attaches Supabase JWT, used for general API Gateway calls
│   ├── adminApi.ts     # Admin-specific API calls
│   └── supabase.ts     # Supabase client singleton — never instantiate inline
├── middleware/         # Express middleware (used by server.js)
├── pages/              # Route-level page components (one per route, kept thin)
├── types/              # Shared TypeScript interfaces and types
├── utils/              # Pure utility functions (no side effects, no API calls)
├── App.tsx             # Root component — HashRouter, all route definitions, auth state
├── main.tsx            # Entry point
└── vitest.setup.ts     # Global Vitest setup
```

## Routing

- Uses `HashRouter` — all routes are hash-based (e.g. `/#/tenants`, `/#/templates`).
- **All route definitions live exclusively in `App.tsx`.** Never define routes inside page or component files.
- Public routes (e.g. `/login`) sit outside `AuthGuard`. All protected routes are wrapped in `AuthGuard`.
- Auth state is managed in `App.tsx` via Supabase `onAuthStateChange`.

## Pages and Components

- Pages map 1:1 to routes. Keep them thin — delegate data-fetching and business logic to hooks, and rendering to components.
- Components are grouped by domain under `src/components/` (e.g. `components/tenants/`, `components/templates/`).
- Never put API calls or business logic directly in page or component files.

## API Calls

- **Never call `axios` directly in components or hooks.**
- Use `src/lib/api.ts` for general API Gateway calls (attaches Supabase JWT automatically).
- Use `src/lib/adminApi.ts` for admin-specific API calls.
- The Supabase client singleton lives in `src/lib/supabase.ts` — never instantiate a new client inline.

## Hooks

- Data-fetching and business logic belong in domain-scoped hooks in `src/hooks/`.
- Components call hooks — never call `api.ts` or `adminApi.ts` directly from a component or page.

## Types

- Shared TypeScript types live in `src/types/`. Use `interface` for object shapes.
- Strict mode is enabled — no `any` without an explicit justification comment.

## Testing

- All tests live in `src/__tests__/`. Use Vitest with jsdom and `@testing-library/react`.
- Property-based tests use `fast-check` and the `.property.test.tsx` suffix.
- `src/__tests__/infra-endpoint.test.ts` requires a live server — excluded from the default test run.

## Error Tracking

- Sentry is configured via `@dotevolve/error-utils`. Never configure Sentry directly.
- Wrap risky operations with Sentry breadcrumbs.

## Styling

- Tailwind CSS v4 via `@tailwindcss/vite` — **no `tailwind.config.js`**.
- Apply utility classes directly in JSX. Never use inline `style` props for layout.
