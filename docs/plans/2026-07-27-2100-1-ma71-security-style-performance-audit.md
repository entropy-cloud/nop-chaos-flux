# MA7.1 — 安全与运维：XSS/样式/性能审计

> Plan Status: completed
> Last Reviewed: 2026-07-27
> Source: `docs/backlog/audit-remediation-roadmap.md` MA7.1
> Related: MA7.2 (`2026-07-27-2100-2-ma72-ci-deprecation-i18n-audit.md`)
> Mission: audit-remediation

## Purpose

对全包簇执行安全（XSS 路径抽样）、样式合规（check:audit-styling-suspects）、性能（check:audit-performance-suspects + check:audit-non-retained-renderer-references）多维审计，识别 P0/P1 发现并更新 arm-index。本 plan 不修复发现。

## Current Baseline

- MA1-MA6 审计全部完成，arm-index 已包含 MA1-MA6 的所有发现。
- `check:audit-styling-suspects` M0 基线：146 个疑似（bare-data-slot-selector 跨 ai/mobile/spreadsheet CSS）。
- `check:audit-performance-suspects` M0 基线：20 个 json-stringify-change-detection 疑似。
- `check:audit-non-retained-renderer-references` M0 基线：32 个非保留渲染器引用（action/calendar/icon-picker/radio 四种类型）。
- `check:audit-async-failure-paths` M0 基线：214 个（void-promise-no-catch 48 + then-chain-no-catch 1 + catch-without-structured-failure-path 165）。
- `pnpm audit:deps` 基线：14 个依赖违规（含 circular deps）。
- `pnpm audit:knip` 基线：1（unused exports + unused deps）。
- `pnpm audit:mutants` — 未运行（>30min，单独调度）。
- `pnpm audit:semgrep` — 未安装。
- `pnpm audit:react-doctor` 基线：607 issues，Score 32/100 Critical。
- AI 包和 Scheduling 包已有独立安全审计记录（可在现有报告基础上追加抽样，不重复全量）。
- `pnpm typecheck`/`build`/`test` 绿色基线已确认。

## Goals

- 执行 XSS 路径抽样审计——在全包簇内识别潜在跨站脚本注入路径（dangerouslySetInnerHTML、动态 HTML 模板注入、未 sanitize 的用户内容渲染）。
- 运行 `check:audit-styling-suspects` 并审计 146 个 bare-data-slot-selector 疑似，裁定哪些需修复、哪些为误报。
- 运行 `check:audit-performance-suspects` 并审计 20 个 json-stringify-change-detection 疑似。
- 运行 `check:audit-non-retained-renderer-references` 并审计 32 个非保留渲染器引用。
- 抽样审计异步失败路径（void-promise-no-catch + catch-without-structured-failure-path），识别 P0/P1 模式的真实 defect family。
- 产出审计报告 `docs/audits/arm-MA7-security-style-performance.md` 并更新 arm-index。
- 发现的 P0/P1 项在 MR3 fix plan 中处理。

## Non-Goals

- 不直接修改产品代码或测试代码（只产出发现和建议）。
- 不执行全量依赖图扫描（M0 已覆盖）。
- 不涉及 CI/Deprecation/i18n 审计（见 MA7.2）。
- 不执行变异测试（需单独调度，>30min）。
- 不安装或运行 semgrep（需 macOS 工具安装）。
- 不包含 P1 修复执行（见 MR3 fix plan）。

## Scope

### In Scope

- XSS 路径抽样：全包簇 `dangerouslySetInnerHTML`、`innerHTML`、`document.write`、动态 `src`/`href` 注入、markdown/html 渲染路径。
- `check:audit-styling-suspects`：146 个 bare-data-slot-selector 审计，裁定是否误报。
- `check:audit-performance-suspects`：20 个 json-stringify-change-detection 审计。
- `check:audit-non-retained-renderer-references`：32 个非保留引用审计（action/calendar/icon-picker/radio）。
- 异步失败路径抽样：48 void-promise-no-catch + 165 catch-without-structured-failure-path 交叉抽样。
- react-doctor 607 issues 的 P0/P1 抽样分类。

### Out Of Scope

- CI/guard 验证、deprecated-feature-cleanup、i18n 完整性检查（见 MA7.2）。
- `pnpm audit:deps` 依赖违规修复（见 MR 修复阶段）。
- `pnpm audit:mutants` 运行（需单独调度）。
- 生产代码或测试代码的修改。

## Test Strategy

档位选择：`不适用：纯审计计划，不修改产品代码，无行为变更`

## Execution Plan

### Phase 1 — XSS 路径抽样审计

Status: completed
Targets: 全包簇 src/ 目录

- Item Types: `Proof`

