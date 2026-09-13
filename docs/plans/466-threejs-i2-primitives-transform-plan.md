# 466 Three.js 集成 I2.2 TransformEngine 与图元库计划

> Plan Status: active
> Last Reviewed: 2026-09-13
> Source: `docs/backlog/threejs-integration-roadmap.md`（I2.2）、`docs/components/threejs-integration/design-data-binding.md` §5–§6、`design-renderer.md` §1（ModelConfig 扩展）
> Related: 前置 plan 465（I2.1，closed）；I3.1/I4.1 依赖本计划的图元库（无外链 GLB 的可构建场景）

## Purpose

收口 I2.2：TransformEngine（range/convert/condition + transition 动画）替换 I2.1 的 identity 接缝；基础几何/材质图元库（无 GLB 的声明式模型）；AnimationConfig 关键帧播放（design-data-binding.md §6，v5 分册标注 I2.2 交付，roadmap I2.2 设计文档列指向 §5-§6）。

## Current Baseline

- I2.1（plan 465，closed）已交付：`flux-renderers-3d` 包、绑定桥接、引擎（GLTF 模型 + generation-guard + pending buffer 回放）、事件桥接。桥接 transform 阶段为 identity 接缝（`UseBindingBridgeArgs.transform`，I2.2 落位点）。
- 设计契约（v5，plan 464 定稿）：
  - §5 TransformEngine：`apply(binding, value)`，顺序 range（线性映射+clamp+防除零）→ convert（flux 表达式注入 `value` 变量）→ condition（真值二选一）；单项失败回退原值 + reportOnce 去重。
  - §1 TransformConfig.animation：`{ type: 'tween'|'spring'|'step', duration?, easing? }`（绑定级过渡）。
  - §6 AnimationConfig：keyframes（time/value/easing）、trigger（state/event/time + source/value）、target（modelId/property）、loop（once/loop/pingpong/count）。
  - design-renderer.md §1 ModelConfig：仅 GLTF（`url` 必填）——图元库需扩展（本计划内的已裁定设计扩展，见 Goals）。
- I2.1 live 契约锚点：`FrameUpdate {modelId, path, value}`、`SceneManager.updateProperty(modelId, path, value)`、`setFrameUpdateQueue(drain)` 帧边界批量应用、`UseBindingBridgeArgs.transform` 接缝、`registerThreeRenderers`、`registerModel`（GLTF 专用）。
- 测试基建：`src/engine/scene-manager*.test.ts` 的 stub renderer/loader 工厂模式、`src/test-support/`；覆盖率四维 ≥90 硬阈值（vitest 配置）。
- roadmap I2.2 行：`TransformEngine 实现 + 基础几何/材质图元库`；设计文档列：`design-data-binding.md §5-§6`。§6（AnimationConfig）由设计分册标注为 I2.2 交付，纳入本计划（非新增 work item）。

## Goals

- TransformEngine 落位：确定性转换核（range/convert/condition，编译缓存）+ 桥接默认接入（identity 接缝移除）。
- 过渡动画：`transform.animation` 的 tween/step/spring 在引擎侧插值（FrameUpdate 携带动画配置；TweenRegistry 帧推进；数值/三维向量/颜色三类值）。
- 图元库：ModelConfig 判别联合（`url` GLTF XOR `primitive` 声明）；六种基础几何（box/sphere/cylinder/plane/cone/torus）× 四种材质（standard/basic/lambert/phong）+ color/opacity/transparent/wireframe；图元模型同步注册、即时就绪。
- AnimationConfig 关键帧播放：time/state/event 三类触发、once/loop/pingpong 循环、逐关键帧 easing。
- 全部 Phase Proof 先行（先红后绿），包级覆盖率维持 ≥90。

## Non-Goals

- 工业协议（I3.1）、AI 生成（I4.1）。
- 后处理/天空盒（plan 465 已裁定砍除，design-renderer.md §8#6）。
- GLTF 内嵌动画之外的骨骼动画编辑能力。
- LOD / 实例化渲染（调研文档风险缓解项，无 roadmap work item，不做）。
- 图元级事件声明（per-primitive events）——保持 I2.1 的 schema 级 events 契约不变。

