# 465 Three.js 集成 I2.1 three-canvas 渲染器实现计划

> Plan Status: active
> Last Reviewed: 2026-09-13
> Source: `docs/backlog/threejs-integration-roadmap.md`（I2.1）、`docs/components/threejs-integration/design-renderer.md` + `design-data-binding.md`（v5，plan 464 定稿）、`docs/analysis/threejs-integration-analysis.md` §7/§10
> Related: 前置 plan 463/464（closed）；后继 I2.2（TransformEngine + 图元库，本计划留接缝）

## Purpose

落地 `@nop-chaos/flux-renderers-3d` 包与 `three-canvas` 渲染器：React 壳 + 裸 three 引擎（design.md D1）、`useBindingBridge` 表达式桥接（`analyzeBindingSubscriptions` 精确订阅 + `compileValue`/`evaluateValue` 求值路径）、事件桥接。交付后 three-canvas 在 registry 可用、绑定热路径有 focused 证明。

## Current Baseline

- 设计契约已冻结：v5 五册（plan 464 closed）。本计划实现 design-renderer.md 全部 + design-data-binding.md §1–§4/§7；§5 TransformEngine 与 §6 AnimationConfig 留给 I2.2（本计划绑定管线 transform 阶段为 identity 接缝）。
- 仓库无 `flux-renderers-3d` 包；`three@0.186.0`/`@types/three@0.186.0` 已在根 devDependencies（plan 463 引入，bench 脚本消费中）。
- 复用源（live 验证）：`flux-renderers-industrial` 的 `binding/flux-eval.ts`（五态 probe）与 `use-scada-points-bridge.ts`（paths 精确订阅/编译缓存/错误去重）模式；`RendererEnv.openSocket` 不在本计划（I3.1）。
- 平台事实：`useScopeSelector(selector, eqFn, { enabled, fallback, paths })`（flux-react hooks.ts:86）、`ExpressionCompiler` 自 `flux-runtime` 获取（`renderer.expressionCompiler`，renderer-core.ts:299）、`createNormalizedActionEvent` + `helpers.dispatch`（use-scada-events.ts 同型）。
- 包脚手架先例：`flux-renderers-industrial`（tsconfig.build/vitest coverage 90% 阈值先例、workspace 四处注册点：pnpm-workspace 自动含、`vite.workspace-alias.ts`、root `tsconfig.json` references、`tsconfig.base.json` paths）。已知仓库缺口：`tsconfig.base.json` paths 缺 `flux-renderers-form-advanced` 映射（fresh checkout 无 dist 时 flux-bundle typecheck 失败；记录于 `docs/logs/2026/09-13.md` 与 design.md §3，非 plan 463 文件内）——新包注册时必须补全自己的全部映射避免重蹈。
- happy-dom 无 WebGL：引擎测试需注入 renderer 工厂 stub（scada 用 `vi.mock('leafer-ui')` 同理）。

## Goals

- `@nop-chaos/flux-renderers-3d` 包可 build/typecheck/test/lint，四处 workspace 注册完成（vite alias、tsconfig.base paths、root references、pnpm workspace）。
- `three-canvas` 渲染器在 `RendererRegistry` 可注册可用：schema 解析、场景组装（灯光/环境/模型）、rAF 循环、dispose 链、pick/hover 事件桥接。
- 绑定桥接：`analyzeBindingSubscriptions`（`${expr}` 入口、纯路径直取、复杂表达式 probe 五态）→ `useScopeSelector` paths 精确订阅 → `compileValue`/`evaluateValue` 求值 → pending 队列 → 引擎帧边界批量应用；模型未就绪的更新经 pending buffer 回放。
- Focused 证明：flux-eval 单测（含 deps-empty 嫌疑上报）、绑定桥接组件测试（真实 flux-formula compiler + 受控 scope）、引擎单测（stub renderer 工厂）、渲染器组件契约测试。

## Non-Goals

- TransformEngine（range/convert/condition）与 AnimationConfig 插值、几何/材质图元库（I2.2）——本计划 transform 阶段为 identity 接缝（`TransformFn = (v: unknown) => unknown` 默认直通）。
- 工业协议（ReconnectionManager/IndustrialAdapter，I3.1）。
- AI 生成（I4.1）。
- playground 演示路由与 `flux-bundle` 聚合（先例：industrial 不在 bundle；演示页面留待有图元库后随 I2.2 或后续 docs/demo 项评估）。
- 浏览器 fps e2e 基准（plan 463 Deferred，successor 为本计划后评估——happy-dom 无 GL，e2e 需真实浏览器 profile，留 follow-up）。

