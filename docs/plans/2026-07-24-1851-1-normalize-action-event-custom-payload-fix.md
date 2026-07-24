# 01 normalizeActionEvent Drops Custom Event Payloads Lacking `type`

> Plan Status: completed
> Last Reviewed: 2026-07-24
> Source: deferred/follow-up item in `docs/plans/2026-07-24-0751-1-ai-chat-external-engine-injection.md` (`Follow-up` → "`normalizeActionEvent` … needs its own bug-fix plan with regression tests"); `docs/logs/2026/07-24.md` lines 25 & 50; `docs/architecture/renderer-runtime.md` "Event Passthrough Contract" (lines 674–695); `packages/flux-react/src/renderer-helpers.ts`
> Related: `docs/plans/2026-07-23-2143-3-a2-flux-renderers-ai-p1-conversations-markdown.md` (follow-up noted the persistence-demo sidestep), `docs/components/roadmap-ai.md`
> Mission: ai
> Work Item: `normalizeActionEvent` bug fix (re-triggerable deferred from A4 successor plan)

## Purpose

Close the confirmed live defect where `normalizeActionEvent` silently drops renderer-emitted custom event payloads that lack a string `type` field, so that schema expressions like `${event.id}`, `${event.item}`, `${event.conversation}` resolve correctly for all custom-payload events across the AI renderers (and the platform at large).

## Current Baseline

- **The defect is live and verified** in `packages/flux-react/src/renderer-helpers.ts:29-49`:
  - `normalizeActionEvent(event)` first checks `isFluxActionEventCandidate(event)` (line 34) — which requires `typeof event.type === 'string'`.
  - If that check fails, it falls through to a DOM-event extraction path (line 38) guarded by `if (typeof candidate.type !== 'string') return undefined;` (line 47-49).
  - Net effect: any plain object payload **without a string `type`** (e.g. `{ id, conversation }`, `{ reason }`, `{ item, index }`) is normalized to `undefined`, dropping every custom field.
- **Flow confirmed** in `packages/flux-react/src/node-renderer-resolved.tsx:252-266`: the per-event handler calls `createNormalizedActionEvent(event)` → `normalizeActionEvent`, then passes the result as `ctx.event` into `helpers.dispatch(...)`. When `normalizedEvent` is `undefined`, `withEventBinding` (`renderer-helpers.ts:140-172`) exposes no `event`, so `${event.id}` etc. resolve to `undefined`.
- **Widespread impact across the AI package** — the following events emit type-less custom payloads and are currently broken end-to-end (verified via grep):
  - `ai-conversations.tsx`: `onItemRename({ id, title })`, `onCreate({})`, `onItemClick({ id, conversation })`, `onItemDelete({ id })`
  - `ai-voice-input.tsx`: `onError({ reason })`, `onResult({ transcript })`
  - `ai-chat.tsx`: `onBranchChange({ branchId })`
  - `ai-feedback.tsx`: `onAction({ action, message })`
  - `ai-attachments.tsx`: `onChange({ attachments })`, `onError({ reason })`, `onUpload({ attachments })`
  - `ai-prompts.tsx`: `onSelect({ item, index })`
  - `ai-suggestions.tsx`: `onSelect({ item, index })`
  - `ai-citations.tsx`: `onSourceClick({ source, index })`
  - `ai-bubble/index.tsx`: `onBranchChange({ branchId })`
  - `ai-tool-call.tsx`: `onApproval({ action, toolCall, toolCallId })`
- **Precedent that works**: `list-renderer.tsx:102` and `cards-renderer.tsx:152` already include a string `type` (e.g. `{ type: 'list:item-click', item, index, key }`), so they pass `isFluxActionEventCandidate` and are returned as-is (all fields preserved). The 2026-06-24 daily log recorded this as the working pattern for those renderers.
- **Documented contract** (`renderer-runtime.md:674-695`) says: "Non-DOM semantic payloads are still allowed … but those payloads **should** still carry a meaningful `type` field." The doc frames `type` as a recommendation, not a precondition for payload preservation. The implementation is strictly harsher: it discards the entire payload instead of preserving it without `type`. This is an implementation-vs-doc drift.
- **Existing tests** in `packages/flux-react/src/__tests__/helpers.test.ts:64-118` cover DOM events, synthetic events, and `FluxActionEvent` with string `type`. Line 77-79 asserts `createNormalizedActionEvent({ type: 123 })` → `undefined` (a malformed-`type` edge case, distinct from the legitimate no-`type` custom payload).
- **Discovery context**: found during the A4 successor (`ai-chat` external engine injection). The persistence demo sidesteps it by keeping the conversation sidebar in React (direct manager calls). The 0751-1 plan explicitly recorded this as out-of-scope, "needs its own bug-fix plan with regression tests."

