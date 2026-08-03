# 2 I4 包基建与依赖引入（flux-renderers-industrial）

> Plan Status: completed
> Last Reviewed: 2026-08-03
> Source: `docs/components/roadmap-industrial-hmi.md`（I4、Cross-Cutting 新增包流程/平台能力复用表/测试纪律）、`docs/components/industrial-hmi/design-renderer.md`（§11 实现拆分建议：schemas.ts 为 I4.1 职责）、`docs/components/industrial-hmi/design-engine.md`（§4.1 ScadaEngineOptions）、AGENTS.md「Adding New Packages」
> Related: 上游 `docs/plans/2026-08-03-2113-1-i3-design-gate-review.md`（I3 gate，前置等待）；下游 `docs/plans/2026-08-03-2113-3-i5-engine-core-wave1.md`（I5 引擎 Wave 1，依赖本 plan I4.1）
> Mission: industrial-hmi
> Work Item: I4

## Purpose

创建新包 `@nop-chaos/flux-renderers-industrial` 并引入 `leafer-ui` 渲染底座依赖（版本与 I1.2 spike 一致），把 `scada-canvas` 以空壳形式注册到 examples.manifest.json 与 playground registry，为 I5 引擎 Wave 1 提供可编译、可测试、可在 playground 运行的包骨架。收口状态：包基建齐全（typecheck/build/lint/test 全绿）、空壳注册可渲染、roadmap I4 回写 `done`。

## Current Baseline

- 调研记录：`docs/analysis/industrial-hmi/research-download.md` §2.2 已校准 leafer-ui 性能数字与许可（MIT）；spike 实测使用 leafer-ui `2.2.9` + `@leafer-in/viewport` `2.2.9`（gate-1-review §3.1，选型确认）。
- 设计文档已定稿：`design-renderer.md` §11 拆分建议（`renderer-definitions.ts` 空壳为 I4.2 / 完整为 I10.2；`schemas.ts` 为 I4.1 包 schema 类型 barrel）；`design-engine.md` §4.1 `ScadaEngineOptions` 契约（引擎创建参数，I5 消费）。
- 包创建模板：`packages/flux-renderers-scheduling/`（package.json scripts/tsconfig/vitest/exports/styles.css 模式）+ `packages/flux-renderers-mobile/`（build 脚本 `copy-build-assets.mjs` 复制 styles.css）。
- playground 注册模式：`apps/playground/src/App.tsx` 中 `import { registerSchedulingRenderers } from '...'` + `registerSchedulingRenderers(registry)`（registry 工厂 `createDefaultRegistry` 来自 `@nop-chaos/flux-react`，底层注册 API `registerRendererDefinitions`/`RendererRegistry` 在 `@nop-chaos/flux-core`）。
- `apps/playground/src/styles.css` 的 `@source "../../../packages"` 已全局覆盖新包样式扫描——**无需改动**（roadmap I4.1 注）。
- `docs/components/examples.manifest.json`：`runtime` 数组为运行期已注册 renderer type 清单（新注册 type 如 `barcode-input`/`diff-view` 由此加入）；`gantt`/`kanban`/`calendar` 等已在 `targetContract`（有 example.json 的组件清单）；`declaredButUnregistered` 为声明未注册项。空壳期 `scada-canvas` 只进 `runtime`，example 文件属 I13。
- TS 工程接线双通道：`vite.workspace-alias.ts`（dev 运行时解析）+ 根 `tsconfig.json` references（构建引用）之外，每个 workspace 包还需注册到 `tsconfig.base.json` 的 `paths`（含 `/styles.css` 子路径，`tsconfig.base.json` 中 `@nop-chaos/flux-renderers-scheduling` 先例）——playground 类型检查（TS2307）依赖该 paths，缺省会破坏 Closure Gate `pnpm typecheck`。
- 真正剩余的 gap：`flux-renderers-industrial` 包不存在；`leafer-ui` 尚未入 pnpm-lock（`grep leafer pnpm-lock.yaml` 无匹配）；`scada-canvas` 未注册到 manifest 与 playground。

## Goals

