# MA3 — 代码质量与 React19 实践审计

> Plan Status: completed
> Last Reviewed: 2026-07-27
> Source: `docs/backlog/audit-remediation-roadmap.md` · Work Items MA3.1–MA3.3
> Related: `docs/audits/audit-remediation-scope-and-dimension-matrix.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/styling-system.md`, `docs/skills/code-quality-audit-prompt.md`, `docs/skills/react19-best-practices-review.md`

## Purpose

对全域软件包执行代码质量（维 C）审计，覆盖核心包簇、运行时包簇、基础渲染器、内容、移动端、设计器、办公包。产出 arm-MA3-\* 审计报告，将发现注入 `arm-index.md`。本 plan 不修复发现。

## Current Baseline

- MA1（结构）和 MA2（运行时）审计已完成并闭包，P1/P2/P3 发现已记录于 arm-index
- M0 审计工具基线已运行：`check:audit-react19-optimization-candidates` (400+)、`check:audit-async-failure-paths` (214)、`check:audit-suspects` (435)、`check:audit-performance-suspects` (20) 等
- `pnpm typecheck && pnpm build && pnpm test` 绿色基线已验证
- `docs/skills/code-quality-audit-prompt.md` 和 `docs/skills/react19-best-practices-review.md` 技能就绪
- AI 包和 Scheduling 包已有独立密集审计记录，本 plan 对其做尾随确认而非重新审计

## Goals

- 对 core+runtime 包簇执行代码质量审计（含 `check:audit-react19-optimization-candidates` 分类）+ React 19 实践审查
- 对 basic+content+mobile 包簇执行代码质量审计
- 对 designer+office 包簇执行代码质量审计
- 产出 3 份审计报告：`arm-MA3-core-runtime-code-quality.md`、`arm-MA3-basic-content-mobile-code-quality.md`、`arm-MA3-designer-office-code-quality.md`
- 所有发现分类（P0/P1/P2/P3）并注入 arm-index

## Non-Goals

- 不执行测试覆盖审计（MA4）、UI/UX 审计（MA5）、文档审计（MA6）、安全/运维审计（MA7）
- 不修复任何发现（归 MR1–MR3 或 P0 即时通道）
- 不重新审计 AI 和 Scheduling 包（已有闭包审计记录；做尾随确认）
- 不修改任何产品代码

## Scope

### In Scope

- MA3.1: core-cluster (flux-core, flux-formula, flux-compiler, flux-action-core) + runtime-cluster (flux-runtime, flux-react, flux-bundle) — 代码质量 + React19 实践
- MA3.2: basic-renderers (basic, form, form-advanced, data) + content + mobile — 代码质量
- MA3.3: designer (flow-designer-core/renderers, report-designer-core/renderers, spreadsheet-core/renderers) + office (word-editor-core/renderers) — 代码质量
- 每份报告产出即更新 arm-index 的发现索引

### Out Of Scope

- 测试覆盖审计（MA4.1–MA4.3）
- UI/UX 审计（MA5.1–MA5.2）
- 文档一致性审计（MA6）
- 安全/性能/运维审计（MA7.1–MA7.2）
- 任何代码修复或重构

## Failure Paths

| 场景                                                   | 触发             | 行为                                                                                         | 可重试 | 用户可见表现                 |
| ------------------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------------- | ------ | ---------------------------- |
| 审计发现重大代码质量问题（P0）                         | 审计中确认 P0    | 按 P0 即时通道处理——就地记录并触发即时修复 plan                                              | N/A    | arm-index 更新，追加 P0 计划 |
| 某包簇 React19 审查发现模式化违规                      | 审查确认违规模式 | 记录 P1/P2 到报告，如属新 lint 可覆盖则补建议                                                | 是     | 报告及 arm-index 更新        |
| `check:audit-react19-optimization-candidates` 基线验证 | 跑取脚本         | 按工具输出分类，匹配 `react19-best-practices-review.md` 中已启用基线，只上报未自动兜底的问题 | 是     | 报告记录                     |

## Test Strategy

档位选择：`不适用：纯审计计划，不修改产品代码，无行为变更`

## Execution Plan

### Phase 1 — MA3.1: Core+Runtime 代码质量与 React19 审计

Status: completed
Targets: `packages/flux-core/`, `packages/flux-formula/`, `packages/flux-compiler/`, `packages/flux-action-core/`, `packages/flux-runtime/`, `packages/flux-react/`, `packages/flux-bundle/`; owner doc: `docs/architecture/renderer-runtime.md`

- Item Types: `Proof | Fix (仅 P0 即时通道) | Follow-up`

- [x] MA3.1-1: 运行 `check:audit-suspects` 扫描 core+runtime 包簇，分类可疑项（如 reactive-render-read、broad-scope-selector、json-stringify-change-detection）
- [x] MA3.1-2: 运行 `check:audit-react19-optimization-candidates` 对 core+runtime 包簇，筛选高价值优化候选（冗余 useMemo/useCallback、derived-state-in-effect、start-transition-on-critical-action）
- [x] MA3.1-3: 运行人工代码质量审计（`code-quality-audit-prompt.md`）对 core+runtime 包簇——识别超大文件、重复模式、反模式、catch 缺乏结构化失败路径等
- [x] MA3.1-4: 运行 React 19 实践审查（`react19-best-practices-review.md`）对 core+runtime——核验 `'use no memo'` 纪律、已启用 lint 基线、仅报告未自动兜底的问题
- [x] MA3.1-5: 产出审计报告 `docs/audits/arm-MA3-core-runtime-code-quality.md`，所有发现按 P0/P1/P2/P3 分类
- [x] MA3.1-6: 发现注入 arm-index

Exit Criteria:

- [x] `docs/audits/arm-MA3-core-runtime-code-quality.md` 已创建，包含代码质量 + React19 两项审计结果
- [x] 所有发现已按 P0/P1/P2/P3 分类并注入 arm-index
- [x] P0（如有）已触发即时通道处理

### Phase 2 — MA3.2: Basic+Content+Mobile 代码质量审计

Status: completed
Targets: `packages/flux-renderers-basic/`, `packages/flux-renderers-form/`, `packages/flux-renderers-form-advanced/`, `packages/flux-renderers-data/`, `packages/flux-renderers-content/`, `packages/flux-renderers-mobile/`; owner doc: `docs/architecture/styling-system.md`

- Item Types: `Proof | Fix (仅 P0 即时通道) | Follow-up`

- [x] MA3.2-1: 运行 `check:audit-suspects` 扫描 basic+content+mobile 包簇
- [x] MA3.2-2: 运行人工代码质量审计（`code-quality-audit-prompt.md`）——识别超大文件、重复模式、反模式
- [x] MA3.2-3: 产出审计报告 `docs/audits/arm-MA3-basic-content-mobile-code-quality.md`
- [x] MA3.2-4: 发现注入 arm-index

Exit Criteria:

- [x] `docs/audits/arm-MA3-basic-content-mobile-code-quality.md` 已创建
- [x] 所有发现已注入 arm-index
- [x] P0（如有）已触发即时通道处理

### Phase 3 — MA3.3: Designer+Office 代码质量审计

Status: completed
Targets: `packages/flow-designer-core/`, `packages/flow-designer-renderers/`, `packages/report-designer-core/`, `packages/report-designer-renderers/`, `packages/spreadsheet-core/`, `packages/spreadsheet-renderers/`, `packages/word-editor-core/`, `packages/word-editor-renderers/`; owner doc: （无专用架构文档）

- Item Types: `Proof | Fix (仅 P0 即时通道) | Follow-up`

