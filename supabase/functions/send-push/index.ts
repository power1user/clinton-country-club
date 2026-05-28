// send-push v6 — fan-out Web Push with sender identity (v0.10.9).
//
// Wired via a public.fn_send_push_on_message() trigger on messages INSERT
// (see migration 49 — we don't use Supabase's Dashboard Webhook UI since
// that state isn't checked in and was lost once already).
//
// v6 change (v0.10.9): notification titles now identify WHO the message
// is from. Previously every push read "<Club> · Message" regardless of
// sender — uninformative on the lock screen. New behavior:
//
//   · thread.kind = 'order'      → "Your order update" (system-driven;
//                                    body has the body preview, which
//                                    is typically the status note)
//   · thread.kind = 'clubhouse'  → sender's name if they're a club
//                                    member, otherwise "Clubhouse"
//                                    (staff messages from a user_id
//                                    that doesn't have a members row
//                                    fall back to the friendly default)
//   · thread.kind = 'dm' (or any
//     other "member-to-member"
//     thread)                    → sender's name from members.name
//                                    (looked up by sender_user_id +
//                                    thread.club_id). Falls back to
//                                    "New message" if lookup fails.
//
// Body preview unchanged: first 140 chars of the message body.
//
// Diagnostic improvements over v5: kept as-is.
//   · GET ?diag=1 returns env state without sending a push.
//   · Per-subscription errors surface in the response payload.
//   · VAPID setup wrapped in try/catch so missing secrets return
//     structured 500s instead of crashing the worker.
//
// Required Supabase Edge Function secrets:
//   VAPID_PUBLIC_KEY   — same value that ships to the client as VITE_VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY  — keep secret
//   VAPID_SUBJECT      — mailto:... or https://... (must be a URL)
//   SUPABASE_URL       — auto-set by the platform
//   SUPABASE_SERVICE_ROLE_KEY — auto-set; bypasses RLS so we can read
//                               push_subscriptions + members.name even
//                               when the sending member's RLS would
//                               normally hide other clubs' rows.

