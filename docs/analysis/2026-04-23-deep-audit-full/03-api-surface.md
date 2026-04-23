# 维度 03：API 表面积与契约一致性

- 初审发现：8
- 维度复核：完成
- 子项复核：建议后续针对 `flux-react`、`flow-designer-renderers`、`word-editor-renderers` 根入口继续做 public barrel 收口

## 保留

1. [维度复核通过] `packages/flow-designer-renderers/src/index.tsx` 暴露 XYFlow 适配层实现面，超出当前稳定宿主契约。
2. [维度复核通过] `packages/word-editor-renderers/src/index.ts` 暴露大量内部 toolbar/panel/dialog 组件，但未形成稳定公共组件 API 体系。
3. [维度复核通过] `packages/flux-i18n` 同时从根入口和 locale 子路径公开 `zhCN/enUS`，造成重复 public surface。

## 降级

1. [已降级] `packages/flux-runtime/src/index.ts` 重复转发 `createRendererRegistry/registerRendererDefinitions`
2. [已降级] `packages/flux-react/src/index.tsx` 暴露大量低层 Context/Helper，但其中一部分目前确有合法 owner 组合用途
3. [已降级] `packages/theme-tokens/package.json` 的问题应拆开看：`./styles.css -> ./src/styles.css` 属真实不一致；空 root JS 入口更像资产包形态选择
4. [已降级] `docs/index.md`/`AGENTS.md` 对 `flux-compiler`、`flux-action-core` 的导航不完整，但并非完全缺失

## 驳回

1. [已驳回] `packages/word-editor-core/src/index.ts` 透传 canvas-editor 类型和值。当前文档已把该包定义为 canvas-editor integration core，此耦合属于现有公开基线。

## 复核摘要

- 保留：3
- 降级：4
- 驳回：1
