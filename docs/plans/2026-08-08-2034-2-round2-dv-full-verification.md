# DV 全量验证（typecheck/build/lint + test + e2e full-green + pnpm check exit 0 + full-green 记录）

> Plan Status: completed
> Mission: component-audit-round2
> Work Item: DV
> Last Reviewed: 2026-08-08
> Source: `docs/backlog/component-audit-round2-roadmap.md`（DV 行 + Phase Details + Dependency Graph）、`docs/audits/round2-dr-adjudication.md`（DR 修复后终态）、`docs/audits/round2-p3-adjudication.md`（§6 watch-only 复核终态）、DR plan（`docs/plans/2026-08-08-2034-1-round2-dr-cross-surface-centralized-remediation.md`）
> Related: `docs/plans/2026-08-06-0329-2-cv-full-verification.md`（completed，第一轮 full-green 验证先例）、`docs/plans/2026-08-08-2034-1-round2-dr-cross-surface-centralized-remediation.md`（前置，DR 完成后方可执行）

## Purpose

第二轮收口前的**仓库级全量验证轮**：在 DR 修复后终态上，重跑 `pnpm typecheck`/`build`/`lint`（32/32）+ `pnpm test`（59/59）+ 全量 `pnpm test:e2e`（含 D3.x 新增 host 面 spec；watch-only 清单按 D2 裁决 + DR 修复后终态）+ `pnpm check` exit 0（28 项，`check:duplicates:detail` 非门禁归因维持）+ component-lab / smoke+navigation / host-surfaces 回归，达成并记录 **full-green**（执行日所属 daily log），roadmap DV 行 `todo`→`done`。同时完成 round-2 各 plan 文件 ↔ roadmap 状态一致性核对——**含 D3.2 plan 收口缺口处理**（live 核对：plan 文件为 `active` 且 Closure Audit Evidence 空，而 roadmap 已 `done`；证据缺失非机械补齐可覆盖，见 Baseline/Phase 1）。本 plan 是 DV 行唯一 owner plan，收口后 DG（Guard 沉淀）方可执行。

## Current Baseline

（live repo 核对事实，2026-08-08；执行时以 DR 完成后终态复核对）

- **round-2 全部 work item 状态**：D0/D1/D2/DB/DL/D3.1..D3.4 按 roadmap 均为 `done`；**DR 为前置 todo**（本 plan 依赖其完成）。**D3.2 plan 收口缺口（live 核对，证据确认缺失）**：`docs/plans/2026-08-08-1315-1-round2-d32-spreadsheet-surface-audit.md` 仍为 `Plan Status: active` + Closure Audit Evidence 空（「待独立子 agent 填写」）+ **Closure Gates 审计门禁项已无证据勾选 `[x]`**（:191）；`docs/logs/2026/08-08.md` D3.2 节仅自指断言「closure-audit 由独立 fresh session 收口，证据见 plan Closure 节」（无 session id、无 verdict——对比 D3.3/D3.4 有 session id + verdict）；roadmap D3.2 行「closure-audit pass（fresh session，2026-08-08），证据见 plan Closure 节与 daily log」两处引用均为空壳——**结论：closure-audit 证据不存在，不得以「既有证据机械补齐」路径自证收口**；处理路径见 Phase 1 item 1（真实 fresh-session closure-audit 或显式待补 + roadmap 回退）。roadmap D3.3 行格式破损（10 cells，残留 `| todo | 同上 | ~8 卡 | D0 |` 碎片，D3.4 行编辑遗留）——Phase 1 一致性核对修复。
- **CV full-green 基线**（2026-08-06 实测）：typecheck/build/lint 32/32；test 59/59（10,397 passed / 0 failed）；e2e 1054 passed / 43 skipped / 6 failed（watch-only 归因清单：c3-5 Tiptap ×2 + w3d-editor:28 + gantt-perf/kanban-perf ×2（50Hz 阈值）+ ai-attachments 瞬时 flake（已 closed））；component-lab 334/1/2；smoke+navigation 111/111；host-surfaces 42/42。
- **中间态 e2e 实测**（D3.x 期间）：D3.2 1023 passed / 17 failed（全归因既有环境/watch-only，clean-tree 复跑确认）；D3.3 1033 passed / 14 failed；D3.4 关联 32/32。**DR 修复后终态**：w3d-editor:28 / c3-5 ×2 预计修复移除，残留 watch-only = gantt-perf/kanban-perf ×2（「需 60Hz 环境最终确认」）+ DR 执行中的任何归因记录。
- **D3.x 新增 host 面 e2e**（live 在案）：`flow-designer-undo-clipboard.spec.ts` + `flow-designer-slot-drag.spec.ts`（D3.1，5 用例）、`spreadsheet-demo.spec.ts`（D3.2，10 用例）、`report-designer-host.spec.ts`（D3.3，5 用例）、`word-editor-recovery.spec.ts`（D3.4，6 用例）+ `playground-entry-pages.spec.ts` 路由断言更新（含 `#/spreadsheet` / `#/report-designer-host`）；DR 可能再增/改 spec。
- **`pnpm check` 基线**：28 项 `check:*` 27/28 exit 0（`check:duplicates:detail` = 无阈值 jscpd dump 固有 exit 1，非门禁，D0/D1 已归因维持）；oversized 仅 2 条既有 locale 豁免；`pnpm test:scripts` 6/15 全绿。
- **验证命令**（project-context）：`pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm test:e2e` / `pnpm check`；e2e 诊断见 `docs/references/e2e-test-diagnostic-guide.md`；Playwright 归因纪律：watch-only 清单外失败 = 阻断（不得静默吞掉）；禁止截图诊断（programmatic DOM 断言）。

