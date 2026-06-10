# The Grounds: Consent Handoff for Claude Code

Two build areas: registration opt-ins and member settings controls. Both exist to satisfy TCPA, CAN-SPAM, and state privacy law, and to make the Terms of Use enforceable. Every consent and opt-out change must be logged.

---

## Part 1: Registration Opt-Ins

Three separate, independently interactable elements on the signup screen. Marketing boxes are unchecked by default and never pre-selected.

### Required to create an account

One checkbox, unchecked by default, must be affirmatively clicked:

> I agree to the Terms of Use and Privacy Policy.

- Both documents linked inline.
- Account creation is blocked until this is checked.

A second checkbox, unchecked by default, must be affirmatively clicked:

> I confirm that I am 18 years of age or older.

- Account creation is blocked until this is checked.
- The Service is for adults only. Minors do not hold accounts. Where a club has a junior member under 18, the parent or legal guardian holds and manages the account.
- Log this affirmation: user_id, `age_affirmed_18` = true, timestamp (UTC), source (`registration`). Append only, same as consent records.

These two are the only consents that gate registration.

### Optional, each its own unchecked control

**Email marketing opt-in** (unchecked by default):

> Send me news, events, and promotional emails from my club and Grounds Live.

**Text marketing opt-in** (unchecked by default, its own checkbox, not bundled):

> Send me promotional text messages from my club and Grounds Live. Msg & data rates may apply. Msg frequency varies. Consent is not a condition of purchase. Reply STOP to cancel, HELP for help.

### Hard rules

- The SMS checkbox is independent. Not bundled with email. Not bundled with Terms acceptance.
- The full SMS disclosure text above is visible at the point of consent, not hidden behind a link.
- Marketing consent (email or text) is never required to register, to pay, or to use any feature.
- The phone number field is optional. A user can complete signup with no phone number.

### Consent logging (required)

On each marketing opt-in, write a consent record:

- user_id
- consent_type (`email_marketing` or `sms_marketing`)
- consent_value (`true` / `false`)
- timestamp (UTC)
- exact consent language string shown at the moment of opt-in (store the literal text)
- phone_number (for SMS) or email (for email), as applicable
- source (`registration`)

This record is the defense if a TCPA or CAN-SPAM claim is ever raised. Store it, never overwrite it. New changes append new rows.

---

## Part 2: Member Settings Controls

In-app settings so users can change their choices at any time. The Terms of Use assume these exist and function.

### Communications

- **Email marketing toggle** — on/off, independent.
- **Text marketing toggle** — on/off, independent. Turning it off has the same effect as replying STOP, and must update the same consent record and stop SMS marketing routing immediately.
- **Push notification preferences** — by category: events, orders, club status, announcements.

### Privacy and data

- Request access to account information.
- Request deletion of account and information.
- Profile visibility within the club.

### Always-on notice (display, non-toggleable)

> Essential service messages (security, order, and account notices) cannot be turned off while your account is active.

### Consent and routing behavior

- Every toggle change writes a new consent record (same fields as Part 1, source = `settings`). Append only.
- When a user opts out of a marketing category, the platform stops routing that category to them immediately.
- Club-side messaging tools may only send a marketing category to users whose current consent for that category is `true`. Match consent at send time, not at list-build time.

### Transactional vs. marketing (routing logic)

Transactional messages are tied to a member action and do not require marketing consent:

- Order placed → order status texts (ready, delayed) — allowed without SMS marketing opt-in.
- Event RSVP → reminders for that event — allowed without SMS marketing opt-in.
- Member-requested service alerts (e.g., course-closed notifications they turned on) — service, not marketing.

Marketing messages (promotions, general announcements, "come to our event") require the matching marketing opt-in.

Keep these as distinct message classes in code so transactional sending is never blocked by a marketing opt-out, and marketing sending always checks consent.

### Optional club-manager controls (safe versions only)

- Managers may enable/disable transactional SMS categories (order alerts, event reminders, status changes).
- Managers may customize the framing/wording of the marketing opt-in invitation.
- Managers may NOT make marketing consent mandatory for registration or access. Do not build that switch. Conditioning service on marketing SMS consent violates the TCPA.

---

## Summary for implementation

1. Two required signup gates: Terms acceptance and 18+ age affirmation. Both unchecked by default, both block the account until checked.
2. SMS opt-in is standalone with full disclosure visible inline.
3. Phone optional.
4. Append-only log on every consent opt-in, the age affirmation, and every settings change.
5. Match consent at send time; transactional and marketing are separate message classes.
6. No mandatory-marketing-consent toggle anywhere, including for club managers.
7. Minors do not hold accounts. A parent or guardian holds the account for any junior member.
