# 审计卡：fd-6 树视图（flow-designer-core，D3.1 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` fd-6 | 注册定义: `core/index.ts`（tree 域 adapter 注册） | 渲染器: `tree-domain.ts` + `tree-structure.ts` + `tree-validation.ts` + `tree-session-impl.ts` + `tree-projection.ts`（core 包）+ `designer-tree-mode.tsx`（renderers 消费）
> 契约基准: `docs/audits/host-surface/README.md` §1 flow-designer 行（tree-mode.md + design.md + runtime-snapshot.md）

## 面身份

fd-6 树视图面：tree domain 模型（registerTreeDomainAdapter/projectAndLayoutTree/validateTreeDocument/canonicalizeTreeDocument）+ tree session（buildTreeSessionContext/createTreeSessionSurface）+ 投影几何（tree-projection.ts）。宿主契约 = `designerHostContract`。表单参与：无。布局 or widget：domain core（无 react 依赖）。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                             | 证据                                                    | 发现           |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------- |
| 1   | Schema 契约                 | treeDocument 经 props.props 读取 + epoch/ack 双通道；createTreeDesignerCore(inputTreeDocument, config)                           | designer-tree-mode.tsx:43-52                            | —              |
| 2   | RendererComponentProps 合规 | TreeModeLayoutWrapper 经 props.props/helpers/node.scope；无 store 直访                                                           | designer-tree-mode.tsx:85-90                            | —              |
| 3   | 值所有权三态                | host input treeDocument（controlled）+ session 内部状态（local，epoch 替换时重建）；ackSessionId/ackDispatchId 双向 ack          | designer-tree-mode.tsx:113-133；tree-session.ts:171-289 | —              |
| 4   | 表单参与                    | 无                                                                                                                               | —                                                       | —              |
| 5   | DOM 与选择器契约            | tree 投影节点走 designer-xyflow-node（fd-4 已审）；错误面 `designer-tree-error-surface` testid                                   | designer-tree-mode.tsx:145-147                          | —              |
| 6   | 嵌套 schema 分类            | treeDocumentChangeAction 经 isActionSchemaInput 归一 → normalizedChangeAction                                                    | designer-tree-mode.tsx:19-26,70-75                      | —              |
| 7   | 事件与 action 契约          | core.subscribe(treeChanged) → session.enqueueTreeChange；host 输入拒绝走 reportHostIssue                                         | designer-tree-mode.tsx:97-111,124-129                   | —              |
| 8   | a11y                        | 错误面 role=alert                                                                                                                | designer-tree-mode.tsx:145                              | —              |
| 9   | i18n                        | treeDocumentInvalid/treeDocumentRequired 走 t()；"Tree host input rejected:" 拼接英文                                            | designer-tree-mode.tsx:28-32,126                        | P3-1           |
| 10  | 四态覆盖                    | 无 input → 提示文案；投影失败 → 错误面（formatTreeProjectionError）；挂载成功 → DesignerPageInner                                | designer-tree-mode.tsx:135-158                          | —              |
| 11  | 异步生命周期                | session.dispatchNext() 队列化；unmount 时 session.dispose() + unsubscribe                                                        | designer-tree-mode.tsx:104-110                          | —              |
| 12  | 组合宿主场景                | tree-mode（投影节点/边共享线/几何 footprint）/ taskflow-ui（TaskFlow Tree tab）                                                  | tests/e2e/\*.spec.ts                                    | pass（基线绿） |
| 13  | 样式契约                    | 投影几何（DEFAULT_NODE_WIDTH/HEIGHT/EMPTY_BRANCH_SIZE）常量化；tree-direction 布局                                               | tree-validation.ts:13-15                                | —              |
| 14  | React 19 规范               | creationResult 惰性初始化（useState 初始器）；session 生命周期 effect 干净                                                       | designer-tree-mode.tsx:49-52,77-111                     | —              |
| 15  | 性能边界                    | session 队列化派发（非同步全量重算）；epoch 替换经 queueMicrotask 重渲                                                           | designer-tree-mode.tsx:130-132                          | —              |
| 16  | 测试质量                    | tree-domain.test.ts / tree-projection.test.ts（17+ 几何与校验用例）/ tree-session.test.ts 在案                                   | 包级测试                                                | —              |
| 17  | 文档对照                    | tree-mode.md 契约（投影/槽位/共享线）↔ 实现一致（MIN_CHAIN_GAP/SPLIT_GAP 常量对应 spec）                                         | tree-projection.ts:43-52                                | —              |
| 18  | 注册/边界/IO                | core 包零 react 依赖；tree domain adapter 注册面（registerTreeDomainAdapter/get/list/clear）                                     | tree-domain.ts:8-22                                     | —              |
| H1  | host 契约                   | treeDocument 双通道（input + ack）为 tree-mode.md 显式契约；无 manifest 直读                                                     | designer-tree-mode.tsx:43-47                            | —              |
| H2  | 事务 undo                   | tree 命令（addBranch/deleteTreeNode/…）走 core 事务链（fd-8 详审）                                                               | —                                                       | —              |
| H3  | 拖拽                        | tree mode nodesDraggable=false（投影几何不可拖）；槽位点击/键盘激活                                                              | designer-xyflow-canvas.tsx:288                          | —              |
| H4  | 键盘                        | 槽位键盘路径 fd-4 已审                                                                                                           | —                                                       | —              |
| H5  | 剪贴板                      | 无                                                                                                                               | —                                                       | —              |
| H6  | e2e 可操作性                | tree-mode spec 断言 DOM bounds（边共享线避免节点碰撞）；taskflow-ui Tree tab                                                     | flow-designer-tree-mode.spec.ts:76-101                  | pass           |
| H7  | MA4.3 缺口回归              | MA43-P1-01 `createDesignerStoreAdapter` 已补测（designer-store-adapter.test.ts 7 用例）；树域测试覆盖良好（projection 17+ 用例） | adapters/designer-store-adapter.test.ts                 | 已收敛         |

## 发现清单

- [P3-1] `designer-tree-mode.tsx:126` "Tree host input rejected: …" 英文拼接消息（经 reportHostIssue 上报，开发者诊断面）→ 状态: 卡内记录（诊断消息非 UI 文案，dev 工具可见性）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景: `flow-designer-tree-mode.spec.ts`（dingtalk tree mode 挂载 + 投影节点 + split/merge 共享线 DOM bounds 断言 + action-flow tree 零错误） | 断言: `.react-flow__node` 计数 + DOM 边界 | 结果: pass（基线绿）
- 场景: `taskflow-designer-ui.spec.ts`（TaskFlow Tree tab 渲染树文档 + 切换模式零错误） | 断言: 树文档节点 + console 零错误 | 结果: pass（基线绿）
- 缺口: 无

## 修复记录

- 无 P0/P1（本面零修复）；P3 卡内记录。

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
