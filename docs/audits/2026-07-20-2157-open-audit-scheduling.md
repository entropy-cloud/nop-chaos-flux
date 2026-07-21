> Audit Status: planned
> Remediation Plan 1: `docs/plans/2026-07-21-1830-1-scheduling-reactivity-cross-instance-fix-plan.md` (draft — F-31, F-32, F-33, F-37)
> Remediation Plan 2: `docs/plans/2026-07-21-1830-2-scheduling-contract-test-build-integrity-plan.md` (draft — F-34, F-35, F-36, F-38)
> Audit Type: open-ended
> Mission: scheduling

## Execution

This audit followed the `docs/skills/open-ended-adversarial-review-prompt.md` protocol.
Rounds 1-4 were executed against the current HEAD of `packages/flux-renderers-scheduling/`
and related packages (`flux-i18n`, `flux-core`, etc.).

Individual round findings are saved at:

- `docs/analysis/2026-07-20-2157-open-audit-scheduling/round-01.md` (13 findings)
- `docs/analysis/2026-07-20-2157-open-audit-scheduling/round-02.md` (13 findings)
- `docs/analysis/2026-07-20-2157-open-audit-scheduling/round-03.md` (4 findings)
- `docs/analysis/2026-07-20-2157-open-audit-scheduling/round-04.md` (8 findings — this session's new findings)

## Aggregate Totals

| Metric                | Count |
| --------------------- | ----- |
| Total findings        | 38    |
| Novel to this session | 8     |
| Duplicate-free        | 38    |

### Severity Distribution (this session)

| Severity | Count | IDs           |
| -------- | ----- | ------------- |
| P0       | 1     | F-31          |
| P1       | 1     | F-33          |
| P2       | 6     | F-32, F-34-38 |

### Most Critical Finding

**F-31: GanttStore revision NOT bumped on `parse`, `setZoom`, or `recalcLayout` (P0)**

The Gantt store's revision-based subscription model (`gantt-context.tsx`) depends on
revision counters to trigger React re-renders via `useSyncExternalStore`. Three key
store methods — `parse()`, `setZoom()`, and `recalcLayout()` — update Zustand state
but never increment `revision`, `taskRevision`, or `layoutRevision`. This means:

- Schema data changes (re-parse via useEffect) are invisible to UI components
- Zoom changes leave bars/timeline at the old pixel coordinates
- Any layout recalculation after non-interactive updates produces stale rendering

12 of the 30 findings from previous rounds have been verified as fixed in the current
codebase, but the reactivity model gap (F-31) is the most impactful remaining defect.

### Round 4 — Key Cross-Cutting Pattern

**Store reactivity model has both dead code and missing code**: The `GanttStore`
carries a manual EventEmitter (8 event types, zero runtime subscribers — F-32) AND
a revision-based subscription system where 3 out of 6 revision-emitting entry points
forget to actually bump the revision (F-31). This suggests the reactivity model was
refactored (from EventEmitter to revision counters) mid-development, leaving both
the old dead path and the new incomplete path.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
