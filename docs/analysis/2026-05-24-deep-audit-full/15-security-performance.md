# 维度 15：安全与性能红线

## 第 1 轮（初审）

### [维度15-01] Tree mode 使用整图 `JSON.stringify` 做交互路径变更检测

- **文件**: `packages/flow-designer-renderers/src/designer-tree-mode.tsx:22-23,66-78`
- **证据片段**:

  ```ts
  function areTreeGraphDocumentsEqual(left: GraphDocument, right: GraphDocument): boolean {
    return JSON.stringify(toComparableTreeGraphDocument(left)) === JSON.stringify(toComparableTreeGraphDocument(right));
  }

  useEffect(() => {
    if (!inputTreeDocument) {
      return;
    }
  ```

- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P1
- **现状**: tree mode wrapper 在 host `treeDocument` 变化后，用整份 projected graph 的 JSON 序列化比较来判断是否接受 host 文档，并且同一 effect 内还会再次比较 local document。
- **风险**: Flow Designer tree mode 属于交互式图编辑路径；节点/边规模增长后，每次 host 文档更新都要序列化完整 graph，违反 `performance-design-requirements.md` P1 “No full-graph stringify checks in hot paths”，并可能放大为可感知卡顿。
- **建议**: 用 tree/graph revision、host accepted revision、或结构化 dirty marker 替代整图 stringify；如果必须比较，限制为小型摘要或增量版本字段，并避免同一 effect 内重复全量比较。
- **为什么值得现在做**: 这是唯一命中的非诊断、非 cache-key、非日志类 `JSON.stringify` 变更检测，且位于设计器交互主路径。
- **误报排除**: 不是日志/序列化/稳定 cache-key/测试诊断；代码明确把整份 graph 文档 stringify 后作为 equality/change detection。
- **历史模式对应**: 性能 owner 文档中的 “full-graph stringify dirty tracking / change detection” 红线。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

## 安全违规

未发现新的安全违规。

- 未手工重复报告 `eval` / `new Function`：按要求仅在发现 lint 之外绕过路径时报告；本轮未发现非标准动态执行绕过。
- fail-closed / policy-like 检查：抽查 `packages/flux-compiler/src/schema-compiler/host-action-validation.ts`，未确认安全敏感默认放行缺陷；相关逻辑更接近 host capability 静态校验边界，不作为权限策略运行时执行。

## 性能违规

发现 1 条：

- `[维度15-01]` `designer-tree-mode.tsx` 使用整图 `JSON.stringify` 做变更检测，命中 P1 性能红线。

## suspect 排除清单

已逐项 live code 复核 `json-stringify-change-detection` 候选：

- `apps/playground/src/pages/performance-table/diagnostics.ts:284/309`：性能诊断辅助 diff，用于场景结果归因；非运行时主路径。
- `apps/playground/src/pages/performance-table/runtime.tsx:76`：perf probe 的 `instancePath` 标记；诊断 renderer 专用。
- `packages/flux-compiler/src/schema-compiler/flux-value-shape-validation.ts:91`：诊断消息中格式化字符串值；非变更检测。
- `packages/flux-react/src/hooks/use-form-hooks.ts:111`：小型 `sourceKinds` query 稳定化 key；非大数据热路径。
- `packages/flux-react/src/node-renderer-resolved.tsx:76`：`instancePath` 派生 key；不是整图/大对象比较。
- `packages/flux-react/src/node-renderer-utils.ts:45`：schema import 去重 key；compile/preparation 路径，非交互变更检测。
- `packages/flux-runtime/src/async-data/api-cache.ts:45/75/120/139`：稳定 cache-key / bounded stable stringify；owner 文档允许排除稳定 cache-key。
- `packages/nop-debugger/src/controller-component-inspector.ts:271/272`：debugger component tree 排序用小型 `instancePath` 文本；调试路径。
- `packages/report-designer-renderers/src/helpers.ts:38`：metadata 展示格式化；非变更检测。
- `packages/flow-designer-renderers/src/designer-tree-mode.tsx:23`：保留为 `[维度15-01]`。

## 总结评估

第 1 轮初审未发现新的安全红线问题；性能方面保留 1 个高价值候选，集中在 Flow Designer tree mode 的整图 stringify 变更检测。未重复报告文件大小 warning；该类问题属于维度 02。

## 建议第 2 轮深挖方向

继续围绕 Flow Designer / Report Designer / Spreadsheet 的交互主路径深挖：

