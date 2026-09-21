# V11b 研究报告：Dashboard/Map/Graph 补齐与裁决

> 核查日期: 2026-09-21
> 基线: master @ 39a2f38ab（V6 已收口 full-green；工作区在途 V7/V8a/V8b/V10 研究报告，与本域零交集）
> 输入: 普查报告 §7、路线图 V11b、证据卡 `docs/audits/visual-quality/dashboard-map-graph.md`、owner docs `docs/components/{dashboard-editor,dashboard-filter,map,graph}/design.md`、`docs/backlog/audit-followups-2026-08-11-1929.md`（P2-16/P2-17/P2-19）、`docs/analysis/ui-review/{C1-complex-page-conceptions,C2-capability-gaps,D2-closure}.md`（G-K 链）、V1 研究报告（dark 触发器统一后的域内后果）
> 状态: 已独立核实通过（revised → 勘误回写后 pass）

## 0. 勘误与域定位

- **域内三包**：`packages/flux-renderers-dashboard`（运行态 `dashboard` + 编辑态 `dashboard-editor`，编辑内核 `@nop-chaos/editor-core`）、`packages/flux-renderers-map`（OpenLayers 10 封装，pin/region 双模式）、`packages/flux-renderers-graph`（`@xyflow/react` 只读图查看器）。owner docs 四份（dashboard-filter 为编排约定文档，与本次视觉交付无直接接触面，仅核对不修订）。
- **普查表述勘误（V11b-F3 收窄）**：普查 §7.5 称「graph 无数据驱动着色 schema 字段（G-K）」——**节点侧不成立**：`levelField`/`levelMap` 数据驱动着色通道已随 graph 首版落地（`flux-renderers-graph/src/schemas.ts:40-41` 字段、`graph-renderer.tsx:63-76` `resolveSemanticLevel`、`graph-node.tsx:31` 发布 `data-level`、`styles.css:42-52` 消费）。**边侧成立**：`GraphEdge`（schemas.ts:22-29）无任何着色/语义级字段。G-K 裁决按此收窄（见 A4）。
- **新发现（证据卡未登记）**：V1 将 dark 触发器统一为 `[data-mode]` 属性（`tailwind-preset/src/index.ts:142` `darkMode: ['selector', '[data-mode="dark"]']`，playground `theme.ts` `commit()` 只 set `data-theme`/`data-mode` 两个属性，全仓无 `.dark` 类切换点）；而 map 的主题重绘观察器监听的是**旧触发器** `class` 属性（`map-renderer.tsx:83-86` `attributeFilter: ['class']`）——触发器失配，V1 报告 §2 明示「包内 dark 适配是 V5–V11b 各域事务」未处理此处。本报告登记为 R1（map dark 切换无响应）。
- **canvasWidth 登记项核对**：followups P2-16（`audit-followups-2026-08-11-1929.md:22`）行号引用全部命中：`dashboard-renderer.tsx:80`、`editor-canvas.tsx:39-55,326`、design.md 坐标模型节（:29-49）。
- 三包 `styles.css` 均无 `[data-mode]`/`.dark` 规则（普查「五包零 dark 规则」口径成立）；dashboard/map/graph 的 DOM 外壳大量消费语义 token（`border-border`/`bg-card`/`hsl(var(--border))` 等），token 层 dark 四块对称（theme-tokens :122/:182/:242/:302），故 dark 缺口集中在**canvas 像素层（map）与断言层**，非 DOM 外壳。

## 1. Findings 逐项核实

### F1 dashboard `canvasWidth=1200` 解硬编码 + 画布无方向键移动（成立）

