// AdminAIChatModal — v0.14.2 GroundsLive Admin AI chat surface.
//
// Multi-turn chat against the admin-ai-chat Edge Function. Triggered
// from the chat-bubble icon in the admin topbar (next to the ? icon
// which still routes to ContactSupportModal as a human-escape hatch).
//
// State:
// - conversation_id is generated client-side once per modal mount and
//   sent with every request so ai_usage_log groups the calls.
// - History persists for the lifetime of the modal; closing it
//   discards everything. (Persistent chat history per user is a
//   future patch.)
//
// Cost display:
// - super_admin sees a tiny cents-cost under each AI reply.
// - Managers + club_admins don't (cost is platform-billed; not
//   their concern).

import { useState, useRef, useEffect, useMemo } from 'react';
import { G } from '../theme.js';
import { useAuth } from '../hooks/useAuth.jsx';

// ── Suggested starter prompts — shown when the chat is empty ──────
const STARTERS = [
  'How do I add a recurring event?',
  'Where do I set facility hours?',
  'How do I reply to a food order?',
  'How do I add a custom facility like Pickleball?',
];

// ────────────────────────────────────────────────────────────────────
// Lightweight markdown renderer for the AI's typical output shape
// (headings, bold, italic, inline code, code blocks, lists,
// blockquote, links). NOT a full CommonMark parser — kept ~60 lines
// to avoid pulling in react-markdown for one surface.
//
// SAFETY: inline HTML is escaped first; we only emit our own tags.
// Links open in a new tab with rel="noreferrer noopener".
// ────────────────────────────────────────────────────────────────────
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderInline(s) {
  // Order matters — process code first (locks out other markup inside),
  // then bold, italic, links.
  let out = escapeHtml(s);
  // Inline code: `foo`
  out = out.replace(/`([^`\n]+)`/g, (_, code) =>
    `<code style="background:rgba(122,172,136,0.14);padding:1px 5px;border-radius:3px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:0.9em">${code}</code>`
  );
  // Bold: **foo**
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // Italic: *foo* (avoid eating ** already replaced)
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  // Links: [text](url) — http(s) only
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text, url) =>
    `<a href="${url}" target="_blank" rel="noreferrer noopener" style="color:${G.brass};text-decoration:underline">${text}</a>`
  );
  return out;
}

function MarkdownReply({ text }) {
  // Split by double newline into blocks. Within each block, detect
  // type and render.
  const blocks = useMemo(() => {
    const lines = text.split('\n');
    const out = [];
    let cursor = 0;
    while (cursor < lines.length) {
      const line = lines[cursor];

      // Fenced code block: ```
      if (line.startsWith('```')) {
        const codeLines = [];
        cursor++;
        while (cursor < lines.length && !lines[cursor].startsWith('```')) {
          codeLines.push(lines[cursor]);
          cursor++;
        }
        cursor++; // skip closing fence
        out.push({ type: 'code', text: codeLines.join('\n') });
        continue;
      }

      // Blockquote: > ...
      if (line.startsWith('> ')) {
        const quoteLines = [];
        while (cursor < lines.length && lines[cursor].startsWith('> ')) {
          quoteLines.push(lines[cursor].slice(2));
          cursor++;
        }
        out.push({ type: 'quote', text: quoteLines.join('\n') });
        continue;
      }

      // Heading: ### ## #
      const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        out.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2] });
        cursor++;
        continue;
      }

      // List: - foo  OR  1. foo
      if (/^(\s*)([-*]|\d+\.)\s+/.test(line)) {
        const items = [];
        const ordered = /^\s*\d+\./.test(line);
        while (cursor < lines.length && /^(\s*)([-*]|\d+\.)\s+/.test(lines[cursor])) {
          items.push(lines[cursor].replace(/^(\s*)([-*]|\d+\.)\s+/, ''));
          cursor++;
        }
        out.push({ type: 'list', ordered, items });
        continue;
      }

      // Blank line — skip
      if (line.trim() === '') {
        cursor++;
        continue;
      }

      // Paragraph — collect until blank line / other block
      const paraLines = [];
      while (
        cursor < lines.length
        && lines[cursor].trim() !== ''
        && !lines[cursor].startsWith('```')
        && !lines[cursor].startsWith('> ')
        && !/^(\s*)([-*]|\d+\.)\s+/.test(lines[cursor])
        && !/^#{1,4}\s+/.test(lines[cursor])
      ) {
        paraLines.push(lines[cursor]);
        cursor++;
      }
      out.push({ type: 'paragraph', text: paraLines.join(' ') });
    }
    return out;
  }, [text]);

  return (
    <div style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, lineHeight: 1.55 }}>
      {blocks.map((b, i) => {
        if (b.type === 'paragraph') {
          return (
            <p key={i} style={{ margin: '0 0 10px' }}
              dangerouslySetInnerHTML={{ __html: renderInline(b.text) }} />
          );
        }
        if (b.type === 'heading') {
          const fontSize = b.level <= 2 ? 16 : 14;
          return (
            <h4 key={i} style={{
              fontFamily: '"Playfair Display",serif',
              fontSize, fontWeight: 700, color: G.text,
              margin: '12px 0 6px',
            }} dangerouslySetInnerHTML={{ __html: renderInline(b.text) }} />
          );
        }
        if (b.type === 'list') {
          const Tag = b.ordered ? 'ol' : 'ul';
          return (
            <Tag key={i} style={{ margin: '0 0 10px', paddingLeft: 22 }}>
              {b.items.map((item, j) => (
                <li key={j} style={{ margin: '0 0 4px' }}
                  dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
              ))}
            </Tag>
          );
        }
        if (b.type === 'code') {
          return (
            <pre key={i} style={{
              background: 'rgba(26,24,15,0.06)',
              padding: '10px 12px',
              borderRadius: 4,
              overflowX: 'auto',
              fontSize: 12,
              margin: '0 0 10px',
              fontFamily: '"JetBrains Mono",ui-monospace,monospace',
              color: G.text,
            }}>{b.text}</pre>
          );
        }
        if (b.type === 'quote') {
          return (
            <blockquote key={i} style={{
              borderLeft: `3px solid ${G.brass}`,
              paddingLeft: 12,
              margin: '0 0 10px',
              fontStyle: 'italic',
              color: G.muted,
              fontSize: 12,
              lineHeight: 1.5,
            }} dangerouslySetInnerHTML={{ __html: renderInline(b.text) }} />
          );
        }
        return null;
      })}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────
