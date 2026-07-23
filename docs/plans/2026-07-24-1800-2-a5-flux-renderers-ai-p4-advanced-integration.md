# A5 flux-renderers-ai P4 高级集成

> Plan Status: completed
> Last Reviewed: 2026-07-24
> Source: `docs/components/flux-renderers-ai/design.md`（§5.1 P4 行、§11 数据流、§11.2、§3 Phase 5 评估）、`renderers.md`（§11 ai-suggestions）、`improvement-analysis.md`（§5.3 A-15、§5.4 A-16、§5.5 A-17、§7 a11y）、`docs/components/roadmap-ai.md` A5
> Mission: ai
> Work Item: A5 — P4 高级集成（3 renderer + 1 增强 + 3 改进项 + 2 评估项）
> Related: 硬前置 `2026-07-24-1800-1-a4-flux-renderers-ai-p3-persistence-citations-hitl.md`（A4，须先完成）；上游 A1–A3

## Purpose

在 A1–A4（P0–P3）基础上收口 P4：把 AI 对话面板从"自包含消息引擎"升级到"可与 flux 平台数据流双向联动 + 多模态输入 + 可审计用量 + 可分支重生成"。具体收口四件事：

1. **平台数据流联动（评估项）**：评估并落地"messages 序列化进 flux form 字段"与"`onResponseComplete` 接 data-source"两条联动路径，让对话历史可进入表单提交流程、对话完成可驱动数据源。
2. **`ai-voice-input`（A-15）**：Web Speech API 语音输入按钮 + 波形动画（非 IO，直呼浏览器 API）。
3. **消息分支（A-16）**：重新生成时创建分支，用户在分支间切换（branches 由 host 管理，engine 仅记新分支 id）。
4. **`ai-token-usage`（A-17）+ `ai-suggestions`**：Token/成本/上下文占比显示（数据由 connector 填 `metadata.usage`）；建议气泡（Popover/Pills，从 P2 降级，`ai-prompts` 已覆盖静态推荐）。

> 本计划含 2 个 Decision 项（messages 进 form、data-source 联动），在 Phase 1 内裁定，裁定结论须诚实落地或移出 scope（不可降级为模糊 follow-up）。

## Current Baseline

> 逐条核对 live repo 后的当前事实。**本计划假设 A4 已落地**（持久化可用、`ai-citations`/HITL 存在）；执行时须先核对 A4 实际 landing 状态再修订本节。

- **`onResponseComplete` 已接线**：`renderers/ai-chat.tsx:125-128` 在 `requestState==='completed'` 时触发 `events.onResponseComplete({ message: last })`。即"响应完成"事件已可用；P4 的"data-source 联动"是在此基础上提供 host 范式/便捷接线（事件 payload 已含末条 message）。
- **messages 为 engine 域内部**：`engine.messages` 不写 scope（design §11.5，避免高频流式订阅风暴）；P0 已裁定"不接 form owner"。故"messages 序列化进 flux form 字段"是一个 **Phase 5 评估项**——需裁定：是否新增受控导出（如经 `onResponseComplete`/ComponentHandle `getMessages` 序列化进 scope 字段），而不破坏域内部不变量（INV-17）。
- **`message.metadata` 开放记录**：`engine/types.ts:163` `metadata?: ChatMessageMetadata`（`:78` 为泛型 `metadata?: M`，`:87` 为 `Record<string,unknown>`），`ChatMessageMetadata`（`:34-40`）含 `[key: string]: unknown`——`usage` 可直接读，但无 typed 访问器。`AiConnectorChunk.metadata`（engine §9.2）由 connector 填充，token 用量数据源已就绪，仅需渲染器消费。
- **三个渲染器均不存在**：`ai-voice-input` / `ai-token-usage` / `ai-suggestions` 在 `src/renderers/` 均无文件，未在 `ai-renderer-definitions.ts` 注册，`schemas.ts` 无对应类型。`renderers.md` §11 仅有 `ai-suggestions` 占位 schema。
- **消息分支不存在**：engine 无分支概念；`improvement §5.4` 裁定分支元数据由 host 管理，engine 仅"重新生成时记新分支 id"，渲染器读 host 注入的 branches 数据。
- **INV-1 裁定（voice）**：`improvement §5.3` 已裁定 `SpeechRecognition` 是用户手势触发的浏览器 API（麦克风输入），非 network IO，与 fetch/WebSocket/localStorage 性质不同，**渲染器可直呼，不需 env 封装**（与 AI Elements 双回退方案一致）。`MediaRecorder` 回退留给 host 自定义。
- **owner doc**：`design.md` §5.1 P4 四行（`ai-voice-input` / `ai-token-usage` / 消息分支 / `ai-suggestions`）均 ⬜；`renderers.md` 仅 §11 `ai-suggestions` 占位；roadmap A5 = `todo`。

