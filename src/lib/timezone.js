// Timezone helpers — for computing "is the club open right now" in the
// CLUB's local time, not the browsing member's. Every status-pill and
// schedule check below the Home screen should run through these.

// IANA timezone fallback when a club row hasn't been set yet.
export const DEFAULT_TIMEZONE = 'America/Chicago';

// Returns { dayOfWeek (0=Sun..6=Sat), minutesOfDay (0..1439) } for the
// given Date interpreted in the given IANA timezone.
//
//   const { dayOfWeek, minutesOfDay } = clubLocalParts(new Date(), 'America/Chicago')
//
// Implementation uses Intl.DateTimeFormat which understands every IANA
// zone the runtime supports. No third-party tz library needed.
export function clubLocalParts(date, timezone) {
  const tz = timezone || DEFAULT_TIMEZONE;
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',  // 'Sun', 'Mon', ...
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const weekdayStr = parts.find(p => p.type === 'weekday')?.value || 'Sun';
  const hourStr    = parts.find(p => p.type === 'hour')?.value    || '0';
  const minStr     = parts.find(p => p.type === 'minute')?.value  || '0';
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  // In some locales, hour="24" can be returned for midnight; normalize.
  const h = (parseInt(hourStr, 10) || 0) % 24;
  const m = parseInt(minStr, 10) || 0;
  return {
    dayOfWeek:    dayMap[weekdayStr] ?? 0,
    minutesOfDay: h * 60 + m,
  };
}

// Today's date as YYYY-MM-DD in the given club timezone. Used to query
// schedule_overrides against `override_date` and to scope "today"
// computations to the club rather than the browser.
export function todayInClubTz(timezone) {
  const tz = timezone || DEFAULT_TIMEZONE;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (t) => parts.find(p => p.type === t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// A short curated list of IANA zones for the New-Club onboarding form.
// Add to this as we onboard clubs in other regions — runtime supports
// any IANA zone so this is just a UX nicety.
export const COMMON_TIMEZONES = [
  { value: 'America/New_York',    label: 'Eastern (New York)' },
  { value: 'America/Chicago',     label: 'Central (Chicago)' },
  { value: 'America/Denver',      label: 'Mountain (Denver)' },
  { value: 'America/Phoenix',     label: 'Mountain — no DST (Phoenix)' },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Anchorage',   label: 'Alaska (Anchorage)' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii (Honolulu)' },
];
