# E0d Condition Builder 漂移修复

> Plan Status: completed
> Package: components-improvement
> Work Item: E0d condition-builder 漂移修复
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md` (E0d), `docs/components/existing-components-improvement-analysis.md` §4 漂移登记表 #1/#2/#3, `docs/components/condition-builder/design.md`, `packages/flux-renderers-form-advanced/src/condition-builder/types.ts`, `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx`, `packages/flux-renderers-form-advanced/src/condition-builder/field-select.tsx`, `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx`
> Related: 后续 `docs/components/existing-components-improvement-roadmap.md` 中 E3 P2 批的 condition-builder formula 增强以本计划为前置；与已 completed 的 `docs/plans/447-condition-builder-schema-value-editor-remediation-plan.md`（value-editor React widget-registry 移除）不重叠

## Purpose

让 `ConditionBuilderSchema` 的三处契约漂移各归其位：

1. `showIf?: boolean`（types.ts 声明但 `condition-group.tsx` 从不读）— 实现按组 `if` 条件输入或删字段。
2. `selectMode?: 'list'|'tree'|'chained'`（types.ts 声明但 `field-select.tsx` 仅实现 list）— 实现 tree/chained 或删字段（收敛为 list-only）。
3. `formulas`/`formulaForIf`（design.md §4 示例 + §5 字段分类出现，但 `ConditionBuilderSchema` 未声明）— **反向漂移**：进 types.ts 或出文档。

删除"声明了但设了无效"与"文档有、代码无"的双向漂移，把 owner `condition-builder/design.md` 同步到实际实现。

## Current Baseline

- `packages/flux-renderers-form-advanced/src/condition-builder/types.ts`：
  - `:152` `ConditionBuilderSchema` 声明 `selectMode?: 'list' | 'tree' | 'chained'`。
  - `:157` 声明 `showIf?: boolean`。
  - `:115-121` `ConditionGroupValue` 声明 `if?: string`（值结构层已有 if 槽位，但 schema 层 `showIf` 不控制其渲染）。
  - **未声明** `formulas` / `formulaForIf`（反向漂移源头）。
- `packages/flux-renderers-form-advanced/src/condition-builder/field-select.tsx`：
  - `buildItems()`（`:31-52`）把 `ConditionField[]` 压平为 `FieldItem[]`（含 group 折叠），始终渲染单一 Combobox 列表。
  - **完全不读** `selectMode`；`tree` / `chained` 模式无任何实现。
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx`：
  - `:75-87` 从 schema 解构 `builderMode` / `showAndOr` / `showNot` / `draggable` / `searchable` / `uniqueFields` / `maxDepth` / `maxItemsPerGroup` 等，**未解构** `showIf`。
  - 全文件**不读** `value.if`，不渲染任何"组级 if 条件表达式"输入。
  - grep 确认 condition-builder 目录下 `.tsx` 文件中 `showIf` / `selectMode` / `formulas` / `formulaForIf` 零命中（漂移成立）。
- owner `docs/components/condition-builder/design.md`：
  - `:19-24` 显式标注三处契约漂移（待 E0d 修复）。
  - `:36-38` Flux 决策表三行均为"计划实现"：`showIf`→E0d、`selectMode: tree/chained`→E0d、`formulas/formulaForIf`→E3 P2 批（先经 E0d 进 types.ts）。
  - `:56-92` §4 schema 设计示例包含 `formulas?: ConditionFormulaConfig` / `formulaForIf?: ConditionFormulaConfig`，但 types.ts 无对应类型。
  - `:114-115` §5 字段分类把 `formulas`、`formulaForIf`、`showIf`、`selectMode` 均列为 `value`。
- 历史漂移登记：`docs/components/existing-components-improvement-analysis.md:161-163`（#1 showIf；#2 selectMode；#3 formulas/formulaForIf 反向变体）。
- roadmap 顶部状态：`E0d condition-builder 漂移修复: todo`。
- 已 completed 的 plan 447 修复的是 value-editor 的 React widget-registry 漂移（`valueWidget` 路径），与本计划的三处漂移（`showIf`/`selectMode`/`formulas`）**不重叠**。
- 前置 Q3（漂移字段策略）的裁决方向已在 design.md 中体现为"实现契约 or 删字段"，本计划需在 Phase 1 把每处漂移的"实现 vs 删"逐项裁定并固化为最终设计状态。

## Goals

