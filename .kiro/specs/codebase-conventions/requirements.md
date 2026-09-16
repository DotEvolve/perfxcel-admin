# Codebase Conventions — Requirements

## Overview

`perfxcel-admin` deviates from the established project conventions in three areas. This spec brings the codebase into alignment. All changes are frontend-only refactors with no new features and no behaviour changes visible to users.

The three deviations being fixed:

1. `BrowserRouter` is used instead of `HashRouter` (required for Cloudflare Pages hash-based routing)
2. The API client lives at `src/api.ts` instead of `src/lib/api.ts` (convention requires `src/lib/`)
3. Two large components (`Taxonomies` and `TaxonomyCard`) are defined inline in `App.tsx` instead of as a dedicated page file

These changes MUST be applied together in a single pass — migrating the API client and router in isolation would leave the codebase in a broken intermediate state.

---

## Requirements

### REQ-1: Router Migration — HashRouter

**REQ-1.1** `BrowserRouter` in `src/main.tsx` MUST be replaced with `HashRouter` imported from `react-router-dom`.

**REQ-1.2** All existing route paths remain unchanged — only the router type changes.

**REQ-1.3** After the change, all routes MUST be hash-based (e.g. `/#/`, `/#/courses`, `/#/login`). No server-side routing configuration is required for a hash-based SPA.

**REQ-1.4** No other changes to `main.tsx` are permitted in this task.

---

### REQ-2: API Client Migration — `src/api.ts` → `src/lib/api.ts`

**REQ-2.1** The file `src/api.ts` MUST be moved to `src/lib/api.ts`.

**REQ-2.2** The Axios instance creation, JWT interceptor, all exported interfaces (`Course`, `TaxonomyItem`, `PaginatedResponse<T>`), and all exported API helper functions MUST be preserved exactly — no logic changes during migration.

**REQ-2.3** All existing imports of `"../api"` or `"./api"` across the codebase MUST be updated to point to the new location:

| File | Old import | New import |
|---|---|---|
| `src/App.tsx` | `"./api"` | `"./lib/api"` |
| `src/components/CourseForm.tsx` | `"../api"` | `"../lib/api"` |
| `src/pages/CoursesList.tsx` | `"../api"` | `"../lib/api"` |
| `src/pages/Interests.tsx` | `"../api"` | `"../lib/api"` |
| `src/pages/Enrollments.tsx` | `"../api"` | `"../lib/api"` |
| `src/hooks/useMetrics.ts` | `"../api"` | `"../lib/api"` |

**REQ-2.4** The original `src/api.ts` MUST be deleted after all imports are updated.

**REQ-2.5** The `DashboardMetrics` type import added by the metrics spec (`import type { DashboardMetrics } from "./types/metrics"`) MUST be preserved in the migrated `src/lib/api.ts`.

**REQ-2.6** The `getMetrics` function added by the metrics spec MUST be preserved in the migrated `src/lib/api.ts`.

---

### REQ-3: Extract `Taxonomies` Page

**REQ-3.1** The `Taxonomies` function component and the `TaxonomyCard` function component MUST be extracted from `App.tsx` into a new file `src/pages/Taxonomies.tsx`.

**REQ-3.2** The extracted `Taxonomies` component MUST be the default export of `src/pages/Taxonomies.tsx`.

**REQ-3.3** `TaxonomyCard` MAY remain as a non-exported local component in `src/pages/Taxonomies.tsx` — it does not need to be promoted to `src/components/`.

**REQ-3.4** The `Taxonomies` import in `App.tsx` MUST be updated to use the new page file:
```typescript
import Taxonomies from "./pages/Taxonomies";
```

**REQ-3.5** The inline `Taxonomies` and `TaxonomyCard` function definitions MUST be removed from `App.tsx` after extraction.

**REQ-3.6** All imports that `Taxonomies` and `TaxonomyCard` depend on (e.g. `getTaxonomies`, `api`, `TaxonomyItem`) MUST move with them into `src/pages/Taxonomies.tsx`. They MUST import from `"../lib/api"` (the new location from REQ-2).

**REQ-3.7** The `App.tsx` import of `getTaxonomies` and `api` from `"./api"` MUST be removed if they are no longer used directly in `App.tsx` after the extraction.

---

### REQ-4: TypeScript Integrity

**REQ-4.1** The project MUST type-check cleanly (`tsc -b`) with no new type errors after all three changes are applied.

**REQ-4.2** No `any` types may be introduced by this refactor. Existing `any` usages in pages are pre-existing and out of scope.

---

## Out of Scope

- Replacing `console.error` calls in pages with structured logging — pre-existing, separate concern
- Migrating `TaxonomyCard` to `src/components/` — out of scope
- Adding error handling to `Taxonomies` beyond what already exists — out of scope
- Adding Sentry initialization (`main.tsx` has a comment placeholder) — separate spec
- Caching layer for any API calls — separate spec
