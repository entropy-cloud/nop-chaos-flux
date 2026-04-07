# Components Design Index

## Purpose

`docs/components/` 用来沉淀具体组件级设计输入。

这里不是面向最终用户的使用手册，而是面向开发、设计器接入、schema 生成、AI 产码与后续实现的组件契约文档。

每个组件一个目录，至少包含一个 `design.md` 和一个 `example.json`。

批量验证 `example.json` 时，还应同时读取 `docs/components/examples.manifest.json`：

- `runtime` 表示当前仓库里已有注册实现，可直接作为运行时示例验证。
- `targetContract` 表示当前仍是目标契约示例，用于后续实现验证，不应被当成“当前一定可运行”的 schema。
- `declaredButUnregistered` 表示类型已声明但故意未注册，示例用于设计器/实现准备，不应用作现成 registry 的通过样本。

## 目录约定

```text
docs/components/
  index.md
  roadmap.md
  examples.manifest.json
  tabs/
    design.md
    example.json
  table/
    design.md
    example.json
  form/
    design.md
    example.json
```

推荐规则：

- 目录名使用 schema `type` 或稳定组件名，例如 `tabs`、`table`、`form`。
- 组件有明显子域时，可以在组件目录内继续拆分，如 `design.md`、`actions.md`、`notes.md`，但 `design.md` 和 `example.json` 仍应作为最小必备文件。
- 文档描述的是 Flux 最终 DSL 下的契约，不直接复制 AMIS 的 React 实现细节。
- 历史上的 `docs/component-list.md` 已退役；组件规划与优先级统一收敛到 `docs/components/roadmap.md`。

## 单组件文档建议结构

每个组件文档建议至少覆盖以下内容：

1. 组件定位
2. 与 AMIS 或既有产品的能力对照
3. Flux 中的 renderer/type 定义
4. schema 设计
5. 字段分类
6. regions 与 slot 约定
7. 运行期状态归属
8. 事件、动作与组件句柄能力
9. 数据源、表达式、导入能力接入点
10. 样式与 DOM marker 约定
11. 实现拆分建议
12. 风险、取舍与后续阶段

## 写作规则

- 优先引用 `docs/architecture/` 中已经确定的机制，而不是重新发明组件私有协议。
- schema 字段要明确区分：静态值、表达式值、region、event、source-enabled value。
- 需要组件内部状态时，先判断是 `local`、`controlled` 还是 `scope` ownership，不要默认全塞进 React 本地 state。
- 可被外部动作驱动的交互能力，优先落到 action / component handle，而不是 undocumented imperative ref。
- 样式设计必须遵守 renderer marker contract；视觉布局来自 schema/className/classAliases，而不是 renderer 内硬编码布局。

## 命名与兼容原则

组件文档在命名、schema 契约、动作命名、字段语义上，必须优先遵守 `nop-chaos-flux` 当前架构中的标准名称。

这意味着：

- 文档不是 AMIS 属性表翻译，不以保留 AMIS 原字段名为目标。
- 如果 AMIS 命名与 Flux 当前架构约定不一致，应优先采用 Flux 标准名称，并在组件文档中说明与 AMIS 的语义映射关系。
- 只有在存在明确兼容目标、迁移约束、已落地运行时代码、或外部 schema 生态依赖时，才保留 AMIS 旧名称；否则应按当前项目标准重新命名。

具体要求：

- JSON key 使用 camelCase，遵守 `docs/references/flux-json-conventions.md`。
- action 命名遵守当前项目约定：内置 action 用 camelCase，组件实例能力用 `component:<method>`，宿主或导入能力用 `namespace:method`。
- 事件入口优先使用 `onXxx: ActionSchema` 形式，不使用字符串脚本或 AMIS 风格的历史事件写法。
- 如果某个 schema 字段是对 `@nop-chaos/ui` 或底层 primitive props 的直接投影，优先沿用 UI 组件已有名称，不要为了 DSL 风格再另起一套同义名。
- renderer 字段命名应与 `field-metadata-slot-modeling.md` 的语义一致，优先区分 value、region、value-or-region、event，而不是沿用上游框架的混合命名。
- 组件状态字段命名应复用当前 runtime 已存在的 ownership 语言，如 `local`、`controlled`、`scope`，不要为单个组件再发明一套平行术语。
- 样式字段命名应复用当前 styling system 约定，如 `className`、`classAliases`、语义 style props；不要因为 AMIS 现有命名就直接扩散新的 className 变体字段。
- region/slot 命名应与 renderer runtime 和 slot 建模文档一致，优先使用 `body`、`header`、`footer`、`toolbar`、`empty` 这类自然业务名，不为兼容上游而保留不自然字段。

推荐做法：

- 先用 Flux 标准名称写最终建议 schema。
- 再单独增加“与 AMIS 对照”一节，说明上游字段和 Flux 字段的映射。
- 不要把“当前建议名称”和“兼容别名”混写成同一层正式契约，避免文档本身再次制造双语义。

## 标准名称速查

本节不是穷尽性的类型定义，而是组件文档编写时应优先复用的命名基线。

