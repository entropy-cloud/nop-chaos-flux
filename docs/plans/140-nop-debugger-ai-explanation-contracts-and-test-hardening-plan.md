# 140 NOP Debugger AI Explanation Contracts And Test Hardening Plan

> Plan Status: partially completed
> Last Reviewed: 2026-04-25
> Source: `docs/architecture/debugger-runtime.md`, independent review task `ses_23af1f5c3ffeUBnDr3UNrwRBl3`, live code audit of `packages/nop-debugger/src/controller.ts`, `packages/nop-debugger/src/controller-component-inspector.ts`, `packages/flux-runtime/src/component-handle-registry.ts`, `tests/e2e/debugger.spec.ts`
> Related: `docs/plans/20-nop-debugger-implementation-plan.md`, `docs/plans/22-debugger-node-inspector-enhancement-plan.md`, `docs/plans/34-nop-debugger-ai-diagnostics-improvement-plan.md`

## Purpose

把 `nop-debugger` 从“AI 能拿到节点快照和事件列表”提升到“AI 能直接问解释型问题，并拿到受边界约束、可测试、机器可消费的答案”的状态。

## Current Baseline

- 当前 repo 已经落地了一批 AI/automation 可直接调用的 debugger 能力，而不是只剩 UI 面板：`inspectByCid()`、`inspectByElement()`、`getNodeDiagnostics()`、`getInteractionTrace()`、`getLatestFailedRequest()`、`getLatestFailedAction()`、`getNodeAnomalies()`、`getRecentFailures()`、`getAsyncOwnerDebugSnapshot()`、`evaluateNodeExpression()` 都已存在于 controller 和 automation API。见 `packages/nop-debugger/src/controller.ts`、`packages/nop-debugger/src/automation.ts`、`packages/nop-debugger/src/types.ts`。
- 当前节点 inspect 已能返回 `scopeData`、`scopeChain`、`formState`、`metaSummary`、`propsSummary`、DOM summary 与受控表达式求值结果；这说明“从 DOM/节点拿当前状态”已经成立。见 `packages/nop-debugger/src/controller-component-inspector.ts`。
- 当前真正缺失的不是“再做一个聚合 inspect API”，而是解释型契约：AI 仍难以直接回答“这个值为什么是现在这样”“这个 meta/visible/disabled 来自哪层输入”“最近哪条因果链导致当前失败/异常”。
- 现有 `ComponentHandleRegistry.inspectCid()` 与 `useNodeDebugData()` 主要提供 inspect 快照，不提供 value-origin、dependency-causality 或 node-scoped failure explanation。见 `packages/flux-runtime/src/component-handle-registry.ts`、`packages/flux-react/src/use-node-debug-data.ts`。
- 当前 E2E 已验证 debugger UI 和部分 automation API 可访问，但还没有把“AI 询问一个解释型问题并获得稳定结构化答案”当作正式契约保护。见 `tests/e2e/debugger.spec.ts`。
- 独立子 agent review 结论：上一版计划过于聚焦再包一层 deep diagnostics，容易重复已有能力；真正高价值缺口应改成 value-origin explanation、dependency/causality explanation、machine-oriented query schema 与更强的语义测试。证据：`ses_23af1f5c3ffeUBnDr3UNrwRBl3`。

## Goals

- 新增一组真正对 AI 有用的解释型 debugger 契约，而不是继续堆叠快照型聚合接口。
- 让 AI 可以直接发起以下类型的问题，并得到稳定、可界定大小、机器可消费的回答：
  - 这个节点的值来自哪里。
  - 这个节点的 meta/visible/disabled/label 等表现由哪些输入决定。
  - 这个节点最近的失败或异常为什么发生。
  - 当前节点与哪些 async owner、interaction、request instance 直接相关。
- 为解释型契约增加 focused unit tests 和 Playwright contract tests，保护语义而不是只保护“字段存在”。
- 为 playground 提供最小但确定性的 AI 调试 fixture，使 E2E 能验证 value origin、dependency trigger、async supersede/cancel、failure chain 等真实解释场景。

## Non-Goals

