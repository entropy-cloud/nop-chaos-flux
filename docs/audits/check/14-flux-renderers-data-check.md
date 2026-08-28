# 14 flux-renderers-data 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-renderers-data/src/` 共 81 个源文件（排除 `*.test.*` 与 `__tests__`）、16,796 行。table/crud 核心链路（table-renderer + 33 个 table-renderer/ 子模块 + crud 全家 + list/pagination/infinite-scroll + chart/tree/sparkline/stat-tile 渲染器主体）全文精读约 14,212 行（≈85%）；其余 13 个 schema/definition 声明型文件（schemas.ts、crud-schema.ts、data-renderer-definitions.ts、crud-renderer-definition.ts、sparkline-path.ts、test-support.tsx、w2a-\* 等，约 2,584 行）经结构抽读 + 全包模式扫描覆盖，100% 文件触达。
- 结论概览：**P0 x0 / P1 x3 / P2 x6 / P3 x11**。总评：本包工程质量整体较高——排序/筛选/分页/选择/列宽/拖拽的 ownership（local/controlled/scope）三态矩阵成体系且有 dev 误配告警，行级 memo bailout（MemoizedDataRow 内容比较）设计扎实，异步竞态（saveGeneration/AbortController/单槽 resolver）治理到位，无 `as any`/`@ts-ignore`，监听/定时器全部配对清理，i18n 主链路走 `t()`。三条 P1 集中在两个主题：行级快编（quickEdit 多列 + 保存条）相对单格路径的**错误反馈缺失与草稿无差别重置**，以及 list 无限滚动在无 `total` 时的**load-more 死循环**。跨包两条线索均完成裁定：F-05（Date/Map 顶层 payload）在本包渲染器侧**无直接消费点、放大面为 0**；F-01（meta 引用振荡）**不破坏行级 memo**，但经"受控 ownership 派生链每渲染重建"形成次级放大面（见 F-05 条目内裁定）。

## P0 缺陷

无。未发现满足"输入 → 路径 → 错误结果"完整必然推理链的缺陷。

## P1 隐患

### F-01 行级快编（quickEdit 多列 + 保存条）保存失败完全静默，与单格路径的错误反馈不对称（D5）

- 位置：`packages/flux-renderers-data/src/table-renderer/use-row-quick-edit-draft.tsx:224-226`（消费缺口在 `table-renderer/table-body-row-rendering.tsx:125-130`）
- 摘录：

```tsx
// table-body-row-rendering.tsx:125 — 未传 onSaveError
const rowDraft = useRowQuickEditDraft({
  record: entry.record,
  rowScope,
  helpers,
  saveAction: schemaProps.quickSaveItemAction ?? schemaProps.quickSaveAction,
});

// use-row-quick-edit-draft.tsx:224-226 — catch 后 onSaveError 为 undefined，无任何回退
} catch (error) {
  if (saveGenerationRef.current !== generation) return;
  onSaveError?.(error);
}
```

- 对照（单格路径有完整反馈）：`table-renderer/table-quick-edit-cell.tsx:93-98` 为 `useTableQuickEditController` 传 `onSaveError` → `env.notify('warning', …)`；且 `useRowQuickEditDraft` 的输入接口本身声明了 `onSaveError?`（use-row-quick-edit-draft.tsx:64），证明通道存在但装配遗漏。
- 推理链：列声明 `quickEdit`（非 saveImmediately、非 dialog）+ 表声明 `quickSaveItemAction` → DataRowView 走行级草稿，`TableQuickEditCell` 的 `ownCtrl` 收到 `saveAction: undefined`（table-quick-edit-cell.tsx:91），保存只经保存条 `rowDraft.runSave()` → ajax 失败时 dispatch 以 `{ok:false,error}` resolve（flux-runtime action-adapter 仅 `showToast`/`alert` 主动 notify，ajax 失败不 notify）→ `isExplicitActionFailure` throw → catch → `onSaveError?.()` 无操作。用户视角：点保存 → 按钮短暂转圈 → 恢复，无 toast、无错误态、无控制台输出；草稿仍 dirty，用户无从得知失败原因。
- 影响：所有行级快编保存失败（网络错误、后端校验拒绝）零反馈；与单格路径行为不一致，排障困难。
- 修复方向：DataRowView 用 `useRendererEnv()` 构造与 table-quick-edit-cell.tsx:93-98 相同的 `onSaveError` 传入 `useRowQuickEditDraft`；补一条"行级快编保存失败触发 notify"的回归测试。