- **硬编码点**：`dashboard-renderer.tsx:80` `const canvasWidth = 1200;`——运行态唯一的画布宽度来源，无 schema 字段（`DashboardLayoutSchema` schemas.ts:31-45 只有 cols/rowHeight/gap/height/empty）、无测量、无表达式。面板几何经 `panelToPixels`（layout-math.ts:48-62，`cellWidth = (canvasWidth - (cols-1)*gap)/cols` :43-45）以该常量换算为**绝对像素** left/top/width/height（dashboard-renderer.tsx:122-128）。
- **消费链与失真机理**：画布容器本身是流式的（dashboard-renderer.tsx:120 `width: '100%', minWidth: 320`），面板却是按 1200px 换算的绝对定位——容器 >1200px 时右侧留白（面板不铺满），容器 <1200px 时面板溢出画布（canvas 无 overflow-hidden，:119 仅 `className="relative"`）。编辑态则完全不同：`useCanvasWidth`（editor-canvas.tsx:39-56）ResizeObserver 实测容器宽、`clientToGrid` :326 实测 rect.width——**同一份布局 JSON 在编辑态（按实测宽 W 布局）与运行态（按 1200 布局）渲染几何不一致**，正是 P2-16 所称「违反同构声明」（design.md:29-49「编辑/运行同构零转换、坐标模型单一来源」）。单测反向固化了硬编码：`dashboard-renderer.test.tsx:225-226` 断言 `cellWidth=(1200-5*12)/6=190` → 面板宽 594px。
- **单测回退路径**：jsdom 下 `getBoundingClientRect().width` 为 0，editor hook 保持初始 1200（editor-canvas.tsx:41,47）——运行态若复用同一测量模式，既有单测几何断言在回退路径下继续成立。
- **键盘导航现状（成立，与 owner doc 一致）**：编辑态画布体可聚焦（editor-canvas.tsx:203 `tabIndex={0}`）、面板 `role="button" tabIndex={0}`（:220-222），`handleKeyDown`（:142-168）只处理 Delete/Backspace、Ctrl/Cmd+Z/Shift+Z/Y、Ctrl/Cmd+D、Escape——**方向键零处理**（包内 grep `Arrow` 零命中）。owner doc design.md:88-90 的键盘契约同样只列这五组。方向键移动的全部下游纯函数已在（`dragPanel`/`clampPanelPosition`，layout-math.ts:142-157/:84-97）。运行态（只读展示）无任何键盘交互，与展示定位一致。

### F2 map 无 heatmap/轨迹/围栏通道（成立，且 owner doc 已显式 defer 过一轮）

- **渲染现状**：`OlApi` 模块面（map-ol-loader.ts:24-42）只装载 Map/View/Tile/Vector/XYZ/TileWMS/Cluster/GeoJSON/Feature/Point/Style/Fill/Stroke/Circle/Text 17 个模块——**无 Heatmap**；layer manager（map-layer-manager.ts:28-36）能力面只有 setBasemap/setRegionLayer/setPinLayer/setHighlight/setTheme；包内 grep `heatmap|trajectory|轨迹|fence|围栏` 零命中。schema 通道面 = `mapType: 'pin'|'region'` 双模式 + `visualMap`（min/max/colors/defaultColor，schemas.ts:14-21,54-81）。
- **着色通道本身已在**：数据驱动着色经 `buildColorScale`（map-color.ts:67-120，多段线性插值 + 外插 clamp + defaultColor）作用于 region 填充与 pin 填充（map-layer-manager.ts:117-133,194-205）；作者可用 `visualMap.colors` 覆盖缺省色阶（缺省 `map-color.ts:4` 五段 hex + :7 `#dddddd`）。
- **裁决背景**：map design.md 决策表 §2（:33）与 §8（:161）已显式裁定「热力图层（`ol/source/Heatmap`）、轨迹动画、测距：OL 能力存在，超出 BI 控件首版定位」记 follow-up。C1 构想页清单（C1-1~C1-10）无一消费热力/轨迹。即本次裁决是**对既有 defer 的复审**，不是新发现缺口；围栏甚至未进过 design.md 决策表。
- **附带核实**：followups P2-17「map loading 注释反转」命中——`schemas.ts:78-79` 注释写「外部 loading 状态（false 时渲染 loading 态）」，代码实际 `resolved.loading === true` → loading 态（map-renderer.tsx:100,242）。属注释/文档漂移，已登记候选池。

### F3 graph G-K 数据驱动着色（普查表述收窄后，残余为边通道 + 两处视觉债）