- 不把 debugger 扩展成通用 tracing/observability 平台。
- 不开放任意 JavaScript 执行或 runtime 内部对象透传。
- 不以 UI 改版为主线；panel 只做为解释型契约服务的最小适配。
- 不为了 debugger 功能打破现有包边界或引入大规模 runtime 架构重写。

## Scope

### In Scope

- AI-first explanation contracts 与 machine-oriented result schema。
- node-scoped value/meta/failure/async explanation 结果的 bounded summary 设计。
- deterministic playground fixtures 与对应 contract tests。
- 相关 docs 与 daily log 更新。

### Out Of Scope

- 时间回放、远程会话、生产监控接入。
- 不是由 explanation contracts 直接驱动的泛化 debugger UI 重做。
- 非必要的 runtime 私有结构上推。

## Execution Plan

### Phase 1 - Machine-Oriented Explanation Contracts

Status: completed
Targets: `packages/nop-debugger/src/types.ts`, `packages/nop-debugger/src/controller.ts`, `packages/nop-debugger/src/automation.ts`, `docs/architecture/debugger-runtime.md`

- [x] 定义 AI-first explanation 契约，而不是新增泛化快照包装器。已落地 `explainNodeValue(...)`、`explainNodeMeta(...)`、`explainNodeFailure(...)`、`explainNodeAsync(...)`。
- [x] 为每个 explanation 接口定义机器可消费的结果 schema，至少包括：`kind`、`subject`、`answer`、`confidence/limitations`、`evidenceRefs`、`relatedCid/nodeId/path/requestInstanceId/interactionId`、`truncated`。
- [x] 明确解释结果的 bounded payload 规则：当前实现对 evidence、dependency paths、related events、async owners 做了硬限制，禁止返回无界大对象。
- [x] 明确哪些字段属于稳定 automation contract，哪些字段只是 debug-safe summary；当前 explanation 结果复用 inspect/event/async summary，而不是暴露 runtime 私有对象。
- [x] 如果保留 `getNodeDeepDiagnostics()`，将其降级为 convenience wrapper，明确它不是本计划的主价值面。当前未新增这类主导接口。

Exit Criteria:

- [x] explanation contracts 的主价值是回答 AI 的解释型问题，而不是再返回一份快照集合。
- [x] 每个 explanation 结果都有稳定、边界明确、机器可消费的 schema。
- [x] `docs/architecture/debugger-runtime.md` 明确把这些 explanation 接口列为 AI/E2E 推荐入口。

### Phase 2 - Value Origin And Meta Causality

Status: in progress
Targets: `packages/flux-runtime/src/component-handle-registry.ts`, `packages/flux-react/src/use-node-debug-data.ts`, `packages/nop-debugger/src/controller-component-inspector.ts`, related runtime/react touchpoints as needed

- [x] 为节点值解释设计最小数据来源摘要，当前已区分 form state、current scope、ancestor scope、resolved props、resolved meta、unknown。
- [x] 为 meta explanation 设计最小因果摘要，当前已覆盖 `visible`、`hidden`、`disabled`、`label/title`、`className`，但 live fixture 上仍经常退化到 conservative unknown。
- [x] 为 explanation 结果增加 `limitations` 或等价字段，明确哪些回答是“基于当前可见快照的保守解释”，避免把不完整数据伪装成确定性事实。
- [x] 如果 live repo 现有 debug data 不足以支撑 value-origin/meta-causality，补最小只读 debug contract，而不是直接暴露 runtime 私有结构。当前仅补了 dependency summary 到 inspect debugData。
- [ ] 为 Node Tab 适配 explanation 结果，但保持 UI 为次要消费方，automation API 为主。

Exit Criteria:

- [ ] AI 能直接询问节点值和关键 meta 为什么是当前状态，而不是只看到一份 `scopeData` 快照后自己猜。
- [x] explanation 结果能明确说出“已知依据”和“当前无法证明的部分”。
- [x] 新增数据契约仍保持只读、debug-safe、边界清晰。

### Phase 3 - Failure And Async Causality Explanation

