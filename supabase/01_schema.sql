-- Windhaven Country Club — Schema
-- Run this in Supabase SQL Editor (left nav → SQL Editor → New query → paste → Run)
-- Idempotent: safe to re-run.

------------------------------------------------------------------------
-- Extensions
------------------------------------------------------------------------
create extension if not exists pgcrypto;

------------------------------------------------------------------------
-- Clubs (white-label foundation; one row per club)
------------------------------------------------------------------------
create table if not exists clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  city        text,
  state       text,
  founded     int,
  par         int,
  yardage     int,
  lat         numeric,
  lng         numeric,
  created_at  timestamptz not null default now()
);

------------------------------------------------------------------------
-- Members  (linked to auth.users)
------------------------------------------------------------------------
create table if not exists members (
  id                uuid primary key default gen_random_uuid(),
  club_id           uuid not null references clubs(id) on delete cascade,
  user_id           uuid unique references auth.users(id) on delete cascade,
  name              text not null,
  membership_number text not null,
  member_since      text,
  tier              text,
  hcp               text,
  email             text,
  locker            text,
  cart              text,
  parking           text,
  created_at        timestamptz not null default now(),
  unique (club_id, membership_number)
);

create index if not exists idx_members_club on members(club_id);
create index if not exists idx_members_user on members(user_id);

------------------------------------------------------------------------
-- Admin users  (staff routing)
------------------------------------------------------------------------
create table if not exists admin_users (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  display_name text,
  created_at  timestamptz not null default now(),
  unique (club_id, user_id)
);

------------------------------------------------------------------------
-- Club status pills  (Course, Bar, Restaurant, Kitchen, Lounge, Oak Room)
------------------------------------------------------------------------
create table if not exists club_status (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  category    text not null,          -- 'course' | 'bar' | 'restaurant' | 'kitchen' | 'lounge' | 'oak'
  label       text not null,          -- 'Course', 'Oak Room', etc.
  sort_order  int  not null default 0,
  state       text not null check (state in ('open','limited','closed')),
  hours_note  text,
  staff_note  text,
  updated_at  timestamptz not null default now(),
  unique (club_id, category)
);

create index if not exists idx_status_club on club_status(club_id);

------------------------------------------------------------------------
-- Pace of play
------------------------------------------------------------------------
create table if not exists pace_of_play (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null unique references clubs(id) on delete cascade,
  state       text not null check (state in ('open','limited','closed')) default 'open',  -- on pace / slow / very slow
  time_label  text,                                                                       -- '4h 08m'
  message     text,
  updated_at  timestamptz not null default now()
);

------------------------------------------------------------------------
-- News
------------------------------------------------------------------------
create table if not exists news (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references clubs(id) on delete cascade,
  category     text not null,         -- 'Events' | 'Course' | 'Dining' | 'Club' | 'General'
  headline     text not null,
  body         text not null,
  date_label   text,                  -- 'Today', 'May 14' — display string
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists idx_news_club_pub on news(club_id, published_at desc);

------------------------------------------------------------------------
-- Events
------------------------------------------------------------------------
create table if not exists events (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references clubs(id) on delete cascade,
  title        text not null,
  description  text,
  category     text,                  -- 'Golf' | 'Social' | 'Dining'
  event_date   date not null,
  event_time   text,                  -- '7:30am shotgun'
  date_label   text,                  -- 'Sat, May 17' display
  dow          text,                  -- 'SAT'
  day_num      text,                  -- '17'
  spots        int not null default 0,
  price        text,                  -- '$125', 'Free'
  created_at   timestamptz not null default now()
);

create index if not exists idx_events_club_date on events(club_id, event_date);

------------------------------------------------------------------------
-- Event registrations
------------------------------------------------------------------------
create table if not exists event_registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  member_id     uuid not null references members(id) on delete cascade,
  registered_at timestamptz not null default now(),
  unique (event_id, member_id)
);

