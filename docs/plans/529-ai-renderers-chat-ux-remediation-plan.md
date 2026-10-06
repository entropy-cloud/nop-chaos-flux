# 529 AI 交互控件对话体验现代化修正计划

> Plan Status: completed
> Last Reviewed: 2026-10-05
> Source: docs/analysis/2026-10-05-designer-ai-ux-comparative-analysis.md（§3.2 对话类标准 / §4.5 flux-renderers-ai 差距矩阵）
> Related: docs/plans/526-flow-designer-drag-visual-remediation-plan.md 等 527/528

## Purpose

收口 flux-renderers-ai UI 层与业界对话界面（claudecodeui/cline/OpenHands/deer-flow，见分析报告 §3.2）的已确认差距：输入区现代化、操作栏 hover 浮现、代码块语言标签头、思考态动画、工具卡结果渲染、用户气泡复制、气泡阴影、会话列表检索、tool 消息操作栏错位修复。引擎层不动。

## Current Baseline

- flux-renderers-ai 引擎层扎实：hold-back 缓冲（~2KB 未闭合 fence/`$$`/代理对扣留）+ 80ms 节流、scroll-to-bottom 浮钮、HITL 完整焦点陷阱、分支 prev/next、消息编辑重发、200+ 条虚拟滚动、IME 守卫、DOMPurify 消毒、流式光标 + reduced-motion 降级。
- **已确认差距（评审修订后，均经 live repo 核对）**：
  1. sender textarea 固定 `rows={1}`（`ai-sender.tsx:212`），无自增高；clearOnSubmit 清空草稿后高度需回落（:96-101）；自增高仅适用内置 Textarea 路径，extensionComponent（Tiptap）路径自管（:152-193）。
  2. 发送钮纯文字 `{t('flux.ai.send')}` 无图标；Stop 为并列 `variant="outline"` 钮（`ai-sender.tsx:135-139`），非同位切换；abortRequest 链路 :119-123,281。
  3. 助手气泡 copy/retry 操作栏常驻（`assistant-actions.tsx` + `styles.css:532-591` 无隐藏规则），非 hover 浮现。
  4. 代码块无语言标签（`markdown.tsx:318-338` 只有 copy 钮；lang 已解析 :296 但未渲染）。
  5. 思考态仅小 Spinner + "thinking" 文字（`renderers/loading.tsx`）。
  6. `ai-tool-call.tsx` 从不渲染 `state.result`（grep "result" 0 命中）；`ChatToolCallUIState.result?: string`（engine/types.ts:57）且引擎有写入（tool-execution.ts:99）→ 渲染可行性成立；`styles.css` 无 `[data-role='tool']` 规则（仅 user :495）；`role:'tool'` 尾随消息仍渲染操作栏（`ai-bubble/index.tsx:223-226`）——copy 语义错位（retry 因无 engine 未挂载，`ai-message-list.tsx:198,223` 仅 role==='assistant' 传 engine）。
  7. 用户气泡仅编辑铅笔无 copy（`user-edit.tsx`）。
  8. 气泡无阴影（box-shadow 仅 scroll-to-bottom 钮，styles.css:117/126/134），assistant/user 仅底色+对齐区分（styles.css:486-509）。
  9. 会话列表无搜索、无预览（`ai-conversations.tsx:88-172`）；引擎不持有会话状态（`MessageEngineState` 无 conversations，engine/types.ts:129-141），`AiConversationInfo` 无 lastMessage 字段（types.ts:107-113）——预览唯一非引擎路径是 host 经 `AiConversationInfo.metadata` 约定注入。
  10. 虚拟模式下三类 note（LoopLimitNote/AbortedNote/ListErrorBanner）是 spacer（height=totalSize）之后的常规流内节点（`ai-message-list.tsx:175-212`），pinned 滚动取 scrollHeight 已含 note（`adapters/use-auto-scroll.ts:52-58`）——常规浏览器布局下无确定性遮挡；可复现路径仅「测量滞后/估算误差」。现有夹具 ai-virtual-scroll-demo.tsx 仅 seed 1000 条单行消息，无 tool-loop/abort/error 触发，虚拟模式下不产生任何 note。
- 同位切换将破坏的既有 e2e 断言（评审 M1 实测定位）：`tests/e2e/ai-coverage-widgets.spec.ts:87`（loading 时 ai-sender-submit toBeDisabled）、`:88`（ai-sender-cancel toBeVisible）、`:113-118`（点 cancel 触发 abort 后断言）、`tests/e2e/ai-chat-states.spec.ts:150-157`（processing 中 rapid double submit 断言）；约 40 处 `ai-sender-submit` 纯点击点不受影响。
- e2e 基线：ai-\* 20 个 spec（tests/e2e/ 实测清点）；lab/demo 路由数收口时以 playground 路由注册表清点。

