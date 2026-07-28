# {2} Package Dependency & Build Hygiene

> Plan Status: active
> Last Reviewed: 2026-07-28
> Source: `docs/backlog/audit-remediation-roadmap.md` Follow-up Backlog (D01 + Open Audit P2-A/B/J/K)
> Related: `docs/plans/2026-07-28-1800-1-async-safety-error-propagation-p2.md`, `docs/plans/2026-07-28-0900-3-infrastructure-and-build-tooling.md`

## Purpose

Fix 12 P2 package dependency and build hygiene findings: correct stale/missing dependency declarations, resolve bare peer-dep wildcard references, remove copy-paste leftover deps, adjudicate cross-renderer coupling patterns, and standardize CSS subpath export format across the monorepo.

## Current Baseline

- P0/P1 infrastructure plan (2026-07-28-0900-3) fixed Tailwind v4 config, CI pipeline, turbo.json, and core coverage config.
- 8 D01 dependency-graph findings from multi-audit remain: 1 stale Rule(c) text, 1 missing dep, 5 cross-package coupling issues, and 1 runtime-public-API verification needed.
- 4 Open Audit P2 package.json items: bare `"*"` peer dep in flux-bundle, leftover `recharts` peer dep in word-editor, missing explicit flux-react dep in mobile (duplicates 01-02), and inconsistent CSS subpath export format across packages.
- All findings are P2/non-blocking — no package fails to build or typecheck due to these issues.

## Goals

- All package.json text/dep fields accurate: stale text corrected, missing deps added, wildcard peer deps pinned, leftover deps removed.
- Cross-package coupling adjudicated for each of the 5 identified sites: accept-and-annotate, extract-to-shared, or restructure.
- CSS subpath export format consistent across all packages that export CSS.

## Non-Goals

- Not redesigning package boundaries or creating new shared packages (may adjudicate as "accept").
- Not addressing circular dependencies (MA72-P2-002, tracked separately as out-of-scope improvement).
- Not adding a `@deprecated` CI guard (MA72-P2-001, tracked separately).
- Not changing runtime code — only package.json declarations and documentation.

## Scope

### In Scope

**D01 — Dependency graph (8 items):**

- 01-01: `flux-runtime/package.json:15-20` — Rule(c) text outdated vs actual deps
- 01-02: `flux-renderers-mobile/package.json:20-24` — missing flux-react dependency
- 01-03: `flux-renderers-data/package.json:15-22` — cross-renderer coupling data→basic
- 01-04: `flux-renderers-form-advanced/package.json:22-24` — cross-renderer coupling: 3 renderer packages
- 01-05: `flux-renderers-ai/package.json:28` — cross-renderer coupling ai→content
- 01-06: `flux-code-editor/package.json:43` — cross-renderer coupling code-editor→form
- 01-09: `report-designer-renderers/package.json:20-23` — cross-domain coupling report→spreadsheet
- 01-11: `flux-renderers-form-advanced/package.json:25` — runtime dependency public API verification

**Open Audit P2 package.json items (after dedup with 01-02):**

- P2-A: `flux-bundle/package.json:25` — `@nop-chaos/ui` peer dep bare `"*"`
- P2-B: `word-editor-renderers/package.json:30` — `recharts` peer dep leftover
- P2-K: Various — inconsistent CSS subpath export format

### Out Of Scope

- Circular dependency resolution (14 known sites, MA72-P2-002).
- `@deprecated` CI fail-fast guard (MA72-P2-001).
- Test file location convention (P2-C) or low-assertion tests (P2-D) — separate follow-up backlog.
- Code quality anti-patterns (D04 state ownership, D11 UI components).

## Failure Paths

| Scenario                          | Trigger                                | Behavior                                          | Retry | User Visible             |
| --------------------------------- | -------------------------------------- | ------------------------------------------------- | ----- | ------------------------ |
| Missing peer dep added            | Consumer using new import              | No runtime impact (already resolved transitively) | No    | Cleaner install output   |
| Cross-coupling adjudication wrong | Shared function moved to wrong package | May need re-adjudication                          | No    | Potential duplicate code |

## Test Strategy

本档选择：`不适用：package.json/build changes only` — no behavioral code changes. Verification via `pnpm typecheck && pnpm build` suffices.

## Execution Plan

### Phase 1 — Straightforward Package.json Fixes

Status: planned
Targets: `flux-runtime/package.json`, `flux-renderers-mobile/package.json`, `flux-bundle/package.json`, `word-editor-renderers/package.json`

