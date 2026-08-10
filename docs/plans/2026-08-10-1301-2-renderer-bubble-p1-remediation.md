# 2 Renderer/Bubble 族 P1 修复（投影刷新 / 工具卡展开 / reasoning 面板 / 渲染器遮蔽）（ai-invariant-loop）

> Plan Status: active
> Mission: ai-invariant-loop
> Last Reviewed: 2026-08-10
> Source: `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md`（P1-6/P1-7/P1-8/P1-9）；live repo 核对 2026-08-10
> Source Audits: `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md`
> Related: `docs/plans/2026-08-10-1301-1-engine-adapter-p1-remediation.md`（engine/adapter 层 P1，独立 closure surface）

## Purpose

修复本轮 multi-audit 的 **renderer/bubble 族 4 条 P1**（0 P0）：① ai-chat 投影快照在 engine 替换（会话切换/复水/clear）后不刷新，`${messages}` 区域无限期显示上一会话数据（P1-6）；② 气泡路径工具卡展开控件死——`state?.open ?? internalOpen` 被恒 `false` 短路，`ChatToolCallUIState.open` 字段孤儿化（P1-7）；③ thinkingPlugin 注册后 reasoning 面板永久折叠且禁用（P1-8，与 P1-7 同根族）；④ markdown 渲染器（NORMAL=0）按切片遮蔽 tools/reasoning/image 渲染器（CONTENT=10），混合消息下工具卡/推理面板永不渲染（P1-9）。每条修复带 test-first 回归断言。

收口状态：4 条 P1 全部修复（RED→GREEN）、AI 包测试全绿、design.md/engine.md 同步。

## Current Baseline

（live repo 核对，2026-08-10，HEAD `de36e8e9`；行号 = 审计时点）

- **P1-6（投影快照 engine 替换后不刷新）**：`renderers/ai-chat.tsx:241-264` 投影只依赖 `isProcessing` 翻转重建快照；engine 替换（`setMessages` 复水 / `clear()` / 外部 engine swap）时 `prevIsProcessing === isProcessing`（双 idle）→ 快照永不重建 → header/beforeMessages/afterMessages/footer/emptyState 区域显示上一会话数据直到下一轮次结束（可能永不）。`ai-chat-projection.test.tsx` 只覆盖 streaming turn-boundary 稳定性，无 engine-swap 用例。
- **P1-7（工具卡展开控件死）**：`renderers/ai-tool-call.tsx:52-53` `const open = state?.open ?? internalOpen;`——`state.open===false` 时 `false ?? internalOpen` 不落回 local state；`ai-bubble/renderers/tools.tsx:57-61` `resolveToolState` 在 map 无 key 时返回 `{status:'running', open:false}`；`engine/plugins/tool-plugin.ts:43,63` 两处写 `{status:'running', open:false}`（write-once，从不更新为 true）→ 三条写路径全为 `open:false`，生产代码零 `open:true` 写 → 展开 chevron 死控件、函数参数 JSON 永不可见、`aria-expanded` 恒 false；`onToggle`（`ai-tool-call.tsx:95-99`）无生产接线。
- **P1-8（reasoning 面板永久折叠且禁用）**：`engine/plugins/thinking-plugin.ts:21-26` 首 chunk 写 `{open:false, startedAt}`，后续只更新 `endedAt`；`renderers/ai-bubble/renderers/reasoning.tsx:21-25,35-37,53` `controlled = message.state?.thinking`；`open = controlled ? controlled.open : internalOpen`；`toggle` 仅在 `!controlled` 时写 local state；`disabled={controlled !== undefined}` → 插件注册后按钮恒 disabled、面板永不展开、`internalOpen` 死代码；A-10 测试只断言 label 文本，不覆盖展开/禁用行为。
- **P1-9（markdown 遮蔽 tools/reasoning/image）**：`renderers/ai-bubble/renderers/default-renderers.ts:22-78` 优先级（`ai-bubble/types.ts:19-24`：LOADING=-1 / NORMAL=0 / CONTENT=10 / ROLE=20，**更低优先 = 更先匹配**）；`ai-bubble/index.tsx:211-234` `pickRenderer` 按升序取首个 match。markdown 的 `find`（`:53-60`）匹配非空文本，优先于 tools/reasoning/image（CONTENT=10）→ 标准 R1 形状（文本 + reasoning_content）与交错形状（文本 + tool_calls）只渲染文本；`content:''` 分支已有测试，混合内容分支零覆盖。`resolveContentSlices`（`ai-bubble/types.ts:35-44`）对 string content 只产单一 slice，无第二路径让 tools/reasoning 匹配非空文本消息。
- **门禁现状**：AI 包基线 **69 files / 572 tests 全绿**；renderer 交互面无 engine 不变式门禁覆盖（本族属 UI 交互面，用渲染测试 + focused 断言收口，不扩展 `check:ai-engine-invariants`）。
- 既有测试锚点：`ai-chat-projection.test.tsx`、`ai-tool-call-hitl.test.tsx`、`phase5-deepening.test.tsx`（A-9/A-10 区域）、`p1-renderers.test.tsx`、`ai-bubble` 相关渲染测试。
- Bug note 编号：live 最高 **130**，新增编号 **131+**（与 plan 1 共享编号区，按提交顺序分配）。
- 授权：renderer 修复属 `implement` 默认授权；`ChatToolCallUIState` / `state.thinking` 字段语义修正不改变公共 API 签名（字段保持兼容，语义从 write-once-false 改为 undefined-absent 或 live write-back）→ 不触发结构性重构人工确认门。

