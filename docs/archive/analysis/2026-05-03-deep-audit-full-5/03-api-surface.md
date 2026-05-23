# 03 API 表面积与契约一致性

- 初审发现数: 6
- 维度复核: 完成
- 子项复核: 1
- 最终结果: 保留 1 / 降级 3 / 驳回 2

## 保留

### [维度03] `FormStoreApi.subscribeToPaths(...)` 已公开但核心 owner/reference 文档未同步

- **文件**: `packages/flux-core/src/types/runtime.ts:73-78`
- **证据片段**:
  ```ts
  export interface FormStoreApi {
    subscribe(listener: () => void): () => void;
    subscribeToPath(path: string, listener: () => void): () => void;
    subscribeToPaths(paths: readonly string[], listener: () => void): () => void;
  }
  ```
- **严重程度**: P1
- **现状**: `flux-core` 已公开 `subscribeToPaths(...)`，但 `docs/architecture/form-validation.md` 与 `docs/references/form-validation-runtime-types.md` 仍未把它作为正式方法列出。
- **风险**: 调用方和后续文档维护者会误以为批量路径订阅不存在，影响 hook/selector 设计和 API 认知。
- **建议**: 在 owner doc 与 reference doc 中同步补齐 `subscribeToPaths(...)` 的签名和适用场景。
- **为什么值得现在做**: 这是已公开且已实现的稳定 surface，文档不一致会直接误导后续 API 使用。
- **误报排除**: 虽然 `docs/architecture/dependency-tracking.md` 已提到多路径订阅，但核心 owner/reference 文档仍未同步，问题不是“全仓完全没文档”，而是主文档面不一致。
- **历史模式对应**: 公开 API 先落地，owner/reference 文档未跟上。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-runtime-types.md`, `docs/architecture/dependency-tracking.md`
- **复核状态**: 子项复核通过

## 已降级

- `PageStoreApi` 缺少方法级 reference: **已降级**
  - 复核认为这是 reference 完整性缺口，不是代码契约冲突。
- `flow-designer-core` 根入口暴露 `clearTreeDomainAdapters()`: **已降级**
  - 复核认为它更像 test/reset helper 暴露在 public barrel 的 API 收敛问题，证据不足以上升为主缺陷。
- `flux-code-editor` 根入口暴露 `codeEditorFieldRules`: **已降级**
  - 复核认为这是 API 最小化问题，暂不足以证明当前已造成契约破坏。

## 已驳回

- `flux-action-core` 重新导出 `cancelPendingDebounce/scheduleDebounce`: **已驳回**
  - 复核认定这只是 convenience re-export，不构成契约冲突。
- `flux-renderers-form` 根入口暴露 `createInputRenderer()`: **已驳回**
  - 复核认定它目前仍是有意保留的复用工厂，证据不足以作为缺陷报告。
