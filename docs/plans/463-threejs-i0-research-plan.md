# 463 Three.js 集成 I0.1 调研收口计划

> Plan Status: completed
> Last Reviewed: 2026-09-13
> Source: `docs/backlog/threejs-integration-roadmap.md`（I0.1）、`docs/components/threejs-integration/design.md`（v4）、`docs/analysis/threejs-integration-analysis.md`
> Related: 后续 I1.1（设计共识审查，本计划产出是其直接输入）

## Purpose

把路线图 I0.1（调研）收口：Three.js 核心 API 深度分析、industrial-hmi 复用点确认（对照 live code）、性能基准测试框架搭建。产出物直接作为 I1.1 设计共识审查的输入证据。

## Current Baseline

- `docs/analysis/threejs-integration-analysis.md`（377 行）已覆盖开源方案对比（R3F / 裸 Three.js / FUXA）与集成架构建议，但**缺**路线图 I0.1 要求的三块：Three.js 核心 API 深度分析（场景/渲染器/几何/材质/灯光）、industrial-hmi 复用点确认、性能基准测试框架。
- 设计文档 v4（`docs/components/threejs-integration/design.md`）已产出，但与调研文档存在两处未裁定分歧：(a) 渲染技术路线——v4 用 `@react-three/fiber`，调研推荐裸 Three.js；(b) 包落点——v4 新建 `flux-renderers-3d`，调研建议扩展 `flux-renderers-industrial`。该裁定属 I1.1，本计划只记录事实证据。
- 初步核对发现设计 v4 的表达式编译 API 用法与 live code 不一致：v4 写 `formulaCompiler.compileExpression()` + `evaluateWithState(compiled, ...)`，但 `CompiledExpression`（`formulaCompiler.compileExpression` 的返回类型）不是 `DynamicRuntimeValue`，而 `evaluateWithState` 要求 `DynamicRuntimeValue`（`packages/flux-core/src/types/compiled-value-types.ts:19-24,117-144`）；scada 桥接实际走 `compileValue()` + `evaluateValue()`（`packages/flux-renderers-industrial/src/renderer/hooks/use-scada-points-bridge.ts:357-367`）。此发现需在调研文档中固化为 I1.1 裁定输入。
- industrial-hmi（`packages/flux-renderers-industrial`）已落地 scada-canvas + socket 数据桥接 + 表达式求值工具（`src/binding/flux-eval.ts` 的 `createPrivateEvalScope`/`extractExpressionDepsViaProbe`/`probeExpressionPaths` + `src/renderer/hooks/use-scada-points-bridge.ts:56` 的 `analyzeFluxSubscriptions`），是路线图声明的 I3 直接复用源；逐项 file:line 级确认未做。
- 工作区尚无 `three` 依赖（`grep three` 于 package.json 无命中）；npm registry 可达，`three@0.186.0` 可安装。
- `RendererEnv.openSocket` 为同步返回 `WebSocketConnection`，事件用 `socket.onmessage = fn` 属性赋值风格（`packages/flux-core/src/types/renderer-api.ts:136-167`），与设计 v4 §5 的声明一致。

## Goals

- `docs/analysis/threejs-integration-analysis.md` 新增三节：Three.js 核心 API 深度分析（版本锁定 0.186.0，覆盖 Scene/WebGLRenderer/几何/材质/灯光/动画/资源释放与属性 `.set()` 语义）、industrial-hmi 复用点确认（每项引用 live `file:line` 并核对导出签名）、性能基准框架说明（目标指标 + 运行方式 + 基线数据）。
- 设计 v4 与调研文档的分歧点（R3F vs 裸 Three.js；新包 vs 扩展 industrial）以「事实证据 + 待裁定」清单形式记录，供 I1.1 直接引用。
- `scripts/three-perf/` 下落一个可运行的 CPU 侧基准脚本（three 场景图构建/属性写入路径/几何材质构建释放吞吐），根工作区 devDependencies 引入 `three` + `@types/three`。

## Non-Goals

- 不裁定 R3F vs 裸 Three.js、新包 vs 扩展 industrial（I1.1 共识审查的职责）。
- 不创建 `flux-renderers-3d` 包、不写任何渲染器代码（I2.1）。
- 不实现 WebGL 渲染帧率（GPU 侧）基准——node 环境无 GL 上下文，浏览器侧 fps 基准挂接 e2e 基建，待渲染器落地（I2.1 后）补充。
- 不实现 ReconnectionManager / 协议适配器（I3.1）。

