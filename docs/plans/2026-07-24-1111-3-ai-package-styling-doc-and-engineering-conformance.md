# {3} flux-renderers-ai Styling/UI Conformance, Doc-Code Reconciliation & Engineering Quality

> Plan Status: active
> Last Reviewed: 2026-07-24
> Source: `docs/audits/2026-07-23-2141-open-audit-ai.md` (F3.1, F3.3\*, F3.4-obs, F3.5-obs), `docs/audits/2026-07-23-2141-multi-audit-ai.md` (AI-05, AI-07, AI-13, AI-14, AI-15, AI-16, AI-17, AI-18(bubble-renderer half), AI-21, AI-22, AI-25, AI-26, AI-27, AI-29, AI-30, AI-31, AI-32, AI-33, AI-34)
> Related: Plan {1}（engine tier，含 AI-18 engine-half 与 F3.3 docstring 同文件 owner）、Plan {2}（renderer tier）；AI-18 跨两层——engine 模块（state-adapter/plugins）归 Plan {1}，bubble renderers（error/loading/text.tsx + `extractLastUserText` 死代码）归本计划。
> Execution Order: 3 — 与 Plan {1}/{2} 无强依赖，可并行推进；但触及 Plan {1}/{2} 所改文件时按文件错峰落盘以避免冲突。

## Purpose

把 `flux-renderers-ai` 收口到「符合仓库 styling/UI/doc/test-quality 约定」的状态：消除硬编码调色板/布局 utility 与 raw `<button>`、marker 纯净化、`data-testid` 一致透传、owner-doc 与 live tree 对齐、API 导出面与字段清单诚实、测试结构与 module-top 泄漏治理、过手写 memoization 收敛。

## Current Baseline

- 6 个 renderer 用 raw `<button>`（AI-17），另有 1 处 sr-only raw `<button>`（AI-30）；同包 `ai-voice-input`/`ai-feedback` 已正确用 `<Button>`。
- `ai-tool-call.tsx` 硬编码 `text-green-600`/`amber-600`（AI-14）+ `highlightJson` 经 `dangerouslySetInnerHTML` 注入硬编码 palette（AI-15）；仓库已有 `--success`/`--warning` token 且兄弟包已用 `text-success`。
- `ai-chat.tsx` fallback 硬编码 `p-4`/`text-sm`、`ai-message-list.tsx` root 硬编码 `min-h-0 flex-1 overflow-auto`（AI-16，layout renderer 不应硬编码 layout utility）。
- `styles.css` 的 `.nop-ai-voice-input-wave > span` 与 `.nop-ai-sender-tiptap-content` 带隐式视觉规则（AI-29，marker 不纯）。
- 3 个 View（AiBubbleView/AiMessageListView/AiSenderView）happy-path 丢 `props.meta.testid`（AI-13），与同包 AiCitationsView/AiTokenUsageView 不一致。
- doc-code drift：`design.md §6` 目录树列了不存在的 `tool.tsx`、漏 5 个真实文件（AI-05）；`engine.md` 已在 Plan {1} 处理（AI-06/AI-20）；`roadmap-ai.md` 误称包"尚未创建"+14 渲染器"尚未实现"（AI-07）、表格列数不一致（AI-21）；`design.md §2/§3/§4`+`roadmap-ai.md:225` 残留 `ResponseProvider` 旧称（AI-22，实际全仓零该符号）；`design.md §20` header 指错（AI-33）；`renderers.md §11c`/§11b 编号倒序（AI-34）。
- `tiptap-sender.tsx` 500 行混 3 个展示子组件（AI-25）；`index.ts` 在 "registry registration only" 注释下泄露 engine internals（AI-26）；`ai-renderer-definitions.ts` `fields[]` 缺 7 个已文档化字段（AI-27）。
- 25 处手写 `useMemo`/`useCallback`（F3.1），与 React Compiler 基线及同包 `use-message.ts:58-60` docstring 矛盾。
- `ai-namespace.test.tsx` 445 行混 3 关注点 + unmount 测试用 stub-register（tautological）（AI-31）；`ai-test-support.tsx:57` module-top `export let capturedActionScope`，reset helper 零调用（AI-32）。

## Goals