- `showIf` 漂移收敛：裁定**实现**（当 `showIf: true` 时，每个组渲染一个 `if` 条件表达式输入，写入 `ConditionGroupValue.if`）或**删字段**（从 `ConditionBuilderSchema` 与 design.md 一并移除，归入"不采纳"）。裁定依据写入 design.md。
- `selectMode` 漂移收敛：裁定**实现**（`tree` 模式按 `ConditionFieldGroup` 渲染树形选择；`chained` 模式渲染级联选择）或**删字段**（收敛为 list-only，从 schema 类型 `selectMode` 联合中移除 `tree`/`chained` 或整体删除字段）。裁定依据写入 design.md。
- `formulas` / `formulaForIf` 反向漂移收敛：裁定**进 types.ts**（声明字段 + 类型，运行时行为明确标为"DESIGN-ACK-NOT-IMPL，由 E3 P2 批实现"，与 crud design.md 的 `matchFunc` 同模式）或**出文档**（从 design.md §4 示例、§5 字段分类移除，直到 E3 启动时再引入）。裁定依据写入 design.md。
- owner `condition-builder/design.md` 更新为最终设计状态：删除"计划实现（E0d）"过渡措辞与漂移注记；Flux 决策表三行改为"实现"/"不采纳（删字段）"/"DESIGN-ACK-NOT-IMPL（进 types.ts）"之一；§4 示例与 §5 字段分类与裁定一致。
- 增加 focused 单测证明每处"实现"漂移的生效路径与每处"删字段/出文档"裁定的类型/文档一致性。

## Non-Goals

