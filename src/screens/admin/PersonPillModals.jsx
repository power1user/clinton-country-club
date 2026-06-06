// PersonPillModals — v0.15.16
//
// Sub-modals opened from the status / role pills at the top of the
// PersonEditModal identity strip. Replaces the flat "Actions" tap row
// from v0.15.10–v0.15.15:
//
//   v0.15.10 pattern — a list of single-tap "Mark Member Inactive"-style
//     rows with NO confirm step. Trivially easy to misfire on a paying
//     member's status.
//
//   v0.15.16 pattern — status + role are glanceable pills at the top
//     of the card AND are the click targets for transitions. Each click
//     opens a sub-modal that:
//       · Lists the legal transitions with a plain-English consequence
//       · Has an optional "Reason" text field, audited to
//         people_audit_log.metadata.reason
//       · Requires an explicit Confirm tap
//     This adds one extra step before any destructive move and captures
//     the "why" for the audit trail Marc shipped in v0.15.9.
//
// Mobile + desktop: both sub-modals use the same bottom-sheet pattern
// as the parent PersonEditModal (slides up on mobile, floats centered
// on desktop with the same layout). Phone back-button dismisses them
// via the existing useModalBackClose hook applied to the parent.

import { useEffect, useState } from 'react';
import { G } from '../../theme.js';
import { supabase } from '../../lib/supabase.js';
import { useModalBackClose } from '../../hooks/useModalBackClose.js';

// ── Visual helpers — pill colors keyed by status/role enum ──────
export const STATUS_COLOR = {
  active:                  { bg: G.green,  fg: '#F2EDE0', label: 'Active'        },
  pending:                 { bg: G.brass,  fg: '#F2E5C0', label: 'Pending'       },
  inactive:                { bg: G.muted,  fg: '#F2EDE0', label: 'Inactive'      },
  pending_authentication:  { bg: G.brass,  fg: '#F2E5C0', label: 'Unverified'    },
  graduated:               { bg: G.muted,  fg: '#F2EDE0', label: 'Graduated'     },
  expired:                 { bg: G.muted,  fg: '#F2EDE0', label: 'Expired'       },
};
export const ROLE_COLOR = {
  member:        { bg: G.green,  fg: '#F2EDE0', label: 'Member'      },
  guest:         { bg: G.brass,  fg: '#F2E5C0', label: 'Guest'       },
  club_admin:    { bg: G.brass,  fg: '#F2E5C0', label: 'Admin'       },
  club_manager:  { bg: G.brass,  fg: '#F2E5C0', label: 'Manager'     },
  super_admin:   { bg: '#3F4A5C', fg: '#F2E5C0', label: 'Super Admin' },
};

export function StatusPill({ status, onClick, disabled }) {
  const cfg = STATUS_COLOR[status] || { bg: G.muted, fg: '#F2EDE0', label: status || '—' };
  return (
    <div
      onClick={disabled ? undefined : onClick}
      data-tap={!disabled || undefined}
      title={disabled ? 'Read-only — managers can change status' : 'Click to change status'}
      style={{
        padding: '6px 12px',
        borderRadius: 14,
        background: cfg.bg,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.85 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.fg, opacity: 0.8 }} />
      <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: cfg.fg, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {cfg.label}
      </span>
    </div>
  );
}

