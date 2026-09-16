# Dashboard Metrics — Implementation Tasks

## Task 1: Backend — Metrics Controller

Create `perfxcel-api/src/controllers/metricsController.ts`.

- Export `getDashboardMetrics(req: Request, res: Response): Promise<void>`
- Run all 13 count queries concurrently in a single `Promise.all`:
  - `courses` total
  - `categories`, `cities`, `associations`, `delivery_modes` counts
  - `course_interests` counts for each status: `new`, `contacted`, `enrolled`, `rejected`
  - `enrollments` counts for each status: `pending`, `in_progress`, `achieved`, `dropped`
- Each query uses `{ count: "exact", head: true }` — no row data transferred
- After `Promise.all` resolves, iterate all results and throw `AppError(message, 500, ErrorCategory.SYSTEM)` on the first error found
- Respond with `res.status(200).json({ status: "success", data: { courses, taxonomies, interests, enrollments } })`
- Import `supabase` from `"../db/supabase"`, error classes from `"@dotevolve/error-utils"`

## Task 2: Backend — Metrics Route

Create `perfxcel-api/src/routes/metrics.ts`.

- Create an Express `Router`
- Register `router.get("/", asyncHandler(getDashboardMetrics))`
- Add a comment: `// TODO: Add requireAuth middleware before going to production`
- Export the router as default

## Task 3: Backend — Mount Route in app.ts

Modify `perfxcel-api/src/app.ts`.

- Add `import metricsRoutes from "./routes/metrics"` with the other route imports
- Add `app.use("/api/v1/metrics", metricsRoutes)` after the existing `app.use("/api/v1/enrollments", ...)` line and before `setupSentryErrorHandler(app)`

## Task 4: Frontend — DashboardMetrics Type

Create `perfxcel-admin/src/types/metrics.ts` (this also creates the `src/types/` directory).

- Define and export the `DashboardMetrics` interface exactly as specified in the design:
  - `courses: { total: number }`
  - `taxonomies: { categories: number; cities: number; associations: number; delivery_modes: number }`
  - `interests: { new: number; contacted: number; enrolled: number; rejected: number }`
  - `enrollments: { pending: number; in_progress: number; achieved: number; dropped: number }`

## Task 5: Frontend — getMetrics API Helper

Modify `perfxcel-admin/src/api.ts`.

- Add `import type { DashboardMetrics } from "./types/metrics"` at the top
- Add `getMetrics` function at the end of the file:
  ```typescript
  export const getMetrics = async (): Promise<DashboardMetrics> => {
    const response = await api.get("/metrics");
    return response.data.data;
  };
  ```
- The function uses the existing `api` Axios instance — do NOT import or call `axios` directly

## Task 6: Frontend — useMetrics Hook

Create `perfxcel-admin/src/hooks/useMetrics.ts` (this also creates the `src/hooks/` directory).

