# DingTalk 审批流示例视觉对齐（schema data-\* 转发 + 分支标签 + minimap/controls 接线）

> Plan Status: completed（closure-audit pass：独立 fresh sub-agent 核验 Phase 1–5 落地 + e2e/单测复跑全绿，见 Closure 节）
> Last Reviewed: 2026-08-06
> Source: 用户要求——`/flow-designer`「钉钉审批流」示例需呈现 `/dingtalk-flow-demo` 的钉钉视觉（彩色卡片、分支标签、线上 + 按钮），但底层使用 plan 453 统一 tree-mode 布局算法 + flow-designer 可配置方案（schema 驱动），支持右下角鸟瞰图与左上角缩放，尽量与 flow-designer 其他部分共享底层。live 诊断证据见 `_tmp/dingflow-inspect1..6.mjs`（Playwright 程序化检查：节点/边/overlay 几何、computed styles、DOM 结构；`docs/logs/2026/08-06.md` 的诊断记录节将在 Phase 5 补写）。
> Related: `docs/plans/453-dingflow-single-tree-layout-unification-plan.md`（completed，本 plan 的布局算法前置）、`docs/architecture/renderer-markers-and-selectors.md`（样式契约，Phase 1 修改对象）、`docs/architecture/styling-system.md`

## Purpose

把 flow-designer「钉钉审批流」示例的渲染视觉收敛到与 dingtalk-flow-demo 一致的效果，同时保持 plan 453 的统一布局算法与 schema 可配置方案。收口三个已实证的 gap：(1) schema body 中 `data-slot`/`data-node-variant` 不被 flex/text/icon 渲染器转发，导致 `apps/playground/src/flow-designer-nodes.css`（219 行钉钉卡片样式，选择器全按 `[data-slot='dt-node']` 编写）永不生效，卡片退化为无样式白条；(2) 分支标签（branch.data.label，如「长期请假/短期请假」）没有渲染——数据已存在于 tree 投影的 edge data，但 `DingFlowEdge` 不消费；(3) `features.minimap`/`features.controls` 配置未接线到画布（当前写死默认 true），Controls 位置需钉死在左上角。产出可复现的程序化 e2e 断言锁定卡片样式、分支标签、+ 按钮在线上、minimap 右下角/controls 左上角四项契约。

## Current Baseline

