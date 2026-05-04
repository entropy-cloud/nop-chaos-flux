# 对抗性审查报告 — 2026-05-04 (第六轮: V1 新人开发者 + V7 契约考古学家)

> 审查方式：按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。

---

## 视角选择

- **V1 新人开发者** — 此前审查从未以 "新人视角" 系统检查命名误导、隐式约定和 magic string。
- **V7 契约考古学家** — 已有报告提及类型安全 "幻觉"，但未系统对比接口签名与实际实现的参数/返回值差异。

---

## V1 发现：命名误导与隐式约定

### 发现 1：`useScopeSelector<S>` 泛型是纯信任转换 (MEDIUM)

**在哪里**

- `packages/flux-react/src/hooks.ts:96-124`

**是什么**

泛型参数 `S` 通过 `as unknown as S` 强转，不提供任何运行时类型检查。新人调用 `useScopeSelector<MyForm>(s => s.name)` 会误以为有编译期安全保障，实际 scope 数据始终是 `Record<string, unknown>`，类型不匹配时静默返回 `undefined`。

**为什么值得关心**

新人在 TypeScript strict mode 下看到泛型参数，自然假设类型安全存在。当 scope data 结构变化时不会有编译报错，bug 只在运行时暴露。

**信心水平**: 确定。

---

### 发现 2：`RendererHookApi` 接口缺少 `options` 参数 (MEDIUM)

**在哪里**

- `packages/flux-core/src/types/renderer-hooks.ts:123-130`（接口定义）
- `packages/flux-react/src/hooks.ts:96-99`（实际实现）

**是什么**

接口声明 `useScopeSelector<T, S>(selector, equalityFn?): T`。实际实现多了 `options?: { enabled?: boolean; fallback?: T }` 参数。新人只看接口文档不知道 `enabled`/`fallback` 的存在，这些是条件订阅的关键参数。

同样的问题存在于 `useCurrentFormError`（接口缺少 `options` 参数）和 `useAggregateError`。

**信心水平**: 确定。

---

### 发现 3：`computeScopeState()` 命名暗示纯函数但有缓存副作用 (LOW)

**在哪里**

- `packages/flux-runtime/src/form/form-runtime-owner.ts:49-94`

**是什么**

函数名 "compute" 暗示无副作用的纯计算，但内部修改 5 个闭包缓存变量。从不同 context 多次调用可能返回缓存的旧值。新人可能假设每次调用都重新计算。

**信心水平**: 确定。

---

### 发现 4：Magic string `'none'` 无枚举定义 (LOW)

**在哪里**

- `packages/flux-runtime/src/form/form-runtime.ts:132`

**是什么**

```ts
inputValue.scopeBinding === 'none';
```

`scopeBinding` 的合法值没有 enum 或 constants 定义。新人必须 grep 整个仓库才能发现所有合法值。

**信心水平**: 确定。

---

### 发现 5：`createActionDispatcher` 名称暗示每次创建新实例但内含 WeakMap 缓存 (LOW)

**在哪里**

- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:408-418`

**是什么**

"create" 前缀在项目中通常意味着创建独立实例。但此函数内部持有 `compiledProgramCache: WeakMap`，使得同一 schema 对象的重复编译被缓存。新人如果每次 render 都 `createActionDispatcher()`，会创建独立缓存，失去性能优势但不会报错 — 静默降级。

**信心水平**: 确定。

---

## V7 发现：接口承诺与实现兑现的差异

### 发现 6：`ValidationScopeRuntime` optional methods 在 `FormRuntime` 中变 required (HIGH)

**在哪里**

- `packages/flux-core/src/types/runtime.ts:313-314`（`touchField?`, `visitField?` 可选）
- `packages/flux-core/src/types/runtime.ts:339-340`（`FormRuntime` 中同名方法无 `?`）

**是什么**

父接口声明这些方法为可选，子接口重新声明为必需。这意味着：

- 接受 `ValidationScopeRuntime` 参数的代码必须用 `owner.touchField?.(path)`
- 接受 `FormRuntime` 参数的代码可以直接 `form.touchField(path)`

但如果一个函数签名接受 `ValidationScopeRuntime`，实际传入的是非 FormRuntime 实现（如 page-level validation owner），调用不会 crash（因为用了 `?.`），但 touch/visit 语义静默丢失。

**为什么值得关心**: 新人实现自定义 ValidationScopeRuntime 时可能不知道这些 "可选" 方法实际上是 form 表现正确的前提。

**信心水平**: 确定。

---

### 发现 7：`ScopeRef.replace` 可选但调用点未必用 optional chaining (MEDIUM)

**在哪里**

- `packages/flux-core/src/types/scope.ts:46`（`replace?: (data) => void`）

**是什么**

接口声明 `replace` 为可选方法。如果任何运行时代码直接调用 `scope.replace(data)` 而非 `scope.replace?.(data)`，在不提供 replace 的 scope 实现上会 throw TypeError。

**信心水平**: 中高 — 需验证所有调用点是否都用了 `?.`。

---

### 发现 8：`getError` 返回 `undefined` vs `getFieldState` 返回空数组 — 双重表示 "无错误" (LOW)

**在哪里**

- `packages/flux-core/src/types/runtime.ts:334`（`getError` → `ValidationError[] | undefined`）
- `packages/flux-runtime/src/form/form-runtime.ts:252`（`getFieldState` → `{ errors: [] }`）

**是什么**

"没有错误" 在项目中有两种表示：`undefined` 和 `[]`。新人必须知道哪个 API 返回哪种，否则 `if (errors)` 和 `if (errors.length)` 的选择可能出错。

**信心水平**: 确定。

---

### 发现 9：`useScopeSelector` 泛型 `S` 无实际类型约束 (MEDIUM)

**在哪里**

- `packages/flux-react/src/hooks.ts:96`

**是什么**

与 V1 发现 1 同源但从契约角度：接口承诺 `<T, S = Record<string, unknown>>` 泛型约束，但实现通过 `as unknown as S` 完全绕过了 TypeScript 类型系统。这使得 `S` 成为 _纯文档用途的泛型_ — 它不会 catch 任何类型错误。

接口签名对调用者的承诺（"你传入的 selector 接收类型为 S 的 scope"）在运行时不成立。

**信心水平**: 确定。

---

## 总评

### 最值得关注的方向

1. **接口-实现参数不对称**（发现 2、6）— `RendererHookApi` 接口遗漏了实际实现支持的关键参数（`options`），ValidationScopeRuntime 的 optional/required 不对称在组合使用时可能导致静默行为丢失。建议同步接口定义。

2. **泛型安全幻觉**（发现 1、9）— 项目在多个核心 hook 中使用 "装饰性泛型"，看似类型安全实则完全运行时。建议要么添加 runtime validation（dev mode assertion），要么在文档/命名中明确这是 unsafe cast。

3. **命名一致性**（发现 3、5）— "compute" = 有缓存副作用，"create" = 有内部缓存。这些违反了函数式编程的命名预期，对新人是隐式陷阱。

### 盲区自评

- 未深入检查所有 `ScopeRef.replace` 的调用点是否用了 optional chaining。
- 未检查 `flux-i18n` 的 key fallback 是否有 "静默返回 key 本身" 导致新人误以为翻译生效的情况。
- 未检查项目中是否有其他 "装饰性泛型" 模式（如 `ActionPayload<T>`）。

**建议下次视角**：V9（无障碍用户）深度检查 + V-new（构建/工具链审计 — 检查 vite/tsconfig 配置是否有隐藏问题）。
