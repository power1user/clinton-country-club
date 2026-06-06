// send-push v20 — fan-out Web Push for thread messages, admin
// broadcasts, AND support tickets.
//
// History:
//   · v6 (v0.10.9)  — sender identity in title
//   · v7 (v0.11.34) — notification_messages broadcast branch
//   · v8 (v0.12.7)  — order-thread recipient resolution (skip sender filter)
//   · v9 (v0.13.2)  — support_messages branch
//   · v19 (v0.15.12) — clubhouse threads fan out to club staff
//   · v20 (v0.15.13) — clubhouse threads route by topic → departments → users
//
// v20 — Phase 17 department-based routing for clubhouse.
//
// Before v20, every clubhouse message pushed to every staff member at
// the club (v19). That doesn't scale once a club has 30 people on
// staff — the kitchen doesn't need every Pro Shop ping. v20 reads the
// new `clubs.clubhouse_topic_routing` jsonb mapping (topic → dept
// slugs[]), resolves those slugs to department rows for the club,
// joins `user_departments` to get the assigned staff, and fans out
// only to that subset.
//
// Resolution rule for clubhouse (v20):
//   1. Look up clubs.clubhouse_topic_routing[thread.subject] → string[] of dept slugs
//   2. If unset or [] → fallback: all club_manager + club_admin staff (the v19 path)
//   3. Otherwise: club_departments by (club_id, slug) → ids → user_departments → user_ids
//   4. Always union with super_admins (club_id IS NULL)
//   5. Always union with existing thread_participants (so a member<->staff
//      back-and-forth keeps working even if the member isn't in any dept)
//   6. Sender exclusion as final filter
//
// Response shape adds `routing_mode: 'departments' | 'fallback_all_staff'`
// so the smoke-test preview tool + Edge Function logs can see which
// path fired without instrumenting per-call.
//
// v20 dispatch: branches on payload.table:
//   · 'notifications' / 'notification_messages' → handleBroadcast
//   · 'support_messages'                       → handleSupportTicket
//   · (anything else / messages)               → handleThreadMessage

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
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payloadStr, opts);
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