## Scope

### In Scope

- `packages/flux-renderers-3d/` 全部源码与测试。
- workspace 注册配置（vite alias / tsconfig.base paths / root tsconfig references）。
- root `package.json`：`three`/`@types/three` 从根 devDeps 保持不变（bench 用），包内 dependencies 增 `three`（精确 0.186.0）、devDependencies 增 `@types/three`。

### Out Of Scope

- 修复 `tsconfig.base.json` 缺 form-advanced paths 的预存在缺口（跨包契约，另行处理；新包仅增自己的映射）。
- 任何 v5 设计文档集的结构性修改（实现若与设计冲突，小漂移回写分册并在 plan 记录；决策级冲突则停）。

## Failure Paths

| 可测场景编号             | 触发                                 | 行为                                                                                 | 可重试             | 用户可见表现                                |
| ------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------- |
| binding-compile-failed   | 绑定表达式编译抛错                   | 跳过该 binding + `onError('flux-compile-failed', msg, error)`（(表达式, code) 去重） | 是（下次求值重试） | onError 诊断；其余绑定不受影响              |
| binding-evaluate-failed  | 求值抛错                             | 跳过 + `onError('flux-evaluate-failed', …)` 去重                                     | 是                 | 同上                                        |
| flux-deps-empty          | 复杂表达式 probe 返空且读 scope 嫌疑 | 一次性上报 `flux-deps-empty`（analyze 期，不受 enabled 影响）                        | 否（去重）         | onError 诊断                                |
| model-load-failed        | GLTF 加载 reject                     | 丢弃该 modelId pending buffer + `onError('model-load-failed', …)` 去重；其余模型继续 | 否（重挂载重来）   | onError + `data-three-scene-state` 含 error |
| engine-webgl-unavailable | `WebGLRenderer` 构造抛错             | 捕获 → 画布级 error 态 + `onError('webgl-unavailable', …)`；容器保留                 | 否                 | error 态展示                                |
| model-not-ready          | flush 时目标模型未注册               | 条目入引擎 pending buffer（`modelId::path` 键），模型注册时按插入序回放              | 是（注册时）       | 无（初值不丢失）                            |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（表达式桥接属核心回归路径）。Proof 项先于 Fix 项：Phase 3 flux-eval 单测先行（红→绿），Phase 5 绑定桥接组件测试以真实 flux-formula compiler 走端到端断言（scope 变化 → 引擎 updateProperty 收到转换后值）。

## Execution Plan

### Phase 1 - 包脚手架与 workspace 注册

Status: planned
Targets: `packages/flux-renderers-3d/`, `vite.workspace-alias.ts`, `tsconfig.base.json`, `tsconfig.json`

- Item Types: `Fix`

- [ ] 创建包骨架：`package.json`（name `@nop-chaos/flux-renderers-3d`，manifest 整体对齐 industrial 模板：deps `three@0.186.0` + `@nop-chaos/flux-core`/`flux-react`/`@nop-chaos/ui` workspace:\*，peerDeps react/react-dom，devDeps `@types/three` + react/react-dom + flux-formula/flux-runtime；scripts 对齐 industrial）、`tsconfig.json`、`tsconfig.build.json`、`vitest.config.ts`（happy-dom + coverage 90% 阈值，`src/test-support/**` 排除）、`src/index.tsx` 空导出。
- [ ] 四处注册：`vite.workspace-alias.ts` 增 `@nop-chaos/flux-renderers-3d`；`tsconfig.base.json` paths 增映射；root `tsconfig.json` references 增；确认 pnpm workspace glob 捕获。
- [ ] `pnpm install` 后包级 `typecheck`/`build`/`test`/`lint` 四绿（骨架冒烟：definitions 或 index 的最小可执行测试 1 条）。

Exit Criteria:

- [ ] `pnpm --filter @nop-chaos/flux-renderers-3d typecheck && ... build && ... test && ... lint` 全过。
- [ ] 根 `pnpm typecheck` 不因新包退化（39→40 tasks 全绿）。

### Phase 2 - Schema 与 RendererDefinition

Status: planned
Targets: `src/schemas.ts`, `src/renderer-definitions.ts`

