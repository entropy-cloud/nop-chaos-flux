# 维度 11：UI 组件使用合规性

## 第1轮初审

### [维度11] FieldLabel 仍直接输出原生 `<label>`

- **文件**: `packages/flux-renderers-form/src/renderers/shared/label.tsx:8-12`
- **严重程度**: P2
- **原生元素**: `<label>`
- **应替换为**: `<Label>`
- **所在层**: 渲染器
- **替换可行性**: 高

### [维度11] Report Designer demo 面板折叠开关仍使用原生 `<button>`

- **文件**: `apps/playground/src/pages/report-designer-demo.tsx:400-408`
- **严重程度**: P3
- **原生元素**: `<button>`
- **应替换为**: `<Button>`
- **所在层**: apps/playground
- **替换可行性**: 高

## 深挖第2轮追加

- 未发现新的问题。深挖结束。

## 深挖统计

- 第1轮发现数：2
- 第2轮新增：0

## 维度复核结论

- 初审 2 项，独立复核后保留 2 项。
- 两项都属于明确的“已有 `@nop-chaos/ui` 组件却仍直接输出原生元素”问题。

## 子项复核结论

- `[维度11] FieldLabel 仍直接输出原生 <label>`: 保留。`FieldLabel` 位于渲染器层，且 `@nop-chaos/ui` 已导出 `<Label>`。
- `[维度11] Report Designer demo 面板折叠开关仍使用原生 <button>`: 保留。虽位于 demo/app 层，但 `@nop-chaos/ui` 已提供 `<Button>`，仍违反统一组件使用规则。
