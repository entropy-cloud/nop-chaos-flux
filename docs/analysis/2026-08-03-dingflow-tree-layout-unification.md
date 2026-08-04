# DingFlow 单一 Tree 布局算法分析与修正契约

> 日期：2026-08-03
> 范围：`@nop-chaos/flow-designer-core`、`@nop-chaos/flow-designer-renderers` 的 tree mode / DingFlow 布局、投影、连线与结构命令
> 类型：分析 + 实现前契约
> 状态：待实施；必须先转为正式 plan 并完成独立 draft review
> 决策：tree mode 只允许一个 `TreeDocument` 驱动的 structured-tree 布局算法；ELK 只服务 graph mode

## 3. 单一算法的目标模型

### 3.1 唯一入口

新增 core 内部主入口 `projectAndLayoutTree`（不从 root export）：

```ts
interface TreeProjectionView {
  tree: TreeDocument;
  document: GraphDocument;
}

type TreeProjectionResult =
  | { ok: true; view: TreeProjectionView }
  | { ok: false; error: TreeProjectionError };

function projectAndLayoutTree(
  tree: TreeDocument,
  config: NormalizedDesignerConfig,
): TreeProjectionResult;
```

一次确定性调用完成：

1. 校验/规范化 tree；
2. 递归测量 subtree；
3. 递归放置 node 与虚拟 branch slot；
4. 生成 projected nodes/edges；
5. 为 projected edges 写入只读、非持久化的 runtime 结构与线路几何。

`TreeProjectionView.tree/document` 不可拆分。DesignerCore 必须以 `replaceTreeProjection(view, source)` 原子安装 owner tree、projected graph 和 history pair。

tree session 使用独立工厂：

```ts
type TreeCoreCreationResult =
  | { ok: true; core: DesignerCore }
  | { ok: false; error: TreeProjectionError | TreeConfigMigrationError };

createTreeDesignerCore(initialTreeDocument, config, options): TreeCoreCreationResult;
```

工厂唯一调用 config migration + `projectAndLayoutTree`，调用方不能构造 paired graph；在初始化 history/saved baseline **之前**安装验证 pair。失败不创建 error core；`TreeModeLayoutWrapper` 依 error code/path 渲染 error surface。renderer 只使用 tree core/session API，绝不直接调用 `projectAndLayoutTree`。`createDesignerCore(GraphDocument, ...)` 仅用于 graph mode，收到 `documentMode:'tree'` 时返回/抛 `tree-core-factory-required`；raw `replaceTreeProjection` 完全 private。

### 3.2 TreeDocument owner 与 host writeback

当前 `TreeModeLayoutWrapper` 的 `setTreeDocument()` 是空实现，无法支撑连续命令、导出和历史恢复。修正后采用以下唯一 owner 模型：

1. host `treeDocument` 是初始化/外部替换输入，不是每次命令读取的实时 draft；
2. `DesignerCore` 私有状态持有当前 session 的权威 `currentTreeDocument` draft，并通过 `getTreeDocument()` 供 tree command、export、relayout 使用；最终 domain owner（如 TaskFlowAuthoringModel）仍在 domain adapter/host，不转移给通用 Flow Designer；
3. 成功 tree command 先计算完整 `TreeProjectionView`，再以一次 `replaceTreeProjection` 提交；失败时 tree、graph、history、dirty 全部不变；
4. undo/redo/restore/transaction rollback 直接恢复 history 中存储的配对 tree+graph view，不再次运行布局；这样历史结果不受后来 config/算法变化影响，并且只发一次一致 snapshot；
5. 每个 tree renderer mount 生成不可复用 UUID `treeDocumentSessionId`。schema 新增 `treeDocumentEpoch?: number`、`treeDocumentAckSessionId?: string`、`treeDocumentAckDispatchId?: number` 与可选单根动作 `treeDocumentChangeAction?: ActionSchema`。三者都进入 TypeScript schema、renderer prop metadata/compilation、formal validation、resolved prop bindings 和 renderer-interfaces；epoch/ack 只能是有限非负整数，缺省为 0/undefined。非法值返回 `invalid-tree-document-epoch` / `invalid-tree-document-ack`，不替换 pair。action dispatch bindings 为 `{ treeDocument, reason, commandType?, sessionId, dispatchId }`；ack 必须同时匹配当前 sessionId 与队首 dispatchId/digest，旧/未知 sessionId 一律 stale no-op。`reason` 冻结为 `'command' | 'undo' | 'redo' | 'restore' | 'coalesced'`。`save`、`relayout`、初始 load 不发 change action。通知失败通过 host issue 报告，但不回滚已提交的 session draft；
6. 所有会改变 tree 的 command、undo、redo、restore 都创建有序 writeback item；renderer 严格串行 dispatch：只有队首收到 host acknowledgement 后才发送下一项，host 必须按 `dispatchId` 单调应用/回显。事务内 tree 变化只更新 transaction-local final tree；仅最外层 commit 创建一项 `{reason:'command',commandType:'transaction'}`，nested commit/rollback 不创建项。这样 host 不会异步持久化乱序 tree；
7. 所有 tree ingress、core/history/pending storage、host baseline 和 action dispatch 都使用 `canonicalize → parse` 的深拷贝不可变 snapshot；外部 action/host 永不持有可写的 core/history 对象。renderer 维护 pending acknowledgement FIFO（每项 `{dispatchId, tree, digest}`，最多 32；仅相邻 deep-equal 文档去重）和有界 `locallyEmittedDigests` LRU（最多 256 个 SHA-256 digest）。epoch 缺省时 delayed echo 保证仅覆盖该 256-entry 窗口；超过窗口的 host 回显必须提供严格递增 epoch，否则返回 `tree-host-epoch-required`，不猜测替换。队列满时不丢旧项、不发送新的中间通知：把最新 draft 合并到单个 `coalescedUnsentTree`，报告一次 `tree-host-backpressure`；容量释放时仅将 coalesced 项**追加到既有 FIFO 尾部**，它必须等待所有更早 item ack/fail 后才能 dispatch，绝不越过队首；
8. host prop 的 epoch **优先**处理：有效且严格大于 `lastAcceptedHostEpoch` 的 epoch 先验证/migrate/project，再原子替换 pair、清空 pending/coalesced、更新 accepted baseline/epoch 并重置 history/saved baseline，即使 tree 内容恰好等于旧 pending/current/stale digest；
9. 仅 epoch 缺省或 `<=lastAcceptedHostEpoch` 时使用 ack 规则：`treeDocumentAckSessionId` 与 `treeDocumentAckDispatchId` 必须同时匹配当前 sessionId/队首 dispatchId 且 tree digest 相等，才移除队首并更新 accepted baseline；旧/未知 sessionId 或较小 dispatchId 均 stale no-op，当前 session 的更大 ID 或 digest 不匹配返回 `tree-host-invalid-ack`。没有 ack fields 时，才使用 deep-equal current/stale-digest 的兼容 echo 规则；其余不同 prop 返回 `tree-host-conflict`。以上均不覆盖较新 draft；
10. host 不提供 change action 时不建立 pending 队列；设计器仍可完成 session 内编辑/save/export，但 accepted baseline/epoch 仍单独跟踪。不同 host prop 仍须 epoch 严格增长才能替换，即使 session 已 save。

