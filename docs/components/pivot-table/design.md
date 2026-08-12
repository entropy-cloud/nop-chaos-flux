# Pivot Table 组件设计

> 状态：implemented（renderer 已落地于 `@nop-chaos/flux-renderers-pivot`，2026-08-10；plan `docs/plans/2026-08-09-pivot-table-vtable-wrapper-plan.md`）
> 来源调研：`docs/analysis/2026-08-09-bi-control-support-analysis.md` §3.4（VTable 专项调研：MIT + DataWind 生产验证 + Chat2DB 命令式封装范本）
> 集成范本：Chat2DB `blocks/CanvasTable`（命令式 `new VTable.PivotTable(container, option)` + 实例事件 + 主题映射）

## 1. 组件定位

- `pivot-table` 是**交互式透视表** renderer：schema 声明 `rowDimensions`/`columnDimensions`/`indicators`，数据变换（聚合/小计总计/排序/过滤）由 VTable `PivotTable` 基座承担（Canvas 渲染，百万行级）。
- 它承接分析报告「路径 B：交互式 pivot」：相对 `table` 静态透视（路径 A，独立立项），pivot-table 提供前端聚合 + 展开下钻 + 动态列。
- 数据经 `records`/`source` 单向注入；**不声明任何挂载时自动请求字段**（请求下沉 `data-source`，同 graph/chart 裁定）。
- 只读透视核心：编辑、PivotChart、字段建模器（拖拽配置）不在首版（§12 Non-Goals）。

## 2. 与 AMIS 或既有产品的能力对照

AMIS 无等价透视控件（`table` 静态组合可模拟只读交叉，无交互式透视）。参考产品：火山引擎 DataWind（VTable PivotTable 最大生产案例）、pivot-table-uni（对照）、Excel 原生透视（交互形态参照）。

### Flux 决策表

> Flux 决策主语。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                                                                           | 采纳                                 | 不采纳              | 理由                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 行/列维度（`rowDimensions`/`columnDimensions`，字符串或 `{dimensionKey,title?,headerStyle?}`） | **实现**                             | —                   | 直接映射 VTable `rows`/`columns`；字符串形态归一化为 `{dimensionKey,title,headerType:'text'}`。                                                                                                                                |
| 指标（`indicators`：field/title/aggregationType/cellType）                                     | **实现**                             | —                   | `aggregationType`（SUM/AVG/COUNT/MIN/MAX/NONE，缺省 SUM）→ `dataConfig.aggregationRules`；`cellType` 首版限 text/progressbar/sparkline。                                                                                       |
| 小计/总计（`dataConfig.totals` 行/列两侧）                                                     | **实现**                             | —                   | showGrandTotals/showSubTotals/subTotalsDimensions/grandTotalLabel/subTotalLabel 逐字段映射 VTable `Totals`；未声明标志缺省 false（fail-closed）。                                                                              |
| 排序（`dataConfig.sortRules`：field + ASC/DESC 缺省 ASC）                                      | **实现**                             | —                   | 映射 VTable `SortRule`（sortField/sortType）。                                                                                                                                                                                 |
| 过滤（`dataConfig.filterRules` 声明式子集）                                                    | **实现**（`{field,operator,value}`） | 函数式 `filterFunc` | 首版仅 `=`/`!=`/`>`/`>=`/`<`/`<=`/`IN`/`NOT_IN`/`LIKE` 九种算子，编译为 VTable `filterFunc` 谓词；函数式不进 schema。                                                                                                          |
| 角标（`cornerTitleOnDimension`）                                                               | **实现**                             | —                   | 映射 VTable `corner.titleOnDimension`（row/column/none/all）。                                                                                                                                                                 |
| 命令式实例生命周期（创建/`setRecords` 增量/`updateOption` 全量/`release`）                     | **实现**                             | —                   | Chat2DB 模式：仅 records 变化 → `setRecords`（无 remount，实例 identity 稳定）；维度/指标/dataConfig/corner 变化 → `updateOption` 全量；卸载 → `release()`。                                                                   |
| 事件桥接（单元格点击/选区/排序/下钻/编辑）                                                     | **实现**                             | —                   | VTable `click_cell`/`selected_cell`/`sort_click`/`drillmenu_click`/`change_cell_value` → schema 事件（onCellClick/onSelectionChange/onSort/onDrill/onCellEdit），命名空间 payload type（§8）。单个回调抛错被捕获，不影响表格。 |
| 主题映射（flux design token → VTable theme）                                                   | **实现**                             | —                   | CSS 变量（`--background`/`--foreground`/`--border`）→ VTable theme（default/header/rowHeader/body/frame）；缺失回退 LIGHT 默认色；跟随 document root class 切换（MutationObserver，map 先例）；`theme` prop 可覆盖。           |
| loading / empty 态                                                                             | **实现**                             | —                   | `loading` → Spinner 占位；空数据/无合法 indicators → empty slot（value-or-region，缺省 `t('flux.common.noData')`），不创建实例。                                                                                               |
| records/source 双入口                                                                          | **实现**（source 优先）              | —                   | 沿用 chart `series`/`source` 裁定：二者同设时 source 优先 + dev warn（warn-once）。                                                                                                                                            |
| 单元格编辑 / PivotChart / 图表型 cellType（chart）                                             | —                                    | **不采纳**          | 首版只读透视核心；编辑与 PivotChart 依赖更多 schema 面，进后续版本（§12）。                                                                                                                                                    |
| 字段建模器（拖拽字段到行/列/值）                                                               | —                                    | **不采纳**          | 编辑器侧能力，与渲染器契约解耦，后续独立评估。                                                                                                                                                                                 |
| 服务端分页/流式加载                                                                            | —                                    | **不采纳**          | 数据经 `records`/`source` 全量进入，VTable 内部聚合。                                                                                                                                                                          |
| 组件级 `api` / `initFetch`                                                                     | —                                    | **不采纳**          | 请求下沉 `data-source` + action。                                                                                                                                                                                              |

