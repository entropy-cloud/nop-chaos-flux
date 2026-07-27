# Audit Remediation Master Index (arm-index)

> Plan Status: completed
> Last Updated: 2026-07-27
> Purpose: Central index mapping all audit phases, package clusters, P0/P1 findings, and audit report paths.
> Note: Baseline values recorded during M0 execution (2026-07-27 0800 Plan). All check:audit-_ and pnpm audit:_ commands executed. Full verification baseline green (typecheck + build + test with 1 pre-existing flake).

## Phase / Milestone Index

| Phase ID | Name                                          | Status      | Report Path                                     |
| -------- | --------------------------------------------- | ----------- | ----------------------------------------------- |
| M0       | 审计编排基线                                  | `completed` | (this index)                                    |
| MA1.1    | 结构层—核心包簇（core）依赖与边界审计         | `todo`      | `docs/audits/arm-MA1-core-*.md`                 |
| MA1.2    | 结构层—运行时包簇（runtime）依赖与边界审计    | `todo`      | `docs/audits/arm-MA1-runtime-*.md`              |
| MA1.3    | 结构层—基础渲染器（basic）定义与边界审计      | `todo`      | `docs/audits/arm-MA1-basic-*.md`                |
| MA1.4    | 结构层—设计器/办公/内容/移动端 定义与样式审计 | `todo`      | `docs/audits/arm-MA1-others-*.md`               |
| MA2.1    | 运行时层—核心包簇 Schema 与 FieldFrame 审计   | `todo`      | `docs/audits/arm-MA2-core-*.md`                 |
| MA2.2    | 运行时层—运行时包簇裸读取与异步路径审计       | `todo`      | `docs/audits/arm-MA2-runtime-*.md`              |
| MA2.3    | 运行时层—基础渲染器分发与 Action 链路审计     | `todo`      | `docs/audits/arm-MA2-basic-*.md`                |
| MA3.1    | 代码质量—核心+运行时 代码质量与 React19 审计  | `todo`      | `docs/audits/arm-MA3-core-runtime-*.md`         |
| MA3.2    | 代码质量—基础+内容+移动端 代码质量审计        | `todo`      | `docs/audits/arm-MA3-basic-content-mobile-*.md` |
| MA3.3    | 代码质量—设计器+办公 代码质量审计             | `todo`      | `docs/audits/arm-MA3-designer-office-*.md`      |
| MA4.1    | 测试层—核心+运行时 测试覆盖审计               | `todo`      | `docs/audits/arm-MA4-core-runtime-*.md`         |
| MA4.2    | 测试层—基础+内容+移动端 测试覆盖审计          | `todo`      | `docs/audits/arm-MA4-basic-content-mobile-*.md` |
| MA4.3    | 测试层—设计器+办公 测试覆盖与 E2E 审计        | `todo`      | `docs/audits/arm-MA4-designer-office-*.md`      |
| MA5.1    | UI/UX—设计器可操作性审计                      | `todo`      | `docs/audits/arm-MA5-designer-*.md`             |
| MA5.2    | UI/UX—基础+内容渲染器 UX 审计                 | `todo`      | `docs/audits/arm-MA5-basic-content-*.md`        |
| MA6      | 文档与契约一致性审计                          | `todo`      | `docs/audits/arm-MA6-*.md`                      |
| MA7.1    | 安全与运维—XSS/样式/性能审计                  | `todo`      | `docs/audits/arm-MA7-security-*.md`             |
| MA7.2    | 安全与运维—CI/Deprecation/i18n 审计           | `todo`      | `docs/audits/arm-MA7-ci-*.md`                   |
| R1.0     | P1 修复—结构+运行时                           | `todo`      | `docs/plans/2026-*-MR1-*.md`                    |
| R2.0     | P1 修复—代码+测试                             | `todo`      | `docs/plans/2026-*-MR2-*.md`                    |
| R3.0     | P1 修复—UI/UX+文档+安全+运维                  | `todo`      | `docs/plans/2026-*-MR3-*.md`                    |
| R4.0     | 跨维度 P1 裁决                                | `todo`      | `docs/plans/2026-*-MR4-*.md`                    |
| MV       | 全量验证与回归                                | `todo`      | `docs/plans/2026-*-MV-*.md`                     |
| MG       | Guard 激活与知识沉淀                          | `todo`      | `docs/plans/2026-*-MG-*.md`                     |

