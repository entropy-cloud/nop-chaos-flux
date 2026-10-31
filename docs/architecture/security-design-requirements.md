# Security Design Requirements

## Purpose

Define mandatory security boundaries for Flux runtime and renderer-related packages.

This is a normative design requirements document.

## Source Basis

- `docs/articles/flux-design-introduction.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/api-data-source.md`

## Security Boundary Principles

1. Layered responsibility is mandatory.

- Platform layer handles i18n, permission pruning, module composition.
- Renderer/runtime layer handles schema compilation, scope, action dispatch, rendering coordination.

2. Permission is not a renderer runtime responsibility.

- Runtime must not evaluate permission expressions.
- Runtime must not decide access control by local condition checks.
- Input schema is expected to be pre-pruned by upstream platform policy.

3. Dynamic code execution is forbidden in first-party source.

- Do not use `new Function`.
- Do not use `eval`.
- Do not rely on `with(scope)` style execution.

4. Expression execution must use approved compiler/evaluator paths.

- Only use formula compiler/evaluator abstractions already defined by architecture.
- Keep execution context explicit, narrow, and auditable.

5. Action namespace boundaries must remain explicit.

- Namespaced actions are resolved through action scope registration.
- Do not bypass scope resolution with global mutable registries.

6. Data flow must be explicit and minimally scoped.

- Prefer explicit includeScope/params/data shaping.
- Avoid implicit broad scope leakage to outbound requests.

## Mandatory Requirements

## R1. No runtime permission semantics

- Do not add new runtime fields that represent permission policy decisions.
- If legacy permission fields exist, treat migration/removal as prioritized architecture debt.

## R2. No dynamic code execution primitives

- Any introduction of `new Function` or `eval` in `packages/**/src` or `apps/**/src` is a design violation.

## R3. Fail-closed behavior for policy-like checks

- Where checks are unavoidable in runtime constraints, errors must not silently grant capability.
- Emit monitor diagnostics on validation/evaluation failure paths.

## R4. Observable failure paths

- Do not swallow security-relevant initialization failures silently.
- At least monitor-level telemetry is required in development and diagnostics contexts.

## R5. Contract clarity

- Security-sensitive assumptions must be documented at architecture boundary points.
- Public config/schema contracts must not imply unsupported security responsibilities.

## R6. Dangerous-key guard for external data

- Any code that copies or merges keys from externally supplied data (server/model JSON, streamed deltas, schema-authored paths) into objects must skip `__proto__`, `constructor`, and `prototype`. `JSON.parse` produces `__proto__` as an own key, so a plain `Object.keys` loop writing `target[key]` reaches `Object.prototype`.
- Shared path utilities (`flux-core` `getIn`/`setIn`, `flux-runtime` scope sanitization) already enforce this; local helpers must apply the same guard rather than reimplementing an unguarded walk. Live sites: the AI streaming delta merge (`flux-renderers-ai/src/engine/utils.ts`) and the condition-builder right-value paths (`flux-renderers-form-advanced/src/condition-builder/utils.ts`).

## R7. Schema- and user-supplied regular expressions

- Every sink that compiles a schema- or user-supplied pattern (validation `pattern`, barcode `pattern`, spreadsheet regex search) must consult `isBacktrackingSafePattern` from `@nop-chaos/flux-core` before `new RegExp(...)`, including fallback paths that bypass compile-time precompilation.
- The gate rejects super-linear backtracking: quantified ambiguous groups (alternation or variable-width quantifiers inside a group under an unbounded or wide quantifier, at any depth) and polynomial forms (directly adjacent unbounded atoms, three or more unbounded `.` wildcards). Linear patterns such as quantified character classes separated by literals stay accepted — a blanket ban on quantified classes was rejected because it turns ordinary patterns (for example the email example in `flux-guide/06-form-validation.md`) into permanent configuration errors.
- A rejected pattern surfaces through the sink's existing configuration-error channel (validation configuration error, `flux.barcode.invalidPattern`, empty search result); it is never executed.

## R8. Layered HTML sanitization

- HTML rendering defaults to sanitize-on: `html` uses DOMPurify, and markdown `allowHtml` defaults to off.
- When raw HTML is rendered through `rehype-raw` (content markdown with `allowHtml`, AI bubble markdown), the DOMPurify string pass is followed by `rehypeStripUnsafeHtml` on the re-parsed tree, because the string sanitizer and `rehype-raw` use different parsers. The tree pass removes executable elements, `on*` properties, `srcdoc`, and URL properties that fail `isSafeNavigationUrl`.

## R9. Print iframes

- The hidden print frame (`flux-print-core` `mountPrintFrame`) is sandboxed `allow-same-origin allow-modals`: same-origin lets the host read the document and call `contentWindow.print()`, `allow-modals` keeps `print()` from being silently ignored, and scripts never run. The preview frame (`flux-print-renderers` `PrintPreview`) is sandboxed `allow-same-origin` only.
- PDF export renders pages into the top document for `html2canvas`; its safety rests on `render-html.ts` escaping every data-bound sink, and new sinks must keep that invariant.

## Prohibited Patterns

- Runtime permission expression evaluation in renderer/core.
- Inline JS execution for user-provided expressions.
- Silent catch that hides policy wiring failure.
- `new RegExp(...)` on a schema- or user-supplied pattern without `isBacktrackingSafePattern`.
- Key-copy loops over external data without the dangerous-key guard.
- Security-by-UI-hiding (render-and-hide) for sensitive nodes.

## Design Review Checklist

Before merge, answer all:

- Does this change introduce or preserve runtime permission decisions?
- Does this change introduce `new Function`, `eval`, or equivalent dynamic execution?
- Are expression paths using approved compiler/evaluator interfaces?
- Are failures observable through monitor/diagnostic hooks?
- Does docs/index and architecture docs remain consistent with the boundary?

## Documentation Sync Requirements

When this document changes or related constraints change, review:

- `docs/index.md`
- `docs/references/maintenance-checklist.md`
- relevant architecture docs for affected modules
