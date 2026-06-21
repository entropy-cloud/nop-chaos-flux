# Source Of Truth And Precedence

## Purpose

State which artifact answers which question, so stable intent is not mixed with execution history or stale prose. This prevents the most common agent failure mode in this repo: confusing "the architecture says X" with "the code currently does Y".

## Precedence By Question

| Question                           | Primary source                                                       | Rule                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| What should be built next?         | `docs/components/roadmap.md` (Phase Status)                          | Roadmap = human-aligned work queue; first `todo` work item in order. Current WIP = unfinished plans in `docs/plans/` |
| What is the stable architecture?   | `docs/architecture/*.md`                                             | These own the design attractor; update in place                                                                      |
| What is a component contract?      | `docs/components/<x>/design.md`                                      | Component behavior baseline                                                                                          |
| What are the public types/APIs?    | `packages/*/src/index.ts` + `docs/references/renderer-interfaces.md` | Code is the runtime truth; reference doc is the index                                                                |
| What does a Flux term mean?        | `docs/references/terminology.md`                                     | Canonical vocabulary                                                                                                 |
| What does the AMIS type look like? | `docs/amis-types/`                                                   | AMIS `.d.ts` mirror                                                                                                  |
| What is the current code truth?    | `packages/*/src/` (live code)                                        | Wins over prose when they conflict, _unless_ the prose is a protected design intent                                  |
| How was a slice executed?          | `docs/plans/<NNN>-*.md` + `docs/logs/{year}/`                        | Execution memory                                                                                                     |
| Why did a regression happen?       | `docs/bugs/`                                                         | Root-cause record                                                                                                    |
| What reusable method applies?      | `docs/skills/`                                                       | Method selector, never the attractor itself                                                                          |

## Conflict Resolution

1. **Protected design intent beats drift.** If `docs/architecture/` states a contract and the code drifted, the architecture is the intended truth; the drift is a defect (or intentional legacy — see below), not a new baseline.
2. **Code beats stale prose for current behavior.** For "what does it do _now_", live code wins over an outdated doc. Flag the doc for update.
3. **Schema/type definitions beat narrative.** When prose and a `.d.ts`/`schema`/`index.ts` disagree, the definition wins.
4. **Logs/plans are history, not spec.** A completed plan records what happened in one slice; it does not redefine the stable baseline.

## Legacy Or Stale-Docs Mode

When a conflict is found, classify it before acting:

- **Implementation drift** — code diverged from a still-valid owner doc → fix the code (or file a bug); do not rewrite the doc to match the drift.
- **Doc drift** — owner doc describes an older design, code moved on intentionally → update the doc to match code, after confirming the new behavior is intended.
- **Intentional legacy** — known frozen old behavior kept for compatibility → record in `docs/archive/` or a `Non-Goals` note; do not "fix" either side.

Under any unresolved conflict, autonomy defaults to `research-only` or `plan-first` until a human or owner-doc confirms which side is intended.

## Rule Of Thumb

- Stable behavior/contract → owner docs (`architecture/`, `components/`)
- How a slice closes → `plans/` + `logs/`
- What happened and why → `bugs/`, `lessons/`, `analysis/`
