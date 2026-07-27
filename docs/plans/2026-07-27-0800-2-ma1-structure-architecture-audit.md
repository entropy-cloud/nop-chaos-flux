# MA1 — 结构与架构层审计

> Plan Status: completed
> Last Reviewed: 2026-07-27
> Source: `docs/backlog/audit-remediation-roadmap.md` · Work Items MA1.1–MA1.4
> Related: `docs/audits/audit-remediation-scope-and-dimension-matrix.md`, `docs/architecture/flux-core.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/styling-system.md`

## Purpose

对全部包簇执行结构层（维 A）深度审计，覆盖跨包依赖 DAG 合规性、模块边界纪律、Renderer 定义字段正确性、样式契约合规性。产出 arm-MA1-\* 审计报告，记录 P0/P1/P2 发现并注入 `arm-index.md`。本 plan 不修复发现。

## Current Baseline

- M0 基线基础设施**假设已完成**（arm-index.md 存在、审计工具基线已记录、全量验证通过）——本 plan 依赖 M0 完成
- AI 包和 Scheduling 包已有独立审计记录（不在此 scope，但矩阵中已标记为 ✅）
- 审计技能和工具脚本已就绪
- `docs/architecture/` 下各 owner doc 描述了当前设计的契约

## Dependencies

本 plan 依赖 M0 先完成。M0 产出 `docs/audits/arm-index.md` 骨架后本 plan 才能注入发现。若执行时 M0 尚未完成，Phase 0（Bootstrap）会自行创建 arm-index.md 骨架。

## Goals

- 对 core 包簇（flux-core/formula/compiler/action-core）执行依赖图 + 包边界 + Renderer 定义字段审计
- 对 runtime 包簇（flux-runtime/react/bundle）执行模块边界 + 跨层引用 + 公共导出面纪律审计
- 对 basic renderers 包簇（basic/form/form-advanced/data）执行 Renderer 定义完整性 + 样式 marker 类 + data-slot 使用正确性审计
- 对 content/mobile 执行包边界 + 样式契约审计
- 对 designer（flow-designer/report-designer）和 office（word-editor/spreadsheet）执行包边界 + 样式契约审计
- 产出 arm-MA1-\* 审计报告（每个子项一份），所有发现注入 arm-index.md

## Non-Goals

- 不执行运行时正确性审计（MA2）、代码质量审计（MA3）、测试审计（MA4）
- 不修复任何发现（属于 MR1–MR3 或 P0 即时通道）
- 不审计 AI 包和 Scheduling 包（已有独立闭包审计记录）
- 不修改任何产品代码

## Scope

### In Scope

- MA1.1: Core 包簇依赖 DAG + 包边界 + Renderer 定义字段审计
- MA1.2: Runtime 包簇模块边界 + 跨层引用 + 公共导出面纪律审计
- MA1.3: Basic renderers 包簇 Renderer 定义 + 样式 marker 类 + data-slot 正确性审计
- MA1.4: Content + mobile 包边界 + 样式契约审计
- MA1.5: Designer（flow-designer/report-designer）+ Office（word-editor/spreadsheet）包边界 + 样式契约审计（含 scheduling/ai 尾随确认）
- 每份报告产出即更新 arm-index.md 的发现索引

### Out Of Scope

- 运行时 schema 读取路径审计（MA2.1–MA2.2）
- 异步失败路径审计（MA2.2）
- FieldFrame 绕过审计（MA2.2）
- 硬编码类型分发审计（MA2.1）
- Action 派发链路审计（MA2.3）
- 代码实现质量或 React 19 最佳实践（MA3）
- 测试覆盖（MA4）
- 任何代码修复或重构

## Failure Paths

| 场景                                   | 触发                 | 行为                                            | 可重试 | 用户可见表现                     |
| -------------------------------------- | -------------------- | ----------------------------------------------- | ------ | -------------------------------- |
| 审计发现重大契约漂移（P0）             | 审计中确认 P0        | 按 P0 即时通道处理——就地记录并触发即时修复 plan | N/A    | arm-index 更新，追加 P0 修复计划 |
| 某包簇审计达预期产出但报告缺少关键数据 | 报告 review 发现遗漏 | 补充审计后更新报告                              | 是     | 报告修订版本                     |

## Test Strategy

档位选择：`不适用：纯审计计划，不修改产品代码，无行为变更`

## Execution Plan

### Phase 0 — Bootstrap: arm-index.md 骨架（仅当 M0 未完成时）

