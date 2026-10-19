# 667 审计修复 R2·MA3.1：代码质量审计—flux-core

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA3.1；`missions/audit-remediation-r2.json`；方法论 `docs/skills/code-quality-audit-prompt.md`（七维度）+ `react19-best-practices-review.md`（口径②）+ `workaround-code-smell-audit-prompt.md`（口径④）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA3 节、`docs/audits/arm2-index.md`、MA1.1（C1 结构面已审——本项质量面不重审结构）、owner doc `docs/architecture/flux-core.md`

## Purpose

对 flux-core（75 src/51 test，9,653 行）执行代码质量审计（matrix MA3.1，四口径：①实现质量 ②React 19 实践 ③重构候选 ④workaround 嗅探）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `f5d8a8760`，工作树含并发线未提交文件——本项产物与提交不含之）

- **规模**：75 src 文件 / 9,653 行；**零 .tsx**（纯 TS 基础包）——口径② React 19 对本包为 **n/a**（`check:react19` 全仓 0；'use no memo' 全仓 9 件均在渲染器/react 包〔codebase-map.md 专节登记〕，**flux-core 包内 0**——9 件归各包 MA3.x 口径②，本项跳过有据）。
- **口径③ 基线**：oversized WARN 3 件（types/runtime.ts 592 / types/actions.ts 556 / value-adapter.ts 553——脚本口径行数；前两件为纯 type 聚合文件、后一件为 adapter 家族单契约模块）为**未登记存量**（脚本豁免清单仅覆盖 ERROR 件；`docs/audits/check/01-flux-core-check.md:213/:300` 明文"无 flux-core 注册项/豁免清单无 flux-core 条目"）——本审计 ③ 口径须对"是否补登记/按族拆分"逐件裁定；`check:duplicates-baseline` 为全仓总量门禁（503 clones / 注册 597），**触及 flux-core 的克隆 8 个**（包内 6 + 跨包 2，以 jscpd 全仓报告为准；包内 6 处中 4 处落 oversized 二件内部）；index.ts 148 行 51 导出。
- **口径④ 基线**：TODO/FIXME/HACK/XXX 全包 **0 命中**；未注册 WA- 引用 0。
- **口径① 抽样初判**：registry.ts（重复注册检测 + override 告警）、commit-state.ts（引用复用语义）、contract-honesty.ts（469 行自查守卫——G15 逐 renderer 隔离 + G4 handle 锚定契约在案注释）实现与意图一致。
- **churn（近 1 个月窗口实测）**：index.ts(11)/types/renderer-api.ts(6)/renderer-definition-types.ts(5)——抽检全部携 plan 号（RM-6/RM-5/RM-3/CX-7/CX-6 收口系列），无裸改热点。
- **执行状态**：roadmap MA3.1 当前 `todo`；无 `arm2-MA3.1-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA3.1-flux-core-quality.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA3.1-<nnn>`；发现归族 local/family/systemic）。
- 覆盖面（MA3 四口径）：① **实现质量**（核心执行路径抽读：registry / commit-state / value-adapter 家族 / contract-honesty / schema-diagnostics manifest / host-action-provider——意图表达、复杂度组织、错误传播）；② **React 19**（n/a 声明 + 论证：零 tsx、零运行时 React 依赖面）；③ **重构候选**（3 件未登记存量 oversized 职责复核——聚合 vs 混合判定、拆分 ROI、补登记/拆分逐件裁定；duplicates 触及本包 8 克隆归族；index.ts 导出面稳定性）；④ **workaround 嗅探**（TODO/FIXME/HACK 0 + WA 台账引用核对 + 被绕过的设计缝探测）。
- 产出即登记 `docs/audits/arm2-index.md`（MA3.1 行 + P1 行如有）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR2 批）。不排 MR/R\*.n；不改写历史文档；不预载 MA1.1 finding（validation doc drift 已在 P1-MA1.1-001——文档面归 MR，本项质量面独立取证）。
- 结构/边界/导出面合规归 MA1.1（已收官）；测试覆盖质量归 MA4.1；性能归 MA7.1。
- 不执行 MA3.2 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA3.1 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：核心路径抽读 ≥6 文件、oversized 3 件职责复核、TODO/WA 嗅探、churn top-5、`check:react19`/`check:duplicates-baseline`/`check:audit-as-any-casts` 复跑。
- `docs/logs/2026/10-20.md` 追加 MA3.1 条目；roadmap MA3.1 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA3.2+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                                              | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本项高概率实例：核心求值/编译路径数据损坏、公共导出面破坏；示例须可归入六类之一，否则按 P1/报告登记，不得走 P0 通道） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:react19` >0 / `check:audit-as-any-casts` flux-core >0 / oversized flux-core 超 3 件存量口径                                                | 停止收口，归因（应零代码变更），报告记录                                      | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 四口径取证

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **实现质量**（抽读 ≥6 核心文件）：registry.ts（注册协议）、commit-state.ts（引用复用）、value-adapter.ts（adapter 家族——553 行〔脚本口径〕职责组织判定）、contract-honesty.ts（自查守卫 G15/G4）、schema-diagnostics/manifest.ts、host-action-provider.ts；每文件「意图表达/状态来源/错误传播」三问
- [x] **React 19 口径**：零 tsx 论证 + `check:react19` 0 复跑——n/a 声明落字
- [x] **重构候选**：oversized 3 件逐件职责复核（type 聚合 vs 实现混合；拆分 ROI + **未登记存量**的补登记/拆分裁定）；duplicates 触及 flux-core 的 8 克隆逐处归族判定（type 聚合文件内部重复是否属结构性重复；跨包 2 处归属）；index.ts 51 导出面与 churn 11 触摸的性质（plan 支撑）
- [x] **workaround 嗅探**：TODO/FIXME/HACK/XXX 全包 0 复核；WA- 台账引用 vs `docs/audits/workaround-code-smell/` 台账核对；被绕过的设计缝探测（cast 家族、as unknown 链、类型断言逃逸口）
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 六文件三问记录落字；oversized 3 件逐件判定行
- [x] 四口径各有基线对照行（react19=0/as-any=0/TODO=0；duplicates 8 克隆逐处归族判定落字；oversized 3 件逐件裁定落字）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn top-5（index.ts 11/renderer-api 6——plan 支撑已抽检）、MA1.1 交叉点（结构结论不预载）、`check:oversized-code-files` flux-core 口径复跑
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：contract-honesty 自查守卫的盲区、类型聚合文件的演进风险、json-merge/authoring 子域质量
- [x] 深化机会与 MA4.1/MA7.1 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA3.1-flux-core-quality.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（收口补记门禁节 + 复核统计），文件名含时间戳
- [x] arm2-index：MA3.1 行回填；P1（如有）入索引区
- [x] daily log 追加 MA3.1 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制的 Proof 交付物，非 Rule 18 意义上的 Phase 全量门禁）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA3.1 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA3.1 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA3.1 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 扫描器/账本实测复核）
- Verdict: R1 `revised`（0B/3M/3m）→ 回修 → R2 快速比对 `pass-with-minors`（0B/0M——5 处全落实）
- Rounds: 2
- Findings addressed: M1 duplicates 基线勘正（"flux-core 命中 0"→全仓总量门禁 503/597、触及本包 8 克隆〔包内 6+跨包 2、4 处落 oversized 二件内部〕，四处联动改"逐处归族判定"）；M2 oversized 定性勘正（"注册在案"→**未登记存量**〔豁免清单仅 ERROR 件、01-flux-core-check.md:213/:300 反证〕，Goals/Phase 1 同步改逐件裁定）；M3 'use no memo' 范围限定（全仓 9 件在渲染器/react 包、flux-core 包内 0）；m1/m3 value-adapter 行数统一脚本口径 553；m2 Phase 3 BUILD_VERIFY 加 CC9 出处括注

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA3.1 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:react19`=0 / `check:audit-as-any-casts` flux-core=0 / oversized flux-core=3 件存量口径不变
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA3.1 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `issues` 0B/1M/2m〔B1 arm2-index MA3.1 行因 prettier 重排表格致脚本替换静默未中〕→ 补登 + m1/m2 措辞 → delta 复核 `approved` 0B/0M/1m-informational〔随收口落盘〕）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：oversized WARN 件登记/棘轮机制〔P3-003，本包 3 件首批〕、跨包 util 克隆并入 CX 家族批〔P3-002〕——均已在报告排账）

