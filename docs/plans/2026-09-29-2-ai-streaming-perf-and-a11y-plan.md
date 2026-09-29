# 2026-09-29-2 AI 渲染器流式性能与可访问性优化

> Plan Status: active
> Last Reviewed: 2026-09-29
> Source: `docs/analysis/2026-09-29-perf-ux-round2-deep-optimization-analysis.md`（R2-P1、R2-P20-AI 签名、R2-U8/U11/U12/U14）
> Related: 2026-09-28-4（表单 a11y，已收口）

## Purpose

收口 flux-renderers-ai 两个结果面：① 流式输出的 O(n²) markdown 重解析成本（每 chunk 全量 sanitize+parse+highlight）；② 包内遗留 a11y 缺口（copy 反馈、tool-call 关联、sender 超限、token-usage 对比度）。结果面 = 长回答流式渲染成本近线性化 + AI 面对读屏用户可感知。

## Current Baseline

- `ai/src/renderers/ai-bubble/renderers/markdown.tsx:42-67` 每 render 全量 `safeMarkdownSlice` → sanitizeHtml → ReactMarkdown 完整管线；`:249` 每围栏块每轮 lowlight 重高亮；`markdown-buffer.ts:36-60,:111-136` 5 遍 matchAll + Uint8Array mask 每 chunk 重算。
- `use-engine-view.ts:132-144` 内容 tick 驱动 bubble 每 chunk 重渲染。
- `ai-message-list.tsx:123-131` 已有 `@tanstack/react-virtual` 阈值门控（>200 条）——列表虚拟化已收口，bubble 解析未收口。
- `ai-message-list.tsx:72-80,:120` array content 每 chunk O(content) join 签名；`ai-conversations.tsx:88-172` 侧栏未窗口化（量级通常数十）。
- a11y：`assistant-actions.tsx:49-51` copy 成功仅图标互换；`ai-tool-call.tsx:150-173` aria-expanded 无 aria-controls；`ai-sender.tsx:76,:183-201` 超限仅颜色反馈；`ai-token-usage.tsx:112,:114` text-[10px] + muted/70-80 对比风险。
- i18n 键 `flux.common.copied` 已存在（代码块复制路径在用）。
- AI 包测试基线全绿（2026-09-28）。

## Goals

- 流式 markdown 渲染按时间片节流/增量解析：同长度内容不重复解析；长回答流式期间主线程成本从 O(n²) 降为近 O(n)。
- 流式结束/内容最终态渲染结果与逐 chunk 渲染的最终结果一致（等价性）。
- copy/tool-call/sender/token-usage 四处 a11y 缺口全部修复并有断言。

## Non-Goals

