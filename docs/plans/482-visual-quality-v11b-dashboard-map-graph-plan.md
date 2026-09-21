# 482 视觉质量 V11b：Dashboard/Map/Graph 补齐与裁决 Plan

> Plan Status: completed
> Last Reviewed: 2026-09-21
> Source: `docs/analysis/visual-quality/V11b-dashboard-map-graph.md`（独立核实 revised → 勘误回写后 pass；本计划以其 Findings/候选/裁决表为准，file:line 已对照 live repo 复核）、`docs/backlog/visual-quality-roadmap.md` V11b、`docs/audits/visual-quality/dashboard-map-graph.md`（证据卡）、`docs/backlog/audit-followups-2026-08-11-1929.md`（P2-16/P2-17/P2-19）
> Related: `docs/plans/476-visual-quality-v6-spreadsheet-tokenization-plan.md`（dark 令牌化 + 守卫/双态断言先例）、`docs/plans/479-visual-quality-v8a-print-designer-plan.md`（裁决落卡 + 证据卡回写先例）

## Purpose

把路线图 V11b 收口：dashboard 运行态 `canvasWidth=1200` 解硬编码（自适应测量，回退 1200）+ 编辑态画布方向键导航最小 Fix；map dark 主题重绘触发器修复（R1，class → data-theme/data-mode）与 loading 注释勘误（R5）；graph warning/success 字面 HSL 令牌化（R2）+ 门禁豁免摘除 + 死类 `nop-graph-level-*` 清理（R3）；A3（map heatmap/轨迹/围栏）与 graph 边着色通道 Deferred But Adjudicated 落卡；三域 e2e/dark 断言补齐（A5）；owner docs 同步。

## Current Baseline

