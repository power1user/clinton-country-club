// imageResize — shared client-side image downscale + JPEG re-encode.
//
// Extracted in v0.15.26 from ProfilePhotoCard's local resizeToBlob
// (and a near-identical copy that lived inline in AllPeopleAdmin's
// PersonEditModal.handlePhotoUpload). Both call sites had drifted to
// the same 800px / q=0.85 defaults; centralizing here keeps them in
// lockstep and removes ~20 lines of duplicate canvas glue.
//
// Why canvas-resize instead of a library: keeps the bundle slim
// (~0 KB vs ~30 KB for browser-image-compression). Phone-sized
// photos at 800px max edge + 0.85 quality JPEG land well under
// 200KB in practice (typical ~50-120KB).
//
// Returns a Blob (NOT a File) — Supabase storage.upload accepts both.

export async function resizeToBlob(file, { maxEdge = 800, quality = 0.85 } = {}) {
  const img = await createImageBitmap(file);
  const ratio = Math.min(maxEdge / img.width, maxEdge / img.height, 1);
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));
  // OffscreenCanvas isn't on every Safari version — fall back to a
  // hidden DOM canvas if needed.
  let blob;
  if (typeof OffscreenCanvas !== 'undefined') {
    const off = new OffscreenCanvas(w, h);
    const ctx = off.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    blob = await off.convertToBlob({ type: 'image/jpeg', quality });
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
  }
  img.close?.();
  return blob;
}
