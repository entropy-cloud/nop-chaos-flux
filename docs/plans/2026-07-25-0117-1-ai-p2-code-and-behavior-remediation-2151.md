# 1 flux-renderers-ai P2 Code & Behavior Remediation (2151 audit batch)

> Plan Status: completed
> Last Reviewed: 2026-07-25
> Source: `docs/audits/2026-07-24-2151-multi-audit-ai.md`（P2 批，32 条）+ `docs/audits/2026-07-24-2151-open-audit-ai.md`（N-3..N-8，6 条）
> Related: `docs/components/roadmap-ai.md`（`### Follow-up Backlog (P2 from audits)` → 2151 批次）、`docs/plans/2026-07-25-0044-1-ai-p1-remediation.md`（P1 已收口）、`docs/plans/2026-07-24-2300-1-ai-p2-code-and-behavior-remediation.md`（1757 批 P2 已收口，本计划沿用其模式）

## Purpose

收口 `docs/audits/2026-07-24-2151-*` 两份审计中**需要代码变更**的全部 P2 发现（25 条），使 `@nop-chaos/flux-renderers-ai` 在「交互守卫、错误保真、显示/解析正确性、公共面卫生、渲染生命周期、a11y/i18n、key/正则健壮性」七个面同时收敛。文档一致性（6 条）与测试断言加固（6 条）不在本计划，由后继 `2026-07-25-0117-2-ai-p2-doc-and-test-hardening-2151.md` 收口。

## Current Baseline

> 以下 file:line 均经 live repo 核对（2026-07-25，P1 remediation 落地后）。P1（7 条）已全部修复且有 focused proof；机械门禁全绿（typecheck/lint/test 通过，test 365+ 用例）。

### 交互守卫（silent-drop 家族 — 调用方未预检 isProcessing）

- **ai-sender `commit()` 无 isProcessing 守卫**：`renderers/ai-sender.tsx:60` `function commit(text)` 直接 `setDraft('')` + 派发；内置 Textarea 提交按钮虽在 `:104` `disabled={loading || ...}` 自禁用，但 `commit()` 本身无守卫——host `senderExtensions` 组件若不自禁用，Enter 提交会静默丢 draft（与已修的 P1-1 user-edit 同家族）。
- **ai-attachments 上传按钮流式中不禁用**：`renderers/ai-attachments.tsx:165` `handleUpload()` → `:173` `await ctx.sendMessage(parts)` 无 isProcessing 守卫；上传按钮（`:228`）不随流式禁用 → 多模态消息静默丢弃。
- **ai-tool-call HITL approve/reject 死点击**：`renderers/ai-tool-call.tsx` approve/reject 按钮（`:202/:215`）在 host 未接 `onApproval`（`:40` 可选）时是死点击——无 disabled、无 tooltip，卡片永久 `pending`（`:56`）。

### 错误保真 / 可观测性

- **tool-execution catch 压平 error**：`engine/tool-execution.ts:56-57` `} catch (err) { resultText = err instanceof Error ? err.message : String(err); }` 丢原 Error（stack/cause/自定义字段）——host 无法结构化日志工具失败。
- **pickRenderer 裸 catch 吞 matcher 异常**：`renderers/ai-bubble/index.tsx:221` `} catch {`（无 warn/回调）——host 无法调试自定义 bubble renderer 为何不匹配。

### 显示 / 解析正确性

- **parseCitations 正则误匹配代码块**：`renderers/ai-citations.tsx:219` `parseCitations` 正则 `/\[(\d+(?:\s*,\s*\d+)*)\]/g` 匹配代码块内的 `array[0]`/`[N]`；`byIndex`（`:41`）1-based → index 0 渲染空 "No source" 卡片。
- **markdown-buffer fence 计数混**：`renderers/ai-bubble/markdown-buffer.ts:62-75` `findUnclosedFenceCutoff` 混 ` ``` `/`~~~` 分隔符，误数代码块内嵌 fence（CommonMark: ``` 不能被 ~~~ 关闭）。
- **highlightJson token 正则失配**（N-8）：`renderers/ai-tool-call.tsx:330-348` `highlightJson` 先 `escapeHtml(pretty)`（`:339`）再用 `/(&quot;...)/g` 注入 span；正则 `[^&]` 一遇 `&` 即停，含 `&`/`<`/`>`/`"` 的字符串 token 无法整段匹配 → 高亮缺失/断片（**非 XSS**，内容已先 escape）。

### 公共 API 面（calibration：零 host 消费者）

