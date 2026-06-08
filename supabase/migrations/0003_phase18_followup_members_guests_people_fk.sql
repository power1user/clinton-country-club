-- v0.16.14 — Task #52 stage 1 prep: add FKs from members.user_id and
-- guests.user_id to people.auth_user_id. Both columns ALREADY have FKs
-- to auth.users(id); this adds a SECOND FK pointing to the unique
-- people.auth_user_id column so PostgREST exposes a `people` embed on
-- members and guests rows (`members.select('..., people(name, email)')`).
--
-- We verified pre-migration that every members.user_id and guests.user_id
-- not-null value has a matching people row (orphans = 0), so the
-- constraints validate without backfill needed.
--
-- Both FKs are ON DELETE SET NULL — we never want a people delete to
-- cascade and remove the membership/guest record. (People delete is
-- already gated by triggers + RLS elsewhere.)

alter table public.members
  add constraint members_user_id_people_fkey
  foreign key (user_id) references public.people(auth_user_id)
  on delete set null;

alter table public.guests
  add constraint guests_user_id_people_fkey
  foreign key (user_id) references public.people(auth_user_id)
  on delete set null;

-- Tell PostgREST to refresh its schema cache so the new relationships
-- become available immediately.
notify pgrst, 'reload schema';
