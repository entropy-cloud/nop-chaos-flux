# Open-Ended Adversarial Review — Round 4

**Date**: 2026-05-13
**Perspective used**: Contract archaeologist (component registry), security surface auditor
**De-duplication baseline**: Rounds 1-3 + all prior adversarial reviews

---

## Summary

Round 4 explored component registry/node identity patterns and the security surface area. The component registry has a partially-wired duplicate ID detection system (dead `byId`/`idPaths`/`duplicateIds` fields in `CompiledCidState` that are never populated). The security posture is strong — the formula evaluator is a well-sandboxed AST walker, network access is host-controlled, and no critical security issues were found. This round's findings are lower severity than previous rounds, suggesting diminishing returns for further exploration.

---

## Finding 1: Duplicate Schema `id` Detection Never Wired — Sibling Nodes with Same `id` Produce React Key Collisions

**Where**:

- `packages/flux-core/src/compiled-cid.ts:6-8` — `byId`, `idPaths`, `duplicateIds` declared but never populated
- `packages/flux-core/src/utils/schema.ts:16-22` — `createNodeId` returns `schema.id` verbatim
- `packages/flux-react/src/render-nodes.tsx:365` — `key={node.id}`

**What**: The `CompiledCidState` declares `byId`, `idPaths`, and `duplicateIds` collections that appear to be intended for duplicate schema ID detection. These are initialized as empty and never written to or read from by any production code. Meanwhile, `createNodeId` returns `schema.id` without checking for duplicates, and render-nodes uses `node.id` as the React `key`. Two sibling schemas with `id: "my-widget"` produce the same React key.

**Why it matters**: React will emit a dev-console warning for duplicate keys and may incorrectly reuse component state across the two nodes, causing missing renders, stale state, or swapped subtrees. The dead fields in `CompiledCidState` suggest this was planned but never implemented — the infrastructure exists but was never wired up.

**Confidence**: Certain

---

## Finding 2: `registerRendererDefinitions` Does Not Support Override — Throws on Re-Registration

**Where**: `packages/flux-core/src/registry.ts:52-61`

**What**: The helper `registerRendererDefinitions` calls `registry.register(definition)` for each definition without passing `{ override: true }`. If two renderer packages try to register the same `type`, the second call throws. The `register` method itself supports `override`, but the convenience function does not expose it.

**Why it matters**: In practice, `createSchemaRenderer` builds a registry from definitions at construction time, so collisions are caught early. But if two renderer packages are loaded dynamically and both call `registerRendererDefinitions` on the same registry, the error is not gracefully handled. Plugin authors cannot opt into override behavior through this helper.

**Confidence**: Certain

---

## Security Assessment: Strong Posture, No Critical Issues

The security audit found a well-designed security model:

- **Formula evaluator**: AST-walking sandbox with `__proto__`/`constructor`/`prototype` blocking at three layers (evaluator, scope proxy, runtime sanitizer). No `eval()`, `new Function()`, or `with` in any production package.
- **Network access**: All requests flow through host-injected `fetcher`. Zero usage of `fetch`, `XMLHttpRequest`, or `sendBeacon` in any package source.
- **XSS**: Only `dangerouslySetInnerHTML` in `chart.tsx` (sanitized with three independent regex validators). All other rendering uses React's safe JSX.
- **CSS injection**: Limited to Tailwind class composition via `className` — no script execution possible.
- **Debugger surface**: `window.__NOP_DEBUGGER_API__` is dev-only and sandboxed to the formula evaluator.
- **Navigation**: All navigation through host-controlled `env.navigate()`.

No critical or high-severity security findings. The security requirements document (`docs/architecture/security-design-requirements.md`) is well-aligned with the implementation.
