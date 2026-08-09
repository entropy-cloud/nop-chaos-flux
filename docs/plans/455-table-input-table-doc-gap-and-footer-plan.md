# 455 table/input-table 文档缺口补齐 + input-table footer 插槽

> Plan Status: completed
> Last Reviewed: 2026-08-09
> Source: `docs/analysis/2026-08-09-timesheet-week-grid-analysis.md`（final，三轮独立审查共识）
> Related: `flux-guide/design-patterns/table.md`、`flux-guide/design-patterns/combo-input-table.md`、`flux-renderers-data/src/schemas.ts`、`flux-renderers-form-advanced/src/input-table-renderer.tsx`
> 依赖顺序：Phase 1 → 2（文档，独立可并行；Phase 2 第二项"footer 文档节"挂起于 Phase 3 落地后填写）；Phase 3（footer 实现）独立

## Purpose

基于 Timesheet 周网格调研共识报告（`docs/analysis/2026-08-09-timesheet-week-grid-analysis.md`）的「后续动作」，收口两件事：

1. **补齐 `table` 文档缺口**：`flux-guide/design-patterns/table.md` 未覆盖树形（`rowChildrenField`/`childrenSource`/`expandable`）、表头分组（`columns[].children`）、footer、quickEdit（inline/dialog/body/saveImmediately）、合计行（`affixRow`/`prefixRow`）——能力已实现但文档未记录，属 contract-doc drift（`Fix`）。
2. **给 `input-table` 增加 `footer` 插槽**：相对 AMIS InputTable（`amis-ui/src/components/InputTable.tsx:81,303` 有 `footer`）的能力对齐缺口——合计行/统计区挂载点（`Fix` + 组件单测）。

## Current Baseline

- **`table` 完整能力已实现但文档未覆盖**（共识报告 §3.1 源码核实）：
  - 树形：`TableSchema.rowChildrenField`（use-table-tree.ts:129-131）+ `childrenSource`（懒加载）+ `flattenTreeRows` + `handleToggleTreeExpand`
  - 表头分组：`TableColumnSchema.children` 嵌套 + `computeHeaderRows`（table-header-tree.ts:52）
  - 单元格直编：`quickEdit?: boolean | { mode, body, saveImmediately }`（schemas.ts:16-20,89），inline 常驻输入（table-quick-edit-cell.tsx:113-129）+ 行级 draft 保存条（use-row-quick-edit-draft.tsx）
  - 合计行：`affixRow`/`prefixRow`（schemas.ts:106-108,166-167，value 表达式）+ footer（schemas.ts:144）
  - `flux-guide/design-patterns/table.md`（213 行）仅覆盖列类型/排序/选择/虚拟滚动/操作列，上述能力零覆盖；quickEdit 仅在 `crud.md §6` 与 `examples/inline-quick-edit.md` 有文档
- **`input-table` 无 `footer`**：`InputTableSchema`（composite-schemas.ts:114-128）无 footer 字段，renderer 无 footer region；AMIS InputTable 有 `footer?: () => React.ReactNode`（InputTable.tsx:81,303）
- `combo-input-table.md`（132 行）未记录"派生列/只读列经 item region 表达式实现"范例（共识报告 §3.2：item region 内控件字段表达式直接绑定行数据，无需 compute 机制）

## Goals

- `flux-guide/design-patterns/table.md` 补 5 节：树形 / 表头分组 / footer / quickEdit / affixRow+prefixRow 合计，内容与 live 源码行为一致，含最小 JSON 示例
- `flux-guide/design-patterns/combo-input-table.md` 补"派生列/只读列经 item region 表达式实现"范例节
- `input-table` 新增 `footer` region（schema 字段 + renderer 渲染 + 组件单测），与 AMIS InputTable 对齐
- `combo-input-table.md` 补 `footer` 文档节
- 全量验证（typecheck/build/lint/test）通过（Closure Gates）

## Non-Goals

