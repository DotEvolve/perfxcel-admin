# Codebase Conventions — Design

## Change 1: HashRouter

`src/main.tsx` is the only file that needs to change for the router swap.

**Before:**
```tsx
import { BrowserRouter } from "react-router-dom";
// ...
<BrowserRouter><App /></BrowserRouter>
```

**After:**
```tsx
import { HashRouter } from "react-router-dom";
// ...
<HashRouter><App /></HashRouter>
```

No other files reference the router type. All `<Route>`, `<Link>`, and `useNavigate` usage in `App.tsx` and page components is router-agnostic and requires no changes.

**Side effect:** After this change, all navigation URLs will be prefixed with `/#/`. The Login redirect (`navigate("/login")`) and all `<Link to="...">` paths in the sidebar work correctly with `HashRouter` without modification because React Router handles the hash prefix transparently.

---

## Change 2: API Client Migration

### Move and rename

`src/api.ts` → `src/lib/api.ts`

The `src/lib/` directory already exists (it contains `supabase.ts`). No directory creation needed.

### Content changes

The file content is identical — no logic changes. The only internal import that might need updating is the `supabase` import:

**Current in `src/api.ts`:**
```typescript
import { supabase } from "./lib/supabase";
```

**After move to `src/lib/api.ts`:**
```typescript
import { supabase } from "./supabase";
```

This is the only content change required inside the file itself — one relative path adjustment.

### Import updates across the codebase

Every consumer needs its import path updated:

| File | Change |
|---|---|
| `src/App.tsx` | `"./api"` → `"./lib/api"` |
| `src/components/CourseForm.tsx` | `"../api"` → `"../lib/api"` |
| `src/pages/CoursesList.tsx` | `"../api"` → `"../lib/api"` |
| `src/pages/Interests.tsx` | `"../api"` → `"../lib/api"` |
| `src/pages/Enrollments.tsx` | `"../api"` → `"../lib/api"` |
| `src/hooks/useMetrics.ts` | `"../api"` → `"../lib/api"` |
| `src/pages/Taxonomies.tsx` (new) | imports directly from `"../lib/api"` |

After all imports are updated, `src/api.ts` is deleted.

---

## Change 3: Taxonomies Page Extraction

### New file: `src/pages/Taxonomies.tsx`

Contains everything currently at the bottom of `App.tsx` between the `Taxonomies` and `TaxonomyCard` function definitions:

```
src/pages/Taxonomies.tsx
  imports:
    useState, useEffect          from "react"
    getTaxonomies, api           from "../lib/api"
    TaxonomyItem (type)          from "../lib/api"

  exports:
    default Taxonomies           (the page component)

  local (non-exported):
    TaxonomyCard                 (used only by Taxonomies)
```

The component logic, state, and JSX are moved verbatim — no rewrites.

### `App.tsx` after extraction

Additions:
```typescript
import Taxonomies from "./pages/Taxonomies";
```

Removals:
- `import { getTaxonomies, api } from "./api"` — no longer needed in `App.tsx` (used only by `Taxonomies`)
- `import type { TaxonomyItem } from "./api"` — no longer needed in `App.tsx`
- The `function Taxonomies() { ... }` definition
- The `function TaxonomyCard(...) { ... }` definition

The route `<Route path="/taxonomies" element={<Taxonomies />} />` requires no change.

---

## Execution Order

The three changes are independent but MUST be applied in this order to avoid broken intermediate states:

1. **Move `src/api.ts` → `src/lib/api.ts`** (fix the internal supabase import path)
2. **Update all consumer import paths** to `"../lib/api"` or `"./lib/api"`
3. **Extract `Taxonomies`** into `src/pages/Taxonomies.tsx` (using `"../lib/api"` from the start)
4. **Update `App.tsx`** — remove old imports, add `Taxonomies` page import
5. **Delete `src/api.ts`**
6. **Swap `BrowserRouter` → `HashRouter`** in `main.tsx`
7. **Run `tsc -b`** to verify no type errors

---

## Files Changed

| File | Change |
|---|---|
| `src/main.tsx` | **MODIFY** — `BrowserRouter` → `HashRouter` |
| `src/lib/api.ts` | **NEW** — moved from `src/api.ts`, supabase import path adjusted |
| `src/api.ts` | **DELETE** |
| `src/App.tsx` | **MODIFY** — update import paths, add `Taxonomies` page import, remove inline components |
| `src/components/CourseForm.tsx` | **MODIFY** — update import path |
| `src/pages/CoursesList.tsx` | **MODIFY** — update import path |
| `src/pages/Interests.tsx` | **MODIFY** — update import path |
| `src/pages/Enrollments.tsx` | **MODIFY** — update import path |
| `src/hooks/useMetrics.ts` | **MODIFY** — update import path |
| `src/pages/Taxonomies.tsx` | **NEW** — extracted from `App.tsx` |
