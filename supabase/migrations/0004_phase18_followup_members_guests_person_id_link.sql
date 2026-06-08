-- v0.16.15 — Task #52 stage 2a: link every member/guest to a people
-- row via a new `person_id` FK. Path A — `people` becomes the source
-- of truth for everyone, even pre-auth admin-added records.
--
-- Background: today people.auth_user_id is NOT NULL and people rows
-- only exist for auth-linked members/guests (where user_id IS NOT
-- NULL). Pre-auth admin-added members (CSV import, "Add Person"
-- before claim) live ONLY on members.name/email/phone/etc. That
-- blocks dropping the duplicate columns — pre-auth records would
-- lose their identity entirely.
--
-- Path A: make `people` the source of truth for everyone, even
-- pre-auth. Every member and guest gets a `person_id` link. Pre-auth
-- members get a fresh people row created from their duplicate
-- columns. When/if they later authenticate, the claim flow stamps
-- the existing people row's auth_user_id.
--
-- Steps:
--   0. Relax NOT NULL on people.auth_user_id
--   1. Add members.person_id + guests.person_id (nullable, FK to people.id)
--   2. Backfill auth-linked rows by matching user_id → people.auth_user_id
--   3. Create new people rows for pre-auth members/guests + link person_id
--   4. Add the FK constraints
--   5. Verify no NULLs left, then make person_id NOT NULL
--   6. Indexes

-- 0. Relax NOT NULL on auth_user_id. The UNIQUE constraint stays
--    (allows multiple NULLs in Postgres, blocks duplicate auth users).
alter table public.people alter column auth_user_id drop not null;

-- 1. Add nullable person_id columns
alter table public.members add column if not exists person_id uuid;
alter table public.guests  add column if not exists person_id uuid;

-- 2. Backfill auth-linked rows
update public.members m
   set person_id = p.id
  from public.people p
 where p.auth_user_id = m.user_id
   and m.user_id is not null
   and m.person_id is null;

update public.guests g
   set person_id = p.id
  from public.people p
 where p.auth_user_id = g.user_id
   and g.user_id is not null
   and g.person_id is null;

-- 3. Create people rows for pre-auth members
do $$
declare
  r record;
  new_pid uuid;
begin
  for r in (
    select id, name, email, phone
      from public.members
     where person_id is null
       and user_id is null
       and name is not null and name <> ''
  ) loop
    select id into new_pid
      from public.people
     where auth_user_id is null
       and lower(email) = lower(r.email)
     limit 1;

    if new_pid is null then
      insert into public.people (name, email, phone)
      values (r.name, r.email, r.phone)
      returning id into new_pid;
    end if;

    update public.members set person_id = new_pid where id = r.id;
  end loop;
end $$;

-- 4. Same loop for pre-auth guests
do $$
declare
  r record;
  new_pid uuid;
begin
  for r in (
    select id, name, email, phone, zip
      from public.guests
     where person_id is null
       and user_id is null
       and name is not null and name <> ''
  ) loop
    select id into new_pid
      from public.people
     where auth_user_id is null
       and lower(email) = lower(r.email)
     limit 1;

    if new_pid is null then
      insert into public.people (name, email, phone, zip)
      values (r.name, r.email, r.phone, r.zip)
      returning id into new_pid;
    end if;

    update public.guests set person_id = new_pid where id = r.id;
  end loop;
end $$;

-- 5. FK constraints. ON DELETE SET NULL so deleting a person doesn't
--    cascade-delete the membership/guest record — that should be an
--    explicit choice gated elsewhere.
alter table public.members
  add constraint members_person_id_fkey
  foreign key (person_id) references public.people(id) on delete set null;

alter table public.guests
  add constraint guests_person_id_fkey
  foreign key (person_id) references public.people(id) on delete set null;

-- 6. Verification + NOT NULL lock
do $$
declare
  m_nulls int;
  g_nulls int;
begin
  select count(*) into m_nulls from public.members where person_id is null;
  select count(*) into g_nulls from public.guests  where person_id is null;
  if m_nulls > 0 then
    raise exception 'Migration aborted: % members still have NULL person_id', m_nulls;
  end if;
  if g_nulls > 0 then
    raise exception 'Migration aborted: % guests still have NULL person_id', g_nulls;
  end if;
end $$;

alter table public.members alter column person_id set not null;
alter table public.guests  alter column person_id set not null;

-- 7. Indexes for the new lookup pattern
create index if not exists idx_members_person_id on public.members(person_id);
create index if not exists idx_guests_person_id  on public.guests(person_id);

notify pgrst, 'reload schema';
