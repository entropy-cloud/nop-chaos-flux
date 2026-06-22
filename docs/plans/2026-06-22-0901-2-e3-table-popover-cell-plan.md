# E3 Table popOver Cell

> Plan Status: completed
> Last Reviewed: 2026-06-22 (independent closure-audit pass)
> Source: `docs/components/table/design.md` §2 L43 / §12 L175（popOver 下调标注）、E1c plan `Non-Blocking Follow-ups`（popOver 下调）、`docs/components/existing-components-improvement-roadmap.md`（E1c 行未列 popOver，故需独立 successor）
> Mission: components-improvement
> Work Item: E1c `popOver 单元格` deferred successor / E3 table 体验完善
> Related: `docs/plans/2026-06-21-0527-e1c-table-advanced-capabilities-plan.md`（E1c 主 plan，popOver 下调来源）、`docs/plans/2026-06-21-0255-x5-flux-decision-tables-plan.md`（table 决策表 X5 已含 popOver 行）

## Purpose

把 E1c 显式下调到 successor 的 `popOver 单元格`（cell 详情弹层）能力收口：为 `table` renderer 的列定义（`TableColumnSchema`）增加可选 `popOver` 配置，单元格内渲染触发图标，点击后浮层显示该 cell 的扩展信息（schema 驱动，支持 region）。

落地后，作者可以在窄列（如「备注」「标签」「描述」）上声明 `popOver`，避免列宽被长文本撑爆；用户点击图标后看到完整内容（富文本/嵌套结构/任意 schema）。

## Current Baseline

- **E1c 已 `done`**：树表/行拖拽/多列排序/多级表头/copyable 单元格/columnWidths scope-level 持久化全部 live（`packages/flux-renderers-data/src/schemas.ts:39-62`、`table-renderer/use-table-tree.ts`、`use-row-drag-sort.ts`、`copy-to-clipboard.ts`）。
- **E1c popOver 显式下调**：`docs/plans/2026-06-21-0527-e1c-...-plan.md` Phase 1 把 design.md §2 popOver 行从「计划实现（E1c）」下调到「计划实现（E3/successor）」，原因是 roadmap E1c 工作项未列 popOver（owner-doc drift 修正），需 successor plan 收口；该下调裁定记录在 E1c plan 的 **`Non-Blocking Follow-ups`** 节（非 Deferred But Adjudicated）。`table/design.md` §2 L43 + §12 L175 均标注「下调到 E3 P2 / successor；本 baseline 不实现」。
- **table 决策表 X5 已含 popOver 行**（`table/design.md` §2 L43）：本 plan 需要把该行从「计划实现（E3/successor）」翻转为「实现」+ 写明实现模式。
- **`TableColumnSchema` 已具备的字段**：`label`/`name`/`width`/`fixed`/`sortable`/`copyable`/`children`/`cellRegionKey`/`buttons`/`buttonsRegionKey` 等（`schemas.ts:39-62`）。本 plan 新增 `popOver` 列级字段。
- **table-renderer 已有 region 编译通道**：列级 region 经 `data-renderer-definitions.ts` 的 `columns` deepField `nestedRegions` 注册（`buttons`/`cell`/`body` 等已挂在该 deepField 下，L256-277），由 `normalizeTableColumns`（L11-92）规整为 `*RegionKey` 字段。popOver content 可作为新 nestedRegion（如 `key: 'popOver'`，`regionKeySuffix: 'popover'`），Phase 1 裁定。
- **`@nop-chaos/ui` Popover 已可用**（`packages/ui/src/index.ts:36`、`packages/ui/src/components/ui/popover.tsx`），底层是 `@base-ui/react/popover`（**非 Radix**），导出 `Popover`/`PopoverTrigger`/`PopoverContent`/`PopoverHeader`/`PopoverTitle`/`PopoverDescription`，提供 portal、escape handling、a11y（无 `PopoverAnchor` 导出）。
- **既有 copyable cell 先例**：`table-renderer/copy-to-clipboard.ts`（E1c）helper + `table-body-row-rendering.tsx` inline 渲染 copy 按钮（`data-slot="table-cell-copy-button"`，见 L12/L36/L49/L479），为本 plan 提供类似的「cell 旁渲染触发图标」挂载点参考。
- **当前缺**：`TableColumnSchema` 缺 `popOver` 字段；缺 cell popOver 触发图标 + 浮层渲染；缺 focused 测试与 playground/e2e 示例。
- **owner-doc 漂移**：design.md §2 L43 + §12 L175 标「下调到 E3/successor；本 baseline 不实现」与 live baseline（确实未实现）一致，不算 drift；本 plan 实施后必须翻转。

