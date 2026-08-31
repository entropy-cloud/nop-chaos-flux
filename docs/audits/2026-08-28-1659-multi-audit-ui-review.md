> Audit Status: planned（原 open → 2026-08-31 mission-driver 起草轮：0 P0 / 23 P1 全部路由三份 plans——组 A 交互/行为 10 条 → `docs/plans/2026-08-31-1941-1-ui-review-p1-interaction-behavior-remediation.md`；组 B 契约/样式漂移 4 条 → `docs/plans/2026-08-31-1941-2-ui-review-p1-contract-styling-drift-remediation.md`；组 C a11y 7 条 + 组 D 测试保护 2 条 → `docs/plans/2026-08-31-1941-3-ui-review-p1-a11y-and-test-protection.md`；16 条 P2 + 3 条 P2 观察已移入 `docs/backlog/audit-followups-2026-08-28-1659.md` Follow-up Backlog）
> Audit Type: multi-dimensional
> Mission: ui-review

# Multi-Dimensional Audit — mission `ui-review`

- **Audit date**: 2026-08-31 (driver tag `2026-08-28-165941`)
- **Scope**: entire `ui-review` branch vs master (merge-base `01770f77`, 50 commits): product code (~100 files under `packages/flux-react`, `flux-renderers-basic/content/data/scheduling/form-advanced/ai/layout/industrial`, `ui`, `flux-i18n`, `nop-debugger`, `flux-formula`), new consistency gate (`scripts/audit/find-ui-consistency-gaps.mjs`), config/manifest, ~30 new test files, playground replicas, public contracts (index exports), cross-referenced against architecture docs for contract drift.
- **Method**: `docs/skills/deep-audit-prompts.md` two-phase model — Phase 1: 6 parallel dimension-cluster initial audits (dims 01+03, 09+22, 05+06+07, 10+11+20, 14+23, 13+15+19; 15 of 23 dimensions, selected for mission relevance). Phase 2 (mandatory): 6 independent review agents (1 item-by-item for all P1 candidates, 5 batch by cluster) re-verified every finding against live code; no deep-dig round 2 was dispatched — initial rounds already covered the main paths with cross-verification and self-rejected misfires (value-convergence termination per the manual).
- **Tooling baselines (all green, not re-reported)**: `pnpm check` / `lint` / `typecheck` (37/37) / `build` exit 0; suspect scripts `audit-reactive-render-reads` / `audit-async-failure-paths` / `audit-styling-suspects` / `audit-performance-suspects` / `audit-runtime-raw-schema-reads` / `audit-ui-consistency-gaps` exit 0; suspect outputs consumed and re-verified (e.g. `batch-bar.tsx:39` broad-scope-selector → finding 05-01).

## Verdict summary

| Priority | Count | Meaning                                                                                  |
| -------- | ----- | ---------------------------------------------------------------------------------------- |
| `[P0]`   | 0     | —                                                                                        |
| `[P1]`   | 23    | Verified real defects / contract drifts / test-protection gaps; drive a remediation plan |
| `[P2]`   | 16    | Real but low-impact polish/hygiene; record-only, backlog                                 |
| Rejected | 4     | Initial-audit candidates overturned by independent review (owner-contract adjudications) |

Review stats: 43 candidates初审 → 26 retained (3 P1 + 20 P2 verified real), 16 downgraded to polish, 4 rejected. Zero finding of any priority at P0.

---

## P1 findings (drive remediation)

### A. Interaction / behavior defects

[P1] **22-01 editable-cell checkbox in-place edit has no in-flight gate — long-press / rapid clicks fire N serial save dispatches**

- Justification: real duplicate-side-effect defect; the only editor branch in the file missing the `saving` gate every sibling has.
- File: `packages/flux-renderers-data/src/table-renderer/table-editable-cell.tsx:351-398` (`toggleCheckbox`), `:411-426` (wrapper keydown + `Checkbox`), contrast `:468`/`:489` (`disabled={saving}` on text/number/date editors)
- Evidence: `toggleCheckbox` has no `if (saving) return`; `onKeyDown` triggers it for Enter/F2/Space with no `event.repeat` filter and no saving check; `++saveGenerationRef` only discards stale _results_, not _dispatches_. Whole-directory cross-check confirms checkbox is the unique gap (`table-quick-edit-controller.ts:327`, `use-row-quick-edit-draft.tsx:204` both gate).
- Risk: non-idempotent `saveAction` receives duplicate writes; server state briefly drifts from spinner state.
- Fix: add `if (saving) return` at `toggleCheckbox` entry (and/or `disabled={saving}` on the Checkbox), aligning with sibling editors.
- Review: retained P1 (item-by-item re-verified, all 5 sub-claims confirmed).

