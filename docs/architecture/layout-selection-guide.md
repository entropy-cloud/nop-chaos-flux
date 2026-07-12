# 布局选型指南

> 本文档汇总 Flux 布局组件的选型决策树、典型 schema 示例和常见误区。
> 各组件的完整设计规范见对应 `docs/components/<name>/design.md`。

## 1. 布局组件全景

### 核心布局（marker-only，无独立交互状态）

| 组件        | Marker          | Regions                            | 核心职责                             |
| ----------- | --------------- | ---------------------------------- | ------------------------------------ |
| `page`      | `nop-page`      | title, header, body, aside, footer | 页面级根壳层，承载 page runtime 边界 |
| `container` | `nop-container` | header, body, footer               | 通用内容壳层，三段式内容组织         |
| `flex`      | `nop-flex`      | body (items)                       | 纯弹性布局原语                       |
| `fragment`  | 无              | body                               | 无 UI 结构分组                       |

### 交互式布局（有独立交互状态或视觉协议）

| 组件       | Marker         | 核心职责                                  |
| ---------- | -------------- | ----------------------------------------- |
| `tabs`     | `nop-tabs`     | 互斥面板切换（valueOwnership）            |
| `grid`     | `nop-grid`     | 二维网格布局（columns + colSpan/rowSpan） |
| `collapse` | `nop-collapse` | 手风琴折叠面板                            |

### 辅助布局（`flux-renderers-layout` 包）

| 组件              | 核心职责                                  |
| ----------------- | ----------------------------------------- |
| `wizard`          | 多步骤流程（step 切换 + commit 生命周期） |
| `button-group`    | 操作按钮组（单选/多选模式）               |
| `dropdown-button` | 分裂按钮 + 下拉菜单                       |
| `steps`           | 轻量进度指示器（纯展示）                  |
| `timeline`        | 事件时间线（纯展示）                      |

## 2. 选型决策树

```
需要页面根节点？ ─────────────────────────────────→ page
  │
  需要表单 owner？ ────────────────────────────────→ form
  │
  需要弹层（对话框/抽屉）？ ───────────────────────→ dialog / drawer
  │
  需要 Tab 面板切换？ ─────────────────────────────→ tabs
  │
  需要手风琴折叠？ ────────────────────────────────→ collapse
  │
  需要二维网格（仪表盘卡片）？ ────────────────────→ grid
  │
  需要多步骤流程？ ────────────────────────────────→ wizard
  │
  需要 header/body/footer 壳层？ ─────────────────→ container
  │
  需要纯布局控制（方向/对齐/间距）？ ─────────────→ flex
  │
  需要无 UI 结构分组（when/data/isolate）？ ──────→ fragment
```

## 3. page vs container vs flex：核心区分

这是最常见的混淆点。三者的本质区别：

| 维度               | `page`                             | `container`                              | `flex`                 |
| ------------------ | ---------------------------------- | ---------------------------------------- | ---------------------- |
| **语义**           | 页面根壳层                         | 通用内容壳层                             | 纯布局原语             |
| **Regions**        | title, header, body, aside, footer | header, body, footer                     | body (items)           |
| **Owner 身份**     | page runtime owner                 | 无 owner 状态                            | 无 owner 状态          |
| **DOM 层级**       | 多层（aside 是 body 兄弟）         | 双层（外层 + body slot）                 | 单层                   |
| **className 挂载** | 外层 `nop-page`                    | 外层 `nop-container`（不影响 body 布局） | 根节点（直接影响布局） |

> **Page 命名注意**：`headerClassName` 样式化标题栏（title + subTitle + remark 区域），而 `header` slot 内容渲染在 `data-slot="page-toolbar"` 区域，由 `toolbarClassName` 样式化。这是历史命名，不要混淆。
> | **布局控制** | aside position + sticky + resizable | direction/wrap/align/gap（作用于 body slot） | direction/wrap/align/justify/alignContent/gap |
> | **响应式** | aside 移动端 Sheet 折叠 | per-breakpoint direction/wrap | per-breakpoint direction/wrap |

### 选型规则

- 需要页面根节点 → `page`
- 需要 header/body/footer 壳层 → `container`
- 需要纯布局控制 → `flex`
- 需要无 UI 结构分组 → `fragment`

### 详细边界

#### page vs container

`page` 是**页面级 shell owner**，承载 page runtime、标题、aside 侧栏和 footer 底栏。它不是 `container` 的放大版。

`container` 是**普通内容壳层**，用于 section 包装、卡片壳、分组容器。页面内的普通 section、卡片包裹、说明区块应使用 `container`，而不是嵌套多个 `page`。

**误用示例**：

```json
// ❌ 错误：在页面内嵌套 page
{ "type": "page", "body": [{ "type": "page", "body": [...] }] }

// ✅ 正确：用 container 包装 section
{ "type": "page", "body": [
  { "type": "container", "header": [...], "body": [...] }
] }
```

