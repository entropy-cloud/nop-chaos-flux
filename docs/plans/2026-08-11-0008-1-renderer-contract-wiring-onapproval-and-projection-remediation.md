# 1 Renderer 契约接线收口：onApproval 编译注册（P0）+ 投影重建信号盲区（P1）（ai-invariant-loop）

> Plan Status: completed
> Mission: ai-invariant-loop
> Last Reviewed: 2026-08-11
> Source: `docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`（FIND-01 [P0]、FIND-06 [P1]）；live repo 核对 2026-08-11（行号以审计时点为准，执行时 live 复核）
> Source Audits: `docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`
> Related: `docs/plans/2026-08-11-0008-2-engine-loop-termination-and-error-carrier-remediation.md`（engine 循环/清理面 P1）、`docs/plans/2026-08-11-0008-3-conversation-adapter-host-contract-remediation.md`（adapter/宿主契约面 P1）；三者共享 2026-08-10-2245 双审计路由面，closure surface 各自独立

## Purpose

修复本轮 multi-audit 的 renderer 契约接线族 2 条：① **FIND-01 [P0]** —— `onApproval` 事件在 ai-chat / ai-bubble 的 `RendererDefinition.fields` 中未注册，schema 层 HITL 审批结构性不可达，且 P2-4 修复的回归测试用 spy 注入绕过编译器（假绿）；② **FIND-06 [P1]** —— P1-6 投影重建修复的触发谓词仍漏两类"无信号"替换：等长原地元素替换（盲区 A）与 idle→processing 会话交换（盲区 B），`${messages}` 绑定区域长期显示陈旧数据。

收口状态：两条 finding 全部修复（test-first 先红后绿，真实编译管线断言）、AI 包测试全绿、P2-4 假绿测试重写为真实管线测试、项目登记处同步。

## Current Baseline

（live repo 核对，2026-08-11；HEAD `ab2a1622`；行号 = 审计时点）

- **FIND-01（onApproval 未注册，P0）**：`src/ai-renderer-definitions.ts` ai-chat fields（`:48-76`）事件止于 `onBranchChange`（`:76`），ai-bubble fields（`:99-108`）唯一事件也是 `onBranchChange`（`:108`）；对比 ai-tool-call **有** `{ key: 'onApproval', kind: 'event' }`（`:201`）。`packages/flux-compiler/src/schema-compiler/fields.ts:44-50` 对未声明 `on*` key 落入 `kind:'prop'`；`packages/flux-react/src/node-renderer-resolved.tsx:243-271` 仅从 `eventPlans` 构建 `props.events` → `props.events.onApproval` 恒 `undefined`。`src/schemas.ts:88-95`、`:135-141` 公开契约 doc-comment 承诺完整 threading。行为面：ai-chat context 回调（`ai-chat.tsx:259-262`）无条件 dispatch `eventsRef.current.onApproval?.()` → 静默 no-op（按钮可点无反应）；独立 ai-bubble 路径 gate `props.events?.onApproval`（`ai-bubble/index.tsx:321-336`）→ `undefined` → `hitl-no-handler` 守卫（`ai-tool-call.tsx:211`）→ 按钮 disabled。`src/renderers/__tests__/ai-bubble-hitl.test.tsx:78-90,110-119,145-152` 用 `{ ...props.events, onApproval: spy }` 注入绕过编译器，且测试 schema（`:110-119`）本身不含 `onApproval` → 真实编译渲染下断言必失败（假绿）。
- **FIND-06（投影重建盲区 A/B，P1）**：`src/renderers/ai-chat.tsx:317-336` 触发谓词四信号（isProcessing 翻转 / requestState 终态 / idle 数组引用变化 / idle length 变化）均为粗粒度。盲区 A：abort 同步翻转 → `terminalCrossed` 克隆读到**未清理**消息，随后异步 executor settle 的 `cleanDanglingAssistantAt` 原地等长替换（`engine/tool-execution.ts:145-158`、`engine/utils.ts:208-214` strip-keeps-text 分支、`engine/create-engine.ts:483-491` commitAssistant）不换引用、不改 length → 无信号 → `${messages}` 区域保留 pre-strip ghost tool_calls 直到下一轮次（可能永不）。盲区 B：idle→processing 会话交换（`use-conversation.ts:73-75,356-357` switch-while-stream + ai-chat null-switch 窗口）时 `!isProcessing` gate 短路 `idleMessageReplacement`，`crossedBoundary` 需要 processing→idle，`terminalCrossed` 在 processing 期恒 false → 投影全程显示上一会话数据。影响面：`${messages}` 绑定区域（header/beforeMessages/afterMessages/footer/emptyState）；主消息列表读 live context 不受影响。P1-6 注释声称"rebuild triggers are now 1..4"过度声明。
- **既有测试锚点**：`renderers/__tests__/ai-bubble-hitl.test.tsx`（FIND-01 假绿待重写）、`renderers/__tests__/ai-chat-projection.test.tsx`（FIND-06 扩展）；`contract-honesty` 门禁只查「已声明未消费」不查「已消费未声明」（`scripts/audit/` 相关规则）。
- **Bug note 编号**：live 最高 **146**（1606-3 收口），新增编号 **147+**（三 plan 共享编号区，按提交顺序分配）。
- **授权**：属 `implement` 默认授权；`fields` 注册与投影谓词修正不改变公共 API 签名 → 不触发结构性重构人工确认门。

