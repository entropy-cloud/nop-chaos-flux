# Form 组件设计

## 1. 组件定位

- `form` 是表单容器 renderer，用来创建 `FormRuntime`、收集字段验证并组织提交与重置语义。
- 它是表单字段的作用域边界，不是普通容器的视觉别名。
- 它不应被 `container` 或 `fieldset` 替代；二者都不拥有 form owner 语义。

## 2. 与 AMIS 或既有产品的能力对照

- 目标契约中，`form` 不只承载 `body` / `actions` / `data`，还应拥有语义生命周期入口与状态读面。
- 提交、验证失败、提交成功/失败 follow-up 都归 `form` 节点所有；触发器只负责调用 `component:submit`。

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。Flux 按 `existing-components-improvement-analysis.md` §0.2 原则裁决，命名对齐 X3 基线（`docs/references/naming-conventions.md` §1/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                                                                 | 采纳               | 不采纳                                                                                                                   | 理由                                                                                                                                                             |
| ------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `body`/`actions` region、`data` 初始值                                               | **实现**           | —                                                                                                                        | 当前基线                                                                                                                                                         |
| `mode: normal\|horizontal` + `labelAlign`/`labelWidth`/`gap`                         | **实现**（见 §13） | —                                                                                                                        | 当前基线                                                                                                                                                         |
| `statusPath`/`valuesPath` 只读发布                                                   | **实现**           | —                                                                                                                        | 当前基线                                                                                                                                                         |
| `hiddenFieldPolicy`                                                                  | **实现**           | —                                                                                                                        | 当前基线                                                                                                                                                         |
| 事件 `initAction`/`submitAction`/`onSubmitSuccess`/`onSubmitError`/`onValidateError` | **实现**           | —                                                                                                                        | 当前基线                                                                                                                                                         |
| `autoInit`（`initAction` 的门控）                                                    | **实现**           | —                                                                                                                        | `initAction` 挂载时自动触发的开关；缺省 `true` 保持向后兼容；设为 `false` 则需外部事件触发 init。见 `docs/bugs/15-component-level-initfetch-analysis-and-fix.md` |
| 组件句柄 `component:submit`/`validate`/`reset`/`setValue`/`setValues`/`getValues`    | **实现**           | —                                                                                                                        | 当前基线                                                                                                                                                         |
| `$form` reactive 注入、提交失败聚焦首无效字段、`FormLayoutContext`                   | **实现**           | —                                                                                                                        | 当前基线                                                                                                                                                         |
| `columnCount` 多列表单布局                                                           | **实现**           | —                                                                                                                        | 高频表单布局需求                                                                                                                                                 |
| `inline`/flex mode（amis 4 模式 → Flux 当前 normal/horizontal/inline）               | **实现**           | —                                                                                                                        | 模式枚举扩展                                                                                                                                                     |
| `submitOnChange`                                                                     | **实现**           | —                                                                                                                        | 搜索/筛选表单常见；debounce 300ms，仅当 `submitAction` 配置时生效，跳过 init 快照                                                                                |
| `preventEnterSubmit`                                                                 | **实现**           | —                                                                                                                        | 避免误提交；默认 Enter 触发 submit（当 `submitAction` 配置时），`preventEnterSubmit: true` 显式禁用                                                              |
| `autoFocus`                                                                          | **实现**           | —                                                                                                                        | 表单可用性                                                                                                                                                       |
| `scrollToFirstError`                                                                 | **实现**           | —                                                                                                                        | 现有 focus-on-first-invalid 之上追加 `scrollIntoView`                                                                                                            |
| `static` 只读预览模式                                                                | **实现**           | —                                                                                                                        | 详情页常用；仅经 `FormLayoutContext.staticReadOnly` 传播 readOnly 到字段层，actions 区域不隐藏                                                                   |
| `rules` 跨字段组合校验                                                               | **实现**           | —                                                                                                                        | 当前仅单字段校验；form 级 rules 通过 `compileFormLevelValidationModel` 注入到对应子字段的 validation 节点                                                        |
| 组件级请求/生命周期                                                                  | —                  | **不采纳**：amis `api`/`submitApi`/`initApi`/`asyncApi`、async submit 轮询（`asyncApi`+`checkInterval`+`finishedField`） | 请求下沉 `submitAction`/`initAction` action graph（见 §4、§9，X3 §1/§3）；async 轮询走 data-source 统一请求层                                                    |
| amis `wizard`/step mode                                                              | —                  | **不采纳**                                                                                                               | 独立组件族，归主 roadmap wizard                                                                                                                                  |
| `persistData`/`persistDataKeys`/`clearPersistDataAfterSubmit`（localStorage 草稿）   | —                  | **不采纳**                                                                                                               | 状态管理职责，不进组件（X3 §3 路由持久化）                                                                                                                       |
| `promptPageLeave`/`promptPageLeaveMessage`                                           | —                  | **不采纳**                                                                                                               | 宿主路由职责（X3 §3）                                                                                                                                            |
| `redirect`/`reload`/`target`                                                         | —                  | **不采纳**                                                                                                               | 走 action graph 组合（X3 §3）                                                                                                                                    |
| `debug`/`debugConfig` 调试面板                                                       | —                  | **不采纳**                                                                                                               | 独立 scope-debug renderer                                                                                                                                        |

