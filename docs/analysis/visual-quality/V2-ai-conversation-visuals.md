# V2 研究报告：AI 会话组件视觉修复

> 核查日期: 2026-09-19
> 基线: master @ 8416b1df8（V1 已收口）
> 输入: 普查报告 §1、`docs/bugs/166-ai-chat-streaming-chunk-renders-at-stream-end.md`、`docs/components/flux-renderers-ai/design.md`、路线图 V2
> 状态: 已独立核实（revised → 2 Major + 8 Minor 修订后零 Blocker/Major，见文末核实记录）

## 0. 域现状复核（与普查 §1 逐条对照）

普查五项 findings 全部 live 证实，其中两项需勘误/细化：

- **F1 bug 166（证实）**：数据流全链核实——engine per-chunk `applyChunk`+`commitAssistant`（`create-engine.ts:531-548`）→ React adapter 每 chunk 重建快照（`react-adapter.ts:36-39`）→ `useSyncExternalStore` 每 chunk 重渲染 `AiChatRenderer`（`use-engine-view.ts:97`）→ **但 AI-31 context memo（`ai-chat.tsx:499-502`）以 messages 数组引用为 dep，流式期间引用不变 → `AiMessageListView` 等 context consumer bail-out**。修复挂点：memo deps 增加流式指纹。
- **F2 气泡视觉层（证实）**：`ai-bubble/index.tsx:133-136` 输出 `data-role/data-placement/data-shape/data-streaming`，全仓 CSS（含 playground）零 `[data-placement]`/`[data-shape]` 规则（grep 证实）；气泡无底色/圆角/内边距，仅 `:has(avatar)` 行布局（styles.css:311-316）与 avatar 样式。`shape` 取值 `'corner' | 'rounded' | 'none'`（index.tsx:21），placement 经 `effectivePlacement`（RTL 感知 start/end）。
- **F3 滚动到底按钮（证实）**：`use-auto-scroll.ts` 提供 `{containerRef,onScroll,scrollToBottom,isAtBottom}`，`ai-message-list.tsx:90-121` 消费 auto-scroll；但 pinned 是 `useRef` 非响应式，且无"回到底部"悬浮按钮 UI——用户上滚后无快速返回入口。
- **F4 气泡操作条（证实）**：`ai-bubble/index.tsx:192` 仅 `isUser` 挂 `UserMessageActions`；assistant 侧无任何操作条。引擎已具备 `regenerate(branchId?)`（`engine/types.ts:365`）可作重试语义。
- **F5 代码高亮（证实+设计意图勘误）**：`markdown.tsx:126-153` 确为 4 token（tok-key/tok-str/tok-num/tok-bool）；但注释与 design.md 明示"palette stays small on purpose"——扩充须作为对该设计意图的显式修订裁决，不是纯缺陷修复。
- **F6/F7/F8（证实缺失，均为能力型而非缺陷型）**：image.tsx 无 lightbox（grep 零命中）；消息仅有 per-bubble 时间 footer（A-4），无日期分组；无消息进入动画。

## 1. 裁决

