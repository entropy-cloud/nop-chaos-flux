# UX-R2 透视表明细单元格空白修复

> Plan Status: completed
> Last Reviewed: 2026-10-01
> Source: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（PV-1/PV-2）、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` R2
> Related: `docs/components/pivot-table/design.md`（owner doc，§2/§5 已描述 totals 逐字段映射契约，需同步 leaf 防御语义）

## Purpose

把 `#/pivot-table-demo` 主透视表（Sales Pivot）从"明细单元格全空、只有小计有值"修复为"明细与小计都有值"，并在 pivot 选项构建层对该退化配置做输入防御，附带处理 PV-2 的截断/幽灵列观感问题。

## Current Baseline

- 活页探针已钉死根因：`dataConfig.totals.row.subTotalsDimensions` **包含 leaf 行维度**（demo 为 `['region', 'quarter']`，quarter 是最后一位行维度）时，VTable 所有明细单元格取值变为空串/undefined，小计/合计行仍有值。逐项排除证据（同一实例 `updateOption` 探针，`getCellValue(2,2)` 期望 1200）：
  - 纯配置/aggregationRules/aggregationRules+totals(region) → `1200` 正常；
  - 加 sortRules（sales DESC）/ filterRules（sales>500）/ `cornerTitleOnDimension: 'all'` → 均 `1200` 正常；
  - `subTotalsDimensions: ['region', 'quarter']` → `undefined`；仅 `['quarter']` → `undefined`；仅 `['region']` → `1200` 正常。
