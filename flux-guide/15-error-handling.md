# 错误处理

> Flux 错误处理分三层：**编译期**（schema diagnostics）、**运行时 action 错误**（链式恢复 + notify + 宿主回调）、**React 渲染错误**（节点级 + 根级 Error Boundary）。失败后默认行为已较完备，宿主主要通过 `onActionError` prop、`plugins[].onError`、`env.monitor.onError` 与 schema 内 `onError` / `onSettled` / `messages` 等点接入。

---

## 三层总览

| 层                | 触发场景                                          | 默认行为                                                                    | 主要接入点                                                                                 |
| ----------------- | ------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **编译期**        | schema 编译产生 error 级 diagnostic               | 收集到 runtime；测试/E2E 自动 throw；生产仅记录                             | `strictValidation` prop + `__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__` 开关                       |
| **运行时 action** | action runner throw / HTTP 业务失败 / 子链 throw  | 单次 `env.notify('error', msg)`；调 `onActionError` + 每个 `plugin.onError` | `<SchemaRenderer onActionError>` / `plugins` / schema `onError` / `onSettled` / `messages` |
| **React 渲染**    | 节点 render throw（含 when/visible 表达式 throw） | 节点级 fallback Alert；未捕获则根级 fallback                                | 自动 `NodeErrorBoundary` + `SchemaRootErrorBoundary`                                       |

---

## React Error Boundary（自动）

flux 内置两个 boundary，**无需宿主配置**：

### `NodeErrorBoundary`（节点级）

- 实现：`packages/flux-react/src/node-error-boundary.tsx:129-181`
- 包裹**每个节点**（`packages/flux-react/src/node-renderer.tsx:231`）
- 同时包裹 dialog/drawer body（`packages/flux-react/src/dialog-host.tsx:127` 的 `SurfaceBodyBoundary`）
- Fallback：红色 Alert 显示 `nodeId: <message>` + retry 按钮（重置自身 state）

### `SchemaRootErrorBoundary`（根级）

- 实现：`packages/flux-react/src/node-error-boundary.tsx:89-127`
- 包裹整棵编译后的 schema 树（`packages/flux-react/src/schema-renderer.tsx:427,442`）
- Fallback：红色 Alert 显示 `Schema render failed: <msg>` + retry 按钮（通过 `attemptKey++` 强制 remount 子树）

### 创建期错误（非 boundary）

- runtime/page/surface 创建失败 → 存入 `creationErrorRef`（`schema-renderer.tsx:135-189`）→ 渲染 `<SchemaRootError>`（`:413-415`）
- schema import 预加载失败 → 存入 `prepareError`（`:403`）→ 渲染 `<SchemaRootError>`（`:417-419`）+ 走 `reportImportFailure`（`flux-core/src/utils/import-failure.ts:15-41`）调 `env.notify('error')` + `env.monitor.onError({ phase: 'compile' })`

> flux **不存在** `FluxErrorBoundary` / `RendererErrorBoundary` / `GlobalErrorBoundary` 命名导出。markdown-editor 渲染器内有私有 `PreviewBoundary`（`flux-renderers-form/src/renderers/markdown-editor-renderer.tsx:112-138`），不通用。

### 已知行为

- boundary 仅 `console.error`，**不**调 `env.monitor.onError({ phase: 'render' })`（flux-guide 在此记录此限制）
- 表达式 `${when}` / `${visible}` / `${hidden}` 求值 throw 会冒泡到 React render，**被 `NodeErrorBoundary` 捕获**（不是吞掉）

---

## Action 错误：默认行为

### 触发链路

```
event → runtime.dispatch(action-execution.ts:515 dispatch)
  └─ for each action:
       └─ runSingleAction (action-execution.ts:268 函数定义；catch 块在 :367)
            ├─ try { runner(...) }
            │     ├─ AbortError → cancelled result（不 notify，不上报）
            │     └─ runner throw → catch (:367)
            │           ├─ reportActionError (line 140-163)
            │           │     ├─ ctx.onActionError?.(err, ctx)   ← 独立 try/catch
            │           │     └─ for each plugin: plugin.onError?. ← 独立 try/catch
            │           └─ result = { ok:false, error }
            ├─ onError 分支（失败时）
            ├─ onSettled 分支（成功或失败都执行）
            ├─ reportUnhandledFailureClass (line 182-222)
            │     └─ 未处理 + 非合成事件 → env.notify('error', msg)  ← 单次
            └─ !continueOnError && failure → return（链终止）
```

### HTTP 业务失败的特别处理

`status !== 0` 的 `ApiResponse`：

- 在 `request-runtime.ts:478` throw `createApiResponseError`
- 被 `runtime-action-helpers.ts:265-280` 的 `isHttpResponseFailure` 命中后转 `{ ok:false, error }`，**不 re-throw**
- 由顶层 dispatcher 经 `reportUnhandledFailureClass` 调用 `env.notify('error', msg)` **正好一次**