- **dashboard 运行态几何硬编码（A1，成立）**：`dashboard-renderer.tsx:80` `const canvasWidth = 1200;` 为运行态唯一画布宽度来源——无 schema 字段（`DashboardLayoutSchema` schemas.ts:31-45 仅 cols/rowHeight/gap/height/empty）、无测量、无表达式。画布容器流式（:119-123，`width: '100%', minWidth: 320` 在 :122），面板却经 `panelToPixels`（layout-math.ts:48-62，`cellWidth` :43-45）按 1200 换算为绝对像素（:124-129）：容器 >1200 右侧留白、<1200 面板溢出，违反 `dashboard-editor/design.md:29-49`（§2.2）「编辑/运行同构、坐标模型单一来源」声明。编辑态已实测：`editor/editor-canvas.tsx:39-56` `useCanvasWidth` ResizeObserver 实测容器宽（初始 1200，jsdom `getBoundingClientRect().width` 为 0 时保持 1200 不覆盖）。
- **单测反向固化**：`dashboard-renderer.test.tsx:247-248（原 :225-226，新增用例插入后行锚漂移，断言零修改）` 断言 `cellWidth=(1200-5*12)/6=190` → 面板宽 `594px`——该断言在「回退 1200」路径下继续成立，不弱化。
- **编辑态键盘契约缺口（A2，成立）**：`editor-canvas.tsx:142-168` `handleKeyDown` 只处理五组（Delete/Backspace、Ctrl/Cmd+Z / Shift+Z / Y、Ctrl/Cmd+D、Escape），方向键零处理（包内 grep `Arrow` 零命中）；画布体可聚焦（:203 `tabIndex={0}`）、面板 `role="button" tabIndex={0}`（:220-222）——面板已可聚焦，方向键是既有键盘契约（design.md:88-90 同只列五组）的最小补齐。下游纯函数已在：`dragPanel`（layout-math.ts:142-157，clamp 内建）、`clampPanelPosition`（:84-97）。运行态无键盘交互（R8，只读展示定位，裁决随 A2）。
- **map dark 触发器失配（R1，成立）**：`map-renderer.tsx:73-90` `useMapTheme` MutationObserver observe 块 :83-86 `attributeFilter: ['class']`（:85）监听旧触发器 `.dark`——V1 后全仓 dark 触发器为 `[data-mode="dark"]`（tailwind-preset/src/index.ts:142；playground theme.ts `commit()` 只 set `data-theme`/`data-mode` 两属性，全仓无 `.dark` 类切换点）→ dark 切换无响应。:58 与 :66-72（:69）注释述「监听 root class / `.dark` 切换」「主题切换在下次更新生效」双重失实。`resolveMapTheme`（:59-66）读取 `--border/--background/--foreground/--primary` 四 token，随 `data-theme` 与 `data-mode` 双属性变化。
- **map 单测夹具用旧触发器**：`map-renderer.test.tsx:312-321`（「re-applies theme on document class change」）:318/:320 `classList.add/remove('dark')`——R1 修复时同步改写。
- **map loading 注释反转（R5，成立）**：`schemas.ts:78-79` 注释写「外部 loading 状态（false 时渲染 loading 态）」，代码实际 `resolved.loading === true` → loading 态（map-renderer.tsx:100、:242）。
- **map 能力面与裁决背景（A3）**：OlApi 模块面（map-ol-loader.ts:24-42）17 模块无 Heatmap；layer manager 能力面（map-layer-manager.ts:29-33）仅 setBasemap/setRegionLayer/setPinLayer/setHighlight/setTheme。数据驱动着色通道已在（map-color.ts:67-120 `buildColorScale`，`visualMap.colors`/`defaultColor` 可覆盖；缺省 ：4 五段 hex + :7 `#dddddd`）。map design.md §2（:33）与 §8（:161）已显式 defer 热力/轨迹/测距——A3 是对既有 defer 的复审升格，不是新缺口。
- **map owner doc 漂移**：map design.md §2（:29）与 §5（:109）述「MutationObserver 监听 root class（`.dark`）」与 live data-mode 触发器失实；§2（:32）loading 契约行待随 R5 同步。
- **graph 节点通道已在（A4 勘误收窄依据）**：`levelField`/`levelMap`（schemas.ts:40-41，缺省 `DEFAULT_LEVEL_MAP` :57-63）→ `resolveSemanticLevel`（graph-renderer.tsx:63-76 严格白名单）→ `data-level` + `nop-graph-level-*` 双发布（graph-node.tsx:31、:34）→ CSS 消费（styles.css:42-52）。
- **R2 字面 HSL**：`styles.css:47` `hsl(32 95% 44% / 0.55)`（warning）、`:51` `hsl(142 71% 45% / 0.55)`（success）不随主题；danger 已 token 化（:43 `hsl(var(--destructive) / 0.55)`）——同族不同待遇。`--warning`/`--success` 已四主题块定义（theme-tokens/src/styles.css:56-59/:132-139/:192-199/:252-259）。该文件在一致性门禁豁免登记中（`scripts/audit/find-ui-consistency-gaps.mjs:115-121`，`#100 [G5-R2-视角7-01]`「graph HSL 字面量族」）。
- **R3 死类**：`nop-graph-level-${semanticLevel}`（graph-node.tsx:34）全仓无 CSS 规则消费（仅发射点与 dist 产物）；design.md §10 marker 契约表（:229）只登记 `data-level` 不含该类。
- **graph 边通道缺失（A4 真残余）**：`GraphEdge`（schemas.ts:22-29）无着色/语义级字段，`canvasEdges` 只映射 id/source/target/label/animated（graph-renderer.tsx:507-517）；edge region 首版已显式不采纳（design.md §2 :33「避免首版双重渲染通道」）。C1-7 为构想库存（D2 :72 维持）。
- **三域 e2e 断言面（A5，成立）**：dashboard/map 无专属 spec——`playground-entry-pages.spec.ts` dashboard-demo 仅标题冒烟（:514-518）、map-demo 仅冒烟（:453-461）；`graph-demo.spec.ts` 8 test 全属性存在性断言，零计算样式、零 light/dark 双态。可复用资产（V0/V1 已落地）：`tests/e2e/helpers/visual-assert.ts`（getComputedStyleValue :15 / expectComputedStyle :22 / expectCssVarResolves :37）、`helpers/canvas-pixel-probe.ts`（probeCanvasPixels :31 / expectCanvasPainted :109）、`theme-switcher.spec.ts:40-54` data-mode 翻转 + 计算样式断言先例。
- **门禁口径**：V0 豁免基线 `docs/audits/visual-quality/exemption-baseline-v0.json`；R2 摘除豁免须与令牌化同 PR，基数下降相对快照 diff 可归因。