**BY-DESIGN**：请求下沉 action graph 是架构选择（非缺口）；`submitApi` 与 data-source 的边界统一见 §16。

## 3. Flux 中的 renderer/type 定义

- `type: 'form'`
- `category: 'form'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 regions: `body`、`actions`
- 当前 runtime policy: `scopePolicy: 'form'`、`componentRegistryPolicy: 'new'`

## 4. schema 设计

- 目标导出字段为 `body`、`actions`、`data`、`statusPath`、`valuesPath`、`autoInit`、`initAction`、`submitAction`、`onSubmitSuccess`、`onSubmitError`、`onValidateError`。
- E2g 增强字段（8 组）：
  - `columnCount?: number` — body 容器使用 CSS grid 多列布局（`repeat(N, minmax(0, 1fr))`）；`< 1` clamp 到 `1`；`1` 时不应用 grid（默认纵向流式）。
  - `mode?: 'normal' | 'horizontal' | 'inline'` — `inline` 让 body 使用 `nop-form-body--inline` flex-row 类，actions 区域可内联。
  - `submitOnChange?: boolean` — truthy 时订阅 form store values，debounce（300ms）后触发 `submit()`；仅当 `submitAction` 配置时生效；init 快照不触发。
  - `preventEnterSubmit?: boolean` — 默认 Enter 在 form shell 内触发 submit（当 `submitAction` 配置时，且 target 非 textarea/button/link/contenteditable）；`preventEnterSubmit: true` 显式禁用。
  - `autoFocus?: boolean` — mount 后自动 focus body 内首个 `input/select/textarea/[data-slot="combobox"]`；无目标则空操作。
  - `scrollToFirstError?: boolean` — 在现有 focus-on-first-invalid 行为之上，额外调用 `scrollIntoView({ behavior: 'smooth', block: 'center' })`。
  - `static?: boolean | string` — truthy 时经 `FormLayoutContext.staticReadOnly` 传播 `readOnly` 到所有子字段（复用 `FormFieldPresentationSnapshot.readOnly`）。actions 区域不隐藏（预览态可能仍需可见的"返回编辑"等按钮）。
  - `rules?: FormCrossFieldRule[]` — form 级跨字段校验规则；每项 `{ rule: 'equalsField' | 'notEqualsField'; field: string; target: string; message?: string }`，编译时翻译为挂在 `field` 字段节点上的 `{ kind: '<ruleKind>', path: target, message }`，并加入 `dependents[target]` 以触发联动重校验。
- `statusPath` 用于把当前 form 的只读语义状态摘要发布到外层 scope。
- `valuesPath` 用于把当前 form 的只读 values snapshot 发布到外层 scope。
- `name` 仍是 form owner identity，不应在组件文档里被解释成"自动对外发布路径"；外部值发布边界见 `docs/architecture/form-external-publication-and-reserved-bindings.md`。
- `data` 的正式语义是 form owner 的 initial values snapshot：如果其中含表达式，应在 form 创建时基于 parent lexical scope 求值一次，再把结果写入 form-owned working state。
- `form.data` 不是 live binding。parent scope 后续变化默认不应覆盖 form 内已经初始化或已编辑的值；需要重同步时应通过显式 `reset`、`setValues`、`initAction` 或 remount 完成。
- 提交逻辑继续以 action/runtime 为主，不直接把请求逻辑塞进 renderer JSX。
- 命名上不应把 `initAction`、`submitAction` 机械改为 `onInit`、`onSubmit`。它们表示 form owner 的主生命周期入口；`onSubmitSuccess`、`onSubmitError`、`onValidateError` 才是 follow-up hook 风格的结果分支入口。

## 5. 字段分类

- `body`、`actions`: `region`
- `data`: `value`
- `statusPath`: `value`
- `valuesPath`: `value`
- `autoInit`: `value`（boolean，default `true`）
- `initAction`、`submitAction`、`onSubmitSuccess`、`onSubmitError`、`onValidateError`: `event`
- E2g 字段分类：
  - `columnCount`、`submitOnChange`、`preventEnterSubmit`、`autoFocus`、`scrollToFirstError`、`rules`: `value`（form schema 上的结构配置）
  - `static`: `value`（影响子字段 readOnly，传播通过 `FormLayoutContext.staticReadOnly`）
  - `mode` 扩展为三态（`'normal' | 'horizontal' | 'inline'`），分类仍为 `value`

## 6. regions 与 slot 约定

- `body` 承接字段区域。
- `actions` 承接提交、重置、辅助按钮等动作区。

## 7. 运行期状态归属

- 表单值、校验状态、访问状态、提交状态和数组操作统一归 `FormRuntime`。
- 字段 renderer 不应自行再维护第二套验证图。
- form subtree 内部的普通值读取应直接使用字段 `name`，例如 `${username}`。
- form subtree 内的表达式通过只读 `$form` 读取当前 form 语义状态，例如 `${$form.submitting}`。
- form subtree 外若需要读取同一状态，应通过 `statusPath` 读取只读 summary DTO，而不是通过 `id` / `name` 做隐式查找。
- form subtree 外若需要读取当前 values，应通过 `valuesPath` 读取只读 values snapshot，而不是扩大默认 `formName.*` sibling 可见性。
- `$form`、`statusPath`、`valuesPath` 都不暴露底层 store 或可调用方法。
- `submitOnChange` 的 debounce 状态由 form shell 内部维护（`useEffect` + `setTimeout`，300ms）。重渲染或 form owner 切换时清理 in-flight timer。`submitOnChange` 不写入 `$form` / `statusPath` / `valuesPath`。
- `static` 预览态通过 `FormLayoutContext.staticReadOnly` 传播，不进入 form store。子字段的 `useFieldPresentation` 读取 context 并将 `staticReadOnly` 与字段自身的 `readOnly` 取或运算。
- form 级 `rules` 在 form shell 内通过 `compileFormLevelValidationModel` 后处理合入 `validationPlan`，注入到对应子字段节点的 `rules` 数组与 `dependents` 图。rules 本身不进入 form store，也不作为 `$form` 字段。

## 8. 事件、动作与组件句柄能力

- `form` 应长期支持 `component:submit`、`component:reset`、`component:validate` 一类句柄能力。
- `component:setValue`、`component:setValues` 也属于合理的 form instance capability。
- 当前动作和事件语义应以 `FormRuntime` 暴露的 API 为准。
- **Enter key 处理契约（E2g）**：form shell 的 `<section>` 监听 `onKeyDown`：
  - 默认行为：当用户在 form body 内按 Enter，且事件 target 不是 `textarea`/`button`/`a`/`contenteditable`，且 `submitAction` 已配置时，`preventDefault()` 并调用 `ownedForm.submit()`。
  - `preventEnterSubmit: true` 时，handler 提前返回，不触发 submit。这是唯一的禁用路径。
  - 该行为对齐 AMIS 默认（`Form.preventEnterSubmitDefault: false`）+ 用户对 form 的 Enter 提交预期。
  - **不**把 `<section>` 改为 `<form>` 元素（见 Non-Goals）；Enter 处理通过 React `onKeyDown` 实现。

### `preventEnterSubmit` 与 schema-driven `preventDefault` 的关系（X2 裁定）

X2 工作项落地后，`ActionShapeFields.preventDefault` / `stopPropagation` 提供了 action 级、声明式的 native default 阻止能力（见 `docs/architecture/renderer-runtime.md` "Schema-Driven Prevention"）。裁定：

- **保留 `preventEnterSubmit` 作为 form-level 便捷 shorthand，不标 deprecated。**
- 二者**层级不同、互不冲突**：
  - `preventEnterSubmit` 控制 **form shell 自己的** enter-submit 逻辑（form 内部决定是否在 Enter 上调用 `ownedForm.submit()`），是 form 组件自身的 UX 配置。
  - action 上的 `preventDefault` 控制 **native default**（如 form 提交、链接跳转、键盘滚动），是事件级声明，作用于任意组件的任意 event handler。
- 典型组合：
  - 仅想阻止 form 的自动 Enter 提交、但保留其他默认行为 → 用 `preventEnterSubmit: true`。
  - 想在某个 button/input 的 `onClick`/`onKeyDown` action 上阻止 native default（如阻止链接跳转、阻止空格滚动）→ 用 action 上的 `preventDefault: true`。
  - 想完全阻止 Enter 触发的 native form submission（HTML form default）→ 因为 Flux form shell 用 `<section>` 而非 `<form>`，本就不会触发 native submit；`preventEnterSubmit` 控制的是 Flux 自己的 submit 调用。
- **不**强求 author 用 `preventDefault` 替换 `preventEnterSubmit`：前者要附在某个具体 action 上，后者是 form 容器配置，迁移成本不带来语义增量。

## 9. 数据源、表达式、导入能力接入点

- 初始值通过 `data` 注入。
- `data` 中的表达式在 form 创建时求值一次，结果成为 form store 的初始 values。
- 表单内字段表达式读取 form scope。
- 表单内元状态表达式读取 `$form`，不读取 `$store`。
- 异步校验和提交请求应复用统一 API/DataSource 契约。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-form` marker。
- 字段布局、actions 对齐和分组视觉应遵循 field frame 与 styling system，而不是让 `form` 固定一种页面布局。

