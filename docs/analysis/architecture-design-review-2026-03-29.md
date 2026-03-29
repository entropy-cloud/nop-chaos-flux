# Architecture Design Review (Rationality and Optimization)

Date: 2026-03-29

## Goal

Review architecture documents themselves for internal consistency, practicality, and optimization opportunities.

## A. Confirmed Document-Level Issues

### 1) Action-scope doc mixes "current contract" and "future design"

Severity: High

Evidence:

- `docs/architecture/action-scope-and-imports.md:5` describes future extension model.
- `docs/architecture/action-scope-and-imports.md:827` still contains phased future rollout language.
- `docs/architecture/action-scope-and-imports.md:792` also describes current implementation semantics.
- `docs/architecture/renderer-runtime.md:293` describes action-scope/component-registry as active runtime behavior.

Impact:

- Readers cannot reliably tell what is normative now versus roadmap guidance.

Optimization direction:

- Split each major section into explicit tags: Current Contract, Recommended Pattern, Future Direction.

---

### 2) Action namespace delimiter convention is not singular

Severity: High

Evidence:

- `docs/architecture/action-scope-and-imports.md:269` recommends `:`.
- Same document includes many `demo.open` / `chart.render` examples.

Impact:

- Authoring and validation tooling have ambiguous normalization targets.

Optimization direction:

- Define one canonical syntax (`:`) and clearly mark dot syntax as compatibility input.

---

### 3) Theme root naming conflict across docs

Severity: High

Evidence:

- `docs/architecture/theme-compatibility.md:51` defines `.na-theme-root` as canonical.
- `docs/architecture/bem-removal.md:616` still references `nop-theme-root` retention.

Impact:

- Host integration guide is not single-source.

Optimization direction:

- Keep one canonical name in architecture docs and move compatibility aliases to a dedicated migration note block.

---

### 4) Text marker rule conflict (`none` vs `nop-text`)

Severity: Medium

Evidence:

- `docs/architecture/styling-system.md:365` lists Text marker as none.
- `docs/architecture/bem-removal.md:262` lists `nop-text` in semantic marker catalog.

Impact:

- Renderer implementers can produce diverging outputs while both claiming doc compliance.

Optimization direction:

- Add a small canonical marker matrix table maintained in one place and referenced by both docs.

---

### 5) Terminology drift (`stylePresets` versus `classAliases`)

Severity: Medium

Evidence:

- `docs/architecture/styling-system.md:188` states `classAliases` as preferred naming.
- `docs/architecture/theme-compatibility.md:265` still mentions style presets.

Impact:

- Confuses schema authoring and editor-side language consistency.

Optimization direction:

- Replace remaining `style preset` wording with `classAliases` or explicitly mark as historical term.

---

### 6) Form validation lacks explicit arbitration rules for compile-time vs runtime registration

Severity: Medium

Evidence:

- `docs/architecture/form-validation.md:29` says compile-time-first model.
- `docs/architecture/form-validation.md:325` introduces runtime registration supplements.
- No explicit same-path conflict arbitration policy is documented.

Impact:

- Duplicate error ownership and merge priority can become implementation-dependent.

Optimization direction:

- Add "Rule Arbitration" section: precedence, dedupe key, ownerPath policy, and merge semantics.

---

### 7) Runtime module-boundary doc lacks explicit ownership for action-scope/component-registry modules

Severity: Medium

Evidence:

- `docs/architecture/flux-runtime-module-boundaries.md:91` to `docs/architecture/flux-runtime-module-boundaries.md:104` covers action/request/scope modules, but not explicit ownership section for action-scope/component-registry.
- `docs/architecture/renderer-runtime.md:293` treats these as active boundaries.

Impact:

- New changes may be misplaced across runtime/react layers.

Optimization direction:

- Add ownership table entries for action-scope and component-handle-registry.

## B. Architecture Strengths (keep)

1. Clear split of runtime concerns: compiler/runtime/react layering is coherent and mostly reflected in package layout.
2. Validation model is expressive: supports triggers, visibility behavior, relational rules, and async validation.
3. Action model direction is practical: built-in + component-targeted + namespaced provides good extensibility.
4. Theme compatibility goal is strong: CSS-contract approach keeps host integration flexible.

## C. Priority Roadmap

### P0 (doc-first, immediate)

1. Normalize action namespace syntax and examples.
2. Normalize canonical theme root naming and alias policy.
3. Split action-scope doc into current contract versus future plan sections.

### P1 (doc-first, then implementation alignment)

1. Add validation arbitration section.
2. Add module-boundary ownership entries for action-scope/component registry.
3. Resolve Text marker inconsistency between styling docs.

### P2 (quality and maintainability)

1. Complete terminology cleanup (`classAliases` only).
2. Move one-off migration narrative from architecture docs into analysis/bugs/archive where appropriate.
3. Add a host-theme integration quick-start checklist with minimal CSS mapping template.

## D. Recommended Execution Order

1. Fix doc contradictions first (P0/P1).
2. Then schedule conformance implementation fixes based on the three conformance audit reports.
3. Add regression tests for each resolved contract hotspot.