### F-02 行级快编草稿按 record 引用无差别重置，轮询刷新期间用户编辑必被清空；单格路径已有深比较而行级路径缺失（D1）

- 位置：`packages/flux-renderers-data/src/table-renderer/use-row-quick-edit-draft.tsx:164-168`（对照 `table-renderer/table-quick-edit-controller.ts:231-255`）
- 摘录：

```ts
// use-row-quick-edit-draft.tsx:164-168 —— record 引用一变即整体重置，无值比较
useEffect(() => {
  draftRecordRef.current = { ...record };
  savedRecordRef.current = { ...record };
  draftScopeStore.publish(['$slot.record']);
}, [draftScopeStore, record]);

// 对照 table-quick-edit-controller.ts:235-236 —— 单格路径用 areRecordsEqual 决定 honestReset
const recordChanged = !areRecordsEqual(lastRecordRef.current, record);
const honestReset = fieldChanged || (!hasCustomBody && valueChanged) || recordChanged;
```

- 推理链：CRUD 配 `polling`（或宿主任何定时刷新/refreshTable）→ 数据重新发布 → `props.source` 数组重建，行记录为新对象（JSON 反序列化必然新引用）→ `entry.record` 引用变化 → 行级草稿 effect 重置 `draftRecordRef`/`savedRecordRef` → 用户正在编辑的多列未保存草稿全部丢弃。同文件 `applyQueryToRows` 与表格行 scope 都按 rowKey 稳定复用，唯独草稿按引用判变。单格 controller 的 `areRecordsEqual`（递归深比较）证明"值未变不应重置"是既有设计意图，行级路径未对齐。
- 影响：`crud polling + quickEdit`（或任何静默刷新 + 行级快编）组合下，每次轮询 tick 都会清空编辑中内容；即便数据内容完全相同（新对象同值）也重置。
- 修复方向：行级草稿复用 `areRecordsEqual`（或将其提为共享工具）做 honestReset 判定；补"record 引用变化但内容相等时草稿保留"的回归测试。

### F-03 list 无限滚动在未提供 `total` 时 `hasMore` 恒真，叠加短页续载形成无终止的 load-more 请求循环（D1）

- 位置：`packages/flux-renderers-data/src/list-pagination.ts:161-166` + `src/use-infinite-scroll.ts:144-149` + `src/list-renderer.tsx:304-313`
- 摘录：

```ts
// list-pagination.ts:161-166 —— 无 explicitTotal 时 hasMore 永远为 true
const hasMore =
  config?.hasMore === false
    ? false
    : explicitTotal !== undefined
      ? currentPage < totalPages // ← 只有给了 total 才有终止条件
      : true;

// use-infinite-scroll.ts:144-149 —— settle 后哨兵仍在视口即 0ms 续载
if (!enabledRef.current || !isSentinelInViewport(sentinel)) {
  return;
}
pendingTimer = setTimeout(triggerLoad, 0);
```

