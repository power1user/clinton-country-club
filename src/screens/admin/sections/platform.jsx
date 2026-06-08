// platform.jsx (v0.16.5, audit #7)
//
// Extracted from sections.jsx as the first slice of the 5,327-line
// split. Contains every Platform-area (super_admin-only) section:
//
//   - SuperAdminsAdmin     — promote/demote platform admins
//   - AllClubsAdmin        — cross-club browser + onboarding
//   - CreateClubModal      — onboard new club (private to AllClubsAdmin)
//   - ProvisionLogAdmin    — Cloudflare provision audit log + health check
//   - DetailRow            — small primitive used by ProvisionLogAdmin
//
// Dead-code removed in this extraction (none of these were referenced
// from the section router or anywhere else):
//   - PlatformSettingsAdmin / PlatformMetricsAdmin (Phase 3 stubs)
//   - ComingSoonSection (their helper)
//
// All exports are re-exported from sections.jsx for backward
// compatibility with existing AdminPanel imports.

import { useEffect, useState } from 'react';
import { G } from '../../../theme.js';
import { useAuth } from '../../../hooks/useAuth.jsx';
import { supabase } from '../../../lib/supabase.js';
import { COMMON_TIMEZONES } from '../../../lib/timezone.js';
import { useConfirm } from '../../../components/ConfirmModal.jsx';   // v0.16.8b
// ClubSettingsForm + FeaturesPanel still live in sections.jsx (they're
// shared with the manager-side Club Settings area). Pull them from
// there rather than splitting them too in this same patch.
import { ClubSettingsForm, FeaturesPanel } from '../sections.jsx';

// ============================================================
// SuperAdminsAdmin — promote/demote platform-wide super_admins
// ============================================================
export function SuperAdminsAdmin() {
  const { session, club } = useAuth();
  const confirmAsync = useConfirm(); // v0.16.8b — shared confirm modal
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
    // v0.16.8b — shared modal in alert variant (was native alert)
    if (error) { await confirmAsync({ title: 'Promote failed', body: error.message, kind: 'alert' }); return; }
    setAdding(false);
    refresh();
  };

  const demote = async (row) => {
    const isSelf = row.user_id === session?.user?.id;
    // v0.16.8b — shared confirm modal (was native confirm + alert)
    if (!(await confirmAsync({
      title: isSelf
        ? "Remove your own super_admin status?"
        : `Remove ${row.display_name || 'this user'}'s super_admin status?`,
      body: isSelf
        ? "You'll immediately lose platform access. Make sure someone else can still get in."
        : undefined,
      confirmLabel: 'Remove',
      danger: true,
    }))) return;
    const { error } = await supabase.from('user_roles').delete().eq('id', row.id);
    if (error) { await confirmAsync({ title: 'Remove failed', body: error.message, kind: 'alert' }); return; }
    refresh();
  };

  if (loading) return <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '40px 0', textAlign: 'center' }}>Loading super admins…</p>;

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 12px' }}>
        Super admins have full platform access. They can promote/demote other super admins, manage every club, and bypass all permission checks. {admins.length === 1 ? 'You are the only super admin — promote at least one other before demoting yourself.' : ''}
      </p>

      <div style={{ background: G.card, borderRadius: 4, border: `1px solid ${G.border}`, overflow: 'hidden', marginBottom: 12 }}>
        {admins.map((a, i) => {
          const isSelf = a.user_id === session?.user?.id;
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 15, color: G.text, margin: 0, fontWeight: 500 }}>
                  {a.display_name || '(unnamed)'}{isSelf && ' · You'}
                </p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '2px 0 0' }}>Added {new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: G.brass, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Super</span>
              <div onClick={() => demote(a)} data-tap style={{ padding: '5px 10px', cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.clsDot, textDecoration: 'underline', textUnderlineOffset: 2 }}>Remove</span>
              </div>
            </div>
          );
        })}
      </div>

      <div onClick={() => setAdding(!adding)} data-tap style={{ padding: 13, background: adding ? G.card : G.green, border: `1px solid ${adding ? G.border : G.green}`, borderRadius: 3, textAlign: 'center', cursor: 'pointer' }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 14, color: adding ? G.text : '#F2EDE0', fontWeight: 500 }}>{adding ? 'Cancel' : '+ Promote a member to Super Admin'}</span>
      </div>

      {adding && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 9px' }}>
            Pick a Clinton CC member with an account to promote. They'll gain platform-wide super_admin access immediately.
          </p>
          {memberPool.length === 0 && (
            <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, padding: 14, textAlign: 'center', background: G.card, borderRadius: 4 }}>No eligible members. They need a signed-in account first.</p>
          )}
          {memberPool.map(m => (
            <div key={m.id} onClick={() => promote(m)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 7, cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 15, color: G.text, margin: 0, fontWeight: 500 }}>{m.name}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '2px 0 0' }}>#{m.membership_number} · {m.email || 'no email'}</p>
              </div>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.brass, textDecoration: 'underline', textUnderlineOffset: 2 }}>Promote →</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// AllClubsAdmin — super_admin cross-club browser + onboarding
