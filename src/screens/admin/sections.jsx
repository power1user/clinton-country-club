// New Phase 1 admin sub-sections. Most use the generic CrudSection scaffold;
// the queue-style sections (food orders, event registrations, lesson
// requests) have custom UIs because they're read-mostly with state changes.
import { useEffect, useState } from 'react';
import { G } from '../../theme.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { supabase } from '../../lib/supabase.js';
import { useClubStatus } from '../../hooks/useClubData.jsx';
import CrudSection from './CrudSection.jsx';

// ============================================================
// Simple CRUDs (use CrudSection)
// ============================================================

export function MenuCategoriesAdmin() {
  const { hasPerm } = useAuth();
  return (
    <CrudSection
      canEdit={hasPerm('can_manage_menu')}
      table="menu_categories"
      title="Menu Category"
      emptyMsg="No menu categories yet. Add Lunch, Dinner, Bar, etc."
      columns={['id', 'name', 'sort_order', 'is_active', 'created_at']}
      order={{ column: 'sort_order', ascending: true }}
      primaryField="name"
      secondaryFn={r => `Sort ${r.sort_order ?? 0} · ${r.is_active === false ? 'Inactive' : 'Active'}`}
      defaultRow={{ name: '', sort_order: 0, is_active: true }}
      fields={[
        { key: 'name', label: 'Category Name', type: 'text', placeholder: 'Lunch, Dinner, Bar…' },
        { key: 'sort_order', label: 'Sort Order', type: 'number', placeholder: '0' },
        { key: 'is_active', label: 'Active (visible in menus)', type: 'checkbox' },
      ]}
    />
  );
}

export function ProShopItemsAdmin() {
  const { hasPerm } = useAuth();
  return (
    <CrudSection
      canEdit={hasPerm('can_manage_proshop')}
      table="pro_shop_items"
      title="Pro Shop Item"
      emptyMsg="No items yet."
      columns={['id', 'name', 'description', 'category', 'price', 'image_url', 'in_stock', 'sort_order']}
      order={{ column: 'sort_order', ascending: true }}
      primaryField="name"
      secondaryFn={r => [r.category, r.price != null ? `$${Number(r.price).toFixed(2)}` : null, r.in_stock === false ? 'Out of stock' : null].filter(Boolean).join(' · ')}
      defaultRow={{ name: '', description: '', category: '', price: null, image_url: '', in_stock: true, sort_order: 0 }}
      fields={[
        { key: 'name', label: 'Item Name', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'category', label: 'Category', type: 'text', placeholder: 'Apparel, Equipment, etc.' },
        { key: 'price', label: 'Price (USD)', type: 'number', placeholder: '129.00' },
        { key: 'image_url', label: 'Image URL', type: 'url', placeholder: 'https://…' },
        { key: 'in_stock', label: 'In stock', type: 'checkbox' },
        { key: 'sort_order', label: 'Sort Order', type: 'number' },
      ]}
    />
  );
}

export function HoleSponsorsAdmin() {
  const { hasPerm } = useAuth();
  return (
    <CrudSection
      canEdit={hasPerm('can_manage_sponsors')}
      table="hole_sponsors"
      title="Hole Sponsor"
      emptyMsg="No hole sponsors yet."
      columns={['id', 'hole_number', 'sponsor_name', 'logo_url', 'link_url', 'active', 'sort_order']}
      order={{ column: 'hole_number', ascending: true }}
      primaryField="sponsor_name"
      secondaryFn={r => `Hole ${r.hole_number} · ${r.active === false ? 'Inactive' : 'Active'}`}
      defaultRow={{ hole_number: 1, sponsor_name: '', logo_url: '', link_url: '', active: true, sort_order: 0 }}
      fields={[
        { key: 'sponsor_name', label: 'Sponsor Name', type: 'text' },
        { key: 'hole_number', label: 'Hole #', type: 'number', placeholder: '1' },
        { key: 'logo_url', label: 'Logo URL', type: 'url' },
        { key: 'link_url', label: 'Link URL', type: 'url' },
        { key: 'active', label: 'Active', type: 'checkbox' },
        { key: 'sort_order', label: 'Sort Order', type: 'number' },
      ]}
    />
  );
}

