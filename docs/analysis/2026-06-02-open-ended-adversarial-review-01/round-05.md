# Open-Ended Adversarial Review — 2026-06-02 — Round 05

**Execution date**: 2026-06-02  
**Result directory**: `docs/analysis/2026-06-02-open-ended-adversarial-review-01/`  
**Exploration areas**: final stop-check on import resolution and renderer registry/discovery  
**Discovery source**: quick sub-agent scan of two previously untouched codebase areas

---

## Finding 1: Unknown schema types are silently dropped in strict mode with no error signal

**Severity**: Medium

**Where**:

- `packages/flux-runtime/src/schema-compiler.ts` — returns `undefined`/`[]` for unmatched types when `diagnostics.continueOnError` is true
- `packages/flux-react/src/render-nodes.tsx:153-163` — `normalizeNodeInput` enables this mode when `runtime.strictMode` is true
- `packages/flux-react/src/node-renderer.tsx` — per-node `NodeErrorBoundary`

**What**:  
The schema compiler has two modes for unknown renderer types:

**Non-strict mode** (default): throws an `Error` → caught by `NodeErrorBoundary` → renders visible Alert UI with error message and Retry button.

**Strict mode** (`runtime.strictMode === true`): the compiler checks `diagnostics.continueOnError`, which is set to `true` by `normalizeNodeInput` in `render-nodes.tsx`. When enabled, the compiler returns `undefined` for a single unknown type or filters it from the array for list children. The node is simply **absent from the rendered output** — no error boundary, no Alert UI, no console warning, no diagnostic event.

**Why it matters**:  
A schema referencing a typo'd renderer type (e.g., `"buton"` instead of `"button"`) or a type from a missing/unloaded renderer package produces zero feedback in strict mode. The user sees a partial or blank UI with no indication of what went wrong or where. Since strict mode is the mode most likely used in validation and production-like debugging, this is the very context where missing-type detection matters most.

The strict-mode contracts exist to surface schema errors early — but here it does the opposite: it enables a silent-drop code path that hides the most basic class of schema error (unknown renderer type).

**Contrast with non-strict mode**: The `NodeErrorBoundary` at `packages/flux-react/src/node-renderer.tsx` renders a visible fallback with the error message and a Retry button. Schema authors who happen to test without strict mode will see the error; those who test with strict mode will see nothing.

**Confidence**: Certain  
**Non-duplication note**: No prior round identified any renderer-registry or schema-compilation concern. All previous findings were in host contracts, async lifecycle, debugger security, resource management, React lifecycle, and expression sandboxing.

**Recommendation**:  
In strict mode, the compiler should either:

- (a) Still throw for completely unknown types but only continue-on-error for known recoverable diagnostics, or
- (b) Report a diagnostic event (`env.reportDiagnostic` or `env.notify('warning', ...)`) so developers get some signal, or
- (c) Render a visible placeholder (e.g., a dimmed "Unknown type: buton" box) in development strict mode rather than dropping silently.

---

## Round Assessment

This round validates that the ninth dimension explored (renderer registry/discovery) still yielded a genuinely new, high-value finding. The earlier stop-check in Round 03 had prematurely concluded no new issues existed, but switching to completely different code dimensions (action lifecycle, React 19 StrictMode, formula sandbox, renderer registry) uncovered 4 more findings across Rounds 04-05 that had been invisible to the initial 3 rounds.

**Final tally across all 5 rounds**:

| Round     | Findings | Theme                                    |
| --------- | -------- | ---------------------------------------- |
| 01        | 4        | Host contract drift + async lifecycle    |
| 02        | 1        | Debugger security boundary               |
| 03        | 0        | Stop-check — premature stop              |
| 04        | 3        | Resource leak + StrictMode + sandbox gap |
| 05        | 1        | Silent error path in strict mode         |
| **Total** | **9**    |                                          |

## Blind-Spot Self-Assessment

I have now sampled 9 distinct codebase dimensions in this execution. Remaining blind spots for future executions:

- Performance profiling (compilation, memory under large schemas)
- Accessibility outside known renderer families
- File upload/download security
- Deep CSS/Tailwind monorepo scanning
- E2E test coverage gaps
- Server-side rendering compatibility
- WebSocket/realtime data paths
