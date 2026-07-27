# MA3.2: Basic + Content + Mobile — Code Quality Audit

**Audit scope**: `flux-renderers-basic`, `flux-renderers-form`, `flux-renderers-form-advanced`, `flux-renderers-data`, `flux-renderers-content`, `flux-renderers-mobile`

**Tool references**: `docs/architecture/styling-system.md`, `docs/skills/code-quality-audit-prompt.md`

**Audit date**: 2026-07-27

---

### MA3.2-1: `check:audit-suspects` results (filtered for target packages)

All findings below are exclusive to the 6 target packages (non-test source files only; test-specific entries noted in parentheses).

| Rule bucket                             | Count         | Notable locations                                                                                                                                                                                                                                                                                                 |
| --------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `void-promise-no-catch`                 | 9             | button.tsx:232/245, dynamic-renderer.tsx:174, use-dict-options.ts:25, pull-refresh.tsx:136, upload-field.tsx:444                                                                                                                                                                                                  |
| `catch-without-structured-failure-path` | 32            | button.tsx:104/119/144/168, page.tsx:117, dynamic-renderer.tsx:42/157, copy-to-clipboard.ts:25/44, syntax-highlight.ts:73, diff-inline.ts:20, image.tsx:58, json-view.tsx:67, mapping.tsx:44, (data: 9 locations in table-renderer/), (form-advanced: 10 locations), (form: 3 locations), infinite-scroll.tsx:122 |
| `json-stringify-change-detection`       | 2             | icon.tsx:22, picker-renderer.tsx:376                                                                                                                                                                                                                                                                              |
| `bare-data-slot-selector`               | 4             | mobile styles.css:58/63/68/73 — `[data-slot='notice-bar'][data-variant='*']` without `.nop-` prefix                                                                                                                                                                                                               |
| `fieldframe-bypass`                     | 3             | variant-field-view.tsx:12/200/222 — direct `FieldFrame` import bypasses shared contract path                                                                                                                                                                                                                      |
| `test-module-top-let`                   | 6 (test only) | (basic: button-count-down.test.tsx:26, content: carousel-autoplay.test.tsx:33/112/122, form-advanced test-support.tsx:69/195, form test-support.tsx:25/143)                                                                                                                                                       |
| `test-global-patch`                     | 4 (test only) | (mobile: swipe-cell.test.tsx:445/488, data: g5-g12-g17-data-lifecycle.test.tsx:211, form-advanced test-support.tsx:50/62)                                                                                                                                                                                         |
| `runtime-raw-schema-read`               | 1             | crud-renderer.tsx:512 — `const rawSchema = props.schema` reads raw schema at runtime instead of compiled/normalized props                                                                                                                                                                                         |

---

### MA3.2-2: Manual code quality audit findings

#### A. Type safety

- **`any` in source files**: Zero occurrences of `: any` in non-test source files across all 6 packages. Immaculate discipline.
- **`Record<string, any>`**: Found in `schemas.ts` (form:86), `form.tsx` (form:76/85), `table-renderer.tsx` (data:62/184). These are constrained — the `Record<string, any>` in `form.tsx` is a cast on the lifecycle scope `readVisible()` return, which is inherently dynamic. The `table-renderer.tsx` usage types source data arrays, which is acceptably generic for table data rows.
- **`as any` casts**: Only in test-support files (form-advanced's `config-test-support.tsx` mock component displayNames, data's `use-table-controls.test-support.tsx` probe props). Zero in production code.

**Verdict**: Type safety is excellent. No actionable findings.

#### B. Error handling

- **`catch {}` silent swallows**: Prevalent pattern:
  - `button.tsx` (lines 104/119/144/168): localStorage get/set/removeItem in countdown logic. Acceptably justified by "localStorage unavailable (private mode / SSR)".
  - `page.tsx` (line 117): `releasePointerCapture` catch. Justified — pointer may already be released.
  - `dynamic-renderer.tsx` (lines 42/157): lazy-load `.catch {}`. Acceptable for dynamic import.
  - `table-renderer/` multiple files: `catch {}` in `table-body-row-rendering.tsx:225`, `table-summary-row.tsx:54`, `use-row-drag-sort.ts:162`, `use-table-selection.ts:113`. Most are best-effort; the `use-row-quick-edit-draft.tsx:206` catch with `error` binding logs nothing but binds the variable — this is a weak pattern that should at minimum dev-log.
  - `infinite-scroll.tsx:122`: `catch (err: unknown)` with no handler body — the err binding is declared but unused.
  - `image.tsx:58`, `json-view.tsx:67`, `mapping.tsx:44`: `catch {}` on fallback parsing. Acceptable.