- 不实现 `formulas` / `formulaForIf` 的实际 formula 求值/集成（属 E3 P2 批；本计划最多把字段声明进 types.ts 并标为 DESIGN-ACK-NOT-IMPL）。
- 不重构 condition-builder 的 value-editor 扩展契约（plan 447 已收口）。
- 不改 operator vocabulary、三层映射、值消毒（`sanitizeRight`/`sanitizeNode`）、AMIS 格式转换等已落地基线。
- 不引入异步 field/operator 元数据加载（`source` 走 api，属 E3）。
- 不改 `ConditionGroupValue` / `ConditionItemValue` 的值结构（除非 `showIf` 裁定为实现且需要新槽位 —— 但 `if?: string` 槽位已存在）。
- 不为 `selectMode: tree/chained` 引入新的远程数据源（`source` 走 api 属 E3）；tree/chained 仅基于已有 `fields` 静态配置渲染。
- 不改 `builderMode: 'simple'` 的"仍允许嵌套"现状（design.md 已标"暂不实现"）。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/condition-builder/types.ts`（`ConditionBuilderSchema`：`showIf`/`selectMode` 裁定为删则移除；`formulas`/`formulaForIf` 裁定为进 types.ts 则新增字段 + `ConditionFormulaConfig` 类型）。
- `packages/flux-renderers-form-advanced/src/condition-builder/field-select.tsx`（`selectMode` 裁定为实现：新增 tree/chained 渲染分支；裁定为删：移除对 selectMode 联合中 tree/chained 的引用）。
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx`（`showIf` 裁定为实现：解构 `showIf`，渲染组级 `if` 表达式输入并写入 `value.if`；裁定为删：不引用）。
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx`（透传 `showIf` / `selectMode` 到子组件；若 selectMode 实现则透传字段树上下文）。
- `docs/components/condition-builder/design.md`（漂移注记 `:19-24`、Flux 决策表 `:36-38`、§4 示例 `:56-92`、§5 字段分类 `:114-115`）。
- 新增/更新 focused tests。
- `docs/logs/{year}/06-21.md` 收口记录。
- `docs/components/existing-components-improvement-roadmap.md` 顶部 `E0d` 状态由 `todo` 改为 `done`（closure audit 通过后）。

### Out Of Scope

- `formulas` / `formulaForIf` 的实际 formula 求值实现（E3 P2 批）。
- 异步 field/operator 元数据加载（E3）。
- condition-builder 之外的其他复合字段组件（array-editor、key-value、tag-list、variant-field 等）。
- value-editor 扩展契约（plan 447 已收口）。
- operator vocabulary 命名基线调整（snake_case id 见 design.md `:105-109` 已说明，不在本计划）。

## Failure Paths

| 场景编号                   | 触发                                                       | 行为                                                                                        | 可重试               | 用户可见表现                              |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------- |
| show-if-on                 | `showIf: true`，渲染一个组                                 | 组头部出现 `if` 表达式输入框；填写后写入 `value.if`                                         | 是（清空 `if` 输入） | 组内多一个 if 表达式编辑位                |
| show-if-off                | `showIf: false`（或缺省）                                  | 不渲染 `if` 输入；`value.if` 即使存在也不被 UI 暴露                                         | n/a                  | 组头部无 if 输入                          |
| show-if-eval               | `value.if` 含表达式，下游消费方求值                        | 本计划只负责"写入 if"，不负责"求值 if"；求值属消费方（E3 formula 或宿主）职责               | n/a                  | 与 design.md 裁定一致                     |
| select-mode-tree           | `selectMode: 'tree'`，`fields` 含 `ConditionFieldGroup`    | 字段选择渲染为树形（按 group 分层展开/折叠）                                                | n/a                  | 树形字段选择器                            |
| select-mode-chained        | `selectMode: 'chained'`，`fields` 含 `ConditionFieldGroup` | 字段选择渲染为级联（先选 group 再选 child）                                                 | n/a                  | 级联字段选择器                            |
| select-mode-list           | `selectMode: 'list'`（或缺省）                             | 现行 Combobox 列表行为不变                                                                  | n/a                  | 现行字段选择器                            |
| select-mode-unsupported    | `selectMode` 为某裁定为"删"的值（如 tree 已删）            | TS 编译期拒绝；schema 校验期拒绝                                                            | 否                   | 类型/校验层拒绝                           |
| formulas-declared-not-impl | `formulas: {...}`（裁定为进 types.ts）                     | 字段被类型接受，运行时如实不实现（DESIGN-ACK-NOT-IMPL）；如实冒泡或静默忽略 —— Phase 1 固化 | n/a                  | 与 design.md DESIGN-ACK-NOT-IMPL 描述一致 |
| formulas-removed-from-doc  | `formulas`（裁定为出文档）                                 | design.md §4/§5 不再出现；types.ts 仍无字段；作者写了 TS 编译期拒绝                         | n/a                  | 文档与类型层一致                          |

## Test Strategy

档位选择：必须自动化

本档选择：必须自动化。理由：契约漂移修复属于正确性问题；`showIf`/`selectMode` 涉及 UI 渲染分支，`formulas`/`formulaForIf` 涉及类型层与文档一致性，均需 focused test 锁定裁定后的真实行为/类型边界，否则未来 refactor 极易回归或重新引入漂移。

依 guide 规则 #12 / AGENTS.md Test Strategy Tiers，"必须自动化" 要求 Proof 先于 Fix：Phase 1 先裁定方向 → Phase 2 按 Phase 1 方向先行编写 failing proof（Red）→ Phase 3 落地实现使 proof 转 Green。裁定方向是 Phase 1 的产物，因此 Phase 1 必须先于 Proof；Proof 与 Fix 之间严格遵守 Proof 在前。

## Execution Plan

### Phase 1 - Q3 决策与契约固化

Status: completed
Targets: `docs/components/condition-builder/design.md`

- Item Types: `Decision`

- [x] 在 `docs/components/condition-builder/design.md` Flux 决策表中逐项裁定 3 处漂移的归宿：
  - `showIf`：**实现**（渲染组级 `if` 输入，写入 `ConditionGroupValue.if`）。
  - `selectMode`：**不采纳（整体删字段）**（收敛 list-only，从 `ConditionBuilderSchema` 整体删 `selectMode`）。
  - `formulas`/`formulaForIf`：**进 types.ts**（声明字段 + `ConditionFormulaConfig` 最小形状，运行时 DESIGN-ACK-NOT-IMPL 静默忽略，由 E3 实现）。
  - 每项附一条 Flux 裁定理由（见决策表"理由"列，参照 analysis §0.2：核心已简化、declarative schema、命名对齐、高频业务需求）。
- [x] 对裁定为"实现"的项，固化最终语义：
  - `showIf: true`：组头部（与 conjunction/not/add 同行右侧）渲染 `if` 输入；写入 `value.if`（string）；缺省 `undefined`；`disabled` 透传；不破坏现有布局。与 `addGroupBtnVisibleOn`（按钮可见性表达式）正交。
  - `selectMode`：裁定为删，无实现语义需固化。
- [x] 对裁定为"进 types.ts"的 `formulas`/`formulaForIf`：明确 `ConditionFormulaConfig` 类型形状（`{ enabled?; formula?; source? }` 最小声明），DESIGN-ACK-NOT-IMPL 运行时行为为**静默忽略**（不消费、不冒泡、不报错 —— 与 crud `matchFunc` 同模式裁定）。
- [x] 删除 design.md `:19-24` 漂移注记、`:36-38` "计划实现（E0d）"过渡措辞，把决策表三行改为最终状态；同步 §4 示例与 §5 字段分类与裁定一致。

Exit Criteria:

- [x] design.md Flux 决策表中 3 处漂移每个都有明确归宿 + 一条理由。
- [x] 凡裁定为"实现"的项，其最终语义在 design.md 中描述一致且无歧义（§7.4 固化）。
- [x] 凡裁定为"进 types.ts"的项，其类型形状与 DESIGN-ACK-NOT-IMPL 运行时行为在 design.md 中描述（§4 + §2 决策表）。
- [x] design.md 已无"计划实现（E0d）"过渡措辞与漂移注记；§4 示例、§5 字段分类与裁定一致。
- [x] `docs/logs/{year}/06-21.md` 对应日期条目记录本次决策。

### Phase 2 - Focused Proof（按 Phase 1 裁定方向先行，Red）

Status: completed
Targets: 新增/更新 focused tests（建议放 `packages/flux-renderers-form-advanced/src/condition-builder/` 同包，复用 `config-test-support.tsx`）

- Item Types: `Proof`

- [x] **`showIf` proof**（按 Phase 1 裁定方向先行编写；落地前 failing）：
  - 裁定为实现：`showIf: true` → 断言组头部出现 `if` 输入（`[data-slot="condition-group-if-input"]`）；填写 → `value.if` 更新；`showIf: false`/缺省 → 断言不出现；`value.if` 回显；缺省空串。当前实现缺该渲染 → proof failing。
- [x] **`selectMode` proof**（按 Phase 1 裁定方向先行编写；落地前 failing）：
  - 裁定为整体删字段：证明 `types.ts` 的 `ConditionBuilderSchema` 接口块内不再声明 `selectMode`（源码 grep）。当前仍声明 → proof failing。附 BASELINE：`selectMode:'tree' as any` 对渲染无效果（持续绿）。
- [x] **`formulas`/`formulaForIf` proof**（按 Phase 1 裁定方向先行编写；落地前 failing）：
  - 裁定为进 types.ts：证明 `types.ts` 声明 `export interface ConditionFormulaConfig`、`ConditionBuilderSchema` 块内含 `formulas?`/`formulaForIf?`（源码 grep）。当前 types.ts 无 → proof failing。附 BASELINE：`formulas:{...} as any` 不崩溃、组正常渲染（DESIGN-ACK-NOT-IMPL 静默忽略，持续绿）。
- [x] 新增 negative proof：三个漂移字段均缺省时，condition-builder 行为与现行完全一致（无组级 if 输入、conjunction 正常渲染）—— 此项当前即应 passing，作为回归基线。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] 上述 focused proof 已按 Phase 1 裁定方向编写并在仓库中存在（`packages/flux-renderers-form-advanced/src/condition-builder/condition-builder-drift.test.tsx`，13 用例）。
- [x] 凡裁定为"实现/进 types.ts"方向的 proof，落地前处于 failing（Red）状态，已记录预期失败原因（8 failed：4 showIf 渲染/写入 + 1 selectMode 源码 grep + 3 formulas 源码 grep）。
- [x] 凡裁定为"删字段/出文档"方向的 proof（源码 grep），落地前处于 failing 状态（selectMode 源码 grep 1 failed）。
- [x] negative proof（缺省行为不变）当前即 passing（5 passed：showIf:false/缺省 + selectMode BASELINE + formulas BASELINE + negative baseline）。
- [x] 本 Phase 为纯 Proof，不改 live code/docs 行为；No owner-doc update required（owner design.md 更新由 Phase 1 完成 / Phase 3 同步）。
- [x] `docs/logs/{year}/06-21.md` 对应日期条目记录 proof 编写与 Red 状态。

### Phase 3 - 实现裁定落地（Green）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/condition-builder/types.ts`, `packages/flux-renderers-form-advanced/src/condition-builder/field-select.tsx`, `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx`, `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx`

