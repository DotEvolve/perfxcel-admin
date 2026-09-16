# Dashboard Metrics — Design

## Architecture Overview

```
perfxcel-admin (Browser)
  src/pages/Dashboard.tsx
    └── useMetrics()               ← src/hooks/useMetrics.ts
          └── getMetrics()         ← src/api.ts
                └── GET /api/v1/metrics

perfxcel-api (Express)
  src/app.ts
    └── /api/v1/metrics            ← src/routes/metrics.ts
          └── asyncHandler(getDashboardMetrics)
                └── src/controllers/metricsController.ts
                      └── supabase (perfxcel schema, service role key)
```

---

## Backend Design

### `src/controllers/metricsController.ts`

Single exported function `getDashboardMetrics`. All Supabase queries run concurrently in a single `Promise.all` block — 9 parallel queries total (1 courses, 4 taxonomy tables, 4 interest statuses, 4 enrollment statuses = 13; grouped into logical buckets).

```typescript
import { Request, Response } from "express";
import { supabase } from "../db/supabase";
import { AppError, ErrorCategory } from "@dotevolve/error-utils";

export const getDashboardMetrics = async (req: Request, res: Response) => {
  const count = { count: "exact" as const, head: true };

  const [
    courses,
    categories, cities, associations, deliveryModes,
    interestsNew, interestsContacted, interestsEnrolled, interestsRejected,
    enrollmentsPending, enrollmentsInProgress, enrollmentsAchieved, enrollmentsDropped,
  ] = await Promise.all([
    supabase.from("courses").select("*", count),
    supabase.from("categories").select("*", count),
    supabase.from("cities").select("*", count),
    supabase.from("associations").select("*", count),
    supabase.from("delivery_modes").select("*", count),
    supabase.from("course_interests").select("*", count).eq("status", "new"),
    supabase.from("course_interests").select("*", count).eq("status", "contacted"),
    supabase.from("course_interests").select("*", count).eq("status", "enrolled"),
    supabase.from("course_interests").select("*", count).eq("status", "rejected"),
    supabase.from("enrollments").select("*", count).eq("status", "pending"),
    supabase.from("enrollments").select("*", count).eq("status", "in_progress"),
    supabase.from("enrollments").select("*", count).eq("status", "achieved"),
    supabase.from("enrollments").select("*", count).eq("status", "dropped"),
  ]);

  // Check each result for errors, throw AppError if any query failed
  const results = [courses, categories, cities, associations, deliveryModes, ...];
  for (const result of results) {
    if (result.error) {
      throw new AppError(result.error.message, 500, ErrorCategory.SYSTEM);
    }
  }

  res.status(200).json({
    status: "success",
    data: {
      courses: { total: courses.count ?? 0 },
      taxonomies: {
        categories: categories.count ?? 0,
        cities: cities.count ?? 0,
        associations: associations.count ?? 0,
        delivery_modes: deliveryModes.count ?? 0,
      },
      interests: {
        new: interestsNew.count ?? 0,
        contacted: interestsContacted.count ?? 0,
        enrolled: interestsEnrolled.count ?? 0,
        rejected: interestsRejected.count ?? 0,
      },
      enrollments: {
        pending: enrollmentsPending.count ?? 0,
        in_progress: enrollmentsInProgress.count ?? 0,
        achieved: enrollmentsAchieved.count ?? 0,
        dropped: enrollmentsDropped.count ?? 0,
      },
    },
  });
};
```

### `src/routes/metrics.ts`

```typescript
import { Router } from "express";
import { asyncHandler } from "@dotevolve/error-utils";
import { getDashboardMetrics } from "../controllers/metricsController";

const router = Router();

// TODO: Add requireAuth middleware before going to production
router.get("/", asyncHandler(getDashboardMetrics));

export default router;
```

### `src/app.ts` — Addition

Add after the existing route group, before `setupSentryErrorHandler`:

```typescript
import metricsRoutes from "./routes/metrics";
// ...
app.use("/api/v1/metrics", metricsRoutes);
```

---

## Frontend Design

### `src/types/metrics.ts`

```typescript
export interface DashboardMetrics {
  courses: {
    total: number;
  };
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

### `src/api.ts` — Addition

```typescript
import type { DashboardMetrics } from "./types/metrics";

export const getMetrics = async (): Promise<DashboardMetrics> => {
  const response = await api.get("/metrics");
  return response.data.data;
};
```

### `src/hooks/useMetrics.ts`

A `tick` counter drives re-fetching: incrementing it triggers the `useEffect`, which acts as the `refresh` mechanism without needing a separate `useCallback`.

```typescript
import { useState, useEffect } from "react";
import { getMetrics } from "../api";
import type { DashboardMetrics } from "../types/metrics";

interface UseMetricsResult {
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function extractErrorMessage(err: unknown): string {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err
  ) {
    const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
    return axiosErr.response?.data?.message
      ?? axiosErr.message
      ?? "Failed to load metrics";
  }
  if (err instanceof Error) return err.message;
  return "Failed to load metrics";
}

