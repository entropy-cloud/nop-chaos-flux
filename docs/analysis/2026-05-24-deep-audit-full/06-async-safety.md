# 维度 06：异步模式与取消安全

## 第 1 轮（初审）

### [维度06-01] `detail-view` 确认提交失败被 `catch(() => undefined)` 吞掉，导致对话框卡在确认态且无错误反馈

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:420-497,544-546`
- **证据片段**:

  ```ts
  async function handleConfirm() {
    if (readOnly || !draftForm) return;

    const confirmToken = beginConfirm();

    if (confirmToken == null) {
      return;
    }
  ```

  ```tsx
  onConfirm={() => {
    handleConfirm().catch(() => undefined);
  }}
  ```

- **严重程度**: P1
- **问题类别**: 异常吞掉 / 用户反馈丢失 / 状态卡死风险
- **异步操作**: `detail-view` draft 确认流程：`draftForm.validateAll('submit')`、`runValidate(...)`、`runTransformOut(...)`、`applyCommitResult(...)`
- **竞态场景或吞掉路径**: 用户点击确认 -> 任一异步校验、转换或提交步骤 reject -> `finally` 只清掉 `confirming` -> JSX 处 `handleConfirm().catch(() => undefined)` 直接吞掉异常 -> 未调用 `setDraftErrorSafe` / `runtime.env.notify` / runtime host issue。
- **用户可见故障**: 确认按钮短暂 loading 后恢复，但 detail surface 保持打开；用户看不到失败原因，无法判断是未保存、校验失败还是系统错误。若失败发生在部分写回/外部 action 后，还会表现为保存没有反馈或状态不一致。
- **现状**: 同目录 `detail-field.tsx` 的确认失败路径会 `logDetailFieldAsyncError('confirm', error)` 并 `reportConfirmFailure(error)`，而 `detail-view.tsx` 只有 open 失败通知，confirm 失败被静默忽略。
- **风险**: 这是用户主操作确认路径，失败会丢失错误反馈；后续开发也容易误以为 `finally` 已完整处理失败状态，但实际上只处理 loading，不处理 failure path。
- **建议**: 为 `detail-view` 增加与 `detail-field` 对齐的 confirm failure path：在 catch 中记录结构化 runtime issue / notify，并将错误写入 `draftError`；或在 `handleConfirm` 内部 catch 后 `setDraftErrorSafe(...)` 并重新/不重新抛出需保持一致。
- **为什么值得现在做**: 这是用户确认保存主路径，且修复可以复用同目录已有 `detail-field` 的失败报告模式，ROI 高。
- **误报排除**: 不是动态 import loader、测试/调试路径，也不是内部 fail-safe。这里是用户点击确认后的主交互链路，catch 明确吞掉异常且没有任何 UI / host reporting。
- **历史模式对应**: Promise fire-and-forget no catch / catch without structured failure path 的历史高频异步失败模式。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/bugs/07-submit-concurrent-guard-fix.md`; `docs/references/audit-tooling.md`
- **复核状态**: 未复核

## suspect 复核摘要

- 已运行并消费 `pnpm check:audit-async-failure-paths`：108 suspects。
- `void-promise-no-catch`
  - `packages/report-designer-renderers/src/report-designer-toolbar.tsx:129,151`：驳回。`handleButtonClick` 内部 `try/catch`，失败通过 `reportRuntimeHostIssue` 上报。
  - `apps/playground/src/pages/report-designer-demo.tsx:504`：暂未作为初审发现保留。`insertFieldAtCell` 的失败会 reject，但该 demo/playground 路径当前缺少明确产品化反馈；建议第 2 轮结合 report designer demo 是否作为正式交互面继续复核。
  - `packages/spreadsheet-renderers/src/default-page-body.tsx` 多个 toolbar handler：大部分 handler 内部用 `reportCommandResult/addLog` 反馈 command result；但 `useClipboard` 的 copy/cut/clear 等未检查 `result.ok`，更偏维度 19 错误传播或交互反馈一致性，本轮未作为维度 06 主发现保留。
- `then-chain-no-catch`
  - `packages/flux-react/src/lazy-renderer-component.tsx:33`：驳回。React `lazy()` loader 的 rejected promise 由 Suspense/ErrorBoundary 语义承接，属于允许的动态 import loader 类噪音。
- `catch-without-structured-failure-path`
  - `packages/flux-runtime/src/async-data/*`：复核到 AbortController、stale run guard、pending refresh、poll timer cleanup 与 host issue reporting，未发现新的高价值维度 06 问题。
  - `packages/flux-runtime/src/form-runtime-submit-flow.ts`：submit concurrency guard 已存在，`finally` 清理 timer/submitting，符合 `docs/bugs/07-submit-concurrent-guard-fix.md`。
  - flow/report designer core command catch：多为命令结果 `{ ok:false, error }` 或 lifecycle hook error event，未在本维度保留；错误传播保真可交给维度 19。
  - `detail-view.tsx` 的 confirm catch 成立：吞掉路径直接导致用户反馈丢失，已报告为 `[维度06-01]`。

## 检查范围

重点复核代码路径：

- `packages/flux-runtime/src/async-data/api-data-source-controller.ts`
- `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts`
- `packages/flux-runtime/src/async-data/source-observer.ts`
- `packages/flux-runtime/src/async-data/source-registry.ts`
- `packages/flux-runtime/src/form-runtime-submit-flow.ts`
- `packages/report-designer-core/src/core.ts`
- `packages/report-designer-core/src/core-dispatch.ts`
- `packages/report-designer-renderers/src/report-designer-toolbar.tsx`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/spreadsheet-renderers/src/default-page-body.tsx`
- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts`
- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-clipboard.ts`
- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-sheet-commands.ts`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-controller.ts`
- `packages/word-editor-renderers/src/editor-canvas.tsx`

## 总结评估

第 1 轮初审发现 1 个高价值问题：`detail-view` 确认提交失败静默吞掉，属于用户可见主交互失败反馈缺失。核心 runtime 的 DataSource/ApiDataSource、submit concurrency、polling cleanup、AbortController/stale guard 基线整体较完整；多数 suspect 是已结构化处理或维度 19 更适合处理的错误传播保真问题。

## 建议第 2 轮深挖方向

- 继续围绕 `detail-view`/`detail-field` 对比深挖：确认 open/confirm、validate/transformIn/transformOut、rollback/writeback 的所有异常路径是否一致。
- 对 `spreadsheet-renderers` toolbar handlers 做交互级复核：区分维度 06 的 promise reject 卡死与维度 19 的 command result 反馈丢失。
- 对 `apps/playground/src/pages/report-designer-demo.tsx` 的 field insert/drop 失败路径做一次 focused 复核，判断 playground demo 是否已是用户可见正式入口。

## 深挖第 2 轮追加

### [维度06-02] `report-designer-demo` 字段插入/拖拽 Promise 被 `void` 丢弃，失败会静默隐藏两阶段写入/回滚结果

- **文件**: `apps/playground/src/pages/report-designer-demo.tsx:314-372,397-405,498-505,519-522`
- **证据片段**:
  ```ts
  async function insertFieldAtCell(sourceId: string, fieldId: string, label: string) {
    ...
    const spreadsheetResult = await spreadsheetBridge.dispatch({
      type: 'spreadsheet:setCellValue',
      ...
    });
  ```
  ```tsx
  onFieldInsert={(sourceId, fieldId, label) => {
    void handleFieldInsert(sourceId, fieldId, label);
  }}
  onFieldDrop={(event) => {
    void handleFieldDrop(event);
  }}
  ```
- **严重程度**: P2
- **问题类别**: 异常吞掉 / 用户可见正式入口失败反馈丢失
- **异步操作**: `insertFieldAtCell()` 先 `spreadsheetBridge.dispatch('spreadsheet:setCellValue')` 写入单元格，再 `designerBridge.dispatchDesigner('report-designer:dropFieldToTarget')` 写入 report metadata；失败时还会尝试 rollback。
- **竞态场景或吞掉路径**: 用户在 `/#/report-designer` 选择单元格后点击字段面板 Insert，或拖拽字段到表格；`handleFieldInsert()` / `handleFieldDrop()` 会 `await insertFieldAtCell(...)`，但调用点使用 `void handleFieldInsert(...)`、`void handleFieldDrop(event)`；若 spreadsheet 写入失败、designer 写入失败、或 rollback 失败，`insertFieldAtCell()` 会 `throw`；外层没有 `.catch()`、没有 toast/log/inline error，用户路径静默失败或只留下半提交风险。
- **用户可见故障**: 字段插入按钮和拖拽是 `ReportFieldPanel` 暴露的可见交互，且 `ReportDesignerPage` 直接把 `ReportDesignerDemo` 挂到正式 playground 路由；失败时用户看不到“字段插入失败/回滚失败”的原因。若 spreadsheet 已写入但 designer metadata 写入或 rollback 失败，单元格文本与 report binding metadata 可能不一致。
- **现状**: 这不是纯测试 helper。`apps/playground/src/App.tsx` 将 `report-designer` 域路由到 `ReportDesignerPage`，`report-designer-page.tsx` 直接渲染 `ReportDesignerDemo`；同时已有 `report-designer-demo.test.tsx` 验证 Insert 按钮作为 live consumer。
- **风险**: 两阶段写入失败会变成无反馈失败，用户无法判断字段是否插入成功或是否需要重试；rollback 失败还可能留下跨核心状态不一致。
- **建议**: 为 `handleFieldInsert` / `handleFieldDrop` 调用点增加结构化 failure path：捕获错误后通过 `toast`/页面状态/日志区域显示失败，并区分 spreadsheet 写入失败、designer 写入失败、rollback 失败；必要时把两阶段提交封装为带 `{ ok, error, rollbackError }` 的 command result，避免裸 throw 被 UI 丢弃。
- **为什么值得现在做**: 这是 playground 当前正式 report designer 入口的核心字段插入路径，并且已有两阶段写入/回滚逻辑，失败反馈缺失会直接影响调试和演示可信度。
- **误报排除**: 不重复第 1 轮 `detail-view confirm catch`。这里是 report designer 用户可见字段插入入口；不是动态 import、测试路径或内部 fail-safe。
- **历史模式对应**: fire-and-forget async no catch 导致用户主操作失败无反馈。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/references/audit-tooling.md`; `docs/architecture/report-designer/design.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度06-01]`: 降级（P2）。重新核对 live code 后确认 `detail-view.tsx` 的 `handleConfirm()` 覆盖 `validateAll`、`runValidate`、`runTransformOut`、`applyCommitResult` 等异步主链路，调用点仍是 `handleConfirm().catch(() => undefined)`，且没有 `setDraftErrorSafe`/`notify`；但 `finally` 会执行 `finishConfirm()`，所以“卡在确认态”不成立，问题应收敛为确认失败静默无反馈。
- `[维度06-02]`: 保留（P2）。重新核对 live code 后确认 `ReportDesignerDemo` 仍挂在 `/#/report-designer` playground 入口，字段 Insert/drop 路径会执行 spreadsheet 写入、designer metadata 写入和 rollback，失败分支会 `throw`，而 `onFieldInsert`/`onDrop` 仍用 `void handleFieldInsert(...)`、`void handleFieldDrop(event)` 丢弃 Promise，无 toast/log/inline error；owner docs 也把字段拖拽/插入列为 report designer 主交互路径。

## 子项复核建议

无。

## 子项复核结论

- `[维度06-01]`: 降级（P2）。live `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx` 仍吞掉 confirm 异常且无反馈，但 `finally` 会 `finishConfirm()`，所以只成立为确认失败静默无反馈而非卡死确认态。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                | 摘要                                                                                    |
| --------- | -------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 维度06-01 | P2       | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx` | `detail-view` confirm 异常被吞掉，确认失败静默无反馈。                                  |
| 维度06-02 | P2       | `apps/playground/src/pages/report-designer-demo.tsx`                    | Report Designer 字段 Insert/drop Promise 被丢弃，失败无反馈且可能留下两阶段写入不一致。 |
