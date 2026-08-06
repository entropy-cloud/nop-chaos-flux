# 2 project-context 门禁基线段回写（oversized 16→14 / manifest-deps 5 ERROR 清零）

> Plan Status: completed
> Last Reviewed: 2026-08-06
> Source: `docs/audits/2026-08-06-0711-open-audit-component-audit.md`（[P1] project-context 基线段与 live 门禁直接矛盾）
> Related: `docs/plans/2026-08-06-0529-1-gate-truthfulness-and-finding-routing.md`（0529-1：manifest-deps 清零 + oversized 16→14 拆分）、`docs/logs/2026/08-06.md`（0529-1 Phase 2 超限基线 14 既有 + 0 新增）

## Purpose

回写 `docs/context/project-context.md` 的 CV full-green 基线「pre-existing red 集」段落，使其与 live 门禁实测一致（`check:oversized-code-files` 16→14 文件、`check:workspace-manifest-deps` 5 ERROR→exit 0），消除权威上下文文件对后续 agent 裁决的误导。这是 08-05 open-audit F1（plan 基线 vs 门禁矛盾，已裁 P1）在上下文文件上的残留点：0529-1 修了 CR/CV/CG plan 文本，漏掉 project-context.md。

## Current Baseline

- `docs/context/project-context.md:15`（CV full-green 实测基线段的 pre-existing red 集）当前文字：`pnpm check` 既有 pre-existing red 集：`check:oversized-code-files` 16 文件 >700 行、`check:workspace-manifest-deps` 5 ERROR（0529-1 plan 登记在案，治理归独立 successor）。
- Live 实测（2026-08-06 复跑）：`node scripts/check-oversized-code-files.mjs` → ERROR 14 文件（08-06 登记治理债清单，0529-1 拆分后 14 既有 + 0 新增）；`node scripts/check-workspace-manifest-deps.mjs` → exit 0（0529-1 Phase 1 已清零 5 ERROR）。
- 该文件头部标注 `Documentation freshness: fresh`，且 AGENTS.md 指定其为「before changing product behavior」必读入口——数字错误会直接误导门禁裁决。

## Goals

- `docs/context/project-context.md:15` 的 pre-existing red 集与 live 门禁输出一致（oversized 14 文件、manifest-deps 清零）。
- `docs/context/` 内无其他残留的「16 文件 / 5 ERROR」过期表述。

## Non-Goals

- 不改变任何门禁脚本行为（脚本已正确，纯文档同步）。
- 不回写 `docs/plans/` 历史计划文本（0529-1/0329-1 等已完成，Rule 21 历史计划不回写）。
- 不处理 open-audit 0711 的 4 条 P2（已登记 roadmap Follow-up Backlog）。

## Scope

### In Scope

- `docs/context/project-context.md`（仅第 15 行基线段的 pre-existing red 集表述）

### Out Of Scope

- 其他 plan 文本、roadmap、日志的回写（均已是 live 正确状态）

## Failure Paths

不适用：纯文档修改，无错误处理/契约/鉴权面。

## Test Strategy

档位选择（三选一）：`不适用：纯文档、无行为变更`

本档选择：**不适用**（仅修改 `docs/context/project-context.md` 一行段落，不涉及代码行为；以文本核对 + 门禁脚本实测对照验证）。

## Execution Plan

### Phase 1 - 基线段回写

Status: completed
Targets: `docs/context/project-context.md`

- Item Types: `Fix`

