# AI P2 Doc Consistency Remediation

> Plan Status: completed
> Last Reviewed: 2026-07-24
> Source: `docs/components/roadmap-ai.md` Follow-up Backlog (P2 批 — doc rot + cross-ref gaps), `docs/audits/2026-07-24-1757-multi-audit-ai.md`
> Related: `docs/plans/2026-07-24-2300-1-ai-p2-code-and-behavior-remediation.md`（前驱，代码变更先行）

## Purpose

把 `flux-renderers-ai` 包 P2 follow-up backlog 中所有**纯文档**条目收敛到与 live code 一致：消除 phantom 引用、补齐 cross-ref 词条与包列表、订正 doc-code 不匹配标签。本计划不涉及任何代码变更。

## Current Baseline

> 以下 file:line 与 section 标题行已核对（2026-07-24）；部分计数/树形结构需执行时复核。section 级引用以 `renderers.md` 实际标题行行号为准。

### renderers.md / design.md 引用腐化

- **§3.2 phantom `BubbleBoxRendererMatch`**（multi-audit P2）：`renderers.md:119`（§3.2 "渲染器注册制"，标题行 `:116`）展示 `export interface BubbleBoxRendererMatch { ... }`——live code 中**不存在**此接口（`rg "BubbleBoxRendererMatch" packages/flux-renderers-ai/src/` 零命中）。实际存在的是 `BubbleContentRendererMatch`（`ai-bubble/types.ts`）+ `BubbleToolRendererMatch`（同文件）。§3.2 的代码块应改为反映 live 注册制接口。
- **§13 phantom `onScrollTop`**（multi-audit P2）：`renderers.md:563`（§13 "Events 总览"，标题行 `:551`）Events 表 `ai-message-list | onScrollTop | {}`——live code 中 `rg "onScrollTop" packages/flux-renderers-ai/src/` 零命中。该 event 不存在。
- **§1.3 ai-chat DOM `<footer>` 描述**（multi-audit P2）：`renderers.md:43-53`（§1.3 "DOM 结构"）展示 ai-chat 的 DOM 树含 `<footer data-slot="ai-sender">`（`:51`）和 `<footer data-slot="ai-chat-footer">`（`:52`）。live `ai-chat.tsx:327` 确实用 `<footer data-slot="ai-chat-footer">`，但 sender 是否也由 `<footer>` 包裹需核对（live sender 经 region 渲染）。执行时逐行核对 §1.3 DOM 树与 `ai-chat.tsx` 实际输出。
- **§6 目录树漏 6 文件**（multi-audit P2）：design.md §6 的目录树结构图缺少 6 个已存在的文件（执行时核对 `ls -R packages/flux-renderers-ai/src/` 与文档树比对）。
- **§3.3 default renderer 计数**（multi-audit P2）：renderers.md §3.3 "默认 content renderers"（`:139`）的表格列了 5 个默认 renderer（loading/markdown/image/reasoning/tools）——核对 `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/default-renderers.ts` 实际导出数与该表是否一致。
- **§15 data-slot 速查表缺漏**（multi-audit P2）：renderers.md §15 "data-slot 完整速查"（`:655`）是一个 tree 结构，列出 ai-chat-root 下的全部 data-slot。核对 `rg "data-slot=" packages/flux-renderers-ai/src/renderers/` 扫描结果，补入缺失的 slot（审计指出缺 4 个）。

### engine.md doc-code 不匹配

- **createNativeMessageAdapter 标注 "测试用"**（multi-audit P2）：`engine.md:179` 标注 `createNativeMessageAdapter()` 为 "纯 TS，闭包持有 state，测试用"。实际它是**生产默认 + 公共导出**（`index.ts:96` `export { createNativeMessageAdapter }`，是 `ai-chat` 的默认 adapter 创建路径）。标签应订正为生产用途。

### terminology.md 缺 AI 包核心词条

- **无 AI 包核心词条**（multi-audit P2）：`docs/references/terminology.md` 对 `MessageEngine` / `AiConnector` / `ChatMessage` / `MessageStateAdapter` 等 AI 包核心类型零提及（`grep -c` = 0）。这些是 AI 包的公共契约类型，应在术语表中有对应条目。

### AGENTS.md 包列表遗漏

- **AGENTS.md:9 漏 flux-renderers-ai**（multi-audit P2）：`AGENTS.md:9` 包列表枚举了 `flux-renderers-basic` / `-form` / `-form-advanced` / `-data` / `-mobile` / `-content` / `-layout` / `-scheduling`，但**不包含 `flux-renderers-ai`**。

## Goals

