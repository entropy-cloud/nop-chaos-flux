# 85 Industrial HMI Component Audit — Config Snapshot `custom` Shallow-Clone Isolation Gap

> Source: HCA11 P2-1（editor infra 审计，test-first 修复，扩展 plan 2026-08-08-0900-1 P2 #4 R5 Layer 2）；审计记录 `docs/audits/2026-08-08-1316-hca11-editor-infra.md`。归档 plan `docs/plans/2026-08-08-1430-1-*.md`。

## Problem

- `editor-working-helpers.cloneNodeDeep` 与 `runtime-mutators.save` 浅克隆 `custom`（及 `committedBaseline`）→ working copy 对 `custom.connections` 的 in-place 改动会串改 prevSnapshot / synced.config / committedBaseline 等多份快照。
- 跨快照数据污染（R5 Layer 2 `custom` 隔离纪律的残留缺口，扩展 plan 0900-1 P2 #4）。

## Diagnostic Method

- 诊断难度：表现为「撤销 / 基线比对行为异常」，根因在多处 clone 站点对 `custom` 子对象的浅拷贝，需跨文件比对（`editor-working-helpers` ↔ `runtime-mutators` ↔ `editor-session`）。
- 调查路径：HCA11 editor infra 审计发现 `editor-working-helpers.ts:79-83` `cloneNodeDeep` 递归克隆 children 但 `custom` 按引用拷贝；`runtime-mutators.ts:191-202` `save` 设 `committedBaseline` 时共享 custom ref。交叉比对 `editor-session.cloneNode`（已深克隆 custom，R5 纪律）→ 同型残留。
- 决定性证据：failing-first 测试证明 working copy 改 `custom.connections` 后 baseline 快照被串改。

## Root Cause

- `cloneNodeDeep` 只递归克隆 `children` 子树，`custom` 子对象按引用拷贝（浅）。
- `save` 设 `committedBaseline` 时经一条共享 custom ref 的路径，未整体深克隆。
- 跨点隔离纪律：`editor-working-helpers` ↔ `runtime-mutators` ↔ `editor-session`（R5 Layer 2 `custom` 隔离系列）——多站点，部分已修、部分残留。

## Fix

- `editor/editor-working-helpers.ts:84` — `cloneNodeDeep` 增 `if (node.custom) clone.custom = structuredClone(node.custom);`（对齐本函数 doc「deep-cloned」声明 + `editor-session.cloneNode` 纪律）。
- `editor/runtime-mutators.ts:196` — `save`（`:191`）改用 `session.committedBaseline = cloneConfigSnapshot(session.workingConfig)`（深克隆，含 custom）。

## Tests

- `src/editor/editor-session.test.ts` — failing-first：working copy 改 `custom.connections` 后 baseline 快照 custom 不被串改（断言结果值）。
- `src/editor/scada-editor-canvas-ops.test.tsx` — failing-first：save 后 committedBaseline 与 working copy 的 custom 子对象引用隔离。

## Affected Files

- `packages/flux-renderers-industrial/src/editor/editor-working-helpers.ts`
- `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts`

## Notes For Future Refactors

- 所有 config / node clone 路径必须深克隆 `custom`（R5 Layer 2 隔离纪律）——`children` 已递归，`custom` 同样必须 `structuredClone`。
- 新增快照 / clone 路径时，用 `cloneConfigSnapshot`（整体）或显式 `structuredClone(node.custom)`；该隔离缺口跨多站点（session / working-helpers / mutators / undo-redo-adapter），易在新 clone 路径复发（HCA11 P3-1 记录 `undo-redo-adapter.cloneNodeDeep` 同型残留，归 HCA-CR）。
- **Lesson 回链（HCA-LL）**：已沉淀为 industrial 专项检查点——`docs/audits/component-audit-checklist.md` §2.1 IND-4 / IND-5（custom 深克隆隔离）+ `docs/skills/deep-audit-prompts.md` 项目校准说明（跨点 custom 克隆一致性）。catalog 终态见 `docs/plans/2026-08-08-1527-2` §裁定结果 L-ED-3。
