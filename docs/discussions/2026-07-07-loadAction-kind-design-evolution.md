# loadAction kind 设计 —— 思路演进（前四轮，归档）

> **本文档为归档文件**，记录 `2026-07-07-loadAction-kind-design.md` 在达成最终方案前的四轮思路演进（A–P 节）。
>
> **落地依据以主文档为准**：`2026-07-07-loadAction-kind-design.md` 的"最终方案（Q–AA）"+"第五轮修订（BB–LL）"。
>
> 本文档保留用于审计：可以看到设计是如何从"让 event 自动 reactive"逐步演变为"引入 `kind: 'reaction'` + `ReactionHandle` + ready/pause 门控"的，以及过程中识别并否决了哪些替代方案。
>
> 与主文档冲突时，**主文档胜出**。

---

## 综合评审意见（2026-07-07，源码核对后补充）

阅读相关源码（`node-runtime.ts`、`node-compiler.ts`、`action-compiler.ts`、`action-execution.ts`、`program-utils.ts`、`action-core.ts`、`reaction-compiler.ts`、`reaction-runtime.ts`、`node-renderer-resolved.tsx`、`crud-renderer.tsx`、`crud-renderer-state.ts`、`dynamic-renderer.tsx`）+ 实跑 `crud-loadaction.test.tsx` / `form-loadaction.test.tsx` 之后，结论与上文存在若干重要偏差。

### A. 当前 "pragmatic fix" 实际是**坏的**（不只是有缺陷）

1. **类型契约破裂**：`crud-renderer.tsx:159` 从 `props.events['loadAction']` 取到的是 `RendererEventHandler`（一个函数，由 `node-renderer-resolved.tsx:237-265` 包装而来），不是 `ActionSchema`、也不是 `CompiledActionProgram`。它被传给 `useCrudLoadAction({ loadAction })`（`crud-renderer-state.ts:469` 把参数类型谎报为 `ActionSchema | undefined`），最终在 `crud-renderer-state.ts:569` 调 `helpers.dispatch(loadAction, ...)`。
2. **`helpers.dispatch` 不接受函数**：`renderer-core.ts:81-84` 与 `action-execution.ts:506-510` 只接受 `ActionSchema | ActionSchema[] | CompiledActionProgram`。函数会落到 `normalizeCompiledActionProgram` → `actionProgramCompiler.compile(fn, ...)`，对一个函数做 schema 编译必然失败/返回空。
3. **`pnpm --filter @nop-chaos/flux-renderers-data test -- --run crud-loadaction.test.tsx` 的 6 个 case 全部失败**（"expected [] to have a length of 1"、"Unable to find Item 1" 等）；`form-loadaction.test.tsx` 也 3 个失败。`tsc` 在 `crud-renderer.tsx:173` 明确报 `Type 'RendererEventHandler | undefined' is not assignable to type 'ActionSchema | undefined'`。
4. **Form/Page 根本没有声明 `loadAction` 字段**：`form-definition.ts:356-381` 的 `fields` 没有 `loadAction`；`page.tsx` 同样缺失。即讨论文档"现状"表中暗示 Form 也走 `kind: 'event'` 是不准确的——schema compiler 对未声明字段会按默认 prop 处理或忽略，导致 form-loadaction 测试全部 dispatch 0 次。

讨论文档把 CRUD 现状写成 "可工作但缺反应性"，与实际不符。任何后续设计讨论必须以"现状是坏的"为起点。

### B. 讨论文档的核心前提"event = 静态 CompiledActionProgram"是**错的**

`compileActions`（`action-compiler.ts:184-199`）返回的 `CompiledActionProgram` **不是**静态字符串集合；它的每个节点 `payload.args` / `when` / `preventDefault` / `stopPropagation` 都是 `CompiledRuntimeValue`，由 `evaluateActionArgs`（`action-core.ts:323-337`）在 **dispatch 时**针对当时 scope 求值。所以 `kind: 'event'` 的 action **已经天然支持延迟求值**——只要在 pagination 写入 scope 之后才触发 dispatch，`${pagination.currentPage}` 就能拿到正确值。

CRUD 的真正问题不是"action 失去反应性"，而是：(1) 上面 A 的类型断裂让 dispatch 根本没跑；(2) 即使跑通，CRUD 仍要自己决定"什么时候再 dispatch 一次"，而这恰恰是 CRUD 用 `requestKey = serializeCrudRequest({pagination, query, sort, filters})` 已经在做的事。

### C. 把 event 改成 reactive 是**重复造轮子**

框架里已经有完整的 reactive action 通道：

