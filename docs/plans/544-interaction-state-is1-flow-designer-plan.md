# 544 interaction-state IS-1 flow-designer 域修复批——种子 1–3 先红后绿 + 四 Tab 序列审查

> Plan Status: completed
> Last Reviewed: 2026-10-07
> Source: `docs/backlog/interaction-state-quality-roadmap.md`（IS-1，种子清单 1–3）；`docs/skills/interaction-state-audit-prompt.md`（§4 五步审查法、§6 画布类序列清单）；plan 543 交付的探针/台账基建
> Related: `docs/plans/543-interaction-state-is0-audit-infra-plan.md`（IS-0 基建）；`docs/plans/538-shell-collapse-wiring-plan.md`（同轨道 IS-1b）

## Purpose

修复 flow-designer 域三个已坐实交互缺陷（种子 1"+"锚定错位 / 种子 2 插入后视口跳变 / 种子 3 摘要卡边界不可辨），每项先红后绿；随后对 `#/flow-designer` 四 Tab 跑 prompt §4 全序列审查，findings 全量进台账，沉淀画布类交互序列模板。

## Current Baseline

**种子 1（"+"几何锚定，V4，已 live 复现）**

- 链式"添加节点"按钮 `packages/flow-designer-renderers/src/dingflow/ding-flow-plus-button.tsx:26-32` TB 锚定 `bottom: -(BTN_CENTER_DIST + BTN_DIAMETER/2) = -50px` → 按钮**中心**恒在节点底缘下方 36px（bottom 边 -50 − 半径 14）。
- 实际父子间距由投影决定：`packages/flow-designer-core/src/tree-projection.ts:585` `chainGap = max(layerSpacing, MIN_CHAIN_GAP=60)`；分支分裂区间距 = `MIN_SPLIT_GAP_TB=134`。
- **live 读数（2026-10-07 探针，钉钉 Tab，viewport DOMMatrix 反算 graph 坐标）**：链式按钮中心相对父子间隙中点偏移 −14px（gap 100 链）/−24px（gap 120）/−31px（gap 134 分裂区上方）；Action Tab 同样全线偏移。census：钉钉 Tab lucide-plus 按钮 11 = 链式"添加节点"9 + "添加合并节点"（merge overlay）2。
- 结构事实：按钮挂载于 `.nop-designer-node`（`designer-xyflow-node.tsx:336-341`，`showPlusButton` 不排除分支 owner）；分支/合并 overlay 走另一套锚（`designer-xyflow-canvas.tsx:101-147` TreeModeOverlays/ViewportPortal :123 + `dingflow-overlays.ts` 投影坐标，addCondition 在 owner 底缘与分叉线中点 ≈ +33.5）→ condition 节点上链式按钮(+36)与 addCondition overlay(+33.5) 近乎同带叠放。
- 点"+"链路：`designer-xyflow-node.tsx:338` → `designer-canvas.tsx:128-138` setPopover → `ding-flow-add-node-menu.tsx` → `dingflow-command-dispatch.ts:5-62`（node 源 on dt-condition → insertBranchPair；其余 → insertChainNode）→ `tree-session-impl.ts` 命令包装器。
- 既有单测缺口：`ding-flow-plus-button.test.tsx` 仅断言 `style.left==='50%'` 与 bottom truthy，无几何对账。

**种子 2（插入后视口跳变，V2，已 live 复现）**

- **live 读数**：钉钉 Tab 初始 `transform: translate(399.01px, 48px) scale(0.456)`（onInit 300ms fitView 整体居中）→ 点"+"选菜单插入成功（nodeCount 10→11）→ `transform: translate(0px, 0px) scale(1)`——视口硬跳原点 1:1。
- 根因链（代码证实）：树命令包装器 `tree-session-impl.ts:217` 每次命令成功后 `ctx.resetViewport()`（L292 replaceTreeFromHost、L319 relayoutTree 同）；`core/shell-state.ts:67-69` 从 doc.viewport 归一，而投影文档不含 viewport（`tree-projection.ts:669-677`）→ `core/viewport.ts:3-5` 归一为 `{0,0,1}` → 受控 `viewport` prop（`designer-xyflow-canvas.tsx:382`）即时跳变；fitView prop 与 onInit fitView（L371-384）均只在挂载期生效，插入后无 refit。
- 初始居中两处：`fitView` prop + `onInit` 300ms `fitView({padding:0.15, maxZoom:1})`；`use-designer-auto-layout.ts:99-143` 挂载期 relayoutTree（此刻 viewport 本为初始态）。undo/redo **不经过**命令包装器：`core.ts` undo/redo（≈:304-339）显式保持视口（注释明言 viewport 不属 undo 语义），本批为其补回归守卫断言而非先红 Proof。

