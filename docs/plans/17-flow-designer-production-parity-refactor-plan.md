# 17 - Flow Designer 生产可用性与 Flow Editor 对齐重构计划

## 1. 问题定义与目标

当前 `flow-designer2` 的 Flow Designer 已具备基础能力，但整体仍偏 demo 化：交互链路不完整、布局可用性不足、与 `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master` 中 Flow Editor 的关键体验存在差距，无法支撑“完整业务编辑器”定位。

本计划目标是把 Flow Designer 从“可展示”提升到“可业务落地”：

- 对齐核心交互：网格开关、JSON 操作入口、拖拽落点建节点、编辑器主流程。
- 对齐页面布局：`palette / canvas / props` 三段全高充满；左右面板可收缩展开；中间 canvas 获得最大编辑空间。
- 对齐工具栏语义：`return to home` 进入统一操作按钮区，不再悬浮散落。
- 以 `flow-designer-renderers + schema 配置` 为中心实现，避免回退到页面硬编码。

---

## 2. 现状深入差距分析（基于代码与参考实现）

## 2.1 已具备但未完整落地的能力

- 已具备 `xyflow` 画布、`MiniMap / Controls / Background`、hover toolbar、双击事件入口、undo/redo/save/restore/export、grid 状态、palette 分组、schema 驱动 toolbar。
- 但多项能力存在“配置在、行为未闭环”或“交互触发点不一致”问题。

## 2.2 与目标 Flow Editor 的关键差距

### A. 网格开关与画布行为一致性不足

- 现状：工具栏有 `designer:toggle-grid`，core 有 `gridEnabled`，但 xyflow 画布始终渲染 `<Background .../>`，且未与 `gridEnabled` 严格联动。
- 影响：用户感知“开关网格”不可靠，和参考 Flow Editor（关闭时不显示背景栅格）不一致。

### B. JSON 按钮语义不清晰（导出存在，但不是明确“JSON”入口）

- 现状：toolbar schema 中按钮文案为“导出”，action 为 `designer:export`；参考实现明确有 `JSON` 按钮（`FileJson`）。
- 影响：业务用户不易识别“JSON 入口”，不符合迁移认知模型。

### C. Palette 拖拽落点建节点链路未完整打通

- 现状：
  - `DesignerPaletteContent` 仅 click-add，未 `draggable + onDragStart`；
  - `DesignerXyflowCanvas` 支持 `onDrop` 回调；
  - 但 `DesignerCanvasContent` 未传递 `onDrop`；
  - 且 drop 位置采用容器像素差值，未走 flow 坐标变换。
- 影响：无法稳定实现“从左侧拖到右侧，鼠标松开处建节点”的核心编辑路径。

### D. 三栏布局虽存在，但“充满页面 + 可收缩”不完整

- 现状：`fd-page__content` 为固定三栏宽度，左右不可收缩；页面高度策略仍偏“组件内部自适应”而非“编辑器全屏工作区优先”。
- 澄清：playground 容器层已有 `height: 100vh`，问题核心不是“无法全屏”，而是左右面板不可收缩导致 canvas 可用空间不足。
- 影响：大流程编辑时 canvas 空间不足，无法匹配生产编辑器体验。

### E. Return to Home 按钮布局不统一

- 现状：`FlowDesignerPage.tsx` 仍有独立浮动 `Back to Home` 按钮；designer toolbar 有 `back` 类型但尚未接入统一导航 action。
- 影响：操作入口分裂，视觉与交互层级混乱。

### F. 架构层面的根因

- 部分能力分散在“旧 playground 示例组件 + 新 renderer schema”两条路径；
- schema 声明、core 状态、xyflow 事件桥接三者未完全闭环；
- 页面级导航行为与 designer action namespace 还未统一。

### G. shortcuts 当前状态（结论）

- 结论：**在当前主路径（`designer-page` + `flow-designer-renderers`）中 shortcuts 还未生效**。
- 证据：
  - `workflow-designer-schema.json` 已声明 `shortcuts` 与 `features.shortcuts`；
  - 但 `packages/flow-designer-renderers/src` 中没有键盘事件绑定与映射执行链路；
  - 现有 `keydown` 逻辑主要在历史示例 `apps/playground/src/FlowDesignerExample.tsx`，不属于当前主展示路径。
