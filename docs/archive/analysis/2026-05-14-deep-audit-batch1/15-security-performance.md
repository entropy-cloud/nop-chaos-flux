# 维度 15：安全与性能红线

## 第 1 轮（初审）

### [维度15-01] Word Editor 恢复路径吞掉 storage/parse 异常

- **文件**: `packages/word-editor-core/src/document-io.ts:257-277,337-354`
- **证据片段**:
  ```ts
  export function loadDocument(): SavedDocumentData | null {
    try {
      const storage = getStorage();
      if (!storage) return null;
      ...
    } catch {
      return null;
    }
  }
  ```
- **严重程度**: P2
- **类别**: Security / Observability
- **规则编号**: R4
- **现状**: `loadDocument()` 与 `loadDatasets()` 把 `localStorage` 失败、`SecurityError`、JSON 损坏等全部折叠成 `null` / `[]`。
- **风险**: 恢复失败会被伪装成“没有草稿”，诊断面无法区分恢复缺失和恢复异常。
- **建议**: 至少保留错误分类并接入监控/诊断通道。
- **误报排除**: 这不是测试辅助逻辑，且同文件保存路径已建模结构化错误。
- **复核状态**: 未复核

### [维度15-02] `$form` 绑定热路径仍通过汇总扫描与 `JSON.stringify` 版本键工作

- **文件**: `packages/flux-runtime/src/form-runtime-status.ts:23-43`, `packages/flux-runtime/src/status-owner.ts:21-29`
- **证据片段**:
  ```ts
  for (const fieldState of Object.values(state.fieldStates)) {
    if (fieldState.errors) {
      errorCount += fieldState.errors.length;
    }
  }
  ```
  ```ts
  return JSON.stringify(
    Object.keys(record)
      .sort()
      .map((key) => [key, record[key]]),
  );
  ```
- **严重程度**: P2
- **类别**: Performance
- **规则编号**: P1
- **现状**: `$form` summary 仍通过遍历 `fieldStates` 聚合，再通过 `JSON.stringify(...)` 生成版本键。
- **风险**: 大表单下 broad summary consumer 仍要承担非增量的汇总成本。
- **建议**: 拆分增量计数器与更轻量的版本标记。
- **误报排除**: 问题不在 full graph deep compare，而在热路径仍缺显式增量版本。
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度15-03] Word Editor autosave 直接写 `localStorage`，绕过已建模的保存错误通道

- **文件**: `packages/word-editor-renderers/src/editor-canvas.tsx:52-73`, `packages/word-editor-core/src/document-io.ts:214-249`
- **证据片段**:
  ```ts
  localStorage.setItem('nop-word-editor-document', JSON.stringify(saved));
  onAutosaveRef.current?.(saved);
  editorStore.setDirty(false);
  ```
- **严重程度**: P2
- **类别**: Security / Observability
- **规则编号**: R4
- **现状**: autosave 直接写 `localStorage`，没有复用 `saveDocument()` 的结构化错误模型。
- **风险**: 浏览器存储异常会在异步回调里失观测，autosave 成败语义无法纳入统一保存错误通道。
- **建议**: 复用受控的保存 helper，至少补齐失败分类与诊断。
- **误报排除**: 这不是显式 host save；问题是 autosave 自身的本地错误面没有受控收敛。
- **复核状态**: 未复核

### [维度15-04] `setValues` 在带 `path/targetId` 时退化为逐字段 `setValue`

- **文件**: `packages/flux-runtime/src/action-adapter.ts:98-116`, `packages/flux-runtime/src/form-runtime.ts:507-543`
- **证据片段**:
  ```ts
  if (ctx.form) {
    if (basePath) {
      for (const [targetPath, val] of Object.entries(resolvedValues)) {
        ctx.form.setValue(targetPath, val);
      }
    }
  }
  ```
