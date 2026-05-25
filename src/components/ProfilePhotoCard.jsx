// ProfilePhotoCard — lives in the Profile section of Settings.
// Lets a member upload (or capture) a photo, resize/compress it
// client-side, write it to club-assets storage, and persist the
// public URL on their members row.
//
// Why canvas-resize instead of a library: keeps the bundle slim
// (~0 KB vs ~30 KB for browser-image-compression). Phone-sized
// photos at 800px max edge + 0.85 quality JPEG land well under
// 200KB in practice (typical ~50-120KB).
//
// Auto-hides when the club has the profile_photos flag off.
import { useState, useRef } from 'react';
import { G } from '../theme.js';
import Avatar from './Avatar.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFlag } from '../hooks/useFlag.js';
import { supabase } from '../lib/supabase.js';

const MAX_EDGE_PX = 800;
const JPEG_QUALITY = 0.85;

// Pull pixels off the file, scale to MAX_EDGE_PX max edge, re-encode
// JPEG. Returns a Blob (NOT a File) — Supabase storage accepts both.
async function resizeToBlob(file) {
  const img = await createImageBitmap(file);
  const ratio = Math.min(MAX_EDGE_PX / img.width, MAX_EDGE_PX / img.height, 1);
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));
  // OffscreenCanvas isn't on every Safari version — fall back to a
  // hidden DOM canvas if needed.
  let blob;
  if (typeof OffscreenCanvas !== 'undefined') {
    const off = new OffscreenCanvas(w, h);
    const ctx = off.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    blob = await off.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', JPEG_QUALITY));
  }
  img.close?.();
  return blob;
}

export default function ProfilePhotoCard() {
  const { member, club, session, refreshMember } = useAuth();
  const enabled = useFlag('profile_photos');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const uploadRef = useRef(null);
  const captureRef = useRef(null);

  if (!enabled || !member?.id || !club?.id || !session?.user?.id) return null;

  const handleFile = async (file) => {
    if (!file || busy) return;
    setBusy(true); setErr(null);
    // Path uses the auth user_id (not members.id) so the storage RLS
    // policy verifies ownership with auth.uid() — no cross-table
    // subquery, no chance of "permission denied" from a subtle RLS
    // interaction (see migration 32).
    const path = `${club.id}/members/${session.user.id}/avatar.jpg`;
    try {
      const blob = await resizeToBlob(file);

      // Step 1 — upload to storage. If THIS errors, it's a storage
      // bucket RLS issue or a network problem. Tag the message so we
      // can tell upload-vs-db failures apart in the UI.
      const { error: upErr } = await supabase.storage
        .from('club-assets')
        .upload(path, blob, { upsert: true, cacheControl: '3600', contentType: 'image/jpeg' });
      if (upErr) {
        console.error('[avatar] storage.upload failed', { path, error: upErr });
        throw new Error(`Storage upload failed: ${upErr.message || JSON.stringify(upErr)}`);
      }

      // Step 2 — write the public URL to members. If this errors, it's
      // the members UPDATE RLS (should never happen — user_id =
      // auth.uid() is in the policy) or a network problem.
      const { data: pub } = supabase.storage.from('club-assets').getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase
        .from('members')
        .update({ photo_url: url })
        .eq('id', member.id);
      if (dbErr) {
        console.error('[avatar] members.update failed', { memberId: member.id, error: dbErr });
        throw new Error(`Saving photo to your profile failed: ${dbErr.message || JSON.stringify(dbErr)}`);
      }

      await refreshMember?.();
    } catch (e) {
      // Surface the actual message so we can debug. Friendly summary
      // up top + the raw underlying message below.
      const raw = e?.message || String(e);
      setErr(raw);
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async () => {
    if (busy || !confirm('Remove your profile photo?')) return;
    setBusy(true); setErr(null);
    try {
      const path = `${club.id}/members/${session.user.id}/avatar.jpg`;
      // Best-effort delete; don't block on storage failures (file may
      // not exist after a previous failed upload).
      await supabase.storage.from('club-assets').remove([path]);
      const { error } = await supabase.from('members').update({ photo_url: null }).eq('id', member.id);
      if (error) throw error;
      await refreshMember?.();
    } catch (e) {
      setErr(e?.message || "Couldn't remove the photo. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: '14px 16px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar photoUrl={member.photo_url} name={member.name} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 2px' }}>Profile photo</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, lineHeight: 1.45 }}>
            Shown on your membership card, in the directory, and on your posts.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <label style={{ flex: 1, padding: '8px 10px', background: G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>
            {busy ? 'Saving…' : member.photo_url ? 'Change' : 'Upload'}
          </span>
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => handleFile(e.target.files?.[0])}
            style={{ display: 'none' }}
          />
        </label>
        <label style={{ flex: 1, padding: '8px 10px', border: `1px solid ${G.border}`, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer', background: G.bg, opacity: busy ? 0.6 : 1 }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, fontWeight: 500 }}>Camera</span>
          <input
            ref={captureRef}
            type="file"
            accept="image/*"
            capture="user"
            disabled={busy}
            onChange={(e) => handleFile(e.target.files?.[0])}
            style={{ display: 'none' }}
          />
        </label>
        {member.photo_url && (
          <div onClick={busy ? undefined : removePhoto} data-tap style={{ padding: '8px 10px', cursor: busy ? 'wait' : 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, textDecoration: 'underline', textUnderlineOffset: 2 }}>Remove</span>
          </div>
        )}
      </div>
      {err && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.clsDot, margin: '8px 0 0' }}>{err}</p>
      )}
    </div>
  );
}
