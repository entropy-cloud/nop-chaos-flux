# 05 响应式订阅精度

## 复核统计

- 初审条目: 3
- 维度复核: 完成
- 子项复核: 2 条
- 保留: 1
- 降级: 2
- 驳回: 0

## 保留

### [维度05] host status publication 仍依赖过宽 snapshot identity

- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx:277-293`, `packages/report-designer-renderers/src/page-renderer.tsx:213-229`, `packages/spreadsheet-renderers/src/page-renderer.tsx:155-171`
- **证据片段**:
  ```tsx
  277: useEffect(() => {
  286:   const summary: DesignerHostStatusSummary = {
  293: }, [layoutBusy, props.node.scope, snapshot, statusPath]);
  ```
  ```tsx
  213: useEffect(() => {
  229: }, [props.node.scope, snapshot, spreadsheetSnapshot, statusPath]);
  ```
- **严重程度**: P2
- **现状**: 只发布少量 summary 字段，但 effect 依赖整个 host snapshot 或其 identity 缓存对象。
- **风险**: 与 summary 无关的 host 变更也会触发重复 publish / owner status 更新。
- **建议**: 改成依赖 summary 使用到的标量字段，或在 publish 前先做 summary-level equality。
- **为什么值得现在做**: 这是多个 host shell 共用的 pattern，会继续被复制。
- **误报排除**: 这里不是 React 必然重渲染 bug，而是 host status publication 粒度偏粗。
- **历史模式对应**: summary effect 依赖 whole snapshot
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `维度复核通过`

## 已降级

### [维度05] `useScopeSelector` 仍是 broad wake/select，而非 path-aware invalidation

- **文件**: `packages/flux-react/src/hooks.ts:104-123`, `packages/flux-runtime/src/scope.ts:52-63`
- **证据片段**:
  ```ts
  104: const subscribe = useMemo(
  111: const getSnapshot = useMemo(
  118: return useSyncExternalStoreWithSelector(
  ```
  ```ts
  52: subscribe(listener) {
  60:     listener(state.lastChange);
  ```
- **严重程度**: P2
- **现状**: hook 直接订阅 scope 广播并对整个 visible snapshot 执行 selector，没有利用 `ScopeChange.paths` 做路径过滤。
- **风险**: 任意同 scope 更新都会唤醒 selector/equality 计算。
- **建议**: 为常见 path selector 增加 changed-path gating，保留全量回退路径。
- **为什么值得现在做**: 这是公共 hook 粒度问题，但 item review确认它更像 broad wakeup，而不是必然 committed rerender。
- **误报排除**: `useSyncExternalStoreWithSelector` 仍会在 equality 成立时阻止最终提交更新。
- **历史模式对应**: broad wake/select invalidation
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: `已降级`

### [维度05] `useCurrentFormModelGeneration` 订阅粒度偏粗，但影响较轻

- **文件**: `packages/flux-react/src/hooks.ts:456-461`
- **证据片段**:
  ```ts
  456: export function useCurrentFormModelGeneration(): number {
  458:   const subscribe = useMemo(() => form?.store.subscribe ?? (() => () => undefined), [form]);
  459:   const getSnapshot = useMemo(() => () => form?.modelGeneration ?? 0, [form]);
  ```
- **严重程度**: P3
- **现状**: hook 只读 `modelGeneration`，却复用全 form store 广播。
- **风险**: 额外 wakeup/compare；当前尚未见到高影响渲染问题。
- **建议**: 若后续继续扩散使用，再考虑提供 dedicated generation subscription。
- **为什么值得现在做**: 先作为轻度观察项记录即可。
- **误报排除**: item review确认它不等于高优先级 field-level 订阅违约。
- **历史模式对应**: small selector on broad store subscribe
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `已降级`

## 零发现

- `subscribeToPath`/字段级表单订阅仍是当前正确基线。
- `NodeRenderer` changed-path gating 仍在工作。
- 抽查的 Context provider value 未发现构造型新对象违约。
- spreadsheet bridge snapshot identity 缓存实现正常。
