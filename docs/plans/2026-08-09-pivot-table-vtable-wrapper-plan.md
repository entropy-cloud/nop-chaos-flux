# pivot-table 渲染器封装计划（基于 VTable PivotTable）

> Plan Status: completed
> Last Reviewed: 2026-08-10
> Source: `docs/analysis/2026-08-09-bi-control-support-analysis.md`（3.4 节 VTable 调研）、`docs/plans/2026-08-09-bi-kpi-filter-chart-enhance-plan.md`（路径 B 归属）
> Related: `docs/references/new-renderer-introduction-audit.md`（INV-1~5）、`docs/references/complex-component-design-process.md`

## Purpose

将 VTable `PivotTable`（`@visactor/vtable`，MIT，字节 VisActor）封装为 nop-chaos-flux 的 `pivot-table` renderer：新建独立包 `@nop-chaos/flux-renderers-pivot`，schema 驱动（`rowDimensions`/`columnDimensions`/`indicators`/`aggregationRules`），命令式实例 + 事件桥接（参照 Chat2DB CanvasTable 模式），主题映射到 flux design token 体系，产出 design.md + example.json 并通过 INV-1~5 审计。

## Current Baseline

已核实（2026-08-09 live repo）：

- flux 无任何 pivot/透视能力；`table` 静态组合可模拟只读交叉，无交互式透视（分析报告 §3.1）。
- 新渲染器包先例 `@nop-chaos/flux-renderers-graph`：`src/index.ts` 导出 `registerGraphRenderers(registry)`（`registerRendererDefinitions` 包装）+ definitions + schema types；package.json 含 `sideEffects: ["*.css"]`、build/typecheck/test/lint scripts；需注册到 `vite.workspace-alias.ts`（含 `*/styles.css` alias）与根 `tsconfig.json` project references（`tsconfig.json:21` 为 graph 条目）。
- `RendererDefinition` 注册模式（`data-renderer-definitions.ts`）：`type`/`displayName`/`category`/`sourcePackage`/`component`/`propContracts`/`componentCapabilityContracts`/`schemaValidator`。
- Chat2DB 集成范本（`~/sources/Chat2DB/chat2db-community-client/src/blocks/CanvasTable/index.tsx`）：命令式 `new VTable.ListTable(container, option)` + `forwardRef`；更新走 `setRecords`/`updateColumns`/`theme=`；销毁 `release()`；交互挂实例事件；`useTableTheme` 做宿主主题 → VTable theme 映射。
- VTable 已本地调研（`~/sources/vtable` v1.26.6，MIT）：`PivotTable`/`PivotTableSimple`、`IPivotTableDataConfig`（aggregationRules/sortRules/filterRules/totals/derivedFieldRules/calculatedFieldRules）、`rows`/`columns`/`indicators` 数据契约、62 个 pivot demo、DataWind 生产验证。
- 新控件引入审计流程：`docs/references/new-renderer-introduction-audit.md` INV-1~5 为必查项。
- playground 示例页机制存在（`apps/playground`，需按既有示例模式加 BI 页）。

## Goals

- 新建独立包 `@nop-chaos/flux-renderers-pivot`（依赖隔离，graph/gantt 先例），导出 `registerPivotRenderers`。
- `type: 'pivot-table'` renderer：`records`/`source` 数据入口 + `rowDimensions`/`columnDimensions`/`indicators`/`dataConfig`（聚合/排序/过滤/小计总计）schema，与 VTable option 双向映射。
- 命令式实例生命周期（创建/更新/销毁）+ 事件桥接（单元格点击/选区/排序/下钻/编辑）。
- 主题适配：flux design token（CSS 变量）→ VTable theme 映射层，schema 可覆盖。
- 内部 state（实例、选区、展开、排序）renderer-local，不进 schema-visible scope（INV-4）。
- `docs/components/pivot-table/design.md` + `example.json` + playground 示例页 + INV-1~5 审计通过。

## Non-Goals