[P1] **06-01 Drawer resize pointer listeners: no `pointercancel`, no unmount cleanup → ghost-resize after touch-cancel**

- Justification: user-visible interaction defect on a common input path (touch), plus listener leak; deviates from the package's own established drag hygiene.
- File: `packages/ui/src/components/ui/drawer.tsx:278-314` (`useDrawerResize`)
- Evidence: listeners registered in `onPointerDown` (not effect), only removed on `pointerup`; `handleMove` guards on `dragStateRef` only, not buttons; no `pointercancel`/`lostpointercapture`/blur branch; no unmount cleanup. Same package's `use-dialog-drag.ts:186-189, 222-227` implements all of these; resize handle className has no `touch-action`, so browser gesture takeover (→ pointercancel) is the _common_ outcome on touch.
- Risk: after a cancel, un-buttoned mouse movement keeps resizing the drawer until the next random pointerup; reviewer correction: orphan-listener accumulation is bounded/self-healing (any pointerup clears all), the persistent defect is the ghost-resize window. Zero cancel coverage in `drawer-body-scroll-resize.test.tsx`.
- Fix: handle `pointercancel` (same teardown as `handleUp`); or move registration into an effect with cleanup.
- Review: retained P1 (sub-claim "unbounded accumulation" narrowed; core defect unchanged).

[P1] **22-04 query-filter collapse unmounts the embedded form runtime — uncommitted query draft silently lost**

- Justification: real user-facing state loss on the component's own core toggle interaction.
- File: `packages/flux-renderers-data/src/query-filter.tsx:62`; `crud-renderer.tsx:595-604` (same pattern)
- Evidence: `collapsed → null` genuinely unmounts the region; embedded form runtime has no `valuesPath`, values live only in the runtime store → `dispose()` discards them. Both hosts share the behavior (uniform design gap, not a typo). `renderer-interfaces.md:540-542` documents only collapsed/expanded labels, never draft disposal.
- Risk: mis-clicking the collapse arrow silently destroys typed filter conditions.
- Fix: keep mounted + `hidden`, or confirm-before-collapse; apply to both hosts for family consistency.
- Review: retained P2 (manual) → driver P1 (real state-loss defect, non-blocking).

[P1] **22-05 tabs `addTab` has no duplicate-value guard — repeated value breaks key/addressing invariants**

- Justification: real invariant-breaking defect on a public capability channel; addTab is the only mutation op without a guard.
- File: `packages/flux-renderers-basic/src/tabs-view-management.ts:66-90`; `tabs.tsx:273-274`
- Evidence: `runRemoveTab`/`runRenameTab`/`runMoveTab` all guard; `runAddTab` checks only controlled/item-shape/title. Duplicate value → duplicate React `key={value}` + duplicate Radix TabsTrigger value; `findIndex` addressing (remove/move/active pointer) hits only the first copy. Contract (`renderer-interfaces.md:783-790`) defines failure paths for remove/rename but leaves addTab-duplicate undefined.
- Fix: return `{ok:false}` + dev warn on existing value (or define overwrite/-suffix semantics in the contract).
- Review: retained P2 (manual) → driver P1.

[P1] **13-03 tabs `addTab` same-tick lost update + `Date.now()` value self-collision**

- Justification: real write-write race on the capability path — same root area as 22-05, independently verified.
- File: `tabs-view-management.ts:54, 76-89`; `tabs.tsx:122, 130-133, 165-170`
- Evidence: `generateTabValue = \`tab-${Date.now()}\``(same-millisecond collision);`runAddTab`reads the render-closure`items`snapshot and`commitCollection(next)` writes absolute values (`setManagedItems(next)`local /`scope.update`scope) — two`invoke('addTab')` in one tick share the same stale ops → second commit discards the first tab.
- Fix: functional update (`setManagedItems(prev => …)`) + monotonic value counter.
- Review: retained P2 (manual) → driver P1.

[P1] **13-02 `areColumnsRenderEquivalent` omits `editable` — G6-isomorphic stale-chrome defect re-introduced by this branch**

