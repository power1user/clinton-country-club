# Applied migrations history

Chronological list of every migration applied to the production Country Club Supabase project (`exddcpqfdkyxommkslag`) up to and including the Phase 18 baseline (v0.16.3, 2026-06-07).

Migrations 01–79 (May–June 2026) were applied via the Supabase MCP / dashboard before v0.16.3 established the "migration files live in repo first" workflow. They were not committed to git at apply time. **Going forward, every new migration ships as a numbered `.sql` file in this directory BEFORE being applied** (see `../MIGRATIONS.md`).

For the SQL that defines the current security boundary, see `0001_phase18_baseline_helpers.sql`.

## Migration list

| Version (UTC) | Name |
|---|---|
| 20260516023441 | 01_windhaven_schema |
| 20260516023508 | 02_windhaven_rls |
| 20260516023751 | 03_harden_helper_functions |
| 20260516030400 | 04_restore_helper_execute |
| 20260516040924 | 05_add_clubs_holes_column |
| 20260517000902 | 06_holes_table_and_pin_redesign |
| 20260517003011 | 07_clinton_real_hole_data |
| 20260517010116 | 08_status_hours_and_categories |
| 20260517011603 | 09_per_day_status_hours |
| 20260517013504 | 10_members_only_per_day |
| 20260517195512 | 11_staff_roles_and_member_status |
| 20260517195834 | 12_claim_member_by_email |
| 20260517201646 | 13_add_content_tables_to_realtime |
| 20260521051859 | 14_phase1_content_schema |
| 20260521055821 | 15_phase2_user_roles_and_permissions |
| 20260521061943 | 16_phase3_branding_columns |
| 20260522051148 | 17_phase3_clubs_rls_for_super_admin |
| 20260522053007 | 18_phase4_messaging_schema |
| 20260522060109 | 19_restore_members_rls |
| 20260522061406 | 20_clubs_timezone |
| 20260523061445 | 21_restore_rls_and_auto_member |
| 20260523063654 | 22_pending_access_and_thread_hide |
| 20260523221328 | 23_schedule_overrides_all_facilities |
| 20260523233234 | 24_subscription_tier_and_feature_flags |
| 20260523233801 | 25_lesson_pros |
| 20260523234541 | 26_terms_acceptance |
| 20260524061606 | 27_notification_reads_hidden_at |
| 20260524231310 | 27_post_replies (numbering clash — both applied) |
| 20260524234530 | 28_grandfather_member_directory_flag |
| 20260525003732 | 29_member_allow_dms |
| 20260525004048 | 30_member_display_mode |
| 20260525004423 | 31_member_profile_photo |
| 20260525010657 | 32_avatar_path_by_user_id |
| 20260525011508 | 33_avatar_policy_split_part |
| 20260525012004 | 34_storage_buckets_select_policy |
| 20260525012529 | 35_diagnostic_wide_open_avatar |
| 20260525012933 | 36_diagnostic_totally_open_insert |
| 20260525013616 | 37_diagnostic_explicit_roles |
| 20260525031417 | 38_drop_diagnostic_open_insert |
| 20260525033950 | 39_feature_flags_locked |
| 20260525040343 | 40_members_realtime |
| 20260525041552 | 41_opens_at_dawn |
| 20260525044240 | 42_pro_shop_inquiries_realtime |
| 20260525044614 | 43_club_provision_log |
| 20260526013725 | 44_guests_schema_foundation |
| 20260526022431 | 45_clubhouse_qr_version |
| 20260526024008 | 46_guest_select_policies |
| 20260526031826 | 47_phase8_gaps |
| 20260526033507 | 48_harden_fn_guests_set_updated_at_search_path |
| 20260526040417 | 49_restore_send_push_webhook |
| 20260527012629 | 50_partner_posts_game_type_spots |
| 20260527021316 | 51_news_expires_at |
| 20260527030054 | 52_events_recurrence_and_time_picker |
| 20260527033131 | 53_club_facilities |
| 20260527163640 | 54_pending_auth_status_and_verify_trigger |
| 20260528015623 | 55_badges_and_member_badges |
| 20260528021926 | 56_clubs_trophy_case_name |
| 20260528025052 | 57_clubs_addons |
| 20260528033541 | 58_user_preferences |
| 20260529034506 | 59_food_orders_to_go |
| 20260530024246 | 60_food_order_type_pivot_to_go_eat_in |
| 20260530032301 | 61_admin_preferences |
| 20260530193910 | 62_analytics_events |
| 20260530194204 | 63_dashboard_rpcs |
| 20260530200237 | 64_admin_preferences_unique_constraint |
| 20260530220735 | 65_send_push_on_broadcast |
| 20260530221843 | 66_normalize_menu_prices |
| 20260531204210 | 66_support_inbox_tables (numbering clash) |
| 20260531211210 | 67_support_destinations |
| 20260531211822 | 68_support_push_trigger |
| 20260531212925 | 70_support_attachments |
| 20260531222207 | 71_support_thread_category |
| 20260531224917 | 72_auto_create_club_status_for_facility |
| 20260531231031 | 73_ai_usage_log_and_member_ai_flag |
| 20260531235654 | 74_ai_usage_rollup_rpcs |
| 20260604015712 | 75_people_table_and_audit_log |
| 20260604015738 | 76_audit_log_writer_rpc |
| 20260604015827 | 77_all_people_at_club_rpc |
| 20260604020155 | 78_lifecycle_rpcs |
| 20260604023712 | 79_demote_member_to_guest_rpc |
| 20260606165527 | phase17_departments_and_clubhouse_routing |
| 20260606205756 | v0_15_16_notes_columns_and_reason_param |
| 20260606214400 | v0_15_18_audit_routing_softdelete_index_cleanups |
| 20260606215620 | v0_15_19_people_bidirectional_sync_triggers |
| 20260606223915 | v0_15_20_club_member_tiers |
| 20260606232652 | v0_15_24_guests_zip_nullable |
| 20260607011015 | v0_15_25_missing_fk_indexes |
| 20260607012033 | v0_15_27_all_people_at_club_cte_rewrite |
| 20260607012128 | v0_15_28_all_people_at_club_pagination |
| 20260607015045 | v0_15_29_fix_ambiguous_auth_user_id |
| 20260607020100 | v0_15_30_all_people_at_club_use_column |
| 20260607193000 | 0002_phase18_followup_guest_register_rate_limit |

