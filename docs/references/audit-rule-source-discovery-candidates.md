# Audit Rule Source Discovery Candidates

## Purpose

This note complements `audit-rule-automation-candidates.md`.

That file answers: which audit rules are good automation targets?

This file answers: even when a rule cannot be fully auto-judged, how can we mechanically find suspect source locations worth human review?

Use this note to design:

- `rg` or grep-style searches
- small `scripts/` scanners that print suspect file/line candidates
- future ESLint or AST checks when a cheap search is not precise enough

The goal is not zero false positives. The goal is to turn repeated audit work into a repeatable suspect-location discovery pass.

## Output Modes

### 1) High-confidence violation

The pattern is local and usually wrong. A script can fail CI directly.

### 2) Suspect-location search

The pattern is correlated with real bugs, but needs human adjudication. A script should print candidate file/line matches.

### 3) Coverage-seed search

The pattern is not directly wrong, but the matched locations are where targeted tests or closure audits should start.

## Rule-To-Search Matrix

### 1) `reactive-read-vs-imperative-read.md`

Discovery value: High-confidence violation in many cases.

Cheap searches:

- search `*.tsx` for `scope.get(`
- search `*.tsx` for `scope.read(`
- search `*.tsx` for `scope.readOwn(`
- search `*.tsx` for `runtime.getState()` or `store.getState()` in component render paths

Better AST candidate:

- flag these calls inside React function component bodies, excluding event handlers, effects, callbacks, and test files

Best use:

- direct CI failure for high-confidence render-body reads
- suspect listing for the remaining mixed cases

### 2) `async-error-diagnosability-and-swallowed-failures.md`

Discovery value: High-confidence and suspect-location mixed.

Cheap searches:

- search for `void ` followed by an async call with no local `.catch(`
- search for `.then(` chains that end in `.finally(` but never include `.catch(`
- search for async IIFEs started with `void` or bare invocation in non-test code

Better AST candidate:

- identify expression statements whose callee returns a `Promise` and whose outer chain lacks an explicit failure path

Best use:

- suspect listing first
- later split into fail-on-pattern rules for a narrower allowlisted subset

### 3) `single-owner-styling-defaults-and-marker-contracts.md`

Discovery value: Mostly suspect-location search.

Cheap searches:

- search renderer files for `className=` values missing `nop-` marker classes
- search layout renderers for hardcoded fallback layout classes such as `gap-`, `space-y-`, `space-x-`, `flex`, `grid`, `p-`, `px-`, `py-`
- search CSS/theme files for marker names and compare them with renderer roots

Better script candidate:

- parse renderer return JSX and list files whose root JSX class tokens contain no `nop-` marker

Current repository scanner:

- `scripts/audit/find-missing-renderer-markers.mjs` provides a conservative first pass by flagging `packages/flux-renderers-*/src/*.tsx` renderer component files that appear to contain no `nop-*` marker contract at all

Best use:

- suspect listing for styling-contract review
- seed targeted audits after renderer migrations

### 4) `field-frame-wrap-interaction-semantics.md`

Discovery value: Strong suspect-location search.

Cheap searches:

- search known wrapped renderer directories for `<button`
- search known wrapped renderer directories for `<Button`
- search for `wrap: true` declarations and inspect the corresponding component subtree

Better AST candidate:

- map renderer metadata with `wrap: true` and flag labelable controls in the same component file

Best use:

- candidate listing for manual inspection and focused browser tests

### 5) `test-reliability-and-contract-freshness.md`

Discovery value: Strong suspect-location search.

Cheap searches:

- search test files for module-top `let`
- search test files for module-top mutable arrays, maps, sets, or counters
- search test files for `globalThis.` assignment
- search test files for `window.` or `document.` monkey-patching without matching cleanup hooks nearby

Better AST candidate:

- identify mutable top-level declarations in `*.test.*` and `*.spec.*`

Practical heuristic note:

- prefer top-level mutable declarations only; function-local `let` inside an individual test body is common and should not be reported by the first-pass scanner

Best use:

- suspect listing with a smaller reviewed allowlist

### 6) `wrapper-bypass-of-shared-renderer-contracts.md`

Discovery value: High-confidence suspect-location search.

Cheap searches:

- search for direct `FieldFrame` imports
- search for direct `FieldFrame` JSX usage
- search for local wrapper helpers that recreate `className`, `label`, `description`, or `error` framing behavior

Practical heuristic note:

- exclude the shared owner package that legitimately defines and exports `FieldFrame`; the discovery pass should focus on bypasses outside the canonical owner path

Best use:

- direct review queue for renderer-contract bypasses

### 7) `vocabulary-and-cross-shell-contract-drift.md`

Discovery value: Suspect-location search.

Cheap searches:

- search for mixed canonical and deprecated vocabulary in the same package or feature directory
- search for hardcoded visible strings in peer shell renderers
- search locale keys for inconsistent prefixes or singular/plural naming drift

Better script candidate:

- maintain a small dictionary of canonical term pairs and report files containing deprecated spellings

Best use:

- migration assistance and closure-audit support

### 8) `shadow-types-and-duplicate-contract-surfaces.md`

Discovery value: Suspect-location search.

Cheap searches:

- search for local type names that duplicate shared exported names
- search for repeated contract strings or constants across packages
- search for `type` or `interface` declarations containing `Runtime`, `Owner`, `Bridge`, `Snapshot`, or `Dataset` near a canonical export with the same domain name

Better script candidate:

- compare local declarations against a curated map of canonical shared exports

Best use:

- review seed for consolidation work

### 9) `docs-logs-code-landed-claim-adjudication.md`

Discovery value: Coverage-seed search.

Cheap searches:

- search completed plans for `partial`, `in progress`, `follow-up`, or `blocked`
- search active references docs for speculative target-state wording such as `should`, `will`, or `planned` when the file claims current baseline status

Best use:

- closure-audit starting list, not direct CI failure

### 10) `snapshot-key-and-change-token-publication.md`

Discovery value: Coverage-seed search.

Cheap searches:

- search mutation helper families for `setValue`, `replace`, `patch`, `setLastChange`, `setState`, `publish`, `notify`, `snapshotKey`, `changeToken`
- search for mutations near subscription helpers that do not mention the corresponding publication helper

Better script candidate:

- curated family-level scanner that prints all mutation helpers in a runtime module for manual review

Best use:

- generate audit inventory before touching store mutation code

### 11) `cleanup-and-disposal-boundaries.md`

Discovery value: Coverage-seed search.

Cheap searches:

- search for `setTimeout`, `queueMicrotask`, `Promise.resolve().then`, `requestAnimationFrame`, `debounce`, `throttle`
- intersect with files that also contain `dispose`, `cleanup`, `unmount`, `AbortController`, or `abort`

Best use:

- shortlist async lifecycle hotspots for review

### 12) `owner-bridge-async-state-coherence.md`

Discovery value: Coverage-seed search.

Cheap searches:

- search for module-scope mutable request counters, abort controllers, dirty flags, or owner snapshots
- search bridge and host-data files for the same semantic fields such as `dirty`, `status`, `selection`, `active*`, `preview*`
- search for primary document replacement helpers without nearby derived-state refresh calls

Best use:

- owner-bridge audit starting set, not direct enforcement

### 13) `reactive-subscription-and-derived-snapshot-stability.md`

Discovery value: Suspect-location and coverage-seed mixed.

Cheap searches:

- search for selectors like `(s) => s`
- search for `getSnapshot()` methods returning object literals directly
- search for `replaceScope`, `replace`, or bridge publication helpers inside render-sensitive paths

Best use:

- candidate list for focused subscription and identity-stability tests

### 14) `surface-shell-consistency.md`

Discovery value: Suspect-location search.

Cheap searches:

- search for `<DialogContent>` or `<DrawerContent>` in standard shell files
- search those files for direct body padding classes where a shared body slot should own them

Best use:

- shell consistency review queue

### 15) `false-positive-friendly-ui-diagnostics.md`

Discovery value: Coverage-seed search.

Cheap searches:

- search bugfix tests that assert only one value or one row
- search regression suites for boolean/default-sensitive components with no contrasting-case assertions

Best use:

- test improvement queue rather than violation reporting

## Good First Scanners

If the repository wants practical value quickly, start here:

1. `reactive-read-vs-imperative-read` suspect scanner
2. `async-error-diagnosability-and-swallowed-failures` suspect scanner
3. `test-reliability-and-contract-freshness` suspect scanner
4. `wrapper-bypass-of-shared-renderer-contracts` suspect scanner
5. `single-owner-styling-defaults-and-marker-contracts` marker/root scanner

These have the best mix of recurrence, mechanical detectability, and review value.

## First-Pass False-Positive Rules

The initial scanners should stay conservative about what they report:

- exclude test files from render-time reactive-read checks unless the goal is test-contract review rather than production misuse review
- exclude known one-shot helper paths, effect-only synchronization code, registration callbacks, and runtime fetcher code from render-time reactive-read reporting
- treat known validation/revalidation fire-and-forget paths as lower-value noise until a narrower async-failure rule is introduced
- exclude documented event-handler fire-and-forget wrappers, runtime self-scheduling loops, and owner methods whose surrounding implementation already contains local try/catch/finally failure strategy
- report only top-level mutable test state, not every local `let` inside a test body
- exclude canonical owner packages from wrapper-bypass scans
- exclude documented wrapper exceptions whose architecture docs already define the non-default contract path

## Suggested Repository Layout

If this work expands, keep it lightweight:

```text
scripts/
  audit/
    shared.mjs
    rules.mjs
    find-reactive-render-reads.mjs
    find-async-without-failure-path.mjs
    find-test-global-leaks.mjs
    find-fieldframe-bypasses.mjs
    find-missing-renderer-markers.mjs
    discover-audit-suspects.mjs
```

Each script should:

- print relative file paths with line numbers
- separate high-confidence matches from lower-confidence suspects
- default to read-only reporting
- fail CI only when the signal is already known to be strong enough

## Practical Next Step

Treat source discovery as a separate layer from final enforcement:

1. add suspect-location scanners first
2. review the false-positive rate on live code
3. promote the best subsets into lint or CI-failing checks later

That path is cheaper and safer than trying to jump directly to perfect automatic adjudication.
