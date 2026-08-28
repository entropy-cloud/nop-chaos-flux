# 163 Schema-event setValue writes never reach page scope on xui:imports pages (import overlay write capture)

> Fixed: mitigated at fixture level (runtime fix pending successor plan)
> Discovered: 2026-08-24, `docs/plans/2026-07-25-2-gantt-ai-e2e-test-coverage-and-fix-plan.md` Phase 2 execution

## Symptom

On a page whose schema declares a page-level `xui:imports` (e.g. `/#/ai-coverage` with `[{ from: 'ai', as: 'ai' }]`), schema-driven event actions that write page scope — `onClick: { action: 'setValue', args: { path: 'probe', value: 'fired' } }` — dispatch "successfully" but the written value is never observed by formula-bound nodes (`text: 'PROBE:${probe}'` stays at the seed value). The bug affects EVERY node on the page (plain `type: 'button'` included), not just nodes referencing `$alias` helpers. Pages without `xui:imports` (e.g. `/#/w3a-w3b`) are unaffected.

## Diagnosis

1. A page-level `xui:imports` compiles into a per-node `importsPlan` that reaches every body child. `packages/flux-react/src/node-renderer.tsx` installs an import frame per node and wraps the node's scope in a child "overlay" scope (`createChildScope(props.scope, importBindings, { scopeKey: node.id + ':imports' })`) so `$alias` expression helpers are visible.
2. The node's schema-event dispatch defaults to `nodeInstance.scope` — the overlay. `ctx.scope.update(path, value)` writes into the **overlay's own ephemeral store** (scope.ts `update` writes `ownStore` only; no parent delegation). The hosting page store never changes, so page-level formulas never re-render. Confirmed by instrumenting the action adapter: the write landed on a scope with id `_.body_16_:imports:<rand>` instead of the page root.
3. A second layer: even when the write is redirected to the hosting page store (write-through wrapper experiment), notifications to descendants of the overlay were unreliable — of 46 store bridges created, only the most recently registered one received the form-store-backed page write. Root cause inside the composite-store/`materializeVisible` identity caching vs. the validation-store-backed page scope chain was not fully isolated within the plan's timebox.

## Mitigation (landed)

The `/#/ai-coverage` e2e fixture no longer declares `xui:imports`: connectors and the null-engine switch are handed through page `data` instead (`apps/playground/src/pages/ai-coverage-demo.tsx` builds `pageData` with `connectors` + `engines`, and `apps/playground/src/ai/ai-coverage-example.ts` binds `connector: '${connectors.slow}'`). This restores the plain page-scope path where schema-event `setValue` works (all 30 `ai-coverage-widgets` + 13 `ai-chat-states` probe assertions green).

## Successor Required

Yes — the runtime defect is real and unfixed:

- every existing page that legitimately needs `xui:imports` (all focused AI demo pages: `/#/ai-chat`, `/#/ai-tools`, …) cannot assert schema-event write effects; their e2e coverage is limited to engine-driven behavior.
- Fix direction (validated but reverted to keep this plan's scope honest): make the import overlay transparent for writes (delegate `update`/`merge` to the hosting scope with a live `value` getter) in `packages/flux-react/src/node-renderer.tsx`, AND skip reinstalling frames/overlays on nodes whose parent frame already resolves every declared alias (the doc-aligned "only ancestors' frames are visible" model, `docs/architecture/module-cache-and-import-stack.md`). The subscriber-notification gap through the form-store-backed page scope still needs a root-cause pass.
- Characterization tests for the composite chain live in `packages/flux-runtime/src/__tests__/scope-composite-chain.test.ts` (both pass on HEAD; they document that the minimal chain works — the failure needs the full page stack).

## Protection

`tests/e2e/ai-coverage-widgets.spec.ts` (sender modes/conversations/prompts/feedback/token/suggestions probes) + `tests/e2e/ai-chat-states.spec.ts` (onResponseComplete/onError probes) pin the schema-event contract on the mitigated fixture; any regression of the fixture back to `xui:imports` fails them immediately.
