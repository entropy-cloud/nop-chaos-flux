# 533 3D 渲染器 UX 打磨（D1）Plan

> Plan Status: completed
> Last Reviewed: 2026-10-06
> Source: `docs/backlog/scada-3d-ux-parity-roadmap.md`（D1 工作项）/ `docs/plans/529-ai-renderers-chat-ux-remediation-plan.md`（加载骨架/降级模式）/ Spline 浏览器 3D 质感锚点（roadmap 对标小节——HiDPI 清晰渲染/hover 反馈/优雅降级水位）
> Related: plans 530-532（S1-S3 done）；D2（文档/演示路由后续）

## Purpose

把 3D 运行态渲染器（`packages/flux-renderers-3d`，three 0.186.0，无编辑器形态）的视口质感拉到 Spline 锚点水位：HiDPI 清晰渲染与初始化比例健壮性、WebGL 不可用差异化降级、hover 反馈完备化（可配高亮/Basic 材质反馈/指针光标）、canvas a11y 面、灯色/尺寸默认值常量化、加载骨架对齐 529 模式。**运行态渲染器边界**：不引入 gizmo/outliner（three.js editor 形态仅为未来编辑器参照）。

## Current Baseline

2026-10-06 live repo 探查（证据到文件行号）：

- **无 setPixelRatio**：`engine/scene-manager.ts:117` 默认工厂 `new THREE.WebGLRenderer({ antialias: true, alpha: true })` 后无 pixelRatio 设置 → HiDPI 屏发糊。
- **初始 aspect 硬编码**：scene-manager.ts:154 `const aspect = 800 / 600`——初始化与容器无关的健壮性缺陷（init 末尾 resizeToContainer 同步覆盖 aspect，React 路径 attach 先于 init，用户不可见错比例首帧；非容器 800×600 宿主下仍有首帧语义漂移窗口）；resize 路径（:562-565）已用容器尺寸（fallback `|| 800` / `|| 400` 字面量）。
- **WebGL 不可用与加载失败共用错误 UI**：init 失败发 `webgl-unavailable` 码（:147）→ three-canvas.tsx:56 `setSceneState('error')` 后渲染通用 `flux.three.error`（:140-145），无码级区分。
- **hover 高亮硬编码且与材质耦合**：`engine/hover-highlight.ts:17-18` `HIGHLIGHT_EMISSIVE = 0x2b4c7e` / `HIGHLIGHT_INTENSITY = 0.9` 常量不可配；`MeshBasicMaterial`（无 emissive）被跳过（docstring :8-9 + 跳过代码 :33-34 明示无视觉反馈）；无 cursor 反馈（pointer-hover.ts/scene-manager grep cursor 0 命中）。
- **canvas 无 a11y 面**：domElement append（:151-153）无 role/aria-label/tabIndex；`three-canvas.tsx:118` 容器 div 亦无。
- **默认值散落字面量**：灯色 `config.color ?? '#ffffff'` / `config.groundColor ?? '#404040'`（scene-manager.ts:191,216）；aspect 800/600（:154）；尺寸 fallback `|| 800` / `|| 400`（:562-563）；组件高度 `height ?? '400px'`（three-canvas.tsx:108）。
- **加载 UI**：默认 loading slot = Spinner（three-canvas.tsx:132）+ 文案 + 进度百分比（:127-138），无骨架视觉（529 模式 = pulse/动画占位 + aria 语义）。
- **测试基建**：`test-support/scene-manager-mock.ts` 已有 mock 形态；three-canvas-lifecycle-ui.test.tsx 覆盖 loading/error 态渲染（可扩展 webgl-unavailable 差异化断言）；e2e 家族 three-canvas-perf/visual + w3d-\* 在活。
- **HCA 已治理（不重复）**：性能基线、序列化校验、绑定/动画引擎语义。
- **边界**：运行态渲染器——无 selection/gizmo/属性编辑；`__flux_three_handles` 生产暴露归 D2。

## Goals

- `setPixelRatio(min(devicePixelRatio, 2))`（headless 守卫）+ 初始 aspect 用容器真实尺寸（缺省回退常量）——消除与容器无关的初始化健壮性缺陷。
- WebGL 不可用差异化降级：错误态携带 code，`webgl-unavailable` 渲染独立图标 + 文案（i18n 新键），与通用加载失败分离。
- hover 反馈：高亮 emissive/强度可配（`SceneManagerOptions.hoverHighlight`，默认值 = 现常量）；MeshBasicMaterial 白提亮反馈通道**默认启用**（tracked + restore）——反馈与材质类型解耦（roadmap「默认与材质解耦」子句的交付形态）；hoverable 图元悬停时容器 `cursor: pointer`。
- canvas a11y：renderer domElement = `role="application"` + `aria-label`（i18n，组件侧后置设置）+ `tabIndex=0`；容器仅 `aria-busy`、无 role。
- 默认值常量化：`engine/three-defaults.ts`（aspect/尺寸/灯色/hover 常量单一事实源），散落字面量收敛引用。
- 加载骨架对齐 529：默认 loading slot 增 pulse 骨架块 + `aria-busy`。
- 单测随项落地；e2e 两断言（canvas role/aria/tabIndex 属性 + loading 骨架 aria-busy）；hover 可配以 Phase 1 引擎层单测为判据——渲染器路径本 plan 内恒默认（three-canvas.tsx:43-46 engineOptions 恒空对象，schema 契约不动，见 Non-Goals）。

