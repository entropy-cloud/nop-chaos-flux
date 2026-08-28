# R2 第 5 轮递归扩展发现 — G3（round-05-g3）

> 轮次: Round 05（递归扩展 · **收敛确认轮**） · 审查日期: 2026-08-28 · HEAD `0f183874a`
> 组号: G3（data / dashboard / pivot） · agent: general（fresh session，只读审查）
> 派发输入: `dispatch-shared-prefix.md` + `dispatch-recursive-extension.md` + round-01 全文 / round-04 全文 / round-02-compact / round-03-compact（累积 253 条）
> 本轮价值判据: 收敛确认轮从严——只报通过真实用户影响检验、且与 253 条已有发现按根因去重后的**新**问题；低价值/机械重复/无明确用户影响的零散细节一律不报（弃报项见"核对过且不构成发现"节）。

## 盲区覆盖说明（派发指令残余盲区建议的逐项处置）

- **chart 交互（tooltip/legend/缩放）**: 已覆盖。tooltip/legend 均走 ui `ChartTooltipContent`/`ChartLegendContent` 基线；`brush`（缩放）经 `chart-schemas.ts:73` 证实文档化限定"仅 cartesian 类型"（scatter 不渲染 Brush 是契约内行为，非缺陷）；legend 点击切换系列属能力缺失（dedup §2 不报）；heatmap 无 tooltip 已由 [G3-视角11-02] 覆盖。**未发现新高价值问题**。
- **crud 多区块协同剩余面**: 已覆盖。query 区折叠/激活筛选计数（use-crud-filter-toggle）、toolbar blocks（statistics/switch-per-page/pagination/polling-toggle）、内建分页栏与外部分页控件的互斥（`hasExternalPaginationControl` → hideBar）、无限滚动区状态/重试、loadAction 装载与重试单发（`handleRetry` 的 `loadMore()`+`reload()` 经 crud-renderer-load.ts 核实为"武装 promise + nonce 重跑同一 effect"，单次请求，无双发）、轮询开关（文案随状态切换，状态可见）。**未发现新高价值问题**；新增发现集中在派发重点之外的 dashboard 编辑器残余面（inspector 写入通道 / preview 态 / 键盘操作），系前 4 轮"列契约、虚拟化组合、运行时实测"主线未覆盖的写入门控盲区。

## 发现汇总

| 严重程度 | 数量 | 编号               |
| -------- | ---- | ------------------ |
| HIGH     | 0    | —                  |
| MEDIUM   | 2    | 视角4-01、视角3-01 |
| LOW      | 1    | 视角3-02           |

共 **3 条**。G3 组累积（R1–R5）: 26 + 9 + 8 + 4 + 3 = **50 条**；全审查累积: 253 + 3 = **256 条**。
收敛趋势（G3）: 26 → 9 → 8 → 4 → 3。本轮 3 条中 2 条为已立根因的跨包/跨组件兄弟实例（§1 规则），1 条为新根因；R5 递归仅能产出窄配置面/编辑面细节，**建议 G3 组审查收敛**。

---

### [G3-R5-视角4-01] Inspector 的 X/Y/W/H 数值写入绕过布局钳制层：负坐标/零尺寸面板从画布消失且不可点选，保存后与运行态渲染分歧

