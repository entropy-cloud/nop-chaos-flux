# 3 Cycle 2 / I2 — 不变式驱动审计（ai-invariant-loop）

> Plan Status: completed
> Mission: ai-invariant-loop
> Work Item: Cycle 2 / I2. 不变式驱动审计
> Last Reviewed: 2026-08-09
> Source: `docs/backlog/ai-invariant-loop-roadmap.md`（Work Item: Cycle 2 / I2 + Phase Details I2 + Loop Rule）、`docs/audits/ai-invariants/gates.md`（⑥-⑩ 第二批门禁，Cycle 2 / I1 产出）、`docs/audits/ai-invariants/invariant-catalog.md`（§9 Cycle 2 不变式——**前向引用，待 `2026-08-09-2229-2` 新建，非现有章节**）、`docs/audits/ai-invariants/cycle1-findings.md`（Cycle 1 先例格式）、`docs/skills/open-ended-adversarial-review-prompt.md`（对抗探查技能）
> Related: `docs/plans/2026-08-09-2229-2-cycle2-i1-invariant-sedimentation.md`（前置依赖：⑥-⑩ 门禁落库）、`docs/plans/2026-08-09-2229-1-cycle1-i6-closure-and-cycle2-derivation.md`（派生来源）
> 预期产出格式先例：`docs/audits/ai-invariants/cycle1-findings.md`（Cycle 1 / I2）

## Purpose

运行 Cycle 2 第二批门禁（⑥-⑩）跨全部变更型方法：**确定性确认 red list**（预期 = Cycle 2 / I1 注册面：⑥ delete/clearAll/create ×3 + ⑧ connector-missing 早退 ×1，it.fails 门禁按预期失败；**零未注册新命中**）+ 对抗式探查（聚焦 ⑥-⑩ 门禁尚未表达的失效路径：新交错组合、refactor 引入的新方法、跨方法组合状态）→ 每条发现标注「已知族（门禁漏覆盖 → Cycle 2 / I3 补门禁）」或「新族（→ Cycle 3 / I1 派生候选）」→ 产出零悬挂 `cycle2-findings.md`。收口状态：red list 确定性确认、新发现全部分类、findings 零悬挂、为 I3 裁决提供唯一输入。

## Current Baseline

（live repo 核对，2026-08-09；依赖 Cycle 2 / I1 先收口——⑥-⑩ 门禁落库 + 注册红登记；roadmap Cycle 2 / I2 行由 I6（`2026-08-09-2229-1` Phase 2）追加，本 plan 开工时该行必须已存在）

- Cycle 1 已闭环（I0-I5 ✅）；Cycle 2 / I1 为前置（plan `2026-08-09-2229-2`）：⑥-⑩ 参数化测试（`it.fails` 预期失败）+ 静态扫描器规则（⑥ `scanDisplacementVersionBumps` / ⑧ `scanBranchStampReset`，如静态可行）+ committed fixtures + catalog §9 + gates.md ⑥-⑩ 行（棘轮状态 = 「预期红（待 Cycle 2 / I4）」）+ 注册红清单（⑥×3 + ⑧×1 或实际命中数）。
- **预期 red list（本 plan 的确定性验证目标）** = Cycle 2 / I1 注册面（N1-N5 对应门禁 ⑥-⑩，违背已由 I2-Cycle1 的 probe 复现 RED 证实，findings §3.2）；预期构成 = ⑥ delete/clearAll/create ×3 + ⑧ connector-missing 早退 ×1——**⑧ 项以 2229-2 Phase 3 的静态可行性裁决为前提**（若 ⑧ 降级为纯运行时门禁，则扫描命中仅 ⑥×3，⑧ 面由 `it.fails` 门禁承担，本 plan 按实际构成核对）；本 plan 验证「门禁表达的违背面 == 注册面，零差异」。
- 12 方法目标集不变（catalog §4.1：engine 7 + adapter 5；`runTurn` 间接行裁定沿用）；表完备性门禁维持（方法集 ⊆ 表 ∪ 白名单，零漂移）。
- 既有登记 red（验证时允许存在，非本 plan 引入）：`check:audit-event-dispatch-ctx` 6 hits（industrial）；`check:oversized-code-files` 2 条 locale 豁免。
- 授权：本 plan 为纯文档产出（门禁运行记录 + 探查 + findings 分类落档），不改 live baseline / public contract / owner behavior；不涉及代码变更（对齐 Cycle 1 / I2 先例：纯文档计划）。

