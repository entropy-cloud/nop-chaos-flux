# 726 Arc G6D — `list` 拖拽重排落点裁决与协议设计

> Plan Status: completed
> Last Reviewed: 2026-10-24（R2 附条件 approved：§12 门控矛盾句改写 + plan Goals/Non-Goals 同步 + In-Scope 补 §7 + 登记行措辞收敛；R1 revised：M1 门控裁决 page 分页/windowing 下禁用+dev 告警消除切片写回歧义、M2 稳定键前置、M3 复用形态=DnD 约定非直接 import、m1 标记对齐 data-dragging/data-drag-over、m2 payload 补 type、m3 handle 点击不触发选择、m4 windowing 门控、键盘逐次派发语义——全部采纳落 design.md）
> Source: `docs/backlog/arc-component-gap-roadmap.md` §5.1 G6 / §6 Wave 3 G6D / §7 G6D
> Related: `docs/components/list/design.md`（owner doc）、`missions/arc-component-gap.json`

## Purpose

裁决列表重排落点并定稿协议：`list` 能力扩展 `reorderable` + `onReorder`（拒绝独立 type），owner doc 定稿 + 登记链收口。纯文档 plan。

## Current Baseline（live 实测 2026-10-24）

- `list` 已落地 `@nop-chaos-flux-renderers-data`（`list-renderer.tsx`，marker `nop-list`），契约见 `docs/components/list/design.md`（items/item/empty/selectionMode/keyField/分页三态/infinite）。
- 拖拽底座：`packages/flux-renderers-data/src/table-renderer/use-row-drag-sort.ts`（264 行，HTML5 DnD + 键盘 ArrowUp/Down + `role="button"` handle + ownership/statePath 写回通道）。
- `combo`/`input-table` 有表单侧条目上移/下移；展示型 `list` 无重排入口（roadmap §5.1 G6 live 实测）。
- ui 无 listbox 重排 primitive。

## Goals

- 落点一票裁决成文：采纳 (a) `list` 能力扩展；拒绝 (b) 独立 type `reorderable-list`（决策表入 design.md §2）。
- 命名裁定：暂定名 `reorderMode` → **`reorderable?: boolean`**（直接语义肯定式 boolean，showStrength/clearable/split 三先例同族；首版单一交互无模式轴）。
- 协议定稿（design.md §4/§5/§8/§10/§12）：默认 false 零变化；前置门控（稳定 key / 非 page 分页 / 非 windowing，违者整体禁用+dev 告警）；`onReorder` payload `{ type: 'list:reorder', items, keys }` 事件化写回（宿主写 scope，list 不自写数据——§9 请求下沉约束同构）；DOM 判别锚 `list-item-drag-handle`/`data-dragging`/`data-drag-over`（对齐 table 既有命名）；键盘逐次 commit 逐次派发；与 combo/input-table 边界成文。
- 登记 `existing-components-improvement-analysis.md` G6 行。

## Non-Goals

- 不动 list 既有分页/选择/infinite 行为（零漂移是 G6I 硬约束）。
- 不做跨容器拖拽；page 分页与 windowing 下重排被前置门控禁用（§4），跨页重排归后续 demand。
- 不新增 ui primitive、不新增 retained type、不动 table 拖拽底座公共 API。

## Scope

### In Scope

- `docs/components/list/design.md`（§2 决策 + §4 字段 + §5/§8/§10/§12 增补）
- `docs/components/existing-components-improvement-analysis.md`（G6 行）
- `docs/backlog/arc-component-gap-roadmap.md`（§2/§6 G6D 回写 + §7 `reorderMode` 暂定名改名附注，随 closure commit）

### Out Of Scope

- 任何代码改动（G6I 承接）；matrix；schema validator。

## Failure Paths

纯文档 plan；裁决被审查推翻时按意见改判并重走共识。

## Test Strategy

不适用：纯文档、无行为变更（协议实现与判别测试归 G6I）。

## Execution Plan

### Phase 1 — 裁决 + 协议定稿 + 登记

Status: done

- Item Types: `Docs`

- [x] design.md §2 决策表两候选裁决（独立 type 否决理由成文）+ `reorderMode`→`reorderable` 命名裁定
- [x] design.md §4 字段协议（默认 false、无 orderField/statePath/ownership 及理由——展示型 collection 事件化写回）、§5 分类、§8 `onReorder` payload/键盘/与 combo/input-table 边界、§10 DOM 判别锚、§12 回弹风险与分页切片语义
- [x] improvement-analysis G6 行登记
- [x] 命名 pass：`reorderable`/`onReorder` 符合 naming-conventions §2 与 `onSelectionChange`/`onPageChange` 既有 on\* 事件族

Exit Criteria:

- [x] 裁决 + 被拒方理由成文；协议五节定稿；登记链闭环

## Closure Gates

- [x] 所有 in-scope 行为结果已达成
- [x] 不存在被静默降级的 in-scope 项
- [x] owner docs 已同步
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] 代码门禁豁免（纯文档 plan，无行为变更）

## Draft Review Record

- Reviewer / Agent: （待草案审查后填写）

## Deferred But Adjudicated

- `reorderMode`→`reorderable` 改名（roadmap 暂定名否决）：单一交互无需模式轴，直接语义 boolean 三先例同族。

## Closure

Status Note: 完成——`reorderable`+`onReorder` 协议定稿（含三前置门控），closure audit approved（0B/0M/0Miner，1 条非阻塞表述备忘）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_0d59b755，2026-10-24）
- Evidence: **approved**（0 Blocker / 0 Major / 0 Minor）。六维全 PASS：§4 三门控与 §12 无残留矛盾（R2 修订点核销）；三方对齐（plan 726/design.md/登记行，roadmap G6D todo 未超前）；live 事实抽查全中（list 零 DnD、payload type 族、data-dragging/data-drag-over 既有命名、底座 264 行与逐次 commit 路径）；范围纪律（纯文档、G6I 未代跑）；R2 附条件清单逐项落地。非阻塞备忘：§12 "下拉回原序" 表述口语，G6I 以 §8 payload 语义为准。
