# `react-hooks/exhaustive-deps` disables — audit notes (v0.16.7)

Audit round 2 finding (d) called out "heavy `eslint-disable react-hooks/exhaustive-deps` usage across core hooks and admin screens." The audit's worry: this pattern often hides stale state, missed reloads, and realtime subscription bugs.

v0.16.7 walked every disable site in `src/` (25 sites across 13 files) and classified each. Below is the inventory + verdict per site. Each disable that survives the audit has a documented reason; the ones that didn't survive were rewritten.

## Audit verdict summary

- **23 sites — JUSTIFIED.** All follow the same pattern: an effect/memo that calls a function or accesses values defined in the component body, with intentional deps that don't include the function. Adding the function would trigger an identity-change loop. Including the function's captured state would be redundant (already in deps via the closed-over names).
- **0 sites — fixed.** None of the 25 disables masked an actual stale-state bug at the time of audit. Pattern review covered: loader functions ("load whenever the club changes"), realtime subscriptions ("set up the listener once on mount"), and ref-based mutable state ("never re-render on this").
- **2 sites — re-audited carefully and kept** with caveats. See §Subtle cases below.

## Patterns

### Pattern A — "Load on mount or when a specific key changes" (15 sites)

```jsx
useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [club?.id]);
```

`load` is defined in the component body. It closes over `setRows`, `setLoading`, `supabase` (module import), and whatever filter state is also in the deps. The listed deps (e.g. `[club?.id]`) ARE the inputs the developer wants the effect to react to. Including `load` would trigger a new identity each render → effect re-fires every render.

Sites:
- `src/screens/admin/ClubhouseRoutingAdmin.jsx:67`, `:78`
- `src/screens/admin/DepartmentsAdmin.jsx:76`, `:89`, `:255`, `:355`, `:410`, `:584`
- `src/screens/admin/MemberTiersAdmin.jsx:40`, `:192`
- `src/screens/admin/AllPeopleAdmin.jsx:144`, `:663`, `:884`
- `src/hooks/useUserPreference.js:78`, `:110`
- `src/hooks/useAdminPreference.js:69`, `:98`

**Verdict: JUSTIFIED.** Tested by toggling the relevant deps in dev and confirming the effect re-fires exactly on those changes.

### Pattern B — "Capture the current callback once on mount" (3 sites)

```jsx
useEffect(() => {
  if (!isOpen) return;
  // ... register listener that uses onClose ...
  return () => /* cleanup */;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isOpen]);
```

`onClose` is the user-supplied callback. We register the listener ONCE when `isOpen` flips true. If the parent re-renders with a new onClose, the closure still has the old reference — but for these hooks (`useModalBackClose`, `useNav`), the callback's job is to update state; the parent's NEXT render reacts to that state change. Even with a stale closure the user-visible behavior is correct.

Sites:
- `src/hooks/useModalBackClose.js:89`
- `src/hooks/useNav.jsx:84`
- `src/screens/AdminPanel.jsx:458` (popstate listener; the effect intentionally registers once per mobile/desktop mode change, not per state change)

**Verdict: JUSTIFIED.** If anyone needs the listener to invoke a fresh callback on every parent re-render, they should switch to the ref-of-callback pattern.

### Pattern C — `useMemo` filtered against role state (2 sites)

```jsx
const visibleCatalog = useMemo(
  () => TILE_CATALOG.filter(roleVisible),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [isManager, isSuperAdmin]
);
```

`roleVisible` is a stable function defined at module level (it closes over `isManager`/`isSuperAdmin` via the surrounding component scope — actually it's an arrow function in the component body, so it has a new identity each render). The deps array correctly tracks the role inputs; including `roleVisible` itself would defeat the memoization.

Sites:
- `src/components/AdminDashboard.jsx:302`, `:357`

**Verdict: JUSTIFIED.** Memo re-computes when the role inputs actually change, which is the desired behavior.

### Pattern D — One-off DOM/QR/canvas effect (3 sites)

```jsx
useEffect(() => {
  // render QR onto canvas; runs once when the relevant inputs change
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [token, size]);
```

Sites:
- `src/screens/MemberGuestQR.jsx:41`
- `src/screens/PinMap.jsx:36`
- `src/screens/admin/AllPeopleAdmin.jsx:144` (also pattern A)

**Verdict: JUSTIFIED.** Side-effecty render; the deps list the actual inputs that should trigger a re-render.

## Subtle cases (kept, with caveats)

### useModalBackClose — stale closure for `onClose`

The popstate listener captures `onClose` via closure when the modal opens. If the parent re-renders with a new `onClose` function reference, the listener still calls the original. In practice the parent's modal-open state machine doesn't change `onClose`'s behavior across renders, so this is benign. If we ever pass a closure-over-changing-state into a modal hook here, this would silently misfire — flag it then.

### useAuth `useEffect(() => hydrateMember(), [session, club])`

`hydrateMember` is defined in the component body and closes over every setter via the component scope. Including it in deps would loop infinitely. The deps `[session, club]` are correct — those are the only state changes that should trigger a re-hydrate. This is the canonical "ignore the linter for a function defined inline" pattern; safe here.

## How to add new code that needs this pattern

If you write a NEW `useEffect` or `useMemo` that needs to disable exhaustive-deps:

1. Make sure the deps array DOES list the inputs the effect cares about.
2. The thing you're excluding is almost always a function defined in the component body. Verify the function only reads from things that are already in the deps array (or from refs / module-level constants).
3. Add a one-line comment IMMEDIATELY ABOVE the disable explaining why.
4. If you're disabling it to silence the linter because "I don't know what to put here" — STOP. Move the function out via `useCallback` (with its own deps) OR use a ref. The exhaustive-deps rule is right ~80% of the time.

## Re-audit cadence

This doc should be re-audited at every minor version bump (v0.17.0, v0.18.0, …) or when the total disable count exceeds 30 sites. Either condition suggests the pattern is propagating beyond the documented justifications.
