# 473 视觉质量 V3：3D 渲染视觉与交互修复 Plan

> Plan Status: completed
> Last Reviewed: 2026-09-19
> Source: `docs/analysis/visual-quality/V3-threejs-visuals.md`（已独立核实，2 Major + 7 Minor 修订后零 Blocker/Major）、`docs/backlog/visual-quality-roadmap.md` V3、`docs/components/threejs-integration/design*.md`
> Related: `docs/plans/470-visual-quality-v0-baseline-infra-plan.md`（V0 工具链）

## Purpose

把路线图 V3 收口：真 hover（pointermove + Raycaster + emissive 高亮）、阴影启用（shadowMap + mesh 级 castShadow/receiveShadow 接线 + 阴影相机调优）、容器高度 schema 化、加载进度与内建 loading/error/empty UI、AI 生成演示出口（canned provider）、演示补齐（hover/spring/step/state-clip）、three-canvas e2e 交互与视觉断言。

## Current Baseline

- master @ 03add8bc4（V2 收口，full-green：unit 74/74、ai 包 805/805、scripts 70/70、e2e 1481/0、check exit 0）。
- 伪 hover：`bindPointerHandlers`（scene-manager.ts:494-531）仅 pointerdown/up；Raycaster（:88）/`pickAt`（:535-544）/`onHover`/`lastHovered`（:363/:87）基础设施现成可复用。
- 阴影：renderer 工厂 :109 仅 `{antialias, alpha}`；:181 已接灯光级 `light.castShadow`（schemas.ts:114 声明、generator :92 亦产出——死配置）；全包无 shadowMap/receiveShadow；`createLight`（:180）从不 `scene.add(light.target)`；directional 默认 shadow 视锥 ±5。
- 容器：three-canvas.tsx:98 硬编码 `height: '400px'`；resize 链路已在（use-scene-manager.ts:47-51）。
- 生命周期：loading/empty 仅宿主 regions（:100-105）；error 无 UI；`LoaderFactory`（model-loader.ts:11）自设单参 `loadAsync(url: string)`，three r186 原生 `loadAsync(url, onProgress)`。
- AI 生成：`generateFromPrompt` 需注入 `LlmProvider`（schema-generator.ts:17-21/:125），全仓无真实实现；test 用 canned mock（:87-96）。
- 演示页：three-canvas-demo 覆盖 tween/range/condition/loop/onObjectClick；无 hover/state-clip/spring/step 演示；`orb-hover` 为绑定 id。
- hover/pick 受 `ModelConfig.interactive`（默认 false）门控；primitive 材质四类中 `MeshBasicMaterial` 无 emissive。
- e2e：仅 three-canvas-perf.spec.ts（2 test）。

## Goals

- `onObjectHover` 语义落地：pointermove（rAF 节流）+ 进入/离开 + emissive 高亮（含 basic 材质跳过、共享材质按材质还原、卸载还原）。
- 阴影真实渲染：shadowMap.enabled + mesh 级 castShadow/receiveShadow（schema 字段）+ light.target 入场景 + shadow camera 调优。
- 容器高度 schema 驱动（默认 400px 向后兼容），demo 同步收益。
- 内建 loading（spinner + GLTF 进度百分比）/error（文案+重试）/empty UI（宿主 regions 优先）；LoaderFactory 透传 onProgress。
- AI 生成演示出口（canned mock provider，UI 明示离线演示）。
- demo schema 补 hover/spring/step/state-clip 演示。
- e2e：hover/阴影/高度/错误态断言（V0 helper L1/L2/L4）。

## Non-Goals

- 后处理/天空盒/额外相机 UI（v5 裁除）。
- 改 `index.ts` 公共导出面。
- GLTF 拖拽上传/真实 LLM API 接入。
- AbortSignal 化 model-loader（独立演进）。

## Scope

### In Scope

