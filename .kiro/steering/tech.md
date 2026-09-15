---
inclusion: always
---

# Tech Stack

## Core Dependencies

| Concern | Library | Version |
|---|---|---|
| Runtime | Node.js | 24.x |
| Language | TypeScript | ~5.9 (strict mode) |
| Framework | React | 19.x |
| Build Tool | Vite | 8.x |
| Styling | Tailwind CSS (via `@tailwindcss/vite`) | 4.x |
| Routing | React Router DOM (`HashRouter`) | 7.x |
| HTTP Client | Axios (with Supabase JWT interceptor) | — |
| Auth | `@supabase/supabase-js` | — |
| Drag & Drop | `@dnd-kit/core`, `@dnd-kit/sortable` | — |
| Icons | Lucide React | — |
| Error Tracking | Sentry + `@dotevolve/error-utils` | — |

## Testing

| Concern | Library |
|---|---|
| Runner | Vitest 4.x (jsdom environment) |
| Component Testing | `@testing-library/react` + `@testing-library/jest-dom` |
| Property-Based | `fast-check` |

- Tests live in `src/__tests__/`.
- Property-based tests use the `.property.test.tsx` suffix and run a minimum of 100 iterations per property.
- `src/__tests__/infra-endpoint.test.ts` requires a live server — excluded from the default test run.

## Common Commands

```bash
npm run dev            # Development server
npm run build          # TypeScript check + Vite production build
npm test               # Run tests (single pass)
npm run test:coverage  # Tests with coverage
npm run lint           # ESLint
npm run preview        # Preview production build
npm run start          # Production start
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_API_GATEWAY_URL` | API Gateway base URL (default: `https://api.perfxcel.net`) |
| `SENTRY_ORG` | Sentry org slug (build-time) |
| `SENTRY_PROJECT` | Sentry project slug (build-time) |
| `SENTRY_AUTH_TOKEN` | Sentry auth token for source map upload (build-time) |

## Key Coding Conventions

### Styling
- Tailwind CSS v4 is loaded as a Vite plugin (`@tailwindcss/vite`). **There is no `tailwind.config.js`.**
- Apply utility classes directly in JSX. Never use inline `style` props for layout.

### API Calls
- **Never call `axios` directly in components or hooks.**
- Use `src/lib/api.ts` for general API Gateway calls — it attaches the Supabase JWT automatically.
- Use `src/lib/adminApi.ts` for admin-specific API calls.
- The Supabase client singleton lives in `src/lib/supabase.ts` — never instantiate a new client inline.

### Auth
- Auth state is managed in `App.tsx` via Supabase `onAuthStateChange`.
- `AuthGuard` protects all non-public routes. Never bypass it.
- Public routes (e.g. `/login`) sit outside `AuthGuard`.

### Routing
- Uses `HashRouter` — all routes are hash-based (e.g. `/#/tenants`, `/#/templates`).
- **All route definitions live exclusively in `App.tsx`.** Never define routes inside page or component files.

### Data Fetching
- Data-fetching and business logic belong in domain-scoped hooks in `src/hooks/`.
- Components call hooks — never call `api.ts` or `adminApi.ts` directly from a component or page.

### Error Tracking
- Sentry is configured via `@dotevolve/error-utils`. Never configure Sentry directly.
- Wrap risky operations with Sentry breadcrumbs.

### TypeScript
- Strict mode is enabled. All code must type-check cleanly. No `any` without an explicit justification comment.
- Shared types live in `src/types/`. Use `interface` for object shapes.

### Testing
- All tests live in `src/__tests__/`. Use Vitest with jsdom and `@testing-library/react`.
- Property-based tests use `fast-check` and the `.property.test.tsx` suffix.
- `src/__tests__/infra-endpoint.test.ts` requires a live server — excluded from the default test run.
