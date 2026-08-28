# 04 flux-action-core 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-action-core/src/` 全部 11 个实现源文件，共 2005 行（排除 `*.test.*` 与 `__tests__/`）。精读 11/11；为反误报额外核对了 `flux-core`（debounce 工具、类型契约、built-in 注册表、named-action-provider）、`flux-compiler/src/action-compiler.ts`、`flux-runtime/src/action-adapter.ts` 与 `runtime-action-helpers.ts`、`flux-react/src/node-renderer.tsx`，以及本包 10 个测试文件的锁定语义。
- 结论概览：P0 x0 / P1 x4 / P2 x5 / P3 x10 —— 分发管线主干（resolution order、then/onError/onSettled、branch bindings、abort/timeout 组合、retry 计数）实现扎实且有测试锁定；主要风险集中在"cancelled 类结果被当作 failure 通知用户"、"xui:actions 命名动作无递归保护"、别名/契约漂移（`submit` retry 分叉、`componentName`/`dialog`/`drawer` 文档声称但未实现）以及 `evaluateSurfaceArgs` 的形状启发式误伤值参数。

## P0 缺陷

无。未发现可按"输入→路径→错误结果"链条直接复现数据损坏级错误的缺陷。

## P1 隐患

### F-01 debounce 取消（supersession）与 abort 取消会触发伪错误 toast（cancelled 类结果泄漏到 `notify('error')`）

位置：`packages/flux-action-core/src/action-dispatcher/action-execution.ts:336-354`（触发源）与 `:161-201`（通知判定）。

```ts
// action-execution.ts:347-353
const key = createActionKey(action, actionCtx);

cancelPendingDebounce(ctx.pendingDebounces, key, createCancelledResult());

return scheduleDebounce<string, ActionResult>(ctx.pendingDebounces, key, debounceMs, () =>
  runSingleActionWithRetry(ctx, action, actionCtx),
);
```

```ts
// action-execution.ts:190-200（节选）
const hasDiagnosticChannel =
  ctx.onActionError !== undefined ||
  (ctx.plugins ?? []).some((p) => typeof p.onError === 'function');
if (hasDiagnosticChannel && caughtFailureResults.has(result)) {
  return;
}
const message =
  result.error instanceof Error ? result.error.message : String(result.error ?? 'Action failed');
ctx.getEnv().notify('error', message);
```

问题：`isFailureClass` 按 H35 将 `cancelled`/`timedOut` 归入 failure-class（有测试锁定，用于触发 onError/onSettled）。但 `reportUnhandledFailureClass` 对所有 failure-class 结果调 `env.notify('error')`，唯一豁免条件是"存在诊断通道 **且** 结果在 `caughtFailureResults` WeakSet 中"。debounce 取消结果由 `cancelPendingDebounce(..., createCancelledResult())` 构造、abort 取消结果由 `runSingleActionWithRetry`/`runSingleAction` 的 catch 构造，二者都从未加入 `caughtFailureResults`，也没有任何 `onActionError`/`plugin.onError` 诊断见过它们。

推理链（debounce 场景）：

1. 输入：某动作配置 `debounce: N`，在 N 毫秒内被重复触发两次（debounce 的典型使用方式：快速双击、连续输入）。
2. 路径：第二次 dispatch → `runActionWithDebounce` → `cancelPendingDebounce(map, key, createCancelledResult())` 把第一次 dispatch 正在 await 的 promise resolve 为 `{ok:false, cancelled:true, error:undefined}` → 第一次 dispatch 恢复 → `resultClass='cancelled'` → 无 `then`；无 `onError` 时跳过 onError 分支 → `reportUnhandledFailureClass(ctx, currentActionCtx, result, false)`：非 synthetic event、无 `failureHandled`、不在 WeakSet → `notify('error', 'Action failed')`（error 为 undefined，落到默认文案）。
3. 错误结果：被抑制的那次触发向用户弹出一个无意义的 error toast "Action failed"。同理，dispose/abort 中断 in-flight 动作时用户会看到 "The operation was aborted" 错误 toast——与 `action-scope-and-imports.md` "Cancellation Ownership" 一节"取消是 normalized 语义、由 owner 消费，不应被二次解读为错误"的方向相悖。