- **布局算法**：tree-mode 已统一（plan 453 completed）：`projectAndLayoutTree` 单一算法、`__fdTree` 几何（kind/direction/ownerId/branchId/continuationId/lineMain/fanoutCross）、空分支 slot、TB/LR 渲染、geometry oracle 测试。live 复验（2026-08-06 Playwright）：节点/边/overlay 坐标与几何一致——「添加分支」overlay 中心 (250,507) 精确落在 split 线 y=507，「添加合并节点」在 merge 线下 49px（与 demo +36px 同模式），**+ 按钮几何正确，用户感知错位源于卡片无样式后视觉锚点丢失**。
- **schema body 渲染链路**：`compileDesignerConfig`（`packages/flow-designer-renderers/src/renderer-definitions.ts:63-118`）对 `config.nodeTypes[*].body` 调用 `compileSchema` 编译；flex/text/icon 为 open prop model（`basic-renderer-definitions.ts`，无 propSchema/propContracts），未知键经 `classifyField`（`packages/flux-compiler/src/schema-compiler/fields.ts:52`，非 `on`-前缀）返回 `{ kind: 'prop' }` → `data-slot`/`data-node-variant` 已进入 `props.props`（live 实证：body 结构渲染成功，icon+title+subtitle 都在 DOM）。**断点只在渲染器消费侧**：`flex.tsx`/`text.tsx`/`icon.tsx` 只转发 `props.meta.className` + `data-testid`/`data-cid`，不转发 schema 提供的 `data-slot`/`data-*`。类型层：`BaseSchema extends SchemaObject`（`[key: string]: SchemaValue`），schema 直接写 `data-slot` 类型上本就通过（**无需改 schema 类型**，改 index signature 反而触发 TS2413）。
- **钉钉卡片 CSS**：`apps/playground/src/flow-designer-nodes.css`（219 行）已正确接线（styles.css → styles-theme-utilities.css → flow-designer-nodes.css），选择器 `[data-slot='dt-node'][data-node-variant='initiator']` 等，因属性不转发而全部落空。已知 CSS 内可能缺 header 文字 `color:#fff` 等细节（执行时逐段核对）。
- **schema**：`apps/playground/src/schemas/dingtalk-workflow-tree-schema.json` config 1.1.0，treeConfig direction TB / nodeSpacing 60 / layerSpacing 100，nodeTypes 7 个（dt-initiator/approval/cc/condition/parallel/subprocess/end）带 body+appearance+tree.layoutSize，edgeTypes 3 个（dt-chain/branch/merge），`features.minimap: false`（未接线，无实际效果），toolbar/canvas 配置齐全。branch data：`treeDocument` k003（条件路由）branches b1「长期请假」/b2「短期请假」，k006（并行处理）branches b3「并行分支1」/b4「并行分支2」——`projectEdges`（`packages/flow-designer-core/src/tree-projection.ts:411`）已把 `branch.data` 合并进 split edge data（`edge.data.label` 可用）。
- **MiniMap/Controls**：`DesignerXyflowCanvas`（`designer-xyflow-canvas.tsx:368-381`）已实现 `showMinimap`/`showControls`（默认 true）；live 实测 MiniMap 渲染于画布右下、Controls 渲染于左上部。`designer-canvas.tsx` 未传这两个 prop → schema `features.*` 无控制力；`NormalizedDesignerConfig.features`（`packages/flow-designer-core/src/core/config.ts:23-37`）无 `controls` 键。
- **demo 页**：`/dingtalk-flow-demo`（`apps/playground/src/pages/ding-talk-flow-demo.tsx` + `apps/playground/src/pages/dingtalk-flow/`）为 legacy 独立原型（旧常量 BRANCH_SHORT_LEG/MERGE_SHORT_LEG、`outs[0]`/`ins[0]` 猜测），保留作视觉参考，不在本 plan 修改。
- **e2e**：`tests/e2e/flow-designer-tree-mode.spec.ts` 已有 4 用例（mount/固定 footprint/节点碰撞/action-flow），无视觉契约断言。

## Goals

- flex/text/icon 渲染器支持转发 schema 作者提供的 `data-slot` 与 `data-*` 属性（白名单 `data-` 前缀），契约测试 + 样式契约文档同步；designer 节点 body 的钉钉卡片样式（`flow-designer-nodes.css`）在真实浏览器生效。
- tree-mode 分支线上渲染 branch.data.label 标签（钉钉式白底绿字 pill，位于分支水平线段上方居中），`ding-flow-edge` 实现 + 单测。
- `features.minimap`/`features.controls` 从 schema 配置接线到画布（缺省 true）；Controls 通过 CSS 钉死在画布左上角、MiniMap 保持右下角；dingtalk schema 显式开启。
- 程序化 e2e（Playwright DOM/computed-style 断言，非截图）锁定四项契约：卡片样式（header 背景色/条件绿/结束圆点）、分支标签文本与位置、+ 按钮中心与 split 线 lineMain 重合、minimap/controls 存在且位置正确。
- flow-designer「钉钉审批流」与 demo 视觉一致（无样式差异项残留），布局算法与可配置方案保持 plan 453 基线不变。

## Non-Goals

- 不修改 `/dingtalk-flow-demo` legacy 原型页（保留为历史参考；其 insertBranch 条件插入布局缺陷另立 successor，不在本 plan）。
- 不改布局算法（`projectAndLayoutTree` 几何、空分支 slot、TB/LR 渲染均保持 plan 453 基线）。
- 不做渲染器级任意 `data-*` 之外的新属性通道（如 `xui:attrs`）；仅转发 schema 直接书写的 `data-slot` + `data-*`。
- 不渲染 edgeType.body 标签机制（tree 校验 `validateTreeEdgeDecorations` 明确禁止，标签数据走 branch.data）。
- 不处理 showGatewayNodes/showMergeNodes（plan 453 Deferred，另立 successor）。