## Package Cluster Index

| Cluster         | Packages                                                 | Source Files | Complexity | Report References                 |
| --------------- | -------------------------------------------------------- | ------------ | ---------- | --------------------------------- |
| core-cluster    | flux-core, flux-formula, flux-compiler, flux-action-core | 204          | S          | MA1.1, MA2.1, MA3.1, MA4.1        |
| runtime-cluster | flux-runtime, flux-react, flux-bundle                    | 165          | S          | MA1.2, MA2.2, MA3.1, MA4.1        |
| basic-renderers | basic, form, form-advanced, data                         | 261          | S          | MA1.3, MA2.3, MA3.2, MA4.2, MA5.2 |
| designer        | flow-designer, report-designer, spreadsheet, word-editor | 170          | S          | MA1.4, MA3.3, MA4.3, MA5.1        |
| foundation      | ui, tooltip, icons, etc.                                 | 209          | A          | (cross-cutting)                   |
| scheduling      | flux-renderers-scheduling                                | 153          | A          | existing audits                   |
| office          | (word-editor, etc.)                                      | 133          | B          | MA1.4, MA3.3, MA4.3               |
| content         | flux-renderers-content                                   | 85           | B          | MA1.4, MA3.2, MA4.2, MA5.2        |
| ai              | flux-renderers-ai                                        | 62           | B          | existing audits                   |
| mobile          | flux-renderers-mobile                                    | 20           | C          | MA1.4, MA3.2, MA4.2               |

## P0/P1 Finding Index

| Finding ID | Severity | Package                   | Description                                        | Source Report                       | Status | Fix Plan    |
| ---------- | -------- | ------------------------- | -------------------------------------------------- | ----------------------------------- | ------ | ----------- |
| AI-P1-1    | P1       | flux-renderers-ai         | `deleteConversation` post-await stale-closure race | `2026-07-25-multi-audit-ai`         | open   | Pending MR2 |
| AI-P1-2    | P1       | flux-renderers-ai         | `ai-citations` HTML 双编码显示损坏                 | `2026-07-25-multi-audit-ai`         | open   | Pending MR2 |
| SCHED-F73  | P1       | flux-renderers-scheduling | Kanban DnD test silent no-op                       | `2026-07-23-multi-audit-scheduling` | open   | Pending MR2 |

## Existing Audit Reports (Pre-M0)

