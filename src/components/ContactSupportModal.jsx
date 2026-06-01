// ContactSupportModal — v0.13.8 in-app "Contact Support" form.
//
// Triggered from the admin sidebar footer + topbar ? icon. Admin
// roles only (super_admin / club_manager / club_admin). Members
// keep using the v0.10.14 Help & Support member-side surface.
//
// Submits to the submit-support-ticket Edge Function which creates
// a thread + initial message with the user's identity, club, and
// browser context auto-captured.

import { useState } from 'react';
import { G } from '../theme.js';
import { useAuth } from '../hooks/useAuth.jsx';

export const SUPPORT_CATEGORIES = [
  { id: 'user_help',   l: 'User help',           desc: 'A member needs help with the app' },
  { id: 'admin_help',  l: 'Admin help',          desc: 'How do I do X in the admin?' },
  { id: 'bug',         l: 'Bug report',          desc: 'Something is broken' },
  { id: 'enhancement', l: 'Enhancement request', desc: 'Idea / feature request' },
  { id: 'other',       l: 'Other',               desc: 'Anything else' },
];

// Per-category chip colors used here AND in SupportThreadList. Exported
// so they stay in sync.
export const CATEGORY_COLORS = {
  user_help:   G.openBg,
  admin_help:  G.greenMid,
  bug:         G.clsBg,
  enhancement: G.brass,
  other:       G.muted,
};

export default function ContactSupportModal({ open, onClose }) {
  const { club, session } = useAuth();
  const [category, setCategory] = useState('user_help');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [sent, setSent] = useState(null); // { thread_id } on success

  if (!open) return null;

  const reset = () => {
    setCategory('user_help'); setSubject(''); setBody('');
    setErr(null); setSent(null); setBusy(false);
  };
  const closeAll = () => { reset(); onClose && onClose(); };

  const submit = async () => {
    setErr(null);
    if (!subject.trim() || !body.trim()) {
      setErr('Subject and message are both required.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-support-ticket`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            category,
            subject: subject.trim(),
            body_text: body.trim(),
            club_id: club?.id || null,
            url: typeof window !== 'undefined' ? window.location.href : null,
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          }),
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setSent({ thread_id: j.thread_id });
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={closeAll}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(26,24,15,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: G.bg, borderRadius: 8, maxWidth: 560, width: '100%',
          maxHeight: '90vh', overflowY: 'auto',
          padding: '22px 22px 18px',
          border: `1px solid ${G.border}`,
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 19, fontWeight: 700, color: G.text, margin: 0 }}>
            Contact Support
          </h3>
          <div onClick={closeAll} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
        </div>

        {sent ? (
          // Success state
          <div style={{ textAlign: 'center', padding: '14px 0 6px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(102,148,116,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={G.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: '0 0 6px' }}>
              Sent! We'll be in touch.
            </p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '0 0 16px', lineHeight: 1.55 }}>
              Your message is in the support queue. You'll get a reply by email at the address on file for your account.
            </p>
            <div onClick={closeAll} data-tap style={{ display: 'inline-block', padding: '10px 22px', background: G.green, borderRadius: 3, cursor: 'pointer' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 14, color: '#F2EDE0', fontWeight: 500 }}>Done</span>
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
              Send a message to the platform team. Your name, email, club, and the page you're on are captured automatically.
            </p>

            {/* Category picker */}
            <label style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
              Category
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {SUPPORT_CATEGORIES.map(c => (
                <div key={c.id} onClick={() => setCategory(c.id)} data-tap
                  style={{
                    padding: '8px 14px', borderRadius: 16,
                    background: category === c.id ? CATEGORY_COLORS[c.id] : G.card,
                    border: `1.5px solid ${category === c.id ? CATEGORY_COLORS[c.id] : G.border}`,
                    cursor: 'pointer',
                  }}>
                  <span style={{
                    fontFamily: '"Lora",serif', fontSize: 12,
                    color: category === c.id ? '#F2EDE0' : G.text,
                    fontWeight: category === c.id ? 700 : 500,
                  }}>
                    {c.l}
                  </span>
                </div>
              ))}
            </div>

            {/* Subject */}
            <label style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
              Subject
            </label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Short summary of what you need"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 14, color: G.text, background: G.card, outline: 'none', marginBottom: 12 }}
            />

            {/* Body */}
            <label style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>
              Message
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Describe what you're trying to do, what's happening, and any error you see."
              rows={6}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 14, color: G.text, background: G.card, outline: 'none', resize: 'vertical', lineHeight: 1.5, marginBottom: 6 }}
            />

            {err && (
              <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, margin: '6px 0 10px' }}>{err}</p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, fontStyle: 'italic' }}>
                Or email <strong style={{ color: G.text }}>support@groundslive.com</strong> directly.
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <div onClick={closeAll} data-tap style={{ padding: '9px 14px', cursor: 'pointer' }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted }}>Cancel</span>
                </div>
                <div onClick={busy || !subject.trim() || !body.trim() ? undefined : submit} data-tap
                  style={{
                    padding: '9px 22px',
                    background: (busy || !subject.trim() || !body.trim()) ? G.muted : G.green,
                    borderRadius: 3,
                    cursor: (busy || !subject.trim() || !body.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (busy || !subject.trim() || !body.trim()) ? 0.6 : 1,
                  }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>
                    {busy ? 'Sending…' : 'Send to support'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