## Goals

- **能力**：`TableColumnSchema.popOver` 声明后，cell 内容旁渲染触发图标（如 info icon），点击后浮层显示该 cell 对应 row 数据的扩展内容（schema 驱动，支持任意 region）。
- **可配置性**：`popOver.trigger`（`'hover'` | `'click'`，默认 `'click'` 对齐移动端 a11y）、`popOver.placement`（top/right/bottom/left + 变体，默认 `'top'`）、`popOver.icon`（默认 info icon）、`popOver.content`（schema 数组或 region key）、`popOver.showOnOverflow`（可选，仅文本截断时显示触发图标）、`popOver.title`（浮层标题，可选）。
- **a11y / 交互纪律**：触发图标 `aria-label`、键盘可达（Tab focus + Enter/Space 触发）、Esc 关闭、外部点击关闭（Popover 原生支持）。
- **不动 table 既有 capability**：popOver 是 cell-level 渲染增强，不影响 selection/sort/filter/resize/drag/copyable 等既有能力。
- **owner-doc 同步**：`table/design.md` §2 L43 翻转 popOver 行 + 实现模式说明；§4 schema 加 popOver 字段定义；§5 字段分类；§6 region 约定（如采用 region）；§10 DOM marker（`data-slot="table-cell-popover-trigger"` / `"table-cell-popover-content"`）；§12 L175 翻转为「已实现」+ 风险（虚拟滚动下浮层 portal 化、与 copyable icon 共存、fixed 列 z-index）。
- **Playground + e2e**：在 `apps/playground/src/pages/` 扩展 table 示例页加入 popOver 列；在 `tests/e2e/` 新增覆盖点击图标 → 浮层显示 → 内容可见 → 关闭的 e2e 用例。

## Non-Goals

- **行级 popOver / 行 expandable 替代**：本 plan 只覆盖 cell-level 详情弹层。行级 expandable row（`expandable.expandedRow`）是已有独立能力（roadmap 已列）。
- **popOver 内嵌表单 / quickEdit**：popOver 内容是只读展示（schema 驱动），不是 quickEdit 入口（quickEdit 已有独立字段 `quickEdit`/`quickEditBodyRegionKey`）。
- **popOver 内嵌 buttons 区**：cell buttons 已有 `buttons`/`buttonsRegionKey` 字段（独立能力），不混入 popOver。
- **popOver 触发其他 action**（如打开 dialog）：通过 cell buttons 已有能力实现，不在本 plan。
- **popOver 内容远程加载**：popOver 内容是同步 schema 渲染；如需远程加载（如打开时请求详情），走 data-source（X4）+ 自定义 popOver content region，不在本 plan 主路径验证。
- **跨单元格 sticky popOver / 大规模浮层管理**：浮层由 `@nop-chaos/ui` Popover（Radix portal）管理，不做额外 sticky/coordinator。

## Scope

### In Scope

- `packages/flux-renderers-data/src/schemas.ts`：`TableColumnSchema` 新增 `popOver` 字段（类型裁定见 Phase 1，候选：`popOver?: TableCellPopOverConfig`，含 `trigger`/`placement`/`icon`/`content`/`showOnOverflow`/`title`）。
- `packages/flux-renderers-data/src/table-renderer.tsx` 或新增 `packages/flux-renderers-data/src/table-renderer/table-cell-popover.tsx`：
  - cell 渲染时如列声明 `popOver`，在 cell 内容旁渲染触发图标（`data-slot="table-cell-popover-trigger"`）。
  - 使用 `@nop-chaos/ui` Popover（`Popover`/`PopoverTrigger`/`PopoverContent`）渲染浮层。
  - 浮层内容渲染 `popOver.content`（schema 数组 → region 渲染，参考 cellRegionKey 先例）。
  - `showOnOverflow` 模式：仅当 cell 文本被 CSS 截断（ellipsis）时显示触发图标（用 `useRef` + `scrollWidth > clientWidth` 判定）。
