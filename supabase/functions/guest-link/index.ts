// guest-link — link a freshly-authenticated guest to their guests row.
//
// When a guest registers (v0.8.1), we write the guests row with
// user_id=NULL since they haven't clicked the magic link yet. When they
// DO click the magic link, Supabase Auth creates / refreshes an
// auth.users row, and the client gets a session. This Edge Function is
// what then links the session to the guests row(s) for that email.
//
// verify_jwt: true — the magic-link click produces a valid JWT, so we
// trust auth.uid() in this function and use it as the link target.
//
// One auth user can match multiple guests rows (same email across
// different clubs). We link ALL matching rows so a guest who's been
// invited to two clubs gets both rows linked on a single login.
//
// Idempotent — calling repeatedly with the same user_id is safe; we
// only update rows where user_id IS NULL or already matches.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  try {
    // ── Authenticate the caller using their JWT (the magic-link auth).
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ ok: false, error: 'Missing Authorization' }, 401);
    }
    const user = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: uErr } = await user.auth.getUser();
    if (uErr || !u?.user) {
      return json({ ok: false, error: 'Invalid token' }, 401);
    }
    const userId = u.user.id;
    const userEmail = (u.user.email || '').toLowerCase();
    if (!userEmail) {
      return json({ ok: false, error: 'No email on this auth user' }, 400);
    }

    // ── Use service-role client to update guests rows that match the
    //    email and have user_id NULL. Service role bypasses RLS so we
    //    can link without exposing an UPDATE policy to clients.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    // Find all matching guests rows (across clubs) for this email
    // where user_id is null OR already equals this user_id (idempotent).
    const { data: guests, error: selErr } = await admin
      .from('guests')
      .select('id, club_id, user_id, status')
      .eq('email', userEmail);
    if (selErr) {
      return json({ ok: false, error: `Lookup failed: ${selErr.message}` }, 500);
    }
    if (!guests || guests.length === 0) {
      return json({ ok: true, linked: 0, note: 'no guests rows match this email' });
    }

    // Filter to rows that need linking (user_id is null) OR confirm
    // already linked (user_id == userId). We never overwrite a
    // user_id that's already pointing at a DIFFERENT auth user —
    // that'd be a security hole (email-rotation hijack).
    const toLink = guests.filter(g => !g.user_id);
    const conflicts = guests.filter(g => g.user_id && g.user_id !== userId);
    if (conflicts.length > 0 && toLink.length === 0) {
      // Email belongs to a different user already — nothing to do, but
      // surface so the client can show a useful error.
      return json({
        ok: false,
        error: 'This email is already linked to a different account at this club. Contact the club for help.',
      }, 409);
    }

    let linked = 0;
    if (toLink.length > 0) {
      const ids = toLink.map(g => g.id);
      const { error: upErr } = await admin
        .from('guests')
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (upErr) {
        return json({ ok: false, error: `Link failed: ${upErr.message}` }, 500);
      }
      linked = toLink.length;
    }

    return json({ ok: true, linked, total_for_email: guests.length });
  } catch (e) {
    return json({
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    }, 500);
  }
});
