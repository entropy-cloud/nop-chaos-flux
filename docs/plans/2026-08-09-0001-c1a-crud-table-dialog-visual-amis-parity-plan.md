# C1a CRUD 表格与对话框视觉 AMIS 对齐修复计划（CSS 变量驱动）

> Plan Status: completed（2026-08-09 宿主程序化验收闭环后翻转；见 Phase 3/7 checklist 与 Closure Gates）
> Last Reviewed: 2026-08-09（独立审查 1 轮：2 Major + 5 Minor，已全部处理；见 Draft Review Record）
> Source: 2026-08-09 live repo 复核（无独立 analysis 文档；对照基线 = 宿主 `apps/main/node_modules/amis/lib/themes/default.css` 6.13.1 + `amis-core/lib/store/table.js`）
> Related: `docs/components/table/design.md`、`docs/components/dialog/design.md`、`flux-guide/14-theming.md`

## Purpose

把 flux 渲染的 CRUD/Table/Dialog 视觉基线对齐 AMIS（宿主内 bridged 主题），使：
行高/字号/内边距、固定列 hover 与边缘阴影、列宽测量机制、操作列尺寸、对话框 6 档尺寸与叠加定位、遮罩透明度、间距体系都达到"肉眼无明显差异"。
**所有关键数值一律通过 CSS 变量（`--table-*` / `--dialog-*` / `--crud-*`）控制，组件与样式文件内不写死魔法数字。**

## Current Baseline

（以下均为 live repo 事实，2026-08-09 复核；对照基线 = 宿主 `apps/main/node_modules/amis/lib/themes/default.css` 6.13.1 + `amis-core/lib/store/table.js`）

- **固定列背景硬编码**：`table-renderer/fixed-columns.ts:34-48` `createStickyStyle()` 对 sticky 单元格写死 `background: hsl(var(--background))`；AMIS 用 `background: inherit`（`.cxd-Table-table th.is-sticky, td.is-sticky`）。→ 行 hover / 斑马纹 / 选中态无法透传到固定列（live defect，R1）。
- **固定列偏移按 schema 宽计算**：`fixed-columns.ts` 用 `column.width`（缺省 160px/40px）累加 offset；AMIS 用 `getBoundingClientRect()` 实测 `realWidth` 回填 CSS 变量 `--Table-column-{i}-width` 并做 `<colgroup>`（R2）。
- **规格差异**：flux `Table` = `text-sm`(14px) + `p-2`(8px)（`ui/src/components/ui/table.tsx:11,57,69`）；AMIS = body 12px / thead 14px / paddingY≈11px / paddingX 10px / 边列 16px / 行高 40px（R3/R4）。
- **stripe/bordered 死属性**：`table-renderer.tsx:538` 输出 `data-striped`/`data-bordered`，但全仓库无对应 CSS hook（R6）；AMIS 默认 `--Table-strip-bg: transparent`（无条纹），表头分隔线为 token 驱动。
- **hover 色硬编码**：`ui/src/components/ui/table-row-class-name.ts:2-7` `color-mix(...6%)` 写死；AMIS hover 走 `--Table-onHover-bg`。
- **对话框 size 映射失真**：`flux-react/src/dialog-host.tsx:32-39` `resolveDialogPrimitiveSize` 实际为 `xs→'sm'`、`sm|md→'default'`、其余（`lg|xl|full`）→`'lg'`——即 `xl` 与 `full` 双双落在 672px（`full` 本应全屏，失真；`lg` 本应 800px 而实际 672px）。AMIS 档位（宿主 default.css 实测）：`sm 350px / normal(base) 500px / md 800px / lg 1100px / xl 90% / full 全屏`，`--Modal-content-startMarginTop: 60px`、`--Modal-content-stepMarginTop: 30px`（R9）。
- **对话框定位/遮罩/footer**：`dialog-host.tsx` 50%/50% 垂直居中、无叠加步进；AMIS `margin-top: 60px` + 每层 +30px、不垂直居中；遮罩 `surface-overlay` 0.4 vs AMIS 0.7；footer 按钮 AMIS min-width 72px（R10/R12）。
- **已裁定不修改**：对话框默认 draggable 保持现状（用户 2026-08-09 裁定"默认可拖动没有问题"），不进入本计划。
- **owner-doc drift**：`docs/components/table/design.md` 决策表声称 stripe/bordered"实现"，与 live 死属性不符；`docs/components/dialog/design.md` 声称 size 映射为 ui `sm/default/lg`，将随本计划改变。

## Goals

- 表格：12px/14px 字号、40px 行高、10/11px 单元内边距、16px 边列、表头分隔线，全部经 `--table-*` 变量。
- 固定列：hover/斑马纹/选中整行透传（`background: inherit` 语义）+ 固定边缘 30px 阴影，经 `--table-fixed-*` 变量。
- 列宽：colgroup + 实测宽度回填 CSS 变量，固定列偏移与视觉列宽一致（AMIS 机制等价物）。
- 操作列：行内按钮 32px、间距 10px（`--table-row-action-*` / `--crud-toolbar-gap` 变量）。
- 对话框：6 档 size（`--dialog-size-*`）、顶部 60px + 每层 +30px、遮罩 0.7、footer 按钮 min-width 72px、标题 14px。
- stripe/bordered 从死属性变成 token 驱动的真实效果（`--table-striped-bg` / `--table-bordered-*`）。

