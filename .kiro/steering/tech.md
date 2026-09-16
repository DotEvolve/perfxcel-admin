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
| Property-Based | `fast-check` (min. 100 iterations per property) |

- All tests live in `src/__tests__/`.
- Property-based tests use the `.property.test.tsx` suffix.
- `src/__tests__/infra-endpoint.test.ts` requires a live server — excluded from the default test run.

## Common Commands

```bash
npm run dev            # Development server
npm run build          # TypeScript check + Vite production build
npm test               # Run tests (single pass)
npm run test:coverage  # Tests with coverage report
npm run lint           # ESLint
npm run preview        # Preview production build
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_API_GATEWAY_URL` | API Gateway base URL (default: `https://api.perfxcel.net`) |
| `SENTRY_ORG` | Sentry org slug (build-time only) |
| `SENTRY_PROJECT` | Sentry project slug (build-time only) |
| `SENTRY_AUTH_TOKEN` | Sentry auth token for source map upload (build-time only) |

## Architecture & Coding Conventions

### Styling
- Tailwind CSS v4 is loaded as a Vite plugin. **There is no `tailwind.config.js`** — do not create one.
- Apply utility classes directly in JSX. Never use inline `style` props for layout or spacing.

### API Layer
- **Never call `axios` directly from components or hooks.**
- Use `src/lib/api.ts` for API Gateway calls — it attaches the Supabase JWT automatically.
- Use `src/lib/adminApi.ts` for admin-specific endpoints.
- The Supabase client singleton lives in `src/lib/supabase.ts` — never instantiate a new client elsewhere.

### Auth & Routing
- Auth state is managed in `App.tsx` via `onAuthStateChange`. Do not replicate this logic elsewhere.
- `AuthGuard` wraps all protected routes. Never bypass it; public routes (e.g. `/login`) sit outside it.
- Uses `HashRouter` — all routes are hash-based (e.g. `/#/tenants`).
- **All route definitions live exclusively in `App.tsx`.** Never define routes inside page or component files.

### Data Fetching
- Business logic and data fetching belong in domain-scoped hooks under `src/hooks/`.
- Components call hooks only — never import or call `api.ts` or `adminApi.ts` directly from a component or page file.

### Error Tracking
- Sentry is configured exclusively via `@dotevolve/error-utils`. Never configure Sentry directly.
- Wrap risky operations with Sentry breadcrumbs where appropriate.

### TypeScript
- Strict mode is enabled. All code must type-check cleanly with no `any` unless justified by an inline comment.
- Shared types live in `src/types/`. Prefer `interface` for object shapes.