- **`MaybePromise as AiMaybePromise` 死公共别名**：`index.ts:84`——零消费者，异常 `Ai` 前缀（无其它 AI 类型带此前缀）。
- **MessageStateAdapter aux 类型未再导出**：`index.ts:99` 导出 `MessageStateAdapter` 但其 aux 类型 `InternalMessageState`/`PublicMessageState`（`engine/types.ts`）未再导出——host 无法注解自定义 adapter 而不深 import。
- **引擎内部函数泄漏公共面**：`index.ts:92` `combineDeltaData, generateMessageId`、`:93` `measureContentLength` 超出 `design.md §6.1` Group 3，零 `apps/` 消费者——冻结内部细节为 public API。

### 渲染器契约 polish

- **7 个 dead field-metadata**：`ai-renderer-definitions.ts:65`（`conversationId`）、`:71`（`onSend`）、`:90`（`itemRegion`）、`:107`（`avatarRegion`）、`:147`（`menuItems`）、`:284`（`trigger`）（审计另记 sender `actions`）——schema 编辑器广告不可用 region/event。
- **3 处 dispatch 缺 `void` 前缀**：`ai-tool-call.tsx:267-269`、`ai-citations.tsx:100-101`、`ai-suggestions.tsx:154-155`——floating-promise 风险（其余 11 个 AI 渲染器均带 `void`）。

### React-19 生命周期 churn（非正确性）

- **ai-chat 每渲染重建 `componentHandle`**：`renderers/ai-chat.tsx:155` `createAiComponentHandle({...})` 非 memo → register effect（`:160-163`，deps 含 `componentHandle`）每个流式 chunk 重跑 register/unregister。
- **ai-chat 每渲染重建 `actionProvider`**：`renderers/ai-chat.tsx:142` `createAiActionProvider({...})` 非 memo → `useNamespaceRegistration`（`:145`）每个 chunk 重订阅。
- **ai-chat 每渲染新建 `hostScopeData` 字面量**：`renderers/ai-chat.tsx:215` `const hostScopeData = { ... }` → `useHostScope`（`:220`）`useLayoutEffect` 每个 chunk 重 fire `scope.replace`。
- （注：AiChatProvider context value 已由 1757 批 P2 在 `:274` `useMemo` 稳定，不在本计划。）

### a11y / i18n 缺口

- **ai-sender `<Textarea>` 仅 placeholder**：`renderers/ai-sender.tsx:154`（实际 `<Textarea>` 元素，placeholder 在 `:157`）无 `aria-label`/`<Label>`（placeholder 非可访问名；WCAG 1.3.1/4.1.2）。
- **ai-conversations rename `<Input>` 无 aria-label**：`renderers/ai-conversations.tsx:67-81` 有 `data-slot`/`autoFocus` 但无 `aria-label`（同文件按钮 `:100` 均带）。
- **ai-tool-call aria-label 只含 tool name**：`renderers/ai-tool-call.tsx:133` `aria-label={t('flux.ai.toolCall', { name })}` 不含 status——status 仅视觉传达（`StatusIcon` 均 `aria-hidden`）。
- **N-3 PROMPTS_DEFAULT_LABEL 死导出 + 模块加载期 `t()`**：`renderers/ai-prompts.tsx:96` `export const PROMPTS_DEFAULT_LABEL = t('flux.ai.placeholder')`——零消费者；模块顶层求值 `t()` 在 `initFluxI18n` 之前被 import 即冻结错误译文。
- **N-7 ai-feedback emoji aria-label + 硬编码英文**：`renderers/ai-feedback.tsx:86-91` `case 'like': return '👍'`（`:86-89`）/ `case 'sources': return 'Sources'`（`:90-91`）——like/dislike 可见 label 与 aria-label 均为 emoji，`sources` 未走 `t()`。

### key / 正则 / 遮蔽健壮性

- **N-4 mention query 正则含 `\s`**：`rich-text/extensions/mention.ts:27` `new RegExp(\`${MENTION_TRIGGER}([\\w\\s.-]*)$\`)`字符类含`\s`，与紧邻注释「no whitespace」矛盾 → 候选框可跨空格常驻。
- **N-5 user-edit onChange 形参遮蔽引擎别名 `e`**：`renderers/ai-bubble/user-edit.tsx:42` `const e: MessageEngine = engine`；`:84` `onChange={(e) => setDraft(e.target.value)}` 形参遮蔽引擎别名（当前无 bug，误用伏笔）。
- **N-6 ai-suggestions 用 `item.text` 作 key**：`renderers/ai-suggestions.tsx:97,118` `key={item.text}`——重复文案即碰撞（连 index 都没附）。
- **ai-prompts key 仍带 index 后缀**：`renderers/ai-prompts.tsx:49,52` `stableKey = (label ...) + '#${index}'`——重排/插入仍丢元素身份（remount）。低频（静态推荐列表），但与 N-6 同家族。

## Goals

