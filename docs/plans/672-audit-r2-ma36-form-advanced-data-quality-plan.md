# 672 审计修复 R2·MA3.6：代码质量审计—renderers-form-advanced + renderers-data

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA3.6；`missions/audit-remediation-r2.json`；方法论 `docs/skills/code-quality-audit-prompt.md`（七维度）+ `react19-best-practices-review.md`（口径②）+ `workaround-code-smell-audit-prompt.md`（口径④）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA3 节、`docs/audits/arm2-index.md`、MA1.3（C3 结构面已审）、MA2.2（C3 运行时正确性已审——condition-builder:206 reactive 已由 MA2.1 路由 MA7.1，本项不重审）、MA3.1 P3-003（WARN 登记机制 family）、owner doc `docs/architecture/renderer-runtime.md` + `form-validation.md`

## Purpose

对 flux-renderers-form-advanced（71 src/173 test，17,238 行，34 tsx）+ flux-renderers-data（120 src/184 test，22,838 行，39 tsx）执行代码质量审计（matrix MA3.6，四口径）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `1ff37bb32`，工作树含并发线未提交文件——本项产物与提交不含之）

- **规模**：form-advanced 71 src / 173 test / 17,238 行 / 34 tsx；data 120 src / 184 test / 22,838 行 / 39 tsx（src 口径：排除 `*test*`/`__tests__`/`test-support`）。
- **口径② 基线**：`check:react19` 全仓 0；'use no memo' 本域 **1 件**（data/table-renderer/use-table-row-scope-cache.ts——**in-file 理由注释在案**（"level mutable caches + a version counter + post-render population, which the transform cannot model. `use no memo` opts just this file out."）——**登记口径注（M2 勘正）**：全仓实测 10 处指令/8 文件，codebase-map 登记表仅列 3 行（登记滞后——随 MG MA3.1 P3-003 登记机制并案补全））。
- **口径③ 基线**：oversized WARN 触及两包 **50 件**（实现 22 + 测试 28，`check:oversized-code-files` 实测）——**累计最大族**：data 侧 table-renderer 拆分族（table-header-row 700/table-body-row-rendering 616/table-editable-cell 541/use-column-resize 561 + 主件 table-renderer 663）、chart-renderer 690、crud-renderer 683 + definition 593 + state 586、tree-renderer 663、list-renderer 551、schemas 508；form-advanced 侧 upload-field 693/transfer 674/picker 671/detail-view 652/array-field 611/array-container-controller 591/condition-builder 575 + value-input 556 + condition-group 517/object-field 530——**均未登记**（MA3.1 P3-003 family）。
- **duplicates 初判**：触及两包 **119 处**（触及口径；主体为渲染器/字段族 JSX 与 controller 结构相似——精确归族现场判定）。
- **口径④ 基线**：TODO/FIXME/HACK 两包 **0**；`as any` **0**；WA 台账——**WA-fadv-001..010**（001-007 verified、008/009/010 found）+ **WA-data-001..012**（001/002/004/005/006/008/009/010 verified、003/007/011/012 found）共 **22 条**——found 七件为台账既有登记件。
- **口径① 抽样初判**：table-renderer.tsx（拆分后 orchestrator——table-renderer/ 兄弟目录导入）、condition-builder.tsx（:206 projectionCaches.scope.get 为 **MA2.1 已路由 MA7.1 位点**——本项质量面不重审定级）、use-table-row-scope-cache.ts（'use no memo' 登记件）。
- **churn（近 1 个月窗口实测，窗口敏感注记）**：data ≈383 触摸 / form-advanced ≈224——FM-7（plan 651）/FM-6（plan 649）系列收口热点（携 plan 号）。
- **执行状态**：roadmap MA3.6 当前 `todo`；无已登记 `arm2-MA3.6-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA3.6-form-advanced-data-quality.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA3.6-<nnn>`；发现归族 local/family/systemic）。
- 覆盖面（四口径）：① **实现质量**（核心路径抽读 ≥6：table-renderer 主件 / crud-renderer / chart-renderer / condition-builder / upload-field / detail-view——意图表达、复杂度组织、错误传播）；② **React 19**（'use no memo' ×1 登记一致性 + in-file 理由 + check:react19 0 + 密度抽样）；③ **重构候选**（oversized 50 件逐簇裁定——table-renderer 拆分族/crud 族/condition-builder 族/form-advanced 复合字段族 + duplicates 119 处归族）；④ **workaround 嗅探**（TODO 0 + WA 台账 22 条核对〔found 七件定性〕+ 设计缝探测）。
- 产出即登记 `docs/audits/arm2-index.md`（MA3.6 行 + P1 行如有，精确行编辑）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR2 批）。不预载 MA1.3/MA2.2 finding；condition-builder:206 reactive 定级归 MA7.1（MA2.1 路由在案）；测试组织归 MA4.2；表格交互行为归 MA5.4。
- 不执行 MA3.7 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA3.6 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：核心路径抽读 ≥6 文件、oversized 50 件逐簇裁定、duplicates 119 处归族、React 19 两点、WA 台账 22 条核对、churn top、四口径扫描器复跑。
- `docs/logs/2026/10-20.md` 追加 MA3.6 条目；roadmap MA3.6 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA3.7+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                      | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本项高概率实例：表格数据损坏、上传/选择器数据丢失；示例须可归入六类之一，否则按 P1/报告登记） | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:react19` >0 / as-any 两包 >0 / oversized 两包 unique 超 50 件 / TODO >0                                            | 停止收口，归因（应零代码变更），报告记录                                      | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制的 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 四口径取证

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **实现质量**（抽读 ≥6）：table-renderer.tsx（拆分 orchestrator）、crud-renderer.tsx、chart-renderer.tsx、condition-builder.tsx（不重审 :206 定级）、upload-field.tsx、detail-view.tsx；每文件三问
- [x] **React 19 口径**：'use no memo' ×1 in-file 理由核验 + check:react19 0 + 密度抽样
- [x] **重构候选**：oversized 50 件逐簇裁定（实现 22 按报告七簇互斥分法：data table-renderer 拆分族 4〔含主件〕/data 渲染器族 4/data 状态与字面族 3/form-advanced 复合字段族 3/条件族 3/上传选择详情族 4/其余 1 + 测试 28 归 MA4.2 交叉）；duplicates 119 处归族
- [x] **workaround 嗅探**：TODO 0 复核 + WA-fadv 10 条 + WA-data 12 条状态核对（found 七件位点定性）+ as-unknown-as 链探测
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 六文件三问记录落字；oversized 50 件逐簇裁定行
- [x] 四口径基线对照行（react19=0 / 'use no memo' ×1 登记一致 / as-any=0 / TODO=0 / duplicates 119 处归族落字）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn data 383/form-advanced 224（FM 系列亲核）、MA2.2 交叉点（C3 运行时面不预载）、table-renderer 拆分族演化
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：table-renderer 拆分族接口漂移、crud 状态族、condition-builder 族结构
- [x] 深化机会与 MA4.2/MA5.4/MA7.1 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA3.6-form-advanced-data-quality.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（收口补记门禁节 + 复核统计），文件名含时间戳
- [x] arm2-index：MA3.6 行回填；P1（如有）入索引区（精确行编辑）
- [x] daily log 追加 MA3.6 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制的 Proof 交付物）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（编辑后 grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA3.6 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA3.6 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA3.6 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 全量复算〔22 件行数逐一、50 unique、119、WA 22 条按包分组〕+ 报告侧抽样 5 条）
- Verdict: R1 `revised`（0B/2M/5m）→ 回修（审查员预授权免复审轮）
- Rounds: 1
- Findings addressed: M1 报告 WA-data verified 9→**8**（9+4=13 自相矛盾——枚举勘正）；M2 "codebase-map 9 件族"失实→**实测 10 处/8 文件、登记表仅 3 行（登记滞后）**——plan+报告改实测口径 + Follow-up 落 successor（登记补全随 MG 并案）；R3 plan 簇和 23→22 对齐报告互斥七簇；R4 报告头状态改 draft；R5 收口补记标注 07:04 预检+Phase 3 正式重跑；R6 P2 聚合改可复算口径（runtime 11 + react 7 + basic/form 20 + 本域 50 = 88+）

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA3.6 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:react19`=0 / 'use no memo' 本域=1 件存量口径 / as-any=0 / oversized 两包 unique=50 件存量口径 / TODO=0
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA3.6 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `approved` 0B/0M/2m 信息性——9/9 对账全 PASS：oversized 50 unique/22 件行数逐一/WA 22 条/duplicates 119/10 vs 3 行登记滞后属实；附加独立复验两包 focused 测试 1215+1254 全过）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：oversized WARN 登记机制〔MA3.1 P3-003 并案，本域 +50 件最大增量，**最高优先**〕、**codebase-map 'use no memo' 登记表补全**〔M2——实测 10 处/8 文件 vs 表列 3 行〕、跨包克隆家族批〔累计以 CX 批盘点为准〕）