------------------------------------------------------------------------
-- Menus
------------------------------------------------------------------------
create table if not exists menus (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references clubs(id) on delete cascade,
  category      text not null,   -- 'specials' | 'lunch' | 'dinner' | 'bar' | 'desserts'
  sort_order    int not null default 0,
  item_name     text not null,
  description   text,
  price         text,            -- '$24'
  tag           text,            -- 'Chef Special'
  is_special    boolean not null default false,
  available_today boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists idx_menus_club_cat on menus(club_id, category, sort_order);

------------------------------------------------------------------------
-- Food orders (to the course)
------------------------------------------------------------------------
create table if not exists food_orders (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references clubs(id) on delete cascade,
  member_id     uuid references members(id) on delete set null,
  items         jsonb not null,        -- [{id, name, qty, price}]
  hole          int,
  location_note text,
  status        text not null default 'pending' check (status in ('pending','preparing','out_for_delivery','delivered','cancelled')),
  subtotal      numeric,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_orders_club_status on food_orders(club_id, status, created_at desc);

------------------------------------------------------------------------
-- Pin placements (one row per hole per date)
------------------------------------------------------------------------
create table if not exists pin_placements (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references clubs(id) on delete cascade,
  hole_number     int not null check (hole_number between 1 and 18),
  par             int,
  yards           int,
  pin_position    text,
  green_condition text,
  hazard_note     text,
  pace_label      text,
  effective_date  date not null default current_date,
  created_at      timestamptz not null default now(),
  unique (club_id, hole_number, effective_date)
);

create index if not exists idx_pins_club_date on pin_placements(club_id, effective_date);

------------------------------------------------------------------------
-- Bulletin board
------------------------------------------------------------------------
create table if not exists bulletin_posts (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  member_id   uuid references members(id) on delete set null,
  category    text not null,  -- 'Classifieds' | 'Wanted' | 'General'
  title       text not null,
  body        text not null,
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_bulletin_club on bulletin_posts(club_id, hidden, created_at desc);

------------------------------------------------------------------------
-- Golf partner board
------------------------------------------------------------------------
create table if not exists partner_posts (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  member_id   uuid references members(id) on delete set null,
  category    text,           -- 'Foursome' | 'Single' | 'Threesome' | 'Practice' | 'Cart Share'
  title       text not null,
  body        text not null,
  date_wanted date,
  hcp         int,
  is_open     boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_partners_club on partner_posts(club_id, created_at desc);

------------------------------------------------------------------------
-- Pro shop inquiries (lesson requests, fittings, etc.)
------------------------------------------------------------------------
create table if not exists pro_shop_inquiries (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  member_id   uuid references members(id) on delete set null,
  kind        text not null,         -- 'lesson' | 'fitting' | 'other'
  pro         text,
  preferred_date date,
  focus_areas text[],
  notes       text,
  status      text not null default 'pending' check (status in ('pending','contacted','scheduled','done','cancelled')),
  created_at  timestamptz not null default now()
);

------------------------------------------------------------------------
-- Static club content (member guide, etc.)
------------------------------------------------------------------------
create table if not exists club_content (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references clubs(id) on delete cascade,
  slug        text not null,         -- 'onboarding-welcome', 'dress-code', etc.
  title       text not null,
  icon        text,
  body        text not null,
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now(),
  unique (club_id, slug)
);

------------------------------------------------------------------------
-- Helper function: is the auth user staff for this club?
------------------------------------------------------------------------
create or replace function is_club_admin(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users a
    where a.club_id = p_club_id
      and a.user_id = auth.uid()
  );
$$;

create or replace function current_member_id(p_club_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from members
  where club_id = p_club_id and user_id = auth.uid()
  limit 1;
$$;

------------------------------------------------------------------------
-- Updated_at trigger helper
------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_status_updated') then
    create trigger trg_status_updated before update on club_status
      for each row execute procedure set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_pace_updated') then
    create trigger trg_pace_updated before update on pace_of_play
      for each row execute procedure set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_orders_updated') then
    create trigger trg_orders_updated before update on food_orders
      for each row execute procedure set_updated_at();
  end if;
end $$;