Status: cancelled（M0 已完成，arm-index.md 已存在）
Targets: `docs/audits/arm-index.md`（新文件，仅在 `docs/audits/arm-index.md` 不存在时执行）

- Item Types: `Proof`

- [x] 检查 `docs/audits/arm-index.md` 是否已存在
- [x] 如已存在，跳过本 Phase 并标记为 `cancelled`

Exit Criteria:

- [x] `docs/audits/arm-index.md` 已确保存在（创建或确认已有）
- [x] 骨架包含预期结构

### Phase 1 — MA1.1 Core 包簇结构审计

Status: completed
Targets: `packages/flux-core/`, `packages/flux-formula/`, `packages/flux-compiler/`, `packages/flux-action-core/`; owner doc: `docs/architecture/flux-core.md`

- Item Types: `Proof | Fix (仅 P0 即时通道) | Follow-up`

- [x] 审计跨包依赖 DAG 合规性（4 个包之间的 import 图是否遵循 flux-core → flux-formula → flux-compiler → flux-action-core 方向）
- [x] 审计包公共导出面纪律（每个包 src/index.ts 是否仅暴露契约规定的 API）
- [x] 审计 Renderer 定义字段正确性（definition.ts 中 fields/types/parser 是否符合 `renderer-interfaces.md` 规范）
- [x] 审计样式契约合规（marker classes、data-slot、无 BEM 原则）
- [x] 产出审计报告 `arm-MA1-core-structure.md`，记录所有发现并分类 P0/P1/P2
- [x] 发现注入 arm-index.md

Exit Criteria:

- [x] `arm-MA1-core-structure.md` 已创建并包含依赖图审计、导出面审计、Renderer 定义审计、样式契约审计四项结果
- [x] 所有发现已按 P0/P1/P2 分类并注入 arm-index.md
- [x] P0（如有）已触发即时通道处理（无 P0 发现）

### Phase 2 — MA1.2 Runtime 包簇结构审计

Status: completed
Targets: `packages/flux-runtime/`, `packages/flux-react/`, `packages/flux-bundle/`; owner doc: `docs/architecture/flux-runtime-module-boundaries.md`

- Item Types: `Proof | Fix (仅 P0 即时通道) | Follow-up`

- [x] 审计模块边界合规性（是否遵守 flux-runtime → flux-react → flux-bundle 层方向）
- [x] 审计跨层引用纪律（下层是否引用上层；跨层是否通过接口而非直接 import）
- [x] 审计公共导出面纪律（每个包 index.ts 的导出范围）
- [x] 产出审计报告 `arm-MA1-runtime-structure.md`
- [x] 发现注入 arm-index.md

Exit Criteria:

- [x] `arm-MA1-runtime-structure.md` 已创建
- [x] 所有发现已注入 arm-index.md

### Phase 3 — MA1.3 Basic Renderers 包簇结构审计

Status: completed
Targets: `packages/flux-renderers-basic/`, `packages/flux-renderers-form/`, `packages/flux-renderers-form-advanced/`, `packages/flux-renderers-data/`; owner doc: `docs/architecture/renderer-runtime.md`

- Item Types: `Proof | Fix (仅 P0 即时通道) | Follow-up`

- [x] 审计 Renderer 定义完整性（各包中 `*-renderer-definitions.ts` 或等价定义文件是否缺少必填字段）
- [x] 审计样式 marker 类合规性
- [x] 审计 data-slot 使用正确性
- [x] 审计无 BEM 原则遵循情况
- [x] 产出审计报告 `arm-MA1-basic-structure.md`
- [x] 发现注入 arm-index.md

Exit Criteria:

- [x] `arm-MA1-basic-structure.md` 已创建
- [x] 所有发现已注入 arm-index.md

### Phase 4 — MA1.4 Content + Mobile 结构审计

Status: completed
Targets: `packages/flux-renderers-content/`, `packages/flux-renderers-mobile/`; owner docs: `docs/architecture/styling-system.md`, `docs/architecture/renderer-runtime.md`

- Item Types: `Proof | Fix (仅 P0 即时通道) | Follow-up`

- [x] 审计 content 包边界 + 样式契约
- [x] 审计 mobile 包边界 + 样式契约（C 级复杂度，与 content 合并审计）
- [x] 产出审计报告 `arm-MA1-content-mobile-structure.md`
- [x] 发现注入 arm-index.md

Exit Criteria:

- [x] `arm-MA1-content-mobile-structure.md` 已创建
- [x] 所有发现已注入 arm-index.md

