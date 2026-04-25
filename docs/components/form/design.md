# Form 组件设计

## 1. 组件定位

- `form` 是表单容器 renderer，用来创建 `FormRuntime`、收集字段验证并组织提交与重置语义。
- 它是表单字段的作用域边界，不是普通容器的视觉别名。

## 2. 与 AMIS 或既有产品的能力对照

- 目标契约中，`form` 不只承载 `body` / `actions` / `data`，还应拥有语义生命周期入口与状态读面。
- 提交、验证失败、提交成功/失败 follow-up 都归 `form` 节点所有；触发器只负责调用 `component:submit`。

## 3. Flux 中的 renderer/type 定义

- `type: 'form'`
- `category: 'form'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 regions: `body`、`actions`
- 当前 runtime policy: `scopePolicy: 'form'`、`componentRegistryPolicy: 'new'`

## 4. schema 设计

- 目标导出字段为 `body`、`actions`、`data`、`statusPath`、`initAction`、`submitAction`、`onSubmitSuccess`、`onSubmitError`、`onValidateError`。
- `statusPath` 用于把当前 form 的只读语义状态摘要发布到外层 scope。
- `name` 仍是 form owner identity，不应在组件文档里被解释成“自动对外发布路径”；外部值发布边界见 `docs/architecture/form-external-publication-and-reserved-bindings.md`。
- 提交逻辑继续以 action/runtime 为主，不直接把请求逻辑塞进 renderer JSX。
- 命名上不应把 `initAction`、`submitAction` 机械改为 `onInit`、`onSubmit`。它们表示 form owner 的主生命周期入口；`onSubmitSuccess`、`onSubmitError`、`onValidateError` 才是 follow-up hook 风格的结果分支入口。

## 5. 字段分类

- `body`、`actions`: `region`
- `data`: `value`
- `statusPath`: `value`
- `initAction`、`submitAction`、`onSubmitSuccess`、`onSubmitError`、`onValidateError`: `event`

## 6. regions 与 slot 约定

- `body` 承接字段区域。
- `actions` 承接提交、重置、辅助按钮等动作区。

## 7. 运行期状态归属

- 表单值、校验状态、访问状态、提交状态和数组操作统一归 `FormRuntime`。
- 字段 renderer 不应自行再维护第二套验证图。
- form subtree 内部的普通值读取应直接使用字段 `name`，例如 `${username}`。
- form subtree 内的表达式通过只读 `$form` 读取当前 form 语义状态，例如 `${$form.submitting}`。
- 当前 live 实现中，当 `form.name` 存在时，form subtree / lifecycle 仍可见 `formName` values alias；但这不属于首版目标 contract，应视为待清理的实现漂移，也不等于 form 外 sibling 的正式 reactive contract。
- form subtree 外若需要读取同一状态，应通过 `statusPath` 读取只读 summary DTO，而不是通过 `id` / `name` 做隐式查找。
- `$form`、当前实现里仍存在的 `formName` values alias、以及 `statusPath` 都不暴露底层 store 或可调用方法。
- 若未来需要 form 外部读取 values，应优先新增显式 `valuesPath` 机制，而不是扩大默认 `formName.*` sibling 可见性。

## 8. 事件、动作与组件句柄能力

- `form` 应长期支持 `component:submit`、`component:reset`、`component:validate` 一类句柄能力。
- `component:setValue`、`component:setValues` 也属于合理的 form instance capability。
- 当前动作和事件语义应以 `FormRuntime` 暴露的 API 为准。

## 9. 数据源、表达式、导入能力接入点

- 初始值通过 `data` 注入。
- 表单内字段表达式读取 form scope。
- 表单内元状态表达式读取 `$form`，不读取 `$store`。
- 异步校验和提交请求应复用统一 API/DataSource 契约。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-form` marker。
- 字段布局、actions 对齐和分组视觉应遵循 field frame 与 styling system，而不是让 `form` 固定一种页面布局。

## 11. 实现拆分建议

- renderer 只负责 form shell 和 regions。
- runtime、validation、field chrome 和数组操作都应保持独立模块。

## 12. 表单模式与标签布局

