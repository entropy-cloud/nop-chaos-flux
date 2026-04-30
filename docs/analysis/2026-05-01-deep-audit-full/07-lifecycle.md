# 07 生命周期与副作用归属

## 复核结论

- 保留: 1
- 降级: 1
- 驳回: 3

## 保留

### tree mode wrapper 在 render 阶段写 state

- 文件: `packages/flow-designer-renderers/src/designer-page.tsx`
- 结论: 保留，P1
- 依据: `if (prevInput !== inputTreeDocument) { setPrevInput(...); setTreeDocument(...); }` 直接发生在 render path，违反 render purity 与 Bug 15 修复约束。

## 已降级

### form 外部 status/values publication 仍在 React 层

- 文件: `packages/flux-renderers-form/src/renderers/form-status-publication.ts`
- 结论: 已降级
- 依据: 更像 runtime owner 收口尚未完成的桥接逻辑，而不是第二事实源；但确实与 `FormRuntime` owner 理想位置不完全一致。

## 已驳回

### declarative surface `statusPath` publication 与 runtime 重复

- 结论: 驳回
- 依据: docs 已明确 declarative dialog/drawer 与 managed surface 是两条不同路径。

### `status-hooks.ts` 一概属于错误 owner

- 结论: 驳回
- 依据: 对 `page` / `tabs` 这类 renderer-owned summary 仍可视作合理 React glue。

### `dynamic-renderer` 的 schemaApi fetch 必须迁回 runtime

- 结论: 驳回
- 依据: 当前组件设计文档允许 renderer 本地拥有这一一次性加载流程。