## 11. 与其他容器的边界

- `form` 是 semantic lifecycle owner；`container` 只是普通内容壳层。
- `fieldset` 是 form 内部的字段分组容器，不是 form owner。
- `flex` 可用于 form body 内的布局，但不替代 form 的校验、提交和 values ownership。

## 12. 实现拆分建议

- renderer 只负责 form shell 和 regions。
- runtime、validation、field chrome 和数组操作都应保持独立模块。

## 13. 表单模式与标签布局

### 13.1 Form mode

Form 通过 `mode` 控制全局标签位置与 body 布局，所有字段默认继承：

| `mode`         | 标签位置   | 布局方式                        | 对应 AMIS                 |
| -------------- | ---------- | ------------------------------- | ------------------------- |
| `"normal"`     | 输入框上方 | 纵向排列                        | AMIS `mode: "normal"`     |
| `"horizontal"` | 输入框左侧 | flex/grid 行布局                | AMIS `mode: "horizontal"` |
| `"inline"`     | 输入框左侧 | flex-row 内联（actions 可同行） | AMIS `mode: "inline"`     |

默认值为 `"normal"`。

#### 13.1.1 `columnCount` 多列布局

`columnCount?: number` 在任何 `mode` 下都可叠加使用。当 `columnCount > 1` 时，form body 容器使用 CSS grid：

