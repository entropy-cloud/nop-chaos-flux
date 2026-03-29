# Conformance Audit 01: Renderer and Styling

Date: 2026-03-29

## Baseline Documents

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/styling-system.md`
- `docs/architecture/bem-removal.md`

## Findings

### 1) Renderer injects implicit layout classes

Severity: Medium

Requirement summary:

- Renderer should provide structural identity markers.
- Implicit layout injection (for example `grid`, `gap-*`) is explicitly discouraged in styling contract.

Evidence:

- `packages/flux-renderers-basic/src/page.tsx:13` uses `nop-page grid gap-4`.
- `packages/flux-renderers-data/src/table-renderer.tsx:16` uses `nop-table-wrap grid gap-4`.
- `packages/flux-renderers-data/src/table-renderer.tsx:56` uses `nop-table__actions flex flex-wrap gap-3`.

Impact:

- Layout behavior is partially hidden in renderer code instead of being fully schema-visible.
- Weakens author predictability for classAliases/className-first styling.

Recommendation:

- Keep marker classes (for example `nop-page`, `nop-table-wrap`, `nop-table__actions`).
- Move default layout classes to schema-level `className` or shared class aliases.

---

### 2) New `--` modifier class outside allowed exception set

Severity: Low

Requirement summary:

- BEM removal guide allows only a very small set of `--` semantic exceptions.
- New `--` modifiers should not be introduced broadly.

Evidence:

- `packages/flux-renderers-basic/src/icon.tsx:62` emits dynamic `nop-icon--${icon}`.

Impact:

- Increases marker-system entropy and weakens the documented migration endpoint.

Recommendation:

- Remove dynamic modifier class.
- Keep `nop-icon` plus `data-icon` for semantic targeting.

## Conforming Areas (checked)

### A) Context split and hook boundary are consistent with renderer-runtime design

Evidence:

- `packages/flux-react/src/contexts.ts:13` to `packages/flux-react/src/contexts.ts:19` show split contexts (runtime, scope, action-scope, component registry, form, page, node meta).
- `packages/flux-react/src/hooks.ts:22` to `packages/flux-react/src/hooks.ts:142` exports matching hook surface (`useRendererRuntime`, `useRenderScope`, `useCurrentActionScope`, `useCurrentComponentRegistry`, `useScopeSelector`, `useRenderFragment`, etc.).

Assessment:

- This part is broadly aligned with the architecture intent.

## Suggested Follow-up Tests

- Add snapshot/assertion tests to ensure renderer root className no longer contains implicit layout defaults once migrated.
- Add lint rule or static check for disallowed marker pattern `nop-.*--` except allowlist.
