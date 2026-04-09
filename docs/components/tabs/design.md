# Tabs 组件设计

## 1. 组件定位

规划中的 `tabs` 是一个容器型 renderer，用来在同一结构节点下组织多个互斥可见的内容面板。

它的职责是：

- 管理标签导航与激活态
- 为每个 tab 提供标题区与内容区
- 组织 toolbar、overflow、可关闭、可新增、可拖拽等交互壳
- 将 tab 切换暴露为 Flux 事件、动作和组件能力

它不是数据装配器，也不是设计器平台。动态 tabs 的结构生成应优先在 loader 完成；运行时只负责执行最终 schema，并在明确需要时支持有限的运行期重复与状态同步。

参考基线：AMIS `tabs` 的公开能力模型，以及当前仓库中的 `@nop-chaos/ui` tabs primitive 与 `docs/architecture/renderer-runtime.md`、`docs/architecture/field-metadata-slot-modeling.md`。

## 2. 设计目标

当前仓库尚未注册通用 `tabs` renderer；本文档描述的是已经文档化、用于后续实现与验证的目标契约。

在 Flux 中，`tabs` 需要保留 AMIS `tabs` 的核心体验，但实现方式应服从现有架构：

- 使用 `RendererComponentProps`、`regions`、`events`、`helpers`
- 使用 `@nop-chaos/ui` 中的 `Tabs`、`TabsList`、`TabsTrigger`、`TabsContent`
- 使用 field metadata 区分 value、region、value-or-region、event
- 使用 action scope / component handle 暴露外部可调用能力
- 使用明确的状态 ownership，而不是把所有交互状态写死在本地 React state
- 对 `@nop-chaos/ui` / Base UI 已有 props，优先直接沿用其名称，如 `value`、`defaultValue`、`orientation`、`variant`

## 3. 与 AMIS 的能力对照

建议把 AMIS `tabs` 的能力拆成三层：

1. 首阶段必须支持
   - 静态 `items`
   - `value` / `defaultValue`
   - `mountOnEnter` / `unmountOnExit`
   - `toolbar`
   - `title`、`icon`、`disabled`
   - `change` 事件
   - `setValue` 动作

2. 第二阶段建议支持
   - `items` 的表达式或 `type: 'source'` 动态输入
   - `closable` / `remove` 事件 / `removeItem` 动作
   - `addable`
   - `draggable`
   - `variant` / `orientation`
   - `showTooltip`
   - form 值绑定

3. 谨慎收敛或延后支持
   - 双击编辑 `editable`
   - hash 与地址栏联动
   - `collapseOnExceed`
   - 移动端 `swipeable`
   - 完全兼容 AMIS 的所有样式 mode 名称和 className 插槽

原因：Flux 当前已经有更明确的 action/runtime/component 分层，不应为了兼容 AMIS 旧实现而把浏览器地址、DOM 滚动细节或 ad hoc class 插槽提前固化成首版契约。

## 4. Renderer 类型与包边界

建议归属：`@nop-chaos/flux-renderers-basic`

原因：

- `tabs` 是通用容器，不属于 form 专有控件
- 它主要依赖 renderer runtime、fragment rendering、component handle 与 UI primitives
- 如需表单参与，应通过可选 field/runtime registration 接入，而不是把整个组件放入 form 包

建议 renderer definition 元数据方向：

```ts
{
  type: 'tabs',
  displayName: 'Tabs',
  category: 'layout',
  sourcePackage: '@nop-chaos/flux-renderers-basic'
}
```

## 5. Schema 设计

### 5.1 顶层 schema

```ts
interface TabsSchema extends BaseSchema {
  type: 'tabs';
  name?: string;
  items?: TabItemSchema[] | SchemaValue;
  value?: string | number;
  defaultValue?: string | number;
  valueMode?: 'key' | 'index' | 'value';
  mountOnEnter?: boolean;
  unmountOnExit?: boolean;
  variant?: 'default' | 'line';
  orientation?: 'horizontal' | 'vertical';
  toolbar?: SchemaInput;
  addable?: boolean;
  addTrigger?: SchemaInput;
  closable?: boolean;
  draggable?: boolean;
  showTooltip?: boolean;
  overflowMode?: 'wrap' | 'scroll' | 'collapse';
  overflowCollapseLimit?: number;
  overflowTriggerLabel?: SchemaValue;
  valueOwnership?: 'local' | 'controlled' | 'scope';
  valueStatePath?: string;
  onChange?: ActionSchema;
  onRemove?: ActionSchema;
  onAdd?: ActionSchema;
  onReorder?: ActionSchema;
}
```

