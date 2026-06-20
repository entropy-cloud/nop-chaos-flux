# 现有组件改进分析 — 逐组件明细（附录）

> 本文件是 `existing-components-improvement-analysis.md` 的附录，承载 §3 逐组件缺口明细。主文件保留执行摘要、跨组件共性、契约漂移登记表、工作项划分、待决问题。
> 分析日期: 2026-06-20（v1 amis-parity 明细；**v2 已重构主文件框架**）
> 数据来源: 5 个独立 explore agent 并行读取 Flux 实现 + Flux design.md + amis-react19 源码

> **⚠️ v2 阅读须知（重要）：** 本附录以 amis-parity 为参考主语编写，**但 amis 不是标尺**。下列每项"amis 有 Flux 无"的能力，是否真正采纳，必须按主文件 **§0.2 Flux 设计原则** 与 **§5 明确不采纳清单** 筛选：
>
> - 前端导出、echarts 相关、组件级 api 生命周期、散落条件属性（visibleOn 等）、button 的 level/actionType 判别树、选择族 amis 值编码（valueField/joinValues/...）、themeCss/borderMode、mobileUI 双实现、JS 函数串、路由/持久化 → **不采纳**
> - 保留项的新增字段命名必须对齐 shadcn/ui（见主文件 §2.6）
> - 严重度以主文件 §1.1（v2）为准，本附录严重度为 v1 口径，仅供对照
>
> 主文件 §5 是不采纳清单的权威；本附录保留 amis 全量对照仅作参考完整性。

**严重度口径（v1）：** P0 阻塞主流程 / P1 高频且迁移立即暴露 / P2 常见可绕过或边角 / P3 刻意收敛或低频
**设计状态口径：** `DESIGN-GAP`（文档沉默）/ `DESIGN-ACK-NOT-IMPL`（已规划未实现）/ `DESIGN-COVERS`（契约级已写但实现缺）/ `DESIGN-COVERS-BETTER`（Flux 超越 amis）/ `BY-DESIGN`（刻意不实现）/ `FLUX-ONLY`（amis 无对应物）

---

## A. 选择族（Choice）

### `select` — P0

**现状：** 单选，基于 `@nop-chaos/ui` Select（shadcn 风格），静态 `{label, value}` options，source 驱动一次性异步加载（spinner + error），option value 仅接受 string/number/boolean，纯文本 label。

**关键缺失（amis 有，Flux 无）：**

- 输入搜索过滤（`searchable` + `filterOption` + 高亮匹配）— 用户明确反馈的头号缺口
- 多选（`multiple`，tag 模式、`maxTagCount`、`overflowTagPopover`）
- 远程异步搜索（`autoComplete` SchemaApi + debounce 250ms + fetchCancel + mergeOptions）
- 虚拟滚动（`virtualThreshold` + `itemHeight`）
- clearable、creatable（`creatable` + `onAdd`）、editable/removable option
- 分组/嵌套 option（`option.children` 递归）
- option 模板渲染（`menuTpl`）
- selectMode 多模式（table/group/tree/chained/associated）
- checkAll、hideSelected、borderMode、overlay、defaultOpen
- 值编码（`joinValues`/`extractValue`/`delimiter`/`valueField`/`labelField`）
- `doAction` clear/reset、`reloadOptions`

**设计状态：**

- `DESIGN-ACK-NOT-IMPL`：`design.md:11` "搜索、多选、分组和复杂 option 渲染属于后续能力"；`design.md:23` "建议后续补齐 `multiple`、`searchable`、`clearable`"。注意 `placeholder` 文档说"建议后续补齐"但实际已实现 — 文档过期。
- `DESIGN-GAP`：autoComplete/searchApi、creatable、editable/removable、virtual scroll、tag mode、menuTpl、selectMode 多模式、checkAll、值编码、doAction、reload — 全部未提及。

**严重度：P0。** 选择控件是表单最高频控件，搜索/多选/异步搜索是日常刚需。

---

### `checkbox-group` — P1

**现状：** 多选，扁平 options，数组值，source 加载态，group 级 disabled/readOnly/required。

**关键缺失：** `checkAll`/`defaultCheckAll`/`checkAllText` + 半选 indeterminate、分组/嵌套 option、`columnsCount` 多列、`optionType: 'button'`、`menuTpl` 模板、creatable/addApi、editable/removable、`maxSelected`/`minSelected`（design 提及但无 schema field）、per-option disabled/disabledTip/description、值编码、doAction、reload。

**设计状态：** `DESIGN-ACK-NOT-IMPL`（checkAll/分组/maxSelected，`design.md:11,22`）；其余 `DESIGN-GAP`。

**严重度：P1。** checkAll 和 max/min selected 是真实表单高频需求。

---

### `radio-group` — P2

**现状：** 单选，扁平 options，纵向渲染，纯文本 label。

**关键缺失：** `optionType: 'button'`（按钮式/分段）、`columnsCount` 多列、`inline` 切换、分组/嵌套、`clearable`（再点取消）、per-option disabled/disabledTip/description、值编码、`renderLabel` 模板、doAction、reload。

**设计状态：** `DESIGN-ACK-NOT-IMPL`（button 模式/inline/description，`design.md:11,22`）；其余 `DESIGN-GAP`。

**严重度：P2。** 小固定 option 集常用场景已覆盖，缺口多为视觉/边角。

---

### `checkbox` — P2

**现状：** 布尔 toggle，`booleanStringAdapter`（仅 true/false），单 `option.label` 内联文本。

**关键缺失：** 自定义 `trueValue`/`falseValue`（如 `'Y'`/`'N'`、`1`/`0` — 集成高频需求）、`partial`/indeterminate（半选，"全选"父行必需）、`optionType: 'button'`、`option` 作为 SchemaNode/renderer（非纯字符串）、badge、controlled `checked`、description、size、doAction。

**设计状态：** `DESIGN-ACK-NOT-IMPL`（indeterminate/true-false 值/description，`design.md:11,23`）；其余 `DESIGN-GAP`。

**严重度：P2。** `trueValue`/`falseValue` 缺失迫使作者写 value adapter；indeterminate 缺失影响"全选"父行。

---

### `switch` — P2

**现状：** 布尔 toggle，`booleanStringAdapter`，`option.onLabel`/`offLabel` 内联。

**关键缺失：** 自定义 `trueValue`/`falseValue`、`loading` 态（`loadingConfig` spinner，异步切换确认必需）、`onText`/`offText` 作为 Icon/SchemaNode、size、level、`option` 独立 label、`optionAtLeft`、doAction、preventable change。

**设计状态：** `DESIGN-ACK-NOT-IMPL`（true-false 值/loading/确认切换，`design.md:11,23`）；其余 `DESIGN-GAP`。

**严重度：P2。** `loading` 和 `trueValue`/`falseValue` 影响异步确认和非布尔 payload。