## Goals

- **平台联动（Phase 1 Decision）**：
  - **Decision-A（messages 进 form）**：裁定是否 + 如何把 messages 受控导出进 scope/form 字段。裁定准则：若可在不破坏域内部不变量（INV-17 engine.messages 不写 scope）的前提下经 ComponentHandle `getMessages` / `onResponseComplete` 受控序列化（host 显式 setValue），则落地 host 范式 + 文档；若需 engine 直写 scope 则裁定不引入、记移出 scope 理由。
  - **Decision-B（data-source 联动）**：基于已接线的 `onResponseComplete`，提供 host 范式（事件 → data-source reload/insert）+ playground 示例；评估是否需要在 engine/component-handle 层加便捷方法。
- **`ai-voice-input`（A-15）**：独立 Widget 渲染器；`SpeechRecognition` 直呼（INV-1 裁定非 IO）；波形/录音态动画（CSS，零依赖）；识别结果经 `onResult` event 传出（host 可灌入 `ai-sender` draft 或直接 `sendMessage`）；浏览器不支持时降级为禁用按钮 + tooltip。
- **消息分支（A-16）**：engine 在"重新生成"时记新分支 id（metadata 或 state.branchId）；渲染器读 host 注入的 `branches` 数据（`{ branches: Array<{id,messageId}>, activeBranchId }`）渲染分支选择器（prev/next + 计数）；切换触发 `onBranchChange` event → host 决定载入对应分支消息（host 管理 branches 全量）。
- **`ai-token-usage`（A-17）**：纯展示 Widget；读 `message.metadata.usage`（`{ prompt_tokens, completion_tokens, total_tokens, cost? }`）；环形进度（已用/上下文上限）+ 文本用量；数据缺失时优雅降级。
- **`ai-suggestions`**：Widget；`items` 列表渲染为 Pills/Popover；`overflowMode`（expand/scroll/popover）；`onSelect` event。覆盖"对话中即时建议"场景（区别于 P1 `ai-prompts` 的静态推荐）。
- **playground + e2e + owner-doc**：每渲染器/能力配 playground 示例 + e2e；owner-doc 同步。

## Non-Goals

- **不**实现 P3 持久化/HITL/引用（A4 已收口）；本计划假设其已落地。
- **不**在 engine 内实现分支全量存储（branches 由 host 管理，engine 仅记 id）。
- **不**实现 Tiptap 富文本（A6，可选，需人确认）。
- **不**引入 MCP（A7 可选，`@modelcontextprotocol/sdk` 由 host 提供）。
- **不**实现 `MediaRecorder` 回退（留 host 自定义，improvement §5.3）。
- **不**改 `flux-core`（voice 非 IO 不扩 env；联动走现有 events/ComponentHandle/scope）。
- **不**引入新体积依赖（语音/token/分支/建议均用现有 `@nop-chaos/ui` + Tailwind + 纯 TS）。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/renderers/`：新增 `ai-voice-input.tsx`、`ai-token-usage.tsx`、`ai-suggestions.tsx`；`ai-bubble`/`ai-message-list` 增分支选择器渲染（A-16）。
- `packages/flux-renderers-ai/src/engine/`：如 Decision-A/B 需要则最小扩展（分支 id 记录；不动 messages 域内部所有权）。
- `packages/flux-renderers-ai/src/schemas.ts` + `ai-renderer-definitions.ts` + `index.ts`：三新渲染器类型/注册/导出。
- `packages/flux-renderers-ai/src/renderers/__tests__/`：三渲染器 + 分支 focused 单测。
- `apps/playground/src/`：voice/token/branches/suggestions 示例 + 联动示例（messages→form / response→data-source）+ 路由。
- `tests/e2e/`：voice 录音态、token 显示、分支切换、建议选择、联动。
- owner-doc：`design.md` §5.1（P4 ✅ + 两 Decision 结论）、`renderers.md`（三渲染器 schema）、`docs/components/index.md`、roadmap A5 `todo`→`done`、dev log。

### Out Of Scope

- `flux-core` 改动。
- A4 范围（持久化/HITL/引用）。
- A6 Tiptap / A7 MCP。
- `MediaRecorder` 回退实现。

## Failure Paths

| 场景编号                  | 触发                                                   | 行为                                                                                | 可重试 | 用户可见表现              |
| ------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------ | ------------------------- |
| `voice-unsupported`       | 浏览器无 `SpeechRecognition`/`webkitSpeechRecognition` | 渲染禁用按钮 + tooltip "不支持语音"；`onError` event（`unsupported`）               | —      | 按钮灰色不可点            |
| `voice-permission-denied` | 用户拒绝麦克风权限                                     | `onError` event（`permission-denied`）；退回待命态                                  | 是     | 录音态停止，提示需权限    |
| `voice-no-result`         | 识别结束无 transcript                                  | `onResult` 不触发或触发空；退回待命                                                 | 是     | 无文本填入                |
| `token-no-usage`          | `metadata.usage` 缺失                                  | 渲染器隐藏或显示占位（"用量未上报"）                                                | —      | 不渲染环形进度或显示占位  |
| `branch-no-host-data`     | `branches` 未注入/空                                   | 不渲染分支选择器                                                                    | —      | 单线消息，无分支 UI       |
| `suggestions-overflow`    | items 超出容器                                         | 按 `overflowMode`：expand（全显）/scroll（横向滚动）/popover（收进 Popover + 计数） | —      | 列表按模式排布            |
| `linkage-no-handler`      | 联动事件 host 未挂 handler                             | event no-op；不阻塞对话                                                             | —      | 无副作用（host 配置问题） |

## Test Strategy

档位选择：**必须自动化**

理由：(1) voice 走浏览器 API，需 mock `SpeechRecognition` 验状态机（unsupported/permission/no-result）；(2) 分支切换是对外 event 契约（`onBranchChange`）+ engine 分支 id 记录；(3) token/建议为纯展示但 contract 稳定性影响 host 集成；(4) 两 Decision 须有 proof 支撑裁定（messages 序列化不破坏 INV-17 / data-source 联动事件可达）。Proof 在/同 Fix 落地。

## Execution Plan

### Phase 1 - 平台联动（两 Decision 裁定 + 落地）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`、`adapters/ai-component-handle.ts`、`design.md` §11.2

