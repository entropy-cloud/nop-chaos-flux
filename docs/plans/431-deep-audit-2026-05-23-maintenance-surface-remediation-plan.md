# 431 Deep Audit 2026-05-23 Maintenance Surface Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-23
> Source: `docs/analysis/2026-05-23-deep-audit-full/summary.md`, `docs/analysis/2026-05-23-deep-audit-full/02-module-responsibility.md`, `docs/analysis/2026-05-23-deep-audit-full/05-reactive-precision.md`, `docs/analysis/2026-05-23-deep-audit-full/10-styling.md`, `docs/analysis/2026-05-23-deep-audit-full/14-test-coverage.md`, `docs/analysis/2026-05-23-deep-audit-full/16-doc-code-consistency.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/plans/393-deep-audit-2026-05-19-spreadsheet-shell-styling-scope-plan.md`, `docs/plans/397-deep-audit-2026-05-19-owner-doc-alignment-plan.md`, `docs/plans/427-deep-audit-2026-05-21-truthfulness-doc-routing-and-naming-baseline-plan.md`

## Purpose

收口 `docs/analysis/2026-05-23-deep-audit-full/` 中仍保留的维护面问题，让当前仓库重新满足三类基线：

- active audit handbook 不再发布错误的 20 维归档示例；
- 当前 `>700` 行 hard-fail 测试文件按真实 owner boundary 拆回可维护结构；
- 剩余的调试/样式残留问题回到现有 owner docs 已定义的性能与 styling contract。

## Current Baseline

- 2026-05-23 full deep audit 已完成独立复核，当前结果为 `8` 条保留项与 `1` 条降级保留项；无 `P0`，最高优先级为 `16-01` 的 active docs drift。
- `pnpm lint` 已通过，但 `pnpm check` 当前仍因 `pnpm check:oversized-code-files` 失败；对本计划而言，closure 所需的硬门禁 proof 是把该 failing gate 中属于本计划 owning 的三组 hard-fail 文件移出 error 列表。已确认的 hard-fail 文件是 `packages/flow-designer-renderers/src/designer-page-shell.test.tsx`, `packages/report-designer-renderers/src/page-renderer.test.tsx`, `packages/flux-compiler/src/schema-compiler-shape-validation-analyze.test.ts`。
- 维度 `02` 与 `14` 的 retained findings 在本轮不是独立问题簇，而是同三组超大测试文件的双重视角：文件边界混合与测试边界混合应由同一组拆分改动一起收口。
- 其余保留项集中在三个单文件 surface：`packages/flux-renderers-basic/src/scope-debug.tsx` 的整 scope 序列化订阅、`packages/spreadsheet-renderers/src/canvas-styles.css` 的未锚定 surface selector、以及 `docs/skills/deep-audit-prompts.md` 的归档示例漂移。
- `packages/report-designer-renderers/src/field-panel-renderer.test.tsx` 的模块级 mutable mock state 已在本轮被降级为 `P3`，但仍属于已确认保留项；若本计划执行，则不能静默降级为“以后再看”。

## Goals

- 修复 `16-01`, `02-01`, `02-02`, `02-03`, `14-01`, `14-02`, `14-03`, `05-02`, `10-01`。
- 让 `pnpm check:oversized-code-files` 不再因为本计划 owning 的三组测试文件失败。
- 让受影响的 docs、tests、diagnostic/styling surfaces 与当前 owner docs 重新一致，并补上必要 focused proof。

## Non-Goals

- 不重新开启本轮已驳回的 candidates，例如 `render-nodes.tsx` 的 `readOwn()` 或 `variant-field-view.tsx` 的 direct `FieldFrame`。
- 不在本计划内重新跑新的全量 deep audit，或重写与本计划无关的历史 `completed` 计划。
- 不把 2026-05-23 audit 中未保留的 automation suggestions 一并扩大成额外治理工程；新增脚本/规则只在它们对当前 in-scope finding closure 必要时进入执行。

## Scope

### In Scope

- `16-01`
- `02-01`, `02-02`, `02-03`
- `14-01`, `14-02`, `14-03`
- `05-02`
- `10-01`
- `docs/skills/deep-audit-prompts.md`
- `packages/flow-designer-renderers/src/designer-page-shell.test.tsx`
- `packages/report-designer-renderers/src/page-renderer.test.tsx`
- `packages/report-designer-renderers/src/field-panel-renderer.test.tsx`
- `packages/flux-compiler/src/schema-compiler-shape-validation-analyze.test.ts`
- `packages/flux-renderers-basic/src/scope-debug.tsx`
- `packages/spreadsheet-renderers/src/canvas-styles.css`
- focused verification, affected test helpers, and `docs/logs/2026/05-23.md`

