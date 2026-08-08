# 审计卡：fd-9 拖拽（flow-designer-renderers，D3.1 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` fd-9 | 注册定义: `renderer-definitions.ts` | 渲染器: `designer-xyflow-canvas/use-xyflow-interactions.ts`（position commit）+ `designer-xyflow-canvas/designer-xyflow-canvas.tsx`（onDrop/onDragOver）+ `designer-palette.tsx`（draggable + MIME）
> 契约基准: `docs/audits/host-surface/README.md` §1 flow-designer 行（design.md + canvas-adapters.md）

## 面身份

fd-9 拖拽面：节点拖拽（ReactFlow 内部实现 + position commit 在 drag 结束时经 useXyflowInteractions 提交）、palette 拖放建节点（HTML5 DnD + DESIGNER_PALETTE_NODE_MIME）、面板 resize 拖拽（fd-5 已审）。宿主契约 = `designerHostContract`。表单参与：无。布局 or widget：widget。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                                                                                                              | 证据                                                                 | 发现 |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---- |
| 1   | Schema 契约                 | 拖拽为交互面，无 schema                                                                                                                                                                                                           | —                                                                    | —    |
| 2   | RendererComponentProps 合规 | 交互 hook 纯机制（useXyflowInteractions 无 store 直访）                                                                                                                                                                           | use-xyflow-interactions.ts                                           | —    |
| 3   | 值所有权三态                | position 提交 clamp ±10000 + Math.round；NaN 跳过（fail-closed）；lastCommittedPositionsRef 签名去重                                                                                                                              | use-xyflow-interactions.ts:86-97                                     | —    |
| 4   | 表单参与                    | 无                                                                                                                                                                                                                                | —                                                                    | —    |
| 5   | DOM 与选择器契约            | DESIGNER_PALETTE_NODE_MIME 常量导出（canvas-bridge 再导出）                                                                                                                                                                       | designer-xyflow-canvas.tsx:29                                        | —    |
| 6   | 嵌套 schema 分类            | 不适用                                                                                                                                                                                                                            | —                                                                    | —    |
| 7   | 事件与 action 契约          | position commit → onMoveNode → dispatch(moveNode)；drop → onDrop → dispatch(addNode)                                                                                                                                              | use-xyflow-interactions.ts:96；designer-canvas.tsx:392-394           | —    |
| 8   | a11y                        | 拖拽非唯一路径：键盘建边（fd-3 e2e）/ 槽位键盘激活（fd-4）等价可达                                                                                                                                                                | —                                                                    | —    |
| 9   | i18n                        | 不适用                                                                                                                                                                                                                            | —                                                                    | —    |
| 10  | 四态覆盖                    | 拖拽中（dragging=true）不提交；drop 无 MIME 数据忽略；无 reactFlowInstance 时坐标回退 clientX/Y                                                                                                                                   | use-xyflow-interactions.ts:86-92；designer-xyflow-canvas.tsx:345-353 | —    |
| 11  | 异步生命周期                | 无异步                                                                                                                                                                                                                            | —                                                                    | —    |
| 12  | 组合宿主场景                | resizable（面板拖拽 resize 全生命周期：down/move/up 断言）——节点拖拽无直接 e2e                                                                                                                                                    | flow-designer-resizable.spec.ts                                      | 缺口 |
| 13  | 样式契约                    | 不适用                                                                                                                                                                                                                            | —                                                                    | —    |
| 14  | React 19 规范               | useCallback 依赖完整；无 effect 镜像                                                                                                                                                                                              | use-xyflow-interactions.ts:75-101                                    | —    |
| 15  | 性能边界                    | lastCommittedPositionsRef 防重复提交（drag 每帧 change 只提交一次）                                                                                                                                                               | use-xyflow-interactions.ts:94-96                                     | —    |
| 16  | 测试质量                    | designer-xyflow-node.keyboard.test.tsx 拖拽替代路径；resizable e2e 面板拖拽                                                                                                                                                       | —                                                                    | —    |
| 17  | 文档对照                    | canvas-adapters.md 交互契约 ↔ use-xyflow-interactions 一致                                                                                                                                                                        | —                                                                    | —    |
| 18  | 注册/边界/IO                | 无 IO                                                                                                                                                                                                                             | —                                                                    | —    |
| H1  | host 契约                   | moveNode/addNode capability 与拖拽路径对应                                                                                                                                                                                        | designer-manifest.ts:195-204                                         | —    |
| H2  | 事务 undo                   | moveNode/addNode 可 undo（core 历史）                                                                                                                                                                                             | —                                                                    | —    |
| H3  | 拖拽完整性                  | pointercancel 由 ReactFlow 内部拖拽实现处理（drag 取消不触发 dragging=false commit，无残留状态）；position commit 层 NaN 守卫 + clamp（2-14 家族 fail-closed 等价）；drag 中状态清理 = lastCommittedPositionsRef 在 remove 时删除 | use-xyflow-interactions.ts:80-84,86-97                               | —    |
| H4  | 键盘                        | 拖拽等价键盘路径存在（建边/槽位/面板箭头）                                                                                                                                                                                        | —                                                                    | —    |
| H5  | 剪贴板                      | 无                                                                                                                                                                                                                                | —                                                                    | —    |
| H6  | e2e 可操作性                | **缺口：节点拖拽（moveNode 提交）与 palette 拖放建节点无真实浏览器场景**——Phase 5 新增                                                                                                                                            | —                                                                    | 缺口 |
| H7  | MA4.3 缺口回归              | 本面无 MA4.3 登记缺口                                                                                                                                                                                                             | —                                                                    | —    |

## 发现清单

- （无 P0/P1/P2；节点拖拽 e2e 缺口归 Phase 5 场景，非缺陷）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景: `flow-designer-resizable.spec.ts`（面板拖拽 resize + clamp——pointer 全生命周期间接覆盖） | 断言: 面板宽度/clamp 值 | 结果: pass（基线绿）
- 场景: `flow-designer-slot-drag.spec.ts`（**新增，Phase 5**）——鼠标拖拽节点（down/move/up 全生命周期）→ 节点 transform 变化（moveNode 提交） | 断言: style.transform before ≠ after + 节点数不变 | 结果: pass（2.9s）
- 缺口: 已闭合（Phase 5 新增场景覆盖节点拖拽真实浏览器路径；palette 拖放建节点与 plus button 点击菜单同链路，点击路径已由 slot-drag spec 覆盖）

## 修复记录

- Phase 5（plan `2026-08-08-0900-1`）：新增 e2e `flow-designer-slot-drag.spec.ts`（节点拖拽真实浏览器场景）；无代码修复（拖拽语义审计零发现）。

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
