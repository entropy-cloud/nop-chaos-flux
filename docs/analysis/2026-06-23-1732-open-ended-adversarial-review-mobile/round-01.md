# Round 01 — Open-Ended Adversarial Review (mobile, post-remediation re-audit)

- **Date**: 2026-06-23 (timestamp 17:32)
- **Scope**: `packages/flux-renderers-mobile/` — code, config, tests, public exports, playground consumer, e2e, all 5 design.md
- **Dedup baseline**: MA-01..MA-25 (all resolved), OA-01..OA-13 (resolved per live code + plans), NEW-MM-01..NEW-MM-06 (sibling multi-audit, current residuals). 5 reopened-design adjudications checked — none touch mobile.
- **Seed lens**: 契约考古学家 (contract archaeologist) + 异常路径侦探 (exception-path detective) — chased direction/geometry contracts and host-recovery state machines.

## Findings this round (4 new, non-duplicate)

- **OA-14** (P1, 确定): `pull-refresh` `direction: 'up'` translates the body **DOWN** while the finger swipes **UP** (inverted), the loading indicator stays **top-anchored** (wrong side for an up-pull), and the code contradicts `design.md §8` which itself says pull-up loading should be `infinite-scroll`'s job. Not covered by OA-09 (down-direction overtravel). Test only checks the event fires + `data-direction`.
- **OA-15** (P2, 确定): `notice-bar` multi-text carousel is silently dead whenever the marquee animation does not run (`scrollable:false`, or `scrollable:true` but text fits) — `currentIndex` only mutates in `onAnimationIteration`, so an array `text` shows only `text[0]` forever. Distinct root from OA-01 (loop-boolean guard); this is overflow-detection coupling. `design.md §9` even recommended a timeout-based switch that would work regardless of overflow.
- **OA-16** (P2, 很可能): `infinite-scroll` `isLoadingRef` resets **only** on a `loading` prop transition (line 59) — never on an `error` transition. A host that recovers by clearing `error` without toggling `loading` deadlocks the list **and** kills the retry `<Button>` (`triggerLoadMore` also guards on `isLoadingRef`, line 122). Sharpens the "over-locking is safe" comment: it is safe against duplicates but produces an unrecoverable dead UI.
- **OA-17** (P3, 确定): `infinite-scroll` always renders the generic `errorText` (line 166) and discards the host's `error` string content — the schema's `error?: boolean | string` union invites passing a message that is silently dropped.

## Round result

Issues found. Proceeding to next round.