## Non-Goals

- 不改变对话框默认 draggable 行为（已裁定保持）。
- 不做 AMIS 的导出 Excel/CSV、`rowClassNameExpr`、`floating itemActions`（既有决策）。
- 不引入 AMIS 的 `persistKey` 列宽服务器持久化（列宽持久化保持现状：本地/scope/controlled）。
- 不重排 CRUD 工具栏/搜索区的布局结构，只对齐间距数值。
- 不改 AMIS 侧（主应用 bridged 主题）任何代码。
- 不做"像素级逐帧对齐"；目标为肉眼无差异 + token 可调。

## Scope

### In Scope

- `packages/theme-tokens/src/styles.css`：新增 `--table-*`、`--dialog-*`、`--crud-*` 变量块。
- `packages/ui/src/styles/table.css`（新建）+ `index.css` 引入；`ui/src/components/ui/table.tsx`、`table-row-class-name.ts`、`dialog.tsx`、`pagination.tsx`（如需）。
- `packages/flux-renderers-data/src/table-renderer.tsx`（主渲染文件：colgroup + 测量）+ `src/table-renderer/` 子目录：`fixed-columns.ts`、`table-body-row-rendering.tsx`（操作列）、`table-header-row.tsx`（affix 表头）。
- `packages/flux-react/src/dialog-host.tsx`：size 映射、顶部定位与叠加步进、遮罩、footer。
- 配套 focused 单测与 owner-doc 同步（`docs/components/table/design.md`、`docs/components/dialog/design.md`）。

### Out Of Scope

- `packages/flux-renderers-data/src/table-renderer/use-column-resize.ts` 的拖拽宽度持久化语义。
- CRUD `listMode: cards/list` 的非表格载体样式。
- 移动端专用样式（`mobile.css` 内另有基线，不随本计划改动）。
- AMIS 侧样式（主应用 `amis-*.css`）。

## Failure Paths

| 编号                | 触发                                                                                                               | 行为                                                                                                                                                                 | 可重试                             | 用户可见表现                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------- |
| fp-measure-layout   | 列在首帧不可见（tab 内 / 懒加载 / 虚拟列表）导致 `getBoundingClientRect()=0`                                       | 测量失败时回退：声明宽 > 0 用声明宽；否则不写列宽变量（浏览器 auto），固定列回退 `DEFAULT_FIXED_COLUMN_WIDTH` 并记录 dev warn（对齐现有 Failure Path 风格）          | 是（下次渲染/ResizeObserver 重试） | 表格正常显示，固定列宽为回退值      |
| fp-measure-resize   | 容器宽度变化/列显隐切换后 colgroup 宽过期                                                                          | ResizeObserver 或列显隐 effect 触发重测；单测覆盖列显隐后 re-measure 路径                                                                                            | 是                                 | 短暂对齐后自动恢复                  |
| fp-fixed-bg-dark    | 深色主题下 `background: inherit` 透传行背景、hover 色对比不足                                                      | hover 色本身走 `--table-hover-bg` token；深色主题由 host 覆盖该 token                                                                                                | 否（主题职责）                     | 由主题 token 决定，语义与 AMIS 相同 |
| fp-sticky-edge-z    | 固定边缘阴影 `::after` 与表头 affix 或列 resize 手柄重叠                                                           | 阴影宽度/偏移全部走 `--table-fixed-edge-*` token；z-index 低于 affix header                                                                                          | 否                                 | 阴影只出现在数据区固定边缘          |
| fp-dialog-stack     | 嵌套/连续打开多个对话框                                                                                            | 每层 `top: calc(var(--dialog-top-offset) + idx * var(--dialog-stack-step))`；idx 取自 surfaces 中 dialog 序号；超出可视区时上限 `max-height` 兜底                    | 否                                 | 与 AMIS 的阶梯叠加一致              |
| fp-dialog-drag      | `topAnchored` 定位与 `useDialogDrag` 组合错位（如 baseTransform 缺失导致 transform 拼接异常、堆叠 top 被拖拽覆盖） | 仅经 `topAnchored` prop 注入命名 `baseTransform: 'translate(-50%, 0)'`；堆叠 top 走 inline `style.top`（drag transform 之外）；单测断言拖拽后 transform 仍含正确前缀 | 否                                 | 拖拽断链或位置跳变——由单测拦截      |
| fp-dialog-xl-mobile | 移动端 xl/full 尺寸                                                                                                | 保持现有 `isMobile && !hasExplicitSize → full` 分流；xl 用 `--dialog-size-xl`（90%）                                                                                 | 否                                 | 与现状一致                          |
| fp-jsdom-unit       | jsdom 无真实布局，测量单测拿不到 rect                                                                              | 测量函数抽成纯函数：注入 fake `getBoundingClientRect`/mock ResizeObserver 断言回退与变量写入逻辑                                                                     | 是                                 | 仅测试层                            |

## Test Strategy

档位选择：`必须自动化`（交互/布局回归集中在既有表测试族 `data-table.test.tsx`、`table-e1c-*`、`table-b33-*`、`dialog.test.tsx`、`theme-tokens/styles.test.ts`；jsdom 不测视觉像素，改为断言 token 引用、data-attribute、style 对象与纯函数输出；视觉验收在宿主内人工比对 + token 调整）。

## Execution Plan

### Phase 1 - 设计 token 面（`--table-*` / `--dialog-*` / `--crud-*`）

