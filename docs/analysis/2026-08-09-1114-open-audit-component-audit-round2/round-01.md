# Round 01 — 未提交 table maxWidth 修复的布局副作用

> 执行：open-audit 2026-08-09（mission `component-audit-round2`）
> 视角：组合爆炸测试者（"独立正确的两个特性组合"）+ 异常路径侦探
> 去重：工作区未提交 diff 中 `flux-renderers-data` 表渲染宽度改动；多维度审计（2026-08-09-1114-multi-audit）仅覆盖 closeOnSubmit 面，未覆盖本改动。

## 背景

`git status` 显示未提交 WIP：`fixed-columns.ts` / `table-body-row-rendering.tsx` / `table-header-row.tsx` + 2 个测试文件为「序号列被 table-layout:auto 剩余空间拉伸变宽」修复（daily log 2026-08-09 顶部条目）。改动核心 = 在 sticky 单元格（`createStickyStyle`）与普通表头/序号列 cell 上补 `maxWidth: width`。

## 发现

### [P1] 非固定、无 width 列被硬性封顶 120px：默认表格不再填满容器 + 宽内容表头/表体错位

- **位置**：
  - `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:163,176-181`（新增 maxWidth 分支）
  - 配合 `use-column-resize.ts:237-243`（`getColumnWidth` → `widths[key] ?? resolveColumnWidth(column)` → 无 width 列 fallback 120）与 `table-renderer.tsx:293-314`（`effectiveMainColumns` 把 120 写回 `column.width`）
  - `table-renderer.tsx:284`（`columnResize` 默认开启：`schemaProps.columnResize !== false`）
- **是什么**：修复意图只针对 sticky/控制列（`fixed-columns.ts` 的 `createStickyStyle` 处是对的），但 `table-header-row.tsx` 把 `maxWidth: resolvedWidth` 应用到了**所有**表头单元格；对没有显式 width 的普通列，`resolvedWidth` 来自 `getColumnWidth` 的 120 fallback（`initialWidths` 对每个可 resize 列都预填 120）。于是所有无 width 列的表头都被硬性 `width/minWidth/maxWidth = 120` 封顶。浏览器 auto 布局下：
  1. **列不再吸收剩余空间**（max-width=width 的单元格不能参与剩余空间分配）→ `w-full` 表格（`ui/table.tsx:11`）右侧出现空余空白，列不再拉满容器；
  2. 内容（`whitespace-nowrap`）宽于 120 时，表体单元格 min-content 会把列撑宽，但表头被 maxWidth 封在 120 → **表头比列窄**，表头背景/边框与列错位；
  3. `columnResize: false` 时同样生效（`getColumnWidth` 对非 resizable 列仍 fallback 120），即任何配置下无 width 列都停止拉伸。
- **根因**：修复正确目标（sticky 列不拉伸）被实现为「所有表头 cell 不拉伸」，未区分 sticky 列与普通列；叠加 `getColumnWidth` 的 120 fallback（本身是既有怪癖：无 width 列被当作 120 处理），从「建议值 120 可拉伸」变成「硬上限 120」。
- **影响范围**：所有默认 table（columnResize 默认开、列大多不写 width）——即 playground/CRUD 最常见形态；日志中「resize 交互验证……maxWidth 不引入新限制」只验证了 index/selection 列的 sticky 覆盖，未覆盖普通列。
- **为什么值得关心**：修复本身的动机场景（序号列过宽）被过度矫正为全局列宽冻结；一旦提交将肉眼可见地破坏默认表格布局。
- **修复方向**：只对 sticky/控制列施加 maxWidth（`createStickyStyle` 已足够），`table-header-row.tsx` 的 maxWidth 分支应仅在 `column.width`（或 widths map 实条目）存在时输出；或让 `getColumnWidth` 对无 width 列返回 undefined，header 回落到 `column.width` 语义。
- **信心水平**：很可能（代码级事实 100% 确认：无 width 列 → header `width:120/minWidth:120/maxWidth:120` + body `width:120`；布局后果基于 CSS auto 表格布局语义，需真实浏览器 e2e 最终像素验证）。
- **验证建议**：真实浏览器 host 场景——默认 schema（列无 width）表格断言「列宽和 = 容器宽」或「末列右缘贴齐容器」；以及宽内容列断言表头/表体同宽。jsdom 无法验证布局。