说明：

- `name` 仅在组件需要参与表单值时使用。
- `items` 是 tabs 的唯一正式集合字段；如果需要动态值输入，应优先让 `items` 直接接收表达式结果，或在 renderer field metadata 允许时接收内联 `type: 'source'`。
- `value` / `defaultValue` 与底层 tabs primitive 对齐，避免在 renderer、schema、UI 三层之间再制造 `activeKey` 这类同义命名。
- `valueMode` 用来明确对外发布和比较当前 tab 值时的语义，避免把 AMIS 里“hash / index / value / title 混用”的规则继续扩大。
- `valueOwnership` 复用现有 runtime ownership 设计语言，避免未来 tabs 又形成独立状态模型。
- `variant` 与 `orientation` 对齐当前 `@nop-chaos/ui` tabs primitives 的命名，而不是继续扩散组件私有的 `tabsMode`。
- 如果页面需要从业务数据映射出 tabs 结构，更符合 Flux 最终模型原则的做法是由 loader 先产出最终 `items`，而不是让 `tabs` renderer 内部承担结构生成。
- `addable`、`closable`、`draggable` 属于 tabs renderer 扩展能力，不是当前 UI primitive 的原生 prop；这里保留现有语义词，而不再额外改造成 `allowAdd`、`allowRemove`、`allowReorder`。

### 5.2 单个 tab schema

```ts
interface TabItemSchema extends BaseSchemaWithoutType {
  key?: string | number;
  value?: string | number;
  title?: SchemaValue | SchemaInput;
  icon?: SchemaValue;
  iconPosition?: 'left' | 'right';
  badge?: SchemaValue;
  disabled?: SchemaValue;
  closable?: SchemaValue;
  routeFragment?: string;
  mountOnEnter?: boolean;
  unmountOnExit?: boolean;
  body?: SchemaInput;
  toolbar?: SchemaInput;
  className?: string;
}
```

收敛规则：

- 用 `body` 作为规范内容字段，不再引入 AMIS 兼容字段 `tab`。
- `title` 采用 `value-or-region`，允许简单字符串，也允许 schema 片段。
- `key` 是首选的稳定标识；`routeFragment` 只在需要 URL 联动时使用，不能替代内部主键语义。
- item 级挂载策略优先复用 `mountOnEnter` / `unmountOnExit`，而不是再引入额外的 `lazy`、`keepAlive` 私有命名。

## 6. 字段分类

`tabs` renderer 应显式声明字段语义，避免在 renderer 内靠字段名猜测。

建议字段分类：

| 字段 | 语义 | 说明 |
| --- | --- | --- |
| `value` | value | 当前激活项，对齐 UI primitive 的 value 语义 |
| `defaultValue` | value | 初始化默认值，对齐 UI primitive 的 defaultValue |
| `items` | ignored 或 renderer-owned deep field | renderer 自身按 item 子结构协议解释；如需表达式或 source 输入，需要显式定义该字段的解析策略 |
| `toolbar` | region | 顶部工具栏区域 |
| `addTrigger` | region | 自定义新增入口区域 |
| `onChange` | event | tab 切换动作 |
| `onRemove` | event | tab 移除动作 |
| `onAdd` | event | 新增动作 |
| `onReorder` | event | 重排动作 |

单个 `TabItemSchema` 的关键字段：

| 字段 | 语义 | 说明 |
| --- | --- | --- |
| `title` | value-or-region | 文本标题或 schema 标题 |
| `body` | region | 面板内容 |
| `toolbar` | region | tab 级附加操作 |
| `disabled` | value | 可为表达式 |
| `closable` | value | item 优先级高于组件级 |

