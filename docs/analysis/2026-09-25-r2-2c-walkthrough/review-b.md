# [review-b] R2-2c 批三（宿主/画布类 16 卡）独立复核（复核 agent B，fresh session）

- **日期**: 2026-09-25 ｜ **口径**: 检查提示词阶段 3（独立取证在先、与原发现比对在后）
- **复核人**: plan 498 Phase 2 独立复核 agent B（与走查执行者无共享上下文）
- **环境**: dev server `http://127.0.0.1:4175`（curl 200）；Playwright 1.63 chromium；dark 一律显式 `document.documentElement.setAttribute('data-mode','dark')`；对比度数值判读走 PNG 像素采样（自研解码器，方法同 `_tmp/r2-2b-probes/w5-png.mjs`）；`page.evaluate` 全部传真函数
- **范围**: P2 ×3 全查（G7-123、C2-154、A9-156）+ P3 抽样 ×7（B2-151、G2-153、G8-155、G6-157、A5-152、C1-121、G2-128——超 ≥5 下限，其中 G2-128 为必查冲突项）+ R2-1b/c watch 先例复检 ×3（R2-1b-G1-01、G2-01、G6-01），共 13 项。A9-122 按分工归 review-a，本轮不判、仅在 drift 小节交叉引用。
- **复核方式**: 全部 13 项均重开页面、重截同态截图、重跑探针（探针 `_tmp/r2-2c-review/rb1*.mjs–rb6*.mjs` 共 9 个，原始 JSON `rb-*.json` 共 9 份，截图 `_tmp/r2-2c-review/rb/<control>/` 共 13 张），未采信任何原文数据。关键项做了**差分实验**：A9-156 快/慢键入对照（快 0ms/char vs 慢 150ms/char）、G2-128 节点矩形+viewport transform 双轨追踪、R2-1b-G6-01 全链路验证（拖拽位移→undo 位移还原→redo 时序轮询）。根因逐条下探至源码行级。
- **总判定**: **10 条正式发现：保留 9 / 驳回 1 / 降级 0**（保留中 2 条按本轮取证实质修正根因：A9-156、G7-123）。**watch 先例复检 1 项反转**：R2-1b-G6-01"已消失"结论被独立复现反驳，建议恢复 open。drift 确认 4 条 + owner-doc-missing 登记 4 控件（§drift）。

## §0 汇总表