## Goals

- **门禁全量运行（Phase 1，确定性）**：`check:ai-engine-invariants`（含 ⑥⑧ 新规则）+ AI 包测试（⑥-⑩ it.fails 预期失败 + ①-⑤ 全绿）→ red list 产出 = 注册面逐条对应，**零未注册新命中**；`pnpm check` 仅既有登记 red + 注册命中。
- **对抗式探查（Phase 2）**：双轮（执行 session 轮 + 独立 fresh session 轮，对齐 Cycle 1 先例）——聚焦 ⑥-⑩ 门禁未表达的盲区：① 门禁表达面之外的新交错组合（如 ⑥ hydration × ⑧ 戳、⑨ plugin × abort 交错）；② refactor/新增方法（表完备性门禁红线之外的内部管道，如 runTurn 新早退路径）；③ 跨方法组合状态（如 ⑩ 残留 × ⑥ 位移叠加）。每条发现标注已知族（门禁漏覆盖 → I3 补门禁）/ 新族（→ Cycle 3 / I1 派生，附触发证据）。
- **`cycle2-findings.md` 零悬挂**：red list 记录 + 覆盖矩阵（12 方法 × ⑥-⑩，对齐 Cycle 1 12×5 格式）+ 发现清单（K/N/W 分类）+ Loop Rule 派生摘要（供 I3 / I6-Cycle2 直接消费）。
- **watch-only 复核**：Cycle 1 遗留 W1-W4 在新门禁面下复核（W1 若已被 Cycle 2 门禁/修复面覆盖则按 findings 流程更新）。
- 收口：roadmap Cycle 2 / I2 行 `todo` → `✅`（附执行证据）；daily log 记录；closure 独立 fresh session。

## Non-Goals

- 不修复任何发现（Cycle 2 / I3 裁决 → I4 修复）。
- 不沉淀 / 扩展门禁（Cycle 2 / I1 已落库；I3 裁决的「补门禁」要求由 Cycle 2 / I4 执行，对齐 K1-K4 先例）。
- 不裁决优先级（I3）。
- 不 append Cycle 3 work item 行到 roadmap（那是 I6-Cycle2 的 Loop Rule 回写；本 plan 只备齐触发证据）。

## Scope

### In Scope

- 门禁全量运行与 red list 确定性确认（exit code + 命中清单 + 注册表逐条核对）。
- 双轮对抗探查 + 12×⑥-⑩ 覆盖矩阵。
- 发现分类落档 `cycle2-findings.md`（零悬挂）+ watch-only 复核。
- roadmap Cycle 2 / I2 行状态回写 + daily log。

### Out Of Scope

- 修复 / 补门禁 / 裁决（I3、I4、I5 各自职责）。
- Cycle 3 派生回写（I6-Cycle2）。

## Failure Paths

| 场景                 | 触发                                              | 行为                                                                                                                                                             | 可重试 | 用户可见表现            |
| -------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------- |
| red-list-mismatch    | 门禁命中 ≠ 注册面（多出/缺失）                    | 多出 = 新违背面：逐条临时 vitest 复现 → 复现则列入新族/已知族发现并记录（临时文件复跑后删除零残留）；缺失 = 门禁漏扫：退回 Cycle 2 / I1 复核规则覆盖面，记录修正 | 是     | findings 记录差异与处理 |
| gate-unexpected-pass | ⑥-⑩ 中任一 `it.fails` 反转为 pass（代码提前修复） | 记录异常（修复已落地但未翻转标记），按归属路由 I4 翻转；findings 如实记录                                                                                        | 是     | 测试红                  |
| probe-cleanup        | 探查用临时测试/脚本残留                           | 全部删除 + 工作区零残留核对（对齐 Cycle 1 先例）                                                                                                                 | 是     | 工作区脏                |
| findings-dangling    | 发现未逐条分类                                    | 零悬挂核对（K/N/W 逐条 ↔ 裁决表，对齐 Cycle 1 I3 勾对）                                                                                                          | 是     | findings 未收口         |

