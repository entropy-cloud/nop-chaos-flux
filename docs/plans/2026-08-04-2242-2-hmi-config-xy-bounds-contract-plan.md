# {2} HMI — Converge Symbol `x`/`y` Config Contract (Type ↔ Validator ↔ Runtime-Consumer) To Eliminate Silent NaN Viewport

> Plan Status: completed
> Last Reviewed: 2026-08-05
> Source: `docs/audits/2026-08-04-2242-open-audit-industrial-hmi.md` (`[P1]` x/y 3-way contract drift)
> Related: `docs/plans/2026-08-04-1235-3-hmi-display-math-manifest-plan.md` (P1-6 viewport formula), `docs/plans/2026-08-04-1558-3-hmi-display-geometry-test-effectiveness-plan.md` (mock↔real drift), `docs/components/roadmap-industrial-hmi.md`

## Purpose

收口 `ScadaSymbolNode.x`/`y` 在三层（TS 类型 / JSON validator / 运行期 bounds consumer）之间的契约漂移，消除「JSON 省略 `x`/`y` + 设 viewport policy → NaN viewport → 画布空白且 `data-status="ready"` 无任何错误信号」的静默整体渲染失败。同时关闭 `clampViewport` 仅钳制 scale、不钳制 x/y 的放大器（NaN position 一旦进入便永久驻留 leafer zoomLayer transform）。

## Current Baseline

live repo 核对（2026-08-04，三层漂移三角已逐点验证）：

1. **类型层声明 `x`/`y` 必填**：`serialization/config-types.ts:57-58` `interface ScadaSymbolNode { id; type; x: number; y: number; ... }`。TS 作者无法在不提供 `x`/`y` 时构造节点。同接口的 `width`/`height`/`rotation`/`scale` 均为可选（`:59-62`）——`x`/`y` 是仅有的两个必填位置字段。
2. **validator 把它们当可选**：`serialization/validate.ts:13-22` `checkNumberField` 仅当字段**存在且非 number** 时报错（`if (field in node && typeof node[field] !== 'number')`）；`:180-181` 对 `x`/`y` 用此函数。省略 `x`/`y` 的 JSON 节点 `validateScadaConfig` 零错误通过。
3. **运行期 bounds consumer 原样读取（无默认）**：
   - `renderer/hooks/use-scada-config-sync.ts:48-54` `boundsOfNode`：`return { x: node.x, y: node.y, width, height }`（`node.x`/`node.y` 未默认；`width`/`height` 已 `?? 0`）。
   - `use-scada-config-sync.ts:84` `boundsFromCustomPoints`：`return { x: node.x + minX, y: node.y + minY, ... }`（`undefined + number = NaN`）。
4. **内部不一致（证明意图）**：`engine/interaction-overlay.ts:43-44` `resolveOverlayGeometry` **已默认** `const baseX = node.x ?? 0; const baseY = node.y ?? 0;`——hover-overlay 路径把省略的 `x`/`y` 当 `0`。bounds 路径未默认。同一 mission、同一包内两个「node geometry」consumer 对「`x`/`y` 是否可缺省」持相反意见。
5. **放大器**：`engine/viewport.ts:32-34` `clampViewport` 仅 `clampScale`，`x`/`y` 原样透传；`clampScale`（`:27-30`）用 `Number.isFinite` 捕获 NaN → `MIN_SCALE`，但 position 无此防御。NaN position 经 `scada-engine.ts applyViewportState` 的 `zoomLayer.move({ x: -(NaN - cur.x)*scale, ... })` 写入 leafer transform 后永久驻留，所有后续 `worldToViewport`/`viewportToWorld`（`:36-48`）产出 NaN，符号渲染到 NaN 屏幕坐标 → 离屏/不可见。
6. **端到端表现**：`computeSymbolBounds` → `unionBounds`（`Math.min(defined, undefined) = NaN`）→ `applyInitialViewport` 调 `engine.fit(NaNbounds)` 或 `setViewport({ x: NaN })` → 返回 `{ x: NaN, y: NaN, scale: 0.1 }`（scale 被 `clampScale` 救回，position 无救）→ 画布显示 `data-status="ready"`（构建成功）但空白，无 `onError`、无 console error。
7. **为何 demo/测试没抓住**：demo config 总含 `x`/`y` 且总设 `viewport.fit`；562 测试用例从未覆盖「省略 `x`/`y`」分支。
8. **机械门**：包级 typecheck/lint/build/test 全绿（562/562）。

## Goals

