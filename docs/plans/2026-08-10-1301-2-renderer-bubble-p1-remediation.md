# 2 Renderer/Bubble 族 P1 修复（投影刷新 / 工具卡展开 / reasoning 面板 / 渲染器遮蔽）（ai-invariant-loop）

> Plan Status: completed
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

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx`、`src/renderers/ai-bubble/renderers/tools.tsx`、`src/renderers/ai-bubble/renderers/reasoning.tsx`、`src/engine/plugins/tool-plugin.ts`、`src/engine/plugins/thinking-plugin.ts`

- Item Types: `Fix | Proof | Decision`

- [x] Proof: RED 回归测试（P1-7 气泡路径）——气泡渲染 assistant 消息（`state.toolCall[key]` 存在或 map 缺 key）→ 点击展开 chevron → 断言函数参数 JSON 区域出现、`aria-expanded=true`；修复前 RED
- [x] Proof: RED 回归测试（P1-8 插件路径）——thinkingPlugin 注册 + reasoning_content 消息 → 断言折叠按钮 `disabled` 为 false 且点击后面板展开（内容可见）；修复前 RED
- [x] Decision: 裁定统一策略——**方案 A 落地**：插件写面全部停止 pin `open:false`（`tool-plugin.ts` 两处 + `thinking-plugin.ts` 首 chunk 均改为 undefined-absent），renderer 合并改为 `state?.open !== undefined ? state.open : internalOpen`（`ai-tool-call.tsx`）+ `controlled?.open !== undefined ? controlled.open : internalOpen`（`reasoning.tsx`），展开态为 renderer 本地 state，`onToggle` 保持调用面不写回。**理由**：engine 侧无已验证的 `message.state.toolCall/thinking` 写回 API（仅 `setMessageEditing` 存在，multi P2-10 同族）；虚拟化行回收冲突确实存在（`ai-message-list.tsx` VIRTUAL_SCROLL_THRESHOLD=200，@tanstack/react-virtual 行卸载回收）但升格方案 B 的前置条件「存在可用写回 API」不成立 → 维持方案 A，行回收后本地展开态复位、engine 持有的 `open`（host 显式写入）随引擎快照存活（新增 remount 存活抽查测试）；禁用判定同步：`reasoning.tsx` `disabled` 仅在 engine 显式持有 `open` 时生效（插件路径永不触发）
- [x] Fix: `tool-plugin.ts` 两处写面停止写 `open:false`（改为 `{ status: 'running' }`）；`tools.tsx:57-61` `resolveToolState` 默认值同步（无 key 时 `{ status: 'running' }`，`open` 保持 undefined）
- [x] Fix: `ai-tool-call.tsx` 合并逻辑改为 `state?.open !== undefined ? state.open : internalOpen`；`handleToggle` 保持 `setInternalOpen` + `props.onToggle?.(next)`（方案 A 不写回，接线面无生产消费方，保持不变）
- [x] Fix: `thinking-plugin.ts` 首 chunk 停止 pin `open:false`（`{ startedAt }`）；`reasoning.tsx` 展开合并逻辑与 `disabled` 判定同步修正（`controlled.open` 未定义时允许 local 展开）
- [x] Fix: 类别清扫——`ChatMessageUIState` 全部字段写面/读面核对：`toolCall[*].open`（写：tool-plugin ×2 已修复 / tool-execution 仅 status+result；读：resolveToolState 默认值已修复 / ai-tool-call 合并已修复 / FallbackToolCallCard defaultOpen 无碍）、`thinking.open`（写：thinking-plugin 已修复；读：reasoning.tsx 已修复）、`editing.*`（engine `setMessageEditing` API 写回存在，A-8 活面，非 write-once-false）、`approval`（engine 不写、host 工作流，文档化契约）、`result`（tool-execution 写真实结果，活面）——**无其他 write-once-false 死字段**
- [x] Fix: 测试扩展——A-10 既有断言补展开/disabled 行为断言（fixture 移除 `open:false` 对齐新契约）；虚拟化行回收场景抽查（engine 持有 `open:true` 经 unmount/remount 存活；本地展开态复位为设计内成本，随方案 A 记录）

Exit Criteria:

- [x] P1-7 / P1-8 RED 测试全部转 GREEN（气泡路径 + 插件路径断言全绿；RED 实证 8 failed→GREEN，AI 包 70 files / 600 tests 全绿零回归）
- [x] 裁定记录入档（open 字段策略 = 方案 A undefined-absent + 理由见上）
- [x] 类别清扫记录入档（ChatMessageUIState 写面/读面核对结论见上）

### Phase 2 — 混合消息渲染器遮蔽修复（P1-9）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx`、`src/renderers/ai-bubble/renderers/default-renderers.ts`、`src/renderers/ai-bubble/types.ts`

