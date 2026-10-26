# 770 AD-2 AI 只读会话面板与取点上下文（AI Debugger Copilot）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/ai-debugger-copilot-roadmap.md` AD-2 work item；owner doc `docs/architecture/nop-debugger-ai.md`（AI tab seam / connector 注入 / 工具面安全裁定，plan 768）；plan 769（AD-1 工具层已落地）；用户指令 2026-10-27（执行路线图至完成）
> Related: `docs/plans/768-ad0-boundary-and-contract-plan.md`（completed）、`docs/plans/769-ad1-readonly-tool-adapter-plan.md`（completed）

## Purpose

落地 AD-2：①`nop-debugger` 增加 AI 无关的通用面板 tab 扩展 seam（宿主注册、`x-` 前缀、懒挂载、默认关闭零加载）；②`nop-debugger-ai` 增加 `./panel` React 子入口：AI tab 会话面（复用 flux-renderers-ai 消息引擎与视图/工具卡片）、prompt 构建与注入断言（数据不当指令）、取点上下文卡片（有界+脱敏+注入对话）、空态/错误/重试/停止、i18n/a11y。

## Current Baseline（2026-10-27 live 核对）

- plan 768/769 已收口：owner doc 五项裁定在案；`@nop-chaos/nop-debugger-ai` 根入口（框架无关）提供 `createDebuggerAiTools` 10 工具只读白名单；nop-debugger 零 AI 依赖边界测试在案。
- `panel.tsx:451` 硬编码四内建 tab（overview/timeline/network/node）；`NopDebuggerTab`（`types.ts:45`）四值；`snapshot.activeTab: NopDebuggerTab`；`store.setActiveTab` / `controller.setActiveTab(tab: NopDebuggerTab)`。
- 面板 inspect 选择态（`use-inspect-mode.ts` 的 `inspectData: NopComponentInspectResult | null`）是 panel.tsx 局部状态；`inspectData` 含 formState/scopeData 敏感面。
- flux-renderers-ai 已导出会话面全套：`createMessageEngine`、`AiChatProvider`（`AiChatContextValue`：engine/messages/requestState/isProcessing/sendMessage/abortRequest）、`AiMessageListView`（emptyNode/自动滚动/虚拟化）、`AiSenderView`（submitType/loading/onCancel/IME 守卫）、`AiToolCallView`、`useMessage`；工具卡片由 bubble 按 `state.toolCall` 渲染。
- 引擎 `CreateMessageEngineOptions` 支持 `systemPrompt` / `tools` / `toolExecutor`；`ChatMessageContentPart` 有 `data-${string}` 变体（P1 宿主定义内容块）。
- flux-i18n 公开 `addResources(lng, ns, resources)`（deep merge）；`t('flux.debugger.*')` 键集中在 `packages/flux-i18n/src/locales/{zh-CN,en-US}.ts` 的 `debugger` 块（en-US.ts:718 起）；`check:i18n-keys` 静态扫描 packages 与 apps 的 `t('flux.*')` 字面量并要求键存在于 locale 文件（测试文件豁免）——**运行时 addResources 的键也必须落 locale 文件**。
- `check:oversized-code-files`：700 行硬门禁（现有 5 个注册豁免：xlang.parser.js、form-runtime-owner.ts、node-compiler.ts、两个 locale 文件——本计划 Phase 2 恰好编辑其中两个豁免文件），新文件须守线。

## Goals

- seam：`controller.registerPanelTab(descriptor)` / 注销返回函数；`NopDebuggerExtensionTabId = \`x-${string}\``；面板渲染内建 + 注册 tab，扩展内容仅激活时挂载；面板向 descriptor 提供 `{ controller, getInspectSelection }` 上下文。
- 会话面：`x-ai` tab 由 `createAiDebuggerExtension({ controller, connector })` 注册；引擎（tools=AD-1、toolExecutor、systemPrompt）单例存活于 tab 重挂载；空态/停止/错误横幅/重试；工具卡片沿用 bubble 渲染。
- 取点上下文：发送时读取 `getInspectSelection()`，构建**有界+脱敏**的节点上下文卡（身份+meta 摘要，同 inspect_node 允许字段纪律），以 `data-node-context` 内容部件进入消息——**绝不拼入任何 text 部件或 system prompt**。
- 注入断言（必须自动化）：上下文数据仅存在于 `data-*` 部件；system prompt 含数据不当指令条款；含指令样文本的上下文值不得出现在任何 text/system 内容中。
- i18n：`flux.debugger.ai.*` 键落 flux-i18n 两个 locale（既有 debugger chrome 同模式），zh-CN/en-US 双语；交互元素 aria-label 全覆盖。