## Goals

- `pnpm typecheck`/`build`/`lint` 32/32 全绿。
- `pnpm test` 59/59 全绿（含 D3.x/DR 全部新增回归），测试计数在案。
- `pnpm test:e2e` 全量绿或仅剩 watch-only 归因清单（按 D2 终态 + DR 修复后终态逐条归因，零悬空）；component-lab、smoke+navigation、host-surfaces 回归通过。
- `pnpm check` exit 0（28 项，`check:duplicates:detail` 非门禁归因维持）+ `pnpm test:scripts` 全绿。
- round-2 plan 文件 ↔ roadmap 状态一致性核对完成（D3.2 收口补齐（真实 closure-audit）或显式待补 + roadmap 回退登记）。
- full-green 记录于执行日所属 daily log（测试计数/包摘要 + watch-only 终态清单）；roadmap DV 行 `todo`→`done`（附执行证据）；closure-audit 由独立 fresh session 执行。

## Non-Goals

- 不做新审计/新修复（本 plan 是验证轮；发现的新缺陷显式登记路由，不静默修复——除非验证阻塞性小修由执行时裁决并留痕）。
- 不做 Guard 沉淀（round2-index / lessons 09+ / 门禁升级 / checklist 修订 / project-context 回写归 DG）。
- 不重写历史计划文本（Rule 21；D3.2 收口处理属状态/证据动作，非文本回写——仅两条诚实路径：真实 fresh-session closure-audit 或显式待补 + roadmap 回退）。
- 不做 60Hz 环境复测（gantt-perf/kanban-perf 需 60Hz 环境，本机 50Hz 维持归因记录）。

## Scope

### In Scope

- 全量验证命令（typecheck/build/lint/test/check/test:scripts/e2e 全量 + component-lab + smoke + navigation + host-surfaces）。
- watch-only 归因清单终态核对（D2 终态 + DR 修复后终态）。
- round-2 plan 文件 ↔ roadmap 状态一致性核对（D3.2 收口补齐或显式待补 + roadmap 回退登记、D3.3 行格式修复、其余 plan 复核）。
- full-green 记录（daily log）+ roadmap DV 行收口登记 + closure-audit。

### Out Of Scope