## Test Strategy

本档选择：必须自动化

门禁运行即自动化验证主体（red list 确定性）；对抗探查为半自动（执行 session + 独立 fresh session 双轮，临时复现测试 run 后删除）。本 plan 零代码变更（纯文档 + 命令执行），全量 typecheck/build/lint/test 不属本 plan 门禁（对齐 Cycle 1 / I2 纯文档先例），仅复跑 AI 包 focused 面。

## Execution Plan

### Phase 1 — 门禁全量运行与 red list 确定性确认

Status: completed
Targets: `pnpm check`、`pnpm check:ai-engine-invariants`、`pnpm --filter @nop-chaos/flux-renderers-ai test`

- Item Types: `Proof`

- [x] Proof: `pnpm check:ai-engine-invariants`（含 ⑥⑧ 新规则）standalone 复跑——命中清单与 Cycle 2 / I1 注册面逐条核对（⑥ delete/clearAll/create ×3 + ⑧ connector-missing ×1 + 零未注册），exit code 与注册表零差异
- [x] Proof: `pnpm --filter @nop-chaos/flux-renderers-ai test`——⑥-⑩ it.fails 门禁按预期失败（套件绿）、①-⑤ 全绿、既有回归全绿；如出现 unexpected-pass 按 Failure Paths 处理
- [x] Proof: `pnpm check`——仅既有登记 red + 注册命中，零未注册新命中；链尾若被登记 red 中断则 standalone 复跑补证（对齐 Cycle 1 先例）
- [x] Proof: red list 落档（确定性结论：门禁表达的违背面 == 注册面）

Exit Criteria:

- [x] red list 确定性与注册面零差异（命中清单逐条核对记录在案）
- [x] AI 包测试绿（it.fails 预期失败语义）+ `pnpm check` 零未注册新增

