# 维度 18：跨包模式一致性

- 初审发现：3
- 维度复核：完成
- 子项复核：1 组（report-designer 双 workbook source）

## 保留

1. [子项复核通过] `report-designer-page` 目前没有单一同步的 workbook source of truth：UI 使用 renderer 侧 `SpreadsheetCore`，save/export/preview 使用 `report-designer-core.store.document`，inspector provider 又读取 core 内部单独 `SpreadsheetCore`。

## 降级

1. [已降级] `flow-designer-core` 使用自定义 listener core 而非 Zustand vanilla store，确属跨包模式差异，但更准确地说是偏离主流 store 契约，而不是 renderer 侧额外再造一层订阅系统。
2. [已降级] `word-editor-renderers` 的 i18n 问题成立，但 `flux.wordEditor.*` 与 `wordEditor.*` 并非两套独立机制；真正高价值问题是硬编码英文与 key 风格未完全收口。

## 复核摘要

- 保留：1
- 降级：2
- 驳回：0