- `packages/flux-renderers-pivot/src/pivot-option.ts:137-155`（`normalizeTotalsSide`）把 `subTotalsDimensions` 原样透传 VTable，无 leaf 维度防御；`buildPivotOption`（:273-290 已归一化 rows/columns，:297 调 `buildTotals`）可从归一化后 rows/columns 末位取 effective leaf 键（跳过非法维度后末位可能变化）下传。
- 演示页 `apps/playground/src/pages/pivot-table-demo.tsx:76` 使用 `subTotalsDimensions: ['region', 'quarter']`，主表 24 条 SALES_RECORDS 明细全部空白（浏览器截图 `_tmp/ux-audit-2026-10-01/pivot-recheck.png`）。
- 现有测试 `pivot-option.test.ts` / `pivot-renderer.test.tsx` 全部 mock VTable，无法覆盖此 VTable 运行时行为；e2e `tests/e2e/pivot-table-demo.spec.ts` 已有 `__flux_pivot_demoSalesPivot` 实例锚点，但无明细取值断言。
- 告警机制：`pivot-option.ts:41-45` 的 `devWarn` 为无门控不去重的直发 `console.warn`；同包 `pivot-renderer.tsx:28-37` 已有 repo-wide `warnOnce` 惯例（`isDevRuntime()` 门控 + key 去重）——本计划新告警采用 warnOnce 契约，避免 schema 实时编辑等重渲染场景刷屏。audit 豁免按行匹配且含 `DEV_RECEIVER_AT_EOL` 前行行尾豁免（`find-ui-consistency-gaps.mjs:130,154-190`），`warnOnce(` 位于行首或行尾即可豁免折行形态。
- PV-2 残留：Filtered 卡 corner 头截断（"cate…"）、progressbar 值截断（"168.…"）、主表右缘幽灵半列——待执行期调查，VTable 宽度/角头配置若可低成本修复则一并处理，否则按 `Deferred But Adjudicated` 结构如实登记。

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
- `apps/playground/src/pages/pivot-table-demo.tsx`（subTotalsDimensions 收敛为 `['region']`；In Scope 其余条目见上）
- `tests/e2e/pivot-table-demo.spec.ts`（明细取值断言）
- `docs/components/pivot-table/design.md`（如描述 totals 契约则同步防御行为）
- `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（PV-1 根因补注）

### Out Of Scope

- VTable 上游 issue 跟进
- pivot 事件桥/主题 token 链路改动

## Failure Paths

| 可测场景编号                | 触发                                                                            | 行为                                                                                                                                                                                         | 可重试 | 用户可见表现                                           |
| --------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------ |
| pivot-leaf-row-subtotal     | `totals.row.subTotalsDimensions` 含最后一位 rowDimensions 的 dimensionKey       | 该条目被剔除，其余保留；warnOnce 告警（`isDevRuntime()` 门控 + key 去重，复用 `pivot-renderer.tsx:28-37` repo-wide 惯例）                                                                    | 否     | 明细正常渲染，leaf 级小计不渲染（VTable 下本就不可用） |
| pivot-leaf-row-subtotal-all | subTotalsDimensions 全部条目均为 leaf（如仅 `['quarter']`）                     | 条目全剔除后若数组为空且 `showSubTotals: true`，同时将 `showSubTotals` 置 false 并告警（避免 VTable「无 subTotalsDimensions 即全层级小计」语义重新引入退化形态；执行期以活页探针复核该语义） | 否     | 明细正常渲染，无小计行                                 |
| pivot-leaf-col-subtotal     | `totals.column.subTotalsDimensions` 含最后一位 columnDimensions 的 dimensionKey | 同 pivot-leaf-row-subtotal（同构防御，无独立活页证据，防同类退化；all 分支同理）                                                                                                             | 否     | 明细正常渲染                                           |

## Test Strategy

档位选择：`建议有测`

选项构建是纯函数，新增用例先红后绿；VTable 运行时行为（mock 不可达）用 e2e `getCellValue` 探针断言明细非空。

## Execution Plan

### Phase 1 - totals leaf 维度防御（pivot-option）

Status: completed
Targets: `packages/flux-renderers-pivot/src/pivot-option.ts`, `packages/flux-renderers-pivot/src/pivot-option.test.ts`

- Item Types: `Proof`, `Fix`

- [x] 新增用例（先红后绿，3 红→绿）：① `subTotalsDimensions: ['region','quarter']` → row 侧收敛为 `['region']` 且 warnOnce 告警被调用；② 仅 `['quarter']`（全 leaf）→ 条目清空且 `showSubTotals` 置 false + 告警；③ column 侧同构；④ 非 leaf 条目不受影响（`pivot-option.test.ts` totals leaf 维度防御 describe，4 用例）
- [x] 实现：新增 `pivot-warn.ts`（isDevRuntime + warnOnce + resetPivotWarnForTests，renderer 本地副本收敛为从此单一来源导入）；`buildPivotOption` 从归一化 rows/columns 末位取 effective leaf 键下传 `normalizeTotalsSide`（扩签名），`stripLeafSubtotalDimensions` 剔除 leaf 条目 + 全空联动关 showSubTotals；既有"逐字段映射"绿测的 schema 改两级维度以维持其逐字段语义（leaf 剔除语义由新用例覆盖）
- [x] `pnpm --filter @nop-chaos/flux-renderers-pivot test` 全绿（3 files / 63 tests）

Exit Criteria:

- [x] 新用例先红后绿，覆盖 row/column 两侧 leaf 剔除、全 leaf 分支（showSubTotals 联动关闭）与非 leaf 保留
- [x] `pnpm --filter @nop-chaos/flux-renderers-pivot test` 全绿（63 tests）

### Phase 2 - 演示页收敛与 e2e 回归网

Status: completed
Targets: `apps/playground/src/pages/pivot-table-demo.tsx`, `tests/e2e/pivot-table-demo.spec.ts`

- Item Types: `Fix`, `Proof`

- [x] demo `subTotalsDimensions` 改 `['region']`（防御后虽会被自动剔除，但演示页不得依赖告警路径，保持 console 干净——实测 badge 计数 0，无 pivot 告警）
- [x] e2e 新增断言（`tests/e2e/pivot-table-demo.spec.ts` detail cells probe 用例，4/4 全过）：坐标经布局扫描动态推导，兼容合并单元格时序（'小计'可在 col 0/1）：① North/Q1/Electronics/sales=1200 ✓；② West/Q3/Furniture/profit=164 ✓；③ North 小计行×Electronics/sales=4050 ✓
- [x] 浏览器实测截图存档 `_tmp/ux-audit-2026-10-01/pivot-fixed.png`、`pivot-filtered-fixed.png`（明细有值 + 单行高行 + 小计正确）

Exit Criteria:

- [x] e2e 明细断言通过（`npx playwright test tests/e2e/pivot-table-demo.spec.ts` 4 passed）
- [x] 演示页 console 无 pivot 告警（badge 0 实测）

### Phase 3 - PV-2 观感调查与文档同步

Status: completed
Targets: `packages/flux-renderers-pivot/src/`, `docs/components/pivot-table/design.md`, `docs/analysis/2026-10-01-playground-designer-ux-audit.md`

- Item Types: `Fix`, `Decision`

- [x] corner 头截断（"cate…"）已修：VTable corner 宽度取 defaultHeaderColWidth（80px 缺省），Filtered 卡字符串维度以字段名为标题超宽截断——demo 改显式短标题（`{dimensionKey:'category', title:'品类'}`），实测 corner 显示完整
- [x] progressbar 值截断（"168.…"）与主表右缘幽灵半列：移入 `Deferred But Adjudicated`（VTable 80px 缺省列宽 + 画布原生横向滚动行为；渲染器级宽度启发式会改变所有既有 pivot 视觉，收益/风险不匹配）
- [x] owner doc 同步：`docs/components/pivot-table/design.md` §2 决策表与 §5 映射表补记 leaf 防御语义；审计报告 PV-1 行补注根因与修复

Exit Criteria:

- [x] PV-2 三项逐项有归宿：corner 截断 landed；progressbar 截断/幽灵列移入 `Deferred But Adjudicated`（见下）
- [x] `docs/components/pivot-table/design.md` §2/§5 与实现一致（leaf 防御语义已记录）
- [x] 审计报告 PV-1 行与 live 事实一致

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，plan review 共 2 轮）
- Verdict: `pass-with-minors`（第 1 轮 revised：1 Major；第 2 轮全部解决，零 Blocker/Major）
- Rounds: 2
- Findings addressed: R2-M1（告警契约统一为 warnOnce：Failure Paths 与 Phase 1 一致）；Mn-1（行号 :76）/Mn-2（24 条记录）/Mn-3（DEV_RECEIVER_AT_EOL 豁免描述）/Mn-4（e2e 锚点布局扫描动态推导）/Mn-5（全 leaf 分支 + showSubTotals 联动）/Mn-6（Deferred But Adjudicated 结构）/Mn-7（owner doc 确定同步 §2/§5）全部落实；第 2 轮残留 2 条措辞类 Minor 已顺手修正。

## Closure Gates

- [x] Phase 1/2/3 全部 completed 且 Exit Criteria 全勾
- [x] 新增失败路径测试存在且通过（先红后绿记录在 daily log：`docs/logs/2026/10-01.md`）
- [x] 浏览器/e2e 实测证据存档（`_tmp/ux-audit-2026-10-01/pivot-fixed.png`、`pivot-filtered-fixed.png`；e2e 4 passed）
- [x] `pnpm typecheck`（exit 0，2026-10-01，pipefail 实跑）
- [x] `pnpm build`（exit 0，2026-10-01）
- [x] `pnpm lint`（exit 0，2026-10-01）
- [x] `pnpm test`（78 tasks 全绿，2026-10-01）
- [x] `pnpm check`（零新增红项；首轮 knip 命中 pivot-warn.ts#isDevRuntime 未使用导出，改模块私有后归零，2026-10-01）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Non-Blocking Follow-ups

- VTable leaf-subtotal 行为向上游报告/跟进（含版本升级评估）
- pivot 明细行的双行高度残迹（leaf 小计配置去除后应消失，执行期复核）

## Deferred But Adjudicated

### progressbar 指标值截断（"168.…"）与主表右缘幽灵半列

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 两者均为 VTable 80px 缺省列宽与画布原生横向滚动的表现，非数据/交互缺陷；渲染器级宽度启发式（按内容自适应列宽/自适应填充）会改变所有既有 pivot 视觉密度，需要独立设计与视觉回归覆盖，不阻塞"明细有值"这一核心结果面收敛。
- Successor Required: `no`
- Successor Path: 归 roadmap R10（演示页观感治理）或独立 pivot 宽度策略 plan；VTable 上游跟进见 Non-Blocking Follow-ups。

## Closure

Status Note: 2026-10-01 收口。leaf 小计防御（pivot-option 纯函数层 + warnOnce 共享模块）、demo 收敛、e2e 明细探针、owner doc/审计报告同步全部落地；corner 截断修在 demo 显式标题；progressbar 截断/幽灵半列按 Deferred 结构登记。全量门禁实跑全绿（typecheck/build/lint exit 0、test 78 tasks、check 零新增红项含 knip 归零）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session closure audit，2026-10-01，一轮 approved）
- Evidence: 审计员实跑 pivot 包 63 tests 全绿、`pnpm typecheck`（pipefail exit 0）、`pnpm check` exit 0（含 knip 无未使用导出）；逐条核对 Phase 1/2/3 Exit Criteria live 证据（pivot-option.ts:186,347-350 调用链确认非仅定义、pivot-option.test.ts:419-488、pivot-table-demo.tsx:76,112、pivot-table-demo.spec.ts:29-79、design.md:26,114、ux-audit:119,132）；Deferred 分类诚实性与 plan/daily-log 文本一致性核查通过。记录于 `docs/logs/2026/10-01.md`。
