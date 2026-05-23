// Wraps a write action. If the current user is a pending member AND
// the club's pending_member_access is 'read_only', renders a friendly
// notice instead of the children. Otherwise passes through.
//
//   <PendingGuard action="place an order">
//     <PlaceOrderButton />
//   </PendingGuard>
import { G } from '../theme.js';
import { useAuth } from '../hooks/useAuth.jsx';

export default function PendingGuard({ children, action = 'do that', inline = false }) {
  const { canMemberWrite, club } = useAuth();
  if (canMemberWrite) return children;

  if (inline) {
    return (
      <div style={{ padding: '10px 14px', background: 'rgba(155,122,30,0.10)', border: `1px solid ${G.brass}`, borderRadius: 4, textAlign: 'center' }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brass, margin: 0, lineHeight: 1.5 }}>
          Membership pending — you can {action} once {club?.name || 'the club'} approves your account.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 16px', textAlign: 'center' }}>
      <div style={{ display: 'inline-block', padding: '14px 18px', background: G.card, border: `1px solid ${G.brass}`, borderRadius: 6, maxWidth: 360 }}>
        <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 15, color: G.text, margin: '0 0 6px' }}>Membership pending</p>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: 0, lineHeight: 1.55 }}>
          You can {action} once {club?.name || 'the club'} approves your account. Reach out to the front office if you haven't heard back.
        </p>
      </div>
    </div>
  );
}
