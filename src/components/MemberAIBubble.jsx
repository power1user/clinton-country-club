// MemberAIBubble — v0.14.5 floating member AI on the MyClub app.
//
// Renders bottom-right of every member screen. Gated by
// isFeatureOn(club, 'member_ai'). Members can dismiss it (persists
// in localStorage per-(user, club)) and recall via a tiny tab.
//
// Click → expands into a chat panel similar in shape to
// AdminAIChatModal but lighter/smaller. Calls member-ai-chat
// Edge Function with conversation_id grouping.

import { useState, useEffect, useRef, useMemo } from 'react';
import { G } from '../theme.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { isFeatureOn } from '../lib/features.js';

// Reuse the markdown renderer pattern from AdminAIChatModal but
// inline a smaller version (member replies are shorter).
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function renderInline(s) {
  let out = escapeHtml(s);
  out = out.replace(/`([^`\n]+)`/g, '<code style="background:rgba(122,172,136,0.14);padding:1px 5px;border-radius:3px;font-family:ui-monospace,monospace;font-size:0.9em">$1</code>');
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  return out;
}

function ReplyBody({ text }) {
  const blocks = useMemo(() => {
    const lines = text.split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith('> ')) {
        const qs = [];
        while (i < lines.length && lines[i].startsWith('> ')) { qs.push(lines[i].slice(2)); i++; }
        out.push({ type: 'quote', text: qs.join('\n') });
        continue;
      }
      if (/^(\s*)([-*]|\d+\.)\s+/.test(line)) {
        const items = [];
        const ordered = /^\s*\d+\./.test(line);
        while (i < lines.length && /^(\s*)([-*]|\d+\.)\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^(\s*)([-*]|\d+\.)\s+/, ''));
          i++;
        }
        out.push({ type: 'list', ordered, items });
        continue;
      }
      if (line.trim() === '') { i++; continue; }
      const para = [];
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('> ') && !/^(\s*)([-*]|\d+\.)\s+/.test(lines[i])) {
        para.push(lines[i]); i++;
      }
      out.push({ type: 'p', text: para.join(' ') });
    }
    return out;
  }, [text]);

  return (
    <div style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, lineHeight: 1.5 }}>
      {blocks.map((b, j) => {
        if (b.type === 'p') return <p key={j} style={{ margin: '0 0 8px' }} dangerouslySetInnerHTML={{ __html: renderInline(b.text) }} />;
        if (b.type === 'list') {
          const Tag = b.ordered ? 'ol' : 'ul';
          return <Tag key={j} style={{ margin: '0 0 8px', paddingLeft: 20 }}>{b.items.map((it, k) => <li key={k} style={{ margin: '0 0 3px' }} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />)}</Tag>;
        }
        if (b.type === 'quote') return <blockquote key={j} style={{ borderLeft: `2px solid ${G.brass}`, paddingLeft: 10, margin: '0 0 8px', fontStyle: 'italic', color: G.muted, fontSize: 11 }} dangerouslySetInnerHTML={{ __html: renderInline(b.text) }} />;
        return null;
      })}
    </div>
  );
}

export default function MemberAIBubble() {
  const { club, session, user } = useAuth();
  const enabled = club && isFeatureOn(club, 'member_ai');
  const dismissKey = `member-ai-dismissed:${club?.id || 'nx'}:${user?.id || 'nx'}`;

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(dismissKey) === '1';
  });
  const [open, setOpen]   = useState(false);
  const [conversationId] = useState(() =>
    (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : null
  );
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy, open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!enabled) return null;

  const dismiss = () => {
    localStorage.setItem(dismissKey, '1');
    setDismissed(true);
    setOpen(false);
  };
  const recall = () => {
    localStorage.removeItem(dismissKey);
    setDismissed(false);
    setOpen(true);
  };

  const send = async (override) => {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    const userMsg = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/member-ai-chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            messages: next.map(m => ({ role: m.role, content: m.content })),
            conversation_id: conversationId,
            club_id: club?.id,
          }),
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setMessages(m => [...m, { role: 'assistant', content: j.reply || '' }]);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const onInputKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // ── Dismissed state — tiny "recall" tab on the bottom-right edge ─
  if (dismissed) {
    return (
      <div onClick={recall} data-tap
        style={{
          position: 'fixed', bottom: 14, right: 0,
          background: G.brass,
          padding: '6px 8px 6px 10px',
          borderRadius: '14px 0 0 14px',
          cursor: 'pointer',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          opacity: 0.85,
        }}
        title="Show GroundsLive AI">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A180F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </div>
    );
  }

  // ── Closed bubble — bottom-right floating button ──────────────────
  if (!open) {
    return (
      <div style={{ position: 'fixed', bottom: 84, right: 16, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        {/* Tiny dismiss above the bubble */}
        <div onClick={dismiss} data-tap
          style={{
            background: 'rgba(26,24,15,0.65)',
            padding: '2px 8px',
            borderRadius: 10,
            cursor: 'pointer',
            fontFamily: '"Lora",serif',
            fontSize: 10,
            color: '#F2E5C0',
            opacity: 0.85,
          }}
          title="Hide AI">
          Hide
        </div>
        <div onClick={() => setOpen(true)} data-tap
          style={{
            background: G.green,
            width: 52, height: 52,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(0,0,0,0.28)',
          }}
          title="Ask GroundsLive AI">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F2EDE0" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
      </div>
    );
  }

  // ── Open chat panel ───────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', bottom: 84, right: 16,
      width: 'min(360px, calc(100vw - 32px))',
      height: 'min(560px, calc(100vh - 120px))',
      background: G.bg, borderRadius: 12,
      border: `1px solid ${G.border}`,
      boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
      display: 'flex', flexDirection: 'column',
      zIndex: 100,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${G.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(122,172,136,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0 }}>GroundsLive AI</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div onClick={dismiss} data-tap style={{ padding: 4, cursor: 'pointer' }} title="Hide for this session">
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, textDecoration: 'underline' }}>Hide</span>
          </div>
          <div onClick={() => setOpen(false)} data-tap style={{ padding: 4, cursor: 'pointer' }} title="Close (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {messages.length === 0 ? (
          <div>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, lineHeight: 1.5, margin: '0 0 10px' }}>
              Hi! I can help you find your way around {club?.name || 'the app'}. Ask me anything.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {['How do I order food?', 'How do I RSVP to an event?', "What time does the pool close?"].map(s => (
                <div key={s} onClick={() => send(s)} data-tap style={{ padding: '7px 11px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, cursor: 'pointer', alignSelf: 'flex-start', maxWidth: '100%' }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              <div style={{
                maxWidth: m.role === 'user' ? '82%' : '94%',
                padding: '8px 11px',
                background: m.role === 'user' ? G.green : G.card,
                borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                border: m.role === 'user' ? 'none' : `1px solid ${G.border}`,
              }}>
                {m.role === 'user' ? (
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', margin: 0, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{m.content}</p>
                ) : (
                  <ReplyBody text={m.content} />
                )}
              </div>
            </div>
          ))
        )}

        {busy && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
            <div style={{ padding: '8px 11px', background: G.card, borderRadius: '12px 12px 12px 4px', border: `1px solid ${G.border}` }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, fontStyle: 'italic' }}>Thinking…</span>
            </div>
          </div>
        )}

        {err && (
          <div style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(107,32,32,0.08)', border: `1px solid ${G.clsDot}`, borderRadius: 4 }}>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, margin: 0 }}>{err}</p>
          </div>
        )}
      </div>

      {/* Composer */}
      <div style={{ padding: '10px 14px 12px', borderTop: `1px solid ${G.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Ask anything about the app…"
            rows={Math.min(3, Math.max(1, input.split('\n').length))}
            disabled={busy}
            style={{
              flex: 1, padding: '8px 11px', border: `1px solid ${G.border}`,
              borderRadius: 6, fontFamily: '"Lora",serif', fontSize: 13,
              color: G.text, background: '#F8F4EC', outline: 'none',
              resize: 'none', lineHeight: 1.4,
              opacity: busy ? 0.6 : 1,
            }}
          />
          <div onClick={busy || !input.trim() ? undefined : () => send()} data-tap
            style={{
              padding: '9px 11px', background: (busy || !input.trim()) ? G.muted : G.green,
              borderRadius: 6,
              cursor: (busy || !input.trim()) ? 'not-allowed' : 'pointer',
              opacity: (busy || !input.trim()) ? 0.6 : 1,
              flexShrink: 0,
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F2EDE0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