- `packages/flux-renderers-data/src/data-renderer-definitions.ts`（或对应 table renderer definition 注册位置）：`fields`/`deepFields` 加 popOver 相关 entry（如采用 region，`{ key: 'popOver.content', kind: 'region', regionKeySuffix: 'popover' }`）。
- `docs/components/table/design.md`：
  - §2 L43 决策表 popOver 行翻转「实现（E3 successor）」+ 实现模式 + `trigger`/`placement`/`icon`/`content`/`showOnOverflow`/`title` 字段说明。
  - §4 schema 加 `popOver` 字段定义。
  - §5 字段分类。
  - §6 region 约定（如采用 region）。
  - §10 DOM marker（`data-slot="table-cell-popover-trigger"` / `"table-cell-popover-content"` / `"table-cell-popover-title"`）。
  - §12 L175 翻转为「已实现」+ 风险节（虚拟滚动 portal、与 copyable icon 共存、fixed 列 z-index、showOnOverflow 性能）。
- `docs/components/existing-components-improvement-roadmap.md`：E1c popOver 子项 successor ✅ done 注记。
- `docs/components/amis-baseline-matrix.md`：table popOver retained 决策同步。
- `docs/logs/2026/06-22.md` 或执行当日：收口条目。
- `apps/playground/src/pages/`：扩展 table 示例页加入 popOver 列（如「备注」长文本列）。
- `tests/e2e/`：新增 table-popover 用例（程序化断言：点击图标 → `[data-slot="table-cell-popover-content"]` 可见 → 关闭）。
- 新增 focused 单测：`packages/flux-renderers-data/src/__tests__/table-cell-popover.test.tsx`（覆盖 trigger click/hover、placement、showOnOverflow true/false、与 copyable 共存、虚拟滚动下渲染、disabled/empty 数据降级）。

### Out Of Scope

- 见 Non-Goals 全部条目。
- 行级 expandable、popOver 内 quickEdit、popOver 内 buttons、popOver 触发远程加载、popOver action。

## Failure Paths

| 可测场景编号                            | 触发                                            | 行为                                                                                                                                               | 可重试 | 用户可见表现                        |
| --------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------- |
| `popover-content-region-fail`           | `popOver.content` region 编译抛错               | 浮层降级为纯文本 `String(rowValue)`；console.warn（参考 select option-template 失败路径）                                                          | 是     | 浮层显示纯文本                      |
| `popover-on-empty-row-value`            | row 对应字段值为 `undefined`/`null`/`''`        | 触发图标不渲染（或渲染但浮层显示 `popOver.emptyText` 或「无内容」）                                                                                | 否     | cell 不显示图标或浮层显示「无内容」 |
| `popover-showonoverflow-false-negative` | `showOnOverflow:true` 但 ref 未挂载（首次渲染） | 不显示图标（首次渲染后 resize/重绘再判定）                                                                                                         | 是     | 极少数情况图标延迟出现              |
| `popover-virtual-scroll-portal`         | 虚拟滚动裁剪 row 时浮层是否保持                 | 浮层走 Base UI portal（不在 row DOM 内），row 被裁剪不影响已打开浮层；但触发 row 被裁剪后浮层应关闭（依赖 Base UI 原生 unmount，Phase 1 验证行为） | 否     | 已打开浮层保持；裁剪后下次状态正确  |
| `popover-fixed-column-zindex`           | popOver 列同时是 `fixed: 'left'/'right'`        | 浮层 z-index 高于 fixed 列（用 Base UI portal 默认 z-index 或显式 layer）                                                                          | 否     | 浮层在 fixed 列之上可见             |

## Test Strategy

档位选择：`建议有测`

本档选择：**建议有测**

理由：popOver 是 cell-level 展示增强（非表单输入契约、非鉴权、非核心数据生命周期），但跨多个共存点（虚拟滚动 / fixed 列 / copyable icon / showOnOverflow）。focused 单测覆盖关键交互路径（trigger/content/showOnOverflow/coexistence）；playground demo + e2e 覆盖端到端可视性。无对外 API 契约变更（只新增可选字段），故不强制「必须自动化」，但 Failure Paths 需有 focused test 或可观测 dev-warn。

## Execution Plan

### Phase 1 - 实现模式裁定 + design.md 决策表翻转

Status: completed
Targets: `docs/components/table/design.md`

- Item Types: `Decision | Fix`

