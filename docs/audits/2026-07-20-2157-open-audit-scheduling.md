> Audit Status: planned
> Audit Type: open-ended
> Mission: scheduling

# Open-Ended Adversarial Audit: `@nop-chaos/flux-renderers-scheduling`

**Date**: 2026-07-20
**Package**: `packages/flux-renderers-scheduling/`
**Result files**: `docs/analysis/2026-07-20-2157-open-audit-scheduling/round-{01,02,03}.md`
**Previous audit**: `docs/audits/2026-07-20-2157-multi-audit-scheduling.md` (116 items, 12 dimensions)

## Executive Summary

This open-ended adversarial review found **30 novel issues** not covered by the previous
116-item multi-dimensional audit. The key blind spots in the previous audit were:
**functional correctness** (completely broken features in "done" items), **i18n gaps**
(entire sub-domains with no translation support), **cross-instance state leaks**
(module-level singletons), and **architecture convention violations** (EventEmitter
vs Zustand).

### Severity Distribution

| Severity | Count | Category                                                      |
| -------- | ----- | ------------------------------------------------------------- |
| P0       | 4     | Functional correctness — broken interactions, dead components |
| P1       | 13    | High — multi-resource broken, i18n gap, cross-instance leaks  |
| P2       | 13    | Medium — dead code, stale closures, schema-runtime mismatch   |

### Top 5 Findings (by impact)

| ID        | Severity | Finding                                                                                             |
| --------- | -------- | --------------------------------------------------------------------------------------------------- |
| F-02      | P0       | Gantt keyboard Delete/Backspace passes empty update `{}` — no-op, no task deletion                  |
| F-01/F-29 | P0       | Scroll stubs (3 instances) — imperative handle + toolbar button promise scroll but only emit change |
| F-14      | P0       | GanttEditor completely dead — `useState(false)` never set to true, always returns null              |
| F-07      | P0       | Resource load calculation multiplies `totalDays × todayMinutes` — grossly overcounts                |
| F-04      | P1       | Kanban loading condition treats `meta.disabled === undefined` as loading — skeleton forever         |

### Key Patterns

1. **Stub syndrome**: 3+ functions named with action semantics that are no-ops
2. **Dead "done" status**: 3 roadmap items marked complete but completely non-functional
3. **i18n gap**: 3 of 4 sub-domains have zero internationalization; locale keys exist but
   are never consumed
4. **Cross-instance leaks**: Module-level BarcodeQueue, DOM ID-based queries
5. **Architecture drift**: GanttStore is a vanilla EventEmitter, not Zustand
6. **Contract-runtime asymmetry**: 4 schema events declared but never dispatched
7. **Reactivity misfit**: Coarse subscription causes missed AND excessive re-renders

### Blind Spots (uncovered areas for next round)

- Build-time bundling and tree-shaking integration
- Cross-package type contract verification (flux-core generic constraints)
- Performance benchmark execution
- E2E test suite run
- Bundle size analysis
- Error boundary behavior
- AMIS schema compatibility

### Per-File Hotspot Map

| File                                            | Findings               | Severities |
| ----------------------------------------------- | ---------------------- | ---------- |
| `gantt-editor.tsx`                              | F-14, F-23             | P0, P2     |
| `gantt.tsx`                                     | F-01                   | P0         |
| `use-gantt-keyboard.ts`                         | F-02                   | P0         |
| `resource-load.ts`                              | F-07                   | P1         |
| `kanban-board.tsx`                              | F-03, F-04             | P1         |
| `gantt-context.tsx`                             | F-05, F-11             | P1, P2     |
| `gantt-header.tsx`                              | F-29                   | P0         |
| `calendar-week-view.tsx`                        | F-16                   | P1         |
| `calendar-month-view.tsx`                       | F-18                   | P1         |
| `calendar.tsx`                                  | F-13, F-17, F-26, F-19 | P1, P2     |
| `barcode-scanner-overlay.tsx`                   | F-21, F-22             | P1, P2     |
| `barcode-input-renderer.tsx`                    | F-24, F-25             | P2         |
| `diff-split-view.tsx` + `diff-unified-view.tsx` | F-15                   | P1         |
| `diff-view/` (CSS)                              | F-20                   | P1         |
| `gantt/` + `calendar/` + `kanban/` (i18n)       | F-27, F-28, F-30       | P1, P2     |
| `undo-stack.ts` vs `kanban-undo-stack.ts`       | F-06                   | P1         |
| `critical-path.ts`                              | F-12                   | P2         |

## Conclusion

The scheduling package has significant feature completeness gaps that the ongoing S-phase
work items claim as "done". Three non-functional features (GanttEditor, cross-day SVG lines,
diff-view CSS) and three stub behaviors (scroll, delete) point to either incomplete
implementation or lack of integration testing. The i18n gap across 3/4 sub-domains is the
largest silent risk — all user-facing text is hardcoded Chinese or English with no migration
path to translations.

The previous 12-dimension multi-audit focused on per-dimension property checks
(accessibility, styling, test quality) and did not discover any of the 30 issues found here.
This confirms the methodology note in the open-ended adversarial review prompt:
cross-cutting functional misbehavior requires open-ended exploration, not dimensional decomposition.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
