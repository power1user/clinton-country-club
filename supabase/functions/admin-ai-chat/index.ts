// admin-ai-chat v1 — GroundsLive Admin Assistant (v0.14.0).
//
// Phase 15 foundation patch. Wires the request → Anthropic →
// ai_usage_log path end-to-end so v0.14.1 (manual content) and
// v0.14.2 (chat UI) can land on stable plumbing.
//
// AUTH SCOPE: admin roles only — super_admin, club_manager, club_admin.
// The Member AI is a separate Edge Function (v0.14.5+).
//
// REQUEST:
//   POST /admin-ai-chat
//   Authorization: Bearer <user JWT>
//   {
//     messages: [{role:"user"|"assistant", content:"..."}, ...],
//     conversation_id?: uuid,    // groups multi-turn calls in ai_usage_log
//     club_id?: uuid             // current club context (for tools)
//   }
//
// RESPONSE:
//   { ok: true, reply: string, usage: {...}, cost_cents: number,
//     stop_reason: string, anthropic_request_id: string|null }
//
// DIAGNOSTIC:
//   GET /admin-ai-chat?diag=1
//     Verifies ANTHROPIC_API_KEY is set and reachable. Does NOT
//     consume tokens (max_tokens=1 ping). Returns environment status.
//
// BILLING AXIS:
//   Every row inserted into ai_usage_log carries mode='admin' —
//   regardless of which club_id the calling manager belongs to.
//   That's the "bills to The Grounds" attribution from the strategy
//   thread. club_id is set for analytics (which clubs use admin AI)
//   but NOT for billing aggregation.

// @ts-ignore Deno-only
import { createClient } from "npm:@supabase/supabase-js@2.45.1";
// @ts-ignore Deno-only
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY       = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY     = Deno.env.get("ANTHROPIC_API_KEY") || "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Pricing constants (Haiku 4.5, USD per 1M tokens) ──────────────
// Source: claude-api skill / Anthropic public pricing as of 2026-05.
// If pricing changes, update here — total_cost_cents is computed
// at insert time, so existing rows keep their original cost.
const MODEL = "claude-haiku-4-5";
const PRICE_INPUT_USD_PER_M        = 1.00;   // uncached input
const PRICE_CACHED_INPUT_USD_PER_M = 0.10;   // cache reads (10% of regular)
const PRICE_OUTPUT_USD_PER_M       = 5.00;
const MAX_TOKENS_REPLY             = 1024;   // Phase 15 ceiling — most help answers fit

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { "content-type": "application/json", ...CORS },
  });
}

// ── Admin auth check ──────────────────────────────────────────────
// Reuses the v0.13.7 pattern: schema is user_roles.club_id (NOT
// tenant_id). super_admin rows have club_id IS NULL.
async function checkAdmin(authHeader: string, postedClubId: string | null) {
  if (!authHeader.startsWith("Bearer ")) return { ok: false, error: "missing auth" };
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return { ok: false, error: "invalid token" };

  const { data: roles } = await sb
    .from("user_roles")
    .select("role, club_id")
    .eq("user_id", u.user.id);

  const isSuper = (roles || []).some((r: any) =>
    r.role === "super_admin" && r.club_id === null
  );
  const isClubAdmin = (roles || []).some((r: any) =>
    (r.role === "club_manager" || r.role === "club_admin")
    && (postedClubId == null || r.club_id === postedClubId)
  );
  if (!isSuper && !isClubAdmin) return { ok: false, error: "admin role required" };

  return { ok: true, user_id: u.user.id, is_super: isSuper, roles: roles || [] };
}

