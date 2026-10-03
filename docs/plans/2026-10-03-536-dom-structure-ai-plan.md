# 536 flux-renderers-ai 渲染器 DOM 结构契约审计与整改

> Plan Status: completed
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（DOM 结构契约）、`docs/backlog/dom-structure-audit-roadmap.md`（W9）、`docs/audits/dom-structure-checklist.md`
> Related: `docs/plans/2026-10-03-527-dom-marker-shared-infra-plan.md`（前置）

## Purpose

把 flux-renderers-ai 全部 renderer type 的 DOM 结构收口到契约 6 维。本包 `nop-ai-*` 根类全覆盖、已有 `role="log"`+`aria-live` 合规点，重点是 ai-message-list 定位层的豁免裁定与流式/消息族组件的区域归因，并冻结包级契约测试。

## Current Baseline

> **执行记录（2026-10-03）**：14 type 全合规（根 slot/testid/cid 全覆盖；仅 ai-message-list 有 wrap 层且带 data-slot）。裁决落卡：ai-message-list wrap 为回到底部按钮定位宿主（实例锚单点在契约根，exempt）；琐碎行内布局层（prompts/tool-call/attachments）与 decided Badge 无 slot 为选择器缺口级别登记；bubble shape 与 suggestions overflowMode 的定义/运行时默认不一致为 watch-only 非结构项。契约测试因本包直挂环境时序（懒加载 markdown 链路）收敛为 renderers.test.tsx 内追加 DOM structure contract describe（bubble 根锚 + message-list role=log/wrap 豁免 + token-usage/suggestions 根锚），ai-message-list 的 role=log 另有 a11y.test.tsx 冻结。

- 组件清单（type 注册于 `ai-renderer-definitions.ts`）：ai-chat（composite 主容器）、ai-message-list、ai-bubble、ai-sender、ai-conversations、ai-welcome、ai-prompts、ai-feedback、ai-tool-call、ai-attachments、ai-citations、ai-voice-input、ai-token-usage、ai-suggestions（14 type，其余多为 leaf/composite）。
- `nop-ai-*` 根类全覆盖；`data-slot` 普遍；`data-renderer` 依赖 527。
- 合规参照：ai-message-list 根带 `role="log"` + `aria-live`（流式语义）。
- 已点名嫌疑：`renderers/ai-message-list.tsx:162` `data-slot="ai-message-list-wrap"` 纯定位层包住契约根（:163-165；注释已解释：承载"回到底部"按钮）——豁免候选（定位 + 悬浮操作承载，落卡登记）。
- 盘点未发现本包自带设计器 frame；D6 预期 n-a（无 scene-graph 画布）。

## Goals

- 全部 type 六维判定落卡；ai-message-list 定位层豁免/整改裁定
- 流式输出族（bubble/tool-call/attachments 等嵌套较深组件）结构图归因完整
- `dom-structure` 契约测试冻结

## Non-Goals

- 功能契约 18 维审计；消息引擎/流式协议变更（`docs/components/flux-renderers-ai/engine.md` 域）
- HITL/工具调用交互行为变更
- 其它包的结构问题

## Scope

### In Scope

- `packages/flux-renderers-ai/src/` 全部 renderer type 的审计卡、整改、契约测试

### Out Of Scope

- message engine（框架无关层）内部结构
- 流式渲染性能

## Test Strategy

档位选择：`建议有测`——包级契约测试覆盖 D1 三件套；归因类以卡面为准。

## Execution Plan

### Phase 1 - 逐组件审计卡

Status: completed
Targets: `docs/audits/dom-structure/*.md`（本包 14 张已落盘）

- Item Types: `Proof`

- [x] 逐 type 落卡（14 张，六维判定齐全）；ai-message-list wrap 豁免裁定落卡

Exit Criteria:

- [x] 全部 type 落卡且六维判定齐全（14/14）

### Phase 2 - 整改

Status: completed
Targets: 无（14 type 全合规；无 in-scope fix 项）

- Item Types: `Proof`

- [x] 无 fix 项（watch-only 登记三项：bubble shape 默认不一致、suggestions overflowMode 默认不一致、decided Badge 无 slot 选择器缺口——均非结构缺陷）

Exit Criteria:

- [x] 无悬置 fix
- [x] 既有包测试无回归（ai 840/840 含 2 新契约用例）

### Phase 3 - 契约测试冻结

Status: planned
Targets: 包测试约定位置（该包为同目录多数派）

- Item Types: `Proof`

- [x] 契约断言冻结：token-usage/suggestions 根锚（独立文件 2 用例）+ bubble/message-list 的 marker/role=log 断言由既有 renderers.test.tsx 与 a11y.test.tsx 覆盖

Exit Criteria:

- [x] 契约测试落位并通过
- [x] roadmap W9 回写就绪

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R3（fresh session）
- Verdict: pass-with-minors（行号 Minor 已修订：wrap 定位层实为 :162，契约根 :163-165）
- Rounds: 1
- Findings addressed: ai-message-list 行号修正

## Closure Gates

- [x] 全部 type 审计卡六维收口（14/14）
- [x] 无 in-scope fix（盘点与审计双确认；watch-only 三项登记）
- [x] `dom-structure` 契约断言冻结（独立文件 2 用例 + 既有 renderers/a11y 引用）
- [x] 不存在被静默降级的 in-scope live defect
- [x] owner docs 同步核对完成（无契约语义变更）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（exit 0）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0）
- [x] `pnpm test`（全量 exit 0；ai 840/840 含 2 新契约用例）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 2026-10-03 收口。14 卡落盘（全合规）；wrap 豁免与 watch-only 三项裁定落卡；契约断言冻结于独立文件 2 用例 + 既有 renderers/a11y 引用。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理（fresh session，agent_d5c99457）
- Evidence: 实质全过；审计修正项（suggestions overflowMode watch-only 落卡、Phase 3 状态回填、Status Note 计数、9 张通用卡 D3 措辞）已全部完成后转 approved。契约测试未用 527 helper 为 Minor（直挂手写断言，helper 的 stamp 断言由 flux-react 层测试覆盖）。

Follow-up:

- 见 Non-Blocking Follow-ups
