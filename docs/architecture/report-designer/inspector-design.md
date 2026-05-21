# Report Designer Inspector Design

本文档专门定义 `Report Designer` 右侧属性面板的最小规范边界。

核心结论只有一条：inspector 直接使用 Flux 自己的 `SchemaInput` + form runtime 来定义，不再单独设计第二套 inspector model。

## 1. 目标

Inspector 设计必须同时满足以下要求:

- 点击 workbook/sheet/row/column/cell/range 后，都能切换到对应属性面板
- 属性面板内容必须由外部 schema/config 决定，不能在 core 中写死
- 属性面板本身仍应复用现有 Flux schema/form runtime
- 表达式字段必须可以接入独立表达式编辑控件
- inspector 改动必须通过标准 action 或 bridge 回写，而不是直接改 store
- 不同 profile 可以重用同一个 inspector shell，但生成不同的 inspector schema

## 2. 总体结论

Inspector 最多只保留一个很薄的 selection-aware 壳层；真正的属性编辑体直接就是普通 Flux schema/form。

```text
selection target
  -> schema assembly / metaprogramming
  -> schema renderer + form runtime
  -> report-designer:* / spreadsheet:* actions
```

## 3. 最小路径

先明确一点：对于最小可落地版本，inspector **可以只是一个 schema/form**。

这条最小基线同时受 `docs/architecture/complex-control-host-protocol.md` 中的跨 designer 共享规则约束：selection-aware shell + schema/form body + action-based writeback。

还要再加一条 DSL 约束：

- inspector/property editing 属于 Flux 现有 DSL 可描述的问题域
- 因此最小路径应直接复用 `SchemaInput` + form runtime
- 如果想减少手写表单配置，优先在 schema 组装层通过元编程生成 inspector schema，而不是先定义第二套 inspector DSL

例如当前只支持：

- 点击 `cell`
- 渲染一个属性表单
- 提交后写回一个 metadata JSON patch

这种路径完全可以建立在现有 `SchemaInput` + form runtime + namespaced action 之上，不需要先引入任何独立 inspector provider/panel/value-adapter 体系。

对于更复杂的情况，例如：

- 不止 `cell`，还要支持 `workbook / sheet / row / column / range`
- 同一个 target 需要 tabs、sections 或更复杂布局
- 不同 profile 下需要不同的编辑表单

也仍然优先在 Flux DSL 框架内解决：

- 继续用 `SchemaInput` / form schema 表达 inspector body
- 由 schema 组装层根据 selection kind、profile、静态规则等元编程生成最终 inspector schema
- 而不是在 runtime 里再定义 provider/panel descriptor/第二套 inspector model

因此这里的最终结论是：

- inspector 始终应首先被理解成 plain Flux schema/form
- 复杂度上升时，优先增加上游 schema 组装能力，而不是引入平行 DSL

## 4. 选择目标模型

Inspector 的匹配输入应统一基于 `ReportSelectionTarget`。

```ts
type ReportSelectionTarget =
  | { kind: 'workbook' }
  | { kind: 'sheet'; sheetId: string }
  | { kind: 'row'; sheetId: string; row: number }
  | { kind: 'column'; sheetId: string; col: number }
  | { kind: 'cell'; cell: SpreadsheetCellRef }
  | { kind: 'range'; range: SpreadsheetRange };
```

Inspector 不应直接依赖 canvas 内部状态，只消费这个标准 target。

## 5. Shell 边界

Shell 只负责极少数宿主层职责：

- 没有 selection 时的空态
- 当前 target 没有生成 schema 时的空态
- 只读/错误这类宿主级状态提示
- 把最终生成的 schema/form 挂载进当前区域

tabs、sections、inline 布局本身都优先由最终 schema/form 直接表达，而不是由 shell 再定义一套专用布局协议。

### 5.1 空态规则

以下情况 inspector shell 必须有明确空态:

- 没有 selection
- selection 存在但当前 target 没有提供可编辑 schema

空态不应只是空白区域，至少应显示:

- 当前 target 概要
- 为什么没有可编辑面板
- 是否是只读或当前 profile 未生成 inspector schema

## 6. 宿主 Scope 设计

Inspector schema 运行时应始终注入稳定 host scope，而不是让局部 schema 片段各自拼上下文。

建议至少暴露:

- `workbook`
- `activeSheet`
- `selection`
- `target`
- `meta`
- `designer`
- `runtime`

其中 `activeCell`、`activeRange` 如需暴露，应被视为从 `selection` / `target` 派生的便利字段，而不是更高层级的固定主契约。

这样 panel schema 可以稳定写成:

```json
{
  "type": "text",
  "text": "当前目标: ${target.kind}"
}
```

## 7. 表单与提交模型

### 7.1 inspector 直接复用 form runtime

inspector body 直接就是普通 Flux form/schema。

