# 469 Three.js I2 后继收口 — three-canvas 演示场景与浏览器侧 fps e2e 基准

> Plan Status: active
> Last Reviewed: 2026-09-15
> Source: `docs/plans/465-threejs-i2-renderer-plan.md` Deferred But Adjudicated「浏览器侧 fps e2e 基准」（Successor Required: yes）、`docs/backlog/threejs-integration-roadmap.md`（I2）
> Related: 前置 plan 465/466/467/468（closed）；本计划是 threejs-integration roadmap 全部 work item done 后的最后一条已裁定后继义务

## Purpose

兑现 plan 465 的 successor 义务（「I2.2 关闭后评估：图元库就位时随演示场景一并挂 e2e」）：交付 three-canvas 的 playground 演示场景（图元库就位，无外链 GLB）与浏览器侧 fps e2e 基准，落盘评估结论（fps 门禁口径与 watch-only 边界），并同步 roadmap 中已过期的基线描述。完成后 threejs-integration 链路（roadmap I0–I4 + 全部已裁定后继义务）收口。

## Current Baseline

- roadmap I0–I4 全部 `done`（plans 463–468 completed）；全链路唯一悬置义务为 plan 465 Deferred「浏览器侧 fps e2e 基准」（`watch-only residual`，Successor Required: `yes`，Successor Path: I2.2 关闭后评估、随演示场景一并挂 e2e）。I2.2（plan 466）已关闭，该评估尚未执行，仓库无对应 e2e。
- `flux-renderers-3d` 已完整交付（renderer / engine / binding / data-source / ai，177 单测）。渲染器自带 e2e 埋点：容器 `data-three-scene-state`（`empty|loading|ready|error`，three-canvas.tsx:97）与 `data-testid`；错误诊断 `webgl-unavailable` / `model-load-failed` 经 SceneManager onError 上报（scene-manager.ts:138）。
- playground 现状：`App.tsx` 未注册 `registerThreeRenderers`，无 three-canvas 演示页、无任何 threejs e2e；`vite.workspace-alias.ts:118` 已有 `@nop-chaos/flux-renderers-3d` 源码别名，playground `package.json` 尚未声明该 workspace 依赖。
- e2e 先例：playwright webServer 为 vite dev（port 4175，`__FLUX_STRICT_VALIDATION__=true` 等严格环境变量）；`tests/e2e/scada-perf.spec.ts` 为 fps/性能测量先例（rAF 帧计数、3 采样取最大、headless 帧钟波动口径、试探性阈值 + watch-only 注册流程）；`tests/e2e/helpers/scada-canvas-assert.ts` 为黑屏兜底先例（DOM canvas 硬门禁 + 程序化像素探测，非空场景全零判败）。
- WebGL 可用性探针（2026-09-15，`_tmp/webgl-probe.mjs`）：headless Chromium（Playwright bundled）`WebGL 2.0 (OpenGL ES 3.0 Chromium)` available，renderer 为 `ANGLE (Google, Vulkan … SwiftShader …)`——three.js 可在 e2e 真实浏览器渲染，fps 为软件渲染口径（非 GPU 吞吐）。
- 重库隔离先例：`leafer-examples-demo` 懒加载（App.tsx `LazyLeaferExamplesDemoPage`，注释明确「Keeps the main bundle + App unit tests leafer-ui-free」）；`scada-demo.tsx` 页面内自建 registry（`createSchemaRenderer` + `createDefaultRegistry` + 按需 register）。three（~0.186）体量同级，演示页须同法隔离。
- `check:oversized-code-files`：WARN 500 / ERROR 700 行（豁免清单外不允许超限）；demo 页 schema 较大时拆独立模块。

## Goals

- playground `#/three-canvas-demo` 演示页：三-canvas 渲染器全能力面演示——图元库（box/sphere/cylinder/cone/torus/plane 地面 ≥5 种 primitive）、相机/灯光/环境、数据绑定（页面 setInterval 模拟点表驱动 rotation 与 material.color，含 range 映射 + tween 动画 transform）、关键帧动画（time 触发 loop）、`onObjectClick` 事件（interactive 模型）。懒加载隔离：three 不进 playground 主 bundle，App 单测不加载 three。
- `tests/e2e/three-canvas-perf.spec.ts` 浏览器侧基准：硬门禁（canvas 元素存在且尺寸非 0 + `data-three-scene-state="ready"` + rAF 推进）+ 程序化像素探测（rAF 内 readPixels 多帧采样，非空场景全零判败，镜像 scada-canvas-assert T5 口径）+ fps 测量（固定窗口 rAF 计数、3 采样取最大、宽容下限门禁，实测值记录到 plan/log）。
- plan 465 要求的「评估」结论落盘：fps 门禁口径（阈值依据、采样口径、环境固有失败时的 watch-only 注册边界）写入本 plan Closure；roadmap「Current Baseline → 主要缺口」过期描述（「无任何实现代码」「实现代码为零」）按 live 实况修正。