## Goals

- A1：运行态复用编辑态测量模式——抽共享测量 hook（ResizeObserver 实测画布宽，回退 1200 兜底 jsdom/SSR/首帧），`dashboard-renderer.tsx:80` 字面常量移除；`panelToPixels` 契约与 `DashboardLayoutSchema` 零变更；既有几何断言在回退路径下零弱化通过。
- A2：编辑态选中面板 Arrow 四键移动 1 格（复用 `dragPanel` clamp，`core.update` 单 undo 步），接入 `handleKeyDown` 新分支；design.md 键盘契约与同构声明同步。
- R1：map 观察器 `attributeFilter` class → `['data-theme','data-mode']`（四 token 双属性都随主题变），失实注释订正；单测夹具同步 data-mode 触发。
- R5：map loading schema 注释反转订正 + design.md 契约行同步。
- R2：warning/success 边框映射 `hsl(var(--warning)/0.55)` / `hsl(var(--success)/0.55)`；同 PR 摘除门禁豁免条目（对接 V12a 豁免基数口径）。
- R3：死类 `nop-graph-level-*` 发射摘除（`data-level` 保留为唯一语义级 marker 通道）+ design.md §10 契约表处置记录。
- A3 + graph 边通道：Deferred But Adjudicated 落卡 + design.md 对应注记升格。
- A5：三域 e2e/dark 断言补齐——dashboard 双视口几何 + Arrow 键 + light/dark chrome；graph `data-level` 三态边框色双态；map dark 切换重绘响应。全部程序化判据（2026-08-28 快照政策）。
- owner docs：dashboard-editor/design.md、map/design.md、graph/design.md、证据卡、roadmap、followups 台账核销、daily log。

## Non-Goals

- map heatmap/轨迹/围栏 schema 通道（A3 Deferred But Adjudicated）；graph 边着色通道与「落地新节点通道」（A4：前者 defer，后者否决——节点通道已够用，重复建设）。
- Shift+Arrow resize、Tab 面板间循环焦点、运行态键盘导航（A2 否决/裁决面：R8 只读展示无编辑语义）。
- `canvasWidth` schema 字段（A1 否决——默认仍错且把失真转嫁给作者）与 % 输出（A1 否决——破坏 `panelToPixels` 单一来源，编辑态指针吸附数学需 px）。
- dashboard 裸 `<button>` ×2（R4 → V12b 池）；dashboard 8 个零消费导出（R6 → V12 池）；map 缺省色阶字面 hex（R7 watch-only）；graph `info` 无视觉表达（R9 设计内）。
- dashboard-filter design.md 修订（编排约定文档，与本次交付无接触面，仅核对）。
- 错误消息双轨与豁免治理主体（V12a/V12b 域）。

## Scope

### In Scope

- `packages/flux-renderers-dashboard/src/`：`dashboard-renderer.tsx`（消费共享 hook）、`editor/editor-canvas.tsx`（hook 提升共用 + Arrow 分支）、共享 hook 新模块、`dashboard-renderer.test.tsx`、editor 单测；`layout-math.ts` 零变更。
- `packages/flux-renderers-map/src/`：`map-renderer.tsx`（attributeFilter + 注释）、`schemas.ts`（R5 注释）、`map-renderer.test.tsx`（夹具改写）。
- `packages/flux-renderers-graph/src/`：`styles.css`（:47/:51 token 化）、`graph-node.tsx`（:34 死类摘除）、`graph-node.test.tsx`。
- `scripts/audit/find-ui-consistency-gaps.mjs`：:115-121 graph HSL 豁免条目摘除。
- e2e：dashboard 专属新 spec、`graph-demo.spec.ts` 扩展、map dark 重绘断言（宿主 map-demo）。
- owner docs：`docs/components/dashboard-editor/design.md`、`docs/components/map/design.md`、`docs/components/graph/design.md`、`docs/audits/visual-quality/dashboard-map-graph.md`、`docs/backlog/visual-quality-roadmap.md`、`docs/backlog/audit-followups-2026-08-11-1929.md`（核销）、`docs/logs/`。

