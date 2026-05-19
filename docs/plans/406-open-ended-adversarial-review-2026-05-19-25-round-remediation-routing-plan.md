# 406 Open-Ended Adversarial Review 2026-05-19 25-Round Remediation Routing Plan

> Plan Status: proposed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-open-ended-adversarial-review-01/{round-01.md,round-02.md,round-03.md,round-04.md,round-05.md,round-06.md,round-07.md,round-08.md,round-09.md,round-10.md,round-11.md,round-12.md,round-13.md,round-14.md,round-15.md,round-16.md,round-17.md,round-18.md,round-19.md,round-20.md,round-21.md,round-22.md,round-23.md,round-24.md,round-25.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/references/reopened-design-decisions-and-audit-adjudications.md`, `docs/plans/391-deep-audit-2026-05-19-report-field-panel-contract-plan.md`, `docs/plans/392-deep-audit-2026-05-19-spreadsheet-host-semantics-plan.md`, `docs/plans/395-deep-audit-2026-05-19-flow-designer-error-fidelity-plan.md`, `docs/plans/396-deep-audit-2026-05-19-flow-designer-accessibility-interaction-plan.md`, `docs/plans/400-deep-audit-2026-05-19-test-harness-reliability-plan.md`

## Purpose

把 `2026-05-19-open-ended-adversarial-review-01` 的 `25` 轮审计结果从 analysis 结论收口成一份诚实的修改队列与 owner-routing baseline。

这份计划不试图用一个宽而模糊的 umbrella implementation plan 直接修完全部 `39` 条 findings。它的职责只有三件事：

- 冻结这 `25` 轮审计形成的单一 live baseline。
- 为全部 `39` 条 findings 指定且只指定一个 remediation bucket、优先级、和 execution owner path。
- 规定后续应拆出的执行面，避免把 runtime/compiler、report/spreadsheet host、flow-designer contract、word-editor truth surface、以及 supported E2E false-confidence 问题继续混装。

## Current Baseline

- `docs/analysis/2026-05-19-open-ended-adversarial-review-01/` 已完成 `round-01.md` 到 `round-25.md` 共 `25` 轮，累计记录 `39` 条 non-duplicate findings。
- 这 `39` 条 findings 横跨至少五个不共享 exit criteria 的结果面：
  - runtime/compiler/validation/package-proof fidelity
  - supported E2E / harness truthfulness
  - report-designer / spreadsheet host contract and shell semantics
  - flow-designer public contract and action-surface alignment
  - word-editor persisted truth surface, save semantics, template insertion, and host manifest/provider drift
- 当前仓库里已经存在若干相邻或同-surface 的活跃计划（如 `391`、`392`、`395`、`396`、`400`）。本计划必须区分三种情况：
  - 已有 active plan 的 live owner surface 与本批 finding 完全同面，应直接路由到该现有 owner，并在后续显式修订其 scope 文本。
  - 已有 active plan 只是相邻 surface，不应机械并入。
  - 当前没有 honest owner 的 finding，需要新建 successor plan。
- `docs/references/reopened-design-decisions-and-audit-adjudications.md` 已被用于去重；本批 findings 默认视为新的 residual / new instance / new truth-surface drift，而不是对已 adjudicated 问题的机械重报。
- 由于 supported E2E false-confidence finding 数量较多，这份计划必须同时区分两类问题：
  - live product / host / persisted-truth-surface defect
  - supported proof / harness / test-title-to-assertion drift

## Goals

- 为全部 `39` 条 findings 建立一对一 remediation matrix，避免 ownerless、multiply-owned、或被 vague residual 话术掩盖。
- 识别哪些 finding 是 code-side live defect，哪些是 proof-surface defect，哪些需要 owner-doc update。
- 把后续执行面限制在少数 narrow successor plans，避免 broad bundling。
- 明确哪些 finding 应复用现有 active owner，哪些才需要新建 successor plan。

## Non-Goals

- 不在本计划内直接落地代码修复、测试修复、或 owner-doc 改写本身。
- 不把本批 findings 机械并入现有活跃计划，除非后续单独修订那些计划的 scope 且经再次审计确认。
- 不重新打开已 `completed` 的历史计划来承接本批 findings。
- 不继续发现第 `26` 轮及之后的新 finding；本计划只冻结 `round-01` 到 `round-25` 的结果。

## Scope

### In Scope

- `docs/analysis/2026-05-19-open-ended-adversarial-review-01/round-01.md` 到 `round-25.md`
- 本批 `39` 条 findings 的 bucket、priority、disposition、successor-owner routing
- 需要新建的 successor execution owner surfaces
- 本计划文件本身
- `docs/logs/2026/05-19.md`

### Out Of Scope

- 任何直接代码修复、测试重写、或 architecture doc 改写的实现细节
- 新增 open-ended 审计轮次
- 与本批 findings 无关的 deep-audit findings

## Priority Policy

- `P0`: live correctness、data-loss / partial-commit、owner-state corruption、public contract lie that can directly route invalid behavior、or harness gap that can systematically hide real failures. 不能降级成 non-blocking follow-up。
- `P1`: public contract drift、persisted truth-surface drift、supported E2E false confidence、tooling/proof fidelity gap、or shell/runtime split-brain. 默认需要 successor execution owner。
- `P2`: narrow cleanup / packaging-proof hygiene with no immediate live correctness breach. 只有在 successor plan 明确写出 `Why Not Blocking Closure` 时才允许延期。

## Remediation Buckets

| Bucket | Theme                                                                                                 | Count       | Priority   | Execution Owner Path                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| A      | Runtime, compiler, validation, and package-proof fidelity                                             | 4 findings  | `P0/P1/P2` | `docs/plans/407-open-ended-adversarial-review-2026-05-19-runtime-validation-and-packaging-fidelity-plan.md`   |
| B      | Harness-wide test reliability and zero-error gate truthfulness                                        | 1 finding   | `P0`       | `docs/plans/400-deep-audit-2026-05-19-test-harness-reliability-plan.md`                                       |
| C      | Product-facing supported E2E assertion fidelity                                                       | 16 findings | `P0/P1`    | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| D      | Report field-panel contract integrity                                                                 | 2 findings  | `P0/P1`    | `docs/plans/391-deep-audit-2026-05-19-report-field-panel-contract-plan.md`                                    |
| E      | Report-designer and spreadsheet host contract / shell semantics outside the field-panel owner surface | 4 findings  | `P1`       | `docs/plans/409-open-ended-adversarial-review-2026-05-19-report-and-spreadsheet-host-contract-plan.md`        |
| F      | Flow-designer public contract and action-surface alignment                                            | 3 findings  | `P1`       | `docs/plans/410-open-ended-adversarial-review-2026-05-19-flow-designer-host-contract-plan.md`                 |
| G      | Word-editor persisted truth surface, save semantics, template insertion, and host contract fidelity   | 8 findings  | `P0/P1`    | `docs/plans/411-open-ended-adversarial-review-2026-05-19-word-editor-truth-surface-and-host-contract-plan.md` |
| H      | Surface containment and overlay geometry truthfulness                                                 | 1 finding   | `P1`       | `docs/plans/412-open-ended-adversarial-review-2026-05-19-surface-containment-truthfulness-plan.md`            |

## Finding Matrix

| ID     | Finding                                                                                                                                   | Bucket | Priority | Disposition                                        | Successor Path                                                                                                |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| R01-01 | Page-root validation owner can keep a stale compiled model after schema replacement                                                       | A      | P0       | New execution owner                                | `docs/plans/407-open-ended-adversarial-review-2026-05-19-runtime-validation-and-packaging-fidelity-plan.md`   |
| R01-02 | `scopeKey` is treated as the real `scope.id`, so repeated child scopes can collide and dispose each other                                 | A      | P0       | New execution owner                                | `docs/plans/407-open-ended-adversarial-review-2026-05-19-runtime-validation-and-packaging-fidelity-plan.md`   |
| R01-03 | Schema validation runs `beforeCompile` plugins twice while normal compile runs them once                                                  | A      | P1       | New execution owner                                | `docs/plans/407-open-ended-adversarial-review-2026-05-19-runtime-validation-and-packaging-fidelity-plan.md`   |
| R01-04 | Shared E2E error gate globally suppresses real WebSocket failures                                                                         | B      | P0       | Existing active owner with required scope revision | `docs/plans/400-deep-audit-2026-05-19-test-harness-reliability-plan.md`                                       |
| R01-05 | `check-flux-bundle-pack` verifies source CSS instead of packed tarball CSS                                                                | A      | P2       | New execution owner                                | `docs/plans/407-open-ended-adversarial-review-2026-05-19-runtime-validation-and-packaging-fidelity-plan.md`   |
| R01-06 | Drawer `containerElement` support is fake containment because the surface stays `position: fixed`                                         | H      | P1       | New execution owner                                | `docs/plans/412-open-ended-adversarial-review-2026-05-19-surface-containment-truthfulness-plan.md`            |
| R02-01 | Word Editor explicit save does not deliver the saved envelope to the documented host callback                                             | G      | P1       | New execution owner                                | `docs/plans/411-open-ended-adversarial-review-2026-05-19-word-editor-truth-surface-and-host-contract-plan.md` |
| R02-02 | `report-designer:openInspector` / `closeInspector` mutate runtime state, but the page shell ignores that state                            | E      | P1       | New execution owner                                | `docs/plans/409-open-ended-adversarial-review-2026-05-19-report-and-spreadsheet-host-contract-plan.md`        |
| R02-03 | Report field-panel keyboard insert enables unsupported selection targets and can build invalid `dropFieldToTarget` payloads               | D      | P0       | Existing active owner with required scope revision | `docs/plans/391-deep-audit-2026-05-19-report-field-panel-contract-plan.md`                                    |
| R02-04 | SQL format-button E2E passes even if formatting is a complete no-op                                                                       | C      | P1       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R02-05 | Word Editor typing E2E never proves typing changed editor state                                                                           | C      | P1       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R03-01 | Flow Designer publishes contradictory host summaries for the same live selection / busy state                                             | F      | P1       | New execution owner                                | `docs/plans/410-open-ended-adversarial-review-2026-05-19-flow-designer-host-contract-plan.md`                 |
| R03-02 | Flow Designer built-in toolbar bypasses `ActionScope` for most `designer:*` actions                                                       | F      | P1       | New execution owner                                | `docs/plans/410-open-ended-adversarial-review-2026-05-19-flow-designer-host-contract-plan.md`                 |
| R03-03 | Word Editor `statusPath` never reports save busy state while a save is in flight                                                          | G      | P1       | New execution owner                                | `docs/plans/411-open-ended-adversarial-review-2026-05-19-word-editor-truth-surface-and-host-contract-plan.md` |
| R03-04 | Word Editor persists datasets before save success / abort is known                                                                        | G      | P0       | New execution owner                                | `docs/plans/411-open-ended-adversarial-review-2026-05-19-word-editor-truth-surface-and-host-contract-plan.md` |
| R04-01 | `ReportDesignerBridge.getDesignerSnapshot()` still downgrades undo/redo to spreadsheet-only runtime state                                 | E      | P1       | New execution owner                                | `docs/plans/409-open-ended-adversarial-review-2026-05-19-report-and-spreadsheet-host-contract-plan.md`        |
| R04-02 | Default report field panel is only a static list and drops drag-drop / keyboard-insert contracts                                          | D      | P1       | Existing active owner with required scope revision | `docs/plans/391-deep-audit-2026-05-19-report-field-panel-contract-plan.md`                                    |
| R05-01 | Spreadsheet host manifest leaves many live methods untyped while runtime forwards arbitrary payloads into strongly-shaped commands        | E      | P1       | New execution owner                                | `docs/plans/409-open-ended-adversarial-review-2026-05-19-report-and-spreadsheet-host-contract-plan.md`        |
| R05-02 | `word-editor-persistence` can pass even if the explicit Save button stops persisting anything                                             | C      | P0       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R06-01 | Flow Designer dynamically publishes `designer:navigate-back`, but the manifest omits that public method                                   | F      | P1       | New execution owner                                | `docs/plans/410-open-ended-adversarial-review-2026-05-19-flow-designer-host-contract-plan.md`                 |
| R07-01 | `report-designer-demo` E2E claims toolbar actions are available, but only proves buttons exist                                            | C      | P1       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R08-01 | Component Lab CRUD quick-edit E2Es claim row persistence, but mostly verify editor-local state                                            | C      | P1       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R09-01 | Component Lab `input-text` E2E claims to verify clearing behavior, but never clears                                                       | C      | P1       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R10-01 | Flow Designer edge-creation E2E claims to test handle drag, but uses a test-only event bypass                                             | C      | P1       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R11-01 | Component Lab back-button E2E bypasses the real click path with DOM `click()`                                                             | C      | P1       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R12-01 | Component Lab dialog / drawer writeback E2Es only prove shell close, not writeback                                                        | C      | P1       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R13-01 | Component Lab `array-field` E2E stops at debug-state growth and never verifies the promised submit result                                 | C      | P1       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R14-01 | Component Lab `variant-field` E2E never verifies the submitted output shape exposed by the page                                           | C      | P1       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R15-01 | Component Lab `tag-list` E2Es ignore visible result text and only assert debug state                                                      | C      | P1       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R16-01 | Component Lab CRUD quick-edit scenarios expose a success toast, but supported E2Es never assert it                                        | C      | P1       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R17-01 | Component Lab `flex` tag-cloud E2E claims to verify the rendered cloud, but only asserts empty debug state                                | C      | P1       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R18-01 | Flow Designer E2E claims to verify toolbar and quick actions, but never touches either surface                                            | C      | P1       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R19-01 | Word Editor `Template Expression Insertion` suite never tests insertion                                                                   | C      | P1       | New execution owner                                | `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`                  |
| R20-01 | Word Editor template-tag insertion collapses self-closing tags into open tags                                                             | G      | P0       | New execution owner                                | `docs/plans/411-open-ended-adversarial-review-2026-05-19-word-editor-truth-surface-and-host-contract-plan.md` |
| R21-01 | Word Editor XPL insert dialog advertises `c:out`, but the confirm path cannot insert it                                                   | G      | P1       | New execution owner                                | `docs/plans/411-open-ended-adversarial-review-2026-05-19-word-editor-truth-surface-and-host-contract-plan.md` |
| R22-01 | Word Editor chart/code dialogs can save core-invalid metadata that later disappears during recovery                                       | G      | P0       | New execution owner                                | `docs/plans/411-open-ended-adversarial-review-2026-05-19-word-editor-truth-surface-and-host-contract-plan.md` |
| R23-01 | Word Editor exposes a watermark authoring dialog, but watermark is outside the persisted document truth surface                           | G      | P1       | New execution owner                                | `docs/plans/411-open-ended-adversarial-review-2026-05-19-word-editor-truth-surface-and-host-contract-plan.md` |
| R24-01 | Word Editor manifest publishes full `insertChart` / `insertCode` contracts, but the provider only enforces `id + name`                    | G      | P1       | New execution owner                                | `docs/plans/411-open-ended-adversarial-review-2026-05-19-word-editor-truth-surface-and-host-contract-plan.md` |
| R25-01 | Report Designer manifest publishes structured host-method payload contracts, but the live provider forwards arbitrary objects as commands | E      | P1       | New execution owner                                | `docs/plans/409-open-ended-adversarial-review-2026-05-19-report-and-spreadsheet-host-contract-plan.md`        |

## Existing-Plan Adjacency Notes

- `docs/plans/400-deep-audit-2026-05-19-test-harness-reliability-plan.md` 已经 owning harness-wide cleanup / zero-error proof discipline；本轮同-surface harness finding 复用该 active owner。
- `docs/plans/391-deep-audit-2026-05-19-report-field-panel-contract-plan.md` 已经 owning report field-panel contract surface；本轮两条同-surface field-panel finding 复用该 active owner。
- `docs/plans/392-deep-audit-2026-05-19-spreadsheet-host-semantics-plan.md` 与 `R05-01` 相邻，但其现有 scope 只 owning save/cancel semantics。
- `docs/plans/395-deep-audit-2026-05-19-flow-designer-error-fidelity-plan.md` 和 `docs/plans/396-deep-audit-2026-05-19-flow-designer-accessibility-interaction-plan.md` 不是 Bucket `F` 这三条 host-contract finding 的 owner。

## Execution Plan

### Phase 1 - Freeze The 25-Round / 39-Finding Baseline

Status: planned
Targets: `docs/analysis/2026-05-19-open-ended-adversarial-review-01/`, `docs/references/reopened-design-decisions-and-audit-adjudications.md`, this plan

- Item Types: `Decision | Proof`

- [ ] Re-audit all `25` rounds against the live repo and confirm the retained set is exactly `39` non-duplicate findings.
- [ ] Confirm none of the `39` findings is already honestly owned by another active plan without a required scope change.
- [ ] Freeze one canonical finding matrix, bucket mapping, and priority assignment in this plan.
- [ ] Record explicit adjacency notes for nearby active plans so later execution does not widen them silently.

Exit Criteria:

- [ ] Every finding from `round-01.md` through `round-25.md` appears exactly once in this plan's finding matrix.
- [ ] No finding is ownerless, multiply-owned, or left in an unresolved historical-reopen state.
- [ ] This plan text clearly states why it is a routing / modification-queue plan rather than a broad execution umbrella.
- [ ] No owner-doc update is required to close Phase 1 itself.
- [ ] `docs/logs/2026/05-19.md` records the frozen `25`-round baseline.

### Phase 2 - Create Narrow Successor Execution Owners

Status: planned
Targets: `docs/plans/391-deep-audit-2026-05-19-report-field-panel-contract-plan.md`, `docs/plans/400-deep-audit-2026-05-19-test-harness-reliability-plan.md`, `docs/plans/407-*.md`, `docs/plans/408-*.md`, `docs/plans/409-*.md`, `docs/plans/410-*.md`, `docs/plans/411-*.md`, `docs/plans/412-*.md`, this plan

- Item Types: `Decision | Proof`

- [ ] Revise Plan `400` so it explicitly owns the reused harness-wide finding alongside its existing harness-reliability queue.
- [ ] Revise Plan `391` so it explicitly owns the reused report field-panel findings alongside its existing field-panel contract queue.
- [ ] Create Plan `407` for Bucket A and scope it only to runtime/compiler/validation/package-proof fidelity.
- [ ] Create Plan `408` for Bucket C and scope it only to product-facing supported E2E assertion fidelity, excluding harness-wide fixture gates.
- [ ] Create Plan `409` for Bucket E and scope it only to report-designer / spreadsheet host contract and shell semantics outside the field-panel owner surface.
- [ ] Create Plan `410` for Bucket F and scope it only to flow-designer public contract and action-surface alignment.
- [ ] Create Plan `411` for Bucket G and scope it only to word-editor persisted truth surface, save semantics, template insertion, and host contract fidelity.
- [ ] Create Plan `412` for Bucket H and scope it only to surface containment / overlay geometry truthfulness.
- [ ] Make each reused or new execution-owner plan enumerate exact finding IDs, explicit Non-Goals, and required owner-doc obligations.

Exit Criteria:

- [ ] Buckets A-H each have exactly one execution owner path under `docs/plans/`, whether reused active owner or new successor plan.
- [ ] No successor plan mixes unrelated result surfaces.
- [ ] Every reused or new owner plan names exact finding IDs and explicit Non-Goals.
- [ ] Every reused or new owner plan names affected owner docs or explicitly records `No owner-doc update required`.
- [ ] `docs/logs/2026/05-19.md` records the successor-owner split.

### Phase 3 - Independent Routing Audit And Queue Freeze

Status: planned
Targets: this plan, execution-owner plans `391`, `400`, `407`, `408`, `409`, `410`, `411`, `412`, `docs/logs/2026/05-19.md`

- Item Types: `Proof | Decision`

- [ ] Run an independent routing audit with a fresh subagent that re-reads all `25` rounds, this plan, and every execution-owner plan referenced in Phase 2.
- [ ] Fix any duplicated ownership, missing owner, dishonest downgrade, or over-broad scope found by the audit.
- [ ] Repeat independent review until a fresh reviewer returns no remaining routing findings.
- [ ] Record the final review evidence and queue-freeze result in `docs/logs/2026/05-19.md`.

Exit Criteria:

- [ ] Independent audit confirms the `39`-finding matrix is one-to-one and owner-complete.
- [ ] Independent audit confirms no in-scope `P0/P1` finding was silently downgraded to vague follow-up or residual text.
- [ ] Independent audit confirms reused active owners and new successor plans are narrow, guide-compliant, and aligned with the frozen matrix.
- [ ] At least one final fresh reviewer returns `no findings` / equivalent acceptance verdict after revisions.
- [ ] This plan's statuses, matrix, and daily-log evidence are textually consistent.

## Closure Gates

> 这是 docs-only routing / modification-queue plan。关闭条件是 `25` 轮 findings 已有唯一 owner path 与独立 routing audit，而不是代码已经全部修复。

- [ ] All `39` findings have exactly one current owner bucket, explicit disposition, and explicit successor path.
- [ ] All `P0` findings are routed to explicit execution owner plans.
- [ ] All `P1` findings are routed without ambiguity.
- [ ] No confirmed live defect or contract drift is silently downgraded to deferred or non-blocking follow-up.
- [ ] Every referenced execution-owner plan exists and is at least `planned` with guide-compliant scope.
- [ ] This docs-only routing plan requires no owner-doc update for itself; any owner-doc obligations are explicitly routed to the referenced execution-owner plans.
- [ ] Independent subagent routing audit is completed and recorded.

## Deferred But Adjudicated

None currently. This routing plan must not use `Deferred But Adjudicated` as a holding area for still-unrouted findings.

## Non-Blocking Follow-ups

- If later re-audit after this routing plan closes finds a materially different same-surface residual, create a fresh explicit successor plan instead of widening an existing successor in place.

## Closure

Status Note: Pending.

Closure Audit Evidence:

- Reviewer / Agent: pending independent routing audit
- Evidence: not yet run
