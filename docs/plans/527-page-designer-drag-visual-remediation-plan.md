# 527 Page Designer 拖拽反馈与视觉一致性修正计划

> Plan Status: active
> Last Reviewed: 2026-10-05
> Source: docs/analysis/2026-10-05-designer-ai-ux-comparative-analysis.md（§3.1 / §4.2 page-designer 差距矩阵）
> Related: docs/plans/526-flow-designer-drag-visual-remediation-plan.md 等 528/529

## Purpose

收口 page-designer 与业界标准之间已确认的 UI/UX 差距：拖拽 ghost 预览、overlay 过渡动效、色彩令牌收敛、右键菜单、元素级复制/粘贴快捷键、文本图标 lucide 化、空状态升级。对齐"美观性 + 拖拽便捷性"。

## Current Baseline

- page-designer 为全自研画布（无画布库）：SchemaRenderer 运行时 + 自建 overlay（`packages/page-designer-renderers/src/canvas-bridge.tsx`、`canvas-overlay.tsx`）。
- 落点指示体系已完整：inside 2px 虚线+8% accent 底（`canvas-overlay.tsx:270-271`）、before/after 4px accent 插入线（:275-291）、invalid 红虚线（:185-196）、根回退插入线+胶囊标签（:232-262）、空容器占位盒（:197-231）。落点视觉断言在单测 `canvas-overlay.test.tsx:108-190`（e2e 无落点视觉断言，mvp spec 仅 drag→insert 计数/undo/预览锚点/占位盒）。
- core 命令面：`insertNode/removeNode/moveNode/updateProps/replaceRegion/importDocument`（`packages/page-designer-core/src/commands.ts:63-236`）；无独立 duplicate 命令，duplicate 由 `page-designer-page.tsx:235-256` 以 insertNode+clone 组合实现。
- 组件态：`mode: 'edit' | 'preview'`（`page-designer-page.tsx:344-352`），无 readOnly prop。
- **已确认差距（评审修订后）**：
  1. 无 drag preview——`palette-panel.tsx:48-52` dragstart 仅 setData+effectAllowed。
  2. overlay 全内联 style 无 transition（`canvas-overlay.tsx:113-121,183-308`）；且 rAF tick 每帧无条件重设几何盒（`canvas-overlay.tsx:141-155`）——过渡只可施加于外观属性（opacity/border-color/background/outline-color），不可施加于几何属性（追帧拖影）。
  3. hex 回退值重复：`#6366f1` 全包 14 处（canvas-overlay 11 + palette-panel:47 + structure-tree:89 + json-source-view:78）；另 inspector-panel/data-binding-panel/actions-editor/template-gallery 等有零散 hex 回退（#ef4444/#6b7280 等）。均为 `var(--x, <hex>)` 兜底形态。
  4. 无右键菜单；键盘分支仅 undo/redo/方向键/Delete+Backspace（`page-designer-page.tsx:258-295`），无元素级 copy/paste。
  5. 文本图标 "←"（`page-designer-page.tsx:307`）。（"●" 属 flow designer-node-card.tsx:109，评审移交给 plan 526。）
  6. 画布空态纯文字虚线框（`page-designer-page.tsx:434-443`，data-testid=page-designer-canvas-empty）。
- 依赖注意：`lucide-react` 不是 page-designer-renderers 的 dependencies（flow-designer-renderers/package.json:41 有直接声明先例），图标化需补依赖声明。
- `@nop-chaos/ui` 已导出 ContextMenu/DropdownMenu（`packages/ui/src/index.ts:18,23`），ContextMenu 为右键菜单自然选型（spreadsheet-grid.tsx:336 有仓内用例）。
- palette-panel.test.tsx:118-122 的 dataTransfer mock 仅含 `{setData, effectAllowed}`——ghost 的 `setDragImage` 调用需 feature-detect 守卫，否则该既有单测 TypeError 回归。
- e2e 基线：page-designer-mvp / page-designer-s3-s4 spec 存在（s3-s4 含键盘漫游断言 :133-153）。

## Goals

- 从 palette 拖起组件即有自定义 drag image（组件名 + 类型色块），拖拽全程视觉连续，且不干扰 elementsFromPoint 命中链。
- overlay 外观属性（选中/hover/插入线/invalid/占位的颜色与透明度）带 120ms transition（几何属性不过渡）。
- 画布层（canvas-overlay/palette-panel/structure-tree）hex 兜底收敛到语义令牌。
- 右键菜单（删除/复制副本/粘贴）与 Ctrl+C/Ctrl+V/Ctrl+D 元素级剪贴板（内部 clipboard + undo 事务）。
- "←" lucide 化；空态升级为图标+标题+引导文案卡片。

