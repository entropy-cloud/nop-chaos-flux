# 2 Editor Mission E4 包基建与依赖引入（M1 前置）

> Plan Status: completed
> Last Reviewed: 2026-08-06
> Source: `docs/components/roadmap-industrial-hmi-editor.md`（E4 work items E4.1/E4.2、Phase Details E4、总览「不新建包（首选）或新建 1 包（待 E4.1 裁定）」、Cross-Cutting 平台能力复用/双态隔离/新增包流程）、`docs/components/industrial-hmi-editor/design-architecture.md`（§4.4 引擎层衔接 trade-off input + §11 实现拆分「落地依赖 E4.1 包结构裁定」）、`docs/components/industrial-hmi-editor/design-renderer.md`（§4.1 ScadaEditorCanvasSchema 完整契约 + §11 实现拆分依赖 E4.1）、`docs/analysis/industrial-hmi-editor/selection-gate-2026-08-06.md`（路径 A 维持 + 9 条设计约束 #1 editable:true 双态切换）
> Related: `docs/plans/2026-08-06-2118-1-e3-design-gate-review.md`（E3 上游，设计 gate 终轮复核）、`docs/plans/2026-08-03-2113-2-i4-package-infra-and-leafer-dependency.md`（runtime I4 包基建先例，工程接线三通道 + 空壳注册范本）
> Mission: industrial-hmi-editor
> Work Item: E4

## Purpose

执行 industrial-hmi-editor mission 的 **E4 包基建与依赖引入**（M1 实现前置）：完成两件事——

1. **E4.1 包结构裁定**：基于 `design-architecture.md §4.4` trade-off input + 实测 bundle size + 双态隔离强度 + 维护成本，裁定编辑器实现归属——**方案 A**（编辑器实现放入既有 `flux-renderers-industrial`，引入 `@leafer-in/editor` 共装，需证明 leafer-editor 不污染 runtime `scada-canvas` bundle）vs **方案 B**（新建 `flux-renderers-industrial-editor`，与 runtime 解耦，避免 leafer-editor 拖入 runtime bundle）。
2. **E4.2 空壳注册 + 依赖引入**：按 E4.1 裁定落地包基建（方案 A 加 editor 模块骨架 + 隔离；方案 B 新建包 + 工程接线三通道），引入选型结论对应的依赖（`@leafer-in/editor@2.2.9`），注册 `scada-editor-canvas` renderer type 空壳（首期空壳，fields/events/handles 随 E5/E7/E9 补全）。

E4 是 M1 实现的工程地基：包结构裁定决定 E5 全部代码落点，依赖引入 + 空壳注册保证 E5 可在此基础上实现编辑态画布组件。E4 不实现编辑器交互逻辑（E5）、不补全 renderer 完整契约（E5/E7/E9）。

## Current Baseline

- **runtime `flux-renderers-industrial` 包已落地**（`packages/flux-renderers-industrial/`）：dependencies `leafer-ui@2.2.9` + `@leafer-in/viewport@2.2.9`；exports `.` + `./styles.css`；`registerScadaRenderers(registry)` 注册 `scada-canvas` renderer + 24 内置图元；src 结构（engine/binding/renderer/serialization/symbols/schemas.ts/renderer-definitions.ts/index.ts/styles.css）。
- **`scada-canvas` renderer 已注册**：`examples.manifest.json` `runtime` 数组含 `scada-canvas`（line 63）；playground `App.tsx:116` `registerScadaRenderers(registry)`。
- **E3 设计 gate 为前置依赖**：E4.1 裁定依赖 E2 设计契约稳定（经 E3 终轮复核）；**E4.1 必须在 E3 `done` 后执行**（Failure Paths `upstream-not-ready`）。
- **选型结论（路径 A 维持，E4 依赖输入）**：`@leafer-in/editor@2.2.9` 是路径 A 的依赖；spike 已用 `@leafer-in/editor@2.2.9` + `@leafer-in/text-editor@2.2.9`（scratch，不入仓库）；`editor-initiation.md §4.1` 记录 leafer-in v2.2.9（1.3MB）/ leafer-editor v2.2.9（244KB）/ MIT 许可。
- **设计契约 input（E4.1 裁定依据）**：`design-architecture.md §4.4` trade-off——方案 A（复用 scada-engine applyDiff + 18 命令面，零命令复制，最小包结构变化；**watch-only residual：bundle size 数字需 E4.1 实际打包后评估**）vs 方案 B（独立 editor-engine，更强 bundle 级隔离 + bundle 优化，需命令面复制或 re-export）；§4.4「E4.1 倾向」= 方案 A，但**不预判裁定**，E4.1 须综合 bundle size 实测 + 双态隔离强度 + 维护成本决定。
- **runtime 复用点（E4 不重复实现）**：引擎层（`engine/scada-engine.ts` 18 命令面 + applyDiff）/ 序列化（`serialization/`）/ 图元注册表（`symbols/`）/ 句柄面（`renderer/hooks/use-scada-handles.ts`）；编辑器复用这些面，方案 A 直接 import，方案 B 经 workspace 依赖 + re-export。
- **roadmap Phase Status**：E4 `todo`（本 plan 激活时 → `planned`）；E3 `todo`（前置，须先 `done`）。
- **真实剩余 gap**：E4.1 包结构裁定未做（设计文档只给 trade-off input）；`@leafer-in/editor` 依赖未引入；`scada-editor-canvas` renderer type 未注册；E5 代码落点未定。

