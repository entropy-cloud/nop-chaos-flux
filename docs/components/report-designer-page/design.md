# Report Designer Page 组件设计

## 1. 组件定位

- `report-designer-page` 是报表设计器宿主根 renderer。
- 它把 spreadsheet runtime、report designer runtime、字段面板、toolbar、inspector 和 dialogs 组织为同一工作台。
- 本文档只拥有 `report-designer-page` 单 renderer 契约；Report Designer family 的平台架构、adapter 边界和 workbench 抽象由 `docs/architecture/report-designer/` 文档族负责。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已落地 `document`、`designer`、`profile`、`adapters`、`toolbar`、`fieldPanel`、`inspector`、`dialogs`、`body`。
- 这是领域宿主，不应退化为普通页面组合模板。
- 如果问题涉及 spreadsheet/report family 分层、host abstraction、adapter contract 或平台扩展边界，应先回到 `docs/architecture/report-designer/README.md`。

## 3. Flux 中的 renderer/type 定义

- `type: 'report-designer-page'`
- `sourcePackage: '@nop-chaos/report-designer-renderers'`
- 当前 regions: `toolbar`、`fieldPanel`、`inspector`、`dialogs`、`body`
- 当前 fields: `title` 为 `value-or-region`

## 4. schema 设计

- `document` 和 `designer` 是核心必填输入。
- `profile` 和 `adapters` 是可选宿主扩展入口。
- `toolbar`、`fieldPanel`、`inspector`、`dialogs`、`body` 是主要 regions。
- 目标设计中，如需让宿主外部读取 report designer host 摘要，应使用 `statusPath`，而不是把完整 host projection 提升到 page 全局 scope。

## 5. 字段分类

- `title`: `value-or-region`
- `document`、`designer`、`profile`、`adapters`: `value`
- `toolbar`、`fieldPanel`、`inspector`、`dialogs`、`body`: `region`

## 6. regions 与 slot 约定

- `toolbar` 承接顶部设计器动作区。
- `fieldPanel` 承接左侧字段源。
- `inspector` 承接右侧属性面板。
- `body` 承接中央 spreadsheet 或其他主工作区扩展。

补充约束:

- `body` 对应的主工作区应以 Excel-like 单元格直接操控为核心交互面，而不是教学演示面板。
- `body` 对应的共享 grid/canvas 应提供与 selection 绑定的右键上下文菜单能力，且右键命中时先归一化当前选择，再显示菜单。
- 除属性编辑等报表设计专属面板外，`body` 中的表格交互应限制在 Excel 已支持的能力集合内；如果某个手势或行为不是 Excel 原生能力，不应默认进入共享 canvas 契约。
- 填充柄双击自动向下填充属于允许能力，但应沿相邻数据区域自动推导终点，保持 Excel 风格而不是自定义整页填充行为。
- 结构性菜单项应优先按 Excel 的方向性语义命名和触发，例如“插入上方行 / 插入下方行 / 插入左侧列 / 插入右侧列”。
- 如果当前是多行或多列选择，方向性插入/删除也应按选中数量一起执行，保持 Excel 的批量结构编辑语义。
- 合并/取消合并、冻结/取消冻结这类 Excel 原生操作可以作为共享 canvas 的上下文动作暴露，但它们的实际执行仍应复用统一的 `spreadsheet:*` 命令链。
- `sort/filter` 只有在共享 spreadsheet 层已经具备真实 command、状态模型和可见反馈时，才应进入默认共享菜单；不能为了“像 Excel”而先暴露未落地的菜单项。
- 在共享能力分阶段落地时，可以先暴露真实可执行的 `sort`，但仍然不能提前暴露没有底层模型支撑的 `filter`。
- 第一阶段 `filter` 若进入共享菜单，应限制为“按当前单元格值筛选当前列”和“清除筛选结果”这类已有共享底层能力可真实支撑的动作，并通过真实行隐藏反馈到画布。
- 第一阶段 `filter` 还应在共享 grid/header 上给出最小筛选态反馈，例如工作表已筛选和列头已筛选标记，而不是额外拼出一块教学提示区。
- 第一阶段 `filter` 的共享状态也应显式挂在 worksheet 上，供 grid/header/host scope 读取，而不是只靠 `filteredOut` 这种执行结果倒推出筛选条件。
- 上下文菜单项的启用状态应跟随当前 selection 类型和范围精确变化；不符合当前 Excel 语义上下文的动作应禁用，避免出现“菜单可点但不会产生有效表格行为”的共享 workbench 体验。
- `report-designer-page` 的正式工作台不应把 `event log`、快捷键清单、操作说明卡片等教学性质内容固定堆叠在 canvas 下方。
- 如果宿主需要帮助信息，应通过独立帮助入口、文档链接或可收起面板提供，不能侵占默认编辑空间。

