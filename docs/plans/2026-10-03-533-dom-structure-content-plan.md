# 533 flux-renderers-content 渲染器 DOM 结构契约审计与整改

> Plan Status: active
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（DOM 结构契约）、`docs/backlog/dom-structure-audit-roadmap.md`（W6）、`docs/audits/dom-structure-checklist.md`
> Related: `docs/plans/2026-10-03-527-dom-marker-shared-infra-plan.md`（前置）

## Purpose

把 flux-renderers-content 全部 renderer type 的 DOM 结构收口到契约 6 维。本包以 leaf 为主、基线良好，重点是 carousel 多层链裁定与 card/cards/carousel/diff-view 四个 composite 的审计，并冻结包级契约测试。

## Current Baseline

- 组件清单（type 注册于 `content-renderer-definitions.ts`，共 20 个；card → `card.tsx`，diff-view → `diff-view/`）：separator、spinner、progress、empty、result、card、link、image、json-view、markdown、html、cards、alert、mapping、status、audio、video、carousel、qrcode、diff-view。
- `nop-*` 根类全覆盖（含 `nop-audio`、`nop-qrcode`）；`data-slot` 普遍。
- 已点名嫌疑：`carousel.tsx:240-257` `nop-carousel` 根 → Carousel(ui) → CarouselContent → CarouselItem → `relative` div → img——实测 **6 层**（ui `CarouselContent` 是双 div：viewport + 内层 flex，`packages/ui/src/components/ui/carousel.tsx:151-152`；vendor 内层 flex 记 forced wrapper）；末端 `relative` 层目的不明（仅圆角/底色——decorative wrapper 候选）。
- 合规参照：qrcode 有 `role="img"` + aria-label（`qrcode.tsx:114`）。
- 盘点未发现本包自带 frame；D6 预期无 scene-graph 画布（audio/video 原生语义元素）。

## Goals

- 全部 type 六维判定落卡；carousel 链逐层归因并整改或豁免登记
- card/cards/carousel/diff-view 四 composite 的区域 slot 覆盖确认
- `dom-structure` 契约测试冻结

## Non-Goals

- 功能契约 18 维审计；媒体播放/轮播交互行为变更
- shadcn Carousel（ui 包）内部结构
- 其它包的结构问题

## Scope

### In Scope

- `packages/flux-renderers-content/src/` 全部 renderer type 的审计卡、整改、契约测试

### Out Of Scope

- `packages/ui` 的 Carousel/基元组件内部
- audio/video 解码与播放控制逻辑

## Test Strategy

档位选择：`建议有测`——carousel 整改为必测断言；其余以卡面 + 契约测试覆盖。

## Execution Plan

### Phase 1 - 逐组件审计卡

Status: planned
Targets: `docs/audits/dom-structure/*.md`（本包 20 张）

- Item Types: `Proof`

- [ ] 逐 type 落卡；carousel 6 层链逐层归因（vendor 内层 flex 记 forced wrapper；末端 relative 层判 fix 或 forced/exempt）

Exit Criteria:

- [ ] 全部 type 落卡且六维判定齐全

### Phase 2 - 整改

Status: planned
Targets: `carousel.tsx` 及卡面其余 fix 项

- Item Types: `Fix | Proof`

- [ ] carousel 按裁定整改（decorative 层合并入子元素/根，或登记约束）
- [ ] 逐项 test-first 落地

Exit Criteria:

- [ ] 每个 fix 项落地且有 focused 断言；既有包测试无回归（focused 范围）

### Phase 3 - 契约测试冻结

Status: planned
Targets: 包测试约定位置（该包为同目录多数派）

- Item Types: `Proof`

- [ ] 契约测试覆盖全部 type D1 三件套 + 本包登记的关键 D3/D4 项（使用 527 helper）

Exit Criteria:

- [ ] 契约测试落位并通过
- [ ] roadmap W6 回写就绪

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R3（fresh session）
- Verdict: pass-with-minors（2 项 Minor 已修订，达成共识）
- Rounds: 1
- Findings addressed: ①carousel 链修正为 6 层（ui CarouselContent 双 div，vendor 内层记 forced wrapper）②type 计数 19→20

## Closure Gates

- [ ] 全部 type 审计卡六维收口
- [ ] carousel 整改/豁免落地且有 proof
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