action result 矩阵：每次 dispatch 捕获 `sessionGeneration`；epoch replacement/ack、unmount 或 key remount 都使旧 generation/in-flight item 失效。同步 throw 和 rejected promise 必须捕获并归一化为 `{ok:false,error}`：原值是 `Error` 则保留；否则构造 `new Error('treeDocumentChangeAction failed', {cause: original})`。completion 先确认 generation 未 disposed 且 `dispatchId` 仍是当前 in-flight queue head；否则完全 no-op（不删新队首、不报告 issue、不继续 dispatch）。unmount 主动 abort in-flight action 并清空 queue/coalesced；abort 后 completion 同样 inert。有效 completion **必须调用** `flux-action-core` 的 canonical `classifyActionResult`，不在 DingFlow 重定义 flag 优先级：`success` 保留队首等 host ack；`neutral`（含 skipped-first 矛盾 flags）移除队首并报告 info；`cancelled`（含 timedOut）移除队首并报告 info `tree-document-change-action-cancelled`；`failure`（含归一化 throw/rejection）移除队首并报告 error `tree-document-change-action-failed`。后三类均不重试（上限 0），再发送下一 FIFO item。队列合并项结构为 `{tree,digest,sourceCommandCount,dispatchId}`，不保留无界 source IDs；ack 只按队首 dispatchId/digest 处理。连续 32 次失败不会永久占满队列。

DesignerCore 是 session draft owner；domain model 仍是最终持久化 owner，host 经 input/change 协议同步。

### 3.3 运行时几何的承载决策

不新增独立的可变 `branchGroups` context。采用投影 edge 的保留 runtime 数据键：

```ts
interface TreeEdgeRuntimeGeometry {
  kind: 'chain' | 'split' | 'merge';
  direction: 'TB' | 'LR';
  ownerId?: string;
  branchId?: string;
  continuationId?: string;
  lineMain?: number;
  fanoutCross?: number;
}

interface ProjectedTreeEdgeData extends Record<string, unknown> {
  __fdTree?: TreeEdgeRuntimeGeometry;
}
```

`__fdTree` 在内部 `DesignerSnapshot.doc`、内部 `activeEdge` 与 edge renderer binding 中可观察，但属于保留只读 runtime projection data，不属于 TreeDocument/domain data；tree mode 已禁止 `updateEdgeData`，schema 不得修改它。

约束：

- graph export 保持原始 GraphDocument；tree export 序列化 `currentTreeDocument`，不含 `__fd*` 或虚拟节点；
- bounded host `doc.edges` 继续只输出摘要；host `activeEdge` 改经 `sanitizeProjectedEdgeForHost()` 剥离所有 `__fd*`；virtual slot 及所有 incident split/merge edges 从 host `doc.nodes/edges`、counts、selection、activeNode/activeEdge 中剥离，counts 从 sanitized business graph 重算，保证 host 可见 ID 零 `__fd_internal__/` 且无 dangling endpoint；
- 若存在 projected graph 调试导出，必须通过 `stripTreeRuntimeProjection()` 剥离虚拟节点与 `__fd*`。

此 export 变化须同步更新 `flow-designer/api.md`、tree-mode owner doc 和测试。

### 3.4 轴无关几何

内部算法统一使用：

- `main`：流程推进轴（TB=y，LR=x）；
- `cross`：分支展开轴（TB=x，LR=y）；
- `mainStart/mainEnd`：节点在推进轴上的起止；
- `crossStart/crossSize`：分支列在展开轴上的范围。