export default function AdminAIChatModal({ open, onClose }) {
  const { club, session, isSuperAdmin } = useAuth();
  const [conversationId] = useState(() =>
    (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : null
  );
  const [messages, setMessages] = useState([]);  // [{role, content, cost_cents?, ts}]
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll on new message / busy state change
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy]);

  // Focus input on open + bind Esc to close
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;

  const send = async (override) => {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    const userMsg = { role: 'user', content: text, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            messages: next.map(m => ({ role: m.role, content: m.content })),
            conversation_id: conversationId,
            club_id: club?.id || null,
          }),
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        const msg = j.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setMessages(m => [...m, {
        role: 'assistant',
        content: j.reply || '(no response)',
        cost_cents: j.cost_cents,
        ts: Date.now(),
      }]);
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

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(26,24,15,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: G.bg, borderRadius: 8, maxWidth: 720, width: '100%',
          height: '85vh', maxHeight: 820,
          display: 'flex', flexDirection: 'column',
          border: `1px solid ${G.border}`,
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 12px', borderBottom: `1px solid ${G.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(122,172,136,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0, lineHeight: 1.2 }}>
                GroundsLive Admin AI
              </h3>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, fontStyle: 'italic' }}>
                Ask anything about managing The Grounds
              </p>
            </div>
          </div>
          <div onClick={onClose} data-tap style={{ padding: 6, cursor: 'pointer' }} title="Close (Esc)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
        </div>

        {/* Message list */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          {messages.length === 0 ? (
            // Empty state — starter chips
            <div>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, lineHeight: 1.55, margin: '0 0 14px' }}>
                Hi! I know every screen and workflow in The Grounds admin. Try:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {STARTERS.map(s => (
                  <div key={s} onClick={() => send(s)} data-tap style={{
                    padding: '10px 14px',
                    background: G.card,
                    border: `1px solid ${G.border}`,
                    borderRadius: 18,
                    cursor: 'pointer',
                    display: 'inline-block',
                    alignSelf: 'flex-start',
                    maxWidth: '100%',
                  }}>
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 14,
              }}>
                <div style={{
                  maxWidth: m.role === 'user' ? '78%' : '92%',
                  padding: m.role === 'user' ? '9px 14px' : '12px 14px',
                  background: m.role === 'user' ? G.green : G.card,
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  border: m.role === 'user' ? 'none' : `1px solid ${G.border}`,
                }}>
                  {m.role === 'user' ? (
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: '#F2EDE0', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {m.content}
                    </p>
                  ) : (
                    <>
                      <MarkdownReply text={m.content} />
                      {/* Cost shown to super_admin only — managers don't need it */}
                      {isSuperAdmin && typeof m.cost_cents === 'number' && (
                        <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '6px 0 0', fontStyle: 'italic' }}>
                          {m.cost_cents < 0.1
                            ? `< ¢0.1 · `
                            : `¢${m.cost_cents.toFixed(2)} · `}
                          haiku-4.5
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}

          {busy && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 }}>
              <div style={{ padding: '12px 14px', background: G.card, borderRadius: '14px 14px 14px 4px', border: `1px solid ${G.border}` }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, fontStyle: 'italic' }}>
                  Thinking…
                </span>
              </div>
            </div>
          )}

          {err && (
            <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(107,32,32,0.08)', border: `1px solid ${G.clsDot}`, borderRadius: 4 }}>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, margin: 0 }}>
                {err}
              </p>
            </div>
          )}
        </div>

        {/* Composer */}
        <div style={{ padding: '12px 18px 16px', borderTop: `1px solid ${G.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Ask about any admin screen or workflow…"
              rows={Math.min(4, Math.max(1, input.split('\n').length))}
              disabled={busy}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: `1px solid ${G.border}`,
                borderRadius: 6,
                fontFamily: '"Lora",serif',
                fontSize: 14,
                color: G.text,
                background: '#F8F4EC',
                outline: 'none',
                resize: 'none',
                lineHeight: 1.45,
                fontStyle: busy ? 'italic' : 'normal',
                opacity: busy ? 0.6 : 1,
              }}
            />
            <div
              onClick={busy || !input.trim() ? undefined : () => send()}
              data-tap
              style={{
                padding: '10px 14px',
                background: (busy || !input.trim()) ? G.muted : G.green,
                borderRadius: 6,
                cursor: (busy || !input.trim()) ? 'not-allowed' : 'pointer',
                opacity: (busy || !input.trim()) ? 0.6 : 1,
                flexShrink: 0,
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F2EDE0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </div>
          </div>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '8px 0 0', fontStyle: 'italic', textAlign: 'center' }}>
            AI may be wrong about details. For account-level changes use the <strong style={{ color: G.text, fontStyle: 'normal' }}>?</strong> icon to contact a human.
          </p>
        </div>
      </div>
    </div>
  );
}
