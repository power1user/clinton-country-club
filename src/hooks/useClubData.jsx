import { useEffect, useState } from 'react';
import { supabase, isConfigured } from '../lib/supabase.js';
import { useAuth } from './useAuth.jsx';
import {
  DATA_STATUS, DATA_NEWS, DATA_WEATHER, DATA_HOLES, DATA_EVENTS, DATA_MENU,
  DATA_BULLETIN, DATA_PARTNERS, ONBOARDING,
} from '../data/mock.js';

// ────────────────────────────────────────────────────────────────────────────
// Status pills (real-time)
// ────────────────────────────────────────────────────────────────────────────
export function useClubStatus() {
  const { club } = useAuth();
  const [data, setData] = useState(DATA_STATUS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !club) {
      setData(DATA_STATUS);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const { data: rows, error } = await supabase
        .from('club_status')
        .select(`
          id, category, label, sort_order, state, hours_note, staff_note,
          opens_at, closes_at,
          hours:club_status_hours (day_of_week, opens_at, closes_at, closes_at_dusk, is_closed)
        `)
        .eq('club_id', club.id)
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      if (error) { setLoading(false); return; }

      setData(rows.map(r => {
        const byDay = {};
        for (const h of (r.hours || [])) {
          byDay[h.day_of_week] = {
            opens_at: h.opens_at,
            closes_at: h.closes_at,
            closes_at_dusk: h.closes_at_dusk,
            is_closed: h.is_closed,
          };
        }
        return {
          id: r.category,
          statusId: r.id,                          // needed for admin per-day writes
          label: r.label,
          st: r.state,
          note: r.staff_note || '',
          // legacy single-row fallback (still used by some old screens)
          opens_at:  r.opens_at,
          closes_at: r.closes_at,
          // per-day hours
          hoursByDay: byDay,
        };
      }));
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`club_status:${club.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'club_status', filter: `club_id=eq.${club.id}` },
        () => load(),
      )
      // also reload when daily hours change
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'club_status_hours' },
        () => load(),
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id]);

  return { data, loading };
}

// ────────────────────────────────────────────────────────────────────────────
// Pace of play (real-time)
// ────────────────────────────────────────────────────────────────────────────
export function usePaceOfPlay() {
  const { club } = useAuth();
  const [data, setData] = useState({ state: 'open', time_label: '4h 08m', message: 'On pace' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !club) { setLoading(false); return; }

    let cancelled = false;
    const load = async () => {
      const { data: row } = await supabase
        .from('pace_of_play')
        .select('state, time_label, message, updated_at')
        .eq('club_id', club.id)
        .maybeSingle();
      if (cancelled) return;
      if (row) setData(row);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`pace:${club.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pace_of_play', filter: `club_id=eq.${club.id}` },
        () => load(),
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id]);

  return { data, loading };
}

// ────────────────────────────────────────────────────────────────────────────
// News
// ────────────────────────────────────────────────────────────────────────────
export function useNews() {
  const { club } = useAuth();
  const [data, setData] = useState(DATA_NEWS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !club) { setData(DATA_NEWS); setLoading(false); return; }

    let cancelled = false;
    (async () => {
      const { data: rows, error } = await supabase
        .from('news')
        .select('id, category, headline, body, date_label, published_at')
        .eq('club_id', club.id)
        .order('published_at', { ascending: false });
      if (cancelled) return;
      if (!error && rows) {
        setData(rows.map(r => ({
          id: r.id,
          cat: r.category,
          head: r.headline,
          body: r.body,
          date: r.date_label || new Date(r.published_at).toLocaleDateString(),
        })));
      }
      setLoading(false);
    })();
  }, [club?.id]);

  return { data, loading };
}

// ────────────────────────────────────────────────────────────────────────────
// Events
// ────────────────────────────────────────────────────────────────────────────
export function useEvents() {
  const { club } = useAuth();
  const [data, setData] = useState(DATA_EVENTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !club) { setData(DATA_EVENTS); setLoading(false); return; }

    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from('events')
        .select('id, title, description, category, event_date, event_time, date_label, dow, day_num, spots, price')
        .eq('club_id', club.id)
        .order('event_date', { ascending: true });
      if (cancelled) return;
      if (rows) {
        setData(rows.map(r => ({
          id: r.id,
          date: r.date_label,
          dow: r.dow,
          day: r.day_num,
          title: r.title,
          time: r.event_time,
          cat: r.category,
          spots: r.spots,
          price: r.price,
          desc: r.description,
        })));
      }
      setLoading(false);
    })();
  }, [club?.id]);

  return { data, loading };
}