- 推理链：独立 `list` 渲染器配 `pagination: { enabled: true, mode: 'infinite' }` 且不配 `total`/`hasMore:false` → `hasMore` 恒 true → 哨兵常驻（`infiniteSentinelEnabled` 恒 true）→ 首次触发 `handleLoadMore`：`applyPage(nextPage)` 被 `totalPages`（由 itemCount 兜底计算）钳到最后一页后返回 `undefined`，但 `effectivePage = applied ?? nextPage` 仍递增并派发 `list:load-more`（onLoadMore 返回 dispatch Promise，thenable）→ settle ok + 哨兵仍在视口 → `setTimeout(triggerLoad, 0)` → `loadingRef` 已复位 → 再次 `handleLoadMore` → 再派发……页面状态停在最后一页，但 load-more 事件以 0ms + 网络往返的节奏无限派发，宿主每次都发起一次请求。
- 影响：数据耗尽后（或宿主一次性给全量 items 时）持续无限请求风暴；页码 payload 每轮 +1 与实际数据脱节。
- 修复方向：`hasMore` 在无 explicitTotal 时回退为 `currentPage < totalPages`（以 itemCount 兜底 total 已有，两者应一致）；或续载路径在 `applyPage` 返回 `undefined`（未发生写入）时视为终止。补"无 total + infinite + 单页数据不满屏 → 有限次触发"的回归测试。

## P2 风险

### F-04 `__crudLoadRevision` 私有刷新计数器直接写入共享渲染 scope，违反"绑定不得暴露实现抖动"契约（D2）

- 位置：`packages/flux-renderers-data/src/crud-renderer.tsx:190-197`（消费侧防御在 `crud-renderer-load.ts:219-233`）
- 摘录：

```ts
const loadNonceRef = useRef(0);
useEffect(() => {
  if (!useLoadAction || !scope) {
    return;
  }
  loadNonceRef.current += 1;
  scope.update('__crudLoadRevision', loadNonceRef.current);
}, [useLoadAction, scope, loadResult]);
```

- 问题：`scope` 是 CRUD 所在的词法渲染 scope（通常页面级）。`renderer-runtime.md` 明确规定 "renderer-owned public bindings should expose stable semantic fields, not implementation jitter such as internal refresh counters or forced-rerender sentinels"——此键恰是命名点名的反模式。后果：(1) 页面 scope 的 `readVisible()`/`materializeVisible()` 快照被污染（对话框 scope 种子、调试器、`${...}` 广播读都能看到 `__crudLoadRevision: 3`）；(2) 通配/broad-access 订阅者在每次 CRUD load settle 时被额外通知一次；(3) 同 scope 多个 CRUD 共写同一键互相覆盖（虽然 nonce 语义仍成立，但通知会被合并/放大不可控）。`crud-renderer-load.ts:223` 的 `__setIgnoreWritesTo` 把它列为自有路径，说明键名已是跨文件契约。
- 修复方向：把 nonce 移入 owner state slice（`$_crud.<id>` 内部字段，配合 `$crud` 投影 store 的重通知通道），或让 `createReadonlyScopeBinding` 的 store 支持显式 `notify()`；避免向共享 scope 写裸魔法键。

### F-05 受控 sort/filter ownership 下派生链每渲染全量重建，构成 05 号报告 F-01（meta 振荡）在本包的次级放大面（D6 + 跨包裁定）

- 位置 A（振荡源，跨包）：`packages/flux-runtime/src/node-runtime.ts:237-249`（05 号 F-01，~50% 无变化 scope 通知触发无效重渲染）。
- 位置 B（本包放大链）：
  - `packages/flux-renderers-data/src/table-renderer/use-table-sort.ts:94-108`：`controlledSingleSort` 的 useMemo 依赖**整个** `controlledSortInput`（即 schemaProps，table-renderer.tsx:279 的 H10 注释自证其"identity churns every render"）→ 每渲染新建 `{column,direction}` 对象；`use-table-filter.ts:33-36` 的 `controlledFilterState` 同样依赖整个 `schemaProps` 每渲染重建新 Set。
  - `table-renderer.tsx:180-183`：`filteredData` useMemo 依赖 `sortState/sortEntries/filterState` → 受控模式下每次渲染 `processTableData` 全量重跑（`table-data.ts:96-134`：重建全部 entry 对象 + O(n·log n) 排序 + 过滤）。
  - `use-table-row-scope-cache.ts:261`：hook 每次渲染返回 `new Map(rowScopeCache)` → `table-body-rows.tsx:349-371` VirtualBody 的 `flattenedItems` memo 恒失效。
  - `table-header-row.tsx:61-67`：`TableHeaderRow` 完全未 memo，每次表级渲染都重渲染全部表头（含每列 `labelRegion.render()`）。