## Scope

### In Scope

- `packages/flux-renderers-basic/src/`：flex/text/icon 渲染器 data 属性转发 + 共享 helper + 类型扩展 + 契约测试。
- `packages/flow-designer-renderers/src/dingflow/ding-flow-edge.tsx`：分支标签渲染。
- `packages/flow-designer-core/src/core/config.ts` + types：`features.controls` 默认值。
- `packages/flow-designer-renderers/src/designer-canvas.tsx`：showMinimap/showControls 从 config.features 接线。
- `apps/playground/src/`：flow-designer-nodes.css 细节核对修补、dingtalk schema features 更新、Controls 左上角定位 CSS。
- `tests/e2e/`：flow-designer dingtalk 视觉契约 spec（新增）。
- `docs/architecture/renderer-markers-and-selectors.md`（data-\* 转发契约）、`docs/architecture/flow-designer/tree-mode.md` 或 design.md（分支标签/features 接线）、`docs/logs/2026/08-06.md`。

### Out Of Scope

- dingtalk-flow-demo 页修复与统一。
- 布局算法调整。
- showGatewayNodes/showMergeNodes。
- 其他 renderer（container/page/button 等）的 data-\* 转发（本次仅 designer body 实际使用的 flex/text/icon；如后续需要再按同机制扩展）。

## Failure Paths

| 场景                       | 触发                             | 行为                                                                     | 可重试 | 用户可见表现         |
| -------------------------- | -------------------------------- | ------------------------------------------------------------------------ | ------ | -------------------- |
| 无 body 的 nodeType        | 配置未提供 body                  | 保持现有 fallback（strong+small 简卡）                                   | 否     | 简卡，不崩           |
| data-\* 值含 `${...}` 模板 | schema 作者在 data-\* 里写表达式 | `compileValue` 编译为模板；若表达式求值失败则属性缺失，卡片样式部分降级  | 是     | 该节点样式缺项，不崩 |
| 分支无 label               | branch.data 无 label             | 不渲染标签，线照常                                                       | 否     | 无标签               |
| LR 方向分支标签            | treeConfig.direction=LR          | 标签渲染在竖直分割线右侧居中（label 放在 fanoutCross 轴、lineMain 中心） | 否     | 标签在线上           |
| label 文本过长             | 长分支名                         | 单行 truncate（max-width + ellipsis），不换行                            | 否     | 标签截断             |
| edge 几何缺失 \_\_fdTree   | 非 tree 模式 edge                | DingFlowEdge 现有兜底直线路径，不渲染标签                                | 否     | 直线                 |

## Test Strategy

本档选择：`必须自动化` —— 涉及渲染器公共契约（flex/text/icon data-\* 转发，跨包消费）与安全无关但易回归的 DOM 契约（卡片样式/分支标签/按钮在线上/minimap-controls 位置）。Proof 项（渲染器转发契约测试、ding-flow-edge 标签测试）先于 Fix 落地（test-first）。

## Execution Plan

### Phase 1 - 渲染器 schema data-\* 属性转发

Status: completed
Targets: `packages/flux-renderers-basic/src/{utils.ts,flex.tsx,text.tsx,icon.tsx,schemas.ts}`、`packages/flux-renderers-basic/src/__tests__/data-attrs-passthrough.test.tsx`、`docs/architecture/renderer-markers-and-selectors.md`

- Item Types: `Proof | Fix | Decision`

