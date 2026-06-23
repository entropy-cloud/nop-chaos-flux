# Mobile Design-Doc Reconciliation Plan

> Plan Status: active
> Last Reviewed: 2026-06-23
> Source: `docs/audits/2026-06-23-1824-multi-audit-mobile.md` (MM-17, MM-18, MM-19, MM-20, MM-21)
> Related: `docs/plans/2026-06-23-2235-1-mobile-runtime-correctness-and-test-rigor-plan.md` (sibling — runtime correctness; same package, independent closure surface), `docs/plans/2026-06-23-2031-1-mobile-reaudit-2-remediation-owner-plan.md` (sibling — covers MM-09 notice-bar marquee formula doc sync in its Phase 2)
> Execution Order: {2}

## Purpose

Close the 5 retained **design.md ↔ code contract drift** findings from the 2026-06-23 18:24 multi-audit that are NOT already owned by sibling plans. The open audit's "Overall assessment direction #2" identifies the root cause: `docs/components/*/design.md §6` (and sibling implementation-spec sections) were written aspirationally during design and never reconciled when the implementation shipped a simpler version. §6 is the section authors and auditors trust most as "the implementation contract" — it is the wrong section to let drift.

Each finding is a `Decision`: for every drift, decide whether the code converges to the doc (implement the documented capability) or the doc converges to the code (honestly describe what ships). The closure surface is uniform across all 5 — "no design.md promises behavior the code does not deliver" — and they share one verification path (read design.md ↔ read code ↔ confirm consistency). Per Plan Guide Rules 22-26 they bundle into one owner plan with one phase per finding (or grouped where the decisions interact).

This plan is sequenced AFTER sibling `2026-06-23-2235-1` because two findings (MM-19, MM-20) may select the "implement" option, which touches `infinite-scroll.tsx` effects that `2026-06-23-2235-1` Phase 3 also touches (the StrictMode guard at `:59-62,118-126`). The justification is git-conflict avoidance, not architectural dependency — MM-20's IO-root auto-detect (the observer setup at `:88-110`) and MM-16's guard-reset (the `:59-62,118-126` effects) are architecturally independent (different effects, different concerns); sequencing just keeps the two PRs from editing overlapping hunks.

## Current Baseline

Sibling plans `2026-06-23-2031-1` (MM-07..MM-13 + OA-18..OA-20) and `2026-06-23-2235-1` (MM-14..MM-16, MM-22..MM-25, OA-21, OA-22) are `draft`/`active` but not yet landed. The 5 findings below are re-verified present at their anchors in the 18:24 audit; none is owned by either sibling.

- **MM-17** doc `docs/components/notice-bar/design.md:38,58,79` vs code `schemas.ts:103` + `notice-bar.tsx:41-42` + `mobile-renderer-definitions.ts:107-118`: doc §3 lists two regions (`body`, `icon`) and §4 types `icon?: IconSchema`; the schema has no `body` field (`icon?: string` at `schemas.ts:103`), `icon` is a `kind:'prop'` at `:114`, and `notice-bar.tsx:41-42` resolves `icon` as a lucide-name lookup via `resolveLucideIconStrict`. A host passing `body: [...]` or `{ icon: { type:'icon', name:'megaphone' } }` gets a silent no-op. `design.md` is self-inconsistent (§3 lists a region; §4 schema omits the field).
- **MM-18** doc `docs/components/notice-bar/design.md:119` vs code `styles.css:24-31`: doc §6 says variant colors "走主题 token"; the code comment (already corrected by NEW-MM-06) states the stylesheet "does NOT derive from shared theme tokens; it publishes its own fixed palette + `--nop-notice-bar-*` override variables". The two source-of-truth artifacts disagree — only the code side was corrected.
- **MM-19** doc `docs/components/infinite-scroll/design.md:101-102` vs code `infinite-scroll.tsx:88-91`: doc §4 promises an IntersectionObserver fallback ("fallback：滚动容器 `scrollHeight - scrollTop - clientHeight < distance` 判断"); the implementation early-returns when `IntersectionObserver === 'undefined'` with no scroll listener, so auto-load silently no-ops in IO-less environments.
- **MM-20** doc `docs/components/infinite-scroll/design.md:121` vs code `infinite-scroll.tsx:93-110`: doc §5 promises "自动检测最近的可滚动父容器" as the IO `root`; the implementation never passes `root`, so IO always observes viewport intersection. A list inside an inner scrollable `<div>` (the dominant mobile list pattern) will not fire `onLoadMore` when its own scrollable ancestor reaches the bottom.
- **MM-21** doc `docs/components/pull-refresh/design.md:94` vs code `pull-refresh.tsx:212`: doc §5 specifies `transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`; code emits `` `transform ${animationDuration}ms ease` ``. Duration matches (300ms default); easing differs. `swipe-cell.tsx:11` correctly uses the documented curve — only pull-refresh drifted.

