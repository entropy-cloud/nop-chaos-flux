# 审计卡：rd-2 字段拖拽（report-designer-renderers，D3.3 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-1315-2-round2-d33-report-designer-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` rd-2 | 注册定义: `renderers.tsx:224-234`（report-field-panel）| 渲染器: `report-field-panel.tsx`（ReportFieldPanel + drag payload 三函数）+ `field-panel-renderer.tsx`（ReportFieldPanelRenderer）
> 契约基准: `docs/audits/host-surface/README.md` §1 report-designer 行（owner docs 清单同 rd-1；`inspector-design.md` §11-13 字段模型 + `contracts.md` §4.3 字段源模型）

## 面身份

rd-2 字段拖拽面：`REPORT_FIELD_DRAG_MIME` payload 契约（create/write/readReportFieldDragPayload 三函数）+ 字段面板（源/组/项 data-slot 树）+ 拖放落点（canvas onDrop → setCellValue + dropFieldToTarget + 失败回滚链）+ 键盘插入等价路径（renderer insert 按钮 → actionScope 派发）。表单参与：无。布局 or widget：widget。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                                                                                                                                            | 证据                                                                                               | 发现 |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---- |
| 1   | Schema 契约                 | report-field-panel 注册 fields 6 项（title/fieldSources/emptyLabel/showFieldSourceHeader/dragEnabled/keyboardInsertEnabled）；schemaFieldSources 优先、scopeFieldSources 兜底；空源 → emptyLabel 空态                                                           | renderers.tsx:224-234、field-panel-renderer.tsx:37-52,148-150                                      | —    |
| 2   | RendererComponentProps 合规 | 从 props.props/meta/regions/helpers 取数；useOwnScopeSelector（fieldSources/designer/selectionTarget 引用比较）；无 store 直访                                                                                                                                  | field-panel-renderer.tsx:20-52、report-field-panel.tsx:72-130                                      | —    |
| 3   | 值所有权三态                | 字段源 = designer core snapshot（local）+ schema 静态（local）+ scope 投影（派生）；payload 构造 = 每次渲染派生（无状态残留）；drop 后 fieldDrag 状态经 dispatch 写入 core（active:false + payload 保留供重放）                                                 | report-field-panel.tsx:88-98、core-dispatch.ts:114-128                                             | —    |
| 4   | 表单参与                    | 无（拖拽面非表单）                                                                                                                                                                                                                                              | —                                                                                                  | —    |
| 5   | DOM 与选择器契约            | data-slot 稳定：report-field-panel-shell/source/source-label/group/items/item/item-label/item-type/drag-handle + data-field-id/data-field-source-id 数据标记；css 锚定 report-field-panel.css（item hover/拖拽 cursor）                                         | report-field-panel.tsx:80-130、report-field-panel.css                                              | —    |
| 6   | 嵌套 schema 分类            | 无内嵌 schema（字段项为数据驱动渲染）                                                                                                                                                                                                                           | —                                                                                                  | —    |
| 7   | 事件与 action 契约          | 无 schema 事件派发；键盘插入经 actionScope.resolve('report-designer:dropFieldToTarget') + invoke 三参 ctx（runtime/scope/actionScope/evaluationBindings 完整）→ host 面事件 ctx 人工核对通过；无 component:\* 句柄                                              | field-panel-renderer.tsx:79-107                                                                    | —    |
| 8   | a11y                        | item li draggable（原生可拖）；insert 按钮 aria-label t()（insertFieldToSelection）；无拖拽键盘等价（insert 按钮为等价路径）；面板 li 无 tabIndex（不可键盘聚焦，P3-3）                                                                                         | report-field-panel.tsx:90-120、field-panel-renderer.tsx:173-188                                    | P3-3 |
| 9   | i18n                        | insert/emptyLabel/aria-label 全 t()；零中文硬编码（rg 兜底）；拖放失败消息硬编码英文（见 P2-2）                                                                                                                                                                 | field-panel-renderer.tsx:52,179-186、report-field-panel.tsx:114-119                                | P2-2 |
| 10  | 四态覆盖                    | 空字段源（emptyLabel）+ 无 selection（insert disabled）+ readOnly（page 层隐藏 field panel）+ 拖放失败（rollback + env.notify）                                                                                                                                 | field-panel-renderer.tsx:148-150、page-renderer.tsx:524-528、report-spreadsheet-canvas.tsx:213-229 | —    |
| 11  | 异步生命周期                | insert 经 invoke await + 失败 catch（handleKeyboardInsertError → reportRuntimeHostIssue + env.notify）；drop 链全 await + 失败回滚（previousCellValue 恢复或 clearCells）                                                                                       | field-panel-renderer.tsx:71-124、report-spreadsheet-canvas.tsx:157-231                             | —    |
| 12  | 组合宿主场景                | 既有用例 2（4 项渲染 + 样式断言）+ 用例 8（dragTo 写值 `${orderId}` + data-cell-bound）真机通过；Phase 5 宿主页补键盘插入 + 拖放组合场景                                                                                                                        | tests/e2e/report-designer-demo.spec.ts:33-70,214-229                                               | —    |
| 13  | 样式契约                    | widget 自样式（面板 item 边框/圆角/过渡/拖拽 cursor）；marker 类 nop-report-field-panel；CSS 变量                                                                                                                                                               | report-field-panel.css                                                                             | —    |
| 14  | React 19 规范               | 无冗余 useCallback/useMemo（createFieldPayload 每次派生小对象，可接受）；无 effect 镜像                                                                                                                                                                         | field-panel-renderer.tsx:54-56                                                                     | —    |
| 15  | 性能边界                    | 面板字段列表小规模直接渲染；payload JSON.stringify 仅 dragstart 时；无监听器泄漏（拖放为 React 合成事件）                                                                                                                                                       | report-field-panel.tsx:96-99                                                                       | —    |
| 16  | 测试质量                    | manifest-and-helpers.test（payload 构造/写入/读取含畸形 JSON 与 shape 校验拒绝）；field-panel-renderer.test（键盘插入禁用/启用 + 空态）；report-spreadsheet-canvas.test（drop 写值 + **回滚路径**）；e2e 用例 2/8 真机断言在案                                  | packages/report-designer-renderers/src/\*_/_.test.{ts,tsx}                                         | —    |
| 17  | 文档对照                    | contracts.md §4.3 字段源模型 + §5.3 字段拖放映射器与 adapters.ts FieldDropAdapter/FieldSourceProvider 一致；FieldDragPayload（types.ts:87-92）与 manifest fieldDragPayloadShape（report-designer-manifest.ts:135-143）一致                                      | docs/architecture/report-designer/contracts.md:414-453,605-622                                     | —    |
| 18  | 注册/边界/IO                | INV-1 零命中（无浏览器 IO）；包边界合规                                                                                                                                                                                                                         | D3.3 live 跑（2026-08-08）                                                                         | —    |
| H1  | host 契约                   | dropFieldToTarget manifest args（field: fieldDragPayloadShape + target: cellOrRangeTargetShape）↔ action provider validateMethodPayload ↔ core dispatch 一致；**非法 payload（target 非 cell/range）拒绝有测试**（host-action-provider.test.ts:127-143）        | report-designer-manifest.ts:135-154、host-action-provider.test.ts:127-143                          | —    |
| H2  | 事务 undo                   | dropFieldToTarget 成功入 undo 栈（pushUndoEntry）；失败回滚 = spreadsheet 值恢复（不入 designer undo——文档未变，语义正确）                                                                                                                                      | core-dispatch.ts:78-129、report-spreadsheet-canvas.tsx:189-212                                     | —    |
| H3  | 拖拽完整性                  | HTML5 DnD（浏览器托管生命周期，pointercancel 不适用）；dragstart 写 payload + text/plain label 兜底；drop 落点 = interactions dropTargetCell（H3 索引经 spreadsheet 面已审）；拖拽中状态清理 = onFieldDragStart 设 draggingField + drop 后清（demo 页 finally） | report-field-panel.tsx:23-30,96-99、report-designer-demo.tsx:382-402                               | —    |
| H4  | 键盘                        | renderer insert 按钮（isEditable 类守卫 = canInsertToSelection cell/range）+ disabled 联动；aria-label 语义化                                                                                                                                                   | field-panel-renderer.tsx:58-60,173-188                                                             | —    |
| H5  | 剪贴板                      | 无（拖拽面不涉剪贴板）                                                                                                                                                                                                                                          | —                                                                                                  | —    |
| H6  | e2e 可操作性                | 既有 dragTo 用例真机通过（payload 真机解析 + drop 落点 + data-cell-bound）；Phase 5 补键盘插入 + 失败回滚组合场景                                                                                                                                               | tests/e2e/report-designer-demo.spec.ts:214-229                                                     | —    |
| H7  | MA4.3 缺口回归              | MA43-P0-05 readReportFieldDragPayload / MA43-P1-05 create+writeReportFieldDragPayload 直接测试在案（manifest-and-helpers.test.ts:108-218）→ 收敛                                                                                                                | 同上                                                                                               | —    |