Status: completed（2026-08-09，与 Phase 2-6 同批落地；evidence 见 Phase 1-5 收口记录）
Targets: `packages/theme-tokens/src/styles.css`、`packages/theme-tokens/src/styles.test.ts`、`packages/ui/src/styles/table.css`（新建空骨架）

- Item Types: `Fix | Decision | Proof`

- [x] 在 `theme-tokens/src/styles.css` `:root`（及既有 `[data-theme=*]` 块不复制、只留 root 默认值）新增 token 块，命名与 AMIS 语义一一对应，全部可被宿主覆盖：
  - 表格：`--table-body-font-size: 12px`、`--table-header-font-size: 14px`、`--table-header-font-weight: 400`、`--table-cell-padding-y: 11px`、`--table-cell-padding-x: 10px`、`--table-edge-padding-x: 16px`、`--table-row-height: 40px`、`--table-header-bg: hsl(var(--background))`、`--table-header-separator-color: hsl(var(--border))`、`--table-hover-bg: color-mix(in hsl, hsl(var(--primary)) 6%, transparent)`、`--table-selected-bg: color-mix(in hsl, hsl(var(--primary)) 10%, transparent)`、`--table-striped-bg: transparent`、`--table-empty-height: 200px`、`--table-fixed-edge-width: 30px`、`--table-fixed-edge-shadow: inset 10px 0 8px -8px rgba(5, 5, 5, 0.06)`。
  - 操作列：`--table-row-action-height: 32px`、`--table-row-action-gap: 10px`、`--crud-toolbar-gap: 10px`。
  - 对话框：`--dialog-size-xs: 375px`（flux 独有档，AMIS 无对应，最小舒适宽）、`--dialog-size-sm: 350px`、`--dialog-size-base: 500px`（未传 size 时的默认档，对应 AMIS normal）、`--dialog-size-md: 800px`、`--dialog-size-lg: 1100px`、`--dialog-size-xl: 90%`、`--dialog-top-offset: 60px`、`--dialog-stack-step: 30px`、`--dialog-overlay-bg: rgb(0 0 0 / 0.7)`、`--dialog-title-font-size: 14px`、`--dialog-body-padding-x: 24px`、`--dialog-footer-button-min-width: 72px`、`--dialog-content-border-radius: 6px`、`--dialog-footer-gap: 8px`。
- [x] 新建 `packages/ui/src/styles/table.css` 骨架并接入 `styles/index.css`（`@import './table.css'`）；内容在 Phase 2/3 填充。
- [x] `styles.test.ts` 追加断言：上述每个 `--table-*` / `--dialog-*` token 存在且默认值正确（文件级字符串断言，延续现有风格；C1a 补测 `--dialog-body-padding-x` / `--dialog-footer-gap` 断言）。

Exit Criteria:

- [x] 上述 token 全部在 `theme-tokens/src/styles.css` 落地；`pnpm --filter @nop-chaos/theme-tokens exec vitest run src/styles.test.ts` 通过（8 passed）。
- [x] `table.css` 存在且被 `index.css` 引入；`pnpm --filter @nop-chaos/ui build` 通过（Phase 2 依赖此骨架）。

### Phase 2 - 表格密度与表头对齐（字号/内边距/边列/分隔线/hover 色）

Status: completed（2026-08-09）
Targets: `packages/ui/src/components/ui/table.tsx`、`table-row-class-name.ts`、`packages/ui/src/styles/table.css`

- Item Types: `Fix | Proof`

- [x] `table.tsx`：`Table` 根 `text-sm` → 去掉写死字号，改由 `table.css` `.nop-table { font-size: var(--table-body-font-size); }` 控制；`TableHead` `h-10 px-2` → 高度/水平内边距改由 CSS 变量（`height: var(--table-row-height)` 语义对齐 AMIS thead 40px；`padding: 0 var(--table-cell-padding-x)`，th 字号 `var(--table-header-font-size)`、字重 `var(--table-header-font-weight)`）。
- [x] `TableCell`：`p-2` → 由 `table.css` `.nop-table tbody td { padding: var(--table-cell-padding-y) var(--table-cell-padding-x); }`；首列/末列补 `var(--table-edge-padding-x)`（`td:first-child { padding-left: var(--table-edge-padding-x) }`、`td:last-child { padding-right: ... }`；checkbox/expand 控制列除外项经审计复核判定维持现状——`--table-edge-padding-x` 首末列统一生效，控制列 40px 窄列与 AMIS 基线 16px 边距同构，host 验收时肉眼看齐即可，不加额外排除选择器）。
- [x] `table-row-class-name.ts`：hover/selected 两处 `color-mix` 写死值替换为 `var(--table-hover-bg)` / `var(--table-selected-bg)`（类内直接引用，纯 CSS 无 JS 状态）。
- [x] `table.css` 补表头规则：`thead th { background: var(--table-header-bg); }`、`thead th + th { border-left: 1px solid var(--table-header-separator-color); }`（AMIS 语义）。
- [x] 既有 `data-table.test.tsx`、`table-b33-advanced-boundary.test.tsx`（hover 零重渲染）保持绿；新增 `packages/ui/src/table-styles.test.ts` 文件级字符串断言 `table.css` 规则（token 引用）——两文件均在 ui 160 全绿内。

Exit Criteria:

- [x] `ui` 表格原语不再含写死的 `p-2`/`h-10 px-2`/hover 色常量，正文/表头字号经 `--table-*` 变量（残留 `TableCaption` 的 `text-sm text-muted-foreground` 为 caption 自身文本语义，不属 body/head 密度契约）。
- [x] `pnpm --filter @nop-chaos/ui exec vitest run src/components/ui/table.test.tsx` 及 `table-row-class-name` 相关断言通过；`pnpm --filter @nop-chaos/flux-renderers-data exec vitest run src/__tests__/data-table.test.tsx src/__tests__/table-b33-advanced-boundary.test.tsx` 通过（全量 data 790 内含）。

### Phase 3 - 固定列 AMIS 化（hover 透传 + 边缘阴影 + stripe/bordered 落地）

Status: completed（2026-08-09，与 Phase 1-2、4-6 同批落地；宿主 hover 人工抽查项已由程序化验收闭环：见 checklist 与 Closure Gates）
Targets: `table-renderer/fixed-columns.ts`、`table-renderer.tsx`（stripe/bordered 数据属性不变）、`table-header-row.tsx`（affix 背景）、`packages/ui/src/styles/table.css`、`table-body-row-rendering.tsx`（`data-striped` 行属性已存在，复用）

- Item Types: `Fix | Decision | Proof`

- [x] `fixed-columns.ts` `createStickyStyle`：删除写死 `background: hsl(var(--background))`（及 `className: 'bg-background'`），sticky 单元格背景回到透明继承（AMIS `background: inherit` 等价语义——行级 `--table-hover-bg` / `--table-striped-bg` / `--table-selected-bg` 直接透传）。
- [x] 固定边缘阴影：在最后左侧固定 / 第一右侧固定单元格上加 marker class（`nop-table-sticky-edge-left/right`，仅当该项是"该方向最后一个固定列"时），`table.css` 用 `::after` + `width: var(--table-fixed-edge-width)` + `box-shadow: var(--table-fixed-edge-shadow)` 实现；z-index 低于 affix header。
- [x] affix 表头（`table-header-row.tsx:392,513`）背景改为 `var(--table-header-bg)`（不再内联写死 `hsl(var(--background))`）。
- [x] stripe/bordered 从死属性变活（Decision：默认值与 AMIS 一致）：
  - `[data-striped]` 行：`table.css` 规则 `.nop-table tbody tr[data-striped]:not(:hover) { background: var(--table-striped-bg, transparent); }`（默认 transparent = AMIS 默认无条纹；宿主可覆盖 token 开条纹）。stripe 规则带 `:not(:hover)` 限定，hover 行恒不套条纹。
  - `[data-bordered]`：`.nop-table[data-bordered]` 增加外框 `1px solid var(--border)` + 单元格垂直分隔线（`td + td { border-left: 1px solid var(--border) }`）——AMIS 语义等价，border 走既有 `--border`。
- [x] 单测：`data-table-columns.test.tsx` 增加"sticky 单元格不再携带不透明背景、且边缘列带 edge marker"断言；`table-e1c-*` 固定列 offset 断言保持绿。

Exit Criteria:

- [x] `fixed-columns.ts` 无任何 `hsl(var(--background))` 字面量；affix 表头走 `--table-header-bg`。
- [x] 新增 `table.css` 规则 + marker class 通过单测：edge marker 存在性（`data-table-columns.test.tsx`）+ stripe/bordered/`::after` 阴影规则载入断言（`packages/ui/src/table-styles.test.ts`，与 Phase 2 同文件合并推进）；`pnpm --filter @nop-chaos/ui build` 通过。
- [x] hover 透传在宿主人工抽查：固定列 hover 与中间列同色（程序化验收闭环：flux 仓新增 `tests/e2e/component-lab/c1a-visual-amis-parity.spec.ts`「fixed-column hover pass-through」——真实浏览器内 hover 行后断言固定列单元与中间列单元 computed background 相等且行级 hover 色生效；宿主侧 `tests/e2e/c1a-visual-acceptance.spec.ts` 同款断言，两处 8/8 + 6/6 全绿，2026-08-09）。

### Phase 4 - 列宽测量回填（colgroup + 固定列偏移实测）

Status: completed（2026-08-09 与 Phase 1-3、5-6 同批落地；evidence 见本节）
Targets: `table-renderer.tsx`、`table-renderer/fixed-columns.ts`、`table-renderer/types.ts`（如需）、`table-e1c-column-widths-persistence.test.tsx` / `table-data-and-layout.test.tsx` / `table-body-rows-virtual.test.tsx`

- Item Types: `Fix | Proof`

- [x] `table-renderer.tsx` 渲染 `<colgroup>`（thead 前）：每列 `<col>`，实测宽度经 `<col>` 内联 `style={{ width }}` 回填（colgroup 为空宽时浏览器 auto 分布，等价 AMIS 首帧）。
- [x] 测量器（纯函数 + hook）：挂载后对 `<th>` 逐个 `getBoundingClientRect().width`，写入组件级 state（`Record<columnKey, number>`），由渲染层输出 `<col>` width；列显隐/`columnResize` 变化时 re-measure（Failure Path `fp-measure-layout`/`fp-measure-resize` 回退逻辑含 dev warn）。
- [x] `fixed-columns.ts`：`createFixedColumnLayout` 增加可选 `measuredWidths` 参数，offset 累加与单元格 width/min/max 优先取实测值，回退声明宽，最后回退 `DEFAULT_FIXED_COLUMN_WIDTH`（160px）/控制列 40px。
- [x] 虚拟滚动路径（`TableBodyRows` 经 `@tanstack/react-virtual` 的 `virtualEnabled`）与 affixHeader 共存场景保持不回归（`table-auto-fill-height.test.tsx`、`table-e1c-column-widths-persistence`、`table-body-rows-virtual.test.tsx` 保持绿）。
- [x] 单测：测量纯函数注入 fake rect 断言 "回填变量名/回退逻辑/列显隐重测"（`table-column-width-measure.test.tsx`）；`table-data-and-layout.test.tsx` 不变扩展固定列偏移用例到 "实测宽优先"。

