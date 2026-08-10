# 142 Feedback No-Action-Bar Unexpressible + Citation Year False Positive (open P2-7 / open P2-8)

## Problem

- **open P2-7**: `ai-feedback` `normalizeActions` treated an empty array as "use defaults" — `actions: []` still rendered copy/refresh. The host could NOT express "no action bar" (e.g. read-only transcripts); the only escape was unmounting the renderer. The "empty = defaults" convention was also undocumented.
- **open P2-8**: `CITATION_RE = /\[(\d+(?:\s*,\s*\d+)*)\]/g` matched ANY `[N]` (N > 0); the index filter only dropped non-positives. "Since [2026]" rendered a clickable `<sup>` + an EMPTY citation card (year false positive).
- Evidence: open-audit `docs/audits/2026-08-09-1826-open-audit-ai-invariant-loop.md` P2-7 / P2-8.

## Diagnostic Method

- Diagnosis difficulty: low (single-function semantics; single-regex matching).
- P2-7 RED: `actions: []` → assert zero buttons inside the root (pre-fix renders copy/refresh defaults).
- P2-8 RED: content "Since [2026]" → assert no `data-citation-index` / no `citationNoSource` card (pre-fix renders both); legal `[1]` zero-regression arm.

## Root Cause

- P2-7: `normalizeActions` conflated "absent" and "explicitly empty" — both fell to `DEFAULT_ACTIONS`.
- P2-8: no upper bound on citation indices; 4-digit years are indistinguishable from indices by the regex alone.

## Fix

- **P2-7 (Decision 方案 A — explicit-empty wins)**: `normalizeActions` returns `DEFAULT_ACTIONS` only for `undefined`/`null` (and non-arrays); an explicitly-provided array — including `[]` or an all-unknown filtered list — renders its filtered result (possibly zero buttons). Rationale: `actions: []` is an explicit host intent and must be expressible; silently substituting defaults hides intent.
- **P2-8 (Decision — index upper bound)**: `CITATION_INDEX_MAX = 64`; `parseCitations` keeps indices `1 ≤ n ≤ 64`, everything else (years ≥ 1000, `0`, negatives) stays literal text. Rationale over source-matching: `sources` is optional and the `citation-no-sources` empty-card is a deliberately documented Failure Path — requiring a source match would suppress it; the bound is simple, stable, and kills the year false positive with zero regression on legal citations.

## Tests

- `packages/flux-renderers-ai/src/renderers/__tests__/ai-feedback.test.tsx` — `actions: []` → zero buttons; absent actions → defaults (zero regression); all-unknown list → zero buttons.
- `packages/flux-renderers-ai/src/renderers/__tests__/ai-citations.test.tsx` — "Since [2026]" → literal text (no trigger/card); `[1]` zero regression; `parseCitations` keeps `[12]` and drops `[2026]`.

## Affected Files

- `packages/flux-renderers-ai/src/renderers/ai-feedback.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-citations.tsx`

## Notes For Future Refactors

- The feedback default-vs-empty distinction is now: `undefined`/non-array → defaults; any array → filtered (even empty). Documented in `renderers.md` §8 — keep the doc and the code in sync.
- If the citation index bound ever needs revisiting, it is a single constant (`CITATION_INDEX_MAX`) + the filter predicate; the code-block stripping path already treats filtered-out markers as literal text.