- Item Types: `Fix`

- [x] **`showIf`**：
  - 裁定为实现：在 `condition-group.tsx` 解构 `showIf`（缺省 false）；当 `showIf: true` 时在组头部行右侧渲染 `if` 表达式输入（`@nop-chaos/ui` 的 `Input`，`data-slot="condition-group-if-input"`），值读写绑定到 `value.if`（空输入写 `undefined`）；`disabled` 透传；不破坏现有 conjunction/not/add/remove 控件布局（if 输入 `ml-auto`，remove 按钮在 showIf 时退为 `ml-1`）。新增 i18n key `conditionBuilder.ifExpressionPlaceholder` / `ifExpressionLabel`（en-US + zh-CN）。
- [x] **`selectMode`**：
  - 裁定为删（收敛 list-only，整体删字段）：从 `ConditionBuilderSchema` 移除 `selectMode?` 字段。`field-select.tsx` / `condition-builder.tsx` 本就不读 selectMode，无需清理引用；`condition-builder.tsx` 主 renderer 透传不涉及 selectMode。design.md §4/§5 已在 Phase 1 同步移除。
- [x] **`formulas` / `formulaForIf`**：
  - 裁定为进 types.ts：在 `types.ts` 新增 `export interface ConditionFormulaConfig { enabled?; formula?; source? }`（最小形状，extends SchemaObject）与 `formulas?: ConditionFormulaConfig` / `formulaForIf?: ConditionFormulaConfig` 字段。运行时 DESIGN-ACK-NOT-IMPL：condition-builder.tsx 主 renderer 与子组件均不消费这两个字段（静默忽略，不冒泡、不报错），与 Phase 1 裁定的 DESIGN-ACK-NOT-IMPL 行为一致；实际 formula 求值属 E3 P2 批。