Exit Criteria:

- [x] `<colgroup>` 与测量器落地，固定列 offset 数据源改为实测优先；相关测试新增用例全绿。
- [x] `pnpm --filter @nop-chaos/flux-renderers-data exec vitest run src/__tests__/table-e1c-column-widths-persistence.test.tsx src/__tests__/table-data-and-layout.test.tsx src/__tests__/table-auto-fill-height.test.tsx src/__tests__/table-body-rows-virtual.test.tsx` 通过（data 全量 790 中复核绿）。

### Phase 5 - 操作列与 CRUD 间距

Status: completed（2026-08-09，与 Phase 1-4、6 同批落地）
Targets: `table-body-row-rendering.tsx`（operation cell）、`crud-renderer-toolbar.tsx`、`table-renderer.tsx`（footerToolbar 间距如需）、`packages/ui/src/styles/table.css`

- Item Types: `Fix | Proof`

- [x] 行操作按钮高度收敛：`table-body-row-rendering.tsx` 操作列 `flex flex-wrap gap-3` → `gap-[var(--table-row-action-gap)]`；行内按钮（operation/quickSave/expand/tree 等行级控件）统一约束 `height: var(--table-row-action-height)`（默认 32px，与 AMIS 默认按钮一致），经 `table.css` `[data-slot='table-actions'] button` 规则落地，不动逐个 button size prop。
- [x] `crud-renderer-toolbar.tsx:178` `gap-3` → `gap-[var(--crud-toolbar-gap)]`（默认 10px）；footerToolbar 分页/统计间距同 token。
- [x] 单测：操作列 DOM 断言 token 类/变量引用；`crud-selection-and-features.test.tsx` 保持绿（data 全量 790 内含）。

Exit Criteria:

- [x] 操作列/工具栏 gap 全部经 `--table-row-action-*` / `--crud-toolbar-gap` 变量；`pnpm --filter @nop-chaos/flux-renderers-data exec vitest run src/__tests__/crud-selection-and-features.test.tsx` 通过（全量 790 内含）。

### Phase 6 - 对话框 AMIS 化（尺寸/定位/遮罩/footer；默认 draggable 保持）

Status: completed（2026-08-09，与 table 面 Phase 1-5 同批执行；验证证据见 daily log 2026-08-09 首条）
Targets: `packages/flux-react/src/dialog-host.tsx`、`packages/ui/src/components/ui/dialog.tsx`、`dialog.test.tsx`、`packages/ui/src/styles/table.css`（或独立 dialog.css）

- Item Types: `Fix | Decision | Proof`

- [x] size 映射改为 AMIS 对齐档位（全部经 `--dialog-size-*` 变量）：`DialogContent` 的 `size` 扩展为 `'xs'|'sm'|'base'|'md'|'lg'|'xl'|'default'`（保留 `'default'` 兼容别名，与默认档同落 `--dialog-size-base`）；`dialog-host.tsx` `resolveDialogPrimitiveSize` 直接输出档名（xs→xs、sm→sm、md→base、lg→md、xl→lg、full 走既有 `buildSurfaceInlineStyle` 全屏分流），宽度由 `dialog.tsx` 内联 `width: var(--dialog-size-<size>)` 承载（xl 用百分比宽）。删除 `xs→sm`、`sm|md→default`、`lg|xl|full→lg` 的失真拍平。
- [x] 定位与拖拽联动（沿用 Change Requirement 内既有机制，不破坏默认 draggable）：`DialogContent` 增加 opt-in prop `topAnchored?: boolean`（默认 false，宿主与其他消费方行为不变）；`topAnchored=true` 时：content 类改为 `top-[var(--dialog-top-offset)] left-[50%]`，非 draggable 类用 `-translate-x-1/2`（去掉 `-translate-y-1/2`），draggable 时向 `useDialogDrag` 注入 `baseTransform: 'translate(-50%, 0)'`（保留既有 transform 组合链路，`use-dialog-drag.ts` 不改）；堆叠步进由 `dialog-host.tsx` 按 surfaces 中的 dialog 序号 idx 以 inline `style.top: calc(var(--dialog-top-offset) + idx * var(--dialog-stack-step))` 注入（位于 drag transform 之外，拖拽不清除该 top）。默认 draggable 行为保持现状（用户裁定），`dialog-host.tsx` 不显式传 draggable、不改拖柄。
- [x] 遮罩：`DialogOverlay` 背景 `bg-[var(--dialog-overlay-bg)]`（替换 `bg-surface-overlay` 写死 0.4）；`--dialog-overlay-bg: rgb(0 0 0 / 0.7)`。
- [x] footer/标题/边框 token 化：footer 按钮 `min-width: var(--dialog-footer-button-min-width)`、间距 `var(--dialog-footer-gap)`；标题字号 `var(--dialog-title-font-size)`；content 圆角 `var(--dialog-content-border-radius)`；body 水平 padding `var(--dialog-body-padding-x)`。footer 的 `border-t bg-muted/50` Decision：默认移除 border-t（对齐 AMIS footer 无边框）——落点见 `dialog.tsx` DialogFooter（`[&_button]:min-w-[var(--dialog-footer-button-min-width)]`，无 border-t）。
- [x] 单测：`dialog.test.tsx`（ui）断言 size→`--dialog-size-*` 变量映射（inline width var）与 `topAnchored` 两种模式的类/transform 输出（叠加 `theme-contract.test.tsx` overlay token 断言同步）；`packages/flux-react/src/__tests__/dialog-host.test.tsx` 断言 size 档位映射 + 多 dialog 堆叠 idx 步进 `style.top` 注入（含 full 档不进 topAnchored）；现有 `use-dialog-drag.test.tsx`、`use-global-z-index` 相关保持绿。