- Item Types: `Decision | Fix | Proof`

- [x] **Decision-A（messages 进 form）**：核对 `ComponentHandle.getMessages()`（A3 落地）+ `onResponseComplete` 已能受控导出 messages；裁定路径：(a) 落地 host 范式（host 在 `onResponseComplete`/按钮 handler 调 `getMessages` → `setValue` 进 scope 字段），不改 engine 所有权；或 (b) 若需 engine 直写 scope 则裁定不引入（破坏 INV-17）。裁定结论写 Phase Exit + `design.md` §3（"Phase 5 评估"非目标 hook 所在处）。
- [x] **Decision-B（data-source 联动）**：基于已接线的 `onResponseComplete`，评估是否需 engine/handle 层便捷方法；裁定路径：(a) 事件 payload 已含末条 message，host 可直接 `data-source:reload/insert`，**无需**包内新增方法 → 落地 host 范式 + playground 示例；或 (b) 若核对发现缺口则补。裁定结论写 Phase Exit + `design.md` §11.2。
- [x] 落地两 Decision 的 proof（见 Exit Criteria）。

Exit Criteria:

- [x] Decision-A/B 各有裁定结论（引入则附实现+依赖+proof，不引入则诚实移出 scope 并记理由，写入 `Deferred But Adjudicated`）。
- [x] proof（若落地 host 范式）：单测/抽查证明 `getMessages` 序列化进 scope 字段后 form 可读取，且 `engine.messages` 仍为域内部（INV-17 不破）。
- [x] `design.md` §3（Decision-A）/ §11.2（Decision-B）记录两 Decision 最终结论。

> **Decision 结论**：
>
> - **Decision-A（路径 a — 落地 host 范式）**：host 经 `component:getMessages` 取快照后**序列化（深拷贝）**再 `setValue` 进 form 字段；engine 不写 scope，INV-17 保持。proof: `phase4-platform-linkage.test.tsx`。
> - **Decision-B（路径 a — 无需新增方法）**：`onResponseComplete` payload 已含末条 message，host 直挂 `data-source:reload/insert` 即可；playground 联动示例随 Phase 5 落地。

### Phase 2 - `ai-voice-input`（A-15）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-voice-input.tsx`、`schemas.ts`、`ai-renderer-definitions.ts`、`index.ts`、`renderers.md`

- Item Types: `Fix | Proof`