### 2.1 关键裁定（实现依据）

1. **基座**：`@visactor/vtable`（锁定 `^1.26.6`，MIT）。不采纳 react-vtable（Chat2DB 同裁定：命令式封装保留实例控制面 + 生命周期明确）；不采纳 ag-grid（商业许可，分析报告 §3.2 路径 C）。
2. **包隔离**：独立包 `@nop-chaos/flux-renderers-pivot`（graph/gantt 先例）——VTable Canvas 渲染与 DOM table 体系分离，且 vrender 依赖系较重，不污染 `flux-renderers-data` bundle。
3. **数据更新策略**：option 签名（JSON 序列化，剔除 records 与函数）不变 + records 引用变化 → `setRecords`；签名变化 → `updateOption` 全量。无 remount（DD2 契约）。**`loading` 周期例外**：`loading=true` 时渲染占位替换 canvas div，实例走 release 路径（与 empty 同构）；`loading` 翻回 false 后因 instanceRef 为 null 走新建路径绑定新 canvas div（P1-02 修复：`loading` 在实例生命周期 effect deps 中，与 `empty` 对称）。
4. **`records` vs `source`**：`source` 为原始数据集优先，`records` 为直接数据；同设 source 优先 + dev warn（chart `series`/`source` 裁定延续）。
5. **内部 state 不进 scope**：实例、option 签名、事件 handler 镜像、warn-once 集合全部 renderer-local（ref/module）；对外仅经 `__flux_pivot_<id>` 程序化断言锚点暴露实例（scada `__flux_scada_<cid>` 先例的 id 化变体——cid 为 per-runtime 计数器，多 SchemaRenderer 并存时可能重复，故以 schema id 为键）。

## 3. Flux 中的 renderer/type 定义

- `type: 'pivot-table'`
- `category: 'data'`
- source package: **`@nop-chaos/flux-renderers-pivot`（已落地，2026-08-10）**
- 注册：`registerPivotRenderers(registry)`（`registerRendererDefinitions` 包装，graph 包模式）
- schema 类型：`PivotTableSchema`（`flux-renderers-pivot/src/schemas.ts`，barrel re-export）
- 主要 region: `empty`（value-or-region）