---

### `tag-list` — P2（刻意收敛为主）

**现状：** 固定 `tags: string[]` 渲染为 toggle 按钮，点击切换数组包含关系。

**关键缺失：** amis `input-tag` 的自由文本输入、候选词下拉、`autoComplete`、`max`/`maxTagLength`/`maxTagCount`、`enableBatchAdd`+separator、键盘交互、`valueField`/`labelField`（对象 tag）、移动端。

**设计状态：** `BY-DESIGN` — `design.md:47,60` 明确拒绝自由输入/候选词库，要求组合 select/combobox。`DESIGN-ACK-NOT-IMPL`（autocomplete/预设/去重/max count，`design.md:11`）。`maxTagLength`/`maxTagCount`+overflow/batch-add/valueField 等为 `DESIGN-GAP`。

**严重度：P2（刻意收敛占主）。** 大部分"缺失"是 deliberate scope divergence，非疏漏。真正需补的是 max count/dedup/maxTagLength。

---

## B. 文本输入族（Text Input）

### `input-text` — P1（含正确性问题）

**现状：** `<Input type="text">` + `stringAdapter`，标准 field chrome。**schema 声明 `minLength`/`maxLength`/`pattern` 但实现既不收集为校验规则，也不传为原生属性 — 正确性缺口（详见主文件契约漂移登记表）。**

**关键缺失：** prefix/suffix 前后缀、`addOn` 按钮 addon、`clearable` 清空按钮、`trimContents`（blur 自动 trim）、`transform: {lowerCase, upperCase}`、`autoComplete` 异步建议下拉、`nativeAutoComplete`（HTML autocomplete 属性）、`showCounter` 字数计数、原生 maxLength/minLength 传到 `<input>`、`clearValueOnEmpty`、`borderMode`、可阻止事件 focus/blur/click/change/enter、doAction reset/clear/focus、`resetValue`。

**设计状态：** `DESIGN-ACK-NOT-IMPL`（clearable/前后缀/输入掩码，`design.md:11`）；其余 `DESIGN-GAP`。`design.md:10` 声称"已实现 maxLength、pattern"但实现未消费 — 文档与实现不符。

**严重度：P1。** prefix/suffix、clearable、trimContents、autoComplete 日常高频；maxLength/pattern 不生效是正确性问题。

---

### `input-email` — P1

**现状：** 同 input-text 工厂，额外加 `{kind:'email'}` 校验，HTML `type="email"`。

**关键缺失：** 同 input-text 全部 delta。

**设计状态：** `DESIGN-GAP` — `design.md:10` 仅说"与 input-text 基本一致"，未展开 amis delta。

**严重度：P1。** 同 input-text。

---

### `input-password` — P1

**现状：** 同 input-text 工厂，HTML `type="password"`。**无 reveal 切换、无强度提示。**

**关键缺失：** `revealPassword` 显示/隐藏切换（amis 默认开启，基础能力缺失）、review/encrypt 事件、input-text 全部 delta。

**设计状态：** `DESIGN-ACK-NOT-IMPL`（显示切换/强度/自动生成，`design.md:11,23`）；其余 `DESIGN-GAP`。

**严重度：P1。** reveal 切换是密码字段基线，缺失是可见 UX 回退。

---

### `textarea` — P1

**现状：** `<Textarea>`，固定 `rows`（默认 4）。

**关键缺失：** `minRows`/`maxRows` 自动高度（`react-textarea-autosize`）、`showCounter` 字数计数、`clearable`、`trimContents`、`borderMode`、`resetValue`、doAction、原生 maxLength。

**设计状态：** `DESIGN-ACK-NOT-IMPL`（自动高度/字数统计/markdown 模式，`design.md:11,23`）；其余 `DESIGN-GAP`。

**严重度：P1。** 自动高度和字数计数是长文本高频需求。

---

### `input-number` — P2

**现状：** `<Input type="number">` + clamp/precision，prefix/suffix 绝对定位，min/max/step/precision，`showStepper`（默认开），`keyboard`（方向键，默认开）。

**关键缺失：** 长按连续步进（amis rc-input-number 内建）、`formatter`/`parser`、`kilobitSeparator` 千分位、`unitOptions` 单位选择、`big` BigInt、`showAsPercent`、`displayMode: 'enhance'`、`borderMode`、`clearValueOnEmpty`、step 派生 precision（`step=0.01` 边角）、suffix 光标管理、doAction。

**设计状态：** `DESIGN-ACK-NOT-IMPL`（unitOptions/big/kilobitSeparator/displayMode/showAsPercent 等，`design.md:25-31,135` 有显式 AMIS 对照表逐项判定"不实现"）；长按步进/formatter/step-precision/光标/doAction 为 `DESIGN-GAP`。`design.md:25-31` 是文档纪律正面范本（逐项判定实现/不实现/未来 + 理由）。

**严重度：P2。** 显式 deferred 项是文档化权衡；真正未规划的是长按步进和 step-precision 正确性边角。

---

### `key-value` — P2（Flux 独有，amis 无直接对应）

**现状：** `flux-renderers-form-advanced`，`{id,key,value}` 行数组 + 每行删除 + "添加"按钮（`addLabel`），复合字段注册 + 每行 key/value 子路径 + per-cell visit/touch/validate + inline FieldHint + 删除后焦点恢复。校验：硬编码 `minItems:1` + 可选 `uniqueKeys`（→ key 上 `uniqueBy`）。无 form runtime 时回退 scope owner。

**关键缺失（vs amis InputArray/Combo 最近邻 + 通用最佳实践）：**

- 拖拽重排 / `component:moveItem`（Flux 无任何移动 UI）
- `minLength`/`maxLength` 键值对数量约束（Flux 硬编码 minItems:1，无上限）
- 重复 key 的 inline 高亮/警告（仅提交时单条 uniqueBy 消息）
- 类型化/schema 驱动的 value cell（Combo 的 per-item `items` schema；Flux value cell 固定字符串输入）
- 粘贴导入/批量添加（InputTag 的 `enableBatchAdd`+separator）
- `clear`/`reset`/`focus` actions

**设计状态：** 类型化 value schema/嵌套对象编辑 `DESIGN-ACK-NOT-IMPL`（`design.md:11`）；reorder/`component:moveItem` `DESIGN-ACK-NOT-IMPL`（`design.md:42`）；min/max 对数约束/重复 key inline UI/粘贴导入/clear-reset-focus `DESIGN-GAP`。

**严重度：P2。** amis 无等价物，无严格 parity 目标；真正未规划缺口是次要 UX 项（移动/可配置数量上下限）。当前实现覆盖文档化核心契约。

---

### `array-editor` — P2（amis InputArray 是扁平 Combo 别名）