## Goals

- `normalizeActionEvent` preserves renderer-emitted custom payloads that lack a string `type`, so `${event.<field>}` resolves to the actual payload value for every custom-payload event in the AI package (and platform-wide).
- No regression for DOM/synthetic events and existing `FluxActionEvent`-with-`type` payloads (they continue to pass through / normalize exactly as today).
- Regression tests that lock the corrected behavior (custom payload preserved; DOM path unchanged), written before/as the fix lands (must-automate tier).
- The `FluxActionEvent` type contract and `renderer-runtime.md` Event Passthrough Contract describe the corrected, honest behavior (no silent drop).
- AI renderers' custom-payload events align with the documented `type` recommendation so payloads are self-describing and debuggable.

## Non-Goals

- Changing the action compiler, scope model, or dispatch pipeline — only the event-normalization helper and the type contract.
- Reworking the `Event Passthrough Contract` prevention (`preventDefault`/`stopPropagation`) timing model.
- Adding `type` to **non-AI** renderers that already work (list/cards already include `type`); other packages' custom events are fixed for free by the root-cause fix but are not audited/aligned in this plan.
- Rebuilding the persistence demo to stop sidestepping (it may keep its React-direct approach if preferred; the bug fix makes the schema-event path viable as an alternative, but migrating the demo is optional).

## Scope

### In Scope

- `packages/flux-react/src/renderer-helpers.ts` — `normalizeActionEvent` fix.
- `packages/flux-react/src/__tests__/helpers.test.ts` — regression tests (custom payload preserved; existing DOM/synthetic cases unchanged).
- `packages/flux-core/src/types/actions.ts` — `FluxActionEvent` type contract adjustment if the chosen representation requires it (Decision item).
- `packages/flux-renderers-ai/src/renderers/*` — add a meaningful string `type` to the ~10 type-less custom-payload events listed in Current Baseline (alignment with documented recommendation; not strictly required after the root-cause fix, but makes payloads self-describing).
- `docs/architecture/renderer-runtime.md` — Event Passthrough Contract clarification (custom payloads without `type` are preserved, not dropped; `type` is recommended).
- `docs/logs/2026/07-24.md` — dev log entry.

### Out Of Scope

- Other renderer packages' event payloads (covered for free by the root fix; not audited here).
- Playground demo migration (optional; sidestep may remain).
- Tiptap/sender extension payloads (already covered by the same fix).

## Failure Paths