影响：所有配置了 debounce 的动作在正常抑制场景下都会产生伪错误反馈；unmount/dispose 期间批量出现取消 toast。现有测试只锁定了 cancelled 类触发 onError/onSettled/短路（`cancelled-class-and-error-guard.test.ts`），`debounce.test.ts` 只测 flux-core 工具本身，`action-dispatcher-routing.test.ts:341-368` 只断言 dispose 后 promise 形状、未断言 notify——该路径无测试覆盖。

修复方向：在 `reportUnhandledFailureClass` 中对从未经过诊断通道的 `cancelled` 类结果（`classifyActionResult(result) === 'cancelled'` 且未被 onError 处理）直接返回；或为 debounce/abort 构造的取消结果打上与 `caughtFailureResults` 等价的"已静默"标记。注意与 H35 测试的边界：onError/onSettled 触发行为保持不变，只收敛 notify。

### F-02 xui:actions 命名动作自引用/互引用形成运行时无限递归，无深度保护

位置：`packages/flux-action-core/src/action-dispatcher/action-runners.ts:148-192`（解析与转发）；递归环经 `flux-core/src/named-action-provider.ts:16-31` → `flux-react/src/node-renderer.tsx:172-182`（`executeProgram = (program, ctx) => ctx.runtime.dispatch(program, ctx)`）回到本包 `dispatch`。

```ts
// action-runners.ts:153-160（节选）
if (action.action.indexOf(':') >= 0) {
  return undefined;
}
const namespacedName = `${XUI_ACTIONS_NAMESPACE}:${action.action}`;
const resolved = ctx.actionScope?.resolve(namespacedName);
if (!resolved) {
  return undefined;
}
```

```ts
// named-action-provider.ts:19-22（flux-core，环的另一边）
const program = plans[method];
if (program) {
  return executeProgram(program, { ...ctx, evaluationBindings: payload });
}
```

问题：`dispatch`/`runSingleAction`/`runNamedAction` 全链路没有递归深度计数。`MAX_ACTION_COMPILE_DEPTH=128` 只保护编译期 then/onError/onSettled/parallel 树深度，不覆盖"名字引用"构成的运行时环。

推理链：

1. 输入：schema 声明 `xui:actions: { a: { action: 'a' } }`（自引用）或 `a → b → a`（互引用，作者笔误即可形成）。
2. 路径：`dispatch` → `runNamedAction('a')` → adapter `invokeNamespacedAction` → named provider `invoke('a')` → `executeProgram` → `ctx.runtime.dispatch` → 再次 `runNamedAction('a')` → … 每层都成功解析，无任何深度/环检测。
3. 错误结果：dispatch 永久 pending；async 递归不爆栈，而是每层保留闭包/ctx/promise 链，内存持续增长直至页面卡死；无诊断信息提示环的存在。

影响：一条良构编译（编译器无法静态判定名字环，因为名字到运行时才解析）的 schema 即可挂起应用；错误表现为无响应而非明确报错，排查成本高。

修复方向：在 `dispatch`（或 `ActionDispatcherContext`）上维护 per-interaction 的深度计数（可复用 `interactionId` 聚合），超过阈值（如 64/128）返回 `{ok:false, error}` 并携带触发链；或在 named provider invoke 时在 ctx 上传递/递增 `namedActionDepth`。

### F-03 `submit` 别名 + `retry` 静默不重试，与 canonical 名 `submitForm` 行为分叉

位置：`packages/flux-action-core/src/action-dispatcher/program-utils.ts:9-11`；`action-execution.ts:361-383`。

```ts
// program-utils.ts:9-11
export function isRequestBackedAction(action: CompiledActionNode): boolean {
  return action.action === 'ajax' || action.action === 'submit';
}
```

```ts
// action-execution.ts:361-363
if (isRequestBackedAction(action)) {
  const result = await runSingleActionWithTimeout(ctx, action, actionCtx);
  // —— 之后仅回填 attempts/failureCount，不做通用 withRetry
```

