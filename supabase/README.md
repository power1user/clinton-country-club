# Windhaven — Supabase setup

Run these scripts **in order** from the Supabase SQL Editor (left nav → **SQL Editor** → **New query** → paste → **Run**).

| # | File | What it does |
|---|------|--------------|
| 1 | `01_schema.sql` | Creates every table, indexes, helper functions, and update triggers. Safe to re-run. |
| 2 | `02_rls.sql`    | Turns on Row Level Security and creates all policies. Enables realtime for status / pace / orders. |
| 3 | `03_seed.sql`   | Loads the Windhaven Country Club, status pills, news, events, menus, pin placements, and onboarding content. |

After all three run cleanly:

- The app's `.env` needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from **Project Settings → API**).
- Then create your first user via the app's signup flow (or Supabase **Authentication → Users → Add user**), and we'll link them into the `members` and (optionally) `admin_users` tables.