| Scenario                            | Trigger                                               | Behavior                                                                            | Retry | User-visible                                             |
| ----------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------- | ----- | -------------------------------------------------------- |
| custom-payload-no-type              | renderer emits `{ id, conversation }` (no `type`)     | payload preserved; `ctx.event` carries all fields; `type` synthesized as `'custom'` | n/a   | `${event.id}`` resolves to the real id in schema actions |
| custom-payload-with-non-string-type | renderer emits `{ type: 123, id }` (malformed `type`) | payload preserved; `type` coerced/synthesized to a string so contract holds         | n/a   | custom fields still accessible; no silent drop           |
| dom-event                           | React synthetic / native event                        | unchanged from today (normalize `type`/`nativeEvent`/`currentTarget`/prevention)    | n/a   | identical behavior                                       |
| flux-event-with-string-type         | `{ type: 'flux:action', … }`                          | unchanged (returned as-is)                                                          | n/a   | identical behavior                                       |
| primitive-or-null                   | `42`, `null`, `undefined`                             | `undefined` (cannot normalize)                                                      | n/a   | no `event` binding; existing behavior                    |

## Test Strategy

档位选择：`必须自动化`

本档选择：**必须自动化**。

理由：这是 action/event 归一化的核心回归路径，跨包影响所有 custom-payload 事件。归一化逻辑的回归会静默破坏 schema 表达式（`${event.id}` 等），难以通过肉眼发现。对应 Proof 项必须在 Fix 之前/同时落地（failing-test-first）。

## Execution Plan

### Phase 1 - Root cause fix + regression tests

Status: completed
Targets: `packages/flux-react/src/renderer-helpers.ts`, `packages/flux-react/src/__tests__/helpers.test.ts`, `packages/flux-core/src/types/actions.ts`

- Item Types: `Proof` (tests first), `Fix`, `Decision`

- [x] **Proof (failing test first)**: add regression tests in `helpers.test.ts` that assert `createNormalizedActionEvent({ id: 'c1', conversation: { x: 1 } })` returns a non-undefined object whose `id`/`conversation` fields are preserved (currently fails — returns `undefined`).
- [x] **Decision**: confirm the representation of preserved custom payloads. Default proposal: when the value is a non-null plain object, not a DOM `Event` instance, and lacks a string `type`, synthesize `{ ...payload, type: 'custom' }` so every field stays accessible AND `FluxActionEvent.type: string` contract holds. Record the chosen representation in the Decision item and in `renderer-runtime.md`.
- [x] **Fix**: update `normalizeActionEvent` so the "no string `type`" branch no longer returns `undefined` for plain objects — instead it preserves the payload (per the Decision). DOM `Event` instances and objects with a string `type` continue unchanged.
- [x] **Proof**: adjust/add tests so the existing `createNormalizedActionEvent({ type: 123 })` expectation matches the new behavior (malformed `type` is preserved/coerced, not dropped) — document why the prior `undefined` assertion is superseded.
- [x] **Proof**: confirm no regression — DOM event, synthetic event, and `FluxActionEvent`-with-string-`type` cases still pass exactly as before.

Exit Criteria:

> 写法原则：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续所必需的局部检查。

- [x] `createNormalizedActionEvent({ id: 'c1', conversation: {} })` returns a non-undefined object with `id === 'c1'` (repo-observable: the assertion in `helpers.test.ts`).
- [x] All previously-passing `createNormalizedActionEvent` cases (null/undefined/primitive/DOM/synthetic/string-`type`) remain green.
- [x] Local `pnpm --filter @nop-chaos/flux-react typecheck` + `pnpm --filter @nop-chaos/flux-react test` green (unblocks Phase 2 integration checks).

**Decision Record**: Representation chosen = synthesize `{ ...payload, type: 'custom' }` for any non-null, non-primitive object lacking a string `type` (covers both no-`type` and malformed/non-string-`type` cases). This fits the existing `FluxActionEvent` interface (string `type` + index signature `[key: string]: unknown`), so no type-contract shape change was required; only a clarifying JSDoc was added to `FluxActionEvent`. The dead DOM-extraction branch (unreachable because any string-`type` object already returns via `isFluxActionEventCandidate`) was removed for clarity. Verified: 5 failing tests added first, then green (452/452 in `flux-react`); full workspace `pnpm typecheck` green (58/58 tasks).

### Phase 2 - AI renderer event `type` alignment

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/{ai-conversations,ai-voice-input,ai-chat,ai-feedback,ai-attachments,ai-prompts,ai-suggestions,ai-citations,ai-bubble/index,ai-tool-call}.tsx`

- Item Types: `Fix` (consistency alignment, not a defect — root fix already unblocks these)