每个 branch group 计算：

```ts
interface BranchColumnGeometry {
  branchId: string;
  crossStart: number;
  crossSize: number;
  mainEnd: number;
}

interface BranchGroupGeometry {
  direction: 'TB' | 'LR';
  ownerId: string;
  continuationId?: string;
  splitMain: number;
  mergeMain?: number;
  fanoutCross: number;
  columns: BranchColumnGeometry[];
}
```

该结构仅存在于布局计算；每条 edge 的最小字段投影至 `edge.data.__fdTree`。

### 3.5 权威节点 footprint

为了保持同步单次布局且避免 mount 后按 DOM 尺寸二次跳动，tree node 必须声明**固定布局 footprint**，不能继续把 CSS minimum 当作实际尺寸：

```ts
interface TreeNodeTypeConfig {
  tree?: {
    layoutSize?: { width: number; height: number };
    // existing fields...
  };
}
```

规则：

- 兼容期取值优先级：`tree.layoutSize` > `appearance.minWidth/minHeight` > 220×80；仓库内所有 tree 示例必须迁移为显式 `layoutSize`，之后 `appearance` fallback 标记 deprecated；
- footprint 的 width/height 必须是有限正整数；无效配置使整个 projection 返回结构化错误，不静默修正；
- tree node 使用外层 geometry wrapper（固定 width/height、`overflow:visible`）承载 handles 与外置按钮；内层 body box 使用 `box-sizing:border-box; width:100%; height:100%`；
- tree mode 的内层 body 固定 `overflow:hidden`；不提供 diagnose/clip 二选一。canonical body 必须按 `layoutSize` authoring，超出内容被裁剪是 tree footprint 契约的一部分；graph mode 的 schema body 行为不变；
- handles 以外层 footprint 边界为锚点；node-attached controls 可以越过内层 body，但必须计入 connector gap 的 control footprint；
- layout、handles、edge endpoints 和 overlays 使用同一 footprint；
- graph mode 仍可使用动态 DOM 尺寸，不受该约束。

authoring type 决策：把现有 `TreeNodeTypeConfig.tree` 字段直接合并到 `NodeTypeConfig.tree?`，因此 `DesignerConfig.nodeTypes: NodeTypeConfig[]` 可合法 author `layoutSize`；`TreeNodeTypeConfig` 暂保留为 deprecated type alias，normalized nodeTypes map 使用统一 NodeTypeConfig。必须有 `satisfies DesignerConfig` 编译测试覆盖 tree 字段。

### 3.6 线路与控件净空公式

当前 CSS 的 `bottom:-BTN_DIST` 表示按钮近边距，不是中心距；实现必须改为 center-based anchor：按钮中心距 node mainEnd 固定 `BTN_CENTER_DIST=36`，例如 TB 使用 `bottom:-(36 + 14)px`。`BTN_DIAMETER=28`。固定 add-condition overlay outer border-box 为 96×26px；TB 的 main size=26，LR 的 main size=96。控件间最低净空为 4px，connector visible stroke 与按钮边界最低净空为 8px。tree edge 最大 rendered strokeWidth 必须计入公式：focus expansion 后仍限制在 1..4px，超出为 invalid tree appearance config。DingFlow tree edge 禁止 markerEnd、animated、schema label/body 和 edge defaults/data 中的渲染 label；edge type 只允许 stroke/color/style/width。projection validation 仅检查 edge renderer config/edge data，不误判合法 `TreeNodeBranch.data.label`；不支持项统一返回 `unsupported-tree-edge-decoration`。hover/focus node toolbar 是 transient portal，排除在静态 oracle 外，但另有交互 E2E 证明其不遮挡当前操作目标。

允许 node-attached + 位于 own chain/split/merge stem 中心，add-condition pill 覆盖 split transverse line；净空不变量不约束这些有意重叠。

split gap 需要同时容纳 owner-attached + 与 line-centered add-condition pill：

```text
SPLIT_HALF_GAP_MIN(direction) = BTN_CENTER_DIST
                             + BTN_DIAMETER / 2
                             + overlayMainSize(direction) / 2
                             + CONTROL_CLEARANCE

TB_SPLIT_HALF_GAP_MIN = 36 + 14 + 13 + 4 = 67
LR_SPLIT_HALF_GAP_MIN = 36 + 14 + 48 + 4 = 102

MERGE_HALF_GAP_MIN(strokeWidth) = BTN_CENTER_DIST + BTN_DIAMETER / 2
                               + CONNECTOR_CLEARANCE + ceil(strokeWidth / 2)
                               = 36 + 14 + 8 + ceil(strokeWidth / 2)

MIN_SPLIT_GAP(TB) = 134
MIN_SPLIT_GAP(LR) = 204
MIN_MERGE_GAP = 2 * MERGE_HALF_GAP_MIN(maxGroupStrokeWidth)
MIN_CHAIN_GAP = BTN_CENTER_DIST + BTN_DIAMETER / 2
              + HANDLE_SIZE / 2 + CONTROL_CLEARANCE
              = 36 + 14 + 6 + 4 = 60
effectiveChainSpacing = max(config.layerSpacing, MIN_CHAIN_GAP)
effectiveSplitSpacing = max(config.layerSpacing, MIN_SPLIT_GAP)
effectiveMergeSpacing = max(config.layerSpacing, MIN_MERGE_GAP)
```