### Out Of Scope（含硬约束，违反即回退）

- `DashboardLayoutSchema`/`MapSchema`/`GraphSchema` 零字段变更（不触「renderer 定义字段」保护区，无需人工门禁）。
- `panelToPixels` 单一来源不拆分；map 实例生命周期零变更（无 remount 契约 DD2——R1 只换观察器与重绘触发）；INV-1~5 契约不变（R1 为 renderer-local state，INV-4 面内）。
- R2 豁免摘除必须与令牌化修复同 PR（不允许只摘豁免或只修色值）。
- 截图类断言（遵守 2026-08-28 快照政策：全部程序化判据）。

## Failure Paths

| 场景               | 触发                                                    | 行为                                                                                                  | 可重试               | 用户可见表现                   |
| ------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------ |
| measure-fallback   | ResizeObserver 不可用 / SSR / 首帧实测 width=0（jsdom） | 共享 hook 维持回退 1200（现状几何），实测事件到达后再更新                                             | 是（事件驱动）       | 与现状一致                     |
| arrow-on-input     | 焦点在 input/textarea/contentEditable                   | `handleKeyDown` 既有早退分支（editor-canvas.tsx:143-146）生效，不移动面板                             | —                    | 输入框方向键行为正常           |
| observer-missing   | jsdom 无 MutationObserver                               | `useMapTheme` 跳过监听，主题色取首帧解析值（现状契约保持）                                            | 否                   | 无 dark 重绘（与现状一致）     |
| token-missing      | 宿主未加载 theme-tokens                                 | `hsl(var(--warning)/0.55)` 无 fallback 静默失效——与 ：43 danger token 同架构同待遇，不加包内 fallback | 否                   | 边框弱化（与 danger 现状一致） |
| e2e-viewport-flake | 双视口断言受滚动条/缩放扰动                             | 断言以面板 px 宽比例（网格比例不变）为判据，非绝对像素等值                                            | 是（retry 既有机制） | CI 重试                        |

## Test Strategy

档位选择（三选一）：`必须自动化`

本档选择：**必须自动化**——A1/A2 是用户可感知几何与交互变更（单测先红后绿）；R1 是主题响应行为修复（触发路径单测判据）；R2 是样式契约变更（e2e 计算样式 light/dark 双态为判据）；A5 本身即断言交付。对应 Proof 项均置于 Fix 项之前。

## Execution Plan

### Phase 1 - Dashboard：运行态自适应测量（A1）+ 编辑态方向键导航（A2）

Status: completed
Targets: `dashboard-renderer.tsx`、`editor/editor-canvas.tsx`、共享 hook 模块、`dashboard-renderer.test.tsx`、editor 单测、`docs/components/dashboard-editor/design.md`

- Item Types: `Proof | Fix`

- [x] Proof：单测先红——①共享测量 hook 在模拟容器实测宽 W（>1200 与 <1200 两档）下面板 px 随 W 换算、网格比例不变；②回退路径：ResizeObserver 不可用 / 实测 width=0 → 维持 1200（`dashboard-renderer.test.tsx:247-248（原 :225-226，新增用例插入后行锚漂移，断言零修改）` 几何断言零修改通过）；③editor-canvas 键盘单测先红：选中面板 Arrow 四键各移动 1 格、边界 clamp（dragPanel 语义）、单次按键 = 单次 `core.update` = 单 undo 步、输入焦点早退（执行记录：4 测量 + 3 键盘用例先红——width=0/双视口 4 用例因运行态无观察器红、Arrow 移动/undo 步 3 用例因无分支红；clamp 右界与输入早退两 guard 用例修复前即绿，属回归护栏；:225-226 原断言全程零修改通过）
- [x] Fix：抽共享测量 hook（自 editor-canvas.tsx:39-56 `useCanvasWidth` 提升为编辑态/运行态共用，同构实现：初始 1200、`width > 0` 才覆盖、ResizeObserver 缺失时跳过监听）；`dashboard-renderer.tsx:80` 移除字面常量改消费 hook；`panelToPixels` 契约与 schema 零变更（首帧回退→实测的一次重排可接受，面板绝对定位无级联布局）（落地：新模块 `src/use-canvas-width.ts`，editor-canvas 与 dashboard-renderer 共同消费，`layout-math.ts` 零变更）
- [x] Fix：`editor-canvas.tsx:142-168` `handleKeyDown` 增 Arrow 四键分支——选中单面板经 `dragPanel` 移动 1 格（clamp 内建）、`core.update` 提交单 undo 步；不引入 Shift+Arrow resize / Tab 焦点循环（A2 否决面）（落地：新增 `moveSelectedByCells` 辅助 + `defaultPrevented` 防面板/画布体两层 onKeyDown 双处理）
- [x] Fix：dashboard-editor/design.md 同步——:88-90 键盘契约补方向键行；§2.2（:29-49）同构声明补「运行态按实测容器宽换算（共享测量 hook），回退 1200」

