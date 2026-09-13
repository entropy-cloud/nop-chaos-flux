# E5.2 — nop-datav 集成评估（dashboard panel 指定渲染器机制）

> Plan Status: completed
> Last Reviewed: 2026-09-13
> Source: `docs/backlog/echarts-integration-roadmap.md`（E5.2）, `analysis/echarts-migration-analysis.md`（rev 3, Open Questions 渲染器选择策略条目）
> Related: 前置 E1.1–E5.1（均 completed）

## Purpose

评估并证明 nop-datav 场景下 dashboard panel 指定 `echarts` 渲染器的机制：panel `type` 经 registry → fragment 通用装配是否零改动可用、前置条件与边界为何，产出评估结论文档与机制证明测试。

## Current Baseline

- `flux-renderers-dashboard` 的 `DashboardPanelSchema.type: string` 为面板内容 renderer 类型（chart/table/stat-tile/…）；运行态经 `runtime.registry.has(panel.type)` 校验 + `buildPanelFragment`（`{ type, ...panel.props, data/source }`）+ `helpers.render` fragment 编译渲染（`dashboard-renderer.tsx`）；未注册类型 warn 跳过（dashboard-layout-invalid）。
- `echarts` 渲染器自 E1.1 起在 `dataRendererDefinitions` 中注册（`registerDataRenderers` 一并注册 chart 与 echarts）；宿主安装 echarts（optional peer）后懒 chunk 按需加载。
- panel 与 echarts 的组合**从未被测试或文档记录**——评估无证据物。
- dashboard 包不依赖 flux-renderers-data（运行时）；测试基座 `createDashboardSchemaRenderer(extra)` 支持注入 extra definitions。

## Goals

- 机制证明：dashboard panel `{ type: 'echarts', props: { option, ... } }` 经真实 dashboard renderer + 真实 echarts 渲染器定义（mocked echarts-setup 边界）完成 setOption。
- 评估结论文档：机制描述、前置条件（宿主 echarts optional peer / registerDataRenderers / 懒加载自动）、面板适配点（props 直传 option/dataset/events/theme/height；ResizeObserver 自动响应面板 resize；flux 主题经 CSS 变量继承）、风险与边界（未装 echarts 的宿主面板级降级为 echarts-error 占位且不影响其他面板；panel `source` 绑定路径与 echarts 不兼容，经 props.option/dataset 传数）、结论（无需包装层）。

## Non-Goals

- 为 nop-datav 新增 dashboard/echarts 包装代码（评估结论为无需）。
- dashboard-editor 编辑态对 echarts 面板的 palette/inspector 适配（编辑态 UI 归 dashboard-editor 演进）。

## Scope

### In Scope

- Fix：`flux-renderers-dashboard` 增 devDependency `@nop-chaos/flux-renderers-data`（workspace，仅测试用）。
- Proof：`packages/flux-renderers-dashboard/src/dashboard-echarts-panel.test.tsx`（新建，colocation 对齐包内惯例）——dashboard + `{ type: 'echarts' }` 面板（mocked echarts-setup 边界）→ setOption 收到面板 props.option；props 表达式求值生效。
- Proof（边界证明）：**panel `source` 绑定路径与 echarts 渲染器不兼容**——`buildPanelFragment` 注入的顶层 `data`/`source` 键不在 echarts 定义 fields（closed prop model + strict 校验下 unknown-property error、数据被跳过；对照 tree/sparkline 显式声明 `data` field）。用例断言稳定不变量（source 数据永不出现在 setOption option 中；编译期拒绝与跳过两分支的公共不变量），文档记为边界 + authoring 指引「echarts 面板经 props.option/dataset 表达式传数（表达式本就可达 scope），不用 panel.source」。
- Proof（降级隔离）：echarts 面板加载失败时兄弟面板不受影响——`dashboard-echarts-panel-failure.test.tsx`（echarts chunk import 失败 mock + text 兄弟面板照常渲染 + echarts 面板 echarts-error 占位）。
- Fix：评估文档 `docs/components/echarts/integration-nop-datav.md`（机制/前置条件/适配点/风险边界/结论）；`docs/components/echarts/design.md` 验证锚点节补链接。
- Proof：受影响包测试全绿。

### Out Of Scope

- nop-datav 产品的实际接线（其仓库/宿主代码不在本仓）。
- dashboard-editor 编辑态适配。

## Failure Paths