### Out Of Scope

- any newly discovered audit candidates outside the retained set above
- runtime error propagation, validation-owner, accessibility, or package-boundary work already closed or rejected in other plans
- broad test-suite modernization beyond the four in-scope test files

## Workstreams

### Workstream 1 - Audit Handbook Baseline Sync

Status: completed
Targets: `docs/skills/deep-audit-prompts.md`, `docs/logs/2026/05-23.md`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] 修复 `16-01`，补齐 20 维归档目录示例中的 `19-error-propagation.md` 与 `20-accessibility.md`，并复核同文件中的命名示例没有再次遗漏。
- [x] 判定是否需要为该 drift 增加最小化结构校验；若不是当前 closure 必需项，则明确记录为非阻塞 follow-up，而不是混入本次 fix 范围。
- [x] 补 focused proof，确认 active handbook 的总览维度数、归档示例、文件命名规则、以及本轮实际产出目录彼此一致。

Exit Criteria:

> 每个 Workstream 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Workstream Status 改为 `completed`。

- [x] `16-01` 对应的 active docs drift 已修复，且不再发布 18 文件示例。
- [x] focused proof 明确验证 handbook 总览、目录示例、命名规则、以及实际 audit 产出的一致性。
- [x] 除 `docs/skills/deep-audit-prompts.md` 外，本 workstream 默认 `No owner-doc update required`；若执行中发现耦合 drift，必须在 plan/log 中显式新增并记录该文档路径，而不是模糊扩大范围。
- [x] `docs/logs/2026/05-23.md` 已更新。