| #   | 发现 id      | 控件               | 原判级 | 独立取证结果                                                                                                                                                                                                                                                              | 结论                    | 备注                                                                                                                                                                                                                       |
| --- | ------------ | ------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | R2-2c-G7-123 | dashboard-editor   | P2     | 拖拽后面板 left 346→480，inspector X/Y 恒 "0"/"0"；改名后 canvasTitle "Renamed Chart" 而输入框回弹 "Revenue"；canvas→inspector 方向正常（kpi-orders/Orders）                                                                                                              | **保留 P2（机制精化）** | 根因收敛为"inspector 非响应式读 `core.getState()`（editor-inspector.tsx L27）+ NumberInput draft 只播种（L183）"；标题回弹 = 受控输入 props 不随 commit 刷新被 React 还原旧值（见 §1）                                     |
| 2   | R2-2c-C2-154 | designer-page      | P2     | summary tab 两边 path bbox **6×0px**、d 属性逐字符同原卡（`M306,180 C310,180…`）；对照 workflow tab 边跨节点间隙完整；截图目视连线不可见+标签 garble 同象                                                                                                                 | **保留 P2**             | summary schema 确无 `classAliases`/`appearance`（0 命中 vs workflow schema minWidth 192 ×4），测量塌缩机制成立（见 §2）                                                                                                    |
| 3   | R2-2c-A9-156 | spreadsheet-page   | P2     | 快键入 'abc'→'bc'、非空格键 '42'→'2'、单键 '9'→'9' 全复现；**差分实验：慢键入 150ms/char 仍丢首键**（'xyz'→'yz'）——确定性非竞态                                                                                                                                           | **保留 P2（根因修正）** | 原卡"首键被消费未 seed"**证伪**：grid.tsx L359 有 seed（`onEditValueChange(event.key)`）；真凶 = inline-controls.tsx L27 `input.select()` 全选播种字符，下一键替换之；且 owner-doc L71 明文契约被违反（见 §3 + drift D-1） |
| 4   | R2-2c-B2-151 | designer-canvas    | P3     | computed stroke `rgb(148,163,184)` 复现；自采纸面 5 点均值 rgb(239,243,248) → **2.30:1**（原 2.25:1，同向）；路径中点实测像素确认边线实际绘制；slate-500 修复值对纸面 ≈4.27:1 可达 3:1                                                                                    | **保留 P3**             | 数值微差源于纸面采样点落点（网格点纹理），不影响判定（见 §4）                                                                                                                                                              |
| 5   | R2-2c-G2-153 | designer-node-card | P3     | 真实 hover 后 computed `cardHover.cursor:"default"`（summary-node-start）、`rowHover.cursor:"default"`（summary-edge-1）；源码 node-card L70-76 / edge-row L74-79 className 均无 cursor 类                                                                                | **保留 P3**             | 与原卡逐值一致（见 §5）                                                                                                                                                                                                    |
| 6   | R2-2c-G8-155 | designer-node-card | P3     | summary 三节点 `hasGlass:false`、body 176×32（workflow tab 对照玻璃卡）；summary schema `classAliases` 0 命中、workflow schema 1 命中                                                                                                                                     | **保留 P3**             | 机制（classAliases 未定义→别名键字面量裸 class）成立（见 §6）                                                                                                                                                              |
| 7   | R2-2c-G6-157 | word-editor-page   | P3     | canvas 像素路径 **[296,281,260,249,236,220,202,180] 与原卡逐值相同**：7 字符 7 次撤销、单调回落、可复原；单字符 undo 正常                                                                                                                                                 | **保留 P3**             | 逐字符 undo 粒度坐实（见 §7）                                                                                                                                                                                              |
| 8   | R2-2c-A5-152 | designer-field     | P3     | 四 example tab `.nop-designer-field` 计数全 0（含钉钉/Action tab 本轮补测）；`grep '"type": "designer-field"'` schemas 0 命中；选中态仍 0                                                                                                                                 | **保留 P3**             | 静态契约完整、载体零消费成立（见 §8）                                                                                                                                                                                      |
| 9   | R2-2c-C1-121 | dashboard          | P3     | preview 1280：panel-body overX 4（overflow hidden）、stat-tile-root overX 12/rectW 100；800：overX 56——全复现；源码 stat-tile-renderer.tsx L182-184 `text-3xl` 无 truncate/min-w-0                                                                                        | **保留 P3**             | 另见 panel-body overY 21 同源观察（见 §9）                                                                                                                                                                                 |
| 10  | R2-2c-G2-128 | graph              | P3     | hover cursor default 属实；但**"节点可拖"前提证伪**：拖拽时节点 rect 与 viewport transform 同步 +90/+50 且 mouse.up 后 transform 驻留——是 pan 驻留非节点拖拽；源码 xyflow-canvas.tsx L107 `nodesDraggable={false}` 硬禁用，与 owner-doc graph/design.md L32/L42/L255 一致 | **驳回**                | 原卡 dragEnd 证据实为 viewport pan；修复方向（节点加 cursor-grab）会误导用户；提请的"R2-1c G2 pass 改判"不成立（见 §10）                                                                                                   |
| —   | R2-2c-A9-122 | dashboard-editor   | P1     | 按 plan 498 分工归 review-a，本轮未取证、不判                                                                                                                                                                                                                             | —（归 review-a）        | drift D-3 交叉引用其卡内证据                                                                                                                                                                                               |

## 逐条复核

### 1. [R2-2c-G7-123] inspector 与画布状态不同步 — 保留 P2，机制精化

**独立取证**（`rb2-dashboard-g7.mjs` → `rb-2-dashboard-g7.json`；截图 `rb/dashboard-editor/rb-editor-afterdrag-light.png`、`rb-editor-renamed-light.png`）:

- 选中 kpi-revenue（x0/y0，inspector X/Y "0"/"0" 一致）→ pointer 拖拽 +134/+96（left 346→480、top 351→447）→ inspector X/Y **仍 "0"/"0"**。复现。
- `fill('inspector-title','Renamed Chart')` 后 400ms：画布标题 `Renamed Chart`（写路径生效），inspector 输入框值 **"Revenue"（回弹旧值）**。复现（原卡为 "Chart"，同象不同实例）。
- 反向 canvas→inspector：点击 kpi-orders → inspectorId/Title 即变（kpi-orders/Orders），读方向正常。复现。

