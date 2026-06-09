// OnboardingCodesAdmin — super_admin UI for managing C-codes
// (club-create QR onboarding). Phase 19, v0.17.0.
//
// Workflow:
//   1. Click "Generate New Code"
//   2. Fill in: club name, desired slug, optional contact email,
//      optional expiry (defaults to 30 days).
//   3. Click Generate. A 5-digit code (C-XXXXX) is minted server-side.
//   4. The code is displayed BIG with a Copy button. Drop it into a
//      QR-printing tool, screenshot it, dictate it at a meeting.
//   5. Existing codes show in a list below with redemption status
//      and a Revoke action.

import { useState, useEffect } from 'react';
import { G } from '../../theme.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useConfirm } from '../../components/ConfirmModal.jsx';
import BottomSheetModal from '../../components/BottomSheetModal.jsx';
import { inputStyle, labelStyle, FormRow, Field } from '../../lib/formStyles.jsx';

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return '—'; }
}

function statusFor(row) {
  if (row.revoked_at)                              return { label: 'Revoked',   color: G.muted };
  if (row.target_club_id || row.last_redeemed_at)  return { label: 'Redeemed',  color: G.brass };
  if (row.expires_at && new Date(row.expires_at) < new Date()) return { label: 'Expired',  color: G.muted };
  return { label: 'Active', color: G.green };
}

