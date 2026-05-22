// Thread / chat view — full implementation lands in Phase 4 chunk 4.
// This stub keeps inbox navigation working in the meantime: tap a
// thread in Inbox -> see basic context + last few messages.
import { useEffect, useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabase.js';
import { markThreadRead } from '../hooks/useInbox.js';

export default function Thread({ params }) {
  const threadId = params?.threadId;
  const { session } = useAuth();
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    const load = async () => {
      const { data: t } = await supabase
        .from('threads')
        .select('id, kind, subject, context_table, context_id, last_message_at, club_id')
        .eq('id', threadId)
        .single();
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, body, sender_user_id, is_system, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (cancelled) return;
      setThread(t || null);
      setMessages(msgs || []);
      setLoading(false);
      if (session?.user?.id) markThreadRead(threadId, session.user.id);
    };
    load();
    const channel = supabase
      .channel(`thread:${threadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [threadId, session?.user?.id]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title={thread?.subject || 'Thread'} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
        {loading && (
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, textAlign: 'center', padding: '40px 0' }}>Loading…</p>
        )}
        {!loading && messages.length === 0 && (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, textAlign: 'center', padding: '40px 0' }}>No messages yet.</p>
        )}
        {messages.map(m => {
          const own = m.sender_user_id === session?.user?.id;
          if (m.is_system) {
            return (
              <div key={m.id} style={{ textAlign: 'center', margin: '10px 0' }}>
                <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, background: G.card, padding: '4px 10px', borderRadius: 10 }}>{m.body}</span>
              </div>
            );
          }
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: own ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
              <div style={{ maxWidth: '78%', padding: '8px 12px', borderRadius: 12, background: own ? G.green : G.card, border: own ? 'none' : `1px solid ${G.border}` }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: own ? '#F2EDE0' : G.text, margin: 0, lineHeight: 1.45 }}>{m.body}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: own ? '#A8D8B8' : G.muted, margin: '4px 0 0', opacity: 0.7 }}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '12px 16px', borderTop: `1px solid ${G.border}`, background: G.bg, flexShrink: 0 }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, textAlign: 'center', margin: 0 }}>
          Compose lands in the next push.
        </p>
      </div>
    </div>
  );
}