> 不适用：评估型交付；证明测试覆盖的失败路径沿用 echarts 渲染器既有降级（load-failed/empty）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`。理由：评估结论「零改动可用」必须有机制证明测试支撑，否则属未验证断言。

## Execution Plan

### Phase 1 - 机制证明与评估文档

Status: completed
Targets: `packages/flux-renderers-dashboard/package.json`, `packages/flux-renderers-dashboard/src/dashboard-echarts-panel.test.tsx`, `packages/flux-renderers-dashboard/src/dashboard-echarts-panel-failure.test.tsx`, `docs/components/echarts/integration-nop-datav.md`, `docs/components/echarts/design.md`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：`dashboard-echarts-panel.test.tsx`——dashboard 布局含 `{ type: 'echarts', props: { option, height } }` 面板 + 注入真实 `echartsRendererDefinition`（`echarts-setup.js` 以跨包相对路径 `vi.mock`）→ 断言 setOption 收到 option；面板 props 表达式（如 height: '${panelH}'）求值生效。
- [x] Fix：dashboard 包 devDependency 增 data 包；评估文档落地（机制/前置条件/适配点/风险边界/结论）+ design.md 锚点链接。
- [x] Proof（转绿）：`dashboard-echarts-panel.test.tsx` 与 `dashboard-echarts-panel-failure.test.tsx` 全绿；dashboard 包测试全量回归。

Exit Criteria:

- [x] 机制证明测试全绿（setOption 经 panel fragment 到达真实 echarts 渲染器定义）。
- [x] source 绑定边界有行为断言 + 文档 authoring 指引；降级隔离测试证明兄弟面板不受影响。
- [x] `integration-nop-datav.md` 落地且结论与测试证据一致。
- [x] `pnpm --filter @nop-chaos/flux-renderers-dashboard test` 全绿（6 files / 57 tests）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，rounds 1–2）
- Verdict: `revised`（round 1 fail：1 Major——panel source 绑定路径边界缺口；round 2 `pass-with-minors`：零 Blocker/Major，3 残余 Minor 已由起草者合并，共识达成）
- Rounds: 2
- Findings addressed: R1-Major-1 panel source 绑定边界（→ 边界证明用例 + 文档 authoring 指引「echarts 面板经 props.option/dataset 传数」）；R1-Minor-1 Closure Gates 补 `pnpm check`（workspace-manifest-deps 说明）；R1-Minor-2 降级隔离独立失败文件 + 双面板用例；R1-Minor-3 测试 colocation；R1-Minor-4 roadmap E5.2 review 通过置 planned（已执行）；R2-Minor-A `pnpm check` 行落实确认；R2-Minor-B Phase 1 checklist 点名两个新测试文件；R2-Minor-C Goals 括号补 source 边界。

## Closure Gates

- [x] 所有 in-scope 项已落地：机制证明测试 + 评估文档
- [x] 行为/契约结果已达成：echarts 面板经 dashboard 通用机制 setOption 到达
- [x] 必要 focused verification 已完成：dashboard-echarts-panel 测试全绿（4 tests + failure 1）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步（integration-nop-datav.md、design.md 锚点、roadmap E5.2 → done、daily log 收口记录）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（audit verdict: approved，2 Minor 已在收口动作中修正）
- [x] `pnpm typecheck`（37/37）
- [x] `pnpm build`（37/37）
- [x] `pnpm lint`（turbo eslint 37/37）
- [x] `pnpm test`（68/68 tasks，约 11,554 tests / 0 failed）
- [x] `pnpm check`（workspace-manifest-deps 过链；既有 i18n 4 键红之外零新增）

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- dashboard-editor 编辑态 palette/inspector 对 echarts 面板的适配 → out-of-scope improvement（编辑态 UI 演进独立驱动）。

## Closure

Status Note: 2026-09-13 收口。机制评估结论：**dashboard panel 指定 `echarts` 渲染器零包装层可用**（panel.type → registry → fragment 通用装配），机制证明测试 + source 绑定边界不变量断言 + 降级隔离双面板用例三重落地；评估文档 `integration-nop-datav.md` 含 authoring 指引。仓库级验证：typecheck 37/37、build 37/37、turbo eslint 37/37、test 68/68 tasks（约 11,554 tests / 0 failed）、check 零新增命中。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-09-13）
- Evidence: verdict `approved`（2 Minor 已修正：Phase checklist 勾选、Scope 措辞对齐实际断言）。独立实跑：两个测试文件 4/4 全绿；行为抽查三链（fragment 装配 → setOption 全等断言 / source 边界不变量对照 live compiler 源码链 shape-validation-node-fields.ts:248-269 / 降级隔离双面板）；dashboard 包 6 files / 57 tests 全绿；devDep 链接核实。反过度声明核查：评估文档三项声明均有测试/源码证据支撑。

Follow-up:

- dashboard-editor 编辑态 palette/inspector 对 echarts 面板的适配 → out-of-scope improvement（Non-Blocking Follow-ups 同项）。
- no remaining plan-owned work
