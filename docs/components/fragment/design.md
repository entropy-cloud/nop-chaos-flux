# Fragment 组件设计

## 1. 组件定位

- `fragment` 是无 UI 的结构分组节点。
- 它用于把一组子节点作为一个结构单元处理，例如统一挂载 `when`、`data`、`isolate`。
- 它不承担任何视觉壳层、布局包装或样式语义。

## 2. 为什么需要 `fragment`

当前 DSL 已经有 `when`，但当作者需要把多个节点作为一个整体应用结构条件时，需要一个无 UI 的分组载体。

这个载体不应使用：

- `container`
- `flex`
- 新的 `if` 组件

原因：

- `container` / `flex` 都有可视或布局语义
- `if` 会与现有 `when` 形成平行的条件 DSL

因此最佳方向是：

- 保留 `when` 作为条件机制
- 提供 `fragment` 作为无 UI 的结构分组节点

## 3. Flux 中的 renderer/type 定义

- `type: 'fragment'`
- `category: 'layout'`
- 预期 source package: `@nop-chaos/flux-renderers-basic`
- 主要 region: `body`

## 4. schema 设计

建议正式字段：

```ts
interface FragmentSchema extends BaseSchema {
  type: 'fragment';
  body?: SchemaInput;
  data?: Record<string, SchemaValue>;
  isolate?: boolean;
}
```

其中：

- `when` 继续来自 `BaseSchema`
- `data` 用于当前 fragment own scope patch
- `isolate` 控制 fragment child scope 是否切断父级词法继承

## 5. 字段分类

- `body`: `region`
- `data`: `value`
- `isolate`: `value`

## 6. 结构语义

`fragment` 的职责只有三个：

1. 结构分组
2. 局部 scope patch
3. 统一条件/边界控制

它不负责：

- 产生固定 DOM 壳层
- 产生 marker class
- 表达布局方向、gap、align 等视觉语义

## 7. Scope 设计

默认规则：

- `fragment` 默认继承 parent lexical scope
- 若声明 `data`，则在当前 child scope own patch 中注入
- 若声明 `isolate: true`，则变成 own-scope-only

推荐心智模型：

```text
fragment scope = parent lexical visibility + optional fragment.data
```

如果 `isolate: true`：

```text
fragment scope = own patch only
```

## 8. `when` 的推荐用法

当需要让一组节点整体参与条件控制时，推荐：

```json
{
  "type": "fragment",
  "when": "${visible}",
  "body": [
    { "type": "text", "text": "A" },
    { "type": "button", "label": "B" }
  ]
}
```

而不是：

- 为此引入 `type: 'if'`
- 使用 `container` 伪装成无 UI 分组

## 9. 与 Container 的边界

- `fragment`：无 UI、无布局、无 marker、只负责结构分组
- `container`：有容器语义和最小壳层 marker，适合布局/包装

如果作者需要的是：

- “把几项东西包在一起并统一加条件” -> `fragment`
- “把几项东西放在一个通用容器壳层里” -> `container`

## 10. 与 Loop 的关系

`fragment` 是 `loop` 的天然搭档。

例如当 loop body 内部需要给一组节点整体挂 `when` 时，应优先用：

```json
{
  "type": "fragment",
  "when": "${item.visible}",
  "body": [
    { "type": "text", "text": "${item.name}" },
    { "type": "button", "label": "Edit" }
  ]
}
```

## 11. DOM And Marker Rule

`fragment` 不应要求固定的可视 DOM 包装节点。

推荐方向：

- 如果宿主/React 需要承接多个 children，可使用 fragment-like render output
- 不给 `fragment` 分配 `nop-fragment` 这类视觉 marker 作为默认基线

如果未来调试/检查需要结构标识，应优先通过 locator / inspect 体系，而不是强迫 fragment 生成新的视觉 DOM 壳层。

## 12. 结论

最佳设计是：

- 不引入 `if` 组件
- 保持 `when` 作为条件机制
- 增加 `fragment` 作为无 UI 分组节点
- `fragment` 负责结构分组、`data`、`isolate`
- `container` 继续保留可视/布局壳层语义