**现状：** `flux-renderers-form-advanced`，`{id,value}` 单列字符串行数组 + 每行删除 + "添加"按钮（`itemLabel`），复合字段注册 + 每行 value 子路径 + per-item visit/touch/validate + FieldHint + 添加后焦点到新行/删除后焦点到前行或添加按钮。校验：硬编码 `minItems:1` + 每项 trim 后非空必填。无 form runtime 时回退 scope owner。

**关键缺失（vs amis Combo）：**

- 任意 per-item schema（`items`/`scaffold`；Combo 接受任意 renderer 类型 per 列）— Flux value cell 固定字符串输入
- 多列/`multiLine` 布局（Flux 单列）
- 拖拽重排（`draggable`/`sortable`）+ 上下移动按钮（Flux 均无）
- item 复制/`copyable`（Flux 无）
- `minLength`/`maxLength` 数量约束（Flux 硬编码 minItems:1，无上限）
- `addable`/`removable` toggle + 删除确认（`deleteConfirmDialog`）
- tabs 模式、条件 item、`flat` 扁平值输出（Flux 永远输出 `{id,value}` 对象）
- `clear`/`reset`/`focus` actions

**设计状态：** 自定义/多列 item schema `DESIGN-ACK-NOT-IMPL`（`design.md:11,23`）；拖拽/`component:moveItem` `DESIGN-ACK-NOT-IMPL`（`design.md:43`）；minLength/maxLength/item 复制/上下移动/addable-removable/删除确认/扁平值/clear-reset-focus `DESIGN-GAP`。

**严重度：P2。** 多数高端 Combo 能力（多列/tabs/任意 schema）明确 out of scope。真正未规划缺口是数量上下限和显式重排 UI（上下移动按钮），对简单字符串列表编辑器低频。

---

## C. 树族（Tree）

### `input-tree` — P1（含契约漂移）

**现状：** 内联树选择，`treeMode: normal|radio|checkbox`，source options，自定义 childrenKey/labelField/valueField，本地搜索过滤，`showPathLabel`，`onlyLeaf`，全键盘导航，source 加载/错误态。

**关键缺失：**

- 级联勾选 + 半选 indeterminate（`cascade`）— schema 声明了 `cascade?: boolean` 但 `toggleTreeSelection` 只翻转单个值，无父子传播、无 indeterminate 态 — 契约漂移（详见主文件登记表）
- `autoCancelParent`、`withChildren`/`onlyChildren`
- 异步懒加载（`deferApi`/`deferField`）— options 完全静态
- 远程搜索（`searchApi`）— 本地子串过滤
- 节点 CRUD（`creatable`/`editable`/`removable` + addApi/editApi/deleteApi/saveOrderApi）
- 虚拟滚动（`virtualThreshold`）
- `showIcon`/`enableDefaultIcon`/`iconField`（schema 声明但实现不渲染图标/引导线 — 契约漂移；注意 `showOutline` 仅在 InputTreeSchema 声明，TreeSelectSchema 只有 `showIcon`）
- `hideRoot`/`rootLabel`/`rootValue`、`enableNodePath`+`pathSeparator`（值作为路径串）
- `nodeBehavior`、`itemActions`、`highlightTxt`、`initiallyOpen`/`unfoldedLevel`（Flux 强制全展开）

**设计状态：** `DESIGN-ACK-NOT-IMPL`（节点 CRUD，`design.md:45-51`）；异步/远程搜索 `DESIGN-GAP`（`design.md:84` 仅泛泛一句）；cascade/图标 `DESIGN-GAP`（schema 有字段但无语义描述）；其余 `DESIGN-GAP`。

**严重度：P1。** 级联半选是多选树刚需；异步懒加载影响深树。

---

### `tree-select` — P1

**现状：** popover 触发 + 树面板，与 input-tree 共享 option 模型，`clearable`，`placeholder`。

**关键缺失：** 同 input-tree 全集（共享底层）。注意 `showOutline` 不适用于 tree-select（其 schema 仅 `showIcon`）。

**设计状态：** `DESIGN-ACK-NOT-IMPL`（creatable/editable，`design.md:14,16`）；异步/lazy `DESIGN-GAP`（`design.md:90` 泛泛）；cascade/icon/enableNodePath/virtualThreshold `DESIGN-GAP`。

**严重度：P1。** 层级选择器主力，级联半选是头号需求。

---

### `tree`（展示树）— P2

**现状：** 递归 TreeNode，`data` source，`childrenKey`/`labelField`/`keyField`，`node` region 模板，`empty` slot，`initiallyExpanded`，`expandOnClickNode`，roving tabindex 键盘导航，批量子节点渲染（同步）。**无值绑定、无选择态、无 checkbox。**

**关键缺失：** 节点选择 + 值绑定（checkbox/radio）、级联半选、`showIcon`/引导线、节点拖拽、节点 CRUD、异步懒加载（Flux 仅同步批量渲染）、搜索/过滤（Flux tree 无搜索 UI）、虚拟滚动、值编码、`nodeBehavior`/`itemActions`/`enableNodePath`/`unfoldedLevel`。

**设计状态：** `DESIGN-ACK-NOT-IMPL`（选择/级联/拖拽/编辑，`design.md:8,113-118` 明确"表单语义留给 input-tree/tree-select"）；搜索/异步/图标/虚拟滚动 `DESIGN-GAP`。

**严重度：P2。** 部分缺失是刻意分工（form 选择归 input-tree）；但拖拽/图标/搜索是通用树 UX，异步懒加载影响深远程树。

---

## D. 数据展示族（Data Display）

### `table` — P0

**现状：** 列驱动渲染，sortable（单列）、filterable/searchable 列头下拉、行选择（checkbox/radio，单页）、可展开行、分页、列显隐+最小上下移动、响应式、虚拟滚动（`virtualThreshold`）、quick edit、header/footer region、empty slot、loading、stripe/bordered、`component:refresh`/`getSelection`/`setSelection`、6 个事件。

**关键缺失（amis 有，Flux 无）：**

- 列宽拖拽 resize（amis **默认开**）— `grep resizable` 在 Flux table 源码无任何命中
- 单元格合并/行分组（`combineNum`/`combineFromIndex`，colSpan/rowSpan）
- 聚合行 footer（`prefixRow`/`affixRow` + classNameExpr）— Flux footer 是通用 region，非聚合行
- 表头吸顶 sticky header（`affixHeader`，amis 默认开）
- `autoFillHeight`（容器填充内滚动）
- `rowClassNameExpr`/`rowClassName`（按行动态 class）
- per-column `copyable`（复制到剪贴板）、per-column `popOver`（单元格详情弹层）
- 树表/嵌套表（`childrenColumnName`，递归子行）— Flux expandable 是单层 detail
- 行拖拽排序（`draggable` + sortablejs + `orderField`）
- `showIndex` 自增索引列
- 浮动 `itemActions`（按行 pin 的操作按钮）
- `tableLayout: 'fixed'|'auto'`
- 导出 Excel/CSV
- 多列排序/`sortDirections`/`defaultSortOrder`（Flux 严格单列）
- 多级表头（嵌套表头分组）
- per-cell `placeholder`（Flux 仅表级 empty）
- `lazyRenderAfter`

