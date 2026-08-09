# 3 Cycle 1 / I2 — 不变式驱动审计（ai-invariant-loop）

> Plan Status: completed
> Mission: ai-invariant-loop
> Work Item: Cycle 1 / I2. 不变式驱动审计
> Last Reviewed: 2026-08-09
> Source: `docs/backlog/ai-invariant-loop-roadmap.md`（Work Item: Cycle 1 / I2 + Phase Details I2）、`docs/skills/open-ended-adversarial-review-prompt.md`、`docs/audits/ai-invariants/invariant-catalog.md`（I0 产出）
> Related: `docs/plans/2026-08-09-1826-2-i1-invariant-gate-sedimentation.md`（前置依赖）

## Purpose

用 I1 落地的门禁确定性审计全部变更型方法 → red list（自动化主体）；对「门禁尚未表达」的失效路径做对抗探查（新交错组合、跨方法状态、refactor 风险）；每条发现标注「已知族（门禁漏覆盖 → 补门禁）/ 新族（需新增不变式 → Cycle 2 触发证据）」。产出 `docs/audits/ai-invariants/cycle1-findings.md`，为 I3 裁决提供**零悬挂**输入。

## Current Baseline

（live repo 核对，2026-08-09；依赖 I0 目录 + I1 门禁先落地）

- I0 目录（5 条首批不变式 + 目标集枚举 + `runTurn` 裁定）与 I1 门禁（两个参数化测试 + 表完备性门禁 + `check:ai-engine-invariants`）为前置；未收口则本 plan 不得开工。
- 4 轮审计最终态：三大复发族均已修复（`create-engine.ts:330-346/448-472` 身份守卫、`use-conversation.ts:122-128/339/360` ref 读取、clearAll storage fan-out + `reportStorageError`），**预期 I1 门禁对 live 仓库零命中**——本 plan 验证该预期，并探查「门禁未表达」的残余盲区。
- 目标集（I0 枚举）：engine 公共 `sendMessage`/`send`/`abort`/`clear`/`setMessages`/`regenerate` + 内部管道 `runTurn`（`create-engine.ts:193`）；adapter `createConversation`/`switchConversation`/`deleteConversation`/`renameConversation`/`clearAll`。
- 审计方法学先例：`docs/skills/open-ended-adversarial-review-prompt.md`（对抗探查）、`docs/audits/00-audit-execution-guide.md`、`docs/skills/deep-audit-prompts.md` 维度 06 异步 / 19 状态 / 23 测试质量。

## Goals

- 门禁全方法运行并记录 red list（预期零命中；任何命中立即标注族归属，不悬挂）。
- 对抗探查覆盖「门禁未表达」路径：跨方法交错（abort + delete + switch + clearAll 并发组合）、await 边界状态读取、storage 失败注入、流式/backpressure 相关、refactor 引入新方法的盲区。
- 方法 × 不变式覆盖矩阵（covered / partial / uncovered / `N/A`（catalog 裁定不适用，引用 invariant-catalog.md））落档；`uncovered` 格 = 探查聚焦点；`runTurn` 行按 I0 裁定以间接覆盖标注，其 `uncovered` 格不作为独立探查聚焦点。
- `cycle1-findings.md` 零悬挂：每条发现 ∈ {已知族-门禁漏覆盖（补门禁）/ 新族（需新不变式，附触发证据）}。

## Non-Goals

- 不做 red list 裁决 / 裁决表（那是 I3，本 plan 只做族分类标注）。
- 不修复任何发现（那是 I4）。
- 不沉淀新门禁 / 新不变式（新族 → Loop Rule 自动派生 Cycle 2 / I1，本 plan 只备齐触发证据）。

## Scope

### In Scope

- 运行 I1 门禁（`pnpm check` + AI 包测试套件）并记录 red list。
- 对抗探查（按 open-ended-adversarial-review-prompt 流程）与族分类。
- 方法 × 不变式覆盖矩阵。
- `docs/audits/ai-invariants/cycle1-findings.md`。

### Out Of Scope

- 裁决表（I3）、修复（I4）、验证收口（I5/I6）。
- 新门禁实现（Cycle 2）。

## Failure Paths

不适用：审计产出流程，无外部契约 / 错误处理面；门禁 exit code 本身就是审计数据（scanner-hit 即 red list 项），不是失败路径。

## Test Strategy

本档选择：必须自动化

门禁运行部分全自动化（`pnpm check` + 测试套件即审计主体）；对抗探查为半自动（fresh session 独立执行，按 `docs/skills/open-ended-adversarial-review-prompt.md` 流程），其发现以覆盖矩阵 + 复现用例断言落档（Proof 项）。

## Execution Plan

### Phase 1 — 门禁全量运行与 red list

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants.test.ts`、`src/adapters/__tests__/conversation-invariants.test.ts`、`scripts/`（只读）+ `docs/audits/ai-invariants/cycle1-findings.md`

- Item Types: `Proof | Decision`

- [x] Proof: 运行 `pnpm check`（含 `check:ai-engine-invariants`）+ `pnpm --filter @nop-chaos/flux-renderers-ai test`（含两个 invariants 套件与既有回归），记录 exit code 与输出
- [x] Decision: red list 逐条标注族归属（已知族 → 门禁漏覆盖，补门禁；新族 → Cycle 2 新不变式派生触发证据）；零命中则记录「预期零命中验证通过」结论

Exit Criteria:

- [x] red list 与运行输出（含 exit code）记录入 `cycle1-findings.md`，每条带族归属标注，零悬挂
- [x] 表完备性门禁未报警（无新增未入表方法）或报警已记录

### Phase 2 — 对抗探查与覆盖矩阵

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/`、`src/adapters/use-conversation.ts`（只读）+ `docs/audits/ai-invariants/cycle1-findings.md`

