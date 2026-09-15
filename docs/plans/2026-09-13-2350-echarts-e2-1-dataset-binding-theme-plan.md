# E2.1 — ECharts dataset 数据映射 + 事件桥接 + 主题 token

> Plan Status: completed
> Last Reviewed: 2026-09-13
> Source: `docs/backlog/echarts-integration-roadmap.md`（E2.1）, `analysis/echarts-migration-analysis.md`（rev 3, §三/§四, A2/A3 裁决）
> Related: 前置 `docs/plans/2026-09-13-2343-echarts-e1-1-renderer-skeleton-plan.md`（completed）；后续 E3.1/E4.1（图表类型）、E5.1（包体/文档/测试覆盖）

## Purpose

在 E1.1 骨架上落地 E2.1 三件事：dataset/encode 数据映射（对象数组 / 列式 / 二维数组，表达式绑定消费 scope 数据）；echarts 事件桥接 flux `events.*` 通道（A3）；统一主题 token 方案裁决与落地（recharts CSS 变量体系 ↔ ECharts 主题映射，analysis Open Question 移交本计划裁决）。基础图表（bar/line/pie/scatter）以 dataset 驱动形态验证。

## Current Baseline

- E1.1 已落地（completed，closure audit approved）：`echarts-renderer.tsx`（懒加载/init/setOption 引用比对/resize/dispose/空态与错误态降级/`nop-echarts` marker/resize ComponentHandle）、`echarts-schemas.ts`（`EChartsSchema`，`events` 字段按 E1.1 裁决未声明）、`echarts-schema-validation.ts`、`echarts-renderer-definition.ts`（已并入 `dataRendererDefinitions`）、`echarts-setup.ts`（22 类 chart + 组件集中注册，`getECharts()`）、playground route + lab page。
- E1.1 的 setOption 为静态 option 透传：`props.props.option` 引用变化即重新 setOption；`data-empty` 标记基于 `option.series`；空态（`data-slot="echarts-empty"`）仅在 option 非对象时出现。
- 裁决 A2（analysis rev 3）：数据由外部 data-source 加载到 scope，schema 级 `dataset.source` 一律为表达式绑定（或静态数组字面量）；renderer 不发请求；`option.dataset`（echarts 原生位置）承载静态内联数据，schema 级 dataset 存在时优先生效。
- 裁决 A3（analysis rev 3）：echarts 事件经 flux `events.*` 通道，`on*` 命名 → ECharts 原生事件名映射，不发明平行命名。
- 事件桥接既有先例（scada，`packages/flux-renderers-industrial/src/renderer/hooks/use-scada-events.ts`）：`events` 注册为整体 prop（flux-compiler 无点号字段支持），运行时经 `createNormalizedActionEvent({ type, ...payload })`（`@nop-chaos/flux-react`）+ `helpers.dispatch(action, { event, scope })` 派发。
- 表达式解析先例：chart 渲染器的 `source` 表达式经编译器解析为数组后从 `props.props.source` 消费；analysis §3.4 给出 `helpers.evaluate(schema.dataset.source)` 的解析口径。
- 主题现状：recharts `chart` 用 CSS 变量 `hsl(var(--chart-1..5))`（shadcn 约定，CSS 变量存 HSL 通道值，如 `12 76% 61%`，消费时须包 `hsl(...)`）；E1.1 echarts `theme` 为 string/object 透传、未指定时不应用任何主题（init 第二参 theme 为 undefined）。
- echarts 官方支持 `registerTheme(name, themeObject)`（echarts/core）与 init 第二参的主题名选择。

## Goals

- `{ "type": "echarts", "dataset": { "source": "${rows}", "dimensions": [...] }, "option": { series with encode } }` 以 scope 数据驱动渲染：对象数组 / 列式对象 / 二维数组三种 source 形态均成立。
- echarts 交互事件（click/dblclick/mouseover/.../dataZoom/legendselectchanged）可经 schema `events` 映射声明 action 并在节点 scope 上派发，payload 经 `event.*` 表达式可达。
- 未声明 `theme` 时 echarts 图表自动获得与 recharts 图表一致的 CSS 变量主题（`flux` 注册主题）；声明时透传。
- 空 dataset（解析为空数组）走显式空态（DD1 契约同构），支持 `empty` value-or-region 插槽（对齐 chart 先例）。

## Non-Goals