## Goals

- FIND-01：ai-chat / ai-bubble 两处 `fields` 注册 `{ key: 'onApproval', kind: 'event' }`（对齐 ai-tool-call `:201`）；`ai-bubble-hitl.test.tsx` 重写为**真实编译管线**断言（schema 声明 `onApproval`，经 `eventPlans` 到达 `props.events.onApproval`，移除 spy 注入），修复前 RED / 修复后 GREEN。
- FIND-06：投影 idle 守卫加元素恒等指纹（last-message id + finishReason + tool_calls length），engine 身份交换（A→B）无条件克隆（去掉 `!isProcessing` gate 或加 engine-identity 信号）；两条回归：swap-to-streaming 立即显示 B 数据；abort-mid-executor strip 后投影 ghost tool_calls 消失。
- 类别清扫：全包 `on*` 已消费/已声明核对（FIND-01 同族排查）+ 引擎状态镜像面核对（FIND-06 同族排查）。
- 收口：AI 包测试全绿零回归；`check:ai-engine-invariants` 零命中；owner docs（design.md / renderers.md）同步；bug notes 147+。

## Non-Goals

- 不处理 engine 循环/清理面 P1（R1-F1 / FIND-03，已入 `docs/plans/2026-08-11-0008-2`）。
- 不处理 adapter/宿主契约面 P1（FIND-02 / FIND-04 / FIND-05，已入 `docs/plans/2026-08-11-0008-3`）。
- 不处理 P2（已入 `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog）。
- 不扩展 `check:ai-engine-invariants`（本族为渲染接线面，用渲染测试收口）；不改公共 API 签名；不改布局/样式体系。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/ai-renderer-definitions.ts`（FIND-01 两处 fields 注册）、`src/renderers/__tests__/ai-bubble-hitl.test.tsx`（FIND-01 假绿测试重写）。
- `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`（FIND-06 投影触发谓词）、`src/renderers/__tests__/ai-chat-projection.test.tsx`（FIND-06 回归扩展）。
- 回归测试：真实编译管线的 ai-bubble HITL 审批 dispatch 断言；投影盲区 A/B 两条。
- 文档：`docs/components/flux-renderers-ai/design.md`（投影触发语义）、`docs/components/flux-renderers-ai/renderers.md`（事件注册面如有说明）、bug notes、daily log。

### Out Of Scope

- 其余 P0/P1（engine 面 / adapter 面）、全部 P2、公共 API 重构、门禁脚本新增（如审阅裁定 FIND-01 需补 compile-registration gate，另立 backlog 项，不在本 plan 承诺）。

## Failure Paths

