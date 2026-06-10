// Terms + Privacy version pointers used by TermsGate and consent_log.
// Bump CURRENT_TERMS_VERSION (or CURRENT_PRIVACY_VERSION) when the
// substance changes. Members whose terms_accepted_version is below
// CURRENT_TERMS_VERSION will see the gate again on next login.

export const CURRENT_TERMS_VERSION = 2;
export const CURRENT_TERMS_DATE = '2026-06-09';

export const CURRENT_PRIVACY_VERSION = 1;
export const CURRENT_PRIVACY_DATE = '2026-06-09';

export function needsTerms(member) {
  if (!member) return false;
  return (member.terms_accepted_version || 0) < CURRENT_TERMS_VERSION;
}

// Exact consent text strings shown at the moment of opt-in. These are
// stored verbatim in consent_log as the legal defense if a TCPA or
// CAN-SPAM claim is ever raised. Edit ONLY when the displayed copy
// itself changes; future opt-ins will then log the new string.
export const CONSENT_TEXT = {
  terms_and_privacy: 'I agree to the Terms of Use and Privacy Policy.',
  age_18_plus: 'I confirm that I am 18 years of age or older.',
  email_marketing:
    'Send me news, events, and promotional emails from my club and Grounds Live.',
  sms_marketing:
    'Send me promotional text messages from my club and Grounds Live. ' +
    'Msg & data rates may apply. Msg frequency varies. Consent is not a ' +
    'condition of purchase. Reply STOP to cancel, HELP for help.',
};
