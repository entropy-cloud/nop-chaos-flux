# 审计卡：fd-1 canvas 渲染（flow-designer-renderers，D3.1 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` fd-1 | 注册定义: `renderer-definitions.ts`（DesignerCanvasContent 注册） | 渲染器: `designer-canvas.tsx:59` + `canvas-bridge.tsx` + `designer-xyflow-canvas/designer-xyflow-canvas.tsx`
> 契约基准: `docs/audits/host-surface/README.md` §1 flow-designer 行（design.md + api.md + config-schema.md + canvas-adapters.md + collaboration.md + tree-mode.md + runtime-snapshot.md + dingflow-visual-spec.md + README.md）

## 面身份

fd-1 canvas 渲染面：`DesignerCanvasContent`（designer-canvas.tsx）→ `renderDesignerCanvasBridge`（canvas-bridge.tsx）→ `DesignerXyflowCanvas`（designer-xyflow-canvas/）。宿主契约 = `designerHostContract`/`FLOW_DESIGNER_MANIFEST_V1`（designer-manifest.ts）。表单参与：无。布局 or widget：widget（自绘 canvas 面，样式锚定契约在 canvas-adapters.md）。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                         | 证据                                                                                                                | 发现                          |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | Schema 契约                 | DesignerCanvasContent 通过 useDesignerContext 取 core/dispatch/config，schema 面经 designer-page-body 注入                                   | designer-canvas.tsx:66                                                                                              | —                             |
| 2   | RendererComponentProps 合规 | 面组件不直访 store；snapshot 走 useDesignerSnapshotSelector 细粒度订阅（16 键 + 全等比较器）；props.rootProps 仅透传 className/testid/cid    | designer-canvas.tsx:68-102,401-410                                                                                  | —                             |
| 3   | 值所有权三态                | viewport 受控（doc.viewport + snapshot.viewport 归一）→ onViewportChange → setViewport；pendingConnection/reconnectingEdge 本地 UI 态        | designer-canvas.tsx:103-106,385-391；designer-xyflow-canvas.tsx:167-170                                             | —                             |
| 4   | 表单参与                    | 无（host 面非表单）                                                                                                                          | —                                                                                                                   | —                             |
| 5   | DOM 与选择器契约            | `fd-xyflow-surface` marker + data-testid/cid；minimap/controls 用 `fd-xyflow-minimap`/`fd-xyflow-controls` 锚定类；canvas-adapters.md 契约   | designer-xyflow-canvas.tsx:272-382                                                                                  | —                             |
| 6   | 嵌套 schema 分类            | menuItems 由 nodeTypes 派生（非 schema region）；DingFlowAddNodeMenu 为纯 UI                                                                 | designer-canvas.tsx:171-190                                                                                         | —                             |
| 7   | 事件与 action 契约          | 画布交互全部经 dispatch（内部命令），非 schema 事件派发面；无裸事件派发（check:audit-event-dispatch-ctx 扫描范围外的 host 包人工核对零命中） | designer-canvas.tsx:296-394                                                                                         | —                             |
| 8   | a11y                        | canvas 根 role=region + tabIndex=0 + aria-label；焦点管理注册 registerDesignerCanvasFocusHandler                                             | designer-canvas.tsx:406-410；designer-canvas-focus.ts                                                               | P3-1（硬编码英文 aria-label） |
| 9   | i18n                        | 面内文案走 t()（flowJsonParseError 等）；aria-label "Flow designer canvas" 硬编码英文                                                        | designer-canvas.tsx:409；designer-xyflow-canvas.tsx:276                                                             | P3-1                          |
| 10  | 四态覆盖                    | 空文档/加载/错误/readOnly 由 page-body/page-failures 层覆盖（designer-page-failures.test.tsx 在案）                                          | designer-page-failures.test.tsx                                                                                     | —                             |
| 11  | 异步生命周期                | JSON 预览 try/catch → reportHostIssue；生命周期钩子错误经 core.subscribe lifecycleHookError → reportRuntimeHostIssue                         | designer-page-body.tsx:193-255；designer-page-inner.tsx:53-81                                                       | —                             |
| 12  | 组合宿主场景                | css-diag（canvas 高度链/布局）/ dingtalk-visual（minimap/controls 定位）/ designer-summary-renderers（画布节点渲染）                         | tests/e2e/flow-designer-css-diag.spec.ts、flow-designer-dingtalk-visual.spec.ts、designer-summary-renderers.spec.ts | pass（12 spec 基线绿）        |
| 13  | 样式契约                    | fd-xyflow-\* 锚定类 + CSS 变量（--fd-grid-color/--fd-minimap-\*）；Background/MiniMap/Controls 全部变量化，无 React ThemeProvider            | designer-xyflow-canvas.tsx:360-383                                                                                  | —                             |
| 14  | React 19 规范               | useCallback/useMemo 均绑定真实依赖；无 effect+setState 镜像（surfaceFocus 为 ref + setTimeout focus 属外部同步）                             | designer-canvas.tsx:128-137                                                                                         | —                             |
| 15  | 性能边界                    | snapshot selector 16 键全等比较防重渲；menuItems/nodeTypeSizeMap 均 useMemo                                                                  | designer-canvas.tsx:171-249                                                                                         | —                             |
| 16  | 测试质量                    | designer-canvas-features.test.tsx/designer-controls.test.tsx/designer-page-\*.test.tsx 覆盖渲染与失败路径                                    | 包级 35 测试文件                                                                                                    | —                             |
| 17  | 文档对照                    | canvas-adapters.md 承载 bridge 契约，designerHostContract 声明与消费双向核对一致（方法全集 = action-provider listMethods 41 条）             | designer-manifest.ts:78-463 vs designer-action-provider.ts:107-150                                                  | —                             |
| 18  | 注册/边界/IO                | 包边界合规（core 无 react 依赖）；`check:audit-renderer-browser-io` 覆盖 4 host renderer 包零命中；无 URL/IO 红线                            | D0/D1 门禁输出                                                                                                      | —                             |
| H1  | host 契约                   | manifest 方法契约 41 条 ↔ action-provider invoke 全分支覆盖 ↔ adapter 命令全集；GRAPH_ONLY_METHODS tree mode 降级                            | designer-action-provider.ts:74-89,153-155                                                                           | —                             |
| H2  | 事务 undo                   | canvas 派发 moveNode/addNode 等单命令，undo 由 core 历史承载（fd-8 详审）                                                                    | designer-canvas.tsx:296-394                                                                                         | —                             |
| H3  | 拖拽                        | 节点拖拽由 ReactFlow 内部实现（nodesDraggable）+ position commit 在 useXyflowInteractions（NaN 守卫 + ±10000 clamp）                         | designer-xyflow-canvas.tsx:288；use-xyflow-interactions.ts:86-97                                                    | —                             |
| H4  | 键盘                        | canvas 根可聚焦；node/slot 键盘路径在 fd-4 详审；快捷键在 fd-10 详审                                                                         | designer-canvas.tsx:406-410                                                                                         | —                             |
| H5  | 剪贴板                      | fd-11 详审（canvas 无直接剪贴板逻辑）                                                                                                        | —                                                                                                                   | —                             |
| H6  | e2e 可操作性                | 3 spec 覆盖本面，data-slot/marker + computed style 断言                                                                                      | 见 #12                                                                                                              | pass                          |
| H7  | MA4.3 缺口回归              | DesignerCanvasContent 间接测试（designer-canvas-features.test.tsx）维持；manifest 层缺口归 fd-7 H7                                           | designer-canvas-features.test.tsx                                                                                   | 登记                          |

