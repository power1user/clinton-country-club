// member-ai-chat v1 — GroundsLive Member Assistant (v0.14.5).
//
// Mirror of admin-ai-chat with three differences:
//   1. AUTH — any authenticated user (members, guests) who belongs
//      to the posted club_id. No admin role required.
//   2. CLUB GATE — requires clubs.feature_flags.member_ai = true
//      (or default-on; checked via the catalog). If the flag is off
//      we 403 with a clear message; the client wouldn't render the
//      bubble in that case but defense-in-depth.
//   3. LOG — every call writes mode='member' to ai_usage_log so the
//      cost rolls up per-club, not platform.
//
// Tool surface (v0.14.7+): get_today_status, get_menu,
// get_upcoming_events, get_my_rsvps, get_hours. For v0.14.5
// (foundation) the function answers from the stub manual only.

// @ts-ignore Deno-only
import { createClient } from "npm:@supabase/supabase-js@2.45.1";
// @ts-ignore Deno-only
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { MEMBER_MANUAL } from "./manual.ts";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY       = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY     = Deno.env.get("ANTHROPIC_API_KEY") || "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const MODEL = "claude-haiku-4-5";
const PRICE_INPUT_USD_PER_M        = 1.00;
const PRICE_CACHED_INPUT_USD_PER_M = 0.10;
const PRICE_OUTPUT_USD_PER_M       = 5.00;
const MAX_TOKENS_REPLY             = 768;  // Slightly tighter than admin — member answers are shorter

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

// ── Auth + club opt-in check ──────────────────────────────────────
async function authAndGate(authHeader: string, postedClubId: string | null) {
  if (!postedClubId) return { ok: false, status: 400, error: "club_id required" };
  if (!authHeader.startsWith("Bearer ")) return { ok: false, status: 401, error: "missing auth" };

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return { ok: false, status: 401, error: "invalid token" };

  // The user must have either a members or guests row at this club,
  // OR be a super_admin/club_manager/club_admin for it.
  const userId = u.user.id;
  const [memberRes, roleRes] = await Promise.all([
    sb.from("members").select("id").eq("user_id", userId).eq("club_id", postedClubId).maybeSingle(),
    sb.from("user_roles").select("role, club_id").eq("user_id", userId),
  ]);
  const isMember = !!memberRes.data;
  const hasRoleAtClub = (roleRes.data || []).some((r: any) =>
    (r.role === "super_admin" && r.club_id === null) ||
    ((r.role === "club_manager" || r.role === "club_admin") && r.club_id === postedClubId)
  );
  if (!isMember && !hasRoleAtClub) {
    return { ok: false, status: 403, error: "not a member of this club" };
  }

  // Read the club's feature_flags + subscription_tier to check the
  // member_ai gate. Use admin client so RLS doesn't bite.
  const { data: club } = await admin
    .from("clubs")
    .select("id, feature_flags, subscription_tier")
    .eq("id", postedClubId)
    .maybeSingle();
  if (!club) return { ok: false, status: 404, error: "club not found" };

  // member_ai default is false (per features.js catalog). Explicit
  // override in feature_flags wins.
  const flags = club.feature_flags || {};
  const enabled = Object.prototype.hasOwnProperty.call(flags, "member_ai")
    ? !!flags["member_ai"]
    : false;  // matches default_enabled in features.js
  if (!enabled) {
    return { ok: false, status: 403, error: "member AI not enabled for this club" };
  }

  return { ok: true, user_id: userId };
}

