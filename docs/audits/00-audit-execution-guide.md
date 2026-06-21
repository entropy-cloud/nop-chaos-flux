# Audit Execution Guide

## Purpose

Define the default audit checkpoints and the mandatory independent-review rules. This complements `docs/plans/00-plan-authoring-and-execution-guide.md` (which owns the plan lifecycle) by specifying _how_ claims are challenged.

## Three Audit Objects

| Object         | When                                      | Question it answers                                 |
| -------------- | ----------------------------------------- | --------------------------------------------------- |
| Document audit | Periodically / on demand                  | Are owner docs accurate, strong, current?           |
| Draft review   | After a plan is drafted, before execution | Is this plan ready to execute?                      |
| Closure audit  | Before marking a plan `completed`         | Did the work really land and satisfy exit criteria? |

## Two Audit Styles

Each object can be run in either style (combine as "multi-dimensional draft review", "open-ended closure audit", etc.):

- **Multi-dimensional** — a fixed checklist of dimensions (imaginative analysis, format completeness, content soundness, reference accuracy). Deterministic coverage.
- **Open-ended** — adversarial, signal-driven probing with no fixed checklist. Catches what the checklist cannot imagine.

## Draft Review (mandatory before execution)

Run by an **independent** reviewer/sub-agent (fresh session, not the author's task session). Checks:

1. Imaginative analysis — mentally execute the plan; find design↔code gaps.
2. Format completeness — follows the plan guide template; required fields present.
3. Content soundness — Goals/Non-Goals clear; Phase decomposition reasonable; Exit Criteria repo-observable; workload sufficient.
4. Reference accuracy — referenced paths, line numbers, function/component names verified against the live repo.
5. Scope honesty — no in-scope defect hidden in Deferred/Non-Goals.
6. Risk fit — test-strategy tier matches the risk (auth/public-API/core regression ⇒ must-automate).

**Pass = zero Blockers AND zero Majors.** Minors never block. Max 2 review rounds; after that, degraded mode (proceed; downstream audits catch residuals).

### Draft Review Record (minimum durable evidence)

Kept inside the plan as a `## Draft Review Record` section:

```
## Draft Review Record
- Reviewer / Agent: <fresh session id or human>
- Verdict: pass | pass-with-minors | revised | degraded
- Rounds: N
- Findings addressed: <one-line per Blocker/Major fixed>
```

Self-review by the author cannot justify proceeding; an independent pass (or an explicit degraded-mode note) is required.

## Closure Audit (mandatory before `completed`)

See `docs/plans/00-plan-authoring-and-execution-guide.md` → **Closure Audit Rule** (9-point checklist). Key points repeated here for routing:

- Closure must happen in a dedicated closure-audit pass, not as a side effect of an implementation slice.
- Closure audit must look back at the **live repo**, not old completion notes.
- Closure audit must be **independent** (fresh session or human); the implementer's self-audit alone never justifies `completed`.
- It must spot-check that key behavior was actually implemented, not just that types/methods exist.
- If closure finds only-partial landing, the plan becomes `partially completed` or `in progress`, never `completed`.

## Document Audit (periodic)

Use `docs/skills/doc-evaluation.md`, `docs/skills/design-doc-audit-prompt.md` (if adopted), or `docs/skills/open-ended-adversarial-review-prompt.md`. Checks:

1. Accuracy — does the doc match live code?
2. Strength — does it state contracts, not vague aspirations?
3. Decision quality — are tradeoffs and alternatives recorded?
4. Timeliness — is it current, or flagged stale in `project-context.md`?

## Filename Convention

Standalone audit records: `YYYY-MM-DD-HHmm-<kind>-<topic>.md` where `<kind>` ∈ `document-audit | draft-review | closure-audit | deep-audit | adversarial-review`. Goal-driver sweeps use `<TIMESTAMP>-<kind>-<pkg>/` directories.
