# Page 控件 vs Designer Workbench 布局：是否将 workbench 能力吸收进 page

> 日期：2026-08-05
> 范围：`page`（`flux-renderers-basic`）、`WorkbenchShell`（`flux-react`）、Flow Designer（`flow-designer-renderers`）、Report Designer、Word Editor
> 性质：决策分析报告（非契约），结论供后续 plan/实现引用

## 1. 背景与现状

Flow Designer 的布局是：top（toolbar）+ left（palette）+ right（inspector）+ center（canvas），左右可收缩。

当前两条能力线是**分离**的：

| 载体                  | 层                               | 现状                                                                                                                                                                                                               |
| --------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `page` renderer       | `flux-renderers-basic`（稳定包） | title/header/body/aside/footer regions；`asidePosition`、`asideResizable`（pointer 拖拽改宽，clamp 到 `asideMinWidth/asideMaxWidth`）、`asideSticky`；移动端 aside 折叠为 Sheet。**没有**左右收缩 rail、没有双面板 |
| `WorkbenchShell` 组件 | `flux-react/workbench`           | header + 左面板（rail 2rem / 展开 15rem）+ canvas + 右面板（rail 2rem / 展开 22rem）+ dialogs；固定宽度 grid 布局；折叠状态由父级控制。**没有**拖拽改宽                                                            |

WorkbenchShell 已被 Flow Designer、Report Designer、Word Editor 三个 family 复用；Flow Designer 的 `paletteCollapsed/inspectorCollapsed` 状态在 designer core store 中，经 `designer:togglePalette/toggleInspector` action 切换。

`docs/architecture/designer-workbench-shell.md` 已确立分工：**family config 决定面板存在性，page regions 只是 override/mount 面**，collapsed rail 是共享契约。

## 2. 问题

1. 有必要扩展 `page` 控件，把 top/left/right/内容区 + 收缩 + 拖拽改宽吸收进 `page` 吗？
2. 上下（top/bottom）需要收缩吗？
3. 需要可选的拖拽改变大小吗？

## 3. 分析：不应把 workbench 布局吸收进 `page`

### 3.1 语义错位

`page` 的定位（`docs/components/page/design.md`）是**业务页面根壳层**：标题、header/body/footer 内容组织、单侧 aside。workbench（双面板 + canvas + rail + 折叠）是**应用级工作台布局**，二者是不同抽象层次：

- 业务页面里 aside 是可选辅助（折叠与否由"是否为空"决定，`hasAside` 判定）；
- 工作台里左右面板有独立的"存在性（unavailable）"与"折叠态（collapsed）"两个维度，且存在性由 family config 决定。

若把 workbench 吸收进 `page`，`page` 就要承担"决定面板是否存在"的责任，直接与 `designer-workbench-shell.md` 的 canonical-panel-source 原则冲突，也会让 `page` 变成 `container` 之外的第二块"万能壳层"，模糊 `page`/`container`/`workbench` 三者边界（`layout-selection-guide.md` 已明确 page 不是 container 的放大版，同理 page 也不是 workbench 的放大版）。

### 3.2 已有共享载体，吸收等于双实现

`WorkbenchShell` 已经在 `flux-react` 层被三个 designer family 复用，且已含：

- collapsed rail 契约（整条 rail 可点击/可聚焦、expanded 面板内 collapse 入口贴近中心区）；
- 响应式规则（双面板时窄视口隐藏右侧、更窄隐藏左侧）；
- view/edit 模式面板规则（`readOnly` 时左侧编辑面板无条件隐藏、右侧保留）。

把这些再复制进 `page` 会产生两套并行实现，折叠/响应式/rail 逻辑漂移风险直接翻倍。吸收的收益只是"少一个组件"，成本是维护面、契约面、测试面全部双份。

### 3.3 状态归属违反 renderer 契约