// ────────────────────────────────────────────────────────────────────────────
// Menus (grouped by category, same shape as DATA_MENU)
// ────────────────────────────────────────────────────────────────────────────
export function useMenu() {
  const { club } = useAuth();
  const [data, setData] = useState(DATA_MENU);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !club) { setData(DATA_MENU); setLoading(false); return; }

    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from('menus')
        .select('id, category, sort_order, item_name, description, price, tag, is_special, available_today')
        .eq('club_id', club.id)
        .eq('available_today', true)
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      if (rows) {
        const grouped = { specials: [], lunch: [], dinner: [], bar: [], desserts: [] };
        for (const r of rows) {
          if (!grouped[r.category]) grouped[r.category] = [];
          grouped[r.category].push({
            id: r.id,
            name: r.item_name,
            desc: r.description,
            price: r.price,
            tag: r.tag,
          });
        }
        setData(grouped);
      }
      setLoading(false);
    })();
  }, [club?.id]);

  return { data, loading };
}

// ────────────────────────────────────────────────────────────────────────────
// Pin placements for today — joins the permanent `holes` table with today's
// pin_placements row to give the screen everything it needs in one shape.
// ────────────────────────────────────────────────────────────────────────────
export function usePinPlacements() {
  const { club } = useAuth();
  const [data, setData] = useState(DATA_HOLES);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!isConfigured || !club) { setData(DATA_HOLES); setLoading(false); return; }

    let cancelled = false;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      // Permanent hole metadata (par, yards, green image)
      const { data: holes } = await supabase
        .from('holes')
        .select('hole_number, par, yards, yards_blue, yards_white, yards_red, name, description, green_image, handicap')
        .eq('club_id', club.id)
        .order('hole_number', { ascending: true });
      // Today's pin coordinates
      const { data: pins } = await supabase
        .from('pin_placements')
        .select('hole_number, pin_x, pin_y, notes, effective_date')
        .eq('club_id', club.id)
        .eq('effective_date', today);

      if (cancelled) return;
      if (holes && holes.length) {
        const pinByHole = new Map((pins || []).map(p => [p.hole_number, p]));
        setData(holes.map(h => {
          const p = pinByHole.get(h.hole_number);
          return {
            n: h.hole_number,
            par: h.par,
            yds: h.yards,
            yds_blue:  h.yards_blue,
            yds_white: h.yards_white,
            yds_red:   h.yards_red,
            name: h.name,
            description: h.description,
            handicap: h.handicap,
            greenImage: h.green_image || `/greens/hole-${h.hole_number}.svg`,
            pinX: p?.pin_x != null ? Number(p.pin_x) : 0.5,
            pinY: p?.pin_y != null ? Number(p.pin_y) : 0.5,
            notes: p?.notes || '',
            // back-compat with components still reading old keys
            pin: '',
            grn: '',
            haz: '',
            pace: '',
          };
        }));
      }
      setLoading(false);
    })();
  }, [club?.id, version]);

  return { data, loading, refresh };
}

// ────────────────────────────────────────────────────────────────────────────
// Bulletin board posts
// ────────────────────────────────────────────────────────────────────────────
export function useBulletinPosts() {
  const { club } = useAuth();
  const [data, setData] = useState(DATA_BULLETIN);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!isConfigured || !club) { setData(DATA_BULLETIN); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from('bulletin_posts')
        .select('id, category, title, body, hidden, created_at, member_id, members(name)')
        .eq('club_id', club.id)
        .eq('hidden', false)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (rows) {
        setData(rows.map(r => ({
          id: r.id,
          cat: r.category,
          author: r.members?.name || 'Member',
          date: relativeDate(r.created_at),
          title: r.title,
          body: r.body,
        })));
      }
      setLoading(false);
    })();
  }, [club?.id, version]);

  return { data, loading, refresh };
}

// ────────────────────────────────────────────────────────────────────────────
// Partner board posts
// ────────────────────────────────────────────────────────────────────────────
export function usePartnerPosts() {
  const { club } = useAuth();
  const [data, setData] = useState(DATA_PARTNERS);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!isConfigured || !club) { setData(DATA_PARTNERS); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from('partner_posts')
        .select('id, category, title, body, hcp, is_open, created_at, member_id, members(name)')
        .eq('club_id', club.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (rows) {
        setData(rows.map(r => ({
          id: r.id,
          author: r.members?.name || 'Member',
          hcp: r.hcp,
          date: relativeDate(r.created_at),
          title: r.title,
          body: r.body,
          cat: r.category,
          open: r.is_open,
        })));
      }
      setLoading(false);
    })();
  }, [club?.id, version]);

  return { data, loading, refresh };
}