- 不做 `input-table` 树形行 / 表头分组（与 AMIS InputTable 对齐，均无；业务用展示型 `table`）
- 不做 `input-table` 动态列（共识报告 §7 D 档：动编译器 + item region，成本最高，被"固定列 + 后端 pivot"替代）
- 不做 Excel 粘贴批量录入（Deferred But Adjudicated）
- 不改 `table` 既有行为（quickEdit/树形/合计已实现，仅文档）
- 不新增 `compute` 机制（表达式已覆盖，共识报告 §3.2/§3.4）

## Scope

### In Scope

- `flux-guide/design-patterns/table.md`：5 节文档补充（Fix）
- `flux-guide/design-patterns/combo-input-table.md`：表达式派生列范例 + footer 文档（Fix）
- `flux-renderers-form-advanced/src/composite-field/composite-schemas.ts`：`InputTableSchema.footer?: SchemaInput | string`（Fix）
- `flux-renderers-form-advanced/src/input-table-renderer.tsx`：footer region 渲染（Fix）
- `flux-renderers-form-advanced` 组件单测：footer 渲染 + 空值行为（Proof）
- `flux-guide/design-patterns/combo-input-table.md`：footer 字段参考（Fix）

### Out Of Scope

- 应用层（nop-app-erp）Timesheet 页面实现（属 nop-app-erp 侧 plan，本计划只补平台能力/文档）
- `table` 行为变更（含 quickEdit 交互增强如点击进入编辑态——共识报告 §8.2 的 PoC 结论未出，不预设）
- `input-table` 树形/分组/动态列/Excel 粘贴

## Failure Paths

不适用：纯文档 + 单字段 add-on 渲染，无错误处理/API 契约/鉴权/外部集成面。

## Test Strategy

本档选择：`建议有测`（文档部分不适用：纯文档；footer 实现部分为组件单测）。

- footer 渲染为**组件行为变更**，必须有 focused 单测（Proof 项）：footer 传入时渲染于表格底部；footer 缺失时零渲染且不影响既有行为
- 文档部分以"内容与 live 源码行为一致"为验证（人工抽查 + 示例 JSON 与 schema 字段对照）

## Execution Plan

### Phase 1 - `table.md` 文档补齐（5 节）

Status: completed
Targets: `flux-guide/design-patterns/table.md`

- Item Types: `Fix`

- [x] §1 树形表格节：`rowChildrenField`（树模式开关，数据来源字段）+ `childrenSource`（懒加载 ActionSchema）+ 树展开/折叠示例 JSON（toggle 内嵌首列单元格，**无独立展开列配置**——table-body-row-rendering.tsx:335,470,502,534）；注明 `defaultExpanded`/`maxDepth` 仅存在于 `flattenTreeRows` options（use-table-tree.ts:33-34），**未接线到 TableSchema**，避免读者误用。**不含 `expandable`**（Flux `expandable` 是"展开行"特性 expandedRowKeys/expandedRow/expandableWhen，schemas.ts:204-211，非树形展开列；如覆盖则作为独立小节标注正确语义）。插入位置策略：追加为现有文档尾部新节（table.md 现有 §1-§7 + 末尾无编号"table vs crud 选型"节；新节置于选型节之前，编号顺延，Exit Criteria 以内容存在性为准）
- [x] §2 表头分组节：`columns[].children` 嵌套列 + 多行表头示例（colSpan/rowSpan 语义，table-header-tree.ts:52 `computeHeaderRows`）
- [x] §3 footer 节：`footer?: SchemaInput | string` + 示例（对齐 table-renderer.tsx:692-693 渲染）
- [x] §4 quickEdit 节：`quickEdit: boolean | { mode:'inline'|'dialog', body, saveImmediately }` + inline 常驻输入示例 + 行级 draft 保存条 / saveImmediately 失焦提交语义（对齐 table-quick-edit-cell.tsx:113-129、use-row-quick-edit-draft.tsx）；注明 quickEdit 与树形行同格共存
- [x] §5 合计行节：`affixRow`/`prefixRow` + `TableSummaryCell { column, value(表达式), align }` + 示例（对齐 schemas.ts:106-108,166-167、table-summary-row.tsx:40-42）
- [x] 每节 JSON 示例与 live schema 字段逐一对照（引注 schemas.ts 行号）

