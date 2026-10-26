# 762 PH-9 e2e 基线红治理：2026-10-26 全量运行权威台账

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-9（C 组；"当前最大无队列存量"）
> Related: `docs/logs/2026/10-18.md:118`（1563 passed / 262 failed，52.8m）；arm2 R2.12（strict 诊断同根族治理，已 done）；`docs/testing/known-good-baselines.md`（owner doc）；QA.7 §C（flake 另册）；plan `754`+（本 plan 后续 item）

## Purpose

为全量 e2e 建立一份**权威、内容锚定、逐项归因**的失败台账并收口：2026-10-26 运行（`E2E_EXCLUDE_WATCH_ONLY=1`，watch-only 三项剔除，1940 用例）为基线快照，逐失败项归入互斥类别并给出承接指针；同时检验 roadmap "硬红极少" 诊断是否被产品回归推翻。

## Current Baseline

2026-10-26（HEAD ~`309a3a567`）：

- **10-18 运行**：1563 passed / 262 failed（52.8m），日志声明"归 e2e 治理线"但无台账（roadmap PH-9 动机）。
- **关键交叉事实（已证伪，closure 须显式记录）**：10-18 的"主导 = strict schema 诊断 238/263 红同根"原假设 R2.12 已治理——但 10-26 实测 **248 failed vs 262（仅 −14）**：要么 R2.12 未覆盖这些 spec 的诊断面、要么存在第二同根根因。台账与 §Cross-Cutting ⚠ 更新必须按证伪结论记录，不得沿用"已被承接"叙事。
- **10-26 运行**（本 plan 执行期采集）：`E2E_EXCLUDE_WATCH_ONLY=1`，`--reporter=json` 输出 `_tmp/ph9-e2e/results.json`（脱离进程运行中）。用 2 workers / retries 1（与 10-18 同口径；并行在途代码 confound：运行期间本会话另两个 plan（758-760 等）合入——与 10-18 的 confound 同性质，逐项归因以**隔离复跑**为准。
- 归因类别（互斥）：**A** 产品回归（新引入，须修复或升级 P0/P1）；**B** 既有产品缺陷（arm2 P1/P2 已登记的实例）；**C** flaky（重试已收敛或隔离复跑绿）；**D** 测试自身过期/错误断言；**E** 环境/基础设施（端口、冷启动、infra；**perf 帧率阈值不在此类**）；**F** perf 阈值未裁决面（50Hz/60Hz rAF 门等，roadmap 已委派 arm2 MA7.1 / plan 628）。
- flake 另册：QA.7 §C 已登记 gantt / map-demo / ai-attachments / openPage 冷启动家族——C 类直接引用，不重复；**台账记录 C 类项的首轮失败签名**（retries=1 下首败签名在 JSON results[0]，PH-10 免重跑）；10-26 出现 QA.7 §C 四族外新 flaky（`complex-pages-interaction-state.spec.ts:225`）→ 新 C 条目独立登记。

## Goals

- `docs/testing/e2e-baseline-ledger.md`（新）：运行元数据（commit/env/workers/耗时）+ 汇总 + **按 spec 分组、内容锚定**（测试全名，不用行号）的逐项台账，每项含：错误签名（首行截断）、类别、隔离复跑结果、承接指针（owner/plan/不修理由）。
- 聚类辅助脚本 `_tmp` 产出的签名聚类（不提交脚本；聚类结论落台账）。
- 归因收口：A 类 = 0（若有 → 修复或显式升级，roadmap 诊断修正）；其余各类均有承接指针。
- roadmap "硬红极少" 诊断的检验结论落 §Cross-Cutting ⚠ 行就地更新。

## Non-Goals

- 不修复 B/D 类实例（承接给 owner 面，本 plan 只归因与登记）。
- 不做 perf 阈值裁决（F 类指针即可）。
- 不改任何测试或产品代码（纯台账 + 文档；隔离复跑允许）。

## Scope

### In Scope

- `_tmp/ph9-e2e/` 运行产物（gitignored，按 AGENTS 约定不入库；台账文本入库）
- `docs/testing/e2e-baseline-ledger.md`（新）；`known-good-baselines.md` 加指针
- roadmap PH-9 回写 + §Cross-Cutting ⚠ 行更新；daily log

### Out Of Scope

- B/D 类修复；PH-10 flake 深入归因（C 类只登记指针）

## Failure Paths

| 场景               | 触发                                     | 行为                                        | 可重试 | 用户可见            |
| ------------------ | ---------------------------------------- | ------------------------------------------- | ------ | ------------------- |
| product-regression | 隔离复跑仍红且非 flaky/既有缺陷/测试过期 | A 类：修复（升级为 in-scope Fix）或 P0 升级 | —      | 台账 A 类非零即触发 |
| run-infra-fail     | 全量运行本身异常中断                     | 重跑；台账记录中断                          | 是     | —                   |