- styling 契约：硬编码 palette → 语义 token（AI-14/AI-15）；layout renderer 不硬编码 layout utility（AI-16）；marker 纯净化（AI-29）。
- UI 契约：6+1 处 raw `<button>` → `<Button>`（AI-17/AI-30）；3 个 View 一致透传 `data-testid`（AI-13）。
- doc 一致：`design.md §6` tree、`roadmap-ai.md` baseline/表格/旧称、`design.md §20`、`renderers.md` 编号与 live 一致（AI-05/AI-07/AI-21/AI-22/AI-33/AI-34）。
- API/字段诚实：`index.ts` 导出分组清晰（AI-26）；`fields[]` 补 7 字段（AI-27）。
- 工程质量：`tiptap-sender.tsx` 拆分（AI-25）；`ai-namespace.test.tsx` 拆 3 文件 + 真实 registry unmount 断言（AI-31）；`ai-test-support.tsx` module-top `let` 治理（AI-32）；25 处手写 memoization 收敛（F3.1）；`extractLastUserText` 死代码裁定（retry Button 可达）+ error/loading/text.tsx 直接单测（AI-18 bubble-renderer half）。

## Non-Goals

- 不动 engine/adapters 内部实现与 renderer 资源/事件/Decision-A 契约（归 Plan {1}/{2}）。
- 不收敛全仓 raw `<button>`（F3.4，observation，归独立全仓任务）。
- 不把 markdown sanitize 当确认 XSS 漏洞修（F3.5，Dim 15 security CLEAN）；仅作非阻塞加固。

## Scope

### In Scope

- styling：`ai-tool-call.tsx`、`styles.css`、`ai-chat.tsx`(fallback)、`ai-message-list.tsx`(root utility)。
- UI：`ai-prompts.tsx`、`ai-conversations.tsx`、`ai-suggestions.tsx`、`ai-bubble/renderers/reasoning.tsx`、`ai-token-usage.tsx`、`ai-citations.tsx`、`rich-text/tiptap-sender.tsx`(sr-only button)、`ai-bubble/index.tsx`、`ai-message-list.tsx`、`ai-sender.tsx`(testid)。
- docs：`docs/components/flux-renderers-ai/design.md`(§2/§3/§4/§6/§20)、`renderers.md`、`docs/components/roadmap-ai.md`。
- 工程：`src/index.ts`、`ai-renderer-definitions.ts`、`rich-text/tiptap-sender.tsx`(拆分)、`renderers/__tests__/ai-namespace.test.tsx`、`ai-bubble/renderers/{error,loading,text}.tsx`、`ai-test-support.tsx`、25 处 memoization。

### Out Of Scope

- engine/adapters 文件内部实现 —— Plan {1}。
- renderer 资源/事件/projection 契约 —— Plan {2}。
- F3.4 全仓 raw `<button>` 收敛、F3.5 markdown XSS（非确认）。

## Failure Paths

> 不适用：本计划为样式/UI/doc/工程治理，无运行时错误契约或鉴权/外部集成路径。`index.ts` 导出调整需保证无现有导入断裂（typecheck 兜底）。

## Test Strategy

档位选择：**建议有测**。

理由：多为静态 conformance/doc/重构，风险由 lint + typecheck + 既有测试兜底；`ai-namespace.test.tsx` 拆分与真实 registry 断言需补 proof。docs 子项不适用（纯文档，无行为变更）。

## Execution Plan

### Phase 1 - Styling 与 UI 组件 conformance

Status: planned
Targets: `ai-tool-call.tsx`、`styles.css`、`ai-chat.tsx`、`ai-message-list.tsx`、6+1 处 raw `<button>`、3 个 View testid

- Item Types: `Fix`

- [ ] **Fix** AI-14：`ai-tool-call.tsx` `text-green-600 dark:text-green-500`→`text-success`、`amber`→`text-warning`、`border-green-500/40`→`border-success/40` 等（对照 `flux-renderers-content/alert-renderer.tsx`）。
- [ ] **Fix** AI-15：`highlightJson` 改为发语义类名（`tok-key`/`tok-str`/`tok-num`，在 `styles.css` 经 CSS var 定义）或 tokenize 为 React 元素；保留 escape-first（XSS-safe）。
- [ ] **Fix** AI-16：`ai-message-list.tsx` root 的 `min-h-0 flex-1 overflow-auto` 移入 `styles.css` `.nop-ai-message-list`（或暴露 `bodyClassName` slot）；`ai-chat.tsx` fallback `p-4 text-sm` 同理处理。
- [ ] **Fix** AI-29：`styles.css` `.nop-ai-voice-input-wave > span`、`.nop-ai-sender-tiptap-content` 改用非 `nop-` 前缀视觉钩子或 `[data-slot]` 选择器，保持 marker 纯净。
- [ ] **Fix** AI-17：6 处 raw `<button>` → `<Button variant=...>`（ai-prompts/ai-conversations/ai-suggestions/reasoning/ai-citations）。`ai-token-usage.tsx` 用多态 `Tag = onClick ? 'button' : 'div'`（`:86`），非交互 `div` 分支不套 `<Button>`，仅交互分支迁移。
- [ ] **Fix** AI-30：`tiptap-sender.tsx:467-473` sr-only raw `<button>` → `<Button variant="ghost" size="sm" aria-label="Close suggestions" className="sr-only" tabIndex={-1} />`。
- [ ] **Fix** AI-13：`AiBubbleView`/`AiMessageListView`/`AiSenderView` props 加 `testid?`，renderer 透传 `props.meta.testid`，root 渲染 `data-testid={testid||undefined}`（对照 AiCitationsView）。

