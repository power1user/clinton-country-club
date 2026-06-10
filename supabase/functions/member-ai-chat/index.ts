// member-ai-chat v3 — GroundsLive Member Assistant with live-data
// tools (v0.14.7).
//
// Adds an Anthropic tool-use loop. The model can call:
//   - get_today_status — facility status pills for today
//   - get_menu          — current food & drink menu
//   - get_upcoming_events — events in the next N days
//   - get_recent_news   — last N published news posts
//   - get_lesson_pros   — the club's lesson pros roster
//
// Tool executors run server-side with the service-role client,
// scoped to the authenticated user's club_id (set at request
// time, not by the model). Loop is capped at 5 iterations to
// prevent runaway tool calls.

// @ts-ignore Deno-only
import { createClient } from "npm:@supabase/supabase-js@2.45.1";
// @ts-ignore Deno-only
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";
import { MEMBER_MANUAL } from "./manual.ts";
import { corsHeaders, preflight } from "../_shared/cors.ts";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY       = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY     = Deno.env.get("ANTHROPIC_API_KEY") || "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const MODEL = "claude-haiku-4-5";
const PRICE_INPUT_USD_PER_M        = 1.00;
const PRICE_CACHED_INPUT_USD_PER_M = 0.10;
const PRICE_OUTPUT_USD_PER_M       = 5.00;
const MAX_TOKENS_REPLY             = 768;
const MAX_TOOL_ITERATIONS          = 5;

// v0.16.2 — CORS narrowed via ../_shared/cors.ts.
function json(req: Request, payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { "content-type": "application/json", ...corsHeaders(req) },
  });
}

async function authAndGate(authHeader: string, postedClubId: string | null) {
  if (!postedClubId) return { ok: false, status: 400, error: "club_id required" };
  if (!authHeader.startsWith("Bearer ")) return { ok: false, status: 401, error: "missing auth" };

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return { ok: false, status: 401, error: "invalid token" };

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

  const { data: club } = await admin
    .from("clubs")
    .select("id, name, feature_flags, subscription_tier")
    .eq("id", postedClubId)
    .maybeSingle();
  if (!club) return { ok: false, status: 404, error: "club not found" };

  const flags = club.feature_flags || {};
  const enabled = Object.prototype.hasOwnProperty.call(flags, "member_ai")
    ? !!flags["member_ai"]
    : false;
  if (!enabled) {
    return { ok: false, status: 403, error: "member AI not enabled for this club" };
  }

  return { ok: true, user_id: userId, club };
}