| 场景               | 触发                                                           | 行为                                                  | 可重试 | 用户可见表现                 |
| ------------------ | -------------------------------------------------------------- | ----------------------------------------------------- | ------ | ---------------------------- |
| hitl-no-handler    | 气泡路径 schema 声明 onApproval 后点击审批按钮                 | 回归测试 RED；修复后事件经 eventPlans 到达并 dispatch | 是     | 审批/拒绝按钮生效，回调触发  |
| hitl-silent-noop   | ai-chat 路径声明 onApproval 后点击审批按钮                     | 回归测试 RED；修复后回调触发（不再静默 no-op）        | 是     | HITL 审批动作真正执行        |
| projection-stale-a | abort-mid-executor 后 strip-keeps-text 原地等长替换            | 回归测试 RED；修复后投影 ghost tool_calls 立即消失    | 是     | `${messages}` 区域与列表一致 |
| projection-stale-b | 会话 A(idle)→B(processing) 后台流式交换（switch-while-stream） | 回归测试 RED；修复后投影立即显示 B 数据               | 是     | 摘要/计数/空态与当前会话一致 |

## Test Strategy

本档选择：必须自动化

两条 finding 均为已确认 live defect / contract drift，Proof（RED 回归）先于 Fix；FIND-01 的 Proof 必须走**真实编译管线**（`RendererDefinition.fields` → schema-compiler → `props.events`），禁止 spy 注入。复杂交互 bug 按 guide 补 bug note（147+）。

## Execution Plan

### Phase 1 — onApproval 编译注册修复 + 假绿测试重写（FIND-01 [P0]）

Status: completed
Targets: `packages/flux-renderers-ai/src/ai-renderer-definitions.ts`、`src/renderers/__tests__/ai-bubble-hitl.test.tsx`、`src/schemas.ts`（如注册面需补）

- Item Types: `Fix | Proof | Decision`

- [x] Proof: RED 回归测试（真实编译管线）——`ai-bubble-hitl.test.tsx` 重写：测试 schema 声明 `onApproval: { actionType: ... }`，经真实 `RendererDefinition.fields` 编译渲染，断言 `props.events.onApproval` 存在且点击审批按钮 dispatch 后回调收到事件；移除 `{ ...props.events, onApproval: spy }` 注入；修复前 RED（真实编译下 `captured` 恒空）
- [x] Proof: RED 回归测试（ai-chat 路径）——ai-chat schema 声明 `onApproval` → 断言 `eventsRef.current.onApproval` 非空、审批按钮点击触发回调（修复前静默 no-op）
- [x] Decision: 裁定 FIND-01 类别清扫策略——全包 `on*` 键 × `fields` 注册核对：ai-chat（onResponseComplete/onError/onAbort/onConversationChange/onBranchChange 已注册；onApproval 待补）、ai-bubble（onBranchChange 已注册；onApproval 待补）、ai-sender/ai-feedback/ai-conversations 等其余定义逐个核对已消费 `props.events.*` 与已声明字段一致性；核对结论入档。若发现其他"已消费未声明"实例，一并修复（实例+类别纪律）
- [x] Fix: `ai-renderer-definitions.ts` ai-chat fields 追加 `{ key: 'onApproval', kind: 'event' }`、ai-bubble fields 追加 `{ key: 'onApproval', kind: 'event' }`（对齐 ai-tool-call `:201`）；确认 `schemas.ts` `onApproval?: ActionSchema` 注释与 threading 承诺落地
- [x] Fix: `ai-bubble-hitl.test.tsx` 全量重写——schema 声明 `onApproval`、移除 spy 注入、断言真实 dispatch；同文件模块级 `let captured` 无 afterEach 重置问题（FIND-21 [P2] 同面）顺带按既有正确模式（`ai-chat-projection.test.tsx:83-88`）加 afterEach 重置
- [x] Fix: 类别清扫入档——`contract-honesty` 门禁方向的补门禁评估（已消费未声明反向检查）结论记录到本 plan 文档同步面；是否落门禁由执行时按 scripts/audit 框架可行性裁定（不强制）

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。写法原则：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续所必需的局部检查。

