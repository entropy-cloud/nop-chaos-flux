# E1c Table 高级能力

> Plan Status: completed
> Package: components-improvement
> Work Item: E1c table 高级能力
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（E1c 行）、`docs/components/table/design.md` §2/§4/§11/§12、E1b plan 的 Deferred But Adjudicated（column resize widths scope-level 持久化 successor = "随 E1c 一并收口"）
> Related: `docs/plans/2026-06-21-0331-e1b-table-column-width-and-aggregation-plan.md`（前置 + deferred successor 来源）

## Purpose

把 roadmap 工作项 **E1c table 高级能力** 从 `todo` 推进到 `done`：在 E1b 已落地的 resize / sticky header / 聚合行 / 单元格合并 基础上，收口 table 生产力报表剩余能力（多列排序、多级表头、树表/嵌套子行、行拖拽排序、copyable 单元格），并吸收 E1b deferred successor（列宽 scope-level 持久化），同时修正 design.md 与 roadmap 之间 `popOver 单元格` 标签漂移。

## Current Baseline

- E1b 已 `done`：`columnResize`/`affixHeader`/`prefixRow`/`affixRow`/`combineNum` 全部 live（`packages/flux-renderers-data/src/schemas.ts:103-107`、`table-renderer/use-column-resize.ts`、`table-renderer/combine-cells.ts`、`table-renderer/table-summary-row.tsx`）。
- table 已具备的 capability hook 体系（`table-renderer/use-table-*.ts`）：`useTableSort`（**严格单列**，`sortState` 形如 `{ column, direction }`）、`useTableSelection`、`useTablePagination`、`useTableFilter`、`useTableExpand`、`useTableVisibleColumns`、`useColumnResize`。这是 E1c 各能力的扩展挂载点。
- table orchestration shell：`table-renderer.tsx`（572 行）+ `table-renderer/table-header-row.tsx`（310 行，单层表头）+ `table-renderer/table-body-rows.tsx`（386 行，flat 数据行）+ `table-renderer/table-body-row-rendering.tsx`（525 行）。
- `TableColumnSchema`（`schemas.ts:39-60`）已有 `name`/`label`/`width`/`fixed`/`sortable`/`align`/`cellRegionKey` 等；**缺** `children`（多级表头）、`copyable`、`popOver`；表级 **缺** `draggable`/`orderField`、`columnWidthsOwnership`/`columnWidthsStatePath`、树表 `rowChildrenField`。
- `docs/components/table/design.md` §2 决策表已为 E1c 预占 6 行（树表/行拖拽/多列排序/多级表头/copyable/popOver），均标 `计划实现（E1c）`；§4/§11/§12 已预留 E1b 落地描述但未写 E1c。
- **owner-doc 漂移**：roadmap E1c 工作项文本只列 "树表/行拖拽/多列排序/多级表头/copyable 单元格"（5 项），design.md §2 多出一行 `popOver 单元格 | 计划实现（E1c）`。按 roadmap Rule「工作项增删需人确认」，本 plan 不能单方面把 popOver 并入 E1c 工作项；需把 design.md 该行标签下调到后续 successor（E3 P2）以消除漂移。
- E1b deferred successor（`2026-06-21-0331-e1b-...-plan.md` Deferred But Adjudicated）：「column resize widths 的 scope-level 持久化」= `optimization candidate`，`Successor Required: yes`，`Successor Path: 后续 column-widths-persistence plan，或随 E1c（table 高级能力）一并收口`。本 plan 选择「随 E1c 一并收口」路径。
- E1b Non-Blocking Follow-up：「per-cell `colSpan`/`rowSpan`（cell 级显式 span）」未指定 successor，属按需扩展，不在本 plan scope（见 Non-Goals）。

## Goals

