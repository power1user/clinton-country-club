-- v0.16.16 — Task #52 stage 2c finale: drop the duplicate columns and
-- retire the bidirectional sync triggers. people is now the sole
-- source of truth for name/email/phone/photo_url/zip.
--
-- Order:
--   1. Rewrite dependent DB functions to not reference the columns
--   2. Drop the mirror triggers + their functions (no longer needed)
--   3. Drop the columns
--   4. Add new (club_id, person_id) uniqueness constraints
--
-- The old guests.UNIQUE(club_id, email) constraint will be dropped
-- automatically when the email column drops.

-- ============================================================
-- 1. Rewrite dependent DB functions
-- ============================================================

-- 1a. claim_or_create_member: lookup pre-auth members by people.email
--     (was: members.email), insert with person_id (was: name/email).
create or replace function public.claim_or_create_member(p_club_id uuid)
returns uuid
language plpgsql
security definer
set search_path = 'public', 'auth'
as $$
declare
  v_user_id   uuid := auth.uid();
  v_email     text;
  v_full_name text;
  v_member_id uuid;
  v_person_id uuid;
  v_pending_num text;
begin
  if v_user_id is null then return null; end if;

  -- Already linked?
  select id into v_member_id from public.members
    where user_id = v_user_id and club_id = p_club_id limit 1;
  if v_member_id is not null then return v_member_id; end if;

  -- Pull email + display name from auth
  select email, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1))
    into v_email, v_full_name
    from auth.users where id = v_user_id;

  -- Find pre-auth person row keyed by email (admin previously added)
  select id into v_person_id
    from public.people
   where lower(email) = lower(v_email)
     and auth_user_id is null
   limit 1;

  if v_person_id is not null then
    -- Stamp the auth_user_id onto the existing people row
    update public.people set auth_user_id = v_user_id, updated_at = now()
      where id = v_person_id;

    -- Claim the pending member row at this club linked to this person
    update public.members
      set user_id = v_user_id, status = coalesce(status, 'active')
      where club_id = p_club_id
        and person_id = v_person_id
        and user_id is null
      returning id into v_member_id;

    if v_member_id is not null then return v_member_id; end if;
  end if;

  -- No pending claim. Find or create a people row matched to v_user_id
  if v_person_id is null then
    select id into v_person_id from public.people where auth_user_id = v_user_id;
    if v_person_id is null then
      insert into public.people (auth_user_id, name, email)
      values (v_user_id, v_full_name, v_email)
      returning id into v_person_id;
    end if;
  end if;

  -- Create a fresh pending member row
  v_pending_num := 'P-' || substr(v_user_id::text, 1, 8);
  insert into public.members (club_id, user_id, person_id, membership_number, status)
  values (p_club_id, v_user_id, v_person_id, v_pending_num, 'pending')
  on conflict (club_id, membership_number) do nothing
  returning id into v_member_id;

  if v_member_id is null then
    select id into v_member_id from public.members
      where user_id = v_user_id and club_id = p_club_id limit 1;
  end if;

  return v_member_id;
end;
$$;

-- 1b. fn_guest_email_verified: lookup guests via people.email (was
--     guests.email), and stamp auth_user_id on the linked people row
--     when the user verifies their email.
create or replace function public.fn_guest_email_verified()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  if (old.email_confirmed_at is null and new.email_confirmed_at is not null) then
    -- Stamp auth_user_id on any pre-auth people row matching this email
    update public.people p
       set auth_user_id = new.id,
           updated_at   = now()
     where lower(p.email) = lower(new.email)
       and p.auth_user_id is null;

    -- Promote any pending_authentication guests linked to that person
    update public.guests g
       set status     = case when c.guest_auto_approve then 'active' else 'pending' end,
           user_id    = coalesce(g.user_id, new.id),
           updated_at = now()
      from public.clubs c, public.people p
     where g.club_id = c.id
       and g.person_id = p.id
       and lower(p.email) = lower(new.email)
       and g.status = 'pending_authentication';
  end if;
  return new;
