// DateInput — drop-in replacement for `<input type="date">` that
// survives Chrome's partial-typing behavior.
//
// THE BUG WE'RE FIXING (v0.19.10):
//   While a user is mid-typing the year segment of a native date
//   input, Chrome fires `change` (and React's `onChange`) with
//   `e.target.value === ""` because the date isn't a complete
//   YYYY-MM-DD yet. If the parent component is a controlled input
//   that echoes that "" back into the `value` prop, React resets
//   the DOM attribute to "" — and setting `value=""` on a date
//   input WIPES ALL THREE SEGMENTS, not just the one being typed.
//   Net effect: user has 06/30/2026, selects the year to retype it,
//   types "2" intending "2027", and watches the month and day
//   disappear too. The next keystroke goes nowhere because there's
//   no longer a valid date in the field for the browser to extend.
//
//   In NewsAdmin specifically, the bug was compounded by an extra
//   ISO round-trip in the setter (`new Date('${v}T23:59:59').toISOString()`)
//   that ran on every keystroke. That made the wipe deterministic
//   and is what Marc reported.
//
// HOW THIS WRAPPER SIDESTEPS IT:
//   1. Uncontrolled internally — `defaultValue` at mount, no `value`
//      prop on the underlying input. React never tries to set the
//      DOM value during render.
//   2. External value changes sync to the input via useEffect, BUT
//      only when the input is not the active element. That way we
//      catch programmatic updates (e.g. the Event-date field auto-
//      filling the Archive-on default) without interrupting the
//      user's in-progress edit.
//   3. onChange only forwards NON-EMPTY values. Chrome's partial-
//      date empty-string blips during typing get swallowed; the
//      parent's saved state stays intact. Once the year segment
//      fills and the date becomes valid again, the wrapper forwards
//      the complete YYYY-MM-DD.
//
//   The intentional trade-off: there's no direct way to clear the
//   field via this component. Anywhere a clear is needed, pair it
//   with an explicit affordance (NewsAdmin already has a "Never"
//   button next to its Archive-on input; range filters can re-type
//   over the value). This avoids the impossible task of telling
//   "user wants to clear" apart from "Chrome briefly emitted empty
//   because the year segment isn't finished yet."
//
// ICON-LEFT TREATMENT:
//   The component applies a `date-input` className. The matching CSS
//   rule (src/index.css) moves the Chrome/Edge calendar-picker icon
//   to the LEFT of the digits so it's discoverable without scanning
//   to the right edge of the field. Mobile Safari and Firefox use
//   different picker UI so the rule is a no-op there.

import { useEffect, useRef } from 'react';

export default function DateInput({ value, onChange, style, className, ...rest }) {
  const ref = useRef();

  useEffect(() => {
    if (!ref.current) return;
    // Don't yank the value out from under a user who's mid-typing.
    if (document.activeElement === ref.current) return;
    const next = value || '';
    if (ref.current.value !== next) {
      ref.current.value = next;
    }
  }, [value]);

  // padding-left makes room for the relocated picker icon. Goes
  // AFTER the spread so it wins over a callsite's `padding: '10px 12px'`
  // shorthand (which would otherwise set paddingLeft to 12).
  const mergedStyle = { ...style, paddingLeft: 36 };
  const mergedClassName = className ? `date-input ${className}` : 'date-input';

  return (
    <input
      {...rest}
      ref={ref}
      type="date"
      className={mergedClassName}
      defaultValue={value || ''}
      onChange={(e) => {
        const v = e.target.value;
        if (v) onChange?.(v);
      }}
      style={mergedStyle}
    />
  );
}