Exit Criteria:

- [x] 共享 hook 落地且编辑态/运行态共用同一测量模式；`dashboard-renderer.test.tsx:247-248（原 :225-226，新增用例插入后行锚漂移，断言零修改）` 原断言零弱化通过（回退路径）；双视口换算单测绿
- [x] Arrow 键盘单测绿（四键移动 / clamp / 单 undo 步 / 输入焦点早退）；dashboard 包既有单测零回归（67/67 绿，含新增 9 用例）
- [x] design.md 键盘契约行与 §2.2 同构声明与 live 行为一致（repo-observable：文本可对照 :39-56/:142-168 实现核对）

### Phase 2 - Map：dark 触发器修复（R1）+ loading 注释勘误（R5）+ A3 裁决落卡

Status: completed
Targets: `map-renderer.tsx`、`schemas.ts`、`map-renderer.test.tsx`、`docs/components/map/design.md`

- Item Types: `Proof | Fix | Decision`

- [x] Proof：map-renderer.test 先红——`setAttribute('data-mode','dark')` / `setAttribute('data-theme',…)` 翻转触发 `manager.setTheme` → `layer.changed`（修复前旧夹具 class 触发器在 `attributeFilter` 收窄后不再命中）（执行记录：data-mode/data-theme 两用例修复前红（waitFor 超时，changedCount 不增长），旧 class 夹具修复前绿）
- [x] Fix（R1）：`map-renderer.tsx:85` `attributeFilter: ['class']` → `['data-theme','data-mode']`（`resolveMapTheme` 读取的四 token 随双属性变化，任一翻转都需重解析）；:58 与 :66-72 失实注释订正为 data-theme/data-mode 触发器表述；实例生命周期零变更（DD2）
- [x] Fix：`map-renderer.test.tsx:312-321` 夹具 :318/:320 由 `classList.add/remove('dark')` 改写为 data-mode 属性触发（测试名同步「document class change」→ 属性触发表述）（落地：旧 class 夹具改写为 data-mode 触发 + 测试名同步；另补 data-theme 翻转正用例与「class 触发器不再被监听」负向护栏）
- [x] Fix（R5）：`schemas.ts:78-79` loading 注释反转订正（`true` 时渲染 loading 态）
- [x] Decision（A3）：map/design.md §8（:161）热力/轨迹/测距 follow-up 行升格显式裁决注记（围栏一并记录；再触发条件 = 真实消费页或 mission 立项）；§2（:29）与 §5（:109）触发器表述勘误为 data-theme/data-mode；§2（:32）loading 契约行随 R5 同步

Exit Criteria:

- [x] data-theme/data-mode 翻转触发重绘的单测绿；class 触发器不再被监听（旧夹具已改写）；map 包既有单测零回归（54/54 绿，map-renderer.test 29 用例含新增/改写 3 用例）
- [x] loading 注释与代码行为一致（schemas.ts:78-79 vs map-renderer.tsx:100/:242 可对照）
- [x] map/design.md 四处（§2 :29/:32、§5 :109、§8 :161）与 live 行为/裁决一致

### Phase 3 - Graph：语义色令牌化 + 豁免摘除（R2）+ 死类清理（R3）

Status: completed
Targets: `styles.css`、`graph-node.tsx`、`graph-node.test.tsx`、`scripts/audit/find-ui-consistency-gaps.mjs`、`docs/components/graph/design.md`