- 跨包裁定（F-01 影响面）：本包**不存在依赖 meta 引用相等的 memo 边界**——`MemoizedDataRow`（table-body-row-rendering.tsx:583-618）逐字段内容比较（`entry.record`/`rowScope`/`rowKey`…），regions/events 由 NodeRenderer 的 useMemo 保持稳定（node-renderer-resolved.tsx:273-317），因此 F-01 触发的无效重渲染**不会**击穿行级 bailout。但其代价仍被放大：默认 local/scope ownership 下 `filteredData` 依赖稳定、重渲染只损耗表头/列设置子树；一旦宿主声明 `sortOwnership: 'controlled'`（或 filter 同理），F-01 的每次无效通知都伴随全表重排序/重过滤/表头重渲染。CRUD 委派内部表固定用 `'scope'`，不命中。
- 修复方向：`controlledSingleSort`/`controlledFilterState` 的 memo 依赖收敛到具体字段（`schemaProps.sortColumn/sort/sortEntries/filters` 值级比较，如 `shallowEqualRecords`）；`createRowScopeCacheSnapshot` 在版本不变时缓存返回 Map；为 `TableHeaderRow` 增加 memo。可与 05 号 F-01 的 runtime 侧修复独立落地。

### F-06 表头全选 checkbox 的判定基准错位：`selectedRowCount === sourceLength` 把"选择集口径"与"顶层行数"混用，树表/checkableWhen 场景全选态显示错误（D1）

- 位置：`packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:416-424`（Flat）与 `:551-563`（Nested）
- 摘录：

```tsx
<Checkbox
  checked={allSelected && selectedRowCount === sourceLength && sourceLength > 0}
  indeterminate={!allSelected && selectedRowCount > 0}
  ...
```

- 问题：`allSelected`/`selectedRowCount` 基于 `useTableSelection` 接收的 `treeFlattenedData`（含展开树子行、checkableWhen 过滤前的全量，table-renderer.tsx:243、use-table-selection.ts:145-153），而 `sourceLength` 是 `filteredData.length`（仅顶层行，table-renderer.tsx:593）。两种确定性错位：(1) 树表 + 已展开子行被选中：`selectedRowCount > sourceLength` → 已全选却显示未选（`indeterminate` 也为 false，两个态都不亮）；(2) `checkableWhen` 使部分行不可选：`selectedRowCount` 恒小于 `sourceLength` → 全选永不显示 checked（只停在 indeterminate）。
- 影响：纯 UI 状态错误（selectAll 行为本身正确），但用户无法从表头确认"已全部选中"。
- 修复方向：`checked` 改为 `allSelected && selectableCount > 0`（selectableCount = checkableRowKeys 过滤后的 `normalizedRows.length`，与 `allSelected` 同口径），树表下与 `selectedRowKeys.size` 对齐可选用"全选可见行"语义并文档化。

### F-07 `keepOnPageChange: false`（默认）并不清除其他页仍在数据集中的行选择，与 design.md T10 的"跨页 key 剪除"表述不符；现有测试锚未构造真实跨页数据集（D1，suspect）

- 位置：`packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:63-98`
- 摘录：

```ts
const currentRowKeySet = useMemo(
  () => new Set(normalizedRows.map((row) => row.rowKey)),
  [normalizedRows],           // ← normalizedRows = treeFlattenedData 全量数据集（非当前页）
);
...
if (keepOnPageChange || localSelectedRowKeys.size === 0) {
  return localSelectedRowKeys;
}
// prune 只删除"不在数据集"的 key；存在于其他页的 key 被保留
```

