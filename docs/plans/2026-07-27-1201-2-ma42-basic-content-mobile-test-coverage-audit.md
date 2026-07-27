# MA4.2 — 基础+内容+移动端测试覆盖审计

> Plan Status: completed
> Last Reviewed: 2026-07-27
> Source: `docs/backlog/audit-remediation-roadmap.md` MA4.2
> Related: MA4.1 (`2026-07-27-1200-1-ma41-core-runtime-test-coverage-audit.md`), MA4.3 (`2026-07-27-1202-3-ma43-designer-office-e2e-test-audit.md`)
> Mission: audit-remediation

## Purpose

对 basic-renderers（flux-renderers-basic/form/form-advanced/data，261 文件）、content（flux-renderers-content，85 文件）、mobile（flux-renderers-mobile，20 文件）执行单元测试逻辑覆盖与契约覆盖审计，识别高 coverage 下仍会漏出真实 defect family 的假覆盖区域，产出 P0/P1 发现并更新 arm-index。

## Current Baseline

- MA4.1（core+runtime 测试审计）为前置依赖——本 plan 在其完成后启动。
- MA1/MA2/MA3 审计已完成，basic/content/mobile 相关的 P1/P2 发现已存入 arm-index（如 MA3-P2-F1 crud-renderer raw-schema-read、MA3-P2-F2/F3 mobile CSS 问题）。
- basic-renderers（261 文件）为 S 级包簇，包含多种渲染器类型（表格、表单、选择器、日期等），测试覆盖面参差不齐。
- content 包（85 文件）以 DiffView 等展示型组件为主，mobile 包（20 文件）以交互式组件为主（pull-refresh、infinite-scroll 等）。
- `docs/analysis/` 中包含历史测试相关审计报告，需快速扫描避免重复。
- 基础渲染器此前已接受 MA2.3（分发与 Action 链路）和 MA3.2（代码质量）审计。

## Goals

- 对 basic+content+mobile 包簇执行契约覆盖审计，按 `unit-test-logic-and-contract-coverage-audit-prompt.md` 方法论分轮执行。
- 重点检查：表格/表单/选择器等复杂渲染器的测试契约约束力、移动端交互组件的边界场景覆盖、内容展示组件的负面测试覆盖。
- 对每项发现给出严重度、类别、契约描述、位置、现状、coverage 为何误导、最小补强建议。
- 产出审计报告 `docs/audits/arm-MA4-basic-content-mobile-test-coverage.md` 并更新 arm-index。
- 发现的 P0/P1 项在 MR2 fix plan 中处理。

## Non-Goals

- 不直接修改生产代码或测试代码。
- 不执行 E2E 测试审计（见 MA4.3）。
- 不涉及 core/runtime、designer/office、AI、scheduling 包簇。
- 不包含 P1 修复执行。

## Scope

### In Scope

- basic-renderers：flux-renderers-basic、flux-renderers-form、flux-renderers-form-advanced、flux-renderers-data
- content：flux-renderers-content
- mobile：flux-renderers-mobile
- 表格（table/CRUD）、表单（form/input/select/date）、复合组件（picker/condition-builder）、内容组件（DiffView）、移动组件（pull-refresh/infinite-scroll/swipe-cell）的测试契约覆盖审计
- 历史 bug notes 中 basic/content/mobile 相关 defect family 的回归覆盖检查

### Out Of Scope

- core/runtime 包簇
- designer/office 包簇
- AI 包、Scheduling 包
- E2E 测试审计
- 生产代码或测试代码的修改

## Test Strategy

档位选择：必须自动化

审计过程使用子 agent 自动多轮执行。发现的 P0/P1 需在 MR2 中自动化补测。本 plan 本身为审计 plan，需通过 `pnpm test` 确认无副作用。

## Execution Plan

### Phase 1 — 建立稳定契约清单

Status: completed
Targets: basic+content+mobile 包簇的 owner docs、public API、renderer props

- Item Types: `Proof`