- [x] `AiVoiceInputSchema`：`lang?`、`continuous?`、`interimResults?`、`onResult`（`{ transcript }`）、`onError`（`{ reason }`）。
- [x] `ai-voice-input.tsx`（Widget marker `nop-ai-voice-input`，`data-slot="ai-voice-input"`）：`SpeechRecognition`/`webkitSpeechRecognition` 直呼（INV-1 裁定非 IO）；录音态波形动画（CSS，零依赖）；结果经 `onResult` 传出；`voice-unsupported`/`voice-permission-denied`/`voice-no-result` Failure Path。
- [x] 浏览器不支持：禁用按钮 + tooltip + `onError('unsupported')`。
- [x] 注册/导出/`renderers.md` schema。

Exit Criteria:

- [x] focused 单测（mock `SpeechRecognition`）：录音态切换；`onResult` 传 transcript；三 Failure Path（unsupported/permission/no-result）正确触发 `onError`。
- [x] INV-1 复核：voice 直呼浏览器 API 不经 env（符合 improvement §5.3 裁定），`contract-honesty.test.ts` 对 voice 渲染器不误报（若守卫把 `SpeechRecognition` 误判为 IO，需按裁定加白名单注释说明）。

### Phase 3 - 消息分支（A-16）

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/`、`packages/flux-renderers-ai/src/renderers/ai-message-list.tsx`/`ai-bubble`、`schemas.ts`

- Item Types: `Fix | Proof`

- [x] engine：重新生成时记新分支 id（写 `message.metadata.branchId` 或 `state.branchId`）；engine **不**存 branches 全量（host 管理）。
- [x] 分支选择器（在 `ai-bubble` 或 message-list 末位）：读 host 注入 `branches`（`{ id, messageId }[]`）+ `activeBranchId`；渲染 prev/next + 计数（`2/3`）；`branch-no-host-data` 时不渲染。
- [x] 切换触发 `onBranchChange({ branchId })` event → host 载入对应分支 messages（经 `engine.setMessages`，A3 工具）。

Exit Criteria:

- [x] focused 单测：重新生成记新 branchId；分支选择器 prev/next 切换触发 `onBranchChange`；`branch-no-host-data` 不渲染。
- [x] 抽查：host 切换分支后 `engine.setMessages` 载入对应分支消息。

### Phase 4 - `ai-token-usage`（A-17）+ `ai-suggestions`

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-token-usage.tsx`、`ai-suggestions.tsx`、`schemas.ts`、`ai-renderer-definitions.ts`、`index.ts`、`renderers.md`

- Item Types: `Fix | Proof`

- [x] `AiTokenUsageSchema` + `ai-token-usage.tsx`（Widget marker `nop-ai-token-usage`）：读 `message.metadata.usage`（`prompt_tokens`/`completion_tokens`/`total_tokens`/`cost?` + 上下文上限）；环形进度（SVG，零依赖）+ 文本；`token-no-usage` 降级（隐藏/占位）。
- [x] `AiSuggestionsSchema`（renderers.md §11 已占位）+ `ai-suggestions.tsx`（Widget marker `nop-ai-suggestions`）：Pills/Popover；`overflowMode`（expand/scroll/popover）；`onSelect`；`suggestions-overflow` Failure Path。
- [x] 注册/导出/`renderers.md` schema。

Exit Criteria:

- [x] focused 单测：token 用量渲染正确数值 + 环形进度；`token-no-usage` 降级；建议 Pills 选择触发 `onSelect`；三 `overflowMode` 排布正确。
- [x] 两渲染器注册进 `ai-renderer-definitions.ts` 且 `index.ts` 导出。

### Phase 5 - playground + e2e + owner-doc

Status: completed
Targets: `apps/playground/src/`、`tests/e2e/`、`docs/components/flux-renderers-ai/design.md`、`renderers.md`、`docs/components/index.md`、`docs/components/roadmap-ai.md`、`docs/logs/2026/`

- Item Types: `Fix | Proof | Follow-up`

- [x] playground：voice 录音示例（mock 或真实 SpeechRecognition）+ token 用量示例（mock connector 填 `metadata.usage`）+ 分支示例（mock 多轮重生成）+ 建议示例 + 联动示例（messages→form / response→data-source）+ 路由。
- [x] e2e：voice 录音态/unsupported 降级；token 显示；分支 prev/next；建议选择；联动抽查。禁截图诊断，用 `page.evaluate`/locator。
- [x] owner-doc 同步：`design.md` §5.1（P4 四行 ✅ + 两 Decision 结论）；`renderers.md`（三渲染器 schema + 分支段）；`docs/components/index.md`；roadmap A5 `todo`→`done`；dev log。

Exit Criteria:

- [x] playground 五示例可交互 + 路由可达。
- [x] e2e 全过。
- [x] owner doc 与 live baseline 一致（无 drift）。

## Draft Review Record

