# 07 生命周期与副作用归属

## 复核统计

- 初审条目: 2
- 维度复核: 完成
- 子项复核: 2 条
- 保留: 1
- 降级: 1
- 驳回: 0

## 保留

### [维度07] report-designer page renderer 在 React 层重复触发 core-owned 初始 refresh

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:145-147`, `packages/report-designer-core/src/core.ts:154-170`, `packages/report-designer-core/src/core.ts:283`
- **证据片段**:
  ```ts
  145:   useEffect(() => {
  146:     void core.refreshFieldSources();
  147:   }, [core]);
  ```
  ```ts
  154: async function refreshDerivedState() {
  162:   const fieldSources = await loadFieldSources({
  283: void refreshDerivedState();
  ```
- **严重程度**: P2
- **effect 职责**: field-source bootstrap refresh
- **应归属层级**: runtime 层 / report-designer core
- **现状**: core 构造时已启动初始 field-source 加载，renderer mount effect 又追加一次 `refreshFieldSources()`。
- **建议**: 保留 core 侧唯一 bootstrap owner，renderer 不再重复 kick off 初始刷新。
- **为什么值得现在做**: 这是明确的 ownership duplication，不依赖复杂推断。
- **误报排除**: item review确认 core 的两个 refresh path 使用不同 abort slot，当前不是 harmless no-op。
- **历史模式对应**: React effect 重复承担 runtime bootstrap
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: `子项复核通过`

## 已降级

### [维度07] CRUD owner state 仍通过 React effect 做初始化与聚合回写

- **文件**: `packages/flux-renderers-data/src/crud-renderer-state.ts:290-310`, `packages/flux-renderers-data/src/crud-renderer.tsx:73-84`, `packages/flux-renderers-data/src/crud-renderer-state.ts:232-288`
- **证据片段**:
  ```ts
  290:   useEffect(() => {
  297:     if (!isRecord(getIn(snapshot, queryStatePath))) {
  298:       scope.update(queryStatePath, { values: defaultQuery, refreshCount: 0 });
  ```
  ```ts
  73:   useEffect(() => {
  78:     scope.update(ownerPaths.ownerStatePath, {
  79:       query: queryState,
  ```
- **严重程度**: P2
- **effect 职责**: state seeding / aggregate owner-state publish
- **应归属层级**: 更偏 runtime/owner helper，而不是 React sync effect
- **现状**: CRUD 主要状态已收口到显式 slice path，但仍依赖 React effect 初始化缺省分支，并回写聚合 `$_crud.<id>` owner 对象。
- **建议**: 继续把 state bootstrap 和 owner-summary publish 下沉到更明确的 owner/runtime abstraction。
- **为什么值得现在做**: 当前已不是强双状态 bug，但仍是明显的 effect-owned orchestration 残留。
- **误报排除**: item review确认它不是“完全双 owner”，而是较窄的 lifecycle smell。
- **历史模式对应**: effect-driven owner bootstrap 残留
- **参考文档**: `docs/components/crud/design.md`
- **复核状态**: `已降级`

## 零发现

- 未再发现 render-phase store write 的 Bug 15 回归。
- 抽查的 runtime registration effect、timer cleanup 和 listener cleanup 当前路径正常。
