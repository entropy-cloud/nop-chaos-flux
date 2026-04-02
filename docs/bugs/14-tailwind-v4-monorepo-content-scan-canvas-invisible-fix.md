# 14 Flow Designer Canvas Invisible — Tailwind v4 Monorepo Content Scanning Fix

## Problem

- Flow Designer playground 页面打开后，画布（canvas）区域完全不可见——ReactFlow 不渲染，节点和边全部消失
- 调色板（palette）和检查器（inspector）面板在，但画布中间是空的
- 多轮修改组件 JSX、CSS 类名、布局结构均无法修复——每次改完，代码看起来"应该对了"，但浏览器里画布仍然没有高度

## Diagnostic Method

**诊断难度：极高。** 这是一个"代码看起来完全正确，但运行时行为不对"的典型案例。

### 错误的诊断路径（反复踩坑）

1. **假设布局类写错了** — 反复修改 `grid-rows-1`、`h-full`、`min-h-0` 等类名组合，对照 CSS Grid 规范检查每一层，改了几十遍仍然无效
2. **假设 ReactFlow 没有正确填充父容器** — 反复调整 `absolute inset-0`、`position: relative` 等定位类，确保 DOM 层级正确，没有效果
3. **假设是 z-index 或 overflow 问题** — 调整 `overflow-hidden`、`z-60` 等，无效
4. **假设是 Vite HMR 缓存问题** — 重启 dev server、清除缓存，无效
5. **假设是 Tailwind 版本不支持某些类** — 查 Tailwind v4 文档，类名语法都对

### 为什么反复失败？

**核心原因：从来没有验证过"Tailwind 是否真的为这些类生成了 CSS"。**

每一轮都是"看 JSX 源码 → 觉得类名正确 → 改 → 看浏览器 → 还是不行"的循环。这个循环的隐含假设是：**Tailwind 一定会为我写的类名生成 CSS**。这个假设在 monorepo 中是**错误的**。

### 正确的诊断路径

1. **写 Playwright e2e 测试直接在浏览器中检查计算样式** — `getComputedStyle(el)['gridTemplateRows']`、`getComputedStyle(el)['height']` 等
2. **发现所有 Tailwind 布局类的 computed value 都是初始值** — `grid-rows-1` 的 `gridTemplateRows` 是 `none`，`h-full` 的 `height` 是 `auto`，`inset-0` 的 `top` 是 `auto`
3. **这说明 Tailwind 根本没有为这些类生成 CSS 规则**
4. **进一步验证：搜索页面所有 stylesheet 的所有 CSS selector，找不到 `.grid-rows-1` 等规则**
5. **定位根因：Tailwind v4 的 `@tailwindcss/vite` 插件默认只扫描项目根目录下的文件**

### 关键证据

```
// Playwright 测试结果（修复前）
.grid-rows-1  -> gridTemplateRows = none         // 应该是 "repeat(1, minmax(0, 1fr))"
.h-full       -> height = auto                    // 应该是 "100%"
.inset-0      -> top = auto                       // 应该是 "0px"
.min-h-0      -> minHeight = 0px                  // 这个"碰巧"是对的（默认值也是 0）
```

## Root Cause

**Tailwind CSS v4 的内容扫描机制与 v3 完全不同，且与 pnpm monorepo 不兼容。**

1. **Tailwind v3** 使用 `tailwind.config.ts` 中的 `content` 数组（glob 模式）来决定扫描哪些文件。项目有一个 `tailwind.config.ts`，但它被 Tailwind v4 **完全忽略**。

2. **Tailwind v4** 使用 `@tailwindcss/vite` 插件，该插件从项目根目录（`apps/playground/`）开始扫描文件系统。workspace 中 `../../packages/` 下的文件在扫描范围之外。

3. **结果**：所有在 `packages/flow-designer-renderers/src/**/*.tsx` 中使用的 Tailwind 类名（如 `grid-rows-1`、`grid-cols-[15rem_minmax(0,1fr)_22rem]`、`h-full`、`absolute`、`inset-0`）都不会生成 CSS。类名写在 JSX 里，但浏览器完全不认识。

4. **次要问题**：`nop-gradient-start` 等静态 CSS 类定义在 `packages/tailwind-preset/src/styles/base.css` 中，但该文件从未被 `@import`，所以也不存在于运行时。

**为什么这个问题特别难诊断？**

- JSX 源码中的类名看起来 100% 正确
- Tailwind v3 的 `tailwind.config.ts` 仍然存在于项目根目录，误导开发者以为它还在工作
- Tailwind v4 没有在控制台输出任何警告或错误
- 部分类名（如 `flex`、`grid`、`border`）仍然生效——因为它们被 `apps/playground/` 下的文件使用过，Tailwind 碰巧生成了它们
- 只有在 `packages/` 中**独有**的类名才会缺失，这导致"有些样式有、有些没有"的混乱现象

## Fix

