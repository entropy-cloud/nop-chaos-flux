# 557 taskflow 设计器 UI 质量批——树模式调试残留清除 + 节点卡设计对标 flow designer

> Plan Status: completed（2026-10-09 draft review R1 revised→修订→R2 pass；closure audit R1 APPROVED——agent_6da51bfa）
> Last Reviewed: 2026-10-09
> Source: 用户反馈（taskflow UI 与 flow designer 差距大、"+号位置不对"）；2026-10-09 live 取证（`#/taskflow-designer` 双 tab 截图 + DOM 读数 vs `#/flow-designer` 工作流/钉钉审批流基准）；`packages/flow-designer-renderers/src/designer-page-body.tsx`、`designer-xyflow-canvas/designer-xyflow-node.tsx`、`apps/playground/src/schemas/taskflow-dingflow-schema.json` vs `dingtalk-workflow-tree-schema.json`
> Related: `docs/plans/556`（taskflow-002 修复批，本批不动其行为面）

## Purpose

把 taskflow 设计器（尤其 Tree tab）的 UI 质量拉齐 flow designer 基准：①清除树模式调试残留（每次 snapshot 变更无条件 emit 布局 JSON info toast，堆栈盖住检查器）；②taskflow 树节点从极简 icon+text 升级为参考级卡片设计（icon+标题头行 + 副标题行、卡片 chrome、正确尺寸），使 + 号锚定、分支 pill 居中、整体节奏与钉钉审批流参考一致。

## Current Baseline

（2026-10-09 live 截图 + 代码取证。）

### 缺陷清单（对比基准：`#/flow-designer` 工作流 tab + 钉钉审批流 tab）

- **D1 调试 toast 堆栈（renderer bug）**：`designer-page-body.tsx:152-158` 在 `config.documentMode === 'tree'` 时对**每次** `statusSnapshot` 变更无条件调用 `emitTreeLayoutDebugSnapshot`（`tree-layout-debug.ts`，`env.notify('info', '[flow-designer tree-layout] ' + 全量布局 JSON)`）→ 进入 tree tab 即弹 2+ 条 info toast、每次编辑继续堆栈，遮盖右侧检查器。`tree-layout-debug.ts` 为调试遗留；无任何测试钉住该 emit（grep tests 零命中）；graph 模式无此调用。
- **D2 树节点卡退化（schema 设计）**：`taskflow-dingflow-schema.json` nodeTypes body 为极简单行（icon + `${step.common.displayName || step.common.name}`，appearance minWidth 130/minHeight 44（tf-if/tf-choose 为 140×44），entry 80×32）——渲染走 `designer-xyflow-node.tsx` 的 body 模板路径（非兜底），视觉为裸文本。参考 `dingtalk-workflow-tree-schema.json`：双行卡片（header icon+`${label}` 行 + 动态内容行），`dt-node-root`/`dt-node` data-slot 主题类，minWidth 220/minHeight 80。
- **D3 几何比例失调（+号悬空 / 分支 pill 观感，随 D2 派生）**：+ 号（`ding-flow-plus-button.tsx`）锚定父子真实间隙中点（`mainOffset = __fdChainGap/2 + BTN_DIAMETER/2`，`designer-xyflow-node.tsx:350-354`），分支添加 pill（`DingFlowAddBranchOverlay`）经 ViewportPortal 由 `computeDingFlowOverlays` 定位（TB：x = owner 卡水平中心，y = 卡底与分叉线间隙带中点，`dingflow-overlays.ts:96-101`）——几何锚定本身正确；观感差是**比例问题**：小卡（44px 高、130/140 宽）+ layerSpacing 80 下间隙显空旷、pill（约 76px 宽）在窄卡上贴近边缘。参考（80px 卡 + layerSpacing 100、nodeSpacing 60）+ 号紧贴卡下、pill 居中从容。同一渲染器，卡片尺寸/间距配置是唯一变量——执行时以 DOM 读数重测 pill 与卡的真实空间关系后再定断言对象。
- **非缺陷对照**：缩放控件（+/−/全屏）位于画布左上——flow designer 基准同位，不改。graph tab 节点卡已对标（192×112 + node-card 类，与 workflow-designer-schema 同规格），不在本批。

### 关联面