- ECharts `transform`（数据变换管道）的语义级支持：schema 透传字段已存在，专项映射/校验不做（无已裁决需求）。
- 高级/完整图表类型专项（sankey/tree/boxplot/gauge/funnel/radar/map/custom 等）→ E3.1/E4.1。
- 包体裁剪与文档成体系输出 → E5.1；nop-datav 集成 → E5.2。
- 运行时主题热切换（CSS 变量变更后已挂载图表自动重绘主题）：主题在 init 时解析，主题切换需重挂载；与「CSS variables + stable class names」架构现状一致。
- `chart`（recharts）渲染器的任何行为改动。

## Scope

### In Scope

- Decision：统一主题 token 方案 = **CSS 变量 → `flux` 注册主题**：`echarts-setup.ts` 新增 `registerFluxEChartsTheme()`，以 `getComputedStyle(document.documentElement)`（`typeof document === 'undefined'` 时直接走静态调色板，守卫纳入 Proof 断言面）读取 `--chart-1..5`（包 `hsl(...)`，shadcn HSL 通道值约定）、`--foreground`/`--muted-foreground`/`--border`/`--popover`/`--popover-foreground` 构建主题对象（颜色/文本/轴/图例/tooltip token），经 `registerTheme('flux', ...)` 注册；renderer 在 `props.props.theme` 未指定时以 `'flux'` 主题 init，指定时透传（string/object 不变）；CSS 变量缺失（SSR/jsdom）回退内置静态调色板。
- tooltip/legend 交互裁定：走 ECharts 原生 option 透传（Tooltip/LegendComponent 已在 E1.1 setup 注册，零新增代码），legend 交互经 Phase 3 `onLegendSelectChanged` 事件通道进入 flux action graph；本计划以可观测 fixture 证明（Phase 4）。
- dataset 绑定：`schema.dataset.source` 支持 `${expr}` 表达式或静态数组；渲染器解析（表达式字符串经 `helpers.evaluate`——对含表达式字符串按 scope 求值、对已解析数组恒等透传，数组/对象值按已解析处理）后组合进最终 option 的 `option.dataset`（含 `dimensions`/`transform` 透传；schema 级 dataset 覆盖 `option.dataset`——记录在案的优先级语义）。
- 防御性校验（analysis §4.3 口径，warn + 降级不抛错）：source 形态非法（非数组/非列式对象）→ console.warn 且不注入 dataset；`dimensions` 与 source 首行键不一致 → warn；series `encode` 引用未声明 dimension → warn。
- 空 dataset：解析为空数组 → 显式空态（复用 E1.1 空态 DOM），新增 `empty` value-or-region 插槽（regionKey: 'empty'，对齐 chart）。
- 事件桥接：`EChartsSchema.events`（`Record<string, SchemaValue>`，on* 命名，值为 ActionSchema——类型经 SchemaValue 宽化以满足 BaseSchema 索引签名，形态由 validator 兜底，偏差记录在案；对照 analysis §3.1 的 `Record<string, ActionSchema>` 语义）以整体 prop 声明（scada 先例），并按 scada 先例补 9 个 `NATIVE_EVENT_MAP` 键的 `eventContracts`（payload shape，供 authoring-contract/工具链发现事件面）与 `propContracts.events` 条目；`NATIVE_EVENT_MAP`（onClick→click、onDblClick→dblclick、onMouseOver→mouseover、onMouseOut→mouseout、onMouseDown→mousedown、onMouseUp→mouseup、onContextMenu→contextmenu、onDataZoom→dataZoom、onLegendSelectChanged→legendselectchanged）；实例就绪后 `chart.on(native, handler)`，handler 经 `createNormalizedActionEvent({ type: native, ...echartsParams })` + `helpers.dispatch(action, { event, scope })` 派发（`useRenderScope` 取 scope）；卸载/实例重建时 `chart.off` 清理；未知 on* 键 console.warn 忽略。
- validator 扩展：`events` 值形态（对象）诊断；`dataset.transform` 需为数组诊断；其余沿用 E1.1。
- 渲染器定义：fields 增 `events`（prop）/`empty`（value-or-region）；schema 类型补 `events`/`empty`。
- 单测：mocked-echarts 单测（组合语义：dataset 注入/覆盖优先级/空态/事件 on-off/未知键降级）；真实编译链单测（test-support `createDataSchemaRenderer` + dataRendererDefinitions：`${rows}` 表达式绑定 → setOption 收到组合 option）；validator 扩展单测；lab page 增 dataset/事件场景。

### Out Of Scope

- e2e/Playwright、成体系文档 → E5.1。
- `chart` 渲染器与主题系统的重构。

## Failure Paths