## Goals

- End the §6-was-aspirational disease for these 5 findings: every reconciled design.md section states the final design state (Rule 14 — no "Proposed vs Current"), and either matches the code as-is or is matched by a code change made in this plan.
- For MM-17: make `notice-bar/design.md` honestly describe the `icon: string` (lucide name) prop and the absence of a `body`/`icon` region — OR, if a real `body` region is product-valued, add it to schema + definitions + renderer.
- For MM-18: align `notice-bar/design.md §6` with the NEW-MM-06 code comment (package-local fixed palette + `--nop-notice-bar-*` override knobs; does NOT derive from shared theme tokens).
- For MM-19 + MM-20: decide, per finding, whether `infinite-scroll` implements the documented capability (scroll-math fallback; scrollable-parent IO root) or the doc converges to an honest "viewport-only / requires IntersectionObserver" precondition.
- For MM-21: converge `pull-refresh.tsx:212` to the documented `cubic-bezier(0.25, 0.46, 0.45, 0.94)` (aligning with `swipe-cell.tsx:11`), OR update the doc to honestly specify `ease`. Default: fix the code (one-line change, no behavior risk, restores within-package consistency).

## Non-Goals

- Do NOT touch findings owned by sibling `2026-06-23-2031-1` (MM-09 notice-bar marquee formula — already a doc-sync item in its Phase 2) or `2026-06-23-2235-1` (MM-22 countdown §6 rAF, OA-22 notice-bar direction).
- Do NOT retroactively rewrite `docs/architecture/` or completed prior plans.
- Do NOT redesign the `infinite-scroll` IO contract beyond what MM-19/MM-20 require (no new props; if the scrollable-parent auto-detect is implemented, it walks the DOM at observe time, not via a new schema field).
- Do NOT add a `body` region to `notice-bar` unless the MM-17 Decision explicitly selects "implement the region" with product justification — the default is "correct the doc".
- Do NOT change `styles.css` for MM-18 — the code comment is already correct; only the doc lags.

## Scope

### In Scope

- `docs/components/notice-bar/design.md` (MM-17, MM-18)
- `docs/components/infinite-scroll/design.md` (MM-19, MM-20)
- `docs/components/pull-refresh/design.md` (MM-21 doc side, if Decision selects "fix doc")
- `packages/flux-renderers-mobile/src/pull-refresh.tsx:212` (MM-21 code side, if Decision selects "fix code" — default)
- `packages/flux-renderers-mobile/src/infinite-scroll.tsx` (MM-19, MM-20 code side, only if Decision selects "implement")
- `packages/flux-renderers-mobile/src/schemas.ts` + `mobile-renderer-definitions.ts` + `notice-bar.tsx` (MM-17 code side, only if Decision selects "implement body region")
- Test files: `pull-refresh.test.tsx`, `infinite-scroll.test.tsx` (proofs for any code-side Decision)

### Out Of Scope

- The runtime-correctness fixes in sibling `2026-06-23-2235-1` (countdown, notice-bar carousel timer, infinite-scroll StrictMode guard, retry button) — different closure surface (runtime behavior + tests).
- The geometry/a11y fixes in sibling `2026-06-23-2031-1` (OA-18 rebound, MM-10 stale comment) — different closure surface.
- The countdown §6 reconciliation (MM-22/OA-21) — owned by sibling `2026-06-23-2235-1` Phase 1.
- The notice-bar marquee formula (MM-09/OA-23) — owned by sibling `2026-06-23-2031-1` Phase 2.

## Failure Paths