### 12.1 Form mode

Form 通过 `mode` 控制全局标签位置，所有字段默认继承：

| `mode` | 标签位置 | 布局方式 | 对应 AMIS |
|--------|---------|---------|----------|
| `"normal"` | 输入框上方 | 纵向排列 | AMIS `mode: "normal"` |
| `"horizontal"` | 输入框左侧 | flex/grid 行布局 | AMIS `mode: "horizontal"` |

默认值为 `"normal"`。

### 12.2 Form 级标签配置

```ts
interface FormSchema extends BaseSchema {
  mode?: 'normal' | 'horizontal';
  labelAlign?: 'top' | 'left' | 'right';
  labelWidth?: string | number;
}
```

| 字段 | 类型 | 说明 | 对应 AMIS |
|------|------|------|----------|
| `mode` | `'normal' \| 'horizontal'` | 表单布局模式 | `Form.mode` |
| `labelAlign` | `'top' \| 'left' \| 'right'` | 标签文本对齐方向，默认 `"top"` | `Form.labelAlign` |
| `labelWidth` | `string \| number` | 标签列宽度（如 `"120px"`、`2` 表示 grid 比例），仅 `horizontal` 模式生效 | `Form.horizontal.leftFixed` / `Form.horizontal.left` |

### 12.3 传播机制

布局配置只有两级，通过 React context 从 form 直接传到 FieldFrame：

```
form.mode / form.labelAlign / form.labelWidth
  ↓ (React context，自动穿透所有中间层)
FieldFrame 读取 context，字段 schema 可逐个覆盖：
  effectiveMode = field.mode ?? formMode
  effectiveLabelAlign = (field.labelAlign !== 'inherit') ? field.labelAlign : formLabelAlign
  effectiveLabelWidth = field.labelWidth ?? formLabelWidth
```

中间容器（fieldset、flex、container 等）无需感知布局配置。

### 12.4 字段级标签覆盖

每个字段可通过自身 schema 覆盖 form 级配置：

```ts
interface BoundFieldSchemaBase extends BaseSchema {
  labelAlign?: 'top' | 'left' | 'right' | 'inherit';
  labelWidth?: string | number;
}
```

- `labelAlign: "inherit"`（默认）表示继承 form 级设置。
- 字段级 `labelAlign` 和 `labelWidth` 优先于 form 级同名配置。
- 当 `labelAlign: "top"` 时，无论 form mode 是否为 horizontal，该字段标签都显示在上方。

### 12.5 字段分类

- `mode`、`labelAlign`、`labelWidth`：`value`（form schema 上）或 `value`（字段 schema 上的覆盖）
- 它们是结构配置，不是运行时业务值，但支持表达式以实现动态布局切换。

## 13. 表单分组

### 13.1 三层分离

AMIS 的表单分组依赖三个独立的 renderer，Flux 同样保持三层分离：

| 层次 | AMIS renderer | 职责 | Flux 对应 |
|------|-------------|------|----------|
| **单字段包装** | `FormItem` / `FormItemWrap` | 为单个字段渲染 label、required、error、hint、description | `FieldFrame`（`docs/architecture/field-frame.md`） |
| **行布局** | `Group` | 将多个字段排列在同一行/列 | `flex`（已有 `docs/components/flex/design.md`） |
| **分组容器** | `FieldSet` | 用 `<fieldset>/<legend>` 包裹多字段，支持标题和折叠 | `fieldset`（独立组件，见下文） |

FieldFrame 只负责单个字段的 chrome，不负责分组。`fieldset` 和 `flex` 是独立于 FieldFrame 的容器组件。

### 13.2 `fieldset` — 分组容器

`fieldset` 是独立的表单分组组件，等价于 AMIS `FieldSet`。它不使用 FieldFrame，而是渲染自己的 `<fieldset>/<legend>` 结构。

#### 组件定位

- `type: 'fieldset'`
- 将多个表单字段组织在同一个带标题的区域内
- 可选的折叠/展开行为
- 可覆盖子级的 form mode / labelAlign / labelWidth
- 根节点 marker: `nop-fieldset`

#### Schema

