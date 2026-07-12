# 布局组件分析报告

> 调研日期：2026-07-13
> 范围：amis-react19 参考实现 vs nop-chaos-flux 当前实现，布局组件分工与设计缺口

## 1. 结论先行

**你的问题答案：amis-react19 的 aside 支持（含右侧、拖拽分隔）已经在 flux 中完整实现。** 当前设计已覆盖：header、footer（上下区域）、aside left/right（左右区域）、aside 拖拽分隔。不需要新增组件，也不需要改架构。

以下是详细调研结果。

---

## 2. amis-react19 Page 布局结构 vs Flux 实现对照

### amis Page.tsx 渲染的 DOM 结构

```
<div class="Page Page--withSidebar Page--leftAside">
  ├── <aside class="Page-aside">              ← aside region
  │     ├── render('aside')
  │     └── <div class="Page-asideResizor">   ← 拖拽手柄
  │
  └── <div class="Page-content">
        └── <div class="Page-main">
              ├── <div class="Page-headerRow"> ← 标题行
              │     ├── <div class="Page-header">    ← title + subTitle + remark
              │     └── <div class="Page-toolbar">   ← toolbar 区域
              │
              └── <div class="Page-body">     ← body region
```

### Flux Page 渲染的 DOM 结构

```html
<section class="nop-page">
  ├──
  <header data-slot="page-header">
    ← title + subTitle + remark + aside-toggle(mobile) ├──
    <div data-slot="page-toolbar">
      ← header region (toolbar) ├──
      <aside data-slot="page-aside">
        ← aside (left 时在 body 前) │ ├── aside 内容 │ └──
        <div data-slot="page-aside-resize-handle">
          ← 拖拽手柄 ├──
          <div data-slot="page-body">
            ← body region ├──
            <aside data-slot="page-aside">
              ← aside (right 时在 body 后) └──
              <footer data-slot="page-footer">← footer region</footer>
            </aside>
          </div>
        </div>
      </aside>
    </div>
  </header>
</section>
```

### 关键差异分析

| 能力                  | amis-react19                                           | Flux                                                | 差异                    |
| --------------------- | ------------------------------------------------------ | --------------------------------------------------- | ----------------------- |
| aside region          | ✅ `aside` prop                                        | ✅ `aside` region                                   | 一致                    |
| aside 左右定位        | ✅ `asidePosition`                                     | ✅ `asidePosition: 'left' \| 'right'`               | 一致                    |
| aside 拖拽分隔        | ✅ `asideResizor`（mouse events + imperative cssText） | ✅ `asideResizable`（pointer events + React state） | Flux 改进：更现代的 API |
| aside sticky          | ✅ `asideSticky`                                       | ✅ `asideSticky`                                    | 一致                    |
| aside min/max width   | ✅ 硬编码 160/350                                      | ✅ `asideMinWidth`/`asideMaxWidth` 可配置           | Flux 更灵活             |
| header 区域           | ✅ `title` + `subTitle` + `remark`                     | ✅ `title` + `subTitle` + `remark`                  | 一致                    |
| toolbar 区域          | ✅ 独立 `toolbar` region                               | ✅ 复用 `header` region                             | 设计决策：去掉冗余      |
| body region           | ✅ `body`                                              | ✅ `body`                                           | 一致                    |
| footer region         | ✅ 无独立 footer（在 body 内）                         | ✅ 独立 `footer` region                             | Flux 增强               |
| 移动端 aside 折叠     | ❌（CSS responsive，无 Sheet）                         | ✅ Sheet 滑出 + 触发按钮                            | Flux 增强               |
| 移动端 VisualViewport | ❌                                                     | ✅ 固定 footer 键盘偏移                             | Flux 增强               |
| 空 aside 折叠         | ❌（空 aside 仍占位）                                  | ✅ 编译期检测，空则不渲染                           | Flux 增强               |
| initApi/轮询          | ✅ 内置                                                | ❌（请求下沉 data-source）                          | 设计决策                |
| css/cssVars           | ✅ 运行时注入                                          | ❌（违反 styling contract）                         | 设计决策                |

**结论：Flux 的 page 组件是 amis Page 的超集——继承了所有布局能力，并在移动端、可配置性和架构规范性上做了增强。**

---

## 3. 是否需要右侧区域？

**已支持。** `asidePosition: 'right'` 将 aside 放在 body 之后（DOM 顺序），视觉在右侧。

amis 同样只支持一个 aside（通过 `asidePosition` 控制左右）。这是合理的——**侧边栏是单侧语义**，不应同时出现左右两个 aside。

如果需要两侧同时有面板（如 IDE 的左侧资源管理器 + 右侧属性面板），这不是 aside 的语义，应该用 `flex` 布局组合：

