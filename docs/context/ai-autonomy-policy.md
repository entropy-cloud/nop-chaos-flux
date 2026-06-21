# AI Autonomy Policy

## Purpose

Define when AI may proceed without asking versus when it must stop for human input. This is the gate that runs _before_ `docs/plans/` execution discipline.

## Autonomy Levels

| Level           | Meaning                                                               |
| --------------- | --------------------------------------------------------------------- |
| `implement`     | Agent may write code and close the slice per `AGENTS.md` rules.       |
| `plan-first`    | Agent may only draft/revise a plan; no product-behavior code yet.     |
| `ask-first`     | Agent must ask a human before each non-trivial change.                |
| `research-only` | Agent may read, audit, and write alignment docs; no behavior changes. |
| `blocked`       | Agent must not change product behavior until a human lifts the block. |

The default level for this project is `implement`. It is gated by documentation freshness (`project-context.md`) and the Protected Areas below. A human may set a different level by editing this file; AI may tighten (never loosen) it based on evidence.

**Ratchet rule**: AI may tighten autonomy (e.g. `implement` → `plan-first`) based on evidence, but must never loosen it (e.g. never `plan-first` → `implement`) without human confirmation or human-approved owner-doc evidence.

## Reviewer Availability

`human | subagent | none`. Default `none` means solo cold-replay. Solo cold-replay closure is acceptable only for non-protected, non-high-risk plans and must be recorded as such in the plan's Closure evidence.

## AI May Proceed Without Asking When

- documentation freshness is `fresh` (or the touched slice is verified fresh under `partially stale`)
- verification commands in `project-context.md` are real and currently passing
- the change touches no Protected Area below
- a plan exists or the change is trivial per `AGENTS.md` planning triggers
- AI autonomy is `implement`

## AI Must Ask Or Stop Before

- touching any Protected Area without an owner doc describing expected behavior
- changing a public export surface (`packages/*/src/index.ts`, `@nop-chaos/ui`)
- changing auth, permission, data-deletion, or external-integration behavior
- marking stale docs fresh, or lifting a blocker
- committing (per `AGENTS.md`: never commit unless explicitly asked)

## Protected Areas

| Area                                                                       | Rule         | Required Evidence                                                                 |
| -------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------- |
| `packages/flux-core/src/` (compiler: scope, expressions, schema)           | `plan-first` | Owner doc in `docs/architecture/flux-core.md` + a plan                            |
| Schema/contract validation (`schema-file-validator`, capability manifests) | `plan-first` | `docs/architecture/schema-file-validator.md`, `capability-projection-manifest.md` |
| `packages/ui/src/index.ts` (public component exports)                      | `ask-first`  | Reason for adding/changing a public component                                     |
| Renderer definition fields (`check-renderer-definition-fields-only`)       | `plan-first` | `docs/references/renderer-interfaces.md` alignment                                |
| Styling contract (marker classes, `data-slot`, no BEM)                     | `plan-first` | `docs/architecture/styling-system.md`                                             |
| Auth/security boundaries                                                   | `ask-first`  | `docs/architecture/security-design-requirements.md`                               |

## Backlog Selection Rule

The roadmap (`docs/components/roadmap.md`) is a **human–AI alignment artifact**: humans decide which work items exist and their priority order; AI executes in that order. Take the first `todo` work item in Phase Status priority order — do not re-arbitrate priority. Before starting, also scan unfinished plans in `docs/plans/` (the goal-driver's SCAN_PLANS step): an in-progress plan is resumed before a new work item is started. Re-check planning triggers in `AGENTS.md` once a target is chosen.