## Goals

- 4 条 P1 全部修复（test-first：每条先写 RED 回归测试 → 修复 → GREEN）。
- P1-7/P1-8 按同根族一并收口：裁定"engine 持有的 UI state 必须有 live write-back 或保持 local-only"（对齐历史 A-8 教训 / cross-cutting pattern 1），`ChatToolCallUIState.open` 与 `thinking.open` 不再 write-once-false。
- P1-9：混合消息下 tools/reasoning/image 渲染器可达（消息级匹配先于切片级 markdown，或同消息并行渲染）。
- P1-6：投影快照在 engine 替换 / requestState 终态变化时重建（非仅 isProcessing 翻转）。
- 收口：AI 包测试全绿零回归；design.md / engine.md 相关节同步。

## Non-Goals

- 不处理 engine/adapter 族 P1（已在 `docs/plans/2026-08-10-1301-1-engine-adapter-p1-remediation.md`）。
- 不处理 P2（已入 roadmap Follow-up Backlog）。
- 不做布局/样式体系改动（Styling Contract 不变，仅交互行为修复）。
- 不扩展 `check:ai-engine-invariants`（本族为渲染交互面，用渲染测试收口）；不改公共 API 签名。
- 不处理 HITL 默认气泡路径（P2-4）、`disabled` 节点控制（P2-5）等 P2 项。

## Scope

### In Scope

- `renderers/ai-chat.tsx`（P1-6 投影重建触发条件）、`renderers/ai-tool-call.tsx`（P1-7 展开合并逻辑 + onToggle 接线）、`renderers/ai-bubble/renderers/tools.tsx`（P1-7 resolveToolState 默认值）、`renderers/ai-bubble/renderers/reasoning.tsx`（P1-8 展开/禁用逻辑）、`engine/plugins/tool-plugin.ts` + `engine/plugins/thinking-plugin.ts`（P1-7/P1-8 插件写面）、`renderers/ai-bubble/renderers/default-renderers.ts` + `renderers/ai-bubble/index.tsx`（P1-9 渲染器选择）。
- 回归测试：`ai-chat-projection.test.tsx`、`ai-tool-call-hitl.test.tsx`、`phase5-deepening.test.tsx`、bubble 渲染相关测试文件（新增/扩展用例）。
- 文档：`design.md`（如投影/渲染器选择语义变化）、`engine.md`（插件 state 写面注记）、bug notes、daily log。

