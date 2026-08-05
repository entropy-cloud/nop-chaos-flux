# 02 Industrial HMI 公共 API 面与死模块 hygiene

> Plan Status: completed
> Last Reviewed: 2026-08-05
> Source: `docs/components/roadmap-industrial-hmi.md` §Follow-up Backlog「2026-08-05-0653 post-remediation audit P2」两条仍 open 条目（multi-audit P2-1 / P2-3）；源审计 `docs/audits/2026-08-05-0653-multi-audit-industrial-hmi.md`
> Mission: industrial-hmi
> Work Item: P2 post-remediation 收尾（公共面/死模块）
> Related: `2026-08-05-1253-1`（热路径 P2）、`2026-08-04-1558-1` Phase 2/3（公共面收敛基线）、`2026-08-04-2243-3` WM3（公共面/死代码/文档漂移收口基线）

## Purpose

收口 2026-08-05-0653 multi-audit 剩余 2 条公共面/死模块 P2 finding：① `serializeScadaConfig` 已在 `src/index.ts:54` 导出且 `§4.3` 声明为 design-contract 导出，但 `design-renderer.md §11` 公共导出面枚举（`:317`）遗漏；② `src/renderer/scada-canvas.types.ts`（1 行 re-export，全仓零导入者，rg 实核）仍被 `design-renderer.md §11` 实现布局（`:305`）认可为活模块。二者同属 `design-renderer.md §11` 公共面/实现布局一致性结果面，合并为单个 owner plan 单 Phase。

## Current Baseline

### 已成立（live repo 实核 2026-08-05）

- **公共面收敛基线**（plan `2026-08-04-1558-1` Phase 2 收口）：`src/index.ts` 导出面收敛到 register 函数 + 类型 + 符号注册表 API；plan `2026-08-04-2243-3` WM3 进一步移除泄漏的 `IndustrialRendererSchema`。
- **serializeScadaConfig 导出**（`src/index.ts:54`，plan `2026-08-04-1558-1` Phase 3 Decision 保留）：`export { serializeScadaConfig } from './serialization/serialize.js';`，`design-renderer.md §4.3:171` + `:177` 已声明其为 Phase 3 design-contract 导出（供 host 工具链直调），但 `§11` 公共导出面枚举（`:317`）列 register 函数 + 类型却**遗漏 `serializeScadaConfig`**。
- **scada-canvas.types.ts**（`src/renderer/scada-canvas.types.ts`）：单行 `export type { ScadaCanvasSchema, ScadaCanvasEvents } from '../schemas.js';`。全仓 rg（`*.ts`/`*.tsx`，含 packages/apps/tests）**零导入者**；`src/index.ts:16` 已直接从 `./schemas.js` 再导出同名类型。`design-renderer.md §11` 实现布局（`:305`）仍列该文件为活模块（`# ScadaCanvasSchema 类型（schemas.ts 再导出）`）。

### 真正剩余的 gap

- multi-audit P2-1：§11 公共导出面枚举遗漏 `serializeScadaConfig`（文档与 `index.ts:54` 实际导出不一致）。
- multi-audit P2-3：`scada-canvas.types.ts` 死模块（零导入者）仍被 §11 实现布局认可为活模块（文档与代码实际不一致）。

## Goals

- `design-renderer.md §11` 公共导出面枚举与 `src/index.ts` 实际导出逐项一致（含 `serializeScadaConfig`）。
- 零导入者死模块 `src/renderer/scada-canvas.types.ts` 删除，§11 实现布局同步移除该行。

## Non-Goals

- 不改 `src/index.ts` 实际导出面（已在 plan `2026-08-04-1558-1`/`2026-08-04-2243-3` 收敛定型）。
- 不改 `serializeScadaConfig` 的导出归属 Decision（§4.3 已裁定保留导出为契约诚实）。
- 不处理热路径 P2（归 sibling plan `2026-08-05-1253-1`）/ renderer 测试样板抽取（multi P2-2，归后续 round）。

## Scope

### In Scope

- `docs/components/industrial-hmi/design-renderer.md §11` 公共导出面枚举（`:317`）补 `serializeScadaConfig`。
- 删除 `packages/flux-renderers-industrial/src/renderer/scada-canvas.types.ts`。
- `docs/components/industrial-hmi/design-renderer.md §11` 实现布局（`:305`）移除 `scada-canvas.types.ts` 行。

### Out Of Scope

- `src/index.ts` / `renderer-definitions.ts` 代码变更（无死代码可删——仅文档侧与死模块文件）。
- 其他 §11 文档段落的改写。

## Failure Paths

不适用：纯文档 + 死模块删除，无错误处理/API 契约/鉴权/外部集成路径。

## Test Strategy

本档选择：`不适用：理由`

纯文档修正 + 零导入者死模块删除，无行为变更。验证手段为 typecheck/build（确认删除死模块无隐藏消费者）+ 文档与代码逐项核对一致性。Closure Gates 的 `pnpm test`/`lint` 仍跑（保证不回归），但无新增 focused 测试（无可测行为）。

## Execution Plan

### Phase 1 - §11 公共面枚举一致 + 死模块移除（multi-audit P2-1 + P2-3）

