# 472 视觉质量 V2：AI 会话组件视觉修复 Plan

> Plan Status: completed
> Last Reviewed: 2026-09-19
> Source: `docs/analysis/visual-quality/V2-ai-conversation-visuals.md`（已独立核实，2 Major + 8 Minor 修订后零 Blocker/Major）、`docs/bugs/166-ai-chat-streaming-chunk-renders-at-stream-end.md`、`docs/backlog/visual-quality-roadmap.md` V2
> Related: `docs/plans/470-visual-quality-v0-baseline-infra-plan.md`（V0 工具链）、`docs/plans/471-visual-quality-v1-theme-darkmode-foundation-plan.md`

## Purpose

把路线图 V2 收口：bug 166 流式逐 chunk 渲染 + 流式光标可见（先红后绿回归）、气泡视觉层落地（data-shape/data-placement 消费）、滚动到底悬浮按钮、assistant 操作条默认挂载、高亮 tok-comment 扩充、AI 族 e2e 视觉断言（V0 工具链首批域消费方）。

## Current Baseline

- master @ 8416b1df8（V1 收口；unit 74/74、scripts 70/70、check 全绿）。
- bug 166（open）根因链已核实：engine per-chunk commitAssistant 原地替换（数组引用不变）→ react-adapter 每 chunk 重建快照 → `useSyncExternalStore` 每 chunk 重渲染 `AiChatRenderer` → **AI-31 context memo（`ai-chat.tsx:500-503`）以 messages 数组引用为 dep → context consumer bail-out**。无独立 bubble 订阅通道（AiBubbleView 纯 prop 驱动）。
- **光标永不渲染**（核实 M1）：光标条件挂 `message?.loading`（`markdown.tsx:48`），引擎首 chunk 即置 loading=false；loading=true 窗口 content 为空、markdown 渲染器空串早退（`:45`）不挂载光标。
- 气泡属性零消费：`data-shape('corner'|'rounded'|'none')/data-placement(start|end)/data-streaming` 输出在 `ai-bubble/index.tsx:133-139`，全仓 CSS 无对应规则；气泡无底色/圆角/内边距。
- `useAutoScroll`（`use-auto-scroll.ts`）pinned 为 useRef 非响应式；`ai-message-list.tsx:90-121` 容器即 scrollport（无 relative wrapper）；无滚动到底按钮。
- assistant 侧无操作条（`index.tsx:192` 仅 user 挂 UserMessageActions）；`regenerate()` 在引擎面（types.ts:365，isProcessing 拒绝语义在 regenerate.ts）；copy 先例 = `markdown.tsx:302-309` clipboardAdapter（INV-1 合规）。
- 高亮 4 token（`markdown.tsx:126-153`）；`punctuation` scope 在 hljs common 主力语言 0 命中（tok-punct 不可用），`comment` 全语法通用。
- 流式冻结机理 = playground React Compiler JSX memo（vitest 不编译）+ context memo 叠加 → 单测先红只能断言 context 身份；DOM 渐进先红只能在编译态 e2e。
- D1 fixture：delayMs=200、~12–24s 流、≤~42 chunks；`ai-widgets-demo.spec.ts:110` `Hello` 断言 10s。

## Goals

- 发送消息后内容逐 chunk 渐进渲染（编译态页面），流式光标在累积期可见；bug 166 关闭（先红后绿回归）。
- 气泡视觉层成立：底色/圆角/内边距/用户消息右对齐/shape 降级，暗色三块跟随包内先例。
- 滚动到底悬浮按钮（unpinned 时可见，点击回底）。
- assistant 气泡默认挂载 copy+retry 操作条。
- 高亮 palette +1（tok-comment）。
- AI 族 e2e 视觉断言落地（V0 helper）。

## Non-Goals