**根因（行级，精化）**: `editor-inspector.tsx` L27 `const working = core.getState().working;` 为**非响应式读**——组件只在 `selection` prop 变化时重渲染，不订阅会话 revision。后果分两支：① NumberInput `useState(String(value))`（**L183**，原卡写 L194，行号修正）只在挂载/blur 重播种，外部变更（拖拽/undo）永不回显；② 标题 Input 是受控输入，`value` 来自过期快照——commit 后组件不重渲染，React 在下一提交周期把 DOM 值还原为旧 prop，形成"键入被回滚"观感。undo 后 inspectorTitle 仍 "Revenue"（该次恰与回退后真值重合，掩盖问题）。原卡"inspector 快照不随会话 revision 刷新"的判断方向正确，本轮收敛到具体行级机制。

**结论**: **保留 P2**。修复方向维持并精化：让 EditorInspector 经 `useSyncExternalStore` 订阅 core（或传入 reactive 快照），NumberInput 删除 draft 本地态；补"拖拽后 X/Y 等于新格坐标"回归断言。归族 local → R2-4 维持。

### 2. [R2-2c-C2-154] summary tab 连线退化为 6×0px 短桩 — 保留 P2

**独立取证**（`rb1-flow.mjs` → `rb-1-flow.json`；`rb1b-flow-fixup.mjs` 3.5s 长等待复核；截图 `rb/designer-canvas/rb-summary-default-{light,dark}.png`）:

- summary tab 两条边 path bbox 均 **6×0px**（x485/y416、x677/y416），stroke `rgb(202,202,202)` 有值，d 属性 `M306.00001525878906,180.00001525878906 C310.0000…` 与原卡逐字符一致；3.5s 长等待后仍 6×0（非瞬时测量窗）。
- 对照 workflow tab：e-3/e-4 bbox 72.5×18.6、e-5/e-6 17.6×49——跨间隙完整贝塞尔；e-1/e-2 虽短（7.8×0）但精确横跨相邻节点间 14px 间隙（节点 304–398 / 412–506），属紧凑布局常态而非塌缩。
- 截图目视复核：summary 画布三节点间无任何可见连线，Send Email/End 左缘有标签+句柄堆叠 garble 簇；右侧 EDGES 面板却声明 "Start Node → Task Node" 等两条边——数据在、渲染塌缩。

**机制佐证**: `designer-summary-demo-schema.json` `classAliases`/`appearance` 双 0 命中；`workflow-designer-schema.json` 有 `appearance.minWidth:192` ×4。xyflow 首测前句柄塌缩机制成立。

**结论**: **保留 P2**。修复方向维持（`nodesInitialized` 门控或 nodeType 兜底 minWidth + demo schema 补 appearance 双保险）。归族 local → R2-4 维持。

### 3. [R2-2c-A9-156] type-to-edit 丢首键 — 保留 P2，根因修正（"未 seed"证伪，真凶是 select 全选）

**独立取证**（`rb4-spreadsheet-a9.mjs` → `rb-4-spreadsheet-a9.json`；截图 `rb/spreadsheet-page/rb-editing-fast-light.png`）:

- 快键入（delay 0）空格 'abc' → 编辑器 "bc"、提交 "bc"；非空格（Alpha）'42' → "2"/"2"；单键 '9' → "9"/"9"。三点全复现。
- **决定性差分（证伪原机制表述）**: 慢键入 **150ms/char** 空格 'xyz' → 编辑器 **"yz"**、非空格 '99' → **"9"**。若原卡机制（"首键被消费用于打开编辑器、未 seed"）成立，慢速下第二次 keydown 时编辑器已挂载，'y' 应追加到 'a' 后得 "ayz"；实测仍整段丢首键 → **确定性、非时序竞态**。
- **真根因（行级）**: 打开编辑器分支**有 seed**——`spreadsheet-grid.tsx` L343-360 对 `event.key.length===1` 依次 `onCellClick` → `onCellDoubleClick`（`use-editing.ts` L36-46 `core.startEditing(cell, 现值)`）→ `onEditValueChange(event.key)`（L359，→ `core.updateEditValue`，core.ts L127 同步写 draft）。即首字符**确实进入了 draft**。但编辑器挂载时 `inline-controls.tsx` L20-28 `useLayoutEffect` 执行 `input.focus(); **input.select()**` 全选了刚 seed 的字符——第二个键入键触发浏览器"替换选区"语义，把首字符整体替换掉。空格 'abc'：seed 'a'(全选) → 'b' 替换→'b' → 'c' 追加→'bc' ✓；非空格 '42'：seed '4' 覆盖 '42' 草稿(全选) → '2' 替换→'2' ✓；单键无后续键入 → '9' ✓。全部观测逐一定值吻合。

