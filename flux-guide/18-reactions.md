# 联动与响应式

> 本文说明 Flux 的数据联动机制：表达式如何自动触发重新求值、`reaction` 节点如何工作、依赖如何追踪、变更如何传播。

---

## 联动的三种形态

Flux 中数据联动有三种主要形态，适用场景不同：

| 形态                         | 声明位置                     | 适用场景                   |
| ---------------------------- | ---------------------------- | -------------------------- |
| 表达式字段 (`${expr}`)       | 任意 Schema 字段             | 动态值、条件显隐、样式绑定 |
| `<reaction>` 节点            | 结构节点 `type: "reaction"`  | 监听值变化 → 触发动作      |
| `data-source` 的 `dependsOn` | `data-source` / `loadAction` | 依赖变化 → 重跑请求        |

---

## 1. 表达式字段 — 最基础的联动

Schema 中任何 `${expr}` 表达式都是响应式的。当表达式引用的 scope 变量变化时，该字段自动重新求值。

```jsonc
{
  "type": "input-text",
  "name": "price",
  "label": "单价"
},
{
  "type": "input-number",
  "name": "quantity",
  "label": "数量"
},
{
  "type": "text",
  "label": "总价",
  "text": "${price * quantity}"  // price 或 quantity 变化时自动更新
}
```

**无需额外声明**。编译器会自动追踪表达式引用了哪些 scope 变量，运行时只在这些变量变化时才重新求值。

### 条件显隐

```jsonc
{
  "type": "input-text",
  "name": "adminCode",
  "label": "管理员代码",
  "visible": "${role === 'admin'}"
},
{
  "type": "fragment",
  "when": "${showAdvanced}",
  "body": [
    { "type": "input-text", "name": "advancedConfig", "label": "高级配置" }
  ]
}
```

`when` vs `visible` 的区别：

| 字段      | 可用范围                                                       | 语义           |
| --------- | -------------------------------------------------------------- | -------------- |
| `when`    | **所有节点**（包括 reaction、fragment、keyboard 等非视觉节点） | 通用条件激活   |
| `visible` | **仅视觉控件**                                                 | 偏"可见性"语义 |

当前实现中两者行为一致：为假时节点不挂载（`return null`）。选择哪个主要看语义偏好——非视觉节点用 `when`，视觉控件两者皆可。

其他条件字段：`hidden`（visible 的反义）、`disabled`（禁用交互）、`readOnly`（只读）。

---

## 2. `<reaction>` 节点 — 响应式动作触发

`<reaction>` 是一个不可见的结构节点（渲染 null），用于监听 scope 值变化并触发动作。

### 基础用法

```jsonc
{
  "type": "reaction",
  "watch": "${form.total}",
  "when": "${form.total > 1000}",
  "actions": {
    "action": "showToast",
    "args": { "level": "warning", "message": "金额超过 1000" },
  },
}
```

当 `form.total` 变化时：

1. 求值 `watch` 得到新值
2. 如果 `when` 存在且为 `false`，跳过
3. 如果新值与上次相同（`Object.is` 比较），跳过
4. 执行 `actions`

### 完整字段

| 字段        | 类型                 | 说明                                                                   |
| ----------- | -------------------- | ---------------------------------------------------------------------- |
| `watch`     | `string \| string[]` | 必填。监听的表达式，值变化时触发                                       |
| `when`      | `string`             | 可选。守卫表达式，接收 `{ value, prev, changed, changedPaths, scope }` |
| `actions`   | `ActionSchema`       | 必填。触发时执行的动作                                                 |
| `dependsOn` | `string[]`           | 可选。显式声明依赖的 scope 根路径（覆盖自动追踪）                      |
| `immediate` | `boolean`            | 可选。挂载时立即触发一次                                               |
| `debounce`  | `number`             | 可选。防抖延迟（毫秒）                                                 |
| `once`      | `boolean`            | 可选。触发一次后自动销毁                                               |

### `when` 守卫中的绑定变量

`when` 表达式可以引用以下特殊变量：

```
${value}          → watch 的当前值
${prev}           → watch 的上一次值
${changed}        → 值是否真正变化（boolean）
${changedPaths}   → 触发变更的 scope 路径数组
${scope}          → 当前 scope 引用
```

