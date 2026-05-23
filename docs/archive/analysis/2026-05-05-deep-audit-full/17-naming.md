# 维度 17：命名与术语一致性

## 初审

- 初审聚焦 `flux-code-editor` 的 source-ref 仍公开 `dataPath`。

## 维度复核

- 该问题被降级为公开 API 命名 rough edge，而非已被 owner doc 明确禁止的强违约。

## 最终结论

### [维度17] `flux-code-editor` source-ref 仍公开 `dataPath`

- **文件**: `packages/flux-code-editor/src/types.ts:87-99`, `packages/flux-code-editor/src/types.ts:173-178`, `packages/flux-code-editor/src/index.ts:17-24`
- **证据片段**:
  ```ts
  dataPath?: string;
  ```
- **严重程度**: P3
- **冲突名称**: `dataPath` vs `path`
- **冲突位置**: `flux-json-conventions.md` 推荐 `path`，但 code-editor source-ref 公开类型与 resolver 仍使用 `dataPath`。
- **统一建议**: 作为 code-editor API 收敛项，逐步切到 `path` 或显式保留 deprecated alias。
- **参考文档**: `docs/references/flux-json-conventions.md`, `docs/components/code-editor/design.md`
- **复核状态**: `已降级`
