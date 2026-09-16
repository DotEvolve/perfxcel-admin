# Dashboard Metrics — Requirements

## Overview

The PerfXcel Admin Dashboard currently renders a stub (heading + welcome text). This spec covers implementing a real metrics endpoint in the backend and wiring it to a functional Dashboard page in the admin frontend.

The implementation also pays down existing technical debt: extracting inline components from `App.tsx`, introducing a `src/hooks/` layer, and adding a `src/types/` directory — bringing the codebase into alignment with project conventions.

---

## Requirements

### REQ-1: Backend — Metrics Endpoint

**REQ-1.1** The API MUST expose a `GET /api/v1/metrics` endpoint that returns aggregate counts for all key entities.

**REQ-1.2** The endpoint MUST return the following data shape:

```typescript
{
  courses: { total: number };
  taxonomies: {
    categories: number;
    cities: number;
    associations: number;
    delivery_modes: number;
  };
  interests: {
    new: number;
    contacted: number;
    enrolled: number;
    rejected: number;
  };
  enrollments: {
    pending: number;
    in_progress: number;
    achieved: number;
    dropped: number;
  };
}
```

**REQ-1.3** All Supabase queries MUST run concurrently using `Promise.all` — no sequential awaits.

**REQ-1.4** Count queries MUST use `{ count: "exact", head: true }` to avoid transferring row data.

**REQ-1.5** Per-status counts for `interests` and `enrollments` MUST be fetched as separate concurrent count queries (one per status value), not by fetching all rows and aggregating in JS.

**REQ-1.6** The controller MUST throw typed `AppError` subclasses on any Supabase error. It MUST NOT write `res.status(4xx).json(...)` directly.

**REQ-1.7** The route handler MUST be wrapped with `asyncHandler` from `@dotevolve/error-utils`.

**REQ-1.8** The route file MUST export a `Router` and be mounted at `/api/v1/metrics` in `src/app.ts`.

**REQ-1.9** For MVP the endpoint is unauthenticated (consistent with all other current routes). A comment MUST be added noting that auth should be added before going to production.

---

### REQ-2: Frontend — Types

**REQ-2.1** A `src/types/` directory MUST be created.

**REQ-2.2** A `DashboardMetrics` interface MUST be defined in `src/types/metrics.ts` matching the backend response shape exactly.

---

### REQ-3: Frontend — API Helper

**REQ-3.1** A `getMetrics()` function MUST be added to `src/api.ts` that calls `GET /metrics` via the existing `api` Axios instance.

**REQ-3.2** The function MUST return `Promise<DashboardMetrics>` using the type from REQ-2.2.

**REQ-3.3** The function MUST NOT call `axios` directly — it MUST use the existing `api` instance.

---

### REQ-4: Frontend — Hook

**REQ-4.1** A `src/hooks/` directory MUST be created.

**REQ-4.2** A `src/hooks/useMetrics.ts` hook MUST be created that:
- Calls `getMetrics()` on mount
- Returns `{ metrics, loading, error }` state
- Handles errors gracefully (sets `error` state, does not throw)

**REQ-4.3** The hook MUST be a custom React hook (`useMetrics`) — components must call the hook, not `getMetrics()` directly.

**REQ-4.4** The hook's error catch block MUST extract the backend error message from the Axios response before falling back to the generic message. The priority order is:
1. `err.response.data.message` (API error from `errorHandlerMiddleware`)
2. `err.message` (Axios network-level message)
3. Fallback string: `"Failed to load metrics"`

**REQ-4.5** The hook MUST expose a `refresh` function in its return value. Calling `refresh` MUST re-trigger the metrics fetch, resetting `loading` to `true` and clearing any previous `error`.

---

### REQ-5: Frontend — Dashboard Page

**REQ-5.1** The inline `Dashboard` component in `App.tsx` MUST be extracted to `src/pages/Dashboard.tsx`.

