# Field Binding And Renderer Contract

## Purpose

本文档定义以下约束：

- 常见 field-like schema 应如何建模，尤其是 `name`、`value`、`label`、`title`、`readOnly`、`disabled`
- `props` / `meta` / `regions` / `events` 四条归一化通道各自负责什么
- 什么时候应该沿用语义化字段名，什么时候应该与 `@nop-chaos/ui` 的命名保持一致
- 当前仓库从混合实现迁移到统一契约时，应遵守哪些最小规则

本文档是规范文档，不是一次性重构说明。

## Use This Doc When

- 设计或重构表单 renderer
- 判断某个 schema 字段应该进入 `props` 还是 `meta`
- 判断 editable field 应该使用 `name` 还是 `value`
- 判断一个 renderer 是否还在错误地回退读取 raw `schema`
- 判断某个作者侧 prop 是否应该直接沿用 `@nop-chaos/ui` 词汇

## Current Code Anchors

核对 live code 时，先看：

- `packages/flux-core/src/types/schema.ts`
- `packages/flux-core/src/constants.ts`
- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flux-runtime/src/schema-compiler/fields.ts`
- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-react/src/node-frame-wrapper.tsx`
- `packages/flux-renderers-form/src/schemas.ts`
- `packages/flux-renderers-form/src/renderers/composite-schemas.ts`

## Current Baseline

当前仓库已经具备统一 renderer contract 的大骨架：

- `RendererComponentProps` 已把 renderer 输入统一为 `schema`、`props`、`meta`、`regions`、`events`、`helpers`
- `SchemaFieldRule` 已允许 renderer metadata 决定字段进入 `meta`、`prop`、`region`、`value-or-region`、`event`、`ignored`
- 大部分 concrete renderer 已经采用 `RendererComponentProps<T>` 作为签名

但 live baseline 仍存在几类关键漂移：

- `BaseSchema` 有 `name`，而 `name` 应被视为普通 prop / binding 字段，而不是全局 meta 字段
- 多个 form renderer 仍要写 `props.props.name ?? props.schema.name`
- `InputSchema` 与 composite field schemas 仍重复声明 `name` / `readOnly` 等公共字段
- 一些 renderer 直接读取 raw `schema` 上的业务字段，而不是消费归一化后的 `props` / `meta`
- 少量作者侧 prop 命名仍与 `@nop-chaos/ui` 维护平行词汇表

因此当前问题不是“完全没有统一契约”，而是“统一契约已经存在，但没有彻底收口”。

## Main Decision

核心决策只有一句话：

**editable field 使用 `name` 作为唯一双向绑定入口，语义化内容字段继续保留自然命名，renderer 只应消费归一化后的运行时通道。**

## Rule 1: Expressions Use Ordinary Props

不要为普通业务字段再发明 `xxxExpr` 或 `xxxFormula` 的平行命名。

规则：

- 业务字段本身就可以承载表达式
- 编译器负责把这些字段编译成运行时值
- schema 命名关注业务语义，不关注“它是不是表达式”

例子：

```json
{
  "type": "text",
  "text": "${user.name}"
}
```

```json
{
  "type": "select",
  "options": "${roleOptions}"
}
```

不要写：

```json
{
  "type": "text",
  "textExpr": "${user.name}"
}
```

## Rule 2: Editable Field Binding Is `name`-First

对普通 editable field，`name` 是唯一的一等双向绑定入口。

适用范围：

- `input-text`
- `textarea`
- `select`
- `radio-group`
- `checkbox-group`
- `switch`
- 以及所有“绑定一个字段并把用户编辑结果写回 owner/form scope”的控件

判定标准：如果用户编辑该控件后，结果应写回 owner/form scope 的某个路径，它就是 editable field，受本条规则约束；“可搜索”“带预览”“多段 UI” 不会改变这一点。

语义：

- renderer 通过 `name` 读取当前字段值
- renderer 通过 `name` 写回当前字段值
- validation、touched、dirty、visited、hidden-field policy 等字段级语义也围绕 `name` 工作

这条规则的重要性高于“是否复用同一个 prop 名字”。

## Rule 3: `value` Is Not A Generic Editable Field Prop

`value` 不应与 `name` 并列成为普通 editable field 的第二个真数据源。

原因：

- 会引入优先级歧义：`name` 和 `value` 谁是当前值真源头
- 会引入写回歧义：用户输入后应回写到 `name` 还是保持受控 `value`
- 会引入同步歧义：外部 scope 更新时应覆盖谁
- 会让 validation owner 和 form runtime 的字段模型变得不稳定

因此规范要求：