> This plan is predominantly a doc-reconciliation plan; most Decisions select "fix the doc". For the two findings that may select "implement" (MM-19, MM-20), the failure paths below apply only if that option is chosen.

| Scenario id                                                              | Trigger                                                                    | Behavior                                                                                                                                  | Retryable                       | User-visible                                                    |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------- |
| `infinite-scroll-io-less-env` (only if MM-19 implements fallback)        | `IntersectionObserver === 'undefined'` (legacy browser / embedded webview) | Scroll-math fallback attaches a `scroll` listener to nearest scrollable ancestor; `onLoadMore` fires when within `distance` of the bottom | Host may retry via retry button | List loads more pages instead of sticking on page one           |
| `infinite-scroll-nested-scroller` (only if MM-20 implements auto-detect) | List mounted inside an inner scrollable `<div>`                            | IO `root` set to the nearest `overflow-y: auto/scroll` ancestor; `onLoadMore` fires when the sentinel intersects within that scroller     | Host may retry via retry button | Nested-scroll list loads more when its own scroller bottoms out |

## Test Strategy

档位选择：`建议有测`

本档选择：**建议有测**

Rationale: the default closure for each finding is a doc edit (no behavior change) — the AGENTS.md Test Strategy Tier table puts pure-doc work in "不适用". However, MM-21 (pull-refresh easing) defaults to a one-line code change, and MM-19/MM-20 may select "implement" which adds real behavior. Those code-side Decisions carry a Proof in-Phase (a focused assertion that the documented easing/scroll-math/root-detection holds). The doc-only Decisions need no test — closure verifies doc↔code consistency by reading both.

## Execution Plan

### Phase 1 - Notice-bar doc honesty: icon type + phantom regions + theme-token claim (MM-17, MM-18)

Status: planned
Targets: `docs/components/notice-bar/design.md`, `packages/flux-renderers-mobile/src/schemas.ts`, `mobile-renderer-definitions.ts`, `notice-bar.tsx`

- Item Types: `Decision`, `Fix`