// ────────────────────────────────────────────────────────────────────────────
// Onboarding (club_content with slug pattern)
// ────────────────────────────────────────────────────────────────────────────
export function useOnboarding() {
  const { club } = useAuth();
  const [data, setData] = useState(ONBOARDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !club) { setData(ONBOARDING); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from('club_content')
        .select('slug, title, icon, body, sort_order')
        .eq('club_id', club.id)
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      if (rows && rows.length) {
        setData(rows.map(r => ({ id: r.slug, title: r.title, icon: r.icon, body: r.body })));
      }
      setLoading(false);
    })();
  }, [club?.id]);

  return { data, loading };
}

// ────────────────────────────────────────────────────────────────────────────
// Weather — OpenWeatherMap, always at the CLUB's coordinates (not the user's).
// Returns both current conditions and a 5-day forecast.
// ────────────────────────────────────────────────────────────────────────────
const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

const DEFAULT_FORECAST = [
  { d: 'Now', t: DATA_WEATHER.temp, c: '⛅' },
];

export function useWeather() {
  const { club } = useAuth();
  const [data, setData] = useState({ ...DATA_WEATHER, forecast: DEFAULT_FORECAST });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!OPENWEATHER_KEY || !club) { setLoading(false); return; }

    let cancelled = false;
    (async () => {
      try {
        const lat = club.lat ?? 41.6032;
        const lng = club.lng ?? -73.0877;
        const base = `https://api.openweathermap.org/data/2.5`;
        const [curR, fcR] = await Promise.all([
          fetch(`${base}/weather?lat=${lat}&lon=${lng}&units=imperial&appid=${OPENWEATHER_KEY}`),
          fetch(`${base}/forecast?lat=${lat}&lon=${lng}&units=imperial&appid=${OPENWEATHER_KEY}`),
        ]);
        if (!curR.ok) throw new Error(`weather ${curR.status}`);
        const cur = await curR.json();
        if (!fcR.ok) console.warn('[weather] forecast endpoint returned', fcR.status);
        const fc  = fcR.ok ? await fcR.json() : null;
        if (cancelled) return;

        setData({
          temp:      Math.round(cur.main?.temp ?? DATA_WEATHER.temp),
          high:      Math.round(cur.main?.temp_max ?? DATA_WEATHER.high),
          low:       Math.round(cur.main?.temp_min ?? DATA_WEATHER.low),
          condition: cur.weather?.[0]?.main || DATA_WEATHER.condition,
          wind:      `${Math.round(cur.wind?.speed ?? 0)} mph ${degToCompass(cur.wind?.deg)}`.trim(),
          humidity:  cur.main?.humidity ?? DATA_WEATHER.humidity,
          uv:        DATA_WEATHER.uv, // not on free tier
          forecast:  buildHourly(cur, fc),
        });
      } catch (e) {
        if (!cancelled) console.warn('[weather] fetch failed:', e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [club?.id, club?.lat, club?.lng]);

  return { data, loading };
}

// ────────────────────────────────────────────────────────────────────────────
// Status helpers — open/closed by current time, formatted hours, etc.
// ────────────────────────────────────────────────────────────────────────────

// Decides what state to actually show given the admin's stored state, the
// pill's day-of-week hours, dusk time (for "closes at dusk" facilities), and
// the current time.
//
//   - admin manually set 'closed' → always closed
//   - today is_closed → closed
//   - has hours AND we're outside them → closed
//   - otherwise → admin's state ('open' or 'limited')
export function effectiveState(pill, now = new Date(), duskTime = null) {
  if (!pill) return 'closed';
  if (pill.st === 'closed') return 'closed';
  const today = pickToday(pill, now);
  if (today) {
    if (today.is_closed) return 'closed';
    const within = withinDailyHours(today, now, duskTime);
    if (within === false) return 'closed';
  }
  return pill.st || 'open';
}

// Returns today's hours row for a pill, or null if no per-day schedule.
export function pickToday(pill, now = new Date()) {
  const day = now.getDay();
  if (pill?.hoursByDay && pill.hoursByDay[day]) return pill.hoursByDay[day];
  // Fallback to legacy single-row hours
  if (pill?.opens_at || pill?.closes_at) {
    return { opens_at: pill.opens_at, closes_at: pill.closes_at, closes_at_dusk: false, is_closed: false };
  }
  return null;
}

export function withinDailyHours(day, now = new Date(), duskTime = null) {
  if (!day) return null;
  if (day.is_closed) return false;
  if (!day.opens_at) return null;
  // Close time: either fixed clock time or computed dusk
  let closeMinutes;
  if (day.closes_at_dusk && duskTime) {
    closeMinutes = duskTime.getHours() * 60 + duskTime.getMinutes();
  } else if (day.closes_at) {
    closeMinutes = toMinutes(day.closes_at);
  } else if (day.closes_at_dusk && !duskTime) {
    // Dusk requested but not yet loaded — say "open" until we know
    return true;
  } else {
    return null;
  }
  const openMinutes = toMinutes(day.opens_at);
  if (openMinutes == null || closeMinutes == null) return null;
  const cur = now.getHours() * 60 + now.getMinutes();
  if (closeMinutes < openMinutes) return cur >= openMinutes || cur < closeMinutes;
  return cur >= openMinutes && cur < closeMinutes;
}

// Back-compat wrapper used by the old single-row API.
export function withinHours(opens_at, closes_at, now = new Date()) {
  if (!opens_at || !closes_at) return null;
  return withinDailyHours({ opens_at, closes_at }, now);
}

// ────────────────────────────────────────────────────────────────────────────
// useDusk — today's civil twilight end (dusk) at the club's coords.
// Cached in module-scope per (lat,lng) since we only need this once per day.
// ────────────────────────────────────────────────────────────────────────────
const _duskCache = new Map();

export function useDusk() {
  const { club } = useAuth();
  const [dusk, setDusk] = useState(null);

  useEffect(() => {
    if (!club?.lat || !club?.lng) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `${club.lat}:${club.lng}:${today}`;
    if (_duskCache.has(key)) {
      setDusk(_duskCache.get(key));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const url = `https://api.sunrise-sunset.org/json?lat=${club.lat}&lng=${club.lng}&date=today&formatted=0`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`sunrise-sunset ${r.status}`);
        const j = await r.json();
        const iso = j.results?.civil_twilight_end || j.results?.sunset;
        if (!iso) return;
        const d = new Date(iso);
        if (cancelled) return;
        _duskCache.set(key, d);
        setDusk(d);
      } catch (e) {
        if (!cancelled) console.warn('[dusk] failed:', e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [club?.lat, club?.lng]);

  return dusk;
}

function toMinutes(t) {
  // Accepts "11:00" or "11:00:00"
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function formatHours(opens_at, closes_at) {
  if (!opens_at || !closes_at) return 'By appointment';
  return `${formatTimeAmPm(opens_at)} – ${formatTimeAmPm(closes_at)}`;
}

function formatTimeAmPm(t) {
  if (!t) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const period = h >= 12 ? 'pm' : 'am';
  h = ((h + 11) % 12) + 1;
  return min === 0 ? `${h}${period}` : `${h}:${String(min).padStart(2,'0')}${period}`;
}

function degToCompass(deg) {
  if (deg == null) return '';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// Build an hourly-ish forecast strip from current weather + the 3-hour
// forecast entries. Returns ["Now" + next 5 buckets] = ~next 15 hours.
// Way more useful for golf than a daily roll-up.
function buildHourly(cur, fc) {
  const now = {
    d: 'Now',
    t: Math.round(cur.main?.temp ?? DATA_WEATHER.temp),
    c: conditionEmoji(cur.weather?.[0]?.main),
  };
  if (!fc?.list?.length) return [now];

  // Drop any forecast entry that's already in the past, then take the next 5.
  const nowSecs = Math.floor(Date.now() / 1000);
  const future = fc.list.filter(e => e.dt > nowSecs).slice(0, 5);

  return [now, ...future.map(entry => {
    const d = new Date(entry.dt * 1000);
    return {
      d: formatHour(d),
      t: Math.round(entry.main?.temp ?? 0),
      c: conditionEmoji(entry.weather?.[0]?.main),
    };
  })];
}

// "3pm", "12am", or "Tue 9am" when it's a different day from now.
function formatHour(d) {
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', hour12: true })
    .replace(/\s+/g, '').toLowerCase();

  if (sameDay) return timeStr;
  if (isTomorrow) return `Tmr ${timeStr}`;
  const day = d.toLocaleDateString(undefined, { weekday: 'short' });
  return `${day} ${timeStr}`;
}

function conditionEmoji(cond) {
  switch (cond) {
    case 'Clear':        return '☀️';
    case 'Clouds':       return '⛅';
    case 'Rain':         return '🌧';
    case 'Drizzle':      return '🌦';
    case 'Thunderstorm': return '⛈';
    case 'Snow':         return '❄️';
    case 'Mist':
    case 'Fog':
    case 'Haze':
    case 'Smoke':        return '🌫';
    default:             return '⛅';
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
function relativeDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