## 4. schema 设计

### 4.1 数据模型（运行期）

```ts
interface PivotTableSchema extends BaseSchema {
  type: 'pivot-table';
  records?: SchemaValue; // 直接数据入口（数组）；与 source 互斥
  source?: SchemaValue; // 原始数据集入口（数组），优先于 records
  rowDimensions?: (
    | string
    | { dimensionKey: string; title?: string; headerStyle?: Record<string, SchemaValue> }
  )[];
  columnDimensions?: (
    | string
    | { dimensionKey: string; title?: string; headerStyle?: Record<string, SchemaValue> }
  )[];
  indicators?: {
    field: string; // 必填；映射 indicatorKey + aggregationRules.field
    title?: string; // 缺省 = field
    aggregationType?: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'NONE'; // 缺省 SUM
    cellType?: 'text' | 'progressbar' | 'sparkline'; // 缺省 text
  }[];
  dataConfig?: {
    totals?: { row?: PivotTotals; column?: PivotTotals }; // PivotTotals = showGrandTotals/showSubTotals/subTotalsDimensions?/grandTotalLabel?/subTotalLabel?
    sortRules?: { field: string; sortType?: 'ASC' | 'DESC' }[]; // 缺省 ASC
    filterRules?: {
      field: string;
      operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'IN' | 'NOT_IN' | 'LIKE';
      value: SchemaValue;
    }[];
  };
  cornerTitleOnDimension?: 'row' | 'column' | 'none' | 'all';
  height?: number | string; // 缺省 320
  loading?: boolean;
  empty?: SchemaInput | string; // value-or-region
  theme?: Record<string, SchemaValue>; // VTable theme 覆盖（首版接收任意 key，映射层不深校验）
}
```

### 4.2 字段分类

- `records`/`source`/`rowDimensions`/`columnDimensions`/`indicators`/`dataConfig`/`cornerTitleOnDimension`/`height`/`loading`/`theme`: `prop`
- `empty`: `value-or-region`（regionKey `empty`）
- `onCellClick`/`onSelectionChange`/`onSort`/`onDrill`/`onCellEdit`: `event`

## 5. schema → VTable option 映射（`pivot-option.ts` 纯函数）

| Schema 面                      | VTable option 面                                    | 说明                                                                                                                  |
| ------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `records`（求值结果）          | `option.records`                                    | 非数组 → `[]`（走空态）                                                                                               |
| `rowDimensions`                | `option.rows`                                       | 字符串 → `{dimensionKey,title,headerType:'text'}`；对象保留 title/headerStyle                                         |
| `columnDimensions`             | `option.columns`                                    | 同上                                                                                                                  |
| `indicators`                   | `option.indicators` + `dataConfig.aggregationRules` | indicatorKey=field；title 缺省 field；cellType 缺省 text                                                              |
| `indicators[].aggregationType` | `aggregationRules[].aggregationType`                | 缺省 SUM；非法值 dev warn + NONE 降级                                                                                 |
| `dataConfig.totals`            | `dataConfig.totals`                                 | 未声明标志缺省 false；label/子维度仅声明时输出                                                                        |
| `dataConfig.sortRules`         | `dataConfig.sortRules`                              | `{sortField, sortType}`；非法 sortType dev warn + ASC                                                                 |
| `dataConfig.filterRules`       | `dataConfig.filterRules`（filterFunc 谓词）         | 九种算子 → 谓词；非法算子/缺 field 跳过 + dev warn                                                                    |
| `cornerTitleOnDimension`       | `corner.titleOnDimension`                           | 未声明不输出 corner                                                                                                   |
| design tokens（CSS 变量）      | `option.theme`（`mapDesignTokensToVTableTheme`）    | `--background`/`--foreground`/`--border` → default/header/rowHeader/body/frame；缺失回退 LIGHT 默认色                 |
| `theme`（schema 覆盖）         | `option.theme`（`mergeThemeOverrides`）             | 映射结果按 key 覆盖；section 级对象（defaultStyle/headerStyle/bodyStyle/frameStyle 等）深合并一层（保留映射层其余键） |