## Goals

- **E4.1**：实测引入 `@leafer-in/editor@2.2.9` 的 bundle size 影响（尤其对 runtime `scada-canvas` bundle 的污染评估）；综合 `design-architecture.md §4.4` trade-off + bundle 实测 + 双态隔离强度 + 维护成本，裁定包结构（方案 A vs 方案 B），记录裁定 rationale（含方案 A 的隔离策略：独立注册函数 `registerScadaEditorRenderers` + subpath export / 动态导入，或方案 B 的独立包 + workspace 依赖）。
- **E4.2**：按 E4.1 裁定落地包基建——
  - **方案 A**：`flux-renderers-industrial` 新增 `@leafer-in/editor@2.2.9` 依赖 + `src/editor/` 模块骨架（renderer-definitions 独立 `registerScadaEditorRenderers`，与 runtime `registerScadaRenderers` 分离，保证 leafer-editor 不进 runtime bundle）。
  - **方案 B**：新建 `packages/flux-renderers-industrial-editor/`（package.json/tsconfig×2/vitest.config.ts/src 骨架，workspace 依赖 flux-core/flux-react/flux-i18n/ui + `flux-renderers-industrial`（复用 runtime 面）+ `@leafer-in/editor@2.2.9`）+ 工程接线三通道（`vite.workspace-alias.ts` + 根 `tsconfig.json` references + `tsconfig.base.json` paths）。
- **E4.2**：`examples.manifest.json` `runtime` 数组新增 `scada-editor-canvas`（空壳，对齐 `scada-canvas` 入 `runtime` 先例）；playground 注册 `registerScadaEditorRenderers`（方案 A 同包独立函数 / 方案 B 新包入口）。
- **E4.2**：空壳 smoke——构造含 `scada-editor-canvas` 的最小 schema 渲染不抛错（经测试句柄或注册单测）；`__FLUX_STRICT_VALIDATION__`/schema 诊断不拦截空壳 defaultSchema。
- roadmap Phase Status 回写（E4: `todo` → `planned` 本 plan 激活时；→ `done` 留待 closure-audit 通过）；daily log 记录。

## Non-Goals

- 不实现编辑器交互逻辑 / 双态切换 UI / 图元库面板 / 拖拽放置 / 属性面板 / 保存加载（E5 M1 MVP 实现）。
- 不补全 `scada-editor-canvas` renderer 完整契约（fields/events/regions/handles 随 E5/E7/E9 补全；E4 只注册能 smoke 渲染的空壳）。
- 不实现编辑态覆盖物族 / undo-redo / 连线 / 工具箱（E7/E9）。
- 不变更选型主路径（路径 A，E1 已裁定；E4.1 只裁定包结构归属，不重新仲裁 leafer-editor vs 自研交互层——后者属 R1，已不触发）。
- 不修改 runtime `scada-canvas` renderer 行为 / runtime 复用点面（E4 只新增 editor 侧，runtime 面只读消费；方案 A 若需 runtime 包结构调整以隔离 bundle，仅限新增独立注册函数 / subpath，不改 runtime renderer 逻辑）。
- 不裁定 R7 编辑态包络数字（E1.2 已产裁定建议值，待人工确认；E4 不涉及）。
- 不做编辑态性能测量（E6 M1 gate / E9.2 M3 benchmark 复测）。

## Scope

### In Scope