- **严重程度**: P2
- **类别**: Performance
- **规则编号**: P2
- **现状**: 本可批量处理的 `setValues` 在 targeting 分支被拆成多次 `setValue()`。
- **风险**: 每个字段都单独触发 store 更新、错误清理与 dependent revalidate，批量写入复杂度被放大。
- **建议**: 带前缀场景也应直接走一次批量 `setValues(resolvedValues)`。
- **误报排除**: 仓库已有批量写入能力，这里是特定分支退化，不是统一设计约束。
- **复核状态**: 未复核

### [维度15-05] dependent revalidation 失败仍是 fire-and-forget，且仅 `console.warn`

- **文件**: `packages/flux-runtime/src/form-runtime.ts:542`, `packages/flux-runtime/src/form-runtime-values.ts:20-35,120-125`, `packages/flux-runtime/src/form-runtime-owner.ts:141-188`
- **证据片段**:
  ```ts
  void ownerRuntime.revalidateDependents(name, 'change');
  ```
  ```ts
  result.catch((error: unknown) => {
    reportDependentRevalidationFailure(path, error);
  });
  ```
- **严重程度**: P2
- **类别**: Performance / Observability
- **规则编号**: P6
- **现状**: dependent revalidation 在值写入后异步 fire-and-forget 执行，失败只落 `console.warn` 或直接成为未等待的 rejection。
- **风险**: 值已提交，但相关 dependent 字段校验可能 silently broken，外部 API/form state 无法感知。
- **建议**: 接入正式监控/状态通道，或把 dependent revalidation 收敛为受控任务。
- **误报排除**: 这不是调试辅助路径，而是表单主写入路径上的真实失败面。
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度15-06] `createFormStore` 已知 path 写入后仍要递归 diff values 树推导 changedPaths

- **文件**: `packages/flux-runtime/src/form-store.ts:155-187,247-255,339-343`
- **证据片段**:
  ```ts
  function collectChangedValuePaths(before, after, changed, basePath?) {
    if (Object.is(before, after)) {
      return;
    }
    ...
    for (const key of keys) {
      collectChangedValuePaths(beforeRecord[key], afterRecord[key], changed, nextPath);
    }
  }
  ```
- **严重程度**: P2
- **类别**: Performance
- **规则编号**: P7
- **现状**: `setValue()` 虽然已知精确 path，但写入后仍通过递归 diff values 树来推导 changed paths。
- **风险**: 单字段写入仍保留与表单宽度相关的额外扫描成本。
- **建议**: 为已知 path 写入添加 path-aware fast path，只在 whole-value replace 时退回结构 diff。
- **误报排除**: 问题不是 listener 路由，而是已知 path 场景仍先做结构 diff。
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度15-07] formula data-source 在值未变化时仍无条件重发 data/status

- **文件**: `packages/flux-runtime/src/async-data/formula-data-source-controller.ts:112-159`, `packages/flux-runtime/src/async-data/data-source-runtime-utils.ts:114-139`
- **证据片段**:
  ```ts
  const nextValue = ...;
  writeDataToScope(..., nextValue);
  updateState(..., { dataUpdatedAt: Date.now(), ... });
  ```
- **严重程度**: P2
- **类别**: Performance
- **规则编号**: P7
- **现状**: formula data-source 缺少 API data-source 已有的 no-op/structural-share guard，值未变化时仍会写 scope 和 status。
- **风险**: 频繁重算但结果不变的 source 会触发无效发布、级联重算与订阅唤醒。
- **建议**: 补齐 currentValue vs nextValue 的 no-op guard，并避免 no-op publish 刷新 `dataUpdatedAt`。
- **误报排除**: 这不是与 `$form` 汇总或 form-store diff 重复的问题，而是另一条独立 runtime 热路径。
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度15-08] debugger 在 `enabled: false` 时仍默认暴露 automation/query surface

