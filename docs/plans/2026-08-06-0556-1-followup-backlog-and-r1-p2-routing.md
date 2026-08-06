# Follow-up Backlog 收口（F3/F4 微修 + R1 P2 候选 R2 复核与路由）

> Plan Status: active（draft → active：独立子 agent 审查 pass-with-minors，零 Blocker/零 Major，Minor 全部处理，共识达成）
> Mission: component-audit
> Work Item: Follow-up Backlog
> Last Reviewed: 2026-08-06
> Source: `docs/backlog/component-audit-roadmap.md`（Follow-up Backlog 节）、`docs/audits/2026-08-05-0656-open-audit-component-audit.md`（F3/F4）、`docs/analysis/2026-08-05-multi-audit-component-audit/{01,03,14,15,16,17,19,23}.md`（R1 扫描 P2 候选）
> Related: 前置——全部 C\*（C0..C9）与 CX-1..CX-12 `done`；CR/CV/CG 已有 active plan（`2026-08-06-0329-1/2`、`2026-08-06-0343-1`），本 plan 与其无 scope 重叠（R1 P2 候选未被 0529-1 Phase 3/4 登记区覆盖，0529-1 只路由 P0/P1 与 P1 候选 19-1/19-2/23-1/23-2）；CR plan Phase 5 处理 c5-2 timeline e2e 契约，本 plan 只处理 timeline design.md 文本残留（互见）

## Purpose

把 roadmap Follow-up Backlog 三条登记项收口：①修复 open-audit P2 F3（mission json 组件计数 112→113）；②修复 open-audit P2 F4（`swipe-cell.tsx` openStateRef effect-mirror 冗余）；③对 multi-audit R1 扫描的全部 P2 候选（8 个维度文件、15 条 finding）完成 **R2 live 复核 + 路由裁决**——低成本项本 plan 内修复，属 flow-designer/graph 域（非 component-audit 113 组件）的项裁决 keep 或归 successor，零悬挂。收口后 roadmap Follow-up Backlog 三条全部勾选，为 CV/CG 提供干净基线。

## Current Baseline