end;
$$;

-- 1c. all_people_at_club: pivot from auth.users-centric to person-centric.
--     Removes references to m.name/m.email/g.name/g.email/g.phone/g.zip.
--     Bonus: pre-auth members + guests (no user_id) now show up
--     because we key off people.id, not auth.users.id.
create or replace function public.all_people_at_club(
  p_club_id uuid,
  p_limit integer default 100,
  p_offset integer default 0,
  p_filter text default 'all',
  p_search text default null
)
returns table (
  auth_user_id  uuid,
  name          text,
  email         text,
  phone         text,
  zip           text,
  photo_url     text,
  relations     jsonb,
  member_status text,
  guest_status  text,
  staff_role    text,
  is_member     boolean,
  is_guest      boolean,
  is_staff      boolean,
  last_seen_at  timestamptz,
  has_notes     boolean,
  total_count   bigint
)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
#variable_conflict use_column
declare
  v_limit  int  := least(greatest(coalesce(p_limit, 100), 1), 500);
  v_offset int  := greatest(coalesce(p_offset, 0), 0);
  v_filter text := coalesce(p_filter, 'all');
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_search_pat text := case when v_search is not null
                            then '%' || lower(v_search) || '%'
                            else null end;
begin
  if not (
    public.is_super_admin()
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.club_id = p_club_id
        and ur.role in ('club_manager', 'club_admin')
    )
  ) then
    raise exception 'Not authorized';
  end if;

  return query
  with base as (
    -- Every people row that has SOME relation at this club. Keyed by
    -- people.id so pre-auth members + guests (user_id NULL) are
    -- included.
    select distinct p.id as pid
    from public.people p
    where
      exists (select 1 from public.members m where m.person_id = p.id and m.club_id = p_club_id)
      or exists (select 1 from public.guests  g where g.person_id = p.id and g.club_id = p_club_id)
      or (p.auth_user_id is not null and exists (
        select 1 from public.user_roles ur
        where ur.user_id = p.auth_user_id and ur.club_id = p_club_id
      ))
  ),
  flagged as (
    select
      b.pid,
      p.name  as resolved_name,
      p.email as resolved_email,
      p.phone as resolved_phone,
      (m.id is not null)    as f_is_member,
      (g.id is not null)    as f_is_guest,
      (ur.role is not null) as f_is_staff
    from base b
    join public.people     p  on p.id = b.pid
    left join public.members    m  on m.person_id = b.pid and m.club_id = p_club_id
    left join public.guests     g  on g.person_id = b.pid and g.club_id = p_club_id
    left join public.user_roles ur on ur.user_id  = p.auth_user_id and ur.club_id = p_club_id
  ),
  matching as (
    select fl.pid, fl.resolved_name
    from flagged fl
    where
      (v_filter = 'all'
        or (v_filter = 'member' and fl.f_is_member)
        or (v_filter = 'guest'  and fl.f_is_guest)
        or (v_filter = 'staff'  and fl.f_is_staff))
      and (v_search_pat is null
        or lower(coalesce(fl.resolved_name,  '')) like v_search_pat
        or lower(coalesce(fl.resolved_email, '')) like v_search_pat
        or lower(coalesce(fl.resolved_phone, '')) like v_search_pat)
  ),
  total as (select count(*)::bigint as n from matching),
  paged as (
    select mt.pid
    from matching mt
    order by mt.resolved_name
    limit v_limit offset v_offset
  ),
  rel_member as (
    select m.person_id as pid,
           jsonb_build_object('kind','member','status',m.status,'tier',m.tier) as rel
    from public.members m
    where m.club_id = p_club_id
      and m.person_id in (select pg.pid from paged pg)
  ),
  rel_guest as (
    select g.person_id as pid,
           jsonb_build_object('kind','guest','status',g.status,'access_level',g.access_level::text,'expires_at',g.expires_at) as rel
    from public.guests g
    where g.club_id = p_club_id
      and g.person_id in (select pg.pid from paged pg)
  ),
  rel_staff as (
    select p.id as pid,
           jsonb_build_object('kind','staff','role',ur.role) as rel
    from public.user_roles ur
    join public.people p on p.auth_user_id = ur.user_id
    where ur.club_id = p_club_id
      and p.id in (select pg.pid from paged pg)
  ),
  rels_agg as (
    select all_rels.pid, jsonb_agg(all_rels.rel) as relations
    from (
      select rm.pid, rm.rel from rel_member rm
      union all
      select rg.pid, rg.rel from rel_guest rg
      union all
      select rs.pid, rs.rel from rel_staff rs
    ) all_rels
    group by all_rels.pid
  ),
  last_seen as (
    select g.person_id as pid,
           max(gv.visit_date)::timestamptz as gv_max
    from public.guests g
    left join public.guest_visits gv on gv.guest_id = g.id
    where g.club_id = p_club_id
      and g.person_id in (select pg.pid from paged pg)
    group by g.person_id
  )
  select
    p.auth_user_id as auth_user_id,
    p.name         as name,
    p.email        as email,
    p.phone        as phone,
    p.zip          as zip,
    p.photo_url    as photo_url,
    coalesce(ra.relations, '[]'::jsonb) as relations,
    m.status as member_status,
    g.status as guest_status,
    ur.role  as staff_role,
    (m.id is not null)    as is_member,
    (g.id is not null)    as is_guest,
    (ur.role is not null) as is_staff,
    greatest(
      coalesce(m.created_at, '1970-01-01'::timestamptz),
      coalesce(ls.gv_max,    '1970-01-01'::timestamptz)
    ) as last_seen_at,
    (coalesce(nullif(trim(m.notes), ''), nullif(trim(g.notes), '')) is not null) as has_notes,
    (select n from total) as total_count
  from paged pg
  join public.people p on p.id = pg.pid
  left join public.members    m  on m.person_id = pg.pid and m.club_id = p_club_id
  left join public.guests     g  on g.person_id = pg.pid and g.club_id = p_club_id
  left join public.user_roles ur on ur.user_id = p.auth_user_id and ur.club_id = p_club_id
  left join rels_agg          ra on ra.pid = pg.pid
  left join last_seen         ls on ls.pid = pg.pid
  order by p.name;