```ts
interface FieldsetSchema extends BaseSchema {
  type: 'fieldset';
  title?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  body: SchemaCollection;
}
```

| 字段 | 类型 | 说明 | 对应 AMIS |
|------|------|------|----------|
| `title` | `string?` | 分组标题，渲染为 `<legend>` | `FieldSet.title` |
| `collapsible` | `boolean?` | 是否可折叠，默认 `false` | `FieldSet.collapsable` |
| `collapsed` | `boolean?` | 初始折叠状态，默认 `false` | `FieldSet.collapsed` |
| `body` | `SchemaCollection` | 子字段区域 | `FieldSet.body` |

fieldset 不感知 mode/labelAlign/labelWidth。这些通过 React context 从 form 直接传到 FieldFrame，fieldset 作为中间层无需参与。

#### 渲染结构

```
<fieldset class="nop-fieldset" data-collapsible={collapsible}>
  <legend data-slot="fieldset-title">{title}</legend>
  <div data-slot="fieldset-body">
    ...子字段（每个子字段各自被 FieldFrame 包裹）
  </div>
</fieldset>
```

- `fieldset` 不为子字段渲染 FieldFrame；子字段各自的 renderer 通过 `wrap: true` 拥有自己的 FieldFrame。
- `fieldset` 只影响子字段的布局上下文（mode、labelAlign、labelWidth 的继承源）。
- 当 `collapsible: true` 时，`fieldset-body` 区域可折叠/展开。

#### 与 collapse 的关系

- `fieldset` 专注表单分组：固定使用 `<fieldset>/<legend>`，可传播 form mode 配置。
- `collapse` 是通用折叠容器：不限于表单，不支持 mode/labelAlign 传播。
- 两者独立共存，`fieldset` 内部可复用 `collapse` 的折叠逻辑但保持自己的 DOM 结构。

### 13.3 `flex` — 行布局（对应 AMIS Group）

`flex` 已作为独立组件实现，在 form body 内使用时等价于 AMIS `Group`。

```json
{
  "type": "flex",
  "direction": "row",
  "gap": "sm",
  "items": [
    { "type": "input-text", "name": "firstName", "label": "名" },
    { "type": "input-text", "name": "lastName", "label": "姓" }
  ]
}
```

等价于 AMIS：

```json
{
  "type": "group",
  "body": [
    { "type": "input-text", "name": "firstName", "label": "名" },
    { "type": "input-text", "name": "lastName", "label": "姓" }
  ]
}
```

AMIS Group 的 `direction`、`gap`、`body` 直接映射到 flex 的 `direction`、`gap`、`items`。

### 13.4 混合分组示例

fieldset + flex 组合实现复杂的表单分组：

```json
{
  "type": "form",
  "mode": "horizontal",
  "body": [
    {
      "type": "fieldset",
      "title": "个人信息",
      "body": [
        {
          "type": "flex",
          "direction": "row",
          "gap": "md",
          "items": [
            { "type": "input-text", "name": "firstName", "label": "名" },
            { "type": "input-text", "name": "lastName", "label": "姓" }
          ]
        },
        { "type": "input-email", "name": "email", "label": "邮箱" }
      ]
    },
    {
      "type": "fieldset",
      "title": "工作信息",
      "collapsible": true,
      "body": [
        { "type": "input-text", "name": "company", "label": "公司" },
        { "type": "input-text", "name": "title", "label": "职位" }
      ]
    }
  ]
}
```

## 14. 字段提示信息

### 14.1 概述

字段级提示信息通过 schema 配置传递给 `FieldFrame`，由 `FieldFrame` 统一渲染。提示信息按照优先级分层显示：

1. **Error**（最高优先级）— 验证失败时显示
2. **Hint**（次高）— 控件聚焦时显示的引导文字
3. **Description**（最低）— 始终可见的说明文字

此外还有两种独立于优先级系统的提示：
- **Remark** — 控件旁的图标气泡提示（始终可见，不与 error/hint 竞争）
- **LabelRemark** — 标签旁的图标气泡提示（始终可见，不与 error/hint 竞争）

### 14.2 Schema 字段定义

