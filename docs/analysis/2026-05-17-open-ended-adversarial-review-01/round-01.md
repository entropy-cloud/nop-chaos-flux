# Open-Ended Adversarial Review — 2026-05-17 — Round 1

This round's entry angle: **contract archaeology** — tracing declared type/property promises to their implementation to find those that silently diverge. The three findings below share a common pattern: something is formally declared (type field, CSS file, escape handler) but behaves differently from what the declaration implies, either by omission or by silent drift.

---

## Finding 1: `OperationControlConfig.timeout` — Declared Contract, Unwired Implementation

**Where**:

- `packages/flux-core/src/types/schema.ts:124` (declaration: `timeout?: number`)
- `packages/flux-runtime/src/async-data/request-runtime.ts:68` (only `control?.retry` is destructured; timeout is never referenced)
- `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts` (the entire request execution path — no AbortSignal.timeout() or setTimeout-based timeout)

**What**: The `OperationControlConfig` interface declares `timeout?: number` as a first-class control parameter. The documentation at `docs/architecture/api-data-source.md` lines 226-238 explicitly states that "timeout, retry, debounce, throttle, cacheTTL, cacheKey, dedup belong to Operation Control, not to transport description." But the implementation:

1. `executeRequestWithControl` (request-runtime.ts:61-86) reads only `control?.retry`. The `timeout` field is silently ignored.
2. `createApiRequestExecutor` (request-runtime.ts:353-423) reads only `options.control?.dedup` (via `resolveRequestDedup` at line 109-111).
3. The entire `api-data-source-controller-runtime.ts` execution path has zero references to any timeout mechanism. No `AbortSignal.timeout()`, no `setTimeout` wrapping.

A schema author writing `{ api: { url: "...", control: { timeout: 5000 } } }` correctly believes they are setting a 5-second request timeout. The value is silently ignored. Requests can hang indefinitely.

**Why it matters**: This is a safety/operational issue, not just dead code. For a runtime that makes HTTP requests to external APIs (including potentially user-configured URLs), the absence of a configurable timeout means:

- A misconfigured or slow backend can freeze the entire UI layer (pending request blocks further actions depending on dedup strategy).
- Developers migrating from frameworks where timeout is standard (fetch API, axios) will naturally trust this field.
- The `OperationControlConfig` type itself was carefully designed (has `retry` with `strategy`, `maxDelay`; `dedup` with three strategies), making the missing `timeout` implementation feel like an oversight rather than an intentional omission.
- In 10x scale: 100 slow requests with no timeout = 100 pending AbortControllers + memory pressure + blocked UI.

**Root cause**: Implementation gap — the type system and design doc declare timeout as a supported feature, but the code path never wired it. The `OperationControlConfig` interface was presumably designed upfront with all intended fields, but `timeout` was never connected during the request-runtime implementation.

**Confidence**: Certain. Verified: grep for `timeout` in `packages/flux-runtime/src/async-data/` returns zero matches outside type definitions. The `executeRequestWithControl` function signature accepts `control` but only reads `.retry`.

---

## Finding 2: `flux-bundle/style.css` Is a Non-Identical Copy with Semantic Differences

**Where**:

- `packages/flux-bundle/src/style.css` (252 lines) — a duplicate of two canonical CSS files with different selectors
- `packages/flux-react/src/default-spacing.css` (191 lines) — canonical layout spacing
- `packages/flux-renderers-form/src/form-renderers.css` (71 lines) — canonical form control styling

**What**: The flux-bundle package ships a `style.css` that is clearly derived from the two canonical CSS files but with systematic differences:

**Structural difference A — selector scoping:**

The canonical `default-spacing.css` has selectors like:

```css
.nop-field [data-slot='field-label'] { ... }
.nop-field [data-slot='field-error'] { ... }
.nop-field [data-slot='field-hint'],
.nop-field [data-slot='field-description'] { ... }
.nop-field [data-slot='field-remark'],
.nop-field [data-slot='field-label-remark'] { ... }
```

The bundle replaces these with:

```css
.nop-flux-root [data-slot='field-label'] { ... }
.nop-flux-root [data-slot='field-error'] { ... }
.nop-flux-root [data-slot='field-hint'],
.nop-flux-root [data-slot='field-description'] { ... }
.nop-flux-root [data-slot='field-remark'],
.nop-flux-root [data-slot='field-label-remark'] { ... }
```

This is NOT a simple scoping prefix change. In the canonical CSS, these selectors only match `[data-slot='field-label']` elements that are descendants of `.nop-field`. In the bundle, they match ANY `[data-slot='field-label']` within `.nop-flux-root`, even outside a field context. A custom renderer using `data-slot="field-label"` outside a `.nop-field` wrapper would get these styles in the bundle build but not in the individual package build. The behavior diverges depending on which CSS entry point the consumer imports.

**Structural difference B — missing rules:**

The canonical `default-spacing.css` includes these rules that are entirely absent from the bundle:

```css
.nop-schema-root-fallback[data-mode='loading'] {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}
.nop-schema-root-fallback [data-slot='schema-root-fallback-message'] {
  min-width: 0;
  overflow-wrap: anywhere;
}
```

These missing rules mean loading-state and message styling for `schema-root-fallback` silently differ between the two CSS paths.

**Structural difference C — ancestor selector reduction:**

For `[data-slot='tabs-content']`, the canonical CSS uses:

```css
.nop-flux-root [data-slot='tabs-content'],
.nop-page [data-slot='tabs-content'],
.nop-form [data-slot='tabs-content'],
.nop-container [data-slot='tabs-content'] { ... }
```

