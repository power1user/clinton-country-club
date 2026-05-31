// send-push v8 — fan-out Web Push for thread messages AND admin
// broadcasts. Pre-v8 history:
//   · v6 (v0.10.9) — sender identity in the title
//   · v7 (v0.11.34, URGENT) — added notification_messages broadcast
//                              branch alongside the messages branch.
//
// v8 change (v0.12.7) — order-thread recipient resolution.
//
// Marc's bug report (kitchen reply not pushing) traced to this:
//
//   The v7 thread flow fetched `thread_participants` and filtered out
//   the sender, then pushed to whoever remained. For ORDER threads,
//   the `fn_order_thread_create` trigger only adds the order's MEMBER
//   as a participant — no staff side. That gave us three sub-cases:
//
//     1) Staff (non-member auth.uid) replies → participants=[member],
//        sender=staff, filter keeps the member → push fires. ✅
//
//     2) Member (or a multi-hat user whose staff auth.uid == member
//        auth.uid) replies as staff → participants=[member], sender=
//        member, filter excludes the only entry → 0 recipients → no
//        push. ❌ (this was Marc's self-test failure)
//
//     3) The v0.10.18 canned "Your order is ready" message used
//        sender_user_id = thread.created_by (the member) → same
//        empty-recipient outcome → status-ready notifications had
//        actually been silently broken since v0.10.18. ❌
//
//   Semantically, an order thread has ONE recipient: the member who
//   placed the order. "Don't push to the sender" is the right rule
//   for member-to-member DMs and clubhouse threads where multiple
//   real people participate. It's the WRONG rule for order threads
//   where the conversation is conceptually 1:1 between "the kitchen
//   as a unit" and "the order's member".
//
//   Fix: for `thread.kind === 'order'`, derive the recipient as the
//   order's member (via thread.created_by — which fn_order_thread_create
//   sets to the member's user_id) and SKIP the sender filter. The
//   message still won't push if the member has no push_subscription
//   row, but the empty-recipients silent failure goes away. Cases 1,
//   2, and 3 all become "push to the order's member, always."
//
//   Other thread kinds (clubhouse, dm, etc.) keep the v7 logic
//   unchanged.
//
// Diagnostic surface (?diag=1) flips the response `version` to 8.

// @ts-ignore — Deno-only import
import webpush from "npm:web-push@3.6.7";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.45.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

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

async function fanOut(subs: any[], payloadStr: string, ttlSeconds: number) {
  const opts = { TTL: ttlSeconds };
  const results = await Promise.allSettled(
    subs.map(async (s: any) => {
      try {
        await webpush.sendNotification({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        }, payloadStr, opts);
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
  return { sent, failed, total: results.length, errors };
}

async function handleThreadMessage(msg: any) {
  if (!msg?.thread_id || !msg?.body) {
    return new Response(JSON.stringify({ ok: false, error: "missing fields", got: msg ? Object.keys(msg) : null }), { status: 400, headers: { "content-type": "application/json" } });
  }
  // v8: pull thread.created_by so the order branch can resolve the
  // order's member without a second lookup.
  const { data: thread } = await supabase
    .from("threads")
    .select("id, kind, subject, club_id, created_by, clubs(name)")
    .eq("id", msg.thread_id)
    .single();
  if (!thread) return new Response(JSON.stringify({ ok: false, error: "thread not found", thread_id: msg.thread_id }), { status: 404, headers: { "content-type": "application/json" } });

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

  // v8: order-thread recipient resolution. The order's member is the
  // sole recipient — always push to them, never apply the
  // sender-exclusion filter. For all other thread kinds, fall through
  // to the participant-list + sender-filter path from v7.
  let recipientUserIds: string[] = [];
  if (thread.kind === "order") {
    if ((thread as any).created_by) {
      recipientUserIds = [(thread as any).created_by];
    }
  } else {
    const { data: participants } = await supabase
      .from("thread_participants")
      .select("user_id")
      .eq("thread_id", msg.thread_id);
    recipientUserIds = (participants || [])
      .map((p: any) => p.user_id)
      .filter((uid: string) => uid && uid !== msg.sender_user_id);
  }

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
  const clubName = (thread as any).clubs?.name || "Your club";
  let title: string;
  switch (thread.kind) {
    case "order":
      // Order replies: sender's name when we have it (kitchen staff
      // who's also a member of this club resolves to their name),
      // otherwise the generic "Your order update" so the lock screen
      // still reads cleanly for system messages + non-member staff.
      title = senderName || "Your order update";
      break;
    case "clubhouse":
      title = senderName || "Clubhouse";
      break;
    default:
      title = senderName || "New message";
      break;
  }
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
  const result = await fanOut(subs, payloadStr, 4 * 60 * 60);
  return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
}

async function handleBroadcast(msg: any) {
  if (!msg?.club_id || !msg?.title) {
    return new Response(JSON.stringify({ ok: false, error: "missing fields", got: msg ? Object.keys(msg) : null }), { status: 400, headers: { "content-type": "application/json" } });
  }
  if (!msg.published_at) {
    return new Response(JSON.stringify({ sent: 0, reason: "unpublished draft" }), { headers: { "content-type": "application/json" } });
  }

  const { data: clubRow } = await supabase
    .from("clubs")
    .select("name")
    .eq("id", msg.club_id)
    .maybeSingle();
  const clubName = clubRow?.name || "Your club";

  const { data: members } = await supabase
    .from("members")
    .select("user_id")
    .eq("club_id", msg.club_id)
    .not("user_id", "is", null);
  const recipientUserIds = (members || [])
    .map((m: any) => m.user_id)
    .filter(Boolean);
  if (recipientUserIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no members" }), { headers: { "content-type": "application/json" } });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", recipientUserIds);
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), { headers: { "content-type": "application/json" } });
  }

  const urgency = (msg.urgency || "normal").toLowerCase();
  const urgentPrefix = urgency === "urgent" ? "🔔 URGENT · " : "";
  const title = `${urgentPrefix}${clubName} · ${msg.title}`;
  const bodyPreview = (msg.body || "").slice(0, 140);

  const ttl = urgency === "urgent" ? 24 * 60 * 60 : urgency === "high" ? 12 * 60 * 60 : 4 * 60 * 60;

  const notification = {
    title,
    body: bodyPreview,
    data: {
      kind: "broadcast",
      urgency,
      broadcastId: msg.id,
      url: "/inbox",
    },
  };
  const payloadStr = JSON.stringify(notification);
  const result = await fanOut(subs, payloadStr, ttl);
  return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.searchParams.get("diag") === "1") {
    return new Response(JSON.stringify({
      version: 8,
      vapidOk,
      vapidErr,
      vapidDiag,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceKey: !!SERVICE_KEY,
    }, null, 2), { headers: { "content-type": "application/json" } });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!vapidOk) {
    return new Response(JSON.stringify({ ok: false, error: vapidErr, vapidDiag }, null, 2), { status: 500, headers: { "content-type": "application/json" } });
  }

  let payload: any;
  try { payload = await req.json(); } catch { return new Response("bad json", { status: 400 }); }

  const table = payload.table;
  const msg = payload.record;

  if (table === "notification_messages") {
    return await handleBroadcast(msg);
  }
  return await handleThreadMessage(msg);
});