- 三处 silent-drop 调用方（sender commit、attachments upload、tool-call HITL）在 isProcessing / 无 handler 时不再静默丢数据或留死点击。
- tool-execution 与 pickRenderer 不再压平/吞错误，host 可结构化观测。
- parseCitations 不误匹配代码块、不渲染空 index 卡片；markdown-buffer fence 与 highlightJson 正则对含特殊字符内容正确。
- 公共面移除零消费者死别名与泄漏的引擎内部函数；MessageStateAdapter 的 aux 类型可被 host 注解。
- 7 个 dead field-metadata 移除；3 处 dispatch 补 `void` 前缀。
- ai-chat 的 componentHandle / actionProvider / hostScopeData 引用稳定，流式期间不再每 chunk 重订阅/重 fire。
- 5 处 a11y/i18n 缺口收敛（aria-label、模块顶层 `t()`、emoji label、硬编码英文）。
- 4 处 key/正则/遮蔽健壮性收敛。

## Non-Goals

- 不改 `MessageEngine` 公共方法签名（`sendMessage`/`abort`/`regenerate`/`setMessages`/`getMessages` 不变）。
- 不改渲染器 schema 字段（`AiChatSchema`/`AiAttachmentsSchema` 等不变）。
- 不处理文档一致性条目（design.md §74/§13.1、terminology.md、useMessage 注记、onResponseComplete 契约盲区、§11.5 editing 归属）——由 `2026-07-25-0117-2` 收口。
- 不处理测试断言加固（ai-token-usage clamp、safeMarkdownSlice wiring、toolExecutor 转发、Timestamp、hitl-no-handler、Markdown XSS 回归）——由 `2026-07-25-0117-2` 收口。
- 不重构 markdown sanitize 管线（`sanitize→rehypeRaw` XSS 实证属后继 plan，非本计划）。
- 不把编辑态从组件 useState 迁到引擎（design.md §11.5 归属冲突由 Plan 2 文档裁定；引擎无 editing-state setter，迁移动作高风险，超出 P2 polish 范围）。
- 不处理 F3.1 残留 6 处手写 `useMemo`/`useCallback`（已带 justification 注释，审计裁定为 watch-only periodic re-review）。
- 不调整 `create-engine.ts` 超 537 行规模（单一 owner，不可报告）。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/renderers/ai-sender.tsx` — commit 守卫
- `packages/flux-renderers-ai/src/renderers/ai-attachments.tsx` — upload 守卫 + 按钮 disabled
- `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx` — HITL dead-click + aria-label status + void 前缀 + highlightJson 正则
- `packages/flux-renderers-ai/src/engine/tool-execution.ts` — error 保真
- `packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx` — pickRenderer warn
- `packages/flux-renderers-ai/src/renderers/ai-citations.tsx` — parseCitations 正则 + void 前缀
- `packages/flux-renderers-ai/src/renderers/ai-bubble/markdown-buffer.ts` — fence 计数
- `packages/flux-renderers-ai/src/index.ts` — 公共面清理
- `packages/flux-renderers-ai/src/ai-renderer-definitions.ts` — dead field-metadata
- `packages/flux-renderers-ai/src/renderers/ai-suggestions.tsx` — key + void 前缀
- `packages/flux-renderers-ai/src/renderers/ai-chat.tsx` — lifecycle 三件套 memoize
- `packages/flux-renderers-ai/src/renderers/ai-conversations.tsx` — rename Input aria-label
- `packages/flux-renderers-ai/src/renderers/ai-prompts.tsx` — PROMPTS_DEFAULT_LABEL + key
- `packages/flux-renderers-ai/src/renderers/ai-feedback.tsx` — emoji/hardcoded i18n
- `packages/flux-renderers-ai/src/rich-text/extensions/mention.ts` — 正则 \s
- `packages/flux-renderers-ai/src/renderers/ai-bubble/user-edit.tsx` — 形参遮蔽
- 对应 `__tests__/` 下新增/增强的 focused proof

### Out Of Scope

- 文档一致性 + 测试断言加固（见 Plan 2）
- markdown sanitize XSS 实证（watch-only residual，后继）
- 编辑态迁引擎（高风险，超 P2 范围）
- F3.1 残留 memo（watch-only）

## Failure Paths

| 场景编号                    | 触发                                                        | 预期行为                                                 | 可重试           | 用户可见表现                         |
| --------------------------- | ----------------------------------------------------------- | -------------------------------------------------------- | ---------------- | ------------------------------------ |
| `sender-commit-stream`      | 流式中 host senderExtensions 组件触发 commit                | commit 被 isProcessing 守卫拦截，draft 保留              | 否（等流式结束） | 不静默丢字；输入保留                 |
| `attachments-upload-stream` | 流式中点上传按钮                                            | 按钮禁用；handleUpload 不调 sendMessage                  | 否（等流式结束） | 按钮禁用态；多模态消息不静默丢弃     |
| `hitl-no-handler`           | approval pending 但 host 未接 onApproval，点 approve/reject | 按钮禁用 + tooltip 提示；不派发空 event；卡片状态不变    | host 接入后      | 无死点击；明确「未配置审批」反馈     |
| `tool-error-flattened`      | 工具执行抛带 cause/自定义字段 Error                         | resultText 保留原 Error（或附 cause），host 可结构化日志 | 否               | 工具卡片显示错误原因（含结构化信息） |
| `citation-in-codeblock`     | markdown 代码块内含 `[0]`/`array[0]`                        | 不被解析为引用；index 0 不渲染空卡片                     | 否               | 代码块原样显示，无误触发引用气泡     |
| `highlight-special-chars`   | JSON 字符串值含 `&`/`<`/`>`/`"`                             | token 整段落入 `tok-str` span，高亮不断片                | 否               | JSON 高亮完整                        |

