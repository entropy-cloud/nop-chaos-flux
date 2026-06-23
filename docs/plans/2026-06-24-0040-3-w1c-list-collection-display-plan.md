# W1c 集合展示组（list）

> Plan Status: completed
> Last Reviewed: 2026-06-24
> Source: `docs/components/roadmap.md` W1c；`docs/components/list/design.md`（契约已立约）；`docs/components/package-splitting-strategy.md` §478/§620
> Related: 解锁后续 W2a（roadmap 依赖图 `L0 & W1c → W2a`）；`loop` renderer（`flux-renderers-basic`，list 复用其 repeated-instance substrate 但保持自身 UI 壳语义）
> Mission: components
> Work Item: W1c

## Purpose

把 roadmap W1c（集合展示组：`list`）从"design.md 已立约、代码 0%"推进到"`list` renderer 实现 + 注册 + playground + e2e + roadmap W1c 标 done"。`list` 是有 UI 的顺序型集合展示 renderer（视觉壳 + 条目容器 + 空态），区别于无 UI 的结构展开节点 `loop`。归属既有包 `flux-renderers-data`（无需新包骨架），复用 `loop` 的 repeated-instance substrate 但保持独立 schema/视觉契约。

本 plan 解锁 W2a 数据组合组（roadmap 依赖图 `L0 & W1c → W2a`）。

## Current Baseline

> 截至 2026-06-24 的 live repo 核查结论（read-only）：

- **包已存在**：`packages/flux-renderers-data/` 已落地（deps: flux-core/flux-i18n/flux-react/@nop-chaos/ui + `@tanstack/react-virtual`；已注册 table/tree/crud/data-source/chart）。alias + project ref 已就绪。无新包骨架工作。
- **`list` 未实现**：`packages/flux-renderers-data/src/` 无 `list-renderer.*`；`data-renderer-definitions.ts` 无 `list` type。`amis-baseline-matrix.md` L117 标 `targetContract`，wave 1。
- **substrate 可复用**：`loop` renderer（`flux-renderers-basic`）提供 repeated-instance instantiation 模式；`table`/`tree`（data 包）提供行/scope 模型。list design §2/§11 明确内部可复用 loop 的 repeated-item instantiation，但 schema 契约保持 list 自身语义（不降格为无 UI 结构节点）。
- **既有相关 hook**：`packages/flux-renderers-data/src/use-infinite-scroll.ts` 已存在（mobile/scroll 工作产物）；list design §7 明确首版不预置分页/排序状态，infinite-scroll 集成属后续增强（roadmap W1d）。
- **owner-doc 无 drift**：`docs/components/list/design.md` §3 已正确指向 `flux-renderers-content`?——核查：实际写的是 `flux-renderers-data`，与 roadmap 一致，**无 drift**（区别于 W1a/W1b）。
- **boundary 已立约**：list design §12 明确两条边界——坚持单一 `items` 字段（防"列表+私有模板协议"双轨）；`list`（有 UI 集合）vs `loop`（无 UI 结构展开）不可互吞。

## Goals

- `list` renderer 实现为有 UI 的集合展示（视觉壳 + `item` region 模板 + `empty` 空态），遵循 `RendererComponentProps` 契约。
- 单一 `items` 字段原则（value/source-enabled），`item` 为 region，`empty` 为 value-or-region；避免私有模板双轨。
- 最小事件 `onItemClick`、`onSelectionChange`（`selectionMode` 明确 ownership）。
- `list` `RendererDefinition` 合入 `data-renderer-definitions.ts`；注册随 `registerDataRenderers`。
- playground 演示页 + e2e（程序化断言，非截图）；roadmap W1c 标 done + amis-baseline-matrix 标 runtime。

## Non-Goals

- 不预置分页/排序协议（design §7 首版不持有；分页归 W2a `pagination`，infinite-scroll 集成归 W1d）。
- 不把 `list` 做成无 UI 结构节点（那是 `loop` 的职责）。
- 不引入虚拟滚动（首版聚焦条目渲染；大列表虚拟化归后续性能优化，`@tanstack/react-virtual` 已在 data 包可用）。
- 不重建 repeated-instance substrate（复用 loop/table 既有模式）。
- 不实现 W2a 数据组合组（service/pagination/cards/wizard/alert）。

