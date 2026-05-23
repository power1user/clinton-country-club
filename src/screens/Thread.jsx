// Thread / chat view — handles order chats, clubhouse threads, and DMs
// off the same unified messaging schema. Sub-header is kind-specific
// (order summary + status pill for orders, topic for clubhouse, other
// participant's name for DMs).
import { useEffect, useRef, useState } from 'react';
import { G, gCfg } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNav } from '../hooks/useNav.jsx';
import { supabase } from '../lib/supabase.js';
import { markThreadRead, hideThread } from '../hooks/useInbox.js';
import PendingGuard from '../components/PendingGuard.jsx';

const ORDER_STATUS_LABEL = {
  pending:          { label: 'New order',     state: 'limited' },
  preparing:        { label: 'Preparing',     state: 'limited' },
  out_for_delivery: { label: 'On the way',    state: 'open' },
  delivered:        { label: 'Delivered',     state: 'open' },
  cancelled:        { label: 'Cancelled',     state: 'closed' },
};

export default function Thread({ params }) {
  const threadId = params?.threadId;
  const { session, member, canMemberWrite } = useAuth();
  const { pop } = useNav();
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [context, setContext] = useState(null);    // e.g. food_orders row
  const [otherMember, setOtherMember] = useState(null); // for DMs
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);   // header kebab menu
  const [confirmHide, setConfirmHide] = useState(false);
  const scrollRef = useRef(null);
  const menuRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Load thread + messages + context. Subscribed in realtime so new
  // messages stream in and mark-read fires whenever a fresh msg arrives.
  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;

    const load = async () => {
      const { data: t } = await supabase
        .from('threads')
        .select('id, kind, subject, context_table, context_id, last_message_at, club_id, created_by')
        .eq('id', threadId)
        .single();
      if (!t || cancelled) { setLoading(false); return; }

      const { data: msgs } = await supabase
        .from('messages')
        .select('id, body, sender_user_id, is_system, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .limit(200);

      // Kind-specific context loads
      let ctx = null;
      let other = null;
      if (t.kind === 'order' && t.context_table === 'food_orders' && t.context_id) {
        const { data: ord } = await supabase
          .from('food_orders')
          .select('id, status, items, subtotal, hole, location_note, created_at, member_id, members(name)')
          .eq('id', t.context_id)
          .maybeSingle();
        ctx = ord;
      } else if (t.kind === 'dm') {
        const { data: parts } = await supabase
          .from('thread_participants')
          .select('user_id, member_id, members(name, membership_number)')
          .eq('thread_id', threadId);
        const otherPart = (parts || []).find(p => p.user_id !== session?.user?.id);
        if (otherPart) other = otherPart;
      }

      if (cancelled) return;
      setThread(t);
      setMessages(msgs || []);
      setContext(ctx);
      setOtherMember(other);
      setLoading(false);

      // Mark this thread read whenever we re-render with new content
      if (session?.user?.id) markThreadRead(threadId, session.user.id);
    };

    load();

    const channel = supabase
      .channel(`thread_view:${threadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` }, () => load())
      // also react to order status updates so the status pill stays current
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'food_orders' }, (payload) => {
        if (payload?.new?.id === context?.id || payload?.new?.id === thread?.context_id) load();
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [threadId, session?.user?.id]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !threadId || !session?.user?.id || sending) return;
    setSending(true); setErr(null);
    setDraft('');                          // optimistic clear
    const { error } = await supabase.from('messages').insert({
      thread_id: threadId,
      sender_user_id: session.user.id,
      body,
      is_system: false,
    });
    setSending(false);
    if (error) {
      // Friendly error — Supabase errors can be cryptic ("new row violates
      // row-level security policy") so surface a generic line and keep the
      // raw message tucked behind it for debugging.
      setErr(
        error.message?.includes('row-level security')
          ? "You don't have permission to reply here."
          : (error.message || "Couldn't send. Tap to retry.")
      );
      setDraft(body);                      // restore so user can retry
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Close the kebab menu on outside tap / Esc
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleHide = async () => {
    if (!threadId || !session?.user?.id) return;
    await hideThread(threadId, session.user.id);
    setConfirmHide(false);
    setMenuOpen(false);
    pop();                                   // back to inbox
  };

  // ── Header title (kind-specific)
  const headerTitle =
    !thread                  ? 'Thread' :
    thread.kind === 'order'  ? (thread.subject || 'Food order') :
    thread.kind === 'dm'     ? (otherMember?.members?.name || 'Direct message') :
                               (thread.subject || 'Clubhouse');

  // ── Empty-state copy depends on the conversation kind so it doesn't
  // feel canned. Order threads usually already have a system message,
  // so this only really fires for DMs and fresh clubhouse threads.
  const emptyStateCopy =
    !thread                  ? '' :
    thread.kind === 'dm'     ? `Say hi to ${otherMember?.members?.name || 'them'}.`
                             : 'No messages yet. Send the first one.';

  // ── Header right-action: kebab menu w/ Hide. Only show when we have
  // a real loaded thread — no point letting users hide a 404.
  const headerRight = thread ? (
    <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
      <div
        onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
        data-tap
        aria-label="Conversation options"
        style={{
          width: 36, height: 36, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          background: menuOpen ? 'rgba(255,255,255,0.10)' : 'transparent',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#A8D8B8">
          <circle cx="12" cy="5"  r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </div>
      {menuOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 200,
            background: '#F8F4EC',
            borderRadius: 6,
            boxShadow: '0 14px 36px rgba(0,0,0,0.32), 0 3px 8px rgba(0,0,0,0.16)',
            border: `1px solid ${G.border}`,
            padding: '4px 0',
            zIndex: 100,
          }}
        >
          <div
            onClick={() => { setMenuOpen(false); setConfirmHide(true); }}
            data-tap
            role="menuitem"
            style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={G.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            </svg>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text }}>Hide conversation</span>
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title={headerTitle} right={headerRight} />

      {/* Context strip */}
      {!loading && thread && (
        <ContextStrip thread={thread} context={context} otherMember={otherMember} />
      )}

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 8px', background: G.bg }}>
        {loading && (
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, textAlign: 'center', padding: '40px 0' }}>Loading…</p>
        )}
        {!loading && !thread && (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, textAlign: 'center', padding: '40px 0' }}>Thread not found.</p>
        )}
        {!loading && thread && messages.length === 0 && (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, textAlign: 'center', padding: '40px 0' }}>{emptyStateCopy}</p>
        )}
        {messages.map(m => (
          <MessageBubble key={m.id} message={m} ownUserId={session?.user?.id} />
        ))}
      </div>

      {/* Compose */}
      {thread && !canMemberWrite && (
        <div style={{ padding: '10px 12px max(14px, calc(env(safe-area-inset-bottom) + 8px))', borderTop: `1px solid ${G.border}`, background: G.bg, flexShrink: 0 }}>
          <PendingGuard action="reply to messages" inline />
        </div>
      )}
      {thread && canMemberWrite && (
        <div style={{ padding: '8px 10px max(12px, calc(env(safe-area-inset-bottom) + 6px))', borderTop: `1px solid ${G.border}`, background: G.bg, flexShrink: 0 }}>
          {err && (
            <div
              onClick={() => setErr(null)}
              data-tap
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', marginBottom: 6,
                background: 'rgba(224,84,84,0.10)',
                border: `1px solid ${G.clsDot}`,
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.clsDot} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, flex: 1, lineHeight: 1.4 }}>{err}</span>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, flexShrink: 0 }}>Tap to dismiss</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={sending ? 'Sending…' : 'Type a message…'}
              rows={1}
              disabled={sending}
              style={{
                flex: 1,
                padding: '9px 12px',
                border: `1px solid ${G.border}`,
                borderRadius: 18,
                fontFamily: '"Lora",serif',
                fontSize: 14,
                color: G.text,
                background: '#F8F4EC',
                outline: 'none',
                resize: 'none',
                maxHeight: 110,
                lineHeight: 1.4,
                boxSizing: 'border-box',
                opacity: sending ? 0.6 : 1,
              }}
            />
            <div
              onClick={send}
              data-tap
              style={{
                width: 38, height: 38,
                borderRadius: '50%',
                background: draft.trim() && !sending ? G.green : G.border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
              aria-label="Send"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={draft.trim() && !sending ? '#F2EDE0' : G.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Confirm-hide modal */}
      {confirmHide && (
        <div
          onClick={() => setConfirmHide(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: G.bg,
              borderRadius: 8,
              maxWidth: 340, width: '100%',
              padding: '18px 18px 14px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.32)',
              border: `1px solid ${G.border}`,
            }}
          >
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: '0 0 6px' }}>Hide this conversation?</p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: '0 0 14px', lineHeight: 1.55 }}>
              It will disappear from your inbox. If someone sends a new message it'll come back.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <div
                onClick={() => setConfirmHide(false)}
                data-tap
                style={{ padding: '8px 14px', cursor: 'pointer' }}
              >
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>Cancel</span>
              </div>
              <div
                onClick={handleHide}
                data-tap
                style={{ padding: '8px 14px', background: G.green, borderRadius: 3, cursor: 'pointer' }}
              >
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>Hide</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Context strip ──────────────────────────────────────────────────────────
function ContextStrip({ thread, context, otherMember }) {
  if (thread.kind === 'order' && context) {
    const meta = ORDER_STATUS_LABEL[context.status] || { label: context.status, state: 'open' };
    const cfg = gCfg(meta.state);
    const items = Array.isArray(context.items) ? context.items : [];
    const summary = items.map(i => `${i.qty || 1}× ${i.name || i.item_name || 'item'}`).join(', ');
    return (
      <div style={{ background: G.card, padding: '10px 18px', borderBottom: `1px solid ${G.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 10, background: cfg.bg }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
            <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: cfg.txt, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>{meta.label}</span>
          </span>
          {context.hole != null && (
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted }}>Hole {context.hole}</span>
          )}
          {context.subtotal != null && (
            <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 12, fontWeight: 700, color: G.text, marginLeft: 'auto' }}>${Number(context.subtotal).toFixed(2)}</span>
          )}
        </div>
        {summary && (
          <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</p>
        )}
      </div>
    );
  }

  if (thread.kind === 'clubhouse') {
    return (
      <div style={{ background: G.card, padding: '8px 18px', borderBottom: `1px solid ${G.border}`, flexShrink: 0 }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, fontStyle: 'italic' }}>
          Conversation with the clubhouse{thread.subject ? ` · ${thread.subject}` : ''}
        </p>
      </div>
    );
  }

  if (thread.kind === 'dm' && otherMember?.members) {
    return (
      <div style={{ background: G.card, padding: '8px 18px', borderBottom: `1px solid ${G.border}`, flexShrink: 0 }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, fontStyle: 'italic' }}>
          Direct message with {otherMember.members.name}{otherMember.members.membership_number ? ` · #${otherMember.members.membership_number}` : ''}
        </p>
      </div>
    );
  }

  return null;
}

// ── Message bubble ─────────────────────────────────────────────────────────
function MessageBubble({ message, ownUserId }) {
  if (message.is_system) {
    return (
      <div style={{ textAlign: 'center', margin: '10px 0' }}>
        <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, background: G.card, padding: '4px 10px', borderRadius: 10 }}>
          {message.body}
        </span>
      </div>
    );
  }
  const own = message.sender_user_id === ownUserId;
  return (
    <div style={{ display: 'flex', justifyContent: own ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div style={{
        maxWidth: '78%',
        padding: '8px 12px',
        borderRadius: 14,
        background: own ? G.green : G.card,
        border: own ? 'none' : `1px solid ${G.border}`,
        borderBottomRightRadius: own ? 4 : 14,
        borderBottomLeftRadius:  own ? 14 : 4,
      }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: own ? '#F2EDE0' : G.text, margin: 0, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.body}</p>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: own ? '#A8D8B8' : G.muted, margin: '4px 0 0', opacity: 0.75, textAlign: 'right' }}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