split 与 merge 分别使用自己所在间隙的中点：

```text
branchGroupMainStart = owner.mainEnd + effectiveSplitSpacing
splitLower = ceil(owner.mainEnd + SPLIT_HALF_GAP_MIN)
splitUpper = floor(branchGroupMainStart - SPLIT_HALF_GAP_MIN)
splitMain = round((splitLower + splitUpper) / 2)

branchGroupMainEnd = max(column.mainEnd)
continuation.mainStart = branchGroupMainEnd + effectiveMergeSpacing
mergeLower = ceil(branchGroupMainEnd + MERGE_HALF_GAP_MIN)
mergeUpper = floor(continuation.mainStart - MERGE_HALF_GAP_MIN)
mergeMain = round((mergeLower + mergeUpper) / 2)
```

必须满足：

```text
splitMain - owner.mainEnd >= SPLIT_HALF_GAP_MIN
branchGroupMainStart - splitMain >= SPLIT_HALF_GAP_MIN
mergeMain - branchGroupMainEnd >= MERGE_HALF_GAP_MIN
continuation.mainStart - mergeMain >= MERGE_HALF_GAP_MIN
```

结果：

- 所有 split edges 使用相同 `splitMain`；
- 所有 merge edges 使用相同 `mergeMain`；
- merge 水平段（TB）或垂直段（LR）位于整组 branch subtree 之后，不穿节点；
- owner-attached + 与 add-condition pill 至少保留 4px；leaf-attached +、merge + 与节点/ transverse line 至少保留 8px；
- 当 `layerSpacing` 小于对应安全下限，ordinary chain 使用 60、TB split 使用 134、LR split 使用 204；merge 按同组最大**渲染** strokeWidth 动态计算（默认 edge 2px、focused 3px，因此默认组按 3px 得 120）。owner docs 必须明确 `layerSpacing` 是期望值而非绝对值。

所有线路坐标最终 `Math.round()`。

### 3.7 几何边界与允许交集

- node/control rectangle 按半开区间 `[start,end)`；边界接触不算正面积重叠；
- edge segment 按中心线并用 `strokeWidth/2` 膨胀后检测；
- 所有 footprint/spacing 为整数；node top-left、anchor 和 lineMain 在最终放置后一次取整，子树包围盒按取整后的实际 rectangles 重新计算，descendant rectangle 必须包含在其 column bounds；
- `nodeSpacing=0` 允许 sibling rectangles 边界接触，不允许正面积重叠；cross anchor 使用 `round(crossStart + crossSize/2)`，不要求偶数尺寸。

几何 oracle 只允许下列交集：

1. 同一 polyline 相邻 segments 在 bend join 相交；
2. edge 与自身 source/target node boundary/handle 的端点接触；
3. 同一 branch group 的 split edges 共享 owner→splitMain 的 main-axis stem；
4. 同一 branch group 的 split edges 共享 split transverse segment；
5. 同一 branch group 的 merge edges 共享 merge transverse segment；
6. 同一 branch group 的 merge edges 共享 mergeMain→continuation 的 main-axis stem；
7. 任意 ordinary tree node 的 node-attached + 与其 own outgoing chain/split/merge main-axis stem 穿过中心；
8. add-condition pill 与本组 split transverse line 穿过中心；
9. merge + 与本组 continuation stem 穿过中心；
10. 固定 12×12px handle rectangle 跨所属 node boundary 居中；owning connector stroke 可穿过该 handle rectangle 并在 handle center 连接，其他 edge/control 不得穿过；

11. 虚拟 slot 内部 affordance 与其 owning virtual-slot rectangle 的包含关系（不是业务 control-node 碰撞）。

除此之外，edge-edge、edge-node、edge-control、control-node、control-control 都必须零正面积交集并满足声明净空。

所有 DingFlow connector 固定 `stroke-linecap:'butt'`、`stroke-linejoin:'round'`；几何 oracle 对完整 stroked polyline 做检测，不以相互独立的矩形 segment 近似 miter join。

### 3.8 空分支契约

保留 `TreeNodeBranch.child?` 的公开语义：空分支表示尚未配置 child 的合法 draft branch。

投影规则：

- 保留内部 ID namespace `__fd_internal__/`，输入校验拒绝任何业务 node/branch/edge ID 使用该前缀；
- slot ID 为 `__fd_internal__/slot/${encodeURIComponent(ownerId)}/${encodeURIComponent(branchId)}`，node type 固定为 `__fd-tree-empty-slot`，data 固定含 `{ __fdVirtual:'empty-branch', ownerId, branchId }`；
- slot 使用 `treeConfig.emptyBranchSize`（新增，可选；默认 220×80）；TB 要求 width>=120,height>=52；LR 要求 width>=140,height>=32，以容纳 120×32 affordance、12×12 boundary handles 和 4px 净空；
- owner → slot 生成 split edge；存在 continuation 时 slot → continuation 生成 merge edge；
- slot 由 renderer 内建组件渲染，不要求出现在 `config.nodeTypes`；它是 `unknown-node-type` 校验唯一豁免类型；使用与 direction 对应的正常 tree handles；内部 affordance 是固定 120×32px 的居中半开矩形，满足上述 direction-specific minimum，否则 `invalid-layout-size`；不可被当作 active business node/inspector target，点击其 affordance 触发 tree-owned `insertBranchChild`；
- 混合空/非空及全空 branch group 使用同一布局与合并规则，continuation 始终保持连接；
- 删除/移动空分支继续使用稳定 branchId 的 tree 命令。

