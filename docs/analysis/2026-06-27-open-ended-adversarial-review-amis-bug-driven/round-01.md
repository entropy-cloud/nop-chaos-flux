# Round 01 — Open-Ended Adversarial Review (mission `amis-bug-driven-improvements`)

> Per-round record for the execution whose authoritative deliverable is
> `docs/audits/2026-06-26-1859-open-audit-amis-bug-driven-improvements.md`.
> This round captures the raw 4 parallel sub-agent probes; the main agent
> re-verifies the high-confidence findings live before promoting them into the
> deliverable (see round-01-verification.md for the re-verification log).

- **Snapshot**: HEAD `b6848f32` (post-remediation of prior open-audit G1–G18 + multi-audit follow-ups).
- **Dedup baseline**: prior open-audit G1–G18 (now mostly FIXED — see §0 of the deliverable), parallel multi-audit AUDIT-01..22, prior components-audit C-series, `docs/references/reopened-design-decisions-and-audit-adjudications.md`.
- **Method**: code-driven. 4 open-ended parallel probes (table/CRUD/selection/chart/list · form-advanced composite cluster · runtime/validation/i18n/core · mobile/content/tree/lifecycle) + main-agent live re-verification of every `certain` finding.

## FIX-status (verified by sub-agents, re-confirmed by main agent in deliverable §0)

G1, G2, G3, G4-core, G5, G6, G7, G8, G9, G10, G11, G12, G13-partial, G14, G15-core, G16, G17, G18, F1, F2, F6 — all FIXED. G13 is only cosmetically batched (RESIDUAL-1). G4/G15 core API fixed but production adoption incomplete (NEW-R1).

## Candidate findings (to be re-verified)

### Table / CRUD / selection / chart / list / drag-sort cluster

- NEW-T1 — column-resize scope ownership publishes stale pre-drag width (certain)
- NEW-T2 — column-resize leaks window listeners; no pointercancel path (certain)
- NEW-T3 — `controlled` ownership column-resize is a silent no-op (certain)
- NEW-T4 — controlled ownership never reflects schema-driven width updates (likely)
- NEW-T5 — `MemoizedDataRow` hand-written memo + comparator omits `fixedColumnLayout` (certain convention / likely correctness)
- NEW-T6 — `useTableExpand` is local-only, breaking the ownership matrix (certain)
- NEW-T7 — `PaginationRenderer` swallows runtime `total` changes + raw `<option>` (certain)
- NEW-T8 — `useCrudRuntimeState` init effect runs every render (certain perf / likely correctness)
- NEW-T9 — drag handle advertises `role=button`+`tabIndex=0` but no keyboard activation (certain a11y)
- NEW-T10 — drag-handle click bubbles to row → spurious `onRowClick`/expand (likely)
- NEW-T11 — drag-sort silent on `scope` without `statePath` (certain)
- NEW-T12 — quick-edit save commits wrong record when `record` changes mid-save (likely)
- NEW-T13 — `TableLoadingOverlay` hardcodes English `'Loading'` (certain i18n)
- NEW-T14 — `CopyButton` aria-labels hardcoded English (certain i18n)
- NEW-T15 — pie chart `Cell` key collides on equal name (likely)
- NEW-T16 — chart `Number()` casts produce `NaN` pie/scatter values (likely)
- NEW-T17 — `handleSelectAll` phantom keys under `keepOnPageChange:true` (likely)

### Form-advanced composite cluster

- NEW-F1 — date-range time-typing bypasses min/max while single date field clamps (certain)
- NEW-F2 — tree `treeConfig` identity instability stalls remote-search debounce (certain)
- NEW-F3 — tree lazy-children `runLoad` no cancellation / unmount guard (likely)
- NEW-F4 — tree expanded-state forcibly re-expands every node on options change (likely)
- NEW-F5 — condition-builder `BetweenInput` silently discards survivor when one side cleared (certain)
- NEW-F6 — condition-builder `rewriteItemRight` id-collision corruption (likely)
- NEW-F7 — `input-table` lacks `removeWhen` support (certain asymmetry)
- NEW-F8 — key-value no inline duplicate-key feedback; default permits duplicates (likely)
- NEW-F9 — upload `removeExisting` races with parallel `commitItems` (likely)
- NEW-F10 — inconsistent validation-trigger semantics across composite editors (likely)
- NEW-F11 — array-field removeWhen identity fallback mismatches React-key fallback (interesting-guess)
- NEW-F12 — condition-builder projected form/scope recreated every render (likely perf)

### Runtime / validation / i18n / core cluster

- NEW-R1 — G15 fix never adopted by any production package test (sibling masking still live) (certain)
- NEW-R2 — `validateSubtree` drops caller abort signal on compiled-model path (likely)
- NEW-R3 — capability matcher array-element anchor over-broad (likely)
- NEW-R4 — cancellation flows through `onError` recovery branches (interesting-guess)

### Mobile / content / tree / lifecycle cluster

- NEW-L1 — out-of-order success publishes stale data (likely, P0 race)
- NEW-L2 — notice-bar marquee decision not re-evaluated on resize (certain)
- NEW-L3 — latent TDZ: `dispose()` references `unsubscribe` before its `const` init (interesting-guess)
- RESIDUAL-1 — G13 tree fat-node freeze only deferred, not virtualized (certain residual)
- NEW-L4 — `page.tsx` toolbar hardcodes `flex flex-col` (likely convention)
- NEW-L5 — cluster-wide redundant hand-written memoization under React Compiler (certain convention, low-value)

## Conclusion of round 01

A substantial set of novel, high-value findings beyond the dedup baseline, concentrated in (a) the table ownership matrix (expand/resize/controlled gaps that mirror the just-fixed G10/G2 family), (b) data-loss/contract edges in composite fields, (c) the contract-honesty guard still not guarding in production (NEW-R1 — the headline), and (d) an async stale-winner race in the data-source controller (NEW-L1). Round 01 is NOT clean; main-agent re-verification follows.