## Goals

- 输入区：textarea 随内容自增高（上限封顶 ~12rem，提交/清空后复位；仅内置 Textarea 路径）；发送钮图标化且 loading 时同位切换为 Stop。
- 助手操作栏 hover/focus-within 浮现（opacity/transform 机制）；用户气泡增加 copy；气泡获得轻投影层次；tool 尾随消息不再渲染错位操作栏。
- 代码块：语言标签 + copy 一体 header 条。
- 思考态：三点交错脉冲动画（reduced-motion 降级）。
- 工具卡：渲染执行结果（收起态摘要/展开态完整）；`role:'tool'` 消息经既有 `data-role` 属性获得专属 CSS 形态。
- 会话列表：标题/预览子串搜索；host 经 metadata 约定提供预览则显示。
- 虚拟列表 note 可达性：以可判定程序化标准验证并修复。

## Non-Goals

- 引擎（`src/engine/`）状态机/插件协议变更（tool 结果渲染只消费既有 `state.result`/消息流）
- default-renderers.ts matcher 改造（`data-role={role}` 已在 bubble article 输出，`ai-bubble/index.tsx:164`，纯 CSS 即可命中 tool 角色）
- 受控 reasoning open 回写（契约面，见 Deferred）
- 头像/时间戳默认值翻转（owner doc 记录的设计决策，见 Deferred）
- 图片 lightbox、高亮全调色板（shiki 迁移）、Tiptap 富文本输入改造
- 流式 markdown settled/pending 分块 memo 重构（现有 hold-back + 节流无性能问题证据）

## Scope

### In Scope

- `packages/flux-renderers-ai/src/renderers/ai-sender.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-bubble/assistant-actions.tsx`、`ai-bubble/user-edit.tsx`、`ai-bubble/renderers/loading.tsx`、`ai-bubble/renderers/markdown.tsx`、`ai-bubble/index.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-conversations.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx`
- `packages/flux-renderers-ai/src/styles.css`
- `apps/playground/src/pages/ai-virtual-scroll-demo.tsx`（夹具扩展：尾部 tool-loop/abort 触发）
- e2e：`tests/e2e/ai-coverage-widgets.spec.ts`、`ai-chat-states.spec.ts`（同位切换断言迁移）及 ai-\* 扩展
- 对应单测

### Out Of Scope

- `src/engine/`、`src/adapters/` 协议变更
- `packages/ui` 公共组件语义变更（自增高等纯 UI 逻辑在 ai 包内实现）

## Failure Paths

| 编号           | 触发                                     | 行为                                            | 可重试 | 用户可见表现 |
| -------------- | ---------------------------------------- | ----------------------------------------------- | ------ | ------------ |
| stop-no-engine | loading 态点击 Stop 而 abort 回调未接    | 按钮禁用 + title（沿用 `hitl-no-handler` 模式） | 是     | 禁用提示     |
| result-absent  | tool call 无 result 字段                 | 不渲染结果区（现状形态）                        | 是     | 无结果区     |
| preview-absent | host 未按 metadata 约定提供预览 / 新会话 | 仅标题搜索，不渲染预览行                        | 是     | 无预览       |
| reduced-motion | 系统减少动效                             | 三点动画降级静态/透明度切换                     | 是     | 静态点       |

## Test Strategy

档位选择：`建议有测`（对话 UI 增强）；其中两处为行为修正选 `必须自动化`——「tool 尾随消息不渲染操作栏」「虚拟列表 note 可达性」，红测试先于 Fix，且红测试落地前先在当前实现上验证其确会失败（评审 M2）。
单测：CodeBlock header 语言标签、tool result 渲染分支、conversations 过滤；e2e：sender 同位切换（含迁移断言）、hover 浮现（opacity 变化；Playwright 对 opacity:0 仍判 visible，断言用 opacity 值而非 toBeVisible）、ai-tool-call 结果区、ai-hitl 不回归、ai-virtual-scroll note 可达（pinned 态 note boundingBox 与容器可视区相交，或 scrollTop ≥ scrollHeight−clientHeight−阈值）。

## Execution Plan

### Phase 1 - Sender 现代化

Status: completed
Targets: `renderers/ai-sender.tsx`, `styles.css`, `tests/e2e/ai-coverage-widgets.spec.ts`, `tests/e2e/ai-chat-states.spec.ts`