- **E4.1 包结构裁定**：
  - `Proof`：前置验证——核对 E3 `done`（roadmap E3 = `done`，`e3-design-gate-review.md` 存在、无未裁决人工确认项）；未就绪则等待。
  - `Proof`：bundle size 实测——临时引入 `@leafer-in/editor@2.2.9`，构建后评估（① 引入后 runtime `scada-canvas` bundle 体积增量；② editor 模块独立 chunk 体积；对照 `editor-initiation.md §4.1` leafer-editor 244KB / leafer-in 1.3MB 口径 + spike lockfile 版本参考）。
  - `Decision`：包结构裁定（方案 A vs 方案 B），记录 rationale：综合 `design-architecture.md §4.4` trade-off（命令面复用 vs 复制）+ bundle 实测（leafer-editor 是否污染 runtime bundle）+ 双态隔离强度（module/subpath 级 vs package 级）+ 维护成本。若方案 A，明确隔离策略（独立注册函数 `registerScadaEditorRenderers` + subpath export `/editor` + 动态导入 editor 模块，保证 `registerScadaRenderers` 不拉入 @leafer-in/editor）。
  - `Fix`：记录裁定——若方案 A，在 `design-architecture.md §4.4` / `design-renderer.md §11` 标注 E4.1 裁定结论（替换"待 E4.1 裁定"占位）；若方案 B，同上 + roadmap 总览「不新建包（首选）或新建 1 包」回写实际裁定。
- **E4.2 空壳注册 + 依赖引入**（按 E4.1 裁定分支执行）：
  - **方案 A 分支**：`flux-renderers-industrial` package.json 新增 `@leafer-in/editor@2.2.9` 依赖；新增 `src/editor/` 模块骨架（`renderer-definitions.ts`（editor 独立定义）+ `index.ts`（editor 子入口）/ `schemas.ts`（ScadaEditorCanvasSchema 最小字段：config/width/height，完整字段属 E5）/ `styles.css`）；exports 新增 subpath（如 `./editor`）；`registerScadaEditorRenderers(registry)` 独立注册函数（不并入 `registerScadaRenderers`）。
  - **方案 B 分支**：创建 `packages/flux-renderers-industrial-editor/`（package.json：workspace 依赖 `flux-renderers-industrial`（复用 runtime 面）+ flux-core/flux-react/flux-i18n/ui + `@leafer-in/editor@2.2.9` + `leafer-ui@2.2.9` peer/直接；peerDependencies react/react-dom；exports `.` + `./styles.css`；sideEffects；scripts 对齐既有 renderer 包）/ tsconfig.json / tsconfig.build.json / vitest.config.ts / src 骨架（`schemas.ts` / `renderer-definitions.ts` / `index.ts` / `styles.css`）；工程接线三通道（`vite.workspace-alias.ts` 别名 + 根 `tsconfig.json` references + `tsconfig.base.json` paths 主入口 + `/styles.css` 子路径，对齐 I4 先例）。
  - `Fix`：`examples.manifest.json` `runtime` 数组新增 `scada-editor-canvas`（对齐 `scada-canvas` 入 `runtime` 先例；空壳期不进 `targetContract`，example 文件属 E5/E9）。
  - `Fix`：playground 注册 `scada-editor-canvas`——方案 A：`App.tsx` 新增 `import { registerScadaEditorRenderers } from '@nop-chaos/flux-renderers-industrial/editor'`（subpath import，禁从主入口 re-export 以保隔离）+ `registerScadaEditorRenderers(registry)`；方案 B：`import { registerScadaEditorRenderers } from '@nop-chaos/flux-renderers-industrial-editor'` + 注册调用。
  - `Proof`：空壳 smoke——renderer 注册单测（`scada-editor-canvas` 空壳可经注册、类型与 sourcePackage 正确）+ playground smoke 渲染不抛错（经既有 playground 测试基建或测试句柄 `window.__flux_scada_editor_<cid>` 抽查记录）。
  - `Fix`：roadmap 头部记录 E4 裁定 + daily log。

### Out Of Scope

- 编辑器交互逻辑 / 双态切换 UI / 图元库 / 拖拽 / 属性面板 / 保存加载（E5）。
- `scada-editor-canvas` renderer 完整契约（fields/events/regions/handles，E5/E7/E9）。
- 编辑态覆盖物族 / undo-redo / 连线 / 工具箱（E7/E9）。
- 编辑态性能测量 / benchmark 复测（E6/E9.2）。
- runtime `scada-canvas` renderer 行为变更 / runtime 复用点面修改（E4 只读消费）。
- R7 编辑态包络数字最终确认（人工 gate，E1.2 标记）。

## Failure Paths