### 主修复：添加 `@source` 指令

在 `apps/playground/src/styles.css` 中添加：

```css
@import "tailwindcss";
@source "../../../packages";
```

`@source` 是 Tailwind v4 的指令，告诉扫描器额外扫描 `packages/` 目录下的文件以发现类名使用。

### 次修复：导入 tailwind-preset 的 base.css

```css
@import "../../../packages/tailwind-preset/src/styles/base.css";
```

这使 `nop-gradient-*`、`nop-glass-card` 等静态 CSS 类可用。

### 补充修复：添加 Layer 2 语义标记

之前的 `fd-` 前缀类名（如 `fd-page__canvas`、`fd-palette__item`）在调整过程中被删除，但没有替换为 `nop-` 前缀的语义标记。按照 `docs/architecture/renderer-markers-and-selectors.md` 的规范补全：

| 标记 | 组件 | 含义 |
|---|---|---|
| `nop-designer` | designer-page.tsx | 设计器根 |
| `nop-designer__header` | designer-page.tsx | 工具栏区域 |
| `nop-designer__palette` | designer-page.tsx | 面板列 |
| `nop-designer__canvas` | designer-page.tsx | 画布列 |
| `nop-designer__inspector` | designer-page.tsx | 检查器列 |
| `nop-designer-toolbar` | designer-toolbar.tsx | 工具栏 |
| `nop-palette` | designer-palette.tsx | 面板根 |
| `nop-palette__group-header` | designer-palette.tsx | 分组标题 |
| `nop-palette__item` | designer-palette.tsx | 节点项 |
| `nop-inspector` | designer-inspector.tsx | 检查器根 |
| `nop-designer-node` | DesignerXyflowNode.tsx | 节点包装器 |
| `nop-designer-node-toolbar` | DesignerXyflowNode.tsx | 节点工具栏 |
| `nop-designer-edge__label` | DesignerXyflowEdge.tsx | 边标签 |
| `nop-designer-edge__actions` | DesignerXyflowEdge.tsx | 边快捷操作 |

## Tests

- `tests/e2e/tailwind-css-scan.spec.ts` — 验证 Tailwind 关键布局类的 CSS 确实被生成（不再只是"类名写在源码里"）
- `tests/e2e/flow-designer-css-diag.spec.ts` — 验证从 viewport 到 ReactFlow 的完整高度链（每层高度 > 100px）
- `tests/e2e/flow-designer-ui.spec.ts` — 更新所有选择器使用 `nop-` 语义标记，验证中文标签、按钮行为

## Affected Files

- `apps/playground/src/styles.css` — 添加 `@source` 和 `@import`
- `packages/flow-designer-renderers/src/designer-page.tsx` — 添加 `nop-designer`、`nop-designer__*` 标记
- `packages/flow-designer-renderers/src/designer-toolbar.tsx` — 添加 `nop-designer-toolbar`
- `packages/flow-designer-renderers/src/designer-palette.tsx` — 添加 `nop-palette`、`nop-palette__group-header`、`nop-palette__item`
- `packages/flow-designer-renderers/src/designer-inspector.tsx` — 添加 `nop-inspector`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowNode.tsx` — 添加 `nop-designer-node`、`nop-designer-node-toolbar`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowEdge.tsx` — 添加 `nop-designer-edge__label`、`nop-designer-edge__actions`
- `docs/architecture/renderer-markers-and-selectors.md` — 添加 flow designer 语义标记清单
- `tests/e2e/tailwind-css-scan.spec.ts` — 修复测试逻辑
- `tests/e2e/flow-designer-ui.spec.ts` — 全面更新选择器和标签
- `tests/e2e/flow-designer-css-diag.spec.ts` — 更新选择器

## Notes For Future Refactors

1. **Monorepo 中 Tailwind 类名不生效时，第一步检查"CSS 是否真的生成了"，而不是"类名是否写对了"。** 用浏览器 DevTools 或 Playwright 检查 `getComputedStyle`，而不是只看 JSX 源码。
2. **Tailwind v3 → v4 是一次破坏性迁移。** `tailwind.config.ts` 中的 `content` 数组在 v4 中被忽略，必须使用 `@source` CSS 指令。删除 `tailwind.config.ts` 或添加注释说明它已废弃。
3. **`@source` 是 Tailwind v4 处理 monorepo 的官方机制。** 如果未来在 `packages/` 中新增了使用 Tailwind 类的文件，只要 `@source "../../../packages"` 存在就会自动扫描到。
4. **静态 CSS 类（非 Tailwind 工具类）必须通过 `@import` 显式引入，`@source` 只影响 Tailwind 的类名扫描。** `nop-gradient-*` 等定义在 `base.css` 中的类不会因为 `@source` 而自动可用。
5. **Layer 2 语义标记（`nop-` 前缀）不承载任何视觉样式。** 它们只用于测试定位和 AI Agent 识别。删除它们会导致 e2e 测试失败。
