# 220 Cross-Boundary State And Host Contract Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-07
> Source: `docs/analysis/2026-05-07-open-ended-adversarial-review-01/{round-01.md,round-02.md}`, `docs/architecture/{debugger-runtime.md,surface-owner.md}`, `docs/architecture/report-designer/design.md`, `docs/components/{report-designer-page/design.md,report-toolbar/design.md,word-editor-page/design.md}`, `docs/architecture/word-editor/design.md`, `docs/architecture/flow-designer/tree-mode.md`, live code in `packages/{report-designer-*,word-editor-*,nop-debugger,flux-runtime,flow-designer-*}`
> Related: `docs/plans/{211-runtime-state-reactivity-and-safety-closure-plan.md,214-report-designer-performance-hot-path-closure-plan.md,216-open-ended-adversarial-review-residual-integrity-plan.md,217-deep-audit-2026-05-06-confirmed-defect-remediation-plan.md}`

## Purpose

收口 2026-05-07 开放式对抗性审查确认的新一批跨边界 defect：它们不是单包内部实现瑕疵，而是宿主 scope、bridge、history owner、runtime lifecycle、以及 debugger inspect 边界上的 live contract 断裂。计划完成态：这些 05-07 confirmed defects 在当前 supported baseline 下要么被修复并有 focused proof，要么被显式裁定为 successor/out-of-scope；不能继续停留在“每层都像是真的、但彼此不是同一份真相源”的 split-brain 状态。

## Current Baseline

- `docs/analysis/2026-05-07-open-ended-adversarial-review-01/round-01.md` 和 `round-02.md` 已确认 7 条高价值发现，其中 6 条为确定，1 条（`runtime.dispose()` 未正式关闭 surface entries）为高置信 live residual。
- `docs/plans/216-open-ended-adversarial-review-residual-integrity-plan.md` 已收口 2026-05-06 那一轮的 cascade guard、designer undo/integrity、root render/editor lifecycle、formula pipe 等 residual defects；05-07 的 report/spreadsheet 问题不能模糊地再拥有 `216` 已关闭的 undo/dirty semantics。`220` 只 owning 05-07 新确认的 cross-core truth-source coherence 和 host publication contract，若修复过程中发现 `216` 的 closure wording 需要补充 successor note，必须显式记录，而不是默认忽略。
- `docs/plans/214-report-designer-performance-hot-path-closure-plan.md` 已显式声明只拥有 report-designer deep-copy performance baseline，不拥有后来重新发现的 correctness/integrity defects；因此 05-07 的 report/spreadsheet split-brain 和 toolbar action contract 必须由新的 successor owner plan 承接，不能假装仍属于 `214`。
- `docs/plans/211-runtime-state-reactivity-and-safety-closure-plan.md` 已拥有 earlier declarative surface second-source-of-truth、render-phase side effects、hidden validation participation 等 runtime/react retained issues；05-07 的 `runtime.dispose()` vs surface entry lifecycle gap 不是这些已关闭 defect 的同义重报，而是 runtime-level teardown 没有兑现 `surface-owner.md` 当前关闭语义的 distinct residual。
- `docs/plans/217-deep-audit-2026-05-06-confirmed-defect-remediation-plan.md` 已拥有 05-06 的 word-editor remount、renderer widget className、a11y、type/lifecycle residuals 等 confirmed set；05-07 的 word-editor defects 是另一类 host projection / persistence precedence 问题，不在 `217` 的 closed owning set 中。
- report-designer 当前 owner doc `docs/architecture/report-designer/design.md` 明确要求 schema 片段读取稳定 host snapshot，写操作通过统一 action/command 链提交，且 `runtime.dirty`/undo/history 应建立在同一条 supported editable mutation baseline 上；live code 仍存在 report core、spreadsheet core、host scope 三方各自持有 spreadsheet truth 的 split-brain。
- word-editor 当前 owner doc `docs/architecture/word-editor/design.md` 明确写着 host scope `document` 是 persisted/autosaved snapshot，且 persistence helpers 在 non-browser 环境要有显式安全回退；live code 仍存在 mount-time recovered document 未回写 host projection，以及 schema `datasets` 每次挂载覆盖 persisted datasets 的 precedence hole。
- debugger owner doc `docs/architecture/debugger-runtime.md` 已把 runtime/component registry 定义为 inspect primary truth source，DOM lookup 只是 supplemental metadata；live DOM 根节点也已经暴露 `data-runtime-id`，但 live code仍以页面全局 `document.querySelector([data-cid="..."])` 做 DOM 关联，而不是先按 runtime 缩小查询范围，因此 mounted CID 只在 runtime 内唯一这一事实仍会在 multi-runtime 页面上造成 inspect 串台。
- flow-designer owner doc `docs/architecture/flow-designer/tree-mode.md` 把 `TreeDocument` 定义为 tree mode 的结构 owner，graph document 是 projection；live code的 tree-owned mutation会同时更新 `treeDocument` 和 projected graph，但 undo/redo 只回滚 projected graph，不回滚 owner tree。`docs/plans/217-deep-audit-2026-05-06-confirmed-defect-remediation-plan.md` 曾把这类 `treeDocument` owner issue 路由给 future flow-designer owner plan；`220` 现在就是这个显式 successor owner。
- `docs/architecture/surface-owner.md` 当前 live baseline 明确要求每个 opened surface entry 的 child scope 和 validation owner 在 surface close 时统一释放；live runtime dispose 目前只做 scope-tree cleanup，不走 surface entry close lifecycle。05-07 审查把它记录为高置信 live residual；本计划先把它视为 in-scope confirmation+fix item，closure 前必须通过 focused proof把它提升为已确认并 landed，或显式移出 successor ownership，不能停留在模糊状态。

