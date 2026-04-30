# 08 验证系统一致性

## 复核结论

- 保留: 5
- 降级: 0
- 驳回: 0

## 保留

### parent validation collection 穿透 `create-owner` 边界

- 文件: `packages/flux-compiler/src/schema-compiler/validation-collection.ts`
- 结论: 保留，P1
- 依据: collector 递归 region 时不检查 `ownerResolution` / `validationOwnerPlan`；detail owner 既生成自己的 `validationPlan`，也仍可能被 parent walk 吸入。

### `submitWhenHidden` 公开 schema 与 runtime 行为不一致

- 文件: `packages/flux-renderers-form/src/renderers/form-definition.ts`, `packages/flux-core/src/types/validation.ts`
- 结论: 保留，低严重度
- 依据: schema 与 prop coverage 暴露了 `submitWhenHidden`，但 core/runtime 只支持 `validateWhenHidden` 和 `clearValueWhenHidden`。

### registration 仍按 path 单实例假设工作

- 文件: `packages/flux-runtime/src/form-runtime-field-ops.ts`
- 结论: 保留，P2
- 依据: `pathToRegistrationId` 仍强制单 path 单 registration，与 docs 中 registrationId-based 多实例模型不完全一致。

### `validateOn: change` 被 `touched` 错误门控

- 文件: `packages/flux-renderers-form/src/field-utils.tsx`
- 结论: 保留，P1
- 依据: form-owned `onChange` 只有在 `isTouched(name)` 后才运行验证，把执行时机错误地绑到了显示策略上。

### page-root validation owner 先 active，后 attach model

- 文件: `packages/flux-runtime/src/runtime-owned-factories.ts`, `packages/flux-react/src/schema-renderer.tsx`
- 结论: 保留，P1
- 依据: page-root owner 创建时没有 `validation`，却直接初始化为 `active`，compiled model 只在后续 effect 中 `refreshCompiledModel(...)` 附着。

## 复核备注

- 复核阶段额外发现 registration owner containment 检查并不对称，值得单独跟进，但未并入本轮初审统计。