`items` 数组本身不适合简单作为普通 `prop`。推荐为 `items` 增加专门的 renderer-level 解析流程：

- 编译期保留 item 原始结构及其字段规则
- 运行期按 item 逐个解析标题、状态和内容 region handle
- renderer 消费的是规范化后的 `resolvedItems[]`

## 7. Region 与 slot 约定

建议 `tabs` renderer 暴露以下命名区域：

- `toolbar`：tabs 顶栏右侧或上侧工具区
- `addTrigger`：自定义新增入口
- `items[].title`：仅当标题为 schema 时形成匿名 title region
- `items[].body`：每个 tab 的内容 region
- `items[].toolbar`：单个 tab 头部右侧补充能力

实现建议：

- 顶层 `toolbar`、`addTrigger` 可直接走标准 region。
- `items[].body` 属于 item 内部 region，应在 tabs item 规范化阶段为每个 item 创建 render handle。
- `items[].title` 如为 schema，也应编译为 region，而不是让 renderer 直接拿原始 schema 再次递归。

这与 `docs/architecture/field-metadata-slot-modeling.md` 的原则一致：renderer 只消费规范化后的 `props` 和 `regions`。

## 8. 激活态与状态归属

`tabs` 的核心内部状态是“当前激活项”。该状态不能只有一种本地实现，应该支持 ownership：

从统一 owner 模型看，`tabs` 属于 interaction owner，而不是 page owner，也不是 surface owner。

因此：

- tab 切换状态不应上卷到 `page`
- tab 切换状态也不应与 dialog/drawer 的 surface open-state 混用
- 如果未来需要对外发布 tabs 只读状态摘要，优先通过 `statusPath`
- `valueStatePath` 继续负责可写激活态持久化；`statusPath` 若存在，则负责只读摘要发布

### 8.1 `local`

默认模式。

- 初始化时从 `defaultValue` 或首个可见 tab 推导
- 用户点击后由组件内部维护
- 同步触发 `onChange`

### 8.2 `controlled`

外部 `value` 是唯一真值。

- renderer 不把点击结果长期保存在内部
- 点击时只发 `onChange`
- 由外部 scope/form/page 数据回写 `value`

### 8.3 `scope`

激活态写入明确的 scope path，例如 `valueStatePath: 'ui.tabs.main.value'`

- 组件通过 `useScopeSelector` 订阅该路径
- 点击时写回 scope
- 适合设计器、多视图工作台和需要跨组件联动的页面

这比 AMIS 的“既支持 value、又支持 name、又支持 hash、又可能本地 state”更清晰。

目标设计补充：

- `valueStatePath` 用于 active tab 这一可写交互轴
- 若后续补充 `statusPath`，其职责应是发布 owner-level readonly summary，例如 `activeKey`、`activeIndex`、`canCloseActive`，而不是替代 `valueStatePath`
- 是否增加局部 `$tabs` 绑定，应等证明 subtree-local authoring 有稳定需求后再决定，不应先于 `statusPath` 收口

## 9. 可见性与候选激活项修正

当当前激活 tab 不可见、被删除、或数据源变化导致不存在时，需要自动修正激活项。

建议规则：

1. 优先保留当前 key，如果对应 tab 仍存在且可见
2. 否则向右查找最近可见项
3. 再向左查找最近可见项
4. 仍不存在则清空激活态，并渲染 empty shell 或不渲染内容区

这里的“可见”应由 item 级 `visible`/`hidden` 之类的规范 meta 决定，而不是 DOM 检测。

## 10. `items` 的动态输入

按 Flux 当前设计原则，`tabs` 正式契约应优先保留单一 `items` 字段，而不是拆成 `items` + `itemsSource` 两个平行字段。

更符合当前架构的优先级是：

1. 最优先：loader 直接产出最终 `items: TabItemSchema[]`
2. 次优先：`items` 使用 `${expr}`，表达式结果本身就是最终 `TabItemSchema[]`
3. 在确有需要且 field metadata 明确允许时：`items` 接受内联 `type: 'source'`，运行时异步产出最终 `TabItemSchema[]`

推荐写法：

```json
{
  "type": "tabs",
  "items": "${reports}"
}
```

