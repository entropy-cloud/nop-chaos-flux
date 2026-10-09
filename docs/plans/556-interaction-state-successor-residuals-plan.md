# 556 interaction-state successor-required 收口批——gantt-001 live bisect 裁决 + taskflow-002 残余修复

> Plan Status: completed（2026-10-09 draft review R1 FAIL→修订→R2 pass；closure audit R1 APPROVED——agent_3b5c3693）
> Last Reviewed: 2026-10-09
> Source: `docs/audits/interaction-state/ledger.md`（仅有的两行 successor-required：IS-lab-gantt-001、IS-taskflow-designer-002）；`docs/audits/interaction-state/is8c-renderer-lab/findings.md`；`docs/audits/interaction-state/is4-designers/findings.md`；`docs/backlog/interaction-state-quality-roadmap.md`
> Related: `docs/plans/554`（gantt-001 successor 登记）、`docs/plans/547`（taskflow-002 successor 登记）、`docs/plans/555`（IS-9 Deferred 正式登记）

## Purpose

IS 轨道收口后的两行 successor-required P1 专案：①IS-lab-gantt-001 按三候选诊断完成 live bisect，把裁决（修复 / 撤案 / 降级 watch）落账并钉住回归守护；②IS-taskflow-designer-002 残余（tree-tab Save 同步 + Import 输入 UI + graph-tab Export 假反馈）修到行。随批复测 IS-lab-gantt-002（登记为"随 gantt-001 修复后复测"）。

## Current Baseline

（以下全部为 2026-10-09 执行 session 在 dev server 127.0.0.1:4175 实测取证，非静态推断。）

### IS-lab-gantt-001（P1，is8c 登记：对话框场景条逃逸 + 条上 pointerdown 静默 dismiss）

- 复现环境：`#/lab/gantt` → "Host gantt in dialog" scenario → Open gantt dialog（`c9GanttDialogSchema`，3 任务，无 `draggable`）。
- 实测几何（viewport 1280×720）：dialog surface x 640..1200（560px）；gantt 根 x 680..1160；timeline 滚动视口（`h-full overflow-auto`）x 1006..1160（**154px**，scrollWidth 1120）；bars 层 `[data-slot="gantt-bars"]`（absolute left-0 top-0 width:100%）x 1006 宽 154；三条 bar rect x 1086..1366 / 1286..1646 / 1566..1846——**rect 超出 dialog 右缘（920/1200 两代布局均超）**。
- **逃逸半案证伪**：截图证明条被 timeline `overflow-auto` 视口裁剪（可见部分止于视口右缘，dialog 右缘外无条像素）；`elementFromPoint` 在裁剪视口右缘之外命中 dialog body/backdrop 而非条。bar rect 超界部分是 scroll-content 布局坐标（可滚动内容），不是绘制逃逸。is8c 的定罪读数（"条 x 1333–1613 vs dialog 570–1130"）即此 rect-vs-paint 背离——**探针伪影类**（550 kanban-perf 自动滚动、554 barcode 键名同类）。（本行 "dialog 右缘" 引用的是 640..1200 代读数；另一代 360..920 读数的可靠性见 dismiss② 注，证据卡一律以 Phase 1 popup rect 对账后的几何为准。）
- **dismiss 半案分解**：①受控实验——从条与裁剪视口的真实交集区 pointerdown+小幅 drag（cua.drag 路径起点 (1120,235)，位移 ~30px）：**dialog 保持打开**（条未移动，见③）；对照实验——dialog 体内非条区按下+拖动：dialog 保持打开。②从条 rect 区但在裁剪视口之外按下：真实命中目标是裁剪视口之外的 dialog body/backdrop（命中测试在视口右缘外不再命中条）→ 若落在 backdrop 则 Base UI `outside-press` 关闭——**对话框关闭是正确语义被 rect 推导瞄准误归因为"条上按下"**；早期一次 dismiss 复现发生在未同帧测量的陈旧布局代（pane 重排前后 dialog rect 读数 640..1200 与 360..920 并存，`[role="dialog"]` 与 `nop-dialog` 元素同一性存在歧义），该次读数不可靠，以受控实验为准；Phase 1 落证据卡前须以 `data-slot="dialog-surface"` 的实际 popup rect 对账几何。③拖拽使能：**`gantt.tsx` 为 `resolved.draggable !== false` —— schema 省略即默认开启**，lab schema 未显式关闭；实测小幅 drag（~30px < 1 cellWidth）条未动，候选归因为 `dayDelta = round(dx/cellWidth) = 0` 不提交——该归因与「满格拖拽是否移动条、拖拽中途 dialog 是否 dismiss」一并留 Phase 1 live 判定（这是原 finding 第二半在真实拖拽条件下的直接检验）。已有 committed e2e `tests/e2e/component-lab/c9-host-surfaces.spec.ts` 断言对话框内条点击派发 onTaskClick 成功（绿）。
- 三候选裁决：**dialog transform**——在场（`nop-dialog` position:fixed + `transform: matrix(1,0,0,1,0,0)`）但对裁剪/命中无作用（identity、条是 absolute 非 fixed），排除；**裁剪链**——`overflow-auto` 工作正常（正是裁剪者），"无 clip"候选不成立；**scroll-sync**——`useGanttScroll` 仅垂直同步（plan 545 设计：grid 水平滚动不写 store.scrollLeft），与本案无关，排除。渲染器侧唯一待检验残余 = 满格拖拽在对话框内的行为（见③，Phase 1 live 判定）。
- IS-lab-gantt-002（P3 watch，"随 gantt-001 修复后复测"）：resize 手柄 rect 区跨 dialog 边界（1127..1133 vs 1130）与 scrollLeft 0→54 来源未定位——手柄 rect 同属 scroll-content 坐标（同类伪读数候选）；scrollLeft 来源待 live 重定位。

