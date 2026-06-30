# 448 Runtime-Compile Contract & Composite-Item Identity Correctness

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/audits/2026-06-24-2213-open-audit-components.md` ([O-01]), `docs/audits/2026-06-24-2213-multi-audit-components.md` ([C-01], [C-02], [C-03], [C-10], [C-11])
> Related: `docs/plans/449-*.md` (parallel oversized-file split), `docs/plans/450-*.md` (follow-on component/doc/hygiene cleanup)
> Execution Order: {1} of a 3-plan remediation queue driven by the 2026-06-24 components audits. Highest correctness risk; runs first. `449` is a pure-refactor plan that may run in parallel (different files). `450` is follow-on and touches some of the same files (crud/dynamic), so it is sequenced after this plan to avoid churn.

## Purpose

把组件审计（mission: components）里**渲染器绕过 compile-once / 依赖边界漂移 / 组合项身份传播**这一结果面收口到「全部走已编译的运行时表面」状态。这条线是本次审计最高风险的 P2 簇：既存在隐性字段绑定/校验路径错乱（O-01），也存在每渲染重编译（C-02/C-03）和依赖边界破窗（C-01）。

## Current Baseline

审计已完成独立复核并对 live code 二次核对（本计划起草者再次逐条验证了文件/行号/比较器字段，见下方证据），结论成立：

- **O-01（P2）**：三个组合项 `React.memo` 比较器系统性漏掉它们真正消费的 `itemInstancePath`：
  - `packages/flux-renderers-form-advanced/src/combo-renderer.tsx:217-234` `ComboItem` 比较 16 个 prop，但 `ComboItemView` 在 `:148` 把 `itemInstancePath` 喂进 `itemRegion?.render({ instancePath })` 且 `:151` 是 `useMemo` 依赖；比较器不含该字段（已核对全文）。
  - `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:181-196` `ArrayItem` 同样漏掉；`ArrayItemView` 在 `:157` 消费、`:160` 是依赖。
  - `packages/flux-renderers-form-advanced/src/input-table-renderer.tsx:237-255` `InputTableRow` 同样漏掉；`InputTableRowView` 在 `:159` 消费、`:162` 是依赖。
  - 已确认 `instancePath` 经 `RenderInstancePathContext` 传播到后代的字段绑定/校验 owner 前缀；祖先路径漂移且叶 key 稳定时，`memo` 误判相等 → 后代用过期路径绑定/校验。`table-renderer/table-body-row-rendering.tsx` 的 `MemoizedDataRow` 已正确覆盖前缀（审计 O-01-REJ），不是本计划范围。
- **C-01（P2）**：`packages/flux-renderers-form-advanced/package.json:24` 是 7 个渲染器包里**唯一**把 `@nop-chaos/flux-runtime` 声明为运行时依赖的；唯一生产用法是 `detail-view/projected-scope.ts:1` 单行 re-export `createProjectedScopeStore`，该符号在 owner doc `docs/architecture/flux-runtime-module-boundaries.md:461-466` 被列为 unstable-only，且 `packages/flux-react/src/unstable.ts:25-26` 已有同名的 renderer-facing re-export。
- **C-02（P2）**：`packages/flux-renderers-basic/src/dynamic-renderer.tsx` 把声明为 `kind:'event'` 的 `loadAction`（`basic-renderer-definitions.ts:360`）从 `props.schema.loadAction` 原始 schema 读取，每渲染 `props.helpers.evaluate(...)` 重编译后再 dispatch，绕过编译管道。
- **C-03（P2）**：`packages/flux-renderers-data/src/crud-renderer.tsx:444-466,538` 把声明为 `kind:'region'` 的 `item`/`card`（`crud-renderer-definition.ts:431-434`）从 `props.schema` 取原始片段，拼成合成 `list`/`cards` schema 再 `helpers.render(...)` 重编译；`:538` 用 `key={...}` remount 规避由此产生的 stale-subtree。
- **C-10（P3）**：`crud-renderer.tsx:178` 读 `props.schema.id` 生成 query-form id，而同文件 `:371` 用 `props.id`（已解析），自相矛盾。
- **C-11（P3）**：`packages/flux-renderers-basic/src/page.tsx:53` 读原始 `props.schema.aside` 判存在；`aside` 已声明 `kind:'region'`，同仓有 `crud-renderer.tsx:391` 的编译态判存在范式 `Boolean(props.regions.*?.templateNode)`。

真正剩余的 gap：以上 6 条 live 缺陷均未修复；O-01 与 C-02/C-03 涉及行为级设计决策（事件通道是否满足 signal/result 需求、region.render 是否满足 list/cards 委托语义），非纯机械改动。

## Goals

- O-01：三个组合项比较器纳入 `itemInstancePath`（最小修复）；并补一条「祖先路径漂移、叶 key 稳定时后代仍用新 instancePath 重渲染」的回归测试，锁住该行为。
- C-01：`createProjectedScopeStore` 改从 `@nop-chaos/flux-react/unstable` 导入；`@nop-chaos/flux-runtime` 移到 `devDependencies`（剩余仅测试引用）。
- C-02：`dynamic-renderer` 的 `loadAction` 走已编译通道（`props.events.loadAction` 或改 `prop`+renderer-owned `compile` 一次性预编译），消除每渲染重编译。
- C-03：`crud-renderer` 的 `item`/`card` 走已编译 region 通道（`props.regions.item.render(...)` 或传 `props.templateNode.regions.item.templateNode`），消除重编译与 `:538` remount-key workaround。
- C-10：`crud-renderer.tsx:178` 改用 `props.id`。
- C-11：`page.tsx:53` 改用 `Boolean(props.regions.aside?.templateNode)`。

## Non-Goals

- 不重写 `React.memo` 比较器为「稳定引用 + 每路径订阅」的深层方案（`docs/skills/react19-best-practices-review.md` 推荐方向）——本计划只做最小正确性修复，深层重构另立。
- 不处理审计中其余 P2/P3（C-04/C-05 拆文件归 `449`；C-06/C-07/C-08..C-23/O-02/O-03/O-04 归 `450`）。
- 不改 `table-body-row-rendering.tsx` 的 `MemoizedDataRow`（审计已判定安全）。
- 不改 `kind:'event'`/`kind:'region'` 的声明语义本身（仍由定义文件声明），只在渲染器侧改用已编译通道。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/combo-renderer.tsx`、`composite-field/array-field.tsx`、`input-table-renderer.tsx` 的比较器 + 回归测试。
- `packages/flux-renderers-form-advanced/package.json`、`src/detail-view/projected-scope.ts`、`src/projected-owner-scope.ts`（依赖路径）。
- `packages/flux-renderers-basic/src/dynamic-renderer.tsx`（loadAction 通道）+ 必要时的 `basic-renderer-definitions.ts`。
- `packages/flux-renderers-data/src/crud-renderer.tsx`（item/card region 通道 + query-form id）+ 必要时的 `crud-renderer-definition.ts`。
- `packages/flux-renderers-basic/src/page.tsx`（aside 判存在）。