- VTable 全部能力平铺（只封装透视核心形态：维度/指标/聚合/总计/排序/过滤/展开；编辑、PivotChart、vtable-sheet 等不进入首版 schema）。
- `table` 静态透视路径 A（分析报告 §3.2「一期」table 能力增强，独立立项；不属于本计划，也不属于 `2026-08-09-bi-kpi-filter-chart-enhance-plan.md`——该计划已显式排除 pivot-table 全部路径）。
- 前端维度建模 UI（拖拽字段到行/列/值）——schema 声明式先行，交互式建模器后续单独评估。
- 地图、data-grid 等其他 BI 控件。

## Scope

### In Scope

- 包骨架（package.json/tsconfig/vite alias/根 tsconfig references/导出）。
- `PivotTableSchema` + option 映射纯函数（failing-first）。
- renderer 组件（实例生命周期、事件桥接、主题映射、loading/empty 态）。
- 注册（definitions + `registerPivotRenderers`）、playground 示例页。
- design.md + example.json + INV audit + daily log。

### Out Of Scope

- 编辑/填报模式、PivotChart 类型、单元格内图表（cellType chart）首版支持。
- 透视字段建模交互 UI（拖拽配置器）。
- 服务端分页/流式加载（数据经 `source`/`records` 全量进入，VTable 内部聚合）。

## Failure Paths

| 场景                 | 触发                                                      | 行为                                                                        | 可重试 | 用户可见表现                    |
| -------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- | ------ | ------------------------------- |
| pivot-empty-data     | records/source 为空或非数组                               | 渲染 `empty` slot（缺省 `flux.common.noData`），不创建 VTable 实例          | 是     | 空态提示，无报错                |
| pivot-option-invalid | indicators/维度配置非法（缺 field、维度与数据字段不匹配） | option 构建降级：跳过非法项 + dev warn；无任何合法 indicators 时走 empty 态 | 是     | 透视表缺失部分行列，控制台 warn |
| pivot-instance-fail  | VTable 构造抛错（容器不可见/配置异常）                    | try/catch 包裹，渲染错误占位 + console.error                                | 是     | 错误占位而非白屏                |
| pivot-theme-missing  | CSS 变量缺失（主题未初始化）                              | 回退 VTable 默认主题（LIGHT）                                               | 是     | 表格正常显示，样式为默认        |
| pivot-event-bridge   | 事件回调自身抛错                                          | 桥接层 try/catch，单事件失败不中断表格                                      | 是     | 交互无响应但不崩溃              |
| pivot-records-update | 运行期数据更新                                            | `setRecords` 增量更新（无 remount）；聚合/总计随之重算                      | 是     | 数据刷新不闪屏                  |

## Test Strategy

本档选择：`必须自动化`

schema → VTable option 映射与事件桥接是 renderer 核心契约（回归风险高），选 Must automate：Proof 项（failing 测试）先于 Fix 落地。VTable 为 Canvas 渲染，单测不依赖真实实例——option 映射抽为纯函数直测；renderer 行为以 mock VTable 实例验证（参照 chart 单测 mock recharts 先例）。

## Execution Plan

### Phase 1 - 包骨架与 schema 定义

Status: completed
Targets: `packages/flux-renderers-pivot/`（新）、`vite.workspace-alias.ts`、根 `tsconfig.json`、`pnpm-workspace.yaml`（自动 glob 覆盖）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] (Decision) 裁定包名 `@nop-chaos/flux-renderers-pivot`（graph/gantt 独立包先例）与 schema 字段集：
  - `records`/`source`（SchemaValue 表达式，数据入口，二者互斥或 source 优先——参照 chart 的 `series`/`source` 双入口裁定）
  - `rowDimensions`/`columnDimensions`: `Array<string | { dimensionKey: string; title?: string; headerStyle?: ... }>`
  - `indicators`: `Array<{ field: string; title?: string; aggregationType?: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'NONE'; format?: string; cellType?: 'text' | 'progressbar' | 'sparkline' }>`（首版限 text/progressbar/sparkline）
  - `dataConfig`: `{ totals?: { row?: { showGrandTotals; showSubTotals; subTotalsDimensions?; grandTotalLabel?; subTotalLabel? }; column?: {...} }; sortRules?: SortRule[]; filterRules?: FilterRule[] }`（filterRules 首版仅支持 `{ field; operator; value }` 声明式子集，函数式 `filterFunc` 不进 schema）
  - `cornerTitleOnDimension?: 'row' | 'column' | 'none' | 'all'`
  - `height?`、`empty`（value-or-region）、`loading?`、`theme?: { [key: string]: SchemaValue }`（VTable theme 覆盖）
