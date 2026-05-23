# 开放式对抗性审查 — 2026-05-06 — 第一轮

> 审查方式：按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 先读 `AGENTS.md`、`docs/index.md`，快速扫描 `docs/analysis/2026-05-05-open-ended-adversarial-review-01/` 七轮结果及此前多轮对抗审查的去重背景。
> 本轮切入点：从未被充分审计的子系统（compiler pipeline、flux-react 渲染层、action dispatch 控制流、runtime scope/store 生命周期、跨包类型契约）切入，跳过此前已覆盖的 canonical 收敛、i18n、可访问性、公式沙箱逃逸等方向。

---

## 发现 1：`globalCascadeDepth` 溢出后变负数 — 级联深度保护失效

**在哪里**

- `packages/flux-runtime/src/async-data/reaction-runtime.ts:128-141`（increment + 重置）
- 同文件 `:272`（finally decrement）

**是什么**

当 reaction 级联深度超限时，代码将 `globalCascadeDepth` 重置为 0 后 `return`，进入 `finally` 块执行 `globalCascadeDepth -= 1`，结果为 **-1**。每次溢出后阈值偏移 +1，保护机制逐步失效。

```ts
// 第 129 行
globalCascadeDepth += 1;
if (globalCascadeDepth > MAX_GLOBAL_CASCADE_DEPTH) {
  globalCascadeDepth = 0;   // 重置为 0
  // ...
  return;                   // 跳到 finally
}
// ...
// 第 272 行 - finally 块
} finally {
  globalCascadeDepth -= 1;  // 0 - 1 = -1
}
```

**为什么值得关心**

恶意或错误的 schema 可以构造 reaction 链使保护首次触发后失效，此后级联深度保护形同虚设。这是一种可以无限循环的 reaction 链逃逸漏洞。

**信心水平**：确定

---

## 发现 2：数据源级联深度计数器对异步场景完全无效

**在哪里**

- `packages/flux-runtime/src/async-data/source-registry.ts:196-210`

**是什么**

`sourceCascadeDepth` 在 `controller.refresh()` 调用前递增，但 `refresh()` 是异步的（返回 Promise），代码用 `.catch()` 即忘模式处理。`finally` 在 Promise 链建立后**同步**执行递减。当异步 `refresh()` 完成并触发下游订阅时，`sourceCascadeDepth` 早已回到原值。

```ts
sourceCascadeDepth += 1;
if (sourceCascadeDepth > MAX_SOURCE_CASCADE_DEPTH) {
  sourceCascadeDepth = 0;
  return;
}
try {
  controller.refresh().catch((error) => {
    /* 火后即忘 */
  });
} finally {
  sourceCascadeDepth -= 1; // refresh 还没完成就已经递减
}
```

**为什么值得关心**

与 `reaction-runtime.ts` 中包裹完整异步操作的 `globalCascadeDepth` 形成对比。数据源的异步级联完全不受保护。在复杂应用中，数据源 A → 数据源 B → 数据源 C 的无限循环不会被阻止。

**信心水平**：确定

---

## 发现 3：`useMemo` 用于 CID 分配副作用 — React 19 Strict Mode 下会泄漏

**在哪里**

- `packages/flux-react/src/node-renderer.tsx:46-48`

**是什么**

```ts
function useMountedCid(runtime: RendererRuntime) {
  return useMemo(() => runtime.allocateMountedCid(), [runtime]);
}
```

`allocateMountedCid()` 是有副作用的操作（分配递增 ID），但 `useMemo` 不保证只调用一次。React 19 Strict Mode 开发环境下可能多次调用工厂函数，导致 CID 序列中出现空洞和注册表幽灵条目。正确做法是 `useState(() => runtime.allocateMountedCid())`，惰性初始化器保证每个实例只调用一次。

**为什么值得关心**

每个节点的 CID 是注册表查找的关键。幽灵 CID 会导致注册表中的残留条目不会被清理，在调试和开发时产生困惑。

**信心水平**：确定

---