#### container vs flex

`container` 是**内容壳层**，className 挂在外层不影响 body 布局。布局由 body slot 上的 semantic prop（direction/gap/align）控制。

`flex` 是**纯布局原语**，className 直接挂根节点，控制整个容器的弹性布局。

**误用示例**：

```json
// ❌ 错误：用 container 做纯行列排列（className 挂错层级）
{ "type": "container", "className": "flex gap-4", "body": [...] }

// ✅ 正确：用 flex 做行列排列
{ "type": "flex", "direction": "row", "gap": "md", "body": [...] }

// ✅ 正确：用 container 的 semantic prop
{ "type": "container", "direction": "row", "gap": "md", "body": [...] }
```

#### flex vs grid

`flex` 是**一维布局**（沿主轴排列），适合行或列。

`grid` 是**二维布局**（行列同时控制），适合仪表盘卡片、等分布局。

**误用示例**：

```json
// ❌ 错误：用 flex 嵌套模拟网格（冗余嵌套）
{
  "type": "flex", "direction": "column", "gap": "md",
  "body": [
    { "type": "flex", "direction": "row", "gap": "md", "body": ["A", "B"] },
    { "type": "flex", "direction": "row", "gap": "md", "body": ["C", "D"] }
  ]
}

// ✅ 正确：用 grid
{
  "type": "grid", "columns": 2, "gap": "md",
  "items": [
    { "body": "A" }, { "body": "B" },
    { "body": "C" }, { "body": "D" }
  ]
}
```

#### tabs vs collapse

`tabs` 是**互斥面板切换**（同一时刻只显示一个面板），适合 Tab 导航。

`collapse` 是**可折叠面板组**（可同时展开多个），适合 FAQ、可折叠 section。

**误用示例**：

```json
// ❌ 错误：用 tabs 做可折叠内容组（语义错误）
{ "type": "tabs", "items": [
  { "title": "Section 1", "body": "..." },
  { "title": "Section 2", "body": "..." }
] }

// ✅ 正确：用 collapse
{ "type": "collapse", "items": [
  { "title": "Section 1", "body": "..." },
  { "title": "Section 2", "body": "..." }
] }
```

## 4. 典型 Schema 示例

### 4.1 标准 ERP 页面（带侧栏）

```json
{
  "type": "page",
  "title": "用户管理",
  "asidePosition": "left",
  "asideResizable": true,
  "asideSticky": true,
  "aside": [
    { "type": "tree", "source": "/r/departments", "onSelect": { "action": "loadData", "args": { "deptId": "${event.value.id}" } } }
  ],
  "header": [
    { "type": "button", "label": "新建用户", "onClick": { "action": "openDialog", "args": { "schema": { "type": "form", "body": [...] } } } }
  ],
  "body": [
    { "type": "table", "source": "/r/users?deptId=${scope.deptId}", "columns": [...] }
  ]
}
```

### 4.2 三段式内容壳层

```json
{
  "type": "container",
  "header": [
    { "type": "text", "text": "用户列表" }
  ],
  "body": [
    { "type": "table", "columns": [...] }
  ],
  "footer": [
    { "type": "flex", "justify": "end", "body": [
      { "type": "button", "label": "导出" }
    ]}
  ]
}
```

### 4.3 纯行列排列

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

### 4.4 二维网格（仪表盘）

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

### 4.5 响应式布局（移动端纵列、桌面行）

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

### 4.6 移动端固定底栏（Tabbar）

```json
{
  "type": "page",
  "footerClassName": "fixed bottom-0 inset-x-0 nop-safe-bottom bg-background border-t",
  "footer": {
    "type": "flex",
    "justify": "around",
    "items": [
      { "type": "button", "variant": "ghost", "label": "首页", "icon": "home" },
      { "type": "button", "variant": "ghost", "label": "分类", "icon": "grid" }
    ]
  },
  "body": { "type": "container", "body": [...] }
}
```

## 5. 常见误区

| 误区                                   | 正确做法                                             |
| -------------------------------------- | ---------------------------------------------------- |
| 页面内嵌套多个 `page`                  | 用 `container` 包装 section                          |
| 用 `container` 的 `className` 控制布局 | 用 `bodyClassName` 或 semantic prop（direction/gap） |
| 用 `flex` 做三段式内容组织             | 用 `container` 的 header/body/footer                 |
| 用 `tabs` 做可折叠内容组               | 用 `collapse`                                        |
| 用 `flex` 嵌套模拟网格                 | 用 `grid`                                            |
| 用 `page` 包装普通内容分组             | 用 `container` 或 `flex`                             |
| 在 layout renderer 上硬编码间距类      | 通过 schema 的 className/gap 控制                    |
