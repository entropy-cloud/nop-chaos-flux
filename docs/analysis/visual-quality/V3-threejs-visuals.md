# V3 研究报告：3D 渲染视觉与交互修复

> 核查日期: 2026-09-19
> 基线: master @ 03add8bc4（V2 已收口，full-green）
> 输入: 普查报告 §2、路线图 V3、`docs/components/threejs-integration/design*.md`、plan 469 演示页遗产
> 状态: 已独立核实（revised → 2 Major + 7 Minor 修订后零 Blocker/Major，见文末核实记录）

## 0. Findings 逐项核实（普查 §2 七项全部 live 证实）

- **F1 伪 hover**：`scene-manager.ts:494-531` `bindPointerHandlers` 仅监听 `pointerdown`/`pointerup`；`emitHoverAt`（:552）只在按下/抬起瞬间发射——`onObjectHover` 语义名不符实。全包无 pointermove、无 emissive/highlight 材质反馈（grep 证实）。
- **F2 阴影死配置**：`scene-manager.ts:109` renderer 工厂 `{antialias, alpha}` 无 `shadowMap.enabled`；:181 `light.castShadow = config.castShadow` 已接 schema，但 renderer 未启用阴影、mesh 未设 `castShadow`/`receiveShadow` → 阴影永不渲染。`schemas.ts` 声明了 `castShadow`（灯光面）——死配置。
- **F3 容器高度硬编码**：`three-canvas.tsx:98` `style={{ width: '100%', height: '400px', ... }}`。resize 链路已存在（`renderer/hooks/use-scene-manager.ts:47-50` ResizeObserver → `manager.resize()`）——只缺高度可配置。
- **F4 加载/错误/空态 UI 缺失**：`three-canvas.tsx:100-105` loading/empty 仅在宿主提供 regions 时渲染宿主内容；error 态**完全无 UI**（仅 `data-three-scene-state="error"` 埋点 + 事件）。加载进度：three r186 `Loader.loadAsync(url, onProgress)` 原生支持进度回调（@types/three Loader.d.ts:41；model-loader.ts:15 注释的"2 参"指无 AbortSignal，非无 onProgress——独立核实 M1 勘误），缺口仅在仓内 `LoaderFactory` 类型自设单参 `loadAsync(url: string)`（model-loader.ts:11）未透传。
- **F5 AI 生成链路零出口**：`ai/schema-generator.ts`（generateFromPrompt + 校验修复回路，含测试）仅由 `index.ts` 导出，全仓无消费方；`renderer-definitions.ts` 四处 `editorType: 'code'` 手写 JSON（:13/:33/:39/:49）。旁证：`schema-generator.ts:92` 确定性模板已输出 `castShadow: true`，坐实 F2 死配置面。
- **F6 hook 能力未暴露**：`three-canvas-demo-schema.ts` 覆盖 tween/range/condition/loop 关键帧/onObjectClick；`orb-hover`（:82）是数据绑定 id 非 onObjectHover 演示。state/event 触发 clip、spring/step tween、onObjectHover 无演示消费。
- **F7 e2e 断言缺口**：仅 `three-canvas-perf.spec.ts`（ready/像素非零/fps）；无 pick/hover/阴影/高度可配置断言。

## 1. 裁决

| #   | 项                               | 裁决                                        | 要点                                                                                                                                                                                                                                                                                                                                       |
| --- | -------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | 真 hover                         | **Fix**                                     | `bindPointerHandlers` 增 `pointermove`（节流至 rAF）+ Raycaster 命中检测；`onObjectHover` 语义修正（进入/离开）；hover 高亮 = 命中 mesh 材质 `emissive` 临时提亮（可配置色/强度，进 schemas 或常量默认）——材质恢复需在离开/卸载时还原原始值                                                                                                |
| A2  | 阴影                             | **Fix**                                     | renderer 启用 `shadowMap.enabled = true`（有任一 `castShadow` 灯光或 mesh 时）；mesh 按 schema `castShadow`/`receiveShadow`（schemas.ts 增补字段）接线；地面/接收面由演示页 schema 提供                                                                                                                                                    |
| A3  | 容器高度                         | **Fix**                                     | `three-canvas.tsx` 高度改为 schema 驱动（`height` prop → style；默认保持 400px 向后兼容）；resize 链路已存在无需改                                                                                                                                                                                                                         |
| A4  | 加载/错误/空态内建 UI + 加载进度 | **Fix（最小内建）**                         | 无宿主 regions 时渲染内建默认：loading = spinner + 进度文本（复用 `@nop-chaos/ui` Spinner）、error = 错误文案重试按钮、empty = 引导文案；宿主 regions 仍优先。加载进度：放宽仓内 `LoaderFactory` 类型透传 `onProgress`（three 原生支持，核实 M1 勘误）→ three-canvas 进度 state → loading UI 百分比（GLTF 场景可观测；图元场景走不确定态） |
| A5  | AI 生成出口                      | **Fix（演示页出口，canned provider 离线）** | `three-canvas-demo` 增"AI 生成 schema"入口：预设提示词按钮 + `generateFromPrompt({ prompt, provider })`，provider 为演示页内 **canned mock LlmProvider**（`schema-generator.test.ts:87-96` providerReturning 同模式，离线可跑、无外部 API 依赖，UI 明示"演示用离线 mock"）→ 结果 JSON 展示 + 应用到演示画布                                |
| A6  | 演示补齐                         | **Fix**                                     | demo schema 增补：hover 演示（配合 A1）、spring/step tween、state/event 触发 clip 各一节                                                                                                                                                                                                                                                   |
| A7  | e2e 断言                         | **Fix**                                     | three-canvas e2e 增：hover（pointermove → 材质 emissive 变化像素/计算断言）、pick、容器高度可配置（L2）、阴影启用（renderer 属性断言 + 场景像素）、错误态 UI（L1）                                                                                                                                                                         |

