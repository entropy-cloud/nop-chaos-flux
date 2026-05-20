# Audit Tooling Reference

## Purpose

This document explains the repository audit scripts used by deep audit and routine review work.

Use it to decide whether an issue should be:

- treated as an automated hard gate
- reviewed from a heuristic suspect list
- audited manually because no current tool covers it

## Rule

Do not manually re-report a passing hard gate. If a hard gate passes, only report that area when you have evidence that the gate has a coverage hole or the code bypasses the intended check.

Heuristic suspect scripts do not prove defects. They generate candidate locations that must be checked against live code, owner docs, calibration patterns, and reopened adjudications.

Standalone `check:audit-*suspects` commands exit `0` when suspects are found. Non-empty output is an informational candidate list, not a failed gate.

Current suspect scanners scan source files under `apps/`, `packages/`, and `tests/`, with generated and dependency directories such as `dist/`, `coverage/`, and `node_modules/` ignored. They intentionally do not audit `scripts/` implementation files unless a focused manual review explicitly targets audit tooling itself.

## Compound Commands

| Command      | Role                            | Behavior                                                                                                                                                |
| ------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` | Health gate plus audit suspects | Runs structural guard scripts, schema property coverage, and `check:audit-suspects`. Fails only on hard gate failures; suspect output is informational. |
| `pnpm lint`  | CI lint gate                    | Runs artifact/doc/css/contract/i18n/schema-coverage guards and package ESLint. Fails on hard lint violations.                                           |

## Hard Gates

| Command or Rule                         | Source                                                              | Covers                                                                    | Deep Audit Use                                                                                                                                                                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check:react19`                    | `scripts/check-react19-legacy-apis.mjs`                             | Legacy React APIs such as old `react-dom` entry points                    | Do not manually search React 19 legacy APIs unless this gate fails or a bypass is suspected.                                                                                                                                                           |
| `pnpm check:src-artifacts`              | `scripts/verify-no-src-artifacts.mjs`                               | Generated `.js`, `.d.ts`, `.js.map`, `.d.ts.map` files under source trees | Treat failures as hard defects; do not duplicate passing results.                                                                                                                                                                                      |
| `pnpm check:oversized-code-files`       | `scripts/check-oversized-code-files.mjs`                            | `>700` line hard errors and `>500` line warnings                          | Use output as the line-count baseline. Only inspect `>500` warnings for responsibility drift; do not re-count manually.                                                                                                                                |
| `pnpm check:active-doc-code-anchors`    | `scripts/check-active-doc-code-anchors.mjs`                         | Missing backtick file-path anchors in active docs                         | Treat failures as doc-code drift; passing anchors are not audit findings.                                                                                                                                                                              |
| `pnpm check:package-css-exports`        | `scripts/check-package-css-exports.mjs`                             | CSS exports pointing to `dist` instead of `src`                           | Treat failures as packaging defects.                                                                                                                                                                                                                   |
| `pnpm check:i18n-keys`                  | `scripts/check-i18n-keys.mjs`                                       | Used i18n keys missing from locale files                                  | Missing-key failures are hard; unused-key warnings are review context. Current coverage includes literal `flux.*` keys, namespace-relative keys normalized to `flux.*`, and small declared dynamic key maps such as condition-builder operator labels. |
| `pnpm check:workspace-manifest-deps`    | `scripts/check-workspace-manifest-deps.mjs`                         | Workspace source imports not declared in local package manifests          | Treat failures as manifest defects; do not manually re-scan every import when it passes. The gate covers `from`, dynamic `import(...)`, and bare side-effect `import '@nop-chaos/...';` forms.                                                         |
| `pnpm check:schema-prop-coverage`       | `scripts/check-schema-prop-coverage.mjs`                            | JSON-visible schema properties lacking authored-test coverage             | Treat failures as hard contract drift. Root `pnpm check` and `pnpm lint` both run this guard in the current baseline.                                                                                                                                  |
| `check:renderer-definition-fields-only` | `scripts/check-renderer-definition-fields-only.mjs` via `pnpm lint` | Legacy `regions` references in renderer definitions                       | Passing gate means the mechanical fields-only migration guard is clean.                                                                                                                                                                                |
| `check:finite-prop-contracts`           | `scripts/check-finite-prop-contracts.mjs` via `pnpm lint`           | Selected finite schema props missing finite editor contracts              | Passing gate does not prove all prop contracts are complete; it remains a curated finite-prop sample guard, now covering representative `button` and table ownership unions rather than only the older smaller sample set.                             |
| ESLint `no-eval` / `no-new-func`        | `eslint.config.js`                                                  | `eval` and `new Function` security red lines                              | Do not manually grep these as a primary audit step unless lint is unavailable or a non-standard dynamic execution path is suspected.                                                                                                                   |
| ESLint `max-lines`                      | `eslint.config.js`                                                  | Source files over 700 lines                                               | Secondary hard gate; use `check:oversized-code-files` for the broader line-count baseline.                                                                                                                                                             |