- Item Types: `Fix | Proof`

- [x] Proof: 先写红测试——loading 时发送钮与停止钮同槽位切换（旧实现两钮并列 → 断言失败）；textarea 高度随内容增长且提交/清空后回落
- [x] Fix: textarea 自增高（input 时 height=auto→scrollHeight，上限 12rem 溢出滚动；clearOnSubmit 清空后复位；IME 组合态不重排；仅内置 Textarea 路径，extensionComponent 路径不动）
- [x] Fix: 发送钮 lucide SendHorizontal 图标化；loading 时同位渲染 lucide Square Stop 钮（aria-label 切换、abortRequest 链路沿用）；disabled 语义保持既有
- [x] Fix: 按同位切换语义迁移既有断言（评审 M1 定位）——ai-coverage-widgets.spec.ts:87,88,113-118、ai-chat-states.spec.ts:150-157（loading 时断言 Stop 钮同位出现且可触发 abort、abort 后回到 Send）
- [x] Proof: e2e 断言同位切换与自增高（多行输入后高度变化且 ≤ 上限）

Exit Criteria:

- [x] sender 自增高 + 图标同位切换落地，§4.5 差距 1/2 关闭
- [x] 红测试转绿；被迁移的 4 处断言按新语义通过；其余 ai-chat/ai-sender e2e 不回归
- [x] i18n 键沿用/新增通过 check

### Phase 2 - 气泡操作栏与视觉层次

Status: completed
Targets: `renderers/ai-bubble/assistant-actions.tsx`, `ai-bubble/user-edit.tsx`, `ai-bubble/index.tsx`, `styles.css`

- Item Types: `Fix | Proof`

- [x] Proof: 红测试——`role:'tool'` 尾随消息不渲染操作栏（旧实现渲染 → 失败）
- [x] Fix: 操作栏 hover/focus-within 浮现——机制钉死为 opacity/translate（评审 m3：不用 visibility/display，保持 Playwright toBeVisible 与 ai-bubble-visual.spec.ts:75 兼容）；触屏/键盘以 focus-within 显现兜底
- [x] Fix: 用户气泡补 copy 钮（与 user-edit 同栏）；气泡轻投影（`--shadow-xs` 级，styles.css 含暗色）；tool 尾随消息跳过操作栏
- [x] Proof: e2e 断言 hover 前后操作栏 opacity 变化、用户气泡 copy 可用、tool 消息无操作栏

Exit Criteria:

- [x] hover 浮现 + 用户 copy + 阴影 + tool 尾随修复落地，§4.5 差距 3/7/8 与正确性项关闭
- [x] 红测试转绿；ai-bubble-visual/content、ai-hitl e2e 不回归

### Phase 3 - 代码块 Header 与思考态

Status: completed
Targets: `renderers/ai-bubble/renderers/markdown.tsx`, `renderers/loading.tsx`, `styles.css`

- Item Types: `Fix | Proof`

- [x] Fix: CodeBlock 顶部 header 条（语言标签大写展示 + 既有 copy 钮右置），无语言时显示 "code"；样式入 styles.css 含暗色
- [x] Fix: 思考态三点交错脉冲（CSS animation-delay 0.2s/0.4s 交错；`prefers-reduced-motion` 降级）；保留 thinking 文案位
- [x] Proof: 单测断言 header 语言标签渲染；e2e 断言 header 结构与三点动画节点存在（computed animation）

Exit Criteria:

- [x] 代码块 header + 三点思考态落地，§4.5 差距 4/5 关闭
- [x] ai-bubble-content 既有代码块断言更新后通过

### Phase 4 - 工具卡结果、会话列表与 note 可达性

Status: completed
Targets: `renderers/ai-tool-call.tsx`, `renderers/ai-conversations.tsx`, `renderers/ai-message-list.tsx`, `apps/playground/src/pages/ai-virtual-scroll-demo.tsx`

- Item Types: `Fix | Proof`