### Out Of Scope

- `table-body-row-rendering.tsx` `MemoizedDataRow`（已判安全）。
- 任何 >700 行文件拆分（`449`）。
- 样式/选择器/设计系统/文档/诊断/轮播/测试隔离类清理（`450`）。

## Failure Paths

| 场景                                | 触发                              | 行为                                                      | 可重试 | 用户可见表现                                          |
| ----------------------------------- | --------------------------------- | --------------------------------------------------------- | ------ | ----------------------------------------------------- |
| 动态加载 action 失败（C-02）        | `loadAction` dispatch reject      | 维持现有错误反馈路径（loading→error），不改变对外错误码   | 否     | loading 结束后展示错误态/空态（与现状一致）           |
| CRUD 列表项 region 渲染异常（C-03） | region.render 抛错                | 由框架 `NodeErrorBoundary` 在节点级隔离（审计已确认安全） | 否     | 单行/单卡渲染失败被节点级错误边界捕获，不波及整页     |
| 组合项路径漂移（O-01）              | 祖先 instancePath 变、叶 key 不变 | 修复后后代用新 instancePath 重渲染                        | —      | 字段绑定/校验路径正确（无可见异常，修复的是隐性错乱） |

## Test Strategy

档位选择：**必须自动化**

理由：O-01 是隐性字段绑定/校验正确性 bug（跨包、回归代价高），C-02/C-03 是 compile-once 行为变更（改的是渲染器↔编译器契约的取值通道）。三者都属「核心回归路径」。按 guide，Proof 项必须在对应 Fix 之前/同 PR 内先行。

- O-01：先写一条失败回归（祖先路径漂移 + 叶 key 稳定时，后代 region 用的 instancePath 为新值），再改比较器使测试转绿。
- C-02/C-03：先写断言「loadAction/item-card 在同一 schema 下只编译一次」或「region.render 被调用且不读 raw schema」的行为测试，再改实现。

