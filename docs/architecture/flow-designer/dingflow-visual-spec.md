# DingFlow Approval Editor — Visual Specification

> This document defines the visual rendering rules for a DingTalk-style approval flow editor.
> It serves as the rendering contract for the React Flow–based tree mode implementation.

---

## 1. Node Types

| Type               | Visual                                   | Title Color      | Icon           |
| ------------------ | ---------------------------------------- | ---------------- | -------------- |
| Promoter (发起人)  | Card with colored title bar              | `#576a95`        | UserFilled     |
| Approver (审批人)  | Card with colored title bar              | `#ff943e`        | UserFilled     |
| CC / Send (抄送人) | Card with colored title bar              | `#3296fa`        | Promotion/Send |
| Condition (条件)   | Card without title bar, green title text | Title: `#15bc83` | —              |
| End (流程结束)     | Small gray circle + label                | —                | —              |

### Card Dimensions

| Property             | Value                                     |
| -------------------- | ----------------------------------------- |
| Width                | 220px                                     |
| Min height           | 72px                                      |
| Border radius        | 4px                                       |
| Shadow               | `0 2px 5px 0 rgba(0,0,0,0.1)`             |
| Title bar height     | 24px                                      |
| Title bar text       | White, 12px, bold, left-aligned with icon |
| Content area padding | 15px                                      |
| Content text         | 13px, `#666`                              |
| Background           | White                                     |

### Condition Card Differences

- No colored title bar; entire card is white with padding
- Title text in green (`#15bc83`), 13px, medium weight
- Priority badge ("优先级N") at top-right, 12px, `#999`
- Description below with 10px top padding

### End Node

- Gray circle: 10px diameter, `background: #ccc`
- Label below: 12px, `rgba(25,31,37,0.4)`, 5px gap
- Fixed width container for centering (80px)

---

## 2. Connection Lines

All tree connections use the projected `__fdTree` runtime geometry carried on each edge by `projectAndLayoutTree`. The renderer no longer guesses split/merge lines from endpoints (`outs[0]`/`ins[0]`) or fixed short-leg constants.

### Edge Style Contract

- `stroke-linecap: butt`, `stroke-linejoin: round`
- rendered `strokeWidth` clamped to 1..4px; focus expansion `max(base+1, 3)`
- No `markerEnd`, no `animated`, no schema label/body, no `strokeDasharray` — tree edge appearance only allows `stroke` / `strokeWidth` / `strokeStyle` (solid) / `color`

### Straight Line (chain)

When source and target share the same cross coordinate:

- Pure main-axis line from source edge center to target edge center
- No intermediate waypoints
- Path: `M sx,sy L tx,ty`

### Branch Line (split)

Each split edge carries `__fdTree: { kind: 'split', direction, ownerId, branchId, lineMain, fanoutCross }`:

1. Vertical line from source card edge center to the **shared split line** (`lineMain`)
2. Horizontal segment at `lineMain` to the target branch column cross center
3. Vertical line down to the target card edge

Path for each split edge (TB):

```
M sx,sy L sx,lineMain L tx,lineMain L tx,ty
```