- [x] (Fix) 创建包骨架（复制 graph 包模板）：package.json（依赖 `@visactor/vtable` 锁定 `^1.26.6`、`@nop-chaos/flux-core/flux-i18n/flux-react/ui` workspace、peer react）、tsconfig.json/tsconfig.build.json、src/index.ts（导出 `registerPivotRenderers` + definitions + types）。
- [x] (Fix) 注册别名与引用：`vite.workspace-alias.ts` 增加包 alias + `*/styles.css` alias；根 `tsconfig.json` project references 增加条目。
- [x] (Proof) 包级空转验证：`pnpm --filter @nop-chaos/flux-renderers-pivot typecheck` 通过（空 definitions 先落地）。

Exit Criteria:

- [x] 新包在 workspace 中可见，`pnpm typecheck`（包级）通过。
- [x] `PivotTableSchema` 类型定义存在，字段集与裁定一致。

### Phase 2 - schema → VTable option 映射纯函数

Status: completed
Targets: `packages/flux-renderers-pivot/src/pivot-option.ts`、`pivot-option.test.ts`

- Item Types: `Proof | Fix`

- [x] (Proof) 先写 failing 单测（核心契约）：
  - `rows`/`columns`/`indicators` 三要素映射（含维度对象形态与字符串形态归一化）
  - `aggregationType` → `dataConfig.aggregationRules` 映射（SUM/AVG/COUNT/MIN/MAX/NONE，缺省按 VTable 默认 sum 语义）
  - `totals` 行/列小计总计映射（showGrandTotals/showSubTotals/subTotalsDimensions/label 语义逐字段断言）
  - `cornerTitleOnDimension` → `corner.titleOnDimension`
  - 非法配置降级：无 indicators → option 构建返回 null（走 empty 态）；非法 aggregationType → dev warn + NONE
  - filterRules 声明式子集 → VTable filterRules 结构
- [x] (Fix) 实现 `buildPivotOption(schema, resolvedData)` 纯函数（输入 schema 求值结果，输出 `PivotTableConstructorOptions`），不含任何 DOM/实例依赖。
- [x] (Fix) theme 映射函数 `mapDesignTokensToVTableTheme()`：读取 CSS 变量（背景/边框/文字色/主题色）→ VTable Theme 结构；缺失回退默认。

Exit Criteria:

- [x] `pivot-option.test.ts` 全绿（含降级路径断言）。
- [x] `buildPivotOption` 为纯函数（无 DOM 依赖，可任意环境直测）。

### Phase 3 - renderer 组件封装

Status: completed
Targets: `packages/flux-renderers-pivot/src/pivot-renderer.tsx`、`pivot-renderer.test.tsx`、`pivot-renderer-definitions.ts`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] (Proof) 先写 failing 测试（mock VTable 类）：
  - 挂载：`new VTable.PivotTable(container, option)` 被以正确 option 调用；`onInit` 暴露实例
  - 数据更新：`setRecords` 被调用且无 remount（实例 identity 稳定，DD2 契约）
  - 配置更新：`updateOption`/字段级更新路径（裁定：schema 尺寸/维度/指标变化 → `updateOption` 全量；仅 records 变化 → `setRecords`）
  - 卸载：`release()` 被调用
  - 空数据：不创建实例，渲染 empty slot
  - 事件桥接：VTable `click_cell`/`selected_cell`/`sort_click`/`drillmenu_click`/`change_cell_value` 事件 → `props.events` 对应 handler（`onCellClick`/`onSelectionChange`/`onSort`/`onDrill`/`onCellEdit`），回调抛错不影响表格（Failure Path pivot-event-bridge）
