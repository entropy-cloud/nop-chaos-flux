# Architecture Docs Index

## Purpose

`docs/architecture/` 已经不再只是少量核心文档的平铺目录。

本索引用于给当前 active architecture docs 提供逻辑分组导航，同时为未来是否进行目录级重组提供稳定过渡层。

## Current Position

当前目录下的平铺文档数量已经偏多，但不建议立刻做一次性大搬家。

原因：

- 现有交叉引用非常多
- `docs/index.md`、`AGENTS.md`、组件文档、计划文档都大量直接引用了现有路径
- 立即重排目录会带来大量路径级噪音，收益未必高于成本

因此当前推荐策略是：

1. 先建立**逻辑分组索引**
2. 继续允许少量新文档进入平铺层，但优先判断是否应归入已有子目录
3. 等某一文档族稳定成型后，再做**渐进迁移**

## Logical Groups

### 1. Core Model

- `frontend-programming-model.md`
- `flux-core.md`
- `flux-design-principles.md`
- `flux-dsl-vm-extensibility.md`
- `frontend-baseline.md`
- `flux-runtime-module-boundaries.md`

### 2. Action And Execution

- `action-algebra-formal-spec.md`
- `action-graph-authoring.md`
- `action-interaction-state.md`
- `action-scope-and-imports.md`
- `api-data-source.md`
- `form-validation.md`

### 3. Scope, Identity, And Rendering

- `renderer-runtime.md`
- `scope-ownership-and-isolation.md`
- `template-instantiation-and-node-identity.md`
- `component-resolution.md`
- `dependency-tracking.md`
- `table-row-identity-and-scope-performance.md`

### 4. UI Surface And Styling

- `styling-system.md`
- `renderer-markers-and-selectors.md`
- `theme-compatibility.md`
- `surface-owner.md`
- `field-frame.md`
- `field-metadata-slot-modeling.md`

### 5. Host And Tooling

- `complex-control-host-protocol.md`
- `debugger-runtime.md`
- `playground-experience.md`
- `security-design-requirements.md`
- `performance-design-requirements.md`
- `schema-file-validator.md`

### 6. Specialized Domains

- `flow-designer/`
- `report-designer/`
- `condition-builder.md`
- `code-editor.md`

## Recommended Grouping Strategy

如果未来决定做目录级重组，推荐只按稳定文档族迁移，不做一次性全量重排。

优先候选：

### A. `action/`

- `action-algebra-formal-spec.md`
- `action-graph-authoring.md`
- `action-interaction-state.md`
- `action-scope-and-imports.md`

### B. `runtime/`

- `renderer-runtime.md`
- `scope-ownership-and-isolation.md`
- `template-instantiation-and-node-identity.md`
- `component-resolution.md`
- `dependency-tracking.md`
- `table-row-identity-and-scope-performance.md`

### C. `ui/`

- `styling-system.md`
- `renderer-markers-and-selectors.md`
- `theme-compatibility.md`
- `surface-owner.md`
- `field-frame.md`
- `field-metadata-slot-modeling.md`

### D. Keep As Top-Level Anchors

以下文档即使未来重组，也值得谨慎处理，必要时可继续保留顶层：

- `frontend-programming-model.md`
- `flux-core.md`
- `flux-design-principles.md`

因为它们本身就是最常用的入口锚点。

## Migration Rule

如果未来开始目录级迁移，推荐顺序：

1. 先增加本索引与 `docs/index.md` 路由
2. 先迁移一个稳定文档族
3. 批量更新 cross-links
4. 再迁移下一族

不要：

- 一次性移动所有 architecture 文档
- 在没有逻辑分组入口的情况下直接重命名大量路径

## Current Recommendation

当前结论：

- `docs/architecture/` 的平铺层**确实开始拥挤**
- 但现在更适合先通过 `README.md` 做逻辑分组，而不是立刻做物理目录重组

等 action/runtime/ui 这些族的边界再稳定一点后，再分批迁移会更安全。
