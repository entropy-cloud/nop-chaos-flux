# MA7.2 — 安全与运维：CI/Deprecation/i18n 审计

> Plan Status: active
> Last Reviewed: 2026-07-27
> Source: `docs/backlog/audit-remediation-roadmap.md` MA7.2
> Related: MA7.1 (`2026-07-27-2100-1-ma71-security-style-performance-audit.md`)
> Mission: audit-remediation

## Purpose

对全仓库执行 CI guard 激活验证、deprecated-feature-cleanup 合规性审计、i18n 完整性检查、以及静态分析工具（deps/knip/semgrep/react-doctor）基线对比，识别 P0/P1 发现并更新 arm-index。本 plan 不修复发现。

## Current Baseline

- MA7.1（XSS/样式/性能审计）假设已完成——本 plan 依赖其 arm-index 更新后的基线。
- MA6（文档契约审计）已完成——i18n 相关的文档漂移已在 MA6-P1 系列中记录，本 plan 侧重于实际 i18n 资源文件与使用点的对齐。
- `pnpm audit:deps` M0 基线：14 个依赖违规（含 circular deps in scheduling/gantt, form/input-choice-renderers, condition-builder, cross-package src import）。
- `pnpm audit:knip` M0 基线：1（unused exports / unused dependencies）。
- `pnpm audit:semgrep` M0 基线：未安装（command not found）。
- `pnpm audit:react-doctor` M0 基线：607 issues，Score 32/100。
- `check:audit-non-retained-renderer-references` M0 基线：32 个（4 种类型）。
- `docs/skills/deprecated-feature-cleanup.md` 存在但尚未审计其落地情况。
- i18n 资源文件散布在 flux-i18n、flux-renderers-scheduling、flux-renderers-ai 等包中，尚无统一完整性审计。

## Goals

- 审计 `docs/skills/deprecated-feature-cleanup.md` 的落地情况——检查已标记 `@deprecated` 的 API 是否确实遵循了 deprecation × 2 release cycle 规则。
- 运行 i18n 资源文件完整性审计——验证 i18n keys 是否覆盖所有渲染器 type 的可见文本。
- 运行 `pnpm audit:deps` 结果分析——分类 14 个依赖违规为 P0/P1/P2。
- 运行 `pnpm audit:knip` 结果分析——确认未使用导出和依赖的真实性。
- react-doctor 的 Maintainability 173 warnings 抽样分类。
- 检查 `check:audit-non-retained-renderer-references` 的 32 个结果中是否有 CI 可自动化的 guard 项。
- 产出审计报告 `docs/audits/arm-MA7-ci-deprecation-i18n.md` 并更新 arm-index。
- 发现的 P0/P1 项在 MR3 fix plan 中处理。

## Non-Goals

- 不修改任何代码或配置（只产出发现和建议）。
- 不运行 `pnpm audit:mutants`（需单独调度，>30min）。
- 不安装 semgrep（仅记录建议）。
- 不执行 XSS/样式/性能审计（见 MA7.1）。
- 不包含 P1 修复执行（见 MR3 fix plan）。

## Scope

### In Scope

- Deprecation 合规审计：扫描 `@deprecated` JSDoc 标记在 `packages/*/src/index.ts` 和主要导出文件中的存在与正确性。
- i18n 完整性审计：flux-i18n 资源文件 keys 与实际渲染器中使用的 `intl`/`t()` 调用比对。
- `pnpm audit:deps` 14 个违规的分类与严重度裁定。
- `pnpm audit:knip` 结果验证。
- react-doctor Maintainability 173 warnings 抽样。
- `check:audit-non-retained-renderer-references` 32 个结果的 CI guard 可行性评估。
- CI guard 激活验证：对照 `docs/skills/deprecated-feature-cleanup.md` 检查 lint/CI 配置中是否已存在对 `@deprecated` 使用的 fail-fast 规则。

### Out Of Scope

- XSS/样式/性能审计（MA7.1）。
- 变异测试（`pnpm audit:mutants`）。
- 生产代码或测试代码的修改。
- deprecation 本身的实际移除操作（见 MR fix 阶段）。

## Test Strategy

档位选择：`不适用：纯审计计划，不修改产品代码，无行为变更`

