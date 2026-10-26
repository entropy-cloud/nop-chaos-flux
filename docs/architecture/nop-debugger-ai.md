# Nop Debugger AI Extension Surface

## Purpose

This document is the owner doc for the AI integration surface of `@nop-chaos/nop-debugger`: the package boundary, security adjudications, and contracts that let an AI agent consume the debugger's structured diagnostics as tools, let a human converse with that agent inside the debugger panel, and let model-proposed schema patches be validated, previewed, applied, and rolled back under audit.

It answers four questions:

- how an AI layer consumes the debugger automation API without `nop-debugger` depending on any AI package
- how the model connector reaches the AI layer without moving credentials out of the host
- which automation capabilities may reach a model, and under which whitelist/redaction/trimming constraints
- how schema-level patch proposals are scoped, audited, previewed, applied, and rolled back

Ownership neighbors:

- debugger runtime semantics: `docs/architecture/debugger-runtime.md`
- host IO / stream contract: `docs/architecture/renderer-env.md`
- AI engine, tool-call loop, and tool approval UI contracts: `packages/flux-renderers-ai`

## Current Code Anchors

- `packages/nop-debugger/src/automation.ts` — `NopDebuggerAutomationApi` exposure via `window.__NOP_DEBUGGER_HUB__` / `window.__NOP_DEBUGGER_API__`
- `packages/nop-debugger/src/types.ts` — automation API type surface, `NopComponentInspectResult`, `NopDebuggerTab`
- `packages/nop-debugger/src/redaction.ts` — `normalizeRedactionOptions` / `redactData` key-level redaction boundary
- `packages/nop-debugger/src/controller.ts` — automation exit wrapping (inspect/evaluate kept redaction-wrapped by deliberate difference)
- `packages/flux-renderers-ai/src/engine/types.ts` — `AiConnector`, `AiToolSchema`, `ToolExecutor`, `ToolExecutionResult`
- `packages/flux-renderers-ai/src/engine/create-engine.ts` — `createMessageEngine({ connector, tools, toolExecutor, ... })`
- `apps/playground/src/ai/openai-connector.ts` — host-side connector precedent (keys in host)
- `packages/nop-debugger-ai/src/create-debugger-ai-tools.ts` — `createDebuggerAiTools()` whitelist adapter (`{ tools, toolExecutor }` for `createMessageEngine`)
- `packages/nop-debugger-ai/src/tools.ts` — v1 read-only tool definitions (10-tool whitelist)
- `packages/nop-debugger-ai/src/trim.ts` — per-tool projection allowlist + char cap
- `packages/nop-debugger/src/schema-patch.ts` — patch validation service, audit recorder, live-tree target resolution
- `packages/nop-debugger/src/ai-boundary.ts` — zero-AI-dependency boundary scanner (text-level assertion)
- `packages/nop-debugger/src/panel/ai-tab-seam.ts` — panel tab registry subscription hook (AI-agnostic seam)
- `packages/nop-debugger-ai/src/panel/extension.tsx` — `createAiDebuggerExtension()` (`x-ai` tab, shared React-adapter engine)
- `packages/nop-debugger-ai/src/panel/prompt.ts` — system prompt, bounded node-context card, `data-node-context` user parts
- `packages/nop-debugger-ai/src/panel/session.tsx` — session surface (message list + sender + error/retry + context card)
- `scripts/__tests__/ai-debugger-local-qwen.optional.test.ts` — optional local-model probe (contract seed; not the production contract)

## Package Boundary And Naming

- The AI integration lives in a dedicated package `@nop-chaos/nop-debugger-ai` under `packages/nop-debugger-ai/`.
- Dependency direction: `nop-debugger-ai` → `@nop-chaos/nop-debugger` + `@nop-chaos/flux-renderers-ai` (react as peer). The reverse direction is prohibited.
- `@nop-chaos/nop-debugger` must never declare an AI package in its `dependencies`, and its runtime import surface must never import `@nop-chaos/flux-renderers-ai` or `@nop-chaos/nop-debugger-ai`.
- The boundary is mechanically asserted by a text-level boundary test that scans `nop-debugger`'s package.json dependency fields and its `src` import statements for the two AI package names; the test lands together with the package.
- The AI capability is removable as a whole. A host that never installs/registers the extension keeps debugger behavior identical to the pre-AI baseline, except for the generic tab extension seam below, which is inert when unused.

## Connector Injection Contract

- The model connector is built by the host and injected as an `AiConnector` (the `@nop-chaos/flux-renderers-ai` connector contract). Hosts build it with `createStreamBasedAiConnector` against their own `RendererEnv.stream`.
- Credentials (API keys, base URLs, model names) live only in the host. `nop-debugger-ai` contains zero credentials, performs zero direct network IO, and is provider-unaware.
- The AI layer receives an already-built connector; it never constructs one from configuration.

## Tool Surface Security