```css
display: grid;
grid-template-columns: repeat(columnCount, minmax(0, 1fr));
```

- `columnCount` 不影响 actions 区域（actions 始终在 body 之外，独立排列）。
- `columnCount <= 1`：不应用 grid（保持默认纵向流式）。
- `inline` 模式下 `columnCount` 不生效（`inline` 强制 flex-row，二者冲突时以 `inline` 优先）。
- `columnCount` 经 `FormLayoutContext.columnCount` 传播，子 fieldset 可感知（但当前子 fieldset 自身不消费该值，预留扩展）。

### 13.2 Form 级标签配置

```ts
interface FormSchema extends BaseSchema {
  mode?: 'normal' | 'horizontal' | 'inline';
  labelAlign?: 'top' | 'left' | 'right';
  labelWidth?: string | number;
  columnCount?: number;
}
```

| 字段          | 类型                                   | 说明                                                                           | 对应 AMIS                                            |
| ------------- | -------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `mode`        | `'normal' \| 'horizontal' \| 'inline'` | 表单布局模式                                                                   | `Form.mode`                                          |
| `labelAlign`  | `'top' \| 'left' \| 'right'`           | 标签文本对齐方向，默认 `"top"`                                                 | `Form.labelAlign`                                    |
| `labelWidth`  | `string \| number`                     | 标签列宽度（如 `"120px"`、`2` 表示 grid 比例），仅 `horizontal` 模式生效       | `Form.horizontal.leftFixed` / `Form.horizontal.left` |
| `columnCount` | `number`                               | body 容器 CSS grid 列数；`> 1` 时启用 grid；`<= 1` 时不应用 grid（见 §13.1.1） | AMIS `Form.columnCount`                              |

