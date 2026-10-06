# SCADA 与 3D 控件 UX 补充修正 Roadmap

> Last Updated: 2026-10-06
> Source: `docs/analysis/2026-10-05-designer-ai-ux-comparative-analysis.md`（S1–S16 画布标准）/ `docs/backlog/industrial-hmi-component-audit-roadmap.md`（HCA 治理边界）/ 基线探查（2026-10-06，证据到文件行号，见 Current Baseline）
> 前序批次: plans 526–529（flow/page/report/word designer + AI 控件同口径修正，全部 completed）

## Purpose

本文件是 SCADA 编辑器与 3D 渲染器两个复杂控件「UI/UX 补充修正」轨道的编排层：把 plans 526–529 已验证的修正口径（选中态视觉公式、拖拽反馈闭环、右键菜单、过渡动效、语义令牌、空态、检索）延伸到这两个未覆盖面，同时**显式排除 HCA 治理已交付的维度**（见 Current Baseline 的不重复清单）。工作项粒度 = 一份执行计划可收口。

## Framework / Platform Reuse

- **选中态/视觉公式**：plans 526 的 `--fd-node-selected-ring/shadow` 令牌与显式规则模式（designer-theme.css）。
- **拖拽 ghost**：plans 527 的 `setPaletteDragGhost` 模式（typeof + try/catch 双守卫、离屏 fixed、pointer-events:none、清理）。
- **右键菜单**：`page-designer-context-menu.tsx` 组件模式（viewport 钳制 / Escape / 外点 / 方向键导航，items 子内构建）。
- **过渡常量**：`PD_OVERLAY_TRANSITION` 外观属性限定模式（几何属性不入 transition）。
- **面板调宽**：WorkbenchShell `leftResizable/rightResizable` + 本地 useState（会话内有效）。
- **palette 检索**：`matchesPaletteQuery`/`matchesReportFieldQuery` 纯函数 + 空态 + 清除模式。
- **既有栈**：leafer-ui `@leafer-in/editor`（EditBox/EditSelect/框选内建）、WorkbenchShell 三栏、`@nop-chaos/ui`（Input/Skeleton/Button）、i18n 双 locale 纪律。

## Current Baseline（2026-10-06 探查）

**SCADA 编辑器**（`packages/flux-renderers-industrial/src/editor`，leafer-ui 2.2.9，136 源文件）：

- 选中视觉 = leafer Editor 插件默认 EditBox（`editor-engine.ts:78,89`，零定制）；运行态覆盖物 `engine/interaction-overlay.ts:15-18` 硬编码 hex（hover `#2f6fed` / selected `#ff7f2a` 等），无 ring/shadow 公式。
- palette 拖入无 ghost/落点指示（`editor-palette.tsx:36-39`、`scada-editor-canvas.tsx:400-443`）；图元位移无网格/对齐吸附（仅连线有钱锚点吸附 `anchor-snap.ts:53-56`）；drop 后不自动选中。
- 全包无右键菜单（grep 0 命中）；全包无 CSS transition；`styles.css` 用 `--nop-*` + hex fallback（非 hsl 令牌惯例）。
- palette 24 图元平铺，无搜索/分组折叠；WorkbenchShell 可拖宽但未传回调（不持久化）；空态纯文案。
- 方向键 nudge 已存在（`scada-editor-canvas.tsx:494-503`）但逐节点多 undo entry（与 HCA P2-4 批量单 diff 纪律不一致）。

**3D 渲染器**（`packages/flux-renderers-3d`，three 0.186.0，24 源文件）——**运行态渲染器，非编辑器**（无选中/gizmo/属性编辑；prop 全 `editorType:'code'`）：

- 无 `setPixelRatio`（HiDPI 发糊风险，`scene-manager.ts` rendererFactory）；初始 aspect 硬编码 800/600。
- WebGL 不可用与加载失败共用同一 error UI，无差异化；hover 固定高亮色 `0x2b4c7e` 可与用户材质冲突、MeshBasicMaterial 无反馈、无 cursor:pointer；canvas 无 role/aria-label/焦点路径。
- 灯色/height 等 3 处硬编码；`__flux_three_handles` 生产暴露；文档状态过时（v4「评审中」）；工业适配器无演示路由。

**HCA 已覆盖（本 roadmap 不重复）**：交互正确性、undo 事务粒度与逆计算、a11y/aria（canvas wrapper guard）、i18n、性能基线（I14/E9.2）、序列化校验拆分、连线锚点吸附算法、错误码统一。UI 视觉公式/动效/令牌/检索/菜单/空态形态不在 HCA 口径内——即本 roadmap 的空间。

## Phase Status

| Work Item                      | 状态   | 计划 |
| ------------------------------ | ------ | ---- |
| S1 SCADA 编辑器视觉与令牌基础  | `todo` | —    |
| S2 SCADA 拖拽便捷性与 palette  | `todo` | —    |
| S3 SCADA 菜单与面板收尾        | `todo` | —    |
| D1 3D 渲染器 UX 打磨           | `todo` | —    |
| D2 3D 文档一致性与演示路由收尾 | `todo` | —    |

## Phases

