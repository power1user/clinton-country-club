// peopleLift — v0.16.14, Task #52 stage 1 helper.
//
// Phase 16 created `people` as the single source of truth for the
// stable per-person fields (name, email, phone, photo_url, zip).
// Until v0.16.13, those fields were ALSO duplicated as columns on
// `members` and `guests`, kept in sync by triggers (v0.15.19).
//
// v0.16.14 — Task #52 stage 1 — refactors every read site to pull
// those fields from the embedded `people` row via the new FK
// (migration 0003_phase18_followup_members_guests_people_fk). The
// triggers + duplicate columns STAY RUNNING during the bake
// period as a safety net: if any read site is missed and still
// uses `member.name` directly, the column is still there and
// still synced — no breakage.
//
// v0.16.16 (stage 2c) dropped the duplicate columns, dropped the
// mirror triggers. The `?? row.X` fallbacks below are now dead
// code — m.name and friends are always undefined post-drop, so the
// fallback path never wins. Kept the fallbacks for two reasons:
//   1. Safety net if a stale client is still in flight during deploy
//   2. Minimal diff from v0.16.14's stage 1 commit
// They can be stripped in a future cleanup; until then they're
// harmless (a few extra undefined-coalesce ops per row).

// Stage 1 PostgREST embed strings. Use exactly as-is in
// `select('id, ..., people_member_select')` calls.
export const peopleMemberSelect = 'people(name, email, phone, photo_url)';
export const peopleGuestSelect  = 'people(name, email, phone, zip)';

// Lift the embedded people fields onto the member row so legacy
// consumer code reading `m.name` / `m.email` / `m.phone` /
// `m.photo_url` keeps working unchanged. Returns null if input
// is null/undefined (chainable with `.maybeSingle()`).
export function liftMember(m) {
  if (!m) return m;
  const p = m.people;
  return {
    ...m,
    name:      p?.name      ?? m.name,
    email:     p?.email     ?? m.email,
    phone:     p?.phone     ?? m.phone,
    photo_url: p?.photo_url ?? m.photo_url,
  };
}

// Same for guests — same four fields except zip instead of
// photo_url (guests don't have photos on their relation row).
export function liftGuest(g) {
  if (!g) return g;
  const p = g.people;
  return {
    ...g,
    name:  p?.name  ?? g.name,
    email: p?.email ?? g.email,
    phone: p?.phone ?? g.phone,
    zip:   p?.zip   ?? g.zip,
  };
}

// For arrays returned by list queries.
export function liftMembers(rows) {
  return Array.isArray(rows) ? rows.map(liftMember) : rows;
}
export function liftGuests(rows) {
  return Array.isArray(rows) ? rows.map(liftGuest) : rows;
}

// For RELATION joins where the parent row has a nested member or
// guest embed (e.g. food_orders[i].members.name). The relation
// embed itself contains a `people` sub-embed. Lift through it.
// Pass the relation key (default 'members'). Idempotent on rows
// that don't have the key (returns row unchanged).
export function liftMembersRelation(rows, key = 'members') {
  if (!Array.isArray(rows)) return rows;
  return rows.map(r => ({ ...r, [key]: liftMember(r[key]) }));
}
export function liftGuestsRelation(rows, key = 'guests') {
  if (!Array.isArray(rows)) return rows;
  return rows.map(r => ({ ...r, [key]: liftGuest(r[key]) }));
}