- 普通 editable field base contract 不包含通用 `value` 字段
- 如果某个 editable control 同时声明 `name` 和 `value`，应视为无效或待拒绝的 authoring 形状，而不是隐式做优先级猜测

`value` 仍然可以存在，但它只能是窄语义字段，而不是通用 editable field base prop。

允许的 `value` 场景：

- 某个 renderer 自己定义的只读展示值
- `value-oriented` owner 的输入或输出 payload，见 `docs/architecture/value-adaptation-and-detail-field.md`
- viewer/content 局部 scope 中暴露给子树的 `value`
- 内部测试或诊断 renderer 的专用 prop

不允许的场景：

- 把 `value` 当成所有表单控件的通用作者侧字段，并与 `name` 共存

## Rule 4: Semantic Content Props Stay Semantic

不要为了表面统一，把所有 renderer 的业务字段都改叫 `value`。

以下字段保留语义化命名是正确的：

- `text`
- `title`
- `header`
- `footer`
- `placeholder`
- `options`
- `items`
- `data`
- `source`

原因：

- 这些名字表达的是业务语义，不只是“某个值”
- 统一成 `value` 只会让 schema 更抽象、更难读
- renderer 的运行时控制器可以统一成 `value`，但作者侧 schema 不需要机械统一成一个字段名

例子：

```json
{
  "type": "text",
  "text": "${user.email}"
}
```

这是自然的。

不要为了统一而强行改成：

```json
{
  "type": "text",
  "value": "${user.email}"
}
```

## Rule 5: `meta` Is For Node Control And Outer Frame State

`meta` 只应该承载节点控制态和外层 frame 语义，而不是业务绑定入口。

推荐的全局 `meta` 集合应尽量收窄到：

- `id`
- `className`
- `visible`
- `hidden`
- `disabled`
- `testid`

这里说的是目标 baseline，而不是当前实现现状。

规范上，默认全局 `META_FIELDS` 应收窄为上述 6 个字段，并把 `name`、`label`、`title` 等交回 renderer metadata 或普通 `props` 通道。

其中：

- `id` 表示 node identity 或外层可观测标识，不表示字段绑定键
- `disabled` 是运行时控制态，因此适合放在 `meta`
- `visible` / `hidden` 是节点生存期和渲染控制态，因此适合放在 `meta`

`name` 不属于这一类，不应作为默认全局 meta 字段。

`label` 与 `title` 也不应再被视为稳定的全局 meta 字段。它们是否进入 `props` 或 `regions`，应由 renderer metadata 决定。

## Rule 6: `readOnly` And `disabled` Are Not The Same Layer

推荐分层：

- `readOnly` 是业务字段编辑语义，应进入 `props`
- `disabled` 是节点控制态，应进入 `meta`

区别：

- `readOnly` 表示值可见但不可编辑，通常仍参与字段绑定和展示逻辑
- `disabled` 表示控件当前不可交互，通常由 runtime linkage、owner 状态或外层控制触发

因此：

- `BoundFieldSchemaBase` 应包含 `readOnly`
- `BaseSchema` / node control 层继续保留 `disabled`

## Rule 7: Renderer Metadata Owns Field Classification

字段进入哪条归一化通道，不应由 concrete renderer 自己临时猜测，也不应长期依赖全局字段名硬编码。

规则：

- renderer `fields` metadata 是字段语义的第一真源
- 全局默认规则只负责极少数真正稳定的 node-control 字段
- 只要某个字段不是全局稳定 meta，就应优先通过 renderer metadata 明确归类

具体要求：

- 如果字段是普通业务值，进入 `props`
- 如果字段可能是 schema fragment，声明为 `region` 或 `value-or-region`
- 如果字段是 declarative action，声明为 `event`
- concrete renderer 不应反复回退到 raw `schema` 判断字段究竟是什么

对于 field chrome：

- `label` 应通过 renderer metadata 进入 `props.label` 或 `regions.label`
- `NodeFrameWrapper` 可以消费归一化结果，但不应长期依赖 `templateNode.schema.label` 或 `resolvedMeta.label` 兜底

## Rule 8: Introduce Small Shared Field Schema Bases

仓库需要统一 field contract，但不需要一个巨大的万能基类。

推荐方向是引入小而稳定的共享基类。

示意：

