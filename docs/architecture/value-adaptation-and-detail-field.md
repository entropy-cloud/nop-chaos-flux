# Value Adaptation, Detail Field, And Detail View

## Purpose

本文档定义三件事：

- value-oriented renderer 的通用值适配契约
- 一种绑定单值字段的组合式控件 `detail-field`
- 一种绑定当前 scope 投影或对象数据的组合式控件 `detail-view`

使用场景：

- 某个控件展示的值和外部持久值不是同一种形态
- 某个控件在提交前需要做 domain-specific 校验
- 某个字段的 inline 展示只能显示摘要，完整内容需要放进 dialog / drawer / sheet 中查看或编辑
- 某个 renderer 需要在当前 scope 上显示更多字段、查看更多上下文、或编辑一整组局部数据
- 表格中需要查看一行详情、编辑一行局部字段、或用 hover / inline-below 展示更多内容
- 平台代码固定，但值转换逻辑需要通过 `xui:imports` 动态加载

## Position

- 这不是 `flow-designer` 专属设计。
- 这也不是某个单独 `graph-value-editor` 的私有协议。
- 这是 value-oriented control 共享的一组适配语义，但不是所有控件都必须采用 staged owner-submit lifecycle。
- 本文档描述的是目标契约；当前 renderer 实现可以暂时落后，但新设计应以这里为统一 baseline。

## Core Model

value-oriented control 可以分为两类：

- value viewer：读取一个值并展示它
- value editor：读取一个值、维护内部编辑态、再把结果写回

它们都可能需要 value adaptation。

推荐语义字段：

- `transformInAction` - 外部值 -> 内部展示值或编辑值
- `transformOutAction` - 内部编辑值 -> 外部提交值
- `validateValueAction` - 校验当前内部编辑值

命名意图：

- 不用 `parse` / `serialize` 作为总称，因为这组词太偏 AST / codec 语义
- `transformIn` / `transformOut` 更适合字符串、对象、图、AST、schema、domain DTO 等各种值形态

## Two Ownership Modes

value-oriented control 需要先区分两种 owner 模式：

- surface-backed staged owner：有明确的 open / confirm / cancel 语义，内部 working value 与外部持久值可以分离
- inline live-edit owner：没有独立确认步骤，子编辑直接作用于父表单当前值

推荐边界：

- `detail-field`
- `detail-view`

属于 surface-backed staged owner，因此适合完整采用：

- `transformInAction`
- `validateValueAction`
- `transformOutAction`
- owner-managed confirm / cancel / commit

Performance baseline:

- `detail-field` / `detail-view` 打开时不应默认 deep clone 整个对象值
- 推荐保留原始输入引用，并以 overlay / patch 形式维护 working draft
- confirm 时再 materialize 最终 outbound value 或 patch
- cancel 时直接丢弃 draft overlay

而以下控件默认属于 inline live-edit owner：

- `object-field`
- `array-field`
- `variant-field`

它们可以复用值适配家族中的局部语义，例如：

- `variant-field` 的 detection
- variant switch 时的迁移型 `transformInAction`
- 共享 payload / `ActionResult.data` 读取规则

但它们不默认引入独立 draft runtime，也不要求 owner-managed submit-time validate/transformOut/writeback。

判断标准不是“是不是 composite field”，而是：

- 是否存在 confirm / cancel
- 是否需要区分 working value 和 persisted value
- 是否需要把 commit 延迟到用户确认之后

## Shared Wrapper

是的，这组 `transformInAction` / `transformOutAction` / `validateValueAction` 不应由每个具体控件各自零散实现。

推荐做法是提供一个共享 owner wrapper 或 helper，统一负责：

- 构造默认 payload
- 执行 action
- 读取 `ActionResult.data`
- 应用 replace-not-merge 的 `args` 规则
- 管理 draft 生命周期中的 transform / validate 调用顺序
- 统一错误处理和 owner-level diagnostics

推荐把这层视为 value-oriented owner 的公共基础设施，但要区分“共享 action payload / result 规则”和“共享 staged draft lifecycle”这两个层次。

也就是说：

- `detail-field`
- `detail-view`

应复用完整的 staged owner helper。

而：

- `variant-field`
- `object-field`
- `array-field`

只需要在确实存在对应语义时复用共享 helper 的局部能力，不应为了“家族统一”强行引入 staged owner-submit。

这条性能基线的目的不是限制 staged owner，而是避免把“有 confirm/cancel”误实现成“open 时深拷贝整对象”。

