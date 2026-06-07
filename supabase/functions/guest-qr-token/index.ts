// guest-qr-token — mints signed URLs for guest check-in QRs.
// v0.8.3 introduced this for member-linked QRs; v0.8.4 extends it
// to handle the per-club clubhouse QR (no referring member, gated
// by manager role).
//
// Modes (via request body `mode`):
//   - 'member'    (default): caller must have a members row; signs
//                  `${club_id}:${member_id}` and returns the URL with
//                  `ref=<member_id>.<sig>&via=member_qr`.
//   - 'clubhouse': caller must be club_manager or club_admin or
//                  super_admin; signs `${club_id}:clubhouse:${version}`
//                  and returns the URL with
//                  `via=clubhouse_qr&token=<sig>`. Bumping
//                  clubs.clubhouse_qr_version revokes all prior QRs.
//
// Token shape on the wire stays consistent across both modes:
//   member:    ref=<member_id>.<sig>
//   clubhouse: token=<sig> (no member id prefix — it's not member-bound)
//
// Key derivation matches guest-register exactly: prefer
// GUEST_QR_SIGNING_SECRET env var, fall back to SHA-256 of
// SUPABASE_SERVICE_ROLE_KEY + ':guest-qr-v1'.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ROOT_DOMAIN           = Deno.env.get('CLOUDFLARE_ROOT_DOMAIN') ?? 'groundslive.com';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
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
  return await crypto.subtle.importKey(
    'raw',
    secretMaterial,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function sign(message: string): Promise<string> {
  const key = await getSigningKey();
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return base64url(sig);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    // ── Auth
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ ok: false, error: 'Missing Authorization' }, 401);
    }
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: uErr } = await supa.auth.getUser();
    if (uErr || !u?.user) return json({ ok: false, error: 'Invalid token' }, 401);

    const body = (req.method === 'POST' ? await req.json().catch(() => ({})) : {}) as Record<string, unknown>;
    const mode = (typeof body.mode === 'string' ? body.mode : 'member') as 'member' | 'clubhouse';

    if (mode === 'clubhouse') {
      // ── Clubhouse QR: manager (or super_admin) of the club. They
      //    must have a user_roles row pointing at the club, OR be a
      //    super_admin (club_id is null).
      const requestedClubId = typeof body.club_id === 'string' ? body.club_id : null;

      // Determine the target club. If body.club_id is set, verify the
      // caller has staff access to that club. Otherwise infer from
      // their staff row.
      const { data: roleRows, error: rErr } = await supa
        .from('user_roles')
        .select('role, club_id')
        .eq('user_id', u.user.id);
      if (rErr) return json({ ok: false, error: rErr.message }, 500);

      const isSuper = (roleRows ?? []).some(r => r.role === 'super_admin');
      let targetClubId: string | null = null;
      if (requestedClubId) {
        const hasClubStaff = (roleRows ?? []).some(
          r => r.club_id === requestedClubId && (r.role === 'club_manager' || r.role === 'club_admin'),
        );
        if (!isSuper && !hasClubStaff) return json({ ok: false, error: 'Not authorized for this club' }, 403);
        targetClubId = requestedClubId;
      } else {
        const staffRow = (roleRows ?? []).find(r => r.club_id && (r.role === 'club_manager' || r.role === 'club_admin'));
        if (!staffRow) return json({ ok: false, error: 'Staff role required' }, 403);
        targetClubId = staffRow.club_id!;
      }

      // Fetch the club via service role to read clubhouse_qr_version
      // and slug regardless of club-staff RLS (clubs is public-readable
      // anyway but service role is safe + uniform across modes).
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
      const { data: club } = await admin
        .from('clubs')
        .select('id, slug, name, clubhouse_qr_version')
        .eq('id', targetClubId)
        .maybeSingle();
      if (!club) return json({ ok: false, error: 'Club not found' }, 404);

      const version   = club.clubhouse_qr_version ?? 1;
      const message   = `${club.id}:clubhouse:${version}`;
      const signature = await sign(message);
      const hostname  = `${club.slug}.${ROOT_DOMAIN}`;
      const url = `https://${hostname}/guest/${club.slug}?token=${encodeURIComponent(signature)}&via=clubhouse_qr`;

      return json({
        ok: true,
        mode: 'clubhouse',
        url,
        token: signature,
        version,
        hostname,
        slug: club.slug,
        club_id: club.id,
      });
    }

    // ── Member mode (default)
    const { data: member, error: mErr } = await supa
      .from('members')
      .select('id, club_id, name, clubs(id, slug, name)')
      .eq('user_id', u.user.id)
      .maybeSingle();
    if (mErr) return json({ ok: false, error: mErr.message }, 500);
    if (!member) return json({ ok: false, error: 'Members only' }, 403);

    const clubId   = member.club_id;
    const memberId = member.id;
    const slug     = (member.clubs as { slug?: string })?.slug;
    if (!slug) return json({ ok: false, error: 'Club has no slug' }, 500);

    const message   = `${clubId}:${memberId}`;
    const signature = await sign(message);
    const token     = `${memberId}.${signature}`;

    const hostname = `${slug}.${ROOT_DOMAIN}`;
    const url = `https://${hostname}/guest/${slug}?ref=${encodeURIComponent(token)}&via=member_qr`;

    return json({
      ok: true,
      mode: 'member',
      url,
      token,
      hostname,
      slug,
      member_id: memberId,
    });
  } catch (e) {
    return json({
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    }, 500);
  }
});
