// receive-support-email v1 — inbound side of the support inbox.
//
// Called by the Cloudflare Email Worker on every inbound message to
// support@groundslive.com. The Worker also forwards the message to
// the two destination Gmail/AOL inboxes (Marc + the second platform
// person) so on-the-go replies via mobile Gmail still work — this
// function exists to populate the in-app inbox AND fire the push
// notification so super_admins see the unread badge on their PWA.
//
// AUTH: shared-secret in Authorization header (NOT the service-role
// key — the Worker doesn't need that much power). The secret lives in
// SUPPORT_INGEST_SECRET on this function's secrets + the Worker's env.
//
// REQUEST SHAPE (from the Worker):
//   POST /receive-support-email
//   Authorization: Bearer <SUPPORT_INGEST_SECRET>
//   Content-Type: application/json
//   { raw: "<RFC-822 email string>", from: "sender@x", to: "support@groundslive.com" }
//
// FLOW:
//   1. Auth check
//   2. Parse the raw RFC-822 with postal-mime
//   3. Idempotency: if Message-ID already exists, return 200 (dedup)
//   4. Thread resolution: in_reply_to lookup → existing thread, else create new
//   5. Match from_addr to a known member (best-effort)
//   6. Insert support_messages row (trigger updates thread.last_message_at)
//   7. Return {ok, thread_id, message_id, deduped}
//
// Push fan-out to super_admins is handled by the v0.13.1 trigger on
// support_messages INSERT — NOT in this function.

// @ts-ignore Deno-only import
import PostalMime from "npm:postal-mime@2.4.3";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.45.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INGEST_SECRET = Deno.env.get("SUPPORT_INGEST_SECRET")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // □ diag mode — no DB writes, just env introspection.
  const url = new URL(req.url);
  if (url.searchParams.get("diag") === "1") {
    return json({
      version: 1,
      has_url: !!SUPABASE_URL,
      has_service_key: !!SERVICE_KEY,
      has_ingest_secret: !!INGEST_SECRET,
    });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // □ Auth: shared secret.
  const auth = req.headers.get("authorization") || "";
  if (!INGEST_SECRET || auth !== `Bearer ${INGEST_SECRET}`) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  // □ Body
  let body: { raw?: string; from?: string; to?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }
  const raw = body.raw;
  if (!raw || typeof raw !== "string") {
    return json({ ok: false, error: "missing raw" }, 400);
  }

  // □ Parse RFC-822 with postal-mime.
  let email: any;
  try {
    email = await PostalMime.parse(raw);
  } catch (e: any) {
    console.error("[receive-support-email] parse failed:", e?.message || e);
    return json({ ok: false, error: "parse failed", detail: String(e?.message || e) }, 422);
  }

  const messageId  = email.messageId || null;
  const inReplyTo  = email.inReplyTo || null;
  const refs       = Array.isArray(email.references) ? email.references.join(" ") : (email.references || null);
  const subject    = (email.subject || "").slice(0, 500);
  const fromAddr   = (email.from?.address || body.from || "").toLowerCase();
  const fromName   = email.from?.name || null;
  const toAddrs    = (email.to || []).map((a: any) => a.address).filter(Boolean);
  const ccAddrs    = (email.cc || []).map((a: any) => a.address).filter(Boolean);
  const bodyText   = email.text || null;
  const bodyHtml   = email.html || null;
  const hasAttach  = Array.isArray(email.attachments) && email.attachments.length > 0;
  const receivedAt = email.date ? new Date(email.date).toISOString() : new Date().toISOString();
  const rawSize    = raw.length;

  if (!fromAddr) {
    return json({ ok: false, error: "no from address" }, 422);
  }

  // □ Idempotency. If Message-ID already ingested, return existing row.
  if (messageId) {
    const { data: existing } = await supabase
      .from("support_messages")
      .select("id, thread_id")
      .eq("message_id", messageId)
      .maybeSingle();
    if (existing?.id) {
      return json({ ok: true, thread_id: existing.thread_id, message_id: existing.id, deduped: true });
    }
  }

  // □ Thread resolution.
  //  - If In-Reply-To matches a message we already have, attach to that thread.
  //  - Else create a new thread.
  let threadId: string | null = null;
  if (inReplyTo) {
    const { data: parent } = await supabase
      .from("support_messages")
      .select("thread_id")
      .eq("message_id", inReplyTo)
      .maybeSingle();
    if (parent?.thread_id) threadId = parent.thread_id;
  }

  // Best-effort member match: from_addr against members.email.
  let fromMemberId: string | null = null;
  let fromClubId: string | null = null;
  {
    const { data: memberMatch } = await supabase
      .from("members")
      .select("id, club_id")
      .ilike("email", fromAddr)
      .limit(1)
      .maybeSingle();
    if (memberMatch) {
      fromMemberId = memberMatch.id;
      fromClubId   = memberMatch.club_id;
    }
  }

  if (!threadId) {
    const { data: thread, error: tErr } = await supabase
      .from("support_threads")
      .insert({
        subject,
        from_addr: fromAddr,
        from_name: fromName,
        from_member_id: fromMemberId,
        from_club_id: fromClubId,
        status: "open",
        last_message_at: receivedAt,
      })
      .select("id")
      .single();
    if (tErr || !thread) {
      console.error("[receive-support-email] thread insert failed:", tErr);
      return json({ ok: false, error: "thread insert failed", detail: tErr?.message }, 500);
    }
    threadId = thread.id;
  }

  // □ Insert message.
  const { data: msg, error: mErr } = await supabase
    .from("support_messages")
    .insert({
      thread_id: threadId,
      direction: "in",
      message_id: messageId,
      in_reply_to: inReplyTo,
      references_ids: refs,
      from_addr: fromAddr,
      from_name: fromName,
      to_addrs: toAddrs,
      cc_addrs: ccAddrs,
      subject,
      body_text: bodyText,
      body_html: bodyHtml,
      raw_size_bytes: rawSize,
      has_attachments: hasAttach,
      received_at: receivedAt,
    })
    .select("id")
    .single();
  if (mErr) {
    console.error("[receive-support-email] message insert failed:", mErr);
    return json({ ok: false, error: "message insert failed", detail: mErr.message }, 500);
  }

  return json({
    ok: true,
    thread_id: threadId,
    message_id: msg!.id,
    deduped: false,
    matched_member: !!fromMemberId,
  });
});