### Out Of Scope

- engine/adapter 族 P1、全部 P2、公共 API 重构、样式体系改动。

## Failure Paths

| 场景             | 触发                                                 | 行为                                                                  | 可重试 | 用户可见表现                   |
| ---------------- | ---------------------------------------------------- | --------------------------------------------------------------------- | ------ | ------------------------------ |
| projection-stale | 会话切换/复水/clear 后 `${messages}` 区域不刷新      | 回归测试 RED；修复后 engine 替换即重建快照                            | 是     | 摘要/计数/空态立即显示当前会话 |
| toolcard-dead    | 气泡路径点击工具卡展开 chevron                       | 回归测试 RED；修复后展开/收起可用、参数 JSON 可见、aria-expanded 正确 | 是     | 工具调用参数可审查             |
| reasoning-locked | thinkingPlugin 注册后点击 thinking 面板              | 回归测试 RED；修复后面板可展开、按钮不 disabled                       | 是     | R1 推理内容可审查              |
| renderer-shadow  | 混合消息（文本+reasoning_content / 文本+tool_calls） | 回归测试 RED；修复后 tools/reasoning 与文本同现                       | 是     | 工具卡/推理面板可见            |

## Test Strategy

本档选择：必须自动化

渲染交互行为用 focused 渲染测试（真实 renderer + mock engine state 注入）断言可观测结果（DOM 结构 / aria 属性 / 回调调用）；每条 P1 的 Proof（RED）先于 Fix。复杂交互 bug 按 guide 补 bug note（131+）。

## Execution Plan

### Phase 1 — 工具卡展开 + reasoning 面板同根族收口（P1-7 + P1-8）

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx`、`src/renderers/ai-bubble/renderers/tools.tsx`、`src/renderers/ai-bubble/renderers/reasoning.tsx`、`src/engine/plugins/tool-plugin.ts`、`src/engine/plugins/thinking-plugin.ts`

- Item Types: `Fix | Proof | Decision`

- [ ] Proof: RED 回归测试（P1-7 气泡路径）——气泡渲染 assistant 消息（`state.toolCall[key]` 存在或 map 缺 key）→ 点击展开 chevron → 断言函数参数 JSON 区域出现、`aria-expanded=true`；修复前 RED
- [ ] Proof: RED 回归测试（P1-8 插件路径）——thinkingPlugin 注册 + reasoning_content 消息 → 断言折叠按钮 `disabled` 为 false 且点击后面板展开（内容可见）；修复前 RED
- [ ] Decision: 裁定统一策略——`ChatToolCallUIState.open` / `thinking.open` 采用「插件不写 `open:false`（保持 undefined，让 `?? internalOpen` 生效）或 renderer 合并 `state?.open !== undefined ? state.open : internalOpen` + `onToggle` 写回 engine state」二选一；**默认倾向 = 方案 A（插件不 pin `open:false`，保持 undefined-absent + renderer 本地展开态）**——engine 侧无已验证的 `message.state.toolCall/thinking` 写回 API（仅 `setMessageEditing` 存在，见 multi P2-10），方案 B 需新引擎写回面；若执行中发现方案 A 与虚拟化行回收（local state 丢失）冲突且存在可用写回 API，再升格方案 B（写回引擎 + `onToggle` 接线）；裁定理由入档
- [ ] Fix: `tool-plugin.ts` 两处写面停止写 `open:false`（改为仅在 status 变更时写，`open` 保持 undefined）或按裁定写回；`tools.tsx:57-61` `resolveToolState` 默认值同步（无 key 时 `open` 保持 undefined）
- [ ] Fix: `ai-tool-call.tsx:52-53` 合并逻辑改为 `state?.open !== undefined ? state.open : internalOpen`（或按裁定）；`handleToggle`（`:95-99`）接线 `props.onToggle` 写回（如裁定走写回）
- [ ] Fix: `thinking-plugin.ts:21-26` 停止 pin `open:false`；`reasoning.tsx:21-25,35-37,53` 展开合并逻辑与 `disabled` 判定同步修正（`controlled` 存在且 `open` 未定义时允许 local 展开，或 `onToggle` 写回 `state.thinking.open`）
- [ ] Fix: 类别清扫——`ChatMessageUIState` 全部字段消费面核对（`toolCall.*` / `thinking.*` / `editing.*` 的写面与读面），确认无其他 write-once-false 死字段（cross-cutting pattern 1 建议）；清扫记录入档
- [ ] Fix: 测试扩展——A-10 既有断言补展开/disabled 行为断言；虚拟化行回收场景抽查（local 展开态不因回收丢失）

Exit Criteria:

- [ ] P1-7 / P1-8 RED 测试全部转 GREEN（气泡路径 + 插件路径断言全绿）
- [ ] 裁定记录入档（open 字段策略 + 理由）
- [ ] 类别清扫记录入档（ChatMessageUIState 写面/读面核对结论）

### Phase 2 — 混合消息渲染器遮蔽修复（P1-9）

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx`、`src/renderers/ai-bubble/renderers/default-renderers.ts`、`src/renderers/ai-bubble/types.ts`