- ledger `taskflow-designer` 页已有 IS-taskflow-designer-001..004 行；D1 为新发现（本批登记并修复），D2/D3 为 schema 设计债（用户反馈驱动，登记后随批 verified）。
- IS-taskflow-designer-004（tree-tab entry 伪错误 toast，tree-session epoch/ack 握手）为已登记 watch——**不在本批**（独立 successor）；D1 修复后 info 堆栈消失但该 error toast 仍在（两者不同源）。

## Goals

- tree tab 进入后零 `[flow-designer tree-layout]` toast（先红后绿）。
- taskflow 树节点为参考级卡片：节点卡含 icon+标题头行与副标题行、data-slot 标记、minWidth 220/minHeight 80 级尺寸；`+` 号紧贴卡下间隙中心、分支添加 pill 居中卡内（截图 + DOM 读数佐证，程序化断言钉住）。
- 现有 taskflow 相关 e2e 与 dingtalk 参考 spec 零回归。

## Non-Goals

- IS-taskflow-designer-004 握手根因修复（独立 successor）。
- graph tab 节点卡/工具栏重设计（已对标）；缩放控件移位（基准同位）。
- dingtalk-workflow-tree / action-flow-tree 参考 schema 改动。
- 树布局算法/ELK 参数调整（仅 schema 级 treeConfig 数值）。

## Scope

### In Scope

- `packages/flow-designer-renderers/src/designer-page-body.tsx`：移除调试 emit（useEffect + import）；`tree-layout-debug.ts` 去留裁定（无消费者则一并删除或保留导出+注释，裁定入卡）。
- `apps/playground/src/schemas/taskflow-dingflow-schema.json`：nodeTypes body/appearance/tree.layoutSize 重设计；`apps/playground/src/flow-designer-nodes.css` 新增 tf-node 主题块（对齐 dingtalk 参考结构：头行 icon+名称、副标题行步骤类型/关键属性、data-slot 主题类）；treeConfig 间距调优。
- e2e：tree tab 零布局 toast 断言（红→绿）+ 节点卡结构断言（data-slot/尺寸）+ 既有 spec 回归。

### Out Of Scope

- 上列 Non-Goals。
- 556 批行为面（Save/Export/Import）重做。

## Failure Paths

| 编号             | 触发                                         | 行为                                                 | 可重试 | 用户可见表现            |
| ---------------- | -------------------------------------------- | ---------------------------------------------------- | ------ | ----------------------- |
| tree-card-render | 新 body 模板字段缺数据（如 step props 缺省） | 模板表达式空串兜底，卡片骨架不塌                     | 是     | 卡片显示名称/类型默认值 |
| schema-invalid   | nodeTypes 改动破坏校验                       | createTreeDesignerCore 校验失败 → 错误面（e2e 捕获） | 是     | 错误提示                |

## Test Strategy

本档选择：**必须自动化**（UI 结构面程序化断言；视觉截图仅佐证不入证）。

- D1 判别：`tests/e2e/taskflow-designer-ui.spec.ts` 新增用例——tree tab 进入+一次编辑后 `[data-sonner-toast]` 中不含 `tree-layout`（旧实现必挂：进入即 2+ 条）。
- D2 判别：同文件新增用例——树节点卡 data-slot 标记存在 + 卡片**渲染布局宽（offsetWidth）** ≥ 200（旧配置 130/140 必挂；tree 模式外观走 layoutSize 写入的布局尺寸，`getComputedStyle().minWidth` 量不到——测量口径为 bounding box）。
- 回归：taskflow-designer-ui 8 例、taskflow-io 5 例、designer-interaction-state 5 例、钉钉参考相关 spec（flow-designer-\* 命中的）全绿。

## Execution Plan