- 消除「省略 `x`/`y` + viewport policy → 空白 ready 画布」的静默失败：bounds consumer 对省略的 `x`/`y` 给出确定默认（`0`，与 `interaction-overlay.ts:43-44` 一致）。
- 关闭 `clampViewport` 放大器：`x`/`y` 非有限时回落到 `0`，使任何来源的 NaN position 都无法驻留 leafer transform。
- 收敛三层契约到同一读法（见 Phase 1 Decision：「可选 + 默认 0」），消除 type↔validator↔runtime 三方分歧。
- 补回归测试：「省略 `x`/`y` + `viewport: { fit: 'contain' }`」断言 `getViewport()` 返回有限 `x`/`y` 且符号在屏（非 NaN-blank）；`clampViewport({ x: NaN, ... })` 断言返回有限。

## Non-Goals

- 不改 `width`/`height`/`rotation`/`scale` 等其他字段的 optional/required 语义（本计划只收口 `x`/`y` 漂移；其他字段已是 optional 且 bounds consumer 已 `?? 0`）。
- 不改 `computeSymbolBounds` 对 `custom.points` 的几何处理（plan `{1558-3}` 已收口；本计划只处理 `x`/`y` 原点缺省）。
- 不改 `fit`/`center`/`setViewport` 公式（plan `{1235-3}` P1-6 已收口）。
- 不处理 multi-audit 的 onError/onHandlerError 通道（plan `{1}` 收口）。
- 不处理 P2 级 default-shape polygon/line bounds → MAX_SCALE、base-text centering 等残留（已登记 Follow-up Backlog）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/serialization/config-types.ts`（`ScadaSymbolNode.x`/`y` 契约裁定）。
- `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.ts`（`boundsOfNode`/`boundsFromCustomPoints` 默认 `x`/`y`）。
- `packages/flux-renderers-industrial/src/engine/viewport.ts`（`clampViewport` 防御非有限 `x`/`y`）。
- bounds/viewport 回归测试（省略 `x`/`y` + fit；NaN 注入 clamp）。
- `docs/components/industrial-hmi/design-renderer.md`（config 契约 `x`/`y` 语义注记，若 Decision 改变文档语义）。

### Out Of Scope

- validator 改为「必填」裁定（见 Phase 1 Decision：倾向「可选 + 默认 0」，不收紧 validator；若审阅者主张收紧，作为 Decision 升级）。
- interaction-overlay 已默认 `x`/`y`（无需改）。
- leafer-ui-mock bounds API 建模（P2，Follow-up Backlog）。

## Failure Paths

| 场景                           | 触发                                                 | 行为                                                                 | 可重试                   | 用户可见表现                                    |
| ------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------- | ------------------------ | ----------------------------------------------- |
| 省略 `x`/`y` + viewport fit    | JSON 节点无 `x`/`y` + `viewport: { fit: 'contain' }` | bounds 按 `x=0,y=0` 原点计算 → 正常 fit → 符号在屏                   | 是（编辑 config 加 x/y） | 画布正常渲染（符号位于原点）；非空白            |
| NaN 从其他来源渗入 position    | 任何上游 bug 产出 NaN viewport x/y                   | `clampViewport` 经 `Number.isFinite` 回落 `x`/`y` 到 `0`             | 否                       | 画布居中于原点而非空白；有可调试的有限 viewport |
| `custom.points` + 省略 `x`/`y` | polygon/line 节点无 `x`/`y` 但有 points              | `boundsFromCustomPoints` 按 `x=0,y=0` 原点 + points 极值得有限包围盒 | 是                       | 正常 fit                                        |

## Test Strategy

本档选择：**必须自动化**

理由：这是静默整体渲染失败（blank ready canvas）的契约 drift，触发条件是作者常见的「省略位置字段」+ viewport policy 组合；demo/562 测试从未覆盖该分支。Proof 必须先于 Fix 落地（失败用例先行），否则「接口/默认已加」会再次掩盖「NaN 路径是否真被关闭」。

## Execution Plan

### Phase 1 - 契约裁定 + Proof 失败用例先行

Status: completed
Targets: `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.test.ts`（或新 `bounds-contract.test.ts`）, `packages/flux-renderers-industrial/src/engine/viewport.test.ts`

- Item Types: `Decision` / `Proof`

> **Phase 1 只做裁定 + 写失败用例，不动任何产线代码/类型**（避免类型改可选后下游 typecheck breakage 在 Fix 落地前悬挂）。Proof 用例经 `as ScadaSymbolNode` / `JSON.parse` 构造省略 `x`/`y` 的节点，绕过当前 `x: number` 必填类型——测试断言的是运行期行为，不是类型层。

- [x] **Decision（`x`/`y` 契约读法裁定）**：选定三层收敛到「`x`/`y` 可选 + 默认 `0`」。依据：(a) open-audit 明示「证明意图是 default to 0，非 may be undefined」；(b) validator 已把 `x`/`y` 当可选；(c) `interaction-overlay.ts:43-44` 已默认 `?? 0`；(d) `width`/`height`/`rotation`/`scale` 在类型里已是可选——`x`/`y` 改可选与同接口一致。**类型改动（`config-types.ts` `x?: number`/`y?: number`）随 Phase 2 的 consumer 修复一起落地**，确保 typecheck 在 Phase 2 收尾时一次性恢复（见 Phase 2 Fix-0）。validator 维持 `checkNumberField`（可选语义不变）。若审阅子 agent 主张「收紧 validator 为必填」（open-audit 备选建议 b），于此登记反对意见并升级人工裁定前维持本裁定。
- [x] **Proof-1（bounds，失败用例先行）**：新增测试——构造一个省略 `x`/`y` 的 symbol 节点（仅 `id`/`type`/`width`/`height`，经 `as ScadaSymbolNode` 或 `JSON.parse` 绕过当前必填类型），断言导出的 `computeSymbolBounds([node])`（内部调 `boundsOfNode`/`boundsFromCustomPoints`，二者模块私有不可直调）返回的 bounds `.x`/`.y` 为有限 number（`0`）；对带 `custom.points`、省略 `x`/`y` 的节点同理断言有限 bounds。Fix 前应失败（返回 `undefined`/`NaN`）。
- [x] **Proof-2（viewport fit，失败用例先行）**：新增集成测试——一个最小 config（含一个省略 `x`/`y` 的 symbol + `viewport: { fit: 'contain' }`），经 `applyInitialViewport`/`engine.fit` 后断言 `getViewport().x`/`.y` 为 `Number.isFinite === true`，且 `unionBounds` 结果不含 NaN。Fix 前应失败（NaN）。
- [x] **Proof-3（clampViewport 放大器，失败用例先行）**：新增单测——`clampViewport({ x: NaN, y: NaN, scale: 0.1 })` 断言返回 `{ x: 0, y: 0, scale: 0.1 }`；`clampViewport({ x: Infinity, y: -Infinity, scale: 1 })` 同理回落有限。Fix 前应失败（x/y 原样透传 NaN/Infinity）。

Exit Criteria:

- [x] Decision 记录写明「可选 + 默认 0」裁定理由 + 与 validator/interaction-overlay/同接口其他字段的一致性论证；类型改动明确归属 Phase 2。
- [x] Proof-1/2/3 三个失败用例已入库，且在本 Phase（产线 Fix 未落地时）均失败（红）。
- [x] 产线代码与 `config-types.ts` 类型未改动（Phase 1 不动产线）。

### Phase 2 - Fix：类型收敛 + 默认 bounds consumer + 关闭 clampViewport 放大器（一并落地恢复 typecheck）

Status: completed
Targets: `packages/flux-renderers-industrial/src/serialization/config-types.ts`, `packages/flux-renderers-industrial/src/renderer/hooks/use-scada-config-sync.ts`, `packages/flux-renderers-industrial/src/engine/viewport.ts`, `packages/flux-renderers-industrial/src/engine/config-adapter.ts`

- Item Types: `Fix`

> **类型改动（Fix-0）与全部 consumer 修复（Fix-1/2/3/4）在同一 Phase 落地**，使 typecheck 在 Phase 收尾时一次性通过——避免「类型已可选、consumer 未补默认」的中间破损态。

- [x] **Fix-0（类型层收敛）**：`config-types.ts:57-58` 改 `x?: number; y?: number;`（与同接口 `width?`/`height?`/`rotation?`/`scale?` 对齐）。
- [x] **Fix-1（boundsOfNode）**：`use-scada-config-sync.ts:48-54` `boundsOfNode` 改 `return { x: node.x ?? 0, y: node.y ?? 0, width, height }`（镜像 `interaction-overlay.ts:43-44`）。
- [x] **Fix-2（boundsFromCustomPoints）**：`use-scada-config-sync.ts:84` 改 `return { x: (node.x ?? 0) + minX, y: (node.y ?? 0) + minY, width: maxX - minX, height: maxY - minY }`。
- [x] **Fix-3（clampViewport 放大器）**：`viewport.ts:32-34` `clampViewport` 对 `x`/`y` 加 `Number.isFinite` 防御：`return { x: Number.isFinite(state.x) ? state.x : 0, y: Number.isFinite(state.y) ? state.y : 0, scale: clampScale(state.scale) }`。文档化「position 非有限回落 0」语义。
- [x] **Fix-4（Phase 0 类型改动暴露的下游 raw 消费点）**：grep 全仓 `node.x`/`node.y`（及 `ScadaSymbolNode` 解构的 `x`/`y`）消费点，凡把 `node.x`/`node.y` 原样透传给下游（且语义上 NaN/undefined 会引发漂移）处补 `?? 0`。**已知消费点**：`config-adapter.ts:92-93` `new Group({ x: node.x, y: node.y, ... })`（raw 透传给 leafer Group，与 boundsOfNode 同型 NaN 源）——补 `x: node.x ?? 0, y: node.y ?? 0`。记录扫描结果清单（即使某些消费点裁定不需补，注明理由）。

  **Fix-4 全仓扫描结果清单**（`rg "node\.x|node\.y"` src/，排除 _.test._）：
  - `engine/config-adapter.ts:92-93`（Group/container 构造，raw 透传 leafer Group transform，无默认层）→ **已补 `?? 0`**。
  - `engine/config-adapter.ts:110`（leaf 路径 `resolveSymbolStyle(definition, node as ScadaSymbolProps)` → `instantiateSymbol` → `deepMergeInstanceProps(definition.defaults, ctx.props)`）→ **裁定不需补**：所有内置 symbol 定义 `defaults` 均含 `x:0,y:0`（base-shapes/device/sensor-control/instrument/pipe/compound 全量核对），且 `deepMergeInstanceProps`（`compound.ts:34`）对 `value === undefined` 显式 `continue` 跳过，故省略 x/y 时 leaf 节点经 defaults 兜底为 0；`resolveSymbolStyle` 的 `{...defaults, ...instanceProps}` 虽产生 `x:undefined`（explicit-undefined 覆盖），但经第二层 `deepMergeInstanceProps` 再次合并 defaults 时 undefined 被跳过、defaults 的 0 保留。
  - `engine/interaction-overlay.ts:43-44`（`baseX = node.x ?? 0`）→ **已默认**（本 plan 一致性目标，无需改）。
  - `renderer/hooks/use-scada-config-sync.ts:53/:84` → Fix-1/Fix-2 已补。
  - `renderer/hooks/use-scada-config-sync.ts:45` → 注释文本，无代码消费。

Exit Criteria:

- [x] Phase 1 的 Proof-1/2/3 全部由红转绿。
- [x] `boundsOfNode`/`boundsFromCustomPoints` 对省略 `x`/`y` 返回有限 bounds；`clampViewport` 对非有限 `x`/`y` 回落 `0`；`config-adapter.ts` Group 构造对省略 `x`/`y` 给 `0`。
- [x] 包级 typecheck 通过（`x`/`y` 改可选 + 全部 consumer 补默认后，无新增 TS 错误；Fix-4 扫描清单已记录）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立子 agent（fresh session）填写，详见 plan guide `Plan Review Rule`。

- Reviewer / Agent: fresh session `ses_03289fc30ffeLRqe614SW8zgWW`（Round 1）+ fresh session `ses_032864d26ffe55WoDwdwljkDy1`（Round 2 复核），均独立 general sub-agent，不复用起草上下文
- Verdict: `pass-with-minors`（经 1 轮修订）
- Rounds: 2（Round 1 `revised` → 1 Major；Round 2 `pass-with-minors`，Major 已 resolved）
- Findings addressed:
  - Round 1 Major（已处理）：Phase 1 内部一致性——Decision 把 `config-types.ts` 类型改动放 Phase 1 但补偿性 consumer 修复在 Phase 2，致 Phase 1 Exit Criterion「局部 typecheck 通过」在 Fix 落地前不成立。处理：采 option(a)——类型改动（Fix-0）移入 Phase 2，与 Fix-1/2/3/4 一并落地恢复 typecheck；Phase 1 缩为 Decision + Proof-red（不动产线/类型），Proof 用例经 `as ScadaSymbolNode`/`JSON.parse` 绕过当前必填类型。Round 2 确认 Major resolved。
  - Round 1 Minor（已处理）：Fix-4 括注「不应有此情况」不准——`config-adapter.ts:92-93` 是真实 raw 消费点。已补为「已知消费点」显式列出。
  - Round 2 Minor（不触发返工）：Proof-1 字面直呼模块私有 `boundsOfNode`/`boundsFromCustomPoints`。已处理：改为经导出的 `computeSymbolBounds([node])` 路由（二者私有不可直调），措辞同步。
- 引用准确性（Round 2 复核 11 项）：config-types.ts:57-58 必填 + :59-62 可选、validate.ts checkNumberField 语义 + :180-181、use-scada-config-sync.ts:48-54/:84 raw 透传 + :20 仅 computeSymbolBounds 导出、interaction-overlay.ts:43-44 已默认、viewport.ts:32-34 仅 clampScale + :27-30 Number.isFinite、config-adapter.ts:92-93 raw Group 消费——全数 confirmed-accurate。

## Closure Gates

> 关闭条件：本 section 全部 `[x]` + 每 Phase Exit Criteria 全部 `[x]` 后，方可 `Plan Status: completed`。closure-audit 必须由独立子 agent（fresh session）执行。

- [x] open-audit P1（x/y 3-way contract drift）confirmed fixed in live code：`boundsOfNode`/`boundsFromCustomPoints` 默认 `x`/`y`、`clampViewport` 防御非有限 position、`config-types.ts` `x`/`y` 改可选。
- [x] 回归测试（bounds + viewport fit + clampViewport 三组）落地并通过，覆盖「省略 `x`/`y` + fit → 有限 viewport + 符号在屏」与「NaN/Infinity 注入 clamp → 回落 `0`」。
- [x] 三层契约读法一致（type 可选 + validator 可选 + runtime 默认 0）——无残留分歧。
- [x] `interaction-overlay.ts:43-44` 的既有默认与本 plan 默认语义一致（两 consumer 不再矛盾）。
- [x] `design-renderer.md` config 契约注记 `x`/`y`「可选 + 默认 0」语义（若 §4.x 涉及）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（起草时无；执行中如出现按 anti-slacking rule 裁定的 deferred 项，于此登记。）

## Non-Blocking Follow-ups

- `computeSymbolBounds` 对无 `custom.points` 的 default polygon/line（`DEFAULT_TRIANGLE`/width-height-derived points）仍退化为 MAX_SCALE（P2，源 `2026-08-04-2242-multi-audit-industrial-hmi.md`）。
- `leafer-ui-mock` 未建模 `getBoundsToWorld`/`worldBox`/`tree.zoomLayer !== tree`（P2，源 `2026-08-04-2242-multi-audit-industrial-hmi.md`）——本 plan 的 bounds 回归测试在 mock 层验证有限性；真实 leafer 像素级 bounds 一致性仍是 mock↔real 漂移观察项。

## Closure

Status Note: x/y 三层契约漂移已收口——`ScadaSymbolNode.x/y` 改可选（type）、validator 维持可选语义、runtime bounds consumer（`boundsOfNode`/`boundsFromCustomPoints`）与 Group 构造（`config-adapter`）统一 `?? 0`、`clampViewport` 关闭 position 放大器（非有限 x/y 回落 0）。Proof-1/2/3 三组回归测试落地（红→绿），silent NaN viewport 失败路径已闭合（省略 x/y + fit → 有限 viewport，符号在屏）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session general sub-agent（task `ses_0322c7a16ffeRLPgu2ZntwSI0z`），不复用执行上下文
- Evidence: 独立通读 plan + 6 个产线/测试文件 live code 核对；逐点验证 Phase 1/2 Exit Criteria（Proof 断言与代码一致）、interface↔semantics trace（`{id,type,width,height}` → `computeSymbolBounds` → `fit` → 有限 viewport；`clampViewport({x:NaN})` → 0）、Fix-4 扫描诚实性（leaf 路径经 31 个 symbol 定义 `defaults{x:0,y:0}` + `deepMergeInstanceProps` undefined-skip 兜底，裁定 sound）、两 consumer 一致性（interaction-overlay 已 `?? 0`）、plan 文本一致性（Phase 1/2 completed + 全 `[x]`、Plan Status 未自我翻转、Closure Evidence 未预填）；独立复跑 industrial 包 typecheck/build/lint/test 570/570 全绿。Verdict `approved`（1 项 non-blocking note：Proof-2 走 pure `fit` 而非 engine 集成，经审定合理——`applyInitialViewport` 委托同一 pure `fit`、`clampViewport` 防御由 Proof-3 独立覆盖、engine wrapper 无新增 NaN 逻辑）。

Follow-up:

- `computeSymbolBounds` 对无 `custom.points` 的 default polygon/line（`DEFAULT_TRIANGLE`/width-height-derived points）仍退化为 MAX_SCALE（P2，Non-Goal，源 `2026-08-04-2242-multi-audit-industrial-hmi.md`）。
- `leafer-ui-mock` 未建模 `getBoundsToWorld`/`worldBox`/`tree.zoomLayer !== tree`（P2，Non-Goal）——本 plan bounds 回归测试在 pure `fit`/mock 层验证有限性；真实 leafer 像素级 bounds 一致性仍是 mock↔real 漂移观察项。
- 无剩余 plan-owned work。
