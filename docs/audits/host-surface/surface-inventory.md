# Host 面清单初稿（surface-inventory）

> Plan Status: active（D0 4 host 面范围核对交付物，plan `docs/plans/2026-08-08-0715-1-round2-d0-orchestration-baseline.md` Phase 2）
> Last Updated: 2026-08-08
> 用途: D3.1–D3.4 各 plan 的逐面审计卡清单依据（roadmap D3.x Phase Details 列举面全量收录，未增减）；每面一行对应未来一张（或一组）审计卡
> Source: roadmap D3.x Phase Details + live repo 核对

## flow-designer（D3.1，flow-designer-core + flow-designer-renderers）

| #     | 面（surface feature） | 审计要点（D3.1 plan 展开）                                                                        |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------- |
| fd-1  | canvas 渲染           | designer-canvas.tsx + canvas-bridge.tsx 渲染链路、主题样式、canvas-adapters.md 契约               |
| fd-2  | 节点                  | designer-node-card.tsx 渲染/选中/外观（designer-node-appearance.ts）                              |
| fd-3  | 边                    | designer-edge-row.tsx 渲染/交互/连接（edge-creation e2e 已覆盖建边）                              |
| fd-4  | 槽位                  | designer-xyflow-node.tsx slot affordance（Enter/Space 键盘路径，13-01 已修复）、tree mode 空槽位  |
| fd-5  | 面板                  | designer-inspector.tsx + designer-field.tsx 属性面板                                              |
| fd-6  | 树视图                | tree-domain/tree-structure/tree-validation/tree-session-impl + tree-mode.md 契约（tree-mode e2e） |
| fd-7  | 命令系统              | designer-command-adapter-graph/tree + designer-action-provider（command adapter 契约）            |
| fd-8  | 事务与 undo           | 命令事务链（core-edge/node/shell-commands + 撤销语义）                                            |
| fd-9  | 拖拽                  | 节点/边拖拽（含 pointercancel 守卫，2-14 家族先例）、drop 落点                                    |
| fd-10 | 键盘                  | 快捷键（useDesignerShortcuts）、键盘导航焦点管理                                                  |
| fd-11 | 剪贴板                | 复制/粘贴路径                                                                                     |
| fd-12 | 缩放平移              | minimap/pan/zoom（minimap-pan e2e）、resizable（resizable e2e）                                   |
| fd-13 | JSON.parse 失败路径   | designer JSON.parse 静默 null（19-3 遗留复核，0819-1 已部分修复）                                 |

## spreadsheet（D3.2，spreadsheet-core + spreadsheet-renderers）

| #     | 面（surface feature） | 审计要点（D3.2 plan 展开）                                                           |
| ----- | --------------------- | ------------------------------------------------------------------------------------ |
| ss-1  | 表格渲染              | spreadsheet-grid/ 虚拟表格渲染 + canvas-styles.css 样式契约                          |
| ss-2  | 单元格编辑            | 编辑状态/提交（SpreadsheetEditingState/EditSaveStatus + useSpreadsheetInteractions） |
| ss-3  | 工具栏                | spreadsheet-toolbar/（rd-\* 已清理，10-02）、toolbar-status/toolbar-groups           |
| ss-4  | 状态栏                | toolbar-status.tsx（sheet 状态展示）                                                 |
| ss-5  | 公式                  | SetCellFormulaCommand 命令链 + 公式语义（spreadsheet-core commands）                 |
| ss-6  | 冻结                  | FreezePanesCommand/UnfreezePanesCommand + SpreadsheetFrozenPane                      |
| ss-7  | 选择                  | SpreadsheetSelection 族（createDefaultSelection/选区工具）                           |
| ss-8  | 键盘导航              | 键盘移动/编辑路径                                                                    |
| ss-9  | 搜索                  | FindCommand/FindNextCommand/ReplaceCommand 族                                        |
| ss-10 | undo                  | UndoSpreadsheetCommand/RedoSpreadsheetCommand + 事务（Begin/Commit/Rollback）        |

## report-designer（D3.3，report-designer-core + report-designer-renderers）

| #    | 面（surface feature） | 审计要点（D3.3 plan 展开）                                                            |
| ---- | --------------------- | ------------------------------------------------------------------------------------- |
| rd-1 | 画布                  | page-renderer-\*.tsx（host projection/init/snapshots）+ report-spreadsheet-canvas.tsx |
| rd-2 | 字段拖拽              | report-field-panel.tsx + REPORT_FIELD_DRAG_MIME（drag payload 契约）                  |
| rd-3 | inspector             | report-designer-inspector.tsx + inspector-design.md 契约                              |
| rd-4 | 预览                  | 预览路径（designer 宿主场景）                                                         |
| rd-5 | 保存                  | host 保存链路（saveDocument 类路径）+ nop-report-profile.md                           |
| rd-6 | undo                  | 命令事务 + codec-design.md 编解码契约                                                 |
| rd-7 | 模板                  | ReportTemplateDocument/模板创建（createReportTemplateDocument）                       |

## word-editor（D3.4，word-editor-core + word-editor-renderers）

| #    | 面（surface feature） | 审计要点（D3.4 plan 展开）                                          |
| ---- | --------------------- | ------------------------------------------------------------------- |
| we-1 | 文档渲染              | word-editor-page.tsx + editor-canvas.tsx（CanvasEditorBridge 封装） |
| we-2 | 工具栏                | toolbar/（工具按钮族）                                              |
| we-3 | 选区                  | EditorSelectionState（editor-store.ts 选区状态）                    |
| we-4 | 数据集                | dataset-store.ts + dataset-model.ts（dataset e2e 已覆盖）           |
| we-5 | 恢复                  | document-io.ts recovery 路径（document-io-persist 测试族）          |
| we-6 | 导出                  | 导出路径（template-expr/template-model）                            |
| we-7 | 导入                  | 导入路径（document-io load）                                        |

## 引用关系

- D3.1 plan 引用: 本清单 fd-1..fd-13 + `docs/audits/host-surface/README.md` §1/§2（flow-designer 行）。
- D3.2 plan 引用: ss-1..ss-10 + README §1/§2（spreadsheet 行，含 owner doc gap 与 e2e coverage gap 两 Decision）。
- D3.3 plan 引用: rd-1..rd-7 + README §1/§2（report-designer 行）。
- D3.4 plan 引用: we-1..we-7 + README §1/§2（word-editor 行）。