end;
$$;

-- ============================================================
-- 2. Drop the mirror triggers + functions (no longer needed)
-- ============================================================
drop trigger if exists trg_mirror_member_to_people     on public.members;
drop trigger if exists trg_mirror_guest_to_people      on public.guests;
drop trigger if exists trg_mirror_people_to_member_guest on public.people;
drop function if exists public.fn_mirror_member_to_people();
drop function if exists public.fn_mirror_guest_to_people();
drop function if exists public.fn_mirror_people_to_member_guest();

-- ============================================================
-- 3. Drop the duplicate columns. The guests UNIQUE(club_id, email)
--    constraint will drop automatically when the email column drops.
-- ============================================================
alter table public.members
  drop column if exists name,
  drop column if exists email,
  drop column if exists phone,
  drop column if exists photo_url;

alter table public.guests
  drop column if exists name,
  drop column if exists email,
  drop column if exists phone,
  drop column if exists zip;

-- ============================================================
-- 4. Add new uniqueness constraints on (club_id, person_id)
--    so we can use them as ON CONFLICT targets and prevent
--    duplicate memberships/guests for the same person at a club.
-- ============================================================
alter table public.members
  add constraint members_club_person_unique unique (club_id, person_id);

alter table public.guests
  add constraint guests_club_person_unique unique (club_id, person_id);

notify pgrst, 'reload schema';