如果需要 tabs、sections 或更复杂布局，仍然应在 schema 中直接表达，或由上游 schema 组装生成。

### 7.2 提交目标只走 action

panel 不得直接修改 designer core store。

推荐提交路径:

- spreadsheet 基础字段 -> `spreadsheet:*` action
- report 语义字段 -> `report-designer:updateMeta`
- profile 特殊操作 -> profile 自定义 action 或 adapter 包装 action

### 7.3 草稿与实时同步

建议默认策略:

- 简单字段支持 `change` 级实时提交
- 表达式字段和复杂字段支持 `blur` 或显式保存
- profile 可以覆盖每个 panel 的提交策略

## 8. Expression Editor 接入模型

Expression editor 不应由 shell 特判某个字段名，而应由 panel schema 显式声明字段种类。

建议引入 property field kind:

```ts
type InspectorFieldKind =
  | 'scalar'
  | 'boolean'
  | 'enum'
  | 'expression'
  | 'reference'
  | 'style-ref'
  | 'custom';
```

对于 `expression` 字段:

- panel schema 标记该字段为 expression-kind
- shell 或 schema adapter 将其映射到 `ExpressionEditorAdapter`
- adapter 接收 `ExpressionEditorProps`

### 12.1 为什么要 field kind

因为以下字段虽然都是字符串，但编辑体验不同:

- 普通标签字符串
- 单元格地址引用
- styleId
- 表达式字符串

不能只靠字段名猜测。

## 13. Reference 字段模型

对于 `rowParent`、`colParent`、单元格地址等字段，建议单独视为 `reference` kind，而不是 expression。

原因:

- 它们可能需要“从画布选择”能力
- 它们不一定是表达式语言的一部分
- 它们的校验规则通常是地址或 target-kind 约束

若后续需要专用选择器，应把它作为普通 Flux schema 中可调用的辅助能力接入，而不是把 inspector 本身扩展成第二套 DSL。

## 14. 数据装载与反填

Inspector 的初始值不应直接取整个 document，而应取当前 target 的规范化 view model。

但这仍应通过 schema 装配和 action 写回解决：

- 读取侧由 host scope / `target` / `meta` / `selection` 等投影提供
- 写回侧统一走 `spreadsheet:*` / `report-designer:*` action
- 如需复杂映射，优先在 schema 组装层生成最终 inspector schema，而不是定义平行 provider/value-adapter 模型

## 15. Profile 推荐组织方式

### 15.1 通用 profile

建议至少有这些默认面板类别:

- `Workbook`
- `Sheet`
- `Cell Basic`
- `Range`

### 15.2 nop-report profile

建议 tabs:

- `Basic`
- `Style`
- `Report`
- `Advanced`

这些差异仍然应优先通过不同 profile 生成不同 inspector schema 来表达，而不是通过 runtime provider 组合。

## 16. 性能原则

### 16.1 shell 只订阅 active target

Inspector 不应订阅整个 document。

最小订阅集:

- `selectionTarget`
- `activeMeta`
- 当前 target 对应的 spreadsheet 基础值

### 16.2 schema 编译缓存

最终生成的 inspector schema 必须参与缓存。

建议缓存 key 至少包含:

- target kind
- profile id
- schema version

### 16.3 局部刷新

若某个局部编辑只影响自身区域，不应让整个 inspector 无谓重建。

## 17. 错误与只读策略

Inspector 必须显式区分:

- 没有 selection
- 当前 target 未生成可编辑 schema
- profile 只读
- 当前局部区域只读

这些状态应由 shell 与最终 schema 组合共同表达，而不是依赖额外 provider 约定。

## 18. 最小实现顺序

如果开始编码，建议 inspector 先按以下顺序落地:

1. 实现 `report-inspector-shell`
2. 支持 `cell -> 单一 schema/form`
3. 支持 target 切换与 host scope 注入
4. 支持 `report-designer:updateMeta` 提交
5. 支持 `ExpressionEditorAdapter` 字段映射
6. 如有需要，再通过 schema 组装支持 tabs/sections 与 profile 差异
7. 最后再补 reference picker 一类辅助能力

## 19. 结论

Inspector 不是一个“右侧放个表单”的小问题，而是 `Report Designer` 通用性成立的关键。

最合理的做法是:

- 用 shell 统一承接 selection-aware 容器与状态
- 用 plain `SchemaInput` / form runtime 复用现有 Flux DSL 能力
- 用上游 schema 组装/元编程处理 target/profile 差异
- 用 `spreadsheet:*` / `report-designer:*` action 负责提交与写回
- 用 expression/reference 等辅助能力处理特殊字段体验

这样才能同时满足:

- standalone spreadsheet 的基础属性编辑
- 通用 report designer 的可定制属性页
- `nop-report` 这类 profile 的复杂领域配置
