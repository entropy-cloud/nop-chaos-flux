# 审计卡：fd-12 缩放平移（flow-designer-renderers，D3.1 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` fd-12 | 注册定义: `renderer-definitions.ts` | 渲染器: `designer-xyflow-canvas/use-minimap-navigation.ts` + `designer-xyflow-canvas/designer-xyflow-canvas.tsx`（pan/zoom/fitView）+ `designer-canvas.tsx`（onViewportChange → setViewport）+ `use-xyflow-interactions.ts`（viewport 归一）
> 契约基准: `docs/audits/host-surface/README.md` §1 flow-designer 行（design.md + canvas-adapters.md）

## 面身份

fd-12 缩放平移面：minimap 导航（点击/拖拽/滚轮缩放）、canvas pan/zoom（panOnDrag/zoomOnScroll/zoomOnPinch/zoomOnDoubleClick + min/maxZoom clamp + fitView）、viewport 受控同步（normalizeControlledViewport → setViewport）。宿主契约 = `designerHostContract`（setViewport capability）。表单参与：无。布局 or widget：widget。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                        | 证据                                                                   | 发现           |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------- |
| 1   | Schema 契约                 | canvasConfig（gridSize/minZoom/maxZoom/pannable/zoomable/snapToGrid/background）host 可配                                   | designer-xyflow-canvas.tsx:189-202                                     | —              |
| 2   | RendererComponentProps 合规 | canvas 经 props 注入；snapshot selector 在 DesignerCanvasContent                                                            | designer-canvas.tsx:68-102                                             | —              |
| 3   | 值所有权三态                | viewport 受控（doc.viewport ?? snapshot.viewport 归一）→ onViewportChange → dispatch(setViewport)（可 undo 无关，纯视图态） | designer-xyflow-canvas.tsx:167-170；designer-canvas.tsx:385-391        | —              |
| 4   | 表单参与                    | 无                                                                                                                          | —                                                                      | —              |
| 5   | DOM 与选择器契约            | `.react-flow__minimap`/`.react-flow__controls`/`fd-xyflow-*` 锚定类（e2e 用）                                               | designer-xyflow-canvas.tsx:369-383                                     | —              |
| 6   | 嵌套 schema 分类            | 不适用                                                                                                                      | —                                                                      | —              |
| 7   | 事件与 action 契约          | onMove/onMoveEnd → handleViewportChange（归一 + viewportsEqual 去重）→ onViewportChange                                     | designer-xyflow-canvas.tsx:298-303；use-xyflow-interactions.ts:116-125 | —              |
| 8   | a11y                        | minimap/controls 非键盘路径（缩放平移无键盘等价——拖拽非唯一路径原则下为已知限制，滚轮/控件按钮可用）                        | —                                                                      | P3-1           |
| 9   | i18n                        | 不适用                                                                                                                      | —                                                                      | —              |
| 10  | 四态覆盖                    | normalizeControlledViewport 失败回退；minZoom/maxZoom clamp；gridEnabled=false 隐藏 background                              | xyflow-utils.ts；designer-xyflow-canvas.tsx:202                        | —              |
| 11  | 异步生命周期                | 无异步                                                                                                                      | —                                                                      | —              |
| 12  | 组合宿主场景                | minimap-pan（拖拽/点击/滚轮缩放）/ resizable（画布宽度联动）/ dingtalk-visual（minimap/controls 定位）                      | tests/e2e/\*.spec.ts                                                   | pass（基线绿） |
| 13  | 样式契约                    | minimap/controls 视觉变量化（--fd-minimap-\*/--fd-edge-stroke）                                                             | designer-xyflow-canvas.tsx:368-383                                     | —              |
| 14  | React 19 规范               | useMinimapNavigation 三个 effect 职责分离 + cleanup                                                                         | use-minimap-navigation.ts                                              | —              |
| 15  | 性能边界                    | useMinimapNavigation 仅在 showMinimap 时挂监听；viewportRef 防陈旧                                                          | use-minimap-navigation.ts:11-20                                        | —              |
| 16  | 测试质量                    | minimap-pan e2e 3 用例（拖拽/点击/缩放）+ resizable e2e                                                                     | tests/e2e/flow-designer-minimap-pan.spec.ts                            | —              |
| 17  | 文档对照                    | canvas-adapters.md viewport 契约 ↔ normalizeControlledViewport 一致                                                         | xyflow-utils.ts                                                        | —              |
| 18  | 注册/边界/IO                | 无 IO                                                                                                                       | —                                                                      | —              |
| H1  | host 契约                   | setViewport capability（viewport shape x/y/zoom）↔ onViewportChange 派发                                                    | designer-manifest.ts:304-312                                           | —              |
| H2  | 事务 undo                   | viewport 为视图态不入历史（setViewport 非图操作）                                                                           | —                                                                      | —              |
| H3  | 拖拽                        | minimap 拖拽导航（onMouseDown/up 距离判定 ≤25px 视为点击）                                                                  | use-minimap-navigation.ts:36-60                                        | —              |
| H4  | 键盘                        | 缩放平移无键盘等价路径（已知限制记录）                                                                                      | —                                                                      | P3-1           |
| H5  | 剪贴板                      | 无                                                                                                                          | —                                                                      | —              |
| H6  | e2e 可操作性                | 3 spec 覆盖本面（viewport transform 断言）                                                                                  | 见 #12                                                                 | pass           |
| H7  | MA4.3 缺口回归              | 本面无 MA4.3 登记缺口                                                                                                       | —                                                                      | —              |

## 发现清单

- [P3-1] minimap/pan/zoom 无键盘等价路径（`designer-xyflow-canvas.tsx:289-297`）→ 状态: 卡内记录（ReactFlow 原生限制；控件按钮 zoom-in/out/fit 为部分键盘可达，完整键盘等价归 DR 候选）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景: `flow-designer-minimap-pan.spec.ts`（minimap 拖拽/点击移动 viewport + 滚轮缩放） | 断言: `.react-flow__viewport` transform | 结果: pass（基线绿）
- 场景: `flow-designer-resizable.spec.ts`（面板 resize 后画布宽度联动） | 断言: canvas clientWidth | 结果: pass（基线绿）
- 场景: `flow-designer-dingtalk-visual.spec.ts`（minimap 右下/controls 左上定位） | 断言: boundingClientRect | 结果: pass（基线绿）
- 缺口: 无

## 修复记录

- 无 P0/P1（本面零修复）；P3 卡内记录。

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
