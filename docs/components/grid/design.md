# Grid 组件设计

## 1. 组件定位

- `grid` 是显式网格布局 renderer，用来按列、行和断点组织子内容。
- 它补充 `flex`，但不替代 `flex`；`flex` 负责一维布局，`grid` 负责二维布局。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `grid`。
- Flux 正式契约应优先表达稳定布局语义，而不是把大量 className slot 或历史 mode 名写进组件字段。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'grid'`
- 归属 `@nop-chaos/flux-renderers-layout`

## 4. schema 设计

- 建议正式字段为 `columns`、`gap`、`items`、`autoFlow`、`alignItems`、`justifyItems`。

## 5. 字段分类

- `columns`、`gap`、`items`、`autoFlow`、`alignItems`、`justifyItems`: `value`

## 6. regions 与 slot 约定

- `items` 表示网格项集合。
- 网格项本身建议是对象值，每项可带 `body`、`colSpan`、`rowSpan`。

## 7. 运行期状态归属

- `grid` 本身无复杂 owner 状态。

## 8. 事件、动作与组件句柄能力

- 首版不要求专门事件或句柄。

## 9. 数据源、表达式、导入能力接入点

- `columns` 和 `items` 可由表达式值产生，但最终应归一化为明确布局配置。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-grid` marker。
- 视觉布局由 schema 和样式系统决定，不在 renderer 中写死间距类名。

## 11. 实现拆分建议

- 网格项归一化、断点映射、child 渲染分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是把 `grid` 做成第二套任意容器，从而和 `container`、`flex` 重新重叠。

## 13. 响应式行为

> 实现落地于「新落地 renderer 响应式 successor」plan（`docs/plans/2026-06-24-2358-1-newly-landed-renderer-responsive-followups-plan.md`）。引用 M0 移动端基线（`docs/architecture/mobile-responsive-baseline.md`，断点 768px）。

- **schema 字段**：`responsiveColumns?: { sm?: number; md?: number; lg?: number }`（per-breakpoint 列数覆盖）。缺省（未提供）时 grid 行为与本节改动前逐字节一致（单值 `columns` → `repeat(N, minmax(0, 1fr))`，桌面零回归）。
- **裁定（Decision A — 运行时分支）**：grid 响应式采用运行时 `useIsMobile()` 分支切换 `gridTemplateColumns`，**不**使用 per-breakpoint CSS。原因：内联 `style.gridTemplateColumns` 无法表达 `@media`；而 Tailwind v4 的 content scanning 无法识别运行时动态拼接的 `grid-cols-*` 类名，故纯 CSS 范式（Decision B）不可行，按 plan Phase 1 裁定回落到 (A)。这与 crud/chart 的运行时分支范式一致。
- **断点解析**：`useIsMobile()` 是单一 768px 阈值，故 `md`/`lg` 合并到桌面桶（≥ 768），`sm` 映射到移动桶（< 768）。每个桶在其断点未设置时回退到 base `columns`：
  - 移动（< 768px）：`responsiveColumns.sm ?? columns`
  - 桌面（≥ 768px）：`responsiveColumns.lg ?? responsiveColumns.md ?? columns`
  - 仅对解析出的数值生效；`columns` 为字符串（raw grid-template-columns）且无数值断点解析时保持原样。
- **marker**：当 `responsiveColumns` 已配置且当前为移动视口时，根节点 `.nop-grid` 增 `data-responsive="narrow"`（桌面缺省不输出，与 crud/chart 对齐）。`data-columns` 反映当前视口的**有效**列数。
- **colSpan 归一化**：`colSpan` 按当前视口有效列数 clamp（移动少列时宽 colSpan 自动收紧），与 §6 一致。
- **无新 schema 透明性破坏**：不新增 `mobileUI` 标志位、不新建 `*-mobile` 组件；移动分支完全在 renderer 内部由 `useIsMobile()` 决定。`useIsMobile()` 是视口信号读取，不计入 §7「无复杂 owner 状态」的语义（grid 仍不持有交互态）。