Status: completed
Targets: `packages/flux-renderers-industrial/src/renderer/scada-canvas.types.ts`、`docs/components/industrial-hmi/design-renderer.md` §11

- Item Types: `Fix`

- [x] **Fix（P2-1 枚举）**：`design-renderer.md §11` 公共导出面段落（`:317`）在 register 函数 + 类型枚举中补 `serializeScadaConfig`（序列化契约函数，与 §4.3:177 已有 Decision 对齐：design-contract 导出供 host 工具链直调，无 live 内部消费者，保留为契约诚实）。
- [x] **Fix（P2-3 死模块）**：删除 `src/renderer/scada-canvas.types.ts`（rg 实核全仓零导入者；`index.ts:16` 已直连 `./schemas.js` 再导出同名类型，无契约 break）。
- [x] **Fix（§11 布局）**：`design-renderer.md §11` 实现布局代码块（`:305`）移除 `scada-canvas.types.ts` 行。
- [x] **Proof**：`pnpm typecheck` + `pnpm build` 验证删除死模块无隐藏消费者（typecheck 全包通过即证明无 `from './scada-canvas.types'` 或 `from '../scada-canvas.types'` 导入残留）。

Exit Criteria:

- [x] `design-renderer.md §11` 公共导出面枚举包含 `serializeScadaConfig`，与 `src/index.ts:54` 实际导出一致。
- [x] `src/renderer/scada-canvas.types.ts` 已删除；`pnpm typecheck` + `pnpm build` 全绿（无隐藏消费者）。
- [x] `design-renderer.md §11` 实现布局代码块不再列 `scada-canvas.types.ts`。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: fresh session `ses_02fb7ea04ffeHhLHZ93ckcCHRU`
- Verdict: `pass-with-minors`（零 Blocker / 零 Major）
- Rounds: 1（R1 即 `pass-with-minors`，共识达成）
- Findings addressed:
  - R1-Minor（Phase 1 Exit Criteria 重复全量 typecheck/build 与 Closure Gates 重叠）：Rule 18 例外条款允许 typecheck 作 dead-code 删除的解阻塞证据（单 Phase 计划、typecheck 即核心安全证明），裁定不调整（无 correctness 影响）。
  - 引用准确性：serializeScadaConfig @ index.ts:54 导出 + §11:317 枚举遗漏 + §4.3:171/177 声明、scada-canvas.types.ts 单行 + 全仓 rg 零导入者 + index.ts:16 直连 schemas.js 再导出（删除安全）、§11:305 实现布局列死模块——全部经 live repo 核对确认。

## Closure Gates

- [x] multi-audit P2-1（§11 枚举遗漏）+ P2-3（死模块）两项 confirmed doc/code drift 已收敛。
- [x] `design-renderer.md §11` 与 `src/index.ts` 实际导出逐项一致（含 serializeScadaConfig）。
- [x] 死模块删除无隐藏消费者（typecheck/build 全绿）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

无。

## Non-Blocking Follow-ups

- 无。

## Closure

Status Note: Phase 1 执行完成（2026-08-05）。P2-1：`design-renderer.md §11` 公共导出面枚举补 `serializeScadaConfig`（与 §4.3 Decision + `src/index.ts:54` 实际导出对齐）。P2-3：`src/renderer/scada-canvas.types.ts` 删除（`git rm`，全仓 rg 零导入者）+ §11 实现布局代码块移除该行。验证：`pnpm typecheck` 32/32、`pnpm build` 32/32、`pnpm lint` 32/32、`pnpm test` 59/59 全绿（industrial 包 cache miss 重编译通过，证明无隐藏消费者）。closure-audit gate 留待独立 fresh-session sub-agent。

Closure Audit Evidence:

- Auditor / Agent: independent closure auditor (fresh session, mission-driver `2026-08-05-065334-mission-driver`)
- Evidence:
  - Live repo re-verified: `packages/flux-renderers-industrial/src/renderer/scada-canvas.types.ts` 不存在（`ls` 确认已 `git rm`）。
  - `packages/flux-renderers-industrial/src/index.ts:54` 仍 `export { serializeScadaConfig } from './serialization/serialize.js';`（contract 不变）。
  - `docs/components/industrial-hmi/design-renderer.md:316` §11 公共导出面枚举已含 `serializeScadaConfig`（与 §4.3:177 Decision + `index.ts:54` 实际导出逐项一致）。
  - `rg "scada-canvas.types" packages/ apps/` 零命中——§11:305 实现布局已无死模块行，全仓无残留导入者。
  - Phase 1 全部 item + Exit Criteria `[x]`；Closure Gates 全 `[x]`；Closure Audit 在执行 session 之外的 fresh session 完成（本审计）。
  - Five-point consistency：Plan Status `completed` / Phase 1 `completed` / Exit Criteria 全勾 / Closure Gates 全勾 / Closure evidence 已填——彼此一致。

Follow-up:

- 无剩余 plan-owned work（P2-1 + P2-3 收敛完成；sibling plan `2026-08-05-1253-1` 收热路径 P2；multi P2-2 renderer 测试样板抽取按 Non-Goals 归后续 round）。
