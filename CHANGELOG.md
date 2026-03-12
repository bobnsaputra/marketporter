# Changelog

## 2026-03-12

- Aligned columns in the bulk link import UI so `Price (JPY)`, `Slabbed` checkbox and `Price (IDR)` cells line up correctly in `LinkBulkInput`.
- Replaced native `title` tooltips with a modern styled hover tooltip showing the IDR calculation (JPY × rate, plus slab fee when applied).

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