| 场景编号                   | 触发                                                                    | 行为                                                                             | 可重试                         | 用户可见表现                               |
| -------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------ |
| dataset-source-invalid     | `dataset.source` 解析后既非数组也非列式对象（标量/null）                | console.warn 一次，不注入 `option.dataset`，按无 dataset 的 option 渲染          | 是（下次 source 变化重新解析） | 图表按 series 原样渲染（可能空白），不崩溃 |
| dataset-empty              | source 解析为空数组                                                     | 显式空态 `data-slot="echarts-empty"`（或 empty 插槽内容），不 setOption          | 是                             | 空态占位                                   |
| dataset-dimension-mismatch | `dimensions` 声明与 source 首行键不一致，或 encode 引用未声明 dimension | console.warn 指明维度/引用，仍注入 dataset 交由 echarts 处理                     | 是                             | 图表可能缺列，无崩溃                       |
| events-unknown-key         | `events` 含 NATIVE_EVENT_MAP 之外的 on\* 键                             | console.warn 一次，该键被忽略，其余键正常绑定                                    | 是                             | 其余事件正常                               |
| events-dispatch-reject     | action 派发被 runtime 拒绝/抛错                                         | dispatch 返回的 promise 拒绝被捕获（void + catch），console.warn，图表交互不受损 | 是                             | 无可见异常                                 |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`。理由：表达式数据绑定（A2）与事件桥接（A3）是公共契约且有 analysis 裁决语义；Proof 先行（红→绿），真实编译链测试覆盖表达式路径，mocked 单测覆盖组合与降级语义。

## Execution Plan

### Phase 1 - 主题 token 裁决与 flux 注册主题

Status: completed
Targets: `packages/flux-renderers-data/src/echarts-theme.ts`（新建）, `packages/flux-renderers-data/src/echarts-setup.ts`, `packages/flux-renderers-data/src/echarts-renderer.tsx`, `packages/flux-renderers-data/src/__tests__/echarts-theme.test.ts`

- Item Types: `Decision | Proof | Fix`

- [x] Decision：统一主题 token 方案 = **CSS 变量 → `flux` 注册主题**（机制见 Scope；否决的替代方案：a) 逐图表 hardcoded 调色板——脱离 token 体系且双渲染器视觉不一致；b) ECharts 官方暗色/默认主题——与设计 token 无关联）。
- [x] Proof（先红）：`echarts-theme.test.ts`——CSS 变量存在时读出 `hsl(...)` 包装后的色板与文本/轴/图例/tooltip token；`typeof document === 'undefined'` 守卫路径与变量缺失路径均回退静态调色板；主题对象含 `color`/`textStyle`/`legend`/`categoryAxis`/`valueAxis`/`tooltip` 关键 token。
- [x] Fix：`echarts-theme.ts` 导出 `resolveFluxEChartsTheme()`；`echarts-setup.ts` 模块加载时 `registerTheme('flux', resolveFluxEChartsTheme())`；renderer init theme 参数：`props.props.theme ?? 'flux'`。
- [x] Proof（转绿）：theme 单测全绿；E1.1 的 init 默认 theme 断言更新为 `'flux'`（偏差记录：E1.1 断言 undefined，E2.1 起默认注册主题生效）。

Exit Criteria:

- [x] `echarts-theme.test.ts` 全绿（先红后绿证据记入本文件或 daily log）。
- [x] `resolveFluxEChartsTheme` 不从 `'echarts'` 导入符号（纯主题对象构造，类型隔离约束延续）。
- [x] renderer 在 `props.props.theme` 缺省时以 `'flux'` init，指定时透传（单测断言）。

### Phase 2 - dataset 绑定与防御性校验

Status: completed
Targets: `packages/flux-renderers-data/src/echarts-renderer.tsx`, `packages/flux-renderers-data/src/echarts-schema-validation.ts`, `packages/flux-renderers-data/src/echarts-schemas.ts`, `packages/flux-renderers-data/src/echarts-renderer-definition.ts`, `packages/flux-renderers-data/src/__tests__/echarts-renderer.unit.test.tsx`, `packages/flux-renderers-data/src/__tests__/echarts-schema-validation.test.ts`, `packages/flux-renderers-data/src/__tests__/echarts-dataset-binding.test.tsx`（新建）

- Item Types: `Proof | Fix`

- [x] Proof（先红）：`echarts-dataset-binding.test.tsx`——真实编译链（test-support `createDataSchemaRenderer` + `dataRendererDefinitions` + mocked `echarts-setup`）：`dataset.source: '${rows}'` + `dimensions` + series `encode` → setOption 收到 `{ ...option, dataset: { source: <rows 数组>, dimensions } }`；对象数组/列式/二维数组三形态；空数组 → `data-slot="echarts-empty"` 且不 setOption；empty 插槽内容渲染。
- [x] Fix：`EChartsSchema` 补 `events?: Record<string, SchemaValue>`（值为 ActionSchema，类型宽化偏差记录在案；Phase 3 用，类型先行）与 `empty?: BaseSchema | BaseSchema[] | string`；定义 fields 增 `events`（prop）与 `empty`（value-or-region, regionKey: 'empty'）；`echartsRendererDefinition` 补 `propContracts.events` 条目与 9 个 `NATIVE_EVENT_MAP` 键的 `eventContracts`（payload shape，对齐 scada 先例，供 authoring-contract/工具链发现事件面）；renderer 组合 finalOption（schema 级 dataset 覆盖 `option.dataset`；`helpers.evaluate` 解析表达式；三形态直传 echarts）；防御校验按 Failure Paths（dataset-source-invalid / dataset-dimension-mismatch：warn + 降级）；空数组 → 空态 + `resolveRendererSlotContent(props, 'empty', { fallback: t('flux.common.noData') })`。
- [x] Proof（转绿）：mocked 单测补组合语义（覆盖优先级、source 形态降级、warn 次数）+ validator 扩展（`events` 值非对象、`transform` 非数组诊断）全绿。

Exit Criteria:

- [x] `echarts-dataset-binding.test.tsx` 全绿：三形态 source 均以组合 option 到达 setOption，空数组走显式空态，表达式经真实编译链解析。
- [x] 防御路径（dataset-source-invalid / dataset-empty / dataset-dimension-mismatch）有单测断言且与 Failure Paths 表一致。
- [x] `empty` 插槽经 value-or-region 通道可用（插槽内容渲染断言）。

### Phase 3 - 事件桥接（A3）

Status: completed
Targets: `packages/flux-renderers-data/src/echarts-renderer.tsx`, `packages/flux-renderers-data/src/__tests__/echarts-renderer.unit.test.tsx`, `packages/flux-renderers-data/src/__tests__/echarts-events-bridge.test.tsx`（新建）

- Item Types: `Proof | Fix`

- [x] Proof（先红）：`echarts-events-bridge.test.tsx`（mocked chart 实例）——`events: { onClick: action }` → `chart.on('click', handler)` 注册；触发 handler → `helpers.dispatch` 收到该 action 且 `event` 为 normalized（type 'click' + echarts params 展开）；`onDataZoom`/`onLegendSelectChanged` 等映射正确；未知键 warn 且不注册；卸载后 `chart.off` 清理；dispatch reject 被捕获不冒泡。
- [x] Fix：renderer 集成 `useRenderScope` + `createNormalizedActionEvent` + `helpers.dispatch`（latest-ref 模式防 stale 闭包，对齐 scada `use-scada-events.ts` 先例）；实例重建时重绑；validator `events` 值形态诊断生效。
- [x] Proof（转绿）：事件桥接单测全绿。

Exit Criteria:

- [x] `echarts-events-bridge.test.tsx` 全绿：on\* → native 映射、normalized event、dispatch 上下文（event + scope）、off 清理、未知键降级均有断言。
- [x] 事件派发不发明平行命名：仅 `NATIVE_EVENT_MAP` 声明的 on\* 键生效（对照 analysis A3 映射表）。

### Phase 4 - 基础图表 dataset 形态收口与 lab 场景

Status: completed
Targets: `apps/playground/src/component-lab/renderers/echarts-lab-page.tsx`, `packages/flux-renderers-data/src/__tests__/echarts-renderer.unit.test.tsx`, `packages/flux-renderers-data/src/__tests__/echarts-dataset-binding.test.tsx`

- Item Types: `Proof`

- [x] Proof：基础图表（bar/line/pie/scatter）dataset + encode 驱动形态在真实编译链测试中各覆盖至少一例（series 无内联 data、仅 encode）——setOption 收到的组合 option 结构正确。
- [x] Proof：tooltip/legend 交互可观测收口——至少一个 dataset+encode 基础图表 fixture 的 option 含 `tooltip` + `legend` 配置（真实编译链断言组合 option 携带二者），lab page 一个 dataset 场景含 tooltip/legend 配置。
- [x] Proof：lab page 新增场景：dataset 表达式绑定（含按钮切换数据 → 引用变化重渲染）、click 事件 → setValue action、暗色 theme 透传。

Exit Criteria:

- [x] 四种基础图表类型的 dataset 驱动断言存在于真实编译链测试且全绿。
- [x] tooltip/legend 经原生透传的可观测证据存在（组合 option 携断言 + lab 场景），legend 交互通道（onLegendSelectChanged）已在 Phase 3 桥接。
- [x] lab page 场景更新且 playground 测试（route-matrix 等）全绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，rounds 1–2）
- Verdict: `revised`（round 1 fail：2 Major——eventContracts 通道移交缺口、tooltip/legend 可观测收口缺失；round 2 `pass-with-minors`：零 Blocker/Major，3 残余 Minor 已由起草者合并，共识达成）
- Rounds: 2
- Findings addressed: R1-Major-1 eventContracts 移交缺口（→ 采用方案①：Scope + Phase 2 补 9 键 eventContracts + propContracts.events，对齐 scada 先例）；R1-Major-2 tooltip/legend 收口（→ Scope 裁定段 + Phase 4 Proof/Exit Criteria：fixture 含 tooltip+legend 真实编译链断言 + lab 场景）；R1-Minor-1 events 类型统一 `Record<string, SchemaValue>`（宽化偏差记录在案）；R1-Minor-2 `props.props.theme ?? 'flux'`；R1-Minor-3/`R2-Minor-B` harness 名统一 `createDataSchemaRenderer`；R1-Minor-4 SSR 守卫纳入断言面；R1-Minor-5 init 第二参措辞修正；R2-Minor-A Exit Criteria 术语同步；R2-Minor-C Phase 4 Targets 补 `echarts-dataset-binding.test.tsx`。

## Closure Gates

- [x] 所有 in-scope 项已落地：dataset/encode 三形态绑定、事件桥接、flux 注册主题
- [x] 主题 token 方案裁决已记录（plan + analysis Open Questions 同步勾选）
- [x] 行为/契约结果已达成：Failure Paths 表 5 条行为有 focused 单测证明
- [x] 必要 focused verification 已完成：theme（4）/ dataset-binding（13）/ events-bridge（6）/ validator 扩展 / 既有 echarts 单测全绿（合计 61 tests）；包级 150 files / 1107 tests 全绿
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步（roadmap E2.1 → done、analysis Open Questions 主题裁决勾选、daily log 收口记录）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（audit verdict: approved；2 Minor 观察中，过期注释已修正，SSR 守卫分支直测为可选加固记入 Follow-up）
- [x] `pnpm typecheck`（37/37，repo root）
- [x] `pnpm build`（37/37，repo root）
- [x] `pnpm lint`（turbo eslint 37/37；链上前置 check-i18n-keys 同 E1.1 的 4 个既有未定义键，master 引入、本分支零新增命中，登记见 daily log 2026-09-13）
- [x] `pnpm test`（68/68 tasks，约 11,527 tests / 0 failed）

## Deferred But Adjudicated

（无 —— 本计划无 deferred 项）

## Non-Blocking Follow-ups

- ECharts `transform` 管道的语义级映射与校验 → 待有已裁决需求时立项（out-of-scope improvement）。
- 主题运行时热切换（CSS 变量变更自动重绘已挂载图表）→ 待主题切换基础设施出现后评估（out-of-scope improvement）。

## Closure

Status Note: 2026-09-13 收口。dataset/encode 三形态绑定（真实编译链证明）、A3 事件桥接（9 键 on\*→native + normalized event + scope dispatch）、主题 token 裁决（CSS 变量 → flux 注册主题）全部落地；Failure Paths 5 条行为有 focused 单测；contract-honesty 守卫通过。仓库级验证：typecheck 37/37、build 37/37、turbo eslint 37/37、test 68/68 tasks（约 11,527 tests / 0 failed）；lint/check 链仅存 E1.1 已登记的 4 个既有 i18n 未定义键（master 引入，本计划零新增命中）。audit 2 Minor：过期注释已修正；SSR 守卫分支直测属可选加固，记入 Follow-up。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-09-13）
- Evidence: verdict `approved`（2 Minor，1 已修正 1 记 Follow-up）。独立实跑：7 个 echarts 测试文件 61 tests 全绿；contract-honesty 3/3；包级 150 files / 1107 tests 全绿；playground route-matrix 36/36。行为抽查：theme 的 CSS 变量/hsl 包装/SSR 守卫/静态回退与 registerTheme('flux') 真实调用（setup:59）；dataset schema 级覆盖、三形态、空态短路（mockInit/setOption not called）、empty 插槽通道；事件 9 键字面清单、normalized event + scope dispatch、off 清理、reject 双路捕获（unhandledRejection 计数 0）；bar/line/pie/scatter encode-only + tooltip/legend 组合断言。文本五处一致；analysis Open Questions 三条全 resolved；roadmap E2.1 收口时由执行 session 置 done。

Follow-up:

- echarts-theme SSR 守卫分支（`typeof document === 'undefined'`）的直接单测为可选加固（watch-only residual；两条路径在 readCssVar 汇合同一回退行为）。
- no remaining plan-owned work