The important architectural point is not the helper name. The important point is that value adaptation is an owner-level substrate shared by this renderer family, not ad hoc per-renderer imperative code.

推荐方向：

```ts
interface ValueAdaptationOwnerHelper {
  runTransformIn(...): Promise<unknown>;
  runTransformOut(...): Promise<unknown>;
  runValidate(...): Promise<ValidationResult>;
}
```

具体 helper 名称不是本文关心的重点，但“共享 wrapper”这条边界应该保持稳定。

## Recommended Owner Contract

### Value Viewer

显示控件至少可以选择支持：

```ts
interface ValueViewerOwnerSchema extends BaseSchema {
  value?: SchemaValue;
  transformInAction?: ActionSchema | ActionSchema[];
}
```

语义：

- owner 先拿到原始输入值
- 如声明了 `transformInAction`，先执行该 action
- owner 用转换后的值继续渲染 viewer

### Value Editor

编辑控件在此基础上再增加。这里要区分两种 owner：

- field owner：通过 `name` 绑定一个值
- view owner：通过 scope projection 或显式 `data` 绑定一个对象

对 field owner：

```ts
interface ValueFieldEditorOwnerSchema extends BaseSchema {
  name: string;
  readOnly?: boolean;
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}
```

对 view owner：

```ts
interface ValueViewEditorOwnerSchema extends BaseSchema {
  readOnly?: boolean;
  data?: Record<string, SchemaValue>;
  scopePath?: string;
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}
```

语义：

- field owner 从 `name` 读取当前外部值
- view owner 从 `data` 或 `scopePath` 生成外部输入对象
- owner 通过 `transformInAction` 生成内部 working value 或 draft
- 用户编辑内部 working value
- 提交前可执行 `validateValueAction`
- 提交时通过 `transformOutAction` 把内部值转换回外部值或更新补丁
- field owner 自己把最终值写回 `name`
- view owner 自己决定如何应用返回结果，例如回写一组 scope 字段、发出 patch、或交给 owner-local callback/action

重要边界：

- action 负责转换或校验
- owner 负责值绑定、draft 生命周期、提交与取消语义
- 不要把最终写回 `name` 或应用 patch 的职责下放给 imported namespace 或内部 schema 片段

## Default Payload Rule

对于 `transformInAction`、`transformOutAction`、`validateValueAction`，推荐统一采用以下规则：

- 如果 action schema 没有显式声明 `args`，owner 可注入当前语义入口的默认 payload
- 如果 action schema 显式声明了 `args`，则完全以显式 `args` 为准，不做隐式合并

这是刻意设计的 replace 规则，不是 merge 规则。

This replace rule is part of the shared value-adaptation contract and should stay consistent anywhere these actions are used, even though only surface-backed owners require the full staged commit lifecycle.

原因：

- 可预测
- 调试简单
- 不会出现“默认 payload 和显式 payload 哪个覆盖哪个”的隐含复杂度

## Recommended Default Payloads

### `transformInAction`

推荐默认 payload：

```ts
{
  value: rawValue,
  name,
  readOnly
}
```

对于 view owner，也可把 `value` 理解为外部输入对象：

```ts
{
  value: projectedScopeObject,
  readOnly
}
```

### `transformOutAction`

推荐默认 payload：

```ts
{
  value: workingValue,
  originalValue: rawValue,
  name,
  readOnly
}
```

view owner 可不带 `name`，而返回 owner-specific commit payload，例如 patch object。

### `validateValueAction`

推荐默认 payload：

```ts
{
  value: workingValue,
  originalValue: rawValue,
  name
}
```

## Recommended Result Shapes

推荐约定 owner 从 `ActionResult.data` 读取语义结果。

### `transformInAction`

- 推荐返回转换后的内部值本身
- 或返回 `{ value }` 也可，但 owner contract 必须固定一种，不要混用

### `transformOutAction`

- 推荐返回最终提交值本身
- 或返回 `{ value }` 也可，但 owner contract 必须固定一种，不要混用

对于 view owner，推荐不要直接返回“整份 scope 新值”。

更推荐返回 owner 可应用的提交结果，例如：

```ts
{
  updates: Record<string, unknown>;
}
```

或：

```ts
{
  patch: Array<{
    path: string;
    value: unknown;
  }>;
}
```

owner 读取该结果后再决定如何应用到当前 scope、当前行、当前对象或宿主局部状态。

### `validateValueAction`

推荐返回：

```ts
{
  valid: boolean;
  issues?: Array<{
    level: 'error' | 'warning';
    message: string;
    path?: string;
  }>;
}
```

