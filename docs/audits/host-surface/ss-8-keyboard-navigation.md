# 审计卡：ss-8 键盘导航（spreadsheet-renderers，D3.2 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-1315-1-round2-d32-spreadsheet-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` ss-8 | 注册定义: 同 ss-1 | 渲染器: `spreadsheet-grid.tsx:303-360`（grid 根 keydown：方向键/Enter/F2/键入）+ `spreadsheet-interactions/use-keyboard.ts`（全局快捷键：Ctrl+C/X/V/Z/Y/B/I/U/F/Delete/Escape）+ `use-selection.ts`（commitEditingCell）
> 契约基准: `docs/audits/host-surface/README.md` §1 spreadsheet 行（基准 = `report-designer/spreadsheet-canvas-css.md` + `report-designer/contracts.md`）

## 面身份

ss-8 键盘导航面：双层键盘路径——grid 根 keydown（isEditable/editingCell 守卫 + moveSelection clamp + keyboardCellRef 焦点还原）与 window keydown 快捷键（isEditableTarget 输入目标排除，22-02 家族先例）。表单参与：无。widget 面。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                                                                                                                                                                   | 证据                                                 | 发现           |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------- |
| 1   | Schema 契约                 | 键盘路径无 schema 参与（grid 根 + window 监听）✓                                                                                                                                                                                                                                       | spreadsheet-grid.tsx:303-360、use-keyboard.ts        | —              |
| 2   | RendererComponentProps 合规 | 移动/编辑回调全经 props ✓                                                                                                                                                                                                                                                              | spreadsheet-grid.tsx:303-360                         | —              |
| 3   | 值所有权三态                | keyboardCellRef 为本地导航引用（选中提交经 onCellClick → 命令）；无状态镜像 ✓                                                                                                                                                                                                          | spreadsheet-grid.tsx:113-117,163-173                 | —              |
| 4   | 表单参与                    | 无                                                                                                                                                                                                                                                                                     | —                                                    | —              |
| 5   | DOM 与选择器契约            | 移动后焦点还原 td[data-row][data-col]（requestAnimationFrame focus）✓；aria-activedescendant 同步 ✓                                                                                                                                                                                    | spreadsheet-grid.tsx:163-173                         | —              |
| 6   | 嵌套 schema 分类            | 无                                                                                                                                                                                                                                                                                     | —                                                    | —              |
| 7   | 事件与 action 契约          | 快捷键处理经 invokeWithCatch（错误落 onCommandError → addLog，abort 感知）✓；无 schema 事件 ✓                                                                                                                                                                                          | use-keyboard.ts:14-16,47-106                         | —              |
| 8   | a11y                        | grid 根可聚焦（tabIndex=0）✓；方向键移动 + Enter/F2 编辑（Excel 等价路径）✓；快捷键在输入目标内不劫持（isEditableTarget）✓；**Escape 关闭面板被输入目标守卫短路（P2-1）**                                                                                                              | use-keyboard.ts:4-12,44,103-106                      | P2-1           |
| 9   | i18n                        | 无文案 ✓                                                                                                                                                                                                                                                                               | —                                                    | —              |
| 10  | 四态覆盖                    | readOnly：Ctrl+X/V/Z/Y/B/I/U/Delete 全守卫 return ✓；Ctrl+C/F/Escape 可用 ✓；编辑中 grid 根短路 ✓；Delete 排除 input 目标 ✓                                                                                                                                                            | use-keyboard.ts:47-106、spreadsheet-grid.tsx:303-306 | —              |
| 11  | 异步生命周期                | 快捷键处理 async 全 catch ✓（无裸 Promise）                                                                                                                                                                                                                                            | use-keyboard.ts:14-16                                | —              |
| 12  | 组合宿主场景                | 现有 spec 零键盘导航场景 → 真缺口 = 独立宿主页方向键移动/Enter 提交/键入编辑/Ctrl+Z 撤销（Phase 5）                                                                                                                                                                                    | —                                                    | 缺口在案       |
| 13  | 样式契约                    | 无（交互面）                                                                                                                                                                                                                                                                           | —                                                    | —              |
| 14  | React 19 规范               | window 监听 useEffect 单次绑定 + 全依赖列全 ✓；无镜像 ✓                                                                                                                                                                                                                                | use-keyboard.ts:111-125                              | —              |
| 15  | 性能边界                    | keydown 高频路径全同步轻量 ✓；focus 还原 rAF 批处理 ✓                                                                                                                                                                                                                                  | spreadsheet-grid.tsx:163-173                         | —              |
| 16  | 测试质量                    | grid-editing.test.tsx（Enter/Escape/F2 路径）+ grid-interactions.test.tsx（移动/编辑 dispatch 断言）在案；**use-keyboard 快捷键映射无直接测试（间接经 harness）→ 记录**；P2-1 复现测试点（Escape 关面板）                                                                              | grid-editing.test.tsx、grid-interactions.test.tsx    | P2-1           |
| 17  | 文档对照                    | 键盘契约（快捷键表）无文档化 → owner doc 登记（Phase 5）                                                                                                                                                                                                                               | —                                                    | —              |
| 18  | 注册/边界/IO                | 无 IO ✓                                                                                                                                                                                                                                                                                | —                                                    | —              |
| H1  | host 契约                   | 键盘动作 = 命令直派（Ctrl+Z → undo 等）✓；host contract 方法面覆盖键盘全命令 ✓                                                                                                                                                                                                         | use-keyboard.ts:47-106                               | —              |
| H2  | 事务 undo                   | Ctrl+Z/Y 经 handleUndo/handleRedo（空栈 ok:false 落 log）✓；事务边界 ss-10                                                                                                                                                                                                             | use-keyboard.ts:62-74                                | —              |
| H3  | 拖拽                        | 无（键盘面）                                                                                                                                                                                                                                                                           | —                                                    | —              |
| H4  | 键盘                        | **isEditableTarget 排除输入目标 ✓（22-02 家族先例）**；grid 根 editingCell 守卫 ✓；Ctrl+B/I/U 样式快捷键 ✓；Ctrl+F 开关查找 ✓；Delete/Backspace 清除选中范围（排除 input）✓；Escape 关闭面板（P2-1 缺陷）；Home/End/PageUp/PageDown 扩展缺失（P3-2）；Shift+方向键扩展选区缺失（P3-3） | use-keyboard.ts:44-106、spreadsheet-grid.tsx:303-360 | P2-1/P3-2/P3-3 |
| H5  | 剪贴板                      | Ctrl+C/X/V 全路径（readOnly 守卫）✓；粘贴目标 = selectedCell/range 起点 ✓                                                                                                                                                                                                              | use-keyboard.ts:47-61、use-clipboard.ts:32-51        | —              |
| H6  | e2e 可操作性                | 真缺口 = 独立宿主页键盘场景（Phase 5：方向键移动 + 键入编辑 + Ctrl+Z + Ctrl+F + Escape）                                                                                                                                                                                               | —                                                    | 缺口在案       |
| H7  | MA4.3 缺口回归              | 无专属缺口（编辑键盘路径测试在案）                                                                                                                                                                                                                                                     | grid-editing.test.tsx                                | —              |

