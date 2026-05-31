// useSupportUnread — count of support threads with messages newer than
// the calling super_admin's last read_at. Used by:
//   · SupportBellChip in the desktop admin top bar (the badge number)
//   · useInboxUnread (folded into the OS app-badge total for super_admins)
//
// Calls the support_unread_count() RPC from migration 66 — returns 0
// for any non-super_admin caller (RLS hides every support_threads row).
// Subscribed via Supabase realtime to support_messages + support_reads
// so the badge stays current without a page refresh.

import { useEffect, useState } from 'react';
import { supabase, isConfigured } from '../lib/supabase.js';
import { useAuth } from './useAuth.jsx';

export function useSupportUnread() {
  const { session, isSuperAdmin } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Non-super_admins don't have access to support_threads (RLS) and
    // also don't need to pay the polling / subscription cost.
    if (!isConfigured || !session?.user?.id || !isSuperAdmin) {
      setCount(0);
      return;
    }
    let cancelled = false;

    const recount = async () => {
      const { data, error } = await supabase.rpc('support_unread_count');
      if (cancelled) return;
      if (error) {
        setCount(0);
        return;
      }
      // RPC returns a bigint; supabase-js gives us a number (or
      // sometimes a string for very large values — guard either).
      setCount(typeof data === 'number' ? data : Number(data) || 0);
    };

    recount();

    const channel = supabase
      .channel(`support_unread:${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => recount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_reads', filter: `user_id=eq.${session.user.id}` }, () => recount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_threads' }, () => recount())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [session?.user?.id, isSuperAdmin]);

  return count;
}
