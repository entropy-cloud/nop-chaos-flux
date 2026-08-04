# 83 Cards Event Payload Not Injected Into Action Args (evaluationBindings Contract Drift)

## Problem

- `cards` dispatched its events (`onItemClick` / `onSelectionChange`) without the `event` / `evaluationBindings` context — the family convention used by `steps` (`steps-renderer.tsx:196-200`) and `button-group` (`button-group-renderer.tsx:82-86`) is `dispatch(payload, { event: payload, evaluationBindings: payload, scope })`.
- Consequence: action args templates could NOT read the documented event payload fields (`cards-renderer-definitions.ts:238-256` eventContracts declare `{item, index, key}` and `{selectedKeys, selectionMode}`):
  - `onSelectionChange` args like `${selectedKeys}` / `${selectionMode}` resolved to nothing → the `setValue` report action silently never ran (host scenario showed `single-report:pending` forever).
  - `onItemClick` args like `${item.label}` only worked by ACCIDENT — the field shadows the per-row `itemScope` data (`helpers.createScope({ item, index })`), not the event payload; payload-only fields (`${key}`) were unresolvable.
- The contract advertised payload shapes that authors could not consume — event-contract drift.

## Diagnostic Method

- C6.2 component audit, dimension 7 (事件与 action 契约): compared the cards dispatch sites against the steps/button-group family convention; the browser host scenario (`host-cards-select`) empirically showed the payload report never arriving.
- Existing unit tests missed it: `cards-renderer.test.tsx` used a STATIC `value: true` in the `onSelectionChange` args — no payload template was ever exercised (false-green blind spot).

## Root Cause

- `cards-renderer.tsx` dispatched `props.events.onSelectionChange?.(payload, { scope: props.node.scope })` and `onItemClick` with only `{ scope: itemScope }` — missing `event: payload, evaluationBindings: payload` that the runtime's `withEvaluationBindings` (`action-core.ts` `getEvaluationScope`) uses to surface payload fields to args templates.

## Fix

- Both dispatch sites now pass `event: payload` + `evaluationBindings: payload` (same shape as steps/button-group). The per-row itemScope dispatch scope is unchanged, so `setValue` write targeting semantics are untouched.

## Tests

- `packages/flux-renderers-content/src/cards-selection-itemaction.test.tsx` — 2 new cases, test-first (failed against the old implementation):
  1. `onItemClick` args `${item.label}|${index}|${key}` → `Beta|1|b` (payload fields reachable).
  2. `onSelectionChange` args `${selectedKeys.join(",")}|${selectionMode}` → `a,c|multiple` after accumulating two cards.
- Browser host (`tests/e2e/component-lab/c6-2-host-surfaces.spec.ts` host-cards-action): probe receives `Beta|2` — `item.label` from the per-row scope AND `key` from the event payload, both resolving for the CLICKED row.
- Full package suite 248 → 254 green; c6-2 host spec 7/7.

## Affected Files

- `packages/flux-renderers-content/src/cards-renderer.tsx`
- `packages/flux-renderers-content/src/cards-selection-itemaction.test.tsx`
- `apps/playground/src/component-lab/renderers/data-c6c2-host.ts` (host scenario)

## Notes For Future Refactors

- Renderers that dispatch events with a documented payload MUST pass `evaluationBindings: payload` (and `event: payload`) in the dispatch context — otherwise the advertised eventContracts are dead for action authors.
- Tests for event contracts must exercise args templates with payload references, not static values.