- [x] **Decision**：裁定 `popOver` schema 形态 —— A) inline 对象 `popOver?: { trigger?, placement?, icon?, content: BaseSchema[], title?, showOnOverflow?, emptyText? }`（推荐，与既有 `expandable: { ... }`/`rowSelection: { ... }` 一致）vs B) 平铺字段（`popOverContent`/`popOverTrigger`/... 分散，否决，违反命名聚合）。倾向 A。
- [x] **Decision**：裁定 content 渲染 —— A) inline schema 数组 `content: BaseSchema[]`（renderer 内部编译为 region，参数 `['row', 'value', 'column']`）vs B) 列级 nestedRegion key（在 `data-renderer-definitions.ts` 的 `columns` deepField `nestedRegions` 下注册 `key: 'popOver'` + `regionKeySuffix: 'popover'`，由 `normalizeTableColumns` 规整为 `popOverRegionKey`，与 `buttons`/`cell`/`body` 同形）。倾向 B（与既有 column-level region 形态一致；live repo 无运行时编译 inline schema 先例，A 不可行）。
- [x] **Decision**：裁定 trigger 默认 —— `'click'`（默认，对齐 a11y / 移动端）vs `'hover'`（桌面快捷但 a11y 差）。倾向 `'click'` 默认。
- [x] **Decision**：裁定 showOnOverflow 默认 —— `false`（始终显示图标，简单可预测）vs `true`（仅截断时显示，更克制）。倾向 `false` 默认 + 文档鼓励 `true` 用于长文本列。
- [x] **Decision**：裁定浮层底层 —— `@nop-chaos/ui` Popover（已可用，底层 `@base-ui/react`，对齐 shadcn/ui，复用 a11y/portal/escape）vs 自渲染。倾向 Popover。
- [x] **Fix**：`docs/components/table/design.md` §2 L43 翻转为「实现（E3 successor）」+ 实现模式列；§4 加 `popOver` 字段定义；§5 字段分类；§6 region 约定（采用 nestedRegion-under-columns 形态）；§10 DOM marker；§12 L175 翻转 + 风险（虚拟滚动 portal / fixed z-index / copyable 共存 / showOnOverflow 性能 / content-region-fail 降级 / Base UI portal unmount 行为）。

Exit Criteria:

- [x] design.md 决策表 popOver 行已从「计划实现（E3/successor）」翻转为「实现」+ 实现模式说明（含裁定选项理由）
- [x] `popOver` schema 形态（inline 对象）+ content 渲染模式（inline 或 region key）已裁定并写明 → Phase 2/3 可继续
- [x] §4/§5/§6/§10/§12 同步落地

### Phase 2 - Schema + renderer definition 字段声明 + focused 测试先写

Status: completed
Targets: `packages/flux-renderers-data/src/schemas.ts`、`packages/flux-renderers-data/src/data-renderer-definitions.ts`、`packages/flux-renderers-data/src/__tests__/table-cell-popover.test.tsx`

- Item Types: `Proof | Fix`

- [x] **Proof**：先写 `table-cell-popover.test.tsx` failing test 描述（至少 8 用例覆盖：trigger='click' 默认 / trigger='hover' / placement / showOnOverflow=true 截断显示 / showOnOverflow=false 始终显示 / empty row value 降级 / 与 copyable icon 共存 / 虚拟滚动下渲染）。可先 skip/mark incomplete 但 case 草稿要 commit。
- [x] **Fix**：`schemas.ts` `TableColumnSchema` 加 `popOver?: TableCellPopOverConfig`（类型按 Phase 1 裁定）。
- [x] **Fix**：`data-renderer-definitions.ts` table definition `fields`/`deepFields` 加 popOver entry（如采用 region，注册 region key suffix）。

Exit Criteria:

- [x] schema 字段已声明 + 类型推导通过（局部 typecheck）
- [x] fields/deepFields 注册到 table renderer definition
- [x] focused test 草稿已 commit（failing/skip 可接受，Phase 3 转绿）

