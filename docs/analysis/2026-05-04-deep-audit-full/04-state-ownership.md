# 维度 04：状态所有权与单一事实来源

- 初审发现：3
- 维度复核：完成
- 子项复核：1

## 保留

- 无。

## 降级

1. [子项复核通过，已降级] table quick-edit 同时维护 `draftValue/savedValue` 与 `rowScope.record[field]`。
   文件：`packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:25-102`
   说明：这是当前实现里的同步脆弱性，而不是已成立的重复 value owner 缺陷；row/cell 仍属于 parent-owned `inherit-owner` 路径。

## 驳回

1. [已驳回] `variant-field` 的 `userSelectedKey/detectedKey` 更像值不可判定时的局部 selector fallback，不构成第二事实源。
2. [已驳回] `word-editor-page` 的 `charts/codes` 与 `savedDocument.data` 属于 live extras 与 persisted snapshot 的分层，不是同一 owner contract 下的双存冲突。

## 复核摘要

- 复杂字段、dialog/surface、designer/workbench 区域已复核。
- 本轮没有维度 04 的最终保留问题。