- I4.1：新包 `packages/flux-renderers-industrial/` 落盘（package.json/tsconfig×2/vitest.config/src 骨架：schemas.ts、renderer-definitions.ts、index.ts、styles.css），`leafer-ui@2.2.9` + `@leafer-in/viewport@2.2.9` 入 dependencies，pnpm-lock diff 审查通过（许可 MIT、依赖树与体积预算对照 I0.1 记录），工程接线三通道更新（`vite.workspace-alias.ts` 别名 + 根 `tsconfig.json` references + `tsconfig.base.json` paths）。
- I4.2：`scada-canvas` 空壳注册——`examples.manifest.json` runtime 列表新增 `scada-canvas`；playground `App.tsx` 调用 `registerScadaRenderers(registry)`；空壳 renderer-definition（type `scada-canvas`，component 为占位渲染，fields/events 留空，随 I10.2 补全）。
- 包级验证：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck`/`test` 通过；playground 启动后 `scada-canvas` 空壳可渲染不报错。

## Non-Goals

- 不实现引擎/图元/序列化任何逻辑（属 I5）。
- 不补全 fields/events/regions/handles 完整注册（属 I10.2）。
- 不做 playground 演示页/示例页（属 I13）。
- 不评估 `scada-symbol` 图元级 type 注册（属 I8/I9 后）。
- 不改动 `apps/playground/src/styles.css`（`@source` 已覆盖，roadmap 注）。

## Scope

### In Scope

- 新包创建：package.json（workspace 依赖 `@nop-chaos/flux-core`、`@nop-chaos/flux-react`、`@nop-chaos/flux-i18n`、`@nop-chaos/ui`；runtime 依赖 `leafer-ui`、`@leafer-in/viewport`；**peerDependencies react/react-dom（可选标记按既有包惯例）**；devDeps react/react-dom/vitest 环境；scripts build/typecheck/test/lint 对齐既有包；exports 含 `./styles.css`；`sideEffects: ["*.css"]`）、tsconfig.json（extends `../../tsconfig.base.json`，noEmit）、tsconfig.build.json（outDir dist，exclude 测试）、vitest.config.ts（`createSharedVitestConfig`，environment `happy-dom`，初始 coverage 阈值按当前骨架基线设定并注明提升方向）。
- src 骨架：`schemas.ts`（按 `design-renderer.md` §4.1 `ScadaCanvasSchema` 的类型 barrel）、`renderer-definitions.ts`（`scada-canvas` 空壳定义：type/displayName/category/sourcePackage/defaultSchema/component 占位；fields/events 空数组 + 注释指向 I10.2）、`index.ts`（导出 `registerScadaRenderers` + 类型）、`styles.css`（占位空文件，随 wave 增量）。
- 依赖引入：`pnpm add leafer-ui@2.2.9 @leafer-in/viewport@2.2.9`（workspace 根或包内，以 repo 惯例为准）；**pnpm-lock diff 审查**：核对依赖树（leafer-ui 零依赖 + `@leafer-in/*` 子包）、许可（MIT，对照 `research-download.md` §2.1 许可矩阵）、体积预算（官方 70KB min+gzip，对照 I0.1 记录）；异常（版本漂移/许可不符/体积超预算）按 Failure Paths 处理。
- 工程接线（三通道）：`vite.workspace-alias.ts` 新增 `@nop-chaos/flux-renderers-industrial` 别名（指向 `src/index.ts`，对齐既有包别名指向 `.tsx`/`.ts` 的实际入口）；根 `tsconfig.json` project references 新增该包；**`tsconfig.base.json` `paths` 新增 `@nop-chaos/flux-renderers-industrial` → `./packages/flux-renderers-industrial/src/index.ts` + `/styles.css` 子路径**（对齐 `@nop-chaos/flux-renderers-scheduling` 先例；playground TS2307 解析依赖此 paths，缺省则 Closure Gate `pnpm typecheck` 失败）。
- 空壳注册：`examples.manifest.json` runtime 数组新增 `"scada-canvas"`；`apps/playground/src/App.tsx` 新增 `import { registerScadaRenderers }` + 注册调用。
- 验证与文档：包内 focused 测试（renderer-definitions 注册断言，参考 `flux-renderers-scheduling/src/scheduling-renderer-definitions.test.ts` 模式）；`docs/logs/2026/08-03.md` 记录产出。

### Out Of Scope

- 引擎实现（I5）、数据绑定（I6）、图元库（I8/I9）、React 桥接完整实现（I10）。
- 组态 JSON schema 运行时校验器（I5.3 `serialization/validate.ts`）——I4 只建立包类型骨架，不实现校验逻辑。
- i18n 文案（I15.1）、quick-reference 组件表（I15.2）。

## Failure Paths

| 可测场景编号              | 触发                                                                                                                                                       | 行为                                                                                         | 可重试 | 用户可见表现                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------- |
| upstream-not-ready        | I3 gate（`docs/plans/2026-08-03-2113-1-i3-design-gate-review.md`）未完成——具体就绪判定：roadmap I3 = `done` 且 `gate-2-review.md` 存在、无待人工裁决修正项 | 本 plan 保持等待：Phase 1 前置 Proof 项按上述判定核对，未就绪则不执行                        | 是     | plan 保持 `planned`/`in progress`，roadmap I4 保持 `todo` |
| dep-license-or-size-alert | leafer-ui 版本漂移、许可与 I0.1 记录不符、或依赖树超出体积预算                                                                                             | 停止引入，回写记录并标记人工确认（roadmap「人工确认阈值」），不自动推进                      | 否     | I4 挂起，人工裁决                                         |
| manifest-registration-gap | `scada-canvas` 注册后 manifest/registry 校验（既有脚本或测试）报缺失                                                                                       | 修复注册（类型名/大小写/导入路径逐项核对）后重跑验证；若存在 manifest 校验脚本则先定位其规则 | 是     | playground 无法渲染/CI 校验失败                           |
| strict-validation-block   | 空壳默认 schema 触发 `__FLUX_STRICT_VALIDATION__`/schema 诊断失败                                                                                          | 按 flux-core 校验契约补 `defaultSchema` 合法最小字段（对齐既有包 defaultSchema 模式）        | 是     | playground 报 schema 诊断错误                             |

## Test Strategy

档位选择：`建议有测`——包骨架与注册属于工程基建，风险在「注册可渲染、校验不炸」；本 plan 至少覆盖：① renderer-definitions 注册单测（类型/空壳字段可注册、registry 无冲突）；② playground 启动 smoke（`scada-canvas` 空壳渲染无异常，经既有 route/schema 测试或人工抽查）；③ 包级 typecheck 全绿。引擎/图元/序列化逻辑测试属 I5（必测档，单测先行）。

## Execution Plan

### Phase 1 - I4.1 包创建与依赖引入

Status: completed
Targets: `packages/flux-renderers-industrial/*`、`pnpm-lock.yaml`、`vite.workspace-alias.ts`、根 `tsconfig.json`

- Item Types: `Fix | Proof | Decision`

- [x] `Proof`：前置验证——核对 I3 gate 已关闭（**具体判定：roadmap I3 = `done` 且 `gate-2-review.md` 存在、无待人工裁决项**），且 `design-renderer.md` §4.1/§11 契约未被 I3.2 修正为与本文冲突；未就绪则等待（Failure Paths `upstream-not-ready`）。
- [x] `Fix`：创建 `packages/flux-renderers-industrial/`：package.json（workspace 依赖 flux-core/flux-react/flux-i18n/ui；runtime deps `leafer-ui@2.2.9`、`@leafer-in/viewport@2.2.9`；peerDependencies react/react-dom（可选标记按既有包惯例）；exports `./styles.css`；sideEffects；scripts 对齐 `flux-renderers-mobile` 的 build/typecheck/test/lint 模式）、tsconfig.json、tsconfig.build.json、vitest.config.ts、src 骨架（`schemas.ts`/`renderer-definitions.ts`/`index.ts`/`styles.css`）。
- [x] `Decision`：`schemas.ts` 类型范围——按 `design-renderer.md` §4.1 落地 `ScadaCanvasSchema`/`ScadaCanvasEvents`（config/width/height/loading/empty/viewport/events 字段），组态 JSON 内部类型（ScadaConfig/ScadaSymbolNode）留待 I5.3 `serialization/config-types.ts` 再导出（避免空包承载未实现契约）。
- [x] `Fix`：`pnpm add` 引入 `leafer-ui@2.2.9` + `@leafer-in/viewport@2.2.9`；审查 pnpm-lock diff（依赖树/许可 MIT/体积预算，对照 `research-download.md` §2.1/§2.2；spike 工程 lockfile 作版本参考）。
- [x] `Fix`：工程接线三通道——`vite.workspace-alias.ts` 新增包别名；根 `tsconfig.json` project references 新增 `./packages/flux-renderers-industrial`；**`tsconfig.base.json` `paths` 新增包主入口 + `/styles.css` 子路径**（对齐 `@nop-chaos/flux-renderers-scheduling` 先例，缺省会导致 playground 类型检查 TS2307 与 Closure Gate 失败）。
- [x] `Proof`：renderer-definitions 注册单测（`scada-canvas` 空壳可经 `registerRendererDefinitions` 注册、类型与 sourcePackage 正确）。

Exit Criteria:

- [x] `packages/flux-renderers-industrial/` 完整落盘（package.json/tsconfig×2/vitest.config.ts/schemas.ts/renderer-definitions.ts/index.ts/styles.css），结构与既有 renderer 包一致（`sideEffects`/exports/scripts/peerDependencies）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` 通过；包内注册单测通过（`pnpm --filter @nop-chaos/flux-renderers-industrial test`）。
- [x] pnpm-lock diff 审查记录在案（依赖树/许可/体积），无未裁定异常；工程接线三通道（vite.workspace-alias.ts / 根 tsconfig references / tsconfig.base.json paths）已更新；playground 侧类型检查无 TS2307（`pnpm --filter @nop-chaos/flux-playground typecheck` 或等价局部验证）。

### Phase 2 - I4.2 scada-canvas 空壳注册

Status: completed
Targets: `docs/components/examples.manifest.json`、`apps/playground/src/App.tsx`

- Item Types: `Fix | Proof`

- [x] `Fix`：`examples.manifest.json` `runtime` 数组新增 `"scada-canvas"`（若 manifest 校验要求 example.json 文件，按既有 `declaredButUnregistered`/`targetContract` 语义处理——空壳期可仅进 `runtime`，example 文件属 I13）。
- [x] `Fix`：`apps/playground/src/App.tsx` 新增 `import { registerScadaRenderers } from '@nop-chaos/flux-renderers-industrial'` + `registerScadaRenderers(registry)`（对齐 `registerSchedulingRenderers` 调用位置）。
- [x] `Proof`：空壳渲染 smoke——playground 启动后构造含 `scada-canvas` 的最小 schema 渲染，断言不抛错（经既有 playground 测试基建或人工抽查记录）；确认 `__FLUX_STRICT_VALIDATION__`/schema 诊断不拦截空壳 defaultSchema。
- [x] `Fix`：`docs/logs/2026/08-03.md` 记录本 plan 产出摘要。

Exit Criteria:

- [x] `examples.manifest.json` runtime 含 `scada-canvas`，无 manifest/registry 校验失败。
- [x] playground `App.tsx` 已注册 `registerScadaRenderers`，最小 schema smoke 渲染无异常（记录在日志或测试中）。
- [x] roadmap I4 状态已按 plan 生命周期回写（Closure Gates 全过后置 `done`）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh sub-agent（general，rounds 1-2，task `ses_038397f55ffezX8MdBl0uECl1z`）
- Verdict: `pass`（round 2；round 1 `revised`，1 Major + 4 Minor 全部落地）
- Rounds: 2
- Findings addressed: Major-1「tsconfig.base.json paths 注册缺失」→ 工程接线三通道补全（Current Baseline/Goals/In Scope/Phase 1/Exit Criteria/Closure Gates，含 `/styles.css` 子路径 + playground 局部 typecheck）；m-1「manifest 基线描述错误」→ 修正（gantt/kanban/calendar 属 `targetContract`，新 type 入 `runtime` 先例为 barcode-input/diff-view）；m-2「registry 来源措辞」→ 修正（createDefaultRegistry 属 flux-react、注册 API 属 flux-core）；m-3「upstream-not-ready 判定模糊」→ 具体化（roadmap I3 = `done` 且 gate-2-review.md 无未决项）；m-4「peerDependencies 缺项」→ package.json 规格补充 react/react-dom。

## Closure Gates

- [x] 新包落盘完整且包级验证通过（typecheck + 注册单测；`pnpm --filter @nop-chaos/flux-renderers-industrial test` 无失败）。
- [x] `leafer-ui@2.2.9` + `@leafer-in/viewport@2.2.9` 入 dependencies，pnpm-lock diff 审查通过（许可 MIT/依赖树/体积预算，无未裁定异常）。
- [x] `vite.workspace-alias.ts` 别名 + 根 tsconfig references + **`tsconfig.base.json` paths**（主入口 + `/styles.css`）三通道已更新，playground 可解析新包且无 TS2307。
- [x] `scada-canvas` 空壳注册完成（manifest runtime + playground registry），渲染 smoke 无异常；不存在被静默降级到 deferred / follow-up 的 in-scope 缺项。
- [x] 受影响的 owner 文档已同步（docs/logs 收口摘要；架构文档同步属 I15.2，不在本 plan 范围）。
- [x] roadmap Phase Status I4 已回写 `done`。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### fields/events 完整注册（scada-canvas 契约补全）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap I4.2 明确「首期空壳注册，fields/events 随 I10 补全」；空壳期只有 type/component/defaultSchema，无完整契约语义，不构成已确认的 contract gap（契约由 `design-renderer.md` §5 定义并在 I10.2 落地）。
- Successor Required: `yes`
- Successor Path: roadmap I10.2（renderer-definitions 完整注册）

### 新包 coverage 阈值初始值

- Classification: `optimization candidate`
- Why Not Blocking Closure: vitest.config.ts 初始阈值按骨架期实际覆盖设定（参考 spreadsheet-core「threshold established at current baseline」先例）；I5/I8–I10 各 wave 落地后随代码覆盖提升阈值（只升不降），不阻塞本 plan 关闭。
- Successor Required: `yes`
- Successor Path: I5/I8–I10 各 wave plan 内执行

### i18n 文案与 quick-reference 组件表

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap 组件注册条款的 i18n/quick-reference 项已在 roadmap 明确归属 I15.1/I15.2 收尾，空壳注册期无 i18n 文案需求。
- Successor Required: `yes`
- Successor Path: roadmap I15.1/I15.2

## Non-Blocking Follow-ups

- 若 manifest 校验存在独立脚本/测试（本 plan 起草时未在 `apps/`/`scripts/`/`tests/` 检索到引用），执行期先定位其规则再注册，避免破坏既有校验链路。
- 记录 `leafer-ui` 实际安装版本与 lockfile 快照到日志，供 I14 benchmark 复测版本对照。

## Closure

Status Note: 两 Phase 全绿执行完毕，workspace typecheck 32/32、build 32/32、lint 32/32、test 59/59 全绿；closure-audit（独立 fresh session）verdict `approved`（0 Blocker/0 Major/0 Minor，11 项核查通过）；roadmap I4 已回写 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，task `ses_03804462fffeCBo2xwSf3BFEDA`）
- Evidence: verdict `approved`——11 项核查全部通过：① 两 Phase 全部 `[x]` + Status `completed`，未勾选项仅存 Closure Gates（留给审计）；② 包文件与 In Scope 逐项一致（package.json 依赖/peer/exports/sideEffects/scripts、tsconfig 双份、vitest 阈值基线注释）；③ 骨架期 drift 均为计划内（config `string | SchemaObject` 为 I5.3 前占位、placeholder 组件为 registry 必需、src 根目录布局 I10.2 迁移 `renderer/`）；④ lockfile 审查：leafer-ui@2.2.9 MIT 零外部依赖（10 项全 `@leafer*` 2.2.9）、@leafer-in/viewport@2.2.9 MIT 零依赖 peer 全 2.2.9；⑤ 三通道接线逐文件核对；⑥ manifest runtime 含 scada-canvas（JSON parse 验证）且 App.tsx 注册就位；⑦ smoke 测试真实走完整 runtime + strict validation（共享 vitest 配置双 env flag + setupFiles）并断言 DOM 契约；⑧ 包级 typecheck/test 新鲜重跑全绿（9 tests 100% 可执行行覆盖，schemas.ts 为纯类型 0 行不计阈值）、workspace 四命令全绿（turbo 缓存与包级新鲜结果一致）、playground 无 TS2307；⑨ docs/logs 条目就位；⑩ Deferred 分类诚实（fields/events→I10.2、coverage→基线只升不降、i18n/quick-reference→I15.1/I15.2），无 in-scope 静默降级；⑪ 上游 I3 gate 就绪验证。

Follow-up:

- 无剩余 plan 归属工作。I5 引擎 Wave 1（plan `2026-08-03-2113-3`）前置 Proof（I4.1 就绪）已满足，可推进；`leafer-ui@2.2.9` 实际安装版本与 lockfile 快照已记入 docs/logs（I14 benchmark 复测版本对照）。
