# 728 Arc G7D — `image-compare` 落点裁决与协议设计

> Plan Status: completed
> Last Reviewed: 2026-10-24（R1 revised：M1 proposed 态入 matrix Status Vocabulary + 行落 §6 Flux-Only 节、M2 零 fetch 表述改为 roadmap 新增约束（image 实有 fetcher）、M3 improvement-analysis 登记链矛盾消除（新 type 不入该链，文件移出 In-Scope）、m4 键盘按模式成对 + handle aria-label、m6 措辞——全部采纳）
> Source: `docs/backlog/arc-component-gap-roadmap.md` §5.1 G7 / §6 Wave 4 G7D / §7 G7D（最低优先级波次）
> Related: `docs/components/image-compare/design.md`（owner doc）、`missions/arc-component-gap.json`

## Purpose

裁决 image-compare 落点并定稿协议：新 type `image-compare`（P3 场景型）+ matrix 增行提案（`proposed`，CC2 人工门禁——flip 前不得激活 G7I）。纯文档 plan。

## Current Baseline（live 实测 2026-10-24）

- flux media 家族：`image`（content 包，单 src）、`audio`/`video`/`carousel`——无双图对比能力（roadmap §5.1 G7）。
- ui 无 compare/slider-overlay primitive（roadmap §4）。
- matrix：`image` retained、`images` not-retained（组合口径）——新增 type 需增行（CC2 human gate）。
- `image` 加载/错误降级约定可参照（image.tsx）。

## Goals

- 落点一票裁决成文：采纳 (a) 新 type `image-compare`；拒绝 (b) `image` 能力扩展（无既有协议可复用，字段面/渲染路径分叉过半）、(c) 宿主组合（缺口本体）。
- 协议定稿（design.md 全文）：双图 value 下沉（零 fetch 字段）、分隔线 local state + `defaultPosition` 播种、pointer/键盘（role=slider 全键盘语义）、clip-path 裁切、DOM 锚、加载降级。
- matrix 增行提案（`proposed` 状态入词表声明，落 flux-only 节，flip 归人工）。**登记链纠正：G7 为新 type，不落 improvement-analysis 能力扩展登记链**（该文件本 plan 不改）。

## Non-Goals

- 不实现（G7I 待 matrix flip 人工门禁）；不做 RTL/`onPositionChange`/角标文案（design.md §12 后续候选）；零新依赖。

## Scope

### In Scope

- `docs/components/image-compare/design.md`（新建，全文协议）
- `docs/components/amis-baseline-matrix.md`（增行 `image-compare`，状态 `proposed`——增行提案，flip 归人工）
- `docs/backlog/arc-component-gap-roadmap.md`（§2/§6 G7D 回写随 closure commit）

### Out Of Scope

- 任何代码改动（G7I 承接，前置 = matrix flip 人工确认）；schema validator；INV 全量审计（归 G7I plan 前置）。

## Failure Paths

纯文档 plan；裁决被审查推翻时按意见改判并重走共识。

## Test Strategy

不适用：纯文档、无行为变更（实现与判别测试归 G7I）。

## Execution Plan

### Phase 1 — 裁决 + 协议定稿 + matrix 提案

Status: done

- Item Types: `Docs`

- [x] design.md 全文（§2 三候选决策表 + §4 schema + §7 local state/pointer/键盘 a11y + §9 数据下沉 + §10 DOM 锚/clip-path + §12 风险）
- [x] matrix 增行（`image-compare` 落 §6 Flux-Only 节，`proposed` 态入 Status Vocabulary 声明；不 flip）
- [x] roadmap 指针登记（§5.1 G7 勘误附注随 closure commit）
- [x] 命名 pass：`image-compare`（名词复合，与 media 家族 `image` 词根对齐）；`before`/`after`/`defaultPosition`/`orientation` 直观语义

Exit Criteria:

- [x] 裁决 + 被拒方理由成文；协议十二节定稿；matrix `proposed` 增行 + G7I 人工门禁声明在案

## Closure Gates

- [x] 所有 in-scope 行为结果已达成
- [x] 不存在被静默降级的 in-scope 项
- [x] owner docs 已同步
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] 代码门禁豁免（纯文档 plan，无行为变更）

## Draft Review Record

- R1（fresh 子 agent `agent_b69595db`，2026-10-24）：**`revised`**（0 Blocker / 3 Major / 3 Minor 全采纳——M1 `proposed` 态入 matrix Status Vocabulary + 行落 §6 Flux-Only 节；M2 零 fetch 表述改为 roadmap 新增约束（image 实有 fetcher）；M3 improvement-analysis 登记链矛盾消除；m4 键盘按模式成对 + handle aria-label；m5 行归位；m6 措辞）→ R2 **`approved`**。

## Deferred But Adjudicated

- 登记链归属纠正：G7 为新 type，improvement-analysis（能力扩展登记链）不适用；matrix `proposed` 增行即提案载体，CC3 INV 审计归 G7I plan 前置。

## Closure

Status Note: 完成——新 type `image-compare` 协议定稿 + matrix `proposed` 提案，closure audit approved（0B/0M/2m）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_4cc294b4，2026-10-24）
- Evidence: **approved**（0 Blocker / 0 Major / 2 Minor）。CC2 门禁纪律 PASS（仅增行提案未 flip，四处冻结声明一致）；协议自洽全 PASS（决策表/schema/键盘 slider a11y/clip-path 换算/数据下沉事实注记/DOM 锚）；三方对齐；范围纪律（零代码触碰）；R2 条款逐项落地。Minor-1（In-Scope 节号措辞随 closure commit 对齐）、Minor-2（本 Draft Review Record 补填）均已随手消化。附带观察（非本 diff）：roadmap §2 G6D 行在 G6D closure commit 中因表格对齐未命中而漏翻 todo，随本 commit 补正。
