# 审计卡：fd-11 剪贴板（flow-designer-renderers + flow-designer-core，D3.1 面）

> 状态: closed
> 审查日期: 2026-08-08
> 审查 plan: `docs/plans/2026-08-08-0900-1-round2-d31-flow-designer-surface-audit.md`
> 面定义: `docs/audits/host-surface/surface-inventory.md` fd-11 | 注册定义: `renderer-definitions.ts` | 渲染器: `core-shell-commands.ts`（copySelectionCommand/pasteClipboardCommand）+ `core/shell-state.ts`（setShellClipboard）+ `use-designer-shortcuts.ts`（Ctrl+C/V）+ `designer-command-adapter.ts`（命令映射）
> 契约基准: `docs/audits/host-surface/README.md` §1 flow-designer 行（design.md + api.md）

## 面身份

fd-11 剪贴板面：内部剪贴板数据契约（DesignerShellState.clipboard = GraphNode 单节点）+ copySelection/pasteClipboard 命令链路 + 快捷键触发（canUseClipboard 门控）。宿主契约 = `designerHostContract`（copySelection/pasteClipboard capability）。表单参与：无。布局 or widget：机制面。

## 维度审查记录（18 维降维 + Designer 特有维度）

| #   | 维度                        | 结论                                                                                                                                              | 证据                                             | 发现 |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---- |
| 1   | Schema 契约                 | 剪贴板数据 = GraphNode（type/position/data），非 schema 面                                                                                        | core-shell-commands.ts:22-39                     | —    |
| 2   | RendererComponentProps 合规 | 不适用（core 命令面）                                                                                                                             | —                                                | —    |
| 3   | 值所有权三态                | copy 取 selection 首个节点快照（setShellClipboard 存 node 引用）；paste 在 position+48 偏移建新节点                                               | core-shell-commands.ts:23-39；shell-state.ts:71  | —    |
| 4   | 表单参与                    | 无                                                                                                                                                | —                                                | —    |
| 5   | DOM 与选择器契约            | 不适用                                                                                                                                            | —                                                | —    |
| 6   | 嵌套 schema 分类            | 不适用                                                                                                                                            | —                                                | —    |
| 7   | 事件与 action 契约          | copy/paste 命令经 adapter → core（readonly 守卫 + tree mode paste 拒绝）；快捷键 canUseClipboard 门控                                             | core.ts:355-366；use-designer-shortcuts.ts:59-67 | —    |
| 8   | a11y                        | 不适用                                                                                                                                            | —                                                | —    |
| 9   | i18n                        | 不适用                                                                                                                                            | —                                                | —    |
| 10  | 四态覆盖                    | 空剪贴板 paste 无操作（clipboard null 守卫）；tree mode paste 拒绝；readonly 拒绝                                                                 | core-shell-commands.ts:29-31；core.ts:357-365    | —    |
| 11  | 异步生命周期                | 无异步                                                                                                                                            | —                                                | —    |
| 12  | 组合宿主场景                | **无既有 spec 覆盖剪贴板（覆盖矩阵缺口）**                                                                                                        | —                                                | 缺口 |
| 13  | 样式契约                    | 不适用                                                                                                                                            | —                                                | —    |
| 14  | React 19 规范               | 不适用                                                                                                                                            | —                                                | —    |
| 15  | 性能边界                    | 单节点剪贴板，规模恒定                                                                                                                            | —                                                | —    |
| 16  | 测试质量                    | core-graph.test.ts 含剪贴板用例（copy/paste 语义）                                                                                                | 包级测试                                         | —    |
| 17  | 文档对照                    | api.md copySelection/pasteClipboard 契约 ↔ 实现一致                                                                                               | designer-manifest.ts:330-335                     | —    |
| 18  | 注册/边界/IO                | 内部剪贴板（无系统剪贴板访问，无权限问题）                                                                                                        | —                                                | —    |
| H1  | host 契约                   | copySelection/pasteClipboard 为 41 方法契约成员                                                                                                   | designer-manifest.ts:330-335                     | —    |
| H2  | 事务 undo                   | paste 走 addNode 命令链（可 undo）                                                                                                                | core-shell-commands.ts:34-39                     | —    |
| H3  | 拖拽                        | 不适用                                                                                                                                            | —                                                | —    |
| H4  | 键盘                        | Ctrl+C/Ctrl+V 快捷键（canUseClipboard 门控 + 输入目标排除）                                                                                       | use-designer-shortcuts.ts:59-67                  | —    |
| H5  | 剪贴板                      | 数据契约 = GraphNode 单节点（selectedNodeIds[0]）；无系统剪贴板/权限依赖（INV-1 清单外无 best-effort 面）；paste 偏移 48px 防重叠；tree mode 拒绝 | core-shell-commands.ts:23-39；core.ts:357-365    | P3-1 |
| H6  | e2e 可操作性                | **缺口：复制/粘贴真实浏览器场景缺失**——Phase 5 新增                                                                                               | —                                                | 缺口 |
| H7  | MA4.3 缺口回归              | 本面无 MA4.3 登记缺口                                                                                                                             | —                                                | —    |

## 发现清单

- [P1-1] **pasteClipboard 命令缺口**：`designer-command-adapter.ts` 的 `execute` switch 无 `case 'pasteClipboard'`——`pasteClipboard` 已在 GRAPH_ONLY_COMMANDS（`:40`）+ manifest 方法契约 + 快捷键（Ctrl+V）声明，但适配器执行时落入 default → `Unsupported command: pasteClipboard`（unavailable）——**键盘粘贴路径端到端不可用**（Phase 5 e2e 发现：`flow-designer-undo-clipboard.spec.ts` 复现测试 Ctrl+C 后 Ctrl+V 节点数不变）→ 状态: **fixed**（test-first：`designer-command-adapter.test.ts` `copySelection then pasteClipboard duplicates the copied node` 先红后绿；实现补 `case 'pasteClipboard': core.pasteClipboard()` `designer-command-adapter.ts:219-221`；e2e 3 用例全绿）。复杂 bug note：`docs/bugs/91-paste-clipboard-command-gap-design-adapter-silent-unavailable-fix.md`
- [P3-1] copy 仅取 selectedNodeIds[0]（多选复制丢失其余节点）`core.ts:357` + `shell-state.ts:71` → 状态: 卡内记录（单节点剪贴板为设计语义，多选复制为 DR 候选）

## 组合宿主场景（真实浏览器验证，bug 73 模式专项）

- 场景: `flow-designer-undo-clipboard.spec.ts`（**新增，Phase 5**）——Ctrl+C → Ctrl+V 复制粘贴节点（6→7）+ 无复制粘贴不产生节点 | 断言: `.react-flow__node` 计数 + 位置去重 | 结果: pass（2.5s/2.8s）
- 缺口: 已闭合（Phase 5 新增场景覆盖剪贴板真实浏览器路径——并当场暴露 P1-1 命令缺口）

## 修复记录

- Phase 5（plan `2026-08-08-0900-1`）：P1-1 补测 1 条（`designer-command-adapter.test.ts`）+ 实现补 case（`designer-command-adapter.ts:219-221`），包级 35 files / 241 tests 全绿 + e2e 3 用例全绿；bug note 91；P3 卡内记录。

## Closure

- 独立 closure audit: pass | fail + 记录位置（fresh session）
