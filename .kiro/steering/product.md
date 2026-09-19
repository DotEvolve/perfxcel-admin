---
inclusion: always
---

# Product: Perfxcel LMS Admin Dashboard

Internal super-admin SPA for the Perfxcel LMS platform. Used exclusively by DotEvolve staff to manage courses, enrollments, taxonomies, enquiries, and audit logs. Not accessible to tenant users.

## Core Capabilities

- **Course Management**: Create, edit, publish, and bulk-manage courses with schedules, taxonomy associations, and delivery modes
- **Taxonomy Management**: Manage categories, cities, associations, and delivery modes used to classify courses
- **Interests & Enrollments**: View and act on learner interest submissions; convert to enrollments and manage status
- **Enquiries**: View and update the status of inbound enquiries
- **Audit Logs**: Paginated, filterable log of platform actions across tenants
- **Dashboard**: Real-time platform metrics fetched from the API on session start

## Users

Internal DotEvolve super admins only. Authentication is via Supabase Auth with SSO support.

## Tech Stack

| Concern        | Library                                                      |
| -------------- | ------------------------------------------------------------ |
| Framework      | React 19 + TypeScript 5.9                                    |
| Router         | react-router-dom v7 (`BrowserRouter` via `main.tsx`)         |
| Styling        | Tailwind CSS v4 via `@tailwindcss/vite`                      |
| HTTP           | axios — centralised in `src/lib/api.ts`                      |
| Auth           | `@supabase/supabase-js` — singleton in `src/lib/supabase.ts` |
| Build          | Vite 8                                                       |
| Testing        | Vitest 4 + jsdom + `@testing-library/react` + `fast-check`   |
| Error tracking | `@dotevolve/error-utils` (wraps Sentry)                      |
| UI Kit         | `@dotevolve/ui-kit`                                          |
| Drag-and-drop  | `@dnd-kit/core`, `@dnd-kit/sortable`                         |

## Deployment

- **URL**: `https://admin.perfxcel.net` (Cloudflare Pages)
- **API**: `https://api.perfxcel.net` — set via `VITE_API_URL`
- Source maps uploaded to Sentry via `@sentry/vite-plugin` on production builds

## Architecture Conventions

### Routing

- `BrowserRouter` is used (configured in `main.tsx`). Routes are path-based, not hash-based.
- All route definitions live exclusively in `App.tsx`. Never define routes inside page or component files.
- `AuthGuard` wraps all protected routes. The `/login` route sits outside it. Never bypass `AuthGuard`.
- `Layout` is a route element that renders the sidebar, header, and `<Outlet />`. Pages render inside it.

### API Calls

- **Never call `axios` directly in components or hooks.** All API calls go through the `api` instance exported from `src/lib/api.ts`.
- `src/lib/api.ts` exports the axios instance and all API functions. It attaches the Supabase JWT automatically via a request interceptor.
- Domain types and API function return types are co-located in `src/lib/api.ts` (e.g. `Course`, `CourseFormPayload`, `TaxonomyItem`, `PaginatedResponse<T>`).
- The Supabase client singleton is in `src/lib/supabase.ts` — never instantiate a new client elsewhere.

### Auth

- Session state is managed in `App.tsx` using `supabase.auth.getSession()` and `onAuthStateChange`.
- On session load, `getMetrics()` is called as a liveness check; a failure triggers sign-out.
- The `Session` type is imported from `@supabase/supabase-js`.

### Components & Pages

- Pages map 1:1 to routes and live in `src/pages/`. Keep them thin — delegate data-fetching and logic to hooks and components.
- Reusable components live flat in `src/components/` (not grouped by domain). Follow this flat structure unless there are many components.
- Data-fetching hooks live in `src/hooks/` and call functions from `src/lib/api.ts`.
- Shared domain types (not API-layer types) live in `src/types/`.

### Styling

- Tailwind CSS v4 via `@tailwindcss/vite` — **no `tailwind.config.js`** exists or should be created.
- Apply utility classes directly in JSX. Never use inline `style` props for layout or spacing.

### Error Tracking

- Use `@dotevolve/error-utils` — never configure or import Sentry directly.
- Wrap risky operations with Sentry breadcrumbs via the error-utils API.

### TypeScript

- Strict mode is enabled. No `any` without an explicit justification comment.
- Prefer `interface` for object shapes. Shared domain types go in `src/types/`; API response shapes are co-located in `src/lib/api.ts`.

### Testing

- Tests live in `src/__tests__/`. Use Vitest with jsdom and `@testing-library/react`.
- Property-based tests use `fast-check` and are named `*.property.test.ts(x)`. Run a minimum of 100 iterations per property.
- `src/__tests__/infra-endpoint.test.ts` requires a live server and is excluded from the default test run via `vite.config.ts`.
- Run tests with `npm test` (single pass). Coverage with `npm run test:coverage`.