// ── System prompt ─────────────────────────────────────────────────
// Cached as a prefix so v0.14.1's manual additions get the cache
// discount automatically. Keep this BYTE-STABLE — no timestamps,
// no user-specific interpolation, no UUIDs. Anything dynamic goes
// in the user message turn.
const SYSTEM_PROMPT_STATIC = `You are GroundsLive Admin Assistant, an embedded helper inside The Grounds — a multi-tenant SaaS country-club admin platform built by Marc Abla.

Your audience is platform administrators (super_admin) and club managers/admins using the desktop or mobile admin surfaces.

== YOUR JOB ==

Help admins use The Grounds. Answer "how do I…" questions about the admin UI, explain what specific screens or features do, walk through workflows step-by-step, and triage problems by suggesting what to check.

== STYLE ==

- Be concise. Step-by-step instructions when describing how to do something.
- Reference admin UI elements by their exact label as shown to the user (e.g. "Platform → Support → Inbox", not "the support module").
- Use markdown for lists and bold sparingly.
- Don't end with offers like "let me know if you need more help" — keep responses tight.

== SCOPE BOUNDARIES ==

You answer ONLY using the context provided in this conversation (the admin manual content, tool call results, and the user's question). If a question falls outside what The Grounds admin supports, say so plainly and suggest the most likely actual surface: "That sounds like a member-side question — members handle that from the MyClub app." or "For platform-level account changes, contact support@groundslive.com."

If you don't have enough context to answer confidently, say so. Don't invent admin features, screen names, or workflows that haven't been described to you.

== DISCLAIMER ==

End EVERY reply with the line:

> *AI-generated guidance. For account-level changes contact support@groundslive.com.*

(Two newlines before, italics, exactly that text.)
`;

// ── Build Anthropic messages from the inbound chat history ────────
function buildMessages(history: any[]): any[] {
  // Whitelist user/assistant only; collapse any system messages (we
  // own the system prompt). Strip empty/malformed entries.
  return history
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0)
    .map(m => ({ role: m.role, content: m.content.trim() }))
    .slice(-20); // soft cap — 20 turns of history is plenty for support Qs
}

// ── Cost calculation ──────────────────────────────────────────────
// usage shape from Anthropic SDK:
//   { input_tokens, output_tokens,
//     cache_creation_input_tokens?, cache_read_input_tokens? }
function computeCostCents(usage: any) {
  const inputTok       = usage?.input_tokens || 0;            // billed at full rate
  const cachedTok      = usage?.cache_read_input_tokens || 0; // billed at 10%
  const cacheCreateTok = usage?.cache_creation_input_tokens || 0; // billed at 125% (rare; we tag cost in input bucket)
  const outputTok      = usage?.output_tokens || 0;

  // Cache creation is ~1.25x input price; bundle into input bucket so
  // we don't need a fourth column. Cache reads track separately so
  // the dashboard can show cache-hit rate.
  const inputUsd       = (inputTok       / 1_000_000) * PRICE_INPUT_USD_PER_M
                       + (cacheCreateTok / 1_000_000) * PRICE_INPUT_USD_PER_M * 1.25;
  const cachedUsd      = (cachedTok      / 1_000_000) * PRICE_CACHED_INPUT_USD_PER_M;
  const outputUsd      = (outputTok      / 1_000_000) * PRICE_OUTPUT_USD_PER_M;

  // Dollars → cents
  return {
    input_tokens:         inputTok + cacheCreateTok,
    cached_input_tokens:  cachedTok,
    output_tokens:        outputTok,
    input_cost_cents:     inputUsd  * 100,
    cached_cost_cents:    cachedUsd * 100,
    output_cost_cents:    outputUsd * 100,
    total_cost_cents:    (inputUsd + cachedUsd + outputUsd) * 100,
  };
}

// ── Diagnostic mode ───────────────────────────────────────────────
async function runDiag() {
  const present = ANTHROPIC_KEY.length > 0;
  const looksRight = ANTHROPIC_KEY.startsWith("sk-ant-");
  let pingOk = false;
  let pingError: string | null = null;
  if (present && looksRight) {
    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
      const r = await client.messages.create({
        model: MODEL,
        max_tokens: 4,
        messages: [{ role: "user", content: "ping" }],
      });
      pingOk = !!r;
    } catch (e: any) {
      pingError = e?.message || String(e);
    }
  }
  return json({
    ok: pingOk,
    diag: {
      anthropic_key_present: present,
      anthropic_key_format_ok: looksRight,
      anthropic_ping_ok: pingOk,
      anthropic_ping_error: pingError,
      model: MODEL,
      supabase_url_present: !!SUPABASE_URL,
      service_key_present: !!SERVICE_KEY,
    },
  });
}