- 证据链：`docs/components/table/design.md:183` 声称 "`false`（默认）时按 `currentRowKeySet` prune → `k99` 剪除"（k99 被描述为 "page 2" 的行）；但 `currentRowKeySet` 是全量数据集键集（分页在 `paginateTableData` 之后的 `processedData` 上做，useTableSelection 拿到的是未分页数据），翻页后其他页行的 key 仍在集合内 → 不剪除。测试锚 `__tests__/table-b33-advanced-boundary.test.tsx:332-359` 的 `source=[{id:'k1'}]` 中 k99 根本不在数据集，测的是"已删除行剪除"而非"跨页行剪除"，注释"because it is not on the current page"与实际断言依据不符。AMIS `keepItemSelectionOnPageChange` 默认 false 的语义是跨页不保留。
- 影响：与 AMIS 默认行为及自家设计文档表述偏离：客户端分页 + 默认配置下，翻页不清选择、`onSelectionChange` payload 始终含其他页 key；依赖"默认跨页清选择"的宿主会得到意外批量集。标 suspect：也可能是有意的"数据集级保留"语义（H21 注释提到"真实跨页行（存在于数据集）在 check 时保留"），但那样 design.md 的 T10 表述与测试注释需要修正，二者必居其一。
- 修复方向：裁定语义——若对齐 AMIS，`currentRowKeySet` 应基于当前页 `processedData`；若维持现状，修正 design.md T10 表述并补一条"跨页数据集真实存在时 false 也保留"的显式测试。

### F-08 `ListItemView` 在渲染期（useState 初始化器）创建 runtime-owned 子 scope，违反"owner 资源仅在提交后分配"，StrictMode 下产生 scope 泄漏（D2/D3）

- 位置：`packages/flux-renderers-data/src/list-renderer.tsx:75-85`
- 摘录：

```tsx
function ListItemView(props: ListItemViewProps) {
  const helpers = owner.helpers;
  const [itemScope] = useState<ScopeRef>(() => helpers.createScope({ item, index }));  // ← 渲染期分配

  useEffect(() => {
    itemScope.merge({ item, index });
  }, [itemScope, item, index]);

  useEffect(() => {
    return () => {
      helpers.disposeScope(itemScope.id);
    };
  }, [helpers, itemScope.id]);
```

- 问题：`renderer-runtime.md` 架构护栏要求 "Runtime-owned React boundaries must allocate owner resources only after commit"。在 useState 初始化器里 `createScope` 把 scope 注册进 runtime `ownedScopeDisposers`：React 18+ StrictMode 双渲染会执行两次初始化器、只保留第二次的值，被丢弃的那次分配**永远不会被 dispose**（组件只 dispose 保留的那个），滞留至 runtime 销毁（每个 list item 一个 scope + store）。生产单渲染无泄漏，但渲染期副作用本身违反护栏，且与表行 scope 的提交期模式（use-table-row-scope-cache.ts:185-259 全部在 useLayoutEffect 中创建）不一致。
- 修复方向：改为 useLayoutEffect 内创建 + ref 持有（或复用表行 scope cache 模式），首渲染先用 `bindings` 传给 region（`regions.item.render({ bindings: { item, index } })` 本身就会建一次性 scope，可评估直接依赖它）。

### F-09 useCrudPolling 数据源解析重试无上限，且多 CRUD 共享同一 data-source 时卸载 cancel 会停掉他人轮询（D3）

- 位置：`packages/flux-renderers-data/src/use-crud-polling.ts:124-157`
- 摘录：

```ts
if (!handle) {
  ...
  retryTimer = setTimeout(attempt, RESOLVE_RETRY_MS);   // ← 无次数上限，注释自称 "bounded timer" 但 bound 的只是清理
  return;
}
...
return () => {
  if (retryTimer !== undefined) { clearTimeout(retryTimer); ... }
  invokeCapability(handleRef.current, 'cancel');        // ← 卸载时无条件 cancel
  lastActionRef.current = 'cancel';
};
```

- 问题 1：`polling.enabled: true` 但上游根本不存在 data-source（误配）时，250ms 重试循环伴随组件生命周期永不停止（每轮遍历 registry debug 快照）。
- 问题 2：两个 CRUD 指向同一 `data-source`（A、B）时：A mount → start；B mount → start；A unmount → `cancel` → 轮询对 B 也停止。start/cancel 是无引用计数的裸能力调用，多消费者所有权未治理。
- 修复方向：重试加上限（如 20 次后 dev warn 放弃）；cancel 前判断本实例是否曾 start 且当前 handle 的轮询是否可能被他人依赖（最小改法：仅当 `lastActionRef.current === 'start'` 且 registry 中无其他消费者时 cancel，或为 data-source 能力增加引用计数）。

