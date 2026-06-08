-- v0.16.15 — Task #52 stage 2b cleanup: drop the now-redundant FKs
-- from members.user_id and guests.user_id to people.auth_user_id.
--
-- v0.16.14 added these so PostgREST could expose a `people` embed
-- (migration 0003). v0.16.15 stage 2a (migration 0004) added
-- person_id with its own FK to people.id, which is the canonical
-- link going forward (handles pre-auth case; person_id NOT NULL on
-- every row).
--
-- With TWO FKs between members → people, PostgREST embeds need
-- disambiguation hints OR they pick one arbitrarily. Drop the
-- user_id FK so person_id is the only path. The user_id column
-- itself stays — it still FKs to auth.users(id) for auth lookups.

alter table public.members drop constraint if exists members_user_id_people_fkey;
alter table public.guests  drop constraint if exists guests_user_id_people_fkey;

notify pgrst, 'reload schema';
