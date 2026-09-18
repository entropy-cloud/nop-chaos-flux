# 视觉质量证据卡：3D 渲染（V3）

> 状态: seeded
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §2（已经三轮独立核实）
> Owner plan: —
> Owner docs: `docs/components/threejs-integration/design*.md`

## Findings 清单

- [V3-F1] 伪 hover：`engine/scene-manager.ts:494-531` 只监听 pointerdown/pointerup，无 pointermove——`onObjectHover` 只在按下/抬起瞬间发射；全包无 emissive/highlight，悬停无任何视觉反馈
  - 证据: 普查 §2.1
  - 裁决: pending
  - 状态: open
- [V3-F2] 阴影死配置：`schemas.ts:114` 声明 `castShadow`，但 renderer 仅 `{antialias,alpha}`（`:109`），全包无 `shadowMap.enabled`，mesh 未设 castShadow/receiveShadow → 阴影永不渲染
  - 证据: 普查 §2.2
  - 裁决: pending
  - 状态: open
- [V3-F3] 容器尺寸残留硬编码：容器高度写死 400px（`three-canvas.tsx:98`）；resize 链路已存在（`renderer/hooks/use-scene-manager.ts:47-50` ResizeObserver → `manager.resize()` → `resizeToContainer()`，`scene-manager.ts:563-571`），camera aspect 800/600（`scene-manager.ts:146`）仅为初始兜底——只补高度可配置
  - 证据: 普查 §2.3（经两轮勘误确认 resize 链路存在）
  - 裁决: pending
  - 状态: open
- [V3-F4] AI 生成链路零出口：`ai/schema-generator.ts`（generateFromPrompt + 校验修复回路）全仓无消费方，`renderer-definitions.ts:38-42` 全部 `editorType:'code'` 手写 JSON，无演示页
  - 证据: 普查 §2.4
  - 裁决: pending
  - 状态: open
- [V3-F5] 观感基础件缺失：无 gizmo/GridHelper/坐标轴/后处理/天空盒（v5 显式裁除，恢复属契约变更需人工确认）；模型加载无进度（`model-loader.ts:15` 不接 onProgress，loading 态仅文本）；错误态仅埋点无内建 UI；相机控制无 UI 控件
  - 证据: 普查 §2.5
  - 裁决: pending
  - 状态: open
- [V3-F6] hook 级可用但未暴露：state/event 触发 clip、spring/step tween、onObjectHover 均无演示页消费
  - 证据: 普查 §2.6
  - 裁决: pending
  - 状态: open
- [V3-F7] e2e 断言缺口：仅 `three-canvas-perf.spec.ts`（ready/像素非零/fps≥5），无 pick/hover/绑定视觉正确性/resize 断言
  - 证据: 普查 §2.7 + V0 研究报告 §2
  - 裁决: pending
  - 状态: open

## 视觉证据

待 V3 plan 落地：hover 高亮材质反馈（L4 像素/材质断言）、阴影启用（像素断言影子存在——WebGL 采样须同任务先触发渲染帧，见 `canvas-pixel-probe.ts` 头注）、容器高度可配置（L2 几何）、加载/错误 UI（L1/L3）。

## Closure

（V3 closure audit 后回写）
