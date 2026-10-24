# Arc Gap G5D — `dropdown-button` split-button 落点裁决与协议设计

> Plan Status: completed
> Last Reviewed: 2026-10-24（R1 revised：Major-1 §4 定稿对齐 live 字段并写入默认值（并入 Major-2）、Minor-1 roadmap 暂定名措辞随 closure 回写、Minor-2 plan 改号 724、Minor-3 G5I 以真实 RendererContext 为准——全部采纳）
> Source: `docs/backlog/arc-component-gap-roadmap.md` §5.1 G5 / §6 Wave 3 G5D / §7 G5D
> Related: `docs/components/dropdown-button/design.md`（owner doc）、`missions/arc-component-gap.json`（commitFormat：`feat(arc-component-gap): <description>`）

## Purpose

裁决 split-button 落点并定稿协议：`dropdown-button` 能力扩展 `split` + `mainAction`（默认倾向 (a) 的确认与暂定名 `variant="split"` 的否决），owner doc 定稿 + 登记链收口。纯文档 plan。

## Current Baseline（live 实测 2026-10-24）

- W3b 已落地：`dropdown-button-renderer.tsx`（207 行）——items 协议（action-first + onClick fallback、visible 条件、destructive/disabled）、trigger click/hover（portal grace 窗口）、side/align/sideOffset、`nop-dropdown-button` + `data-slot` 三件套（root/trigger/label/icon/caret）。
- `DropdownButtonSchema`（schemas.ts:236-266）：`icon/variant/size/items/trigger/side/align/sideOffset/disabled`。
- ui 无 SplitButton primitive（roadmap §4 live 实测）；`packages/ui/src/index.ts` 为 ask-first 保护区域。
- `variant` 字段与 `button` 家族共享视觉枚举（schemas.ts:243）。

## Goals

- 落点一票裁决成文：采纳 (a) `dropdown-button` 能力扩展；拒绝 (b) ui primitive + 独立 type、(c) `variant="split"` 枚举过载（决策表入 design.md §2）。
- 协议定稿（design.md §4/§5/§7/§10/§12）：`split?: boolean`（默认 false 零变化）、`mainAction`（仅 split 消费）、主段/caret 段触发面拆分、disabled 整体、DOM marker 判别锚点。
- 登记 `existing-components-improvement-analysis.md` G5 行（铁律 1 登记链）。

## Non-Goals

- 不动既有合并态行为（零漂移是 G5I 硬约束）。
- 不新增 ui primitive、不新增 retained type、不动 `variant` 枚举。
- `component:open`/`close` 句柄、暗色分隔样式细节：follow-up。

## Scope

### In Scope

- `docs/components/dropdown-button/design.md`（§2 决策表 + §4 协议 + §5/§7/§10/§12 增补）
- `docs/components/existing-components-improvement-analysis.md`（G5 行）
- `docs/backlog/arc-component-gap-roadmap.md`（§2/§6 G5D 状态回写，随 closure commit）

### Out Of Scope

- 任何代码改动（G5I 承接）；matrix（未新增 type）；schema validator。

## Failure Paths

纯文档 plan，无运行时失败路径；裁决被草案审查推翻时按审查意见改判并重走共识（§10 Rule 6）。

## Test Strategy

不适用：纯文档、无行为变更（裁决与协议文档，实现归 G5I 判别测试）。

## Execution Plan

### Phase 1 — 裁决 + 协议定稿 + 登记

Status: done

- Item Types: `Docs`

- [x] design.md §2 决策表三候选裁决（(a) 采纳；暂定名 `variant="split"` 否决理由成文——语义过载视觉枚举，按 showStrength 直接语义字段先例定名 `split` + `mainAction`）
- [x] design.md §4 协议定稿（W3b live 字段清单对齐 + `split` 默认 false / `mainAction` 缺失退化语义）、§5 字段分类、§7 运行期状态（hover 仅 caret、disabled 整体、无 mainAction 退化）、§10 DOM marker（`data-mode="split"` / `dropdown-button-group` / `dropdown-button-main` / `dropdown-button-caret-trigger`；合并态 slot 不输出判别锚）、§12 边界声明（vs button-group / vs button+dropdown 组合）
- [x] improvement-analysis G5 行登记（出处/plan/实现归 G5I）
- [x] 命名 pass：`split`（直接语义 boolean）/ `mainAction`（与 items `action` 命名族对齐、避免与 dropdown-button 潜在 onClick 语义冲突）——符合 `naming-conventions.md` §2 shadcn 对齐与直接语义字段先例

Exit Criteria:

- [x] 裁决表 + 被拒方理由成文于 owner doc（防止反复重提）
- [x] 协议六节定稿、登记链闭环

## Closure Gates

- [x] 所有 in-scope 行为结果已达成（Phase 1 Exit 全 [x]）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项
- [x] 受影响 owner docs 已同步（design.md + improvement-analysis）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] 代码门禁豁免（纯文档 plan，无行为变更）

## Draft Review Record

- R1（fresh 子 agent `agent_04ee1728`，2026-10-24）：**`revised`**（0 Blocker / 2 Major / 3 Minor，全部采纳——Major-1 §4 定稿对齐 live 字段、Major-2 split 默认值入 owner doc、Minor-1 roadmap 措辞随 closure 回写、Minor-2 改号 724、Minor-3 G5I 以真实 RendererContext 为准；裁决/命名/判别锚三专项裁定全部成立）。
- R2（同 agent 复核）：**`approved`**（两 Major 实证消除；残留书记项 Draft Review Record 补记已随本条完成）。

## Deferred But Adjudicated

（无）

## Closure

Status Note: 完成——落点裁决 `split`+`mainAction` 能力扩展定稿，closure audit approved（0B/0M/2m）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_49aef8e3，2026-10-24）
- Evidence: **approved**（0 Blocker / 0 Major / 2 Minor）。§2 决策表三候选理由成文；§4 与 live schemas.ts:236-266 逐项一致（行号精确）；§5/§7/§10/§12 自洽，§10 新增 DOM 锚与既有 slot 零冲突；三方对齐（plan 724/design.md/improvement-analysis/roadmap）；零代码触碰，登记链闭环，G5I 前置满足、未超前推进。Minor-1（roadmap 暂定名措辞以附注勘误，合 G3D 先例）、Minor-2（§4 省略号展示风格）均记录级，不阻断。