## Non-Goals

- 框选/多选（见 Deferred）
- 面板宽度调节（page-designer 未接 WorkbenchShell；Figma 等标杆亦为固定宽；见 Deferred）
- 画布缩放/平移/minimap（自研画布架构级改造，见 Deferred）
- 属性面板（Inspector）字段级 UX 改造
- 包内其余文件（inspector-panel/data-binding-panel/actions-editor/template-gallery/json-source-view）的 hex 清理——见 Non-Blocking Follow-ups

## Scope

### In Scope

- `packages/page-designer-renderers/src/canvas-overlay.tsx`（transition、令牌化）
- `packages/page-designer-renderers/src/canvas-bridge.tsx`（drag ghost 接线）
- `packages/page-designer-renderers/src/palette-panel.tsx`（dragstart ghost、hex 清理）
- `packages/page-designer-renderers/src/structure-tree.tsx`（hex 清理）
- `packages/page-designer-renderers/src/page-designer-page.tsx`（快捷键、右键菜单、← 图标、空态）
- `packages/page-designer-renderers/package.json`（lucide-react 依赖声明）
- `packages/page-designer-renderers/src/canvas-overlay.test.tsx`、`palette-panel.test.tsx`（mock 扩展与回归）
- i18n 键（page-designer 既有 i18n 前缀家族）
- e2e（page-designer-mvp/s3-s4 扩展）

### Out Of Scope

- page-designer-core 命令语义扩展（copy/paste 用既有 insertNode/removeNode 组合，同 duplicate 先例）
- 移动端/触屏适配
- `apps/playground` demo 页面重构

## Failure Paths

| 编号                 | 触发                         | 行为                           | 可重试 | 用户可见表现 |
| -------------------- | ---------------------------- | ------------------------------ | ------ | ------------ |
| paste-no-clipboard   | Ctrl+V 时内部剪贴板为空      | 忽略                           | 是     | 无           |
| paste-target-invalid | 粘贴目标容器不接受该组件类型 | 事务拒绝 + 既有失败 toast 通道 | 是     | toast 提示   |
| cmd-fail             | 右键菜单命令派发失败         | 走既有失败 toast               | 是     | toast 提示   |

## Test Strategy

档位选择：`建议有测`。
剪贴板（copy/paste/duplicate 的事务与 id 重生成）为纯逻辑，单元测试覆盖；ghost/动效/右键菜单/图标用 e2e 程序化断言（data-testid、computed transition、菜单交互）。

## Execution Plan

### Phase 1 - 拖拽 ghost 与动效令牌

Status: planned
Targets: `palette-panel.tsx`, `canvas-bridge.tsx`, `canvas-overlay.tsx`, `structure-tree.tsx`, `palette-panel.test.tsx`

- Item Types: `Fix | Proof`

- [ ] Fix: palette dragstart 构造 ghost 元素并 `setDragImage`——ghost 须已在 DOM（视口外 fixed 定位）、`pointer-events:none`（避免干扰 `canvas-bridge.tsx:96-112` elementsFromPoint 命中链）、dragend 移除；对 `setDragImage` 做 feature-detect 守卫（宿主/测试 mock 缺失时降级浏览器默认截图），并同步扩展 palette-panel.test.tsx 的 dataTransfer mock + 新增 ghost 守卫断言
- [ ] Fix: canvas-overlay 选中/hover/插入线/invalid/占位元素的外观属性（opacity/border-color/background/outline-color）加 `transition: 120ms ease`；几何属性（left/top/width/height）明确不过渡（rAF tick 每帧重设几何，过渡几何会产生追帧拖影）
- [ ] Fix: canvas-overlay/palette-panel/structure-tree 内 `var(--x, <hex>)` 的 hex 兜底收敛到语义令牌（`hsl(var(--primary))` 系或既有 `--nop-*` 语义面）；json-source-view 及 inspector 系面板文件不在本 Phase（见 Follow-ups）
- [ ] Proof: e2e 断言 dragstart 后存在 ghost 视觉（data-testid 标记）；overlay 元素 computed transition 非 none（外观属性）；grep 确认 In Scope 三文件无 `#6366f1` 类 hex 兜底残留

Exit Criteria:

- [ ] ghost + 外观过渡 + In Scope 文件令牌化落地，分析报告 §4.2 差距 1/2 关闭（差距 3 部分：In Scope 文件内清零）
- [ ] `canvas-overlay.test.tsx` 既有落点断言（inside/before/after/invalid，:108-190）不回归；page-designer-mvp 的 drag→insert/占位盒断言不回归
- [ ] focused e2e 通过

