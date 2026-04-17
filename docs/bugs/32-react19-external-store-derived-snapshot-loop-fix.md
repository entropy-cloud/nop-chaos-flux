# 32 React 19 External Store Derived Snapshot Loop Fix

## Problem

- `packages/report-designer-renderers` 的多组测试同时失败，错误表面集中在 `ReportSpreadsheetCanvas`，报错是 `Maximum update depth exceeded`。
- 控制台同时出现 `The result of getSnapshot should be cached to avoid an infinite loop`，但初看很容易误判成 `report-designer-renderers` 自己的 effect 循环或 selection 同步写回问题。
- 最小可见症状是只要渲染带 spreadsheet canvas 的 report designer page，React 19 就会在 mount 后进入无限重渲染。

## Diagnostic Method

- **Diagnosis difficulty: high.** 失败栈顶在 `ReportSpreadsheetCanvas`，而且这个组件内部确实有 `useEffect`、selection 同步和 field drop 逻辑，第一眼非常像组件本地死循环。
- 先单独运行 `pnpm --filter @nop-chaos/report-designer-renderers test`，确认不是 workspace 调度或其他包串扰。
- 再读 `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`、`page-renderer.tsx` 和 `host-data.ts`，优先排查会在 mount 后写回 store 的 effect；这些路径都没有解释 React 19 的 `getSnapshot should be cached` 警告。
- 然后顺着 canvas 内部调用链追到 `useSpreadsheetInteractions()`，再追到 `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-snapshot.ts`，确认真正触发 `useSyncExternalStore(...)` 的不是 report designer core，而是 spreadsheet bridge。
- 决定性证据来自 `packages/spreadsheet-renderers/src/bridge.ts`：`bridge.getSnapshot()` 每次都重新调用 `deriveHostSnapshot(runtime)`，即使底层 `core.getSnapshot()` 没变，也会返回一个全新的派生对象；这正好违反了 React 19 对 external store snapshot 引用稳定性的要求。

## Root Cause

- `packages/spreadsheet-renderers/src/bridge.ts` 的 `createSpreadsheetBridge().getSnapshot()` 把 spreadsheet core runtime snapshot 映射为 host snapshot，但没有缓存派生结果。
- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-snapshot.ts` 通过 `useSyncExternalStore()` 订阅 bridge；在 React 19 下，如果 `getSnapshot()` 在 store 未变化时仍返回新对象，就会触发无限重渲染保护。
- 由于报错发生在消费方 `ReportSpreadsheetCanvas`，症状会误导成 report designer renderer 的 effect/selection 问题，实际根因在更下游的 spreadsheet bridge 边界。

## Fix

- 在 `packages/spreadsheet-renderers/src/bridge.ts` 中缓存最近一次 spreadsheet core runtime snapshot 及其对应的派生 host snapshot。
- 只有当 `core.getSnapshot()` 返回的 runtime snapshot 引用变化时，才重新执行 `deriveHostSnapshot(runtime)`；否则复用上一次的 host snapshot 对象。
- 这样修复后，bridge 继续提供派生 host 视图，但满足 `useSyncExternalStore` 对“未变更时快照引用稳定”的要求，report designer 和其他 spreadsheet bridge 消费者都会一起受益。

## Tests

- `packages/spreadsheet-renderers/src/bridge.test.ts`
  - 验证重复调用 `bridge.getSnapshot()` 时，在底层 core 未更新前返回同一个对象引用。
  - 验证 dispatch 更新 core 后，bridge 会产出新的 snapshot，并在后续读取中再次保持稳定。
- `packages/report-designer-renderers/src/report-designer-toolbar.test.tsx`
  - 通过 package test pass 间接保护 report designer page 不再因为 spreadsheet canvas mount 而进入无限更新。
- `packages/report-designer-renderers/src/renderers.integration.test.tsx`
  - 通过 namespaced action / host scope 集成测试覆盖带 spreadsheet canvas 的 page 渲染路径。

## Affected Files

- `packages/spreadsheet-renderers/src/bridge.ts`
- `packages/spreadsheet-renderers/src/bridge.test.ts`
- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-snapshot.ts`
- `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`
- `packages/report-designer-renderers/src/page-renderer.tsx`

## Notes For Future Refactors

- 任何给 `useSyncExternalStore` 暴露的 `getSnapshot()`，如果返回的是派生对象而不是底层 store 自身快照，必须显式保证“底层未变时返回同一引用”。
- 当 React 19 报 `getSnapshot should be cached` 时，不要只盯着报错组件；优先沿着订阅链回溯到 bridge / adapter / selector 边界。
- 如果 bridge 负责把 runtime snapshot 投影为 host snapshot，缓存应当放在 bridge 边界，而不是让每个消费组件各自补防抖或防循环逻辑。
