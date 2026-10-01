# UX-R1 Dashboard Editor 图表渲染断链修复

> Plan Status: completed
> Last Reviewed: 2026-10-01
> Source: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（DB-1/DB-2，DB-3 复核后改判）、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` R1
> Related: `docs/components/dashboard-editor/design.md`（owner doc，落地时核对）

## Purpose

把 Dashboard Editor 演示页（`#/dashboard-demo`）从"图表面板静默空白"修复为"图表渲染出数据序列"，并把 chart 渲染器的静默空白失败路径改为可观测（空态 + dev 告警），附带修正演示布局导致的表格截断。

## Current Baseline

- `apps/playground/src/pages/dashboard-demo.tsx:50-58` 的 chart 面板 series 配置为 `series: [{ name: 'Sales', data: '${salesSeries}' }]`，而 `source: '${salesData}'` 行结构是 `{month, sales}`。chart 渲染器（`packages/flux-renderers-data/src/chart-renderer.tsx`）在 source 非空时以 source 为数据集（cartesianData :194-207），series dataKey 回退为 `s.dataRegionKey ?? s.name ?? 'value'`（line :462 / area :508 / bar :545，汇总 :259），source 行无 `'Sales'` key → 所有值 undefined → 画布只剩网格/坐标轴；且 `isEmpty`（:225-227）判定为 false → 空态也不显示。实测 `#/dashboard-demo` 等待 6s 图表仍空白。
- 运营大屏页（complex-pages/dashboard.json）使用同型 chart 渲染器但 series 用 `dataRegionKey`，复核渲染正常——排除 flux chart 渲染器整体断链。
- `isEmpty` 只覆盖"source 空且 series.data 空"；"source 非空但 series 值全部无法解析"这条失败路径当前静默。
- 演示页默认布局 `table-orders` 面板 w=6（约 330px）放 4 列表格，列头截断（"Sta…/Pai…"）。
- 审计报告 DB-3（palette 拖拽添加无反馈）复核改判：`editor-palette.tsx:59` 支持点击即加，拖拽走 HTML5 DnD（合成鼠标事件不触发，工具链限制非产品缺陷）——本 plan 内修正审计报告该行。
- `pnpm typecheck`/`build`/`lint`/`test` 当前全绿（最近一次全量验证基线，见 git log 全绿提交）。

## Goals

- `#/dashboard-demo` 编辑态 Sales Trend 面板渲染出 Sales 折线序列；Preview 态同样有数据。
- chart 渲染器对"source 非空但 series 值全不可解析"给出空态渲染 + dev console 告警（series 未声明 `data` 场景；声明 `data` 的 conflict 场景仅告警不出空态，见 Failure Paths；scatter 存量语义不在检测范围），配 focused 回归测试。
- 演示页默认布局表格面板不再截断列。
- 审计报告 DB-3 行改判记录在案。

## Non-Goals

- 不改 chart 渲染器的 `dataRegionKey`/`data` 公共契约语义（series.data 仅在 source 为空时生效的现有行为保持）。
- 不处理 Dashboard Editor 的编辑交互（拖拽/缩放/吸附）与 inspector 内容（roadmap R10/DB-4 的千分位等留待后续项）。
- 不动 recharts 依赖与 chart-schemas 公共 schema 字段。

## Scope

### In Scope