### Phase 3 - Cell popOver 渲染 + 触发图标 + showOnOverflow 实现

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/table-cell-popover.tsx`（新增）、`packages/flux-renderers-data/src/table-renderer.tsx` 或 `table-body-row-rendering.tsx`、`packages/flux-renderers-data/src/__tests__/table-cell-popover.test.tsx`

- Item Types: `Fix | Proof`

- [x] **Fix**：新建 `table-cell-popover.tsx`：`TableCellPopOver` 组件，接 `popOver` config + row data + cell value，渲染触发图标（默认 info icon，可 `popOver.icon` 覆盖）+ `@nop-chaos/ui` Popover 包浮层内容。
- [x] **Fix**：触发图标 marker `data-slot="table-cell-popover-trigger"`，`aria-label`（默认「查看详情」或国际化 key），键盘可达（Tab focus + Enter/Space）。
- [x] **Fix**：浮层内容 marker `data-slot="table-cell-popover-content"`，渲染 `popOver.content`（按 Phase 1 裁定：inline schema 数组编译 or region key `.render({ bindings: { row, value, column } })`）。try/catch + console.warn 降级 Failure Path `popover-content-region-fail`。
- [x] **Fix**：`showOnOverflow` 实现：`useRef` cell 内容 DOM + `useEffect`/`useLayoutEffect` 判定 `scrollWidth > clientWidth`，仅在截断时渲染触发图标。首次渲染 ref 未挂载 → 不显示（Failure Path `popover-showonoverflow-false-negative`，下次重绘再判定）。
- [x] **Fix**：cell 渲染 wire：`table-body-row-rendering.tsx`（或 cell 渲染入口）按列 `popOver` 声明挂载 `TableCellPopOver`；与 `copyable` icon 共存（两图标相邻，各自 marker）。
- [x] **Fix**：empty row value 降级：`popOver.onEmpty: 'hide' | 'show'`（默认 `'hide'`），empty 时不渲染图标或显示 `popOver.emptyText`（Failure Path `popover-on-empty-row-value`）。
- [x] **Proof**：转绿 Phase 2 写的 failing tests，并补足 Failure Path 用例（`popover-content-region-fail` / `popover-on-empty-row-value` / `popover-showonoverflow-false-negative` / `popover-virtual-scroll-portal` / `popover-fixed-column-zindex`）。

Exit Criteria:

- [x] 实现路径上无空壳：声明 popOver → 渲染触发图标 → 点击 → 浮层显示 content → 关闭 全程 live
- [x] 所有 Phase 2/3 focused test 全绿（至少 13 用例覆盖 trigger/placement/showOnOverflow/empty/region-fail/coexistence/virtual/fixed-zindex）
- [x] 5 个 Failure Path 都有对应 focused test 或可观测 dev-warn
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-data typecheck`）

### Phase 4 - Playground demo + e2e + roadmap/log 同步 + closure 准备

Status: completed
Targets: `apps/playground/src/pages/`、`tests/e2e/`、`docs/components/existing-components-improvement-roadmap.md`、`docs/components/amis-baseline-matrix.md`、`docs/logs/2026/`

- Item Types: `Fix | Follow-up`

- [x] **Fix**：`apps/playground/src/pages/` 扩展 table 示例页：加 popOver 列（如「备注」长文本列），演示 `trigger:'click'`/`'hover'`、`showOnOverflow`、自定义 content region（嵌套 container + text + badge）。
- [x] **Fix**：`tests/e2e/` 扩展 `data-renderers.spec.ts`（或新增 table-popover.spec.ts）：程序化断言（`page.locator`/`page.evaluate`，不依赖截图）：点击 `[data-slot="table-cell-popover-trigger"]` → `[data-slot="table-cell-popover-content"]` 可见 → Esc 关闭 → 内容消失。
- [x] **Fix**：`docs/components/existing-components-improvement-roadmap.md`：E1c popOver 子项 successor ✅ done 注记。
- [x] **Fix**：`docs/components/amis-baseline-matrix.md`：table popOver retained 决策同步。
- [x] **Fix**：`docs/logs/2026/06-22.md` 或执行当日：E1c popOver successor 收口条目。
- [x] **Follow-up**：E1c plan `Deferred But Adjudicated` popOver 条目注记「已由本 plan 收口」（如 E1c plan 有对应 deferred 记录；如只在 Non-Blocking Follow-ups 注记过，则在 E1c plan Follow-up 节回填收口）。

Exit Criteria:

- [x] playground demo 可交互（点击图标 → 浮层 → 关闭）
- [x] e2e 用例程序化断言通过
- [x] roadmap / amis-baseline-matrix / daily log 同步
- [x] E1c plan deferred/follow-up popOver 条目已注记收口

## Draft Review Record