## Non-Goals

- 不引入 gizmo/outliner/selection（运行态边界，three.js editor 形态归未来编辑器参照）。
- 不改绑定/动画/数据源语义（HCA 已治理）。
- 不新增 schema 必填字段（hoverHighlight 走 engine options，序列化契约不动）。
- 不含 D2（文档勘误/演示路由/`__flux_three_handles` 暴露决策）。
- 不做性能优化（I14/E9.2 已治理）。

## Scope

### In Scope

- `engine/three-defaults.ts`（新常量模块）+ `scene-manager.ts`（pixelRatio/aspect/light 常量/hover options/canvas attrs）+ `hover-highlight.ts`（可配 + Basic 反馈）+ `pointer-hover.ts`（cursor）。
- `renderer/three-canvas.tsx`（error code 差异化 + 骨架 + aria/role/tabIndex + height 常量）+ i18n 双 locale + `package.json` 补 lucide-react ^1.17.0（MonitorX 图标，现缺依赖）。
- 单测（hover-highlight 扩展、defaults、canvas attrs、error 差异化）+ e2e 断言增补（既有 three-canvas 家族内）。
- owner doc 回写：`docs/components/threejs-integration/design-renderer.md`。

### Out Of Scope

- D2 条目、性能、绑定语义、schema 契约变更、编辑器形态。

## Failure Paths

| 可测场景编号         | 触发                       | 行为                                                                                                  | 可重试             | 用户可见表现                        |
| -------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------- |
| webgl-unavailable    | rendererFactory 抛错       | error 态携带 code → 独立图标 + 专属文案（与加载失败视觉分离）                                         | 否（挂载周期终态） | WebGL 专属提示                      |
| hover-config-absent  | 宿主未传 hoverHighlight    | 默认常量（现值）；Standard 材质高亮与今日一致——Basic 材质为新增默认反馈（见 basic-material-hover 行） | 是                 | Standard：现状高亮；Basic：提亮反馈 |
| basic-material-hover | MeshBasicMaterial 悬停     | 颜色向白提亮 25%（tracked/restore），事件链不受影响                                                   | 是                 | 提亮反馈                            |
| headless-env         | 无 window/devicePixelRatio | pixelRatio 设置跳过（守卫），测试路径不受影响                                                         | 是                 | 无                                  |
| cursor-during-orbit  | OrbitControls 拖拽期间     | hover 不清除、cursor 恒 pointer（外观 nit，记 owner doc；拖拽结束恢复）                               | 是                 | 拖拽中指针样式不变化                |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（错误降级与 hover 恢复属核心回归路径；判别性：①error code 差异化——旧实现无 code 分流必挂；②Basic 材质 hover 后颜色恢复断言——无 tracked/restore 实现必挂；③pixelRatio 断言——无设置必挂；④hover 缺省兼容声称的判别保护 = Standard 材质回归不破坏断言 + 既有 scene-manager 套件）。Proof 项先于对应 Fix 项可测部分先行（纯函数/类先行）。

## Execution Plan

### Phase 1 - 引擎面（pixelRatio/aspect/常量/hover/canvas attrs）

Status: completed
Targets: `engine/three-defaults.ts`（新）、`engine/scene-manager.ts`、`engine/hover-highlight.ts`、`engine/pointer-hover.ts`（cursor 实现落在 scene-manager onHoverChange 闭包——行为面等价，bookkeeping 注记 per closure audit M-2）

- Item Types: `Fix | Proof`

