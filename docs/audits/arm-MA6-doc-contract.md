# Audit Report: MA6 — 文档与契约一致性审计

> Plan: `docs/plans/2026-07-27-1900-2-ma6-doc-contract-audit.md`
> Date: 2026-07-27
> Status: completed

## Scope Executed

- ✅ Phase 1: All 66 `docs/architecture/` documents verified against live code
- ✅ Phase 2: `docs/references/quick-reference.md`, `terminology.md`, 27 component docs, `project-context.md`
- ✅ Phase 3: Roadmap/arm-index sync check

## Phase 1 Findings Summary

**Total findings**: 130 (P1: 6, P2: 40, P3: 84)

### P1 Findings

| ID      | Doc                              | Description                                                                                              | Category        |
| ------- | -------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------- |
| MA6-F01 | field-frame.md                   | FieldFrame render structure sketch severely outdated; missing ARIA, focus tracking, rootTag substitution | owner-doc-drift |
| MA6-F02 | form-validation.md               | FieldFrame described using wrong hook names (selectCurrentFormFieldState → useCurrentFormFieldState)     | inaccurate-type |
| MA6-F03 | object-field.md                  | transformInAction/transformOutAction claim of "已接线" only partially true                               | owner-doc-drift |
| MA6-F04 | array-field.md                   | sortable schema-declared but never runtime-wired                                                         | owner-doc-drift |
| MA6-F05 | module-cache-and-import-stack.md | ImportStack.push() parameters differ significantly from documented interface                             | owner-doc-drift |
| MA6-F06 | action-scope-and-imports.md      | ComponentCapabilities.invoke() uses ComponentCapabilityActionContext not ActionContext                   | inaccurate-type |

### Key P2 Themes

- **Interface drift**: flux-core.md, renderer-runtime.md, action-scope.md show typed interfaces differing from live code
- **ImportStack interface**: Multiple methods/params wrong (push, pop, preload, installPrepared)
- **TemplateNode missing 15+ fields** in documented interface
- **quick-reference.md**: Systematic type signature drift (ScopeRef, CompiledTemplate, RendererRuntime)
- **4 package listing missing** from frontend-baseline.md
- **useGlobalZIndex** status wrong in mobile-responsive-baseline.md
- **CRUD syncLocation**: Doc marks as "不采纳" but code exposes the field
- **Combo multiple**: Doc lists field not in code

### P3 Themes

- parsePath LRU→FIFO inaccuracy
- frameRootTag missing `'label'` option
- .fd-theme-root section describes deprecated convention
- Countdown prefix/suffix type mismatch
- Calendar registration status outdated
- Various hook signature details in quick-reference.md

## Phase 2 Findings Summary

**Total findings**: 51 (P1: 2, P2: 19, P3: 25, Confirmed accurate: 76)

### P1 Findings

| ID      | Doc                | Description                                                   | Category        |
| ------- | ------------------ | ------------------------------------------------------------- | --------------- |
| MA6-F07 | quick-reference.md | ScopeRef.update signature completely wrong (patch→path+value) | inaccurate-type |
| MA6-F08 | terminology.md     | RendererComponentProps omitted reactions field                | inaccurate-type |

### Key Findings

- **quick-reference.md**: 37 findings — systematic interface drift (ScopeRef, CompiledTemplate, RendererRuntime, hook signatures)
- **terminology.md**: 5 findings — mostly accurate (40/45 terms correct)
- **Component docs**: 22/27 confirmed accurate; 5 minor findings
- **project-context.md**: 4 findings — main gap is missing Node.js 25 requirement

## Phase 3 Findings

### Roadmap vs arm-index Inconsistencies

| Phase ID | Roadmap Status | arm-index Status | Gap                                                                                              |
| -------- | -------------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| MA4.1    | `todo`         | `completed`      | **INCONSISTENT** — arm-index reports completed audit reports exist, but roadmap still shows todo |

The MA4.1 inconsistency suggests the roadmap was not updated when MA4.1 was completed. This is a direct violation of the roadmap's own rule: "更新状态只改这里" and "Status: 全文件唯一的动态状态区".

## P0/P1 Finding Index Updates

| Finding ID | Severity | Doc/Location                     | Description                                               | Source                  | Status | Fix Plan    |
| ---------- | -------- | -------------------------------- | --------------------------------------------------------- | ----------------------- | ------ | ----------- |
| MA6-P1-001 | P1       | field-frame.md                   | FieldFrame render structure sketch severely outdated      | arm-MA6-doc-contract.md | open   | Pending MR3 |
| MA6-P1-002 | P1       | form-validation.md               | FieldFrame described using wrong hook names               | arm-MA6-doc-contract.md | open   | Pending MR3 |
| MA6-P1-003 | P1       | object-field.md                  | transformInAction/transformOutAction claim partially true | arm-MA6-doc-contract.md | open   | Pending MR3 |
| MA6-P1-004 | P1       | array-field.md                   | sortable schema-declared but never runtime-wired          | arm-MA6-doc-contract.md | open   | Pending MR3 |
| MA6-P1-005 | P1       | module-cache-and-import-stack.md | ImportStack.push() parameters differ                      | arm-MA6-doc-contract.md | open   | Pending MR3 |
| MA6-P1-006 | P1       | action-scope-and-imports.md      | ComponentCapabilities.invoke() uses wrong types           | arm-MA6-doc-contract.md | open   | Pending MR3 |
| MA6-P1-007 | P1       | quick-reference.md               | ScopeRef.update signature completely wrong                | arm-MA6-doc-contract.md | open   | Pending MR3 |
| MA6-P1-008 | P1       | terminology.md                   | RendererComponentProps omitted reactions field            | arm-MA6-doc-contract.md | open   | Pending MR3 |

## Detailed Phase Reports

- `docs/analysis/2026-07-27-ma6/phase-01.md` (index)
  - `docs/analysis/2026-07-27-ma6/phase-01-core.md` (core arch)
  - `docs/analysis/2026-07-27-ma6/phase-01-form-field.md` (form/field)
  - `docs/analysis/2026-07-27-ma6/phase-01-action-scope.md` (action/scope)
  - `docs/analysis/2026-07-27-ma6/phase-01-remaining.md` (remaining)
- `docs/analysis/2026-07-27-ma6/phase-02.md` (index)
  - `docs/analysis/2026-07-27-ma6/phase-02-quick-reference.md`
  - `docs/analysis/2026-07-27-ma6/phase-02-terminology.md`
  - `docs/analysis/2026-07-27-ma6/phase-02-components.md`
  - `docs/analysis/2026-07-27-ma6/phase-02-project-context.md`

## Cross-Cutting Observations

1. **Format consistency**: quick-reference.md and terminology.md are the most-consulted reference docs but have the highest drift
2. **Component docs quality**: Component docs (docs/components/) are well-maintained — 22/27 accurate
3. **Architecture doc variance**: Core architecture docs (flux-core, renderer-runtime) have modest drift; peripheral docs (scoped-render-slots, composite-value-owner) are correctly labeled as aspirational
4. **MA4.1 status inconsistency**: Roadmap shows `todo` but arm-index shows `completed` — needs reconciliation