Exit Criteria:

> 本 Phase 交付 = table.md 5 节内容 + 示例；验证 = 示例字段与 schemas.ts 定义抽查一致。

- [x] `table.md` 含树形/表头分组/footer/quickEdit/affixRow+prefixRow 五节，每节有最小 JSON 示例
- [x] 抽查 ≥3 个示例字段与 `packages/flux-renderers-data/src/schemas.ts` 实际定义一致（如 `rowChildrenField`/`children`/`quickEdit.mode`/`affixRow.cells[].value`）

### Phase 2 - `combo-input-table.md` 表达式派生列范例 + footer 文档

Status: completed
Targets: `flux-guide/design-patterns/combo-input-table.md`

- Item Types: `Fix`

- [x] §表达式派生列/只读列节：item region 内控件字段表达式绑定行数据示例（`{type:"text", text:"${qty}*${price}"}` 派生列、`readOnly:true` 只读列），注明"无需 compute 机制"
- [x] footer 文档节（依赖 Phase 3 落地后填写：`footer?: SchemaInput | string` + 示例）

Exit Criteria:

- [x] `combo-input-table.md` 含表达式派生列/只读列范例节（Phase 3 前完成）
- [x] （Phase 3 完成后）`combo-input-table.md` 含 footer 文档节

### Phase 3 - `input-table` footer 插槽

Status: completed
Targets: `flux-renderers-form-advanced/src/composite-field/composite-schemas.ts`、`flux-renderers-form-advanced/src/input-table-renderer.tsx`、`flux-renderers-form-advanced/src/__tests__/`

- Item Types: `Fix` + `Proof`

- [x] `InputTableSchema` 增 `footer?: SchemaInput | string`（composite-schemas.ts，类型对齐 `TableSchema.footer` schemas.ts:144）
- [x] `input-table-renderer.tsx` 增 footer region 渲染，**对齐 `table` 的 value-or-region 范式**：`RendererDefinition fields` 增 `{ key: 'footer', kind: 'value-or-region', regionKey: 'footer' }`（对齐 data-renderer-definitions.ts:231）；渲染条件用 `hasRendererSlotContent(resolveRendererSlotContent(props, 'footer'))`（对齐 table-renderer.tsx:121,692-693——`value-or-region` 编译期将 SchemaInput 抽取进 `props.regions.footer`，不能用 `schemaProps.footer ?` 作条件，否则 SchemaInput 形式恒空）；footer 缺失时零渲染
- [x] 组件单测（Proof）：扩展既有 `__tests__/input-table-renderer.test.tsx`（204 行，data-slot 断言范式现成）——footer 传入渲染于表格底部（`data-slot="input-table-footer"` 断言）；footer 缺失零渲染；既有行为零回归（addable/removable/item 编辑等）
- [x] `combo-input-table.md` footer 字段参考表补行（依赖本 Phase 落地）

Exit Criteria:

- [x] `InputTableSchema.footer` 声明 + renderer 渲染落地，组件单测覆盖"传入渲染 / 缺失零渲染"两路径
- [x] `pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 通过（含新增 footer 用例 + 既有用例 0 回归）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写（见 guide `Plan Review Rule`）。

### 第 2 轮（2026-08-09，共识确认）

- Reviewer / Agent: fresh sub-agent（只读，源码逐条核实）
- Verdict: `pass`（零 Blocker 零 Major，可转 active）
- Rounds: 2
- Findings addressed:
  - M1 落实核实：Phase 3 fields 已改 `value-or-region` + regionKey（data-renderer-definitions.ts:231 逐字一致）；渲染条件已改 `hasRendererSlotContent(resolveRendererSlotContent(...))`（table-renderer.tsx:121,692-693 一致），`schemaProps.footer ?` 已移除
  - M2 落实核实：树形节已删 expandable，正确标注"展开行特性"语义（schemas.ts:204-211 一致）
  - m1/m2/m3 落实核实通过；m4（table.md 头部死指针）处置正确
  - 残留 minor（不阻塞）：table.md L5 头部 `flux-types/schema.d.ts` 死指针随 Phase 1 顺手改为引注 schemas.ts

## Closure Gates

> 全量验证归此处；本计划含代码变更（Phase 3），需跑仓库级检查。

- [x] `table.md` 5 节 + `combo-input-table.md` 表达式范例/footer 文档与 live 源码行为一致
- [x] `input-table` footer 字段 + 渲染 + 单测落地，AMIS InputTable 对齐
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（本计划无）
- [x] 受影响的 owner docs 已同步（`flux-guide/design-patterns/table.md` + `combo-input-table.md` 即本计划交付物本身）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Excel 粘贴批量录入（input-table）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 独立于本计划结果面（录入提速优化项）；共识报告 §7 B 档，无下游需求驱动；不影响 table/input-table 文档与 footer 对齐目标成立
- Successor Required: `yes`
- Successor Path: 独立组件能力计划（触发条件：出现批量录入业务需求或组件 owner 立项）

### input-table 树形行 / 表头分组

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 与 AMIS InputTable 对齐（两者均无）；业务需要时用展示型 `table`（已完整实现树形/分组）
- Successor Required: `no`

### quickEdit 交互增强（点击进入编辑态）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 共识报告 §8.2 的 PoC（常驻输入体验实测）结论未出；若 PoC 不达标才评估扩展（ask-first）
- Successor Required: `yes`
- Successor Path: 由 nop-app-erp Timesheet 落地 PoC 结论驱动

## Non-Blocking Follow-ups

- nop-app-erp 侧 Timesheet 页面落地（属应用层 plan，非本平台计划范围）
- `table.md` 与 `crud.md`/`examples/inline-quick-edit.md` 的 quickEdit 文档交叉引用统一（文档一致性治理项）

## Closure

Status Note: 已完成（2026-08-09 执行完毕；Phase 1-3 全 completed + 全 checklist [x] + Closure Gates 全 [x]；独立 closure-audit 通过后标记 completed）

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（task `ses_01929f88fffe5INEBsRITRkXO8`，首轮 verdict `revise`：1 Major + 2 Minor 全部修复——M1 懒加载 action scope 为顶层 `record`（use-table-lazy-children.ts:60 `createScope({ record, rowKey })`）非 `$slot.record`，示例 URL 改 `${record.id}`；m1 footer DOM 序在分页栏之下；m2 item region 参数为 `index`/`value`（`$slot.index`/`$slot.value`），`$index` 不存在；re-audit task `ses_0191a5f8bffeWTOp1uv6yxjF9Q` verdict `pass`，零新增 finding）
- Evidence: 全量验证 `pnpm typecheck` 33/33、`pnpm build` 33/33、`pnpm lint` 33/33、`pnpm test` 60/60（form-advanced 135 files / 1053 tests，含新增 footer 3 用例）；`pnpm check` exit 1 仅既有登记 red（`check:audit-event-dispatch-ctx` industrial 6 hits，2026-08-09 已登记移交 industrial workstream），链上其余 13 项 + `check:ai-engine-invariants` 单独复跑全 exit 0、零新增命中；`check:schema-prop-coverage` exit 0（footer 字段覆盖）

Follow-up:

- 无（本计划无遗留；Non-Blocking Follow-ups 见上文：nop-app-erp Timesheet 页面落地属应用层 plan；table.md 与 crud.md/examples/inline-quick-edit.md 的 quickEdit 文档交叉引用统一为文档一致性治理项）
