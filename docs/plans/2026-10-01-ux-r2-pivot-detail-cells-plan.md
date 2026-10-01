# UX-R2 透视表明细单元格空白修复

> Plan Status: draft
> Last Reviewed: 2026-10-01
> Source: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（PV-1/PV-2）、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` R2
> Related: `docs/components/pivot-table/design.md`（owner doc，落地时核对是否描述 totals 契约）

## Purpose

把 `#/pivot-table-demo` 主透视表（Sales Pivot）从"明细单元格全空、只有小计有值"修复为"明细与小计都有值"，并在 pivot 选项构建层对该退化配置做输入防御，附带处理 PV-2 的截断/幽灵列观感问题。

## Current Baseline

- 活页探针已钉死根因：`dataConfig.totals.row.subTotalsDimensions` **包含 leaf 行维度**（demo 为 `['region', 'quarter']`，quarter 是最后一位行维度）时，VTable 所有明细单元格取值变为空串/undefined，小计/合计行仍有值。逐项排除证据（同一实例 `updateOption` 探针，`getCellValue(2,2)` 期望 1200）：
  - 纯配置/aggregationRules/aggregationRules+totals(region) → `1200` 正常；
  - 加 sortRules（sales DESC）/ filterRules（sales>500）/ `cornerTitleOnDimension: 'all'` → 均 `1200` 正常；
  - `subTotalsDimensions: ['region', 'quarter']` → `undefined`；仅 `['quarter']` → `undefined`；仅 `['region']` → `1200` 正常。
- `packages/flux-renderers-pivot/src/pivot-option.ts:137-155`（`normalizeTotalsSide`）把 `subTotalsDimensions` 原样透传 VTable，无 leaf 维度防御。
- 演示页 `apps/playground/src/pages/pivot-table-demo.tsx:77` 使用 `subTotalsDimensions: ['region', 'quarter']`，主表 12 条 SALES_RECORDS 明细全部空白（浏览器截图 `_tmp/ux-audit-2026-10-01/pivot-recheck.png`）。
- 现有测试 `pivot-option.test.ts` / `pivot-renderer.test.tsx` 全部 mock VTable，无法覆盖此 VTable 运行时行为；e2e `tests/e2e/pivot-table-demo.spec.ts` 已有 `__flux_pivot_demoSalesPivot` 实例锚点，但无明细取值断言。
- PV-2 残留：Filtered 卡 corner 头截断（"cate…"）、progressbar 值截断（"168.…"）、主表右缘幽灵半列——待执行期调查，VTable 宽度/角头配置若可低成本修复则一并处理，否则如实登记 follow-up。
- `pnpm check` 的 `hardcoded-cjk-ui-copy` 规则按行匹配：CJK 文案须与 `devWarn(`/`warnOnce(`/`console.*(` 同行才豁免；`pivot-option.ts` 既有 devWarn 为短中文同 行写法，新告警沿用该文件惯例且保证 prettier 不折行。

## Goals

- `buildPivotOption` 对 leaf 行/列维度上的 `subTotalsDimensions` 条目做防御性剔除 + dev 告警（row 侧有活页证据，column 侧同构预防），明细不再被 VTable 静默吞掉。
- `#/pivot-table-demo` 主透视表明细单元格渲染出数值（North/Q1/Electronics/sales = 1200 等锚点），小计/合计保持正确。
- e2e 增加明细取值程序化断言，作为 VTable 真实行为的回归网（单测 mock 不到这层）。
- PV-2 三项观感问题逐项给出修复或如实登记。

## Non-Goals

- 不升级/替换 `@visactor/vtable` 依赖版本（该行为是否属上游 bug 的上游跟进归 Non-Blocking Follow-up）。
- 不改 pivot schema 公共字段语义（`subTotalsDimensions` 字段保留，仅运行时防御 leaf 条目）。
- 不处理 pivot 主题/暗色链路（已有独立覆盖）。

## Scope

### In Scope