- [x] **Proof（test-first）**：新增 `__tests__/data-attrs-passthrough.test.tsx`——flex/text/icon 各自渲染含 `data-slot` + `data-node-variant` + 另一个 `data-*` 属性的 schema，断言 DOM 元素带有全部属性；再断言不转发非 `data-*` 的未知键（如 `x-unknown`）与空值属性不输出（先红后绿）。
- [x] **Decision**：转发规则裁定——白名单仅 `data-slot` + `/^data-/` 前缀键；值必须是 string/number（number 转字符串），布尔/对象/表达式结果 undefined 时跳过；helper `collectDataAttrs(props)` 放 `utils.ts` 供三渲染器共用。渲染器读取 `props.props` 时把 `SchemaValue` 窄化到 string/number。
- [x] **Fix**：flex/text/icon 渲染器根元素 spread `collectDataAttrs(props.props)`（`data-slot`/`data-*` 直出；**不改 schema 类型**——`BaseSchema` 的 `[key: string]: SchemaValue` index 已覆盖，改 index signature 会触发 TS2413）。
- [x] 契约文档：`renderer-markers-and-selectors.md` 增加「Schema-Authored Data Attributes」节——flex/text/icon 转发 schema 直接书写的 `data-slot`/`data-*`，用途：designer 节点 body 等 schema 驱动的结构标记样式；非 `data-*` 未知键仍不转发。`Fix`

Exit Criteria:

- [x] 契约测试全绿（先红后绿已复现：先跑 4 failed，实现后 47 文件/472 测试全过），`pnpm --filter @nop-chaos/flux-renderers-basic test` 通过。
- [x] live 复验：`/flow-designer` 钉钉审批流 tab 节点 DOM 出现 `data-slot="dt-node"`/`data-node-variant="approval"` 等属性（Playwright evaluate）。
- [x] renderer-markers-and-selectors.md 已同步转发契约。

### Phase 2 - 钉钉卡片样式核对修补 + 浏览器实证

Status: completed
Targets: `apps/playground/src/flow-designer-nodes.css`、`apps/playground/src/schemas/dingtalk-workflow-tree-schema.json`、`tests/e2e/flow-designer-dingtalk-visual.spec.ts`（新）

- Item Types: `Fix | Proof`

- [x] **Proof**：Playwright 程序化断言（新增 `tests/e2e/flow-designer-dingtalk-visual.spec.ts`）：`[data-slot='dt-node']` 存在；initiator/approval/cc/condition/parallel/subprocess 各 variant 的 header 背景色 computed style 等于 CSS 承诺值（#576a95/#ff943e/#3296fa/#6366f1/#8b5cf6，condition 标题 #15bc83，header 文字 #ffffff）；end 节点为 terminal 分支圆点形态（Tailwind v4 rounded-full 大数半径 + 实心背景）；+ 按钮中心与线 lineMain 重合（含 surface 页面偏移校正）——先红后绿（4 failed 基线 → 修复 data-\* 转发后全绿）。
- [x] **Fix**：逐段核对 `flow-designer-nodes.css` 219 行——white 文字/条件绿/结束节点样式已完备，**无需修补**；end 节点由 designer-xyflow-node terminal 分支渲染（body 不渲染，e2e 断言已对准 terminal 形态）。
- [x] schema body 微调：无需——与 demo 一致的视觉全部由 CSS 覆盖，分支标题由 Phase 3 标签承担。`Decision`

Exit Criteria:

- [x] e2e 视觉契约 spec 全绿（computed-style 断言）：`data-slot/variant 存在`、`header 颜色`、`end 圆点`、`+ 按钮在线上` 4 项通过（`--grep "card|end node|add-branch overlay"` 实测 4 passed）。
- [x] 浏览器实证：钉钉审批流 tab 卡片已出现钉钉视觉（header 色带/白字/条件绿/圆点 end），无「白条卡片」；视觉对照清单留痕于 e2e 断言。

### Phase 3 - 分支线上标签渲染

Status: completed
Targets: `packages/flow-designer-renderers/src/dingflow/ding-flow-edge.tsx`、`packages/flow-designer-renderers/src/dingflow/ding-flow-edge.test.tsx`、`packages/flow-designer-renderers/src/dingflow/dingflow-constants.ts`（如需）