- `apps/playground/src/pages/dashboard-demo.tsx`（series 配置 + 默认布局表格面板跨度）
- `packages/flux-renderers-data/src/chart-renderer.tsx`（失败路径：全 undefined → 空态 + dev warn）
- `packages/flux-renderers-data/src/__tests__/`（新增失败路径回归测试）
- `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（DB-3 改判）
- `docs/components/dashboard-editor/design.md`（如失败路径行为属 owner doc 描述范围则同步一句）

### Out Of Scope

- pivot / map / spreadsheet 等其余 P0（各有独立 plan）
- dashboard-editor 编辑器内核（editor-core 包）改动

## Failure Paths

| 可测场景编号               | 触发                                                                                                                                                                          | 行为                                                                                                                                                                                                                                                      | 可重试 | 用户可见表现               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------- |
| chart-series-all-undefined | source 非空、**无任何 series 声明非空 `data`**、且每个 series 的 dataKey（`dataRegionKey ?? name ?? 'value'`，含无 series 时的隐式 `'value'` 回退）在所有行上取值均 undefined | 渲染空态插槽（沿用既有 `isEmpty && !loading` 门控，loading=true 时空态让位于 loading）+ dev 环境去重 console.warn（模块级 Set 按 series-key+source 行结构签名去重，防 StrictMode/重渲染刷屏）                                                             | 否     | "暂无数据"空态而非空白网格 |
| chart-series-conflict      | 至少一个 series 声明了非空 `data` 且 source 非空                                                                                                                              | **裁定顺序：本行优先于 all-undefined**。保持现行为（source 优先渲染，series.data 被忽略），仅 dev 告警提示 data 被忽略（同样去重）。既有绿测 `chart-renderer.unit.test.tsx:536-554`（malformed series 场景，断言空态为 null）在该语义下**保持绿**，不修订 | 否     | 图表仍按 source 渲染       |
| pie 全 0 形态              | pie 无 dataRegionKey 时 `item.value ?? 0` 产出全 0                                                                                                                            | 不在 all-undefined 检测范围内（现有回退语义已定义，非静默空白）                                                                                                                                                                                           | 否     | 维持现状                   |
| scatter 取值形态           | scatter 仅认 `dataRegionKey`（:411-417），无 name/'value' 回退                                                                                                                | 不在检测范围（存量语义，罕见配置）；如执行中涉及按 conflict 行精神处理                                                                                                                                                                                    | 否     | 维持现状                   |

## Test Strategy

档位选择：`建议有测`

chart 渲染器失败路径为新增行为，配 focused Vitest（先红后绿，测试文件与断言模式参照 `packages/flux-renderers-data/src/__tests__/chart-renderer.unit.test.tsx` / `chart-empty-state.test.tsx`）；演示页配置修复以浏览器程序化断言 SVG series 节点为准。

## Execution Plan

### Phase 1 - chart 渲染器失败路径硬化

Status: completed
Targets: `packages/flux-renderers-data/src/chart-renderer.tsx`, `packages/flux-renderers-data/src/__tests__/`

- Item Types: `Proof`, `Fix`

- [x] 新增 focused 测试：source 非空、series 未声明 `data` 且 key 全 undefined → 断言空态文案渲染 + console.warn 被调用（先红）；并补一条 conflict 场景断言（声明 `data` 时空态为 null，仅告警），钉死两条路径的裁定顺序（`src/__tests__/chart-silent-blank.test.tsx`，4 用例）
- [x] 实现：检测"source 非空、无 series 声明非空 data、所有 series 值 undefined"置空态变体（流经既有 `isEmpty && !loading` 门控），dev warn 以模块级 Set 去重（新增 `src/chart-diagnostics.ts`，渲染器接入 silentBlank 分支）
- [x] 既有 chart 测试全量回跑无回归——特别是 `chart-renderer.unit.test.tsx:536-554`（conflict 语义下必须保持绿）（`pnpm --filter @nop-chaos/flux-renderers-data test` 174 files / 1204 tests 全绿）

Exit Criteria:

- [x] 新测试先红后绿，覆盖 chart-series-all-undefined 与 chart-series-conflict 两条失败路径
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 全绿

### Phase 2 - 演示页配置与布局修复

Status: completed
Targets: `apps/playground/src/pages/dashboard-demo.tsx`

- Item Types: `Fix`

- [x] chart 面板 series 改为 `[{ name: 'Sales', dataRegionKey: 'sales' }]`；删除 `data: '${salesSeries}'` 引用并连同 `:221-223` 的 `salesSeries` 数据定义一并清理（全仓唯一消费点即此面板，已复核）
- [x] 默认布局调整：`table-orders` 改为整行（x:0,w:12,h:5）置于 chart 行之下，消除 4 列截断并完整容纳 4 行数据；chart 面板补 `height: 140` 使 x 轴/图例落在面板体内不裁剪
- [x] **存储 key 版本化**：`readSavedLayout`/persist 改用 `flux-dashboard-layout:v2`（旧 key `flux-dashboard-layout` 读取时若存在则移除，避免旧布局永久绕过新默认值），防止已持久化旧布局的浏览器命中坏配置
- [x] 浏览器实测：编辑态与预览态 Sales Trend 均渲染折线（`.recharts-line-curve` 存在、stroke 蓝 2px、x 轴 6 刻度）；表格四列完整可见（截图存档 `_tmp/ux-audit-2026-10-01/dashboard-fixed2.png`、`dashboard-preview-mode.png`、`dashboard-edit-final.png`）

Exit Criteria:

- [x] `#/dashboard-demo` 编辑态/预览态图表有数据序列（程序化断言 SVG `.recharts-line-curve` 或等效节点存在）
- [x] 表格面板四列列头完整渲染，无 "Sta…" 截断（`lastRowVisible: true`，5 行含表头全可见）
- [x] `pnpm --filter @nop-chaos/flux-playground test` 无回归（41 files / 408 tests 全绿）