- renderers.md §3.2 的注册制代码块反映 live 接口（`BubbleContentRendererMatch` + `BubbleToolRendererMatch`），不再出现 phantom `BubbleBoxRendererMatch`。
- renderers.md §13 Events 表不再出现 phantom `onScrollTop`。
- renderers.md/design.md 其余 line rot（§1.3 / §6 / §3.3 / §15）与 live code 对齐。
- engine.md `createNativeMessageAdapter` 标注订正为生产用途。
- terminology.md 补齐 AI 包核心词条。
- AGENTS.md 包列表补入 `flux-renderers-ai`。

## Non-Goals

- 不做代码变更（纯文档计划）。
- 不重写 design.md 的架构叙事（只修 phantom 引用和计数错误）。
- 不处理代码侧 P2 条目（由 `2026-07-24-2300-1-ai-p2-code-and-behavior-remediation.md` 收口）。
- 不回写已 `completed` 的历史计划。

## Scope

### In Scope

- `docs/components/flux-renderers-ai/renderers.md` — §3.2 / §13 / §1.3 / §3.3 / §15 修正
- `docs/components/flux-renderers-ai/design.md` — §6 目录树 / §1.3 等 line rot
- `docs/components/flux-renderers-ai/engine.md` — `:179` createNativeMessageAdapter 标签
- `docs/references/terminology.md` — 补 AI 包核心词条
- `AGENTS.md` — `:9` 包列表补 flux-renderers-ai

### Out Of Scope

- 代码变更（Plan 1 范围）
- 全仓 raw `<button>` 收敛
- markdown sanitize XSS 组合用例

## Test Strategy

本档选择：`不适用：纯文档计划`

本计划不涉及任何代码变更，仅修改 `docs/` 下文件。Closure Gates 不含 `pnpm test`/`lint`/`typecheck`/`build`。

## Execution Plan

### Phase 1 - renderers.md / design.md 引用腐化清理

Status: completed
Targets: `docs/components/flux-renderers-ai/renderers.md`, `docs/components/flux-renderers-ai/design.md`

- Item Types: `Fix`

- [x] **§3.2 BubbleBoxRendererMatch phantom 清理**（Fix）：`renderers.md:119` 将 phantom `BubbleBoxRendererMatch` 代码块替换为 live 接口（`BubbleContentRendererMatch` + `BubbleToolRendererMatch`，从 `ai-bubble/types.ts` 提取真实签名）
- [x] **§13 onScrollTop phantom 清理**（Fix）：`renderers.md:563` Events 表删除 phantom `onScrollTop` 行（或替换为 live event）；逐行核对 ai-message-list 的实际 events（从 `schemas.ts` AiMessageListSchema 提取）
- [x] **§1.3 ai-chat DOM 核对**（Fix）：核对 `ai-chat.tsx` live 渲染输出与 `renderers.md:43-53`（§1.3 DOM 结构），修正不一致（如 sender 是否由 `<footer>` 包裹等）
- [x] **§6 目录树补齐 6 文件**（Fix）：执行 `ls -R packages/flux-renderers-ai/src/` 与 design.md §6 目录树比对，补入缺失文件
- [x] **§3.3 default renderer 计数核对**（Fix）：核对 `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/default-renderers.ts` 实际导出数，订正 renderers.md §3.3（`:139`）表格
- [x] **§15 data-slot 速查表补齐**（Fix）：执行 `rg "data-slot=" packages/flux-renderers-ai/src/renderers/` 扫描全部 slot，与 renderers.md §15（`:655`）tree 比对，补入缺失项

Exit Criteria:

- [x] `rg "BubbleBoxRendererMatch" docs/components/flux-renderers-ai/` 仅命中 "不存在" 注记（或零命中）
- [x] `rg "onScrollTop" docs/components/flux-renderers-ai/` 零命中（或仅注记）
- [x] design.md §6 目录树与 `ls -R packages/flux-renderers-ai/src/` 一致
- [x] §3.3（`:139`）renderer 表与 `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/default-renderers.ts` 导出一致
- [x] §15（`:655`）data-slot tree 覆盖全部 `rg "data-slot=" packages/flux-renderers-ai/src/renderers/` 扫描结果

### Phase 2 - Cross-ref 文档补齐

Status: completed
Targets: `docs/components/flux-renderers-ai/engine.md`, `docs/references/terminology.md`, `AGENTS.md`

- Item Types: `Fix`

- [x] **engine.md createNativeMessageAdapter 标签订正**（Fix）：`engine.md:179` 将 "纯 TS，闭包持有 state，测试用" 订正为反映其生产默认 + 公共导出身份的描述（如 "纯 TS，闭包持有 state；`ai-chat` 的默认 adapter 创建路径，经 `index.ts` 公共导出"）
- [x] **terminology.md 补 AI 包核心词条**（Fix）：在 `docs/references/terminology.md` 补入 `MessageEngine` / `AiConnector` / `ChatMessage` / `MessageStateAdapter` / `ReactMessageAdapter` 等 AI 包公共契约类型条目（每条含一行定义 + 指向 `engine.md`/`design.md` 的交叉引用）
- [x] **AGENTS.md 包列表补 flux-renderers-ai**（Fix）：`AGENTS.md:9` Renderer packages 枚举中补入 `flux-renderers-ai`（AI 对话渲染器族：消息气泡、流式输出、会话管理、工具调用、HITL 等），与其他 renderer 包格式一致

