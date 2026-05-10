# Exploratory E2E Run 01 — Main Round 01

## 轮次标识

main-round-01

## 执行者身份

主执行者

## 本轮覆盖的页面列表和交互类型

### Domain Pages (9)

- `flux-basic`, `flow-designer`, `dingtalk-flow-demo`, `report-designer`, `debugger-lab`, `condition-builder`, `code-editor`, `word-editor`, `performance-table`
- Interaction: 首次加载 + round-trip 二次导航

### Component Lab (43 renderers)

- 全部 COMPONENT_LAB_COVERAGE_MANIFEST 中的 renderer
- Interaction: 批量打开，零错误断言

### Interaction Tests

- 表单空提交 + 填写 + 重提交
- 对话框打开/关闭 (Escape 键, 确认)
- 抽屉打开/保存
- 标签页切换 (含 disabled tab 处理)
- 动态渲染器快速切换
- 反应式计数器递增
- 数组字段增删
- 条件构建器规则变更
- 变体字段模式切换
- 详细字段编辑对话框
- Select/Checkbox/Switch/Radio 交互

## 本轮新增问题类别

### Issue #1: Lab 页面 schema 使用了 formula compiler 不支持的跨 scope 路径表达式

- **页面**: `checkbox-group` lab, `tag-list` lab
- **操作步骤**: 打开 `#/lab/checkbox-group` 或 `#/lab/tag-list` 页面
- **错误现象**: `console.error: Template evaluation failed for: ${(skillsForm.skills ?? []).join(...)}`
- **根因**: Lab 页面 schema 中的 text 节点放在了 page 级别而非 form body 内部，试图通过 `formName.fieldName` 跨 scope 引用 form 数据。Formula compiler 不支持这种跨 form scope 的路径。
- **去重键**: `formula-compiler / cross-form-scope / template-eval`

### Issue #2: Lab 页面 schema 使用了 formula compiler 不支持的 JS 全局对象

- **页面**: `variant-field` lab
- **操作步骤**: 打开 `#/lab/variant-field` 页面
- **错误现象**: `console.error: Template evaluation failed for: ${Array.isArray(filterValue) ? ...}`
- **根因**: Formula 语言没有暴露 JavaScript `Array` 全局对象。`Array.isArray` 无法被 formula evaluator 解析。
- **去重键**: `formula-compiler / unsupported-global / Array.isArray`

## 本轮新增或修改的 e2e 测试文件

1. `tests/e2e/exploratory/domain-page-zero-error.spec.ts` — 9 domain page zero-error tests + 2 round-trip navigation tests
2. `tests/e2e/exploratory/lab-batch-zero-error.spec.ts` — 43 renderer lab batch zero-error tests
3. `tests/e2e/exploratory/interaction-tests.spec.ts` — 16 interaction tests covering forms, dialogs, drawers, tabs, dynamic-renderer, reaction, complex form fields

## 本轮修复情况

### Fixed: Issue #1 (checkbox-group, tag-list)

- **文件**:
  - `apps/playground/src/component-lab/renderers/checkbox-group-lab-page.tsx` — 将 text 节点从 page 级别移入 form body 内部，使用直接字段名 `skills` 替代 `skillsForm.skills`
  - `apps/playground/src/component-lab/renderers/tag-list-lab-page.tsx` — 同样将 text 节点移入 form body，使用 `tags`/`labels` 替代 `tagListForm.tags`/`labelForm.labels`

### Fixed: Issue #2 (variant-field)

- **文件**:
  - `packages/flux-formula/src/builtins.ts` — 新增 `ISARRAY` builtin 函数
  - `apps/playground/src/component-lab/renderers/variant-field-lab-page.tsx` — 将 `Array.isArray(filterValue)` 替换为 `ISARRAY(filterValue)`，将 `(filterValue ?? []).join(", ")` 替换为 `JOIN(filterValue ?? [], ", ")`

## 本轮延后问题

无

## 本轮三层监控断言结果汇总

- **第一层 (page-level console.error + pageerror)**: 所有 domain 页面 (9/9) 零错误。Lab 批量 40/43 通过，3 个因 schema 错误失败（已修复后全部通过）。交互测试 14/16 通过（2 个因同一 schema 问题失败，已修复）。
- **第二层 (debugger API)**: 所有通过的页面均检查 `queryEvents({ kind: 'error' })` 为空。
- **第三层 (scope-debug)**: Lab 批量测试验证了 primary scenario 可见。

## 修复后完整测试结果

- 全量 E2E: **311 passed, 0 failed, 3 skipped** (8.6 min)
- typecheck: **48/48 packages passed**

## 本轮是否已耗尽

主执行者内部已覆盖：

- 全部 9 个 domain 页面的首次加载和二次导航
- 全部 43 个 Lab renderer 的批量零错误
- 16 种交互场景
- 1 个已知 performance-table 失败（timeout，非新问题）

主执行者认为已找不到新的高价值问题类别。

## 下一轮建议方向

交给独立子 agent 重新执行探索，重点：

1. 使用 debugger API 的 `getNodeDiagnostics()`, `getRecentFailures()`, `getNodeAnomalies()` 主动探测隐藏问题
2. 尝试更复杂的交互组合：快速连续打开/关闭 dialog、嵌套 dialog、并发 action 触发
3. 从不同顺序遍历 domain 页面
4. 检查 Flow Designer 画布交互零错误
