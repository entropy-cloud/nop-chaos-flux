# 布局容器选型

> Flux 有 4 个核心布局 renderer + 3 个交互式布局 renderer。本文档帮助你快速选型。

## 1. 布局组件全景

### 核心布局（marker-only，无独立交互状态）

| 组件        | Marker          | Regions                            | 核心职责                             |
| ----------- | --------------- | ---------------------------------- | ------------------------------------ |
| `page`      | `nop-page`      | title, header, body, aside, footer | 页面级根壳层，承载 page runtime 边界 |
| `container` | `nop-container` | header, body, footer               | 通用内容壳层，三段式内容组织         |
| `flex`      | `nop-flex`      | body (items)                       | 纯弹性布局原语                       |
| `fragment`  | 无              | body                               | 无 UI 结构分组（when/data/isolate）  |

### 交互式布局

| 组件       | Marker         | 核心职责                                  |
| ---------- | -------------- | ----------------------------------------- |
| `tabs`     | `nop-tabs`     | 互斥面板切换（valueOwnership）            |
| `grid`     | `nop-grid`     | 二维网格布局（columns + colSpan/rowSpan） |
| `collapse` | `nop-collapse` | 手风琴折叠面板                            |

## 2. 选型决策树

```
需要页面根节点？ ─────────────────────────────────→ page
  │
  需要 header/body/footer 壳层？ ─────────────────→ container
  │
  需要纯布局控制（方向/对齐/间距）？ ─────────────→ flex
  │
  需要无 UI 结构分组（when/data/isolate）？ ──────→ fragment
  │
  需要 Tab 面板切换？ ─────────────────────────────→ tabs
  │
  需要二维网格（仪表盘卡片）？ ────────────────────→ grid
  │
  需要手风琴折叠？ ────────────────────────────────→ collapse
```

## 3. page vs container vs flex：核心区分

| 维度               | `page`                              | `container`                                  | `flex`                                        |
| ------------------ | ----------------------------------- | -------------------------------------------- | --------------------------------------------- |
| **语义**           | 页面根壳层                          | 通用内容壳层                                 | 纯布局原语                                    |
| **Regions**        | title, header, body, aside, footer  | header, body, footer                         | body (items)                                  |
| **Owner 身份**     | page runtime owner                  | 无 owner 状态                                | 无 owner 状态                                 |
| **DOM 层级**       | 多层（aside 是 body 兄弟）          | 双层（外层 + body slot）                     | 单层                                          |
| **className 挂载** | 外层 `nop-page`                     | 外层 `nop-container`（不影响 body 布局）     | 根节点（直接影响布局）                        |
| **布局控制**       | aside position + sticky + resizable | direction/wrap/align/gap（作用于 body slot） | direction/wrap/align/justify/alignContent/gap |

### 选型规则

- 需要页面根节点 → `page`
- 需要 header/body/footer 壳层 → `container`
- 需要纯布局控制 → `flex`
- 需要无 UI 结构分组 → `fragment`

## 4. Container 的双层 DOM（重要）

```html
<div class="nop-container [schema-className]">
  ← className 挂在这里，不影响子节点排列
  <div data-slot="container-body" class="[flex 类来自 direction/wrap/align/gap] [bodyClassName]">
    ← 这才是实际布局层 ...children...
  </div>
</div>
```

- `className` → 外层 `nop-container`，不影响 body 布局
- `bodyClassName` → 内层 `data-slot="container-body"`（仅 container 有）
- semantic props（`direction`/`wrap`/`gap`/`align`）→ 内层 body div

## 5. 典型 Schema 示例

### 5.1 标准页面（带侧栏）

```json
{
  "type": "page",
  "title": "用户管理",
  "asidePosition": "left",
  "asideResizable": true,
  "asideSticky": true,
  "aside": [{ "type": "tree", "source": "/r/departments" }],
  "header": [{ "type": "button", "label": "新建用户" }],
  "body": [{ "type": "table", "source": "/r/users" }]
}
```

### 5.2 三段式内容壳层

```json
{
  "type": "container",
  "header": [{ "type": "text", "text": "用户列表" }],
  "body": [{ "type": "table", "columns": [...] }],
  "footer": [{ "type": "flex", "justify": "end", "body": [
    { "type": "button", "label": "导出" }
  ]}]
}
```

### 5.3 纯行列排列

```json
{
  "type": "flex",
  "direction": "row",
  "gap": "md",
  "align": "center",
  "body": [
    { "type": "input", "placeholder": "搜索..." },
    { "type": "button", "label": "查询" }
  ]
}
```

### 5.4 二维网格（仪表盘）

```json
{
  "type": "grid",
  "columns": 3,
  "gap": "md",
  "items": [
    { "body": { "type": "card", "title": "待审批", "body": "12 项" } },
    { "body": { "type": "card", "title": "进行中", "body": "8 项" } },
    { "body": { "type": "card", "title": "已完成", "body": "156 项" } }
  ]
}
```

### 5.5 响应式布局

```json
{
  "type": "flex",
  "direction": "column",
  "responsiveDirection": { "md": "row" },
  "gap": "md",
  "body": [
    { "type": "container", "className": "flex-1", "body": "主内容" },
    { "type": "container", "className": "flex-1", "body": "侧边信息" }
  ]
}
```

## 6. 常见误区

| 误区                                   | 正确做法                             |
| -------------------------------------- | ------------------------------------ |
| 页面内嵌套多个 `page`                  | 用 `container` 包装 section          |
| 用 `container` 的 `className` 控制布局 | 用 `bodyClassName` 或 semantic prop  |
| 用 `flex` 做三段式内容组织             | 用 `container` 的 header/body/footer |
| 用 `tabs` 做可折叠内容组               | 用 `collapse`                        |
| 用 `flex` 嵌套模拟网格                 | 用 `grid`                            |
| 在 layout renderer 上硬编码间距类      | 通过 schema 的 className/gap 控制    |

## 7. 与其他组件的边界

| 需求           | 用这个              | 不要用      |
| -------------- | ------------------- | ----------- |
| 页面根节点     | `page`              | `container` |
| 表单 owner     | `form`              | `container` |
| 弹层           | `dialog` / `drawer` | `page`      |
| Tab 切换       | `tabs`              | `collapse`  |
| 可折叠面板     | `collapse`          | `tabs`      |
| 表单字段分组   | `fieldset`          | `container` |
| 无 UI 结构分组 | `fragment`          | `container` |