Exit Criteria:

- [x] `engine.md:179` 不再标 createNativeMessageAdapter 为 "测试用"
- [x] `terminology.md` 含 `MessageEngine`/`AiConnector`/`ChatMessage`/`MessageStateAdapter` 条目
- [x] `AGENTS.md:9` 包列表含 `flux-renderers-ai`

## Draft Review Record

- Reviewer / Agent: independent sub-agent fresh session (round 1 `ses_06b96fe34ffe6ums2SBnwbhCSJ`, round 2 `ses_06b91cad3ffeuqGaPdUFMVBv40`)
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed:
  - R1 [Major] §13.1 不存在 → 改为 §15 "data-slot 完整速查"（`:655`）——body 修正后 R2 发现 Goals/In Scope 残留 §13.1，已修正
  - R1 [Major] §10.3 是错误 section → 改为 §3.3 "默认 content renderers"（`:139`）——body 修正后 R2 发现 Goals/In Scope 残留 §10.3，已修正
  - R1 [Minor] default-renderers.ts 路径补全 → `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/default-renderers.ts`
  - R1 [Minor] §1.3 描述混淆 ai-chat/ai-welcome → 订正为 ai-chat DOM 结构核对
  - R1 [Minor] Current Baseline header 过度声明 → 已限定为 "file:line 与 section 标题行已核对；部分计数/树形结构需执行时复核"
  - R2 残留两个 Major（Goals/In Scope 的 §13.1 + §10.3）已修正；零 Blocker / 零 Major

## Closure Gates

> 纯文档计划，不含 `pnpm test`/`lint`/`typecheck`/`build`。

- [x] renderers.md 无 phantom 引用（BubbleBoxRendererMatch / onScrollTop 等）
- [x] design.md §6 目录树与 live 目录一致
- [x] renderers.md §3.3 renderer 表 + §15 data-slot tree 与 live code 一致
- [x] engine.md createNativeMessageAdapter 标签已订正
- [x] terminology.md 含 AI 包核心词条
- [x] AGENTS.md 包列表含 flux-renderers-ai
- [x] 不存在被静默降级到 deferred 的 in-scope doc drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Deferred But Adjudicated

（暂无。）

## Non-Blocking Follow-ups

- （代码侧 P2 项见 `docs/plans/2026-07-24-2300-1-ai-p2-code-and-behavior-remediation.md`）

## Closure

Status Note: 全部两 Phase 执行完成。Phase 1（renderers.md / design.md phantom 引用清理）于前驱会话完成；Phase 2（engine.md `createNativeMessageAdapter` 标签订正、terminology.md 补 5 个 AI 包核心词条、AGENTS.md 包列表补 `flux-renderers-ai`）于本次会话完成。纯文档计划，无代码变更，Closure Gates 不含 build/test。

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent fresh session `ses_06b36dab8ffeX1zo8dNw0S61jp`
- Verdict: `pass`（8/8 gates）
- Evidence:
  - Gate 1 PASS — `rg "BubbleBoxRendererMatch" docs/components/flux-renderers-ai/` 仅命中 renderers.md:125 的"不存在"注记；`rg "onScrollTop"` 零命中。
  - Gate 2 PASS — design.md §6 目录树（:108-192）与 `ls -R packages/flux-renderers-ai/src/` 一致，含此前缺失的 `error.tsx`/`data-part.tsx`/`timestamp.tsx`。
  - Gate 3 PASS — §3.3 表（renderers.md:172-183）列 8 个默认 renderer 与 `default-renderers.ts` 导出 8 项一致；§15 data-slot tree（:690-767）覆盖全部 live 静态 slot（`host-data-events` 为测试 fixture、`ai-feedback-${action}` 为生成式已注记）。
  - Gate 4 PASS — `rg "测试用" engine.md` 零命中；:179 现为"生产默认 + 公共导出"；核对 `create-engine.ts:61`（default）+ `index.ts:97`（export）属实。
  - Gate 5 PASS — terminology.md（:499-537）含 5 条 AI 词条且定义与 `engine/types.ts` 一致。
  - Gate 6 PASS — AGENTS.md:9 含 `flux-renderers-ai` 描述，格式与其他 renderer 包一致。
  - Gate 7 PASS — "Deferred But Adjudicated" 为空；两 Phase 全部 `[x]` 且 `Status: completed`。
  - Gate 8 PASS — 本独立 fresh-session audit 已执行。

Follow-up:

- 无（代码侧 P2 由 Plan 1 收口）。
