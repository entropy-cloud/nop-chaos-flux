# Reactive Read Vs Imperative Read

## Purpose

This rule captures recurring bugs where render paths use imperative state reads instead of subscribed reactive selectors.

Use it when reviewing renderers, probes, host-scope consumers, and any React component that reads scope or store state during render.

## Scope

Apply this rule when code changes touch any of the following:

- React components reading `scope`, store, or host data in render
- diagnostic probes and test helpers that assert reactive UI behavior
- direct scope/store reads such as `scope.get()`, `scope.readOwn()`, or other one-shot accessors
- hooks intended to expose reactive values to JSX

## Required Pattern

### 1) Render-time reactive values must use subscribed selector APIs

- If the component must re-render when the value changes, use a subscribed selector hook.
- Imperative reads are one-shot reads only; they do not establish a subscription.
- Do not use imperative reads as if they were reactive bindings.
- Preferred reactive APIs are `useScopeSelector`, `useOwnScopeSelector`, `useCurrentFormState`, and other owner/store selector hooks that establish the actual subscription boundary for the rendered value.

Review checks:

- Search React component bodies for direct `scope.get()`, `scope.readOwn()`, `scope.read()`, or store snapshot calls.
- Check whether the component expects the value to update reactively.
- Replace render-time imperative reads with the supported selector hook that matches the real owner boundary when reactivity is required.

### 2) Diagnostics must include a contrasting case that defeats lucky defaults

- A default or fallback can make one example row/value appear correct even when the binding is broken.
- Do not trust one row or one boolean branch when the component may be reading `undefined`.
- Tests should include a contrasting second case when fallback semantics could mask the bug.

Review checks:

- When the UI shows a boolean/default-looking value, verify a second row/value with the opposite result.
- Check whether the passing result could be explained by a fallback like `Boolean(undefined) === false`.

## Allowed Exceptions

- Imperative reads are allowed in event handlers, commands, effects, and one-shot computations that do not need reactive rerendering.
- Test-only probes may use imperative reads when they explicitly verify one-shot behavior rather than reactive UI updates.

## Review Checklist

- Render-time reactive values are read through subscribed selector APIs.
- Imperative reads are limited to one-shot or command/effect paths.
- Tests include contrasting values when defaults/fallbacks could hide the bug.
- Cross-package reactive flows are traced through the full subscription boundary when behavior looks stale.

## Evidence From This Repository

- `docs/bugs/22-spreadsheet-integration-test-scope-reactive-read-fix.md`
- `docs/bugs/23-stale-js-artifacts-shadow-source-in-vitest-fix.md`
- `docs/bugs/35-performance-table-form-control-isolated-cell-scope-binding-fix.md`

## Primary Architecture Anchors

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-core.md`