问题：`BUILT_IN_ACTION_REGISTRY`（flux-core/src/constants.ts:41）把 `submit` 注册为 `submitForm` 的官方 compatibility alias。但 `isRequestBackedAction` 只匹配字符串 `'submit'`，不匹配 canonical 名 `'submitForm'`：

- `{action:'submitForm', retry:{times:3}}` → 非request-backed → 通用 `withRetry` 管线重试（`contract-control-flow-retry-and-extras.test.ts:92-121` 锁定 `attempts:3`）。
- `{action:'submit', retry:{times:3}}` → request-backed 分支 → 只跑一次 `runSingleActionWithTimeout`，期望 adapter 侧消化 retry；但 `flux-runtime/src/action-adapter.ts:201-228` 的 `submitForm` case 直接 `ctx.form.submit({interactionId, signal})`，不读取 `resolveRequestControl`（该逻辑只存在于 ajax case，`runtime-action-helpers.ts:172`）→ 重试配置被静默忽略。

影响：同一 canonical 动作的两种写法（registry 明确声明等价的 alias）产生不同的 retry 语义；使用别名 + retry 的 schema 得到"配置无效且无诊断"的行为。

修复方向：`isRequestBackedAction` 改为基于 alias 归一化后的 canonical 名判定（如同时接受 `submit`/`submitForm`，或在 dispatch 入口先把 alias 归一为 canonical），使别名与 canonical 走同一管线；或在 adapter submitForm case 消费 `requestControl`。

### F-04 `evaluateSurfaceArgs` 用 `isSchema` 形状启发式覆盖 fieldRules 声明分类，openDialog/openDrawer 的值参数被静默跳过表达式求值

位置：`packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:37-59`；判定函数 `flux-core/src/utils/schema.ts:4-6`。

```ts
// built-in-actions.ts:48-58（节选）
const evaluated = evaluateActionArgs(action, ctx, evaluator) ?? {};
const result: Record<string, unknown> = { ...evaluated };
const rawPreservedKeys = collectRawPreservedArgKeys(action);

for (const [key, value] of Object.entries(rawArgs)) {
  if (isSchema(value) || isSchemaArray(value as unknown[]) || rawPreservedKeys.has(key)) {
    result[key] = value;
  }
}
```

```ts
// flux-core/src/utils/schema.ts:4-6
export function isSchema(value: unknown): value is BaseSchema {
  return isPlainObject(value) && typeof value.type === 'string';
}
```

问题：`BUILT_IN_ACTION_DEFINITIONS.openDialog`（flux-core/src/constants.ts:122-137）明确声明 `data: 'value'`（值字段，应求值），`body: 'schema'`、`actions: 'schema-array'` 才是 schema 字段。但保留循环不查 fieldRules，而是对任意 key 的值做形状启发式：任何"普通对象 + 字符串 `type` 字段"的参数都被当作 schema 原样保留。`data: { type: 'profile', name: '${userName}' }` 是合法的值参数，`isSchema(data) === true` → 已求值的 `evaluated.data` 被原始 source 值覆盖。

推理链：

1. 输入：`{ action:'openDialog', args:{ data: { type: 'order', label: '${row.label}' } } }`。
2. 路径：`evaluateActionArgs` 正常求值得到 `label` 结果 → 保留循环发现 raw `data` 满足 `isSchema`（plain object + `type` 字符串）→ `result.data = rawArgs.data`，求值结果被丢弃。
3. 错误结果：dialog 收到的 data 中 `label` 是字面量 `'${row.label}'`，无任何诊断。

影响：值参数含 `type` 字符串键（typed payload 很常见）时表达式静默失效。注意同根问题存在于编译侧 `flux-compiler/src/action-compiler.ts:26-53` `preserveSchemaArgs`（同样用 `isSchemaInput` 启发式），两层一致地误分类，因此行为确定但违反 fieldRules 声明契约。

修复方向：保留循环按 `definition.fieldRules` 中 `kind === 'schema' | 'schema-array'` 的键集合判定，替代全键形状启发式；编译侧同步修复。

## P2 风险