- 图/树编辑命令是否还有整图 clone + 全量 projection/layout 的重复触发。
- 大集合命令路径是否存在 `map/find/filter` 嵌套但未被简单 grep 捕获的 O(n²)。
- tree mode 的 revision/dirty marker 是否已有 owner，可直接替代 stringify equality。

## 深挖第 2 轮追加

### [维度15-02] Tree command 每次交互用 `JSON.parse(JSON.stringify(...))` 克隆整棵 TreeDocument 后再递归修改

- **文件**: `packages/flow-designer-renderers/src/tree-commands.ts:11-13,168-183`
- **证据片段**:

  ```ts
  function cloneTree<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  export function insertChainNodeInTreeDocument(
    tree: TreeDocument,
    sourceId: string,
    nodeType: string,
    data?: Record<string, unknown>,
  ): TreeDocument | null {
    const nextTree = cloneTree(tree);
    const source = findNodeById(nextTree.root, sourceId);
  ```

- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P1/P3
- **现状**: tree mode 的新增链节点、分支增删改、节点数据更新等命令都会先对整份 `TreeDocument` 做 `JSON.stringify`/`JSON.parse` 深拷贝，然后再递归查找目标节点并局部修改。
- **风险**: Tree Designer 属于交互式编辑路径；树规模增大后，每次点击新增/删除/改名都要序列化整棵树，且会丢失非 JSON 值语义。该问题不同于已有 `[维度15-01]` 的 equality check，而是命令执行主路径上的整树深拷贝成本。
- **建议**: 将 tree mutation 改为路径定位 + 结构共享更新：先建立或维护 nodeId/branchId 到路径的索引，更新时只复制祖先链与受影响分支；至少用专用 immutable helper 替代 `JSON.parse(JSON.stringify())`，避免每个交互命令全树序列化。
- **误报排除**: 不是日志、测试、cache key 或导入导出序列化；`insertChainNodeInTreeDocument` 等 live command 直接由 `designer-command-adapter.ts` 的用户交互命令调用，属于运行时编辑热路径。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度15-03] TreeRenderer 每次 render 递归构造全树 Set，链式树退化为 O(n²)

- **文件+行号**: `packages/flux-renderers-data/src/tree-renderer.tsx:88-108,401-407`
- **证据片段**:

  ```ts
  nodes.forEach((node, index) => {
    const nodeKey = toNodeKey(node, keyField, index);
    const treeNodeId = createTreeNodeId(parentTreeNodeId, nodeKey);
    nodeIds.add(treeNodeId);

    collectTreeNodeIds(toTreeNodes(getIn(node, childrenKey)), childrenKey, keyField, treeNodeId).forEach(
      (childTreeNodeId) => {
        nodeIds.add(childTreeNodeId);
      },
    );
  ```

- **严重程度**: P2
- **现状**: `TreeRenderer` 在 render 主路径调用 `collectTreeNodeIds(data, ...)`，该函数每层递归都创建子树 `Set` 并把全部子节点 id 再复制回父级；深链或不平衡树会产生重复合并，复杂度从 O(n) 退化为 O(n²)。
- **风险**: `tree-renderer` 已有 `TREE_EXPANDED_CHILD_BATCH_SIZE` 说明其目标包含大树场景，但该全树 id 收集不受渲染批次限制；大树数据每次 props/scope 更新都可能触发全量递归与重复 Set 拷贝，造成交互卡顿。
- **建议**: 改为单个 accumulator Set 的 DFS：`collectTreeNodeIdsInto(nodes, set, ...)`，递归时直接写入同一个 Set；若只用于校验 `activeNodeId` 是否存在，可进一步维护按数据引用缓存或在焦点路径上惰性校验。
- **误报排除**: 不是测试、诊断或一次性编译路径；调用发生在 `TreeRenderer` render 期间。也不是已有 `[维度15-01]`/`[维度15-02]` 的 Flow Designer tree mode stringify/clone 问题，本项位于通用数据 `tree` renderer。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度15-04] Report Designer 将 spreadsheet selection/viewport 变化纳入同步订阅，导致交互级整表克隆