- Tools reach the model through an explicit whitelist registry. Each entry names the automation method(s) it wraps plus its own redaction/trimming policy; automation methods outside the registry are unreachable by the model. There is no generic "call any automation method" passthrough.
- `evaluateNodeExpression` is not exposed to the model by default. Arbitrary expression evaluation is an arbitrary-code surface and a prompt-injection amplifier; re-exposing it requires a human-gated adjudication with a sandboxed subset.
- Inspect-derived form/scope data (`formState.values/errors`, `scopeData`, `scopeChain`) is trimmed per tool. Tools that do not need values do not receive them; tools that do receive field-allowlisted, `redactData`-redacted, depth- and byte-capped projections. This per-tool shaping is a delta on top of the automation exit's existing key-level redaction wrapping (which matches only the default key patterns and applies no per-tool trimming or caps).
- Tool failures normalize to the engine's `ToolExecutionResult` shape (`{ ok, result?, error? }`). Unknown tool, non-whitelisted method, and invalid arguments all return structured errors; raw stacks and internal exception text never reach the model.
- Schema/business data returned by tools is data, never instructions: the prompt-construction layer keeps tool output out of instruction positions. The executable injection assertion is owned by the session surface (AI tab), not by individual tools.

## AI Panel Tab Extension Seam

- `nop-debugger` exposes a generic, AI-agnostic panel tab extension seam: a controller-level registry where the host registers tab descriptors (id, label, lazy content factory). The built-in tabs (overview/timeline/network/node) keep their identity and ordering precedence.
- Registration rejects non-`x-` ids and duplicate ids (throws). A descriptor's `render` receives `{ controller, getInspectSelection }` — the panel's current inspect selection — and runs only while the tab is active. The window-facing `NopDebuggerAutomationApi.setActiveTab` stays built-in-only; extension tab activation is a panel-internal surface.
- Extension tab ids use an `x-` prefixed namespace, so they can never collide with built-in tab ids.
- The panel chrome never statically imports extension content: a descriptor's content factory is invoked lazily (host-side dynamic import), so an application that never registers the AI tab loads zero AI chunk.
- The AI capability is default-off: nothing renders or loads unless the host explicitly registers the extension.

## Schema Patch Protocol

- A patch is a schema/expression-level change proposal: set a property or expression on an explicitly named target node. Ops are a discriminated union (`set-prop` with a plain value | `set-expression` with an expression string — mutually exclusive at compile time and re-validated at runtime for untrusted JSON); ops arrays are non-empty and capped at 20. Structural operations (add/remove/move nodes, layout changes) and page control (click/input/scroll/submit) are out of the protocol and rejected at runtime.
- A patch carries an explicit scope: target controller id plus node target (`cid` and/or `nodeId`/`path`). Validation rejects cross-controller scope and ambiguous targets; a patch with no selector at all is rejected. Target resolution uses live-tree evidence only: `cid` → `inspectByCid`, `nodeId`/`path` → a unique `getComponentTree()` match — event-stream diagnostics are never a resolver. `id`/`createdAt` are generated by the proposing side (the schema-patch tool); validation requires a non-empty string id and a numeric `createdAt`.
- Every patch transition is audited in a bounded ring (50 entries, drop-oldest): validate / apply / revert / reject each append `{ at, patchId, action, ok, detail? }`. (2026-10-27 erratum, plan 772: `propose` provenance lives in the session-side candidate store — stagedAt/status, bounded at 10 active slots — not in the controller audit ring; the controller audit keeps the four transition actions.)
- Atomicity responsibility split: the debugger enforces validation, the bounded audit, and active-patch bookkeeping, and fails closed (no applier registered → reject; validation failure → reject; applier throw → audit-failed with no active-patch entry). The HOST applier contract guarantees schema-state all-or-nothing apply and revert-to-pre-apply — a failed apply leaves the previous schema state intact and `revert(token)` restores the pre-apply state.
- Apply/revert seam (controller surface, not the window automation API): `registerSchemaPatchApplier({ apply(patch) → { revertToken }, revert(revertToken) })` — one applier at a time, duplicate registration throws; `applySchemaPatch(patch)` validates then hands off; `revertSchemaPatch(patchId)` consumes the active patch; `getSchemaPatchAudit()` is read-only. The host owns page truth and re-render; the package ships no default applier.
- Candidate preview, adopt, rollback, and conflict detection consume this protocol (plan 772): the session-side candidate queue stages validated proposals; adoption is a human action on the preview card — the model tool face carries NO apply/revert channel (stage-only `propose_schema_patch` + 10 read-only tools behind one dispatcher). Cards re-validate at render time and at adopt time; conflicted candidates (target gone/ambiguous) cannot be adopted. Host sandbox preview is optional: appliers may implement `preview?(patch) → { kind, summary }` (text summary), injected through the extension input; absent it, the protocol-level diff card (original → new per op) is the preview.
- Current candidate code anchors: `packages/nop-debugger-ai/src/panel/propose-tool.ts`, `packages/nop-debugger-ai/src/panel/patch-candidates.ts`, `packages/nop-debugger-ai/src/panel/patch-queue.tsx`.

## Verification Baseline

All surfaces below are required-at-delivery verification obligations for the work items that land them.

- package boundary: mechanical text-level assertion that `nop-debugger` stays AI-free
- tool surface: discriminating unit tests for whitelist denial, per-tool redaction/trimming, and error normalization
- session surface: injection assertions (data-not-instructions), lazy/zero-load assertion when the AI capability is not registered
- patch pipeline: validation rejection, audit trail, atomic apply/revert, and conflict-detection tests
- e2e: programmatic assertions only (`page.evaluate` / locator / computed style); screenshots are diagnostic, never pass evidence
