# WorkbenchShell 面板拖拽调宽 + Flow Designer 宽度状态（designer:setPanelWidths）

> Plan Status: draft
> Last Reviewed: 2026-08-05
> Source: `docs/analysis/2026-08-05-page-vs-workbench-layout-analysis.md`（决策分析：不吸收进 page，能力落 WorkbenchShell；左右拖拽调宽需要且 opt-in；上下不收缩/不调高）；`docs/architecture/designer-workbench-shell.md`（Panel Resize Contract，2026-08-05 已补充）
> Related: 无既有 plan 承接该能力（首份 workbench 布局增强 plan）

## Purpose

把 Flow Designer 工作台（top toolbar + left palette + center canvas + right inspector）的左右面板从「固定宽度 + 仅可折叠」升级为「可选拖拽调宽 + 键盘等价 + 宽度状态归 family」，并把这套能力做成 WorkbenchShell 的 opt-in 共享契约，供 Flow/Report/Word 三个 family 复用。page renderer 不吸收任何 workbench 语义（见分析报告结论）。

## Current Baseline

> 截至 2026-08-05 15:40 的 live repo 核查结论（read-only）：

- **WorkbenchShell 固定宽度 grid**：`packages/flux-react/src/workbench/workbench-shell.tsx` 用 CSS grid 模板 `grid-cols-[15rem_minmax(0,1fr)_22rem]`（rail 态 2rem），无任何调宽能力；props 无 width/resize 相关字段（`WorkbenchShellProps` L5-22）。
- **单测锁定现有 DOM/响应式契约**：`packages/flux-react/src/workbench/workbench-shell.test.tsx` 4 用例断言 `left-panel-expanded/collapsed` testid、rail 整条可点展开、`max-[1023px]:grid-cols-[15rem_minmax(0,1fr)]` 等响应式类。
- **e2e 依赖宽度稳定性**：`tests/e2e/flow-designer-collapsible.spec.ts` 8 用例，`verifies canvas width changes after collapse and expand` 断言展开后 canvas 宽度 `toBe(initialWidth)`——调宽默认值必须保持 15rem/22rem 且折叠/展开语义不变。
- **三个 family 消费 WorkbenchShell**：Flow（`packages/flow-designer-renderers/src/designer-page-body.tsx:470`，折叠经 core store + `dispatch({type:'togglePalette'})`）、Report（`packages/report-designer-renderers/src/page-renderer.tsx:646`，本地 React state）、Word（`packages/word-editor-renderers/src/word-editor-page.tsx:323`，本地 state + `density="flush"`）。后两者未 opt-in 时必须零回归。
- **Flow Designer 折叠态链路（live 路径）**：`flow-designer-core/src/core/shell-state.ts`（`paletteCollapsed/inspectorCollapsed`）→ `core/shell-controls.ts`（`createShellControls`，live；`core-shell-commands.ts` 为 legacy 且被 vitest.config.ts 排除）→ `core.ts` 公开 API（`togglePalette`/`setPaletteCollapsed` L427-432，exports L642）→ renderers 命令链 `designer-command-types.ts:64`（DesignerCommand union）→ `designer-command-adapter.ts:230`（adapter case）→ `designer-action-provider.ts:106/:364`（`designer:togglePalette` action）→ `designer-manifest.ts:282`。
- **DesignerConfig 无 shell 段**：`packages/flow-designer-core/src/types.ts:68` `DesignerConfig`（palette/toolbar/shortcuts/features/rules/canvas...）无面板宽度/可调开关配置位。
- **ui 已有 resizable 封装但无消费方**：`packages/ui/src/components/ui/resizable.tsx`（react-resizable-panels 包装）仅被 ui package.json 引用，任何包代码均未使用。
- **page.asideResizable 是既有调宽先例**：`packages/flux-renderers-basic/src/page.tsx:105-169`（pointer capture + dx 反转 + min/max clamp + `role="separator"` handle）。
- **owner-doc 已立约**：`docs/architecture/designer-workbench-shell.md` 已补充 Panel Resize Contract 节（opt-in、handle 贴中心侧、键盘等价、宽度 family-owned、默认宽度不变）与 page 边界说明；`docs/analysis/2026-08-05-page-vs-workbench-layout-analysis.md` 为决策记录。
- **playground 载体**：`apps/playground/src/pages/flow-designer-page.tsx` 消费 `apps/playground/src/schemas/workflow-designer-schema.json` 等 JSON schema（内含 designer `config`），演示与 e2e 载体就绪。