- [x] Add a meaningful string `type` to each type-less custom-payload event emitted by the AI renderers (see Current Baseline list), mirroring the `list-renderer.tsx` pattern (e.g. `ai-conversations.onItemClick` → `{ type: 'ai:conversation-click', id, conversation }`). Use stable, namespaced `type` strings.
- [x] Verify each event's custom fields remain accessible (the root fix from Phase 1 guarantees this regardless of `type`, but adding `type` makes payloads self-describing per the doc recommendation).
- [x] **Proof**: add/extend focused tests in `flux-renderers-ai` that assert a custom-payload event now carries through `ctx.event.<field>` end-to-end (e.g. an `ai-conversations` unit test dispatching `onItemClick` and asserting the payload reaches a registered action's `event`).

Exit Criteria:

- [x] Each of the ~10 AI custom-payload events includes a stable string `type` (grep-verifiable in the listed renderer files).
- [x] At least one focused unit test in `flux-renderers-ai` demonstrates a custom payload field reaching the action context via the normalized `event`.
- [x] Local `pnpm --filter @nop-chaos/flux-renderers-ai test` green.

**Alignment record**: 18 emission sites across the 10 listed renderer files now carry a stable `ai:`-namespaced `type`: `ai:conversation-{rename,create,click,delete}`, `ai:voice-{error,result}`, `ai:branch-change` (ai-chat + ai-bubble), `ai:feedback-action`, `ai:attachments-{change,error,upload}`, `ai:prompt-select`, `ai:suggestion-select`, `ai:citation-click`, `ai:tool-call-approval`. Existing renderer tests assert via `expect.objectContaining(...)`, so adding `type` did not break any assertion (336/336 green). End-to-end proof added in `p1-renderers.test.tsx`: renders `ai-conversations`, captures the emitted `onItemClick` payload, runs it through the real `createNormalizedActionEvent` (newly exported from `@nop-chaos/flux-react`), and asserts `ctx.event.id === 'c1'` + `ctx.event.conversation` preserved. Full workspace `pnpm typecheck`/`build`/`lint` green (58/58, 31/31, 31/31).

### Phase 3 - Owner-doc sync + verification + dev log

Status: completed
Targets: `docs/architecture/renderer-runtime.md`, `docs/logs/2026/07-24.md`

- Item Types: `Follow-up`

- [x] Update `renderer-runtime.md` "Event Passthrough Contract" (around lines 682-695) to state honestly: custom payloads without a string `type` are **preserved** (not dropped), with `type` synthesized as `'custom'` when absent; a meaningful `type` remains recommended for self-describing payloads.
- [x] Spot-check one playground/demo path end-to-end (e.g. an AI conversation `onItemClick` bound to an action that reads `${event.id}`) confirms the value now resolves — programmatic inspection only (`page.evaluate`), not screenshot-based.
- [x] Record dev log entry at `docs/logs/2026/07-24.md` covering the root-cause fix, the representation Decision, and the AI renderer alignment.

Exit Criteria:

- [x] `renderer-runtime.md` Event Passthrough Contract reflects the corrected, honest behavior (no silent drop).
- [x] Dev log entry exists at `docs/logs/2026/07-24.md`.

**Spot-check evidence**: the playground persistence demo sidesteps the schema-event path (React-direct manager calls, per plan Non-Goals), so a Playwright run would not exercise the fixed code path. The honest programmatic end-to-end spot-check is the Phase 2 integration test (`p1-renderers.test.tsx`): it renders the real `ai-conversations` renderer, fires a real DOM click, captures the exact emitted `onItemClick` payload, runs it through the real `createNormalizedActionEvent` (the function `node-renderer-resolved.tsx` uses), and asserts `ctx.event.id === 'c1'` + `ctx.event.conversation` preserved — proving `${event.id}` resolves. Demo migration off the sidestep remains a non-blocking follow-up.

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session）— ses_06c3e984dffeVwDevC4ghuxp1Y
- Verdict: `pass`（零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed: none（两处 Minor：`cards-renderer.tsx` 行号 151→152 已订正；Phase 1 Decision 的 "no-`type` vs non-string-`type`" 边界已确认为恰当 scoped，无需返工）
- Reference verification: 独立核对全部 7 项引用（normalizeActionEvent bug、FluxActionEvent 契约、helpers.test.ts 既有覆盖、renderer-runtime.md Event Passthrough Contract、10 个 AI 渲染器 type-less payload、list/cards precedent、deferred/follow-up 来源）均 CONFIRMED against live repo。

## Closure Gates

> **关闭条件**：本 section 所有条目及每个 Phase 的 Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] `normalizeActionEvent` preserves custom payloads lacking a string `type` (root defect fixed).
- [x] No regression for DOM/synthetic/`FluxActionEvent`-with-`type` normalization paths.
- [x] Necessary focused verification (regression tests + at least one AI end-to-end payload test) completed.
- [x] AI renderers' custom-payload events carry a self-describing string `type`.
- [x] `renderer-runtime.md` Event Passthrough Contract synced to the corrected behavior (no silent drop).
- [x] No in-scope live defect silently downgraded to deferred / follow-up.
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本计划为单一 bug-fix 的 owner plan。执行中若发现可裁定移出的优化项，记于此（须带 Why Not Blocking Closure）。目前无预置 deferred 项。

