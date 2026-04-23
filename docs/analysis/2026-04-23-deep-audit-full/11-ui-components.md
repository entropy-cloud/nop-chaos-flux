# 维度 11：UI 组件使用合规性

- 初审发现：1
- 维度复核：完成
- 子项复核：1 组（`json-viewer.tsx` / `sidebar-layout.tsx`）

## 保留

1. [已修复] `packages/flux-react/src/node-error-boundary.tsx` 已改用 `@nop-chaos/ui` 的 `Button`。
2. [已修复] `packages/ui/src/components/ui/json-viewer.tsx` 已用 `Tabs` 承接 JSON/YAML 切换，不再使用原生 `<button>`。

## 降级

1. [已降级] `packages/ui/src/components/ui/sidebar-layout.tsx` 的 `SidebarRail` 使用原生 `<button>`，但它更像 UI 库内部允许保留的低层结构 affordance，不应与业务层 raw button 同等判违。

## 复核摘要

- 保留：2
- 降级：1
- 驳回：0
