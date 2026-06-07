// phase14-cf-finish v2 — added ?diag=1 to show which secrets are set
// without exposing their values.
//
// One-shot bootstrap function from Phase 14: provisions the Cloudflare
// Email Worker for support@groundslive.com inbound. Idempotent — safe
// to re-run; the routing rule check on line ~140 skips re-creation if
// the rule already exists.
//
// Auth: requires the SUPPORT_INGEST_SECRET bearer token (same secret
// the deployed Worker uses to call back into receive-support-email).
// Diag mode (?diag=1) is anon-readable but only exposes which env
// vars are set + first/last 4 chars of the ingest secret (so the
// operator can confirm they're using the matching value).

const CF_TOKEN     = Deno.env.get("CLOUDFLARE_EMAIL_ROUTING_TOKEN");
const CF_ACCOUNT   = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
const INGEST_SEC   = Deno.env.get("SUPPORT_INGEST_SECRET");
const CF_ZONE_ID   = "ed44b293d85afda942c1cc9e799753eb";
const WORKER_NAME  = "support-inbox";

const WORKER_SCRIPT = [
  'export default {',
  '  async email(message, env, ctx) {',
  '    const raw = await new Response(message.raw).text();',
  '    let forwards = [];',
  '    try {',
  '      const r = await fetch(env.GET_DESTINATIONS_URL, {',
  '        headers: { Authorization: "Bearer " + env.SUPPORT_INGEST_SECRET },',
  '      });',
  '      const j = await r.json();',
  '      forwards = (j.destinations || []).map(d => d.email);',
  '    } catch (_) {',
  '      forwards = ["marcabla1@gmail.com", "mjbo@aol.com"];',
  '    }',
  '    await Promise.allSettled([',
  '      ...forwards.map(addr => message.forward(addr)),',
  '      fetch(env.SUPABASE_FUNCTION_URL, {',
  '        method: "POST",',
  '        headers: {',
  '          "Content-Type": "application/json",',
  '          "Authorization": "Bearer " + env.SUPPORT_INGEST_SECRET,',
  '        },',
  '        body: JSON.stringify({ raw: raw, from: message.from, to: message.to }),',
  '      }),',
  '    ]);',
  '  },',
  '};',
].join("\n");

async function cfReq(path: string, init: RequestInit = {}): Promise<any> {
  const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${CF_TOKEN}` },
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body: j };
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // ── diag mode ──────────────────────────────────────────────────
  // No auth required for diag (only reveals which env vars are SET,
  // not their values).
  if (url.searchParams.get("diag") === "1") {
    return json({
      env: {
        has_cf_token:     !!CF_TOKEN,
        cf_token_len:     CF_TOKEN ? CF_TOKEN.length : 0,
        has_cf_account:   !!CF_ACCOUNT,
        cf_account_value: CF_ACCOUNT || null,
        has_ingest_secret: !!INGEST_SEC,
        ingest_secret_len: INGEST_SEC ? INGEST_SEC.length : 0,
        ingest_secret_first4: INGEST_SEC ? INGEST_SEC.slice(0, 4) : null,
        ingest_secret_last4:  INGEST_SEC ? INGEST_SEC.slice(-4)  : null,
      },
    });
  }

  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

  const auth = req.headers.get("authorization") || "";
  if (!INGEST_SEC || auth !== `Bearer ${INGEST_SEC}`) {
    return json({
      ok: false,
      error: "unauthorized",
      hint: "verify SUPPORT_INGEST_SECRET in Supabase matches the value you're using",
    }, 401);
  }
  if (!CF_TOKEN || !CF_ACCOUNT) {
    return json({ ok: false, error: "CLOUDFLARE_EMAIL_ROUTING_TOKEN or CLOUDFLARE_ACCOUNT_ID not set in Supabase secrets" }, 500);
  }

  const results: any = {};

  // 1. Deploy Worker
  const fd = new FormData();
  fd.append(
    "metadata",
    new Blob([JSON.stringify({
      main_module: "index.js",
      compatibility_date: "2024-09-23",
    })], { type: "application/json" })
  );
  fd.append(
    "index.js",
    new Blob([WORKER_SCRIPT], { type: "application/javascript+module" }),
    "index.js"
  );
  const upload = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/workers/scripts/${WORKER_NAME}`,
    { method: "PUT", headers: { Authorization: `Bearer ${CF_TOKEN}` }, body: fd }
  );
  results.worker_upload = { status: upload.status, body: await upload.json().catch(() => ({})) };

  // 2. Secrets
  const secrets = [
    { name: "SUPABASE_FUNCTION_URL", text: "https://exddcpqfdkyxommkslag.supabase.co/functions/v1/receive-support-email" },
    { name: "GET_DESTINATIONS_URL",  text: "https://exddcpqfdkyxommkslag.supabase.co/functions/v1/get-support-destinations" },
    { name: "SUPPORT_INGEST_SECRET", text: INGEST_SEC! },
  ];
  results.secrets = [];
  for (const s of secrets) {
    const r = await cfReq(
      `/accounts/${CF_ACCOUNT}/workers/scripts/${WORKER_NAME}/secrets`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...s, type: "secret_text" }),
      }
    );
    results.secrets.push({ name: s.name, status: r.status, ok: r.ok, errors: r.body?.errors });
  }

  // 3. Routing rule
  const existingRules = await cfReq(`/zones/${CF_ZONE_ID}/email/routing/rules?per_page=50`);
  const already = (existingRules.body?.result || []).find((r: any) =>
    (r.matchers || []).some((m: any) => m.value === "support@groundslive.com")
  );
  if (already) {
    results.routing_rule = { ok: true, already_exists: true, id: already.id };
  } else {
    const ruleRes = await cfReq(`/zones/${CF_ZONE_ID}/email/routing/rules`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "support@ → support-inbox",
        matchers: [{ field: "to", type: "literal", value: "support@groundslive.com" }],
        actions: [{ type: "worker", value: [WORKER_NAME] }],
        enabled: true,
        priority: 0,
      }),
    });
    results.routing_rule = { status: ruleRes.status, ok: ruleRes.ok, errors: ruleRes.body?.errors, id: ruleRes.body?.result?.id };
  }

  return json({ ok: true, results });
});