```jsonc
{
  "type": "reaction",
  "watch": "${selectedUser}",
  "when": "${changed && value !== null}",
  "actions": {
    "action": "ajax",
    "args": { "url": "/api/user/detail", "data": { "id": "${value.id}" } },
  },
}
```

### 多值监听

`watch` 可以是数组，监听多个值：

```jsonc
{
  "type": "reaction",
  "watch": ["${filters.category}", "${filters.status}"],
  "actions": { "action": "refreshSource", "targetId": "myTable" },
}
```

任一值变化即触发。

---

## 3. `data-source` 联动 — 依赖驱动的数据加载

`data-source` 节点通过 `dependsOn` 声明依赖，依赖变化时自动重跑请求。

```jsonc
{
  "type": "data-source",
  "name": "cityList",
  "dependsOn": ["provinceId"], // provinceId 变化即重跑
  "sendOn": "provinceId", // 直到有值才发请求
  "action": "ajax",
  "args": { "url": "/api/cities", "data": { "provinceId": "${provinceId}" } },
}
```

详细用法见 `design-patterns/data-source.md`。这里补充联动相关的要点：

### `dependsOn` vs `sendOn`

| 字段        | 作用                                    | 类比                     |
| ----------- | --------------------------------------- | ------------------------ |
| `dependsOn` | 列出监听的 scope 根路径，任一变化即重跑 | "什么时候重新执行"       |
| `sendOn`    | 布尔表达式，求值真才真正发请求          | "执行了但是否真正发请求" |

```jsonc
// 典型级联：上级选择变化 → 重跑，但直到有值才真正请求
{
  "dependsOn": ["orderId"],
  "sendOn": "orderId",
  "action": "ajax",
  "args": { "url": "/api/order/detail", "data": { "id": "${orderId}" } },
}
```

### 挂载即触发一次（mount-marker）

无天然依赖、只想挂载时拉一次数据，用私有标记：

```jsonc
{
  "dependsOn": ["__init_load__"], // 永远不会被写入，仅挂载时触发一次
  "action": "ajax",
  "args": { "url": "/api/initial-data" },
}
```

---

## 4. 内部机制 — 依赖如何追踪

### 两层依赖模型

Flux 的依赖追踪分两层：

```
第一层：显式声明（dependsOn）→ 声明时优先使用
第二层：运行时 Proxy 收集    → 未声明时的回退方案
```

**显式声明**（推荐）：在 `data-source` 的 `dependsOn` 或 `reaction` 的 `dependsOn` 中列出依赖的 scope 根路径。这是权威来源。

**运行时收集**（回退）：如果未声明 `dependsOn`，表达式求值时通过 Proxy 自动收集读取了哪些 scope 变量。

### 根级追踪

依赖追踪的单位是**词法根**，不是深层路径：

```
scope.user.name     → 依赖根: user
scope.filters.status → 依赖根: filters
scope.row.total     → 依赖根: row
```

这意味着：

- 修改 `scope.user.name` 会让依赖 `user` 的所有表达式重新求值
- 但不会影响依赖 `order` 的表达式

### 变更匹配

当 scope 值变化时，系统通过 `scopeChangeHitsDependencies` 判断是否命中某表达式的依赖：

```
变更路径: user.name → 归一化为: user
依赖集:   [user, filters]
命中?     user ∈ [user, filters] → 是 → 触发重新求值
```

---

## 5. 内部机制 — 变更传播

### Scope 树

```
Page Scope { data: {x: 1} }
  ├── Form Scope { formData: {} }      ← 继承 Page
  │   ├── Input Scope                  ← 继承 Form
  │   └── Reaction Scope               ← 继承 Form
  └── Table Scope { tableData: [] }    ← 继承 Page
```

子 scope 自动继承父 scope 的数据。写入父 scope 的变更向下传播到所有子 scope 的订阅者。

### 微任务批量

多次 scope 变更在同一个事件循环 tick 内会被合并：

```
tick 内: scope.update("a", 1) + scope.update("b", 2)
→ 合并为一次 reaction 触发，而不是两次
```

这避免了连锁更新导致的中间状态闪烁。

### 级联深度限制

为防止无限循环（A → B → A → ...），系统限制了级联深度：

- 单个 reaction 最大级联深度：100
- 全局最大级联深度：200

超过限制会抛出错误并在控制台输出警告。

---

## 6. 内部机制 — React 集成

### NodeRenderer 的订阅