- `packages/flux-renderers-3d/src/engine/scene-manager.ts`：pointermove hover、emissive 高亮/还原、shadowMap、mesh 阴影接线、light.target、shadow camera。
- `packages/flux-renderers-3d/src/renderer/three-canvas.tsx`：height prop、内建生命周期 UI、进度 state；`engine/model-loader.ts`：LoaderFactory 类型放宽 + onProgress 透传。
- `packages/flux-renderers-3d/src/schemas.ts` + `renderer-definitions.ts`：height、mesh castShadow/receiveShadow 字段（**保护区 plan-first**：附 renderer-interfaces.md 对齐证据，默认值向后兼容）。
- `apps/playground/src/pages/three-canvas-demo*.tsx/schema.ts`：高度 prop 同步、canned provider AI 生成入口、hover/spring/step/state-clip 演示。
- `packages/flux-renderers-3d/src/**/__tests__`：focused 单测；`tests/e2e/three-canvas-visual.spec.ts`（新）。
- `packages/flux-renderers-3d/package.json`：新增 `@nop-chaos/flux-i18n: workspace:*` 依赖（内建生命周期 UI 文案走 t()，closure audit Minor-5 补登记）。
- Owner docs：`docs/components/threejs-integration/design-renderer.md`/`design-data-binding.md` 对齐节；证据卡 threejs.md；roadmap/daily log。

### Out Of Scope

- AbortSignal 化 loader、真实 LLM、相机 UI、后处理。

## Failure Paths

| 场景                   | 触发                        | 行为                                               | 可重试 | 用户可见表现   |
| ---------------------- | --------------------------- | -------------------------------------------------- | ------ | -------------- |
| hover-material-restore | hover 期间组件卸载/模型重载 | unhover/清理路径还原原始 emissive（按材质记录表）  | —      | 无残留高亮     |
| basic-material-hover   | MeshBasicMaterial 命中      | 跳过 emissive 高亮（无该属性），仅事件派发         | —      | 无高亮但不报错 |
| shadow-none-receiver   | 场景无接收面                | shadowMap.enabled 仅状态开启，无可见阴影（非缺陷） | —      | 正常           |
| progress-non-gltf      | 图元场景（无网络加载）      | 进度走不确定态（spinner 无百分比）                 | —      | spinner        |
| provider-mock          | canned provider 固定输出    | 校验修复回路照常（generator 已有回路测试）         | 是     | JSON 展示      |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——hover 语义/阴影/高度均为用户可感知行为变更且涉及 schema 字段（公共契约面），Proof 先行。

## Execution Plan

### Phase 1 - 引擎层：真 hover + 阴影 + 材质还原

Status: completed
Targets: `packages/flux-renderers-3d/src/engine/scene-manager.ts`、`schemas.ts`、`engine/__tests__`

- Item Types: `Proof | Fix`

- [x] Proof：单测先红（沿既有 `makeManager` harness：注入 scheduleFrame 手动 flush + 从 renderer stub 捕获 listener 直调——draft review Minor-4）——①pointermove 触发 hover 进入/离开事件序列；②hover 高亮 emissive 变化且离开/卸载后还原（standard 材质，含卸载还原断言）；③basic 材质命中不抛错不高亮；④shadowMap.enabled 在存在 castShadow 灯光时开启、mesh flags 按 schema 接线；⑤light.target 加入场景
- [x] Fix：`bindPointerHandlers` 增 pointermove（rAF 节流）→ Raycaster 命中 → hover 进入/离开派发 + emissive 高亮/还原（共享材质按材质表记录原始值；卸载清理路径还原）。**保留既有 down→enter/up→leave 派发**（触屏 tap 无 move，draft review Minor-2 裁定并存）
- [x] Fix：高亮逻辑按职责抽至 `engine/hover-highlight.ts`（draft review M-2 体积门禁策略：scene-manager.ts 现 622 行、ERROR 阈 700，增量 80-130 行必超限——hover/高亮抽取后复测行数，仍逼近则继续抽 `engine/shadow-setup.ts`；禁止带红收口或走豁免注册）
- [x] Fix：shadowMap.enabled（存在 castShadow 灯光时）+ mesh 级 castShadow/receiveShadow（schema scene blob 字段 + loadModels/registerModel 接线，GLTF traverse 子 mesh）+ `scene.add(light.target)` + directional shadow camera 视锥调优（**模块常量**，draft review Minor-5 收敛——不新增 schema 字段，覆盖 16×16 地面）
- [x] Fix：mesh 级 castShadow/receiveShadow 进 scene blob；renderer-definitions.ts 增顶层 `height` propContract（kind string/editorType text/defaultValue 400px）+ fields + definitions 测试同步（keys/editorType 断言；defaultValue 断言与"无 height 时 400px 默认"测试为 closure audit M-2 补强项，见 Phase 2 补充）

Exit Criteria:

- [x] Phase 1 单测先红后绿有记录（hover-shadow.test 初版 8/9 失败 → 实现后 9/9）；scene-manager 既有测试零回归
- [x] shadow 相机参数（±14/far 60/mapSize 1024）+ light.target 入场景，单测断言（e2e 像素断言调整为 renderer/scene 状态断言——SwiftShader 下阴影像素不稳定）