## Scope

### In Scope

- `docs/analysis/threejs-integration-analysis.md` 扩展三节 + 分歧待裁定清单。
- `scripts/three-perf/bench-scene-graph.mjs` + 运行说明（`.mjs`，遵循 scripts/ 目录既有约定）。
- 根 `package.json` devDependencies 增 `three`、`@types/three`。

### Out Of Scope

- 任何 `packages/` 下的代码改动。
- 设计文档 v4 的修改（I1.1 职责）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：不适用——纯文档 + 独立验证脚本（scripts/three-perf），无产品行为变更；脚本可运行且 --json 输出可解析即为 proof，无独立单元测试。

## Failure Paths

不适用：纯文档调研 + 独立基准脚本，无错误处理/API 契约/鉴权/外部集成面。

## Execution Plan

### Phase 1 - industrial-hmi 复用点确认与 API 事实核对

Status: completed
Targets: `docs/analysis/threejs-integration-analysis.md`

- Item Types: `Proof | Decision`

- [x] 逐项核对 industrial-hmi 可复用面并记录 file:line：`createPrivateEvalScope`/`extractExpressionDepsViaProbe`/`probeExpressionPaths`（`src/binding/flux-eval.ts`）、`analyzeFluxSubscriptions`（`src/renderer/hooks/use-scada-points-bridge.ts:56`）、`useScadaPointsBridge` 的 `useScopeSelector` paths 精确订阅模式、socket 数据桥接（`RendererEnv.openSocket` 签名与 `WebSocketConnection` 事件风格）、`ExpressionCompiler` 实际可用 API 面（`compileValue`/`evaluateValue`/`evaluateWithState`/`createState`/`formulaCompiler`）。
- [x] 固化「设计 v4 API 用法核对表」：逐条标注 v4 代码示例与 live 类型签名的匹配/不匹配（已知至少 1 处：`evaluateWithState(CompiledExpression)` 类型不匹配），作为 I1.1 裁定输入。
- [x] 记录 R3F vs 裸 Three.js、新包 vs 扩展 industrial 两项待裁定分歧的事实面（依赖体积、React 19 兼容、与现有渲染器契约的贴合度）。

Exit Criteria:

- [x] 调研文档新增「industrial-hmi 复用点确认」一节，每个复用点引用 live `file:line` 且导出签名与正文描述一致（抽查可复核）。
- [x] 「设计 v4 API 用法核对表」与「待裁定分歧清单」成节，每条引用 live 类型/文件位置。

### Phase 2 - Three.js 核心 API 深度分析

Status: completed
Targets: `docs/analysis/threejs-integration-analysis.md`, 根 `package.json`

- Item Types: `Proof`

- [x] 安装 `three@0.186.0` + `@types/three@^0.186.0` 到根 devDependencies，并以安装后的 `.d.ts` 为事实来源核对 API 签名。
- [x] 撰写核心 API 深度分析节：Scene 图与 Object3D 属性模型（position/rotation/scale 的 `Vector3`/`Euler` `.set()` 语义，直接赋值 vs `.set()` 的差别）、WebGLRenderer 生命周期与 `dispose()` 链、常用几何（Box/Sphere/Cylinder/Plane）与材质（Basic/Lambert/Phong/Standard）能力对照、灯光五类（ambient/directional/point/spot/hemisphere）参数语义、AnimationMixer 基本模型——均以设计 v4 用到的 API 面为限。

Exit Criteria:

- [x] 调研文档新增「Three.js 核心 API 深度分析」节，API 事实与 `node_modules/@types/three` 的 `.d.ts` 一致（抽查 `Vector3.set`、`Euler.set`、`AnimationMixer.clipAction` 等至少 5 处签名）。
- [x] 版本锁定说明（three 0.186.0）写入文档。

### Phase 3 - 性能基准测试框架搭建

Status: completed
Targets: `scripts/three-perf/bench-scene-graph.mjs`, 根 `package.json`

- Item Types: `Fix | Proof`

