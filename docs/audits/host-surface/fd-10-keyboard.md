# 审计卡：fd-10 键盘（flow-designer-renderers，D3.1 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` fd-10 | 注册定义: `renderer-definitions.ts` | 渲染器: `use-designer-shortcuts.ts`（快捷键）+ `designer-page-helpers.tsx`（matchesShortcut）+ `designer-canvas-focus.ts`（焦点管理）+ `designer-xyflow-canvas/designer-xyflow-node.tsx`（节点键盘路径）
> 契约基准: `docs/audits/host-surface/README.md` §1 flow-designer 行（design.md）

## 面身份

fd-10 键盘面：`useDesignerShortcuts`（undo/redo/delete/copy/paste/save + 排除输入目标守卫）、canvas 焦点管理（surface focus + focusDesignerCanvasSurface）、节点/槽位/边键盘激活路径。宿主契约 = `designerHostContract`。表单参与：无。布局 or widget：widget。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                                                     | 证据                                                             | 发现     |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------- |
| 1   | Schema 契约                 | 快捷键映射来自 config.shortcuts（host 可配）                                                                                                                             | use-designer-shortcuts.ts:21                                     | —        |
| 2   | RendererComponentProps 合规 | hook 纯机制（core/rootRef/dispatch 注入）                                                                                                                                | use-designer-shortcuts.ts:8-14                                   | —        |
| 3   | 值所有权三态                | 无状态（hook 无本地状态）                                                                                                                                                | —                                                                | —        |
| 4   | 表单参与                    | 快捷键排除表单输入目标（isEditableTarget: input/textarea/select/contentEditable）——与表单编辑共存                                                                        | use-designer-shortcuts.ts:24-30                                  | —        |
| 5   | DOM 与选择器契约            | rootRef.contains 限制快捷键只在 designer 根内生效                                                                                                                        | use-designer-shortcuts.ts:32-38                                  | —        |
| 6   | 嵌套 schema 分类            | 不适用                                                                                                                                                                   | —                                                                | —        |
| 7   | 事件与 action 契约          | window keydown 监听（unmount 清理）；dispatch 内部命令                                                                                                                   | use-designer-shortcuts.ts:80-82                                  | —        |
| 8   | a11y                        | canvas 根 tabIndex=0（surfaceFocusRef）；节点/槽位 role=button + Enter/Space；toolbar role=toolbar；焦点返回设计器（focusDesignerCanvasSurface）                         | designer-canvas.tsx:406-410；designer-xyflow-node.tsx:342-349    | —        |
| 9   | i18n                        | 不适用（无文案）                                                                                                                                                         | —                                                                | —        |
| 10  | 四态覆盖                    | readOnly 时跳过全部快捷键；features.shortcuts=false 关闭；copy/paste 受 features.clipboard 门控                                                                          | use-designer-shortcuts.ts:17,45-47,59-67                         | —        |
| 11  | 异步生命周期                | effect cleanup removeEventListener                                                                                                                                       | use-designer-shortcuts.ts:80-81                                  | —        |
| 12  | 组合宿主场景                | edge-creation（键盘建边）/ resizable（面板键盘 resize 箭头）                                                                                                             | tests/e2e/\*.spec.ts                                             | 部分覆盖 |
| 13  | 样式契约                    | 不适用                                                                                                                                                                   | —                                                                | —        |
| 14  | React 19 规范               | 单 effect + cleanup；无冗余 memo                                                                                                                                         | use-designer-shortcuts.ts:16-82                                  | —        |
| 15  | 性能边界                    | window 级单监听器                                                                                                                                                        | —                                                                | —        |
| 16  | 测试质量                    | use-designer-shortcuts.test.tsx（守卫用例）在案                                                                                                                          | 包级测试                                                         | —        |
| 17  | 文档对照                    | design.md 快捷键契约（undo/redo/delete/copy/paste/save + 输入目标排除）↔ 实现一致                                                                                        | —                                                                | —        |
| 18  | 注册/边界/IO                | 无 IO                                                                                                                                                                    | —                                                                | —        |
| H1  | host 契约                   | 快捷键映射经 config（host 注入）；无 manifest 直读                                                                                                                       | —                                                                | —        |
| H2  | 事务 undo                   | Ctrl+Z/Ctrl+Y → undo/redo 命令（fd-8 详审）                                                                                                                              | use-designer-shortcuts.ts:49-57                                  | —        |
| H3  | 拖拽                        | 不适用                                                                                                                                                                   | —                                                                | —        |
| H4  | 键盘交互完整性              | isEditableTarget 排除输入目标（22-02 家族先例 ✓）+ isInsideDesigner 范围限制 + matchesShortcut 修饰键全比对（ctrl/cmd/shift/alt + 冲突防误触）+ readOnly 守卫 + 功能开关 | use-designer-shortcuts.ts:24-78；designer-page-helpers.tsx:20-50 | —        |
| H5  | 剪贴板                      | Ctrl+C/V → copySelection/pasteClipboard（canUseClipboard 门控，fd-11 详审）                                                                                              | use-designer-shortcuts.ts:59-67                                  | —        |
| H6  | e2e 可操作性                | **缺口：快捷键映射（undo/delete/copy/paste）无真实浏览器场景**——Phase 5 新增（并入 fd-8/fd-11 场景）                                                                     | —                                                                | 缺口     |
| H7  | MA4.3 缺口回归              | 本面无 MA4.3 登记缺口                                                                                                                                                    | —                                                                | —        |

## 发现清单

- （无 P0/P1/P2；快捷键 e2e 缺口归 Phase 5 场景，非缺陷）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景: `flow-designer-edge-creation.spec.ts`（键盘建边全链路） | 断言: 边计数 | 结果: pass（基线绿）
- 场景: `flow-designer-resizable.spec.ts`（面板键盘箭头 resize 固定步长） | 断言: 宽度变化 | 结果: pass（基线绿）
- 场景: `flow-designer-undo-clipboard.spec.ts`（**新增，Phase 5**）——Delete/Ctrl+Z/Ctrl+Y/Ctrl+C/Ctrl+V 全快捷键映射真机解析 | 断言: 节点计数 + isEditable 守卫（focus 保留在 canvas surface） | 结果: pass（3 用例全绿）
- 缺口: 已闭合（Phase 5 新增场景覆盖快捷键映射真实浏览器路径）

## 修复记录

- Phase 5（plan `2026-08-08-0900-1`）：新增 e2e `flow-designer-undo-clipboard.spec.ts`（快捷键映射真实浏览器场景）；无代码修复（快捷键守卫语义审计零发现）。

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