## Goals

- 修复 05-07 confirmed cross-boundary state and host-contract defects，恢复 single-source-of-truth、owner/history coherence、multi-instance isolation、以及 lifecycle honesty。
- 为每一组 defect 建立 focused proof，避免再次靠“看代码猜语义”宣称 closure。
- 把与 `211/214/216/217` 的边界写清楚，防止后续审查再次把这些问题误归到已关闭 plan 或历史裁定里。

## Non-Goals

- 不把本计划扩展成 report/spreadsheet/word/flow/debugger 的大规模架构重做。
- 不重开 `211`、`214`、`216`、`217` 已经关闭且与 05-07 finding 不同义的 defect families。
- 不把 canonical-only 命名收敛、通用 alias 清理、或 broader multi-instance host model 统一化一并纳入本计划，除非它们是关闭本计划内 live defect 的必要条件。
- 不将本计划扩大成 generic persistence strategy、generic host projection framework、或 generic surface-runtime disposal redesign beyond what the confirmed defects require.

## Scope

### In Scope

- `packages/report-designer-renderers/src/{page-renderer.tsx,host-data.ts,report-designer-toolbar.tsx,report-designer-toolbar-defaults.ts,report-designer-toolbar-helpers.ts,host-action-provider.ts}`
- `packages/report-designer-core/src/{core.ts,core-dispatch.ts}`
- `packages/word-editor-renderers/src/{word-editor-page.tsx,editor-canvas.tsx}`
- `packages/word-editor-core/src/document-io.ts`
- `packages/nop-debugger/src/controller-component-inspector.ts`
- `packages/flow-designer-renderers/src/{designer-page.tsx,designer-command-adapter.ts}`
- `packages/flow-designer-core/src/core.ts`
- `packages/flux-runtime/src/{runtime-factory.ts,surface-runtime.ts}`
- `packages/flux-core/src/types/runtime.ts`
- directly affected focused tests in the above packages
- directly affected owner docs: `docs/architecture/{report-designer/design.md,word-editor/design.md,debugger-runtime.md,flow-designer/tree-mode.md,surface-owner.md}`, `docs/components/{report-designer-page/design.md,report-toolbar/design.md,word-editor-page/design.md}`

### Out Of Scope