export function SponsorBannersAdmin() {
  const { hasPerm } = useAuth();
  return (
    <CrudSection
      canEdit={hasPerm('can_manage_sponsors')}
      table="sponsor_banners"
      title="Sponsor Banner"
      emptyMsg="No banner placements yet."
      columns={['id', 'sponsor_name', 'image_url', 'link_url', 'location', 'active_from', 'active_to', 'active', 'sort_order']}
      order={{ column: 'sort_order', ascending: true }}
      primaryField="sponsor_name"
      secondaryFn={r => `${r.location} · ${r.active === false ? 'Inactive' : 'Active'}`}
      defaultRow={{ sponsor_name: '', image_url: '', link_url: '', location: 'home', active_from: null, active_to: null, active: true, sort_order: 0 }}
      fields={[
        { key: 'sponsor_name', label: 'Sponsor Name', type: 'text' },
        { key: 'image_url', label: 'Banner Image URL', type: 'url' },
        { key: 'link_url', label: 'Click-through URL', type: 'url' },
        { key: 'location', label: 'Location', type: 'select', options: ['home', 'news', 'menu', 'events', 'bulletin'] },
        { key: 'active_from', label: 'Active From', type: 'datetime-local' },
        { key: 'active_to', label: 'Active To', type: 'datetime-local' },
        { key: 'active', label: 'Active', type: 'checkbox' },
        { key: 'sort_order', label: 'Sort Order', type: 'number' },
      ]}
    />
  );
}

// ============================================================
// schedule_overrides — needs facility picker
// ============================================================
export function ScheduleOverridesAdmin() {
  const { hasPerm } = useAuth();
  const { data: facilities } = useClubStatus();
  const facilityOptions = facilities.map(f => ({ value: f.statusId, label: f.label }));
  return (
    <CrudSection
      canEdit={hasPerm('can_edit_course_status')}
      table="schedule_overrides"
      title="Schedule Override"
      emptyMsg="No date overrides set."
      columns={['id', 'status_id', 'override_date', 'is_closed', 'opens_at', 'closes_at', 'closes_at_dusk', 'members_only', 'reason']}
      order={{ column: 'override_date', ascending: true }}
      primaryField="override_date"
      secondaryFn={r => {
        const f = facilities.find(x => x.statusId === r.status_id);
        return `${f?.label || '(facility)'} · ${r.is_closed ? 'Closed' : `${r.opens_at || ''}–${r.closes_at_dusk ? 'Dusk' : (r.closes_at || '')}`}${r.reason ? ' · ' + r.reason : ''}`;
      }}
      defaultRow={{ status_id: facilityOptions[0]?.value || '', override_date: new Date().toISOString().slice(0, 10), is_closed: false, opens_at: null, closes_at: null, closes_at_dusk: false, members_only: false, reason: '' }}
      fields={[
        { key: 'status_id', label: 'Facility', type: 'select', options: facilityOptions.length ? facilityOptions : [{ value: '', label: '(no facilities)' }] },
        { key: 'override_date', label: 'Date', type: 'date' },
        { key: 'is_closed', label: 'Closed all day', type: 'checkbox' },
        { key: 'opens_at', label: 'Opens At (if open)', type: 'time' },
        { key: 'closes_at', label: 'Closes At (if open)', type: 'time' },
        { key: 'closes_at_dusk', label: 'Closes at dusk', type: 'checkbox' },
        { key: 'members_only', label: 'Members only', type: 'checkbox' },
        { key: 'reason', label: 'Reason (shown to members)', type: 'text', placeholder: 'Tournament, holiday, etc.' },
      ]}
    />
  );
}