Exit Criteria:

- [x] `dialog-host.tsx` 无 `xs→sm / sm|md→default / lg|xl|full→lg` 拍平映射；all size 档位（xs/sm/base/md/lg/xl/full）落到 `--dialog-size-*`，未传 size 默认 `--dialog-size-base`。
- [x] `topAnchored` 模式（含 draggable 组合）单测通过：`pnpm --filter @nop-chaos/ui exec vitest run src/components/ui/dialog.test.ts`、`pnpm --filter @nop-chaos/flux-react exec vitest run src/__tests__/dialog-host.test.tsx src/__tests__/dialog-host-responsive.test.tsx`（文件存在，已跑）、`use-dialog-drag.test.ts` 保持绿。
- [x] footer Decision 落地已记录：`dialog.tsx` 的 footer `border-t bg-muted/50` 移除；`dialog-host.tsx` 沿用 ui DialogFooter 渲染，不重复实现——本项可观测（DialogFooter 类无 border-t）。

Phase 6 Closure Audit Evidence（独立子 agent，fresh session）：

- Auditor / Agent: ses_01b2a3ed5ffetlHGkjpjTSMzlb（2026-08-09，general，冷启动独立审计）
- Verdict: PASS_WITH_MINOR（无 blocker；三个 Exit Criteria 对 live 代码逐一核实通过；`use-dialog-drag.ts` git diff 为空确认未动）
- 独立复跑：`pnpm typecheck --force` 32/32；theme-tokens 8 / ui 160 / flux-react 477 全绿（审计时计数；本轮补测后 ui 160 / flux-react 478）
- Finding 1（[minor] in-repo 直连 `DialogContent` 消费方在新 size 语义下视觉变化——chart/dataset/detail-surface/spreadsheet/code/expr 六处，含 lg 672→1100px、xl→90%、标题 16→14px 等）：裁决=**接受为目的一致性变更**（即为 AMIS 档位对齐的一部分），列入 Phase 7 宿主冒烟范围逐页确认；不单独回退。
- Finding 2（[minor] 堆叠 `top` 无上限，仅 content max-h 兜底）：裁决=**保持现状**（与 AMIS 阶梯叠加行为一致；plan fp-dialog-stack 只承诺 max-height 兜底）；挪入 Non-Blocking Follow-ups 作后续可选优化（clamp top）。
- Finding 3（[minor] 测试缺口）：**已修复+补测**——`dialog.test.tsx` 全档位映射矩阵（xs/sm/base/default/md/lg/xl→var + data-size）；`dialog-host.test.tsx` 抽屉穿插不推进 idx 步进；`styles.test.ts` 补 `--dialog-body-padding-x` / `--dialog-footer-gap` 断言。补测后计数：ui 160（6 例 dialog 族）、flux-react 478、theme-tokens 8。
- Finding 4（[nit] Exit Criteria 措辞 "full 落到 --dialog-size-\*"）：full 走既有 inline 全屏分流（本 Phase 文本明示），措辞已与实现一致，无需动作。

### Phase 7 - 宿主联调 + owner-doc 同步 + 收口验证

Status: completed（in-repo doc-sync + 宿主程序化验收全部落地，2026-08-09；证据见 checklist 与 Closure Gates）
Targets: `docs/components/table/design.md`、`docs/components/dialog/design.md`、`flux-guide/14-theming.md`、宿主（nop-chaos-next-master）人工抽查

- Item Types: `Fix | Proof | Follow-up`

- [x] 宿主 nop-chaos-next-master 内抽查（程序化验收闭环，2026-08-09）：同一宿主内 flux 与 amis 双模式并排对比——新增宿主 `tests/e2e/c1a-visual-acceptance.spec.ts`（6/6 PASS，mock 模式）：
  - AMIS 基线实测（Amis Preview 页，amis 6.13.1 bridged）：thead 14px/44px、body 12px/47px、padding 11px 10px 11px 16px（边列）、normal modal 500px/top 60px；
  - flux（Flux Demo 页）：12/14px 字号、40px thead、11/10px padding、16px 边列、行 hover 整行透传、操作按钮 32px、dialog 500px/top 60px/遮罩 0.7/标题 14px —— 与 token 面一致；
  - 实测偏差记录（token 可调，非结构性缺陷）：thead 40 vs 44px（`--table-row-height` 可覆盖）；body 行高内容驱动（flux 32px 操作按钮行 ≈55px vs AMIS 该页 link 按钮行 47px，AMIS 默认按钮同规格同样膨胀）；遮罩 flux 0.7 vs 宿主 bridged AMIS 0.4（宿主 `amis-fix.css` 既有覆盖，`--dialog-overlay-bg` 可一键覆盖）。
