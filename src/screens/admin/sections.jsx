// New Phase 1 admin sub-sections. Most use the generic CrudSection scaffold;
// the queue-style sections (food orders, event registrations, lesson
// requests) have custom UIs because they're read-mostly with state changes.
import { useEffect, useMemo, useRef, useState } from 'react';
import { G } from '../../theme.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useNav } from '../../hooks/useNav.jsx';
import { useFlag } from '../../hooks/useFlag.js';
import { supabase } from '../../lib/supabase.js';
import { useClubStatus } from '../../hooks/useClubData.jsx';
import { COMMON_TIMEZONES } from '../../lib/timezone.js';
import { listFeatures, listFeaturesByCategory, featureState, withFlagChange, withFlagLock, withAddonChange, isAddonEnabled, TIER_LABEL, TIER_DESCRIPTION, TIER_RANK } from '../../lib/features.js';
import CrudSection from './CrudSection.jsx';
import Toggle from '../../components/Toggle.jsx';
import { QRCodeCanvas } from 'qrcode.react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { SUPPORT_CATEGORIES, CATEGORY_COLORS } from '../../components/ContactSupportModal.jsx';
import { useConfirm } from '../../components/ConfirmModal.jsx';   // v0.16.8b

// ============================================================
// Simple CRUDs (use CrudSection)
// ============================================================

// v0.10.8 — drag-and-drop sort order. Replaces the v0.7.x-era
// CrudSection-driven number input with a draggable list (Lucide
// GripVertical handle on the left of each row). On drop the new
// sort_order for every affected row is computed in one pass and
// written to Supabase in a single upsert batch — no flicker, no
// race. Realtime keeps the list in sync across tabs / staff
// sessions so two managers reordering at once converge.
export function MenuCategoriesAdmin() {
  const { club, hasPerm } = useAuth();
  const canEdit = hasPerm('can_manage_menu');
  return <SortableSimpleAdmin
    club={club}
    canEdit={canEdit}
    table="menu_categories"
    title="Menu Categories"
    emptyMsg="No menu categories yet. Add Lunch, Dinner, Bar, etc."
    placeholder="Lunch, Dinner, Bar…"
    selectColumns="id, name, sort_order, is_active"
    primaryField="name"
    secondaryFn={r => r.is_active === false ? 'Inactive' : 'Active'}
    defaultRow={{ name: '', sort_order: 0, is_active: true }}
  />;
}

