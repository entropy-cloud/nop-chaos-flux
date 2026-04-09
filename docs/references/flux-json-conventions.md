# AMIS JSON 约定

本文档定义 flux 项目中 JSON Schema 的通用约定。

## 1. 表达式语法

### 1.1 统一使用 `${xxx}`，不需要 `xxxOn` 后缀

```json
{
  "type": "button",
  "label": "撤销",
  "disabled": "${!canUndo}",      // ✅ 推荐
  "visible": "${role === 'admin'}" // ✅ 推荐
}
```

**不推荐**：
```json
{
  "disabledOn": "${!canUndo}",  // ❌ 不需要 On 后缀
  "hiddenOn": "${isLocked}"     // ❌ 不需要 On 后缀
}
```

### 1.2 表达式中可用的运算符

- 比较运算：`===`, `!==`, `>`, `<`, `>=`, `<=`
- 逻辑运算：`&&`, `||`, `!`
- 三元表达式：`${condition ? 'yes' : 'no'}`
- 属性访问：`${obj.prop}`, `${arr[0]}`

### 1.3 保留的 `$` 绑定

`$` 前缀保留给 runtime 注入的特殊只读绑定与导入库别名。

推荐规则：

- 当前表单语义状态使用 `$form`：`${$form.submitting}`
- 导入库别名使用 `$alias`：`${$dict.getLabel(code)}`
- 普通业务数据继续使用普通路径：`${user.name}`，不要写成 `${$user.name}`
- `$store` 不是公开 authoring contract，不应用于 schema 表达式

示例：

```json
{
  "type": "button",
  "label": "提交",
  "disabled": "${$form.submitting}"
}
```

## 2. Action 与 Source 语法

### 2.1 Action Selector 命名

推荐规则：

- 内置 action 使用 camelCase：`ajax`、`setValue`、`refreshSource`、`openDialog`、`showToast`
- 组件实例 action 使用 `component:<method>`：`component:submit`
- 导入库/宿主 action 使用 `namespace:method`：`designer:addNode`、`dict:getCountryOptions`

### 2.2 简单 Action

不带参数的 action 可以直接写：

```json
{
  "onClick": { "action": "designer:save" }
}
```

### 2.3 带参数的 Action

```json
{
  "onClick": {
    "action": "designer:addNode",
    "args": {
      "nodeType": "task",
      "position": { "x": 100, "y": 100 }
    }
  }
}
```

### 2.4 Action 链

```json
{
  "onClick": {
    "action": "closeDialog",
    "then": { "action": "designer:save" }
  }
}
```

### 2.5 事件入口只接收单个根 Action

推荐：事件字段使用一个根 `ActionSchema` 对象，而不是直接传数组。

```json
{
  "onClick": {
    "action": "ajax",
    "api": {
      "url": "/api/users/save",
      "method": "post"
    },
    "then": {
      "action": "showToast",
      "args": {
        "level": "success",
        "message": "保存成功"
      }
    }
  }
}
```

### 2.6 Source 值

字段值除了静态值和 `${expr}` 外，还可以使用内联的 `type: 'source'` carrier：

```json
{
  "options": {
    "type": "source",
    "action": "ajax",
    "api": {
      "url": "/api/countries"
    },
    "control": {
      "dedup": "cancel-previous"
    }
  }
}
```

或者调用导入库：

```json
{
  "options": {
    "type": "source",
    "action": "dict:getCountryOptions",
    "args": {
      "region": "${form.region}"
    }
  }
}
```

## 3. 样式属性命名

### 3.1 `variant` vs `level`

| 组件类型 | 属性 | 值 | 用途 |
|----------|------|-----|------|
| **Button** | `variant` | `'default' \| 'primary' \| 'danger'` | 按钮样式变体 |
| **Badge** | `level` | `'info' \| 'success' \| 'warning' \| 'danger'` | 状态级别 |

**示例**：

```json
// Button
{
  "type": "button",
  "label": "保存",
  "variant": "primary"
}

// Badge
{
  "type": "badge",
  "text": "${isDirty ? '未保存' : '已保存'}",
  "level": "${isDirty ? 'warning' : 'success'}"
}
```

### 3.2 为什么区分？

- `variant` 表示**视觉变体**（同一组件的不同外观风格）
- `level` 表示**语义级别**（信息的重要性等级）

## 4. Icon 命名

使用 Lucide Icons，配置中采用 **kebab-case**：

```json
{
  "icon": "rotate-ccw",    // ✅ 推荐
  "icon": "git-branch",    // ✅ 推荐
  "icon": "grid-3x3"       // ✅ 推荐
}
```