- **roadmap 状态**：全部 C\*（C0–C9）与 CX-1..CX-12 `done`；CR/CV/CG `planned` 且已有 active plan；Follow-up Backlog 三条目均为 `[ ]` 未勾选（`component-audit-roadmap.md:233-235`）。
- **F3（已核实 live）**：`missions/component-audit.json:3` description 写「对全部 9 个 renderer 包的 **112 个注册组件**」；roadmap `:63,:109` 已裁定 113（含 button-group-select，C0 2026-08-02 live 注册定义核对）。审计卡实为 113 张（`docs/audits/per-component/` 113 卡 + README），仅 mission 定义文件陈旧。
- **F4（已核实 live）**：`packages/flux-renderers-mobile/src/swipe-cell.tsx`——`:38` `useState<SwipeOpenState>('closed')`；effect 块 `:47-49`（含 `:40-45` 注释）镜像 `openState → openStateRef`（注释称「ref is updated synchronously on every state transition」）；`:129-130`（closeCell）与 `:142-143`（openCell）均在 handler 内先同步写 ref 再 setOpenState。`setOpenState` 调用点全文件仅 `:130`、`:143` 两处（`:38` 为 useState 声明、`:42` 为注释）且都被同 handler 的 ref 赋值覆盖——effect 只 commit 后重放相同值，对快速连续手势守卫无增量贡献；MA-02 StrictMode 守卫语义由 handler 内同步写 ref 承担（C7 卡与 docs/bugs/86 已记录该语义）。
- **R1 P2 候选（8 文件 15 条，均待复核态，0529-1 未覆盖）**；另 17-3（utils/helpers 双命名）为观察项，R1 已裁「维持观察」，不进 R2 清单（如 R2 顺带复核则入表标 keep）：
  - 01-03 / 03-01（同根，API 表面积）：`packages/flux-renderers-data/src/index.tsx:14`（createCrudNormalizedSourceContext）、`packages/flux-react/src/index.tsx:105`（GAP_TOKENS）、`packages/flux-renderers-content/src/index.ts:38`（normalizeProgressValue + NormalizedProgress）——root barrel 导出但全仓零外部消费者（R1 扫描结论）。
  - 14-3：`packages/flux-renderers-data/src/__tests__/g5-g12-g17-data-lifecycle.test.tsx:211` `window.innerHeight = 600` 无 restore（afterEach 只有 cleanup + vi.restoreAllMocks，不还原属性赋值）。
  - 14-4：`packages/flow-designer-renderers/src/canvas-bridge.test.tsx`（588 行，`:1-212` 为 mock/setup 约 36%，`useDesignerSnapshotSelector` mock 固定空快照）。
  - 15-1：`packages/flow-designer-core/src/tree-session-impl.ts:310-311` relayoutTree 用两次全文档 JSON.stringify 做变更检测。
  - 15-2：`packages/flow-designer-core/src/core/shell-controls.ts:17-24` clampShellWidth 对 NaN 无防护（`Math.max(NaN, min) === NaN`）+ `packages/flow-designer-renderers/src/designer-action-provider.ts:447-453` typeof number 放行 NaN。
  - 15-3：`packages/flux-renderers-scheduling/src/barcode-input/utils/prepare-wasm-utils.ts:3` `DEFAULT_WASM_URL = 'https://unpkg.com/...'` 硬编码第三方 CDN；fetcher 注入已强制（无注入即 throw，fail-closed），live 路径仅 schema 提供 wasmUrl 才调用。
  - 16-3：`docs/references/quick-reference.md:14-44` Package Directory Map 缺 flux-renderers-graph 与 flux-renderers-ai 两行。
  - 16-4：`docs/components/timeline/design.md:27-28` 决策表「受控当前事件」「点击 seek」仍标「采纳（v2 立约，待实现）」，头部 `:3-4` 已声明 v2 实现；C5.2 卡 `docs/audits/per-component/timeline.md:44` 无 data-ownership 副作用 pass 结论被 v2 恒发推翻（CR Phase 5 修 e2e 断言，本 plan 只修设计文档文本与卡注记）。
  - 16-5：`docs/architecture/flow-designer/tree-mode.md:222` 声称「projectAndLayoutTree 不是 root export」，实际 `packages/flow-designer-core/src/index.ts:9-10` 显式导出（含 validateTreeDocument/canonicalizeTreeDocument/isJsonSafeTreePayload/resolveTreeNodeFootprint）。
  - 16-6：roadmap `:63` 组件计数 113，graph 已注册（`packages/flux-renderers-graph/src/graph-definitions.ts:6` type 'graph'）后应为 114；graph 由 G1 plan（`2026-08-04-2030-1`）独立闭环（42 单测 + 8 e2e + closure audit），非 component-audit 逐卡范围。
  - 16-7：`docs/plans/453-dingflow-single-tree-layout-unification-plan.md:3` Last Reviewed 仍 2026-08-05，文件 `:200` completed 2026-08-06（提交 07e4a7fc）。
  - 17-1：`docs/references/terminology.md` 无 TB/LR、受控当前事件、WorkbenchShell、TreeDocument 词条（4 个跨文件高频新词，tree-mode.md:144/275-283、timeline design.md:11、designer-workbench-shell.md:72、flux-react/src/index.tsx:91 均有使用）。
  - 17-2：`packages/flux-renderers-graph/src/graph-renderer.tsx:152-157` 事件 payload `type` 用事件字段名（'onNodeClick'）而非命名空间值（graph:node-click）；`docs/components/graph/design.md:165-171` payload 表未含 type 字段。
  - 19-3：`packages/flow-designer-renderers/src/designer-page-body.tsx:193-200` JSON.parse 失败 catch 返回 null → dialog 打开但内容空、无 monitor 上报。
  - 23-3：`packages/flux-action-core/src/__tests__/action-core.test.ts:315-320` 标题「delegates update and merge to original scope」但只断言 not.toThrow，重构为静默 no-op 测试仍全绿。
