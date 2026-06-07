// guest-register v11 — v0.14.13. Hardens the magic-link redirect
// to ALWAYS use the canonical {slug}.{root}/ URL, ignoring whatever
// the client posted as `redirect_to`. Fixes a bug where a guest
// filling out the form on an old workers.dev URL got their magic
// link sent back to that URL (which served 'nothing here yet').

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ROOT_DOMAIN           = Deno.env.get('CLOUDFLARE_ROOT_DOMAIN') ?? 'groundslive.com';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function validEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function validZip(s: string): boolean {
  const t = s.trim().toUpperCase().replace(/\s+/g, '');
  if (/^\d{5}(-?\d{4})?$/.test(t)) return true;
  if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(t)) return true;
  return false;
}
function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
function base64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function getSigningKey(): Promise<CryptoKey> {
  let secretMaterial: ArrayBuffer;
  const explicit = Deno.env.get('GUEST_QR_SIGNING_SECRET');
  if (explicit) {
    secretMaterial = new TextEncoder().encode(explicit).buffer;
  } else {
    const seed = new TextEncoder().encode(SUPABASE_SERVICE_ROLE + ':guest-qr-v1');
    secretMaterial = await crypto.subtle.digest('SHA-256', seed);
  }
  return await crypto.subtle.importKey('raw', secretMaterial, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
async function expectedSig(message: string): Promise<string> {
  const key = await getSigningKey();
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return base64url(sig);
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function verifyMemberToken(token: string, clubId: string): Promise<string | null> {
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const memberId = token.slice(0, dot);
  const sig      = token.slice(dot + 1);
  if (!looksLikeUuid(memberId)) return null;
  if (!sig || sig.length < 16)  return null;
  const expected = await expectedSig(`${clubId}:${memberId}`);
  return safeEqual(expected, sig) ? memberId : null;
}
async function verifyClubhouseToken(token: string, clubId: string, version: number): Promise<boolean> {
  if (!token || token.length < 16) return false;
  const expected = await expectedSig(`${clubId}:clubhouse:${version}`);
  return safeEqual(expected, token);
}

const TIER_RANK: Record<string, number> = { basic: 0, standard: 1, pro: 2 };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  try {
    const body = await req.json().catch(() => ({}));
    const {
      club_slug,
      name,
      email,
      phone,
      zip,
      referring_member_id,
      ref_token,
      clubhouse_token,
      visit_type,
      check_in_method,
    } = body || {};
    // v0.14.13: client-supplied `redirect_to` is now IGNORED. We always
    // use the canonical {slug}.{ROOT_DOMAIN}/ URL we look up server-side.
    // Was a real attack vector / footgun: a guest filling the form on an
    // old workers.dev URL got their magic link sent back to that URL
    // (which served 'nothing here yet').

    if (!club_slug || typeof club_slug !== 'string') {
      return json({ ok: false, error: 'Missing club_slug' }, 400);
    }
    if (!name || String(name).trim().length < 2) {
      return json({ ok: false, error: 'Name is required' }, 400);
    }
    if (!email || !validEmail(String(email).trim())) {
      return json({ ok: false, error: 'A valid email is required' }, 400);
    }
    if (!zip || !validZip(String(zip))) {
      return json({ ok: false, error: 'A valid ZIP / postal code is required' }, 400);
    }

    const { data: club } = await admin
      .from('clubs')
      .select('id, name, slug, subscription_tier, feature_flags, feature_flags_locked, timezone, guest_visit_duration_days, guest_auto_approve, guest_phone_collection, guest_default_access_level, clubhouse_qr_version, clubhouse_qr_visit_type')
      .eq('slug', String(club_slug).toLowerCase().trim())
      .maybeSingle();

    if (!club) return json({ ok: false, error: 'Club not found' }, 404);

    const lock     = (club.feature_flags_locked || {}) as Record<string, boolean>;
    const override = (club.feature_flags        || {}) as Record<string, boolean>;
    const tierOk   = (TIER_RANK[club.subscription_tier] ?? 0) >= 1;
    let flagOn = false;
    if (Object.prototype.hasOwnProperty.call(lock, 'guest_registration')) {
      flagOn = !!lock.guest_registration;
    } else if (Object.prototype.hasOwnProperty.call(override, 'guest_registration')) {
      flagOn = !!override.guest_registration;
    }
    if (!tierOk || !flagOn) {
      return json({ ok: false, error: 'Guest registration is not enabled at this club' }, 403);
    }

    const phoneSetting = (club.guest_phone_collection || 'off') as 'off' | 'optional' | 'required';
    if (phoneSetting === 'required' && (!phone || String(phone).trim().length < 5)) {
      return json({ ok: false, error: 'Phone number is required at this club' }, 400);
    }
    const phoneToStore = phoneSetting === 'off' ? null : (phone ? String(phone).trim() || null : null);

    let resolvedMemberId: string | null = null;
    let clubhouseValidated = false;

    if (typeof ref_token === 'string' && ref_token.length > 0) {
      resolvedMemberId = await verifyMemberToken(ref_token, club.id);
      if (!resolvedMemberId) {
        return json({ ok: false, error: 'Invalid invite token — this QR may have been tampered with or generated for a different club.' }, 400);
      }
      const { data: mRow } = await admin
        .from('members').select('id, club_id').eq('id', resolvedMemberId).eq('club_id', club.id).maybeSingle();
      if (!mRow) resolvedMemberId = null;
    } else if (typeof clubhouse_token === 'string' && clubhouse_token.length > 0) {
      const ok = await verifyClubhouseToken(clubhouse_token, club.id, club.clubhouse_qr_version ?? 1);
      if (!ok) {
        return json({ ok: false, error: 'This clubhouse QR is no longer valid — ask a staff member for a current one.' }, 400);
      }
      clubhouseValidated = true;
    } else if (typeof referring_member_id === 'string' && looksLikeUuid(referring_member_id)) {
      const { data: mRow } = await admin
        .from('members').select('id, club_id').eq('id', referring_member_id).eq('club_id', club.id).maybeSingle();
      resolvedMemberId = mRow?.id ?? null;
    }

    const tz = club.timezone || 'America/Chicago';
    const todayLocal = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

    let expires_at: string | null = null;
    if (club.guest_visit_duration_days != null) {
      const days = Math.max(1, club.guest_visit_duration_days);
      const [y, m, d] = todayLocal.split('-').map(Number);
      const expiry = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
      expiry.setUTCDate(expiry.getUTCDate() + (days - 1));
      expiry.setUTCHours(23, 59, 59, 999);
      expires_at = expiry.toISOString();
    }

    let vType: string;
    if (typeof visit_type === 'string' && visit_type.length > 0) {
      vType = visit_type;
    } else if (clubhouseValidated) {
      vType = club.clubhouse_qr_visit_type || 'public_play';
    } else if (resolvedMemberId) {
      vType = 'member_guest';
    } else {
      vType = 'public_play';
    }

    const accessLevel = club.guest_default_access_level || 'read_only';
    const checkInMethod = (typeof check_in_method === 'string')
      ? check_in_method
      : (resolvedMemberId ? 'member_qr' : (clubhouseValidated ? 'clubhouse_qr' : 'staff_manual'));

    const { data: guest, error: gErr } = await admin
      .from('guests')
      .upsert(
        {
          club_id: club.id,
          name: String(name).trim(),
          email: String(email).trim().toLowerCase(),
          phone: phoneToStore,
          zip: String(zip).trim().toUpperCase(),
          referring_member_id: resolvedMemberId,
          visit_type: vType,
          visit_date: todayLocal,
          access_level: accessLevel,
          status: 'pending_authentication',
          expires_at,
          terms_accepted_at: new Date().toISOString(),
        },
        { onConflict: 'club_id,email' },
      )
      .select('id, club_id, name, email, status, access_level, expires_at')
      .single();

    if (gErr) {
      return json({ ok: false, error: `Could not register: ${gErr.message}` }, 500);
    }

    await admin.from('guest_visits').insert({
      guest_id: guest.id,
      club_id: club.id,
      visit_date: todayLocal,
      visit_type: vType,
      access_level: accessLevel,
      referring_member_id: resolvedMemberId,
      check_in_method: checkInMethod,
    });

    // v0.14.13: ALWAYS use the canonical URL. Never trust the client.
    const canonicalRedirect = `https://${club.slug}.${ROOT_DOMAIN}/`;

    let otpSent = false;
    let otpError: string | null = null;
    try {
      const emailLower = String(email).trim().toLowerCase();
      const { error: otpErr } = await admin.auth.signInWithOtp({
        email: emailLower,
        options: {
          emailRedirectTo: canonicalRedirect,
        },
      });
      if (otpErr) {
        otpError = otpErr.message;
      } else {
        otpSent = true;
      }
    } catch (e) {
      otpError = e instanceof Error ? e.message : 'Unknown OTP error';
    }

    return json({
      ok: true,
      guest_id: guest.id,
      club_name: club.name,
      status: guest.status,
      access_level: guest.access_level,
      expires_at: guest.expires_at,
      otp_sent: otpSent,
      otp_error: otpError,
      redirect_used: canonicalRedirect,
    });
  } catch (e) {
    return json({
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    }, 500);
  }
});