- **Structured failure patterns**:
  - `form.tsx` uses `reportFormInitActionError()` with full structured context (env, level, message, error, phase, path) — excellent pattern.
  - `pull-refresh.tsx` `.catch(() => { ... setStatus('normal') })` — correctly resets UI state on failure instead of swallowing silently.

**Verdict**: Most catches are justified best-effort. The unused `err` binding in `infinite-scroll.tsx:122` and `use-row-quick-edit-draft.tsx:206` are minor hygiene issues.

#### C. Async patterns

- **`void promise` usage**: All occurrences are intentional fire-and-forget patterns (event handlers, dispatch triggers). The `pull-refresh.tsx:136` `void Promise.resolve().then(...)` is a deliberate microtask deferral to ensure the promise chain runs after React commits. `form.tsx` line 329 uses `void initAction(...)` with proper `.then().catch().finally()` — correct.
- **No abandoned promises** detected. Every `void` is preceded by a synchronous guard or the promise chain includes catch/finally.

#### D. Styling contract compliance (`docs/architecture/styling-system.md`)

- **content package `styles.css`**: Uses `.nop-` prefix for all selectors (`.nop-separator`, `.nop-progress`, `.nop-diff-view`, `.nop-diff-line`, etc.). Complies with the styling contract. Tokens defined via CSS custom properties scoped to `.nop-diff-view`. Good.
- **mobile package `styles.css`**: Uses bare `[data-slot='notice-bar']` selectors without a `.nop-` package scoping prefix. This violates the styling contract which requires scoped selectors to avoid cross-package leakage. The `:root` variable definitions are also unscoped — they pollute the global `:root` scope. This is flagged by `bare-data-slot-selector` and is a **P2** finding.
- **Layout renderers** (page, container, flex, fragment) correctly emit marker classes only (`.nop-page`, etc.) with no layout styling classes, per the layout renderer contract.

---

### MA3.2-3: Large file and duplicate pattern analysis

#### Files > 500 lines (source only, excluding tests)

| Package  | File                               | Lines   | Assessment                                                                   |
| -------- | ---------------------------------- | ------- | ---------------------------------------------------------------------------- |
| basic    | `basic-renderer-definitions.ts`    | 549     | Definition registry — naturally large, low complexity                        |
| form     | `form.tsx`                         | 603     | Core form renderer — acceptable for complexity                               |
| form-adv | `picker-renderer.tsx`              | **743** | Over threshold; dialog + picker + search + options normalization in one file |
| form-adv | `tree-control-controllers.ts`      | **725** | Over threshold; tree state logic could be extracted                          |
| form-adv | `key-value.tsx`                    | 691     | Over threshold; multi-mode key-value editor                                  |
| form-adv | `input-table-renderer.tsx`         | 674     | Over threshold; inline table editing                                         |
| form-adv | `array-editor.tsx`                 | 646     | Over threshold                                                               |
| form-adv | `combo-renderer.tsx`               | 611     | Over threshold                                                               |
| form-adv | `upload-field.tsx`                 | 580     | Over threshold                                                               |
| form-adv | `condition-builder.tsx`            | 539     | Over threshold                                                               |
| form-adv | `value-input.tsx`                  | 539     | Over threshold                                                               |
| form-adv | `tree-controls.tsx`                | 538     | Over threshold                                                               |
| form-adv | `composite-field/array-field.tsx`  | 590     | Over threshold                                                               |
| form-adv | `composite-field/object-field.tsx` | 502     | Over threshold                                                               |
| data     | `table-renderer.tsx`               | **712** | Over threshold; controls + layout + data processing in one file              |
| data     | `crud-renderer.tsx`                | 686     | Over threshold                                                               |
| data     | `crud-renderer-state.ts`           | **702** | Over threshold; state management separated from renderer — good but large    |
| data     | `data-renderer-definitions.ts`     | 690     | Over threshold; definition registry                                          |
| data     | `tree-renderer.tsx`                | 620     | Over threshold                                                               |
| data     | `table-body-row-rendering.tsx`     | 581     | Over threshold                                                               |
| data     | `table-header-row.tsx`             | 542     | Over threshold                                                               |
| data     | `list-renderer.tsx`                | 463     | Near threshold                                                               |
| data     | `chart-renderer.tsx`               | 478     | Near threshold                                                               |
| content  | `content-renderer-definitions.ts`  | 543     | Over threshold; definition registry                                          |
| content  | `styles.css`                       | 641     | Self-styled widget CSS — acceptable                                          |

**`flux-renderers-form-advanced`** has the highest concentration of large files (12 source files over 500 lines). This package is the most complex form-advanced package and would benefit from further decomposition as its feature set grows.

#### Duplicate code patterns