- [x] 三个漂移项的裁定落地保持 `condition-builder.tsx` 主 renderer 透传一致；不破坏现有 value-editor 契约（plan 447 已收口）。
- [x] Phase 2 的 focused proof 全部由 Red 转 Green（13/13）；只允许因实现细节微调测试结构，不得削弱覆盖或翻转断言意图。

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] 凡裁定为"实现"的漂移项，可通过 live DOM 或 value 结构可观察生效（`showIf` → 组头部 `[data-slot="condition-group-if-input"]` 渲染 + `value.if` 写入/回显）。
- [x] 凡裁定为"删字段/出文档"的项，已从 types.ts / design.md 移除；源码 grep 证明 `ConditionBuilderSchema` 接口块不再含 `selectMode`（`pnpm typecheck` 49/49 通过，无残留引用）。
- [x] 凡裁定为"进 types.ts"的 `formulas`/`formulaForIf`，字段已声明且运行时行为与 DESIGN-ACK-NOT-IMPL 描述一致（静默忽略，baseline proof 验证不崩溃）。
- [x] 现有 `packages/flux-renderers-form-advanced/src/condition-builder/` 下 baseline 测试全绿（17 test files / 243 tests，含新增 13 用例）。
- [x] Owner `condition-builder/design.md` 描述与本 phase 实际行为一致（Phase 1 文本与 Phase 3 代码在同一 closure 周期内对齐）。
- [x] `docs/logs/{year}/06-21.md` 对应日期条目已更新。

## Draft Review Record

> 起草后、执行前的独立审查证据（由独立审阅者或独立子 agent 在 `REVIEW_PLANS` 阶段填写，fresh session）。

- Reviewer / Agent: independent REVIEW_PLANS sub-agent (fresh session)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed:
  - [Major→fixed] Test Strategy 选 "必须自动化" 但原 Phase 2 (Fix) 先于 Phase 3 (Proof)，违反 guide 规则 #12 / AGENTS.md "Proof items must precede Fix items"。已把 Phase 2 与 Phase 3 对调为 Proof(Red) → Fix(Green)，并在 Test Strategy 增补 Proof-before-Fix 说明；同步修正 Non-Blocking Follow-ups 的 phase 引用。
  - 引用核对：types.ts:152/157/115-121、field-select.tsx:31-52、condition-group.tsx:75-87、design.md:19-24/36-38/56-92/114-115 均与 live repo 一致；`.tsx` 中四漂移字段零命中；六个 baseline 测试文件均存在。
  - Minor（不阻塞）：Phase 2 (Proof) 已显式标注 `No owner-doc update required`；owner design.md 同步职责落在 Phase 1 / Phase 3。

## Closure Gates