export function useMetrics(): UseMetricsResult {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMetrics()
      .then((data) => {
        if (!cancelled) {
          setMetrics(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(extractErrorMessage(err));
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [tick]);

  return { metrics, loading, error, refresh };
}
```

Key design notes:
- `tick` in the dependency array means any call to `refresh()` re-runs the effect.
- `setError(null)` at the start of each fetch clears stale errors before the new request completes.
- `extractErrorMessage` checks `err.response.data.message` first (the shape `errorHandlerMiddleware` produces), then falls back to `err.message`, then to a static fallback string.
- The `cancelled` flag prevents state updates if the component unmounts mid-fetch.

### `src/pages/Dashboard.tsx` — Component Structure

```
Dashboard
  ├── Page header: "Dashboard" title + "Refresh" button (disabled + Spinner while loading)
  ├── Loading spinner — centered, full area (first load only, when metrics === null)
  ├── Error banner — Alert variant="error" (when error !== null)
  └── Metrics grid (when metrics !== null)
        ├── MetricCard "Courses"     icon=BookOpen   (single large count)
        ├── MetricCard "Taxonomies"  icon=Tags       (4 plain rows: label + count)
        ├── MetricCard "Interests"   icon=Users      (4 Badge rows: new, contacted, enrolled, rejected)
        └── MetricCard "Enrollments" icon=GraduationCap (4 Badge rows: pending, in_progress, achieved, dropped)
```

**MetricCard** is a thin wrapper around the ui-kit `Card` component — it adds a title heading above the card's `children`. It lives within `Dashboard.tsx` and does not need to be promoted to `src/components/`.

The card header contains the title on the left and the Lucide icon on the right:
```tsx
interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function MetricCard({ title, icon, children }: MetricCardProps) {
  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
        <span className="text-indigo-400">{icon}</span>
      </div>
      {children}
    </Card>
  );
}
```

**Lucide icon mapping** (all `w-5 h-5`):

| Card | Icon component |
|---|---|
| Courses | `BookOpen` |
| Taxonomies | `Tags` |
| Interests | `Users` |
| Enrollments | `GraduationCap` |

Icons are imported: `import { BookOpen, Tags, Users, GraduationCap, RefreshCw } from "lucide-react"`. `RefreshCw` is used for the refresh button spinner state.

**Refresh button** in the page header:
```tsx
<button
  onClick={refresh}
  disabled={loading}
  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
>
  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
  Refresh
</button>
```

**Status badges use the ui-kit `Badge` component.** No custom badge classes. The `Badge` `color` prop accepts: `gray | green | amber | rose | indigo`.

| Status | `Badge` color |
|---|---|
| `new` | `indigo` |
| `contacted` | `amber` |
| `enrolled`, `in_progress`, `achieved` | `green` |
| `pending` | `gray` |
| `rejected`, `dropped` | `rose` |

Each status row renders the `Badge` on the left and the count pushed right:
```tsx
<div className="flex items-center justify-between py-1">
  <Badge label="new" color="indigo" />
  <span className="font-semibold text-gray-900">{metrics.interests.new}</span>
</div>
```

**Grid layout:** `grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4`

**Loading behaviour:** On initial load (`metrics === null && loading`), show a full centered spinner. On subsequent refreshes (`metrics !== null && loading`), the existing data stays visible and only the Refresh button enters its loading state — no full-page spinner flicker.

**ui-kit components used:**

| Component | Import | Where |
|---|---|---|
| `Spinner` | `@dotevolve/ui-kit` | Loading state: `<Spinner size="lg" className="text-indigo-600" />` |
| `Alert` | `@dotevolve/ui-kit` | Error state: `<Alert variant="error" message={error} />` |
| `Card` | `@dotevolve/ui-kit` | Each metric card: `<Card padding="md">` |
| `Badge` | `@dotevolve/ui-kit` | Each status label row |

---

## Data Flow

```
Initial load:
1. Dashboard mounts → useMetrics() runs, tick=0
2. getMetrics() → GET /api/v1/metrics
3. Backend fires 13 Supabase count queries concurrently (Promise.all)
4. Backend returns { status: "success", data: DashboardMetrics }
5. getMetrics() returns response.data.data
6. useMetrics sets metrics, loading → false
7. Dashboard renders page header + MetricCards

Manual refresh:
1. User clicks Refresh button → refresh() → setTick(t => t + 1)
2. useEffect re-runs (tick changed): setLoading(true), setError(null)
3. Existing metrics data stays rendered; Refresh button shows RefreshCw animate-spin
4. Fetch completes → metrics updated, loading → false, button re-enables
```

---

## Error Handling

- Supabase query failure → `AppError` thrown in controller → `asyncHandler` catches → `errorHandlerMiddleware` formats response as `{ status: "error", message: "..." }` with appropriate HTTP status.
- Frontend Axios error:
  - `extractErrorMessage` checks `err.response.data.message` first (exact shape from `errorHandlerMiddleware`)
  - Falls back to `err.message` (e.g. "Network Error", "Request failed with status code 500")
  - Final fallback: `"Failed to load metrics"`
  - `error` state is set → Dashboard renders `<Alert variant="error" message={error} />`
- Partial Supabase failure (one query in `Promise.all` errors): controller checks all results and throws on the first error found. No partial responses are returned.
- Refresh after error: `setError(null)` clears the banner before the new request completes, preventing stale error display alongside fresh data.

---

## Files Changed

| File | Change |
|---|---|
| `perfxcel-api/src/controllers/metricsController.ts` | **NEW** |
| `perfxcel-api/src/routes/metrics.ts` | **NEW** |
| `perfxcel-api/src/app.ts` | **MODIFY** — add import + route mount |
| `perfxcel-admin/src/index.css` | **MODIFY** — add ui-kit styles import |
| `perfxcel-admin/src/types/metrics.ts` | **NEW** (creates `src/types/` directory) |
| `perfxcel-admin/src/api.ts` | **MODIFY** — add `getMetrics()` |
| `perfxcel-admin/src/hooks/useMetrics.ts` | **NEW** (creates `src/hooks/` directory) |
| `perfxcel-admin/src/pages/Dashboard.tsx` | **NEW** |
| `perfxcel-admin/src/App.tsx` | **MODIFY** — replace inline `Dashboard` with import |
