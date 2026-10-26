# Coverage Thresholds Baseline

> Status: current baseline (plan 760, roadmap PH-7)
> Gate: every package's `vitest.config.ts` carries `coverage.thresholds`; `pnpm test:coverage` (CI `coverage` job) fails the package when any metric drops below its threshold.

## Rule

- Standard threshold is **80 / 80 / 80 / 80** (branches / functions / lines / statements), the `packages/flux-core/vitest.config.ts` precedent.
- A package whose live coverage is below 81 on a metric registers a **ratchet threshold** = `floor(live) − 1` for that metric, annotated in the config with the live value and date. Ratchet thresholds only move **up**; when a metric reaches 80 the standard value replaces it.
- Coverage scope for ratchet packages is exactly `include: src/**/*.{ts,tsx}`, `exclude: src/**/*.test.ts, src/**/*.test.tsx, src/**/__tests__/**`. Barrel `index.ts` files and `src/types.ts` are **counted** (they sit at 0% and are part of the baseline) — do not "clean up" the exclude list to raise the numbers; raise them by adding tests.

## Registered packages (plan 760, measured 2026-10-26)

| Package                | Branches | Functions | Lines  | Statements | Live (B / F / L / S)          | Gap to 80                                             | Owner surface                       |
| ---------------------- | -------- | --------- | ------ | ---------- | ----------------------------- | ----------------------------------------------------- | ----------------------------------- |
| `flux-print-core`      | **74**   | 80        | 80     | 80         | 75.97 / 92.3 / 94.84 / 91.66  | branches −4                                           | print                               |
| `flux-print-renderers` | **74**   | **75**    | 80     | 80         | 75 / 76.27 / 84.02 / 82.75    | branches −5, functions −4                             | print                               |
| `flux-xlang-debug`     | **63**   | **78**    | 80     | 80         | 64.35 / 79.7 / 82.53 / 81.92  | branches −16, functions −1                            | xlang                               |
| `flux-xlang-lang`      | 80       | **56**    | **75** | **73**     | 83.33 / 57.14 / 76.47 / 74.28 | functions −23, lines −4, statements −6 (2 test files) | xlang                               |
| `tailwind-preset`      | 80       | 80        | 80     | 80         | 88.88 / 100 / 93.33 / 93.33   | —                                                     | platform                            |
| `theme-tokens`         | 80       | 80        | 80     | 80         | 100 / 100 / 100 / 100         | —                                                     | platform                            |
| `editor-core`          | **69**   | 80        | 80     | 80         | 70.86 / 92 / 88.31 / 81.66    | branches −10                                          | editor (config created by plan 760) |

Bold = ratchet threshold below the standard. The other 36 packages already carry 80/80/80/80 (or stricter) and are not listed here.

## Raising a ratchet

1. Add tests in the owner package until the metric clears the new value.
2. Edit the threshold upward in that package's `vitest.config.ts` (never downward) and update the row above.
3. When all four metrics are at 80, drop the annotation comments — the package is now on the standard rule.
