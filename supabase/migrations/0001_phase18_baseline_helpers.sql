-- 0001_phase18_baseline_helpers.sql (v0.16.3, audit finding #6)
--
-- The RLS helper functions — the SECURITY DEFINER primitives every
-- policy in this database depends on. Snapshotted from production
-- 2026-06-07 as part of the Phase 18 export.
--
-- These are the actual security boundary: if any of them have a bug,
-- the entire tenant isolation model has a bug. They're idempotent
-- (CREATE OR REPLACE) and safe to re-apply.
--
-- Naming convention reminder (from supabase-rbac skill):
--   is_super_admin()                  — platform-wide super admin (club_id IS NULL on user_roles)
--   is_staff_of(p_club_id)            — club_manager OR club_admin at this club (super_admin implicit-true)
--   is_member_or_staff_of(p_club_id)  — has any member or staff role at this club
--   is_member(p_club_id)              — has a members row for this club (no staff role required)
--   is_club_manager(p_club_id)        — club_manager (super_admin implicit-true)
--   is_club_admin_at(p_club_id)       — club_admin OR club_manager OR super_admin at this club
--   is_active_guest(p_club_id)        — guests row with status='active' AND not expired
--   is_thread_participant(p_thread_id) — opted into this thread (covers DMs + clubhouse + order chats)
--   has_permission(p_club_id, p_key)  — club_manager OR (club_admin AND permissions[p_key] = true).
--                                       This is THE PERMISSION CHECK — UI hasPerm() must mirror it.

-- ── is_super_admin ─────────────────────────────────────────────────
-- The root of trust. Every other helper composes with this via the
-- "super_admin implicit-true" pattern (super_admin passes every check).
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'super_admin'
  );
$function$;

-- ── is_staff_of ────────────────────────────────────────────────────
-- True for super_admin (any club) OR club_manager / club_admin at the
-- specific club. The "staff" verb — write access to club-scoped data.
CREATE OR REPLACE FUNCTION public.is_staff_of(p_club_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select public.is_super_admin() or exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and club_id = p_club_id
      and role in ('club_manager', 'club_admin')
  );
$function$;

-- ── is_member_or_staff_of ──────────────────────────────────────────
-- Read access for anyone with any relation to the club. Members,
-- staff, super_admins all pass. NOTE: guests do NOT pass — they need
-- is_active_guest separately (which is intentionally narrower:
-- guests only get the subset of tables they're allowed to see).
CREATE OR REPLACE FUNCTION public.is_member_or_staff_of(p_club_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select public.is_staff_of(p_club_id) or exists (
    select 1 from public.members
    where club_id = p_club_id and user_id = auth.uid()
  );
$function$;

-- ── is_club_member ─────────────────────────────────────────────────
-- Strictly members (not staff). Used in a handful of places that want
-- to differentiate "this is the member acting on their own row" vs
-- "this is a staff member acting on a member's row."
CREATE OR REPLACE FUNCTION public.is_club_member(p_club_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from members m where m.club_id = p_club_id and m.user_id = auth.uid());
$function$;

-- ── is_club_manager ────────────────────────────────────────────────
-- Manager only at the specific club (or super_admin globally). The
-- gate for highest-privilege actions: editing club settings, promoting
-- staff to admin/manager, hard delete operations.
CREATE OR REPLACE FUNCTION public.is_club_manager(p_club_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select public.is_super_admin() or exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and club_id = p_club_id and role = 'club_manager'
  );
$function$;

-- ── is_club_admin_at ───────────────────────────────────────────────
-- Any admin tier at the club: super_admin OR club_manager OR club_admin.
-- Less restrictive than is_staff_of? No — same effective predicate.
-- (Kept as a separate name for readability at the call site; some
-- policies read better as "is_club_admin_at" semantically.)
CREATE OR REPLACE FUNCTION public.is_club_admin_at(p_club_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.club_id = p_club_id
        AND ur.role IN ('club_manager', 'club_admin')
    );
$function$;

-- ── is_active_guest ────────────────────────────────────────────────
-- True when caller is an active guest with an unexpired session at
-- the given club. Phase 8 (v0.8.5) helper. Used by SELECT policies on
-- tables guests can read (club_status, club_status_hours,
-- schedule_overrides, pace_of_play, holes, pin_placements, menus,
-- menu_categories, news, events, pro_shop_items). Members-only
-- tables intentionally do NOT add is_active_guest — guests are
-- denied by absence of a matching members row.
CREATE OR REPLACE FUNCTION public.is_active_guest(p_club_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.guests
    WHERE user_id = auth.uid()
      AND club_id = p_club_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  );
$function$;

-- ── is_thread_participant ──────────────────────────────────────────
-- True when caller is opted into the thread (member-side DMs,
-- clubhouse messages, order chats). The messaging surface depends on
-- this for SELECT/INSERT/UPDATE on messages + thread_participants.
CREATE OR REPLACE FUNCTION public.is_thread_participant(p_thread_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select exists (
    select 1 from public.thread_participants
    where thread_id = p_thread_id and user_id = auth.uid()
  );
$function$;

-- ── has_permission ─────────────────────────────────────────────────
-- The granular permission gate for club_admin users. club_manager
-- always passes (implicit-true). club_admin passes only when their
-- permissions jsonb has the requested key = true. This MUST mirror
-- the client-side hasPerm() in src/lib/permissions.js — every
-- permission key is gated at BOTH layers per the supabase-rbac rule.
CREATE OR REPLACE FUNCTION public.has_permission(p_club_id uuid, p_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select public.is_club_manager(p_club_id) or exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and club_id = p_club_id
      and role = 'club_admin'
      and coalesce((permissions->>p_key)::boolean, false) = true
  );
$function$;

-- ── current_member_id ──────────────────────────────────────────────
-- Resolve the caller's members.id for a given club. Convenience used
-- by RLS policies that need to join via member_id (event_registrations,
-- food_orders, bulletin_posts, etc.).
CREATE OR REPLACE FUNCTION public.current_member_id(p_club_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id from members where club_id = p_club_id and user_id = auth.uid() limit 1;
$function$;

-- ── log_people_event ───────────────────────────────────────────────
-- The append-only audit writer for the People area. Every lifecycle
-- RPC (convert_guest_to_member, demote_member_to_guest, change_member_status,
-- promote_member_to_staff, demote_staff_to_member) calls this to write
-- the row. The caller is responsible for authorizing the underlying
-- action — this function is just the writer.
CREATE OR REPLACE FUNCTION public.log_people_event(
  p_auth_user_id uuid,
  p_club_id uuid,
  p_action text,
  p_from_status text DEFAULT NULL,
  p_to_status text DEFAULT NULL,
  p_performed_by_user_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.people_audit_log (
    auth_user_id, club_id, action,
    from_status, to_status, performed_by_user_id, metadata
  ) VALUES (
    p_auth_user_id, p_club_id, p_action,
    p_from_status, p_to_status,
    COALESCE(p_performed_by_user_id, auth.uid()),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