## Two Author-Facing Controls

推荐不要把“单值字段详情”和“scope 投影详情”硬塞成一个 author-facing schema 控件。

更好的边界是：

- 共享同一个 value adaptation / draft lifecycle 内核
- schema 层暴露两个控件：`detail-field` 和 `detail-view`

原因：

- `name` 绑定是字段控件里非常重要的一等设计，不应为了统一而弱化
- 但 scope 投影详情、行详情、hover detail 又明显不属于单值字段
- 两者底层机制相近，但 authoring 语义并不相同

## `detail-field`

`detail-field` 是一个推荐的 surface-backed field owner。

它适合：

- inline 区域只能显示摘要
- 完整内容需要在 dialog / drawer / sheet 中查看
- 某些值在 read-only 场景下只能“展开看”
- 某些值在 editable 场景下需要复杂编辑器，但仍然只绑定到一个 `name`

`detail-field` 的关键点是：`name` 必须保持为一等设计。

对于字段控件，不要为了统一而把 `name` 降级成任意 `source` 对象。

### Recommended Shape

```ts
interface DetailFieldSchema extends BaseSchema {
  type: 'detail-field';
  name: string;
  readOnly?: boolean;
  viewer?: SchemaInput;
  content: SchemaInput;
  surface?: {
    mode?: 'dialog' | 'drawer' | 'sheet';
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    placement?: 'left' | 'right' | 'bottom' | 'center';
  };
  trigger?: 'button' | 'icon' | 'click';
  triggerLabel?: string;
  openAction?: ActionSchema | ActionSchema[];
  confirmAction?: ActionSchema | ActionSchema[];
  cancelAction?: ActionSchema | ActionSchema[];
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}
```

### Why `detail-field`

推荐使用 `detail-field` 而不是 `popup-field` 或 `popupEditor`。

原因：

- `popup` 太强调实现手段，无法自然覆盖 drawer / sheet
- `editor` 太强调可编辑，但该控件也可能是纯查看
- `detail-field` 更准确表达“inline 摘要 + detail surface”的职责

## `detail-view`

`detail-view` 是推荐的 scope/object detail owner。

它适合：

- 展示当前 scope 中的一组变量
- 表格行详情查看
- 表格行局部编辑
- hover detail、popover detail、inline-below detail
- “当前区域显示不下，需要展开查看更多”的场景

### Recommended Shape

```ts
interface DetailViewSchema extends BaseSchema {
  type: 'detail-view';
  readOnly?: boolean;
  data?: Record<string, SchemaValue>;
  scopePath?: string;
  viewer?: SchemaInput;
  content: SchemaInput;
  surface?: {
    mode?: 'dialog' | 'drawer' | 'sheet' | 'popover' | 'hover' | 'inline-below';
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    placement?: 'left' | 'right' | 'bottom' | 'center';
  };
  trigger?: 'button' | 'icon' | 'click' | 'hover';
  openAction?: ActionSchema | ActionSchema[];
  confirmAction?: ActionSchema | ActionSchema[];
  cancelAction?: ActionSchema | ActionSchema[];
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}
```

### Source Model

`detail-view` 的外部输入推荐有两种来源：

- `data`: 显式投影当前 scope 中需要的一组字段
- `scopePath`: 直接取当前 scope 下某个对象

例如：

```json
{
  "type": "detail-view",
  "scopePath": "row",
  "viewer": { "type": "tpl", "tpl": "${value.name}" },
  "content": { "type": "tpl", "tpl": "${JSON.stringify(value, null, 2)}" }
}
```

或者：

```json
{
  "type": "detail-view",
  "data": {
    "name": "${name}",
    "status": "${status}",
    "owner": "${owner}"
  }
}
```

### Commit Rule

`detail-view` 如果是只读场景，不存在回写问题。

如果是可编辑场景，推荐：

- 由 `transformOutAction` 明确返回 owner 可应用的提交结果
- 不要默认把 draft 的每个 key 自动写回当前 scope 同名字段

这样更安全，也更适合表格行编辑这类局部 patch 场景。

推荐提交结果形状：

```ts
type DetailViewCommitResult =
  | {
      updates: Record<string, unknown>;
    }
  | {
      patch: Array<{
        path: string;
        value: unknown;
      }>;
    };
```

推荐约束：

- `updates` 适合把一组字段回写到当前 scope owner，例如当前 table row scope
- `patch` 适合更复杂或更显式的局部更新
- 不推荐没有约定地直接返回“整份外部对象”，否则 owner 很难知道应替换哪里