## 发现清单

- [P3-1] canvas 根 aria-label "Flow designer canvas" 硬编码英文（`designer-canvas.tsx:409` + `designer-xyflow-canvas.tsx:276`）→ 状态: 卡内记录（a11y 语义标签，读屏依赖；i18n 化归 DR 候选）
- [P3-2] `nop-designer:test-start-reconnect` 测试专用 window 事件监听在生产代码中（`designer-canvas.tsx:138-169`）→ 状态: 卡内记录（测试钩子，仅 reconnect e2e 使用，无风险）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景: `flow-designer-css-diag.spec.ts`（canvas 高度链：viewport → ReactFlow 满高断言 + Tailwind 类生成） | 断言: programmatic DOM（getComputedStyle + 类名） | 结果: pass（12 spec 基线全绿，D0/D2 复核过）
- 场景: `flow-designer-dingtalk-visual.spec.ts`（minimap 右下 / controls 左上定位） | 断言: boundingClientRect 相对关系 | 结果: pass
- 场景: `designer-summary-renderers.spec.ts`（画布节点渲染 + node-card/edge-row marker） | 断言: marker 类 + 派发计数 | 结果: pass
- 缺口: 无（Phase 1 覆盖矩阵 fd-1 行满覆盖）

## 修复记录

- 无 P0/P1（本面零修复）；P3 卡内记录。

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