### 13.3 传播机制

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

### 13.4 字段级标签覆盖

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

### 13.5 字段分类

- `mode`、`labelAlign`、`labelWidth`：`value`（form schema 上）或 `value`（字段 schema 上的覆盖）
- 它们是结构配置，不是运行时业务值，但支持表达式以实现动态布局切换。

## 14. 表单分组

### 14.1 三层分离

AMIS 的表单分组依赖三个独立的 renderer，Flux 同样保持三层分离：

| 层次           | AMIS renderer               | 职责                                                     | Flux 对应                                          |
| -------------- | --------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| **单字段包装** | `FormItem` / `FormItemWrap` | 为单个字段渲染 label、required、error、hint、description | `FieldFrame`（`docs/architecture/field-frame.md`） |
| **行布局**     | `Group`                     | 将多个字段排列在同一行/列                                | `flex`（已有 `docs/components/flex/design.md`）    |
| **分组容器**   | `FieldSet`                  | 用 `<fieldset>/<legend>` 包裹多字段，支持标题和折叠      | `fieldset`（独立组件，见下文）                     |

FieldFrame 只负责单个字段的 chrome，不负责分组。`fieldset` 和 `flex` 是独立于 FieldFrame 的容器组件。

### 14.2 `fieldset` — 分组容器

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

| 字段          | 类型               | 说明                        | 对应 AMIS              |
| ------------- | ------------------ | --------------------------- | ---------------------- |
| `title`       | `string?`          | 分组标题，渲染为 `<legend>` | `FieldSet.title`       |
| `collapsible` | `boolean?`         | 是否可折叠，默认 `false`    | `FieldSet.collapsable` |
| `collapsed`   | `boolean?`         | 初始折叠状态，默认 `false`  | `FieldSet.collapsed`   |
| `body`        | `SchemaCollection` | 子字段区域                  | `FieldSet.body`        |

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