- Item Types: `Proof | Fix`

- [x] **Proof（test-first）**：`ding-flow-edge.test.tsx` 新增「DingFlowEdge branch label」describe——split edge 带 `data.label` 时输出标签 pill（EdgeLabelRenderer HTML div，白底绿字圆角），坐标 = 水平线段中点（TB：x=(ownerCross+targetCross)/2=50px，y=lineMain=40px；LR：x=lineMain=40px，y=(sy+ty)/2=40px）；chain/merge 不渲染；无 label/空 label 不渲染；pointer-events-none——先红（2 failed）后绿（30 文件/214 测试全过）。
- [x] **Fix**：`DingFlowEdgeInner` 对 `geometry.kind==='split'` 且有非空 `edgeData.label` 渲染钉钉式标签（白底、#15bc83 绿字/边框、rounded-full、max-width 160px + truncate、font-size 11px），TB/LR 对称处理；`EdgeLabelRenderer` 实现（z-index 4 在线上方）；标签随 edge data 更新（branch.data.label 投影已保证）。
- [x] 交互契约核对：标签 `pointer-events-none` + `nopan nodrag`（不拦截连线选择/拖动）——单测断言 class 含 pointer-events-none。`Proof`

Exit Criteria:

- [x] ding-flow-edge 单测全绿（214/214）；tree-mode 相关既有测试零回归。
- [x] 浏览器实证：条件路由/并行处理的分支线各出现「长期请假」「短期请假」「并行分支1」「并行分支2」四个标签，e2e 几何断言：每个标签中心 y 落在其分支水平线上（±2px，含 surface 偏移校正），`tests/e2e/flow-designer-dingtalk-visual.spec.ts`「branch labels」用例通过。

### Phase 4 - features 接线 + Controls 左上角定位

Status: completed
Targets: `packages/flow-designer-core/src/core/config.ts`、`packages/flow-designer-core/src/types.ts`、`packages/flow-designer-renderers/src/designer-canvas.tsx`、`packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx`、`packages/flow-designer-renderers/src/designer-canvas-features.test.tsx`（新）、`apps/playground/src/schemas/dingtalk-workflow-tree-schema.json`

- Item Types: `Fix | Proof`

- [x] **Proof（test-first）**：新增 `designer-canvas-features.test.tsx`——缺省（未声明 features）时 minimap 与 controls 均渲染；`features.minimap:false`+`features.controls:false` 时两者均不渲染。先红（临时回退 designer-canvas 两行接线，1 failed）后绿（恢复接线，216/216 全包通过）。
- [x] **Fix**：`NormalizedDesignerConfig.features` 默认值增加 `controls: true`（`config.ts` + `DesignerFeatures` 类型新增 `controls?: boolean`）；`designer-canvas.tsx` 经 `renderDesignerCanvasBridge` 传 `showMinimap: config.features.minimap !== false`、`showControls: config.features.controls !== false`。
- [x] **Fix**：`<Controls>` 加原生 `position="top-left"`（React Flow v12 Panel 定位，避开了 `@layer utilities` CSS 被 react-flow 无 layer 规则击败的问题）；MiniMap 保持默认右下。
- [x] schema 更新：dingtalk `features.minimap: true`、`features.controls: true`（显式声明）。`Fix`

Exit Criteria:

- [x] 接线测试全绿（31 文件/216 测试）；Playwright 实证：钉钉审批流 tab minimap 右下（`surfaceRect.right - minimap.right > 0`）、controls 左上（`left < 40 && top < 40`），e2e「minimap renders bottom-right and controls render top-left」通过；改 schema features 后行为切换由单测覆盖。
- [x] dingtalk schema JSON 已更新（minimap/controls: true）。

### Phase 5 - 回归、文档与全量验证

Status: completed
Targets: `tests/e2e/flow-designer-dingtalk-visual.spec.ts`、`docs/architecture/flow-designer/tree-mode.md`、`docs/logs/2026/08-06.md`