## Closure

Status Note: MA3.6 全部 Phase 交付完成——报告双风格落盘（multi 四口径 + open 三轮）、arm2-index 登记（MA3.6 行唯一无重复，P1=0）、daily log MA3.6 条目、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增）、零代码变更纪律经独立实测核验（附加两包 focused 测试复绿佐证）。closure audit 首轮 `approved`（0B/0M/2m 信息性——9/9 对账全 PASS：oversized 50 unique/22 件行数逐一/WA 22 条逐条/duplicates 119/codebase-map 登记滞后 10 vs 3 属实）。P0=0/P1=0/P2=0、P3=2（oversized WARN family 累计最大族 50 件——MA3.1 P3-003 升最高优先；结构相似克隆 119 处触及——家族批）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，9/9 对账全 PASS：50 unique 全量/22 件行数逐一/六文件位点逐字/WA 22 条逐条/duplicates 119/规模复算/零代码变更/门禁滞后正确/P3 双抽样定性；附加 form-advanced 1215 + data 1254 focused 用例独立复绿）
- Evidence: 终局 `approved`（0B/0M/2m 不阻塞——"收口前置状态正确"；successor 归属确认两项 MG 候选非本 plan 欠账）

Follow-up:

- no remaining plan-owned work（MG 候选确认：oversized WARN 登记机制最高优先 + codebase-map 'use no memo' 登记表补全〔缺口 5 文件/7 指令〕）