- DR 未完成项的收口（DR plan 职责）。
- DG Guard 沉淀（另 plan）。
- 新审计卡 / 新 e2e spec 设计（既有 spec 全量跑通即满足）。

## Failure Paths

| 可测场景编号   | 触发                                      | 行为                                                                                            | 可重试 | 用户可见表现       |
| -------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ | ------------------ |
| dv-watch       | e2e 出现 watch-only 清单外失败            | 按归因纪律逐条定位（clean-tree stash 复跑 / 隔离复跑）——确属环境归因则记录，确属代码则阻断回 DR | 是     | 归因记录或 DR 回退 |
| dv-perf        | gantt-perf/kanban-perf 50Hz 阈值失败      | 维持 watch-only 归因（D2 终态，需 60Hz 环境确认），不视为阻断                                   | 是     | 清单维持           |
| dv-flake       | 间歇性 flake（并行负载超时等）            | 隔离复跑确认；稳定复现则登记归因，不得静默吞掉                                                  | 是     | 归因记录           |
| dv-gate        | `pnpm check` 新增命中                     | 按门禁纪律裁决：先修代码或登记；禁止临时改门禁规则                                              | 是     | 红项清零或登记     |
| dv-consistency | D3.2 plan 收口证据缺失且无独立 agent 可用 | 显式登记待补 + roadmap D3.2 行回退 `planned` + 证据列更正（不得虚构证据）                       | 否     | 状态登记留痕       |

## Test Strategy

本档选择：**必须自动化**——本轮就是仓库级验证轮本身：全量 typecheck/build/lint/test/e2e + `pnpm check` + component-lab/smoke/navigation/host-surfaces 即交付物；full-green 判定以命令 exit code + 计数为准（programmatic，禁截图）；归因纪律（watch-only 清单 + clean-tree 复跑）为 Proof 交付物。纯文档交付（full-green 记录 / roadmap 登记 / 一致性核对）不新增测试。

## Execution Plan

### Phase 1 - 收口前一致性核对

Status: completed
Targets: `docs/plans/2026-08-08-*.md`（round-2 全部 plan 文件）、`docs/backlog/component-audit-round2-roadmap.md`、`docs/logs/2026/08-08.md`

- Item Types: `Proof | Decision`

- [x] round-2 各 plan 文件 ↔ roadmap 状态一致性核对（Proof）：D0..D3.4 + DR 的 roadmap 状态 vs 各 plan `Plan Status` + Closure 节证据；**roadmap D3.3 行格式破损修复**（残留 `| todo | 同上 | ~8 卡 | D0 |` 碎片删除，单元格恢复规范列数）。
- [x] **D3.2 收口缺口处理（Decision，两条诚实路径，禁止以「既有证据」机械自证收口）**：(a) **执行真实 closure-audit**——由独立子 agent（fresh session，不复用 D3.2 执行者上下文）按 D3.3/D3.4 证据范式（session id + verdict + 逐项核对）审计 D3.2 plan（live 核对 5 Phase Exit Criteria + Closure Gates + 卡终态 + deferred 诚实性），pass 后 Plan Status `active → completed` + Closure Audit Evidence 回填 + Closure Gates 审计门禁项勾选依据补录；(b) **无独立 agent 可用**——显式登记「待补」+ roadmap D3.2 行回退 `done → planned` + roadmap 证据列更正（不得虚构证据）；两条路径均需在 daily log 留痕。D3.2 收口前其产出（spreadsheet-demo spec 等）不阻塞本 plan 验证范围（以 live 文件为准）。
- [x] watch-only 清单终态确认（Decision）：D2 终态 + DR 修复后终态（w3d-editor:28 / c3-5 ×2 预期已移除；gantt-perf/kanban-perf 维持「需 60Hz 环境确认」；ai-attachments closed）——清单落 full-green 记录依据。
- [x] 验证范围清单确认（Proof）：D3.x + DR 新增/修改 spec 全集（flow-designer ×2 / spreadsheet / report-designer-host / word-editor-recovery / entry-pages 等）在案核对，与全量 e2e 跑批对齐。

