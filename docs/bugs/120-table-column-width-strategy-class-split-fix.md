# 120 Table Column-Width Strategy Class-Split Fix (maxWidth 过度矫正 + 非 sticky 控制列拉伸)

## Problem

- 未提交的 table maxWidth 修复（daily log 2026-08-09 顶部 WIP，回应「NopAuthPosition crud 序号列过宽」反馈）对**所有**表头 cell 施加 `width/minWidth/maxWidth = resolvedWidth`，叠加 `getColumnWidth` 的 120 fallback（`initialWidths` 对每个可 resize 列预填 120、`effectiveMainColumns` 把 120 写回 `column.width`）——所有无显式 width 的普通数据列被硬性封顶 120px。
- 同一修复覆盖不对称：`maxWidth` 只在 sticky 配置下输出（`createStickyStyle`），最常见的 CRUD 形态（rowSelection 且无 fixed 列）下 selection/expand 控制列仍被 auto 布局拉伸（真实浏览器实测 ~65px，声明 40px）——原始「序号/checkbox 列过宽」反馈原样保留。
- 附带注释事实性错误：`MemoizedDataRow` 的 H10 注释声称比较器「已包含 `fixedColumnLayout`」，实际比较器无此项。

## Diagnostic Method

- 诊断难度：低（代码直读即可定位 maxWidth 输出点与 120 fallback 链）；像素后果需真实浏览器确认。
- 调查路径：
  1. `table-header-row.tsx:176-181` 对全部表头 cell 输出 `{ width, minWidth, maxWidth }`——无 width 列经 `getColumnWidth` 恒得到 120。
  2. `use-column-resize.ts:28-30/142/237-240`：`initialWidths` 预填 + `getColumnWidth` 的 120 fallback 使 fallback 从「建议值」变成「硬上限」；`table-renderer.tsx:293-314` 把 120 写回列 schema。
  3. `fixed-columns.ts:99-121`：`resolveEntry` 非 sticky 返回 `{}` → 控制列非 sticky 无宽度约束。
- **真实浏览器发现（写 bug note 时记录）**：Chromium auto 表格布局**忽略** cell 上的 `max-width`——WIP 的 120px 封顶并未冻结列宽（默认表格仍填满容器，列宽按内容 76-362px 分布）；但 `min-width` 生效、非 sticky 控制列实测被拉伸到 ~65px。即 WIP 的像素级后果弱于静态分析预测，语义性错误（把无 width 列全部当作 120 建议宽度）与 P1-02 缺陷为实。

## Root Cause

- maxWidth/宽度策略没有按列类别区分：sticky/控制列（应封顶，不参与剩余空间分配）与普通数据列（应保持 auto 拉伸填满 `w-full` 容器）共用同一逻辑。
- `getColumnWidth` 的 120 fallback 位置错误：应只在**拖拽起始值**（`startResize`/`stepResize`）使用，而不是渲染宽度；`initialWidths` 预填把 fallback 变成渲染期恒值并经 `effectiveMainColumns` 写回 schema。
- 控制列宽度封顶与 sticky 耦合：非 sticky 配置下无 maxWidth 约束。
- jsdom 无法执行 CSS 表格布局，WIP 验证（daily log 的 resize 交互验证）只覆盖 sticky 覆盖行为，未覆盖普通列/控制列像素行为——审计盲区。

## Fix

- `use-column-resize.ts`：`initialWidths` 只预填**有合法显式 width 且可 resize** 的列；`getColumnWidth` 改为返回 `widths[key] ?? column.width`（无 width 列返回 `undefined`，回落到 schema 语义，不再发明 120）；`resolveColumnWidth` 120 fallback 仅保留在拖拽/键盘步进起始值。`ColumnResizeApi.getColumnWidth` 类型放宽为 `number | string | undefined`。
- `fixed-columns.ts`：`resolveEntry` 对 `__selection__`/`__expand__` 无条件输出 `width/minWidth/maxWidth = CONTROL_COLUMN_WIDTH`（非 sticky 也封顶），sticky 时叠加 `createStickyStyle`——控制列宽度与 sticky 解耦。
- `table-header-row.tsx`：表头控制 cell 不再裸 `width:'40px'`，统一消费 `fixedColumnLayout.getSelectionCellProps()/getExpandCellProps()`；普通列表头仅当 `resolvedWidth`（显式 width 或 resize 结果）存在时输出 `width/minWidth/maxWidth`。
- `table-renderer.tsx` `effectiveMainColumns`：无需改动即收敛——`widths` 不再包含无 width 列的 120 预填，写回只发生在真实 resize 结果。
- H10（P2-01）：`MemoizedDataRow` 注释声称比较器「已包含 `fixedColumnLayout`」、实际未比较——先补比较项（unit 断言过），但真实浏览器 locality 诊断（`performance-table.spec.ts:349`）暴露该比较项把 sibling probe delta 0 → 2（layout 身份随 render 派生输入 churn）→ 撤比较项，**改写 H10 注释**如实描述覆盖关系（comparator 按内容覆盖全部 layout 输入：`areColumnsRenderEquivalent` 含 fixed/width + rowSelection + showExpandColumn 直接比较，内容相等则无 stale 风险），并记录不采用身份比较的理由与 locality 实测证据。