// ── Tool definitions (sent to Anthropic) ──────────────────────────
const TOOLS = [
  {
    name: "get_today_status",
    description: "Returns today's status (open / limited / closed / members-only) for each facility at the member's club, with any staff notes the manager has posted. Use when asked about whether a facility is open, hours today, course conditions, or similar real-time questions.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_menu",
    description: "Returns the current food & drink menu at the member's club, organized by category. Use when asked what's on the menu, what's served at the bar, whether they have a specific dish, or for price questions.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_upcoming_events",
    description: "Returns events at the member's club from now through `days_ahead` days (default 14, max 60). Includes date, time, category, location, RSVP count, and spots remaining when relevant. Use when asked what's coming up, when an event is, or whether something is happening this week.",
    input_schema: {
      type: "object",
      properties: {
        days_ahead: { type: "integer", description: "Look this many days into the future. Default 14, max 60." },
      },
      required: [],
    },
  },
  {
    name: "get_recent_news",
    description: "Returns the last N published news posts (default 5, max 10) from the member's club. Use when asked what's new, recent announcements, or 'did the club post about X?'.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "How many recent posts to fetch. Default 5, max 10." },
      },
      required: [],
    },
  },
  {
    name: "get_lesson_pros",
    description: "Returns the club's lesson pros roster — name, bio, contact info, photo. Use when asked who the pros are, who to book a lesson with, or for instructor recommendations.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

// ── Tool executors (server-side, service role, scoped to clubId) ──
async function executeTool(name: string, input: any, clubId: string): Promise<string> {
  try {
    switch (name) {
      case "get_today_status": {
        const { data } = await admin
          .from("club_status")
          .select("category, label, state, staff_note, opens_at, closes_at, club_facilities(display_name, active)")
          .eq("club_id", clubId);
        const rows = (data || [])
          .filter((r: any) => r.club_facilities?.active !== false)
          .map((r: any) => ({
            facility: r.club_facilities?.display_name || r.label || r.category,
            state: r.state || "unknown",
            note: r.staff_note || null,
            opens_at: r.opens_at || null,
            closes_at: r.closes_at || null,
          }));
        return JSON.stringify({ facilities: rows });
      }

      case "get_menu": {
        // The table is `menus` (not `menu_items`); items have item_name
        // and an `available_today` flag we use as the active gate.
        const [{ data: cats }, { data: items }] = await Promise.all([
          admin.from("menu_categories").select("id, name, sort_order, is_active").eq("club_id", clubId).order("sort_order", { ascending: true }),
          admin.from("menus").select("id, item_name, description, price, category_id, available_today, is_special").eq("club_id", clubId),
        ]);
        const activeCats = (cats || []).filter((c: any) => c.is_active !== false);
        const activeItems = (items || []).filter((i: any) => i.available_today !== false);
        const byCat = activeCats.map((c: any) => ({
          category: c.name,
          items: activeItems
            .filter((i: any) => i.category_id === c.id)
            .map((i: any) => ({
              name: i.item_name,
              description: i.description,
              price: i.price,
              special: i.is_special || undefined,
            })),
        }));
        return JSON.stringify({ menu: byCat });
      }

      case "get_upcoming_events": {
        const days = Math.min(60, Math.max(1, Number(input?.days_ahead) || 14));
        const horizon = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);
        const { data } = await admin
          .from("events")
          .select("id, title, description, event_date, event_time_start, event_time_end, category, spots")
          .eq("club_id", clubId)
          .gte("event_date", today)
          .lte("event_date", horizon)
          .order("event_date", { ascending: true })
          .limit(25);
        const events = (data || []).map((e: any) => ({
          title: e.title,
          date: e.event_date,
          start_time: e.event_time_start,
          end_time: e.event_time_end,
          category: e.category,
          spots: e.spots,
          description: (e.description || "").slice(0, 200),
        }));
        return JSON.stringify({ events, window_days: days });
      }

      case "get_recent_news": {
        const limit = Math.min(10, Math.max(1, Number(input?.limit) || 5));
        // News uses `headline` + `published_at` (NULL = draft).
        const { data } = await admin
          .from("news")
          .select("headline, body, category, date_label, published_at, created_at")
          .eq("club_id", clubId)
          .not("published_at", "is", null)
          .order("published_at", { ascending: false })
          .limit(limit);
        const posts = (data || []).map((n: any) => ({
          headline: n.headline,
          body: (n.body || "").slice(0, 400),
          category: n.category,
          date_label: n.date_label,
          posted: n.published_at,
        }));
        return JSON.stringify({ news: posts });
      }

      case "get_lesson_pros": {
        // lesson_pros has no phone/email — just title, bio, photo_url, rate.
        const { data } = await admin
          .from("lesson_pros")
          .select("name, title, bio, rate, active, sort_order")
          .eq("club_id", clubId)
          .order("sort_order", { ascending: true });
        const pros = (data || [])
          .filter((p: any) => p.active !== false)
          .map((p: any) => ({ name: p.name, title: p.title, bio: p.bio, rate: p.rate }));
        return JSON.stringify({ pros });
      }

      default:
        return JSON.stringify({ error: `unknown tool: ${name}` });
    }
  } catch (e: any) {
    console.error(`[member-ai-chat] tool '${name}' failed:`, e?.message);
    return JSON.stringify({ error: e?.message || "tool execution failed" });
  }
}

const SYSTEM_INSTRUCTIONS = `You are GroundsLive AI, an embedded helper inside the MyClub member app for a country club on Grounds Live platform.

Your audience is club members and (occasionally) guests visiting the club. Help them use the MyClub app: where to find things, how to do things, what the screens mean. You ALSO have access to live data tools — use them when the answer requires current information about THIS club.

== TOOL USE ==
You have these tools available. Call them when needed:
- get_today_status — facility status (open/closed/limited) for today, with staff notes
- get_menu — current food & drink menu
- get_upcoming_events — events in the next N days
- get_recent_news — the last N published news posts
- get_lesson_pros — the club's lesson pros roster

Rules for tool use:
- USE a tool when the answer depends on current club state ("Is the pool open?", "What's on the menu?", "What events this week?", "Who are the pros?").
- DON'T call tools for questions about how the app works — answer from the manual.
- DON'T call multiple tools speculatively. One specific tool per question, then answer.
- After a tool call, synthesize a SHORT human answer (2-3 sentences). Don't dump the raw data.

== STYLE ==
- Warm and conversational. Short answers — most member questions fit in 2-3 sentences.
- Reference UI elements by their tab label ("Food & Drink", "Community", "Golf", etc.).
- Markdown is fine sparingly (bullets, bold).
- Don't end with "let me know if you need more help" — keep it tight.

== SCOPE ==
Answer from the manual + tool data about THIS club only. You don't know other clubs. You don't know the member's personal data unless they tell you in conversation.

If a question is outside the app or needs a human (account changes, billing, disputes, specific personal data), warmly suggest the right escape hatch — Message Clubhouse for club stuff, Help & Support for app issues.

== DISCLAIMER ==
End EVERY final reply (not tool-use turns) with this exact line on its own:

> *AI-generated guidance. For account help, contact your club's clubhouse staff directly.*

== REFERENCE MANUAL ==

` + MEMBER_MANUAL;

