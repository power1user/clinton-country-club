# Clinton Country Club — Member App

Mobile-first member engagement app for Clinton Country Club (Clinton, IL).
Replaces Facebook posts and phone calls with a clean, always-current digital
experience.

> **White-label note:** the code refers to the slug "windhaven" internally
> (carried over from the original design handoff). Branding text everywhere
> in the UI is derived from the `clubs` row, so renaming the club name in
> Supabase rebrands the whole app.

## Stack

- **React 19** via Vite, plain JS (no TypeScript)
- **Supabase** — Postgres, auth, realtime, RLS
- **MapTiler + MapLibre GL** — satellite course map
- **OpenWeatherMap** — weather widget + 5-day forecast
- **Netlify** — hosting

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev                  # http://localhost:5173
```

Required env vars (`.env.local`):

| Var | Source |
|-----|--------|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (anon/publishable) |
| `VITE_MAPTILER_KEY` | maptiler.com → Account → API keys |
| `VITE_OPENWEATHER_API_KEY` | openweathermap.org → My API keys |
| `VITE_DEFAULT_CLUB_SLUG` | matches the `clubs.slug` row — defaults to `windhaven` |

## Database setup

SQL files under `supabase/` are run via the Supabase MCP server in this project's
build conversation, but can also be pasted manually into the SQL Editor:

1. `supabase/01_schema.sql` — tables, indexes, helper functions, triggers
2. `supabase/02_rls.sql` — RLS policies + realtime publication
3. `supabase/03_seed.sql` — Clinton CC sample data (status, news, events, menus, pin placements, onboarding)

Then create a test user via Supabase Authentication → Users → Add user, and
link them into `members` and (for admin access) `admin_users`.

## Project structure

```
src/
  App.jsx                     # auth gate + screen router
  main.jsx                    # Vite entry
  index.css                   # phone-frame, transitions
  theme.js                    # palette + status pill config
  lib/supabase.js             # Supabase client
  hooks/
    useAuth.jsx               # session + member + isAdmin
    useNav.jsx                # tab-stack navigation
    useClubData.jsx           # status / news / pace / events / menus / pins / weather hooks
    useBrand.jsx              # club-name-derived branding
  components/                 # StatusPill, BottomNav, Headers, Buttons, NavIcon
  screens/                    # 20+ member-facing screens + Login + AdminPanel
  data/mock.js                # fallback data when Supabase isn't configured
```

## Deployment

Connected to Netlify via Git. Every push to `main` auto-deploys. Build config
lives in `netlify.toml`.

Env vars must also be set in Netlify dashboard → Site settings → Environment
variables (same names as `.env.local`).
