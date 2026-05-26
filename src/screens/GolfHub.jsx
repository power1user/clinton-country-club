import { G, gCfg } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useFlag } from '../hooks/useFlag.js';
import BellChip from '../components/BellChip.jsx';
import { useClubStatus, usePaceOfPlay, useNow, formatClockTime, formatLongDate, effectiveState, useDusk, useDawn } from '../hooks/useClubData.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useBrand } from '../hooks/useBrand.jsx';
import { DEFAULT_TIMEZONE } from '../lib/timezone.js';
import { guestCanSee } from '../lib/guestAccess.js';

export default function GolfHub() {
  const { push } = useNav();
  const { data: paceRow } = usePaceOfPlay();
  const { data: statusList } = useClubStatus();
  const { club, isGuest, guestAccessLevel } = useAuth();
  const brand = useBrand();
  const now = useNow();
  const pace = paceRow?.time_label || '—';
  const dusk = useDusk();
  const dawn = useDawn();
  // Phase 7 flags — each tile + the live-pace strip filter independently.
  // v0.8.5: AND-gated with guest visibility per the spec — guests at
  // any access level can see pin/map/pace; partner_board is members-
  // only; tee_time_booking is members-only.
  const pinOn      = useFlag('pin_placements')    && (!isGuest || guestCanSee(guestAccessLevel, 'pin_placements'));
  const mapOn      = useFlag('course_map')        && (!isGuest || guestCanSee(guestAccessLevel, 'course_map'));
  const teeOn      = useFlag('tee_time_booking')  && !isGuest;
  const partnersOn = useFlag('partner_board')     && !isGuest;
  const paceOn     = useFlag('pace_of_play')      && (!isGuest || guestCanSee(guestAccessLevel, 'pace_of_play'));

  // v0.7.8: real Course pill state instead of the previously hardcoded
  // "Course Open" string. Look up by category 'course' (the canonical
  // identifier for the main golf-course status pill); fall back to the
  // first status row if the club hasn't labeled one as 'course'.
  // effectiveState handles auto-toggle from manual + scheduled hours +
  // dusk/dawn — same logic the status pills on Home use.
  const tz = club?.timezone || DEFAULT_TIMEZONE;
  const coursePill = statusList.find(s => s.id === 'course') || statusList[0] || null;
  const courseEff  = coursePill ? effectiveState(coursePill, new Date(), { dusk, dawn }, tz) : 'closed';
  const courseCfg  = gCfg(courseEff);
  const courseLabel = courseEff === 'open'    ? `${coursePill?.label || 'Course'} Open`
                   : courseEff === 'limited'  ? `${coursePill?.label || 'Course'} Limited`
                   : courseEff === 'members'  ? `${coursePill?.label || 'Course'} — Members`
                                              : `${coursePill?.label || 'Course'} Closed`;

  const features = [
    pinOn      && { id: 'pin',      title: 'Pin Placement', sub: `Daily maps · ${brand.holes} holes`, icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.4"><circle cx="12" cy="10" r="3"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg> },
    mapOn      && { id: 'map',      title: 'Course Map',    sub: `Satellite · ${brand.holes} holes`,   icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.4"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg> },
    teeOn      && { id: 'tee',      title: 'Book Tee Time', sub: 'Up to 7 days ahead',     icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.4"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    partnersOn && { id: 'partners', title: 'Golf Partners', sub: 'Find foursomes',         icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.4"><circle cx="9" cy="7" r="4"/><circle cx="17" cy="7" r="4"/><path d="M1 20c0-3 3.6-5.5 8-5.5s8 2.5 8 5.5"/></svg> },
  ].filter(Boolean);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0, display: 'flex', alignItems: 'flex-end', padding: '0 20px 9px' }}>
        <span style={{ color: '#A8D8B8', fontSize: 11, fontFamily: '"Lora",serif' }}>{formatClockTime(now)}</span>
      </div>
      <div style={{ background: G.green, padding: '4px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 9, color: '#A8D8B8', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 1px' }}>{brand.prefix}</p>
            <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.1 }}>Golf</h1>
          </div>
          <BellChip />
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: '#A8D8B8', margin: '6px 0 0' }}>{formatLongDate(now)}</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* v0.7.8: course status row now reads from useClubStatus
            instead of the previous always-"Course Open" hardcode. */}
        <div style={{ padding: '12px 20px', background: G.greenMid, display: 'flex', gap: 16 }}>
          {coursePill && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: courseCfg.dot, flexShrink: 0 }} />
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#D0E8D8', fontWeight: 500 }}>{courseLabel}</span>
            </div>
          )}
          {/* Pace strip — Phase 7 flag, default ON. v0.7.8: live pace
              message (e.g. "Slightly slow") instead of hardcoded "On
              pace" suffix. */}
          {paceOn && (
            <>
              {coursePill && <div style={{ width: 1, background: 'rgba(255,255,255,0.12)' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: paceRow?.state === 'closed' ? G.clsDot : paceRow?.state === 'limited' ? G.limDot : G.openDot, flexShrink: 0 }} />
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#D0E8D8' }}>
                  Pace {pace}{paceRow?.message ? ` · ${paceRow.message}` : ''}
                </span>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '16px 16px 8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {features.map(f => (
              <div key={f.id} onClick={() => push(`golf/${f.id}`)} data-tap style={{ background: G.green, borderRadius: 6, padding: '18px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid rgba(122,172,136,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{f.icon}</div>
                <div>
                  <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: '#F2EDE0', margin: '0 0 2px' }}>{f.title}</p>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#A8D8B8', margin: 0 }}>{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* v0.7.8: removed two hardcoded mock blocks here —
              · "Course Conditions Today" (5 fake rows: course status,
                cart restrictions, greens stimp, fairways, rough)
              · "Next Available Tee Times" preview (3 fake slots)
            Both looked legit but were manufactured data. Course
            conditions belongs to a future course_conditions table
            (not yet on the roadmap); the tee-times preview belongs
            to a real tee_time_booking backend (still a placeholder
            feature per v0.7.0's catalog). Better to render nothing
            than fake authority. */}
      </div>
    </div>
  );
}
