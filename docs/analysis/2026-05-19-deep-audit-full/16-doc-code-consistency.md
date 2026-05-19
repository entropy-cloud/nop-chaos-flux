# 维度 16: 文档-代码一致性

## 第 1 轮（初审）

### [维度16-01] `RendererHookApi`/公共 hook 文档遗漏 `useCurrentImportFrame` 活实现裁定

- **文档路径**: `docs/architecture/renderer-runtime.md:575-640,858-860`; `docs/references/terminology.md`
- **代码路径**: `packages/flux-react/src/hooks.ts:88-99`; `packages/flux-react/src/index.tsx:18-50`; `packages/flux-core/src/types/renderer-hooks.ts:123-168`
- **证据片段**:

  ```ts
  export function useCurrentImportFrame(): ImportFrame | undefined {
    return useContext(ImportFrameContext);
  }

  export function useScopeSelector<T, S = Record<string, unknown>>(
    selector: (scopeData: S) => T,
  ```

- **严重程度**: P2
- **漂移类型**: public hook surface 漂移
- **文档描述**: `renderer-runtime.md` 列出 Current Hooks 并承认 import-frame context，但没有裁定 `useCurrentImportFrame` 是 public、unstable 还是 internal。
- **代码现状**: live code 已实现并从 `flux-react` root export `useCurrentImportFrame()`，但 `RendererHookApi`/`rendererHooks` 未包含。
- **风险**: import-aware renderer/host bridge 开发者找不到一致 hook contract，可能新增 ad-hoc context/prop drilling。
- **建议**: 裁定归属；若 public，同步 docs、`RendererHookApi` 与 `rendererHooks`；若 internal，文档说明并限制 surface。
- **为什么值得现在做**: import-frame 是 `xui:imports` 当前边界，小文档/类型同步可减少重复误解。
- **误报排除**: 不是 anchor 缺失，`check:active-doc-code-anchors` 不覆盖活行为/类型漂移。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 维度复核通过

## 深挖第 2 轮追加

### [维度16-02] `renderer-runtime.md` 的 `useScopeSelector` 签名漏写 `paths` 选项

- **文档路径**: `docs/architecture/renderer-runtime.md:585-589`
- **代码路径**: `packages/flux-react/src/hooks.ts:96-100`; `packages/flux-core/src/types/renderer-hooks.ts`
- **证据片段**:
  ```ts
  function useScopeSelector<T, S = Record<string, unknown>>(
    selector: (scopeData: S) => T,
    equalityFn?: (a: T, b: T) => boolean,
    options?: { enabled?: boolean; fallback?: T },
  ): T;
  ```
  ```ts
  export function useScopeSelector<T, S = Record<string, unknown>>(
    selector: (scopeData: S) => T,
    equalityFn: (a: T, b: T) => boolean = Object.is,
    options?: { enabled?: boolean; fallback?: T; paths?: readonly string[] },
  ): T {
  ```
- **严重程度**: P2
- **漂移类型**: hook signature / performance contract drift
- **文档描述**: 文档与 `RendererHookApi` 签名只列 `enabled/fallback`。
- **代码现状**: live hook 支持 `paths`，并用于 path-aware scope subscription。
- **风险**: 开发者按文档写 broad selector，或通过 `RendererHookApi` 无法使用精确订阅能力。
- **建议**: 更新 docs 和 `RendererHookApi`，补充单/多 path 订阅建议。
- **为什么值得现在做**: `paths` 是响应式精度关键选项，遗漏会误导新代码。
- **误报排除**: 子项复核将 P1 降为 P2；直接导入 hook 不阻断，但文档/类型漂移成立。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 子项复核通过

## 维度复核结论

- [维度16-01]: 保留 (P2)。`useCurrentImportFrame` public/internal hook surface 未裁定。
- [维度16-02]: 保留但降级为 P2。`useScopeSelector.paths` 文档/RendererHookApi 漏写。

## 子项复核结论

- [维度16-02]: 降级为 P2。直接 hook 使用不阻断，但 hook contract/docs 漂移会误导。

## 最终保留项

| 编号  | 严重程度 | 文件                                            | 一句话摘要                                                    |
| ----- | -------- | ----------------------------------------------- | ------------------------------------------------------------- |
| 16-01 | P2       | `docs/architecture/renderer-runtime.md:575-640` | `useCurrentImportFrame` 活实现缺 public/internal surface 裁定 |
| 16-02 | P2       | `docs/architecture/renderer-runtime.md:585-589` | `useScopeSelector` 文档/RendererHookApi 漏 `paths` 选项       |