- [x] 在全包簇内搜索 `dangerouslySetInnerHTML`、`innerHTML`（非 `.textContent`）、`document.write`、`document.writeln`、eval 类动态执行
- [x] 审计 markdown/html 渲染器（content/mobile/ai 包）的 HTML 输出是否经过 sanitize
- [x] 审计动态 `src`/`href`/`srcdoc` 属性是否可能被注入
- [x] 按包簇产出 XSS 发现清单（含严重度、位置、输入源、最小建议）

Exit Criteria:

- [x] XSS 路径发现清单已完成并写入审计报告草案
- [x] 所有 P0 发现已进入 P0 即时通道

### Phase 2 — 样式合规审计（check:audit-styling-suspects）

Status: completed
Targets: 全包簇 CSS 文件

- Item Types: `Proof | Decision`

- [x] 审查 146 个 bare-data-slot-selector 疑似，逐条记录裁定（误报 / 需修复 / 需降级）
- [x] 对确认需修复的样式违规给出 P1 严重度建议

Exit Criteria:

- [x] 146 个疑似的裁定清单已完成
- [x] 确认需修复的 P1 样式违规已编号并记入发现清单

### Phase 3 — 性能、引用泄漏与异步失败路径审计（check:audit-performance-suspects + non-retained-references + async-failure-paths）

Status: completed
Targets: 全包簇 src/ 目录

- Item Types: `Proof`

- [x] 审计 20 个 json-stringify-change-detection 疑似，识别真实性能 defect（React 19 infinite-loop 风险）
- [x] 审计 32 个非保留渲染器引用（action/calendar/icon-picker/radio），裁定是否属于 renderer 泄漏
- [x] 异步失败路径交叉抽样：从 48 void-promise-no-catch + 165 catch-without-structured-failure-path 中抽样 20%，识别真实 defect family

Exit Criteria:

- [x] 性能审计发现清单已完成
- [x] 非保留引用裁定清单已完成
- [x] 异步失败路径抽样发现清单已完成

### Phase 4 — react-doctor 问题分类 + 报告产出

Status: completed
Targets: `docs/audits/arm-MA7-security-style-performance.md`

- Item Types: `Proof`

- [x] 对 react-doctor 607 issues 做 P0/P1 分类抽样（聚焦 Security 4 warnings + Bugs 70 errors）
- [x] 整合 Phase 1-3 所有发现为最终审计报告 `docs/audits/arm-MA7-security-style-performance.md`
- [x] 更新 `docs/audits/arm-index.md`：Phase 索引、P0/P1/P2 发现索引、Audit Tool Baseline 数值对比
- [x] 对 react-doctor Score 32/100 中的 P0/P1 项目编号注入 arm-index

Exit Criteria:

- [x] `docs/audits/arm-MA7-security-style-performance.md` 已产出
- [x] arm-index.md 已更新（MA7.1 状态、发现、审计工具基线）
- [x] 发现的 P0/P1 已编号并指向 MR3 fix plan

## Draft Review Record

- Reviewer / Agent: mission-driver (review session)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed:
  - Phase 2 Item Types `Fix` contradicted Non-Goals (no code changes) → changed to `Proof | Decision`
  - Phase 3 title expanded to cover async failure paths
  - Phase 4 "Phase 1-4" → "Phase 1-3"
  - `pnpm lint` added to Closure Gates

## Closure Gates

- [x] 所有 in-scope 审计 Phase 的 Exit Criteria 已勾选
- [x] 审计报告 `docs/audits/arm-MA7-security-style-performance.md` 已产出
- [x] arm-index.md 已更新（MA7.1 状态 `todo`→`completed`、发现索引已注入、审计工具基线已对比）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope P0/P1 security 或 performance defect
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（fresh sub-agent 完成 — 见 Closure Audit Evidence）
- [x] `pnpm typecheck` — 58 successful, 58 total ✅
- [x] `pnpm build` — 31 successful, 31 total ✅
- [x] `pnpm lint` — 31 successful, 31 total ✅
- [x] `pnpm test` — 58 successful, 58 total (142 tests passed) ✅

## Deferred But Adjudicated

_本 plan 为纯审计 plan，不引入 deferred 修复项。发现的 P0/P1 移交 MR3 fix plan；P2/P3 记录在审计报告中并由 roadmap 统一裁决。_

## Non-Blocking Follow-ups

- 无（审计 plan，修复由 MR3 处理）

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent: closure-audit-fresh-session
- Evidence: Verified all 4 Phase Status lines = `completed`; all `- [ ]` items ticked `- [x]`; all exit criteria checked. Audit report exists at `docs/audits/arm-MA7-security-style-performance.md` (204 lines, well-formed). arm-index shows MA7.1 = `completed` with correct report path; 3 P2 findings (MA7-XSS-P2-01, MA7-STY-P2-01, MA7-ASYNC-P2-01) indexed under P2 section; no P0/P1 findings from MA7.1 exist or were silently downgraded — all categorized as P2 with rationale. 7/8 closure gates ticked (gate 155 was this session's task). Verdict: **pass**.

Follow-up:

- 无 remaining plan-owned work
