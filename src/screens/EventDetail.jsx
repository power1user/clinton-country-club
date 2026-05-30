import { useState, useEffect } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNav } from '../hooks/useNav.jsx';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { supabase, isConfigured } from '../lib/supabase.js';
import PendingGuard from '../components/PendingGuard.jsx';
import Replies from '../components/Replies.jsx';

export default function EventDetail({ params }) {
  const ev = params?.event;
  const { club, member, canMemberWrite } = useAuth();
  const { push } = useNav();
  const { trackEvent } = useAnalytics();

  // v0.10.6 — Calendar escape hatch in the header. Reachable from
  // any event detail in one tap regardless of how the member
  // arrived (Home Next Event, calendar, My Events, inbox deep link,
  // notification). Same icon as the Community-tab Calendar card.
  const calendarBtn = (
    <div
      onClick={() => push('community/calendar')}
      data-tap
      title="Open calendar"
      aria-label="Open events calendar"
      style={{ cursor: 'pointer', padding: 6, marginRight: -6, flexShrink: 0 }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="1.5" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    </div>
  );

  if (!ev) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
        <BackHeader title="Event" right={calendarBtn} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted }}>Event not found.</p>
        </div>
      </div>
    );
  }
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  // v0.11.35 — Local mirror of ev.spots so the "X spots remaining"
  // line ticks down immediately when this member RSVPs. The parent
  // useEvents hook ALSO refetches on the realtime event_registrations
  // change so other open sessions / refreshes see the same number,
  // but `ev` itself is a navigation-snapshot prop and won't update
  // for THIS instance after the RSVP write. State copy bridges that.
  const [displaySpots, setDisplaySpots] = useState(ev?.spots ?? 0);
  // Re-sync whenever the inbound ev prop changes (e.g. parent refetch).
  useEffect(() => { setDisplaySpots(ev?.spots ?? 0); }, [ev?.spots]);
  const catColors = { Golf: G.openBg, Social: G.brass, Dining: '#4A5A7A' };

  // Check if member is already registered (only when working against real DB)
  useEffect(() => {
    if (!isConfigured || !member?.id || !ev?.id || typeof ev.id !== 'string') return;
    (async () => {
      const { data } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('event_id', ev.id)
        .eq('member_id', member.id)
        .maybeSingle();
      if (data) setRegistered(true);
    })();
  }, [ev?.id, member?.id]);

  const handleRegister = async () => {
    // v0.11.35 — read from displaySpots so a successful first RSVP
    // doesn't immediately block a Join Waitlist tap on the same screen.
    const remaining = displaySpots;
    if (!isConfigured || !member?.id || typeof ev.id !== 'string') {
      setRegistered(true); // prototype mode fallback
      return;
    }
    setBusy(true); setErr(null);
    // v0.11.35 — set status explicitly. The column default is
    // 'registered', so the "Join Waitlist" path (spots = 0) used to
    // also insert as 'registered' — silently overbooking the event.
    // Now: spots > 0 → registered; spots = 0 → waitlist.
    const status = remaining > 0 ? 'registered' : 'waitlist';
    // v0.9.9: include club_id — RLS policy event_registrations_member_insert
    // requires it (checks m.club_id = event_registrations.club_id against
    // the requesting member's row). Without it, the predicate fails and
    // the insert returns 403 "new row violates row-level security policy."
    const { error } = await supabase.from('event_registrations').insert({
      club_id: club.id,
      event_id: ev.id,
      member_id: member.id,
      status,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setRegistered(true);
    // v0.11.35 — Decrement the displayed remaining count immediately
    // if this RSVP took a spot. Waitlist RSVPs don't take a spot, so
    // we leave it at 0.
    if (status === 'registered') {
      setDisplaySpots(d => Math.max(0, d - 1));
    }
    // v0.10.16 — GA4: event_rsvp_submitted. PII-free.
    trackEvent('event_rsvp_submitted', {
      event_category: ev.cat || ev.category || null,
      rsvp_status: status,
    });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title={ev.cat === 'Golf' ? 'Golf Events' : ev.cat === 'Social' ? 'Social Events' : 'Dining Events'} right={calendarBtn} />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ background: G.green, padding: '20px 20px 24px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 56, height: 60, background: G.greenMid, borderRadius: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 8, color: '#A8D8B8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{ev.dow}</span>
              <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 26, fontWeight: 700, color: '#F2EDE0', lineHeight: 1 }}>{ev.day}</span>
            </div>
            <div>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'white', background: catColors[ev.cat] || G.muted, padding: '2px 8px', borderRadius: 2, display: 'inline-block', marginBottom: 6 }}>{ev.cat}</span>
              <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 22, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.2 }}>{ev.title}</h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {[['Time', ev.time], ['Date', ev.date], ['Fee', ev.price]].map(([k, v]) => (
              <div key={k}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#A8D8B8', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 2px' }}>{k}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', margin: 0, fontWeight: 500 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 20px 8px' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, lineHeight: 1.75, margin: 0 }}>{ev.desc}</p>
        </div>

        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ padding: 14, background: G.card, borderRadius: 4, border: `1px solid ${G.border}`, marginTop: 16 }}>
            {displaySpots === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: G.clsDot, flexShrink: 0 }} />
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: 0 }}>This event is <strong>sold out</strong>. Tap below to join the waitlist.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: G.openDot, flexShrink: 0 }} />
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: 0 }}><strong>{displaySpots} spot{displaySpots > 1 ? 's' : ''}</strong> remaining</p>
              </div>
            )}
          </div>
        </div>

        {!registered ? (
          <div style={{ padding: '0 20px 32px' }}>
            <PendingGuard action="RSVP to events" inline>
              <div
                onClick={busy ? undefined : handleRegister}
                data-tap
                style={{ padding: 14, background: busy ? G.border : G.green, borderRadius: 4, textAlign: 'center', cursor: busy ? 'not-allowed' : 'pointer' }}
              >
                <span style={{ fontFamily: '"Lora",serif', fontSize: 14, color: busy ? G.muted : '#F2EDE0', fontWeight: 500 }}>
                  {busy ? 'Registering…' : displaySpots === 0 ? 'Join Waitlist' : `Register — ${ev.price}`}
                </span>
              </div>
            </PendingGuard>
            {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginTop: 8 }}>{err}</p>}
          </div>
        ) : (
          <div style={{ padding: '0 20px 32px' }}>
            <div style={{ padding: 16, background: G.openBg, borderRadius: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={G.openDot} strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.openTxt, margin: 0, fontWeight: 500 }}>You're registered for {ev.title}</p>
              {/* v0.10.13 — replaced the v0.10.x-era "Confirmation sent
                  to your email on file" line. The app never wired an
                  email service, so that line was a broken promise.
                  Honest copy: members see this in MyClub → My Events
                  and get a push reminder before the event if push is
                  enabled. Transactional email (Brevo) is on the
                  punchlist; see CHANGELOG v0.10.13 for the spec. */}
              <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.openTxt, margin: 0, opacity: 0.85 }}>
                We'll send a push reminder before the event. Find this anytime in MyClub → My Events.
              </p>
            </div>
          </div>
        )}

        {/* Discussion thread — coordinate carpools, ask about format,
            etc. Only meaningful when the event came from the DB (has a
            real id); prototype/seed events don't get one. */}
        {typeof ev.id === 'string' && ev.id.length > 10 && (
          <div style={{ padding: '0 20px 32px' }}>
            <div style={{ padding: '12px 14px', background: G.card, borderRadius: 4, border: `1px solid ${G.border}` }}>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 700 }}>Member Discussion</p>
              <Replies postTable="events" postId={ev.id} defaultOpen />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