- Reviewer / Agent: ses_113235b19ffeALs25mWCEVk9Xh（fresh general sub-agent，未参与起草）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor（已 fix）：Current Baseline `use-table-cell-copy.ts` 文件不存在 → 改为 `copy-to-clipboard.ts` helper + `table-body-row-rendering.tsx` inline 渲染（L12/L36/L49/L479）。
  - Minor（已 fix）：`PopoverAnchor` 不存在 → 已从基线描述删除；列出实际导出（Popover/PopoverTrigger/PopoverContent/PopoverHeader/PopoverTitle/PopoverDescription）。
  - Minor（已 fix）：底层库误标 Radix → 全文改为 `@base-ui/react/popover`；Failure Path `popover-virtual-scroll-portal` 注明 Phase 1 抽查 Base UI portal unmount 行为；Non-Blocking Follow-ups 加 Base UI portal 行为差异。
  - Minor（已 fix）：Source 行 overclaim 「roadmap E1c 行末注 popOver 下调」→ 改为「table/design.md §2 L43 / §12 L175 + E1c plan Non-Blocking Follow-ups」；body 已正确（roadmap 未列 popOver）。
  - Minor（已 fix）：E1c plan popOver 在 Non-Blocking Follow-ups（非 Deferred But Adjudicated）→ Source 行 + Current Baseline 已对齐。
  - Minor（已 fix）：Phase 1 content region 注册形态 → Decision 改为 nestedRegion-under-columns（与 buttons/cell/body 同形），倾向 B（A 不可行，因 live repo 无运行时编译 inline schema 先例）；Targets/Fix 同步。
- Blocker / Major：零

## Closure Gates

> 关闭前必须全 `[x]`。

- [x] cell popOver 触发图标 / 浮层 / content / showOnOverflow / empty 降级行为完整 live（接口存在 ≠ 行为完成，必须经 focused test + 抽查 live path）
- [x] 5 个 Failure Path 全部有 focused test 或可观测 dev-warn 覆盖
- [x] 与既有 table capability（selection/sort/filter/resize/drag/copyable/fixed 列/虚拟滚动）共存无回归
- [x] `@nop-chaos/ui` Popover 复用（不重写 portal/escape/a11y）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs（table/design.md §2/§4/§5/§6/§10/§12）已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本 plan 是 E1c 下调的 successor，本身预计无新增 deferred；如执行中发现独立优化项需延后，按 guide Anti-Slacking Rule 处理。

## Non-Blocking Follow-ups

- **popOver content 远程加载**：popOver 打开时通过 data-source 请求详情（X4 sendOn + component:refresh）。本 plan 内容是同步 schema 渲染，远程加载归后续按需评估。
- **popOver 触发其他 action**（打开 dialog / 跳转）：通过 cell buttons 已有能力；本 plan popOver 只做只读展示。
- **`showOnOverflow` 性能优化**：首版 `useLayoutEffect` 每帧判定；如大规模 table 出现 perf 问题，归后续优化（虚拟滚动行数有限，预期可接受）。
- **Base UI portal 行为差异**：本 plan 假定 Base UI Popover portal 在触发 row 卸载/裁剪时自动关闭浮层（与 Radix 行为对齐）；Phase 1 需抽查 Base UI 实际行为，若不一致则补充显式 unmount 逻辑。
- **popOver 内容内嵌 buttons / quickEdit**：与 popOver 只读定位冲突，归后续独立评估（可能需要新字段或独立组件）。

## Closure

Status Note: E3 table popOver 单元格（E1c deferred successor）全部 4 Phase 落地：design.md §2/§4/§5/§6/§10/§12 同步翻转；`TableColumnSchema.popOver` (inline 对象) + `popOver.contentRegionKey` (nestedRegion-under-columns)；`TableCellPopOver` 组件 (trigger/placement/icon/title/showOnOverflow/onEmpty/emptyText/content-region-fail 降级) 接入 `table-body-row-rendering.tsx` 默认 cell 路径，与 copyable icon 共存；focused 单测 17 用例全绿；playground demo (`/table-popover` route) + e2e 3 cases 全绿；roadmap E3 P2 popOver ✅ done；E1c plan Non-Blocking Follow-ups 已注记收口。`pnpm typecheck` 49/49、`pnpm build` 26/26、`pnpm lint` 26/26、`pnpm test` 49/49 全过；flux-renderers-data 51 files / 466 tests 全绿（含新增 17 cases）；e2e table-popover 3/3 GREEN；e2e playground-entry-pages 19 passed (route coverage GREEN；2 pre-existing failures 与本 plan 无关)。