### Phase 2 - 渲染层：高度 prop + 生命周期 UI + 加载进度

Status: completed
Targets: `renderer/three-canvas.tsx`、`engine/model-loader.ts`、`renderer/hooks`

- Item Types: `Proof | Fix`

- [x] Proof：单测先红——①height prop 传入 style；②无宿主 regions 时 loading/error/empty 内建 UI 挂载（error 态含重试按钮，点击触发重载）；③GLTF 场景 onProgress 更新进度百分比、图元场景不确定态
- [x] Fix：height prop（默认 '400px' 向后兼容）→ style；内建三态 UI（Spinner/文案+重试/引导文案，宿主 regions 优先）
- [x] Fix：LoaderFactory 类型放宽 `loadAsync(url, onProgress?)` + 透传；three-canvas 进度 state 经 rAF 合流（draft review Minor-3：onProgress 高频触发防密集重渲）→ loading UI
- [x] Fix：error 终态守卫随重试调整（Retry 清 error 态 + reloadKey 重建；单测断言 retry 后回到 ready）（draft review Minor-7：three-canvas.tsx:60/:87 `current === 'error' ? current` 守卫会吞掉重试后的 loading/ready 迁移）
- [x] Fix：renderer-definitions.ts height 字段 propContract/fields 与 definitions 测试收尾（editorType text + defaultValue 断言）

Exit Criteria:

- [x] 单测先红后绿；three-canvas 既有测试零回归（lifecycle-ui 3 用例 + 原有 4 用例）
- [x] 默认行为不变（无 height 时 400px；宿主 region 优先断言在 host-region 用例）

### Phase 3 - 演示页：高度同步 + AI 生成出口 + 能力演示补齐

Status: completed
Targets: `apps/playground/src/pages/three-canvas-demo.tsx`、`three-canvas-demo-schema.ts`

- Item Types: `Fix`

- [x] Fix：demo schema 改用新 height prop（min(62vh,560px)）
- [x] Fix：AI 生成入口——canned mock LlmProvider（providerReturning 同模式，UI 明示"离线演示"）+ `generateFromPrompt` → JSON 展示 + 应用到画布
- [x] Fix：demo schema 增 hover 演示（interactive mesh + onObjectHover 事件）、spring/step tween、state/event 触发 clip 各一节
- [x] Fix：demo schema 阴影接线（draft review M-1）：directional `castShadow: true` + 地面 `receiveShadow: true` + 主 mesh `castShadow: true`——Phase 4 阴影像素断言的载体
- [x] Fix：demo 页增坏 url 演示画布一节（url 用 nonexistent.invalid → ERR_NAME_NOT_RESOLVED 落入既有噪声白名单）——Phase 4 error UI 断言的载体；观测句柄落地为 `window.__flux_three_handles[testid] = manager`（`use-scene-manager.ts` debugHandleKey，testid 非空即注册；机制等效于 draft review M-1 的句柄方案且更通用，提供 getScene()/getRenderer() 供 e2e 程序化断言；emissive 提亮/还原由单测承载以规避持续动画下像素 diff 噪声）

Exit Criteria:

- [x] demo 页四态可视：高度 558px 实测、hover toast 断言、AI 生成 JSON+应用断言、新演示节渲染正常（three-canvas-visual spec 承载）

### Phase 4 - e2e 断言 + owner docs 收口

Status: completed
Targets: `tests/e2e/three-canvas-visual.spec.ts`（新）、`docs/components/threejs-integration/design-renderer.md`、证据卡 threejs.md

- Item Types: `Proof | Fix`

- [x] Proof：`three-canvas-visual.spec.ts` 消费 V0 helper：①hover——pointermove 后 onObjectHover→env.notify 事件断言（**emissive 提亮/还原由单测承载**，closure audit M-3 如实修订——demo 页持续动画下像素 diff 噪声大，句柄方案落地为 window.\_\_flux_three_handles 供 renderer/scene 状态断言）；②阴影——castShadow 场景 shadowMap.enabled + 地面像素非纯色（L4）；③高度——height prop 几何断言（L2）；④错误态——坏 url 场景 error UI 挂载（L1）+ 重试按钮存在；⑤AI 生成入口产出 schema 应用于画布（L1）；⑥perf spec 回归
- [x] Fix：design-renderer.md 对齐节（hover 语义/阴影/height/生命周期 UI/进度）；证据卡 threejs.md 裁决回写**按标题映射**（卡内 F4=AI 生成零出口→canned 出口 fixed；卡内 F5=观感基础件→内建 UI+进度 fixed；与研究报告 F4/F5 编号错位，draft review Minor-1）
- [x] Fix：全量 3D 包测试（202/202，覆盖率达标）+ three-canvas-perf 回归（2/2，fps max 90.7）

