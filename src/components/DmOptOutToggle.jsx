// DmOptOutToggle — lives in the Privacy section of Settings.
//
// Writes to members.allow_dms. Optimistic UI: flip locally then commit
// to Supabase, roll back on failure with a small inline error.
// Existing threads stay open regardless of this setting — the only
// effect is whether NEW DM threads can be initiated with this member
// (enforced both client-side in MemberDirectory and server-side in
// the get_or_create_dm RPC).
//
// Hidden entirely when the club has its dms feature flag off — no
// point letting a member toggle a personal flag that won't matter.
import { useState } from 'react';
import { G } from '../theme.js';
import Toggle from './Toggle.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFlag } from '../hooks/useFlag.js';
import { supabase } from '../lib/supabase.js';

export default function DmOptOutToggle() {
  const { member, refreshMember } = useAuth();
  const dmsOn = useFlag('dms');
  // Treat null/undefined as true (default for new members). allow_dms
  // is the column name; the toggle UX inverts it ("Allow DMs from
  // other members" reads more naturally than "Block").
  const allowed = member?.allow_dms !== false;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // Don't render anything when DMs are disabled at the club level —
  // the personal opt-out has no meaning then.
  if (!dmsOn || !member?.id) return null;

  const onChange = async (next) => {
    if (busy) return;
    setBusy(true); setErr(null);
    const { error } = await supabase
      .from('members')
      .update({ allow_dms: next })
      .eq('id', member.id);
    setBusy(false);
    if (error) {
      setErr("Couldn't save. Try again.");
      return;
    }
    await refreshMember?.();
  };

  return (
    <div style={{ padding: '12px 16px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 6, background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 2px' }}>Allow direct messages</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, lineHeight: 1.45 }}>
            {allowed
              ? 'Other members can send you a DM from the directory.'
              : "You're opted out — your Message button is hidden from other members."}
          </p>
        </div>
        <Toggle
          checked={allowed}
          onChange={onChange}
          disabled={busy}
          ariaLabel="Allow direct messages from other members"
        />
      </div>
      {err && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.clsDot, margin: '8px 0 0' }}>{err}</p>
      )}
      {!allowed && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10, color: G.muted, margin: '8px 0 0', lineHeight: 1.5 }}>
          Existing conversations stay open — only new DMs from members you haven't talked to are blocked.
        </p>
      )}
    </div>
  );
}