- 不加 renderer 定义字段/schema props（保护区域，ai-autonomy-policy 需人工门禁）。
- 不改 engine/connector/adapter 内核（no-clone 纪律保持；修复限渲染层 memo 与光标信号派生）。
- 不做 lightbox/时间分组/进入动画（研究报告 A6-A8 deferred：能力型缺失非缺陷，理由见报告裁决表）。
- 不动 tiptap-sender（V10 另核）。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`：AI-31 memo deps + 流式指纹。
- `packages/flux-renderers-ai/src/renderers/ai-bubble/`：streaming 信号传递、光标条件、assistant-actions 新组件、markdown.tsx tok-comment 映射。
- `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx` + `adapters/use-auto-scroll.ts`：pinned 响应式 + 滚动按钮。
- `packages/flux-renderers-ai/src/styles.css`：气泡视觉层（三块暗色）、滚动按钮、操作条样式。
- `packages/flux-renderers-ai/src/renderers/__tests__/`：focused 单测。
- `tests/e2e/ai-widgets-fixture.spec.ts`（或新增 streaming spec）：流式渐进 + 光标先红后绿；`tests/e2e/ai-bubble-visual.spec.ts` 新增。
- `apps/playground/src/ai/ai-widgets-fixture.ts`：`code` preset 代码块补一行注释（draft review M2：全 playground 现无含注释 fenced code，tok-comment e2e 断言需观测目标；执行时核对既有内容断言同步）。
- `packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`：`flux.ai.copyMessage/retryMessage/scrollToBottom` 三键（closure audit Minor-2 补登记：lint CJK aria-label 硬门禁收敛项）。
- `apps/playground/src/ai/coverage-connectors.ts`：`wordsStream` 增 `initialDelayMs` 参数、slow connector 传 900ms 首 chunk 延迟（执行期三处既有 e2e 缺陷归因修复之一，已在 Phase 4 登记）。
- Owner docs：`docs/components/flux-renderers-ai/design.md`/`renderers.md`（视觉层与操作条语义）、`docs/bugs/166…md`（关闭登记）、证据卡 `ai.md`、daily log。

### Out Of Scope

- 虚拟滚动窗口行为调整、sender/tiptap、会话管理、engine 契约。

## Failure Paths

| 场景                        | 触发                             | 行为                                                            | 可重试         | 用户可见表现 |
| --------------------------- | -------------------------------- | --------------------------------------------------------------- | -------------- | ------------ |
| clipboard-denied            | 宿主拒绝剪贴板权限               | copy 按钮静默降级（既有 clipboardAdapter 行为沿用）             | 是             | 无崩溃       |
| regenerate-while-processing | isProcessing 中点 retry          | regenerate.ts 既有拒绝语义，按钮 disabled 双保险                | 否（等流结束） | retry 不可点 |
| fingerprint-miss            | metadata/finishReason-only chunk | 指纹不变不触发重渲染（终端 dep 已覆盖渲染切换），如实登记 scope | —              | 无可见缺陷   |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——bug 166 是 open live defect（先红后绿为硬要求）；视觉层/操作条/滚动按钮是用户可感知行为。Proof 项先于 Fix 项；先红通道按编译态机理分流（单测=context 身份，e2e=DOM 渐进+光标）。

## Execution Plan

### Phase 1 - bug 166：流式渐进渲染 + 光标可见

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`、`ai-bubble/renderers/markdown.tsx`、`ai-bubble/index.tsx`、`ai-message-list.tsx`、`renderers/__tests__/`

- Item Types: `Proof | Fix`

