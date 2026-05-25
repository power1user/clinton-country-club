import { useEffect, useState } from 'react';
import { supabase, isConfigured } from '../lib/supabase.js';
import { useAuth } from './useAuth.jsx';
import { clubLocalParts, DEFAULT_TIMEZONE, todayInClubTz } from '../lib/timezone.js';

// All content is database-driven. Hooks return empty defaults until rows
// arrive from Supabase. Consuming screens must render a loading or empty
// state when the data array is empty.
const EMPTY_MENU = { specials: [], lunch: [], dinner: [], bar: [], desserts: [] };
const EMPTY_WEATHER = { temp: null, high: null, low: null, condition: '', wind: '', humidity: null, uv: null };

// Format news date for the member-facing card. Handles three cases:
//   · ISO date stored in date_label (v0.6.0+ admin picker) →
//     localized "Mon DD" format
//   · Free-text label like "Today" or "May 14" stored in date_label
//     (pre-v0.6.0) → display as-is
//   · No date_label at all → fall back to the published_at timestamp
function formatNewsDate(label, publishedAt) {
  if (label && /^\d{4}-\d{2}-\d{2}$/.test(label)) {
    const [y, m, d] = label.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  if (label) return label;            // legacy free-text
  if (!publishedAt) return '';
  return new Date(publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ────────────────────────────────────────────────────────────────────────────
// Status pills (real-time)
// ────────────────────────────────────────────────────────────────────────────
export function useClubStatus() {
  const { club } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !club) {
      setData([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const [{ data: rows, error }, { data: overrides }] = await Promise.all([
        supabase
          .from('club_status')
          .select(`
            id, category, label, sort_order, state, hours_note, staff_note,
            opens_at, closes_at,
            hours:club_status_hours (day_of_week, opens_at, opens_at_dawn, closes_at, closes_at_dusk, is_closed, members_only)
          `)
          .eq('club_id', club.id)
          .order('sort_order', { ascending: true }),
        // Today's date in CLUB local time — overrides are keyed by override_date
        supabase
          .from('schedule_overrides')
          .select('status_id, opens_at, opens_at_dawn, closes_at, closes_at_dusk, is_closed, members_only, reason')
          .eq('club_id', club.id)
          .eq('override_date', todayInClubTz(club.timezone)),
      ]);
      if (cancelled) return;
      if (error) { setLoading(false); return; }

      // Build override lookup. status_id NULL = "all facilities" override
      // that takes precedence over per-facility weekly hours but loses to
      // a more specific per-facility override on the same date.
      const allFacOverride = (overrides || []).find(o => o.status_id == null);
      const byStatus = new Map(
        (overrides || []).filter(o => o.status_id).map(o => [o.status_id, o])
      );

      setData(rows.map(r => {
        const byDay = {};
        for (const h of (r.hours || [])) {
          byDay[h.day_of_week] = {
            opens_at: h.opens_at,
            opens_at_dawn: h.opens_at_dawn,
            closes_at: h.closes_at,
            closes_at_dusk: h.closes_at_dusk,
            is_closed: h.is_closed,
            members_only: h.members_only,
          };
        }
        const specific = byStatus.get(r.id);
        const todayOverride = specific || allFacOverride || null;
        return {
          id: r.category,
          statusId: r.id,                          // needed for admin per-day writes
          label: r.label,
          st: r.state,
          note: r.staff_note || '',
          opens_at:  r.opens_at,
          closes_at: r.closes_at,
          hoursByDay: byDay,
          // Today's override (per-facility wins over all-facilities; null
          // if none for today). pickToday() uses this in preference to
          // hoursByDay when present.
          todayOverride,
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
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'club_status_hours' },
        () => load(),
      )
      // Today's override changes (admin adds/removes a date closure)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'schedule_overrides', filter: `club_id=eq.${club.id}` },
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
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !club) { setData([]); setLoading(false); return; }

    let cancelled = false;
    const load = async () => {
      const { data: rows, error } = await supabase
        .from('news')
        .select('id, category, headline, body, date_label, published_at')
        .eq('club_id', club.id)
        .order('published_at', { ascending: false });
      if (cancelled) return;
      if (!error && rows) {
        setData(rows.map(r => ({
          id: r.id, cat: r.category, head: r.headline, body: r.body,
          // v0.6.0: news.date_label now stores an ISO date (YYYY-MM-DD)
          // when the admin sets it via the date picker. Older rows may
          // hold free-text labels like "Today" or "May 14" — render
          // those as-is for backward compat. If empty, fall back to the
          // published_at timestamp.
          date: formatNewsDate(r.date_label, r.published_at),
        })));
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`news:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id]);

  return { data, loading };
}

// ────────────────────────────────────────────────────────────────────────────
// Events
// ────────────────────────────────────────────────────────────────────────────
export function useEvents() {
  const { club } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !club) { setData([]); setLoading(false); return; }

    let cancelled = false;
    const load = async () => {
      const { data: rows } = await supabase
        .from('events')
        .select('id, title, description, category, event_date, event_time, date_label, dow, day_num, spots, price')
        .eq('club_id', club.id)
        .order('event_date', { ascending: true });
      if (cancelled) return;
      if (rows) {
        setData(rows.map(r => ({
          id: r.id,
          date: r.date_label,         // display string ("Sat May 24")
          eventDate: r.event_date,    // raw ISO date for calendar bucketing (v0.6.0)
          dow: r.dow, day: r.day_num, title: r.title,
          time: r.event_time, cat: r.category, spots: r.spots, price: r.price, desc: r.description,
        })));
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`events:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id]);

  return { data, loading };
}

// ────────────────────────────────────────────────────────────────────────────
// Menus — driven by the menu_categories table (managed via the admin
// Menu Categories section). Returns categories[] (ordered + active-filtered)
// and itemsByCategory keyed by category id, with a "specials" virtual
// bucket aggregating any item flagged is_special.
// ────────────────────────────────────────────────────────────────────────────
const EMPTY_MENU_V2 = { categories: [], itemsByCategory: {} };

export function useMenu() {
  const { club } = useAuth();
  const [data, setData] = useState(EMPTY_MENU_V2);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !club) { setData(EMPTY_MENU_V2); setLoading(false); return; }

    let cancelled = false;
    const load = async () => {
      const [{ data: cats }, { data: rows }] = await Promise.all([
        supabase
          .from('menu_categories')
          .select('id, name, sort_order, is_active')
          .eq('club_id', club.id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('menus')
          .select('id, category, category_id, sort_order, item_name, description, price, tag, is_special, available_today')
          .eq('club_id', club.id)
          .eq('available_today', true)
          .order('sort_order', { ascending: true }),
      ]);
      if (cancelled) return;

      const categories = cats || [];
      const itemsByCategory = {};
      const specials = [];
      // Pre-seed every category with an empty array so empty categories
      // still appear (admin sees "no items in this category yet").
      categories.forEach(c => { itemsByCategory[c.id] = []; });

      for (const r of (rows || [])) {
        const item = {
          id: r.id, name: r.item_name, desc: r.description,
          price: r.price, tag: r.tag, is_special: !!r.is_special,
        };
        if (r.category_id && itemsByCategory[r.category_id]) {
          itemsByCategory[r.category_id].push(item);
        }
        if (r.is_special) specials.push(item);
      }

      setData({ categories, itemsByCategory, specials });
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`menus:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menus',           filter: `club_id=eq.${club.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_categories', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id]);

  return { data, loading };
}

// ────────────────────────────────────────────────────────────────────────────
// Pin placements for today — joins the permanent `holes` table with today's
// pin_placements row, with realtime subscriptions so member views update
// live when the greenskeeper publishes changes.
// ────────────────────────────────────────────────────────────────────────────
export function usePinPlacements() {
  const { club } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!isConfigured || !club) { setData([]); setLoading(false); return; }

    let cancelled = false;
    const load = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: holes } = await supabase
        .from('holes')
        .select('hole_number, par, yards, yards_blue, yards_white, yards_red, name, description, green_image, handicap')
        .eq('club_id', club.id)
        .order('hole_number', { ascending: true });
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
            pin: '', grn: '', haz: '', pace: '',
          };
        }));
      }
      setLoading(false);
    };
    load();

    // Realtime — reload when the greenskeeper tweaks today's pins or hole metadata
    const channel = supabase
      .channel(`pins:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pin_placements', filter: `club_id=eq.${club.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'holes',          filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id, version]);

  return { data, loading, refresh };
}