## Non-Goals

- `flux-renderers-3d` 库代码零改动：渲染器、SceneManager、绑定管线、AI 模块均不动（渲染证据经既有 `data-three-scene-state` 埋点与页面级探针获取）。
- Gemini 适配、per-primitive 事件、spring 物理参数化、数据帧批量化（均已在 465–468 裁定为 out-of-scope improvement，无 successor 义务）。
- 工业协议（Socket.IO/WebSocket）演示：I3 适配器已有单测覆盖，演示页不接真实 socket（openSocket 契约演示属潜在后续工作，本计划不扩）。
- GPU 级性能调优：SwiftShader 软渲染口径的 fps 只作「渲染循环健康」基线，不代表目标硬件吞吐。

## Scope

### In Scope

- `apps/playground/src/pages/three-canvas-demo.tsx`（含 schema 模块，如 `three-canvas-demo-schema.ts`）及路由接线：`App.tsx`（懒加载 + domain case）、`domain-route-entries.ts`、`pages/home-page.tsx`、`pages/index.ts`。
- `apps/playground/package.json` 增加 `@nop-chaos/flux-renderers-3d: workspace:*`。
- `tests/e2e/three-canvas-perf.spec.ts`（含页内探针逻辑；如需 helper 则落 `tests/e2e/helpers/`）。
- `docs/backlog/threejs-integration-roadmap.md` Baseline 过期描述修正。
- `docs/logs/2026/09-15.md` 记录。

### Out Of Scope

- `packages/flux-renderers-3d/` 源码、其他 renderer 包、flux-react/core 运行时。
- 视觉回归基线（不写 `*-visual.spec`，不留截图基线）。

## Failure Paths

| 可测场景编号      | 触发                                 | 行为                                                                            | 可重试          | 用户可见表现                                   |
| ----------------- | ------------------------------------ | ------------------------------------------------------------------------------- | --------------- | ---------------------------------------------- |
| webgl-unavailable | 运行环境无 WebGL 上下文              | SceneManager onError 上报 `webgl-unavailable`，`data-three-scene-state="error"` | 否（环境固有）  | 演示页错误态；e2e 硬门禁失败（ready 是前提）   |
| fps-below-floor   | 软渲染慢机/高负载                    | 3 采样取最大仍低于下限阈值                                                      | 是（retries=1） | e2e 失败；证实环境固有后按 watch-only 流程注册 |
| pixel-all-zero    | 渲染管线回归（visible:false/黑屏等） | 非空场景像素探测全零 → 判败（scada-canvas-assert T5 同法）                      | 否              | e2e 失败                                       |
| binding-no-tick   | 页面模拟数据定时器未生效             | 绑定驱动属性无变化，fps 窗口内画面静止                                          | 否              | e2e 像素差分/rAF 证据缺失 → 失败               |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（本计划的交付物本身就是一个可提交的 e2e 基准 spec；渲染真实性证据与 fps 门禁全部程序化断言，不依赖截图）。

## Execution Plan

### Phase 1 - 演示页与路由接线

Status: planned
Targets: `apps/playground/src/pages/three-canvas-demo*.tsx`、`App.tsx`、`domain-route-entries.ts`、`pages/home-page.tsx`、`pages/index.ts`、`apps/playground/package.json`

- Item Types: `Proof | Fix`

- [ ] playground 依赖接线：`package.json` 增加 `@nop-chaos/flux-renderers-3d: workspace:*` 并 `pnpm install`。
- [ ] 演示页 `three-canvas-demo.tsx`（+ schema 模块）：页面内自建 registry（`createSchemaRenderer` + `createDefaultRegistry` + `registerThreeRenderers` + 页面骨架所需 basic renderers），three.js 经懒加载入口隔离（App 层 `import()` 动态引入，主 bundle 与 App 单测不加载 three）。
- [ ] 演示场景：≥5 种 primitive 图元 + 相机/灯光/环境背景 + 绑定（setInterval 模拟点表 → rotation 持续旋转 + material.color 经 range 映射 + tween 动画）+ time 触发 loop 关键帧动画 + interactive 模型 `onObjectClick` 事件。
- [ ] 路由接线 4 点：`domain-route-entries.ts` 条目（eyebrow `3D Rendering`）、`home-page.tsx` NavigationTarget 联合 + NavCard、`App.tsx` 懒加载 const + `case 'three-canvas-demo'`、`pages/index.ts` 导出。
- [ ] Proof：`#/three-canvas-demo` 在 playground 可打开、场景 ready（该验证随 Phase 2 e2e 程序化固化）。

Exit Criteria:

- [ ] `pnpm --filter @nop-chaos/flux-playground typecheck`/`build` 通过；主 bundle 不含 three（机械化抽查：grep `apps/playground/dist/assets/` 产物 chunk 无 three 源码特征，如 `WebGLRenderer` 类体）。
- [ ] 既有 playground 单测（App/route-matrix/home-page 相关）全绿。

