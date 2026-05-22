// iOS-style on/off toggle. Used wherever a boolean setting needs a
// clearer affordance than a plain checkbox — e.g. enable_member_dms
// in Club Settings.
//
//   <Toggle checked={form.enable_member_dms} onChange={v => set('...', v)} />
import { G } from '../theme.js';

export default function Toggle({ checked, onChange, disabled = false, ariaLabel }) {
  const onClick = (e) => {
    e.preventDefault?.();
    if (disabled) return;
    onChange?.(!checked);
  };
  const width = 44;
  const height = 26;
  const padding = 3;
  const knob = height - padding * 2;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        width, height,
        borderRadius: height / 2,
        background: checked ? G.green : '#BDB39E',
        border: 'none',
        padding: 0,
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'background 0.18s ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: padding,
          left: checked ? width - knob - padding : padding,
          width: knob, height: knob,
          borderRadius: '50%',
          background: '#F2EDE0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          transition: 'left 0.18s ease',
        }}
      />
    </button>
  );
}