### Phase 1 - D1 调试残留清除（先红后绿）

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-page-body.tsx`、`tree-layout-debug.ts`、`tests/e2e/taskflow-designer-ui.spec.ts`

- Item Types: `Fix | Proof`

- [x] Proof：`tests/e2e/taskflow-designer-ui.spec.ts` 新增判别用例先红——进入 tree tab 并触发一次编辑后，sonner toast 不含 `[flow-designer tree-layout]`（旧实现进入即 2+ 条，实测在案）。
- [x] Decision：`tree-layout-debug.ts` 去留——emit 调用移除后若无任何消费者，删除模块；若保留调试能力则改为显式 flag 门控（默认关）。裁决与理由入证据节。
- [x] Fix：移除 `designer-page-body.tsx` 的无条件 emit（useEffect + import）。
- [x] Proof：红→绿（红态 2 次重试均 failed：layout toasts 非空 → 移除后 passed）+ 包单测 296/296 零回归 + 受影响 e2e 全绿。模块已删除（无消费者）。

Exit Criteria:

- [x] 判别 e2e 红→绿记录在案；`pnpm --filter @nop-chaos/flow-designer-renderers test` 全绿（296/296）。

### Phase 2 - D2/D3 树节点卡设计对标 + 间距调优（Proof 先行）

Status: completed
Targets: `apps/playground/src/schemas/taskflow-dingflow-schema.json`、`apps/playground/src/flow-designer-nodes.css`、`tests/e2e/taskflow-designer-ui.spec.ts`

- Item Types: `Proof | Fix`

- [x] Proof：先落 D2 判别断言并对**旧配置**记录红（旧配置下 tf-node 零命中 → failed 2 次重试实测；测量口径勘误：初版用 getBoundingClientRect 被画布 fit-view transform（zoom 0.645）缩水为 129/142，改 offsetWidth 布局像素后 200/220 精确）——树节点卡 data-slot 标记存在 + 渲染宽（bounding box）≥ 200（旧 130/140 必挂；测量口径 = getBoundingClientRect，非 computed minWidth——tree 模式外观尺寸来自 tree.layoutSize 布局写入）。
- [x] Fix：nodeTypes（9 类型）body 重设计（头行 icon + `${step.common.displayName || step.common.name}`——`${label}` 在该上下文解析为节点 id、实测渲染 seq-1 后改回 step 名通道；副标题行静态类型中文 + delay 动态 ms）——参考结构：头行（icon + `${label}`/步骤名）+ 副标题行（步骤类型或关键属性）；appearance minWidth 220/minHeight 80（entry 保持小尺寸但卡片化）；tree.layoutSize 与 appearance 同步。主题类策略：新增 `tf-node-root`/`tf-node` data-slot + `data-node-variant` per type（不复用 dt-_ 命名空间；实际经 data-node-variant 属性 + CSS 属性选择器承载，closure audit m-3 记法统一），CSS 落 `apps/playground/src/flow-designer-nodes.css`（`dt-_` variant 选择器为枚举式先例，新 variant 必须补对应 CSS，否则只有基线样式、"观感对齐"门禁悬空）。
- [x] Fix：treeConfig nodeSpacing 60 / layerSpacing 100（live 截图验收：+ 号贴卡间隙中心、分支 pill 居中卡下、无裸文本节点）。
- [x] Proof：live 验收——树 tab 截图（佐证）+ 程序化读数（节点卡 data-slot 在位、卡片渲染宽 ≥200、+ 号中心与父子间隙中线偏差、分支 pill 与卡的真实空间关系 DOM 读数重测后定断言）；判别断言转绿。几何断言裁定（closure audit m-4 补记）：+ 号锚定公式（chainGap/2 + BTN_DIAMETER/2）与 pill overlay 定位（owner 卡中心 x、卡底-分叉线间隙带中点）为渲染器确定性机制，随卡尺寸/间距变量修复而收敛——最终以卡尺寸断言 + live 截图佐证钉住，未另立几何数值断言。

Exit Criteria:

- [x] 判别断言红→绿记录在案；live 截图观感对齐钉钉参考（彩色头卡 + 号贴卡 pill 居中零调试堆栈；残余 IS-taskflow-designer-004 error toast 为已登记 watch、非本批）。
- [x] 既有 taskflow e2e 全绿（designer-ui 10 含 2 新例 + taskflow-io 5 + designer-interaction-state 5 + renderer-lab-c 3 = 23/23；designer-interaction-state 右键坐标按大卡布局适配——空白区显式坐标）。

### Phase 3 - 台账收口

Status: completed
Targets: ledger、roadmap、dev log

- Item Types: `Proof`

- [x] Proof：ledger 新行登记（IS-taskflow-designer-005 P2/F 调试 toast + 006 P2/C 树卡设计债，均 found→verified）；reconcile exit 0（audited 257 / findings 171 = found 118 + verified 53）。
- [x] Proof：roadmap Successor 批区 557 登记行；dev log 557 条目。（均落盘）

Exit Criteria:

- [x] 三面回写一致；reconcile exit 0。

## Draft Review Record

- Reviewer / Agent: agent_a1edb771（fresh session 独立子 agent，2026-10-09）
- Verdict: `pass`（R1 revised——1 Major：Phase 2 违反 Proof 先行硬规则（guide When Drafting 12）+ 7 Minor（包名 filter 错误、D3 pill 机制描述与代码不符、主题 CSS 落点未写、minWidth 测量口径、tf-if/tf-choose 尺寸概写、日期疑笔误、D1 e2e 落点未点名）；修订后达零 Blocker/Major）
- Rounds: 2
- Findings addressed: 8/8（M1 Phase 2 补 Proof 前置项；m1 包名改正 `@nop-chaos/flow-designer-renderers`；m2 D3 pill 机制按 computeDingFlowOverlays 实况重写；m3 主题类策略 tf-\* + flow-designer-nodes.css 落点写明；m4 测量口径改 bounding box；m5 140×44 勘误；m6 日期 2026-10-09 为 session 实际日期、维持；m7 D1 e2e 落点点名 taskflow-designer-ui.spec.ts）

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（D1 verified；D2/D3 设计债 verified——005/006 台账行）
- [x] 所有 in-scope confirmed contract drifts 已收敛（无——纯 UI/调试残留批）
- [x] 行为/契约结果已达成（零布局 toast + 卡片结构断言 + 观感对齐参考；审计员独立复跑 D1/D2 2/2 + 受影响 spec 15/15）
- [x] 必要 focused verification 已完成（含判别性红→绿记录：D1/D2 各红态 2 次实测）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（004 watch 未动；审计复核确认）
- [x] 受影响的 owner docs 已同步到 live baseline（ledger/roadmap/dev-log/证据节）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（agent_6da51bfa R1 APPROVED——0B/0M，5 Minor 记录卫生项随回填处理）
- [x] `pnpm typecheck`（42 tasks；审计抽查包级 typecheck exit 0）
- [x] `pnpm build`（42 tasks）
- [x] `pnpm lint`（42 tasks）
- [x] `pnpm test`（78/78 任务；审计独立复跑包单测 296/296）
- [x] `pnpm check`（exit 0 零新增未登记红）

## Deferred But Adjudicated

（起草期无；执行中改判当场落此节。）

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: 2026-10-09 收口。D1（树模式调试 emit 遗留，用户可见 toast 堆栈）移除并删模块；D2/D3（taskflow 树节点裸文本 → 参考级卡片）schema + CSS + treeConfig 一次到位，用户两条原始诉求（"+号位置不对/UI 差距大"）经机制分析+卡尺寸/间距变量修复覆盖。判别断言 D1/D2 各红态 2 次实测后转绿；测量口径勘误（fit-view transform → offsetWidth）入档。审计 Minor 处置：m-1 门禁补勾（本节）、m-2 测量文本清洗（本节）、m-3 variant 记法统一为 data-node-variant 属性承载（本节）、m-4 几何裁定补记（Phase 2 末条）、m-5 证据回填（本节）。

Closure Audit Evidence:

- Auditor / Agent: agent_6da51bfa（fresh session 独立子 agent，2026-10-09）
- Evidence: R1 **APPROVED**（零 Blocker / 零 Major，5 Minor 记录卫生项）。独立复核：emit 删除后全仓零悬挂引用；schema 9/9 节点卡结构（tf-node + header + subtitle + layoutSize 同步 + 60/100）程序化核对；tf-node CSS 9 variant 全覆盖在位；D1/D2 判别力机制核对成立并独立复跑 2/2；受影响 spec 15/15 复跑；包单测 296/296 复跑；reconcile 亲跑精确全等（257/171 = 118+53）；IS-004 watch 未被吞、无静默降级；用户诉求覆盖确认。Minor：m-1 门禁回填 / m-2 测量文本清洗 / m-3 记法统一 / m-4 几何裁定补记 / m-5 证据回填——均随本回填落盘

Follow-up:

- 见 Deferred But Adjudicated。
