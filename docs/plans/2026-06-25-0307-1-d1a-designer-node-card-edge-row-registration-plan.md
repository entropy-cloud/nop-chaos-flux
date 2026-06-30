# 1 D1a 设计器补充组 — designer-node-card / designer-edge-row 注册

> Plan Status: completed
> Last Reviewed: 2026-06-25
> Source: `docs/components/roadmap.md`（D1a 工作项 + 「核心缺口」D1a deferred 叙述）、`docs/components/designer-node-card/design.md`、`docs/components/designer-edge-row/design.md`、`packages/flow-designer-renderers/src/`
> Related: `docs/plans/2026-06-24-1633-1-main-roadmap-wave1-4-closure-reconciliation-plan.md`（主组件 wave 收尾，明确剩余仅为 D1a deferred + O1 optional）
> Mission: components
> Work Item: D1a 设计器补充组（2）

## Purpose

把 schema 已声明但**刻意未注册**的两个 designer 内部 renderer —— `designer-node-card`、`designer-edge-row` —— 收口为**已注册、有 runtime 消费、有 focused 验证、owner-doc 已翻转**的落地契约，并显式关闭各 design.md §12 的 host-bridge-stability deferral。

这是主组件 roadmap（W1a–W4c + W1d 已全部 `done`）之后**唯一剩余的 `todo` 工作项**。O1（13 个非 retained 可选项）需人先翻 retained 决策，不在 AI 自主队列内。收口后主组件 roadmap 的 `todo` 队列清空。

## Current Baseline

> 起草前已核对 live repo（2026-06-25）。

**schema 已声明、renderer 未注册（核心 gap）：**

- `packages/flow-designer-renderers/src/schemas.ts:45-48` —— `DesignerNodeCardSchema extends BaseSchema { type: 'designer-node-card'; nodeId?: string }`。
- `packages/flow-designer-renderers/src/schemas.ts:50-53` —— `DesignerEdgeRowSchema extends BaseSchema { type: 'designer-edge-row'; edgeId?: string }`。
- `packages/flow-designer-renderers/src/renderer-definitions.ts:212-287` —— `flowDesignerRendererDefinitions` 只注册 4 个 type：`designer-page` / `designer-field` / `designer-canvas` / `designer-palette`。`designer-node-card` / `designer-edge-row` **零注册**（`grep -n "node-card\|edge-row" renderer-definitions.ts` 无命中）。
- 因此 `{type:'designer-node-card', nodeId}` / `{type:'designer-edge-row', edgeId}` 在 schema 中无法解析渲染（registry 无该 type）。

**§12 host-bridge-stability deferral —— gating 已解除（本 plan 的关键裁定）：**

- `designer-node-card/design.md` §12 L56：「过早公开 renderer 会把内部画布实现细节固定下来，需要等 host bridge 稳定后再注册。」
- `designer-edge-row/design.md` §12 L54：「边列表组件是否独立公开，需要等 inspector 与 graph summary 需求稳定后再确定。」
- **裁定**：host bridge 现已稳定。证据：
  - `packages/flow-designer-renderers/src/designer-host-projection.ts:185-187` 导出 `DESIGNER_HOST_PROJECTION: HostProjectionContract`（正式契约，250 行，完整 `FluxValueShape` 类型化）。
  - `designer-manifest.ts:18,441` —— 该契约被 designer manifest 的 `projection` 字段消费（manifest 是 host 契约的权威出口）。
  - `designer-context.ts:14,132` —— `buildDesignerHostProjection({ snapshot })` 在 `buildDesignerScopeData` 中实际构造，喂给 `useHostScope`，即 host scope 已对外投影这些字段。
- 投影字段恰好覆盖两个 renderer 所需的 node/edge 摘要：
  - `doc.nodes[]`: `{ id, type, position:{x,y} }`；`doc.edges[]`: `{ id, source, target, sourcePort?, taskflowEdgeKind? }`。
  - `activeNode`: `{ id, type, position, data } | null`；`activeEdge`: `{ id, type, source, target, sourcePort?, targetPort?, data } | null`。
  - `selection`: `{ selectedNodeIds, selectedEdgeIds, activeNodeId, activeEdgeId }`。
- 结论：design.md §12 两处 deferral 的前置条件（host bridge / inspector-graph-summary 稳定）**均由稳定 `HostProjectionContract` 满足**，可安全注册。

**可复用的 designer 读取层（本 plan 直接消费，不重建）：**