`page` 设计文档明确规定"page 自身不维护复杂交互状态"（aside 宽度是仅有的例外，且是 local state）；Flow Designer 的折叠态却必须落在 designer core store（与 `statusPath` 发布、undo/redo 事务边界联动，见 `designer-page-body.tsx` 的 `uiSnapshot.paletteCollapsed` 与 `dispatch({ type: 'togglePalette' })`）。

吸收后只有两条路，都不可取：

- page 内建交互状态 → 违反 renderer 无状态契约，且无法与 designer core 联动（renderer 不允许直接访问 store）；
- page 上卷 designer 状态 → 违反 `designer-workbench-shell.md` 的分层，把 designer 语义泄漏进通用 page。

### 3.4 契约膨胀与稳定包约束

`page` 在 `flux-renderers-basic`（稳定结构/展示包）。增加 `leftPanel/rightPanel/collapse/resize` 一组字段会让 schema 契约面显著膨胀，而真实消费方只有 designer families——这部分能力已经由 WorkbenchShell + designer config 覆盖。**page 已经具备单侧 aside + 拖拽宽度**（`asideResizable`），业务页场景无缺口。

### 3.5 结论与替代路径

**不扩展 `page`。** 保持 page 现状（aside 能力已够业务页用）；workbench 增强全部落在 `WorkbenchShell`（组件层，或未来按需以 `workbench` renderer 包进 `flux-renderers-layout`——该包定位即 app-level 布局，若出现 schema 可见的工作台需求再评估，现在不必要）。

## 4. 分析：左右需要收缩——已有，且保留在 workbench 侧

"收缩"在 Flow Designer 里**已经落地**：`WorkbenchShell` 的 2rem rail + designer core store 折叠态 + `designer-workbench-shell.md` 的 rail 契约（整条 rail 可点击、键盘可聚焦、collapse 入口贴近中心区、rail 保留 host/action 边界）。

唯一可讨论的是 `page.aside` 要不要桌面端折叠开关。结论：不需要。

- AMIS page 本身没有桌面端 aside 折叠（只有 `asideResizor`/`asideSticky`）；
- page 的空 aside 已折叠（`hasAside` 判定），`aside: []` 不占位——这已覆盖"unavailable"维度；"available 但 collapsed"只对双面板工作台有意义；
- 移动端 aside 已有 Sheet 折叠路径。

## 5. 分析：上下（top/bottom）不需要收缩

- **top（toolbar/header）**：工具条是应用 chrome，高度小、承载核心操作（保存/撤销/自动布局）。折叠省下的纵向空间极少，却带来发现成本与 a11y 成本。行业惯例（VS Code、Figma、amis）顶部工具条均不折叠。纵向弹性已由 `grid-rows-[auto_minmax(0,1fr)]` 保证——canvas 高度本身就是弹性维度。
- **bottom**：Flow Designer 目前没有 bottom region（`dialogs` 是瞬态浮层）。若未来某 family 需要底部面板（如 spreadsheet 公式栏、console、timeline），正确做法是给 `WorkbenchShell` 增加**可选 bottom region + 同一 rail 契约**，而不是让 `page.footer` 可折叠——`page.footer` 是业务底栏（Tabbar/操作栏），语义是固定动作条，折叠会破坏其定位。

## 6. 分析：拖拽改宽度——需要，落点在 WorkbenchShell（opt-in）

### 6.1 左右宽度拖拽：需要

理由：

1. **先例已立**：`page.asideResizable`（pointer events + setPointerCapture + min/max clamp）与 amis `asideResizor` 同源，仓库内已有成熟交互范式；
2. **实际需求**：inspector 面板宽度因人而异（字段多的节点需要更宽 inspector），当前固定 15rem/22rem 是硬编码；
3. **工具已就绪**：`@nop-chaos/ui` 已封装 `react-resizable-panels`（`ResizablePanelGroup/ResizablePanel/ResizableHandle`，见 `packages/ui/src/components/ui/resizable.tsx`），无需新引入依赖。