- Item Types: `Fix | Proof`

- [ ] `schemas.ts`：按 design-renderer.md §1 落 `ThreeCanvasSchema`/`ThreeSceneConfig`/`ModelConfig`/`LightConfig`/`DataBinding`/`ThreeCanvasEvents` 类型（`AnimationConfig`、`DataBinding.transform`/`condition` 均仅类型声明，消费在 I2.2——管线内 transform 阶段为 identity 接缝）。
- [ ] `renderer-definitions.ts`：按 §2 落 definition（fields：scene/bindings/animations/events 四个 `kind: 'prop'` + loading/empty region；propContracts 四项）+ `registerThreeRenderers(registry)` 入口。
- [ ] Meta-contract 测试：definition 注册后 registry 查询、fields 通道断言（对齐 scada-canvas-meta-contract 测试形态）。

Exit Criteria:

- [ ] `registerThreeRenderers` 后 `registry.get('three-canvas')` 返回 definition；fields 断言过。

### Phase 3 - 表达式求值与依赖提取（Proof 先行）

Status: planned
Targets: `src/binding/flux-eval.ts`

- Item Types: `Proof | Fix`

- [ ] 先写失败测试（红）：`extractExpressionDepsViaProbe` 五态（ok/compile-failed/create-state-failed/evaluate-failed/deps-empty，含 wildcard 与非 leaf-state 分支）、`analyzeBindingSubscriptions`（纯路径直取/复杂表达式 probe/deps-empty 嫌疑集/非 `${}` 形态 normalize）、`createPrivateEvalScope`（get/has/只读边界）。
- [ ] 实现 `binding/flux-eval.ts`（语义对齐 industrial 同名模块 + design-data-binding.md §2）：`compileValue` → `.kind === 'dynamic'` 判定 → `createState` → 宽容 Proxy probe scope → `evaluateWithState` → `state.root` leaf-state/wildcard/paths 判别；`expressionReadsScope` 启发式（全局名误报为可接受）。
- [ ] 测试转绿；用真实 `createExpressionCompiler`（flux-formula）。

Exit Criteria:

- [ ] flux-eval 单测全绿（含五态穷举 + deps-empty 嫌疑去重）。

### Phase 4 - 引擎：SceneManager + ModelLoader

Status: planned
Targets: `src/engine/scene-manager.ts`, `src/engine/model-loader.ts`

- Item Types: `Proof | Fix`

- [ ] 先写失败测试（红）：updateProperty 类型分派（Vector3/Euler/Color/visible）、pending buffer 回放与丢弃、generation 判弃、dispose 链、queue drain——用 stub renderer 工厂 + fake rAF/timers；`GLTFLoader` 经 vi.mock 或注入 stub，OrbitControls 必要时同法（happy-dom 无 GL）。
- [ ] `SceneManager`：renderer 工厂注入（测试 stub）；`init`（camera/lights 五类/environment/fog/rAF 启动/OrbitControls damping）、`setFrameUpdateQueue`、`onPick`/`onHover` 订阅（射线拾取 + interactive 门控）、`loadModels`（ModelLoader generation-guard）、`updateProperty`（点分导航 + `.set()` 类型分派 + `modelId::path` pending buffer 回放 + 失败丢弃）、`updateAnimations(delta)`、`dispose` 全链。
- [ ] `ModelLoader`：`loadAsync(url, onProgress)` 2 参 + generation 只读捕获/cancel bump（D5）。
- [ ] 引擎单测转绿（stub renderer 下覆盖红测所列行为 + 灯光组装；three 真实类型参与断言）。

Exit Criteria:

- [ ] 引擎单测全绿（先红后绿；GLTFLoader/OrbitControls 的 mock 或注入方式在测试文件内注明）。

### Phase 5 - 渲染器组件与三个 hook

Status: planned
Targets: `src/renderer/three-canvas.tsx`, `src/renderer/hooks/`

- Item Types: `Proof | Fix`