// ────────────────────────────────────────────────────────────────────────────
// Bulletin board posts
// ────────────────────────────────────────────────────────────────────────────
export function useBulletinPosts() {
  const { club } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!isConfigured || !club) { setData([]); setLoading(false); return; }
    let cancelled = false;
    // Pull author name + tier + member_since so cards can attribute
    // posts richly. user_id is included so the reply/DM affordances
    // (added v0.5.x) can call get_or_create_dm against the right user.
    const load = async () => {
      const { data: rows } = await supabase
        .from('bulletin_posts')
        .select('id, category, title, body, hidden, created_at, member_id, members(name, tier, member_since, user_id, photo_url)')
        .eq('club_id', club.id)
        .eq('hidden', false)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (rows) {
        setData(rows.map(r => ({
          id: r.id,
          cat: r.category,
          // "Anonymous" rather than "Member" for orphan posts — makes
          // it obvious this is a deleted/missing author, not a real
          // person named Member.
          author: r.members?.name || 'Anonymous',
          authorTier: r.members?.tier || null,
          authorSince: r.members?.member_since || null,
          authorUserId: r.members?.user_id || null,
          authorPhotoUrl: r.members?.photo_url || null,
          memberId: r.member_id,
          date: relativeDate(r.created_at),
          title: r.title,
          body: r.body,
        })));
      }
      setLoading(false);
    };
    load();

    // Realtime — a member posting from a different device shows up
    // without a refresh. Cheap; bulletin_posts is already in the
    // supabase_realtime publication.
    const channel = supabase
      .channel(`bulletin_posts:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bulletin_posts', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id, version]);

  return { data, loading, refresh };
}

// ────────────────────────────────────────────────────────────────────────────
// Partner board posts
// ────────────────────────────────────────────────────────────────────────────
export function usePartnerPosts() {
  const { club } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!isConfigured || !club) { setData([]); setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      const { data: rows } = await supabase
        .from('partner_posts')
        .select('id, category, title, body, hcp, is_open, date_wanted, created_at, member_id, members(name, tier, member_since, user_id, photo_url)')
        .eq('club_id', club.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (rows) {
        setData(rows.map(r => ({
          id: r.id,
          author: r.members?.name || 'Anonymous',
          authorTier: r.members?.tier || null,
          authorSince: r.members?.member_since || null,
          authorUserId: r.members?.user_id || null,
          authorPhotoUrl: r.members?.photo_url || null,
          memberId: r.member_id,
          hcp: r.hcp,
          dateWanted: r.date_wanted,
          date: relativeDate(r.created_at),
          title: r.title,
          body: r.body,
          cat: r.category,
          open: r.is_open,
        })));
      }
      setLoading(false);
    };
    load();

    // Realtime — partner posts come and go quickly during a busy
    // weekend morning; live updates keep the board honest without
    // members having to refresh.
    const channel = supabase
      .channel(`partner_posts:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_posts', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id, version]);

  return { data, loading, refresh };
}

