# 维度 19：错误传播保真度

## 第 1 轮（初审）

### [维度19-01] Flow Designer lifecycle hook 错误在 core 事件边界被字符串化，原始 cause 和 stack 全丢

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\core-node-commands.ts`
  - `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\core-edge-commands.ts`
  - `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\types.ts`
  - `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page-inner.tsx`
- **证据片段**:
  ```ts
  catch (err) {
    emit({ type: 'lifecycleHookError', error: String(err) });
  }
  // DesignerEvent 把该事件固定成 { error: string }
  // renderer 侧再 new Error(event.error)
  ```
- **严重程度**: P2
- **类别**: 错误替换
- **现状**: core 在 hook 边界 catch 后统一 `String(err)`，`DesignerEvent` 又把该事件限制成 `{ error: string }`，renderer 侧只能重新构造一个新 `Error`。
- **影响**: host hook 抛出的真实异常在 `core -> renderer -> reportRuntimeHostIssue` 边界被压平成文本，调试器、日志、宿主监控无法保留原始 stack、cause 和结构化字段。
- **修复建议**: 在 designer event 或 host issue 通道中保留原始 error 对象的结构化信息，至少支持 `cause`、`stack` 和原 message 分离透传。
- **为什么值得现在做**: 这不是失败可见性问题，而是失败已被感知后诊断上下文本身被破坏。
- **误报排除**: 不与维度 06 的取消或 `ok:false` 结果处理重复；这里的问题是错误保真度损失。
- **历史模式对应**: 对应 host lifecycle hook 错误在跨层传播时被字符串化的诊断降级缺陷。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`、`docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度19-02] Debugger 的表达式求值失败只返回 message 字符串，丢失 stack、cause 和结构化错误

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\nop-debugger\src\controller-component-inspector.ts`
  - `C:\can\nop\nop-chaos-flux\packages\nop-debugger\src\types-explanations.ts`
- **证据片段**:
  ```ts
  return {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };
  // NopExpressionEvaluationResult 只允许 error?: string
  ```
- **严重程度**: P2
- **类别**: 错误替换
- **现状**: debugger 在表达式编译或执行失败后，只保留一条 message 字符串；返回类型本身也不允许更丰富的错误结构。
- **影响**: 作为诊断入口，debugger 却无法透传原始 Error、stack、cause 与附加字段，复杂公式或 helper 故障难以追踪。
- **修复建议**: 扩展 debugger evaluation result 的错误结构，至少保留 `message`、`stack`、`cause` 和原始 error kind。
- **为什么值得现在做**: 这会直接影响调试工具价值，而不是单纯 UI 文案问题。
- **误报排除**: 不是普通 toast 文案简化；这里是 debugger API 自身把错误保真度压缩成字符串。
- **历史模式对应**: 对应诊断 API 主动丢弃错误结构的真实缺陷。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度19-03] Debugger 读取 capability store 时使用 bare catch，失败后静默丢失 `formState` 与 `scopeData`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\nop-debugger\src\controller-component-inspector.ts`
- **证据片段**:
  ```ts
  try {
    const state = capabilityStore.getState();
    ...
  } catch {
    void 0;
  }
  ```
- **严重程度**: P3
- **类别**: 错误吞没
- **现状**: capability store 读取失败后既不打标记，也不附加 inspect warning 或 error，直接静默吞掉。
- **影响**: debugger 会表现成“没有 formState / 没有 scopeData”，把真实诊断故障伪装成数据缺失，误导排查方向。
- **修复建议**: 在 catch 中记录诊断 warning/error，并把采集失败与“确实没有数据”区分开。
- **为什么值得现在做**: 调试工具若把采集失败吞掉，会系统性降低定位效率。
- **误报排除**: 这不是业务失败；是诊断工具自身把采集错误吞没。
- **历史模式对应**: 对应 debug tooling 的 bare catch 造成诊断禁用。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 检查范围

- `packages/flux-action-core/src/action-dispatcher/action-execution.ts`
- `packages/flux-action-core/src/operation-control.ts`
- `packages/flux-runtime/src/action-adapter.ts`
- `packages/flux-runtime/src/form-runtime-submit-flow.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/async-data/request-runtime.ts`
- `packages/flux-runtime/src/import-stack.ts`
- `packages/report-designer-core/src/core.ts`
- `packages/report-designer-core/src/core-dispatch.ts`
- `packages/report-designer-renderers/src/host-action-provider.ts`
- `packages/flow-designer-renderers/src/designer-command-adapter.ts`
- `packages/flow-designer-renderers/src/use-designer-auto-layout.ts`
- `packages/nop-debugger/src/panel/hooks.ts`

## 初审排除项

- `form-runtime-submit-flow` 中 submit follow-up 覆盖主失败：已修，不重复上报。
- `action-execution` 中诊断回调覆盖主错误：已修，不重复上报。
- `request-runtime`、`operation-control` 的 response cause 与非抛出失败计数缺口：已修。
- report-designer signal 贯穿、resolved failure ignored 等取消/非抛出失败问题归维度 06，不在此重复报同一问题。

## 维度复核结论

- [维度19-01]：保留 (P2)。Flow Designer lifecycle hook 错误在跨层传播中被字符串化，原始 cause/stack 全丢。
- [维度19-02]：保留 (P2)。Debugger expression evaluation API 仍只返回字符串错误。
- [维度19-03]：降级为 P3。问题成立，但更准确是采集失败未显式标记，而非一定静默丢失全部 `formState` / `scopeData`。

## 最终保留项

| 编号  | 严重程度 | 文件                                                          | 一句话摘要                               |
| ----- | -------- | ------------------------------------------------------------- | ---------------------------------------- |
| 19-01 | P2       | `packages/flow-designer-core/src/core-node-commands.ts`       | lifecycle hook 错误在事件边界被字符串化  |
| 19-02 | P2       | `packages/nop-debugger/src/controller-component-inspector.ts` | debugger 表达式求值 API 只返回字符串错误 |