- [ ] **Decision (MM-17 regions/icon)**: Decide whether `notice-bar` should have a real `body` region and an `IconSchema`-typed `icon`. Default recommendation (lowest churn, code already ships the simpler contract): **correct the doc** — delete the phantom `body`/`icon` region claim at `design.md:38,79`; change `design.md:58` `icon?: IconSchema` → `icon?: string` (lucide icon name resolved via `resolveLucideIconStrict`); add a one-sentence note that custom body content is not supported (use `text` or a wrapper renderer). Alternative (only if product wants custom body): add `body` to `schemas.ts` + a `{ key: 'body', kind: 'region' }` entry to `mobile-renderer-definitions.ts` + render `props.regions.body?.render()` in `notice-bar.tsx`. Record the Decision.
- [ ] **Fix (MM-17 doc)**: Apply the chosen doc edit to `design.md §2 决策表:27-28` (the `body`/`icon` rows), `§3:38`, `§4:58`, and the `字段分类` list at `:77-80` so all four sections are mutually consistent (no region listed that the schema lacks; no `IconSchema` type the code doesn't accept). Per Rule 14, write only the final design state.
- [ ] **Fix (MM-17 code, only if Decision selected "implement body")**: Add the `body` region to schema/definitions/renderer and a focused test that `body: [...]` content renders. Skip if Decision was "correct the doc".
- [ ] **Decision (MM-18 theme-token)**: No real decision — the code comment (NEW-MM-06) is already correct; only the doc lags. The doc MUST converge to the code (the stylesheet does NOT derive from shared theme tokens; that is an intentional v1 design choice for standalone usage). Record this as a `Decision` confirming "fix doc, not code".
- [ ] **Fix (MM-18 doc)**: Rewrite `design.md §6:119` to match the NEW-MM-06 code comment: "变体配色使用包内固定 hsl 字面量 + 公开 `--nop-notice-bar-*` override 变量（**不**派生自共享主题 token；NEW-MM-06 修正）。独立使用（无 host theme）仍可渲染；需要品牌色的 host 在 `:root` 或 wrapper 上 override 这些变量。" Per Rule 14, write only the final design state.

Exit Criteria:

> Owner-doc (`notice-bar/design.md`) genuinely changes here — both MM-17 and MM-18 are doc obligations. Per Rule 17 they belong in this Phase's Exit Criteria.

- [ ] `notice-bar/design.md §2/§3/§4/§5` no longer list a `body`/`icon` region the schema lacks, and `icon` is typed as `string` (lucide name) matching `schemas.ts:103` — OR, if the Decision selected "implement body", the region exists in schema + definitions + renderer and a focused test renders it.
- [ ] `notice-bar/design.md §6:119` matches the NEW-MM-06 code comment (fixed hsl palette + `--nop-notice-bar-*` override knobs; does NOT derive from shared theme tokens); doc↔code disagreement resolved.
- [ ] If MM-17 added a code-side region: `pnpm --filter @nop-chaos/flux-renderers-mobile test` passes for the notice-bar suite (focused check). If doc-only: no test required.

### Phase 2 - Infinite-scroll doc honesty: IO fallback + scrollable-parent root (MM-19, MM-20)

Status: planned
Targets: `docs/components/infinite-scroll/design.md`, `packages/flux-renderers-mobile/src/infinite-scroll.tsx`

- Item Types: `Decision`, `Fix`, `Proof` (only if a code-side Decision is selected)

- [ ] **Decision (MM-19 IO fallback)**: Decide whether to implement the documented scroll-math fallback or correct the doc. Context: nested-scroll is the dominant mobile list pattern, but IO-less environments are increasingly rare (all evergreen browsers ship IO). Default recommendation: **correct the doc** — delete the `:102` fallback line and add an explicit precondition to §4/§5 ("requires `IntersectionObserver`; environments without IO will not auto-load — host must wire a manual retry path"). Alternative (if product targets legacy webviews): implement the scroll listener on the nearest scrollable ancestor (reuses the MM-20 ancestor-detection logic if both select "implement"). Record the Decision.
- [ ] **Decision (MM-20 scrollable-parent root)**: Decide whether to implement auto-detect or correct the doc. Context: nested-scroll is the dominant mobile list pattern (page header + scrollable list + footer), so the documented capability has real product value. Default recommendation: **implement** — walk up the DOM from the sentinel to the first `overflow-y: auto/scroll` ancestor and pass it as IO `root`; fall back to viewport (current behavior) if none found. This is a small, well-contained change that delivers the documented contract. Alternative (lowest churn): correct `design.md §5:121` to "viewport-only; for nested scrollers wrap the list so the viewport is the scroller". Record the Decision.
- [ ] **Fix (MM-19 doc, if "correct doc")**: Delete the `:102` fallback line in `design.md §4`; add the IO precondition. Per Rule 14, write only the final design state.
- [ ] **Fix (MM-20 code, if "implement")**: In `infinite-scroll.tsx:88-110`, before constructing the observer, walk up from `sentinelRef.current` to the first ancestor with `getComputedStyle(ancestor).overflowY` matching `auto`/`scroll`; pass it as `{ root: scrollableAncestor, rootMargin: ... }` to `IntersectionObserver`; if none, omit `root` (viewport, current behavior). Reuse the helper for MM-19 if both selected "implement".
- [ ] **Proof (MM-20, if "implement")**: Add a test that mounts `infinite-scroll` inside a scrollable `<div>` (fixed height, content overflowing), scrolls the inner div to the bottom, and asserts `onLoadMore` fires. Must FAIL against current `main`.
- [ ] **Fix (MM-20 doc, if "implement")**: Update `design.md §5:121` to describe the implemented auto-detect (walk to nearest `overflow-y: auto/scroll` ancestor; viewport fallback) — keep the row but make it accurate. Per Rule 14, write only the final design state.
- [ ] **Fix (MM-20 doc, if "correct doc")**: Delete/rewrite the `:121` row to "viewport-only; nested scrollers require the host to wrap appropriately".

Exit Criteria:

> Owner-doc (`infinite-scroll/design.md`) changes here regardless of which option is chosen (the current rows are inaccurate either way). Per Rule 17 the doc obligation is listed.

- [ ] `infinite-scroll/design.md §4:101-102` (IO fallback) and `§5:121` (scrollable-parent root) match the implemented behavior — either the capability is real (with a focused test for MM-20's auto-detect) or the doc honestly states the precondition/limitation.
- [ ] If MM-20 selected "implement": a nested-scroller regression test proves `onLoadMore` fires when the inner scroller bottoms out, failing without the auto-detect.
- [ ] If any code-side option was chosen: `pnpm --filter @nop-chaos/flux-renderers-mobile test` passes for the infinite-scroll suite (focused check).

### Phase 3 - Pull-refresh easing convergence (MM-21)

Status: planned
Targets: `packages/flux-renderers-mobile/src/pull-refresh.tsx:212`, `docs/components/pull-refresh/design.md:94`

- Item Types: `Decision`, `Fix`, `Proof`

- [ ] **Decision (MM-21 easing)**: Decide convergence direction. Default recommendation: **fix the code** — replace `ease` with `cubic-bezier(0.25, 0.46, 0.45, 0.94)` at `pull-refresh.tsx:212` to match the documented contract AND align with `swipe-cell.tsx:11` (within-package consistency; one-line change; no behavior risk — the curve is a standard `ease-out` variant very close to `ease`). Alternative: update `design.md §5:94` to specify `ease` and add a note that swipe-cell intentionally uses a different curve. Record the Decision; default to "fix the code".
- [ ] **Fix (MM-21 code, default)**: Replace `ease` with `cubic-bezier(0.25, 0.46, 0.45, 0.94)` at `pull-refresh.tsx:212` (`transition: state.isTouching ? 'none' : \`transform ${animationDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)\``).
- [ ] **Proof (MM-21)**: Add (or extend) a `pull-refresh.test.tsx` assertion that the resting `transition` style contains `cubic-bezier(0.25, 0.46, 0.45, 0.94)` (not `ease`). Use the existing inline-style assertion pattern from sibling 2031-1's OA-18 geometry suite.
- [ ] **Fix (MM-21 doc, only if Decision selected "fix doc")**: Update `design.md §5:94` to `transition: transform ${animationDuration}ms ease`. Skip if Decision was "fix the code" (doc already matches).

Exit Criteria:

- [ ] `pull-refresh.tsx:212` resting transition uses `cubic-bezier(0.25, 0.46, 0.45, 0.94)` (matching `design.md §5:94` and `swipe-cell.tsx:11`) — OR, if Decision selected "fix doc", `design.md §5:94` specifies `ease` and the code is unchanged; doc↔code consistent either way.
- [ ] A test asserts the chosen easing value in the resting `transition` style.
- [ ] `pnpm --filter @nop-chaos/flux-renderers-mobile test` passes for the pull-refresh suite (focused check).

## Draft Review Record

> Reviewed by an independent sub-agent (fresh session, not the authoring session) per the Plan Review Rule.

- Reviewer / Agent: independent general sub-agent, fresh session (task `ses_10b12afd9ffeTbJGhYghhnDrSt`)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor (addressed): MM-17 Fix item enumerated only §3 (`:38`), §4 (`:58`), 字段分类 (`:77-80`) but omitted §2 决策表 rows at `:27-28` which also claim `body`/`icon` → extended the Fix item and Exit Criterion to cover §2/§3/§4/§5 (all four sections now reconciled).
  - Reviewer re-verified every cited `file:line` against the live repo (notice-bar/design.md regions + IconSchema + theme-token; infinite-scroll/design.md IO fallback + scrollable-parent; pull-refresh/design.md easing; schemas.ts icon type; mobile-renderer-definitions.ts notice-bar fields; notice-bar.tsx icon resolution; infinite-scroll.tsx IO setup; pull-refresh.tsx:212 ease; styles.css NEW-MM-06 comment; swipe-cell.tsx:11 cubic-bezier). All accurate.
  - Reviewer confirmed the sequencing rationale (`Execution Order: {2}` after sibling 2235-1) is sound for conflict avoidance, and corrected the justification: MM-20's IO-root auto-detect is architecturally independent of MM-16's guard-reset (different effects), so the real reason is git-conflict avoidance, not "builds on the guard pattern" — the plan text's sequencing note stands on conflict-avoidance grounds.
  - Reviewer confirmed the Closure-Gate conditional (code-side → run 4 pnpm gates; doc-only → omit per 纯文档计划 rule) is consistent with the guide and does not dodge verification when MM-21/MM-20 defaults are chosen.
  - Reviewer confirmed `建议有测` tier is honestly justified (doc-only Decisions need no test; MM-21 default + MM-20 default are code-side with in-Phase Proofs).
  - Reviewer confirmed zero Blockers, zero Majors, zero scope overlap with siblings 2031-1 (MM-09) and 2235-1 (MM-22, OA-22).

## Closure Gates

> Full-repo verification runs once here (Plan Guide Rule 18). Phase Exit Criteria carry only focused per-package checks. Owner-doc consistency is checked here per Rule 17 / When-Closing step 4.

- [ ] MM-17: `notice-bar/design.md §3/§4/§5` no longer list phantom `body`/`icon` regions and types `icon` as `string` (lucide name) — OR a real `body` region exists in schema/definitions/renderer with a focused test.
- [ ] MM-18: `notice-bar/design.md §6` matches the NEW-MM-06 code comment (fixed hsl palette + override knobs; NOT shared-theme-token derived).
- [ ] MM-19: `infinite-scroll/design.md §4` either implements the IO fallback or honestly states the IO precondition.
- [ ] MM-20: `infinite-scroll/design.md §5` either implements scrollable-parent auto-detect (with focused test) or honestly states viewport-only behavior.
- [ ] MM-21: `pull-refresh.tsx:212` easing matches `design.md §5:94` (default: code converges to `cubic-bezier(...)`); a test asserts the chosen easing.
- [ ] No in-scope confirmed doc↔code drift remains silently unaddressed (each Decision is recorded; no drift hidden in Deferred).
- [ ] Owner-doc consistency: the 3 design docs touched (`notice-bar`, `infinite-scroll`, `pull-refresh`) reflect the final design state with no "Proposed vs Current" residual; the other 2 mobile design docs (`countdown`, `swipe-cell`) are unchanged (their §6 reconciliations are owned by sibling `2026-06-23-2235-1` MM-22 and the prior MA-05/MA-06 fixes respectively).
- [ ] Closure-audit completed by an independent sub-agent (fresh session) with evidence recorded; the execution session did not self-audit this gate.
- [ ] If any code-side Decision was chosen: `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test`. If the plan landed doc-only (all Decisions selected "correct the doc"): the four `pnpm` gates may be omitted per the Plan Guide "纯文档计划" rule — record the omission reason in the Closure status note.

## Deferred But Adjudicated

### Generic "§6 vs code" reconciliation sweep across all 5 mobile design docs

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: This plan reconciles the 5 specific §6/§5 drift findings the 18:24 audit retained. The open audit's "Overall assessment direction #2" recommends a one-time sweep across all 5 mobile design docs to catch latent siblings in `swipe-cell`/`countdown` (countdown's §6 is owned by sibling `2026-06-23-2235-1` MM-22; swipe-cell has no retained §6 finding). A pre-emptive sweep without a retained finding would be speculative doc rewriting, which Rule 14 discourages. The 5 retained findings are the closure surface; latent siblings surface in the next audit if they exist.
- Successor Required: `no` (the next mobile audit is the natural successor — if it surfaces new §6 drift, a new plan owns it).

## Non-Blocking Follow-ups

- Optional: add a CI/docs guard that greps each `docs/components/*/design.md §6` for aspirational phrases ("可考虑", "后续", "未来") and flags any that describe behavior not present in code. Not blocking: the audit cadence catches these; a guard would just shorten the feedback loop.
- Optional: cross-link `infinite-scroll/design.md` Events section to the semantic payload doc once sibling 2031-1's MM-12 payload-consistency fix lands. Not blocking: payloads are consistent after 2031-1.

## Closure

Status Note: <<filled when closed — why every owned finding (MM-17, MM-18, MM-19, MM-20, MM-21) is reconciled and no design.md promises behavior the code does not deliver>>

Closure Audit Evidence:

- Auditor / Agent: <<independent sub-agent, fresh session>>
- Evidence: <<task id / daily log link / findings summary>>

Follow-up:

- Generic §6 sweep successor — see `Deferred But Adjudicated` (deferred to next audit).
- Optional CI §6 guard + payload cross-link — see `Non-Blocking Follow-ups`.
