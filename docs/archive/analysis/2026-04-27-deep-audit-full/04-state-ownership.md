# 维度 04：状态所有权与单一事实来源

## 审核范围

检查所有渲染器和 runtime 组件中的 useState/useRef/useEffect 模式，识别双状态、同步链、事实来源冲突。

## 发现清单

**零发现。**

初审识别了多个候选项，但维度复核逐一验证后全部驳回：

### 已驳回项

1. **table-quick-edit-cell draft/saved 模式** — 合理的编辑器模式：draft 是临时编辑态，saved 是已提交态，两者语义不同，不是双状态。
2. **array-editor itemsRef** — 缓存引用而非状态源，用于避免不必要的重建，不维护独立数据。
3. **dialog/drawer 开闭状态** — 使用标准受控/非受控模式，local state 仅在非受控模式下作为 fallback，不构成双事实源。
4. **designer 组件状态** — Zustand store 是单一事实源，React state 仅用于局部 UI 态（如悬浮、选中态等瞬时状态）。

## 复核验证过程

复核 agent 检查了以下关键组件：

- `table-quick-edit-cell.tsx` — draft/saved 是有意设计
- `array-editor.tsx` — itemsRef 是性能缓存
- `dialog-host.tsx` / `drawer-host.tsx` — 标准受控模式
- `flow-designer-renderers` — Zustand store 为唯一事实源
- `spreadsheet-renderers` — 同上

## 总结评估

项目在状态所有权方面执行良好。所有复杂字段渲染器通过 `useFormFieldController` hook 与 form store 交互，未发现双状态问题。初审候选项均为合理的设计模式。
