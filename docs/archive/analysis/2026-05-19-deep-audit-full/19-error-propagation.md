# 维度 19: 错误传播保真度

## 第 1 轮（初审）

### [维度19-01] request timeout/retry 可能复用 stale active promise/control

- **文件**: `packages/flux-runtime/src/runtime-action-helpers.ts:101-119`; `packages/flux-runtime/src/async-data/request-runtime.ts`
- **证据片段**:
  ```ts
  const response = await executeApiSchema(
    api,
    ctx.scope,
    helpers.getEnv(),
    helpers.expressionCompiler,
    {
      signal,
      evaluate: helpers.evaluate,
      executor: (adaptedApi) =>
        helpers.executeApiRequest('ajax', adaptedApi, ctx.scope, ctx.form, {
          signal,
          interactionId: ctx.interactionId,
          control: requestControl,
        }),
  ```
- **严重程度**: P2
- **类别**: 状态泄漏 / retry 语义失真
- **影响**: timeout+retry 下新 attempt 可能在 `dedup: ignore-new` 时命中旧 active promise，重试复用已超时/已 abort 的 in-flight work。
- **修复建议**: 裁定 timeout/retry owner 层级；retry attempt 不应在 timeout 后复用 stale active promise/control，或 dedup key 应区分 attempt。
- **为什么值得现在做**: request/action retry 是核心错误恢复语义，诊断声称 retry 但实际复用旧请求会误导。
- **误报排除**: 子项复核确认风险成立但从 P1 降为 P2；取决于 dedup 模式与 fetcher abort 响应。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 子项复核通过

### [维度19-02] flow-designer node lifecycle hook 异常字符串化

- **文件**: `packages/flow-designer-core/src/core-node-commands.ts:42-54`
- **证据片段**:
  ```ts
  try {
    const result = ctx.normalizedConfig.hooks.beforeCreateNode({ type, position, data });
    if (result === false) {
      return null;
    }
    type = result.type;
    position = result.position;
    data = result.data;
  } catch (err) {
    ctx.emit({ type: 'lifecycleHookError', hook: 'beforeCreateNode', error: String(err) });
    return null;
  }
  ```
- **严重程度**: P2
- **类别**: 错误替换
- **影响**: host hook throw 的 stack/cause/custom fields 被压成 string，调用方只能看到节点没创建。
- **修复建议**: 事件携带 error envelope：message + original/cause + hook + command input summary。
- **为什么值得现在做**: flow-designer hook 是 host/plugin 边界，错误诊断是主要集成体验。
- **误报排除**: 不是 `false` 业务拒绝路径，而是 exception catch。
- **参考文档**: `docs/architecture/flow-designer/design.md`
- **复核状态**: 维度复核通过

### [维度19-03] flow-designer edge lifecycle hook 异常同样字符串化

- **文件**: `packages/flow-designer-core/src/core-edge-commands.ts:70-89`
- **证据片段**:
  ```ts
  try {
    const result = ctx.normalizedConfig.hooks.beforeConnect({
      source,
      target,
      sourcePort,
      targetPort,
      data,
    });
    if (result === false) {
      return null;
    }
  } catch (err) {
    ctx.emit({ type: 'lifecycleHookError', hook: 'beforeConnect', error: String(err) });
    return null;
  }
  ```
- **严重程度**: P2
- **类别**: 错误替换
- **影响**: beforeConnect/beforeDelete 等 edge hook failure 丢失原始 error 和 command context。
- **修复建议**: 与 node hook 统一结构化 lifecycleHookError。
- **为什么值得现在做**: edge connect 是独立主操作路径，不能只修 node。
- **误报排除**: 独立用户操作路径，不是 node hook 的重复行号。
- **参考文档**: `docs/architecture/flow-designer/design.md`
- **复核状态**: 维度复核通过

### [维度19-04] `compileValueNode` 编译异常降级为静态字符串

- **文件**: `packages/flux-formula/src/compile/compile-node.ts:60-87`
- **证据片段**:
  ```ts
  try {
    const compiled = formulaCompiler.compileExpression<T>(input, options);
    const isStaticVal = hasStaticValue(compiled);
    if (isStaticVal) {
      return {
        kind: 'static-node',
        value: applyTransform(compiled.staticValue, options),
      } as StaticValueNode<T>;
    }
  } catch (error) {
    options?.reportDiagnostic?.({
      code: 'unhandled-compilation-error',
      message: `Expression compilation failed: ${String(error)}`,
  ```
- **严重程度**: P2
- **类别**: 错误替换 / 诊断丢失
- **影响**: 表达式编译失败后可能以 static-node 原始字符串继续渲染，错误路径变成正常值路径。
- **修复建议**: 在 strict/diagnostics 路径返回 invalid node 或抛带 cause 的错误；宽松 fallback 也携带 failure metadata。
- **为什么值得现在做**: expression/template 是 compiler-runtime 核心错误边界。
- **误报排除**: 不是宽容策略风格争议；当前 `String(error)` 扁平化且返回正常 node。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 维度复核通过