- `packages/flux-renderers-pivot/src/pivot-option.ts`（totals 防御）
- `packages/flux-renderers-pivot/src/pivot-option.test.ts`（新用例）
- `apps/playground/src/pages/pivot-table-demo.tsx`（subTotalsDimensions 收敛为 `['region']`）
- `tests/e2e/pivot-table-demo.spec.ts`（明细取值断言）
- `docs/components/pivot-table/design.md`（如描述 totals 契约则同步防御行为）
- `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（PV-1 根因补注）

### Out Of Scope

- VTable 上游 issue 跟进
- pivot 事件桥/主题 token 链路改动

## Failure Paths

| 可测场景编号            | 触发                                                                            | 行为                                                     | 可重试 | 用户可见表现                                           |
| ----------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------- | ------ | ------------------------------------------------------ |
| pivot-leaf-row-subtotal | `totals.row.subTotalsDimensions` 含最后一位 rowDimensions 的 dimensionKey       | 该条目被剔除，其余保留；dev 环境一次性告警（同签名去重） | 否     | 明细正常渲染，leaf 级小计不渲染（VTable 下本就不可用） |
| pivot-leaf-col-subtotal | `totals.column.subTotalsDimensions` 含最后一位 columnDimensions 的 dimensionKey | 同上（同构防御，无独立活页证据，防同类退化）             | 否     | 明细正常渲染                                           |

## Test Strategy

档位选择：`建议有测`

选项构建是纯函数，新增用例先红后绿；VTable 运行时行为（mock 不可达）用 e2e `getCellValue` 探针断言明细非空。

## Execution Plan

### Phase 1 - totals leaf 维度防御（pivot-option）

Status: planned
Targets: `packages/flux-renderers-pivot/src/pivot-option.ts`, `packages/flux-renderers-pivot/src/pivot-option.test.ts`

- Item Types: `Proof`, `Fix`

- [ ] 新增用例（先红）：`subTotalsDimensions: ['region','quarter']` → `dataConfig.totals.row.subTotalsDimensions` 收敛为 `['region']` 且 console.warn 被调用；column 侧同构用例；非 leaf 条目不受影响
- [ ] 实现：`normalizeTotalsSide` 接收 leaf 维度键，剔除 leaf 条目 + `devWarn`（沿用该文件短中文同行写法，同签名去重可放宽为每次构建告警——构建频度低，按文件内既有 devWarn 直发惯例）
- [ ] `pnpm --filter @nop-chaos/flux-renderers-pivot test` 全绿

Exit Criteria:

- [ ] 新用例先红后绿，覆盖 row/column 两侧 leaf 剔除与非 leaf 保留
- [ ] `pnpm --filter @nop-chaos/flux-renderers-pivot test` 全绿

### Phase 2 - 演示页收敛与 e2e 回归网

Status: planned
Targets: `apps/playground/src/pages/pivot-table-demo.tsx`, `tests/e2e/pivot-table-demo.spec.ts`

- Item Types: `Fix`, `Proof`

- [ ] demo `subTotalsDimensions` 改 `['region']`（防御后虽会被自动剔除，但演示页不得依赖告警路径，保持 console 干净）
- [ ] e2e 新增断言：`__flux_pivot_demoSalesPivot` 实例 `getCellValue` 探针——明细锚点（North/Q1/Electronics/sales=1200、West/Q3/Furniture/profit=164）非空且数值正确；小计行（4050/6850）保持
- [ ] 浏览器实测截图存档 `_tmp/`（明细有值 + 无 leaf 小计行）

Exit Criteria:

- [ ] e2e 明细断言通过（`pnpm test:e2e -- pivot-table-demo` 或等效过滤执行）
- [ ] 演示页 console 无 pivot 告警（配合 R6 的 console 噪音基线）

### Phase 3 - PV-2 观感调查与文档同步

Status: planned
Targets: `packages/flux-renderers-pivot/src/`, `docs/components/pivot-table/design.md`, `docs/analysis/2026-10-01-playground-designer-ux-audit.md`

- Item Types: `Fix`, `Decision`

- [ ] 调查 corner 头截断（"cate…"）：确认 VTable corner 宽度机制，能低成本修复则修（如 corner headerStyle/宽度下限），否则登记 follow-up
- [ ] 调查 progressbar 值截断（"168.…"）与主表右缘幽灵半列，同上裁定修/登
- [ ] owner doc 核对与同步；审计报告 PV-1 行补注根因与修复

Exit Criteria:

- [ ] PV-2 三项逐项有归宿：landed 或 `Non-Blocking Follow-ups` 带明确理由
- [ ] `docs/components/pivot-table/design.md` 与实现一致（或记录无需更新理由）
- [ ] 审计报告 PV-1 行与 live 事实一致

## Draft Review Record

- Reviewer / Agent: 待独立子 agent review
- Verdict: pending
- Rounds: 0
- Findings addressed: —

## Closure Gates

- [ ] Phase 1/2/3 全部 completed 且 Exit Criteria 全勾
- [ ] 新增失败路径测试存在且通过（先红后绿记录在 daily log）
- [ ] 浏览器/e2e 实测证据存档
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新增红项）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Non-Blocking Follow-ups

- VTable leaf-subtotal 行为向上游报告/跟进（含版本升级评估）
- pivot 明细行的双行高度残迹（leaf 小计配置去除后应消失，执行期复核）

## Closure

Status Note: —

Closure Audit Evidence:

- Auditor / Agent: —
- Evidence: —
