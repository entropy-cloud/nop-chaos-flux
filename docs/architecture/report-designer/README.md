# Report Designer

`Report Designer` 不是一套只服务于 `nop-report` 的专用编辑器，而是构建在 `SchemaRenderer` 之上的通用报表设计器领域扩展。

它由两层能力组成:

- 可单独使用的 `Spreadsheet Editor`，负责 Excel 式多 sheet 展现与编辑
- 叠加在 spreadsheet 之上的 `Report Designer`，负责业务字段拖拽、报表语义配置、属性面板编排和预览集成

## 定位

- 在 `packages` 下新增通用模块，目标是沉淀一套可复用的 spreadsheet/report designer 平台能力
- `Spreadsheet Editor` 必须可以脱离报表语义单独使用，不依赖业务字段面板和报表元数据模型
- `Report Designer` 必须是通用的，不预置 `nop-report` 的字段语义，只通过配置和适配器支持 `nop-report` 一类具体模型
- 左侧字段面板、右侧属性编辑、表达式编辑控件都由外部配置和适配，不写死为某一个后端模型
- 表达式编辑控件是独立问题，`Report Designer` 只定义抽象适配接口，不在当前文档中固化表达式语言协议

## 新架构结论

- `Spreadsheet Editor` 作为 `SchemaRenderer` 领域扩展层实现，并支持脱离 `Report Designer` 单独运行
- 包结构建议采用 `@nop-chaos/spreadsheet-core` + `@nop-chaos/spreadsheet-renderers` + `@nop-chaos/report-designer-core` + `@nop-chaos/report-designer-renderers`
- standalone spreadsheet 根 schema 建议使用 `spreadsheet-page`
- 报表设计器根 schema 建议使用 `report-designer-page`
- 字段列表、属性面板、工具栏、浮动动作、对话框优先采用 schema 片段驱动
- 报表语义数据通过通用 metadata 层承载，不把具体业务字段强耦合进 spreadsheet core
- 表达式编辑能力通过 `ExpressionEditorAdapter` 接口接入，后续可替换为独立控件包

## 文档

- `docs/architecture/report-designer/design.md` - 总体架构、运行时边界、模块拆分、性能策略
- `docs/architecture/report-designer/config-schema.md` - `spreadsheet-page`、`report-designer-page`、文档模型、字段面板、属性面板、表达式适配接口
- `docs/architecture/report-designer/api.md` - 包 API、宿主 scope、spreadsheet/report actions、扩展点
- `docs/architecture/report-designer/contracts.md` - 更接近未来 TypeScript 实现的接口草案与 adapter 合同
- `docs/architecture/report-designer/inspector-design.md` - 右侧属性面板的 shell/provider/panel descriptor 设计
- `docs/architecture/report-designer/nop-report-profile.md` - 通用设计器如何通过 profile + adapter 支持 `nop-report`
- `docs/architecture/report-designer/codec-design.md` - `SpreadsheetDocument` / `ReportSemanticDocument` 与外部模板模型的 round-trip codec 设计
- `docs/analysis/excel-report-designer-research.md` - 外部项目与目标模型调研结论

## 设计原则

- spreadsheet core 优先通用化，报表语义作为上层扩展叠加
- 能复用现有 `SchemaRenderer`、`formulaCompiler`、`action`、`form/page runtime` 的，不在 designer 中重造
- 左侧字段面板和右侧属性面板必须配置驱动，不能硬编码为特定报表模型
- 表达式编辑器只定义适配边界，不提前把 designer 绑定到某一种表达式语法
- 面向高性能: 文档归一化、局部订阅、布局缓存、命令式更新优先
- 配置和文档结构必须稳定，便于后端存储与版本迁移

## 与 nop-report 的关系

- `nop-report` 是首个重要适配目标，但不是 `Report Designer` 的内建领域模型
- `nop-report` 适配应通过字段源配置、属性面板 schema、metadata 读写适配器、导入导出适配器来完成
- 这意味着通用设计器文档只定义能力边界，不直接把 `ExcelWorkbook` 或 `XptCellModel` 写成 core 契约

## 与表达式编辑器的关系

- 表达式编辑控件的设计与实现是独立问题
- 当前文档只定义 `ExpressionEditorAdapter` 一类抽象接口
- 后续需要单独调研表达式语言、补全、校验、格式化、引用选择与运行时上下文
