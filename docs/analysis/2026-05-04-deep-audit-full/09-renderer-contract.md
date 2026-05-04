# 维度 09：渲染器契约合规性

- 初审发现：2
- 维度复核：完成
- 子项复核：2

## 保留

1. [子项复核通过] 一批 `wrap: true` 字段渲染器在 `frameWrap: 'none'` 时会丢失 root `meta.className/testid/cid` 的部分或全部透传。
   文件：`packages/flux-react/src/node-frame-wrapper.tsx:16-23`、`packages/flux-renderers-form/src/renderers/input.tsx:37-63,152-367,182-206`、`packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:96-121`、`packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:205-255`
   严重程度：P2

2. [子项复核通过] `word-editor-page` 的 back 按钮调用 `props.events.onBack?.()` 时丢失 click event。
   文件：`packages/word-editor-renderers/src/word-editor-page.tsx:247-249,361-366`
   对照契约：`docs/architecture/renderer-runtime.md:461-480`
   严重程度：P2

## 复核摘要

- direct store access、ad-hoc context、marker/styling 自由度类候选都已按校准规则排除。