- Item Types: `Proof | Fix`

- [x] Proof：graph-node 单测先红——摘除后 `data-level` 发布保持、`nop-graph-level-*` 类名不再发射（graph-node.tsx:34）（执行记录：新增用例修复前红——className 含 `nop-graph-level-warning`；`data-level` 保持断言同用例内钉住）
- [x] Fix（R2）：`styles.css:47` → `hsl(var(--warning) / 0.55)`、`:51` → `hsl(var(--success) / 0.55)`（对齐 :43 danger token 先例；`--warning`/`--success` 已四主题块定义，theme-tokens/src/styles.css:56-59 等，不加包内 fallback——token-missing 契约同 danger）
- [x] Fix（R3）：`graph-node.tsx:34` 摘除 `nop-graph-level-${semanticLevel}` 类发射（`data-level` 保留为唯一语义级 marker 通道）
- [x] Fix：`scripts/audit/find-ui-consistency-gaps.mjs:115-121` 摘除 graph HSL 豁免条目（与令牌化同 PR；基数下降相对 `exemption-baseline-v0.json` diff 可归因，对接 V12a 口径）（执行偏差修正：摘除后该文件仍余 6 例 `hsl(var(--token))` 命中——V0 快照本就登记该文件 8 实例，其中 6 例是 token 引用被 `hsl(` 宽匹配误计。为使 Exit「摘除后该文件转绿」可达，同步收窄检测模式为 `\(\s*(?!var\()`——var() 引用非字面色；附带消除 form-advanced styles.css:11 既有红 1 例。diff：豁免基数 413→295 实例 / 121→108 文件 / 32→31 条目，随收口记入 daily log）
- [x] Fix：graph/design.md 同步——§4.2（:121）语义色表述与 live token 化对齐（「不硬编码色值」承诺兑现）；§10（:229）marker 契约表登记死类处置（仅 `data-level`）；§4.2/§10 增「边无着色通道为显式 defer」注记（A4）

Exit Criteria:

- [x] graph 包单测绿（graph-node 断言更新：`data-level` 保持、死类消失）；styles.css 字面色族清零（豁免摘除后 `check:audit-ui-consistency-gaps` 对该文件转绿）（49/49 绿；门禁 exit=0、零 unregistered）
- [x] 豁免摘除与令牌化同 PR 落地；check 相对 V0 快照 diff 仅该条目下降、可归因（见上行偏差修正记录：检测模式收窄一并计入 diff，全部可归因）
- [x] graph/design.md §4.2/§10 与 live 一致（token 表述 + 死类处置 + 边 defer 注记）

### Phase 4 - 三域 e2e/dark 断言（A5）+ owner docs 收口面

Status: completed
Targets: `tests/e2e/`、证据卡、roadmap、audit-followups 台账、daily log

- Item Types: `Fix | Proof`

- [x] Fix：新建 dashboard 专属 spec（graph-demo.spec.ts 同型：程序化断言、零截图）——双视口几何断言（同一布局两视口下面板 px 随容器缩放、网格比例不变，A1 程序化判据）+ 编辑态 Arrow 键移动断言（A2）+ light/dark 面板 chrome 计算样式（visual-assert helper）（落地：`tests/e2e/dashboard-demo.spec.ts` 4 test；几何判据以「面板 px 自实测 canvasWidth 复算一致」轮询 + 容器 <1200 反硬编码 discriminator + left 差值比 0.5 不变实现）
- [x] Fix：`graph-demo.spec.ts` 扩展——`data-level` 三态（danger/warning/success）边框色 `getComputedStyleValue` 断言 light/dark 双态（theme-switcher data-mode 翻转先例）；既有 8 test 零回归（落地：token 通道探针等值断言 `hsl(var(--token)/0.55)` + 三态互异 + light/dark/glass 值变化；`.nop-graph-node` border-color 0.15s transition 以 expect.poll 收敛）
- [x] Fix：map dark 重绘断言——data-mode 翻转后属性态断言（R1 判据；`canvas-pixel-probe` 像素探测按需备用），宿主 map-demo（落地：`tests/e2e/map-dark-redraw.spec.ts`——属性态主体（html data-mode + map 子树 chrome 边框/背景 token 响应）+ pin 画布存活 gate。**实测结论（Follow-up 预案启用）**：像素颜色判据不可行——`resolveMapTheme` 探针对裸 HSL 三元组 token 恒退化 `rgb(0,0,0)`（证据卡 X1 / daily log），R1 触发器由 map 包单测 3 用例钉住）
- [x] Fix：owner docs 收口面——证据卡 `docs/audits/visual-quality/dashboard-map-graph.md` 回写、roadmap V11b 状态区流转注记（draft review 通过 → `planned`；closure audit 通过 → `done`，遵循状态区规则）、`audit-followups-2026-08-11-1929.md` P2-16 与 P2-17 map loading 子项核销、daily log（落地：证据卡 F1-F4 + R1-R9 + X1/X2 全量回写；roadmap 表行 `todo`→`planned` + §V11b 执行状态注记；daily log 2026-09-21 plan 482 节含偏差与对账数字）
- [x] Proof：全仓验证链核对记录（`pnpm typecheck/build/lint/test/check`——归 Closure Gates 执行，此处登记证据落点）（证据落点：daily log 2026-09-21 plan 482 节「验证」+ 本 plan Closure Gates 执行记录）