## Scope

### In Scope

- `packages/flux-renderers-3d/` 内：binding/transform-engine.ts、binding/keyframes.ts（播放器）、engine/tween-registry.ts、engine/primitive-factory.ts、schemas.ts 扩展、scene-manager.ts 集成、engine/model-loader.ts（GLTF 变体收窄）、renderer/hooks/use-binding-bridge.ts 接缝替换、renderer/hooks/use-animation-clips.ts（新，Phase 4）。
- 设计分册漂移回写（schemas 变更处）。
- `docs/logs/` 记录。

### Out Of Scope

- v5 设计分册的结构性重写。
- 任何其他包的改动。

## Failure Paths

| 可测场景编号             | 触发                                      | 行为                                                                          | 可重试 | 用户可见表现     |
| ------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------- | ------ | ---------------- |
| transform-convert-failed | convert 表达式编译/求值抛错               | 回退原值 + `onError('transform-convert-failed', …)` 去重                      | 是     | onError 诊断     |
| transform-range-invalid  | range.input/output 区间为零宽             | input 零宽回 outputMin；output 零宽产 outputMin（防除零契约）                 | —      | 无（确定性数学） |
| primitive-invalid-config | 图元 geometry.type 未知                   | 忽略该模型 + `onError('primitive-invalid-config', …)` 去重；其余模型继续      | 否     | onError          |
| model-dual-source        | ModelConfig 同时给 url 与 primitive       | 按 primitive 优先，GLTF url 忽略 + 一次性诊断                                 | 否     | onError 诊断     |
| keyframe-target-missing  | 关键帧 clip 的 modelId 未注册             | 静默等待（模型就绪后 clip 启动判定重评估）；不报错                            | 是     | 无               |
| model-no-source          | ModelConfig 既无 url 也无 primitive       | 判别校验拒绝该模型 + `onError('primitive-invalid-config', …)` 去重；其余继续  | 否     | onError          |
| easing-unknown           | transition/keyframe easing 名称不在已知集 | 回退 linear，一次性诊断 `easing-unknown`（去重）                              | 是     | onError 诊断     |
| keyframes-degenerate     | keyframes 空数组/单帧/time 非单调         | 空数组不注册 clip；单帧视为终帧直设；非单调按数组序播放（不重排），一次性诊断 | 否     | onError 诊断     |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（TransformEngine 数学契约与关键帧播放是核心回归路径；图元库是 I3/I4 的场景基建）。每个 Phase 的 Proof 项（失败测试）先于 Fix 项。

## Execution Plan

### Phase 1 - TransformEngine 确定性转换核（Proof 先行）

Status: completed
Targets: `src/binding/transform-engine.ts`, `src/renderer/hooks/use-binding-bridge.ts`

- Item Types: `Proof | Fix`

- [x] 先写失败测试（红）：range 线性映射 + clamp + input 零宽防除零；convert 注入 `value` 变量（真实 flux-formula compiler，私有求值 scope）；condition 真值二选一；处理顺序 range→convert→condition；单项失败回退原值 + 去重上报；编译缓存。
- [x] 实现 `TransformEngine` 类（`apply(binding, value): unknown`，compiler/env 注入，`reportOnce` 复用桥接通道或独立去重）。
- [x] 桥接接缝替换：`useBindingBridge` 默认 transform 由 identity 换为 TransformEngine 实例（随 compiler/env memo 化）；现有接缝测试（transform seam ×2）语义保持。

Exit Criteria:

- [x] transform-engine 单测全绿（先红后绿；真实 compiler 参与 convert/condition 用例）。
- [x] 桥接现有测试全绿（identity 相关断言更新为 TransformEngine 语义后不回归）。

### Phase 2 - 过渡动画（tween/step/spring）引擎插值（Proof 先行）

Status: completed
Targets: `src/engine/tween-registry.ts`, `src/engine/scene-manager.ts`, `src/renderer/hooks/use-binding-bridge.ts`

- Item Types: `Proof | Fix`

- [x] 先写失败测试（红）：FrameUpdate 增可选 `animation`；数值目标 tween 过 duration 后精确到目标值（fake 帧推进断言中间值单调）；step 到期瞬移；spring 阻尼收敛到目标；三维向量与 hex 颜色插值；新目标覆盖进行中 tween（从当前值续走）；dispose 清理。
- [x] 实现 `TweenRegistry`（每 `modelId::path` 单活跃 tween；easing：linear/easeIn/easeOut/easeInOut cubic；spring 为默认参数阻尼谐振近似）；SceneManager 帧循环推进 + `updateProperty` 第四参（可选动画配置）；桥接把 `binding.transform?.animation` 随 FrameUpdate 传递。
- [x] 无动画配置的更新保持 I2.1 即时写语义（现有引擎测试不回归）。
- [x] 显式裁定（红测断言之一）：pending buffer 回放**不携带动画**——buffer 条目不存 animation 配置，回放经 `applyUpdate` 即时落值（与 I2.1「初值不丢失、即时应用」一致，初值不做过渡）。

Exit Criteria:

- [x] tween-registry + 引擎集成测试全绿（先红后绿；fake 帧时钟驱动）。
- [x] I2.1 引擎测试（即时写语义）无回归。

### Phase 3 - 基础几何/材质图元库（Proof 先行）

Status: completed
Targets: `src/schemas.ts`, `src/engine/primitive-factory.ts`, `src/engine/scene-manager.ts`, `src/engine/model-loader.ts`

- Item Types: `Proof | Fix`

- [x] 先写失败测试（红）：判别联合解析（url XOR primitive；双源 → primitive 优先 + 诊断）；六种几何创建与参数映射（box/sphere/cylinder/plane/cone/torus）；四种材质 + color/opacity/transparent/wireframe/flatShading；图元模型 `loadModels` 同步注册（即时 ready，不经 loader）；绑定 `updateProperty` 对图元生效（material.color 等）。
- [x] schemas：`ModelConfig` 扩展 `primitive?: PrimitiveModelConfig`（geometry + material），`url` 改可选；新增 ModelConfig 判别校验（落点 primitive-factory：url XOR primitive，双源 primitive 优先 + 诊断，双空拒绝）；`ModelLoader.load` 入参收窄为 GLTF 变体（url 必 string），`loadModels` 先判别分流——图元同步注册、GLTF 才进 loader。
- [x] 实现 `PrimitiveFactory`（几何/材质工厂 + THREE 对象构造）与 SceneManager 集成（primitive 配置同步 `registerModel`，跳过 loader；pending buffer 回放对其即时生效）。

Exit Criteria:

- [x] primitive-factory + 引擎集成测试全绿（先红后绿）。
- [x] 无 GLB 的纯图元场景可被 SceneManager 组装且 onReady 即发（测试断言）。

### Phase 4 - AnimationConfig 关键帧播放（Proof 先行）

Status: completed
Targets: `src/binding/keyframes.ts`, `src/engine/scene-manager.ts`, `src/renderer/hooks/use-animation-clips.ts`（新）

- Item Types: `Proof | Fix`

- [x] 先写失败测试（红）：time 触发（挂载即播，帧时钟推进，逐关键帧 easing 插值，播完停在末帧）；loop（循环 count 次）/pingpong（往复）；state 触发（scope 路径匹配 trigger.value 时启动）；event 触发（normalized event type 匹配 source 时启动）；clip target 模型未就绪时等待、就绪后可播。
- [x] 实现 `KeyframeClip` 播放器（纯逻辑：时钟推进 + 插值求值）与 SceneManager 集成（clips 注册 + 帧推进 + `updateProperty` 应用）；新增 `use-animation-clips` hook：state 触发订阅合并全部 `trigger.source` paths 去重后**单次** `useScopeSelector`（防 rules-of-hooks 违规），event 触发接入 `useThreeEvents` 派发链；`animations` prop 在 `ThreeCanvasSchema` 顶层（非 scene 内），传递路径：props.props.animations → hook → engine clips 注册。
- [x] 与 TweenRegistry 互斥语义：同一 target 属性上 clip 优先于 transition tween（文档化于代码注释）。

