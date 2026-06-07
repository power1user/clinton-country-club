// receive-support-email v2 — inbound side of the support inbox.
//
// v2 (v0.13.6): extracts attachments from postal-mime output, uploads
// each to the support-attachments Supabase Storage bucket, inserts
// support_attachments rows linking the file to the message.
//
// Everything else (auth, dedup, threading, member match) unchanged
// from v1.

// @ts-ignore Deno-only
import PostalMime from "npm:postal-mime@2.4.3";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.45.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INGEST_SECRET = Deno.env.get("SUPPORT_INGEST_SECRET")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const ATTACHMENTS_BUCKET = "support-attachments";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function sanitizeFilename(name: string): string {
  return (name || "attachment")
    .replace(/[/\\?%*:|"<>]+/g, "_")
    .slice(0, 200);
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") || "";
  const authOk = INGEST_SECRET && auth === `Bearer ${INGEST_SECRET}`;

  // v0.16.0 — Diagnostic was unauthenticated and exposed which secrets
  // are configured. Audit finding #4: gate behind the same INGEST_SECRET
  // the email-ingest worker uses. Random requests now get 404 (no
  // confirmation that diag exists), authenticated calls still work.
  if (url.searchParams.get("diag") === "1") {
    if (!authOk) return new Response("Not found", { status: 404 });
    return json({
      version: 2,
      has_url: !!SUPABASE_URL,
      has_service_key: !!SERVICE_KEY,
      has_ingest_secret: !!INGEST_SECRET,
    });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  if (!authOk) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let body: { raw?: string; from?: string; to?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }
  const raw = body.raw;
  if (!raw || typeof raw !== "string") {
    return json({ ok: false, error: "missing raw" }, 400);
  }

  let email: any;
  try { email = await PostalMime.parse(raw); }
  catch (e: any) {
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
  const attachments: any[] = Array.isArray(email.attachments) ? email.attachments : [];
  const hasAttach  = attachments.length > 0;
  const receivedAt = email.date ? new Date(email.date).toISOString() : new Date().toISOString();
  const rawSize    = raw.length;

  if (!fromAddr) return json({ ok: false, error: "no from address" }, 422);

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

  let threadId: string | null = null;
  if (inReplyTo) {
    const { data: parent } = await supabase
      .from("support_messages")
      .select("thread_id")
      .eq("message_id", inReplyTo)
      .maybeSingle();
    if (parent?.thread_id) threadId = parent.thread_id;
  }

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
        subject, from_addr: fromAddr, from_name: fromName,
        from_member_id: fromMemberId, from_club_id: fromClubId,
        status: "open", last_message_at: receivedAt,
      })
      .select("id").single();
    if (tErr || !thread) {
      console.error("[receive-support-email] thread insert failed:", tErr);
      return json({ ok: false, error: "thread insert failed", detail: tErr?.message }, 500);
    }
    threadId = thread.id;
  }

  const { data: msg, error: mErr } = await supabase
    .from("support_messages")
    .insert({
      thread_id: threadId, direction: "in",
      message_id: messageId, in_reply_to: inReplyTo, references_ids: refs,
      from_addr: fromAddr, from_name: fromName,
      to_addrs: toAddrs, cc_addrs: ccAddrs,
      subject, body_text: bodyText, body_html: bodyHtml,
      raw_size_bytes: rawSize, has_attachments: hasAttach,
      received_at: receivedAt,
    })
    .select("id").single();
  if (mErr) {
    console.error("[receive-support-email] message insert failed:", mErr);
    return json({ ok: false, error: "message insert failed", detail: mErr.message }, 500);
  }

  // v0.13.6: upload attachments + insert support_attachments rows.
  const uploaded: any[] = [];
  for (let i = 0; i < attachments.length; i++) {
    const att = attachments[i];
    const content = att.content;
    if (!content) continue;
    const bytes = content instanceof Uint8Array ? content : new TextEncoder().encode(String(content));
    if (bytes.length === 0) continue;
    if (bytes.length > MAX_ATTACHMENT_BYTES) {
      console.warn(`[receive-support-email] attachment too large, skipping: ${bytes.length} bytes`);
      continue;
    }
    const filename = sanitizeFilename(att.filename || att.contentType || `attachment_${i + 1}`);
    const storagePath = `${threadId}/${msg.id}/${crypto.randomUUID()}-${filename}`;
    const { error: upErr } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(storagePath, bytes, { contentType: att.mimeType || "application/octet-stream", upsert: false });
    if (upErr) {
      console.error("[receive-support-email] storage upload failed:", upErr.message);
      continue;
    }
    const { error: insErr } = await supabase.from("support_attachments").insert({
      message_id: msg.id,
      filename,
      mime_type: att.mimeType || null,
      size_bytes: bytes.length,
      storage_path: storagePath,
    });
    if (insErr) {
      console.error("[receive-support-email] attachment row insert failed:", insErr.message);
      continue;
    }
    uploaded.push({ filename, size_bytes: bytes.length });
  }

  return json({
    ok: true,
    thread_id: threadId,
    message_id: msg!.id,
    deduped: false,
    matched_member: !!fromMemberId,
    attachments_uploaded: uploaded.length,
  });
});
