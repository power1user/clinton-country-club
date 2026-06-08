-- v0.16.15 — Task #52 stage 2b: make the sync triggers person_id-aware.
--
-- After 0004 (stage 2a) every member/guest has a person_id link.
-- Today's triggers key off user_id ↔ people.auth_user_id and skip
-- when user_id IS NULL — meaning pre-auth admin-added members don't
-- get a people row created. 0004 backfilled all of those.
--
-- Going forward, all sync logic keys off person_id:
--   · INSERT into members/guests without person_id → auto-create
--     people row + set NEW.person_id. Lets legacy code that writes
--     members.name/email/phone keep working through the bake period.
--   · UPDATE on members/guests → mirror name/email/phone changes to
--     the linked people row (via person_id), regardless of user_id.
--   · When a previously pre-auth member acquires a user_id (claim
--     flow), stamp the linked people.auth_user_id so future joins
--     pick them up by either link.
--   · people → members/guests mirror still runs to keep duplicate
--     columns warm during the bake (until stage 2c drops them).

create or replace function public.fn_mirror_member_to_people()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_pid uuid;
begin
  if current_setting('app.suppress_sync', true) = 'on' then
    return new;
  end if;
  perform set_config('app.suppress_sync', 'on', true);

  -- Path A: every member must have a person_id. If the writer didn't
  -- supply one, find an existing people row to attach to, or create.
  if new.person_id is null then
    -- Try existing person by auth link
    if new.user_id is not null then
      select id into v_pid from public.people where auth_user_id = new.user_id;
    end if;

    -- Try pre-auth person by email (admin previously added them)
    if v_pid is null and new.email is not null and new.email <> '' then
      select id into v_pid
        from public.people
       where auth_user_id is null
         and lower(email) = lower(new.email)
       limit 1;
    end if;

    -- Create fresh people row
    if v_pid is null then
      insert into public.people (auth_user_id, name, email, phone)
      values (new.user_id, new.name, new.email, new.phone)
      returning id into v_pid;
    end if;

    new.person_id := v_pid;
  end if;

  -- Mirror non-empty name/email/phone forward to the linked people row.
  -- Also stamp auth_user_id if the member just acquired one and the
  -- people row was pre-auth.
  update public.people p
     set name         = case when new.name  is not null and new.name  <> '' then new.name  else p.name  end,
         email        = case when new.email is not null and new.email <> '' then new.email else p.email end,
         phone        = coalesce(new.phone, p.phone),
         auth_user_id = coalesce(p.auth_user_id, new.user_id),
         updated_at   = now()
   where p.id = new.person_id;

  perform set_config('app.suppress_sync', 'off', true);
  return new;
end;
$$;

create or replace function public.fn_mirror_guest_to_people()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_pid uuid;
begin
  if current_setting('app.suppress_sync', true) = 'on' then
    return new;
  end if;
  perform set_config('app.suppress_sync', 'on', true);

  if new.person_id is null then
    if new.user_id is not null then
      select id into v_pid from public.people where auth_user_id = new.user_id;
    end if;
    if v_pid is null and new.email is not null and new.email <> '' then
      select id into v_pid
        from public.people
       where auth_user_id is null
         and lower(email) = lower(new.email)
       limit 1;
    end if;
    if v_pid is null then
      insert into public.people (auth_user_id, name, email, phone, zip)
      values (new.user_id, new.name, new.email, new.phone, new.zip)
      returning id into v_pid;
    end if;
    new.person_id := v_pid;
  end if;

  update public.people p
     set name         = case when new.name  is not null and new.name  <> '' then new.name  else p.name  end,
         email        = case when new.email is not null and new.email <> '' then new.email else p.email end,
         phone        = coalesce(new.phone, p.phone),
         zip          = coalesce(new.zip, p.zip),
         auth_user_id = coalesce(p.auth_user_id, new.user_id),
         updated_at   = now()
   where p.id = new.person_id;

  perform set_config('app.suppress_sync', 'off', true);
  return new;
end;
$$;

-- Re-bind the triggers to fire BEFORE INSERT (so NEW.person_id can be
-- set before the row is written) and BEFORE UPDATE (so updates flow).
drop trigger if exists trg_mirror_member_to_people on public.members;
create trigger trg_mirror_member_to_people
  before insert or update on public.members
  for each row execute function public.fn_mirror_member_to_people();

drop trigger if exists trg_mirror_guest_to_people on public.guests;
create trigger trg_mirror_guest_to_people
  before insert or update on public.guests
  for each row execute function public.fn_mirror_guest_to_people();

-- People → members/guests mirror: now keys off person_id (was: user_id
-- via auth_user_id). Updates the cache columns on every linked row.
-- Stays in place for the bake period; dropped in stage 2c with the
-- columns themselves.
create or replace function public.fn_mirror_people_to_member_guest()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  if current_setting('app.suppress_sync', true) = 'on' then
    return new;
  end if;
  perform set_config('app.suppress_sync', 'on', true);

  update public.members
     set name      = case when new.name  is not null and new.name  <> '' then new.name  else name  end,
         email     = case when new.email is not null and new.email <> '' then new.email else email end,
         phone     = coalesce(new.phone, phone),
         photo_url = coalesce(new.photo_url, photo_url)
   where person_id = new.id;

  update public.guests
     set name  = case when new.name  is not null and new.name  <> '' then new.name  else name  end,
         email = case when new.email is not null and new.email <> '' then new.email else email end,
         phone = coalesce(new.phone, phone),
         zip   = coalesce(new.zip,   zip)
   where person_id = new.id;

  perform set_config('app.suppress_sync', 'off', true);
  return new;
end;
$$;

notify pgrst, 'reload schema';
