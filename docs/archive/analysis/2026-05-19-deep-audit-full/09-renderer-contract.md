# 维度 09: 渲染器契约合规性

## 第 1 轮（初审）

### [维度09-01] `detail-field` wrap:true 内层 control root 丢弃 `meta.className`

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:307-333`
- **证据片段**:
  ```tsx
  return (
    <>
      <div className={cn('nop-detail-field')} data-slot="field-control">
        <div data-slot="detail-field-viewer">
          {viewerContent ?? (
            <span>
              {fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : '—'}
  ```
- **严重程度**: P2
- **契约条款**: field-like widget 的 `props.meta.className` 应落到 canonical control root。
- **现状**: `detail-field` 内层实际控制根只包含 `nop-detail-field`，不合并 schema `className`。
- **风险**: schema 作者无法像其他高级字段一样定制实际 control root，样式/测试定位不一致。
- **建议**: 改为 `className={cn('nop-detail-field', props.meta.className)}`；`testid/cid` 可继续留给 FieldFrame。
- **为什么值得现在做**: 修复面小，消除同类高级字段 override 例外。
- **误报排除**: 不要求 wrapped 字段重复 `cid/testid`；仅聚焦 `className` control root。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/styling-system.md`
- **复核状态**: 维度复核通过

### [维度09-02] table 声明式事件回调传 `null`，丢失 UI event/semantic payload

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-pagination.ts:52-67`; `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:66-85`
- **证据片段**:
  ```ts
  const handlePageChange = useCallback(
    (page: number) => {
      startTransition(() => {
        if (paginationOwnership === 'local') {
          setLocalCurrentPage(page);
        }
      });
      onPageChange?.(null, {
  ```
  ```ts
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      const nextKeys = checked ? new Set(normalizedRows.map((row) => row.rowKey)) : new Set<string>();
      onSelectionChange?.(null, {
        scope: helpers.createScope(
  ```
- **严重程度**: P2
- **契约条款**: renderer events 应转发 DOM event 或 meaningful semantic event。
- **现状**: table 分页、选择、排序、过滤等事件以 `null` 作为 event 参数。
- **风险**: action/debugger/automation 无法读取事件类型、target 或 semantic type，和其他 renderer event contract 不一致。
- **建议**: UI handler 接收 React event 并转发；程序化路径传 `{ type: 'pageChange', ... }` 等 semantic payload。
- **为什么值得现在做**: data renderer 主路径事件语义集中修复即可收敛。
- **误报排除**: 不是纯程序化状态变更；这些入口由用户点击/选择触发。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 维度复核通过

## 深挖第 2 轮追加

### [维度09-03] `detail-field` / `detail-view` 渲染器直接读取 FormRuntime store

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:144-154`; `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:229-245`
- **证据片段**:

  ```ts
  function readCurrentParentValue(): unknown {
    if (parentForm?.store) {
      return (parentForm.store.getState().values as Record<string, unknown>)[name];
    }

    if (typeof parentScope?.get === 'function') {
      return parentScope.get(name);
    }
  ```

  ```ts
  function readCurrentValueAtPath(path: string): unknown {
    if (parentForm?.store) {
      return getIn(parentForm.store.getState().values, path);
    }
  ```

- **严重程度**: P2
- **契约条款**: renderer 不应直接访问 store，应使用 runtime/hooks 公开 API。
- **现状**: detail renderer 在命令式确认/回滚路径直接读取 `parentForm.store.getState().values`。
- **风险**: renderer 绑定 FormRuntime 内部 store shape，后续 form owner/API 收口会被私有耦合阻碍。
- **建议**: 暴露 `FormRuntime.getValue/readValue(path)` 或把读取下沉到 owner hook。
- **为什么值得现在做**: 直读 store 是 renderer contract 明确禁止项，且已有 hook/owner 可承接。
- **误报排除**: 虽不是 render-phase subscription，但仍是 renderer 直接访问 store。
- **参考文档**: `AGENTS.md`, `docs/architecture/renderer-runtime.md`
- **复核状态**: 维度复核通过

### [维度09-04] CRUD 查询 submit/reset event 传 `undefined`

- **文件**: `packages/flux-renderers-data/src/crud-renderer-ownership.ts:145-181`
- **证据片段**:
  ```ts
  if (shouldFetchOnQueryChange && sequence === submitSequenceRef.current) {
    onQuerySubmit?.(undefined, {
      scope,
      evaluationBindings: { query: nextValues },
    });
  }
  ...
  onQueryReset?.(undefined, {
    scope,
    evaluationBindings: { query: defaultQuery },
  });
  ```
- **严重程度**: P2
- **契约条款**: renderer event payload 应携带 UI event 或 meaningful semantic payload。
- **现状**: CRUD query submit/reset 声明式事件的 event 参数固定为 `undefined`。
- **风险**: action event context 对 CRUD 查询事件不可观测，debugger/automation 无法统一处理。
- **建议**: 按 UI click/submit 入口转发 event；自动刷新路径传 `{ type: 'querySubmit' }` / `{ type: 'queryReset' }`。
- **为什么值得现在做**: 与 table event 同类，可统一修复 data renderer event contract。
- **误报排除**: 不是 table 分页事件重复项，是 CRUD 查询表单独立路径。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 维度复核通过

## 维度复核结论

- [维度09-01]: 保留 (P2)。control root 未合并 `meta.className`。
- [维度09-02]: 保留 (P2)。table events 用 `null`。
- [维度09-03]: 保留 (P2)。detail renderer 直读 FormRuntime store。
- [维度09-04]: 保留 (P2)。CRUD query events 用 `undefined`。

## 子项复核结论

- 低风险 P2 批量复核通过。建议后续一并检查 `use-table-handle.ts` 的 `onRefresh/onPageChange` 事件 payload。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                             | 一句话摘要                                      |
| ----- | -------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| 09-01 | P2       | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:307-333` | detail-field control root 丢弃 schema className |
| 09-02 | P2       | `packages/flux-renderers-data/src/table-renderer/use-table-pagination.ts:52-67`  | table 声明事件丢失 UI event/semantic payload    |
| 09-03 | P2       | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:144-154` | detail renderer 直读 FormRuntime store          |
| 09-04 | P2       | `packages/flux-renderers-data/src/crud-renderer-ownership.ts:145-181`            | CRUD query submit/reset event payload 为空      |