## Test Strategy

本档选择：**建议有测**

理由：25 条均为已确认 P2（非鉴权、非对外公共 API 契约变更），但多条命中 silent-drop / 错误保真 / 解析正确性家族——行为类 Fix 必须配走通修复路径的 focused regression proof；lifecycle/a11y/公共面清理以 typecheck + 既有测试零回归 + 静态断言为主。XSS 回归不属本计划（Plan 2）。

## Execution Plan

> 六条 Workstream 落点互不重叠，可并行。WS1–WS6 文件不耦合（仅 ai-tool-call 在 WS1/WS2/WS3/WS5 各触及不同函数，执行时按函数边界串行即可）。

### Workstream 1 - 交互守卫与错误保真扫荡

Status: completed
Targets: `renderers/ai-sender.tsx`, `renderers/ai-attachments.tsx`, `renderers/ai-tool-call.tsx`(HITL), `engine/tool-execution.ts`, `renderers/ai-bubble/index.tsx`

- Item Types: `Fix | Proof`

- [x] [Fix] `ai-sender.tsx:60` `commit()` 入口加 `if (ctx?.isProcessing) return;`（与 P1-1 user-edit 守卫对称；保留 draft、不清空）。内置 Textarea 按钮 `:104` 已自禁用，此处补 host extension 路径。
- [x] [Fix] `ai-attachments.tsx`：上传按钮（`:228`）`disabled={ctx?.isProcessing || ...}`；`handleUpload()`（`:165`）入口加 `if (ctx?.isProcessing) return;` 守卫。
- [x] [Fix] `ai-tool-call.tsx` HITL：approve/reject 按钮（`:202/:215`）在 `!onApproval`（props 未接，`:40`）时 `disabled` + `title`/Tooltip 提示「未配置审批处理器」；不改变 approval 状态机（engine 仍只持状态）。
- [x] [Fix] `tool-execution.ts:56-57`：catch 内保留原 Error——`resultText` 仍取可读 message，但把原 Error 透传到 tool result 的 error 结构（如 `{ error: message, cause: err }` 或在 ToolResult 上附 `errorCause`），不压平为裸 string。核对 `ToolResult` 类型是否需扩字段（若公共类型则按 Non-Goals 不改签名，改在内部 result 上附 cause）。
- [x] [Fix] `ai-bubble/index.tsx:221` pickRenderer 裸 `catch {}` 改为 `catch (err) { console.warn('[ai-bubble] custom matcher threw', err); }`（或经 props.events 回调，若已有 onError 通道则复用）。
- [x] [Proof] 新增/增强：sender-commit-stream（流式中调 commit → draft 保留、不调 sendMessage）；attachments-upload-stream（按钮禁用 + handleUpload 早返回）；hitl-no-handler（按钮 disabled、不派发 event、approval 仍 pending）三条 focused proof。
- [x] [Proof] tool-error-flattened：在 `engine-tool-loop.test.ts` 增用例——工具抛带 `cause` 的 Error → 断言 result 保留原 Error（非裸 message string）。

Exit Criteria:

> 只写本 Workstream 真正交付的可观测结果 + 保证后续 Workstream 能继续的局部检查。

- [x] `commit()` / `handleUpload()` 有 isProcessing 早返回；attachments 上传按钮随流式禁用。
- [x] HITL 按钮在无 onApproval 时 disabled + 提示，无死点击。
- [x] tool-execution 不再压平原 Error；pickRenderer 不再静默吞 matcher 异常。
- [x] 4 条 focused proof 走通修复路径，`pnpm --filter @nop-chaos/flux-renderers-ai test` 局部通过。

### Workstream 2 - 显示与解析正确性

