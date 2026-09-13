# E1.1 — ECharts 渲染器骨架

> Plan Status: completed
> Last Reviewed: 2026-09-13
> Source: `docs/backlog/echarts-integration-roadmap.md`（E1.1）, `analysis/echarts-migration-analysis.md`（rev 3, §二/§三/§四）
> Related: 后续 E2.1（dataset/encode 数据映射 + 主题 + 事件桥接）、E3.1/E4.1（高级/完整图表类型）、E5.1（按需引入包体控制延续本计划裁决）

## Purpose

落地 `echarts` 渲染器骨架：ECharts 可选依赖接入、schema 类型定义、结构验证、生命周期组件（init/setOption/resize/dispose）、与 `chart`（recharts）并存的渲染器注册。同时裁决 analysis 遗留 Open Question「按需引入粒度（按图表类型 or 按功能模块）」。

## Current Baseline

- 现有 `chart` 渲染器（recharts）位于 `packages/flux-renderers-data/src/chart-*.tsx`，经 `dataRendererDefinitions`（`data-renderer-definitions.ts`）以 `type: 'chart'` 注册，组件经 `createLazyRendererComponent` 懒加载。
- 渲染器定义模式：`RendererDefinition`（`packages/flux-core/src/types/renderer-definition-types.ts`，结构校验字段为 `schemaValidator?: (context: RendererSchemaValidationContextLike<S>) => void`）；字段经 `fields: SchemaFieldRule[]` 声明通道（prop/event/value-or-region）；枚举 prop 需注册 `propContracts`（quick-reference §propContracts Coverage Discipline）。
- schema 校验模式：`emit({ code, path, message })` 诊断（见 `data-schema-validation.ts` 的 `validateTableSchema`）；运行时防御模式：`sanitizeSeries`/`isChartDatum`（`chart-sanitize.ts`），空数据渲染显式空态（chart DD1 契约），永不抛错。
- 单测环境：happy-dom + @testing-library/react，Vitest（`packages/flux-renderers-data/vitest.config.ts`，覆盖率阈值 80%）；recharts 在 chart 单测中以 `vi.mock` 模拟，不依赖真实 canvas。
- ECharts 当前未安装（全仓无 `echarts` 依赖，`grep` 仅命中 `recharts` 子串）；recharts 的依赖形态先例：`flux-renderers-data` 的 `peerDependencies` + `devDependencies` 双声明。
- 裁决已定（analysis rev 3，本计划不再重裁）：A1 结构验证走 TS 类型 + 渲染器 schemaValidator（不用 XDef）；A2 数据外部加载 + 表达式绑定（E2.1 落地）；A3 事件走 flux `events.*` 通道（E2.1 落地）。

## Goals

- 宿主安装 echarts 后，`{ "type": "echarts", "option": {...} }` 以静态 option 渲染出图表（init/setOption/resize/dispose 全生命周期正确）。
- 宿主不使用 echarts 渲染器时零加载成本（echarts 不进入默认渲染路径、懒 chunk 不加载）。
- 「按需引入粒度」Open Question 得到裁决并记录，约束 E2–E5 的图表类型落地方式。
- `echarts` 渲染器与 `chart` 并存注册，互不污染：`chart` schema 不透传 echarts config，`echarts` 不复用 chart 的 recharts 代码路径。

## Non-Goals

- dataset/encode 数据映射与表达式绑定（`schema.dataset.source` 求值注入 option）→ E2.1。
- 事件体系整体（`events` schema 字段、fields/eventContracts 通道声明、运行时 dispatch 桥接）→ E2.1。本计划 `EChartsSchema` 不声明 `events`、validator 不校验 `events`、渲染器定义不声明 events 通道——骨架组件不读 `props.events`，若声明该通道即构成 `data-renderer-definitions.ts` NOTE 所指的 lying contract；且 author 写 `events` 会得到 unknown-property 诊断（诚实于「尚未支持」），优于静默 no-op。
- 主题 token 映射裁决（recharts CSS 变量 ↔ ECharts theme）→ E2.1。
- 高级/完整图表类型的专项支持（sankey/tree/boxplot/map/custom 等）→ E3.1/E4.1；本计划 option 为原生透传，任意 series 类型已被 echarts 自身支持，无逐类型代码。
- 包体积预算复核与文档示例成体系输出 → E5.1。