| #   | 项               | 裁决                             | 理由                                                                                                                                                                                                                                       |
| --- | ---------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | bug 166          | **Fix（test-first）**            | live defect（open bug），普查与 bug 登记双证据                                                                                                                                                                                             |
| A2  | 气泡视觉层       | **Fix**                          | 死属性（声明无消费）是本路线图 P1 模式的典型；消费规则见 §2                                                                                                                                                                                |
| A3  | 滚动到底按钮     | **Fix**                          | hook 能力已在、UI 缺失；对标产品标配                                                                                                                                                                                                       |
| A4  | assistant 操作条 | **Fix（默认挂载 copy + retry）** | `regenerate` 已在引擎面；默认挂载是对标结论；**不加 schema props**（renderer 定义字段属保护区域，走 ai-autonomy-policy 需人工门禁）——内部组件默认挂载即收口                                                                                |
| A5  | 高亮 palette     | **Fix（+1 token：tok-comment）** | 对 design.md 4-token 调色板决策的显式修订（独立核实 M2：`punctuation` scope 在 hljs common 主力语言 0 命中，tok-punct 会复刻"声明无消费"反模式，删除）；comment 全语法通用、是代码块最大视觉密度来源。仅扩映射与 CSS，不动 lowlight 语言集 |
| A6  | lightbox         | **deferred**                     | 新交互能力（dialog/缩放/键盘路径），非视觉缺陷；需独立设计与交互测试。`Why Not Blocking`: 图片展示本身无缺陷，只是查看体验增强                                                                                                             |
| A7  | 时间分组         | **deferred**                     | 产品信息架构决策（分组粒度/文案/排序），非缺陷。per-bubble 时间戳已可用                                                                                                                                                                    |
| A8  | 进入动画         | **deferred**                     | 挂载动画与虚拟滚动窗口位移相互作用（重挂载即重放动画造成噪声），需 reduced-motion 与虚拟化联动设计；独立裁决后再做                                                                                                                         |
| A9  | AI e2e 视觉断言  | **Fix**                          | V0 工具链首批域消费方（路线图明示）                                                                                                                                                                                                        |

## 2. 关键设计要点（plan 的实现约束）

1. **bug 166 修复面（两处，独立核实 M1 修正）**：
   - **memo 渐进渲染**：AI-31 memo deps（`ai-chat.tsx:500-503`）追加流式指纹 `streamFingerprint(messages)`——`last.id + content 长度 + reasoning_content 长度 + tool_calls args 总长`（content 为 string 取 length、为 parts 数组取各 part text 长度和；覆盖正文流/推理流/tool 参数增长三类 chunk——核实员 Minor-3 指出的指纹缺口显式纳入）。指纹不变 → context 稳定（保留 AI-31 意图）；per-chunk 指纹变 → context 重建 → message-list/bubble 逐 chunk 渲染。不改 engine、不改 adapter（no-clone 纪律保持）。
   - **光标流式信号（M1：原声明为假）**：光标条件现挂 `message?.loading === true`（`markdown.tsx:48`），而引擎在**首个 chunk 即置 loading=false**（`create-engine.ts:537-539`）且 loading=true 窗口内 content 为空、markdown 渲染器 `source.length===0` 早退不挂载光标元素——现链路光标**永不渲染**。修复：渲染层派生真实流式信号（`isProcessing && 末条为 assistant` → 经 ai-message-list 向 bubble 传 `streaming`，bubble 的 `data-streaming` 与 markdown 光标条件改挂该信号），不再以 `loading` 为光标依据。
2. **气泡视觉层消费规则**（全部落 `packages/flux-renderers-ai/src/styles.css`；暗色按包内三块先例——基础亮色 fallback + `@media(prefers-color-scheme:dark)` 块 + `[data-mode='dark']` 块，avatar 样式 styles.css:312-331 即模板，不做单规则"自动暗色"假设——核实员 Minor-4）：
   - `[data-slot='ai-bubble']`：底色 surface、边框 border、圆角 radius-lg、内边距、最大宽度约束；assistant/user 底色区分（user 用 primary-foreground/primary 对比或 secondary-surface，以 classic 调色板语义取）。
   - `[data-placement='end']`（用户消息）：行内 `margin-inline-start:auto` 右对齐（avatar 行布局下用 flex 行方向排序）。
   - `[data-shape='corner'|'none']`：圆角降级/取消。