**种子 3（摘要卡边界不可辨，V6，代码坐实）**

- `designer-node-card.tsx:73` 常态 `border border-border/60`（60% 透明度）；`:75` selected `border-primary/40`、`:74` active `border-primary/60 + ring`；`:52-63` 缺失节点裸 div（`--empty` + `data-empty="true"`，零尺寸零占位）。
- `designer-edge-row.tsx:76` 常态 `border-transparent`（完全无边框）；`:78` selected 仅 `bg-accent/40`；`:58-68` 缺失边同款裸 div。
- 消费方仅 `designer-summary-demo-schema.json`（节点/边摘要 Tab inspector，含 missing 两项 `does-not-exist`）与 `tests/e2e/designer-summary-renderers.spec.ts`（断言 marker 数与 `data-empty` 属性——改样式/补占位不破坏其结构断言）。

**基建与测试口径（plan 543 交付）**

- 探针模板 `tests/e2e/helpers/interaction-state-probes.ts` + 序列模板 `tests/e2e/interaction-state-probe-template.spec.ts`；台账 `docs/audits/interaction-state/ledger.md` 种子 findings `IS-flow-designer-001/002/003` 已预登记 pending。
- e2e 口径：Tab 切换 `getByRole('tab', { name: '钉钉审批流' })`；graph 坐标反算沿 `flow-designer-dingtalk-visual.spec.ts:139-193` DOMMatrix 模式；摘要 Tab 口径沿 `designer-summary-renderers.spec.ts`（`节点/边摘要` + `[data-testid="right-panel-expanded"]`）。aria-label/文案定位一律双语集合（应用默认 zh-CN，不假设运行 locale）。
- `#/taskflow-designer` 与本域共享 tree 渲染链路（同 `添加节点` aria-label 口径，`taskflow-tree-ux-r12.spec.ts`）；其全量序列审查归 IS-4（plan 543 批次裁定），本批仅做种子修复的回归抽查。i18n 默认语言 zh-CN（`packages/flux-i18n/src/i18n.ts:11`），既有 e2e 断言中文标签；aria-label 定位一律用双语集合（zh/en 兼容），不依赖运行 locale 假设。
- playground dev server 探针口径：`#/flow-designer` 页 `SchemaRenderer key={activeExample}` 切 Tab 即整树重挂载（`flow-designer-page.tsx:88-104`）。

## Goals

- 种子 1：**有后继节点**上的链式"添加节点"按钮中心 = 父子间隙中点（V4，graph 坐标 ±2px），钉钉/Action 两 Tab 成立；无后继叶子按钮以"完整落在节点下方空区不被裁剪"为弱断言并登记观察项；几何常量仍单源于 core。
- 种子 2：树命令（插入/删除/undo/redo）前后视口 transform 保持不变（V2）；初始 fitView 行为不变。
- 种子 3：常态 node 卡与 edge row 边界可感知（不透明边框 token）、selected/active 态区分成立、缺失节点/边渲染可见占位（V6）。
- 四 Tab prompt §4 全序列审查完成，findings 全量进台账（P0/P1 随批先红后绿修复，P2/P3 走裁决三态），种子 001–003 状态机走完 verified。
- 画布类交互序列模板沉淀（共享 helper + 本批 spec 作范例），供 IS-4 复用。

## Non-Goals

- `#/taskflow-designer` 全量序列审查（归 IS-4）。
- 分支/合并 overlay（addCondition/mergeAdd）的锚定语义改版——condition 节点上链式按钮与 addCondition overlay 的同带叠放问题在 Phase 4 审查中立案裁决（候选：P2 观察项或独立后续批），本批不盲改其语义。
- flow-designer graph 模式（工作流 Tab）的布局/连接行为改造（仅作为审查对象）。
- 视口持久化到 doc 的策略扩展（`persistViewport` 既有 onMoveEnd 语义不变）。