- 多列排序：`useTableSort` 升级为多列 sortable，`sortState` 兼容单列/多列，事件 payload 稳定。
- 多级表头：`TableColumnSchema.children` 嵌套列定义，`<TableHeader>` 递归渲染分组行。
- 树表 / 嵌套子行：表级 `rowChildrenField`（默认 `children`），children 行按层级缩进 + 可展开，与现有 `expandable` 单层 detail 共存不冲突。
- 行拖拽排序：表级 `draggable: true` + `orderField`，drag handle `data-slot="table-row-drag-handle"`，排序结果按 `orderField` 写回（ownership 模型，不在 table 内发请求）。
- copyable 单元格：列级 `copyable: true`，cell 旁渲染复制按钮（`data-slot="table-cell-copy-button"`），复用剪贴板写入。
- 列宽 scope-level 持久化（吸收 E1b deferred）：`columnWidthsOwnership: 'local' | 'controlled' | 'scope'` + `columnWidthsStatePath`，与现有 ownership 体系一致。
- 修正 `popOver 单元格` 标签漂移（design.md 下调到 successor）。
- `table/design.md` §2 决策表对应行翻转、§4/§7/§11/§12 同步 E1c 字段/ownership/拆分/风险。

## Non-Goals

- `popOver 单元格` 实现本身（下调到 E3/successor；本 plan 只做标签裁定 + design.md 同步）。
- cell 级显式 `colSpan`/`rowSpan`（E1b follow-up，未指定 successor，按需扩展）。
- E1d crud 数据生命周期（独立工作项，且 blocked by X4/Q2/Q5）。
- amis `itemActions` 浮动操作、`autoFillHeight`、`lazyRenderAfter`、导出 Excel/CSV（design.md §2 已裁定暂不实现/不采纳）。
- 树表的远程懒加载 / 远程搜索 / 虚拟滚动交互（属 E2d 树族异步与级联工作项）。
- column resize 与多级表头共存的全部边界 perf 优化（首版保证正确，perf 走 follow-up）。

## Scope

### In Scope

- `packages/flux-renderers-data/src/schemas.ts`：`TableColumnSchema` 加 `children?`/`copyable?`；`TableSchema` 加 `draggable?`/`orderField?`/`rowChildrenField?`/`columnWidthsOwnership?`/`columnWidthsStatePath?`。
- `packages/flux-renderers-data/src/data-renderer-definitions.ts`：新字段注册（`kind: 'prop'`）。
- `packages/flux-renderers-data/src/table-renderer/use-table-sort.ts`：多列 sortable 升级（兼容单列输入）。
- `packages/flux-renderers-data/src/table-renderer/use-column-resize.ts`：接 `columnWidthsOwnership`/`columnWidthsStatePath`（scope-level 持久化分支）。
- 新增 capability hook / helper（按 §11 拆分建议）：`use-table-tree.ts`（树表行模型）、`use-row-drag-sort.ts`（行拖拽）、`table-header-tree.tsx` 或在 `table-header-row.tsx` 内递归（多级表头）、`copy-to-clipboard.ts` helper + cell copy 按钮。
- `table-renderer.tsx` / `table-header-row.tsx` / `table-body-rows.tsx` / `table-body-row-rendering.tsx`：wire 新能力，保持 orchestration shell 薄、能力维度 hook 化。
- `docs/components/table/design.md`：§2 决策表 E1c 行翻转 + popOver 行下调；§4 字段；§5 字段分类；§7 ownership（新增 `columnWidthsOwnership`、行拖拽 ownership 裁定）；§10 DOM marker（drag handle / copy button data-slot）；§11 拆分；§12 风险（多列 sort 与 column resize 共存、树表 + virtual 限制）。
- `docs/components/existing-components-improvement-roadmap.md`：E1c `todo`→`done`（closure 后）。
- `docs/components/amis-baseline-matrix.md`：table 行 retained 决策同步（如多列排序/树表/拖拽改变 retained 状态）。
- `docs/logs/2026/06-21.md`（或执行当日）：E1c 收口条目。
- 新增 focused 单测：`packages/flux-renderers-data/src/__tests__/table-e1c-*.test.tsx`（每能力至少覆盖 happy path + 关键边界）。

### Out Of Scope