slot affordance 的 authoring flow 冻结为：点击后打开现有 `DingFlowAddNodeMenu`（菜单项仍从 config.nodeTypes 过滤生成）；取消不修改任何状态；选项先走既有 defaults/createDialog/submitAction，成功拿到 data 后才 dispatch `insertBranchChild`；createDialog 取消/失败时 slot 保持为空；readOnly 下 affordance disabled 且不打开菜单。

### 3.9 TB/LR 渲染契约

- TB：input/output handles 为 Top/Bottom；路径在 main=y、cross=x 上生成；
- LR：input/output handles 为 Left/Right；路径在 main=x、cross=y 上生成；
- handle 不能继续依赖 CSS 50% 产生半像素；显式 style `left/top` 使用与 layout 相同的 rounded cross anchor，奇数 footprint 也必须让可见 handle center 与 edge anchor 完全一致；
- split、merge、chain 均通过同一轴映射函数生成 SVG path；
- overlay 的 `(x,y)` 由 `(main,cross)` 按 direction 映射；
- `BTN_DIST` 在 TB 下向下，在 LR 下向右。

没有 LR handles/path/overlay 回归测试，不得声称 LR 完成。

## 4. Tree 编辑命令契约

### 4.1 禁止自由 graph topology mutation

tree mode 下这些命令必须原子返回 `{ ok:false, reason:'unavailable' }`，不得修改 projected graph：

- `addNode`
- `addEdge`
- `deleteEdge`
- `duplicateNode`
- `moveNode`
- `reconnectEdge`
- `updateEdgeData`
- `pasteClipboard`
- `moveNodes`
- `updateMultipleNodes`

对应结构动作只允许使用：

- `insertChainNode`
- `insertChainNodeAtMerge`
- `insertBranchPair`
- `addBranch`
- `deleteBranch`
- `moveBranch`
- `deleteNode`
- `updateNodeData`
- `updateBranchData`
- `insertBranchChild`

`selectEdge` 可保留用于检查；projected edge 不可直接删除或重连。

`insertBranchChild` 是公开 tree-owned command/provider method：payload `{ ownerId, branchId, nodeType, data? }`；仅当 branch 存在且 `child===undefined` 时成功，否则返回 `missing-node | unknown-node-type | constraint`；readOnly 下 unavailable。它替换空 branch 的 child 后走正常 paired projection commit，并纳入 manifest/API/public-surface tests。

`deleteNode` 结构重写矩阵：

| 目标上下文                                                  | 结果                                                                                                  | 失败           |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------- |
| root                                                        | 永远拒绝                                                                                              | `constraint`   |
| 普通 chain node（无 branches）                              | 用其 `child` 替换它在 parent 的 child 引用，等价于 splice；无 child 则移除末节点                      | `missing-node` |
| branch subtree 内普通 node（无 branches）                   | 用其 `child` 替换所属 branch/parent 的 child 引用；删除 branch 首节点且无 child 时 branch 变为空 slot | `missing-node` |
| branch owner（有 branches）                                 | 永远拒绝，不能隐式删除 branch group/continuation                                                      | `constraint`   |
| continuation node（它是某个 owner 的 `child`）且无 branches | 按普通 chain splice；不得删除或改写 owner 的 branches                                                 | `missing-node` |
| virtual empty slot                                          | 不是业务 TreeNode，`deleteNode` 不可选中；删除由 `deleteBranch(ownerId, branchId)` 完成               | `unavailable`  |

成功 delete 经 paired projection commit；空 branch child 按 §3.8 保留 virtual slot。移除 deleted node ID/incident edge IDs 并清空 `activeNode/activeEdge`；若被删节点属于 `activeBranch`，清空它但 owner 可保留为 activeNode，否则清空 `activeBranch`。焦点回 canvas root，避免 toolbar 卸载后落到 body。`deleteBranch` 仍受最小 branch 数约束。测试覆盖每行 TreeDocument rewrite、projected topology、snapshot selection/active/focus、undo/writeback payload 与失败原子性。

### 4.2 `deleteSelection`

- 只选择节点/branch 时，调用既有 tree-owned delete 命令；
- selection 中只要包含 edge，整个操作返回 `unavailable`，不得部分删除其他节点；
- 多选只接受互不为祖先/后代的业务 node 集，且不能同时包含 branch owner 与 active branch；node+branch、ancestor+descendant、virtual slot 选择均返回 `unavailable`；
- 在同一 pre-state 先验证全部目标（root、branch-owner、minBranches 等），任一无效则零修改；全部有效时在一个 transaction 内按稳定 tree traversal order 重写并只提交一次 paired projection；
- 根节点、最小 branch 数等失败继续按既有 tree 命令返回原因；
- multi-select 当前默认关闭，但该原子规则必须有测试，避免以后开启时出现部分提交。

`designer-action-provider.ts` 必须与 command adapter 使用同一个 `documentMode` gate；不能只封 adapter 而让 namespace provider 直接调用 core 绕过。