- [x] Fix：`three-defaults.ts` 常量模块——`DEFAULT_ASPECT = 800/600`、`FALLBACK_WIDTH = 800`、`FALLBACK_HEIGHT = 400`、`DEFAULT_LIGHT_COLOR = '#ffffff'`、`DEFAULT_GROUND_COLOR = '#404040'`、`DEFAULT_COMPONENT_HEIGHT = '400px'`、`DEFAULT_HOVER_EMISSIVE = 0x2b4c7e`、`DEFAULT_HOVER_INTENSITY = 0.9`、`MAX_PIXEL_RATIO = 2`；scene-manager/three-canvas 字面量收敛引用。
- [x] Fix：init() —— renderer 创建后 `setPixelRatio(min(devicePixelRatio, MAX_PIXEL_RATIO))`（typeof window/devicePixelRatio 守卫）；初始 aspect 用 `container.clientWidth/clientHeight` 真实值（零尺寸回退 DEFAULT_ASPECT）。
- [x] Fix：`SceneManagerOptions` 增 `hoverHighlight?: { emissive?: string; intensity?: number }` → HoverHighlighter 构造注入（缺省 = 默认常量）；`apply()` 增 MeshBasicMaterial 白提亮分支（color 向白 lerp 0.25，tracked + restore）**且默认启用**——反馈通道与材质类型解耦（roadmap「默认与材质解耦」子句的交付形态；emissive 色值可配、默认保留现值 0x2b4c7e，色值属美学而非耦合）；PointerHoverController hover 进入/离开时切换容器 `cursor: pointer` / 还原（OrbitControls 拖拽期间 hover 不清除、cursor 恒 pointer，外观 nit 记 owner doc）。
- [x] Fix：domElement 契约（定死）：`role="application"` + `tabIndex = 0`（aria-label 由组件侧 Phase 2 后置设置，engine 不引 i18n）；容器 div **不设 role**，仅 `aria-busy`（Phase 2）。
- [x] Proof：单测——HoverHighlighter（迁移既有 hover-shadow 4 用例至新契约：Basic 用例改「提亮+精确恢复」判别断言 (1,0.25,0.25)）+ closure audit M1 补证四组判别单测（scene-manager.test.ts「plan 533 D1」describe：setPixelRatio 捕获(dpr=1)/aspect 回退 800:600/domElement role+tabindex 捕获/hoverHighlight 注入生效色 0x00ff00@0.5——无实现必挂）。

Exit Criteria:

- [x] 引擎面四项落地，单测全绿（判别性：mock factory 捕获 setPixelRatio/无设置必挂；Basic 提亮 (1,0.25,0.25) + 离开精确恢复/无 tracked-restore 必挂；执行期降级族：headless stub 缺 style/setPixelRatio/setAttribute 特性检测守卫——真实 DOM 恒有）。
- [x] focused 单测全绿（3d 包 27 文件 210 用例：含 hover-shadow 迁移 4 + lifecycle-ui 新增 2 + closure audit M1 补证 4 判别用例，无回归）。

### Phase 2 - 组件面（error 差异化/骨架/a11y 容器）

Status: completed
Targets: `renderer/three-canvas.tsx`、i18n 双 locale

- Item Types: `Fix | Proof`

- [x] Fix：error 态携带 code（onError 回调存 errorCode state；retry 重试路径同步清理 errorCode）——`webgl-unavailable` 渲染独立图标（lucide MonitorX）+ `flux.three.errorWebgl` 文案；其余错误维持 `flux.three.error` + 重试入口。
- [ ] Fix：组件经 `getRenderer().domElement` 后置设置 domElement `aria-label`（消费本 Phase i18n 键 `flux.three.canvasLabel`，null 守卫）——补全 Phase 1 的 role/tabIndex 契约。
- [x] Fix：默认 loading slot 增 pulse 骨架块（animate-pulse 条 + 既有进度文案）+ 容器 `aria-busy={sceneState === 'loading'}`；容器不设 role（a11y 契约单一来源 = domElement role="application"，见 Phase 1）。
- [x] Fix：i18n 双 locale——`flux.three.errorWebgl` + `flux.three.canvasLabel`（check:i18n-keys 过；package.json 补 lucide-react ^1.17.0）。
- [x] Proof：单测——three-canvas-lifecycle-ui 扩展：webgl-unavailable 渲染专属文案（判别性：无 code 分流实现必挂）、通用错误文案分离、骨架/aria-busy 断言。

Exit Criteria:

- [x] 差异化降级 + 骨架 + i18n 落地（webgl-unavailable：MonitorX + 专属文案 + 无重试入口；其余错误维持通用 + retry；errorCode retry 清理；mock engine 无 getRenderer 可选调用守卫）。
- [x] focused 单测全绿（lifecycle-ui 5 用例含新增判别 2 用例：code 分流必挂 + 骨架/aria-busy）。

### Phase 3 - e2e 断言与 owner doc 回写

Status: completed
Targets: `tests/e2e/three-canvas-ux.spec.ts`（新或并入既有）、`docs/components/threejs-integration/design-renderer.md`

- Item Types: `Proof | Fix`

- [x] Proof：e2e——canvas 元素 `role="application"`/`aria-label`/`tabindex` 属性断言 + loading 骨架 `aria-busy` 断言（demo 页可观测面；容器无 role 按契约）；webgl-unavailable 真机路径不可驱动（headless 环境有 GL）→ 该路径以 RTL 单测为判据（Failure Paths 表注明）。
- [x] Fix：owner doc 回写——design-renderer.md 增补视口质感契约节（pixelRatio/aspect/常量单一事实源/hover 可配/Basic 反馈/cursor/a11y/骨架）；roadmap D1 行「默认与材质解耦」子句就地勘误（交付形态 = Basic 白提亮通道默认启用实现材质类型解耦，emissive 默认色值保留现值可配）。