- [x] Proof（单测先红）：新增单测断言 AI-31 context 值身份随流式指纹变化（沿 `ai-test-support.ts` `createAiSchemaRenderer` + probe 组件先例，如 ai-chat-lifecycle-stability.test.tsx 的 MessagesRefProbe；connector gate/await 分 chunk）——模拟同引用 messages、末条内容增长 → context 消费端可观测新值；未实现前运行必红
- [x] Proof（e2e 先红）：`ai-widgets-fixture.spec.ts` 增流式渐进用例——D1 fixture 发送后按 1.5s 采样 DOM：断言末条 bubble 文本长度单调增长且流中出现 `[data-slot='ai-bubble-cursor']`；当前实现下必红（内容流末一次出现、光标永不渲染）
- [x] Fix：实现 `streamFingerprint(messages)`（三面指纹）加入 AI-31 memo deps + `streamSignature` context 字段。**执行期重大发现（插桩实证）**：React Compiler 按渲染期实际读取的值做缓存键、无视 deps 数组——快照身份/指纹等"仅入 deps"的信号在编译构建下冻结（浏览器实测 list 整流仅 2 次渲染；关闭编译器对照实验 238 次逐 chunk 渲染）。最终落地 `useEngineContentTick`（useSyncExternalStore 内容长度 tick）+ `streamSignature` prop 读入渲染输出 = 编译缓存键内信号的确定性机制；memo 指纹保留服务非编译消费方。详见日志与 design.md §13.4
- [x] Fix：光标流式信号（draft review M1 钉死解析链）：bubble 新增显式 `streaming` 解析链 = 显式 prop > context 派生 `isStreamingMessage`（isProcessing && 末条 assistant，经 context→message-list→bubble 传递，`isError` props 链为先例）> `message.loading` fallback（standalone 无 provider 场景与既有直渲染测试保持原语义）；**`ai-bubble/index.tsx:152` 的 tools/reasoning/error 卡门控保持 `message.loading` 不动**（整段切 chat 级信号会把推理/工具卡流中增长退化为流末出现）；markdown 光标条件改用解析后的 streaming 值
- [x] Fix：单测转绿（context 身份；`ai-chat-streaming-context.test.tsx` 1/1）

Exit Criteria:

- [x] 单测先红后绿有记录（红=身份冻结 1 failed；绿=1/1）；包内 ai 测试零回归（804/804）
- [x] e2e 流式渐进用例转绿（stash 修复真实红态取证：1 failed；恢复后 1/1 绿，DOM 渐进+光标双断言）
- [x] `docs/bugs/166-…md` 状态翻 fixed 并登记修复面与指纹 scope

### Phase 2 - 气泡视觉层落地

Status: completed
Targets: `packages/flux-renderers-ai/src/styles.css`

- Item Types: `Fix`

- [x] Fix：`[data-slot='ai-bubble']` 基础视觉落 **article 元素**（底色/边框/圆角/内边距/`fit-content` + max-width——draft review Minor-2 钉死：avatar 包进气泡、行布局不变，且气泡宽度非全宽使右对齐 boundingBox x 断言可比）；`data-role='user'` 底色区分；`[data-placement='end']` 右对齐；`[data-shape='corner'|'none']` 圆角降级
- [x] Fix：暗色按包内三块先例（基础 fallback + `@media(prefers-color-scheme:dark)` + `[data-mode='dark']`，avatar 块（styles.css:312-331 亮块 + :336-348 暗块对，draft review Minor-1 区间校正）为模板）补全部新规则的暗轨值

Exit Criteria:

- [x] styles.css 新规则含完整三块暗色（气泡面/滚动按钮/操作条均有 media 门控块 + data-mode 块；tok-comment/str/bool 依令牌自动换肤走单规则模式与邻居一致）
- [x] 现有气泡相关单测零回归（804/804；markdown-content c1 暗块计数快照 3→6 块/8 guard 随新增结构更新，guard-per-selector 不变式保持）

### Phase 3 - 滚动到底按钮 + assistant 操作条 + tok-comment

Status: completed
Targets: `adapters/use-auto-scroll.ts`、`ai-message-list.tsx`、`ai-bubble/renderers/assistant-actions.tsx`（新）、`ai-bubble/index.tsx`、`markdown.tsx`、`styles.css`

- Item Types: `Fix`

