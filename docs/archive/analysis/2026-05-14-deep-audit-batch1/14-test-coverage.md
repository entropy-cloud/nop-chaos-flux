# 维度 14：测试覆盖与质量

## 第 1 轮（初审）

### [维度14-01] input-password 的 E2E 场景把“自定义校验可能不触发”固化为通过条件

- **文件**: `tests/e2e/component-lab/simple-form.spec.ts:151-168`
- **证据片段**:
  ```ts
  // custom validation may not fire in current runtime
  await stage.getByRole('button', { name: 'Set Password' }).click();
  await expect(newPasswordInput).toHaveValue('password123');
  await expect(confirmPasswordInput).toHaveValue('different123');
  ```
- **严重程度**: P2
- **类别**: 测试断言质量
- **现状**: 用例标题指向 confirm-password validator，但实际并不验证错误提示或提交阻止
- **建议**: 改为契约型断言；若当前能力未落地，则显式标记为待修复缺陷用例，而不是常绿通过
- **误报排除**: 不是要求多写测试，而是当前通过中的 E2E 已把弱行为当正确行为
- **复核状态**: 未复核

### [维度14-02] `word-editor-page-host-scope.test.tsx` 混合 host scope、recovery、shell 与 manifest metadata

- **文件**: `packages/word-editor-renderers/src/__tests__/word-editor-page-host-scope.test.tsx:21-123,541-669,733-809`
- **证据片段**:
  ```ts
  const mockedCore = vi.hoisted(() => ({ ... }))
  function resetMockStores() { ... }
  ```
- **严重程度**: P2
- **类别**: 跨域 / 测试可维护性
- **现状**: 809 行文件依赖共享可变 mock，同时覆盖 host scope、persisted/recovery、window probe、shell 与 renderer metadata
- **建议**: 拆为 host scope、recovery/bootstrap、shell、renderer definition 几组测试文件
- **误报排除**: 不只是大文件，而是跨域混测 + 共享 mutable mock 明显失控
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度14-03] `hook-surface-lifecycle-contracts.test.tsx` 已演变为跨层 omnibus contract 文件

- **文件**: `packages/flux-react/src/__tests__/hook-surface-lifecycle-contracts.test.tsx:121,426,519,586,623,737`
- **证据片段**:
  ```ts
  describe('Hook contract: useScopeSelector', ...)
  describe('Surface lifecycle contracts', ...)
  describe('SchemaRenderer re-render contracts', ...)
  describe('Error boundary integration contracts', ...)
  ```
- **严重程度**: P2
- **类别**: 跨域
- **现状**: 同一文件同时覆盖 hook、surface lifecycle、SchemaRenderer、ErrorBoundary、form owner cleanup
- **建议**: 拆成 hooks、surface、schema-renderer、error-boundary 等更窄合同文件
- **误报排除**: 不是按体积处罚；这里已经把多个独立 owner/运行层混入一个入口
- **复核状态**: 未复核

### [维度14-04] `renderers.integration.test.tsx` 把 UI 集成与 provider 纯单元契约混在一起

- **文件**: `packages/report-designer-renderers/src/renderers.integration.test.tsx:182,321,371,409,543,600,637,662`
- **证据片段**:
  ```ts
  it('publishes statusPath...', ...)
  it('maps provider failure...', ...)
  it('lists namespaced methods...', ...)
  ```
- **严重程度**: P2
- **类别**: 跨域
- **现状**: 单个 integration 文件同时承载 page/integration 与 provider unit contract
- **建议**: UI 集成与 host-action provider 纯单元断言拆分
- **误报排除**: 不是反对 integration test，而是不同 owner 层面的合同被混装
- **复核状态**: 未复核

### [维度14-05] `designer-page.tree.test.tsx` 将 tree/graph/history/runtime-props/React warning 回归混成单一入口

- **文件**: `packages/flow-designer-renderers/src/designer-page.tree.test.tsx:13,42,117,289,405,492,571,664`
- **证据片段**:
  ```ts
  it('renders tree mode ...');
  it('graph mode still works correctly ...');
  it('does not warn about render-phase updates ...');
  it('preserves selection and undo history continuity ...');
  ```
- **严重程度**: P2
- **类别**: 跨域
- **现状**: 同一文件横跨 tree projection、graph regression、runtime props、render warning、core reuse、history continuity
- **建议**: 按 tree rendering / runtime props / core continuity / graph regression 拆分
- **误报排除**: 问题不在 tree mode 复杂，而在多个独立回归域被压进一个文件
- **复核状态**: 未复核

## 维度复核结论

- [维度14-01]: 降级为 P3。当前 playground lab 已有意缩窄为 masked baseline，但仍接受 validator-not-firing 的弱门禁。
- [维度14-02]: 保留为 P2。host-scope 测试文件仍明显跨域混装且共享 mutable mocks。
- [维度14-03]: 保留为 P2。`hook-surface-lifecycle-contracts` 已成跨层 omnibus contract 文件。
- [维度14-04]: 保留为 P2。report renderers integration 文件混装了 UI integration 与 provider unit contract。
- [维度14-05]: 保留为 P2。tree/graph/history/runtime-props/warning 回归仍被塞在同一入口。

## 子项复核结论

- [维度14-01]: 降级 (P3)。
- [维度14-02]: 成立 (P2)。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                | 一句话摘要                                                          |
| ----- | -------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 14-01 | P3       | `tests/e2e/component-lab/simple-form.spec.ts:151-168`                               | input-password E2E 仍接受 validator-not-firing 的弱门禁             |
| 14-02 | P2       | `packages/word-editor-renderers/src/__tests__/word-editor-page-host-scope.test.tsx` | host-scope 测试文件混装四类职责且共享 mutable mocks                 |
| 14-03 | P2       | `packages/flux-react/src/__tests__/hook-surface-lifecycle-contracts.test.tsx`       | hook-surface-lifecycle 已成跨层 omnibus contract 文件               |
| 14-04 | P2       | `packages/report-designer-renderers/src/renderers.integration.test.tsx`             | report renderers integration 混装 UI 集成与 provider 单元契约       |
| 14-05 | P2       | `packages/flow-designer-renderers/src/designer-page.tree.test.tsx`                  | designer-page.tree 把 tree/graph/history/runtime props 混成同一入口 |