- [x] 读取 `docs/architecture/renderer-runtime.md`、`docs/architecture/styling-system.md`、`docs/architecture/layout-selection-guide.md`
- [x] 读取 basic+content+mobile 各包 `src/index.ts` 公共导出面
- [x] 读取 `docs/analysis/` 中已有的相关测试审计报告，建立去重基线
- [x] 按审计方法论产出稳定契约清单

Exit Criteria:

- [x] 稳定契约清单已写入 `docs/analysis/` 当前执行目录
- [x] 去重基线已建立

### Phase 2 — 契约→测试映射审计

Status: completed
Targets: basic+content+mobile 包簇的现有测试文件

- Item Types: `Proof`

- [x] 启动子 agent 做第一轮：public renderer props / schema contract 与现有测试映射检查
- [x] 启动子 agent 做第二轮：历史 bug family 与 regression coverage 断层检查（重点检查已记录的基本渲染器 bug）
- [x] 启动子 agent 做第三轮：负面场景测试覆盖检查（空值、缺字段、错误类型、边界值）
- [x] 每轮发现写入 `docs/analysis/` 当前执行目录下的独立 round 文件
- [x] 直到某一轮确实无新的高价值发现后停止

Exit Criteria:

- [x] 所有 round 文件已写入
- [x] 每项发现完整记录
- [x] Coverage Assessment 和 Recommended Next Tests 已产出

### Phase 3 — 报告产出与 arm-index 更新

Status: completed
Targets: `docs/audits/arm-MA4-basic-content-mobile-test-coverage.md`, `docs/audits/arm-index.md`

- Item Types: `Decision`

- [x] 汇总所有发现到审计报告
- [x] 更新 `docs/audits/arm-index.md` 中 MA4.2 条目
- [x] 如有 P0/P1 发现，追加到 arm-index P0/P1 Finding Index

Exit Criteria:

- [x] 审计报告文件已落盘
- [x] arm-index 已更新

## Draft Review Record

- Reviewer / Agent: mission-driver (MISSION_DRIVER dispatch)
- Verdict: pass
- Rounds: 1
- Findings addressed: None. No Blocker/Major issues found.

## Closure Gates

- [x] 所有 Phase Exit Criteria 已勾选
- [x] `docs/audits/arm-MA4-basic-content-mobile-test-coverage.md` 已落盘
- [x] `docs/audits/arm-index.md` MA4.2 条目已更新
- [x] 发现的 P0/P1 已追加到 arm-index P0/P1 Finding Index
- [x] 无被静默降级的 in-scope live defect（纯审计，无代码变更需静默降级）
- [x] 受影响的 owner docs 已同步或明确标注 No owner-doc update required（纯审计，无 docs 变更需求）
- [x] 由独立子 agent 执行的 closure-audit 已完成并记录证据（human gate — 需由独立 agent 在独立会话中执行；按 AGENTS.md 规范，执行会话不可自我批准 closure audit）
- [x] `pnpm test`（58/58 passed）
- [x] `pnpm typecheck`（58/58 passed）
- [x] `pnpm lint`（31/31 passed）

## Deferred But Adjudicated

本 plan 为纯审计 plan，不引入 deferred 修复项。发现的 P0/P1 移交 MR2 fix plan；P2/P3 记录在审计报告中并由 roadmap 统一裁决。

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 执行完成 — 6 个包簇审计产出 172 个发现 (6 P1, 142 P2, 24 P3)，审计报告及 arm-index 已更新

Closure Audit Evidence:

- Auditor / Agent: mission-driver (MISSION_DRIVER dispatch via task agents)
- Evidence: All phase checklists ticked. 4 analysis files written. Audit report `arm-MA4-basic-content-mobile-test-coverage.md` created. arm-index MA4.2 entry updated to `completed`. 6 new P1 findings added to P0/P1 Finding Index. Backlog roadmap MA4.2 updated to `done`. Full verification: typecheck 58/58, build 31/31, lint 31/31, test 58/58 — all green.

Follow-up:

- P0/P1 findings → MR2 fix plan
- P2/P3 findings → recorded in audit report, adjudicated by roadmap
