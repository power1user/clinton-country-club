// MemberTiersAdmin — v0.15.20
//
// Per-club configurable tier list. Until v0.15.20 the Tier dropdown
// in the member edit form was hardcoded as ['Full Member', 'Social
// Member', 'Junior Member', 'Honorary', 'Other'] — every club got
// the same list whether they used those terms or not.
//
// Now: clubs.member_tiers is a jsonb array of strings. This screen
// is the manager-side UI to edit it. The PersonEditModal Tier
// dropdown reads from the club's list at modal-open time.
//
// Pattern matches DepartmentsAdmin's row UX: list with reorder +
// rename + delete + add-at-bottom. Manager-only (gated upstream in
// AdminPanel.jsx via managerOnly: true on the section entry).

import { useEffect, useState } from 'react';
import { G } from '../../theme.js';
import { supabase } from '../../lib/supabase.js';
import { inputStyle, labelStyle } from '../../lib/formStyles.jsx';
import BottomSheetModal from '../../components/BottomSheetModal.jsx';   // v0.15.26 — shared shell (back-button handling baked in)
import { useConfirm } from '../../components/ConfirmModal.jsx';   // v0.16.8b

export default function MemberTiersAdmin({ club }) {
  const confirmAsync = useConfirm(); // v0.16.8b — shared confirm modal
  const [tiers, setTiers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [editing, setEditing] = useState(null);   // { index, value } or { mode: 'add' }
  const [err, setErr]         = useState(null);

  const load = async () => {
    if (!club?.id) return;
    setLoading(true); setErr(null);
    const { data, error } = await supabase
      .from('clubs').select('member_tiers').eq('id', club.id).single();
    if (error) setErr(error.message);
    setTiers(Array.isArray(data?.member_tiers) ? data.member_tiers : []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [club?.id]);

  // Persist a new tier list to the club.
  const persist = async (next) => {
    setSaving(true); setErr(null);
    const { error } = await supabase
      .from('clubs').update({ member_tiers: next }).eq('id', club.id);
    setSaving(false);
    if (error) { setErr(error.message); return false; }
    setTiers(next);
    return true;
  };

  const move = async (i, dir) => {
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= tiers.length) return;
    const next = tiers.slice();
    [next[i], next[j]] = [next[j], next[i]];
    await persist(next);
  };

  const remove = async (i) => {
    const v = tiers[i];
    // Use server-side count to warn if any members are currently on this tier
    const { count } = await supabase
      .from('members').select('id', { count: 'exact', head: true })
      .eq('club_id', club.id).eq('tier', v);
    const usageMsg = count
      ? `\n\n${count} member${count === 1 ? '' : 's'} currently have${count === 1 ? 's' : ''} this tier. Removing the tier from the list does NOT change their record — they'll keep the tier value, but you won't be able to set new members to it.`
      : '';
    // v0.16.8b — shared confirm modal (was window.confirm)
    if (!(await confirmAsync({
      title: `Remove the "${v}" tier?`,
      body: usageMsg || undefined,
      confirmLabel: 'Remove tier',
      danger: true,
    }))) return;
    const next = tiers.slice();
    next.splice(i, 1);
    await persist(next);
  };

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 14px', lineHeight: 1.55 }}>
        This is the list of tier values that appears in the <strong>Tier</strong> dropdown on
        member edit forms. Rename freely; existing members' tier values are not rewritten
        automatically (treat each tier label as a stable string).
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div
          onClick={() => setEditing({ mode: 'add' })}
          data-tap
          style={{ padding: '8px 14px', background: G.green, borderRadius: 4, cursor: 'pointer' }}
        >
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 600 }}>+ Add Tier</span>
        </div>
      </div>

      {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, margin: '0 0 10px' }}>{err}</p>}

      {loading ? (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0' }}>Loading tiers…</p>
      ) : tiers.length === 0 ? (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: 16, textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
            No tiers yet. Add at least one — the Tier dropdown will be empty otherwise.
          </p>
        </div>
      ) : (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {tiers.map((t, i) => (
            <div key={`${t}-${i}`} style={{
              display: 'flex', alignItems: 'center',
              padding: '12px 14px',
              borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
              gap: 10,
              opacity: saving ? 0.6 : 1,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <div onClick={saving ? undefined : () => move(i, 'up')}   data-tap style={{ width: 22, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: i === 0 ? 'not-allowed' : 'pointer', opacity: i === 0 ? 0.3 : 1 }} title="Move up">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2.5"><polyline points="6 15 12 9 18 15" /></svg>
                </div>
                <div onClick={saving ? undefined : () => move(i, 'down')} data-tap style={{ width: 22, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: i === tiers.length - 1 ? 'not-allowed' : 'pointer', opacity: i === tiers.length - 1 ? 0.3 : 1 }} title="Move down">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>

              <div
                onClick={saving ? undefined : () => setEditing({ index: i, value: t })}
                data-tap
                style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
              >
                <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: 0, fontWeight: 500 }}>{t}</p>
              </div>

              <div onClick={saving ? undefined : () => remove(i)} data-tap style={{ padding: '6px 10px', cursor: 'pointer', flexShrink: 0 }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, fontWeight: 500 }}>Remove</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TierEditModal
          mode={editing.mode === 'add' ? 'add' : 'edit'}
          value={editing.value || ''}
          existing={tiers.filter((_, i) => editing.mode === 'add' || i !== editing.index)}
          onClose={() => setEditing(null)}
          onSave={async (newValue) => {
            const next = tiers.slice();
            if (editing.mode === 'add') next.push(newValue);
            else                        next[editing.index] = newValue;
            const ok = await persist(next);
            if (ok) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// TierEditModal — name-only add/rename. Validates uniqueness + non-empty.
// ───────────────────────────────────────────────────────────────
function TierEditModal({ mode, value, existing, onClose, onSave }) {
  const isAdd = mode === 'add';
  const [name, setName] = useState(value);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(null);

  const trimmed = name.trim();
  const dup = !!trimmed && existing.map(s => s.toLowerCase()).includes(trimmed.toLowerCase());
  const isValid = !!trimmed && !dup && trimmed !== value && !busy;
  const isAddValid = !!trimmed && !dup && !busy;
  const canSave = isAdd ? isAddValid : isValid;

  const save = async () => {
    if (!canSave) return;
    setBusy(true); setErr(null);
    try {
      await onSave(trimmed);
    } catch (e) {
      setErr(e?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (canSave) save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSave, name]);

  return (
    <BottomSheetModal title={isAdd ? 'Add Tier' : 'Rename Tier'} onClose={onClose}>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>
          Tier name
          <span style={{ color: G.clsDot, marginLeft: 3, fontWeight: 700 }}>*</span>
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Equity, Social, Junior, Honorary"
          autoFocus
          style={inputStyle}
        />
        {dup && (
          <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.clsDot, margin: '4px 0 0' }}>
            A tier named &ldquo;{trimmed}&rdquo; already exists in this club.
          </p>
        )}
      </div>

      {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}

      <div onClick={canSave ? save : undefined} data-tap
        style={{
          padding: 12,
          background: canSave ? G.green : G.border,
          borderRadius: 3, textAlign: 'center',
          cursor: canSave ? 'pointer' : 'not-allowed',
          opacity: busy ? 0.6 : 1,
        }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: canSave ? '#F2EDE0' : G.muted, fontWeight: 500 }}>
          {busy ? 'Saving…' : (isAdd ? 'Add Tier' : 'Save')}
        </span>
      </div>

      <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, margin: '8px 0 0', textAlign: 'right', letterSpacing: '0.06em' }}>
        ESC to close · Ctrl/⌘+Enter to save
      </p>
    </BottomSheetModal>
  );
}