Status: completed
Targets: `renderers/ai-citations.tsx`, `renderers/ai-bubble/markdown-buffer.ts`, `renderers/ai-tool-call.tsx`(highlightJson)

- Item Types: `Fix | Proof`

- [x] [Fix] `ai-citations.tsx:219` `parseCitations`：解析前剥离 inline/backtick 代码 span（如先按 `` ` `` 与 ` ``` ` 分段，仅对非代码段跑正则）；`byIndex` 查找（`:121`）对 index 0 或越界返回 undefined 时渲染空（不渲染 "No source" 占位卡），或确认 sources 1-based 与文案一致。
- [x] [Fix] `markdown-buffer.ts:62-75` `findUnclosedFenceCutoff`：fence 计数按 delimiter 种类独立计数（```与 ~~~ 不能互关）；核对现有`markdown-buffer.test.ts:30-48` 的 ~~~ 用例并补「代码块内嵌异种 fence 不误关」用例。
- [x] [Fix] `ai-tool-call.tsx:330-348` `highlightJson`：改为「escape 前在原文定位 token 边界，escape 后按偏移注入 span」，或放宽正则以消化 `&amp;`/`&lt;` 等实体（保证含 `&`/`<`/`>`/`"` 的字符串整段落入 `tok-str`）。保留先 escape 防 XSS 的不变量。
- [x] [Proof] citation-in-codeblock：`ai-citations` 测试增「代码块内 `[0]`/`array[0]` 不触发引用」「index 0/越界不渲染空卡片」。
- [x] [Proof] highlight-special-chars：`ai-tool-call` 测试增「JSON 字符串值含 `&`/`<`/`>`/`"` 时整段高亮」。

Exit Criteria:

- [x] parseCitations 不误匹配代码块内 `[N]`；index 0/越界不渲染空卡片。
- [x] fence 计数对异种分隔符正确；highlightJson 对含特殊字符字符串整段高亮。
- [x] 3 条 focused proof 落地，局部 test 通过。

### Workstream 3 - 公共面与渲染器契约卫生

Status: completed
Targets: `index.ts`, `ai-renderer-definitions.ts`, `renderers/ai-tool-call.tsx`(void), `renderers/ai-citations.tsx`(void), `renderers/ai-suggestions.tsx`(void)

- Item Types: `Fix | Proof`

- [x] [Fix] `index.ts:84` 移除 `MaybePromise as AiMaybePromise` 死别名（确认 `rg AiMaybePromise` 全仓零消费）。
- [x] [Fix] `index.ts:92-93` 移除 `combineDeltaData`/`generateMessageId`/`measureContentLength` 公共导出（确认 `apps/` 零消费；包内改为相对 import；若测试 import 则改测 import 路径）。保留 `design.md §6.1` Group 3 既定公共集。
- [x] [Fix] `index.ts:99` 补 `InternalMessageState`/`PublicMessageState` 再导出（或文档注记为 internal-only——若裁定 extension 点不需要，则在 design.md 注记，移入 Plan 2）。本计划默认再导出（host 可注解自定义 adapter）。
- [x] [Fix] `ai-renderer-definitions.ts` 移除 7 个 dead field-metadata：`:65` `conversationId`、`:71` `onSend`、`:90` `itemRegion`、`:107` `avatarRegion`、`:147` `menuItems`、`:284` `trigger`（+ 审计另记 sender `actions`，逐条核对渲染器是否真消费再删）。
- [x] [Fix] 3 处 dispatch 补 `void` 前缀：`ai-tool-call.tsx:267-269`、`ai-citations.tsx:100-101`、`ai-suggestions.tsx:154-155`（与其余 11 渲染器 `void props.events.xxx?.(...)` 一致）。
- [x] [Proof] 静态断言：`rg AiMaybePromise` 零命中；`apps/` 无对已移除导出的 import（typecheck 即捕获）；dead field-metadata 移除后渲染器行为零回归（既有 renderer 测试全绿）。

Exit Criteria:

- [x] `AiMaybePromise` 零命中；`combineDeltaData`/`generateMessageId`/`measureContentLength` 不在公共导出。
- [x] MessageStateAdapter aux 类型可从包入口注解（或显式裁定 internal 并注记）。
- [x] 7 个 dead field-metadata 移除；3 处 dispatch 带 `void`。
- [x] `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` + `test` 通过。

### Workstream 4 - React-19 生命周期稳定化

Status: completed
Targets: `renderers/ai-chat.tsx`

- Item Types: `Fix | Proof`