// ══════════════════════════════════════════════════════════════════════
// Thread messages — v20 (adds clubhouse → topic → departments routing)
// ══════════════════════════════════════════════════════════════════════
async function handleThreadMessage(msg: any) {
  if (!msg?.thread_id || !msg?.body) {
    return new Response(JSON.stringify({ ok: false, error: "missing fields", got: msg ? Object.keys(msg) : null }), { status: 400, headers: { "content-type": "application/json" } });
  }
  // v20 — also pull clubhouse_topic_routing so the clubhouse branch
  // below has the topic → dept slugs map in hand.
  const { data: thread } = await supabase
    .from("threads")
    .select("id, kind, subject, club_id, created_by, clubs(name, clubhouse_topic_routing)")
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

  // v20 — recipient resolution by thread kind.
  //
  // ORDER: customer-only push (skip participant lookup entirely).
  //
  // CLUBHOUSE: department-based routing per topic.
  //   1. routing[subject] = ["dept-slug", ...]
  //   2. If unset OR empty → fallback to all club_manager+club_admin staff
  //   3. Otherwise resolve slugs → dept ids → user_departments → user_ids
  //   4. Always union with super_admins + existing thread_participants
  //   5. Sender exclusion as final filter
  // Tracks `routingMode` so callers can tell which path fired (visible
  // in the response JSON + Edge Function logs).
  //
  // DM and everything else: participants minus sender.
  let recipientUserIds: string[] = [];
  let routingMode: string | null = null;
  const clubId = (thread as any).club_id;

  if (thread.kind === "order") {
    if ((thread as any).created_by) recipientUserIds = [(thread as any).created_by];
  } else if (thread.kind === "clubhouse" && clubId) {
    const routing = (thread as any).clubs?.clubhouse_topic_routing || {};
    const topic = thread.subject || "";
    const mappedSlugs: string[] = Array.isArray(routing[topic]) ? routing[topic] : [];

    const ids = new Set<string>();

    // Always: thread participants (so back-and-forth keeps working).
    const { data: participants } = await supabase
      .from("thread_participants").select("user_id")
      .eq("thread_id", msg.thread_id);
    (participants || []).forEach((p: any) => { if (p.user_id) ids.add(p.user_id); });

    // Always: super_admins.
    const { data: supers } = await supabase
      .from("user_roles").select("user_id")
      .eq("role", "super_admin").is("club_id", null);
    (supers || []).forEach((s: any) => { if (s.user_id) ids.add(s.user_id); });

    let routedCount = 0;
    if (mappedSlugs.length > 0) {
      // Resolve slugs → dept ids → user_ids in two queries.
      const { data: depts } = await supabase
        .from("club_departments").select("id")
        .eq("club_id", clubId).in("slug", mappedSlugs);
      const deptIds = (depts || []).map((d: any) => d.id);
      if (deptIds.length > 0) {
        const { data: assigned } = await supabase
          .from("user_departments").select("user_id")
          .eq("club_id", clubId).in("department_id", deptIds);
        (assigned || []).forEach((a: any) => {
          if (a.user_id) { ids.add(a.user_id); routedCount++; }
        });
      }
      routingMode = routedCount > 0 ? "departments" : "fallback_all_staff_empty_dept";
    } else {
      routingMode = "fallback_all_staff_no_routing";
    }

    // Fallback path: if department routing resolved zero NEW users
    // beyond participants+supers, OR if there's no routing for the
    // topic, push to all club_manager+club_admin staff so nothing
    // silently drops. Better noisy than missed.
    if (routingMode !== "departments") {
      const { data: staff } = await supabase
        .from("user_roles").select("user_id")
        .eq("club_id", clubId).in("role", ["club_manager", "club_admin"]);
      (staff || []).forEach((s: any) => { if (s.user_id) ids.add(s.user_id); });
    }

    recipientUserIds = Array.from(ids).filter((uid) => uid !== msg.sender_user_id);
  } else {
    const { data: participants } = await supabase
      .from("thread_participants")
      .select("user_id")
      .eq("thread_id", msg.thread_id);
    recipientUserIds = (participants || []).map((p: any) => p.user_id).filter((uid: string) => uid && uid !== msg.sender_user_id);
  }

  if (recipientUserIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no recipients", kind: thread.kind, routing_mode: routingMode }), { headers: { "content-type": "application/json" } });
  }
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", recipientUserIds);
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions", recipient_count: recipientUserIds.length, kind: thread.kind, routing_mode: routingMode }), { headers: { "content-type": "application/json" } });
  }
  const clubName = (thread as any).clubs?.name || "Your club";
  let title: string;
  switch (thread.kind) {
    case "order":     title = senderName || "Your order update"; break;
    case "clubhouse": title = senderName || "Clubhouse";        break;
    default:          title = senderName || "New message";       break;
  }
  if (thread.kind === "order" || thread.kind === "clubhouse") {
    title = `${clubName} · ${title}`;
  }
  // For clubhouse, include the topic so the admin can tell Pro Shop
  // from Restaurant at a glance on the lock screen.
  if (thread.kind === "clubhouse" && (thread as any).subject) {
    title = `${title} · ${(thread as any).subject}`;
  }
  const bodyPreview = (msg.body || "").slice(0, 140);
  const notification = { title, body: bodyPreview, data: { threadId: thread.id, kind: thread.kind, url: "/" } };
  const payloadStr = JSON.stringify(notification);
  const result = await fanOut(subs, payloadStr, 4 * 60 * 60);
  return new Response(JSON.stringify({ ...result, kind: thread.kind, recipient_count: recipientUserIds.length, routing_mode: routingMode }), { headers: { "content-type": "application/json" } });
}