## P3 提示

1. **`use-table-lazy-children` 的 `mountedRef` 是死守卫**：`table-renderer/use-table-lazy-children.ts:38` 声明 `mountedRef = useRef(true)` 并在两处 `if (!mountedRef.current) return`，但全文件没有把它置 false 的卸载 effect——守卫恒真。卸载后 late settle 仍会 `setNodeState`（React 18+ 无警告 no-op，无实害），属未完成的意图，建议补 `useEffect(() => () => { mountedRef.current = false; }, [])` 或删除守卫。
2. **表行 scope 的 `publishRowScopePayload` 是 merge 语义，不删除消失键**：`table-renderer/use-table-row-scope-cache.ts:92-119`。rowKey 稳定但新 record 字段集缩小时（如刷新返回更瘦的对象），旧字段滞留行 scope，单元格/表达式读到陈旧值。suspect——未见必现场景，建议 merge 前对 previous 独有键写 undefined 或改 replace。
3. **行拖拽在重复 rowKey 时丢行 + key 冲突**：`table-renderer/use-row-drag-sort.ts:74-102` 以 `row.rowKey`（非去重的 `cacheKey`）建 `rowsByKey`/`orderedKeys`；draggable 表出现重复 rowKey（dev 已有 warnOnDuplicateRowKeys 提示）时，orderedRows 会用同一 entry 重复渲染（React key 冲突）且先前重复行丢失。建议改用 cacheKey。
4. **硬编码英文 UI/a11y 文案**：`table-renderer/table-expanded-row.tsx:48` 的 `Column ${index + 1}`（响应式展开卡缺省标签，用户可见）；`chart-renderer.tsx:138` 的 `'Value'`（图例/tooltip 缺省 label）；`chart-renderer.tsx:264-265` 的 `'References: '` / `'reference'`（屏幕阅读器摘要）。均应走 `t()`（`check:i18n-keys` 只覆盖显式 key，拦不住这类字面量）。
5. **chart sr-only 数据摘要有重复 key 且 pie 未截断**：`chart-renderer.tsx:592` `<li key={line}>` —— 两行数据序列化结果相同即 key 冲突；`chartDataSummary` 的 pie 分支（:246-247）未像 cartesian/heatmap 那样 `slice(0, 20)`，大数据集时 sr-only 列表无界。
6. **斑马纹按 `sourceIndex` 而非显示序**：`table-flattened-items.ts:59` / `table-body-row-rendering.tsx:223` 的 `isEven = entry.sourceIndex % 2 === 0`。客户端排序后 sourceIndex 保持原始位置序，`data-striped` 条纹不再与视觉行序交替（排序键相同的多行会出现连续同色）。suspect——若意图是"行身份稳定条纹"请注释声明，否则应改用 viewIndex/rowIndex。
7. **`expandedRowKeys` / 树 `initiallyExpanded` 仅作种子**：`table-renderer/use-table-expand.ts:5-7`、`tree-renderer.tsx:125` 都只在 useState 初始化器读一次 schema 值，后续 schema 变更不生效；与 sort/filter/pagination/selection 均有 controlled 通道形成不对称。建议文档声明"initial-only"或补受控通道。
8. **crud-load 无限模式快速翻页的丢页竞态**：`crud-renderer-load.ts:301-307` accumulate 判定用注册 effect 闭包里的 `pagination.currentPage`，连续 dispatch 时被 abort 的中间页不追加（cancelled 分支 return），`lastSettledPageRef` 跳跃可能造成 [page1, page3] 缺 page2。use-infinite-scroll 的 G5 并发守卫下触发面窄，suspect。
9. **`applyQueryToRows` 的 keyword 字段名启发式**：`crud-renderer-state.ts:187` 字段名 lowercase 后包含 `"keyword"` 即触发全行搜索——名为 `productKeyword`/`keyword2` 的普通字段会意外变成全局搜索。建议精确匹配 `keyword` 或文档化。
10. **跨文件死代码与私有通道耦合**：`crud-query-region.tsx:3-11` 的 `CrudQueryRegionProps` 全仓无消费者（历史残留）；`crud-renderer-load.ts:190-200` 对 flux-react `reaction-handle-proxy` 的 `__setBindingsProvider/__setScopeOverride/__setIgnoreWritesTo/__setLoadCallbacks` 四个下划线私有钩子做结构化依赖——钩子缺失时全部 `?.()` 静默降级为无 bindings/无结果捕获（loadAction CRUD 静默失效），建议在 flux-react 侧导出正式类型并在注册失败路径 dev warn。
11. **D8 结构**：>700 行 ERROR 级 **0 个**（最大 table-renderer.tsx 697，按门禁 `content.split(/\r?\n/)` 口径 698 仍 < 700）；500–700 行 WARN 级 7 个（table-renderer.tsx 697、crud-renderer.tsx 686、table-body-row-rendering.tsx 672、chart-renderer.tsx 621、tree-renderer.tsx 620、data-renderer-definitions.ts 607、table-header-row.tsx 575）。docs/logs/2026/08-06.md 登记的历史超限三条（crud-renderer-state 794 / table-renderer 737 / crud-renderer 724）均已拆分至 700 以下，**无未注册红、无回退**。