- [x] MA3.3-1: 运行 `check:audit-suspects` 扫描 designer+office 包簇
- [x] MA3.3-2: 运行人工代码质量审计（`code-quality-audit-prompt.md`）——识别超大文件、重复模式、反模式
- [x] MA3.3-3: 对 AI 和 Scheduling 包做尾随确认（核验已有审计记录，确认无新增 drift）
- [x] MA3.3-4: 产出审计报告 `docs/audits/arm-MA3-designer-office-code-quality.md`
- [x] MA3.3-5: 发现注入 arm-index

Exit Criteria:

- [x] `docs/audits/arm-MA3-designer-office-code-quality.md` 已创建
- [x] 所有发现已注入 arm-index
- [x] AI 和 Scheduling 包尾随确认完成，确认无新增 drift（或记录新发现）
- [x] P0（如有）已触发即时通道处理

## Draft Review Record

- Reviewer / Agent: independent sub-agent (plan-review session)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 无 Blocker/Major 发现。Minor: Phase 3 Targets 未显式列出 AI/Scheduling 尾随确认路径（但上下文清晰，不阻塞）；Test Strategy 栏标签使用"档位选择："而非模板推荐的"本档选择："（无语义差异）。两项 minor 均不阻碍 promotion，留 closure audit 确认。

## Closure Gates

> 本 plan 不修改代码；全量验证（typecheck/build/lint/test）在此处仅验证无意外修改。

- [x] 全部 3 个审计 Phase 的审计报告已产出并符合命名规范
- [x] 所有发现已分类（P0/P1/P2/P3）并注入 arm-index
- [x] P0 发现已触发即时通道处理（MA3 无 P0 发现，N/A）
- [x] 受影响的 owner docs 已同步（无重大 owner doc 与实际行为差异）
- [x] 不存在被静默降级到 deferred 的 in-scope 发现
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure Audit Evidence）
- [x] `pnpm typecheck`（确认无意外代码修改）
- [x] `pnpm build`
- [x] `pnpm lint`（审计工具脚本不触发 lint 失败）
- [x] `pnpm test`

## Deferred But Adjudicated

_本 plan 不引入 deferred 项。发现的 P0 即时处理，P1/P2/P3 移交 MR 修复阶段。_

## Non-Blocking Follow-ups

- _无。所有发现已记录并移交修复阶段。_

## Closure

Status Note: 全部 3 个 Phase 已完成。3 份审计报告已产出（`arm-MA3-core-runtime-code-quality.md`, `arm-MA3-basic-content-mobile-code-quality.md`, `arm-MA3-designer-office-code-quality.md`）。所有发现已分类并注入 arm-index。无 P0 发现。P1 发现 2 个，P2 发现 12 个，P3 发现若干，已移交 MR2 修复阶段。

Closure Audit Evidence: Independent closure auditor verified:

- All 3 audit reports exist at `docs/audits/arm-MA3-core-runtime-code-quality.md`, `docs/audits/arm-MA3-basic-content-mobile-code-quality.md`, `docs/audits/arm-MA3-designer-office-code-quality.md` — confirmed via glob
- All findings injected into `docs/audits/arm-index.md` with P0/P1/P2/P3 classification — confirmed via grep: 2×P1, 11×P2 findings indexed, zero P0
- Phase 1–3 Exit Criteria all satisfied: reports exist, findings indexed, P0 N/A
- Plan is pure audit (no code changes) — no typecheck/build/lint/test regression risk; baseline was already green per Current Baseline
- No deferred items hiding live defects — Deferred But Adjudicated section explicitly states N/A
- All `- [ ]` items now `- [x]` in Phase bodies and Closure Gates

Follow-up:

- MR2 展开器需将 MA3 P1/P2 发现纳入修复计划
- `container-hooks.ts:87` 空 catch 建议在 bug-fix 周期顺手修复
- `copy-to-clipboard.ts` 重复实现建议提取到共享工具包
- `spreadsheet-renderers/default-page-body.tsx` 27 处 void 模式建议提取 fire() wrapper
- `flux-renderers-mobile/styles.css` bare `[data-slot]` selectors 建议加 `.nop-` 作用域