| 已有机制                   | 位置                                                    | 提供                                              |
| -------------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `<reaction>` 渲染器        | `reaction.tsx`, `basic-renderer-definitions.ts:373-389` | schema 级声明                                     |
| `compileReaction`          | `reaction-compiler.ts`                                  | 编译 `watch`/`when`/`debounce`/`once`/`dependsOn` |
| `runtime.registerReaction` | `reaction-runtime.ts`                                   | scope 变更订阅、级联深度保护、防抖、去重、dispose |
| `CompiledReaction`         | `flux-core` 类型                                        | 与 `CompiledActionProgram` 平级的一等公民         |

把 `kind: 'event'` 改造成 "可自动 re-trigger" 会把第二套 reaction 机制塞进 event 通道，造成：

- 两套并行的 reactive-action 实现（`<reaction>` 和 reactive event），作者要猜该用哪个
- event 通道失去"只在被调用时执行一次"的命令式语义
- 现有 `<reaction>` 的 cascade/once/debounce/dispose 复杂度被悄悄搬到 event 里

### D. 真正的架构坐标：**两根正交轴**

讨论文档混淆了两件事：

| 轴                        | 选项 A                   | 选项 B                     |
| ------------------------- | ------------------------ | -------------------------- |
| **求值时机**（数据 → 值） | eager（每次渲染都算）    | lazy（用到才算）           |
| **触发时机**（值 → 执行） | reactive（scope 变就跑） | imperative（外部显式调用） |

现有三 kind 对应：

- `prop`：eager × reactive — 渲染期同步求值；scope 变化自动 re-eval
- `event`：lazy × imperative — 只在被回调时算一次；不自动
- `reaction`（已有渲染器）：lazy × reactive — scope 变化时按 watch 订阅自动 dispatch

讨论文档想发明的"reactive event" = lazy × reactive，**就是 reaction**。不要新造。

### E. 推荐的最佳设计

#### E1. 维持三种已存在的 kind，**不要**让 event 变 reactive

- `prop`：eager+reactive，用于渲染期同步可读的值；约束 = 必须能在首次渲染时的 scope 求值成功
- `event`：lazy+imperative，用于 onClick/onSubmit/onMount 等；约束 = 渲染器必须显式调用回调
- 反应式自动重跑的需求统一走 `<reaction>` 或 `kind: 'reaction'`（见 E3）

#### E2. 立刻修复 CRUD（无需新设计）

最小修复（不改架构，只解 bug）：

1. `crud-renderer.tsx` 不再读 `props.events['loadAction']`，改读 `props.templateNode.eventPlans['loadAction']`（拿到真正的 `CompiledActionProgram`）。
2. `useCrudLoadAction` 把 `loadAction` 的入参类型改成 `CompiledActionProgram | undefined`。
3. `helpers.dispatch(program, { scope, signal, evaluationBindings })` —— `CompiledActionProgram` 是合法 dispatch 入参，`payload.args` 会在 dispatch 时针对 `evaluationBindings`-合并后的 scope 延迟求值；pagination 通过 `evaluationBindings` 传入（已有逻辑），URL 模板里有没有 `${pagination.currentPage}` 都能工作。
4. `useCrudLoadAction` 现有的 `requestKey = serializeCrudRequest({pagination, query, sort, filters})` 机制保留——这是 CRUD **自己**决定"什么算重 fetch 触发条件"，比通用的 scope-watching 更精确（避免列宽变化、selection 变化等无关 scope 写触发 fetch）。`reloadNonce` 提供 imperative 主动刷新入口。

跑通后，CRUD loadAction 就恢复了文档里描述的能力，**且确实没有框架级 reactive**——但 CRUD 本就不需要框架级 reactive。

#### E3. （可选）新增 `kind: 'reaction'` 作为渲染器级语法糖

如果未来多个组件需要"自身作用域内的某条 binding 变 → 重跑某 action"，再加一个 `kind: 'reaction'`：

- 编译期：复用 `compileReaction`，需要 schema 提供 `watch` / `when` / `debounce` / `once`
- 运行期：节点挂载时 `runtime.registerReaction(...)`，卸载时 dispose
- 通道：放到 `props.reactions[key]`（新 channel）或挂在 `templateNode.reactionPlans`，**不要塞进 `events`**

这一步可以推迟到出现第二个真实用例再做。当前没有用例。

#### E4. 编译期校验的取舍