```json
{
  "type": "flex",
  "direction": "row",
  "body": [
    { "type": "container", "className": "w-64", "body": "左侧导航" },
    { "type": "container", "className": "flex-1", "body": "主内容" },
    { "type": "container", "className": "w-80", "body": "右侧属性" }
  ]
}
```

---

## 4. 是否需要上下区域？

**已支持。** `header` 和 `footer` regions 就是上下区域。

amis 的 Page 没有独立 footer region（标题区在 Page-main 内，无独立底栏）。Flux 增加了 `footer` region，配合移动端固定底栏模式（`footerClassName: "fixed bottom-0"`），比 amis 更完整。

上下区域的完整覆盖：

| 区域       | amis                           | Flux                           |
| ---------- | ------------------------------ | ------------------------------ |
| 顶部标题栏 | ✅ `title`/`subTitle`/`remark` | ✅ `title`/`subTitle`/`remark` |
| 工具栏     | ✅ `toolbar` region            | ✅ `header` region（复用）     |
| 主内容     | ✅ `body`                      | ✅ `body`                      |
| 底部栏     | ❌                             | ✅ `footer` region             |

---

## 5. 整个布局组件体系：有哪些，分别做什么？

### 5.1 布局组件全景

Flux 有 **4 个核心布局 renderer** + **3 个交互式布局 renderer**：

#### 核心布局（marker-only，无独立交互状态）

| 组件        | Marker          | DOM 层级                                         | 职责                                                          | 何时用                         |
| ----------- | --------------- | ------------------------------------------------ | ------------------------------------------------------------- | ------------------------------ |
| `page`      | `nop-page`      | 多层（header + toolbar + aside + body + footer） | **页面级根壳层**。承载 page runtime 边界、标题、aside、footer | 每个业务页面的根节点           |
| `container` | `nop-container` | 双层（外层 marker + 内层 body slot）             | **通用内容壳层**。三段式 header/body/footer，轻量内容分组     | section 包装、卡片壳、分组容器 |
| `flex`      | `nop-flex`      | 单层                                             | **纯弹性布局原语**。direction/wrap/align/justify/gap          | 行列排列、工具栏、网格替代     |
| `fragment`  | 无              | React Fragment                                   | **无 UI 结构分组**。when/data/isolate                         | 条件包装、数据绑定、作用域隔离 |

#### 交互式布局（有独立交互状态或视觉协议）

| 组件       | Marker         | 职责                                                                           | 何时用               |
| ---------- | -------------- | ------------------------------------------------------------------------------ | -------------------- |
| `tabs`     | `nop-tabs`     | **互斥面板切换**。valueOwnership（local/controlled/scope），per-tab badge/icon | Tab 切换面板         |
| `grid`     | `nop-grid`     | **二维网格布局**。columns/gap/items with colSpan/rowSpan，responsive           | 仪表盘卡片、等分布局 |
| `collapse` | `nop-collapse` | **手风琴折叠面板**。valueOwnership，multiple/single                            | 可折叠内容组         |

#### 辅助布局（`flux-renderers-layout` 包）

| 组件              | 职责                                      |
| ----------------- | ----------------------------------------- |
| `wizard`          | 多步骤流程（step 切换 + commit 生命周期） |
| `button-group`    | 操作按钮组（单选/多选模式）               |
| `dropdown-button` | 分裂按钮 + 下拉菜单                       |
| `steps`           | 轻量进度指示器（纯展示）                  |
| `timeline`        | 事件时间线（纯展示）                      |

### 5.2 核心布局组件对比

这是最容易混淆的三个：**page vs container vs flex**

| 维度               | `page`                             | `container`                           | `flex`                           |
| ------------------ | ---------------------------------- | ------------------------------------- | -------------------------------- |
| **语义**           | 页面根壳层                         | 通用内容壳层                          | 纯布局原语                       |
| **regions**        | title, header, body, aside, footer | header, body, footer                  | body (items)                     |
| **Owner 身份**     | page runtime owner                 | 无 owner 状态                         | 无 owner 状态                    |
| **DOM 层级**       | 多层（aside 是 body 兄弟）         | 双层（外层 + body slot）              | 单层                             |
| **className 挂载** | 外层 `nop-page`                    | 外层 `nop-container`（不影响布局）    | 根节点（直接影响布局）           |
| **布局控制**       | aside position + sticky            | direction/wrap/align/gap（body slot） | direction/wrap/align/justify/gap |
| **响应式**         | aside 移动端 Sheet 折叠            | per-breakpoint direction/wrap         | per-breakpoint direction/wrap    |
| **典型场景**       | ERP 页面、Dashboard                | 卡片包装、section 分组                | 工具栏、行排列、网格替代         |

**选型决策树**：