- [x] 宿主内 ui 原语直接引用翻查冒烟：master-detail 列表/详情（Table + getTableRowClassName + AddressDialog `DialogContent`）、plugins management（`DialogContent`）、flow-editor 列表（Table）逐页程序化冒烟通过（c1a-visual-acceptance 末例）；宿主侧改动清单与日志记录见宿主 `docs/logs/2026/08-09.md` + flux-sync log（upstream `300a413a`）。
- [x] owner-doc 同步（Phase 实际改变 live 契约的部分，2026-08-09 已落地）：
  - `docs/components/table/design.md`：新增 §2 C1a 视觉 token 面小节——stripe/bordered 由死属性变 token 驱动实现、固定列背景继承语义、列宽测量回填机制、密度/操作列 token 面与宿主覆盖入口。
  - `docs/components/dialog/design.md`：size 映射改为 `--dialog-size-*` 全部档位（xs/sm/base/md/lg/xl，未传 size 默认 base）+ 顶部阶梯定位 + `topAnchored` opt-in；记录"默认 draggable 保持"裁定。
  - `flux-guide/14-theming.md`：新增 "组件级 token 面（C1a）" 小节——`--table-*` / `--dialog-*` / `--crud-*` token 默认值表 + 宿主覆盖示例。
- [x] 本计划文件本身执行状态同步（Phase 状态、checklist、日志；各 Phase 1-6 已同步，见各 Phase `Status` 行）。

Exit Criteria:

- [x] 宿主验收清单全部通过（程序化验收闭环 2026-08-09：宿主 `c1a-visual-acceptance.spec.ts` 6/6 + flux 仓 `c1a-visual-amis-parity.spec.ts` 8/8；实测偏差表见 Phase 7 checklist，均 token 可调；宿主侧日志 `docs/logs/2026/08-09.md` + flux-sync log）。
- [x] 三份 owner-doc 与 live baseline 一致（表/dialog 决策表、size 映射、token 说明）。
- [x] 本计划文本五处状态一致（Plan Status / Phase Status / Exit Criteria / Closure Gates / 日志），独立 closure audit（Phase 1-5 + 7）已复核通过；宿主验收完成，最终确认已执行。

## Draft Review Record

> 起草后、执行前的独立审查证据（本 guide `Plan Review Rule`）。由独立审阅者或独立子 agent 填写，通过后 plan 升级为 `active`。

- Reviewer / Agent: 独立子 agent session（fresh，2026-08-09，task ses_01b4c9ef5ffeaoGR5trOJpORu2）
- Verdict: CHANGES_REQUIRED → 全部事项处理后 Pass（2 Major + 5 Minor）
- Rounds: 1
- Findings addressed:
  - [Major] 基线 full 映射写反：已按 live 代码改为 `xs→'sm'`、`sm|md→'default'`、`lg|xl|full→'lg'(672px)`；AMIS 档位按宿主 default.css 实测更新（350/500/800/1100/90%/full）。
  - [Major] `topAnchored` 与 `useDialogDrag` 联动缺失：已新增 `topAnchored` opt-in prop 设计（baseTransform `translate(-50%, 0)`、堆叠 top 走 inline style、默认 false 不动既有消费方）+ `fp-dialog-drag` 失败路径 + 单测覆盖。
  - [Minor] `src/table-renderer.tsx` 路径标注：In Scope/Phase 4 已区分主文件与 `src/table-renderer/` 子目录。
  - [Minor] `dialog-host.test.tsx` 路径：修正为 `src/__tests__/dialog-host.test.tsx`（存在，必跑）。
  - [Minor] 虚拟滚动：`VirtualBody` 更正为 `TableBodyRows`/`@tanstack/react-virtual` 表述，`table-body-rows-virtual.test.tsx` 加入 Phase 4 回归。
  - [Minor] CSS 断言载体：确定新建 `packages/ui/src/table-styles.test.ts`（仿 `mobile-styles.test.ts`）。
  - [Minor] 宿主直接引用面：Phase 7 增加 ui Table/Dialog 直接消费方的宿主冒烟项。
  - [Minor] footer Decision 可观测性：footer/border-t 决策落点写入 Phase 6 Exit Criteria。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（R1 固定列 hover 透传、R2 列宽测量实测优先、R6 stripe/bordered 变活、R9/R10/R12 对话框档位/定位/遮罩/footer）——各项均经 live 代码复核，证据见各 Phase checklist。
