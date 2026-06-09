// redeem-code v1 — Phase 19 (v0.17.0) QR onboarding redemption.
//
// One Edge Function, two stages:
//
//   POST { stage: "request", code, email }
//     → Pre-auth. Validates the code via validate_code RPC.
//       If valid, sends a magic link to the supplied email
//       pointing at https://<root>/code/finish?code=<code>.
//       Returns { ok: true } on success (we deliberately do NOT
//       leak whether the code or email was invalid in the
//       error message — generic "Couldn't send" so attackers
//       can't probe for valid codes).
//
//   POST { stage: "consume", code }   (JWT required)
//     → Post-auth. Calls consume_code RPC which atomically:
//         · for C-codes: creates a new club + grants club_manager
//         · for J-codes: creates a pending member at the club
//         · increments redemption count + updates audit fields
//       Returns { ok: true, redirect } for the front-end to navigate to.
//
// Rate limiting (same rate_limit_events table from Phase 18):
//   - redeem_code_request_ip:    10 / 10 min   (cheap stop on bots)
//   - redeem_code_request_email:  5 / 1 hour   (anti-magic-link-spam)
//   - redeem_code_consume_ip:    20 / 1 hour   (more lenient — they have a magic link)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, preflight } from '../_shared/cors.ts';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ROOT_DOMAIN           = Deno.env.get('CLOUDFLARE_ROOT_DOMAIN') ?? 'groundslive.com';

function json(req: Request, payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  });
}

function clientIp(req: Request): string {
  const cf  = req.headers.get('cf-connecting-ip');
  if (cf && cf.length > 0) return cf.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff && xff.length > 0) return xff.split(',')[0]!.trim();
  return 'unknown';
}

function validEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Code format: prefix + dash + 5 digits, e.g. "C-70332"
function normalizeCode(raw: string): string | null {
  const c = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!/^[CJSG]-\d{5}$/.test(c)) return null;
  return c;
}

async function rateLimit(admin: ReturnType<typeof createClient>, bucket: string, key: string, windowSecs: number, maxAttempts: number) {
  const { data: ok, error } = await admin.rpc('check_and_record_rate_limit', {
    p_bucket: bucket,
    p_key: key,
    p_window_secs: windowSecs,
    p_max_attempts: maxAttempts,
  });
  if (error) {
    console.warn(`[redeem-code] rate-limit ${bucket} infra error:`, error.message);
    return true; // fail-open on infra error
  }
  return ok !== false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight(req);
  if (req.method !== 'POST') {
    return json(req, { ok: false, error: 'Method not allowed' }, 405);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const stage = String(body.stage || '');
    const codeRaw = body.code ?? '';
    const code = normalizeCode(String(codeRaw));

    if (!code) {
      return json(req, { ok: false, error: 'Invalid code format' }, 400);
    }

    // ─────────────────────────────────────────────────────────────
    // STAGE 1: REQUEST — pre-auth, send magic link
    // ─────────────────────────────────────────────────────────────
    if (stage === 'request') {
      const emailRaw = String(body.email || '').trim().toLowerCase();
      if (!emailRaw || !validEmail(emailRaw)) {
        return json(req, { ok: false, error: 'Valid email required' }, 400);
      }

      // Rate limits (IP first, then email)
      const ip = clientIp(req);
      if (!(await rateLimit(admin, 'redeem_code_request_ip', ip, 600, 10))) {
        return json(req, { ok: false, error: 'Too many attempts from this network. Try again in a few minutes.' }, 429);
      }
      if (!(await rateLimit(admin, 'redeem_code_request_email', emailRaw, 3600, 5))) {
        return json(req, { ok: false, error: 'Too many attempts for this email. Try again in an hour.' }, 429);
      }

      // Validate the code via RPC. Returns { ok, error, prefix, ... }.
      const { data: validation, error: vErr } = await admin.rpc('validate_code', {
        p_code: code,
        p_email: emailRaw,
      });
      if (vErr) {
        console.error('[redeem-code] validate_code RPC failed:', vErr);
        return json(req, { ok: false, error: 'Could not validate code. Try again later.' }, 500);
      }
      if (!validation?.ok) {
        // Don't echo specific reasons — generic to prevent probing.
        return json(req, { ok: false, error: 'Invalid or expired code.' }, 400);
      }

      // Send magic link. Redirect to a single canonical "finish" URL
      // on the root domain; consume_code returns the real club URL
      // after the magic-link auth completes.
      const finishUrl = `https://${ROOT_DOMAIN}/code/finish?code=${encodeURIComponent(code)}`;
      const { error: otpErr } = await admin.auth.signInWithOtp({
        email: emailRaw,
        options: { emailRedirectTo: finishUrl },
      });
      if (otpErr) {
        console.error('[redeem-code] OTP send failed:', otpErr);
        // Still return generic success so we don't leak which emails exist
        return json(req, { ok: true, sent: false, error: 'Could not send magic link. Try again.' }, 200);
      }

      return json(req, { ok: true, sent: true, prefix: validation.prefix });
    }

    // ─────────────────────────────────────────────────────────────
    // STAGE 2: CONSUME — post-auth, atomic provisioning
    // ─────────────────────────────────────────────────────────────
    if (stage === 'consume') {
      // Auth required. Use the user's JWT to call the RPC so auth.uid()
      // resolves to the correct user.
      const authHeader = req.headers.get('Authorization') ?? '';
      if (!authHeader.startsWith('Bearer ')) {
        return json(req, { ok: false, error: 'Missing Authorization' }, 401);
      }

      // Rate-limit by IP
      const ip = clientIp(req);
      if (!(await rateLimit(admin, 'redeem_code_consume_ip', ip, 3600, 20))) {
        return json(req, { ok: false, error: 'Too many attempts. Try again later.' }, 429);
      }

      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: u, error: uErr } = await userClient.auth.getUser();
      if (uErr || !u?.user) {
        return json(req, { ok: false, error: 'Invalid auth token' }, 401);
      }

      const { data: result, error: cErr } = await userClient.rpc('consume_code', {
        p_code: code,
      });
      if (cErr) {
        console.error('[redeem-code] consume_code RPC failed:', cErr);
        return json(req, { ok: false, error: 'Could not redeem code. Try again later.' }, 500);
      }

      if (!result?.ok) {
        // For consume errors we CAN expose the reason — user has already
        // proven they own the code by clicking the magic link.
        return json(req, { ok: false, error: result?.error || 'unknown' }, 400);
      }

      return json(req, {
        ok: true,
        club_id: result.club_id,
        slug: result.slug,
        redirect: result.redirect,
      });
    }

    return json(req, { ok: false, error: 'Unknown stage' }, 400);
  } catch (e) {
    console.error('[redeem-code] unhandled exception:', e);
    return json(req, { ok: false, error: 'Server error' }, 500);
  }
});
