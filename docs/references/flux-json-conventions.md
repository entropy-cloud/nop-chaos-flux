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

## 2. Action 语法

### 2.1 简单 Action

不带参数的 action 可以直接写：

```json
{
  "onClick": { "action": "designer:save" }
}
```

### 2.2 带参数的 Action

```json
{
  "onClick": {
    "action": "designer:addNode",
    "nodeType": "task",
    "position": { "x": 100, "y": 100 }
  }
}
```

### 2.3 Action 链

```json
{
  "onClick": {
    "action": "dialog:close",
    "then": { "action": "designer:save" }
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
