# Supabase — schema is managed by migrations

There are **no bootstrap SQL files** in this folder. The schema lives in
**numbered migrations applied via the Supabase MCP server** during the
build conversation. As of v0.8.8 we're at migration 48.

To inspect the current state:

- **Migration history:** Supabase Dashboard → Database → Migrations, or
  `mcp__supabase__list_migrations`.
- **Live schema / RLS / policies:** Supabase Dashboard → Database →
  Tables / Policies, or query `pg_policies`, `pg_proc`,
  `information_schema`.
- **What changed in each version:** [`../CHANGELOG.md`](../CHANGELOG.md)
  documents which migration shipped in which app release.

## Edge Functions

Live functions (deployed via MCP, sources not checked into this repo):

| Slug | Auth | Purpose |
|---|---|---|
| `send-push` | JWT required | Database webhook target — fans out Web Push to each non-sender participant |
| `provision-club-domain` | JWT required | Called from Super Admin → New Club; creates the Cloudflare DNS CNAME |
| `guest-register` | **Public** (no JWT) | Backs the `/guest/<slug>` landing — validates QR token, creates Auth user via magic link, inserts guest + initial visit |
| `guest-link` | JWT required | Member-initiated guest link generator (returns signed QR URL) |
| `guest-qr-token` | JWT required | Admin-side rotator for the clubhouse QR token |

## Secrets

These must be set on the Supabase project (Dashboard → Edge Functions →
Secrets):

- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` — Web Push
- `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ZONE_ID` — DNS provisioning
- `SUPABASE_SERVICE_ROLE_KEY` is auto-injected; doubles as the HMAC seed
  for guest-QR signatures (key derivation: `service_role + ':guest-qr-v1'`)

## Realtime publication

Every content table is in the `supabase_realtime` publication. Adding a
new content table? Include
`alter publication supabase_realtime add table public.<your_table>` in
its migration.