- **文件+行号**: `packages/report-designer-renderers/src/page-renderer.tsx:93-132,437-481`; `packages/report-designer-core/src/core.ts:441-451`
- **证据片段**:
  ```ts
  export interface ReportSpreadsheetSnapshotSlice {
    document: SpreadsheetRuntimeSnapshot['document'];
    activeSheetId: SpreadsheetRuntimeSnapshot['activeSheetId'];
    selection: SpreadsheetRuntimeSnapshot['selection'];
    history: SpreadsheetRuntimeSnapshot['history'];
    dirty: boolean;
    readonly: boolean;
    viewport: SpreadsheetRuntimeSnapshot['viewport'];
    layout: SpreadsheetRuntimeSnapshot['layout'];
  }
  ```
  ```ts
  const spreadsheetSnapshot = useSyncExternalStoreWithSelector(
    spreadsheetCore.subscribe,
    spreadsheetCore.getSnapshot,
    spreadsheetCore.getSnapshot,
    selectReportSpreadsheetSnapshot,
    equalReportSpreadsheetSnapshot,
  );
  ```
  ```ts
  syncSpreadsheetDocument(nextDocument) {
    const currentDocument = store.getState().document;
    const changed = applyDocumentChange({
      ...currentDocument,
      spreadsheet: structuredClone(nextDocument),
    });
  ```
- **严重程度**: P2
- **现状**: `ReportSpreadsheetSnapshotSlice` 订阅了 `selection`、`viewport`、`history`、`layout` 等非文档字段；这些字段变化会触发 `page-renderer` 重新渲染。虽然同步 effect 依赖只包含 `spreadsheetSnapshot.document`，但 render 阶段仍会重新创建 selector slice 并经过后续派生逻辑；一旦 document 引用因轻量命令变化，`core.syncSpreadsheetDocument` 会对整份 spreadsheet `structuredClone` 并进入 Report Designer undo/document change 路径。
- **风险**: Report Designer 内嵌 Spreadsheet 是高频交互场景，selection/viewport 属于点击、拖选、滚动路径。把非持久化交互状态和持久化 document 同放在一个订阅 slice，容易造成宽订阅重渲染；document 轻微变化时还会整表 clone 到 report document，放大为大表卡顿与 undo 栈内存压力。
- **建议**: 拆分订阅：用于 `syncSpreadsheetDocument` 的订阅只选择 `document` 引用；selection/viewport/history 另建 UI 专用 selector，避免触发持久化同步链路。`syncSpreadsheetDocument` 可进一步改为接受 revision 或 patch，避免每次文档变更都 `structuredClone` 全表。
- **误报排除**: 不是已有 tree stringify/clone/TreeRenderer Set 问题；本项位于 Report Designer + Spreadsheet 跨 core 同步路径。证据显示 selector明确包含高频交互字段，且同步方法对 spreadsheet document 执行 `structuredClone`。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度15-05] Spreadsheet renderer 对 selection/viewport 采用整快照订阅，单元格点击会触发整表交互层重渲染