### 1. 基础标识

| 概念 | 标准名称 | 说明 |
| --- | --- | --- |
| 组件类型 | `type` | renderer 类型名 |
| 实例 ID | `id` | 组件定向调用与调试锚点 |
| 逻辑名 | `name` | 逻辑命名或表单参与名 |
| 测试锚点 | `testid` | 输出为 `data-testid` |
| 样式类 | `className` | 自定义类名 |
| 类别名映射 | `classAliases` | 短名到 Tailwind class 展开 |

### 2. 常用内容与 region 名称

优先使用自然业务名，不要机械发明 `xxxRegion`、`renderXxx` 一类命名。

| 概念 | 优先名称 |
| --- | --- |
| 主内容 | `body` |
| 标题 | `title` |
| 头部 | `header` |
| 尾部 | `footer` |
| 工具区 | `toolbar` |
| 空态 | `empty` |
| 动作区 | `actions` |
| 单项内容 | `item` |
| 列表项集合 | `items` |

### 3. 事件字段名称

事件入口统一使用 `onXxx`。

| 概念 | 优先名称 |
| --- | --- |
| 点击 | `onClick` |
| 值变化 | `onChange` |
| 提交 | `onSubmit` |
| 新增 | `onAdd` |
| 删除/移除 | `onRemove` |
| 重排 | `onReorder` |
| 关闭 | `onClose` |
| 打开 | `onOpen` |

说明：

- 事件字段的值是 `ActionSchema`，不是脚本字符串。
- 组件文档如果需要更细粒度事件，可以在 `onXxx` 规则内扩展，但应优先复用这些词根。

### 4. 动作选择器名称

| 场景 | 标准形式 | 示例 |
| --- | --- | --- |
| 内置动作 | camelCase | `setValue`、`openDialog` |
| 组件实例能力 | `component:<method>` | `component:submit`、`component:setValue` |
| 宿主/导入能力 | `namespace:method` | `designer:addNode` |

组件实例 method 推荐使用动词短语：

- `getValue`
- `setValue`
- `getItems`
- `addItem`
- `removeItem`
- `moveItem`
- `open`
- `close`
- `refresh`
- `focus`

### 5. 状态与 ownership 命名

组件如果有明确交互状态，应优先复用 `<axis>Ownership` / `<axis>StatePath` 命名模式。

| 概念 | 标准名称模式 | 示例 |
| --- | --- | --- |
| 状态归属 | `<axis>Ownership` | `valueOwnership`、`selectionOwnership` |
| scope 持久化路径 | `<axis>StatePath` | `valueStatePath` |
| ownership 值 | `local` / `controlled` / `scope` | `valueOwnership: 'scope'` |
| 当前值 | 语义化当前值字段 | `value`、`selectedKeys` |
| 初始化默认值 | `defaultXxx` | `defaultValue`、`defaultOpen` |

不要混用：

- `defaultKey` 与 `value`
- `selected`、`current`、`active` 指向同一语义
- 组件私有术语和 runtime ownership 术语并存

### 6. 样式语义名称

遵守当前 styling system 与 UI 组件约定，优先使用：

| 概念 | 标准名称 |
| --- | --- |
| 视觉变体 | `variant` |
| 尺寸 | `size` |
| 语义级别 | `level` |
| 方向 | `orientation` |
| 是否禁用 | `disabled` |
| 是否可见 | `visible` |
| 只读 | `readOnly` |

不要优先使用上游私有写法如：

- `tabsMode`
- `btnLevel`
- `directionMode`

除非当前项目已有明确落地代码并决定保留。

UI primitive 对齐补充规则：

- 如果 renderer 只是适配 `@nop-chaos/ui` 的已有 prop，应优先直接使用该 prop 名，例如 `value`、`defaultValue`、`orientation`、`variant`、`size`。
- 不要把 UI 已有的 `value` 再改写成 `activeKey`、`selectedKey`、`currentTab` 这一类平行名字，除非该组件确实表达的是不同概念。
- 如果某个能力不是 UI primitive 自带能力，而是 Flux renderer 在其外层新增的复合能力，可以保留 renderer 自己的字段名；但应避免仅因命名偏好就把 `closable` 改成 `allowRemove` 这一类没有直接收益的二次改名。

### 7. 集合能力命名

对于“组件内部维护一组项”的组件，优先采用统一集合语言：

| 概念 | 标准名称 |
| --- | --- |
| 集合字段 | `items` |
| 新增开关 | 复用现有领域名或组件原生名 |
| 移除开关 | 复用现有领域名或组件原生名 |
| 重排开关 | 复用现有领域名或组件原生名 |
| 新增入口 region | `addTrigger` |

集合字段补充规则：