// ── System prompt — kept BYTE-STABLE for cache stability ──────────
const SYSTEM_INSTRUCTIONS = `You are GroundsLive AI, an embedded helper inside the MyClub member app for a country club on The Grounds platform.

Your audience is club members. Help them use the MyClub app: where to find things, how to do things, current club info (when tools are available — v0.14.5 ships without tools, so you'll be answering from the manual only).

== STYLE ==
- Be conversational and warm, not robotic.
- Short answers — most member questions fit in 2-3 sentences.
- Reference UI elements by their tab label ("Food & Drink", "Community", "Golf", etc.).
- Use markdown sparingly (bullets and bold OK).

== SCOPE ==
You answer from the manual content below + (when wired) live tool data about THIS CLUB only. You don't know other clubs. You don't know the member's personal data unless they tell you in the conversation.

If a question is outside the app entirely or needs a human (account changes, billing, complaints), say so warmly and suggest they contact clubhouse staff directly.

== DISCLAIMER ==
End EVERY reply with this exact line on its own:

> *AI-generated guidance. For account help, contact your club's clubhouse staff directly.*

== REFERENCE MANUAL ==

` + MEMBER_MANUAL;

function buildMessages(history: any[]): any[] {
  return history
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0)
    .map(m => ({ role: m.role, content: m.content.trim() }))
    .slice(-20);
}

function computeCostCents(usage: any) {
  const inputTok       = usage?.input_tokens || 0;
  const cachedTok      = usage?.cache_read_input_tokens || 0;
  const cacheCreateTok = usage?.cache_creation_input_tokens || 0;
  const outputTok      = usage?.output_tokens || 0;
  const inputUsd  = (inputTok / 1_000_000) * PRICE_INPUT_USD_PER_M
                  + (cacheCreateTok / 1_000_000) * PRICE_INPUT_USD_PER_M * 1.25;
  const cachedUsd = (cachedTok / 1_000_000) * PRICE_CACHED_INPUT_USD_PER_M;
  const outputUsd = (outputTok / 1_000_000) * PRICE_OUTPUT_USD_PER_M;
  return {
    input_tokens:        inputTok + cacheCreateTok,
    cached_input_tokens: cachedTok,
    output_tokens:       outputTok,
    input_cost_cents:    inputUsd  * 100,
    cached_cost_cents:   cachedUsd * 100,
    output_cost_cents:   outputUsd * 100,
    total_cost_cents:   (inputUsd + cachedUsd + outputUsd) * 100,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (req.method === "GET") {
    return json({
      ok: true,
      service: "member-ai-chat",
      model: MODEL,
      manual_chars: MEMBER_MANUAL.length,
      anthropic_key_present: ANTHROPIC_KEY.length > 0,
    });
  }

  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  if (!ANTHROPIC_KEY) {
    return json({ ok: false, error: "ANTHROPIC_API_KEY not configured" }, 503);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }

  const history        = Array.isArray(body?.messages) ? body.messages : [];
  const conversationId = body?.conversation_id ? String(body.conversation_id) : null;
  const clubId         = body?.club_id ? String(body.club_id) : null;

  if (history.length === 0) {
    return json({ ok: false, error: "messages array required" }, 400);
  }

  const gate = await authAndGate(req.headers.get("authorization") || "", clubId);
  if (!gate.ok) return json({ ok: false, error: gate.error }, gate.status);

  const messages = buildMessages(history);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return json({ ok: false, error: "last message must be from the user" }, 400);
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const startedAt = Date.now();

  let reply = "";
  let stopReason = "unknown";
  let anthropicRequestId: string | null = null;
  let usage: any = {};
  let errMsg: string | null = null;

  try {
    const result: any = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS_REPLY,
      system: [
        {
          type: "text",
          text: SYSTEM_INSTRUCTIONS,
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
    console.error("[member-ai-chat] Anthropic call failed:", errMsg);
  }

  const latencyMs = Date.now() - startedAt;
  const cost = computeCostCents(usage);

  try {
    await admin.from("ai_usage_log").insert({
      club_id:               clubId,
      user_id:               gate.user_id,
      mode:                  "member",
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
    console.error("[member-ai-chat] ai_usage_log insert failed:", logErr?.message);
  }

  if (errMsg) {
    return json({ ok: false, error: errMsg }, 502);
  }

  return json({
    ok: true,
    reply,
    stop_reason: stopReason,
    cost_cents: cost.total_cost_cents,
    latency_ms: latencyMs,
  });
});