## Goals

- WorkbenchShell 增加 opt-in 左右面板拖拽调宽：`leftResizable/rightResizable` + 受控宽度 props + min/max clamp + 键盘 Arrow 等价；折叠 rail、响应式抑制、既有 testid/DOM 契约零回归。
- Flow Designer 宽度状态落 core：`DesignerConfig.shell` 配置段（可调开关 + 默认宽度 + min/max）→ `shellState.paletteWidth/inspectorWidth` → snapshot 发布 → `designer:setPanelWidths` 命令/action 全链路 → designer-page 接线。
- 测试：WorkbenchShell 单测（拖拽/键盘/clamp/零回归）+ core 单测（config 默认/clamp/snapshot/事件）+ renderers action 链单测 + e2e（真机拖拽、键盘、折叠后宽度保持、collapsible spec 零回归）。
- 文档：designer-workbench-shell.md（本会话已预补，执行期核对一致）+ flow-designer design.md（config.shell 说明 + action 清单补 `designer:setPanelWidths`）+ daily log。

## Non-Goals

- **不扩展 `page` renderer**（业务页 aside 保持现状；双面板 workbench 归 WorkbenchShell——分析报告裁定）。
- **不做上下（top/bottom）收缩与调高**（分析报告裁定：chrome 不折叠；底部当前无面板）。
- **不迁移 react-resizable-panels**（拒绝的替代方案，Phase 1 Decision 记录理由）。
- **不给 Report/Word editor 接线 resize**（保持 opt-in 零回归；接入列为 follow-up）。
- **不做宽度跨会话持久化**（localStorage/schema 持久化与 collapse 状态一致保持内存态；列 follow-up）。
- **不把 shell 宽度状态并入 undo/redo 历史**（shell UI 态非文档操作）。
- **不改 WorkbenchShell 的 grid 结构**（rail/响应式类/e2e 等式断言依赖它）。

## Scope

### In Scope

- `packages/flux-react/src/workbench/workbench-shell.tsx`（+ colocated 单测）。
- `packages/flow-designer-core/src/{types.ts, core/shell-state.ts, core/shell-controls.ts, core/snapshot.ts, core.ts}`。
- `packages/flow-designer-renderers/src/{designer-command-types.ts, designer-command-adapter.ts, designer-action-provider.ts, designer-manifest.ts, designer-page-body.tsx}`。
- `apps/playground/src/schemas/workflow-designer-schema.json`（config.shell 演示开关）。
- `tests/e2e/flow-designer-resizable.spec.ts`（新）+ `tests/e2e/flow-designer-collapsible.spec.ts`（零回归验证）。
- 文档：`docs/architecture/designer-workbench-shell.md`（核对）、`docs/architecture/flow-designer/design.md`、`docs/logs/2026/08-05.md`。

### Out Of Scope

- `page` renderer 任何改动；top/bottom 布局；RRP 迁移；Report/Word 接线；跨会话持久化；undo/redo 集成（见 Non-Goals）。

## Failure Paths

