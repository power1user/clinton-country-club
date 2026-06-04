// AllPeopleAdmin — v0.15.1 unified people view.
//
// Shows every person with ANY relation to the current club (member,
// guest, or staff) merged into one row. Calls all_people_at_club()
// RPC (migration 77).
//
// Read-only this patch. v0.15.2+ adds conversion/promote/demote
// actions per row.

import { useState, useEffect, useMemo } from 'react';
import { G } from '../../theme.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../hooks/useAuth.jsx';

function RelationChip({ rel }) {
  let label;
  let bg;
  if (rel.kind === 'member') {
    label = `Member${rel.status === 'pending' ? ' (pending)' : ''}`;
    bg = rel.status === 'pending' ? G.brass : G.green;
  } else if (rel.kind === 'guest') {
    label = `Guest${rel.status === 'pending_authentication' ? ' (unverified)' : ''}`;
    bg = rel.status === 'pending_authentication' ? G.brass : G.greenMid;
  } else if (rel.kind === 'staff') {
    label = rel.role === 'club_manager' ? 'Manager' : 'Admin';
    bg = G.brass;
  } else {
    label = rel.kind;
    bg = G.muted;
  }
  return (
    <span style={{
      fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0',
      background: bg, padding: '2px 8px', borderRadius: 2,
      textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700,
      flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

export default function AllPeopleAdmin() {
  const { club } = useAuth();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all | member | guest | staff

  useEffect(() => {
    if (!club?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setErr(null);
      const { data, error } = await supabase.rpc('all_people_at_club', { p_club_id: club.id });
      if (cancelled) return;
      if (error) setErr(error.message);
      else setPeople(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [club?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (people || []).filter(p => {
      if (filter === 'member' && !p.is_member) return false;
      if (filter === 'guest'  && !p.is_guest)  return false;
      if (filter === 'staff'  && !p.is_staff)  return false;
      if (!q) return true;
      return (p.name || '').toLowerCase().includes(q)
          || (p.email || '').toLowerCase().includes(q)
          || (p.phone || '').includes(q);
    });
  }, [people, query, filter]);

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 12px' }}>
        Every person with a relationship to {club?.name || 'this club'} — members, guests, and staff in one view. Identity data (name, email, phone) comes from the unified <code style={{ background: 'rgba(122,172,136,0.14)', padding: '0 4px', borderRadius: 2 }}>people</code> table; relationships and per-club data come from <code style={{ background: 'rgba(122,172,136,0.14)', padding: '0 4px', borderRadius: 2 }}>members</code>, <code style={{ background: 'rgba(122,172,136,0.14)', padding: '0 4px', borderRadius: 2 }}>guests</code>, and <code style={{ background: 'rgba(122,172,136,0.14)', padding: '0 4px', borderRadius: 2 }}>user_roles</code>.
      </p>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { id: 'all',    l: `All (${people.length})` },
          { id: 'member', l: `Members (${people.filter(p => p.is_member).length})` },
          { id: 'guest',  l: `Guests (${people.filter(p => p.is_guest).length})`   },
          { id: 'staff',  l: `Staff (${people.filter(p => p.is_staff).length})`    },
        ].map(f => (
          <div key={f.id} onClick={() => setFilter(f.id)} data-tap
            style={{
              padding: '6px 14px', borderRadius: 14,
              background: filter === f.id ? G.brass : G.card,
              border: `1px solid ${filter === f.id ? G.brass : G.border}`,
              cursor: 'pointer',
            }}>
            <span style={{
              fontFamily: '"Lora",serif', fontSize: 12,
              color: filter === f.id ? '#F2E5C0' : G.muted,
              fontWeight: filter === f.id ? 600 : 400,
            }}>{f.l}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search name, email, phone…"
        style={{
          width: '100%', boxSizing: 'border-box', padding: '10px 12px',
          border: `1px solid ${G.border}`, borderRadius: 4,
          fontFamily: '"Lora",serif', fontSize: 13, color: G.text,
          background: G.card, outline: 'none', marginBottom: 14,
        }}
      />

      {loading ? (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0' }}>
          Loading people…
        </p>
      ) : err ? (
        <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, padding: '10px 0' }}>
          {err}
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, padding: '20px 0' }}>
          No people match.
        </p>
      ) : (
        <div style={{ background: G.card, borderRadius: 4, border: `1px solid ${G.border}` }}>
          {filtered.map((p, i) => (
            <div key={p.auth_user_id} style={{
              display: 'flex', alignItems: 'center', padding: '12px 14px',
              borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 10,
            }}>
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: p.photo_url ? `center/cover url(${p.photo_url})` : G.green,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {!p.photo_url && (
                  <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 700 }}>
                    {(p.name || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Name + email + phone */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name || '(unnamed)'}
                </p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.email}{p.phone ? ` · ${p.phone}` : ''}
                </p>
              </div>

              {/* Relation chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end', flexShrink: 0 }}>
                {(p.relations || []).map((rel, j) => (
                  <RelationChip key={j} rel={rel} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '14px 0 0', textAlign: 'center' }}>
        Conversion actions (guest → member, member → staff, etc.) coming in v0.15.2.
      </p>
    </div>
  );
}