- Item Types: `Fix | Decision`

- [ ] 01-01 — flux-runtime/package.json: update Rule(c) text to match actual declared/production deps
- [ ] 01-02 (P2-J dup) — flux-renderers-mobile/package.json: add explicit `@nop-chaos/flux-react` to deps or peerDeps
- [ ] P2-A — flux-bundle/package.json: change `"@nop-chaos/ui": "*"` peer dep to explicit `"workspace:*"`
- [ ] P2-B — word-editor-renderers/package.json: remove `recharts` peer dep (copy-paste leftover)

Exit Criteria:

- [ ] All 4 straightforward package.json edits applied
- [ ] Rule(c) text in flux-runtime/package.json matches actual dependency set
- [ ] flux-renderers-mobile has explicit flux-react dependency declared
- [ ] flux-bundle peer dep uses explicit version (not bare `"*"`)
- [ ] word-editor-renderers no longer declares recharts peer dep
- [ ] `pnpm typecheck && pnpm build` passes

### Phase 2 — Cross-Package Coupling Adjudication

Status: planned
Targets: `flux-renderers-data/package.json`, `flux-renderers-form-advanced/package.json`, `flux-renderers-ai/package.json`, `flux-code-editor/package.json`, `report-designer-renderers/package.json`

- Item Types: `Decision | Fix`

- [ ] 01-03 — flux-renderers-data: adjudicate data→basic coupling (inspect usage, decide: accept-and-annotate vs extract)
- [ ] 01-04 — flux-renderers-form-advanced: adjudicate 3-package coupling (form-advanced→form→basic)
- [ ] 01-05 — flux-renderers-ai: adjudicate ai→content coupling
- [ ] 01-06 — flux-code-editor: adjudicate code-editor→form coupling
- [ ] 01-09 — report-designer-renderers: adjudicate report→spreadsheet cross-domain coupling
- [ ] 01-11 — flux-renderers-form-advanced: verify runtime dep only uses public API; document if OK or escalate

Exit Criteria:

- [ ] Each of the 6 coupling sites has a written Decision (in source comment or package.json comment) recording: what is depended on, why it's acceptable (or what refactoring is needed), and whether extraction to a shared package is warranted
- [ ] Package.json annotated where coupling is accepted
- [ ] No behavioral code change — documentation-only for cross-coupling sites
- [ ] `pnpm typecheck && pnpm build` passes

### Phase 3 — CSS Subpath Export Format Standardization

Status: planned
Targets: All packages exporting CSS via package.json `exports` field

- Item Types: `Fix | Proof`

- [ ] P2-K-01 — Audit all packages for CSS subpath export format inconsistencies (e.g. `"./styles.css"` vs `"./styles"` vs bare path formats)
- [ ] P2-K-02 — Standardize to the convention used by the majority of well-formed packages in the monorepo

Exit Criteria:

- [ ] CSS subpath export format is consistent across all packages that export CSS
- [ ] `pnpm typecheck && pnpm build` passes
- [ ] `pnpm test` passes (verify no import breakage)

## Draft Review Record

- Reviewer / Agent: plan-review-subagent (fresh independent session, task ses_058e4abe3ffeQU1zLrG9pJN8D4)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: No Blocker/Major issues. Minor items (Phase 3 CSS subpath audit ambiguity, Test Strategy format) non-blocking and addressable during execution.

## Closure Gates

- [ ] All D01 items resolved (text fixed, coupling adjudicated, public API verified)
- [ ] All Open Audit P2 package.json items resolved (peer dep, leftover dep, CSS export format)
- [ ] Cross-coupling adjudication recorded for each site — no unresolved ambiguity
- [ ] No in-scope live defect or contract drift silently deferred to follow-up
- [ ] Affected owner docs synced (daily dev log)
- [ ] By independent sub-agent (fresh session) executed closure audit and recorded evidence; execution session did not self-audit or self-check this item
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

No deferred items — all in-scope findings are actionable with clear resolution paths (Fix or Decision).

## Non-Blocking Follow-ups

- MA72-P2-001 (CI deprecation guard) and MA72-P2-002 (circular deps) remain tracked in follow-up backlog, out of scope for this package-hygiene plan.
- Remaining P2 items from D04 (state ownership), D11 (UI components), and Open Audit general P2 (code quality, test conventions) remain in roadmap follow-up backlog.

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:
