// provision-club-domain — adds a slug.<root>.com hostname as a
// Custom Domain on the the-grounds Cloudflare Pages project. CF
// auto-creates the matching DNS Worker route + TLS cert when the
// domain's DNS zone is managed by Cloudflare (ours is).
//
// v0.7.7: every attempt (success and failure) is logged to
// club_provision_log via the service role client so super_admin has
// a durable audit trail visible at Platform → Provision Log.
//
// Required Supabase secrets (Edge Functions -> Manage secrets):
//   CLOUDFLARE_API_TOKEN     — token w/ Account.Cloudflare Pages.Edit
//   CLOUDFLARE_ACCOUNT_ID    — account that owns the Pages project
//   CLOUDFLARE_PAGES_PROJECT — name of the project (default: "the-grounds")
//   CLOUDFLARE_ROOT_DOMAIN   — apex domain (default: "groundslive.com")
//
// Auth: requires a super_admin JWT. We re-check inside the function
// body (defense in depth) so a stolen anon token can't provision
// arbitrary subdomains even if Supabase's verify_jwt were ever bypassed.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CF_API_TOKEN     = Deno.env.get('CLOUDFLARE_API_TOKEN');
const CF_ACCOUNT_ID    = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
const CF_PAGES_PROJECT = Deno.env.get('CLOUDFLARE_PAGES_PROJECT') ?? 'the-grounds';
const CF_ROOT_DOMAIN   = Deno.env.get('CLOUDFLARE_ROOT_DOMAIN') ?? 'groundslive.com';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

// Best-effort log writer. Always uses the service role client (bypasses
// RLS so the function can write even if the calling user lacks INSERT
// rights). Returns void; logging failures don't break the response.
// If SUPABASE_SERVICE_ROLE_KEY isn't set, logging silently no-ops with
// a console warning — we never want logging to fail the provision call.
async function logAttempt(row: {
  slug: string;
  attempted_by: string | null;
  ok: boolean;
  hostname?: string | null;
  already_existed?: boolean;
  status_code?: number | null;
  error?: string | null;
  cf_response?: unknown;
  club_id?: string | null;
}) {
  if (!SUPABASE_SERVICE_ROLE) {
    console.warn('[provision-log] SUPABASE_SERVICE_ROLE_KEY missing — skipping audit row');
    return;
  }
  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    await admin.from('club_provision_log').insert({
      slug:            row.slug,
      attempted_by:    row.attempted_by,
      ok:              row.ok,
      hostname:        row.hostname ?? null,
      already_existed: !!row.already_existed,
      status_code:     row.status_code ?? null,
      error:           row.error ?? null,
      cf_response:     row.cf_response ?? null,
      club_id:         row.club_id ?? null,
    });
  } catch (e) {
    console.warn('[provision-log] insert failed:', e instanceof Error ? e.message : e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  // Captured early so we can include them in any log row, even on
  // an early auth/config failure. body parsing happens later.
  let attempted_by: string | null = null;
  let slug = '';
  let club_id: string | null = null;

  try {
    // ── Auth: super_admin only.
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ ok: false, error: 'Missing Authorization' }, 401);
    }
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ ok: false, error: 'Invalid token' }, 401);
    }
    attempted_by = userData.user.id;
    const { data: roleRows, error: roleErr } = await supa
      .from('user_roles').select('role').eq('user_id', userData.user.id);
    if (roleErr) {
      return json({ ok: false, error: 'Could not verify role: ' + roleErr.message }, 500);
    }
    const isSuper = (roleRows ?? []).some((r: { role: string }) => r.role === 'super_admin');
    if (!isSuper) {
      return json({ ok: false, error: 'super_admin required' }, 403);
    }

    // ── Cloudflare config sanity.
    if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
      const errMsg = 'Cloudflare automation not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in Supabase Edge Function secrets.';
      await logAttempt({ slug, attempted_by, ok: false, error: errMsg });
      return json({ ok: false, error: errMsg, reason: 'config' }, 500);
    }

    // ── Validate slug + optional club_id.
    const body = await req.json().catch(() => ({}));
    slug = String(body?.slug ?? '').trim().toLowerCase();
    club_id = body?.club_id ? String(body.club_id) : null;
    if (!/^[a-z0-9]([a-z0-9-]{0,28}[a-z0-9])?$/.test(slug)) {
      const errMsg = 'Invalid slug — must be 2–30 chars, lowercase alphanumeric + hyphen.';
      await logAttempt({ slug, attempted_by, ok: false, error: errMsg, club_id });
      return json({ ok: false, error: errMsg }, 400);
    }
    const hostname = `${slug}.${CF_ROOT_DOMAIN}`;

    // ── Call Cloudflare Pages Custom Domain API.
    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT}/domains`;
    const cfRes = await fetch(cfUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ name: hostname }),
    });
    const cfBody = await cfRes.json().catch(() => ({}));

    if (!cfRes.ok) {
      const firstErr = cfBody?.errors?.[0] ?? {};
      const msg = String(firstErr.message ?? 'Cloudflare API error');
      // Idempotent — 409 / "already exists" still counts as success.
      if (cfRes.status === 409 || /already exists/i.test(msg)) {
        await logAttempt({
          slug, attempted_by, club_id, ok: true, hostname,
          already_existed: true, status_code: cfRes.status, cf_response: cfBody,
        });
        return json({ ok: true, hostname, alreadyExisted: true });
      }
      await logAttempt({
        slug, attempted_by, club_id, ok: false, hostname,
        status_code: cfRes.status, error: `Cloudflare API: ${msg}`,
        cf_response: cfBody,
      });
      return json({ ok: false, error: `Cloudflare API: ${msg}`, status: cfRes.status, cf: cfBody }, 502);
    }

    await logAttempt({
      slug, attempted_by, club_id, ok: true, hostname,
      status_code: cfRes.status, cf_response: cfBody,
    });
    return json({ ok: true, hostname, cf: cfBody });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : 'Unknown error';
    await logAttempt({ slug, attempted_by, club_id, ok: false, error: errMsg });
    return json({ ok: false, error: errMsg }, 500);
  }
});