### [维度19-05] union value-shape 校验丢弃所有分支失败原因

- **文件**: `packages/flux-compiler/src/schema-compiler/flux-value-shape-validation.ts:221-234`
- **证据片段**:

  ```ts
  case 'union': {
    for (const variant of shape.anyOf) {
      const silentDiagnostics = createSilentDiagnosticsContext();
      if (validateFluxValueShape(value, variant, path, silentDiagnostics, issue)) {
        return true;
      }
    }

    diagnostics.emit({
      code: issue.code,
      path,
      message: `${issue.messagePrefix ?? 'Value does not match any allowed option.'} Expected ${summarizeExpectedFluxValueShape(shape)} but received ${summarizeActualSchemaValue(value)}.`,
  ```

- **严重程度**: P2
- **类别**: 诊断禁用 / 错误替换
- **影响**: complex union failure 只报 generic mismatch，作者无法知道哪个 branch 缺字段或类型不匹配。
- **修复建议**: silent probe 可以保留，但最终 diagnostic 应附分支失败摘要或最接近分支 issues。
- **为什么值得现在做**: host capability args / renderer prop contract diagnostics 是阻断错误进入 runtime 的第一道防线。
- **误报排除**: silent probe 合理，问题是最终完全丢弃分支原因。
- **参考文档**: `docs/architecture/capability-contract-model.md`
- **复核状态**: 维度复核通过

## 深挖第 2 轮追加

### [维度19-06] flow-designer host action result 把字符串错误重建为新 Error

- **文件**: `packages/flow-designer-renderers/src/designer-context.ts:108-114`
- **证据片段**:
  ```ts
  export function toActionResult(
    result: import('./designer-command-adapter.js').DesignerCommandResult,
  ) {
    return {
      ok: result.ok,
      data: result.exported ?? result.data,
      error: result.error ? new Error(result.error) : undefined,
    };
  }
  ```
- **严重程度**: P2
- **类别**: 错误替换
- **影响**: designer command failure 进入 ActionResult 后只剩 wrapper-created Error，丢失 reason/command context/original cause。
- **修复建议**: DesignerCommandResult 使用 structured error，或 Error 带 `{ cause: result }` 和 details。
- **为什么值得现在做**: flow-designer `designer:*` action 是 domain host 主路径。
- **误报排除**: 跨包 command result 到 public ActionResult 边界，不是内部 string formatting。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 维度复核通过

### [维度19-07] async governance debug summary 只保留 name/message

- **文件**: `packages/flux-runtime/src/async-data/async-governance.ts:9-24`
- **证据片段**:

  ```ts
  function summarizeError(error: unknown): AsyncErrorSummary | undefined {
    if (!error) {
      return undefined;
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
      };
    }
  ```

- **严重程度**: P3
- **类别**: 诊断上下文丢失
- **影响**: async owner debug recent runs 不保留 stack/cause，只能看到扁平 message。
- **修复建议**: dev/debug snapshot 中保留 bounded stack/cause chain。
- **为什么值得现在做**: 一次提升 source/reaction/validation 多条 async diagnostics。
- **误报排除**: 复核降为 P3；主错误通道仍可能报告完整 error。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 已降级

## 维度复核结论

- [维度19-01]: 保留但降级为 P2。timeout+retry 在 dedup ignore-new 下可能复用 stale active promise。
- [维度19-02]: 保留 (P2)。node lifecycle hook error 字符串化。
- [维度19-03]: 保留 (P2)。edge lifecycle hook error 字符串化。
- [维度19-04]: 保留 (P2)。compile error fallback static string。
- [维度19-05]: 保留 (P2)。union branch diagnostics 丢失。
- [维度19-06]: 保留 (P2)。flow-designer host action error 重建。
- [维度19-07]: 降级为 P3。debug summary 保真度问题。

## 子项复核结论

- [维度19-01]: 成立但降级为 P2。风险依赖 dedup 模式和 fetcher abort 响应。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                | 一句话摘要                                          |
| ----- | -------- | ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| 19-01 | P2       | `packages/flux-runtime/src/runtime-action-helpers.ts:101-119`                       | request timeout+retry 可能复用 stale active promise |
| 19-02 | P2       | `packages/flow-designer-core/src/core-node-commands.ts:42-54`                       | flow-designer node hook 异常字符串化                |
| 19-03 | P2       | `packages/flow-designer-core/src/core-edge-commands.ts:70-89`                       | flow-designer edge hook 异常字符串化                |
| 19-04 | P2       | `packages/flux-formula/src/compile/compile-node.ts:60-87`                           | expression compile error 降级为 static string       |
| 19-05 | P2       | `packages/flux-compiler/src/schema-compiler/flux-value-shape-validation.ts:221-234` | union value-shape diagnostic 丢弃 branch 失败原因   |
| 19-06 | P2       | `packages/flow-designer-renderers/src/designer-context.ts:108-114`                  | flow-designer host action error 被重建为新 Error    |
| 19-07 | P3       | `packages/flux-runtime/src/async-data/async-governance.ts:9-24`                     | async governance debug error summary 丢 stack/cause |