Exit Criteria:

- [x] 一致性核对结论在案（D3.2 补齐或显式登记待补 + roadmap 状态一致）；watch-only 终态清单落记录。
- [x] 验证范围清单（spec 全集）与 live 文件核对一致。

### Phase 2 - 全量静态与单测验证

Status: completed
Targets: 全仓库（32 包）

- Item Types: `Proof`

- [x] `pnpm typecheck` 32/32、`pnpm build` 32/32、`pnpm lint` 32/32（既有 informational warning 维持归因）——**fresh 执行声明**：本 plan 是验证轮，关键命令以 fresh/零缓存语义执行为准（`pnpm test --force` 或等价零缓存证据；turbo 全缓存命中不作为 full-green 证据，除非显式声明接受缓存并注明）；typecheck/build/lint 参照 CV 先例。
- [x] `pnpm test` 59/59 全绿（测试计数在案，含 D3.x/DR 新增回归）——fresh 执行（零缓存）优先。
- [x] `pnpm check` 28 项逐项重跑：27/28 exit 0 + `check:duplicates:detail` 非门禁归因维持 + oversized 仅 2 条既有 locale 豁免 + audit 三门禁零命中 + `pnpm test:scripts` 6/15 全绿。
- [x] 任何新增命中按门禁纪律裁决（先修代码或显式登记归因；禁止临时改门禁规则）。

Exit Criteria:

- [x] typecheck/build/lint/test/check 全绿（或显式归因清单零悬空）；`pnpm test:scripts` 全绿。
- [x] 验证结果与 project-context 基线可对比（计数记录在案）。

### Phase 3 - 全量 e2e 验证

Status: completed
Targets: `pnpm test:e2e`（全量）、`component-lab`、`smoke`、`navigation`、`host-surfaces` 套件

- Item Types: `Proof`

- [x] `pnpm test:e2e` 全量跑批：通过数/跳过数/失败数在案；失败项逐条归因——watch-only 清单内 = 维持记录（gantt-perf/kanban-perf 50Hz 等）；清单外 = 阻断（clean-tree stash 复跑 / 隔离复跑确认后登记归因或路由回 DR）。
- [x] D3.x + DR 新增 host 面 spec 全绿复核（flow-designer undo-clipboard/slot-drag、spreadsheet-demo 10、report-designer-host 5、word-editor-recovery 6、entry-pages 路由断言等）。
- [x] component-lab（334/1/2 基线对照）+ smoke+navigation（111/111 基线对照）+ host-surfaces（42/42 基线对照）回归。
- [x] 归因纪律：禁截图诊断（programmatic DOM）；watch-only 清单外零悬空失败。

Exit Criteria:

- [x] e2e 全量结果在案：全绿 或 失败全数落入 watch-only 归因清单（逐条理由 + clean-tree/隔离复跑证据）。
- [x] 新增 host 面 spec 全绿；component-lab/smoke/navigation/host-surfaces 与基线对照结论在案。

### Phase 4 - full-green 记录 + 收口登记

Status: completed
Targets: 执行日所属 `docs/logs/2026/{MM-DD}.md`、`docs/backlog/component-audit-round2-roadmap.md`（DV 行）、`docs/context/project-context.md`（DG 承接回写，本 plan 只记录不改写）

- Item Types: `Proof | Follow-up`

- [x] full-green 记录：执行日所属 daily log 节（typecheck/build/lint 32/32 + test 59/59 计数 + e2e 计数/失败归因清单 + `pnpm check` exit 0 + component-lab/smoke/navigation/host-surfaces 计数 + watch-only 终态清单 + fresh/零缓存执行证据）。
- [x] roadmap DV 行 `todo`→`done`（附执行证据引用）。
- [x] 一致性核对遗留（D3.2 补齐或待补登记）收口确认；归因清单更新（如 DR 终态与记录差异）。
- [x] 为 DG 提供收口输入清单（full-green 记录位置、门禁基线、index 素材范围）。