- **路由边界**：multi-audit 扫描为全仓扫描，但 component-audit mission 授权面是 113 个注册 renderer 组件（+ 其公共层 helper）；flow-designer（14-4/15-1/15-2/16-5/19-3）与 graph（17-2、16-3 graph 行、16-6）属其他 owner 域（flow-designer 有 453/workbench-shell/G1 等自有 plan 链），本 plan 对其做 R2 复核 + 路由（keep/修复/successor），不默认大改。
- **commit 基线**：unit 层 62/62 task 全绿（08-06 453 DingFlow plan）；e2e 零新增失败；CR/CV/CG active plan 未收口。

## Goals

- F3：`missions/component-audit.json:3` 组件计数修正为 113（与 roadmap/审计卡数一致）。
- F4：`swipe-cell.tsx` 冗余 effect-mirror 移除（或注释修正），MA-02 StrictMode 守卫语义保持，`setOpenState` 全路径核对无第三条路径，swipe-cell 既有测试全绿。
- R1 P2 候选全部完成 R2 live 复核（每条属实/已修复/误报裁决 + file:line 证据）与路由（fix-in-this-plan / CR / keep / successor），产出 `docs/audits/multi-audit-r2-verdicts.md` 裁决表，零悬挂。
- 低成本确认项本 plan 内修复（预计：14-3 innerHeight restore、16-3 quick-reference 两行、16-4 timeline design.md 文本 + C5.2 卡注记、16-6 roadmap 计数补 graph 说明、16-7 plan 453 日期、23-3 action-core 断言强化、17-1 terminology 词条、15-3 barcode 默认 URL 文档化或 fail-closed 裁决）；flow-designer/graph 域项按 R2 结论路由。
- roadmap Follow-up Backlog 三条全部勾选（closure-audit pass 后由 mission-driver 机械同步）。

## Non-Goals

- **不处理 R1 P0/P1 发现**（01-01/01-02/14-1/14-2/16-1/16-2 及 P1 候选 19-1/19-2/23-1/23-2）——已由 active plans 0529-1/0529-2/0529-3 与 CR 收口。
- **不做新的全仓审计维度**：只对已登记的 R1 P2 候选做 R2 复核，不重扫、不新增 finding。
- **不重开已 closed 审计卡**；不改 renderer 产品行为（F4 为内部 ref 镜像清理，DOM/事件契约不变）。
- **不实现 flow-designer/graph 域的功能修复**：若 R2 裁决该类项属实，按 successor 路由登记（除非修复成本极低且纯文档）。
- **不动 CR/CV/CG plan 的 in-scope 内容**（timeline e2e 契约归 CR Phase 5；full-green 验证归 CV；沉淀归 CG）。
- **不改公共 API 签名/导出面**：01-03/03-01 若裁决摘除 root 导出属结构性变更（ask-first 边界），本 plan 只做裁决 + JSDoc/文档化或显式登记 successor，不静默摘除。

## Scope

### In Scope

- F3 mission json 计数修正（Fix，纯文档）。
- F4 swipe-cell effect-mirror 清理（Fix + Proof，test-first 断言守卫语义保持）。
- R1 P2 候选 R2 复核（Proof）+ 路由裁决（Decision）+ 低成本修复（Fix）。
- `docs/audits/multi-audit-r2-verdicts.md` 裁决表 + roadmap Follow-up Backlog 勾选 + daily log。

### Out Of Scope

- R1 P0/P1 发现（0529-1/2/3 已收口）。
- CR/CV/CG in-scope 内容。
- 新审计、新能力、结构性重构。
- flow-designer/graph 域的功能实现（按 R2 裁决路由 successor）。

## Failure Paths

> 不适用：本 plan 无外部 IO/鉴权/错误码契约；唯一安全面相关项（15-3 barcode 默认 URL）为 R2 裁决 + 文档/配置处理，fetcher 注入 fail-closed 契约已有契约测试锁定，不改变。

