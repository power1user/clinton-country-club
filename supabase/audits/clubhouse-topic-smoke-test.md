# Clubhouse topic-routing smoke test

Closes **Task #30** (queued from v0.15.13 when topic routing shipped).
Confirms that a member-sent clubhouse message with each topic
fan-outs the push notification to exactly the expected recipients
per the club's `clubhouse_topic_routing` config — and to nobody else.

This test is **manual**: it requires real iOS/Android devices with
GroundsLive installed as a PWA and Web Push subscriptions active,
because Web Push delivery itself is the assertion under test. The
`send-push` Edge Function returns `{sent: N}` for the count of
*attempted* deliveries — that doesn't prove a notification actually
appeared on screen.

Estimated time: **20–25 minutes** once devices and accounts are
prepped. Worth running through fully at least once per minor that
touches send-push, departments, or topic_routing.

---

## The 5 topics

From `src/screens/MessageClubhouse.jsx`:

| # | Topic ID | Member-facing description |
|---|---|---|
| 1 | `Pro Shop`   | Lessons, equipment, fittings, tee-time requests |
| 2 | `Restaurant` | Reservations, menu questions, dietary needs |
| 3 | `Tee Times`  | Booking, changes, cancellations, foursomes |
| 4 | `Course`     | Conditions, pace of play, pin placements |
| 5 | `General`    | Anything else for the front office |

Each topic maps to one or more **departments** via
`clubs.clubhouse_topic_routing` (jsonb). Departments map to **users**
via `user_departments`. Fan-out: send-push v20 resolves
topic → departments → user_ids and pushes to each user's active
subscriptions, **excluding the sender** (audit round 2 fix).

---

## Prep (one-time)

Before running the matrix, confirm at the test club:

- [ ] **At least 3 distinct staff users** exist (sender doesn't count
      — sender is excluded from the fan-out). Call them A, B, C.
- [ ] **At least 2 distinct departments** exist (e.g. "Pro Shop"
      and "Restaurant" departments).
- [ ] User A → department X, User B → department Y, User C → both.
- [ ] **Topic routing** in Club Settings → Topic Routing:
  - `Pro Shop`   → department X
  - `Restaurant` → department Y
  - `Tee Times`  → department X
  - `Course`     → department X
  - `General`    → department Y
  (Or whatever your actual config — record it below and use it.)
- [ ] All three users have **active Web Push subscriptions** on at
      least one device (check `web_push_subscriptions` table; rows
      with `disabled_at IS NULL` and recent `updated_at`).
- [ ] A regular member account (M) to send from. M is NOT staff and
      NOT in any department.
- [ ] All four accounts have the PWA installed + DND off + screen
      visible while testing.

If any prep step fails, fix that first — don't try to interpret a
fan-out result against an unknown configuration.

---

## Test matrix

For each topic, send one clubhouse message AS user M and record
what arrives where.

### Topic 1 — `Pro Shop` → department X

Expected: A and C (department X members), NOT B, NOT M.

- [ ] User A receives push (with sound/banner/lockscreen)
- [ ] User C receives push
- [ ] User B does NOT receive push
- [ ] User M (sender) does NOT receive push
- [ ] Push title includes the topic name or routes to /messages
- [ ] Tap → opens GroundsLive at the correct admin thread

### Topic 2 — `Restaurant` → department Y

Expected: B and C, NOT A, NOT M.

- [ ] User B receives push
- [ ] User C receives push
- [ ] User A does NOT receive push
- [ ] User M does NOT receive push

### Topic 3 — `Tee Times` → department X

Expected: A and C, NOT B, NOT M. (Same as Topic 1, sanity check
that routing isn't accidentally hardcoded to "Pro Shop" only.)

- [ ] User A receives push
- [ ] User C receives push
- [ ] User B does NOT receive push
- [ ] User M does NOT receive push

### Topic 4 — `Course` → department X

Expected: A and C, NOT B, NOT M.

- [ ] User A receives push
- [ ] User C receives push
- [ ] User B does NOT receive push
- [ ] User M does NOT receive push

### Topic 5 — `General` → department Y

Expected: B and C, NOT A, NOT M.

- [ ] User B receives push
- [ ] User C receives push
- [ ] User A does NOT receive push
- [ ] User M does NOT receive push

---

## Verification queries

After each test, you can sanity-check the **server-side fan-out**
even if push delivery fails on a device:

```sql
-- send-push records what it ATTEMPTED to send. Check this matches
-- the expected recipient set for the topic you just tested.
select
  pql.created_at,
  pql.context_type,
  pql.context_id,
  pql.user_ids_sent,
  pql.skip_reason
from public.push_queue_log as pql
where pql.created_at > now() - interval '5 minutes'
order by pql.created_at desc
limit 5;
```

If `user_ids_sent` includes the right users but the device didn't
buzz, the bug is in push delivery (SW, VAPID, subscription expiry —
see `~/.claude/skills/web-push/`), not in routing.

If `user_ids_sent` is wrong, the bug IS in routing: check the
`clubhouse_topic_routing` config and `user_departments` rows.

---

## Known silent failure modes (cross-reference with web-push skill)

When push doesn't appear but `{sent: N>0}` came back from send-push:

1. **SW `tag` + `renotify: false` collision** — successive
   notifications with the same `tag` and no `renotify:true` are
   *silently merged*. send-push v20 sets `tag = thread_id` so two
   messages on the same thread can collide. If this is happening:
   verify `renotify: true` in `public/sw.js` showNotification call.

2. **Sender-exclusion filter too aggressive** — send-push excludes
   the sender by user_id. If user_id is missing on a row (e.g.
   department-level routing fan-out), the filter can sometimes
   exclude the wrong row. v0.15.13 + v0.16.0 fixed this.

3. **Missing trigger for new pushable surface** — if a NEW message
   type doesn't trigger send-push, there's a missing DB trigger.
   Check `pg_trigger` for trigger on `clubhouse_messages` (or the
   relevant table).

If a topic test fails, jump to the **web-push skill** before
hand-debugging:

    ~/.claude/skills/web-push/SKILL.md

---

## Test outcome

Date run: __________________

Outcome:
- [ ] All 5 topics route correctly to their configured departments
- [ ] Sender never receives their own push
- [ ] Push delivery works on iOS Safari PWA
- [ ] Push delivery works on Android Chrome PWA
- [ ] Push tap → opens at the correct admin thread

Failures noted (if any):

  _________________________________________________________

  _________________________________________________________

  _________________________________________________________

Sign off → mark Task #30 complete.
