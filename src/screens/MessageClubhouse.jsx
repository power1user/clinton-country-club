// Member starts a new conversation with the clubhouse. Picks a topic
// (which becomes the thread subject), then we create a thread, add
// them as a participant, and drop them into the Thread view to type
// the first message.
import { useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNav } from '../hooks/useNav.jsx';
import { supabase } from '../lib/supabase.js';
import PendingGuard from '../components/PendingGuard.jsx';
import FeatureOff from '../components/FeatureOff.jsx';

const TOPICS = [
  { id: 'Pro Shop',   desc: 'Lessons, equipment, fittings, tee-time requests' },
  { id: 'Restaurant', desc: 'Reservations, menu questions, dietary needs' },
  { id: 'Tee Times',  desc: 'Booking, changes, cancellations, foursomes' },
  { id: 'Course',     desc: 'Conditions, pace of play, pin placements' },
  { id: 'General',    desc: "Anything else for the front office" },
];

export default function MessageClubhouse() {
  const { club, member, session, canMemberWrite, isGuest } = useAuth();
  const { push, pop } = useNav();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // v0.8.2: guests can't open clubhouse threads. They have the
  // contact-the-club info on the thank-you screen instead.
  if (isGuest) return <FeatureOff label="Message Clubhouse" body="Messaging is for club members only. The club's contact info is on your guest profile screen." />;

  if (!canMemberWrite) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
        <BackHeader title="Message Clubhouse" />
        <PendingGuard action="message the clubhouse" />
      </div>
    );
  }

  const startThread = async (topic) => {
    if (!club || !session?.user?.id || busy) return;
    setBusy(true); setErr(null);

    // 1) Create the thread
    const { data: thread, error: tErr } = await supabase
      .from('threads')
      .insert({
        club_id: club.id,
        kind: 'clubhouse',
        subject: topic,
        created_by: session.user.id,
      })
      .select()
      .single();
    if (tErr) { setBusy(false); setErr(tErr.message); return; }

    // 2) Add the member as a participant
    const { error: pErr } = await supabase
      .from('thread_participants')
      .insert({
        thread_id: thread.id,
        user_id: session.user.id,
        member_id: member?.id || null,
        role: 'member',
      });
    if (pErr) { setBusy(false); setErr(pErr.message); return; }

    // 3) Drop straight into the new Thread view so they can type the first message.
    //    Pop the compose screen first so back from Thread returns to MyClub.
    pop();
    setTimeout(() => push('thread', { threadId: thread.id }), 0);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Message Clubhouse" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px 28px' }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 18px', textAlign: 'center', lineHeight: 1.5 }}>
          What's this about? Pick a topic and we'll route your message to the right staff.
        </p>

        {err && (
          <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, margin: '0 0 12px', textAlign: 'center' }}>{err}</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TOPICS.map(t => (
            <div
              key={t.id}
              onClick={() => startThread(t.id)}
              data-tap
              style={{
                padding: '14px 16px',
                background: G.card,
                border: `1px solid ${G.border}`,
                borderRadius: 6,
                cursor: busy ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 6, background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.brassLt} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 2px' }}>{t.id}</h3>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>{t.desc}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
