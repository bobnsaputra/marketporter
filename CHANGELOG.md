# Changelog


## 2026-03-18

- Added Topups feature: `topups` Supabase migration (`supabase/migrations/004_create_topups.sql`) with indexes, RLS examples, `void_topup` RPC, and an `AFTER INSERT` trigger to update `customers.amount`.
- Implemented `TopupModal` and `TopupHistory` components; history shows voided entries and supports voiding via RPC.
- UI improvements: modernized modals, buttons, and status badges; made customer `amount` read-only in the edit modal and added a dedicated topup flow.
- Added Topup buttons: beside "Add customer" and on the main dashboard search input (opens Topup modal; when no customer selected the modal shows a customer dropdown).
- Fixed dark-mode styling for dropdowns and inputs; improved placeholder and prefix positioning for `Rp` inside amount inputs.


## 2026-03-14

- Replaced inline table cell editors with a modal-based editor to avoid layout shift and clipping.
- Added `EditCustomerModal` and wired it into `UsersPage` for editing name, description, rate, and amount.
- Fixed modal z-index/overlay behavior so inputs can be focused and edited without closing the dialog.
- Made table headers and recent-orders headers theme-aware (light: `text-zinc-800`, dark: `text-white`).
- Truncated long names in the table to improve layout and added a hover to show the full name.
- Rendered status breakdown as vertical lines (one status per line) for clarity in collapsed recent orders.
- Added TODO: implement amount topup history as the next feature.


## 2026-03-13

- Polished the Orders page layout and spacing for improved readability and alignment.
- Moved the group-level select-all checkbox into a column-aligned header row so it vertically aligns with per-item checkboxes and columns (`Link`, `Price (JPY)`, `Price (IDR)`, `Select`).
- Updated timeframe filters: renamed "Day" to "This day" and added a `24h` option (plus 2h/4h/6h pills); pill styles now follow light/dark theme.
- Made the header dropdown (Dashboard / Orders / Customer) theme-aware with a matching background, border, and hover states so long labels remain readable in both themes.
- Made the customer search dropdown and input on the Orders page follow light/dark backgrounds and borders to avoid visual dilution of long text.

## 2026-03-12

- Aligned columns in the bulk link import UI so `Price (JPY)`, `Slabbed` checkbox and `Price (IDR)` cells line up correctly in `LinkBulkInput`.
- Replaced native `title` tooltips with a modern styled hover tooltip showing the IDR calculation (JPY × rate, plus slab fee when applied).
 - Implemented manual-only bulk-paste import (`LinkBulkInput`): one http(s) link per line, per-link JPY input, and IDR calculation using the selected customer's rate plus optional slab fee.
 - Persist confirmed imports locally (`mp-imported-cards`) and persist slab fee to `mp-slab-fee` in `localStorage` for better UX.
 - Added robust Supabase save flow: client-generated `id` on insert, preflight `SELECT` to detect exact existing links, insert-only for new rows, and `upsert` fallback on duplicate-key errors. Per-item `exists` flags surface duplicates in the UI.
 - Centralized `supabase` client import and included `user_id`, `customer_id`, and integer `rate_used` in inserted `orders` rows.
 - Added `Orders` page: lists server-saved orders grouped by customer/created_at, shows totals, and supports per-row inline-editable status and bulk status updates.
 - Improved Orders filters: searchable customer dropdown and timeframe pill selectors (Any, Today, This week, This month, 2h/4h/6h options).
 - Instrumented diagnostics for update calls that return no rows: when `.update(...).select()` returns empty we now surface a clear message recommending checking Supabase Row Level Security (RLS) or permissions and perform a safe refetch/fallback.

## 2026-03-10

- Migrated project from Next.js to Vite + React + TypeScript
- Installed React Router, Supabase JS, Tailwind CSS
- Rebuilt login/register page (split-screen design, reactive UI)
- Rebuilt dashboard page (user email, sign out)
- Implemented Supabase Auth with React Context
- Added route guard (ProtectedRoute component)
- Updated PLAN.md to reflect new tech stack
- Cleaned up old Next.js files, added .gitignore
- Fixed .env.local for Vite compatibility
- Verified dev server running at http://localhost:5173/
 - Added bulk link paste/import UI (`LinkBulkInput`)
 - Persisted theme preference to `localStorage` (mp-theme)
 - Switched app font to Inter for a modern look
 - Modernized navbar and dashboard visuals (gradient logo, centered title)
 - Reworked theme toggle to a compact sliding control
 - Updated placeholder examples to `jp.mercari.com`
 - Sign-out button now shows red on hover
 - Restored `/users` route and fixed `UsersPage` import/duplicates
 - Added shared `Layout` component so navbar appears on protected pages
 - Navbar title is now context-aware (shows current page; hover reveals the other page)
 - Simplified dropdown to a single-word hover item with fade/slide animation and 150ms close delay for easy clicking
 - Users page updated to follow light/dark theme reliably (reads `mp-theme`, observes `dark` class) and uses theme-aware text/background classes
 - Added customer workflow: `CustomerModal`, Add button, and `customers` migration (local insert + Supabase wiring)
 - Customer modal modernized for light/dark; currency switched to IDR (`Rp`) and inputs use whole-IDR by default
 - `UsersPage` now fetches customers from Supabase, shows created time and user snippet, and includes a modern search with debounce
 - Dashboard updated to display a customers list beside the bulk import area