| 可测场景编号                | 触发                                                                                                                          | 行为（含状态码/错误码）                                                                                               | 可重试 | 用户可见表现                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| upstream-not-ready          | E4.1 执行时 E3 未 `done`（roadmap E3 ≠ `done` 或 `e3-design-gate-review.md` 不存在/有未裁决人工确认项）                       | E4.1 暂停等待；不跳序执行                                                                                             | 否     | roadmap E3 仍 `todo`/`planned`；E4 暂停                                  |
| bundle-isolation-fail       | 方案 A 实测发现 `@leafer-in/editor` 不可避免污染 runtime `scada-canvas` bundle（独立注册函数 + subpath + 动态导入均无法隔离） | E4.1 裁定改采方案 B（独立包）；记录 bundle 实测证据；roadmap 总览回写实际裁定                                         | 是     | E4.1 裁定记录方案 B + rationale；新建 `flux-renderers-industrial-editor` |
| dep-version-mismatch        | 引入的 `@leafer-in/editor` 版本与 spike 固化的 `2.2.9` 不一致 / 与 `leafer-ui@2.2.9` 不兼容                                   | 锁定 `@2.2.9`（对齐 spike lockfile + runtime `leafer-ui@2.2.9`）；pnpm-lock diff 审查记录                             | 是     | package.json 版本 `2.2.9`；lockfile 一致                                 |
| shell-smoke-fail            | `scada-editor-canvas` 空壳注册/渲染抛错（schema 校验拦截 / 类型错误 / leafer-editor 初始化异常）                              | 修正空壳 defaultSchema / 类型；确认 `__FLUX_STRICT_VALIDATION__` 不拦截；smoke 通过后再收口                           | 是     | 空壳 smoke 渲染无异常                                                    |
| scope-change-human (R-人工) | E4.1 裁定方案 B（新建包）被视为结构性调整需人工确认                                                                           | roadmap「人工确认阈值」不含「新建包」（roadmap总览已显式授权 E4.1 裁定新建与否）→ 不触发；但裁定 rationale 须完整记录 | 否     | E4.1 裁定记录完整；不暂停                                                |

> **人工确认阈值核对**：roadmap「人工确认阈值」列固定项为 R1（选型变更）/ scada-editor-canvas 公共契约重大变更 / R7（包络数字）/ 共识循环超 3 轮 / M1 交付边界确认 / 范围级变更。E4.1 包结构裁定（A vs B）**不在**人工确认项内——roadmap 总览「不新建包（首选）或新建 1 包（**待 E4.1 裁定**）」已显式授权 E4.1 裁定新建与否；E4.2 空壳注册（非公共契约重大变更，完整契约属 E5）亦不触发。故 E4 全程 AI 可裁定执行，无需暂停等人工（除非触发上表其他 Failure Path）。

## Test Strategy

本档选择：`建议有测` —— E4 是包基建 + 依赖引入 + 空壳注册（代码变更），风险匹配一般 infra。Proof 项：renderer 注册单测（空壳可注册、类型/sourcePackage 正确，对齐 I4 `renderer-definitions.test.ts` 先例）+ 局部 typecheck（包内 + playground 侧无 TS2307）+ smoke 渲染不抛错。完整 M1 行为测试属 E5/E6。

## Execution Plan

> 2 Phase 顺序：E4.1 包结构裁定（含 bundle 实测 + 决策）→ E4.2 空壳注册 + 依赖引入（按裁定分支执行）。E4.2 依赖 E4.1 裁定结论。

### Phase 1 - E4.1 包结构裁定

Status: completed
Targets: `packages/flux-renderers-industrial/package.json`（方案 A 测量）/ `packages/flux-renderers-industrial-editor/*`（方案 B 测量，若裁定 B 则保留）/ `docs/components/industrial-hmi-editor/design-architecture.md §4.4`、`design-renderer.md §11`（裁定结论回写）/ `docs/components/roadmap-industrial-hmi-editor.md`（总览回写）

- Item Types: `Decision | Proof | Fix`

