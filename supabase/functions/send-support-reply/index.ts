// send-support-reply v1 — outbound side of the support inbox.
//
// Called by the admin UI's thread view when a super_admin clicks Send
// in the reply composer. Sends the reply via Resend appearing as
// support@groundslive.com (or RESEND_FROM_ADDRESS), preserves
// In-Reply-To + References headers so Gmail / Outlook / etc. thread
// it on the recipient's side, and inserts a direction='out' row into
// support_messages.
//
// REQUEST:
//   POST /send-support-reply
//   Authorization: Bearer <user JWT>  (super_admin only, double-checked)
//   { thread_id, body_text, body_html?, subject? }
//
// REQUIRED SECRETS:
//   RESEND_API_KEY        — from v0.12.5 setup
//   RESEND_FROM_ADDRESS   — defaults to 'support@groundslive.com'
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto)

// @ts-ignore Deno-only
import { createClient } from "npm:@supabase/supabase-js@2.45.1";
import { corsHeaders, preflight } from "../_shared/cors.ts";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY       = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY    = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM       = Deno.env.get("RESEND_FROM_ADDRESS") || "support@groundslive.com";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// v0.16.2 — CORS narrowed via ../_shared/cors.ts.
function json(req: Request, payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { "content-type": "application/json", ...corsHeaders(req) },
  });
}

async function checkSuperAdmin(authHeader: string): Promise<{ ok: boolean; user_id?: string; error?: string }> {
  if (!authHeader.startsWith("Bearer ")) return { ok: false, error: "missing auth" };
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return { ok: false, error: "invalid token" };
  // v0.13.7 hotfix — The Grounds names the tenant column `club_id`
  // (the supabase-rbac skill template used the generic `tenant_id`,
  // which doesn't exist in this schema). super_admin rows have
  // club_id IS NULL (platform-wide); other roles are club-scoped.
  const { data: roles } = await sb
    .from("user_roles")
    .select("role, club_id")
    .eq("user_id", u.user.id);
  const isSuper = (roles || []).some((r: any) => r.role === "super_admin" && r.club_id === null);
  if (!isSuper) return { ok: false, error: "super_admin required" };
  return { ok: true, user_id: u.user.id };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflight(req);
  if (req.method !== "POST") return json(req, { ok: false, error: "method not allowed" }, 405);

  if (!RESEND_API_KEY) {
    return json(req, { ok: false, error: "RESEND_API_KEY not configured" }, 500);
  }

  const auth = await checkSuperAdmin(req.headers.get("authorization") || "");
  if (!auth.ok) return json(req, { ok: false, error: auth.error }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json(req, { ok: false, error: "bad json" }, 400); }

  const thread_id = String(body?.thread_id || "").trim();
  const body_text = String(body?.body_text || "").trim();
  const body_html: string | null = body?.body_html ? String(body.body_html) : null;
  const subjectOverride: string | null = body?.subject ? String(body.subject) : null;
  if (!thread_id || !body_text) {
    return json(req, { ok: false, error: "thread_id + body_text required" }, 400);
  }

  // □ Fetch the thread + the most recent inbound message (for headers).
  const { data: thread } = await admin
    .from("support_threads")
    .select("id, subject, from_addr")
    .eq("id", thread_id)
    .maybeSingle();
  if (!thread) return json(req, { ok: false, error: "thread not found" }, 404);

  const { data: lastInbound } = await admin
    .from("support_messages")
    .select("message_id, references_ids")
    .eq("thread_id", thread_id)
    .eq("direction", "in")
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // □ Build headers.
  // Generate a fresh Message-ID with our domain so future inbound
  // replies that reference this In-Reply-To resolve back into the
  // same thread on our side.
  const newMessageId = `<reply-${crypto.randomUUID()}@groundslive.com>`;
  const inReplyTo = lastInbound?.message_id || null;
  // References = parent's References (if any) + parent's Message-ID.
  const refsParts = [
    lastInbound?.references_ids,
    lastInbound?.message_id,
  ].filter(Boolean);
  const referencesHeader = refsParts.join(" ");

  // Subject: "Re: ..." unless the original already starts with Re:.
  const baseSubject = subjectOverride || thread.subject || "(no subject)";
  const subject = /^re:/i.test(baseSubject) ? baseSubject : `Re: ${baseSubject}`;

  // □ Build Resend payload.
  const resendPayload: any = {
    from: RESEND_FROM,
    to: [thread.from_addr],
    subject,
    text: body_text,
    headers: {
      "Message-ID": newMessageId,
      ...(inReplyTo  ? { "In-Reply-To": inReplyTo } : {}),
      ...(referencesHeader ? { "References":  referencesHeader } : {}),
    },
  };
  if (body_html) resendPayload.html = body_html;

  // □ Send via Resend.
  let resendId: string | null = null;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(resendPayload),
    });
    const j = await r.json();
    if (!r.ok) {
      return json(req, { ok: false, error: `Resend: ${j?.message || r.statusText}`, detail: j }, 502);
    }
    resendId = j?.id || null;
  } catch (e: any) {
    return json(req, { ok: false, error: `Resend fetch failed: ${e?.message || e}` }, 502);
  }

  // □ Insert outbound message row. The trigger auto-flips the thread
  // to status='answered' and updates last_message_at.
  const { data: msg, error: mErr } = await admin
    .from("support_messages")
    .insert({
      thread_id,
      direction: "out",
      message_id: newMessageId,
      in_reply_to: inReplyTo,
      references_ids: referencesHeader || null,
      from_addr: RESEND_FROM,
      from_name: "Support",
      to_addrs: [thread.from_addr],
      cc_addrs: [],
      subject,
      body_text,
      body_html,
      raw_size_bytes: body_text.length + (body_html?.length || 0),
      has_attachments: false,
      received_at: new Date().toISOString(),
      created_by: auth.user_id,
    })
    .select("id")
    .single();
  if (mErr) return json(req, { ok: false, error: mErr.message, sent: true, resend_id: resendId }, 500);

  // □ Mark thread as read by THIS super_admin (they just replied, so
  // they've obviously read it). Upsert into support_reads.
  await admin.from("support_reads").upsert(
    { thread_id, user_id: auth.user_id, read_at: new Date().toISOString() },
    { onConflict: "thread_id,user_id" }
  );

  return json(req, { ok: true, message_id: msg.id, resend_id: resendId });
});
