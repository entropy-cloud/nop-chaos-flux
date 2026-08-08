# 审计卡：fd-3 边（flow-designer-renderers，D3.1 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` fd-3 | 注册定义: `renderer-definitions.ts` | 渲染器: `designer-edge-row.tsx`（inspector 汇总行）+ `designer-xyflow-canvas/designer-xyflow-edge.tsx`（画布边渲染）+ `render-ports.tsx`（连接点）
> 契约基准: `docs/audits/host-surface/README.md` §1 flow-designer 行（design.md + dingflow-visual-spec.md）

## 面身份

fd-3 边面：画布边渲染/交互/连接（`designer-xyflow-edge.tsx` + `render-ports.tsx`）+ inspector 边汇总行（`designer-edge-row.tsx`）。宿主契约 = `designerHostContract`。表单参与：无。布局 or widget：widget。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                                  | 证据                                                               | 发现                          |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------- |
| 1   | Schema 契约                 | DesignerEdgeRowSchema（edgeId）经 props.props 读取                                                                                                    | designer-edge-row.tsx:32                                           | —                             |
| 2   | RendererComponentProps 合规 | edge-row 只读 props.props/meta + useDesignerSnapshotSelector；useNodeLabel 局部 hook                                                                  | designer-edge-row.tsx:18-42                                        | —                             |
| 3   | 值所有权三态                | edge summary 派生（source/target/type）；edgeTypeLabel 回退                                                                                           | designer-edge-row.tsx:34-48                                        | —                             |
| 4   | 表单参与                    | 无                                                                                                                                                    | —                                                                  | —                             |
| 5   | DOM 与选择器契约            | `nop-designer-edge-row` marker + data-edge-id/type/selected/active；画布边 label 走 `fd-edge-label` 锚定类 + data-slot designer-edge-actions          | designer-edge-row.tsx:13,82-86；designer-xyflow-edge.tsx:118-151   | —                             |
| 6   | 嵌套 schema 分类            | edgeType.body schema（RenderNodes）scopeKey 隔离                                                                                                      | designer-xyflow-edge.tsx:71                                        | —                             |
| 7   | 事件与 action 契约          | dispatch({selectEdge/deleteEdge/updateEdgeData})；edge 快行动作 aria-label 走 t()                                                                     | designer-edge-row.tsx:50-56；designer-xyflow-edge.tsx:167          | —                             |
| 8   | a11y                        | edge-row role=button（focus-visible ring）；画布边 label role=button + aria-pressed；port 连接 a11y 上下文（PortConnectionA11yContext）               | designer-xyflow-edge.tsx:114-116；port-connection-a11y-context.tsx | P3-1（aria-label 硬编码英文） |
| 9   | i18n                        | 边面文案走 t()（selectEdge 等）；"Edge actions for …" aria-label 硬编码英文                                                                           | designer-xyflow-edge.tsx:146                                       | P3-1                          |
| 10  | 四态覆盖                    | 无 summary → 空态 div（data-empty）；边 label 回退 edgeData.label/typeLabel                                                                           | designer-edge-row.tsx:58-69                                        | —                             |
| 11  | 异步生命周期                | 无异步                                                                                                                                                | —                                                                  | —                             |
| 12  | 组合宿主场景                | edge-creation（键盘建边）/ label-text（边标签 ${condition} 解析 + 非 raw 断言）/ summary-renderers（edge-row selectEdge 派发）/ taskflow-ui（边渲染） | tests/e2e/\*.spec.ts                                               | pass（基线绿）                |
| 13  | 样式契约                    | 边自样式 widget（getBezierPath + 自定义 label）；主题独立                                                                                             | designer-xyflow-edge.tsx:23                                        | —                             |
| 14  | React 19 规范               | 无冗余 memo；hover 态 timeout 清理                                                                                                                    | designer-xyflow-canvas.tsx:176-183                                 | —                             |
| 15  | 性能边界                    | snapshotEdges useMemo；hoveredEdgeId 局部态                                                                                                           | designer-xyflow-canvas.tsx:163-166                                 | —                             |
| 16  | 测试质量                    | designer-node-card-edge-row.test.tsx / edge-label-xyflow.test.tsx / ding-flow-edge.test.tsx                                                           | 包级测试                                                           | —                             |
| 17  | 文档对照                    | design.md 边契约 ↔ 实现一致                                                                                                                           | —                                                                  | —                             |
| 18  | 注册/边界/IO                | 无 IO；无安全红线                                                                                                                                     | —                                                                  | —                             |
| H1  | host 契约                   | 边面消费 edgeTypes 配置（host 注入）；无 manifest 直读                                                                                                | designer-xyflow-edge.tsx:21-22                                     | —                             |
| H2  | 事务 undo                   | addEdge/reconnectEdge/deleteEdge 走 core（fd-8 详审）                                                                                                 | —                                                                  | —                             |
| H3  | 拖拽                        | connect/reconnect 拖拽由 ReactFlow 内部实现（onConnect/onReconnect 回调）                                                                             | designer-xyflow-canvas.tsx:307-308                                 | —                             |
| H4  | 键盘                        | 键盘建边 e2e 在案（port 键盘路径）；label Enter/Space 选择                                                                                            | designer-xyflow-edge.tsx:157                                       | —                             |
| H5  | 剪贴板                      | 无直接剪贴板                                                                                                                                          | —                                                                  | —                             |
| H6  | e2e 可操作性                | 4 spec 覆盖本面；`.react-flow__edge` 计数断言                                                                                                         | 见 #12                                                             | pass                          |
| H7  | MA4.3 缺口回归              | 本面无 MA4.3 登记缺口                                                                                                                                 | —                                                                  | —                             |

## 发现清单

- [P3-1] `designer-xyflow-edge.tsx:146` aria-label "Edge actions for …" 硬编码英文 → 状态: 卡内记录（i18n 化归 DR 候选）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景: `flow-designer-edge-creation.spec.ts`（键盘建边：source handle → target handle 真机创建可见边） | 断言: `.react-flow__edge` 计数 + data-slot | 结果: pass（基线绿）
- 场景: `flow-designer-label-text.spec.ts`（边标签 `${condition}` 表达式真机解析 + 非 raw 表达式断言） | 断言: textContent | 结果: pass（基线绿）
- 场景: `designer-summary-renderers.spec.ts`（edge-row 点击派发 selectEdge） | 断言: marker + 派发 | 结果: pass（基线绿）
- 缺口: 无

## 修复记录

- 无 P0/P1（本面零修复）；P3 卡内记录。

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