Exit Criteria:

- [x] full-green 记录在案（计数 + watch-only 终态清单 + 归因零悬空）；roadmap DV 行 `done` + daily log 收口节。
- [x] 本 plan 所有 in-scope 项勾选完成（closable 状态交独立 closure-audit 裁决）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session）——轮 1 `ses_01e9ea793ffe4PO5eG8lhGKY6O`（fail，1 Major）；轮 2 `ses_01e923277ffeoD9wn2ORf3MjVh`（pass，零 Blocker/Major）
- Verdict: `pass`（轮 2 共识达成；1 Minor 措辞不阻塞）
- Rounds: 2
- Findings addressed:
  - Major-1（轮 1）：D3.2「机械收口」前提不成立（closure-audit 证据全链缺失：plan Closure 空 + daily log 自指 + roadmap 空壳引用 + Closure Gates 审计门禁项无证据勾选）→ Baseline 改「证据确认缺失」结论 + Phase 1 改两条诚实路径（真实 fresh-session closure-audit 按 D3.3/D3.4 证据范式 / 无独立 agent 则显式待补 + roadmap D3.2 行回退 `planned`），禁止以既有证据自证收口；Failure Paths/Non-Goals 同步。
  - Minor-1（轮 1）：roadmap D3.3 行格式破损（10 cells 残留碎片）→ Phase 1 一致性核对补修复项。
  - Minor-2（轮 1）：full-green 记录硬编码 08-08 → 改「执行日所属 daily log」。
  - Minor-3（轮 1）：验证命令补 fresh/零缓存执行声明（`pnpm test --force` 或等价证据，turbo 全缓存命中不作 full-green 证据）。

## Closure Gates

> **关闭条件**：本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选 `[x]` 后，才能将 `Plan Status` 改为 `completed`。closure-audit 由独立 fresh session 执行，执行 session 不得自审勾选。

- [x] 全量验证达成（typecheck/build/lint 32/32 + test 59/59 + e2e 全绿或 watch-only 终态归因零悬空 + component-lab/smoke/navigation/host-surfaces 回归通过）
- [x] `pnpm check` exit 0（28 项，`check:duplicates:detail` 非门禁归因维持；无新增命中或显式归因）
- [x] watch-only 终态清单在案（D2 终态 + DR 修复后终态，逐条理由）
- [x] round-2 plan 文件 ↔ roadmap 一致性核对完成（D3.2 补齐或显式登记待补）
- [x] full-green 记录于 daily log + roadmap DV 行 `done`
- [x] 不存在被静默吞掉的失败或归因悬空项
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### gantt-perf / kanban-perf（50Hz 环境阈值）

- Classification: `watch-only residual`
- Why Not Blocking Closure: D2 实测主屏 50.00Hz，rAF 50fps 硬上限致 >50/>60 阈值物理不可达；标注「需 60Hz 环境最终确认」，非本轮引入。
- Successor Required: `no`（环境确认后自动闭合）
- Successor Path: 无（60Hz 环境复测待外部条件）

### `check:duplicates:detail` exit 1

- Classification: `watch-only residual`
- Why Not Blocking Closure: 无阈值 jscpd dump 固有行为（D0/D1 已归因），带阈值门禁 `check:duplicates` exit 0；非本 plan 引入。
- Successor Required: `no`
- Successor Path: 无

### 60Hz 环境 e2e 复测

- Classification: `watch-only residual`
- Why Not Blocking Closure: 需要 60Hz 显示器环境（本机 50Hz），条件不可达非范围问题。
- Successor Required: `no`
- Successor Path: 无

## Non-Blocking Follow-ups

- project-context 基线回写（DV full-green 终态）由 DG 承接（本 plan 不改写）。
- 验证中发现的新缺陷（如有）显式登记路由（DR 已收口则登记 daily log 待人工裁决）。
- 其余不阻塞治理项登记 daily log（供 DG 承接）。

## Closure