| Phase                          | 状态   | Owner Doc                                                      | 依赖           | 复用                                                        | 计划 |
| ------------------------------ | ------ | -------------------------------------------------------------- | -------------- | ----------------------------------------------------------- | ---- |
| S1 SCADA 编辑器视觉与令牌基础  | `todo` | `docs/components/industrial-hmi-editor/design-architecture.md` | —              | 526 选中态令牌模式                                          | —    |
| S2 SCADA 拖拽便捷性与 palette  | `todo` | 同上 + `design-toolbox.md`                                     | S1（令牌基础） | 527 ghost 模式、526 alignment 模式                          | —    |
| S3 SCADA 菜单与面板收尾        | `todo` | 同上 + `design-property-panel.md`                              | S1             | `page-designer-context-menu` 模式、WorkbenchShell resizable | —    |
| D1 3D 渲染器 UX 打磨           | `todo` | `docs/components/threejs-integration/design-renderer.md`       | —              | 529 reduced-motion/空态模式、语义令牌                       | —    |
| D2 3D 文档一致性与演示路由收尾 | `todo` | `docs/components/threejs-integration/design.md`                | D1             | —                                                           | —    |

## Phase Details

- **S1 SCADA 编辑器视觉与令牌基础**：`interaction-overlay.ts` 覆盖物 hex → `--ind-*` 语义令牌（light/dark 双块，对齐 designer-theme 惯例）；运行态选中/hover/press 升级 ring+浅填充双层公式 + 120ms 过渡；leafer Editor EditBox 选中样式定制能力评估（theme 最小定制或包裹层视觉，产出一页裁定）；`styles.css` 选中/hover/面板反馈 transition 补齐（几何属性排除）；e2e：computed 视觉断言（对齐 flow-designer-ux-visual 口径）。
- **S2 SCADA 拖拽便捷性与 palette**：palette 拖入 ghost（527 双守卫模式）；画布 drop 落点指示（对齐 527 落点指示体系）+ drop 后自动选中；图元位移网格/对齐吸附（526 alignment 模式移植到 leafer 坐标系，吸收既有连线吸附阈值惯例）；方向键 nudge 批量单 undo entry（对齐 P2-4 纪律，仅改 UX 入口不碰 HCA10 事务语义）；palette 搜索过滤（纯函数 + 空态 + 清除）与分组折叠。
- **S3 SCADA 菜单与面板收尾**：画布右键/键盘上下文菜单（图元态：删除/复制/层级；空白态：粘贴/全选/适应画布；viewport 钳制 + Escape/外点/方向键，readOnly 收敛）；WorkbenchShell 宽度回调接线（会话内持久，对齐 528 裁决）；编辑器空态升级（图标 + 标题 + 引导 CTA）。
- **D1 3D 渲染器 UX 打磨**：`setPixelRatio(devicePixelRatio)` + 初始 aspect 修正（消除首帧错比例/HiDPI 发糊）；WebGL 不可用差异化降级（独立文案/图标，与加载失败分离）；hover 反馈完备化（高亮色可配/默认与材质解耦、MeshBasicMaterial 反馈、hoverable cursor:pointer）；canvas role/aria-label/焦点路径；灯色与 height 默认值令牌化/常量化收尾；加载骨架视觉规格对齐 529 模式；单测与 e2e 断言随项落地。
- **D2 3D 文档一致性与演示路由收尾**：`threejs-integration-analysis.md`「评审中」过时状态勘误、v2–v4 中间稿标注归档；工业适配器/重连管理器演示路由补齐（domain-route-entries + demo 页）；`__flux_three_handles` 生产暴露决策记录；深色模式/视觉回归覆盖方式按 2026-08-28 政策做一次对齐评估（结论可为一页裁定）。

## Dependency Graph

```mermaid
graph TD
    S1[S1 视觉与令牌基础] --> S2[S2 拖拽与 palette]
    S1 --> S3[S3 菜单与面板收尾]
    D1[D1 3D UX 打磨] --> D2[D2 文档与路由收尾]
```

## Cross-Cutting

- **HCA 边界纪律**：各 plan 起草前先对照 HCA work item 表把「已治理维度」写入 Non-Goals；执行中若发现交互正确性/undo 语义问题，登记后移交（不扩 scope）。
- **参照池补充**：S1/S2 开工前按需补一次 SCADA/HMI 编辑器对标调研（`~/ai` 本地池 + 必要时 WebSearch：FUXA/Ignition 形态），产出并入对应 plan 的 Current Baseline；526–529 分析报告 S1–S16 仍为主参照。
- **验证纪律**：全量门禁（typecheck/build/lint/test/check）+ 对应 e2e 家族（scada-_ / three-canvas-_）+ 新增 computed-style 程序化断言（不落截图判据）；逐 plan 提交，full-green 时标题显式标注。
- **工作区协调**：提交按文件精确 add——当前工作区存在另一会话未提交的 cron-editor 文档改动（`docs/components/index.md`/`roadmap.md`/`amis-baseline-matrix.md`/`examples.manifest.json`/`docs/backlog/cron-scheduling-roadmap.md`），本 roadmap 的 index/指针登记待该会话落盘后补做。

## Rule

- 状态机与闭环遵循 `docs/backlog/00-roadmap-authoring-guide.md`（todo → planned → done；done 前置 = closure audit 通过）。
- 每个 work item 立计划前先读 `docs/plans/00-plan-authoring-and-execution-guide.md`；同一 work item 的多能力合并且过宽才拆。
- AI 按本文件顺序取第一个 `todo` 执行，不改序、不新增工作项；结构性调整须人工确认。