### Phase 2 — 对抗式探查（双轮）

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/create-engine.ts`、`src/adapters/use-conversation.ts`（只读探查）、`docs/analysis/2026-08-09-i2-cycle2-adversarial-probe/`（记录）

- Item Types: `Proof | Decision`

- [x] Proof: 执行 session 轮探查——按 `docs/skills/open-ended-adversarial-review-prompt.md`，聚焦 ⑥-⑩ 门禁未表达盲区（新交错组合：⑥ hydration × ⑧ 戳、⑨ plugin × abort 交错、⑩ 残留 × ⑥ 位移叠加；refactor 新方法 / runTurn 新早退路径；跨方法组合状态）；候选发现全部临时 vitest 复现（RED/GREEN 记录，复跑后删除临时文件）——记录 `round-01-executor.md`
- [x] Proof: 独立 fresh session 轮探查（不复用执行 session 上下文）——对执行轮结论独立复核 + 补充发现——记录 `round-02-independent.md`
- [x] Decision: 每条发现分类——已知族（门禁漏覆盖，机制已被 ⑥-⑩ 陈述覆盖但检测未表达 → Cycle 2 / I3 补门禁）/ 新族（需要新不变式 → Cycle 3 / I1 派生候选，附触发证据 `文件:行` + 不变式陈述）/ watch-only（低严重度/未确定性复现，附复触发条件）
- [x] Proof: 12 方法 × ⑥-⑩ 覆盖矩阵落档（covered / partial / uncovered / N/A，uncovered 格必须已探查，对齐 Cycle 1 零悬空格先例）
- [x] Proof: W1-W4 复核——**以 I6（`2026-08-09-2229-1` Phase 1）的 W1 实证复查结论为交接锚点**（W1 收敛面属 Cycle 1 K2/I6 复查范围，非 ⑥ 门禁面）；新门禁面下复触发条件如有变化则更新 findings，其余维持

Exit Criteria:

- [x] 双轮探查记录齐备（round-01/02）；候选发现全部有复现证据（临时文件零残留）
- [x] 覆盖矩阵零悬空格；发现分类零悬挂（K/N/W 逐条）

### Phase 3 — findings 落档 + 收口

Status: completed
Targets: `docs/audits/ai-invariants/cycle2-findings.md`（新建）、`docs/backlog/ai-invariant-loop-roadmap.md`、`docs/logs/2026/08-09.md`

- Item Types: `Proof | Decision | Follow-up`

- [x] Proof: `cycle2-findings.md` 落档（对齐 Cycle 1 格式：red list 记录 / 覆盖矩阵 / 发现清单（K/N/W 分类，每条含 `文件:行` + 不变式陈述 + 复现证据）/ watch-only / 未触发候选族登记 / Loop Rule 派生摘要）
- [x] Proof: 零悬挂核对——发现条目 ↔ 分类逐条勾对（K → I3 补门禁 / N → Cycle 3 / I1 触发证据 / W → watch-only），无未分类条目
- [x] Decision: 未触发候选族登记（tool-execution 并发 / streaming backpressure 若本轮未触及则维持登记，对齐 Cycle 1 §5）
- [x] Proof: roadmap Cycle 2 / I2 行 `todo` → `✅`（附执行证据：plan 路径 + findings 引用）；daily log 记录（red list 结论 + 发现摘要 + 探查轮次）
- [x] Proof: `pnpm check:docs-garbled`（新增/修改 docs：findings + roadmap + daily log + analysis 记录）exit 0 或候选全部归属既有文件
- [x] Follow-up: git commit——`docs(ai-invariant-loop): plan-2026-08-09-2229-3 Cycle 2 I2 审计收口——red list 确定性确认 + 双轮探查 + cycle2-findings 零悬挂`（对齐 I2-Cycle1 纯记录先例；仅 stage 本 plan 相关文件）

Exit Criteria:

- [x] `cycle2-findings.md` 零悬挂落档；roadmap Cycle 2 / I2 行 ✅；daily log + docs-garbled + commit 完成

## Draft Review Record

- Reviewer / Agent: `ses_0190c8368ffek1C6pvisRvz5gh`（fresh session，独立审查）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed:
  - [Minor] roadmap Cycle 2 / I2 行存在性前置条件（由 I6 追加）未显式化 → Current Baseline 加注「本 plan 开工时该行必须已存在（I6 `2026-08-09-2229-1` Phase 2 追加）」
  - [Minor] catalog §9 为前向引用 → Source 行加注「待 `2026-08-09-2229-2` 新建，非现有章节」
  - [Minor] W1 复核措辞（"被 ⑥ 面覆盖"不精确，W1 收敛面属 Cycle 1 K2/I6）→ 改为以 I6 Phase 1 实证复查结论为交接锚点
  - [Minor] ⑧ 预期命中依赖静态可行性 → 预期 red list 构成加注「⑧ 项以 2229-2 Phase 3 裁决为前提，若降级则按实际构成核对」

## Closure Gates

> 关闭条件：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。纯文档计划：不涉及代码变更，`pnpm test`/`lint`/`typecheck`/`build` 从 Closure Gates 移除（guide 纯文档条款）。

- [x] red list 确定性确认（门禁表达违背面 == Cycle 2 / I1 注册面，零差异零未注册新增）
- [x] 双轮对抗探查完成 + 覆盖矩阵零悬空格 + 发现全部分类（K/N/W）零悬挂
- [x] `cycle2-findings.md` 落档且与 live 证据逐条核对（`文件:行` 一致）；不存在被静默降级到 deferred 的 in-scope 发现（新族显式路由 Cycle 3 / I1 触发证据，非延期）
- [x] 临时探查文件/测试零残留（工作区仅 docs 变更）
- [x] 受影响的 owner docs 已同步（roadmap Cycle 2 / I2 行 + 动态状态区 + daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm check:docs-garbled` 通过或候选全部归属既有文件

