# 维度 14：测试覆盖与质量

## 第 1 轮（初审）

### [维度14-01] `word-editor-page-actions.test.tsx` 新装 `window.confirm` 后未完整恢复，存在真实全局补丁泄漏

- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\__tests__\word-editor-page-actions.test.tsx`
- **证据片段**:
  ```ts
  if (!window.confirm) window.confirm = vi.fn(() => true);
  const confirmSpy = vi.spyOn(window, 'confirm');
  // afterEach 只做 cleanup() 和 vi.useRealTimers()，没有删除新增的 window.confirm
  ```
- **严重程度**: P1
- **类别**: 隔离性
- **现状**: 如果当前环境原本没有 `window.confirm`，测试会安装一个新的全局函数；`mockRestore()` 只会恢复到这个新装进去的 mock，不会删除它。
- **建议**: 在 `afterEach` 中显式恢复并删除新增的 `window.confirm`，确保全局对象回到原始状态。
- **为什么值得现在做**: 这会把全局补丁泄漏给后续测试，是真实的测试隔离性缺陷。
- **误报排除**: 不是因为文件大本身报问题；是真实的全局状态泄漏。
- **历史模式对应**: 对应 `test-global-patch` suspect 的真实保留案例。
- **参考文档**: `docs/references/audit-tooling.md`
- **复核状态**: 未复核

### [维度14-02] `ui` 包公开导出面明显大于其包内直接回归覆盖

- **文件**: `C:\can\nop\nop-chaos-flux\packages\ui\src\index.ts`
- **证据片段**:
  ```ts
  // 公开导出大量基础组件，但包内直接测试仅覆盖少数组件
  // 代表性未见包内直接测试的公开组件：drawer、dropdown-menu、combobox、calendar、resizable、table、textarea、sidebar 等
  ```
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: `ui` 作为底层 owner 包，公开出口很多，但包内直接测试只覆盖少数组件。
- **建议**: 优先为高交互与高复用组件补基础 contract tests，而不是追求全量逐件单测。
- **为什么值得现在做**: 公共 UI owner 包的直接回归保护明显不足，容易把上层问题定位成本转嫁到消费者包。
- **误报排除**: 这不是要求所有组件都逐件单测；问题在于公开面与直接回归覆盖之间存在明显缺口。
- **历史模式对应**: 对应公共基础组件包公开面增长快于直接测试覆盖的模式。
- **参考文档**: `AGENTS.md`
- **复核状态**: 未复核

### [维度14-03] `spreadsheet-renderers` 的公开 host/manifest 合同缺少直接测试

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-manifest.ts`
- **证据片段**:
  ```ts
  // 未见包内直接测试命中：SPREADSHEET_MANIFEST_V1、resolveSpreadsheetManifest、
  // spreadsheetHostContract、SPREADSHEET_CAPABILITY_PUBLICATION
  ```
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: 现有测试覆盖 grid、schema integration 和部分 action provider，但 host manifest/contract 公开 owner 边界缺少直接测试。
- **建议**: 为 manifest 解析、public contract shape 与 capability publication 补直接 contract tests。
- **为什么值得现在做**: 这些符号属于公开边界，缺少直接测试会放大宿主接线回归风险。
- **误报排除**: 不是因为包测试数量少就机械报；这里是明确 public contract 缺直接测试。
- **历史模式对应**: 对应 host manifest/contract 面缺少 owner-level regression tests 的模式。
- **参考文档**: `AGENTS.md`
- **复核状态**: 未复核

### [维度14-04] `flux-code-editor` 的公开 source resolver 面缺少直接测试

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\source-resolvers.ts`
- **证据片段**:
  ```ts
  // 对外导出但未见包内直接测试命中：
  // useResolvedVariables / useResolvedFunctions / useResolvedTables / useResolvedSQLVariables
  ```
- **严重程度**: P2
- **类别**: 覆盖缺口
- **现状**: 当前包已有 renderer integration、CodeMirror、completion 类测试，但编辑器配置与补全绑定的核心 source resolver 语义缺少直接测试。
- **建议**: 增加 source resolver hook 层的 focused tests，覆盖不同 resolver 组合与空数据边界。
- **为什么值得现在做**: 这是编辑器配置绑定的核心 owner 语义，回归时难以仅靠集成测试快速定位。
- **误报排除**: 不是追求测试纯数量；这里针对的是对外导出的核心解析面。
- **历史模式对应**: 对应公开 hook/contract 层只被间接覆盖、缺少直接测试的模式。
- **参考文档**: `AGENTS.md`
- **复核状态**: 未复核

## 包级测试概况摘要

- 直接测试密度偏弱的包：`packages/ui`、`packages/spreadsheet-renderers`、`packages/spreadsheet-core`、`packages/flow-designer-core`、`packages/flux-code-editor`、`packages/flux-i18n`
- 覆盖较强的包：`packages/flux-runtime`、`packages/flux-renderers-form-advanced`、`packages/flux-react`、`packages/flux-compiler`

## 初审排除项

- `test-module-top-let` suspects：
  - `packages/flux-code-editor/src/use-code-mirror.test.tsx`
  - `packages/flux-renderers-form-advanced/src/detail-view/detail-view-owner-updates.test.tsx`
  - `packages/report-designer-renderers/src/field-panel-renderer.test.tsx`
  - 已确认有局部重置或受控使用，不构成真实泄漏。
- `test-global-patch` 未保留：
  - `apps/playground/src/pages/performance-table/measurement.test.ts`
  - `packages/flux-react/src/__tests__/schema-renderer-runtime-scope.test.tsx`
  - 已通过 `finally` 或等价恢复完成清理。
- `>400` 行测试文件未因体量本身报问题；本轮仅保留 `word-editor-page-actions.test.tsx` 的真实隔离缺陷。

## 维度复核结论

- [维度14-01]：保留 (P1)。`window.confirm` 全局补丁泄漏成立。
- [维度14-02]：降级为 P2。更适合作为公开组件回归覆盖债务，而不是单条强缺陷。
- [维度14-03]：降级为 P2。manifest/hostContract 直测缺口成立，但现有集成测试已提供部分间接保护。
- [维度14-04]：保留 (P2)。`flux-code-editor` 的公开 source resolver hooks 缺少直接测试，核心 owner 语义缺口成立。

## 子项复核结论

- [维度14-01]：成立。新增 `window.confirm` 未被删除。
- [维度14-04]：成立。resolver hook 公开面缺少直接测试，尤其 scope/source 分支无 focused contract tests。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                             | 一句话摘要                              |
| ----- | -------- | -------------------------------------------------------------------------------- | --------------------------------------- |
| 14-01 | P1       | `packages/word-editor-renderers/src/__tests__/word-editor-page-actions.test.tsx` | 新装 `window.confirm` 后未完整恢复      |
| 14-04 | P2       | `packages/flux-code-editor/src/source-resolvers.ts`                              | 公开 source resolver hooks 缺少直接测试 |