错误消息优先级（`createApiResponseError`，`request-runtime.ts:80-118`）：

1. `response.msg`（top-level ApiResponse 字段）
2. `response.data.message` → `response.data.msg`
3. 兜底 `Request failed (status=X, code=Y)`

基础设施错误（网络断、adaptor 编译失败等非 HTTP-failure）：**不命中** `isHttpResponseFailure` → re-throw → 顶层 `runSingleAction` catch → `reportActionError`。

### Form submit loading 总是重置

`executeFormSubmit` 的 `finally` 块（`form-runtime-submit-flow.ts:393-402`）无论成功/失败/cancelled 都调 `setIsSubmitting(false)` + `store.setSubmitting(false)`。

### Data source 失败状态

`toErrorDataSourceState`（`api-data-source-controller-helpers.ts:24-36`）：`fetchStatus` 回 `idle`，整体 `status` 视是否已有数据决定（有数据保持 `success` 标 stale，无数据变 `error`）。

---

## Action 链错误处理（schema 层）

| 字段                      | 作用                                                                                           | 默认              |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ----------------- |
| `onError`                 | 当前 action `isFailureClass(result)` 时递归 dispatch；子链内 `${error.message}` 可用           | 失败终止链        |
| `onSettled`               | 成功或失败都执行（除非 skipped/neutral）；子链 throw 不再 notify，仅挂 `settledError` 到主结果 | 不执行            |
| `continueOnError`         | 失败时是否继续下一个 action                                                                    | `false`（链终止） |
| `messages.success/failed` | 自动 toast，**与 then/onError 并行独立**                                                       | 不显示            |
| `confirmText`             | 执行前二次确认文案                                                                             | 直接执行          |

```jsonc
{
  "action": "ajax",
  "args": { "url": "/api/save", "method": "post" },
  "messages": { "success": "保存成功", "failed": "保存失败" },
  "onError": {
    "action": "showToast",
    "args": { "level": "error", "message": "${error.message}" },
  },
  "onSettled": { "action": "closeSurface" },
}
```

> 子链自身 throw 不再 `env.notify`（与 `onError` 子链对称），仅 `reportActionError` 上报。依赖宿主 `monitor` 捕获。

### `failureHandled` 去重

`runFailureLifecycleHandler`（`form-runtime-submit-flow.ts:102-133`）：`onSubmitError` / `onValidateError` 处理过的失败结果会被标记 `failureHandled`，避免后续重复 notify。

---

## 编译期 diagnostics

### strict 模式判定（`packages/flux-core/src/strict-mode.ts:60-76`）

按优先级查找：

1. `<SchemaRenderer strictValidation={...}>` 显式 prop
2. `globalThis.__FLUX_STRICT_VALIDATION__`
3. `process.env.__FLUX_STRICT_VALIDATION__`
4. `window.localStorage.__FLUX_STRICT_VALIDATION__`
5. URL param `?strictValidation=true`
6. `import.meta.env.DEV === true`
7. 默认 `false`

### strict 效果

- **未知属性升级为 error**：`packages/flux-compiler/src/schema-compiler/shape-validation-node-fields.ts:282-311`（封闭 prop 模型始终 error；非封闭 + strict 把 warning 升 error）
- **action selector 校验升级**：`schema-compiler/action-selector-validation.ts:165,224,237`
- **不自动 throw**，只把 severity 升级

### 让 diagnostic 真正 throw

`__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__`（`packages/flux-core/src/strict-mode.ts:78-94`）为 true 时，`schema-compiler.ts:57-75` 的 `throwIfSchemaDiagnosticsFailed` 收集 error 级 diagnostic 并抛 `Error('Schema compile diagnostics failed: ...')`。判定 true 的条件：

- `process.env.__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__ === 'true'`
- `globalThis.__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__ === true`
- `process.env.VITEST === 'true'`
- `process.env.PLAYWRIGHT === 'true'`

> **重要限制**：通过 `<SchemaRenderer>` 走的编译路径在 strict 模式下强制传 `continueOnError: true`（`schema-renderer.tsx:67`），而 `throwIfSchemaDiagnosticsFailed`（`schema-compiler.ts:58`）的 return 条件是 `!diagnostics.enabled || diagnostics.continueOnError || !shouldFailOnSchemaDiagnostics()` —— `continueOnError` 命中第二个条件即 return。即使打开此开关，**SchemaRenderer 路径下也不会 throw**。该开关主要在显式不走 SchemaRenderer 的编译入口或测试场景生效。

运行时 API：`setStrictValidationGlobal(enabled)` / `setFailOnSchemaDiagnosticsGlobal(enabled)`（`strict-mode.ts:96-110`）。Debugger controller 当前只接入了前者（`packages/nop-debugger/src/controller.ts:442` 的 `setStrictMode` 调 `setStrictValidationGlobal`），后者未接入。

---

## 表单校验错误