- [x] [Fix] `ai-chat.tsx:155` `componentHandle` 经 `useMemo` 稳定（deps 含其引用的稳定值；若依赖 engine/controller 则 memo deps 对齐，保证 hook 顺序无条件——early return 之前）。参照同文件 `:274` chatContextValue 已用 useMemo 的模式。
- [x] [Fix] `ai-chat.tsx:142` `actionProvider` 经 `useMemo` 稳定（deps 对齐 engine/conversationController）。
- [x] [Fix] `ai-chat.tsx:215` `hostScopeData` 经 `useMemo` 稳定（deps 含其字段值）。
- [x] [Proof] 增「相同输入下引用稳定」断言：渲染两次（相同 engine/state）→ componentHandle/actionProvider/hostScopeData 引用相等（`expect(a).toBe(b)`）。或用 register/unregister 调用计数断言（流式 chunk 间不重复 register）。

Exit Criteria:

- [x] componentHandle / actionProvider / hostScopeData 引用在相同输入下稳定。
- [x] `react-hooks/exhaustive-deps` lint 通过；hook 顺序无条件。
- [x] `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` + `lint` + `test` 通过。

### Workstream 5 - a11y 与 i18n 收敛

Status: completed
Targets: `renderers/ai-sender.tsx`, `renderers/ai-conversations.tsx`, `renderers/ai-tool-call.tsx`(aria-label), `renderers/ai-prompts.tsx`, `renderers/ai-feedback.tsx`

- Item Types: `Fix | Proof`

- [x] [Fix] `ai-sender.tsx:154` `<Textarea>` 加 `aria-label={t('flux.ai.placeholder')}`（或 `<Label>` 关联；与 placeholder `:157` 复用同一 i18n key 或新增 `flux.ai.messageInput`）。
- [x] [Fix] `ai-conversations.tsx:67-81` rename `<Input>` 加 `aria-label={t('flux.ai.renameConversation')}`（与同文件 rename 按钮 `:100` 复用 key）。
- [x] [Fix] `ai-tool-call.tsx:133` aria-label 含 status：`aria-label={t('flux.ai.toolCall', { name, status: t(\`flux.ai.toolStatus.${status}\`) })}`（或拼接 status 文案；保证 StatusIcon 视觉信息对 SR 可达）。
- [x] [Fix] `ai-prompts.tsx:96` 移除 `PROMPTS_DEFAULT_LABEL` 死导出（零消费者）；其值改由消费方在渲染期 `t('flux.ai.placeholder')` 取。
- [x] [Fix] `ai-feedback.tsx:86-91`：补 `flux.ai.like`/`flux.ai.dislike`/`flux.ai.sources` i18n key；`labelFor` 的 like/dislike/sources 走 `t()`（aria-label 与可见 label 均用文案，非裸 emoji）。
- [x] [Proof] a11y 断言：Textarea/Input 渲染 `aria-label` 非空；ai-tool-call aria-label 含 status 文案；ai-feedback like/dislike aria-label 非 emoji 字面量。新增对应 i18n key 到 locale 文件。

Exit Criteria:

- [x] ai-sender Textarea、ai-conversations rename Input 有非空 aria-label。
- [x] ai-tool-call aria-label 含 status；ai-feedback like/dislike/sources 走 i18n。
- [x] PROMPTS_DEFAULT_LABEL 死导出移除；模块顶层无 `t()` 求值。
- [x] 局部 typecheck + test 通过。

### Workstream 6 - key / 正则 / 遮蔽健壮性

Status: completed
Targets: `renderers/ai-prompts.tsx`(key), `rich-text/extensions/mention.ts`, `renderers/ai-bubble/user-edit.tsx`, `renderers/ai-suggestions.tsx`

- Item Types: `Fix | Proof`

- [x] [Fix] `ai-suggestions.tsx:97,118` `key={item.text}` 改为稳定业务 id（`item.id` 若有）或退化 `text#index`（至少避免完全相同 key 碰撞）。
- [x] [Fix] `ai-prompts.tsx:49,52` `stableKey` 去掉 `#${index}` 后缀，改用纯内容派生 key（`label`+`badge`），或附稳定 `id`；核对 prompts 列表是否有稳定 id 字段。
- [x] [Fix] `mention.ts:27` 正则字符类移除 `\s`（兑现「no whitespace」注释）；候选框不再跨空格常驻。同步 `filterMentions` 行为。
- [x] [Fix] `user-edit.tsx:84` `onChange` 形参改名 `ev`（消除对引擎别名 `e`（`:42`）的遮蔽）。
- [x] [Proof] ai-suggestions：两条相同文案建议项各自唯一 key（不断言碰撞告警）；mention：`@foo bar` 敲空格后候选框关闭（query 不含空格）；user-edit：typecheck 确认无遮蔽。

Exit Criteria:

- [x] ai-suggestions / ai-prompts key 不再因重复文案/重排碰撞。
- [x] mention 正则不含 `\s`；user-edit 无形参遮蔽。
- [x] 局部 typecheck + test 通过。