- [x] 实现 `scripts/three-perf/bench-scene-graph.mjs`：node 直跑（`node scripts/three-perf/bench-scene-graph.mjs`），基准场景至少覆盖 (a) 几何+材质批量构建与 dispose 吞吐、(b) Object3D 属性写入路径（模拟绑定引擎的 `updateProperty` 点分导航 + `Vector3.set`）、(c) 灯光/场景组装成本；输出含 ops/sec 的对比表，支持 `--json`。
- [x] 调研文档新增「性能基准框架」节：目标指标（60fps / 状态更新→渲染延迟 < 16ms / 错误恢复 < 1s，来自设计 v4 §1.2）、运行方式、本次 CPU 侧基线数据、浏览器侧 fps 基准的后续挂接点（I2.1 后 e2e）。

Exit Criteria:

- [x] `node scripts/three-perf/bench-scene-graph.mjs` 在本机跑通并产出三组基准数据（数字写入调研文档基线表）。
- [x] `--json` 输出为合法 JSON（`node ... --json | node -e "JSON.parse(require('fs').readFileSync(0))"` 可解析）。

## Draft Review Record

> 由独立子 agent（fresh session）填写。

- Reviewer / Agent: independent sub-agent（general-purpose fresh session）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: R1 Major-1 `analyzeFluxSubscriptions` 归属由 `flux-eval.ts` 改为 `use-scada-points-bridge.ts:56`（Baseline + Phase 1 两处）；R1 Major-2 Closure Gates 增 `pnpm check` 条目；R1 Minor-1 行号引用改 `compiled-value-types.ts:19-24,117-144`；R1 Minor-2 Phase 2 Targets 补根 `package.json`；R1 Minor-3 Test Strategy 改「不适用」+ 理由；R1 Minor-4 补 Failure Paths「不适用」声明。R2 复核零 Blocker/Major，残留 1 个 markdown 嵌套反引号 Minor 已由起草者顺手修复。

## Closure Gates

- [x] Phase 1–3 全部 Exit Criteria 勾选完毕
- [x] 调研文档三节齐全且与 live repo / 安装的 `@types/three` 事实一致
- [x] 基准脚本可复跑，基线数据已记录
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响的 owner docs 已同步（本计划即改 owner doc `docs/analysis/threejs-integration-analysis.md`，无其他 drift）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（verdict: approved，见 Closure Audit Evidence）
- [x] `pnpm typecheck` 39/39
- [x] `pnpm build` 39/39
- [x] `pnpm lint` 39/39
- [x] `pnpm test` 72/72 任务 12,185 passed / 0 failed
- [x] `pnpm check` exit 0 零新增 red hit（新增 hit 须先在 `docs/logs/` 注册）

## Deferred But Adjudicated

### 浏览器侧 GPU/fps 基准（挂接 Playwright）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: node 无 GL 上下文，GPU 基准需渲染器组件存在后挂接 e2e 基建；I0.1 交付的 CPU 侧基准已覆盖绑定引擎与场景图热路径，为 I2.1 前的可用基线。
- Successor Required: `yes`
- Successor Path: I2.1 计划内补 e2e fps 抽查（或其 successor plan）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: I0.1 三块交付（调研文档 §7–§10、bench 脚本 + 基线、根 devDeps three）全部落地；独立子 agent closure audit 判定 approved（3 项文档级回修已随 closure commit 落地：§9.3 行号引用更正、roadmap I0 状态与 socket 勘误同步、本节证据填写）。roadmap I0 → done。

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent（general-purpose fresh session）
- Evidence: 审计对 live repo 独立抽查——§7 file:line 引用 12 处全中（flux-eval.ts / use-scada-points-bridge.ts / renderer-api.ts / socket-impl.ts）；§8 ❌/⚠️/✅ 条目对照 design.md 5 条全成立；§9 对照 `@types/three` 0.186.0 抽查 10 处（9 精确，1 处行号引用错误 `BufferGeometry.d.ts:532→:441` 已更正）；bench 脚本两轮实跑通过、§10.3 基线同量级；plan/log/roadmap 文本一致性核对通过。验证输出：typecheck 39/39、build 39/39、lint 39/39、test 72 任务 12,185 passed / 0 failed、check exit 0（2026-09-13，`docs/logs/2026/09-13.md`）。

Follow-up:

- 浏览器侧 fps 基准挂接（见 Deferred But Adjudicated）
