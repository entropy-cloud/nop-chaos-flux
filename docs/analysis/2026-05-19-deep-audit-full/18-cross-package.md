# 维度 18: 跨包模式一致性

## 第 1 轮（初审）

### [维度18-01] `@nop-chaos/ui` 维护第二套 i18n fallback，未接入 `flux-i18n` 当前实例

- **涉及包**: `@nop-chaos/ui` vs `@nop-chaos/flux-i18n`
- **文件**: `packages/ui/src/lib/i18n.ts:1-25`; `packages/flux-i18n/src/i18n.ts:34-99`; `packages/ui/src/components/ui/pagination.tsx:57-82`
- **证据片段**:
  ```ts
  const messages: Record<string, string> = {
    'flux.breadcrumb.more': 'More',
    'flux.carousel.label': 'Carousel',
    'flux.carousel.previous': 'Previous slide',
    'flux.carousel.next': 'Next slide',
    'flux.common.close': 'Close',
    'flux.dialog.close': 'Close dialog',
  };
  ```
- **严重程度**: P2
- **不一致类别**: i18n/text
- **包 A 模式**: renderers 直接使用 `@nop-chaos/flux-i18n` 当前实例与 locale resources。
- **包 B 模式**: `ui` 自建 fallback/getter，仓库未见 `flux-i18n` 注入 `setI18nGetter`。
- **统一建议**: `flux-i18n` 初始化时接入 `@nop-chaos/ui` getter，或抽共享轻量 i18n sink；pagination defaults 也走同一路径。
- **现状**: 同页 renderer 文案可跟随语言切换，UI 基础控件仍可能用英文 fallback/default。
- **风险**: 用户界面语言不一致，UI 文案需维护两套表。
- **为什么值得现在做**: 资源 key 已在 `flux-i18n` 存在，`ui` 也预留 getter，桥接成本低。
- **误报排除**: 不要求 `ui` 直接依赖完整 runtime；报告点是未接线的 i18n bridge。
- **参考文档**: `docs/architecture/flux-design-principles.md`
- **复核状态**: 维度复核通过

### [维度18-02] domain renderer 包直接引入 external selector shim

- **涉及包**: `@nop-chaos/flux-react` vs domain renderers
- **文件**: `packages/flow-designer-renderers/src/designer-context.ts:1-13`; `packages/spreadsheet-renderers/src/page-renderer.tsx:126-132`; `packages/report-designer-renderers/src/page-renderer.tsx:406-419`; `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:1-2`
- **证据片段**:
  ```ts
  import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
  ```
- **严重程度**: 初审 P2，复核驳回
- **不一致类别**: hook/store
- **包 A 模式**: `flux-react` 内部有自有 selector subscription helper。
- **包 B 模式**: domain renderers 直接 import external shim。
- **统一建议**: 初审建议 `flux-react` 公开统一 hook。
- **现状**: 多个 domain renderers 主路径使用 external shim。
- **风险**: 初审认为 React subscription adapter 迁移时可能行为分裂。
- **为什么值得现在做**: 初审认为跨 4 个 domain 复制。
- **误报排除**: 复核确认 owner docs 未要求 domain packages 必须经 `flux-react` 包装该 hook，且 `flux-react` 未公开 adapter；当前缺少 contract 违背或 runtime bug。
- **参考文档**: `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 已驳回

## 深挖第 2 轮追加

### [维度18-03] Spreadsheet host action provider 丢失 core `cancelled` 结果语义

- **涉及包**: `@nop-chaos/spreadsheet-renderers` vs `@nop-chaos/report-designer-renderers`
- **文件**: `packages/spreadsheet-renderers/src/host-action-provider.ts:23-28`; `packages/report-designer-renderers/src/host-action-provider.ts:40-47`; `packages/spreadsheet-core/src/commands.ts:213-218`
- **证据片段**:

  ```ts
  export interface SpreadsheetCommandResult {
    ok: boolean;
    changed: boolean;
    cancelled?: boolean;
    error?: unknown;
    data?: unknown;
  }

  export function toSpreadsheetActionResult(response: SpreadsheetCommandResult): ActionResult {
    return {
      ok: response.ok,
      data: response.data,
      error: toActionError(response.error),
    };
  }
  ```

- **严重程度**: P2
- **不一致类别**: host action result mapping / cancellation semantics
- **包 A 模式**: spreadsheet result has `cancelled`, but provider drops it.
- **包 B 模式**: report designer provider preserves `cancelled`.
- **统一建议**: Map `cancelled: response.cancelled` and add provider tests.
- **现状**: spreadsheet host action cancellation is reclassified as generic failure upstream.
- **风险**: action pipeline, debugger, monitor, `onError` cannot distinguish user cancellation from failure.
- **为什么值得现在做**: Shared `ActionResult.cancelled` exists; mapping omission is localized.
- **误报排除**: 子项复核降为 P2；语义 loss 成立，但不是 hard P1 after recheck.
- **参考文档**: `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 子项复核通过

## 维度复核结论

- [维度18-01]: 保留 (P2)。UI i18n bridge 未接线。
- [维度18-02]: 驳回。当前无 contract 要求统一 selector shim。
- [维度18-03]: 保留并经子项复核降为 P2。spreadsheet provider drops cancelled semantics。

## 子项复核结论

- [维度18-03]: 成立 (P2)。`cancelled` 映射遗漏会导致上游分类丢失。

## 最终保留项

| 编号  | 严重程度 | 文件                                                               | 一句话摘要                                         |
| ----- | -------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| 18-01 | P2       | `packages/ui/src/lib/i18n.ts:1-25`                                 | UI 私有 i18n fallback 未接入 flux-i18n 当前实例    |
| 18-03 | P2       | `packages/spreadsheet-renderers/src/host-action-provider.ts:23-28` | spreadsheet host action result 丢失 cancelled 语义 |