- Item Types: `Fix | Follow-up`

- [x] e2e 回归：`flow-designer|dingflow|taskflow|tree-mode|dingtalk` grep 全量 **58 passed / 4 skipped / 0 failed**（首轮 taskflow 2 例并行 flake，单跑 8/8 复绿，非本 plan 引入）；新增 dingtalk 视觉 spec 6 例全绿。`Proof`
- [x] 文档：`tree-mode.md` 同步分支标签渲染（split edge `data.label` → 钉钉式 pill，TB/LR 对称）+ features.minimap/controls 接线（原生 position="top-left"，不用 CSS 覆盖的原因）+ body data-_ 转发契约引用；daily log 记录本 plan 诊断→修复→验证链（含 `\_tmp/dingflow-inspect_.mjs` 引述）。`Fix`
- [x] 收尾核对：`_tmp/dingflow-inspect*.mjs` ×6 + probe 脚本已删除；无残留调试代码。`Follow-up`

Exit Criteria:

- [x] e2e grep 全量通过（含新增 spec 6 例），零新增失败。
- [x] 文档已同步（tree-mode.md + daily log）；临时脚本已清理。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session ×2（round 1: `ses_02b92ec77ffepZqp69jC22DXyu`，round 2: `ses_02b8cd4dbffeWHFePCGZdq0KeC`）
- Verdict: round 1 `revised`（2 Major：schema 类型 index signature TS2413、@layer CSS 覆盖 react-flow 无 layer 规则失效）；round 2 `pass-with-minors`（唯一残留为 Phase 3 一项缺 Item Type 标注，起草者升级 active 时已补）
- Rounds: 2
- Findings addressed: Major1 删除 Phase 1 类型改动（BaseSchema 的 `[key: string]: SchemaValue` 已覆盖，渲染器窄化读取）；Major2 改用 React Flow v12 原生 `position="top-left"` prop；Minor ×4 全部处理（fields.ts 行号 49→52、Source 改引 `_tmp/dingflow-inspect*.mjs` 并注明日志节 Phase 5 补写、demo 目录路径补 `pages/` 前缀、Phase 1/2/4/5 逐项补 Item Type 标注）。

## Closure Gates

- [x] flex/text/icon 已转发 schema 作者 `data-slot`/`data-*`，契约测试证明行为（含不转发非 data-\* 键、空值跳过、number 字符串化）。
- [x] flow-designer 钉钉审批流卡片视觉与 demo 一致（computed-style e2e 断言：header 色带 #576a95/#ff943e/#3296fa/#6366f1/#8b5cf6、白字、条件绿 #15bc83、圆点 end 节点），无白条残留。
- [x] 分支线上渲染 branch.data.label 标签（单测 5 例 + e2e 几何断言 4 标签 y 值落在线上），TB/LR 均覆盖。
- [x] features.minimap/features.controls 接线生效（先红后绿测试），controls 左上角（position="top-left"）/minimap 右下角位置有 e2e 断言。
- [x] 布局算法与可配置方案保持 plan 453 基线；「+ 按钮位置」已实证正确并纳入 e2e 锁定（添加分支按钮中心与 split/merge 线重合 ±2px）。
- [x] 受影响的 owner docs（renderer-markers-and-selectors.md、flow-designer tree-mode.md、daily log 2026/08-06.md）已同步。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### dingtalk-flow-demo 条件插入布局缺陷

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 用户要求的目标形态在 flow-designer（统一算法）实现；demo 为 legacy 参考原型，其 `insertBranch` 布局缺陷（平移量固定导致嵌套分支错位）不影响本 plan 的 supported baseline。
- Successor Required: yes
- Successor Path: demo 页统一/废弃决策（含 legacy 常量清理）另立 plan。

### 其他 renderer 的 data-\* 转发

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本次仅 designer body 实际消费的 flex/text/icon；container/page 等如后续需要，按同机制（helper + 契约测试）扩展，机制已沉淀。
- Successor Required: no