- **节点通道已在（勘误依据，见 §0）**：`levelField`（缺省 `level`）/`levelMap`（缺省 error/policy_violation→danger 等 5 键，schemas.ts:57-63）→ `resolveSemanticLevel` 严格白名单四语义级（graph-renderer.tsx:63-76）→ `data-level` + `nop-graph-level-*` 双发布（graph-node.tsx:31,34）→ CSS 边框变色（styles.css:42-52）。任意节点视觉可经 node region 模板覆盖（design.md §4.3，`region.render({ bindings: { node, ... } } })` graph-renderer.tsx:480-482）。
- **边通道缺失（G-K 真残余）**：`canvasEdges` 只映射 id/source/target/label/animated（graph-renderer.tsx:507-517），`GraphEdge` 无 level/color 字段（schemas.ts:22-29）；edge region 首版已显式不采纳（design.md §2 :33「避免首版双重渲染通道」）——即作者对边无任何着色逃生口。C1-7 审批中心（G-K 来源，C1-complex-page-conceptions.md:21,37）需要的是「节点状态着色（已覆盖）+ 当前节点高亮（选中态/`component:focusNode` 已覆盖）」，未点名边着色；G-K 在 D2 台账为「构想库存，后续 roadmap 立项」（D2-closure.md:72）。
- **视觉债两笔**：①`data-level='warning'/'success'` 边框为字面 HSL `hsl(32 95% 44% / 0.55)`/`hsl(142 71% 45% / 0.55)`（styles.css:47,:51），不随主题（danger 用 `--destructive` token :43，同族不同待遇）；该文件为一致性门禁已登记豁免（find-ui-consistency-gaps.mjs:118，`#100 [G5-R2-视角7-01]`「graph HSL 字面量族」）。②`nop-graph-level-${semanticLevel}` 类（graph-node.tsx:34）**无任何 CSS 规则消费**（全仓 grep 仅发射点与 dist 产物）——死类发射，design.md §10 marker 契约表也只登记 `data-level` 不含该类。另 `data-level='info'` 无规则属设计内（info=默认样式，design.md §4.2 :121-122）。

### F4 三域 e2e/dark 断言面（成立：一冒烟 + 一属性 spec，零计算样式、零 dark）

- **dashboard**：无专属 spec；仅 playground-entry-pages.spec.ts:514-518 标题冒烟。画布几何（canvasWidth 失真的两个失败模式）、编辑器键盘链、dark chrome 全部零断言。
- **map**：无专属 spec；仅同文件 :453-461 冒烟（map slot/ol-viewport/canvas attached/empty 态可见性）。主题映射（design.md §5）零断言——R1 的 dark 切换失配因此长期无守护。
- **graph**：专属 graph-demo.spec.ts 8 test，全部属性存在性断言（如 `data-level="danger"` :30-31、`data-selected` :34-35、`data-state="searching"` :47），零计算样式断言、零 light/dark 双态。
- **可复用资产（V0/V1 已落地，依赖列 V0、V1 均已 `done`）**：`tests/e2e/helpers/visual-assert.ts`（getComputedStyleValue :15 / expectComputedStyle :22 / expectCssVarResolves :37）、`helpers/canvas-pixel-probe.ts`（probeCanvasPixels :31 / expectCanvasPainted :109，map canvas 像素判据）、theme-switcher.spec.ts:40-54 light↔dark 计算样式翻转先例（`data-mode` 触发 + 令牌值断言）；spreadsheet-visual-tokens.spec.ts / three-canvas-visual.spec.ts 为同型先例。map design.md §5 所述「MutationObserver 监听 `.dark`」与 live 触发器（data-mode）已漂移，属 owner doc 勘误面。

## 2. 残余候选（逐项初裁）

| #   | 候选                                                                                                 | 证据                                                                                 | 初裁                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| R1  | map dark 切换无响应：观察器监听 `class`（旧触发器），V1 后触发器为 `data-mode`，`.dark` 全仓无切换点 | map-renderer.tsx:76-88（:83-86 attributeFilter）；theme.ts commit()；V1 报告 §2 边界 | **并入主交付**（改为监听 `data-mode` 属性/双属性 filter；:58 双重失实注释与 design.md §5 同步修正）                 |
| R2  | graph `data-level` warning/success 字面 HSL 不随主题                                                 | styles.css:47,:51；门禁豁免 mjs:118                                                  | **并入主交付**（映射 `hsl(var(--warning)/0.55)`/`hsl(var(--success)/0.55)`；同 PR 摘除该豁免条目，V0 快照差可归因） |
| R3  | graph 死类 `nop-graph-level-*` 发射无 CSS 消费                                                       | graph-node.tsx:34；design.md §10 契约表无此项                                        | **并入主交付**（删除发射或正式入 marker 契约，倾向删除）                                                            |
| R4  | dashboard 裸 `<button>` ×2（面板移除钮/palette 添加钮）                                              | editor-canvas.tsx:239、editor-palette.tsx:49；followups P2-19                        | **归 V12b 池**（已登记候选，不跨池摘樱桃；V11b 触碰同文件仅限交付面）                                               |
| R5  | map `loading` schema 注释反转                                                                        | schemas.ts:78-79 vs map-renderer.tsx:100,242；P2-17                                  | **并入主交付**（一行注释修正 + design.md 契约表勘误；回写 followups 台账核销）                                      |
| R6  | dashboard 8 个零消费导出（layout-math helpers 族）                                                   | index.ts:13-27；followups P2-17                                                      | **归 V12 池**（死代码治理非视觉交付；本报告未逐个复核消费面，不立项）                                               |
| R7  | map 缺省色阶/无值色为字面 hex（`#1e88e5` 五段 / `#dddddd`）                                          | map-color.ts:4,:7；map 域字面色豁免（mjs:98）                                        | watch-only（canvas 内色值、`visualMap.colors` 已可覆盖；瓦片底图恒为亮色是数据事实，非缺陷）                        |
| R8  | 运行态 dashboard 无键盘交互                                                                          | dashboard-renderer.tsx 全文无键盘处理                                                | adjudicated：只读展示面无编辑语义，键盘导航限编辑态（并入 A2 裁决）                                                 |
| R9  | graph `info` 语义级无视觉表达                                                                        | styles.css:42-52 仅 danger/warning/success                                           | adjudicated：设计内（design.md §4.2「info 默认」），非缺陷                                                          |
| R10 | 三域 demo 页（dashboard-demo/map-demo/graph-demo）作为断言宿主的 coverage 缺口                       | §1-F4                                                                                | 并入 A5 断言交付（不单列修复项）                                                                                    |

