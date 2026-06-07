# Migration workflow (v0.16.3+)

Going forward, **every schema/RLS/function change ships as a numbered SQL file in `supabase/migrations/` FIRST, then applied via MCP**. No more out-of-band changes.

This was the v0.16.3 fix (audit round 3 finding #6). The audit had no way to review the security boundary because all 89 prior migrations were applied via dashboard/MCP without being committed. The Phase 18 baseline (`migrations/0000_phase18_baseline_README.md` + `0001_phase18_baseline_helpers.sql` + `APPLIED_MIGRATIONS.md`) snapshotted the live state to fix the gap. This doc is the policy that keeps the gap from re-opening.

## The rule

A new schema/RLS/function change:

1. **Write the migration SQL in a new file** under `supabase/migrations/NNNN_short_description.sql` where NNNN is the next sequential number (start from 0002 after the Phase 18 baseline).
2. **Commit it to the repo** as part of the patch that needs it. The commit message references the version that motivates it (e.g. "v0.17.4 — add event_categories table").
3. **Apply it via MCP** using `apply_migration` with the same name. The Supabase MCP timestamps it and registers it in `supabase_migrations.schema_migrations`.
4. **Optional verification**: pull `list_migrations` after applying; confirm the new row appears with the same name.

## File naming

```
NNNN_short_description.sql
```

- `NNNN` — 4-digit zero-padded sequential. `0002`, `0003`, etc. Find the highest extant number in `migrations/` and add 1.
- `short_description` — snake_case, descriptive, under ~50 chars. Examples: `add_member_referral_code`, `events_recurrence_until_date`, `harden_pro_shop_rls`.

If a migration spans multiple concerns, prefer SPLITTING it into multiple numbered files so each file does one thing. Easier to review, easier to revert.

## What goes in a migration file

- Schema DDL (`CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`)
- RLS DDL (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`, `DROP POLICY`)
- Function DDL (`CREATE OR REPLACE FUNCTION`)
- Trigger DDL (`CREATE TRIGGER`)
- View DDL
- Initial seed data WHEN it's part of the schema (e.g. seeded enum-like values that the app depends on)

What does NOT go here:

- Per-club / per-tenant operational data (use the admin UI or one-off MCP calls)
- Anything that depends on data that's been read in the same migration (most "data migrations" should be a one-off script with a comment, not committed as a migration)

## Authorship guidance

- **Always** include a top-of-file comment explaining WHY this migration exists (the version that motivates it, the user-visible behavior it enables, the audit finding it addresses). Future-you reading the diff six months from now will thank you.
- Use `DROP X IF EXISTS` before `CREATE X` for objects you might be re-creating (functions, triggers, policies) — makes the migration idempotent.
- For RLS policies: explicitly list `USING` and `WITH CHECK` clauses. Don't rely on defaults.
- For SECURITY DEFINER functions: always set `SET search_path TO 'public', 'pg_temp'` (or `'public', 'auth'` if you need auth.uid()) to prevent search-path attacks.
- For trigger functions: prefer `STABLE` or `IMMUTABLE` over volatile when the function is read-only on tables.

## Examples in this repo

Look at any of the existing migration files for reference once we add a few. The Phase 18 baseline (`0001_phase18_baseline_helpers.sql`) is a good template for SECURITY DEFINER function definitions — uses `CREATE OR REPLACE`, sets `search_path`, includes comments.

## If you need to revert a migration

1. Write a new migration that undoes the change (`NNNN_revert_xxxx.sql`).
2. Apply it the same way.
3. Don't edit the original — the migration history is append-only.

## Pulling the live schema (one-off)

If you need to snapshot the live schema for an audit:

```sql
-- All policies
SELECT * FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
-- All function defs
SELECT pg_get_functiondef(p.oid) FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f';
-- Migration history
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
```

The MCP `list_tables` (with `verbose: true`), `list_migrations`, and `execute_sql` cover the rest.
