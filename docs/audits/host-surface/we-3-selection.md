# 审计卡：we-3 选区（word-editor-core + word-editor-renderers，D3.4 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-1315-3-round2-d34-word-editor-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` we-3 | 渲染器: `editor-store.ts` `EditorSelectionState` + `editor-canvas.tsx` onRangeStyleChange 接线 + selection host projection
> 契约基准: `docs/audits/host-surface/README.md` §1 word-editor 两包行（`docs/architecture/word-editor/design.md` 唯一 owner doc）

## 面身份

we-3 选区面：`EditorSelectionState`（18 字段）+ bridge `onRangeStyleChange` → store `setSelection`（部分合并）→ host projection `selection` + toolbar 选中态回显（aria-pressed/active）。表单参与：无。布局 or widget：状态面。

## 覆盖矩阵映射

| e2e spec                                                | 映射   |
| ------------------------------------------------------- | ------ |
| word-editor.spec.ts（格式按钮点击链路，无选区回显断言） | ~ 间接 |

（完整矩阵见 surface-inventory.md D3.4 增量登记节）

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                                                                                                                    | 证据                                                                                    | 发现 |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---- |
| 1   | Schema 契约                 | selection host projection schema（word-editor-manifest.ts:114-138）与 `EditorSelectionState`（editor-store.ts:6-24）字段一一对应（18 字段类型/可空性一致）✓；`runtime.canUndo/canRedo` 派生自 selection.undo/redo（design.md:161 一致） | word-editor-manifest.ts:114-138、editor-store.ts:6-44、use-word-editor-state.ts:132-146 | —    |
| 2   | RendererComponentProps 合规 | 选区状态经 store 订阅（page/ribbon/font/paragraph 各自窄 selector）；无直访 ✓                                                                                                                                                           | use-word-editor-state.ts:125-146、ribbon-toolbar.tsx:35-40                              | —    |
| 3   | 值所有权三态                | 选区为 bridge 驱动状态（local：rangeStyleChange 回调 → setSelection 合并）；无 controlled/scope 路径（host 只读投影）✓；`superscript/subscript ?? false` 默认（design.md:162 落地）✓；rowFlex/level/listType/listStyle `?? null` 合并 ✓ | editor-canvas.tsx:106-129、editor-store.ts:111-115                                      | —    |
| 4   | 表单参与                    | 无                                                                                                                                                                                                                                      | —                                                                                       | —    |
| 5   | DOM 与选择器契约            | toolbar 选中态经 aria-pressed（ToolbarButton active）✓；无新 data-slot                                                                                                                                                                  | toolbar/shared.tsx:45-60                                                                | —    |
| 6   | 嵌套 schema 分类            | 不适用（无嵌套面）                                                                                                                                                                                                                      | —                                                                                       | —    |
| 7   | 事件与 action 契约          | onRangeStyleChange 为 bridge 回调（非 schema 事件）；payload 字段全量透传（含 superscript/subscript）✓；无派发点                                                                                                                        | editor-canvas.tsx:106-129                                                               | —    |
| 8   | a11y                        | 选中态 aria-pressed 回显 ✓；无独立 a11y 问题                                                                                                                                                                                            | toolbar/shared.tsx:45-60                                                                | —    |
| 9   | i18n                        | 无文案面（状态值非文案）✓；颜色输入 aria-label 走 key ✓                                                                                                                                                                                 | font-controls.tsx:132-147                                                               | —    |
| 10  | 四态覆盖                    | 无选区（默认 selection 全 false/null）✓；全选样式态；undo/redo 布尔态驱动 disabled ✓；空文档选区（Hello World 占位）✓                                                                                                                   | editor-store.ts:26-44、font-controls.tsx:39-52                                          | —    |
| 11  | 异步生命周期                | 不适用（同步回调面）                                                                                                                                                                                                                    | —                                                                                       | —    |
| 12  | 组合宿主场景                | **e2e 缺口**：真实浏览器无「选区 → 回显」断言（word-editor.spec 仅点击格式按钮，不断言按钮 active 态；canvas-editor 选区回显链路依赖 rangeStyleChange 桥）→ Phase 5 新增场景（bug 73 专项：单测绿 ≠ 真机回显）                          | tests/e2e/word-editor.spec.ts:99-117                                                    | P2-1 |
| 13  | 样式契约                    | 无新契约                                                                                                                                                                                                                                | —                                                                                       | —    |
| 14  | React 19 规范               | setSelection 部分合并（无镜像）；selector 窄字段 ✓                                                                                                                                                                                      | editor-store.ts:111-115                                                                 | —    |
| 15  | 性能边界                    | selection 对象级订阅（ribbon/font/paragraph 各订阅整 selection 对象——每 rangeStyleChange 触发 3+ 组件重渲染，频率低可接受）；无热点                                                                                                     | ribbon-toolbar.tsx:35-40、font-controls.tsx:34-40                                       | —    |
| 16  | 测试质量                    | editor-canvas.test「superscript/subscript 写入 selection」+ editor-store.test（setSelection 合并）在案 ✓；**无 e2e 回显断言**（P2-1）                                                                                                   | editor-canvas.test.tsx:179-229、editor-store.test.ts                                    | P2-1 |
| 17  | 文档对照                    | design.md:161-162（currentPage 不投影 / superscript-subscript 快照）与 live 一致 ✓                                                                                                                                                      | design.md:161-162、use-word-editor-state.ts:132-146                                     | —    |
| 18  | 注册、包边界与 IO/安全红线  | 无 IO；边界无新问题 ✓                                                                                                                                                                                                                   | —                                                                                       | —    |
| H1  | host 契约                   | selection 投影 schema ↔ store 双向一致（核对见维度 1）✓；runtime.canUndo/canRedo 与 manifest 一致 ✓                                                                                                                                     | word-editor-manifest.ts:96-113,114-138                                                  | —    |
| H2  | 事务 undo                   | undo/redo 布尔态来自 bridge rangeStyleChange（canvas-editor 内部栈驱动）；工具栏 disabled 联动 ✓（第三方栈语义，见 we-1 H2）                                                                                                            | editor-canvas.tsx:106-129                                                               | —    |
| H3  | 拖拽                        | 不适用                                                                                                                                                                                                                                  | —                                                                                       | —    |
| H4  | 键盘                        | 快捷键映射 Ctrl+B/I/U/Z/Y/L/E/R/[ /] 在案（isEditable 守卫，见 we-2 P2-2 修复补测）——快捷键改变样式后回显依赖 bridge rangeStyleChange ✓                                                                                                 | use-word-editor-shortcuts.ts:45-104                                                     | —    |
| H5  | 剪贴板                      | 不适用                                                                                                                                                                                                                                  | —                                                                                       | —    |
| H6  | e2e 可操作性                | 缺口（P2-1）→ Phase 5 新增 selection 回显场景（真实浏览器：选区/样式切换 → 按钮 active 断言）                                                                                                                                           | —                                                                                       | P2-1 |
| H7  | MA4.3 缺口回归              | 无直接对应项；选区面行为测试在案（editor-store.test/editor-canvas.test）→ 收敛                                                                                                                                                          | —                                                                                       | —    |