## 检查过程记录

### 精读文件清单（全文或 ≥90%）

- table 主链路：`table-renderer.tsx`、`table-renderer/` 全部 33 个子模块（table-data、table-body-rows、table-body-row-rendering、table-flattened-items、table-header-row、table-header-tree、table-cell-chrome、table-cell-popover、table-expanded-row、table-summary-row、table-pagination-bar、table-loading-overlay、table-quick-edit-cell、table-quick-edit-controller、use-row-quick-edit-draft、use-table-{pagination,sort,filter,selection,expand,visible-columns,tree,lazy-children,handle,controls}、use-column-resize、use-row-drag-sort、use-table-row-scope-cache、use-auto-fill-height、fixed-columns、combine-cells、responsive、column-width-measure、column-settings-state、capability-action-context、table-event-context、types）
- crud 全家：`crud-renderer.tsx`、`crud-renderer-state.ts`、`crud-renderer-load.ts`、`crud-renderer-ownership.ts`、`crud-renderer-delegate.ts`、`crud-renderer-toolbar.tsx`、`crud-renderer-schema-builders.ts`、`crud-query-region.tsx`、`crud-infinite-scroll-area.tsx`、`crud-list-pagination.tsx`、`crud-query-form-id.ts`、`use-crud-polling.ts`、`use-crud-filter-toggle.ts`
- list/pagination/infinite：`list-renderer.tsx`、`list-pagination.ts`、`pagination-renderer.tsx`、`use-infinite-scroll.ts`
- 其余渲染器：`data-source-renderer.tsx`、`chart-renderer.tsx`、`chart-heatmap.tsx`、`chart-sanitize.ts`、`chart-y-axis.ts`、`tree-renderer.tsx`、`tree-node-helpers.ts`、`tree-search.tsx`、`tree-focus-nav.ts`、`sparkline-renderer.tsx`、`stat-tile-renderer.tsx`、`statistics-renderer.tsx`、`data-schema-validation.ts`、`index.tsx`

### 模式扫描（全包 100% 文件）

