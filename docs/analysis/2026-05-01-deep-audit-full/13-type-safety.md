# 13 类型安全与动态边界

## 复核结论

- 保留: 1
- 降级: 1
- 驳回: 0

## 保留

### flow designer toolbar 以本地 shadow type + 双重断言绕过核心契约

- 文件: `packages/flow-designer-renderers/src/designer-toolbar.tsx`, `packages/flow-designer-core/src/types.ts`
- 结论: 保留，P1
- 依据: core 已有 `ToolbarItem` / `ToolbarConfig`，renderer 仍自建 `ToolbarItemLike` 并用 `as unknown as ToolbarItemLike[]`；playground schema 与 owner doc 也已显露 drift。

## 已降级

### condition-builder schema 上的 `any` 更像 public typing 质量问题

- 文件: `packages/flux-renderers-form-advanced/src/condition-builder/types.ts`
- 结论: 已降级
- 依据: 本地已有 `ConditionField` / `ConditionOperatorOverrides`，但 `BaseSchema` / `SchemaValue` 兼容约束让简单替换并不直接；当前没有明确 runtime bug 证据。

## 复核备注

- 复核阶段额外确认 `DesignerPageSchema` 也明显欠类型化，值得后续单列修补。