- report-designer deep-copy performance work already closed by `214`
- 05-06 residual integrity issues already closed by `216`
- previously adjudicated surface second-source-of-truth or NodeRenderer render-phase issues already closed by `211`
- broader debugger automation naming cleanup and canonical-only alias cleanup unless directly required by the inspect isolation fix
- generic workbench host projection convergence beyond the specific 05-07 defects

## Execution Plan

### Workstream 1 - Restore Report Designer Single-Truth Host Contract

Status: completed
Targets: `packages/report-designer-renderers/src/{page-renderer.tsx,host-data.ts,report-designer-toolbar.tsx,report-designer-toolbar-defaults.ts,report-designer-toolbar-helpers.ts,host-action-provider.ts}`, `packages/report-designer-core/src/{core.ts,core-dispatch.ts}`, focused report-designer tests/docs

- Item Types: `Fix | Decision | Proof`

- [x] [Decision] Freeze the supported owner model for report-designer spreadsheet data: identify which runtime owns the canonical spreadsheet document after import/undo/redo and how host scope must publish it.
- [x] [Fix] Remove the current report-core vs spreadsheet-core split-brain so save/export/host scope/canvas all observe the same spreadsheet document after report-owned mutations.
- [x] [Fix] Repair the report toolbar action contract so default undo/redo/save/preview wiring and the report-designer host action provider use one consistent namespace/method model.
- [x] [Proof] Add focused tests covering import/undo/redo after spreadsheet sync and toolbar action dispatch for default buttons/switches.
- [x] [Proof] Add explicit proof that `save` / `exportDocument()` return the same spreadsheet subtree that host scope and visible canvas publish after `importTemplate`, `undo`, and `redo`.
- [x] [Decision] If this work reopens any `216`-owned wording on shared `core.ts` / `core-dispatch.ts` call paths, add an explicit successor/supersession note to `216` rather than leaving overlapping owner claims.
- [x] [Decision] Update report-designer owner docs to describe the final supported spreadsheet ownership and toolbar action contract.

Exit Criteria:

- [x] report core, spreadsheet core, and host scope no longer publish contradictory spreadsheet snapshots in the supported path.
- [x] default toolbar actions reach the live report-designer commands without duplicated namespace prefixing.
- [x] `save` / `exportDocument()` return the same spreadsheet subtree the canvas and host scope expose after report-owned mutations.
- [x] focused tests cover the restored single-truth model, export/save parity, and toolbar contract.
- [x] `docs/architecture/report-designer/design.md` and `docs/components/{report-designer-page/design.md,report-toolbar/design.md}` are updated to the final supported baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Restore Word Editor Recovery And Persistence Honesty

Status: completed
Targets: `packages/word-editor-renderers/src/{word-editor-page.tsx,editor-canvas.tsx}`, `packages/word-editor-core/src/document-io.ts`, focused word-editor tests/docs

- Item Types: `Fix | Decision | Proof`

- [x] [Fix] Make mount-time recovered persisted document state flow back into the host scope `document` projection so host consumers do not observe stale schema-initial values after recovery.
- [x] [Fix] Resolve dataset precedence so schema `datasets` act as true initial/preconfigured data rather than silently overwriting persisted runtime edits on every mount.
- [x] [Proof] Add focused tests for recovered-document host projection and dataset persistence precedence.
- [x] [Decision] Update word-editor owner docs to describe the final recovery/persistence precedence model, including when `document` and `datasets` are expected to reflect persisted state versus schema seed state.

Exit Criteria:

- [x] host scope `document` reflects the recovered persisted document in the supported mount path.
- [x] persisted dataset edits are not silently overwritten by schema-provided `datasets` on every remount.
- [x] focused tests cover both recovery and dataset precedence.
- [x] `docs/architecture/word-editor/design.md` and `docs/components/word-editor-page/design.md` are updated to the final supported baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Restore Multi-Instance Inspect And Surface Lifecycle Integrity

Status: completed
Targets: `packages/nop-debugger/src/controller-component-inspector.ts`, `packages/flux-runtime/src/{runtime-factory.ts,surface-runtime.ts}`, focused debugger/runtime tests/docs

- Item Types: `Fix | Decision | Proof`

