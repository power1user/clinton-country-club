// get-support-destinations v1 — the Cloudflare Email Worker calls
// this on every inbound message to fetch the current forward list.
// Auth via SUPPORT_INGEST_SECRET shared with the Worker.
//
// Returns: { destinations: [{ email, name }, ...] }
// Filtered to active=true AND verified_at IS NOT NULL so a pending-
// verification row never gets a forward attempt (would 4xx in CF).

// @ts-ignore Deno-only
import { createClient } from "npm:@supabase/supabase-js@2.45.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INGEST_SECRET = Deno.env.get("SUPPORT_INGEST_SECRET")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const auth = req.headers.get("authorization") || "";
  if (!INGEST_SECRET || auth !== `Bearer ${INGEST_SECRET}`) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
  }
  const { data, error } = await supabase
    .from("support_destinations")
    .select("email, name")
    .eq("active", true)
    .not("verified_at", "is", null);
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: { "content-type": "application/json" } });
  }
  return new Response(JSON.stringify({ destinations: data || [] }), {
    headers: { "content-type": "application/json", "cache-control": "max-age=30" },
  });
});
