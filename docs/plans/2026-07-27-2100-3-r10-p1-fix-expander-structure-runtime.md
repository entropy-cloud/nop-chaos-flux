# R1.0 — P1 修复展开器：结构+运行时（MA1+MA2）

> Plan Status: active
> Last Reviewed: 2026-07-27
> Source: `docs/backlog/audit-remediation-roadmap.md` R1.0
> Related: MA1 审计（`docs/plans/2026-07-27-0800-2-ma1-structure-architecture-audit.md`）、MA2 审计（`docs/plans/2026-07-27-0800-3-ma2-runtime-correctness-audit.md`）、R2.0（后续）
> Mission: audit-remediation

## Purpose

R1.0 是"展开器"（expander）工作项。本 plan 的交付物不是代码修复，而是：对 MA1（结构层审计）和 MA2（运行时正确性审计）产出的 P1/P2 发现，逐条裁决修复方案、预估工作量、依赖关系，然后展开为 `docs/backlog/audit-remediation-roadmap.md` 中新增的具体修复工作项行（R1.1, R1.2, ...）。本 plan 完成后，实际的代码修复由后续计划执行。

## Current Baseline

- MA1.1-MA1.4 结构审计已完成。MA1 发现已注入 `docs/audits/arm-index.md`（Pending MR1）。
- MA2.1-MA2.3 运行时审计已完成。MA2 发现已注入 `docs/audits/arm-index.md`（Pending MR1）。
- 当前 arm-index 中标记 `Pending MR1` 的发现包括：

  **P1（2 项）：**
  - MA1-P1-001：`RendererDefinition` 冗余声明 4 个从 `RendererDefinitionShape` 继承的字段（`packages/flux-core/src/types/renderer-core.ts:286-289`）
  - MA1-P1-002：BEM 风格 `nop-hairline--*` 修饰符命名违反无 BEM 原则（basic/form/form-advanced/ui 包）

  **P2（8 项）：**
  - MA1-P2-001：`docs/references/renderer-interfaces.md` 字段映射缺少 `deepFields`/`compilation`/`validationDefaults`/`frameRootTag`
  - MA1-P2-002：flux-action-core 便利再导出 flux-core debounce 函数造成传递耦合
  - MA1-P2-003：flux-renderers-form-advanced 19 个渲染器缺少 `displayName`/`category`
  - MA1-P2-004：flux-renderers-form 7 个 date 渲染器缺少 `displayName`/`category`
  - MA1-P2-005：flux-renderers-content DiffView 根元素缺少 `data-slot` 属性
  - MA1-P2-006：flux-renderers-content CSS 文件~600 行 DiffView 样式，建议提取到单独文件
  - MA2-RT-F01：runtime 包簇 20 个 async void-promise patterns（缺少结构化错误路由注释，属代码质量契约缺口）
  - MA2-CORE-F03：core 包簇 15 个 async void-promise patterns（同上）

- `pnpm typecheck`/`build`/`test` 绿色基线已确认。

## Goals

- 对 arm-index 标记 `Pending MR1` 的全部 10 项发现（2 P1 + 8 P2），逐项裁决修复方案、受影响文件清单、预估工作量、相互依赖关系。
- 对每项发现给出明确的分类：`Fix`（代码修改）、`Docs`（文档修正）、或 `Adjudicated-deferred`（经裁定可延期，附理由）。
- 向 `docs/backlog/audit-remediation-roadmap.md` 追加具体修复工作项行（R1.1, R1.2, ...），每个工作项对应一条已裁决 fix 发现。
- 更新 `docs/audits/arm-index.md` 中 `Pending MR1` 发现的状态（指向具体 R1.x 工作项编号）。
- 本 plan 不执行任何代码或文档修复。

## Non-Goals

- 不执行代码修复或文档更新（属于后续 R1.x 实际执行计划）。
- 不涉及 MA3/MA4/MA5/MA6/MA7 的发现（属于 R2.0/R3.0）。
- 不重新审计 MA1/MA2 发现（直接使用已有审计报告）。
- 不裁决跨维度优先级冲突（属于 R4.0）。

## Scope

### In Scope

- MA1-P1-001 裁决（RendererDefinition 冗余字段修剪）
- MA1-P1-002 裁决（BEM 命名修正）
- MA1-P2-001 裁决（renderer-interfaces.md 字段补充）
- MA1-P2-002 裁决（action-core re-export 耦合修复）
- MA1-P2-003 裁决（form-advanced displayName/category）
- MA1-P2-004 裁决（date renderers displayName/category）
- MA1-P2-005 裁决（DiffView data-slot）
- MA1-P2-006 裁决（DiffView CSS 提取）
- MA2-RT-F01 裁决（runtime async void-promises）
- MA2-CORE-F03 裁决（core async void-promises）
- 向 roadmap 追加 R1.1 ~ R1.N 工作项