- `kind: 'prop'` + 字段值是结构化 `ActionSchema`：emit **warning**（建议改 `kind: 'event'` 或 `'reaction'`），不阻塞编译。这是真正的"lying contract"信号。
- `kind: 'event'`：保持现有 `validateActionShape` 校验（`shape-validation-rules.ts`）。
- `kind: 'prop'` 上带 `${...}` 模板：**不要**在编译期对模板做"必须现在能求值"的断言——这是原始 bug 的根源。eager 求值失败应作为 runtime warning（已实现）。
- 不要给 event 加"编译期 watch 表达式收集"。watch 是 reaction 的概念。

#### E5. 关于"可选的 watch 控制"和"明确的 reactive 指示"

- **watch**：不要加到 event。要 watch 就用 `<reaction>` 或 `kind: 'reaction'`，那里已经有 `watch`/`when`/`debounce`/`once`/`dependsOn`。
- **reactive 指示**：如果作者要明确表达"这个 action 是 reactive 的"，正确出口是 schema 层选择 `<reaction>` 而不是给每个 action 字段贴 `reactive: true`。给 event 加 boolean flag 会让单个字段同时承担 eager/lazy 与 reactive/imperative 两根轴，可读性下降。

### F. 一句话结论

讨论文档提出的"让 event 自动 reactive"在解决一个**根本不存在的问题**（event 的 args 已经是 lazy 的），同时**忽略了真正的问题**（CRUD 当前实现是坏的，类型契约破裂，测试全红）。

正确顺序：

1. 先按 E2 把 CRUD loadAction 修好（约 10 行改动 + 修测试）。
2. 把 dynamic-renderer `loadAction` 的 `kind: 'prop'` 选择写进架构文档（解释为什么 eager 在那个场景安全：URL 依赖的全是 parent scope 数据）。
3. Form/Page 如果真要 mount 时拉数据，要么走 `kind: 'prop'`+effect（同 dynamic-renderer），要么走 `<reaction>` + `immediate: true`，不要再发明第四种。
4. 把 `kind: 'reaction'` 列为"出现第二个真实用例再实现"的延期项，不进当前 plan。

不要做"把 event 改成 CompiledRuntimeValue"这种编译器大改，它会破坏现有 event 的命令式语义，且收益为零。

---

## 第二轮修正（同日，针对"event 控制执行时机 + reaction 保持响应性"的再思考）

第一轮我倾向于"不动 event、不动 reaction、CRUD 现有 requestKey 足够"。这条结论**部分错**。复核后承认盲点：

### G. CRUD loadAction 的响应性缺口是**真实的**

`useCrudLoadAction` 用 `serializeCrudRequest({pagination, query, sort, filters})` 当 `requestKey`，**写死**了 4 类内部状态作为唯一重跑触发器。但 `loadAction.args` 模板可以引用**任何 scope 路径**。

具体失败场景：

```json
{
  "type": "crud",
  "loadAction": {
    "action": "ajax",
    "args": { "url": "/api/depts/${routeParams.deptId}/users?page=${pagination.currentPage}" }
  }
}
```

`routeParams.deptId` 在上游变化 → URL 实际变了 → 但 CRUD 的 `requestKey` 不变 → **loadAction 不重跑，用户看到旧部门数据**。

我把 `requestKey` 当成"精确触发器"是错的——它对 CRUD **内部**状态精确，对 action 模板**真实依赖的 scope 路径**完全不感知。

### H. CRUD loadAction 是**双重需求**字段，不能强归一类

| 需求                                                                                | 哪个原语负责           | requestKey 是否覆盖 |
| ----------------------------------------------------------------------------------- | ---------------------- | ------------------- |
| 命令式触发（mount、refresh、server pagination 修正）                                | event                  | ✓                   |
| 内部状态变化（pagination/query/sort/filters）                                       | renderer 自管          | ✓（requestKey）     |
| **外部 binding 变化**（URL 模板里的 `${routeParams.deptId}`、`${globalFilter}` 等） | reaction（subscribe）  | **✗**               |
| 渲染器拥有 evaluationBindings + AbortController + result                            | renderer-owned wrapper | ✓（手写）           |

也就是说，CRUD loadAction 想要的语义是"**(lazy × imperative) AND (lazy × reactive) WITH renderer-owned dispatch**"。这不是"event 变 reactive"那么简单，是**两种原语的组合**。

### I. 正确解法：**组合 event + registerReaction**，不要"reactive event"

现有 `runtime.registerReaction`（`runtime-factory.ts:471-497`）已经接受**自定义 dispatch**（line 475-481）。这恰好就是 CRUD 需要的"reaction 触发 + 渲染器拥有 dispatch"。

CRUD 内部组合方式：