降级契约（`buildPivotOption` 返回 null 的条件）：**无任何合法 indicators**（空数组/全部非法）→ null → 渲染 empty slot + dev warn；非法维度/指标条目逐个跳过 + dev warn，不整体失败。

## 6. 运行期状态归属

- 实例（`instanceRef`）、option 签名（`optionSignatureRef`）、当前数据引用（`dataRef`）、事件 handler 镜像（`handlersRef`）、warn-once 集合：**renderer-local**，不进 schema-visible scope（INV-4）。
- 错误态（`initError`）：本地 state，构造失败渲染错误占位（Failure Path pivot-instance-fail）。
- 无 statusPath 投影（首版不发布只读 DTO；若宿主需要表格状态（排序/展开），经事件 payload 自行落 scope——与 graph 选中态发布同一组合模式）。

## 7. 事件桥接（`pivot-events.ts`）

| VTable 实例事件     | schema 事件键       | payload type             |
| ------------------- | ------------------- | ------------------------ |
| `click_cell`        | `onCellClick`       | `pivot:cell-click`       |
| `selected_cell`     | `onSelectionChange` | `pivot:selection-change` |
| `sort_click`        | `onSort`            | `pivot:sort-click`       |
| `drillmenu_click`   | `onDrill`           | `pivot:drill-click`      |
| `change_cell_value` | `onCellEdit`        | `pivot:cell-edit`        |

- payload 结构：`{ type, ...raw, col, row }`（raw 为 VTable 事件参数透传）。
- 派发约定（graph/table 同源）：`handler(payload, { event: payload, evaluationBindings: payload, scope })`，action args 模板可读 `${col}`/`${row}` 等裸绑定。
- 单个回调抛错 → try/catch + console.error，不影响表格与后续事件（Failure Path pivot-event-bridge）。

## 8. 数据源、表达式、导入能力接入点

- 数据由 `data-source` / scope 写入，`records`/`source` 经 `${expr}` 或字面量消费（chart 同款）。
- 无新 IO 类型；无 `xui:imports` 需求（VTable 实例为包内私有）。

## 9. 样式与 DOM marker 约定

- widget renderer（自样式 UI 控件）：内部布局类属于控件设计（styling-system widget 契约）。
- 根 marker：`.nop-pivot` + `data-slot="pivot-table"`；子 slot：`pivot-canvas`（VTable 挂载容器）、`pivot-loading`、`pivot-empty`、`pivot-error`。
- 高度经 `height` prop（缺省 320px）写容器 style；`styles.css` 提供 `min-height: 240px` 兜底。
- 主题经 CSS 变量读取映射（§5），不引入新 token 命名空间。

## 10. 失败路径

| 场景                 | 触发                                                      | 行为                                                                        | 可重试 | 用户可见表现                    |
| -------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- | ------ | ------------------------------- |
| pivot-empty-data     | records/source 为空或非数组                               | 渲染 `empty` slot（缺省 `flux.common.noData`），不创建 VTable 实例          | 是     | 空态提示，无报错                |
| pivot-option-invalid | indicators/维度配置非法（缺 field、维度与数据字段不匹配） | option 构建降级：跳过非法项 + dev warn；无任何合法 indicators 时走 empty 态 | 是     | 透视表缺失部分行列，控制台 warn |
| pivot-instance-fail  | VTable 构造抛错（容器不可见/配置异常）                    | try/catch 包裹，渲染错误占位 + console.error                                | 是     | 错误占位而非白屏                |
| pivot-theme-missing  | CSS 变量缺失（主题未初始化）                              | 回退 VTable 默认主题（LIGHT）                                               | 是     | 表格正常显示，样式为默认        |
| pivot-event-bridge   | 事件回调自身抛错                                          | 桥接层 try/catch，单事件失败不中断表格                                      | 是     | 交互无响应但不崩溃              |
| pivot-records-update | 运行期数据更新                                            | `setRecords` 增量更新（无 remount）；聚合/总计随之重算                      | 是     | 数据刷新不闪屏                  |

## 11. 测试策略