function buildMessages(history: any[]): any[] {
  return history
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0)
    .map(m => ({ role: m.role, content: m.content.trim() }))
    .slice(-20);
}

function accumulateUsage(acc: any, u: any) {
  acc.input_tokens         += u?.input_tokens || 0;
  acc.cached_input_tokens  += u?.cache_read_input_tokens || 0;
  acc.cache_creation_input_tokens += u?.cache_creation_input_tokens || 0;
  acc.output_tokens        += u?.output_tokens || 0;
  return acc;
}

function computeCostCents(usage: any) {
  const inputTok       = usage?.input_tokens || 0;
  const cachedTok      = usage?.cached_input_tokens || 0;
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
  if (req.method === "OPTIONS") return preflight(req);

  // v0.16.0 — GET was unauthenticated and exposed service version,
  // model name, manual size, tool count, and Anthropic-key presence.
  // Audit finding #4: don't respond to anon GET at all.
  if (req.method === "GET") {
    return json(req, { ok: false, error: "method not allowed" }, 405);
  }

  if (req.method !== "POST") return json(req, { ok: false, error: "method not allowed" }, 405);

  if (!ANTHROPIC_KEY) {
    return json(req, { ok: false, error: "ANTHROPIC_API_KEY not configured" }, 503);
  }

  let body: any;
  try { body = await req.json(); } catch { return json(req, { ok: false, error: "bad json" }, 400); }

  const history        = Array.isArray(body?.messages) ? body.messages : [];
  const conversationId = body?.conversation_id ? String(body.conversation_id) : null;
  const clubId         = body?.club_id ? String(body.club_id) : null;

  if (history.length === 0) {
    return json(req, { ok: false, error: "messages array required" }, 400);
  }

  const gate = await authAndGate(req.headers.get("authorization") || "", clubId);
  if (!gate.ok) return json(req, { ok: false, error: gate.error }, gate.status);

  const messages = buildMessages(history);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return json(req, { ok: false, error: "last message must be from the user" }, 400);
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const startedAt = Date.now();

  // ── Tool-use loop ─────────────────────────────────────────────
  const cumulativeUsage = { input_tokens: 0, cached_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 0 };
  let workingMessages: any[] = [...messages];
  let reply = "";
  let stopReason = "unknown";
  let anthropicRequestId: string | null = null;
  let errMsg: string | null = null;
  let toolCallsMade = 0;

  try {
    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const result: any = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS_REPLY,
        system: [
          { type: "text", text: SYSTEM_INSTRUCTIONS, cache_control: { type: "ephemeral" } },
        ],
        tools: TOOLS,
        messages: workingMessages,
      });
      anthropicRequestId = result?._request_id || anthropicRequestId;
      stopReason = result?.stop_reason || "unknown";
      accumulateUsage(cumulativeUsage, result?.usage || {});

      // Extract any text + tool_use blocks
      const content = result?.content || [];
      const textBlocks = content.filter((b: any) => b.type === "text");
      const toolUses   = content.filter((b: any) => b.type === "tool_use");

      // Append assistant turn verbatim (preserves tool_use ids)
      workingMessages.push({ role: "assistant", content });

      if (stopReason !== "tool_use" || toolUses.length === 0) {
        // Terminal — assemble text from last assistant turn
        reply = textBlocks.map((b: any) => b.text).join("\n").trim();
        break;
      }

      // Execute each tool, collect tool_result blocks
      const toolResults: any[] = [];
      for (const tu of toolUses) {
        toolCallsMade++;
        const out = await executeTool(tu.name, tu.input || {}, clubId!);
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: out,
        });
      }
      workingMessages.push({ role: "user", content: toolResults });

      // Loop continues — next iteration sends the tool results back to the model
    }

    if (!reply && stopReason === "tool_use") {
      reply = "Sorry, that took too many lookup steps. Could you ask a more specific question?";
    }
  } catch (e: any) {
    errMsg = e?.message || String(e);
    console.error("[member-ai-chat] loop failed:", errMsg);
  }

  const latencyMs = Date.now() - startedAt;
  const cost = computeCostCents(cumulativeUsage);

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
    return json(req, { ok: false, error: errMsg }, 502);
  }

  return json(req, {
    ok: true,
    reply,
    stop_reason: stopReason,
    tool_calls: toolCallsMade,
    cost_cents: cost.total_cost_cents,
    latency_ms: latencyMs,
  });
});