最终强制边界在 `DesignerCore`：core 创建时若 `documentMode==='tree'`，所有通用 graph topology/data/position mutation（`addNode/updateNode/moveNode/moveNodes/updateMultipleNodes/duplicateNode/deleteNode/addEdge/reconnectEdge/updateEdge/deleteEdge/pasteClipboard/layoutNodes/replaceDocument/replaceDocumentFromHost`）均拒绝；host 只能调用新的 `replaceTreeFromHost(TreeDocument)`，它先 validation + `projectAndLayoutTree`，再用内部 token 原子替换 pair。只有内部 token 保护的 `replaceTreeProjection`、history replay、transaction rollback 和 readOnly presentation relayout 可以直接替换配对视图。adapter/provider/canvas/quick-action/shortcut 仍提前返回 unavailable，作为 UX 与错误质量层，不能作为唯一安全边界。

不为所有 core 方法改统一返回类型：保持现有签名。tree gate 的确定行为是 `void` 方法 no-op、nullable create 方法返回 `null`、已有 result 方法返回其 `unavailable` 失败形态，并统一发一次 `mutationRejected { method, reason:'tree-owned' }` 诊断事件；测试以“返回值/诊断事件/paired view 与 history 不变”三项为准。formal plan 必须逐方法列出既有签名与期望返回值。

### 4.3 非法输入与原子失败

`projectAndLayoutTree` 在下列情况返回 `{ok:false,error}`，调用方保留旧 view，且不写 history/dirty：

- node/branch ID 重复，或任何业务 ID 使用 `__fd_internal__/` 前缀；
- `TreeDocument.meta`、`TreeNode.data`、`TreeNodeBranch.data` 含非 JSON-safe 值；
- node type 未注册；
- `layoutSize/emptyBranchSize` 非有限正整数；
- `nodeSpacing/layerSpacing` 非有限非负整数；
- branch owner、continuation 或递归结构不满足 TreeDocument schema（包括对象环）；
- treeConfig 缺失或 direction 非 TB/LR。

tree payload 值域冻结为 JSON-safe：`null | boolean | string | finite number | JsonArray | JsonObject`，键为 string；拒绝 `undefined`、function、symbol、bigint、Date/Map/Set/class instance、NaN/Infinity 和数据对象环。canonical JSON 为排序键、无空白 UTF-8；digest/export 均基于它。非法值返回 `invalid-tree-payload` + JSON pointer path，并在 command commit 前失败，tree/graph/history/dirty/pending ack 不变。

错误码至少区分 `duplicate-id`、`reserved-id`、`unknown-node-type`、`invalid-layout-size`、`invalid-spacing`、`invalid-tree-payload`、`cyclic-tree`、`invalid-tree-config`。初始输入失败显示 designer error surface；命令/host replacement 失败通过 command failure / host issue 报告且保持旧 view。

结构校验矩阵：缺失/非对象 root、非字符串/空 ID 或 type、非对象 data、branches 非数组、空 branches 数组（规范化为 undefined）、branch 非对象、branch ID 非法、同一 TreeNode 对象被两个父级共享（`shared-node-reference`）、child/branches 形成对象环（`cyclic-tree`）、continuation 与 branch subtree 复用同一节点 ID（`duplicate-id`）均拒绝；统一兜底错误码 `invalid-tree` 并携带 JSON-pointer-like `path`。被拒绝的 host input 不改变 accepted host baseline。

mounted session 的 config 完全冻结为首次 resolved config snapshot。后续 prop config 无论引用或内容是否变化都不热应用、不比较、不影响 current core/renderer/menu/action；仅当 designer-page `key/id` 改变时 remount 并使用新 config。开发模式若检测到 config prop 引用变化，可报告一次 `tree-config-update-ignored-requires-remount`，但不尝试判等。这样 constraints/defaults/createDialog/quickActions/hooks/changeAction/compiled fragments 不会出现 mixed old/new session。

## 5. `autoLayout` 的唯一语义

TreeDocument 不保存节点 position，tree mode 结构布局是**必选投影步骤**：

1. 初始 load：同步执行一次 `projectAndLayoutTree`；
2. 每次成功的结构命令：同步重新执行一次；
3. host 替换 TreeDocument：同步重新执行一次；
4. undo/redo/restore/transaction rollback：恢复 history/saved baseline 中已存的配对 tree+graph view，不重新运行布局；
5. 显式“自动布局”动作：对当前 owner tree 幂等重跑同一算法；同步执行，不产生 ELK busy/error 状态；
6. `treeConfig.autoLayout?: boolean` 改为 optional + deprecated 并在 tree mode 忽略；兼容期接受任意布尔值，缺省或提供值都表示 mandatory structured layout；后续 major 再删除字段；
7. graph mode 的 `features.autoLayout` 与异步 ELK busy/error 语义保持不变。

显式动作必须通过新增 tree-owned `relayoutTree` command，由 core 的 `getTreeDocument()` 读取 session draft；不能让 `useDesignerAutoLayout(core, config)` 自己猜 owner tree。

readOnly 语义：初始/host/undo/redo/restore 的投影仍允许发生；用户触发 `relayoutTree` 时以 presentation-only 方式重算当前 tree view，不 push history、不设 dirty、不发 `documentChanged`。若坐标未变不发事件；若变化，新增并仅发 `presentationChanged`。其他 tree mutation command 仍按 readOnly 规则拒绝。

edit mode 显式 `relayoutTree` 也属于 presentation-only：不改变 TreeDocument、不 push history、不改变 dirty、不发 change action；坐标无变化时 no-op，有变化时仅替换当前 projected graph 的位置/`__fdTree` 并发 `presentationChanged`。undo 不回退 relayout，因为它不属于 authoring history。