| 场景                       | 触发                             | 行为                                                     | 可重试 | 用户可见表现             |
| -------------------------- | -------------------------------- | -------------------------------------------------------- | ------ | ------------------------ |
| wb-resize-collapsed-handle | 面板 collapsed（rail）           | 不渲染 handle，无拖拽入口；rail 整条可点展开（既有契约） | 否     | rail 无任何调宽暗示      |
| wb-resize-clamp            | 拖拽/键盘越过 min/max            | 宽度 clamp 到 `[minWidth, maxWidth]`，canvas 不溢出      | 是     | 面板停在边界宽度         |
| wb-resize-collapse-restore | 调宽后折叠再展开                 | 宽度取 core 持久值（不回退默认 15rem/22rem）             | 否     | 展开后面板保持调宽后宽度 |
| wb-resize-right-invert     | 右侧面板拖拽                     | dx 反转（向左拖变宽）                                    | 是     | 右侧面板按直觉变宽       |
| wb-resize-not-opt-in       | family 未配置 shell.shell.resize | 无 handle、宽度固定（WorkbenchShell 默认 false）         | 否     | 与现状完全一致（零回归） |
| wb-resize-no-shell-config  | config 无 shell 段               | 默认 240/352px（等价 15rem/22rem），可调关               | 否     | 与现状一致               |

## Test Strategy

档位选择：**必须自动化**

理由：WorkbenchShell 是共享组件（3 个 designer family 消费，改动影响面广）；designer core 公开 API + `designer:*` action 是 public contract（action manifest 会随注册变更）。因此 Proof 项（单测 + e2e）先行于 Fix 项，e2e 同时验证既有 collapsible spec 零回归。

## Execution Plan

### Phase 1 - WorkbenchShell 可调宽度能力（flux-react）

Status: planned
Targets: `packages/flux-react/src/workbench/workbench-shell.tsx`（colocated `workbench-shell.test.tsx`）

- Item Types: `Decision | Proof | Fix`

- [ ] **Decision**：调宽实现方案裁定——**保持 CSS grid + pointer handle（page.asideResizable 同构），不迁移 react-resizable-panels**。理由：(1) 现有 grid 模板同时承载 rail 宽度类、响应式抑制类、以及 e2e `canvas width toBe(initialWidth)` 等式断言，RRP 是 flex 布局，迁移需重写响应式抑制与 rail 渲染，回归面大于收益；(2) 仓库已有 page.asideResizable 成熟先例（pointer capture + dx 反转 + clamp）；(3) RRP 内建键盘调宽的收益可以等价地通过 handle `ArrowLeft/ArrowRight` 补齐。裁定写入 design.md + log。
- [ ] **Proof**（test-first）：`workbench-shell.test.tsx` 新增用例——① `leftResizable/rightResizable: true` 渲染 handle（`data-slot="workbench-resize-handle"` + `role="separator"` + `aria-orientation="vertical"` + `aria-valuenow/min/max`）；② pointer 拖拽改宽并 clamp 到 min/max；③ 右侧面板 dx 反转；④ `onLeftWidthChange/onRightWidthChange` 回调 payload 正确；⑤ handle 聚焦后 `ArrowLeft/ArrowRight` 按步长改宽（同样 clamp）；⑥ collapsed 时不渲染 handle；⑦ 缺省（不传新 props）时无 handle、grid-cols 类与既有 4 用例完全一致。
- [ ] **Fix**：`WorkbenchShellProps` 新增 `leftResizable?/rightResizable?/leftWidth?/rightWidth?/onLeftWidthChange?/onRightWidthChange?/leftMinWidth?/leftMaxWidth?/rightMinWidth?/rightMaxWidth?`（默认：width 240/352px（等价现 15rem/22rem）、min 200、max 600，与 page.aside 默认一致）；实现 handle（贴中心侧边缘：左侧面板右缘、右侧面板左缘）+ pointer 拖拽（setPointerCapture + dx 反转 + clamp）+ 键盘 Arrow 步长（建议 16px）；宽度以受控 props 为准、未传时内部 local state 起步（受控优先，参考 page.asideWidth 模式）。

