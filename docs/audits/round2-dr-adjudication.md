# 第二轮 P2 路由裁决表（round2-dr-adjudication）

> 生成：2026-08-08，来源 plan `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md` Phase 4（flow-designer 大面审计 P2 路由登记）
> 方法：13 面审计卡（`docs/audits/host-surface/fd-*.md`）发现分级 → P2 显式路由 DR；每条目含缺陷、`文件:行`、路由 DR
> 用途：DR 跨面集中修复（roadmap DR 行）的登记基线。零悬挂：卡内 P2 清单 = 本表条目。
> 先例：`docs/audits/round2-p3-adjudication.md`（P3 裁决表结构先例，D2 交付）
> 联动：roadmap DR 行（跨面集中修复与裁决）依赖本登记；D3.2–D3.4（spreadsheet/report-designer/word-editor）后续 P2 路由追加登记到本表。

## 零登记基线（2026-08-08 建表时刻）

- D0/D1/D2 已登记 P2 = **0 条**（D1 plan completed 零登记项；D2 P3 裁决轮无 P2 路由）。
- 本表为 D3.x 首个写入者；建表后写入 flow-designer 大面 P2 路由条目（§1）。

## 计数汇总（live 2026-08-08）

| 分类     | 条数   | 说明                                                                                                                                                 |
| -------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2 路由  | 11     | DR-1/DR-2（fd-7/fd-2 i18n）+ DR-3–DR-6（ss-2 ×2 / ss-4 / ss-9 i18n 与死管线，D3.2 追加）+ **DR-7–DR-11（rd-4/rd-5/rd-6/rd-7/rd-2 i18n，D3.3 追加）** |
| 卡内 P3  | 18     | 卡内记录不路由（fd-1..fd-12 ×9 + ss-1..ss-10 各卡 P3，D3.2 追加 9 条）+ **D3.3 追加 0 条（rd-1..rd-7 卡内 P3 不路由）**                              |
| **合计** | **11** | 与 13 卡 + 10 卡 + 7 卡发现清单逐条对齐（卡内 P2 零悬挂）                                                                                            |

## 1. P2 路由条目（6 条）

