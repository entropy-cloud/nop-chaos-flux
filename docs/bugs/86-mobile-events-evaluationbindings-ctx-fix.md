# 86 Mobile Interaction Family Events Missing evaluationBindings Ctx (C7 P1)

## Problem

- The `flux-renderers-mobile` interaction family (pull-refresh / infinite-scroll / swipe-cell / countdown) dispatched their structured semantic events **without** the `event` / `evaluationBindings` / `scope` dispatch context — the family convention used by `steps` (`steps-renderer.tsx:196-200`), `button-group` (`button-group-renderer.tsx:82-86`) and fixed in `cards` (bug 83) / `diff-view` (C6.5 P1-10).
- Consequence: action args templates could NOT read the event payload fields:
  - `onRefresh` args like `${direction}` / `${threshold}` resolved to nothing.
  - `onLoadMore` args like `${source}` (intersection/immediate/retry) resolved to nothing.
  - `swipe-cell` `onAction`/`onOpen`/`onClose` args like `${side}` resolved to nothing.
  - `countdown` `onFinish` args (payload only carries `type`) had no ctx channel at all.
- The registration definitions also declared **no `eventContracts`** for these events (carousel P1-1/C6.4, diff-view P1-7/C6.5 precedent), so the advertised payload shapes (now documented in the design docs) had no machine-readable contract for designers/tooling.

## Diagnostic Method

- C7 mobile family audit (2026-08-05), dimension 7 (事件与 action 契约): compared every dispatch site against the family convention; the definitions file was checked against the eventContracts pattern used by content/layout/data packages.
- Existing unit tests asserted payload shapes (`{type:'refresh',...}` etc.) but never exercised action-args template resolution (false-green blind spot — same gap as bug 83).

## Root Cause

- Each renderer independently dispatched `props.events.onX?.(payload)` without the second `ctx` argument (`Partial<ActionContext>`), and the definitions omitted `eventContracts`. Single-point root causes per component (no shared helper involved) — fixed in-plan, no CX-n inserted (roadmap §7 Decision).

## Fix

- All structured dispatch sites now pass `{ event: payload, evaluationBindings: payload, scope }` (scope read via a `nodeScopeRef` so handler identities stay stable for the React Compiler):
  - `pull-refresh.tsx` onRefresh, `infinite-scroll.tsx` onLoadMore, `swipe-cell.tsx` onOpen/onClose/onAction, `countdown.tsx` onFinish.
  - `notice-bar` keeps raw native-event forwarding (link/card convention — no contract required, C6.1/C6.2 precedent).
- `mobile-renderer-definitions.ts` adds `eventContracts` for onRefresh / onLoadMore / onAction+onOpen+onClose / onFinish with the documented payload shapes.
- Design docs now document the payloads (`pull-refresh`/`infinite-scroll`/`swipe-cell`/`countdown` design.md §Events).

## Tests

- `packages/flux-renderers-mobile/src/__tests__/event-and-i18n-contract.test.tsx` — 4 cases, test-first (failed against the old implementation: `ctx` was `undefined`):
  1. pull-refresh onRefresh ctx.event/evaluationBindings === `{type:'refresh',direction:'down',threshold}`.
  2. infinite-scroll onLoadMore ctx === `{type:'loadmore',source:'immediate'}`.
  3. swipe-cell onOpen/onClose/onAction ctx === `{type:'open'|'close'|'action',side}`.
  4. countdown onFinish ctx === `{type:'finish'}`.
  - Same file also locks the en-US locale resolution of the mobile texts (coverage hardening, passes pre-fix).
- `mobile-renderer-definitions.test.tsx` — 4 new eventContracts shape assertions.
- Full package suite 160 → 168 green; typecheck/build/lint green.

## Affected Files

- `packages/flux-renderers-mobile/src/{pull-refresh,infinite-scroll,swipe-cell,countdown}.tsx`
- `packages/flux-renderers-mobile/src/mobile-renderer-definitions.ts`
- `docs/components/{pull-refresh,infinite-scroll,swipe-cell,countdown}/design.md`
- `packages/flux-renderers-mobile/src/__tests__/event-and-i18n-contract.test.tsx`
- `packages/flux-renderers-mobile/src/mobile-renderer-definitions.test.tsx`

## Notes For Future Refactors

- Renderers that dispatch events with a documented payload MUST pass `evaluationBindings: payload` (and `event: payload`) in the dispatch context — otherwise the advertised eventContracts are dead for action authors.
- Tests for event contracts must exercise args templates with payload references, not static values.
- When a dispatch handler is memoized (useCallback), read `props.node.scope` through a ref (`nodeScopeRef`) to keep the React Compiler memoization preserved.