// ── Main handler ──────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // Diagnostic — no auth required (only exposes presence flags, not values)
  const url = new URL(req.url);
  if (req.method === "GET" && url.searchParams.get("diag") === "1") {
    return runDiag();
  }

  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  if (!ANTHROPIC_KEY) {
    return json({
      ok: false,
      error: "ANTHROPIC_API_KEY not configured. Add it to Supabase Edge Function secrets and redeploy.",
    }, 503);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }

  const history        = Array.isArray(body?.messages) ? body.messages : [];
  const conversationId = body?.conversation_id ? String(body.conversation_id) : null;
  const clubId         = body?.club_id ? String(body.club_id) : null;

  if (history.length === 0) {
    return json({ ok: false, error: "messages array required (at least one user turn)" }, 400);
  }

  const authCheck = await checkAdmin(req.headers.get("authorization") || "", clubId);
  if (!authCheck.ok) return json({ ok: false, error: authCheck.error }, 401);

  const messages = buildMessages(history);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return json({ ok: false, error: "last message must be from the user" }, 400);
  }

  // ── Call Anthropic ────────────────────────────────────────────
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const startedAt = Date.now();

  let reply = "";
  let stopReason = "unknown";
  let anthropicRequestId: string | null = null;
  let usage: any = {};
  let errMsg: string | null = null;

  try {
    // Prompt caching: place cache_control on the system prompt so it
    // caches across all admin AI calls within the 5-min TTL. With
    // just the static system prompt this is ~250 tokens (below the
    // 1024-token Haiku minimum) so the cache won't ACTUALLY engage
    // until v0.14.1 lands the admin manual. Wiring is correct now;
    // savings show up next patch.
    const result: any = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS_REPLY,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT_STATIC,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    });
    anthropicRequestId = result?._request_id || null;
    stopReason = result?.stop_reason || "unknown";
    usage = result?.usage || {};
    const textBlock = (result?.content || []).find((b: any) => b.type === "text");
    reply = textBlock?.text || "";
  } catch (e: any) {
    errMsg = e?.message || String(e);
    console.error("[admin-ai-chat] Anthropic call failed:", errMsg);
  }

  const latencyMs = Date.now() - startedAt;
  const cost = computeCostCents(usage);

  // ── Log to ai_usage_log (every call — success and failure) ────
  // Mode is 'admin' regardless of which club the manager belongs to —
  // admin AI bills to The Grounds, not the club.
  try {
    await admin.from("ai_usage_log").insert({
      club_id:               clubId,
      user_id:               authCheck.user_id,
      mode:                  "admin",
      model:                 MODEL,
      input_tokens:          cost.input_tokens,
      cached_input_tokens:   cost.cached_input_tokens,
      output_tokens:         cost.output_tokens,
      input_cost_cents:      cost.input_cost_cents,
      cached_cost_cents:     cost.cached_cost_cents,
      output_cost_cents:     cost.output_cost_cents,
      total_cost_cents:      cost.total_cost_cents,
      anthropic_request_id:  anthropicRequestId,
      conversation_id:       conversationId,
      latency_ms:            latencyMs,
      error:                 errMsg,
    });
  } catch (logErr: any) {
    // Don't fail the user request if logging fails — just shout.
    console.error("[admin-ai-chat] ai_usage_log insert failed:", logErr?.message);
  }

  if (errMsg) {
    return json({ ok: false, error: errMsg, anthropic_request_id: anthropicRequestId }, 502);
  }

  return json({
    ok: true,
    reply,
    stop_reason: stopReason,
    cost_cents: cost.total_cost_cents,
    usage: {
      input_tokens:         cost.input_tokens,
      cached_input_tokens:  cost.cached_input_tokens,
      output_tokens:        cost.output_tokens,
    },
    latency_ms: latencyMs,
    anthropic_request_id: anthropicRequestId,
  });
});
