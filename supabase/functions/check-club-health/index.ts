// check-club-health (v0.10.12) — manual subdomain health check for
// every active club. Super_admin-triggered from Platform → Provisioning
// Log so orphan clubs (DB row exists, DNS never provisioned) get
// surfaced before members hit a broken hostname.
//
// Server-side because browser CORS blocks reading the cf-ray header
// on cross-origin requests — we need to do the pings here and return
// the results.
//
// Per-club output:
//   {
//     slug:        'clintoncc',
//     hostname:    'clintoncc.groundslive.com',
//     reachable:   true | false,
//     status:      200 | null,
//     cloudflare:  true | false,        // CF-RAY + Server: cloudflare present
//     dns_error:   true | false,        // DNS lookup failed (NXDOMAIN, etc.)
//     error:       string | null,
//     latency_ms:  number,
//   }
//
// The UI uses cloudflare=false to flag DNS-only setups (not proxied,
// so no TLS + DDoS protection) and reachable=false to flag the
// orphan case Marc hit with windhavencc.

// @ts-ignore — Deno-only import
import { createClient } from "npm:@supabase/supabase-js@2.45.1";
import { corsHeaders, preflight } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const PLATFORM_DOMAIN = "groundslive.com";
const FETCH_TIMEOUT_MS = 6000;

// v0.16.0 — super_admin auth gate. Previously this endpoint was
// callable by anyone who knew the URL (the service-role client at the
// top would happily enumerate every club). Lifts the pattern from
// submit-support-ticket: anon-client + user JWT → check user_roles for
// a super_admin row → reject if absent. Service-role client below is
// then used ONLY for the post-auth fan-out.
async function requireSuperAdmin(req: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "missing bearer token" };
  }
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: u } = await anon.auth.getUser();
  if (!u?.user) return { ok: false, status: 401, error: "invalid token" };
  // Grounds Live schema: user_roles.club_id (not tenant_id — see
  // v0.13.7 hotfix). super_admin rows have club_id IS NULL.
  const { data: roles, error } = await anon
    .from("user_roles")
    .select("role, club_id")
    .eq("user_id", u.user.id);
  if (error) return { ok: false, status: 500, error: error.message };
  const isSuper = (roles || []).some((r: any) => r.role === "super_admin" && r.club_id === null);
  if (!isSuper) return { ok: false, status: 403, error: "super_admin required" };
  return { ok: true };
}

async function checkOne(slug: string): Promise<Record<string, unknown>> {
  const hostname = `${slug}.${PLATFORM_DOMAIN}`;
  const url = `https://${hostname}/`;
  const started = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);

    const cfRay  = res.headers.get("cf-ray");
    const server = (res.headers.get("server") || "").toLowerCase();
    const cloudflare = !!cfRay && server.includes("cloudflare");

    return {
      slug,
      hostname,
      reachable: res.ok || (res.status >= 200 && res.status < 400),
      status: res.status,
      cloudflare,
      dns_error: false,
      error: null,
      latency_ms: Date.now() - started,
    };
  } catch (e: any) {
    clearTimeout(timer);
    const msg = String(e?.message || e);
    // Deno surfaces DNS resolution failures as TypeError with
    // specific text — treat anything containing "resolve" or
    // ENOTFOUND/NXDOMAIN as a DNS-level miss vs. a connection refused.
    const dns_error = /resolve|enotfound|nxdomain|dns/i.test(msg);
    return {
      slug,
      hostname,
      reachable: false,
      status: null,
      cloudflare: false,
      dns_error,
      error: e?.name === "AbortError" ? `Timeout after ${FETCH_TIMEOUT_MS}ms` : msg,
      latency_ms: Date.now() - started,
    };
  }
}

Deno.serve(async (req: Request) => {
  // v0.16.2 — CORS narrowed via ../_shared/cors.ts.
  if (req.method === "OPTIONS") return preflight(req);
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders(req) });
  }

  // v0.16.0 — must be super_admin (audit finding #2).
  const gate = await requireSuperAdmin(req);
  if (!gate.ok) {
    return new Response(JSON.stringify({ ok: false, error: gate.error }), {
      status: gate.status,
      headers: { "content-type": "application/json", ...corsHeaders(req) },
    });
  }

  // Pull every club's slug. The service role bypasses RLS so we
  // see every club regardless of who triggered the check.
  const { data: clubs, error } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .order("slug", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json", ...corsHeaders(req) },
    });
  }

  // Ping all clubs in parallel — small N (~3 right now, dozens at
  // most), so Promise.all is safe and faster than serial.
  const results = await Promise.all((clubs || []).map(async (c: any) => ({
    club_id: c.id,
    club_name: c.name,
    ...(await checkOne(c.slug)),
  })));

  const summary = {
    total: results.length,
    healthy: results.filter(r => r.reachable && r.cloudflare).length,
    dns_only: results.filter(r => r.reachable && !r.cloudflare).length,
    unreachable: results.filter(r => !r.reachable).length,
  };

  return new Response(JSON.stringify({ ok: true, summary, results }, null, 2), {
    headers: { "content-type": "application/json", ...corsHeaders(req) },
  });
});