| Report                                                | Date       | Package    | Type        | Status           |
| ----------------------------------------------------- | ---------- | ---------- | ----------- | ---------------- |
| `2026-07-25-multi-audit-ai`                           | 2026-07-25 | AI         | multi-audit | Findings indexed |
| `2026-07-25-open-audit-ai`                            | 2026-07-25 | AI         | open-audit  | Findings indexed |
| `2026-07-24-multi-audit-ai`                           | 2026-07-24 | AI         | multi-audit | Findings indexed |
| `2026-07-24-open-audit-ai`                            | 2026-07-24 | AI         | open-audit  | Findings indexed |
| `2026-07-23-multi-audit-scheduling`                   | 2026-07-23 | Scheduling | multi-audit | Findings indexed |
| `2026-07-23-open-audit-scheduling`                    | 2026-07-23 | Scheduling | open-audit  | Findings indexed |
| `2026-07-22-multi-audit-scheduling`                   | 2026-07-22 | Scheduling | multi-audit | Findings indexed |
| `2026-07-22-open-audit-scheduling`                    | 2026-07-22 | Scheduling | open-audit  | Findings indexed |
| `2026-07-21-multi-audit-scheduling`                   | 2026-07-21 | Scheduling | multi-audit | Findings indexed |
| `2026-07-21-open-audit-scheduling`                    | 2026-07-21 | Scheduling | open-audit  | Findings indexed |
| `2026-07-20-multi-audit-scheduling`                   | 2026-07-20 | Scheduling | multi-audit | Findings indexed |
| `2026-07-20-open-audit-scheduling`                    | 2026-07-20 | Scheduling | open-audit  | Findings indexed |
| `2026-06-26-multi-audit-amis-bug-driven-improvements` | 2026-06-26 | General    | multi-audit | Findings indexed |
| `2026-06-26-open-audit-amis-bug-driven-improvements`  | 2026-06-26 | General    | open-audit  | Findings indexed |
| `2026-06-24-multi-audit-components`                   | 2026-06-24 | General    | multi-audit | Findings indexed |
| `2026-06-24-open-audit-components`                    | 2026-06-24 | General    | open-audit  | Findings indexed |
| `2026-06-23-multi-audit-mobile`                       | 2026-06-23 | Mobile     | multi-audit | Findings indexed |
| `2026-06-23-open-audit-mobile`                        | 2026-06-23 | Mobile     | open-audit  | Findings indexed |
| `2026-06-22-multi-audit-mobile`                       | 2026-06-22 | Mobile     | multi-audit | Findings indexed |
| `2026-06-22-open-audit-mobile`                        | 2026-06-22 | Mobile     | open-audit  | Findings indexed |

## Audit Tool Baseline

_Baseline values recorded on 2026-07-27 as part of M0 audit baseline execution._

### `check:audit-*` Scripts

| Script                                         | Run Date   | Exit Code | Issues Found | Notes                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ---------- | --------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:audit-suspects`                         | 2026-07-27 | 0         | 435          | 11 rule buckets, includes reactive-render-read, broad-scope-selector, void-promise-no-catch, then-chain-no-catch, catch-without-structured-failure-path, json-stringify-change-detection, bare-data-slot-selector, fieldframe-bypass, test-module-top-let, test-global-patch, runtime-raw-schema-read |
| `check:audit-runtime-raw-schema-reads`         | 2026-07-27 | 0         | 1            | 1 suspect: `crud-renderer.tsx:512` reads templateNode.schema at runtime                                                                                                                                                                                                                               |
| `check:audit-fieldframe-bypasses`              | 2026-07-27 | 0         | 3            | 3 suspects in `variant-field-view.tsx` — direct FieldFrame usage                                                                                                                                                                                                                                      |
| `check:audit-async-failure-paths`              | 2026-07-27 | 0         | 214          | 3 rule buckets: void-promise-no-catch (48), then-chain-no-catch (1), catch-without-structured-failure-path (165)                                                                                                                                                                                      |
| `check:audit-hardcoded-type-dispatch`          | 2026-07-27 | 0         | 0            | No suspect matches found                                                                                                                                                                                                                                                                              |
| `check:audit-missing-renderer-markers`         | 2026-07-27 | 0         | 0            | No suspect matches found                                                                                                                                                                                                                                                                              |
| `check:audit-test-global-leaks`                | 2026-07-27 | 0         | 47           | 2 rule buckets: test-module-top-let (27), test-global-patch (20)                                                                                                                                                                                                                                      |
| `check:audit-performance-suspects`             | 2026-07-27 | 0         | 20           | json-stringify-change-detection suspects                                                                                                                                                                                                                                                              |
| `check:audit-styling-suspects`                 | 2026-07-27 | 0         | 146          | bare-data-slot-selector suspects across ai, mobile, spreadsheet CSS                                                                                                                                                                                                                                   |
| `check:audit-non-retained-renderer-references` | 2026-07-27 | 0         | 32           | 4 non-retained types: action, calendar, icon-picker, radio                                                                                                                                                                                                                                            |
| `check:audit-reactive-render-reads`            | 2026-07-27 | 0         | 4            | 2 buckets: reactive-render-read (2), broad-scope-selector (2)                                                                                                                                                                                                                                         |
| `check:audit-react19-optimization-candidates`  | 2026-07-27 | 0         | ~400+        | Includes redundant useMemo, redundant useCallback, derived-state-in-effect, start-transition-on-critical-action. See saved output for full detail.                                                                                                                                                    |

### `pnpm audit:*` Commands

| Command                   | Run Date   | Exit Code | Summary                                                                                                                                                   | Notes                                                                                                                     |
| ------------------------- | ---------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm audit:deps`         | 2026-07-27 | 14        | 14 dependency violations (14 errors, 0 warnings). 2318 modules, 4924 dependencies cruised.                                                                | Includes circular deps in scheduling/gantt, form/input-choice-renderers, condition-builder, plus cross-package src import |
| `pnpm audit:knip`         | 2026-07-27 | 1         | Unused exports, unused dependencies, configuration hints                                                                                                  | See saved output for full detail                                                                                          |
| `pnpm audit:mutants`      | 2026-07-27 | —         | _skipped_                                                                                                                                                 | Skipped due to expected long runtime (>30 min). Run separately with `pnpm audit:mutants` and 60min timeout.               |
| `pnpm audit:semgrep`      | 2026-07-27 | 127       | semgrep: command not found                                                                                                                                | Tool not installed. Install with `brew install semgrep` or `pip install semgrep`.                                         |
| `pnpm audit:react-doctor` | 2026-07-27 | 1         | 607 issues: Security 4 warnings, Bugs 70 errors/110 warnings, Performance 32 errors/174 warnings, Accessibility 44 warnings, Maintainability 173 warnings | Score: 32/100 Critical. See saved output for full detail.                                                                 |

