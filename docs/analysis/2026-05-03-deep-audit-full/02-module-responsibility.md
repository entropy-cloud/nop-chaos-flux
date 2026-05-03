# 维度 02：模块职责与文件边界

## 初审摘要

- 基线命令 `pnpm check:oversized-code-files` 报出 1 个 `>700` 行测试文件与多项 `>500` 行文件。
- 初审发现 3 条线索：1 个超大测试合同文件、1 个多职责热点、1 个 root barrel 实现细节暴露。

## 维度复核结论

- `api-data-source-controller.ts` 已被拆成薄协调层，初审结论驳回。
- `owner-based-validation-contracts.test.ts` 作为单文件承载过多独立 contract 主题，保留。
- `flow-designer-renderers/src/index.tsx` 的 `DesignerXyflow*` root export 保留但降级为低风险 public API 整洁性问题。

## 通过复核的结论

### [维度02] owner validation 合同测试文件过大且主题混装

- **文件**: `packages/flux-runtime/src/__tests__/owner-based-validation-contracts.test.ts:123-140`, `:329-346`, `:486-503`
- **证据片段**:

```ts
123: describe('FieldRegistrationHandle - registrationId identity', () => {
329: describe('applyExternalErrors', () => {
486: describe('refreshCompiledModel', () => {
```

- **严重程度**: P2
- **现状**: 一个 `>700` 行测试文件同时承载 registration、external errors、lifecycle、model refresh 等多个 contract 主题。
- **风险**: 回归定位和主题拆分成本持续上升。
- **建议**: 按 contract 主题拆成多份测试文件。
- **复核状态**: 维度复核通过

### [维度02] flow-designer root barrel 扩大了 xyflow 细节的可依赖面

- **文件**: `packages/flow-designer-renderers/src/index.tsx:27-42`
- **证据片段**:

```ts
27: export {
28:   DesignerXyflowCanvasBridge,
29:   renderDesignerCanvasBridge,
33:   DesignerXyflowCanvas,
34:   DesignerXyflowNode,
35:   DesignerXyflowEdge,
```

- **严重程度**: P3
- **现状**: root barrel 直接公开 `DesignerXyflow*` 实现符号。
- **风险**: 实现细节更容易被外部依赖，增加后续收口成本。
- **建议**: 将这些导出收窄到次级入口或内部实现层。
- **复核状态**: 已降级