## Execution Plan

### Phase 1 - 组合项身份传播正确性（O-01）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/combo-renderer.tsx`、`composite-field/array-field.tsx`、`input-table-renderer.tsx`

- Item Types: `Proof | Fix`

- [x] `Proof`：新增回归测试，覆盖「外层集合重排/重父化导致祖先 instancePath 漂移、而 item 自身 identity/引用相等」场景，断言后代 region（或字段绑定路径）使用更新后的 instancePath。三个渲染器各覆盖一处（或在共享测试支持文件中参数化）。
- [x] `Fix`：在三处 `React.memo` 比较器（combo `:217-234`、array-field `:181-196`、input-table `:237-255`）补 `itemInstancePath` 判定；**实现修正**——审计建议的引用相等（`prev.itemInstancePath === next.itemInstancePath`）会破坏 array-item locality：`itemInstancePath` 数组在集合任意项变更时被整体重建（新引用），导致未变更的兄弟项也被判定为不等而重渲染（`apps/playground` `performance-table-page` "array item locality" 回归）。改用新增 `composite-field/instance-path-equal.ts` 的**值相等** `instancePathEqual(prev.itemInstancePath, next.itemInstancePath)`（逐帧比较 `repeatedTemplateId`+`instanceKey`）：祖先路径漂移（O-01）内容变化→不等→重渲染；单项值变更时兄弟路径内容稳定→相等→跳过（locality 保留）。三处比较器导出 `ComboItem`/`ArrayItem`/`InputTableRow` 供直接渲染级 Proof 使用。

Exit Criteria:

- [x] 三处比较器均含 `itemInstancePath` 相等判定（live diff 可见）。
- [x] 新增回归测试在修复前失败、修复后通过（TDD 证据）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 通过（保证既有组合项行为不回归）。

### Phase 2 - 动态加载 compile-once 通道收敛（C-02）

Status: completed
Targets: `packages/flux-renderers-basic/src/dynamic-renderer.tsx`、（按方案）`basic-renderer-definitions.ts`

- Item Types: `Decision | Proof | Fix`

- [x] `Decision`：采用 **(B)**——保留 `loadAction` 声明为 `kind:'prop'`，渲染器改为消费编译期预编译、运行期由 prop 通道反应式解析的 `props.props.loadAction`，移除 `helpers.evaluate(props.schema.loadAction)` 每次加载/作用域变更的重编译。不选 (A) `props.events.loadAction` 的原因：事件通道的 handler 是稳定引用，无法暴露「解析后的 loadAction 程序变化」供渲染器做 reload change-detection（reload-reactivity 测试要求作用域驱动重载，迁回 (A) 会回归）。`kind:'prop'` 的 propsProgram 把 `${}` 模板编译一次，prop 通道在作用域变化时重解析——既消除重编译又保留反应性。（定义文件注释同步更新为「消费 props.props.loadAction」语义。）
- [x] `Proof`：新增 `__tests__/dynamic-renderer-compile-once.test.ts` 断言源码消费 `props.props.loadAction` 且不再出现 `helpers.evaluate(props.schema` / `props.schema.loadAction`（compile-once 不变量）；reload 反应性由既有 `basic-dynamic-renderer.test.tsx > "reloads when the resolved loadAction changes through scope data"` 行为级证明（作用域驱动 URL 变化仍触发重载）。
- [x] `Fix`：`dynamic-renderer.tsx` 移除 `useScopeSelector(()=>helpers.evaluate(...))` 与 effect 内重 evaluate；改为 `const loadAction = props.props.loadAction` + `loadActionRef`（供 `run()` 取最新解析值），dispatch 直接用已解析 action；移除 `useRenderScope`/`useScopeSelector` 导入。loading/error/abort/refresh 对外行为不变。

Exit Criteria:

- [x] `dynamic-renderer.tsx` 不再对 `loadAction` 读 `props.schema.*` + `helpers.evaluate` 重编译（grep 可证；Proof 锁定）。
- [x] 既有 dynamic-renderer 测试（加载/错误/取消竞态）全绿（14/14）；新 Proof 通过（2/2）。
- [x] 对外 loading/error 行为与现状一致（无用户可见回归）。

