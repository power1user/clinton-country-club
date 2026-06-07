// timeFormat.js — v0.15.32
//
// Smart relative timestamp formatters for chat-style surfaces. The
// rule: same-day messages keep the compact "3:42 PM" shape; anything
// older gets enough date context that a member returning the next day
// (or next week) can immediately tell how old a message is. This was
// previously broken: every Thread bubble + the admin notification feed
// rendered time only, which is fine in an active chat but useless if
// you didn't check messages for a day.
//
// Inspired by Slack / iMessage / WhatsApp. Keep these consistent across
// every message-style surface in the app:
//   - Thread.jsx (clubhouse, DMs, food-order replies, support replies)
//   - AdminDashboard.jsx notification feed
//   - (anywhere else a "when did this happen" cue is needed)
//
// NOT used for:
//   - Food-order pickup time / pace-of-play "updated" — those are
//     inherently same-day signals; date would be noise.
//   - Audit-log rows — those use a fixed full timestamp so you can
//     read them as a historical record without ambiguity.

/**
 * Format a timestamp for a chat message or notification feed.
 *
 *   today          → "3:42 PM"
 *   yesterday      → "Yesterday · 3:42 PM"
 *   < 7 days back  → "Wed · 3:42 PM"
 *   same year      → "Mar 15 · 3:42 PM"
 *   older          → "Mar 15, 2024 · 3:42 PM"
 *
 * @param {string|Date} input  ISO string or Date
 * @returns {string}
 */
export function formatMessageTimestamp(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';

  const now   = new Date();
  const time  = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Compare by calendar day (not by 24-hour delta — "yesterday at 11pm"
  // shouldn't read as "Today 11pm" just because it's 23 hours ago).
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return time;

  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) {
    return `Yesterday · ${time}`;
  }

  // Within last 7 calendar days → weekday short name.
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);
  if (d >= weekAgo) {
    const wd = d.toLocaleDateString([], { weekday: 'short' });
    return `${wd} · ${time}`;
  }

  // Same calendar year → drop the year for brevity.
  if (d.getFullYear() === now.getFullYear()) {
    const md = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${md} · ${time}`;
  }

  const mdy = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  return `${mdy} · ${time}`;
}