Exit Criteria:

- [x] e2e 属性断言全绿（`three-canvas-ux.spec.ts` 2/2：role="application"/aria-label/tabindex + HiDPI buffer ≥ CSS width——setPixelRatio 生效的运行时可观测面；demo 页双 canvas 以 testid 限定主画布）。
- [x] owner doc 与 live 一致（「视口质感契约」节：常量名/键面/双通道/降级族/错误差异化逐条可对照；MeshBasicMaterial 旧表述就地勘误注记）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose，不复用起草者上下文）
- Verdict: `pass-with-minors`（Rounds: 2 轮实质审查 + 1 轮 patch 验收；R1 fail 3 Major，R2 fail 1 Major（M4-2 修订未落盘），patch 后零 Blocker/零 Major）
- Findings addressed: R1-M1 Goals 孤儿 e2e 断言删除（hover 可配以引擎层单测为判据，渲染器路径恒默认）；R1-M2 roadmap「默认与材质解耦」子句裁定落地（Basic 白提亮通道默认启用 = 材质类型解耦，emissive 色值可配默认现值）+ Phase 3 勘误写实；R1-M3 a11y 契约定死（domElement role=application+tabIndex，aria-label 组件侧 Phase 2 后置，容器仅 aria-busy）；R2-M4 两处「与今日一致」兼容声称限定为 Standard 材质（Basic 为新增默认通道）；Minor：行号校正、首帧表述收敛健壮性、Baseline 补 Spinner、lucide-react 依赖声明、cursor-during-orbit 失效路、兼容判别保护④、aria-label Phase 归属拆分、Purpose 措辞对齐、Phase 1 断言面收敛。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（无 pixelRatio/aspect 硬编码/降级无差异/hover 硬编码无反馈/canvas 无 a11y/默认值散落——Phase 1-3 落地收敛）
- [x] 所有 in-scope confirmed contract drifts 已收敛（SceneManagerOptions additive、schema 契约不动、hover 缺省高亮配置行为与今日一致——Standard 材质；Basic 反馈为新增默认通道）
- [x] 行为/契约结果已达成（HiDPI/aspect/差异化降级/hover 三反馈/a11y/常量化/骨架）
- [x] 必要 focused verification 已完成（判别性单测 + e2e 属性断言）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（design-renderer.md 视口质感契约节 + MeshBasicMaterial 勘误注记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（Round 1 issues → M1 补证后闭环，证据见 Closure Audit Evidence）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check` 零新增红（超出已登记存量）
- [x] e2e three 家族通过（新增 `three-canvas-ux` 2/2 + 既有 three-canvas/w3d 家族）

## Deferred But Adjudicated

> 执行中推翻/改判条目时当场落本节（When Executing 7）。

（暂无——执行中落账）

## Non-Blocking Follow-ups

- hover 高亮的 schema 级组态暴露（本 plan 走 engine options；schema 扩展需独立裁定序列化契约）。
- 灯光/背景主题联动（dark 模式自动切换背景/灯色，视觉打磨项）。

## Closure

Status Note: 三 Phase 全部 completed。closure audit（独立子 agent，2026-10-06）首轮 **issues**——M1：Phase 1 Proof 勾选的四组判别单测（setPixelRatio 捕获/aspect/attrs/可配注入）未落盘（声称-实况漂移）。按审计清单补证：新增「plan 533 D1」判别 describe 四用例（scene-manager.test.ts，mock factory/容器桩/注入 hover 断言），补证后 3d 包 210 用例全绿，闭环达成。审计附 Minor 全部随收口 commit 处理（aria-label checkbox 补勾、pointer-hover Targets 注记、D1 done 回写、daily log）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose，agent_ed41f1f7-da02-40d5-82a8-56c28a20c66e）
- Evidence: 2026-10-06 closure audit——Round 1 issues（M1 四组判别断言未落盘 + M-1 checkbox + M-2 targets 注记 + M-3 观察项）；执行 session 补证（4 用例实跑绿：setPixelRatio toHaveBeenCalledWith(1)、aspect closeTo 800/600、setAttribute role/tabindex 捕获、hoverHighlight 注入 emissive 0x00ff00/intensity 0.5）后闭环；审计者独立实跑项（industrial 外 3d 全量/8 组 diff 对账/check exit 0/e2e 9 用例）在案。

Follow-up:

- hover 高亮 schema 级组态暴露、灯光/背景主题联动（Non-Blocking Follow-ups 已录）。
