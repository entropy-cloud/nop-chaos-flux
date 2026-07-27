# MA6 Phase 1 — Architecture Docs Consistency Audit

**Date**: 2026-07-27
**Scope**: All 66 documents under `docs/architecture/` verified against live codebase
**Method**: Doc claims extracted → source grep/read → cross-reference via sub-agents

## Consolidated Findings Summary

Total findings across all architecture docs: **130**

- **P1**: 6 (major drift causing confusion)
- **P2**: 40 (notable drift / stale info)
- **P3**: 84 (clean or minor issues)
- **Confirmed correct**: 25+ (explicitly verified claims)

## Detailed Reports

The following sub-reports contain the full findings:

| Report                           | Findings | P1  | P2  | P3  | Link                       |
| -------------------------------- | -------- | --- | --- | --- | -------------------------- |
| Core architecture (7 docs)       | 8        | 0   | 5   | 3   | `phase-01-core.md`         |
| Form/Field architecture (9 docs) | 31       | 4   | 20  | 7   | `phase-01-form-field.md`   |
| Action/Scope/Security (14 docs)  | 52       | 2   | 16  | 34  | `phase-01-action-scope.md` |
| Remaining architecture (36 docs) | 39       | 0   | 4   | 35  | `phase-01-remaining.md`    |

## P1 Findings (must fix in MR3)

1. **field-frame.md:157-267** — FieldFrame render structure sketch is severely outdated; missing ARIA, focus tracking, `rootTag` substitution, `useCurrentValidationScope()` fallback, dual dynamic-required paths
2. **form-validation.md:144-147** — FieldFrame described using `selectCurrentFormFieldState`/`selectCurrentFormErrors` but actual hooks are `useCurrentFormFieldState`/`useAggregateError`
3. **object-field.md:40** — `transformInAction`/`transformOutAction` claim of "已接线" is only partially true; they trigger working-value mode but full adapter pipeline semantics still evolving
4. **array-field.md:63** — `sortable` schema-declared but never runtime-wired in renderer (only schema-field)
5. **module-cache-and-import-stack.md:225-228** — `ImportStack.push()` parameters differ significantly from documented interface (different param names, missing `scope`/`schemaUrl`/`componentRegistry`, `imports` is optional)
6. **action-scope-and-imports.md:293** — `ComponentCapabilities.invoke()` uses `ComponentCapabilityActionContext`/`ComponentCapabilityResult`, not `ActionContext`/`ActionResult`

## Key Cross-Cutting Themes

1. **Interface drift**: Several docs (flux-core.md, renderer-runtime.md, action-scope.md) show typed interfaces that differ from live code in field names and types
2. **Outdated component sketches**: FieldFrame render structure sketch (§1 in field-frame.md) is significantly simplified vs live implementation
3. **Documented-as-LRU vs FIFO**: `parsePath` cache behavior described inaccurately (P3)
4. **Forward-looking designs not marked**: `scoped-render-slots.md` and `composite-value-owner-clean-slate.md` describe target-state designs without clear status indicators
5. **Missing package listings**: `frontend-baseline.md` missing 4 packages (P2)
6. **Status inaccuracies**: `mobile-responsive-baseline.md` claims `useGlobalZIndex` as `todo` when it's fully implemented (P2)