**结论**: **保留 P2**（行为与判级不变，修复方向改判）：不是"补 seed"（seed 已在），而是 **type-to-edit 打开时不应 select 全选**——`useLayoutEffect` 仅 focus + 光标置尾（全选保留给 F2/Enter 编辑现值场景），或 seed 后跳过 select。另：`spreadsheet-page/design.md` L71 明文契约 "direct text entry **that replaces the current cell content draft**" 被违反——最终 draft 是"第二个字符起的内容"而非用户键入文本（drift D-1），修复时建议同步补"type 'abc' → expect 'abc'"回归用例进交互测试。归族 local → R2-4 维持。

### 4. [R2-2c-B2-151] 画布边线 light 对比度低于 3:1 — 保留 P3

**独立取证**（`rb1d-edge-points.mjs`：`getPointAtLength`+`getScreenCTM` 求路径中点屏幕坐标 → PNG 采样；`rb1c-png-sample.mjs` 纸面均值 → `rb-1d-edge-pixels.json`/`rb-1c-png-b2.json`）:

- computed stroke `rgb(148,163,184)`/2px 复现（rb1 workflow.edges）。
- 纸面 5 点采样均值 rgb(239,243,248)（含网格点纹理，波动 224–252）→ stroke 对纸面 **2.30:1**；纯白底 2.56:1；原卡纸面均值 2.25:1——同向同结论，均 < WCAG 1.4.11 的 3:1。
- 路径中点 ±2px 邻域实测到绘制像素（e-2 实测 3.26:1、e-3 1.58:1，抗锯齿弥散），确认边线真实绘制、弱可辨。
- 修复参照：slate-500 `#64748b` 对实测纸面 ≈**4.27:1**，达标。

**结论**: **保留 P3**。数值 2.25→2.30 属采样落点差（网格点纹理），不改判。summary tab 同险（stroke rgb(202,202,202) 更弱）维持并案观察。归族 watch-only → 台账维持。

### 5. [R2-2c-G2-153] 摘要卡/行 cursor default 无 pointer — 保留 P3

**独立取证**（`rb1-flow.mjs` → `rb-1-flow.json`）: 真实 mouse hover 后 computed `summary-node-start` cursor **"default"**、`summary-edge-1` cursor **"default"**。源码 `designer-node-card.tsx` L70-76 与 `designer-edge-row.tsx` L74-79 的 className 组合均无任何 cursor 类（原卡所指 L73/L76 为块首行号，微移不误）。对照同页画布节点 `cursor: grab`（原 flow1 数据）与 ui Button pointer 惯例成立。两文件同批修复建议维持。

**结论**: **保留 P3**。归族 watch-only → 台账维持。

### 6. [R2-2c-G8-155] summary 节点无卡片 chrome — 保留 P3

**独立取证**（`rb1-flow.mjs`）: summary tab 三节点 `hasGlass:false`、body 176×32、裸文本（Start / Send Email / End）；对照 workflow tab 节点为玻璃卡（原 flow1 `nop-glass-card` ~192×112）。schema 侧 `designer-summary-demo-schema.json` `classAliases` **0 命中** vs `workflow-designer-schema.json` **1 命中**——"别名键不解析→字面 class 裸渲染"机制成立。dark 截图同构复核。

**结论**: **保留 P3**。修复方向维持（渲染器 dev warn 或 designer-page 缺省 classAliases 兜底 + demo schema 速效兜底）。归族 watch-only → 台账维持。

### 7. [R2-2c-G6-157] undo 逐字符粒度 — 保留 P3