- Item Types: `Proof | Decision`

- [x] Proof: 方法 × 不变式覆盖矩阵（covered / partial / uncovered / N/A（catalog 裁定不适用））落档；`uncovered` 格即为探查聚焦点清单；`runTurn` 行按 I0 裁定以间接覆盖标注
- [x] Proof: 按 `docs/skills/open-ended-adversarial-review-prompt.md` 对 engine/ + use-conversation\* 探查「门禁未表达」路径：跨方法交错（abort+delete+switch+clearAll 并发组合）、await 后状态读取边界、storage 失败注入（save/load/delete 各 phase）、流式/backpressure、refactor 风险点
- [x] Decision: 每条发现标注「已知族（门禁漏覆盖 → I3 补门禁）/ 新族（→ Cycle 2 触发证据：`文件:行` + 不变式陈述）」+ 复现用例（测试名或最小复现脚本，若已写则落 committed 测试）

Exit Criteria:

- [x] 覆盖矩阵落档；探查发现全部标注族归属与证据，零悬挂
- [x] 新族发现（如有）的触发证据已备齐，供 I3/I6 与 Loop Rule 派生直接引用

## Draft Review Record

- Reviewer / Agent: Round 1 `ses_019eb98f6ffertiUPUyPLO35SP`；Round 2 `ses_019e48f8bffeinDwRAVPY6SjBk`（均为 fresh session）
- Verdict: `pass`（Round 1 `revised` → 修正 → Round 2 `pass`，零 Blocker/零 Major）
- Rounds: 2
- Findings addressed:
  - [Major] Closure Gates 移除全量 `pnpm typecheck/build/lint/test`（纯文档计划条款），并注明 `pnpm check` + AI 包套件运行记录由 Phase 1 捕获、full-repo 全量验证归属 I5
  - [Minor] Phase 2 探查项改为 `Proof`、分类项改为 `Decision`，Item Types 不再含 `Fix`
  - [Minor] 覆盖矩阵增加第 4 类 `N/A`（catalog 裁定不适用），`uncovered` 仅指既无门禁覆盖又未被裁定不适用的格
  - [Minor] `runTurn` 行按 I0 裁定以间接覆盖标注，其 `uncovered` 格不作为独立探查聚焦点

## Closure Gates

- [x] red list 与探查发现全部完成族归属标注，零悬挂
- [x] 方法 × 不变式覆盖矩阵（含 N/A 类）落档（`cycle1-findings.md`）
- [x] 新族触发证据（如有）齐备并记录，可直接支撑 Loop Rule 派生
- [x] 不存在被静默降级到 deferred 的 in-scope live defect（本 plan 发现即输出，不静默吞掉）
- [x] No owner-doc update required：本 plan 为审计产出，不改动 live baseline / public contract / owner behavior（`engine.md` 不因本 plan 变更）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

> 纯文档计划：不涉及代码变更，`pnpm typecheck`/`build`/`lint`/`test` 从 Closure Gates 中移除（guide 纯文档计划条款）；`pnpm check` + AI 包测试套件的运行记录由 Phase 1 捕获（即审计数据本身）；full-repo 全量验证归属 I5。

## Deferred But Adjudicated

（本 plan 预期无 in-scope deferred 项；若对抗探查产生「疑似但未复现」的发现，作为 watch-only residual 记录于此并写清复触发条件——不允许静默丢弃。）

## Non-Blocking Follow-ups

- 门禁漏覆盖项（已知族）补门禁的具体安排由 I3 裁决表裁定（本 plan 只标注归属）

## Closure

Status Note: 纯文档审计计划关闭：Phase 1/2 全部完成，交付物 `cycle1-findings.md`（空 red list 零命中验证 + 12×5 覆盖矩阵 + 已知族 K1-K4 / 新族 N1-N5 / watch-only W1-W4，零悬挂）与双轮探查记录齐备。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（opencode / deepseek-v4-flash，非执行 session）
- Evidence:
  - plan 一致性：Phase 1/2 `completed`，全部 Item 与 Exit Criteria `[x]`，Closure Gates 1-5 `[x]`，第 6 项审计前未勾选（由本审计勾选）；in-scope 无残留未勾选项。
  - 交付物：运行记录（`pnpm check` exit 1 = 既有登记 red，与 `docs/logs/2026/08-09.md` 登记的 industrial 6 hits 文件:行逐条吻合；`check:ai-engine-invariants` exit 0；AI 包 536 tests 全绿）、空 red list 结论、12 方法×5 不变式矩阵（含 `runTurn` 间接行 + N/A 格）、全发现族归属 + `文件:行` + 复现、W1-W4 触发条件、Loop Rule 摘要齐全。
  - 零悬挂与 live 核对：K1（`create-engine.ts:318-323` 完成 mutate 仅判状态字符串无身份守卫、`:240-242` onTurnStart 在 try 外）、N1（`use-conversation.ts:293-346` post-await 提升/复水无位移校验；delete/clearAll/create 均不 bump `switchVersionRef`）、N2（`:221-229` bootstrap 整体覆盖）、K3/K4/N3/N4/N5/W3 行号全部与 live 源码一致；invariant 套件 12+10=22 测核对成立。
  - 工作区与 linkage：`packages/` 零变更（无遗留 probe 测试）；probe 双轮记录与 findings 一致；roadmap Cycle 1 / I2 行仍 `todo`（未提前翻转）。零 Blocker / 零 Major，通过。

Follow-up:

- 无 plan-owned 剩余工作；后续为 I3（发现裁决与工作项拟制）