- `designer-context.ts:49-55` `useDesignerContext()` —— 稳定 context（`core`/`dispatch`/`config`），抛错保证「必须在 designer-page 内」。
- `designer-context.ts:74-86` `useDesignerSnapshotSelector(selector)` —— 细粒度 reactive snapshot 订阅（`use-sync-external-store/with-selector`），按 id 查 node/edge 的推荐入口。
- `designer-context.ts:172-179` `useNodeTypeConfig(typeId)` / `useEdgeTypeConfig(typeId)` —— type config 查表（取 type label/icon），node-card/edge-row 显示标签直接复用。
- `designer-context.ts:121-128` `toActionResult()` —— command 结果归一化为 action result。

**注册范本（本 plan 照此模式）：**

- `designer-page.tsx:47-58` —— `DesignerCanvasRenderer` / `DesignerPaletteRenderer` 是最小壳 renderer：读 `getRootMetaProps(props.meta)`（className/testid/cid）+ 委托给 Content 组件，Content 内部用 `DesignerContext`。
- `renderer-definitions.ts:277-286` —— `designer-canvas` / `designer-palette` 注册项最简：`{ type, component: Lazy..., fields: [] }`。node-card/edge-row 比 canvas/palette 多一个 value 字段（`nodeId`/`edgeId`）+ 一个 select/focus capability。

**playground / e2e 既有面（本 plan 扩展，不新建独立面）：**

- `apps/playground/src/schemas/workflow-designer-schema.json` + `taskflow-workflow-schema.json` —— 现有 designer-page demo schema；designer-canvas/palette 即在此面内验证。
- `tests/e2e/flow-designer-ui.spec.ts`、`taskflow-designer-ui.spec.ts`、`flow-designer-edge-creation.spec.ts` —— 现有 designer e2e 基建。
- `packages/flow-designer-renderers/src/public-surface.test.ts` —— designer renderer 公开面 focused 测试基建。

**测试基线：** `packages/flow-designer-renderers/` 已有 `designer-page.test-support.tsx`、`designer-provider-and-manifest.test.tsx`、`public-surface.test.ts`、`canvas-bridge.test.tsx` 等充足测试基建，可直接挂载带 designer context 的 renderer。

## Goals

- `designer-node-card` 与 `designer-edge-row` 在 `flowDesignerRendererDefinitions` 中**正式注册**，schema `{type:'designer-node-card'|'designer-edge-row', nodeId|edgeId}` 能在 registry 中解析并在 designer-page context 内渲染。
- 两个 renderer 从 designer snapshot **按 id 解析** node/edge 摘要（经 `useDesignerSnapshotSelector`），渲染 type label（经 `useNodeTypeConfig`/`useEdgeTypeConfig`）、位置/源目标、选中态，缺失 id 时降级为受控空态（不抛错、不渲染幽灵行）。
- 两个 renderer 发射 `nop-designer-node-card` / `nop-designer-edge-row` marker，并支持 design.md §8 的 designer command（node-card：select/focus node；edge-row：focus edge）。
- design.md §12 两处 deferral **翻转为已落地**，§3 状态从「schema 已导出，renderer 未注册」翻转为「已注册」。
- 主组件 roadmap Phase Status 的 `D1a` 由 `todo` → `done`（closure audit 通过后）。

## Non-Goals

- **不**重构 xyflow 画布内 node/edge 渲染（`packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx` / `designer-xyflow-edge.tsx`）。这两个 renderer 是 **schema 级摘要展示**（inspector / 摘要面板用），与画布内 xyflow 节点壳是不同渲染层，互不替代。
- **不**为 node-card/edge-row 开放自由 region 模板或复杂 slot（design.md §6 标注首版不建议开放自由 regions）。
- **不**把 O1 任一可选项拉入本 plan（需人先翻 retained 决策）。
- **不**新增对外公共业务组件 API —— 这两个 renderer 仅在 designer-page host 边界内有意义（`useDesignerContext` 会抛错保证不可越界使用）。

## Scope

### In Scope

- `renderer-definitions.ts` 注册 `designer-node-card` / `designer-edge-row`（lazy component + `nodeId`/`edgeId` value field + capability contract）。
- `designer-node-card` renderer 实现（node 摘要解析、type label、position、选中态、marker、select/focus command）。
- `designer-edge-row` renderer 实现（edge 摘要解析、source→target label、marker、focus edge command）。
- 缺失 id 的受控降级路径。
- focused 单测（解析命中/缺失、command 派发、marker、context 越界抛错）。
- playground 演示（在现有 designer demo 面 / inspector 区组合 node-card + edge-row）+ e2e（渲染 + 点击 command）。
- owner-doc 同步：两份 design.md §12/§3 翻转、`amis-baseline-matrix.md` 状态、roadmap Phase Status。