- [x] [Fix] Make debugger inspect DOM correlation use the existing runtime root boundary (`data-runtime-id`) or an equivalent runtime-scoped lookup so `inspectByCid()` cannot join registry data from one runtime with DOM from another runtime.
- [x] [Decision] Revalidate the `runtime.dispose()` surface-entry issue and freeze the supported teardown contract: either runtime teardown must drive the existing close lifecycle, or the public `SurfaceRuntime` contract must grow an explicit dispose path.
- [x] [Fix] Implement the chosen teardown contract so runtime dispose no longer leaves opened surface entries in `surfaceRuntime.store` without entry removal, status cleanup, validation-owner release, and active-status republish.
- [x] [Proof] Add focused tests covering multi-runtime inspect isolation and runtime-dispose surface cleanup behavior.
- [x] [Decision] Update debugger and surface owner docs, plus `packages/flux-core/src/types/runtime.ts` contract wording if needed, to reflect the final supported inspect-scoping rule and runtime teardown semantics.

Exit Criteria:

- [x] `inspectByCid()` no longer produces cross-runtime mixed inspect results on a page with multiple runtimes.
- [x] runtime teardown no longer leaves opened surface entries in `surfaceRuntime.store` after disposal in the supported lifecycle path.
- [x] runtime teardown clears/republishes surface status and releases surface validation owners according to the chosen supported contract.
- [x] focused tests cover multi-instance inspect isolation and surface cleanup.
- [x] `docs/architecture/{debugger-runtime.md,surface-owner.md}` and `packages/flux-core/src/types/runtime.ts` documentation surface are updated or explicitly adjudicated to the final supported baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 4 - Restore Flow Designer Tree Owner And History Coherence

Status: completed
Targets: `packages/flow-designer-renderers/src/{designer-page.tsx,designer-command-adapter.ts}`, `packages/flow-designer-core/src/core.ts`, focused flow-designer tests/docs

- Item Types: `Fix | Decision | Proof`

- [x] [Fix] Make tree-mode undo/redo restore the owner `treeDocument` coherently with the projected graph so tree-owned history is no longer graph-only.
- [x] [Proof] Add focused tests proving that tree-mode undo/redo preserves owner-tree, projected graph, and subsequent tree-owned command behavior consistently.
- [x] [Decision] Update tree-mode owner docs to make the final owner/history contract explicit.

Exit Criteria:

- [x] tree-mode undo/redo no longer roll back only the projection while leaving owner `treeDocument` newer than the visible graph.
- [x] focused tests cover owner-tree and projection history coherence across subsequent tree-owned commands.
- [x] `docs/architecture/flow-designer/tree-mode.md` is updated to the final supported baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 5 - Verification And Closure Audit

Status: completed
Targets: in-scope packages/tests/docs, this plan

- Item Types: `Proof | Decision`

- [x] Run focused package tests for report-designer, word-editor, debugger/runtime, and flow-designer surfaces touched by this plan.
- [x] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all code/doc changes land.
- [x] Perform an independent closure audit with a separate subagent or reviewer and revise the plan/code/docs if the audit finds unresolved in-scope drift.
- [x] Record any remaining non-blocking residual explicitly in `Deferred But Adjudicated` rather than leaving owner ambiguity.

Exit Criteria:

- [x] focused verification is recorded for every plan-owned defect family.
- [x] workspace verification passes.
- [x] independent closure audit confirms no remaining in-scope blocker or silent scope drift.
- [x] No owner-doc update required.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] 行为/契约结果已达成
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline，或明确写明 No owner-doc update required
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Broader Workbench Host-Projection Convergence

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: this plan owns only the specific 05-07 cross-boundary defects, not a general convergence of all editor/designer host projection patterns.
- Successor Required: no
- Successor Path: `n/a`

### Generic Multi-Runtime Debugger Federation

- Classification: `optimization candidate`
- Why Not Blocking Closure: this plan only needs debugger inspect isolation to be correct for the current supported multi-runtime page baseline; broader cross-controller federation and controller selection UX can stay separate.
- Successor Required: no
- Successor Path: `n/a`