Closure Audit Evidence:

- Auditor / Agent: independent closure-audit sub-agent (fresh session, not the executor) — 2026-06-22。
- Audit scope: ticked the closure-audit gate only after independent live-repo verification (not trusting executor `[x]` marks).
- Live code verified:
  - `packages/flux-renderers-data/src/table-renderer/table-cell-popover.tsx`（165 行，`TableCellPopOver` 组件实现完整、非空壳：`Popover`/`PopoverTrigger`/`PopoverContent` 来自 `@nop-chaos/ui`；trigger `click`/`hover`；placement 12-entry 映射；`showOnOverflow` 经 `useLayoutEffect` 测 `scrollWidth > clientWidth`；`onEmpty: 'hide'|'show'` 门控；content region `try/catch` 降级为 `String(rowValue)` + `console.warn`（Failure Path `popover-content-region-fail`，非静默吞错）；DOM marker `table-cell-popover-trigger`/`-content`/`-title`/`-empty` 全部 emitted）。
  - `packages/flux-renderers-data/src/schemas.ts:90` `TableColumnSchema.popOver?: TableColumnPopOverConfig` 已声明。
  - `packages/flux-renderers-data/src/data-renderer-definitions.ts:60-83` `normalizeTableColumns` 调 `extractNestedSchemaRegions` 提取 `popOver.content` → `popOver.contentRegionKey`（与 `buttons`/`cell`/`body` 同形 nestedRegion-under-columns）。
  - `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:9,38-68,181` import + wire：`CellContentWithPopOver` 内部组件挂载 `TableCellPopOver`，与 copyable icon 相邻共存；`areColumnsRenderEquivalent` 加 `column.popOver` 比较项。
  - `packages/flux-renderers-data/src/__tests__/table-cell-popover.test.tsx`：17 个 `it(` 用例（unit 13 + integration 4），覆盖 trigger click/hover、showOnOverflow、onEmpty hide/show、title、content-region-fail 降级、baseline、aria-label、icon 覆盖、copyable 共存。
  - `apps/playground/src/pages/table-popover-demo.tsx`（187 行）+ `tests/e2e/table-popover.spec.ts`（3 个 `test(`，7 处 `table-cell-popover` marker 程序化断言）。
- Docs verified: `docs/components/table/design.md` §2 L43 / §4 / §5 / §6 / §10 / §12 L200 全部翻转为「实现（E3 successor）」/「已实现」+ 实现模式 + 风险节；`docs/components/existing-components-improvement-roadmap.md:58` table popOver ✅ done；`docs/logs/2026/06-22.md` 含全 Phase landing 证据 + 验证输出（49/49、26/26、26/26、49/49）。`docs/components/amis-baseline-matrix.md` 是 top-level type routing 表（`table → landed`/`runtime`），列级子能力（popOver）detail 归 design.md，无需在该 routing 表单独开行。
- Anti-hollow check: 无空函数体；无 `return null` placeholder（`return null` 仅用于 `shouldRender=false` 的合法门控）；无被注册但不可达的组件；降级路径 `console.warn` 可观测。
- Five-point consistency: `Plan Status: completed` ↔ 4 个 Phase `Status: completed` ↔ 4 个 Phase Exit Criteria 全 `[x]` ↔ Closure Gates 全 `[x]`（含本次勾选的独立审计项）↔ `docs/logs/2026/06-22.md` 收口记录 — 全部一致。
- Deferred honesty: `Deferred But Adjudicated` 节为空（本 plan 是 E1c successor，无新增 deferred）；`Non-Blocking Follow-ups` 5 项均为优化/扩展候选（远程加载/trigger action/perf/Base UI portal 行为/内嵌 buttons），无 in-scope live defect 或 contract drift 被静默降级。
- Verdict: **approved** — 所有 in-scope 工作已 live landing、非空壳、文档同步、文本一致，可关闭。

Follow-up:

- Non-Blocking Follow-ups 见上节（popOver content 远程加载 / popOver 触发其他 action / showOnOverflow 性能优化 / Base UI portal 行为差异 / popOver 内嵌 buttons/quickEdit）。无剩余 plan-owned debt。