Exit Criteria:

- [ ] 新增 7 组单测全绿；既有 4 用例零修改通过。
- [ ] `pnpm --filter @nop-chaos/flux-react typecheck` 通过。

### Phase 2 - Flow Designer 宽度状态与命令/action 全链路（core + renderers）

Status: planned
Targets: `packages/flow-designer-core/src/{types.ts, core/shell-state.ts, core/shell-controls.ts, core/snapshot.ts, core.ts}`；`packages/flow-designer-renderers/src/{designer-command-types.ts, designer-command-adapter.ts, designer-action-provider.ts, designer-manifest.ts}`

- Item Types: `Proof | Fix`

- [ ] **Proof**（test-first）：core 单测（core-ui-state 风格）——① 无 `config.shell` 时默认 `paletteWidth=240/inspectorWidth=352`；② 有 shell 配置时按配置初始化；③ `setPaletteWidth/setInspectorWidth` 更新 shellState + snapshot + 派发 `paletteWidthChanged/inspectorWidthChanged` 事件 + clamp min/max；④ shell 宽度不进入 undo/redo 历史。renderers 单测——adapter `setPanelWidths` 命令映射到 core API；`designer:setPanelWidths` action 注册（`designer-action-provider` 行为与 `designer:togglePalette` 同构）+ manifest 条目可发现。
- [ ] **Fix**：`types.ts` 新增 `DesignerShellConfig`（`{ palette?: { resizable?: boolean; width?: number; minWidth?: number; maxWidth?: number }; inspector?: { ... } }`）并挂 `DesignerConfig.shell?`；`core/shell-state.ts` shellState 加 `paletteWidth/inspectorWidth`（init 自 config.shell，缺省 240/352）；`core/shell-controls.ts` 加 `setPaletteWidth/setInspectorWidth`（clamp + 事件，与现有 toggle/setCollapsed 同构）；`core/snapshot.ts` snapshot 面加两字段 + 变更检测；`core.ts` 公开 API `setPaletteWidth/setInspectorWidth` + exports；`designer-command-types.ts` DesignerCommand 加 `{ type: 'setPanelWidths'; paletteWidth?: number; inspectorWidth?: number }`；`designer-command-adapter.ts` 加 case；`designer-action-provider.ts` 注册 `designer:setPanelWidths`；`designer-manifest.ts` 加条目。

Exit Criteria:

- [ ] 新增 core + renderers focused 单测全绿；既有 core-ui-state 用例零回归。
- [ ] `pnpm --filter @nop-chaos/flow-designer-core typecheck` 与 `pnpm --filter @nop-chaos/flow-designer-renderers typecheck` 通过。

### Phase 3 - designer-page 接线 + playground + e2e

Status: planned
Targets: `packages/flow-designer-renderers/src/designer-page-body.tsx`；`apps/playground/src/schemas/workflow-designer-schema.json`；`tests/e2e/flow-designer-resizable.spec.ts`（新）

- Item Types: `Fix | Proof`

- [ ] **Fix**：`designer-page-body.tsx`——从 `statusSnapshot.paletteWidth/inspectorWidth` 读宽度、从 `config.shell` 读 resizable 标志与 min/max，透传 WorkbenchShell 新 props；`onLeftWidthChange/onRightWidthChange` → `dispatch({ type: 'setPanelWidths', ... })`；collapsed 时 WorkbenchShell 自身不渲染 handle（Phase 1 已保证）。
- [ ] **Fix**：`workflow-designer-schema.json` 的 designer `config` 增加 `shell` 段开启 palette/inspector 可调（默认宽度不变），作为演示与 e2e 载体。
- [ ] **Proof**：e2e 新 spec `flow-designer-resizable.spec.ts`（程序化断言，沿用 collapsible spec 的 DOM 测法）——① 拖拽 palette handle（`page.mouse` drag）→ canvas 宽度变化且 palette 宽度 clamp；② 键盘聚焦 handle + `ArrowLeft/ArrowRight` → 宽度变化；③ 调宽 → 折叠 → 展开 → 宽度保持 core 持久值；④ 右侧 handle dx 反转行为。并全量重跑 `flow-designer-collapsible.spec.ts` 8/8 零回归（含 `toBe(initialWidth)` 等式断言）。

