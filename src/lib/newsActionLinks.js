// News → contextual action link mapping (v0.10.4).
//
// Each news category can have an associated "continue reading" action
// — a tap target rendered below the news body that takes the member
// to the screen the article is implicitly about. A Dining article
// links to the dining menu; an Events article to the calendar;
// Course to pin placements; etc.
//
// Replaces the v0.10.3-era hardcoded "Related" card in NewsDetail
// (three text-only divs that LOOKED tappable but had no onClick —
// a real bug Marc flagged).
//
// Adding a new category is one entry below. The renderer is generic
// — no per-category code anywhere else. If a news item's category
// isn't in this map, NO action link renders (no empty space, no
// placeholder, no fallback button).
//
// Keys are CASE-INSENSITIVE — we lowercase the incoming category
// before lookup so both 'Dining' (DB casing) and 'dining' (manual
// admin entry) resolve to the same destination.

const ACTION_LINKS = {
  dining:  { label: 'View the dining menu',    route: 'food' },
  events:  { label: 'View the events calendar', route: 'community/calendar' },
  course:  { label: 'View pin placements',     route: 'golf/pin' },
  golf:    { label: 'View course conditions',  route: 'golf' },
  proshop: { label: 'Visit the pro shop',      route: 'myclub/proshop' },
};

// Returns { label, route } or null when no entry exists for the
// given category. Use:
//
//   const action = getNewsActionLink(news.category);
//   {action && <button onClick={() => push(action.route)}>{action.label}</button>}
//
// The null return is what enables the no-empty-space behavior —
// callers just guard on truthiness.
export function getNewsActionLink(category) {
  if (!category) return null;
  const key = String(category).trim().toLowerCase();
  return ACTION_LINKS[key] || null;
}
