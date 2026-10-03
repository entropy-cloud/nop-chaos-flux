# 536 flux-renderers-ai 渲染器 DOM 结构契约审计与整改

> Plan Status: active
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（DOM 结构契约）、`docs/backlog/dom-structure-audit-roadmap.md`（W9）、`docs/audits/dom-structure-checklist.md`
> Related: `docs/plans/2026-10-03-527-dom-marker-shared-infra-plan.md`（前置）

## Purpose

把 flux-renderers-ai 全部 renderer type 的 DOM 结构收口到契约 6 维。本包 `nop-ai-*` 根类全覆盖、已有 `role="log"`+`aria-live` 合规点，重点是 ai-message-list 定位层的豁免裁定与流式/消息族组件的区域归因，并冻结包级契约测试。

## Current Baseline

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

Status: planned
Targets: `docs/audits/dom-structure/*.md`（本包 14 张）

- Item Types: `Proof`

- [ ] 逐 type 落卡；ai-message-list 定位层裁定（exempt 登记"回到底部"承载，或整改）

Exit Criteria:

- [ ] 全部 type 落卡且六维判定齐全

### Phase 2 - 整改

Status: planned
Targets: 卡面 fix 项（如 Phase 1 判出）

- Item Types: `Fix | Proof`

- [ ] 卡面 fix 项（如有）test-first 落地

Exit Criteria:

- [ ] 无悬置 fix；既有包测试无回归（focused 范围）

### Phase 3 - 契约测试冻结

Status: planned
Targets: 包测试约定位置（该包为同目录多数派）

- Item Types: `Proof`

- [ ] 契约测试覆盖全部 type D1 三件套 + `role="log"` 既有语义保持 + 本包登记关键项（使用 527 helper）

Exit Criteria:

- [ ] 契约测试落位并通过
- [ ] roadmap W9 回写就绪

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R3（fresh session）
- Verdict: pass-with-minors（行号 Minor 已修订：wrap 定位层实为 :162，契约根 :163-165）
- Rounds: 1
- Findings addressed: ai-message-list 行号修正

## Closure Gates

- [ ] 全部 type 审计卡六维收口
- [ ] 如有 in-scope fix 已落地并有 focused proof
- [ ] `dom-structure` 契约测试冻结
- [ ] 不存在被静默降级的 in-scope live defect
- [ ] owner docs 同步核对完成
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 待收口

Closure Audit Evidence:

- Auditor / Agent: 待定
- Evidence: 待定

Follow-up:

- 见 Non-Blocking Follow-ups
