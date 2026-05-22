# Plan Authoring And Execution Guide

## Goal

`docs/plans/` is for non-trivial execution slices that need explicit scope, closure criteria, and proof.

## When To Write A Plan

Write a plan when the task:

- changes API, database/model, auth, integration, deployment, or public contract behavior
- changes user-visible behavior across more than one feature surface
- touches multiple modules and changes shared behavior
- is expected to take more than one AI session
- modifies more than 5 total files or is likely to exceed roughly 200 changed lines
- needs staged implementation or explicit proof before closure

Skip a formal plan only for local low-risk edits such as copy changes, small styling fixes, test-only cleanups, and single-file behavior fixes with clear existing tests.

## Plan Decision Table

| Scope                                                                                                                              | Plan Level         | Audit Rule                                                                     | Examples                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Trivial local edit                                                                                                                 | No plan            | No plan audit                                                                  | typo/copy change, single style tweak, test-only cleanup                                |
| Very small low-risk multi-file edit                                                                                                | Micro-plan allowed | independent plan audit may be skipped; cold-replay closure self-check required | small UI polish with docs/test update, simple local bug fix with clear existing test   |
| Contract, data/model, API, auth, permission, integration, deployment, cross-surface, stale-doc conflict, or more than micro limits | Full plan          | independent plan audit and independent closure audit required                  | checkout flow, login behavior, data migration, external webhook, multi-module refactor |

If unsure, use a full plan.

## Micro-Plan Exception

If a plan exists only to track a very small edit, independent plan and closure audit may be skipped only when all of these are true:

- the change touches normally 1-3 non-generated files, including tests/docs needed for the change; 4-5 total files need written justification, and more than 5 total files cannot use the exception
- the expected diff is under roughly 200 changed lines
- there is no API, database/model, auth, integration, deployment, permission, public contract, or cross-surface behavior change
- requirements and owner docs already make the expected behavior clear
- existing verification commands are enough to prove the result

The plan must explicitly write:

- `Audit: skipped under micro-plan exception`
- the reason each condition above is satisfied

Micro-plan closure still requires a cold-replay self-check against the plan, affected docs, and verification output. Do not close from chat memory.

Before closure, compare the real diff against the micro-plan conditions. If the final diff exceeds the file/line limits or touches an excluded domain, stop, reclassify as audit-required, and run plan/closure audit before marking complete.

## Minimum Rules

1. **Start from live baseline.** Read the repo first, then write `Current Baseline`. Do not rely on memory or old plans. For net-new features, the baseline must inventory all existing code the feature will touch or contradict — hardcoded values, missing hooks, incompatible patterns. An inventory is not optional.
2. **Write Goals and Non-Goals.** If either is unclear, the plan boundary is not ready.
3. **Use checkboxes for execution and closure.** Unchecked items mean unfinished work until closure.
4. **One plan, one result surface.** If the plan needs multiple independent closure criteria, it is too wide. Split it. Multi-module extraction or migration that shares the same behavioral contract and closure criteria is still ONE result surface — do not over-split.
5. **Proof before closure.** Do not mark a plan complete until the repo contains verifiable proof for every exit criterion.
6. **No code-design dumps.** The plan captures scope, proof, and closure logic, not low-level implementation detail. Exception: refactoring and extraction plans MUST include the interface contracts between extracted modules — these are structural boundary definitions, not implementation pseudocode.
7. **Tag items with types.** Each execution item must be `Fix`, `Add`, `Decision`, `Proof`, or `Follow-up`. `Fix` covers defect repairs; `Add` covers net-new code or config. An item may carry multiple types (e.g., `Decision | Add`); when it does, all implied obligations apply. A confirmed live defect or contract drift must be `Fix`, not `Follow-up`. When 80%+ of items in a phase share one type, declare the uniform type at the phase level instead of per-item (e.g., `Phase 1 — Fix-heavy (8/10 items tagged Fix)`).
8. **Record Decisions with rationale.** Every `Decision` item must document the choice, the alternatives considered, and the residual risk if any. Write the rationale into the plan or a referenced doc. If a decision requires prototyping or exploration before committing, add a temporary `Explore` item that must conclude before the `Decision` resolves. Framework-forced or obvious choices (e.g., "must match existing framework pattern") can be noted as constrained without full alternatives analysis.
9. **Checklist integrity before closure.** Before marking a plan complete, no in-scope checklist item may remain unchecked. Either complete it or explicitly move it out of scope with a written reason. Scope narrowing after plan approval is a scope change and must be recorded with rationale; silently removing items from scope is a violation.
10. **Text consistency before closure.** Before closing, verify that `Plan Status`, every phase `Status`, every phase `Exit Criteria`, `Closure Gates`, and the `docs/logs/` entry all agree. No `completed` at the top while a phase inside still says `planned`.
11. **Independent plan and closure audit.** Do not implement a created plan until it has passed plan audit, and do not mark it complete as a side effect of finishing the last implementation slice. Use a separate review pass. If no second person or subagent is available, substitute a cold replay only for non-protected, non-high-risk plans: replay the plan's proof and exit criteria as if you were a reviewer seeing it for the first time — no memory of decisions made during execution. Document the evidence. Protected areas, unresolved product risk, and source-of-truth conflicts require human/subagent review or stay open. This rule may be skipped only under the micro-plan exception above.
12. **Non-degradable items** cannot be downgraded to non-blocking follow-ups: confirmed live defects, confirmed contract drift, confirmed owner-doc drift, and CI/lint rules already fixed in the repo.

