# Open-Ended Adversarial Review — 2026-05-18 — Summary

**Execution date**: 2026-05-18
**Result directory**: `docs/analysis/2026-05-18-open-ended-adversarial-review-02/`
**Finding rounds written**: 3
**Total findings**: 21

---

## Findings Summary

| Round | Area            | Finding                                                                                        | Severity |
| ----- | --------------- | ---------------------------------------------------------------------------------------------- | -------- |
| R1    | Compiler        | `cidState` mutation breaks compilation idempotency across calls                                | **High** |
| R1    | Compiler        | O(n²) BFS traversal via `queue.shift()` + `queue.unshift(...)` in validation collection        | **High** |
| R1    | Action-core     | `normalizeActionResult` missing on 2 of 4 runner paths → adapter crash                         | **High** |
| R1    | Action-core     | `invocation!` non-null assertion in built-in-actions switch → latent crash on schema evolution | **High** |
| R1    | Flux-react      | Stale DOM element in container registry via `elementRef` identity in `useEffect` deps          | **High** |
| R1    | Flux-react      | `useSurfaceScopeSnapshot` discards subscription return value (dead code or bug)                | **High** |
| R1    | Form validation | Async validators cannot declare cross-field dependencies                                       | Medium   |
| R1    | Form validation | Stale errors from unregistered runtime fields leak into `validateForm` results                 | Medium   |
| R2    | Flow designer   | `commitTransactionState` by ID commits wrong transaction when index is 0                       | **High** |
| R2    | Flow designer   | `inputTreeDocument` prop change overwrites unsaved user edits (data loss)                      | **High** |
| R2    | Flow designer   | ELK layout owner invalidated on React strict mode → silent layout failure                      | **High** |
| R2    | Event/action    | `onSettled` shape validation missing — compile-time gap for supported code path                | Medium   |
| R2    | Event/action    | Action `when` field not shape-validated at compile time                                        | Medium   |
| R2    | Renderers       | Container/Flex emit hardcoded layout utility classes — styling contract violation              | Medium   |
| R2    | Renderers       | Multiple `<Button>` missing `type="button"` → accidental form submission risk                  | Medium   |
| R2    | Renderers       | Form init failure logged but not shown to user (invisible error)                               | Medium   |
| R3    | Runtime scope   | `createCompositeScopeStore` subscription survives after scope disposal (memory leak)           | **High** |
| R3    | Runtime scope   | `HostProjectionScope` reads return valid data after disposal (safety boundary)                 | **High** |
| R3    | Runtime scope   | `createSurfaceScope` injects visible snapshot into initial data (isolation bypass)             | **High** |
| R3    | Cross-package   | `isAbortError` duplicated in variant-field with divergent behavior                             | Medium   |
| R3    | Cross-package   | Unused production dependency in `flux-renderers-form`                                          | Low      |

**9 High, 10 Medium, 2 Low**

---

## Overall Assessment

The project has strong architectural discipline — clean dependency direction, consistent export patterns, and well-separated concerns. Most components correctly follow the `RendererComponentProps` contract, the `cn()` pattern, and the standard hooks from `@nop-chaos/flux-react`.

The three most important directions from this review are:

### 1. Incomplete lifecycle/cleanup patterns (greatest systemic risk)

Scope disposal, subscription cleanup, and state teardown are the most consistent source of high-severity findings across this review:

- **Compiler `cidState` shared default** (R1-F1) — state mutation without ownership tracking
- **Runtime scope subscription leak** (R3-F1) — `createCompositeScopeStore` subscribes to parent but has no disposal path
- **`HostProjectionScope` read-after-dispose** (R3-F2) — reads are unguarded while writes are blocked
- **Flow designer ELK layout owner** (R2-F3) — created once via `useRef`, invalidated on strict mode remount

The common pattern: setup paths that don't have matched, verifiable teardown paths. **Every `useRef` initializer, every `subscribe`, and every shared-state reference should have a paired cleanup that's verified to execute.** The current code has several asymmetric pairs.

### 2. Schema/extension boundaries with unguarded gaps (compile-time → runtime crash)

Several findings show the same pattern: the compiler validates some aspects of a schema construct but not others, creating gaps where invalid input reaches runtime as a crash:

- **Action shape validation missing `onSettled` and `when`** (R2-F4, R2-F8) — two gaps in the same function for fully supported code paths
- **Action name resolution missing at compile time** — unresolved action names produce "Unsupported action: undefined" at runtime
- **`normalizeActionResult` missing on 2 of 4 adapter runner paths** (R1-F3) — adapters are the extension boundary, but only half the paths normalize

The common pattern: when adding support for a new sub-feature, the runtime/dispatch code is updated but the shape validator isn't. **A type-level or structural mechanism to enforce that every runtime-supported code path has a corresponding validation path would prevent this class of gap.**

### 3. React integration patterns that can silently produce wrong behavior (hardest to debug)

Several findings involve React patterns that compile and run without error but produce wrong results under specific conditions:

- **`elementRef` identity in `useEffect` deps** (R1-F5) — any DOM ref change is invisible to the effect
- **`useSurfaceScopeSnapshot` discards its return** (R1-F6) — the subscription fires but the data is thrown away
- **Flow designer transaction bug** (R2-F1) — commit by ID at index 0 silently commits the wrong transaction
- **Container/Flex layout classes** (R2-F5) — the styling contract says marker-only, but code emits utilities

These are the hardest bugs because there's no crash, no error message, and the behavior appears correct in simple cases. **A lint rule or code review checklist targeting React ref-in-deps patterns and unused hook return values would catch most of these.**

---

## Blind-Spot Self-Assessment

This review covered compiler internals, action-core dispatch, flux-react integration, form validation, flow designer, event/reaction systems, renderer styling, runtime scope lifecycle, and cross-package consistency. It did **not** deeply audit:

1. **The UI package (`@nop-chaos/ui`)**: Did not audit shadcn/ui component wrappers for correctness, accessibility, or CSS variable usage.

2. **Performance profiling**: Did not run benchmarks or measure actual re-render counts, memory usage, or compile times. The O(n²) finding in validation-collection is a structural analysis, not a measurement.

3. **E2E test reliability**: Did not investigate flaky tests, test infrastructure, or CI pipeline issues beyond the previous round's findings.

4. **Internationalization (flux-i18n)**: Did not inspect translation loading, key lookup fallback, or locale switching logic.

5. **The report designer and word editor**: These are significant sub-systems (report-designer, spreadsheet, word-editor) that were mentioned in the docs but not audited.

6. **Security boundary**: Did not test for XSS via schema injection, prototype pollution, or expression sandbox escapes. The `HostProjectionScope` read-after-dispose finding touches on safety boundaries but is not a security audit.

7. **The playground application**: Did not check playground code for issues that might affect the development experience.

8. **Bundle size and tree-shaking analysis**: The renderers-styling audit noted `cn()` usage patterns, but a full webpack/rollup bundle analysis was not done.

**Best continuation point for next round**: The runtime scope lifecycle and the flow designer transaction system are the two areas with the highest density of high-severity findings. A focused audit on scope disposal completeness across all scope types (form, surface, projection, composite) would likely find more issues in the same pattern.

---

## Files Written

- `docs/analysis/2026-05-18-open-ended-adversarial-review-02/round-01.md`
- `docs/analysis/2026-05-18-open-ended-adversarial-review-02/round-02.md`
- `docs/analysis/2026-05-18-open-ended-adversarial-review-02/round-03.md`
- `docs/analysis/2026-05-18-open-ended-adversarial-review-02/summary.md`
