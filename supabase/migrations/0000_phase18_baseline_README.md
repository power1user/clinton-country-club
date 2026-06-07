# Phase 18 baseline (v0.16.3, 2026-06-07)

This directory holds the canonical schema/RLS/function source for The Grounds Supabase project. **Before Phase 18 (v0.16.3), all migrations were applied via the Supabase MCP / dashboard without being committed here** — making the database unreviewable from this repo. The Phase 18 audit (round 3, finding #6) called that out as an operational risk, and v0.16.3 is the fix.

## What's in this directory

- `0000_phase18_baseline_README.md` — this file
- `0001_phase18_baseline_helpers.sql` — the RLS helper functions (`is_super_admin`, `is_staff_of`, `is_member_or_staff_of`, `is_club_manager`, `is_club_admin_at`, `is_active_guest`, `is_thread_participant`, `has_permission`, `current_member_id`, `log_people_event`). The actual security boundary, snapshotted verbatim from prod.
- `APPLIED_MIGRATIONS.md` — chronological list of all 89 historical migrations that were applied via MCP before v0.16.3. Read-only audit trail; do not edit.

## Going forward — the new workflow

See `supabase/MIGRATIONS.md` for the full process. The rule:

> Every schema/RLS/function change ships as a numbered SQL file in `supabase/migrations/` FIRST, then applied via MCP. No more out-of-band changes.

New migration files use this naming: `NNNN_short_description.sql` where NNNN is the next sequential number (start with 0002).

## Live state at baseline (2026-06-07)

### Tables in `public` (50)

```
admin_preferences         ai_usage_log              analytics_events
badges                    bulletin_posts            club_content
club_departments          club_facilities           club_provision_log
club_status               club_status_hours         clubs
event_registrations       events                    food_order_items
food_orders               guest_visits              guests
hole_sponsors             holes                     lesson_pros
member_badges             members                   menu_categories
menus                     messages                  news
notification_messages     notification_reads        pace_of_play
partner_posts             people                    people_audit_log
pin_placements            post_replies              pro_shop_inquiries
pro_shop_items            push_subscriptions        schedule_overrides
sponsor_banners           support_attachments       support_destinations
support_messages          support_reads             support_threads
thread_participants       threads                   user_departments
user_preferences          user_roles
```

### RLS policies — 156 total across the 50 tables

Every table has RLS enabled. Policy patterns:
- **club-scoped read** — `is_member_or_staff_of(club_id)` for members/staff; `is_active_guest(club_id)` for the public-ish subset.
- **club-scoped staff write** — `is_staff_of(club_id)`, optionally with `has_permission(club_id, 'can_...')` for granular gating.
- **member self-action** — `member_id IN (SELECT m.id FROM members WHERE m.user_id = auth.uid())` for things they own.
- **super_admin global** — `is_super_admin()` on the platform tables (`clubs`, `club_provision_log`, `support_*`, `people_audit_log` super-admin row).

Verifying RLS is the foundation of every audit. To see the live policies:

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### SECURITY DEFINER functions — 46 total

Categorized:

**RLS helpers** (8 functions — see `0001_phase18_baseline_helpers.sql`):
`is_super_admin`, `is_staff_of`, `is_member_or_staff_of`, `is_club_member`, `is_club_manager`, `is_club_admin_at`, `is_active_guest`, `is_thread_participant`, `has_permission`

**People lifecycle RPCs** (Phase 16 — migrations 75-79):
`convert_guest_to_member`, `demote_member_to_guest`, `change_member_status`, `promote_member_to_staff`, `demote_staff_to_member`, `claim_member_by_email`, `claim_or_create_member`, `log_people_event`, `all_people_at_club`, `current_member_id`

**Triggers**:
`fn_audit_member_direct_update`, `fn_audit_guest_direct_update`, `fn_clubhouse_routing_remove_slug`, `fn_clubhouse_routing_rename_slug`, `fn_send_push_on_message`, `fn_send_push_on_broadcast`, `fn_send_push_on_support_message`, `fn_message_bumps_thread`, `fn_touch_support_thread`, `fn_clear_hidden_on_new_message`, `fn_order_thread_create`, `fn_order_status_message`, `fn_create_status_for_facility`, `fn_block_club_hard_delete`, `fn_guard_clubs_tier_change`, `fn_guest_email_verified`, `fn_mirror_member_to_people`, `fn_mirror_guest_to_people`, `fn_mirror_people_to_member_guest`, `fn_admin_preferences_set_updated_at`, `fn_badges_set_updated_at`, `fn_club_facilities_set_updated_at`, `fn_guests_set_updated_at`, `fn_user_preferences_set_updated_at`, `fn_touch_people_updated_at`

**Dashboard RPCs** (Phase 12 v2):
`dashboard_dau_7d`, `dashboard_dau_today`, `dashboard_dau_yesterday`, `dashboard_top_screens_today`

**AI usage rollups** (Phase 15):
`ai_usage_summary`, `ai_usage_by_club`, `ai_usage_by_user`

**Other**:
`get_or_create_dm`, `support_unread_count`, `set_updated_at`

To see any function's full definition:

```sql
SELECT pg_get_functiondef(p.oid) FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'FUNCTION_NAME';
```

## What's intentionally NOT in this baseline

- **Per-table column definitions, indexes, and constraints.** These can be inspected via `pg_tables`, `information_schema.columns`, `pg_indexes`. Dumping them verbatim into a single SQL file would be ~3,000 lines and would diverge from prod the moment anyone added a column. The migration history (`APPLIED_MIGRATIONS.md`) is the source of truth for "how the schema got here."
- **Lifecycle RPC bodies.** Their behavior is documented in `version.js`'s Phase 16 history and exercised by the People admin code. The signatures are listed above. Full bodies can be pulled on demand via `pg_get_functiondef`.
- **Trigger bodies.** Same as above. Trigger names are documented; bodies are introspectable.

## Why this baseline is enough

The audit asked: "can someone reviewing this repo see what the security boundary actually does?" Answer:
1. **RLS helpers** — yes, full source in `0001_phase18_baseline_helpers.sql`.
2. **RLS policies** — yes, this README enumerates the pattern + a query that returns every policy verbatim.
3. **Edge Functions** — yes, all 15 are now in `supabase/functions/`.
4. **Migration history** — yes, `APPLIED_MIGRATIONS.md` lists every change with date + name.

Future migrations land here BEFORE going to prod (workflow in `MIGRATIONS.md`), keeping the repo authoritative going forward.
