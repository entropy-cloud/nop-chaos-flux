# 审计卡：ss-3 工具栏（spreadsheet-renderers，D3.2 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-1315-1-round2-d32-spreadsheet-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` ss-3 | 注册定义: `renderers.tsx:15`（toolbar/body/dialogs region） | 渲染器: `spreadsheet-toolbar.tsx` + `spreadsheet-toolbar/toolbar-groups.tsx` + `toolbar-button.tsx`
> 契约基准: `docs/audits/host-surface/README.md` §1 spreadsheet 行（基准 = `report-designer/spreadsheet-canvas-css.md` + `report-designer/contracts.md`；owner doc gap 裁决见 ss-1）

## 面身份

ss-3 工具栏面：`SpreadsheetToolbar`（toolbar 容器）→ `SpreadsheetToolbarGroups`（13 组工具按钮：undo/redo、剪贴板、字重、对齐、背景色、字体色、合并、填充、行列结构、批注/查找、冻结）+ `SpreadsheetToolbarStatus`（ss-4）+ `SpreadsheetFindReplacePanel`（ss-9）。10-02 rd-\* BEM 死类已清理（plan `2026-08-08-0819-3`，16 处，live 无回潮）。表单参与：无。widget 面。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                                                                                                                          | 证据                                                                                                  | 发现         |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------ |
| 1   | Schema 契约                 | toolbar 区域经 page-renderer props.regions.toolbar 渲染（default-page-body 内置 SpreadsheetToolbar 为 fallback）；SpreadsheetToolbarProps 全显式 props（无 schema 直连）                                                                      | page-renderer.tsx:188-193、spreadsheet-toolbar/types.ts:16-67                                         | —            |
| 2   | RendererComponentProps 合规 | 纯 props 组件（无 hooks/无 store）；default-page-body 注入 interactions 回调                                                                                                                                                                  | default-page-body.tsx:151-199                                                                         | —            |
| 3   | 值所有权三态                | 按钮态派生：disabled = hasSelection/readOnly 组合；active = currentCellStyle 对比（bold/italic/underline/align/swatch）——纯派生无本地态                                                                                                       | toolbar-groups.tsx:35-39,44-49                                                                        | —            |
| 4   | 表单参与                    | 无                                                                                                                                                                                                                                            | —                                                                                                     | —            |
| 5   | DOM 与选择器契约            | data-slot: spreadsheet-toolbar/group/separator/toolbar-status/cell-address/frozen-badge；按钮经 ToolbarButton（label → aria-label + title）；10-02 死类无回潮（全 data-slot + ss-\* swatch 类）                                               | toolbar-groups.tsx:30-32,43、canvas-styles.css:394                                                    | —            |
| 6   | 嵌套 schema 分类            | 无（纯按钮组）                                                                                                                                                                                                                                | —                                                                                                     | —            |
| 7   | 事件与 action 契约          | 无 schema 事件派发（按钮 onClick → interactions handle* → bridge.dispatch 命令）；fire() 显式忽略 Promise；无 component:* 句柄                                                                                                                | default-page-body.tsx:160-198、fire.ts:1-3                                                            | —            |
| 8   | a11y                        | ToolbarButton label 即 aria-label/title（t() 全 i18n）；icon 按钮可访问名完整；无 roving tabindex（按钮组原生 tab 顺序，可接受）                                                                                                              | toolbar-button.tsx、toolbar-groups.tsx                                                                | —            |
| 9   | i18n                        | 全部按钮 label 走 t()（flux.spreadsheet.\*，双 locale 在案）；report-designer 用例 6 断言本地化文案（撤销 Ctrl+Z 等）pass                                                                                                                     | toolbar-groups.tsx:44-280、report-designer-demo.spec.ts:198-202                                       | —            |
| 10  | 四态覆盖                    | readOnly 传导：mutationDisabled 禁全部变更按钮；find 按钮不禁（readOnly 可查找）✓；hasSelection 缺省禁用（无选中时 copy/clear/style 全禁）✓；undo/redo 仅禁 readOnly（不联动 canUndo/canRedo，见 P3-1）；unfreeze 不联动 frozen 态（见 P3-2） | toolbar-groups.tsx:44-280                                                                             | P3-1/P3-2    |
| 11  | 异步生命周期                | 按钮处理函数经 fire() 忽略失败（错误落 addLog，默认宿主无 log 面板 → 静默）——记录：错误反馈依赖宿主 onLog 接线                                                                                                                                | default-page-body.tsx:160-198                                                                         | —            |
| 12  | 组合宿主场景                | report-designer-demo.spec.ts 用例 1/6（toolbar 可见 + 布局单行 + 本地化按钮名）+ exploratory subagent-a（可见 + 零 error）；真缺口 = 独立宿主页按钮点击行为（undo/redo/freeze/merge/fill 等经 toolbar 派发）                                  | tests/e2e/report-designer-demo.spec.ts:165-202、exploratory/subagent-a-independent-review.spec.ts:413 | pass（间接） |
| 13  | 样式契约                    | 布局由 canvas-styles.css [data-slot='spreadsheet-toolbar'] 锚定（flex nowrap 单行断言在案）；swatch 类 ss-style-swatch-\* 自样式面；CSS 变量 + 主题无关                                                                                       | canvas-styles.css:361-460、report-designer-demo.spec.ts:168-190                                       | —            |
| 14  | React 19 规范               | 无本地 state/effect；纯渲染组件 ✓                                                                                                                                                                                                             | toolbar-groups.tsx                                                                                    | —            |
| 15  | 性能边界                    | 无重计算（派生仅 props 对比）✓                                                                                                                                                                                                                | —                                                                                                     | —            |
| 16  | 测试质量                    | spreadsheet-toolbar.test.tsx 7 用例（disabled 组合/冻结徽章/find panel 显隐）+ context-menu 族；按钮→命令映射无逐按钮断言（间接经 default-page-body）→ 记录                                                                                   | spreadsheet-toolbar.test.tsx                                                                          | —            |
| 17  | 文档对照                    | toolbar 契约（SpreadsheetToolbarProps）与 default-page-body 消费方逐字段双向核对一致（types.ts:16-67 ↔ default-page-body.tsx:153-197）                                                                                                        | types.ts ↔ default-page-body.tsx                                                                      | —            |
| 18  | 注册/边界/IO                | 无 IO；包边界合规                                                                                                                                                                                                                             | —                                                                                                     | —            |
| H1  | host 契约                   | 工具栏动作 = 命令直派（不经 action-provider namespace——toolbar 与 host contract 解耦）；host contract 66 方法含 toolbar 全部命令面（双向核对一致）                                                                                            | default-page-body.tsx:160-198                                                                         | —            |
| H2  | 事务 undo                   | undo/redo 按钮 dispatch spreadsheet:undo/redo（空栈 ok:false 经 reportCommandResult → addLog）——无 canUndo/canRedo 禁用联动（P3-1）                                                                                                           | use-sheet-commands.ts:161-169                                                                         | P3-1         |
| H3  | 拖拽                        | 无（按钮族）                                                                                                                                                                                                                                  | —                                                                                                     | —            |
| H4  | 键盘                        | 按钮原生 Tab 可达 + Enter/Space 激活（ToolbarButton）；快捷键经 use-keyboard（ss-8）                                                                                                                                                          | toolbar-button.tsx                                                                                    | —            |
| H5  | 剪贴板                      | copy/cut/paste/clear 按钮 → useClipboard（ss-2 H5）                                                                                                                                                                                           | use-clipboard.ts                                                                                      | —            |
| H6  | e2e 可操作性                | 既有 2 spec 间接覆盖；真缺口 = 独立宿主页按钮行为（undo/redo/freeze/merge/fill/insert 等点击 → data 断言，Phase 5）                                                                                                                           | —                                                                                                     | 缺口在案     |
| H7  | MA4.3 缺口回归              | 无专属缺口（toolbar 测试在案）                                                                                                                                                                                                                | spreadsheet-toolbar.test.tsx                                                                          | —            |