```ts
// 1. 命令式触发：mount 首次、refresh 按钮、server pagination 修正
//    走 kind:'event' 的 CompiledActionProgram
const loadActionPlan = templateNode.eventPlans['loadAction'];
helpers.dispatch(loadActionPlan, { scope, evaluationBindings, signal });

// 2. 反应式订阅：外部 binding 变化
useEffect(() => {
  if (!compiledWatch) return;
  const reg = runtime.registerReaction({
    id: `${props.id}-load-watch`,
    compiledReaction: { watch: compiledWatch, action: loadActionPlan, immediate: false },
    scope,
    dispatch: (action, ctx) =>
      crudOwnedDispatch(action, {
        ...ctx,
        evaluationBindings: {
          ...ctx.evaluationBindings,
          pagination,
          query,
          sort,
          filters,
          selection,
        },
        signal: crudPerFireAbort.signal,
      }),
  });
  return () => reg.dispose();
}, [compiledWatch, loadActionPlan, scope]);
```

`crudOwnedDispatch` 同时负责 `setRows`/`setTotal`/server-pagination 修正，命令式和反应式路径共用同一份处理逻辑。

### J. `watch` 路径怎么确定？

| 方案                                                                      | 取舍                                                           |
| ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **A. 显式声明**：schema 加 `loadActionWatch: ["${routeParams.deptId}"]`   | 显式、可调试、和 `<reaction>` 一致；作者要记得声明外部依赖     |
| B. 框架从 `args` 自动收集（`collectRuntimeDependencies` on payload.args） | 零声明；但需先 eval 一次才知道；条件模板易误判；可能 over-fire |
| C. 默认显式 + opt-in auto                                                 | 灵活；两套并存                                                 |

**推荐 A**：CRUD 这种数据获取最怕触发风暴，显式 watch 让作者明确承担"声明外部依赖"的责任。和 `<reaction>` 的 `watch` 心智一致。

### K. 修正后的最终结论（替换第一轮 F）

1. **不要让 `kind: 'event'` 自动 reactive**（仍坚持）—— 破坏命令式语义、复制 reaction 基础设施。
2. **不要相信 "requestKey 已经覆盖"**（修正第一轮盲点）—— 它对内部状态覆盖，对外部 binding 不覆盖。
3. **正确解法是组合**：`kind: 'event'` 提供命令式 + 渲染器在内部 `runtime.registerReaction` 提供反应式，dispatch wrapper 由渲染器拥有。
4. **不需要新 `kind: 'reaction'`**（仍坚持）—— CRUD 这种"渲染器内部组装 reaction"的需求，用现有 `registerReaction` API 已经够。`kind: 'reaction'` 推迟到出现"作者直接在 schema 里写 reaction 字段、不经渲染器中转"的第二个用例。

### L. 落地分阶段

**Phase 1（解当前 bug，约 10 行）**

- `crud-renderer.tsx:159`：`props.events['loadAction']` → `props.templateNode.eventPlans['loadAction']`
- `useCrudLoadAction`：入参类型 `ActionSchema | undefined` → `CompiledActionProgram | undefined`
- 验证：`crud-loadaction.test.tsx` 全绿

**Phase 2（补响应性缺口）**

- CRUD schema 加 `loadActionWatch?: string[]`
- `useCrudLoadAction` 内 `useEffect` 调 `runtime.registerReaction` 注册一条 renderer-owned reaction
- reaction 触发 → `crudOwnedDispatch` wrapper（注入 evaluationBindings + abort + result handling）
- 命令式路径（mount/refresh）和反应式路径共用同一 wrapper
- 验证：新增 e2e，URL 引用外部 binding，外部 binding 变化时 CRUD 重 fetch

**Phase 3（推迟）**

- 抽象为 `kind: 'reaction'` 字段规则，仅在第二个真实用例（非 CRUD）出现时再做

### M. 同步更正第一轮 E2 的措辞

第一轮 E2 说"CRUD 现有的 `requestKey` 机制保留——这是 CRUD 自己决定什么算重 fetch 触发条件，比通用的 scope-watching 更精确"。这句话只对内部状态成立；对外部 binding 它就是漏的。Phase 2 的 `loadActionWatch` + `registerReaction` 正是补这个漏。

---

## 第三轮修订（同日，针对 watch 字段形态的简化）

第二轮提出的 `loadActionWatch: ["${routeParams.deptId}"]` 有两个问题（评审反馈指出）：

