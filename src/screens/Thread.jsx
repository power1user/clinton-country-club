// Thread / chat view — handles order chats, clubhouse threads, and DMs
// off the same unified messaging schema. Sub-header is kind-specific
// (order summary + status pill for orders, topic for clubhouse, other
// participant's name for DMs).
import { useEffect, useRef, useState } from 'react';
import { G, gCfg } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabase.js';
import { markThreadRead } from '../hooks/useInbox.js';

const ORDER_STATUS_LABEL = {
  pending:          { label: 'New order',     state: 'limited' },
  preparing:        { label: 'Preparing',     state: 'limited' },
  out_for_delivery: { label: 'On the way',    state: 'open' },
  delivered:        { label: 'Delivered',     state: 'open' },
  cancelled:        { label: 'Cancelled',     state: 'closed' },
};

export default function Thread({ params }) {
  const threadId = params?.threadId;
  const { session, member } = useAuth();
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [context, setContext] = useState(null);    // e.g. food_orders row
  const [otherMember, setOtherMember] = useState(null); // for DMs
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);
  const scrollRef = useRef(null);

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
    if (!body || !threadId || !session?.user?.id) return;
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
      setErr(error.message);
      setDraft(body);                      // restore so user can retry
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // ── Header title (kind-specific)
  const headerTitle =
    !thread                  ? 'Thread' :
    thread.kind === 'order'  ? (thread.subject || 'Food order') :
    thread.kind === 'dm'     ? (otherMember?.members?.name || 'Direct message') :
                               (thread.subject || 'Clubhouse');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title={headerTitle} />

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
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, textAlign: 'center', padding: '40px 0' }}>No messages yet. Say something.</p>
        )}
        {messages.map(m => (
          <MessageBubble key={m.id} message={m} ownUserId={session?.user?.id} />
        ))}
      </div>

      {/* Compose */}
      {thread && (
        <div style={{ padding: '10px 12px 14px', borderTop: `1px solid ${G.border}`, background: G.bg, flexShrink: 0 }}>
          {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, margin: '0 0 6px' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a message…"
              rows={1}
              style={{
                flex: 1,
                padding: '10px 12px',
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
              }}
            />
            <div
              onClick={send}
              data-tap
              style={{
                width: 40, height: 40,
                borderRadius: '50%',
                background: draft.trim() && !sending ? G.green : G.border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
                flexShrink: 0,
              }}
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={draft.trim() && !sending ? '#F2EDE0' : G.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
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