### Phase 3 - 文档同步与审计改判

Status: completed
Targets: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`, `docs/components/chart/design.md`

- Item Types: `Decision`, `Follow-up`

- [x] 审计报告 DB-3 行改判为工具链误报并注明证据（editor-palette.tsx 点击即加）；DB-2 行补注修复结果与"Orders 底部标题为编辑态 chrome"裁定
- [x] 核对 owner doc：chart 面板 series 契约的 owner doc 是 `docs/components/chart/design.md`（§12 双入口语义 + §65 DD1 空态契约），已补记静默空白失败路径（判定条件/conflict 裁定/pie-scatter-heatmap 排除范围/实现模块 `chart-diagnostics.ts`）；`docs/components/dashboard-editor/design.md` 不描述 series 契约，无需更新
- [x] 审计报告 DB-1 行补注根因（demo 配置 + 渲染器静默空白双重原因）

Exit Criteria:

- [x] 审计报告 DB-1/DB-2/DB-3 行与 live repo 事实一致
- [x] `docs/components/chart/design.md` §12 与实现一致（新失败路径已记录）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，plan review 共 2 轮）
- Verdict: `pass-with-minors`（第 1 轮 revised：2 Major；第 2 轮全部解决，零 Blocker/Major）
- Rounds: 2
- Findings addressed: R1-M1（失败路径裁定顺序/检测范围/既有绿测保持——Failure Paths 表重写 + Phase 1 conflict 断言 item）；R1-M2（存储 key v2 化 + 旧 key 移除）；Minor 1/2/3/4/5/6/7 全部落实。第 2 轮残留 Minor 2 条（Goal 措辞精度、scatter 范围）已顺手落实于 Goals 与 Failure Paths。

## Closure Gates

- [x] Phase 1/2/3 全部 completed 且 Exit Criteria 全勾
- [x] 新增失败路径测试存在且通过（先红后绿记录在 daily log：`docs/logs/2026/10-01.md`）
- [x] 浏览器实测证据存档（`_tmp/ux-audit-2026-10-01/dashboard-*.png`）
- [x] `pnpm typecheck`（exit 0，2026-10-01）
- [x] `pnpm build`（exit 0，2026-10-01）
- [x] `pnpm lint`（exit 0，2026-10-01）
- [x] `pnpm test`（78 tasks 全绿，2026-10-01）
- [x] `pnpm check`（零新增红项；首轮 hardcoded-cjk-ui-copy 命中已按仓库英文告警惯例改写后归零，2026-10-01）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Non-Blocking Follow-ups

- Dashboard Editor 演示页页头开发说明文案与大按钮治理（归 R10）
- KPI 千分位格式化（归 R10/DB-4）
- palette HTML5 拖拽在真实浏览器人工复核（合成事件无法验证，归 R10 的 SC-4 同批人工验证）
- `docs/components/dashboard-editor/example-layout.json:45` 仍展示修复前反模式配置（`data: '${salesSeries}'`、table w:6）——加载后会经新失败路径优雅降级（空态+告警），示例布局随 R10 演示页治理一并更新（closure audit I-1 附带备忘归属）

## Closure

Status Note: 2026-10-01 收口。三个 Phase 全部落地：chart 渲染器静默空白失败路径（空态+去重 dev 告警，conflict 裁定保持既有绿测）、演示页 series 配置纠正 + 整行表格 + 存储key v2、owner doc 与审计报告同步。全量门禁真实全绿（typecheck/build/lint 42 tasks pipefail 实跑、test 78 tasks、check 零新增红项）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，两轮：第 1 轮 `issues` 抓出 typecheck 门禁失真 + 3 处隐式 any；返工后第 2 轮 `approved`）
- Evidence: 审计员实跑 `pnpm typecheck`（pipefail exit 0，另 bypass turbo 直接 tsc --noEmit 零错误）、`chart-silent-blank.test.tsx` 4/4、全包 174 files/1204 tests、playground 41 files/408 tests；抽查 chart-renderer.tsx `silentBlank → isEmpty && !loading` 真实渲染路径、dashboard-demo 配置与存储 key、design.md §12、审计报告 DB-1/2/3 一致性；follow-up 分类诚实性核对（三项均归 R10 + example-layout.json 反模式登记）。记录于 `docs/logs/2026/10-01.md`。

Follow-up:

- Dashboard Editor 演示页页头文案治理 / KPI 千分位 / palette 真实浏览器拖拽人工复核 / example-layout.json 反模式更新——均归 R10（见 Non-Blocking Follow-ups）
