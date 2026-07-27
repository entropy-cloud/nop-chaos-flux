# MA2 — 运行时正确性层审计

> Plan Status: active
> Last Reviewed: 2026-07-27
> Source: `docs/backlog/audit-remediation-roadmap.md` · Work Items MA2.1–MA2.3
> Related: `docs/audits/audit-remediation-scope-and-dimension-matrix.md`, `docs/architecture/flux-core.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/action-scope-and-imports.md`

## Purpose

对核心包簇和运行时包簇执行运行时正确性（维 B）深度审计，覆盖 Schema 校验有效性、裸 schema 读取、FieldFrame 绕过、异步失败路径、硬编码类型分发、Action 派发链路完整性。产出 arm-MA2-\* 审计报告，记录 P0/P1/P2 发现并注入 arm-index.md。

## Current Baseline

- M0 基线基础设施**假设已完成**（arm-index.md 存在、审计工具基线已记录）
- MA1（结构审计）**假设已完成**——arm-index.md 中已记录 MA1 审计发现
- 审计工具可用：`check:audit-runtime-raw-schema-reads`、`check:audit-async-failure-paths`、`check:audit-fieldframe-bypasses`、`check:audit-hardcoded-type-dispatch`
- AI 包中 `check:audit-runtime-raw-schema-reads` 结果为 0 hits（已记录在矩阵）
- AI 包中 Async failure paths 有 1 P2 残留（已记录在矩阵）

## Dependencies

本 plan 依赖 M0（arm-index.md 骨架）和 MA1（arm-index.md 中已注入 MA1 审计发现）先完成。若执行时 arm-index.md 尚不存在，Phase 0（Bootstrap）会自行创建骨架；MA1 未完成则注记为无 MA1 基线，MA2 发现独立记录。

## Goals

- 审计核心包簇 Schema 校验规则是否覆盖所有 renderer
- 验证 `check:audit-hardcoded-type-dispatch` 扫描结果
- 审计运行时包簇：对 `check:audit-runtime-raw-schema-reads`、`check:audit-async-failure-paths`、`check:audit-fieldframe-bypasses` 每个命中进行抽样验证
- 审计基础渲染器：硬编码分发路径 + Action 派发链路完整性
- 产出 arm-MA2-\* 审计报告，发现注入 arm-index.md

## Non-Goals

- 不执行结构/架构层审计（MA1 已完成）
- 不执行代码质量审计（MA3）
- 不修复任何发现（属于 MR1–MR3 或 P0 即时通道）
- 不修改任何产品代码

## Scope

### In Scope

- MA2.1: Core 包簇 Schema 校验有效性审计 + 硬编码类型分发审计（含 `check:audit-hardcoded-type-dispatch`）
- MA2.2: Runtime 包簇裸读取 + 异步路径 + FieldFrame 绕过审计（含对应三组 check:audit-\* 脚本 + 抽样验证）
- MA2.3: Basic renderers 分发 + Action 链路审计
- 每份报告产出即更新 arm-index.md 的发现索引

### Out Of Scope

- AI 包和 Scheduling 包的运行时审计（已有独立审计记录，矩阵中已标注）
- 代码质量或测试覆盖审计（MA3–MA4）
- 任何代码修复或重构
- 结构/架构层审计以外的维度

## Failure Paths

| 场景                              | 触发                 | 行为                                        | 可重试 | 用户可见表现                     |
| --------------------------------- | -------------------- | ------------------------------------------- | ------ | -------------------------------- |
| check:audit-\* 脚本命中过多需抽样 | 某脚本输出 >20 候选  | 抽样验证前 20 个 + 随机 5 个，记录抽样策略  | 是     | 报告中注明抽样方法               |
| P0 确认                           | 审计中发现 P0 级缺陷 | 按 P0 即时通道——就地记录并触发即时修复 plan | N/A    | arm-index 更新，追加 P0 修复计划 |
| check:audit-\* 脚本报错无法运行   | 脚本运行时异常       | 记录为工具不可用，使用 grep 替代            | 是     | 报告中说明替代方法               |

## Test Strategy

档位选择：`不适用：纯审计计划，不修改产品代码，无行为变更`

## Execution Plan

### Phase 0 — Bootstrap: arm-index.md 骨架与依赖检查

Status: planned
Targets: `docs/audits/arm-index.md`

- Item Types: `Proof`

- [ ] 检查 `docs/audits/arm-index.md` 是否存在；如不存在则创建骨架
- [ ] 检查 arm-index.md 中是否已有 MA1 发现记录；如无则注记为 "MA1 completed status: unknown"
- [ ] 记录当前依赖状态（M0 基线、MA1 发现）以备 closure 核对

Exit Criteria:

- [ ] arm-index.md 已确保存在
- [ ] 依赖状态已记录（MA1 完成或未知，不影响 MA2 执行）

### Phase 1 — MA2.1 Core 包簇 Schema + 硬编码分发审计

Status: planned
Targets: `packages/flux-core/`, `packages/flux-formula/`, `packages/flux-compiler/`, `packages/flux-action-core/`; owner doc: `docs/architecture/flux-core.md`

