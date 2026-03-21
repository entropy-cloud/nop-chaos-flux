# Report Designer Inspector Design

本文档专门定义 `Report Designer` 右侧属性面板的架构与组织方式。

前面的文档已经明确 inspector 必须外部可定制，但还没有把“如何组织 panel、如何匹配 selection、如何把 schema/provider/expression editor 拼起来”讲细。

本文件的目标是把 inspector 从一句原则，收敛成可实现的设计。

## 1. 目标

Inspector 设计必须同时满足以下要求:

- 点击 workbook/sheet/row/column/cell/range 后，都能切换到对应属性面板
- 属性面板内容必须由外部配置或 provider 决定，不能在 core 中写死
- 属性面板本身仍应复用现有 AMIS schema/form runtime
- 表达式字段必须可以接入独立表达式编辑控件
- inspector 改动必须通过标准 action 或 bridge 回写，而不是直接改 store
- 不同 profile 可以重用同一个 inspector shell，但替换不同 provider 集合

## 2. 总体结论

Inspector 应拆成三层:

- `Inspector Shell` - 通用壳层，负责布局、tabs、空态、loading、切换、提交状态
- `Inspector Provider Layer` - 根据当前 selection target 选择哪些 panel 可见
- `Schema/Form Layer` - 真正渲染字段表单、表达式编辑器、校验与提交逻辑

```text
selection target
  -> provider matcher
  -> inspector panel descriptors
  -> shell tabs/sections
  -> schema renderer + form runtime
  -> report-designer:* / spreadsheet:* actions
```

## 3. 为什么 inspector 不能只是一个 schema

如果把 inspector 简化成一个固定 `SchemaInput`，会立刻遇到问题:

- workbook/sheet/cell/range 的字段集合完全不同
- 同一个 cell 在不同 profile 下需要完全不同的属性页
- 有些 panel 来自静态 schema，有些来自动态 provider
- 一个 selection 往往需要多个 panel 组合，而不是一个大表单

因此 inspector 必须是“壳层 + provider 匹配 + schema 渲染”的结构，而不是单一 schema 节点。

## 4. 术语

### 4.1 Inspector Shell

负责:

- 接收当前 selection target
- 解析 providers
- 生成 tabs/sections
- 渲染空态、只读态、加载态、错误态

不负责:

- 理解具体业务字段
- 直接生成领域 patch

### 4.2 Inspector Provider

负责:

- 判断自己是否匹配当前 target
- 提供一个或多个 panel descriptor
- 可选生成 schema
- 可选声明提交动作、表达式字段、显示顺序

### 4.3 Panel Descriptor

`Panel Descriptor` 是 shell 消费的标准化 panel 描述对象。

它比原始 provider 配置更接近最终渲染结果。

## 5. 选择目标模型

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

## 6. Provider 匹配模型

### 6.1 第一层匹配: kind

第一层必须先按 target kind 过滤:

- `workbook`
- `sheet`
- `row`
- `column`
- `cell`
- `range`

### 6.2 第二层匹配: 条件表达式

第二层是可选 `when` 条件，例如:

- 当前 cell 是否属于某类 profile
- 当前 metadata 是否包含某个命名空间
- 当前 selection 是否单元格而不是批量 range

### 6.3 第三层排序: priority

当多个 provider 同时匹配时，用 `priority` 决定顺序，但不是互斥关系。

建议规则:

- 默认 `priority = 0`
- 高优先级先显示
- 不同 provider 可同时渲染成多个 tab 或 section

## 7. Panel Descriptor 设计

建议引入显式 panel descriptor，而不是让 shell 直接消费 provider 原始配置。

```ts
export interface InspectorPanelDescriptor {
  id: string;
  title: string;
  targetKind: ReportSelectionTargetKind;
  group?: string;
  order?: number;
  mode?: 'tab' | 'section' | 'inline';
  body: SchemaInput;
  submitAction?: Record<string, unknown>;
  readonly?: boolean;
  badge?: string;
}
```

这样做的好处:

- shell 不需要关心 provider 是静态还是动态
- provider 可以一次产出多个 panel
- tabs/sections 的组织方式可被统一处理

## 8. Provider 接口增强建议

当前合同里的 `InspectorProvider` 只返回一个 schema，建议增强为返回 panel descriptor 列表:

```ts
export interface InspectorProvider {
  id: string;
  match(target: ReportSelectionTarget, context: ReportDesignerAdapterContext): boolean;
  getPanels(context: InspectorPanelContext): InspectorPanelDescriptor[] | Promise<InspectorPanelDescriptor[]>;
  priority?: number;
}

export interface InspectorPanelContext {
  target: ReportSelectionTarget;
  metadata?: MetadataBag;
  designer: ReportDesignerRuntimeSnapshot;
  spreadsheet: SpreadsheetRuntimeSnapshot;
}
```

相比旧接口的改进:

- 一个 provider 可以返回多个 panel
- shell 不再负责把单 schema 重新包装成 tab
- 动态 provider 更容易插入 badge、只读态、分组等元信息

## 9. Shell 组织方式

### 9.1 tabs 是默认模式

对于大多数 profile，推荐默认组织方式是 tabs。

原因:

- workbook/sheet/cell 属性密度高
- 一屏堆太多字段会让表单失控
- tabs 更适合 profile 逐步扩展

### 9.2 sections 是补充模式

如果 panel 数量较少，或某个 provider 只是小块附加属性，可渲染为 section，而不是单独 tab。

建议规则:

- `mode: 'tab'` -> 成为顶层页签
- `mode: 'section'` -> 放进当前默认 tab 或一个 shell 统一容器
- `mode: 'inline'` -> 与其他小块直接拼接