### Out Of Scope

- node-card 端口（ports）/badges/invalid 等扩展投影字段（design.md §4 标注「建议后续补充」，首版 `nodeId` + type label + position + 选中态即可）。
- edge-row sourceLabel/targetLabel/status 等扩展字段（design.md §4 同理，首版 source/target id + label 足够）。
- 自由 header/body/footer/actions region（design.md §6，首版不开放）。
- 画布内 xyflow 节点/边视觉重构。

## Failure Paths

| 可测场景编号      | 触发                                   | 行为                                             | 可重试 | 用户可见表现                             |
| ----------------- | -------------------------------------- | ------------------------------------------------ | ------ | ---------------------------------------- |
| node-card-missing | `nodeId` 在 doc.nodes 中无匹配         | 降级：不渲染卡片壳，发射空态 marker，不抛错      | 否     | 该位置为空 / 受控空态占位                |
| edge-row-missing  | `edgeId` 在 doc.edges 中无匹配         | 降级：不渲染行，不抛错                           | 否     | 该行不出现                               |
| context-leak      | 在 designer-page 边界外渲染该 renderer | `useDesignerContext()` 抛「must be used within」 | 否     | 标准 designer 越界错误（与 canvas 一致） |
| node-card-no-id   | schema 未给 `nodeId`                   | 降级：渲染空态 marker，不抛错                    | 否     | 空态占位                                 |

## Test Strategy

档位选择：`建议有测`

本档选择：**建议有测**。理由：注册两个 designer 内部 renderer 是真实能力新增（roadmap Cross-Cutting 要求 playground + e2e + focused 单测），但非 auth / 对外公共 API 契约 / 核心回归路径，故选「建议有测」而非「必须自动化」。focused 单测 + e2e 覆盖关键交互（按 id 解析 + 点击 command + 缺失降级）。

## Execution Plan

### Phase 1 — 注册 + 共享 id 解析层

Status: completed
Targets: `packages/flow-designer-renderers/src/renderer-definitions.ts`、`packages/flow-designer-renderers/src/designer-node-card.tsx`（新建）、`packages/flow-designer-renderers/src/designer-edge-row.tsx`（新建）、`packages/flow-designer-renderers/src/designer-summary-helpers.ts`（新建）

- Item Types: `Fix | Decision | Proof`

- [x] `Fix` 新建 `designer-summary-helpers.ts`：从 `DesignerSnapshot` 按 id 解析 node/edge 摘要的纯函数（`resolveNodeSummary(snapshot, nodeId)` / `resolveEdgeSummary(snapshot, edgeId)`），缺失返回 `undefined`，无 React 依赖（便于单测）。
- [x] `Fix` 新建 `designer-node-card.tsx` / `designer-edge-row.tsx`：最小壳 renderer，`useDesignerContext()` 越界保护 + `useDesignerSnapshotSelector` 按 id 订阅 + `getRootMetaProps` 一致化；缺失 id 降级。
- [x] `Fix` `renderer-definitions.ts` 注册两个 type：lazy component（`useEagerRenderersInTests` 分支同现有）+ `fields: [{key:'nodeId'|'edgeId', kind:'prop'}]`（`nodeId`/`edgeId` 为解析期 value 字段，`'prop'` 与 `designer-field` 的 `name` 字段同模式；`SchemaFieldKind` 无 `'value'`，见 `packages/flux-core/src/types/schema.ts`）。
- [x] `Decision` 确认 capability contract：node-card `selectNode`/`focusNode`、edge-row `focusEdge`，映射 design.md §8 designer command（复用 `dispatch` + `toActionResult`）。
- [x] `Proof` focused 单测 `designer-summary-helpers.test.ts`：命中 / 缺失 / 空 id 三个分支。

Exit Criteria:

- [x] `{type:'designer-node-card', nodeId}` / `{type:'designer-edge-row', edgeId}` 在带 designer context 的测试挂载下能解析渲染（registry 已注册，type 不再未解析）。
- [x] `designer-summary-helpers.test.ts` 三分支全绿（局部 vitest）。