## Scope

### In Scope

- `list` renderer：`items`（value/source-enabled）迭代 → `item` region 实例化；`empty`（value-or-region）空态；视觉壳 + `nop-list` marker。
- `onItemClick`、`onSelectionChange`、`selectionMode`（single/multiple/none，明确 selectionOwnership）。
- `list` `RendererDefinition` 合入 `data-renderer-definitions.ts`（category `'data'`/`'display'`，fields：item region、empty value-or-region、items/selectionMode value）。
- focused 单测 + playground 演示页 + e2e。
- roadmap W1c 标 done + amis-baseline-matrix L117 标 runtime。

### Out Of Scope

- 分页/排序协议（W2a）。
- infinite-scroll 集成（W1d）。
- 虚拟滚动（后续性能优化）。
- W2a 其余组件。

## Failure Paths

> 集合展示有空态、选择、条目点击可测失败路径。

| 场景编号             | 触发                       | 行为                                                   | 可重试 | 用户可见表现          |
| -------------------- | -------------------------- | ------------------------------------------------------ | ------ | --------------------- |
| list-empty           | `items` 为空数组/null      | 渲染 `empty`（value-or-region）                        | 否     | 空态而非空白          |
| list-item-render     | `items` 有 N 项            | `item` region 实例化 N 次，每项独立 scope（item/index) | 否     | N 个条目可见          |
| list-onitemclick     | 点击条目                   | 触发 `onItemClick`（携带 item/index 上下文）           | 否     | 点击有响应            |
| list-selection       | `selectionMode:'single'`   | 单选互斥，触发 `onSelectionChange`                     | 否     | 仅一项高亮            |
| list-selection-multi | `selectionMode:'multiple'` | 多选累加                                               | 否     | 多项高亮              |
| list-no-private-dsl  | `items` 唯一集合字段       | 不引入第二套模板协议（防止双轨）                       | 否     | schema 保持单一 items |

## Test Strategy

本档选择：**建议有测**

理由：`list` 是一般功能组件（集合展示），无鉴权/对外契约/核心回归路径风险。按 tier 表属"建议有测"。focused 单测覆盖 item region 实例化、空态、选择态机、onItemClick 上下文；e2e 覆盖 playground 演示页渲染 + 点击 + 选择（程序化断言，非截图）。infinite-scroll/分页不在首版，无需自动化回归。

## Execution Plan

### Phase 1 - list 核心集合展示（Proof + Fix）

Status: completed
Targets: `packages/flux-renderers-data/src/list-renderer.tsx`（新建，colocated `list-renderer.test.tsx`）

- Item Types: `Proof` + `Fix`

- [x] **Proof**：focused 单测——`items` 有 N 项时 `item` region 实例化 N 次（每项独立 scope 含 item/index）；`items` 空/null 渲染 `empty`；单一 `items` 字段（无双轨）。
- [x] **Fix**：`list-renderer.tsx`——视觉壳 + `nop-list` marker；消费 `items`（从 `props.props`）迭代，每项经 `props.regions.item.render()`（或 helpers）实例化 `item` region，注入条目 scope；`empty`（value-or-region）空态；复用 loop/table repeated-instance 模式，不新建 substrate。
- [x] **Proof**：focused 单测——`onItemClick` 点击触发并携带 item/index 上下文（经 `props.events`）。
- [x] **Fix**：条目点击接入 `onItemClick`（`props.events`），不影响 item region 子项自身交互。

Exit Criteria:

- [x] `list` 组件实现，遵循 `RendererComponentProps`（不直接访问 store）。
- [x] focused 单测通过（item 实例化计数 / 空态 / onItemClick 上下文，验证行为不仅不报错）。
- [x] 单一 `items` 字段原则成立（代码可观测：无第二套模板协议）。

### Phase 2 - 选择态 + definition + 注册 + playground + e2e + owner-doc 同步

