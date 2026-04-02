# Spreadsheet Canvas CSS 设计

## 1. 背景与问题

Spreadsheet canvas 需要同时渲染数千个单元格（典型可见区域 100 行 × 26 列 = 2600 个 cell）。每个 cell 携带字体、对齐、边框、背景等样式信息。

项目整体采用了 Tailwind + shadcn/ui 的样式体系（见 `docs/architecture/styling-system.md`），但 spreadsheet canvas 是一个性能敏感的自包含渲染子树，直接套用 Tailwind 工具类会产生以下问题：

1. **DOM 体积膨胀**：每个 cell 80+ 字符的 Tailwind class × 2600 = ~200KB 额外 DOM 文本
2. **动态值不友好**：Excel 的字号（13px）、字体（宋体）、颜色（#FF5733）是连续值，Tailwind 无法用工具类表达
3. **样式规则匹配开销**：每个 cell 需匹配 10+ 条 CSS 规则

## 2. 设计决策：混合样式策略

Spreadsheet canvas 内部采用三层混合方案：

| 层 | 适用场景 | 实现方式 |
|---|---|---|
| 预定义 CSS class | CellStyle 有限集合属性（bold、对齐、边框样式等） | `ss-*` class |
| inline style | CellStyle 连续值属性（字号、字体、颜色等） | `style` 属性 |
| data-* 属性 | 交互状态（选中、编辑、范围高亮等） | `data-cell-active`、`data-cell-selected` 等 |

与项目外壳（shadcn/ui + Tailwind）并行不悖。Canvas 是一个自包含的渲染子树，样式策略对外壳透明。

### 2.1 架构边界