90 migrations total.

## Phase boundaries (rough)

- **01–13** — Initial windhaven schema + RLS foundation (May 16–17)
- **14** — Phase 1: content schema (news, events, sponsors)
- **15** — Phase 2: user_roles + permissions
- **16–17** — Phase 3: branding + super_admin RLS
- **18–22** — Phase 4: messaging + DMs + thread hiding
- **23** — Phase 4 patch
- **24–26** — Tiers + feature flags + lesson pros + ToU
- **27–32** — Member preferences + DMs + profile photo
- **33–38** — Storage policies + diagnostic open-insert (later dropped)
- **39** — Phase 7: feature_flags_locked
- **40–43** — Realtime + facility status + provision log
- **44–48** — Phase 8: guests + QR
- **49** — send_push webhook restore
- **50–53** — Partner posts + news expiry + recurring events + custom facilities
- **54** — Phase 8: guest email-verified trigger
- **55–58** — Phase 10: badges + user_preferences
- **59–60** — Phase 12-ish: food orders + to-go/eat-in pivot
- **61–64** — Phase 12 v2: admin_preferences + analytics + dashboard RPCs
- **65–66** — Push broadcast + menu price normalization
- **66 (clash) –72** — Phase 14: support inbox + Cloudflare email worker + push trigger + attachments + categories
- **73–74** — Phase 15: AI usage log + rollup RPCs
- **75–79** — Phase 16: people + audit + lifecycle RPCs
- **phase17_***, v0_15_***  — Phase 17 + v0.15.x polish (departments, topic routing, notes, audit triggers, bidirectional sync, tiers, pagination, hotfixes)

(Phase 18 — security/hardening — does not have a numbered baseline_*.sql migration because Phase 18 didn't change schema; it formalized the workflow + pulled the previously-applied state into the repo. The first "real" Phase 18 migration will be `0002_*.sql` whenever the first schema/RLS/function change post-baseline lands.)