## Non-Goals

- 不做 `propose_schema_patch` 与任何写工具（AD-3）。
- 不做候选预览/采纳/回滚（AD-4）。
- 不接 playground（AD-6；本计划的"宿主"仅以测试 fake 呈现）。
- 不改 automation API 语义；不加新工具。
- 不做多会话/持久化/会话管理（single-session；ai-conversations 属可选未来）。

## Scope

### In Scope

- `packages/nop-debugger/src/{types.ts,controller.ts,store.ts,panel.tsx,panel/ai-tab-seam*}`：tab 注册 seam + 面板渲染 + 类型扩展 + seam 单测/面板测试（`store.ts` 无条件在列：`store.ts:18/:192` 的 setActiveTab/activeTab 必须随放宽）
- `packages/nop-debugger-ai/`：package.json（react peer、ui dep、`./panel` subpath）、`src/panel/`（extension factory、prompt builder、context card、session 组件）、根入口 re-export extension 类型、判别性测试
- `packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`：`debugger.ai.*` 键块
- `vite.workspace-alias.ts`：`./panel` 子路径别名
- owner doc：Current Code Anchors 补 seam/panel 锚点；AI Panel Tab Extension Seam 节按落地契约精确化（仅锚点与既有裁定一致化，不新增裁定）
- `docs/logs/2026/10-27.md`、roadmap §4 AD-2 行状态推进

### Out Of Scope

- flux-renderers-ai 引擎/视图改动；nop-debugger automation 语义；playground 页面；e2e（AD-6）

## Failure Paths

| 场景                | 触发                            | 行为                                                         | 可重试           | 用户可见           |
| ------------------- | ------------------------------- | ------------------------------------------------------------ | ---------------- | ------------------ |
| 非 `x-` 前缀 tab id | 宿主注册 `id: 'ai'`             | `registerPanelTab` 抛错并拒绝注册（开发期立即暴露）          | 是               | 无（错误注册被拒） |
| 重复 id             | 两次注册 `x-ai`                 | 后者抛错拒绝，先注册者保持                                   | 是               | 无                 |
| 未配置 connector    | 宿主未注入 AiConnector          | tab 可注册但发送被禁用 + 空态提示"未连接模型"                | 是（宿主补配置） | 空态提示           |
| 请求失败            | connector throw / 网络          | 引擎 lastError → 错误横幅 + 重试按钮（重发最后一条用户消息） | 是               | 横幅 + 重试        |
| 停止                | 用户点停止                      | `engine.abort()`；aborted 终态由既有 AbortedNote 呈现        | 是               | 停止生效           |
| 上下文过大          | inspect 选择携带大 propsSummary | 上下文卡字段级截断（字符上限）+ 脱敏后才进入 data 部件       | 是               | 卡片显示截断       |

## Test Strategy

本档选择：`必须自动化`（严于 roadmap §7 对 AD-2 的 `应有测试` 底线：§4 AD-2 行与 Round 2 共识审查记录将 prompt 注入断言划归 AD-2，故注入断言按必须自动化先行；其余 UI 行为按应有测试同 PR 覆盖）。判别机制点名：注入断言在"上下文拼进 text 部件"的旧实现下必挂（断言=含指令样文本的上下文值不出现在任何 text/system 内容且仅出现于 data 部件）；零加载/默认关闭断言在"静态注册"旧实现下必挂（未注册时面板无 AI tab、nop-debugger 源零 AI 包引用——既有 ai-boundary 测试续管）。

## Execution Plan

### Phase 1 - nop-debugger 通用 tab seam

Status: completed
Targets: `packages/nop-debugger/src/{types.ts,controller.ts,panel.tsx,panel/ai-tab-seam.ts(新)}`

- Item Types: `Fix`（seam 落地）