- Item Types: `Fix | Proof | Decision`

- [x] Proof: RED 回归测试（文本 + reasoning_content）——消息含非空文本 + `reasoning_content` → 断言 reasoning 面板与文本**同时**渲染；修复前 RED
- [x] Proof: RED 回归测试（文本 + tool_calls）——消息含非空文本 + `tool_calls` → 断言工具卡与文本**同时**渲染；修复前 RED
- [x] Decision: 裁定渲染策略 = **方案 (a) 消息级并行渲染**——tools/reasoning/error 标 `messageLevel: true`（`BubbleContentRendererMatch` 新增**可选**字段，additive 不改公共签名），在 `AiBubbleView` 消息级 pass 每次渲染一次，与切片级 markdown/image/data-part/text pass 并行；loading 保持切片级 LOADING(-1) 首匹配即赢（流式首 chunk 前 spinner 独占，行为不变）；流式中消息级 pass 跳过（`!isStreaming` 门，与既有 loading 独占语义一致）。**理由**：与现有 `resolveContentSlices` 单切片单渲染器结构一致（每个切片仍只选一个渲染器），注册表扩展性保留（host 自定义 matcher 可自行标 `messageLevel`），`content:''` 分支零回归（既有 find() 单测 + 渲染路径均不受影响）
- [x] Fix: 按裁定实现（`ai-bubble/index.tsx` 渲染装配拆 message-level / slice-level 双 pass + `default-renderers.ts` 三处 `messageLevel: true` + `types.ts` 可选字段 + `tryMatch` 抽取复用故障 matcher 守卫）
- [x] Fix: 类别清扫——全部 8 个默认 renderer 匹配面核对（LOADING/NORMAL/CONTENT/ROLE 四档 × find 谓词）：loading（切片级 -1，首匹配即赢不可遮蔽）/ markdown（NORMAL=0 切片级，遮蔽者已与被遮蔽者解耦）/ tools+reasoning+error（消息级，不再可遮蔽）/ image（切片级，仅数组 parts，markdown 不匹配 image part——不可遮蔽）/ data-part（切片级，仅 `data-*` parts——不可遮蔽）/ text（ROLE 兜底）；**文本混合形状抽查**：text+image（数组 parts 双渲染）、text+data-part（双渲染）、error+text（双渲染）、loading+tool_calls（spinner 独占）、content:'' 工具消息（工具卡仍渲染）全部入测
- [x] Fix: 测试扩展——混合内容集成断言 8 条（文本+reasoning / 文本+tool_calls / streaming 首 chunk 到达后 reasoning 可见 / error+文本 / 文本+image / 文本+data-part / content:'' 零回归 / loading 独占）

Exit Criteria:

- [x] P1-9 两条 RED 测试转 GREEN（混合消息断言全绿；RED 实证 4 failed→GREEN，AI 包 70 files / 608 tests 全绿零回归）
- [x] `content:''` 分支既有测试零回归（matcher 单测 + AiBubbleView 渲染路径均绿）
- [x] 类别清扫记录入档（渲染器匹配面核对结论见上）

