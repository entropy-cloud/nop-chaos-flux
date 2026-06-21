# Context

## Purpose

`docs/context/` is the **mandatory AI context layer**: the shortest current snapshot and the project-wide rules an agent needs _before_ deciding whether it may touch product behavior.

This is the layer that answers "can I start, and what must I respect?" — as opposed to `docs/architecture/` (what must stay true) and `docs/plans/` (how a slice will be closed).

## Read These First (in order)

1. `project-context.md` — static project baseline: identity, documentation freshness, technical stack, verification commands. (Work-in-progress is found via unfinished plans in `docs/plans/`, not maintained here.)
2. `ai-autonomy-policy.md` — autonomy levels, protected areas, and the proceed/stop gates.
3. `source-of-truth-and-precedence.md` — which artifact answers which question, and who wins on conflict.
4. `codebase-map.md` — entry points, common change routes, and fragile files.

## What Belongs Here

- project-wide rules that gate _whether_ work may start
- the single current-state snapshot
- source-of-truth precedence and conflict resolution
- AI autonomy boundaries and protected areas

## What Does NOT Belong Here

- stable architecture intent → `docs/architecture/`
- component contracts → `docs/components/<x>/design.md`
- execution slices → `docs/plans/`
- reusable review methods → `docs/skills/`
- daily history → `docs/logs/`

## Update Rule

`project-context.md` and `codebase-map.md` are updated **in place** (never dated copies) whenever the technical baseline, verification commands, or documentation freshness change. The other three are stable owner docs. Do not add high-churn "current activity" state here — it goes stale and is hard to maintain; use unfinished plans and the roadmap instead.
