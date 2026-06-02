# 维度 09: 渲染器契约合规性

## 第 1 轮（初审）

### [维度09-01] DynamicRenderer 直接读取 `props.schema.loadAction`，绕过标准事件契约

- **文件**: `packages/flux-renderers-basic/src/dynamic-renderer.tsx:55-75,122`
- **证据片段**:

```ts
// dynamic-renderer.tsx
const loadActionKey = useScopeSelector(
  (data) => props.helpers.evaluate(props.schema.loadAction, data),
);
const loadAction = props.helpers.evaluate(props.schema.loadAction, scope) as ActionSchema;
const evaluatedLoadAction = props.helpers.evaluate(props.schema.loadAction, scope) as ActionSchema;
}, [loadActionKey, props.helpers, props.schema.loadAction, scope]);
```

- **严重程度**: P1
- **现状**: `DynamicRenderer` 仍从 `props.schema.loadAction` 读取原始 schema 并自行 `evaluate`/`dispatch`，而不是通过 `props.events.loadAction` 标准事件通道。违反 compile-once 硬门禁。
- **建议**: 删除对 `props.schema.loadAction` 的运行期读取与自行 dispatch，改为消费 `props.events.loadAction`。
- **渲染器合规评分**: C

### [维度09-02] CrudRenderer 手工伪造 TableRenderer 的 RendererComponentProps

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:232-310,378-379`
- **证据片段**:

```ts
const tableRendererProps: RendererComponentProps<TableSchema> = {
  schema: tableSchema,
  meta: tableMeta,
  node: tableNode,
  regions: tableRegions,
  events: tableEvents,
  helpers: props.helpers,
};
return <TableRenderer {...tableRendererProps} />;
```

- **严重程度**: P1
- **现状**: `CrudRenderer` 直接构造 `RendererComponentProps<TableSchema>` 并传给 `TableRenderer`，绕过标准 `NodeRenderer`/definition 装配路径。
- **建议**: 收口到真正的标准装配路径；若 `helpers.render(tableSchema, ...)` 仍有响应式问题，应抽出共享的 table view/controller 层。
- **渲染器合规评分**: C

### 已复核但不保留的 suspect

- `crud-renderer.tsx:174` 的 `props.schema.id` 读取仅用于派生 `queryFormId`，不属于业务数据 raw-schema-read。
- `variant-field/variant-field-view.tsx` 的 direct `FieldFrame` 有 owner doc 支撑，未见 shared renderer contract 违例。

## 深挖第 2 轮追加

### [维度09-03] useSurfaceRenderer 通过 `helpers.dispatch` 私有附加字段偷取 actionScope/componentRegistry

- **文件**: `packages/flux-renderers-basic/src/use-surface-renderer.ts:13-25,176-178`
- **证据片段**:

```ts
// 通过 dispatch 私有字段获取 ambient capabilities
const actionScope = (helpers.dispatch as unknown as { __actionScope?: ActionScope }).__actionScope;
const componentRegistry = (
  helpers.dispatch as unknown as { __componentRegistry?: ComponentRegistry }
).__componentRegistry;
```

- **严重程度**: P1
- **现状**: owner doc 明确 ambient runtime capabilities 应通过 `useCurrentActionScope()`/`useCurrentComponentRegistry()` 获取；但 live code 反射读取 `helpers.dispatch.__actionScope`/`.__componentRegistry` 私有字段来组装 surface entry。
- **风险**: 这不是标准 renderer hooks 契约的一部分，任何 dispatch helper 实现替换、包装或宿主自定义都可能让 dialog/drawer 的 capability/action 边界静默失效。
- **建议**: 改为使用标准 `useCurrentActionScope()`/`useCurrentComponentRegistry()` 获取。
- **渲染器合规评分**: C

### [维度09-04] useSurfaceRenderer 零参数调用事件处理器，丢失标准事件契约上下文

- **文件**: `packages/flux-renderers-basic/src/use-surface-renderer.ts:179-197,224-241,338-343,355-364`
- **证据片段**:

```ts
eventHandlers.onOpen?.();
eventHandlers.onClose?.();
// 保存为零参数闭包
entry.onOpen = () => eventHandlers.onOpen?.();
entry.onClose = () => eventHandlers.onClose?.();
```

- **严重程度**: P2
- **现状**: dialog/drawer 打开关闭主路径只执行零参数 `onOpen?.()`/`onClose?.()`；未传 semantic event payload、scope、kind、surfaceId 等 ActionContext 信息。
- **风险**: schema 侧 action 无法稳定拿到 surface 生命周期语义。
- **建议**: surface 事件应提供有载荷的事件对象，包含 surfaceId、kind、open state 等上下文。
- **渲染器合规评分**: D (event contract)

## 维度复核结论

- [维度09-01]: 驳回。`loadAction` 不是事件处理器而是程序化数据源属性，`props.schema.loadAction` + `helpers.dispatch()` 是标准契约 API，不违反 compile-once。
- [维度09-02]: 保留 P1。`CrudRenderer` 绕过标准 `NodeRenderer` 装配路径，`templateNode`/`node`/`regions` 全部伪造，是真实的合约违例。
- [维度09-03]: 保留 P1。`useSurfaceRenderer` 通过 `dispatch` 私有字段 `__actionScope`/`__componentRegistry` 获取 ambient capabilities，而非标准 hooks `useCurrentActionScope()`/`useCurrentComponentRegistry()`。
- [维度09-04]: 保留 P2。事件处理器 `onOpen`/`onClose` 零参数调用，未传递 semantic event payload 和 ActionContext。

### 需要子项复核的高风险条目

- 09-02: 修复工作量大，涉及 CrudRenderer 架构调整
- 09-03: 修复简单但需验证 surface 生命周期时序不受影响

## 最终保留项

| 编号  | 严重程度 | 文件                              | 摘要                                      |
| ----- | -------- | --------------------------------- | ----------------------------------------- |
| 09-02 | P1       | `crud-renderer.tsx:232-310`       | 伪造 TableRenderer RendererComponentProps |
| 09-03 | P1       | `use-surface-renderer.ts:13-25`   | dispatch 私有字段替代标准 hooks           |
| 09-04 | P2       | `use-surface-renderer.ts:179-197` | 事件处理器零参数调用                      |