## 6. 公共 API 与迁移决策

决策：

- 删除现有 `layoutStructuredTree(...): GraphNode[]` root export 与函数，不保留无法完整表达 validation/config 的兼容 wrapper；仓库消费者迁移到 tree core/session API，避免成功/失败语义双轨；
- `projectAndLayoutTree()` 是 core 内部唯一投影入口，renderer 只通过 `createTreeDesignerCore`、tree commands 和 `replaceTreeFromHost` 间接触发；
- `projectTree`、`layoutStructuredTree`、`simpleTreeLayout`、`layoutTreeWithElk` root exports 与函数在同一 plan 中直接删除/私有化；`projectAndLayoutTree` 仅为 core 内部函数；唯一 public tree session API 是 `createTreeDesignerCore`、`replaceTreeFromHost` 与只读 snapshot/export；workspace renderer 消费者通过 tree core/session API 迁移；
- `TreeNodeTypeConfig.tree.layoutSize`、`TreeConfig.emptyBranchSize`、`relayoutTree` command、`treeDocumentChangeAction` 和 tree-mode export 行为纳入同一契约迁移；
- `TreeConfig.autoLayout?: boolean` 改为 optional，并在 TypeScript 与 formal schema description 中都加 `@deprecated`/deprecated metadata；缺省即 mandatory structured layout，提供任何值也被忽略；迁移仓库内所有 active authored configs、docs examples、canonical test fixtures，最终搜索除兼容性测试和 deprecated 定义外零 `treeConfig.autoLayout`。
- package 为 private，但上述 root surface 变更仍按 protected public surface 走 plan/audit。
- tree mode `DesignerCore.exportDocument(): string` 方法签名保持不变，返回 TreeDocument JSON 字符串；graph mode 继续返回 GraphDocument JSON 字符串。
- tree core public type 不再暴露 `setTreeOwner`、`replaceDocument(document, treeDocument?)` 或 `replaceDocumentFromHost(document, treeDocument?)`；graph core 的 replaceDocument 只接受 GraphDocument。tree host replacement 只暴露 validated `replaceTreeFromHost(TreeDocument)`；public-surface tests 锁定无任意 pair 入口。

`treeDocumentChangeAction` 必须完整进入 authoring/compile surface：`DesignerPageSchemaInput` 类型字段、renderer definition prop contract、action-kind field metadata/custom compilation、formal schema validation、resolved prop dispatch bindings、action failure host issue、renderer-interfaces/quick-reference 文档与 focused compile/dispatch tests；不得只在 React props 中临时读取。

版本迁移冻结如下：

- canonical semver 统一为三段；输入 `1.0` 规范化为 `1.0.0`；
- 当前 legacy `DesignerConfig.version` 接受 `1.0.0`，目标版本 `1.1.0`；`1.0.0→1.1.0` 删除 tree autoLayout，并把 appearance minWidth/minHeight 复制到缺失的 tree.layoutSize；
- TreeDocument 结构没有持久化 slot/runtime geometry，目标仍为 `1.0.0`；输入 `1.0` 只规范化字符串；
- migration 顺序：先 config，再用 migrated config 校验/migrate tree，再 project；
- config/tree major 非 1 或高于支持版本返回 `unsupported-version`；migration failure 返回 `config-migration-failed` / `tree-migration-failed`，不创建/替换 session；
- 新 config export/authoring 示例使用 1.1.0，新 tree export 使用 1.0.0。

## 8. Proof obligations