## Test Strategy

本档选择：`必须自动化`

- F4 是行为面清理：先写/确认断言「open/close 守卫语义保持」（swipe-cell.test.tsx 既有 572 行覆盖 open/close/onAction，含 MA-02 StrictMode 不重复派发用例，确认后补缺），再移除 effect，测试先红后绿。
- 23-3 是测试强化：改写 action-core.test.ts:315-320 断言「委托到原 scope」（`wrapped.get('x') === 99` + bindings 可见），这是公共层（evaluationBindings 委托）契约测试，Must automate。
- 14-3 是测试隔离修复：innerHeight 原值保存 + afterEach 恢复，既有用例断言不变。
- 其余为纯文档/裁决项（F3、16-3/16-4/16-6/16-7、17-1），不适用自动化，Exit Criteria 以文件内容可核验为准。
- 全量 typecheck/build/lint/test 归 Closure Gates（guide Rule 18）。

## Execution Plan

### Phase 1 - R1 P2 候选 R2 复核（Proof）

Status: completed
Targets: `docs/analysis/2026-08-05-multi-audit-component-audit/*.md`（8 文件）、`docs/audits/2026-08-05-0656-open-audit-component-audit.md`、live 代码/文档（各 finding 对应路径）

- Item Types: `Proof | Decision`

- [x] **Proof（R2 复核 01-03/03-01）**：live 核对 3 个 root 导出符号（createCrudNormalizedSourceContext / GAP_TOKENS / normalizeProgressValue）在 src 之外（含 playground、宿主、e2e、其他包）的消费者计数——`rg` 全仓（排除定义文件与 barrel 自身）实证零消费者或发现遗漏消费者；记录复核结论。
- [x] **Proof（R2 复核 14-3）**：`g5-g12-g17-data-lifecycle.test.tsx` afterEach 现状核对（cleanup/restoreAllMocks 不含 innerHeight 还原）；确认 `:211` 赋值后无其他 restore 路径。
- [x] **Proof（R2 复核 14-4）**：`canvas-bridge.test.tsx` 结构核对——setup/mock 区 `:1-212` 行数与固定空快照 mock 是否如 R1 所述；评估提取 test-support.tsx + 真实 fixture 的成本（>15 分钟？）。
- [x] **Proof（R2 复核 15-1）**：`tree-session-impl.ts:310-311` relayoutTree 变更检测实现核对；确认是否非热路径（用户触发）与建议方案（修订计数/浅比较）可行性。
- [x] **Proof（R2 复核 15-2）**：`shell-controls.ts:17-24` clamp 对 NaN 行为实证（Math.max(NaN,min) === NaN）+ `designer-action-provider.ts:447-453` 放行路径；确认 fail-closed 缺口属实及修复面大小（Number.isFinite 守卫 + {ok:false} 返回）。
- [x] **Proof（R2 复核 15-3）**：`prepare-wasm-utils.ts:3` 默认 URL 可达性核对——`wasmUrl` 未提供且 fetcher 注入时是否真的会请求 unpkg；对照 barcode-input 调用点（`barcode-input.tsx` 是否总是传 wasmUrl）。
- [x] **Proof（R2 复核 16-3/16-4/16-5/16-6/16-7）**：逐条核对文档与 live 差异（quick-reference 表缺行、timeline design.md:27-28 残留、tree-mode.md:228 与 index.ts:9-10、roadmap:63 计数、plan 453:3 日期）——已在本 plan Current Baseline 初核，R2 以文件当前内容终核。
- [x] **Proof（R2 复核 17-1/17-2）**：terminology.md 缺词条核对（rg TB/WorkbenchShell/TreeDocument/受控当前事件）；graph-renderer.tsx:152-157 payload type 命名与 renderer-runtime.md:697-700 命名空间约定核对。
- [x] **Proof（R2 复核 19-3）**：`designer-page-body.tsx:193-200` JSON.parse catch→null 路径核对；确认 env.monitor/reportHostIssue 在 designer-renderers 的可用性（同包其他错误路径用法）。
- [x] **Proof（R2 复核 23-3）**：`action-core.test.ts:315-320` 断言面核对；确认 `withEvaluationBindings` 委托契约（update/merge 应落到原 scope）与修复断言面（`wrapped.get('x') === 99`、bindings 可见）。
- [x] **Decision（路由总表）**：基于 R2 结论生成路由分类——`fix-in-this-plan`（低成本、mission 授权面内）/ `keep`（记录非缺陷理由）/ `successor`（flow-designer/graph 域或结构性变更，登记 successor 路径）；逐条写理由，零未分类。

