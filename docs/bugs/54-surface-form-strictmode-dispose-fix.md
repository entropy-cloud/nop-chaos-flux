# 54 Surface Form StrictMode Dispose Fix

## Problem

- Playground `#/lab/drawer` 的 right drawer 中 textarea 无法录入。
- `#/lab/dialog` 中 dialog surface 的 form input 有同类症状。
- Playwright `fill()` 后 DOM value 先变成正确文本，随后又被 React 受控值恢复为 `""`。

## Diagnostic Method

- 新增单独 e2e 复现文件，只跑 dialog/drawer surface form 输入，不跑大批测试。
- 浏览器内捕获 `focus`、`beforeinput`、`input` 事件，确认原生 `input` 事件发生时 value 已经是正确文本。
- 临时在真实 input/textarea renderer 的 React handler 内记录调用，确认 `onChange` 收到了正确值。
- 误判并撤回了 `dialog-host` 中给 `Dialog` / `Drawer` 传 `modal={false}` 的方案：它能绕开部分焦点怀疑，但会破坏 modal 语义，不是根因修复。

## Root Cause

- Playground 运行在 React dev `StrictMode` 下。
- `FormRenderer` 用 `useEffect(() => () => ownedForm.dispose(), [ownedForm])` 直接清理 form runtime。
- StrictMode 的 effect replay 会先执行一次 cleanup，再重新执行 effect；cleanup 提前 dispose 了仍被当前组件复用的 `ownedForm`。
- 后续输入事件 handler 虽然收到正确文本，但 `FormRuntime.setValue(...)` 在 disposed 状态下直接 no-op，React 受控 input/textarea 因 store 仍为空而恢复成 `""`。

## Fix

- `packages/flux-renderers-form/src/renderers/form.tsx` 现在跟踪当前挂载的 owned form。
- cleanup 不再同步 dispose，而是 microtask 延迟判断：如果组件没有重新挂载，或 active form 已换成另一个实例，才 dispose 旧 form。
- Dialog/Drawer 仍保持默认 modal 语义，不通过 `modal={false}` 规避问题。

## Tests

- `packages/flux-renderers-form/src/__tests__/form-field-handlers.test.tsx` verifies real `input-text` remains writable under React StrictMode effect replay.
- `tests/e2e/component-lab/surface-form-input.spec.ts` verifies dialog surface input and drawer surface textarea keep typed values in the real playground.

## Affected Files

- `packages/flux-renderers-form/src/renderers/form.tsx`
- `packages/flux-renderers-form/src/__tests__/form-field-handlers.test.tsx`
- `tests/e2e/component-lab/surface-form-input.spec.ts`

## Notes For Future Refactors

- Renderer-owned runtimes created with `useMemo` must not be synchronously disposed in plain effect cleanup if they can be replayed by StrictMode.
- If input handler receives the correct value but the controlled input snaps back, inspect owner runtime lifecycle before changing field binding or modal/focus behavior.
- Do not use `modal={false}` as a default workaround for Dialog/Drawer form input bugs.
