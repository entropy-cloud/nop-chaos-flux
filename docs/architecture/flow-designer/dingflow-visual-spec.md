# DingFlow Approval Editor — Visual Specification

> This document defines the visual rendering rules for a DingTalk-style approval flow editor.
> It serves as the rendering contract for the React Flow–based tree mode implementation.

---

## 1. Node Types

| Type | Visual | Title Color | Icon |
|------|--------|------------|------|
| Promoter (发起人) | Card with colored title bar | `#576a95` | UserFilled |
| Approver (审批人) | Card with colored title bar | `#ff943e` | UserFilled |
| CC / Send (抄送人) | Card with colored title bar | `#3296fa` | Promotion/Send |
| Condition (条件) | Card without title bar, green title text | Title: `#15bc83` | — |
| End (流程结束) | Small gray circle + label | — | — |

### Card Dimensions

| Property | Value |
|----------|-------|
| Width | 220px |
| Min height | 72px |
| Border radius | 4px |
| Shadow | `0 2px 5px 0 rgba(0,0,0,0.1)` |
| Title bar height | 24px |
| Title bar text | White, 12px, bold, left-aligned with icon |
| Content area padding | 15px |
| Content text | 13px, `#666` |
| Background | White |

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

All connections use 2px gray lines (`#cacaca`).

### Arrow

- Small downward-pointing triangle above each card (not an SVG marker)
- Dimensions: `border-width: 8px 6px 4px`, color `#cacaca`
- Positioned: `top: -12px`, centered horizontally
- **Not applied** to the start node (发起人) or end node

### Straight Line (no branch)

When source and target share the same X coordinate:

- Pure vertical line from source card bottom center to target card top center
- No intermediate waypoints
- Path: `M sx,sy L tx,ty`

### Branch Line (split)

When a node has multiple branch children:

1. Vertical line from source card bottom to the **branch horizontal line**
2. Horizontal line spanning all branch columns
3. Vertical lines from horizontal line down to each condition card top

The branch horizontal line is a single Y coordinate (midY) calculated as:

```
midY = round((sourceCardBottom + conditionCardTop) / 2)
```

Path for each branch edge:
```
M sx,sy L sx,midY L tx,midY L tx,ty
```

Where `midY = targetY - SHORT_LEG` (horizontal line is close to the target, short vertical down to condition card).

### Merge Line (converge)

When multiple branch paths converge to a single downstream node:

1. Short vertical line from each branch leaf card bottom down to the **merge horizontal line**
2. Horizontal line spanning to the merge target X
3. Long vertical line from merge horizontal line down to merge target card top

Path for each merge edge:
```
M sx,sy L sx,midY L tx,midY L tx,ty
```

Where `midY = sourceY + SHORT_LEG` (horizontal line is close to the source, short vertical down from branch child card).

### SHORT_LEG constant

Both branch and merge edges use a short-leg pattern, but with different leg lengths:
- Branch: `BRANCH_SHORT_LEG = 32px` — horizontal line is close to the target (condition cards)
- Merge: `MERGE_SHORT_LEG = 84px` — horizontal line is close to the source (branch children), nearly symmetric with the long leg

The merge short leg is longer because the branch child's + button (36px below card) must clear the horizontal line. At 84px, the + button has 48px clearance from the line.

### Constraint

- No more than **one horizontal turn** per edge (branch or merge)
- Straight-line edges have **zero** intermediate waypoints
- All coordinates must be `Math.round()` to avoid sub-pixel rendering artifacts

---

## 3. "+" Add-Node Button

Every node has a "+" button below it, including nodes inside branch columns. Additionally, a merge-point "+" button appears at the convergence line where branches rejoin.

### Card-Attached + Button

| Property | Value |
|----------|-------|
| Shape | Circle |
| Diameter | 28px (in flow coordinates) |
| Color | `#3296fa` background, white icon |
| Shadow | `0 2px 4px rgba(50,150,250,0.4)` |
| Icon | Plus, 16px |
| Position | Centered below card, **absolute positioned** (not in document flow) |
| Distance from card bottom | 36px (center of button to card bottom edge) |
| Z-index | Above connection lines (z-index: 2) |

**Critical**: The + button must be `position: absolute` so it does NOT affect the node's measured height. The Handle (connection point) must remain at the card bottom edge, not at the button.

### Merge-Point + Button

At the convergence line where branches merge back to a single flow, a + button is rendered via ViewportPortal. It is positioned **below** the merge horizontal line at `(centerX, mergeLineY + BTN_DIST)` — the same distance from the line as a card-attached + button is from its card. This button is NOT attached to any node.