| 行为契约                   | 必须提交的证明                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| mount 不再被 ELK 二次覆盖  | `auto-layout-guards.test.tsx` 或等价 integration test：tree mount 只发生一次布局；ELK mock 零调用                                                                                                                                                                                                                                             |
| owner/writeback 闭环       | 连续编辑、单根 action/reason matrix、事务最外层 commit 唯一通知/rollback 零通知、pending 队列 stale ack、save 不放宽 replacement、clean+no-pending replacement、dirty conflict、action failure；TaskFlow domain owner 不被替代                                                                                                                |
| 同一 tree 入口统一         | initial/command/clean host replace/relayout 调用单一算法；undo/redo/save/restore/rollback 恢复存储 pair 且不再次布局；每条路径断言 paired tree+graph                                                                                                                                                                                          |
| 非法输入原子失败           | duplicate/reserved ID、unknown type、invalid size/spacing、cycle、invalid config 分别断言错误码与旧 tree/graph/history 不变                                                                                                                                                                                                                   |
| simple overlap 被消除      | `tree-layout.test.ts`：提交完整非对称 fixture，断言所有 node rectangles 两两不交                                                                                                                                                                                                                                                              |
| shared split/merge lines   | `ding-flow-edge.test.tsx`：同组 split edges 的 lineMain 相同；同组 merge edges 的 lineMain 相同且二者不同                                                                                                                                                                                                                                     |
| merge line 不穿子树        | core test：`mergeMain > max(columns.mainEnd)`；renderer test：path horizontal/vertical segment 位于 branch group 之后                                                                                                                                                                                                                         |
| minimum gap                | chain 0→60、TB split 80→134、LR split 80→204、default+focused stroke merge 80→120；验证完整 intentional intersection 白名单，其余 control/node/line 净空满足 4/8px；spacing 大于下限原样使用                                                                                                                                                  |
| 固定 footprint             | outer/inner width/height/box-sizing/clip、center-based + placement、handle endpoint；repo 全量 tree schema/example/fixture 迁移；invalid footprint 拒绝                                                                                                                                                                                       |
| LR 完整链路                | render-ports + edge + overlay tests：Left/Right handles、axis-mapped path、按钮向右                                                                                                                                                                                                                                                           |
| empty branch               | mixed/all-empty、reserved-ID collision、slot affordance/handles/containment、不可选业务 inspector、公开 insertBranchChild payload/failures/readOnly/add/delete/undo、export 无 slot                                                                                                                                                           |
| graph 命令封口             | direct core 每种签名的返回/no-op + mutationRejected；adapter/provider/canvas/shortcut/quick-action matrix；所有 graph topology/data/position mutations 保持 pair/history 不变                                                                                                                                                                 |
| deleteSelection 原子性     | edge 混合、node+branch、ancestor+descendant 均 unavailable；预状态全量校验后单 paired commit；选择/active/focus 恢复无悬挂 ID                                                                                                                                                                                                                 |
| export 边界                | tree export snapshot 只含 TreeDocument，无虚拟 slot/`__fdTree`；graph export 保持原格式                                                                                                                                                                                                                                                       |
| readOnly/edit relayout     | presentationChanged/no-op matrix；history/dirty/documentChanged/changeAction 不变；readOnly tree mutation 仍拒绝                                                                                                                                                                                                                              |
| API 迁移                   | public-surface test + repo search：旧 exports 按最终迁移决策处理，全部消费者已更新                                                                                                                                                                                                                                                            |
| 几何 oracle                | 半开 rectangle + 完整 butt/round stroked polyline；枚举 TB/LR、嵌套非对称、mixed/all-empty、异构 footprint、odd size、nodeSpacing 0、focused stroke、spacing 0/80/200，除 §3.7 十一类白名单外零正面积相交                                                                                                                                     |
| bounded host projection    | virtual slots 从 doc.nodes/counts/activeNode 剥离；`__fd*` 从 activeEdge 剥离；正常业务摘要不变                                                                                                                                                                                                                                               |
| immutable config           | mount 后 config 变化报告 requires-remount 且 pair/history/pending 不变；key remount 以新配置重建 baseline                                                                                                                                                                                                                                     |
| action authoring surface   | schema typing、renderer definition metadata/compilation、formal validation、resolved bindings、failure issue 全链路测试                                                                                                                                                                                                                       |
| action result/backpressure | success/fail/cancel/timeout/skipped/throw 矩阵；oldest duplicate ack、current direct convergence、256 LRU expiry 的 epoch-required、32 failed dispatch recovery、coalesced count/dispatch/ack 多周期不丢最终写回、epoch/unmount/key-remount 后旧 completion/old session ack 完全 no-op                                                        |
| version migration          | concrete config from→to migration、autoLayout 删除、appearance→layoutSize、旧版本 load/new export、migration failure 原子性                                                                                                                                                                                                                   |
| tree factory failure       | config migration/projection failure 返回 result union；不创建 core/history；renderer error surface 显示 code/path                                                                                                                                                                                                                             |
| stale host tombstones      | A/B、ack B、save、delayed A；A/B/A duplicate；current direct convergence；均不回滚 newer draft                                                                                                                                                                                                                                                |
| host epoch replacement     | epoch 不变的不同 prop 冲突；更大 epoch 可刻意回退历史 tree；替换前 validation/migration；pair/history/pending reset 原子                                                                                                                                                                                                                      |
| JSON payload               | undefined/function/bigint/Date/NaN/Infinity/data cycle 拒绝；canonical digest/export 一致；commit 前失败且 pair/history/dirty/pending 不变                                                                                                                                                                                                    |
| delete matrix              | root/chain/branch-subtree/branch-owner/continuation/virtual-slot 的 rewrite 或失败；TreeDocument、projection、undo/writeback、原子失败逐行证明                                                                                                                                                                                                |
| owner-doc migration        | `tree-mode.md`、`design.md`、`config-schema.md`、`dingflow-visual-spec.md`、`collaboration.md`、`api.md`、`components/designer-page/design.md` 以及 active examples/playground schemas 的 ELK/projectTree/replaceDocument/required-autoLayout/旧腿距内容逐项删除或替换；repo search 在历史/兼容目录外零旧语义，文档一致性审计零冲突才允许关闭 |
| 浏览器视觉/操作            | Playwright 用 DOM/SVG bounding boxes 断言 TB/LR、非对称嵌套、空 slot、添加/删除/撤销；同时零 page/console error                                                                                                                                                                                                                               |

验证命令：

```bash
pnpm --filter @nop-chaos/flow-designer-core test
pnpm --filter @nop-chaos/flow-designer-renderers test
pnpm typecheck
pnpm build
pnpm lint
pnpm test
pnpm test:e2e -- --grep "flow designer|dingflow|tree mode"
```

## 11. 审查收敛

逐轮审查历史见 `docs/audits/2026-08-03-1111-document-audit-dingflow-tree-layout-unification.md`。转为正式 plan 或实施前仍须最终独立共识审查；仅零 Blocker/Major 且 implementation-contract 零 P1/P2 才达成共识。

## 12. 相关文档

- `docs/architecture/flow-designer/tree-mode.md`
- `docs/architecture/flow-designer/dingflow-visual-spec.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/config-schema.md`
- `docs/bugs/44-flow-designer-tree-merge-layering-layout-fix.md`