## Heuristic Suspect Scanners

| Command                                     | Rule Buckets                                                                            | Covers                                                                                            | Deep Audit Use                                                                                                           |
| ------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check:audit-suspects`                 | All buckets in `scripts/audit/rules.mjs`                                                | Combined suspect report                                                                           | Start here for broad sweeps. Every result needs manual confirmation.                                                     |
| `pnpm check:audit-reactive-render-reads`    | `reactive-render-read`, `broad-scope-selector`                                          | Render-sensitive store/scope reads and `useScopeSelector` calls without explicit `paths`          | Use for Dimension 05. Confirm whether the selector is actually hot-path, broad, or stale.                                |
| `pnpm check:audit-async-failure-paths`      | `void-promise-no-catch`, `then-chain-no-catch`, `catch-without-structured-failure-path` | Fire-and-forget promises, `.then()` chains, and catch blocks that may swallow or flatten failures | Use for Dimensions 06 and 19. Confirm whether the failure is already handled internally or intentionally ignored.        |
| `pnpm check:audit-fieldframe-bypasses`      | `fieldframe-bypass`                                                                     | Direct `FieldFrame` use outside known owners                                                      | Use for Dimensions 09 and 12. Confirm against current field-frame ownership docs.                                        |
| `pnpm check:audit-test-global-leaks`        | `test-module-top-let`, `test-global-patch`                                              | Mutable module-top test state and global patching                                                 | Use for Dimension 14. Confirm cleanup/reset behavior before reporting.                                                   |
| `pnpm check:audit-missing-renderer-markers` | `missing-renderer-marker`                                                               | Renderer component files that appear to lack `nop-*` marker classes                               | Use for Dimension 09. Confirm actual rendered root before reporting.                                                     |
| `pnpm check:audit-performance-suspects`     | `json-stringify-change-detection`                                                       | `JSON.stringify` used as change-detection or dependency keying                                    | Use for Dimension 15. Exclude serialization, logging, cache-key cases unless they are hot-path or semantically unstable. |
| `pnpm check:audit-styling-suspects`         | `bare-data-slot-selector`                                                               | Package CSS selectors targeting `[data-slot]` without a scoping selector                          | Use for Dimension 10. Confirm whether the selector is intentionally global before reporting.                             |

## Manual Audit Remaining

The tools above intentionally do not replace architectural judgment. Manual deep audit should still focus on:

- owner drift not expressible as a simple pattern
- public API contract mismatch
- runtime lifecycle boundaries
- validation owner semantics
- hidden state, stale snapshot, or cross-package coupling that requires code reading
- accessibility behavior that needs semantic and interaction context

## Reporting Guidance

When a finding came from a suspect script, include:

- the command used
- the suspect bucket name
- why the candidate is a true defect rather than tool noise
- whether it overlaps an existing calibration pattern or reopened adjudication

When a hard gate fails, cite the command output and avoid restating every mechanical match unless it is needed to plan the fix.