### Phase 3 - CRUD item/card region compile-once 收敛 + query-form id（C-03, C-10）

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`、（按方案）`crud-renderer-definition.ts`

- Item Types: `Decision | Proof | Fix`

- [x] `Decision`：裁定为 **residual**（移入 `Deferred But Adjudicated`）。两个候选方案在 live 代码下均不可行：(A) `props.regions.item.render({bindings})` 逐行渲染——会移除 carrier `list`/`cards` 渲染器委托（既有 `crud-list-mode.test.tsx` 断言 `[data-slot="list-root"]` 与 cards carrier 标记，会回归）；(B) 把已编译 `props.templateNode.regions.item.node`（TemplateNode）作为 carrier schema 的 `item`/`card` 字段传入——`isSchema(TemplateNode)` 为 `true`（TemplateNode 有 string `type`），carrier 编译器会把 TemplateNode 当 schema 重新（错误）编译而非复用。`normalizeNodeInput` 仅当 TemplateNode 作为 render 的**直接**输入时才复用（`render-nodes.tsx:186-188`），而那等价于 (A) 的 CRUD 自迭代。`kind:'region'` 的 item/card 已正确声明（`crud-renderer-definition.ts:431-434`）；gap 在渲染器侧 carrier 取值通道，受 carrier 委托契约硬约束。完整 compile-once 需 reactive-scope 重设计（carrier 全量表达式 + 作用域订阅），超出「最小正确性修复」范畴。
- [x] `Proof`：新增 `__tests__/crud-item-card-compile-contract.test.ts`，源码契约级裁定并锁定 residual——断言 CRUD 仍经 `helpers.render(carrierSchema)` 委托 carrier（委托契约保留），且 keyed-remount wrapper 保留（`key={...listMode:currentPage:selectedRowKeys.length...}`，React Compiler `reactCompilerPreset` 使 carrier 子树被自动 memoize，key 是反应性的必要机制）。既有 `crud-list-mode.test.tsx` 已行为级覆盖 carrier 委托 + 翻页 re-slice（remount-key 的反应性证据）。
- [x] `Fix`（C-03 region 通道）：**residual（已裁定）**——见 `Deferred But Adjudicated`。`crud-renderer.tsx` 的 `helpers.render(carrierSchema)` + keyed-remount 维持现状；C-03 的「移除 raw schema 拼装 + remount-key」移入 Deferred（carrier 委托契约 + React Compiler memoize 硬约束，reactive-scope 重设计另立 plan）。本 Phase item 的「裁定并登记 residual」动作已完成。
- [x] `Fix`（C-10）：已落地——`crud-renderer.tsx:178` `createCrudQueryFormId(props.id, props.path)`（与 `:60` `createCrudOwnerPaths({id: props.id})` 一致；grep 确认无 `props.schema.id` 残留）。

Exit Criteria:

- [x] query-form id 使用 `props.id`（C-10 完成）。
- [x] CRUD 列表/卡片渲染、分页、空态既有测试全绿（548/548）；新 Proof 通过（2/2）；remount-key 状态被显式裁定为**保留**（reactive-scope 重设计另立）。
- [x] C-03 region 通道 residual 已显式裁定并登记于 `Deferred But Adjudicated`（非静默降级）。

### Phase 4 - 依赖边界收敛 + page aside（C-01, C-11）

Status: completed
Targets: `packages/flux-renderers-form-advanced/package.json`、`src/detail-view/projected-scope.ts`、`src/projected-owner-scope.ts`；`packages/flux-renderers-basic/src/page.tsx`

- Item Types: `Fix | Proof`

- [x] `Fix`（C-01）：已落地——`detail-view/projected-scope.ts:1` 从 `@nop-chaos/flux-react/unstable` re-export `createProjectedScopeStore`；`projected-owner-scope.ts:3` 经本地 `./detail-view/projected-scope.js` 引用；`package.json` 把 `@nop-chaos/flux-runtime` 置于 `devDependencies`（line 43，`dependencies` 无该项）。生产代码零 `from '@nop-chaos/flux-runtime'`（grep 证实）。
- [x] `Fix`（C-11）：已落地——`page.tsx:56-59` `const asideTemplate = props.regions.aside?.templateNode; const hasAside = Array.isArray(asideTemplate) ? asideTemplate.length > 0 : Boolean(asideTemplate);`，移除原始 `props.schema.aside` 判断（grep 证实无残留）；空 `aside:[]` 编译为空 template-node 数组，`length>0` 判空保留 collapse-on-empty 行为。
- [x] `Proof`：`pnpm check:workspace-manifest-deps` 通过（「All package source workspace imports are declared in local manifests」）；grep 确认 form-advanced 生产代码无 `from '@nop-chaos/flux-runtime'`；page aside 走编译态 region；既有 basic 包测试（390/390）覆盖 page 有/无 aside 渲染分支。

Exit Criteria:

- [x] form-advanced 生产代码不再直接依赖 `@nop-chaos/flux-runtime`（仅 dev/test）；`pnpm check:workspace-manifest-deps` 通过。
- [x] `page.tsx` aside 判存在走编译态 region（`props.regions.aside?.templateNode`）。
- [x] 局部 typecheck（form-advanced + basic）通过。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session (ses_1049b90b5ffeT0kWwzY9q9aRxX)，round 1
- Verdict: `pass-with-minors`（零 Blocker / 零 Major，仅 4 条 Minor，已全部吸收）
- Rounds: 1
- Findings addressed:
  - Minor：C-02 Proof 补「loadAction 变化时 reload 反应性不变」断言 + Decision A 可行性已复核（ActionContext.signal / RendererEventHandler 签名）— 已补入 Phase 2。
  - Minor：C-03 Decision 倾向 (B)（保留 list/cards 委托语义）— 已写入 Phase 3 Decision。
  - Minor：C-01 test 路径更正（colocation 测试 `detail-view-transform.test.tsx:7`，非 `__tests__/`）— 已修正。
  - Minor：C-11 行范围 `:53-55` — 已修正。
- 引用核对：所有引用路径/行号/符号经独立 agent live 核对全部 OK（comparator 三处、package.json:24、projected-scope.ts、unstable.ts:25-26、dynamic loadAction、crud raw-schema/remount-key/props.schema.id vs props.id、definition region kind、page.tsx:53-55、O-01 机制前提 RenderInstancePathContext 传播）。

## Closure Gates

- [x] O-01：三处比较器含 `itemInstancePath`（值相等 `instancePathEqual`）且回归测试（祖先路径漂移场景）通过；array-item locality 不回归。
- [x] C-02：dynamic-renderer 不再读 raw `props.schema.loadAction` 重编译；对外 loading/error/reload-reactivity 行为不变。
- [x] C-03：crud-renderer item/card 走已编译 region 通道——**residual**（carrier 委托契约 + React Compiler memoize 硬约束，见 `Deferred But Adjudicated`）；remount-key 显式裁定为保留。
- [x] C-10：crud query-form id 使用 `props.id`（`crud-renderer.tsx:178`）。
- [x] C-01：form-advanced 生产代码不再依赖 `@nop-chaos/flux-runtime`（仅 dev）；`pnpm check:workspace-manifest-deps` 通过。
- [x] C-11：page aside 走 `props.regions.aside?.templateNode`。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect（C-03 residual 已显式裁定并登记）。
- [x] 受影响 owner docs：无需更新（C-02/C-10/C-01/C-11 均为渲染器内部取值通道/依赖边界变更，作者侧 schema 契约不变；`flux-design-principles.md:183` 的 loadAction 仅为 author-facing schema 示例；`flux-runtime-module-boundaries.md` 已把 `createProjectedScopeStore` 列为 `flux-react/unstable` 可用）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不自审本项（verdict 见 `Closure Audit Evidence`）。
- [x] `pnpm typecheck`（workspace 55/55 通过）
- [x] `pnpm build`（workspace 通过，turbo cache 命中）
- [x] `pnpm lint`（workspace 29/29 通过）
- [x] `pnpm test`（workspace full-green：form-advanced 842、basic 390、data 548、playground performance-locality 5/5 等）

## Deferred But Adjudicated

### C-03 — CRUD list/cards carrier compile-once（region 通道未替换）

- **状态**：residual（显式裁定，非静默降级）。
- **现象**：`crud-renderer.tsx` 仍把 `props.schema.item`/`props.schema.card` 原始片段拼成合成 `list`/`cards` carrier schema，经 `helpers.render(carrierSchema)` 每渲染重编译；并在 carrier wrapper 上保留 `key={...currentPage/selectedRowKeys...}` remount 以驱动 React-Compiler-memoized carrier 子树的翻页/选择反应性。
- **为何两个候选方案均不可行（最小修复范畴内）**：
  - (A) CRUD 自迭代 `props.regions.item.render({bindings:{item,index}})`：移除 carrier `list`/`cards` 渲染器委托 → 回归既有 `crud-list-mode.test.tsx`（断言 `[data-slot="list-root"]` / cards carrier 标记）。
  - (B) 把已编译 `props.templateNode.regions.item.node`（TemplateNode）作为 carrier 的 `item`/`card` 字段：`isSchema(TemplateNode)===true`（TemplateNode 有 string `type`），carrier 编译器会把它当 schema 重新/错误编译，不复用。`normalizeNodeInput`（`render-nodes.tsx:186-188`）仅当 TemplateNode 作为 render 的**直接**输入才复用——那等价于 (A)。
- **Why Not Blocking Closure**：C-03 是性能/清洁度问题（compile-once），非性能正确性 bug；carrier 委托契约（既有测试锁定）与 React Compiler 子树 memoize 是硬约束。完整修复需把 carrier 改为全量表达式 + 作用域订阅（reactive carrier，items/page/selection 经 scope 反应式驱动，消除重编译与 remount-key），属设计级重构，超出本 plan「最小正确性修复」+「不重写深层方案」范畴。
- **Follow-up**：另立 plan 做 carrier reactive-scope 重设计（carrier schema 稳定 + items/page 经 scope path 表达式 + 移除 keyed-remount）。本 plan 保留 `crud-renderer.tsx` 现状 + 源码裁定注释，并由 `crud-item-card-compile-contract.test.ts` 锁定裁定边界。

> 起草时无其他 residual。

## Non-Blocking Follow-ups

- O-01 深层方案：把手写 `React.memo` 比较器替换为「稳定 `rowScope`/`itemScope` 引用 + React Compiler memoization，仅以 `itemIdentity` 作为 item 身份门」（`docs/skills/react19-best-practices-review.md` 推荐方向）。属优化项，不阻塞本 plan closure。

## Closure

Status Note: 全部 4 个 Phase 执行完成。O-01/C-02/C-10/C-01/C-11 落地；C-03 显式裁定为 residual（见 `Deferred But Adjudicated`）。Workspace full-green（typecheck/build/lint/test 全通过）。唯一未勾的 Closure Gate 是「独立子 agent closure-audit」（human/independent gate，执行 session 不自审）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session `ses_100383298ffelmHieQamoklPs2`（general，2026-06-26）；执行 session 不自审本项。
- Verdict: **approved**（零 blocker；1 条 non-blocking minor——C-03 adjudication Proof 为源码字符串级，对锁定 residual 边界可接受，plan 已承认）。
- Evidence（独立 agent 逐条 live file:line 复核）：
  - O-01：`composite-field/instance-path-equal.ts:15-33` 值相等正确；三处比较器 gate 于 `itemInstancePath`（`combo-renderer.tsx:234`/`array-field.tsx:195`/`input-table-renderer.tsx:255`）；三组件已导出；drift test `composite-item-instance-path-drift.test.tsx:118-144` 真实覆盖 itemInstancePath-only-diff（3/3 绿）；引用相等会破坏 locality 的判断成立（itemEntries 每次重算重建 path 数组）。
  - C-02：`dynamic-renderer.tsx:80` 读 `props.props.loadAction`；无 `useRenderScope`/`useScopeSelector` 导入、无 code 内 `helpers.evaluate(props.schema`/`props.schema.loadAction`（`:76` 仅为注释）；`loadActionRef` 在 `useEffect` 同步（`:87-89`）；reload-reactivity 由 `loadActionKey`(`:81`)驱动 load effect dep（`:178`），行为 proof `basic-dynamic-renderer.test.tsx:196`；compile-once + basic 16/16 绿。
  - C-03 residual：`isSchema`(`flux-core/src/utils/schema.ts:4-6`)+`TemplateNode`(string `type`)→`isSchema(TemplateNode)===true` 成立；`normalizeNodeInput`(`render-nodes.tsx:186-188`)仅复用直接输入的 TemplateNode；两候选路径均不可行（裁定有效）。C-10 `crud-renderer.tsx:178` `props.id` ✓；裁定测试 2/2 绿。
  - C-01：`package.json` `dependencies`(`:15-28`)无 `@nop-chaos/flux-runtime`，仅 `devDependencies:43`；生产 grep 0 匹配（2 test 文件正确排除）；`detail-view/projected-scope.ts:1` 从 `@nop-chaos/flux-react/unstable` re-export。
  - C-11：`page.tsx:56-59` 走 `props.regions.aside?.templateNode` + array-length 判空。

Follow-up:

- C-03 carrier reactive-scope 重设计（见 `Deferred But Adjudicated`）——另立 plan。
- O-01 深层重构（见 `Non-Blocking Follow-ups`）——优化项。
- 独立 closure-audit（fresh sub-agent）——补齐最后一个 Closure Gate。