| ID    | 面   | 缺陷                                                                                                                                     | `文件:行`                                                                                                                                                                                          | 路由 DR      | 说明                                                                                            |
| ----- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| DR-1  | fd-7 | 命令适配器错误消息硬编码英文 9 处（用户可见 via env.notify）                                                                             | `designer-command-adapter.ts:85/:128/:193/:214/:222/:232/:278` + `designer-command-adapter-graph.ts:61/:146`                                                                                       | 跨面集中修复 | i18n 化 + 复用既有 `flux.flowDesigner.*` t() key 族；非阻断（英文可读，无功能损失）             |
| DR-2  | fd-2 | DEFAULT_NODE_TYPE_META 默认节点标签硬编码中文 15 条（用户可见）                                                                          | `designer-node-appearance.ts:3-20`（消费点 `designer-canvas.tsx:177-186`、`designer-inspector.tsx:74`）                                                                                            | 跨面集中修复 | i18n key 化 + 动态 typeId 解析；host 配置 label 时不受影响；非阻断                              |
| DR-3  | ss-2 | 编辑保存状态消息硬编码英文 3 处（用户可见 via SpreadsheetEditStatus）                                                                    | `use-editing.ts:64/:72/:77`（`getResultMessage:12` 'Saving cell...'/'Cell save cancelled'/'Cell save failed'）                                                                                     | 跨面集中修复 | i18n 化 + 复用 `flux.spreadsheet.*` key 族；非阻断                                              |
| DR-4  | ss-2 | `setCellValue`/`setCommentText` no-op 死管线 + toolbar cell-editor/comment-editor UI 移除（comment 功能 UI 不可达）                      | `use-spreadsheet-shell.ts:25-35`（消费点 use-selection.ts:239-241/use-clipboard.ts:57/use-comments.ts:45；`cell-editor.tsx` 无渲染方，`spreadsheet-toolbar.tsx:8-22` 仅 groups/status/find-panel） | 跨面集中修复 | 裁决：移除死管线（props/state 清理）或恢复 toolbar cell editor UI；声明 setter 无行为属契约嫌疑 |
| DR-5  | ss-4 | 页头状态行 `buildSpreadsheetStatusLabel` 硬编码英文（用户可见）                                                                          | `page-model.ts:16-17`（消费 `page-renderer.tsx:236` 'Active sheet: X \| Selection: Y'）                                                                                                            | 跨面集中修复 | i18n 化；非阻断                                                                                 |
| DR-6  | ss-9 | 查找结果消息硬编码英文 3 处（用户可见 find-results 面板）                                                                                | `use-find-replace.ts:25/:30/:61` 'Found at ...'/'Not found'/'Replaced N occurrences'                                                                                                               | 跨面集中修复 | i18n 化；非阻断                                                                                 |
| DR-7  | rd-4 | 预览面硬编码英文（用户可见 via toolbar/notify）——preview 错误消息 2 处 + 'Preview'/'Stop' 按钮标签 + 'Report toolbar action failed' 兜底 | `preview-commands.ts:22/:27` + `report-designer-toolbar-defaults.ts:24/:31` + `report-designer-toolbar.tsx:44/:58`                                                                                 | 跨面集中修复 | i18n 化 + 复用既有 `flux.reportDesigner.*` key 族；非阻断                                       |
| DR-8  | rd-5 | 保存面硬编码英文（用户可见）——'Document is readonly' + 'Save' 按钮标签 + '${fieldCount} fields' badge 文本                               | `core.ts:370` + `report-designer-toolbar-defaults.ts:38-40`                                                                                                                                        | 跨面集中修复 | i18n 化；非阻断                                                                                 |
| DR-9  | rd-6 | undo/redo 面硬编码英文（用户可见）——'Nothing to undo'/'Nothing to redo'/'Unknown command' + 'Undo'/'Redo' 按钮标签                       | `core-dispatch.ts:289/:307/:336` + `report-designer-toolbar-defaults.ts:7-21`                                                                                                                      | 跨面集中修复 | i18n 化；非阻断                                                                                 |
| DR-10 | rd-7 | 模板面硬编码英文（用户可见）——codec 错误消息 2 处 + 'Untitled Report' 默认文档名                                                         | `codec-commands.ts:20/:25` + `types.ts:171`                                                                                                                                                        | 跨面集中修复 | i18n 化 + 默认名 key 化；非阻断                                                                 |
| DR-11 | rd-2 | 字段拖放失败消息硬编码英文 3 处（用户可见 via env.notify）                                                                               | `report-spreadsheet-canvas.tsx:172/:177/:206` 'Field drop cancelled'/'Field drop failed before designer update'/'Field drop rollback failed'                                                       | 跨面集中修复 | i18n 化；非阻断                                                                                 |

## 2. 卡内 P3 记录（18 条，不路由）