## 发现 4：`withRetryMetadata` 修改原始 error 对象并创建循环引用

**在哪里**

- `packages/flux-action-core/src/operation-control.ts:17-26`（Object.assign 修改原始对象）
- 同文件 `:194-198`（`lastFailureReason: error` 指向自身）

**是什么**

```ts
function withRetryMetadata(error: unknown, metadata: {...}): unknown {
  if (error && typeof error === 'object') {
    return Object.assign(error as Record<string, unknown>, metadata);  // 直接修改原始 error
  }
  // ...
}

// 调用处
throw withRetryMetadata(error, {
  attempts,
  failureCount,
  lastFailureReason: error,  // error 指向自身 → 循环引用
});
```

`Object.assign` 修改了原始 error 对象。同时 `lastFailureReason: error` 形成自引用循环。JSON 序列化会抛异常，监控系统序列化 error 时会崩溃。

**为什么值得关心**

任何尝试 `JSON.stringify` 该 error 的监控系统或日志系统都会崩溃。原始 error 被修改是 side-effect，可能影响其他错误处理逻辑。

**信心水平**：确定

---

## 发现 5：`ActionResult.error` 声明为 `unknown`，存在四种互斥的隐式消费协议

**在哪里**

- 类型定义：`packages/flux-core/src/types/actions.ts:159` — `error?: unknown`
- 协议 A（带重试元数据对象）：`packages/flux-action-core/src/action-dispatcher/action-execution.ts:228-230`
- 协议 B（Error 实例或原始值）：`packages/flux-runtime/src/async-data/data-source-state.ts:27`
- 协议 C（`{ message: string }` 对象）：`packages/flux-core/src/types/runtime.ts:161`
- 协议 D（Error 实例）：`packages/flux-core/src/utils/runtime-host-reporting.ts:20-22`

**是什么**

四个包对 `ActionResult.error` 的消费方式互不兼容：

```ts
// 协议 A: 假设 error 是 { attempts?: number, failureCount?: number }
const errorWithRetry = result.error as { attempts?: unknown; failureCount?: unknown };

// 协议 B: 假设 error 是 Error | string
state.error instanceof Error ? state.error.message : String(state.error);

// 协议 C: 假设 error 是 { message: string }
error?.message;

// 协议 D: 假设 error 是 Error
input.error instanceof Error ? input.error.message : String(input.error);
```

当协议 A 设置 `error = { attempts: 3 }`（无 `message`），协议 B 用 `instanceof Error` 检查后走 `String(error)` 得到 `"[object Object]"`。

**为什么值得关心**

error 是用户可感知的核心反馈通道。不同包对 error 的处理不一致，导致错误消息丢失、显示为 `[object Object]`、或监控系统崩溃。这不是偶发的 UI 小问题，是整个 action 错误传播链路的系统性失真。

**信心水平**：确定

---

## 发现 6：`onError` 分支恢复后链路仍然中断 — `continueOnError` 与 `onError` 语义冲突

**在哪里**

- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:295-410`

**是什么**

```ts
// 简化后的流程
const result = await runActionWithDebounce(...);
const resultClass = classifyActionResult(result);  // 基于原始 result
previous = result;

if (resultClass === 'success' && normalizedAction.then) {
  previous = await dispatch(ctx, { nodes: normalizedAction.then }, ...);
} else if (resultClass === 'failure' && normalizedAction.onError) {
  previous = await dispatch(ctx, { nodes: normalizedAction.onError }, ...);
}