// ══════════════════════════════════════════════════════════════════════
// Broadcast — v7 behavior
// ══════════════════════════════════════════════════════════════════════
async function handleBroadcast(msg: any) {
  if (!msg?.club_id || !msg?.title) {
    return new Response(JSON.stringify({ ok: false, error: "missing fields", got: msg ? Object.keys(msg) : null }), { status: 400, headers: { "content-type": "application/json" } });
  }
  if (!msg.published_at) {
    return new Response(JSON.stringify({ sent: 0, reason: "unpublished draft" }), { headers: { "content-type": "application/json" } });
  }
  const { data: clubRow } = await supabase
    .from("clubs").select("name").eq("id", msg.club_id).maybeSingle();
  const clubName = clubRow?.name || "Your club";
  const { data: members } = await supabase
    .from("members").select("user_id").eq("club_id", msg.club_id).not("user_id", "is", null);
  const recipientUserIds = (members || []).map((m: any) => m.user_id).filter(Boolean);
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
  const notification = { title, body: bodyPreview, data: { kind: "broadcast", urgency, broadcastId: msg.id, url: "/inbox" } };
  const payloadStr = JSON.stringify(notification);
  const result = await fanOut(subs, payloadStr, ttl);
  return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
}

// ══════════════════════════════════════════════════════════════════════
// Support tickets — v9 behavior
// ══════════════════════════════════════════════════════════════════════
async function handleSupportTicket(msg: any) {
  if (!msg?.thread_id) {
    return new Response(JSON.stringify({ ok: false, error: "missing thread_id" }), { status: 400, headers: { "content-type": "application/json" } });
  }
  if (msg.direction !== "in") {
    return new Response(JSON.stringify({ sent: 0, reason: "outbound message" }), { headers: { "content-type": "application/json" } });
  }
  const { data: superAdmins } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "super_admin")
    .is("tenant_id", null);
  const recipientUserIds = (superAdmins || []).map((r: any) => r.user_id).filter(Boolean);
  if (recipientUserIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no super_admins" }), { headers: { "content-type": "application/json" } });
  }
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", recipientUserIds);
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), { headers: { "content-type": "application/json" } });
  }
  const sender = msg.from_name || msg.from_addr || "Unknown sender";
  const subjectPart = msg.subject ? `${msg.subject} — ` : "";
  const bodyPreview = `${subjectPart}${(msg.body_text || "").slice(0, 120)}`;
  const notification = {
    title: `Support · ${sender}`,
    body: bodyPreview,
    data: {
      kind: "support",
      threadId: msg.thread_id,
      messageId: msg.id,
      url: `/admin/?area=platform&section=support&thread=${msg.thread_id}`,
    },
  };
  const payloadStr = JSON.stringify(notification);
  const result = await fanOut(subs, payloadStr, 12 * 60 * 60);
  return new Response(JSON.stringify(result), { headers: { "content-type": "application/json" } });
}

// ══════════════════════════════════════════════════════════════════════
// HTTP dispatcher
// ══════════════════════════════════════════════════════════════════════
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (url.searchParams.get("diag") === "1") {
    return new Response(JSON.stringify({
      version: 20,
      vapidOk, vapidErr, vapidDiag,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceKey: !!SERVICE_KEY,
    }, null, 2), { headers: { "content-type": "application/json" } });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!vapidOk) {
    return new Response(JSON.stringify({ ok: false, error: vapidErr, vapidDiag }, null, 2), { status: 500, headers: { "content-type": "application/json" } });
  }
  let payload: any;
  try { payload = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  const table = payload.table;
  const msg = payload.record;
  if (table === "notification_messages" || table === "notifications") {
    return await handleBroadcast(msg);
  }
  if (table === "support_messages") {
    return await handleSupportTicket(msg);
  }
  return await handleThreadMessage(msg);
});