```
需要页面根节点？ → page
需要表单 owner？ → form
需要弹层？ → dialog/drawer
需要 Tab 切换？ → tabs
需要 header/body/footer 壳层？ → container
需要纯布局控制（方向/对齐/间距）？ → flex
需要无 UI 结构分组？ → fragment
需要二维网格？ → grid
需要手风琴折叠？ → collapse
```

### 5.3 关键区分：container vs flex

这是最常见的混淆点：

**`container`** = 有 header/body/footer 三段式的**内容壳层**。className 挂在外层不影响 body 布局；布局由 body slot 上的 semantic prop（direction/gap/align）控制。

**`flex`** = 纯**布局原语**。className 直接挂根节点，控制整个容器的弹性布局。

```json
// container: 带标题的卡片壳
{
  "type": "container",
  "header": [{ "type": "text", "text": "用户列表" }],
  "body": [{ "type": "table", "columns": [...] }]
}

// flex: 纯行列排列
{
  "type": "flex",
  "direction": "row",
  "gap": "md",
  "body": [
    { "type": "text", "text": "A" },
    { "type": "text", "text": "B" }
  ]
}
```

---

## 6. 设计文档是否说清楚了？

### 6.1 已说清楚的部分

| 文档                                            | 覆盖内容                                                                 | 清晰度  |
| ----------------------------------------------- | ------------------------------------------------------------------------ | ------- |
| `docs/components/page/design.md`                | aside position/sticky/resizable、subtitle/remark、移动端响应式、骨架模式 | ✅ 完整 |
| `docs/components/container/design.md`           | 容器家族分工、className 路由、与 flex/fragment/fieldset 边界             | ✅ 完整 |
| `docs/components/flex/design.md`                | 方向/对齐/间距/响应式、与 container 边界                                 | ✅ 完整 |
| `docs/architecture/styling-system.md`           | layout renderer styling contract、marker-only 原则                       | ✅ 完整 |
| `docs/architecture/container-spacing-design.md` | 三层间距架构、per-slot className                                         | ✅ 完整 |

### 6.2 存在的缺口

| 缺口                                 | 描述                                                                                                                                     | 建议                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **缺少布局选型指南**                 | 没有一篇文档专门回答「page/container/flex/grid 什么时候用哪个」。知识分散在各 design.md 的 §11 边界章节和 styling-system.md 的决策表中。 | 新建 `docs/architecture/layout-selection-guide.md`，汇总选型决策树和典型 schema 示例。 |
| **flux-guide 缺少布局模式文档**      | `docs/analysis/2026-07-10-flux-guide-structure-analysis.md` 提出应添加 `design-patterns/layout.md`，但未落地。                           | 落实该分析文档的建议。                                                                 |
| **aside 拖拽宽度持久化未定义**       | 当前 aside 宽度存在 React local state（刷新丢失）。plan 中列为 follow-up 但无具体设计。                                                  | 决定：是否需要 scope-level 持久化？若需要，走 statusPath 还是 localStorage？           |
| **flex-item per-child 子类型未实现** | amis 有 `flex-item` 支持 per-child flex/basis/grow。当前用嵌套 flex + className 绕过。                                                   | 记录为 Deferred，等真实需求出现再设计。                                                |

### 6.3 设计决策记录完整性

所有关键决策都有记录：

| 决策                                           | 记录位置                                        |
| ---------------------------------------------- | ----------------------------------------------- |
| aside 空折叠（不占位）                         | `page/design.md` §2 Decision                    |
| header 复用 toolbar（去掉独立 toolbar region） | `page/design.md` §2 Decision                    |
| 请求下沉 data-source（不内置 initApi）         | `page/design.md` §2                             |
| css/cssVars 不采纳（styling contract）         | `page/design.md` §2                             |
| 移动端 aside 折叠为 Sheet（非 hidden）         | `page/design.md` §13 Decision                   |
| container vs flex 边界                         | `container/design.md` §13, `flex/design.md` §11 |
| 布局 renderer marker-only 原则                 | `styling-system.md`                             |

---

## 7. 总结

1. **amis Page 的 aside 拖拽分隔 → Flux 已实现**，且用 pointer events + React state 做了改进（比 amis 的 mouse events + imperative cssText 更现代）。

2. **右侧 aside → 已支持**（`asidePosition: 'right'`），不需要新增。

3. **上下区域 → 已支持**（`header` + `footer` regions），且比 amis 更完整（amis 无独立 footer）。

4. **整体布局组件体系已完整**：page（页面壳）→ container（内容壳）→ flex（布局原语）→ fragment（无 UI 分组），加上 tabs/grid/collapse 交互式布局。

5. **设计文档基本完整**，主要缺口是缺少一篇集中的「布局选型指南」文档，以及 aside 宽度持久化的设计。
