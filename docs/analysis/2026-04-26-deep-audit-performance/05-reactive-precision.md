# 05 Reactive Precision

## Scope

- Dimension 05 first pass focused on `packages/flux-react/src/hooks.ts`, `packages/flux-renderers-form/src/field-utils.tsx`, form-advanced field controllers, and workbench page shells.
- Independent review re-checked the high-risk subscription findings against live code.

## Review Summary

- First-pass candidate count: 6
- Independently reviewed: 2 groups
- Retained: 2
- Downgraded: 1
- Rejected: 0

## Retained Findings

### [Dimension05] `useCurrentFormState` still wakes field-level selectors through whole-store subscription
- **Status**: Downgraded and retained
- **Files**:
  - `packages/flux-react/src/hooks.ts:225-241`
  - `packages/flux-renderers-form/src/field-utils.tsx:75-80`
  - `packages/flux-renderers-form/src/field-utils.tsx:368-390`
- **Severity**: P2
- **Subscription location**: `useCurrentFormState(...)`
- **Current scope**: `form?.store.subscribe` + `form?.store.getState()` subscribe to the full form store.
- **Actual need**: Many runtime call sites only read one field value or one field presentation slice.
- **Evidence**:
```ts
// packages/flux-react/src/hooks.ts:232-241
const subscribe = useMemo(
  () => (enabled ? form?.store.subscribe ?? (() => () => undefined) : () => () => undefined),
  [enabled, form]
);
const getSnapshot = useMemo(
  () => (enabled ? () => form?.store.getState() ?? EMPTY_FORM_STORE_STATE : () => EMPTY_FORM_STORE_STATE),
  [enabled, form]
);
return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, selector, equalityFn);
```
```ts
// packages/flux-renderers-form/src/field-utils.tsx:75-80
const formValue = useCurrentFormState(
  currentForm ? (state) => (name ? getIn(state.values, name) : state.values) : () => UNUSED_VALUE,
  eq
);
```
```ts
// packages/flux-renderers-form/src/field-utils.tsx:368-390
const currentPresentation = useCurrentFormState(
  (state) => selectCurrentFormFieldPresentation(state, {
    path: name,
    ...
  }),
  (left, right) => ...
);
```
- **Risk**: The equality function suppresses many rerenders, but unrelated form updates still wake these selectors and recompute them. This keeps the codebase short of the P7 per-path target on large forms.
- **Independent review outcome**: Keep as a performance debt, not a high-severity correctness bug. The current implementation is partially mitigated by `useSyncExternalStoreWithSelector` equality checks and existing per-path hooks for field-state/error reads.

### [Dimension05] Condition builder equality uses `JSON.stringify` inside the field subscription path
- **Status**: Retained
- **Files**:
  - `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:48-52`
  - `packages/flux-renderers-form-advanced/src/condition-builder/utils.ts:18-20`
  - `packages/flux-renderers-form/src/field-utils.tsx:75-80`
- **Severity**: P2
- **Subscription location**: `useFormFieldController(... areValuesEqual: groupValuesEqual)`
- **Current scope**: Whole-form subscription path via `useBoundFieldValue` -> `useCurrentFormState`.
- **Actual need**: Equality for the current condition-tree field only.
- **Evidence**:
```ts
// packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:48-52
const { currentForm, value, handlers, presentation } = useFormFieldController(name, {
  disabled: props.meta.disabled,
  required: Boolean(props.props.required),
  areValuesEqual: groupValuesEqual,
});
```
```ts
// packages/flux-renderers-form-advanced/src/condition-builder/utils.ts:18-20
export function groupValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}
```
- **Risk**: Condition-builder values are recursive trees. Any unrelated form-store update can still trigger deep serialization work in the equality function, making condition editing and validation paths more expensive than they need to be.
- **Independent review outcome**: Keep. This is a real hot-path deep-comparison issue, not just a theoretical style preference.

## Independently Confirmed Non-Issues

- `packages/flux-react/src/hooks.ts:295-343` `useCurrentFormFieldState()` already prefers `subscribeToPath(path, listener)` and only falls back to full subscribe when path subscription is unavailable.
- `packages/flux-react/src/node-renderer.tsx` uses dependency-path filtering before notifying, so it should not be reported as a broad invalidation issue in this audit.