**独立取证**（`rb5b-word-g6.mjs` → `rb-5-word-g6.json`；截图 `rb/word-editor-page/rb-undo-after-light.png`）: canvas `getImageData` 非白像素路径 **[296, 281, 260, 249, 236, 220, 202, 180]**——与原卡探针**逐值相同**（含基线 180、键入后 296）：7 字符恰需 7 次 Cmd+Z、单调回落、末值复原；单字符键入/撤销对照正常（202→180）。word-editor-core 历史栈无输入组合机制成立。

**结论**: **保留 P3**。修复方向维持（连续文本输入按时间窗/分块合并 undo 单元）。归族 watch-only → 台账维持。

### 8. [R2-2c-A5-152] designer-field 零渲染点 — 保留 P3

**独立取证**（`rb1-flow.mjs` → `rb-1-flow.json` designerFieldCounts）: 工作流 / 节点边摘要 / **钉钉审批流 / Action 编排（本轮补测原卡未列计数的两 tab）** `.nop-designer-field` 计数全部 **0**（选中态亦 0，原 w5-field 已证）；`grep '"type": "designer-field"' apps/playground/src/schemas/*.json` **0 命中**。控件不可达成立；源码静态契约（四变体/disabled/focus-visible）不在本轮重复取证范围，引用原卡。

**结论**: **保留 P3**。修复方向二选一维持（schema 消费样例或 playground fixture）。归族 watch-only → 台账维持；owner-doc 缺消费声明见 drift D-4。

### 9. [R2-2c-C1-121] stat-tile 数值窄面板溢出 clip — 保留 P3

**独立取证**（`rb6-dashboard-c1.mjs` → `rb-6-dashboard-c1.json`；截图 `rb/dashboard/rb-preview-w{1280,800}.png`）: preview 1280 `dashboard-panel-body overX 4`（`overflow:hidden`，dashboard-renderer.tsx L179）+ `stat-tile-root overX 12 / rectW 100`（值 "1284300|+12.5%"）；800 下 `stat-tile-root overX 56 / rectW 56`——与原卡（12/100、48/56）同向吻合（800 面板宽度随视口微差）。源码 `flux-renderers-data/src/stat-tile-renderer.tsx` L182-184 数值行 `text-3xl font-semibold tabular-nums` 无 `min-w-0`/`truncate`/档位收缩——根因与 R2-1a-C1-06 同族判定成立。另观察到 panel-body overY 21（纵向同源裁切），并入本条不另立。

**结论**: **保留 P3**。修复方向维持（容器宽度查询/ResizeObserver 切字号档，或 min-w-0+truncate+clamp）。归族 watch-only → 台账（R2-1a-C1-06 数值溢出族）维持。

### 10. [R2-2c-G2-128] 图节点 cursor default — **驳回**（"可拖"前提证伪；实为 pan 驻留）

**独立取证**（`rb3-graph-g2.mjs` → `rb-3-graph-g2.json`；截图 `rb/graph/rb-graph-afterdrag-light.png`）:

- hover cursor `default`（node/inner 同值，两个图卡同值）——**该半句属实**。
- **"节点实际可拖"证伪**：在节点中心按下并拖 +90/+50，双轨追踪显示节点 getBoundingClientRect 52,240→142,290 的**同时** `.react-flow__viewport` transform `translate(12.13px,81.64px)→(102.13px,131.64px)` 恰好同步 +90/+50；mouse.up 后 transform **驻留**。即：节点在画布坐标系内从未移动，动的是视口——这是 **pan 拖拽的平移驻留**（graph/design.md L26 明文采纳"拖拽平移"，`pannable` 开关）。原卡 `dragEnd {left:292→382, top:257→307} 证明可拖` 的 +90/+50 与本轮 pan 残留完全同构，属同一误读。
- 源码硬契约：`flux-renderers-graph/src/xyflow-canvas.tsx` L107 `nodesDraggable={false}`（L34-35 注释"只读硬契约：禁用节点拖拽"），且 renderer 无任何开启节点拖拽的 prop 通道——"任何可拖 graph 实例同险"不成立，不存在可拖实例。
- owner-doc 对照：graph/design.md L32（节点拖拽**不采纳**）、L42/L255（节点拖拽禁用、视口受控）——实现与文档**一致**。