- 见 Non-Goals 全部条目。
- e2e/Playwright（本 plan 单测覆盖；非 AGENTS.md unit+e2e full-green 定义）。

## Failure Paths

> table 是状态易失控组件；下列场景必须有可观测行为而非静默错误。

| 场景编号                          | 触发                                                          | 行为                                                                                                | 可重试 | 用户可见表现                                        |
| --------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------- |
| e1c-multi-sort-controlled-missing | `sortOwnership: 'controlled'` 但上层未提供 sort state         | 退化为单列本地推导（与 E1b 前 baseline 一致），不抛                                                 | 否     | 表头点击有响应但多列不累积（console dev warn 可选） |
| e1c-tree-cycle                    | `rowChildrenField` 数据出现循环引用                           | 检测到已访问 rowKey 时截断该分支，不无限递归                                                        | 否     | 该分支 children 不渲染，控制台 warn                 |
| e1c-drag-no-orderField            | `draggable: true` 但未声明 `orderField`                       | drag 不写回排序（local 视觉反馈可选），dev warn 提示缺 orderField                                   | 否     | 行可拖动但排序卸载丢失                              |
| e1c-copy-clipboard-denied         | 剪贴板权限被拒 / 非 HTTPS                                     | `navigator.clipboard.writeText` reject 时回退 `document.execCommand('copy')`，再失败静默 + dev warn | 否     | 复制按钮无成功态                                    |
| e1c-widths-scope-no-path          | `columnWidthsOwnership: 'scope'` 但缺 `columnWidthsStatePath` | 退化为 local（不持久化），dev warn                                                                  | 否     | resize 可用但卸载丢失                               |
| e1c-multilevel-header-fixed       | 多级表头 + `fixed: 'left'/'right'` 子列                       | 首版保证渲染正确，固定列与多级表头交叉的 pixel-perfect 对齐归 follow-up                             | 否     | 视觉对齐轻微偏差（§12 标注）                        |

## Test Strategy

档位选择：**建议有测**

本档选择：`建议有测`

理由：E1c 各能力为 table 生产力增强（非鉴权/对外 API/核心回归路径），但 table 是状态易失控组件且 cross-ownership，每能力必须有 focused 单测验证行为结果（不仅是"不报错"）。Proof 项可与 Fix 同 phase 或紧随其后，不强制 test-first。

## Execution Plan

### Phase 1 - schema 字段 + 决策表准备 + popOver 漂移修正

Status: completed
Targets: `packages/flux-renderers-data/src/schemas.ts`、`packages/flux-renderers-data/src/data-renderer-definitions.ts`、`docs/components/table/design.md`

- Item Types: `Fix | Decision`

- [x] `TableColumnSchema` 新增 `children?: TableColumnSchema[]`、`copyable?: boolean`
- [x] `TableSchema` 新增 `draggable?: boolean`、`orderField?: string`、`rowChildrenField?: string`、`columnWidthsOwnership?: 'local' | 'controlled' | 'scope'`、`columnWidthsStatePath?: string`
- [x] `data-renderer-definitions.ts` 注册全部新字段（`kind: 'prop'`，boolean 字段标 `valueType: 'boolean'`）
- [x] **Decision**：`popOver 单元格` 标签裁定 —— 不并入 E1c 工作项（roadmap 未列），design.md §2 该行由 `计划实现（E1c）` 下调为 `计划实现（E3/successor）`，并在 §12 注明 successor 归属
- [x] design.md §2 决策表 E1c 5 行（树表/行拖拽/多列排序/多级表头/copyable）先标 `实现中（E1c）`，popOver 行下调
- [x] design.md §4 字段节、§5 字段分类节、§7 ownership 节、§10 DOM marker 节、§11 拆分节、§12 风险节预占 E1c 占位（具体语义随各 capability phase 填充）

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-renderers-data typecheck` 通过，新字段在 `TableSchema`/`TableColumnSchema` 上类型可见
- [x] `data-renderer-definitions.ts` 新字段注册可被 `kind:'prop'` 解析（无 unknown field warning）
- [x] `docs/components/table/design.md` §2 popOver 行不再标 `（E1c）`；E1c 5 行标 `实现中（E1c）`
- [x] `docs/logs/` 当日条目记录 Phase 1 决策（popOver 裁定理由）

### Phase 2 - 多列排序（multi-column sort）

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/use-table-sort.ts`、`table-header-row.tsx`、`table-renderer.tsx`、`docs/components/table/design.md`

