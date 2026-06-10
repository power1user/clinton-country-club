// AIUsageAdmin — v0.14.3. Super_admin GroundsLive AI usage dashboard.
// Reads three rollup RPCs from migration 74 — platform summary by
// mode, per-club breakdown, top users. Default window 30 days.
// Lives in its own file (not sections.jsx) so the file split now
// pays off — future v0.14.x patches add columns and tiles here
// without bloating the 6KLOC sections.jsx.

import { useState, useEffect } from 'react';
import { G } from '../../theme.js';
import { supabase } from '../../lib/supabase.js';

function UsageTile({ label, value, sub, accent }) {
  return (
    <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '12px 14px' }}>
      <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 22, color: accent || G.text, fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, fontStyle: 'italic', margin: '3px 0 0' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function ModeBadge({ mode }) {
  return (
    <span style={{
      fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0',
      background: mode === 'admin' ? G.green : G.greenMid,
      padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase',
      letterSpacing: '0.06em', fontWeight: 700, flexShrink: 0,
    }}>
      {mode}
    </span>
  );
}

export default function AIUsageAdmin() {
  const [summary, setSummary] = useState([]);
  const [byClub, setByClub] = useState([]);
  const [byUser, setByUser] = useState([]);
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState(30);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - windowDays * 86400000).toISOString();
      const [{ data: s }, { data: c }, { data: u }] = await Promise.all([
        supabase.rpc('ai_usage_summary',  { p_since: since }),
        supabase.rpc('ai_usage_by_club',  { p_since: since }),
        supabase.rpc('ai_usage_by_user',  { p_since: since, p_limit: 20 }),
      ]);
      if (cancelled) return;
      setSummary(s || []);
      setByClub(c || []);
      setByUser(u || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [windowDays]);

  // Format cents at three scales so a $0.0006 admin question reads
  // as ¢0.060 and a $14.32 monthly total reads as $14.32.
  const fmtCents = (cents) => {
    const n = Number(cents) || 0;
    if (n < 1)   return `¢${n.toFixed(3)}`;
    if (n < 100) return `¢${n.toFixed(2)}`;
    return       `$${(n / 100).toFixed(2)}`;
  };

  const admin  = summary.find(r => r.mode === 'admin');
  const member = summary.find(r => r.mode === 'member');
  const platformTotal =
    (Number(admin?.total_cost_cents) || 0) + (Number(member?.total_cost_cents) || 0);

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 12px' }}>
        Per-call AI cost log, rolled up per club, per user, per mode. Admin AI bills to Grounds Live; Member AI rolls up per club. Window:
      </p>

      {/* Window picker */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[7, 30, 90].map(d => (
          <div key={d} onClick={() => setWindowDays(d)} data-tap
            style={{
              padding: '6px 14px', borderRadius: 14,
              background: windowDays === d ? G.brass : G.card,
              border: `1px solid ${windowDays === d ? G.brass : G.border}`,
              cursor: 'pointer',
            }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: windowDays === d ? '#F2E5C0' : G.muted, fontWeight: windowDays === d ? 600 : 400 }}>
              Last {d} days
            </span>
          </div>
        ))}
      </div>

      {loading ? (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0' }}>
          Loading AI usage…
        </p>
      ) : (
        <>
          {/* Cost tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 18 }}>
            <UsageTile label="Platform total"            value={fmtCents(platformTotal)} accent={G.brass} />
            <UsageTile label="Admin AI (Grounds-billed)" value={fmtCents(admin?.total_cost_cents || 0)}  sub={`${admin?.call_count || 0} calls`}  accent={G.green} />
            <UsageTile label="Member AI (club-billed)"   value={fmtCents(member?.total_cost_cents || 0)} sub={`${member?.call_count || 0} calls`} accent={G.greenMid} />
            <UsageTile label="Admin cache hit"           value={`${admin?.cache_hit_rate || 0}%`}        sub="prompt cache"                      accent={G.muted} />
          </div>

          {/* Per-club breakdown */}
          <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: '0 0 10px' }}>
            Per-club usage
          </h4>
          {byClub.length === 0 ? (
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 18px' }}>
              No AI calls in the selected window.
            </p>
          ) : (
            <div style={{ background: G.card, borderRadius: 4, border: `1px solid ${G.border}`, marginBottom: 18 }}>
              {byClub.map((r, i) => (
                <div key={`${r.club_id || 'platform'}-${r.mode}`} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: 0, fontWeight: 500 }}>{r.club_name}</p>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0' }}>
                      {r.call_count} call{r.call_count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <ModeBadge mode={r.mode} />
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
                    {fmtCents(r.total_cost_cents)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Top users */}
          <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: '0 0 10px' }}>
            Top users
          </h4>
          {byUser.length === 0 ? (
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
              No users.
            </p>
          ) : (
            <div style={{ background: G.card, borderRadius: 4, border: `1px solid ${G.border}` }}>
              {byUser.map((r, i) => (
                <div key={`${r.user_id}-${r.mode}`} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.user_email || '(unknown)'}
                    </p>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0' }}>
                      {r.call_count} call{r.call_count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <ModeBadge mode={r.mode} />
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
                    {fmtCents(r.total_cost_cents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
