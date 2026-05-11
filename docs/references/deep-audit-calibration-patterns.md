# Deep Audit Calibration Patterns

## Purpose

This file captures `nop-chaos-flux`-specific deep-audit calibration patterns that repeatedly showed up as downgraded or rejected findings during meta-review.

- Use it to reduce repeat false positives.
- Do not treat it as a blanket exemption list.
- A finding that matches one of these patterns may still be valid, but it must clear the stated evidence bar.

## How To Use

Read this file before running a deep audit or deep-audit recheck.

When a candidate finding matches a pattern below:

1. apply the default disposition first
2. only keep the finding if the stronger evidence condition is satisfied
3. explain why this case is not just the known false-positive pattern

## V1 Override

If the current audit baseline explicitly declares the repository is operating as `v1 / no compatibility burden / no transitional main-path allowances`, then transitional-state and migration-phase downgrade logic does not apply on its own. In that mode:

- a live compatibility layer on the main path is itself candidate defect evidence
- an intermediate slice already wired into public/runtime/host surfaces must be judged as current design, not excused as "still converging"
- this file still filters stylistic false positives, but it must not be used to preserve partial migrations or compatibility carry paths

## Disposition Levels

- `reject`: do not report unless the case clearly escapes the pattern definition
- `downgrade`: may be reported, but normally not as a primary remediation driver
- `require-stronger-evidence`: only report when concrete contract breakage, owner drift, or measurable risk is shown

## Pattern Format

Each pattern records:

- default disposition
- why the pattern often produces noise
- when the finding may still be retained
- representative repository examples or source history

## Calibration Patterns

### 1. Large File Pressure Without Boundary Drift

- Default disposition: `downgrade`
- Why this is noisy: file size alone does not prove mixed ownership, bad API shape, or active maintenance pain.
- Keep only when: the file also shows mixed responsibilities, entrypoint logic leakage, documented owner drift, repeated re-inflation after a prior split, or crosses the repo's hard `>700` line rule.
- Notes: this repo already accepts some orchestrator-style large files when the ownership remains coherent.
- Source history: `docs/analysis/2026-04-17-deep-audit-meta-review.md`

### 2. Public Renderer Dependencies On Core Runtime Packages

- Default disposition: `require-stronger-evidence`
- Why this is noisy: `renderers -> flux-core/flux-formula/flux-runtime` through stable public APIs is an allowed repo shape, not a defect by itself.
- Keep only when: the dependency uses private paths, creates a cycle, leaks undocumented private coupling, or causes concrete manifest / ownership / maintenance problems.
- Notes: idealized ladder diagrams are not sufficient evidence.
- Source history: `docs/analysis/2026-04-17-deep-audit-meta-review.md`

### 3. Raw HTML As Automatic UI Contract Violation

- Default disposition: `require-stronger-evidence`
- Why this is noisy: some browser-native controls and high-performance host surfaces are better served by raw elements.
- Keep only when: an equivalent `@nop-chaos/ui` abstraction exists, the replacement has clear benefit, and the current raw element creates a real consistency, accessibility, contract, or maintenance problem.
- Notes: `input[type=file]`, `input[type=color]`, spreadsheet-like grid surfaces, and similar host-specialized controls are common exceptions.
- Source history: `docs/analysis/2026-04-17-deep-audit-meta-review.md`

### 4. Shared Cross-Domain Renderer Reuse As Boundary Violation

- Default disposition: `require-stronger-evidence`
- Why this is noisy: some renderer packages intentionally act as reusable bridges or public shared surfaces.
- Keep only when: the dependency breaks a documented owner boundary, blocks packaging, relies on internal paths, or creates a real lifecycle / publishing problem.
- Notes: do not mechanically treat `report-designer-renderers -> spreadsheet-renderers`-style reuse as wrong.
- Source history: `docs/analysis/2026-04-17-deep-audit-meta-review.md`

### 5. Evolving Intermediate State Mistaken For Live Contract Breakage

- Default disposition: `downgrade`
- Why this is noisy: this repository often contains partially wired slices, transitional exports, or owner convergence work that is not yet claiming final contract closure.
- Keep only when: current live code and current baseline docs both imply the contract is already active, or the intermediate state already causes user-visible bugs, data loss, safety risk, or strong developer misdirection.
- Notes: distinguish "not finished" from "finished incorrectly."
- V1 override: when the repo baseline explicitly disallows transitional main-path states, do not use this pattern to downgrade a live partial migration.

### 6. Unwired Or Non-Barrel Code Treated As Dead Code

- Default disposition: `require-stronger-evidence`
- Why this is noisy: code may be owned by tests, planned integration slices, bridge layers, or emerging subpath exports without being re-exported from the root barrel yet.
- Keep only when: there are no active source references, no owner doc or plan context, no test use, and no credible in-flight integration path.
- Notes: prefer "unwired intermediate module" over "dead code" unless the evidence is decisive.

### 7. Draft Docs Used As If They Were Current Contracts

- Default disposition: `reject`
- Why this is noisy: proposed or future-facing docs are design direction, not immediate compliance gates.
- Keep only when: the referenced doc is part of the current baseline and live code simultaneously claims the same contract is already in effect.
- Notes: owner-doc precedence depends on current routing, not on the existence of any older draft.

### 8. Renderer-Local Style, UI State, Or Visual Shell Treated As Automatic Contract Drift

- Default disposition: `require-stronger-evidence`
- Why this is noisy: widget-like renderers and host surfaces often legitimately own implementation styles, transient UI state, and small dynamic style fragments.
- Keep only when: the local state mirrors canonical data ownership, the styling hardcodes consumer-controlled defaults, or the implementation conflicts with owner docs or the shared renderer contract.
- Notes: distinguish layout markers from fully owned UI controls.

### 9. Blanket FieldFrame Or Shared Shell Adoption Pressure

- Default disposition: `downgrade`
- Why this is noisy: not every composite or advanced field should be forced into the same shell model.
- Keep only when: the current renderer directly violates the active shell contract, duplicates outer chrome ownership, or produces real UX / validation inconsistencies.
- Notes: prioritize direct `wrap` conflicts and duplicated outer chrome, not blanket migration.
- Source history: `docs/analysis/2026-04-17-deep-audit-meta-review.md`

### 10. Cross-Package Consistency Ideas Reported As Current Defects

- Default disposition: `downgrade`
- Why this is noisy: convergence directions are not the same as current correctness issues.
- Keep only when: inconsistent shapes already break shared tooling, public contracts, migration paths, or create repeated maintenance churn in active areas.
- Notes: "package B does this differently from package A" is not enough on its own.
- Source history: `docs/analysis/2026-04-17-deep-audit-meta-review.md`

## Maintenance

- Update this file when a deep-audit meta-review repeatedly downgrades or rejects the same kind of finding.
- Do not add one-off project trivia; only add patterns that are likely to recur.
- If a pattern later proves too broad and starts hiding real bugs, narrow or remove it.
- Prefer linking the underlying meta-review or retained/rejected audit note rather than rewriting the whole historical story here.