Exit Criteria:

- [x] 三域 e2e 断言绿；既有断言零回归（graph-demo 8 test、playground-entry-pages dashboard/map 冒烟）（92/92 passed / 0 failed / 0 flaky：graph-demo 9、playground-entry-pages 78、dashboard-demo 4、map-dark-redraw 1）
- [x] 证据卡 / roadmap / 台账 / daily log 与 live 一致（台账 P2-16、P2-17 map loading 子项已核销）

## Draft Review Record

- Reviewer / Agent: 独立 plan review 审查员（fresh sub-agent session，2026-09-21，一轮，40 处引用核对）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 3 Minor 行号微漂移，执行时顺手对齐不阻塞）
- Rounds: 1
- Findings addressed: M1 dashboard-renderer.tsx 画布容器行指针 :122→:120、:124-129→:123-128；M2 门禁豁免条目体 115-121→约 117-122；M3 §2.2 区间口径注记。

## Closure Gates

- [x] 全部 in-scope 交付落地（Phase 1–4 Exit Criteria 全勾）
- [x] in-scope confirmed live defects 已修复：canvasWidth 硬编码、方向键缺失、map dark 触发器失配、graph 字面 HSL、死类发射
- [x] in-scope confirmed contract drifts 已收敛：编辑/运行几何同构、map design.md 触发器表述与 loading 契约行、graph §4.2 token 表述与 §10 marker 契约、dashboard-editor design.md 键盘契约
- [x] 硬约束核实：三 schema 零字段变更、`panelToPixels` 单一来源、map 无 remount、INV-1~5 面内
- [x] A3 / graph 边通道 / R4/R6/R7/R8/R9 显式裁决落卡（非静默 deferred）
- [x] 行为/契约结果已达成：自适应测量、Arrow 移动、dark 重绘、令牌化边框在单测与 e2e 成立；graph-demo 8 test 与 playground-entry-pages 冒烟零回归
- [x] 必要 focused verification 已完成（单测先红后绿 + e2e 三域断言）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs 已同步到 live baseline：dashboard-editor/design.md、map/design.md、graph/design.md、证据卡、roadmap、followups 台账、daily log
- [x] `pnpm check` 零新增红（豁免命中数变化仅限 R2 摘除项，相对 `exemption-baseline-v0.json` diff 可归因）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### map heatmap/轨迹/围栏 schema 通道（A3）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 维持 design.md §2（:33）、§8（:161）首版裁定并升格为显式裁决——引入面 = OlApi 扩展（map-ol-loader.ts:24-42 增 Heatmap）+ layer manager 新层类型 + schema 通道，属能力立项而非视觉修复；无真实消费页（C1 构想清单零命中），BI 首版定位外。V11b 不预留半成品接口。
- Successor Required: `no`（design.md §8 裁决注记承载；再触发条件 = 真实热力/轨迹/围栏消费页或 mission 立项，届时连同围栏语义进能力 roadmap）