- [x] FIND-01 两条 RED 测试转 GREEN（真实编译管线断言，非 spy 注入）；ai-bubble 与 ai-chat 双路径审批 dispatch 可用
- [x] `ai-bubble-hitl.test.tsx` 无 spy 注入痕迹（grep 无 `wrappedEvents`/`captured.push` 注入模式）、无模块级泄漏（afterEach 重置）
- [x] 类别清扫记录入档（全包 `on*` 已消费/已声明核对结论）

### Phase 2 — 投影重建信号盲区修复（FIND-06 [P1]）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`、`src/renderers/__tests__/ai-chat-projection.test.tsx`

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试（盲区 A）——abort-mid-executor 且 strip-keeps-text 场景：异步 settle 后 `${messages}` 投影区域断言无 ghost tool_calls（修复前投影保留 pre-strip 形状直到下一轮次）
- [x] Proof: RED 回归测试（盲区 B）——会话 A(idle) 完成 → 切换到后台流式会话 B（processing 态）→ 断言 `${messages}` 投影区域立即显示 B 的数据（修复前显示 A 直到 B 完成）
- [x] Fix: `ai-chat.tsx` 投影触发谓词扩展——idle 守卫加元素恒等指纹（last-message id + finishReason + tool_calls length 组合）；engine 身份交换（activeEngine 引用变化）无条件克隆（移除 `!isProcessing` gate 或新增 engine-identity 信号）；`snapSourceRef`/`snapLength` 每 render 收敛语义保持，流式不克隆成本纪律保持
- [x] Fix: 类别清扫——`ai-chat.tsx` 引擎状态镜像面复核（P1-6 清扫的延续）：投影快照 / `hostScopeData` bundle / `chatContextValue` / `onResponseComplete` handoff 四面对照新谓词复核，结论入档
- [x] Fix: 测试扩展——盲区 A/B 回归 + 既有 turn-boundary 稳定性用例零回归（P1#2 gated-streaming 等）

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。写法原则同 Phase 1。

- [x] FIND-06 两条 RED 测试转 GREEN（盲区 A/B 断言全绿）
- [x] 既有投影 turn-boundary 稳定性测试零回归
- [x] 类别清扫记录入档（引擎状态镜像面核对结论）

### Phase 3 — 登记处同步 + 收口

Status: completed
Targets: `docs/components/flux-renderers-ai/design.md`、`docs/components/flux-renderers-ai/renderers.md`、`docs/bugs/`、`docs/logs/2026/08-11.md`

- Item Types: `Fix | Proof | Follow-up`

- [x] Fix: `design.md` 投影节更新（触发谓词含元素恒等指纹 + engine 身份交换无条件克隆）；如事件注册面有说明则同步 renderers.md
- [x] Fix: bug notes 147+（FIND-01 假绿测试 + FIND-06 盲区 A/B，按 guide）
- [x] Proof: AI 包全量测试 + `pnpm typecheck/lint`（AI 包）零回归
- [x] Follow-up: daily log `docs/logs/2026/08-11.md` 记录本 plan 收口

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。写法原则同 Phase 1。

- [x] design.md / renderers.md / bug notes 同步到位（live 核对一致）
- [x] AI 包测试全绿零回归
- [x] daily log 收口记录落档

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session `ses_0138d6435ffe31FjQMoum4LNrB`）
- Verdict: `pass`（达成共识：零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed: 3 Minor（授权声明补 protected-area 先例引用 → 已在 Phase 3 daily log 项执行时落档；Phase 2 命名精度 `activeEngine` → `resolved.engine`/`rawEngine` 信号——实现意图无歧义，执行时按实际变量接线；FIND-21 双条目措辞——Deferred 条目已注记 in-scope 顺带覆盖，保持自洽）

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] FIND-01 两条 P0 面（onApproval 注册 + 假绿测试重写）已修复落地（真实编译管线断言在案）
- [x] FIND-06 两条盲区（A/B）已修复落地（RED→GREEN 证据在案）
- [x] 类别清扫记录入档（`on*` 已消费/已声明核对 + 引擎状态镜像面核对）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步（design.md / renderers.md / bug notes / daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### P2 全量（24 条，两审计）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 全部为 P2（非阻断 polish / 文档腐化 / 残余清理），已按 mission-driver 规则入 `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog（带源审计路径），不阻塞本 plan 的 1 P0 + 1 P1 收口
- Successor Required: `no`

