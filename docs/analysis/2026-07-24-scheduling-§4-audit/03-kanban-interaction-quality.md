# Kanban 交互品质审计（§4）

> 日期：2026-07-24
> 审计对象：`packages/flux-renderers-scheduling/src/kanban/`（`kanban-board.tsx`、`kanban-card.tsx`、`kanban-column.tsx`、`kanban-column-header.tsx`、`kanban.css`、`hooks/*`）
> 审计 skill：`docs/skills/complex-component-display-operability-audit-prompt.md` §4.1–4.10
> 方法：纯源码静态核查（file:line 证据）
> 参考实现：react-kanban-kit、Planka、react-kanban-simple（见 `docs/analysis/complex-controls/research-kanban.md`）

---

## 0. 拖拽机制总览

Kanban 使用 `@atlaskit/pragmatic-drag-and-drop` `^1.5.0`（`package.json:21`），核心 adapter（`hooks/use-kanban-dnd.ts:2-3`）。这与参考实现 react-kanban-kit 完全一致（research-kanban.md §2.1），选型正确。

- 卡片 = `draggable` + `dropTargetForElements`；列头 = 列拖拽手柄
- `monitorForElements` 统一处理 card move 与 column reorder（`canMonitor` 按 `source.data.type` 区分）
- **缺失** pragmatic-dnd 生态两个关键包：`-hitbox`（提供 `attachClosestEdge`）与 `-autoscroll`（`package.json` 均未列入）

---

## §4.1 拖拽启动与阈值

### [P2] 无激活阈值/延迟，整张卡片可拖（无专用手柄）

- 类别：交互品质(§4.1)
- 位置：`hooks/use-kanban-dnd.ts:97-106`
- 证据：`draggable({ element, getInitialData })` 仅这两项，无 `delay`/`onGenerateDragPreview`；卡片根 div 即 draggable 元素（`kanban-card.tsx:27-31`）。
- 应为之值：参考 RKK 用 `attachClosestEdge` + 阈值；或提供专用 drag handle（research-kanban.md §2.1/§4.3）。
- 用户可见症状：卡片任意位置按下即可能触发拖拽，与文本选择/点击打开冲突。
- 修复方向：加 `dragHandle` 或 pragmatic-dnd 的 `canDrag`/延迟。

### [P3] 卡片仅 `cursor: pointer`，无 grab/grabbing