## 3. 裁决

| #   | 项                                        | 裁决                                                                                      | 要点                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | dashboard `canvasWidth=1200` 解硬编码     | **Fix（自适应测量，否决 schema 字段/% 方案）**                                            | 运行态复用编辑态测量模式：抽共享 hook（ResizeObserver 实测画布宽，回退 1200——jsdom/SSR/首帧路径，与 editor-canvas.tsx:39-56 同构），`panelToPixels` 契约与 `DashboardLayoutSchema` **零变更**（网格坐标是分辨率无关单位，同构原则要求按实际容器宽换算；**否决**新增 `canvasWidth` schema 字段——默认仍错且把失真转嫁给作者；**否决** % 输出——破坏 panelToPixels 单一来源，编辑态指针吸附数学需 px）。首帧回退→实测的一次重排可接受（面板绝对定位，无级联布局）。dashboard-renderer.test.tsx:225-226 几何断言在回退路径下保持有效，不弱化。      |
| A2  | 画布键盘导航                              | **Fix（最小）+ 运行态 adjudicated**                                                       | 编辑态选中面板 Arrow 四键移动 1 格：复用 `dragPanel`（clamp 内建），`core.update` 单 undo 步，接入 `handleKeyDown`（editor-canvas.tsx:142-168）新分支；面板已可聚焦，属既有键盘契约（design.md:88-90）的最小补齐，需同步 design.md 契约行。**否决/defer**：Shift+Arrow resize、Tab 面板间循环焦点、运行态导航（R8）。                                                                                                                                                                                                                          |
| A3  | map heatmap/轨迹/围栏 schema 通道         | **Deferred But Adjudicated**                                                              | 维持 design.md §2/:33、§8/:161 首版裁定并升格为显式裁决记录：引入面 = OlApi 扩展（map-ol-loader.ts:24-42 增 Heatmap 模块）+ layer manager 新层类型 + schema 通道，属**能力立项而非视觉修复**；无真实消费页（C1 构想清单零命中），BI 首版定位外。再触发条件：真实热力/轨迹/围栏消费页或 mission 立项；届时连同围栏语义一并进能力 roadmap，V11b 不预留半成品接口。                                                                                                                                                                               |
| A4  | graph G-K 数据驱动着色                    | **勘误收窄；节点侧 adjudicated（已在），边侧 Deferred But Adjudicated；落地部分 = R2/R3** | 节点数据驱动着色通道已存在且够用（levelMap + node region 逃生口，见 §1-F3）——「落地新节点通道」否决（重复建设）。边着色通道（GraphEdge 无字段）**defer**：无消费页（C1-7 为构想库存，D2 :72 维持）、edge region 已显式否决在先（design.md §2 :33）、固定四语义级词汇贴合 trace 主场景；再触发条件 = C1-7 审批中心或真实 trace 页需要边状态语义。V11b 对 graph 的实际交付收窄为视觉债 R2（token 化 + 豁免摘除）与 R3（死类清理）。owner doc design.md §4.2/§10 增补「边无着色通道为显式 defer」注记。                                           |
| A5  | 三域 e2e 视觉/dark 断面（证据卡 V11b-F4） | **Fix**                                                                                   | ①新建 dashboard 专属 spec：双视口几何断言（同一布局两视口下面板 px 宽随容器缩放、网格比例不变——A1 的程序化判据）+ 编辑态 Arrow 键移动断言（A2）+ light/dark 面板 chrome 计算样式；②graph-demo 扩展：`data-level` 三态边框色计算样式 light/dark 双态（复用 getComputedStyleValue + theme-switcher 触发先例）；③map：dark 切换后重绘断言（R1 判据——data-mode 翻转后 manager.setTheme 生效，属性态断言 + 像素探测按需，canvas-pixel-probe 在库）。全部程序化判据，遵守 2026-08-28 快照政策。dashboard-demo 冒烟与 graph-demo 既有 8 test 零回归。 |