- 正式契约优先坚持“一个概念一个字段名”。集合本体优先使用单一 `items` 字段。
- `items` 如果属于 value 通道，应复用 Flux 当前统一值模型：静态值、`${expr}`、以及在字段 metadata 显式 `allowSource` 时的内联 `type: 'source'`。
- 不要为了表达“动态来源”默认再引入 `itemsSource`、`tabsSource`、`optionsSource` 这一类平行字段，除非它表达的是与 `items` 不同的第二概念，并且有更高优先级架构文档明确支持。
- 如果组件需要“原始业务数据 -> 最终 items 结构”的投影，优先由 loader 产出最终 `items`，或复用通用迭代/投影机制，而不是给每个组件单独发明 `xxxSource + 模板` 协议。
- 对新增/删除/重排等集合行为字段，优先复用底层 UI 或该组件领域里已经稳定的词；如果没有明确基线，再决定是否需要 `allowXxx` 这种布尔前缀，不要预设它是统一标准。

如果领域语义更强，允许在组件文档中说明“正式字段名”和“领域术语”的对应关系，但正式契约仍应尽量保持统一。

## 常用 Renderer 清单

下面这份清单不是 AMIS 全量组件镜像，而是结合当前 `nop-chaos-flux` 已有 renderer、现有 UI primitives、以及 Flux 简化后的 DSL 方向整理出的常用 renderer 基线。

### 当前代码已注册的通用 renderer

- `page`
- `container`
- `flex`
- `text`
- `button`
- `icon`
- `badge`
- `dynamic-renderer`
- `reaction`
- `form`
- `input-text`
- `input-email`
- `input-password`
- `textarea`
- `select`
- `checkbox`
- `switch`
- `radio-group`
- `checkbox-group`
- `tag-list`
- `key-value`
- `array-editor`
- `condition-builder`
- `table`
- `data-source`
- `chart`

### 当前仓库已注册的领域 renderer

这些 renderer 已在各自 package 中注册；是否在某个具体宿主或 playground 场景里可直接运行，还取决于该宿主是否装配了对应 registry。

- `designer-page`
- `designer-field`
- `designer-canvas`
- `designer-palette`
- `report-inspector-shell`
- `report-inspector`
- `report-field-panel`
- `report-designer-page`
- `report-toolbar`
- `spreadsheet-page`

### 已文档化但尚未实现的高优先级通用 renderer

- `tabs`
- `dialog`
- `drawer`
- `separator`
- `card`
- `list`
- `image`
- `progress`
- `link`
- `markdown`
- `html`
- `json-view`
- `spinner`
- `empty`

### schema 已声明但尚未注册的领域 renderer

- `designer-node-card`
- `designer-edge-row`

### 更长尾的候选 renderer

更长尾的候选项和优先级请以 `docs/components/roadmap.md` 为准，这里不再维护第二份优先级列表。

### 不建议直接照搬 AMIS type 的场景

- 不建议保留 `tpl`
  - 多数场景已经可由 `text`、`markdown`、`html`、以及具名 slot/field 承接
- 不建议保留 `action`
  - 统一收敛到 `button`
- 不建议默认把 `submit`、`reset` 作为独立 renderer type
  - 优先仍用 `button`，通过 action 或 form 语义表达提交/重置
- 不建议把同一概念拆成多个历史别名 type
  - 例如优先选一个正式 type，而不是长期同时保留 `qrcode`/`qr-code`、`image`/`static-image`

### 从 AMIS 迁移时的简化原则

- 优先保留“用户能理解的领域概念”，不要保留“历史实现手段”型 type。
- 优先保留“一个组件一个 type”，不要把按钮行为拆成多个 type。
- 优先使用 slot/field 建模，而不是为了局部展示再保留一个通用 `tpl` escape hatch。
- 优先让 action、source、region 承担动态能力，不要把大量动态语义硬编码进 renderer type 名称。

## 当前组件目录

目前 `docs/components/` 已按组件类型补齐主入口文档，每个目录都应包含 `design.md` 和 `example.json`。

### 通用基础与内容组件

- `page/`
- `container/`
- `flex/`
- `text/`
- `button/`
- `icon/`
- `badge/`
- `dynamic-renderer/`
- `reaction/`
- `tabs/`
- `dialog/`
- `drawer/`
- `separator/`
- `card/`
- `image/`
- `progress/`
- `link/`
- `markdown/`
- `html/`
- `json-view/`
- `spinner/`
- `empty/`

### 表单组件

- `form/`
- `input-text/`
- `input-email/`
- `input-password/`
- `textarea/`
- `select/`
- `checkbox/`
- `switch/`
- `radio-group/`
- `checkbox-group/`
- `tag-list/`
- `key-value/`
- `array-editor/`
- `condition-builder/`

### 数据与逻辑组件

- `table/`
- `data-source/`
- `chart/`
- `list/`

### 领域宿主与设计器组件

- `designer-page/`
- `designer-field/`
- `designer-canvas/`
- `designer-palette/`
- `designer-node-card/`
- `designer-edge-row/`
- `report-inspector-shell/`
- `report-inspector/`
- `report-field-panel/`
- `report-designer-page/`
- `report-toolbar/`
- `spreadsheet-page/`

建议后续新增组件时，先把目录加到这里，再补对应 `design.md` 与 `example.json`，保持组件索引与实际文档覆盖同步。

组件优先级和实现路线请统一维护在 `docs/components/roadmap.md`，不要再恢复顶层 `docs/component-list.md`。