Exit Criteria:

- [ ] `rg "text-green-|text-amber-|bg-green-|bg-amber-|border-green-|border-amber-" packages/flux-renderers-ai/src` 返回 0 匹配（palette 已 token 化）。
- [ ] `rg "<button" packages/flux-renderers-ai/src` 返回 0 匹配（已知豁免：`ai-token-usage.tsx` 多态 `<Tag>` 的非交互分支；`ai-test-support.tsx` 测试支持文件）。
- [ ] 3 个 View root 在 happy-path 渲染 `data-testid`（既有测试或新增断言可证）。
- [ ] 局部 typecheck + lint 绿。

### Phase 2 - Doc-code 对账

Status: planned
Targets: `design.md`、`renderers.md`、`roadmap-ai.md`

- Item Types: `Fix`（纯文档）

- [ ] **Fix** AI-05：`design.md §6` 目录树按 live `src/renderers/ai-bubble/renderers/` 重生成（删 `tool.tsx`，加 `data-part.tsx`/`error.tsx`/`timestamp.tsx`/`markdown-buffer.ts`/`user-edit.tsx`）。
- [ ] **Fix** AI-07：`roadmap-ai.md` 「未实现（代码阶段）」改为「已完成」或删除；`line 48` 行数 621→676 或删计数。
- [ ] **Fix** AI-21：`roadmap-ai.md:152-169` 表格列数一致（5 列或补 6 列 header 并填齐）。
- [ ] **Fix** AI-22：`design.md §2/§3/§4` + `roadmap-ai.md:225` `ResponseProvider`→`AiConnector`（对照 `engine.md §9.1`）。
- [ ] **Fix** AI-33：`design.md` header §20 指针改为「见 implementation.md §4」或调整 §20。
- [ ] **Fix** AI-34：`renderers.md` §11c/§11b 顺序连续化或各自升顶级。

Exit Criteria:

- [ ] 6 处 doc 与 live 一致（`rg "ResponseProvider"` 包 docs 返回 0；`design.md §6` tree 与 `ls` 一致；表格列数一致；编号连续）。

### Phase 3 - API/字段诚实 + 测试与工程治理

Status: planned
Targets: `src/index.ts`、`ai-renderer-definitions.ts`、`rich-text/tiptap-sender.tsx`、`renderers/__tests__/`、`ai-test-support.tsx`、25 处 memoization

- Item Types: `Fix` → `Proof`

- [ ] **Fix** AI-26：`src/index.ts` 重组为清晰分组（"Host utilities" 仅含 `design.md §6.1` sanctioned；renderer helpers 移 `./utils` 或删）；修正 "registry registration only" 注释。
- [ ] **Fix** AI-27：`ai-renderer-definitions.ts` ai-chat `fields[]` 补 `engine`/`tools`/`toolExecutor`/`maxToolRounds`/`componentId`/`componentName`/`conversationId` 7 项 `{key,kind:'prop'}`。
- [ ] **Fix** AI-25：`tiptap-sender.tsx`（500 行）抽 `TemplateBar`/`SuggestionPopup`/`TiptapSenderSurface` 到 `rich-text/components/`。
- [ ] **Fix** AI-32：`ai-test-support.tsx:58` module-top `export let capturedActionScope`——在 mount probe 的测试 `afterEach` 调 `resetCapturedActionScope()`，或删除未用 `let`；扩展 scanner `isTestFile` 含 `**/test-support.{ts,tsx}`。
- [ ] **Fix** F3.1：收敛 25 处手写 `useMemo`/`useCallback`（`use-conversation.ts` 10、`ai-attachments.tsx` 9、`ai-chat.tsx` 3、`use-auto-scroll.ts` 3、`tiptap-sender.tsx` 3）——按 React Compiler 基线移除无 profiling 证据者；`use-conversation.ts:62` 用 `useMemo` 伪 ref 改真 ref。
- [ ] **Fix + Proof** AI-31：`ai-namespace.test.tsx` 拆为 action-provider/namespace-integration/component-handle 3 文件；unmount 测试改真实断言（`unmount()` 后 `registry.resolve({componentId})` 返回 `undefined`）。
- [ ] **Fix + Proof** AI-18（bubble-renderer half）：`error.tsx:46-49` `extractLastUserText` 始终返回 `''`（死代码）→ retry Button（`error.tsx:25` `{lastUserText ? <Button>... : null}`）永远不渲染（确认 live defect）。裁定实现（抽取最后一条 user 消息文本）或移除死代码使 retry 可达；补 `error.tsx`/`loading.tsx`/`text.tsx` 直接单测。