## Test Strategy

本档选择：**建议有测**（台账为文档；但隔离复跑命令与证据全部落文，A 类若出现则按 Bug Fix Rule 补测试）。

## Execution Plan

### Phase 1 - Proof：全量运行与聚类

Status: completed
Targets: `_tmp/ph9-e2e/`

- Item Types: `Proof`

- [x] 全量运行完成（50.3m，脱离进程）：**expected 1643 / unexpected 248 / flaky 3 / skipped 46**（总 1940；运行树 HEAD ~`309a3a567`，并行在途 758–761 confound 披露）。JSON `_tmp/ph9-e2e/results.json`（10.1MB）完整。
- [x] 聚类完成：**129 簇**（`_tmp/ph9-e2e/cluster.mjs`）。主导形态 = 页面零 console.error 门（ai-widgets 17+9+7+5、w4a-multimedia 9、scada-editor 7、component-handles 6 等）。

Exit Criteria:

- [x] 运行完成且 JSON 完整；聚类表产出。

### Phase 2 - Fix：逐簇归因与隔离复跑

Status: completed
Targets: 台账文本

- Item Types: `Fix`

- [x] 每簇隔离复跑（`npx playwright test <spec> --reporter=list`）：复跑绿 → C；红 → 读错误定 A/B/D/E/F。（台账 §3：8 批 iso-b1..b8，247/248 stable red）
- [x] A 类出现 → 逐项修复或升级（in-scope Fix 项追加）。（A 类 = 0，无需追加）
- [x] 台账成文；10-18 的 262 与 10-26 失败集的差集说明（R2.12 承接 + confound 说明）。（台账 §1 差集段）

Exit Criteria:

- [x] 每个失败项均有类别 + 证据 + 承接指针；A 类为零或已处置。

### Phase 3 - Docs 与回写

Status: completed
Targets: 台账、`known-good-baselines.md`、roadmap、daily log

- Item Types: `Fix`

- [x] `known-good-baselines.md` 加台账指针；roadmap PH-9 `todo`→`planned`→`done`；§Cross-Cutting ⚠ 行按结论更新；daily log。（2026-10-27 落文）

Exit Criteria:

- [x] `pnpm check` exit 0。（2026-10-27 复跑实测 exit 0，含 3 个已登记豁免的超限文件）

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agent `agent_4d74c910`（2026-10-26）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 4 Minor）
- Rounds: 1
- Findings addressed: 无 Blocker/Major。4 Minor 落文：①"R2.12 已承接"按证伪记录；②50Hz 归 F、E 仅 infra；③C 类记首败签名 + 新 flaky 独立登记；④confound 758–761。审阅者确认运行完成且统计一致。

## Closure Gates

- [x] 台账成文且逐项归因（内容锚定）
- [x] A 类产品回归为零或已处置
- [x] 10-18 → 10-26 差集说明落文
- [x] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] 纯文档 plan：`pnpm typecheck`/`build`/`lint`/`test` 按 guide 可删——保留 `pnpm check` 一项
- [x] `pnpm check`（2026-10-27 实测 exit 0）

## Deferred But Adjudicated

### B/D 类实例修复

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap PH-9 范围是"台账 + 归因收口"；修复归各 owner 面（多数已有 arm2 P1/P2 编号）。
- Successor Required: `no`（台账指针即承接）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 2026-10-27 收口。台账 251 项逐项归因（A=0/B=213/C=4/D=7/E=26/F=1）、8 批隔离复跑 247/248 stable red、R2.12 证伪裁决与差集说明落文；回写（roadmap PH-9 done、§Cross-Cutting ⚠ 勘误、known-good-baselines 指针、daily log）与台账同 commit 入库。独立 closure audit `approved`（0 Blocker / 0 Major / 2 Minor informational）。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_9329788e`（2026-10-27）
- Evidence: verdict `approved`；独立重算类别计数 213+4+7+26+1=251 与台账 §2 一致；抽查 3 项 B 类归因诚实（错误签名与 P1-MA4.5-002/plan 734 语料族吻合）；复跑 `pnpm check` exit 0；commit `80aae4239`（D 类 F6 迁移）核验存在。2 Minor：①E 类"疑似产品缺陷"项（cal-replica 等）不因 PH-9 done 而视为已根因归因（台账措辞已如实）；②台账必须与本回写同 commit 入库（本提交即满足）。

Follow-up:

- E 类 26 项单点归因与 F9"疑似产品缺陷"项 → PH-10 / 各 owner 面（台账 §4 指针）。
