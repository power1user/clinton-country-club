-- v0.16.17 — Task #52 stage 2c follow-up: all_people_at_club returns
-- person_id so the client can use it as the row identity key.
--
-- Bug surfaced by v0.16.16: pre-auth members + guests are now visible
-- in the People admin view (was an accidental fix to a latent bug),
-- but they have auth_user_id = NULL. The client uses auth_user_id as
-- the React key + state identifier for kebab menus, busy spinners,
-- and openEdit() handlers. With multiple pre-auth rows, all NULL
-- auth_user_ids collapse to the same identity — kebab menus pop
-- open for every pre-auth row at once.
--
-- Fix: expose person_id (always populated, always unique). Client
-- switches keying to that.

drop function if exists public.all_people_at_club(uuid, integer, integer, text, text);

create or replace function public.all_people_at_club(
  p_club_id uuid,
  p_limit integer default 100,
  p_offset integer default 0,
  p_filter text default 'all',
  p_search text default null
)
returns table (
  person_id     uuid,
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
    p.id           as person_id,
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

notify pgrst, 'reload schema';
