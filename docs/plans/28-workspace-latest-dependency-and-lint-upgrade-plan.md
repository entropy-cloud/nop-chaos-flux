# Workspace Latest Dependency And Lint Upgrade Plan (#28)

> Plan Status: superseded
> Created: 2026-04-02
> Last Reviewed: 2026-04-04
> Source: workspace dependency audit, `pnpm.cmd outdated -r`, TypeScript 6 upgrade validation, ESLint 10 + `eslint-plugin-react-hooks` 7 compatibility review

> **Implementation Status: ⚠️ SUPERSEDED BY COMPATIBILITY POLICY**
> Parts of the original upgrade intent have already landed in the workspace (`typescript` 6, Vite 8, Vitest 4, latest strict `eslint-plugin-react-hooks` baseline, targeted dependency refreshes). However, the core assumptions of this plan are no longer valid: the repository must preserve React 18 compatibility, avoid unnecessary major-version churn, and respect cross-package compatibility constraints instead of blindly upgrading to the latest versions.
>
> This plan should not be executed as written. Any future dependency refresh must be re-scoped as a compatibility-driven upgrade plan with an explicit React support range and package compatibility matrix.

## Supersession Note

This plan is superseded in the current workspace.

Reasons:

- the original plan explicitly allowed breaking upgrades and treated compatibility as non-goal
- current repository policy requires React 18 compatibility and package-to-package compatibility validation
- some toolchain goals have already been achieved, so the remaining work is not a clean “upgrade everything to latest” pass anymore
- `pnpm outdated -r` on 2026-04-04 shows only a small remaining candidate set rather than the broad stale baseline this plan started from

---

## Goal

Upgrade the monorepo to the latest available dependency baseline, adopt the strictest current lint policy, and use the migration as a deliberate next-generation architecture reset rather than a compatibility-preserving maintenance pass.

This plan assumes the following are true:

- breaking changes are allowed
- compatibility with older local patterns is not a requirement
- generated or imported code may be rewritten freely
- lint failures produced by the newest baseline are architecture work, not exceptions to suppress

---

## Why Upgrade Now

### 1. Security and ecosystem drift

- The workspace was no longer on the latest published versions for core toolchain packages such as `vite`, `typescript`, `vitest`, `eslint`, `@eslint/js`, `typescript-eslint`, `@playwright/test`, `jsdom`, `react-resizable-panels`, and `recharts`.
- Staying behind increases the probability of accumulating multiple breaking changes into a single later migration.
- A next-generation codebase should make freshness the default, not a postponed cleanup task.

### 2. TypeScript and build pipeline baseline changed

- Upgrading to TypeScript 6 exposed deprecated or stricter config behavior around `baseUrl`, `paths`, `rootDir`, side-effect CSS imports, and external declaration gaps.
- These are not incidental failures; they show where current package boundaries or build assumptions still depend on older compiler tolerance.
- A strict architecture should remove those assumptions instead of preserving them.

### 3. Lint baseline changed materially

- Upgrading to `eslint-plugin-react-hooks` 7.x changed the meaning of the lint baseline.
- The plugin now ships compiler-oriented rules and a stronger `recommended-latest` preset.
- For this repo, that change is desirable: it gives the architecture a stronger static contract for immutability, analyzability, and callback structure.

### 4. The repo direction is explicit

- This workspace is being treated as next-generation architecture work.
- The migration should therefore optimize for strongest current design, not smallest compatibility delta.
- If legacy local patterns conflict with the chosen standard, the patterns should be rewritten.

---

## Scope

### In scope

- Root workspace dev toolchain upgrades
- Package-level dependency upgrades under `packages/` and `apps/`
- TypeScript config adjustments required by latest compiler behavior
- ESLint baseline upgrade to the strictest current `react-hooks` policy
- Breaking rewrites of hooks, shared UI primitives, and adapter code required by the new lint baseline
- Build/test/lint fixes that are direct consequences of the upgrade
- Documentation updates for the new engineering policy

### Out of scope

- Feature work unrelated to the upgraded baseline
- Compatibility shims whose only purpose is to preserve old local patterns
- Lint downgrades added solely to avoid rewriting code that no longer matches the chosen architecture

---

## Current Findings Snapshot

### Confirmed outdated packages from workspace audit

- `vite`
- `@playwright/test`
- `typescript`
- `vitest`
- `eslint`
- `@eslint/js`
- `typescript-eslint`
- `eslint-plugin-react-hooks`
- `jsdom`
- `@xyflow/react`
- `@codemirror/view`
- `react-resizable-panels`
- `recharts`
- `@types/use-sync-external-store`