## Tests

- 单元（`table-column-width-strategy.test.tsx`，9 断言，RED→GREEN）：无 width 列表头不产出宽度样式；显式 width 列 `width/minWidth/maxWidth = 声明值`；非 sticky 控制列（表头/表体/layout props）三件套 = 40px；sticky 列保留 position + 三件套；`columnResize:false` 收敛（`getColumnWidth` 返回声明值或 undefined，无 120 fallback）；`widths` 只跟踪显式 width 列；H10 locality 契约（内容相等的 layout 身份 churn 不触发行重渲染，防止破坏 locality 回归）。
- 真实浏览器 e2e（`tests/e2e/table-column-width-layout.spec.ts`，新宿主页 `#/table-column-width`）：默认无 width 表格列宽合计 = 容器宽（886 = 886）且表头无内联宽度样式（WIP 先红：内联 `width/minWidth/maxWidth=120px`）；rowSelection 无 fixed 列时 selection 列 = 40px（WIP 先红：实测 ~65px）。全为 programmatic 断言（getBoundingClientRect/inline style），无截图依赖。
- 顺带收口（同批未提交 WIP 的 jsdom 噪音回归）：`useTableColumnWidths` 的「全部缺失」测量告警不再触发（仅部分失败告警）——jsdom/happy-dom 无布局能力或首帧不可见属预期瞬态（digest 重测自愈），否则 playground jsdom 测试渲染表格即告警；`column-width-measure.ts` 与 `table-renderer.tsx` 的 5 处预存 react-hooks lint 错误（eslint cache 掩盖）一并清理（`digestKey` 稳定 key 依赖 + 单行 disable 附理由）。
- `pnpm --filter @nop-chaos/flux-renderers-data test` = 790 passed（770 基线 + 20 净增：宽度策略 9 + 测量告警 2 + 既有测量/索引套件净变化）；全仓 `pnpm test` = 10,748 passed / 0 failed。

## Affected Files

- `packages/flux-renderers-data/src/table-renderer/use-column-resize.ts`
- `packages/flux-renderers-data/src/table-renderer/fixed-columns.ts`
- `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx`
- `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`
- `packages/flux-renderers-data/src/table-renderer/column-width-measure.ts`（顺带：jsdom 告警噪音 + lint 清理）
- `packages/flux-renderers-data/src/table-renderer.tsx`（顺带：lint 清理）
- `packages/flux-renderers-data/src/__tests__/table-column-width-strategy.test.tsx`、`table-data-and-layout.test.tsx`、`table-column-width-measure.test.tsx`
- `apps/playground/src/pages/table-column-width-demo.tsx`（e2e 宿主 fixture，新路由 `#/table-column-width`）
- `tests/e2e/table-column-width-layout.spec.ts`、`tests/e2e/playground-entry-pages.spec.ts`（路由清单补登）

## Notes For Future Refactors

- 表格列宽策略按列类别区分：**sticky/控制列封顶、普通数据列 auto 拉伸**。任何「给所有列加 width」的修复都必须先确认 `getColumnWidth` 的 fallback 不会把建议值变成渲染期硬上限。
- Chromium auto 表格布局忽略 cell `max-width`（`min-width` 生效）——不能依赖 maxWidth 做像素级封顶验证；非 sticky 控制列必须靠 `minWidth/maxWidth` 双约束。
- `initialWidths` 预填 = 渲染期宽度输入，任何 fallback 都会经 `effectiveMainColumns` 写回列 schema——预填只允许显式 width。
- jsdom 验证不了 CSS 表格布局：涉及列宽/拉伸的改动必须补真实浏览器宿主断言（本 bug 的 e2e 页 `#/table-column-width` 可复用）。
