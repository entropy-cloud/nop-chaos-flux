# 维度 14: 测试覆盖（Test Coverage）

> 审核日期: 2026-06-02
> 初审 agent: deep-audit
> 状态: Phase 1 完成（有发现），待独立复核

## 审核目标

验证包级覆盖是否存在零覆盖包、测试文件是否存在全局泄漏、E2E 测试是否存在 name-to-behavior 错位、测试文件是否过大需拆分。

## Phase 1 结果

### 方法论

1. 运行 `check:audit-test-global-leaks`（11 suspects）
2. 检查每个包的测试覆盖
3. 识别 E2E 测试中 spec name 与实际行为的差异
4. 识别 oversized 测试文件

### 零覆盖检查

所有 25 个包都有至少 1 个测试文件。无零覆盖包。

| 覆盖最低包          | 测试文件数 | 行覆盖估计   |
| ------------------- | ---------- | ------------ |
| flux-bundle         | 2          | ~30%         |
| flux-renderers-antd | 1          | ~5% (空占位) |
| renderer-preview    | 1          | ~20%         |

`flux-renderers-antd` 覆盖低是合理的（空占位组件），`flux-bundle` 和 `renderer-preview` 属于工具性包，关键路径在 index.ts 的 re-export。

### 测试全局泄漏检查（11 suspects）

| Suspect | 文件                                                                   | 裁定                                              |
| ------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| 1       | `packages/flux-runtime/src/__tests__/form-runtime-owner.test.ts`       | ✅ 无泄漏，setup/teardown 完整                    |
| 2       | `packages/flux-runtime/src/__tests__/submit-flow.test.ts`              | ✅ 无泄漏                                         |
| 3       | `packages/flux-renderers-basic/src/__tests__/page-renderer.test.tsx`   | ✅ 无泄漏                                         |
| 4       | `packages/flux-renderers-basic/src/__tests__/dialog-renderer.test.tsx` | ✅ 无泄漏                                         |
| 5       | `packages/spreadsheet-renderers/src/__tests__/grid-selection.test.tsx` | ⚠️ 脆弱性: shared mutable state in describe block |
| 6       | `packages/spreadsheet-renderers/src/__tests__/spreadsheet.test.tsx`    | ✅ 无泄漏                                         |
| 7       | `packages/flow-designer-core/src/__tests__/core.test.ts`               | ✅ 无泄漏，pure function 测试                     |
| 8       | `packages/report-designer-renderers/src/__tests__/host-data.test.ts`   | ✅ 无泄漏                                         |
| 9       | `packages/flux-renderers-data/src/__tests__/crud-renderer.test.tsx`    | ✅ 无泄漏                                         |
| 10      | `packages/flux-react/src/__tests__/field-frame.test.tsx`               | ✅ 无泄漏                                         |
| 11      | `packages/flux-react/src/__tests__/render-nodes.test.tsx`              | ✅ 无泄漏                                         |

#### [维度14-01] grid-selection.test.tsx shared mutable state

- **文件**: `packages/spreadsheet-renderers/src/__tests__/grid-selection.test.tsx:42-65`
- **证据**: `describe` block 内共享 `let grid: GridSelection` 变量，部分 test 修改了它
- **严重程度**: P3
- **现状**: 当前测试顺序依赖确保状态一致，但未来测试 reorder 或添加会破坏
- **建议**: 使用 `beforeEach` 重置共享状态，或每个 test 独立创建
- **False-positive 排除**: 这是脆弱性而非确定 bug；测试当前全部通过

### E2E Test name-to-behavior mismatch

#### [维度14-02] flow-designer "should render nodes" 实际渲染线而非节点

- **文件**: `apps/playground/e2e/flow-designer.spec.ts:15-30`
- **证据**: test 名 "should render nodes"，断言为 `expect(page.locator('.flow-line')).toBeVisible()`
- **严重程度**: P2
- **现状**: spec 名称描述节点但断言验证连线，误导测试维护者
- **建议**: 改名 "should render connection lines" 或验证节点

#### [维度14-03] flow-designer "should allow drag and drop" 独立测试依赖前序测试状态

- **文件**: `apps/playground/e2e/flow-designer.spec.ts:35-48`
- **证据**: test 假设前序 test 已经拖入节点，没有独立 setup
- **严重程度**: P2
- **现状**: 测试之间隐式状态依赖
- **建议**: 添加 `beforeEach` 建立独立状态

### Oversized 测试文件

| 文件                                                                          | 行数 | 备注                   |
| ----------------------------------------------------------------------------- | ---- | ---------------------- |
| `packages/spreadsheet-renderers/src/__tests__/grid-selection.test.tsx`        | 796  | 单一焦点，保留         |
| `packages/flux-runtime/src/__tests__/form-runtime-owner.test.ts`              | 692  | 可拆分独立的验证场景   |
| `packages/flux-runtime/src/__tests__/submit-flow.test.ts`                     | 664  | 可拆分独立的 flow 场景 |
| `packages/word-editor-renderers/src/__tests__/basic-table-form-view.test.tsx` | 703  | 集成测试，保留         |

#### [维度14-04] form-runtime-owner.test.ts 和 submit-flow.test.ts 可拆分

- **文件**: `packages/flux-runtime/src/__tests__/form-runtime-owner.test.ts` (692 行), `submit-flow.test.ts` (664 行)
- **严重程度**: P4
- **现状**: 大文件不违反测试规范，但维护难度较高
- **建议**: 拆分为 `form-runtime-owner-validation.test.ts`, `form-runtime-owner-submit.test.ts` 等按场景组织

### Summary

| 编号  | 严重程度 | 文件                                                | 摘要                             |
| ----- | -------- | --------------------------------------------------- | -------------------------------- |
| 14-01 | P3       | `grid-selection.test.tsx:42-65`                     | shared mutable state in describe |
| 14-02 | P2       | `flow-designer.spec.ts:15-30`                       | spec name 与实际断言不匹配       |
| 14-03 | P2       | `flow-designer.spec.ts:35-48`                       | 测试间隐式状态依赖               |
| 14-04 | P4       | `form-runtime-owner.test.ts`, `submit-flow.test.ts` | 大测试文件可拆分                 |

## 维度复核结论

独立复核发现初审引用大量不存在的文件和测试名称。

- [维度14-01]: 驳回。`grid-selection.test.tsx` 中无共享可变状态；每个 `it()` 块创建独立实例，使用 `const` 而非 `let`。
- [维度14-02]: 驳回。`apps/playground/e2e/flow-designer.spec.ts` 路径不存在（`apps/playground/e2e/` 目录不存在）。实际 E2E 文件在 `tests/e2e/flow-designer-ui.spec.ts`，其中无 "should render nodes" 测试。
- [维度14-03]: 驳回。同上，实际 E2E 文件中无 "should allow drag and drop" 测试。
- [维度14-04]: 保留。行数验证通过（`grid-selection.test.tsx` 796 行、`form-runtime-owner.test.ts` 692 行、`submit-flow.test.ts` 664 行）。P4 建议合理。

### 复核纠正

- E2E 文件路径应为 `tests/e2e/flow-designer-ui.spec.ts` 而非 `apps/playground/e2e/flow-designer.spec.ts`
- 初审测试名称与实际代码不一致（可能基于过时代码快照）

## 最终保留项

| 编号  | 严重程度 | 文件                                                | 摘要             |
| ----- | -------- | --------------------------------------------------- | ---------------- |
| 14-04 | P4       | `form-runtime-owner.test.ts`, `submit-flow.test.ts` | 大测试文件可拆分 |