// 关键：即使 onError 成功恢复，这里仍然检查 resultClass（基于原始失败结果）
if (resultClass === 'failure' && !normalizedAction.control?.continueOnError) {
  return result;  // 返回原始失败结果，忽略 onError 的恢复
}
```

当 action 失败、有 `onError` 恢复分支、且没有 `continueOnError` 时，即使 `onError` 成功恢复，链路仍然在 `return result` 处中断，返回原始失败结果。

**为什么值得关心**

如果用户期望 `onError` 可以作为降级策略恢复链路继续执行后续 actions，当前行为会静默违反这个期望。`onError` 的实际语义是"错误处理通知"而非"错误恢复"——但没有任何文档明确声明这一点。

**信心水平**：很可能（测试 `action-dispatcher-control-flow.test.ts:140-177` 验证了此行为，但行为本身与直觉不符）

---

## 发现 7：Compiler 编译管线三处递归无深度保护 — 栈溢出风险

**在哪里**

1. `packages/flux-compiler/src/schema-compiler/symbol-helpers.ts:49-79` — `collectSchemaImportSpecs` 的 `visit()` 遍历所有子值，无深度限制
2. `packages/flux-compiler/src/schema-compiler/shape-validation.ts:315-438` — `analyzeSchemaInput` 对 region/value-or-region 深度递归，无深度限制
3. `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts:110-202` — `validateActionShape` 对 then/onError/parallel 链递归，无深度限制

**是什么**

编译管线中 `compileSchemaToTemplateNodes` 有 `MAX_COMPILE_DEPTH=64` 保护，`canonicalizeSchemaInput` 有 `maxDepth` 保护，但以上三个函数在编译管线的不同阶段被调用时**完全不受深度约束**。

特别危险的是 `analyzeSchemaInput`：它在 `validateSchemaInput` 中被调用于 `compileSchemaToTemplateNodes` 的 catch 块之后（`schema-compiler.ts:543-572`），即使编译阶段正确抛出了深度溢出异常，验证阶段的 `analyzeSchemaInput` 仍然会无保护地递归。

**为什么值得关心**

一个精心构造的（或意外产生的）深层嵌套 schema 可以绕过编译阶段保护，在验证阶段触发栈溢出。

**信心水平**：确定

---

## 发现 8：`useNodeSourceProps` 首次渲染返回空对象 — 有 source 的节点第一帧 props 为 `{}`

**在哪里**

- `packages/flux-react/src/use-node-source-props.ts:39-60`
- `packages/flux-react/src/node-source-prop-controller.ts:60-63`

**是什么**

Controller 的初始快照是 `{ sourceInputs: [], value: {} }`。`controller.run()` 在 `useEffect`（第 45 行）中才被调用。对于有 `source` 属性的节点，首次渲染时 `snapshot.value` 是 `{}`，renderer 收到空 props，直到 effect 触发 `controller.run()` 后才得到正确值。

**为什么值得关心**

有 `source` 的节点在首次渲染时可能因缺少必需 props 导致子组件异常（undefined 访问）。这会产生一次无意义的初始渲染 + 一次强制重渲染。

**信心水平**：确定

---

## 发现 9：`RendererRuntime` 是 God Object（30+ 方法、6+ 职责域）— 测试中被 141 处 `as any` 绕过

**在哪里**

- 定义：`packages/flux-core/src/types/renderer-core.ts:261-385`
- 测试 mock：`packages/flux-runtime/src/__tests__/` 中 141 处 `as any`、38 处 `as unknown as`

**是什么**

`RendererRuntime` 混合了编译、求值、节点解析、scope 管理、导入系统、数据源/响应式、表单/页面/表面创建、action 调度、调试、生命周期等职责。直接后果：测试中需要为只需要 1-2 个方法的测试创建完整的 mock 对象，大量使用 `as any` 类型断言。

`flux-action-core` 的 `ActionContext.runtime` 也是完整的 `RendererRuntime`，但 dispatch 系统实际只用到其中 5-6 个方法。

**为什么值得关心**

这不是纯美学问题。God Object 导致：

1. 任何方法变更影响所有消费者和测试
2. 新增功能时不知道该加在哪个接口上
3. 测试 mock 的泛滥掩盖了真正的类型错误

**信心水平**：确定

---

## 发现 10：`RendererResolvedProps<S>` 等价于 `Record<string, any>` — renderer props 层完全无类型安全

**在哪里**

- `packages/flux-core/src/types/renderer-core.ts:101-102`

```ts
export type RendererResolvedProps<S extends BaseSchema = BaseSchema> = Record<string, any> &
  Partial<S>;
