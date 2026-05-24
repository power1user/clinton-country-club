// TermsGate — full-screen acceptance shown when a member's
// terms_accepted_version is below CURRENT_TERMS_VERSION. Rendered by
// App.jsx's Gate before any nav happens, so members can't reach
// in-app screens without agreeing.
//
// "Decline" signs them out (acceptance is mandatory to use the app).
import { useState } from 'react';
import { G } from '../theme.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabase.js';
import { CURRENT_TERMS_VERSION, CURRENT_TERMS_DATE, termsSections } from '../lib/terms.js';
import { PLATFORM_NAME } from '../lib/version.js';

export default function TermsGate() {
  const { club, member, signOut, refreshMember } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const sections = termsSections(club?.name || 'your club');

  const accept = async () => {
    if (!member?.id) return;
    setBusy(true); setErr(null);
    const { error } = await supabase
      .from('members')
      .update({
        terms_accepted_at: new Date().toISOString(),
        terms_accepted_version: CURRENT_TERMS_VERSION,
      })
      .eq('id', member.id);
    if (error) {
      setBusy(false);
      // Most likely an RLS denial — surface a friendly message.
      setErr("Couldn't save your acceptance. Please try again, or sign out and back in.");
      return;
    }
    // Re-hydrate the auth context so needsTermsAcceptance flips to
    // false and the Gate routes past us into the app.
    await refreshMember?.();
    setBusy(false);
  };

  const decline = async () => {
    if (!confirm('Decline and sign out? You can come back and agree later.')) return;
    await signOut();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: G.bg }}>
      {/* Header — matches the StatusBar pattern so it doesn't feel like
          a totally foreign screen, but no clickable nav. */}
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <div style={{ background: G.green, padding: '6px 24px 18px', flexShrink: 0 }}>
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 9, color: '#A8D8B8', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 2px' }}>
          {PLATFORM_NAME} · {club?.name || 'Your club'}
        </p>
        <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 22, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.15 }}>Terms of Use</h1>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: '#A8D8B8', margin: '4px 0 0' }}>
          Version {CURRENT_TERMS_VERSION} · effective {CURRENT_TERMS_DATE}
        </p>
      </div>

      {/* Scrollable terms body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 8px' }}>
        {sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            {s.heading && (
              <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text, margin: '0 0 5px', letterSpacing: '0.02em' }}>
                {s.heading}
              </h3>
            )}
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12.5, color: G.text, margin: 0, lineHeight: 1.6 }}>
              {s.paragraph}
            </p>
          </div>
        ))}
      </div>

      {/* Sticky action bar — Accept is primary, Decline (signs out) is a
          plain text link. Both pinned at the bottom so the user doesn't
          have to scroll all the way through to find them. Safe-area
          padding for iOS PWA home indicator. */}
      <div style={{ flexShrink: 0, padding: '12px 20px max(16px, calc(env(safe-area-inset-bottom) + 10px))', borderTop: `1px solid ${G.border}`, background: G.bg }}>
        {err && (
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, margin: '0 0 8px', textAlign: 'center' }}>{err}</p>
        )}
        <div onClick={busy ? undefined : accept} data-tap style={{ padding: 13, background: busy ? G.muted : G.green, borderRadius: 4, textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 14, color: '#F2EDE0', fontWeight: 500 }}>
            {busy ? 'Saving…' : 'I agree — continue'}
          </span>
        </div>
        <div onClick={busy ? undefined : decline} data-tap style={{ padding: '12px 8px 4px', textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, textDecoration: 'underline', textUnderlineOffset: 2 }}>
            Decline and sign out
          </span>
        </div>
      </div>
    </div>
  );
}