// @ts-ignore — Deno-only import
import webpush from "npm:web-push@3.6.7";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.45.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// VAPID setup wrapped so a malformed/missing key doesn't crash the
// worker at module load. Surfaces the actual error in JSON instead.
let vapidOk = false;
let vapidErr: string | null = null;
let vapidDiag: Record<string, unknown> = {};
try {
  const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY");
  const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
  const VAPID_SUBJECT     = Deno.env.get("VAPID_SUBJECT") || "mailto:hello@groundslive.com";

  vapidDiag = {
    has_public:    !!VAPID_PUBLIC_KEY,
    public_len:    VAPID_PUBLIC_KEY?.length ?? 0,
    public_first6: VAPID_PUBLIC_KEY?.slice(0, 6) ?? null,
    public_last4:  VAPID_PUBLIC_KEY?.slice(-4) ?? null,
    public_has_whitespace: VAPID_PUBLIC_KEY ? /\s/.test(VAPID_PUBLIC_KEY) : null,
    has_private:   !!VAPID_PRIVATE_KEY,
    private_len:   VAPID_PRIVATE_KEY?.length ?? 0,
    private_has_whitespace: VAPID_PRIVATE_KEY ? /\s/.test(VAPID_PRIVATE_KEY) : null,
    subject:       VAPID_SUBJECT,
  };

  if (!VAPID_PUBLIC_KEY)  throw new Error("VAPID_PUBLIC_KEY env var is missing or empty");
  if (!VAPID_PRIVATE_KEY) throw new Error("VAPID_PRIVATE_KEY env var is missing or empty");

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidOk = true;
} catch (e: any) {
  vapidErr = String(e?.message || e);
  console.error("[send-push] VAPID setup failed:", vapidErr, vapidDiag);
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // ?diag=1 — read-only env introspection (no DB query, no push send).
  // Useful for verifying secrets are wired up without a real message.
  if (url.searchParams.get("diag") === "1") {
    return new Response(JSON.stringify({
      version: 6,
      vapidOk,
      vapidErr,
      vapidDiag,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceKey: !!SERVICE_KEY,
    }, null, 2), {
      headers: { "content-type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!vapidOk) {
    return new Response(JSON.stringify({ ok: false, error: vapidErr, vapidDiag }, null, 2), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  let payload: any;
  try { payload = await req.json(); } catch { return new Response("bad json", { status: 400 }); }

  const msg = payload.record;
  if (!msg?.thread_id || !msg?.body) {
    return new Response(JSON.stringify({ ok: false, error: "missing fields", got: msg ? Object.keys(msg) : null }), { status: 400, headers: { "content-type": "application/json" } });
  }

  const { data: thread } = await supabase
    .from("threads")
    .select("id, kind, subject, club_id, clubs(name)")
    .eq("id", msg.thread_id)
    .single();

  if (!thread) return new Response(JSON.stringify({ ok: false, error: "thread not found", thread_id: msg.thread_id }), { status: 404, headers: { "content-type": "application/json" } });

  // v0.10.9 — resolve the SENDER's name from members so the title can
  // identify who the message is from. Scoped by thread.club_id so a
  // user_id that happens to have member rows in multiple clubs
  // resolves to the right name here. Returns null when the sender
  // isn't a member of this club (e.g. staff messaging from a
  // user_roles entry without a members row, super_admin pushing a
  // message, etc.).
  let senderName: string | null = null;
  if (msg.sender_user_id && (thread as any).club_id) {
    const { data: senderRow } = await supabase
      .from("members")
      .select("name")
      .eq("user_id", msg.sender_user_id)
      .eq("club_id", (thread as any).club_id)
      .maybeSingle();
    senderName = senderRow?.name || null;
  }

  const { data: participants } = await supabase
    .from("thread_participants")
    .select("user_id")
    .eq("thread_id", msg.thread_id);

  const recipientUserIds = (participants || [])
    .map((p: any) => p.user_id)
    .filter((uid: string) => uid && uid !== msg.sender_user_id);

  if (recipientUserIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no recipients" }), { headers: { "content-type": "application/json" } });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", recipientUserIds);

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), { headers: { "content-type": "application/json" } });
  }

  // v0.10.9 — title now identifies the sender. See top-of-file comment
  // for the full mapping.
  const clubName = (thread as any).clubs?.name || "Your club";
  let title: string;
  switch (thread.kind) {
    case "order":
      title = "Your order update";
      break;
    case "clubhouse":
      // Staff replies usually come from a user_id without a member row
      // in this club — fall back to "Clubhouse" so the lock screen
      // still tells the member who's messaging. Member-side messages
      // to clubhouse (rare via this trigger but possible) get the
      // member's name.
      title = senderName || "Clubhouse";
      break;
    default:
      // dm + thread_reply + any other member-to-member kind.
      title = senderName || "New message";
      break;
  }

  // Optional club-name prefix for clubhouse + order so members managing
  // multiple-club memberships can tell where the update came from.
  // (Per-member DMs stay clean — just the sender's name.)
  if (thread.kind === "order" || thread.kind === "clubhouse") {
    title = `${clubName} · ${title}`;
  }

  const bodyPreview = (msg.body || "").slice(0, 140);

  const notification = {
    title,
    body: bodyPreview,
    data: { threadId: thread.id, kind: thread.kind, url: "/" },
  };
  const payloadStr = JSON.stringify(notification);

  const results = await Promise.allSettled(
    subs.map(async (s: any) => {
      try {
        await webpush.sendNotification({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        }, payloadStr);
        return { id: s.id, ok: true };
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        }
        console.error("[send-push] sendNotification failed:", { id: s.id, status: err?.statusCode, msg: err?.message });
        return { id: s.id, ok: false, status: err?.statusCode, error: String(err?.message || err) };
      }
    })
  );

  const sent   = results.filter((r: any) => r.status === "fulfilled" && r.value.ok).length;
  const failed = results.length - sent;
  const errors = results
    .map((r: any) => r.status === "fulfilled" ? r.value : { ok: false, error: String(r.reason) })
    .filter((r: any) => !r.ok);

  return new Response(JSON.stringify({ sent, failed, total: results.length, errors }), {
    headers: { "content-type": "application/json" },
  });
});