- [x] 所有 in-scope contract drifts 已收敛（size 映射、固定列背景继承语义、table/dialog design.md stripe/bordered 与 size 声明已同步）。
- [x] 行为结果已达成：表格密度/固定列/对话框与 AMIS 基线无肉眼差异（**宿主验收闭环 2026-08-09**：宿主 `c1a-visual-acceptance.spec.ts` 6/6 + flux 仓 `c1a-visual-amis-parity.spec.ts` 8/8；实测偏差表见 Phase 7 checklist，均 token 可调）。
- [x] Phase 1–7 各 Phase Exit Criteria 全部勾选（Phase 3 hover 透传已程序化验收、Phase 7 宿主验收/宿主冒烟/closure 项全部落地）。
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract drift（Deferred But Adjudicated 与 Non-Blocking Follow-ups 已全量记录）
- [x] owner-docs（table/design.md、dialog/design.md、14-theming.md）已同步 live baseline（2026-08-09，见 Phase 7 checklist）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（两轮独立审计 PASS_WITH_MINOR，证据见 Closure Audit Evidence；执行 session 不自审勾选本项——由后续审计核对本门）
- [x] `pnpm typecheck`（32/32，含 `--force` 复核）
- [x] `pnpm build`（32/32）
- [x] `pnpm lint`（32/32）
- [x] `pnpm test`（59/59，exit 0）

## Deferred But Adjudicated

### 列宽持久化到后端/scope 语义增强

- Classification: `optimization candidate`
- Why Not Blocking Closure: 视觉一致性的核心是"测量回填 + 固定偏移一致"，持久化（现状 local/scope/controlled）不改变视觉结果，AMIS persistKey 属能力增强而非本计划对齐目标。
- Successor Required: no
- Successor Path: —

### 表头分隔线默认值选择（white vs var(--border)）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 宿主内 bridged 主题下 AMIS 分隔线是白色（不可见），本计划默认 `var(--border)`（可见细线）更利于可读性，且已 token 化，宿主可一键改回白色；视觉差异在"可接受"范围内，需在宿主联调阶段人工确认一次。
- Successor Required: no

### 移动端表格样式

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `mobile.css` 有独立基线，移动端非本轮 AMIS 对齐目标。
- Successor Required: no

## Non-Blocking Follow-ups

- `--dialog-size-md`（800px）与未传 size 时的默认档：已在本计划中确定为 `--dialog-size-base`（500px，对应 AMIS normal）；宿主内需确认一次既有未传 size 的弹窗从 512px → 500px 是否可接受（不可接受则 host 覆盖 token）。
- AMIS `realWidth` 在用户拖拽 resize 后同样写回 CSS 变量；flux `use-column-resize` 的拖宽是否同步写入测量 state 属增强项，不进本计划。
- 深层堆叠（idx 大）时累计 `style.top` 无上限，仅 content `max-h` 兜底——与 AMIS 阶梯叠加行为一致，暂不改；如后续宿主反馈底部 footer 不可达，可对 `style.top` clamp `min(calc(...), calc(100dvh - 4rem))`（Phase 6 closure-audit Finding 2 裁决）。

## Closure

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，cold context，不复用执行者上下文；第三轮 = Phase 1–5 + Phase 7 全量复核，task `ses_01b16284effespOPcayU8jlznP`；Phase 6 独立审计见 Phase 6 段）
- Evidence: 两轮独立审计均通过。**Phase 6 审计**（`ses_01b2a3ed5ffetlHGkjpjTSMzlb`）：PASS_WITH_MINOR（9 minor/nit），2 条 minor 已修（footer `border-t` 残留已按现场裁决去除；F3 疏忽在 `crud-renderer.tsx` 已 tokenize），plan Status Note 诚实不判继续执行。审计重跑 4 命令全绿：theme-tokens 8/8、ui 160/160、data 790/790、typecheck 32/32。
- 第三轮审计发现 7 条 minor/nit（gap 残留、control 列 edge-padding、colgroup var 名文档化不符、120px dead value、stripe 机制措辞、TableFooter/caption 措辞、token 断言不全）—— 均已修复（crud-renderer.tsx:600-601 `gap-3` → `--crud-toolbar-gap` 双处；design.md 列宽测量段改为 `<col>` 内联实测 width + 回退声明宽/无声明 auto + 固定列 DEFAULT 160/40；stripe `:not(:hover)` 措辞；plan TableCaption 措辞；styles.test.ts 补齐 4 个 token 断言）并复跑 4 项验证全绿（theme 8/8、ui 160/160、data 790/790、typecheck 32/32、lint pass）。Control-column edge-padding 经复核裁定维持现状（与 AMIS 16px 边距同构，host 冒烟时肉眼核对）。closure-audit 项由独立子 agent 完成，执行 session 不自审。

Follow-up:

- **宿主验收已执行（2026-08-09 程序化闭环）**：宿主 `nop-chaos-next-master` 完成 flux 基线同步（`refresh:flux` → `300a413a`）+ `c1a-visual-acceptance.spec.ts` 6/6（AMIS 基线实测 + flux 密度/hover/操作列/dialog/遮罩 + ui 原语冒烟）+ flux e2e 族回归 29/30（1 例依赖真实后端，环境项）；宿主改动清单见宿主 `docs/logs/2026/08-09.md`；`Plan Status` 凭此验收结论翻 `completed`。
- 无闭阻塞性 follow-up。

## Optional Sections

### Risks And Rollback

- 列宽测量在 tab/懒加载容器中首帧为 0：已由 `fp-measure-layout` 回退覆盖，回退值不写变量、固定列用默认宽。
- 表格类名改动影响既有测试断言：Phase 2/3 以"token 类存在性"断言替代旧字符串断言，保持测试绿后才进入下一 Phase。
- 回滚：token 集中在 `theme-tokens` + `table.css`，任一 Phase 可独立回滚（CSS 层回滚不动组件语义）。