### Phase 2 - 快捷键与右键菜单

Status: planned
Targets: `page-designer-page.tsx`（新增 `designer-context-menu.tsx` 组件如需拆分）

- Item Types: `Fix | Proof`

- [ ] Fix: 元素级剪贴板——Ctrl+C 复制选中元素 schema（深拷贝 + id 清空策略与既有 duplicate 组合一致）、Ctrl+V 粘贴到当前选中容器/插入位（走 insertNode）、Ctrl+D duplicate；全部入 undo 事务；输入态豁免；mode='preview' 不响应
- [ ] Fix: 画布元素右键菜单（`@nop-chaos/ui` ContextMenu：删除 / 复制副本 / 粘贴到此处），viewport 钳制 + Escape/外点关闭；mode='preview' 不出现变更项
- [ ] Proof: 剪贴板纯逻辑单测（复制深拷贝独立性、粘贴 id 重生成、事务可撤销）；e2e 断言 Ctrl+C/V/D 后节点数与 undo 栈行为、右键菜单交互

Exit Criteria:

- [ ] copy/paste/duplicate 快捷键 + 右键菜单落地，§4.2 差距 4 关闭
- [ ] 剪贴板单测通过；page-designer-s3-s4（方向键导航）不回归
- [ ] i18n 新键落位并通过 check

### Phase 3 - 图标与空态

Status: planned
Targets: `page-designer-page.tsx`, `package.json`

- Item Types: `Fix | Proof`

- [ ] Fix: `package.json` 补 `lucide-react` 依赖声明（对齐 flow-designer-renderers 先例）；文本 "←"（`page-designer-page.tsx:307`）替换 lucide ArrowLeft；grep 确认 page-designer-renderers 无遗留文本箭头图标
- [ ] Fix: 画布空态从纯文字虚线框升级为 图标 + 标题 + 引导文案 + 「从左侧添加组件」提示的居中卡片，样式走语义令牌，保留 data-testid=page-designer-canvas-empty
- [ ] Proof: e2e 断言空态结构（data-testid + 图标渲染）

Exit Criteria:

- [ ] 图标与空态落地，§4.2 差距 5/6 关闭（"●" 项归 526，见其 Phase 1）
- [ ] focused e2e 通过；既有 spec 不回归

## Draft Review Record

- Reviewer / Agent: 独立子 agent（round 1，task agent_61259660 verdict fail 0B/3M；task agent_01d24955 round 2: pass（minor：rAF tick 归属已就地修正为 canvas-overlay.tsx:141-155））
- Verdict: pass-with-minors（round 2 复核通过，零 Blocker/Major）
- Rounds: 2
- Findings addressed: M1 "●" 声称不实 → 移交 plan 526，本 plan 仅 "←"；M2 落点断言位置 → Exit 指向 canvas-overlay.test.tsx 单测 + mvp drag→insert/占位盒断言；M3 hex 清理范围 → 收窄为 In Scope 三文件并在 Follow-ups 记录其余文件；minor：ghost DOM/pointer-events/setDragImage 守卫 + mock 扩展、lucide-react 依赖声明、transition 限外观属性、ContextMenu 点名、readOnly→mode 语义、baseline 命令名修正

## Closure Gates

- [ ] 所有 in-scope confirmed live UX gaps 已修复（§4.2 差距 1-6 逐条对账；差距 5 的 "●" 部分由 plan 526 承接并交叉引用）
- [ ] 行为结果已达成（Goals 逐条可观测）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [ ] 受影响 owner docs 已同步（page-designer 相关 owner 文档交互节，如涉及）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 框选/多选

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: flow 布局页面搭建场景业界以单选 + 结构树为主；多选需选择模型、批量事务、对齐批量命令面，属架构级增量
- Successor Required: `no`（需求出现时新开 plan）

### 面板宽度调节

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Figma 等标杆侧栏为固定宽；page-designer 未接 WorkbenchShell，接 resizable 属外壳架构改造非 UX 缺口
- Successor Required: `no`

### 画布缩放/平移/minimap

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 自研文档流画布（非自由画布），缩放属架构演进；当前画布尺寸随视口自适应无溢出痛点
- Successor Required: `no`

## Non-Blocking Follow-ups

- 包内其余面板文件（inspector-panel/data-binding-panel/actions-editor/template-gallery/json-source-view）的 hex 兜底清理
- palette 条目 hover 预览浮层
- 空容器占位动效（脉冲）

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent>>
- Evidence: <<daily log / 命令输出>>

Follow-up:

- <<见 Non-Blocking Follow-ups>>