1. **`${}` 包围多余**：scope 路径不是表达式，加 `${}` 既要先 eval 模板拿到路径再订阅，多一层无意义求值；和框架已有的 `ReactionSchema.dependsOn` / `BaseDataSourceSchema.dependsOn`（都是裸路径字符串数组）约定不一致。
2. **sibling field 形态**：`loadAction` + `loadActionWatch` 分开写，破坏"loadAction 配置自包含"的心智模型。

### N. 最终形态：`watchOn: string[]`，放在 loadAction 内部

```json
"loadAction": {
  "action": "ajax",
  "args": { "url": "/api/depts/${routeParams.deptId}/users?page=${pagination.currentPage}" },
  "watchOn": ["routeParams.deptId"]
}
```

#### 为什么选 `watchOn` 这个名字（不复用 `dependsOn`，不重载 `watch`）

| 候选                  | 评价                                                                                                                                                                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dependsOn`（复用）   | 语义和实现都对得上（都走 `createRootDependencySet` + `scopeChangeHitsDependencies`），但 `dependsOn` 已经在 `<reaction>` 和 `<data-source>` 上有两处使用；再压到 ActionSchema 上会让所有 action 字段（onClick/onSubmit/...）看似都可声明反应性，破坏 ActionSchema 的纯执行参数契约。**不选**。 |
| `watch`（重载为数组） | `ReactionSchema.watch` 是 `SchemaValue`（单表达式，值比较）。把它重载成路径数组会让作者搞不清"该写 `${...}` 还是裸路径"，类型上也冲突。**不选**。                                                                                                                                              |
| `watchOn`（新名）     | 明确的"wrapper modifier"语义：不参与 action 执行（ajax 本身不读它），是渲染器层"我要订阅这些路径并重跑此 action"的声明。和 `action`/`args`/`when`/`then` 这些执行参数视觉上分开。和 `dependsOn`（路径订阅）/`watch`（值比较）的现有二分保持距离。**选这个**。                                  |

#### 为什么不要 `${}`

scope 路径就是 scope 路径，不是表达式：

- `watchOn: ["routeParams.deptId"]` —— 框架直接调 `createRootDependencySet(["routeParams.deptId"])`，进 `scopeChangeHitsDependencies` 做命中判断
- `watchOn: ["${routeParams.deptId}"]` —— 要先 eval 模板拿到字符串"routeParams.deptId"，再订阅，多一层求值，作者还容易写错（`${a.b}` vs `a.b`）

这和现有 `ReactionSchema.dependsOn` / `BaseDataSourceSchema.dependsOn` 的"裸路径字符串数组"约定一致。

#### 扩展性

如果以后需要值比较的反应性（"`${user.profile}` 整体替换才算变化"），可以加 `watch: string`（单表达式，复用 `ReactionSchema.watch` 的语义），和 `watchOn: string[]`（多路径）成对出现：

```json
"loadAction": {
  "action": "ajax",
  "args": { "url": "..." },
  "watchOn": ["routeParams.deptId"],          // path-based, fires on write
  "watch": "${user.profile}"                   // value-based, fires on deep-eq change
}
```

两个都可选，互不依赖。当前先实现 `watchOn`（CRUD 用例只需要它）。

### O. Phase 2 实现细节修订

**编译期**：

- `loadAction` 的 `kind: 'event'` 不变，编译为 `CompiledActionProgram` 放进 `eventPlans`（保持现状）
- 渲染器 definition 通过新的 `compile` hook 或 `deepField` 把 `watchOn` 字符串数组**原样存下**（不编译为表达式），挂在 `templateNode.eventPlans` 旁边的 `reactionWatchPlans: Record<string, readonly string[]>` 或类似结构
- compile-time 校验：`watchOn` 必须是字符串数组，每项是合法 scope 路径（不含 `${}`），违者 emit warning

**运行期（CRUD 内部）**：

```ts
const loadActionPlan = templateNode.eventPlans['loadAction'];
const watchPaths = templateNode.reactionWatchPlans?.['loadAction'];