## Scope

### In Scope

- `packages/flow-designer-core`：tree-projection 逐节点发出主轴链间隙（`data.__fdChainGap`）；tree-session-impl 命令包装器视口保持；对应单测。
- `packages/flow-designer-renderers`：`ding-flow-plus-button` 接受 gap 派生锚定；`designer-node-card`/`designer-edge-row` 态样式与缺失占位；i18n 双语新键；对应单测。
- `tests/e2e`：V4/V2/V6 三条先红后绿 spec（或合入一个 IS-1 序列 spec）；画布序列共享 helper。
- `docs/audits/interaction-state/ledger.md`：findings 状态推进与新发现登记。
- `docs/backlog/interaction-state-quality-roadmap.md`：IS-1 状态回写。

### Out Of Scope

- `packages/flow-designer-renderers` 之外任何 renderer 包；playground schema 内容改造（钉钉/Action 演示数据不动——layerSpacing 是 demo 设计值，修复以按钮适配 gap 为准，不改 gap）。

## Failure Paths

不适用：纯渲染器交互与样式修复，无错误处理/API 契约/鉴权/外部集成路径。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap 跨轨纪律：每条 P0/P1 修复先红后绿，断言读数非截图）。Proof 先行：Phase 1–3 各自先写"旧实现下必挂"的读数断言（V4 偏移>2px 必挂 / V2 transform 变化必挂 / V6 透明边框必挂），红 → 修 → 绿。

## Execution Plan

### Phase 1 - 种子 1："+"按钮 gap 派生锚定（V4）

Status: completed
Targets: `packages/flow-designer-core/src/tree-projection.ts`、`packages/flow-designer-renderers/src/dingflow/ding-flow-plus-button.tsx`、`src/designer-xyflow-canvas/designer-xyflow-node.tsx`、`tests/e2e/interaction-state-flow-designer.spec.ts`（新建）

- Item Types: `Proof | Fix`

- [x] Proof（先红）：e2e V4 读数断言——钉钉/Action 两 Tab，枚举链式"添加节点"按钮（aria-label 双语集合，排除"添加分支/添加合并节点"）中**有后继者**（存在 `__fdChainGap` 数据；demo 10 节点中 5 个有后继、4 个为分支腿末端无后继叶子——旧实现下钉钉有后继钮偏移 −14/−31px（链 gap 100 与分裂 gap 134 两档）、Action 全线偏移 → 必挂；红阶段判别器用结构/几何判据（按钮所在节点 id 是投影 edge 的 source，即节点下方间隙带内存在子节点），禁止按 `__fdChainGap` 存在性过滤（旧实现选集为空会假绿）；viewport DOMMatrix 反算 graph 坐标，断言每钮中心与"父底缘—子顶缘"间隙中点偏差 ≤2px。无后继叶子按钮另作弱断言（按钮 rect 完整落在画布可视区、不被容器裁剪）并在 Phase 4 登记观察项。落 `interaction-state-flow-designer.spec.ts`。
- [x] Fix：`tree-projection.ts` 投影后处理为每个有后继的节点在投影文档节点 data 写入 `__fdChainGap`（主轴间隙 = 子节点主轴位置 − 节点底缘；多子取最小，≥MIN_CHAIN_GAP 语义不变——只加数据不改布局）。注意 `placeSubtree` 以同引用推送 node.data（:236），`__fdChainGap` 只写投影文档侧副本、不得改写树文档节点 data（防泄漏进 `exportDocument` 的 JSON 序列化与 digest 摘要）。
- [x] Fix：`DingFlowPlusButton` 增可选 `centerDistance` prop（缺省保持 50 旧值），TB `bottom: -(centerDistance − BTN_DIAMETER/2)`、LR `right` 对称；`designer-xyflow-node.tsx` 从 `data.__fdChainGap` 派生 `centerDistance = gap/2` 传入（无 gap 数据时旧值兜底）。
- [x] Fix：单测——`tree-projection.test.ts` 增 `__fdChainGap` 断言（钉钉口径 100、下限 ≥60）；`ding-flow-plus-button.test.tsx` 增几何对账断言（centerDistance=50 → 中心 +36 旧锚；centerDistance=gap/2 → 中心 = gap/2）。
- [x] Proof：ledger `IS-flow-designer-001` pending→found（红 e2e 证据）→fixed。

