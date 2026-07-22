# Skills And Prompt Index

## Purpose

`docs/skills/` collects reusable internal prompts, review playbooks, and audit templates for recurring work in this repo.

Use these files as **method selectors**:

1. decide the task route from `docs/index.md` and the relevant owner docs first
2. then choose the smallest reusable prompt that matches the work method
3. do not use a skill as a substitute for requirement, design, or architecture truth

## Read First

Before using any prompt here, read:

1. `AGENTS.md`
2. `docs/index.md`
3. the owner doc for the area you are touching

## By Task

| If you need to...                                                                                               | Read this first                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Diagnose a bug, flaky test, runtime failure, or cross-layer diagnostic mismatch                                 | `docs/skills/bug-diagnosis-prompt.md`                                                                                                            |
| Run a shorter live execution of the bug diagnosis workflow                                                      | `docs/skills/bug-diagnosis-execution-template.md`                                                                                                |
| Implement a feature or fix via contract-driven test-first slices                                                | `docs/skills/test-first-implementation-prompt.md`                                                                                                |
| Explore the codebase for contract violations by writing failing tests first                                     | `docs/skills/exploratory-contract-testing-prompt.md`                                                                                             |
| Explore the playground and component lab for real E2E failures                                                  | `docs/skills/exploratory-e2e-testing-prompt.md`                                                                                                  |
| Run a broad open-ended adversarial review driven by live code signals                                           | `docs/skills/open-ended-adversarial-review-prompt.md`                                                                                            |
| Review a diff against both repo standards and the originating spec / plan                                       | `docs/skills/diff-standards-and-spec-review-prompt.md`                                                                                           |
| Review whether a high-level plan or design has been compressed into a testable implementation contract          | `docs/skills/implementation-contract-review-prompt.md`                                                                                           |
| Run a structured multi-dimensional deep audit                                                                   | `docs/skills/deep-audit-prompts.md`                                                                                                              |
| Audit code quality with focus on real implementation quality, not metrics theater                               | `docs/skills/code-quality-audit-prompt.md`                                                                                                       |
| Verify a complex interactive renderer (gantt/kanban/calendar/designer) actually displays correctly and operates | `docs/skills/complex-component-display-operability-audit-prompt.md`                                                                              |
| Discover high-ROI architecture deepening opportunities                                                          | `docs/skills/architecture-deepening-review-prompt.md`                                                                                            |
| Turn a plan or design direction into a user-selectable question document                                        | `docs/skills/plan-grilling-question-document-prompt.md`                                                                                          |
| Conduct a multi-round interactive grilling that converges a fuzzy requirement, saved to `docs/discussions/`     | `docs/skills/discussion-grilling-prompt.md`                                                                                                      |
| Audit whether unit tests really protect stable contracts                                                        | `docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md`                                                                              |
| Review React 19 usage against project-specific best practices                                                   | `docs/skills/react19-best-practices-review.md`                                                                                                   |
| Audit UX patterns, interaction quality, or whether a surface still looks like generic AI-safe output            | `docs/skills/ux-design-pattern-audit-prompt.md`                                                                                                  |
| Review docs for accuracy, strength, and decision quality                                                        | `docs/skills/doc-evaluation.md`, `docs/skills/plan-grilling-question-document-prompt.md`, `docs/skills/diff-standards-and-spec-review-prompt.md` |
| Review or clean up deprecated features                                                                          | `docs/skills/deprecated-feature-cleanup.md`                                                                                                      |
| Review branch integration / merge handling guidance                                                             | `docs/skills/branch-merge.md`                                                                                                                    |
| Discover refactor targets or request refactor direction                                                         | `docs/skills/code-refactor-discovery-prompt.md`, `docs/skills/architecture-deepening-review-prompt.md`, `docs/skills/code-refactor-prompt.md`    |
| Run AI tone / filler review on generated text                                                                   | `docs/skills/ai-tone-and-filler-review.md`                                                                                                       |
| Explore next-gen low-code attractors and capability opportunities                                               | `docs/skills/next-gen-lowcode-attractor-discovery-prompt.md`                                                                                     |

## Skill Selection Guardrails

Several skills overlap in name. Pick by the question you are answering, not by keyword similarity:

| If you are deciding…                                                                  | Use                                                     | Do NOT use                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Is this plan ready to execute?"                                                      | `implementation-contract-review-prompt.md`              | `deep-audit-prompts.md` (that audits live code, not a draft)                                                                                                                                              |
| "Is the landed code actually correct?"                                                | `deep-audit-prompts.md`                                 | `implementation-contract-review-prompt.md` (that reviews a plan, not code)                                                                                                                                |
| "Find unknown problems by probing live code"                                          | `open-ended-adversarial-review-prompt.md`               | `deep-audit-prompts.md` (that uses a fixed checklist)                                                                                                                                                     |
| "Does this complex renderer display correctly and can users operate it?"              | `complex-component-display-operability-audit-prompt.md` | `deep-audit-prompts.md` dimensions 21/22/23 (when you already plan a full audit) or `flux-component-design-review-prompt.md` (pre-implementation design review, not post-implementation functional check) |
| "Did we hit a real bug?"                                                              | `bug-diagnosis-prompt.md`                               | `exploratory-e2e-testing-prompt.md` (that finds symptoms, not root cause)                                                                                                                                 |
| "Is this React 19 usage correct?"                                                     | `react19-best-practices-review.md`                      | `code-quality-audit-prompt.md` (broader, less specific)                                                                                                                                                   |
| "Should this surface be refactored?"                                                  | `code-refactor-discovery-prompt.md`                     | `architecture-deepening-review-prompt.md` (that targets module seams, not a single surface)                                                                                                               |
| "Multi-round grilling that converges a requirement and saves to `docs/discussions/`?" | `discussion-grilling-prompt.md`                         | `plan-grilling-question-document-prompt.md` (one-shot question pack to `docs/analysis/`, not interactive) or `.opencode/skills/nop-deep-interview` (fuzziness-scored, chat-only)                          |

Rule: when two skills could both apply, prefer the **narrower** one. A skill is a _method selector_ — it never replaces the owner doc or active requirement as the source of truth.

## Recommended Starting Set

For the most common engineering work in this repo, start with:

1. `docs/skills/bug-diagnosis-prompt.md`
2. `docs/skills/test-first-implementation-prompt.md`
3. `docs/skills/exploratory-contract-testing-prompt.md`
4. `docs/skills/exploratory-e2e-testing-prompt.md`
5. `docs/skills/open-ended-adversarial-review-prompt.md`
6. `docs/skills/deep-audit-prompts.md`

## Notes

1. Prefer the shorter, narrower prompt when two prompts could both apply.
2. If the task is a local straightforward fix, you often do not need a reusable prompt at all.
3. For bug work, prefer `bug-diagnosis-prompt.md` before jumping directly to exploratory testing.
4. For E2E failures, pair the relevant prompt with `docs/references/e2e-test-diagnostic-guide.md` and `docs/testing/e2e-standards.md`.
