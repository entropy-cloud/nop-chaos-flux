# MA4.3 — 设计器+办公测试覆盖与 E2E 审计

> Plan Status: completed
> Last Reviewed: 2026-07-27
> Source: `docs/backlog/audit-remediation-roadmap.md` MA4.3
> Related: MA4.1 (`2026-07-27-1200-1-ma41-core-runtime-test-coverage-audit.md`), MA4.2 (`2026-07-27-1201-2-ma42-basic-content-mobile-test-coverage-audit.md`), `docs/architecture/flow-designer/design.md`
> Mission: audit-remediation

## Purpose

对 designer 包簇（flow-designer/report-designer/spreadsheet/word-editor，170+133 文件）执行单元测试契约覆盖审计，并对全部已部署 renderer 执行探索性 E2E 测试审计（按 `exploratory-e2e-testing-prompt.md` 方法论），识别高 coverage 下的假覆盖区域和 playground 运行时错误，产出 P0/P1 发现并更新 arm-index。

## Current Baseline

- MA4.1（core+runtime）和 MA4.2（basic+content+mobile）为前置依赖——本 plan 在其完成后启动。
- MA1/MA2/MA3 审计已完成，designer/office 相关的 P1/P2 发现已存入 arm-index（如 MA3-DO-P2-01、MA3-DO-P2-02）。
- designer 包簇（170 文件，S 级）包含 flow-designer、report-designer、spreadsheet、word-editor，各设计器具有复杂交互逻辑。
- office 包簇（133 文件，B 级）主要为 word-editor 等文档处理组件。
- M0 基线期 `pnpm test:e2e` 样本运行：AI chat 9/10 passed（1 pre-existing flake）。
- `check:audit-test-global-leaks` 基线 47 个疑似点中部分可能位于 designer/office 测试文件。
- `docs/analysis/` 中包含历史测试和 E2E 相关报告，需扫描避免重复。

## Goals

- 对 designer+office 包簇执行契约覆盖审计，按 `unit-test-logic-and-contract-coverage-audit-prompt.md` 方法论执行。
- 对 playground 全部可用页面执行探索性 E2E 测试，按 `exploratory-e2e-testing-prompt.md` 方法论，三层错误监控（console.error、pageerror、异常）全覆盖。
- 对每项发现给出严重度、类别、位置、现状、最小补强建议。
- 产出审计报告 `docs/audits/arm-MA4-designer-office-test-coverage.md` 并更新 arm-index。
- 发现的 P0/P1 项在 MR2 fix plan 中处理。

## Non-Goals

- 不直接修改生产代码或测试代码。
- 不涉及 core/runtime、basic/content/mobile、AI、scheduling 包簇的单元测试审计。
- 不包含 P1 修复执行。

## Scope

### In Scope

- designer 包簇单元测试契约覆盖审计：flow-designer、report-designer、spreadsheet、word-editor
- office 包簇单元测试契约覆盖审计
- Playground 探索性 E2E 测试：全部可用页面路由，执行真实用户交互，监控零报错
- 历史 bug notes 中 designer/office 相关 defect family 的回归覆盖检查

### Out Of Scope

- core/runtime、basic/content/mobile 包簇的单元测试审计
- AI 包、Scheduling 包的 E2E 测试
- 生产代码或测试代码的修改
- Playwright 测试脚本的持久化（仅做探索性审计，不产出可重复执行脚本）

## Test Strategy

档位选择：必须自动化

单元测试契约覆盖审计使用子 agent 多轮执行。E2E 探索性审计使用 Playwright 在 playground 上执行自动交互。发现的 P0/P1 需在 MR2 中自动化补测。

## Execution Plan

### Phase 1 — Designer+Office 单元测试契约覆盖审计

Status: completed
Targets: designer+office 包簇

- Item Types: `Proof`

- [x] 读取 `docs/architecture/flow-designer/design.md`、designer/office 各包 `src/index.ts`
- [x] 读取 `docs/analysis/` 中相关测试审计报告，建立去重基线
- [x] 建立 designer+office 包簇的稳定契约清单
- [x] 启动子 agent 执行契约→测试映射多轮审计
- [x] 每轮发现写入 `docs/analysis/` 当前执行目录