Status: in progress
Targets: `packages/nop-debugger/src/diagnostics.ts`, `packages/nop-debugger/src/diagnostics-failures.ts`, `packages/nop-debugger/src/controller.ts`, `packages/nop-debugger/src/automation.ts`

- [x] 在现有 failure summary、interaction trace、async owner snapshot 的基础上，新增 node-scoped 的解释接口，回答“这个节点最近为什么失败/异常/不发布结果”。
- [x] explanation 至少要覆盖：最近失败事件、关联 request instance、interaction、相关 async owner、probable cause hints、当前证据不足时的 limitation。
- [x] 为 async explanation 增加 node-scoped query 规则，只返回与当前节点直接相关或最近相关的 owner 摘要，不返回整份全局 owner 列表。
- [x] 让 failure/async explanation 结果引用现有 focused APIs 的证据，而不是复制一份松散的大对象。
- [x] 为常见 AI 问题定义 scoped selectors，例如按 `cid`、`nodeId`、`path` 或最近 failure infer 的模式查询，但保持 live identity 仍以 `cid` 优先。

Exit Criteria:

- [x] AI 能直接获得节点级失败原因摘要，而不是手工拼接 `getInteractionTrace()`、`getLatestFailedRequest()`、`getAsyncOwnerDebugSnapshot()`。
- [x] async explanation 是 node-scoped、bounded 的，不会返回难以消费的全局大列表。
- [x] failure/async explanation 重用现有 focused evidence，而不是制造第二套松散诊断模型。

### Phase 4 - Deterministic AI Debug Fixtures And Semantic Tests

Status: in progress
Targets: `apps/playground/src/pages/flux-basic-page.tsx`, `apps/playground/src/pages/debugger-lab-page.tsx`, `tests/e2e/debugger.spec.ts`, focused tests under `packages/nop-debugger/src/*.test.ts`

- [x] 在 playground 中增加 deterministic fixture，至少覆盖以下已知真相场景：
  - 一个可验证 value origin 的字段或显示值。
  - 一个可验证 meta/visibility/disabled 原因的节点。
  - 一个 async owner supersede/cancel/timeout 或 request abort 场景。
  - 一个 action -> api -> error 或 validation -> failure 的可解释失败链。
- [x] 为 explanation contracts 编写 focused unit/controller tests，验证返回的是正确解释语义，而不是仅验证字段存在。
- [x] 为 explanation contracts 编写 Playwright tests，使用 `page.evaluate()` 直接调用 `window.__NOP_DEBUGGER_API__` 并断言 explanation 结果与 fixture 的当前已知真相一致，包括 `unknown + limitations` 的保守回答边界。
- [x] 为 boundedness 编写测试，验证 evidence/event/async owner 数量受限，且结果通过 `truncated` 或等价字段显式说明裁剪。
- [x] 为 redaction 编写测试，验证 explanation 结果引用的导出数据仍遵守脱敏边界。

Exit Criteria:

- [x] Playwright 能证明 AI 在真实页面上发起解释型问题时，返回结果与 fixture 的当前已知真相一致。
- [x] 单测和 E2E 保护 explanation 语义、boundedness、redaction，而不是只保护 API 可调用。当前 focused 单测已覆盖 boundedness/redaction，targeted Playwright contract test 也已恢复通过。
- [ ] fixture 足够确定，避免“测试通过但无法说明 AI 是否真正得到有用答案”。

### Phase 5 - Docs Sync And Closure Discipline

Status: in progress
Targets: `docs/architecture/debugger-runtime.md`, `docs/logs/2026/04-25.md`, this plan file if status changes

- [x] 更新架构文档，把 explanation contracts、bounded schema、AI 推荐查询方式写成当前基线。
- [x] 在文档中明确当前 explanation 的能力边界和 limitation 语义，避免过度承诺“完全因果解释”。
- [x] 在 daily log 记录本计划的关键取舍：为何不再以聚合快照 API 为主，为何 explanation 结果需要 bounded schema。
- [x] 完成后进行独立 closure audit，验证本计划实现的是 explanation contract 语义，而不是又一次接口包装。