**结论**: **驳回**。理由：① 事实前提（可拖）被双轨追踪证伪，cursor:default 对不可拖只读节点是恰当表现；② 修复方向（graph-node.tsx 加 cursor-grab）会暗示节点可拖，与 owner-doc 只读定位相悖，属于有害修复；③ 提请的"R2-1c G2 pass 改判"不成立——R2-1c 在 viewer 口径下的 pass 与实现/文档一致，冲突源于本卡探针把 pan 当节点拖拽。**改判建议**：若需保留可供性观察，应改写为"pannable 画布拖拽平移无 grab/grabbing 光标"（与 map G2-129 同 pan 语义、可并入光标族台账），但不得以节点 cursor-grab 形式落地；graph 卡 A6 "节点拖拽跟手、松手驻留" 同为 pan 误读，建议主 session 在台账回写时并记更正。本条不计入拖拽光标族的"节点可拖"成员。

## watch 先例复检裁定（R2-1b/c）

| 先例                                                    | 原状态                                  | 本轮独立取证                                                                                                                                                                                                                                                                                                                    | 裁定                                    |
| ------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| R2-1b-G1-01（画布节点/边选中无视觉标识，systemic）      | designer-canvas 卡 §4：维持             | 选中节点后 `selected=true`、inner border `rgb(225,231,239) 0px`、wrapper outline none、boxShadow none——零视觉差；机制锚 `designer-xyflow-node.tsx` L157-159 确认：选中描边仅在 `appearance.borderColorSelected` 显式声明时生效，workflow schema 未声明；对照 designer-node-card active 态三重标识齐全（缺陷限于 xyflow 节点层） | **维持 systemic**（机制锚实证补强）     |
| R2-1b-G2-01（palette 无 grab 光标/hover 微高亮，watch） | designer-page/designer-palette 卡：维持 | flow palette 项 hover computed cursor **"pointer"**（Button 基类），bg/border 与兄弟项同为透明（无微高亮）；R2-1b 原探针 cursor "auto"——两轮值不同但均非 grab、均无高亮，结论同向                                                                                                                                               | **维持 watch**                          |
| R2-1b-G6-01（重做可用性滞后一步，local）                | designer-page 卡 §4：**"复检：已消失"** | **反驳**。全链路验证（`rb1b-flow-fixup.mjs` → `rb-1b-flow-fixup.json`）：拖拽位移 304,404→359,450（实移）、undo 后 304,404（实退）、undo 按钮 enabled——单次 undo 后 `重做.disabled` 在 **100/250/500/1000ms 全部 true**；第二次 undo 后才翻 false。与 R2-1b 原始症状（滞后一步）逐点吻合                                        | **反转：未修复，建议恢复 open**（R2-4） |

**G6-01 反转说明**: 原卡"已消失"依据是 flow1 `g6 {redoDisabled:false}`。但 flow1 探针在 G6 段**之前**的 g7 清理段已点过一次撤销——若此前存在任一历史条目，到 G6 读取点时实际是"第二次 undo"，恰逢滞后一步 bug 翻红 redo，被误读为"已修复"。本轮洁净序列（无前置 undo、每步链路断言）复现原 bug。**改判建议**：designer-page 卡 §4 与 designer-canvas 卡 G6 行的"已消失/已修复"记录应撤销，R2-1b-G6-01 保持 open（local → R2-4）；closure 不得引用该两条记录。

## §drift owner-doc 复核小节（宿主/画布 16 控件）