### Phase 3 — 投影快照 engine 替换刷新（P1-6）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`、`src/renderers/__tests__/ai-chat-projection.test.tsx`

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试（会话切换）——会话 A 完成后切换到会话 B（engine 替换，双 idle）→ 断言 `${messages}` 投影区域显示 B 的消息（而非 A）；修复前 RED
- [x] Proof: RED 回归测试（clear / 复水）——`clear()` 与 `setMessages` 复水后投影快照同步刷新；修复前 RED
- [x] Fix: 投影重建触发条件扩展——`ai-chat.tsx` 投影 state 扩为 `{ prevIsProcessing, prevRequestState, snapSourceRef, snapLength, snap }`：重建触发 = ① isProcessing 翻转（既有 turn-boundary 语义）② requestState 进入终态（completed/aborted/error）③ 空闲期 messages **数组引用**变化（clear/setMessages/engine swap 均为 mutate recipe 内整体替换）④ 空闲期 messages **length** 变化（state-adapter `recipe(this.state)` 原地变更——abort 残渣 drop 的 `splice` 不换引用，补齐后 P2-14 幽灵在 abort 边界重建后被二次 idle 重建清除）；`snapSourceRef`/`snapLength` 每 render 收敛到 live 恒等（流式不克隆、守卫不重触发），`snap` 仅在 shouldClone（boundary/terminal/idle 集合变化）时 `cloneMessages`——turn-boundary 成本纪律保持（streaming 期间不每 chunk 克隆）
- [x] Fix: 类别清扫——`ai-chat.tsx` 全部"引擎状态镜像"面核对：投影 `hostScopeData.messages`（本面已修复）/ `hostScopeData` bundle（useMemo 随 projectedMessages + isProcessing + activeConversationId，流式稳定）/ `AiChatProvider` `chatContextValue`（读 useMessage live `messages`，恒最新，非投影面）/ `onResponseComplete` 快照 handoff（subscribe 依赖 `[engine]`，engine swap 重订阅拿最新消息）——**无其他停滞镜像面**；清扫记录入档
- [x] Fix: 测试扩展——engine-swap 投影回归测试含 **P2-14 同面窗口**（zero-chunk abort 空产物幽灵：abort 同步翻转边界重建会先捕获幽灵，残渣 drop 后 length 信号触发二次 idle 重建清除幽灵——**本面修复顺带覆盖 P2-14**，不再是孤立 watch-only 窗口；测试断言投影终态零 vacuous placeholder + committed user 消息仍在）；测试隔离：P1-6 新用例集放文件末尾避免污染既有 P1#2 turn-boundary 用例（顺序依赖实证）

Exit Criteria:

- [x] P1-6 RED 测试全部转 GREEN（会话切换 / clear / 复水断言全绿；RED 实证 3 failed→GREEN，AI 包 70 files / 612 tests 全绿零回归）
- [x] 既有 turn-boundary 投影稳定性测试零回归（P1#2 gated-streaming 用例保持绿）
- [x] 类别清扫记录入档（engine 状态镜像面核对结论见上）

### Phase 4 — 登记处同步 + 收口

Status: completed
Targets: `docs/components/flux-renderers-ai/design.md`、`docs/components/flux-renderers-ai/engine.md`、`docs/bugs/`、`docs/logs/2026/08-10.md`

- Item Types: `Fix | Proof | Follow-up`

- [x] Fix: `design.md` 投影节更新（投影重建触发条件含 engine 替换 / requestState 终态）+ 渲染器选择节更新（混合消息语义）；如裁定选择消息级并行渲染，更新注册表/匹配语义描述
- [x] Fix: `engine.md` §8.3 plugin 表格补 `state.thinking` / `state.toolCall.open` 写面注记（open 字段策略：undefined-absent 或 live write-back）
- [x] Fix: bug notes 131+（P1-7/P1-8 合并族 + P1-9 + P1-6，按 guide）
- [x] Proof: AI 包全量测试 + `pnpm typecheck/lint`（AI 包）零回归
- [x] Follow-up: daily log `docs/logs/2026/08-10.md` 记录本 plan 收口

Exit Criteria:

- [x] design.md / engine.md / bug notes 同步到位（live 核对一致）
- [x] AI 包测试全绿零回归
- [x] daily log 收口记录落档

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session `ses_015ef733fffehxxPIn33VU2k0p`）
- Verdict: `pass`（达成共识：零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed: 3 Minor（Decision 默认倾向补方案 A 优先 + engine 写回 API 依据；跨 plan 共享产物执行序注记；plan 1 清扫面交叉引用注记）——Minor-1 已就地修复（Decision 默认倾向）；Minor-2/3 记入本 plan Phase 4（共享 bug-note 编号按提交顺序分配）与 plan 1 关联注记

## Closure Gates