- Import `useState`, `useEffect` from `"react"`
- Import `getMetrics` from `"../api"`
- Import `DashboardMetrics` type from `"../types/metrics"`
- Define a private `extractErrorMessage(err: unknown): string` helper **above** the hook:
  - First try `(err as any).response?.data?.message` — this is what `errorHandlerMiddleware` produces
  - Fall back to `(err as Error).message` if `err instanceof Error`
  - Final fallback: the string `"Failed to load metrics"`
  - Do not use `any` without a comment — add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` or cast via a typed intermediate as shown in the design
- Implement `useMetrics()` hook:
  - State: `metrics: DashboardMetrics | null` (initial `null`), `loading: boolean` (initial `true`), `error: string | null` (initial `null`), `tick: number` (initial `0`)
  - `refresh` function: `() => setTick((t) => t + 1)` — incrementing `tick` re-triggers the `useEffect`
  - `useEffect` depends on `[tick]`:
    - Set `loading(true)` and `setError(null)` at the start of every run
    - Use a `cancelled` flag to prevent stale state updates after unmount
    - On success: `setMetrics(data)`, `setLoading(false)`
    - On error: `setError(extractErrorMessage(err))`, `setLoading(false)`
    - Cleanup: `return () => { cancelled = true }`
- Return `{ metrics, loading, error, refresh }`
- Export `useMetrics` as a named export

## Task 7: Frontend — ui-kit Styles

Modify `perfxcel-admin/src/index.css`.

- Add `@import "@dotevolve/ui-kit/styles";` on the line immediately after `@import "tailwindcss";`
- Do not change any other existing content in the file

## Task 8: Frontend — Dashboard Page

Create `perfxcel-admin/src/pages/Dashboard.tsx`.

- Imports:
  - `import { Card, Badge, Spinner, Alert } from "@dotevolve/ui-kit"`
  - `import { BookOpen, Tags, Users, GraduationCap, RefreshCw } from "lucide-react"`
  - `import { useMetrics } from "../hooks/useMetrics"`
  - `import type { DashboardMetrics } from "../types/metrics"` (used only for type annotations if needed)

- Define a local `MetricCard` sub-component with props `{ title: string; icon: React.ReactNode; children: React.ReactNode }`:
  - Renders `<Card padding="md">`
  - Inside the card, a header `<div className="flex items-center justify-between mb-4">` containing:
    - `<h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>`
    - `<span className="text-indigo-400">{icon}</span>`
  - Below the header: `{children}`

- Implement the `Dashboard` default export:
  - Calls `const { metrics, loading, error, refresh } = useMetrics()`
  - **Page header** (always rendered): `<div className="flex items-center justify-between mb-6">` containing the heading `<h3 className="text-2xl font-semibold">Dashboard</h3>` and a Refresh button:
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
  - **Initial loading state** (when `metrics === null && loading`): render `<div className="flex justify-center py-20"><Spinner size="lg" className="text-indigo-600" /></div>`
  - **Error state** (when `error !== null`): render `<Alert variant="error" message={error} />` — show this even if stale metrics exist
  - **Data state** (when `metrics !== null`): render a `<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">` with four `MetricCard` instances:

    1. **Courses** — `icon={<BookOpen className="w-5 h-5" />}`:
       - `<p className="text-3xl font-bold text-gray-900">{metrics.courses.total}</p>`
       - `<p className="text-sm text-gray-500 mt-1">Total courses</p>`

    2. **Taxonomies** — `icon={<Tags className="w-5 h-5" />}`:
       - 4 plain rows (no badges — these are structural categories, not workflow statuses):
         ```tsx
         {[
           ["Categories", metrics.taxonomies.categories],
           ["Cities", metrics.taxonomies.cities],
           ["Associations", metrics.taxonomies.associations],
           ["Delivery Modes", metrics.taxonomies.delivery_modes],
         ].map(([label, count]) => (
           <div key={label} className="flex items-center justify-between py-1 text-sm">
             <span className="text-gray-600">{label}</span>
             <span className="font-semibold text-gray-900">{count}</span>
           </div>
         ))}
         ```

    3. **Interests** — `icon={<Users className="w-5 h-5" />}`:
       - 4 badge rows using the status → color map:
         ```tsx
         {[
           ["new", metrics.interests.new, "indigo"],
           ["contacted", metrics.interests.contacted, "amber"],
           ["enrolled", metrics.interests.enrolled, "green"],
           ["rejected", metrics.interests.rejected, "rose"],
         ].map(([status, count, color]) => (
           <div key={status} className="flex items-center justify-between py-1">
             <Badge label={status as string} color={color as BadgeProps["color"]} />
             <span className="font-semibold text-gray-900">{count}</span>
           </div>
         ))}
         ```

    4. **Enrollments** — `icon={<GraduationCap className="w-5 h-5" />}`:
       - 4 badge rows:
         ```tsx
         {[
           ["pending", metrics.enrollments.pending, "gray"],
           ["in_progress", metrics.enrollments.in_progress, "green"],
           ["achieved", metrics.enrollments.achieved, "green"],
           ["dropped", metrics.enrollments.dropped, "rose"],
         ].map(([status, count, color]) => (
           <div key={status} className="flex items-center justify-between py-1">
             <Badge label={status as string} color={color as BadgeProps["color"]} />
             <span className="font-semibold text-gray-900">{count}</span>
           </div>
         ))}
         ```

- Import `BadgeProps` from `@dotevolve/ui-kit` if needed for the type cast, or use a local `STATUS_COLORS` lookup object to avoid the cast entirely
- No inline `style` props — Tailwind classes only for layout and spacing

## Task 9: Frontend — App.tsx Cleanup

Modify `perfxcel-admin/src/App.tsx`.

- Add `import Dashboard from "./pages/Dashboard"` at the top with the other page imports
- Remove the inline `function Dashboard()` component definition at the bottom of the file
- The route `<Route path="/" element={<Dashboard />} />` requires no change — it already uses `Dashboard`