### Phase 2 — 视觉实现 + designer command 交互

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-node-card.tsx`、`packages/flow-designer-renderers/src/designer-edge-row.tsx`

- Item Types: `Fix | Proof`

- [x] `Fix` node-card 视觉：type label（`useNodeTypeConfig`）+ position（来自 node 摘要）+ 选中态（snapshot `selection`）+ `nop-designer-node-card` marker + 点击触发 `selectNode`/`focusNode` command。
- [x] `Fix` edge-row 视觉：source→target（经 node id 查 label 或直显 id）+ `nop-designer-edge-row` marker + 点击触发 `focusEdge` command。
- [x] `Fix` 缺失/空 id 受控降级（node-card-missing / edge-row-missing / node-card-no-id，见 Failure Paths）。
- [x] `Proof` focused 单测（挂在 `designer-page.test-support.tsx` 的 designer context 下）：marker 存在、点击派发 command（spy `dispatch`）、缺失 id 降级、context 越界抛错。

Exit Criteria:

- [x] node-card 在有 id 时渲染 type label + position + 选中态；点击派发 `selectNode` command（可被 spy 断言）。
- [x] edge-row 在有 id 时渲染 source→target；点击派发 `focusEdge` command。
- [x] 缺失 id / 空 id / 越界三个降级路径行为符合 Failure Paths 表。

### Phase 3 — playground + e2e + owner-doc 同步

Status: completed
Targets: `apps/playground/src/`、`tests/e2e/`、`docs/components/designer-node-card/design.md`、`docs/components/designer-edge-row/design.md`、`docs/components/amis-baseline-matrix.md`、`docs/components/roadmap.md`、`docs/logs/2026/`

- Item Types: `Fix | Proof | Follow-up`

- [x] `Fix` playground 演示：在现有 designer demo 面（workflow/taskflow）的 inspector / 摘要区组合 `designer-node-card` + `designer-edge-row`（复用现有 designer-page demo，不新建独立路由）。
- [x] `Proof` e2e：新增覆盖 node-card / edge-row 渲染 + 点击 command 的 e2e（非截图，用 `page.locator`/`getByTestId`/`page.evaluate` 程序化断言 marker 与 command 效果）。
- [x] `Fix` owner-doc 同步：两份 design.md §3 状态翻转「已注册」、§12 翻转为已落地并指向本 plan；`amis-baseline-matrix.md` 对应状态同步。
- [x] `Follow-up` roadmap 同步：Phase Status `D1a` `todo` → `done`（**仅 closure audit 通过后**），并修订 roadmap「核心缺口」叙述（`docs/components/roadmap.md`「核心缺口」段当前将 D1a 归类为 `deferred`，标记 done 时需把该 prose 一并改为已收口，避免「Phase Status done 但正文仍称 deferred」的矛盾）。
- [x] `Follow-up` 更新 `docs/logs/2026/06-25.md`（或当日 log）记录落地。

Exit Criteria:

- [x] playground 中 node-card / edge-row 可交互（选中节点/边后摘要区显示对应卡片/行）。
- [x] 新增 e2e 用例全绿，既有 designer e2e 无回归。
- [x] 两份 design.md §12 不再含 deferral 措辞，§3 标「已注册」。
- [x] daily log 已记录本次落地。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅子 agent（fresh session）填写。

- Reviewer / Agent: 独立 general sub-agent（fresh session `ses_104f63b6bffeCJ3ThRP41875ql`，不复用起草者上下文）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - 全部引用经 live repo 逐条核对（schemas.ts:45-53、renderer-definitions.ts:212-287 仅注册 4 type、host-projection.ts:185-187 + manifest.ts:441 + context.ts:132 的 host bridge 稳定性证据、context.ts 各 hook、designer-page.tsx 注册范本、两份 design.md §12/§3 措辞、roadmap D1a 为唯一 `todo`）—— 零偏差。
  - Minor 1（已采纳修正）：Phase 1 `fields` `kind:'value'` 非合法 `SchemaFieldKind`，已改为 `kind:'prop'`（并补 `SchemaFieldKind` 注脚）。
  - Minor 2（已采纳修正）：Non-Goals xyflow node/edge 路径补全 `designer-xyflow-canvas/` 目录前缀。
  - Minor 3（已采纳修正）：Phase 3 补显式「修订 roadmap 核心缺口 deferred 叙述」checklist 项，避免 Phase Status done 与正文 deferred 矛盾。
  - 架构合理性：§12「过早注册会固定画布实现细节」concern 由稳定、版本化的 `HostProjectionContract`（manifest V1 消费、context 构造）解除；schema 级 renderer 与 xyflow 画布内 renderer 为不同渲染层，无重叠。零 Blocker / 零 Major → 达成共识，plan 升级 `active`。

## Closure Gates

> 关闭条件：本 section 全部 `[x]` + 每个 Phase Exit Criteria 全 `[x]` 后，方可 `Plan Status: completed`。closure-audit 必须由独立 fresh-session 子 agent 执行，执行 session 不得自审勾选。

- [x] `designer-node-card` / `designer-edge-row` 已在 `flowDesignerRendererDefinitions` 注册，schema 可解析渲染。
- [x] 两个 renderer 按 id 解析 node/edge 摘要、渲染 marker、支持 designer command，缺失 id 受控降级。
- [x] 两份 design.md §12 deferral 已翻转，§3 标「已注册」（不存在「接口已出现但语义未落地」的悬空）。
- [x] focused 单测（helpers 三分支 + renderer marker/command/降级/越界）已完成。
- [x] playground 演示 + e2e 已落地，既有 designer e2e 无回归。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift。
- [x] 受影响 owner docs（两份 design.md、amis-baseline-matrix、roadmap Phase Status）已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### node-card 端口/扩展投影字段（ports/badges/selected/invalid）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design.md §4 明确「建议后续补充」，首版 `nodeId` + type label + position + 选中态已满足「schema 级节点摘要展示」契约成立；扩展字段不阻塞注册契约。
- Successor Required: `no`（按需启动时独立评估）

### edge-row sourceLabel/targetLabel/status 扩展字段

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design.md §4 同理，首版 source/target id + label 已满足「schema 级边摘要展示」契约成立。
- Successor Required: `no`

### 自由 region 模板（node-card header/body/footer、edge-row actions）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design.md §6 标注「首版不建议开放自由 regions」；固定摘要展示契约成立即可。
- Successor Required: `no`

## Non-Blocking Follow-ups

- node-card/edge-row 扩展投影字段（ports/badges/status）按 design.md §4/§6 后续按需引入。
- 若未来 designer inspector 区需要批量 node/edge 摘要列表，可评估独立的 `designer-node-list` / `designer-edge-list` 容器（区别于逐个 node-card/edge-row）。

## Closure

Status Note: D1a 两个 renderer（`designer-node-card`/`designer-edge-row`）已注册落地于 `flowDesignerRendererDefinitions`（按 id 解析 node/edge 摘要、渲染 type label/position/source→target/选中态、点击派发 `selectNode`/`selectEdge` command、缺失 id 受控降级）；design.md §12 两处 deferral 已翻转、§3 标「已注册」；amis-baseline-matrix 两 renderer `runtime`；roadmap D1a `done`；主组件 roadmap `todo`/`deferred` 队列清空。含 playground 摘要 demo（flow-designer 页「节点/边摘要」tab）+ e2e（3 用例）+ focused 单测（helpers 7 + renderer 9）。

Closure Audit Evidence:

- Auditor / Agent: 独立 general sub-agent（fresh session `ses_104dc0f4dffelwAt9420hwnncn`，不复用执行 session 上下文）
- Verdict: `approved`
- Evidence:
  - 注册确认 — `designer-node-card` @ `renderer-definitions.ts:302`、`designer-edge-row` @ `:307`；lazy component @ `:55`/`:60`；eager-test 静态 import @ `:18-19`；`unstable.ts:11-12` 导出两者。
  - 纯函数 helpers 确认 — `designer-summary-helpers.ts` 仅 import `type`，零 React 依赖；缺失/空 id 返回 `undefined`。
  - Renderer 契约确认 — `nop-designer-node-card`/`nop-designer-edge-row` marker、`dispatch({type:'selectNode'/'selectEdge'})`、缺失 id 降级 `data-empty="true"` + `aria-hidden="true"`（不抛错）、`useDesignerContext()` 越界保护。
  - 文档翻转正确 — 两份 design.md §12 deferral 已删除线 + 「已落地」；`amis-baseline-matrix.md:177-178` 均 `runtime`；`examples.manifest.json:112` `declaredButUnregistered: []`；`roadmap.md:33` D1a `done`、`:78` 核心缺口「已收口」。
  - 测试复核全绿 — focused 2 files/16 tests；full package 28 files/180 tests（与执行 session 声称一致）。
  - `packages/*/src/` 无构建产物；无静默降级 — 3 个 "Deferred But Adjudicated" 项均为 `design.md` §4/§6 合法 out-of-scope。
- Follow-up（non-blocking）：执行 session `pnpm build` 的 2 条 ineffective-dynamic-import warning 与既有 designer renderer 同模式（静态 import for eager-test + dynamic for lazy），acceptable。

Follow-up:

- node-card/edge-row 扩展投影字段（ports/badges/status）按 design.md §4/§6 后续按需引入。
- 若未来 designer inspector 区需要批量 node/edge 摘要列表，可评估独立的 `designer-node-list` / `designer-edge-list` 容器。