- **文件**: `packages/nop-debugger/src/controller.ts:91-97,424-425`, `packages/nop-debugger/src/automation.ts:120-143`
- **证据片段**:
  ```ts
  const exposeAutomationApi = input.exposeAutomationApi ?? true;
  ...
  registerAutomationApi(debuggerId, automation);
  ```
- **严重程度**: P1
- **类别**: Security
- **规则编号**: R3
- **现状**: 关闭 debugger capture/panel 后，controller 仍默认向 `window` 暴露 automation/query surface。
- **风险**: 若策略预期 `enabled: false` 为 fail-closed，则 live runtime 实际仍保留可调用探查能力。
- **建议**: 若安全策略要求彻底关闭，应把 automation exposure 与 `enabled` 绑定；否则需要更明确的 owner 文档声明。
- **误报排除**: 问题只在策略解释层面成立，不是单纯发现全局 API 就机械上报。
- **复核状态**: 未复核

## 维度复核结论

- [维度15-01]: 保留为 P2。恢复路径把 storage/parse 异常吞成空状态，不符合可观测失败要求。
- [维度15-02]: 降级为 P3。summary 仍有 O(n) 聚合成本，但 `JSON.stringify` 作用域已缩小到小 summary，不再是 full-graph 级红线。
- [维度15-03]: 保留为 P2。autosave 仍绕过结构化错误通道，且直接推进成功侧 UI 状态。
- [维度15-04]: 降级为 P3。targeting 分支退化仍在，但更像性能味道，不再是高等级契约问题。
- [维度15-05]: 保留为 P2。dependent revalidation 失败不会进入正式错误/监控通道。
- [维度15-06]: 保留为 P1。已知 path 写入仍递归 diff values 树，直接冲突于 changed-path/local invalidation 基线。
- [维度15-07]: 保留为 P2。formula data-source 缺 no-op guard，会无意义重发 data/status。
- [维度15-08]: 驳回。当前 debugger 文档明确允许 `enabled:false` 保留 bounded automation/query surface。

## 子项复核结论

- [维度15-01]: 降级 (P3)。问题真实，但仅落在本地恢复辅助面，影响面较窄。
- [维度15-02]: 降级 (P3)。属 broad summary 聚合成本，不足以按现行性能红线成立。
- [维度15-03]: 驳回。autosave 本就是本地 persisted snapshot mirror；若上报，应改写为本地错误处理不足，而非“越权绕过保存通道”。
- [维度15-04]: 成立 (P2)。带 targeting 的 `setValues` 仍稳定退化成 repeated `setValue`，且测试已固化该行为。
- [维度15-05]: 成立 (P2)。dependent revalidation 失败仍只在 console / 未等待 rejection 可见。
- [维度15-06]: 驳回。独立子项复核认为当前实现不再是“整树 diff”级别问题，已通过 `Object.is` 与 path-aware listener 路由部分收口。
- [维度15-07]: 成立 (P2)。formula data-source 缺 no-op guard 仍会重复发布 unchanged data/status。
- [维度15-08]: 驳回。现行契约明确保留 bounded automation/query surface，不是 fail-closed 违约。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                             | 一句话摘要                                                  |
| ----- | -------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 15-01 | P3       | `packages/word-editor-core/src/document-io.ts:257-277`                           | 恢复路径把 storage/parse 异常折叠成空状态                   |
| 15-02 | P3       | `packages/flux-runtime/src/form-runtime-status.ts:23-43`                         | `$form` broad summary 仍依赖非增量聚合与 summary stringify  |
| 15-04 | P2       | `packages/flux-runtime/src/action-adapter.ts:98-116`                             | targeting 分支把批量 `setValues` 退化为 repeated `setValue` |
| 15-05 | P2       | `packages/flux-runtime/src/form-runtime.ts:542`                                  | dependent revalidation 失败仍仅 console 可见                |
| 15-07 | P2       | `packages/flux-runtime/src/async-data/formula-data-source-controller.ts:112-159` | formula data-source 缺 unchanged-value no-op guard          |
