# 维度 09：渲染器契约合规性

## 范围与状态

- 审核维度：渲染器契约合规性。
- 来源范围：仅汇总 `stage-1-full-findings-06-10.md`、`raw-findings-07-20.md`、`final-review-results-06-10.md` 与 `summary.md` 中本维度记录。
- 覆盖对象：layout renderer styling contract、repeated region runtime identity、renderer event payload consistency、composite field projection boundary。
- 最终状态：5 项全部保留；P2 2 项，P3 3 项。

## 深挖轮次与收敛说明

第 1 轮初审记录 4 项。第 2-5 轮追加 raw findings 补充 1 项。本次审核在第 5 轮达到执行上限时仍有新增，因此按“达到执行上限后进入最终复核”处理，不声称自然收敛。

## 最终复核摘要

最终复核保留了两类 contract drift：一类是 layout/region/runtime identity 层面的结构性问题，例如 Flex hardcoded layout utilities 和 Tree repeated region 缺 `instancePath`；另一类是跨 renderer event/projection 契约一致性问题，例如 Tabs/CRUD 事件只通过 scope 暴露语义，以及 ObjectField 直接使用 unstable contexts 作为 projection boundary。

## 最终保留项

### [09-01] Flex renderer semantic props 与 marker-only layout contract 冲突

- 文件：`packages/flux-renderers-basic/src/flex.tsx:30-48`
- 证据片段：

```tsx
'nop-flex',
resolveDirection(direction),
wrap && 'flex-wrap',
align === 'center' && 'items-center',
align === 'start' && 'items-start',
align === 'end' && 'items-end',
align === 'stretch' && 'items-stretch',
justify === 'center' && 'justify-center',
justify === 'start' && 'justify-start',
```

- 严重程度：P3
- 当前行为：layout renderer 根据 semantic props 发出 Tailwind layout classes。
- 风险：样式事实来源在 schema className 与 renderer semantic prop mapping 之间分裂。
- 建议：将 layout 移到 schema classes/aliases，或文档化 Flex 为明确 exception。
- 误报排除：renderer 是有意发出 visual layout classes；这是契约张力，不是偶发代码。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调 Flex renderer hardcodes layout utility mapping，作为 marker-only contract 张力保留。

### [09-02] Tree repeated region 缺少 `instancePath`

- 文件：`packages/flux-renderers-data/src/tree-renderer.tsx:87-90`, `packages/flux-renderers-data/src/tree-renderer.tsx:142-155`
- 证据片段：

```tsx
const nodeContent = owner.regions.node
  ? owner.regions.node.render({
      bindings: { node, index, depth, key: nodeKey, parentNode },
    })
  : defaultContent;
```

- 严重程度：P2
- 当前行为：Tree node region rendering 只传 bindings，没有为每个 tree node 提供 repeated `instancePath`。
- 风险：nested renderer state、diagnostics、component handles 或 validation paths 可能缺稳定 runtime instance identity。
- 建议：对每个 tree node 传 deterministic `instancePath/pathSuffix`。
- 误报排除：React keys 存在；问题是 renderer runtime instance identity。
- 最终复核结论：保留 P2。
- 修订标题/理由：无标题修订；最终理由强调 Tree repeated node region 缺 runtime instance path。

### [09-03] Tabs `onChange` event payload 缺稳定 semantic object

- 文件：`packages/flux-renderers-basic/src/tabs.tsx:197-207`
- 证据片段：

```tsx
ownedAxis.setValue(String(next));
const nextIndex = items.findIndex((item, index) => getItemValue(item, index) === String(next));
void props.events.onChange?.(null, {
  scope: props.helpers.createScope(
    { value: next, index: nextIndex },
    { scopeKey: 'tabs', pathSuffix: 'tabs' },
  ),
});
```

- 严重程度：P3
- 当前行为：Tabs 直接 event data 为 `null`，依赖 temporary scope 暴露 `{ value, index }`。
- 风险：event payload shape 与直接传 semantic event data 的 renderer 不一致。
- 建议：传 semantic payload object，同时保留 scope bindings。
- 误报排除：consumer 可读 created scope；问题是跨 renderer event contract 一致性。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调 Tabs change event data 为 null，只在 scope bindings 中提供 `{ value, index }`。

### [09-04] CRUD refresh event payload 缺 semantic object

- 文件：`packages/flux-renderers-data/src/crud-renderer.tsx:167-181`
- 证据片段：

```ts
scope?.update(queryStatePath, {
  values: queryState.values,
  refreshCount: queryState.refreshCount + 1,
});

props.events.onRefresh?.(undefined, {
  scope: crudScope,
});
```

- 严重程度：P3
- 当前行为：Refresh event data 为 `undefined`，依赖 `$crud` scope state。
- 风险：event consumers 缺少直接稳定的 semantic refresh context payload。
- 建议：传 current query/pagination/selection/refresh count 等 payload，同时保留 scope。
- 误报排除：`$crud` scope 存在；问题不是数据完全缺失，而是 payload consistency。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调 CRUD refresh event data 为 undefined，只依赖 `$crud` scope。

### [09-05] ObjectFieldRenderer 直接导入 unstable contexts 并手工重接 form/scope/validation

- 文件：`packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:10-11`, `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:438-444`
- 证据片段：

```tsx
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { FormContext, ScopeContext, ValidationContext } from '@nop-chaos/flux-react/unstable';
```

```tsx
<FormContext.Provider value={childForm ?? undefined}>
  <ScopeContext.Provider value={childScope}>
    <ValidationContext.Provider value={childValidationOwner}>
      <div data-slot="object-field-body">{bodyContent}</div>
    </ValidationContext.Provider>
  </ScopeContext.Provider>
</FormContext.Provider>
```

- 严重程度：P2
- 当前行为：renderer 直接使用 `/unstable` 暴露的 context provider 重新提供 projected form/scope/validation，而不是通过稳定 renderer helper 或标准 hook 边界。
- 风险：复合字段 projection 与 flux-react 内部 context/lifecycle 语义绑定，未来 hooks/runtime boundary 改动时容易漂移；也违背 renderer contract 中“不创建 ad-hoc context/providing chains”的方向。
- 建议：在 `flux-react` 提供稳定 projection boundary API；object-field 改用该 API，避免直接依赖 unstable contexts。
- 误报排除：不是“没有使用 hook”；该组件同时使用 hooks 和 unstable provider，问题是直接改写核心 context 边界。
- 最终复核结论：保留 P2。
- 修订标题/理由：无标题修订；最终理由强调 ObjectField 使用 `flux-react/unstable` contexts 作为 projection boundary。

## 驳回项

本维度最终复核没有驳回项。
