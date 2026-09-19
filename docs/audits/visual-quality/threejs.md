# 视觉质量证据卡：3D 渲染（V3）

> 状态: verified
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §2（已经三轮独立核实）
> Owner plan: `docs/plans/473-visual-quality-v3-threejs-visuals-plan.md`
> Owner docs: `docs/components/threejs-integration/design*.md`

## Findings 清单

- [V3-F1] 伪 hover：`engine/scene-manager.ts:494-531` 只监听 pointerdown/pointerup，无 pointermove——`onObjectHover` 只在按下/抬起瞬间发射；全包无 emissive/highlight，悬停无任何视觉反馈
  - 证据: 普查 §2.1；研究报告核实：Raycaster/pickAt/onHover 基础设施现成；basic 材质无 emissive、共享材质按材质表还原、interactive 门控（默认 false）
  - 裁决: fixed（plan 473 Phase 1：pointermove rAF 节流 + 进入/离开派发 + HoverHighlighter emissive 高亮/还原/卸载清理；pointerdown 强制 enter 保留供触屏；e2e 经 onObjectHover→env.notify 断言）
  - 状态: fixed
- [V3-F2] 阴影死配置：`schemas.ts:114` 声明 `castShadow`，但 renderer 仅 `{antialias,alpha}`（`:109`），全包无 `shadowMap.enabled`，mesh 未设 castShadow/receiveShadow → 阴影永不渲染
  - 证据: 普查 §2.2；旁证 schema-generator :92 亦产出死字段
  - 裁决: fixed（plan 473 Phase 1：shadowMap.enabled 按灯光 castShadow 开启 + mesh 级 castShadow/receiveShadow schema 字段 + light.target 入场景 + shadow camera 视锥 ±14/ far 60/ mapSize 1024；e2e 断言 renderer/scene 状态）
  - 状态: fixed
- [V3-F3] 容器尺寸残留硬编码：容器高度写死 400px（`three-canvas.tsx:98`）；resize 链路已存在（`renderer/hooks/use-scene-manager.ts:47-50` ResizeObserver → `manager.resize()` → `resizeToContainer()`，`scene-manager.ts:563-571`），camera aspect 800/600（`scene-manager.ts:146`）仅为初始兜底——只补高度可配置
  - 证据: 普查 §2.3（经两轮勘误确认 resize 链路存在）
  - 裁决: fixed（plan 473 Phase 2：schema `height` 字段默认 '400px' 向后兼容；demo 以 min(62vh,560px) 撑满）
  - 状态: fixed
- [V3-F4] AI 生成链路零出口：`ai/schema-generator.ts`（generateFromPrompt + 校验修复回路）全仓无消费方，`renderer-definitions.ts:38-42` 全部 `editorType:'code'` 手写 JSON，无演示页
  - 证据: 普查 §2.4
  - 裁决: fixed（plan 473 Phase 3：demo 页 AI 生成入口，canned mock LlmProvider 离线演示（UI 明示），generateFromPrompt 校验回路照常，JSON 展示 + 应用画布）
  - 状态: fixed
- [V3-F5] 观感基础件缺失：无 gizmo/GridHelper/坐标轴/后处理/天空盒（v5 显式裁除，恢复属契约变更需人工确认）；模型加载无进度（`model-loader.ts:15` 不接 onProgress，loading 态仅文本）；错误态仅埋点无内建 UI；相机控制无 UI 控件
  - 证据: 普查 §2.5；核实 M1 勘误：GLTFLoader.loadAsync 原生支持 onProgress（缺口仅仓内 LoaderFactory 类型），进度条升级为 Fix
  - 裁决: fixed（内建 loading spinner+百分比（rAF 合流、generation guard 丢迟到进度）/error 文案+Retry（reloadKey 重建）/empty 引导；宿主 region 优先。后处理/天空盒维持 v5 裁除；AbortSignal deferred）
  - 状态: fixed
- [V3-F6] hook 级可用但未暴露：state/event 触发 clip、spring/step tween、onObjectHover 均无演示页消费
  - 证据: 普查 §2.6
  - 裁决: fixed（plan 473 Phase 3：demo schema 增 hover/onObjectHover、spring/step tween、event 触发 clip（orb 点击转圈）、state 触发 clip（heat>70 ring 跳动）各一节）
  - 状态: fixed
- [V3-F7] e2e 断言缺口：仅 `three-canvas-perf.spec.ts`（ready/像素非零/fps≥5），无 pick/hover/绑定视觉正确性/resize 断言
  - 证据: 普查 §2.7 + V0 研究报告 §2
  - 裁决: fixed（plan 473 Phase 4：three-canvas-visual.spec 5 用例——高度几何/hover 事件/阴影 renderer+scene 状态/错误 UI/AI 生成应用；dev-only 观测句柄 window.\_\_flux_three_handles 承载程序化断言）
  - 状态: fixed

## 视觉证据

待 V3 plan 落地：hover 高亮材质反馈（L4 像素/材质断言）、阴影启用（像素断言影子存在——WebGL 采样须同任务先触发渲染帧，见 `canvas-pixel-probe.ts` 头注）、容器高度可配置（L2 几何）、加载/错误 UI（L1/L3）。

## Closure

V3 closure audit 三轮（fresh session）：issues → issues（3 项文本残留）→ **approved**（2026-09-19）。F1-F7 全部 fixed；进度条按核实 M1 从 deferred 升级 Fix（GLTFLoader.loadAsync 原生支持 onProgress，缺口仅仓内 LoaderFactory 类型）。plan 473 `completed`，roadmap V3 `done`。