盘点：16 控件中 **12 有 `docs/components/<type>/design.md`，4 缺**（dashboard、three-canvas、scada-canvas、scada-editor-canvas → 登记 owner-doc-missing，不新建）。逐条对照卡内正式发现后，确认 drift 4 条、无 drift 声明 7 控件。**不直接改 docs/components/**，以下为待主 session 裁定项。

| id        | 控件/文档                  | drift 内容                                                                                                                                                                                                                                                                                                                                                                                                                         | 证据                                                              | 建议                                                                                                                                      |
| --------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| D-1       | spreadsheet-page/design.md | **L71 明文契约被实现违反**："direct text entry that replaces the current cell content draft"——实测键入 'abc' 最终 draft 为 "bc"、键 '42' 入原值 '42' 格得 '2'，最终内容≠用户键入文本（A9-156，本轮根因修正后依然违约）                                                                                                                                                                                                             | 本轮 §3 探针；design.md L71                                       | 修复 A9-156 后补 L71 契约回归用例；doc 无需改（契约是对的，实现错了）                                                                     |
| D-2       | pivot-table/design.md      | **L32 主题触发机制失效且与所引先例矛盾**：doc 写"跟随 document root **class** 切换（MutationObserver，map 先例）"，实现 `pivot-renderer.tsx` L55-67 `attributeFilter:['class']` 只监听 class；而 playground dark 切换走 **`data-mode` 属性**（本复核方法学①），被引为"先例"的 map/design.md L31 恰恰写明"监听 data-theme/**data-mode 属性**翻转、无 `.dark` 类触发器"。该失配正是 R2-1c-B5-01"dark 两画布恒白块"维持多年的机制根源 | pivot-renderer.tsx L55-67；map/design.md L31；pivot 卡 §B5 维持项 | doc 与实现同修：attributeFilter 扩为 `['class','data-mode','data-theme']`（对齐 map），doc L32 更正触发描述；R2-1c-B5-01 修复排布引用本条 |
| D-3       | dashboard-editor/design.md | **L81-85 文档化保存链路未交付**：doc 记"Save → core.commit → host 下游同步（playground：localStorage 持久化 + scope 回推）"与"`diffDashboardDocument` 判定" dirty——A9-122 卡内证据显示 mount 即 dirty、保存零 localStorage 写入零反馈。doc 是设计意图、实现断裂（A9-122 归 review-a，本条仅记录 doc↔impl 失配，不重复取证）                                                                                                        | dashboard-editor/design.md L81-85；A9-122 卡内探针                | A9-122 修复时同步核对 doc L85 的 diff 判定描述是否需补"对象字段深比较"语义                                                                |
| D-4       | designer-field/design.md   | **doc 呈现为已可用组件但零消费、doc 无载体声明**：doc §1-3 以"承担 inspector 字段映射职责/已注册"口径描述，全 playground schema 0 消费点（A5-152），doc 未记载"当前无载体"状态                                                                                                                                                                                                                                                     | 本轮 §8 计数；designer-field/design.md 全文                       | doc 补"当前无 playground 载体消费"现状注记，或按 A5-152 修复方向补 fixture 后解除                                                         |
| D-5（软） | map/design.md              | 能力表（L23-35）未记载 drag-pan 交互：OL 默认 pan 实际激活（G2-129 的前提），doc 既未采纳亦未声明不采纳                                                                                                                                                                                                                                                                                                                            | map/design.md §2 表；G2-129 卡                                    | 低优先：能力表补一行 pan 归属裁定，顺带为 G2-129 的光标修复提供 doc 依据                                                                  |

无 drift 声明（正式发现与 owner-doc 不冲突）：graph（G2-128 驳回正是因为实现与 doc 一致）、designer-canvas（B2-151 边线 stroke 走 schema appearance，符合 §10 主题口径）、designer-node-card / designer-edge-row（选中态契约与实现吻合，cursor 无 doc 承诺）、designer-palette（hover/drag preview 归临时 UI 态，与 G2-01 族无冲突）、designer-page（C2-154/G8-155 属 fixture+测量时序，doc 无反向承诺）、word-editor-page（undo 粒度无 doc 承诺，L147 仅记句柄）、dashboard-editor G7-123（doc 无 inspector 同步契约，属 doc gap 非 drift）。

## 总裁决

**10 条正式发现：保留 9（A9-156、G7-123 两条根因实质修正）／驳回 1（G2-128，"可拖"前提被双轨追踪证伪）／降级 0**；watch 先例复检：G1-01 维持、G2-01 维持、**G6-01 反转（"已消失"不可复现，建议恢复 open）**；drift 确认 4 条（D-1/D-2 实质、D-3/D-4 记录性、D-5 软）+ owner-doc-missing 4 控件（dashboard、three-canvas、scada-canvas、scada-editor-canvas）。探针与截图产物：`_tmp/r2-2c-review/`（rb1–rb6 共 9 探针 / 9 JSON / 13 截图）。cards/、ledger.md、packages/、docs/components/、interactions.mjs 未做任何改动。
