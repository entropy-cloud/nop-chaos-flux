# 668 审计修复 R2·MA3.2：代码质量审计—formula + compiler + action-core

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA3.2；`missions/audit-remediation-r2.json`；方法论 `docs/skills/code-quality-audit-prompt.md`（七维度）+ `react19-best-practices-review.md`（口径②）+ `workaround-code-smell-audit-prompt.md`（口径④）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA3 节、`docs/audits/arm2-index.md`、MA1.1（C1 结构面已审）、MA3.1（flux-core 质量基线与 oversized WARN 未登记机制议题——family 信号参照）、owner doc `docs/architecture/flux-core.md`

## Purpose

对 flux-formula（20 src/14 test，3,479 行）+ flux-compiler（40/43，7,790 行——plain 口径）+ flux-action-core（11/20，2,044 行）执行代码质量审计（matrix MA3.2，四口径）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `c8904b063`，工作树含并发线未提交文件——本项产物与提交不含之）

- **规模**：三包合计 71 src / 77 test / 13,313 行（plain 口径：非 `.test.ts` 即 src，含 test-only 导入的 fixtures/support 件；77 test 为 `*.test.ts` 口径）；**零 .tsx**（纯 TS）——口径② React 19 n/a（'use no memo' 三包 0；`check:react19` 全仓 0）。
- **口径③ 基线**：oversized WARN 触及三包 **12 件**（脚本口径行数）——实现件 6：action-core/action-execution.ts 684（**在案抽取评估裁定** :37-44 "[Plan 444 / 02-N2]…Decision: current cohesion is acceptable"）/ compiler/node-compiler.ts 647 / node-compiler-helpers.ts 620 / flux-value-shape-validation.ts 545 / shape-validation-analyze.ts 540 / formula/parser.ts 595；测试件 6：compiler validation-collection.test 667 / schema-compiler-contract-exploration.test 643 / schema-compiler-host-action-validation.xui-actions.test 604 / schema-compiler-registry-compilation.test 505 + formula contract-boundary.test 657 / evaluator.test 510。**均未登记**（MA3.1 P3-003 已立「WARN 件无登记机制」议题——本项为 family 证据扩展）。
- **口径④ 基线**：TODO/FIXME/HACK 三包 **0**；`as any`/`as unknown as` 触及三包 **3 位点**（compiler fields.ts:83 动态 schema 值编译、formula evaluator.ts:114〔注释行："was (as any)"——cq-6 已移除的特性化矩阵钉〕、evaluator.ts:400 动态成员访问带 DANGEROUS_MEMBER_KEYS 防护）——初判均为校准后动态边界，现场逐点复核。
- **口径① 抽样初判**：parser.ts（递归下降 + MAX_PARSER_DEPTH=256 栈深防护 + node factories）、node-compiler.ts（拆分后 orchestrator：fields/validation-collection/shape-validation/target-enrichment/symbols 兄弟模块导入）、node-compiler-helpers.ts（拆分件纯类型导入）。
- **churn（近 1 个月窗口实测）**：compiler 87 / formula 13 / action-core 12——compiler 为 RM-4/5/7/13/14 metamodel 系列收口热点（抽检携 plan 号）。
- **执行状态**：roadmap MA3.2 当前 `todo`；无已登记 `arm2-MA3.2-*` 报告（登记面；工作树执行侧草稿除外——m2 注）。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA3.2-formula-compiler-action-core-quality.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA3.2-<nnn>`；发现归族 local/family/systemic）。
- 覆盖面（四口径）：① **实现质量**（核心路径抽读 ≥6：action-execution 管线 / node-compiler + helpers / parser + evaluator / flux-value-shape-validation / built-in-actions——意图表达、复杂度组织、错误传播）；② **React 19**（n/a 论证）；③ **重构候选**（12 件 oversized 逐件裁定——6 实现件含在案裁定核验与拆分 ROI、6 测试件归 MA4.1 交叉信号；as-any 3 位点边界合理性；duplicates 触及三包 30 克隆归族）；④ **workaround 嗅探**（TODO 0 复核 + WA 台账核对 + 设计缝探测）。
- 产出即登记 `docs/audits/arm2-index.md`（MA3.2 行 + P1 行如有）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR2 批）。不预载 MA1.1/MA3.1 finding（MA3.1 P3-003 WARN 登记机制议题作 family 信号，本项重新取证三包部分）；测试覆盖质量归 MA4.1；性能归 MA7.1。
- 不执行 MA3.3 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA3.2 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：核心路径抽读 ≥6 文件、oversized 6 件逐件裁定、as-any 3 位点核验、duplicates 触及三包克隆归族、churn top-5、四口径扫描器复跑。
- `docs/logs/2026/10-20.md` 追加 MA3.2 条目；roadmap MA3.2 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA3.3+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                                           | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本项高概率实例：表达式求值数据损坏、action 重试/超时控制失灵致数据损坏；示例须可归入六类之一，否则按 P1/报告登记） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:react19` >0 / as-any 触及三包 >3 / oversized 三包口径超 12 件 / TODO >0                                                                 | 停止收口，归因（应零代码变更），报告记录                                      | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制的 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 四口径取证

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **实现质量**（抽读 ≥6）：action-execution.ts（dispatch→debounce→retry→timeout→runners 管线 + 在案裁定核验）、node-compiler.ts + node-compiler-helpers.ts（拆分后 orchestrator 形态）、parser.ts（MAX_PARSER_DEPTH 防护）、evaluator.ts（+ 语义特性化矩阵、DANGEROUS_MEMBER_KEYS 防护）、flux-value-shape-validation.ts（诊断上下文）、built-in-actions.ts；每文件三问
- [x] **React 19 口径**：三包零 tsx 论证 + `check:react19` 0——n/a 落字
- [x] **重构候选**：oversized 12 件逐件裁定（实现 6：action-execution 在案裁定核验 / node-compiler orchestrator / helpers 拆分件 / value-shape-validation / shape-validation-analyze / parser 自然规模；测试 6 归 MA4.1 交叉信号）；as-any 3 位点边界合理性复核；duplicates 触及三包 30 克隆归族（jscpd 报告）
- [x] **workaround 嗅探**：TODO 0 复核 + WA 台账（WA-formula/compiler/action-core 条目核对）+ as-unknown-as 链探测
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 六文件三问记录落字；oversized 6 件逐件裁定行（含测试件交叉信号）
- [x] 四口径基线对照行（react19=0 / as-any 3 位点逐点裁定 / TODO=0 / duplicates 30 克隆归族落字 / oversized 12 件逐件裁定落字）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：compiler churn 87 触摸（RM 系列亲核）、MA3.1 P3-003 family 扩展（三包 WARN 未登记）、MA1.1 交叉点（结构结论不预载）
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：action 重试/超时/取消的交叉状态机、编译诊断静默路径、表达式求值危险成员防护完备性
- [x] 深化机会与 MA4.1/MA7.1 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA3.2-formula-compiler-action-core-quality.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（收口补记门禁节 + 复核统计），文件名含时间戳
- [x] arm2-index：MA3.2 行回填；P1（如有）入索引区（**用精确行编辑，禁脚本字面替换——MA3.1 B1 教训**）
- [x] daily log 追加 MA3.2 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制的 Proof 交付物）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（编辑后 grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA3.2 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA3.2 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA3.2 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 扫描器/jscpd/台账实测复核 + 执行侧报告抽样核验）
- Verdict: R1 `revised`（0B/1M/3m）→ 回修 → R2 比对 `pass-with-minors`（0B/0M；m4/m5/m6 残留随激活/收口落）
- Rounds: 2
- Findings addressed: M1 oversized 清单 6→**12 件**（实现 6 + 测试 6 全列，四处联动：Baseline/Goals/Phase1/FailurePaths/ClosureGates）；m1 规模改 plain 口径 71 src/13,313 行；m2 基线加"登记面；工作树执行侧草稿除外"限定；m3 行数统一脚本口径；R2 残留 m4（Exit 首条 6→12）/m5（Purpose compiler plain 口径）随激活落、m6（报告 6→12 联动）随收口落

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA3.2 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:react19`=0 / as-any 三包=3 位点存量口径 / oversized 三包=12 件存量口径 / TODO=0
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA3.2 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `approved` 0B/0M/4m 注记级——m1 WA 枚举补全 8 条/m2 规模口径注记/m3 duplicates 归族 off-by-one/m4 复核统计回填，随收口 commit 落盘）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：oversized WARN 登记机制〔MA3.1 P3-003 并案，本项 +12 件〕、跨包克隆家族批〔MA3.1 P3-002 + 本项 P3-003 共 7 处〕、evaluator 守卫 helper 先钉后抽候选〔P3-001〕）

## Closure

Status Note: MA3.2 全部 Phase 交付完成——报告双风格落盘（multi 四口径 + open 三轮）、arm2-index 登记（MA3.2 行，P1=0；精确行编辑）、daily log MA3.2 条目、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增）、零代码变更纪律经独立实测核验。closure audit 首轮 `approved`（0B/0M/4m 注记级——m1 WA 枚举 6→8 条补全、m2 规模口径注记、m3 duplicates 归族 off-by-one、m4 复核统计回填；随收口 commit 落盘）。P0=0/P1=0/P2=0、P3=3（evaluator 比较守卫 4×13 显式形态残余〔先钉后抽候选〕/oversized WARN 未登记 family 扩展 12 件〔并入 MA3.1 P3-003〕/跨包克隆 5 处〔CX 家族批合并 7 处清单〕）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，16 组对账全 PASS：oversized 12 件 13 个行数逐中、六文件位点逐字在位、as-any/TODO/react19 扫描器口径精确、duplicates 30 克隆与跨包 5 处逐字吻合〔抽查 3 处全中〕、churn 精确命中、P3×3 定级诚实性专项通过、零代码变更）
- Evidence: 终局 `approved`（0B/0M/4m——"核心结论全部经独立实测成立"；4m 注记级修正随收口 commit 落盘）

Follow-up:

- no remaining plan-owned work