- [x] (Fix) 实现 `PivotTableRenderer`（`RendererComponentProps<PivotTableSchema>` 契约，INV-5）：
  - 命令式实例 + 生命周期（创建/更新/销毁，Chat2DB 模式）
  - 内部 state（实例 ref、选区）renderer-local（INV-4）；表格状态写入走 `statusPath` 只读 DTO（若裁定需要，参照 table 模式）
  - loading/empty 态；实例构造 try/catch（Failure Path pivot-instance-fail）
  - 事件桥接层独立文件 `pivot-events.ts`（handler 注册/注销 + try/catch 包裹）
- [x] (Decision) 裁定 `records` 与 `source` 双入口语义（沿用 chart `series`/`source` 裁定：source 为原始数据集优先，records 为直接数据；二者同设时 source 优先 + dev warn）。
- [x] (Fix) `pivot-renderer-definitions.ts`：`type: 'pivot-table'`、category `data`、sourcePackage、propContracts（records/source/rowDimensions/columnDimensions/indicators/dataConfig/height/empty 等）、schemaValidator（校验 dimensions/indicators 结构，非法 dev warn 而非抛错）。
- [x] (Follow-up) 评估 ComponentHandle 能力面（如 `refresh` 复用 data-source 语义）——先记录，不阻塞首版。

Exit Criteria:

- [x] `pivot-renderer.test.tsx` 全绿（mock VTable 下：挂载/更新/卸载/空态/事件桥接/降级路径）。
- [x] 无直接 store 访问；实例与交互 state 均在 renderer 内部（INV-3/INV-4 自检通过）。

### Phase 4 - 注册与 playground 集成

Status: completed
Targets: `packages/flux-renderers-pivot/src/index.ts`、`apps/playground/src/`（示例页）、根 workspace 配置复核

- Item Types: `Fix | Proof | Follow-up`

- [x] (Fix) `src/index.ts` 导出 `registerPivotRenderers` + `pivotRendererDefinitions` + schema types（graph 包模式）。
- [x] (Fix) 按 `docs/references/new-renderer-introduction-audit.md` INV-1~5 逐条落地/自检（IO 边界：无新 IO 类型，数据经 props/scope；复用：表达式求值经 `helpers`；内部 state 本地化；契约守 `RendererComponentProps`）。
- [x] (Fix) playground 新增 pivot-table 示例页：销售数据透视（region×quarter 行、category 列、sales/profit 指标、小计总计）+ 空态示例 + 主题联动（跟随 playground 主题切换）。
- [x] (Proof) playground 示例验证：`pnpm dev` 手动走查（页面渲染、维度/指标正确、小计总计、排序点击、数据更新不闪屏、暗色主题切换）。
- [x] (Follow-up) 检查 `pnpm check` 新增包无违规（workspace-manifest-deps 等）。

Exit Criteria:

- [x] playground 示例页可运行（手测清单通过）。
- [x] INV-1~5 自检清单完成，无遗留 IO/state 越界。

### Phase 5 - 文档与收口准备

Status: completed
Targets: `docs/components/pivot-table/design.md`、`docs/components/pivot-table/example.json`、`docs/analysis/2026-08-09-bi-control-support-analysis.md`、`docs/logs/2026/08-09.md`

- Item Types: `Fix | Follow-up`

- [x] (Fix) `docs/components/pivot-table/design.md`：schema 字段表、option 映射对照表、事件桥接清单、主题映射说明、与 table 静态透视/路径 A 的关系、Non-Goals（编辑/PivotChart/建模器）。
- [x] (Fix) `docs/components/pivot-table/example.json`：完整可运行示例（与 playground 页一致）。
- [x] (Fix) 更新分析报告 §3.4：标注路径 B 已落地（landed）与包名。
- [x] (Fix) daily log 记录本计划执行摘要（`docs/logs/2026/08-09.md`，倒序）。
- [x] (Follow-up) 记录后续候选：字段建模器（拖拽配置）、PivotChart、编辑模式、`refresh` handle。

Exit Criteria:

- [x] design.md + example.json 存在且与 live renderer 行为一致（schema 字段逐一对应）。
- [x] 分析报告与 daily log 已同步。