Exit Criteria:

- [x] `docs/audits/multi-audit-r2-verdicts.md` 存在：15 条 R1 P2 候选每条有 R2 结论（属实/已修复/误报）+ file:line + 路由（fix-in-this-plan/keep/successor + 理由），零悬挂。
- [x] 各复核结论与 live 文件内容一致（可复核：裁决表引用的路径/行号存在）。

### Phase 2 - F3 + F4 修复（Fix + Proof）

Status: completed
Targets: `missions/component-audit.json`、`packages/flux-renderers-mobile/src/swipe-cell.tsx`、`packages/flux-renderers-mobile/src/swipe-cell.test.tsx`（或既有测试文件）

- Item Types: `Fix | Proof`

- [x] **Fix（F3）**：`missions/component-audit.json:3` description 组件计数 112 → 113。
- [x] **Proof（F4 前置）**：确认 `setOpenState` 调用点全文件仅 2 处（`:130`、`:143`，rg 实证；`:38` 为 useState 声明、`:42` 为注释不计数）且均在同一 handler 内先写 `openStateRef`；确认无第三条状态变更路径（含外部受控/事件回调侧）；确认 swipe-cell 测试已有「快速连续手势守卫」或「StrictMode 双调用不重复派发」用例（无则 Phase 2 补，MA-02 语义）。
- [x] **Fix（F4）**：移除 `swipe-cell.tsx:41-50` 冗余 useEffect（或保留但注释修正为「ref 由 handler 同步写，effect 无承担职责」——以 R2 裁定为准，默认移除）；MA-02 语义由 handler 内同步写 ref 保持。
- [x] **Proof（F4 回归）**：swipe-cell 相关测试（`swipe-cell.test.tsx`、`__tests__/mobile-markers-contract.test.tsx`、`__tests__/event-and-i18n-contract.test.tsx`）全绿；mobile 包 `pnpm --filter @nop-chaos/flux-renderers-mobile test` 通过。

Exit Criteria:

- [x] `rg "112 个注册组件" missions/component-audit.json` 零命中（已 113）。
- [x] `swipe-cell.tsx` 无 effect-mirror 冗余（或注释已修正）；`setOpenState` 全路径核对记录在案；mobile 包测试全绿。

### Phase 3 - 低成本 P2 修复落地（Fix + Proof）

Status: completed
Targets: `packages/flux-renderers-data/src/__tests__/g5-g12-g17-data-lifecycle.test.tsx`、`packages/flux-action-core/src/__tests__/action-core.test.ts`、`docs/references/quick-reference.md`、`docs/components/timeline/design.md`、`docs/audits/per-component/timeline.md`、`docs/backlog/component-audit-roadmap.md`、`docs/plans/453-dingflow-single-tree-layout-unification-plan.md`、`docs/references/terminology.md`、`packages/flux-renderers-scheduling/src/barcode-input/utils/prepare-wasm-utils.ts`（按 R2 裁决）

- Item Types: `Fix | Proof | Decision`

