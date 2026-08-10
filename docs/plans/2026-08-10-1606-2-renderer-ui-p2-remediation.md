# 2 Renderer/UI 族 P2 修复（slash/mention 键盘死区 / HITL 可达性 / 麦克风双重识别 / engineNullSwitch 窗口 / autoScroll 测试 / a11y / feedback·citations 行为）（ai-invariant-loop）

> Plan Status: completed
> Mission: ai-invariant-loop
> Work Item: Follow-up Backlog P2（renderer/UI 族）：multi P2-3 / P2-4 / P2-6 / P2-8 / P2-9 / P2-17 / P2-18 + open P2-7 / P2-8
> Last Reviewed: 2026-08-10
> Source: `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog（2026-08-09-1826 双审计 P2 填充节）、`docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md`（P2-3/P2-4/P2-6/P2-8/P2-9/P2-17/P2-18）、`docs/audits/2026-08-09-1826-open-audit-ai-invariant-loop.md`（P2-7/P2-8）；live repo 核对 2026-08-10（行号以审计时点为准，执行时 live 复核）
> Related: `docs/plans/2026-08-10-1606-1-engine-adapter-p2-remediation.md`（engine/adapter 族 P2，独立 closure surface）、`docs/plans/2026-08-10-1606-3-ai-contract-doc-truthfulness-remediation.md`（契约/文档族 P2，独立 closure surface）

## Purpose

修复 2026-08-09 双审计遗留的 **renderer/UI 族 9 条 P2**（0 P0/P1）：① slash/mention 弹出层零匹配时进入键盘死区 + 注释与实现矛盾（multi P2-3）；② `FallbackToolCallCard` 未透传 `onApproval`，HITL 审批在默认气泡路径结构性不可达（multi P2-4）；③ ai-voice-input 同 tick 双击麦克风产生双重识别实例、首个会话泄漏麦克风（multi P2-6）；④ engineNullSwitch 窗口期 component handle / action provider 绑定到被隐藏的自建 engine（multi P2-8）；⑤ useAutoScroll 核心行为（trigger 驱动滚底 + scrollToBottom）零测试断言（multi P2-9）；⑥ ai-conversations 当前会话缺 `aria-current`（multi P2-17）；⑦ user-edit 编辑态 Textarea 无 accessible name（multi P2-18）；⑧ ai-feedback 无法表达"无操作栏"（open P2-7）；⑨ ai-citations 年份误报（`[2026]` 渲染空 citation 卡）（open P2-8）。

每条修复带 test-first 回归断言（RED→GREEN）+ 类别清扫。⑧ 属交互面设计语义裁定（Decision 项）。

## Current Baseline

（live repo 核对 2026-08-10；行号 = 审计时点 2026-08-09，P1 修复后可能漂移）

- **multi P2-3（slash/mention 键盘死区）**：`rich-text/tiptap-sender.tsx:224-249` `handleKeyDown` 只检查 `state.kind === 'none'`；零匹配时 kind 保持 `'slash'/'mention'` → Enter/Arrow 被 `return true` 吞掉而弹出层视觉上已消失（`:402` 在 `popupItems.length === 0` 时隐藏弹出层）；`:332-335` 注释声称零匹配时按键放行——实现从不检查 length。live 核对：popup 状态与 `SuggestionPopup`（`components/suggestion-popup.tsx`）接线存在。
- **multi P2-4（HITL 结构性不可达）**：`FallbackToolCallCard`（`ai-tool-call.tsx:312-320`）丢弃 `onApproval`；`BubbleToolRendererProps`（`ai-bubble/types.ts:65-74`）无该字段 → 标准消息流中 `approval==='pending'` 命中 `hitl-no-handler` 守卫、approve 按钮恒 disabled；HITL 只在独立 ai-tool-call renderer 路径可用。**live 核对（2026-08-10）确认缺口是整条 prop 线程而非单点**：`ToolsContentRenderer` 只收 `BubbleContentRendererProps`（`{message, content, contentIndex}`，`ai-bubble/index.tsx:134-139` 消息级调用无事件注入）；`AiChatContextValue`（`ai-chat-context.tsx:6-23`）无 `onApproval`；`AiMessageList` → `AiBubbleView`（`ai-message-list.tsx:102-124`）不传事件 → 仅给 `BubbleToolRendererProps` 加字段 + `FallbackToolCallCard` 透传仍会让气泡路径 `onApproval === undefined`（hitl-no-handler 守卫继续禁用按钮）。修复必须打通 `ai-chat props.events.onApproval` → `AiMessageList`/`AiChatContextValue` → `AiBubbleViewProps` → 消息级 tools renderer 的全链（对齐 `onBranchChange` 先例 `ai-bubble/index.tsx:295-310`）。
- **multi P2-6（麦克风双重识别）**：`ai-voice-input.tsx:147-230` `handleStart` 无条件 new recognition 并覆盖 `recognitionRef.current`；`status` state 守卫异步，同 tick 双击产生两个实例；unmount 清理只 abort ref 持有（第二个）实例，首个 `continuous:true` 实例持 mic 至页面卸载。live 核对：`recognitionRef`（`:109`）与 release 逻辑（`:117-127`）存在。
- **multi P2-8（engineNullSwitch 窗口期）**：外部 engine A→null→B 期间 `externalEngine=undefined` 落回 `selfEngine`（`ai-chat.tsx:140`）；handle/provider 对它注册而 UI 只渲染 emptyState；该窗口内 command 分发写 ghost 消息、B 到达时蒸发。live 核对：`engineNullSwitch`（`:141`）、`componentHandle` useMemo（`:195-200`）、`useMessage` 自建 engine 路径（`use-message.ts`）。
- **multi P2-9（autoScroll 零断言）**：`adapters/use-auto-scroll.ts:42-58` trigger effect + `scrollToBottom()` 零断言；A-9 测试只断言手动设置 scrollTop 后 `isAtBottom`。live 核对：`useAutoScroll`（`:30`）核心 effect（`:58` deps `[trigger]`）。
- **multi P2-17（aria-current）**：`ai-conversations.tsx:70-78` 当前项只靠 `data-active` + 边框/背景色传达状态；除 `suggestion-popup.tsx:54` 的 `aria-selected` 外包内无 `aria-current`/`aria-selected`。WCAG 1.3.1 / 4.1.2。
- **multi P2-18（accessible name）**：`ai-bubble/user-edit.tsx:81-87` 编辑态 `<Textarea>` 无 aria-label/label/placeholder（对照 ai-sender Textarea `:167` 有 label，p2-a11y-i18n 测试覆盖 sender 面、未覆盖编辑面）。WCAG 4.1.2。
- **open P2-7（feedback 无操作栏）**：`ai-feedback.tsx:107-111` `normalizeActions` 空数组 → `DEFAULT_ACTIONS`（copy/refresh，`:15`）；host 无法经 schema 表达零操作栏（只能 unmount renderer）；"空 = 默认"约定未文档化。
- **open P2-8（citations 年份误报）**：`ai-citations.tsx:258` `CITATION_RE = /\[(\d+(?:\s*,\s*\d+)*)\]/g` 匹配任意 `[N]`（N>0）；索引过滤只丢 ≤0（`:285`）→ "Since [2026]" 渲染可点 sup + 空 citation 卡。live 核对：匹配循环 `:279`、过滤 `:285`、空源回退 `:286`。
- **门禁现状**：本族属 UI 交互面，不扩展 `check:ai-engine-invariants`（沿用 1301-2 裁定）；AI 包基线 **70 files / 612 tests 全绿**。
- 既有测试锚点：`ai-tool-call-hitl.test.tsx`、`phase5-deepening.test.tsx`（A-9 区域）、`a11y.test.tsx`、bubble 渲染测试、`ai-citations*`/`ai-feedback*` 相关测试（执行时核对具体文件名）。
- Bug note 编号：live 最高 **136**，新增编号 **137+**（与 plan 1 共享编号区，按提交顺序分配）。
- 授权：renderer 修复属 `implement` 默认授权；不改公共 API 签名（`BubbleToolRendererProps` 若需新增 `onApproval` 字段为 additive 可选字段，不破坏既有契约）。

## Goals

- 9 条 P2 全部修复（test-first：每条先写 RED 回归测试 → 修复 → GREEN），类别清扫记录入档。
- multi P2-4：打通 `onApproval` 全链（`ai-chat props.events` → `AiMessageList`/`AiChatContextValue` → `AiBubbleViewProps` → 消息级 tools renderer）+ `BubbleToolRendererProps` 补可选 `onApproval`（additive）+ `FallbackToolCallCard` 透传 → HITL 审批在默认气泡路径可达；独立 renderer 路径零回归。
- multi P2-8：engineNullSwitch 窗口期 handle/provider 不绑定到将被隐藏的 selfEngine（或绑定显式空引用），command 不写 ghost 会话。
- open P2-7：裁定"无操作栏"表达语义（方案：`actions: []` 显式空 → 渲染无栏 vs 维持默认 + 文档化），按裁定落地。
- open P2-8：citation 索引上限/来源匹配约束，`[2026]` 等年份误报消除且合法引用零回归。
- 收口：AI 包测试全绿零回归；design.md / engine.md 相关节同步（交互语义变化处）；bug notes 137+；daily log 收口记录。

## Non-Goals

- 不处理 engine/adapter 族 P2（已在 `docs/plans/2026-08-10-1606-1-engine-adapter-p2-remediation.md`）。
- 不处理契约/文档族 P2（已在 `docs/plans/2026-08-10-1606-3-ai-contract-doc-truthfulness-remediation.md`）。
- 不做布局/样式体系改动（Styling Contract 不变，仅交互行为/a11y 属性修复）。
- 不扩展 `check:ai-engine-invariants`（渲染交互面用渲染测试收口）；不改公共 API 签名。
- 不处理 P2-14（已顺带覆盖，维持 watch-only）；不裁决 P3/观察项。

## Scope

### In Scope

- `rich-text/tiptap-sender.tsx`（multi P2-3）、`renderers/ai-tool-call.tsx` + `renderers/ai-bubble/renderers/tools.tsx` + `renderers/ai-bubble/types.ts`（multi P2-4）、`renderers/ai-voice-input.tsx`（multi P2-6）、`renderers/ai-chat.tsx` + `adapters/use-message.ts`（multi P2-8）、`adapters/use-auto-scroll.ts` + `renderers/__tests__/phase5-deepening.test.tsx`（multi P2-9）、`renderers/ai-conversations.tsx`（multi P2-17）、`renderers/ai-bubble/user-edit.tsx`（multi P2-18）、`renderers/ai-feedback.tsx`（open P2-7）、`renderers/ai-citations.tsx`（open P2-8）。
- 回归测试：`ai-tool-call-hitl.test.tsx`、`phase5-deepening.test.tsx`、`a11y.test.tsx`、bubble 渲染测试、新增 focused 测试文件。
- 文档：`design.md`（如交互语义变化）、`engine.md`（如涉及）、bug notes、daily log。

### Out Of Scope

- engine/adapter 族 P2、契约/文档族 P2、P2-14、公共 API 重构、样式体系改动。

## Failure Paths

| 场景                 | 触发                                          | 行为                                                          | 可重试 | 用户可见表现                   |
| -------------------- | --------------------------------------------- | ------------------------------------------------------------- | ------ | ------------------------------ |
| slash-deadzone       | 弹出层零匹配时按 Enter/方向键                 | 回归测试 RED；修复后按键放行（非吞掉）                        | 是     | 无键盘死区（无需 Escape 逃生） |
| hitl-unreachable     | 气泡路径渲染 `approval==='pending'` 工具卡    | 回归测试 RED；修复后 approve/reject 按钮可用且触发 onApproval | 是     | HITL 审批在默认气泡路径可用    |
| voice-double         | 同 tick 双击麦克风                            | 回归测试 RED；修复后 ref 守卫拦截第二实例、mic 单实例         | 是     | 无双重识别 / 无 mic 泄漏       |
| ghost-command        | engineNullSwitch 窗口期 component/action 分发 | 回归测试 RED；修复后命令不写被隐藏 selfEngine                 | 是     | 无幽灵会话写入                 |
| autoscroll-unguarded | trigger 变更 + pinned                         | 新增断言覆盖核心行为（不再"删掉也绿"）                        | 是     | 滚底行为受测试保护             |
| a11y-current         | 屏幕阅读器读取当前会话 / 编辑 Textarea        | 新增 DOM 属性断言（aria-current / accessible name）           | 是     | SR 可感知当前项 / 编辑输入有名 |
| feedback-no-bar      | host 传 `actions: []`                         | 按裁定落地（无操作栏或文档化默认语义）+ 测试                  | 是     | 可表达"无操作栏"               |
| citation-year        | 正文出现 `[2026]`                             | 回归测试 RED；修复后年份不渲染空卡、合法引用零回归            | 是     | 无空 citation 卡               |

## Test Strategy

本档选择：必须自动化

渲染交互行为用 focused 渲染测试（真实 renderer + mock engine state 注入）断言可观测结果（DOM 结构 / aria 属性 / 回调调用）；每条 P2 的 Proof（RED）先于 Fix。复杂交互 bug 按 guide 补 bug note（137+）。

## Execution Plan

### Phase 1 — 输入与交互缺陷修复（multi P2-3 + P2-6 + P2-8）

Status: completed
Targets: `packages/flux-renderers-ai/src/rich-text/tiptap-sender.tsx`、`src/renderers/ai-voice-input.tsx`、`src/renderers/ai-chat.tsx`、`src/adapters/use-message.ts`

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试（P2-3 键盘死区）——slash 弹出层打开后输入零匹配文本 → 按 Enter/ArrowDown → 断言按键未被吞（默认行为/放行，无 `return true` 拦截）；修复前 RED
- [x] Fix: P2-3——`handleKeyDown` 补 `popupItems.length === 0` 放行分支（与 `:332-335` 注释语义对齐，注释与实现一致化）；**实现注意**：`handleKeyDown` 在 editor-options `useMemo`（deps `[extraExtensions]`）内闭包创建，直接读 `popupItems.length` 会 stale——按既有 `popupStateRef`/`popupControlsRef` 模式（`:225/:231/:370-394`）镜像 items 到 ref 或经 `popupControlsRef` 暴露 length getter；类别清扫：tiptap 全部键盘拦截路径核对（slash/mention 两弹出层 × Enter/Arrow/Escape 键面），无其他死区
- [x] Proof: RED 回归测试（P2-6 双击麦克风）——同 tick 连续两次触发 handleStart → 断言仅一个 recognition 实例存活（in-flight 守卫唯一）、首个实例被 abort/复用；**追加 restart-after-stop 断言**（正常 stop 后可重新 start，不被守卫永久阻塞）；修复前 RED
- [x] Fix: P2-6——`handleStart` 加 in-flight 守卫（**专用 in-flight flag**，或在 start 置位/stop·onend 清位的语义下复用 `recognitionRef`——不得用"ref 非空即短路"：`onend`（`:190-199`）与 stop 分支（`:218-226`）不清空 ref，非空守卫会永久阻塞 mic 重启）；类别清扫：voice-input 全部启动/停止/清理面核对（handleStart/handleStop/unmount cleanup 三面一致）
- [x] Proof: RED 回归测试（P2-8 ghost command）——外部 engine null 窗口期经 component handle 分发 sendMessage → 断言不写入 selfEngine 历史（消息数不变）；**扩展臂：同一窗口经 `ai` action-provider 命名空间分发（`ai-chat.tsx:174-180` `createAiActionProvider` 闭包绑定面，`ai-namespace.test.tsx` 先例）→ 断言同样不写 selfEngine**；修复前 RED
- [x] Fix: P2-8——engineNullSwitch 窗口期 handle/provider 不注册到将隐藏的 selfEngine（注册到显式空 handle 或延迟到外部 engine 就绪；component handle 与 action provider 两绑定面一致处理）；类别清扫：`use-message.ts` selfEngine 创建/暴露面 + `ai-chat.tsx` handle/provider 绑定面核对，无其他 fallback 泄漏窗口

Exit Criteria:

- [x] P2-3 / P2-6 / P2-8 RED 测试全部转 GREEN
- [x] 类别清扫记录入档（键盘拦截面 / voice 生命周期面 / handle 绑定面核对结论）
- [x] 既有 tiptap / voice / projection 测试零回归

### Phase 2 — HITL 可达性（multi P2-4）+ a11y（multi P2-17 + P2-18）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx`、`src/renderers/ai-bubble/renderers/tools.tsx`、`src/renderers/ai-bubble/types.ts`、`src/renderers/ai-message-list.tsx`、`src/renderers/ai-bubble/index.tsx`、`src/renderers/ai-conversations.tsx`、`src/renderers/ai-bubble/user-edit.tsx`

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试（P2-4 气泡路径 HITL）——气泡渲染 `approval==='pending'` 工具卡 → 断言 approve/reject 按钮 enabled 且点击触发 `onApproval`；修复前 RED
- [x] Fix: P2-4——打通 `onApproval` 全链（对齐 `onBranchChange` 先例 `ai-bubble/index.tsx:295-310`）：`ai-chat.tsx` `props.events.onApproval` → `AiMessageList` props / `AiChatContextValue` → `AiBubbleViewProps` → 消息级 tools renderer 调用点（`ai-bubble/index.tsx:134-139`）→ `ToolsContentRendererProps`；`BubbleToolRendererProps` 新增可选 `onApproval`（additive，不改既有字段）；`FallbackToolCallCard`（`ai-tool-call.tsx:312-320`）透传；`tools.tsx` 默认 `*` fallback 与 host 自定义卡均可达
- [x] Proof: RED 回归测试（P2-17 aria-current）——渲染当前会话列表 → 断言 active 项含 `aria-current="true"`（或等价 aria 状态）；修复前 RED
- [x] Fix: P2-17——`ai-conversations.tsx` active 项补 `aria-current`；类别清扫：包内全部"当前/选中态"列表面核对（ai-suggestions / ai-prompts 等同构面是否缺 aria 状态，缺则同修或记录 out-of-scope；`suggestion-popup.tsx:54` 已有 `aria-selected`，属既有点）
- [x] Proof: RED 回归测试（P2-18 accessible name）——编辑态 Textarea → 断言可编程 name（aria-label / label 关联 / placeholder 任一）非空；修复前 RED
- [x] Fix: P2-18——`user-edit.tsx` 编辑态 Textarea 补 accessible name（对齐 ai-sender Textarea `:167` 先例）；a11y 测试扩展（`a11y.test.tsx` 或 user-edit 测试文件）

