# 533 flux-renderers-content 渲染器 DOM 结构契约审计与整改

> Plan Status: completed
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（DOM 结构契约）、`docs/backlog/dom-structure-audit-roadmap.md`（W6）、`docs/audits/dom-structure-checklist.md`
> Related: `docs/plans/2026-10-03-527-dom-marker-shared-infra-plan.md`（前置）

## Purpose

把 flux-renderers-content 全部 renderer type 的 DOM 结构收口到契约 6 维。本包以 leaf 为主、基线良好，重点是 carousel 多层链裁定与 card/cards/carousel/diff-view 四个 composite 的审计，并冻结包级契约测试。

## Current Baseline

> **执行发现（2026-10-03）**：20 type 全部合规或在 W6 收口；两处 fix——carousel 每帧媒体框层（caption 定位+裁剪+底色三合一）补 `carousel-item-frame` slot；diff-view three-column 分支根补 `data-slot="diff-view"`（与其它分支一致，W3 轮漏检）。diff-view 内层无 data-cid 为帧根单点锚语义（合规）；ui Carousel 内层同名 data-slot="carousel" 嵌套登记；alert close testid 硬编码登记 Non-Blocking Follow-up（testid 契约项非结构项）；cards CardContent 层带 slot 归因 pass。

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

Status: completed
Targets: `docs/audits/dom-structure/*.md`（本包 20 张已落盘）

- Item Types: `Proof`

- [x] 逐 type 落卡（20 张，六维判定齐全）；carousel 6 层链逐层归因（vendor 双 div forced wrapper + 末端 relative 层 fix）

Exit Criteria:

- [x] 全部 type 落卡且六维判定齐全（20/20）

### Phase 2 - 整改

Status: completed
Targets: `carousel.tsx`、`diff-view/diff-view-renderer.tsx`

- Item Types: `Fix | Proof`

- [x] carousel 每帧媒体框层补 `data-slot="carousel-item-frame"`（三合一职责归因，非删除——删除会破坏 caption 定位/裁剪/占位）
- [x] diff-view three-column 分支根补 `data-slot="diff-view"`（分支一致性缺口）

Exit Criteria:

- [x] 每个 fix 项落地且有 focused 断言（契约测试 4 用例）
- [x] 既有包测试无回归（content 345/345）

### Phase 3 - 契约测试冻结

Status: completed
Targets: `src/dom-structure-contract.test.tsx`（4 用例，直挂式 per 包惯例 + TestRuntimeProvider）

- Item Types: `Proof`

- [x] 契约测试冻结：qrcode 根锚（figure + fallback 路径）、carousel 根 + item-frame ×2、status span 根、diff-view three-column 分支 slot（使用 527 helper 的 skip marker 口径）

Exit Criteria:

- [x] 契约测试落位并通过（4/4）
- [x] roadmap W6 回写就绪

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R3（fresh session）
- Verdict: pass-with-minors（2 项 Minor 已修订，达成共识）
- Rounds: 1
- Findings addressed: ①carousel 链修正为 6 层（ui CarouselContent 双 div，vendor 内层记 forced wrapper）②type 计数 19→20

## Closure Gates

- [x] 全部 type 审计卡六维收口（20/20）
- [x] carousel/diff-view 整改落地且有 proof
- [x] `dom-structure` 契约测试冻结（4 用例）
- [x] 不存在被静默降级的 in-scope live defect
- [x] owner docs 同步核对完成（无契约语义变更）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（exit 0）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0）
- [x] `pnpm test`（全量 exit 0；content 345/345 = 341 + 4）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

- alert close 按钮 testid 硬编码 "alert-close" 改 `${testid}-close` 派生（testid 契约项，非结构项）

## Closure

Status Note: 2026-10-03 收口。20 卡落盘；两处 fix（carousel-item-frame、diff-view three-column 根 slot）；4 用例契约测试（直挂式）；alert testid 硬编码登记 Follow-up。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理（fresh session，agent_5a3279a8，两轮）
- Evidence: Round 1 发现 F1（case4 空过断言：props 误用致 three-column 分支从未渲染 + if(root) 守卫空过）——已修复（正确 props + 无条件断言）并经审计方二次敏感性实测（删 :92 fix 即失败）；审计还原操作丢失的 :92 fix 已重新应用。Round 2 approved：case4 为真实有效断言，carousel :258 同前次实测有效。

Follow-up:

- 见 Non-Blocking Follow-ups