- [x] 类型：`NopDebuggerExtensionTabId`（模板字面量 `x-${string}`）、`NopDebuggerAnyTab`、`NopDebuggerPanelTabDescriptor { id, label, render(ctx) }`、`NopDebuggerPanelTabContext { controller, getInspectSelection(): NopComponentInspectResult | null }`。放宽面共六处：`types.ts:149`（snapshot.activeTab）、`types.ts:450`（controller.setActiveTab）、`store.ts:18`（store 接口）、`store.ts:192`（实现）、`controller.ts:354`、`panel.tsx:447`（cast 改 AnyTab）；**window-facing `NopDebuggerAutomationApi.setActiveTab`（`types.ts:399`）与 `automation.ts:78` 保持内建四值不动**（裁定：window/模型面向的 automation API 只控内建 tab，扩展 tab 激活属面板内部面——contravariance 下加宽后的 controller 实现天然可赋给未加宽的 automation 输入接口）。descriptor.label 为注册期静态字符串，语言切换后由宿主重注册（合同一句话写入 seam 测试注释）
- [x] controller：`registerPanelTab(descriptor): () => void`；`x-` 前缀校验（违规抛错）；重复 id 拒绝；注册/注销通知面板重渲染（registry 不入事件 snapshot，独立 listener 集）
- [x] panel.tsx：内建四 tab 后追加注册 tab；扩展内容仅激活时调用 `render(ctx)`；ctx.getInspectSelection 读面板 inspect 选择态
- [x] Proof：seam 判别性测试——x- 前缀强制（'ai' 拒绝）、重复 id 抛错、注销后 tab 消失、扩展内容仅激活挂载（未激活零渲染）、内建四 tab 行为回归不变

Exit Criteria:

- [x] seam 测试全绿；nop-debugger 既有面板测试套件无回归（内建 tab 路径不变）；零 AI 包引用（ai-boundary 测试续绿）；`automation.setActiveTab` 内建四值契约由类型面直接成立（不加宽）

### Phase 2 - AI 扩展（会话面 + 取点上下文 + 注入断言）

Status: completed
Targets: `packages/nop-debugger-ai/`（package.json、`src/panel/*`、根入口类型 re-export）、`packages/flux-i18n/src/locales/*`、`vite.workspace-alias.ts`

- Item Types: `Proof`（注入断言先行）+ `Fix`（实现）

- [x] 先红：注入断言测试——`buildDebuggerAiMessages(userText, context)` 产出的消息中：上下文值（含 `'ignore previous instructions'` 样指令文本）仅出现于 `data-node-context` 部件，不出现在任何 text 部件/system prompt；system prompt 含数据不当指令条款断言；上下文为 null 时无 data 部件
- [x] 先红：上下文卡有界性测试——context builder 走 inspect_node 同款允许字段纪律（六敏感面整体缺席）+ redactData + 字段级字符截断
- [x] 实现 prompt builder + context builder（`src/panel/prompt.ts`）
- [x] locale：`debugger.ai.*` 键（zh-CN/en-US；tabLabel/emptyHint/connectHint/stop/retry/errorBanner/contextTitle/contextNone/sendPlaceholder 等最小集），交互元素 aria-label 全接 i18n
- [x] extension factory（`src/panel/extension.tsx`）：`createAiDebuggerExtension({ controller, connector })`——注册 `x-ai` tab、engine 单例（module 级 per-controller Map：tools+executor+systemPrompt+connector），返回 `{ dispose }`（注销 tab、清 engine）。i18n 键只落 locale 文件（check:i18n-keys 静态扫描要求），factory 不做 addResources 第二真相源
- [x] session 组件（`src/panel/session.tsx`）：AiChatProvider 包裹 + AiMessageListView（emptyNode 空态/未连接提示）+ AiSenderView（onCancel→abort、loading）+ 错误横幅与重试（lastError→重发最后一条用户消息）+ 取点上下文卡展示（发送前所见即所得）
- [x] package.json：react peerDep、`@nop-chaos/ui` + `@nop-chaos/flux-i18n` dep、`./panel` exports + alias；根入口保持框架无关（不 import react）
- [x] 后绿：extension 生命周期测试（注册/注销/dispose 清理）、会话行为测试（happy-dom + mock connector：发送→助手回复、停止、错误→重试）、根入口零 react 引用断言（文本扫描）

Exit Criteria:

- [x] 注入断言先红证据在案、实现后全绿；新包测试全绿；`check:i18n-keys` exit 0；`check:oversized-code-files` 零新增（新文件 <700 行）

执行期门禁发现与处置（同 Phase 收口）：

- [x] React 绑定契约：缺省 native adapter 触发 useSyncExternalStore 渲染循环（use-engine-view.ts 文档化的既有约束）——engine 改用 `createReactMessageAdapter`
- [x] scanner-baselines：session 三处 `void promise` UI handler 形态 +3/+2 超基线——改为显式 `.catch(() => undefined)`（engine 以 state.lastError 承载失败、横幅渲染，拒绝通道刻意惰性），计数自然回落 349/792，无需注册
- [x] knip：`@nop-chaos/ui` 声明未消费（重试按钮为原生元素）——删除依赖
- [x] lint 未用 import 清理（NopDebuggerTab 移出 controller.ts、fireEvent/AiSessionTab 移出测试文件）

