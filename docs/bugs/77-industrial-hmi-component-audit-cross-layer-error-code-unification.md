# 77 Industrial HMI Component Audit — Cross-Layer Error Code Unification (`invalid-config` vs `config-invalid`)

> Source: HCA1 / HCA7 审计卡（`docs/audits/per-component/scada-editor-canvas.md` P2-4 shared）；共性 work item HCAX-1（roadmap `done`）。归档 plan `docs/plans/2026-08-08-1430-1-*.md`。

## Problem

- host（嵌入 scada-canvas / scada-editor-canvas 的应用）收到的 config 校验失败 error code 在两个 renderer 间语义不一致。
- runtime `scada-canvas` 对 config 校验失败发 `config-invalid`（升级画布 error 码）；editor `scada-editor-canvas` 的 `parseAndValidateConfig` 却发 `invalid-config`（命令句柄失败码，不升级）。
- 后果：editor 侧的 `isElevatedError`（`editor-errors.ts:63` 只识别 `config-invalid`）认不出 editor 自己抛出的 config 校验失败 → 升级面 / 错误展示分支被错误跳过。

## Diagnostic Method

- 诊断难度：两个码字面相似（`invalid-config` vs `config-invalid`，仅连字符位置与词序不同），易被当成同一码拼写差异而忽略。
- 调查路径：HCA7 dim 18（注册、包边界与 IO/安全红线）审计交叉比对两 renderer 的 `parseAndValidateConfig` 出口码 → 发现 runtime `scada-canvas.tsx:46` 用 `config-invalid`，editor `scada-editor-canvas.tsx:42` 用 `invalid-config`。
- 决定性证据：`scada-errors.ts` 把两码分到不同类别——`config-invalid` 列入「升级画布 error」族（`:44`），`invalid-config` 列入「命令句柄失败码」族（`:55`）；`editor-errors.ts:63` 的 elevated 判定只认 `config-invalid`。

## Root Cause

- 工业包的错误码设计存在两类语义：**升级码**（config 校验失败 / engine 创建失败 → 触发 empty error region）与**命令句柄码**（命令执行失败，不升级画布）。
- editor `parseAndValidateConfig` 误用了命令句柄码 `invalid-config` 来表达「config 校验失败」，本应使用升级码 `config-invalid`。
- 跨层：renderer（runtime + editor）+ runtime-mutators / toolbox-runtime 的 error code parity。

## Fix

- editor `scada-editor-canvas.tsx:42` `parseAndValidateConfig` 失败码统一为 `config-invalid`（与 runtime `scada-canvas.tsx:46` 同码）。
- `invalid-config` 作为命令句柄失败码保留（`scada-errors.ts:55` / `editor-errors.ts:19`），`editor-errors.ts:63` 的 elevated 判定认 `config-invalid`。语义切分一致。
- 对应共性 work item HCAX-1（roadmap `done`）。

## Tests

- `src/renderer/scada-errors.test.ts:63` — 断言 `SCADA_ERROR_CODES` 含 `config-invalid`。
- `src/renderer/scada-event-actions.test.tsx:280` — 断言 config 校验失败事件 code 为 `config-invalid`。
- `src/renderer/scada-canvas-lifecycle.test.tsx:453,473` — 断言 error region `data-code` 与事件 code 为 `config-invalid`。

## Affected Files

- `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx`
- `packages/flux-renderers-industrial/src/editor/renderer/editor-errors.ts`
- `packages/flux-renderers-industrial/src/renderer/scada-errors.ts`
- `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx`

## Notes For Future Refactors

- 错误码设计：**升级码 vs 命令句柄码不可混用**。新增 config 校验失败路径必须用 `config-invalid`（升级），命令执行失败才用 `invalid-config`。
- 新增 renderer / public API 校验路径时，核对出口码与 `editor-errors.ts` elevated 判定 / `scada-errors.ts` 分类表一致。