## Scope

### In Scope

- 决策项：按需引入粒度裁决（记录于本文件 Execution Plan Phase 1，沉淀到 analysis Open Questions 勾选）。
- `echarts` 依赖接入：`flux-renderers-data` 以 optional peer + devDependencies 双声明；`flux-bundle` 纳入 optional peer + devDep（显式供构建），且 `flux-bundle/vite.config.ts` 的 `hostOwnedExternal` 增加 `/^echarts(\/.*)?$/`（对齐 recharts 的 external 行，防止 echarts 被内联进单文件 bundle 破坏零加载目标；宿主未装 echarts 时运行时 import 失败，流入 echarts-load-failed 降级路径）。
- `echarts-schemas.ts`：`EChartsSchema` 类型定义（type/option/dataset/renderer/initOptions/theme/notMerge/lazyUpdate/height/componentId；`events` 移交 E2.1，见 Non-Goals）。
- `echarts-schema-validation.ts`：结构校验（option 形态、renderer 枚举、dataset 形态、notMerge/lazyUpdate 布尔），诊断码遵循现有 `invalid-property-shape` 风格。
- `echarts-setup.ts`：集中注册模块（echarts/core + charts + components + renderers 的 `use(...)` 注册清单）。
- `echarts-renderer.tsx`：生命周期组件——懒加载 echarts chunk、init（canvas/svg、initOptions、容器尺寸）、setOption（静态 option 透传 + notMerge/lazyUpdate）、ResizeObserver → resize、卸载 dispose、空态（option 缺失/series 空且无其他数据源）、echarts 加载失败错误态（显式降级不崩溃）；根 marker class `nop-echarts`（对齐 `nop-chart` 先例，new-renderer-introduction-audit §F）。
- 类型隔离约束：静态可达模块（echarts-schemas / echarts-schema-validation / data-renderer-definitions / barrel index）不从 `'echarts'` 导入任何运行时或类型符号（含 `EChartsOption` 等类型）；echarts 的类型与运行时符号仅允许出现在 `echarts-setup.ts` 与 `echarts-renderer.tsx` 实现内部——保证 optional peer 缺失时不破坏消费方 .d.ts 解析链。
- 渲染器定义与注册：`echartsRendererDefinition`（type: 'echarts'、category: 'data'、LazyEChartsRenderer、schemaValidator、propContracts、fields），并入 `dataRendererDefinitions`；`EChartsRenderer` 从包 barrel 导出。
- 单元测试：validator 单测、生命周期单测（mock echarts/core）、定义契约单测（对照 `data-renderer-definition-contracts.test.ts` 风格）。

### Out Of Scope

- e2e/Playwright 用例（E5.1 统一补测试覆盖；本计划以 focused 单测为验收）。
- playground 示例页（E5.1 文档和示例）。
- `chart` 渲染器的任何行为改动。

## Failure Paths