## 4. 边界

- **不做**：heatmap/轨迹/围栏通道（A3）、graph 边着色通道与节点新通道（A4）、Shift+Arrow resize 与运行态键盘导航（A2）、`canvasWidth` schema 字段（A1 否决项）、dashboard 死导出（R6）、裸 button（R4）、错误消息双轨与豁免治理主体（V12a/V12b）、面板内容配置器与 nop-app 持久化协议（dashboard design.md §7 Non-Goal）、G-H 移动族扩容（普查 §10）。
- **硬约束**：`DashboardLayoutSchema`/`MapSchema`/`GraphSchema` 零字段变更——不触「renderer 定义字段」保护区（AGENTS.md），无需人工门禁；`panelToPixels` 单一来源不拆分（A1 否决 % 方案的依据）；map 无 remount 契约 DD2（R1 只换观察器与重绘触发，不动实例生命周期）；INV-1~5 契约不变（R1 为 renderer-local state，INV-4 面内）；R2 摘除门禁豁免条目须与修复同 PR（豁免基数下降可归因，对接 V12a 口径）。
- **owner docs 修订面**：map design.md §5（触发器勘误 + dark 契约）与 §4.1 loading 注释同步（R1/R5）、§8 follow-up 行升格裁决注记（A3）；graph design.md §4.2/§10（边 defer 注记 + 死类处置，A4/R3）+ §4.2 语义色 token 表述与 live 对齐；dashboard-editor design.md :88-90 键盘契约补方向键（A2）+ §2.2 同构声明补「运行态按实测宽换算」（A1）；dashboard-filter design.md 不修订。
- **e2e 红线**：graph-demo 8 test、playground-entry-pages 冒烟、`dashboard-renderer.test.tsx`/`layout-math.test.ts`/`map-renderer.test.tsx`/`graph-renderer.test.tsx` 单测零回归；`pnpm check` 零新增红，豁免命中数变化仅限 R2 摘除项。

## 5. 验证方式

1. 单测：A1 共享测量 hook 回退路径（width=0 → 1200）；A2 键盘移动经 dragPanel 的 clamp/undo 步数断言；R3 死类删除后 graph-node 断言更新；map ol-fake 下 setTheme 触发路径（R1）。
2. e2e（A5）：dashboard 双视口几何 + Arrow 键 + dark chrome；graph `data-level` 计算样式双态；map dark 切换响应——全部复用 V0 helper（visual-assert/canvas-pixel-probe）与 theme-switcher 触发先例，判据程序化。
3. `pnpm check`：R2 修复 + 豁免摘除后 `check:audit-ui-consistency-gaps` 相对 V0 快照（`exemption-baseline-v0.json`）diff 可归因；其余链路零新增红。
4. `pnpm typecheck && pnpm build && pnpm lint` 全绿后按 AGENTS.md 记录 daily log。

## 6. 独立核实记录

- Reviewer / Agent: 独立核实审查员（fresh sub-agent session，2026-09-21，只读 live 验证）
- Verdict: `revised` → 勘误回写后 **pass**。F1-F4、R1-R10、A1-A5 实质判断全部成立（含 R1 map 触发器失配的 V1 边界确认、G-K 勘误收窄、canvasWidth 反向固化断言）。必改勘误已回写：E1 graph-demo.spec 计数 9 → 8（两处）。
- 已处理: 全部核实确认项（map design.md §2 :29 行失实表述纳入 §4 修订面一并覆盖；map-renderer.test 旧触发器夹具在 R1 修复时同步）

（待独立核实审查员回写）