**设计状态：** 列拖拽 `DESIGN-ACK-NOT-IMPL`（`design.md:27,99`）；resize/合并/聚合/sticky/树表/行拖拽/导出/多列排序/多级表头/copyable/popOver/showIndex/itemActions/rowClassNameExpr 全部 `DESIGN-GAP`（`design.md` 完全未提及）。

**严重度：P0。** table 是最高价值数据 renderer；列宽 resize（amis 默认开）、聚合行、sticky header、树表、行拖拽、多列排序、copyable 单元格都是企业后台常规需求。

---

### `crud` — P0（含契约漂移）

**现状：** source 行 + `{items,total}` 结果消费，queryForm region，toolbar/footerToolbar region + `toolbarLayout` 块，listActions region，委托内嵌 table 共享 scope 状态路径，`$crud` 只读摘要 + statusPath，`clientMode.loadDataOnce`/`fetchOnFilter`，quickSave，autoClearSelectionOnRefresh，事件 + 组件句柄。

**关键缺失：**

- 自动轮询刷新（`interval`/`silentPolling`/`stopAutoRefreshWhen`/`stopAutoRefreshWhenModalIsOpen`）— Flux 仅手动 `onRefresh`
- 内置导出（`export-csv`/`export-excel` + `exportColumns`）— 无规范导出，需手搓 listActions 按钮
- 无限滚动分页 — Flux 仅有分页（`CrudToolbarItemConfig.type` 实际枚举为 `listActions|pagination|statistics|switch-per-page|columns-toggler`，无 load-more 类型）
- 可折叠查询区（`filterTogglable`/`filterDefaultVisible`）— Flux queryForm 永远内联可见
- 查询区作为 dialog/drawer
- `syncLocation`（URL 同步查询参数）— `DESIGN-ACK-NOT-IMPL`
- `parsePrimitiveQuery` — `DESIGN-ACK-NOT-IMPL`
- `autoGenerateQueryForm`（`autoGenerateFilter`）— schema 存在，runtime 未实现 `DESIGN-ACK-NOT-IMPL`
- 列拖拽排序 — `DESIGN-ACK-NOT-IMPL`
- 跨页选择保留 — **Flux schema 字段 `keepOnPageChange`/`maxSelectionLength`/`maxKeepSelectionLength`/`checkableWhen`（`crud-schema.ts:103-109`）存在但 `useTableSelection`/`crud-renderer-state.ts` 完全不消费 — 契约漂移（详见主文件登记表）**
- Cards/List/Grid 模式（amis CRUD 支持 table/cards/list/grid；Flux 仅 table）
- `clientMode.matchFunc` — `DESIGN-ACK-NOT-IMPL`
- 原生 api 生命周期（`api`+`initFetch`/`initFetchOn`/`sendOn`）— `BY-DESIGN`（Flux 用 source + data-source）
- `lazyRenderAfter`

**设计状态：** syncLocation/matchFunc/autoGenerateQuery/column drag/服务端分页 `DESIGN-ACK-NOT-IMPL`（`design.md:145,162,239,248,250`）；选择保留字段 `DESIGN-COVERS`（`design.md:221-224` 定义为 canonical Flux 字段 + amis→Flux 改名映射，但实现不消费）；auto-refresh/export/infinite scroll/collapsible filter/cards-list `DESIGN-GAP`。

**严重度：P0。** CRUD 是管理后台主力 renderer；自动刷新、导出、无限滚动、可折叠查询、跨页选择、cards 模式都是常规需求。

---

### `chart` — P1

**现状：** 基于 **recharts**，`chartType: bar|line|pie|scatter`，series，source，xAxis/yAxis，title，empty slot，ChartTooltip/ChartLegend，CSS 变量调色，`component:resize`，onClick/onHover，sr-only 数据摘要 fallback。

**关键缺失（amis 基于 echarts，能力差距本质性）：**

- 自由 echarts `config` 透传（amis 让作者直接写完整 echarts option）— Flux 被锁死在 4 类型固定 schema
- `api` + `initFetch`/`sendOn` 数据生命周期、`dataFilter`、`interval` 轮询、`trackExpression`、`replaceChartOption`
- 主题（`chartTheme` + `echarts.registerTheme`）
- 地图（`mapURL`/`mapName` + `echarts.registerMap`，热力/分级统计图）
- echarts 扩展（echarts-stat、echarts-wordcloud、bmap 百度地图叠加）
- 更多 series 类型：radar/funnel/gauge/sankey/graph/treemap/sunburst/parallel/themeRiver/boxplot/candlestick/heatmap
- 双 Y 轴/多 Y 轴
- `dataZoom`（滚动/刷选缩放）
- `toolbox`（存图/还原/数据视图/类型切换）
- `visualMap`
- 可选择 legend + `legendselectchanged`
- 混合 series 类型（柱+线组合）— Flux 强制全 series 单一 resolvedChartType
- 极坐标/radar/geo 坐标系
- `onChartMount`/`onChartWillMount` 生命周期、`clickAction`、drilldown/图表联动

**设计状态：** 数据缩放/双轴/联动/复杂 tooltip `DESIGN-ACK-NOT-IMPL`（`design.md:11`）；主题/地图/radar/visualMap/toolbox/config 透传/api/interval/trackExpression/onChartMount/混合 series `DESIGN-GAP`；series vs source 双入口 `DESIGN-GAP`（`design.md:64` 承认风险）。

**严重度：P1。** 固定 4 类型 + 固定 schema 设计刻意最小化，但缺 config 透传、双轴、更多 series、interval 轮询、api 生命周期使其不适合多数真实 dashboard。recharts vs echarts 选型分歧是更深的架构问题，需单独立项评估（见主文件待决问题）。

---

### `condition-builder` — P2（含契约漂移）

**现状：** AND/OR 嵌套 + 可选 `not`、`showAndOr`、`builderMode: full|simple`、`embed`、field-type→operator→value 三层映射、operator 覆盖、`searchable` field select、`uniqueFields`、`draggable`（dnd-kit 重排）、`maxDepth`/`maxItemsPerGroup`、i18n、值消毒、AMIS 格式转换、必填校验。

**关键缺失：**

