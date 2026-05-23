# 维度 03: API 表面积与契约一致性

## 第 1 轮（初审）

### [维度03-01] `flux-bundle` 依赖 form renderers `definitions` 子路径

- **文件**: `packages/flux-bundle/src/index.tsx:4-8`
- **证据片段**:
  ```tsx
  import { createDefaultEnv, createSchemaRenderer } from '@nop-chaos/flux-react';
  import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
  import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
  import { registerFormRenderers } from '@nop-chaos/flux-renderers-form/definitions';
  import './style.css';
  ```
- **严重程度**: 初审 P2，复核驳回
- **现状**: bundle 从 `@nop-chaos/flux-renderers-form/definitions` 导入 registration helper。
- **风险**: 初审认为该子路径扩大公开面。
- **建议**: 初审建议改 root 导入。
- **为什么值得现在做**: 初审认为 bundle 是主路径。
- **误报排除**: 复核确认 `flux-renderers-form/package.json` 明确导出 `./definitions`，且 root 入口包含 CSS side effect，definitions 可作为 CSS-free registration surface。
- **参考文档**: `packages/flux-renderers-form/package.json`
- **复核状态**: 已驳回

### [维度03-02] `flux-runtime` root API 未导出底层 Page/Form/Scope 工厂

- **文件**: `packages/flux-runtime/src/index.ts:1-11`; `packages/flux-runtime/src/form-store.ts:149`; `packages/flux-runtime/src/scope.ts:378-387`
- **证据片段**:
  ```ts
  export { createRendererRuntime, createModuleCache } from './runtime-factory.js';
  export type { HostProjectionScopeRef } from './runtime-host-projection-scope.js';
  export { createActionScope } from './action-scope.js';
  export { createComponentHandleRegistry } from './component-handle-registry.js';
  export { createFormComponentHandle } from './form-component-handle.js';
  export { createRootDependencySet, scopeChangeHitsDependencies } from './scope-change.js';
  export { publishOwnerStatus } from './status-owner.js';
  ```
- **严重程度**: 初审 P2，复核驳回
- **现状**: `createFormStore`、`createPageStore`、`createScopeRef` 从实现文件导出，但 root index 不公开。
- **风险**: 初审认为公开类型与构造 API 缺少稳定 root anchor。
- **建议**: 初审建议裁定是否 root 公共 API。
- **为什么值得现在做**: 初审认为这些类型是核心契约。
- **误报排除**: 复核确认 root API 当前有意收窄，文档未要求这些工厂作为稳定 root API；implementation export 供包内/测试使用不等于公开面污染。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 已驳回

## 深挖第 2 轮追加

维度 03：未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度03-01]: 驳回。`./definitions` 是 package exports 显式公开的 CSS-free 子路径。
- [维度03-02]: 驳回。root API 收窄没有违反当前 owner docs。

## 子项复核结论

无。

## 最终保留项

| 编号 | 严重程度 | 文件 | 一句话摘要   |
| ---- | -------- | ---- | ------------ |
| -    | -        | -    | 无最终保留项 |