- Item Types: `Fix | Proof | Decision`

- [ ] Proof: RED 回归测试（文本 + reasoning_content）——消息含非空文本 + `reasoning_content` → 断言 reasoning 面板与文本**同时**渲染；修复前 RED
- [ ] Proof: RED 回归测试（文本 + tool_calls）——消息含非空文本 + `tool_calls` → 断言工具卡与文本**同时**渲染；修复前 RED
- [ ] Decision: 裁定渲染策略二选一——（a）reasoning/tools 在消息级匹配并渲染（与切片级 markdown 并行），或（b）消息级字段（`reasoning_content` / `tool_calls`）在切片级 markdown 之前判定；选择与现有 `resolveContentSlices` 结构、注册表扩展性（host 自定义 matcher）最一致者；裁定理由入档
- [ ] Fix: 按裁定实现（`ai-bubble/index.tsx` 渲染装配 + `default-renderers.ts` 匹配顺序/注册语义调整），保持 `content:''` 分支既有行为（零回归）
- [ ] Fix: 类别清扫——全部 8 个默认 renderer 的匹配面核对（LOADING/NORMAL/CONTENT/ROLE 四档 × find 谓词），确认无其他被遮蔽组合；`error` / `data-*` / `image` 与文本混合形状抽查
- [ ] Fix: 测试扩展——混合内容集成断言（文本+reasoning / 文本+tool_calls / 文本+image），含 streaming 期间首 chunk 到达后的面板可见性

Exit Criteria:

- [ ] P1-9 两条 RED 测试转 GREEN（混合消息断言全绿）
- [ ] `content:''` 分支既有测试零回归
- [ ] 类别清扫记录入档（渲染器匹配面核对结论）