### 9.3 空态规则

以下情况 inspector shell 必须有明确空态:

- 没有 selection
- selection 存在但没有匹配 provider
- provider 加载失败

空态不应只是空白区域，至少应显示:

- 当前 target 概要
- 为什么没有可编辑面板
- 是否是只读或 profile 未提供 panel

## 10. 宿主 Scope 设计

Inspector schema 运行时应始终注入稳定 host scope，而不是让每个 provider 自己拼上下文。

建议至少暴露:

- `workbook`
- `activeSheet`
- `selection`
- `activeCell`
- `activeRange`
- `target`
- `meta`
- `designer`
- `runtime`

这样 panel schema 可以稳定写成:

```json
{
  "type": "tpl",
  "tpl": "当前目标: ${target.kind}"
}
```

## 11. 表单与提交模型

### 11.1 每个 panel 独立 form

推荐每个 panel 自己持有一个 form runtime，而不是整个 inspector 共用一个大表单。

原因:

- 不同 panel 的数据来源不同
- 不同 panel 的提交动作可能不同
- panel 独立校验更容易局部更新

### 11.2 提交目标只走 action

panel 不得直接修改 designer core store。

推荐提交路径:

- spreadsheet 基础字段 -> `spreadsheet:*` action
- report 语义字段 -> `report-designer:updateMeta`
- profile 特殊操作 -> profile 自定义 action 或 adapter 包装 action

### 11.3 草稿与实时同步

建议默认策略:

- 简单字段支持 `change` 级实时提交
- 表达式字段和复杂字段支持 `blur` 或显式保存
- profile 可以覆盖每个 panel 的提交策略

## 12. Expression Editor 接入模型

Expression editor 不应由 shell 特判某个字段名，而应由 panel schema 显式声明字段种类。

建议引入 property field kind:

```ts
type InspectorFieldKind = 'scalar' | 'boolean' | 'enum' | 'expression' | 'reference' | 'style-ref' | 'custom';
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

建议预留接口:

```ts
export interface ReferencePickerAdapter {
  id: string;
  pick(context: ReferencePickerContext): Promise<string | undefined>;
}

export interface ReferencePickerContext {
  targetKind: ReportSelectionTargetKind;
  allowedKinds?: Array<'cell' | 'range' | 'row' | 'column'>;
}
```

当前可以只在文档中预留，不必立即实现。

## 14. 数据装载与反填

Inspector panel 的初始值不应直接取整个 document，而应取当前 target 的规范化 view model。

建议引入:

```ts
export interface InspectorValueAdapter {
  id: string;
  read(target: ReportSelectionTarget, context: InspectorPanelContext): Record<string, unknown>;
  write(values: Record<string, unknown>, target: ReportSelectionTarget, context: InspectorPanelContext): InspectorWritePlan;
}

export interface InspectorWritePlan {
  actions: Array<Record<string, unknown>>;
}
```

这样可以避免 panel schema 直接知道太多底层字段路径。

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

并由多个 provider 组合，不要写成一个超级 schema。

## 16. 性能原则

### 16.1 shell 只订阅 active target

Inspector 不应订阅整个 document。

最小订阅集:

- `selectionTarget`
- `activeMeta`
- 当前 target 对应的 spreadsheet 基础值

### 16.2 schema 编译缓存

provider 产出的 schema 片段必须参与缓存。

建议缓存 key 至少包含:

- provider id
- target kind
- profile id
- schema version

### 16.3 panel 独立刷新

若一个 panel 提交后只影响自身数据，不应让整个 inspector 重建所有 tabs。

## 17. 错误与只读策略

Inspector 必须显式区分:

- provider 不匹配
- provider 出错
- profile 只读
- 当前 panel 只读

建议 shell 层统一渲染这些状态，而不是让每个 provider 重复处理。

## 18. 建议补充到合同中的接口

基于本文件，建议后续把 `contracts.md` 中的 inspector 相关接口升级为:

```ts
export interface InspectorPanelDescriptor {
  id: string;
  title: string;
  targetKind: ReportSelectionTargetKind;
  group?: string;
  order?: number;
  mode?: 'tab' | 'section' | 'inline';
  body: SchemaInput;
  submitAction?: Record<string, unknown>;
  readonly?: boolean;
  badge?: string;
}

export interface InspectorProvider {
  id: string;
  match(target: ReportSelectionTarget, context: ReportDesignerAdapterContext): boolean;
  getPanels(context: InspectorPanelContext): InspectorPanelDescriptor[] | Promise<InspectorPanelDescriptor[]>;
  priority?: number;
}
```

## 19. 最小实现顺序

如果开始编码，建议 inspector 先按以下顺序落地:

1. 实现 `report-inspector-shell`
2. 支持静态 provider -> 单 panel -> tab 渲染
3. 支持 target 切换与 host scope 注入
4. 支持 `report-designer:updateMeta` 提交
5. 支持 `ExpressionEditorAdapter` 字段映射
6. 支持动态 provider、多 panel、section 模式
7. 最后再补 `ReferencePickerAdapter`

## 20. 结论

Inspector 不是一个“右侧放个表单”的小问题，而是 `Report Designer` 通用性成立的关键。

最合理的做法是:

- 用 shell 统一承接布局和状态
- 用 provider 匹配 selection target
- 用 panel descriptor 标准化输出
- 用 schema/form runtime 复用现有 AMIS 能力
- 用 expression/reference adapter 处理特殊字段编辑体验

这样才能同时满足:

- standalone spreadsheet 的基础属性编辑
- 通用 report designer 的可定制属性页
- `nop-report` 这类 profile 的复杂领域配置
