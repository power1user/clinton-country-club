// submit-support-ticket v1 — in-app ticket creation (v0.13.8).
//
// Called by the admin-side ContactSupportModal when a logged-in admin
// (super_admin, club_manager, or club_admin) clicks Submit. Creates
// a support_threads + support_messages row directly, auto-capturing
// the user's identity, club context, and a small browser metadata blob.
//
// Auth scope: super_admin OR (club_manager / club_admin) at the
// posted club_id. Members keep using the v0.10.14 Help & Support
// surface on the member side.
//
// REQUEST:
//   POST /submit-support-ticket
//   Authorization: Bearer <user JWT>
//   { category, subject, body_text, club_id?, url?, user_agent? }
//
// The push trigger from v0.13.2 fires automatically on the inserted
// support_messages row (direction='in') — every super_admin gets the
// notification.

// @ts-ignore Deno-only
import { createClient } from "npm:@supabase/supabase-js@2.45.1";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY       = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { "content-type": "application/json", ...CORS },
  });
}

const ALLOWED_CATEGORIES = new Set(["user_help", "admin_help", "bug", "enhancement", "other"]);

async function checkAdmin(authHeader: string, postedClubId: string | null) {
  if (!authHeader.startsWith("Bearer ")) return { ok: false, error: "missing auth" };
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return { ok: false, error: "invalid token" };

  // The Grounds schema: user_roles.club_id (not tenant_id — see
  // v0.13.7 hotfix). super_admin rows have club_id IS NULL; other
  // admin roles have a specific club_id.
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

  return { ok: true, user_id: u.user.id, is_super: isSuper };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }

  const category    = String(body?.category   || "").trim();
  const subjectIn   = String(body?.subject    || "").trim();
  const bodyText    = String(body?.body_text  || "").trim();
  const clubId      = body?.club_id ? String(body.club_id) : null;
  const url         = body?.url ? String(body.url).slice(0, 500) : null;
  const userAgent   = body?.user_agent ? String(body.user_agent).slice(0, 500) : null;

  if (!ALLOWED_CATEGORIES.has(category)) {
    return json({ ok: false, error: "category required (user_help / admin_help / bug / enhancement / other)" }, 400);
  }
  if (!subjectIn || !bodyText) {
    return json({ ok: false, error: "subject + body_text required" }, 400);
  }

  const authCheck = await checkAdmin(req.headers.get("authorization") || "", clubId);
  if (!authCheck.ok) return json({ ok: false, error: authCheck.error }, 401);

  // Resolve sender identity.
  let fromAddr: string | null = null;
  let fromName: string | null = null;
  let fromMemberId: string | null = null;
  if (clubId) {
    const { data: member } = await admin
      .from("members")
      .select("id, name, email")
      .eq("user_id", authCheck.user_id)
      .eq("club_id", clubId)
      .maybeSingle();
    if (member) {
      fromAddr     = (member.email || "").toLowerCase() || null;
      fromName     = member.name || null;
      fromMemberId = member.id;
    }
  }
  if (!fromAddr) {
    const { data: u } = await admin.auth.admin.getUserById(authCheck.user_id!);
    fromAddr = (u?.user?.email || "").toLowerCase() || null;
    fromName = fromName || u?.user?.user_metadata?.name || (u?.user?.email?.split("@")[0] || "Admin");
  }
  if (!fromAddr) {
    return json({ ok: false, error: "could not resolve sender email" }, 422);
  }

  const subjectTrimmed = subjectIn.slice(0, 500);

  const { data: thread, error: tErr } = await admin
    .from("support_threads")
    .insert({
      subject:        subjectTrimmed,
      from_addr:      fromAddr,
      from_name:      fromName,
      from_member_id: fromMemberId,
      from_club_id:   clubId,
      status:         "open",
      category:       category,
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (tErr || !thread) {
    console.error("[submit-support-ticket] thread insert failed:", tErr);
    return json({ ok: false, error: "thread insert failed", detail: tErr?.message }, 500);
  }

  const contextLines = [
    `--`,
    `Submitted via The Grounds admin`,
    url       ? `Page: ${url}`         : null,
    userAgent ? `Browser: ${userAgent}` : null,
    clubId    ? `Club: ${clubId}`       : null,
  ].filter(Boolean).join("\n");
  const fullBody = bodyText + "\n\n" + contextLines;

  const inboundMessageId = `<inapp-${crypto.randomUUID()}@groundslive.com>`;
  const { data: msg, error: mErr } = await admin
    .from("support_messages")
    .insert({
      thread_id: thread.id,
      direction: "in",
      message_id: inboundMessageId,
      from_addr: fromAddr,
      from_name: fromName,
      to_addrs: ["support@groundslive.com"],
      cc_addrs: [],
      subject: subjectTrimmed,
      body_text: fullBody,
      raw_size_bytes: fullBody.length,
      has_attachments: false,
      received_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (mErr) {
    return json({ ok: false, error: "message insert failed", detail: mErr.message, thread_id: thread.id }, 500);
  }

  return json({ ok: true, thread_id: thread.id, message_id: msg!.id });
});
