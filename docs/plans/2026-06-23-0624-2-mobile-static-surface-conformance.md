# {2} Mobile Static-Surface Conformance (Types, Styles, i18n, a11y, Hygiene)

> Plan Status: superseded
> Last Reviewed: 2026-06-23
> Source: `docs/audits/2026-06-22-2039-multi-audit-mobile.md` (MA-05, MA-06, MA-11, MA-17, MA-18, MA-19, MA-21, MA-22, MA-23, MA-24) and `docs/audits/2026-06-22-2039-open-audit-mobile.md` (OA-03, OA-04)
> Related: `docs/plans/2026-06-23-0624-1-mobile-interaction-contract-remediation.md` (also superseded)
> Execution Order: {2} — runs after plan `{1}`. Both plans edit `notice-bar.tsx`, `swipe-cell.tsx`, and `use-touch.ts`; sequencing avoids merge conflicts. This plan depends on `{1}` only for file stability, not for any behavioral contract (its findings are statically verifiable).

## Supersession Note

**Superseded on 2026-06-23 by the `2026-06-23-0655-*` owner-plan set** (`docs/plans/2026-06-23-0655-1-mobile-async-and-state-machine-correctness-plan.md`, `...-2-mobile-contract-honesty-and-markers-gating-plan.md`, `...-3-mobile-ux-a11y-and-styling-hygiene-plan.md`).