// ────────────────────────────────────────────────────────────────────────────
// Onboarding (club_content with slug pattern)
// ────────────────────────────────────────────────────────────────────────────
export function useOnboarding() {
  const { club } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !club) { setData([]); setLoading(false); return; }
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
// Pro shop items (catalog) — realtime
// ────────────────────────────────────────────────────────────────────────────
export function useProShopItems() {
  const { club } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !club) { setData([]); setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      const { data: rows } = await supabase
        .from('pro_shop_items')
        .select('id, name, description, category, price, image_url, in_stock, sort_order')
        .eq('club_id', club.id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (cancelled) return;
      if (rows) setData(rows);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`pro_shop_items:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pro_shop_items', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id]);

  return { data, loading };
}

// ────────────────────────────────────────────────────────────────────────────
// Weather — OpenWeatherMap, always at the CLUB's coordinates (not the user's).
// Returns both current conditions and a 5-day forecast.
// ────────────────────────────────────────────────────────────────────────────
const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

const DEFAULT_FORECAST = [];

export function useWeather() {
  const { club } = useAuth();
  const [data, setData] = useState({ ...EMPTY_WEATHER, forecast: DEFAULT_FORECAST });
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
          temp:      cur.main?.temp != null ? Math.round(cur.main.temp) : null,
          high:      cur.main?.temp_max != null ? Math.round(cur.main.temp_max) : null,
          low:       cur.main?.temp_min != null ? Math.round(cur.main.temp_min) : null,
          condition: cur.weather?.[0]?.main || '',
          wind:      `${Math.round(cur.wind?.speed ?? 0)} mph ${degToCompass(cur.wind?.deg)}`.trim(),
          humidity:  cur.main?.humidity ?? null,
          uv:        null, // not on free tier
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
// pill's day-of-week hours, dusk/dawn times, and the current time.
// Times are evaluated in the club's local timezone (IANA), passed in via
// the `timezone` arg — e.g. 'America/Chicago' for Clinton.
//
//   - admin manually set 'closed' → always closed
//   - today is_closed → closed
//   - has hours AND we're outside them → closed
//   - otherwise → admin's state ('open' or 'limited')
//
// v0.7.2: `duskTime` arg can now be EITHER a Date (legacy — treated as
// dusk only) OR a { dusk, dawn } object. Keeps back-compat for any
// caller that only knows about dusk.
export function effectiveState(pill, now = new Date(), duskOrTimes = null, timezone = DEFAULT_TIMEZONE) {
  if (!pill) return 'closed';
  if (pill.st === 'closed') return 'closed';
  const today = pickToday(pill, now, timezone);
  if (today) {
    if (today.is_closed) return 'closed';
    const within = withinDailyHours(today, now, duskOrTimes, timezone);
    if (within === false) return 'closed';
    // Within hours + members-only flag on → 'members' state
    if (today.members_only) return pill.st === 'limited' ? 'limited' : 'members';
  }
  return pill.st || 'open';
}

// Returns today's hours row for a pill, or null if no per-day schedule.
// Precedence:
//   1. pill.todayOverride (per-facility OR all-facilities override for today)
//   2. pill.hoursByDay[dow] (weekly schedule)
//   3. legacy single-row opens_at / closes_at
// `today` is decided by the club's local day-of-week, not the browser's.
export function pickToday(pill, now = new Date(), timezone = DEFAULT_TIMEZONE) {
  if (pill?.todayOverride) return pill.todayOverride;
  const { dayOfWeek } = clubLocalParts(now, timezone);
  if (pill?.hoursByDay && pill.hoursByDay[dayOfWeek]) return pill.hoursByDay[dayOfWeek];
  // Fallback to legacy single-row hours
  if (pill?.opens_at || pill?.closes_at) {
    return { opens_at: pill.opens_at, opens_at_dawn: false, closes_at: pill.closes_at, closes_at_dusk: false, is_closed: false };
  }
  return null;
}

// Normalize the dusk/dawn argument. Back-compat: accepts a single Date
// (treated as dusk only) OR a { dusk, dawn } object. Returns
// { dusk: Date|null, dawn: Date|null }.
function _sunArg(arg) {
  if (!arg) return { dusk: null, dawn: null };
  if (arg instanceof Date) return { dusk: arg, dawn: null };
  return { dusk: arg.dusk || null, dawn: arg.dawn || null };
}

export function withinDailyHours(day, now = new Date(), duskOrTimes = null, timezone = DEFAULT_TIMEZONE) {
  if (!day) return null;
  if (day.is_closed) return false;
  const { dusk: duskTime, dawn: dawnTime } = _sunArg(duskOrTimes);
  // Open time: fixed clock time OR computed dawn (v0.7.2). When opens_at_dawn
  // is true and dawn hasn't loaded yet, say "closed" until we know — opposite
  // of the dusk fallback because being conservative on the open boundary is
  // safer than telling a member "we're open" when we don't actually know.
  let openMinutes;
  if (day.opens_at_dawn && dawnTime) {
    openMinutes = clubLocalParts(dawnTime, timezone).minutesOfDay;
  } else if (day.opens_at_dawn && !dawnTime) {
    return null;  // unknown — caller treats as "not enough info"
  } else if (day.opens_at) {
    openMinutes = toMinutes(day.opens_at);
  } else {
    return null;
  }
  // Close time: either fixed clock time or computed dusk (converted to club tz)
  let closeMinutes;
  if (day.closes_at_dusk && duskTime) {
    const duskParts = clubLocalParts(duskTime, timezone);
    closeMinutes = duskParts.minutesOfDay;
  } else if (day.closes_at) {
    closeMinutes = toMinutes(day.closes_at);
  } else if (day.closes_at_dusk && !duskTime) {
    // Dusk requested but not yet loaded — say "open" until we know
    return true;
  } else {
    return null;
  }
  if (openMinutes == null || closeMinutes == null) return null;
  const cur = clubLocalParts(now, timezone).minutesOfDay;
  if (closeMinutes < openMinutes) return cur >= openMinutes || cur < closeMinutes;
  return cur >= openMinutes && cur < closeMinutes;
}

// Back-compat wrapper used by the old single-row API.
export function withinHours(opens_at, closes_at, now = new Date()) {
  if (!opens_at || !closes_at) return null;
  return withinDailyHours({ opens_at, closes_at }, now);
}

// ────────────────────────────────────────────────────────────────────────────
// useNow — current Date, refreshed once per minute. Used by status-bar /
// header components so the time + date stay accurate while the app is open.
// ────────────────────────────────────────────────────────────────────────────
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Align the first tick to the next minute boundary so the clock advances
    // visually when the actual minute changes, not on a 60s offset from mount.
    const secondsUntilMinute = 60 - new Date().getSeconds();
    let interval;
    const align = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60_000);
    }, secondsUntilMinute * 1000);
    return () => { clearTimeout(align); if (interval) clearInterval(interval); };
  }, []);
  return now;
}

export function formatClockTime(d = new Date()) {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
export function formatLongDate(d = new Date()) {
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ────────────────────────────────────────────────────────────────────────────
// useDawn / useDusk — civil twilight at the club's coords. One fetch, two
// values: civil_twilight_begin (dawn) and civil_twilight_end (dusk).
// Cached in module-scope per (lat,lng,date) — we only need each pair once
// per day, and both useDawn() and useDusk() in the same screen share the
// same network call.
// ────────────────────────────────────────────────────────────────────────────
const _sunCache = new Map();        // key → { dawn: Date|null, dusk: Date|null }
const _sunPending = new Map();      // key → in-flight Promise (dedupe concurrent fetches)

function _sunCacheKey(club) {
  const today = new Date().toISOString().slice(0, 10);
  return `${club.lat}:${club.lng}:${today}`;
}

async function _fetchSunTimes(club, key) {
  if (_sunPending.has(key)) return _sunPending.get(key);
  const p = (async () => {
    const url = `https://api.sunrise-sunset.org/json?lat=${club.lat}&lng=${club.lng}&date=today&formatted=0`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`sunrise-sunset ${r.status}`);
    const j = await r.json();
    const dawnIso = j.results?.civil_twilight_begin || j.results?.sunrise;
    const duskIso = j.results?.civil_twilight_end   || j.results?.sunset;
    const pair = {
      dawn: dawnIso ? new Date(dawnIso) : null,
      dusk: duskIso ? new Date(duskIso) : null,
    };
    _sunCache.set(key, pair);
    return pair;
  })();
  _sunPending.set(key, p);
  try { return await p; } finally { _sunPending.delete(key); }
}

