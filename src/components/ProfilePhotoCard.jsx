// ProfilePhotoCard — lives in the Profile section of Settings.
// Lets a member upload (or capture) a photo, resize/compress it
// client-side, write it to club-assets storage, and persist the
// public URL on their members row.
//
// v0.15.26 — the resize/compress canvas glue moved to
// src/lib/imageResize.js so the admin PersonEditModal can share it.
//
// Auto-hides when the club has the profile_photos flag off.
import { useState, useRef } from 'react';
import { G } from '../theme.js';
import Avatar from './Avatar.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFlag } from '../hooks/useFlag.js';
import { supabase } from '../lib/supabase.js';
import { resizeToBlob } from '../lib/imageResize.js';
import { useConfirm } from './ConfirmModal.jsx';

export default function ProfilePhotoCard() {
  const { member, club, session, refreshMember } = useAuth();
  const enabled = useFlag('profile_photos');
  const confirmAsync = useConfirm(); // v0.16.8b — shared confirm modal
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const uploadRef = useRef(null);
  const captureRef = useRef(null);

  if (!enabled || !member?.id || !club?.id || !session?.user?.id) return null;

  const handleFile = async (file) => {
    if (!file || busy) return;
    setBusy(true); setErr(null);
    // v0.6.15: unique filename per upload — `avatar-<timestamp>.jpg`.
    // Eliminates the "already exists" conflict that bit us when an
    // upload was retried on a stale PWA cache or across devices.
    // Old files in the member folder get cleaned up below before the
    // new one lands so storage doesn't accumulate orphans.
    //
    // Path uses the auth user_id (not members.id) so the storage RLS
    // policy verifies ownership with auth.uid() — no cross-table
    // subquery, no permission-denied surprises (see migration 32).
    const folder = `${club.id}/members/${session.user.id}`;
    const filename = `avatar-${Date.now()}.jpg`;
    const path = `${folder}/${filename}`;
    try {
      const blob = await resizeToBlob(file);

      // Step 1a — list + remove any existing files in the member's
      // folder so we don't accumulate orphans. Best-effort: failures
      // here are ignored because the unique new filename guarantees
      // the next step won't conflict regardless.
      try {
        const { data: existing } = await supabase.storage
          .from('club-assets')
          .list(folder, { limit: 50 });
        if (existing && existing.length) {
          const old = existing.map(f => `${folder}/${f.name}`);
          await supabase.storage.from('club-assets').remove(old);
        }
      } catch (cleanupErr) {
        console.warn('[avatar] cleanup of old files failed (non-fatal)', cleanupErr);
      }

      // Step 1b — upload the new file at the unique path. No upsert,
      // no conflict path — always a fresh INSERT into storage.
      const { error: upErr } = await supabase.storage
        .from('club-assets')
        .upload(path, blob, { cacheControl: '3600', contentType: 'image/jpeg' });
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
    if (busy) return;
    if (!(await confirmAsync({
      title: 'Remove your profile photo?',
      confirmLabel: 'Remove',
      danger: true,
    }))) return;
    setBusy(true); setErr(null);
    try {
      // v0.6.15: file names are unique-per-upload now (avatar-<ts>.jpg)
      // so we list the folder and remove whatever's there rather than
      // hard-coding avatar.jpg. Best-effort on the storage side — a
      // failed delete leaves an orphan file but doesn't block the
      // members.photo_url=null update, which is what actually hides
      // the photo across the app.
      const folder = `${club.id}/members/${session.user.id}`;
      try {
        const { data: existing } = await supabase.storage
          .from('club-assets')
          .list(folder, { limit: 50 });
        if (existing && existing.length) {
          const paths = existing.map(f => `${folder}/${f.name}`);
          await supabase.storage.from('club-assets').remove(paths);
        }
      } catch (storageErr) {
        console.warn('[avatar] remove of storage files failed (non-fatal)', storageErr);
      }
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