The bundle uses only:

```css
.nop-flux-root [data-slot='tabs-content'] { ... }
```

While functionally equivalent within `.nop-flux-root`, this reduces specificity and changes behavior when tabs are used outside the flux root.

**Structural difference D — form-renderers scoping:**

The canonical `form-renderers.css` uses `.nop-form [data-slot='...']` selectors. The bundle replaces with `.nop-flux-root [data-slot='...']`. A radio-group-wrapper used outside a `.nop-form` (e.g., standalone) gets `display: grid` from the bundle but nothing from the individual package CSS.

**Why it matters**: This is a maintenance time bomb AND a behavioral inconsistency. Every future change to `default-spacing.css` or `form-renderers.css` requires a manual sync to `flux-bundle/style.css`. The synced copy is not byte-identical — it introduces subtle semantic differences that are invisible to CI (no test loads both CSS paths and compares rendered output). The bundle CSS path is the primary entry point for `@nop-chaos/flux` consumers, making it the de facto production path. Yet the canonical CSS files are what developers edit and test against.

The selector differences (A, C, D) also mean the bundle COULD produce different visual output from the individual package CSS even if both are "in sync" — because the selectors are structurally non-equivalent.

**Root cause**: Architectural gap. The flux-bundle package exists as a facade, but its CSS was manually duplicated instead of composed from the canonical source files (e.g., via `@import` or postcss processing). CSS cannot be composed at the JS import level like TypeScript modules, so the duplication was an expedient solution that created a permanent drift risk.

**Confidence**: Certain. Verified by side-by-side comparison of all three files. Every rule was traced.

---

## Finding 3: Single-Quoted String Escape Handling Produces Wrong Results

**Where**: `packages/flux-formula/src/parser.ts:24-64` (`parseStringLiteral` function)

**What**: The expression parser handles double-quoted strings by delegating to `JSON.parse(raw)` (line 26), which correctly interprets all escape sequences (`\n`, `\t`, `\uXXXX`, `\\`, etc.). For single-quoted strings, it uses a custom escape handler (lines 33-63) that only handles `\'` and `\\` correctly via `JSON.parse` at the end. All other escape sequences pass through literally.

The path for a single-quoted string like `'\n'`:

1. raw = `'\n'` (4 characters: `'`, `\`, `n`, `'`)
2. The loop encounters `\` at index 1, checks `next = raw[index + 1]` = `n`
3. `next` is not `'` or `"`, so falls into the else branch: `normalized += '\\${next}'` → `normalized += '\\n'`
4. After loop: `JSON.parse('"\\\\n"')` → literal string `\n` (backslash followed by n)

The correct result should be a newline character (`\n` as an actual line feed). Instead, the expression `'\n'` evaluates to the two-character string `\n`.

Similarly:

- `'\t'` → literal `\t` instead of tab
- `'\u00e9'` → literal `\u00e9` instead of `é`
- `'\x41'` → literal `\x41` instead of `A`
- `'line1\nline2'` → `line1\nline2` (literal) instead of `line1<newline>line2`

Double-quoted strings (`"\n"`) work correctly because they go through `JSON.parse` directly.

**Why it matters**: In expression languages, single-quoted strings are universally expected to support the same escape sequences as double-quoted strings. A schema author writing `${ value = '\n' }` reasonably expects a newline, exactly as they would expect `${ value = "\n" }` to produce one. The implementation has a de facto behavioral difference between quote styles that is invisible to type checking and has no test coverage.

Additionally, the `\uXXXX` gap could produce a `JSON.parse` crash in the `else` branch at lines 47-49. If a single-quoted string contains `\uXXXX` followed by invalid hex characters, the `JSON.parse(normalized)` call at line 63 would throw a `SyntaxError` that propagates uncaught through the parser. For example: `'\uZZZZ'` would produce `"\\uZZZZ"` as the normalized string, and `JSON.parse` would throw because `\uZZZZ` is not a valid Unicode escape.

**Root cause**: The single-quote handling reimplements escape processing instead of normalizing to a form that `JSON.parse` can handle directly (e.g., by converting single quotes to `\u0027` and deferring to `JSON.parse(raw.replace(/'/g, '"'))`).

**Confidence**: Certain. Tested by tracing the code manually. Additionally verified: no test in the flux-formula test suite exercises escape sequences in single-quoted strings (all escape tests use double-quoted strings).

---

## Round Summary

| #   | Area            | Severity | Summary                                                                                                    |
| --- | --------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | API runtime     | High     | `OperationControlConfig.timeout` declared but never wired; requests can hang indefinitely                  |
| 2   | CSS/build       | High     | `flux-bundle/style.css` is a drifting non-identical copy; selector semantics differ from canonical sources |
| 3   | Expression eval | Medium   | Single-quoted strings don't interpret escape sequences; `\uXXXX` can crash JSON.parse                      |

**Connecting theme**: All three findings are **contract declarations that silently diverge from implementation**. The `timeout` field is a type-level promise without code-level delivery. The bundle CSS is presented as "the same styles" but has selector-level behavioral differences. The single-quoted string handler looks correct at a glance but produces wrong results for non-trivial inputs. None of these divergences produce immediate errors — they create silent behavioral gaps that are invisible to CI.

**Blind-spot self-assessment for this round**: I read CSS files, type definitions, and parser code statically. I did not execute the actual fetch path to confirm the timeout gap at runtime, nor did I build and diff the CSS output from both entry points. The flux-formula parser test suite doesn't cover single-quoted escape sequences, but there may also be gaps in how the evaluator handles the output of buggy string parsing.