- Item Types: `Fix | Proof`

- [x] `useTableSort` 升级：`sortState` 兼容单列 `{column,direction}` 与多列 `Array<{column,direction}>`；`onSortChange` payload 稳定发布 `type:'table:sort-change'` + `sort: Array<{column,direction}>`（单列时为 1 元素数组）
- [x] 表头交互：点击列在已激活时切换方向、再点移除；shift/多列累积键（默认 click 单列、配置 `multiSort: true` 或 shift-click 累积，二选一在 Phase 内 Decision）
- [x] `table-header-row.tsx` 渲染多列 sort 指示（序号徽标 + 方向箭头）
- [x] 与 crud 上游 `crud-renderer-state.ts` sort DTO 兼容（多列时为数组）
- [x] focused 单测：单列兼容、多列累积、移除列、direction 切换、controlled/scope/local 三 ownership × 单/多列
- [x] design.md §2 多列排序行翻 `实现`；§7 sort ownership 多列语义；§12 多列 + column resize 共存说明

Exit Criteria:

- [x] 单列 baseline 行为不变（已有 sort 单测全过）
- [x] 多列场景：`sortStatePath` 写入 `[{column,direction},...]`；事件 payload 含数组
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 多列用例全过
- [x] design.md §2/§7/§12 同步；`docs/logs/` 当日条目更新

### Phase 3 - 多级表头（nested header groups）

Status: completed
Targets: `table-header-row.tsx`（或新增 `table-header-tree.tsx`）、`table-renderer.tsx`、`fixed-columns.ts`、`docs/components/table/design.md`

- Item Types: `Fix | Proof`

- [x] 列归一化识别 `children` 嵌套，计算 leaf columns（数据列 = 叶子）；body 行按 leaf columns 渲染
- [x] `<TableHeader>` 递归渲染分组行；colSpan = 叶子数，rowSpan = 跨层；与 `fixed`/`align`/`combineNum` 协同（首版保证 flat fixed baseline 不退化）
- [x] 列宽 resize / affixHeader / columnSettings 与多级表头共存：resize 作用于 leaf 列；affixHeader sticky 覆盖所有分组行
- [x] focused 单测：2 层 / 3 层嵌套渲染、leaf 列对齐、resize handle 仅 leaf、affixHeader 多行 sticky、combineNum + 多级表头
- [x] design.md §2 多级表头行翻 `实现`；§4 `children` 字段；§11 拆分（如新增 `table-header-tree.tsx`）；§12 多级表头 + fixed 列 pixel 边界 follow-up 标注

Exit Criteria:

- [x] 无 `children` 时表头渲染与 E1b baseline 逐像素一致（已有 header 单测全过）
- [x] 多级表头 leaf 列与 body 列一一对齐
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 多级表头用例全过
- [x] design.md §2/§4/§11/§12 同步；`docs/logs/` 当日条目更新

### Phase 4 - 树表 / 嵌套子行（tree table）

Status: completed
Targets: 新增 `table-renderer/use-table-tree.ts`、`table-body-rows.tsx`、`table-body-row-rendering.tsx`、`table-renderer.tsx`、`docs/components/table/design.md`

- Item Types: `Fix | Proof`