// ─── Sortable simple admin (v0.10.8) ────────────────────────────────────
//
// Drag-and-drop table for sort-order-driven CRUD lists where the rows
// are simple (a name + an active toggle). Currently powers
// MenuCategoriesAdmin; designed to be reused by any future surface
// where sort_order is the primary ordering and the row shape is
// "name + maybe an active flag."
//
// Why bespoke instead of extending CrudSection: dragging is a
// fundamentally different interaction model (no number input, no
// modal-driven save, click + hold instead of tap). Forking once is
// cleaner than trying to bolt drag onto a generic CRUD scaffold.
//
// Batch update strategy: on drop, walk the new array, generate
// {id, sort_order:i*10} for every row whose sort_order changed
// (the *10 leaves room to manual-insert between rows later without
// renumbering), and write all of them in one Supabase upsert. One
// round-trip = no flicker.
function SortableSimpleAdmin({ club, canEdit, table, title, emptyMsg, placeholder, selectColumns, primaryField, secondaryFn, defaultRow }) {
  const confirmAsync = useConfirm(); // v0.16.8b — shared confirm modal
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null);   // null | 'new' | <row.id>
  const [draft, setDraft] = useState(null);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from(table)
        .select(selectColumns)
        .eq('club_id', club.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (error) setErr(error.message);
      setRows(data || []);
      setLoading(false);
    })();
    const channel = supabase
      .channel(`sortable:${table}:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `club_id=eq.${club.id}` }, () => refresh())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id, table, version, selectColumns]);

  // PointerSensor with a small activation distance prevents accidental
  // drags on regular taps (matters on touch). KeyboardSensor gives
  // keyboard users access to reorder via arrow keys after focusing
  // the drag handle.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex(r => r.id === active.id);
    const newIndex = rows.findIndex(r => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(rows, oldIndex, newIndex);
    // Optimistic local update so the row visibly settles in place
    // before the DB round-trip completes. Realtime will reconcile.
    setRows(reordered);
    // Compute new sort_order — use *10 spacing so future single-row
    // inserts between two rows don't need a full renumber.
    const updates = reordered
      .map((r, i) => ({ id: r.id, sort_order: i * 10 }))
      .filter((u, i) => u.sort_order !== reordered[i].sort_order);
    if (updates.length === 0) return;
    setErr(null);
    // Build per-row update calls — Supabase upsert needs full row;
    // safer to issue targeted UPDATEs. Issue in parallel for speed.
    const results = await Promise.all(updates.map(u =>
      supabase.from(table).update({ sort_order: u.sort_order }).eq('id', u.id)
    ));
    const firstErr = results.find(r => r.error)?.error;
    if (firstErr) {
      setErr(firstErr.message);
      refresh(); // revert by reloading
    }
  };

  const startNew = () => { setErr(null); setEditing('new'); setDraft({ ...defaultRow }); };
  const startEdit = (row) => { setErr(null); setEditing(row.id); setDraft({ ...row }); };
  const cancel = () => { setEditing(null); setDraft(null); };

  const save = async () => {
    if (!draft || !(draft[primaryField] || '').trim()) return;
    setErr(null);
    if (editing === 'new') {
      const next = { ...draft, club_id: club.id };
      next[primaryField] = next[primaryField].trim();
      // Append to the bottom: next sort_order = max + 10
      const maxSort = rows.reduce((m, r) => Math.max(m, r.sort_order ?? 0), 0);
      next.sort_order = maxSort + 10;
      const { error } = await supabase.from(table).insert(next);
      if (error) { setErr(error.message); return; }
    } else {
      const next = { ...draft };
      next[primaryField] = (next[primaryField] || '').trim();
      // v0.16.9 — defense in depth: scope by id AND club_id (audit round 3 #2)
      const { error } = await supabase.from(table).update(next).eq('id', editing).eq('club_id', club.id);
      if (error) { setErr(error.message); return; }
    }
    cancel();
    refresh();
  };

  const remove = async (row) => {
    // v0.16.8b — shared confirm modal
    if (!(await confirmAsync({
      title: `Delete "${row[primaryField]}"?`,
      body: 'This may affect items in the menu using this category.',
      confirmLabel: 'Delete',
      danger: true,
    }))) return;
    setErr(null);
    // v0.16.9 — defense in depth: scope by id AND club_id
    const { error } = await supabase.from(table).delete().eq('id', row.id).eq('club_id', club.id);
    if (error) { setErr(error.message); return; }
    refresh();
  };

  if (loading) return <p style={{ fontFamily: '"Lora",serif', color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {title}
      </p>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: 0, lineHeight: 1.5 }}>
        Drag the grip handle on the left to reorder. The order saves as soon as you drop the row.
      </p>

      {err && (
        <div style={{ background: 'rgba(167,67,55,0.08)', border: `1px solid ${G.clsBg}`, borderRadius: 4, padding: '8px 12px' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsBg, margin: 0 }}>{err}</p>
        </div>
      )}

      {rows.length === 0 && !editing && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '20px 16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: 0 }}>{emptyMsg}</p>
        </div>
      )}

      {rows.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rows.map(r => (
                <SortableSimpleRow
                  key={r.id}
                  row={r}
                  primaryField={primaryField}
                  secondaryFn={secondaryFn}
                  canEdit={canEdit}
                  onEdit={() => startEdit(r)}
                  onDelete={() => remove(r)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Inline add/edit form */}
      {editing && draft && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, padding: '14px 16px' }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 10px' }}>
            {editing === 'new' ? `New ${title.slice(0, -1)}` : `Edit ${title.slice(0, -1)}`}
          </p>
          <input
            value={draft[primaryField] || ''}
            onChange={e => setDraft(d => ({ ...d, [primaryField]: e.target.value }))}
            placeholder={placeholder}
            autoFocus
            style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: `1px solid ${G.border}`, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, boxSizing: 'border-box', marginBottom: 10 }}
          />
          {('is_active' in draft) && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer', fontFamily: '"Lora",serif', fontSize: 12, color: G.text }}>
              <input
                type="checkbox"
                checked={draft.is_active !== false}
                onChange={e => setDraft(d => ({ ...d, is_active: e.target.checked }))}
              />
              Active (visible in menus)
            </label>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={cancel} type="button" data-tap style={{ background: 'transparent', border: `1px solid ${G.border}`, borderRadius: 4, padding: '7px 14px', cursor: 'pointer', fontFamily: '"Lora",serif', fontSize: 12, color: G.text }}>
              Cancel
            </button>
            <button onClick={save} type="button" data-tap disabled={!(draft[primaryField] || '').trim()} style={{ background: (draft[primaryField] || '').trim() ? G.green : G.muted, color: '#F2EDE0', border: 'none', borderRadius: 4, padding: '7px 16px', cursor: (draft[primaryField] || '').trim() ? 'pointer' : 'not-allowed', fontFamily: '"Playfair Display",serif', fontSize: 12, fontWeight: 600 }}>
              Save
            </button>
          </div>
        </div>
      )}

      {!editing && canEdit && (
        <button onClick={startNew} type="button" data-tap style={{ alignSelf: 'flex-start', background: G.green, color: '#F2EDE0', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer', fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 600 }}>
          + Add {title.slice(0, -1).toLowerCase()}
        </button>
      )}
    </div>
  );
}

function SortableSimpleRow({ row, primaryField, secondaryFn, canEdit, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.18)' : 'none',
    zIndex: isDragging ? 5 : 'auto',
  };
  const secondary = secondaryFn ? secondaryFn(row) : null;
  return (
    <div ref={setNodeRef} style={{
      ...style,
      display: 'flex', alignItems: 'center', gap: 10,
      background: G.card, border: `1px solid ${G.border}`, borderRadius: 5,
      padding: '10px 12px',
    }}>
      <span
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        title="Drag to reorder"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', color: G.muted, touchAction: 'none', padding: '2px 4px', borderRadius: 3 }}
      >
        <GripVertical size={18} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text, margin: 0 }}>
          {row[primaryField]}
        </p>
        {secondary && (
          <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '2px 0 0' }}>{secondary}</p>
        )}
      </div>
      {canEdit && (
        <>
          <button onClick={onEdit} type="button" data-tap style={{ background: 'transparent', border: `1px solid ${G.border}`, borderRadius: 3, padding: '4px 10px', cursor: 'pointer', fontFamily: '"Lora",serif', fontSize: 11, color: G.text }}>Edit</button>
          <button onClick={onDelete} type="button" data-tap style={{ background: 'transparent', border: `1px solid ${G.clsBg}`, borderRadius: 3, padding: '4px 8px', cursor: 'pointer', fontFamily: '"Lora",serif', fontSize: 11, color: G.clsBg }}>Delete</button>
        </>
      )}
    </div>
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
      defaultRow={{ sponsor_name: '', image_url: '', link_url: '', location: 'home_feed', active_from: null, active_to: null, active: true, sort_order: 0 }}
      fields={[
        { key: 'sponsor_name', label: 'Sponsor Name', type: 'text', required: true },
        { key: 'image_url', label: 'Banner Image URL', type: 'url' },
        { key: 'link_url', label: 'Click-through URL', type: 'url' },
        // v0.10.2 — two real surfaces wired up: Home news feed (after
        // the 2nd post) and the bottom of the Golf tab. Old generic
        // values like 'home'/'news' are kept for forward-compat in
        // case existing data references them, but the actual placement
        // logic looks for 'home_feed' and 'golf_tab'.
        { key: 'location', label: 'Location', type: 'select', options: ['home_feed', 'golf_tab', 'home', 'news', 'menu', 'events', 'bulletin'], required: true },
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

// NotificationsAdmin lives in ./NotificationsAdmin.jsx — re-exported below.

// ============================================================
// food_orders — queue with status transitions
// v0.9.5: defaults to "active" filter (pending + preparing +
// out_for_delivery) so the morning kitchen lead isn't wading
// through yesterday's delivered orders. Tap "Show completed"
// to see everything.
// ============================================================
export function FoodOrdersAdmin() {
  const { club, hasPerm, session } = useAuth();
  const canEdit = hasPerm('can_edit_orders');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  // v0.12.1 — Kitchen reply state. Per-order maps keyed by order id so
  // multiple cards can have open composers / pending sends without
  // clobbering each other. Replies post into the order's existing
  // auto-thread (the one the database trigger spins up on order
  // insert); the existing fn_send_push_on_message trigger then fires
  // the push notification to the member. No new schema needed.
  const [replyOpen, setReplyOpen] = useState({});      // id → bool
  const [replyText, setReplyText] = useState({});      // id → string
  const [replyBusy, setReplyBusy] = useState({});      // id → bool
  const [replyStatus, setReplyStatus] = useState({});  // id → 'sent'|'error'|'no-thread'|null

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    const load = async () => {
      // v0.10.15 — also pulls order_type + requested_pickup_time so
      // the queue row can render the Delivery/To-Go chip and the
      // pickup time without an extra round-trip.
      const { data } = await supabase
        .from('food_orders')
        .select('id, status, items, subtotal, hole, location_note, order_type, requested_pickup_time, created_at, member_id, members(name, membership_number)')
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

  // v0.10.18 — Status updater. When ANY order flips to
  // 'ready_for_pickup' we also post a message into the order's
  // auto-thread so the existing send-push function fires a push
  // notification. Both to_go and eat_in send a notification —
  // members walking off the course want to know either way.
  //
  // v0.12.7 — fixed silent push failure. The previous version set
  // `sender_user_id: thread.created_by` (the member's user_id),
  // which combined with send-push v7's "exclude sender from
  // recipients" filter to mean the canned "Your order is ready"
  // message had NEVER actually pushed since v0.10.18 — the message
  // landed in the inbox but nothing fired to the lock screen.
  // Sibling fix in send-push v8 changes order-thread recipient
  // resolution to always push to the order's member; this
  // client-side change additionally marks the row as a system
  // message (`sender_user_id: null, is_system: true`) so the
  // thread render styles it consistently with the other
  // status-flip messages ("Order placed", "Order delivered",
  // "Order cancelled", "The kitchen is preparing").
  const setStatus = async (row, status) => {
    await supabase.from('food_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', row.id);
    if (status === 'ready_for_pickup') {
      try {
        const { data: thread } = await supabase
          .from('threads')
          .select('id')
          .eq('context_table', 'food_orders')
          .eq('context_id', row.id)
          .maybeSingle();
        if (thread?.id) {
          await supabase.from('messages').insert({
            thread_id: thread.id,
            sender_user_id: null,
            body: 'Your order is ready at the clubhouse.',
            is_system: true,
          });
        }
        // If no thread is found we silently no-op — the status flip
        // still happened. Push is the secondary signal; the order
        // queue is the source of truth.
      } catch (_) { /* tolerate failure — status update is what matters */ }
    }
  };

  // v0.12.1 — Kitchen reply handler. Posts a message into the order's
  // existing auto-thread (context_table='food_orders', context_id=order.id).
  // Sender is the current staff user — the in-app inbox shows the staff
  // name + the v8 push pipeline (v0.12.7) resolves order-thread
  // recipients as "always the order's member" so the member's lock
  // screen reads "<Club> · Chef Sarah" (or "Your order update" when
  // the staff has no member row in this club).
  //
  // v0.12.7 history: until send-push v8 deployed, the reply landed in
  // the member's inbox but no push fired because the v7 flow excluded
  // the sender from recipients and `fn_order_thread_create` had only
  // added the order's MEMBER as a participant — so for the (common)
  // multi-hat case where staff auth.uid == member auth.uid, the only
  // participant got filtered out and recipient list was empty. v8
  // bypasses the participant lookup for order threads entirely.
  const sendReply = async (orderId) => {
    const text = (replyText[orderId] || '').trim();
    if (!text) return;
    setReplyBusy(p => ({ ...p, [orderId]: true }));
    setReplyStatus(p => ({ ...p, [orderId]: null }));
    try {
      const { data: thread } = await supabase
        .from('threads')
        .select('id')
        .eq('context_table', 'food_orders')
        .eq('context_id', orderId)
        .maybeSingle();
      if (!thread?.id) {
        // Defensive: if for some reason the per-order thread wasn't
        // created (legacy data, trigger disabled, etc.), surface a
        // visible no-op rather than silently dropping the message.
        setReplyStatus(p => ({ ...p, [orderId]: 'no-thread' }));
        return;
      }
      const { error } = await supabase.from('messages').insert({
        thread_id: thread.id,
        sender_user_id: session?.user?.id,
        body: text,
      });
      if (error) throw error;
      setReplyText(p => ({ ...p, [orderId]: '' }));
      setReplyOpen(p => ({ ...p, [orderId]: false }));
      setReplyStatus(p => ({ ...p, [orderId]: 'sent' }));
      // Auto-clear the "sent" pill after a few seconds so the card
      // returns to its idle state.
      setTimeout(() => {
        setReplyStatus(p => {
          if (p[orderId] !== 'sent') return p;
          const n = { ...p }; delete n[orderId]; return n;
        });
      }, 2500);
    } catch (_) {
      setReplyStatus(p => ({ ...p, [orderId]: 'error' }));
    } finally {
      setReplyBusy(p => ({ ...p, [orderId]: false }));
    }
  };

  // v0.10.18 — status options unified for the To-Go / Eat-In types.
  // Both end at the clubhouse so both use:
  //   pending → preparing → ready_for_pickup → delivered (+ cancelled)
  // Legacy 'out_for_delivery' values still render correctly if any
  // pre-v0.10.18 rows exist (cancelled never actually happens for
  // existing delivery rows post-migration since the backfill flipped
  // them to to_go), but new orders never use it.
  const STATUS_OPTIONS = ['pending', 'preparing', 'ready_for_pickup', 'delivered', 'cancelled'];
  const STATUS_COLORS = {
    pending: G.brass,
    preparing: G.limBg,
    out_for_delivery: G.openBg,    // legacy — kept so pre-v0.10.18 rows render
    ready_for_pickup: G.openBg,
    delivered: G.muted,
    cancelled: G.clsBg,
  };
  const ACTIVE_STATUSES = new Set(['pending', 'preparing', 'out_for_delivery', 'ready_for_pickup']);
  const visibleRows = showCompleted ? rows : rows.filter(r => ACTIVE_STATUSES.has(r.status));
  const hiddenCount = rows.length - visibleRows.length;

  const fmtPickupTime = (iso) => {
    if (!iso) return 'ASAP';
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } catch { return iso; }
  };

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
      {visibleRows.map(r => {
        // v0.10.18 — TO-GO / EAT-IN chips. Both types include hole
        // (kitchen timing signal) + requested time (or ASAP). Legacy
        // 'delivery' rows shouldn't exist post-migration but defensive-
        // render them as TO-GO so the queue never breaks.
        const orderType = r.order_type === 'eat_in' ? 'eat_in' : 'to_go';
        const isEatIn = orderType === 'eat_in';
        const orderTypeChip = (
          <span style={{
            fontFamily: '"Lora",serif', fontSize: 9,
            color: '#F2E5C0',
            background: isEatIn ? G.green : G.brass,
            padding: '2px 8px', borderRadius: 2,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            fontWeight: 700,
          }}>
            {`${isEatIn ? 'EAT-IN' : 'TO-GO'} · Hole ${r.hole != null ? r.hole : '—'} · ${fmtPickupTime(r.requested_pickup_time)}`}
          </span>
        );
        return (
        <div key={r.id} style={{ padding: '14px 16px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
            {/* v0.12.6 — typography pass: member name 14 → 16, #
                14 → 13, status chip stays 9 (status chips are
                intentionally compact, the eye reads them by color). */}
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: 0 }}>
              {r.members?.name || 'Unknown'} {r.members?.membership_number && <span style={{ color: G.muted, fontWeight: 400, fontSize: 13 }}>#{r.members.membership_number}</span>}
            </p>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: STATUS_COLORS[r.status] || G.muted, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{r.status?.replace(/_/g, ' ')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            {orderTypeChip}
            {r.location_note && (
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, fontStyle: 'italic', color: G.muted }}>"{r.location_note}"</span>
            )}
          </div>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '0 0 6px' }}>
            Placed {new Date(r.created_at).toLocaleString()}
          </p>
          {Array.isArray(r.items) && r.items.length > 0 && (
            <ul style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: '6px 0', paddingLeft: 20 }}>
              {r.items.map((it, i) => (
                <li key={i} style={{ margin: '2px 0' }}>{it.qty || 1}× {it.name || it.item_name || JSON.stringify(it)} {it.price ? `— $${it.price}` : ''}</li>
              ))}
            </ul>
          )}
          {r.subtotal != null && (
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: '6px 0 10px' }}>Total: ${Number(r.subtotal).toFixed(2)}</p>
          )}
          {/* v0.12.1 — Status select + Reply button on one row. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={r.status}
              onChange={e => setStatus(r, e.target.value)}
              disabled={!canEdit}
              style={{ padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 12, background: G.card, opacity: canEdit ? 1 : 0.6 }}
            >
              {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
            </select>
            {canEdit && (
              <button
                type="button"
                onClick={() => setReplyOpen(p => ({ ...p, [r.id]: !p[r.id] }))}
                style={{
                  padding: '6px 12px', border: `1px solid ${G.border}`, borderRadius: 3,
                  fontFamily: '"Lora",serif', fontSize: 12, background: replyOpen[r.id] ? G.brass : G.bg,
                  color: replyOpen[r.id] ? '#F2E5C0' : G.text, cursor: 'pointer', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                {replyOpen[r.id] ? 'Cancel' : 'Reply'}
              </button>
            )}
            {replyStatus[r.id] === 'sent' && (
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, fontStyle: 'italic', color: G.green }}>Message sent ✓</span>
            )}
            {replyStatus[r.id] === 'error' && (
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, fontStyle: 'italic', color: G.clsDot }}>Could not send — try again.</span>
            )}
            {replyStatus[r.id] === 'no-thread' && (
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, fontStyle: 'italic', color: G.clsDot }}>No reply thread for this order.</span>
            )}
          </div>
          {/* v0.12.1 — Inline reply composer. Member gets a push +
              inbox entry via the existing send-push pipeline. */}
          {replyOpen[r.id] && (
            <div style={{ marginTop: 10, padding: 10, background: G.card, border: `1px solid ${G.border}`, borderRadius: 4 }}>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 6px', fontStyle: 'italic' }}>
                Reply to {r.members?.name || 'this member'}. They'll get a push notification and see it in their inbox.
              </p>
              <textarea
                value={replyText[r.id] || ''}
                onChange={e => setReplyText(p => ({ ...p, [r.id]: e.target.value }))}
                placeholder="Type your message…"
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                  border: `1px solid ${G.border}`, borderRadius: 3,
                  fontFamily: '"Lora",serif', fontSize: 13, color: G.text,
                  background: '#FFFDF7', resize: 'vertical', minHeight: 50, lineHeight: 1.4,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => sendReply(r.id)}
                  disabled={replyBusy[r.id] || !(replyText[r.id] || '').trim()}
                  style={{
                    padding: '6px 16px', border: 'none', borderRadius: 3,
                    fontFamily: '"Lora",serif', fontSize: 12, fontWeight: 500,
                    background: ((replyText[r.id] || '').trim() && !replyBusy[r.id]) ? G.green : G.muted,
                    color: '#F2E5C0',
                    cursor: ((replyText[r.id] || '').trim() && !replyBusy[r.id]) ? 'pointer' : 'not-allowed',
                  }}
                >
                  {replyBusy[r.id] ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
        );
      })}
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
  // v0.12.0 — accordion state for flat mode. Collapsed by default;
  // click an event row to expand the registrant list inline. Kept
  // local to this component (not persisted) — Comms triage is a
  // glance-and-go view, so reset-on-mount is the right default.
  const [expanded, setExpanded] = useState({});
  const toggleExpanded = (eventId) => setExpanded(p => ({ ...p, [eventId]: !p[eventId] }));

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('event_registrations')
        .select('id, status, guests_count, notes, registered_at, member_id, event_id, members(name, membership_number), events(title, event_date, spots)')
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

  // ── Accordion grouped by event (Comms inbox mode) ────────────────
  // v0.12.0 — was a flat reverse-chronological timeline. Restructured
  // so each event is one row in a collapsed list with title,
  // event_date, registered count, and spots remaining when capacity
  // is set. Click a row to expand inline and see the registrant
  // list (status pills + status dropdown for editors). Events are
  // sorted by most-recent registration activity descending so the
  // events with new RSVPs surface at the top of the triage queue.
  if (mode === 'flat') {
    const STATUS_COLORS = { registered: G.openBg, waitlist: G.limBg, cancelled: G.clsBg };
    // Group rows (already in registered_at DESC order from the
    // query) by event_id. Order of insertion into the Map is the
    // order of first appearance — i.e. event-with-newest-activity
    // first — so we don't need an extra sort.
    const grouped = new Map();
    rows.forEach(r => {
      if (!grouped.has(r.event_id)) {
        grouped.set(r.event_id, {
          event: r.events,
          eventId: r.event_id,
          registrations: [],
          latestAt: r.registered_at,
        });
      }
      grouped.get(r.event_id).registrations.push(r);
    });
    const eventGroups = Array.from(grouped.values());

    return (
      <div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
          {rows.length} registration{rows.length === 1 ? '' : 's'} across {eventGroups.length} event{eventGroups.length === 1 ? '' : 's'}. Click an event to expand.
        </p>
        {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
        {!loading && rows.length === 0 && (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No registrations yet.</p>
          </div>
        )}
        {!loading && eventGroups.length > 0 && (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
            {eventGroups.map((g, gi) => {
              const isOpen = !!expanded[g.eventId];
              const registeredCount = g.registrations.filter(r => r.status === 'registered').reduce((s, r) => s + 1 + (r.guests_count || 0), 0);
              const waitlistCount = g.registrations.filter(r => r.status === 'waitlist').length;
              const capacity = g.event?.spots;
              const spotsRemaining = (capacity && capacity > 0) ? Math.max(0, capacity - registeredCount) : null;
              const eventDate = g.event?.event_date ? new Date(g.event.event_date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
              return (
                <div key={g.eventId} style={{ borderTop: gi === 0 ? 'none' : `1px solid ${G.border}` }}>
                  {/* ── Event header row (clickable to expand) ─── */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(g.eventId)}
                    style={{
                      display: 'flex', alignItems: 'center', width: '100%',
                      padding: '14px 16px', gap: 10, background: 'transparent',
                      border: 'none', textAlign: 'left', cursor: 'pointer',
                    }}
                  >
                    {/* v0.12.6 — typography pass: event title 14 → 16,
                        secondary 11 → 13, caret 14 → 16. */}
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 16, color: G.muted, width: 14, flexShrink: 0, lineHeight: 1, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 120ms' }}>▶</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {g.event?.title || 'Event'}
                      </p>
                      <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '3px 0 0' }}>
                        {eventDate}
                        {eventDate && ' · '}
                        {registeredCount} registered{capacity && capacity > 0 ? ` of ${capacity}` : ''}
                        {waitlistCount > 0 && ` · ${waitlistCount} waitlist`}
                      </p>
                    </div>
                    {spotsRemaining != null && (
                      <span style={{
                        fontFamily: '"Lora",serif', fontSize: 10, color: '#F2E5C0',
                        background: spotsRemaining === 0 ? G.clsBg : (spotsRemaining <= 3 ? G.limBg : G.openBg),
                        padding: '3px 8px', borderRadius: 2, textTransform: 'uppercase',
                        letterSpacing: '0.08em', fontWeight: 700, flexShrink: 0,
                      }}>
                        {spotsRemaining === 0 ? 'Full' : `${spotsRemaining} left`}
                      </span>
                    )}
                  </button>

                  {/* ── Registrant list (inline expanded) ─────── */}
                  {isOpen && (
                    <div style={{ background: G.card, borderTop: `1px solid ${G.border}` }}>
                      {g.registrations.map((r, i) => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 10px 40px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* v0.12.6 — typography pass: 13 → 14
                                primary, 11 → 12 secondary. */}
                            <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.members?.name || 'Unknown'}
                              {r.members?.membership_number && <span style={{ color: G.muted, fontWeight: 400 }}> #{r.members.membership_number}</span>}
                            </p>
                            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: '2px 0 0' }}>
                              {new Date(r.registered_at).toLocaleString()}
                              {r.guests_count ? ` · +${r.guests_count} guests` : ''}
                              {r.notes ? ` · ${r.notes}` : ''}
                            </p>
                          </div>
                          <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: STATUS_COLORS[r.status] || G.muted, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, flexShrink: 0 }}>{r.status}</span>
                          <select
                            value={r.status}
                            onChange={e => setStatus(r.id, e.target.value)}
                            disabled={!canEdit}
                            style={{ padding: '3px 6px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 11, background: '#FFFDF7', opacity: canEdit ? 1 : 0.6 }}
                          >
                            {['registered', 'waitlist', 'cancelled'].map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      ))}
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
                  style={{ padding: '4px 6px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 11, background: G.card, opacity: canEdit ? 1 : 0.6 }}
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
// ============================================================
// FacilitiesAdmin — v0.9.15. Catalog of which facilities this
// club has. Source of truth for the display name on status
// pills, hours editor, schedule overrides. Real-time updates
// push to every open member session.
//
// Spec'd behaviors:
//   · Inline-editable display_name with debounced save
//   · Active toggle (inactive = hidden from members, visible
//     to admin with a faded look + "off" tag)
//   · ↑↓ reorder buttons (sort_order swap with neighbor)
//   · "+ Add Facility" form (auto-derives facility_key via
//     slugify; collision-suffix for uniqueness)
//   · Delete only on custom (is_default=false) facilities;
//     defaults can be renamed and toggled off but never deleted
// ============================================================

function facilityKeyFromName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
    || 'facility';
}

export function FacilitiesAdmin() {
  const { club, hasPerm } = useAuth();
  const confirmAsync = useConfirm(); // v0.16.8b — shared confirm modal
  // Re-use the same permission gate Daily Status uses — anyone
  // who can flip today's status is qualified to manage the
  // catalog of facility names.
  const canEdit = hasPerm('can_edit_course_status');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('club_facilities')
        .select('id, facility_key, display_name, default_name, is_default, active, sort_order')
        .eq('club_id', club.id)
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    })();
    const channel = supabase
      .channel(`club_facilities_admin:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_facilities', filter: `club_id=eq.${club.id}` }, () => setVersion(v => v + 1))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id, version]);

  const updateRow = async (id, patch) => {
    setBusyId(id); setErr(null);
    const { error } = await supabase.from('club_facilities').update(patch).eq('id', id);
    setBusyId(null);
    if (error) setErr(error.message);
  };

  const move = async (row, direction) => {
    if (!canEdit) return;
    const idx = rows.findIndex(r => r.id === row.id);
    const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= rows.length) return;
    const neighbor = rows[neighborIdx];
    await Promise.all([
      supabase.from('club_facilities').update({ sort_order: neighbor.sort_order }).eq('id', row.id),
      supabase.from('club_facilities').update({ sort_order: row.sort_order }).eq('id', neighbor.id),
    ]);
  };

  const remove = async (row) => {
    if (row.is_default) return; // belt-and-suspenders; UI also hides the button
    // v0.16.8b — shared confirm modal
    if (!(await confirmAsync({
      title: `Delete "${row.display_name}"?`,
      body: 'Members will stop seeing this facility immediately.',
      confirmLabel: 'Delete',
      danger: true,
    }))) return;
    setBusyId(row.id); setErr(null);
    const { error } = await supabase.from('club_facilities').delete().eq('id', row.id);
    setBusyId(null);
    if (error) setErr(error.message);
  };

  const addFacility = async () => {
    if (!canEdit || !club) return;
    const trimmed = newName.trim();
    if (!trimmed) { setErr('Name is required.'); return; }
    // Slug + uniqueness collision suffix (matches the Member Guide pattern)
    const existingKeys = new Set(rows.map(r => r.facility_key));
    let key = facilityKeyFromName(trimmed);
    if (existingKeys.has(key)) {
      for (let i = 2; i < 100; i++) {
        const candidate = `${key}_${i}`;
        if (!existingKeys.has(candidate)) { key = candidate; break; }
      }
    }
    const nextSort = (rows[rows.length - 1]?.sort_order ?? 0) + 1;
    setBusyId('new'); setErr(null);
    const { error } = await supabase.from('club_facilities').insert({
      club_id: club.id,
      facility_key: key,
      display_name: trimmed,
      default_name: trimmed,
      is_default: false,
      active: true,
      sort_order: nextSort,
    });
    setBusyId(null);
    if (error) { setErr(error.message); return; }
    setNewName('');
    setAdding(false);
  };

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
        What facilities does {club?.name || 'this club'} have? Renaming a facility here updates every status pill, hours editor, and member screen instantly. Inactive facilities stay in the catalog but disappear from member view.
      </p>

      {err && (
        <div onClick={() => setErr(null)} data-tap style={{ background: 'rgba(224,84,84,0.10)', border: `1px solid ${G.clsDot}`, borderRadius: 4, padding: '8px 12px', marginBottom: 10, cursor: 'pointer' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, margin: 0 }}>{err} <span style={{ color: G.muted }}>· tap to dismiss</span></p>
        </div>
      )}

      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
      {!loading && rows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No facilities yet — add one below to start your status dashboard.</p>
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {rows.map((row, i) => (
            <div key={row.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 10px 10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 8, opacity: row.active ? 1 : 0.55 }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  value={row.display_name}
                  disabled={!canEdit || busyId === row.id}
                  onChange={e => setRows(prev => prev.map(r => r.id === row.id ? { ...r, display_name: e.target.value } : r))}
                  onBlur={e => {
                    const v = e.target.value.trim();
                    if (!v) {
                      // Revert to default_name if cleared
                      setRows(prev => prev.map(r => r.id === row.id ? { ...r, display_name: row.default_name } : r));
                      updateRow(row.id, { display_name: row.default_name });
                    } else if (v !== row.display_name) {
                      updateRow(row.id, { display_name: v });
                    }
                  }}
                  style={{ flex: 1, padding: '6px 8px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none', minWidth: 0 }}
                />
                {!row.active && <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.clsDot, background: 'rgba(107,32,32,0.12)', padding: '2px 6px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, flexShrink: 0 }}>OFF</span>}
                {!row.is_default && <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.brass, background: 'rgba(155,122,30,0.10)', padding: '2px 6px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, flexShrink: 0 }}>CUSTOM</span>}
              </div>
              {canEdit && (
                <>
                  <Toggle checked={row.active} onChange={(next) => updateRow(row.id, { active: next })} ariaLabel={`Toggle ${row.display_name} active`} />
                  <button onClick={() => move(row, 'up')} disabled={i === 0} style={{ width: 26, height: 26, padding: 0, background: 'transparent', border: 'none', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.25 : 1 }} aria-label="Move up">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G.text} strokeWidth="2"><path d="M18 15l-6-6-6 6" /></svg>
                  </button>
                  <button onClick={() => move(row, 'down')} disabled={i === rows.length - 1} style={{ width: 26, height: 26, padding: 0, background: 'transparent', border: 'none', cursor: i === rows.length - 1 ? 'default' : 'pointer', opacity: i === rows.length - 1 ? 0.25 : 1 }} aria-label="Move down">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G.text} strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  {!row.is_default && (
                    <button onClick={() => remove(row)} style={{ padding: '4px 6px', background: 'transparent', border: 'none', cursor: 'pointer' }} aria-label={`Delete ${row.display_name}`}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={G.clsDot} strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></svg>
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Facility form */}
      {canEdit && !adding && (
        <div onClick={() => setAdding(true)} data-tap style={{ marginTop: 12, padding: '10px 14px', background: G.bg, border: `1px dashed ${G.border}`, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.brass, fontWeight: 500 }}>Add facility (Pickleball, Tennis, Locker Room…)</span>
        </div>
      )}
      {adding && (
        <div style={{ marginTop: 12, padding: '12px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4 }}>
          <label style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>New facility name</label>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Pickleball, Tennis, Locker Room…"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && addFacility()}
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <div onClick={busyId === 'new' ? undefined : addFacility} data-tap style={{ flex: 1, padding: 10, background: busyId === 'new' ? G.muted : G.green, borderRadius: 3, textAlign: 'center', cursor: busyId === 'new' ? 'wait' : 'pointer' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>{busyId === 'new' ? 'Adding…' : 'Add'}</span>
            </div>
            <div onClick={() => { setAdding(false); setNewName(''); setErr(null); }} data-tap style={{ flex: 1, padding: 10, background: G.bg, border: `1px solid ${G.border}`, borderRadius: 3, textAlign: 'center', cursor: 'pointer' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>Cancel</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
    } else if (target === 'addon') {
      // v0.10.2 — super_admin enabling/disabling a paid add-on.
      // Writes clubs.addons (jsonb) per migration 57.
      payload.addons = withAddonChange(club.addons, flagKey, value);
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

  // v0.10.2 — toggle the addon enabled state from the super_admin
  // platform UI. Writes clubs.addons.<key> = true | (deleted).
  const toggleAddon = async (flagKey, currentlyEnabled) => {
    await writeFlag(flagKey, !currentlyEnabled, 'addon');
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
                onAddonToggle={() => toggleAddon(flag.key, isAddonEnabled(club, flag.key))}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureRow({ flag, club, mode, busy, isFirst, onToggle, onLockToggle, onAddonToggle }) {
  const st = featureState(club, flag.key);
  const isPlatform = mode === 'platform';
  const tierLocked     = st.reason === 'tier-locked';
  const platformLocked = st.reason === 'platform-locked';
  const isAddon        = !!flag.addon;
  const addonEnabled   = isAddon ? isAddonEnabled(club, flag.key) : false;
  const addonGated     = isAddon && !addonEnabled;

  // Manager mode: platform lock OR addon-not-enabled disables the toggle.
  // Platform mode: SA can flip the locked value AND enable/disable the
  // addon, so the toggle stays interactive when the addon is on.
  const toggleDisabled = busy || tierLocked
    || (platformLocked && !isPlatform)
    || (addonGated && !isPlatform);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderTop: isFirst ? 'none' : `1px solid ${G.border}`, opacity: tierLocked ? 0.55 : 1 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0 }}>{flag.label}</p>
          {/* v0.10.2 — gold ADD-ON pill on every addon row so it's
              visually distinct from baseline features. */}
          {isAddon && (
            <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: G.brass, padding: '1px 7px', borderRadius: 10, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>Add-On</span>
          )}
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
        {/* Manager-mode addon copy when not purchased — explains why
            the toggle is disabled and what to do about it. Platform
            mode shows the same surface but with the Enable affordance
            below (so super_admin doesn't see this duplicate). */}
        {addonGated && !isPlatform && (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10, color: G.brass, margin: '4px 0 0' }}>
            {flag.addon_blurb || 'Add-On — Contact The Grounds to enable for your club.'}
          </p>
        )}
        {/* Platform-mode addon enable/disable affordance. Distinct
            from the regular lock affordance — this is the "has the
            club paid for it" gate, while the lock pins the value
            once enabled. */}
        {isPlatform && isAddon && !tierLocked && (
          <div style={{ marginTop: 6 }}>
            <span
              onClick={busy ? undefined : onAddonToggle}
              data-tap
              style={{ fontFamily: '"Lora",serif', fontSize: 10, color: addonEnabled ? G.clsDot : G.brass, cursor: busy ? 'wait' : 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, fontWeight: 600 }}
            >
              {addonEnabled ? '✕ Disable add-on for this club' : '★ Enable add-on for this club'}
            </span>
          </div>
        )}
        {/* Platform-mode lock affordance — small inline link below
            the description. Keeps the row visually quiet for managers,
            who never see this. Addon rows show the lock only AFTER
            the addon is enabled (no point pinning something that's
            already gated off). */}
        {isPlatform && !tierLocked && (!isAddon || addonEnabled) && (
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
    trophy_case_name: '',
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
      trophy_case_name:  club.trophy_case_name  || '',
    });
  }, [club?.id, club?.tagline, club?.contact_email, club?.contact_phone, club?.address,
      club?.city, club?.state, club?.founded, club?.par, club?.yardage, club?.holes,
      club?.lat, club?.lng, club?.timezone,
      club?.primary_color, club?.secondary_color, club?.accent_color,
      club?.logo_url, club?.hero_image_url, club?.subscription_tier,
      club?.feature_flags, club?.pending_member_access, club?.trophy_case_name]);

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
      trophy_case_name:  form.trophy_case_name.trim() || null,
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
  const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' };

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

      {/* v0.10.14 — Club Manager Support entry. Manager mode only
          (super_admin platform editing doesn't need this — they
          ARE The Grounds). Separate inbox from general member
          support so escalations from clubs jump the line. mailto:
          subject is prefixed with the club name so routing is
          instant. */}
      {!isPlatform && (
        <a
          href={`mailto:managers@groundslive.com?subject=${encodeURIComponent(`Manager Support — ${club?.name || 'Club'}`)}&body=${encodeURIComponent(`\n\n— — — — —\nApp version: v${(typeof window !== 'undefined' && window.__APP_VERSION__) || ''}\nClub: ${club?.name || ''}\n(Replace this header with your question — the manager support team will see it.)`)}`}
          style={{ display: 'block', textDecoration: 'none', marginBottom: 18 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: G.green, borderRadius: 4, border: `1px solid ${G.brass}`, cursor: 'pointer' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(155,122,30,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${G.brass}` }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2E5C0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 22l2-7L2 11h7z" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>Priority</p>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: '#F2EDE0', margin: '1px 0 0' }}>Club Manager Support</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: '#A8D8B8', margin: '2px 0 0', lineHeight: 1.4 }}>
                Direct line to The Grounds platform team — separate from the member queue
              </p>
            </div>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#F2E5C0', flexShrink: 0 }}>managers@groundslive.com</span>
          </div>
        </a>
      )}

      <SectionHeading>Brand Identity</SectionHeading>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Tagline (shown on sign-in screen)</label>
        <input value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Country club golf since 1921" style={inputStyle} />
      </div>
      {/* v0.10.1 — Trophy Case rename. Some clubs prefer "Hall of
          Honors" or "Wall of Champions" etc.; this lets them swap
          the label everywhere it appears (Community tab card, screen
          header, breadcrumbs). Empty input falls back to the default
          "Trophy Case" string. */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Trophy Case display name (optional)</label>
        <input
          value={form.trophy_case_name}
          onChange={e => set('trophy_case_name', e.target.value)}
          placeholder="Trophy Case"
          style={inputStyle}
        />
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10, color: G.muted, margin: '4px 0 0' }}>
          Used wherever the Trophy Case section appears (Community tab, screen header). Leave blank to use "Trophy Case".
        </p>
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
        style={{ width: 48, height: 36, border: `1px solid ${G.border}`, borderRadius: 3, padding: 2, background: G.card, cursor: 'pointer', flexShrink: 0 }}
      />
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 2px' }}>{label}</p>
        <input
          value={value}
          onChange={e => onChange(e.target.value.toUpperCase())}
          placeholder="#1B3A2D"
          style={{ width: '100%', padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: 'monospace', fontSize: 12, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
    </div>
  );
}

// NewsAdminFull lives in ./NewsAdmin.jsx — re-exported below.

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
        // v0.11.35 — format price for display: numbers always show as
        // "$X.YY"; legacy non-numeric values (e.g. "Market") render
        // raw so old rows aren't broken until the manager edits them.
        const priceText = (() => {
          if (r.price == null || r.price === '') return null;
          const n = parseFloat(String(r.price).replace(/[^0-9.\-]/g, ''));
          return Number.isFinite(n) ? `$${n.toFixed(2)}` : String(r.price);
        })();
        return [cat?.name || r.category, priceText, r.is_special && 'Special', r.available_today === false && 'Hidden'].filter(Boolean).join(' · ');
      }}
      defaultRow={{ category_id: catOptions[0]?.value || null, item_name: '', description: '', price: null, tag: '', is_special: false, available_today: true, sort_order: 0 }}
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
        // v0.11.35 — switched from free-form text to the strict
        // money type. Input only accepts digits + one decimal point
        // (HTML type="number" blocks $/letters at the browser level);
        // blurs to 2 decimals ("12" → "12.00"); stores as a 2-decimal
        // string ("12.50") so display formatting downstream is
        // predictable. Legacy values like "Market" render raw until
        // edited; once edited they become numeric like everything else.
        { key: 'price',           label: 'Price', type: 'money', placeholder: '0.00' },
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
// ============================================================
// EventsAdmin — v0.9.12 custom component (was a generic
// CrudSection). Handles three things the old version couldn't:
//   · Time picker (start + optional end) replacing the free-text
//     event_time field. Legacy text stays for display fallback on
//     pre-Migration-52 rows.
//   · Recurring events — manager picks a recurrence rule + an end
//     date, and the app materializes N concrete event rows sharing
//     a recurrence_group_id. Hard cap at min(1 year out, 52 rows).
//   · Series-aware edit + delete — when the user opens an event in
//     a series, a radio at the top of the editor lets them apply
//     the change to just that one occurrence OR to that one + all
//     future occurrences in the series.
// Admin list groups events by recurrence_group_id into collapsible
// series headers so a Thursday Cookout × 26 doesn't drown the list.
// ============================================================
const EVENT_CATEGORIES = ['Golf', 'Social', 'Dining'];
const RECURRENCE_OPTIONS = [
  { value: 'none',           label: 'Does not repeat' },
  { value: 'weekly',         label: 'Weekly (or every N weeks) on a weekday' },
  { value: 'monthly_first',  label: 'Monthly · first of the month' },
  { value: 'monthly_last',   label: 'Monthly · last of the month' },
  { value: 'monthly_nth',    label: 'Monthly · Nth weekday' },
];
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_NAMES_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_OCCURRENCES = 52;
const MAX_RECUR_DAYS = 365;
// v0.12.3 — interval cap for the weekly rule. 12 weeks (~quarterly) is
// the largest interval any real club calendar will need; capping it
// keeps the picker tidy and prevents accidental "every 52 weeks" rows.
const MAX_WEEKLY_INTERVAL = 12;

// Helpers used by the materializer and the preview-count line.
function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseIsoLocal(iso) {
  // Construct as local noon to dodge tz edge cases when we only
  // care about the date (not the time-of-day).
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}
function firstWeekdayOf(year, month, dow) {
  const d = new Date(year, month, 1, 12, 0, 0);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
  return d;
}
function lastWeekdayOf(year, month, dow) {
  const d = new Date(year, month + 1, 0, 12, 0, 0); // last day of month
  while (d.getDay() !== dow) d.setDate(d.getDate() - 1);
  return d;
}
function nthWeekdayOf(year, month, dow, n) {
  const first = firstWeekdayOf(year, month, dow);
  const d = new Date(first);
  d.setDate(d.getDate() + 7 * (n - 1));
  if (d.getMonth() !== month) return null; // overflow into next month
  return d;
}

// Given a rule + start date + end-by date, return ISO date strings
// for every occurrence. Capped at MAX_OCCURRENCES.
//
// v0.12.3 — adds `weeklyInterval` for the weekly rule: 1 = every
// week (back-compat), 2 = biweekly, 3 = every 3 weeks, etc. Old
// callers that omit the param fall through to the default of 1,
// so existing recurrence_group_id rows + the materialized calendar
// don't move underneath us.
function generateOccurrences({ rule, startIso, endIso, weeklyDow, weeklyInterval, nth }) {
  if (rule === 'none' || !startIso) return [startIso].filter(Boolean);
  const start = parseIsoLocal(startIso);
  const end = endIso ? parseIsoLocal(endIso) : null;
  const hardCap = MAX_OCCURRENCES;
  const out = [];

  if (rule === 'weekly') {
    const interval = Math.max(1, Math.min(MAX_WEEKLY_INTERVAL, Number(weeklyInterval) || 1));
    // First occurrence: the soonest weeklyDow on/after startDate
    const cursor = new Date(start);
    while (cursor.getDay() !== weeklyDow) cursor.setDate(cursor.getDate() + 1);
    while (out.length < hardCap) {
      if (end && cursor > end) break;
      out.push(toIso(cursor));
      cursor.setDate(cursor.getDate() + 7 * interval);
    }
    return out;
  }

  if (rule === 'monthly_first' || rule === 'monthly_last' || rule === 'monthly_nth') {
    const dow = weeklyDow;
    let year = start.getFullYear();
    let month = start.getMonth();
    while (out.length < hardCap) {
      let candidate;
      if (rule === 'monthly_first')  candidate = firstWeekdayOf(year, month, dow);
      else if (rule === 'monthly_last') candidate = lastWeekdayOf(year, month, dow);
      else                              candidate = nthWeekdayOf(year, month, dow, nth);
      if (candidate && candidate >= start && (!end || candidate <= end)) {
        out.push(toIso(candidate));
      }
      // Advance one month
      month += 1;
      if (month > 11) { month = 0; year += 1; }
      if (end && new Date(year, month, 1) > end) break;
    }
    return out;
  }

  return [startIso];
}

// Friendly summary for the series-header line in the admin list.
function recurrenceSummary(rows) {
  if (!rows || rows.length === 0) return '';
  const first = rows[0]?.event_date;
  const last = rows[rows.length - 1]?.event_date;
  if (!first || !last) return `${rows.length} occurrences`;
  const f = new Date(first + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const l = new Date(last  + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${rows.length} occurrences · ${f} → ${l}`;
}

// Auto-derive the denormalized display fields from event_date.
function denormalize(form) {
  if (!form.event_date) return form;
  const d = new Date(form.event_date + 'T12:00:00');
  return {
    ...form,
    dow: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    day_num: d.getDate().toString(),
    date_label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
  };
}

export function EventsAdmin() {
  const { club, hasPerm } = useAuth();
  const canEdit = hasPerm('can_manage_events');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // row | 'new' | null
  const [version, setVersion] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('events')
        .select('id, club_id, title, description, category, event_date, event_time, event_time_start, event_time_end, date_label, dow, day_num, spots, price, recurrence_group_id')
        .eq('club_id', club.id)
        .order('event_date', { ascending: true })
        .limit(500);
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    })();
    const channel = supabase
      .channel(`events_admin:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `club_id=eq.${club.id}` }, () => setVersion(v => v + 1))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id, version]);

  // Group rows by recurrence_group_id; standalones stay as themselves.
  // Render order: groups first (sorted by their earliest event_date),
  // standalones interleaved by event_date. Simpler approach for v1:
  // groups together at top, standalones at bottom. Manager will scan
  // either way.
  const { groups, standalones } = useMemo(() => {
    const g = new Map();
    const s = [];
    for (const r of rows) {
      if (r.recurrence_group_id) {
        const arr = g.get(r.recurrence_group_id) || [];
        arr.push(r);
        g.set(r.recurrence_group_id, arr);
      } else {
        s.push(r);
      }
    }
    return { groups: Array.from(g.entries()), standalones: s };
  }, [rows]);

  const toggleGroup = (gid) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(gid)) next.delete(gid); else next.add(gid);
      return next;
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0, flex: 1 }}>
          {rows.length} event{rows.length === 1 ? '' : 's'} ({standalones.length} standalone, {groups.length} series)
          {!canEdit && ' · view only'}
        </p>
        {canEdit && (
          <div onClick={() => setEditing('new')} data-tap style={{ padding: '8px 14px', background: G.green, borderRadius: 3, cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>+ Add event</span>
          </div>
        )}
      </div>

      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
      {!loading && rows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No events scheduled yet.</p>
        </div>
      )}

      {/* Recurring-series headers (collapsible) */}
      {groups.map(([gid, groupRows]) => {
        const sorted = [...groupRows].sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''));
        const expanded = expandedGroups.has(gid);
        return (
          <div key={gid} style={{ marginBottom: 10, background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
            {/* v0.12.6 — typography pass: series title 13 → 15,
                secondary 11 → 13, occurrence row 12 → 14. */}
            <div onClick={() => toggleGroup(gid)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', cursor: 'pointer', gap: 10 }}>
              <span style={{ fontSize: 16 }} aria-hidden>🔁</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 15, color: G.text, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sorted[0]?.title || '(untitled series)'}
                </p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '2px 0 0' }}>
                  {recurrenceSummary(sorted)}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}><path d="M6 9l6 6 6-6" /></svg>
            </div>
            {expanded && (
              <div style={{ borderTop: `1px solid ${G.border}` }}>
                {sorted.map(r => (
                  <div key={r.id} onClick={() => setEditing(r)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 10px 40px', borderTop: `1px solid ${G.border}`, cursor: 'pointer', gap: 10, background: G.bg }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: 0 }}>
                        {r.date_label || (r.event_date ? new Date(r.event_date + 'T12:00:00').toLocaleDateString() : '')}
                        {' · '}
                        {formatEventTimeShort(r)}
                      </p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Standalone (non-recurring) events */}
      {standalones.length > 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {standalones.map((r, i) => (
            // v0.12.6 — typography pass: title 13 → 15, secondary
            // 11 → 13, chevron 14 → 16.
            <div key={r.id} onClick={() => setEditing(r)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, cursor: 'pointer', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 15, color: G.text, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title || '(untitled)'}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '2px 0 0' }}>
                  {[r.category, r.event_date && new Date(r.event_date + 'T12:00:00').toLocaleDateString(), formatEventTimeShort(r), r.spots != null && `${r.spots} spots`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EventEditor
          club={club}
          canEdit={canEdit}
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setVersion(v => v + 1)}
        />
      )}
    </div>
  );
}

// Local mirror of the public format helper in useClubData. Kept in
// sections.jsx to avoid the round-trip import; same logic.
function formatEventTimeShort(r) {
  if (r.event_time_start) {
    const fmt = (t) => {
      if (!t) return '';
      const m = /^(\d{1,2}):(\d{2})/.exec(t);
      if (!m) return t;
      const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
      const period = h >= 12 ? 'pm' : 'am';
      const h12 = ((h + 11) % 12) + 1;
      return min === 0 ? `${h12}${period}` : `${h12}:${String(min).padStart(2, '0')}${period}`;
    };
    const s = fmt(r.event_time_start);
    return r.event_time_end ? `${s} – ${fmt(r.event_time_end)}` : s;
  }
  return r.event_time || '';
}

function EventEditor({ club, canEdit, row, onClose, onSaved }) {
  const confirmAsync = useConfirm(); // v0.16.8b — shared confirm modal
  const isAdd = !row;
  const isInSeries = !!row?.recurrence_group_id;
  // Apply-scope only matters when editing a row in a series.
  // "single" = just this occurrence, "future" = this + all later
  // occurrences in the group.
  const [applyScope, setApplyScope] = useState('single');

  const [form, setForm] = useState(() => row
    ? {
        title:       row.title || '',
        category:    row.category || 'Social',
        event_date:  row.event_date || toIso(new Date()),
        event_time_start: row.event_time_start ? row.event_time_start.slice(0, 5) : '',
        event_time_end:   row.event_time_end   ? row.event_time_end.slice(0, 5)   : '',
        spots:       row.spots ?? 0,
        price:       row.price || '',
        description: row.description || '',
      }
    : {
        title: '', category: 'Social',
        event_date: toIso(new Date()),
        event_time_start: '', event_time_end: '',
        spots: 0, price: '', description: '',
      });

  // Recurrence settings — only used at create time.
  const todayPlusYear = (() => {
    const d = new Date();
    d.setDate(d.getDate() + MAX_RECUR_DAYS);
    return toIso(d);
  })();
  const [recurrence, setRecurrence] = useState({
    rule: 'none',
    weeklyDow: new Date(form.event_date + 'T12:00:00').getDay(),
    // v0.12.3 — N-week interval for the weekly rule. 1 = old behavior
    // ("every week on Thursday"). 2 = biweekly leagues. 4 = monthly-
    // by-weekday-of-week (vs the monthly_first/_nth rules which lock
    // to a position in the month). Capped at MAX_WEEKLY_INTERVAL.
    weeklyInterval: 1,
    nth: 1,
    endIso: '',
  });
  // Re-anchor the weekly DOW when the user changes the start date
  // (UNLESS they've already picked a custom weeklyDow).
  const [dowTouched, setDowTouched] = useState(false);
  const setEventDate = (v) => {
    setForm(p => ({ ...p, event_date: v }));
    if (!dowTouched && v) {
      setRecurrence(p => ({ ...p, weeklyDow: new Date(v + 'T12:00:00').getDay() }));
    }
  };
  const setRecurrenceField = (k, v) => {
    if (k === 'weeklyDow') setDowTouched(true);
    setRecurrence(p => ({ ...p, [k]: v }));
  };

  // Live preview of occurrence dates so the manager sees the count
  // before they save. Effective endIso = min(picked, today+1y).
  const previewDates = useMemo(() => {
    if (recurrence.rule === 'none' || !form.event_date) return [];
    const cappedEnd = recurrence.endIso && recurrence.endIso < todayPlusYear
      ? recurrence.endIso
      : todayPlusYear;
    return generateOccurrences({
      rule: recurrence.rule,
      startIso: form.event_date,
      endIso: cappedEnd,
      weeklyDow: recurrence.weeklyDow,
      weeklyInterval: recurrence.weeklyInterval,
      nth: recurrence.nth,
    });
  }, [recurrence, form.event_date]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const save = async () => {
    setErr(null);
    if (!form.title?.trim()) { setErr('Title is required.'); return; }
    if (!form.event_date) { setErr('Date is required.'); return; }
    if (form.event_time_start && form.event_time_end && form.event_time_end <= form.event_time_start) {
      setErr('End time must be after start time.'); return;
    }
    setBusy(true);

    if (isAdd) {
      // ── CREATE path ────────────────────────────────────────────────
      const baseRow = denormalize({
        club_id: club.id,
        title: form.title.trim(),
        category: form.category,
        description: form.description || null,
        event_time: null,                                  // legacy text intentionally null on new rows
        event_time_start: form.event_time_start || null,
        event_time_end:   form.event_time_end || null,
        spots: form.spots ?? 0,
        price: form.price || null,
        event_date: form.event_date,
      });
      let payload;
      if (recurrence.rule === 'none') {
        payload = [baseRow];
      } else {
        const groupId = crypto.randomUUID();
        payload = previewDates.map(iso => denormalize({
          ...baseRow,
          event_date: iso,
          recurrence_group_id: groupId,
        }));
      }
      const { error } = await supabase.from('events').insert(payload);
      setBusy(false);
      if (error) { setErr(error.message); return; }
    } else {
      // ── EDIT path ─────────────────────────────────────────────────
      // Fields propagated to "all future" siblings — everything EXCEPT
      // the per-occurrence date fields (which would clobber siblings).
      const propagatable = {
        title: form.title.trim(),
        category: form.category,
        description: form.description || null,
        event_time_start: form.event_time_start || null,
        event_time_end:   form.event_time_end || null,
        spots: form.spots ?? 0,
        price: form.price || null,
      };
      // Always update the touched row's own date fields.
      const thisRowPayload = denormalize({
        ...propagatable,
        event_date: form.event_date,
      });

      if (isInSeries && applyScope === 'future') {
        // Update sibling rows (not this one) with propagatable fields
        // only. Then update THIS row with the full payload including
        // the touched event_date.
        const { error: sibErr } = await supabase
          .from('events')
          .update(propagatable)
          .eq('recurrence_group_id', row.recurrence_group_id)
          .gt('event_date', row.event_date);
        if (sibErr) { setBusy(false); setErr(sibErr.message); return; }
      }
      const { error } = await supabase
        .from('events')
        .update(thisRowPayload)
        .eq('id', row.id);
      setBusy(false);
      if (error) { setErr(error.message); return; }
    }
    onSaved?.();
    onClose();
  };

  const remove = async () => {
    if (!row) return;
    const scope = isInSeries ? applyScope : 'single';
    // v0.16.8b — shared confirm modal
    const title = isInSeries && scope === 'future'
      ? `Delete "${row.title}" + all later occurrences?`
      : `Delete "${row.title}"?`;
    if (!(await confirmAsync({
      title,
      body: 'This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    }))) return;
    setBusy(true);
    if (isInSeries && scope === 'future') {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('recurrence_group_id', row.recurrence_group_id)
        .gte('event_date', row.event_date);
      setBusy(false);
      if (error) { setErr(error.message); return; }
    } else {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', row.id);
      setBusy(false);
      if (error) { setErr(error.message); return; }
    }
    onSaved?.();
    onClose();
  };

  const input = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' };
  const label = { fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>{isAdd ? 'Add Event' : 'Edit Event'}</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        {/* "Apply to" radio — only when editing a row that's in a series */}
        {isInSeries && (
          <div style={{ marginBottom: 14, padding: '10px 12px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4 }}>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden>🔁</span>
              <span>This event is part of a recurring series. Apply changes to:</span>
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
              <input type="radio" name="applyScope" checked={applyScope === 'single'} onChange={() => setApplyScope('single')} />
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text }}>Just this one occurrence</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
              <input type="radio" name="applyScope" checked={applyScope === 'future'} onChange={() => setApplyScope('future')} />
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text }}>This and all future occurrences</span>
            </label>
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <label style={label}>Title <span style={{ color: G.clsDot }}>*</span></label>
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Thursday Cookout, Member Tournament…" style={input} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={label}>Category</label>
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={input}>
            {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={label}>{isAdd && recurrence.rule !== 'none' ? 'First-occurrence date' : 'Date'} <span style={{ color: G.clsDot }}>*</span></label>
          <input type="date" value={form.event_date} onChange={e => setEventDate(e.target.value)} style={input} />
        </div>

        {/* Time picker: start + end. v0.9.12. Replaces the old free-text
            event_time. Empty = no time shown on the event card. */}
        <div style={{ marginBottom: 10, display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Start time</label>
            <input type="time" value={form.event_time_start} onChange={e => setForm(p => ({ ...p, event_time_start: e.target.value }))} style={input} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>End time (optional)</label>
            <input type="time" value={form.event_time_end} onChange={e => setForm(p => ({ ...p, event_time_end: e.target.value }))} style={input} />
          </div>
        </div>

        <div style={{ marginBottom: 10, display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Spots available</label>
            <input type="number" value={form.spots ?? ''} onChange={e => setForm(p => ({ ...p, spots: e.target.value === '' ? 0 : Number(e.target.value) }))} style={input} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Price (display text)</label>
            <input value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="$125, Free, Market…" style={input} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Description</label>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What members should know about this event." style={{ ...input, height: 100, resize: 'none', lineHeight: 1.5 }} />
        </div>

        {/* Recurrence — only shown when adding a NEW event. Editing
            an existing recurring event is per-occurrence (managed via
            the Apply-to radio above) — changing the rule itself isn't
            supported in v1; delete + recreate the series for that. */}
        {isAdd && (
          <div style={{ marginBottom: 14, padding: '12px 12px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4 }}>
            <label style={label}>Repeat</label>
            <select value={recurrence.rule} onChange={e => setRecurrenceField('rule', e.target.value)} style={input}>
              {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {recurrence.rule === 'weekly' && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Every</label>
                  <select
                    value={recurrence.weeklyInterval}
                    onChange={e => setRecurrenceField('weeklyInterval', Number(e.target.value))}
                    style={input}
                  >
                    {Array.from({ length: MAX_WEEKLY_INTERVAL }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>
                        {n === 1 ? 'week' : `${n} weeks`}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>On</label>
                  <select value={recurrence.weeklyDow} onChange={e => setRecurrenceField('weeklyDow', Number(e.target.value))} style={input}>
                    {WEEKDAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              </div>
            )}
            {(recurrence.rule === 'monthly_first' || recurrence.rule === 'monthly_last') && (
              <div style={{ marginTop: 8 }}>
                <label style={label}>Weekday</label>
                <select value={recurrence.weeklyDow} onChange={e => setRecurrenceField('weeklyDow', Number(e.target.value))} style={input}>
                  {WEEKDAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            )}
            {recurrence.rule === 'monthly_nth' && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Nth</label>
                  <select value={recurrence.nth} onChange={e => setRecurrenceField('nth', Number(e.target.value))} style={input}>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{['1st', '2nd', '3rd', '4th', '5th'][n - 1]}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Weekday</label>
                  <select value={recurrence.weeklyDow} onChange={e => setRecurrenceField('weeklyDow', Number(e.target.value))} style={input}>
                    {WEEKDAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              </div>
            )}

            {recurrence.rule !== 'none' && (
              <>
                <div style={{ marginTop: 8 }}>
                  <label style={label}>Recurs until (max {todayPlusYear})</label>
                  <input
                    type="date"
                    value={recurrence.endIso}
                    max={todayPlusYear}
                    min={form.event_date}
                    onChange={e => setRecurrenceField('endIso', e.target.value)}
                    style={input}
                  />
                </div>
                {/* v0.12.3 — Pattern description line. Spells out the
                    "every N weeks on Friday" cadence ahead of the
                    occurrence count so the manager can verify before
                    they commit a 26-row insert. Only shown for the
                    weekly rule (the monthly rules describe themselves
                    via the dropdown label). */}
                {recurrence.rule === 'weekly' && (
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '8px 0 0' }}>
                    Pattern: {recurrence.weeklyInterval === 1
                      ? `every ${WEEKDAY_NAMES_LONG[recurrence.weeklyDow]}`
                      : `every ${recurrence.weeklyInterval} weeks on ${WEEKDAY_NAMES_LONG[recurrence.weeklyDow]}`}.
                  </p>
                )}
                <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: previewDates.length === 0 ? G.clsDot : G.brass, margin: '8px 0 0', lineHeight: 1.45 }}>
                  {previewDates.length === 0
                    ? 'Pick an "until" date to preview occurrences.'
                    : `Will create ${previewDates.length} occurrence${previewDates.length === 1 ? '' : 's'}${previewDates.length >= MAX_OCCURRENCES ? ` (capped at ${MAX_OCCURRENCES})` : ''} — first ${new Date(previewDates[0] + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}, last ${new Date(previewDates[previewDates.length - 1] + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}.`}
                </p>
              </>
            )}
          </div>
        )}

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
            <div onClick={busy ? undefined : save} data-tap style={{ marginTop: 8, padding: 12, background: busy ? G.muted : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>
                {busy
                  ? 'Saving…'
                  : (isAdd
                      ? (recurrence.rule === 'none' ? 'Save Event' : `Save Series (${previewDates.length})`)
                      : 'Save Changes')}
              </span>
            </div>
            {!isAdd && (
              <div onClick={remove} data-tap style={{ marginTop: 10, padding: 8, textAlign: 'center', cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                  {isInSeries && applyScope === 'future' ? 'Delete this and all future' : 'Delete'}
                </span>
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
  const confirmAsync = useConfirm(); // v0.16.8b — shared confirm modal
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
    // v0.16.8b — shared confirm modal
    if (!(await confirmAsync({
      title: `Delete "${row.title}"?`,
      body: 'This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    }))) return;
    setBusy(true);
    const { error } = await supabase.from('club_content').delete().eq('id', row.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
    onClose();
  };

  const input = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' };
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
  const confirmAsync = useConfirm(); // v0.16.8b — shared confirm modal
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
    // v0.16.8b — shared confirm modal
    if (!(await confirmAsync({
      title: 'Delete this bulletin post?',
      body: 'Members will lose it permanently.',
      confirmLabel: 'Delete',
      danger: true,
    }))) return;
    await supabase.from('bulletin_posts').delete().eq('id', id);
  };
  const togglePartnerOpen = async (row) => {
    await supabase.from('partner_posts').update({ is_open: !row.is_open }).eq('id', row.id);
  };
  const removePartner = async (id) => {
    // v0.16.8b — shared confirm modal
    if (!(await confirmAsync({
      title: 'Delete this partner post?',
      body: 'Members will lose it permanently.',
      confirmLabel: 'Delete',
      danger: true,
    }))) return;
    await supabase.from('partner_posts').delete().eq('id', id);
  };

  return (
    <div>
      {/* v0.12.8 — typography pass round 2. Moderate Posts: title
          14 → 16, category/author 11 → 13, body 12 → 14, action
          links 11 → 13, date chip 10 → 12, tab labels 12 → 13. */}
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 12px' }}>
        Member-generated posts. Hide a bulletin post to keep it out of the member feed while leaving it on record; delete to remove entirely. {!canEdit && 'View only — ask your manager for can_manage_members to moderate.'}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, background: G.card, padding: 4, borderRadius: 4, border: `1px solid ${G.border}` }}>
        {[{ id: 'bulletin', l: `Bulletin (${bulletin.length})` }, { id: 'partner', l: `Partner posts (${partner.length})` }].map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} data-tap style={{ flex: 1, padding: '9px 12px', borderRadius: 3, background: tab === t.id ? G.green : 'transparent', cursor: 'pointer', textAlign: 'center' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: tab === t.id ? '#F2EDE0' : G.muted, fontWeight: tab === t.id ? 600 : 400 }}>{t.l}</span>
          </div>
        ))}
      </div>

      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}

      {!loading && tab === 'bulletin' && bulletin.length === 0 && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: 18, textAlign: 'center', background: G.card, borderRadius: 4 }}>No bulletin posts yet.</p>
      )}
      {!loading && tab === 'bulletin' && bulletin.map(r => (
        <div key={r.id} style={{ padding: '14px 16px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 10, opacity: r.hidden ? 0.5 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: 0 }}>{r.title}{r.hidden && <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, fontStyle: 'italic', marginLeft: 8 }}>(hidden)</span>}</p>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>{new Date(r.created_at).toLocaleDateString()}</span>
          </div>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '3px 0' }}>{r.category} · {r.members?.name || 'Member'}</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: '7px 0 9px', lineHeight: 1.5 }}>{r.body}</p>
          {canEdit && (
            <div style={{ display: 'flex', gap: 14 }}>
              <span onClick={() => toggleHidden(r)} data-tap style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.brass, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>{r.hidden ? 'Unhide' : 'Hide'}</span>
              <span onClick={() => removeBulletin(r.id)} data-tap style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.clsDot, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>Delete</span>
            </div>
          )}
        </div>
      ))}

      {!loading && tab === 'partner' && partner.length === 0 && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: 18, textAlign: 'center', background: G.card, borderRadius: 4 }}>No partner posts yet.</p>
      )}
      {!loading && tab === 'partner' && partner.map(r => (
        <div key={r.id} style={{ padding: '14px 16px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 10, opacity: r.is_open === false ? 0.5 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: 0 }}>{r.title}{r.is_open === false && <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, fontStyle: 'italic', marginLeft: 8 }}>(closed)</span>}</p>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>{new Date(r.created_at).toLocaleDateString()}</span>
          </div>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '3px 0' }}>{r.category || 'Foursome'} · {r.members?.name || 'Member'}{r.hcp != null && ` · Hcp ${r.hcp}`}</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: '7px 0 9px', lineHeight: 1.5 }}>{r.body}</p>
          {canEdit && (
            <div style={{ display: 'flex', gap: 14 }}>
              <span onClick={() => togglePartnerOpen(r)} data-tap style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.brass, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>{r.is_open === false ? 'Reopen' : 'Mark closed'}</span>
              <span onClick={() => removePartner(r.id)} data-tap style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.clsDot, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>Delete</span>
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
      {/* v0.12.8 — typography pass round 2. Clubhouse inbox: topic
          header 14 → 16, thread count 11 → 13, starter primary
          13 → 15, preview 11 → 13, timestamp 10 → 12. */}
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 12px' }}>
        Member-initiated conversations routed to the clubhouse, grouped by topic. {canReply ? 'Tap a thread to reply.' : 'You can read but not reply — ask your manager for write permission.'}
      </p>

      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, textAlign: 'center', padding: '20px 0' }}>Loading…</p>}
      {!loading && threads.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '18px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: 0 }}>No member messages yet.</p>
        </div>
      )}

      {Object.entries(grouped).map(([topic, list]) => (
        <div key={topic} style={{ marginBottom: 16 }}>
          <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: '0 0 6px' }}>{topic}</h4>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '0 0 6px' }}>{list.length} thread{list.length === 1 ? '' : 's'}</p>
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
            {list.map((t, i) => {
              const starterName = t.starter?.members?.name || 'Member';
              const starterNum = t.starter?.members?.membership_number;
              const preview = t.preview?.is_system ? `(${t.preview.body})` : (t.preview?.body || 'No messages yet');
              return (
                <div key={t.id} onClick={() => push('thread', { threadId: t.id })} data-tap style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 10, cursor: 'pointer' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <p style={{ fontFamily: '"Lora",serif', fontSize: 15, color: G.text, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {starterName}{starterNum ? ` · #${starterNum}` : ''}
                      </p>
                      <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, flexShrink: 0 }}>{relativeTime(t.last_message_at)}</span>
                    </div>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
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
        Live feed of new guest registrations. Tap a row to expand; full edit + QR controls live in <strong>People → Guest Settings &amp; QR</strong>.
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
          Guest access rules + the public clubhouse QR code for {club.name}. The full guest list lives in the <strong>Directory</strong> section above.
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
            style={{ width: 80, padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' }}
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
            style={{ padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none' }}
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
            style={{ padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none' }}
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
            style={{ padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none' }}
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
  const confirmAsync = useConfirm(); // v0.16.8b — shared confirm modal
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
      // v0.16.8b — shared confirm modal
      await confirmAsync({
        title: 'Export failed',
        body: `Could not export visit history: ${error?.message || 'unknown error'}`,
        kind: 'alert',
      });
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
      {/* v0.12.8 — typography pass round 2. Guests list: heading
          14 → 16, filters 12 → 13, count 11 → 13, row primary
          13 → 15, row secondary 11 → 13, Row key 11 → 13, Row
          value 12 → 14 (see Row component below). */}
      <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: '0 0 8px' }}>Guests</h4>

      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '12px 14px', marginBottom: 10 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name or email…"
          style={{ width: '100%', padding: '9px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 14, color: G.text, background: G.card, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '7px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, background: G.card }}>
            <option value="all">All visit types</option>
            <option value="member_guest">Member guests</option>
            <option value="public_play">Public play</option>
            <option value="tournament_guest">Tournament guests</option>
            <option value="event_guest">Event guests</option>
          </select>
          {/* v0.8.8: filter by referring member. Options are derived
              from members who've actually brought guests (no point
              listing every member). */}
          <select value={refFilter} onChange={e => setRefFilter(e.target.value)} style={{ padding: '7px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, background: G.card }}>
            <option value="all">All referrers</option>
            <option value="none">No referring member (clubhouse / public)</option>
            {referringMembers.map(([id, nm]) => (
              <option key={id} value={id}>Guest of {nm}</option>
            ))}
          </select>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} title="From" style={{ padding: '7px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, background: G.card }} />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} title="To" style={{ padding: '7px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, background: G.card }} />
          <div onClick={exportCsv} data-tap style={{ padding: '7px 14px', background: G.green, borderRadius: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>Export CSV</span>
          </div>
          {/* v0.8.8: separate "Visit history" export — one row per
              visit so repeat-guest patterns are visible. Hits the DB
              fresh on click so it doesn't get capped at the 500-row
              guest list limit. */}
          <div onClick={exportVisitHistoryCsv} data-tap style={{ padding: '7px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500 }}>Export visit history</span>
          </div>
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '10px 0 0' }}>
          {loading ? 'Loading…' : `${filtered.length} of ${rows.length} guest${rows.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {!loading && filtered.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: 18, textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: 0 }}>
            {rows.length === 0 ? 'No guests have registered yet.' : 'No guests match those filters.'}
          </p>
        </div>
      )}

      {filtered.map(r => {
        const isOpen = expanded === r.id;
        const statusColor = r.status === 'active' ? G.openBg : r.status === 'pending' ? G.brass : G.clsBg;
        return (
          <div key={r.id} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 7, overflow: 'hidden' }}>
            <div onClick={() => setExpanded(isOpen ? null : r.id)} data-tap style={{ padding: '13px 16px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 15, fontWeight: 500, color: G.text, margin: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: statusColor, padding: '2px 7px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, flexShrink: 0 }}>{r.status}</span>
              </div>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
  // v0.12.8 — Row primitive used by guest-detail rows + similar
  // key/value detail panels. Key 11 → 13, value 12 → 14.
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: `1px solid ${G.border}`, gap: 12 }}>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, flexShrink: 0 }}>{k}</span>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, textAlign: 'right', maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
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
      {/* v0.12.8 — typography pass round 2. Lesson Requests / Pro
          Shop Inquiries queue: name 14 → 16, secondary 11 → 13,
          detail 12 → 14, notes 12 → 13, select 12 → 13, reply button
          11 → 13, card padding 12/14 → 14/16. */}
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 12px' }}>
        {heading} Update status as you respond. Tap "Reply via clubhouse" to open a thread with the requester.
      </p>
      {replyErr && (
        <div onClick={() => setReplyErr(null)} data-tap style={{ background: 'rgba(224,84,84,0.10)', border: `1px solid ${G.clsDot}`, borderRadius: 4, padding: '10px 14px', marginBottom: 10, cursor: 'pointer' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: 0 }}>{replyErr} <span style={{ color: G.muted }}>· tap to dismiss</span></p>
        </div>
      )}
      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
      {!loading && rows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '18px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: 0 }}>No requests yet.</p>
        </div>
      )}
      {rows.map(r => {
        const isReplying = busyReply === r.id;
        return (
          <div key={r.id} style={{ padding: '14px 16px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: 0 }}>{r.members?.name || 'Unknown'}</p>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: STATUS_COLORS[r.status] || G.muted, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{r.status}</span>
            </div>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '0 0 5px' }}>
              {r.members?.email || '—'} · {r.kind || 'lesson'} {r.pro && `· Pro: ${r.pro}`}
            </p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: '0 0 5px' }}>
              {[r.preferred_date && new Date(r.preferred_date).toLocaleDateString(), r.preferred_time, r.skill_level && `Skill: ${r.skill_level}`].filter(Boolean).join(' · ')}
            </p>
            {r.notes && <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '5px 0 9px' }}>{r.notes}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={r.status}
                onChange={e => setStatus(r.id, e.target.value)}
                disabled={!canEdit}
                style={{ padding: '7px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, background: G.card, opacity: canEdit ? 1 : 0.6 }}
              >
                {['pending', 'contacted', 'scheduled', 'done', 'cancelled'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {canEdit && (
                <div
                  onClick={isReplying ? undefined : () => replyViaClubhouse(r)}
                  data-tap
                  style={{ padding: '7px 14px', background: isReplying ? G.muted : G.green, borderRadius: 3, cursor: isReplying ? 'wait' : 'pointer' }}
                >
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>
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

// ============================================================
// SupportAdmin — Phase 14 (v0.13.x) Platform → Support
//
// Two sub-tabs:
//   · Inbox — thread list + reply (lands in v0.13.4)
//   · Team  — destination management (active in v0.13.1)
//
// Super_admin only (rendered inside SectionContent's
// isSuperAdmin guard, but kept defensive here too — RLS on
// support_destinations + the manage Edge Function both also
// check super_admin status).
// ============================================================
export function SupportAdmin() {
  const [tab, setTab] = useState('inbox');
  return (
    <div>
      {/* v0.13.1 — tab strip. Matches the MemberPostsAdmin pattern
          (Bulletin / Partner tabs). */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, background: G.card, padding: 4, borderRadius: 4, border: `1px solid ${G.border}` }}>
        {[
          { id: 'inbox', l: 'Inbox' },
          { id: 'team',  l: 'Team'  },
        ].map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} data-tap style={{ flex: 1, padding: '9px 12px', borderRadius: 3, background: tab === t.id ? G.green : 'transparent', cursor: 'pointer', textAlign: 'center' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: tab === t.id ? '#F2EDE0' : G.muted, fontWeight: tab === t.id ? 600 : 400 }}>{t.l}</span>
          </div>
        ))}
      </div>
      {tab === 'inbox' && <SupportInboxTab />}
      {tab === 'team'  && <SupportTeamTab  />}
    </div>
  );
}

// ── Inbox tab — v0.13.4 ─────────────────────────────────────────────
// Two states: thread list (default) and thread detail (selected).
// Deep-link via ?thread=<id> in the URL (push notifications use this).
function SupportInboxTab() {
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  // Honor ?thread=<id> on mount so push notifications deep-link
  // to the right thread.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get('thread');
    if (t) setSelectedThreadId(t);
  }, []);

  if (selectedThreadId) {
    return (
      <SupportThreadDetail
        threadId={selectedThreadId}
        onBack={() => setSelectedThreadId(null)}
      />
    );
  }
  return <SupportThreadList onOpen={setSelectedThreadId} />;
}

// v0.13.8 — Category label lookup. SUPPORT_CATEGORIES + CATEGORY_COLORS
// are imported from ContactSupportModal at the top of this file.
const CATEGORY_LABEL = Object.fromEntries(SUPPORT_CATEGORIES.map(c => [c.id, c.l]));

// ── Thread list ─────────────────────────────────────────────────────
function SupportThreadList({ onOpen }) {
  const { session } = useAuth();
  const [threads, setThreads] = useState([]);
  const [reads, setReads] = useState({});      // thread_id → read_at
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open'); // 'open' / 'all' / 'closed'
  const [catFilter, setCatFilter] = useState('all'); // 'all' | category id | 'untriaged'
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // v0.16.13 — explicit column list. Matches the current schema;
      // future column additions stay server-side until added here.
      const { data: tRows } = await supabase
        .from('support_threads')
        .select('id, subject, from_addr, from_name, from_member_id, from_club_id, status, last_message_at, created_at, category')
        .order('last_message_at', { ascending: false })
        .limit(200);
      // Per-(thread, this super_admin) read state
      const { data: rRows } = await supabase
        .from('support_reads')
        .select('thread_id, read_at')
        .eq('user_id', session?.user?.id);
      if (cancelled) return;
      setThreads(tRows || []);
      const map = {};
      (rRows || []).forEach(r => { map[r.thread_id] = r.read_at; });
      setReads(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id, version]);

  // v0.13.5 — realtime subscription on support_threads + support_messages
  // so the list reflects new tickets / state changes without a manual
  // refresh. Triggers a re-fetch via the version counter rather than
  // mutating in place — keeps the reload logic in one place.
  useEffect(() => {
    if (!session?.user?.id) return;
    const ch = supabase
      .channel(`support_list:${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_threads' }, () => setVersion(v => v + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => setVersion(v => v + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_reads', filter: `user_id=eq.${session.user.id}` }, () => setVersion(v => v + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session?.user?.id]);

  const filtered = threads.filter(t => {
    // status filter
    if (filter === 'closed' && t.status !== 'closed') return false;
    if (filter === 'open'   && t.status === 'closed') return false;
    // category filter
    if (catFilter === 'untriaged' && t.category != null) return false;
    if (catFilter !== 'all' && catFilter !== 'untriaged' && t.category !== catFilter) return false;
    return true;
  });
  const untriagedCount = threads.filter(t => t.category == null && t.status !== 'closed').length;

  const unreadCount = threads.filter(t => {
    if (t.status === 'closed') return false;
    const r = reads[t.id];
    return !r || new Date(r) < new Date(t.last_message_at);
  }).length;

  if (loading) return <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '40px 0', textAlign: 'center' }}>Loading support inbox…</p>;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 8px' }}>
          {threads.length} thread{threads.length === 1 ? '' : 's'} · {unreadCount} unread
          {untriagedCount > 0 && <> · <span style={{ color: G.brass, fontWeight: 600, fontStyle: 'normal' }}>{untriagedCount} need triage</span></>}
        </p>
        {/* Status filter pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {[
            { id: 'open',   l: 'Active'  },
            { id: 'all',    l: 'All'     },
            { id: 'closed', l: 'Closed'  },
          ].map(f => (
            <div key={f.id} onClick={() => setFilter(f.id)} data-tap
              style={{ padding: '6px 12px', borderRadius: 14, background: filter === f.id ? G.brass : G.card, border: `1px solid ${filter === f.id ? G.brass : G.border}`, cursor: 'pointer' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: filter === f.id ? '#F2E5C0' : G.muted, fontWeight: filter === f.id ? 600 : 400 }}>{f.l}</span>
            </div>
          ))}
        </div>
        {/* Category filter pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all',       l: 'All categories' },
            { id: 'untriaged', l: 'Needs triage'   },
            ...SUPPORT_CATEGORIES,
          ].map(c => {
            const isActive = catFilter === c.id;
            const accent   = c.id === 'untriaged' ? G.brass
                           : c.id === 'all'       ? G.greenMid
                           : CATEGORY_COLORS[c.id];
            return (
              <div key={c.id} onClick={() => setCatFilter(c.id)} data-tap
                style={{
                  padding: '5px 11px', borderRadius: 14,
                  background: isActive ? accent : G.card,
                  border: `1px solid ${isActive ? accent : G.border}`,
                  cursor: 'pointer',
                }}>
                <span style={{
                  fontFamily: '"Lora",serif', fontSize: 11,
                  color: isActive ? '#F2E5C0' : G.muted,
                  fontWeight: isActive ? 600 : 400,
                }}>{c.l}</span>
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '20px 16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: 0 }}>
            {threads.length === 0
              ? 'No support emails received yet.'
              : `No threads in this filter.`}
          </p>
        </div>
      ) : (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {filtered.map((t, i) => {
            const r = reads[t.id];
            const isUnread = !r || new Date(r) < new Date(t.last_message_at);
            const statusBg = t.status === 'open'     ? G.openBg
                           : t.status === 'answered' ? G.brass
                           :                            G.muted;
            return (
              <div key={t.id} onClick={() => onOpen(t.id)} data-tap
                style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 10, cursor: 'pointer', background: isUnread ? G.bg : 'transparent' }}>
                {/* Unread dot */}
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isUnread ? G.brass : 'transparent', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                    <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: isUnread ? 700 : 500, color: G.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {t.from_name || t.from_addr}
                    </p>
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, flexShrink: 0 }}>
                      {relativeTime(t.last_message_at)}
                    </span>
                  </div>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.subject || '(no subject)'}
                  </p>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.from_addr}
                  </p>
                </div>
                {/* v0.13.8 — category chip (or "needs triage" amber chip) */}
                {t.category ? (
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: CATEGORY_COLORS[t.category] || G.muted, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, flexShrink: 0 }}>
                    {(CATEGORY_LABEL[t.category] || t.category).split(' ')[0]}
                  </span>
                ) : (
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: G.brass, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, flexShrink: 0 }}>
                    Triage
                  </span>
                )}
                <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: statusBg, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, flexShrink: 0 }}>
                  {t.status}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Thread detail ───────────────────────────────────────────────────
function SupportThreadDetail({ threadId, onBack }) {
  const { session } = useAuth();
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [attachmentsByMessage, setAttachmentsByMessage] = useState({});  // v0.13.6
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(null);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: t }, { data: ms }] = await Promise.all([
        // v0.16.13 — explicit column lists. Same columns as before
        // (current schema), but adding a new column in the DB no
        // longer auto-ships it to the client.
        supabase.from('support_threads')
          .select('id, subject, from_addr, from_name, from_member_id, from_club_id, status, last_message_at, created_at, category')
          .eq('id', threadId).maybeSingle(),
        supabase.from('support_messages')
          .select('id, thread_id, direction, message_id, in_reply_to, references_ids, from_addr, from_name, to_addrs, cc_addrs, subject, body_text, body_html, raw_size_bytes, has_attachments, received_at, created_at, created_by')
          .eq('thread_id', threadId)
          .order('received_at', { ascending: true }),
      ]);
      if (cancelled) return;
      setThread(t);
      setMessages(ms || []);
      // v0.13.6 — fetch attachments for every message in the thread
      // in one query, then bucket by message_id for the renderer.
      const msgIds = (ms || []).map(m => m.id);
      if (msgIds.length > 0) {
        const { data: atts } = await supabase
          .from('support_attachments')
          .select('id, message_id, filename, mime_type, size_bytes, storage_path')
          .in('message_id', msgIds);
        if (!cancelled) {
          const byMsg = {};
          (atts || []).forEach(a => {
            if (!byMsg[a.message_id]) byMsg[a.message_id] = [];
            byMsg[a.message_id].push(a);
          });
          setAttachmentsByMessage(byMsg);
        }
      }
      setLoading(false);
      // Mark thread as read by this super_admin (upsert support_reads)
      if (t && session?.user?.id) {
        await supabase.from('support_reads').upsert(
          { thread_id: threadId, user_id: session.user.id, read_at: new Date().toISOString() },
          { onConflict: 'thread_id,user_id' }
        );
      }
    })();
    return () => { cancelled = true; };
  }, [threadId, version, session?.user?.id]);

  // v0.13.5 — realtime: if a new message lands on this thread while
  // open (the recipient replied right back), bump version to re-fetch.
  useEffect(() => {
    if (!threadId) return;
    const ch = supabase
      .channel(`support_thread:${threadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages', filter: `thread_id=eq.${threadId}` }, () => refresh())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_threads', filter: `id=eq.${threadId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId]);

  const sendReply = async () => {
    setErr(null);
    const text = reply.trim();
    if (!text) return;
    setSending(true);
    try {
      const token = session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-support-reply`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ thread_id: threadId, body_text: text }),
        }
      );
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setReply('');
      refresh();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (newStatus) => {
    if (!thread) return;
    await supabase.from('support_threads').update({ status: newStatus }).eq('id', threadId);
    refresh();
  };

  // v0.13.8 — category change. NULL value means "remove triage / not yet decided"
  const setCategory = async (newCategory) => {
    if (!thread) return;
    await supabase.from('support_threads').update({ category: newCategory || null }).eq('id', threadId);
    refresh();
  };

  if (loading) return <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '40px 0', textAlign: 'center' }}>Loading thread…</p>;
  if (!thread) return (
    <div>
      <div onClick={onBack} data-tap style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0', marginBottom: 14, cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7" /></svg>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.brass }}>Back to inbox</span>
      </div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.clsDot }}>Thread not found.</p>
    </div>
  );

  const statusBg = thread.status === 'open'     ? G.openBg
                 : thread.status === 'answered' ? G.brass
                 :                                 G.muted;

  return (
    <div>
      {/* Back link */}
      <div onClick={onBack} data-tap style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0', marginBottom: 14, cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7" /></svg>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.brass }}>Back to inbox</span>
      </div>

      {/* Thread header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text, margin: 0, flex: 1 }}>
            {thread.subject || '(no subject)'}
          </h3>
          {/* v0.13.8 — category chip if set, otherwise an amber Triage chip */}
          {thread.category ? (
            <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: CATEGORY_COLORS[thread.category] || G.muted, padding: '3px 9px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              {CATEGORY_LABEL[thread.category] || thread.category}
            </span>
          ) : (
            <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: G.brass, padding: '3px 9px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              Needs triage
            </span>
          )}
          <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: statusBg, padding: '3px 9px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            {thread.status}
          </span>
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '0 0 4px' }}>
          From <strong style={{ color: G.text }}>{thread.from_name || thread.from_addr}</strong>
          {thread.from_name ? ` <${thread.from_addr}>` : ''}
        </p>
        {/* Status + category controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
          {/* v0.13.8 — category dropdown */}
          <select
            value={thread.category || ''}
            onChange={e => setCategory(e.target.value)}
            style={{ padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 12, background: G.card, color: G.text, outline: 'none' }}
          >
            <option value="">{thread.category ? '— remove category —' : 'Triage to…'}</option>
            {SUPPORT_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.l}</option>
            ))}
          </select>
          {thread.status !== 'closed' && (
            <div onClick={() => setStatus('closed')} data-tap style={{ padding: '5px 12px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>Close thread</span>
            </div>
          )}
          {thread.status === 'closed' && (
            <div onClick={() => setStatus('open')} data-tap style={{ padding: '5px 12px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.brass }}>Reopen thread</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ marginBottom: 14 }}>
        {messages.map(m => {
          const isOut = m.direction === 'out';
          return (
            <div key={m.id} style={{
              display: 'flex',
              justifyContent: isOut ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}>
              <div style={{
                maxWidth: '85%',
                padding: '12px 14px',
                background: isOut ? G.green : G.card,
                color: isOut ? '#F2EDE0' : G.text,
                border: `1px solid ${isOut ? G.green : G.border}`,
                borderRadius: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 12, fontWeight: 700, color: isOut ? '#F2E5C0' : G.text }}>
                    {isOut ? 'Support' : (m.from_name || m.from_addr)}
                  </span>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: isOut ? 'rgba(242,229,192,0.7)' : G.muted }}>
                    {new Date(m.received_at).toLocaleString()}
                  </span>
                </div>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: 'inherit', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.body_text || '(no plain-text body — HTML only)'}
                </p>
                {/* v0.13.6 — attachment chips. Each click → signed
                    URL download (60-second TTL via Supabase Storage). */}
                {(attachmentsByMessage[m.id] || []).length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {(attachmentsByMessage[m.id] || []).map(att => (
                      <AttachmentChip key={att.id} att={att} isOutBubble={isOut} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply composer */}
      {thread.status !== 'closed' && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: 14 }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, fontStyle: 'italic', margin: '0 0 8px' }}>
            Reply will be sent as <strong style={{ color: G.text }}>support@groundslive.com</strong> with proper threading headers — Gmail / Outlook keep this in the same thread on their side.
          </p>
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Type your reply…"
            rows={4}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 14, color: G.text, background: G.card, lineHeight: 1.5, resize: 'vertical', outline: 'none' }}
          />
          {err && (
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, margin: '8px 0 0' }}>{err}</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <div onClick={sending || !reply.trim() ? undefined : sendReply} data-tap
              style={{
                padding: '9px 20px',
                background: (sending || !reply.trim()) ? G.muted : G.green,
                borderRadius: 3,
                cursor: (sending || !reply.trim()) ? 'not-allowed' : 'pointer',
                opacity: (sending || !reply.trim()) ? 0.6 : 1,
              }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 14, color: '#F2EDE0', fontWeight: 500 }}>
                {sending ? 'Sending…' : 'Send reply'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── v0.13.6 — Attachment chip ──────────────────────────────────────
// Compact chip with paperclip + filename + size. Click → fetches a
// 60-second signed URL from Supabase Storage and opens it in a new
// tab (browser handles download / inline view by MIME type).
function AttachmentChip({ att, isOutBubble }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const download = async () => {
    setBusy(true); setErr(null);
    try {
      const { data, error } = await supabase.storage
        .from('support-attachments')
        .createSignedUrl(att.storage_path, 60);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener');
      }
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const sizeKb = att.size_bytes != null ? Math.max(1, Math.round(att.size_bytes / 1024)) : null;
  const labelColor = isOutBubble ? '#F2E5C0' : G.brass;
  const bgColor = isOutBubble ? 'rgba(242,229,192,0.12)' : 'rgba(155,122,30,0.08)';
  const borderColor = isOutBubble ? 'rgba(242,229,192,0.35)' : 'rgba(155,122,30,0.4)';

  return (
    <div onClick={busy ? undefined : download} data-tap
      title={`Download ${att.filename}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 3,
        cursor: busy ? 'wait' : 'pointer',
      }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={labelColor} strokeWidth="2">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
      </svg>
      <span style={{ flex: 1, fontFamily: '"Lora",serif', fontSize: 12, color: labelColor, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {att.filename}
      </span>
      {sizeKb != null && (
        <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: labelColor, opacity: 0.7, flexShrink: 0 }}>
          {sizeKb < 1024 ? `${sizeKb} KB` : `${(sizeKb / 1024).toFixed(1)} MB`}
        </span>
      )}
      {err && <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.clsDot }}>{err}</span>}
    </div>
  );
}

// ── Team tab — destination management (Phase 14, v0.13.1) ───────────
function SupportTeamTab() {
  const { session } = useAuth();
  const confirmAsync = useConfirm(); // v0.16.8b — shared confirm modal
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Read directly from the table — RLS already restricts to super_admin.
      // v0.16.13 — explicit column list. Same set as today's schema.
      const { data } = await supabase
        .from('support_destinations')
        .select('id, email, name, active, verified_at, cf_destination_id, added_at, added_by')
        .order('added_at', { ascending: true });
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [version]);

  // Invoke the manage Edge Function. Pass the user's JWT so the
  // function can verify super_admin role.
  const invokeManage = async (method, body) => {
    const token = session?.access_token;
    if (!token) throw new Error('no session');
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-support-destinations`,
      {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      }
    );
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok) throw new Error(j.error || `HTTP ${res.status}`);
    return j;
  };

  const addDestination = async () => {
    setErr(null);
    if (!newEmail.trim() || !newName.trim()) {
      setErr('Email and name are both required.');
      return;
    }
    setBusy(true);
    try {
      await invokeManage('POST', { email: newEmail.trim(), name: newName.trim() });
      setNewEmail(''); setNewName('');
      setAdding(false);
      refresh();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const removeDestination = async (row) => {
    // v0.16.8b — shared confirm modal
    if (!(await confirmAsync({
      title: `Remove ${row.name}?`,
      body: `${row.email} will stop receiving forwarded mail.`,
      confirmLabel: 'Remove',
      danger: true,
    }))) return;
    setErr(null); setBusy(true);
    try {
      await invokeManage('DELETE', { id: row.id });
      refresh();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setErr(null); setBusy(true);
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-support-destinations/sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type':  'application/json',
          },
        }
      ).then(r => r.json());
      refresh();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '40px 0', textAlign: 'center' }}>Loading support team…</p>;

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 12px' }}>
        Who receives forwarded support@groundslive.com mail. Adding a person registers them with Cloudflare and triggers a verification email — they have to click the link in that inbox before forwards start.
      </p>

      {err && (
        <div onClick={() => setErr(null)} data-tap style={{ background: 'rgba(224,84,84,0.10)', border: `1px solid ${G.clsDot}`, borderRadius: 4, padding: '10px 14px', marginBottom: 10, cursor: 'pointer' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: 0 }}>{err} <span style={{ color: G.muted }}>· tap to dismiss</span></p>
        </div>
      )}

      <div style={{ background: G.card, borderRadius: 4, border: `1px solid ${G.border}`, overflow: 'hidden', marginBottom: 12 }}>
        {rows.length === 0 && (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: 18, textAlign: 'center', margin: 0 }}>
            No support team members yet. Add at least one to start receiving forwards.
          </p>
        )}
        {rows.map((r, i) => {
          const status = !r.active ? 'inactive'
                       : r.verified_at ? 'verified'
                       : 'pending';
          const badgeBg  = status === 'verified' ? G.openBg
                         : status === 'pending'  ? G.brass
                         : G.muted;
          const badgeLbl = status.toUpperCase();
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 15, color: G.text, fontWeight: 500, margin: 0 }}>{r.name}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email}</p>
              </div>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: badgeBg, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, flexShrink: 0 }}>{badgeLbl}</span>
              <div onClick={busy ? undefined : () => removeDestination(r)} data-tap style={{ padding: '5px 10px', cursor: busy ? 'wait' : 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.clsDot, textDecoration: 'underline', textUnderlineOffset: 2 }}>Remove</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div onClick={() => setAdding(!adding)} data-tap style={{ flex: 1, padding: 13, background: adding ? G.card : G.green, border: `1px solid ${adding ? G.border : G.green}`, borderRadius: 3, textAlign: 'center', cursor: 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 14, color: adding ? G.text : '#F2EDE0', fontWeight: 500 }}>
            {adding ? 'Cancel' : '+ Add team member'}
          </span>
        </div>
        <div onClick={busy ? undefined : sync} data-tap style={{ padding: '13px 18px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 3, cursor: busy ? 'wait' : 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.brass, fontWeight: 500 }}>{busy ? 'Syncing…' : 'Sync with Cloudflare'}</span>
        </div>
      </div>

      {adding && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '14px 16px' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 10px' }}>
            They'll get a verification email at this address from Cloudflare. Forwarding starts once they click the link.
          </p>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Name</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Matt Bohlmann" style={{ width: '100%', padding: '9px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 14, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Email</label>
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="matt@example.com" style={{ width: '100%', padding: '9px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 14, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div onClick={busy ? undefined : addDestination} data-tap style={{ padding: 12, background: busy ? G.muted : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 14, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Adding…' : 'Add + send verification'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Re-exports — heavy section components live in sibling files
// to keep this barrel module under control. Behavior unchanged;
// callers that import from './admin/sections.jsx' keep working.
// ============================================================
export { NotificationsAdmin } from './NotificationsAdmin.jsx';
export { NewsAdminFull } from './NewsAdmin.jsx';

// v0.16.5 — Platform domain (super_admin-only) split out into
// ./sections/platform.jsx. SuperAdminsAdmin, AllClubsAdmin,
// ProvisionLogAdmin re-exported from here so existing imports from
// './admin/sections.jsx' keep working. Dead stubs removed:
// PlatformSettingsAdmin, PlatformMetricsAdmin, ComingSoonSection
// (none were referenced anywhere).
export { SuperAdminsAdmin, AllClubsAdmin, ProvisionLogAdmin } from './sections/platform.jsx';
