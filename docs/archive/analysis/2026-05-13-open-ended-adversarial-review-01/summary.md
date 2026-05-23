# Open-Ended Adversarial Review — Final Summary

**Execution date**: 2026-05-13
**Total rounds**: 4
**Total findings**: 43 (13 high/critical, 20 medium, 10 low)
**Domains explored**: Scope/store lifecycle, dependency tracking, action dispatch, compilation pipeline, i18n, accessibility, CSS/styling system, test infrastructure, CRUD coordination, SchemaRenderer recompilation, theme-tokens independence, component registry, security surface

---

## Top 3 Directions That Deserve Immediate Attention

### 1. Dependency Tracking Dead-Lock + Doc-Code Mismatch (Round 1, Findings 1-2)

The combination of "formula source dead-lock after initial failure" and "doc says undefined dependencies invalidate everything but code skips everything" is a correctness bug with a documentation camouflage. A formula source that fails once becomes permanently unresponsive to scope changes. The doc claims the system is conservative (invalidate on unknown dependencies), but the code is permissive (skip on unknown dependencies). This means the bug is invisible to anyone who reads the doc instead of the code.

**Why this direction**: Silent data staleness is the worst class of bug — the UI looks fine but shows wrong data. No error is raised. The fix is straightforward (update `onDependenciesChange` call to run even on failure, or fix `scopeChangeHitsDependencies` to match the doc's conservative behavior), but the doc-code mismatch means the current team may not even know the behavior is wrong.

### 2. Theme-Tokens Independence + CSS Token Gaps (Rounds 2-3)

The theme-tokens package cannot be used independently. It provides zero unconditional color fallbacks. The `--destructive` token is never defined. The playground's `:root` overrides mask all issues. All four theme variants are dead code in the playground context. The `--radius` chain has a latent circular dependency. Any consumer not using the playground's exact stylesheet configuration will get invisible form errors, broken shadows, and invalid colors.

**Why this direction**: This is a "last mile" integration problem. The tokens exist, the system works in the playground, but the packaging layer between "works for us" and "works for consumers" is incomplete. Fixing this requires: (1) adding unconditional fallback colors to theme-tokens' `:root`, (2) adding `--destructive` to all theme variants, (3) testing theme-tokens without the playground's overrides.

### 3. Schema Recompilation State Destruction (Round 3, Finding 1)

SchemaRenderer has no structural equality check on the schema prop. Any identity change triggers full recompilation, producing new TemplateNodes, which causes all NodeRenderers to unmount/remount, destroying all form values, scroll positions, focus state, subscriptions, and component registrations. The natural JSX pattern `<SchemaRenderer schema={{ type: 'page', body: [...] }} />` triggers this on every parent render.

**Why this direction**: This is the single highest-impact performance and state-preservation issue. It affects every consumer who creates schema objects inline (which is the natural, undocumented pattern). The fix requires either a structural hash in the compiler or a `useMemo`-by-default in the SchemaRenderer API. Without this fix, the framework leaks state on every re-render, which is a showstopper for production forms.

---

## Blind-Spot Self-Assessment

This review likely missed or under-explored the following areas:

1. **Performance profiling under load**: I identified theoretical performance issues (formula sources always writing, no diamond dedup, composite scope firing on unchanged parent data) but did not measure actual impact. A performance profiling session with realistic schemas (100+ fields, 10+ data sources, nested forms) would validate whether these are real bottlenecks or theoretical concerns.

2. **SSR/SSG compatibility**: The review touched on SSR briefly (noting `localStorage` usage in word-editor-core from prior reviews) but did not systematically check for `window`/`document` access during server rendering. A dedicated SSR audit would find more issues.

3. **Mobile/touch interaction**: The accessibility audit covered keyboard navigation but did not examine touch interaction patterns (swipe, pinch, long-press) or responsive layout breakage on small screens.

4. **Concurrent React mode**: The review assumed React 18+ automatic batching but did not test behavior under `createRoot` with concurrent features (transitions, Suspense boundaries). SchemaRenderer's `useMemo`-for-compilation pattern may not work correctly with concurrent rendering interruptions.

5. **Cross-package API surface coherence**: While the review found individual type safety issues, it did not systematically audit the public API surface across all packages for consistency (naming conventions, parameter order, return type patterns, error handling patterns).

6. **E2e test flakiness**: The review identified missing e2e coverage but did not run existing e2e tests to check for flakiness. The CRUD race conditions (Round 3) suggest that existing CRUD e2e tests may be flaky under load.

7. **Browser compatibility**: The review noted `color-mix()` browser support but did not systematically check for other modern CSS or JS features that might exclude older browsers.

---

## Findings by Domain

| Domain                           | Rounds | Findings | Highest Severity                                |
| -------------------------------- | ------ | -------- | ----------------------------------------------- |
| Dependency tracking / reactivity | 1      | 3        | CRITICAL (source dead-lock)                     |
| i18n / accessibility             | 1      | 5        | CRITICAL (UI English-only `t()`)                |
| Scope / store lifecycle          | 1      | 5        | HIGH (moduleCache, useHostScope leak)           |
| Action dispatch                  | 1      | 5        | HIGH (no concurrent serialization)              |
| Compilation pipeline             | 1      | 4        | MEDIUM (no fallback renderer, CID accumulation) |
| CSS / styling system             | 2-3    | 6        | HIGH (`--destructive` missing)                  |
| Test infrastructure              | 2      | 5        | CRITICAL (5 runtime modules untested)           |
| Theme-tokens independence        | 3      | 4        | HIGH (zero color fallbacks)                     |
| CRUD coordination                | 3      | 4        | MEDIUM (stale closures, no operation guard)     |
| SchemaRenderer recompilation     | 3      | 3        | HIGH (identity change = state destruction)      |
| Component registry               | 4      | 2        | MEDIUM (no duplicate ID detection)              |
| Security surface                 | 4      | 0        | No critical findings (strong posture)           |

---

## Files Written

- `docs/analysis/2026-05-13-open-ended-adversarial-review-01/round-01.md`
- `docs/analysis/2026-05-13-open-ended-adversarial-review-01/round-02.md`
- `docs/analysis/2026-05-13-open-ended-adversarial-review-01/round-03.md`
- `docs/analysis/2026-05-13-open-ended-adversarial-review-01/round-04.md`
- `docs/analysis/2026-05-13-open-ended-adversarial-review-01/summary.md` (this file)