export default function OnboardingCodesAdmin() {
  const { isSuperAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [showGen, setShowGen] = useState(false);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);
  const confirmAsync = useConfirm();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr(null);
      const { data, error } = await supabase
        .from('pending_codes')
        .select('id, prefix, code, spec_club_name, spec_club_slug, expires_at, revoked_at, redemption_count, max_redemptions, target_club_id, last_redeemed_at, last_redeemed_by_user_id, email_lock, notes, created_at')
        .eq('prefix', 'C')
        .order('created_at', { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (error) setErr(error.message);
      setRows(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [version]);

  const revoke = async (row) => {
    if (!(await confirmAsync({
      title: `Revoke ${row.code}?`,
      body: `If anyone tries to redeem this code, they'll see "code revoked." Existing redemptions stay (you can't un-create a club this way).`,
      confirmLabel: 'Revoke',
      danger: true,
    }))) return;
    const { error } = await supabase
      .from('pending_codes')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', row.id);
    if (error) { setErr(error.message); return; }
    refresh();
  };

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch { /* */ }
  };

  if (!isSuperAdmin) {
    return (
      <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, padding: 18, textAlign: 'center' }}>
        Super-admin only.
      </p>
    );
  }

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 14px', lineHeight: 1.55 }}>
        Generate <strong>C-codes</strong> to give prospects at sales meetings. The QR you print
        on golf balls / cards is generic; the code is the credential. Each code creates ONE
        new club when redeemed and grants the redeemer <strong>club_manager</strong> of that club.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div
          onClick={() => setShowGen(true)}
          data-tap
          style={{ padding: '9px 16px', background: G.green, borderRadius: 4, cursor: 'pointer' }}
        >
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 600 }}>
            + Generate Club Code
          </span>
        </div>
      </div>

      {err && (
        <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, margin: '0 0 12px' }}>{err}</p>
      )}

      {loading ? (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: 18 }}>
          Loading codes…
        </p>
      ) : rows.length === 0 ? (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: 16, textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
            No codes yet. Click <strong>+ Generate Club Code</strong> to mint one.
          </p>
        </div>
      ) : (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {rows.map((r, i) => {
            const status = statusFor(r);
            const canRevoke = !r.revoked_at && !r.target_club_id;
            return (
              <div key={r.id} style={{
                padding: '12px 14px',
                borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: G.text, letterSpacing: '0.06em' }}>
                      {r.code}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px', background: status.color, borderRadius: 10,
                        fontFamily: '"Lora",serif', fontSize: 9, color: '#F2EDE0',
                        letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: 0 }}>
                    {r.spec_club_name} <span style={{ color: G.muted }}>· {r.spec_club_slug}.groundslive.com</span>
                  </p>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0' }}>
                    Created {fmtDate(r.created_at)}
                    {r.expires_at && ` · expires ${fmtDate(r.expires_at)}`}
                    {r.last_redeemed_at && ` · redeemed ${fmtDateTime(r.last_redeemed_at)}`}
                    {r.email_lock && ` · ${r.email_lock}`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div
                    onClick={() => copy(r.code)}
                    data-tap
                    style={{ padding: '6px 12px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer' }}
                    title="Copy code"
                  >
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, fontWeight: 500 }}>Copy</span>
                  </div>
                  {canRevoke && (
                    <div
                      onClick={() => revoke(r)}
                      data-tap
                      style={{ padding: '6px 12px', cursor: 'pointer' }}
                    >
                      <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, fontWeight: 500 }}>Revoke</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showGen && (
        <GenerateCodeModal
          onClose={() => setShowGen(false)}
          onSaved={() => { setShowGen(false); refresh(); }}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// GenerateCodeModal — the form for minting a new C-code
// ───────────────────────────────────────────────────────────────
function GenerateCodeModal({ onClose, onSaved }) {
  const [clubName, setClubName] = useState('');
  const [slug, setSlug] = useState('');
  const [emailLock, setEmailLock] = useState('');
  const [expiryDays, setExpiryDays] = useState('30');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [createdCode, setCreatedCode] = useState(null);

  const slugify = (s) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '').slice(0, 32);

  // Auto-derive slug from name as user types (until user manually edits it)
  const [slugDirty, setSlugDirty] = useState(false);
  useEffect(() => {
    if (!slugDirty) setSlug(slugify(clubName));
  }, [clubName, slugDirty]);

  const generate = async () => {
    setErr(null);
    if (!clubName.trim() || clubName.trim().length < 2) { setErr('Enter a club name.'); return; }
    if (!slug || slug.length < 2) { setErr('Slug looks too short.'); return; }
    if (!/^[a-z0-9-]+$/.test(slug)) { setErr('Slug can only contain lowercase letters, numbers, and dashes.'); return; }
    if (emailLock && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLock.trim())) {
      setErr('Email lock looks invalid.'); return;
    }
    const days = parseInt(expiryDays, 10);
    if (isNaN(days) || days < 1 || days > 365) { setErr('Expiry should be 1–365 days.'); return; }

    setBusy(true);
    try {
      // Generate the unique code server-side
      const { data: codeData, error: genErr } = await supabase.rpc('generate_pending_code', { p_prefix: 'C' });
      if (genErr) throw genErr;
      const code = codeData;

      // Insert the row
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from('pending_codes').insert({
        prefix: 'C',
        code,
        spec_club_name: clubName.trim(),
        spec_club_slug: slug,
        intended_role: 'club_manager',
        max_redemptions: 1,
        expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        email_lock: emailLock.trim() || null,
        created_by_user_id: user.id,
      });
      if (insErr) throw insErr;

      setCreatedCode(code);
    } catch (e) {
      setErr(e.message || 'Could not generate code.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(createdCode); } catch { /* */ }
  };

  return (
    <BottomSheetModal title={createdCode ? 'Code Generated' : 'Generate Club Code'} onClose={createdCode ? () => onSaved() : onClose}>
      {createdCode ? (
        <div>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '0 0 14px', lineHeight: 1.55 }}>
            Give this code to the prospect. They'll scan the QR, enter it, and become club_manager of <strong>{clubName}</strong>.
          </p>
          <div style={{ background: G.green, borderRadius: 8, padding: 28, textAlign: 'center', marginBottom: 12 }}>
            <p style={{ fontFamily: 'monospace', fontSize: 36, fontWeight: 800, color: '#F2EDE0', margin: 0, letterSpacing: '0.12em' }}>
              {createdCode}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div
              onClick={copy}
              data-tap
              style={{ flex: 1, padding: 12, background: G.brass, borderRadius: 4, textAlign: 'center', cursor: 'pointer', fontFamily: '"Lora",serif', fontSize: 13, color: '#1A180F', fontWeight: 600 }}
            >
              Copy Code
            </div>
            <div
              onClick={() => onSaved()}
              data-tap
              style={{ flex: 1, padding: 12, background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, textAlign: 'center', cursor: 'pointer', fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500 }}
            >
              Done
            </div>
          </div>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '14px 0 0', textAlign: 'center' }}>
            They scan the QR at groundslive.com/code and enter this code.
          </p>
        </div>
      ) : (
        <div>
          <FormRow>
            <Field label="Club name" required>
              <input
                value={clubName}
                onChange={e => setClubName(e.target.value)}
                placeholder="Pine Ridge Country Club"
                autoFocus
                style={inputStyle}
              />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Slug" required hint="Becomes their subdomain: slug.groundslive.com">
              <input
                value={slug}
                onChange={e => { setSlug(slugify(e.target.value)); setSlugDirty(true); }}
                placeholder="pineridge"
                style={inputStyle}
              />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Lock to email (optional)" hint="Only this email can redeem the code">
              <input
                type="email"
                value={emailLock}
                onChange={e => setEmailLock(e.target.value)}
                placeholder="gm@pineridge.com"
                style={inputStyle}
              />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Expires after (days)" required>
              <input
                type="number"
                min="1"
                max="365"
                value={expiryDays}
                onChange={e => setExpiryDays(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </FormRow>

          {err && (
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, margin: '6px 0 12px' }}>{err}</p>
          )}

          <div
            onClick={busy ? undefined : generate}
            data-tap
            style={{
              padding: 14, background: G.green, borderRadius: 4,
              textAlign: 'center', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
              fontFamily: '"Lora",serif', fontSize: 14, fontWeight: 600, color: '#F2EDE0', letterSpacing: '0.04em',
            }}
          >
            {busy ? 'Generating…' : 'Generate Code'}
          </div>
        </div>
      )}
    </BottomSheetModal>
  );
}
