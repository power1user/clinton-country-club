// BottomSheetModal — shared shell for the bottom-anchored admin modals.
//
// Extracted in v0.15.26. Before this, every bottom-sheet modal in the
// admin (AddDepartmentModal, DepartmentDetailModal, AddStaffToDepartmentModal,
// TierEditModal, PeopleCsvImportModal) inlined an identical wrapper:
//   - dark overlay click-to-close
//   - body that stops propagation
//   - rounded-top sheet pinned to bottom
//   - title row + close X
//   - useModalBackClose for the phone back button
// Centralizing eliminates ~15 lines per modal and guarantees they
// all behave identically (z-index, back-button, scroll).
//
// NOT for centered modals (PersonEditModal's identity-strip top is
// custom; AddPersonPicker + ClubhouseRoutingAdmin's Preview are
// centered, not bottom-sheet).

import { useModalBackClose } from '../hooks/useModalBackClose.js';
import { G } from '../theme.js';

export default function BottomSheetModal({ title, subtitle, onClose, children, zIndex = 25 }) {
  useModalBackClose(true, onClose);
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: subtitle ? 6 : 14, gap: 10 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0, flex: 1, minWidth: 0 }}>{title}</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>
        {subtitle && (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '0 0 14px', lineHeight: 1.55 }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