执行期注记（Phase 1）：计划稿的 `centerDistance` prop 落地为 `mainOffset`（语义 = 按钮外缘的 CSS 主轴偏移，legacy 50；调用方 gap/2 + BTN_DIAMETER/2 → 中心恰在 gap/2）——修复了计划稿"centerDistance=gap/2 → 中心=gap/2"的算术滑位。e2e 红证据：钉钉 offsets [-14,-14,-14]（几何判据 3 链对）。

Exit Criteria:

- [x] V4 e2e 先红后绿（两 Tab 链式按钮 ±2px），断言全部基于 graph 坐标读数。
- [x] 布局零变化证据：既有 `tree-projection.test.ts` / `geometry-oracle.test.ts` / `flow-designer-tree-mode.spec.ts` 全绿（节点位置不变，只加数据）。
- [x] 判别性单测：无 `__fdChainGap` 或 centerDistance 未接时新断言必挂（点名判别机制）。

### Phase 2 - 种子 2：树命令视口保持（V2）

Status: completed
Targets: `packages/flow-designer-core/src/tree-session-impl.ts`、`tests/e2e/interaction-state-flow-designer.spec.ts`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：e2e V2 读数断言——钉钉 Tab 等 onInit fitView 落定（transform 非恒等）→ 点"+"→ 菜单项插入 → 断言 transform 保持且 nodeCount+1；删除路径对称断言。旧实现 transform 跳 `{0,0,1}` → 必挂（先红仅覆盖插入/删除腿）。
- [x] Fix：`tree-session-impl.ts:217` 命令包装器移除 `ctx.resetViewport()`（viewport 保持 shell 当前值；`viewportChanged` emit 相应调整或移除，随实现裁定）。L292/L319（replaceTreeFromHost/relayoutTree）逐点裁定并留痕：挂载期 relayout 依赖初始态可保留或移除，以"挂载后视口永不静默重置"为准则。全仓 grep 证实无单测断言 reset 语义（`tree-session.test.ts:436` 将 resetViewport stub 为 no-op），"既有测试依赖 reset"实际为空集，如执行中发现例外逐条留痕。
- [x] Fix：单测——core 侧命令执行后 `shellState.viewport` 保持断言（旧实现必挂）。
- [x] Proof：ledger `IS-flow-designer-002` pending→found→fixed。

执行期注记（Phase 2）：undo e2e 腿折叠为 core 层守卫（tree-session.test.ts "undo/redo keeps the viewport"）——树模式 Tab 无 undo 工具条/快捷键，无 UI 驱动路径；先红证据以 stash 法取得（仅还原 tree-session-impl.ts 旧实现 → insert 腿即挂）。三处 resetViewport（:217/:292/:319）全部移除，逐点注释留痕。

Exit Criteria:

- [x] V2 e2e 先红后绿（插入/删除腿；undo 路径为回归守卫断言——旧实现本已保持视口，守卫其不因本批改动回退），初始 fitView 行为回归不变（既有 `flow-designer-ux-visual.spec.ts` 的 fit-view 用例与 `taskflow-tree-ux-r12.spec.ts` tft6 全绿）。
- [x] core 包 focused 测试全绿；resetViewport 语义修正点逐条留痕（plan 或 ledger note）。

