# 维度 02：模块职责与文件边界

## 初审

- 命令基线：`pnpm check:oversized-code-files` 命中 1 个 `>700` 文件，42 个 `>500` 警告项。
- 初审只保留 1 条。

## 维度复核

- 保留：`action-dispatcher.test.ts` 超过 700 行且跨多组核心语义。
- 其余 `>500` 文件维持观察，不升级。

## 最终结论

### [维度02] `action-dispatcher.test.ts` 超过 700 行且跨语义混杂

- **文件**: `packages/flux-action-core/src/__tests__/action-dispatcher.test.ts:17-701`
- **证据片段**:
  ```ts
  describe('action-dispatcher dispatch ordering', () => {
  // built-in / component / continueOnError / then / onError / parallel / dispose / when
  ```
- **严重程度**: P1
- **现状**: 单文件同时覆盖 dispatcher 的多组核心语义，并已跨过仓库 `>700` 硬阈值。
- **风险**: 回归定位和后续增量维护成本持续上升。
- **建议**: 按 dispatch、branch、parallel、lifecycle 等语义拆成多个测试文件。
- **参考文档**: `AGENTS.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: `维度复核通过`
