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
- 它与 `detail-field` / `detail-view` 一样，复用通用的 value adaptation 模型：`transformInAction` / `transformOutAction` / `validateValueAction`。
- 它解决的是“多态值 / union-like value”的识别和编辑，不是 detail surface 的展开问题。
- 它也应复用共享的 value adaptation owner wrapper，而不是自己单独实现 transform/validate 调度。

## Core Model

`variant-field` 是一个字段控件，所以：

- `name` 仍然是一等设计
- 它绑定一个外部值
- 但该外部值可以匹配多个 variant

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
3. 对该 variant 执行控件级和变体级 `transformInAction`
4. 用该 variant 的 `viewer` / `content` 渲染当前 working value
5. 用户可切换 variant
6. 提交前执行变体级和控件级 `validateValueAction`
7. 提交时执行变体级和控件级 `transformOutAction`
8. owner 将结果写回 `name`

## Variant Switching

用户主动切换 variant 时，不推荐隐式复用旧 variant 的 working value。

推荐规则：

- 默认使用目标 variant 的 `initialValue` 重新创建 working value
- 如需迁移旧值，显式通过目标 variant 的 `transformInAction` 完成

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