### Out Of Scope

- MA3/MA4/MA5/MA6/MA7 的任何发现
- 代码或文档的实际修改
- 跨维度优先级裁决（R4.0）

## Test Strategy

档位选择：`不适用：纯展开器计划，不修改产品代码，无行为变更`

## Execution Plan

### Phase 1 — 逐项裁决与展开

Status: planned
Targets: `docs/audits/arm-index.md` Pending MR1 发现 + `docs/backlog/audit-remediation-roadmap.md`

- Item Types: `Decision`

- [ ] **(Decision)** MA1-P1-001：检查 `RendererDefinition` 和 `RendererDefinitionShape` 的 live 类型签名，确认冗余声明确实可安全移除而无 breakage。裁决修复方案（单文件 4 行删除）、预估工作量（<1h）。
- [ ] **(Decision)** MA1-P1-002：检查 `nop-hairline--*` 的使用点 count，裁决重命名方案（映射到 `nop-hairline-*` 移除双连字符修饰符）。预估受影响文件数。
- [ ] **(Decision)** MA1-P2-001：裁决 `docs/references/renderer-interfaces.md` 补充方案并标出新增内容位置。
- [ ] **(Decision)** MA1-P2-002：裁决 action-core re-export 是"移除"还是"添加 deprecation 注释后保留"。
- [ ] **(Decision)** MA1-P2-003/004：裁决 displayName/category 添加方案（枚举 + 映射）。
- [ ] **(Decision)** MA1-P2-005：裁决 DiffView `data-slot` 添加方案。
- [ ] **(Decision)** MA1-P2-006：裁决 DiffView CSS 提取方案（提取到新文件 + 调整 @import）。
- [ ] **(Decision)** MA2-RT-F01/F03：裁决 async void-promise 注释添加标准（统一 structured-failure-path 注释格式）及受影响文件数。
- [ ] 逐项记录裁决结论（修复方案 + 影响范围 + 工作量评级 S/M/L + 依赖关系）。

Exit Criteria:

- [ ] 全部 10 项发现的裁决记录已完成
- [ ] 不存在未经裁决的 `Pending MR1` 发现

### Phase 2 — Roadmap 展开

Status: planned
Targets: `docs/backlog/audit-remediation-roadmap.md`

- Item Types: `Decision`

- [ ] 将 Phase 1 裁决的 Fix 项追加为 `docs/backlog/audit-remediation-roadmap.md` 中 MR1 节的具体工作项 R1.1 ... R1.N
- [ ] 对每项 R1.x 写明确保目标、依赖关系、对应 finding ID
- [ ] 更新 `docs/audits/arm-index.md` 中 Pending MR1 发现的状态（从 `Pending MR1` 改为指向具体 R1.x 编号）

Exit Criteria:

- [ ] `docs/backlog/audit-remediation-roadmap.md` 的 MR1 节已包含展开的具体修复工作项 R1.1 ... R1.N
- [ ] arm-index.md 中的对应发现状态已更新
- [ ] 所有在 Phase 1 中裁定为 deferred 的项已明确标注并附理由

## Draft Review Record

- Reviewer / Agent: mission-driver (this session)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed:
  1. **Major**: removed `pnpm typecheck`/`build`/`test` from Closure Gates (pure-docs plan per Min Rule 18).

## Closure Gates

- [ ] 全部 10 项 MA1+MA2 发现已在 Phase 1 中完成裁决
- [ ] `docs/backlog/audit-remediation-roadmap.md` 的 MR1 节已展开具体修复工作项 R1.1 ... R1.N
- [ ] arm-index.md 中对应发现的状态已从 `Pending MR1` 指向具体 R1.x 编号
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 所有 deferred 项有明确 `Why Not Blocking Closure` 理由
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
      _不适用：纯文档计划，不产生代码变更（仅修改 `docs/` 下的文件）。参见 Plan Authoring Guide Minimum Rule 18 例外。_

## Deferred But Adjudicated

_本 plan 为 expander plan，仅对发现进行裁决。任何被裁定为 deferred 的项会在 Phase 1 记录理由，并在 Phase 2 更新 arm-index。预计无项目被 deferred（所有 10 项均为已确认的 live 发现）。_

## Non-Blocking Follow-ups

- 无（expander plan，不引入 follow-up）

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:

- R1.1 ... R1.N 的具体代码修复由后续 MR1 fix execution plan 执行