`ValidationError`（`packages/flux-core/src/types/validation.ts:28-47`）：

```ts
interface ValidationError {
  path: string;
  message: string;
  rule: ValidationRule['kind'];
  ruleId?: string;
  ownerPath?: string;
  cause?: unknown;
  sourceKind?: 'field' | 'object' | 'array' | 'row' | 'scope-root' | 'external' | ...;
  relatedPaths?: string[];
}
```

UI 显示路径：

1. **存储**：form store `fieldStates[path].errors: ValidationError[]`
2. **selector**：`useCurrentFormErrors` / `useCurrentFormError(path)` / `useFieldError(path)` / `useOwnedFieldState`
3. **显示判定**：`shouldShowFieldError(behavior, { touched, dirty, visited, submitting, submitAttempted })`（定义在 `packages/flux-react/src/field-error-visibility.ts:15-42`；调用方见 `flux-renderers-form/src/field-utils/field-presentation.tsx:110` 与 `field-reading.tsx:63`）
4. **渲染**：`FieldError`（`flux-renderers-form/src/renderers/shared/error.tsx:3-13`）—— `<span data-slot="field-error" role="alert" aria-live="assertive">`
5. **显示时机**：`showErrorOn` 控制（`touched` / `dirty` / `visited` / `submit`，默认 `['touched', 'submit']`）

所有 input 渲染器自动设 `aria-invalid` / `aria-describedby` / `aria-errormessage`。

### 外部（服务端字段）错误

`ApiResponse.errors: Record<string, string>` 由 form owner 通过 `applyExternalErrors` 注入（`flux-core/src/types/validation.ts:128-132`，`flux-runtime/src/form-runtime-owner-external-errors.ts`）。

---

## 默认行为 vs 可定制项

### Flux 默认提供

- 节点级 + 根级 React Error Boundary（单节点失败不影响整页）
- action 失败的统一 catch + `reportActionError`（调宿主回调 + 每个 plugin）
- HTTP 业务失败自动 `env.notify('error', msg)` **正好一次**
- Form submit 后总是重置 `isSubmitting`；data source 失败后 `fetchStatus` 总是回 `idle`
- 校验错误的 store/selector + `showErrorOn` 判定 + `FieldError` ARIA-friendly fallback
- 编译期 schema diagnostics 收集（strict 模式可升级 severity）

### 宿主 / Schema 作者可定制

| 定制点                      | 途径                                                                   | 默认                                  |
| --------------------------- | ---------------------------------------------------------------------- | ------------------------------------- |
| 全局动作错误监控            | `<SchemaRenderer onActionError={(err, ctx) => ...}>`                   | undefined（不调用）                   |
| 错误监控插件                | `<SchemaRenderer plugins={[{ onError }]}>`                             | 空数组                                |
| Toast UI                    | `env.notify(level, message)` 实现                                      | **必填**，宿主自带                    |
| Monitor 钩子                | `env.monitor.onActionStart/End/onError/onApiRequest/onRenderStart/End` | undefined                             |
| Schema 内 action 错误恢复   | `onError` / `onSettled` / `continueOnError: true`                      | 失败即链终止                          |
| 自动 toast 文案             | `messages: { success, failed }`                                        | 不显示                                |
| responseAdaptor 错误兜底    | runtime 自动 `console.warn` + `monitor.onError({phase:'api'})`         | 透明                                  |
| 字段错误显示时机            | `showErrorOn`（`touched` / `dirty` / `visited` / `submit`）            | `['touched', 'submit']`               |
| 校验失败 / 提交失败 handler | form 的 `onValidateError` / `onSubmitError`                            | 走默认 notify                         |
| strictValidation            | prop / globalThis / localStorage / URL param / DEV                     | DEV 模式 true，prod false             |
| fail-on-diagnostics         | `globalThis.__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__ = true`                | 测试/Playwright 自动 true，prod false |
| Debugger 一键开 strict      | `nop-debugger` controller `setStrictMode(true)`                        | 用户操作                              |

---

## 已知缺口

1. **`__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__` 在 SchemaRenderer strict 路径下事实上无效**（见上文编译期段）。如需让 schema error 真正 throw 阻断渲染，需要绕过 SchemaRenderer 自行编译，或修复此 continueOnError 强制覆盖。
2. **`onActionError` 自失败无回退遥测**：`reportActionError`（`action-execution.ts:145-149`）对 `onActionError` throw 是空 catch，无 console.error、无 monitor。
3. **`onSettled` 子链 throw 不 notify**：仅 `reportActionError`，终端用户完全静默。
4. **SchemaRenderer 不把渲染期 throw 上报 `env.monitor.onError`**：boundary 仅 `console.error`，未调 `monitor.onError({ phase: 'render' })`。
5. **`reportUnhandledFailureClass` 的合成事件名单硬编码**：仅识别 `actionError` / `actionSettled` / `actionSettledError`（`action-execution.ts:188-195`），未来新增合成分支事件需同步更新。
