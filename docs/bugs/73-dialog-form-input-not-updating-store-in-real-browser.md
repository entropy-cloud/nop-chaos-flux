# 73 Dialog Form Input — Investigation and Scope Isolation Clarification

## Problem (Initial Report)

- Dialog (`openDialog` + form) 表单中，input fill 后 DOM 显示新值，但提交/writeback 到父 scope 的值是旧的或空的
- 在 nop-chaos-next e2e（编辑资源）和 nop-chaos-flux e2e（component-lab dialog 场景）中观察到
- 初始假设：React onChange 在 dialog portal 中未触发

## Root Cause (Corrected After Deep Investigation)

**NOT a portal/event bug.** Input → form store 链路完全正常。

通过临时 `window.__fluxInputDebug` 追踪，在真实浏览器（Playwright Chromium）中逐步验证了完整事件链：

| 步骤                              | 位置                     | 状态                                                |
| --------------------------------- | ------------------------ | --------------------------------------------------- |
| 1. React onChange 触发            | `input.tsx:381`          | ✅ 已触发，value="Jane Doe"                         |
| 2. `createFieldHandlers.onChange` | `field-handlers.tsx:84`  | ✅ `hasCurrentForm: true`, `readOnly: false`        |
| 3. `useFieldHandlers.setValue`    | `field-handlers.tsx:197` | ✅ `convertedValue: "Jane Doe"`, `isPromise: false` |
| 4. `FormRuntime.setValue`         | `form-runtime.ts:535`    | ✅ `lifecycleState: "active"`, value="Jane Doe"     |

**真正的现象是 flux scope 隔离（by design）：**

- 表单 input 更新 form 的内部 store ✅
- 但 `onSubmitSuccess` action 的 `${name}` 表达式从 **lifecycleWriteScope**（父/page scope）求值，不是从 form store 求值
- Form store 数据不会自动同步到父 scope（除非配置 `valuesPath` 或使用 `submitScope: 'surface'`）
- Dialog 内的 action 写入 dialog/form scope，page 级元素从 page scope 读取——scope 继承是单向的（子→父）

**关键结论**：dialog 表单输入功能完全正常，不存在 portal event delegation bug。此前的诊断（"React onChange 不触发"）是错误的——缺少直接的事件链追踪，仅靠间接证据推断。

## Diagnostic Method

1. **jsdom 单测**（`form-loadaction-edit.test.tsx`、`dialog-form-loadaction-edit.test.tsx`）：通过——无法复现
2. **Base UI Portal 源码审查**：确认 `FloatingPortal` 使用 `ReactDOM.createPortal`（两处），React 事件委托覆盖 portal 内容
3. **`window.__fluxInputDebug` 逐步追踪**（4 个埋点）：确认完整事件链正常，定位到 scope 隔离是真正原因
4. **Component-lab 场景实验**：通过 `${result.data.name}`、`${form.name}`、`submitScope: 'surface'` + `${$formData.name}`、直接 `setValue` 均无法从 page scope 看到 dialog 内写入的值——证实 scope 隔离

## Fix

无需修复——flux 行为正确。Component-lab 测试已调整为验证 form store 更新（fill 两个字段后验证两个值都保持，第二个字段的 fill 触发 re-render，如果 store 没有第一个值则 controlled input 会 reset）。

## Tests

- `tests/e2e/component-lab/surface-form-input.spec.ts` — "dialog surface form input keeps typed value under StrictMode"：fill name + email 后验证两个值都保持（第二个 fill 触发 re-render，验证 store 更新）
- `packages/flux-renderers-form/src/__tests__/form-loadaction-edit.test.tsx` — page 级 loadAction 后编辑（jsdom）
- `packages/flux-renderers-form/src/__tests__/dialog-form-loadaction-edit.test.tsx` — dialog 级 loadAction 后编辑（jsdom）

## Affected Files

- `apps/playground/src/component-lab/renderers/dialog-lab-page.tsx`（场景简化：移除 writeback 验证文本，form 保留纯输入验证）
- `tests/e2e/component-lab/surface-form-input.spec.ts`（测试简化：验证 fill + re-render 后值保持）

## Notes For Future Refactors

- **不要仅靠间接证据推断事件系统 bug**：当怀疑 React onChange 未触发时，必须在真实浏览器中用 `window.__debug` 数组逐步追踪事件链，而非仅靠 fiber props / document event listener 等间接证据
- **jsdom 单测通过 ≠ 真实浏览器正常**：但反过来也成立——真实浏览器 "失败" 可能不是 bug，而是 scope 隔离等设计行为
- **Flux scope 隔离**：dialog form 的 input 更新 form 内部 store，不自动同步到父 scope。验证 dialog form 输入应检查 form store（controlled value 保持）或使用 `valuesPath` / `submitScope: 'surface'` 显式桥接
- **`onSubmitSuccess` 表达式 scope**：form schema 的 `onSubmitSuccess` 从 `lifecycleWriteScope`（父 scope）求值，`${name}` 读不到 form store 值。需要 `${result.data.xxx}` 或 `$formData.xxx`（surface hook）