```

**是什么**

`Record<string, any>` 的 `any` 吞噬了 `Partial<S>` 的所有约束。`props.props.anyRandomKey` 永远不会产生编译错误。即使 renderer 定义了 `propContracts`，也没有编译时强制力。

**为什么值得关心**

整个 renderer props 读取层的类型安全网是空的。InputRenderer 读取 `props.props.placeholder` 时，TypeScript 不会验证这个字段是否在 renderer 定义中声明过、类型是否正确。拼写错误和类型不匹配会在运行时静默产生 `undefined`。

**信心水平**：确定

---

## 发现 11：`compiled.action` 的 `parallel` 字段缺少 `Array.isArray` 防御 — 其他分支都有

**在哪里**

- `packages/flux-compiler/src/action-compiler.ts:107-111`

**是什么**

```ts
// then/onError/onSettled 都有防御
const thenActions = Array.isArray(action.then) ? action.then : [action.then];

// 但 parallel 直接 .map()，假设一定是数组
if (action.parallel !== undefined) {
  node.parallel = action.parallel.map((a, i) => ...);
}
```

如果 `parallel` 是单个对象而非数组，会抛 `TypeError: action.parallel.map is not a function`。虽然验证阶段会检查 parallel 必须是数组，但跳过验证或验证未启用时，这个不一致的防御会导致未处理的异常。

**为什么值得关心**

四个控制流分支中三个有防御、一个没有，这种不一致暗示代码是在不同时期写的。未来维护者可能认为"所有分支都有防御"而不会重新检查。

**信心水平**：确定

---

## 发现 12：Runtime `dispose()` 不打破循环引用 — Ref 对象在 dispose 后仍指向已创建实例

**在哪里**

- `packages/flux-runtime/src/runtime-factory.ts:458-500`

**是什么**

`dispose()` 清理了 owned 集合但没有打破循环引用链：

- `sourceRegistryRef.current` 仍持有 `runtime` 引用（通过闭包和输入参数）
- `reactionRegistryRef.current`、`runtimeRef.current`、`actionDispatcherRef.current` 同理

dispose 后这些 Ref 仍指向已创建的对象，如果外部持有 runtime 引用，整个对象图无法被 GC。

**为什么值得关心**

SPA 中路由切换时 runtime 被创建和销毁，如果 dispose 不彻底，会导致内存持续增长。

**信心水平**：很可能

---

---

## 总评

本轮审查聚焦于此前审查未覆盖的子系统。最值得关注的三个方向：

1. **级联深度保护系统性失效**：`globalCascadeDepth` 溢出变负数（发现 1）+ 数据源级联异步无效（发现 2），两个保护机制都有确定性缺陷。reaction 链和数据源链的无限循环保护在实际场景下可以绕过。

2. **Action 错误传播链路的系统性失真**：`ActionResult.error` 四种隐式协议（发现 5）+ `onError` 恢复后链路中断（发现 6）+ `withRetryMetadata` 循环引用（发现 4），从错误产生到错误展示的全链路都存在失真风险。

3. **React 19 兼容性隐患**：`useMemo` 副作用（发现 3）+ `cloneElement` 弃用 + 首帧空 props（发现 8），项目声称使用 React 19，但多处 API 使用方式与 React 19 语义不兼容。

## 盲区自评

本轮审查重点关注了 compiler、react 渲染层、action dispatch、runtime scope/store、跨包类型契约。可能遗漏的方向：

- **Renderer 具体实现层**（`flux-renderers-form`、`flux-renderers-data`、`flux-renderers-basic`）的逐文件审查未深入
- **Spreadsheet/Report Designer/Word Editor** 的业务逻辑层未覆盖
- **并发和时序**方面的深入测试（如多个表单同时提交、快速切换页面等场景）
- **浏览器兼容性和 Web Worker** 环境下的行为
- **打包体积和 tree-shaking** 效果