```
┌─────────────────────────────────────────────────────────────┐
│ 外壳层 (toolbar, sidebar, inspector, dialogs)               │
│   shadcn/ui + Tailwind — 与项目整体一致                      │
├─────────────────────────────────────────────────────────────┤
│ Spreadsheet Canvas (grid, cells, row/col headers, selection)│
│   预定义 CSS (ss-*) + inline style + data-* — 性能优先      │
├─────────────────────────────────────────────────────────────┤
│ CellDocument.style (CellStyle 接口)                          │
│   有限集合属性 → CSS class                                   │
│   连续值属性 → inline style                                  │
│   交互状态 → data-* 属性                                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 样式属性分类

| 样式属性 | 策略 | 原因 | CSS class |
|---|---|---|---|
| `fontWeight` (bold/normal) | CSS class | 2 个固定值 | `ss-bold` |
| `fontStyle` (italic/normal) | CSS class | 2 个固定值 | `ss-italic` |
| `textDecoration` (underline/line-through/none) | CSS class | 3 个固定值 | `ss-underline`, `ss-strike` |
| `textAlign` (left/center/right) | CSS class | 3 个固定值 | `ss-align-left`, `ss-align-center`, `ss-align-right` |
| `verticalAlign` (top/middle/bottom) | CSS class | 3 个固定值 | `ss-valign-top`, `ss-valign-middle`, `ss-valign-bottom` |
| `wrapText` (boolean) | CSS class | 布尔值 | `ss-wrap` |
| `borderStyle` (solid/dashed/dotted/double) | CSS class | 4 个固定值 | `ss-border-solid`, `ss-border-dashed` 等 |
| `fontSize` | inline style | 连续值 | — |
| `fontFamily` | inline style | 无限集合 | — |
| `fontColor` | inline style | 1600万+ 颜色值 | — |
| `backgroundColor` | inline style | 1600万+ 颜色值 | — |
| `borderColor` | inline style | 1600万+ 颜色值 | — |
| `borderWidth` | inline style | 连续值 | — |
| `textIndent` | inline style | 连续值 | — |

### 2.3 交互状态：data-* 属性

遵循项目 `docs/architecture/renderer-markers-and-selectors.md` 的规范：**交互状态用 `data-*` 属性，不用 class 修饰符**。这与 shadcn/ui 的 `data-state`、flux renderer 的 `data-field-*` 模式保持一致。

| 状态 | data-* 属性 | 触发时机 |
|---|---|---|
| 活动单元格 | `data-cell-active` | 单元格被点击/键盘导航到 |
| 选中态 | `data-cell-selected` | 单元格在选中范围内 |
| 编辑态 | `data-cell-editing` | 用户正在此单元格输入 |
| 范围高亮 | `data-range-highlight` | 单元格在拖选范围内 |
| 列头激活 | `data-col-header-active` | 活动单元格所在列的列头 |
| 行头激活 | `data-row-header-active` | 活动单元格所在行的行头 |

CSS 通过属性选择器响应：

```css
.ss-cell[data-cell-active] { outline: 2px solid #1a73e8; }
.ss-cell[data-cell-selected] { background-color: #e8f0fe; }
.ss-cell[data-cell-editing] { outline: 2px solid #1a73e8; overflow: visible; }
```

## 3. CSS class 设计

### 3.1 命名前缀：`ss-`

使用 `ss-` 前缀（Spreadsheet 缩写），避免与 `nop-` 语义标记和 Tailwind 工具类冲突。

### 3.2 默认 Excel 单元格样式

`ss-cell` 提供完整的 Excel 默认单元格样式作为基线，包括：

- 盒模型（border-box、固定内边距）
- 默认字体（Calibri 11pt — Excel 默认字体）
- 文本溢出处理（clip、nowrap）
- 默认边框（Excel 标准浅灰网格线）
- 默认对齐（左对齐、垂直居中）
- 单元格高度（22px — Excel 默认行高）

当 `CellStyle` 的某个属性为 `undefined` 时，`ss-cell` 的默认值生效。只有显式设置了非默认值的属性才会触发额外的 CSS class 或 inline style。

### 3.3 完整 CSS class 清单

所有 class 定义在 `packages/spreadsheet-renderers/src/canvas-styles.css`，共 6 组：

1. **Grid 结构**：`ss-grid`、`ss-row`、`ss-col-header`、`ss-row-header`、`ss-header-corner`
2. **Cell 基线**：`ss-cell`（默认 Excel 样式）
3. **字体修饰**：`ss-bold`、`ss-italic`、`ss-underline`、`ss-strike`
4. **对齐**：`ss-align-left`、`ss-align-center`、`ss-align-right`、`ss-valign-top`、`ss-valign-middle`、`ss-valign-bottom`
5. **换行**：`ss-wrap`
6. **边框样式**：`ss-border-solid`、`ss-border-dashed`、`ss-border-dotted`、`ss-border-double`

### 3.4 交互状态 — 通过 data-* 属性响应（非 class）

不使用 `ss-cell--selected` 等 BEM 修饰符。改为 `data-*` 属性选择器：

| 旧模式（BEM 修饰符） | 新模式（data-* 属性） |
|---|---|
| `class="ss-cell ss-cell--active"` | `class="ss-cell" data-cell-active` |
| `class="ss-cell ss-cell--selected"` | `class="ss-cell" data-cell-selected` |
| `class="ss-cell ss-cell--editing"` | `class="ss-cell" data-cell-editing` |
| `class="ss-cell ss-range-highlight"` | `class="ss-cell" data-range-highlight` |

React 中的用法：

```tsx
<td
  className={cellStyleResult.className}
  style={cellStyleResult.style}
  data-cell-active={isActive || undefined}
  data-cell-selected={isSelected || undefined}
  data-cell-editing={isEditing || undefined}
/>
```

### 3.5 辅助结构 class

| class | 用途 |
|---|---|
| `ss-col-resize-handle` | 列宽调整手柄 |
| `ss-row-resize-handle` | 行高调整手柄 |
| `ss-selection-border` | 选区边框 |
| `ss-selection-fill-handle` | 填充柄 |
| `ss-frozen-separator-col` | 冻结列分隔线 |
| `ss-frozen-separator-row` | 冻结行分隔线 |

## 4. style-to-class 映射模块

`cell-style-map.ts` 负责将 `CellStyle` 接口转换为 CSS class 列表 + inline style 对象：

```typescript
interface CellStyleResult {
  className: string;             // 空格分隔的 ss-* class 列表
  style: React.CSSProperties;   // inline style（仅包含动态值属性）
}
```

**映射规则：**
- `ss-cell` 始终存在于 `className` 中（作为基线）
- 只在属性值与 Excel 默认值不同时才添加对应的 class 或 inline style
- 例如：`textAlign: 'left'` 不产生任何 class（因为已经是默认值）
- 例如：`textAlign: 'center'` 产生 `ss-align-center`
- 例如：`fontSize: 14` 产生 `style.fontSize = '14px'`

**交互状态不经过此模块**：`data-*` 属性由 canvas renderer 根据运行时状态直接设置，不走 CellStyle 映射。

## 5. 性能优化策略

### 5.1 styleId 缓存

`spreadsheet-core` 的 `StyleDefinition` + `styleId` 机制天然支持相同样式的 cell 共享同一个 style 对象。`cell-style-map.ts` 可以基于 `styleId` 缓存 `CellStyleResult`，避免重复计算。

### 5.2 class 数量最小化

由于默认值由 `ss-cell` 提供，非默认属性才产生额外 class，典型 cell 只需要 `ss-cell` 1 个 class（大多数 cell 使用默认样式）。

### 5.3 inline style 最小化

只在属性值非空且非默认时才添加 inline style 属性，避免生成空的 style 对象。

## 6. 文件位置

| 文件 | 包 | 职责 |
|---|---|---|
| `src/canvas-styles.css` | `@nop-chaos/spreadsheet-renderers` | 预定义 CSS 规则 |
| `src/cell-style-map.ts` | `@nop-chaos/spreadsheet-renderers` | CellStyle → class + style 映射 |

CSS 文件通过 playground 的 `styles.css` 中 `@import` 引入（与 `base.css` 方式一致），Tailwind 的 `@source` 指令会扫描 `packages/` 目录确保内容可见。

## 7. 与项目整体样式体系的关系

- **不冲突**：`ss-*` class 只在 spreadsheet canvas 内部使用，不会泄漏到外壳
- **不替代**：外壳（toolbar、sidebar、inspector、dialog）仍然使用 shadcn/ui + Tailwind
- **不违反 Renderer Styling Contract**：canvas renderer 的 marker class 仍然是 `nop-spreadsheet-page__body`，`ss-*` 是 canvas 内部的渲染细节
- **与 data-* 模式一致**：交互状态用 `data-cell-*` 属性，与 `data-field-*`、`data-state` 同一模式

## 8. 测试策略

- `cell-style-map.test.ts`：验证 CellStyle 到 class + style 的映射正确性
- 验证默认值不产生额外 class/style
- 验证所有有限集合属性正确映射到 class
- 验证所有连续值属性正确映射到 inline style
- 验证 `undefined` 属性不产生任何输出
