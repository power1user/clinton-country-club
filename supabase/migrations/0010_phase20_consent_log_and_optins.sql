-- 0010_phase20_consent_log_and_optins.sql
--
-- v0.18.0 — Grounds Live legal compliance: append-only consent log,
-- email/SMS marketing opt-in columns on people, age affirmation column,
-- and record_consent RPC for client + Edge Functions.
--
-- Compliance posture: TCPA, CAN-SPAM, CCPA. Consent records are evidence
-- if a claim is ever raised. They are append-only; no UPDATE, no DELETE,
-- enforced at the policy AND trigger layer.

begin;

-- ---------------------------------------------------------------------------
-- 1. Opt-in + age columns on people (platform-wide consent state)
-- ---------------------------------------------------------------------------
-- Marketing consent is platform-wide ("Grounds Live and your Club") and does
-- not vary per membership. Living on people is the right home.

alter table public.people
  add column if not exists email_marketing_opt_in       boolean not null default false,
  add column if not exists email_marketing_opt_in_at    timestamptz null,
  add column if not exists sms_marketing_opt_in         boolean not null default false,
  add column if not exists sms_marketing_opt_in_at      timestamptz null,
  add column if not exists age_affirmed_18              boolean not null default false,
  add column if not exists age_affirmed_18_at           timestamptz null;

comment on column public.people.email_marketing_opt_in    is 'Current state. True only if person affirmatively opted in. Mirror of latest consent_log row for fast send-time checks.';
comment on column public.people.sms_marketing_opt_in      is 'Current state. True only if person affirmatively opted in. TCPA-compliant — never default true.';
comment on column public.people.age_affirmed_18           is 'Person affirmed they are 18+. Required for account creation. Per ToU section 1 and Privacy Policy section 10.';

-- ---------------------------------------------------------------------------
-- 2. consent_log — append-only evidence record
-- ---------------------------------------------------------------------------

create table if not exists public.consent_log (
  id              uuid primary key default gen_random_uuid(),
  person_id       uuid not null references public.people(id) on delete cascade,
  auth_user_id    uuid null,
  club_id         uuid null references public.clubs(id) on delete set null,
  consent_type    text not null,
  consent_value   boolean not null,
  consent_text    text not null,
  contact_value   text not null,
  source          text not null,
  terms_version   integer null,
  privacy_version integer null,
  user_agent      text null,
  ip_address      inet null,
  created_at      timestamptz not null default now(),

  constraint consent_log_type_check check (
    consent_type in ('terms_and_privacy', 'age_18_plus', 'email_marketing', 'sms_marketing')
  ),
  constraint consent_log_source_check check (
    source in ('registration', 'terms_gate', 'settings', 'sms_stop', 'email_unsubscribe', 'admin')
  )
);

comment on table public.consent_log is
  'Append-only consent and opt-out record. Required for TCPA/CAN-SPAM defense. '
  'Never UPDATE or DELETE — opt-outs and changes append new rows.';

create index if not exists idx_consent_log_person_type
  on public.consent_log (person_id, consent_type, created_at desc);

create index if not exists idx_consent_log_type_created
  on public.consent_log (consent_type, created_at);

create index if not exists idx_consent_log_auth_user
  on public.consent_log (auth_user_id)
  where auth_user_id is not null;

-- Append-only enforcement at the trigger layer (defense in depth — RLS
-- alone would let SECURITY DEFINER code bypass it accidentally).
create or replace function public.fn_block_consent_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'consent_log is append-only: % blocked', tg_op
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists trg_consent_log_no_update on public.consent_log;
create trigger trg_consent_log_no_update
  before update on public.consent_log
  for each row execute function public.fn_block_consent_log_mutation();

drop trigger if exists trg_consent_log_no_delete on public.consent_log;
create trigger trg_consent_log_no_delete
  before delete on public.consent_log
  for each row execute function public.fn_block_consent_log_mutation();

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

alter table public.consent_log enable row level security;