**REQ-5.2** The `Dashboard` page MUST call the `useMetrics` hook and render the returned data.

**REQ-5.3** The page MUST display a loading state while data is fetching.

**REQ-5.4** The page MUST display an error message if the fetch fails.

**REQ-5.5** The page MUST render metrics in a responsive grid of summary cards. Each card shows:
- A label (e.g. "Total Courses")
- The count value prominently
- For status-grouped metrics (interests, enrollments): each status as a sub-item with a colored badge

**REQ-5.6** Status badge colors MUST follow this convention, using the `Badge` component's available `color` prop values (`gray`, `green`, `amber`, `rose`, `indigo`):
- `new` → `indigo`
- `contacted` → `amber`
- `enrolled` / `in_progress` → `green`
- `achieved` → `green`
- `pending` → `gray`
- `rejected` / `dropped` → `rose`

**REQ-5.7** The page MUST use Tailwind CSS utility classes for layout and spacing. No inline `style` props for layout.

**REQ-5.8** The Dashboard page MUST render a "Refresh" button in the page header area. Clicking it MUST call the `refresh` function returned by `useMetrics`. While a refresh is in progress (`loading === true` after a refresh), the button MUST show a loading state (disabled + spinner icon) to prevent double-clicks.

**REQ-5.9** Each `MetricCard` MUST display a relevant Lucide React icon in its header. The icon mapping is:
- Courses → `BookOpen`
- Taxonomies → `Tags`
- Interests → `Users`
- Enrollments → `GraduationCap`

Icons MUST be imported from `lucide-react`. They MUST be sized `w-5 h-5` and colored `text-indigo-400`, positioned in the top-right of the card header area opposite the card title.

---

### REQ-6: Frontend — App.tsx Cleanup

**REQ-6.1** The `Dashboard` import in `App.tsx` MUST be updated to point to `src/pages/Dashboard.tsx`.

**REQ-6.2** The inline `Dashboard` function in `App.tsx` MUST be removed after extraction.

---

### REQ-7: UI Kit Integration

**REQ-7.1** The `@dotevolve/ui-kit` stylesheet MUST be imported in `src/index.css` via:
```css
@import "@dotevolve/ui-kit/styles";
```
This import MUST appear after the `@import "tailwindcss"` line.

**REQ-7.2** The `Dashboard` page MUST use the following ui-kit components — custom hand-rolled equivalents MUST NOT be created for these:

| Use case | Component | Key props |
|---|---|---|
| Metric cards | `Card` | `padding="md"` (default) |
| Status labels | `Badge` | `label`, `color` |
| Loading state | `Spinner` | `size="lg"`, `className="text-indigo-600"` |
| Error state | `Alert` | `variant="error"`, `message` |

**REQ-7.3** All imports from ui-kit MUST use the package name: `import { Card, Badge, Spinner, Alert } from "@dotevolve/ui-kit"`. Never import from relative paths into the ui-kit source.

**REQ-7.4** The `Badge` `color` prop MUST map to status values using only the colors the component actually supports (`gray`, `green`, `amber`, `rose`, `indigo`):
- `new` → `indigo`
- `contacted` → `amber`
- `enrolled` / `in_progress` / `achieved` → `green`
- `pending` → `gray`
- `rejected` / `dropped` → `rose`

**REQ-7.5** The `Badge` component renders a count alongside a status label. Each status row MUST show both the human-readable status name and its numeric count, e.g. `<Badge label="new" color="indigo" />` followed by the count as plain text, or the label may be formatted as `"new — 12"` — whichever reads more clearly.

---

## Out of Scope

- Authentication/authorization on the metrics endpoint (noted in code; deferred)
- Caching layer (Redis or in-memory) — deferred to a follow-up
- Extracting the inline `Taxonomies` component from `App.tsx` — separate concern
- Migrating `src/api.ts` to `src/lib/api.ts` — separate concern
- Switching from `BrowserRouter` to `HashRouter` — separate concern