Status: completed
Targets: `packages/flux-renderers-data/src/list-renderer.tsx`（选择态扩展）；`src/data-renderer-definitions.ts`；`apps/playground/src/`；`tests/e2e/`；`docs/components/roadmap.md`；`docs/components/amis-baseline-matrix.md`

- Item Types: `Proof` + `Fix` + `Follow-up`

- [x] **Proof**：focused 单测——`selectionMode:'single'` 单选互斥 + `onSelectionChange`；`'multiple'` 多选累加；`'none'` 不可选。
- [x] **Fix**：`selectionMode` 选择态——明确 `selectionOwnership`（design §7：local controlled state，selection 写入组件本地态并经 onSelectionChange 上报）；single 互斥、multiple 累加。
- [x] **Fix**：`data-renderer-definitions.ts` 增 `list` `RendererDefinition`（`sourcePackage:'@nop-chaos/flux-renderers-data'`，fields：item region、empty value-or-region、items/selectionMode value、onItemClick/onSelectionChange event），随 `registerDataRenderers` 注册（已接入 playground）。
- [x] **Fix**：playground 增 list 演示页（展示 item region 模板、空态、selectionMode 三态）并注册路由。
- [x] **Proof**：e2e（`tests/e2e/w1c-list.spec.ts`）——程序化断言：N 项渲染、空态、点击 onItemClick、single/multiple 选择高亮。**不靠截图**（遵循 AGENTS.md）。
- [x] **Follow-up**：roadmap W1c 标 done（closure 阶段）+ amis-baseline-matrix L117 `targetContract→runtime`（list design.md §3 无 drift，无需改归属）。

Exit Criteria:

- [x] `list` definition 合入并随 `registerDataRenderers` 注册，playground 可渲染 `type:'list'`。
- [x] selectionMode 三态 focused 单测 + e2e 通过（程序化断言）。
- [x] playground list 演示页可访问、交互可用。

## Draft Review Record

- Reviewer / Agent: `ses_10aa01024ffe6WwDwbCL8hmf9q`（fresh session，初评）+ `ses_10a9807c2ffeidULWuCbnWwBE5`（fresh session，confirm re-check）
- Verdict: `pass`（零 Blocker / 零 Major）
- Rounds: 1（初评）+ 1（confirm re-check）
- Findings addressed: 无 Blocker/Major。Minor 观察：Current Baseline 把 `use-infinite-scroll.ts` 标注为"mobile/scroll 工作产物"略松（实居 `flux-renderers-data`，roadmap 归 W1d），不影响执行（plan 已正确把 infinite-scroll 集成 deferred 到 W1d），无需动作。引用准确性全部经 live repo 核对通过。

## Closure Gates

- [x] `list` renderer 实现（有 UI 集合展示：视觉壳 + item region + 空态），遵循 `RendererComponentProps`。
- [x] 单一 `items` 字段原则成立，未引入私有模板双轨。
- [x] selectionMode/onItemClick/onSelectionChange 行为落地 + focused 单测 + e2e 通过。
- [x] `list` definition 注册，随 `registerDataRenderers` 可用。
- [x] roadmap W1c 标 done + amis-baseline-matrix 标 runtime。
- [x] 不存在被静默降级到 deferred 的 in-scope 项。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### list infinite-scroll / 分页集成

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: list design §7 明确首版不预置分页/排序；infinite-scroll 集成属 roadmap W1d（移动端交互组），分页属 W2a（pagination）。首版聚焦静态/已装配 items 渲染，不影响 list 作为集合展示 renderer 的 closure 成立。
- Successor Required: `yes`
- Successor Path: W1d（infinite-scroll）/ W2a（pagination）。

### list 虚拟滚动

- Classification: `optimization candidate`
- Why Not Blocking Closure: 首版条目数未达性能瓶颈；`@tanstack/react-virtual` 已在 data 包可用，待大列表实测瓶颈再接入。
- Successor Required: `no`

## Non-Blocking Follow-ups