`as any` x0；`@ts-ignore`/`@ts-expect-error` x0；eslint-disable 共 7 处全部带理由注释（ref 组合、set-state-in-effect 测量回填、TanStack Virtual、jsx-a11y stopPropagation）；空 catch x6 逐一核读均为有意义降级（轮询能力调用 best-effort、checkableWhen 求值失败判不可选、dataTransfer.setData 测试环境、classNameExpr 失败降级、expandableWhen 失败放行、summary 求值失败空串）；非空断言 x15 均有守卫（chart-heatmap 的 `xIndex.get(row.x)!` 由构建闭包保证、use-table-selection `retainedKnown!` 仅在赋值分支内）；setTimeout/setInterval x5 组全部配对清理（polling 重试、tree 分批、infinite 续载、copy 按钮、列宽拖拽 window 监听）；ResizeObserver/IntersectionObserver 各 2 处均 disconnect；requestAnimationFrame 均配 cancelAnimationFrame；JSON.stringify x2 均为序列化键（instancePath/digest）无解析面；硬编码中文仅 1 处 dev console.warn（column-width-measure.ts:80，非 UI 文案）；`key={` 生成抽查：table 行/单元格用 cacheKey/列名兜底、树节点/列表项 key 存在重复值风险（见 P3-3、P3-5）。

### 跨包线索核验记录

1. **05 号 F-05（structuralShareData 对顶层 Date/Map 恒判相等 → 新值跳过发布）**：逐一核读本包全部数据入口守卫——table `Array.isArray(schemaProps.source)`（table-renderer.tsx:104）、crud `normalizeCrudSourceValue` 的数组/`items|rows|records|list` 记录守卫（crud-renderer-state.ts:203-252）、chart `Array.isArray(props.props.source)`（chart-renderer.tsx:102）、tree `toTreeNodes` 数组守卫、list `toListItems` 数组守卫、stat-tile `sanitizeNumber`、sparkline `sanitizeSparklineValues`——**本包渲染器无任何顶层 Date/Map 直接消费点**，非数组/非记录 payload 一律归空而非冻结。裁定：F-05 在本包渲染器侧放大面为 0；残留暴露面在 schema 表达式级消费者（宿主作者把 `${path}` 绑到顶层 Date 型数据源输出），root cause 归 flux-core（01 号 F-02 / 05 号 F-05 位置 B），本包无需代码修改。
2. **05 号 F-01（resolveNodeMeta `changed` 振荡 → ~50% 无变化通知无效重渲染）**：核读本包 memo 边界——`MemoizedDataRow`（table-body-row-rendering.tsx:583-618）逐字段内容比较，不含 meta/parentProps 整体引用；regions/events 的引用稳定性由 `node-renderer-resolved.tsx:243-317` 的 useMemo 保障（依赖在无 scope 变化时稳定）。裁定：F-01 **不击穿**行级 bailout；放大面在表头（未 memo）与受控 ownership 派生链（每渲染重建 sort/filter 状态 → 全表重算），已立案为本报告 F-05（P2）。
3. **crud-load 的 `__set*` 私有通道**：核实 flux-react `reaction-handle-proxy.ts:45-63` 确有四个钩子、`component-handle-registry.ts:429` 的 `getDebugSnapshot` 为生产可用方法（use-crud-polling 的解析回退非 dev-only），无缺失面；耦合风险记 P3-10。

### 覆盖率估计

- 精读（全文/近全文）：约 14,212 行 ≈ 85%（table 33 子模块 + crud 全家 + list/pagination/infinite + chart/tree/sparkline/stat-tile 主体 + 验证/索引）。
- 结构抽读 + 模式扫描：schemas.ts、crud-schema.ts、data-renderer-definitions.ts、crud-renderer-definition.ts、chart-schemas.ts、sparkline-{path,renderer-definition,schemas,schema-validation}、stat-tile-renderer-definition.ts、w2a-data-composition-definitions.ts、test-support.tsx ≈ 15%。该组为 schema/propContracts 声明型数据（逻辑密度低），已抽查 fieldRules/propContracts 与渲染器实现的一致性（columns/cell/buttons/label/quickEdit region 键、actionValue 透传）未见错配。

### 工具性约束

本次为只读审计：未修改 `packages/` 下任何文件、未运行任何 pnpm 命令；仅使用 Read/grep/find/ls/wc 与对 `packages/flux-react`、`packages/flux-runtime`、`scripts/check-oversized-code-files.mjs` 的定点只读核验。唯一写入文件为本报告。