- [x] **Fix（14-3）**：`g5-g12-g17-data-lifecycle.test.tsx:211` innerHeight 原值保存 + afterEach（或同测试块尾部）恢复；既有断言不变。
- [x] **Fix（23-3）**：`action-core.test.ts:315-320` 断言强化——`wrapped.update('x', 99)` 后 `wrapped.get('x') === 99`（原 scope 真被委托）+ merge 同理 + bindings 可见正向断言；标题与断言一致。
- [x] **Fix（16-3）**：`quick-reference.md:14-44` Package Directory Map 补 flux-renderers-ai（layer 7）与 flux-renderers-graph（layer 7）两行（与 live 包名/别名一致）。
- [x] **Fix（16-4）**：`timeline/design.md:27-28` 「待实现」改「已实现」并引用 timeline-v2 plan（`2026-08-04-2030-2`）；`docs/audits/per-component/timeline.md:44` 补 v2 事后注记（data-ownership 恒发契约）；e2e 断言面归 CR Phase 5，本 plan 不触碰。
- [x] **Fix（16-6）**：roadmap `:63` 组件计数补 graph 说明——「组件合计 113（component-audit 逐卡范围）+ graph 1（flux-renderers-graph，G1 plan `2026-08-04-2030-1` 独立闭环，非本路线逐卡范围），注册合计 114」；同口径同步 `:109` 组件清单节。
- [x] **Fix（16-7）**：plan 453 `:3` Last Reviewed 2026-08-05 → 2026-08-06。
- [x] **Fix（17-1）**：`terminology.md` 补 4-6 条词条（TB/LR、受控当前事件、WorkbenchShell、TreeDocument/TreeDocumentSession，或按 live 用法为准），条目风格与既有词条一致。
- [x] **Fix/Decision（15-3）**：按 R2 结论处理 barcode 默认 URL——候选：a) 删除 DEFAULT_WASM_URL 改「未提供 wasmUrl 且未配置默认 → throw（fail-closed）」（若调用点恒传 wasmUrl，行为不变）；b) 保留默认值但补文档化注释 + 架构文档登记（R5 缺口）；c) keep（若 R2 证明不可达且宿主无义务）。裁决记录 + 相应落地 + focused 测试（若 a，先红后绿）。
- [x] **Fix/Decision（01-03/03-01 API 表面）**：按 R2 结论裁决——a) 补 JSDoc + docs 条目（保持导出，成本低）；b) 从 root barrel 摘除（结构性，ask-first 边界，需记录理由 + 确认无外部消费者后执行）；c) keep（记录不规范性）。默认 a（非结构性），b 需显式理由记录。
- [x] **Decision（14-4/15-1/15-2/16-5/17-2/19-3）**：flow-designer/graph 域项按 R2 结论路由——纯文档低成本项（16-5 tree-mode.md 措辞修正「root export 但渲染器须经 core 会话间接使用」若裁属实）本 plan 内修；代码修复项（14-4 setup 提取、15-1 优化、15-2 NaN 守卫、17-2 payload 命名、19-3 JSON.parse 结构化失败）归 successor（flow-designer/graph owner plan 链），登记 successor 路径 + 理由。
- [x] **Proof（局部验证）**：受影响包局部测试/typecheck——data 包（14-3）、action-core 包（23-3）、scheduling 包（15-3，若动代码）focused 测试绿。

Exit Criteria:

- [x] 14-3/16-3/16-4/16-6/16-7/17-1 修复落地且文件内容可核验（live diff 可见）。
- [x] 23-3 断言强化测试全绿（断言正确行为，非 not-throw）；15-3/01-03 按裁决落地 + 理由记录。
- [x] 16-5 若裁修复则已修正；其余 flow-designer/graph 代码项有 successor 登记，零静默。

### Phase 4 - 裁决表回写与 roadmap 收口（Follow-up）

Status: completed
Targets: `docs/audits/multi-audit-r2-verdicts.md`、`docs/backlog/component-audit-roadmap.md`（Follow-up Backlog 节）、`docs/logs/2026/08-06.md`、`docs/analysis/2026-08-05-multi-audit-component-audit/*.md`（R1 态回写）

- Item Types: `Fix | Follow-up`