- list selection 的 controlled scope ownership 增强（当前 local controlled，未来可接 scope 持久化）——optimization candidate。
- list 与 cards（W2a）的条目模板复用评估——watch-only residual。
- onItemClick 在 playground surface 场景下 dialog body 不继承 per-item scope（strict validation 下 `${item}` 在 dialog body 不可达）；item/index 上下文经由 per-item scope 在 focused 单测中验证。surface body scope 继承为后续 watch-only 观察。

## Closure

Status Note: W1c 完成。`list` renderer（视觉壳 + `nop-list` marker + 单一 `items` + `item` region + `empty` value-or-region + `selectionMode` local controlled + `onItemClick`/`onSelectionChange`）落地于 `flux-renderers-data`，合入 `data-renderer-definitions.ts` 随 `registerDataRenderers` 注册；playground list 演示页（component-lab `#/lab/list`）+ e2e `tests/e2e/w1c-list.spec.ts`（程序化断言）+ focused 单测 `__tests__/data-list-rendering.test.tsx` 全部通过。roadmap W1c→done、amis-baseline-matrix `list`→runtime。解锁 W2a。

Closure Audit Evidence:

- Executor / Agent: 执行 session `ses_w1c_executor`（实现 + 自检，证据如下前三条）。
- Independent Closure Auditor: fresh-session closure-audit pass（opencode mission-driver；非执行 session，不复用执行者上下文）。Verdict: `approved`。
- Evidence:
  - 执行 session 自检：`pnpm typecheck` / `pnpm build` / `pnpm lint` 全绿（53/53、28/28、28/28 tasks）；`pnpm test` 全绿（flux-renderers-data 498 passed；playground 88 passed）；e2e：`tests/e2e/w1c-list.spec.ts` 4 passed；component-lab smoke/nav/batch（含新增 `list` zero-error）97 passed。
  - 独立复验（fresh session，对照 live repo 逐条核对 Exit Criteria + Closure Gates）：
    - 非空壳：`packages/flux-renderers-data/src/list-renderer.tsx`（`ListRenderer` + `ListItemView`）消费 `props.props`(ListSchema)/`props.regions.item.render()`/`props.events.onItemClick|onSelectionChange`/`props.meta`/`props.node.scope`/`props.helpers.createScope`，遵循 `RendererComponentProps`（无直接 store 访问）；`nop-list` marker（`list-renderer.tsx:176/195`）+ `data-slot="list-root|list-item|list-empty"`。
    - selectionMode 三态 local controlled：single 互斥 / multiple 累加 / none 不可选（`useState<Set>` + `onSelectionChange` 上报 `{selectedKeys,selectionMode}`，`list-renderer.tsx:144-171`）；`onItemClick` 派发 per-item scope 携带 clean payload `{type,item,index,key}`（无 nativeEvent 泄漏）。
    - definition 完整：`data-renderer-definitions.ts:511-584` `list` `RendererDefinition`（category `data`；propContracts items/selectionMode/keyField；eventContracts onItemClick/onSelectionChange；fields item region `params:['item','index']` + empty value-or-region）随 `registerDataRenderers` 注册；`index.tsx:10` 导出 `ListRenderer`。
    - focused 单测 `__tests__/data-list-rendering.test.tsx` 覆盖 item 实例化计数 / 空态（空数组+null）/ onItemClick openDialog `${item.name}` / selection none/single/multiple / key-field（验证结果非仅"不报错"）；e2e `tests/e2e/w1c-list.spec.ts` 程序化断言（`toHaveCount`/`toHaveAttribute`/`getByRole`，非截图）。
    - owner-doc 同步：`docs/components/roadmap.md:22` W1c→`done`；`docs/components/amis-baseline-matrix.md:117` list→`runtime`/`landed`；`docs/logs/2026/06-24.md` 记录收口。
    - deferred 诚实：infinite-scroll→W1d、分页→W2a（out-of-scope improvement，均带 successor path）、虚拟滚动（optimization candidate）均非 in-scope live defect。
  - Findings：零 Blocker / 零 Major / 零 Minor。surface dialog body 不继承 per-item scope（strict validation）已记为 watch-only follow-up，item/index 上下文由 focused 单测覆盖。

Follow-up:

- surface body scope 继承评估（watch-only）。