前提是 `${reports}` 的结果已经是最终 tabs item 结构，而不是普通业务数据行。

如果拿到的是普通业务数据，例如报表列表、领域对象数组，而不是 tabs item 数组，则更推荐：

1. loader 先把业务数据映射为最终 `items`
2. 或者由更通用的迭代/投影能力生成 tabs schema

不建议把“原始数据数组 + tabs 私有模板重复协议”作为 `tabs` 首版正式 DSL 基线。

注意：

- 这和 `docs/architecture/flux-dsl-vm-extensibility.md` 的最终模型原则一致：运行时应执行最终结构，不应承担主要结构生成职责。
- 这也和 `docs/architecture/field-metadata-slot-modeling.md` 的“一种概念尽量一个字段名”一致，避免把集合本体和集合来源拆成两个默认并行字段。

## 11. 事件设计

建议最小事件集：

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `change` | `value`, `index`, `item` | 激活项变化 |
| `remove` | `key`, `index`, `item` | 移除 tab |
| `add` | `index?` | 请求新增 tab |
| `reorder` | `fromIndex`, `toIndex`, `item` | 重排 tab |

建议事件字段命名：

- `onChange`
- `onRemove`
- `onAdd`
- `onReorder`

事件 payload 应直接走 Flux `ActionSchema` 事件分发，不需要保留 AMIS 的字符串脚本 `onSelect: "alert(key)"` 形式。

## 12. 动作与组件能力

`tabs` 应同时支持两类外部驱动方式。

### 12.1 声明式动作

建议支持：

- `component:setValue`
- `component:removeItem`
- `component:addItem`
- `component:moveItem`

示例：

```json
{
  "action": "component:setValue",
  "componentId": "mainTabs",
  "args": {
    "value": "details"
  }
}
```

### 12.2 组件句柄能力

建议 `tabs` 注册如下 capability：

- `component:setValue`
- `component:getValue`
- `component:getItems`
- `component:addItem`
- `component:removeItem`
- `component:moveItem`

这与 `docs/architecture/action-scope-and-imports.md`、`docs/architecture/component-resolution.md` 的组件定向调用模型一致。

## 13. 表单集成

当声明 `name` 时，`tabs` 可以作为一个轻量表单字段参与表单值同步，但需要明确规则。

建议：

- `valueMode: 'key'` 时，表单值取当前 tab 的 `key`
- `valueMode: 'index'` 时，取当前索引
- `valueMode: 'value'` 时，取 item 的 `value`
- 默认建议为 `key`

不建议继续沿用 AMIS 的“没配 value 就提交 title”。原因是标题是展示文案，不是稳定业务值。

如果 `tabs` 仅用于布局切换，不建议默认参与表单；必须显式提供 `name` 才接入表单运行时。

## 14. 样式与 DOM 约定

实现应基于 `@nop-chaos/ui` 的 tabs primitives，而不是重新造一套 DOM/交互系统。

建议：

- 根节点保留稳定 marker，例如 `nop-tabs`
- 标题栏使用 `TabsList`
- 标题项使用 `TabsTrigger`
- 内容区使用 `TabsContent`
- 根节点与关键内部槽位输出 `data-slot`，遵守 `@nop-chaos/ui` 既有模式

样式规则：

- renderer 仅输出 marker class 和必要状态属性
- 视觉布局通过 `className`、`classAliases`、语义样式 prop 决定
- 不在 renderer 中硬编码 `gap-*`、`p-*`、`flex-*` 作为不可覆盖布局

`variant` 与 `orientation` 的首版建议直接对齐当前 UI primitives：

- `default`
- `line`
- `vertical`

其中：

- `variant` 首版建议支持 `default`、`line`
- `orientation` 首版建议支持 `horizontal`、`vertical`

像 AMIS 的 `chrome`、`strong`、`sidebar` 这类风格可以后续作为 host theme、schema preset 或扩展 variant 再补，不应先固化为基础 renderer 契约。

## 15. 实现拆分建议

建议拆分为以下模块：

- `schemas.ts`
  - `TabsSchema`、`TabItemSchema`
