# Tabs 组件设计

## 1. 组件定位

`tabs` 是一个已落地的容器型 renderer，用来在同一结构节点下组织多个互斥可见的内容面板。

它的职责是：

- 管理标签导航与激活态
- 为每个 tab 提供标题区与内容区
- 组织 toolbar、overflow、可关闭、可新增、可拖拽等交互壳
- 将 tab 切换暴露为 Flux 事件、动作和组件能力

它不是数据装配器，也不是设计器平台。动态 tabs 的结构生成应优先在 loader 完成；运行时只负责执行最终 schema，并在明确需要时支持有限的运行期重复与状态同步。

它也不是普通 `container` 的增强模式。`tabs` 的核心价值是互斥可见面板和激活态 ownership，而不是简单的 header/body 包装。

参考基线：AMIS `tabs` 的公开能力模型，以及当前仓库中的 `@nop-chaos/ui` tabs primitive 与 `docs/architecture/renderer-runtime.md`、`docs/architecture/field-metadata-slot-modeling.md`。

## 2. 设计目标

当前仓库已经注册通用 `tabs` renderer；本文档描述的是当前 live contract 与后续演进边界。

在 Flux 中，`tabs` 需要保留 AMIS `tabs` 的核心体验，但实现方式应服从现有架构：

- 使用 `RendererComponentProps`、`regions`、`events`、`helpers`
- 使用 `@nop-chaos/ui` 中的 `Tabs`、`TabsList`、`TabsTrigger`、`TabsContent`
- 使用 field metadata 区分 value、region、value-or-region、event
- 使用 action scope / component handle 暴露外部可调用能力
- 使用明确的状态 ownership，而不是把所有交互状态写死在本地 React state
- 对 `@nop-chaos/ui` / Base UI 已有 props，优先直接沿用其名称，如 `value`、`defaultValue`、`orientation`、`variant`

### Flux 决策表（X5 扩展，E3）

| 能力                                                                                        | 首版决定       | 理由                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| per-tab `badge?: string \| number`（数值角标）                                              | **实现**       | 管理 UI / 后台 tabs 极常见能力；DOM marker `data-slot="tab-badge"`；非数字非字符串值用 `String()` 兜底渲染（Failure Path `tabs-badge-invalid`，不抛错）。                                                                                                                           |
| per-tab `icon?: string`（Lucide 图标名）                                                    | **实现**       | 复用 `resolveLucideIcon`（与 button/icon renderer 一致）；DOM marker `data-slot="tab-icon"`；图标名无法 resolve 时占位图标兜底（不抛错）。                                                                                                                                          |
| per-tab `mountOnEnter?: boolean`（首次进入才挂载）                                          | **实现**       | 当前 `keepMounted={true}` 硬编码（`tabs.tsx:192`），per-tab 无法配置；本字段覆盖全局行为：`mountOnEnter: true` 时 inactive tab content 首次进入前不在 DOM；DOM marker `data-slot="tabs-content"` 保留。配合 `unmountOnExit` 实现懒挂载/卸载组合（见 Decision）。                    |
| per-tab `unmountOnExit?: boolean`（切走后卸载）                                             | **实现**       | 与 `mountOnEnter` 正交的卸载轴：`unmountOnExit: true` 时切走后 content 卸载（释放 DOM 与内部 owner runtime 状态）；缺省继承全局 keepMounted=true（保留状态，避免重建 form/detail 草稿丢失）。                                                                                       |
| amis `addable` / `closable` / `draggable` / `editable` / `hash` / `source` / `swipeable` 等 | 不采纳（后续） | §3/§17/§19 已显式列举延后理由：Flux 当前已有更明确的 action/runtime/component 分层，不应为兼容 AMIS 旧实现而把浏览器地址（hash）、DOM 滚动细节、ad hoc class 插槽提前固化成首版契约；这些能力的补齐应等真实宿主需求出现，并以独立 feature plan 重新评估（Non-Blocking Follow-up）。 |

**Decision（`mountOnEnter` / `unmountOnExit` 优先级）**：全局 `keepMounted=true`（当前 `tabs.tsx:192` 硬编码）作为缺省，per-tab `mountOnEnter` / `unmountOnExit` 覆盖。优先级规则（同时配 `mountOnEnter: true` + `unmountOnExit: true` 时）：**mountOnEnter 优先** —— tab content 首次进入才挂载（lazy mount），离开后按 `unmountOnExit` 卸载（Failure Path `tabs-mountOnEnter-conflict`）。具体语义：

- 两者均未配（缺省）：`keepMounted=true` 行为不变（inactive content 在 DOM，无回归，form/detail 草稿保留）。
- 仅 `mountOnEnter: true`：首次激活前不在 DOM；激活后保持 mounted（不再卸载，即便后续切走）。
- 仅 `unmountOnExit: true`：初始即 mounted；切走后卸载。
- 两者都配：首次激活前不在 DOM；激活后切走时按 `unmountOnExit` 卸载（每次进出均重新挂载/卸载）。

## 3. 与 AMIS 的能力对照

建议把 AMIS `tabs` 的能力拆成三层：

1. 首阶段必须支持
   - 静态 `items`
   - `value` / `defaultValue`
   - `toolbar`
   - `title` / `label`、`disabled`
   - `change` 事件
   - `setValue` / `getValue` 能力

2. 当前实现已支持或已显式保留的能力
   - `items` 的表达式或 `type: 'source'` 动态输入
   - `tabsMode` / `sidePosition` 与 `variant` / `orientation` 的并存映射
   - `statusPath`
   - `valueOwnership` / `valueStatePath`

3. 谨慎收敛或延后支持
   - `closable` / `remove` 事件 / `removeItem` 动作
   - `addable`
   - `draggable`
   - `showTooltip`
   - form 值绑定
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
  items?: Array<Record<string, any>>;
  value?: string | number;
  defaultValue?: string | number;
  statusPath?: string;
  variant?: 'default' | 'line';
  orientation?: 'horizontal' | 'vertical';
  tabsMode?:
    | ''
    | 'line'
    | 'card'
    | 'radio'
    | 'vertical'
    | 'chrome'
    | 'simple'
    | 'strong'
    | 'tiled'
    | 'sidebar';
  sidePosition?: 'left' | 'right';
  toolbar?: SchemaInput;
  valueOwnership?: 'local' | 'controlled' | 'scope';
  valueStatePath?: string;
  contentClassName?: string;
  toolbarClassName?: string;
  onChange?: ActionSchema;
}
```

说明：

- `name` 仅在组件需要参与表单值时使用。
- `items` 是 tabs 的唯一正式集合字段；如果需要动态值输入，应优先让 `items` 直接接收表达式结果，或在 renderer field metadata 允许时接收内联 `type: 'source'`。
- `value` / `defaultValue` 与底层 tabs primitive 对齐，避免在 renderer、schema、UI 三层之间再制造 `activeKey` 这类同义命名。
- `statusPath` 当前已 live，用于发布 tabs owner 的只读摘要。
- `valueOwnership` 复用现有 runtime ownership 设计语言，避免未来 tabs 又形成独立状态模型。
- 当前实现同时保留 `variant` / `orientation` 与 `tabsMode` / `sidePosition`。其中前者更贴近 Flux/UI primitive 命名，后者是当前 live contract 的兼容表达。
- 如果页面需要从业务数据映射出 tabs 结构，更符合 Flux 最终模型原则的做法是由 loader 先产出最终 `items`，而不是让 `tabs` renderer 内部承担结构生成。

### 5.2 单个 tab schema

```ts
interface TabItemSchema extends BaseSchemaWithoutType {
  key?: string | number;
  value?: string | number;
  title?: string;
  label?: string;
  disabled?: boolean | string;
  badge?: string | number;
  icon?: string;
  mountOnEnter?: boolean;
  unmountOnExit?: boolean;
  titleRegionKey?: string;
  bodyRegionKey?: string;
  toolbarRegionKey?: string;
}
```

收敛规则：

- 当前 live item 结构通过 `titleRegionKey`、`bodyRegionKey`、`toolbarRegionKey` 把 item 内部 region 显式编译成命名 handle；renderer 不直接回收原始子 schema。
- `title` 与 `label` 当前都可作为静态标题来源，最终显示值按 `titleRegion -> title -> label -> value` 的顺序回退。
- `key` / `value` 共同参与激活值解析，当前实现优先 `value ?? key ?? index`。
- `badge?: string | number` 在标题旁渲染角标（`@nop-chaos/ui` Badge，DOM marker `data-slot="tab-badge"`）；非数字非字符串值用 `String()` 兜底（不抛错）。
- `icon?: string` 在标题前渲染 Lucide 图标（`resolveLucideIcon`，DOM marker `data-slot="tab-icon"`）；无法 resolve 时占位图标兜底。
- `mountOnEnter?: boolean` / `unmountOnExit?: boolean` 覆盖全局 `keepMounted=true`（缺省），详见 §2 Decision 优先级规则。

## 6. 字段分类

`tabs` renderer 应显式声明字段语义，避免在 renderer 内靠字段名猜测。

建议字段分类：

| 字段           | 语义                                 | 说明                                                                                        |
| -------------- | ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `value`        | value                                | 当前激活项，对齐 UI primitive 的 value 语义                                                 |
| `defaultValue` | value                                | 初始化默认值，对齐 UI primitive 的 defaultValue                                             |
| `items`        | ignored 或 renderer-owned deep field | renderer 自身按 item 子结构协议解释；如需表达式或 source 输入，需要显式定义该字段的解析策略 |
| `toolbar`      | region                               | 顶部工具栏区域                                                                              |
| `onChange`     | event                                | tab 切换动作                                                                                |
| `statusPath`   | value                                | 发布只读状态摘要                                                                            |
| `tabsMode`     | value                                | 当前 live 的视觉模式输入                                                                    |
| `sidePosition` | value                                | 当前 live 的 sidebar 方向补充                                                               |

单个 `TabItemSchema` 的关键字段：

| 字段               | 语义       | 说明                                            |
| ------------------ | ---------- | ----------------------------------------------- |
| `title`            | value      | 静态标题文本                                    |
| `label`            | value      | 兼容静态标题别名                                |
| `titleRegionKey`   | region key | 指向标题 region handle                          |
| `bodyRegionKey`    | region key | 指向内容 region handle                          |
| `toolbarRegionKey` | region key | 指向 item 工具区 handle                         |
| `disabled`         | value      | 可为表达式                                      |
| `badge`            | value      | 标题旁角标（string/number）                     |
| `icon`             | value      | 标题前 Lucide 图标名（string）                  |
| `mountOnEnter`     | value      | 首次进入才挂载（boolean，覆盖全局 keepMounted） |
| `unmountOnExit`    | value      | 切走后卸载（boolean，覆盖全局 keepMounted）     |

`items` 数组本身不适合简单作为普通 `prop`。推荐为 `items` 增加专门的 renderer-level 解析流程：

- 编译期保留 item 原始结构及其字段规则
- 运行期按 item 逐个解析标题、状态和内容 region handle
- renderer 消费的是规范化后的 `resolvedItems[]`

## 7. Region 与 slot 约定

建议 `tabs` renderer 暴露以下命名区域：

- `toolbar`：tabs 顶栏右侧或上侧工具区
- `items[].titleRegionKey`：标题 region handle
- `items[].bodyRegionKey`：内容 region handle
- `items[].toolbarRegionKey`：tab 级工具区 region handle

实现建议：

- 顶层 `toolbar` 直接走标准 region。
- `items[].bodyRegionKey` / `items[].titleRegionKey` / `items[].toolbarRegionKey` 由编译期或 schema 规范化阶段产出，运行期只按 key 读取 `props.regions[...]`。

这与 `docs/architecture/field-metadata-slot-modeling.md` 的原则一致：renderer 只消费规范化后的 `props` 和 `regions`。

## 8. 激活态与状态归属

`tabs` 的核心内部状态是“当前激活项”。该状态不能只有一种本地实现，应该支持 ownership：

从统一 owner 模型看，`tabs` 属于 interaction owner，而不是 page owner，也不是 surface owner。

因此：

- tab 切换状态不应上卷到 `page`
- tab 切换状态也不应与 dialog/drawer 的 surface open-state 混用
- 如果未来需要对外发布 tabs 只读状态摘要，优先通过 `statusPath`
- `valueStatePath` 继续负责可写激活态持久化；`statusPath` 若存在，则负责只读摘要发布
- 当前 supported baseline 下，inactive tab panels 保持 mounted；`tabs` 只切换 active/inactive state，不因 panel unmount 重建 hidden subtree，因此其中 form/detail 等 owner runtime 的本地草稿值需要保留

## 9. 与其他容器的边界

- 与 `container`：只需要普通内容壳层时用 `container`；需要互斥面板和激活态时用 `tabs`。
- 与 `flex`：`flex` 只解决布局，不解决 panel activation。
- 与 `dialog` / `drawer`：surface open-state 与 tabs activation 是两条不同状态轴，不能混为一类容器。

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

## 10. 可见性与候选激活项修正

当当前激活 tab 不可见、被删除、或数据源变化导致不存在时，需要自动修正激活项。

建议规则：

1. 优先保留当前 key，如果对应 tab 仍存在且可见
2. 否则向右查找最近可见项
3. 再向左查找最近可见项
4. 仍不存在则清空激活态，并渲染 empty shell 或不渲染内容区

这里的“可见”应由 item 级 `visible`/`hidden` 之类的规范 meta 决定，而不是 DOM 检测。

## 11. `items` 的动态输入

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

## 12. 事件设计

当前 live 事件集：

| 事件     | 参数             | 说明       |
| -------- | ---------------- | ---------- |
| `change` | `value`, `index` | 激活项变化 |

建议事件字段命名：

- `onChange`

事件 payload 应直接走 Flux `ActionSchema` 事件分发，不需要保留 AMIS 的字符串脚本 `onSelect: "alert(key)"` 形式。

## 13. 动作与组件能力

`tabs` 应同时支持两类外部驱动方式。

### 13.1 声明式动作

当前 live 声明式能力：

- `component:setValue`

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

### 13.2 组件句柄能力

当前 live capability：

- `component:setValue`
- `component:getValue`

这与 `docs/architecture/action-scope-and-imports.md`、`docs/architecture/component-resolution.md` 的组件定向调用模型一致。

## 14. 表单集成

当前 live runtime 仍以 interaction owner 为主，尚未提供专门的 tabs 表单值投影 contract。

建议边界：

- `tabs` 当前应优先视为布局/交互容器，而不是表单字段
- 如果后续要接入 form runtime，应显式补文档与实现，而不是继续沿用 AMIS 的“默认把 active tab 当字段值”规则
- 不建议把标题文案当提交值；稳定业务值仍应优先来自 `value` / `key`

## 15. 样式与 DOM 约定

实现应基于 `@nop-chaos/ui` 的 tabs primitives，而不是重新造一套 DOM/交互系统。

建议：

- 根节点保留稳定 marker，例如 `nop-tabs`
- 标题栏使用 `TabsList`
- 标题项使用 `TabsTrigger`
- 内容区使用 `TabsContent`
- 根节点与关键内部槽位输出 `data-slot`，遵守 `@nop-chaos/ui` 既有模式
- per-tab `badge` 在 `TabsTrigger` 内输出 `data-slot="tab-badge"`；per-tab `icon` 在 `TabsTrigger` 内输出 `data-slot="tab-icon"`

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

## 16. 实现拆分建议

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

## 17. 实现阶段建议

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

## 18. 关键取舍

1. 不直接复制 AMIS 的 `tab` 字段，统一收敛到 `body`
2. 不保留字符串脚本式 `onSelect`，统一走 Flux `ActionSchema`
3. 不默认把 title 当提交值，避免展示文案和业务值耦合
4. 当前 live contract 保留 `tabsMode` / `sidePosition`，但后续若继续收敛，优先朝 `variant` + `orientation` 靠拢，而不是反向扩大 AMIS mode 名称
5. 直接映射到底层 UI primitive 的字段优先沿用其现有命名，如 `value` / `defaultValue` / `orientation`
6. `addable`、`closable`、`draggable` 作为 renderer 扩展能力保留语义原名，不额外改造成 `allowXxx`
7. 对外部驱动优先提供 component handle capability，而不是暴露 React ref

## 19. 与 AMIS 字段对照

下表仅用于迁移和参考，不代表 Flux 正式契约保留这些旧字段。

| AMIS 字段          | Flux 建议字段                                                | 说明                                                                                            |
| ------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `tabs`             | `items`                                                      | 集合统一命名                                                                                    |
| `source`           | 不作为首选正式字段                                           | 优先让 `items` 直接承载最终数组值；如需动态来源，走 `${expr}` 或 field-enabled `type: 'source'` |
| `activeKey`        | `value`                                                      | 与底层 tabs primitive 对齐                                                                      |
| `defaultKey`       | `defaultValue`                                               | 与底层 tabs primitive 对齐                                                                      |
| `tabsMode`         | `tabsMode`（live），后续可渐进收敛到 `variant`/`orientation` | 当前代码已实现并消费                                                                            |
| `sidePosition`     | `sidePosition`（live）                                       | 当前代码已实现 sidebar 方向补充                                                                 |
| `addable`          | future `addable`                                             | 当前 live 未实现                                                                                |
| `closable`         | future `closable`                                            | 当前 live 未实现                                                                                |
| `draggable`        | future `draggable`                                           | 当前 live 未实现                                                                                |
| `showTip`          | future `showTooltip`                                         | 当前 live 未实现                                                                                |
| `collapseOnExceed` | future overflow-related contract                             | 当前 live 未实现                                                                                |
| `collapseBtnLabel` | future overflow-related contract                             | 当前 live 未实现                                                                                |
| `hash`             | future route/deep-link contract                              | 当前 live 未实现                                                                                |
| `tab`              | compiled `bodyRegionKey` / region handle                     | 当前 live 通过 region key 消费内容                                                              |
| `changeActiveKey`  | `component:setValue`                                         | 与底层 value 语义对齐                                                                           |
| `deleteTab`        | future `component:removeItem`                                | 当前 live 未实现                                                                                |

## 20. 与架构文档的关系

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
