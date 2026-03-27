# 12 Flow Designer Visual Parity Canvas And Node Style Fix

## Problem

- Flow Designer 在功能可用后，仍与原型存在明显视觉差异。
- 已解决外层/内层双边框问题，但仍有以下不一致：
- 节点内部图标与文本相对位置不对（多行文本节点中图标垂直对齐不符合原型）。
- 任务节点缺少原型中的底色层次。
- Canvas 整体底色与网格线密度/颜色不符合原型观感。

## Diagnostic Method

- 诊断难点：这是“视觉不一致”问题，不是功能错误；同时样式来源分散在 schema className、设计器 utility shim、XYFlow 组件参数和重复 CSS 规则中，单点查看容易误判。
- 首轮定位：先通过 Playwright 获取真实运行时 DOM（节点 outerHTML、toolbar outerHTML）和截图，确认页面实际渲染的 className 与结构，而不是只看静态 schema。
- 假设排除 1：先排除“双边框残留”干扰，验证 outer `.fd-xyflow-node` 已结构化（透明、无边框）后，确认剩余偏差来自内层卡片与 canvas。
- 假设排除 2：检查任务节点 schema，发现仍是 `bg-white` + `items-center`，说明“缺底色”和“图标垂直位置不对”并非仅 CSS 覆盖问题，而是 schema 语义本身不一致。
- 假设排除 3：检查 `styles.css` utility shim，确认缺少 `bg-blue-50`、`border-blue-200`、`items-start`，说明即便 schema 改为目标类名，也会出现“写了不生效”的假象。
- 决定性证据：e2e 中读取 computed style，直接比对 `innerBg`、图标/标题几何位置、grid stroke；并结合运行日志中的 `NODE_HTML_START/END`，确认修复前后差异来自上述三层。

## Root Cause

- 节点 body 的 schema 仍主要使用 `bg-white` 与 `items-center`，导致任务节点缺少区分底色且图标被居中对齐。
- 设计器 utility shim 覆盖不完整，缺少 `bg-blue-50`、`border-blue-200`、`items-start` 等关键类，schema 侧即使切换类名也无法生效。
- XYFlow `Background` 仍使用默认网格参数，且样式层同时存在历史规则，视觉上与目标原型不一致。

## Fix

- 在任务节点 schema 中引入带语义的浅色背景与边框（任务节点高亮层）。
- 在 `styles.css` 增补缺失 utility shim（`items-start`、`bg-blue-50`、`border-blue-200`），并针对节点图标与多行文本组合调整对齐规则。
- 在 `DesignerXyflowCanvas.tsx` 将网格切换为 `BackgroundVariant.Lines`，并显式设置间距与颜色，统一 canvas 视觉基线。
- 在 e2e 增加任务节点背景色和图标相对位置断言，避免后续回归。

## Tests

- `tests/e2e/flow-designer-ui.spec.ts` - 验证任务节点内容布局、节点外壳/内卡片样式关系、canvas 背景与网格存在性。
- `pnpm.cmd --filter @nop-chaos/flow-designer-renderers lint` - 目标包 lint 通过。
- `pnpm.cmd test:e2e --reporter=line` - 回归确认视觉结构断言通过。

## Affected Files

- `packages/flow-designer-renderers/src/styles.css`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx`
- `apps/playground/src/schemas/workflow-designer-schema.json`
- `tests/e2e/flow-designer-ui.spec.ts`

## Notes For Future Refactors

- 设计器 JSON schema 使用 utility class 时，必须在设计器作用域内提供最小必需 shim，否则样式会“写了不生效”。
- XYFlow wrapper 应持续保持结构容器职责，视觉应由 schema 内卡片承担，防止边框/阴影重复叠加。
- Canvas 网格建议由组件参数与样式变量共同约束，避免默认配置在库升级后产生漂移。
- 视觉问题优先使用“运行时证据链”定位：DOM 快照 + computed style + 参数配置联合核对，避免只读源码导致误诊。