| 面    | 编号 | 内容                                                            | `文件:行`                                               |
| ----- | ---- | --------------------------------------------------------------- | ------------------------------------------------------- |
| fd-1  | P3-1 | canvas 根 aria-label 硬编码英文 "Flow designer canvas"          | designer-canvas.tsx:409、designer-xyflow-canvas.tsx:276 |
| fd-1  | P3-2 | 测试专用 window 事件监听 nop-designer:test-start-reconnect      | designer-canvas.tsx:138-169                             |
| fd-2  | P3-1 | nodeAriaLabel "Selected Node …" 硬编码英文                      | designer-xyflow-node.tsx:175                            |
| fd-3  | P3-1 | "Edge actions for …" aria-label 硬编码英文                      | designer-xyflow-edge.tsx:146                            |
| fd-4  | P3-1 | "Empty branch slot for …" aria-label 硬编码英文                 | designer-xyflow-node.tsx:225                            |
| fd-5  | P3-1 | generic 字段用数据 key 作 Label（数据驱动）                     | designer-inspector.tsx:91,403                           |
| fd-6  | P3-1 | "Tree host input rejected: …" 英文诊断消息                      | designer-tree-mode.tsx:126                              |
| fd-11 | P3-1 | copy 仅取 selectedNodeIds[0]（多选复制丢弃其余）                | core.ts:357、shell-state.ts:71                          |
| fd-12 | P3-1 | minimap/pan/zoom 无键盘等价路径（ReactFlow 原生限制）           | designer-xyflow-canvas.tsx:289-297                      |
| ss-1  | P3-1 | resize dialog aria-label "Row height"/"Column width" 硬编码英文 | overlay-controls.tsx:106                                |
| ss-1  | P3-2 | buildSpreadsheetGridViewport 每次渲染重算（非 memo）            | spreadsheet-grid.tsx:240-253                            |
| ss-1  | P3-3 | 单元格拖选无 pointercancel 守卫（window mouseup 依赖）          | spreadsheet-grid.tsx:258-288                            |
| ss-3  | P3-1 | undo/redo 按钮 disabled 不联动 canUndo/canRedo                  | toolbar-groups.tsx:44-55                                |
| ss-3  | P3-2 | unfreeze 按钮不联动 frozen 态；no-op 命令污染 undo 栈           | toolbar-groups.tsx:274-279、internal-state.ts:81-90     |
| ss-3  | P3-3 | FillSeriesCommand.seriesType 声明但 handler 忽略                | commands-style.ts:88-93、cell-operations.ts:258         |
| ss-4  | P3-1 | cell address/frozen 徽章无 aria-live                            | toolbar-status.tsx:10-17                                |
| ss-5  | P3-1 | 公式无求值引擎；公式单元格无 value 渲染空                       | table-shell.tsx:171                                     |
| ss-5  | P3-2 | 无 formula bar UI（setCellFormula 仅 host contract 可达）       | toolbar-groups.tsx（无公式入口）                        |
| ss-6  | P3-1 | ss-frozen-separator-col/row 分隔线死 CSS                        | canvas-styles.css:703-713                               |
| ss-7  | P3-1 | 选区操作日志硬编码英文（默认宿主非用户可见）                    | use-selection.ts:242-367                                |
| ss-7  | P3-2 | commitEditingCell 硬编码 100×26 边界与宿主维度不一致            | use-selection.ts:68-69,110                              |
| ss-7  | P3-3 | ss-selection-border 死 CSS 类                                   | canvas-styles.css:699                                   |
| ss-8  | P3-1 | use-keyboard 快捷键映射无直接单测（间接经 harness）             | use-keyboard.ts                                         |
| ss-8  | P3-2 | Home/End/PageUp/PageDown 导航缺失                               | spreadsheet-grid.tsx:303-360                            |
| ss-8  | P3-3 | Shift+方向键扩展选区缺失                                        | spreadsheet-grid.tsx:303-360                            |
| ss-9  | P3-1 | FindNext 无独立 UI 按钮（find 每次从头找）                      | find-replace-panel.tsx                                  |
| ss-9  | P3-2 | find-results 无 role=status/aria-live                           | find-replace-panel.tsx:51-55                            |
| ss-10 | P3-1 | undo/redo 后 dirty 恒 true                                      | history-handlers.ts:70,87                               |
| ss-10 | P3-2 | 'Nothing to undo/redo' 硬编码英文（默认宿主非用户可见）         | history-handlers.ts:63,79                               |
| ss-10 | P3-3 | rollback 无事务时返回 changed:true                              | history-handlers.ts:45-58                               |

## 3. 维护

- D3.2–D3.4 审计发现的 P2 按同模板追加登记（ID 顺延 DR-3+）；DR 集中修复（roadmap DR 行）消费本表后逐条勾销。
- 本表零悬挂声明：13 卡 P2 清单（fd-2 P2-1 / fd-7 P2-1）+ 10 卡 P2 清单（ss-1 P2-1 当场修复不路由 / ss-2 P2-1、P2-2 → DR-3、DR-4 / ss-4 P2-1 → DR-5 / ss-8 P2-1 当场修复不路由 / ss-9 P2-1 → DR-6）+ **7 卡 P2 清单（rd-1 P2-1 MA5 P3-09 当场修复不路由 / rd-2 P2-2 → DR-11 / rd-4 P2-3 → DR-7 / rd-5 P2-4 → DR-8 / rd-6 P2-5 → DR-9 / rd-7 P2-6 → DR-10）**已全部登记，卡内无未登记 P2。