- 影响：配置层有声明，但运行时未消费，属于“配置存在、行为未接线”。
- 文档一致性风险：`docs/architecture/flow-designer/design.md`、`api.md` 仍把 `designer-page.shortcuts` 描述为已接线能力；本计划落地时需同步修正文档现状描述，或在实现完成后再回填为“已落地”。

---

## 3. 重构原则

1. **Renderer-first**：优先在 `packages/flow-designer-renderers` 修正通用能力，避免把行为硬编码回 `apps/playground`。
2. **Schema-driven**：工具栏、面板收缩状态、按钮显隐优先可配置。
3. **最小入侵**：优先补齐桥接与布局骨架，不改动无关业务逻辑。
4. **可验证**：每一阶段都可通过现有测试/E2E 验证，避免一次性大改。

---

## 4. 目标态（完成后用户可感知结果）

- 左侧 palette 可拖拽节点到 canvas，松手即在落点生成节点（flow 坐标准确）。
- 网格开关行为与画布背景显示严格一致。
- 工具栏中有清晰 `JSON` 按钮（可导出/查看 JSON，至少先统一为导出语义入口）。
- 布局为全高三段：左 palette、中 canvas、右 props；左右均可收缩，canvas 自适应扩展。
- `return to home` 进入工具栏操作区（统一交互层级），移除页面浮动返回按钮。

---

## 5. 分阶段实施计划（Workplan）

- [ ] **Phase 0 - 基线与对齐清单冻结**
  - [ ] 固化本次 parity 验收项（网格、JSON、拖拽落点、三栏收缩、返回按钮统一）。
  - [ ] 确认以 `designer-page` 路径为唯一主实现，`FlowDesignerExample` 仅保留历史参考角色。
  - [ ] 标注 architecture 文档中 shortcuts 现状描述偏差（避免“文档已完成、代码未完成”的误判）。

- [ ] **Phase 1 - 拖拽落点建节点闭环**
  - [ ] `designer-palette.tsx`：为节点项补充 `draggable`、`onDragStart`，使用 `DESIGNER_PALETTE_NODE_MIME`。
  - [ ] `designer-canvas.tsx`：向 `DesignerXyflowCanvas` 传递 `onDrop`，dispatch `addNode`。
  - [ ] `DesignerXyflowCanvas.tsx`：使用 flow 坐标转换（`screenToFlowPosition`）计算落点，替换容器像素差值方案。
  - [ ] 保留 click-add 作为辅助路径，不影响主拖拽路径。

- [ ] **Phase 2 - 网格开关与画布背景一致性**
  - [ ] `DesignerXyflowCanvas.tsx`：背景渲染受 `snapshot.gridEnabled` 控制（关闭即不渲染网格背景）。
  - [ ] 统一 `gridSize / variant` 读取策略（优先 `config.canvas`，缺省回退）。
  - [ ] 补充对应测试：toggle-grid 后背景显隐状态可验证。

- [ ] **Phase 3 - 工具栏能力对齐（JSON + Back）**
  - [ ] 在 schema 将“导出”按钮语义调整为 `JSON`（文本/图标与参考编辑器认知一致）。
  - [ ] 扩展 `designer-toolbar.tsx` 的 `back` item：支持触发命名空间 action（如 `designer:navigate-back` 或 schema action）。
  - [ ] `FlowDesignerPage.tsx` 移除浮动 Back 按钮，仅通过 toolbar 提供返回入口。
  - [ ] 确保 dirty 状态下返回行为可接入 leave guard（先保留 confirm 基线）。

- [ ] **Phase 4 - 三栏全高与左右收缩布局**
  - [ ] `flow-designer.css`：将 page/content/canvas 高度策略改为“编辑器工作区全高”。
  - [ ] 新增左右面板收缩状态（paletteCollapsed / inspectorCollapsed），并提供 UI 触发器。
  - [ ] 收缩后 canvas 区域自动扩展，移动端保持现有降级策略。
  - [ ] 确保 `palette/canvas/props` 三部分在常规桌面视口下均充满可用高度。