### 14.3 `flex` — 行布局（对应 AMIS Group）

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
  "type": "flex",
  "items": [
    { "type": "input-text", "name": "firstName", "label": "名" },
    { "type": "input-text", "name": "lastName", "label": "姓" }
  ]
}
```

AMIS Group 的 `direction`、`gap`、`body` 直接映射到 flex 的 `direction`、`gap`、`items`。

### 14.4 混合分组示例

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

## 15. 字段提示信息

### 15.1 概述

字段级提示信息通过 schema 配置传递给 `FieldFrame`，由 `FieldFrame` 统一渲染。提示信息按照优先级分层显示：

1. **Error**（最高优先级）— 验证失败时显示
2. **Hint**（次高）— 控件聚焦时显示的引导文字
3. **Description**（最低）— hint 未显示时的兜底说明文字

此外还有两种独立于优先级系统的提示：

- **Remark** — 控件旁的图标气泡提示（始终可见，不与 error/hint 竞争）
- **LabelRemark** — 标签旁的图标气泡提示（始终可见，不与 error/hint 竞争）

### 15.2 Schema 字段定义

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

| 字段          | 类型                | 渲染位置                                  | 显示条件                          | 对应 AMIS                       |
| ------------- | ------------------- | ----------------------------------------- | --------------------------------- | ------------------------------- |
| `description` | `string`            | 控件下方 `data-slot="field-description"`  | 无 error 且当前未显示 hint 时显示 | `FormItem.description` / `desc` |
| `hint`        | `string`            | 控件下方 `data-slot="field-hint"`         | 无 error 且控件聚焦时显示         | `FormItem.hint`                 |
| `remark`      | `FieldRemarkSchema` | 控件右侧 `data-slot="field-remark"`       | 始终可见（图标+tooltip）          | `FormItem.remark`               |
| `labelRemark` | `FieldRemarkSchema` | 标签右侧 `data-slot="field-label-remark"` | 始终可见（图标+tooltip）          | `FormItem.labelRemark`          |
| error         | 自动                | 控件下方 `data-slot="field-error"`        | 验证失败且满足 showErrorOn 条件   | `FormItem.errors` (自动)        |

### 15.3 字段分类

- `description`、`hint`：`value`（支持模板字符串和表达式）
- `remark`、`labelRemark`：`value`（支持表达式，对象结构由 renderer metadata 定义）

### 15.4 FieldFrame 渲染顺序

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

### 15.5 remark 渲染细节

remark 和 labelRemark 默认渲染为：

- 一个小图标（默认 `circle-help`，可配置）
- hover/focus/click 时显示 tooltip
- tooltip 内容为 `content` 字段
- tooltip 方向由 `placement` 控制（默认 `"top"`）

### 15.6 AMIS 对比

| AMIS 字段              | Flux 字段                  | 差异说明                                             |
| ---------------------- | -------------------------- | ---------------------------------------------------- |
| `description` / `desc` | `description`              | `desc` 别名不保留，统一用 `description`              |
| `hint`                 | `hint`                     | 行为一致：聚焦时显示                                 |
| `remark`               | `remark`                   | 从 AMIS 的 renderer type 改为字段属性对象            |
| `labelRemark`          | `labelRemark`              | 同上                                                 |
| `caption`              | 不保留                     | 使用 `description` 替代；如需 inline 文字可用 `hint` |
| `validationErrors`     | 通过 `validation` 规则配置 | 见 `docs/architecture/form-validation.md`            |

## 16. 风险、取舍与后续阶段

- 需要避免把 React 表单库生命周期重新耦合回 runtime。
- `submitApi` 与 `data-source` 的边界需要后续文档统一，不宜各组件各说各话。
- `fieldset` 已在 `amis-baseline-matrix.md` 中收口为 live retained family，后续需保持 matrix、manifest 与 form owner doc 同步。
- `fieldset` 内部字段的 form mode 继承需要通过 React context 传播，不能在 FieldFrame 内回读 schema。
- `hint` 和 `description` 的 schema → FieldFrame 接线需要在 `NodeFrameWrapper` 中完成，不能在 FieldFrame 内回读 schema。
- `remark` 和 `labelRemark` 依赖 `@nop-chaos/ui` 的 Tooltip 组件，需确认组件可用。
- `FieldFrame` 中 `frameWrap: 'group'` 的 `<fieldset>/<legend>` 语义仅用于 radio-group/checkbox-group 等单控件多选项场景，不用于多字段分组。