### F-05 `componentName` targeting：文档声称支持，实现全链路缺失（契约漂移）

位置：`packages/flux-action-core/src/action-dispatcher/action-runners.ts:62-73`。

```ts
// action-runners.ts:62-73（节选）
const target = {
  _targetCid:
    typeof action.targeting._targetCid === 'number' ? action.targeting._targetCid : undefined,
  componentId: action.targeting.componentId,
};

if (!target.componentId && target._targetCid === undefined) {
  return { ok: false, error: new Error('component:<method> requires _targetCid or componentId') };
}
```

问题：`docs/architecture/action-scope-and-imports.md` 的 targeting matrix（"component instance -> `component:<method>` plus `componentId` or `componentName`"）与 `ComponentTarget` 接口（含 `componentName`）声称支持按名定向；但 `ActionShapeFields`、`CompiledActionTargeting`（flux-core/src/types/actions.ts:435-442）、`ComponentActionInvocation.target`（:493-497，类型就是 `{ _targetCid?; componentId? }`）、`compileTargeting`（flux-compiler/src/action-compiler.ts:71-80）全链路都没有 `componentName` 字段，registry 的 `resolve(target)` 永远收不到该字段。

影响：按文档编写的 `{ action:'component:refresh', componentName:'ordersTable' }` 直接得到 "requires \_targetCid or componentId" 错误。属于 doc 与实现的单向漂移（功能端到端不存在）。

修复方向：二选一——实现 targeting 链路补 `componentName`，或修订文档/targeting matrix 移除该承诺。

### F-06 `dialog`/`drawer` legacy 别名：文档声称兼容，注册表与分发 switch 均未实现

位置：`packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:69-314`（switch 无 `dialog`/`drawer` case）；`flux-core/src/constants.ts:30-46`（`BUILT_IN_ACTION_REGISTRY` 仅有 `submit → submitForm` 一个别名）。

问题：doc 的 Schema Authoring preference 一节明确说 "`dialog` remains supported for compatibility"、"`drawer` remains supported for compatibility"。但注册表无此二别名，`runBuiltInAction` switch 也无对应 case：`{action:'dialog'}` 会顺序落穿 built-in/component/named/namespaced，最终返回 `Unsupported action: dialog`。

影响：按文档兼容承诺编写的 legacy schema 运行时直接失败；`getBuiltInActionDefinition('dialog')` 返回 undefined 也使诊断层无法提前发现。

修复方向：在 `BUILT_IN_ACTION_REGISTRY` 为 `openDialog`/`openDrawer` 增加 `compatibilityAliases: ['dialog']/['drawer']` 并在 switch 增加 case；或修订文档删除兼容承诺。

### F-07 `plugin.beforeAction` 返回值只部分生效：when/parallel/args 生效，then/onError/onSettled/control 被忽略，且空数组无防护

位置：`packages/flux-action-core/src/action-dispatcher/action-execution.ts:258-270`（plugin 管线）与 `:501/515/563`（分支读取来源）。

```ts
// action-execution.ts:258-270（节选）
const processedAction =
  (ctx.plugins?.length ?? 0) > 0
    ? normalizeCompiledActionProgram(
        await (ctx.plugins ?? []).reduce<Promise<ActionSchema>>(async (currentPromise, plugin) => {
          const current = await currentPromise;
          return plugin.beforeAction ? plugin.beforeAction(current, activeCtx) : current;
        }, Promise.resolve(action.source)),
        ctx,
      ).nodes[0]!
    : action;
```

问题：

1. 分支不一致——`processedAction` 用于 `when`/`parallel`/runners，但 `then`/`onError`/`onSettled`/短路判定 `continueOnError` 在 dispatch 主循环读取的是 plugin 处理前的 `normalizedAction`。plugin 若注入/修改分支（如审计日志插到 then 尾部）会被静默丢弃，与 `RendererPlugin.beforeAction(action, ctx): ActionSchema` 的整对象转换契约不符。
2. `.nodes[0]!` 非空断言——plugin 返回 `[]` 时 `compileActions([])` 产生空 nodes，`processedAction` 为 undefined，`shouldRunActionWhen(undefined,...)` 抛 TypeError，被 catch 包装成难以理解的 "Cannot read properties of undefined (reading 'when')" 失败结果。
3. 性能——重编译缓存键是 plugin 返回的 schema 对象；防御性克隆（每次返回新对象）的 plugin 会导致每次 dispatch 全量重编译 action program（D6）。