```ts
interface BoundFieldSchemaBase extends BaseSchema {
  description?: string;
  hint?: string;
  remark?: FieldRemarkSchema;
  labelRemark?: FieldRemarkSchema;
}

interface FieldRemarkSchema {
  icon?: string;
  content: string;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  trigger?: ('click' | 'hover' | 'focus')[];
}
```

| 字段 | 类型 | 渲染位置 | 显示条件 | 对应 AMIS |
|------|------|---------|---------|----------|
| `description` | `string` | 控件下方 `data-slot="field-description"` | 无 error 且无 hint 时始终显示 | `FormItem.description` / `desc` |
| `hint` | `string` | 控件下方 `data-slot="field-hint"` | 无 error 且控件聚焦时显示 | `FormItem.hint` |
| `remark` | `FieldRemarkSchema` | 控件右侧 `data-slot="field-remark"` | 始终可见（图标+tooltip） | `FormItem.remark` |
| `labelRemark` | `FieldRemarkSchema` | 标签右侧 `data-slot="field-label-remark"` | 始终可见（图标+tooltip） | `FormItem.labelRemark` |
| error | 自动 | 控件下方 `data-slot="field-error"` | 验证失败且满足 showErrorOn 条件 | `FormItem.errors` (自动) |

### 14.3 字段分类

- `description`、`hint`：`value`（支持模板字符串和表达式）
- `remark`、`labelRemark`：`value`（支持表达式，对象结构由 renderer metadata 定义）

### 14.4 FieldFrame 渲染顺序

FieldFrame 是**单字段**的 chrome 包装器，其 value area 按以下顺序渲染：

```
┌─ label area ─────────────────────────────────────┐
│  [label] [required*] [labelRemark icon]           │
├─ control area ────────────────────────────────────┤
│  [control widget] [remark icon]                   │
│  [error | hint | description] (互斥，按优先级)     │
└──────────────────────────────────────────────────┘
```

remark 和 labelRemark 是独立渲染的图标气泡，不参与 error/hint/description 的互斥优先级逻辑。

**注意**：FieldFrame 只负责单个字段的 chrome。多字段分组由独立的 `fieldset` 组件处理，多字段同行布局由 `flex` 组件处理。三者互不嵌套、互不替代。

### 14.5 remark 渲染细节

remark 和 labelRemark 默认渲染为：
- 一个小图标（默认 `circle-help`，可配置）
- hover/focus/click 时显示 tooltip
- tooltip 内容为 `content` 字段
- tooltip 方向由 `placement` 控制（默认 `"top"`）

### 14.6 AMIS 对比

| AMIS 字段 | Flux 字段 | 差异说明 |
|-----------|----------|---------|
| `description` / `desc` | `description` | `desc` 别名不保留，统一用 `description` |
| `hint` | `hint` | 行为一致：聚焦时显示 |
| `remark` | `remark` | 从 AMIS 的 renderer type 改为字段属性对象 |
| `labelRemark` | `labelRemark` | 同上 |
| `caption` | 不保留 | 使用 `description` 替代；如需 inline 文字可用 `hint` |
| `validationErrors` | 通过 `validation` 规则配置 | 见 `docs/architecture/form-validation.md` |

## 15. 风险、取舍与后续阶段

- 需要避免把 React 表单库生命周期重新耦合回 runtime。
- `submitApi` 与 `data-source` 的边界需要后续文档统一，不宜各组件各说各话。
- `fieldset` 需要在 `amis-baseline-matrix.md` 中从 `notRetained` 更新为 `targetContract`。
- `fieldset` 内部字段的 form mode 继承需要通过 React context 传播，不能在 FieldFrame 内回读 schema。
- `hint` 和 `description` 的 schema → FieldFrame 接线需要在 `NodeFrameWrapper` 中完成，不能在 FieldFrame 内回读 schema。
- `remark` 和 `labelRemark` 依赖 `@nop-chaos/ui` 的 Tooltip 组件，需确认组件可用。
- `FieldFrame` 中 `frameWrap: 'group'` 的 `<fieldset>/<legend>` 语义仅用于 radio-group/checkbox-group 等单控件多选项场景，不用于多字段分组。