- [x] 4 条 P1（P1-6/P1-7/P1-8/P1-9）全部修复落地（test-first RED→GREEN 证据在案）
- [x] 混合消息渲染行为达成（tools/reasoning/image 与文本同现）
- [x] 投影快照在 engine 替换 / requestState 终态变化时刷新
- [x] 类别清扫记录入档（ChatMessageUIState 写读面 / 渲染器匹配面 / 引擎状态镜像面）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响的 owner docs 已同步（design.md / engine.md / bug notes / daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

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

Status Note: 4 条 P1（P1-6/P1-7/P1-8/P1-9）全部修复落地（test-first RED→GREEN 证据在案：Phase 1 RED 实证 8 failed→GREEN / Phase 2 RED 实证 4 failed→GREEN / Phase 3 RED 实证 3 failed→GREEN）；AI 包 70 files/612 tests 全绿；全仓 typecheck/build/lint 37/37 ×3 + `pnpm test` 66/66 tasks；`pnpm check` 仅既有登记红零新增（audit-event-dispatch-ctx 6 条 industrial 2026-08-09 登记 + oversized 2 条 exempt locale）；`check:ai-engine-invariants` exit 0 零命中；`check:docs-garbled` 16 既有均非本 plan 文件零新增；bug notes 134-136 落档 + design.md / engine.md 同步 + roadmap Follow-up Backlog 收口注记；源审计 `2026-08-09-1826-multi-audit-ai-invariant-loop.md` Audit Status 已 closed（plan 1301-1 收口时翻，本 plan 幂等跳过）。2026-08-10 收口。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh session，未参与本 plan 执行；task id `ses_01ae0b96fffeN8Bc5g0W21uXx7`）
- Evidence: verdict `pass`。逐门核对：G1 一致性 pass（Plan Status completed；Phase 1-4 Status 全 completed 且与 [x] 项/Exit Criteria 全勾一致；Closure Gates 1-6/8-11 [x]）。G2 代码抽查 pass（live tree 核对：tool-plugin.ts 两写面 + thinking-plugin.ts 首 chunk 均已去 `open:false`，全包生产代码零 `open:false` 写（仅注释）；ai-tool-call.tsx `state?.open !== undefined ? state.open : internalOpen` + onToggle 接线保留；reasoning.tsx 合并/disabled 判定同步；tools.tsx resolveToolState 默认 `{status:'running'}`；ai-bubble/index.tsx 消息级/切片级双 pass + tryMatch 抽取；default-renderers.ts tools/reasoning/error 标 `messageLevel:true`；types.ts 可选字段带文档；ai-chat.tsx 投影四触发条件落地）。G3 测试 pass（fresh 复跑 `pnpm --filter @nop-chaos/flux-renderers-ai test` = **70 files / 612 tests 全绿**，与声明一致）。G4 无静默降级 pass（Scope 4 条 P1 全落地；P2 全量 26 条在 roadmap Follow-up Backlog（带源审计路径），P2-14 维持 watch-only 且 Phase 3 顺带覆盖实证入档）。G5 文档同步 pass（design.md 投影触发 + 消息级 vs 切片级 + §11.5 折叠态 ownership 行；engine.md §8.3 插件写面注记；roadmap 收口注记；daily log 08-10 收口条目；bug notes 134/135/136 按 guide 落档——minor：三份 notes 缺「Notes For Future Refactors」节（既有 130-133 均有），信息已含于 Fix/Tests，非阻塞）。G6 源审计 pass（`2026-08-09-1826-multi-audit-ai-invariant-loop.md` Audit Status = closed，幂等未重开）。门禁 fresh 抽查 pass：`check:ai-engine-invariants` exit 0 零命中；`check:oversized-code-files` 2 errors 均 exempt locale；`check:audit-event-dispatch-ctx` 6 hits 全在 flux-renderers-industrial（该包本树零 diff，2026-08-09 已登记预存面）。零 Blocker 零 Major，1 minor（bug notes 缺 Future Refactors 节）。2026-08-10 独立审计收口。

Follow-up:

- no remaining plan-owned work。closure-audit minor（docs/bugs/134-136 补「Notes For Future Refactors」节）已由执行 session 就地补入（docs-only，非阻塞，审计后落档）。
