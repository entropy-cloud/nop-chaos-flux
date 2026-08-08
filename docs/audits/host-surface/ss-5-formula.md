# 审计卡：ss-5 公式（spreadsheet-core + spreadsheet-renderers，D3.2 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-1315-1-round2-d32-spreadsheet-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` ss-5 | 注册定义: `commands-base.ts:36`（SetCellFormulaCommand）+ host 契约 `spreadsheet-host-method-contracts-core.ts:52`（setCellFormula） | 渲染器: `command-handlers/cell-handlers.ts:55` + `core/cell-operations.ts:52`
> 契约基准: `docs/audits/host-surface/README.md` §1 spreadsheet 行（基准 = `report-designer/spreadsheet-canvas-css.md` + `report-designer/contracts.md`）

## 面身份

ss-5 公式面：`spreadsheet:setCellFormula` 命令链（host contract setCellFormula → action-provider → `handleSetCellFormula` → `applySetCellFormula` 存储/删除 formula 字段）+ 公式语义（**无求值引擎——存储型公式**，值需宿主/导出侧求值，设计限制）。表单参与：无。core 命令面。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                                                                                   | 证据                                                                                              | 发现     |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------- |
| 1   | Schema 契约                 | SetCellFormulaCommand（cell + formula?: string）↔ host contract setCellFormula（cellRefShape + formula union string/null, optional）↔ `applySetCellFormula`（undefined 删字段 / 有值存字段）三向一致 ✓ | commands-base.ts:36-40、spreadsheet-host-method-contracts-core.ts:52-62、cell-operations.ts:52-82 | —        |
| 2   | RendererComponentProps 合规 | 无渲染面组件（命令面）                                                                                                                                                                                 | —                                                                                                 | —        |
| 3   | 值所有权三态                | formula 为文档字段（CellDocument.formula types.ts:103）；cell.value 不随 formula 自动计算（无求值器）——公式单元格无 value 时网格渲染空（见 P3-1）                                                      | cell-operations.ts:52-82、table-shell.tsx:171                                                     | P3-1     |
| 4   | 表单参与                    | 无                                                                                                                                                                                                     | —                                                                                                 | —        |
| 5   | DOM 与选择器契约            | 无专属 DOM（公式经 cell 值展示）                                                                                                                                                                       | —                                                                                                 | —        |
| 6   | 嵌套 schema 分类            | 无                                                                                                                                                                                                     | —                                                                                                 | —        |
| 7   | 事件与 action 契约          | 命令经 host contract invoke（action-provider 分支完整）；无 schema 事件                                                                                                                                | host-action-provider.ts:57-89                                                                     | —        |
| 8   | a11y                        | 无                                                                                                                                                                                                     | —                                                                                                 | —        |
| 9   | i18n                        | 无（命令面无文案）                                                                                                                                                                                     | —                                                                                                 | —        |
| 10  | 四态覆盖                    | formula=undefined 删字段（含不存在 cell 场景：ensureSheetCells 后 rest=existing undefined → newCell=rest，无副作用）✓；空字符串 formula 存空串（宿主应避免，记录）                                     | cell-operations.ts:61-73                                                                          | —        |
| 11  | 异步生命周期                | 无（同步命令）                                                                                                                                                                                         | —                                                                                                 | —        |
| 12  | 组合宿主场景                | 现有 spec 零公式面场景 → 真缺口 = 独立宿主页公式存储/清除（Phase 5）                                                                                                                                   | —                                                                                                 | 缺口在案 |
| 13  | 样式契约                    | 无                                                                                                                                                                                                     | —                                                                                                 | —        |
| 14  | React 19 规范               | 无（命令面）                                                                                                                                                                                           | —                                                                                                 | —        |
| 15  | 性能边界                    | 无求值 → 无计算热点；文档快照 undo 模型对公式文档体积敏感（快照全量复制，通用限制记录）                                                                                                                | internal-state.ts:25-27                                                                           | —        |
| 16  | 测试质量                    | core-basics.test.ts:140-165（set/remove formula）在案；host contract invoke 公式路径无直接测试 → H7 记录                                                                                               | core-basics.test.ts:140-165                                                                       | H7-1     |
| 17  | 文档对照                    | 公式语义（存储型/无求值）无文档化 → owner doc 落地时登记设计限制（Phase 5）                                                                                                                            | —                                                                                                 | —        |
| 18  | 注册/边界/IO                | 无 IO ✓                                                                                                                                                                                                | —                                                                                                 | —        |
| H1  | host 契约                   | setCellFormula 方法声明/校验/派发双向一致（见 #1）✓；无 formula bar UI（setCellFormula 仅 host contract 可达，toolbar 无公式入口）→ P3-2                                                               | toolbar-groups.tsx（无 formula 按钮）                                                             | P3-2     |
| H2  | 事务 undo                   | setCellFormula 走 applySimpleDocumentMutation 入 undo 栈 ✓（undo 恢复公式字段）                                                                                                                        | internal-state.ts:81-90                                                                           | —        |
| H3  | 拖拽                        | 无                                                                                                                                                                                                     | —                                                                                                 | —        |
| H4  | 键盘                        | 无（无公式编辑 UI）                                                                                                                                                                                    | —                                                                                                 | —        |
| H5  | 剪贴板                      | ClipboardCell.formula 字段（types.ts:234）在案（copy/paste 携带公式，clipboard-handlers 覆盖）→ 记录                                                                                                   | types.ts:231-239、clipboard-handlers.ts                                                           | —        |
| H6  | e2e 可操作性                | 真缺口 = 独立宿主页公式写入（seed 公式经宿主按钮/host invoke → cell[data-row][data-col] 文本或 formula 断言，Phase 5）                                                                                 | —                                                                                                 | 缺口在案 |
| H7  | MA4.3 缺口回归              | 无 MA4.3 专属缺口（formula 命令测试在案）；host contract invoke 公式路径无直接测试 → 记录维持                                                                                                          | core-basics.test.ts:140-165                                                                       | H7-1     |

## 发现清单

- [P3-1] 公式单元格无求值显示（`table-shell.tsx:171` `cell?.value != null ? String(cell.value) : ''`——公式字段不被渲染；无求值引擎，value 为空时单元格空白）→ 状态: 卡内记录（设计限制：存储型公式；求值/显示归 DR 或后续能力扩展）
- [P3-2] 无 formula bar UI（`toolbar-groups.tsx` 无公式入口；setCellFormula 仅 host contract/命令面可达）→ 状态: 卡内记录（能力缺口记录，非缺陷）
- [H7-1] host contract invoke 公式路径无直接测试 → 状态: 卡内记录维持

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景（Phase 5 新增）: 独立宿主页 seed 含 formula 单元格（经宿主按钮 dispatch setCellFormula → 单元格 formula 存储断言）| 断言: 宿主页暴露公式按钮或经 window hook 读取 core.exportDocument() | 结果: 待 Phase 5

## 修复记录

- 无 P0/P1/P2（本面零修复）；P3 卡内记录 + 设计限制登记 owner doc（Phase 5）。

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
