# 审计卡：fd-8 事务与 undo（flow-designer-core，D3.1 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` fd-8 | 注册定义: `core/index.ts` | 渲染器: `core-edge-commands.ts` + `core-node-commands.ts` + `core-shell-commands.ts` + `core/transactions.ts` + `core/history.ts` + `core.ts`（undo/redo/copy/paste 组合）
> 契约基准: `docs/audits/host-surface/README.md` §1 flow-designer 行（design.md + api.md）

## 面身份

fd-8 事务与 undo 面：graph/tree 命令事务链（begin/commit/rollback 栈式）、undo/redo 历史（maxHistorySize 有界 + 分支截断）、失败回滚（rollbackTransactionState 恢复快照）。宿主契约 = `designerHostContract`（undo/redo/beginTransaction/commitTransaction/rollbackTransaction capability）。表单参与：无。布局 or widget：domain core（无 react 依赖）。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                                          | 证据                                                         | 发现                |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------- |
| 1   | Schema 契约                 | 事务面纯 core 内部，无 schema                                                                                                                                 | —                                                            | —                   |
| 2   | RendererComponentProps 合规 | 不适用（core 包）                                                                                                                                             | —                                                            | —                   |
| 3   | 值所有权三态                | 历史条目为 doc 全量快照（cloneDocument/cloneTreeDocument）；undo/redo 恢复 doc + tree + viewport                                                              | history.ts:8-15；core.ts:325-352                             | —                   |
| 4   | 表单参与                    | 无                                                                                                                                                            | —                                                            | —                   |
| 5   | DOM 与选择器契约            | 不适用                                                                                                                                                        | —                                                            | —                   |
| 6   | 嵌套 schema 分类            | 不适用                                                                                                                                                        | —                                                            | —                   |
| 7   | 事件与 action 契约          | 事务完成后 emit historyChanged/documentChanged/viewportChanged；undo/redo 命令经 adapter → core                                                               | core.ts:338-347；designer-command-adapter.ts:230-235,276-281 | —                   |
| 8   | a11y                        | 不适用                                                                                                                                                        | —                                                            | —                   |
| 9   | i18n                        | 事务 label 由调用方传入（'delete-selection' 等内部标识，非 UI 文案）                                                                                          | designer-command-adapter.ts:60,137                           | —                   |
| 10  | 四态覆盖                    | canUndo/canRedo 边界守卫（historyIndex 上下界）；空历史 undo 返回 unavailable                                                                                 | history.ts:30-36；designer-command-adapter.ts:231-235        | —                   |
| 11  | 异步生命周期                | 无异步                                                                                                                                                        | —                                                            | —                   |
| 12  | 组合宿主场景                | **无既有 e2e 覆盖 undo/redo（覆盖矩阵缺口）**                                                                                                                 | —                                                            | 缺口 → Phase 5 新增 |
| 13  | 样式契约                    | 不适用                                                                                                                                                        | —                                                            | —                   |
| 14  | React 19 规范               | 不适用                                                                                                                                                        | —                                                            | —                   |
| 15  | 性能边界                    | maxHistorySize 有界裁剪；redo 分支截断（pushHistoryEntry slice）                                                                                              | history.ts:44-58                                             | —                   |
| 16  | 测试质量                    | core-graph.test.ts 图操作 undo/redo 覆盖 + core-error-fidelity.test.ts 失败语义                                                                               | 包级测试                                                     | —                   |
| 17  | 文档对照                    | design.md 事务语义（栈式 + 快照恢复）↔ transactions.ts 一致                                                                                                   | transactions.ts:12-124                                       | —                   |
| 18  | 注册/边界/IO                | core 零 react 依赖                                                                                                                                            | —                                                            | —                   |
| H1  | host 契约                   | begin/commit/rollbackTransaction 41 方法契约成员，commit/rollback 结果 shape 含 ok/transactionId/reason                                                       | designer-manifest.ts:336-397                                 | —                   |
| H2  | 事务与 undo 语义            | 栈式事务：commit(指定 id) 只弹出该事务（嵌套保留）；rollback(指定 id) 恢复最深快照并回滚全部内层（rolledBackIds 全列）；树快照与图快照双轨恢复；readonly 守卫 | transactions.ts:34-124；core.ts:355-366                      | —                   |
| H3  | 拖拽                        | 不适用                                                                                                                                                        | —                                                            | —                   |
| H4  | 键盘                        | undo/redo 快捷键在 fd-10                                                                                                                                      | —                                                            | —                   |
| H5  | 剪贴板                      | 不适用                                                                                                                                                        | —                                                            | —                   |
| H6  | e2e 可操作性                | **缺口：undo/redo 真实浏览器场景缺失**——Phase 5 新增（键盘 Ctrl+Z 删除节点后恢复）                                                                            | —                                                            | 缺口                |
| H7  | MA4.3 缺口回归              | core 图操作 undo/redo 已覆盖（MA4.3 强覆盖区）                                                                                                                | core-graph.test.ts                                           | —                   |

## 发现清单

- （无 P0/P1/P2；undo/redo e2e 缺口归 Phase 5 场景，非缺陷）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景: `flow-designer-undo-clipboard.spec.ts`（**新增，Phase 5**）——Delete 删除节点 → Ctrl+Z 恢复（6→5→6）→ Ctrl+Y 再删除（→5） | 断言: `.react-flow__node` 计数 + 节点/连线计数文案（programmatic DOM） | 结果: pass（2.5s）
- 缺口: 已闭合（Phase 5 新增场景覆盖 undo/redo 真实浏览器路径）

## 修复记录

- Phase 5（plan `2026-08-08-0900-1`）：新增 e2e `flow-designer-undo-clipboard.spec.ts`（undo/redo 真实浏览器场景）；无代码修复（核心事务语义审计零发现）。

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