### IS-taskflow-designer-002（P1 残余，is4 登记：tree-tab Save + Import UI）

- tree tab（`#/taskflow-designer` → TaskFlow (Tree)，`taskflow-dingflow-schema`，doc kind `nop-taskflow-dingflow`）：Save → 错误 toast "No authoring model available."；Export → 错误 toast "No authoring model available. Call set-authoring-model first."。根因：`taskflow-designer-lib/index.ts` 的 `flushDesignerProjectionIntoModel` 对 `doc.kind !== 'nop-taskflow-workflow'` 原样返回 model（fresh page 为 null）——tree 文档无 doc→model 同步路径（551 注记的 successor gap）；而 lib 已有 `syncFromTreeDocument`（要求 TreeDocument：root/child/branches）与 `projectToTreeDocument`。
- graph tab Export 假反馈：点 Export → 成功 toast "已导出到检查器输出"，但 `designer-toolbar.tsx` 的 `invokeAction` 丢弃返回值、lib `export-json` 为纯函数、无 clipboard/检查器去向（右侧检查器实测只有节点属性，页面无 DSL 可见）——**F 类假成功反馈仍在**（547 只验证了 Save toast）。tree tab Export 同按钮。
- Import（两 tab）：工具栏 `invokeAction` 恒以 `payload=undefined` 调 provider → lib `import-json` 报 "import-json requires a valid nop-task JSON payload"——无输入 UI 且工具栏通道结构性不可传 payload。
- 可用既有面：designer 内建 `designer:export`（`designer-toolbar.tsx` 原生支持，toggle `designer-json-panel`，`core.exportDocument()` 真实文档 JSON）；graph schema 文档键 = 顶层 `document`，tree schema = 顶层 `treeDocument`（导入注入点）；页面已有 `key={activeExample}` 重挂载惯例；页面自注册 `designer` namespace（navigate-back 先例）。
- 附带捕获：切 tree tab 时宿主拒绝噪声 "Tree host input rejected: tree-host-epoch-required"——来源未定位（tree-session epoch 契约），本批 Decision 裁定。

## Goals

