# Round 03 — table maxWidth 修复的覆盖不对称（非 sticky 配置下控制列仍会拉伸）

> 执行：open-audit 2026-08-09（mission `component-audit-round2`）
> 视角：组合爆炸测试者（round-01 的延续：沿 P1 影响范围深挖）
> 去重：round-01 已报「普通列被过度封顶」；本文件补报其姊妹面「控制列在非 sticky 配置下未被覆盖」。

## 发现（P1 的 facet B，随 round-01 的 P1 一并处理）

- **位置**：
  - `table-header-row.tsx:396-422` / `:528-557`（selection/expand 表头 cell 硬编码 `width: '40px'`，无 maxWidth）
  - `table-body-row-rendering.tsx:250-299`（selection/expand 表体 cell 直接 `getSelectionCellProps().style`，非 sticky 时为 `{}`，无宽度）
  - `fixed-columns.ts:99-121`（`resolveEntry` 非 sticky 返回 `{}`）
- **是什么**：`createStickyStyle` 的 `maxWidth` 只在列真正 sticky（存在 fixed 数据列）时输出。当表格有 `rowSelection`/`expandable` 但**没有任何 fixed 数据列**（最常见的 CRUD 选择表格形态）：
  1. 表头 selection/expand cell = `width:40px`（无 maxWidth）→ auto 布局下仍参与剩余空间分配，**依旧会被拉伸**；
  2. 表体 selection/expand cell = 无任何宽度样式 → 随列宽伸缩。
     即作者要修的原始缺陷（控制列过宽）在该配置下原样保留——修复只覆盖了 sticky 配置，而副作用（round-01）却覆盖了所有配置。
- **修复方向**：把控制列的宽度策略与 sticky 无关化——表头/表体控制 cell 无条件 `width/minWidth/maxWidth = CONTROL_COLUMN_WIDTH`，再叠加 sticky 样式。
- **信心水平**：确定（代码直读：非 sticky 分支的 cell 样式不含 maxWidth）。
