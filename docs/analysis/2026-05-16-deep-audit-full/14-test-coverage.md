# 维度 14：测试覆盖与质量

## 第 1 轮（初审）

### [维度14-01] `use-word-editor-save` 的失败/abort 分支缺少 focused tests

- **文件**: `packages/word-editor-renderers/src/hooks/use-word-editor-save.ts:49-69`
- **证据片段**:
  ```ts
  if (!result.ok) {
    env.notify?.('warning', ...);
  } catch (error) {
    if (controller.signal.aborted || error.name === 'AbortError') {
      return;
    }
    env.notify?.('warning', ...);
  }
  ```
- **严重程度**: P1
- **现状**: 现有测试覆盖 success/concurrency/unmount，但未单独覆盖 `ok:false`、throw、AbortError 路径。
- **风险**: 用户可见的 warning / abort suppression 行为可在回归时静默失守。
- **建议**: 新增 focused hook tests 覆盖失败、抛错、AbortError 与 message clear 行为。
- **为什么值得现在做**: 该 hook 直接承载保存失败反馈。
- **误报排除**: 不是要求重复 provider 测试；问题在 hook 自己的分支仍无针对性覆盖。
- **历史模式对应**: failure-path coverage gap。
- **参考文档**: `AGENTS.md`、`docs/testing/e2e-standards.md`
- **复核状态**: 未复核

### [维度14-02] `field-panel-renderer` 失败测试未校验 `reportRuntimeHostIssue` 诊断义务

- **文件**: `packages/report-designer-renderers/src/field-panel-renderer.tsx:106-119`
- **证据片段**:
  ```ts
  function handleKeyboardInsertError(error: unknown) {
    reportRuntimeHostIssue({ ... operation: 'report-field-panel-insert' });
    env.notify?.('warning', ...);
  }
  ```
- **严重程度**: P1
- **现状**: 现有失败测试只断言 `notify`，未断言 diagnostics side effect。
- **风险**: 将来可能出现 toast 还在、但 structured diagnostics 已丢失的回归。
- **建议**: 对失败插入路径增加 `reportRuntimeHostIssue` spy/assert。
- **为什么值得现在做**: 这是关键失败路径的 observability contract。
- **误报排除**: 不是额外重复测实现细节；该 renderer 明确承诺了两个 side effect。
- **历史模式对应**: telemetry assertion gap。
- **参考文档**: `docs/references/audit-tooling.md`
- **复核状态**: 未复核

### [维度14-03] `word-editor-page-actions.test.tsx` 体量大且跨多个关注域，但更适合作为降级项

- **文件**: `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx:255-534`
- **证据片段**:
  ```ts
  it('saves through the word-editor action provider ...');
  it('wires shortcut save ...');
  it('persists datasets immediately ...');
  it('ignores concurrent save triggers ...');
  it('invokes onBack directly ...');
  ```
- **严重程度**: P2
- **现状**: 文件混合 save、shortcut、dataset dialog、back-button 等多个主题。
- **风险**: 维护成本上升、故障定位粒度变差。
- **建议**: 按 page integration / save hook / dataset / navigation 拆分。
- **为什么值得现在做**: 这是典型可维护性信号，但不应压过更高价值 failure-path coverage gap。
- **误报排除**: 复核已确认它更像 maintainability smell，而不是强 correctness finding。
- **历史模式对应**: oversized cross-domain suite。
- **参考文档**: `docs/references/audit-tooling.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度14-01]：保留 (P1)。failure/abort hook branches 仍无 focused tests。
- [维度14-02]：保留 (P1)。diagnostics contract 未被测试覆盖。
- [维度14-03]：降级为 P2。主要是维护性问题。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                     | 一句话摘要                                                   |
| ----- | -------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 14-01 | P1       | `packages/word-editor-renderers/src/hooks/use-word-editor-save.ts:49-69`                 | `use-word-editor-save` 的失败/abort 分支缺少 focused tests   |
| 14-02 | P1       | `packages/report-designer-renderers/src/field-panel-renderer.tsx:106-119`                | field panel 失败测试未校验 `reportRuntimeHostIssue` 诊断义务 |
| 14-03 | P2       | `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx:255-534` | word editor 动作测试跨域过多且文件过厚                       |