### Confirmed latest or effectively latest Tailwind stack

- `tailwindcss`
- `@tailwindcss/postcss`
- `@tailwindcss/vite`
- `tailwindcss-animate`

### Observed upgrade pressure points

- TypeScript 6 strictness around `baseUrl`, `paths`, and package `rootDir`
- Missing declaration coverage for `@hufe921/canvas-editor`
- Side-effect CSS import declaration gap for `@xyflow/react/dist/style.css`
- `react-resizable-panels` API/type surface changes from 2.x to 4.x
- `eslint-plugin-react-hooks` 7.x already exposing mutable custom-hook patterns in `packages/ui/`
- Generated artifacts under `packages/*/src/` reappearing as repository hygiene failures during verification

---

## Chosen Lint Policy

This plan explicitly adopts the strictest current React hooks baseline.

### Selected baseline

- Keep the latest `eslint-plugin-react-hooks`
- Use `reactHooks.configs.flat['recommended-latest']` as the target policy
- Treat compiler-oriented rules as normative architecture constraints
- Rewrite code that fails the new rules rather than weakening the rules to preserve old patterns

### Why this is the right choice

- The repo is explicitly targeting next-generation architecture.
- The newest lint baseline provides stronger guarantees around immutability and analyzability.
- A weaker preset would preserve patterns the new architecture is trying to remove.
- shadcn-derived code is only a starting point; once imported into this repo, it must satisfy repo standards, not the other way around.

### Immediate consequence

- `packages/ui/` is not special-cased for compatibility.
- Custom hooks, imperative bridge helpers, and ref wiring utilities are expected to be rewritten if they violate the strict baseline.
- Local lint exceptions should only exist for documented architectural reasons, not migration convenience.

---

## Execution Plan

### Phase 1: Baseline and freeze the current state

1. Run `pnpm.cmd outdated -r` and capture all outdated packages.
2. Classify upgrades into:
   - toolchain
   - testing/runtime infrastructure
   - UI/runtime libraries
   - type-only support packages
3. Record exact versions before and after upgrade in the execution log.

Acceptance:

- The repo has a written before/after package summary.
- All version changes are attributable to a documented command or manifest edit.

### Phase 2: Upgrade core workspace tooling

Upgrade the root toolchain first:

- `typescript`
- `vite`
- `vitest`
- `@playwright/test`
- `eslint`
- `@eslint/js`
- `typescript-eslint`
- `eslint-plugin-react-hooks`
- `jsdom`

Rules:

- Upgrade from the root where possible so all packages inherit a consistent toolchain.
- Do not defer source rewrites that are immediately required by the stricter baseline.

Acceptance:

- Root `package.json` and lockfile reflect the intended latest versions.
- The workspace installs cleanly with no unresolved package manager errors.

### Phase 3: Upgrade package/runtime dependencies

Upgrade package-level dependencies with the highest compatibility impact:

- `@xyflow/react`
- `@codemirror/view`
- `react-resizable-panels`
- `recharts`
- `@types/use-sync-external-store`

Rules:

- Verify each major upgrade against actual code usage before refactoring.
- Prefer clean adapter rewrites over temporary compatibility patches.

Acceptance:

- Each upgraded dependency has either no source changes or a documented architecture-aligned rewrite.

### Phase 4: Restore TypeScript and build correctness

Apply the compiler/config changes required by the latest toolchain and remove outdated assumptions rather than preserving them by default:

- make TypeScript 6 deprecation handling explicit
- keep workspace path alias behavior intentional
- fix `rootDir` assumptions where packages typecheck against workspace source aliases
- add missing declaration shims only as deliberate integration boundaries
- ensure build configs do not accidentally drop required type shims
- ensure CSS side-effect imports are declared where needed

Acceptance:

- `pnpm.cmd typecheck` passes
- `pnpm.cmd build` passes
- no package emits artifacts into `packages/*/src/`

### Phase 5: Adopt strict lint rules fully

Implement the chosen strict policy directly.

Required actions:

- keep the latest ESLint packages
- switch the repo to `reactHooks.configs.flat['recommended-latest']` or the equivalent strict preset for the active config format
- refactor code that mutates hook inputs, forwarded refs, props-derived values, or other values rejected by the new rules
- audit custom hooks under `packages/ui/` first, then all other failing packages in dependency order
- remove rule overrides that exist only to preserve older local patterns

Priority rewrite targets:

- `packages/ui/` custom hooks and imperative helpers
- shared adapter layers around third-party libraries
- React renderer utilities with mutable closure patterns or non-analyzable callback graphs

Acceptance:

- `pnpm.cmd lint` passes
- lint passes under `recommended-latest`, not a downgraded substitute
- no package depends on local lint downgrades whose only purpose is backward compatibility

### Phase 6: Verify tests and runtime safety

1. Run workspace `test`.
2. Run targeted package tests for any package touched by compatibility or architecture rewrites.
3. Re-run `node scripts/verify-no-src-artifacts.mjs`.

Acceptance:

- `pnpm.cmd test` passes, or any remaining failures are documented as unrelated
- no new build artifacts leak into source directories

### Phase 7: Documentation and architecture follow-up

1. Update the daily dev log with executed version upgrades and policy decisions.
2. Update maintenance guidance if the lint or TypeScript baseline meaningfully changed.
3. Add or update architecture guidance describing why strict compiler-oriented React lint rules are normative for this repo.

Acceptance:

- the repo documents both what changed and why
- future maintainers can tell that strict hooks enforcement is mandatory, not optional

---

## Concrete Implementation Scheme

### Dependency upgrade scheme

- Use `pnpm.cmd outdated -r` to produce the candidate set.
- Upgrade with `pnpm.cmd up -r <pkg>@latest` in grouped batches.
- Prefer grouped upgrades by concern:
  - compiler and build
  - lint and static analysis
  - test/runtime tooling
  - UI/runtime libraries

### Lint rule update scheme

- Keep ESLint itself on the latest stable version.
- Keep `eslint-plugin-react-hooks` on the latest stable version.
- Explicitly adopt the newest strict preset.
- For this repo, the default execution path is:
  - latest plugin version
  - `recommended-latest`
  - code rewrites where necessary

### Code-fix scheme

- Fix root-cause config and toolchain issues first.
- Rewrite package internals when the strict baseline shows they do not fit the target architecture.
- For missing external declarations, prefer centralized shims or explicit adapter boundaries over repeated ad hoc hacks.
- For changed third-party APIs, patch or replace the adapter layer cleanly.

### Rewrite principles for strict hooks compliance

- Treat hook arguments and forwarded refs as read-only inputs.
- Prefer internal refs/state plus explicit synchronization over mutating external refs as primary state.
- Prefer analyzable callback graphs over circular or late-bound callback references.
- Prefer deterministic immutable transforms over imperative mutation in render-adjacent code.
- If a shadcn-derived component conflicts with the repo baseline, rewrite it to match the repo baseline.

---

## Risks

### Risk 1: Toolchain upgrade hides a policy change inside a version bump

Example:

- `eslint-plugin-react-hooks` 7.x changes the practical meaning of the preset.

Mitigation:

- Make the strict lint policy explicit in config and docs.

### Risk 2: Strict lint adoption increases rewrite volume

Mitigation:

- Accept this as intentional scope.
- Sequence work by package criticality, starting with shared UI and hook-heavy packages.

### Risk 3: TypeScript 6 compatibility fixes are applied inconsistently between typecheck and build configs

Mitigation:

- verify both `tsconfig.json` and `tsconfig.build.json` paths for any package that needs shims or alias exceptions.

### Risk 4: Source artifact leakage returns during build verification

Mitigation:

- keep `verify-no-src-artifacts.mjs` in the verification path
- delete leaked outputs immediately and fix the generating config

### Risk 5: Upstream UI libraries changed APIs semantically, not just types

Mitigation:

- verify adapter-layer behavior with targeted tests after each major UI dependency upgrade.

---

## Verification Checklist

- `pnpm.cmd install` succeeds
- `pnpm.cmd outdated -r` shows no remaining intended upgrade targets for this plan
- `pnpm.cmd typecheck` passes
- `pnpm.cmd build` passes
- `pnpm.cmd lint` passes under `recommended-latest`
- `pnpm.cmd test` passes or any remaining failures are documented as unrelated
- `node scripts/verify-no-src-artifacts.mjs` passes
- `docs/logs/2026/04-02.md` records the upgrade plan and decision rationale

---

## Exit Criteria

This plan is complete when all of the following are true:

- the workspace is on the intended latest dependency baseline
- the lint baseline is current, intentional, and set to the strict latest hooks policy
- verification commands pass end-to-end
- the repo has a documented answer for why strict compiler-oriented hooks rules are mandatory here

This plan is not complete if the workspace reaches latest package versions by weakening the lint baseline. The target state is latest dependencies plus the latest strict engineering policy.
