# MA6 — 文档与契约一致性审计

> Plan Status: active
> Last Reviewed: 2026-07-27
> Source: `docs/backlog/audit-remediation-roadmap.md` MA6.1
> Related: MA5 (`2026-07-27-1900-1-ma5-ui-ux-audit.md`)
> Mission: audit-remediation

## Purpose

对全部包簇的 `docs/` 文档与实时代码、架构契约进行一致性审计，识别 owner-doc drift、过时描述、缺失设计文档的组件、以及文档与代码行为不符的区域，产出发现并更新 arm-index。

## Current Baseline

- MA1–MA4 以及（前置）MA5 审计阶段已完成 — 文档审计依赖这些阶段产出的最新代码理解。
- `docs/` 目录已建立完整索引（`docs/index.md` 路由表），但其中部分文档架构文件在 MA1–MA4 期间可能经历了代码变更而未同步更新。
- `docs/audits/00-audit-execution-guide.md` 中 arm-index 已完成初始化。
- `docs/backlog/audit-remediation-roadmap.md` 是当前 roadmap 的权威来源。其 Phase Status 表存在与 arm-index 不同步之处（如 MA4.1 在 roadmap 中未标记 `done` 但 audit 报告已存在），本 plan 需记录此类不一致。
- 部分 `docs/references/` 和 `docs/architecture/` 文档在审计期间可能已过时（项目上下文标记 `partially stale`）。
- `pnpm typecheck`/`build`/`test` 绿色基线已确认。

## Goals

- 对全部包簇执行文档与契约一致性审计，按 `doc-evaluation.md` + `implementation-contract-review-prompt.md` + `diff-standards-and-spec-review-prompt.md` 方法论执行。
- 核查每份 `docs/architecture/` 下设计文档的内容是否与 live repo 的代码行为一致。
- 核查 `docs/references/` 下类型/接口文档是否与最新源码导出面一致。
- 核查 `docs/components/` 下组件文档是否与实际 schema props 和渲染行为一致。
- 核查 `docs/backlog/audit-remediation-roadmap.md` 的 Phase Status 是否与 arm-index 同步。
- 对每项发现给出严重度（P0/P1/P2/P3）、类别、位置、现状、最小补建议。
- 产出审计报告 `docs/audits/arm-MA6-doc-contract.md` 并更新 arm-index。
- 发现的 P0/P1 项在 MR3 fix plan 中处理，本 plan 不做代码或文档的直接修复。

## Non-Goals

- 不修复被审计的文档（架构/参考/组件文档）、生产代码或测试代码——只产出审计发现和审计报告。审计报告本身（`docs/audits/arm-MA6-doc-contract.md`）和 arm-index 的更新属于本 plan 的产出。
- 不涉及代码质量审计（已由 MA3 覆盖）。
- 不包含 P1 修复执行。

## Scope

### In Scope

- `docs/architecture/` — 所有设计文档（flux-core.md、flux-runtime-module-boundaries.md、renderer-runtime.md、styling-system.md 等）与 live code 的一致性
- `docs/references/` — 关键参考文档（quick-reference.md、terminology.md、renderer-interfaces.md 等）的准确性
- `docs/components/` — 组件设计文档与实际 schema props 的匹配度
- `docs/context/` — project-context.md 中技术基线描述与当前 `package.json`/`tsconfig.json` 的匹配度
- `docs/backlog/audit-remediation-roadmap.md` — Phase Status 与 arm-index 和实际审计状态的一致性
- 跨包簇抽样（core-cluster、runtime-cluster、basic-renderers、designer、scheduling、AI、content、mobile、foundation）

### Out Of Scope

- `docs/logs/`（日常日志，不属契约文档）
- `docs/plans/` 执行计划的内容正确性（只检查计划完成状态标记与 live repo 的一致性）
- `docs/skills/`（工具性技能文档，不受代码变更影响）
- 代码或文档的修改

## Test Strategy

档位选择：必须自动化

审计过程中的文档比对使用子 agent 自动执行。发现的 P0/P1 需在 MR3 中处理。

## Execution Plan

### Phase 1 — 架构文档一致性核查

