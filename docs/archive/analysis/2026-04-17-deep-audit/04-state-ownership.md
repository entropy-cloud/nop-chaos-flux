# 04 状态所有权与单一事实来源

- Task ID: `ses_2690a2fc6ffeSj1DuzAB1kSLVd`
- Source prompt: `docs/skills/deep-audit-prompts.md`

### [维度04] ArrayEditor / KeyValue 仍以本地 `useState` 镜像表单值

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\array-editor.tsx:143-200,209-244,277-289`; `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\key-value.tsx:208-274,281-338,370-382`
- **严重程度**: P1
- **现状**: 已有自动化回归覆盖 `reset()/setValue()` 场景，但 live code 仍用本地 `items` / `pairs` 状态镜像 `form store` 或 `scope` 中的同一份字段值，并靠 effect 做回填同步。
- **风险**: 复杂字段值不再由 store 单独拥有；后续只要漏掉一个同步分支，就会重新引入历史上同类脱同步问题。
- **建议**: 去掉本地值镜像，直接从 `useCurrentFormState` / `useScopeSelector` 读取 canonical value；如果只是为“同步新增行的即时渲染”保留临时 UI 身份，应把本地状态缩到纯 UI key 层，而不是业务值层。
- **双状态详情**: 本地 `items` / `pairs` 与 `currentForm.store.values[name]`（或 `scope[name]`）都在表达同一个字段值。
- **同步失败症状**: 用户会看到列表项显示旧值、增删后错误挂到错误行、提交/校验针对的值与界面显示不一致；外部 action、reset、scope patch 再次容易把问题放大。
- **参考文档**: `docs/architecture/form-validation.md`; `docs/architecture/scope-ownership-and-isolation.md`

### [维度04] Report Inspector 的活动面板存在 renderer-local 与 core snapshot 双事实

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\inspector-shell-renderer.tsx:34-46,77-89,153-171`; `C:\can\nop\nop-chaos-flux\packages\report-designer-core\src\core.ts:170-179`; `C:\can\nop\nop-chaos-flux\packages\report-designer-core\src\types.ts:82-89`
- **严重程度**: P2
- **现状**: 需人工审计才能发现：core snapshot 已有 `inspector.activePanelId`，renderer 又维护一份本地 `activePanelId`；点击 tab 只更新本地 state，没有回写 core。
- **风险**: inspector 当前面板不再有单一事实来源，host、action、其他订阅者读取到的 active panel 可能与 화면上实际打开的面板不同。
- **建议**: 把活动面板收敛到 report-designer core/runtime；renderer 只订阅并发出“切换 panel”命令，不再自己保存一份活动面板 state。
- **双状态详情**: `inspector-shell-renderer` 的 `activePanelId` 与 `ReportDesignerRuntimeSnapshot.inspector.activePanelId` 都在表达“当前激活的 inspector panel”。
- **同步失败症状**: 用户点击某个 tab 后界面切过去了，但下一次 inspector 刷新、target 切换或 panel 列表重算时，tab 可能跳回默认项；外部读取的 active panel 也会是旧值。
- **参考文档**: `docs/architecture/scope-ownership-and-isolation.md`; `docs/architecture/report-designer/design.md`

### [维度04] Spreadsheet 选区由 React 本地状态维护，而不是 runtime selection

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-interactions\use-selection.ts:24-26,29-50,58-92`; `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\use-spreadsheet-interactions.ts:116-156,213-291`; `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\bridge.ts:13-25,35-63`; `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\report-spreadsheet-canvas.tsx:70-91`
- **严重程度**: P1
- **现状**: 需人工审计才能发现：renderer 用本地 `selectedCell`/drag state 驱动高亮、剪贴板、注释、样式等交互，但 spreadsheet bridge/runtime snapshot 已经有 `selection`、`activeCell`、`activeRange`。
- **风险**: 设计器/表格交互的核心状态没有单一 owner；外部命令、host 同步、跨组件协作无法可靠驱动当前选区。
- **建议**: 让 grid 直接订阅并写入 spreadsheet core 的 `selection`；本地状态只保留纯瞬态指针信息（例如拖拽中的 raf 节流），不要再维护另一份语义选区。
- **双状态详情**: 本地 `selectedCell`/drag range 与 `SpreadsheetRuntimeSnapshot.selection` / `activeCell` / `activeRange` 都在表达“当前选区”。
- **同步失败症状**: 用户会遇到画布高亮单元格、工具栏作用目标、host/status summary 三者不一致；外部 `setSelection` 类命令不会驱动当前 grid 选中态，报表设计器侧读取到的选择目标也可能滞后。
- **参考文档**: `docs/architecture/scope-ownership-and-isolation.md`; `docs/architecture/report-designer/design.md`