## Draft Review Record

> 由独立子 agent（fresh session）执行；零 Blocker / 零 Major 后提升为 `active`。

- Reviewer / Agent: mission-driver 2026-08-09-182611（fresh session，未复用起草者上下文）
- Verdict: `pass`
- Rounds: 1
- Findings addressed:
  - [Major] Non-Goals 中路径 A 归属引用不实：`2026-08-09-bi-kpi-filter-chart-enhance-plan.md` 已显式排除 pivot-table 全部路径（含路径 A），分析报告 §3.2 将路径 A 列为「一期」table 能力增强、独立立项——已修正 Non-Goals 措辞，改为正确归属（分析报告 + 独立立项），不再指向 KPI 计划。

## Closure Gates

- [x] `pivot-table` renderer 在 playground 可运行（维度/指标/总计/排序/数据更新/主题切换走查通过）。
- [x] option 映射 + renderer 生命周期 + 事件桥接 focused 单测全绿。
- [x] INV-1~5 审计通过（`new-renderer-introduction-audit.md` 清单）。
- [x] `docs/components/pivot-table/design.md` + `example.json` 与 live baseline 一致。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 行为缺口。
- [x] 受影响的 owner docs 已同步（分析报告 §3.4、daily log）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### 透视字段建模交互 UI（拖拽配置器）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: schema 声明式即可完成透视表达；建模器属编辑器侧能力，与渲染器契约解耦，可后续独立评估。
- Successor Required: `no`

### 单元格编辑 / PivotChart / 图表型 cellType

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: VTable 能力丰富但首版只封装只读透视核心；编辑与 PivotChart 依赖更多 schema 面，进后续版本。
- Successor Required: `no`

## Non-Blocking Follow-ups

- ComponentHandle `refresh` 能力面评估（与 data-source 语义对齐）。
- 服务端聚合对照：路径 A（table 静态透视）落地后做行为对照测试。
- VTable 版本升级策略（锁定 `^1.26.6`，随上游 minor 更新复核 option 兼容）。

## Closure

Status Note: 5 Phase 全部完成：新包 `@nop-chaos/flux-renderers-pivot` 落地（schema 映射纯函数 32 用例 + renderer mock 单测 + definitions 校验 + playground 示例 + e2e 3/3），`pnpm typecheck` 37/37、`pnpm build` 37/37、`pnpm lint` 37/37、`pnpm test` 66/66 tasks、`pnpm check` 零新增未登记 red（仅既有登记：oversized 2 exempt locale + audit-event-dispatch-ctx 6 industrial + ai-engine-invariants ⑧×1/⑥×3）。两轮独立 closure-audit：首轮发现 schema `theme` 覆盖未落地（interface-vs-semantics gap）→ 实现 `mergeThemeOverrides`（section 级合并）+ 覆盖语义单测 + design.md §5 映射表补充 → 复审 `approved`。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent 两轮——首轮 task `ses_0171e742affeR9yFgBsdImH7oD` verdict `issues`（1 Blocker：theme 覆盖未实现）；修复后复审 task `ses_017145d7fffePZglslB7pj1xQi` verdict `approved`（9/9 checklist PASS，零剩余）
- Evidence: 复审逐项：Phases 全 completed / theme 覆盖（pivot-renderer.tsx:101-113 mergeThemeOverrides + resolved.theme dep；pivot-option.ts:374-395 section 合并；pivot-renderer.test.tsx:138-156 覆盖语义断言；design.md:108 映射表行）/ focused 55 passed + typecheck + lint / deferred 诚实 / `pnpm check` 仅既有登记红 / e2e 3/3 / 无残留临时文件

Follow-up:

- 字段建模器（拖拽配置）/ PivotChart / 编辑模式 / `refresh` handle —— 已记 design.md §12 后续候选（out-of-scope）。
- 服务端聚合对照：路径 A（table 静态透视）落地后做行为对照测试。
- VTable 版本升级策略（锁定 `^1.26.6`，随上游 minor 更新复核 option 兼容）。