- [x] Fix：`useAutoScroll` pinned 响应式镜像（state 与 ref 同步维护；phase5 契约测试语义不变），`ai-message-list.tsx` 外层包 relative wrapper、滚动容器内挂 `data-slot='ai-scroll-to-bottom'` 绝对定位右下（draft review Minor-6 当场钉死 wrapper 方案；避开空态早退分支），`!pinned` 时可见、点击 `scrollToBottom`
- [x] Fix：`assistant-actions.tsx`——copy（沿 clipboardAdapter 先例）；retry（`regenerate()`，`isProcessing` 时 disabled）**仅挂在末条 assistant 气泡**（draft review M3 钉死：regenerate 无 per-message 入参、无条件截断到最后一条 user 消息，旧气泡挂 retry 会误导性重生成最后一轮）；standalone 无 context/engine 时 retry 隐藏、copy 保留；挂载于 `ai-bubble/index.tsx` assistant 分支；样式落 styles.css
- [x] Fix：`markdown.tsx` HLJS_SCOPE_TO_TOK 增 `comment → tok-comment`（punctuation 不加——hljs 主力语言 0 命中，核实 M2）；styles.css 补 tok-comment 三块色值（弱化灰）并镜像两个既有 tok 作用域（`.nop-ai-tool-call .tok-*` 与 `[data-slot='ai-bubble-markdown'] .tok-*`，draft review Minor-3）

Exit Criteria:

- [x] phase5 契约测试全绿（804 内）；滚动按钮 pinned 翻转单测（v2-visual-contracts.test.tsx 3 用例）
- [x] 操作条单测（assistant-actions.test.tsx 4 用例：engine 才挂 retry/busy disabled+regenerate 调用/clipboardAdapter 通道/拒绝不假成功）
- [x] tok-comment 映射有单测（渲染 markdown 代码块断言 .tok-comment span）

### Phase 4 - AI e2e 视觉断言 + owner docs 收口

Status: completed
Targets: `tests/e2e/ai-bubble-visual.spec.ts`（新）、design.md/renderers.md、证据卡 ai.md

- Item Types: `Proof | Fix`

- [x] Proof：`ai-bubble-visual.spec.ts` 消费 V0 helper：气泡底色/圆角 L3（getComputedStyleValue）、用户消息右对齐 L2/L3（boundingBox x 比较或 margin-inline-end/auto 计算）、滚动按钮 L1（长会话上滚后可见）+ 点击回底 L1、操作条 L1（copy/retry 可见、流式中 retry disabled）、tok-comment L3（D1 `code` preset 代码块的 comment span 色非继承正文色——依赖 Scope 中 fixture 补注释行）
- [x] Fix：design.md/renderers.md 同步（气泡视觉层契约、操作条默认挂载语义、滚动按钮、tok-comment、光标信号语义）；证据卡 `ai.md` F1-F5 裁决列回写（F1 fixed 本 plan、F2 fixed、F4 fixed[copy/retry]、F5 fixed[+1 token]、F3 缺口转由本 plan 视觉断言覆盖）；F6-F8 deferred 三项以研究报告 A6-A8 裁决登记
- [x] Fix：全量 `tests/e2e/ai-*.spec.ts` 回归——首轮 3 处失败逐一归因修复（①coverage slow connector 首 chunk 即时导致 loading 窗口不可观测——connector 补 900ms 首 chunk 延迟对齐其注释意图；②scroll-pause 用例改动前即空洞通过（两回合内容从未溢出）——spec 收窄面板高度使 scroll-up 真实化并增按钮断言；③KaTeX 计数时机为 bug166 时代产物——改为轮询等待全部段）；复跑 133/133 全绿

Exit Criteria:

- [x] `npx playwright test tests/e2e/ai-bubble-visual.spec.ts` 全绿（1/1）
- [x] 全量 AI 族 spec 回归零新增失败（133/133）
- [x] owner docs（design.md §13.4/renderers.md 树）与证据卡 ai.md（F1-F5 fixed，F6-F8 deferred 登记）回写完成

## Draft Review Record

