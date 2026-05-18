# 维度 19：错误传播保真度

## 第 1 轮（初审）

### [维度19-01] Flow Designer lifecycle hook 异常在 core 到 renderer 边界被字符串化并重建，原始 cause 或 stack 丢失

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\core-node-commands.ts:42-53`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\core-edge-commands.ts:69-88`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\types.ts:330`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page-inner.tsx:68-73`
- **证据片段**:
  ```ts
  try {
    const result = ctx.normalizedConfig.hooks.beforeCreateNode({ type, position, data });
    if (result === false) {
      return null;
    }
    type = result.type;
  } catch (err) {
    ctx.emit({ type: 'lifecycleHookError', hook: 'beforeCreateNode', error: String(err) });
    return null;
  }
  ```
- **严重程度**: P2
- **类别**: 错误替换
- **影响**: host/tenant lifecycle hook 抛出的真实 `Error` 在 core 层就被降成 `string`，随后 renderer 只能 `new Error(event.error)` 重新造一个错误对象上报。最终 monitor/diagnostic 看到的是伪造错误，原始 stack、`cause`、自定义字段全部丢失。
- **修复建议**: 把 `lifecycleHookError` 扩成至少 `{ hook, message, error }`；core 发事件时保留原始 `error: unknown`；renderer 调 `reportRuntimeHostIssue(...)` 时直接传原始 error，仅把 message 用于展示。
- **为什么值得现在做**: 这不是多打一条日志的增强项，而是 live host-hook 故障已经进入结构化上报链路前被永久降级，后续任何监控都无法恢复原始诊断信息。
- **误报排除**: 不是普通 UI 文案格式化。`DesignerEvent` 类型本身就把该事件限定为 `error: string`，而 emit 点也明确 `String(err)`；保真度损失发生在跨层传播主路径上。
- **历史模式对应**: host lifecycle hook error 被字符串化的传播失真模式。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度19-02] Spreadsheet renderer 多个交互 hook 丢弃 `SpreadsheetCommandResult`，把失败伪装成成功侧日志或状态

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-interactions\use-clipboard.ts:14-29,53-59`; `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-interactions\use-find-replace.ts:35-49`; `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-interactions\use-editing.ts:101-116`; `C:\can\nop\nop-chaos-flux\packages\spreadsheet-core\src\core-dispatch.ts:18-30`
- **证据片段**:
  ```ts
  const handleCut = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    await bridge.dispatch({ type: 'spreadsheet:cutCells', range });
    addLog(
      `Cut ${cellAddress(range.startRow, range.startCol)}:${cellAddress(range.endRow, range.endCol)}`,
    );
  }, [getSelectedRange, bridge, addLog]);
  ```
- **严重程度**: P2
- **类别**: 错误吞没
- **影响**: `spreadsheet-core` 明确会返回 `{ ok:false, error }`，但这些 renderer hook 直接忽略返回值，继续写入 Cut/Cleared/Replaced 等成功侧日志或静默结束。结果是 core 的结构化失败跨层被吃掉，用户与调试面都得到错误成功信号。
- **修复建议**: 为所有 `bridge.dispatch(...)` 走统一 result 归一化：`cancelled`、`ok:false`、`ok:true` 三分；只在 `ok:true` 时写 success log/清空本地状态，其余分支显式记录失败或取消。
- **为什么值得现在做**: 这里已经不是缺少 toast 那么简单，而是底层明确失败时，上层仍推进成功侧 UI或日志，直接破坏错误传播保真度并误导排障。
- **误报排除**: 不是单纯 fire-and-forget 风格争议。`packages/spreadsheet-core/src/core-dispatch.ts:18-30` 已定义稳定失败返回通道，renderer 是在拿到结果后主动丢弃它；即使某些按钮平时会被 readonly 禁用，这个 hook 级合同问题仍然存在。
- **历史模式对应**: renderer shell 丢弃 host/core 已结构化失败结果的传播失真模式。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度19-03] Spreadsheet namespaced host provider 在结果映射时擦除 `cancelled`，把取消重分类为普通失败

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\host-action-provider.ts:87-92`; `C:\can\nop\nop-chaos-flux\packages\spreadsheet-core\src\commands.ts:213-218`; `C:\can\nop\nop-chaos-flux\packages\flux-action-core\src\action-core.ts:66-76`
- **证据片段**:
  ```ts
  export function toSpreadsheetActionResult(response: SpreadsheetCommandResult): ActionResult {
    return {
      ok: response.ok,
      data: response.data,
      error: toActionError(response.error),
    };
  }
  ```