每个 `NodeRenderer` 在渲染时收集依赖，订阅 scope 变更。只有当变更路径命中该节点的依赖集时，才重新解析 props 和 meta。

```
静态节点（无表达式）→ 零订阅，零开销
动态节点           → 按依赖集选择性订阅
通配符访问         → 保守失效（任何变更都触发）
```

### Reaction 节点的 React 集成

`<reaction>` 节点渲染 null，但在 `useLayoutEffect` 中注册 reaction：

```
挂载 → 注册 reaction（订阅 scope + 设置 watch）
卸载 → 取消订阅 + 释放资源
```

`kind: 'reaction'` 的渲染器字段走另一条路径：通过 `ReactionHandleProxy` 包装，支持缓冲激活前的调用和 StrictMode 安全的重新挂载。

---

## 7. 常见模式

### 模式 1：表单联动

```jsonc
{
  "type": "page",
  "body": [
    {
      "type": "select",
      "name": "country",
      "label": "国家",
      "options": "${countryList}",
    },
    {
      "type": "select",
      "name": "city",
      "label": "城市",
      "options": "${cityList}",
      "visible": "${country !== ''}",
    },
    {
      "type": "data-source",
      "name": "cityList",
      "dependsOn": ["country"],
      "sendOn": "country",
      "action": "ajax",
      "args": { "url": "/api/cities", "data": { "country": "${country}" } },
    },
  ],
}
```

### 模式 2：条件提示

```jsonc
{
  "type": "reaction",
  "watch": "${form.stock}",
  "when": "${value < 10 && changed}",
  "actions": {
    "action": "showToast",
    "args": { "level": "warning", "message": "库存不足 10 件" },
  },
}
```

### 模式 3：自动计算 + 提交

```jsonc
[
  { "type": "input-number", "name": "price", "label": "单价" },
  { "type": "input-number", "name": "quantity", "label": "数量" },
  { "type": "text", "text": "小计: ${price * quantity}" },
  {
    "type": "reaction",
    "watch": "${price * quantity}",
    "when": "${changed}",
    "actions": {
      "action": "setValue",
      "args": { "path": "subtotal", "value": "${value}" },
    },
  },
]
```

### 模式 4：挂载加载

```jsonc
{
  "type": "crud",
  "loadAction": {
    "action": "ajax",
    "dependsOn": ["__init__"],
    "args": { "url": "/api/list" },
  },
}
```

---

## 8. 性能特征

| 优化          | 说明                                                              |
| ------------- | ----------------------------------------------------------------- |
| 静态快速路径  | 无表达式的节点零订阅、零开销                                      |
| 根级追踪      | 只追踪词法根（`user`），不追踪深层路径（`user.name`），依赖集更小 |
| 选择性失效    | NodeRenderer 只在变更路径命中依赖集时才重新解析                   |
| 微任务批量    | 同 tick 多次变更合并为一次 reaction 触发                          |
| ReadView 缓存 | `readVisible()` 缓存上次可见视图，避免重复计算                    |
| 级联深度限制  | 防无限循环（单反应 100，全局 200）                                |

---

## 9. 已知限制

1. **未声明依赖时的保守行为**：如果 `dependencies` 未收集到（`undefined`），任何变更都会触发重新求值（保守策略）。显式声明 `dependsOn` 可避免此问题。

2. **`kind: 'reaction'` 的 v1 限制**：渲染器字段的 reaction 不支持 `immediate`、`debounce`、`once`，这些仅在独立 `<reaction>` 节点上可用。

3. **验证使用独立依赖系统**：表单验证的依赖追踪（编译时显式提取）与 scope 依赖追踪（运行时 Proxy 收享）是两套独立系统，互不影响。

4. **集合行级作用域**：table 已支持行级作用域翻译（修改一行不影响其他行），但 loop/list/tree 等通用集合尚未统一此能力。

---

## 深入阅读

- 依赖追踪架构设计：`docs/architecture/dependency-tracking.md`（632 行，完整技术细节）
- 前端编程模型：`docs/architecture/frontend-programming-model.md`
- 数据源设计：`docs/architecture/api-data-source.md`
- 表单验证：`docs/architecture/form-validation.md`
- `design-patterns/data-source.md` — 数据源联动模式
- `design-patterns/conditional.md` — 条件显隐模式
- `design-patterns/cascading-select.md` — 级联选择模式