Exit Criteria:

- [ ] `flow-designer-resizable.spec.ts` 新用例全绿；`flow-designer-collapsible.spec.ts` 8/8 零回归。

### Phase 4 - 文档同步

Status: planned
Targets: `docs/architecture/designer-workbench-shell.md`；`docs/architecture/flow-designer/design.md`；`docs/logs/2026/08-05.md`

- Item Types: `Fix`

- [ ] **Fix**：核对 `docs/architecture/designer-workbench-shell.md` Panel Resize Contract 与 live 实现一致（handle 位置、键盘等价、宽度 family-owned、默认宽度不变、collapsed 无 handle）。
- [ ] **Fix**：`docs/architecture/flow-designer/design.md`——§5 DesignerPageSchema/DesignerConfig 补充 `shell` 段说明；§10 action 清单补 `designer:setPanelWidths`。
- [ ] **Fix**：`docs/logs/2026/08-05.md` 追加本 plan 执行记录（含零回归验证）。

Exit Criteria:

- [ ] 两份架构文档与 live 代码一致（抽查：shell-state/snapshot 字段、action 清单、WorkbenchShell props 均可在仓库中找到对应实现）。

## Draft Review Record

> 待独立子 agent（fresh session）review 后填写；零 Blocker/Major 方可 `draft → active`。

- Reviewer / Agent: (pending)
- Verdict: (pending)
- Rounds: (pending)
- Findings addressed: (pending)

## Closure Gates

> 所有 Phase Exit Criteria + 本 section 全部勾选后，且经独立子 agent closure-audit pass，才能标记 `completed`。

- [ ] WorkbenchShell 调宽能力（含键盘等价、clamp、collapsed 无 handle）已落地且单测覆盖
- [ ] designer:setPanelWidths 命令/action 全链路落地（core shellState/snapshot/事件 + adapter + action + manifest）
- [ ] designer-page 接线 + playground 演示 + e2e 全绿；flow-designer-collapsible.spec.ts 8/8 零回归
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs（designer-workbench-shell.md、flow-designer design.md）已同步到 live baseline
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### react-resizable-panels 迁移

- Classification: `optimization candidate`
- Why Not Blocking Closure: 现有 grid + pointer handle 方案已覆盖能力需求（拖拽 + 键盘 + clamp + 受控状态），且保留 rail/响应式/e2e 契约；RRP 仅在未来出现多面板复杂比例布局时才有迁移价值。
- Successor Required: `no`
- Successor Path: 无

### Report / Word Editor 接线 resize

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: shell 能力为 opt-in，未接线 family 保持现状零回归；是否接线属于各 family 的产品决策，非共享契约缺口。
- Successor Required: `no`
- Successor Path: 各自 family plan 或 follow-up 低成本接入

### 宽度跨会话持久化

- Classification: `optimization candidate`
- Why Not Blocking Closure: 与折叠态一致保持内存态（core shellState）；宿主如需跨会话记忆可自行扩展（schema 或 localStorage），不属于共享 shell 契约义务。
- Successor Required: `no`
- Successor Path: 无

## Non-Blocking Follow-ups

- Word/Report editor 可后续 opt-in 开启调宽（各 family 决策）。
- 若第三个 consumer 出现"面板尺寸记忆"需求，评估统一持久化机制。

## Closure

Status Note: (待执行与独立 closure-audit 后填写)

Closure Audit Evidence:

- Auditor / Agent: (pending)
- Evidence: (pending)

Follow-up:

- (pending)