-- A person can read their own consent records. RPC handles inserts;
-- no direct client INSERT is granted.
drop policy if exists consent_log_select_own on public.consent_log;
create policy consent_log_select_own
  on public.consent_log
  for select
  to authenticated
  using (auth_user_id = auth.uid());

-- super_admin can read all consent records (for compliance audits + support).
drop policy if exists consent_log_select_super_admin on public.consent_log;
create policy consent_log_select_super_admin
  on public.consent_log
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'super_admin'
    )
  );

-- No INSERT policy → no client direct insert. RPC is the only path in.
-- (SECURITY DEFINER RPC bypasses RLS by design.)

-- ---------------------------------------------------------------------------
-- 4. record_consent RPC
-- ---------------------------------------------------------------------------
-- Single entry point for consent writes. Inserts the log row AND updates
-- the mirror column on people in one transaction.

create or replace function public.record_consent(
  p_consent_type     text,
  p_consent_value    boolean,
  p_consent_text     text,
  p_source           text,
  p_club_id          uuid default null,
  p_terms_version    integer default null,
  p_privacy_version  integer default null,
  p_user_agent       text default null,
  p_ip_address       inet default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_user_id  uuid := auth.uid();
  v_person_id     uuid;
  v_contact       text;
  v_log_id        uuid;
begin
  if v_auth_user_id is null then
    raise exception 'record_consent requires an authenticated session'
      using errcode = '42501';
  end if;

  -- Resolve person + appropriate contact value
  select p.id,
         case
           when p_consent_type = 'sms_marketing' then p.phone
           else p.email
         end
    into v_person_id, v_contact
    from public.people p
    where p.auth_user_id = v_auth_user_id;

  if v_person_id is null then
    raise exception 'no person record for user %', v_auth_user_id
      using errcode = 'no_data_found';
  end if;

  -- SMS opt-in requires a phone number on file
  if p_consent_type = 'sms_marketing' and p_consent_value and (v_contact is null or btrim(v_contact) = '') then
    raise exception 'cannot opt in to SMS marketing without a phone number on file'
      using errcode = 'check_violation';
  end if;

  -- Append the evidence row
  insert into public.consent_log (
    person_id, auth_user_id, club_id, consent_type, consent_value,
    consent_text, contact_value, source, terms_version, privacy_version,
    user_agent, ip_address
  ) values (
    v_person_id, v_auth_user_id, p_club_id, p_consent_type, p_consent_value,
    p_consent_text, coalesce(v_contact, ''), p_source, p_terms_version, p_privacy_version,
    p_user_agent, p_ip_address
  )
  returning id into v_log_id;

  -- Update the mirror column on people for fast send-time checks
  if p_consent_type = 'email_marketing' then
    update public.people
       set email_marketing_opt_in    = p_consent_value,
           email_marketing_opt_in_at = now()
     where id = v_person_id;
  elsif p_consent_type = 'sms_marketing' then
    update public.people
       set sms_marketing_opt_in    = p_consent_value,
           sms_marketing_opt_in_at = now()
     where id = v_person_id;
  elsif p_consent_type = 'age_18_plus' then
    -- Age affirmation only flips to true; never back to false.
    -- If you're under 18, you don't have an account.
    if p_consent_value then
      update public.people
         set age_affirmed_18    = true,
             age_affirmed_18_at = coalesce(age_affirmed_18_at, now())
       where id = v_person_id;
    end if;
  end if;
  -- terms_and_privacy mirror lives on members (per-club, pre-existing pattern);
  -- the caller updates members.terms_accepted_version + terms_accepted_at after
  -- record_consent succeeds.

  return v_log_id;
end;
$$;

revoke all on function public.record_consent(text, boolean, text, text, uuid, integer, integer, text, inet) from public;
grant execute on function public.record_consent(text, boolean, text, text, uuid, integer, integer, text, inet) to authenticated;

comment on function public.record_consent is
  'Single entry point for consent writes. Appends to consent_log + updates mirror column on people. '
  'SMS opt-in requires phone on file. age_18_plus is one-way (never flips to false).';

commit;