## Deferred But Adjudicated

### 未触发候选族（tool-execution 并发 / streaming backpressure）

- Classification: `watch-only residual`（登记保持，对齐 Cycle 1 §5 先例）
- Why Not Blocking Closure: I2-Cycle1 探查结论「未发现违背」在案（per-call abort 检查存在 / chunk 原地替换内存有界）；本轮若仍未触及则维持登记，不派生
- Successor Required: `no`

### 发现面之外的优化候选（如有）

- Classification: `optimization candidate`（仅在 Phase 2 产生低严重度、非契约面观察时适用）
- Why Not Blocking Closure: 非 in-scope 契约违背；逐条附复触发条件
- Successor Required: `no`

## Non-Blocking Follow-ups

- Cycle 2 / I3 裁决（基于 `cycle2-findings.md`；K 类补门禁契约 / N 类 Cycle 3 触发证据打包）。
- W1-W4 复核结论同步到 findings（如 W1 状态变化，I6-Cycle2 收口时从 watch-only 清单更新）。

## Closure

Status Note: closure-audit approved——Phase 1/2/3 全 completed + 全 checklist [x] + Closure Gates 7/7 [x]。red list 确定性确认（4 注册命中 == 注册面零差异）、双轮探查 13K/0N/4W 零悬挂、`cycle2-findings.md` 落档、roadmap Cycle 2 / I2 行 ✅、daily log 收口、临时文件零残留。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit sub-agent（mission-driver 2026-08-09-182611 closure-audit，fresh session，不复用执行上下文）
- Evidence: live repo 复核（2026-08-09）——① `pnpm check:ai-engine-invariants` 复跑 exit 1 = **4 注册命中**（⑧×1 `create-engine.ts:228` + ⑥×3 `use-conversation.ts:280/:370/:427`），与 Cycle 2 / I1 注册表逐条对应、零未注册；② `pnpm --filter @nop-chaos/flux-renderers-ai test` 复跑 **67 files / 544 passed + 12 expected fail**（556）与 findings §1.1 记录一致；③ `pnpm check` 复跑仅既有登记 red（`check:audit-event-dispatch-ctx` industrial 6 hits）链中断，ai-engine-invariants standalone 补证零未注册；④ findings `文件:行` 抽查与 live 代码一致（`create-engine.ts:228` connector-missing 早退、`:362-364` finally onTurnEnd、`:407-410` onBeforeRequest try 外、`:432-483` chunk 循环 abort-break/首 chunk 处理、`use-conversation.ts:242-246` bootstrap setActiveId、`:427-475` clearAll drain 只排 saveMessages 链）；⑤ `cycle2-findings.md` 零悬挂（K 13 / N 0 / W 4 + Cycle 1 W1-W4 维持）与 roadmap Cycle 2 / I2 行 ✅（附执行证据）+ daily log 记录逐条一致；⑥ 临时探查文件零残留（git 工作区干净，仅 docs 变更）；⑦ `pnpm check:docs-garbled` 复跑通过（16 likely-garbled 全为既有文件，本 plan 新增 docs 零候选）。零 Blocker / 零 Major。

Follow-up:

- Cycle 2 / I3 裁决（基于 `cycle2-findings.md`；K 类补门禁契约打包）。
- W1-W4 + 新 W-E/W-⑨-a/b/c 复核结论维持登记（I6-Cycle2 收口时从 watch-only 清单更新）。
- 明确 no remaining plan-owned work（除上述 non-blocking follow-up）。