- Formula 集成（`formula` + `formulaForIf`）— amis 集成 input-formula picker 让值侧可为公式；Flux `design.md:46-48` 示例 schema 列了 `formulas`/`formulaForIf` 但 `types.ts ConditionBuilderSchema` 根本没声明这些字段，实现无 formula picker — 契约漂移
- `showIf`（按组 `if` 条件表达式）— `types.ts:157` 声明 `showIf?: boolean` 但 `condition-group.tsx` 从不读它 — 契约漂移
- 远程 field source（`source: SchemaApi`）— Flux `types.ts:148` 只允许 `source?: string`（scope 路径）
- `selectMode: 'list'|'tree'|'chained'` — `types.ts:152` 声明三模式但 `field-select.tsx` 仅实现 list — 契约漂移
- 异步 field/operator 元数据加载
- formula-aware value editor（`formula` field type）
- `simple` 模式真正扁平单组限制（Flux simple 仅隐藏 AND/OR 开关仍允许嵌套）
- `description`/per-field description、`isRequired`/column-title、`labelsAndOp` 显示模式

**设计状态：** formula/showIf/异步/运算符扩展/深嵌套 `DESIGN-ACK-NOT-IMPL`（`design.md:13`）；formula schema — design 示例有但 types.ts 无（归类为 `DESIGN-GAP`，契约文档与代码不符）；showIf `DESIGN-GAP`（types 有 design 无语义）；selectMode tree/chained `DESIGN-GAP`；simple 模式语义 `DESIGN-GAP`。

**严重度：P2。** 已覆盖 80% 主流程；formula 集成是规则引擎场景最高价值缺口；showIf/selectMode 是 schema 声明但失效的契约漂移，需修复。

---

## E. 容器与表单族（Container & Form）

### `form` — P1

**现状：** body/actions region，data，`mode: normal|horizontal`，`labelAlign`/`labelWidth`/`gap`，statusPath/valuesPath，hiddenFieldPolicy，事件 initAction/submitAction/onSubmitSuccess/onSubmitError/onValidateError，组件句柄 submit/validate/reset/setValue/setValues/getValues，`$form` reactive 注入，提交失败聚焦首无效字段，FormLayoutContext，schema 校验。

**关键缺失：**

- inline/flex mode（仅 normal/horizontal；amis 4 模式）
- wizard/step mode（amis 顶层 Wizard.tsx，Flux 完全无）
- `api`/`submitApi`/`initApi`/`asyncApi` 声明式请求（`BY-DESIGN` — Flux 走 submitAction/initAction action graph）
- async submit 轮询（`asyncApi`+`checkInterval`+`finishedField`）
- `submitOnChange`/`submitOnInit`、`resetAfterSubmit`/`clearAfterSubmit`、`preventEnterSubmit`、`autoFocus`
- `promptPageLeave`/`promptPageLeaveMessage`（路由离开确认）
- `persistData`/`persistDataKeys`/`clearPersistDataAfterSubmit`（localStorage 草稿）
- `columnCount` 多列表单布局
- `horizontal` 比例配置对象（Flux 仅标量 labelWidth）
- `wrapWithPanel`、`affixFooter`（粘性操作栏）
- `rules` 跨字段组合校验规则数组
- `messages.validateFailed` 定制
- `redirect`/`reload`/`target` 声明式提交后行为
- `primaryField`/`primaryKeyName`
- `scrollToFirstError`（Flux 有 focus 无 scroll）
- `onReset`/`onValidChange`/`onSaved`/`onChange`/`onFailed`/`onFinished` 生命周期
- `debug`/`debugConfig` 调试面板（Flux 有独立 scope-debug renderer 未集成进 form）
- `title`/`header`/`panelClassName`（Flux form 无 header/title region）
- `static`/`staticOn` 只读预览模式

**设计状态：** 请求/提交下沉 action `BY-DESIGN`（`design.md:§4,§9`）；submitApi/data-source 边界 `DESIGN-ACK-NOT-IMPL`（`design.md:§16`）；inline/flex/wizard/submitOnChange/submitOnInit/resetAfterSubmit/preventEnterSubmit/autoFocus/promptPageLeave/persistData/columnCount/horizontal/wrapWithPanel/affixFooter/rules/redirect/reload/target/scrollToFirstError/static/debug 全部 `DESIGN-GAP`。mode 文档只列 2 值（`design.md:§13.1`）— inline/flex 被静默排除而非延后。

**严重度：P1。** 多数项是刻意 scope 收敛（action-graph 哲学），但 columnCount、inline mode、submitOnChange、preventEnterSubmit、autoFocus、onReset、scrollToFirstError、static 预览、rules 组合校验是表单 shell 上预期存在的高频能力，缺失且未文档化。

---

### `fieldset` — P3

**现状：** title/collapsible/collapsed/gap/body/bodyClassName/titleClassName，Collapsible shell，`<fieldset>/<legend>`，chevron 切换，aria-controls，不创建 scope。

**关键缺失：** `titlePosition: top|bottom`、`collapseTitle`（折叠态不同标题）、`mountOnEnter`（首次展开懒挂载，Flux 用 keepMounted 反向）、`unmountOnExit`、`subFormMode`/`subFormHorizontal`（`BY-DESIGN` 排除，`design.md:§4`）、`title` 作为 SchemaTpl（Flux 仅字符串）。

**设计状态：** subFormMode/subFormHorizontal `DESIGN-ACK-NOT-IMPL`（刻意）；titlePosition/collapseTitle/mountOnEnter/unmountOnExit/模板 title `DESIGN-GAP`。注意 schema 文档未列已实现的 gap/bodyClassName/titleClassName — 文档正向也过期。

**严重度：P3。** 小工具；mountOnEnter/unmountOnExit 最有用，但 Flux keepMounted 策略是为保 form-runtime 草稿的刻意权衡。

---

### `container` — P3

**现状：** direction/wrap/align/gap/body/header/footer + 各 className，三 region shell，flex 包裹条件，`nop-container` marker。

**关键缺失：** `wrapperComponent`（自定义标签）、`wrapperBody`、`style`（自由内联样式，Flux 仅 className）、`size` 预设、`draggable`+`draggableConfig`（DnD 容器）、click/mouseenter/mouseleave 事件分发（Flux container 无任何事件钩子）、`disabled` 传播、themeCss。

**设计状态：** draggable/variant/collapsible/padding `DESIGN-ACK-NOT-IMPL`（`design.md:§5,§15` 刻意排除）；wrapperComponent/wrapperBody/style/size/事件分发 `DESIGN-GAP`。

**严重度：P3。** 刻意保持薄。无 `style` prop 和无 DOM 事件分发是最常见真实缺口，易补；但按 P3 定义（不影响主流程）定级，因多数场景可用 flex/container 组合绕过。

---

### `flex` — P2

**现状：** direction(row|column)/wrap/align/justify/gap/className，body/items 双 region，`nop-flex` marker。

