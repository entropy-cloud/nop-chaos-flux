# Open-Ended Adversarial Review — 2026-06-02 — Round 02

**Execution date**: 2026-06-02  
**Result directory**: `docs/analysis/2026-06-02-open-ended-adversarial-review-01/`  
**Exploration areas**: debugger automation surface, default playground exposure, redaction boundaries  
**Discovery source**: stop-check pass after Round 01 switched away from host contract drift and sampled the diagnostics/debugger boundary

---

## Finding 1: Playground ships a globally reachable debugger automation API by default, and its raw inspect/evaluate methods bypass the repo's redaction boundary

- **Where**:
  - `apps/playground/src/App.tsx:39-52`
  - `packages/nop-debugger/src/controller.ts:89-97,217-220,424-426`
  - `packages/nop-debugger/src/automation.ts:120-143`
  - `packages/nop-debugger/src/types.ts:281-309,343-385`
  - `packages/nop-debugger/src/controller-component-inspector.ts:114-189,432-454`
  - `packages/nop-debugger/src/redaction.ts:18-79`
- **What**: the playground creates a debugger controller unconditionally and `createNopDebugger()` defaults `exposeAutomationApi` to `true`. That publishes `window.__NOP_DEBUGGER_API__` and `window.__NOP_DEBUGGER_HUB__` on ordinary playground pages. The exposed automation API includes `inspectByCid`, `inspectByElement`, and `evaluateNodeExpression`. `inspectByCid` returns raw `formState`, `scopeData`, `scopeChain`, `metaSummary`, and `propsSummary` assembled from live runtime/form state. `evaluateNodeExpression` then evaluates arbitrary formula expressions against the inspected node scope. The repo has a redaction utility, but the inspect/evaluate path does not apply it; redaction is only used in other diagnostics/export flows.
- **Why it matters**: this turns the debugger from a local UI convenience into a default global data-exfiltration surface for any same-page script running in the playground. Sensitive form values, scope payloads, and derived expression results can be read without opening the panel, and the public API shape makes that capability intentionally scriptable. Even if the playground is "dev only", this is still a live trust-boundary issue inside the repo's own diagnostics baseline because the automation surface is enabled by default rather than opt-in.
- **Confidence**: Certain
- **Discovery source view**: 恶意输入者
- **Non-duplication note**: older archive material discussed debugger inspect richness and future redaction needs, but this round's finding is a live exposure combination: default global enablement plus unredacted inspect/evaluate automation on the playground surface.

## Round Assessment

This round exposed a different class of problem from Round 01: not contract drift, but **diagnostic capability escaping its intended audience**. The debugger architecture already understands redaction as a real concern, yet the most script-friendly APIs sit outside that protection and are published globally by default.

The broader lesson is that diagnostics surfaces need the same owner-boundary discipline as renderer host contracts. Once a debug API is both global and automation-friendly, it becomes part of the app's effective attack surface even if it originated as a developer tool.

## Blind-Spot Self-Assessment

This round only verified browser-global exposure and raw inspect/evaluate payloads. I did not audit whether production builds, non-playground apps, or embedding hosts also instantiate the debugger in similarly permissive ways. If this line continues, the next useful check is to trace where `createNopDebugger()` is used outside the playground and whether there is any environment gate that actually disables the automation surface in deployed contexts.
