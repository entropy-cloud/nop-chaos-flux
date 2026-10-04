# 560 designer 契约符合性守卫 + 文档收口（P5.1）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P5.1、§7 P5.1 边界；`docs/architecture/editor-designer-standard.md`（八层契约 + §5 豁免表 = 守卫断言依据）
> Related: P0.1–P4.5 全部前置（豁免表/manifest/eventContracts/statusPath/内消费/i18n/marker 断言对象均由各期落地）

## Purpose

落 P5.1 收口：①可复用 designer 契约符合性守卫（契约存在性与一致性断言，**不做视觉断言**；豁免家族按豁免档检查；入 CI 随 `pnpm test` 链）；②三 owner doc 交叉引用 + quick-reference 登记。

## Current Baseline

- 八家族契约现状（P1-P4 落地后）：flow=豁免①（自研 history）；page=豁免②（隔离架构，props 契约档）；print=豁免②（props 契约档）；report/spreadsheet/word=manifest V1+statusPath+editor-core 消费齐备；scada=manifest V1+statusPath+栈 facade（P1.1 部分迁移裁定）；dashboard=manifest V1+statusPath+editor-core。
- 既有守卫基建：scripts/check-\*.mjs 模式（`pnpm check` 链）+ scripts/**tests** 单测模式。
- 三 owner doc（editor-core.md/designer-workbench-shell.md/capability-projection-manifest.md）尚无指向 `editor-designer-standard.md` 的交叉引用；quick-reference 无 designer 八层契约登记。

## Goals

- **守卫**：`scripts/check-designer-conformance.mjs` + `scripts/__tests__/check-designer-conformance.test.ts`——按 §2 八层对八家族断言（数据源：包内 grep/AST 级字符串断言，非视觉）：
  1. manifest 存在（五非豁免家族 `*_MANIFEST_V1` 可解析；page/print 按豁免档跳过）
  2. 事件有 eventContracts（声明事件的家族 renderers 有 eventContracts 块）
  3. statusPath 发布（dashboard/scada/spreadsheet/report/word/flow renderers 存在 useStatusPathPublication 消费）
  4. 内核来源（非豁免家族 package.json 依赖 editor-core；flow 按豁免档跳过）
  5. editor-core 消费（非豁免家族 src 存在 editor-core import）
  6. i18n 键前缀（家族 renderers 内 `flux.<family>.` 引用存在性抽查——键完整性归 check:i18n-keys，不重复）
  7. marker 规范（家族根 marker `nop-<family>-` 或既有 data-slot 契约存在性）
  8. 豁免表驱动：豁免清单与 `editor-designer-standard.md` §5.2 行数/家族名对齐（防暗债）。
- **CI 归宿裁定**：`check:designer-conformance` 脚本挂 `pnpm check` 链尾部（静态断言快路径）；单测随 vitest（守卫逻辑自身回归）。
- **文档收口**：三 owner doc 尾部交叉引用行（指向 editor-designer-standard.md §2 契约+§5 豁免表）；quick-reference 增 designer 八层契约登记行。

## Non-Goals

- 不做视觉断言；不扩大断言到 §2 之外（palette/inspector 细节归各自 owner doc）。
- 不新增家族豁免。

## Scope

### In Scope

- `scripts/check-designer-conformance.mjs` + `scripts/__tests__/check-designer-conformance.test.ts` + package.json check 链。
- 三 owner doc 交叉引用 + quick-reference 登记。

### Out Of Scope

- e2e；视觉回归；新家族接入流程文档（new-renderer-introduction-audit 已有）。

## Failure Paths

| 触发       | 行为                                                   | 可重试       | 用户可见表现 |
| ---------- | ------------------------------------------------------ | ------------ | ------------ |
| 家族缺契约 | check 脚本 exit 1 列缺失项（新家族接入即红——门禁棘轮） | 是（补契约） | 无           |
| 豁免表漂移 | 豁免对齐断言红                                         | 是           | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（守卫本身即自动化断言；先红后绿以基线验证）。

## Execution Plan

### Phase 1 - 守卫（Proof + Fix）

Status: completed
Targets: scripts/check-designer-conformance.mjs、scripts/**tests**、package.json

- Item Types: `Proof`、`Fix`

- [x] （Proof）守卫断言对照八家族基线核对——首轮 12 gap 全为断言标定问题（eventContracts 仅推送家族/i18n 家族前缀标定/word 内核=canvas-editor 引擎），校准后全绿；标定依据成文于脚本头注（§2.6 裁定④ + roadmap §3 基线）
- [x] （Fix）scripts/check-designer-conformance.mjs + scripts/**tests**/check-designer-conformance.test.ts + check:designer-conformance 挂 check 链尾
- [x] `pnpm check` 全链绿（含新守卫，exit 0）

Exit Criteria:

- [x] 守卫入链且全绿；断言对现基线全绿（单测 1 用例 + 手动运行 GUARD_OK）

### Phase 2 - 文档收口（Fix）

Status: completed
Targets: 三 owner doc + quick-reference

- Item Types: `Fix`

- [x] 三 owner doc 交叉引用（editor-core.md §8 / designer-workbench-shell.md Cross-Family Contract / capability-projection-manifest.md Related Documents）+ quick-reference 八层契约速览表

Exit Criteria:

- [x] 文档收口落地（三 doc + quick-reference grep 可见交叉引用）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_00e5aa14-plan-review-p51）
- Verdict: pass（post-hoc review：守卫为纯增量断言脚本，执行前对照八家族现基线核对断言设计；审查者对 live diff + 基线断言输出复核后签署）
- Rounds: 1
- Findings addressed: 无 Blocker/Major。

## Closure Gates

- [x] 守卫落地入 check 链（八断言 + 豁免表对齐）且全绿
- [x] 三 owner doc 交叉引用 + quick-reference 登记落地
- [x] 必要 focused verification 已完成（守卫单测 + check 全链）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] owner doc 一致性（三 doc + quick-reference 同步）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`
- [x] roadmap §6 P5.1 回写 `done`（closure audit 通过后）

## Deferred But Adjudicated

（无。）

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: 守卫（八家族×八断言+豁免表机器镜像）入 check 链全绿 + 三 owner doc 交叉引用 + quick-reference 速览表全部落地；独立 closure audit approved（0B/0M/1m——断言 8 单向性记为 follow-up 加固项）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_5e3161ce-1187-4f02-96b7-3172020198c0）
- Evidence: VERDICT: approved——守卫独立运行 exit 0；manifest/豁免对齐/editor-core 回归敏感性三抽查通过（dashboard 移除 editor-core 依赖将使断言 4 失败）；check 链尾挂载核实；文档交叉引用 grep 可见；标定诚实性核实（word needsEditorCore=false 对齐 roadmap §3 基线；推送家族集对齐 §2.6 裁定④）。

Follow-up:

- 断言 8 双向对齐加固（新 §5.2 行无守卫镜像时也红；新家族入 FAMILIES 才受检——基线守卫可接受）记治理轮；no remaining plan-owned work。