- 消息列表虚拟化调整（已收口）、会话侧栏窗口化（LOW，量级小，记 follow-up）。
- markdown 渲染器（ReactMarkdown/低光高亮库）替换。
- AI 引擎（framework-agnostic message engine）协议变更。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/renderers/ai-bubble/**`（markdown 渲染节流/增量）
- `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx`（签名 join）
- `packages/flux-renderers-ai/src/renderers/ai-bubble/assistant-actions.tsx`、`ai-tool-call.tsx`、`ai-sender.tsx`、`ai-token-usage.tsx`（a11y）
- 相关 locale 键（如需新增 copied 类键）

### Out Of Scope

- engine/adapters 协议；其他包。

## Failure Paths

| 可测场景编号 | 触发 | 行为 | 可重试 | 用户可见表现 |
| --- | --- | --- | --- | --- |
| stream-throttle-flush | 流式结束/中断 | 最后一个时间片强制 flush，最终内容完整渲染 | 是 | 尾部内容无缺失 |
| code-fence-split | chunk 边界切在围栏标记中间 | safeMarkdownSlice 语义保持，补全规则不变 | 是 | 无闪烁/错位 |
| copy-announce | 点击复制成功 | aria-label 切换 + polite 公告 copied 键（`flux.ai.copied`，与 ai 包代码块复制路径 markdown.tsx:284 同命名空间） | 是 | SR 播报复制成功 |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**。节流门控、flush 完整性、等价性、四项 a11y 断言全部落单测；不涉及对外 API 契约或鉴权。

## Execution Plan

### Phase 1 - 流式 markdown 节流与成本收敛

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-bubble/`

- Item Types: `Fix`、`Proof`

- [x] MarkdownContentRenderer 增加时间片门控（rAF/timer，~60-100ms），内容长度未跨片不重跑解析管线；流结束/组件即将隐藏强制 flush。**实现约束（React Compiler）**：门控必须 state/scheduler 驱动（useState 或 render 时派生 `streaming ? throttled : raw`）——渲染期 ref 直读门控是 compiler-illegal，会被 eslint-plugin-react-compiler 拒绝；本项不需要 'use no memo'
- [x] 裁定：落地 80ms 时间片节流即达目标（focus 测试实测 30 chunk/窗 burst 仅 ≤2 次新内容解析，flush 一次追平尾部）；稳定块边界增量解析记 optimization candidate（节流已把 O(n²) 压到近 O(n)，增量解析的复杂度收益不再值得 react-markdown 管线改造风险）
- [x] ai-message-list 签名改 messageContentLength（数组逐 part 累加长度，消除每 chunk O(content) join）
- [x] focused 测试：30-chunk burst 解析计数 ≤2、slice flush 追平尾部、流结束无定时器直达最终内容、消息切换（非前缀源）立即吸附（markdown-stream-throttle-and-a11y.test.tsx）
- [x] Proof: ai-bubble 既有用例绿（ai 包 99 文件/838 用例全绿）

Exit Criteria:

- [x] 解析计数测试成立：30-chunk 单窗 burst 新内容解析 ≤2 次（时间片门控），flush 一次追平
- [x] flush/等价性测试成立（流结束直达最终内容 + 消息切换立即吸附）
- [x] ai 包 focused 测试绿（99 文件/838 用例）

### Phase 2 - AI 包 a11y 四项

Status: completed
Targets: `assistant-actions.tsx`、`ai-tool-call.tsx`、`ai-sender.tsx`、`ai-token-usage.tsx`

- Item Types: `Fix`、`Proof`

- [x] copy 成功：aria-label 切换为 copied 键（`flux.ai.copied`）+ sr-only polite span 公告（键已存在于 locale）
- [x] tool-call：args pre 补 useId 实例 id + aria-controls 关联
- [x] sender 超限：Textarea aria-invalid + describedby（useId 实例 id），计数 aria-live="polite"（extension 与主路径两个渲染分支都已覆盖）
- [x] token-usage：text-[10px]→text-xs、/80 与 /70 alpha 全部移除（全值 muted token）
- [x] focused 测试四项断言（copy label 切换+sr-only polite、tool-call aria-controls↔id 配对、sender aria-invalid+describedby+计数 live、token-usage class 断言）
- [x] Proof: ai 包既有用例绿

Exit Criteria:

- [x] 四项 a11y 断言测试各自成立（markdown-stream-throttle-and-a11y.test.tsx Phase 2 describe）
- [x] ai 包 focused 测试绿

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-29）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 3 Minor 全部折入——① copied 键归 `flux.ai.*` 命名空间（flux.common.copied 实为 basic/text 与 content/json-view 在用）；② 节流实现约束写明 state/scheduler 驱动（渲染期 ref 门控 compiler-illegal）；③ 会话侧栏窗口化仅保留 Deferred 一处归属

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复（本 plan 无 live defect，为性能与 a11y 缺口）
- [ ] 所有 in-scope confirmed contract drifts 已收敛（不适用）
- [ ] 行为/契约结果已达成（流式最终态等价、四项 a11y 断言）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline，或明确写明 No owner-doc update required
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 会话侧栏窗口化

- Classification: `optimization candidate`
- Why Not Blocking Closure: 会话列表量级通常数十条，无用户可见卡顿证据
- Successor Required: no
- Successor Path: 无（如未来量级增长按 ai-message-list 模板接入）

## Non-Blocking Follow-ups

- 若 Phase 1 裁定仅节流（不做稳定块边界），增量解析记 optimization candidate 并附实测数据

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待独立审计>>
- Evidence: <<待填>>

Follow-up:

- <<待填或 no remaining plan-owned work>>