Status Note: 4 Phase 全 completed（2026-08-09 实测全绿）；typecheck/build/lint 32/32（--force 零缓存）、test 59/59（10,703 passed / 0 failed）、e2e 1086 passed / 43 skipped / 3 failed（全数 watch-only 50Hz：gantt-perf ×2 + kanban-perf ×1）、`pnpm check` exit 0、test:scripts 6/15、component-lab 336/0、smoke+navigation 111/111、host-surfaces 133/0；round-2 plan↔roadmap 一致性核对完成（D3.3/D3.1 行格式修复 + D3.2 closure 由独立 fresh session 正式收口 轮 1 fail → 轮 2 pass）；阻断缺陷 bug 118（diff-view reaction 回声派发死循环）/ bug 119（gantt StrictMode store.destroy 空态）修复 + 回归测试 + bug note 行内补写；full-green 记录于 `docs/logs/2026/08-09.md`；roadmap DV 行 `todo → done`（附执行证据）；watch-only 终态清单零悬空。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，mission-driver closure audit，2026-08-09）
- Evidence: verdict `pass`——零 Blocker/Major，2 项 informational 已收口（Info-1：roadmap DV 行 deps 单元格补「（执行证据：…）」引用，与其他 completed 行格式对齐；Info-2：roadmap `Last Updated` 08-08 → 08-09）。逐项核对：① plan 文本一致性——Phase 1-4 全 `Status: completed` + 全部 item/Exit Criteria `[x]`（Closure Gates 为预置未勾态，按既有 executor-backfill 机制由本收口勾选）；② full-green 记录在案（`docs/logs/2026/08-09.md` DV 节：typecheck/build/lint 32/32 --force 零缓存、test 59/59 10,703/0、e2e 1086/43/3 全数 watch-only、check exit 0、test:scripts 6/15、component-lab 336/0、smoke+navigation 111/111、host-surfaces 133/0）；③ roadmap——DV 行 `done`（附执行证据）、D3.1/D3.3 行 6 列规范（awk 全表核对）、`Last Updated` 已 bump；④ D3.2 closure——plan `Plan Status: completed` + Closure Audit Evidence 轮 1 fail → 轮 2 pass 在案 + 10 卡 `closed` + Closure 行回填 + roadmap/daily log 更正；⑤ bug 118——diff-view-renderer.tsx:248-271 per-key latch + 回归测试（diff-view-renderer.test.tsx:352，断言正确结果非错误缺失）+ docs/bugs/118 + README:139 索引；⑥ bug 119——gantt.tsx:93-98/124 storeEmpty 自愈 + 回归测试（gantt-mount-timing.test.tsx:150，StrictMode 包裹 + dblclick 驱动 + Radix portal 断言）+ docs/bugs/119 + README:140 索引；⑦ vitest.scripts.config.ts:14 testTimeout 30_000（仅 harness 配置，无门禁规则/断言变更）；⑧ 诚实性——3 条 e2e 失败逐条核对为 50Hz 物理不可达阈值（gantt-perf.spec.ts:41/73 `>50`、kanban-perf.spec.ts:61 `>60`），`check:duplicates:detail` 为无阈值 jscpd dump 非门禁归因，两个阻断 bug 全 test-first 修复 + bug note 归因而非忽略；⑨ 独立复跑——`pnpm check` exit 0、`pnpm test:scripts` 6/15、flux-renderers-content 35 文件/293 测试、flux-renderers-scheduling 82 文件/919 测试全绿（含新回归测试）。

Follow-up:

- project-context 基线回写（DV full-green 终态）由 DG 承接（本 plan 不改写）。
- 验证中发现并修复的阻断缺陷（bug 118/119）为 D3.2/D3.3 时期误归「环境」的历史回归——如 DG/后续轮次在 e2e 归因中遇到类似「页面静默渲染空/悬挂但主线程响应」模式，优先查 dispatch 环与 StrictMode destroy 家族（bug note 118/119 Notes 节）。
- 其余不阻塞治理项登记 daily log（供 DG 承接）。