## 发现清单

- [P2-1] **Escape 无法关闭查找/替换与批注面板**——`use-keyboard.ts:44` isEditableTarget 守卫在 Escape 分支（:103-106）之前短路：焦点在 find/replace/comment 输入框内按 Escape 不关闭面板（find-replace-panel/cell-editor 输入无自身 Escape 处理）→ 用户可见交互缺陷（H4 键盘完整性）→ 状态: **fixed**（`use-keyboard.ts` Escape 分支提升至 isEditableTarget 之前 + 关闭后面板内输入焦点归还 grid 根；复现测试 `__tests__/keyboard-escape.test.tsx`，plan Phase 4）
- [P3-1] use-keyboard 快捷键映射无直接单测（间接经 harness）→ 状态: 卡内记录（随 P2-1 复现测试一并补直接用例）
- [P3-2] Home/End/PageUp/PageDown 导航缺失（Excel 等价能力缺口）→ 状态: 卡内记录
- [P3-3] Shift+方向键扩展选区缺失（仅行/列头 Shift 扩展）→ 状态: 卡内记录

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景（Phase 5 新增）: 独立宿主页键盘全链路——方向键移动（选中 cell 变更 + data-cell-active）+ 键入开编辑 → Enter 提交 + Ctrl+Z 撤销 + Ctrl+F 打开面板 → 焦点入 find 输入 → Escape 关闭面板（P2-1 的 e2e 确认点）| 断言: td 文本/data 标记 + panel data-slot 计数 | 结果: pass（`spreadsheet-demo.spec.ts` 2026-08-08 全绿 10/10，独立宿主页 `#/spreadsheet`）

## 修复记录

- P2-1 test-first 证据: 复现测试 `__tests__/keyboard-escape.test.tsx`（打开 find panel → 焦点入输入 → Escape → panel 关闭断言 + Ctrl+F 重开）先红后绿 + use-keyboard Escape 分支重排 + 焦点归还；两包测试全绿

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