## 发现清单

- [P2-2] 字段拖放失败消息硬编码英文 3 处（用户可见 via env.notify warning）：'Field drop cancelled'（report-spreadsheet-canvas.tsx:172）、'Field drop failed before designer update'（:177）、'Field drop rollback failed'（:206）→ 状态: 登记 DR-11（跨面集中修复 i18n 化）
- [P3-1] drop 到 grid 外静默 no-op 无用户反馈（dropTargetCell 为空 → 回调不触发，与 rd-1 P3-1 同源）→ 状态: 卡内记录
- [P3-2] readReportFieldDragPayload 兜底 `core.getSnapshot().fieldDrag.payload`（report-spreadsheet-canvas.tsx:158）——drop 后 payload 保留于 core，重放路径依赖该兜底（有意设计）→ 状态: 卡内记录
- [P3-3] 面板 li 项无 tabIndex/键盘拖拽等价（Enter/Space 在 demo canvas 有 drop 兜底；renderer 版经 insert 按钮）→ 状态: 卡内记录（两宿主键盘面等价性维持，同 rd-1 P3-3）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景（既有）: 用例 2（字段面板 4 项渲染 + 样式）+ 用例 8（`field.dragTo(targetCell)` → `${orderId}` + `data-cell-bound="true"`）| 断言: data-slot 计数 + getComputedStyle + td 文本 + data 属性 | 结果: pass
- 场景（Phase 5 新增）: 宿主页键盘插入（选中 cell → insert 按钮 → cell 值 `${orderId}` + data-cell-bound）| 断言: 同用例 8 数据属性 | 结果: pass（`report-designer-host.spec.ts` 2026-08-08 全绿）

## 修复记录

- 本面无行为修复（P2-2 路由 DR-11；P3 卡内记录）

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