- Justification: verified functional defect, structurally identical to the already-fixed G6 quickEdit/copyable comparator gap.
- File: `packages/flux-renderers-data/src/table-renderer/table-flattened-items.ts:148-165` (comparator compares `quickEdit`/`quickEditBodyRegionKey`/`copyable`, not `editable`); `table-body-row-rendering.tsx:430-439` (`column.editable` drives the cell chrome branch), `:571-609` (`MemoizedDataRow` bails out on this comparator)
- Evidence: the G6 comment itself declares "these fields drive cell chrome … Omitting them left the comparator blind"; dynamic columns at runtime are supported (`table-renderer.tsx:82-105`, `table-t28-dynamic-columns.test.tsx`), so a schema update toggling only `editable` returns `true` → row skips re-render → edit chrome stays stale.
- Fix: add `column.editable === nextColumn.editable` (or `Boolean` snapshot) + regression test.
- Review: retained P2 (manual; narrow trigger, self-heals on any unrelated re-render, one-line fix) → driver P1 (real defect, not polish).

[P1] **19-01 detail-view `applyCommitResult` rollback not in `finally` — exception path leaves committed writes in place while reporting "save failed"**

- Justification: verified state-leak defect with a misleading user-visible outcome.
- File: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:398-437` (consumed at `:497-509`); exception source confirmed at `form-runtime-validation.ts:446-455, 551-558` (validation errors are normalized then **rethrown**)
- Evidence: rollback only on the explicit `!settled` / `!draftValid` branches; if `applyCommittedWrites` or `settleParentValidation` throws, the exception reaches `handleConfirm().catch` → "保存失败" notify, but parent form/scope already contains the committed writes and `previousValues` is gone with the stack frame.
- Fix: wrap apply→validate→rollback in try/catch; rollback then re-throw.
- Review: retained P2 (manual) → driver P1.

[P1] **15-03 `table-virtual-body` has no `measureElement` — hardcoded 44/120px row estimates drift on wrapped content**

- Justification: real virtualization-fidelity degradation; same-repo precedents prove the intended pattern.
- File: `packages/flux-renderers-data/src/table-renderer/table-virtual-body.tsx:18, 110-126, 151-157, 224-231`; contrast `ai-message-list.tsx:141` (`ref={virtualizer.measureElement}`)
- Evidence: no `measureElement` anywhere; `estimateSize` fixed 44px (120 expanded); `ui/src/styles/table.css:17-19` sets only padding on `tbody td` — no fixed height/truncate, so wrapped rows exceed estimates and scroll spacers/padding rows drift. design.md's adjudicated virtual limitations (E1b combine, E1c tree) do not cover row measurement.
- Fix: attach `measureElement` (or enforce fixed row height + truncate in CSS).
- Review: retained P2 (manual) → driver P1.

[P1] **05-02 batch-bar `selection` is `undefined` when `selectionPath` missing → `selection.length` TypeError, contradicting its own "never throws" contract**

- Justification: verified crash path reachable in production (default compile does not run the schema validator); one-line fix.
- File: `packages/flux-renderers-data/src/batch-bar.tsx:25-26, 39-43, 45-52`; `flux-react/src/hooks.ts:117, 123`
- Evidence: comment promises "missing path … resolve to an empty array … never throws"; `enabled: selectionPath.length > 0` path returns `options?.fallback` = `undefined`; `selectionPath?: string` is type-optional; `runtime-factory.ts:269-270` compiles without validation options → `validateBatchBarSchema` not on the production path. Sibling implementations (`tabs.tsx:67-73`, `use-table-selection.ts:110`) null-guard; batch-bar alone crashes.
- Fix: `fallback: []` or `if (!selection || selection.length === 0)`.
- Review: retained P2 (manual; crash requires a non-conforming schema) → driver P1 (real defect + self-contradicted contract).

[P1] **06-02 `useKeyboardBindings`: `enabled=false` at mount never attaches the listener after flipping to true — public API assembly gap**

- Justification: verified contract defect on a public flux-react export (latent: current sole caller passes no `enabled`).
- File: `packages/flux-react/src/use-keyboard-bindings.ts:97-101, 192` (deps `[signature, surfaceState]`), `:54-60` (signature excludes `enabled`), `:25`; exported at `flux-react/src/index.tsx:133-137`
- Evidence: attach-time gate reads `enabled` once; dynamic off works via `optionsRef` (true→false fine); false→true never re-runs the effect since neither dep changes. API semantics are asymmetric (half ref-driven, half assembly-frozen).
- Fix: add `enabled` to effect deps, or decouple attach from `enabled` entirely.
- Review: retained P2 (manual, latent) → driver P1 (public-API contract defect).

### B. Contract drift / wiring

[P1] **15-02 link `blob:` download is dead while the inline comment and author docs promise it — silent "click does nothing"**

- Justification: verified contract self-contradiction with a user-visible failure symptom (G7-R2 author perspective).
- File: `packages/flux-renderers-content/src/link.tsx:29-34, 37-46, 70, 11`; `flux-core/src/utils/url.ts:14` (`SAFE_NAVIGATION_SCHEMES` has no `blob:`); author doc `content/src/schemas.ts:142` ("对 data:/blob: 同源导出链接必须设置 download")
- Evidence: `isSafeNavigationUrl` silently clears `blob:` hrefs, so the `download` passthrough is unreachable for blob:; the inline comment and the schema doc both instruct authors to use blob:+download — the documented path reproduces exactly the "no response" symptom the doc warns about. `data:` main export path works. Minor: `rel=' '` passes `length>0` without noopener top-up (browser implicit noopener makes real risk ~zero).
- Fix: allow `blob:` when `download` is set (or fix comment + docs to mandate `data:`); trim `rel` before judging.
- Review: retained P2 (manual; data: primary path intact) → driver P1 (contract drift, must fix).

[P1] **22-02 batch-bar × table local-selection ownership mismatch = bar silently never renders; docs omit the `selectionOwnership:'scope'` prerequisite**

- Justification: strong developer-misdirection contract drift on the primary table-host wiring path (reviewer live-verified).
- File: `packages/flux-renderers-data/src/batch-bar.tsx:39-52`; `schemas.ts:354-360`; `batch-bar-definition.ts:84-85`; `use-table-selection.ts:32, 271-274, 373-378, 413-419`; `renderer-interfaces.md:733-737`
- Evidence: table default is `selectionOwnership:'local'`; all three write branches skip the scope path under local. Docs at three places say only "bind the table's selectionStatePath" — never that the path only populates under `'scope'`. Result: author follows docs literally → bar never renders, indistinguishable from "nothing selected", zero diagnostics (the file's only warns cover countTemplate/clearTarget).
- Fix: add the prerequisite to schema/definition/interface docs; add a one-shot dev diagnostic distinguishing "path never written" from "empty selection".
- Review: retained P2 (manual) → driver P1.

[P1] **10-01 page renderer (layout renderer) hardcodes new slot layout classes — styling-contract regression vs pre-branch baseline**

- Justification: verified contract regression: page is explicitly a layout renderer (marker-only), and the new slots have no schema override channel.
- File: `packages/flux-renderers-basic/src/page.tsx:65, 265, 273` (`BREADCRUMB_ITEM_CLASS`, `page-heading` flex/gap-2, `page-extra` ml-auto/flex/gap-2); contract `styling-system.md:389, 399, 470`; `schemas.ts:60-64` (no per-slot className for the new slots)
- Evidence: diff confirms all three are branch-new; pre-branch header had structural slots without code-side layout classes; theme-tunable spacing can only come from package `@layer base` CSS + slot selectors, which don't cover the new slots.
- Fix: move layout classes to package-level `[data-slot="page-heading"]` CSS (or add per-slot className props); keep markers in code.
- Review: retained P2 (manual) → driver P1.

[P1] **10-02 command-palette drops `meta.className` — the only sibling in this delivery not merging consumer overrides**

- Justification: verified styling-contract gap ("Respect schema className"), inconsistent with 4 same-batch renderers.
- File: `command-palette.tsx:216, 404-409`; contrast `batch-bar.tsx:120`, `query-filter.tsx:31`, `result.tsx:65`, `link.tsx:76-79` (all `cn(..., props.meta.className)`)
- Fix: `className={cn('nop-command-palette', props.meta.className)}`.
- Review: retained P2 (manual) → driver P1.

### C. Accessibility (verified real gaps on new components)

[P1] **20-01 command-palette accessible name/description falls back to hardcoded English (`'Command Palette'` / `'Search for a command to run...'`)**

- Justification: real a11y/i18n defect: the same file localizes placeholder/emptyText via `t()` but lets the sr-only dialog name fall to English defaults; ui i18n channel + drawer/guard precedents exist.
- File: `command-palette.tsx:397-403`; `ui/src/components/ui/command.tsx:23-24, 38-41`; `ui/src/lib/i18n.ts`
- Fix: wire `CommandDialog` title/description defaults through ui `t()` (add `flux.command.*` keys) or pass localized props.
- Review: retained P2 (manual) → driver P1.

[P1] **20-02 `CommandEmpty` has no live-region semantics — "no results" is silent to screen readers**

- Justification: verified WCAG 4.1.3 gap; upstream cmdk 1.1.1 confirmed (`role="presentation"` only), wrapper-level fix is one attribute.
- File: `ui/src/components/ui/command.tsx:88-99` (consumed at `command-palette.tsx:445`)
- Fix: add `role="status"` (or wrap in `aria-live="polite"`) in the ui wrapper.
- Review: retained P2 (manual) → driver P1.

[P1] **20-03 batch-bar appearance/count changes have no aria-live announcement**

- Justification: real 4.1.3 gap on a new semantic component; the repo's own precedent (`kanban-board.tsx:573` sr-only aria-live) is not followed.
- File: `batch-bar.tsx:50-52` (null gate), `:116-148` (no aria-live/role=status anywhere)
- Fix: `role="status"` + `aria-live="polite"` on the bar (count as announced content).
- Review: retained P2 (manual) → driver P1.

[P1] **20-04 editable-cell: NativeSelect editor lacks `aria-invalid`; error span lacks `aria-describedby` association**

- Justification: real 4.1.2/3.3.1 inconsistency inside one component (Input has `aria-invalid`, select does not).
- File: `table-editable-cell.tsx:459-476` (select branch), `:485` (input branch), `:513-521` (error `role="alert"` span, no id)
- Fix: stable id on the error span; both editors get `aria-invalid` + `aria-describedby`.
- Review: retained P2 (manual, refocused: alert already announces once; the durable gaps are select aria-invalid + describedby) → driver P1.

[P1] **20-05 table-column-settings inline disclosure: no `aria-expanded`/`aria-controls` (overlay DropdownMenu form is fine)**

- Justification: real 4.1.2 state-exposure gap on a user-facing table control (inherited from pre-split code, still live).
- File: `table-column-settings.tsx:163-173` (overlay ok), `:176-191` (inline: bare useState + conditional div)
- Fix: `aria-expanded` + `aria-controls` with panel id; Esc-close is an optional附注, not the grading basis.
- Review: retained P2 (manual) → driver P1.

[P1] **20-07 kanban WIP over-limit signaled by color only — no text/ARIA channel for the warning state**

- Justification: real 1.3.1/4.1.x semantic gap, distinct from the registered hardcoded-literal-color exemptions (which cover token governance, not the missing non-color channel).
- File: `kanban-column-header.tsx:131-136` (badge identical text in both states), `kanban-column.tsx:227` (third red channel)
- Fix: sr-only suffix (`t('scheduling.kanban.wipExceeded')`) or aria-label/data-warning channel.
- Review: retained P2 (manual) → driver P1.

[P1] **20-10 result renderer status semantics never reach the a11y tree — icons `aria-hidden`, `data-status` invisible to AT, title optional**

- Justification: real gap: the component's core semantic output (success/error/warning) is imperceptible to AT users in legal configurations (status-only).
- File: `result.tsx:24-31, 57-77` (`:47,78` confirms title is an optional slot)
- Fix: sr-only status words (`flux.result.status*` keys) or `role="status"` on the section.
- Review: retained P2 (manual) → driver P1.

### D. Test protection

[P1] **23-01 command-palette `item.action` dispatch channel has zero assertions — documented public branch can be deleted with all tests green**

- Justification: verified absent-test-for-changed-behavior; the landing commit claimed this coverage ("item action execution dual-track … 31 red-first unit tests") but no test observes the branch anywhere (unit or e2e).
- File: `packages/flux-renderers-basic/src/__tests__/command-palette-items-execute.test.tsx:301-340` (default stub fetcher from `test-support.tsx:7-12`); target branch `command-palette.tsx:288-299` — reviewer traced assertion-by-assertion: deleting :291-299 keeps every test green; e2e has zero command-palette coverage.
- Fix: inject a fetcher spy and assert `url === '/r/Executed?id=nav'` (proves `${id}` resolution); lock close-then-dispatch ordering via call-order if it is contract.
- Review: retained P1 (strongest P0 candidate under the driver's literal wording — kept P1 because live behavior is correct and the defect is purely test protection; flagged for main-reviewer awareness).

[P1] **23-02 command-palette "skipped no-op" open test has zero discriminating power over the documented skip contract**

- Justification: verified test defect: title promises to lock a v1 public contract (`{ok,skipped:true}`), yet the assertions cannot distinguish skip from unconditional re-open, and re-dispatched `onOpen`/statusPath are unobservable in the test.
- File: `command-palette.test.tsx:174-197`; contract `command-palette.tsx:176-182`, `surface-renderer-definitions.ts:135`
- Fix: assert onOpen dispatch count (setValue probe) or statusPath publish-once.
- Review: retained P2 (manual, "test hardening, no product defect") → driver P1 (documented public contract with no discriminating protection).

---

## P2 findings (verified real; polish/hygiene — record-only, no remediation plan warranted)

[P2] **05-01 batch-bar `useScopeSelector` without `paths` — whole-scope notification granularity** — `batch-bar.tsx:39-43`, `hook-subscriptions.ts:222-230`. Justification: facts verified (no per-path gating; sibling hooks all pass `paths`) but equality function guarantees zero re-renders (`use-sync-external-store-with-selector.ts:91-94`); cost is one microsecond-scale selector re-run per scope write. Subscription-hygiene alignment only.

[P2] **07-01 handwritten useMemo/useCallback in new modules (React Compiler baseline)** — `use-keyboard-bindings.ts:52-90` (6), `keyboard.tsx:29-105` (2), `command-palette.tsx:160-205` (1), `use-table-grouping.ts` (4), `use-table-selection.ts` (4 useCallback + 7 useMemo), `dirty-close-guard.tsx:39-54` (3). Justification: real per repo skill doc ("标记为冗余，建议移除… 不影响正确性，只是代码风格收敛"); reviewer corrections: 3 of the listed files are pre-existing (drawer/detail-field are stock shadcn/存量 renderer — dropped from scope); legitimate exceptions kept (`table-virtual-body.tsx:109` has the incompatible-library disable). Batch style-convergence item only.

[P2] **09-01 result `status` propContract registered as open `string` instead of closed union** — `content-renderer-definitions.ts:113-128`. Justification: reviewer overturned the initial "violates plan-462 MUST" premise — the discipline text (`renderer-runtime.md:497,501`) mandates _registration_ (satisfied; `check:schema-prop-coverage` 100% green); union is a canonical template, not a mandate. Residual is same-batch inconsistency (kanban uses union) + forfeited compile-time typo catching. Alignment item.

[P2] **09-02 result.tsx module-level `warnedStatuses` Set + unconditional prod warn, drifting from its own "dev warning" description** — `result.tsx:15, 39-44`; contrast `keyboard.tsx:66-69` (isDevRuntime). Justification: verified but bounded (Set-dedup, per distinct bad value once), no functional impact; diagnostic hygiene + description drift.

[P2] **13-01 keyboard matching limits: `event.key`-based matching (shift+digit/punctuation never fires silently; non-Latin layouts miss), `+` unbindable (fail-safe + dev warn), no `event.repeat` filter in chords** — `keyboard.ts:22-24, 88-100, 80-86`; `use-keyboard-bindings.ts:148-152`. Justification: reviewer verified `event.key` comparison is the _documented current contract_ (`renderer-interfaces.md:609-611` "implemented and verified"), and `+` rejection has a dev diagnostic (`keyboard.tsx:43-47`). Remaining value: author-side diagnostics/docs for silent non-match; doc improvement item.

[P2] **13-04 unnecessary `(column as unknown as Record<string, unknown>).editable` double assertion** — `data-schema-validation.ts:160-176`; `schemas.ts:97, 149`; `table-schema-validation.ts:11` accepts `unknown`. Justification: verified type-hygiene only (direct `column.editable` is type-identical post-guard), zero runtime impact.

[P2] **15-01 `warnOnce` has no dev gate; two editable-cell `gd-*` warns fire in production** — `warn-once.ts:4-10`; `table-editable-cell.tsx:37-43, 50-56` (reached unconditionally at render); contrast `table-body-row-rendering.tsx:432`, `use-table-grouping.ts:55-58` (gated). Justification: verified same-package policy inconsistency; impact is prod console noise only. (Reviewer note: `pivot-renderer.tsx:26-41` local warnOnce is also ungated repo-wide.)

[P2] **19-02 keyboard.tsx `when` gate `catch { return false }` swallows evaluation errors with zero observability** — `keyboard.tsx:94-102`; the file's own `warnOnce` (:79-85) and dispatched-failure warn (:121-131) set the standard one screen away. Justification: fail-closed semantics correct; one-line dev-warn fix.

[P2] **19-03 batch-bar `handleClear` discards capability `invoke` results via `void`** — `batch-bar.tsx:97, 102`; `component-handle-core.ts:38-42`. Justification: contract-hygiene only — reviewer verified both real targets (`crud-renderer-state.ts:347-349`, `use-table-handle.ts:51-55`) are synchronous and always `{ok:true}`; the failure scenario is currently unreachable. Add ok:false warn for future-proofing.

[P2] **23-03 keyboard.test.ts:206 title/assertion mismatch ("keeps unrelated progress alive" vs `{status:'idle'}`)** — verified: idle is the correct behavior (manual trace of `keyboard.ts:209-217`), inline comment self-corrects; missing positive "filter keeps gated-out binding alive" case. Title fix + one positive test.

[P2] **23-04 button disabled-anchor test's `onClick` spy is never wired — `not.toHaveBeenCalled()` is vacuously true** — `button-primary-and-anchor-disabled.test.tsx:61, 74, 93, 96`; the three load-bearing assertions (href removal / aria-disabled / pointer-events) are valid. Two dead lines; wire or delete.

[P2] **14-01 `resetWarnedKeysForTests()` is dead code (zero callers); "warned exactly once" assertions implicitly depend on in-file ordering** — `warn-once.ts:12-14`; forks pool isolates cross-file, so no current flake. Delete or call it in beforeEach.

[P2] **14-02 `expandableWhen` evaluation-exception degrade path (catch → expandable) has no test** — `table-row-leading-cells.tsx:69-77` (explicit design comment), `table-expandable-when.test.tsx` covers only falsy/absent. Benign fail-open; ~3-line test.

[P2] **14-04 console.warn spy `mockRestore` not in `finally`; no global `restoreMocks`** — `batch-bar.test.tsx:125-151`, `table-group-render.test.tsx:190-207`; `vitest.shared.ts:24-36`. Leak only occurs when the suite is already red (diagnosability, not false-green). Copy the `keyboard-bindings.test.tsx:172-178` try/finally pattern.

[P2] **20-06 editable-cell navigation-state span focusable without role (explicitly documented tradeoff)** — `table-editable-cell.tsx:431-454` (`:433` comment; eslint-disable inline); `renderer-interfaces.md:948-952` Decision 6 "landed leg" adjudicates Enter/F2 semantics. Justification: keyboard fully reachable, no wrong semantics announced; role-hint polish only.

[P2] **20-09 hotkey surfaces have no `aria-keyshortcuts` anchor (advisory)** — `keyboard.tsx:149-156` (zero-DOM is the _documented_ contract, `renderer-interfaces.md:635-636`), `command-palette.tsx:331-365` (closed palette renders no anchor structurally). Justification: no WCAG SC requires hotkey discoverability; half the ask would violate the documented zero-DOM design. Observation only.

### P2 observations (from audit agents, sub-finding grade)

- [P2] `flux-react/src/defaults.ts:16-28` — default fetcher's `/api/` if-branch returns identical values on both sides (dead condition) + misaligned indentation vs `:19/:25`. `status: 0` success semantics intentionally align with `request-runtime.ts:431`; cleanup only.
- [P2] (watch item, no case opened) `find-ui-consistency-gaps.mjs` CJK rule's line-level `description:`/`defaultValue` filters are line-granularity heuristics; live-tree probe found no suppressed user-facing CJK copy today. Keep under observation if the gate evolves.
- [P2] (process note) plan→export-surface traceability: two of the branch's index-export changes (`option-row` → plan 1333-2, ui `dirty-close-guard` → plan 0419-1) were covered by plans _outside_ the mission's enumerated plan list. All changes were covered, but future audits should reverse-map from actual index diffs rather than a hand-listed plan set.

---

## Rejected findings (initial-audit candidates overturned by independent review — do not remediate)

| ID    | Initial claim (P2)                                                                           | Rejection basis (live evidence)                                                                                                                                                                                                                                                                                                                                |
| ----- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 09-03 | tabs closable ✕ is `aria-hidden` + unclickable-by-keyboard → keyboard users can't close tabs | Owner contract `renderer-interfaces.md:801-805` adjudicates verbatim: mouse affordance kept `aria-hidden` _so roving tabindex stays intact_; keyboard/programmatic close runs through the `removeTab` handle (`tabs-view-management.ts:221-230`). Add/close asymmetry is structural (close lives _inside_ the trigger button).                                 |
| 22-03 | command-palette source failure renders indistinguishably from empty results                  | Contract `renderer-interfaces.md:426-428` explicitly adjudicates "loading/empty/error degrades to the empty state (`palette-empty`)"; `sourceStateKey`'s role is guaranteeing re-render, never differentiated display. Enhancement proposal at most.                                                                                                           |
| 20-08 | J/K pointer moves only a visual marker, not focus, no announcement                           | Adjudicated design: `renderer-interfaces.md:388-401` documents "focus-management frameworks are out of scope (G-B2)" with full `aria-selected` output; owner plan 2312-1 (`:238, :280`) locked it red-first. Reviewer also disproved the kanban counter-example (no roving `.focus()` in `kanban-board.tsx`; kanban uses sr-only aria-live).                   |
| 14-03 | keyboard selection / inline cell edit / tabs view mgmt / keyboard renderer lack e2e          | Plans declare unit-test tier explicitly (`2026-08-31-0721-1:17` "先红后绿单测锁定"), specs contain落字 adjudications (notion spec `:9, :382`), mod+k open is unit-covered (`command-palette.test.tsx:351-378`), branch claims no e2e coverage. No broken claim → not a defect. (Enhancement backlog candidate: mod+k + ArrowDown/Enter e2e in linear replica.) |

---

## Cross-dimension patterns

1. **In-flight / assembly gating gaps in fresh interaction code** (22-01, 06-01, 06-02): three independent verified defects where a gate that exists in sibling code is missing in new code. Suggest a check candidate: "async-saving / pointer-drag listener" hygiene lint for new interactive components.
2. **Capability-channel write paths lack the guards their siblings have** (22-05, 13-03): `addTab` is the only unguarded tabs mutation and uses non-functional updates. Pattern: programmatic capability invocation bypasses the per-event re-render safety humans get.
3. **Diagnostics policy inconsistency inside single packages** (09-02, 15-01, 19-02, 19-03): dev-gate usage is mixed within the same files/packages; centralizing `warnOnce` + `isDevRuntime()` inside the helper would resolve four findings at once.
4. **a11y cluster on new semantic components** (20-01/02/03/04/05/07/10): all fixes are small, localized, and have in-repo precedents (kanban sr-only aria-live, ui i18n channel). Natural single batch-fix plan.
5. **Contract-doc quality is high and adjudication-dense**: 4 of 43 candidates died against verbatim contract text. Counter-side: 3 P1s are themselves doc-vs-code drifts (22-02, 15-02, 10-01/10-02 vs styling contract), so doc coverage is uneven in the _new_ component areas.

## Verification baseline (executed during audit, all green)

`pnpm check` (exit 0, exemptions = registered baselines), `pnpm lint` (37/37), `pnpm typecheck` (37/37), `pnpm build` (0), six `check:audit-*` suspect scans (exit 0; outputs consumed and re-verified — one mission-scope suspect `batch-bar.tsx:39` adjudicated as finding 05-01). No command failures observed; per AGENTS.md this audit is research-only and did not modify code.

## Audit trail

- Phase 1 (initial): 6 parallel explore agents, 1 round each, 43 candidates.
- Phase 2 (review): 6 independent explore agents — 3 P1 item-by-item (all retained, 2 with narrowed/corrected sub-claims), 40 P2 batch-reviewed item-by-item (20 retained, 16 downgraded, 4 rejected). Every verdict cites reviewer-read live code with line numbers; review agents ran with fresh context and did not receive initial-audit conclusions as facts.
- Deep-dig round 2: not dispatched (value convergence — initial rounds self-rejected 10+ misfires and covered blind-spot probes; see per-cluster outputs referenced in session logs ses_fa8843578ffe / fa884a3e9ffe / fa8859644ffe / fa8850ce8ffe / fa886058bffe / fa88673b7ffe for phase 1; ses_fa87480bbffe / fa8740b9fffe / fa873a71effe / fa8731d51ffe / fa872c5faffe / fa87231a8ffe for phase 2).

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