修复方向：分支与 continueOnError 判定改用 `processedAction`（或统一在 dispatch 顶层做 plugin 转换再派生节点）；对空 nodes 返回 `{ok:true, skipped:true}`；文档化 plugin 返回值需保持引用稳定或提供编译缓存旁路。

### F-08 `onActionError`/`plugin.onError` 对非抛出型失败收到 ActionResult 对象而非 Error，且重试成功后仍会上报

位置：`packages/flux-action-core/src/action-dispatcher/action-execution.ts:417-419`。

```ts
// action-execution.ts:417-419
if (failureCount > 0) {
  reportActionError(
    ctx,
    lastFailureReason ?? lastResult?.error ?? new Error('Action retries failed'),
    actionCtx,
  );
}
```

问题：非 request-backed 动作全部经由 `withRetry`（无 retry 配置时 times=0）。adapter 返回 `{ok:false}`（未抛出）时 `lastFailureReason = lastResult`（ActionResult 对象），于是每次普通失败都会调用 `onActionError`/`plugin.onError`，参数是 ActionResult 而非 Error；重试后最终成功的动作也会因 `failureCount > 0` 被上报一次"已被恢复"的失败。doc 诊断一节定义该钩子"receive thrown errors before they are normalized into `{ok:false, error}` results"——收到 result 对象属于未定义行为，按 Error 处理（读 `.message`）的消费者得到 undefined。

影响：宿主诊断/监控钩子收到非预期类型；恢复型重试产生误报。与 `runSingleAction` catch 路径（真正抛出的 Error）语义混杂。

修复方向：上报前归一化——非 Error 的 `lastFailureReason` 取 `result.error` 或包装为 Error；明确"重试成功"是否应上报（建议只在最终失败时上报，中间失败走 `onFailedAttempt` 语义）。

### F-09 named action 边界整体替换 `evaluationBindings`，then/onError 分支中调用 xui:actions 丢失 `result`/`error`/`prevResult`（suspect，跨包根因）

位置：入口 `packages/flux-action-core/src/action-dispatcher/action-runners.ts:148-192`；根因 `flux-core/src/named-action-provider.ts:19-22`。

```ts
// named-action-provider.ts:19-22（flux-core）
const program = plans[method];
if (program) {
  return executeProgram(program, { ...ctx, evaluationBindings: payload });
}
```

问题：payload 注入为 evaluationBindings 是有意设计（named action 的 args 成为表达式可见根，有 `named-action-provider.test.ts:43-46` 锁定）。但展开赋值把调用方已有的 `ctx.evaluationBindings` 整体丢弃：在 `then`/`onError` 分支里调用命名动作时，doc "Chained Action Result Context"（`result`/`error`/`prevResult` 通过 transient bindings 注入）在 named action 边界失效——`${result}`、`${prevResult}` 在命名链内不可见（除非 payload 恰好带同名键）。

影响：链式场景下命名动作无法读取触发结果，与 doc 的 chained-branch 上下文规则冲突。因 payload 注入本身是锁定行为，判定为契约张力而非明确 bug（标 suspect）。

修复方向：`evaluationBindings: { ...ctx.evaluationBindings, ...payload }` 合并（payload 优先），并补分支场景测试。

## P3 提示

### F-10 `normalizeCompiledActionProgram` 在 try 块之前抛错时 `mergeAbortSignals` 监听器泄漏

位置：`action-execution.ts:468-477`（`try {` 在 477 行，`finally` 的 `mergedSignalCleanup()` 覆盖不到 474 行的 `normalizeCompiledActionProgram` 抛错路径）。注入 compiler 缺失 + 直接 dispatch 原始 ActionSchema 时，每次失败的 dispatch 在 `rootAbortController.signal`（runtime 生命周期级）和 `actionCtx.signal` 上各泄漏一个 abort listener。修复：把 normalize 移入 try 或用 try/catch 包住并手动 cleanup。条件为配置错误，故 P3（D3）。