```ts
interface NodeControlSchema extends SchemaObject {
  id?: string;
  className?: string;
  visible?: boolean | string;
  hidden?: boolean | string;
  disabled?: boolean | string;
  testid?: string;
  frameWrap?: FrameWrapMode;
}

interface BaseSchema extends NodeControlSchema {
  type: string;
  validateOn?: ValidationTrigger | ValidationTrigger[];
  showErrorOn?: ValidationVisibilityTrigger | ValidationVisibilityTrigger[];
  onMount?: ActionSchema | ActionSchema[];
  onUnmount?: ActionSchema | ActionSchema[];
  'xui:imports'?: XuiImportSpec[];
  'xui:linkage'?: FieldLinkageSchema;
}

interface BoundFieldSchemaBase extends BaseSchema {
  name: string;
  readOnly?: boolean;
  required?: boolean;
}
```

是否真的拆出 `NodeControlSchema` 这个名字不是本文重点。

上面的例子刻意把“节点控制态”与“BaseSchema 仍会承载的其他扩展键”分开写：`validateOn` / `showErrorOn` 是 validation policy，`onMount` / `onUnmount` 是 lifecycle actions，`xui:imports` 与当前 legacy `xui:linkage` 是 namespaced extension keys。它们可以继续存在于 `BaseSchema`，但不应成为 `NodeControlSchema` 这个边界命名的核心定义理由。

本文要求的是边界：

- 普通 editable field 共享同一套最小字段契约
- 这套契约同时适用于简单 input 和 composite field owner
- 不要再让 `InputSchema` 与 composite schemas 各自重复声明同一组核心字段

## Rule 9: Static Structural Fields Must Be Explicit

少数字段可以继续由 renderer 直接读取 raw `schema`，但必须满足以下条件：

- 它们是结构配置，而不是运行时业务值
- 它们不打算支持表达式求值
- 文档明确声明它们是 static structural fields

当前已确认的 static structural fields：

- `statusPath`：当文档已把它定义为 owner/source/surface 发布只读状态摘要的路径时，允许 renderer 或 runtime 按结构配置直读 raw schema
- `componentId`：当字段语义是“把 action 定向到某个已渲染组件实例”时，允许保留 raw schema 直读

仍待按具体文档判定的例子：

- 某些纯结构性的 `surface` / `selector` config

如果某个字段未来需要动态值语义，就不能继续保留在 raw `schema` 直读路径里，而应显式进入 `props`。

禁止长期处于“现在先直读 schema，以后再说”的灰区。

## Rule 10: Align With `@nop-chaos/ui` When Semantics Match Exactly

作者侧 schema 不需要对所有业务字段都追求 shadcn 风格，但在语义完全等价时，应尽量减少双词汇表。

推荐规则：

- 如果 schema 字段与 `@nop-chaos/ui` 的 prop 语义完全一致，优先使用同一组词汇
- 如果 schema 字段表达的是 low-code 领域语义，而不是单纯组件 prop，保留领域命名

例如：

- `button.variant` / `button.size` 如果只是把值直接映射到 `Button`，就不应长期维持两套平行命名
- `text.text`、`tree.data`、`select.options` 这类字段仍应保留语义化命名

不要做的事情：

- 为了“统一”把所有字段都命名成 shadcn prop
- 维护两套长期并存的等价枚举，再由 renderer 每次翻译

## Frozen Contract Matrix

此矩阵是冻结后的权威决策，不受后续局部实现漂移影响。

### Field Channel Assignment

| Author-Facing Field | Normalized Channel | Frozen Rule |
| --- | --- | --- |
| `name` | `props.name` | 从 META_FIELDS 移除，由 renderer metadata 分类为 prop；editable field 的唯一双向绑定入口 |
| `readOnly` | `props.readOnly` | 业务编辑语义，进入 props，不进入 meta |
| `required` | `props.required` | 字段级校验语义，进入 props |
| `label` | `props.label` 或 `regions.label` | 由 renderer metadata 决定；不再硬编码为全局 meta |
| `title` | `props.title` 或 `regions.title` | 由 renderer metadata 决定；不再硬编码为全局 meta |
| `disabled` | `meta.disabled` | runtime 节点控制态，保留在 meta |
| `visible` / `hidden` | `meta.*` | runtime 节点可见性，保留在 meta |
| `className` / `testid` / `id` | `meta.*` | 外层 wrapper / observability，保留在 meta |
| `text`, `data`, `options`, `items`, `placeholder`, … | `props.*` | 语义化内容字段，保留命名，通过 renderer metadata 进入 props |
| `body`, `header`, `footer`, `actions`, `toolbar` | `regions.*` | 子 schema 片段，由 renderer metadata 分类为 region |
| `onClick`, `onSubmit`, `onChange`, … | `events.*` | declarative action，保留 on* 命名 |

### Global META_FIELDS Frozen Set

以下是冻结后的 `META_FIELDS` 最小集合：

