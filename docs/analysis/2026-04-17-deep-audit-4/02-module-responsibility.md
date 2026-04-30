# 维度 02：模块职责与文件边界

## 初审概览

- 初审候选：3
- 维度复核：1 条保留，2 条降级

## 条目复核

### [降级] `designer-page.tsx` 超过 500 行且仍有可提取职责

- **关键文件**: `packages/flow-designer-renderers/src/designer-page.tsx:24-140,173-489`
- **说明**: 仍值得继续收薄，但已拆出主要子模块，更接近结构优化项而非强缺陷。

### [保留] `flow-designer-renderers` 根入口暴露 XYFlow/context/default panel 等实现细节

- **关键文件**: `packages/flow-designer-renderers/src/index.tsx`, `packages/flow-designer-renderers/src/designer-context.ts`
- **说明**: 根 barrel 直接公开实现性符号，扩大了包的稳定公共面。

### [降级] 根入口公开面与 `flow-designer/api.md` 的 owner 说明不一致

- **关键文件**: `packages/flow-designer-renderers/src/index.tsx`, `docs/architecture/flow-designer/api.md`
- **说明**: 更准确地说是公开面尚未收敛，而不是 owner 文档已经明确承诺现状。