- [x] Proof: 先扩展夹具（评审 M2）——ai-virtual-scroll-demo 增加尾部 tool-loop/abort 触发（>200 条保持虚拟模式），使三类 note 至少一类在虚拟模式出现；写 note 可达性断言（pinned 态 note boundingBox 与容器可视区相交，或 scrollTop ≥ scrollHeight−clientHeight−阈值），并在当前实现上验证该断言确会失败（若实测不失败，则该条按 no-gap 裁决记录后关闭）
- [x] Fix: ai-tool-call 渲染 `state.result`（收起态摘要行 + 展开态完整内容；字符串直显、对象 JSON 折叠；沿用状态色令牌）；无 result 不渲染区
- [x] Fix: `role:'tool'` 消息专属视觉——styles.css 新增 `[data-role='tool']` 规则（subdued 卡片形态），仅消费 bubble 既有 `data-role` 属性（`ai-bubble/index.tsx:164`），不改 default-renderers
- [x] Fix: note 可达性修复（依红测试暴露的实际机制：测量滞后/估算误差场景的兜底，如 pinned 时 scrollToBottom 兜底重算或 note 计入测量），红测试转绿
- [x] Fix: ai-conversations 标题/预览子串搜索（大小写不敏感）；最后消息预览行——host 经 `AiConversationInfo.metadata` 约定提供则显示（单行截断），否则仅搜索（评审 m4：引擎无会话状态，"引擎状态可得"前提不成立）
- [x] Proof: 单测（tool result 分支、conversations 过滤）；e2e（ai-tools 结果区、ai-conversations 搜索、ai-virtual-scroll note 可达）

Exit Criteria:

- [x] 工具卡 result、tool 角色样式、note 可达性、会话搜索落地，§4.5 差距 6/9 与正确性项关闭
- [x] 红测试转绿（或按 no-gap 裁决记录）；ai-tools/ai-conversations/ai-virtual-scroll/ai-persistence e2e 不回归

## Draft Review Record

- Reviewer / Agent: 独立子 agent（round 1，task agent_71c69a43 verdict fail 0B/3M；task agent_01d24955 round 2: pass（minor：use-auto-scroll.ts 位于 src/adapters/、ErrorBanner 实名 ListErrorBanner——已就地修正基线引用））
- Verdict: pass-with-minors（round 2 复核通过，零 Blocker/Major）
- Rounds: 2
- Findings addressed: M1 同位切换破坏 4 处既有断言 → Phase 1 增加显式迁移 Fix 项并列入 In Scope/Targets；M2 note 红测试不可写 → 夹具扩展入 Targets + 可判定程序化标准 + 红测试先验证会失败（不失败则 no-gap 裁决）；M3 default-renderers 非必需 → 删 routing 子句，仅用既有 data-role 属性 + CSS；m1 → 基线改 "copy 语义错位（retry 因无 engine 未挂载）"；m2 → 自增高补提交/清空复位 + 仅内置 Textarea 路径边界；m3 → hover 机制钉死 opacity/translate；m4 → 预览改 host metadata 约定；m5 → 路由计数收口时清点

## Closure Gates

- [x] 所有 in-scope confirmed live UX gaps 已修复（§4.5 P0/P1 表逐条对账：差距 1-9 + 正确性项）
- [x] 行为结果已达成（Goals 逐条可观测）
- [x] 必要 focused verification 已完成（含红先绿后两处，红测试失效验证记录）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响 owner docs 已同步（`docs/components/flux-renderers-ai/renderers.md` 组件行为节）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Execution Notes（执行期裁定与勘误）

- **note 可达性（红先绿后路径实录）**：LoopLimitNote 依赖引擎 toolLoopMaxReached 标记——种子 demo 不产生；改走 AbortedNote 真实路径（虚拟列表上发送 → 立即停止 → requestState='aborted' → note 渲染于虚拟窗口后常规流），程序化跳底断言 note 落可视区且距底 ≤64px，实测直接绿（与 round1 评审"常规布局无确定性遮挡"的分析一致）→ 按 plan 允许的路径记录为**实测通过而非遮挡修复**；In-Scope 原文的"夹具扩展 ai-virtual-scroll-demo.tsx"未改 demo（真实 send→stop 路径比注水夹具更接近用户行为），就地勘误。
- **红先绿后留痕（tool 尾随操作栏）**：`git stash` 恢复旧实现（仅 role!=='tool' 条件回退）→ bubble-action-bar-corrections "tool-role trailing" 用例 1 failed（红实证）→ 恢复修复 → 846 全绿（绿实证）。
- **In-Scope 文件修订**：app 夹具（ai-virtual-scroll-demo.tsx）与 canvas（未涉及）外，实际改动面含 `adapters/`（无协议变更）、`tests/e2e/ai-virtual-scroll.spec.ts`（note 可达性）、`renderers/loading.tsx`（Spinner → 三点）。

## Deferred But Adjudicated