### Workstream 2 - Test Surface Decomposition And Isolation Cleanup

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-page-shell.test.tsx`, `packages/report-designer-renderers/src/page-renderer.test.tsx`, `packages/report-designer-renderers/src/field-panel-renderer.test.tsx`, `packages/flux-compiler/src/schema-compiler-shape-validation-analyze.test.ts`, shared test helpers, `docs/logs/2026/05-23.md`

- Item Types: `Fix | Decision | Proof`

- [x] 按已复核边界拆分 `designer-page-shell.test.tsx`，分别收口 status/failure/rendering 契约，同时保持现有 assertions truthfulness。
- [x] 按已复核边界拆分 `page-renderer.test.tsx`，分别收口 shell/init/host-projection 契约，同时避免新的跨域 fixture 共享。
- [x] 拆分 `schema-compiler-shape-validation-analyze.test.ts`，把 action/source-shape、region traversal、finite-prop/value-shape diagnostics 拆回更窄的测试 surface。
- [x] 收口 `field-panel-renderer.test.tsx` 的模块级 mutable mock state，让 mocked hooks 不再直接闭包读取跨 case 共享状态。
- [x] 补 focused proof：覆盖受影响包测试通过，并以 `pnpm check:oversized-code-files` 证明本计划 owning 的 hard-fail 文件已退出 error 列表。

Exit Criteria:

> 每个 Workstream 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Workstream Status 改为 `completed`。

- [x] `02-01`, `02-02`, `02-03`, `14-01`, `14-02`, `14-03` 已修复，且四个 in-scope 测试文件不再保留当前 confirmed boundary drift。
- [x] `pnpm check:oversized-code-files` 不再报告本计划 owning 的三组 `>700` 行 hard-fail 文件。
- [x] focused proof 覆盖 Flow Designer、Report Designer、Flux Compiler 受影响测试 surface，并证明 `field-panel-renderer` 已不依赖模块级共享 mutable mock state。
- [x] `No owner-doc update required` 已被明确裁定。
- [x] `docs/logs/2026/05-23.md` 已更新。

### Workstream 3 - Scope Debug Subscription Containment

Status: completed
Targets: `packages/flux-renderers-basic/src/scope-debug.tsx`, related focused tests if needed, `docs/architecture/performance-design-requirements.md`, `docs/architecture/renderer-runtime.md`, `docs/logs/2026/05-23.md`

- Item Types: `Fix | Decision | Proof`

- [x] 收口 `05-02`，为 `scope-debug` 增加诚实的 debug gate、收窄订阅、或在折叠/禁用路径避免整 scope 序列化，确保它不再作为普通 renderer surface 放大全量 scope 订阅成本。
- [x] 判定该修复是否改变了受支持 debug surface：若改变 author-facing/debug-path contract，则同步 `docs/architecture/performance-design-requirements.md`，并在需要时同步 `docs/architecture/renderer-runtime.md`；若只是让 live code 回到既有 contract，则明确记为 `No owner-doc update required`。
- [x] 补 focused proof，确认 `scope-debug` 的最终行为与 `performance-design-requirements.md` 的 debug-path 约束一致。

Exit Criteria:

> 每个 Workstream 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Workstream Status 改为 `completed`。

- [x] `05-02` 已修复，且 live code 不再保留本轮复核通过的整 scope 昂贵订阅模式。
- [x] focused proof 覆盖 `scope-debug` 的最终订阅/序列化路径。
- [x] `docs/architecture/performance-design-requirements.md` 与 `docs/architecture/renderer-runtime.md` 已同步到最终 baseline，或明确记录 `No owner-doc update required`。
- [x] `docs/logs/2026/05-23.md` 已更新。

### Workstream 4 - Spreadsheet Canvas Styling Scope Closure

Status: completed
Targets: `packages/spreadsheet-renderers/src/canvas-styles.css`, related focused tests if needed, `docs/architecture/report-designer/spreadsheet-canvas-css.md`, `docs/architecture/styling-system.md`, `docs/logs/2026/05-23.md`

- Item Types: `Fix | Decision | Proof`

- [x] 收口 `10-01`，把裸 `spreadsheet-*` `data-slot` 选择器收束到 spreadsheet canvas 根作用域之下，并保持 report-designer canvas 的受支持特例语义。
- [x] 判定该修复是否仅让 live CSS 回到既有 owner docs，还是需要同步 `docs/architecture/report-designer/spreadsheet-canvas-css.md` / `docs/architecture/styling-system.md` 才能诚实描述最终 contract。
- [x] 补 focused proof，确认 `canvas-styles.css` 不再保留本轮确认的未锚定 surface selector。

Exit Criteria:

> 每个 Workstream 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Workstream Status 改为 `completed`。

- [x] `10-01` 已修复，且 live code 不再保留本轮复核通过的未锚定 spreadsheet canvas selector 模式。
- [x] focused proof 覆盖 spreadsheet canvas selector scope 收口后的最终状态。
- [x] `docs/architecture/report-designer/spreadsheet-canvas-css.md` 与 `docs/architecture/styling-system.md` 已同步到最终 baseline，或明确记录 `No owner-doc update required`。
- [x] `docs/logs/2026/05-23.md` 已更新。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Workstream 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] 所有 in-scope confirmed live defects、contract drifts、and hard-gate failures 已修复。
- [x] `16-01`, `02-01`, `02-02`, `02-03`, `14-01`, `14-02`, `14-03`, `05-02`, `10-01` 已全部达成 repo-observable closure。
- [x] 必要 focused verification 已完成，并与最终 live baseline 一致。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect、contract drift、或 hard-gate failure。
- [x] 受影响的 owner docs 已同步到 live baseline，或每个 workstream 已明确裁定 `No owner-doc update required`。
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据。
- [x] `pnpm check:oversized-code-files`（本计划的 hard-gate proof target；full `pnpm check` 仅在执行中无额外 blocker 时作为附加信息记录）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Draft Review Record

- Independent draft review iteration 1: `needs revision` (`ses_1ade38527ffenzsPpP1diwv9df`) because the original Workstream 3 mixed `05-02` and `10-01` into one underspecified closure surface, owner-doc obligations were too generic, the oversized-file hard gate was not explicit at plan level, and Workstream 1 left its doc target wording too open-ended.
- Independent draft review iteration 2: `needs revision` (`ses_1ade1bdb9ffeuRrjhUCP29wpeu`) because the revised draft still hid decision/follow-up work under incomplete `Item Types`, Workstream 2's title under-described `14-03`, and the hard-gate proof target needed clearer wording.
- Independent draft review iteration 3: `accept` (`ses_1ade0684fffeMddt4qEXPzFBRF`). The final review confirmed the plan owns all `9` in-scope findings exactly once, the workstream split matches real closure surfaces, the oversized-file hard gate remains an explicit closure condition, and no retained finding is silently downgraded or ownerless.

## Deferred But Adjudicated

None at draft time.

## Non-Blocking Follow-ups

- 若在执行中确认 handbook 结构校验脚本只是治理增强、并非修复 `16-01` 所必需，可在不影响本计划 closure 的前提下转为单独 follow-up，但必须保留明确裁定理由。本轮已裁定为非阻塞治理增强，未纳入 closure gate。

## Closure

Status Note: Closed. All in-scope fixes are live, the plan-owned oversized-file hard gate is green, and final verification plus independent closure audit evidence are recorded below.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ad9490ebffe1eY6TrpV8VZ8Fu`
- Evidence: Independent closure audit passed after re-checking the live repo. It confirmed `field-panel-renderer.test.tsx` no longer relies on module-top mutable mock state, the plan-owned oversized-file hard gate still reports `0 errors`, and `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` all passed.

Follow-up:

- None yet.