### Lifecycle

`detail-view` 也应按 owner-managed draft/view model 实现：

1. 从 `data` 或 `scopePath` 生成当前外部输入对象
2. 打开 `surface` 时生成内部 draft 或 view model
3. `content` 只读取和编辑 draft，不直接改外部 scope
4. `readOnly=true` 时只允许查看，不做提交
5. 确认时先执行 `validateValueAction`
6. 校验通过后执行 `transformOutAction`
7. owner 应用返回的 commit result，例如 patch、局部更新或 owner-specific writeback
8. 取消时丢弃 draft

### Scope Recommendation

推荐给 `viewer` 的 scope：

```ts
{
  value: currentValue,
  readOnly
}
```

推荐给 `content` 的 scope：

```ts
{
  value: draftValue,
  originalValue: currentValue,
  readOnly,
  dirty
}
```

其中 `currentValue` / `draftValue` 在 `detail-view` 中表示当前投影对象，而不是单个字段值。

这样 `content` 中的表单或复杂 renderer 可以统一围绕 `value` 工作。

## Dynamic Domain Libraries

当值转换逻辑需要动态加载时，推荐：

- owner 或其上层容器通过 `xui:imports` 声明所需 namespace
- host 通过 `env.importLoader` 受控加载模块
- `transformInAction` / `transformOutAction` / `validateValueAction` 绑定到导入 namespace 的 methods

例如，字段模式：

```json
{
  "type": "detail-field",
  "name": "submitAction",
  "xui:imports": [
    { "from": "@tenant/acme-action-graph", "as": "actionGraph" }
  ],
  "viewer": {
    "type": "tpl",
    "tpl": "${value?.action || '未设置'}"
  },
  "content": {
    "type": "designer-page",
    "document": "${value}",
    "config": "${actionGraphConfig}"
  },
  "transformInAction": {
    "action": "actionGraph:toGraph"
  },
  "transformOutAction": {
    "action": "actionGraph:toActionSchema"
  },
  "validateValueAction": {
    "action": "actionGraph:validate"
  }
}
```

这里的关键点不是 `designer-page` 本身懂 `ActionSchema`，而是：

- `detail-field` 负责单值字段生命周期
- `flow-designer` 只是内部复杂 UI 的一种实现
- 动态导入的 domain library 负责值与 graph 之间的 round-trip

scope/detail 模式也可以使用同样的值适配动作，只是 owner 不再回写一个 `name`，而是应用 owner-specific commit result。

## Table Row Examples

### Row Details

```json
{
  "type": "detail-view",
  "readOnly": true,
  "scopePath": "row",
  "viewer": {
    "type": "tpl",
    "tpl": "${value.name}"
  },
  "content": {
    "type": "container",
    "body": [
      { "type": "tpl", "tpl": "Name: ${value.name}" },
      { "type": "tpl", "tpl": "Status: ${value.status}" },
      { "type": "tpl", "tpl": "Owner: ${value.owner}" }
    ]
  },
  "surface": {
    "mode": "drawer",
    "title": "Row Details"
  }
}
```

### Row Edit

```json
{
  "type": "detail-view",
  "scopePath": "row",
  "viewer": {
    "type": "tpl",
    "tpl": "${value.name}"
  },
  "content": {
    "type": "form",
    "body": [
      { "type": "input-text", "name": "value.name", "label": "Name" },
      { "type": "input-text", "name": "value.owner", "label": "Owner" },
      { "type": "input-text", "name": "value.status", "label": "Status" }
    ]
  },
  "transformOutAction": {
    "action": "rowEditor:buildPatch"
  },
  "surface": {
    "mode": "inline-below"
  }
}
```

`rowEditor:buildPatch` 推荐返回：

```json
{
  "updates": {
    "name": "...",
    "owner": "...",
    "status": "..."
  }
}
```

然后由 `detail-view` owner 把这些更新应用到当前行 scope 或其上层 owner。

## Simple Read-Only `detail-field` Example

```json
{
  "type": "detail-field",
  "name": "description",
  "readOnly": true,
  "viewer": {
    "type": "tpl",
    "tpl": "${String(value || '').slice(0, 100)}"
  },
  "content": {
    "type": "tpl",
    "tpl": "${value}"
  },
  "surface": {
    "mode": "drawer",
    "title": "Description"
  }
}
```

## Related Documents

- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/config-schema.md`
- `docs/architecture/renderer-runtime.md`