### Phase 3 - owner doc 锚点与全量验证

Status: completed
Targets: `docs/architecture/nop-debugger-ai.md`、`docs/logs/2026/10-27.md`

- Item Types: `Follow-up`（owner doc）+ `Proof`（全量验证）

- [x] owner doc：Current Code Anchors 补 seam/panel 锚点；AI Panel Tab Extension Seam 节补两句落地契约（context 对象、注册校验），与既有裁定一致化
- [x] daily log 记录

Exit Criteria:

- [x] owner doc 锚点经 anchor 门禁；全量验证归 Closure Gates

## Draft Review Record

- Reviewer / Agent: agent_cefa3f1e（独立 fresh session）
- Verdict: `pass-with-minors`（Round 1 `revised`：3 Major——oversized 豁免计数 3→5、activeTab 放宽面六处枚举 + automation.ts 保持内建四值的 window-API 裁定、i18n 双真相源删除 + flux-i18n dep 补齐；Round 2 复核 0 Blocker / 0 Major，共识达成）
- Rounds: 2
- Findings addressed: M1/M2/M3 全部按 round-2 复核确认落地；Minor——m1 测试档引用修正、m2 重复 id 统一为抛错、m3 seam 测试标 Proof、m4 label 注册期字符串合同、m5 扫描面措辞、m6（采用 planned 措辞）

## Closure Gates

- [x] seam + 会话面 + 取点上下文 + 注入断言全部落地且判别性测试在案
- [x] AI 能力默认关闭、未注册零挂载（面板测试证明）；nop-debugger 零 AI 包引用（ai-boundary 续绿）
- [x] i18n 双语键落地且 `check:i18n-keys` exit 0；a11y 交互元素 aria-label 覆盖
- [x] 无被静默降级的 in-scope live defect 或 contract drift
- [x] owner doc 锚点与 seam 契约一致化（live 基线变化已反映）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck` exit 0
- [x] `pnpm build` exit 0
- [x] `pnpm lint` exit 0
- [x] `pnpm test` exit 0（nop-debugger 146/146、nop-debugger-ai 36/36、全包绿）
- [x] `pnpm check` exit 0

## Deferred But Adjudicated

（无——执行中改判须当场落节。）

## Non-Blocking Follow-ups

- 会话持久化/多会话（ai-conversations 集成）：single-session 为 v1 裁定，持久化属优化候选。
- 上下文卡的"关键表达式"列：取自 authoringContract 的表达式摘要在 v1 仅在允许字段内随 metaSummary 呈现，独立表达式提取器属优化候选（AD-5 联调后按需评估）。

## Closure

Status Note: AD-2 交付完整：nop-debugger 通用 tab seam（x- 前缀强制/重复拒绝/懒挂载/inspect 上下文移交；window automation 保持内建四值）+ nop-debugger-ai `./panel` AI 会话扩展（engine 单例 + createReactMessageAdapter、注入断言 8 tests 先红后绿、取点上下文卡有界脱敏、空态/停止/错误/重试、双语 i18n、根入口 react-free 文本断言）；执行期门禁处置四项（adapter 渲染循环、scanner catch 通道回落 349/792、knip ui dep 删除、未用 import 清理）。typecheck/build/lint/test/check 全 exit 0。

Closure Audit Evidence:

- Auditor / Agent: agent_87bec29b（独立 fresh session）
- Evidence: closure audit `approved`（0 Blocker / 0 Major / 3 Minor）——独立复跑 nop-debugger-ai 36/36、nop-debugger 146/146、anchor/scanner/i18n 门禁 exit 0、五项全仓门禁 exit 0；Minor m1（In-Scope"根入口 re-export extension 类型"与实际 `./panel` 子路径交付的措辞漂移）、m2（label 合同句落点在 types.ts/extension.tsx 而非测试注释）、m3（无效 useMemo）——m3 已随本 commit 修复（36/36 复绿），m1/m2 记录为 plan 文本漂移备注。

Follow-up:

- no remaining plan-owned work（`propose_schema_patch` 与 apply/revert seam 归 AD-3，候选预览/采纳/回滚归 AD-4）。