useEffect(() => {
  if (!watchPaths?.length) return;
  const reg = runtime.registerReaction({
    id: `${props.id}-load-watch`,
    compiledReaction: {
      watch: compileEmptyValue(), // reaction 系统要求 watch 字段；用静态空占位
      dependsOn: watchPaths, // ← 直接走 dependsOn 路径订阅，复用现有机制
      action: loadActionPlan,
      immediate: false,
    },
    scope,
    dispatch: crudOwnedDispatch, // 注入 evaluationBindings + abort + result handling
  });
  return () => reg.dispose();
}, [watchPaths, loadActionPlan, scope]);
```

CRUD 内部状态（pagination/query/sort/filters）**仍走现有 `requestKey`** —— 那是 CRUD 自己精确控制的触发集（避免列宽变化、selection 变化等无关 scope 写触发 fetch）。`watchOn` 只负责补充"URL 里引用的外部 binding"这一类。两条订阅通道并存，不冲突。

### P. 修订后的落地分阶段（替换第二轮 L）

**Phase 1（解当前 bug，约 10 行）**

- `crud-renderer.tsx:159`：`props.events['loadAction']` → `props.templateNode.eventPlans['loadAction']`
- `useCrudLoadAction`：入参类型 `ActionSchema | undefined` → `CompiledActionProgram | undefined`
- 验证：`crud-loadaction.test.tsx` 全绿

**Phase 2（补响应性缺口，最小侵入）**

- CRUD schema 类型加 `loadAction?: ActionSchema & { watchOn?: string[] }`（或单独声明 `ReactiveActionSchema`）
- 渲染器 definition 编译期把 `watchOn` 原样存进 `templateNode.reactionWatchPlans['loadAction']`
- `useCrudLoadAction` 内 `useEffect` 调 `runtime.registerReaction`，`dependsOn` 直接传 `watchOn`，`dispatch` 用 `crudOwnedDispatch` wrapper
- 命令式路径（mount/refresh）和反应式路径共用同一 wrapper
- 验证：新增 e2e，URL 引用外部 binding（`${routeParams.deptId}`），上游 binding 变化时 CRUD 自动重 fetch

**Phase 3（抽象，仅当第二个非 CRUD 用例出现）**

- 抽出 `kind: 'reaction'` 字段规则，统一编译期路径
- 通用 `ReactiveActionSchema`（带 `watchOn` / `watch`）类型
- 当前不做

---

## 最终方案初稿（Q–AA 节，已被 BB–LL 和 RR–XX 修订）

> 以下为最初定型的"最终方案"，记录归档。**实际落地以 BB–LL 和 RR–XX 的修订为准**。本节中的 S/T/U/W/X/Z 子节在 BB–LL 中被显式修订（S 撤回空数组语义、T 撤回静态分析、U 加 disposal 契约、W 加独立 wrapper、X 加 disposal 路径、Z 拆分职责），RR–XX 进一步修订（RR 修路径根级化、SS 修桥接、TT 修首次可用性、UU 补 P2 杂项、VV 补诊断 codes、WW 替换落地阶段）。本节仅供审计思路演进。

经过四轮迭代，方案定型如下。前四轮（A–P）已归档到 `2026-07-07-loadAction-kind-design-evolution.md`；本文节是落地依据。**注意**：本节的 S/T/U/W/X/Z 等子节在第五轮独立审查后被 BB–LL 修订，**冲突时以 BB–LL 为准**。

### Q. 一句话总结

引入第三种 field kind —— `reaction`。它专为"既要 reactive 又要 imperative 又要 renderer 控制时序"的字段设计（典型：CRUD `loadAction`）。`kind: 'event'` 保持纯命令式不动；`kind: 'prop'` 保持纯 eager 不动。

### R. 类型层

```ts
// flux-core：通用类型，所有渲染器可复用
export interface ReactiveActionSchema extends ActionSchema {
  dependsOn?: readonly string[];
}
```

`ActionSchema` 全局类型**不动**。`dependsOn` 通过 TS narrowing 只在显式声明为 `ReactiveActionSchema` 的字段上接受，onClick/onSubmit/quickSaveAction 等仍写不进去。

渲染器局部 schema 按需采用：

```ts
export interface CrudSchema extends BaseSchema {
  loadAction?: ReactiveActionSchema; // ← 接受 dependsOn
  quickSaveAction?: ActionSchema; // ← 仍是纯 ActionSchema
  onError?: ActionSchema;
}
```

### S. `dependsOn` 语义：覆盖，不合并

| 写法                    | watch 路径集                                          |
| ----------------------- | ----------------------------------------------------- |
| 省略 `dependsOn`        | 自动从 `args` / `when` 模板的静态分析收集（默认行为） |
| 显式 `dependsOn: [...]` | **只用**该列表，**不做**静态分析、**不合并**          |

理由：

1. 显式即权威 —— 作者写了 `dependsOn` 就是"我替你决定了触发条件"，框架不越权
2. 避免意外 over-fire —— 静态分析会把错误提示里的 `${user.name}` 等无关模板也当依赖；`dependsOn` 是规避手段
3. 实现简单 —— 两个分支互斥，无 merge 逻辑

边界：

- `dependsOn: []`（空数组）= 不订阅任何路径 = 纯命令式（reactive 通道禁用）。合法且有用：让 loadAction 只在 mount/refresh 跑
- 路径必须**裸字符串**，不带 `${}`（和 `ReactionSchema.dependsOn` / `BaseDataSourceSchema.dependsOn` 一致）
- 编译期校验：违反形状 emit error

### T. 编译层

field rule：

```ts
// crud-renderer-definition.ts
{ key: 'loadAction', kind: 'reaction' }
```

node-compiler 在 `kind === 'reaction'` 时：

1. 从 raw schema 抽出 `dependsOn`（如果存在）
2. 编译 action 主体为 `CompiledActionProgram`
3. **根据 dependsOn 是否存在二选一**：
   - 省略 → 对 `args` / `when` 的 `CompiledRuntimeValue` 做静态依赖分析，得到 watch 路径集
   - 显式 → 直接采用，跳过分析
4. 组装成 `CompiledReactionPlan`（包装 `CompiledActionProgram` + watch paths + 可选 control）
5. 存进 `templateNode.reactionPlans[key]`

注意第 3 步体现 S 节的覆盖语义。

### U. 运行层：`ReactionHandle`

`props.reactions[key]` 暴露：

```ts
interface ReactionHandle {
  /** 命令式触发，绕过 reactive 通道。用于 mount 首次 / refresh 按钮 */
  dispatch(ctx?: Partial<ActionContext>): Promise<ActionResult>;

