// docs — serve HTML files from the private/public 'docs' storage
// bucket with the proper text/html Content-Type. Supabase Storage
// clamps all HTML to text/plain (security policy: prevents uploaded
// HTML from executing in your domain context). This function reads
// the file via the service role and re-streams it with the right
// Content-Type so it renders properly in browsers.
//
// Route: GET /functions/v1/docs?name=<filename>
//        Default filename = grounds-architecture.html
//
// Public (verify_jwt=false). Access is gated by the client-side
// password gate inside the served HTML itself — the function is
// just a delivery vehicle, not an auth layer.

// @ts-ignore - Deno-only import
import { createClient } from "npm:@supabase/supabase-js@2.45.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Allowlist of files this function will serve. Keeps the function
// from being repurposed to serve arbitrary uploads.
const ALLOWED = new Set<string>([
  "grounds-architecture.html",
]);

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") || "grounds-architecture.html";

  if (!ALLOWED.has(name)) {
    return new Response("Not found", { status: 404 });
  }

  const { data, error } = await supabase.storage.from("docs").download(name);
  if (error || !data) {
    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
  }

  const body = await data.text();
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache, no-store, must-revalidate",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
});
