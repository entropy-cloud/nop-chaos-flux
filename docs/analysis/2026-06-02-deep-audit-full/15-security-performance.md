# 维度 15: 安全与性能红线

## 第 1 轮（初审）

### [维度15-01] stopWhen 的 null-member 求值错误被静默降级为"继续轮询"

- **文件**: `packages/flux-runtime/src/async-data/api-data-source-controller-state.ts:127-154`
- **证据片段**:

```ts
try {
  return input.runtime.evaluate<boolean>(input.stopWhen, input.scope) ?? false;
} catch (error) {
  if (
    error instanceof Error &&
    error.cause instanceof Error &&
    error.cause.message === 'Cannot access member of null or undefined'
  ) {
    return false; // ← 静默降级为"继续 polling"
  }
  updateControllerState(input, mutable, (current) => toStopConditionErrorState(current, error));
  if (!input.silent) {
    reportRuntimeHostIssue({ env: input.runtime.env, error, phase: 'api' });
  }
  return true;
}
```

- **严重程度**: P1
- **类别**: 安全（fail-closed 违约）
- **规则**: `docs/architecture/security-design-requirements.md` R3/R4
- **现状**: `stopWhen` 求值失败时，对 `Cannot access member of null or undefined` 特判后直接返回 `false`，上层解释为"条件未满足，继续 polling"。数据结构漂移、后端缺字段、表达式写错都被伪装成正常未命中停止条件。
- **风险**: 轮询继续、错误不可观测、资源持续消耗。
- **建议**: 移除此 null-member 特判，让所有求值错误统一进入 error state 并上报 host。
- **误报排除**: 不与 reopened-adjudication 记录中已收口的旧问题重合；当前 v1 基线不接受主路径静默降级。

## 深挖第 2 轮追加

### [维度15-02] polling stopWhen 丢失已编译表达式，热路径每次轮询重新编译

- **文件**: `packages/flux-compiler/src/source-compiler.ts:96-100`、`packages/flux-runtime/src/async-data/source-registry.ts:153-155`、`packages/flux-runtime/src/async-data/api-data-source-controller-state.ts:135-136`、`packages/flux-runtime/src/runtime-eval-helpers.ts:20-25,42-43`
- **证据片段**:

```ts
// source-compiler.ts — 编译期已生成 compiled.stopWhen
compiled.stopWhen = compiler.compileValue(actionSchema.stopWhen, ...);

// source-registry.ts — 注册时又降回原始 string
stopWhen: extractExpressionSource(compiled.stopWhen),

// controller-state.ts — 每次 polling 都 evaluate string
return input.runtime.evaluate<boolean>(input.stopWhen, input.scope) ?? false;

// runtime-eval-helpers.ts — string 不命中 WeakMap 缓存
if (!cacheable) { return expressionCompiler.compileValue(target); }
```

- **严重程度**: P1
- **类别**: 性能（违反 compile-once）
- **规则**: P1 hot-path performance
- **现状**: 编译期把 `stopWhen` 收敛成 `CompiledRuntimeValue<boolean>`，但运行时注册 data-source 时又用 `extractExpressionSource` 降回原始 source string。每次 polling 走 `runtime.evaluate(string, scope)`，string 不命中 WeakMap 编译缓存，重新 `compileValue`。
- **风险**: 直接违反 compile once—execute many。轮询频率越高、source 数量越多，额外编译成本越稳定放大。还把运行时从"执行已编译 artifact"退化成"重新解释原始 authoring 文本"。
- **建议**: controller 输入保留 `CompiledRuntimeValue<boolean>`；轮询判断改走 `runtime.evaluateCompiled(...)`；不要在 `source-registry` 用 `extractExpressionSource` 把已编译值降回字符串。

### [维度15-03] formula data-source 的 stop/reset 会把 controller 静默打成不可恢复死态

- **文件**: `packages/flux-runtime/src/async-data/formula-data-source-controller.ts:48-50,101-105,216-275`
- **证据片段**:

```ts
let started = false;
let stopped = false;

start() {
  if (started) return;
  started = true;
  stopped = false;
}

stop() {
  stopped = true;
  updateState((current) => ({ ...current, fetchStatus: 'idle' }));
}

reset() {
  stopped = true;
  updateState(() => initialState);
}
```

- **严重程度**: P1
- **类别**: 安全（fail-closed 违约）
- **规则**: `docs/architecture/security-design-requirements.md` R4
- **现状**: `stop()` 只把 `stopped = true`，不清 `started`；`reset()` 也一样。之后 `start()` 因本地 `started === true` 直接 return；`refresh()` 调 `publish()` 又因 `stopped === true` 直接 return。对外表现为 controller 可继续调用但静默无效。
- **风险**: 违反 live owner doc 已声明的 restartable contract。调用方 `stop/reset` 之后再 `start/refresh` 不报错、无诊断、但也不再工作。formula source 与 action-backed source 在同一接口下出现不同且未声明的生命周期语义。
- **建议**: 对齐 action-backed controller：`stop()`/`reset()` 同时回收本地 `started` 位；增加 stop→start、reset→refresh 回归测试。

## 已驳回 suspect 说明

`pnpm check:audit-performance-suspects` 的 `json-stringify-change-detection` 所有命中经复核后均不保留（诊断 diff/稳定 cache key/局部 equality helper），不在本维度重复报告。

## 维度复核结论

- [维度15-01]: 降级 P1→P2。null-member 在 polling 语境是 transient 条件，继续等待比提前停更安全；不构成"静默授予能力"。建议改为 P2 健壮性。
- [维度15-02]: 保留 P1。经 live code 完整追踪确认：`stopWhen` 被 `extractExpressionSource` 降回字符串，string 不命中 WeakMap 缓存，每次轮询重新编译。其余字段无此问题。
- [维度15-03]: 保留 P1，类别修正为"正确性/契约违反"非"安全"。`stop()`/`reset()` 未重置 `started` flag；API controller 有正确实现可对比；owner docs 有明确 restartable contract。

## 最终保留项

| 编号  | 严重程度 | 文件                                          | 摘要                                                  |
| ----- | -------- | --------------------------------------------- | ----------------------------------------------------- |
| 15-01 | P2       | `api-data-source-controller-state.ts:127-154` | stopWhen null-member 静默继续 polling                 |
| 15-02 | P1       | `source-compiler.ts`/`source-registry.ts`     | stopWhen 已编译表达式被降回字符串，轮询热路径重新编译 |
| 15-03 | P1       | `formula-data-source-controller.ts:48-50`     | stop/reset 不清 started flag，controller 静默不可恢复 |