## Draft Review Record

> 起草后、执行前的独立审查证据（见本 guide `Plan Review Rule`）。由独立 fresh-session 子 agent 填写。

- Reviewer / Agent: independent fresh-session general sub-agent (`ses_06adb5972ffetfaDsqI1HLrur8`)，独立复核未复用起草者上下文
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: zero Blocker、zero Major → 第 1 轮即达成共识。18 项 file:line 抽查全部经 live code 核对确认（无「声称开放实则已修」的假阳性）；覆盖核对：25 条 code/behavior P2 全覆盖、6 条 doc/test 项正确排除到 Plan 2、F3.1 watch-only 分类正确；oversplit 评估：1 plan + 6 workstream 对 25 条符合 Rules 22–26（同包/同审计批/同 closure surface）。Minor（已处理）：ai-sender Textarea 行号 `:128`（实为 prop 透传）校正为实际元素 `:154`；ai-feedback sources 行范围 `:86-87` 扩至 `:86-91`；ai-citations `:219`（parseCitations 头）/markdown-buffer `:62-75`（函数体）/index.tsx `:85→86` 为邻近行精度漂移，不影响判定；ai-tool-call 跨 4 WS 已注明按函数边界串行执行。

## Closure Gates

> 行为/契约结果类计划。全量 `pnpm typecheck/build/lint/test` 在此跑一次（非每个 Workstream 默认项，见 Minimum Rule 18）。

- [x] 25 条代码类 P2 在 live code 上全部修复，file:line 证据可核。
- [x] 行为类 Fix（silent-drop 守卫、error 保真、解析正确性）各配走通修复路径的 focused proof。
- [x] FP 表六个场景（sender-commit-stream / attachments-upload-stream / hitl-no-handler / tool-error-flattened / citation-in-codeblock / highlight-special-chars）均有对应 proof 覆盖。
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract drift。
- [x] owner docs 同步：本计划不改公共 API 签名（仅移除零消费者死导出/泄漏内部函数）；若触及 `design.md §6.1` 公共导出分组则同步；否则不写「No update required」凑条目。文档一致性项由 Plan 2 收口。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### F3.1 残留 6 处手写 useMemo/useCallback

- Classification: `watch-only residual`
- Why Not Blocking Closure: 审计（multi-audit P2 React-19/lifecycle）明确「each now carrying a justification comment; style drift; periodic re-review only」——非正确性问题，已有 justification 注释，且其中数处（tiptap exhaustive-deps ×3、context value、branch callback、storage reporter）经复核确属 React 19 下合理保留。降级为 watch-only 符合 Anti-Slacking Rule（已附 non-blocking 理由）。
- Successor Required: `no`
- Successor Path: —（periodic re-review，非独立 plan）

## Non-Blocking Follow-ups

- markdown `sanitize→rehypeRaw` 组合 XSS 实证：下一轮 open-audit / Plan 2 测试加固切入点（非本 plan owned）。
- 编辑态从组件 useState 迁引擎（design.md §11.5 归属冲突的高风险解）：超出 P2 polish 范围；Plan 2 先以文档裁定对齐，迁移留待未来增强计划。
- 文档一致性（6 条）+ 测试断言加固（6 条）由 `2026-07-25-0117-2-ai-p2-doc-and-test-hardening-2151.md` 收口。

## Closure

Status Note: 25 条代码/行为类 P2 全部修复（WS1–WS6 全绿）。行为类 Fix 各配 focused proof（sender-commit-stream / attachments-upload-stream / hitl-no-handler / tool-error-flattened / citation-in-codeblock / highlight-special-chars 六场景 + a11y/i18n + lifecycle 稳定 + key/regex/shadow）。全量 `pnpm typecheck/build/lint/test` 通过（flux-renderers-ai 局部 53 文件 433 用例 + workspace 全 58 task 全绿）。`roadmap-ai.md` 2151 批 25 条全部标 ✅；剩余 12 条（文档一致性 6 + 测试断言加固 6）由 Plan 2 收口。

Closure Audit Evidence:

- Auditor / Agent: independent fresh-session closure auditor (this session) — fresh context, did NOT reuse the executor's session; the executor's own self-audit was not used to tick the closure-audit gate
- Evidence:
  - 语义复核（对照 live `packages/flux-renderers-ai/src/`）：6 个 Workstream 的 Exit Criteria 全部重新核对 live code——WS1 silent-drop 守卫（`ai-sender.tsx:68` `if (ctx?.isProcessing) return;`、`ai-attachments.tsx:170` 守卫 + `:233` 按钮 disabled、`ai-tool-call.tsx:193/211/226` HITL noHandler disabled+title）、`tool-execution.ts:61-71` error fidelity（`toolError` 透传原 Error）、`ai-bubble/index.tsx:221` pickRenderer `catch(err)+console.warn`；WS2 `ai-citations.tsx` parseCitations code-span 剥离（`stripCitationsInsideCode` + index>0 过滤）、`markdown-buffer.ts:70-92` 按 backtick/tilde 独立计数、`ai-tool-call.tsx:372-468` highlightJson tokenize-then-escape；WS3 `rg AiMaybePromise`=0、`apps/` 无已移除导出、`index.ts:99-100` aux 类型再导出、dead field-metadata 已删、3 处 `void` 前缀；WS4 `ai-chat.tsx:147/168/235` 三件套 `useMemo`；WS5 5 处 aria-label/i18n（`ai-sender.tsx:166`、`ai-conversations.tsx:70`、`ai-tool-call.tsx:133`、`ai-prompts.tsx` 无 `PROMPTS_DEFAULT_LABEL`、`ai-feedback.tsx:87/89/91` t()）；WS6 `ai-suggestions.tsx:100/121` key=`text#index`、`mention.ts:30` 正则无 `\s`、`user-edit.tsx:84` 形参 `ev`。全部已落地且在 runtime 接线（无空体/`return null` 占位/swallowed exception）。
  - 作为审计者重新跑了全量仓库验证：`pnpm typecheck` 58/58、`pnpm build` 31/31、`pnpm lint` 31/31（仅 flux-renderers-scheduling 1 个与本计划无关的 warning）、`pnpm test` 58/58；`pnpm --filter @nop-chaos/flux-renderers-ai test` 53 文件 / 433 用例 / 0 失败——full-green verification 成立。
  - Deferred 诚实性：F3.1 残留 memo 分类为 watch-only 并附 non-blocking 理由，诚实；markdown sanitize XSS 实证与编辑态迁引擎明确 out-of-scope 且有 successor 归属（Plan 2 / 未来增强），无 in-scope live defect 被偷塞进 follow-up。
  - `plan-check.mjs --strict` 通过（exit 0）。
  - `docs/logs/2026/07-25.md` 已存在（docs sync 落点）。
  - `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` 通过（无错误）
  - `pnpm --filter @nop-chaos/flux-renderers-ai lint` 通过（无错误）
  - `pnpm --filter @nop-chaos/flux-renderers-ai test -- --run` 通过（53 文件 / 433 用例 / 0 失败）
  - `pnpm typecheck` 全 workspace 通过（58 task 全绿）
  - `pnpm build` 全 workspace 通过（58 task 全绿）
  - `pnpm lint` 全 workspace 通过（31 task 全绿）
  - `pnpm test` 全 workspace 通过（58 task 全绿，full-green verification）
  - 新增/增强 focused proof：
    - `src/renderers/__tests__/ai-silent-drop-guards.test.tsx`（sender-commit-stream + attachments-upload-stream）
    - `src/renderers/__tests__/ai-tool-call-hitl.test.tsx`（hitl-no-handler 加固 + focus-trap 测试改 noopHandler 以隔离 disabled-state 与 focus-trap 两个 concern）
    - `src/engine/__tests__/engine-tool-loop.test.ts`（tool-error-flattened 两条用例）
    - `src/renderers/__tests__/ai-citations.test.tsx`（citation-in-codeblock 七条用例）
    - `src/renderers/ai-bubble/__tests__/markdown-buffer.test.ts`（CommonMark 异种 fence 四条用例）
    - `src/renderers/ai-bubble/__tests__/tool-call-and-content.test.tsx`（highlight-special-chars 四条用例 + XSS regression 加固）
    - `src/renderers/__tests__/p2-a11y-i18n.test.tsx`（a11y/i18n 五个 surface 断言）
    - `src/renderers/__tests__/ai-suggestions.test.tsx`（N-6 key 唯一性）
    - `src/rich-text/__tests__/mention-regex.test.ts`（N-4 regex 无 `\s`）
    - `src/renderers/__tests__/ai-chat-lifecycle-stability.test.tsx`（WS4 hostScopeData 引用稳定）

Follow-up:

- markdown `sanitize→rehypeRaw` 组合 XSS 实证：下一轮 open-audit / Plan 2 测试加固切入点（非本 plan owned）。
- 编辑态从组件 useState 迁引擎（design.md §11.5 归属冲突的高风险解）：超出 P2 polish 范围；Plan 2 先以文档裁定对齐，迁移留待未来增强计划。
- 文档一致性（6 条）+ 测试断言加固（剩余 5 条）由 `2026-07-25-0117-2-ai-p2-doc-and-test-hardening-2151.md` 收口。
- （closure-audit 已由独立 fresh-session 子 agent 完成并勾选 `Closure Gates` 第 6 项；本节无剩余 plan-owned audit debt。）
