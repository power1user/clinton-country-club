// manage-support-destinations v1 — super_admin CRUD on the support
// team forward list. Wraps Cloudflare's Email Routing destinations
// API so adding/removing a person from the team is one click in the
// admin UI, not editing Worker code.
//
// REQUIRED SECRETS:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto)
//   CLOUDFLARE_EMAIL_ROUTING_TOKEN — token w/ Account.Email Routing.Edit
//   CLOUDFLARE_ACCOUNT_ID          — same as provision-club-domain
//
// VERB MATRIX:
//   GET    /            → list rows + sync status from Cloudflare
//   POST   /            → { email, name } add destination + trigger CF verification email
//   DELETE / { id }     → remove destination (CF + DB)
//   POST   /sync        → reconcile DB rows with Cloudflare's actual destinations,
//                          backfill cf_destination_id, flip verified_at on newly verified rows
//
// Auth: super_admin JWT (verify_jwt=true) AND a second in-function
// role check (defense in depth, same pattern as provision-club-domain).

// @ts-ignore Deno-only
import { createClient } from "npm:@supabase/supabase-js@2.45.1";

const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY           = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CF_TOKEN              = Deno.env.get("CLOUDFLARE_EMAIL_ROUTING_TOKEN");
const CF_ACCOUNT_ID         = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};
function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });
}

async function checkSuperAdmin(authHeader: string): Promise<{ ok: boolean; user_id?: string; error?: string }> {
  if (!authHeader.startsWith("Bearer ")) return { ok: false, error: "missing auth" };
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return { ok: false, error: "invalid token" };
  const { data: roles } = await sb
    .from("user_roles")
    .select("role, tenant_id")
    .eq("user_id", u.user.id);
  const isSuper = (roles || []).some((r: any) => r.role === "super_admin" && r.tenant_id === null);
  if (!isSuper) return { ok: false, error: "super_admin required" };
  return { ok: true, user_id: u.user.id };
}

async function cfList(): Promise<any[]> {
  if (!CF_TOKEN || !CF_ACCOUNT_ID) throw new Error("CLOUDFLARE_EMAIL_ROUTING_TOKEN / CLOUDFLARE_ACCOUNT_ID not configured");
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/email/routing/addresses?per_page=50`,
    { headers: { Authorization: `Bearer ${CF_TOKEN}` } }
  );
  const j = await r.json();
  if (!j.success) throw new Error(`CF list failed: ${JSON.stringify(j.errors)}`);
  return j.result || [];
}

async function cfCreate(email: string): Promise<{ id: string }> {
  if (!CF_TOKEN || !CF_ACCOUNT_ID) throw new Error("CF credentials missing");
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/email/routing/addresses`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }
  );
  const j = await r.json();
  if (!j.success) throw new Error(j.errors?.[0]?.message || "CF create failed");
  return j.result;
}

async function cfDelete(destinationId: string): Promise<void> {
  if (!CF_TOKEN || !CF_ACCOUNT_ID) throw new Error("CF credentials missing");
  await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/email/routing/addresses/${destinationId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${CF_TOKEN}` } }
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const auth = await checkSuperAdmin(req.headers.get("authorization") || "");
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401);

  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();

  try {
    // ── GET (list) ────────────────────────────────────────────────
    if (req.method === "GET") {
      const { data: rows } = await admin
        .from("support_destinations")
        .select("*")
        .order("added_at", { ascending: true });
      return json({ ok: true, destinations: rows || [] });
    }

    // ── POST /sync ────────────────────────────────────────────────
    // Reconcile DB with Cloudflare's actual destination list. Backfills
    // cf_destination_id and flips verified_at on newly verified rows.
    if (req.method === "POST" && action === "sync") {
      const cfRows = await cfList();
      let updated = 0;
      for (const cf of cfRows) {
        const { data: existing } = await admin
          .from("support_destinations")
          .select("id, cf_destination_id, verified_at")
          .eq("email", cf.email.toLowerCase())
          .maybeSingle();
        if (!existing) continue; // CF has a destination we don't track — ignore
        const patch: any = {};
        if (!existing.cf_destination_id) patch.cf_destination_id = cf.tag || cf.id;
        if (cf.verified && !existing.verified_at) patch.verified_at = new Date().toISOString();
        if (Object.keys(patch).length) {
          await admin.from("support_destinations").update(patch).eq("id", existing.id);
          updated++;
        }
      }
      return json({ ok: true, synced: updated, cf_count: cfRows.length });
    }

    // ── POST (create) ─────────────────────────────────────────────
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const email = String(body?.email || "").trim().toLowerCase();
      const name  = String(body?.name  || "").trim();
      if (!email || !name) return json({ ok: false, error: "email + name required" }, 400);

      // 1. Cloudflare register
      let cfId: string;
      try {
        const cfRes = await cfCreate(email);
        cfId = cfRes.tag || cfRes.id;
      } catch (e: any) {
        return json({ ok: false, error: `Cloudflare API: ${e.message || e}` }, 502);
      }

      // 2. DB insert
      const { data: inserted, error: ierr } = await admin
        .from("support_destinations")
        .insert({ email, name, active: true, cf_destination_id: cfId, added_by: auth.user_id, verified_at: null })
        .select("*")
        .single();
      if (ierr) return json({ ok: false, error: ierr.message }, 500);
      return json({ ok: true, destination: inserted });
    }

    // ── DELETE { id } ─────────────────────────────────────────────
    if (req.method === "DELETE") {
      const body = await req.json().catch(() => ({}));
      const id = body?.id;
      if (!id) return json({ ok: false, error: "id required" }, 400);
      const { data: row } = await admin
        .from("support_destinations")
        .select("cf_destination_id")
        .eq("id", id)
        .maybeSingle();
      if (row?.cf_destination_id) {
        try { await cfDelete(row.cf_destination_id); } catch (_) { /* tolerate — we still want to remove from DB */ }
      }
      await admin.from("support_destinations").delete().eq("id", id);
      return json({ ok: true });
    }

    return json({ ok: false, error: "unknown action" }, 400);
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
});