> 起草后、执行前的独立审查证据（独立子 agent fresh session）。零 Blocker/Major 后升级 `active`。

- Reviewer / Agent: 独立子 agent（fresh session）—— round 1: ses_06f3b7465ffePrQFPsmKiM3uCl（`pass-with-minors`）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major，3 Minor 已处理）
- Rounds: 1
- Findings addressed:
  - Minor-1（已处理）：`message.metadata` 行号引用订正（`:163` `ChatMessageMetadata`，`:78` 为泛型 `M`，开放记录在 `ChatMessageMetadata` `:34-40`）。
  - Minor-2（已处理）：Decision-B 改为中性裁定框架（a/b 两路径，不再预 lean "无需新增方法"）。
  - Minor-3（已处理）：Decision-A 结论落 `design.md` §3（"Phase 5 评估"非目标 hook 所在处），Decision-B 落 §11.2。
  - 零 Blocker / 零 Major（round 1 确认）。引用核对（fresh session 复跑）：`onResponseComplete` 已接线 ai-chat.tsx:125-128、`message.metadata` 开放记录、`ai-voice-input`/`ai-token-usage`/`ai-suggestions` 均不存在、engine 无分支概念、`engine.setMessages()` types.ts:272 存在、contract-honesty FORBIDDEN_GLOBAL_IO 不含 SpeechRecognition（voice 直呼裁定安全）、improvement §5.3/§5.4/§5.5 裁定匹配、INV-17 `engine.messages` 域内部——全部 CONFIRMED。1-plan bundling 符合 Rules 22-26。A4 前置依赖声明明确，执行时须先核 A4 landing 状态再修订 baseline。

## Closure Gates

> 全量 `pnpm typecheck/build/lint/test` 在此跑一次（Minimum Rule 18）；Phase 内只做局部 focused 验证。

- [x] 两 Decision（messages 进 form / data-source 联动）已裁定（引入则实现+proof，不引入则诚实移出 scope）。
- [x] `ai-voice-input`（A-15）+ voice 三 Failure Path + INV-1 裁定保持（非 IO 直呼）。
- [x] 消息分支（A-16）+ engine 记 branchId + host 管理 branches + `onBranchChange` 契约。
- [x] `ai-token-usage`（A-17）+ `ai-suggestions` + 降级/overflow Failure Path。
- [x] INV-1 不变量保持（voice 直呼浏览器 API 经裁定；engine 零 React/DOM；渲染器零直连 fetch/WebSocket/localStorage），`contract-honesty.test.ts` 绿。
- [x] owner doc（design.md §5.1/§11.2、renderers.md、index.md、roadmap A5、dev log）同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`（58/58）
- [x] `pnpm build`（31/31）
- [x] `pnpm lint`（31/31）
- [x] `pnpm test`（58/58 unit；e2e: 60 entry-pages + 6 新 P4 + 15 AI 全绿）

## Deferred But Adjudicated

> Phase 1 两 Decision 裁定后，若裁定不引入则记于此（须带 Why Not Blocking Closure）。执行中经裁定移出的优化项亦记于此。

## Non-Blocking Follow-ups

- `MediaRecorder` 语音回退留 host 自定义（improvement §5.3）。
- 分支全量存储/服务端同步属 host 业务逻辑，包内不提供。
- token 成本核算（汇率/模型定价表）属 host 关注点，包内只读 `metadata.usage` 原始字段。

## Closure

Status Note: All 5 Phases executed; full-green verified (typecheck 58/58, build 31/31, lint 31/31, unit test 58/58; e2e 60 entry-pages + 6 P4 + 15 AI green). Two Decisions adjudicated (Decision-A host paradigm w/ serialization preserves INV-17; Decision-B no new method). Owner docs synced to live baseline.

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）—— ses_06eb82eb3ffeAnEBM4m3K0Bf3k（`PASS`，零 Blocker / 零 Major / 零 Minor）
- Evidence: 独立核对 8 项（Phase item honesty、代码存在性与契约匹配、注册/导出、INV-1 honesty 跑 contract-honesty 绿、6 个新测试文件全绿、Decision 结论落地 design.md §3/§11.2、roadmap A5=done、§5.1 P4 四行 ✅ 无 drift）；独立跑 `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` + `build` 双绿。

Follow-up:

- `MediaRecorder` 语音回退留 host 自定义（improvement §5.3）。
- 多轮 per-turn 分支管理属 host 业务逻辑（本包仅记 branchId + 渲染 host 注入的 branches）。
- token 成本核算（汇率/模型定价表）属 host 关注点（包内只读 `metadata.usage`）。