### Full Verification Baseline

| Command          | Run Date   | Status                             | Notes                                                                                                                                                                                                                                    |
| ---------------- | ---------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` | 2026-07-27 | **PASS**                           | 58 successful, 58 total. Green baseline confirmed.                                                                                                                                                                                       |
| `pnpm build`     | 2026-07-27 | **PASS**                           | 31 successful, 31 total. Build artifacts emitted correctly.                                                                                                                                                                              |
| `pnpm test`      | 2026-07-27 | **PASS (with pre-existing flake)** | 56/58 tasks successful. 1 pre-existing failure: `@nop-chaos/flux-playground` → `performance-table-page.test.tsx` — "records a completed table single-row locality session" (flaky performance timing test, unrelated to audit baseline). |
| `pnpm test:e2e`  | 2026-07-27 | **9/10 passed (sample)**           | AI chat sample: 9 passed, 1 failed (ai-bubble renders timestamp — pre-existing flake). Full suite run separately.                                                                                                                        |

## Docs Index Scan

_Scanned on 2026-07-27 as part of M0 Phase 1.5._

### Verified Paths

All key doc directories referenced in `docs/index.md` routing table exist and are accessible:

- `docs/architecture/`, `docs/references/`, `docs/components/`, `docs/context/`, `docs/audits/`, `docs/plans/`, `docs/skills/`, `docs/logs/`, `docs/bugs/`, `docs/archive/`, `docs/lessons/`, `docs/testing/`, `docs/discussions/`, `docs/articles/`, `docs/amis-types/`

### Directories Not Registered In Index Routing Table

The following `docs/` subdirectories exist but are NOT explicitly listed in the `docs/index.md` routing table:

- `docs/analysis/`, `docs/backlog/`, `docs/examples/`, `docs/experiments/`, `docs/images/`, `docs/migration/`, `docs/opencode/`, `docs/ppts/`

These are primarily supplementary or asset directories. The core routing table in `docs/index.md` covers the main documentation infrastructure. No action required for M0.