- `tabs-definition.ts`
  - renderer definition、fields、defaultSchema、tooling metadata
- `tabs-renderer.tsx`
  - renderer 主组件
- `tabs-state.ts`
  - 激活项归属、key 解析、fallback 逻辑
- `tabs-items.ts`
  - item 规范化、title/body region 处理
- `tabs-handle.ts`
  - component handle capability 注册

如果首版实现较小，也可以先保留在一个文件中，但状态解析和 item 规范化逻辑仍应与 JSX 渲染逻辑分开。

## 16. 实现阶段建议

### Phase 1

- 静态 items
- `title` 文本/region
- `body` region
- `value` / `defaultValue`
- `change` 事件
- `component:setValue`
- `toolbar`

### Phase 2

- `items` 的表达式值或 field-enabled `type: 'source'`
- `name` + 表单值联动
- `closable` / `remove`
- `variant` / `orientation`
- `valueOwnership: 'scope'`

### Phase 3

- `draggable`
- `addable`
- overflow collapse
- route fragment / deep-link
- mobile swipe

## 17. 关键取舍

1. 不直接复制 AMIS 的 `tab` 字段，统一收敛到 `body`
2. 不保留字符串脚本式 `onSelect`，统一走 Flux `ActionSchema`
3. 不默认把 title 当提交值，避免展示文案和业务值耦合
4. 不把 `tabsMode` 直接搬进正式契约，改用 `variant` + `orientation` + `overflowMode`
5. 直接映射到底层 UI primitive 的字段优先沿用其现有命名，如 `value` / `defaultValue` / `orientation`
6. `addable`、`closable`、`draggable` 作为 renderer 扩展能力保留语义原名，不额外改造成 `allowXxx`
7. 对外部驱动优先提供 component handle capability，而不是暴露 React ref

## 18. 与 AMIS 字段对照

下表仅用于迁移和参考，不代表 Flux 正式契约保留这些旧字段。

| AMIS 字段 | Flux 建议字段 | 说明 |
| --- | --- | --- |
| `tabs` | `items` | 集合统一命名 |
| `source` | 不作为首选正式字段 | 优先让 `items` 直接承载最终数组值；如需动态来源，走 `${expr}` 或 field-enabled `type: 'source'` |
| `activeKey` | `value` | 与底层 tabs primitive 对齐 |
| `defaultKey` | `defaultValue` | 与底层 tabs primitive 对齐 |
| `tabsMode` | `variant` + `orientation` + `overflowMode` | 视觉与布局语义拆开 |
| `sidePosition` | 暂不作为基础契约 | 首版不提前固化右侧标签栏 |
| `addable` | `addable` | 保留 renderer 扩展能力语义名 |
| `closable` | `closable` | 组件级与 item 级都沿用同词根 |
| `draggable` | `draggable` | 保留现有交互能力语义 |
| `showTip` | `showTooltip` | 避免缩写风格扩散 |
| `collapseOnExceed` | `overflowCollapseLimit` | 归入 overflow 语义组 |
| `collapseBtnLabel` | `overflowTriggerLabel` | 归入 overflow 语义组 |
| `hash` | `routeFragment` | 避免 URL 原始实现细节直接进入主契约 |
| `tab` | `body` | 统一内容字段 |
| `changeActiveKey` | `component:setValue` | 与底层 value 语义对齐 |
| `deleteTab` | `component:removeItem` | 集合项操作统一语言 |

## 19. 与架构文档的关系

本组件设计依赖以下架构文档：

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/component-resolution.md`
- `docs/architecture/styling-system.md`
- `docs/architecture/flux-dsl-vm-extensibility.md`
- `docs/architecture/api-data-source.md`

其中：

- renderer contract、hooks、regions 以 `renderer-runtime.md` 为准
- 字段如何成为 prop/region/event 以 `field-metadata-slot-modeling.md` 为准
- 外部动作与组件句柄能力以 `action-scope-and-imports.md`、`component-resolution.md` 为准
- 样式输出边界以 `styling-system.md` 为准
- `source` 和最终模型边界以 `api-data-source.md`、`flux-dsl-vm-extensibility.md` 为准