## Closure

Status Note: MA3.1 全部 Phase 交付完成——报告双风格落盘（multi 四口径 + open 三轮）、arm2-index 登记（MA3.1 行，P1=0；B1 补登后经 delta 复核确认）、daily log MA3.1 条目、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增）、零代码变更纪律经独立实测核验。closure audit 首轮 `issues`（0B/1M/2m——B1 arm2-index MA3.1 行实际缺失：prettier 重排表格列宽致脚本字面替换静默未中；m1 churn 措辞过宽；m2 P3-002 定性低估）→ 补登 + 勘正 → delta 复核 `approved`（0B/0M/1m-informational 随收口落盘）。P0=0/P1=0/P2=0、P3=3（types 克隆族/跨包 util 逻辑克隆 CX 批候选/oversized WARN 无登记机制→MG）；workaround 面零活体；口径② n/a 论证成立。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，两轮：首轮 21 项对账 20 PASS 唯 B1 arm2-index 登记缺失 → 补登 + m1/m2 勘正 → delta 复核三项全闭合 + 范围纪律核验〔仅新增 arm2-index M、无计划外触碰〕→ 终局 `approved`）
- Evidence: delta 复核结论「B1 已实质闭合，m1/m2 落实；plan 667 可按 Phase 4 收口」；informational（报告 :33 旧措辞）已随收口 commit 落盘

Follow-up:

- no remaining plan-owned work
