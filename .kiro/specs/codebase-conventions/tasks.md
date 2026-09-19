# Codebase Conventions — Implementation Tasks

## Task 1: Create `src/lib/api.ts`

Create `perfxcel-admin/src/lib/api.ts` with the full contents of the current `src/api.ts`, with one change:

- The internal supabase import MUST be updated from `"./lib/supabase"` to `"./supabase"` (since the file now lives inside `src/lib/`)
- All exported interfaces (`Course`, `TaxonomyItem`, `PaginatedResponse<T>`), the `api` Axios instance, the JWT interceptor, and all API helper functions are copied verbatim
- The `DashboardMetrics` type import and `getMetrics` function (added by the dashboard-metrics spec) are included if already present; if not yet added, they will be added when the dashboard-metrics spec is implemented

## Task 2: Update Import Paths in All Consumers

Modify the following files — change only the import path, nothing else:

- `perfxcel-admin/src/components/CourseForm.tsx`: `"../api"` → `"../lib/api"`
- `perfxcel-admin/src/pages/CoursesList.tsx`: `"../api"` → `"../lib/api"`
- `perfxcel-admin/src/pages/Interests.tsx`: `"../api"` → `"../lib/api"`
- `perfxcel-admin/src/pages/Enrollments.tsx`: `"../api"` → `"../lib/api"`

Do not modify any other code in these files.

## Task 3: Extract `Taxonomies` Page

Create `perfxcel-admin/src/pages/Taxonomies.tsx`:

- Copy the `Taxonomies` function and `TaxonomyCard` function verbatim from `App.tsx`
- Add necessary imports at the top:
  - `import { useState, useEffect } from "react"`
  - `import { getTaxonomies, api } from "../lib/api"`
  - `import type { TaxonomyItem } from "../lib/api"`
- Export `Taxonomies` as the default export: `export default function Taxonomies() { ... }`
- `TaxonomyCard` remains as a non-exported local function in this file
- Do not change any logic, state, or JSX from the original

## Task 4: Update `App.tsx`

Modify `perfxcel-admin/src/App.tsx`:

- Replace `import { getTaxonomies, api } from "./api"` with `import Taxonomies from "./pages/Taxonomies"`
- Remove `import type { TaxonomyItem } from "./api"` — no longer needed in `App.tsx`
- Update the `import { ... } from "./api"` line to `import { ... } from "./lib/api"` if any other symbols from `api.ts` are still used directly in `App.tsx` (verify against final file state)
- Remove the `function Taxonomies() { ... }` block (the entire function body)
- Remove the `function TaxonomyCard(...) { ... }` block (the entire function body)
- The route `<Route path="/taxonomies" element={<Taxonomies />} />` requires no change

## Task 5: Delete `src/api.ts`

Delete `perfxcel-admin/src/api.ts`.

Verify before deleting that no remaining file still imports from `"./api"` or `"../api"`.

## Task 6: Swap `BrowserRouter` → `HashRouter`

Modify `perfxcel-admin/src/main.tsx`:

- Change `import { BrowserRouter } from "react-router-dom"` to `import { HashRouter } from "react-router-dom"`
- Change `<BrowserRouter>` to `<HashRouter>` and `</BrowserRouter>` to `</HashRouter>`
- No other changes

## Task 7: Verify TypeScript

Run `tsc -b` from `perfxcel-admin/` and confirm zero type errors. Fix any errors before marking this task complete.