- [x] **Fix（裁决表终态）**：`multi-audit-r2-verdicts.md` 每条补终态（fixed + commit 引用 / keep + 理由 / successor + 路径），与 Phase 1/3 结果一致。
- [x] **Follow-up（roadmap）**：roadmap Follow-up Backlog 三条勾选为 `[x]`（F3/F4/R1 P2 候选），注明本 plan 路径。
- [x] **Follow-up（R1 态回写）**：8 个分析维度文件「维度复核结论: 待复核」回写为「R2 复核完成，裁决见 multi-audit-r2-verdicts.md」（执行期顺手完成）。
- [x] **Fix（daily log）**：`docs/logs/2026/08-06.md` 记录本 plan 收口（F3/F4 修复、R2 裁决摘要、修复清单、测试计数）。

Exit Criteria:

- [x] roadmap Follow-up Backlog 三条 `[x]`；裁决表零悬挂；daily log 记录存在。

## Draft Review Record

> 起草后、执行前由独立子 agent（fresh session）审查；共识达成后本 plan 升级 `active`。

- Reviewer / Agent: task `ses_02c0e5c94ffe064hhS2dh6VGdx`（独立 fresh session plan review，2026-08-06）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；Minor 已全部处理——①17-3 观察项排除理由补注（Non-Goals/Baseline）；②swipe-cell.test.tsx 行数 520→572 实测；③canvas-bridge.test.tsx 589→588 实测；④Phase 4 daily log 项类型 Proof→Fix（文档）；⑤setOpenState 调用点口径精确化（:130/:143 调用点 vs :38 声明/:42 注释）+ effect 块行号 :41-50→:47-49。

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] F3 mission json 计数 112 → 113 已落地（Phase 2 Exit）
- [x] F4 swipe-cell effect-mirror 冗余已清理，MA-02 守卫语义保持，mobile 包测试全绿（Phase 2 Exit）
- [x] 15 条 R1 P2 候选全部有 R2 结论 + 路由 + 终态（fixed/keep/successor），裁决表零悬挂（Phase 1/4 Exit）
- [x] 低成本修复项（14-3/16-3/16-4/16-6/16-7/17-1/23-3 + 15-3/01-03 裁决）全部落地或显式登记（Phase 3 Exit）
- [x] roadmap Follow-up Backlog 三条勾选；daily log 记录存在（Phase 4 Exit）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope confirmed live defect（R2 确认属实的项均已修复或显式 successor 登记）
- [x] 受影响的 owner docs（mission json、quick-reference、timeline design.md、roadmap、terminology、plan 453、daily log、分析文件）已同步到 live baseline
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### flow-designer/graph 域 P2 候选（14-4/15-1/15-2/17-2/19-3）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 非 component-audit 113 组件授权面（flow-designer/graph 属其他 owner 域，有 453/workbench-shell/G1 自有 plan 链）；本 plan 完成 R2 复核 + 裁决表登记 + successor 路径（零静默）；若 R2 裁定其中某项为 live defect（如 15-2 NaN fail-closed），按 confirmed defect 处理——要么本 plan 内最小修复（成本 <15 分钟），要么显式追加 successor 并记录，不降级为非阻断。
- Successor Required: `yes`
- Successor Path: flow-designer owner plan 链（453 后续 / workbench-shell / G1 graph 链）或未来治理 plan（按 Phase 3 Decision 登记具体路径）

### 01-03/03-01 root 导出摘除（若裁决需结构性变更）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 公开即承诺但零消费者属维护成本而非 live defect；默认补 JSDoc + 文档（非结构性）；摘除 root 导出属公共 API 面变更（ask-first 边界），需理由记录 + 人工确认，不静默执行。
- Successor Required: `no`（Phase 3 已裁决，默认文档化处理）

## Non-Blocking Follow-ups

- R2 复核中若发现登记之外的新 confirmed defect，记录于裁决表并归相应 successor（不静默吞掉）。
- flow-designer/graph 域代码修复项（若裁决 successor）的最终实现不在本 plan 的 closure 义务内，以裁决表登记为交接物。

## Closure

Status Note: pending（执行完成后填写）

Closure Audit Evidence: pending

Follow-up:

- pending（仅记录 non-blocking follow-up）
