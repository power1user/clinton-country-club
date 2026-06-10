// messaging.ts — server-side mirror of src/lib/messaging.js. v0.18.0.
//
// Edge Functions can't import from the React project, so this file
// keeps the same classifications + helpers available in Deno.
// CRITICAL: keep this in sync with src/lib/messaging.js whenever a
// new category is added.

export const MESSAGE_CLASSES = {
  TRANSACTIONAL: 'transactional',
  MARKETING:     'marketing',
} as const;

export type MessageClass = typeof MESSAGE_CLASSES[keyof typeof MESSAGE_CLASSES];
export type Channel = 'email' | 'sms' | 'push';

const CATEGORY_CLASS: Record<string, MessageClass> = {
  account_security:            MESSAGE_CLASSES.TRANSACTIONAL,
  account_notice:              MESSAGE_CLASSES.TRANSACTIONAL,
  order_status:                MESSAGE_CLASSES.TRANSACTIONAL,
  order_ready:                 MESSAGE_CLASSES.TRANSACTIONAL,
  event_confirmation:          MESSAGE_CLASSES.TRANSACTIONAL,
  event_reminder_rsvp:         MESSAGE_CLASSES.TRANSACTIONAL,
  club_status_change:          MESSAGE_CLASSES.TRANSACTIONAL,
  direct_message:              MESSAGE_CLASSES.TRANSACTIONAL,
  member_requested_alert:      MESSAGE_CLASSES.TRANSACTIONAL,
  support_reply:               MESSAGE_CLASSES.TRANSACTIONAL,

  newsletter:                  MESSAGE_CLASSES.MARKETING,
  promotional:                 MESSAGE_CLASSES.MARKETING,
  event_invitation:            MESSAGE_CLASSES.MARKETING,
  club_announcement_marketing: MESSAGE_CLASSES.MARKETING,
};

export function messageClass(category: string): MessageClass {
  return CATEGORY_CLASS[category] || MESSAGE_CLASSES.MARKETING;
}

interface ConsentPerson {
  email_marketing_opt_in?: boolean;
  sms_marketing_opt_in?: boolean;
}

export function canSendMarketing(person: ConsentPerson | null | undefined, channel: Channel): boolean {
  if (!person) return false;
  if (channel === 'email') return !!person.email_marketing_opt_in;
  if (channel === 'sms')   return !!person.sms_marketing_opt_in;
  if (channel === 'push')  return true;
  return false;
}

export function shouldSend(category: string, person: ConsentPerson | null | undefined, channel: Channel)
  : { send: boolean; reason: 'transactional' | 'consented' | 'no_consent' } {
  const cls = messageClass(category);
  if (cls === MESSAGE_CLASSES.TRANSACTIONAL) return { send: true, reason: 'transactional' };
  return canSendMarketing(person, channel)
    ? { send: true, reason: 'consented' }
    : { send: false, reason: 'no_consent' };
}
