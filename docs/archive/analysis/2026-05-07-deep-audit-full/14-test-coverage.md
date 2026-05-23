# 14 Test Coverage

- 深挖轮次: 3
- 深挖发现数: 13
- 维度复核: 6 保留 / 4 降级 / 3 驳回
- 子项复核: 无高风险逐项新增成立项

## 第 1 轮初审

- async-data 控制器仅被间接覆盖
- form 语义提交缺 E2E 闭环
- `basic-page-layout.test.tsx` 超 700 且跨域
- `use-table-controls.test.tsx` 超 700 且混合五类 hook
- `designer-controls.test.tsx` 全局 spy 未恢复

## 深挖第 2 轮追加

- debugger hub/browser 闭环未测
- report designer selection -> inspector target 覆盖不完整
- spreadsheet 复合交互能力多为 API 形状校验，缺直接行为测试
- report-designer 页面初始化失败通知路径未测

## 深挖第 3 轮追加

- report-toolbar 点击路径未测且疑似双前缀命令错误
- report-inspector-shell loading/error 分支覆盖不足
- report field drag-drop 到 cell 闭环未测
- report-designer-page namespace cleanup/core.dispose 生命周期未测

## 维度复核结论

保留:

- form 语义提交 E2E 缺口
- debugger hub/browser 闭环未测
- report-designer 初始化失败通知路径未测
- report-toolbar 点击路径未测且实现疑点未被测试锁住
- report-inspector-shell loading/error 分支覆盖不足
- report-designer-page namespace cleanup/core.dispose 生命周期未测

降级:

- `basic-page-layout.test.tsx` 过大且跨域
- `use-table-controls.test.tsx` 过大且混合多 hook
- selection -> inspector target 覆盖不完整
- spreadsheet 复合交互 hook 的直接行为测试不足

驳回:

- async-data “仅间接覆盖”
- `designer-controls.test.tsx` spy 未恢复
- report field drag-drop 到 cell 未测

## 最终保留项

### [维度14] 表单语义提交链路仍缺真实浏览器级 E2E 闭环

- **文件**: `tests/e2e/component-lab/simple-form.spec.ts`, `packages/flux-renderers-form/src/__tests__/form-submit-actions.test.tsx`
- **严重程度**: P1
- **现状**: 单测覆盖 submitAction/onSubmitSuccess/onSubmitError/onValidateError，但缺 Enter/native submit 语义路径的浏览器级回归测试
- **风险**: 单测 wiring 正常不代表真实 `<form>` 提交链路、校验拦截与 preventDefault 一定正常
- **建议**: 增补 success/error/validate-block/Enter submit 的 E2E
- **复核状态**: 维度复核通过

### [维度14] Report Designer 页面级交互与生命周期的几条关键失败/清理路径仍无测试保护

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/report-designer-toolbar.tsx`, `packages/report-designer-renderers/src/inspector-shell-renderer.tsx`
- **严重程度**: P2
- **现状**: init refresh failure notify、toolbar click dispatch、inspector loading/error、unmount cleanup 都缺直接测试
- **风险**: 这些跨边界路径很容易在重构中静默回归
- **建议**: 为页面初始化失败、toolbar dispatch 参数、shell 分支、namespace unregister/core.dispose 各补 focused test
- **复核状态**: 维度复核通过

### [维度14] Debugger 多控制器 hub/browser 闭环仍无浏览器级验证

- **文件**: `tests/e2e/debugger.spec.ts`, `packages/nop-debugger/src/automation.ts`
- **严重程度**: P2
- **现状**: 现有 E2E 主要覆盖单面板 API，未直接验证 `__NOP_DEBUGGER_HUB__` 的注入、路由、销毁
- **风险**: 多控制器共存时的覆盖/切换/卸载回归难以及早发现
- **建议**: 为 hub 可用性、controllerId 切换、卸载清理补浏览器级测试
- **复核状态**: 维度复核通过