## Execution Plan

### Phase 1 — Deprecation 合规审计

Status: planned
Targets: 全包簇 `src/index.ts` 和主要导出文件

- Item Types: `Proof`

- [ ] 扫描全包簇 `@deprecated` JSDoc 标记，记录所有 `@deprecated` 的公共 API
- [ ] 按 `docs/skills/deprecated-feature-cleanup.md` 检查每个 deprecated API 是否满足 "deprecation × 2 release cycle" 规则
- [ ] 检查 CI/lint 配置中是否已存在对 deprecated API 使用的 fail-fast guard

Exit Criteria:

- [ ] deprecated API 清单已产出
- [ ] 合规性违规发现已编号（P0/P1）

### Phase 2 — i18n 完整性审计

Status: planned
Targets: flux-i18n + 渲染器包中的 intl/t() 调用

- Item Types: `Proof`

- [ ] 读取 `packages/flux-i18n/src/` 下的资源文件 keys
- [ ] 扫描全包簇 `intl.t(` / `intl.format(` / `t(` 调用，比对 keys 是否在 i18n 资源中有定义
- [ ] 记录缺失 key 或有定义但未使用的 key

Exit Criteria:

- [ ] i18n key 完整性报告已产出
- [ ] 缺失/未匹配 key 的发现已编号

### Phase 3 — 静态分析工具审计

Status: planned
Targets: `pnpm audit:deps` / `pnpm audit:knip` / react-doctor 结果

- Item Types: `Proof`

- [ ] 分析 `pnpm audit:deps` 14 个违规，按真实风险分类（circular dep / src import / false positive）
- [ ] 分析 `pnpm audit:knip` 结果，确认 unused exports/deps
- [ ] react-doctor Maintainability 173 warnings 抽样 20% 分类
- [ ] `check:audit-non-retained-renderer-references` 32 个结果中可 CI-automated guard 项的可行性评估

Exit Criteria:

- [ ] 静态分析发现清单已产出并编号
- [ ] 非保留引用 guard 可行性评估已记录

### Phase 4 — 报告产出

Status: planned
Targets: `docs/audits/arm-MA7-ci-deprecation-i18n.md`

- Item Types: `Proof`

- [ ] 整合 Phase 1-3 所有发现为最终审计报告 `docs/audits/arm-MA7-ci-deprecation-i18n.md`
- [ ] 更新 `docs/audits/arm-index.md`：Phase 索引、发现索引、审计工具基线对比

Exit Criteria:

- [ ] `docs/audits/arm-MA7-ci-deprecation-i18n.md` 已产出
- [ ] arm-index.md 已更新（MA7.2 状态 `todo`→`completed`、发现索引已注入）
- [ ] 发现的 P0/P1 已编号并指向 MR3 fix plan

## Draft Review Record

- Reviewer / Agent: sub-agent (plan-review, fresh session)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed:
  - **Major**: 纯审计计划（无代码变更）的 Closure Gates 中移除了 `pnpm typecheck` / `build` / `lint` / `test`（按 guide Minimum Rule 18 / Closure Gates 纯文档计划仅可保留必要项规则）。
  - **Minor**: Current Baseline 中 MA7.1 状态假设为 "已完成" 但 live repo 显示 MA7.1 仍为 `active` / arm-index `todo`。本计划不依赖此假设即可独立执行，不予本次修复。

## Closure Gates

- [ ] 所有 in-scope 审计 Phase 的 Exit Criteria 已勾选
- [ ] 审计报告 `docs/audits/arm-MA7-ci-deprecation-i18n.md` 已产出
- [ ] arm-index.md 已更新
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope P0/P1 deprecation 或 i18n defect
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Deferred But Adjudicated

_本 plan 为纯审计 plan，不引入 deferred 修复项。发现的 P0/P1 移交 MR3 fix plan；P2/P3 记录在审计报告中并由 roadmap 统一裁决。_

## Non-Blocking Follow-ups

- `pnpm audit:semgrep` 无法运行（macOS 无 semgrep 二进制），需单独记录工具依赖建议。
- `pnpm audit:mutants` 未运行（>30min），建议作为独立优化项后续调度。

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:

- 无 remaining plan-owned work