Exit Criteria:

- [x] P2-4 / P2-17 / P2-18 RED 测试全部转 GREEN
- [x] 独立 ai-tool-call renderer 路径既有 HITL 测试零回归（`ai-tool-call-hitl.test.tsx` 保持绿）
- [x] 类别清扫记录入档（气泡接线面 / 当前态列表面核对结论）

### Phase 3 — 渲染器行为修正（open P2-7 feedback + open P2-8 citations）

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-feedback.tsx`、`src/renderers/ai-citations.tsx`

- Item Types: `Fix | Proof | Decision`

- [x] Proof: RED 回归测试（P2-8 年份误报）——正文含 "Since [2026]" → 断言不渲染 citation 卡（无 `data-citation-index` 条目、无 citationNoSource popover）；合法引用 `[1]` 零回归；修复前 RED
- [x] Decision: P2-8 约束裁定——citation 索引上限（如 ≤ 64，远低于年份）或要求与 sources 匹配后才渲染卡；二者取其一（评估：上限约束简单稳定，来源匹配更精确但依赖 sources 可选性）；裁定理由入档
- [x] Fix: P2-8——按裁定落地（`ai-citations.tsx:258/279-292` 过滤面）；类别清扫：citation 匹配/过滤全路径核对（单索引/多索引/范围混合形状）
- [x] Decision: P2-7 无操作栏裁定——方案 A：`actions: []` 显式空 → 渲染无操作栏（`normalizeActions` 区分 undefined → 默认栏 / `[]` → 无栏）；方案 B：维持默认语义 + 文档化。默认倾向方案 A（`actions: []` 显式意图应可表达）；裁定理由入档
- [x] Proof: P2-7 裁定落地验证（RED/GREEN）——按最终裁定写断言：方案 A 时 `actions: []` 渲染无栏（按钮区空）、默认 actions 行为零回归；方案 B 时默认语义断言 + 文档化核对——**Proof 先于 Fix 执行**（Decision 先落，Proof 定断言，Fix 再实现）
- [x] Fix: P2-7——按裁定落地（`ai-feedback.tsx:107-111` `normalizeActions` 或等价）；测试断言（默认 actions 行为零回归 + 显式空行为）

Exit Criteria:

- [x] open P2-8 RED 测试转 GREEN（年份误报消除 + `[1]` 合法引用零回归）
- [x] open P2-7 按裁定落地 + 测试断言成立（裁定记录入档）
- [x] 类别清扫记录入档（citation 匹配面 / feedback actions 面核对结论）

### Phase 4 — autoScroll 测试补强（multi P2-9）+ 登记处同步 + 收口

Status: completed
Targets: `packages/flux-renderers-ai/src/adapters/use-auto-scroll.ts`、`src/renderers/__tests__/phase5-deepening.test.tsx`、`docs/components/flux-renderers-ai/design.md`、`docs/bugs/`、`docs/logs/2026/08-10.md`

- Item Types: `Fix | Proof | Follow-up`

- [x] Proof: 测试补强（P2-9）——`useAutoScroll` 核心行为断言：trigger 变更且 pinned（`isAtBottom`）→ 容器滚动到底（scrollTop ≈ scrollHeight）；`scrollToBottom()` 直接调用滚底；pinned=false 时 trigger 变更不滚底；断言非"删掉也绿"（删除核心逻辑测试必红）
- [x] Fix: 如补强测试暴露真实缺陷（滚动条件/引用 stale）则修复 `use-auto-scroll.ts`；否则纯测试补强（无代码改动面）
- [x] Fix: `design.md` 交互语义节同步（如 P2-7 无操作栏 / P2-8 引用约束 / P2-4 气泡 HITL 语义变化）
- [x] Fix: bug notes 137+（P2-4/P2-6/P2-8 族合并 note + P2-3 + open P2-7/P2-8 族，按 guide；a11y 两项可合并 note）
- [x] Proof: AI 包全量测试 + `pnpm typecheck/lint`（AI 包）零回归
- [x] Follow-up: daily log `docs/logs/2026/08-10.md` 记录本 plan 收口

Exit Criteria:

- [x] P2-9 核心行为断言全部成立（覆盖 trigger 滚底 / scrollToBottom / pinned 门控；删除核心逻辑测试必红）
- [x] design.md / bug notes 同步到位（live 核对一致）
- [x] AI 包测试全绿零回归
- [x] daily log 收口记录落档

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（round 1 `ses_0154693d2ffezmxC03kRWpUEoZ`，round 2 `ses_0153ae7edffeAmamlgN3TX7Hus`，均 fresh session）
- Verdict: `pass-with-minors`（达成共识：零 Blocker / 零 Major；2 个 optional Minor 未改，不阻塞）
- Rounds: 2
- Findings addressed:
  - Round 1 Major-1（P2-4 onApproval 无源：Phase 2 Targets 缺 ai-message-list.tsx + ai-bubble/index.tsx，缺显式 prop 线程）→ 已修（Targets 补两文件 + Fix 写明 `props.events.onApproval` → AiMessageList/AiChatContextValue → AiBubbleViewProps → 消息级 tools renderer 全链，对齐 onBranchChange 先例 `:295-310`）
  - Round 1 Minor-1（P2-3 useMemo 闭包 stale，需 ref 镜像）→ 已修（Fix 注明 popupStateRef/popupControlsRef 模式）
  - Round 1 Minor-2（P2-6 "ref 非空即短路"会永久阻塞 mic 重启）→ 已修（专用 in-flight flag / stop·onend 清位 + restart-after-stop 断言）
  - Round 1 Minor-3（Phase 3 P2-7 Proof 后置于 Fix）→ 已修（Proof 前置，注明先于 Fix 执行）
  - Round 1 Minor-4/5（suggestion-popup.tsx 命名 / aria-current 措辞）→ 已修
  - Round 2 Minor-8（P2-8 RED 只覆盖 component-handle 路径，action-provider 命名空间路径无断言）→ 已修（Proof 扩展 `ai` namespace 臂，ai-namespace.test.tsx 先例）

## Closure Gates

- [x] 9 条 P2（multi P2-3/P2-4/P2-6/P2-8/P2-9/P2-17/P2-18 + open P2-7/P2-8）全部修复落地（test-first RED→GREEN 证据在案；P2-9 为测试补强项）
- [x] HITL 审批在默认气泡路径可达（BubbleToolRendererProps additive 字段 + 透传）
- [x] engineNullSwitch 窗口期无 ghost 会话写入
- [x] a11y 契约达成（aria-current / accessible name，DOM 属性断言在案）
- [x] 类别清扫记录入档（键盘拦截面 / voice 生命周期面 / handle 绑定面 / 气泡接线面 / 当前态列表面 / citation·feedback 匹配面）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响的 owner docs 已同步（design.md / engine.md（如涉及）/ bug notes / daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### engine/adapter 族 + 契约/文档族 P2 全量（16 条）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 分属不同结果面（engine/adapter 行为 / 契约文档 truthfulness），已分别路由 `docs/plans/2026-08-10-1606-1-engine-adapter-p2-remediation.md` 与 `docs/plans/2026-08-10-1606-3-ai-contract-doc-truthfulness-remediation.md`，不阻塞本 plan 的 9 条 renderer P2 收口
- Successor Required: `yes`
- Successor Path: `docs/plans/2026-08-10-1606-1-engine-adapter-p2-remediation.md`、`docs/plans/2026-08-10-1606-3-ai-contract-doc-truthfulness-remediation.md`（同一起草轮三 plan 并行路由）

### multi P2-14（投影克隆 abort 窗口幽灵）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 已由 plan `2026-08-10-1301-2` Phase 3 顺带覆盖（zero-chunk abort 测试实证投影终态零 vacuous placeholder），维持 watch-only 登记
- Successor Required: `no`

## Non-Blocking Follow-ups

- P2 项处理见 roadmap Follow-up Backlog（2026-08-10-1606 起草轮路由注记，本 plan 收口时同步回写）。
- P3/观察项（tiptap 聚焦丢弃、ChatToolCallUIState.result 孤儿字段等）保持在源审计记录中，不派生工作项。

## Closure

Status Note: 9 条 renderer/UI 族 P2 全部修复落地（test-first RED→GREEN，逐 Phase 入档）——P2-3 键盘死区放行（popupItemsLengthRef 镜像）、P2-4 onApproval 全链线程到气泡路径、P2-6 voice in-flight 守卫三清位、P2-8 engineNullSwitch 双绑定面显式 null engine 显式拒绝、P2-9 autoScroll 核心行为 3 断言（RED 实证非"删掉也绿"）、P2-17 aria-current、P2-18 编辑态 accessible name、open P2-7 actions:[] 方案 A 无操作栏、open P2-8 citation 索引上限 ≤64；AI 包 74 files/641 tests 全绿零回归，typecheck/build/lint 37/37、test 66/66，check:ai-engine-invariants 零命中，pnpm check 仅既有登记红零新增；bug notes 140-143 + design.md/renderers.md 同步 + daily log 收口记录落档。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（task `ses_014b75591ffePr5XizfF8RiR3L`）
- Evidence: verdict `approved`——G1-G8 全 PASS（plan 文本一致性 / 9 条 P2 代码落地点逐条 live 核对（文件:行在案）/ test-first 证据 8 文件 / fresh 复跑 74 files-641 tests + typecheck 37/37 + build 37/37 + lint 37/37 + test 66/66 / docs 同步 / deferred 诚实）；2 Minor 均非阻塞（minor-1 daily log 措辞已就地修订 / minor-2 commit 属收口环节，mission-driver 未含 commit 步骤，工作树与 1606-1 同待提交态）

Follow-up:

- no remaining plan-owned work（engine/adapter 族与契约/文档族 P2 已显式路由 sibling plans 1606-1（已 completed）/ 1606-3；P2-14 维持 watch-only 登记，见 Deferred But Adjudicated）