## Non-Blocking Follow-ups

- Migrating the persistence playground demo off its React-direct sidestep to the now-viable schema-event path (optional; the bug fix makes it possible but does not require it).
- Auditing non-AI renderer packages' custom-payload events for `type` consistency (covered for free by the root fix; alignment is a separate repo-wide task, out of scope).

## Closure

Status Note: 所有 Closure Gates 与三 Phase Exit Criteria 均通过；root-cause 修复 + 回归测试 + AI 渲染器 `type` 对齐 + 文档同步 + dev log 全部落地；independent fresh-session closure-audit 复核通过（零 Blocker / 零 Major）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session — closure audit (plan 2026-07-24-1851-1)
- Evidence:
  - **Files read & verified**:
    - `packages/flux-react/src/renderer-helpers.ts:47-61` — `normalizeActionEvent` 实现正确：null/undefined/primitive → `undefined`；string-`type` 对象（DOM/synthetic/FluxActionEvent）→ 原样返回；其余非空对象 → `{ ...payload, type: 'custom' }`。旧的 `return undefined` 丢弃分支与 dead DOM-extraction 代码已移除（JSDoc line 29-46 如实描述三步解析）。
    - `packages/flux-react/src/__tests__/helpers.test.ts:64-147` — 回归测试断言**结果正确性**而非仅无错误：custom `{id,conversation}` 保留、单字段 `{reason}` 保留、空 `{}`→`{type:'custom'}`、不修改入参；`{type:123,id}` 已从 `undefined` 改为 `{type:'custom',id:'x'}`（line 77-81）。
    - `packages/flux-core/src/types/actions.ts:286-305` — `FluxActionEvent` 仅新增澄清 JSDoc，无 shape 改动。
    - `packages/flux-react/src/index.tsx:32` — `createNormalizedActionEvent` 已公开导出。
    - `packages/flux-renderers-ai/src/renderers/__tests__/p1-renderers.test.tsx:68-92` — e2e proof：渲染真实 `ai-conversations`、fire 真实 click、经真实 `createNormalizedActionEvent` 断言 `ctx.event.id === 'c1'` + `conversation` 保留。
  - **Grep verification**: `rg "type: 'ai:" packages/flux-renderers-ai/src/renderers -g "*.tsx"` 命中 18 处 emission sites，覆盖全部 10 个文件（ai-conversations ×4, ai-voice-input ×3, ai-attachments ×4, ai-chat ×1, ai-bubble/index ×1, ai-feedback ×1, ai-prompts ×1, ai-suggestions ×1, ai-citations ×1, ai-tool-call ×1），无残留 type-less emission。
  - **Doc sync**: `docs/architecture/renderer-runtime.md:674-702` Event Passthrough Contract 如实描述三步解析 + "no silent drop"（line 688）；`type` 推荐为 self-describing（line 702）。
  - **Dev log**: `docs/logs/2026/07-24.md` 含 Plan 2026-07-24-1851-1 全 3 Phase 条目；`docs/components/roadmap-ai.md:29-32` "Follow-ups 已收口" 条目存在。
  - **Test results (independently re-run)**:
    - `pnpm --filter @nop-chaos/flux-react test` → **452 passed** (50 files).
    - `pnpm --filter @nop-chaos/flux-renderers-ai test` → **336 passed** (39 files).
    - `pnpm typecheck` → **58/58 tasks successful** (FULL TURBO).
  - **Artifact check**: `git status` 仅含 18 个 in-scope 源/文档修改 + 本 plan 新文件；`src/` 目录无 stray `.js`/`.d.ts`/`.js.map`。
  - **Scope integrity**: 无 in-scope live defect 被降级为 follow-up；唯一 follow-ups（demo 迁移、non-AI 渲染器审计）均为 plan 明文 Non-Goals/Out-of-Scope。

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