**关键缺失：** `direction: row-reverse|column-reverse`、`justify: space-evenly`、`align: baseline`、`alignContent`（多行交叉轴分布，Flux 完全无）、`style`、`flex-item` 专用子类型（per-child flex/basis/grow）、per-child disabled 传播。

**设计状态：** draggable `DESIGN-ACK-NOT-IMPL`（`design.md:§8`）；alignContent/baseline/\*-reverse/space-evenly/flex-item/style `DESIGN-GAP`。

**严重度：P2。** alignContent、baseline、\*-reverse、space-evenly 是纯枚举扩展；flex-item 缺失使 per-child 弹性尺寸无法表达。

---

### `page` — P2

**现状：** title/data/statusPath/body/header/footer/modalContainer + className，title 渲染为 `<h2>`，header 为 toolbar，refreshTick 响应式订阅发布 `PageStatusSummary`，`nop-page` marker。

**关键缺失：**

- `aside` region + `asideResizor`（拖拽分隔）+ `asideSticky` + `asidePosition: left|right` + `asideMinWidth`/`asideMaxWidth` + `asideClassName` — 完整侧边栏布局，Flux page 完全无 aside
- `subTitle`、`remark`（标题旁 info 弹层）
- `initApi`/`initFetch` 页面级数据拉取（`BY-DESIGN` — 走 data-source）
- `interval`/`silentPolling`/`stopAutoRefreshWhen` 页面级轮询（Flux 仅 refreshTick 响应通道）
- `toolbar` 独立 region（amis 同时有 header 和 toolbar）
- `regions` 强制显隐
- `pullRefresh`（移动端下拉刷新）
- `css`/`mobileCSS`/`cssVars`（页面级样式表/CSS 变量）
- `meta`、`showErrorMsg`、`promptPageLeave`、`definitions`、`redirect`/`reload`

**设计状态：** 面包屑/toolbar/生命周期/路由 `DESIGN-ACK-NOT-IMPL`（`design.md:§2,§13`）；aside/subTitle/remark/pullRefresh/initApi/polling/css/definitions/promptPageLeave `DESIGN-GAP`。

**严重度：P2。** aside + 可调侧边栏是 amis page 在管理布局中的重头特性，完全缺失是单点最大缺口；subTitle/remark/initApi/轮询常被预期。阻塞 amis page schema 直接迁移。

---

### `tabs` — P2

**现状：** items/value/defaultValue/valueOwnership/valueStatePath/statusPath/toolbar/orientation/variant/tabsMode(多模式)/sidePosition/contentClassName/toolbarClassName，item schema(key/value/title/label/disabled + 3 region key)，组件句柄 setValue/getValue，onChange 事件，title 回退链，keepMounted=true 硬编码，sidebar-right，disabled 检测，`TabsStatusSummary`。

**关键缺失：**

- per-tab `mountOnEnter`/`unmountOnExit`（Flux keepMounted 硬编码 true，重表单每 tab 场景相关）
- per-tab `badge`（数值角标）、per-tab `icon`/`iconPosition`、per-tab `reload`、per-tab `mode`/`subFormMode`
- `addable`+`addBtnText`、`closable`+`deleteTab`+`remove`/`removeItem` 事件、`draggable`、`editable`（双击编辑标题）、`showTip`+`showTipClassName`、`collapseOnExceed`+`collapseBtnLabel`、`swipeable`（移动）、`hash`+URL 同步、`source` 直接绑定

**设计状态：** closable/addable/draggable/editable/showTip/collapseOnExceed/swipeable/hash/deleteTab `DESIGN-ACK-NOT-IMPL`（`design.md:§3,§17,§19` 大量显式列举）；per-tab badge/icon/reload/mode、mountOnEnter/unmountOnExit、source `DESIGN-GAP`。

**严重度：P2。** 文档对延后项列举异常充分；mountOnEnter/unmountOnExit 对重表单每 tab 页尤其相关；per-tab badge/icon 在管理 UI 极常见。

---

## F. 表面族（Surface：dialog / drawer）

### `dialog` — P1

**现状：** title/body/actions region，data，open/defaultOpen，statusPath，closeOnOutsideClick，container，showMask，onOpen/onClose 事件，共享 SurfaceRuntime，declarative 与 openDialog action 漏斗同栈，runtime 子 scope，受控/非受控，statusPath 发布，重新打开新建 scope。

**关键缺失：**

- `closeOnEsc`（Esc 关闭）— 无
- `size` 预设（xs/sm/md/lg/xl/full）
- `width`/`height` 显式尺寸
- `showCloseButton` toggle、`draggable` + 拖把、`allowFullscreen` + setFullScreen
- `overlay`（modal vs modeless）— Flux 有 showMask 但无干净 modeless 路径
- `dialogType: 'confirm'`、独立 `header`/`footer` region（Flux footer 折进 actions）、`headerClassName`
- `confirm`（默认 true，actions 省略时自动生成 cancel/confirm 按钮）
- `showErrorMsg`/`showLoading` 叠层
- `msg`/`confirmText`/`cancelText`/`confirmBtnLevel`/`cancelBtnLevel`/`inputParams`
- 动画/过渡钩子（entered/exited 驱动生命周期事件）
- 嵌套 dialog 深度跟踪
- `lazyRender`/`lazySchema`

**设计状态：** size/showCloseButton/component:open|close|toggle `DESIGN-ACK-NOT-IMPL`（`design.md:§4,§8`）；draggable `DESIGN-GAP`（`design.md:§10` 提 UI primitive 支持但 schema 未暴露）；closeOnEsc/width/height/fullscreen/overlay/confirm type/header-footer region/confirm 按钮/error-loading 叠层/msg/confirm-cancel 文本/inputParams/lazyRender/动画事件 `DESIGN-GAP`。

**严重度：P1。** closeOnEsc、size 预设、width/height、header/footer region 是高频 amis dialog 特性。

---

### `drawer` — P1

**现状：** 同 dialog 但 `side: left|right|top|bottom`，其余共享 SurfaceRuntime。

**关键缺失：** 同 dialog 全集，外加：

- `closeOnOutside` — **dialog 有 closeOnOutsideClick，drawer schema 无 — 不对称 bug**
- `resizable`（拖拽调整 drawer 尺寸）
- `width`（左右）/`height`（上下）显式尺寸
- `bodyClassName`/`headerClassName`/`footerClassName`（drawer schema 连 bodyClassName 都不暴露）

**设计状态：** size/showCloseButton/component:open|close|toggle `DESIGN-ACK-NOT-IMPL`；closeOnEsc/closeOnOutside（不对称）/width/height/resizable/overlay/header-footer region/className slot/confirm/showErrorMsg/inputParams/lazyRender/动画事件 `DESIGN-GAP`。

**严重度：P1。** 同 dialog；closeOnOutside 与 dialog 不对称是显式 bug。迁移 amis drawer（`width:500`+`closeOnEsc:true`+`resizable:true`+footer toolbar）当前不可能。

