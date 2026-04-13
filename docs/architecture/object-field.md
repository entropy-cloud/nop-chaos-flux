# Object Field

## Purpose

本文档定义 `object-field`，用于编辑“一个字段本身就是对象”的场景。

典型场景：

- `profile: { firstName, lastName, email }`
- `address: { street, city, zip }`
- `api: { method, url, headers }`
- 任意需要在一个字段内部再拆多个属性子字段的对象值

## Position

- `object-field` 是一个字段控件，所以 `name` 仍然是一等设计。
- 它与 `detail-field`、`detail-view`、`variant-field` 一样，复用通用的 value adaptation 模型。
- 它解决的是“一个字段值是对象，内部需要像局部 subform 一样编辑其属性”的问题。
- 本文档描述未来统一契约；当前实现即使尚未完整复用共享 owner helper，也不应改变这里的 contract 方向。

## Core Model

推荐 shape：

```ts
interface ObjectFieldSchema extends BaseSchema {
  type: 'object-field';
  name: string;
  readOnly?: boolean;
  body: SchemaInput;
  transformInAction?: ActionSchema | ActionSchema[];
  transformOutAction?: ActionSchema | ActionSchema[];
  validateValueAction?: ActionSchema | ActionSchema[];
}
```

## Key Rule: Child Names Are Relative

`object-field` 内部子字段的 `name` 推荐相对对象根，而不是要求作者书写完整外层路径。

例如：

```json
{
  "type": "object-field",
  "name": "profile",
  "body": [
    { "type": "input-text", "name": "firstName", "label": "First Name" },
    { "type": "input-text", "name": "lastName", "label": "Last Name" }
  ]
}
```

它表示编辑：

- `profile.firstName`
- `profile.lastName`

而不是要求作者写：

```json
{ "name": "profile.firstName" }
```

或：

```json
{ "name": "value.firstName" }
```

## Lifecycle

推荐 lifecycle：

1. 从 `name` 读取当前对象值
2. 通过 `transformInAction` 生成内部 draft object
3. 在 `body` 中对 draft object 的子字段进行编辑
4. 提交前执行 `validateValueAction`
5. 提交时执行 `transformOutAction`
6. owner 将结果写回整个 `name`

这条 lifecycle 描述的是目标 owner contract，不要求当前代码已经完整按该顺序落地。

## Scope Model

推荐在 `object-field` 内部给 `body` 发布对象根编辑上下文。

对作者来说，子字段继续写相对 `name` 即可：

```json
{
  "type": "object-field",
  "name": "address",
  "body": [
    { "type": "input-text", "name": "street" },
    { "type": "input-text", "name": "city" }
  ]
}
```

实现层可以内部把这些子字段映射到当前 object draft 上，但不应把这种实现细节暴露给 schema 作者。

## Layout

`object-field.body` 应允许任意组合式布局：

- 单列
- 多列
- grid
- container 嵌套
- tabs
- 分组 section

也就是说，它不是受限版的键值表，而是一个“对象局部编辑容器”。

## Example

```json
{
  "type": "object-field",
  "name": "profile",
  "body": {
    "type": "container",
    "body": [
      {
        "type": "grid",
        "columns": 2,
        "body": [
          { "type": "input-text", "name": "firstName", "label": "First Name" },
          { "type": "input-text", "name": "lastName", "label": "Last Name" }
        ]
      },
      {
        "type": "input-text",
        "name": "email",
        "label": "Email"
      }
    ]
  }
}
```

## Relationship To Other Controls

- `object-field`：一个字段是对象，内部拆属性编辑
- `detail-field`：一个字段需要摘要 + 展开 surface
- `detail-view`：当前 scope/object 需要查看更多或局部编辑
- `variant-field`：一个字段可能有多种值形态

这些控件可以组合：

- `variant-field` 的某个 variant 可使用 `object-field`
- `detail-field` 的 `content` 可放 `object-field`
- `object-field` 的某个子字段也可再是 `variant-field`

## Related Documents

- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/architecture/variant-field.md`
- `docs/architecture/action-scope-and-imports.md`