- Item Types: `Proof | Fix (仅 P0 即时通道) | Follow-up`

- [ ] 运行 `check:audit-hardcoded-type-dispatch` 扫描核心包簇，记录命中和误报
- [ ] 审计 Schema 校验规则是否覆盖所有已知 renderer type（对照 `docs/components/amis-baseline-matrix.md` 或等价清单）
- [ ] 对每个命中候选进行抽样验证，确认是否属于真实问题
- [ ] 产出审计报告 `arm-MA2-core-schema-dispatch.md`
- [ ] 发现注入 arm-index.md

Exit Criteria:

- [ ] `arm-MA2-core-schema-dispatch.md` 已创建并包含 Schema 校验审计 + 硬编码分发审计结果
- [ ] 所有发现已注入 arm-index.md
- [ ] P0（如有）已触发即时通道处理

### Phase 2 — MA2.2 Runtime 包簇裸读取 + 异步路径 + FieldFrame 绕过审计

Status: planned
Targets: `packages/flux-runtime/`, `packages/flux-react/`; tail-check: `packages/flux-bundle/`（预期 0 findings，小聚合器仅 ~6 文件/80 行）；owner doc: `docs/architecture/renderer-runtime.md`

- Item Types: `Proof | Fix (仅 P0 即时通道) | Follow-up`

- [ ] 运行 `check:audit-runtime-raw-schema-reads`，抽样验证每个命中候选
- [ ] 运行 `check:audit-async-failure-paths`，抽样验证每个命中候选
- [ ] 运行 `check:audit-fieldframe-bypasses`，抽样验证每个命中候选
- [ ] 对 flux-bundle 执行尾随确认（预期无发现，快速 grep 验证即可）
- [ ] 产出审计报告 `arm-MA2-runtime-raw-async-fieldframe.md`
- [ ] 发现注入 arm-index.md

Exit Criteria:

- [ ] `arm-MA2-runtime-raw-async-fieldframe.md` 已创建并包含三组 check:audit 命中分析
- [ ] 所有发现已注入 arm-index.md
- [ ] P0（如有）已触发即时通道处理

### Phase 3 — MA2.3 Basic Renderers 分发 + Action 链路审计

Status: planned
Targets: `packages/flux-renderers-basic/`, `packages/flux-renderers-form/`, `packages/flux-renderers-form-advanced/`, `packages/flux-renderers-data/`; owner doc: `docs/architecture/action-scope-and-imports.md`

- Item Types: `Proof | Fix (仅 P0 即时通道) | Follow-up`

- [ ] **硬编码类型分发审计**：grep for `switch.*type` / `case.*type` / `type ===` / `type ==` 模式，验证 renderer 是否通过注册表而非硬编码 switch 分发
- [ ] **Action 路由完整性审计**：grep for `onEvent` / `emit` / `dispatchEvent` 事件绑定；验证事件是否经 `props.events` 或 `useActionDispatcher()` 路由到 action dispatcher，而非直接调用
- [ ] **Action 事件绑定审计**：抽样检查 schema 中的 `onClick` / `onChange` / `xui:action` 事件绑定路径是否正确匹配 action-scope 协议
- [ ] 产出审计报告 `arm-MA2-basic-dispatch-action.md`
- [ ] 发现注入 arm-index.md

Exit Criteria:

- [ ] `arm-MA2-basic-dispatch-action.md` 已创建
- [ ] 所有发现已注入 arm-index.md
- [ ] P0（如有）已触发即时通道处理

## Draft Review Record

- Reviewer / Agent: Round 1 — independent sub-agent (fresh session); Round 2 — independent sub-agent (fresh re-review session)
- Verdict: **pass** (Round 2)
- Rounds: 2
- Findings addressed:
  - B1/M1: Phase 0 Bootstrap added + Dependencies section — arm-index.md created if missing; MA1 dependency gracefully degraded
  - M2: Phase 3 methodology expanded: concrete grep patterns (switch.\*type, type ===, onEvent, emit, dispatchEvent, onClick, xui:action)
  - M3: flux-bundle moved to tail-check (expected clean, ~2 source files)
  - m1: amis-baseline-matrix.md path corrected to docs/components/ prefix

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase 的 Exit Criteria 全部 `[x]`。本 plan 不修改代码，全量验证不适用。

- [ ] 全部 3 个 Phase 的审计报告已产出
- [ ] 所有发现已分类并注入 arm-index.md
- [ ] P0 发现已触发即时通道处理（或确认无 P0）
- [ ] 受影响的 owner docs 已同步（如果审计发现 owner doc 与实际行为有重大差异，记录在报告中）
- [ ] 不存在被静默降级到 deferred 的 in-scope 发现
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Deferred But Adjudicated

_本 plan 不引入 deferred 项。发现的 P0 即时处理，P1/P2 移交 MR 修复阶段。_

## Non-Blocking Follow-ups

- _无。所有发现已记录并移交修复阶段。_

## Closure

Status Note: _关闭时填写_

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:

- 发现的 P1/P2 修复工作预计由 MR1（R1.0）接手