### Phase 3 - 种子 3：摘要卡边界与缺失占位（V6）

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-node-card.tsx`、`designer-edge-row.tsx`、`packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`、`tests/e2e/interaction-state-flow-designer.spec.ts`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：e2e V6 读数断言——节点/边摘要 Tab：①常态 node 卡 computedStyle borderWidth 为实值且 borderColor alpha=1（旧 `border-border/60` alpha 0.6 必挂）；②常态 edge row borderColor alpha=1（旧 transparent 必挂）；③selected/active 态读数与常态可区分（border/ring 读数不同）；④`[data-empty="true"]` 元素 rect.height>0 且含可见占位文本（旧高度 0 必挂）。
- [x] Fix：`designer-node-card.tsx` 常态 `border-border`（不透明 token），hover/selected/active 态梯度保留加深；`designer-edge-row.tsx` 常态 `border-border`，selected 增边界态；态梯度以读数可区分为准（执行时以 computedStyle 对照定稿）。
- [x] Fix：缺失节点/边占位——虚线边框 + muted 背景 + 双语文案（新 i18n 键 `flux.flowDesigner.summaryMissingNode`/`summaryMissingEdge`），保留 `data-empty="true"`/marker class/aria 既有契约（`designer-summary-renderers.spec.ts` 零回归）。
- [x] Fix：单测——`designer-node-card-edge-row.test.tsx` 增占位渲染与新态 class 断言。
- [x] Proof：ledger `IS-flow-designer-003` pending→found→fixed。

执行期注记（Phase 3）：缺失占位渲染真实文案后移除 aria-hidden（可感知性），既有单测的 aria-hidden 契约断言随修复更新（designer-node-card-edge-row.test.tsx）；i18n 新键 summaryMissingNode/summaryMissingEdge 双语。

Exit Criteria:

- [x] V6 e2e 先红后绿（四组读数断言），全部 computedStyle/rect 读数非截图。
- [x] `designer-summary-renderers.spec.ts` 全绿（既有契约零回归）。
- [x] i18n 双 locale 键齐（`pnpm check:i18n-keys` 不新增红）。

### Phase 4 - 四 Tab 序列审查、模板沉淀与台账收口

Status: completed
Targets: `docs/audits/interaction-state/`（findings 卡目录）、`tests/e2e/helpers/flow-canvas-sequence.ts`（新建）、`docs/backlog/interaction-state-quality-roadmap.md`

- Item Types: `Proof | Fix | Decision`

- [x] Proof：按 prompt §4 五步法对四 Tab（工作流/钉钉审批流/Action 编排/节点/边摘要）跑交互序列审查（枚举可交互面 → 读数集 → 驱动序列含确认/取消/Esc 三路径与拖拽中间态 → diff 定罪 → 归类归属），证据卡落 `docs/audits/interaction-state/is1-flow-designer/`；种子 001–003 修复后同探针复检 flip verified。
- [x] Fix：新 findings 全量进 ledger——P0/P1 随批先红后绿修复（同 Phase 1–3 口径）；P2/P3 走裁决三态登记（含"condition 节点链式按钮与 addCondition overlay 同带叠放"与"无后继叶子按钮锚定"两项立案裁决）。
- [x] Fix：画布类序列模板沉淀——`tests/e2e/helpers/flow-canvas-sequence.ts`（sign-in bootstrap/openFlowDesigner/Tab 切换/V5 读数/V4 几何读数共享 helper），由 `interaction-state-flow-designer.spec.ts` 与 `interaction-state-flow-designer-v5.spec.ts`（V5 Esc 序列，closure audit R1 退回后补的第二消费方）共同消费，作为 IS-4 画布类页面复用范例。
- [x] Proof：`#/taskflow-designer` tree 模式种子修复回归抽查（V4 抽查 + 既有 `taskflow-tree-ux-r12.spec.ts` 全绿）。
- [x] Proof：closure audit 通过后 roadmap IS-1 状态回写（todo→planned 于本 plan 转 active 时已落；planned→done 于 audit 后；双表同步）。closure audit R1 issues（1M+5m）退回项已修：第二条消费 spec 补齐、flow-designer 页行 flip audited、sequence-readings 空探针标注 n/a、V6 补 click-selected computedStyle 腿。
- [x] Proof（执行期补充裁决）：taskflow V4 抽查以"`#/taskflow-designer` 页面树画布需调色板交互引导、其回归由 taskflow-tree-ux-r12.spec.ts 全绿（83 passed 家族跑含）+ 共享投影单测覆盖"方式达成——与计划稿"V4 抽查"的措辞差异在此留痕。

Exit Criteria:

- [x] 四 Tab 审查证据卡落盘且台账行覆盖全部新 findings（uncovered 不回退——inventory 257 页基数不变）。
- [x] P0/P1 修复均有先红后绿记录；P2/P3 逐条裁决三态（修/登记不修+理由/转移），零静默跳过。
- [x] 模板 helper 被至少两条 spec 真实消费（knip 不新增红）；taskflow 回归抽查绿。
- [x] ledger 种子 001–003 全部 verified；roadmap IS-1 双表回写完成。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_08bb1eda-5c2d-4796-8609-4ff0e8525c2e）
- Verdict: `pass-with-minors`
- Rounds: 2（R1 `fail`：2 Major + 5 Minor → 全部修订 → R2 scoped re-check 零 Blocker/零 Major）
- Findings addressed: Major 2 条——①V4 枚举面含 4 枚无后继叶子按钮按字面永不可绿（修法：收窄至有后继者 + 叶子弱断言 + Phase 4 立案观察）；②"undo/redo 走命令包装器同受 reset"声称与 live 相反（core.ts 显式保持视口；修法：baseline 勘误 + undo 腿改判回归守卫）。Minor 5 条（\_\_fdChainGap 引用污染、locale 声称、三处行号、knip 提示、Tab 名斜杠）随共识修复；R2 新增 2 Minor（偏移数字归因 −14/−31、红阶段判别器防自指假绿）已随记录一并修入。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（种子 001–003 verified + 批内新立 P1 004 verified；P2 三条 005/006/007 走裁决 watch/successor 见 findings.md）
- [x] 所有 in-scope confirmed contract drifts 已收敛（无——本批无契约漂移面，如执行中发现逐条补记）
- [x] 行为/契约结果已达成（V4/V2/V6 三不变量在两 Tab + 摘要 Tab 成立）
- [x] 必要 focused verification 已完成（三条先红后绿 + core/renderers focused 单测 + 四 Tab 审查证据）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap IS-1 回写；ledger/证据卡落盘；flow-designer design.md 若行为语义变化则同步注记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- 分支/合并 overlay 锚定语义改版（若 Phase 4 裁决为非 P0/P1）。
- 视口持久化策略扩展（persistViewport 既有口径之外的优化）。

## Closure

Status Note: 2026-10-07 收口。四 Phase 全 completed：种子 001（"+"gap 派生锚定，投影 \_\_fdChainGap + mainOffset，e2e 红 [-14,-14,-14]→绿 ±2px）、002（树命令视口保持，三处 resetViewport 移除，e2e stash 法先红→绿 + undo core 守卫）、003（摘要卡不透明边界 + 缺失占位双语文案，e2e 红 alpha0.6/高0→绿）全 verified；Phase 4 四 Tab §4 序列审查 16 序列取证，新立 P1 004（条件节点"+"被 overlay 遮挡不可达 + 底层 insertBranchPair 破坏性覆写——隐藏 owner 节点按钮修复）verified，P2 三条（005/006/007）裁决 watch/moved-to-successor 全登记；画布序列模板 helper 两条 spec 消费。五门禁 full-green（typecheck/build/lint 42/42、test 78/78、check exit 0——oversized 破阈值抽 tree-projection-nodes.ts 收敛、knip 三处新导出当场收敛）；IS-1 spec 5/5 + V5 spec 2/2、家族回归 83 passed/3 skipped、core 197/197、renderers 296/296。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（general-purpose fresh session，agent_bcf5a3d8-8a33-41e3-9bf8-359219616596）
- Evidence: R1 `issues`（1 Major：模板 helper "两条 spec 消费"实际仅一条 + 5 Minor：audit gate 预勾/flow-designer 页行未 flip/taskflow 空探针记 ok/V6 selected 腿以 hover 实现/工件标注缺）+ 3 Trivial → 全部退回项修复 → R2 scoped re-check `APPROVED` 零 Blocker/零 Major/零 Minor 残留。审计员独立复现四条红证据（stash 法逐位一致：[-14,-14,-14] / insert 腿挂 / overlap 93 / alpha 0.6）、独立实跑五门禁与 reconcile（audited:1、uncovered:256、OK）、"接口≠行为"抽查全过（**fdChainGap 端到端消费链/**fdBranchGroupOwner 行为互证/i18n 双语消费）。R1 退回项处置：M1 补 V5 spec 第二消费、M3 页行 flip audited、M4 readings 空探针标 n/a、M5 V6 补 click-selected computedStyle 腿、T1/T2 工件与 dev log 勘正。

Follow-up:

- 见 Non-Blocking Follow-ups。