  /** 强制 reactive 通道跑一次（忽略 watch 是否变化，但走 wrapper） */
  force(ctx?: Partial<ActionContext>): Promise<ActionResult>;

  /** 信号：renderer scope 已就绪，开启 reactive 触发。ready 前累积的变化触发一次 */
  ready(): void;

  /** 暂停 reactive（用于 server pagination 回填阶段防自循环） */
  pause(): void;
  resume(): void;
}
```

### V. ready/pause 门控（核心机制）

CRUD loadAction 的失败模式：

```
T0: mount
T1: 注册 reaction（监听 pagination.currentPage）
T2: CRUD 把 pagination 默认值写进 scope       ← reaction 误判为"变化"
T3: AbortController/result handler 还没装好
T4: reaction 触发 → 半初始化 dispatch → 失败
T5: CRUD 初始化完，imperative dispatch         ← 双重 fetch
```

门控解决：

| 阶段                  | reaction 行为                                             |
| --------------------- | --------------------------------------------------------- |
| 注册后 → `ready()` 前 | 监视但不触发；记录"有变化"标志                            |
| `ready()` 被调用      | 若有 pending 变化，触发一次；之后正常 reactive            |
| `pause()`             | 暂停（用于 server pagination 回填阶段）                   |
| `dispatch(ctx?)`      | **绕过门控**，命令式直接跑（不受 ready/pause 影响）       |
| `force(ctx?)`         | 强制 reactive 通道跑（忽略 watch 是否变化，但走 wrapper） |

**默认初始状态：`paused`**（必须显式 `ready()`）。理由：

1. 渲染器天然在 `useLayoutEffect` 写 scope、在 `useEffect` 注册 reaction + dispatch + ready —— 时机分开
2. paused 是"安全失败"方向
3. 调试一眼能看出"为什么没触发"—— 多半没调 ready

### W. 渲染器拥有 dispatch（"scope 包装"）

框架内部用 `runtime.registerReaction` 注册，但 dispatch callback 由**渲染器注入**：

```ts
runtime.registerRendererReaction({
  id,
  compiledReactionPlan,
  scope,
  dispatch: rendererOwnedDispatch, // ← 渲染器拥有
  initialReadyState: 'paused',
});
```

`rendererOwnedDispatch` 负责：

- 注入 `evaluationBindings`（CRUD 的 `pagination`/`query`/`sort`/`filters`/`selection` 快照）
- 管 AbortController（每 fire 一个新 controller，旧 fire abort）
- 处理 result（`setRows` / `setTotal` / server-pagination 修正）

三条触发路径（imperative dispatch / reactive auto / manual force）**共用同一个 wrapper**，逻辑统一。

### X. CRUD 使用范例

```ts
const loadReaction = props.reactions.loadAction;

// Phase 1: scope 初始化（reaction 处于 paused，记变化但不触发）
useLayoutEffect(() => {
  scope.update(ownerStatePath, {
    pagination: defaultPagination,
    query: {},
    sort: {},
    filters: {},
    selection: [],
  });
}, []);