Status: planned
Targets: `docs/architecture/` 下全部设计文档
Skills: `doc-evaluation.md`, `implementation-contract-review-prompt.md`

- Item Types: `Proof`

- [ ] 逐份读取 `docs/architecture/` 下的设计文档
- [ ] 对每份文档，抽取其承诺的契约（API 签名、渲染器属性、样式规则、模块边界等）
- [ ] 对照 live repo 中对应源码验证契约是否一致
- [ ] 记录所有 owner-doc drift（文档描述与代码行为不一致处）
- [ ] 记录所有过时引用（引用了已删除/重命名的文件、函数、组件）
- [ ] 记录所有缺失文档（存在渲染器实现但无 `docs/components/` 下设计文档的组件）
- [ ] 发现写入 `docs/analysis/<date>-ma6/phase-01.md`

Exit Criteria:

- [ ] 所有 `docs/architecture/` 文档已完成一致性核查
- [ ] owner-doc drift 已分类记录

### Phase 2 — 参考文档与组件文档核查

Status: planned
Targets: `docs/references/`, `docs/components/`, `docs/context/`
Skills: `doc-evaluation.md`, `diff-standards-and-spec-review-prompt.md`

- Item Types: `Proof`

- [ ] 核查 `docs/references/quick-reference.md` 中类型/接口引用是否与源码最新导出面一致
- [ ] 核查 `docs/references/terminology.md` 术语定义是否与代码行为一致
- [ ] 核查 `docs/components/` 下组件文档的 schema props 列表是否与实现匹配
- [ ] 核查 `docs/context/project-context.md` 的技术基线描述是否匹配当前 `package.json` 依赖和 `tsconfig.json` 配置
- [ ] 记录所有不一致项
- [ ] 发现写入 `docs/analysis/<date>-ma6/phase-02.md`

Exit Criteria:

- [ ] 所有 `docs/references/` 和 `docs/components/` 文档已完成核查
- [ ] project-context.md 与技术基线的偏差已记录

### Phase 3 — Roadmap 状态同步核查与报告产出

Status: planned
Targets: `docs/backlog/audit-remediation-roadmap.md`, `docs/audits/arm-index.md`, `docs/audits/arm-MA6-doc-contract.md`

- Item Types: `Decision | Proof`

- [ ] 核查 `docs/backlog/audit-remediation-roadmap.md` 的 Phase Status 表与 arm-index 中对应状态是否一致
- [ ] 记录所有不同步的条目
- [ ] 汇总所有 Phase 1-3 发现到 `docs/audits/arm-MA6-doc-contract.md`
- [ ] 更新 `docs/audits/arm-index.md` 中 MA6 条目指向报告路径
- [ ] 如有 P0/P1 发现，追加到 arm-index P0/P1 Finding Index 并标记 `Pending MR3`

Exit Criteria:

- [ ] 审计报告文件已落盘
- [ ] arm-index 已更新
- [ ] P0/P1 发现已在 arm-index 中标记 `Pending MR3`

## Draft Review Record

> 待独立子 agent review。本段在 review 通过后填写。

- Reviewer / Agent: TBD
- Verdict: `pending`
- Rounds: TBD
- Findings addressed: TBD

## Closure Gates

- [ ] 所有 Phase Exit Criteria 已勾选
- [ ] `docs/audits/arm-MA6-doc-contract.md` 已落盘
- [ ] `docs/audits/arm-index.md` MA6 条目已更新
- [ ] 发现的 P0/P1 已追加到 arm-index P0/P1 Finding Index
- [ ] 无被静默降级的 in-scope live defect（本 plan 为纯审计，不引入修复项）
- [ ] 受影响的 owner docs 已同步或明确标注 No owner-doc update required
- [ ] 由独立子 agent 执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

本 plan 为纯审计 plan，不引入 deferred 修复项。发现的 P0/P1 移交 MR3 fix plan；P2/P3 记录在审计报告中并由 roadmap 统一裁决。

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 待完成

Closure Audit Evidence:

- Auditor / Agent: TBD
- Evidence: TBD

Follow-up:

- P0/P1 findings → MR3 fix plan
- P2/P3 findings → recorded in audit report, adjudicated by roadmap