export function RolePill({ role, onClick, disabled }) {
  const cfg = ROLE_COLOR[role] || { bg: G.muted, fg: '#F2EDE0', label: role || '—' };
  return (
    <div
      onClick={disabled ? undefined : onClick}
      data-tap={!disabled || undefined}
      title={disabled ? 'Read-only — managers can change role' : 'Click to change role'}
      style={{
        padding: '6px 12px',
        borderRadius: 14,
        background: cfg.bg,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.85 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={cfg.fg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: cfg.fg, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {cfg.label}
      </span>
    </div>
  );
}

// ── Shared sub-modal shell — used by both status + role modals ──
function SubModalShell({ title, subtitle, children, onClose }) {
  useModalBackClose(true, onClose);
  return (
    <div
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 30 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 10 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>{title}</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>
        {subtitle && (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '0 0 14px', lineHeight: 1.55 }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

// ── StatusChangeModal ───────────────────────────────────────────
// Opens when the status pill is tapped. Lists legal transitions for
// a member. Plain-English consequence on each option. Reason field
// (optional, audited). Explicit Confirm before fire.
export function StatusChangeModal({ person, club, currentStatus, onClose, onApplied }) {
  const [target, setTarget] = useState(null);     // 'active' | 'pending' | 'inactive'
  const [reason, setReason] = useState('');
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState(null);

  const OPTIONS = [
    { value: 'active',   label: 'Active',   blurb: "They're an active club member with full app access." },
    { value: 'pending',  label: 'Pending',  blurb: 'They appear in the directory but their account is pending verification.' },
    { value: 'inactive', label: 'Inactive', blurb: 'Their record is preserved for history. They lose member-level access.' },
  ];

  const apply = async () => {
    if (!target || target === currentStatus) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc('change_member_status', {
      p_auth_user_id: person.auth_user_id,
      p_club_id: club.id,
      p_to_status: target,
      p_reason: reason.trim() || null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onApplied?.(target);
  };

  return (
    <SubModalShell
      title={`Change status — ${person.name || 'this member'}`}
      subtitle="Pick a new status. The change is audited and surfaces in this person's Activity History below."
      onClose={onClose}
    >
      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
        {OPTIONS.map((opt, i) => {
          const isCurrent = opt.value === currentStatus;
          const isSelected = opt.value === target;
          const cfg = STATUS_COLOR[opt.value];
          return (
            <div
              key={opt.value}
              onClick={isCurrent ? undefined : () => setTarget(opt.value)}
              data-tap={!isCurrent || undefined}
              style={{
                display: 'flex', alignItems: 'flex-start',
                padding: '12px 14px',
                borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
                gap: 12,
                background: isSelected ? G.bg : 'transparent',
                cursor: isCurrent ? 'default' : 'pointer',
                opacity: isCurrent ? 0.55 : 1,
              }}
            >
              {/* radio dot */}
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                border: `2px solid ${isSelected ? cfg.bg : G.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
              }}>
                {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.bg }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: 0, fontWeight: 600 }}>
                  {opt.label}
                  {isCurrent && <span style={{ marginLeft: 8, fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Current</span>}
                </p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0', lineHeight: 1.45 }}>
                  {opt.blurb}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
          Reason (optional, audited)
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder='e.g. "Marking inactive for the off-season"'
          rows={2}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 12px',
            border: `1px solid ${G.border}`, borderRadius: 3,
            fontFamily: '"Lora",serif', fontSize: 13, color: G.text,
            backgroundColor: G.card, outline: 'none', resize: 'vertical',
          }}
        />
      </div>

      {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, margin: '0 0 10px' }}>{err}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <div onClick={target && !busy ? apply : undefined} data-tap
          style={{
            flex: 1, padding: 12,
            background: target && !busy ? G.green : G.border,
            borderRadius: 3, textAlign: 'center',
            cursor: target && !busy ? 'pointer' : 'not-allowed',
            opacity: busy ? 0.6 : 1,
          }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: target && !busy ? '#F2EDE0' : G.muted, fontWeight: 600 }}>
            {busy ? 'Applying…' : target ? `Apply: ${STATUS_COLOR[target]?.label || target}` : 'Pick a status'}
          </span>
        </div>
        <div onClick={onClose} data-tap style={{ padding: '12px 16px', border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, fontWeight: 500 }}>Cancel</span>
        </div>
      </div>
    </SubModalShell>
  );
}

// ── RoleChangeModal ─────────────────────────────────────────────
// Lists legal transitions for the person's current role × the
// acting user's scope (manager / non-manager). Each option lists
// the consequence in plain English. Reason field + explicit Confirm.
export function RoleChangeModal({ person, club, isManager, onClose, onApplied }) {
  const [target, setTarget] = useState(null);  // { kind: 'promote' | 'demote-staff' | 'demote-to-guest' | 'convert', role?, value? }
  const [reason, setReason] = useState('');
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState(null);

  // Build the legal-transition list for this person + acting user.
  const options = [];
  if (person.is_guest && !person.is_member) {
    options.push({
      key: 'convert',
      label: 'Convert to Member',
      blurb: "Create a member row for this person. The guest record stays in history. They'll have full member access.",
      tone: 'safe',
    });
  }
  if (person.is_member && !person.is_staff) {
    options.push({
      key: 'promote-admin',
      label: 'Promote to Admin',
      blurb: 'They gain operational admin access (permissioned per the can_* checkboxes under Manage Staff).',
      tone: 'caution',
    });
    if (isManager) {
      options.push({
        key: 'promote-manager',
        label: 'Promote to Manager',
        blurb: 'They gain full manager access, including the ability to promote and demote other staff.',
        tone: 'danger',
      });
    }
  }
  if (person.is_staff && person.staff_role === 'club_admin' && isManager) {
    options.push({
      key: 'promote-admin-to-manager',
      label: 'Promote Admin → Manager',
      blurb: 'They escalate from operational admin to full manager access.',
      tone: 'danger',
    });
  }
  if (person.is_staff && person.staff_role === 'club_manager' && isManager) {
    options.push({
      key: 'demote-manager-to-admin',
      label: 'Demote Manager → Admin',
      blurb: 'They drop from manager to operational admin. They lose the ability to manage other staff.',
      tone: 'caution',
    });
  }
  if (person.is_staff) {
    options.push({
      key: 'remove-staff',
      label: 'Remove staff role',
      blurb: 'They lose all admin access at this club. Their member record stays intact.',
      tone: 'danger',
    });
  }
  if (person.is_member && person.member_status !== 'inactive') {
    options.push({
      key: 'demote-member-to-guest',
      label: 'Demote Member → Guest',
      blurb: 'Their member row is marked inactive (history preserved). A guest row is created with read_only access.',
      tone: 'danger',
    });
  }

  const apply = async () => {
    if (!target) return;
    setBusy(true); setErr(null);
    const baseArgs = {
      p_auth_user_id: person.auth_user_id,
      p_club_id: club.id,
      p_reason: reason.trim() || null,
    };
    let rpc, args, postKind;
    switch (target) {
      case 'convert':
        rpc = 'convert_guest_to_member';
        args = { ...baseArgs, p_tier: 'standard', p_status: 'active' };
        postKind = 'member';
        break;
      case 'promote-admin':
        rpc = 'promote_member_to_staff';
        args = { ...baseArgs, p_role: 'club_admin' };
        break;
      case 'promote-manager':
        rpc = 'promote_member_to_staff';
        args = { ...baseArgs, p_role: 'club_manager' };
        break;
      case 'promote-admin-to-manager':
        rpc = 'promote_member_to_staff';
        args = { ...baseArgs, p_role: 'club_manager' };
        break;
      case 'demote-manager-to-admin':
        rpc = 'promote_member_to_staff';
        args = { ...baseArgs, p_role: 'club_admin' };
        break;
      case 'remove-staff':
        rpc = 'demote_staff_to_member';
        args = baseArgs;
        break;
      case 'demote-member-to-guest':
        rpc = 'demote_member_to_guest';
        args = { ...baseArgs, p_access_level: 'read_only' };
        postKind = 'guest';
        break;
      default:
        setBusy(false);
        return;
    }
    const { error } = await supabase.rpc(rpc, args);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onApplied?.({ key: target, postKind });
  };

  const toneStyles = (tone, isSelected) => {
    const accent = tone === 'danger' ? G.clsDot : tone === 'caution' ? G.brass : G.green;
    return {
      borderColor: isSelected ? accent : G.border,
      dot: accent,
    };
  };

  return (
    <SubModalShell
      title={`Change role — ${person.name || 'this person'}`}
      subtitle="Pick a transition. Each change is audited and reversible (with the appropriate counter-action)."
      onClose={onClose}
    >
      {options.length === 0 ? (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: 14 }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
            No role transitions available for this person under your current permissions. Ask a manager if you need to change their role.
          </p>
        </div>
      ) : (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
          {options.map((opt, i) => {
            const isSelected = opt.key === target;
            const t = toneStyles(opt.tone, isSelected);
            return (
              <div
                key={opt.key}
                onClick={() => setTarget(opt.key)}
                data-tap
                style={{
                  display: 'flex', alignItems: 'flex-start',
                  padding: '12px 14px',
                  borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
                  gap: 12,
                  background: isSelected ? G.bg : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: `2px solid ${isSelected ? t.dot : G.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 2,
                }}>
                  {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.dot }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: opt.tone === 'danger' ? G.clsDot : G.text, margin: 0, fontWeight: 600 }}>
                    {opt.label}
                  </p>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0', lineHeight: 1.45 }}>
                    {opt.blurb}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {options.length > 0 && (
        <>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
              Reason (optional, audited)
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder='e.g. "Promoting per board vote 2026-06"'
              rows={2}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 12px',
                border: `1px solid ${G.border}`, borderRadius: 3,
                fontFamily: '"Lora",serif', fontSize: 13, color: G.text,
                backgroundColor: G.card, outline: 'none', resize: 'vertical',
              }}
            />
          </div>

          {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, margin: '0 0 10px' }}>{err}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <div onClick={target && !busy ? apply : undefined} data-tap
              style={{
                flex: 1, padding: 12,
                background: target && !busy ? G.green : G.border,
                borderRadius: 3, textAlign: 'center',
                cursor: target && !busy ? 'pointer' : 'not-allowed',
                opacity: busy ? 0.6 : 1,
              }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: target && !busy ? '#F2EDE0' : G.muted, fontWeight: 600 }}>
                {busy ? 'Applying…' : target ? 'Confirm change' : 'Pick a transition'}
              </span>
            </div>
            <div onClick={onClose} data-tap style={{ padding: '12px 16px', border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, fontWeight: 500 }}>Cancel</span>
            </div>
          </div>
        </>
      )}
    </SubModalShell>
  );
}
