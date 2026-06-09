-- Phase 19: QR-code club onboarding.
--
-- A unified "redemption code" system that powers four flavors of
-- onboarding. The prefix on the code tells the system what to do:
--
--   C-XXXXX  → Create a brand-new club. The redeemer becomes
--              club_manager of the new club. Super_admin generates.
--   J-XXXXX  → Join an existing club as a member. Club_manager
--              generates these (e.g. for golf-ball QR campaigns).
--   S-XXXXX  → Join an existing club as staff (reserved for v2).
--   G-XXXXX  → Day-pass guest (reserved for v2).
--
-- This migration ships C + J. S + G are scaffolded in the schema
-- (check constraints accept them) but the consume_code RPC returns
-- 'unsupported_prefix' for now.

-- ─────────────────────────────────────────────────────────────────
-- 1. The pending_codes table
-- ─────────────────────────────────────────────────────────────────
create table public.pending_codes (
  id uuid primary key default gen_random_uuid(),

  prefix char(1) not null check (prefix in ('C', 'J', 'S', 'G')),
  code text not null unique check (code = upper(code)),

  -- For C-codes: the spec for the NEW club we'll create on redemption
  spec_club_name text,
  spec_club_slug text,

  -- For J/S/G-codes: which existing club to join
  club_id uuid references public.clubs(id) on delete cascade,

  -- Role granted on redemption
  intended_role text check (intended_role in ('club_manager', 'club_admin', 'member', 'guest')),
  permissions jsonb default '{}'::jsonb,

  -- Redemption limits
  max_redemptions int default 1,  -- NULL = unlimited
  redemption_count int not null default 0,

  -- Validity window + wrong-attempts lockout (per-code)
  expires_at timestamptz,
  attempt_count int not null default 0,

  -- Optional: lock the code to a specific email (extra security for high-stakes C-codes)
  email_lock text,

  -- Audit
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  notes text,

  -- Last redemption snapshot
  last_redeemed_at timestamptz,
  last_redeemed_by_user_id uuid references auth.users(id),

  -- For C-codes: the club row that ended up created (or for single-shot J: the club joined)
  target_club_id uuid references public.clubs(id),

  -- Integrity
  constraint pending_codes_c_needs_spec check (
    prefix <> 'C' or (spec_club_name is not null and spec_club_slug is not null)
  ),
  constraint pending_codes_jsg_needs_club check (
    prefix not in ('J', 'S', 'G') or club_id is not null
  )
);

create index idx_pending_codes_club_id on public.pending_codes(club_id)
  where club_id is not null;
create index idx_pending_codes_active on public.pending_codes(revoked_at)
  where revoked_at is null;

alter table public.pending_codes enable row level security;

-- ─────────────────────────────────────────────────────────────────
-- 2. RLS policies
-- ─────────────────────────────────────────────────────────────────
-- Super_admin: full access
create policy "super_admin reads codes" on public.pending_codes
  for select using (public.is_super_admin());
create policy "super_admin inserts codes" on public.pending_codes
  for insert with check (public.is_super_admin());
create policy "super_admin updates codes" on public.pending_codes
  for update using (public.is_super_admin()) with check (public.is_super_admin());
create policy "super_admin deletes codes" on public.pending_codes
  for delete using (public.is_super_admin());

-- Club_manager: full access for codes scoped to THEIR club (J/S/G only)
create policy "club_manager reads own codes" on public.pending_codes
  for select using (
    club_id is not null
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.club_id = pending_codes.club_id
        and ur.role = 'club_manager'
    )
  );
create policy "club_manager inserts own codes" on public.pending_codes
  for insert with check (
    prefix in ('J', 'S', 'G')
    and club_id is not null
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.club_id = pending_codes.club_id
        and ur.role = 'club_manager'
    )
  );
create policy "club_manager updates own codes" on public.pending_codes
  for update using (
    club_id is not null
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.club_id = pending_codes.club_id
        and ur.role = 'club_manager'
    )
  );

-- ─────────────────────────────────────────────────────────────────
-- 3. Public marketing landing: is_public_listed flag + brand RPC
-- ─────────────────────────────────────────────────────────────────
alter table public.clubs add column if not exists is_public_listed boolean not null default true;

