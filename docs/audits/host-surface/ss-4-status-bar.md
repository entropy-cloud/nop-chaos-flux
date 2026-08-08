# 审计卡：ss-4 状态栏（spreadsheet-renderers，D3.2 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-1315-1-round2-d32-spreadsheet-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` ss-4 | 注册定义: 同 ss-1（spreadsheet-page） | 渲染器: `spreadsheet-toolbar/toolbar-status.tsx`（`SpreadsheetToolbarStatus`）+ `page-renderer.tsx` 页头状态行（`buildSpreadsheetStatusLabel`）
> 契约基准: `docs/audits/host-surface/README.md` §1 spreadsheet 行（基准 = `report-designer/spreadsheet-canvas-css.md` + `report-designer/contracts.md`）

## 面身份

ss-4 状态栏面：`SpreadsheetToolbarStatus`（当前 cell address + 冻结徽章，data-slot: spreadsheet-toolbar-cell-address / spreadsheet-toolbar-frozen-badge）+ 页头状态行（`page-renderer.tsx:236` `buildSpreadsheetStatusLabel`：Active sheet + Selection kind，page-model.ts:16-17）。表单参与：无。widget 面。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                                                                                    | 证据                                                   | 发现     |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------- |
| 1   | Schema 契约                 | 状态栏为页头/工具栏派生展示（无 schema 字段）；cell address 派生自 selection + cellAddress()                                                                                                            | default-page-body.tsx:131、toolbar-status.tsx          | —        |
| 2   | RendererComponentProps 合规 | 纯 props（selectedCell/cellAddress/frozen）                                                                                                                                                             | toolbar-status.tsx:3-7                                 | —        |
| 3   | 值所有权三态                | cell address 由 selectedCell 派生（选中即显示）；frozen 由 activeSheet.frozen 派生（row/col >0 即真）——纯派生无本地态 ✓                                                                                 | default-page-body.tsx:132-135、toolbar-status.tsx:8-19 | —        |
| 4   | 表单参与                    | 无                                                                                                                                                                                                      | —                                                      | —        |
| 5   | DOM 与选择器契约            | data-slot: spreadsheet-toolbar-status / cell-address / frozen-badge（稳定选择器）✓                                                                                                                      | toolbar-status.tsx:9-17                                | —        |
| 6   | 嵌套 schema 分类            | 无                                                                                                                                                                                                      | —                                                      | —        |
| 7   | 事件与 action 契约          | 无（纯展示）                                                                                                                                                                                            | —                                                      | —        |
| 8   | a11y                        | cell address 纯文本 span（无 aria-live）——选中变化读屏不播报；frozen 徽章纯文本——记录为弱项（aria-live 增强候选）                                                                                       | toolbar-status.tsx:10-17                               | P3-1     |
| 9   | i18n                        | 冻结徽章 t('flux.spreadsheet.frozen') ✓；**页头状态行 buildSpreadsheetStatusLabel 硬编码英文**（'Active sheet: X \| Selection: Y'，page-model.ts:16-17 + page-renderer.tsx:236 用户可见）→ P2-1 路由 DR | page-model.ts:16-17、page-renderer.tsx:236             | P2-1     |
| 10  | 四态覆盖                    | 空 selection（kind none → cell address 空 + 无徽章）✓；无 activeSheet（'Unknown' 兜底 page-model.ts:9）✓；readOnly 无差异（状态栏只读展示）✓                                                            | toolbar-status.tsx:10-12、page-model.ts:8-10           | —        |
| 11  | 异步生命周期                | 无                                                                                                                                                                                                      | —                                                      | —        |
| 12  | 组合宿主场景                | report-designer-demo.spec.ts 用例 6（取消冻结按钮可见 = frozen 徽章态联动间接）；真缺口 = 独立宿主页 cell address 更新 + 徽章显隐（Phase 5）                                                            | report-designer-demo.spec.ts:198-202                   | 缺口在案 |
| 13  | 样式契约                    | 徽章样式 [data-slot='spreadsheet-toolbar-frozen-badge']（canvas-styles.css:394）✓                                                                                                                       | canvas-styles.css:394                                  | —        |
| 14  | React 19 规范               | 纯渲染 ✓                                                                                                                                                                                                | toolbar-status.tsx                                     | —        |
| 15  | 性能边界                    | 无 ✓                                                                                                                                                                                                    | —                                                      | —        |
| 16  | 测试质量                    | spreadsheet-toolbar.test.tsx:67-77（frozen 徽章文案）在案；cell address 显示无直接断言（间接）→ 记录                                                                                                    | spreadsheet-toolbar.test.tsx:67-77                     | —        |
| 17  | 文档对照                    | 状态栏契约无独立文档（页头状态行为 page-renderer 附属）→ owner doc 落地时登记（Phase 5）                                                                                                                | —                                                      | —        |
| 18  | 注册/边界/IO                | 无 IO ✓                                                                                                                                                                                                 | —                                                      | —        |
| H1  | host 契约                   | 状态栏消费 runtime readonly/canUndo/canRedo 不在此面（statusPath publication 在 page-renderer.tsx:209-222：SpreadsheetHostStatusSummary 全字段 in案）✓                                                  | page-renderer.tsx:209-222                              | —        |
| H2  | 事务 undo                   | 无                                                                                                                                                                                                      | —                                                      | —        |
| H3  | 拖拽                        | 无                                                                                                                                                                                                      | —                                                      | —        |
| H4  | 键盘                        | 无                                                                                                                                                                                                      | —                                                      | —        |
| H5  | 剪贴板                      | 无                                                                                                                                                                                                      | —                                                      | —        |
| H6  | e2e 可操作性                | 真缺口 = 独立宿主页选中 cell → address 文案 + 冻结徽章显隐（Phase 5）                                                                                                                                   | —                                                      | 缺口在案 |
| H7  | MA4.3 缺口回归              | 无专属缺口（toolbar-status 间接测试在案）                                                                                                                                                               | spreadsheet-toolbar.test.tsx                           | —        |

## 发现清单

- [P2-1] 页头状态行 `buildSpreadsheetStatusLabel` 硬编码英文（`page-model.ts:16-17`，消费 `page-renderer.tsx:236` 用户可见）→ 状态: **DR-5 路由**（`round2-dr-adjudication.md` §1，Phase 4 登记）
- [P3-1] cell address / frozen 徽章无 aria-live（选中/冻结变化读屏不播报）→ 状态: 卡内记录（a11y 增强候选）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景（Phase 5 新增）: 独立宿主页点击单元格 → spreadsheet-toolbar-cell-address 文案 = A1 类地址；冻结后 frozen-badge 出现 → 解冻消失 | 断言: data-slot 文本 + 计数 | 结果: pass（`tests/e2e/spreadsheet-demo.spec.ts:77` 地址 + 冻结徽章断言，10/10 全绿）

## 修复记录

- 无 P0/P1（本面零修复）；P2-1 → DR-5 路由（Phase 4 登记）；P3 卡内记录。

## Closure

- 独立 closure audit: **pass**（独立 fresh session 于 2026-08-09 正式收口，轮 1 fail（1 Major + 3 Minor 全修复）→ 轮 2 pass；证据见 plan `docs/plans/2026-08-08-1315-1-round2-d32-spreadsheet-surface-audit.md` Closure 节与 `docs/logs/2026/08-08.md` D3.2 节「closure 复核更正」）