- [x] `Decision`：roadmap Phase Status 回写 E4: `todo` → `planned`（本 plan 激活为 active 时同步执行）。
- [x] `Proof`：前置验证——核对 E3 `done`（roadmap E3 = `done` + `e3-design-gate-review.md` 存在 + 无未裁决人工确认项）；E2 设计契约稳定可供裁定。未就绪则等待（Failure Paths `upstream-not-ready`）。
- [x] `Proof`：bundle size 实测——临时引入 `@leafer-in/editor@2.2.9`（对齐 spike lockfile 版本），构建后测量：① runtime `scada-canvas` bundle 体积增量（验证 leafer-editor 是否经独立注册函数 + subpath + 动态导入可隔离出 runtime bundle）；② editor 模块独立 chunk 体积；记录实测数字（对照 `editor-initiation.md §4.1` leafer-editor 244KB / leafer-in 1.3MB 口径）。审查 pnpm-lock diff（依赖树 / MIT 许可 / 版本一致性）。
- [x] `Decision`：包结构裁定（方案 A vs 方案 B）——综合 `design-architecture.md §4.4` trade-off（命令面复用 vs 复制）+ bundle 实测（leafer-editor 是否污染 runtime bundle + 隔离可行性）+ 双态隔离强度（module/subpath 级 vs package 级）+ 维护成本。记录裁定 rationale；若方案 A，明确隔离策略（`registerScadaEditorRenderers` 独立函数 + subpath `/editor` export + editor 模块动态导入，保证 `registerScadaRenderers` 不拉入 `@leafer-in/editor`）；若 bundle 实测证明方案 A 隔离不可行 → 裁定方案 B（Failure Paths `bundle-isolation-fail`）。
- [x] `Fix`：记录裁定结论——`design-architecture.md §4.4` + `design-renderer.md §11`「待 E4.1 裁定」占位替换为实际裁定 + rationale；roadmap 总览「不新建包（首选）或新建 1 包（待 E4.1 裁定）」回写实际裁定；若方案 A，标注隔离策略；若方案 B，标注新建包 + workspace 依赖关系。
- [x] `Fix`：清理 bundle 实测的临时改动（若方案 A 测量用的临时代码与最终隔离策略不一致，按裁定结论落地正式结构而非测量脚手架）。

Exit Criteria:

> Phase 1 交付包结构裁定 + bundle 实测证据。Phase 1 已产生 package.json / 代码变更（若测量需引入依赖），故局部 typecheck 必须通过以解阻塞 Phase 2。