- [x] 表级 `rowChildrenField`（默认 `children`）触发树表模式：行数据按该字段递归展开为带层级的 flat 渲染列表（保留 rowKey 唯一）
- [x] 层级缩进 marker（`data-level` 属性 + 缩进 class，非硬编码 px）；每行展开/折叠 toggle 复用现有 expand UI 原语
- [x] 循环引用防护（Failure Path `e1c-tree-cycle`）
- [x] 与 `expandable` 单层 detail row 共存：树表 toggle 控 children 行，`expandable` 控 detail row，两者互不抢占
- [x] 与 virtual 共存限制：树表 + virtual 时裁剪可能跨折叠分支，首版保证正确性（折叠分支不渲染），perf 归 §12 follow-up
- [x] focused 单测：2 层/3 层 children 渲染、折叠/展开、循环截断、rowChildrenField 自定义、与 expandable 共存、与 selection 共存（父子是否级联归 Decision：树表默认不级联，级联属 E0b tree-select 族语义）
- [x] design.md §2 树表行翻 `实现`；§4 `rowChildrenField`；§7 树表展开 ownership（local，不级联）；§12 树表 + virtual 限制

Exit Criteria:

- [x] 无 `rowChildrenField` 时 body 渲染与 E1b baseline 一致
- [x] 树表场景 children 行正确缩进 + 可折叠；循环数据不崩溃
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 树表用例全过
- [x] design.md §2/§4/§7/§12 同步；`docs/logs/` 当日条目更新

### Phase 5 - 行拖拽排序（row drag reorder）

Status: completed
Targets: 新增 `table-renderer/use-row-drag-sort.ts`、`table-body-row-rendering.tsx`、`table-renderer.tsx`、`docs/components/table/design.md`

- Item Types: `Fix | Proof`

- [x] 表级 `draggable: true` + `orderField`：行首渲染 drag handle `data-slot="table-row-drag-handle"`；拖拽结束按新顺序以 `orderField` 为 key 写回排序
- [x] ownership：排序写回优先 `scope`（通过既有 scope owner path，不在 table 内发请求）；缺 `orderField` 时按 Failure Path `e1c-drag-no-orderField` 退化
- [x] 与 selection / 树表 / 多级表头共存：drag 作用于顶层行（树表时拖动含子树整体）
- [x] 不引入完整 DnD 库除非 `@nop-chaos/ui` 已提供（先查 `packages/ui/src/index.ts`）；首版 pointer-based drag 可接受
- [x] focused 单测：拖拽后顺序写回、orderField 缺失退化、与 selection 共存、树表整子树拖动
- [x] design.md §2 行拖拽行翻 `实现`；§4 `draggable`/`orderField`；§7 行排序 ownership；§10 drag handle data-slot；§12 与 combineNum 共存说明

Exit Criteria:

- [x] `draggable` 未声明时渲染与 baseline 一致（无 drag handle）
- [x] 拖拽后 `orderField` 值按新顺序写回（scope/local 两路径）
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 行拖拽用例全过
- [x] design.md §2/§4/§7/§10/§12 同步；`docs/logs/` 当日条目更新

### Phase 6 - copyable 单元格（copy-to-clipboard cell）

Status: completed
Targets: `table-body-row-rendering.tsx`、新增 `table-renderer/copy-to-clipboard.ts`、`docs/components/table/design.md`

- Item Types: `Fix | Proof`

- [x] 列级 `copyable: true`：cell 值旁渲染复制按钮 `data-slot="table-cell-copy-button"`（hover/focus 显隐可接受）
- [x] `copy-to-clipboard.ts` helper：`navigator.clipboard.writeText` 优先，失败回退 `document.execCommand('copy')`，再失败按 Failure Path `e1c-copy-clipboard-denied` 静默 + dev warn
- [x] 复制内容 = cell 渲染值的文本表示（经 `helpers.evaluate` 若 cell 是表达式）
- [x] focused 单测：copyable 渲染按钮、点击写入剪贴板（mock navigator.clipboard）、权限拒绝回退、非 copyable 不渲染按钮
- [x] design.md §2 copyable 行翻 `实现`；§4 `copyable`；§10 copy button data-slot；§12 剪贴板降级说明

Exit Criteria:

