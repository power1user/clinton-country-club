// New Phase 1 admin sub-sections. Most use the generic CrudSection scaffold;
// the queue-style sections (food orders, event registrations, lesson
// requests) have custom UIs because they're read-mostly with state changes.
import { useEffect, useRef, useState } from 'react';
import { G } from '../../theme.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useNav } from '../../hooks/useNav.jsx';
import { useFlag } from '../../hooks/useFlag.js';
import { supabase } from '../../lib/supabase.js';
import { useClubStatus } from '../../hooks/useClubData.jsx';
import { COMMON_TIMEZONES } from '../../lib/timezone.js';
import { listFeatures, listFeaturesByCategory, featureState, withFlagChange, withFlagLock, TIER_LABEL, TIER_DESCRIPTION, TIER_RANK } from '../../lib/features.js';
import CrudSection from './CrudSection.jsx';
import Toggle from '../../components/Toggle.jsx';
import { QRCodeCanvas } from 'qrcode.react';

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
        { key: 'name', label: 'Category Name', type: 'text', placeholder: 'Lunch, Dinner, Bar…', required: true },
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
        { key: 'name', label: 'Item Name', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'category', label: 'Category', type: 'text', placeholder: 'Apparel, Equipment, etc.' },
        { key: 'price', label: 'Price', type: 'money', placeholder: '129.00' },
        { key: 'image_url', label: 'Image URL', type: 'url', placeholder: 'https://…' },
        { key: 'in_stock', label: 'In stock', type: 'checkbox' },
        { key: 'sort_order', label: 'Sort Order', type: 'number' },
      ]}
    />
  );
}

