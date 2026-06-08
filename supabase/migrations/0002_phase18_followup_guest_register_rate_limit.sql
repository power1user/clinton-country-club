-- v0.16.13 — Phase 18 follow-up #2: rate-limit guest-register POST.
--
-- The guest-register Edge Function is the only public unauthenticated
-- write endpoint in the app. v0.16.10 confirmed RLS correctly locks
-- down everything sensitive (guests can read public surfaces but
-- can't write anything beyond their own visit_check_ins). What was
-- left open: an attacker could call POST /functions/v1/guest-register
-- in a tight loop to (a) flood the guests table at one club or
-- (b) spam a real person's inbox with magic-link OTPs.
--
-- Defense: a tiny rate-limit table + SECURITY DEFINER helper. The
-- Edge Function calls the helper with (a) the requester's IP and
-- (b) the submitted email; if either bucket is over budget, the
-- Edge Function 429s before doing any work.
--
-- Buckets:
--   ip    → 20 attempts per 10 min   (covers legit shared-IP households)
--   email → 5  attempts per  1 hour  (prevents OTP-spam against an email)
--
-- Cleanup: rows older than 24h are TTL'd at check-time. No vacuum
-- job needed; volume is tiny.

create table if not exists public.rate_limit_events (
  id bigserial primary key,
  bucket text not null,          -- 'guest_register_ip' / 'guest_register_email' / future buckets
  key    text not null,          -- the IP or email value
  ts     timestamptz not null default now()
);

create index if not exists idx_rate_limit_events_bucket_key_ts
  on public.rate_limit_events (bucket, key, ts desc);

-- TTL helper: drop anything older than 24h. Called inside the
-- check function so cleanup happens lazily without a cron job.
create or replace function public._rate_limit_gc()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limit_events
  where ts < now() - interval '24 hours';
$$;

-- Main check + record helper. Returns true if the attempt is allowed
-- (and records it), false if the bucket is over budget. SECURITY
-- DEFINER so the Edge Function (using service-role) can call it
-- without granting direct write privileges to the public.
create or replace function public.check_and_record_rate_limit(
  p_bucket        text,
  p_key           text,
  p_window_secs   int,
  p_max_attempts  int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Lazy GC on ~1% of calls. Cheap pseudo-random gate.
  if (extract(microsecond from clock_timestamp())::int % 100) = 0 then
    perform public._rate_limit_gc();
  end if;

  select count(*) into v_count
  from public.rate_limit_events
  where bucket = p_bucket
    and key    = p_key
    and ts     > now() - make_interval(secs => p_window_secs);

  if v_count >= p_max_attempts then
    return false;
  end if;

  insert into public.rate_limit_events (bucket, key) values (p_bucket, p_key);
  return true;
end;
$$;

-- Lock down. RLS is on, no policies = nobody but service_role can touch.
alter table public.rate_limit_events enable row level security;

revoke all on public.rate_limit_events from anon, authenticated;
grant  execute on function public.check_and_record_rate_limit(text, text, int, int) to service_role;
grant  execute on function public._rate_limit_gc() to service_role;