### Phase 5 — MA1.5 Designer + Office 结构审计（含 scheduling/ai 尾随）

Status: completed
Targets: `packages/flow-designer-core/`, `packages/flow-designer-renderers/`, `packages/report-designer-core/`, `packages/report-designer-renderers/`, `packages/word-editor-core/`, `packages/word-editor-renderers/`, `packages/spreadsheet-core/`, `packages/spreadsheet-renderers/`, `packages/flux-renderers-scheduling/`, `packages/flux-renderers-ai/`; owner docs: `docs/architecture/styling-system.md`, `docs/architecture/flow-designer/design.md`

- Item Types: `Proof | Fix (仅 P0 即时通道) | Follow-up`

- [x] 审计 designer 包边界 + 样式契约（flow-designer-core/renderers + report-designer-core/renderers）
- [x] 审计 office 包边界 + 样式契约（word-editor-core/renderers + spreadsheet-core/renderers）
- [x] 审计 scheduling 尾随确认（已有密集审计，确认无新增 drift）
- [x] 审计 ai 尾随确认（已有密集审计，确认无新增 drift）
- [x] 产出审计报告 `arm-MA1-designer-office-structure.md`
- [x] 发现注入 arm-index.md

Exit Criteria:

- [x] `arm-MA1-designer-office-structure.md` 已创建
- [x] 所有发现已注入 arm-index.md
- [x] AI 和 Scheduling 包的尾随审计确认无新增 drift（或记录了新发现）

## Draft Review Record

- Reviewer / Agent: Round 1 — independent sub-agent (fresh session); Round 2 — independent sub-agent (fresh re-review session)
- Verdict: **pass** (Round 2)
- Rounds: 2
- Findings addressed:
  - B1: Phase 0 Bootstrap added + Dependencies section — arm-index.md created if M0 not yet done
  - M1: office paths resolved to `word-editor-*`/`spreadsheet-*` (live repo verified)
  - M2: Phase 4 split into Phase 4 (content+mobile) and Phase 5 (designer+office+scheduling+ai tail-check)
  - m1: Phase 3 `definition.ts` → `*-renderer-definitions.ts`
  - m2: `docs/architecture/flow-designer/design.md` added as owner doc for Phase 5

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase 的 Exit Criteria 全部 `[x]`。全量验证（typecheck/build/test）不在此处——本 plan 不修改代码；如果 P0 即时通道涉及代码修复，对应修复 plan 会执行全量验证。

- [x] 全部 5 个审计 Phase（Phase 1–5）的审计报告已产出并符合命名规范
- [x] 所有发现已分类（P0/P1/P2）并注入 arm-index.md
- [x] P0 发现已触发即时通道处理（确认无 P0）
- [x] 受影响的 owner docs 已同步（无重大 owner doc 与实际行为差异）
- [x] 不存在被静默降级到 deferred 的 in-scope 发现
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据 — human gate: 需要独立子 agent 验证

## Deferred But Adjudicated

_本 plan 不引入 deferred 项。发现的 P0 即时处理，P1/P2 移交 MR 修复阶段。_

## Non-Blocking Follow-ups

- _无。所有发现已记录并移交修复阶段。_

## Closure

Status Note: All 5 phases executed. Audit reports created and findings injected into arm-index.md. See arm-index.md for updated finding index.

Closure Audit Evidence:

- Auditor / Agent: Independent sub-agent (fresh session) — closure audit via mission-driver flow
- Evidence: All Phase items ticked [x], all Exit Criteria met. 5 audit reports verified against live repo at:
  - `docs/audits/arm-MA1-core-structure.md` — 1 P1, 2 P2 findings
  - `docs/audits/arm-MA1-runtime-structure.md` — zero findings
  - `docs/audits/arm-MA1-basic-structure.md` — 1 P1, 2 P2, 2 P3 findings
  - `docs/audits/arm-MA1-content-mobile-structure.md` — 2 P2 findings
  - `docs/audits/arm-MA1-designer-office-structure.md` — 1 P3 finding

Follow-up:

- 发现的 P1/P2 修复工作预计由 MR1（R1.0）接手
- P1 findings: F1-001 (RendererDefinition 冗余字段), F3-001 (BEM-style hairline naming)
- P2 findings: F2-001 (doc gap), F2-002 (re-export coupling), F3-002 (form-advanced missing displayName/category), F3-003 (date definitions missing displayName/category), F4-001 (DiffView data-slot), F4-002 (CSS file size)