- gantt-001/gantt-002 按 bisect 证据落账裁决（修复 / 撤案 / 降级 watch 三择，以 Phase 1 live 判定为准）+ 守护 spec 钉住裁剪/不 dismiss 不变式 + roadmap 就地勘误。
- tree-tab Save/Export 真实可用：投影 doc → dingflow model 同步（lib 层，先红后绿单测）。
- Export 假反馈消除：两 tab Export 按钮改走 `designer:export` 内建 JSON panel（真实面），假 toast 链移除。
- Import 真实可用：粘贴 dialog → lib import-json → 成功后注入画布文档并重挂载 + 真实成功/失败反馈。
- 两项 successor-required 全部收敛（verified 或撤案），ledger/roadmap/dev-log 同步，reconcile 零孤儿。

## Non-Goals

- gantt 渲染器行为改动（bisect 证据支持渲染器裁剪/命中无缺陷；若 Phase 1 满格拖拽判定坐实对话框内拖拽缺陷，该情形升级为 in-scope Fix，不属 Non-Goal）。
- dialog 容器尺寸策略改动（560px dialog 容纳 1120px gantt 属 demo 几何选择，可用性靠滚动保证——watch 注记）。
- `taskflow:export-json`（DSL lowering）的 UI 化：保留为 lib API（单测覆盖），不另建 DSL 导出面板。
- 树/图文档双向所见即所存编辑增强（超出本次 finding 范围）。

## Scope

### In Scope

- ledger 两行改判/翻转 + is8c/is4 证据卡附节 + roadmap IS-4/IS-8c/IS-9 行就地勘误注记。
- `tests/e2e/renderer-lab-c-interaction-state.spec.ts`（新建，554 留空位）：裁剪不变式 + 可见条区按下不 dismiss + backdrop 点击 dismiss（防过度抑制）三断言。
- `apps/playground/src/taskflow-designer-lib/`：tree 投影→model 同步 + bootstrap dingflow model；`import-json` 返回值补 tree 投影。
- `apps/playground/src/pages/taskflow-designer-page.tsx` + 两个 schema JSON：Export 按钮改 `designer:export`；Import 粘贴 dialog + 注入重挂载；页面 namespace 扩展。
- `tests/e2e/taskflow-designer-ui.spec.ts` 扩展（tree Save / export panel / import 全旅程）。

### Out Of Scope

- 上列 Non-Goals。
- 554/551 批其余 watch-only 项（处置已显式登记，不在本批）。

## Failure Paths

| 编号                | 触发                           | 行为                                                                          | 可重试 | 用户可见表现          |
| ------------------- | ------------------------------ | ----------------------------------------------------------------------------- | ------ | --------------------- |
| import-invalid-json | 粘贴非 JSON/非法 nop-task DSL  | lib 返回 ok:false + 错误消息；toast error 显示原因；画布与模型不变            | 是     | 红色 toast 错误消息   |
| import-valid        | 粘贴合法 DSL                   | 模型替换 + 画布文档注入重挂载 + success toast（含节点计数）                   | 是     | 绿色 toast + 画布更新 |
| tree-save-fresh     | tree tab 未初始化模型直接 Save | 投影同步 bootstrap dingflow model → 校验 → 已保存 toast；校验失败则错误 toast | 是     | 绿/红 toast           |
| export-any-tab      | 任一 tab 点 Export             | `designer-json-panel` 打开并显示当前文档 JSON                                 | 是     | JSON 面板             |

## Test Strategy

本档选择：**必须自动化**。

- tree 同步：lib 单测先红（现实现对 tree 投影原样返回）后绿；e2e 判别断言 = 旧实现下 Save 出 "No authoring model available." 错误 toast、新实现出 "已保存"（判别机制：旧实现 fresh tree page 无同步路径必然报错）。
- Export：e2e 判别断言 = 旧实现出 "已导出到检查器输出" toast 且 `designer-json-panel` 不出现；新实现 panel 出现且无该 toast。
- Import：e2e 判别断言 = 旧实现点 Import 出 payload 错误且无 dialog；新实现 dialog 打开 → 粘贴 → 画布节点计数变化 + success toast。
- gantt 守护 spec：钉住已证实的正确行为（当前全绿），属撤案守护非缺陷判别——不适用先红后绿，plan 内注记。

## Execution Plan

### Phase 1 - gantt-001/002 裁决落账 + 守护 spec