## 发现清单

- [P2-1] **选区回显无真实浏览器 e2e**（格式按钮仅点击不断言 active 态；canvas-editor rangeStyleChange 桥回显链路真机行为未验证——bug 73 模式专项）→ 状态: **resolved via Phase 5 e2e**（`word-editor-recovery.spec.ts` selection echo 用例：键入 → toolbar-bold `aria-pressed` false→true 真机断言）
- [P3-1] selection.undo/redo 仅随 rangeStyleChange 刷新（样式无变化的纯 undo/redo 是否触发桥回调依赖 canvas-editor 内部行为，disabled 态可能滞后）→ 状态: 卡内记录（watch——Phase 5 bold 回显已证 rangeStyleChange 链路真机可用；undo/redo 禁用滞后维持 watch，无阻断证据）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景（Phase 5 新增）: playground `#/word-editor` 键入文本 → 选中 → 点击 bold → 按钮 active 态（aria-pressed）回显断言 + `__NOP_WORD_EDITOR_PROBE__` selection.bold 真机断言 | 结果: Phase 5 落地

## 修复记录

- 无代码修复（本面无 P0/P1/P2 实质缺陷）；Phase 5 e2e 场景为该面唯一缺口闭合动作

## Closure

- 卡状态 closed：2026-08-08 Phase 5 收口（全部 P0/P1 fixed、P2 显式路由 DR 零悬挂、P3 卡内记录、宿主场景 ≥1 在案）；plan 级 closure audit 由独立 fresh session 执行（记录见 plan `2026-08-08-1315-3` Closure 节）