All split edges of one branch group share the same `lineMain` (split 线位于 owner 与 branch row 之间间隙的中点，TB 下限 134、LR 下限 204）。

### Merge Line (converge)

Each merge edge carries `__fdTree: { kind: 'merge', direction, ownerId, branchId, continuationId, lineMain, fanoutCross }`:

1. Vertical line from branch leaf edge center down to the **shared merge line** (`lineMain`)
2. Horizontal segment at `lineMain` to the continuation cross center
3. Vertical line down to the continuation card edge

All merge edges of one branch group share the same `lineMain`（merge 线位于 branch group 与 continuation 之间间隙的中点，默认 120，随组内最大 rendered strokeWidth 动态计算）。merge 水平段（TB）位于整组 branch subtree 之后，不穿节点。

### Constraint

- 同组 split/merge edges 共享各自 stem；除此之外 edge–edge、edge–node、edge–control 零正面积相交（半开区间矩形 + 完整 butt/round stroked polyline）
- 允许交集白名单：同一 polyline 相邻 segment 的 bend join；edge 与自身 source/target boundary/handle 端点接触；同组 split/merge 共享 stem；node-attached + 与其 own stem 穿过中心；add-condition pill 与本组 split 线穿过中心；merge + 与 continuation stem 穿过中心；12×12 handle rectangle 跨所属 node boundary 居中
- All coordinates must be `Math.round()` to avoid sub-pixel rendering artifacts

---

## 3. "+" Add-Node Button

Every node has a "+" button attached to it, including nodes inside branch columns. Additionally, a merge-point "+" button appears at the convergence line where branches rejoin.

### Card-Attached + Button

| Property | Value                                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shape    | Circle                                                                                                                                                                        |
| Diameter | 28px (in flow coordinates)                                                                                                                                                    |
| Icon     | Plus, 16px                                                                                                                                                                    |
| Position | **Center-based anchor**: button center at fixed `BTN_CENTER_DIST = 36px` from node main-end edge (TB: `bottom: -(36+14)px`; LR: `right: -(36+14)px`), **absolute positioned** |
| Z-index  | Above connection lines (z-index: 2)                                                                                                                                           |

**Critical**: The + button must be `position: absolute` so it does NOT affect the node's measured height. The Handle (connection point) must remain at the card edge, not at the button.

### Merge-Point + Button

At the shared merge line where branches merge back to a single flow, a + button is rendered via ViewportPortal at `(main: lineMain + BTN_CENTER_DIST + overlayMain/2)` from the merge line, on the continuation cross center. This button is NOT attached to any node.

Both the branch child's card-attached + button and the merge-point + button must maintain ≥ 4px control clearance from other controls and ≥ 8px connector clearance from visible strokes.

---

## 4. "添加条件" Button

This button appears only when a branch group exists. It is NOT a flow node.

| Property      | Value                                                                             |
| ------------- | --------------------------------------------------------------------------------- |
| Shape         | Rounded pill                                                                      |
| Border        | `1px solid #b3e19d`                                                               |
| Background    | White                                                                             |
| Text          | "添加条件", `#67c23a`, 12px                                                       |
| Padding       | `4px 14px`                                                                        |
| Border radius | 20px                                                                              |
| Position      | At the center of the branch horizontal line, centered at `(centerX, branchLineY)` |

**Rendered via ViewportPortal** (HTML overlay following canvas pan/zoom), not as a React Flow node. No edges connect to it.

---

## 5. Spacing Rules

Tree mode uses **fixed layout footprints** (`NodeTypeConfig.tree.layoutSize`, fallback appearance minWidth/minHeight, fallback 220×80) and **minimum effective gaps** rather than fixed CSS-derived row units. `layerSpacing` is a desired value; the effective gap is `max(layerSpacing, 下限)`.

### Minimum Gaps (flow coordinates)

| Context        | Minimum   | Derivation                                                                    |
| -------------- | --------- | ----------------------------------------------------------------------------- |
| Ordinary chain | **60px**  | 36 + 14 + 6 + 4 (center + button + handle + clearance)                        |
| TB split       | **134px** | 2 × (36 + 14 + 13 + 4)                                                        |
| LR split       | **204px** | 2 × (36 + 14 + 48 + 4)                                                        |
| Merge          | **120px** | 2 × (36 + 14 + 8 + ceil(maxGroupStrokeWidth/2)); default group w/ focused 3px |

When `layerSpacing` is below the corresponding floor, chain uses 60, TB split 134, LR split 204, merge 120; spacing above the floor is used as authored.

### Non-Overlap Guarantees

- split 线位于 owner 与 branch row 之间间隙的中点：`splitMain - owner.mainEnd ≥ 67`（TB）/`102`（LR），`branchGroupMainStart - splitMain ≥ 同值`
- merge 线位于 branch group 与 continuation 之间间隙的中点：两侧 ≥ `MERGE_HALF_GAP_MIN`
- owner-attached + 与 add-condition pill 至少 4px 净空；leaf-attached +、merge + 与节点/transverse 线至少 8px 净空
- 除 §2 白名单外，控件/连线/节点零正面积相交

---

## 6. Flow Structure (Approval Example)

```
发起人 (Promoter)
  │
  ▼
主管审批 (Approver)
  │
  ├── 条件-长期 ─────── 领导审批 ──┐
  │                                │
  ├── 条件-短期 ─────── 直接主管审批 ──┤  [添加条件]
  │                                │
  └──────────────── 抄送人 ────────┘
                   │
                   ▼
                流程结束
```

### Node Sequence

1. **发起人** — center column
2. **主管审批** — center column (branch source)
3. **条件-长期** — left column; **条件-短期** — right column (branch targets)
4. **领导审批** — left column; **直接主管审批** — right column (branch children)
5. **抄送人** — center column (merge target — edges from both branch children converge here)
6. **流程结束** — center column

### Edge List

| Source       | Target       | Type     | Path                                  |
| ------------ | ------------ | -------- | ------------------------------------- |
| 发起人       | 主管审批     | straight | `M sx,sy L tx,ty`                     |
| 主管审批     | 条件-长期    | branch   | `M sx,sy L sx,midY L tx,midY L tx,ty` |
| 主管审批     | 条件-短期    | branch   | `M sx,sy L sx,midY L tx,midY L tx,ty` |
| 条件-长期    | 领导审批     | straight | same X → `M sx,sy L tx,ty`            |
| 条件-短期    | 直接主管审批 | straight | same X → `M sx,sy L tx,ty`            |
| 领导审批     | 抄送人       | merge    | `M sx,sy L sx,midY L tx,midY L tx,ty` |
| 直接主管审批 | 抄送人       | merge    | `M sx,sy L sx,midY L tx,midY L tx,ty` |
| 抄送人       | 流程结束     | straight | `M sx,sy L tx,ty`                     |

**Each edge must have a unique ID.** Duplicate IDs cause React Flow to silently drop edges.

---

## 7. React Flow Implementation Notes

### Node Components

- `dtApproval` — Promoter / Approver / CC cards (with colored title bar)
- `dtCond` — Condition cards (green title, priority badge)
- `dtEnd` — End node (circle + label)
- Tree nodes use an **outer geometry wrapper** (fixed `layoutSize`, `overflow: visible`) hosting handles and attached controls, plus an **inner body box** (`box-sizing: border-box; width:100%; height:100%; overflow: hidden`); `+` button uses center-based anchor (TB: `bottom: -(36+14)px`; LR: `right: -(36+14)px`)
- Handles anchor to the outer footprint boundary with explicit rounded `left/top` (odd footprints must keep the visible handle center exactly on the edge anchor)
- Virtual empty slots render a built-in component (`__fd-tree-empty-slot`) with a centered 120×32 affordance; clicking it opens the add-node menu and dispatches `insertBranchChild`

### Edge Component

Custom `DingFlowEdge`:

- Reads `edge.data.__fdTree` for kind/direction/lineMain
- Same cross → vertical straight line
- Split/merge → Manhattan polyline through the shared `lineMain` with axis mapping for TB/LR
- `stroke-linecap: butt`, `stroke-linejoin: round`, strokeWidth clamped 1..4
- No label/marker/animated/body rendering in tree mode

### Overlays

Two types of ViewportPortal overlays, both derived from `__fdTree` geometry:

1. **"添加条件" pill** — at the shared split `lineMain` on the owner cross center (fixed outer border-box 96×26px; TB main size 26, LR main size 96)
2. **Merge-point + button** — at `lineMain + BTN_CENTER_DIST + overlayMain/2` on the continuation cross center

Overlay recomputation is a pure function of projected edge geometry — no endpoint guessing.

### Background

- Canvas background: `#f5f5f5` (or `#efefef` per reference)
- Dot grid: `#e0e0e0`, gap 20, size 1

---

## 8. + Button Interaction (Add Node Menu)

### Trigger

Clicking any + button (card-attached or merge-point) opens a fixed-position popover menu whose item set is derived from the current tree-mode `config.nodeTypes` after renderer-side structural filtering. The historical 3-item DingFlow menu is now only the fallback ordering baseline, not the authoritative source of available node types.

### AddNodeMenu Popover

| Property   | Value                                                                |
| ---------- | -------------------------------------------------------------------- |
| Position   | Fixed, above the clicked + button (`screenX - 100`, `screenY - 110`) |
| Layout     | Horizontal row of 3 circular options                                 |
| Background | White, rounded, shadow-lg                                            |
| Z-index    | 101 (above backdrop at 100)                                          |
| Backdrop   | Full-viewport transparent overlay to detect click-outside            |

### Options

Each option is a circular button (50px diameter) with a text label below:

| Type      | Color     | Icon/Content     | Label       |
| --------- | --------- | ---------------- | ----------- |
| Approver  | `#ff943e` | UserCheck, 20px  | "Approver"  |
| CC        | `#3296fa` | Send, 20px       | "CC"        |
| Condition | `#15bc83` | Bold text "Cond" | "Condition" |

Label text: 12px, `#666`.

### Insertion Behavior

Insertions are tree structural commands dispatched through the command adapter; the tree core re-projects the paired view atomically. No manual position shifting or edge rewiring in the renderer.

#### Chain Insert (Approver / CC)

When clicking + on a card node (non-merge), selecting Approver or CC:

1. Dispatch `insertChainNode(sourceId, nodeType, data)`
2. Core inserts the node between source and its downstream, then re-projects

#### Merge Overlay Insert (Approver / CC)

When clicking + on a merge-point overlay, selecting Approver or CC:

1. `sourceId` is encoded as `merge:${targetId}` — extract the real target ID
2. Dispatch `insertChainNodeAtMerge(targetId, nodeType, data)`
3. Core inserts the node between the branch group and the target, then re-projects

#### Branch Insert (Condition)

When selecting "Condition" from any + button:

1. From a node + button → dispatch `insertBranchPair(sourceId, condNodeType, condData)`
2. From a branch-group pill → dispatch `addBranch(nodeId, branchData, childType, childData)`

#### Empty Slot Insert

When clicking a virtual empty slot affordance:

1. `sourceId` is encoded as `slot:${ownerId}:${branchId}`
2. Dispatch `insertBranchChild(ownerId, branchId, nodeType, data)` — only succeeds while the branch is empty; readOnly disables the affordance

### State Management

- Tree session (`DesignerCore`) owns the draft; the host receives writeback via `treeDocumentChangeAction` with `{ treeDocument, reason, commandType?, sessionId, dispatchId }` bindings
- Overlays are computed via `computeDingFlowOverlays()` purely from projected `__fdTree` geometry
- A module-level `_onPlusClick` callback connects node components to the canvas state handler

---

## 9. Color Reference

| Token                | Hex                  |
| -------------------- | -------------------- |
| Promoter title       | `#576a95`            |
| Approver title       | `#ff943e`            |
| CC title             | `#3296fa`            |
| Condition title text | `#15bc83`            |
| Connection line      | `#cacaca`            |
| + button             | `#3296fa`            |
| 添加条件 border      | `#b3e19d`            |
| 添加条件 text        | `#67c23a`            |
| End circle           | `#ccc`               |
| End text             | `rgba(25,31,37,0.4)` |
| Card shadow          | `rgba(0,0,0,0.1)`    |
| Canvas background    | `#f5f5f5`            |
