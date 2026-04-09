# Recurse 组件设计

## 1. 组件定位

- `recurse` 是结构递归节点。
- 它用于在当前 `loop` 的词法子树中，用新的集合再次实例化同一套 `loop.body` 模板。
- 它本身没有 UI 壳层，也不是命名模板注册系统。

## 2. 设计判断

- `recurse` 只能出现在某个 `loop.body` 的词法子树内。
- `recurse` 命中最近的 enclosing `loop`。
- `recurse` 默认继承该 loop 的 `itemName`、`indexName`、`keyName`、`keyBy`、`itemData`。
- `recurse` 不引入全局模板注册表或命名模板引用。

## 3. 为什么需要 `recurse`

`loop` 只解决平面重复展开。

当 JSON 模板需要表达：

- 递归遍历嵌套 schema
- 递归渲染树状字段
- 递归展开分层结构

单纯的 `loop` 不够，因为 JSON 不是函数，不能直接“调用自己”。

`recurse` 的目标是：

- 不引入 JSON 自引用
- 不引入命名模板注册表
- 仍然保持结构 DSL 的简洁 authoring

## 4. Flux 中的 renderer/type 定义

- `type: 'recurse'`
- `category: 'layout'`
- 预期 source package: `@nop-chaos/flux-renderers-basic`

## 5. schema 设计

建议正式字段：

```ts
interface RecurseSchema extends BaseSchema {
  type: 'recurse';
  items: SchemaValue;
  itemName?: string;
  indexName?: string;
  keyName?: string;
  itemData?: Record<string, SchemaValue>;
  keyBy?: SchemaValue;
  maxDepth?: number;
}
```

其中：

- `items` 是下一层递归集合
- 其余字段为可选覆盖项
- `maxDepth` 是安全网，不是主语义

## 6. 词法递归规则

`recurse` 的核心规则：

- 它默认复用最近 enclosing `loop` 的 `body` 模板
- 它不是“递归当前任意节点”
- 它也不是“引用某个全局命名模板”

也就是说：

```text
recurse = instantiate nearest loop.body again with new repeated items
```

## 7. Scope 设计

`recurse` 不发明新的 scope 规则。

它的每一层 item scope 应与当前 loop item scope 一致：

- 默认继承 parent lexical scope
- 注入新的 item-local bindings
- 如果声明了覆盖字段，则按覆盖后的 bindings 生效

推荐心智模型：

```text
recurse item scope = parent lexical visibility + { item, index, optional key, ...itemData }
```

## 8. 与 Fragment 的关系

当需要在递归体内部整体应用条件时，应继续使用 `fragment + when`。

例如：

```json
{
  "type": "loop",
  "items": "${schema.properties}",
  "itemName": "field",
  "keyBy": "${field.name}",
  "body": [
    { "type": "text", "text": "${field.title}" },
    {
      "type": "fragment",
      "when": "${field.type === 'object'}",
      "body": {
        "type": "recurse",
        "items": "${field.properties}"
      }
    }
  ]
}
```

## 9. Repeated Identity

`recurse` 必须复用与 `loop` / `table row` 相同的 repeated-instance identity model：

- 每一层递归都会创建新的 repeated instances
- 每一层向 `instancePath` 追加一个 repeated frame
- identity 仍由 `keyBy` / 主键 / index 兜底顺序决定

因此：

- 不需要额外的递归专用 identity 协议
- 不需要新的 locator 模型

## 10. `maxDepth`

`maxDepth` 的定位：

- 防止意外无限递归
- 作为编译/运行时安全网

不应把它理解为：

- 递归主控制手段
- 正常 authoring 必须每次都声明的字段

正常递归终止条件仍然应是：

- `items` 为空
- `when` 不命中

## 11. 为什么不先做命名模板注册表

当前不推荐：

- 全局模板注册
- 模板名字解析
- 模板依赖图管理

原因：

- authoring 心智更重
- 引入新的命名空间与依赖管理问题
- 当前词法 `recurse` 已足够覆盖大部分递归场景

## 12. 与 Tree / json-schema-form 的关系

- `recurse` 是结构原语
- `tree` 是带 UI 的树组件
- `json-schema-form` 是领域 renderer

这三者不应混同。

推荐分层：

- 纯结构递归 -> `loop + recurse`
- 树形交互 UI -> `tree`
- 高层领域封装 -> `json-schema-form`

## 13. 结论

最佳设计是：

- `recurse` 作为词法递归节点
- 只能递归最近 enclosing `loop.body`
- 默认继承 enclosing loop 的绑定规则
- 继续搭配 `fragment + when`
- 不引入命名模板注册表
