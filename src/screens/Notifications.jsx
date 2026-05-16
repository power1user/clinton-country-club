import { useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';

const NOTIFS = [
  { id: 1, type: 'urgent', time: '10:02am',  title: 'Frost Delay Lifted',          body: 'Play has resumed on all 18 holes as of 10:00am. Cart path restrictions remain on holes 3, 7 & 14.' },
  { id: 2, type: 'event',  time: 'Yesterday',title: 'Invitational Pairings Posted',body: "Saturday's field and tee times are now live in the Events section." },
  { id: 3, type: 'dining', time: 'May 13',   title: 'Dining Reservation Confirmed',body: 'Your reservation for 2 on Saturday, May 17 at 7:00pm has been confirmed.' },
  { id: 4, type: 'course', time: 'May 12',   title: 'Greens Aerification Update',  body: 'All 18 greens are now open. Greens are healing well — expect stimp of 11 by the weekend.' },
  { id: 5, type: 'club',   time: 'May 10',   title: 'Annual Dues — Invoice Sent',  body: 'Your 2026–27 dues invoice has been mailed. Payment is due June 1st. Contact the office with questions.' },
];

export default function Notifications() {
  const [read, setRead] = useState([]);
  const typeColors = { urgent: G.clsDot, event: G.brass, dining: G.openDot, course: '#6A9E78', club: G.muted };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader
        title="Notifications"
        right={
          <div onClick={() => setRead(NOTIFS.map(n => n.id))} data-tap style={{ cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brass }}>Mark all read</span>
          </div>
        }
      />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {NOTIFS.map(n => (
          <div
            key={n.id}
            onClick={() => setRead(p => [...p, n.id])}
            data-tap
            style={{ padding: '14px 20px', borderBottom: `1px solid ${G.border}`, background: read.includes(n.id) ? G.bg : G.card, cursor: 'pointer', display: 'flex', gap: 12 }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: read.includes(n.id) ? G.border : typeColors[n.type], marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text }}>{n.title}</span>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, marginLeft: 8, flexShrink: 0 }}>{n.time}</span>
              </div>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, lineHeight: 1.55, margin: 0 }}>{n.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
