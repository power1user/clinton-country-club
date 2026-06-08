# Codebase Size Analysis — v0.16.19

*Snapshot taken 2026-06-07 at commit `795e12f` (v0.16.19).*

## Headline numbers

| Metric | Value |
|---|---:|
| **Total lines of code (everything)** | 51,624 |
| Source code (JS/JSX/TS/SQL/CSS) | 41,823 |
| Total characters | 1,905,995 |
| Total words | 217,008 |
| Total commits (since 2026-05-15) | 280 |
| Build days since first commit | 23 |

## Breakdown by category

| Category | Lines |
|---|---:|
| Client-side React app (`src/`) | 34,943 |
| Markdown documentation | 11,153 |
| Supabase Edge Functions (Deno/TS) | 4,220 |
| SQL migrations | 1,209 |
| Vitest test suite | 387 |

## Breakdown by surface

| Surface | Files |
|---|---:|
| React components (`.jsx`) | 89 |
| React screens (`src/screens/`) | 47 |
| React components (`src/components/`) | 35 |
| Custom React hooks | 30 |
| JS modules (`.js`) | 28 |
| Supabase Edge Functions | 15 |
| SQL migration files (post-baseline) | 8 |

## Top 10 largest files

| Lines | File |
|---:|---|
| 4,947 | `src/screens/admin/sections.jsx` |
| 2,859 | `src/screens/AdminPanel.jsx` |
| 1,880 | `src/components/AdminDashboard.jsx` |
| 1,706 | `src/screens/admin/AllPeopleAdmin.jsx` |
| 1,123 | `src/hooks/useClubData.jsx` |
| 820 | `src/screens/admin/AdminLayoutDesktop.jsx` |
| 747 | `src/screens/admin/sections/platform.jsx` |
| 732 | `src/lib/version.js` (mostly Phase-history comments) |
| 655 | `src/screens/admin/DepartmentsAdmin.jsx` |
| 649 | `src/components/AdminWorkspaceSwitcher.jsx` |

## Typing-only time analysis (40 WPM)

Pure typing time, **excluding thinking, debugging, design, refactoring, testing, or anything else a human actually does** while writing code.

**Assumptions:**
- 40 words per minute = 200 characters per minute (avg 5 chars/word)
- 1,905,995 source chars to type

**Math:**
```
1,905,995 chars ÷ 200 chars/min = 9,530 minutes
9,530 minutes ÷ 60 = 158.8 hours
158.8 hours ÷ 8 hr/day = 19.85 work-days of CONTINUOUS pure typing
```

That's nearly **20 work-days** to TYPE the code, assuming you never stop to think.

## Realistic dev-time multiplier

Industry rule-of-thumb: pure typing is ~10–20% of total dev time. The rest is thinking, debugging, testing, refactoring, design discussions, reading docs, fighting tools, etc.

| Multiplier | Hours | Work-days | Calendar months (8hr/day) |
|---|---:|---:|---:|
| 5× (optimistic) | 794 hrs | 99 days | ~5 months |
| 8× (realistic) | 1,270 hrs | 159 days | ~7.5 months |
| 10× (typical) | 1,588 hrs | 199 days | ~9.5 months |

## Productivity rate (this codebase)

| Metric | Value |
|---|---:|
| LOC / commit (avg) | ~149 |
| Commits / day | ~12 |
| LOC / day | ~1,818 |
| Chars / day | ~82,900 |

A typical senior developer ships **30–100 LOC/day** including the design, debug, review, and meeting overhead. The 1,818 LOC/day rate is **18–60× higher** — that's the AI-leverage signature.