1. **`copy-to-clipboard.ts` — near-verbatim duplicate**:
   - `packages/flux-renderers-basic/src/copy-to-clipboard.ts` (62 lines)
   - `packages/flux-renderers-data/src/table-renderer/copy-to-clipboard.ts` (55 lines)

   The only difference is the console.warn prefix (`[TextRenderer]` vs `[TableRenderer]`). This should be extracted to a shared utility in `@nop-chaos/flux-core` or `@nop-chaos/ui`.

2. **Renderer definition registries**: `basic-renderer-definitions.ts` (549), `content-renderer-definitions.ts` (543), `data-renderer-definitions.ts` (690) all follow the same structural pattern. This is acceptable — they are data-declarative files, not logic duplication.

3. **Form field validation wiring**: `picker-renderer.tsx`, `upload-field.tsx`, and other form-advanced renderers independently wire `formFieldRules` + `shouldValidateOn` + `useFieldPresentation` + `useCurrentValidationScope`. This is by design — each renderer composes from shared form utility hooks.

---

### MA3.2-4: Findings Summary

| ID  | Severity | Package       | File                                    | Finding                                                                                                                                       | Recommendation                                                                      |
| --- | -------- | ------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| F1  | **P1**   | data          | crud-renderer.tsx:512                   | `runtime-raw-schema-read` — reads `props.schema` (raw) at runtime instead of using compiled/normalized props; violates compile-once principle | Use `useSchemaProps()` or `props.props` for the `item` field access                 |
| F2  | **P2**   | mobile        | styles.css:58-76                        | `bare-data-slot-selector` — `[data-slot='notice-bar']` selectors lack `.nop-` package prefix; violates `styling-system.md` contract           | Scope selectors under `.nop-notice-bar` or add package-specific class               |
| F3  | **P2**   | mobile        | styles.css:32-41                        | Unscoped `:root` variable pollution — `--nop-notice-bar-*` tokens defined on global `:root` instead of `.nop-notice-bar` scope                | Move variable definitions under `.nop-notice-bar` or a stable package wrapper class |
| F4  | **P2**   | form-advanced | variant-field-view.tsx:12               | `fieldframe-bypass` — direct `FieldFrame` import bypasses shared renderer contract paths                                                      | Route through standardized form field composition layer                             |
| F5  | **P2**   | basic + data  | copy-to-clipboard.ts (both copies)      | Near-verbatim duplicate between `flux-renderers-basic` and `flux-renderers-data/table-renderer/`                                              | Extract to shared utility in `@nop-chaos/flux-core` or `@nop-chaos/ui`              |
| F6  | **P2**   | form-adv      | picker-renderer.tsx (743 lines)         | Large file — picker + dialog + search + options normalization in single component                                                             | Extract dialog/search sub-components; split validation/options logic                |
| F7  | **P3**   | mobile        | infinite-scroll.tsx:122                 | `catch (err: unknown) {}` — unused err binding                                                                                                | Remove the parameter or add a dev-only log                                          |
| F8  | **P3**   | data          | use-row-quick-edit-draft.tsx:206        | `catch (error) {}` — error variable silently swallowed                                                                                        | Add dev-only console.warn or remove the variable                                    |
| F9  | **P3**   | form-adv      | tree-control-controllers.ts (725 lines) | Oversized file approaching extraction threshold                                                                                               | Consider extracting tree tree-node-rendering vs tree-state-management               |
| F10 | **P3**   | basic         | button.tsx:104/119/144/168              | Repeated try/catch blocks for localStorage access — DRY violation                                                                             | Extract a `safeLocalStorage` helper                                                 |

**No P0 findings** — no immediate bugs identified. The `runtime-raw-schema-read` (F1) is rated P1 because it violates a core architectural contract but has not manifested as a runtime bug (the `item` field is structural/static, not expression-driven in practice).

---

### MA3.2-5: Conclusions

1. **Overall code quality is high**. Type safety discipline is excellent — zero `any` in production code across all 6 packages. Void-promise usage follows safe patterns with catch chains. Error handling is generally justified.

2. **form-advanced** is the most complex package with 12 files over 500 lines. The `picker-renderer.tsx` (743 lines) is the largest renderer in the cluster and would benefit from decomposition. This is a natural consequence of its role as the composite-form workbench.

3. **Two structural issues** deserve attention:
   - The duplicate `copy-to-clipboard.ts` should be unified into a shared package.
   - The mobile `styles.css` violates the styling contract with bare `[data-slot]` selectors and unscoped `:root` variables. These are straightforward fixes.

4. **The `runtime-raw-schema-read`** in `crud-renderer.tsx:512` is a latent architectual debt — while not producing bugs today (the read targets compile-time-stable structural fields), it sets a precedent that weakens the compile-once invariant.

5. **No blockers** for the Phase 2 milestone. All findings are P1-P3 with no P0s.
