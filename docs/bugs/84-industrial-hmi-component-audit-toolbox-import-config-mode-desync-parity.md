# 84 Industrial HMI Component Audit — toolbox `importConfig` Mode Desync Parity Gap

> Source: HCA11 P1-1（editor infra 审计，test-first 修复）；审计记录 `docs/audits/2026-08-08-1316-hca11-editor-infra.md`。归档 plan `docs/plans/2026-08-08-1430-1-*.md`。

## Problem

- `toolbox-runtime.importConfigFn` 在 `engine.build` 后未同步 `engine.mode` → 在 preview 态调用 importConfig 后，`session.mode='edit'`（resetSession 强制）但 `engine.mode` 仍为 `'preview'` → session/engine mode desync。
- 与 `runtime-mutators.ts` `load()` 的 P1-08 同型，是一条跨点 parity 缺口（两个 import/load 站点，一个有 setMode 同步、一个没有）。

## Diagnostic Method

- 诊断难度：desync 表现为「导入后编辑态行为异常」，根因在两个 import/load 站点的 parity 缺口，需对比 `runtime-mutators.load` 才能发现。
- 调查路径：HCA11 editor infra 审计 dim 22（集成接线）发现 `toolbox-runtime.ts:221-241` importConfigFn 在 `engine.build(session.workingConfig)` 后无 mode 同步；交叉比对 `runtime-mutators.ts` `load()`（P1-08 已有 setMode 同步）→ 同型缺口。
- 决定性证据：failing-first 测试（`scada-editor-canvas-ops.test.tsx`）证明 preview 态 importConfig 后 engine.mode 未校正。

## Root Cause

- `toolbox-runtime.ts` importConfigFn 调 `engine.build(session.workingConfig)` 后未同步 `engine.mode`。
- `resetSession` 强制 `session.mode='edit'`，`engine.build` 用 `engine.mode` 决定 editable 注入；若此前在 preview 态调用 importConfig，`engine.mode` 保持 `'preview'`。
- 跨点 parity：`toolbox-runtime.importConfig` ↔ `runtime-mutators.load`（P1-08 同型），两个 import/load 站点发散。

## Fix

- `editor/toolbox-runtime.ts:238-239` — importConfigFn 在 `engine.build` 后增 `if (engine.currentMode !== session.mode) engine.setMode(session.mode);`（与 `runtime-mutators.load` 同型同步）。

## Tests

- `src/editor/scada-editor-canvas-ops.test.tsx` — failing-first 测试：preview 态 importConfig 后断言 `engine.mode` 同步为 session.mode（断言结果值）。

## Affected Files

- `packages/flux-renderers-industrial/src/editor/toolbox-runtime.ts`

## Notes For Future Refactors

- 所有 import / load 入口在 `engine.build` 后必须同步 `engine.mode → session.mode`（P1-08 parity）。
- 新增 import/load 路径时，复制此 setMode 同步；该 parity 缺口跨多点（runtime-mutators.load / toolbox-runtime.importConfig），易在新站点复发。
