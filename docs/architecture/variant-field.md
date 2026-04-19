# Variant Field

## Purpose

本文档定义 `variant-field`，用于编辑或查看“一个值可能有多种形态”的字段。

典型场景：

- `string | ActionSchema`
- `boolean | object`
- `string | string[]`
- 某个字段既可能是简单字面量，也可能是结构化配置对象

这类控件的核心问题不是“展开查看更多”，而是：

- 当前值属于哪一种变体
- 用哪种 renderer 显示或编辑当前变体
- 用户切换变体时如何生成新值
- 提交时如何把当前变体值写回原字段

## Position

- `variant-field` 是一个独立于 `detail-field` / `detail-view` 的 author-facing 控件。
- 它与 `detail-field` / `detail-view` 同属 value-oriented family，但默认是 inline live-edit control，不要求 staged owner-submit lifecycle。
- 它解决的是“多态值 / union-like value”的识别和编辑，不是 detail surface 的展开问题。
- 它应复用共享的 detection / payload / switch-migration 规则，但不应为了统一而强行引入 submit-time owner validate/transformOut。
- 本文档描述当前推荐 baseline：variant detection 和 switch migration 是一等能力；commit 仍由父表单正常 live-edit 提交承担。

## Core Model

`variant-field` 是一个字段控件，所以：

- `name` 仍然是一等设计
- 它绑定一个外部值
- 但该外部值可以匹配多个 variant
- 字段级 chrome（`label` / `required` / `hint` / `error` / `data-field-*`）应复用共享 `FieldFrame`，`variant-field` 自身只负责 selector、active variant subtree 和变体切换逻辑

推荐 shape：

```ts
interface VariantFieldSchema extends BaseSchema {
  type: 'variant-field';
  name: string;
  readOnly?: boolean;
  variants: VariantOption[];
  selector?: {
    mode?: 'tabs' | 'select' | 'radio' | 'segmented';
    label?: string;
  };
  defaultVariant?: string;
  detectVariantAction?: ActionSchema | ActionSchema[];
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}

interface VariantOption {
  key: string;
  label: string;
  viewer?: SchemaInput;
  content: SchemaInput;
  match?: VariantMatch;
  initialValue?: SchemaValue;
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}
```

## Variant Detection

### Detection Priority

推荐按以下顺序识别当前值属于哪个 variant：

1. 如果值已经带稳定 discriminator，优先使用该 discriminator
2. 按 `variants[].match` 顺序尝试结构匹配
3. 如果仍无法判定，再执行 `detectVariantAction`
4. 最后 fallback 到 `defaultVariant`

### Why Built-In Matching First

大多数常见场景不需要动态检测 action。

例如：

- `typeof value === 'string'`
- `Array.isArray(value)`
- `value` 是对象并且含有 `action`

因此推荐先支持一组可静态表达的 `match` 规则，再把 `detectVariantAction` 留给复杂 domain。

### Recommended Match Model

```ts
type VariantMatch =
  | { kind: 'typeof'; value: 'string' | 'number' | 'boolean' | 'object' }
  | { kind: 'array' }
  | { kind: 'has-key'; key: string }
  | { kind: 'shape'; requiredKeys: string[] }
  | { kind: 'expression'; when: SchemaValue };
```

## Lifecycle

推荐 lifecycle：

1. 从 `name` 读取原始值
2. 识别当前 variant
3. 对该 variant 执行 detection / switch-migration 所需的 inbound 逻辑
4. 用该 variant 的 `viewer` / `content` 渲染当前 working value
5. 用户可切换 variant，切换时可通过目标 variant 的 `transformInAction` 迁移值
6. 当前值继续以 inline live-edit 方式存在于父表单中
7. 表单 submit 时直接读取当前字段值

关键边界：

- `variant-field` 默认没有独立 draft runtime
- `variant-field` 默认不要求 `variant validate -> field validate -> variant transformOut -> field transformOut` 这类 submit-time owner pipeline
- 如果某个 variant 的编辑器本身需要 staged edit，应在该 variant 内部组合 `detail-field` / `detail-view` 等 surface-backed owner
- `variant-field` 默认不创建新的 `FormRuntime`
- 推荐实现是复用父 `FormRuntime` / `ValidationScopeRuntime`，再为当前变体发布一个很窄的 projected scope payload，例如 `{ value, variant, readOnly }`

## Variant Switching

用户主动切换 variant 时，不推荐隐式复用旧 variant 的 working value。

推荐规则：

- 默认使用目标 variant 的 `initialValue` 重新创建 working value
- 如需迁移旧值，显式通过目标 variant 的 `transformInAction` 完成

Mounted-subtree rule:

- 默认只挂载当前 active variant 的 viewer / content subtree
- 不推荐为了“切换更快”长期同时挂载所有 variant subtree
- hidden variant subtree 的内部运行态如果确实需要保留，应由更具体的 owner 明确声明，而不是作为 `variant-field` 的默认基线

这样比“尝试自动保留旧值”更可预测。

## Scope Model

推荐给当前 variant `viewer` / `content` 的 scope：

```ts
{
  value: currentWorkingValue,
  variant: currentVariantKey,
  readOnly
}
```

这样每个变体都围绕统一的 `value` 工作，而不是各自定义不同字段名。

## Result And Validation Order

推荐顺序：

### Inbound

1. 控件级 `transformInAction`
2. 变体级 `transformInAction`

### Validation

1. 变体级 `validateValueAction`
2. 控件级 `validateValueAction`

### Outbound

1. 变体级 `transformOutAction`
2. 控件级 `transformOutAction`

## `detectVariantAction`

复杂场景可声明：

```json
{
  "detectVariantAction": {
    "action": "myDomain:detectVariant"
  }
}
```

推荐默认 payload：

```ts
{
  value: rawValue,
  variants: string[]
}
```

推荐返回：

```ts
{
  variant: string;
}
```

如果返回未知 variant key，owner 应回退到 `defaultVariant` 或报出结构化错误。

## Example: `string | ActionSchema`

```json
{
  "type": "variant-field",
  "name": "validateAction",
  "selector": {
    "mode": "segmented",
    "label": "Type"
  },
  "variants": [
    {
      "key": "text",
      "label": "Text",
      "match": { "kind": "typeof", "value": "string" },
      "content": {
        "type": "input-text",
        "name": "value"
      },
      "initialValue": ""
    },
    {
      "key": "action",
      "label": "Action",
      "match": { "kind": "has-key", "key": "action" },
      "content": {
        "type": "detail-field",
        "name": "value",
        "viewer": {
          "type": "tpl",
          "tpl": "${value?.action || '未设置'}"
        },
        "content": {
          "type": "designer-page"
        }
      },
      "initialValue": {
        "action": ""
      }
    }
  ],
  "defaultVariant": "text"
}
```

这里：

- 当前值如果是 string，就走 `text`
- 当前值如果是对象且有 `action` 字段，就走 `action`
- `action` variant 内部又可以复用 `detail-field`

## Relationship To Other Controls

- `variant-field` 解决“值有多种变体”
- `detail-field` 解决“单个字段需要展开查看/编辑”
- `detail-view` 解决“当前 scope/object 需要展开查看更多/编辑更多”

这些控件可以嵌套组合：

- `variant-field` 的某个 variant 可使用 `detail-field`
- `detail-field` 的 `content` 里也可放 `variant-field`

## Related Documents

- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/renderer-runtime.md`