## 2. 边界

- 不做后处理/天空盒/OrbitControls 之外相机 UI（v5 显式裁除，恢复需人工确认）。
- **保护区触碰如实声明**：`height`（容器尺寸）与 mesh 级 `castShadow`/`receiveShadow` 均为**新增 schema 顶层/definition 字段**——renderer definition fields 按 `ai-autonomy-policy.md:48` 为 `plan-first` 级（本工作正走完整 plan 流程故合规），plan 须附 `docs/references/renderer-interfaces.md` 对齐证据；实质理由：height 为容器样式属性非渲染语义、mesh 阴影为灯光级 `castShadow` 的对称补全、默认值保持现行为（向后兼容）。draft review 由独立审查员专项复核此项。
- hover 高亮边界（核实 Minor-4）：`MeshBasicMaterial` 无 emissive（primitive-factory.ts:43-48）——basic 材质跳过高亮或在 plan 中裁决降级方案；GLTF 需 traverse 子 mesh、材质数组/共享材质按材质记录原始 emissive/emissiveIntensity 并在离开/卸载还原；hover/pick 受 `ModelConfig.interactive`（默认 false，schemas.ts:98-99）门控——demo 与 e2e 目标须 `interactive: true`。
- 阴影细节（核实 Minor-5）：`shadowMap.enabled` 于 init 首帧前开启即足；plan 含 shadow camera 调优项（directional 默认视锥 ±5 可能裁剪 16×16 地面阴影；`createLight` :180 从不 `scene.add(light.target)`——须补）。
- 不改 `index.ts` 公共导出面。
- 引擎单测面（scene-manager-\*.test 8 个文件）零回归。

## 3. 验证方式

1. 单测：hover 节流/进入离开语义/材质还原（含卸载还原断言）、阴影接线（renderer.shadowMap.enabled / mesh flags）、高度 prop、错误态 UI 挂载、onProgress 透传——先红后绿。
2. e2e：A7 断言面（消费 V0 helper：L2 高度几何、L4 像素、L1 UI）。
3. 全量 3D 包测试 + three-canvas-perf 回归。

## 4. 独立核实记录

- Reviewer / Agent: 独立核实审查员（fresh sub-agent session，2026-09-19）
- Verdict: `revised`（0 Blocker / 2 Major / 7 Minor）
- 已处理：M1——A4 事实勘误（GLTFLoader.loadAsync 原生支持 onProgress，"2 参"指无 AbortSignal；缺口仅仓内 LoaderFactory 自设单参），进度条从 deferred 升级为 Fix（类型放宽 + 透传 + 进度 UI）；M2——A5 provider 裁决补齐（canned mock LlmProvider 离线演示，UI 明示）。Minor 1-7 全部吸收：editorType 四处、行号 :100-105、保护区措辞如实化（height 即新增 schema 顶层 prop，plan-first 合规 + renderer-interfaces.md 对齐义务）、basic 材质无 emissive + interactive 门控 + 共享材质还原边界、shadow camera 调优 + light.target 未 add 场景、demo schema 同步义务、generator castShadow 旁证。
- 核实亮点：Raycaster/pickAt/onHover 基础设施全部现成；三处使用点中仅 demo 需同步（e2e 零影响）；§3.1 补材质卸载还原断言。