- **严重程度**: P2
- **类别**: 错误替换
- **影响**: live reread 确认 `SpreadsheetCommandResult` 合同显式保留 `cancelled?: boolean`，但 namespaced host provider 转成 `ActionResult` 时只拷贝 `ok`、`data`、`error`。后续 `classifyActionResult()` 只能把这类结果判成 `failure`，无法进入 `cancelled` 分支，导致 action 链的 `onError`、`onSettled`、warning telemetry、宿主日志都会把正常取消误记成执行失败。
- **修复建议**: 在 `toSpreadsheetActionResult()` 中至少透传 `cancelled: response.cancelled`；若 spreadsheet 命令后续会区分 timeout 或 neutral，也应统一补齐对应字段，并为 `createSpreadsheetActionProvider()` 增加一条 resolved-cancelled 回归测试，断言 namespace invoke 后仍保留 `cancelled:true`。
- **为什么值得现在做**: 这个 provider 现在同时服务 spreadsheet page 与 report-designer 的 spreadsheet namespace；边界一旦固定丢标志，后续任何新增取消语义都会在两条宿主路径上同时被降级成 failure，排障时只会看到错误的失败信号。
- **误报排除**: 不是在假设某个未存在的抛错路径。live code 已确认问题点是公开结果合同 `SpreadsheetCommandResult.cancelled` 与公开映射函数 `toSpreadsheetActionResult()` 之间的字段丢失；即使当前 spreadsheet-core 里尚未广泛产出 cancelled，这个跨层保真缺口已真实存在，并且没有对应测试覆盖。
- **历史模式对应**: structured cancelled 在 host/provider 适配边界被擦除，最终被上游重分类为 generic failure 的传播失真模式。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`; `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/form-validation.md`
- **复核状态**: 未复核

## 维度复核结论

- 结论: 保留新增发现。
- 理由: 复核后 `19-01` 到 `19-03` 都属于真实的跨层错误保真度损失，而不是单纯缺少 toast、日志等级争议或 fire-and-forget 风格差异。flow-designer lifecycle hook 把原始异常字符串化重建，spreadsheet renderer hook 丢弃结构化失败结果，spreadsheet host provider 又在 `SpreadsheetCommandResult -> ActionResult` 适配时擦除了 `cancelled`，三者都发生在主传播路径上。

## 子项复核结论

- `19-01`: 保留。`DesignerEvent` 类型与 emit 点都已固定为 `error: string`，原始异常对象确实被降级。
- `19-02`: 保留。多个 spreadsheet 交互 hook 在拿到 `SpreadsheetCommandResult` 后继续忽略 `ok/cancelled/error` 并推进成功侧日志或状态。
- `19-03`: 保留。`toSpreadsheetActionResult()` 确实未透传 `cancelled`，会被 `classifyActionResult()` 重分类为 `failure`。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                                                                                                                                                                                                                                                              | 一句话摘要                                                                |
| ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 19-01 | P2       | `packages/flow-designer-core/src/core-node-commands.ts:42-53`; `packages/flow-designer-core/src/core-edge-commands.ts:69-88`; `packages/flow-designer-core/src/types.ts:330`; `packages/flow-designer-renderers/src/designer-page-inner.tsx:68-73`                                                                                | Flow Designer lifecycle hook 异常在 core 到 renderer 边界被字符串化并重建 |
| 19-02 | P2       | `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-clipboard.ts:14-29,53-59`; `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-find-replace.ts:35-49`; `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:101-116`; `packages/spreadsheet-core/src/core-dispatch.ts:18-30` | Spreadsheet renderer 多个交互 hook 丢弃结构化失败结果                     |
| 19-03 | P2       | `packages/spreadsheet-renderers/src/host-action-provider.ts:87-92`; `packages/spreadsheet-core/src/commands.ts:213-218`; `packages/flux-action-core/src/action-core.ts:66-76`                                                                                                                                                     | Spreadsheet namespaced host provider 在结果映射时擦除 `cancelled`         |
