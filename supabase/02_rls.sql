-- Windhaven Country Club — Row-Level Security policies
-- Run this AFTER 01_schema.sql.
--
-- Rules of thumb:
--   * Members can READ everything for their own club.
--   * Members can WRITE only their own orders / registrations / posts.
--   * Staff (admin_users) can WRITE everything for their own club.
--   * Anonymous (public) reads: only the clubs row (so the marketing/landing
--     can fetch the club name), plus club_status / pace / news / events / menus
--     so the app's pre-auth state still has something to show.
--     Tighten these later if you go full-private.

------------------------------------------------------------------------
-- Enable RLS on every table
------------------------------------------------------------------------
alter table clubs                enable row level security;
alter table members              enable row level security;
alter table admin_users          enable row level security;
alter table club_status          enable row level security;
alter table pace_of_play         enable row level security;
alter table news                 enable row level security;
alter table events               enable row level security;
alter table event_registrations  enable row level security;
alter table menus                enable row level security;
alter table food_orders          enable row level security;
alter table pin_placements       enable row level security;
alter table bulletin_posts       enable row level security;
alter table partner_posts        enable row level security;
alter table pro_shop_inquiries   enable row level security;
alter table club_content         enable row level security;

------------------------------------------------------------------------
-- Drop & recreate policies (idempotent)
------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

------------------------------------------------------------------------
-- Helpers: a member belongs to this club?
------------------------------------------------------------------------
create or replace function is_club_member(p_club_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from members m
    where m.club_id = p_club_id and m.user_id = auth.uid()
  );
$$;

------------------------------------------------------------------------
-- clubs
------------------------------------------------------------------------
create policy clubs_select_all on clubs
  for select using (true);

create policy clubs_admin_write on clubs
  for all using (is_club_admin(id)) with check (is_club_admin(id));

------------------------------------------------------------------------
-- members
------------------------------------------------------------------------
create policy members_self_or_admin_select on members
  for select using (
    user_id = auth.uid()
    or is_club_admin(club_id)
    or is_club_member(club_id)
  );

create policy members_admin_write on members
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

------------------------------------------------------------------------
-- admin_users (admins manage themselves; nobody else sees this table)
------------------------------------------------------------------------
create policy admin_users_admin_only on admin_users
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

------------------------------------------------------------------------
-- club_status — public read, admin write
------------------------------------------------------------------------
create policy status_select_all on club_status
  for select using (true);

create policy status_admin_write on club_status
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

------------------------------------------------------------------------
-- pace_of_play — public read, admin write
------------------------------------------------------------------------
create policy pace_select_all on pace_of_play
  for select using (true);

create policy pace_admin_write on pace_of_play
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

------------------------------------------------------------------------
-- news — public read, admin write
------------------------------------------------------------------------
create policy news_select_all on news
  for select using (true);

create policy news_admin_write on news
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

------------------------------------------------------------------------
-- events — public read, admin write
------------------------------------------------------------------------
create policy events_select_all on events
  for select using (true);

create policy events_admin_write on events
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

------------------------------------------------------------------------
-- event_registrations — members read their own, write their own, admin all
------------------------------------------------------------------------
create policy reg_select on event_registrations
  for select using (
    member_id in (select id from members where user_id = auth.uid())
    or exists (select 1 from events e where e.id = event_id and is_club_admin(e.club_id))
  );

create policy reg_insert_own on event_registrations
  for insert with check (
    member_id in (select id from members where user_id = auth.uid())
  );

create policy reg_delete_own on event_registrations
  for delete using (
    member_id in (select id from members where user_id = auth.uid())
    or exists (select 1 from events e where e.id = event_id and is_club_admin(e.club_id))
  );

------------------------------------------------------------------------
-- menus — public read, admin write
------------------------------------------------------------------------
create policy menus_select_all on menus
  for select using (true);

create policy menus_admin_write on menus
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

------------------------------------------------------------------------
-- food_orders — member writes their own, admin manages all
------------------------------------------------------------------------
create policy orders_member_select on food_orders
  for select using (
    member_id in (select id from members where user_id = auth.uid())
    or is_club_admin(club_id)
  );

create policy orders_member_insert on food_orders
  for insert with check (
    member_id in (select id from members where user_id = auth.uid() and club_id = food_orders.club_id)
  );

create policy orders_admin_update on food_orders
  for update using (is_club_admin(club_id)) with check (is_club_admin(club_id));

create policy orders_admin_delete on food_orders
  for delete using (is_club_admin(club_id));

------------------------------------------------------------------------
-- pin_placements — public read, admin write
------------------------------------------------------------------------
create policy pins_select_all on pin_placements
  for select using (true);

create policy pins_admin_write on pin_placements
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

------------------------------------------------------------------------
-- bulletin_posts — members read non-hidden, write own; admin all
------------------------------------------------------------------------
create policy bulletin_select on bulletin_posts
  for select using (
    (not hidden)
    or is_club_admin(club_id)
    or member_id in (select id from members where user_id = auth.uid())
  );

create policy bulletin_insert_own on bulletin_posts
  for insert with check (
    member_id in (select id from members where user_id = auth.uid() and club_id = bulletin_posts.club_id)
  );

create policy bulletin_update_own on bulletin_posts
  for update using (
    member_id in (select id from members where user_id = auth.uid())
    or is_club_admin(club_id)
  ) with check (
    member_id in (select id from members where user_id = auth.uid())
    or is_club_admin(club_id)
  );

create policy bulletin_delete_own on bulletin_posts
  for delete using (
    member_id in (select id from members where user_id = auth.uid())
    or is_club_admin(club_id)
  );

------------------------------------------------------------------------
-- partner_posts — same shape as bulletin
------------------------------------------------------------------------
create policy partners_select on partner_posts
  for select using (true);

create policy partners_insert_own on partner_posts
  for insert with check (
    member_id in (select id from members where user_id = auth.uid() and club_id = partner_posts.club_id)
  );

create policy partners_update_own on partner_posts
  for update using (
    member_id in (select id from members where user_id = auth.uid())
    or is_club_admin(club_id)
  ) with check (
    member_id in (select id from members where user_id = auth.uid())
    or is_club_admin(club_id)
  );

create policy partners_delete_own on partner_posts
  for delete using (
    member_id in (select id from members where user_id = auth.uid())
    or is_club_admin(club_id)
  );

------------------------------------------------------------------------
-- pro_shop_inquiries — member writes own, admin reads all
------------------------------------------------------------------------
create policy proshop_member_select on pro_shop_inquiries
  for select using (
    member_id in (select id from members where user_id = auth.uid())
    or is_club_admin(club_id)
  );

create policy proshop_member_insert on pro_shop_inquiries
  for insert with check (
    member_id in (select id from members where user_id = auth.uid() and club_id = pro_shop_inquiries.club_id)
  );

create policy proshop_admin_update on pro_shop_inquiries
  for update using (is_club_admin(club_id)) with check (is_club_admin(club_id));

------------------------------------------------------------------------
-- club_content — public read, admin write
------------------------------------------------------------------------
create policy content_select_all on club_content
  for select using (true);

create policy content_admin_write on club_content
  for all using (is_club_admin(club_id)) with check (is_club_admin(club_id));

------------------------------------------------------------------------
-- Realtime
------------------------------------------------------------------------
-- Enable realtime broadcasts for the tables the member view watches live.
alter publication supabase_realtime add table club_status;
alter publication supabase_realtime add table pace_of_play;
alter publication supabase_realtime add table food_orders;
