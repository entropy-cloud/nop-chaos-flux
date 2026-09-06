# designer 共享 SelectionInspector helper 与 workbench shell 深化

> 本文件分析 designer 层的共享 helper 缺口和 workbench shell 的深化方向。

## 文档共识审查记录（本文件）

> 依据项目文档共识审查惯例，本文件定稿前须经独立子 agent（fresh session）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。记录如下：

- **Round 1（2026-09-05，fresh session 独立子 agent，batch 2）**：判定 `REVISE`——0 Blocker / 2 Major（M-1, M-2）/ 0 Minor / 0 Nit。**M-1** Report Designer undo/redo 命名空间错误——应为 `report-designer:undo`/`report-designer:redo`（经 `report-designer-core/src/commands.ts:60,64` + `report-designer-toolbar-defaults.ts:11,19` 验证），非 `spreadsheet:undo`/`spreadsheet:redo`；已修正。**M-2** SCADA Editor delete action `component:deleteSymbols` 在代码中不存在——SCADA delete 由内部 engine mutator 处理，无公开 namespaced action；已修正为"内部 engine mutator（无公开 namespaced action）"。修正后全文复扫 0 新增。
- **Round 2（2026-09-05，fresh session 独立子 agent，batch 2 确认轮）**：判定 `AGREE`——M-1/M-2 修正项真实落地（经 grep 验证 `report-designer:undo`/`report-designer:redo` 在 commands.ts + toolbar-defaults.ts 中确认，`component:deleteSymbols` 全仓库零代码匹配），0 新增修正项。**达成共识**（共识循环：R1 修正 1 轮 + R2 确认轮，未超轮次上限）。

---

## 1. 共享 SelectionInspector helper

### 1.1 现状

四个 designer family 各自实现了 inspector 组装逻辑：

| Designer        | Inspector 模式                           | 实现位置                              |
| --------------- | ---------------------------------------- | ------------------------------------- |
| Flow Designer   | `nodeType.inspector.body` — 节点类型驱动 | flow-designer-core                    |
| Report Designer | `cell → form → patch` — 单元格选择驱动   | report-designer-core                  |
| Word Editor     | 无右侧 inspector（outline panel only）   | word-editor-core                      |
| SCADA Editor    | `extractPanelFields` 六类分组            | flux-renderers-industrial/src/editor/ |

### 1.2 缺口

虽然都走 "selection-aware shell + schema/form body + action-based writeback" 模式，但缺少一个轻量的共享 `SelectionInspector` 组装 helper，导致：

1. 各 family 重复实现 selection → inspector body 的映射逻辑
2. inspector 的 loading/empty/error 状态处理不统一
3. inspector 与 workbench shell 的集成点各自不同

### 1.3 建议方案

在 `packages/ui/` 或 `packages/flux-react/` 中提供共享组件：

```typescript
interface SelectionInspectorProps<TSelection> {
  selection: TSelection | null;
  onSelectionChange: (patch: Record<string, unknown>) => void;
  body: (selection: TSelection) => ReactNode;
  loading?: boolean;
  empty?: ReactNode;
}
```

各 family 只需提供 `body` 渲染函数和 selection → form 的映射，其余状态处理复用共享实现。

### 1.4 实施路径

| 阶段    | 内容                                                               |
| ------- | ------------------------------------------------------------------ |
| Phase 1 | 从 Flow Designer 提取 inspector shell 组件                         |
| Phase 2 | 适配 Report Designer（需要 cell → form 映射适配器）                |
| Phase 3 | 适配 SCADA Editor（需要 extractPanelFields 适配器）                |
| Phase 4 | Word Editor 暂不需要（无右侧 inspector），可作为 optional consumer |

---

## 2. workbench-shell keyboard 导航标准

### 2.1 现状

当前各 designer 的键盘快捷键分散在各自 namespace action 中：

| Designer        | Undo                   | Redo                   | Delete                                          | 保存                   |
| --------------- | ---------------------- | ---------------------- | ----------------------------------------------- | ---------------------- |
| Flow Designer   | `designer:undo`        | `designer:redo`        | `designer:deleteSelected`                       | `designer:save`        |
| Report Designer | `report-designer:undo` | `report-designer:redo` | —                                               | `report-designer:save` |
| Word Editor     | `word-editor:undo`     | `word-editor:redo`     | —                                               | `word-editor:save`     |
| SCADA Editor    | `component:undo`       | `component:redo`       | 内部 engine mutator（无公开 namespaced action） | `scada-editor:save`    |

### 2.2 缺口

缺少一个跨 family 的键盘导航标准文档（类似 VS Code 的 Keybinding 参考）。

### 2.3 建议

在 `docs/architecture/designer-workbench-shell.md` 中补充 "Keyboard Navigation" 节：

- 定义跨 family 共享的快捷键（Undo/Redo/Save/Delete/Copy/Paste）
- 定义 family-specific 快捷键的命名约定
- 定义快捷键冲突解决规则（当多个 designer family 同时活跃时）

---

## 3. Responsive 面板压制规则验证

### 3.1 现状

`docs/architecture/designer-workbench-shell.md` 定义了 tablet/phone breakpoint 下 side panel 的压制规则。

### 3.2 缺口

缺少系统化的 e2e 验证。

### 3.3 建议

为 workbench shell 添加 responsive 断点的 e2e 测试：

- 验证 side panel 在 tablet viewport 下是否正确 collapse
- 验证 side panel 在 phone viewport 下是否正确隐藏
- 验证 collapsed-rail 交互在 touch 设备上是否正常
