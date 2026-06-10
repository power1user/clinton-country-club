// messaging.js — transactional vs marketing classification + consent
// check helpers. v0.18.0.
//
// Why this file exists: the ToU and signup handoff draw a hard line
// between TRANSACTIONAL messages (account, orders, events, security —
// tied to a member action, never gated by marketing opt-in) and
// MARKETING messages (promotions, news, "come to our event" — require
// matching opt-in at SEND TIME, not list-build time).
//
// Anything that sends an email, push, or text on behalf of a member's
// club should call messageClass(category) first, and if it's
// 'marketing' should also call canSendMarketing(person, channel) before
// hitting the send API. Transactional sends skip the check.

export const MESSAGE_CLASSES = Object.freeze({
  TRANSACTIONAL: 'transactional',
  MARKETING: 'marketing',
});

// Authoritative classification of every category we send today. New
// categories must be added here — anything not listed is treated as
// MARKETING (fail-safe: don't accidentally send marketing without
// consent because someone forgot to register the category).
const CATEGORY_CLASS = Object.freeze({
  // Transactional — tied to a specific member action or essential
  // account/service notice. Never gated on marketing opt-in.
  account_security:      MESSAGE_CLASSES.TRANSACTIONAL,
  account_notice:        MESSAGE_CLASSES.TRANSACTIONAL,
  order_status:          MESSAGE_CLASSES.TRANSACTIONAL,
  order_ready:           MESSAGE_CLASSES.TRANSACTIONAL,
  event_confirmation:    MESSAGE_CLASSES.TRANSACTIONAL,
  event_reminder_rsvp:   MESSAGE_CLASSES.TRANSACTIONAL, // they RSVP'd → they get the reminder
  club_status_change:    MESSAGE_CLASSES.TRANSACTIONAL,
  direct_message:        MESSAGE_CLASSES.TRANSACTIONAL,
  member_requested_alert: MESSAGE_CLASSES.TRANSACTIONAL, // course-closed alerts they opted into
  support_reply:         MESSAGE_CLASSES.TRANSACTIONAL,

  // Marketing — promotional / opt-in required.
  newsletter:            MESSAGE_CLASSES.MARKETING,
  promotional:           MESSAGE_CLASSES.MARKETING,
  event_invitation:      MESSAGE_CLASSES.MARKETING, // "come to our upcoming event" (vs RSVP reminder)
  club_announcement_marketing: MESSAGE_CLASSES.MARKETING,
});

export function messageClass(category) {
  return CATEGORY_CLASS[category] || MESSAGE_CLASSES.MARKETING;
}

/**
 * Can we send a marketing message to this person via this channel?
 * Channel: 'email' | 'sms' | 'push'.
 *
 * person: object with email_marketing_opt_in, sms_marketing_opt_in
 *         columns from the people row (or any object exposing them).
 *
 * Push notifications are NOT classified as marketing — they're a
 * device-level subscription the member already controls in OS
 * settings + their NotificationsToggle. If someone has a push token
 * registered and we send to a marketing-tagged push, that's still
 * fine because they affirmatively opted in to push at the device
 * level. Push consent is its own channel.
 */
export function canSendMarketing(person, channel) {
  if (!person) return false;
  if (channel === 'email') return !!person.email_marketing_opt_in;
  if (channel === 'sms')   return !!person.sms_marketing_opt_in;
  if (channel === 'push')  return true;
  return false;
}

/**
 * Convenience: decide whether to send. Returns { send: boolean, reason: string }.
 * - send=true,  reason='transactional' → always send, no consent gate
 * - send=true,  reason='consented'     → marketing with valid opt-in
 * - send=false, reason='no_consent'    → marketing without opt-in (skip)
 */
export function shouldSend(category, person, channel) {
  const cls = messageClass(category);
  if (cls === MESSAGE_CLASSES.TRANSACTIONAL) return { send: true, reason: 'transactional' };
  return canSendMarketing(person, channel)
    ? { send: true, reason: 'consented' }
    : { send: false, reason: 'no_consent' };
}