---

## G. 动作族（Action）

### `button` — P1

**现状：** label/variant(6 值)/size(8 值)/disabled，单 onClick 事件，`<Button>` 硬编码 `type="button"`。**无 icon、无 loading、无 tooltip、无 badge、无 hotkey、无 async。**

**关键缺失：**

- `icon`+`iconClassName` + `rightIcon`+`rightIconClassName` — 无
- `loading`/`loadingOn`/`loadingConfig`/`loadingClassName` — 无
- `tooltip`+`tooltipPlacement`+`tooltipTrigger`+`tooltipContainer`+`tooltipRootClose` + `disabledTip` — 无
- `confirmText`+`confirmTitle`（内置确认 dialog，`BY-DESIGN` 路由 action 层）
- `level` 映射（info/success/warning/danger/link/primary/dark/light/secondary — Flux variant 无 info/success/warning/dark/light 语义级）
- `hotKey`（hotkeys-js 全局热键）
- `badge`（per-button 角标）
- `countDown`+`countDownTpl`（点击后倒计时禁用 + localStorage 持久化）
- `block`（全宽）、`active`+`activeLevel`+`activeClassName`（toggle 态）
- `href`/`link`/`actionType:'link'`（真链接按钮 + isCurrentUrl active 检测）
- `target`/`reload`/`redirect`/`close`/`mergeData`（提交后行为）
- `actionType` 判别（ajax/dialog/drawer/toast/copy/reload/email/download/saveAs/url/behavior）— Flux button 纯 click→onClick action graph
- `api`/`asyncApi`（`BY-DESIGN` 走 action）
- `disabledOnAction`、`requireSelected`
- `onMouseEnter`/`onMouseLeave` 事件
- `body` region（富自定义内容）
- `isMenuItem`+`componentClass:'a'`、`tabIndex`
- amis `type: button|submit|reset` 表单集成（Flux 硬编码 button，submit 走 component:submit action）

**设计状态：** link/loading/icon/confirm/body region `DESIGN-ACK-NOT-IMPL`（`design.md:§2,§4,§6,§7,§11`）；tooltip/disabledTip/hotKey/badge/countDown/block/active/isMenuItem/tabIndex/disabledOnAction/requireSelected/hover 事件/actionType 判别树 `DESIGN-GAP`。

**严重度：P1。** button 是最常用 renderer；icon、loading、tooltip、hotKey、badge、block、active、confirmText 缺失使几乎所有 amis button schema 无法干净迁移。

---

## H. 代码/结构/杂项族（Code/Structural/Misc）

### `code-editor` — P1

**现状：** 8 语言（expression/sql/json/javascript/typescript/html/css/plaintext），3 模式（expression/template/code），props（width/height/lineNumbers/folding/autoHeight/allowFullscreen/editorTheme/options/readOnly/disabled/required），onChange/onFocus/onBlur，表达式模式补全/lint/friendlyName，SQL 模式 tables/dialects/completion/format/snippets/variable panel/执行预览，全屏切换。

**关键缺失：**

- diff 编辑器模式（amis 独立 `diff-editor` renderer + `diffValue` 并排）— Flux 无
- 只读代码高亮显示（amis `Code.tsx` `type:'code'` monaco colorize + customLang/tabSize/wordWrap/maxHeight）— Flux text 是纯 String()
- 40+ 语言预设（amis 覆盖 bat/c/cpp/csharp/dockerfile/go/java/less/lua/markdown/php/python/r/ruby/scss/shell/swift/vb/xml/yaml 等；Flux 8 个缺 ~30+）
- per-language renderer 类型（amis 注册 `{lang}-editor`，Flux 强制单 type + language prop）
- `editorDidMount` 回调（原始 editor/monaco 句柄）
- `doAction` clear/reset/focus
- `size` 预设、minimap/scrollBeyondLastLine/selectOnLineNumbers/automaticLayout

**设计状态：** 语言列表 `DESIGN-COVERS`（`design.md:54-63` 契约级列举同 8 语言 + `§13` 警告区分基线/未来）；diff/只读 code 显示/editorDidMount/doAction/size/minimap/options 语义 `DESIGN-GAP`。

**严重度：P1。** diff 编辑器和只读代码显示是常用 amis 能力，完全缺失；语言列表缺口是契约级刻意，但仍阻塞用 `python-editor`/`yaml-editor` 等 schema 的迁移。

---

### `dynamic-renderer` — P2

**现状：** `loadAction` 必需运行时拉 schema 片段，三态 UI（loading/schema-ready/error），body region 静态包裹，AbortController 取消，loadActionKey 去重防 stale，action-result 解包，schema 形状校验，i18n。

**关键缺失（vs amis Service schemaApi 路径）：** `initFetch`/`initFetchOn` 初始拉取 gate（Flux 永远 mount 即拉）、`fetchSchemaInited`/`onSchemaApiFetched` 生命周期事件、`doAction:'rebuild'` 命令式重拉、schema 轮询（interval/silentPolling/stopAutoRefreshWhen）、`messages`/`showErrorMsg`、`onBulkChange` 写 formStore、`afterSchemaFetch` 数据合并 scope。

**设计状态：** fallback/empty/errorMode/onError `DESIGN-ACK-NOT-IMPL`（`design.md:§4,§8`）；component:refresh `DESIGN-ACK-NOT-IMPL`；initFetch gate/schema 轮询/生命周期事件 `DESIGN-GAP`。

**严重度：P2。** fallback region 和 component:refresh 已延后；无事件钩子和无 init-fetch gate 是迁移实践缺口，但核心单次 schema 加载路径扎实。

---

### `data-source` — P1

**现状：** 非可视，注册 compiled source，schema（name/formula 或 action+args/interval/stopWhen/silent/statusPath/dependsOn/initialData/mergeStrategy/mergeKey/resultMapping/mergeToScope），runtime refreshSource 生命周期，卸载清理。

**关键缺失（vs amis Service）：**

- WebSocket（`ws`）— Flux 完全无
- `dataProvider` 自定义函数钩子（amis JS 函数串 keyed by inited/onApiFetched/onSchemaApiFetched/onWsFetched + setData + unsubscribe）
- `initFetch`/`initFetchOn` 初始拉取 gate（Flux 永远 mount 即拉，仅 stopWhen 后置）
- `sendOn` 预取条件（Flux stopWhen 仅停轮询，不 gate 初始/参数化拉取）
- `silentPolling` 独立标志（Flux 单 silent，轮询语义不清）
- `messages`（fetchSuccess/fetchFailed）+ `showErrorMsg`（Flux 仅写 DTO 到 statusPath）
- `stopAutoRefreshWhen` 表达式（针对拉取后数据求值）
- 生命周期事件（inited/fetchInited/onApiFetched）
- `receive(values)`/`reload(subpath,query)` scoped 方法
- `handleQuery` 与分页/orderBy 集成
- `onBulkChange` 写 formStore
- dialog feedback（openFeedback）