- **文件+行号**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-snapshot.ts:4-10`; `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts:148-209`; `packages/spreadsheet-core/src/command-handlers/selection-handlers.ts:23-25`
- **证据片段**:
  ```ts
  export function useSnapshot(bridge: SpreadsheetBridge): SpreadsheetHostSnapshot {
    const subscribe = useCallback(
      (onStoreChange: () => void) => bridge.subscribe(onStoreChange),
      [bridge],
    );
    const getSnapshot = useCallback(() => bridge.getSnapshot(), [bridge]);
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  }
  ```
  ```ts
  const snapshot = useSnapshot(bridge);
  const readOnly = snapshot.runtime.readonly;
  ...
  } = useSelection(snapshot, bridge, sheetId, addLog, ...);
  ...
  } = useResize({ bridge, snapshot, sheetId, onLog });
  ```
  ```ts
  export const handleSetSelection: CommandHandler<SetSelectionCommand> = (store, command) => {
    store.setState({ selection: command.selection, editing: undefined });
    return { ok: true, changed: true };
  };
  ```
- **严重程度**: P2
- **现状**: `spreadsheet-renderers` 的主交互 hook 通过 `useSnapshot(bridge)` 订阅整个 `SpreadsheetHostSnapshot`；任何 core store 变化都会让 `useSpreadsheetInteractions` 重新读取整份 host snapshot，并把完整 `snapshot` 传入 selection/editing/fill/resize/sheet commands 等多个 hooks。与此同时，`spreadsheet:setSelection` 不做等值判断，每次点击/选择都会 `setState` 并返回 `changed: true`。
- **风险**: Spreadsheet 是高频交互面板，单元格点击、拖选、行列选择、viewport 变化都可能触发整块交互层重渲染和派生计算，而不是只唤醒依赖 selection 的局部逻辑。大表、复杂单元格区域或嵌入式使用场景下，容易把本应轻量的 selection 更新放大为整表级 React 更新。
- **建议**: 拆分 bridge snapshot 订阅粒度：为 `selection/activeCell`、`document/workbook`、`history/readonly/dirty`、`viewport` 分别提供 selector 型订阅或 `useSyncExternalStoreWithSelector`；`handleSetSelection` 对相同 selection 做 shallow/deep domain equality，未变化时返回 `changed:false` 且不 `setState`。
- **误报排除**: 这不是已覆盖的 Report Designer spreadsheet 同步/structuredClone 问题；本项位于通用 `spreadsheet-renderers` 自身交互订阅路径。证据显示主 hook 直接订阅整个 bridge snapshot，且 selection command 对重复 selection 无条件发布 store 更新。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

## 深挖第 6 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度15-01]`: 保留（P2）。live code 仍在 `designer-tree-mode.tsx` 的 host `treeDocument` effect 中用 `JSON.stringify(toComparableTreeGraphDocument(...))` 两次做整图 equality/change detection，命中性能文档 P1/P prohibited deep stringify hot-path 红线。
- `[维度15-02]`: 保留（P2）。live code 仍在 `tree-commands.ts` 的各 tree 编辑命令入口先执行 `JSON.parse(JSON.stringify(tree))`，且由 `designer-command-adapter.ts` 的用户交互命令直接调用。
- `[维度15-03]`: 保留（P2）。live code 仍在 `TreeRenderer` render 阶段调用 `collectTreeNodeIds`，该函数递归创建子树 `Set` 并逐层回拷贝，链式树会累计重复合并为 O(n²)。
- `[维度15-04]`: 降级（P3）。live code 确认 `ReportSpreadsheetSnapshotSlice` 宽订阅 `selection/viewport/history/layout` 会触发 `page-renderer` 重渲染，但 `core.syncSpreadsheetDocument()` effect 依赖仅为 `spreadsheetSnapshot.document`，未证实 selection/viewport 变化会直接导致整表 `structuredClone`。
- `[维度15-05]`: 保留（P2）。live code 仍通过 `useSyncExternalStore` 订阅整个 `SpreadsheetHostSnapshot` 并把完整 `snapshot` 传入多组交互 hooks，且 `handleSetSelection` 对重复 selection 无等值判断、无条件 `setState`/`changed:true`。

## 子项复核建议

- `[维度15-04]`：建议拆成“selection/viewport 宽订阅重渲染”和“document 变更时整表 structuredClone 同步”两个子项分别复核严重程度。

## 子项复核结论

- `[维度15-04]`: 子项复核通过（P3）。可拆分为宽订阅重渲染与 document 变更整表 `structuredClone` 两个子问题；当前只证实 selection/history 等会扩大 `page-renderer` 重渲染，未证实 selection/viewport 会直接触发整表 clone。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                                                                                                                                                                    | 摘要                                                                                                                          |
| --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 维度15-01 | P2       | `packages/flow-designer-renderers/src/designer-tree-mode.tsx`                                                                                                                                                               | Tree mode 仍用整图 `JSON.stringify` 做 equality/change detection。                                                            |
| 维度15-02 | P2       | `packages/flow-designer-renderers/src/tree-commands.ts`                                                                                                                                                                     | Tree command 仍在交互命令入口用 `JSON.parse(JSON.stringify(tree))` 克隆整树。                                                 |
| 维度15-03 | P2       | `packages/flux-renderers-data/src/tree-renderer.tsx`                                                                                                                                                                        | `TreeRenderer` render 阶段仍递归创建并合并子树 Set，链式树可退化为 O(n²)。                                                    |
| 维度15-04 | P3       | `packages/report-designer-renderers/src/page-renderer.tsx`; `packages/report-designer-core/src/core.ts`                                                                                                                     | Report Designer spreadsheet slice 仍存在 selection/history 等宽订阅重渲染风险，未证实 selection/viewport 直接触发整表 clone。 |
| 维度15-05 | P2       | `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-snapshot.ts`; `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts`; `packages/spreadsheet-core/src/command-handlers/selection-handlers.ts` | Spreadsheet renderer 仍订阅整个 host snapshot，且 selection command 对重复 selection 无等值判断。                             |
