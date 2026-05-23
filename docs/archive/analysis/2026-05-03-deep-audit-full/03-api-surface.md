# 维度 03：API 表面积与契约一致性

## 初审摘要

- 初审发现 4 条线索，集中在跨包重复 re-export 与 React 层 augmentation 公共面。

## 维度复核结论

- `flux-react` 的 `RendererDefinition` augmentation 与当前文档一致，驳回。
- `flux-action-core -> flux-core` debounce re-export 已被文档承认，驳回。
- 其余 2 条保留但降级为低风险 facade/重复入口问题。

## 通过复核的结论

### [维度03] `flux-runtime` 暴露了 `flux-core` 的 registry 第二入口

- **文件**: `packages/flux-runtime/src/index.ts:1-3`
- **证据片段**:

```ts
1: export { createRendererRuntime, createModuleCache } from './runtime-factory';
2: export { createRendererRegistry, registerRendererDefinitions } from '@nop-chaos/flux-core';
3: export { createActionScope } from './action-scope';
```

- **严重程度**: P3
- **现状**: core registry API 额外通过 runtime 暴露。
- **风险**: 形成重复入口，弱化 `flux-core` 的单一权威导入路径。
- **建议**: 统一从 `@nop-chaos/flux-core` 导入 registry API。
- **复核状态**: 已降级

### [维度03] `flux-react` 继续暴露 runtime helper facade

- **文件**: `packages/flux-react/src/index.tsx:90-94`
- **证据片段**:

```ts
90: export { publishOwnerStatus } from '@nop-chaos/flux-runtime';
91: export { createFormComponentHandle } from '@nop-chaos/flux-runtime';
92: export { executeApiObject } from '@nop-chaos/flux-runtime';
93: export { createProjectedScopeStore } from '@nop-chaos/flux-runtime';
94: export { createReadonlyScopeBinding } from '@nop-chaos/flux-runtime';
```

- **严重程度**: P3
- **现状**: React 包作为 renderer-facing facade 再次暴露 runtime helper。
- **风险**: 包边界叙述与导入路径不够收敛。
- **建议**: 后续逐个评估这些 helper 是否保留 facade 或收回 `@nop-chaos/flux-runtime`。
- **复核状态**: 已降级