Exit Criteria:

- [x] 文档明确说明 explanation contracts 是 AI-first debugger 的主入口。
- [x] 文档与 live code 对 limitation/boundedness 的描述一致。
- [x] closure audit 明确检查“解释语义已落地”，而不是仅检查方法名存在。

## Validation Checklist

- [x] 至少一组 explanation contracts 已落地，并能直接回答 value/meta/failure/async 解释型问题。
- [x] explanation 结果是 machine-oriented schema，而不是随意拼接的大对象。
- [x] explanation 结果明确区分已知依据、限制条件、相关证据引用。
- [x] boundedness 规则已落地并有测试保护。
- [x] redaction/export 边界对 explanation 结果仍然成立。
- [x] deterministic playground fixtures 已落地，覆盖 value origin、meta causality、async/failure chain。
- [x] focused unit/controller tests 已覆盖 explanation 语义。
- [x] Playwright contract tests 已覆盖 explanation 契约。
- [x] `docs/architecture/debugger-runtime.md` 已更新。
- [x] `docs/logs/2026/04-25.md` 已更新。
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据。
- [x] `pnpm --filter @nop-chaos/nop-debugger typecheck`
- [x] `pnpm --filter @nop-chaos/nop-debugger build`
- [x] `pnpm --filter @nop-chaos/nop-debugger lint`
- [x] `pnpm --filter @nop-chaos/nop-debugger test`
- [x] `pnpm test:e2e`（targeted debugger explanation contract run）
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [x] `pnpm lint`
- [ ] `pnpm test`

## Risks And Rollback

- 风险 1：如果 explanation contract 过度承诺完整因果链，实际数据来源不足时会输出伪确定性答案。规避方式：所有 explanation 结果必须有 `limitations` 或等价字段。
- 风险 2：如果 explanation 结果不做 bounded schema，AI 会拿到难以消费的大 payload。规避方式：对 evidence/event/async owner 数量做硬边界，并显式标记裁剪。
- 风险 3：如果为了 value-origin explanation 直接暴露 runtime 私有对象，后续维护成本会急剧上升。规避方式：补最小只读 debug contract。
- 风险 4：如果 E2E 没有 deterministic fixture，只能验证 plumbing，不能验证 explanation 真正有用。规避方式：先做已知真相 fixture，再写语义断言。
- 风险 5：如果实现中发现 value-origin 或 meta-causality 所需的 live 数据超出本计划可控范围，应缩小当前 explanation 范围并在结果中显式表达 unknown/unsupported，而不是扩成 runtime 大重构。

## Closure

Status Note: keep this plan at `partially completed`. The AI-first explanation surface, bounded schema, controller/automation wiring, docs sync, package-level verification, targeted Playwright contract coverage, and focused boundedness/redaction unit tests are landed. The previous environment-level Vite/Tailwind overlay blocker has been fixed, but live value/meta explanations still often degrade to conservative `unknown + limitations`, so the semantic closure bar for this plan is still not met.

Closure Audit Evidence:

- Reviewer / Agent: independent draft review `ses_23af1f5c3ffeUBnDr3UNrwRBl3`; independent closure-audit `ses_23ab35b15ffeo8l0fYxH4CkKs2`
- Evidence: closure audit concluded Phase 1 is complete and docs sync is landed; follow-up implementation since that audit also added focused boundedness/redaction tests and fixed the missing workspace CSS alias that caused the `flux-basic` Vite/Tailwind overlay failure, but the plan still must remain `partially completed` because live value/meta explanations still degrade to conservative `unknown`, and failure attribution is only partially strict.

Follow-up:

- 继续补强 Phase 2/4：让 deterministic live fixtures 能产出更有用的 value/meta explanations，而不是主要落到 `unknown + limitations`。
- 继续补强 deterministic live fixtures 与 inspect/debug data，让 value/meta explanation 在真实页面上更常返回有用依据，而不是主要落到 `unknown + limitations`。
- 如果后续需要“依赖传播全链路解释”或“更精细的值来源证明”，应拆 successor plan；不要在本计划 closure 时隐含保留未归属 debt。