Reason: this plan and its companion `0624-1` were drafted at 06:24 but do not cover OA-08..OA-13 (the six newer `open`-audit findings). Its MA-05/06/11/17/18/19/21/22/23/24 + OA-03/04 scope is fully absorbed into the `0655` set (split across `0655-2` contract-honesty and `0655-3` UX/a11y/styling-hygiene), and the `0655` set additionally owns the missing OA-08 (a11y hidden-focusable, now the package's highest-urgency item), OA-09 (geometry), OA-12 (re-measure), etc. The `0655` set is a complete superset covering all 25 MA + all 13 OA findings, passed independent fresh-session draft review, and resolves to a single clean owner set instead of two overlapping ones. No code was executed against this plan (all files were uncommitted), so there is no execution loss. Keep this file as a historical record; do not execute it.

## Purpose

Make the mobile package's **static surfaces** — public TypeScript types, exported hook interfaces, styling/theme tokens, default locale strings, a11y semantics, and the `package.json` manifest — honestly conform to the repo's contracts. These are all defects that can be verified by `typecheck` + `grep` + computed-style without depending on mobile touch-gesture behavior, which is why they are bundled separately from the behavioral interaction work in plan `{1}`.

This is the **static conformance** owner plan.

## Current Baseline

Verified against live repo on 2026-06-23:

- **Public API/type lies**:
  - `use-touch.ts` declares `onTouchEnd: (e: React.TouchEvent) => void` but the implementation takes no argument; two production callers and the hook's own test construct `{} as React.TouchEvent` to satisfy it (`hooks/use-touch.ts:22-26,88-90`; callers at `pull-refresh.tsx:81`, `swipe-cell.tsx:121`). [MA-11]
  - `NoticeBarSchema.icon?: SchemaValue` (accepts any value) but the renderer honors only strings (`schemas.ts:92`, `notice-bar.tsx:53-54`); all 5 other repo `icon?` fields are `string`. [MA-17]
  - `useCountdownTimer` is exported but its `CountdownTimerOptions` / `CountdownTimerResult` interfaces are not (`countdown.tsx:28-46,175`, `index.ts:24`); the sibling `useTouch` exports all supporting types. [MA-18]
- **Styling/theme drift**:
  - The mobile package currently ships **no CSS file at all** (`packages/flux-renderers-mobile/src/` has zero `.css` files; repo-wide `grep` for `nop-notice-bar|nop-pull-refresh|…` in `*.css` returns zero hits — the MA-03 BEM classes are dead DOM noise with no styling target). The in-repo precedent for a renderer-package CSS file is `packages/flux-renderers-form/src/form-renderers.css` (wired via `index.tsx` side-effect import, `package.json` `sideEffects:["*.css"]` + `exports` + build `copy-build-assets.mjs`, `vite.workspace-alias.ts`, `tsconfig.base.json`, and an aggregate `@import` in `packages/flux-bundle/src/style.css`).
  - `notice-bar.tsx:28-37,76-78` injects a global `<style>` `@keyframes` into `document.head` from a `useEffect` with no cleanup — layer violation, CSP-hostile, survives unmount. [MA-05]
  - `notice-bar.tsx:6-11` `VARIANT_CLASS_MAP` hardcodes Tailwind palette literals (`bg-blue-50` etc.) with no `dark:` variants — violates `docs/architecture/theme-compatibility.md:34-36,215`; `data-variant` is already emitted so variant state is available, but the literals are a non-tokenized channel with no dark-mode support. [MA-06]
  - `notice-bar.test.tsx:62-80` asserts literal Tailwind class names — will break when MA-06 token migration lands. [MA-21]
  - `notice-bar.tsx:149-155` uses stable inline `style` (flex/gap/padding) where Tailwind classes belong (`docs/architecture/theme-compatibility.md:277`). [MA-22]
  - `countdown.tsx:164` uses inline `fontVariantNumeric:'tabular-nums'` instead of the `tabular-nums` utility. [MA-23]
  - `swipe-cell.tsx` has no `user-select:none` during drag (text/icons highlight mid-swipe). [MA-24]
- **i18n absent**: every user/SR-facing default string is a hardcoded Chinese literal (`pull-refresh.tsx:23-29`, `infinite-scroll.tsx:31-33`, `notice-bar.tsx:202` `aria-label="关闭"`); `grep` for `t('flux`, `useTranslator`, `i18n` in `src/` returns zero hits; `flux-i18n` is declared as a workspace dependency but unused. [OA-03]
- **a11y over-reach**: `notice-bar.tsx:133-148` emits `role="alert"` on a clickable/focusable control and unconditionally emits `tabIndex={0}` + Enter/Space handling even when no `onClick` is bound (meaningless tab stops / no-op activation). [OA-04]
- **Manifest inaccuracy**: `package.json:15-31` declares 5 unused workspace deps (`flux-i18n`, `flux-react`, `flux-compiler`, `flux-formula`, `flux-runtime`); only `flux-core` and `ui` are imported. [MA-19] (Note: OA-03 will make `flux-i18n` used; this plan coordinates the two so the manifest is accurate at closure.)

## Goals

- The package's exported TypeScript types and hook signatures match runtime behavior exactly — no `as`-casts papering over a lie, no half-exported API surface.
- All package-owned visuals use theme-aware Tailwind classes with `dark:` variants (the `badge.tsx` pattern) or CSS tokens, and respond to dark mode; no runtime `<style>` injection; stable layout via Tailwind utilities.
- Default user/SR-facing strings are routed through `flux-i18n` (the declared dependency is actually used); the `aria-label` is localized.
- `notice-bar` a11y is correct: interactivity (tab stop, activation, role) is conditioned on whether an `onClick` is actually bound.
- `package.json` reflects only the deps the package actually imports.

## Non-Goals

- Any behavioral interaction-contract change (rotation, auto-close, scroll-locking, async `.catch`, touchcancel, dispatch-out-of-updater, in-flight guard, markers-contract test, event passthrough, schema runtime props) — owned by plan `{1}`.
- New i18n translation infrastructure beyond routing the package's own defaults through the existing `flux-i18n` seam that sibling packages already use.
- A full dark-mode visual redesign; only tokenization of the notice-bar variants that currently hardcode literals.

## Scope

### In Scope

- `packages/flux-renderers-mobile/src/hooks/use-touch.ts` (signature only)
- `packages/flux-renderers-mobile/src/schemas.ts` (`icon` type)
- `packages/flux-renderers-mobile/src/countdown.tsx` (interface exports + `tabular-nums`)
- `packages/flux-renderers-mobile/src/notice-bar.tsx` (keyframes, variant tokens, inline style, i18n, a11y)
- `packages/flux-renderers-mobile/src/{pull-refresh,infinite-scroll,swipe-cell}.tsx` (i18n strings, user-select)
- `packages/flux-renderers-mobile/src/index.ts` (re-export countdown interfaces + side-effect CSS import)
- `packages/flux-renderers-mobile/src/mobile-renderers.css` (NEW — `@keyframes` + any non-utility CSS)
- `packages/flux-renderers-mobile/package.json` (deps + `sideEffects`/`exports`/build-copy for the CSS)
- `vite.workspace-alias.ts`, `tsconfig.base.json`, `packages/flux-bundle/src/style.css` (CSS wiring, following the `flux-renderers-form` precedent)
- `packages/flux-i18n/src/locales/{zh-CN,en-US}.ts` (register the new `flux.mobile.*` default-string keys)
- `packages/flux-renderers-mobile/src/notice-bar.test.tsx` (decouple from literal classes)
- `docs/components/notice-bar/design.md` (only if the a11y/i18n model changes the documented behavior)

### Out Of Scope

- All Non-Goals items.
- Behavioral correctness of any renderer (plan `{1}`).
- Styling work outside the mobile package.

## Failure Paths

> Not applicable: this plan makes no error-handling / API-contract / auth / external-integration behavioral changes. It is a static-conformance (types, CSS tokens, locale strings, a11y attributes, manifest) refactor. Any rendering breakage surfaces as a focused unit-test or typecheck failure, not a runtime failure path.

## Test Strategy

本档选择：**建议有测**

Rationale: most findings are statically verifiable (`typecheck`, `grep`, `.d.ts` inspection, contract-style DOM assertions). The two behavior-affecting ones (OA-04 a11y focus/role conditioning, OA-03 i18n routing) deserve focused tests; the rest are conformance checks. This is below "必须自动化" because there is no core regression path / auth / public-API runtime contract at risk — the public-API fixes here are _narrowing_ (removing lies), not adding runtime behavior.

## Execution Plan

### Phase 1 - Public API / type / schema honesty

Status: planned
Targets: `packages/flux-renderers-mobile/src/hooks/use-touch.ts`, `packages/flux-renderers-mobile/src/schemas.ts`, `packages/flux-renderers-mobile/src/countdown.tsx`, `packages/flux-renderers-mobile/src/index.ts`

- Item Types: `Fix | Proof`

- [ ] [Fix] MA-11: drop the unused parameter from `UseTouchReturn.touchHandlers.onTouchEnd` (`onTouchEnd: () => void`) in `hooks/use-touch.ts:22-26`; remove the `{} as React.TouchEvent` casts at `pull-refresh.tsx:81`, `swipe-cell.tsx:121`, and `use-touch.test.ts:162`. (Coordinate with plan `{1}`'s touchcancel handler work on the same file — this plan runs after `{1}`.) [MA-11]
- [ ] [Fix] MA-17: narrow `NoticeBarSchema.icon?: SchemaValue` → `icon?: string` in `schemas.ts:92`, matching the renderer's actual behavior (`notice-bar.tsx:53-54`) and the cross-package convention. [MA-17]
- [ ] [Fix] MA-18: `export` `CountdownTimerOptions` and `CountdownTimerResult` in `countdown.tsx:28-46`; add `export type { CountdownTimerOptions, CountdownTimerResult } from './countdown.js';` to `index.ts`. [MA-18]
- [ ] [Proof] Verify: `pnpm --filter @nop-chaos/flux-renderers-mobile typecheck` passes; `grep -rn "as React.TouchEvent" packages/flux-renderers-mobile/src` returns zero hits; the built `dist/countdown.d.ts` exposes both interfaces. [MA-11, MA-18]

Exit Criteria:

- [ ] No `as React.TouchEvent` cast remains in mobile src; `use-touch` `onTouchEnd` signature takes no argument; countdown interfaces are exported and appear in `dist`.

### Phase 2 - Theme-token & styling migration

Status: planned
Targets: `packages/flux-renderers-mobile/src/notice-bar.tsx`, `packages/flux-renderers-mobile/src/mobile-renderers.css` (NEW), `packages/flux-renderers-mobile/src/index.ts`, `packages/flux-renderers-mobile/package.json`, `vite.workspace-alias.ts`, `tsconfig.base.json`, `packages/flux-bundle/src/style.css`, `packages/flux-renderers-mobile/src/countdown.tsx`, `packages/flux-renderers-mobile/src/swipe-cell.tsx`, `packages/flux-renderers-mobile/src/notice-bar.test.tsx`

- Item Types: `Fix | Proof`

- [ ] [Fix] **Create + wire the mobile package CSS file** (prerequisite for MA-05; no CSS file exists today). Create `packages/flux-renderers-mobile/src/mobile-renderers.css`. Wire it following the `flux-renderers-form` precedent exactly: (1) side-effect import `import './mobile-renderers.css';` in `index.ts`; (2) `package.json` `"sideEffects": ["*.css"]` + `exports` entry `"./mobile-renderers.css": { "default": "./dist/mobile-renderers.css" }` + extend the `build` script with `node ../../scripts/copy-build-assets.mjs src/mobile-renderers.css dist/mobile-renderers.css`; (3) add an alias in `vite.workspace-alias.ts` and a path mapping in `tsconfig.base.json`; (4) add `@import '@nop-chaos/flux-renderers-mobile/mobile-renderers.css';` to `packages/flux-bundle/src/style.css`. [MA-05 prerequisite]
- [ ] [Fix] MA-05: move `@keyframes nop-notice-bar-marquee` into `mobile-renderers.css`; delete `ensureMarqueeKeyframes()` and its `useEffect` in `notice-bar.tsx:28-37,76-78` entirely. [MA-05]
- [ ] [Fix] MA-06: replace `VARIANT_CLASS_MAP` (`notice-bar.tsx:6-11`) with **tokenized Tailwind classes with `dark:` variants in TSX** (a plain class map, or a `cva` recipe imported via `@nop-chaos/ui`'s re-export since `class-variance-authority` is only a transitive dep of this package), following `packages/ui/src/components/ui/badge.tsx:19-20` (e.g. `bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400`). Keep emitting `data-variant={variant}` (it remains the contract marker asserted by MA-03/MA-25), but drive variant _visuals_ through these classes, not through CSS attribute selectors. [MA-06]
- [ ] [Fix] MA-21: decouple `notice-bar.test.tsx:62-80` from literal Tailwind class strings — assert the protocol marker `data-variant` (primary) plus, where visual confirmation is needed, `getComputedStyle` background color; stop asserting `bg-amber-50`/`text-amber-800` literals. [MA-21]
- [ ] [Fix] MA-22: convert the stable inline layout (`notice-bar.tsx:149-155`) to Tailwind classes (`flex items-center gap-2 px-3 py-2 overflow-hidden`); keep only dynamic values (`animationDuration`, `textWidth`) as inline style. [MA-22]
- [ ] [Fix] MA-23: replace inline `style={{ fontVariantNumeric: 'tabular-nums' }}` with the `tabular-nums` Tailwind class at `countdown.tsx:164`. [MA-23]
- [ ] [Fix] MA-24: apply `select-none` to the swipe-cell content pane while `openState !== 'closed'` or `state.isTouching` (`swipe-cell.tsx:174-235`). [MA-24]
- [ ] [Proof] Verify: `grep -nE "ensureMarqueeKeyframes" packages/flux-renderers-mobile/src` returns zero hits; `mobile-renderers.css` exists and is wired (build copies it to `dist/`, and `flux-bundle/src/style.css` imports it); notice-bar variant tests pass via `data-variant`/computed style (no literal class assertions); `pnpm --filter @nop-chaos/flux-renderers-mobile test` passes. [MA-05, MA-06, MA-21]

Exit Criteria:

- [ ] No runtime `<style>`/`@keyframes` injection from the renderer; `@keyframes` lives in the wired `mobile-renderers.css`.
- [ ] Notice-bar variant visuals use tokenized Tailwind classes with `dark:` variants (badge.tsx pattern); `data-variant` remains emitted as the contract marker; variant tests no longer assert literal class names.

### Phase 3 - i18n seam, a11y semantics & package hygiene

Status: planned
Targets: `packages/flux-renderers-mobile/src/{pull-refresh,infinite-scroll,notice-bar,swipe-cell}.tsx`, `packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`, `packages/flux-renderers-mobile/package.json`

- Item Types: `Fix | Proof`

- [ ] [Fix] OA-03: route all default user/SR-facing strings (`pull-refresh.tsx:23-29`, `infinite-scroll.tsx:31-33`, `notice-bar.tsx:202` `aria-label="关闭"`) through the existing `flux-i18n` seam (`import { t } from '@nop-chaos/flux-i18n'`, as used in `flux-renderers-basic`/`flux-react`); register the new `flux.mobile.*` keys in both `packages/flux-i18n/src/locales/zh-CN.ts` and `en-US.ts`; keep schema-provided override props as the per-instance escape hatch. [OA-03]
- [ ] [Fix] OA-04: condition `notice-bar` interactivity on whether `onClick` is bound — emit `tabIndex` and Enter/Space handling only when interactive; **default role decision**: when no `onClick` is bound use `role="status"` (polite, non-assertive notice) with no tab stop; when `onClick` is bound use button/link semantics (or move the click onto an inner `<Button>`) — do not use unconditional `role="alert"` (`notice-bar.tsx:133-148`). [OA-04]
- [ ] [Proof] Add/extend tests: `grep` for raw Chinese default literals in mobile src returns zero (defaults routed through `t('flux.*')`); a11y test asserting no `tabIndex` tab stop and no activatable semantics when `onClick` is absent (and correct role when present). [OA-03, OA-04]
- [ ] [Fix] MA-19: correct `package.json:15-31` — `flux-i18n` now stays (made used by OA-03); remove the still-unused deps (`flux-react` from `dependencies`; `flux-compiler`, `flux-formula`, `flux-runtime` from `devDependencies`). Re-run `pnpm install` to update the lockfile. [MA-19]
- [ ] [Proof] Verify: `pnpm install` succeeds; `grep -rn "from '@nop-chaos/(flux-react|flux-compiler|flux-formula|flux-runtime)'" packages/flux-renderers-mobile/src` still returns zero (confirming the removed deps were genuinely unused); the mobile package still type-checks and builds. [MA-19]

Exit Criteria:

- [ ] Default strings are localized via `flux-i18n`; `notice-bar` a11y role/focus is conditioned on interactivity; `package.json` declares only deps the package imports and `pnpm install` is consistent.

## Draft Review Record

- Reviewer / Agent: independent `general` sub-agent, fresh session — round 1 (`ses_10e8d52e5ffeAA4ikoxyVh3Pi9`, verdict `revised`, 2 Majors), round 2 (`ses_10e86583effeTDQqJvRbJ0s3eI`, verdict `pass-with-minors`)
- Verdict: `pass-with-minors` (after round 2)
- Rounds: 2
- Findings addressed:
  - (Round 1 Major A — RESOLVED): plan falsely assumed a pre-existing mobile CSS file + `.nop-notice-bar*` selectors. Corrected `Current Baseline` to state the package ships no CSS file; added a new Phase 2 `[Fix]` item to CREATE + wire `mobile-renderers.css` following the `flux-renderers-form` precedent (side-effect import, `sideEffects`/`exports`/build-copy, `vite.workspace-alias.ts`, `tsconfig.base.json`, `flux-bundle/src/style.css` `@import`); expanded Targets/In-Scope. Round 2 verified the wiring list is complete against the live `flux-renderers-form` precedent.
  - (Round 1 Major B — RESOLVED): MA-06 gave contradictory styling guidance. Chose ONE mechanism — tokenized Tailwind classes with `dark:` variants in TSX (badge.tsx pattern), not CSS `[data-variant]` attribute selectors; aligned Goals, the MA-06 Fix, the MA-21 test-decoupling, and Exit Criteria.
  - (Minor): aligned `notice-bar.test.tsx` line range to `:62-80` in both Current Baseline and the Phase 2 item.
  - (Minor): OA-04 now states the default role decision explicitly (`role="status"` when non-interactive, button/link semantics when `onClick` bound).
  - (Minor): MA-06 notes `cva` is only a transitive dep — use the plain class map or import `cva` via `@nop-chaos/ui` re-export.
  - (Minor): OA-03 now lists the `flux-i18n` locale files in Targets and registers `flux.mobile.*` keys.
- Reference accuracy: all cited paths/lines/finding-IDs verified against the live repo across both rounds with zero material mismatches; full coverage of all 12 owned findings confirmed; companion-plan split confirmed clean and non-overlapping (20 behavioral in `{1}`, 12 static here; 32 = full audit set).

## Closure Gates

- [ ] All in-scope confirmed type/API/schema drifts (MA-11, MA-17, MA-18) have converged (no signature lie, no `as`-cast, interfaces exported).
- [ ] All in-scope confirmed styling/theme/i18n/a11y drifts (MA-05, MA-06, MA-21, MA-22, MA-23, MA-24, OA-03, OA-04) have converged to tokenized/localized/accessible baselines.
- [ ] `package.json` is accurate (MA-19); `flux-i18n` is genuinely used (OA-03), the other four unused deps are removed.
- [ ] No in-scope static drift has been silently downgraded to deferred / follow-up.
- [ ] Affected owner docs (`docs/architecture/theme-compatibility.md` conformance, `docs/components/notice-bar/design.md` if a11y/i18n model changed) reflect the final state, or no update was required (record which).
- [ ] Closure audit performed by an independent sub-agent (fresh session); evidence recorded in `Closure Audit Evidence`.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

> None at draft. (If a real-device visual check of dark-mode variants is deemed out of reach of jsdom, record it here as `watch-only residual` with a non-blocking reason at that time.)

## Non-Blocking Follow-ups

- Consider a repo-wide i18n-literal audit that catches raw Chinese defaults (not just `t('flux.*')` calls) so the `scripts/check-i18n-keys.mjs` blind spot (OA-03 root cause) is closed generically — governance item, not a closure blocker for this package.

## Closure

Status Note: <<filled at closure>>

Closure Audit Evidence:

- Auditor / Agent: <<independent sub-agent>>
- Evidence: <<task id / daily log / findings>>

Follow-up:

- <<non-blocking follow-ups only; confirmed drifts must not appear here>>