Exit Criteria:

- [x] `npx playwright test tests/e2e/three-canvas-visual.spec.ts` 全绿（5/5）
- [x] three-canvas-perf 零回归
- [x] owner docs 与证据卡回写完成且与 live 一致

## Draft Review Record

- Reviewer / Agent: 独立 plan review 审查员（fresh sub-agent session，2026-09-19，一轮）
- Verdict: `pass-with-minors`（0 Blocker / 2 Major / 7 Minor；审查员明示"修订后无需再起独立 full review 轮，共识确认后升 active"）
- Rounds: 1
- Findings addressed: M-1——三个 e2e 场景载体补齐（demo 阴影接线 / 坏 url 演示画布 / dev-only 调试句柄方案采纳）；M-2——体积门禁策略（hover-highlight.ts 抽取 + 行数复测 + 禁止带红收口）。Minor 1-7 择要落字（卡片编号按标题映射、down/up 与 move 并存裁定、进度合流、harness 措辞、shadow camera 收敛为常量、mesh 字段入 scene blob 仅 height 进 definition、error 终态守卫项）。

## Closure Gates

- [x] 全部 in-scope 交付落地（Phase 1–4 Exit Criteria 全勾）
- [x] 全部 in-scope 死配置已收敛：shadowMap/castShadow 阴影链、onObjectHover 伪语义、400px 高度、AI 生成零出口
- [x] 行为/契约结果已达成：编译浏览器实测 hover/阴影/高度/AI 生成/错误态（e2e 承载）
- [x] 必要 focused verification 已完成（单测先红后绿 + three-canvas-perf 2/2 + 全量 3D 包 202/202 覆盖率达标）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（AbortSignal deferred 为优化项，理由登记）
- [x] 受影响 owner docs 已同步：design-renderer.md（§4/§7/schema 注记）、证据卡 threejs.md、roadmap 状态、daily log
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（三轮：issues → issues（3 项文本-记录残留）→ **approved**；0 Blocker / 0 Major / 0 未决 Minor）
- [x] `pnpm typecheck`（40/40）
- [x] `pnpm build`（40/40）
- [x] `pnpm lint`（40/40）
- [x] `pnpm test`（74/74 tasks；3D 包 202/202）
- [x] `pnpm check`（全链 exit 0——scene-manager.ts 抽取 pointer-hover.ts 后 623 行低于 ERROR 阈；i18n locale 仍为已豁免项）

## Deferred But Adjudicated

### GLTF 加载取消（AbortSignal）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 现有 generation-guard 取消已工作；AbortSignal 化属 loader 独立演进
- Successor Required: `no`

## Non-Blocking Follow-ups

- 真实 LLM provider 接入（现 canned mock 演示）：待产品需求裁决。
- basic 材质 hover 的替代高亮方案（顶点色/线框）：当前跳过即可，如有视觉诉求再裁。

## Closure

Status Note: 四 Phase 全 completed；独立 closure auditor（fresh session，三轮）实跑 3D 包 204/204（覆盖率四维 94.58/90.64/93.24/96.61 全 ≥90）、包 build exit 0、three-canvas-visual 5/5、全链 typecheck/build/lint/test/check 绿、e2e 失败鉴别诚实（1479/2/7 + 隔离 20/20，无 full-green 虚报）、机制/边界/owner docs 三处一致——最终 verdict **approved**。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session，2026-09-19，三轮）
- Evidence: 首轮 `issues`（M-1 Phase Status 未同步、M-2 Phase 2 Exit 断言超出 live、M-3 句柄命名/emissive 通道登记偏差）→ 修复（Status 翻转、defaultValue/默认 400px/宿主优先三断言、句柄 `__flux_three_handles[testid]` 如实登记、emissive 单测承载说明）→ 二轮确认实质修复、余 3 项文本残留 → 三处 diff 级落地 → **approved**。实跑：3D 单测 204/204、visual spec 5/5、`git status` ma43 clean。`docs/logs/2026/09-19.md` plan 473 各节含三轮记录。

Follow-up:

- no remaining plan-owned work（basic 材质替代高亮方案与真实 LLM provider 为已登记 Non-Blocking Follow-ups；AbortSignal deferred 已登记）