### FIND-21 同面项（ai-bubble-hitl.test.tsx 模块级 `let captured`，multi P2）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: P2 项；但本 plan Phase 1 重写该测试文件时按既有正确模式顺带修复（同一文件改动面），不单独承诺
- Successor Required: `no`

## Non-Blocking Follow-ups

- P2 项处理见 roadmap Follow-up Backlog（2026-08-10-2245 填充节）。
- compile-registration 反向门禁（consumed events ⊆ registered fields）评估：若执行时发现 scripts/audit 框架扩展成本低且 `contract-honesty` 同族，可登记为候选门禁（不进本 plan closure 承诺）。

## Closure

Status Note: 2026-08-11 收口。FIND-01 [P0]（ai-chat/ai-bubble `fields` 注册 `onApproval` event + `ai-bubble-hitl.test.tsx` 重写为真实编译管线断言，spy 注入移除 + FIND-21 同面 afterEach 修复）+ FIND-06 [P1]（投影谓词第 5 信号元素恒等指纹 + engine 身份交换无条件克隆，盲区 A/B 回归）全部落地；类别清扫双面入档（`on*` 已消费/已声明核对零其他实例 + 引擎状态镜像四面对照）；AI 包 77 files/662 tests 全绿；`pnpm typecheck/build/lint` 37/37、`pnpm test` 66/66 tasks；`pnpm check` 零新增命中（仅既有登记红：audit-event-dispatch-ctx 6 条 industrial + oversized 2 exempt locale）；`check:ai-engine-invariants` exit 0。owner docs（design.md / renderers.md / bug notes 147-148 / daily log 2026-08-11）同步；源审计 `docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md` `planned → closed`（剩余 engine/adapter 族 FIND-02/03/04/05 由 plan `2026-08-11-0008-2`/`0008-3` 独立 closure surface 跟踪）；roadmap Follow-up Backlog 补 P0/P1 路由收口注记。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（task `ses_0134f556cffer9khmovGaoTHw8`）
- Evidence: verdict **pass-with-minors**——G1 plan 一致性 PASS（全 Phase [x] + Status completed + Exit Criteria 全勾，Closure Gates 在审计前如实保持未勾）/ G2 代码落点 PASS（ai-renderer-definitions.ts:77/:110 双注册 + ai-chat.tsx 指纹助手 + 无条件 engineIdentitySwap，流式纪律保持）/ G3 测试诚实 PASS（零 spy 注入、schema 声明 onApproval、真实编译管线断言、FIND-06 双用例断言正确后置条件）/ G4 验证 PASS（复跑 AI 包 77 files/662 tests + typecheck + lint + check:ai-engine-invariants exit 0 + oversized 仅 2 exempt；全仓 37/37×4 可信）/ G5 零静默降级 PASS（Deferred 仅 P2 backlog + FIND-21 同面已就地修复）/ G6 docs 同步 PASS / G7 类别清扫 PASS / G8 门禁诚实 PASS（执行 session 未预勾审计项）。3 Minor 均文档 truthfulness 非阻塞，已就地修复：① 文件计数 76→77（`ai-chat-projection-find06.test.tsx` 拆分）；② daily log 终态措辞（closure 后修订版）；③ bug 148 Tests 路径指向 split 文件。

Follow-up:

- P2 全量（24 条）继续留在 `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog，随后续 plan 处理。
- compile-registration 反向门禁（consumed events ⊆ registered fields）评估结论：不落门禁（需新消费点提取启发式），候选 backlog 登记。
- engine/adapter 面 FIND-03（plan `2026-08-11-0008-2`）与 FIND-02/FIND-04/FIND-05（plan `2026-08-11-0008-3`）为共享审计剩余 closure surface，执行序 2→3。
