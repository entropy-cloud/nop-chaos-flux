# 维度 14: 测试覆盖与质量

## 深挖轮次

- 第 1 轮: UI complex components, API data source controller tests, >700 tests, max-lines disable.
- 第 2 轮: core indirect coverage, setup/test file bloat, serial e2e, mocks/timers, Playwright config, browser matrix, spreadsheet/report e2e gaps.
- 第 3 轮: CI not running e2e, coverage thresholds inactive, `flux-renderers-data` explicit test file list, jsdom pragmas.
- 第 4 轮: diagnostic e2e/no assertions/Fiber/waitForTimeout, persistence UI not asserted, benchmark skip.
- 第 5 轮: retry tests duplicate formula, word dataset e2e isolation.

## 维度复核结论

### 保留

- API data source controller lacks direct tests.
- `basic-page-layout.test.tsx` disables max-lines; several test files >700 lines.
- serial e2e files exist.
- Playwright `trace: on-first-retry` ineffective with `retries: 0`; only Chromium project.
- spreadsheet/report e2e coverage gaps.
- skipped README screenshot suite.
- CI workflow does not run `pnpm test:e2e`.
- coverage thresholds not active in default `pnpm test`.
- `flux-renderers-data` test script enumerates files manually.
- word-editor persistence only checks localStorage, not UI reload state.
- word dataset e2e uses fixed data names without isolation/cleanup.

### 降级

- UI complex component coverage uneven but not absent.
- mock/timer cleanup is distributed, no broad leak proven.
- jsdom per-file pragmas are config hygiene.
- diagnostic e2e/Fiber/waitForTimeout issues are real but mostly debug/diag path.
- benchmark skipped by default is acceptable as benchmark, but not a gate.

### 驳回

- “core implementation only indirect tests” broad claim.
- setup file bloat claim.
- retry tests duplicate formula claim.

## 最终保留项

1. Add direct tests for async data source controller and key core state machines.
2. Split >700 tests and remove max-lines disable.
3. Make e2e/coverage gates explicit in CI or mark them non-gating honestly.
4. Replace enumerated test scripts with glob discovery or add guard for orphan tests.