### F-11 `withTimeout` 的 `onTimeout` 同步抛错导致外层 promise 永不 settle

位置：`operation-control.ts:95-104`。`resolve(onTimeout())` 在 setTimeout 回调内裸调用，`onTimeout` 抛错则 resolve/reject 都不执行且异常逃逸到 timer 顶层。当前调用点（`action-execution.ts:458`）传纯构造函数不可触发，属防御性缺口（D5）。

### F-12 重试成功后的 success 结果携带 `error` 字段（非 Error 对象）

位置：`action-execution.ts:421-426`。`error: lastResult?.error ?? lastFailureReason` 在 ok:true 时仍写入上一次失败的 ActionResult 对象。`contract-control-flow-retry-and-extras.test.ts:36-38` 只断言 ok/data/callCount，未锁 error。then 分支表达式 `${result.error}` 会看到对象。修复：ok 时不回填 error，或仅在失败时附加（D1 minor）。

### F-13 `withRetryMetadata` 包装丢失原 Error 引用

位置：`operation-control.ts:17-36`。`new Error(error.message, { cause: error.cause ?? error })`：原错误已有 cause 时，原错误本身脱离 cause 链（仅 message/stack 被复制）；Error 子类的自定义属性丢失；非 Error 对象走浅拷贝丢原型。与 doc "keep the original rejection on Error.cause" 的保真精神有偏差（D5 诊断保真）。

### F-14 `runParallelActions` 使用 `Promise.all` 而非 allSettled（doc 措辞为 "Promise.allSettled-style"）

位置：`action-execution.ts:220-229`。当前安全依赖"子 promise 永不 reject"的隐式不变量（由 `runSingleAction` 全量 catch + retry 层 abort 归一化保证）；任何未来子路径新增 reject（如 debounce factory 直接抛出）会提前 reject 聚合并丢失兄弟结果。建议改 `Promise.allSettled` 显式化不变量（D1/D6 suspect——当前不可触发）。

### F-15 `confirm`/`alert` 非字符串 message/title 被静默降级为 undefined

位置：`built-in-actions.ts:174-216`。`typeof message === 'string' ? message : undefined` 使表达式求值出非字符串（如数字、null）时静默落回 adapter 默认文案（'Are you sure?'），无诊断。另：`closeDrawer`/`closeDialog`/`closeSurface` 三个 case（:149-245）为 ~20 行完全相同的重复代码，可合并（D8）。

### F-16 `runNamespacedAction` 与 adapter 双重 resolve（TOCTOU + 误导性默认元数据）

位置：`action-runners.ts:117-119` 与 `flux-runtime/src/action-adapter.ts` `invokeNamespacedAction` 内再次 `ctx.actionScope.resolve(...)`。两次解析间 provider 可能被注销；解析失败时 `providerKind ?? 'host'` 给不存在的 provider 标注 'host'，误导诊断（D6/D5 minor）。

### F-17 `shouldPreventDefault`/`shouldStopPropagation` 求值失败直接 `console.error`，不走 `onActionError` 诊断通道

位置：`action-core.ts:376-410`。与包内其余"错误进状态机/诊断钩子"的路由约定不一致；宿主无法通过统一钩子观测这两类表达式失败（D5 minor）。

### F-18 parallel 子动作 + debounce 同 key 互相取消

位置：`action-core.ts:34-48`（`createActionKey` 不区分 parallel 兄弟身份）+ `action-execution.ts:220-229`。同一 `parallel` 数组内两个相同 owner+action+target 且配置 debounce 的子动作，后调度的会取消先调度的，先者 resolve cancelled 使聚合 `ok:false`。极端边界（D1 suspect）。

### F-19 `dispatch` 主循环对 neutral（skipped）结果不执行 `onSettled`