-- Anon-callable RPC. Returns ONLY the safe brand fields. RLS bypassed
-- (security definer) but the function itself only exposes 8 columns
-- worth of public-by-design data — no member counts, no contact info.
create or replace function public.get_public_club_brand(p_slug text)
returns table(
  name text,
  slug text,
  logo_url text,
  hero_image_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  tagline text
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select name, slug, logo_url, hero_image_url,
         primary_color, secondary_color, accent_color, tagline
  from public.clubs
  where slug = lower(p_slug)
    and deleted_at is null
    and is_public_listed = true
  limit 1;
$$;

revoke all on function public.get_public_club_brand(text) from public;
grant execute on function public.get_public_club_brand(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────
-- 4. Code generation helper
-- ─────────────────────────────────────────────────────────────────
create or replace function public.generate_pending_code(p_prefix char(1))
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt int := 0;
  v_digits int;
  v_code text;
begin
  if p_prefix not in ('C', 'J', 'S', 'G') then
    raise exception 'Invalid prefix: %', p_prefix;
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_digits := floor(random() * 100000)::int;  -- 0..99999
    v_code := upper(p_prefix) || '-' || lpad(v_digits::text, 5, '0');
    if not exists (select 1 from public.pending_codes where code = v_code) then
      return v_code;
    end if;
    if v_attempt >= 10 then
      raise exception 'Failed to generate unique code after 10 attempts';
    end if;
  end loop;
end;
$$;

revoke all on function public.generate_pending_code(char(1)) from public;
grant execute on function public.generate_pending_code(char(1)) to authenticated;

-- ─────────────────────────────────────────────────────────────────
-- 5. Pre-auth validation (called by Edge Function before magic link)
-- ─────────────────────────────────────────────────────────────────
create or replace function public.validate_code(p_code text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.pending_codes%rowtype;
  v_normalized_code text := upper(trim(p_code));
  v_normalized_email text := lower(trim(p_email));
begin
  select * into v_row from public.pending_codes where code = v_normalized_code;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if v_row.revoked_at is not null then
    return jsonb_build_object('ok', false, 'error', 'revoked');
  end if;
  if v_row.expires_at is not null and v_row.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if v_row.max_redemptions is not null and v_row.redemption_count >= v_row.max_redemptions then
    return jsonb_build_object('ok', false, 'error', 'exhausted');
  end if;
  if v_row.attempt_count >= 10 then
    return jsonb_build_object('ok', false, 'error', 'locked');
  end if;
  if v_row.email_lock is not null and lower(v_row.email_lock) <> v_normalized_email then
    update public.pending_codes set attempt_count = attempt_count + 1 where id = v_row.id;
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  return jsonb_build_object(
    'ok', true,
    'prefix', v_row.prefix,
    'club_id', v_row.club_id,
    'spec_club_name', v_row.spec_club_name,
    'spec_club_slug', v_row.spec_club_slug,
    'intended_role', v_row.intended_role
  );
end;
$$;

revoke all on function public.validate_code(text, text) from public;
grant execute on function public.validate_code(text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────
-- 6. Post-auth consumption (called by Edge Function after magic link)
-- ─────────────────────────────────────────────────────────────────
create or replace function public.consume_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_row public.pending_codes%rowtype;
  v_normalized_code text := upper(trim(p_code));
  v_new_club_id uuid;
  v_target_club_id uuid;
  v_target_slug text;
  v_person_id uuid;
  v_root_domain text := 'groundslive.com';
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select email into v_email from auth.users where id = v_user_id;

  -- Lock the row to prevent races on multi-use codes
  select * into v_row from public.pending_codes where code = v_normalized_code for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if v_row.revoked_at is not null then
    return jsonb_build_object('ok', false, 'error', 'revoked');
  end if;
  if v_row.expires_at is not null and v_row.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if v_row.max_redemptions is not null and v_row.redemption_count >= v_row.max_redemptions then
    return jsonb_build_object('ok', false, 'error', 'exhausted');
  end if;
  if v_row.email_lock is not null and lower(v_row.email_lock) <> lower(v_email) then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  -- Make sure their people row exists + auth_user_id is stamped
  insert into public.people (auth_user_id, email)
  values (v_user_id, v_email)
  on conflict (auth_user_id) do nothing;
  select id into v_person_id from public.people where auth_user_id = v_user_id;

  -- Branch by prefix
  if v_row.prefix = 'C' then
    -- C-code: create a new club and grant club_manager
    if exists (select 1 from public.clubs where slug = lower(v_row.spec_club_slug) and deleted_at is null) then
      return jsonb_build_object('ok', false, 'error', 'slug_taken');
    end if;

    insert into public.clubs (name, slug, subscription_tier, is_public_listed)
    values (v_row.spec_club_name, lower(v_row.spec_club_slug), 'basic', true)
    returning id into v_new_club_id;

    insert into public.user_roles (user_id, club_id, role)
    values (v_user_id, v_new_club_id, 'club_manager');

    v_target_club_id := v_new_club_id;
    v_target_slug := lower(v_row.spec_club_slug);

  elsif v_row.prefix = 'J' then
    -- J-code: join the existing club as a member
    if not exists (
      select 1 from public.members
      where club_id = v_row.club_id and person_id = v_person_id
    ) then
      insert into public.members (club_id, user_id, person_id, membership_number, status)
      values (
        v_row.club_id, v_user_id, v_person_id,
        'M-' || substr(v_user_id::text, 1, 8),
        'pending'
      );
    end if;
    v_target_club_id := v_row.club_id;
    select slug into v_target_slug from public.clubs where id = v_row.club_id;

  else
    return jsonb_build_object('ok', false, 'error', 'unsupported_prefix');
  end if;

  -- Bump redemption count + audit
  update public.pending_codes
     set redemption_count = redemption_count + 1,
         last_redeemed_at = now(),
         last_redeemed_by_user_id = v_user_id,
         target_club_id = coalesce(target_club_id, v_target_club_id)
   where id = v_row.id;

  return jsonb_build_object(
    'ok', true,
    'club_id', v_target_club_id,
    'slug', v_target_slug,
    'redirect', 'https://' || v_target_slug || '.' || v_root_domain || '/'
  );
end;
$$;

revoke all on function public.consume_code(text) from public;
grant execute on function public.consume_code(text) to authenticated;

notify pgrst, 'reload schema';
