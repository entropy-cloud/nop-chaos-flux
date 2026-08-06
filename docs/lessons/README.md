# Lessons Index

## Purpose

This directory records detailed development lessons that are worth preserving beyond a daily log.

Use it for cases where the durable value is the full engineering path, including:

- an initial wrong judgment or diagnostic path
- a correct practice that should be repeated
- why a choice looked plausible at first
- what concrete evidence changed the decision
- how to recognize the same pattern next time

These notes are more detailed than `docs/logs/` and more practice-oriented than ordinary reference docs.

## Scope Boundary

- `docs/architecture/` describes the current intended system design
- `docs/bugs/` records important live product defects and fixes
- `docs/plans/` records execution ownership and closure
- `docs/lessons/` records reusable development lessons, including both wrong turns and good practices

## File Naming Rule

Use numbered filenames, similar to `docs/bugs/`:

- `01-...`
- `02-...`
- `03-...`

Examples:

- `01-over-abstracted-compiler-fix-before-minimal-branch-point-check.md`
- `02-start-from-live-failing-symptom-before-generalizing-the-model.md`

## Recommended Sections

Each note should include the sections that best fit the case. Common sections are:

1. `Problem Context`
2. `Initial Judgment` or `Practice`
3. `Why It Looked Plausible`
4. `Why It Was Wrong` or `Why It Worked`
5. `Decisive Evidence`
6. `Correct Decision Rule`
7. `Preventive Checklist`
8. `Related Files / Docs`

## Index

- [01 Over-Abstracted Compiler Fix Before Minimal Branch-Point Check](01-over-abstracted-compiler-fix-before-minimal-branch-point-check.md)
- [02 Unit-Green But Real-Browser Broken (bug 73 模式)](02-unit-green-but-real-browser-broken-bug-73-pattern.md)
- [03 Schema Event Dispatch Requires `{ event, evaluationBindings, scope }` Ctx](03-schema-event-dispatch-requires-event-evaluation-bindings-scope-ctx.md)
- [04 Surface Args With Embedded Schema Body Get Eagerly Evaluated (CX-11)](04-surface-args-embedded-schema-body-eager-evaluation-cx-11.md)
- [05 `kind:'reaction'` Fields Must Be Wired: ready() + ComponentHandle](05-reaction-field-wiring-requires-ready-and-component-handle.md)

---

## Component-Audit Lessons (CG)

The following entries were extracted from the component-audit mission (C0–C9 + CX-1..CX-12, 2026-08-02..08-06) closure during the CG (Guard Sedimentation) work item. Each describes a repeatable failure pattern found across families, how it was detected, and what guard prevents it going forward.

- **02** — 单测绿但真实浏览器失败（bug 73 模式）：单元测试证明逻辑正确性的一半；渲染/布局/环境 API/StrictMode 面必须由真实浏览器 programmatic 断言兜底（每卡必检 host 场景）。
- **03** — schema 事件派发必须携带 `{ event, evaluationBindings, scope }` ctx：runtime args 求值只合并 evaluationBindings + scope，单参派发 = 模板键静默空值（CX-10/CX-12 家族）。
- **04** — surface args 内嵌 schema body 急切求值（CX-11）：isSchema 顶层 arg 必须经 `__nopPreserveLiteral` envelope 静态化，否则成员访问模板抛错导致 dialog/drawer 静默打不开。
- **05** — `kind:'reaction'` 字段必须三件套接线（reactionsRef 捕获 + ready() 激活 + ComponentHandle 注册），否则 force() 结果被吞、`component:*` 不可解析（CX-9/CX-12）。

---

## Audit-Remediation Lessons (MR1–MR3)

The following entries were extracted from the MR1–MR3 closure plans during the MG (Guard Activation) milestone. Each describes a repeatable failure pattern, how it was detected, how it was fixed, and what guard would prevent it going forward.

### 02 BEM naming drift in CSS class selectors

- **Pattern**: BEM-style `--` modifier naming (`nop-hairline--*`) introduced in CSS despite the project's no-BEM policy (see `docs/architecture/styling-system.md`). The double-dash modifier looked like a standard CSS convention but violated the established contract that layout renderers emit marker classes only, and widget renderers use self-styled shadcn/Tailwind patterns without modifier suffixes.
- **Detected**: MA1 structure audit (`arm-MA1-basic-structure.md`, finding MA1-P1-002). Manual code review and grep for `--` in CSS class strings.
- **Fix (MR1 R1.2)**: Globally renamed `nop-hairline--*` to `nop-hairline-*` across `packages/ui/src/styles/mobile.css`, 4 renderer files, 5 test files, and 2 playground demos.
- **Prevention guard**: Enforce CSS class naming via lint rules or review checklist: no `--` modifier suffixes in class names. The `check:audit-styling-suspects` script can flag bare `[data-slot]` selectors and related style anti-patterns.

### 03 Async void-promise without structured error routing

- **Pattern**: Fire-and-forget `async` calls using `void` operator without any structured error routing annotation. 35 occurrences found across core and runtime packages (`flux-core`, `flux-compiler`, `flux-action-core`, `flux-formula`, `flux-runtime`, `flux-react`). Each was intentional (not a bug) but gave no clue to future maintainers about where errors would surface.
- **Detected**: MA2 runtime audit (`arm-MA2-core-schema-dispatch.md`, finding MA2-CORE-F03; `arm-MA2-runtime-raw-async-fieldframe.md`, finding MA2-RT-F01). Systematic grep for `void ` patterns in async contexts.
- **Fix (MR1 R1.9, R1.10)**: Annotated all 35 locations with structured error routing comments in the format `// Errors routed through <mechanism> — <rationale>`.
- **Prevention guard**: Require structured error routing annotation for every `void`-prefixed async call. The `check:audit-async-failure-paths` script already exists; extend its scope or add a dedicated `check:audit-void-promises` rule.

### 04 Empty or silent catch blocks

- **Pattern**: Empty `catch` blocks that silently swallow exceptions. Found in `container-hooks.ts:87` where `componentRegistry.resolve()` could fail but the error was completely discarded with an empty `catch {}`.
- **Detected**: MA3 code quality audit (`arm-MA3-core-runtime-code-quality.md`, finding MA3-F01). Manual review of catch blocks and linting for empty catch clauses.
- **Fix (MR2 R2.1)**: Added `console.warn` with structured error information.
- **Prevention guard**: ESLint rule `no-empty` (or similar) configured with `allowEmptyCatch: false` for all catch blocks. Code review checklist item: "every catch block must either handle, rethrow, or log."

### 05 Documentation contract drift from live code

- **Pattern**: Architecture docs (`field-frame.md`, `form-validation.md`, `object-field.md`, `array-field.md`, `module-cache-and-import-stack.md`, `action-scope-and-imports.md`, `quick-reference.md`, `terminology.md`) contained stale API names, incorrect type references, or behavior claims that no longer matched live code. This misled both humans and AI agents relying on those docs as source of truth.
- **Detected**: MA6 doc consistency audit (`arm-MA6-doc-contract.md`, findings MA6-P1-001 through MA6-P1-008). Cross-referenced each doc claim against live codebase via grep, import tracing, and runtime behavior verification.
- **Fix (MR3 R3.9–R3.16)**: Corrected all 8 doc files to match live code signatures, types, and behavior.
- **Prevention guard**: Architecture docs must be verified against live code as part of any code change that touches the documented API surface. Add a doc-review step to the PR checklist: "if you changed a public API or renderer behavior, update the corresponding `docs/architecture/` doc in the same PR." The `implementation-contract-review-prompt.md` skill can be used to catch drift during plan review.