3. **滚动到底按钮**：`useAutoScroll` 的 pinned 增加响应式镜像（state + ref 同步，`onScroll`/`scrollToBottom` 双向维护；phase5 契约测试保持绿）；`ai-message-list.tsx` 容器内 `data-slot='ai-scroll-to-bottom'` 悬浮按钮，`!pinned` 时可见，点击 `scrollToBottom`。样式走 styles.css。
4. **assistant 操作条**：`ai-bubble/renderers/assistant-actions.tsx`——copy 沿 `markdown.tsx:302-309` 的 `clipboardAdapter` 先例（navigator.clipboard + INV-1 裁决注释 :24-27，clipboard 不在 INV-1 禁用清单；核实员 Minor-1 更正引用，user-edit.tsx 无 copy）；retry 调 `regenerate()`（无参），仅 `!isProcessing` 时可用（regenerate.ts 已有 isProcessing 拒绝语义）。挂载点 `ai-bubble/index.tsx:192` 旁 `isAssistant` 分支。
5. **回归测试面（核实员 Minor-2 机理修正）**：流式冻结 = playground React Compiler JSX memo（`vite.config.ts:15`，vitest 不编译）+ context memo 叠加 → 单测先红只能断言 **context 值身份 per-chunk 变化**（未编译环境 DOM 渐增断言修复前即绿，不可作先红）；**DOM 渐进的先红只能在编译态 e2e**（D1 fixture delayMs=200，流式期间 DOM 采样断言内容渐进增长 + 光标元素出现——当前必然红）。另：单测（streamFingerprint 纯函数、视觉层属性输出、操作条、滚动按钮契约、光标信号派生）；新增 `ai-bubble-visual.spec.ts` 消费 V0 helper（气泡底色/圆角/右对齐 L3、滚动按钮 L1/L3、操作条 L1）。

## 3a. 滚动按钮挂载细节（核实员 Minor-8）

`ai-message-list` 容器即 scrollport（styles.css:86-90 `overflow:auto`）且无 relative wrapper——按钮采用 sticky-in-scrollport 方案（容器内末尾 sticky 定位）或包一层 relative wrapper，二选一在 plan 中钉死；实现须避开 `messages.length===0` 早退分支（空态无按钮）。

## 3. 边界

- bug 166 修复 scope 显式声明：指纹覆盖正文/推理/tool-args 三类增长 chunk；metadata-only/finishReason-only chunk 仍不触发（终端态 dep 已覆盖其渲染切换）——如实登记不夸大。

- 不加 renderer 定义字段/schema props（保护区域）。
- 不改 engine/connector/adapter 内核（bug 166 修复限渲染层 memo）。
- 不做 lightbox/时间分组/进入动画（A6-A8 deferred）。
- 不动 tiptap-sender（V10 工具条一致性另行核对）。

## 4. 验证方式

1. 单测先红后绿（bug 166 渲染层、视觉层、操作条、滚动按钮契约）。
2. e2e：fixture 流式渐进断言先红后绿；ai-bubble-visual spec 全绿（V0 helper）。
3. 全量 AI 族 19+2 spec 回归（气泡样式变更可能影响既有 DOM 断言——bubble 结构不变，仅 CSS 层新增，预期零破坏，跑全量确认）。
4. `pnpm check` 零新 hit。

## 5. 独立核实记录

- Reviewer / Agent: 独立核实审查员（fresh sub-agent session，2026-09-19）
- Verdict: `revised`（0 Blocker / 2 Major / 8 Minor）
- 已处理：M1——光标可见性原声明为假（引擎首 chunk 置 loading=false + 空 content 早退 → 光标永不渲染），§2.1 追加"光标流式信号"修复面（isProcessing+末条 assistant 派生 → bubble data-streaming 与 markdown 光标条件改挂该信号）；M2——tok-punct 在 hljs common 主力语言 0 命中（会复刻死配置反模式），A5 缩为 +1 token（tok-comment）。Minor 1-8 全部吸收：copy 先例更正为 markdown.tsx clipboardAdapter、单测/ e2e 先红通道按编译态机理分流、指纹覆盖三类 chunk、暗色三块结构、F5 出处措辞、行号校正、"19+2"口径、滚动按钮 sticky/wrapper 钉死。
- 核实亮点：确认**无独立 bubble 订阅通道**（AiBubbleView 纯 prop 驱动）→ memo 指纹是正确挂层；regenerate.ts 已有 isProcessing 拒绝语义；clipboard 不在 INV-1 禁用清单；hljs@11.11.1 scope 实测。
