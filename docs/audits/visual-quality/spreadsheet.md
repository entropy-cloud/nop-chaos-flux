# 视觉质量证据卡：Spreadsheet（V6）

> 状态: adjudicated（plan 476 执行完毕，findings 三态裁定落卡）
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §5（三轮独立核实）、`docs/analysis/visual-quality/V6-spreadsheet-visuals.md`（独立核实 pass，4 项勘误回写）
> Owner plan: `docs/plans/476-visual-quality-v6-spreadsheet-tokenization-plan.md`
> Owner docs: `docs/components/spreadsheet-page/design.md`、`docs/architecture/report-designer/spreadsheet-canvas-css.md`

## Findings 清单

- [V6-F1] 浅色硬编码零 dark：`canvas-styles.css`（894 行）29 处浅色 hex 写死（`#1a1a1a/#ffffff/#0f9d58/#1a73e8/#e3f2fd` 等），零 dark 变体；以 report 画布共用为约束
  - 证据: 普查 §5（hex 计数 29 经核实员全量清点确认；另查明约 38 行 light-only rgb()/rgba() 与 2 处固定色 hsl() 同属 dark 击穿面）
  - 裁决: **landed（plan 476 Phase 1）**——29 hex + 38 rgb()/rgba() + 2 hsl() 全量收敛：结构色接既有 `--nop-*`（无 fallback 契约维持）、画布专属/语义色收敛为 `--ss-*` 令牌族（43 个，`:root` 发布 + `:root[data-mode='dark']` dark 变体；文件内大量历史裸 data-slot 选择器无统一包裹根，:root 发布是覆盖全部消费点的唯一方式）；R1 三 dangling 令牌 4 处消费迁移；R2 `frozen-row` 死类改 `data-frozen-row` 属性 + 令牌化规则；R3 `ss-grid-shell` 与 `.ss-grid` 死规则/死类删除（执行期发现后者亦零消费）；R5 选中底色 rgba(41,98,255) 入 `--ss-selected-overlay/--ss-range-overlay`；R7 fill-handle z-index 5→7（高于冻结分隔线 z6）。守卫单测（禁 hex 全文件、彩色字面值仅限定义块、禁 dangling 令牌）先红后绿
  - 状态: closed
- [V6-F2] 单元格值无类型区分：数字/日期/文本同渲染（无对齐与格式区分）
  - 证据: 普查 §5；核实确认渲染端 `String(cell.value)` 直出、numberFormat storage-only、type/numberFormat 字段已在 core
  - 裁决: **landed（plan 476 Phase 2）**——`resolveCellTypeDisplay` 渲染端分派（`mapCellStyle` 保持纯 style 入参）：数值 → `ss-type-number` 右对齐 + numberFormat 最小子集（`0`/`0.00`/`#,##0`/`#,##0.00`/`0%`/`0.00%`，其余原样不抛错）；`type: 'date'`/ISO 串 → `ss-type-date` + toLocaleDateString；显式 textAlign 优先于类型推断；零 schema 变更。8 个单测
  - 状态: closed
- [V6-F3] 条件格式缺失、筛选仅显隐行
  - 证据: design.md 自认第一阶段
  - 裁决: **adjudicated as out-of-scope improvement（R9）**——显式空白非缺陷，能力型缺失归 spreadsheet 域功能 roadmap
  - 状态: closed（out-of-scope）
- [V6-F4] e2e 极薄：无 dark、无冻结/填充柄/选中态视觉断言
  - 证据: 普查 §5 + V0 研究报告 §2
  - 裁决: **landed（plan 476 Phase 3）**——`spreadsheet-visual-tokens.spec.ts` 3 用例：cell/gridline 双态翻转 + `--ss-gridline` dark 值断言、active outline 双态翻转、report-designer 画布共用点 `--ss-*` 接收与 dark 翻转（双路由锁共用约束）；spreadsheet-demo 10 test 与 report-designer-demo 全量零回归
  - 状态: closed

## 补充候选

- R1 未定义令牌消费（--nop-background/--nop-ring/--nop-destructive，4 处）——**landed**（迁移到已定义令牌，守卫模式级 regex 拦截回填）。closed
- R2/R3 死类（frozen-row/ss-grid-shell）+ `.ss-grid` 死规则块——**landed**（处置方式见 F1）。closed
- R6 状态色「调试感」视觉语言 —— **adjudicated as watch-only**（重设计超令牌化边界，令牌化后单点可调）。closed（watch-only）
- R7 fill-handle z-index 遮挡 —— **landed**（z 5→7，实测风险成立面消除）。closed
- R8 滚动条原生样式 dark —— **adjudicated as watch-only**（::-webkit-scrollbar 高度 0 隐藏策略下影响极小）。closed（watch-only）
- R9 斑马纹/条件格式 —— 见 F3。closed（out-of-scope）

## 视觉证据

`tests/e2e/spreadsheet-visual-tokens.spec.ts`（L3 计算样式：light↔dark 翻转 + `--ss-gridline` 双态值 + report 共用路由）+ `canvas-styles.test.ts` 守卫（先红后绿）+ `cell-style-map.test.ts` 值类型分派 8 用例。

## Closure

（V6 closure audit 后回写）
