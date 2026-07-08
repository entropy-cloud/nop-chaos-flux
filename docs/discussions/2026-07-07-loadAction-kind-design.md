# Discussion: loadAction kind 设计

> **导航**：本文档经过七轮迭代 + 三轮独立审查。阅读顺序建议：
>
> - 想理解问题起源 → 读"## 问题"到"## 待决事项"
> - 想看思路演进（前四轮 A–P + Q–AA 初稿） → 归档文件 `2026-07-07-loadAction-kind-design-evolution.md`（仅审计用，不作落地依据）
> - **想看落地依据 → [## 第五轮修订（BB–LL）](#第五轮修订基于独立审查bbll) + [## 第六轮修订（RR–XX）](#第六轮修订基于第二轮独立审查rrww) + [## 第七轮修订（YY–bbb）](#第七轮修订基于第三轮共识验证yybaaa)**
> - 冲突顺序：YY–bbb > RR–XX > BB–LL > Q–AA（归档）> A–P（归档）
> - **状态**：实现就绪。可按 WW 节 Phase 1 启动 bug 修复

## 问题

`loadAction` 在 renderer definition 中声明为 `kind: 'prop'`，导致 schema compiler 在 `resolveNodeProps` 时**eagerly evaluate** URL 模板（如 `${pagination.currentPage}`）。但 CRUD renderer 的 pagination scope 此时尚未初始化，模板评估失败。

## 当前修复（pragmatic fix）

- CRUD renderer: `loadAction` 改为 `kind: 'event'`，组件从 `props.events['loadAction']`（compiled action plan）读取，不再 eager eval
- Dynamic-renderer: 保持 `kind: 'prop'`（需要 prop-channel reactivity 做 reload change-detection）

| 渲染器              | kind    | 读取来源                       | 能否自动 re-trigger              |
| ------------------- | ------- | ------------------------------ | -------------------------------- |
| Dynamic-renderer    | `prop`  | `props.props.loadAction`       | ✅（prop-channel reactive）      |
| CRUD                | `event` | `props.events['loadAction']`   | ❌（静态 CompiledActionProgram） |
| Form `submitAction` | `event` | `props.events['submitAction']` | ✅（用户触发，不需要自动）       |

## 缺陷

CRUD 用 `kind: 'event'` 后，action 变为静态 `CompiledActionProgram`，**失去 scope binding 变化时自动 re-trigger 的能力**。CRUD 组件内部靠 `useEffect` + `requestKey` 手动管理 re-fetch，但这不是框架层面的解法。

## 正确的架构设计

**`event` 类型的 action 应该支持 reactive re-triggering**：

1. 编译期：event action 编译为 `CompiledRuntimeValue`（非静态 `CompiledActionProgram`），但存储在 `eventPlans` 而非 `compiledPropEntries`
2. 运行时：action 在 `resolveNodeProps` 时**不 eager eval**（避免 pagination 等 scope 数据未初始化的问题）
3. 组件读取 event plan，当 scope bindings 变化时 action **自动 re-evaluate**
4. 可选：`watch` 表达式显式控制哪些 bindings 变化时触发

这样 `loadAction`、`submitAction`、`quickSaveAction` 等所有 action 都统一为 `kind: 'event'`，且具备 reactive 能力。

## 待决事项

- [ ] 是否创建 plan 实现 reactive event 设计
- [ ] 编译器变更：`compileActions` 返回 `CompiledRuntimeValue` 而非 `CompiledActionProgram`
- [ ] 运行时变更：event plan 存储在可 reactive re-evaluate 的结构中
- [ ] 组件变更：dynamic-renderer / CRUD renderer 统一从 event plan 读取

> **思路演进（前四轮 A–P + Q–AA 初稿）已归档**：`docs/discussions/2026-07-07-loadAction-kind-design-evolution.md`。这些节记录了从"让 event 自动 reactive"逐步演变为"`kind: 'reaction'` + `ReactionHandle`"的过程，以及被否决的替代方案。仅供审计，**不**作为落地依据。

---

## 第五轮修订（基于独立审查，BB–LL）

三个独立 agent（架构一致性 / 实现可行性 / 边界场景与契约）审查后给出"有条件共识"。本节系统解决 P0 blockers 和 P1 majors，**修正 Q–AA 中的若干事实性错误和契约缺口**。每个修订项标注引用的审查发现。

### BB. [P0 blocker] 撤回"自动静态依赖分析"，改为 `dependsOn` **必填**

**引用**：架构审查 BLOCKER（vs `dependency-tracking.md` §3.1）；边界审查 Scenario 8 BLOCKER（vs `dependency-tracking.md` §3.6）；实现审查 Concern 1（机制不可行）。

**事实**：

- `docs/architecture/dependency-tracking.md` §3.1 明确**否决**了"编译期 AST 提取"作为依赖收集的 normative baseline
- §3.6 明确 `when` 是**守卫不是触发器**，`watch` 才是依赖根
- `collectRuntimeDependencies`（`node-runtime.ts:90`）只能走**已求值**的 `RuntimeValueState`，不能静态分析 `CompiledRuntimeValue`
- 现有 `<reaction>` 用 `evaluateReactionWatchValue`（运行期 sample-eval + collect），不是静态分析

**修订**：

- 撤回 Q–AA 中 S 节、T 节 step 3 关于"省略 `dependsOn` 自动静态分析收集"的全部描述
- `kind: 'reaction'` **要求 `dependsOn` 必填**（compile error if missing or empty），不提供 auto-collect
- 理由：避免重复发明一个被 normative 文档明确否决的机制；让作者承担"声明外部依赖"的责任；和 `<reaction>` / `<data-source>` 的"`dependsOn` 是 explicit roots"语义一致
- 后续若要 auto-collect，作为**独立提案**先修订 `dependency-tracking.md`，不在本设计内捆绑

**新约束**：

- `ReactiveActionSchema.dependsOn: readonly string[]`（**非 optional，至少一项**）
- 编译期校验：未声明 / 空数组 → error
- 作者必须**完整列出**所有触发路径，不依赖框架自动收集

### CC. [P0 blocker] `dependsOn: []` 语义澄清（之前的事实错误）

**引用**：边界审查 Scenario 6 BLOCKER。

**事实**：当前 `createRootDependencySet([])` 返回 `undefined`（`scope-change.ts:73-75`），`scopeChangeHitsDependencies(change, undefined)` 返回 `true`（fire on every change）。这是 `dependency-tracking.md` Gap 1（标记 Deferred）。

Q–AA S 节"`dependsOn: []` = 纯命令式（reactive 通道禁用）"**与 live code 冲突**，事实错误。

**修订**：

- 撤回 Q–AA S 节关于空数组的描述
- BB 已规定 `dependsOn` 必填非空，空数组直接 compile error，绕过此歧义
- 若作者真要"纯命令式"，应该用 `kind: 'event'`，不是 `kind: 'reaction'` + 空数组

### DD. [P0 blocker] 自写过滤：`ignoreWritesTo` 字段

**引用**：边界审查 Missing Scenario C BLOCKER（headline 用例自循环）。

**事实**：

- `dependency-tracking.md` §4.4 + `filterScopeChangeByIgnoredRoots`（`scope-change.ts:92`）只为 `<data-source>` 做"自己的发布根不触发自己"过滤
- `kind: 'reaction'` 的 wrapper 没有声明发布根，可以写任何路径
- **CRUD headline 用例**：`dependsOn` 必然包含 `pagination.currentPage`（URL 引用它），但 CRUD 在 server-pagination 修正时会写 `pagination`（`crud-renderer-state.ts:599`）→ **自循环直到 `MAX_CASCADE_DEPTH=100`**

**修订**：

`ReactiveActionSchema` 增加 `ignoreWritesTo`：

```ts
export interface ReactiveActionSchema extends ActionSchema {
  /** 必填，至少一项。声明触发重跑的 scope 路径。 */
  dependsOn: readonly string[];
  /** 可选。声明 wrapper 会写入的路径；这些路径的写不触发本 reaction。 */
  ignoreWritesTo?: readonly string[];
}
```

运行期：`registerRendererReaction` 内部把 `ignoreWritesTo` 线程进 `filterScopeChangeByIgnoredRoots`，等价于 `<data-source>` 的自写过滤。

CRUD 用例：

```json
"loadAction": {
  "action": "ajax",
  "args": { "url": "/api/users?page=${pagination.currentPage}" },
  "dependsOn": ["routeParams.deptId", "pagination.currentPage"],
  "ignoreWritesTo": ["pagination"]
}
```

或者作者可以选择只 watch `routeParams.deptId`（pagination 变化通过命令式 refresh 触发），那样就不需要 `ignoreWritesTo`。设计上**两条路径都合法**，作者按用例选择。

### EE. [P0 blocker] `ReactionHandle` disposal 契约

**引用**：边界审查 Scenario 3 BLOCKER。

**新契约**（追加到 Q–AA U 节）：

```
ReactionHandle 生命周期由 registration 决定：
- registration 销毁（scope dispose / 节点 unmount / runtime.dispose）→ handle 进入终态 `disposed`
- 终态下所有方法（dispatch/force/ready/pause/resume）返回 canonical cancelled result，不调用 rendererOwnedDispatch
- pendingChange 在 dispose 时清除，**不**触发 flush
- wrapper 的 per-fire AbortController MUST 链式依赖 registration 的 lifecycle signal（AbortSignal.any([registrationSignal, perFireSignal])），dispose 即 abort 所有 in-flight fetch
```

### FF. [P0 blocker] 强制 `immediate: false`

**引用**：边界审查 Missing Scenario A。

**新约束**（追加到 Q–AA T 节）：

```
kind: 'reaction' 编译时强制 immediate: false。
ready() 是唯一的首跑权限入口。
作者写 immediate: true 在 ReactiveActionSchema 上 → compile error
（或 silent override 为 false + emit warning，二选一，倾向于前者更明确）。
```

理由：若允许 `immediate: true`，reaction 会在注册时自动 fire，**绕过整个 ready 门控**，重现 T0–T5 失败模式。

### GG. [P1 major] `CompiledReactionPlan` 是**新类型**，不直接复用 `CompiledReaction`

**引用**：架构审查 MAJOR（建议复用）；实现审查 Concern 7（建议新类型）。

**事实**：`CompiledReaction.watch` 是**必填**字段（`compilation.ts:337-364`），但 `kind: 'reaction'` 的 plan 是 path-based（`dependsOn` 而非 `watch` 表达式），没有 watch 值。直接复用会破坏 `CompiledReaction` 的现有契约（`<reaction>` 渲染器依赖 `watch` 必填）。

**修订**：定义新类型，放在 `flux-core/src/types/compilation.ts`：

```ts
export interface CompiledReactionPlan {
  /** 与 eventPlans 同形状的 action 程序 */
  readonly action: CompiledActionProgram;
  /** 必填：触发路径集 */
  readonly dependsOn: readonly string[];
  /** 可选：自写过滤路径集（来自 ReactiveActionSchema.ignoreWritesTo） */
  readonly ignoreWritesTo?: readonly string[];
}
```

`TemplateNode` 增加：

```ts
reactionPlans?: Readonly<Record<string, CompiledReactionPlan>>;
```

（optional，避免破坏现有 TemplateNode consumers。）

### HH. [P1 major] `registerRendererReaction` 是**独立 wrapper**，不污染 `registerReaction`

**引用**：架构审查 MAJOR；实现审查 Concern 2 FEASIBLE。

**修订**：明确 Q–AA W 节措辞。新 API 不是给 `registerReaction` 加 options，而是独立 wrapper：

- 位置：`packages/flux-runtime/src/renderer-reaction-handle.ts`（新文件）
- 内部：调用现有 `registerReaction`，外加 ready/pause/dispose 状态机
- 现有 `<reaction>` 路径（`reaction.tsx:31`）**完全不动**
- ready/pause/resume 状态在 wrapper 本地，不进 reaction-runtime

这把"加状态机"的复杂度隔离在 wrapper 内，reaction-runtime 保持纯净。

### II. [P1 major] `dispatch()` vs `force()` 语义彻底分离

**引用**：实现审查 Concern 3；边界审查 Scenario 4。

**修订**（替换 Q–AA U 节的模糊描述）：

| 方法             | 走 reaction 状态机？      | 更新 `previousValue`/`fireCount`？ | abort 之前 in-flight？ | 用途                                                              |
| ---------------- | ------------------------- | ---------------------------------- | ---------------------- | ----------------------------------------------------------------- |
| `dispatch(ctx?)` | **否**（绕过）            | **否**（fire-and-forget）          | **是**                 | 命令式触发：mount 首次、refresh 按钮                              |
| `force(ctx?)`    | **是**（带 `force=true`） | **是**                             | **是**                 | 强制走 reactive 通道跑一次（忽略 watch 变化检查），保持状态机同步 |
| reactive auto    | 是                        | 是                                 | 是                     | scope 变化自动触发                                                |

`dispatch()` 是"我作为渲染器要跑一次，不要影响 reactive 状态"。`force()` 是"让 reactive 通道跑一次，把状态机推进"。**作者按需选择**，文档必须明示区别。

### JJ. [P1 major] `requestKey` 不全删，`dependsOn` 必须排除 `selection`

**引用**：实现审查 Concern 5 NEEDS-WORK。

**事实**：`serializeCrudRequest({pagination, query, sort, filters})` **不包含 selection**（`crud-renderer-state.ts:517`），所以当前 selection-only 变化**不**触发 refetch。Q–AA Z 节 Phase 3 说"删除原 `requestKey` 序列化机制"会丢这个精确控制。

**修订**（替换 Q–AA Z 节 Phase 3）：

```
Phase 3（CRUD 接入）：
- CrudSchema.loadAction 类型改 ReactiveActionSchema
- field rule 改 kind: 'reaction'
- 显式 dependsOn MUST 排除 selection：
    dependsOn: [
      "<ownerStatePath>.pagination.currentPage",
      "<ownerStatePath>.pagination.pageSize",
      "<ownerStatePath>.query",
      "<ownerStatePath>.sort.column",
      "<ownerStatePath>.sort.direction",
      "<ownerStatePath>.filters",
      ...外部 binding（如 routeParams.deptId）
    ]
    ignoreWritesTo: ["<ownerStatePath>.pagination"]  // 防 server-correction 自循环
- requestKey 的两个职责分别替换：
  - 触发精度 → 显式 dependsOn（如上）
  - server-pagination 防循环 → pause/dispatch/resume + ignoreWritesTo 双保险
- 验证：原 6 个测试转绿 + 新增 regression：
  - selection-only 变化不触发 refetch
  - server-pagination 修正不引发循环
  - 外部 binding 变化触发 refetch
  - manual refresh abort 在 in-flight
```

### KK. [P1 major] `kind: 'reaction'` 轴混合要显式文档化

**引用**：架构审查 MAJOR。

**事实**：现有 6 种 kind 描述"字段是什么"（data kind），`reaction` 描述"何时触发"（trigger model）。这是轴混合。

**修订**：接受轴混合，但在 `field-metadata-slot-modeling.md` 显式文档化（落地后）。修订 Q–AA Q 节追加：

```
注意：'reaction' 与现有 6 种 kind 在轴上不同 —— 现有 kind 描述"data是什么"，
'reaction' 描述"何时触发"。这是有意为之：action 字段本身就是 trigger-shaped，
不需要再分一个独立 trigger 轴。落地时在 field-metadata-slot-modeling.md
加注：'event' 和 'reaction' 是成对的 action-kind，区别在触发模式，
就像 'region' 和 'value-or-region' 是成对的 schema-kind。
```

否决"加 `trigger?: 'imperative' | 'reactive'` modifier"的替代方案——增加正交轴会让 field rule 变成二维查表，复杂度收益不匹配。

### LL. [P1/P2 杂项] 必须补充的契约条款

整理边界审查 P1/P2 项目，统一追加到 Q–AA：

| 条款                               | 内容                                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| StrictMode 双调用                  | `useEffect` 必须 return cleanup，cleanup abort 在 in-flight imperative dispatch；`ready()` 必须幂等                                                                                        |
| pause/resume 语义                  | counter-based nested；counter 归零才 un-pause；`pause()` 不 abort 在 in-flight fire，只防后续 fire；初始 pre-`ready()` paused 态与 explicit `pause()` 独立                                 |
| 共享 cascade pool                  | `registerRendererReaction` **必须**通过同一个 `createRuntimeReactionRegistry` 实例，继承 `MAX_CASCADE_DEPTH=100` 和 `MAX_GLOBAL_CASCADE_DEPTH=200`；命令式 `dispatch()` 按设计豁免级联计数 |
| `evaluationBindings` 合并优先级    | wrapper 注入的 bindings **覆盖** runtime reaction 注入的 `value/prev/changed/changedPaths`（冲突 key 时）；非冲突 key union                                                                |
| `dispatch()` 然后 `ready()` 竞态   | `ready()` 不立即 flush pendingChange；若 `dispatch()` 正在 in-flight，等其 settle 后再决定是否 flush                                                                                       |
| `ReactionHandle` 身份稳定          | handle 的方法 bound，不在每次 render 重建；可安全放进 `useCallback` deps                                                                                                                   |
| `getDebugState()`                  | handle 暴露 `getDebugState(): { phase: 'initial-paused'\|'ready'\|'explicit-paused'\|'disposed'; pendingChange: boolean; fireCount: number; registrationId: string }` 供单测和 e2e 观察    |
| `force()` 与 component handle 集成 | component handle 的 `refresh` capability 调 `loadReaction.force()` 同步返回 `{ok:true}`（fire-and-forget）；外部 await 完成需用 tracked operation                                          |
| 失败语义                           | 失败的 fire 不计入 `control.once`（继承现有 reaction 行为）；失败不 auto-pause；reaction 回到先前 ready/pause 态                                                                           |
| 多个 kind:'reaction' 字段          | 同一节点多个 reaction field 是独立 handle 但共享 scope 和 cascade pool；跨 field 级联可能，作者自管                                                                                        |
| 初始 fire 责任                     | `ready()` **不**自动触发首跑；renderer 必须显式 `dispatch()` 做首跑；`ready()` 只 flush pending（若有）                                                                                    |
| 跨字段 cascade 风险                | `registerRendererReaction` 注册时 emit dev warning 如果检测到 watch path 与同节点其他 reaction field 的 ignoreWritesTo 重叠                                                                |

### MM. 撤回 / 修订的小问题

| 项目                                                 | 处置                                                                                                                                                                                                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q–AA Y 节"`<reaction>` 没有 renderer-owned dispatch" | **修订**：`<reaction>` 有 dispatch，但是 pass-through（`reaction.tsx:35-40`）。改为："`<reaction>` 注入 pass-through dispatch；`kind: 'reaction'` 注入 renderer-owned wrapper（加 evaluationBindings/abort/result 处理）。区别在 wrapper 做什么，不在有没有。" |
| Q–AA R 节 `dependsOn?: readonly string[]`            | **修订**：改为 `dependsOn: readonly string[]`（必填，与 BB 一致）。同时新增 `ignoreWritesTo?: readonly string[]`                                                                                                                                               |
| 文档内部跨轮矛盾                                     | **保留**作为思路演进审计痕迹；通过本节顶部的"冲突顺序：BB–LL > Q–AA > A–P"明确仲裁                                                                                                                                                                             |
| `dependsOn: readonly string[]` vs `string[]`         | **修订**：authored schema 用 `string[]`（与 `ReactionSchema.dependsOn` 一致），编译产物 `CompiledReactionPlan.dependsOn` 用 `readonly string[]`                                                                                                                |

### NN. 修订后的落地分阶段（替换 Q–AA Z 节）

**Phase 1：修当前 bug（独立，立刻做，约 10 行）**

- `crud-renderer.tsx:159`：`props.events['loadAction']` → `props.templateNode.eventPlans['loadAction']`
- `useCrudLoadAction`：入参类型 `ActionSchema | undefined` → `CompiledActionProgram | undefined`
- 同时检查 Form/Page 的 loadAction 测试是否也走同套修复
- 验证：`crud-loadaction.test.tsx` 全绿

**Phase 2：基础设施**

依赖顺序：

1. **flux-core**：`SchemaFieldKind` += `'reaction'` → `CompiledReactionPlan` 类型 → `TemplateNode.reactionPlans?` 字段 → `ReactiveActionSchema` 类型（含必填 `dependsOn`、可选 `ignoreWritesTo`）
2. **flux-compiler**：`node-compiler.ts` 加 `kind === 'reaction'` 分支（抽 `dependsOn` + `ignoreWritesTo`、编译 action、组装 plan）→ `shape-validation-node-fields.ts` 加形状校验
3. **flux-runtime**：`renderer-reaction-handle.ts` 新文件（wrapper + ready/pause/dispose 状态机）；`runtime.registerRendererReaction` API 走同一个 registry
4. **flux-react**：`node-renderer-resolved.tsx` 单 `useEffect` 注册所有 `reactionPlans`，handle 存 `useState`/`useRef`，dispose on unmount

每个 step 独立单测；Critical path item：步骤 2（编译器变更）—— 因 BB 撤回了 auto-collect，编译器只需做形状校验和路径抽取，**实现风险显著降低**。

**Phase 3：CRUD 接入**

按 JJ 节修订执行。**不**全删 `requestKey`，按职责拆分替换。regression tests 覆盖 selection/server-pagination/外部 binding/manual refresh。

**Phase 4：Form / Page loadAction（统一）**

Form/Page 的 loadAction 测试当前也红，Phase 1 修 bug 后视情况：若仍需要 reactive（mount 拉数据 + 外部 binding 变化重跑），同样接入 `kind: 'reaction'`；若仅 mount-时拉一次，可直接用 `kind: 'event'`（同 submitAction）。

**Phase 5：（可选）`<reaction>` 渲染器统一**

未来可考虑让 `<reaction>` 渲染器底层也走 `registerRendererReaction`，统一两套实现。当前**不做**，因为 `<reaction>` 的 pass-through dispatch 不需要 ready/pause/gating，强行统一反而增加复杂度。

### OO. 否决项追加

| 提议                                              | 否决理由                                                                                                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 编译期静态依赖分析（auto-collect from args/when） | 违背 `dependency-tracking.md` §3.1（明确否决）+ §3.6（when 是守卫不是触发器）；机制也不可行（`collectRuntimeDependencies` 不能静态分析 `CompiledRuntimeValue`） |
| `dependsOn: []` 表达"纯命令式"                    | 与 live code 冲突（`createRootDependencySet([])` → undefined → fire on every change）；要纯命令式就用 `kind: 'event'`                                           |
| 复用 `CompiledReaction` 类型存 `reactionPlans`    | `CompiledReaction.watch` 必填，但 `kind: 'reaction'` 是 path-based 没 watch 值；强行复用会破坏 `<reaction>` 契约                                                |
| 给 `registerReaction` 加 ready/pause options      | 污染现有 `<reaction>` 路径；状态机复杂度应隔离在 wrapper                                                                                                        |
| 在 `kind: 'reaction'` 上允许 `immediate: true`    | 绕过 `ready()` 门控，重现 T0–T5 失败模式                                                                                                                        |
| 加 `trigger?: 'imperative'\|'reactive'` modifier  | 让 field rule 变成二维查表，复杂度收益不匹配                                                                                                                    |
| 全删 `requestKey`（不区分职责）                   | 丢 selection-only 不 refetch 的精确控制；按 JJ 节按职责拆分替换                                                                                                 |

### PP. 文档影响清单（落地时需要更新）

| 文件                                                  | 更新内容                                                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `docs/architecture/field-metadata-slot-modeling.md`   | 加 `'reaction'` 到 SchemaFieldKind；说明 'event'+'reaction' 是成对 action-kind，区别在触发模式                           |
| `docs/architecture/dependency-tracking.md`            | 撤回 Q–AA 中"静态分析"提议；记录 `kind: 'reaction'` 走 explicit `dependsOn`，自写过滤通过 `ignoreWritesTo`               |
| `docs/architecture/renderer-runtime.md`               | `RendererComponentProps` 加 `reactions: Readonly<Record<string, ReactionHandle>>`；记录新 channel 与 events/regions 并列 |
| `docs/architecture/flux-runtime-module-boundaries.md` | "Source and reaction runtime" 节加 `registerRendererReaction` + `ReactionHandle`                                         |
| `docs/architecture/action-scope-and-imports.md`       | 注明 `kind: 'reaction'` 是新的 action-bearing field 类别，区别于 `onXX` events                                           |
| `docs/references/quick-reference.md`                  | SchemaFieldKind 列表加 `'reaction'`；field rule 示例加 `kind: 'reaction'`；prop channel 表加 `props.reactions`           |
| `docs/references/renderer-interfaces.md`              | 记录 `ReactionHandle` 接口形状                                                                                           |
| `docs/architecture/flux-core.md`                      | 编译产物讨论加 `kind: 'reaction'` 走 `reactionPlans`，平行于 `compiledSources`/`compiledReactions`                       |

### QQ. 三份独立审查的共识总结

| 维度                                            | 共识                                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Phase 1 bug 修复                                | 三方一致认为正确，应独立立刻做                                                     |
| 三 kind 分类法（prop/event/reaction）           | 三方一致认为概念正确                                                               |
| Package 边界划分                                | 三方一致认为清晰                                                                   |
| Channel 配对（reactionPlans ↔ props.reactions） | 三方一致认为与 events/regions 一致                                                 |
| `kind: 'reaction'` 实现可行性                   | 三方一致认为可行（修订后）                                                         |
| 静态依赖分析                                    | 三方一致否决（违背 normative 文档）                                                |
| `dependsOn: []` 表达"纯命令式"                  | 边界审查 BLOCKER；其他两方未单独验证但同意需澄清                                   |
| 自写过滤                                        | 边界审查 BLOCKER；其他两方在 implementation/risk 中也提及                          |
| `ReactionHandle` disposal 契约                  | 边界审查 BLOCKER；其他两方在 major 中提及                                          |
| `CompiledReactionPlan` 类型                     | 架构审查建议复用 `CompiledReaction`；实现审查建议新类型（最终采用新类型，理由 GG） |

**结论**：P0 blockers 全部在本轮（BB–LL）解决。P1 majors 全部澄清或修订。落地依据以 BB–LL 为准，Q–AA 中与之冲突的部分（S/T/U/W/X/Z 节的具体描述）按 BB–LL 修订执行。

---

## 第六轮修订（基于第二轮独立审查，RR–WW）

第二轮独立审查（修复验证 + 实现就绪度）发现：BB–LL 解决了原 P0/P1，但引入 / 暴露了**新的事实性问题**。本节解决 2 个 BLOCKER 和 1 个 MAJOR，使文档真正实现就绪。

### RR. [MAJOR] JJ CRUD 示例路径必须根级化（修正 normalization 折叠问题）

**问题**（验证审查发现）：JJ 用了深路径 `<ownerStatePath>.pagination.currentPage` 等，配合 `ignoreWritesTo: ["<ownerStatePath>.pagination"]`。但：

- `createRootDependencySet` 内部调 `normalizeRootPaths`，把深路径折叠到根（`pagination.currentPage` → `pagination`）
- 结果 `dependsOn` 等价于 `{<ownerStatePath>.pagination, ...}`，`ignoreWritesTo` 也是 `{<ownerStatePath>.pagination}`
- **用户翻页写 `pagination.currentPage` → 折叠到根 → 命中 ignoreWritesTo → 被过滤 → reactive refetch 失效**
- 同时违反 `dependency-tracking.md` §3.3："authors declare `user`, not `user.name`"

**修订**：JJ 节的 CRUD 示例**全部改为根级路径**。同时引入两种合法使用模式：

**模式 A（推荐，最简）**：外部 binding 走 reactive，内部状态走命令式

```json
"loadAction": {
  "action": "ajax",
  "args": { "url": "/api/depts/${routeParams.deptId}/users?page=${pagination.currentPage}" },
  "dependsOn": ["routeParams.deptId"],
  "ignoreWritesTo": []
}
```

CRUD 自己管内部状态变化触发的 refetch：

```ts
// 翻页 handler
const handlePageChange = (newPage) => {
  scope.update(paginationStatePath, { ...pagination, currentPage: newPage });
  loadReaction.dispatch(); // ← 命令式重跑
};

// query / sort / filter 同上
```

server-pagination 修正也走命令式（不需要 pause/resume，因为 reaction 没 watch `pagination`）：

```ts
async function applyServerPaginationCorrection(corrected) {
  scope.update(paginationStatePath, corrected);
  await loadReaction.dispatch();
}
```

`dependsOn` 只声明外部 binding，`ignoreWritesTo` 空。CRUD 完全控制内部状态触发的重跑时机。**这条路径没有自循环风险**。

**模式 B（alternative）**：内部状态也走 reactive

```json
"loadAction": {
  "action": "ajax",
  "args": { "url": "/api/depts/${routeParams.deptId}/users?page=${pagination.currentPage}" },
  "dependsOn": [
    "routeParams.deptId",
    "<ownerStatePath>.pagination",
    "<ownerStatePath>.query",
    "<ownerStatePath>.sort",
    "<ownerStatePath>.filters"
  ],
  "ignoreWritesTo": []
}
```

**不写** `ignoreWritesTo: ["<ownerStatePath>.pagination"]`（这会过滤用户翻页）。
server-pagination 修正通过 `pause()`/`dispatch()`/`resume()` 防自循环：

```ts
async function applyServerPaginationCorrection(corrected) {
  loadReaction.pause();
  scope.update(paginationStatePath, corrected);
  await loadReaction.dispatch();
  loadReaction.resume();
}
```

`pause()` 抑制 `pagination` 写触发的 reactive fire，`dispatch()` 命令式跑一次拿新 page 的数据。

**选择准则**：

- 模式 A：作者希望精确控制 refetch 时机，不想被无关 scope 写打扰
- 模式 B：作者希望"任何相关状态变化都自动重跑"，少写 handler

**强制约束**：

- `dependsOn` 和 `ignoreWritesTo` 必须**根级路径**（符合 §3.3）
- 编译期校验：路径含 `.`（除了 `<ownerStatePath>` 占位符展开后）→ emit error（违反 §3.3）
- `<ownerStatePath>` 在编译期是占位符，渲染器在运行时拼接根级路径

### SS. [BLOCKER A 解决] `CompiledReactionPlan` → `registerReaction` 的桥接

**问题**（实现审查 BLOCKER A）：`registerReaction`（`reaction-runtime.ts:84`）要求 `compiledReaction: CompiledReaction`，且 `compiled.watch` 在 line 105/113 直接访问。`CompiledReactionPlan` 没有 `watch` 字段，无法直接喂入。

**修订**：采用**合成静态 watch** 方案（验证审查推荐）。

`renderer-reaction-handle.ts` 内部：

```ts
import type {
  CompiledReaction,
  CompiledReactionPlan,
  CompiledRuntimeValue,
} from '@nop-chaos/flux-core';

// 合成的静态 watch：值为 true，永不变化
const SYNTHETIC_WATCH = Object.freeze({
  kind: 'static',
  isStatic: true,
  value: true,
}) as CompiledRuntimeValue<unknown>;

function planToCompiledReaction(plan: CompiledReactionPlan): CompiledReaction {
  return {
    id: '', // 由 registerReaction 内部分配
    watch: SYNTHETIC_WATCH,
    action: plan.action,
    dependsOn: plan.dependsOn,
    immediate: false, // 强制，按 FF
    // 注意：不带 when/debounce/once/control，这些是 `<reaction>` 的语义，
    // kind: 'reaction' 不支持
  };
}
```

`registerRendererReaction` 内部：

1. `planToCompiledReaction(plan)` → 合成 CompiledReaction
2. 调 `runtime.registerReaction({ id, compiledReaction, scope, helpers: { dispatch: wrapperDispatch } })`
3. wrapper 自己维护 `subscribe` 拦截器：在 `registerReaction` 内部 subscribe 之前，先调 `filterScopeChangeByIgnoredRoots(change, plan.ignoreWritesTo)`，命中则不传给 registerReaction 的内部逻辑
4. ready/pause 状态机也在 wrapper 本地

**为什么选合成 watch 而不是并行注册**：

- 合成 watch 让 wrapper 复用所有 `registerReaction` 的级联保护、debounce（虽然 kind:'reaction' 不暴露）、abort、debug snapshot 等
- 并行注册要复制大量基础设施，违背 LL 的"共享 cascade pool"约束
- 合成 watch 永不"变化"（值固定 true），所以 registerReaction 的 `evaluateWatchValue` 永远返回 true、`previousValue === nextValue` 永远成立 → registerReaction 的 watch-change-detection 永远不触发 fire。**实际触发完全由 wrapper 通过 `dependsOn` 命中后调 internal trigger 完成**。

### TT. [BLOCKER B 解决] `props.reactions` 的首次 render 可用性

**问题**（实现审查 BLOCKER B）：`props.reactions` 在 `node-renderer-resolved.tsx` 首次 render 时构造，但 CRUD 在 `useEffect` 里立即调 `loadReaction.dispatch()`。注册在 layout effect 里完成，时序需要明确。

**修订**：采用 **lazy proxy handle** 方案。

`props.reactions[key]` 在所有 render 都返回同一个**稳定 proxy handle**。proxy 内部维护 `realHandle: ReactionHandle | undefined` 和 `pendingCalls: Array<{ method, args }>`：

- 注册前（首 render 到 layout effect 完成）：proxy 把所有方法调用入队
- `useLayoutEffect` 注册真实 handle → 把 `realHandle` 赋值 → drain pendingCalls
- 此后所有调用直接转发给 `realHandle`

```ts
function createLazyReactionHandle(
  register: () => ReactionHandle,
  dispose: (h: ReactionHandle) => void,
): ReactionHandle {
  let realHandle: ReactionHandle | undefined;
  const pendingCalls: Array<
    ['dispatch' | 'force' | 'ready' | 'pause' | 'resume' | 'getDebugState', any[]]
  > = [];
  let disposed = false;

  const proxy =
    (method: keyof ReactionHandle) =>
    (...args: any[]) => {
      if (disposed) {
        return method === 'dispatch' || method === 'force'
          ? Promise.resolve({
              ok: false,
              cancelled: true,
              error: new Error('ReactionHandle disposed'),
            })
          : undefined;
      }
      if (realHandle) {
        return (realHandle[method] as Function)(...args);
      }
      // 入队，等注册完成后 drain
      if (method === 'ready' || method === 'pause' || method === 'resume') {
        pendingCalls.push([method, args]);
        return undefined;
      }
      if (method === 'dispatch' || method === 'force') {
        return new Promise((resolve) => {
          pendingCalls.push([method, [...args, resolve]]);
        });
      }
      // getDebugState
      return { phase: 'initial-paused', pendingChange: false, fireCount: 0, registrationId: '' };
    };

  // 由 node-renderer-resolved.tsx 的 useLayoutEffect 调用
  proxy.__activate = () => {
    if (disposed || realHandle) return;
    realHandle = register();
    for (const [method, args] of pendingCalls) {
      const resolve = args[args.length - 1];
      const callArgs = typeof resolve === 'function' ? args.slice(0, -1) : args;
      const result = (realHandle[method] as Function)(...callArgs);
      if (typeof resolve === 'function' && result && typeof (result as any).then === 'function') {
        (result as Promise<any>).then(resolve);
      }
    }
    pendingCalls.length = 0;
  };
  proxy.__dispose = () => {
    if (disposed) return;
    disposed = true;
    if (realHandle) dispose(realHandle);
    pendingCalls.length = 0;
  };

  return {
    dispatch: proxy('dispatch'),
    force: proxy('force'),
    ready: proxy('ready'),
    pause: proxy('pause'),
    resume: proxy('resume'),
    getDebugState: proxy('getDebugState'),
  } as ReactionHandle & { __activate(): void; __dispose(): void };
}
```

`node-renderer-resolved.tsx`：

```ts
// 在 useMemo 里为每个 reactionPlans[key] 创建 proxy
const reactions = useMemo(() => {
  return Object.fromEntries(
    Object.keys(reactionPlans).map(([key, _]) => [
      key,
      createLazyReactionHandle(/* register/displace thunks */),
    ]),
  );
}, [reactionPlans]);

useLayoutEffect(() => {
  Object.values(reactions).forEach((h) => (h as any).__activate());
  return () => {
    Object.values(reactions).forEach((h) => (h as any).__dispose());
  };
}, [reactions]);
```

CRUD 看到的是稳定 handle，方法可以立即调用；首次 dispatch 会等到注册完成后真跑。

### UU. 实现审查剩余 P2 项

整理实现审查的小问题，逐条裁定：

| 项目                                                           | 裁定                                                                                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ReactionHandle` 类型位置                                      | `flux-core/src/types/renderer-core.ts`（紧邻 `RendererEventHandler`）                                                                      |
| `props.reactions` 可选性                                       | `reactions: Readonly<Record<string, ReactionHandle>>`，默认 `{}`（不 optional，但默认空对象；非 reaction renderer 拿到空 record）          |
| `autoLoad` 在 CrudSchema 上                                    | **不复用 DynamicRendererSchema.autoLoad**。CRUD 默认 autoLoad=true，加 `autoLoad?: boolean` 到 CrudSchema（独立字段）                      |
| `CrudLoadActionResult.reload` 迁移                             | **保留 API**，内部调 `loadReaction.force()`。`crud-renderer.tsx:239` 的 `handleRefresh` 不需改                                             |
| `dispatch()` 在 `pause()` 期间                                 | **照常运行**（按 V 节"绕过门控"）                                                                                                          |
| `getDebugState().phase` 区分 initial-paused vs explicit-paused | 仅诊断用，外部消费者视为 'paused'；`phase` 类型可暴露更细但消费者用 `'ready'`、`'paused'`、`'disposed'` 三档即可                           |
| `dispatch()` 与级联深度                                        | **豁免**：dispatch() 不进级联计数（命令式 = 作者控制）。`force()` 进级联计数（reactive 通道）                                              |
| `getDebugSnapshot()` 整合                                      | wrapper 注册时给 id 加前缀 `renderer-reaction:` 以便 debug 工具区分；`ReactionDebugEntry` 加 `rendererOwned?: boolean` 字段                |
| `CompiledReactionPlan` 不带 `debounce`/`once`/`control`        | **v1 不支持**这些字段；kind: 'reaction' 只做最基本的 reactive + imperative。需要这些特性用 `<reaction>` 渲染器。文档 GG 节明确声明 v1 限制 |
| 校验诊断 code/message                                          | 见下方 VV 节                                                                                                                               |
| canonical cancelled result 形状                                | `{ ok: false, cancelled: true, error: new Error('ReactionHandle disposed') }`（与现有 action-execution 的 cancelled result 一致）          |

### VV. 校验诊断 codes 与 messages（补充）

```ts
// shape-validation-node-fields.ts
{
  code: 'invalid-reaction-deps' as SchemaDiagnosticCode,
  severity: 'error',
  message: `Field "${key}" uses kind:'reaction' but has missing or empty dependsOn. Declare at least one root-level scope path.`,
  path: `${path}.${key}.dependsOn`,
}

{
  code: 'invalid-reaction-deep-path' as SchemaDiagnosticCode,
  severity: 'error',
  message: `Field "${key}.dependsOn" entry "${entry}" contains a deep path. Use root-level paths only (e.g., "user", not "user.name").`,
  path: `${path}.${key}.dependsOn[${i}]`,
}

{
  code: 'invalid-reaction-immediate' as SchemaDiagnosticCode,
  severity: 'error',
  message: `Field "${key}" uses kind:'reaction' which forces immediate:false; remove "immediate: true" or use kind:'event'.`,
  path: `${path}.${key}.immediate`,
}

// 跨字段 ignoreWritesTo 重叠 — 运行时 warning（通过 reportRuntimeHostIssue）
{
  level: 'warning',
  phase: 'reaction',
  message: `Reaction "${key}" dependsOn paths overlap another reaction field's ignoreWritesTo on the same node; cross-field cascade may occur.`,
}
```

### WW. 修订后的落地分阶段（替换 NN）

**Phase 1：修当前 bug（独立，立刻做）**

- `crud-renderer.tsx:159`：`props.events['loadAction']` → `props.templateNode.eventPlans['loadAction']`
- `useCrudLoadAction`：入参类型 → `CompiledActionProgram | undefined`
- Form/Page：grep `loadAction` 找其他 consumer，同套修复
- 验证：`crud-loadaction.test.tsx` 全绿；Form/Page 同名测试转绿

**Phase 2：基础设施**

依赖顺序：

1. **flux-core**：
   - `SchemaFieldKind` += `'reaction'`
   - `ReactiveActionSchema extends ActionSchema`（必填 `dependsOn: string[]`、可选 `ignoreWritesTo?: string[]`）
   - `CompiledReactionPlan`（GG 节）
   - `TemplateNode.reactionPlans?: Readonly<Record<string, CompiledReactionPlan>>`
   - `ReactionHandle` 接口（UU 节，放 `renderer-core.ts`）
   - `RendererComponentProps` 加 `reactions: Readonly<Record<string, ReactionHandle>>`（默认 `{}`）

2. **flux-compiler**：
   - `node-compiler.ts` 加 `kind === 'reaction'` 分支（抽 `dependsOn` + `ignoreWritesTo`、编译 action、组装 `CompiledReactionPlan`）
   - `shape-validation-node-fields.ts` 加 VV 节列出的校验
   - 单测：每个诊断 code 一个 case

3. **flux-runtime**：
   - 新文件 `renderer-reaction-handle.ts`（SS 节合成 watch 桥接 + ready/pause/dispose 状态机）
   - `runtime.registerRendererReaction` API（HH + UU 节）
   - `runtime-factory.ts` 把 registerRendererReaction 接到 runtime
   - 单测：ready/pause/resume/dispose 状态机各路径；合成 watch 行为；ignoreWritesTo 过滤；与 `<reaction>` 共享 cascade pool

4. **flux-react**：
   - `node-renderer-resolved.tsx` 加 `reactions` channel（TT 节 lazy proxy 方案）
   - 单测：首 render 可用性、strict mode 双调用、unmount dispose

每个 step 独立单测。Critical path：步骤 2 和 3 — 这两步实现风险最高，前面几步是机械改动。

**Phase 3：CRUD 接入**

按 RR 节模式 A 执行（外部 binding 走 reactive、内部状态走命令式）：

- `CrudSchema.loadAction` 类型 → `ReactiveActionSchema`
- field rule 改 `kind: 'reaction'`
- `useCrudLoadAction` 重写为基于 `ReactionHandle`：所有内部状态变化显式调 `loadReaction.dispatch()`；外部 binding 变化由框架自动触发
- `requestKey` 拆分：内部状态触发精度由命令式 handler 接管（不再用 requestKey 序列化）；server-pagination 防循环由 `dispatch()` 命令式语义保证（reaction 没 watch `pagination`，所以不会自循环）
- `CrudLoadActionResult.reload` 保留，内部调 `force()`
- 验证：原 6 个测试转绿 + 新增 regression：
  - selection-only 变化不触发 refetch（reaction 没 watch selection）
  - server-pagination 修正不引发循环（reaction 没 watch pagination）
  - 外部 binding 变化触发 refetch（dependsOn 命中）
  - manual refresh abort 在 in-flight
  - 模式 A 下用户翻页触发 dispatch（不是 reactive）

**Phase 4：Form / Page loadAction**

按 Phase 1 修 bug 后视情况：

- 若仅 mount-时拉一次，用 `kind: 'event'` + 渲染器 effect（同 submitAction 模式）
- 若需要 reactive 重跑（外部 binding 变化），接入 `kind: 'reaction'`

**Phase 5（可选）**：`<reaction>` 渲染器底层统一。当前不做。

### XX. 共识总结（六轮迭代后）

| 维度                              | 状态                                                           |
| --------------------------------- | -------------------------------------------------------------- |
| Phase 1 bug 修复                  | ✓ 实现就绪（10 行）                                            |
| 三 kind 分类法                    | ✓ 概念清晰                                                     |
| Package 边界                      | ✓ 清晰                                                         |
| Channel 配对                      | ✓ 与 events/regions 一致                                       |
| `CompiledReactionPlan` 类型与桥接 | ✓ SS 节定案（合成 watch）                                      |
| `props.reactions` 首次可用性      | ✓ TT 节定案（lazy proxy）                                      |
| CRUD 接入示例                     | ✓ RR 节定案（根级路径 + 模式 A/B）                             |
| `ReactionHandle` 完整契约         | ✓ UU + VV 节定案                                               |
| 校验诊断 codes                    | ✓ VV 节定案                                                    |
| 自写过滤                          | ✓ DD + RR 节定案（root-level `ignoreWritesTo` + pause/resume） |
| Disposal 契约                     | ✓ EE 节定案                                                    |
| StrictMode 行为                   | ✓ LL + TT 节定案                                               |
| 级联深度共享                      | ✓ LL + UU 节定案                                               |
| 文档影响清单                      | ✓ PP 节列明                                                    |

**最终落地依据顺序**：XX > WW > RR/SS/TT/UU/VV > BB–LL > Q–AA > A–P（归档）。

文档进入**实现就绪**状态。

---

## 第七轮修订（基于第三轮共识验证，YY–aaa）

第三轮独立验证（最终共识检查）发现 Round 6 残留 3 个具体问题。本节逐一解决。这些问题是**代码层面的实现细节**，不影响整体架构；修复后达成实现就绪共识。

### YY. [P0] SS 修订：`registerReaction` 返回类型扩展 `force(paths?)`

**问题**：SS 用合成静态 watch 让 `runReaction` 的 `changed = false`（`reaction-runtime.ts:204`），但 `registerReaction` 只返回 `{ id, dispose }`（`reaction-runtime.ts:461-464`），wrapper 没办法实际触发 fire。SS 文字说"wrapper 通过 dependsOn 命中后调 internal trigger"但没定义 internal trigger 是什么。

**修订**：扩展 `registerReaction` 返回类型（小 API 变更）：

```ts
// flux-core/src/types 反映新返回形状
interface ReactionRegistration {
  id: string;
  dispose(): void;
  /**
   * 强制触发一次 reactive fire。
   * - paths?: 显式 changed-paths，缺省用 registration 的 dependency roots
   * - 走 runReaction(paths, force=true) 完整路径
   * - 更新 previousValue/fireCount，计入级联深度
   * 用于 kind:'reaction' wrapper 在 scope 变化命中后调起 fire
   */
  force(paths?: readonly string[]): void;
}
```

实现层（`reaction-runtime.ts`）：`force` 是对内部 `runReaction(paths, true)` 的闭包暴露。这影响 `<reaction>` 渲染器等现有 caller 的返回类型，但它们只用到 `id`/`dispose` —— 新加 `force` 方法对它们透明。

`renderer-reaction-handle.ts` 的订阅流：

```ts
// wrapper 自己订阅 scope 变化（不依赖 registerReaction 的内部 subscribe）
scope.store.subscribe((change) => {
  // 1. ignoreWritesTo 过滤
  if (filterScopeChangeByIgnoredRoots(change, plan.ignoreWritesTo)) return;
  // 2. dependsOn 命中检查
  if (!scopeChangeHitsDependencies(change, explicitDependencies)) return;
  // 3. paused/ready 门控
  if (phase === 'initial-paused') {
    pendingChange = true;
    pendingChangedPaths = change.paths;
    return;
  }
  if (phase === 'explicit-paused') {
    pendingChange = true; // pause 期间累积，resume 时 flush（按 LL "pause 期间累积"）
    pendingChangedPaths = change.paths;
    return;
  }
  // 4. ready 态：调起 fire
  registration.force(change.paths);
});
```

合成 watch 让 `registerReaction` 自己的内部 subscribe 永远不触发 fire（changed=false），所以**只走 wrapper 的订阅路径**。`registration.force()` 是唯一触发点，它内部走 `runReaction(paths, true)` 完整 reactive 通道（更新 previousValue、计 fireCount、级联计数）。

**为什么不复制基础设施**：选项 (b) "wrapper 独立实现 subscribe+schedule+run"违背 LL "共享 cascade pool"。选项 (a) 即本方案，让 wrapper 复用 registerReaction 的全部内部机制，只换触发入口。

### ZZ. [P0] TT 修订：lazy proxy 修两个 bug

**Bug 1：dispose 时 pending Promise 泄漏**

修订 `__dispose`：在 `pendingCalls.length = 0` 之前，对所有 dispatch/force 调用的 resolve 调 canonical cancelled result：

```ts
proxy.__dispose = () => {
  if (disposed) return;
  disposed = true;
  if (realHandle) dispose(realHandle);
  // 解析所有 pending 的 Promise，避免泄漏
  for (const [method, args] of pendingCalls) {
    if (method === 'dispatch' || method === 'force') {
      const resolve = args[args.length - 1];
      if (typeof resolve === 'function') {
        resolve({ ok: false, cancelled: true, error: new Error('ReactionHandle disposed') });
      }
    }
  }
  pendingCalls.length = 0;
};
```

**Bug 2：StrictMode 重激活死锁**

修订 `__activate`：支持重激活。每次 activate 时 reset disposed 标志 + 创建新 realHandle：

```ts
proxy.__activate = () => {
  if (disposed) {
    // StrictMode 重激活：reset 状态
    disposed = false;
    realHandle = undefined;
  }
  if (realHandle) return; // 已激活，幂等
  realHandle = register();
  // drain pendingCalls（含上一轮 dispose 前累积的）
  for (const [method, args] of pendingCalls) {
    // ...（同前）
  }
  pendingCalls.length = 0;
};
```

或者更简洁：在 `useMemo` key 上加 mount cycle token（如 `useId()`），每次 mount 拿新 proxy。但 `useMemo([reactionPlans, useId()])` 会让 proxy 在 StrictMode 双 mount 时换新对象，违背"稳定 handle 身份"（LL）。**所以用 reset 方案**。

**StrictMode 时序验证**：

1. First mount → `useMemo` 创建 proxy → `useLayoutEffect` 调 `__activate`（realHandle 创建、drain）
2. StrictMode unmount → `useLayoutEffect` cleanup 调 `__dispose`（realHandle dispose、disposed=true）
3. StrictMode remount → `useMemo` 复用同一 proxy（依赖未变） → `useLayoutEffect` 再调 `__activate`（reset disposed=false、新 realHandle、drain）
4. 正常运行

注意步骤 2 中如果有 pending Promise，会按 Bug 1 修订被 resolve 为 cancelled —— 但 StrictMode 立即 remount，wrapper 在 remount 后会重新 dispatch（CRUD 的 useEffect 会再跑一次）。所以 cancelled Promise 被忽略是正确行为。

### aaa. [P0] RR ↔ VV 矛盾：放宽深路径校验为 warning

**问题**：RR Pattern A 用 `dependsOn: ["routeParams.deptId"]`，含 `.`；VV 的 `invalid-reaction-deep-path` validator 是 error。两者矛盾。

**事实**：`normalizeRootPaths`（`scope-change.ts`）把深路径折叠到根，所以运行时 `routeParams.deptId` 等价于 `routeParams`。深路径在功能上**无害**，只是被规范化。

**修订**：把 VV 的 `invalid-reaction-deep-path` 从 **error 改为 warning**：

```ts
{
  code: 'invalid-reaction-deep-path' as SchemaDiagnosticCode,
  severity: 'warning',  // ← 改为 warning，不是 error
  message: `Field "${key}.dependsOn" entry "${entry}" contains a deep path. Runtime normalizes it to root "${root}". Consider declaring the root directly.`,
  path: `${path}.${key}.dependsOn[${i}]`,
}
```

理由：

- 运行时正常工作（折叠后等价）
- warning 提示作者"你写的精度被吃掉了，根路径就够"
- 不阻塞编译，RR Pattern A 和 Pattern B 都合法

### bbb. 最终共识（七轮迭代后）

| 维度                                    | 状态                                                          |
| --------------------------------------- | ------------------------------------------------------------- |
| Phase 1 bug 修复                        | ✓ 实现就绪（10 行）                                           |
| 三 kind 分类法                          | ✓ 概念清晰                                                    |
| Package 边界                            | ✓ 清晰                                                        |
| Channel 配对                            | ✓ 与 events/regions 一致                                      |
| `CompiledReactionPlan` 类型与桥接       | ✓ SS + YY 定案（合成 watch + registerReaction.force）         |
| `props.reactions` 首次可用性 + 严格模式 | ✓ TT + ZZ 定案（lazy proxy + dispose resolve + reset 重激活） |
| CRUD 接入示例                           | ✓ RR + aaa 定案（根级路径 + 深路径 warning）                  |
| `ReactionHandle` 完整契约               | ✓ UU + VV 定案                                                |
| 校验诊断 codes                          | ✓ VV + aaa 定案（深路径降级为 warning）                       |
| 自写过滤                                | ✓ DD + RR 定案                                                |
| Disposal 契约                           | ✓ EE + ZZ 定案                                                |
| StrictMode 行为                         | ✓ LL + ZZ 定案                                                |
| 级联深度共享                            | ✓ LL + UU + YY 定案                                           |
| 反应触发机制                            | ✓ YY 定案（registerReaction.force）                           |
| 文档影响清单                            | ✓ PP 节列明                                                   |

**最终落地依据顺序**：bbb > YY/ZZ/aaa > XX > WW > RR/SS/TT/UU/VV > BB–LL > Q–AA > A–P（均归档）。

**第三轮独立验证结论**（原话）："The overall `kind: 'reaction'` design, package boundaries, `CompiledReactionPlan` type, lazy-handle concept, and phasing are sound."

**实现就绪**。下一步：按 WW 节 Phase 1 启动 bug 修复（10 行改动 + 测试转绿），独立于 Phase 2-4 可立刻做。