```ts
export const META_FIELDS = new Set([
  'id',
  'className',
  'visible',
  'hidden',
  'disabled',
  'testid'
]);
```

移除的字段：`name`、`label`、`title`。这三个字段改由各 renderer 的 `fields` metadata 明确分类。

### Permitted Static Structural Fields (Raw Schema Read Allowed)

以下字段可由 renderer 直接读取 raw `schema`，无需进入归一化通道：

| Field | Renderer(s) | Justification |
| --- | --- | --- |
| `statusPath` | `page`, `form`, `dialog`, `drawer`, `tree-renderer` | 纯结构配置，不支持表达式，读取一次后不变 |
| `componentId` | `chart-renderer` | 纯结构配置，chart 实例标识 |
| `frameWrap` | `NodeFrameWrapper` | 结构配置，不是业务值 |

如果未来需要让这些字段支持表达式求值，必须显式迁移到 `props`，不得继续保留在 raw schema 直读路径中。

### `value` Usage Rules

`value` 在以下场景中仍然合法：

1. `detail-field` / `detail-view` viewer/content scope 中作为局部绑定变量（scope variable）
2. `value-oriented` owner 的 `transformInAction` / `transformOutAction` payload 中的 `value` 字段
3. 只读展示 viewer 中作为 renderer-local semantic field

禁止场景：普通 editable field 同时声明 `name` 和 `value`，视为歧义 authoring。

### Cross-Check With `value-adaptation-and-detail-field.md`

- `detail-field` 使用 `name` 作为一等绑定入口，与本文 Rule 2 保持一致。
- `detail-view` 使用 `data` / `scopePath`，与本文 Rule 4 中"语义化内容字段保留命名"保持一致。
- `transformInAction` / `transformOutAction` payload 中的 `value` 是内部 working value，与本文 Rule 3 中"允许的 value 场景"保持一致。
- 两个文档中的 `readOnly` 均进入 `props`，对齐 Rule 6。

## Recommended Channel Mapping

| Concern | Author-Facing Field | Normalized Channel | Notes |
| --- | --- | --- | --- |
| Editable binding path | `name` | `props.name` | 唯一双向绑定入口 |
| Field read-only semantics | `readOnly` | `props.readOnly` | 业务编辑语义 |
| Field required semantics | `required` | `props.required` | 字段级业务语义 |
| Outer-frame label | `label` | `props.label` or `regions.label` | 由 renderer metadata 决定 |
| Title-like content | `title` | `props.title` or `regions.title` | 不应默认为全局 meta |
| Semantic display content | `text`, `data`, `options`, `items` | `props.*` | 表达式直接写在普通字段上 |
| Node disabled state | `disabled` | `meta.disabled` | runtime control state |
| Node visibility | `visible`, `hidden` | `meta.*` | runtime control state |
| Node class/test identity | `className`, `testid`, `id` | `meta.*` | 外层 wrapper / observability |
| Child schema fragments | `body`, `item`, `header`, `footer`, `label` | `regions.*` | 由 field metadata 定义 |
| Declarative events | `onClick`, `onSubmit`, `onChange` | `events.*` | 保留 declarative action 语义 |

## Authoring Examples

### Editable Input

```json
{
  "type": "input-text",
  "name": "user.email",
  "label": "Email",
  "placeholder": "name@example.com"
}
```

### Read-Only Text Viewer

```json
{
  "type": "text",
  "text": "${user.email}"
}
```

### Invalid Ambiguous Editable Shape

```json
{
  "type": "input-text",
  "name": "user.email",
  "value": "${draftEmail}"
}
```

上例不应被解释成“支持两种绑定方式”；它应被诊断为歧义 authoring。

## Migration Rules

从当前 baseline 迁移到目标契约时，遵守以下最小规则：

1. 先冻结字段归属，再重构 renderer 代码，不要一边改字段语义一边临时加回退分支。
2. 优先消除 `name` 的通道冲突，再处理 `label` / `title` 等次级字段。
3. 先抽取小型共享 field schema base 和 helper，再迁移具体 renderer，避免每个文件各写一套新规则。
4. 对于仍需直读 raw `schema` 的字段，必须先在文档中声明它是 static structural field。
5. 不为了复用而制造巨型 base renderer；共享应优先落在 schema base、field helper、wrapper helper 上。
6. 不把 semantic display props 统一重命名成 `value`。
7. 不允许普通 editable field 同时支持 `name` 和 `value` 两套双向绑定语义。
8. `META_FIELDS` 应收窄为 `{id, className, visible, hidden, disabled, testid}`；`name` / `label` / `title` 不再被默认视为全局 meta 字段。

## Related Documents

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