Exit Criteria:

- [x] keyframes 播放器 + 触发测试全绿（先红后绿；fake 帧时钟 + 受控 scope）。
- [x] 包级覆盖率四维 ≥90 维持。

### Phase 5 - 全量验证与收尾

Status: completed
Targets: 仓库级

- Item Types: `Proof`

- [x] 根 `pnpm typecheck`/`build`/`lint`/`test`/`check` 全绿。
- [x] 设计分册漂移回写核对（ModelConfig 判别联合、TransformEngine 接缝位置）+ `docs/logs/` 记录。

Exit Criteria:

- [x] 五项根验证全绿；漂移记录在案。

## Draft Review Record

> 由独立子 agent（fresh session）填写。

- Reviewer / Agent: independent sub-agent（general-purpose fresh session）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: R1 fail（1 Major / 5 Minor）→ M1 Phase 3 补 model-loader.ts 目标与 GLTF 变体收窄策略、m1 parseThreeScene 改新增判别校验（落点 primitive-factory）、m2 Phase 2 增回放不携带动画红测裁定、m3 Phase 4 命名 use-animation-clips.ts + 合并单次 useScopeSelector + animations 传递路径、m4 Failure Paths 增 model-no-source/easing-unknown/keyframes-degenerate 三行——均落盘；m5 按约不改。R2 定向复核 pass-with-minors（0B/0M）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛（ModelConfig 判别联合 + TransformEngine onError 已回写分册）
- [x] 行为/契约结果已达成（TransformEngine 接管转换、图元场景可组装、过渡与关键帧动画可播放）
- [x] 必要 focused verification 已完成（Phase 1–4 focused tests，先红后绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响的 owner docs 已同步（design-data-binding.md §5 与 design-renderer.md §1 回写；`docs/logs/`）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck` 40/40
- [x] `pnpm build` 40/40
- [x] `pnpm lint` 40/40
- [x] `pnpm test` 73/73 任务 12,329 passed / 0 failed（3d 包 144 测试）
- [x] `pnpm check` exit 0

## Deferred But Adjudicated

### spring 物理参数化（stiffness/damping 可配）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 设计契约仅列 `type: 'spring'` + duration/easing，未定义物理参数面；本计划以默认参数阻尼近似满足契约，参数化扩展待有真实消费诉求（roadmap 无对应 work item）。
- Successor Required: `no`
- Successor Path: 无（出现诉求时新立）

### per-primitive 事件声明

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: v5 事件契约是 schema 级（D3，design.md），per-primitive 事件属新契约面，roadmap 无对应 work item。
- Successor Required: `no`
- Successor Path: 无（出现诉求时按 roadmap 结构调整流程提请人工评审）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 待关闭时填写

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent（general-purpose fresh session）
- Evidence: R1 审计（issues，2M）：F1 双源诊断未实现（被 no-source 断言掩盖）→ 补 `primitive-dual-source` 一次性诊断 + 测试隔离断言；F2 notifyEvent 零测试 → 补引擎级 event 触发测试（source 匹配/不匹配分流 + 组件经 useThreeEvents onEvent 接线）；F3 删除 probe-prim.test.ts 探针；F4 帧序（tween→clip，clip 优先）补注释。R2 复审待执行。验证基线：typecheck 40/40、test 73 任务 12,329 passed / 0 failed（3d 包 144）、check exit 0、覆盖率 95.9/93.9/92.4/97.8。

Follow-up:

- 无（spring 参数化与 per-primitive 事件为 Deferred 预声明，无 successor 义务）
