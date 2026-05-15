# Open-Ended Adversarial Review — 2026-05-15 — Summary

**Execution date**: 2026-05-15
**Result directory**: `docs/analysis/2026-05-15-open-ended-adversarial-review-01/`
**Total finding rounds written**: 2
**Total findings**: 5

## Findings

### Round 1: Terminal Semantics Gaps

- Action dispatcher teardown clears debounced timers without settling returned dispatch promises, and runtime disposal still does not call dispatcher cleanup.
- Flow Designer `deleteSelection` deletes only the active node/edge even though core and action APIs support multi-selection.
- `detail-view` can publish an invalid transformed commit to the parent scope/form before rejecting the commit and keeping the draft open.

### Round 2: Structural Path Contract Split

- Renderer owner `statusPath` semantics are split between the frozen static-structural contract and live dynamic prop behavior.
- Dynamic `form.statusPath` / `valuesPath` can replace the `FormRuntime` without disposing the old runtime, leaving old external publication subscriptions alive.

## No-New-Finding Pass

After writing round 2, I checked additional directions around parameterized `$slot` regions, global event/listener patterns, accessibility/readOnly affordances, ID/cache ownership, and known Word Editor dataset persistence. I did not find another sufficiently fresh, high-value issue to report in this execution.

Important de-duplication decisions:

- Table bare `record` vs `$slot.record`, expanded-row params, and deep `$slot` propagation were already covered or corrected in recent reports.
- Spreadsheet default body, readOnly UI, global shortcuts, table filter pagination, data-source dynamic publication paths, Flow Designer drag stale cache, and detail-view stringify remount were already reported on 2026-05-14.
- Word Editor dataset precedence is now explicitly documented as persisted-first and covered by earlier plans/logs.
- API request parent `AbortSignal` listener cleanup was already retained in 2026-05-12 deep-audit results, so it was not re-reported here.

## Overall Assessment

The highest-value direction from this run is owner lifecycle terminality: APIs expose owner-scoped concepts such as dispatch promises, selected sets, draft commits, and publication paths, but several implementations complete only part of the terminal transition. These are not isolated style issues; they create externally observable states where cleanup happened without promise settlement, selection existed without selected-set command behavior, a commit failed while parent data changed, or a form owner was replaced while its previous publication stayed alive.

The second direction worth attention is structural-path governance. `statusPath` has crossed from raw structural config into resolved props in many renderers, but the docs and some owner implementations still assume static identity. The project should choose one contract and encode it in compiler validation, renderer metadata, runtime cleanup, and tests.

## Blind-Spot Self-Assessment

This execution was static-code-heavy. I did not run focused regression tests or browser repros for the five findings. I also intentionally avoided already-saturated areas from the last two days of reviews, so there may still be fresh issues inside spreadsheet/report designer interaction paths that were skipped to reduce duplication. A good next round would start from actual owner replacement tests: dynamic form publication paths, multi-select destructive commands, and invalid staged commits under sibling observers.

## Files Written

- `docs/analysis/2026-05-15-open-ended-adversarial-review-01/round-01.md`
- `docs/analysis/2026-05-15-open-ended-adversarial-review-01/round-02.md`
- `docs/analysis/2026-05-15-open-ended-adversarial-review-01/summary.md`