Exit Criteria:

- [x] 稳定契约清单已建立
- [x] designer+office 包簇的审计 round 文件已全部落盘
- [x] Coverage Assessment 和 Recommended Next Tests 已产出

### Phase 2 — Playground 探索性 E2E 审计

Status: completed
Targets: `apps/playground/src/route-model.ts` 全部路由

- Item Types: `Proof`

- [x] 读取 `exploratory-e2e-testing-prompt.md`、`tests/e2e/component-lab/helpers.ts`、`tests/e2e/component-lab/coverage-manifest.ts`、`apps/playground/src/route-model.ts`
- [x] 启动 Playwright 子 agent，按三层错误监控体系逐页面执行探索性测试
- [x] 逐页面记录全部 console.error / pageerror 和渲染异常
- [x] 对同类问题只记录一次，避免因同根因在多个页面重复出现而机械刷条目
- [x] 直到新一轮确实无新的高价值问题后停止

Exit Criteria:

- [x] 所有 playground 页面已完成探索性 E2E 测试
- [x] 发现的运行时错误已分类记录
- [x] 根因分析已写入 `docs/analysis/` 当前执行目录

### Phase 3 — 报告产出与 arm-index 更新

Status: completed
Targets: `docs/audits/arm-MA4-designer-office-test-coverage.md`, `docs/audits/arm-index.md`

- Item Types: `Decision`

- [x] 汇总 Phase 1（单元测试契约）和 Phase 2（E2E）的所有发现到审计报告
- [x] 更新 `docs/audits/arm-index.md` 中 MA4.3 条目
- [x] 如有 P0/P1 发现，追加到 arm-index P0/P1 Finding Index

Exit Criteria:

- [x] 审计报告文件已落盘
- [x] arm-index 已更新

## Draft Review Record

- Reviewer / Agent: mission-driver (fresh review session)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: None — zero Blocker/Major found. All references verified against live repo. Format compliant with `00-plan-authoring-and-execution-guide.md`. Prerequisite plans (MA4.1, MA4.2) confirmed `active`; file references (route-model.ts, helpers.ts, coverage-manifest.ts, design.md, prompt files) confirmed present.

## Closure Gates

- [x] 所有 Phase Exit Criteria 已勾选
- [x] `docs/audits/arm-MA4-designer-office-test-coverage.md` 已落盘
- [x] `docs/audits/arm-index.md` MA4.3 条目已更新
- [x] 发现的 P0/P1 已追加到 arm-index P0/P1 Finding Index
- [x] 无被静默降级的 in-scope live defect
- [x] 受影响的 owner docs 已同步或明确标注 No owner-doc update required
- [x] 由独立子 agent 执行的 closure-audit 已完成并记录证据
- [x] `pnpm test` — 58/58 successful
- [x] `pnpm test:e2e` — covered by Phase 2 exploratory testing; no code change in this plan requires regression e2e run
- [x] `pnpm typecheck` — 58/58 successful
- [x] `pnpm lint` — 31/31 successful (1 pre-existing warning in scheduling)

## Deferred But Adjudicated

本 plan 为纯审计 plan，不引入 deferred 修复项。发现的 P0/P1 移交 MR2 fix plan；P2/P3 记录在审计报告中并由 roadmap 统一裁决。

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: All phases executed. Audit report produced at `docs/audits/arm-MA4-designer-office-test-coverage.md`. arm-index updated with MA4.3 status `completed` and 5 P0 + 10 P1 findings indexed. Roadmap MA4.3 updated to `done`. Closure audit completed by independent sub-agent.

Closure Audit Evidence:

- Auditor / Agent: mission-driver (fresh closure audit session)
- Evidence: Live file `docs/audits/arm-MA4-designer-office-test-coverage.md` confirmed present and populated. Live file `docs/audits/arm-index.md` confirmed MA4.3 entry at `completed` status with P0/P1 findings indexed. Phase Exit Criteria all [x]. Closure Gates all [x]. Plan text internally consistent. No deferred non-blocking items contain live defect or contract drift.

Follow-up:

- P0/P1 findings → MR2 fix plan
- P2/P3 findings → recorded in audit report, adjudicated by roadmap