- Reviewer / Agent: 独立 plan review 审查员（fresh sub-agent session，2026-09-19，一轮）
- Verdict: `pass-with-minors`（0 Blocker / 3 Major / 7 Minor；3 Major 均为当场可钉死的语义裁决，修订后达成零 Blocker/Major）
- Rounds: 1
- Findings addressed: M1——流式信号解析链钉死（显式 prop > context 派生 > `message.loading` fallback，`:152` tools/reasoning/error 门控保持 loading 不动）；M2——playground `code` preset 补注释行进 Scope（tok-comment e2e 观测目标）；M3——retry 仅挂末条 assistant（regenerate 无 per-message 入参）+ standalone 无 ctx 隐藏 retry。Minor 1-7 全部吸收（暗块模板区间 :312-348、表面落 article + fit-content、tok-comment 双作用域镜像、单测 harness 点名、指纹落点与 deps 静态长度、wrapper 方案当场钉死、e2e 预算说明）。

## Closure Gates

- [x] 全部 in-scope 交付落地（Phase 1–4 Exit Criteria 全勾）
- [x] bug 166（in-scope open live defect）已修复并以先红后绿回归钉住；光标可见性交付（路线图 V2 明示项）
- [x] 行为/契约结果已达成：逐 chunk 渐进渲染（编译态实测 + 关闭编译器对照实验）、气泡视觉层/操作条/滚动按钮可交互（ai-bubble-visual spec）
- [x] 必要 focused verification 已完成（单测先红后绿 + ai 族全量回归 133/133）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（F6-F8 deferred 为能力型裁决非 defect，理由在研究报告）
- [x] 受影响 owner docs 已同步：design.md/renderers.md、bugs/166、证据卡 ai.md、roadmap 状态、daily log
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（两轮：首轮 `issues`——0 Blocker / 2 Major 文档真性问题 + 4 Minor；修复后复核 **approved**——0 Blocker / 0 Major / 0 未决 Minor）
- [x] `pnpm typecheck`（40/40）
- [x] `pnpm build`（40/40）
- [x] `pnpm lint`（40/40——CJK aria-label 三处经 i18n 三键收敛后绿）
- [x] `pnpm test`（74/74 tasks；ai 包 805/805；全量 e2e 1481 passed / 0 failed / 2 flaky 重试通过）
- [x] `pnpm check`（全链 exit 0，零新 hit）

## Deferred But Adjudicated

### 图片 lightbox（研究报告 A6）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 图片展示本身无缺陷；lightbox 为新交互能力（dialog/缩放/键盘路径），需独立设计与交互测试
- Successor Required: `no`（后继随产品需求裁决，登记于证据卡）

### 消息时间分组（A7）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 产品信息架构决策（分组粒度/文案），per-bubble 时间戳已可用
- Successor Required: `no`

### 消息进入动画（A8）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 挂载动画与虚拟滚动重挂载相互作用需设计（reduced-motion/窗口位移重放噪声），独立裁决后再做
- Successor Required: `no`

## Non-Blocking Follow-ups

- metadata-only chunk 的指纹扩展（当前终端 dep 已覆盖其渲染切换，无可见缺陷）：若后续出现该类 chunk 驱动的视觉需求再扩展 streamFingerprint。

## Closure

Status Note: 四 Phase 全 completed；独立 closure auditor（fresh session，两轮）实跑 ai 包单测 805/805、两个关键 e2e 各 1/1、既有测试迁移三处核验为真实化/强化非放松、i18n 三键双 locale 核验、边界核验（零保护区变更）、bugs/166≡design.md §13.4≡plan Phase 1 三处机制一致——最终 verdict **approved**。执行期重大发现（React Compiler 冻结 deps-only 信号）已回写 design.md §13.4 与 bugs/166。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session，2026-09-19，两轮）
- Evidence: 首轮 `issues`（Major-1 bugs/166 未回写最终机制、Major-2 全量 e2e full-green 记录静默缺失）→ 修复 → 复核 `approved`；实跑证据：ai 包 805/805、`ai-widgets-fixture` streaming 与 `ai-bubble-visual` 各 1/1、`grep classList pivot`（无关）/ `useEngineContentTick` 2 处在位、`git status` 31 项全落既知文件族。`docs/logs/2026/09-19.md` plan 472 各节含两轮审计记录。

Follow-up:

- no remaining plan-owned work（metadata-only chunk 指纹扩展为已登记 Non-Blocking Follow-up；lightbox/时间分组/进入动画 deferred 已登记于证据卡）