## Non-Blocking Follow-ups

- `.fd-xyflow-controls` 的 `showInteractive` 交互按钮（目前 false）如需启用，评估后另议。
- 分支标签的 i18n（标签数据来自 branch.data，宿主自带语言）——非本 plan 范围。

## Closure

Status Note: 独立 fresh closure-audit 核验通过——Phase 1–5 全部落地且退出标准逐条成立：flex/text/icon 的 `data-*` 转发有契约测试（6 例）与 live DOM 实证（e2e 卡片 variant 断言）；分支标签（split edge `data.label` → 钉钉绿 pill）有单测 5 例 + e2e 几何断言；features.minimap/controls 接线有先红后绿测试 + Controls `position="top-left"` live 实证；全量验证由 mission-driver full-green run 与本次 audit 复跑共同背书。deferred 两项均为 out-of-scope improvement，分类诚实；无剩余 plan-owned work，正式关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh closure-audit sub-agent session（不复用执行者上下文，opencode，2026-08-06）
- Evidence:
  - Phase 1：`packages/flux-renderers-basic/src/utils.ts:13`（collectDataAttrs 白名单规则）+ `flex.tsx:61,65` / `text.tsx:139,144` / `icon.tsx:40,44` spread；`__tests__/data-attrs-passthrough.test.tsx` 6 例（flex/text/icon 转发、非 data-\* 不转发、空值/布尔/对象跳过、number 字符串化）；`docs/architecture/renderer-markers-and-selectors.md:188`「Schema-Authored Data Attributes」节；包测试复跑 47 文件/472 测试全绿。
  - Phase 2：`tests/e2e/flow-designer-dingtalk-visual.spec.ts` 6 例；audit 复跑 `playwright test flow-designer-dingtalk-visual.spec.ts` 6/6 passed（variant 属性、header 色带 #576a95/#ff943e/#3296fa/#6366f1/#8b5cf6 + 白字 + 条件绿 #15bc83、end 圆点、+ 按钮在线上、分支标签在线、minimap 右下/controls 左上）。
  - Phase 3：`packages/flow-designer-renderers/src/dingflow/ding-flow-edge.tsx:74-109`（split + data.label → EdgeLabelRenderer pill，TB/LR 对称、pointer-events-none、truncate）；`ding-flow-edge.test.tsx:110`「DingFlowEdge branch label」describe 5 例；flow-designer-renderers 复跑 31 文件/216 测试全绿。
  - Phase 4：`flow-designer-core/src/core/config.ts:28-29`（controls 默认 true）+ `types.ts:223-229`（DesignerFeatures.controls）；`designer-canvas.tsx:396-397`（showMinimap/showControls 接线）；`designer-xyflow-canvas.tsx:382`（`<Controls position="top-left">`）；`designer-canvas-features.test.tsx` 2 例；dingtalk schema `features.minimap/controls: true`（schema JSON 628-629）；flow-designer-core 复跑 9 文件/175 测试全绿。
  - Phase 5：`docs/architecture/flow-designer/tree-mode.md:134,203,205`（data-_ 转发契约引用、分支标签渲染、features 接线）；`docs/logs/2026/08-06.md` 首条执行记录；`\_tmp/dingflow-inspect_.mjs` 已清理（glob 无匹配）。
  - 全量：mission-driver full-green run（typecheck/build/lint 32/32 + test 59/59）记录于 daily log；e2e grep 58 passed/4 skip 记录一致，audit 复跑新增 spec 6/6 全绿。
  - deferred 诚实性：demo 原型 insertBranch 缺陷（`out-of-scope improvement`，legacy 参考页显式 Non-Goals/Out Of Scope，successor 已登记）与其他 renderer data-\* 转发（`out-of-scope improvement`，scope 显式限定 flex/text/icon，机制已沉淀）均非 in-scope defect/contract drift，分类成立。

Follow-up:

- no remaining plan-owned work