## 发现清单

- [P3-1] undo/redo 按钮 disabled 不联动 canUndo/canRedo（`toolbar-groups.tsx:44-55` 仅 mutationDisabled）→ 空栈点击 ok:false 'Nothing to undo' 落 addLog（默认宿主无反馈）；体验项 → 状态: 卡内记录（DR 候选）
- [P3-2] unfreeze 按钮不联动 frozen 态（`toolbar-groups.tsx:274-279` 仅 mutationDisabled）→ 无冻结时点击产生 no-op 命令污染 undo 栈 + dirty 误标（applySimpleDocumentMutation 无条件 pushUndo，`internal-state.ts:81-90` 机制级，10 面共享）→ 状态: 卡内记录（与 ss-6 P3 互见）
- [P3-3] `FillSeriesCommand.seriesType` 声明（host 契约 formatting:211-235 + commands-style.ts:88-93）但 handler 忽略（`applyFillSeries` 无 seriesType 参数，cell-operations.ts:258）→ 'auto' 语义无实现（无求值引擎前等价 linear）→ 状态: 卡内记录
- [P3-4] 按钮错误反馈依赖宿主 onLog 接线（fire() 吞错 + default-page-body 无 onLog 消费）→ 状态: 卡内记录（宿主接线改进候选）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景（既有）: `report-designer-demo.spec.ts` 用例 6（toolbar 布局单行 + 本地化按钮名 + 数量 >10）| 断言: getComputedStyle + getByRole 文案 | 结果: pass（宿主归属 report-designer）
- 场景（Phase 5 新增）: 独立宿主页单元格输入 → 工具栏 Bold 点击 → td 样式类 ss-bold 断言；冻结按钮 → data-cell-frozen 断言；undo/redo 按钮往返 | 断言: td classList + data 标记 + 文本 | 结果: 待 Phase 5

## 修复记录

- 无 P0/P1/P2（本面零修复）；P3 卡内记录。

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