运行时转换为 PascalCase：`'rotate-ccw'` → `'RotateCcw'`

## 5. JSON Key 命名

**统一使用 camelCase**：

```json
{
  "allowSelfLoop": false,     // ✅ 推荐
  "gridSize": 16,             // ✅ 推荐
  "snapToGrid": true,         // ✅ 推荐
  "allow-self-loop": false,   // ❌ 避免
  "grid_size": 16             // ❌ 避免
}
```

### 5.1 命名空间扩展属性

当某个属性属于扩展方或宿主方，而不是 Flux 核心裸字段时，使用 `namespace:suffix` 形式的 key：

```json
{
  "type": "page",
  "xui:imports": [
    { "from": "demo-lib", "as": "demo" }
  ],
  "acme:layout": {
    "density": "compact"
  }
}
```

约定：

- 非命名空间字段继续使用 camelCase，例如 `className`、`visible`、`validateOn`。
- 命名空间字段用于扩展负载，不要把本来属于核心 contract 的普通字段伪装成 `vendor:*` 来绕过校验。
- schema 文件 validator 应支持 `delegate-or-ignore` 策略：如果存在对应 namespace validator，则委托该扩展校验；否则忽略该 key 及其整个子树，不参与核心校验。
- 对于已经进入 Flux 主契约的核心 namespace（当前最明确的是 `xui:*`），标准 validator bundle 应内置对应 namespace validator，而不是把它们一律当成“未知扩展”跳过。
- 忽略命名空间字段不等于放宽普通字段校验；像 `visibel`、`layotu` 这类非命名空间拼写错误至少应告警，在 CI 或文档示例校验这类严格场景中应视为错误。
- 即使采用“编译期集成 diagnostics”方案，也不应把未知裸字段自动并入正常 compiled props；如需透传，默认只允许 namespaced 扩展字段通过单独 extension 通道保留。

推荐把扩展方自己的结构都收敛在对应命名空间 key 下面，避免把一组扩展字段平铺到顶层污染核心命名空间。

## 6. Config 与 Data 分离

复杂组件的配置和实例数据分离：

```json
{
  "type": "designer-page",
  "config": {
    "nodeTypes": [...],  // 类型定义（很少变）
    "edgeTypes": [...],
    "rules": {...}
  },
  "document": {
    "nodes": [...],      // 实例数据（频繁变）
    "edges": [...],
    "viewport": {...}
  }
}
```

| | config | document |
|---|---|---|
| 来源 | 开发者定义 | 用户编辑 |
| 变化频率 | 很少 | 频繁 |
| 持久化 | 和代码一起 | 存数据库 |

## 7. Region 配置

工具栏、面板等可通过两种方式配置：

### 方式一：预定义类型（推荐用于标准按钮）

```json
{
  "toolbar": {
    "items": [
      { "type": "back" },
      { "type": "title", "tpl": "${doc.name}" },
      { "type": "badge", "level": "success", "text": "已保存" },
      { "type": "divider" },
      { "type": "button", "action": "designer:save", "icon": "save", "variant": "primary" }
    ]
  }
}
```

### 方式二：完整 AMIS Schema（自定义场景）

```json
{
  "toolbar": {
    "type": "flex",
    "items": [
      { "type": "button", "label": "自定义操作", "onClick": { "action": "custom:action" } }
    ]
  }
}
```

## 8. 默认值策略

用户不配置时使用默认值：

```ts
// 代码中
const normalized = {
  toolbar: config.toolbar ?? defaultToolbar,
  shortcuts: {
    undo: ['Ctrl+Z', 'Cmd+Z'],
    ...config.shortcuts  // 用户配置覆盖默认
  }
}
```

## 9. 文件引用

示例和完整配置放在外部文件：

```
docs/examples/workflow-designer/
├── config.json     # DesignerConfig
└── document.json   # GraphDocument
```

文档中用文字说明引用：
```json
{
  "document": { "参见": "docs/examples/workflow-designer/document.json" }
}
```

## 10. Field Chrome Control

`frameWrap` controls per-instance FieldFrame behavior for renderers that already declare `wrap: true`.

```json
{
  "type": "input-text",
  "name": "title",
  "label": "Title",
  "frameWrap": "group"
}
```

Allowed values:

- unset: follow the renderer definition default
- `false` or `'none'`: skip FieldFrame for this instance
- `true` or `'label'`: use the default label wrapper
- `'group'`: use grouped `<fieldset>/<legend>` layout

`frameWrap` does not force wrapping onto renderers that registered with `wrap: false`.