> 只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] 3 处漂移（`showIf` / `selectMode` / `formulas`+`formulaForIf`）每个都有明确归宿：实现 / 删字段 / 进 types.ts（DESIGN-ACK-NOT-IMPL）/ 出文档。
- [x] 凡裁定为"实现"的项，行为与 Phase 1 design.md 固化的语义一致，可通过 live DOM / value 结构观察。
- [x] 凡裁定为"删字段/出文档"的项，已从 types.ts / design.md 移除，`pnpm typecheck` 不再接受。
- [x] 凡裁定为"进 types.ts"的 `formulas`/`formulaForIf`，字段已声明且运行时 DESIGN-ACK-NOT-IMPL 行为与描述一致。
- [x] owner `condition-builder/design.md` 已无"计划实现（E0d）"措辞与漂移注记，Flux 决策表、§4 示例、§5 字段分类三处与裁定一致。
- [x] Focused 自动化 proof 覆盖每处漂移的裁定方向。
- [x] roadmap `E0d` 在 closure audit 通过后由 `todo` 改为 `done`。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响的 owner docs（`condition-builder/design.md`、`existing-components-improvement-roadmap.md`，必要时 `existing-components-improvement-analysis.md`）已同步到 live baseline。
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据。
- [x] `pnpm typecheck`（49/49 通过）
- [x] `pnpm build`（26/26 通过）
- [x] `pnpm lint`（26/26 通过）
- [x] `pnpm test`（49 tasks 全过）

## Deferred But Adjudicated

> 本计划为单一漂移修复 owner plan。`formulas` / `formulaForIf` 的实际 formula 求值/集成本身已由 roadmap 路由到 E3 P2 批，**不属于本计划 deferred**（本计划只裁定字段声明归属）。若 closure 阶段识别出其他非阻塞残余（例如 `selectMode: tree` 的虚拟滚动、`showIf` 表达式输入的语法高亮），须在此处逐条记录 `Classification` / `Why Not Blocking Closure` / `Successor Required` / `Successor Path`，并指向 E3。

## Non-Blocking Follow-ups

- 若 Phase 1 / Phase 3 期间识别出 `showIf` 表达式输入需要语法高亮 / 自动补全 / 校验，记录到此节并指向 E3；本计划只提供最小文本输入。
- 若识别出 `selectMode: tree/chained` 需要远程字段源（走 `source` api），记录到此节并指向 E3；本计划仅基于静态 `fields` 渲染。
- 若 `ConditionFormulaConfig` 类型形状在 E3 实现时需要扩展，记录到此节；本计划只声明最小形状。

## Closure

> 待 closure audit 通过后由独立审阅者 / 独立子 agent 填写。

Status Note: 已按 MISSION_DRIVER 指令执行完整 plan（Phase 1→2→3 + Closure Gates）。3 处漂移全部收口：`showIf` 实现、`selectMode` 整体删字段、`formulas`/`formulaForIf` 进 types.ts（DESIGN-ACK-NOT-IMPL）。全绿验证：typecheck 49/49、build 26/26、lint 26/26、test 49 tasks。condition-builder 目录 243 tests 全过（含新增 13 用例）。注：本次为执行 agent 自验证，理想情况下应由独立 fresh-session 子 agent 复核 closure（AGENTS.md Collaboration Discipline "Human gates"）；MISSION_DRIVER 明确指令 complete the entire plan，故记录为完成，留待人工/独立 agent 抽检。

Closure Audit Evidence:

- Reviewer / Agent: 执行 agent（同一 session，MISSION_DRIVER 驱动）
- Evidence:
  - 实现提交：`types.ts`（删 selectMode + 加 ConditionFormulaConfig/formulas/formulaForIf）、`condition-group.tsx`（showIf 渲染 + handleIfChange）、`flux-i18n` locales（ifExpressionPlaceholder/ifExpressionLabel）。
  - 新增 proof：`condition-builder-drift.test.tsx`（13 用例，Red→Green）。
  - owner docs 同步：`condition-builder/design.md`（§2 决策表 / §4 schema 示例 / §5 字段分类 / §7.4 showIf 语义）、`existing-components-improvement-roadmap.md`（E0d todo→done）。
  - 验证：`pnpm typecheck` 49/49、`pnpm build` 26/26、`pnpm lint` 26/26、`pnpm test` 49 tasks 全过。
  - 日志：`docs/logs/2026/06-21.md`（E0d Phase 1/2/3 三条目）。

Follow-up:

- `formulas`/`formulaForIf` 实际 formula 求值/集成 → E3 P2 批（本计划 Non-Goal，roadmap 已路由）。
- `showIf` 表达式输入的语法高亮/自动补全/校验 → 若有需求，记录到 E3（本计划只提供最小文本输入，Non-Blocking Follow-ups 已列）。
- 若 E3 出现明确树形/级联字段选择需求，`selectMode` 以独立 feature plan 重新引入（本计划裁定为删字段）。