- [ ] 先写失败测试（红，真实 flux-formula compiler + 受控 scope + stub 引擎）：scope 变化 → 引擎收到期望值的端到端断言、deps-empty 上报、模型未就绪初值回放、事件派发 payload。
- [ ] `use-scene-manager`：visible 入参驱动 true→false dispose / false→true init；ResizeObserver 尺寸同步；webgl-unavailable 捕获。
- [ ] `use-binding-bridge`：analyze（useMemo）→ `useScopeSelector` paths 订阅 → 求值 + `Object.is` 比较（lastValues ref）→ pendingUpdatesRef → `setFrameUpdateQueue` 注册（deps：bindings + sceneManager identity；重建时清 pending/lastValues）→ `reportOnce` 去重上报（compile/evaluate/deps-empty）。
- [ ] `use-three-events`：`createNormalizedActionEvent` + `helpers.dispatch`（object:click/object:hover/ready/error），onPick/onHover 订阅清理。
- [ ] `three-canvas.tsx` 组件壳：meta.visible/className/testid、loading/empty region、`data-three-scene-state` 状态埋点。
- [ ] 组件测试转绿（红测所列四类断言全过）。

Exit Criteria:

- [ ] 绑定桥接端到端组件测试全绿（含初值回放与错误去重断言）。
- [ ] 包级 coverage ≥ 90%（骨架阈值先例）；headless 不可测分支按仓库既有惯例在 vitest coverage 配置显式列名 exclude（沿用 industrial `src/test-support/**` 格式），不降阈值；任何新增 exclude 在 plan 收口记录注明，若需调整阈值本身须先停下按计划修订流程处理。

### Phase 6 - 全量验证与收尾

Status: planned
Targets: 仓库级

- Item Types: `Proof`

- [ ] 根 `pnpm typecheck`/`build`/`lint`/`test`/`check` 全绿；`node scripts/three-perf/bench-scene-graph.mjs` 仍可跑（three 版本未动）。
- [ ] 实现与 v5 设计的漂移核对：分册回写（如有）+ plan 记录。

Exit Criteria:

- [ ] 五项根验证全绿；漂移记录（或「无漂移」声明）在案。

## Draft Review Record

> 由独立子 agent（fresh session）填写。

- Reviewer / Agent: independent sub-agent（general-purpose fresh session）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: R1 fail（1 Major / 5 Minor）→ M1 Proof 先行（Phase 4/5 改 `Proof | Fix` + 红测首条 + Exit Criteria「先红后绿」）、m1 manifest 对齐 industrial（+@nop-chaos/ui/peerDeps/devDeps react-dom）、m2 form-advanced 缺口引用改 logs/design.md、m3 transform/condition type-only 标注、m4 GLTFLoader/OrbitControls mock 处置——均落盘；m5 coverage excludes 政策修订串未命中未落盘（R2 复核抓出）。R2 pass-with-minors（0B/0M，m5 遗留不阻塞）→ m5 于升 active 前补落盘（Phase 5 Exit 增显式 exclude 政策），如实记录本条。

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复
- [ ] 所有 in-scope confirmed contract drifts 已收敛（实现 vs v5 设计漂移已回写或记录）
- [ ] 行为/契约结果已达成（three-canvas 可注册、绑定端到端可用）
- [ ] 必要 focused verification 已完成（Phase 3/4/5 focused tests）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [ ] 受影响的 owner docs 已同步（design 分册漂移回写；`docs/logs/` 记录）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check` 零新增 red hit（新增 hit 须先在 `docs/logs/` 注册）

## Deferred But Adjudicated

### 浏览器侧 fps e2e 基准

- Classification: `watch-only residual`
- Why Not Blocking Closure: happy-dom 无 GL 上下文，真实浏览器 fps 需 e2e profile 与演示场景（依赖 I2.2 图元库避免外链 GLB）；CPU 侧基线（plan 463）已覆盖绑定热路径预算论证。
- Successor Required: `yes`
- Successor Path: I2.2 关闭后评估（图元库就位时随演示场景一并挂 e2e）

### playground 演示路由

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap I2.1 交付面是渲染器包本身；无图元库时演示需外链 GLB 资产，价值受限。I2.2 图元库落地后演示路由有实质内容。
- Successor Required: `yes`
- Successor Path: I2.2 计划内评估

## Non-Blocking Follow-ups

- `tsconfig.base.json` 缺 form-advanced paths 的预存在缺口（`docs/logs/2026/09-13.md` 已记录，跨包契约另行处理）

## Closure

Status Note: 待关闭时填写

Closure Audit Evidence:

- Auditor / Agent: 待 closure audit
- Evidence: 待定

Follow-up:

- 浏览器 fps 基准与演示路由（见 Deferred，均 I2.2 后评估）