- [x] E4.1 裁定记录完整（方案 A 或 B + rationale + bundle 实测数字 + 隔离策略），`design-architecture.md §4.4` + `design-renderer.md §11` + roadmap 总览占位已回写实际裁定。
- [x] pnpm-lock diff 审查记录在案（依赖树 / 许可 MIT / 版本 `2.2.9` 一致性），无未裁定异常（Failure Paths `dep-version-mismatch` 不触发或已修正）。
- [x] 局部 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` 通过（方案 A）/ 新建包 typecheck 通过（方案 B），保证 Phase 2 可继续。

### Phase 2 - E4.2 scada-editor-canvas 空壳注册 + 依赖引入

Status: completed
Targets: 按裁定分支——方案 A：`packages/flux-renderers-industrial/src/editor/*`、`package.json`、`tsconfig.base.json`（paths 新增 `/editor` 子路径）、`examples.manifest.json`、`apps/playground/src/App.tsx`；方案 B：`packages/flux-renderers-industrial-editor/*`、`vite.workspace-alias.ts`、根 `tsconfig.json`、`tsconfig.base.json`、`examples.manifest.json`、`apps/playground/src/App.tsx`

- Item Types: `Fix | Proof`

- [x] `Fix`（方案 A 分支）：`flux-renderers-industrial` package.json 新增 `@leafer-in/editor@2.2.9` 依赖（`@leafer-in/text-editor@2.2.9` 延期至 E5 InnerEditor 实现，空壳期不需要）；exports 新增 subpath（`./editor`，types + default 指向 editor 子入口）；新增 `src/editor/` 骨架：`schemas.ts`（ScadaEditorCanvasSchema 最小字段 config/width/height，完整字段属 E5，对齐 `design-renderer.md §4.1`）/ `renderer-definitions.ts`（`scada-editor-canvas` 空壳定义）/ `index.ts`（导出 `registerScadaEditorRenderers` + 类型）/ `styles.css`；`registerScadaEditorRenderers(registry)` 独立注册函数（**不并入 `registerScadaRenderers`**，保证 runtime bundle 不拉入 @leafer-in/editor）。
- [x] `Fix`（方案 A 分支）：工程接线——`tsconfig.base.json` paths 新增 `@nop-chaos/flux-renderers-industrial/editor` → `./packages/flux-renderers-industrial/src/editor/index.ts`（对齐 I4 Major-1「tsconfig.base.json paths 注册缺失」三通道纪律；`moduleResolution: Bundler` + `noEmit` 下 `dist/` 不存在，缺 paths 会导致 playground `import ... from '@nop-chaos/flux-renderers-industrial/editor'` TS2307，本 Phase Exit Criteria「playground 侧无 TS2307」无法满足）。
- [x] `Fix`（方案 B 分支）：创建 `packages/flux-renderers-industrial-editor/`——package.json（name `@nop-chaos/flux-renderers-industrial-editor`；workspace 依赖 `flux-renderers-industrial`（复用 runtime 引擎/序列化/注册表面）+ flux-core/flux-react/flux-i18n/ui；runtime deps `leafer-ui@2.2.9` + `@leafer-in/editor@2.2.9` + `@leafer-in/viewport@2.2.9`；peerDependencies react/react-dom；exports `.` + `./styles.css`；sideEffects `*.css`；scripts 对齐 `flux-renderers-industrial`）/ tsconfig.json（extends `../../tsconfig.base.json`）/ tsconfig.build.json / vitest.config.ts / src 骨架（`schemas.ts`（最小字段）/ `renderer-definitions.ts`（空壳）/ `index.ts`（`registerScadaEditorRenderers` + 类型）/ `styles.css`）。
- [x] `Fix`（方案 B 分支）：工程接线三通道——`vite.workspace-alias.ts` 新增 `@nop-chaos/flux-renderers-industrial-editor` 别名；根 `tsconfig.json` project references 新增；`tsconfig.base.json` paths 新增主入口 + `/styles.css` 子路径（对齐 I4 先例 + `flux-renderers-scheduling` 模式，缺 paths 会导致 playground TS2307）。
- [x] `Fix`：`examples.manifest.json` `runtime` 数组新增 `scada-editor-canvas`（对齐 `scada-canvas` 入 `runtime` 先例；空壳期不进 `targetContract`，example 文件属 E5/E9）。
- [x] `Fix`：playground 注册——`apps/playground/src/App.tsx` 新增 `registerScadaEditorRenderers(registry)`（方案 A：`from '@nop-chaos/flux-renderers-industrial/editor'` subpath import，**禁从主入口 `index.ts` re-export**——否则 @leafer-in/editor 进主 bundle 违反隔离目标；方案 B：`from '@nop-chaos/flux-renderers-industrial-editor'`），对齐 `registerScadaRenderers` 调用位置。
- [x] `Proof`：renderer 注册单测——`scada-editor-canvas` 空壳可经 `registerScadaEditorRenderers` 注册、类型与 sourcePackage 正确（对齐 I4 `renderer-definitions.test.ts` 先例）。
- [x] `Proof`：空壳 smoke——playground 启动后构造含 `scada-editor-canvas` 的最小 schema 渲染不抛错（经测试句柄 `window.__flux_scada_editor_<cid>` 或既有 playground 测试基建抽查记录）；确认 `__FLUX_STRICT_VALIDATION__`/schema 诊断不拦截空壳 defaultSchema。
- [x] `Fix`：`docs/logs/2026/08-06.md` 记录本 plan 产出摘要（E4.1 裁定 + E4.2 注册 + smoke 结果）。

Exit Criteria:

> Phase 2 交付空壳注册 + 依赖引入 + smoke。全量 `pnpm typecheck/build/lint/test` 属 Closure Gates（plan guide Rule 18），本 Phase 只做保证 E5 可继续的局部验证。

- [x] 包基建按裁定落地（方案 A：`src/editor/` 骨架 + subpath export + `tsconfig.base.json` paths `/editor` 子路径 + 独立注册函数 + `@leafer-in/editor` 依赖；方案 B：新包完整落盘 + 工程接线三通道），结构与既有 renderer 包一致。
- [x] renderer 注册单测通过（`scada-editor-canvas` 空壳可注册、类型/sourcePackage 正确）。
- [x] `examples.manifest.json` `runtime` 含 `scada-editor-canvas`，无 manifest/registry 校验失败；playground 已注册 `registerScadaEditorRenderers`。
- [x] 空壳 smoke 渲染无异常（记录在日志或测试中）；局部 typecheck 通过（方案 A 包内 / 方案 B 新包 + playground 侧无 TS2307）。
- [x] roadmap 头部 E4 裁定记录 + daily log 已记录。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh sub-agent（general，round 1 task `ses_028c16b81ffekwZprT6Qah0p5M`；round 2 task `ses_028bd3c1efferg09AElmIVNVW1`）
- Verdict: `pass`（round 2 达成共识；round 1 `revised`，1 Major + 2 Minor 全部落地）
- Rounds: 2
- Findings addressed:
  - **Major-1「方案 A 缺 `tsconfig.base.json` paths `/editor` 子路径注册」**→ Phase 2 方案 A 新增工程接线 bullet（`tsconfig.base.json` paths `@nop-chaos/flux-renderers-industrial/editor` → `src/editor/index.ts`，对齐 I4 Major-1 三通道纪律）+ Targets + Exit Criteria + Closure Gates 同步；round 2 RESOLVED 确认（引用准确性 live 核对 `tsconfig.base.json` paths block + `moduleResolution: Bundler` + `noEmit` + I4 先例）。
  - **Minor-1「`@leafer-in/text-editor` 未声明」**→ 方案 A bullet 标注「延期至 E5 InnerEditor，空壳期不需要」；round 2 RESOLVED。
  - **Minor-2「主入口 re-export 与隔离目标矛盾」**→ Execution Plan + In-Scope playground 注册 item 统一改为「subpath import，禁从主入口 re-export 以保隔离」；round 2 RESOLVED。
  - round 2 无新增 Blocker/Major；consensus（zero Blocker + zero Major）达成。
- 引用准确性全部 CONFIRMED（runtime industrial pkg deps/exports + `registerScadaRenderers` App.tsx:116 + `examples.manifest.json` runtime/targetContract/declaredButUnregistered + `design-architecture.md §4.4`「不预判裁定」+ `design-renderer.md §11` + roadmap 总览「待 E4.1 裁定」+ 人工确认阈值不含「新建包」+ `tsconfig.base.json` paths 机制）。
- 跨计划一致性 PASS（E4→E3 前置依赖正确 + 与 E3 无 scope 重叠 + E5 排除理由 sound：E5 file Targets 依赖 E4.1 deferred 裁定）。

## Closure Gates

> 代码 plan（新增包/模块 + 依赖 + 注册），全量验证适用。

- [x] E4.1 包结构裁定完成且 rationale 完整（方案 A 或 B + bundle 实测证据 + 隔离策略），设计文档「待 E4.1 裁定」占位已回写。
- [x] E4.2 包基建按裁定落地（方案 A `src/editor/` 骨架 + 独立注册函数 + subpath + `@leafer-in/editor@2.2.9` 依赖；方案 B 新包 + 工程接线三通道），runtime `scada-canvas` bundle 未被 leafer-editor 污染（方案 A 经独立注册函数 + subpath 隔离验证 / 方案 B 经独立包隔离）。
- [x] `scada-editor-canvas` renderer 空壳注册 + smoke 通过（注册单测 + playground smoke 渲染无异常）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 缺项（renderer 完整契约 / 交互逻辑明确属 E5/E7/E9，非 E4 收口范围，已在 Non-Goals 声明）。
- [x] 受影响 owner docs 已同步：`design-architecture.md §4.4` + `design-renderer.md §11` 裁定回写 + roadmap 总览/头部记录 + daily log。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### scada-editor-canvas renderer 完整契约（fields/events/regions/handles）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 完整 renderer 契约（ScadaEditorCanvasSchema 全字段 + events + regions + 句柄面扩展 addSymbol/removeSymbol/updateSymbol）属 E5（M1 MVP 实现）/ E7（M2）/ E9（M3）职责，roadmap 明确 E4.2 为「首期空壳注册，fields/events 随 E5/E7/E9 补全」。E4 只交付能 smoke 渲染的空壳（最小 config/width/height 字段），不阻塞 E5 在此基础上补全契约。
- Successor Required: yes
- Successor Path: E5 plan（`scada-editor-canvas` 完整契约 + 双态切换 + 图元库 + 属性面板）；E7（连线 + undo-redo 句柄）；E9（工具箱）。

### 编辑态性能测量 / benchmark 复测

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 编辑态性能最终验证属 E6（M1 gate）+ E9.2（M3 benchmark 复测），roadmap Phase Details E1.2 已立。E4 是包基建，不涉及运行态包络（runtime 红线不变）也不涉及编辑态包络数字最终确立（R7 待人工确认）。E4 引入 leafer-editor 不改变 runtime `scada-canvas` 渲染路径（双态隔离）。
- Successor Required: yes
- Successor Path: E6（M1 gate）/ E9.2（M3 benchmark 复测）。

## Non-Blocking Follow-ups

- playground demo 页 / 编辑器交互 demo（属 E5/E9 playground demo 职责，非 E4 收口范围）。
- i18n 文案 + quick-reference 组件表新增 `scada-editor-canvas`（属 E5/E9 文档收尾，E4 空壳期可暂缓；roadmap Cross-Cutting「组件注册」要求新 renderer type 同步 i18n/quick-reference，但完整文案随 E5 完整契约落地）。
- 若方案 A 采用动态导入 editor 模块，动态导入的 chunk 命名 / 预加载策略可在 E5 实现时细化。

## Closure

Status Note: E4 包基建与依赖引入收口——方案 A 裁定（不新建包，编辑器放入既有 `flux-renderers-industrial` 的 `src/editor/` subpath）+ `@leafer-in/editor@2.2.9` 依赖引入 + `scada-editor-canvas` renderer 空壳注册 + 工程接线三通道（tsconfig.base.json paths + vite.workspace-alias.ts + package.json exports）。模块图隔离经 grep 证明（主入口 `src/index.ts` 零 editor 引用 + `src/` 无 `@leafer-in/editor` runtime import），runtime `scada-canvas` bundle 不被 leafer-editor 污染。E5 M1 MVP 实现可在此包基建上推进。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session sub-agent `ses_0289e205afferYBEI18enNPCdC`（general subagent，非执行 session，2026-08-06）
- Evidence: verdict = **pass**，0 Blocker / 0 Major / 2 Minor（非阻断，已处理）。逐项独立核对：
  - **Closure Gates 全量验证**：`pnpm typecheck` 32/32 ✓ + `pnpm test` 59/59 tasks ✓（industrial 57 files / 754 tests 含 13 个新 editor 测试，src/editor 覆盖率 100%）+ `pnpm --filter ...industrial lint` 0 errors ✓。
  - **核心隔离（E4.1 风险点）**：`grep "editor" src/index.ts` = ZERO（主入口不触及 editor 模块）；`grep "@leafer-in/editor" src/` = 4 hits 全为 JSDoc 注释，零 runtime import 语句 → 模块图隔离证明。
  - **Phase 1（E4.1 裁定）**：roadmap E4 = `planned` + E3 prereq = `done` ✓；`@leafer-in/editor@2.2.9` 精确版本 package.json:28 ✓；design-architecture.md §4.4.1 新裁定块（4 维 rationale + 隔离结构图 + 三通道接线）+ trade-off 表行 + §3 + §11 ✓；design-renderer.md §3 sourcePackage + §11 ✓；4 sibling docs 包归属更新 ✓；roadmap总览 line 93 ✓。
  - **Phase 2（E4.2 空壳注册）**：`src/editor/` 7 文件齐全且符合 RendererDefinition 契约（defaultSchema 含合法空 config + sourcePackage + rendererClass + 最小 fields + 占位组件）✓；package.json exports `./editor` + `./editor/styles.css` + build copy ✓；tsconfig.base.json paths `/editor` + `/editor/styles.css` ✓；vite alias `/editor` 置于 main 之前（防前缀误匹配）✓；examples.manifest.json `runtime` 含 `scada-editor-canvas` ✓；App.tsx subpath import + 独立注册调用 ✓；注册单测验独立性 + 幂等 + smoke 渲染 ✓。
  - **Minor 已处理**：① daily log 表述先于实际状态（本 finalize 后一致）；② design-architecture.md:219 残留「待 E4.1 裁定」字面为历史引述 → 已改写为「原占位」消除 grep 误报，现 `grep "待 E4.1 裁定" docs/components/industrial-hmi-editor/` = ZERO。
  - `git diff --stat` 确认变更范围：industrial src/editor/\* + package.json + tsconfig.base.json + vite.workspace-alias.ts + examples.manifest.json + App.tsx + 6 design docs + roadmap + 本 plan + daily log + pnpm-lock.yaml。

Follow-up:

- 无剩余 plan-owned work。E4 包基建（src/editor/ subpath + @leafer-in/editor@2.2.9 + scada-editor-canvas 空壳 + 三通道接线）已完整落地，runtime bundle 隔离经证明成立。
- renderer 完整契约（fields/events/regions/handles 完整版）/ 双态切换 / 图元库 / 拖拽 / 属性面板 / 保存加载 → E5（M1 MVP 实现）successor ownership。
- `@leafer-in/text-editor@2.2.9`（InnerEditor 插件，spike 约束 #8）→ E5.1 InnerEditor 实现。
- 编辑态性能测量 / benchmark 复测 → E6（M1 gate）/ E9.2（M3 benchmark 复测）。
- R7 编辑态包络数字最终确认 → 人工（E1.2 标记）。
