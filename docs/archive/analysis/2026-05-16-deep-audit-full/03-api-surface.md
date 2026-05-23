# 维度 03：API 表面积与契约一致性

## 第 1 轮（初审）

### [维度03-01] `flow-designer-core` 根入口暴露重置/清空型全局状态 helper，扩大了内部 API 表面积

- **文件**: `packages/flow-designer-core/src/index.ts:7-15`
- **证据片段**:
  ```ts
  export { projectTree, resetProjectionState } from './tree-projection.js';
  export {
    registerTreeDomainAdapter,
    getTreeDomainAdapter,
    listTreeDomainAdapters,
    clearTreeDomainAdapters,
  } from './tree-domain.js';
  ```
- **严重程度**: P2
- **现状**: 根入口把典型测试/重置型 helper 也暴露给包消费者。
- **风险**: 内部 module-global 状态变成默认可用 API，后续调整更难收口。
- **建议**: 收敛到 `unstable` 或 test-support 子路径。
- **为什么值得现在做**: 公开面越小，后续设计器核心收敛成本越低。
- **误报排除**: 不是泛泛的“导出太多”；这里导出的是会清空/重置全局状态的 mutator。
- **历史模式对应**: unnecessary root export surface。
- **参考文档**: `docs/references/renderer-interfaces.md`
- **复核状态**: 未复核

### [维度03-02] `flux-code-editor` 根入口公开 `codeEditorFieldRules`，把 renderer 内部字段建模细节暴露到公共面

- **文件**: `packages/flux-code-editor/src/index.ts:4-8,60`
- **证据片段**:
  ```ts
  import {
    CodeEditorRenderer,
    codeEditorRendererDefinition as _codeEditorRendererDefinition,
    codeEditorFieldRules,
  } from './code-editor-renderer.js';
  export { CodeEditorRenderer, codeEditorFieldRules };
  ```
- **严重程度**: P2
- **现状**: `fields` 已经通过 `codeEditorRendererDefinition` 公开，根入口再次导出 `codeEditorFieldRules` 增加了额外耦合点。
- **风险**: 外部代码可直接依赖内部 field classification，后续 schema 字段重构更难演进。
- **建议**: 将该导出移到 `unstable` 或停止根入口导出。
- **为什么值得现在做**: 这是低成本 API 收敛点。
- **误报排除**: 并非正常的 definition 导出；是 definition 内部实现细节再次外露。
- **历史模式对应**: root barrel over-exposure。
- **参考文档**: `docs/references/renderer-interfaces.md`
- **复核状态**: 未复核

### [维度03-03] `schemaUrl` 可选性的初审候选在独立复核中未成立

- **文件**: `packages/flux-bundle/src/types.ts:56-63`
- **证据片段**:
  ```ts
  export interface FluxSchemaRendererProps {
    schema: FluxSchema;
    schemaUrl: string;
    env: FluxRendererEnv;
    data?: Record<string, unknown>;
  }
  ```
- **严重程度**: P3
- **现状**: 初审曾把文档中的一处上下文描述误判为公共契约漂移；复核后确认当前主公开类型与主架构文档都要求 `schemaUrl`。
- **风险**: 若不驳回，会引入错误结论。
- **建议**: 从最终报告中移除该候选。
- **为什么值得现在做**: 维持 summary 只汇总独立复核通过条目。
- **误报排除**: 这是一次成功的复核驳回，不应被继续放大。
- **历史模式对应**: doc-context misread rejection。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度03-04] `@nop-chaos/flux` facade 的 renderer 定义类型允许 `reactComponent` / 缺省 `component`，但底层 registry 实际强制要求 `component`

- **文件**: `packages/flux-bundle/src/types.ts:42-47`；`packages/flux-bundle/src/index.tsx:34-47`；`packages/flux-core/src/registry.ts:3-6,24-25`
- **证据片段**:
  ```ts
  export interface FluxRendererDefinition {
    type: string;
    component?: (...args: any[]) => unknown;
    reactComponent?: (...args: any[]) => unknown;
  }
  ```
- **严重程度**: P1
- **现状**: facade 类型接受更宽输入，但实现只是把 facade registry 强转成 core registry，没有做 `reactComponent -> component` 归一化。
- **风险**: host 侧按 facade 类型写的扩展 renderer 会“类型通过、注册时报错”，形成真实 public contract 漂移。
- **建议**: 收窄 facade 类型到与 core registry 一致，或在 facade 层实现显式归一化。
- **为什么值得现在做**: 这是用户面 API 的真实可踩坑点。
- **误报排除**: 不是私有包内部 cleanliness 讨论；这里是 facade 对外 authoring contract 与实际运行时约束不一致。
- **历史模式对应**: facade/public contract mismatch。
- **参考文档**: `docs/references/renderer-interfaces.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度03-01]：降级为 P2。问题真实，但 `flow-designer-core` 当前是 private package，影响主要在内部公开面整洁度。
- [维度03-02]：降级为 P2。问题真实，但 `flux-code-editor` 同样是 private package。
- [维度03-03]：驳回。当前主公开类型与主架构文档并不存在 `schemaUrl` 漂移。
- [维度03-04]：保留 (P1)。facade 类型与底层 registry 约束不一致，属于真实公开契约问题。

## 最终保留项

| 编号  | 严重程度 | 文件                                            | 一句话摘要                                                                      |
| ----- | -------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| 03-04 | P1       | `packages/flux-bundle/src/types.ts:42-47`       | `@nop-chaos/flux` facade 把不被底层 registry 支持的 renderer 形态公开成合法类型 |
| 03-01 | P2       | `packages/flow-designer-core/src/index.ts:7-15` | 设计器 core 根入口暴露重置/清空型全局状态 helper                                |
| 03-02 | P2       | `packages/flux-code-editor/src/index.ts:4-8,60` | code editor 根入口额外暴露 `codeEditorFieldRules`                               |