| 场景编号               | 触发                                                          | 行为                                                                           | 可重试                        | 用户可见表现         |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------- | -------------------- |
| echarts-load-failed    | 宿主未安装 echarts（optional peer 缺失）或动态 chunk 加载失败 | 捕获 import 失败，渲染 `data-slot="echarts-error"` 错误占位，console.warn 一次 | 是（重渲染时重新尝试 import） | 错误占位文本，不崩溃 |
| option-invalid-shape   | `option` 解析后非普通对象（数组/null/标量）                   | 忽略 option，渲染显式空态 `data-slot="echarts-empty"`，不调用 setOption        | 是                            | 空态占位             |
| option-empty-series    | option 为对象但无 series（或 series 非数组）                  | 合法空态：仍 setOption（echarts 自身容忍），DOM 标记 `data-empty="true"`       | 是                            | 空白画布 + 空态标记  |
| init-container-missing | 容器节点在 init 时不可用（卸载竞态）                          | 跳过 init，effect 清理函数幂等，不抛错                                         | 是（重新挂载时重试）          | 无内容，无报错       |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`。理由：新增公共渲染器（public contract：schema 字段 + 注册 type + 生命周期语义），属核心回归路径。Proof 项（validator 单测、生命周期单测）先于实现项编写并确认先红后绿。

## Execution Plan

### Phase 1 - 决策与依赖接入

Status: completed
Targets: `docs/plans/2026-09-13-2343-echarts-e1-1-renderer-skeleton-plan.md`（裁决记录）, `analysis/echarts-migration-analysis.md`（Open Questions 勾选）, `packages/flux-renderers-data/package.json`, `packages/flux-bundle/package.json`, `packages/flux-bundle/vite.config.ts`, `packages/flux-renderers-data/src/echarts-setup.ts`

- Item Types: `Decision | Fix`

- [x] Decision：按需引入粒度裁决 —— **按功能模块**：统一从 echarts 官方 tree-shaking 入口（`echarts/core`、`echarts/charts`、`echarts/components`、`echarts/renderers`）导入，集中在单一 `echarts-setup.ts` 模块完成 `use(...)` 注册；渲染器组件经 `createLazyRendererComponent` 动态 import，echarts 全部代码位于懒 chunk，未挂载 `echarts` 渲染器实例的宿主零加载。理由：a) 按图表类型动态 import 会引入每实例瀑布延迟与复杂注册状态机，收益仅是懒 chunk 内部的体积差；b) 官方入口天然支持 chunk 内 tree-shaking，注册清单是单一可裁剪点，E5.1 可在一处收窄；c) 「简单场景零包体」目标由懒 chunk 完整达成，与粒度选择正交。chart 注册清单来源：analysis §1.2 的 22 种 series 类型列表（E5.1 收窄时对照）。
- [x] `flux-renderers-data/package.json`：`peerDependencies` 增加 `"echarts": "^6.0.0"`（npm latest 为 6.1.0，当前 stable major）+ `peerDependenciesMeta.echarts.optional: true`；`devDependencies` 增加 `echarts`（workspace 开发/测试可解析）。
- [x] `flux-bundle/package.json`：`peerDependencies` 增加 `echarts`（optional）+ `devDependencies` 增加 echarts（显式供构建）。
- [x] `flux-bundle/vite.config.ts`：`hostOwnedExternal` 增加 `/^echarts(\/.*)?$/`（对齐 recharts 行），保证单文件 bundle 不内联 echarts、动态 import 保留为运行时解析。
- [x] 新建 `echarts-setup.ts`：按功能模块导入并在模块加载时 `use(...)`（实现中以 `registerEChartsModules` 别名调用，规避 eslint react-hooks 对 `use*` 顶层调用的误报）注册骨架所需清单（analysis §1.2 全部 22 类 chart、tooltip/legend/grid/dataset/title 等通用组件、CanvasRenderer + SVGRenderer），导出 `getECharts()` 返回 core 命名空间供渲染器使用。
- [x] `pnpm install` 后 `echarts` 可被 `flux-renderers-data` 解析；`pnpm --filter @nop-chaos/flux-renderers-data typecheck` 通过（setup 模块导入合法）。

Exit Criteria:

- [x] `analysis/echarts-migration-analysis.md` Open Questions 中「按需引入粒度」条目勾选并写明裁决归属本 plan（E1.1），roadmap E1.1 行的「决策输入」语义可追溯。
- [x] `echarts-setup.ts` 存在且仅经官方 tree-shaking 入口导入；`packages/flux-bundle/vite.config.ts` 的 `hostOwnedExternal` 含 echarts 模式。
- [x] `echarts` 可被 `flux-renderers-data` 解析；`pnpm --filter @nop-chaos/flux-renderers-data typecheck` 通过（setup 模块导入合法）。

### Phase 2 - Schema 类型与结构验证

Status: completed
Targets: `packages/flux-renderers-data/src/echarts-schemas.ts`, `packages/flux-renderers-data/src/echarts-schema-validation.ts`, `packages/flux-renderers-data/src/__tests__/echarts-schema-validation.test.ts`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：新建 `echarts-schema-validation.test.ts`，覆盖：option 非对象诊断、renderer 非法枚举诊断、dataset.source 缺失/形态诊断、notMerge/lazyUpdate 非布尔诊断、合法 schema 零诊断。（先红证据：模块不存在时 vitest transform 失败，Tests no tests；实现后转绿）
- [x] Fix：`echarts-schemas.ts` 定义 `EChartsSchema extends BaseSchema`（字段：type/option/dataset/renderer/initOptions/theme/notMerge/lazyUpdate/height/componentId；`option`/`dataset.source` 用 `SchemaValue`/宽化类型承载表达式；`renderer?: 'canvas' | 'svg'`；`events` 不在本计划类型内——移交 E2.1）。
- [x] Fix：`echarts-schema-validation.ts` 导出 `validateEChartsSchema(context: RendererSchemaValidationContext<BaseSchema>)`（从 `@nop-chaos/flux-core` 导入，对齐同包 `validateTableSchema`/`validateSparklineSchema` 先例），`schema.type !== 'echarts'` 时直接返回；诊断码沿用 `invalid-property-shape`。
- [x] Proof（转绿）：上述单测全绿（16 tests）。

Exit Criteria:

- [x] `echarts-schema-validation.test.ts` 全绿（先红后绿证据记入本文件或 daily log）。
- [x] `EChartsSchema` 字段集覆盖 analysis §3.1 全部字段，偏差记录在案：`componentId` 为对齐 chart 先例（`chart-schemas.ts`）的新增、`height` 放宽为 number|string（对齐 chart 先例）、`events` 移交 E2.1（Non-Goals 裁决）。实现偏差补充：`EChartsDatasetSchema`/`EChartsInitOptions` extends `SchemaObject`、`theme` 用 `string | SchemaObject`、`transform?: SchemaValue[]`——均为满足 `BaseSchema` 索引签名（`SchemaValue`）约束的必要类型适配，语义不变。
- [x] `echarts-schemas.ts`/`echarts-schema-validation.ts` 未从 `'echarts'` 导入任何符号（类型隔离约束）。

### Phase 3 - 渲染器生命周期组件

Status: completed
Targets: `packages/flux-renderers-data/src/echarts-renderer.tsx`, `packages/flux-renderers-data/src/__tests__/echarts-renderer.unit.test.tsx`, `packages/flux-renderers-data/src/__tests__/echarts-renderer-load-failure.unit.test.tsx`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：`echarts-renderer.unit.test.tsx` 以 `vi.mock('echarts-setup.js')`（或等价模块 mock）覆盖：mount 后 init 以容器节点调用（canvas 默认/svg 可选）、setOption 收到 schema option 且 notMerge/lazyUpdate 透传、容器尺寸变化触发 resize、unmount 触发 dispose、init-container-missing（卸载竞态跳过 init、清理幂等不抛错）、option 非对象渲染空态且不调 setOption、重复渲染（option 引用变化）setOption 再次调用、option 不变时不重复 setOption。（先红证据：echarts-renderer.js 不存在时 transform 失败）
- [x] Fix：实现 `EChartsRenderer`：懒加载（动态 import echarts-setup）→ init/setOption/resize/dispose 生命周期；`props.props.height`（number/string）控制容器高度（缺省 400）；空态/错误态 DOM 标记遵循 Failure Paths 表；根 marker class `nop-echarts`；`data-testid`/`data-cid`/`className` 经 `props.meta`；组件句柄注册 `resize` 能力（对齐 chart 的 `ComponentHandle` 模式）；失败路径幂等（不抛错、清理函数安全）。实现增强：setup 模块动态 import 做模块级 promise 去重（`loadEChartsSetup`），避免重复 chunk 请求，同时规避 vitest 模块 runner 在「首个 import 未决时组件卸载」场景下后续 import 绕过 vi.mock 的竞态（详见 daily log）。
- [x] Proof（转绿）：生命周期单测全绿（12 tests + load-failure 2 tests）。

Exit Criteria:

- [x] 单测全绿，覆盖 Failure Paths 全部 4 行为（echarts-load-failed / option-invalid-shape / option-empty-series / init-container-missing）。文件偏差记录：echarts-load-failed 用例独立于 `echarts-renderer-load-failure.unit.test.tsx`（`vi.doMock` + `resetModules` 与主测试文件的 hoisted mock 互相污染，独立文件是 vitest 隔离语义下的正确组织方式）。
- [x] `chart` 渲染器零改动（`git diff` 不含 chart-\* 文件）。

### Phase 4 - 注册、导出与收口

Status: completed
Targets: `packages/flux-renderers-data/src/data-renderer-definitions.ts`, `packages/flux-renderers-data/src/echarts-renderer-definition.ts`, `packages/flux-renderers-data/src/index.tsx`, `packages/flux-renderers-data/src/__tests__/echarts-renderer-definition-contracts.test.ts`, `packages/flux-renderers-data/src/__tests__/data-package-units.test.tsx`, `apps/playground/src/data-route-entries.ts`, `apps/playground/src/component-lab/renderers/echarts-lab-page.tsx`, `apps/playground/src/component-lab/renderers/index.ts`, `apps/playground/src/component-lab/renderer-lab-registry.ts`

- Item Types: `Proof | Fix`

- [x] Fix：新增 `echartsRendererDefinition`（type: 'echarts'、displayName: 'ECharts'、category: 'data'、sourcePackage、component: LazyEChartsRenderer、schemaValidator、propContracts：renderer 枚举/notMerge/lazyUpdate/height、componentCapabilityContracts：resize、fields：option/dataset/renderer/initOptions/theme/notMerge/lazyUpdate/height/componentId——无 events/eventContracts 声明，见 Non-Goals），并入 `dataRendererDefinitions` 数组；`index.tsx` 导出 `EChartsRenderer` 与 `echartsRendererDefinition`。文件偏差记录：定义提取到独立 `echarts-renderer-definition.ts`（对齐 sparkline/stat-tile 先例，规避 data-renderer-definitions.ts 700 行 lint cap）；`data-package-units.test.tsx` 的注册清单断言按新契约更新（清单即注册 manifest，补 'echarts' 条目 + registry.get 断言）。
- [x] Decision/Proof：执行 `docs/references/new-renderer-introduction-audit.md` §A–F 强制审计并逐条记录勾选结果于本 plan（§G 包结构：新 renderer 进现有包 `flux-renderers-data`，按审计文档跳过）。覆盖点含：A 无外部 IO（仅本地动态 import，非远程模块加载；数据经 scope 表达式绑定，E2.1）；C 图表实例为域内部 state，resize 经 ComponentHandle projection；D 走 `RendererComponentProps` 标准通道；E 事件归 E2.1 经 ActionSchema 通道；F 根 marker class `nop-echarts` + data-slot 语义标记。（勾选快照见下方「New Renderer Audit Record」）
- [x] Proof：`echarts-renderer-definition-contracts.test.ts`——定义可注册到真实 `RendererRegistry`、`type: 'echarts'` 与 `type: 'chart'` 并存不冲突、schemaValidator 挂接（非法 schema 产生诊断）、fields 通道声明与 `EChartsSchema` 一致（5 tests）。
- [x] Fix（执行中发现的契约强制项，补记）：playground `route-matrix.test.ts` 契约要求每个注册的 data renderer 类型必须有 route 条目 + lab page 组件——新增 `data-route-entries.ts` 的 `echarts` 路由、`echarts-lab-page.tsx`（3 场景：canvas bar / svg line / 显式空态）并挂入 lab registry + renderers barrel。playground 测试 347/347 全绿。（计划原将 playground 示例归 E5.1，此处仅满足路由/实验室注册契约的最小页面，成体系示例仍归 E5.1）
- [x] Proof：`pnpm --filter @nop-chaos/flux-renderers-data test` 全绿（147 files / 1081 tests）。

Exit Criteria:

- [x] `registerDataRenderers(registry)` 后 registry 同时含 `chart` 与 `echarts` 两个 type，契约单测证明。
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 全绿（147 files / 1081 tests）。

## New Renderer Audit Record

> 依据 `docs/references/new-renderer-introduction-audit.md` §3 checklist（日期：2026-09-13，审计人：执行 session，closure audit 独立复核）。

### A. IO 边界（INV-1/INV-2）

- [x] 外部 IO 清单：仅同包本地动态 `import('./echarts-setup.js')`（构建期 chunk，非 INV-1 禁止的远程模块加载）；echarts 为 npm optional peer，由宿主构建器打包
- [x] 无 fetch / WebSocket / EventSource / localStorage / sessionStorage / IndexedDB / history.pushState / window.open（渲染器代码 grep 核实）
- [x] 无硬编码 API key / baseURL / endpoint
- [x] 无新 IO 类型需求（不触发 INV-2 评审）

### B. 复用边界（INV-3）

- [x] 数据请求不重造：renderer 零请求（裁决 A2），数据经表达式绑定（E2.1 落地 data-source/reaction 通道）
- [x] UI/i18n 复用：`cn()`（@nop-chaos/ui）、`t()`（@nop-chaos/flux-i18n 既有 `flux.common.noData/loadFailed/chart` 键，零新增键）
- [x] 无自实现表单/弹框/布局/DSL

### C. 内部 state 边界（INV-4）

- [x] state 清单：`chartInstance`/`loadFailed`（React state，域内部）、`chartRef`/`lastOptionRef`/`echartsSetupPromise`（refs/模块级，域内部）、ResizeObserver（域内部）——全部不进 scope
- [x] projection：`resize` 经 ComponentHandleRegistry + `component:<method>`（合规通道）
- [x] 无 env 依赖、无高频 scope 写入

### D. 契约边界（INV-5）

- [x] 签名 `(props: RendererComponentProps<EChartsSchema>) => RendererRenderOutput`
- [x] 数据仅从 `props.props` / `meta` / `id` 读；render 期无 scope.get / side effect
- [x] 无平行组件协议（标准 RendererDefinition 注册）；无直接 store 访问

### E. 扩展点边界

- [x] 行为扩展预留 `events` → E2.1 经 `events.*` + ActionSchema 通道（A3）
- [x] region 类定制（title/empty 插槽）E1.1 骨架未涉及，E2.1+ 按需以 value-or-region 落地
- [x] 无实现细节字段入 schema

### F. 样式边界

- [x] 根 marker class `nop-echarts`（`nop-<type>` 规范）
- [x] `data-slot="echarts-empty|echarts-error|echarts-canvas"`；状态 `data-empty` presence-only；无 BEM
- [x] Widget 渲染器自样式定位；无新 token 命名空间；`cn()` 合并 class

### G. 包结构

- [x] 跳过（新 renderer 进现有包 `flux-renderers-data`，按审计文档 §G 规则不适用）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，rounds 1–2）
- Verdict: `revised`（round 1 fail：零 Blocker、3 Major；round 2 fail：唯一残余 Major-R1 为 In Scope 残留「events 形态」文本矛盾，审查者预判修复后即达 pass；已按其指定修复落地，Minor-R1/R2 一并处理，达成零 Blocker 零 Major 共识）
- Rounds: 2
- Findings addressed: R1-Major-1 flux-bundle 单文件构建内联 echarts（→ Phase 1 增加 `flux-bundle/vite.config.ts` hostOwnedExternal `/^echarts(\/.*)?$/`）；R1-Major-2 events 声明层 lying contract（→ events 整体移交 E2.1：schema 类型/validator/fields/eventContracts 均不声明，Non-Goals 写明裁决理由）；R1-Major-3 缺 new-renderer-introduction-audit 强制审计（→ Phase 4 增加 §A–F 审计项含根 marker class `nop-echarts`）；R1-Minor-1..6 全部处理（偏差记录在案/Proof 清单对齐/措辞精确化/类型隔离约束/`RendererSchemaValidationContext`/清单来源标注）；R2-Major-R1 In Scope 残留「events 形态」（→ 删除，与 Non-Goals 一致）；R2-Minor-R1 Proof 枚举补 notMerge/lazyUpdate 非布尔用例；R2-Minor-R2 Verdict 词表已按 guide 规范（本记录）。

## Closure Gates

- [x] 所有 in-scope 项已落地：骨架渲染器可经 `registerDataRenderers` 注册并以静态 option 渲染
- [x] 按需引入粒度裁决已记录（plan + analysis Open Questions 同步）
- [x] 行为/契约结果已达成：Failure Paths 表 4 条行为有 focused 单测证明
- [x] 必要 focused verification 已完成：echarts-schema-validation（16）/ echarts-renderer（12）/ load-failure（2）/ definition-contracts（5）单测全绿；包级 1081 tests 全绿
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步：roadmap Phase Status（audit 通过后 E1.1 → done）；daily log `docs/logs/2026/09-13.md`；analysis Open Questions 勾选；无 chart 契约变更（`git diff` 不含 chart-\*）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（audit verdict: approved，证据见 Closure Audit Evidence；audit 提出的 1 Minor 已按其建议①处置——`loadEChartsSetup` 失败时重置模块 promise 缓存，重挂载真实重试，与 Failure Paths「可重试：是」语义对齐，处置后 focused 35 tests 复跑全绿）
- [x] `pnpm typecheck`（37/37，repo root）
- [x] `pnpm build`（37/37，repo root；echarts 经 hostOwnedExternal 保持外部化）
- [x] `pnpm lint`（turbo eslint 37/37；链上前置 check-i18n-keys 存在 4 个既有未定义键——master 引入、本分支零新增命中，取证与登记见 daily log 2026-09-13「Pre-existing red 登记」）
- [x] `pnpm test`（68/68 tasks，约 11,501 tests / 0 failed）

## Deferred But Adjudicated

（无 —— 本计划无 deferred 项）

## Non-Blocking Follow-ups

- echarts chunk 的包体积预算与注册清单裁剪 → E5.1（roadmap 既有 work item，非本计划遗留 debt）。

## Closure

Status Note: 2026-09-13 收口。E1.1 全部 in-scope 项落地：`echarts` 渲染器骨架（schema/验证/生命周期/注册/可选依赖懒加载）经独立子 agent draft review（2 轮，零 Blocker/Major 共识）与独立 closure audit（approved）确认；Failure Paths 4 条行为均有 focused 单测；按需引入粒度裁决（按功能模块）已沉淀至 analysis Open Questions；playground route/lab 契约强制项已满足。仓库级验证：typecheck 37/37、build 37/37、turbo eslint 37/37、test 68/68 tasks（约 11,501 tests / 0 failed）；`pnpm lint`/`pnpm check` 仅存 4 个既有 i18n 未定义键（origin/master 引入、本分支零新增命中，取证见 daily log 2026-09-13），不构成本 plan in-scope 失败。audit Minor（重试语义）已按建议处置并复跑验证。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-09-13）
- Evidence: verdict `approved`（1 Minor 已处置）。独立复跑：focused 4 文件 35 tests 全绿；flux-renderers-data 全量 147 files / 1081 tests 全绿；playground route-matrix 36 tests 全绿；包级 typecheck exit 0。行为抽查：生命周期/失败降级断言逐条核对（echarts-renderer.tsx:48-157 对应测试行）；echarts-setup.ts 仅官方 tree-shaking 入口；flux-bundle vite.config external 模式在 diff；chart/echarts 并存经真实 createRendererRegistry 契约测试；类型隔离经源码 grep + dist .d.ts/.js 双重复核（optional peer 缺失不破坏消费方 .d.ts 链）。i18n 4 键未定义且引入提交（44ef5188f / 646d16ba4）均在 origin/master、涉事包分支 diff 为空。chart-\* 零改动。plan / daily log / analysis Open Questions 文本一致。roadmap E1.1 判定满足 done 条件。

Follow-up:

- echarts chunk 包体预算与注册清单裁剪 → E5.1（roadmap 既有 work item；非本计划遗留 debt）
- no remaining plan-owned work