### graph 边着色通道（A4 残余）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `GraphEdge` 无字段（schemas.ts:22-29）；无消费页（C1-7 为构想库存，D2 :72 维持）；edge region 首版已显式否决在先（design.md §2 :33）；固定四语义级词汇贴合 trace 主场景。节点通道已够用（levelMap + node region 逃生口），「落地新节点通道」否决（重复建设）。
- Successor Required: `no`（design.md §4.2/§10 defer 注记承载；再触发条件 = C1-7 审批中心或真实 trace 页需要边状态语义）

### dashboard 裸 `<button>` ×2（R4）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 已登记 followups P2-19、归 V12b 池；不跨池摘樱桃，V11b 触碰同文件仅限交付面
- Successor Required: `yes`
- Successor Path: V12b 一致性 P2 候选池（roadmap V12b）

### dashboard 8 个零消费导出（R6）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 死代码治理非视觉交付；研究报告未逐个复核消费面，不立项（followups P2-17 在册）
- Successor Required: `yes`
- Successor Path: V12 一致性治理池（roadmap V12a/V12b 按族归类）

### map 缺省色阶/无值色字面 hex（R7）

- Classification: `watch-only residual`
- Why Not Blocking Closure: canvas 内色值；`visualMap.colors`/`defaultColor` 已可覆盖；瓦片底图恒为亮色是数据事实非缺陷；map 域字面色豁免（find-ui-consistency-gaps.mjs:97-103）已在册，归 V12b 池消化
- Successor Required: `no`（V12b 池承载）

### 运行态 dashboard 无键盘交互（R8）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 只读展示面无编辑语义，键盘导航限编辑态（并入 A2 裁决）；若未来运行态引入交互语义再议
- Successor Required: `no`

### graph `info` 语义级无视觉表达（R9）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 设计内（design.md §4.2「info 默认」），非缺陷
- Successor Required: `no`

## Non-Blocking Follow-ups

- map dark 重绘断言以属性态为先；若属性态不足以钉住回归，`canvas-pixel-probe` 像素探测升级为常规判据，实测结论记 daily log。（执行实测结论 2026-09-21：像素颜色判据不可行——`resolveMapTheme` 探针对裸 HSL 三元组 token 恒退化 `rgb(0,0,0)`，证据卡 X1；属性态判据已落地，R1 触发器由 map 包单测钉住。）
- R2 摘除豁免后 `check:audit-ui-consistency-gaps` 相对 `exemption-baseline-v0.json` 的 diff 数字随收口记入 daily log（对接 V12a 豁免基数口径）。（已完成：413→295 实例 / 121→108 文件 / 32→31 条目，见 daily log 2026-09-21。）
- dashboard-demo「零计算样式断言」口径：本 plan 补专属 spec 后消除。

## Closure

Status Note: 四 Phase 全部落地且独立 closure audit 通过（approved，4 Minor 均不阻塞且已由收口会话处理）：M-1 日志段落归属修正（482 的 Closure Gates 执行记录块自 484 段移回本 plan 段）、M-2 全仓链复绿由收口会话最终链记录闭环（typecheck 40/40、build、lint、test 74/74 tasks、check exit 0）、M-3 followups P2-16 主勾选补 `[x]`、M-4 本 plan 行锚漂移订正（:225-226 → :247-248，断言零修改）。roadmap V11b 行同步 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（2026-09-21 closure audit）
- Evidence: verdict `approved`——Phase 1–4 exit criteria 逐条 live 核对确认（use-canvas-width.ts 双消费/Arrow 分支/map attributeFilter data-theme+data-mode/graph 令牌化+死类摘除+豁免摘除/三域 e2e spec 文件面），三 focused 套件复跑 67/67、54/54、49/49 全绿；4 Minor（M-1 日志段落、M-2 链复绿时点、M-3 P2-16 勾选、M-4 行锚漂移）；证据卡 `docs/audits/visual-quality/dashboard-map-graph.md`、daily log `docs/logs/2026/09-21.md` 收口会话节。

Follow-up:

- no remaining plan-owned work（A3/A4/R4/R6/R7/R8/R9 均已落 Deferred But Adjudicated，successor 指针在案）