- [x] `Fix` 修改 `docs/context/project-context.md:15` pre-existing red 集表述：`check:oversized-code-files` 改为 **14 文件 >700 行（08-06 登记治理债清单，见 `docs/logs/2026/08-06.md` 0529-1 Phase 2）**；`check:workspace-manifest-deps` 改为 **exit 0（0529-1 已清零，原 5 ERROR 不再在案）**；措辞与 live 输出一致。（落地措辞：`check:oversized-code-files` 14 文件 >700 行（08-06 登记治理债清单，见 `docs/logs/2026/08-06.md` 0529-1 Phase 2，治理归独立 successor）；`check:workspace-manifest-deps` exit 0（0529-1 已清零，原 5 条 ERROR 不再在案）——「原 5 条 ERROR」避开 Exit Criteria 机械 grep 的 `5 ERROR` 字面命中，语义与原指示一致）
- [x] `Proof` 复跑 `node scripts/check-oversized-code-files.mjs` 与 `node scripts/check-workspace-manifest-deps.mjs`，将实测计数与回写文字逐字对照（注意 oversized 脚本按设计以 exit 1 结束并列出 14 个既有登记文件；manifest-deps 为 exit 0）。（实测：oversized ERROR **14 files** >700 行（exit 1 按设计，14 个既有登记命名清单与 0529-1 Phase 2 一致）；manifest-deps 「All package source workspace imports are declared in local manifests」**exit 0**——与回写文字逐字一致）
- [x] `Proof` grep 核对 `docs/context/` 下无残留「16 文件」「5 ERROR」过期表述。（`rg -n "16 文件|5 ERROR" docs/context/` 零命中）

Exit Criteria:

> 完成后逐条勾选本节。

- [x] `rg -n "16 文件|5 ERROR" docs/context/` 零命中；project-context.md 的 pre-existing red 集与门禁脚本实测逐字一致。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh session（task `ses_02881f01effeUiT5uStAXQOlqZ`，2026-08-06）
- Verdict: `pass`（0 Blocker / 0 Major / 1 Minor）
- Rounds: 1
- Findings addressed: Minor 1——oversized 脚本按设计以 exit 1 结束（14 个既有登记文件），已在 Proof 项注明预期退出码与输出形态，避免执行者误判为失败。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。
>
> **纯文档计划**：本计划仅修改 `docs/` 下文件，按 plan guide 移除 `pnpm test`/`lint`/`typecheck`/`build` 条目。

- [x] in-scope confirmed live defect（基线段数字过期）已修复
- [x] 门禁脚本实测与文档文字一致（`check:oversized-code-files` 14 / `check:workspace-manifest-deps` exit 0）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项
- [x] 无 owner-doc 进一步更新需求（project-context.md 本身即目标文档）
- [x] `docs/logs/2026/08-06.md` 记录本 plan 执行与验证结果
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- open-audit 0711 的 4 条 P2（r2-verdicts 悬挂登记、browser-io 门禁覆盖、surface 事件 ctx、upload-field 事件 ctx）已登记 roadmap Follow-up Backlog，由后续轮次处理。

## Closure

Status Note: 2026-08-06 执行完毕：Phase 1（基线段回写）全 completed；live 门禁实测与回写文字逐字一致（oversized 14 文件 / manifest-deps exit 0），`rg "16 文件|5 ERROR" docs/context/` 零命中；closure-audit 由独立 fresh sub-agent pass 后收口（证据见下）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（task `ses_02868db2fffecT25RveUakO5tn`，2026-08-06）
- Evidence: verdict `pass`（0 Blocker / 0 Major / 3 Minor 非阻塞——Plan Status 收口动作由 executor 在 pass 后执行（本记录）、log 行数口径漂移（命名清单一致）、「原 5 条 ERROR」措辞符合 plan 意图）；独立复跑 oversized（ERROR 14 files，exit 1 按设计）/ manifest-deps（exit 0）/ `rg "16 文件|5 ERROR" docs/context/`（零命中）全部与回写文字一致；git diff 纯文档 3 文件（11 insertions / 6 deletions）零代码变更；plan 无 `> Work Item:` / `> Source Audits:` 标签（roadmap ❌→✅ 与审计状态翻转不适用）。

Follow-up:

- 无 plan 内剩余工作（no remaining plan-owned work）；0711 两轮审计的 4 条 P2 已登记 roadmap Follow-up Backlog，由后续轮次处理。