Status: completed
Targets: `docs/audits/interaction-state/ledger.md`、`docs/audits/interaction-state/is8c-renderer-lab/findings.md`、`tests/e2e/renderer-lab-c-interaction-state.spec.ts`、`docs/backlog/interaction-state-quality-roadmap.md`

- Item Types: `Proof | Decision | Fix`（Fix 仅在满格拖拽判定坐实渲染器缺陷时触发，落本 Phase 内，不降级）

- [x] Proof：`renderer-lab-c-interaction-state.spec.ts` 断言组（①裁剪不变式：dialog 内 gantt 打开后，`elementFromPoint` 在 timeline 视口右缘之外不命中 `[data-slot="gantt-bar"]`；②可见条区 pointerdown+小幅 drag 后 dialog 仍在；③backdrop 点击 dialog 关闭——防过度抑制回归；④满格拖拽判定结论的行为断言——若满格 drag 移动条且 dialog 不 dismiss，则断言之；若坐实缺陷则落本 Phase Fix 项）。
- [x] Proof：满格拖拽 live 判定——从可见条区 pointerdown 起拖 ≥1 cellWidth：观察条是否移动/commit、dialog 是否被中断 dismiss（原 finding 第二半在真实拖拽条件下的直接检验）；坐实缺陷则落本 Phase Fix 项，否则定②④断言形态。
- [x] Proof：popup rect 对账——以 `data-slot="dialog-surface"` 元素 rect 为准重测 dialog/timeline/bar 几何，消除 `[role="dialog"]` 与 `nop-dialog` 元素同一性歧义（baseline 两代读数 640..1200 / 360..920），对账后的几何入证据卡。
- [x] Proof：gantt-002 live 复测——resize 手柄 rect 同类核对（裁剪区外命中测试）+ grid scrollLeft 0→54 来源重定位（滚轮/键盘/自动化滚动逐一试探）；结论（撤案或 watch 保留）落 is8c 卡。
- [x] Decision：ledger `IS-lab-gantt-001` 行 disposition 改判 `withdrawn (live-bisect probe artifact: rect-vs-paint divergence; clip + no-dismiss invariants pinned by committed e2e)`（recurse-001 行格式先例），`IS-lab-gantt-002` 按复测结论改判；is8c 证据卡附节记录 bisect 全读数（几何/命中测试/截图结论/三候选裁决/受控实验）。
- [x] Proof：roadmap IS-8c/IS-9 行就地勘误注记（gantt-001 successor-required → 556 撤案裁定；不改写历史文本、就地附注）。

Exit Criteria:

- [x] 守护 spec 断言组全绿（`npx playwright test renderer-lab-c-interaction-state --reporter=list`）。
- [x] 满格拖拽判定与 popup rect 对账结论落 is8c 卡附节（几何/命中测试/受控实验/三候选裁决全读数）。
- [x] ledger 行改判与 is8c 卡附节落盘，reconcile exit 0（findings 计数口径注记：撤案行仍计 found，recurse-001 先例）。
- [x] roadmap 勘误注记在案。

### Phase 2 - taskflow lib tree doc→model 同步（先红后绿）

Status: completed
Targets: `apps/playground/src/taskflow-designer-lib/index.ts`、`sync.ts`（或新模块）、`sync.test.ts`

- Item Types: `Fix | Proof`

- [x] Proof：单测先红——`flushDesignerProjectionIntoModel`（或等价入口）收到 `nop-taskflow-dingflow` 投影 doc 时，现实现原样返回（fresh 为 null）→ 断言应得 bootstrap dingflow model + steps 与投影结构一致。（4 新例 red 实测：4 failed | 7 passed → 实现后 11/11 绿）
- [x] Decision：tree 重建规则——以 live 探针取 dingflow demo 的实际投影 doc 形状（nodes/edges、chain/branch 边表达）为准，裁定「投影→TreeDocument 复用 `syncFromTreeDocument`」或「直接投影→steps 同步」；分支标签→`TaskFlowTreeBranchType` 映射规则一并落定（裁决与读数入 is4 卡附节）。
- [x] Fix：实现 tree 投影同步 + fresh-page dingflow model bootstrap（profile 'dingflow'、steps 数组），Save/Export/enter/exit-container 共用路径全通。
- [x] Proof：`import-json` 返回值扩展——tree profile 根返回 `projectToTreeDocument` 结果（现仅 workflow 投影），单测覆盖。
- [x] Proof：`pnpm --filter @nop-chaos/flux-playground test -- taskflow-designer-lib` 全绿（既有 lib 单测 sync.test.ts 零回归）。（11/11）