## 7. 运行期状态归属

- 表格编辑状态归 spreadsheet runtime。
- 报表语义层状态归 report designer runtime/adapters。
- schema 片段通过宿主 scope 读取快照，并通过命名空间动作写操作。
- `report-designer-page` 属于 `Domain Host Owner`：内部读面是 host projection，宿主外部若需要观测状态，应通过窄 `statusPath` 摘要，而不是依赖 page 全局 host 字段。

### 7.1 Host Projection Vocabulary

host scope 向下投影以下字段。字段分为三类：

**Canonical fields — 新 schema 应优先使用这些字段：**

| 字段              | 类型   | 说明                                                                                                                                                                                                     |
| ----------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `designer`        | object | 主投影：`kind`, `documentId`, `documentName`, `selectionTarget`, `selectionKind`, `inspector`, `inspectorPanels`, `fieldDrag`, `preview`, `activeMeta`, `fieldSources`, `fieldSourceCount`, `fieldCount` |
| `runtime`         | object | 运行时摘要：`canUndo`, `canRedo`, `previewRunning`, `previewMode`, `dirty`                                                                                                                               |
| `spreadsheet`     | object | 嵌套 spreadsheet 投影：`workbook`, `activeSheet`, `selection`, `activeCell`, `activeRange`, `runtime`                                                                                                    |
| `selectionTarget` | object | 当前选择目标（canonical）                                                                                                                                                                                |
| `reportDocument`  | object | 当前报表文档快照                                                                                                                                                                                         |
| `workbook`        | object | 当前工作簿                                                                                                                                                                                               |
| `activeSheet`     | object | 当前活跃 sheet                                                                                                                                                                                           |
| `activeCell`      | object | 当前活跃单元格                                                                                                                                                                                           |
| `activeRange`     | object | 当前活跃区域                                                                                                                                                                                             |

**Compatibility aliases — 保留兼容，新 schema 应使用 canonical 字段：**

| 字段        | Canonical 等价    | 说明             |
| ----------- | ----------------- | ---------------- |
| `selection` | `selectionTarget` | 兼容别名，值相同 |
| `target`    | `selectionTarget` | 兼容别名，值相同 |

**Convenience mirrors — 从 `designer.*` 或 `spreadsheet.*` 或 `runtime.*` 派生的顶层快捷字段：**

| 字段              | 派生来源                   |
| ----------------- | -------------------------- |
| `inspector`       | `designer.inspector`       |
| `inspectorPanels` | `designer.inspectorPanels` |
| `meta`            | `designer.activeMeta`      |
| `canUndo`         | `runtime.canUndo`          |
| `canRedo`         | `runtime.canRedo`          |
| `documentName`    | `designer.documentName`    |
| `fieldCount`      | `designer.fieldCount`      |

## 8. 事件、动作与组件句柄能力

- 顶层动作优先走 `report-designer:*` 与 `spreadsheet:*` 命名空间。
- 页面自身不应暴露大而全的 imperative ref。

## 9. 数据源、表达式、导入能力接入点

- `profile` 和 `adapters` 是外部领域能力的主扩展点。
- schema 片段应通过宿主提供的数据快照读取字段源和当前选中对象。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-report-designer-page` marker。
- 工作台布局遵循 report designer 架构，而不是普通页面默认间距。
- 默认布局优先保障 canvas 的连续编辑空间，避免在主工作区底部追加与编辑无关的常驻信息区。

## 11. 实现拆分建议

- host shell、桥接层、toolbar/fieldPanel/inspector adapters 和 spreadsheet body 分层维护。

## 12. 风险、取舍与后续阶段

- 最主要风险是 spreadsheet 与 report designer 两层职责混杂。
- profile 适配边界必须保持稳定，避免对单一后端模型形成耦合。

## 13. 相关文档

- `docs/architecture/report-designer/README.md` - family 入口与 owner boundary
- `docs/architecture/report-designer/design.md` - 平台扩展架构总览
- `docs/architecture/report-designer/contracts.md` - future contract draft；当前 renderer contract 仍以本文件和 live code 为准