- [x] 非 copyable 列渲染与 baseline 一致（无按钮）
- [x] copyable 列点击复制成功路径 + 拒绝回退路径均有用例
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` copyable 用例全过
- [x] design.md §2/§4/§10/§12 同步；`docs/logs/` 当日条目更新

### Phase 7 - 列宽 scope-level 持久化（吸收 E1b deferred successor）

Status: completed
Targets: `table-renderer/use-column-resize.ts`、`table-renderer.tsx`、`schemas.ts`（已在 Phase 1 加字段）、`docs/components/table/design.md`

- Item Types: `Fix | Proof`

- [x] `useColumnResize` 接 `columnWidthsOwnership`/`columnWidthsStatePath`：`scope` 时 resize 结果写 `columnWidthsStatePath`（`Record<columnName, width>`）；`controlled` 时只读上游；`local` 保持 E1b baseline
- [x] 缺 `columnWidthsStatePath` 时按 Failure Path `e1c-widths-scope-no-path` 退化为 local
- [x] 与 crud 上游共存：crud 可作为 column widths owner（复用现有 ownership 接入模式）
- [x] focused 单测：scope 写入/读取、controlled 只读、local baseline 不变、缺 path 退化、多列 resize 持久化
- [x] design.md §2 列宽 resize 行注解更新（移除"scope-level 持久化归 follow-up"限定）；§4 `columnWidthsOwnership`/`columnWidthsStatePath`；§7 列宽 ownership；§12 移除"卸载即丢"限定（scope 模式下持久）

Exit Criteria:

- [x] `columnWidthsOwnership` 未声明时与 E1b baseline 行为一致（local，卸载丢失）
- [x] scope 模式 resize 写入 `columnWidthsStatePath`，重挂载恢复
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 持久化用例全过
- [x] design.md §2/§4/§7/§12 同步；`docs/logs/` 当日条目更新
- [x] E1b deferred successor 在 E1b plan 的 Deferred But Adjudicated 节注记「已由 E1c plan 收口」

### Phase 8 - 集成验证 + owner-doc 同步 + roadmap 收口

Status: completed
Targets: `packages/flux-renderers-data/src/__tests__/`、`docs/components/table/design.md`、`docs/components/existing-components-improvement-roadmap.md`、`docs/components/amis-baseline-matrix.md`、`docs/logs/`

- Item Types: `Proof | Follow-up`

- [x] 跨能力集成用例：多列排序 + 多级表头 + column resize + 列宽持久化 共存；树表 + selection；行拖拽 + 多级表头
- [x] anti-hollow 抽查：每个新 hook/helper 真实被 `table-renderer.tsx` 运行时调用，无空函数体 / 无 `return null` 占位 / 无注册不可达路径
- [x] design.md §2 决策表 E1c 5 行全部翻 `实现`，popOver 行已下调；§4/§5/§7/§10/§11/§12 无残留 `计划实现（E1c）` / `实现中（E1c）`
- [x] `existing-components-improvement-roadmap.md`：E1c `todo`→`done`（closure audit 通过后；不在本 phase 内提前改）
- [x] `amis-baseline-matrix.md` table 行 retained 决策同步（多列排序/树表/行拖拽是否翻转 retained）
- [x] `docs/logs/` 当日条目汇总 E1c 全 8 phase + 验证结果

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 全过（含新增 E1c 用例）
- [x] design.md 无残留 E1c 占位标签
- [x] anti-hollow 抽查清单写入当日 log
- [x] `docs/logs/` 当日条目含 E1c 收口段（各 phase landing 证据 + 验证命令结果）

## Draft Review Record

> 待 `REVIEW_PLANS` flow step 由独立子 agent（fresh session）填写。

- Reviewer / Agent: fresh session plan-review subagent
- Verdict: `pass`
- Rounds: 1
- Findings addressed: 无 Blocker / Major。Minor（不阻塞）：plan header 含额外 `> Package:` / `> Work Item:` 元数据字段（模板未要求但无害，保留）；Phase 2 将 multiSort 累积键 UX 裁定（click vs shift-click vs `multiSort` 总开关）延后为 phase 内 Decision 项（符合 guide，Decision 是合法 item type）。引用准确性已逐条核对 live repo：`schemas.ts:39-60`/`:103-107` 行号准确；`table-renderer.tsx`(572)/`table-header-row.tsx`(310)/`table-body-rows.tsx`(386)/`table-body-row-rendering.tsx`(525) 行数与仓库一致；E1b plan Deferred successor（line 236-241 scope-level 持久化）存在且 `Successor Required: yes`；design.md §2 含 6 行 E1c 占位（含 popOver 漂移行 line 43），roadmap E1c 文本仅列 5 项，漂移裁定有据。

## Closure Gates

> 关闭条件：本 section + 每 Phase Exit Criteria 全 `[x]`，且独立 closure audit 通过。

- [x] 多列排序 / 多级表头 / 树表 / 行拖拽 / copyable / 列宽持久化 6 项能力全部 live 且有 focused 单测
- [x] `popOver 单元格` 标签漂移已修正（design.md 下调到 successor，不在 E1c scope）
- [x] E1b deferred successor（列宽 scope-level 持久化）已收口，E1b plan Deferred 节注记完成
- [x] table/design.md §2/§4/§5/§7/§10/§11/§12 同步 live baseline，无残留 E1c 占位
- [x] `existing-components-improvement-roadmap.md` E1c `todo`→`done`
- [x] `amis-baseline-matrix.md` table 行同步
- [x] anti-hollow：所有新 hook/helper 运行时可达，无空壳
- [x] 不存在被静默降级到 deferred 的 in-scope live defect / contract drift
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### column resize 与多级表头 / fixed 列交叉的 pixel-perfect 对齐

- Classification: `optimization candidate`
- Why Not Blocking Closure: 首版保证多级表头 + fixed 列渲染正确（内容对齐、不丢列），但极端列宽组合下的 sub-pixel 对齐属视觉打磨，不影响 supported baseline 成立。
- Successor Required: no
- Successor Path: 无独立 successor；归 E3 P2 视觉完善按需启动。

### 树表 + 虚拟滚动 大规模数据 perf

- Classification: `optimization candidate`
- Why Not Blocking Closure: 首版保证树表 + virtual 正确性（折叠分支不渲染），但超大树（万级节点）展开后的渲染 perf 归 §12 follow-up，不影响当前 supported baseline。
- Successor Required: no
- Successor Path: 归 E3 P2 / 后续 table perf plan。

### cell 级显式 `colSpan`/`rowSpan`（E1b follow-up 承接确认）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 源自 E1b Non-Blocking Follow-up，未指定 successor；本 plan 的 `combineNum`（声明式合并）已覆盖分组报表主场景，cell 级显式 span 属更细粒度控制，按需启动。
- Successor Required: no
- Successor Path: 无；按需开独立 plan。

## Non-Blocking Follow-ups

- `popOver 单元格` 实现归 E3 P2 / successor（本 plan 仅做 design.md 标签下调裁定）。
- 多列排序累积键（click vs shift-click vs `multiSort` 总开关）的 UX 最终裁定可在 E3 体验完善时复盘（本 plan Phase 2 内做临时 Decision 收口）。
- 树表父子选择级联语义与 E0b tree-select 族的对齐，若后续 crud/tree-select 场景需要，单独评估。

## Closure

Status Note: E1c table 高级能力 6 项（多列排序、多级表头、树表、行拖拽、copyable、列宽 scope 持久化）全部落地，focused 单测齐全（7 文件 / 56 用例），design.md 决策表 E1c 5 行全部翻转为 "实现"，popOver 单元格标签漂移已修正（下调到 E3/successor），E1b deferred successor 已收口并注记。`pnpm typecheck` 49/49、`pnpm build` 26/26、`pnpm lint` 26/26、`pnpm --filter @nop-chaos/flux-renderers-data test` 47 files / 416 tests 全过。独立 closure-audit 子 agent（fresh session）已逐 Phase 复核 live repo 并通过，本 plan 关闭。

Closure Audit Evidence:

- Reviewer / Agent: independent closure-audit subagent (fresh session, distinct from implementation session)
- Audit scope: 逐 Phase Exit Criteria vs live repo 核对、anti-hollow 抽查、deferred honesty、docs sync、five-point consistency。
- Live code verified:
  - `packages/flux-renderers-data/src/schemas.ts:25,60,61,110,111,112,113,114`：`draggable?/children?/copyable?/orderField?/rowChildrenField?/columnWidthsOwnership?/columnWidthsStatePath?` 全部存在；`multiSort` 也已在 schema surface。
  - `packages/flux-renderers-data/src/table-renderer/use-table-sort.ts`（309 行）：`multiSort: true` + shift-click 累积、单/多列 SortState 共存、controlled/scope/local 三 ownership；event payload 单列向后兼容。
  - `packages/flux-renderers-data/src/table-renderer/table-header-tree.ts`（82 行）：`extractLeafColumns`/`hasNestedColumns`/`computeHeaderRows` 多级表头 helper。
  - `packages/flux-renderers-data/src/table-renderer/use-table-tree.ts`（154 行）：`flattenTreeRows` + `useTableTree`，含循环引用 visited-set 防护。
  - `packages/flux-renderers-data/src/table-renderer/use-row-drag-sort.ts`（167 行）：HTML5 DnD + pointer 兜底；缺 orderField dev warn；`return null` 仅在 `!enabled` 时短路（非占位空壳）。
  - `packages/flux-renderers-data/src/table-renderer/copy-to-clipboard.ts`（55 行）：navigator.clipboard → execCommand → 静默 dev warn 三级降级。
  - `packages/flux-renderers-data/src/table-renderer/use-column-resize.ts`（231 行）：接 `columnWidthsOwnership`/`columnWidthsStatePath`；scope/local/controlled 三模式 + 缺 path 退化。
- Anti-hollow verified: `table-renderer.tsx:50,51,259,274,303` 运行时调用 `useTableTree`/`useRowDragSort` 并透传 `columnWidthsOwnership`；`table-header-row.tsx:29` 调用 `table-header-tree` helpers；`table-body-row-rendering.tsx:12,36` 调用 `copyToClipboard`。无空函数体 / 无不可达注册路径。
- Tests verified: `pnpm --filter @nop-chaos/flux-renderers-data test` → 47 files / 416 tests passed（重跑确认）；`pnpm --filter @nop-chaos/flux-renderers-data typecheck` 通过。`table-e1c-*.test.tsx` 7 文件覆盖各能力 happy path + 关键边界 + Failure Paths。
- Owner-doc sync verified: `docs/components/existing-components-improvement-roadmap.md:44` E1c `done`；`docs/components/table/design.md` §2 E1c 5 行 `实现` + popOver 行 `计划实现（E3/successor）`；`docs/components/amis-baseline-matrix.md` table 行无 retained 变化（No update required，已记录）；`docs/plans/2026-06-21-0331-e1b-...-plan.md:242` E1b deferred successor 已注记 `Resolved (2026-06-21) 已由 E1c plan Phase 7 收口`；`docs/logs/2026/06-21.md` E1c 收口段含各 phase landing 证据 + 验证结果 + anti-hollow 抽查清单。
- Deferred honesty: 3 项 Deferred（resize × 多级表头 pixel 对齐 / 树表 + virtual perf / cell 级显式 colSpan-rowSpan）均为 `optimization candidate` 或 `out-of-scope improvement`，附 Why Not Blocking Closure；无 in-scope live defect / contract drift 被静默降级。
- Five-point consistency: Plan Status `completed` / 8 Phase 全 `completed` / 各 Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]`（含独立 closure-audit 项）/ `docs/logs/2026/06-21.md` 收口记录 — 全部一致。
- Verdict: `approved`（零 Blocker / 零 Major）。

Follow-up:

- E1b deferred successor 已 resolved，无 live defect。
- Non-Blocking Follow-ups（popOver 实现 / multiSort 累积键 UX 最终裁定 / 树表父子级联语义）已在 §Non-Blocking Follow-ups 记录，归后续 successor。