// Phase 2: imperative 首次 + 信号 ready
useEffect(() => {
  if (!autoLoad) {
    loadReaction.ready(); // 即使不首跑，也开启 reactive
    return;
  }
  loadReaction.dispatch().then(handleLoadResult);
  loadReaction.ready();
}, []);

// 用户点 refresh 按钮
const handleRefresh = () => loadReaction.force();

// server pagination 回填防循环
async function applyServerPaginationCorrection(corrected) {
  loadReaction.pause();
  scope.update(paginationStatePath, corrected);
  await loadReaction.dispatch();
  loadReaction.resume();
}
```

### Y. 与 `<reaction>` 渲染器的关系

`<reaction>` 是**纯 reaction**（无 imperative 通道、无 ready 门控、无 renderer-owned dispatch）。它的假设是"父 scope 已初始化好"，所以不需要这套机制。

`kind: 'reaction'` 是**渲染器内部使用的 reaction**，需要 imperative 通道 + ready 门控 + wrapper。两者共用底层 `compileReaction` + `registerReaction`，上层 API 不同：

```
              compileReaction  +  registerReaction  (底层)
                      ↑                  ↑
                      |                  |
       +--------------+------------------+--------------+
       |                                                |
  <reaction> 渲染器                       kind: 'reaction' 字段
  (纯 reactive，黑盒，                     (reactive + imperative + gating，
   immediate: true 触发首跑)                renderer-owned dispatch)
```

### Z. 落地分阶段（替换前面所有 Phase 提议）

**Phase 1：修当前 bug（约 10 行，立刻做）**

- `crud-renderer.tsx:159`：`props.events['loadAction']` → `props.templateNode.eventPlans['loadAction']`
- `useCrudLoadAction`：入参类型 `ActionSchema | undefined` → `CompiledActionProgram | undefined`
- 验证：`crud-loadaction.test.tsx` 全绿

**Phase 2：基础设施（flux-core + flux-compiler + flux-runtime）**

- 新增 `ReactiveActionSchema` 类型（flux-core）
- 新增 `kind: 'reaction'` field rule 处理（flux-compiler / node-compiler）：编译产物 `CompiledReactionPlan`，存进 `templateNode.reactionPlans`
- `args`/`when` 静态依赖分析工具（flux-compiler）：可独立单测
- 新增 `runtime.registerRendererReaction` API（flux-runtime）：返回 `ReactionHandle`，内部基于现有 `registerReaction`，加 ready/pause 状态机
- `props.reactions` channel 在 `node-renderer-resolved.tsx` 接通（flux-react）

**Phase 3：CRUD 接入**

- `CrudSchema.loadAction` 类型改 `ReactiveActionSchema`
- field rule 改 `kind: 'reaction'`
- `useCrudLoadAction` 重写为基于 `ReactionHandle`：`useLayoutEffect` 写 scope → `useEffect` dispatch + ready → refresh 走 force → server pagination 修正走 pause/dispatch/resume
- 删除原 `requestKey` 序列化机制（其职责被 reaction 的 watch + ready 接管）
- 验证：原 6 个测试转绿 + 新增 e2e 覆盖 (a) 外部 binding 变化触发重 fetch、(b) server pagination 回填不引发循环、(c) `dependsOn: []` 关闭 reactive

**Phase 4：Form / Page loadAction（可选，按需）**

- 若 Form / Page 也需要 mount-时拉数据 + reactive 重 fetch，同样用 `kind: 'reaction'`
- 当前 Form/Page loadAction 测试也红，可在 Phase 3 之后顺手统一

### AA. 不同意的部分（明确否决）

| 提议                                               | 否决理由                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 让 `kind: 'event'` 自动 reactive                   | 破坏 event 命令式语义；复制 reaction 基础设施                                                     |
| `compileActions` 改返回 `CompiledRuntimeValue`     | event 的 args 已经是 lazy 的（`CompiledRuntimeValue` 在 dispatch 时求值），此改动无收益、破坏面大 |
| `loadAction: ["${path}"]`（带 `${}` 的字符串数组） | scope 路径不是表达式；和已有 `dependsOn` 约定不一致                                               |
| `watchOn` 新名                                     | 引入新词不必要；`dependsOn` 已在 `<reaction>` / `<data-source>` 上有同语义用法                    |
| 合并 `显式 dependsOn + 自动收集`                   | 显式即权威；合并带来 over-fire 风险                                                               |
| 默认 reactive（不需 ready）                        | 渲染器 scope 初始化与 reaction 注册有时序竞争；默认 paused 是安全失败方向                         |

---