Exit Criteria:

- [x] 判别性单测（旧实现必挂：tree 投影同步断言）红→绿记录在案。
- [x] taskflow-designer-lib 单测套件全绿。

### Phase 3 - taskflow demo Export/Import 真实化 + e2e

Status: completed
Targets: `apps/playground/src/pages/taskflow-designer-page.tsx`、`apps/playground/src/schemas/taskflow-{workflow,dingflow}-schema.json`、`tests/e2e/taskflow-designer-ui.spec.ts`

- Item Types: `Fix | Proof | Decision`

- [x] Fix：两 schema Export 按钮 action `taskflow:export-json` → `designer:export`，删除假 toast then 链（"已导出到检查器输出"）。
- [x] Fix：Import 真实化——页面 namespace 增方法（打开粘贴 dialog，`@nop-chaos/ui` Dialog+Textarea）；确认后调 lib `import-json`（payload=pasted JSON）；ok 则把返回投影注入当前 tab 文档键（graph `document` / tree `treeDocument`）并按 `key` 惯例重挂载 + success toast（含节点计数）；失败 toast 错误消息。schema Import 按钮 action 指向页面方法。执行注意：注入须作用于页面传入 `SchemaRenderer` 的 schema 对象（`taskflow-designer-page.tsx` 同时传 `schemaUrl` 与 `schema` 对象，注入以实传对象为准并在现场确认 URL resolver 语义），`key` 需扩展为含 import epoch（`key={activeExample}` 现惯例之上）。
- [x] Decision：`tree-host-epoch-required` 宿主拒绝噪声定位（tree-session epoch 契约 vs demo 接线）——小则顺手修，大则 watch-only 登记（裁决入 is4 卡）。
- [x] Proof：e2e 扩展（新建 `taskflow-io-interaction-state.spec.ts` 5 用例 + `taskflow-designer-ui.spec.ts` Export 断言按新面更新——四 spec 21/21 绿）——①tree tab Save → "已保存" toast（红→绿判别）；②graph+tree tab Export → `designer-json-panel` 可见且有文档内容、无假 toast（红→绿判别）；③Import 全旅程：开 dialog → 粘贴合法 DSL → 画布节点计数变化 + success toast；④非法粘贴 → error toast + 画布不变。

Exit Criteria:

- [x] e2e 全绿（5 用例；红态取证 = toast 措辞英文初稿与 tree-host 拒绝噪声的逐条实测输出 + tree Save 旧行为 "No authoring model available." toast 为 556 前基线读数，见 is4 卡附节）。
- [x] 假反馈三面（graph Export 假 toast、tree Save/Export 错误 toast、Import 死钮）全部消除。

### Phase 4 - 收口回写

Status: completed
Targets: `docs/audits/interaction-state/ledger.md`、`docs/backlog/interaction-state-quality-roadmap.md`、`docs/logs/2026/10-09.md`、is4/is8c 证据卡

- Item Types: `Proof`

- [x] Proof：ledger `IS-taskflow-designer-002` 行 found→verified（残余全收）；reconcile exit 0 全等复核。（exit 0：audited 257 / findings 169 = found 118 + verified 51；审计员独立复跑全等）
- [x] Proof：roadmap IS-4 行就地勘误（taskflow-002 残余已在 556 收口）+ Successor 批登记行；dev log 556 条目。（均落盘）

Exit Criteria:

- [x] ledger/roadmap/dev-log 三面一致；reconcile exit 0。（审计员独立复核一致）

## Draft Review Record