### Anti-Slacking Rule

Every in-scope item before closure must land in exactly one state: `landed`, `adjudicated as residual-risk-only`, `moved to explicit successor ownership`, or `removed from scope with recorded reason`.

The following words are forbidden for in-scope items: `optional`, `if time permits`, `consider`, `maybe`, `nice to have`, `as needed`. If an item is truly optional, move it out of scope explicitly rather than leaving it in a fuzzy state.

A `Follow-up` item must name the trigger condition that would promote it into scope (e.g., "when user count exceeds 10K"). A `Deferred But Adjudicated` item must name the event or decision that would reopen it (e.g., "if the new API is adopted, this work may become redundant").

## When Executing

1. Before implementation, record plan audit evidence or the explicit micro-plan exception.
2. When you start a slice, update its `Status` to `in progress`.
3. When you finish a slice, update its `Status` to `completed` and check off all its execution items and exit criteria.
4. If a slice changes the live baseline or public contract, its exit criteria must include the doc-update step. If no doc update is needed, write `No owner-doc update required` explicitly.
5. Do not mark a slice complete because the function signature exists. Verify that the behavior, error handling, and test coverage land too.
6. If an item cannot be completed, move it to `Deferred But Adjudicated` with classification and reason. Do not leave it unchecked in the execution list.
7. Keep `docs/logs/` in sync with plan progress. A single aggregate log entry at plan closure is sufficient when all phases cover the same feature in one sprint; individual phase entries are required only when a phase spans a different day or a distinct deliverable.

## When Closing

Before setting `Plan Status: completed`, do all of the following:

**All created plans:**

1. Check every phase `Exit Criteria` — every one must be `[x]`.
2. Check every `Closure Gates` item — every one must be `[x]`.
3. Verify text consistency: top status, phase statuses, exit criteria, closure gates, and log entry all agree.
4. Distinguish "interface exists" from "behavior is complete". Verify the actual runtime behavior with a test or demo, not just the type signature.
5. Run the real verification commands for the repo. For plans whose primary result surface is visual, behavioral, or UX-driven, customize the verification gates with explicit justification in the plan.
6. Perform an independent closure audit or document the micro-plan cold-replay self-check.

**Full closure** (multi-session, multi-module, or high-risk plans — add these):

7. Re-read the entire plan from the top, not just the most recent slice.
8. Record independent audit evidence in the plan's `Closure` section and link any stored audit file under `docs/audits/`.

If any of these fail, the plan stays open.

## Template

```md
# <plan-id> <title>

> Plan Status: planned
> Last Reviewed: YYYY-MM-DD
> Source: <requirement / bug / analysis / request>
> Related: <related plans, optional>
> Audit: <required | skipped under micro-plan exception>

## Current Baseline

- <what is true today>
- <what gap remains>

## Goals

- <result to achieve>

## Non-Goals

- <explicitly excluded work>

## Infrastructure And Config Prereqs

- <ports, env vars, CORS, secrets, .env, external services this feature depends on>
- <if none, write "No infra prereqs beyond existing baseline">
- <for data-migration plans: include rollback strategy or script path>

## Execution Plan

### Phase 1 - <name>

Status: planned
Targets: `<paths>`

- Item Types: `Fix | Decision | Proof | Follow-up`
- Prereqs: <phases or external dependencies that must complete first>

- [ ] <implementation item>
- [ ] <Decision: record rationale and alternatives in the item or a referenced doc>
- [ ] <Proof: specify test strategy (unit/integration/e2e) and exact verification commands>

Exit Criteria:

- [ ] <behavior lands — specify success and failure modes>
- [ ] <relevant docs updated, or No owner-doc update required>
- [ ] `docs/logs/` updated

## Plan Audit

- Status: <pending | passed | skipped under micro-plan exception>
- Reviewer / Agent: <independent reviewer, subagent, or cold-replay proxy>
- Evidence: <task id / audit file / reason for micro-plan exception>

## Closure Gates

- [ ] in-scope behavior is complete
- [ ] relevant docs are aligned
- [ ] verification has run (specify which commands; customize for visual/UX domains if needed)
- [ ] no in-scope item downgraded to deferred/follow-up
- [ ] plan audit passed or micro-plan exception documented before implementation
- [ ] micro-plan actual diff stayed within exception limits, or plan was reclassified and audited
- [ ] text consistency verified: status, phases, gates, and log all agree
- [ ] closure audit was independent (or cold-replay proxy documented)
- [ ] closure evidence exists in files

## Deferred But Adjudicated

### <item name>

- Classification: `watch-only residual | optimization candidate | out-of-scope improvement`
- Why Not Blocking Closure: <reason>
- Successor Required: `yes | no`

## Closure

Status Note: <why the plan can close>

Closure Audit Evidence:

- Reviewer / Agent: <independent reviewer or cold-replay proxy>
- Evidence: <task id / log link / walkthrough record>

Follow-up:

- <non-blocking follow-up items only; confirmed defects must not appear here>
```