// ============================================================
export function AllClubsAdmin() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
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

  const [fullClub, setFullClub] = useState(null);
  useEffect(() => {
    if (!selected) { setFullClub(null); return; }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from('clubs').select('*').eq('id', selected.id).single();
      if (!cancelled) setFullClub(data);
    };
    load();
    const channel = supabase
      .channel(`clubs_edit:${selected.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'clubs', filter: `id=eq.${selected.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [selected?.id]);

  if (loading) return <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '40px 0', textAlign: 'center' }}>Loading clubs…</p>;

  if (selected && fullClub) {
    return (
      <div>
        <div onClick={() => setSelected(null)} data-tap style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0', marginBottom: 14, cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7" /></svg>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.brass }}>All Clubs</span>
        </div>
        <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 20, fontWeight: 700, color: G.text, margin: '0 0 4px' }}>{fullClub.name}</h3>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 16px' }}>
          {fullClub.slug}.groundslive.com · {fullClub.city || '?'}, {fullClub.state || '?'}
        </p>
        <ClubSettingsForm
          club={fullClub}
          mode="platform"
          headerNote="Edit any club on the platform. As super_admin you also control the location facts + course meta + timezone that managers can't touch."
        />

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

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 12px' }}>
        Every club on the platform. Tap a row to edit branding + contact info. Add a new club to onboard.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: 0, flex: 1 }}>
          {clubs.length} {clubs.length === 1 ? 'club' : 'clubs'}
        </p>
        <div onClick={() => setCreating(true)} data-tap style={{ padding: '9px 14px', background: G.green, borderRadius: 3, cursor: 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>+ New Club</span>
        </div>
      </div>

      <div style={{ background: G.card, borderRadius: 4, border: `1px solid ${G.border}`, overflow: 'hidden' }}>
        {clubs.map((c, i) => (
          <div key={c.id} onClick={() => setSelected(c)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 12, cursor: 'pointer' }}>
            <div style={{ width: 40, height: 40, borderRadius: 4, background: c.primary_color || '#1B3A2D', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {c.logo_url ? (
                <img src={c.logo_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: '#F2E5C0' }}>{(c.name || '?').charAt(0)}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.slug}.groundslive.com{c.city ? ` · ${c.city}${c.state ? `, ${c.state}` : ''}` : ''}
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
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
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(null);
  const [err, setErr] = useState(null);
  const [dnsResult, setDnsResult] = useState(null);
  const [createdClub, setCreatedClub] = useState(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const autoSlugFromName = (name) => {
    const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20);
    set('slug', s);
  };

  const provisionDomain = async (slug, clubId) => {
    setStage('dns');
    try {
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

    const result = await provisionDomain(slug, data.id);
    setDnsResult(result);
    setStage('done');
    setBusy(false);
    if (result?.ok) {
      setTimeout(() => onCreated?.(data), 700);
    }
  };

  const continueAnyway = () => {
    if (createdClub) onCreated?.(createdClub);
  };

  const labelStyle = { fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 };
  const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' };

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
// ProvisionLogAdmin — super_admin read-only view of every
// Cloudflare provision attempt + manual subdomain health check
// (Phase 7 v0.7.7; health check added v0.10.12)
// ============================================================
export function ProvisionLogAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filterFailed, setFilterFailed] = useState(false);
  const [healthRunning, setHealthRunning] = useState(false);
  const [healthResults, setHealthResults] = useState(null);
  const [healthErr, setHealthErr] = useState(null);
  const [reprovisioning, setReprovisioning] = useState(null);

  const runHealthCheck = async () => {
    setHealthRunning(true); setHealthErr(null);
    try {
      const { data, error } = await supabase.functions.invoke('check-club-health', { body: {} });
      if (error) { setHealthErr(error.message || 'Edge function error'); }
      else if (!data?.ok) { setHealthErr(data?.error || 'Health check failed'); }
      else { setHealthResults(data.results || []); }
    } catch (e) {
      setHealthErr(e.message || 'Network error');
    } finally {
      setHealthRunning(false);
    }
  };

  const reprovision = async (slug, clubId) => {
    if (!slug) return;
    setReprovisioning(slug); setHealthErr(null);
    try {
      const { data, error } = await supabase.functions.invoke('provision-club-domain', { body: { slug, club_id: clubId } });
      if (error) { setHealthErr(error.message || 'Re-provision failed'); }
      else if (!data?.ok) { setHealthErr(data?.error || 'Re-provision failed'); }
      else {
        setTimeout(() => runHealthCheck(), 1500);
      }
    } catch (e) {
      setHealthErr(e.message || 'Network error');
    } finally {
      setReprovisioning(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
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
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 12px' }}>
        Audit log of every Cloudflare Pages Custom Domain provision attempt. Written server-side by the provision-club-domain Edge Function — immutable. Tap any row to see the raw Cloudflare API response.
      </p>

      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '13px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: healthResults ? 12 : 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: 0 }}>
              Subdomain health
            </p>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '3px 0 0' }}>
              Pings every club's hostname. Flags unreachable subdomains + clubs whose DNS isn't proxied through Cloudflare.
            </p>
          </div>
          <button
            onClick={runHealthCheck}
            disabled={healthRunning}
            data-tap
            type="button"
            style={{
              flexShrink: 0,
              background: healthRunning ? G.muted : G.green,
              color: '#F2EDE0',
              border: 'none', borderRadius: 4,
              padding: '9px 14px', cursor: healthRunning ? 'wait' : 'pointer',
              fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 600,
            }}
          >
            {healthRunning ? 'Checking…' : 'Run health check'}
          </button>
        </div>

        {healthErr && (
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.clsBg, margin: '8px 0 0' }}>{healthErr}</p>
        )}

        {healthResults && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {healthResults.length === 0 && (
              <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: 0 }}>No clubs configured.</p>
            )}
            {healthResults.map(r => {
              const healthy = r.reachable && r.cloudflare;
              const dnsOnly = r.reachable && !r.cloudflare;
              const broken  = !r.reachable;
              const badgeBg  = healthy ? G.openBg : dnsOnly ? G.brass : G.clsBg;
              const badgeText = healthy ? 'OK' : dnsOnly ? 'DNS ONLY' : 'BROKEN';
              return (
                <div key={r.slug} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 13px',
                  background: G.bg, borderRadius: 3,
                  border: `1px solid ${G.border}`,
                }}>
                  <span style={{
                    fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0',
                    background: badgeBg, padding: '2px 7px', borderRadius: 2,
                    textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
                    flexShrink: 0,
                  }}>{badgeText}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: 0 }}>
                      {r.club_name || r.slug}
                    </p>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.hostname}
                      {r.status != null && ` · ${r.status}`}
                      {r.latency_ms != null && ` · ${r.latency_ms}ms`}
                      {broken && r.dns_error && ' · DNS not found'}
                      {broken && !r.dns_error && r.error && ` · ${r.error}`}
                    </p>
                  </div>
                  {broken && (
                    <button
                      onClick={() => reprovision(r.slug, r.club_id)}
                      disabled={reprovisioning === r.slug}
                      data-tap
                      type="button"
                      style={{
                        flexShrink: 0,
                        background: reprovisioning === r.slug ? G.muted : 'transparent',
                        color: G.brass,
                        border: `1px solid ${G.brass}`,
                        borderRadius: 3,
                        padding: '6px 12px',
                        cursor: reprovisioning === r.slug ? 'wait' : 'pointer',
                        fontFamily: '"Lora",serif', fontSize: 12, fontWeight: 600,
                      }}
                    >
                      {reprovisioning === r.slug ? '…' : 'Re-provision'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, flex: 1 }}>
          {loading ? '…' : `${rows.length} attempt${rows.length === 1 ? '' : 's'} · ${okCount} ok · ${failCount} failed`}
        </span>
        <div onClick={() => setFilterFailed(v => !v)} data-tap style={{ padding: '7px 13px', borderRadius: 3, background: filterFailed ? G.clsBg : G.card, border: `1px solid ${G.border}`, cursor: 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: filterFailed ? '#F2E5C0' : G.muted }}>
            {filterFailed ? '✓ Failures only' : 'Show failures only'}
          </span>
        </div>
      </div>

      {loading && (
        <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '20px 0', textAlign: 'center', margin: 0 }}>Loading provision log…</p>
      )}

      {!loading && rows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '22px 16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: 0 }}>
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
          <div key={r.id} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 10, overflow: 'hidden' }}>
            <div onClick={() => setExpanded(isOpen ? null : r.id)} data-tap style={{ padding: '13px 16px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: badgeColor, padding: '2px 7px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{badgeLabel}</span>
                {r.status_code != null && (
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: G.muted }}>HTTP {r.status_code}</span>
                )}
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, marginLeft: 'auto' }}>
                  {new Date(r.attempted_at).toLocaleString()}
                </span>
              </div>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: '0 0 3px' }}>
                {r.hostname || `${r.slug}.groundslive.com`}
              </p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: 0, lineHeight: 1.5 }}>
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: `1px solid ${G.border}`, gap: 12 }}>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 13, color: G.text, textAlign: 'right', maxWidth: '65%', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}