- [ ] **Phase 5 - 统一交互与文档收口**
  - [ ] 补齐 shortcuts 运行时接线（读取 config.shortcuts 并映射 undo/redo/copy/paste/delete/save）。
  - [ ] 回归验证：拖拽建点、网格切换、JSON 按钮、返回按钮、左右收缩、shortcuts 联动。
  - [ ] 更新架构文档（至少 `docs/architecture/flow-designer/design.md`、`api.md`、`collaboration.md` 对应章节），确保“现状/目标态”描述与代码一致。
  - [ ] 更新 e2e 用例覆盖新增关键行为。

---

## 6. 关键改造点与代码落点

- `packages/flow-designer-renderers/src/designer-palette.tsx`
  - Palette item drag source 规范化。
- `packages/flow-designer-renderers/src/designer-canvas.tsx`
  - drop command bridge、layout state（收缩态）中枢。
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx`
  - drop 坐标转换、grid 背景显隐、canvas 交互一致性。
- `packages/flow-designer-renderers/src/designer-toolbar.tsx`
  - back/json 按钮语义与 action 支持。
- `packages/flow-designer-renderers/src/styles/flow-designer.css`
  - 全高三栏 + 收缩展开样式。
- `apps/playground/src/pages/FlowDesignerPage.tsx`
  - 移除浮动返回按钮，回归 schema toolbar。
- `apps/playground/src/schemas/workflow-designer-schema.json`
  - toolbar 按钮文案/动作、可选布局配置、功能开关对齐。

---

## 7. 验收标准（Definition of Done）

- [ ] 从 palette 拖拽任意节点到 canvas，松手位置创建节点，位置误差可接受（flow 坐标系）。
- [ ] 点击网格开关后，网格背景显示/隐藏与状态一致。
- [ ] 工具栏存在明确 `JSON` 按钮，行为可用。
- [ ] 页面不再有独立浮动 `Back to Home`；返回操作位于工具栏区。
- [ ] 桌面端左/右面板可收缩展开；收缩后 canvas 明显扩展；三段全高。
- [ ] shortcuts（undo/redo/copy/paste/delete/save）在主路径可用并通过自动化测试验证。
- [ ] 相关类型检查、构建、lint、测试通过（至少覆盖改动包与 playground e2e）。

---

## 8. 测试与验证计划

- 自动化（必须新增 + 全量通过）：
  - 新增自动化测试（至少）：
    - [ ] shortcuts: Ctrl/Cmd+Z、Ctrl/Cmd+Y(或 Shift+Z)、Delete/Backspace、Ctrl/Cmd+S
    - [ ] drag/drop: palette 拖拽到 canvas 落点创建节点
    - [ ] toolbar: JSON 按钮可用、Back 按钮位于统一操作区并可触发返回流程
    - [ ] layout: 左右面板收缩/展开后 canvas 空间变化
  - 通过门禁（必须全部成功）：
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm test:e2e`（重点 flow-designer 场景）
- 规则：上述自动化测试任一失败即不通过，不进入“完成”状态。
- 手工验收：
  - 拖拽落点建节点（多缩放级别下）
  - grid 开关 + minimap/controls 共存
  - toolbar back/json 操作路径
  - 左右折叠状态切换与响应式断点行为

---

## 9. 风险与缓解

- **风险 1：drop 坐标偏移**（受 zoom/pan/容器 offset 影响）  
  缓解：统一使用 xyflow 官方坐标转换 API，禁止手工像素换算。

- **风险 2：布局改造引发样式回归**  
  缓解：仅改造 `fd-page` 相关骨架层；保留现有节点/边视觉 token。

- **风险 3：back 按钮接入 action 后行为冲突**  
  缓解：先实现默认回退行为，再通过 schema action 覆盖；保留兼容兜底。

- **风险 4：历史示例路径与新路径并存导致认知混乱**  
  缓解：在 playground 页面层明确 `designer-page` 为唯一主入口，旧示例降级为开发参考。

---

## 10. 非目标（本轮不做）

- 完整复制 legacy list page 全 CRUD 后台能力。
- 引入新的后端持久化协议。
- 大规模重写节点视觉体系（本轮以功能与布局可用性优先）。