**实现位置与形态**：

- `WorkbenchShell` 增加 opt-in props：`leftResizable/rightResizable`、默认宽度、受控宽度值 + `onLeftWidthChange/onRightWidthChange`；
- 用 `react-resizable-panels` 替换现有固定 `grid-cols-[...]`（rail 状态仍可保留为"折叠时不渲染 handle"或走 panel 的 collapsed 语义）；
- 保持现有 `data-testid`（`left-panel-expanded/collapsed` 等）与 rail 契约不变，避免 e2e 与 a11y 回归；
- a11y：拖拽 handle 需 `role="separator"` + `aria-orientation` + 键盘等价（复用 page aside resize handle 的先例）；
- **状态归属 family**：Flow Designer 的宽度状态放入 designer core store（与 `paletteCollapsed` 并列，新增 `designer:setPanelWidths` 一类 action，可持久化），`WorkbenchShell` 保持受控组件不持自管理宽度。

### 6.2 "可选择的"（opt-in）——同意

- `page.asideResizable` 已是 boolean opt-in 先例；
- workbench 侧同样由 family config 开关控制（如 `DesignerConfig` 面板宽度/可调标志），某些 host（如 Word Editor 左侧字段面板）保持固定宽度更合适；
- 默认值建议：`false`（不破坏现有三个 family 的默认视觉）。

### 6.3 上下拖拽改高度：不需要

与 §5 同理：顶部工具条高度固定，底部当前无面板，无对象可拖。若未来加 bottom region，再复用同一 `react-resizable-panels` 机制（方向 vertical）。

## 7. 结论汇总

| 问题                                            | 结论               | 落点                                                                            |
| ----------------------------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| page 吸收 workbench（top/left/right/收缩/拖拽） | **不吸收**         | page 保持现状；workbench 能力留在 WorkbenchShell                                |
| 左右收缩                                        | **已有，保留**     | WorkbenchShell rail + designer core store（无需新工作）                         |
| 上下收缩                                        | **不需要**         | 未来若需 bottom 面板，扩展 WorkbenchShell 可选 bottom region（同一 rail 契约）  |
| 左右拖拽改宽                                    | **需要（opt-in）** | WorkbenchShell + `react-resizable-panels`；状态归 family（designer core store） |
| 上下拖拽改高                                    | **不需要**         | 同上，仅当 bottom region 落地后再评估                                           |

### 建议后续动作（若有实现意向）

1. `WorkbenchShell` 增加 `leftResizable/rightResizable/leftWidth/rightWidth/onLeftWidthChange/onRightWidthChange` props，内部切换为 `react-resizable-panels`，保持现有 testid 与 rail 契约；
2. Flow Designer：designer core store 增加面板宽度状态 + `designer:setPanelWidths` action，`DesignerConfig` 增加宽度默认值与可调开关；
3. 更新 `docs/architecture/designer-workbench-shell.md`（resize 契约）+ `docs/components/page/design.md`（明确 page 不承担 workbench 职责的边界说明）；
4. 单测 + e2e 覆盖：折叠→展开→拖拽改宽→rail 恢复，双面板/单面板/窄视口三态。

## 8. 参考资料

- `docs/components/page/design.md`（page 定位、asideResizable 决策表）
- `docs/architecture/layout-selection-guide.md`（page/container/flex 边界）
- `docs/architecture/designer-workbench-shell.md`（canonical panel source、rail 契约、view 模式规则）
- `docs/architecture/flow-designer/design.md`（designer-page 组织模型、状态分层）
- `packages/flux-renderers-basic/src/page.tsx`（aside 拖拽实现）
- `packages/flux-react/src/workbench/workbench-shell.tsx`（固定 grid 布局现状）
- `packages/flow-designer-renderers/src/designer-page-body.tsx`（WorkbenchShell 消费、折叠 action）
- `packages/ui/src/components/ui/resizable.tsx`（react-resizable-panels 封装）
