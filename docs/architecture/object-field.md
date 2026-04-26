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
- 它与 `detail-field`、`detail-view`、`variant-field` 同属 value-oriented family，但默认是 inline live-edit control，而不是 surface-backed staged owner。
- 它解决的是“一个字段值是对象，内部需要像局部 subform 一样编辑其属性”的问题。
- 本文档描述当前推荐 baseline：`object-field` 不引入独立 confirm/cancel 提交流程。
- 在 `docs/architecture/data-domain-owner.md` 的 owner vocabulary 下，`object-field` 默认是 parent-owned `inherit-owner` projected editor，不是 child data domain。

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

当前 live implementation note:

- `transformInAction` / `transformOutAction` 已接线
- `validateValueAction` 仍不是当前已接线 baseline，不应误读为 object-field 当前会额外跑 owner-level validate pipeline
- 当前 projected `ScopeRef` / `FormRuntime` view 已开始复用共享 helper substrate；但 `object-field` 仍保留 renderer-local working copy + async writeback 的 live behavior，这与本文 target baseline 仍有差距，应由独立 successor plan 处理语义对齐

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
2. 在 `body` 中对相对路径子字段进行 inline live edit
3. 子字段校验继续通过普通 form field / subtree validation 生效
4. 表单 submit 时直接读取当前父表单对象值

关键边界：

- `object-field` 默认没有独立 draft object
- `object-field` 默认没有 owner-level confirm / cancel
- `object-field` 默认不要求 submit-time owner `validateValueAction` / `transformOutAction`
- `object-field` 默认不创建新的独立 owner runtime
- 当前 live implementation 会创建 projected `FormRuntime` / `ScopeRef` view，但这些 view 继续把 registration、validation、writeback 绑定到 parent owner
- 推荐实现是复用父 `FormRuntime` / `ValidationScopeRuntime`，并对 `name` 对应对象根做 owner-root projection

如果某个对象值真的需要“编辑中”和“已确认”两阶段语义，应优先使用 `detail-field` 或其它 surface-backed owner，而不是把 `object-field` 本身升级成 staged submit owner。

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

实现层可以内部把这些子字段映射到当前对象根路径上，但不应把这种实现细节暴露给 schema 作者。

当前更推荐的实现方向不是“局部 draft object”，而是：

1. 子字段名相对对象根
2. 运行时通过 `ownerRootPath = name` 把子字段相对路径 rebasing 到 parent owner 的 owner-local absolute path
3. 继续复用父 form 的 field registration、subtree validation、submit 流程

### Validation And Addressing

`object-field` 的默认模型应与 parent owner validation 保持同一条轴：

- child field state bucket 仍属于 parent owner
- owner-local absolute path 仍是 parent owner 下的 `profile.firstName` 这类路径
- projected child form 只是把 `firstName` 映射到 `profile.firstName`，不是创建新的 owner-qualified identity

因此：

- `object-field` 默认属于 `inherit-owner`
- child subtree validation 仍在 parent owner 上执行
- 如果某个对象编辑场景需要独立 child-owner validation/publish boundary，应显式改用 `detail-field` / `detail-view` 或其它 staged owner

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

- `docs/architecture/data-domain-owner.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/unified-runtime-indexing-and-path-binding.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/architecture/variant-field.md`
- `docs/architecture/action-scope-and-imports.md`