Both the branch child's card-attached + button and the merge-point + button must have sufficient vertical separation (≥ 30px between centers).

---

## 4. "添加条件" Button

This button appears only when a branch group exists. It is NOT a flow node.

| Property | Value |
|----------|-------|
| Shape | Rounded pill |
| Border | `1px solid #b3e19d` |
| Background | White |
| Text | "添加条件", `#67c23a`, 12px |
| Padding | `4px 14px` |
| Border radius | 20px |
| Position | At the center of the branch horizontal line, centered at `(centerX, branchLineY)` |

**Rendered via ViewportPortal** (HTML overlay following canvas pan/zoom), not as a React Flow node. No edges connect to it.

---

## 5. Spacing Rules

Spacing is derived from the reference CSS layout where each inter-card gap is one `add-node-btn-box` unit (84px tall: padding-top 20px + button 32px + padding-bottom 32px). The + button center sits at 36px from the top of this unit.

### Row-to-Row Distances (flow coordinates)

| Context | Distance | Derivation |
|---------|----------|------------|
| Card top to next card top (linear) | **156px** | CARD_H(72) + add-node(84) |
| Branch source → condition cards | **203px** | 156 + BRANCH_EXTRA(47) |
| Branch children → merge target | **242px** | 156 + MERGE_EXTRA(86) |

The branch extra (47px) comes from: branch-box margin-top(15) + border(2) + condition padding-top(30) = 47px.

The merge extra (86px) comes from: the merge row has TWO add-node-btn-boxes stacked (branch child's + branch-box-wrap's) instead of one. Extra = 84px ≈ 86px.

### Key Distances (flow coordinates)

| Measurement | Value |
|-------------|-------|
| Card height | 72px |
| + button center below card bottom | 36px |
| Normal inter-card gap (card bottom to next card top) | 84px |
| Branch inter-card gap | 131px (84 + 47) |
| Merge inter-card gap | 170px (84 + 86) |
| Branch column horizontal spacing | 260px center-to-center |

### Non-Overlap Guarantees

- **+ button ↔ "添加条件"**: branchLineY sits at midpoint of branch gap. Distance from + button center (36px below card) to branchLineY ≥ 30px. Verified: branch gap 131px → midpoint 65.5px → distance 29.5px ≈ 30px.
- **+ button ↔ merge + button**: mergeLineY sits at midpoint of merge gap. Distance from branch child's + button (36px below card) to mergeLineY ≥ 40px. Verified: merge gap 170px → midpoint 85px → distance 49px.

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

| Source | Target | Type | Path |
|--------|--------|------|------|
| 发起人 | 主管审批 | straight | `M sx,sy L tx,ty` |
| 主管审批 | 条件-长期 | branch | `M sx,sy L sx,midY L tx,midY L tx,ty` |
| 主管审批 | 条件-短期 | branch | `M sx,sy L sx,midY L tx,midY L tx,ty` |
| 条件-长期 | 领导审批 | straight | same X → `M sx,sy L tx,ty` |
| 条件-短期 | 直接主管审批 | straight | same X → `M sx,sy L tx,ty` |
| 领导审批 | 抄送人 | merge | `M sx,sy L sx,midY L tx,midY L tx,ty` |
| 直接主管审批 | 抄送人 | merge | `M sx,sy L sx,midY L tx,midY L tx,ty` |
| 抄送人 | 流程结束 | straight | `M sx,sy L tx,ty` |

**Each edge must have a unique ID.** Duplicate IDs cause React Flow to silently drop edges.

---

## 7. React Flow Implementation Notes

### Node Components

- `dtApproval` — Promoter / Approver / CC cards (with colored title bar)
- `dtCond` — Condition cards (green title, priority badge)
- `dtEnd` — End node (circle + label)
- All nodes use `position: relative` wrapper with `Handle` at top/bottom
- `+` button uses `position: absolute; bottom: -BTN_DIST; left: 50%; transform: translateX(-50%); z-index: 2`

### Edge Component

Custom `DingTalkEdge`:
- Receives `sourceX, sourceY, targetX, targetY` from React Flow
- Same X → vertical straight line
- Different X → Manhattan with single bend at `midY = round((sy + ty) / 2)`

### Overlays

Two types of ViewportPortal overlays:

1. **"添加条件" pill** — at `(centerX, branchLineY)` where branchLineY = `conditionCardTop - SHORT_LEG`. The pill overlaps the branch horizontal line.
2. **Merge-point + button** — at `(centerX, mergeLineY + BTN_DIST)` where mergeLineY = `branchChildCardBottom + SHORT_LEG`. The button is positioned below the merge horizontal line, at the same distance as a regular + button from its card.

### Background

- Canvas background: `#f5f5f5` (or `#efefef` per reference)
- Dot grid: `#e0e0e0`, gap 20, size 1

---

## 8. + Button Interaction (Add Node Menu)

### Trigger

Clicking any + button (card-attached or merge-point) opens a fixed-position popover menu with 3 node type options.

### AddNodeMenu Popover

| Property | Value |
|----------|-------|
| Position | Fixed, above the clicked + button (`screenX - 100`, `screenY - 110`) |
| Layout | Horizontal row of 3 circular options |
| Background | White, rounded, shadow-lg |
| Z-index | 101 (above backdrop at 100) |
| Backdrop | Full-viewport transparent overlay to detect click-outside |

### Options

Each option is a circular button (50px diameter) with a text label below:

| Type | Color | Icon/Content | Label |
|------|-------|-------------|-------|
| Approver | `#ff943e` | UserCheck, 20px | "Approver" |
| CC | `#3296fa` | Send, 20px | "CC" |
| Condition | `#15bc83` | Bold text "Cond" | "Condition" |

Label text: 12px, `#666`.

### Insertion Behavior

#### Chain Insert (Approver / CC)

When clicking + on a card node (non-merge), selecting Approver or CC:

1. Find the outgoing edge from `sourceId` → get `downstreamId`
2. Create new approval/CC node at `sourceNode.y + ROW_STEP`
3. Shift `downstreamId` and ALL nodes below by `ROW_STEP`
4. Remove old edge `source → downstream`
5. Add edges: `source → newNode`, `newNode → downstream`

New node data:
- Approver: `{ label: 'Approver', desc: 'Please set', color: '#ff943e', icon: 'usercheck' }`
- CC: `{ label: 'CC', desc: 'Please set', color: '#3296fa', icon: 'send' }`

#### Merge Overlay Insert (Approver / CC)

When clicking + on a merge-point overlay, selecting Approver or CC:

1. `sourceId` is encoded as `merge:${targetId}` — extract the real target ID
2. Create new node at the merge target's current Y position
3. Shift the merge target and ALL nodes below by `ROW_STEP`
4. Rewire: all incoming edges to the target now point to the new node
5. Add edge: `newNode → target`

#### Branch Insert (Condition)

When selecting "Condition" from any + button:

1. Find the outgoing edge from `effectiveId` → get `downstreamId`
2. Shift `downstreamId` and ALL nodes below by `BRANCH_EXTRA + ROW_STEP + MERGE_EXTRA`
3. Create 2 condition cards at `sourceNode.y + ROW_STEP + BRANCH_EXTRA`
   - Left card at `cx - BRANCH_W/2`, right card at `cx + BRANCH_W/2`
4. Add branch edges: `source → leftCond` (near-target), `source → rightCond` (near-target)
5. Add merge edges: `leftCond → downstream` (near-source), `rightCond → downstream` (near-source)
6. Remove old edge `source → downstream`

New condition data: `{ title: 'Condition', desc: 'Please set', priority: N }`

### State Management

- `nodes` and `edges` are React state (`useState`) — updated on every insertion
- `idCounter` is a ref starting above initial IDs to avoid collisions
- Overlays are computed dynamically via `useMemo` from current nodes/edges
- A module-level `_onPlusClick` callback connects node components to the canvas state handler

### Overlay Recomputation

After any insertion, overlays are recalculated by:
1. Grouping edges by source → nodes with 2+ outgoing edges get an "Add Condition" overlay
2. Grouping edges by target → nodes with 2+ incoming edges get a "merge +" overlay
3. Overlay positions derived from current node positions

---

## 9. Color Reference

| Token | Hex |
|-------|-----|
| Promoter title | `#576a95` |
| Approver title | `#ff943e` |
| CC title | `#3296fa` |
| Condition title text | `#15bc83` |
| Connection line | `#cacaca` |
| + button | `#3296fa` |
| 添加条件 border | `#b3e19d` |
| 添加条件 text | `#67c23a` |
| End circle | `#ccc` |
| End text | `rgba(25,31,37,0.4)` |
| Card shadow | `rgba(0,0,0,0.1)` |
| Canvas background | `#f5f5f5` |