// ============================================================
// notification_messages — admin composer + history
// ============================================================
export function NotificationsAdmin() {
  const { club, session, hasPerm } = useAuth();
  const canEdit = hasPerm('can_send_notifications');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('notification_messages')
        .select('id, title, body, urgency, published_at, created_at')
        .eq('club_id', club.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [club?.id, version]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0, flex: 1 }}>
          {rows.length} message{rows.length === 1 ? '' : 's'}{!canEdit && ' · view only'}
        </p>
        {canEdit && (
          <div onClick={() => setComposing(true)} data-tap style={{ padding: '8px 14px', background: G.green, borderRadius: 3, cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>+ Compose</span>
          </div>
        )}
      </div>

      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
      {!loading && rows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No notifications sent yet.</p>
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <div key={r.id} style={{ padding: '12px 14px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}` }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: urgencyColor(r.urgency), padding: '2px 6px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{r.urgency}</span>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: 0 }}>
                  {r.published_at ? `Sent ${new Date(r.published_at).toLocaleString()}` : 'Draft'}
                </p>
              </div>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 2px' }}>{r.title}</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: 0, lineHeight: 1.4 }}>{r.body}</p>
            </div>
          ))}
        </div>
      )}

      {composing && (
        <ComposeNotificationModal
          club={club}
          authorId={session?.user?.id}
          onClose={() => setComposing(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function urgencyColor(u) {
  if (u === 'urgent') return G.clsBg;
  if (u === 'high') return G.limBg;
  if (u === 'low') return G.muted;
  return G.brass;
}

function ComposeNotificationModal({ club, authorId, onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [publishNow, setPublishNow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const save = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.from('notification_messages').insert({
      club_id: club.id,
      title: title.trim(),
      body: body.trim(),
      urgency,
      created_by: authorId,
      published_at: publishNow ? new Date().toISOString() : null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
    onClose();
  };

  const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>Compose Notification</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Course update, event reminder…" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="The message members will see…" style={{ ...inputStyle, height: 110, resize: 'none', lineHeight: 1.5 }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Urgency</label>
          <select value={urgency} onChange={e => setUrgency(e.target.value)} style={inputStyle}>
            {['low', 'normal', 'high', 'urgent'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <label style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 }}>
          <input type="checkbox" checked={publishNow} onChange={e => setPublishNow(e.target.checked)} />
          Publish now (uncheck to save as draft)
        </label>
        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}
        <div onClick={save} data-tap style={{ padding: 12, background: title && body && !busy ? G.green : G.border, borderRadius: 3, textAlign: 'center', cursor: title && body && !busy ? 'pointer' : 'not-allowed' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: title && body && !busy ? '#F2EDE0' : G.muted, fontWeight: 500 }}>{busy ? 'Sending…' : (publishNow ? 'Publish' : 'Save Draft')}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// food_orders — queue with status transitions
// ============================================================
export function FoodOrdersAdmin() {
  const { club, hasPerm } = useAuth();
  const canEdit = hasPerm('can_edit_orders');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('food_orders')
        .select('id, status, items, subtotal, hole, location_note, created_at, member_id, members(name, membership_number)')
        .eq('club_id', club.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`food_orders_admin:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_orders', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id]);

  const setStatus = async (id, status) => {
    await supabase.from('food_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  };

  const STATUS_OPTIONS = ['pending', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
  const STATUS_COLORS = { pending: G.brass, preparing: G.limBg, out_for_delivery: G.openBg, delivered: G.muted, cancelled: G.clsBg };

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
        Most recent 100 orders. Status updates push to members in realtime.
      </p>
      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
      {!loading && rows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No orders yet.</p>
        </div>
      )}
      {rows.map(r => (
        <div key={r.id} style={{ padding: '12px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0 }}>
              {r.members?.name || 'Unknown'} {r.members?.membership_number && <span style={{ color: G.muted, fontWeight: 400, fontSize: 12 }}>#{r.members.membership_number}</span>}
            </p>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: STATUS_COLORS[r.status] || G.muted, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{r.status?.replace(/_/g, ' ')}</span>
          </div>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 6px' }}>
            {new Date(r.created_at).toLocaleString()} · {r.hole != null ? `Hole ${r.hole}` : (r.location_note || 'No location')}
          </p>
          {Array.isArray(r.items) && r.items.length > 0 && (
            <ul style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: '6px 0', paddingLeft: 18 }}>
              {r.items.map((it, i) => (
                <li key={i}>{it.qty || 1}× {it.name || it.item_name || JSON.stringify(it)} {it.price ? `— $${it.price}` : ''}</li>
              ))}
            </ul>
          )}
          {r.subtotal != null && (
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text, margin: '4px 0 8px' }}>Total: ${Number(r.subtotal).toFixed(2)}</p>
          )}
          <select
            value={r.status}
            onChange={e => setStatus(r.id, e.target.value)}
            disabled={!canEdit}
            style={{ padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 12, background: '#F8F4EC', opacity: canEdit ? 1 : 0.6 }}
          >
            {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// event_registrations — list grouped by event
// ============================================================
export function EventRegistrationsAdmin() {
  const { club, hasPerm } = useAuth();
  const canEdit = hasPerm('can_manage_events');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('event_registrations')
        .select('id, status, guests_count, notes, registered_at, member_id, event_id, members(name, membership_number), events(title, event_date)')
        .eq('club_id', club.id)
        .order('registered_at', { ascending: false });
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel(`event_registrations_admin:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_registrations', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id]);

  const setStatus = async (id, status) => {
    await supabase.from('event_registrations').update({ status }).eq('id', id);
  };

  // Group by event
  const grouped = rows.reduce((acc, r) => {
    const key = r.event_id;
    if (!acc[key]) acc[key] = { event: r.events, registrations: [] };
    acc[key].registrations.push(r);
    return acc;
  }, {});

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
        {rows.length} registration{rows.length === 1 ? '' : 's'} across {Object.keys(grouped).length} event{Object.keys(grouped).length === 1 ? '' : 's'}.
      </p>
      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
      {!loading && rows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No registrations yet.</p>
        </div>
      )}
      {Object.entries(grouped).map(([eventId, g]) => (
        <div key={eventId} style={{ marginBottom: 14 }}>
          <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 6px' }}>{g.event?.title || 'Event'}</h4>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 6px' }}>{g.event?.event_date ? new Date(g.event.event_date).toLocaleDateString() : ''} · {g.registrations.length} registered</p>
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
            {g.registrations.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0 }}>{r.members?.name || 'Unknown'} {r.members?.membership_number && <span style={{ color: G.muted, fontWeight: 400 }}>#{r.members.membership_number}</span>}</p>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>+{r.guests_count || 0} guests {r.notes && `· ${r.notes}`}</p>
                </div>
                <select
                  value={r.status}
                  onChange={e => setStatus(r.id, e.target.value)}
                  disabled={!canEdit}
                  style={{ padding: '4px 6px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 11, background: '#F8F4EC', opacity: canEdit ? 1 : 0.6 }}
                >
                  {['registered', 'waitlist', 'cancelled'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// SuperAdminsAdmin — manage platform-wide super_admins
// (Platform area card → super_admin only)
// ============================================================
export function SuperAdminsAdmin() {
  const { session, club } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [memberPool, setMemberPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: sa }, { data: members }] = await Promise.all([
        supabase
          .from('user_roles')
          .select('id, user_id, display_name, created_at')
          .eq('role', 'super_admin')
          .order('created_at', { ascending: true }),
        supabase
          .from('members')
          .select('id, user_id, name, email, membership_number')
          .eq('club_id', club.id)
          .not('user_id', 'is', null),
      ]);
      if (cancelled) return;
      setAdmins(sa || []);
      const saIds = new Set((sa || []).map(r => r.user_id));
      setMemberPool((members || []).filter(m => !saIds.has(m.user_id)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [club?.id, version]);

  const promote = async (m) => {
    const { error } = await supabase.from('user_roles').insert({
      user_id: m.user_id,
      club_id: null,
      role: 'super_admin',
      display_name: m.name,
      created_by: session?.user?.id,
      permissions: {},
    });
    if (error) { alert(error.message); return; }
    setAdding(false);
    refresh();
  };

  const demote = async (row) => {
    const isSelf = row.user_id === session?.user?.id;
    const msg = isSelf
      ? "You're removing your own super_admin status. You'll immediately lose platform access. Continue?"
      : `Remove ${row.display_name || 'this user'}'s super_admin status?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from('user_roles').delete().eq('id', row.id);
    if (error) { alert(error.message); return; }
    refresh();
  };

  if (loading) return <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '40px 0', textAlign: 'center' }}>Loading super admins…</p>;

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
        Super admins have full platform access. They can promote/demote other super admins, manage every club, and bypass all permission checks. {admins.length === 1 ? 'You are the only super admin — promote at least one other before demoting yourself.' : ''}
      </p>

      <div style={{ background: G.card, borderRadius: 4, border: `1px solid ${G.border}`, overflow: 'hidden', marginBottom: 12 }}>
        {admins.map((a, i) => {
          const isSelf = a.user_id === session?.user?.id;
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: 0, fontWeight: 500 }}>
                  {a.display_name || '(unnamed)'}{isSelf && ' · You'}
                </p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>Added {new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: G.brass, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Super</span>
              <div onClick={() => demote(a)} data-tap style={{ padding: '4px 8px', cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, textDecoration: 'underline', textUnderlineOffset: 2 }}>Remove</span>
              </div>
            </div>
          );
        })}
      </div>

      <div onClick={() => setAdding(!adding)} data-tap style={{ padding: 12, background: adding ? G.card : G.green, border: `1px solid ${adding ? G.border : G.green}`, borderRadius: 3, textAlign: 'center', cursor: 'pointer' }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: adding ? G.text : '#F2EDE0', fontWeight: 500 }}>{adding ? 'Cancel' : '+ Promote a member to Super Admin'}</span>
      </div>

      {adding && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 8px' }}>
            Pick a Clinton CC member with an account to promote. They'll gain platform-wide super_admin access immediately.
          </p>
          {memberPool.length === 0 && (
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, padding: 12, textAlign: 'center', background: G.card, borderRadius: 4 }}>No eligible members. They need a signed-in account first.</p>
          )}
          {memberPool.map(m => (
            <div key={m.id} onClick={() => promote(m)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 6, cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: 0, fontWeight: 500 }}>{m.name}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>#{m.membership_number} · {m.email || 'no email'}</p>
              </div>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brass, textDecoration: 'underline', textUnderlineOffset: 2 }}>Promote →</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Placeholders — wired up in Phase 3 (multi-tenant)
// ============================================================
function ComingSoonSection({ title, desc, phase = 'Phase 3' }) {
  return (
    <div style={{ padding: '40px 24px', textAlign: 'center', background: G.card, border: `1px solid ${G.border}`, borderRadius: 6 }}>
      <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text, margin: '0 0 6px' }}>{title}</h3>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 12px', lineHeight: 1.5 }}>{desc}</p>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.brass, background: 'rgba(155,122,30,0.12)', padding: '4px 10px', borderRadius: 12, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Coming in {phase}</span>
    </div>
  );
}
export function AllClubsAdmin()         { return <ComingSoonSection title="All Clubs" desc="Browse every club on the platform, jump in as any club's super-admin, onboard a new club." />; }
export function PlatformSettingsAdmin() { return <ComingSoonSection title="Platform Settings" desc="The Grounds branding, billing, support contact, default templates for new clubs." />; }
export function PlatformMetricsAdmin()  { return <ComingSoonSection title="Cross-Club Metrics" desc="Aggregate stats — active members, content updates, revenue, support tickets — across every club." />; }

// ============================================================
// lesson_requests (pro_shop_inquiries) — queue
// ============================================================
export function LessonRequestsAdmin() {
  const { club, hasPerm } = useAuth();
  const canEdit = hasPerm('can_manage_lessons');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('pro_shop_inquiries')
        .select('id, kind, pro, preferred_date, preferred_time, skill_level, focus_areas, notes, status, created_at, member_id, members(name, membership_number, email)')
        .eq('club_id', club.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel(`pro_shop_inquiries_admin:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pro_shop_inquiries', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id]);

  const setStatus = async (id, status) => {
    await supabase.from('pro_shop_inquiries').update({ status }).eq('id', id);
  };

  const STATUS_COLORS = { pending: G.brass, contacted: G.limBg, scheduled: G.openBg, done: G.muted, cancelled: G.clsBg };

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
        Lesson requests and pro-shop inquiries. Update status as you contact members.
      </p>
      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
      {!loading && rows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No requests yet.</p>
        </div>
      )}
      {rows.map(r => (
        <div key={r.id} style={{ padding: '12px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0 }}>{r.members?.name || 'Unknown'}</p>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: STATUS_COLORS[r.status] || G.muted, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{r.status}</span>
          </div>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 4px' }}>
            {r.members?.email || '—'} · {r.kind || 'lesson'} {r.pro && `· Pro: ${r.pro}`}
          </p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: '0 0 4px' }}>
            {[r.preferred_date && new Date(r.preferred_date).toLocaleDateString(), r.preferred_time, r.skill_level && `Skill: ${r.skill_level}`].filter(Boolean).join(' · ')}
          </p>
          {r.notes && <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '4px 0 8px' }}>{r.notes}</p>}
          <select
            value={r.status}
            onChange={e => setStatus(r.id, e.target.value)}
            disabled={!canEdit}
            style={{ padding: '4px 8px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 12, background: '#F8F4EC', opacity: canEdit ? 1 : 0.6 }}
          >
            {['pending', 'contacted', 'scheduled', 'done', 'cancelled'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}
