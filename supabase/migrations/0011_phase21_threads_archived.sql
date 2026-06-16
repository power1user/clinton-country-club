-- 0011_phase21_threads_archived.sql
--
-- v0.19.8 — soft-archive support for clubhouse threads.
--
-- Admin "Archive" sets archived_at; member-side surfaces keep showing
-- the thread (no RLS change). Admin list query filters archived_at IS NULL
-- to stay tidy. A new non-staff (= member) message resurfaces the thread
-- via trigger so an archived conversation can't go silently missing.

begin;

alter table public.threads
  add column if not exists archived_at timestamptz null,
  add column if not exists archived_by uuid null references auth.users(id) on delete set null;

comment on column public.threads.archived_at is
  'When the thread was archived from the admin queue. NULL = active. '
  'Set by staff via admin bulk/per-row archive. Member-side surfaces ignore this column.';
comment on column public.threads.archived_by is
  'Which auth user archived the thread. Audit trail; nullable on user delete.';

create index if not exists idx_threads_club_kind_archived
  on public.threads (club_id, kind, archived_at);

-- Auto un-archive on a new non-staff message so an archived conversation
-- doesn't silently swallow a fresh member follow-up. Staff replies do NOT
-- trigger this — a staff member's own reply on a thread they just
-- archived should leave it archived.
create or replace function public.fn_unarchive_thread_on_member_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_archived timestamptz;
  v_club uuid;
  v_is_staff boolean;
begin
  if new.is_system then return new; end if;
  if new.sender_user_id is null then return new; end if;

  select archived_at, club_id into v_archived, v_club
  from public.threads where id = new.thread_id;

  if v_archived is null then return new; end if;

  -- "Staff" = super_admin (club-wide) OR a role pinned to this club.
  -- Members aren't in user_roles, so the exists() returns false for
  -- them and the thread un-archives.
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = new.sender_user_id
      and (ur.role = 'super_admin' or ur.club_id = v_club)
  ) into v_is_staff;

  if not v_is_staff then
    update public.threads
       set archived_at = null,
           archived_by = null
     where id = new.thread_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_unarchive_thread_on_member_message on public.messages;
create trigger trg_unarchive_thread_on_member_message
  after insert on public.messages
  for each row execute function public.fn_unarchive_thread_on_member_message();

commit;