**设计状态：** onSuccess/onError/component:cancel `DESIGN-ACK-NOT-IMPL`（`design.md:§4,§8`）；ws/sendOn/initFetch/dataProvider/messages-showErrorMsg/silentPolling 区分 `DESIGN-GAP`。

**严重度：P1。** ws、sendOn、initFetch gate、生命周期事件、messages/showErrorMsg 缺失对迁移真实 amis service-driven schema 是显著缺口。

---

### `text` — P2

**现状：** text/body 别名，tag 白名单（span/p/h1-h6/label/div），纯文本 `String()` 渲染，`nop-text` marker，source-enabled value，无状态/事件/region。

**关键缺失（vs amis Tpl）：** HTML 渲染（`BY-DESIGN` — Flux 有独立 html renderer）、`raw` 模式、HTML 转义 toggle（Flux 既不转义也不渲染 HTML，仅 String()）、异步模板、`wrapperComponent` 任意标签、`inline` toggle、badge 角标、`placeholder`（空值占位）、`maxLine` 行截断、`showNativeTitle`（HTML title 属性）、click/hover 事件、themeCss。

**设计状态：** HTML/raw/markdown `BY-DESIGN`（`design.md:§1,§2` — Flux 拆分 text/markdown/html）；click/hover 事件 `DESIGN-ACK-NOT-IMPL`（`design.md:§8`）；copyable/maxLine/placeholder/showNativeTitle `DESIGN-GAP`；text/body 双入口 `DESIGN-ACK-NOT-IMPL`（`design.md:§12`）。

**严重度：P2。** HTML/markdown 缺失是刻意；但事件、copyable、maxLine 截断、placeholder 是影响典型 list-cell/card-title schema 迁移的真实易用性缺口。

---

### `icon` — P2

**现状：** icon 字符串名，`resolveLucideIcon` 仅 lucide-react，**硬编码 size=16/strokeWidth=1.8/aria-hidden/focusable**，`nop-icon` marker。

**关键缺失：** schema 级 size/color/title/decorative（`DESIGN-ACK-NOT-IMPL`，`design.md:§4,§5` — 但实现硬编码 size=16 违背 design.md:§10"视觉尺寸来自样式系统"）、多 vendor（iconfont/FontAwesome）、表达式解析 icon 名、badge 角标、click/hover 事件、IconCheckedSchema 结构对、themeCss。

**设计状态：** size/title/decorative/custom SVG/事件/fallback `DESIGN-ACK-NOT-IMPL`；多 vendor/badge `DESIGN-GAP`；color `DESIGN-COVERS`（声称走样式系统）但实现硬编码矛盾。

**严重度：P2。** 硬编码 size=16 无 schema 覆盖是真实可见限制，违背 design 自身规则；多 vendor 和事件缺失次之。

---

### `reaction` — P3（FLUX-ONLY）

**现状：** 非可视，注册 compiled reaction，schema（watch/when/immediate/debounce/once/actions/dependsOn），dispatchRef 刷新，卸载清理。

**关键缺失（vs 通用最佳实践，amis 无对应物）：** throttle（仅 debounce）、debounce leading/trailing 控制、单节点多并行 reaction、per-reaction onError、外部 component:refresh 重跑、可观测/诊断面。

**设计状态：** FLUX-ONLY；component:refresh `DESIGN-ACK-NOT-IMPL`（`design.md:§8`）；throttle/onError `DESIGN-GAP` 但 design 刻意保持薄（`design.md:§12`）。

**严重度：P3。** FLUX-ONLY 刻意最小；缺口是未来增强层，非迁移阻塞。

---

### `loop` — P3

**现状：** items/body/empty region，itemName/indexName/keyName 自定义绑定，itemData 每项派生绑定，keyBy，共享 table-row instance identity，key 解析顺序，递归扩展（recurse），scope 继承。

**关键缺失（vs amis Each）：** `maxLength` 迭代上限（amis 限制迭代数，Flux 无上限可能无限循环）、对象作为 map 迭代（amis 把对象转 `[{key,value}]`，Flux toItemsArray 拒绝非数组静默渲染空）、`placeholder`（Flux 用更强 empty region `DESIGN-COVERS-BETTER`）。

**设计状态：** maxLength/对象迭代 `DESIGN-GAP`；empty region/自定义绑定/itemData/keyBy/scope 继承/递归 `DESIGN-COVERS`。

**严重度：P3。** Flux loop 在多数维度严格强于 amis Each；缺 maxLength 安全上限和对象迭代是次要边角。

---

### `recurse` — P3（FLUX-ONLY）

**现状：** 词法递归节点，仅 loop.body 内有效，继承外层 loop 绑定（可逐字段覆盖），maxDepth 安全网，每层 instancePath frame。

**关键缺失：** amis 无对应物。缺口仅诊断类：脱离 loop 时静默 null 渲染（难调试，文档未规定诊断行为）、无默认 maxDepth（自引用 items + 无 when gate 有无限递归风险）。

**设计状态：** FLUX-ONLY；契约级 `DESIGN-COVERS`；诊断/默认 maxDepth `DESIGN-GAP`。

**严重度：P3。** FLUX-ONLY，契约完善实现良好；仅次要诊断/安全缺口。

---

### `fragment` — P3（FLUX-ONLY）

**现状：** 无 DOM 结构分组节点，body region + data scope patch + isolate（切断父词法继承）+ when，Fragment 渲染，无 marker。

**关键缺失：** amis 无对应物（用 container/wrapper/panel 都有视觉 DOM）。无明显缺口，design 刻意避免过度设计（`design.md:§12` 不引入 if 组件）。

**设计状态：** FLUX-ONLY；全 `DESIGN-COVERS`。

**严重度：P3。** FLUX-ONLY 刻意最小且契约完整。

---

### `badge` — P3（刻意收敛）

**现状：** text + level(info/success/warning/danger)，映射 shadcn Badge variant，纯文本，无状态/事件/region/计数。

**关键缺失（vs amis BadgeObject HOC）：** `mode: dot|text|ribbon`、`count`+`overflowCount`+`showZero`（数值角标）、`offset`、`position`、`visibleOn`/`hiddenOn`、`dynamic` 动画、包裹任意子 renderer（HOC 模式）。

**设计状态：** dot/数值/可关闭 `DESIGN-ACK-NOT-IMPL`（`design.md:§2` 刻意排除到 tag/tag-list）；position/offset/visibleOn/wrapping `DESIGN-GAP`。

**严重度：P3。** Flux badge 刻意最小；dot/数值/ribbon 明确延后到 tag/tag-list；position/offset/wrapping 是真实但次要缺口。