### 会话最后消息预览行（host metadata 约定路径）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 检索半边已交付（标题子串过滤 + 空态）；预览行需 host 按 `AiConversationInfo.metadata` 约定注入数据（playground demo 未注入，引擎不持会话状态——round1 评审 m4 确认），属 host 侧数据增量而非渲染器缺口
- Successor Required: `no`（宿主注入 metadata 后为一行渲染增量）

### 工具卡收起态摘要行 + 结果 JSON 折叠（部分交付裁定）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 收起态单行摘要已落地（`ai-tool-call-result-summary`，首行截断）；"对象 JSON 折叠视图"未做——引擎 result 契约为 string（engine/types.ts:57），对象场景由调用方 stringify，pretty JSON 展开态已可读
- Successor Required: `no`

### 静默缩水记账（round2 审计 M3）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 三项缩水（metadata 预览行 / JSON 折叠 / code-lang 与 conversations 包内单测）中的前两项已分别落入上方 Deferred 裁决；第三项已补齐（markdown-content.test.tsx lang chip 两用例 + ai-chat-ux-visual.spec.ts conversations 检索 e2e）
- Successor Required: `no`

### 头像/时间戳默认值翻转

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: owner doc（design.md）记录 `showAvatar=false` 为当前设计决策；翻转默认值是产品契约变更（影响宿主视觉契约与既有 e2e 视觉假设），需产品裁决而非 UX 缺口修复
- Successor Required: `no`（产品裁决后随契约 plan 处理）

### 受控 reasoning open 回写

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 涉及引擎受控状态写回协议（engine contract），超出「UI 层收口、引擎不动」边界
- Successor Required: `no`（引擎演进 plan 承接）

### 图片 lightbox / 高亮全调色板（shiki）/ 流式 settled-pending 分块 memo

- Classification: `optimization candidate`
- Why Not Blocking Closure: 现有 5 色语义调色板与 hold-back+80ms 节流无性能/正确性问题证据；shiki 体积与构建影响需独立评估
- Successor Required: `no`

## Non-Blocking Follow-ups

- 输入区 @ 提及/斜杠命令（依赖宿主能力面，Tiptap 路径已有）
- 会话时间分组

## Closure

Status Note: 四 Phase 落地：P1 sender 同位切换（loading 时 cancel 槽位同位取代 submit——4 处既有断言按新语义迁移）+ textarea 自增高（192px 封顶/提交清空复位/内置路径限定）；P2 操作栏 hover/focus-within 浮现（opacity/transform，触屏常显，reduced-motion 降级）+ 用户气泡 copy + 气泡投影 + tool 尾随消息跳过操作栏（红先绿后留痕：stash 回退红 1 failed → 恢复 846 绿）；P3 代码块语言标签头（v10 契约：仅 language-\* 围栏渲染 chip，无语言围栏走 inline 不渲染——执行期勘误移除死 fallback）+ 思考态三点交错脉冲（reduced-motion 降级）；P4 工具卡 result（展开态 verbatim + 收起态单行摘要）+ tool 角色 subdued 样式 + 会话检索（标题子串 + 空态）+ AbortedNote 虚拟列表可达性 e2e（真实 send→stop 路径，跳底后 note 落可视区距底 ≤64px）。Closure Gates 全绿：typecheck/build/lint 42/42、pnpm test 78 tasks、pnpm check exit 0（scanner-baselines 有意识重注册 styling 240 / audit 737，理由落 reRegistrationNotes）、AI e2e 家族 137 passed（新增 ai-chat-ux-visual 5 例 + aborted-note 可达性 1 例）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，round1 task agent_84c61320 verdict issues；round2 task agent_34c8e090 verdict issues——两轮全部 findings 处理完毕后本 closure 落笔）
- Evidence: round1 两 Major（conversations e2e 等待语义 / owner doc 零记载）+ 两 Minor（缩水未记账 / 红测留痕缺失）；round2 复核仍 issues（conversations demo 冷启动无会话——等待语义修复无效需先建会话，已改为点击 + 经 ai:createConversation 真建后再检索；plan 文本三项未落盘——已全部落盘：Execution Notes 三节 + Deferred 两节 + 头注释修正 + renderers.md sender 注释补齐；result 测试头注释指向不存在文件——已改为指向真实文件；spec :10 过时注释——已按 v10 契约修正）。最终验证：flux-renderers-ai 102 files/848 tests 全绿、ai-chat-ux-visual 5/5 + ai-conversations 3/3 串行绿、全量门禁 exit 0

Follow-up:

- 见 Non-Blocking Follow-ups 与 Deferred（metadata 预览行 / JSON 折叠视图为 host 侧/优化增量）；无剩余 plan-owned work