### Phase 3 — 投影快照 engine 替换刷新（P1-6）

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`、`src/renderers/__tests__/ai-chat-projection.test.tsx`

- Item Types: `Fix | Proof`

- [ ] Proof: RED 回归测试（会话切换）——会话 A 完成后切换到会话 B（engine 替换，双 idle）→ 断言 `${messages}` 投影区域显示 B 的消息（而非 A）；修复前 RED
- [ ] Proof: RED 回归测试（clear / 复水）——`clear()` 与 `setMessages` 复水后投影快照同步刷新；修复前 RED
- [ ] Fix: 投影重建触发条件扩展——在 `isProcessing` 翻转之外，增加 engine-identity 变化与 `requestState` 终态变化（completed/aborted/error）触发重建（快照克隆保持 turn-boundary 成本纪律：仅在终态或 engine 替换时克隆，streaming 期间不每 chunk 克隆）
- [ ] Fix: 类别清扫——`ai-chat.tsx` 全部"引擎状态镜像"面核对（投影 / hostScopeData / provider 数据），确认 engine 替换时各镜像面同步；清扫记录入档
- [ ] Fix: 测试扩展——engine-swap 投影回归测试（含 P2-14 同面窗口：abort 同步翻转时的空产物幽灵不进入投影快照，如本面修复顺带覆盖则记录）

Exit Criteria:

- [ ] P1-6 RED 测试全部转 GREEN（会话切换 / clear / 复水断言全绿）
- [ ] 既有 turn-boundary 投影稳定性测试零回归
- [ ] 类别清扫记录入档（engine 状态镜像面核对结论）

### Phase 4 — 登记处同步 + 收口

Status: planned
Targets: `docs/components/flux-renderers-ai/design.md`、`docs/components/flux-renderers-ai/engine.md`、`docs/bugs/`、`docs/logs/2026/08-10.md`

- Item Types: `Fix | Proof | Follow-up`

- [ ] Fix: `design.md` 投影节更新（投影重建触发条件含 engine 替换 / requestState 终态）+ 渲染器选择节更新（混合消息语义）；如裁定选择消息级并行渲染，更新注册表/匹配语义描述
- [ ] Fix: `engine.md` §8.3 plugin 表格补 `state.thinking` / `state.toolCall.open` 写面注记（open 字段策略：undefined-absent 或 live write-back）
- [ ] Fix: bug notes 131+（P1-7/P1-8 合并族 + P1-9 + P1-6，按 guide）
- [ ] Proof: AI 包全量测试 + `pnpm typecheck/lint`（AI 包）零回归
- [ ] Follow-up: daily log `docs/logs/2026/08-10.md` 记录本 plan 收口

Exit Criteria:

- [ ] design.md / engine.md / bug notes 同步到位（live 核对一致）
- [ ] AI 包测试全绿零回归
- [ ] daily log 收口记录落档

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session `ses_015ef733fffehxxPIn33VU2k0p`）
- Verdict: `pass`（达成共识：零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed: 3 Minor（Decision 默认倾向补方案 A 优先 + engine 写回 API 依据；跨 plan 共享产物执行序注记；plan 1 清扫面交叉引用注记）——Minor-1 已就地修复（Decision 默认倾向）；Minor-2/3 记入本 plan Phase 4（共享 bug-note 编号按提交顺序分配）与 plan 1 关联注记

## Closure Gates

- [ ] 4 条 P1（P1-6/P1-7/P1-8/P1-9）全部修复落地（test-first RED→GREEN 证据在案）
- [ ] 混合消息渲染行为达成（tools/reasoning/image 与文本同现）
- [ ] 投影快照在 engine 替换 / requestState 终态变化时刷新
- [ ] 类别清扫记录入档（ChatMessageUIState 写读面 / 渲染器匹配面 / 引擎状态镜像面）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [ ] 受影响的 owner docs 已同步（design.md / engine.md / bug notes / daily log）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### P2 全量（26 条，两审计）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 全部为 P2（非阻断 polish / 文档腐化 / 残余清理），已按 mission-driver 规则入 `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog（带源审计路径），不阻塞本 plan 的 4 条 P1 收口
- Successor Required: `no`

### P2-14 投影克隆 abort 窗口幽灵（multi P2-14）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 依赖多步 timing（abort 同步翻转 + 清理微任务窗口），self-heals（下一轮次翻转即自愈）；已在 Phase 3 修复面（投影重建触发条件扩展）顺带覆盖评估，不单独承诺修复；若 Phase 3 修复后该窗口仍可复现，则留在 backlog
- Successor Required: `no`

## Non-Blocking Follow-ups

- P2 项处理见 roadmap Follow-up Backlog（2026-08-10-1301 填充节）。
- P3/观察项（tiptap 聚焦丢弃、result 孤儿字段、a11y micro-gaps 等）保持在源审计记录中，不派生工作项。

## Closure

Status Note: （完成或关闭时填写）

Closure Audit Evidence:

- Auditor / Agent: （待独立子 agent）
- Evidence: （待填写）

Follow-up:

- （待填写：no remaining plan-owned work 或 non-blocking 项）