- 档位：`必须自动化`（本计划）。
- `pivot-option.test.ts`（32 用例）：三要素映射/聚合映射/totals 逐字段/corner/排序/过滤谓词语义/降级路径/theme 映射（failing-first 先红后绿）。
- `pivot-renderer.test.tsx`（18 用例）：mock VTable 类——挂载（正确 option + 实例暴露）/setRecords 无 remount/updateOption 全量/卸载 release/空态不建实例/构造抛错占位/事件桥接五事件 + 回调抛错隔离/loading 态。
- `pivot-renderer-definitions.test.ts`（4 用例）：propContracts shape 校验（合法 schema 零 diagnostics；非法聚合/角标/维度 emit diagnostics 而非抛错；example.json 零 diagnostics）——回归 propContracts `optional` 契约（编译期 shape 校验失败会导致 prop 被整体丢弃）。
- e2e `tests/e2e/pivot-table-demo.spec.ts`（3 用例）：Sales Pivot + Filtered 双卡片 canvas 渲染 + `__flux_pivot_<id>` 锚点；空卡片 empty slot；暗色主题切换实例存活。

## 12. Non-Goals / 后续候选

- 单元格编辑（`change_cell_value` 已桥接事件，但首版不启用 vtable-editors）。
- PivotChart、图表型 cellType（`cellType: 'chart'`）。
- 字段建模器（拖拽配置）——schema 声明式先行，建模器归编辑器侧独立评估。
- ComponentHandle 能力面（如 `refresh` 复用 data-source 语义）——先记录，不阻塞首版。
- 服务端聚合对照：路径 A（table 静态透视）落地后做行为对照测试。
- VTable 版本升级策略（锁定 `^1.26.6`，随上游 minor 更新复核 option 兼容）。

## 13. 原则审计（INV-1~5，2026-08-10，执行 session）

### INV-1 IO 边界

- 已列出 IO：无外部 IO（数据经 props/scope；VTable 为包内渲染库，Canvas 渲染无网络/存储/路由调用）。
- 归位情况：不适用（无 IO）。
- 例外项：无。

### INV-2 新 IO 类型

- 是否触发：否。

### INV-3 复用边界

- 表达式求值：经 `helpers`/编译期 props 解析（未自造 DSL）。
- 数据请求：经 `data-source`（renderer 无请求字段）。
- UI 元素：loading 占位用 `@nop-chaos/ui` `Spinner`；其余为 VTable Canvas 自身渲染面。
- 重造项检查：无。

### INV-4 内部 state 边界

- state 清单 + ownership：实例/签名/数据引用/handler 镜像/initError/warn-once → `local`（renderer 内部）；无 scope-owned 状态；无高频更新 state。
- 暴露通道：`__flux_pivot_<schema id>` 程序化断言锚点（只读实例句柄）。
- env 引用变化：不触发实例重建（无 env 依赖 effect）。

### INV-5 契约边界

- 签名为 `RendererComponentProps<PivotTableSchema>`；数据从 `props.props`/`meta`/`regions`/`events` 读；render 期无 `scope.get`；无平行组件协议；无 store 直访。
- 响应式读：数据流经编译期 props 解析（`records`/`source` 表达式随 scope 变化经 props 通道更新）；renderer 内无 selector hooks（数据全部经 props）。

### Checklist A-G 勾选状态

- A. IO 边界：✅ 无 IO；无直接浏览器 API 调用（`document`/`window` 仅用于主题解析与测试锚点，均带守卫）。
- B. 复用边界：✅ 无重造。
- C. 内部 state 边界：✅ 全 local。
- D. 契约边界：✅。
- E. 扩展点边界：✅ `empty` value-or-region + 5 事件。
- F. 样式边界：✅ `nop-pivot` marker + `data-slot`（无 BEM）；widget 自样式。
- G. 包结构：✅ workspace 模板（private/type:module/sideEffects:["*.css"]）；tsconfig 双份；vitest.shared；`vite.workspace-alias.ts` + `tsconfig.base.json` paths + 根 tsconfig references；playground `@import` + `registerPivotRenderers`；单一 `src/index.ts` 入口。

### 例外与未决项

- 无。