Exit Criteria:

- [ ] `index.ts` 分组注释与实际导出一致；`fields[]` 含 7 字段（grep 可证）。
- [ ] `tiptap-sender.tsx` < 500 行（或拆出子组件可证）。
- [ ] `ai-namespace` 拆 3 文件且真实 registry unmount 断言绿；`ai-test-support.tsx` 无未治理 module-top `let`。
- [ ] AI-18（bubble-renderer half）已修：`extractLastUserText` 死代码裁定落地（retry Button 可达或死代码移除），error/loading/text.tsx 直接单测绿。
- [ ] 手写 memoization 收敛后局部 typecheck/test/lint 绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent, fresh session（round 1 ses_06de1d6d5ffeJOro9Q55rh6mUZ、round 2 ses_06ddb2355ffeE8g3a1h1jFhwyM）
- Verdict: `pass-with-minors`（R1 `revised`（1 Major）→ 修订 → R2 pass-with-minors，零 Blocker 零 Major，consensus yes）
- Rounds: 2
- Findings addressed:
  - R1 Major M-1：AI-18 bubble-renderer half（`error.tsx:46-49` `extractLastUserText` 恒返回 `''` → retry Button `:25` 永不渲染，确认 live defect）跨三计划 dropped。修订：加入本计划 Phase 3 为 `Fix + Proof`（非 Follow-up，符合 Anti-Slacking），并补入 Source/Goals/Exit Criteria/Closure Gates；engine-half 仍归 Plan {1}。R2 已 live 核对死代码成立。
  - R1 Minors：Phase 1 Exit grep 补 `border-green-|border-amber-` 并注明 `ai-token-usage.tsx` 多态 `<Tag>` 与 `ai-test-support.tsx` 豁免；AI-17 注明 `ai-token-usage` 的 `Tag = onClick?'button':'div'`；`ai-test-support.tsx:57`→`:58`。
  - R2 Minor（未阻塞）：Phase 1 grep 未含 `text-purple-|text-blue-`，但 AI-15 的 `highlightJson` 重写可由函数检查验证，cosmetic。

## Closure Gates

- [ ] AI-13/14/15/16/17/29/30 已修（styling/UI conformance）。
- [ ] AI-05/07/21/22/33/34 已修（doc-code 一致）。
- [ ] AI-25/26/27/31/32 + F3.1 + AI-18(bubble-renderer half) 已修（工程治理）。
- [ ] 不存在被静默降级到 deferred 的 in-scope 治理项（注：F3.4/F3.5 为 observation/非确认，显式归 Non-Blocking）。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### F3.4 全仓 raw `<button>` 收敛

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 经审计核对，`flux-renderers-content`/`-form`/`-form-advanced`/`-data`/`-layout` 均普遍存在原生 `<button>`，本包非离群；属全仓既有实践，应作独立全仓收敛任务，不归本 mission 的单点修复。本计划只收口包内 AI-17/AI-30 的可机械迁移项。
- Successor Required: yes
- Successor Path: 独立全仓 raw-`<button>` 收敛任务（待建）。

### F3.5 markdown sanitize 嵌套/属性分裂 XSS 用例

- Classification: `watch-only residual`
- Why Not Blocking Closure: multi-audit Dim 15 security CLEAN——DOMPurify 正确接入、`<script>`/`onerror` 基本载荷已有 XSS gate（`renderers.test.tsx:61-71`）。非确认漏洞；仅建议补嵌套/属性分裂组合用例作加固。
- Successor Required: no
- Successor Path: （可选）在 `renderers/__tests__/` 补 XSS 组合用例。

## Non-Blocking Follow-ups

- F3.5（见上）作为可选加固。
- scanner `isTestFile` 扩展（AI-32 子项）若涉及跨包规则，可后续提为仓库级 lint 治理。

## Closure

Status Note: <<关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<pending>>
- Evidence: <<pending>>

Follow-up:

- <<关闭时填写>>