- Reviewer / Agent: agent_418a0b48（fresh session 独立子 agent，2026-10-09）
- Verdict: `pass`（R1 FAIL——1 Major：baseline③ draggable 因果写反（实为 `resolved.draggable !== false` 默认开启，"拖拽不动"须另行归因）+ 5 Minor（popup rect 读数内部互斥、lib 单测套件措辞、Phase 4 门禁重复、Goals 预写裁决结论、Import 注入机制留白）；修订后达零 Blocker/Major）
- Rounds: 2
- Findings addressed: 6/6（M1 baseline③ 重写 + 满格拖拽升级为 Phase 1 live 判定项；m1 popup rect 对账入 Phase 1；m2 措辞；m3 Phase 4 门禁删除；m4 Goals 措辞；m5 注入机制执行注意）

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（P0/P1 verified 或显式撤案/watch 裁定）——taskflow-002 verified；gantt-001/002 撤案（bisect 证据）；004 watch 显式登记
- [x] 所有 in-scope confirmed contract drifts 已收敛（裁决全落 ledger/证据卡）
- [x] 行为/契约结果已达成（守护 spec 3/3 + taskflow-io 5/5 + 四 spec 21/21 + 两 successor 行收敛）
- [x] 必要 focused verification 已完成（含判别性红→绿记录：lib 4 新例 red 4 failed|7 passed → 11/11；审计员经 git show HEAD 旧实现核对判别机制结构性成立）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（004 watch 登记含定位+successor；审计复核确认零静默）
- [x] 受影响的 owner docs 已同步到 live baseline（ledger/roadmap/dev-log/is4/is8c 证据卡）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（agent_3b5c3693 R1 APPROVED——零 Blocker/Major，4 Minor 非阻塞）
- [x] `pnpm typecheck`（42/42；审计独立复现）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42）
- [x] `pnpm test`（78/78 任务；审计独立复现 playground 411/411 + sync 11/11）
- [x] `pnpm check`（exit 0 零新增未登记红；审计独立复现）

## Deferred But Adjudicated

（起草期无；执行中改判当场落此节。）

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: 2026-10-09 收口。两行 successor-required P1 全部收敛：IS-lab-gantt-001/002 经 live bisect 撤案（探针伪影：rect-vs-paint 背离 + backdrop outside-press 误归因；守护 spec 钉住裁剪/不 dismiss/拖拽提交不变式）；IS-taskflow-designer-002 修复 verified（tree 投影同步 v1 契约 + Export 真面 + Import 粘贴 dialog 画布注入重挂载，判别性单测红→绿与 e2e 5/5）。顺带修复 projectToTreeDocument tf-\* 前缀休眠缺陷；新 watch 行 IS-taskflow-designer-004 显式登记零静默。审计 Minor 处置：m1 回填动作已落（本节）；m2 已修（treeCtxWithDoc 返回类型 ActionContext）；m3（plan 断言组枚举 vs 3 用例措辞）与 m4（spec 未用 hitPopup 诊断字段）接受为非阻塞表述性残余——is8c 卡附节已如实记载 3 用例口径。

Closure Audit Evidence:

- Auditor / Agent: agent_3b5c3693（fresh session 独立子 agent，2026-10-09）
- Evidence: R1 **APPROVED**（零 Blocker / 零 Major，4 Minor 非阻塞）。独立复核：reconcile exit 0 全等（257/169/118/51）；sync.test 11/11 + playground 全套 411/411 复跑；四 e2e spec 21/21 复跑；typecheck/check exit 0 复现；红→绿判别机制经 git show HEAD 旧实现核对结构性成立（旧 flush 对 tree doc 必返 null → save/export ok:true 断言必挂；旧 import-json 无 projectedTreeDoc 字段）；designer:export→designer-json-panel 真面链路与 Import 全链路（taskflow-page namespace → dialog → importParser → 注入重挂载）逐环核真；004 watch 行定位（tree-session.ts:430）与 successor 说明在案；无 in-scope live defect 静默降级。Minor：m1 回填动作（本节）/ m2 类型卫生（已修）/ m3、m4 表述性（接受，见 Status Note）

Follow-up:

- IS-taskflow-designer-004（watch-only，显式登记）：tree-session epoch/ack 握手溯源（tree-tab entry 伪错误 toast 根因）为独立 successor。
- 见 Deferred But Adjudicated。
