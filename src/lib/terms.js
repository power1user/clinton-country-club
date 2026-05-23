// Terms of Use — platform-wide content shown on first login (and after
// any version bump). The text references the member's club by name
// (interpolated at render time) so each club's terms screen feels
// branded, while the legal substance stays uniform across the platform.
//
// When you change the SUBSTANCE of the terms (not just typos), bump
// CURRENT_TERMS_VERSION. Members below the current version will see
// the acceptance screen again on next login.

import { PLATFORM_NAME } from './version.js';

// Bump this whenever the terms change substantively. Members whose
// terms_accepted_version is below this number will be prompted to
// re-accept on next app open.
export const CURRENT_TERMS_VERSION = 1;

// Last-meaningful-change date — shown in the gate's header so members
// know "what's new" since the prompt is otherwise identical.
export const CURRENT_TERMS_DATE = '2026-05-23';

// The terms text. Club name interpolates at render time. Keep this
// human-readable; if you need real legal language, swap a longer
// document and bump CURRENT_TERMS_VERSION.
//
// Returns an array of { heading?, paragraph } so the gate can render
// it with consistent typography.
export function termsSections(clubName = 'your club') {
  return [
    {
      paragraph: `Welcome to ${clubName}'s mobile app. This app is operated by ${PLATFORM_NAME} on behalf of ${clubName}. By using the app, you agree to the terms below.`,
    },
    {
      heading: 'Account use',
      paragraph: `Your account belongs to you and is tied to your ${clubName} membership. You're responsible for keeping your sign-in credentials private. Notify ${clubName} or ${PLATFORM_NAME} support if you believe your account has been accessed by someone else.`,
    },
    {
      heading: 'Member conduct',
      paragraph: `Messages, posts, and other content you share through the app should be respectful and follow ${clubName}'s code of conduct. ${clubName} may moderate, hide, or remove content at their discretion, and may suspend accounts that violate club policy.`,
    },
    {
      heading: 'Privacy',
      paragraph: `${PLATFORM_NAME} stores your member profile, messages, orders, and other in-app activity to provide the service. Aggregated, non-personal usage data may be used to improve the platform. We don't sell your personal data. Your club has access to its own members' data; ${PLATFORM_NAME} support staff may access it for troubleshooting.`,
    },
    {
      heading: 'Push notifications',
      paragraph: `If you enable push notifications, the app may alert you to club announcements, food orders, messages, and other events. You can disable notifications at any time from My Club → Notifications or from your device settings.`,
    },
    {
      heading: 'No warranty',
      paragraph: `The app is provided as-is. ${PLATFORM_NAME} and ${clubName} aren't liable for occasional outages, missed notifications, or other limitations of mobile software.`,
    },
    {
      heading: 'Changes',
      paragraph: `These terms may be updated. When the substance changes, you'll see this screen again and need to re-accept to continue using the app.`,
    },
  ];
}

// Helper: does this member need to accept terms before the app proceeds?
// Returns false for null/undefined so the boot path stays simple.
export function needsTerms(member) {
  if (!member) return false;
  return (member.terms_accepted_version || 0) < CURRENT_TERMS_VERSION;
}