// Shared loader used by both useDawn and useDusk so two hooks on one
// screen don't double-fire the API. Returns { dawn, dusk } (either may
// be null until the fetch lands).
function useSunTimes() {
  const { club } = useAuth();
  const [times, setTimes] = useState({ dawn: null, dusk: null });

  useEffect(() => {
    if (!club?.lat || !club?.lng) return;
    const key = _sunCacheKey(club);
    if (_sunCache.has(key)) {
      setTimes(_sunCache.get(key));
      return;
    }
    let cancelled = false;
    _fetchSunTimes(club, key)
      .then(pair => { if (!cancelled) setTimes(pair); })
      .catch(e => { if (!cancelled) console.warn('[sun] failed:', e.message); });
    return () => { cancelled = true; };
  }, [club?.lat, club?.lng]);

  return times;
}

export function useDusk() {
  return useSunTimes().dusk;
}

// v0.7.2: returns today's civil dawn at the club's coords. Same fetch +
// cache as useDusk — calling both on the same screen is a single network
// hit. Returns null until the fetch lands; consumers should fall back to
// the configured opens_at clock time (or "Closed" if opens_at_dawn was
// set without a valid coord pair on the club row).
export function useDawn() {
  return useSunTimes().dawn;
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
    t: cur.main?.temp != null ? Math.round(cur.main.temp) : null,
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