- **文件**: `packages/flux-renderers-dashboard/src/editor/editor-inspector.tsx:131-155`（NumberInput）、`:70-99`（X/Y/W/H 字段）、`:208-216`（updatePanel）；对照 `packages/flux-renderers-dashboard/src/layout-math.ts:84-112`（clampPanelPosition/clampPanelSize）、`:248`（sanitizePanels 边界钳制）、`packages/flux-renderers-dashboard/src/editor/dashboard-domain-adapter.ts:149-151`（validate 仅校验 finite）、`packages/flux-renderers-dashboard/src/dashboard-renderer.tsx:79`（运行态消费 sanitizePanels）
- **证据片段**:
  ```tsx
  // editor-inspector.tsx:147-151 —— 任意 finite 数值原样写入，无范围钳制
  onChange={(event) => {
    setDraft(event.target.value);
    const parsed = Number(event.target.value);
    if (Number.isFinite(parsed)) onChange(parsed);
  }}
  // :208-216 —— updatePanel 直写会话，未经 clampPanelPosition/clampPanelSize
  function updatePanel(core, panelId, patch: PanelPatch): void {
    core.update((doc) => ({
      panels: doc.panels.map((p) => (p.id === panelId ? { ...p, ...patch } : p)),
    }));
  }
  ```
  ```ts
  // dashboard-domain-adapter.ts:149-151 —— 保存校验只挡非数字，负数/0/超 cols 全部放行
  if (
    ![panel.x, panel.y, panel.w, panel.h].every((v) => typeof v === 'number' && Number.isFinite(v))
  ) {
    problems.push(`panel "${panel.id}" has non-numeric geometry`);
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 拖拽（`dragPanel`）、缩放（`resizePanel`）、画布落点（clampPanelPosition）与运行态装载（`sanitizePanels`，dashboard-renderer.tsx:79）四条写入通道全部经 layout-math 的钳制层（x ∈ [0, cols-w]、y ≥ 0、w ∈ [1, cols]、h ≥ 1）；唯独 Inspector 的 X/Y/W/H 数字输入这条写通道完全绕过钳制——输入 -5、0、99 均被原样写入会话。后果链：① 负 X/Y 使 `panelToPixels` 渲染出负偏移面板（`overflow-auto` 容器无法向左/上滚动，负坐标区域不可达），w/h ≤ 0 使宽度/高度为负值或塌缩——面板从画布上消失且无法点选，Esc 清空选中后 Inspector 也回到"请选择面板"空态，唯一恢复手段是撤销；② 保存时 adapter `validate` 只校验 finite，非法几何**校验通过并序列化落盘**，而运行态渲染前会被 `sanitizePanels` 静默钳回边界——编辑器里看到的（消失/错位）与保存后运行态呈现的（钳制后位置）不一致，作者无法理解保存结果。与 [G3-R2-视角4-03]（清空即写 0）根因不同：那条是空串 `Number('')` 解析缺陷，其修复（忽略空输入）不会补上范围钳制；与 [G3-R3-视角11-01]（新增/拖拽无碰撞处理）亦不同：那是重叠检测缺失，本条是既有钳制层未接入 Inspector 写通道。
- **行业惯例**: 画布类编辑器对坐标/尺寸输入一律做边界校验（Figma 属性面板负值/非法值即时钳制或拒绝；Grafana 面板 gridPos 由服务端 schema 限定 w/h/x/y 范围并校验；shadcn/ui Resizable 的受控 min/max 拒绝越界值）。所有写入通道走同一校验/钳制层是布局编辑器的基线（本项目自身 layout-math.ts 注释亦声明边界 clamp 是 drag/resize 的失败路径契约）。
- **用户影响**: 用户在 Inspector 把 X 改成 -2（或把 W/H 清成 0、误输负数）后，面板立即从画布消失且点不回来——界面上无任何错误提示解释"面板去哪了"；若此时保存，落盘布局含越界几何，页面运行态呈现的面板位置/尺寸与编辑时所见不同，用户判定"编辑器坏了"或"保存丢了数据"。
- **建议**: Inspector 写入统一过钳制层：`updatePanel` 中对几何补丁走 `clampPanelSize(clampPanelPosition({ ...panel, ...patch }, gridOptions), { cols })` 后再 `core.update`（gridOptions 由 renderer 的 cols/rowHeight/gap 组装，已在作用域内）；同时在 NumberInput `onBlur` 把越界 draft 回写为钳制值（对齐现有 `setDraft(String(effectiveValue))` 通道），并在 adapter `validate` 中把 w < 1 / h < 1 / x < 0 / y < 0 列为 problems，阻断非法几何落盘。补一条"Inspector 输入 -5 → 画布面板仍在边界内"的断言。
- **复核状态**: 未复核

---

### [G3-R5-视角3-01] dashboard 编辑器 preview 态编辑通道未按 mode 门控：Delete 按钮随旧选中态保持可用，预览中一点即删面板（[G5-R2-视角3-03] 同根因新实例）

- **文件**: `packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:239-255`（Delete 按钮）、`:279-292`（mode 切换）、`:296-330`（preview 分支不渲染 EditorCanvas）；`packages/editor-core/src/editor-core.ts:261-265`（setMode 不清 selection）
- **证据片段**:
  ```tsx
  // dashboard-editor-renderer.tsx:243-251 —— 仅以 selection 判定可用，与 mode 无关
  <Button type="button" variant="outline" size="sm" data-testid="editor-delete"
    disabled={selection.length === 0}
    onClick={() => {
      const removed = new Set(selection);
      core.update((doc) => ({ panels: doc.panels.filter((p) => !removed.has(p.id)) }));
      core.setSelection([]);
    }}
  >
  ```
  ```ts
  // editor-core.ts:261-265 —— 切到 preview 不清空 selection、不通知门控
  setMode(modeToSet) {
    if (disposed || modeToSet === currentMode) return;
    currentMode = modeToSet;
    notify();
  },
  ```
- **严重程度**: MEDIUM
- **现状**: 编辑态选中一个面板后点"预览"（Eye）切到 preview：`setMode` 不清空 selection（editor-core.ts:261-265），preview 分支渲染的是运行态 dashboard（EditorCanvas 卸载，画布内既无法点选也无法用 Esc 清选中——Esc 处理器挂在 canvas-body 上，随画布一起卸载），于是 header 的 **Delete 按钮带着旧选中态保持可用**，Undo/Redo 亦然。preview 中点一下 Delete：`core.update` 直接从 working 文档删除该面板，预览画布随之少一块——"预览"这一承诺非编辑态的模式保留了全部破坏性编辑通道，且选中高亮已不可见（画布不是编辑画布），用户对"删的是什么"零视觉线索，唯一恢复是 Undo。与 round-02 [G5-R2-视角3-03]（scada 编辑器 preview 态工具箱/属性面板 mutator 未按 mode 门控，MEDIUM）同根因（preview 态编辑通道未门控）的 dashboard 编辑器新实例，两包修复互不覆盖。
- **行业惯例**: 编辑器预览模式的语义是只读检视（Figma preview/presentation、Grafana 仪表盘查看态均隐藏或禁用全部编辑动作）；Ant Design Pro 编辑页"预览"态下保存/删除操作条同步冻结。预览中可执行删除被普遍视为模式门控缺陷。
- **用户影响**: 用户切到预览核对布局时（旧选中仍在，但看不到选中框），误触 header 的删除按钮，预览中的面板无提示消失；用户无法分辨是"预览渲染缺面板"还是"被删了"，需撤销才能找回。破坏性动作在承诺不可编辑的模式下可一键触发。
- **建议**: 二选一：① mode 门控——header 编辑组（Delete/Undo/Redo，Save 视 dirty 自然禁用）在 `mode === 'preview'` 时整体 `disabled` 或隐藏（`disabled={mode === 'preview' || selection.length === 0}`）；② 会话门控——`setMode` 内切出 edit 时 `setSelection([])`（editor-core 一处修改，scada 编辑器同批受益），并对 preview 态屏蔽 undo/redo 快捷入口。建议 ①+② 同做；补一条"edit 选中 → 切 preview → Delete disabled"的断言。
- **复核状态**: 未复核

---

### [G3-R5-视角3-02] 编辑画布面板的移动/缩放仅指针可操作：role=button 面板无方向键移动、resize 手柄无键盘通道，键盘用户无法执行编辑器的核心操作 [scope-conflict]

- **文件**: `packages/flux-renderers-dashboard/src/editor/editor-canvas.tsx:142-168`（handleKeyDown 全部按键分支）、`:220-232`（面板 role="button" tabIndex=0 + onPointerDown 拖拽）、`:273-282`（八向 resize 手柄仅 onPointerDown）；对照同文件键盘已实现的选择/删除/复制通道
- **证据片段**:
  ```tsx
  // :142-168 —— 键盘分支仅有 Delete/undo/redo/duplicate/Escape，无任何移动/缩放键
  if ((event.key === 'Delete' || event.key === 'Backspace') && sel.length > 0) { ... }
  else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) { core.undo(); }
  ...
  else if (event.key === 'Escape') { core.setSelection([]); }
  // :273-281 —— 八向 resize 手柄是纯 pointer 通道的 12px div
  <div key={handle} data-slot="dashboard-editor-resize-handle" data-handle={handle}
    className={cn('absolute z-20 size-3 rounded-sm ...', HANDLE_POSITION[handle])}
    onPointerDown={(event) => startDrag(event, panel.id, handle)}
  />
  ```
- **严重程度**: LOW
- **现状**: 面板是 `role="button" tabIndex={0}` 的可聚焦控件（:220-221），键盘用户可聚焦、选中、删除（Delete）、复制（Ctrl+D）、撤销——唯独**移动**与**缩放**（本编辑器除增删外的全部核心布局操作）只有 Pointer 拖拽一条通道：方向键无移动处理，resize 手柄是无 tabIndex 的 `size-3` 纯 pointer 目标。dragPanel/resizePanel 的网格步进模型（snapToGrid + clamp）天然适合 ±1 格方向键映射，但未接线。与 [G3-R2-视角3-01]（表格行点击无键盘等价）、[G1-视角8-14]（page 侧栏拖拽把手不可聚焦，LOW [scope-conflict]）同属"拖拽操作无键盘等价路径"根因族的 dashboard 编辑器实例——前两轮的核查面（表格行点击、page 把手）不覆盖本组件；本条影响的是编辑器的主操作而非次要微调，但受众为键盘/AT 用户，按 [G1-视角8-14] 先例维持 LOW 并标 [scope-conflict]（兼涉 WCAG 2.1.1，主要影响为交互模式缺口）。
- **行业惯例**: 画布编辑器的键盘等价是基线能力：Figma/Google Slides 选中对象后方向键步进移动（Shift 加速），shadcn/ui Resizable 把手自带方向键 resize；react-resizable-panels、AG Grid 浮动列等可拖拽控件均提供键盘通道。仅拖拽可操作的核心编辑在键盘可达性审查中按缺陷处理。
- **用户影响**: 仅用键盘的用户（或 AT 用户）可以在面板库新增面板、聚焦后删除/复制，却无论如何无法把面板挪到目标位置或调整大小——编辑器的核心任务对该用户群完全不可达；因控件可聚焦且其余操作可用，用户会在多次尝试方向键无效后才能确认"移动只能靠鼠标"。
- **建议**: 在 `handleKeyDown` 的选中分支补方向键通道：Arrow 方向键对 `selection[0]` 调 `dragPanel(panels, id, (x±1 格像素), (y±1 格像素), gridOptions)`（复用现有钳制与 undo 事务模型，Shift+Arrow 步进 3 格）， Alt/Shift+方向键或 `[]`/`;-` 类键位对 `resizePanel` 做八向缩放（最小闭环可先支持 e/s 两向）；同时给 resize 手柄补 `tabIndex={0}` + `role="separator"` + `aria-label`（八向语义）+ 方向键处理与 focus-visible ring（同款先例见 page.tsx 侧栏把手建议）。补一条"聚焦面板按 ArrowRight → 面板 x + 1"的断言。
- **复核状态**: 未复核

---

## 去重自检（与全部 253 条按根因比对）

- **[G3-R5-视角4-01]**（Inspector 写入绕过钳制）≠ [G3-R2-视角4-03]（Inspector 数字清空即写 0）：根因分别为"范围钳制缺失（负值/零尺寸/超界全放行，adapter validate 亦放行）"与"空串 `Number('')` → 0 解析缺陷"；R2 条目的修复（忽略空输入）不改变 -5/99/0 尺寸可写入的事实，修复互不覆盖。≠ [G3-R3-视角11-01]（新增面板 (0,0) 落点、无碰撞处理）：彼为重叠检测缺失，本为边界钳制层未接入既有写通道，机制与修复点不同。
- **[G3-R5-视角3-01]**（preview 态编辑通道未门控）← [G5-R2-视角3-03]（scada 编辑器 preview 态 mutator 未门控）：同根因（preview 态编辑通道未按 mode 门控）跨包新实例，按 dedup §1"同类根因的新实例"上报；scada 条目的核查面（工具箱/图元库/属性面板）不含 dashboard 编辑器 header 动作组，两处修复独立。
- **[G3-R5-视角3-02]**（面板移动/缩放无键盘等价）← [G3-R2-视角3-01]（行点击 toggleOnRowClick 无键盘路径）/ [G1-视角8-14]（page 把手不可聚焦）：同族"拖拽无键盘等价"根因的 dashboard 编辑器新实例；前轮条目不涉及画布面板，修复点（方向键 + 手柄聚焦）独立。
- chart 缩放（Brush）不渲染于 scatter：`chart-schemas.ts:73` 文档化限定"仅 cartesian 类型"，契约内行为，不报；legend 无点击切换系列：能力缺失（dedup §2），仅此备忘不入发现。

## 转 C2 候选（dedup §2 规则，不计入发现）

无新增。本轮未撞见 G-A~G-M 已登记 16 项能力缺口的新表象（chart legend 切换系列属未实现能力，非已登记项，按低价值备忘处理不立案）。

## 本轮核对过且不构成发现的疑点（防复核重复提问）

- **表格排序三态**（视角 1/10 未扫面）：`table-header-row.tsx:225-229` asc=ArrowUp/primary、desc=ArrowDown/primary、未排序=ArrowUpDown/muted-foreground/40，`aria-sort`（:188）与多排序徽标（:211-216）齐备——是排序三态的正确基线，无缺陷。
- **crud 重试双发疑点**：`handleRetry`（crud-renderer.tsx:350-360）同时调 `loadMore()` 与 `reload()`，经 crud-renderer-load.ts 核实为"loadMore 仅武装单槽 resolver、reload 以 nonce 重跑同一装载 effect、onSettle 统一结算"——单次网络请求，非双发，不立案。
- **toolbar pagination 块 aria-disabled 按钮仍可聚焦**（crud-renderer-toolbar.tsx:128-155 / crud-list-pagination.tsx:21-46）：`pointer-events-none opacity-50 aria-disabled` + onClick 内 `currentPage <= 1` JS 守卫双保险，键盘 Enter 落在守卫上，无用户可见后果，低于门槛。
- **轮询开关激活态**（crud-renderer-toolbar.tsx:162-173）：`data-active` 无样式消费，但按钮文案随状态切换（启动轮询 ↔ 停止轮询），状态可见，≠ [G1-R2-视角3-02] 的"零反馈"形态，不立案。
- **autoJumpToTopOnPagerChange 仅表格模式生效**（crud-renderer.tsx:365-378 仅挂 `nop-crud-table` 容器）：`crud-schema.ts:279` 文档明示 "Scroll the **table** container"，list/cards 模式属文档化范围外，非承诺违背，弃报留档。
- **未知 total 时 Next 越页**（crud-renderer-toolbar.tsx:142-154）：total 为 null 时 Next 恒可用、可翻到空页——服务端未给 total 的固有边界，页面有"暂无数据"兜底，弱于门槛。
- **编辑画布 Delete 无确认**：undo 栈完备，沿 [G4-视角8-02] "删除有 undo 兜底"先例，低于门槛。
- **duplicateSelected 偏移 (+1,+1) 无碰撞**：系 [G3-R3-视角11-01] 已立"无碰撞处理"根因的直接表面，随该条一并修复，不另立。
- **panelToPixels 对 w=0 的负宽渲染**：已并入 [G3-R5-视角4-01] 后果链，不重复计数。
- **pivot 包**（pivot-renderer.tsx 全文 + pivot-option.ts 全文）：loading/empty/initError 三态、主题令牌映射、事件桥均为 R2/R3 已覆盖或已登记自查的形态（R4 G3 自查节维持原判），本轮复读无新实例。
- **散点图 XAxis 缺 xKey 时不渲染**：schema 未配 dataKey 的退化形态，y 轴与数据仍可见，属可配置范围，不立案。

## 检查范围

- **目标**: 与 R1–R4 同口径——`packages/flux-renderers-data/src/`（80 非 test 文件）、`packages/flux-renderers-dashboard/src/`（14 非 test 文件）、`packages/flux-renderers-pivot/src/`（7 非 test 文件）；`*.test.*`、`test-support*` 不入审。
- **本轮精读**: chart-renderer.tsx（全文）、chart-heatmap.tsx（全文）、chart-schemas.ts、`packages/ui/src/components/ui/chart.tsx`（全文，tooltip/legend 交互面）；crud-renderer.tsx（全文）、crud-renderer-toolbar.tsx（全文）、crud-infinite-scroll-area.tsx（全文）、crud-list-pagination.tsx（全文）、crud-renderer-load.ts（全文）、use-crud-polling.ts（全文）、use-crud-filter-toggle.ts（全文）、tree-search.tsx（全文）、table-renderer/use-table-sort.ts（全文）+ table-header-row.tsx 排序/aria 段；dashboard editor 五件套（dashboard-editor-renderer.tsx / editor-canvas.tsx / editor-inspector.tsx / editor-palette.tsx / dashboard-domain-adapter.ts 全文）+ layout-math.ts（全文）+ dashboard-renderer.tsx（全文）；pivot-renderer.tsx / pivot-option.ts（全文）；交叉核实 `packages/editor-core/src/editor-core.ts`（setMode/setSelection 段）。

## 检查方法

1. **盲区定向走查**：按派发重点构建"chart 交互矩阵"（tooltip×5 图型 / legend×窄容器 / Brush×chartType×文档契约 / heatmap 提示面）与"crud 多区块协同矩阵"（query 折叠×筛选计数 / toolbar blocks×内建分页互斥 / 无限滚动×重试×翻页重试 / 轮询开关×装载），逐格通读代码闭环。
2. **写入通道全量反查（本轮主方法，dashboard 编辑器）**：以 layout-math 钳制层（clampPanelPosition/clampPanelSize/sanitizePanels）为基准，对会话文档的全部写入通道（drag / resize / drop 落点 / addPanel / duplicate / Inspector 五字段 / header Delete）逐一回溯是否过钳制与 validate——发现 Inspector 数值通道为唯一旁路，且 adapter validate 的 finite-only 校验使其落盘。
3. **模式门控矩阵**：edit/preview 两态 × header 动作组（undo/redo/delete/save/mode）× selection 生命周期（setMode 不清选中的 editor-core 事实核对），对照 [G5-R2-视角3-03] 先例定性。
4. **既有结论复核**：对 R4 两条 HIGH（resize 包含块 / autoFill×虚拟 ref 互斥）的修复面反查现状（未修复，不重报）；对 [G3-视角5-02] 确认其证据已含 crud-infinite-scroll-area（不重复）；table 排序三态、pagination 双保险、轮询开关等高频疑点逐一定性后落入"不立案"节。

## 结论

新发现 **3 条**（HIGH 0 / MEDIUM 2 / LOW 1）。G3 组四轮主线（列契约、虚拟化组合、运行时实测）之后的残余缺陷集中在编辑器写入通道与模式门控，均为窄面实例；派发重点盲区（chart 交互、crud 多区块协同）经本轮闭环核对**未发现新高价值问题**。按收敛确认轮判据，**G3 组审查收敛，建议不再递归**。
