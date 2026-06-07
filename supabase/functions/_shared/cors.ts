// cors.ts (v0.16.1) — shared CORS allowlist for every Edge Function.
//
// Why this exists: the audit (round 2) flagged that every function set
// `Access-Control-Allow-Origin: *`. JWT auth on the function blocks
// MOST abuse, but a wildcard CORS policy lets ANY origin issue
// credentialed XHR requests from a logged-in user's browser, which
// widens the cross-site-request abuse surface. Narrowing CORS to the
// app's own origins removes that surface entirely.
//
// What's allowed:
//   - https://groundslive.com                          (apex, future)
//   - https://<anything>.groundslive.com               (every club's
//     subdomain — clinton-country-club.groundslive.com etc.)
//   - http://localhost:5173 / 5174 / 5175 / 4173       (Vite dev)
//
// Everything else gets `Access-Control-Allow-Origin: https://groundslive.com`
// echoed back — a non-matching origin, which makes the browser refuse
// to deliver the response to JS even if the request itself succeeded.
//
// CRITICAL: Supabase CLI treats directories starting with `_` as
// "shared" (won't be served as a function). Import with a relative
// path from any function index.ts:
//   import { corsHeaders } from "../_shared/cors.ts";

const ALLOWED_RE = [
  /^https:\/\/(?:[a-z0-9-]+\.)?groundslive\.com$/i,
  /^http:\/\/localhost:(5173|5174|5175|4173)$/i,
];

function isAllowed(origin: string): boolean {
  return ALLOWED_RE.some((re) => re.test(origin));
}

/**
 * Build a CORS header set for THIS request. Pass in the incoming
 * Request so we can echo back the matching origin (browsers require
 * an exact-match, single-value Allow-Origin when credentials are in
 * play; wildcards are rejected with `Access-Control-Allow-Credentials`).
 */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allow = isAllowed(origin) ? origin : "https://groundslive.com";
  return {
    "Access-Control-Allow-Origin":  allow,
    "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}

/** Convenience for the preflight branch in every function:
 *    if (req.method === "OPTIONS") return preflight(req);
 */
export function preflight(req: Request): Response {
  return new Response(null, { headers: corsHeaders(req) });
}