位置：`action-execution.ts:563`。`(resultClass === 'success' || isFailureClass(result))` 把 skipped（neutral）排除在 onSettled 之外；若作者把 onSettled 当 finally 语义使用，`when:false` 跳过的动作不会触发清理。当前无文档明确定义 skipped × onSettled 的组合，建议在 doc 中明确或补测试锁定（D2 minor）。

## 检查过程记录

1. **契约基线**：精读 `docs/architecture/action-scope-and-imports.md`（1488 行），提取规范点：resolution order（built-in → component → xui:actions → namespaced → not-found）、chained branch bindings（result/error/prevResult）、cancellation ownership、`componentName` targeting matrix、`dialog`/`drawer`/`closeDialog`/`closeDrawer` 别名兼容承诺、parallel allSettled 语义、retry/timeout 语义。
2. **文件枚举**：`find packages/flux-action-core/src -type f`，排除测试后 11 个源文件、2005 行，全部精读（index.ts 37、action-dispatcher.ts 1、action-dispatcher/index.ts 2、action-parsing.ts 29、types.ts 47、program-utils.ts 70、action-runners.ts 192、operation-control.ts 237、built-in-actions.ts 322、action-core.ts 413、action-execution.ts 655）。
3. **依赖交叉验证（反误报）**：
   - `flux-core/src/utils/debounce.ts`：确认 `cancelPendingDebounce` 的 resolveWith 语义（F-01 前提）；`scheduleDebounce` 内部无 resolveWith 调用在本包调用序中不触发。
   - `flux-core/src/types/actions.ts`：确认 `CompiledActionTargeting`/`ComponentActionInvocation.target` 无 componentName（F-05）；`ActionResult` 字段（onErrorError/settledError/failureHandled）。
   - `flux-core/src/constants.ts`：确认 `BUILT_IN_ACTION_REGISTRY` 仅有 `submit` 别名、`BUILT_IN_ACTION_DEFINITIONS.openDialog.data='value'`（F-03/F-04/F-06）。
   - `flux-compiler/src/action-compiler.ts`：确认 compileControl/compileTargeting 映射、`preserveSchemaArgs` 同根启发式（F-04/F-05）。
   - `flux-runtime/src/action-adapter.ts` + `runtime-action-helpers.ts` + `runtime-factory.ts`：确认 submitForm case 不消费 requestControl（F-03）、`invokeComponentAction` 的 resolve 路径（F-05）、真实 dispatcher 配置（onActionError 可为 undefined，使 F-01 的 notify 豁免分支失效）。
   - `flux-react/src/node-renderer.tsx` + `flux-core/src/named-action-provider.ts`：确认 named action 经 `ctx.runtime.dispatch` 回环（F-02）及 bindings 替换（F-09）。
4. **测试锁定核对**：精读 `cancelled-class-and-error-guard`、`action-dispatcher-error-guard`、`nested-onerror-suppression`、`contract-control-flow-parallel`、`contract-control-flow-retry-and-extras`（部分）、`action-dispatcher-control-flow`（部分）、`action-dispatcher-routing`（部分）、`debounce`、`action-dispatcher-test-support`、`named-action-provider.test`（flux-core）。确认：cancelled→failure-class（H35）与 onError 成功后整体仍返回失败均为锁定设计（后者避免了一次误报）；notify 对未处理 failure 的期望；parallel 聚合语义；attempts/failureCount 计数。F-01/F-02/F-03/F-04 相关路径均无测试覆盖或未被断言锁定。
5. **排除的疑点（未列入）**：`withEvaluationBindings` 的 readVisible/materializeVisible 快照缓存（每次求值新建 wrapper，窗口内无 scope 变更，无实际影响）；sibling 序列不注入 branch bindings（与 doc "for chained branches" 一致）；dispatch 后 dispose 的新调用返回 cancelled（mergeAbortSignals 对 aborted root 短路，行为正确）；`applyActionControl` 的嵌套 control 提升（timeout/debounce/retry 正确提升，continueOnError 在 schema 顶层字段由 compileControl 正确映射）。
6. **工具约束遵守**：全程只读（Read/grep/find/ls/wc），未修改 `packages/` 任何文件，未运行 pnpm。
