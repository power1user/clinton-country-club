// Support FAQ content (v0.10.14).
//
// Static strings — kept in a config file rather than a DB table because:
//   · The questions are platform-wide, not per-club
//   · Translation / per-club override isn't needed yet
//   · Updating == one PR + version bump, which is how every other doc
//     string (Terms of Use, CHANGELOG, README) works
//
// When the list grows past ~12 entries OR clubs need to add their own
// FAQ items, promote this to a `club_faq` table with the same shape
// (question + answer). The Support screen already loops over an
// array, so the swap is trivial.

export const SUPPORT_FAQ = [
  {
    q: 'How do I update my profile photo?',
    a: 'Open Settings (gear icon top-right of MyClub). Tap your avatar in the Profile section to upload a new photo. Square images look best; the app crops to a circle.',
  },
  {
    q: 'How do I enable push notifications?',
    a: 'Open Settings → Notifications and tap "Enable notifications." Your device will ask for permission; tap Allow. You can revoke this anytime from Settings.',
  },
  {
    q: 'How do I add the app to my home screen?',
    a: 'Open Settings → App. On iPhone, follow the step-by-step instructions to add it via Safari. On Android, tap the Install button — your browser will prompt to add the app to your home screen.',
  },
  {
    q: 'How do I cancel an RSVP?',
    a: 'Contact your club\'s office and ask them to cancel your registration. Staff can manage RSVPs from their admin queue. Cancelled RSVPs show up in MyClub → My Events under the Past section.',
  },
  {
    q: 'Why didn\'t I get an email confirmation?',
    a: 'The app currently sends push notification reminders instead of email confirmations. You can always see your registered events in MyClub → My Events.',
  },
  {
    q: 'How do I contact the club directly?',
    a: 'Use the Contact Your Club option below — it has the clubhouse phone and email. Or open MyClub → Message Clubhouse to send a thread message that staff can reply to.',
  },
];