// Lesson pros — per-club roster surfaced on LessonRequest.jsx.
// Active flag soft-deletes a pro who's left without breaking history
// (pro_shop_inquiries.pro is a free-text snapshot of the name).
export function LessonProsAdmin() {
  const { hasPerm } = useAuth();
  return (
    <CrudSection
      canEdit={hasPerm('can_manage_proshop')}
      table="lesson_pros"
      title="Lesson Pro"
      emptyMsg="No pros yet — add the first one so members can book lessons."
      columns={['id', 'name', 'title', 'photo_url', 'bio', 'rate', 'sort_order', 'active']}
      order={{ column: 'sort_order', ascending: true }}
      primaryField="name"
      secondaryFn={r => [r.title, r.rate, r.active === false ? 'Inactive' : null].filter(Boolean).join(' · ')}
      defaultRow={{ name: '', title: '', photo_url: '', bio: '', rate: '', sort_order: 0, active: true }}
      fields={[
        { key: 'name',       label: 'Name',           type: 'text',     placeholder: 'James Thornton, PGA', required: true },
        { key: 'title',      label: 'Title',          type: 'text',     placeholder: 'Head Professional' },
        { key: 'rate',       label: 'Rate (display)', type: 'text',     placeholder: '$125 / 45 min' },
        { key: 'photo_url',  label: 'Photo URL',      type: 'url',      placeholder: 'https://…' },
        { key: 'bio',        label: 'Bio',            type: 'textarea', placeholder: 'Short bio shown to members…' },
        { key: 'sort_order', label: 'Sort Order',     type: 'number' },
        { key: 'active',     label: 'Active (members can book)', type: 'checkbox' },
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
        { key: 'sponsor_name', label: 'Sponsor Name', type: 'text', required: true },
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
        { key: 'sponsor_name', label: 'Sponsor Name', type: 'text', required: true },
        { key: 'image_url', label: 'Banner Image URL', type: 'url' },
        { key: 'link_url', label: 'Click-through URL', type: 'url' },
        { key: 'location', label: 'Location', type: 'select', options: ['home', 'news', 'menu', 'events', 'bulletin'], required: true },
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
  // Empty-string sentinel maps to a real NULL status_id on save. Works
  // on the edit path too because CrudFormModal renders `value ?? ''`,
  // so a DB-null status_id automatically picks the All Facilities option.
  const facilityOptions = [
    { value: '', label: '— All Facilities —' },
    ...facilities.map(f => ({ value: f.statusId, label: f.label })),
  ];
  return (
    <CrudSection
      canEdit={hasPerm('can_edit_course_status')}
      table="schedule_overrides"
      title="Schedule Override"
      emptyMsg="No date overrides set."
      columns={['id', 'status_id', 'override_date', 'is_closed', 'opens_at', 'opens_at_dawn', 'closes_at', 'closes_at_dusk', 'members_only', 'reason']}
      order={{ column: 'override_date', ascending: true }}
      primaryField="override_date"
      secondaryFn={r => {
        const facLabel = r.status_id == null
          ? 'All Facilities'
          : (facilities.find(x => x.statusId === r.status_id)?.label || '(facility)');
        const openLabel  = r.opens_at_dawn ? 'Dawn' : (r.opens_at  || '');
        const closeLabel = r.closes_at_dusk ? 'Dusk' : (r.closes_at || '');
        return `${facLabel} · ${r.is_closed ? 'Closed' : `${openLabel}–${closeLabel}`}${r.reason ? ' · ' + r.reason : ''}`;
      }}
      defaultRow={{
        status_id: '',
        override_date: new Date().toISOString().slice(0, 10),
        is_closed: true,  // most common reason to add an override is to close
        opens_at: null, opens_at_dawn: false,
        closes_at: null, closes_at_dusk: false,
        members_only: false, reason: '',
      }}
      beforeSave={(form) => {
        // Translate the UI empty-string sentinel back to NULL for the
        // DB. Unique indexes (per migration 23) enforce one all-
        // facilities row per date and one per facility per date.
        if (form.status_id === '' || form.status_id == null) {
          form.status_id = null;
        }
        return form;
      }}
      fields={[
        { key: 'status_id', label: 'Facility', type: 'select', options: facilityOptions },
        { key: 'override_date', label: 'Date', type: 'date' },
        { key: 'is_closed', label: 'Closed all day', type: 'checkbox' },
        { key: 'opens_at', label: 'Opens At (if open)', type: 'time' },
        { key: 'opens_at_dawn', label: 'Opens at dawn', type: 'checkbox' },
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
// v0.9.5: defaults to "active" filter (pending + preparing +
// out_for_delivery) so the morning kitchen lead isn't wading
// through yesterday's delivered orders. Tap "Show completed"
// to see everything.
// ============================================================
export function FoodOrdersAdmin() {
  const { club, hasPerm } = useAuth();
  const canEdit = hasPerm('can_edit_orders');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

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
  const ACTIVE_STATUSES = new Set(['pending', 'preparing', 'out_for_delivery']);
  const visibleRows = showCompleted ? rows : rows.filter(r => ACTIVE_STATUSES.has(r.status));
  const hiddenCount = rows.length - visibleRows.length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0, flex: 1 }}>
          {showCompleted ? 'All orders (most recent 100)' : 'Active orders (pending, preparing, on the way)'} · live updates
        </p>
        {hiddenCount > 0 && !showCompleted && (
          <div onClick={() => setShowCompleted(true)} data-tap style={{ padding: '5px 10px', background: G.bg, border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.brass }}>Show completed ({hiddenCount})</span>
          </div>
        )}
        {showCompleted && (
          <div onClick={() => setShowCompleted(false)} data-tap style={{ padding: '5px 10px', background: G.bg, border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.brass }}>Active only</span>
          </div>
        )}
      </div>
      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
      {!loading && visibleRows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
            {showCompleted ? 'No orders yet.' : 'All caught up — no active orders.'}
          </p>
        </div>
      )}
      {visibleRows.map(r => (
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
export function EventRegistrationsAdmin({ mode = 'grouped' } = {}) {
  // v0.9.6: `mode='flat'` renders a reverse-chronological feed
  // (registrations + waitlist changes as they come in) — used by
  // the Communications inbox_rsvps sub-queue. `mode='grouped'`
  // (default, back-compat) groups by event for the legacy
  // Events area entry.
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

  // ── Flat timeline (Comms inbox mode) ─────────────────────────────
  if (mode === 'flat') {
    const STATUS_COLORS = { registered: G.openBg, waitlist: G.limBg, cancelled: G.clsBg };
    return (
      <div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
          Recent registrations and waitlist changes, newest first. Live updates.
        </p>
        {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
        {!loading && rows.length === 0 && (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No registrations yet.</p>
          </div>
        )}
        {!loading && rows.length > 0 && (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
            {rows.map((r, i) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.members?.name || 'Unknown'} <span style={{ color: G.muted, fontWeight: 400 }}>· {r.events?.title || 'Event'}</span>
                  </p>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>
                    {new Date(r.registered_at).toLocaleString()}
                    {r.guests_count ? ` · +${r.guests_count} guests` : ''}
                  </p>
                </div>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: STATUS_COLORS[r.status] || G.muted, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, flexShrink: 0 }}>{r.status}</span>
                <select
                  value={r.status}
                  onChange={e => setStatus(r.id, e.target.value)}
                  disabled={!canEdit}
                  style={{ padding: '3px 6px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 11, background: '#F8F4EC', opacity: canEdit ? 1 : 0.6 }}
                >
                  {['registered', 'waitlist', 'cancelled'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Grouped by event (legacy default) ────────────────────────────
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
// ClubSettingsAdmin — manager-only editor for branding + contact info
// (Lives under People area; everything writes to the clubs row, which
// pushes back via the realtime subscription in useAuth so the visual
// updates live for everyone.)
// ============================================================
export function ClubSettingsAdmin() {
  const { club } = useAuth();
  return (
    <ClubSettingsForm
      club={club}
      mode="manager"
      headerNote="Edit your club's branding + contact info. Changes go live for every member as soon as you Save. Address and other location facts are managed by the platform — contact your platform admin to change them."
    />
  );
}

// ============================================================
// FeaturesAdmin — manager-facing master toggle panel (Phase 7,
// v0.7.0). The Features top-level admin area opens this. Reads
// `club` from auth context; renders FeaturesPanel in manager mode.
// ============================================================
export function FeaturesAdmin() {
  const { club } = useAuth();
  return (
    <FeaturesPanel
      club={club}
      mode="manager"
      headerNote="Each feature below controls a member-facing surface. Toggling off hides it from every member immediately — no rebuild, no re-deploy. Some flags require a higher subscription tier; those show locked. The Grounds can pin specific features on or off for your club; those show 'Set by The Grounds' and your toggle is disabled."
    />
  );
}

// FeaturesPanel — shared body for both manager mode (member-facing
// toggles) and platform mode (same toggles plus per-flag lock controls
// for super_admin). One toggle flip = one supabase update; no separate
// Save button so the panel always reflects the live state.
//
// mode='manager':
//   · Reads/writes club.feature_flags via withFlagChange
//   · feature_flags_locked entries render as 'Set by The Grounds' +
//     disabled toggle (manager can't undo a platform lock)
//   · Tier-locked flags render as a lock icon + upgrade hint
//
// mode='platform':
//   · Same toggles, but each row also shows a Lock/Unlock affordance
//   · 'Lock' pins the current effective value into feature_flags_locked
//     so the manager can't change it. 'Unlock' removes the entry.
//   · The toggle, when locked, writes to feature_flags_locked (so the
//     SA can flip the locked value). When unlocked, writes to
//     feature_flags as usual.
export function FeaturesPanel({ club, mode = 'manager', headerNote }) {
  const [busyKey, setBusyKey] = useState(null);
  const [err, setErr] = useState(null);

  if (!club) {
    return <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '40px 0', textAlign: 'center' }}>Loading club…</p>;
  }

  // Persist a flag-flip optimistically — we don't manage local state
  // because the realtime subscription in useAuth (or in AllClubsAdmin's
  // own subscription) pushes the updated row back here. Keeps the UI a
  // straight mirror of clubs.feature_flags / feature_flags_locked.
  const writeFlag = async (flagKey, value, target) => {
    setBusyKey(flagKey); setErr(null);
    const payload = {};
    if (target === 'lock') {
      payload.feature_flags_locked = withFlagLock(club.feature_flags_locked, flagKey, value);
    } else {
      payload.feature_flags = withFlagChange(club.feature_flags, flagKey, value);
      // Legacy column mirror — keep enable_member_dms in sync with
      // the dms flag until that column is fully retired.
      if (flagKey === 'dms') payload.enable_member_dms = !!value;
    }
    const { error } = await supabase.from('clubs').update(payload).eq('id', club.id);
    setBusyKey(null);
    if (error) setErr(error.message);
  };

  // Toggle the lock state on a flag — preserves the current effective
  // value as the pinned value when locking, removes the key when unlocking.
  const toggleLock = async (flagKey, currentValue, currentlyLocked) => {
    await writeFlag(flagKey, currentlyLocked ? null : currentValue, 'lock');
  };

  const groups = listFeaturesByCategory();
  const tierLabel = TIER_LABEL[club.subscription_tier] || 'Basic';

  return (
    <div>
      {headerNote && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
          {headerNote}
        </p>
      )}

      <div style={{ padding: '10px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 14 }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: 0, lineHeight: 1.5 }}>
          Subscription tier: <strong>{tierLabel}</strong>. {TIER_DESCRIPTION[club.subscription_tier] || ''}
        </p>
      </div>

      {err && (
        <div style={{ padding: '10px 14px', marginBottom: 12, background: 'rgba(167,67,55,0.10)', border: `1px solid ${G.clsDot}`, borderRadius: 4 }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, margin: 0 }}>{err}</p>
        </div>
      )}

      {groups.map(({ category, items }) => (
        <div key={category} style={{ marginBottom: 16 }}>
          <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 6px' }}>{category}</h4>
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
            {items.map((flag, i) => (
              <FeatureRow
                key={flag.key}
                flag={flag}
                club={club}
                mode={mode}
                busy={busyKey === flag.key}
                isFirst={i === 0}
                onToggle={(v) => {
                  const st = featureState(club, flag.key);
                  // If locked from platform, the toggle writes the new
                  // locked value (super_admin still controls). In manager
                  // mode the row is disabled so onToggle never fires.
                  writeFlag(flag.key, v, st.reason === 'platform-locked' ? 'lock' : 'override');
                }}
                onLockToggle={() => {
                  const st = featureState(club, flag.key);
                  toggleLock(flag.key, st.value, st.reason === 'platform-locked');
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureRow({ flag, club, mode, busy, isFirst, onToggle, onLockToggle }) {
  const st = featureState(club, flag.key);
  const isPlatform = mode === 'platform';
  const tierLocked     = st.reason === 'tier-locked';
  const platformLocked = st.reason === 'platform-locked';

  // Manager mode: platform lock disables the toggle. Platform mode:
  // the SA can flip the locked value, so the toggle stays interactive.
  const toggleDisabled = busy || tierLocked || (platformLocked && !isPlatform);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderTop: isFirst ? 'none' : `1px solid ${G.border}`, opacity: tierLocked ? 0.55 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0 }}>{flag.label}</p>
          {flag.placeholder && (
            <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.brass, background: 'rgba(155,122,30,0.12)', padding: '1px 7px', borderRadius: 10, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 700 }}>Coming soon</span>
          )}
          {platformLocked && (
            <span title="Pinned by The Grounds" style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: G.brass, padding: '1px 7px', borderRadius: 10, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 700 }}>
              {isPlatform ? `Locked ${st.value ? 'On' : 'Off'}` : 'Set by The Grounds'}
            </span>
          )}
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0', lineHeight: 1.5 }}>
          {flag.description}
        </p>
        {tierLocked && (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10, color: G.brass, margin: '4px 0 0' }}>
            Requires {TIER_LABEL[flag.min_tier]} tier — contact The Grounds to upgrade.
          </p>
        )}
        {/* Platform-mode lock affordance — small inline link below
            the description. Keeps the row visually quiet for managers,
            who never see this. */}
        {isPlatform && !tierLocked && (
          <div style={{ marginTop: 6 }}>
            <span
              onClick={busy ? undefined : onLockToggle}
              data-tap
              style={{ fontFamily: '"Lora",serif', fontSize: 10, color: platformLocked ? G.clsDot : G.brass, cursor: busy ? 'wait' : 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              {platformLocked ? '✕ Unlock — let the club manager decide' : '🔒 Lock for this club'}
            </span>
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        {tierLocked ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.8">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 018 0v4" />
          </svg>
        ) : (
          <Toggle
            checked={st.value}
            onChange={toggleDisabled ? () => {} : onToggle}
            ariaLabel={flag.label}
            disabled={toggleDisabled}
          />
        )}
      </div>
    </div>
  );
}

// Reusable branding/contact editor. Drives the clubs row directly.
//   mode='manager'  — club_manager editing their own club. Hides
//                     immutable-ish facts (address, lat/lng, founded,
//                     par, yardage, holes, timezone) so day-to-day
//                     managers don't accidentally touch them.
//   mode='platform' — super_admin editing any club from
//                     Platform → All Clubs. Shows everything.
export function ClubSettingsForm({ club, mode = 'manager', headerNote }) {
  const isPlatform = mode === 'platform';
  const { isSuperAdmin } = useAuth();
  const [form, setForm] = useState({
    tagline: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
    founded: '',
    par: '',
    yardage: '',
    holes: 18,
    lat: '',
    lng: '',
    timezone: 'America/Chicago',
    primary_color: '#1B3A2D',
    secondary_color: '#234D38',
    accent_color: '#9B7A1E',
    logo_url: '',
    hero_image_url: '',
    subscription_tier: 'basic',
    feature_flags: {},
    pending_member_access: 'read_only',
  });
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [err, setErr] = useState(null);
  const [uploading, setUploading] = useState(null); // 'logo' | 'hero' | null
  const dirty = useRef(false);
  const lastClubId = useRef(null);

  // Sync form from club row — unless user has unsaved edits.
  // Force-reset when the club id changes (super_admin switching clubs).
  useEffect(() => {
    if (!club) return;
    const isNewClub = lastClubId.current !== club.id;
    if (!isNewClub && dirty.current) return;
    lastClubId.current = club.id;
    dirty.current = false;
    setForm({
      tagline:           club.tagline           || '',
      contact_email:     club.contact_email     || '',
      contact_phone:     club.contact_phone     || '',
      address:           club.address           || '',
      city:              club.city              || '',
      state:             club.state             || '',
      founded:           club.founded           ?? '',
      par:               club.par               ?? '',
      yardage:           club.yardage           ?? '',
      holes:             club.holes             ?? 18,
      lat:               club.lat               ?? '',
      lng:               club.lng               ?? '',
      timezone:          club.timezone          || 'America/Chicago',
      primary_color:     club.primary_color     || '#1B3A2D',
      secondary_color:   club.secondary_color   || '#234D38',
      accent_color:      club.accent_color      || '#9B7A1E',
      logo_url:          club.logo_url          || '',
      hero_image_url:    club.hero_image_url    || '',
      subscription_tier: club.subscription_tier || 'basic',
      feature_flags:     club.feature_flags     || {},
      pending_member_access: club.pending_member_access || 'read_only',
    });
  }, [club?.id, club?.tagline, club?.contact_email, club?.contact_phone, club?.address,
      club?.city, club?.state, club?.founded, club?.par, club?.yardage, club?.holes,
      club?.lat, club?.lng, club?.timezone,
      club?.primary_color, club?.secondary_color, club?.accent_color,
      club?.logo_url, club?.hero_image_url, club?.subscription_tier,
      club?.feature_flags, club?.pending_member_access]);

  const set = (k, v) => { dirty.current = true; setForm(p => ({ ...p, [k]: v })); };

  const uploadImage = async (file, kind) => {
    if (!file || !club) return;
    setUploading(kind); setErr(null);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `${club.id}/${kind}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('club-assets')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('club-assets').getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      set(kind === 'logo' ? 'logo_url' : 'hero_image_url', url);
    } catch (e) {
      setErr(e.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (!club) return;
    setBusy(true); setErr(null);
    // Manager-editable fields always go through. Platform-only fields
    // only get included when mode === 'platform' so a manager's save
    // never overwrites an address or coordinates.
    //
    // Phase 7 (v0.7.0): feature_flags + enable_member_dms are NOT in
    // this payload anymore — the Features admin area writes them
    // directly per toggle. If we included them here we'd race against
    // any feature flip the user made while this form was open and
    // overwrite the toggle change.
    const payload = {
      tagline:           form.tagline.trim()       || null,
      contact_email:     form.contact_email.trim() || null,
      contact_phone:     form.contact_phone.trim() || null,
      primary_color:     form.primary_color,
      secondary_color:   form.secondary_color,
      accent_color:      form.accent_color,
      logo_url:          form.logo_url.trim()       || null,
      hero_image_url:    form.hero_image_url.trim() || null,
      pending_member_access: form.pending_member_access || 'read_only',
    };
    // subscription_tier is only writable by super_admin (DB trigger
    // enforces the same — defense in depth).
    if (isSuperAdmin) {
      payload.subscription_tier = form.subscription_tier || 'basic';
    }
    if (isPlatform) {
      Object.assign(payload, {
        address:  form.address.trim() || null,
        city:     form.city.trim()    || null,
        state:    form.state.trim()   || null,
        founded:  form.founded === '' ? null : Number(form.founded),
        par:      form.par     === '' ? null : Number(form.par),
        yardage:  form.yardage === '' ? null : Number(form.yardage),
        holes:    form.holes   === '' ? 18   : Number(form.holes),
        lat:      form.lat     === '' ? null : Number(form.lat),
        lng:      form.lng     === '' ? null : Number(form.lng),
        timezone: form.timezone || 'America/Chicago',
      });
    }
    const { error } = await supabase.from('clubs').update(payload).eq('id', club.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    dirty.current = false;
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
  };

  const labelStyle = { fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 };
  const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' };

  if (!club) {
    return <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '40px 0', textAlign: 'center' }}>Loading club…</p>;
  }

  return (
    <div>
      {headerNote && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 14px' }}>
          {headerNote}
        </p>
      )}

      <SectionHeading>Brand Identity</SectionHeading>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Tagline (shown on sign-in screen)</label>
        <input value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Country club golf since 1921" style={inputStyle} />
      </div>

      {/* Logo */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Club Logo</label>
        {form.logo_url && (
          <div style={{ background: G.green, padding: 12, borderRadius: 4, marginBottom: 8, textAlign: 'center' }}>
            <img src={form.logo_url} alt="Logo" style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain' }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <label style={{ flex: 1, padding: '8px 12px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 12, color: G.text, cursor: 'pointer', textAlign: 'center' }}>
            {uploading === 'logo' ? 'Uploading…' : 'Upload File'}
            <input type="file" accept="image/*" onChange={e => uploadImage(e.target.files?.[0], 'logo')} style={{ display: 'none' }} />
          </label>
        </div>
        <input value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="…or paste an image URL" style={inputStyle} />
      </div>

      {/* Hero image */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Hero Photo (top of Home screen — future Phase 3.5)</label>
        {form.hero_image_url && (
          <div style={{ marginBottom: 8 }}>
            <img src={form.hero_image_url} alt="Hero" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 4 }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <label style={{ flex: 1, padding: '8px 12px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 12, color: G.text, cursor: 'pointer', textAlign: 'center' }}>
            {uploading === 'hero' ? 'Uploading…' : 'Upload File'}
            <input type="file" accept="image/*" onChange={e => uploadImage(e.target.files?.[0], 'hero')} style={{ display: 'none' }} />
          </label>
        </div>
        <input value={form.hero_image_url} onChange={e => set('hero_image_url', e.target.value)} placeholder="…or paste an image URL" style={inputStyle} />
      </div>

      <SectionHeading>Colors</SectionHeading>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '0 0 10px' }}>
        Primary fills headers + main buttons. Secondary handles muted variants. Accent is for badges, brand chips, member-only highlights.
      </p>
      <ColorRow label="Primary"   value={form.primary_color}   onChange={v => set('primary_color', v)} />
      <ColorRow label="Secondary" value={form.secondary_color} onChange={v => set('secondary_color', v)} />
      <ColorRow label="Accent"    value={form.accent_color}    onChange={v => set('accent_color', v)} />

      <SectionHeading>Contact</SectionHeading>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Phone</label>
          <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="(217) 935-3441" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Email</label>
          <input value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="office@yourclub.com" style={inputStyle} />
        </div>
      </div>

      {/* Platform-only: location facts that don't change day-to-day */}
      {isPlatform && (
        <>
          <SectionHeading>Location (platform-managed)</SectionHeading>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="1126 N Center St, Clinton, IL 61727" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>State</label>
              <input value={form.state} onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))} maxLength={2} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Timezone</label>
            <select value={form.timezone} onChange={e => set('timezone', e.target.value)} style={inputStyle}>
              {COMMON_TIMEZONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Latitude</label>
              <input value={form.lat} onChange={e => set('lat', e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} placeholder="40.1010" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Longitude</label>
              <input value={form.lng} onChange={e => set('lng', e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} placeholder="-88.9630" />
            </div>
          </div>

          <SectionHeading>Course Facts (platform-managed)</SectionHeading>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Founded</label>
              <input type="number" value={form.founded} onChange={e => set('founded', e.target.value)} placeholder="1921" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Holes</label>
              <input type="number" value={form.holes} onChange={e => set('holes', e.target.value)} placeholder="9" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Par</label>
              <input type="number" value={form.par} onChange={e => set('par', e.target.value)} placeholder="35" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Yards</label>
              <input type="number" value={form.yardage} onChange={e => set('yardage', e.target.value)} placeholder="2784" style={inputStyle} />
            </div>
          </div>
        </>
      )}

      <SectionHeading>Subscription & Features</SectionHeading>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '0 0 8px' }}>
        Your subscription tier determines which features are available. Within your tier, you can toggle individual features on or off.
      </p>

      {/* Tier — editable dropdown for super_admin, badge for everyone else.
          The DB also enforces this via a trigger, so a manager bypassing
          the UI still can't change tier. */}
      <div style={{ padding: '12px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 10 }}>
        <label style={labelStyle}>Subscription tier</label>
        {isSuperAdmin ? (
          <>
            <select
              value={form.subscription_tier}
              onChange={e => set('subscription_tier', e.target.value)}
              style={inputStyle}
            >
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="pro">Pro</option>
            </select>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '6px 0 0', lineHeight: 1.5 }}>
              {TIER_DESCRIPTION[form.subscription_tier]}
            </p>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-block', padding: '3px 10px', background: G.brass, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 10, color: '#F2E5C0', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
              {TIER_LABEL[form.subscription_tier] || 'Basic'}
            </span>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, lineHeight: 1.5, flex: 1 }}>
              {TIER_DESCRIPTION[form.subscription_tier]}
            </p>
          </div>
        )}
      </div>

      {/* Per-flag toggles moved to the dedicated Features admin area
          (Phase 7). Keeping a pointer here so anyone looking for the
          toggles in the old spot finds them quickly. */}
      <div style={{ padding: '12px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 10 }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: 0, lineHeight: 1.5 }}>
          Feature toggles moved to the <strong>Features</strong> area on the admin hub. Tier still lives here; the per-feature on/off controls (Pro Shop, Bulletin Board, Locker numbers, etc.) live in one dedicated place now.
        </p>
      </div>

      <div style={{ padding: '12px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 14 }}>
        <label style={labelStyle}>Pending Member Access</label>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 8px', lineHeight: 1.5 }}>
          What can a brand-new signup do before staff promotes them to active? Switch to 'Full' if you don't need an approval step at all; switch to 'Locked' if you want every signup to wait for a manual approval.
        </p>
        <select value={form.pending_member_access} onChange={e => set('pending_member_access', e.target.value)} style={inputStyle}>
          <option value="read_only">Read-only · browse, no writes (recommended)</option>
          <option value="full">Full · no approval gating</option>
          <option value="locked">Locked · splash screen only until approved</option>
        </select>
      </div>

      {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}

      <div onClick={save} data-tap style={{ padding: 12, background: savedAt ? G.openBg : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer', transition: 'background 0.3s' }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>
          {busy ? 'Saving…' : savedAt ? '✓ Saved — live on every device' : 'Save Changes'}
        </span>
      </div>
    </div>
  );
}

function SectionHeading({ children }) {
  return (
    <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '14px 0 8px' }}>{children}</h4>
  );
}

function ColorRow({ label, value, onChange }) {
  const hex = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#000000';
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
      <input
        type="color"
        value={hex}
        onChange={e => onChange(e.target.value.toUpperCase())}
        style={{ width: 48, height: 36, border: `1px solid ${G.border}`, borderRadius: 3, padding: 2, background: '#F8F4EC', cursor: 'pointer', flexShrink: 0 }}
      />
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 2px' }}>{label}</p>
        <input
          value={value}
          onChange={e => onChange(e.target.value.toUpperCase())}
          placeholder="#1B3A2D"
          style={{ width: '100%', padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: 'monospace', fontSize: 12, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
    </div>
  );
}

// ============================================================
// NewsAdminFull — replaces the old composer with full list + edit + delete
// ============================================================
export function NewsAdminFull() {
  const { hasPerm } = useAuth();
  return (
    <CrudSection
      canEdit={hasPerm('can_post_news')}
      table="news"
      title="News Article"
      emptyMsg="No news posts yet."
      columns={['id', 'category', 'headline', 'body', 'date_label', 'published_at']}
      order={{ column: 'published_at', ascending: false }}
      primaryField="headline"
      secondaryFn={r => `${r.category || 'General'} · ${r.date_label || (r.published_at ? new Date(r.published_at).toLocaleDateString() : '')}`}
      // v0.6.0: date_label is now an OPTIONAL date picker (was a
      // required text label that defaulted to "Today"). Empty = no
      // date shown on the member card. Legacy text values in existing
      // rows continue to render as-is; member-side formatNewsDate in
      // useClubData handles both formats.
      defaultRow={{ category: 'Events', headline: '', body: '', date_label: null, published_at: new Date().toISOString() }}
      fields={[
        { key: 'category',   label: 'Category', type: 'select', options: ['Events', 'Course', 'Dining', 'Club', 'General'], required: true },
        { key: 'headline',   label: 'Headline', type: 'text', required: true },
        { key: 'body',       label: 'Body',     type: 'textarea', required: true },
        { key: 'date_label', label: 'Display date (optional)', type: 'date' },
      ]}
    />
  );
}

// ============================================================
// HolesAdmin — per-hole metadata (par, yards, name, description, image)
// ============================================================
export function HolesAdmin() {
  const { hasPerm } = useAuth();
  return (
    <CrudSection
      canEdit={hasPerm('can_edit_pins')}
      table="holes"
      title="Hole"
      emptyMsg="No holes defined yet."
      columns={['id', 'hole_number', 'par', 'yards', 'yards_blue', 'yards_white', 'yards_red', 'handicap', 'name', 'description', 'green_image']}
      order={{ column: 'hole_number', ascending: true }}
      primaryField="name"
      secondaryFn={r => `Hole ${r.hole_number} · Par ${r.par ?? '?'} · ${r.yards ?? '?'} yds${r.handicap ? ` · Hdcp ${r.handicap}` : ''}`}
      defaultRow={{ hole_number: 1, par: 4, yards: null, yards_blue: null, yards_white: null, yards_red: null, handicap: null, name: '', description: '', green_image: '' }}
      fields={[
        { key: 'hole_number', label: 'Hole #', type: 'number' },
        { key: 'name',        label: 'Name (optional)', type: 'text', placeholder: 'Lakeview, Cedar Bend…' },
        { key: 'par',         label: 'Par', type: 'number' },
        { key: 'handicap',    label: 'Handicap (1 = hardest)', type: 'number' },
        { key: 'yards',       label: 'Yards (default tee)', type: 'number' },
        { key: 'yards_blue',  label: 'Yards — Blue', type: 'number' },
        { key: 'yards_white', label: 'Yards — White', type: 'number' },
        { key: 'yards_red',   label: 'Yards — Red', type: 'number' },
        { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Dogleg right, water short, etc.' },
        { key: 'green_image', label: 'Green Image URL', type: 'url', placeholder: '/greens/hole-1.svg or https://…' },
      ]}
    />
  );
}

// ============================================================
// MenuItemsAdmin — individual menu items linked to a menu_category
// ============================================================
export function MenuItemsAdmin() {
  const { club, hasPerm } = useAuth();
  const [cats, setCats] = useState([]);
  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    supabase.from('menu_categories').select('id, name').eq('club_id', club.id).order('sort_order', { ascending: true }).then(({ data }) => {
      if (!cancelled) setCats(data || []);
    });
    return () => { cancelled = true; };
  }, [club?.id]);

  const catOptions = cats.length
    ? cats.map(c => ({ value: c.id, label: c.name }))
    : [{ value: '', label: '(create a category first)' }];

  return (
    <CrudSection
      canEdit={hasPerm('can_manage_menu')}
      table="menus"
      title="Menu Item"
      emptyMsg="No menu items yet."
      columns={['id', 'category_id', 'category', 'item_name', 'description', 'price', 'tag', 'is_special', 'available_today', 'sort_order']}
      order={{ column: 'sort_order', ascending: true }}
      primaryField="item_name"
      secondaryFn={r => {
        const cat = cats.find(c => c.id === r.category_id);
        return [cat?.name || r.category, r.price, r.is_special && 'Special', r.available_today === false && 'Hidden'].filter(Boolean).join(' · ');
      }}
      defaultRow={{ category_id: catOptions[0]?.value || null, item_name: '', description: '', price: '', tag: '', is_special: false, available_today: true, sort_order: 0 }}
      // menus.category (text, NOT NULL) is a legacy column from before
      // we added menu_categories. The DB still requires it, so mirror
      // the category NAME from the selected category_id at save time.
      // Without this every Add Menu Item hit a 23502 silently.
      beforeSave={(form) => {
        const cat = cats.find(c => c.id === form.category_id);
        return { ...form, category: cat?.name || form.category || 'uncategorized' };
      }}
      fields={[
        { key: 'category_id',     label: 'Category', type: 'select', options: catOptions, required: true },
        { key: 'item_name',       label: 'Item Name', type: 'text', required: true },
        { key: 'description',     label: 'Description', type: 'textarea' },
        { key: 'price',           label: 'Price (display string)', type: 'text', placeholder: '$12 or "Market"' },
        { key: 'tag',             label: 'Tag (optional)', type: 'text', placeholder: 'Chef Special, Gluten Free…' },
        { key: 'is_special',      label: "Show in Today's Specials", type: 'checkbox' },
        { key: 'available_today', label: 'Available today', type: 'checkbox' },
        { key: 'sort_order',      label: 'Sort Order (within category)', type: 'number' },
      ]}
    />
  );
}

// ============================================================
// EventsAdmin — create/edit events (RSVPs are a separate section)
// ============================================================
export function EventsAdmin() {
  const { hasPerm } = useAuth();
  return (
    <CrudSection
      canEdit={hasPerm('can_manage_events')}
      table="events"
      title="Event"
      emptyMsg="No events scheduled yet."
      columns={['id', 'title', 'description', 'category', 'event_date', 'event_time', 'date_label', 'dow', 'day_num', 'spots', 'price']}
      order={{ column: 'event_date', ascending: true }}
      primaryField="title"
      secondaryFn={r => [r.category, r.event_date ? new Date(r.event_date + 'T12:00:00').toLocaleDateString() : null, r.event_time, r.spots != null && `${r.spots} spots`].filter(Boolean).join(' · ')}
      defaultRow={{ title: '', description: '', category: 'Social', event_date: new Date().toISOString().slice(0, 10), event_time: '', spots: 0, price: '' }}
      beforeSave={(form) => {
        // Auto-derive the denormalized display fields from event_date
        if (form.event_date) {
          const d = new Date(form.event_date + 'T12:00:00');
          form.dow = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
          form.day_num = d.getDate().toString();
          form.date_label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }
        return form;
      }}
      fields={[
        { key: 'title',       label: 'Title', type: 'text', required: true },
        { key: 'category',    label: 'Category', type: 'select', options: ['Golf', 'Social', 'Dining'] },
        { key: 'event_date',  label: 'Date', type: 'date' },
        { key: 'event_time',  label: 'Time (display string)', type: 'text', placeholder: '7:30am shotgun · 6:00pm – 9:00pm' },
        { key: 'spots',       label: 'Spots available', type: 'number' },
        { key: 'price',       label: 'Price (display string)', type: 'text', placeholder: '$125, Free, Market…' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  );
}

// ============================================================
// MemberGuideAdmin — onboarding pages stored in club_content.
// v0.9.1: custom component (was CrudSection) with the UX Marc
// specced:
//   · list shows title + slug + icon + sort order at a glance
//   · up/down arrows reorder via sort_order swap with the neighbor
//   · slug auto-derives from title (overridable in the editor)
//   · delete confirms by name
// Lives in Club Settings (moved from Communications in v0.9.1) —
// pages are configuration of how the club presents itself, not a
// comms surface.
// ============================================================
function slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')   // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function MemberGuideAdmin() {
  const { club, hasPerm } = useAuth();
  const canEdit = hasPerm('can_post_news');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // row | 'new' | null
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('club_content')
        .select('id, slug, title, icon, body, sort_order')
        .eq('club_id', club.id)
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    })();
    const channel = supabase
      .channel(`club_content:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_content', filter: `club_id=eq.${club.id}` }, () => setVersion(v => v + 1))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id, version]);

  const move = async (row, direction) => {
    if (!canEdit) return;
    const idx = rows.findIndex(r => r.id === row.id);
    const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= rows.length) return;
    const neighbor = rows[neighborIdx];
    // Swap sort_order values
    await Promise.all([
      supabase.from('club_content').update({ sort_order: neighbor.sort_order }).eq('id', row.id),
      supabase.from('club_content').update({ sort_order: row.sort_order }).eq('id', neighbor.id),
    ]);
    setVersion(v => v + 1);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0, flex: 1 }}>
          {rows.length} {rows.length === 1 ? 'page' : 'pages'}
          {!canEdit && ' · view only'}
        </p>
        {canEdit && (
          <div onClick={() => setEditing('new')} data-tap style={{ padding: '8px 14px', background: G.green, borderRadius: 3, cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>+ Add page</span>
          </div>
        )}
      </div>

      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
      {!loading && rows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No guide pages yet. Add a Welcome page to get started.</p>
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {rows.map((row, i) => (
            <div key={row.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 8px 10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 8 }}>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{row.icon || '◇'}</span>
              <div onClick={() => setEditing(row)} data-tap style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title || '(untitled)'}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>/{row.slug || '?'} · sort {row.sort_order ?? 0}</p>
              </div>
              {canEdit && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <button
                    onClick={() => move(row, 'up')}
                    disabled={i === 0}
                    style={{ width: 28, height: 28, padding: 0, background: 'transparent', border: 'none', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.25 : 1 }}
                    aria-label="Move up"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.text} strokeWidth="2"><path d="M18 15l-6-6-6 6" /></svg>
                  </button>
                  <button
                    onClick={() => move(row, 'down')}
                    disabled={i === rows.length - 1}
                    style={{ width: 28, height: 28, padding: 0, background: 'transparent', border: 'none', cursor: i === rows.length - 1 ? 'default' : 'pointer', opacity: i === rows.length - 1 ? 0.25 : 1 }}
                    aria-label="Move down"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.text} strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <MemberGuideEditor
          club={club}
          canEdit={canEdit}
          row={editing === 'new'
            ? { slug: '', title: '', icon: '', body: '', sort_order: (rows[rows.length - 1]?.sort_order ?? -1) + 1 }
            : editing}
          isAdd={editing === 'new'}
          existingSlugs={rows.filter(r => editing === 'new' || r.id !== editing.id).map(r => r.slug)}
          onClose={() => setEditing(null)}
          onSaved={() => setVersion(v => v + 1)}
        />
      )}
    </div>
  );
}

// v0.9.8: curated emoji palette for the Member Guide icon picker.
// Picked to cover the most common section topics a club ships in its
// onboarding guide. Click an icon to select; the free-text input
// below the palette stays as the fallback for anything custom.
const GUIDE_ICONS = ['👋', '⛳', '🏌️', '🏆', '🌳', '🍽️', '🍷', '☕', '📅', '📜', '🚗', '🅿️', '🏊', '🎾', 'ℹ️', '📍', '☎️', '⚠️'];

function MemberGuideEditor({ club, canEdit, row, isAdd, existingSlugs, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({ ...row }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // v0.9.8: slug is fully internal — never shown to members, never
  // used in any URL today. Editor no longer exposes it. We auto-derive
  // from title on save with a numeric collision suffix so duplicate
  // titles ("Welcome", "Welcome") get distinct slugs ("welcome",
  // "welcome-2") instead of failing the unique check.
  function uniqueSlug(title) {
    const base = slugify(title) || 'page';
    if (!existingSlugs.includes(base)) return base;
    for (let i = 2; i < 100; i++) {
      const candidate = `${base}-${i}`;
      if (!existingSlugs.includes(candidate)) return candidate;
    }
    return `${base}-${Date.now()}`;          // last-resort uniqueness
  }

  const save = async () => {
    setErr(null);
    if (!form.title?.trim()) { setErr('Title is required.'); return; }
    if (!form.body?.trim()) { setErr('Body is required (even a short blurb).'); return; }
    setBusy(true);
    // Preserve existing slug on edit (URL stability); auto-disambiguate
    // on add.
    const slug = isAdd
      ? uniqueSlug(form.title)
      : (row.slug || uniqueSlug(form.title));
    const payload = {
      slug,
      title: form.title.trim(),
      icon: form.icon || null,
      body: form.body,
      sort_order: form.sort_order ?? 0,
      club_id: club.id,
    };
    const { error } = isAdd
      ? await supabase.from('club_content').insert(payload)
      : await supabase.from('club_content').update(payload).eq('id', row.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
    onClose();
  };

  const remove = async () => {
    if (!confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    setBusy(true);
    const { error } = await supabase.from('club_content').delete().eq('id', row.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
    onClose();
  };

  const input = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' };
  const label = { fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>{isAdd ? 'Add Guide Page' : 'Edit Guide Page'}</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={label}>Title <span style={{ color: G.clsDot }}>*</span></label>
          <input value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Welcome, Dress Code, Tee Times…" style={input} />
        </div>

        {/* v0.9.8: icon picker — palette of common club-context emojis +
            free-text fallback. Selected icon highlighted in green; tap
            again to clear. Free input also accepts any 1-2 emoji. */}
        <div style={{ marginBottom: 10 }}>
          <label style={label}>Icon · tap to pick, or type your own below</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            {GUIDE_ICONS.map(em => {
              const selected = (form.icon || '') === em;
              return (
                <div
                  key={em}
                  onClick={() => setForm(p => ({ ...p, icon: selected ? '' : em }))}
                  data-tap
                  style={{
                    width: 38, height: 38, borderRadius: 4,
                    background: selected ? G.green : G.card,
                    border: `1px solid ${selected ? G.green : G.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, cursor: 'pointer',
                  }}
                  aria-label={`Select ${em}`}
                  aria-pressed={selected}
                >
                  {em}
                </div>
              );
            })}
          </div>
          <input
            value={form.icon || ''}
            onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}
            placeholder="Or paste a custom emoji"
            style={input}
            maxLength={4}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={label}>Body <span style={{ color: G.clsDot }}>*</span></label>
          <textarea value={form.body || ''} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Welcome to the club. Here's what you need to know…" style={{ ...input, height: 160, resize: 'none', lineHeight: 1.5 }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Sort Order · lower numbers appear first (or use ↑↓ arrows on the list)</label>
          <input type="number" value={form.sort_order ?? ''} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value === '' ? 0 : Number(e.target.value) }))} style={input} />
        </div>

        {err && (
          <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', marginBottom: 10, background: 'rgba(224,84,84,0.10)', border: `1px solid ${G.clsDot}`, borderRadius: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.clsDot} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: 0, lineHeight: 1.45, flex: 1 }}>{err}</p>
          </div>
        )}

        {canEdit ? (
          <>
            <div onClick={save} data-tap style={{ marginTop: 8, padding: 12, background: busy ? G.muted : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Saving…' : (isAdd ? 'Save Page' : 'Save Changes')}</span>
            </div>
            {!isAdd && (
              <div onClick={remove} data-tap style={{ marginTop: 10, padding: 8, textAlign: 'center', cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, textDecoration: 'underline', textUnderlineOffset: 2 }}>Delete Page</span>
              </div>
            )}
          </>
        ) : (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, textAlign: 'center', margin: '12px 0 0' }}>
            View only. Ask your club manager to grant edit permission.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MemberPostsAdmin — moderation queue for bulletin + partner posts
// ============================================================
export function MemberPostsAdmin() {
  const { club, hasPerm } = useAuth();
  const canEdit = hasPerm('can_manage_members');
  const [bulletin, setBulletin] = useState([]);
  const [partner, setPartner] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('bulletin');

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    const load = async () => {
      const [{ data: b }, { data: p }] = await Promise.all([
        supabase.from('bulletin_posts')
          .select('id, category, title, body, hidden, created_at, member_id, members(name, membership_number)')
          .eq('club_id', club.id)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('partner_posts')
          .select('id, category, title, body, hcp, is_open, created_at, member_id, members(name, membership_number)')
          .eq('club_id', club.id)
          .order('created_at', { ascending: false })
          .limit(200),
      ]);
      if (cancelled) return;
      setBulletin(b || []); setPartner(p || []);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel(`memberposts:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bulletin_posts', filter: `club_id=eq.${club.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_posts',  filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id]);

  const toggleHidden = async (row) => {
    await supabase.from('bulletin_posts').update({ hidden: !row.hidden }).eq('id', row.id);
  };
  const removeBulletin = async (id) => {
    if (!confirm('Delete this bulletin post? Members will lose it permanently.')) return;
    await supabase.from('bulletin_posts').delete().eq('id', id);
  };
  const togglePartnerOpen = async (row) => {
    await supabase.from('partner_posts').update({ is_open: !row.is_open }).eq('id', row.id);
  };
  const removePartner = async (id) => {
    if (!confirm('Delete this partner post? Members will lose it permanently.')) return;
    await supabase.from('partner_posts').delete().eq('id', id);
  };

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
        Member-generated posts. Hide a bulletin post to keep it out of the member feed while leaving it on record; delete to remove entirely. {!canEdit && 'View only — ask your manager for can_manage_members to moderate.'}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, background: G.card, padding: 4, borderRadius: 4, border: `1px solid ${G.border}` }}>
        {[{ id: 'bulletin', l: `Bulletin (${bulletin.length})` }, { id: 'partner', l: `Partner posts (${partner.length})` }].map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} data-tap style={{ flex: 1, padding: '8px 12px', borderRadius: 3, background: tab === t.id ? G.green : 'transparent', cursor: 'pointer', textAlign: 'center' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: tab === t.id ? '#F2EDE0' : G.muted, fontWeight: tab === t.id ? 600 : 400 }}>{t.l}</span>
          </div>
        ))}
      </div>

      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}

      {!loading && tab === 'bulletin' && bulletin.length === 0 && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, padding: 16, textAlign: 'center', background: G.card, borderRadius: 4 }}>No bulletin posts yet.</p>
      )}
      {!loading && tab === 'bulletin' && bulletin.map(r => (
        <div key={r.id} style={{ padding: '12px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 8, opacity: r.hidden ? 0.5 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0 }}>{r.title}{r.hidden && <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.clsDot, fontStyle: 'italic', marginLeft: 8 }}>(hidden)</span>}</p>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted }}>{new Date(r.created_at).toLocaleDateString()}</span>
          </div>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0' }}>{r.category} · {r.members?.name || 'Member'}</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: '6px 0 8px', lineHeight: 1.5 }}>{r.body}</p>
          {canEdit && (
            <div style={{ display: 'flex', gap: 12 }}>
              <span onClick={() => toggleHidden(r)} data-tap style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brass, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>{r.hidden ? 'Unhide' : 'Hide'}</span>
              <span onClick={() => removeBulletin(r.id)} data-tap style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>Delete</span>
            </div>
          )}
        </div>
      ))}

      {!loading && tab === 'partner' && partner.length === 0 && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, padding: 16, textAlign: 'center', background: G.card, borderRadius: 4 }}>No partner posts yet.</p>
      )}
      {!loading && tab === 'partner' && partner.map(r => (
        <div key={r.id} style={{ padding: '12px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 8, opacity: r.is_open === false ? 0.5 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0 }}>{r.title}{r.is_open === false && <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, fontStyle: 'italic', marginLeft: 8 }}>(closed)</span>}</p>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted }}>{new Date(r.created_at).toLocaleDateString()}</span>
          </div>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0' }}>{r.category || 'Foursome'} · {r.members?.name || 'Member'}{r.hcp != null && ` · Hcp ${r.hcp}`}</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: '6px 0 8px', lineHeight: 1.5 }}>{r.body}</p>
          {canEdit && (
            <div style={{ display: 'flex', gap: 12 }}>
              <span onClick={() => togglePartnerOpen(r)} data-tap style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brass, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>{r.is_open === false ? 'Reopen' : 'Mark closed'}</span>
              <span onClick={() => removePartner(r.id)} data-tap style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>Delete</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// ClubhouseInboxAdmin — staff sees member-initiated clubhouse threads,
// grouped by topic. Tap a thread -> opens Thread view to reply.
// (Push for new clubhouse messages fires via the same trigger as
// every other message.)
// ============================================================
export function ClubhouseInboxAdmin() {
  const { club, hasPerm } = useAuth();
  const { push } = useNav();
  const canReply = hasPerm('can_view_clubhouse_inbox');
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    const load = async () => {
      // RLS already restricts to staff of this club seeing all clubhouse threads
      const { data: rows } = await supabase
        .from('threads')
        .select('id, subject, last_message_at, created_at, created_by, members:created_by(name)')
        .eq('club_id', club.id)
        .eq('kind', 'clubhouse')
        .order('last_message_at', { ascending: false })
        .limit(200);

      if (cancelled) return;

      // Pull each thread's last message body for preview + the
      // first participant (the member who started it) so we can show
      // who sent it.
      const enriched = await Promise.all((rows || []).map(async (t) => {
        const [{ data: lastMsg }, { data: parts }] = await Promise.all([
          supabase.from('messages')
            .select('body, sender_user_id, is_system, created_at')
            .eq('thread_id', t.id)
            .order('created_at', { ascending: false })
            .limit(1).maybeSingle(),
          supabase.from('thread_participants')
            .select('user_id, role, members(name, membership_number)')
            .eq('thread_id', t.id)
            .eq('role', 'member')
            .limit(1).maybeSingle(),
        ]);
        return { ...t, preview: lastMsg, starter: parts };
      }));

      setThreads(enriched);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`clubhouse_inbox:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'threads', filter: `club_id=eq.${club.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id]);

  // Group by topic
  const grouped = threads.reduce((acc, t) => {
    const topic = t.subject || 'General';
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push(t);
    return acc;
  }, {});

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
        Member-initiated conversations routed to the clubhouse, grouped by topic. {canReply ? 'Tap a thread to reply.' : 'You can read but not reply — ask your manager for write permission.'}
      </p>

      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, textAlign: 'center', padding: '20px 0' }}>Loading…</p>}
      {!loading && threads.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No member messages yet.</p>
        </div>
      )}

      {Object.entries(grouped).map(([topic, list]) => (
        <div key={topic} style={{ marginBottom: 14 }}>
          <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 6px' }}>{topic}</h4>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 6px' }}>{list.length} thread{list.length === 1 ? '' : 's'}</p>
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
            {list.map((t, i) => {
              const starterName = t.starter?.members?.name || 'Member';
              const starterNum = t.starter?.members?.membership_number;
              const preview = t.preview?.is_system ? `(${t.preview.body})` : (t.preview?.body || 'No messages yet');
              return (
                <div key={t.id} onClick={() => push('thread', { threadId: t.id })} data-tap style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 8, cursor: 'pointer' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {starterName}{starterNum ? ` · #${starterNum}` : ''}
                      </p>
                      <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, flexShrink: 0 }}>{relativeTime(t.last_message_at)}</span>
                    </div>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function relativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString();
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
// ============================================================
// AllClubsAdmin — super_admin cross-club browser + onboarding
// (Platform area → super_admin only)
// ============================================================
export function AllClubsAdmin() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);     // club row being edited
  const [creating, setCreating] = useState(false);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('clubs')
        .select('id, slug, name, city, state, primary_color, logo_url, tagline, created_at')
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (!error) setClubs(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [version]);

  // When editing, re-fetch the full club row (the list only carries summary cols)
  const [fullClub, setFullClub] = useState(null);
  useEffect(() => {
    if (!selected) { setFullClub(null); return; }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from('clubs').select('*').eq('id', selected.id).single();
      if (!cancelled) setFullClub(data);
    };
    load();
    // Subscribe to UPDATEs on this specific club so the form preview stays current
    const channel = supabase
      .channel(`clubs_edit:${selected.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'clubs', filter: `id=eq.${selected.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [selected?.id]);

  if (loading) return <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '40px 0', textAlign: 'center' }}>Loading clubs…</p>;

  // ── Edit panel for one club
  if (selected && fullClub) {
    return (
      <div>
        <div onClick={() => setSelected(null)} data-tap style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0', marginBottom: 14, cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7" /></svg>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.brass }}>All Clubs</span>
        </div>
        <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 20, fontWeight: 700, color: G.text, margin: '0 0 4px' }}>{fullClub.name}</h3>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '0 0 16px' }}>
          {fullClub.slug}.groundslive.com · {fullClub.city || '?'}, {fullClub.state || '?'}
        </p>
        <ClubSettingsForm
          club={fullClub}
          mode="platform"
          headerNote="Edit any club on the platform. As super_admin you also control the location facts + course meta + timezone that managers can't touch."
        />

        {/* Phase 7: per-club Features panel in platform mode. Adds
            lock controls below each toggle so super_admin can pin a
            feature on/off for this club regardless of what the
            manager sets. */}
        <div style={{ marginTop: 28 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text, margin: '0 0 4px' }}>Features</h3>
          <FeaturesPanel
            club={fullClub}
            mode="platform"
            headerNote="Toggles below write to this club's feature_flags. Hit 'Lock for this club' under any flag to pin the current value into feature_flags_locked — the manager will see 'Set by The Grounds' and the toggle will be disabled in their Features area."
          />
        </div>
      </div>
    );
  }

  // ── List view
  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
        Every club on the platform. Tap a row to edit branding + contact info. Add a new club to onboard.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0, flex: 1 }}>
          {clubs.length} {clubs.length === 1 ? 'club' : 'clubs'}
        </p>
        <div onClick={() => setCreating(true)} data-tap style={{ padding: '8px 14px', background: G.green, borderRadius: 3, cursor: 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>+ New Club</span>
        </div>
      </div>

      <div style={{ background: G.card, borderRadius: 4, border: `1px solid ${G.border}`, overflow: 'hidden' }}>
        {clubs.map((c, i) => (
          <div key={c.id} onClick={() => setSelected(c)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 10, cursor: 'pointer' }}>
            {/* Color swatch from primary_color */}
            <div style={{ width: 36, height: 36, borderRadius: 4, background: c.primary_color || '#1B3A2D', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {c.logo_url ? (
                <img src={c.logo_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: '#F2E5C0' }}>{(c.name || '?').charAt(0)}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.slug}.groundslive.com{c.city ? ` · ${c.city}${c.state ? `, ${c.state}` : ''}` : ''}
              </p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </div>
        ))}
      </div>

      {creating && (
        <CreateClubModal
          onClose={() => setCreating(false)}
          onCreated={(newClub) => { setCreating(false); refresh(); setSelected(newClub); }}
        />
      )}
    </div>
  );
}

function CreateClubModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', slug: '', address: '', city: '', state: '', founded: '', par: '', yardage: '', holes: '18', lat: '', lng: '', timezone: 'America/Chicago' });
  const [busy, setBusy] = useState(false);          // overall busy
  const [stage, setStage] = useState(null);         // 'db' | 'dns' | 'done'
  const [err, setErr] = useState(null);
  // DNS-stage result is tracked separately because we don't want a DNS
  // failure to block the user from proceeding — the DB row is created
  // and they can manually add the Custom Domain in Cloudflare if the
  // automated path failed.
  const [dnsResult, setDnsResult] = useState(null); // { ok, hostname?, error?, alreadyExisted? }
  const [createdClub, setCreatedClub] = useState(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const autoSlugFromName = (name) => {
    const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20);
    set('slug', s);
  };

  // Two-stage create:
  //   1. INSERT the clubs row (cannot proceed without this)
  //   2. Call provision-club-domain Edge Function to add the subdomain
  //      as a Custom Domain on the the-grounds Pages project. Cloudflare
  //      auto-creates the DNS Worker route + TLS cert.
  // Stage 2 failure is non-fatal — manager sees an error + the manual
  // instructions in the result block.
  const provisionDomain = async (slug, clubId) => {
    setStage('dns');
    try {
      // v0.7.7: pass club_id so the server-side audit log row in
      // club_provision_log has a populated FK back to the new clubs
      // row. Visible to super_admin at Platform → Provision Log.
      const { data, error } = await supabase.functions.invoke('provision-club-domain', { body: { slug, club_id: clubId } });
      if (error) return { ok: false, error: error.message || 'Edge function error' };
      return data;
    } catch (e) {
      return { ok: false, error: e.message || 'Network error invoking Edge Function' };
    }
  };

  const create = async () => {
    setBusy(true); setErr(null); setStage('db'); setDnsResult(null);
    const slug = form.slug.trim().toLowerCase();
    if (!/^[a-z0-9]([a-z0-9-]{0,28}[a-z0-9])?$/.test(slug)) {
      setBusy(false); setStage(null);
      setErr('Slug must be 2–30 chars, lowercase letters/digits/hyphens, and start+end alphanumeric.');
      return;
    }
    const { data, error } = await supabase.from('clubs').insert({
      name: form.name.trim(),
      slug,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      founded: form.founded ? Number(form.founded) : null,
      par: form.par ? Number(form.par) : null,
      yardage: form.yardage ? Number(form.yardage) : null,
      holes: form.holes ? Number(form.holes) : 18,
      lat: form.lat ? Number(form.lat) : null,
      lng: form.lng ? Number(form.lng) : null,
      timezone: form.timezone || 'America/Chicago',
    }).select().single();
    if (error) {
      setBusy(false); setStage(null);
      setErr(error.message);
      return;
    }
    setCreatedClub(data);

    // Stage 2 — try to provision the DNS / Custom Domain. Pass the
    // new club id so the v0.7.7 audit log row links back to it.
    const result = await provisionDomain(slug, data.id);
    setDnsResult(result);
    setStage('done');
    setBusy(false);
    // If DNS succeeded outright, auto-proceed; otherwise let the manager
    // read the result and click Continue manually.
    if (result?.ok) {
      // brief pause so the success state is visible
      setTimeout(() => onCreated?.(data), 700);
    }
  };

  const continueAnyway = () => {
    if (createdClub) onCreated?.(createdClub);
  };

  const labelStyle = { fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 };
  const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>Onboard New Club</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 14px' }}>
          Creates a new club row. The slug becomes the subdomain
          (e.g. <code>oakgrove</code> → <code>oakgrove.groundslive.com</code>). You'll get dropped into Club Settings to finish branding.
        </p>

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Club Name *</label>
          <input value={form.name} onChange={e => { set('name', e.target.value); if (!form.slug) autoSlugFromName(e.target.value); }} placeholder="Oakgrove Country Club" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Slug * (subdomain — lowercase, 2–30 chars)</label>
          <input value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase())} placeholder="oakgrove" style={{ ...inputStyle, fontFamily: 'monospace' }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Street Address</label>
          <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Country Club Rd" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>City</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>State</label>
            <input value={form.state} onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))} placeholder="IL" style={inputStyle} maxLength={2} />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Timezone</label>
          <select value={form.timezone} onChange={e => set('timezone', e.target.value)} style={inputStyle}>
            {COMMON_TIMEZONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Founded</label>
            <input type="number" value={form.founded} onChange={e => set('founded', e.target.value)} placeholder="1921" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Holes</label>
            <input type="number" value={form.holes} onChange={e => set('holes', e.target.value)} placeholder="18" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Par</label>
            <input type="number" value={form.par} onChange={e => set('par', e.target.value)} placeholder="72" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Yards</label>
            <input type="number" value={form.yardage} onChange={e => set('yardage', e.target.value)} placeholder="6200" style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Latitude</label>
            <input value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="40.1010" style={{ ...inputStyle, fontFamily: 'monospace' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Longitude</label>
            <input value={form.lng} onChange={e => set('lng', e.target.value)} placeholder="-88.9630" style={{ ...inputStyle, fontFamily: 'monospace' }} />
          </div>
        </div>

        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}

        {/* Two-stage status display. While creating, show the current
            stage. When done, show the DNS result so the manager knows
            whether the subdomain is live or needs manual setup. */}
        {stage && stage !== 'done' && (
          <div style={{ padding: '10px 12px', marginBottom: 10, background: G.card, border: `1px solid ${G.border}`, borderRadius: 4 }}>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: 0, lineHeight: 1.5 }}>
              {stage === 'db'  && 'Creating club row…'}
              {stage === 'dns' && 'Provisioning subdomain on Cloudflare…'}
            </p>
          </div>
        )}

        {stage === 'done' && dnsResult?.ok && (
          <div style={{ padding: '12px 14px', marginBottom: 10, background: 'rgba(82,193,120,0.10)', border: `1px solid ${G.openDot}`, borderRadius: 4 }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 4px' }}>
              ✓ Live{dnsResult.alreadyExisted ? ' — already configured' : ''}
            </p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: 0, lineHeight: 1.5, wordBreak: 'break-all' }}>
              https://{dnsResult.hostname}
              {!dnsResult.alreadyExisted && (
                <> — TLS cert provisions in 1–5 min, then it's reachable.</>
              )}
            </p>
          </div>
        )}

        {stage === 'done' && dnsResult && !dnsResult.ok && (
          <div style={{ padding: '12px 14px', marginBottom: 10, background: 'rgba(232,184,64,0.12)', border: `1px solid ${G.brass}`, borderRadius: 4 }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 4px' }}>
              Club created — subdomain needs manual setup
            </p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 6px', lineHeight: 1.55 }}>
              The DB row is in. Cloudflare's automated path failed:
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: 10.5, color: G.clsDot, margin: '0 0 8px', wordBreak: 'break-word', lineHeight: 1.4 }}>
              {dnsResult.error}
            </p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, lineHeight: 1.55 }}>
              Manual fix: Cloudflare → Workers &amp; Pages → the-grounds → Domains → Add Domain →
              <code style={{ fontFamily: 'monospace', background: G.card, padding: '1px 4px', borderRadius: 2, margin: '0 2px' }}>{form.slug}.groundslive.com</code>
            </p>
          </div>
        )}

        {stage === 'done' && dnsResult && !dnsResult.ok ? (
          <div onClick={continueAnyway} data-tap style={{ padding: 12, background: G.green, borderRadius: 3, textAlign: 'center', cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>Continue to Club Settings</span>
          </div>
        ) : (
          <div onClick={busy || stage === 'done' ? undefined : create} data-tap style={{ padding: 12, background: form.name && form.slug && !busy && stage !== 'done' ? G.green : G.border, borderRadius: 3, textAlign: 'center', cursor: form.name && form.slug && !busy && stage !== 'done' ? 'pointer' : 'not-allowed' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: form.name && form.slug && !busy && stage !== 'done' ? '#F2EDE0' : G.muted, fontWeight: 500 }}>
              {stage === 'db'  ? 'Creating…' :
               stage === 'dns' ? 'Provisioning…' :
               stage === 'done' ? 'Done' :
               'Create Club'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
// ============================================================
// GuestManagementAdmin — Phase 8 (v0.8.4). Manager-facing
// surface for everything guest-related at a single club.
//
// Sections (top to bottom):
//   1. Status: "Guest registration is OFF" message + link to
//      Features when the flag isn't on. Otherwise shows the live
//      guest count + a quick stats summary.
//   2. Settings card: auto-approve, visit duration, phone field,
//      PWA required, default access level. Each saves immediately
//      via supabase update on flip (no batched Save button —
//      matches the FeaturesPanel pattern from v0.7.0).
//   3. Clubhouse QR card: the per-club QR for public play / drives.
//      "Regenerate" increments clubs.clubhouse_qr_version which
//      invalidates every prior QR. "Download PNG" exports the QR
//      to a canvas → blob → save dialog for printing on signage.
//   4. Guests list: search by name/email, filter by visit type +
//      date range + referring member, CSV export of everything
//      visible (respects current filters). Click a row to expand.
// ============================================================
// GuestRegistrationsFeed — lightweight Comms inbox sub-queue.
// v0.9.6: shows recent guest registrations as a live feed (name,
// time, visit_type, referring_member). Tap a row to expand for
// full details (email, phone, access_level, expires_at) without
// leaving the Comms area. Edit + QR + settings still live in
// GuestManagementAdmin under People area.
// ============================================================
export function GuestRegistrationsFeed() {
  const { club } = useAuth();
  const guestFlagOn = useFlag('guest_registration');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('guests')
        .select('id, name, email, phone, zip, visit_type, visit_date, access_level, status, expires_at, created_at, referring_member_id, members:referring_member_id(name, membership_number)')
        .eq('club_id', club.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel(`guests_feed:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id]);

  if (!guestFlagOn) {
    return (
      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, padding: '20px 18px', textAlign: 'center' }}>
        <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.text, margin: '0 0 6px' }}>Guest registration is off</p>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>Turn it on under Club Settings → Feature Toggles to start collecting registrations.</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
        Live feed of new guest registrations. Tap a row to expand; full edit + QR controls live in <strong>People → Guest Management</strong>.
      </p>
      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
      {!loading && rows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No guest registrations yet.</p>
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {rows.map((r, i) => {
            const isOpen = expanded === r.id;
            const ref = r.members?.name;
            return (
              <div key={r.id} style={{ borderTop: i === 0 ? 'none' : `1px solid ${G.border}` }}>
                <div onClick={() => setExpanded(isOpen ? null : r.id)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8, cursor: 'pointer' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.name || '(no name)'}{' '}
                      <span style={{ color: G.muted, fontWeight: 400, fontSize: 11 }}>· {(r.visit_type || 'visit').replace(/_/g, ' ')}</span>
                    </p>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>
                      {new Date(r.created_at).toLocaleString()}
                      {ref && <span> · invited by {ref}</span>}
                    </p>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}><path d="M6 9l6 6 6-6" /></svg>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 14px 12px', background: G.bg, borderTop: `1px solid ${G.border}` }}>
                    <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 10, rowGap: 4, fontFamily: '"Lora",serif', fontSize: 12, margin: '10px 0 0' }}>
                      <dt style={{ color: G.muted }}>Email</dt><dd style={{ margin: 0, color: G.text }}>{r.email || '—'}</dd>
                      <dt style={{ color: G.muted }}>Phone</dt><dd style={{ margin: 0, color: G.text }}>{r.phone || '—'}</dd>
                      <dt style={{ color: G.muted }}>ZIP</dt><dd style={{ margin: 0, color: G.text }}>{r.zip || '—'}</dd>
                      <dt style={{ color: G.muted }}>Visit type</dt><dd style={{ margin: 0, color: G.text }}>{(r.visit_type || '—').replace(/_/g, ' ')}</dd>
                      <dt style={{ color: G.muted }}>Visit date</dt><dd style={{ margin: 0, color: G.text }}>{r.visit_date ? new Date(r.visit_date).toLocaleDateString() : '—'}</dd>
                      <dt style={{ color: G.muted }}>Access</dt><dd style={{ margin: 0, color: G.text }}>{(r.access_level || '—').replace(/_/g, ' ')}</dd>
                      <dt style={{ color: G.muted }}>Status</dt><dd style={{ margin: 0, color: G.text }}>{r.status || '—'}</dd>
                      <dt style={{ color: G.muted }}>Expires</dt><dd style={{ margin: 0, color: G.text }}>{r.expires_at ? new Date(r.expires_at).toLocaleString() : 'no expiry'}</dd>
                      <dt style={{ color: G.muted }}>Referring member</dt><dd style={{ margin: 0, color: G.text }}>{ref || '—'}</dd>
                    </dl>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
export function GuestManagementAdmin() {
  const { club } = useAuth();
  const guestFlagOn = useFlag('guest_registration');

  if (!club) {
    return <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '40px 0', textAlign: 'center' }}>Loading…</p>;
  }

  // Render the section even when the flag is off — but show a
  // pointer to Features so the manager knows what to flip.
  if (!guestFlagOn) {
    return (
      <div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 14px' }}>
          Guest Management surfaces every guest who's registered at {club.name}, plus the controls for the public QR codes.
        </p>
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, padding: '20px 18px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 16, color: G.text, margin: '0 0 8px' }}>Guest registration is off</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: 0, lineHeight: 1.55 }}>
            Turn on <strong>Guest Registration</strong> in <strong>Admin → Club Settings → Feature Toggles</strong> to start collecting guest registrations and surface QR codes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 14px' }}>
        Manage everything guest-related at {club.name} — settings, the public clubhouse QR, and the full guest list.
      </p>
      <GuestSettingsCard club={club} />
      <ClubhouseQRCard club={club} />
      <GuestList club={club} />
    </div>
  );
}

// ── GuestSettingsCard ───────────────────────────────────────────────
// Manager controls that ride on the clubs row. Each control saves
// immediately on change (no Save button, no race window). The
// realtime sub in useAuth pushes the updated club row back so the
// UI stays consistent if another manager edits in parallel.
function GuestSettingsCard({ club }) {
  const [saving, setSaving]   = useState(null);   // key currently mid-save
  const [err, setErr]         = useState(null);

  const save = async (patch, key) => {
    setSaving(key); setErr(null);
    const { error } = await supabase.from('clubs').update(patch).eq('id', club.id);
    setSaving(null);
    if (error) setErr(error.message);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 8px' }}>Settings</h4>
      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>

        <SettingRow
          label="Auto-approve new registrations"
          hint="When on, a guest who confirms their magic-link email is immediately active. Off = staff must approve each guest first."
        >
          <Toggle
            checked={!!club.guest_auto_approve}
            disabled={saving === 'auto'}
            onChange={v => save({ guest_auto_approve: v }, 'auto')}
            ariaLabel="Auto-approve"
          />
        </SettingRow>

        <SettingRow
          label="Visit duration (days)"
          hint="How many days a guest registration stays valid. Leave empty for indefinite (e.g. for prospective members)."
        >
          <input
            type="number"
            min={1}
            max={365}
            value={club.guest_visit_duration_days ?? ''}
            disabled={saving === 'duration'}
            onChange={e => {
              const v = e.target.value;
              save({ guest_visit_duration_days: v === '' ? null : Math.max(1, Math.min(365, Number(v))) }, 'duration');
            }}
            placeholder="e.g. 1"
            style={{ width: 80, padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' }}
          />
        </SettingRow>

        <SettingRow
          label="Phone field"
          hint="Whether to ask for a phone number on the registration form."
        >
          <select
            value={club.guest_phone_collection || 'off'}
            disabled={saving === 'phone'}
            onChange={e => save({ guest_phone_collection: e.target.value }, 'phone')}
            style={{ padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none' }}
          >
            <option value="off">Off — don't ask</option>
            <option value="optional">Optional</option>
            <option value="required">Required</option>
          </select>
        </SettingRow>

        <SettingRow
          label="Default access level"
          hint="What a new guest sees after they confirm their email. data_only = thank-you screen only, no app access."
        >
          <select
            value={club.guest_default_access_level || 'read_only'}
            disabled={saving === 'access'}
            onChange={e => save({ guest_default_access_level: e.target.value }, 'access')}
            style={{ padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none' }}
          >
            <option value="data_only">data_only — capture contact info only</option>
            <option value="read_only">read_only — status / map / menu / weather</option>
            <option value="full_temporary">full_temporary — above + news / events / pro shop</option>
          </select>
        </SettingRow>

        <SettingRow
          label="Require PWA install"
          hint="When on, the registration page prompts the guest to install the PWA before they can submit. Off keeps it browser-friendly."
        >
          <Toggle
            checked={!!club.guest_pwa_required}
            disabled={saving === 'pwa'}
            onChange={v => save({ guest_pwa_required: v }, 'pwa')}
            ariaLabel="Require PWA install"
          />
        </SettingRow>

        <SettingRow
          label="Clubhouse QR visit type"
          hint="What visit_type the clubhouse QR records by default. Change to tournament_guest for a tournament-only QR, event_guest for a specific event, etc. Affects how the guest shows up in your reporting."
        >
          <select
            value={club.clubhouse_qr_visit_type || 'public_play'}
            disabled={saving === 'cqv'}
            onChange={e => save({ clubhouse_qr_visit_type: e.target.value }, 'cqv')}
            style={{ padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none' }}
          >
            <option value="public_play">Public play</option>
            <option value="tournament_guest">Tournament guest</option>
            <option value="event_guest">Event guest</option>
            <option value="member_guest">Member guest</option>
          </select>
        </SettingRow>

        <SettingRow
          label="Allow guests to order food"
          hint="When on, guests in read_only or full_temporary mode see the same cart + place-order CTAs in the Food tab that members do. Default off — most clubs keep food ordering members-only."
          last
        >
          <Toggle
            checked={!!club.guests_can_order_food}
            disabled={saving === 'food'}
            onChange={v => save({ guests_can_order_food: v }, 'food')}
            ariaLabel="Allow guests to order food"
          />
        </SettingRow>
      </div>
      {err && (
        <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, margin: '6px 0 0' }}>{err}</p>
      )}
    </div>
  );
}

function SettingRow({ label, hint, last, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderBottom: last ? 'none' : `1px solid ${G.border}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0 }}>{label}</p>
        {hint && (
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '3px 0 0', lineHeight: 1.5 }}>{hint}</p>
        )}
      </div>
      <div style={{ flexShrink: 0, paddingTop: 2 }}>{children}</div>
    </div>
  );
}

// ── ClubhouseQRCard ─────────────────────────────────────────────────
function ClubhouseQRCard({ club }) {
  const [data, setData]   = useState(null);   // { url, token, version }
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const qrCanvasRef = useRef(null);

  const mint = async () => {
    setLoading(true); setErr(null);
    try {
      const { data: res, error } = await supabase.functions.invoke('guest-qr-token', {
        body: { mode: 'clubhouse', club_id: club.id },
      });
      if (error || !res?.ok) {
        setErr(res?.error || error?.message || 'Could not generate the clubhouse QR.');
      } else {
        setData(res);
      }
    } catch (e) {
      setErr(e?.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { mint(); /* eslint-disable-line */ }, [club?.id, club?.clubhouse_qr_version]);

  const regenerate = async () => {
    setBusy(true); setErr(null);
    const newVersion = (club.clubhouse_qr_version || 1) + 1;
    const { error } = await supabase
      .from('clubs')
      .update({ clubhouse_qr_version: newVersion })
      .eq('id', club.id);
    setBusy(false); setConfirmRegen(false);
    if (error) { setErr(error.message); return; }
    // Realtime club sub will refetch + the useEffect above re-mints.
  };

  // Download the QR as a PNG via QRCodeCanvas + canvas.toBlob.
  const downloadPng = () => {
    const canvas = qrCanvasRef.current?.querySelector('canvas');
    if (!canvas || !data?.url) { setErr('QR not ready yet.'); return; }
    canvas.toBlob(blob => {
      if (!blob) { setErr('Could not export PNG.'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${club.slug}-clubhouse-guest-qr-v${club.clubhouse_qr_version || 1}.png`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
    }, 'image/png');
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 8px' }}>Clubhouse QR Code</h4>
      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '14px 16px' }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px', lineHeight: 1.55 }}>
          Single QR for the whole club — print it for the pro shop counter, first-tee signage, cart-barn entry, or event check-in tables. Anyone who scans it lands on the public registration form with no referring member.
        </p>

        {loading && (
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center', margin: 0 }}>Generating QR…</p>
        )}

        {!loading && err && (
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, margin: '6px 0' }}>{err}</p>
        )}

        {!loading && data && (
          <>
            <div ref={qrCanvasRef} style={{ background: '#ffffff', padding: 12, borderRadius: 6, border: `1px solid ${G.border}`, display: 'inline-block', marginBottom: 10 }}>
              <QRCodeCanvas value={data.url} size={200} bgColor="#ffffff" fgColor="#000000" level="M" marginSize={0} />
            </div>
            <p style={{ fontFamily: 'monospace', fontSize: 10, color: G.muted, margin: '0 0 10px', wordBreak: 'break-all', lineHeight: 1.5 }}>{data.url}</p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '0 0 12px' }}>
              Current version: v{club.clubhouse_qr_version || 1}
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div onClick={downloadPng} data-tap style={{ padding: '8px 14px', background: G.green, borderRadius: 3, cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>Download PNG</span>
              </div>
              {!confirmRegen ? (
                <div onClick={() => setConfirmRegen(true)} data-tap style={{ padding: '8px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer' }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text }}>Regenerate</span>
                </div>
              ) : (
                <>
                  <div onClick={busy ? undefined : regenerate} data-tap style={{ padding: '8px 14px', background: G.clsBg, borderRadius: 3, cursor: busy ? 'wait' : 'pointer' }}>
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2E5C0', fontWeight: 500 }}>
                      {busy ? 'Regenerating…' : 'Confirm — invalidate the old QR'}
                    </span>
                  </div>
                  <div onClick={() => setConfirmRegen(false)} data-tap style={{ padding: '8px 14px', cursor: 'pointer' }}>
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, textDecoration: 'underline', textUnderlineOffset: 2 }}>Cancel</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── GuestList ───────────────────────────────────────────────────────
function GuestList({ club }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  // v0.8.8: filter by referring member. 'all' shows everything, 'none'
  // shows only public_play / clubhouse registrations (no referring
  // member), or a specific member_id shows only their invited guests.
  const [refFilter, setRefFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from('guests')
        .select('id, name, email, phone, zip, visit_type, visit_date, access_level, status, expires_at, created_at, referring_member_id, members:referring_member_id(name)')
        .eq('club_id', club.id)
        .order('visit_date', { ascending: false })
        .limit(500);
      const { data } = await query;
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel(`guests_admin:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guests', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id]);

  // Client-side filter (server pulled the last 500 records by date; we
  // don't expect a club to outrun that any time soon).
  const filtered = rows.filter(r => {
    if (typeFilter !== 'all' && r.visit_type !== typeFilter) return false;
    if (from && r.visit_date < from) return false;
    if (to && r.visit_date > to) return false;
    if (refFilter === 'none' && r.referring_member_id) return false;
    if (refFilter !== 'all' && refFilter !== 'none' && r.referring_member_id !== refFilter) return false;
    if (q) {
      const needle = q.toLowerCase();
      if (
        !(r.name || '').toLowerCase().includes(needle) &&
        !(r.email || '').toLowerCase().includes(needle)
      ) return false;
    }
    return true;
  });

  // v0.8.8: build the referring-member dropdown options from members
  // who actually have brought a guest. No point listing every member
  // — that'd be a 200-item dropdown for clubs with active rosters.
  const referringMembers = (() => {
    const seen = new Map();
    for (const r of rows) {
      if (r.referring_member_id && r.members?.name) {
        seen.set(r.referring_member_id, r.members.name);
      }
    }
    return Array.from(seen.entries())
      .sort((a, b) => a[1].localeCompare(b[1]));
  })();

  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  const downloadCsv = (filename, lines) => {
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  };

  // Summary CSV — one row per guest, with their most-recent visit info.
  const exportCsv = () => {
    const headers = ['name', 'email', 'phone', 'zip', 'visit_type', 'visit_date', 'access_level', 'status', 'expires_at', 'referring_member', 'created_at'];
    const lines = [headers.join(',')];
    for (const r of filtered) {
      lines.push([
        escape(r.name), escape(r.email), escape(r.phone), escape(r.zip),
        escape(r.visit_type), escape(r.visit_date), escape(r.access_level),
        escape(r.status), escape(r.expires_at),
        escape(r.members?.name || ''),
        escape(r.created_at),
      ].join(','));
    }
    downloadCsv(`${club.slug}-guests-${new Date().toISOString().slice(0,10)}.csv`, lines);
  };

  // v0.8.8: Visit history CSV — one row per visit (joins guest_visits
  // with guests for the contact fields). Lets a manager see how often
  // each guest has been to the club + with which member, on a single
  // export. Pulls fresh from the DB at click time so it's always
  // current; respects the same filters (visit_type + date range +
  // referring_member) that the guest list shows.
  const exportVisitHistoryCsv = async () => {
    // Build the query against guest_visits with joined guest info.
    let query = supabase
      .from('guest_visits')
      .select('id, visit_date, visit_type, access_level, check_in_method, referring_member_id, created_at, guests(name, email, phone, zip), members:referring_member_id(name)')
      .eq('club_id', club.id)
      .order('visit_date', { ascending: false })
      .limit(2000);
    if (typeFilter !== 'all') query = query.eq('visit_type', typeFilter);
    if (from) query = query.gte('visit_date', from);
    if (to)   query = query.lte('visit_date', to);
    if (refFilter === 'none') query = query.is('referring_member_id', null);
    else if (refFilter !== 'all') query = query.eq('referring_member_id', refFilter);

    const { data, error } = await query;
    if (error || !data) {
      alert(`Could not export visit history: ${error?.message || 'unknown error'}`);
      return;
    }
    // Optional name/email q-string filter applied client-side because
    // we'd need a join-side filter for that and it complicates the
    // query syntax. Server pulled with the structural filters; we
    // refine here.
    const matched = q
      ? data.filter(r => {
          const needle = q.toLowerCase();
          return (
            (r.guests?.name  || '').toLowerCase().includes(needle) ||
            (r.guests?.email || '').toLowerCase().includes(needle)
          );
        })
      : data;
    const headers = ['guest_name', 'guest_email', 'guest_phone', 'guest_zip', 'visit_date', 'visit_type', 'access_level', 'check_in_method', 'referring_member', 'visit_recorded_at'];
    const lines = [headers.join(',')];
    for (const r of matched) {
      lines.push([
        escape(r.guests?.name), escape(r.guests?.email), escape(r.guests?.phone), escape(r.guests?.zip),
        escape(r.visit_date), escape(r.visit_type), escape(r.access_level),
        escape(r.check_in_method),
        escape(r.members?.name || ''),
        escape(r.created_at),
      ].join(','));
    }
    downloadCsv(`${club.slug}-visits-${new Date().toISOString().slice(0,10)}.csv`, lines);
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 8px' }}>Guests</h4>

      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '10px 12px', marginBottom: 8 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name or email…"
          style={{ width: '100%', padding: '8px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 12, background: '#F8F4EC' }}>
            <option value="all">All visit types</option>
            <option value="member_guest">Member guests</option>
            <option value="public_play">Public play</option>
            <option value="tournament_guest">Tournament guests</option>
            <option value="event_guest">Event guests</option>
          </select>
          {/* v0.8.8: filter by referring member. Options are derived
              from members who've actually brought guests (no point
              listing every member). */}
          <select value={refFilter} onChange={e => setRefFilter(e.target.value)} style={{ padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 12, background: '#F8F4EC' }}>
            <option value="all">All referrers</option>
            <option value="none">No referring member (clubhouse / public)</option>
            {referringMembers.map(([id, nm]) => (
              <option key={id} value={id}>Guest of {nm}</option>
            ))}
          </select>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} title="From" style={{ padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 12, background: '#F8F4EC' }} />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} title="To" style={{ padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 12, background: '#F8F4EC' }} />
          <div onClick={exportCsv} data-tap style={{ padding: '6px 14px', background: G.green, borderRadius: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>Export CSV</span>
          </div>
          {/* v0.8.8: separate "Visit history" export — one row per
              visit so repeat-guest patterns are visible. Hits the DB
              fresh on click so it doesn't get capped at the 500-row
              guest list limit. */}
          <div onClick={exportVisitHistoryCsv} data-tap style={{ padding: '6px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, fontWeight: 500 }}>Export visit history</span>
          </div>
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '8px 0 0' }}>
          {loading ? 'Loading…' : `${filtered.length} of ${rows.length} guest${rows.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {!loading && filtered.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: 16, textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
            {rows.length === 0 ? 'No guests have registered yet.' : 'No guests match those filters.'}
          </p>
        </div>
      )}

      {filtered.map(r => {
        const isOpen = expanded === r.id;
        const statusColor = r.status === 'active' ? G.openBg : r.status === 'pending' ? G.brass : G.clsBg;
        return (
          <div key={r.id} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 6, overflow: 'hidden' }}>
            <div onClick={() => setExpanded(isOpen ? null : r.id)} data-tap style={{ padding: '10px 12px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, fontWeight: 500, color: G.text, margin: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: statusColor, padding: '2px 7px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, flexShrink: 0 }}>{r.status}</span>
              </div>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.email} · {r.visit_type.replace(/_/g, ' ')} · {r.visit_date}
                {r.members?.name && <> · guest of {r.members.name}</>}
              </p>
            </div>
            {isOpen && (
              <div style={{ borderTop: `1px solid ${G.border}`, padding: '10px 14px', background: G.bg }}>
                <Row k="Email"            v={r.email} />
                <Row k="Phone"            v={r.phone || '—'} />
                <Row k="ZIP"              v={r.zip || '—'} />
                <Row k="Visit type"       v={r.visit_type.replace(/_/g, ' ')} />
                <Row k="Visit date"       v={r.visit_date} />
                <Row k="Access level"     v={r.access_level.replace(/_/g, ' ')} />
                <Row k="Status"           v={r.status} />
                <Row k="Expires"          v={r.expires_at ? new Date(r.expires_at).toLocaleString() : 'Indefinite'} />
                <Row k="Registered at"    v={new Date(r.created_at).toLocaleString()} />
                <Row k="Referring member" v={r.members?.name || '—'} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', borderBottom: `1px solid ${G.border}`, gap: 12 }}>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, flexShrink: 0 }}>{k}</span>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, textAlign: 'right', maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
    </div>
  );
}

export function PlatformSettingsAdmin() { return <ComingSoonSection title="Platform Settings" desc="The Grounds branding, billing, support contact, default templates for new clubs." />; }
export function PlatformMetricsAdmin()  { return <ComingSoonSection title="Cross-Club Metrics" desc="Aggregate stats — active members, content updates, revenue, support tickets — across every club." />; }

// ============================================================
// ProvisionLogAdmin — Phase 7 (v0.7.7). Super_admin read-only view
// of every Cloudflare Pages Custom Domain provision attempt
// (success and failure) the provision-club-domain Edge Function
// has made. Sorted newest-first. Tap a row to expand the raw CF
// API response for debugging.
//
// Use cases:
//   · "Did Oakgrove's DNS auto-provision succeed?" → see the row
//     with ok=true, hostname=oakgrove.groundslive.com
//   · "Why did the new club's subdomain fail?" → see error msg
//     + status code + raw CF response
//   · "How many retries did the manager do?" → multiple rows
//     for the same slug, ordered by attempted_at
// ============================================================
export function ProvisionLogAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filterFailed, setFilterFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Join clubs for the display name when available. club_id is
      // nullable so this is a LEFT join via PostgREST embedded
      // syntax — failed-before-create attempts still render.
      const q = supabase
        .from('club_provision_log')
        .select('id, slug, attempted_at, attempted_by, ok, hostname, already_existed, status_code, error, cf_response, club_id, clubs(name, slug)')
        .order('attempted_at', { ascending: false })
        .limit(200);
      const { data } = filterFailed ? await q.eq('ok', false) : await q;
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    };
    setLoading(true);
    load();

    // Realtime — a fresh provision attempt during this session
    // appears without a refresh. Server-side log writes go through
    // the service role so they bypass RLS, but the realtime stream
    // still enforces RLS on delivery (super_admin SELECT policy).
    const channel = supabase
      .channel('provision_log')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_provision_log' }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [filterFailed]);

  const okCount   = rows.filter(r => r.ok).length;
  const failCount = rows.filter(r => !r.ok).length;

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
        Audit log of every Cloudflare Pages Custom Domain provision attempt. Written server-side by the provision-club-domain Edge Function — immutable. Tap any row to see the raw Cloudflare API response.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, flex: 1 }}>
          {loading ? '…' : `${rows.length} attempt${rows.length === 1 ? '' : 's'} · ${okCount} ok · ${failCount} failed`}
        </span>
        <div onClick={() => setFilterFailed(v => !v)} data-tap style={{ padding: '6px 12px', borderRadius: 3, background: filterFailed ? G.clsBg : G.card, border: `1px solid ${filterFailed ? G.clsBg : G.border}`, cursor: 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: filterFailed ? '#F2E5C0' : G.muted }}>
            {filterFailed ? '✓ Failures only' : 'Show failures only'}
          </span>
        </div>
      </div>

      {loading && (
        <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center', margin: 0 }}>Loading provision log…</p>
      )}

      {!loading && rows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '20px 16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
            {filterFailed ? 'No failed provisions — system is healthy.' : 'No provision attempts logged yet. The next club onboarding will populate this.'}
          </p>
        </div>
      )}

      {!loading && rows.map(r => {
        const isOpen = expanded === r.id;
        const badgeColor = r.ok ? G.openBg : G.clsBg;
        const badgeLabel = r.ok ? (r.already_existed ? 'EXISTED' : 'OK') : 'FAILED';
        const clubLabel = r.clubs?.name || (r.club_id ? '(deleted club)' : '(no club)');
        return (
          <div key={r.id} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 8, overflow: 'hidden' }}>
            <div onClick={() => setExpanded(isOpen ? null : r.id)} data-tap style={{ padding: '11px 14px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: badgeColor, padding: '2px 7px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{badgeLabel}</span>
                {r.status_code != null && (
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: G.muted }}>HTTP {r.status_code}</span>
                )}
                <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, marginLeft: 'auto' }}>
                  {new Date(r.attempted_at).toLocaleString()}
                </span>
              </div>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 2px' }}>
                {r.hostname || `${r.slug}.groundslive.com`}
              </p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, lineHeight: 1.4 }}>
                {clubLabel}
                {r.error && <> · <span style={{ color: G.clsDot }}>{r.error.slice(0, 80)}{r.error.length > 80 ? '…' : ''}</span></>}
              </p>
            </div>
            {isOpen && (
              <div style={{ borderTop: `1px solid ${G.border}`, padding: '10px 14px', background: G.bg }}>
                <DetailRow label="Slug"        value={r.slug} />
                <DetailRow label="Attempted"   value={new Date(r.attempted_at).toLocaleString()} />
                <DetailRow label="By user id"  value={r.attempted_by || '(unknown)'} />
                <DetailRow label="Club id"     value={r.club_id || '(none)'} />
                <DetailRow label="Outcome"     value={r.ok ? (r.already_existed ? 'Success (domain already existed)' : 'Success (new)') : 'Failed'} />
                {r.status_code != null && <DetailRow label="HTTP status" value={String(r.status_code)} />}
                {r.error && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 700 }}>Error</p>
                    <p style={{ fontFamily: 'monospace', fontSize: 11, color: G.clsDot, margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{r.error}</p>
                  </div>
                )}
                {r.cf_response && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 700 }}>Cloudflare response</p>
                    <pre style={{ fontFamily: 'monospace', fontSize: 10, color: G.text, margin: 0, lineHeight: 1.45, background: G.card, padding: 10, borderRadius: 3, border: `1px solid ${G.border}`, overflow: 'auto', maxHeight: 240, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(r.cf_response, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', borderBottom: `1px solid ${G.border}`, gap: 12 }}>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: G.text, textAlign: 'right', maxWidth: '65%', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

// ============================================================
// lesson_requests / pro_shop_inquiries — queue
// v0.9.5: split into two flavors via `mode` prop so the
// Communications area can route lessons + general inquiries
// into separate sub-queues:
//   mode='lessons'   → kind = 'lesson'        (rendered as "Lesson Requests")
//   mode='inquiries' → kind != 'lesson'       (rendered as "Pro Shop Inquiries")
//   mode='all'       → no filter (back-compat default)
// Also adds a "Reply via clubhouse" button per row that opens
// (or creates) a clubhouse thread tied to the inquiry so staff
// can respond without copy-pasting an email.
// ============================================================
export function LessonRequestsAdmin({ mode = 'all' } = {}) {
  const { club, member, session, hasPerm } = useAuth();
  const { push } = useNav();
  const canEdit = hasPerm('can_manage_lessons');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyReply, setBusyReply] = useState(null);
  const [replyErr, setReplyErr] = useState(null);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    const load = async () => {
      let q = supabase
        .from('pro_shop_inquiries')
        .select('id, kind, pro, preferred_date, preferred_time, skill_level, focus_areas, notes, status, created_at, member_id, members(name, membership_number, email, user_id)')
        .eq('club_id', club.id)
        .order('created_at', { ascending: false });
      if (mode === 'lessons')   q = q.eq('kind', 'lesson');
      if (mode === 'inquiries') q = q.neq('kind', 'lesson');
      const { data } = await q;
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel(`pro_shop_inquiries_admin:${club.id}:${mode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pro_shop_inquiries', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id, mode]);

  const setStatus = async (id, status) => {
    await supabase.from('pro_shop_inquiries').update({ status }).eq('id', id);
  };

  // Open or create a clubhouse thread with the requesting member.
  // Subject ties back to the inquiry so the front office can pair
  // the reply with the source request.
  const replyViaClubhouse = async (r) => {
    if (!session?.user?.id || !club || busyReply) return;
    if (!r.members?.user_id) {
      setReplyErr('This member has no linked account — reach out via email or phone instead.');
      return;
    }
    setBusyReply(r.id); setReplyErr(null);
    try {
      const subjectKind = (r.kind === 'lesson') ? 'Lesson Request' : 'Pro Shop Inquiry';
      const subject = `${subjectKind}: ${r.members?.name || 'Member'}`;
      const { data: thread, error: tErr } = await supabase
        .from('threads')
        .insert({ club_id: club.id, kind: 'clubhouse', subject, created_by: session.user.id })
        .select()
        .single();
      if (tErr) throw tErr;
      // Both staff (current user) AND the requesting member need to
      // be participants so the member sees the reply in their Inbox.
      const { error: pErr } = await supabase
        .from('thread_participants')
        .insert([
          { thread_id: thread.id, user_id: session.user.id,    member_id: member?.id || null,   role: 'staff'  },
          { thread_id: thread.id, user_id: r.members.user_id,  member_id: r.member_id || null,  role: 'member' },
        ]);
      if (pErr) throw pErr;
      push('thread', { threadId: thread.id });
    } catch (e) {
      setReplyErr(e?.message?.includes('row-level security')
        ? "You don't have permission to open this thread."
        : (e?.message || 'Could not open the reply thread.'));
    } finally {
      setBusyReply(null);
    }
  };

  const STATUS_COLORS = { pending: G.brass, contacted: G.limBg, scheduled: G.openBg, done: G.muted, cancelled: G.clsBg };
  const heading = mode === 'lessons'   ? 'Lesson requests routed to your pros.'
                : mode === 'inquiries' ? 'General pro shop inquiries from members.'
                : 'Lesson requests and pro-shop inquiries.';

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
        {heading} Update status as you respond. Tap "Reply via clubhouse" to open a thread with the requester.
      </p>
      {replyErr && (
        <div onClick={() => setReplyErr(null)} data-tap style={{ background: 'rgba(224,84,84,0.10)', border: `1px solid ${G.clsDot}`, borderRadius: 4, padding: '8px 12px', marginBottom: 10, cursor: 'pointer' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, margin: 0 }}>{replyErr} <span style={{ color: G.muted }}>· tap to dismiss</span></p>
        </div>
      )}
      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
      {!loading && rows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No requests yet.</p>
        </div>
      )}
      {rows.map(r => {
        const isReplying = busyReply === r.id;
        return (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={r.status}
                onChange={e => setStatus(r.id, e.target.value)}
                disabled={!canEdit}
                style={{ padding: '5px 8px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 12, background: '#F8F4EC', opacity: canEdit ? 1 : 0.6 }}
              >
                {['pending', 'contacted', 'scheduled', 'done', 'cancelled'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {canEdit && (
                <div
                  onClick={isReplying ? undefined : () => replyViaClubhouse(r)}
                  data-tap
                  style={{ padding: '5px 12px', background: isReplying ? G.muted : G.green, borderRadius: 3, cursor: isReplying ? 'wait' : 'pointer' }}
                >
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#F2EDE0', fontWeight: 500 }}>
                    {isReplying ? 'Opening…' : 'Reply via clubhouse'}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
