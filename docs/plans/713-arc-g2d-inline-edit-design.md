# 713 Arc G2D — inline-edit 落点裁决与设计（`detail-field` 点即编辑能力扩展）

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/arc-component-gap-roadmap.md` §5.1 G2 / §7 G2D（roadmap item G2D，`todo`）
> Related: `docs/components/detail-field/design.md`、`docs/references/naming-conventions.md`

## Purpose

一票裁决 inline-edit（点即编辑）落点，并产出完整交互协议，落稿 `detail-field/design.md`。纯设计 plan（不改代码）；实现归 G2I。

## Current Baseline（live 核对 2026-10-24）

- `detail-field` 现状（`packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`，446 行）：viewer 只读摘要 + 触发按钮 → dialog/drawer draft form → 确认写回父表单。写回管线函数化在 renderer 内：`settleParentValidation`（:134）、`readCurrentParentValue`（:157）、`applyParentWriteback`（:165）、`rollbackParentWriteback`（:174）、`compileDetailValueAdaptationAction`（:391）——**均可在无 surface 的内联路径复用**。
- `detail-view` 是纯只读对（无 name 绑定），不承载编辑。
- flux 详情侧现状无任何点即编辑入口；表格 cell editable 属 `table` 家族（既有），与本项无关。
- AMIS 仅有表格 cell editable（roadmap §5.1 G2 必要性既述）。
- ui 无 InlineEdit primitive；`Input`/`InputGroupInput` 原语已导出。
- `naming-conventions.md` Scope Boundary 节：新组件命名归主 roadmap 权威；新 retained type 需 matrix 增行（human gate）。

## Goals

- **落点裁决**：一票裁决 (a) `detail-field` 能力扩展 vs (b) 独立 type `inline-edit`，被拒方排除理由写入 design.md 决策表（roadmap §9 Cross-Cutting 1）。
- 完整协议：触发方式（click/dblclick）、编辑态原语、提交/取消语义（blur/Enter/ESC）、与既有写回/校验管线的关系、disabled/readOnly 降级、DOM marker、a11y、命名 pass、失败路径。
- design.md 12 节同步更新；不改任何代码。

## Non-Goals

- 不实现（G2I）；不改 table/combo 的既有编辑能力；不做多行/富文本内联编辑（首版单行文本）；不动 matrix（裁决 (a) 则无需增行）。

## Scope

### In Scope

- `docs/components/detail-field/design.md`：落点裁决决策表 + inline-edit 协议章节 + 各节同步（字段分类/状态归属/事件句柄/样式 marker）。
- 命名 pass 结论写入 design.md。

### Out Of Scope

- G2I 实现面；matrix 增行；其他组件。

## Failure Paths

| 编号                          | 触发                                               | 行为                                                                                     | 可重试 | 用户可见表现      |
| ----------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------ | ----------------- |
| inline-commit-validation-fail | 内联提交触发 `validateValueAction`/parent 校验失败 | 保留编辑态并显示错误（复用 `publishValidateResultErrors` 通道），不写回                  | 是     | 编辑框 + 错误文案 |
| inline-commit-async-fail      | transformOut/写回异步失败                          | 回滚到原值（复用 `rollbackParentWriteback`），错误走 `logDetailFieldAsyncError` 同级上报 | 是     | 值回到原状        |
| inline-esc                    | 编辑态按 ESC                                       | 丢弃修改回 viewer，不触发任何写回                                                        | 是     | 恢复原显示        |
| inline-blur-commit            | blur 且值未变                                      | 不触发管线，直接回 viewer                                                                | —      | 无闪烁            |

## Test Strategy

不适用：纯设计 plan。G2I 承担（必须自动化：内联提交/取消/校验失败均为可程序化断言行为）。

## Execution Plan

### Phase 1 — 落点裁决与协议落稿

Status: completed
Targets: `docs/components/detail-field/design.md`

- Item Types: `Decision`

- [x] 裁决段：默认倾向 (a) 的裁决依据（管线复用零新增 type、`naming-conventions` type 增殖约束、(b) 需 matrix 增行 human gate 且复制写回编排）；被拒方 (b) 排除理由写入决策表（防止反复）；裁决结论 = (a) `detail-field.editable` 能力扩展（除非复核发现 (a) 存在结构性阻塞——若有则改判 (b) 并在 plan Deferred 记录 matrix human gate 待办）。
- [x] 协议章节落稿：`editable?: boolean`、`editTrigger?: 'click'|'dblclick'`（默认 click；与 dialog 路径既有 `triggerLabel` 的关系写明——`triggerLabel` 仅 dialog 路径消费，`editable: true` 时不渲染触发按钮）、编辑态原语（首版单行 `Input`，`aria-label` 沿用字段 label，原生 input 不重复加 role）、**值适配裁决（审查 M1）**：内联路径首版仅承诺标量契约——编辑框初始显示值 = viewer 同源（`String(fieldValue)`），提交时 workingValue = 原始字符串；`editable: true` 与 `transformInAction`/`transformOutAction`/`validateValueAction` 任一同时声明时 `editable` 无效、走既有 dialog 路径（首版不支持内联×适配组合，Failure Path 记录）、提交（Enter/blur 且值变更 → 校验 → `applyParentWriteback` → `settleParentValidation`，失败保留编辑态）、取消（ESC / blur 值未变）、disabled/readOnly 静态降级、点击目标裁决（`detail-field-viewer` 容器为命中区；viewer 内可交互子内容 stopPropagation 优先）、DOM marker（`data-slot="detail-field-inline-editor"`）、a11y（错误 `aria-describedby` 复用既有错误链）、与 dialog 路径互斥语义（`editable: true` 时不渲染触发按钮与 surface）。
- [x] 字段分类/状态归属/事件句柄/样式 marker 各节同步；决策表"暂不实现 inline"类旧行（如有）就地翻转或勘误。
- [x] 命名 pass：`editable`/`editTrigger` 对照 `naming-conventions.md`（肯定式布尔、camelCase；拒绝 `inlineEdit`/`clickToEdit`/`editOn` 的理由）。

Exit Criteria:

- [x] design.md 含裁决段（被拒方理由在案）与完整协议章节，无"待定"占位；与 live 管线函数名/行号核对相符。
- [x] 各节（§4/§5/§7/§8/§10）与协议一致，无自相矛盾残留。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-10-24）
- Verdict: `revised` → 共识达成（零 Blocker / 1 Major / 4 Minor，全部当场采纳）
- Rounds: 1
- Findings addressed: M1 协议补 transformIn/workingValue 内联语义裁决（内联仅标量契约，editable×transform\* 互斥降级 dialog）；m1 naming-conventions 出处改 Scope Boundary 节；m2 去冗余 role="textbox"；m3 点击目标钉死 viewer 容器 + stopPropagation 规则；m4 editTrigger 与 triggerLabel 关系写明

## Closure Gates

> 纯文档 plan，pnpm 四项按 guide 规则删除。

- [x] design.md 裁决与协议完整、与 live repo 事实核对相符
- [x] roadmap §2/§6 G2D `todo`→`done` 回写（与 closure 证据同 commit）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- G2I 实现面（focused 单测/e2e/铁律 3/5/6/8）归 G2I plan。

## Closure

Status Note: G2D 三要素（落点裁决 (a) 附被拒方理由、§4a 完整协议、命名 pass）落地；closure audit 首轮 approved（0B/0M/2m：m2 互斥下 validateValueAction 分支不可达的措辞限定已就地补注；m1 提交归属注意已遵守——closure commit 仅含本线文件）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-10-24）
- Evidence: approved（零 Blocker）：裁决表/协议/七节同步/命名 pass 逐条核对；管线函数 8 处行号 live 复核全中（settleParentValidation:134、applyParentWriteback:165、useDetailChildValidationContract active:open :119-124 等）；summary-gate 不激活声称与代码结构一致；roadmap §7 G2D 条件项（matrix 提案）按 (a) 裁决豁免成立。