### Phase 2 - 浏览器侧 fps e2e 基准

Status: planned
Targets: `tests/e2e/three-canvas-perf.spec.ts`（+ 可选 `tests/e2e/helpers/three-canvas-assert.ts`）

- Item Types: `Proof`

- [ ] 先行固化断言口径（红/绿语义在 spec 注释声明，镜像 scada-perf 注释风格）：硬门禁——`[data-three-scene-state]` 容器存在、canvas 元素尺寸非 0、`data-three-scene-state="ready"`、rAF 帧推进计数 > 0。
- [ ] 像素探测：页内 rAF 回调中对 WebGL 上下文 readPixels 多帧采样（≥30 帧窗口），任一非零样本 → `pixel-confirmed`；非空场景全零 → 判败（preserveDrawingBuffer 缺失下单帧读取有竞态，多帧伯努利采样消除；镜像 scada-canvas-assert T5 口径并在注释声明）。**执行注意**：若观察到确定性全零，先按探针机制问题排查（帧序：读回调需在该帧 three render 之后；可调采样时序），确认探针机制正确后才可判场景回归。
- [ ] fps 测量：固定窗口（≥2s）rAF 计数，3 采样取最大（scada-perf headless 帧钟口径），断言宽容下限（评估结论随 Phase 3 落盘）；实测 fps 数值 `console.log` 输出并记录到 plan/log。
- [ ] binding 活性负载确认：模拟点表 interval 运行中（页面可见状态或 DOM 侧读数变化），fps 测量在绑定驱动场景下进行（旋转/变色进行中）。

Exit Criteria:

- [ ] `npx playwright test three-canvas-perf` 本地全绿（先红后绿：硬门禁与像素路径各复现一次失败——硬门禁如临时指向不存在状态值、像素路径如临时隐藏全部 mesh，验证后还原）；正向证据记录 `pixel-confirmed` 观察值。
- [ ] fps 实测值与采样口径已记录（spec 输出 + plan Closure 引用）。

### Phase 3 - 评估结论、roadmap 同步与收尾

Status: planned
Targets: 本 plan、`docs/backlog/threejs-integration-roadmap.md`、`docs/logs/2026/09-15.md`

- Item Types: `Decision | Fix | Proof`

- [ ] Decision：落盘 plan 465「I2.2 关闭后评估」结论——fps 门禁阈值及依据（SwiftShader 软渲染口径）、采样口径、环境固有失败时 watch-only 注册边界（对齐 DV 基线 watch-only 清单流程）；本条写入 Closure Status Note。
- [ ] Fix：roadmap「Current Baseline → 主要缺口」过期描述修正（「无任何实现代码：three-canvas 渲染器、TransformEngine、图元库、协议适配器均为空白」「实现代码为零」→ live 实况：I0–I4 已交付 + 本计划 fps e2e）；不触碰 Phase Status（全 done，无状态变更）与 I4.1 行人工评审标记（Rule 5，维持现状）。
- [ ] Proof：`docs/logs/2026/09-15.md` 记录（fps 实测、e2e 计数、全量验证结果）。

Exit Criteria:

- [ ] 评估结论在本 plan Closure 可查；roadmap Baseline 描述与 live repo 一致；`docs/logs/` 记录在案。

## Draft Review Record

> 由独立子 agent（fresh session）填写。

- Reviewer / Agent: independent sub-agent（general-purpose fresh session）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major；3 Minor 已随转 active 落盘——m1 先红后绿扩展到像素路径（隐藏全部 mesh 复现 `pixel-all-zero`）+ 正向记录 `pixel-confirmed`；m2 确定性全零先按探针机制排查（帧序）再判场景回归（Phase 2 执行注意）；m3 主 bundle 无 three 改为机械化抽查（grep dist 产物 chunk）替代文字性说明。四维核对全部引用逐一验证为准确（含 three-canvas.tsx:97、scene-manager.ts:138、465 Deferred 原文、roadmap 过期描述原文）。

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复
- [ ] 所有 in-scope confirmed contract drifts 已收敛
- [ ] 行为/契约结果已达成（演示页可开 + fps e2e 硬门禁/像素探测/基准测量可用）
- [ ] 必要 focused verification 已完成（Phase 1 playground typecheck/build + 既有单测；Phase 2 e2e 先红后绿）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [ ] 受影响的 owner docs 已同步（roadmap Baseline 修正 + `docs/logs/`；flux-renderers-3d 无代码改动无 owner-doc 义务）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`
- [ ] `pnpm test:e2e`（three-canvas-perf 全绿；既有 watch-only 终态清单不因本计划扩大）

## Deferred But Adjudicated

无（本计划即一条已裁定义务的兑现；如执行中发现新的优化空间，按模板新增条目并裁定）。

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 待 closure audit 通过后填写。

Closure Audit Evidence:

- Auditor / Agent: 待填
- Evidence: 待填

Follow-up:

- 无