- 类别：交互品质(§4.1）
- 位置：`kanban.css:111`；列头手柄有 `cursor-grab`（`kanban-column-header.tsx:113`）但卡片无。
- 修复方向：卡片加 `cursor-grab`，拖拽中 `cursor-grabbing`。

---

## §4.2 拖拽预览（ghost）品质

### [P2] 无自定义 ghost，用浏览器默认克隆预览

- 类别：交互品质(§4.2）
- 位置：grep `onGenerateDragPreview` 全 kanban 零命中
- 证据：`draggable` 未传 `onGenerateDragPreview`，pragmatic-dnd 用默认 native 预览。源条样式靠 `data-dragging='true'`（`use-kanban-board-effects.ts:142-144` → `kanban.css:139-142`：`opacity:0.5; transform:scale(0.95)`）。
- 应为之值：用 `setCustomNativeDragPreview` 自定义 ghost（research-kanban.md §2.1 RKK 已用）。
- 用户可见症状：拖拽预览是浏览器原生快照，无抬升阴影/轻微倾斜。
- 修复方向：加 `onGenerateDragPreview` + `setCustomNativeDragPreview`。

### [P2] 无多选批量拖拽，无 count badge

- 类别：交互品质(§4.2）
- 位置：`hooks/use-kanban-dnd.ts:7-11`（`draggingCardId: string | null`）
- 修复方向：后续按需引入 selection set + count badge。

---

## §4.3 落位动画与过渡

### [P2] 落位后无 FLIP/过渡动画，瞬间重排

- 类别：交互品质(§4.3）
- 位置：`hooks/use-kanban-dnd.ts:79-84`（`onDrop` 同步 `moveCard` + `changeBoard`）
- 证据：卡片 CSS transition 仅 hover 相关（`transform 150ms`、`box-shadow 150ms`，`kanban.css:112-114`），不动画化位置变化。
- 应为之值：FLIP 动画或过渡（skill §4.3）。
- 用户可见症状：落位瞬间卡片"瞬移"到新位置，无平滑过渡。
- 修复方向：引入 FLIP（First-Last-Invert-Play）或 pragmatic-dnd 的 `adaptForReact` 过渡。

### [P2] 拒绝落位无回弹动画，WIP 阻止时静默 no-op

- 类别：交互品质(§4.3/§4.6）
- 位置：`hooks/use-kanban-dnd.ts:69`（`if (!target) return;`）、`:149-153`（`canDrop` 返回 false）
- 证据：拒绝时直接 return，无回弹、无提示。
- 修复方向：加回弹动画 + "列已满"播报。

### [P3] before/after 检测手写中点法，未用 attachClosestEdge

- 类别：交互品质(§4.3）
- 位置：`hooks/use-kanban-dnd.ts:119-128`（手写 `clientY < midY`）
- 证据：`-hitbox` 包未装，缺少空间容差调校。
- 修复方向：引入 `@atlaskit/pragmatic-drag-and-drop-hitbox`。

---

## §4.4 指针与设备一致性

### [P1] 全 kanban 无 `touch-action`，触摸拖拽与滚动冲突

- 类别：交互品质(§4.4）
- 位置：grep `touch-action|touchAction` 在 `src/kanban` **零命中**
- 证据：列体 `overflow-y: auto`（`kanban-column.tsx:234`）、board `overflow-x: auto`（`kanban-board.tsx:428`），无 `touch-action`。
- 应为之值：可拖拽元素 `touch-action: pan-y` 或 `none`（skill §4.4）。
- 用户可见症状：触屏拖卡片时触发页面/列滚动，拖拽失效。
- 修复方向：卡片 + 列体加 `touch-action`。

### [P3] 列宽调整用 document 监听而非 setPointerCapture

- 类别：交互品质(§4.4）
- 位置：`hooks/use-kanban-column-resize.ts:52-73`
- 修复方向：改用 pointer capture（React 19 推荐模式）。

---

## §4.5 大量数据下的交互性能

- 虚拟化：已具备（`@tanstack/react-virtual`，`use-kanban-virtualizer.ts`，默认开启 `kanban-board.tsx:456`）。

### [P2] 拖拽 move 无 RAF 节流，每次 setState 触发 querySelectorAll

- 类别：交互品质(§4.5）
- 位置：`hooks/use-kanban-dnd.ts:119-128`（`onDrag` 每次 `setDropState`）→ `use-kanban-board-effects.ts:130-137`（effect 内 `querySelectorAll('[data-dnd-column]')`）
- 证据：仅靠引用相等短路（`:124-127`），无 rAF 合并。
- 用户可见症状：大 board 拖拽时可能掉帧。
- 修复方向：move 用 rAF coalesce。

### [P2] 虚拟化下卡片 drop target 随滚动增减，活跃拖拽中目标集收缩

- 类别：交互品质(§4.5）
- 位置：`kanban-card.tsx:27-31`（注册依赖 `index`，虚拟化下随滚动 mount/unmount）
- 说明：pragmatic-dnd 容忍此行为，但活跃拖拽中滚动会让目标减少。
- 修复方向：配合 auto-scroll（见 §4.7）使目标保持可见。

### [P1] 缺 `autoScrollForElements`（autoscroll 包未装）

- 类别：交互品质(§4.5/§4.7）
- 位置：`package.json` 无 `@atlaskit/pragmatic-drag-and-drop-autoscroll`
- 修复方向：装包并注册 `autoScrollForElements`。

---

## §4.6 视觉反馈的即时性与精度

### [P0] 虚拟化路径下 drop indicator 完全不渲染（而虚拟化是默认开启的）

- 类别：交互品质(§4.6）
- 位置：`kanban-column.tsx:237-271`（虚拟化分支无 indicator）vs `:276-300`（非虚拟化分支有）
- 证据：
  ```tsx
  // 非虚拟化分支（:276-300）
  {
    dropTargetCardIndex === idx && dropClosestEdge === 'before' && (
      <div className="nop-kanban-drop-indicator" />
    );
  }
  ```
  虚拟化分支 `virtualItems.map(...)` 内无此渲染；而 board 恒传 truthy `virtualize`（`kanban-board.tsx:456`）。
- 应为之值：drop indicator 应在所有渲染路径可见（skill §4.6）。
- 用户可见症状：**正常使用（虚拟化开启）下，拖拽时看不到插入位置指示线**，只有列高亮环（`data-drop-target`，`kanban.css:144-146`）。核心交互反馈不可见。
- 修复方向：虚拟化分支也渲染 indicator（或在 virtualizer 的 measureElement 旁注入）。

### [P2] 无"不可落位"/WIP 拒绝的 cursor 或提示

- 类别：交互品质(§4.6）
- 位置：`use-kanban-dnd.ts:149-153`（`canDrop:false` 后无 UX）
- 修复方向：拒绝时 `cursor: not-allowed` + 播报。

### [P3] 操作完成无 toast

- 类别：交互品质(§4.6）
- 位置：grep `toast` 零命中；仅 activity log + onCardMove 事件
- 修复方向：可选。

### 列高亮反馈：良好

- `data-drop-target='true'` → `box-shadow: 0 0 0 2px var(--color-primary)`（`use-kanban-board-effects.ts:133-136` → `kanban.css:144-146`）。

---

## §4.7 边缘操作稳定性

### [P1] 无 auto-scroll（autoscroll 包未装，见 §4.5）

- 类别：交互品质(§4.7）
- 修复方向：见 §4.5。

### 空列落位：已实现

- 列注册为 drop target `dropIndex: cardCount`（`use-kanban-dnd.ts:138-163`）；空区渲染（`kanban-column.tsx:303-310`）。

### Escape 取消：仅键盘拖拽有

- `use-kanban-board-effects.ts:116-121`（键盘 Escape 清理）；**指针拖拽无显式 Escape 处理**，靠 pragmatic-dnd 原生行为。
- 修复方向：指针拖拽也接 Escape + 播报。

### [P3] unmount 中途未显式处理

- 类别：交互品质(§4.7）
- 修复方向：可选，monitorForElements cleanup 为普通 return。

---

## §4.8 触感一致性（跨组件）

### [P2] 与 Gantt 拖拽手感不一致（见 Gantt 审计 §4.8）

- 修复方向：抽取共享 drag affordance。

---

## §4.9 键盘交互品质

### 键盘卡片移动：已实现（Space 拾起、ArrowLeft/Right 跨列、Escape 取消）

- `use-kanban-board-effects.ts:84-124`；`dndAnnouncement` 播报（`kanban-board.tsx:401-403`）——良好。

### [P2] 缺 ArrowUp/Down 列内重排序

- 类别：交互品质(§4.9）
- 位置：`use-kanban-board-effects.ts:97-122`（仅 Left/Right）
- 修复方向：补 Up/Down 分支。

### [P2] 卡片无显式 `:focus-visible`，依赖浏览器默认

- 类别：交互品质(§4.9）
- 位置：`kanban.css` 无卡片 focus 规则（键盘拖拽有 `data-keyboard-dragging` 样式 `:182-186`，但普通聚焦无）
- 修复方向：加 `:focus-visible` ring。

### roving tabindex：已实现

- `kanban-column.tsx:265,290`（`tabIndex={idx === rovingIndex ? 0 : -1}`）——良好。

### [P3] 用了已废弃的 `aria-grabbed`

- 类别：交互品质(§4.9）
- 位置：`use-kanban-board-effects.ts:89,144`
- 说明：ARIA 1.1 起废弃，现代用 `aria-roledescription`（列头已用 `:117`，卡片未用）。
- 修复方向：卡片改用 `aria-roledescription="draggable"`。

---

## §4.10 视图/模式切换过渡品质

### [P2] 列折叠时 body 瞬间卸载，仅 width 有过渡

- 类别：交互品质(§4.10）
- 位置：`kanban-column.tsx:230`（`{!collapsed && (...)}`）条件卸载；`kanban.css:178-180`（`transition: width 200ms ease`）
- 用户可见症状：折叠时卡片列表瞬间消失，仅列宽渐变。
- 修复方向：body 用 max-height/opacity 过渡而非条件卸载。

### WIP 限制反馈：已实现

- 超限列红边 + 红 badge（`kanban-column-header.tsx:90-94,123-127`；`kanban-column.tsx:201-206`）。

---

## §4 WIP 限制专项

### [P1] WIP 仅在列级 drop target 校验，卡片级 target 未校验（潜在绕过）

- 类别：交互品质(§4.6/正确性）
- 位置：`use-kanban-dnd.ts:115-118`（卡片 target `canDrop` 不查 WIP）vs `:149-153`（列 target 查 WIP）
- 证据：pragmatic-dnd 取最内层 target，落点到 WIP 列内卡片时，最内层是卡片 target（canDrop 通过），虽列 target canDrop false 但 `onDrop` 读 `location.current.dropTargets[0]`（最内层）。
- 用户可见症状：可能绕过 WIP 限制把卡片放入已满列。
- 修复方向：卡片 target `canDrop` 也查所属列 WIP。

### WIP 计算用 `>=`（"达限"即视为"超限"阻止）

- `kanban-board.tsx:226-231`。语义需确认是否符合预期（达限即不可再入）。

---

## 反模式命中统计

| 反模式          | 命中数 | 说明                                       |
| --------------- | ------ | ------------------------------------------ |
| F1 固化缺陷断言 | 0      | 未核查测试                                 |
| F2 边界 mock    | 0      | 同上                                       |
| F3 接线漏接     | 1      | 虚拟化分支漏渲染 drop indicator（§4.6 P0） |

## 四项总评

| 维度         | 评         | 说明                                                                                                                        |
| ------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| 交互品质(§4) | **不通过** | 1 个 P0：虚拟化（默认）下 drop indicator 不渲染，核心落位反馈不可见。另有 touch-action(P1)、auto-scroll(P1)、WIP 绕过(P1)。 |

**标注：Kanban 在默认/demo 配置下，拖拽落位指示线不可见（P0）。** 虽功能（数据落位）仍成立，但 skill §4.6 定义"操作完成反馈不可见"属严重缺陷，且这是默认虚拟化路径，故定 P0。
