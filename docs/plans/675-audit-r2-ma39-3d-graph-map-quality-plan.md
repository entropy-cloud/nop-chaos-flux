# 675 审计修复 R2·MA3.9：代码质量审计—renderers-3d + graph + map

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA3.9；`missions/audit-remediation-r2.json`；方法论 `docs/skills/code-quality-audit-prompt.md`（七维度）+ `react19-best-practices-review.md`（口径②）+ `workaround-code-smell-audit-prompt.md`（口径④）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA3 节、`docs/audits/arm2-index.md`、MA1.5（C5 结构面已审——**P1-MA1.5-001 3d 根 marker 缺失已立案 open 归 MR**，本项质量面不重审该 marker 题）、MA2.3（C5 运行时正确性已审——graph×16 reactive 已裁定处理器内读取、P1-MA2.3-001 camera IO 已立案）、MA3.1 P3-003（WARN 登记机制 family）、owner doc `docs/architecture/renderer-runtime.md`

## Purpose

对 C5 三小包（3d 24 src/25 test/2,946 行/1 tsx + graph 10/7/1,432/4 + map 9/6/1,647/1，合计 43 src/38 test/6,025 行/6 tsx）执行代码质量审计（matrix MA3.9，四口径）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `44d58f19c`，工作树含并发线未提交文件——本项产物与提交不含之）

- **口径② 基线**：`check:react19` 全仓 0；'use no memo' 三包 **0**；as-any **0**；TODO **0**。
- **口径③ 基线**：oversized WARN 触及三包 **3 件**（实现 2：graph/graph-renderer.tsx 668〔MA2.3 已抽样的 handler 族件——16 条 reactive reads 已裁定处理器内读取〕、3d/engine/scene-manager.ts 609〔MA2.3 已验 loadModels DiagnosticEvent 回调与 cleanup〕；测试 1）——**均未登记**（MA3.1 P3-003 family）。
- **duplicates 初判**：触及三包 **6 处**（触及口径——最小族）。
- **口径④ 基线**：WA 台账 **WA-3d-001/002 均 verified**（graph/map 无独立条目）——无 found 件。
- **口径① 抽样初判**：graph-renderer.tsx（action-handle 命令族 + 事件处理器族——MA2.3 已验）、scene-manager.ts（DiagnosticEvent 回调 + dispose 清理——MA2.3 已验）、map use-map-geojson（helpers.dispatch 经 env——MA2.3 已验 INV-1 合规）。
- **churn（近 1 个月窗口实测，窗口敏感注记）**：3d ≈65（threejs-integration 收口线）/ graph ≈19 / map ≈23。
- **执行状态**：roadmap MA3.9 当前 `todo`；无已登记 `arm2-MA3.9-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA3.9-3d-graph-map-quality.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA3.9-<nnn>`；发现归族 local/family/systemic）。
- 覆盖面（四口径）：① **实现质量**（核心路径抽读 ≥5：graph-renderer / scene-manager / three-canvas / map-renderer / use-map-geojson 或 transform-engine——三问）；② **React 19**（零 'use no memo' 论证 + check:react19 0）；③ **重构候选**（oversized 3 件逐件裁定 + duplicates 6 处归族）；④ **workaround 嗅探**（TODO 0 + WA-3d 2 条核对 + 设计缝探测）。
- 产出即登记 `docs/audits/arm2-index.md`（MA3.9 行 + P1 行如有，精确行编辑）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR2 批）。不预载 MA1.5/MA2.3 finding（P1-MA1.5-001 marker 缺失与 P1-MA2.3-001 camera IO **已立案 open 归 MR**、graph reactive 裁定已路由——本项不重审）；渲染器视觉行为归 MA6.3；交互归 MA5.5。
- 不执行 MA3.10 及以后工作项。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA3.9 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：核心路径抽读 ≥5 文件、oversized 3 件逐件裁定、duplicates 6 处归族、React 19 两点、WA 台账核对、churn top、四口径扫描器复跑。
- `docs/logs/2026/10-20.md` 追加 MA3.9 条目；roadmap MA3.9 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA3.10+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                          | 行为                                                                          | 是否可重试 | 用户可见表现   |
| -------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（示例须可归入六类之一，否则按 P1/报告登记）        | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan | 否         | 无（修复先行） |
| scanner-drift  | `check:react19` >0 / as-any 三包 >0 / oversized 三包 unique 超 3 件 / TODO >0 | 停止收口，归因（应零代码变更），报告记录                                      | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，Cross-Cutting 9 强制的 Proof 交付物）为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 四口径取证

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **实现质量**（抽读 ≥5）：graph-renderer.tsx（668 handler/action-handle 族）、scene-manager.ts（609）、three-canvas.tsx、map-renderer.tsx、transform-engine.ts 或 use-binding-bridge.ts；每文件三问
- [x] **React 19 口径**：零 'use no memo' 论证 + check:react19 0
- [x] **重构候选**：oversized 3 件逐件裁定 + duplicates 6 处归族
- [x] **workaround 嗅探**：TODO 0 复核 + WA-3d 2 条核对 + as-unknown-as 链探测（实测三包 123 处：生产面 8 处〔3d 5/graph 1/map 2——3d 与 WA-3d-002 裁定豁免面重叠〕余为测试替身）
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] 五文件三问记录落字；oversized 3 件逐件裁定行
- [x] 四口径基线对照行（react19=0 / as-any=0 / TODO=0 / duplicates 6 处归族落字）

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：churn 三包（threejs 收口线亲核）、MA1.5/MA2.3 交叉点（不预载）
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：graph handler 族内聚、3d scene 生命周期、map 数据面
- [x] 深化机会与 MA4.3/MA6.3 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-HHmm-arm2-MA3.9-3d-graph-map-quality.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（收口补记门禁节 + 复核统计），文件名含时间戳
- [x] arm2-index：MA3.9 行回填；P1（如有）入索引区（精确行编辑）
- [x] daily log 追加 MA3.9 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`，Cross-Cutting 9 强制的 Proof 交付物）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（编辑后 grep 复核行在位）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA3.9 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA3.9 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`

Exit Criteria:

- [x] roadmap MA3.9 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 十项对账全量复算 + 报告侧抽样 5 条）
- Verdict: R1 `revised`（0B/1M/4m+1 观察）→ 回修（审查员预授权："完成 M1 一行修复后即可达成共识"）
- Rounds: 1
- Findings addressed: M1 报告头状态超前→draft；m1 Non-Goals "已结案"→"已立案 open 归 MR" 措辞对齐；m2 churn 口径词补；m3 测试件具名（map-renderer.test.tsx 501）；m4 as-unknown-as 探测结果落报告 ④（123 处/生产面 8 处/WA-3d-002 重叠注）

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA3.9 行 + P1 行如适用）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 执行期间核对 `check:react19`=0 / as-any 三包=0 / oversized 三包 unique=3 件存量口径 / TODO=0
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA3.9 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `issues` 1B/1M/2m——**B1 报告文件被回修脚本变量误用覆盖为 roadmap 副本**〔md5 相同；代码侧取证被独立证实为真〕→ 报告整体重写〔含落盘事故披露节〕→ 第二轮复核 `approved` 0B/0M）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：oversized WARN 登记机制〔MA3.1 P3-003 并案，本域 +3 件〕、跨包克隆家族批；graph-renderer useEffectEvent 正面样例回填 react19 skill 候选）

## Closure

Status Note: MA3.9 全部 Phase 交付完成——报告双风格落盘（multi 四口径 + open 三轮；首轮落盘遭遇**脚本变量误用覆盖事故**〔B1，md5 与 roadmap 相同〕，整体重写并在头部披露）、arm2-index 登记（MA3.9 行唯一无重复，P1=0）、daily log MA3.9 条目〔含事故如实叙事〕、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增；44 包 1,837 文件 16,751 测试口径经 auditor 独立复跑）、零代码变更纪律经独立实测核验。closure audit 首轮 `issues`（1B/1M/2m）→ 重写 → 第二轮复核 `approved`（0B/0M——①报告非副本且 m2 落字段全齐备〔内容真实性抽验全为真〕②log 叙事与事实一致③三方一致+纪律面核查通过）。P0=0/P1=0/P2=0、P3=2（oversized WARN family 本域 3 件/结构相似克隆 6 处最小族）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，两轮：首轮 8 项对账〔7 PASS + B1 报告损坏〕→ 重写 → 第二轮 ①报告文件 md5 相异+内容真实性抽验全真 ②log 叙事一致 ③三方一致+纪律面 → `approved`）
- Evidence: 第二轮复核结论"0B/0M/0m（两项回修均验证通过）"；事故教训（脚本字面操作风险族：变量误用覆盖/表格替换静默失败——同族两起）归 MG 沉淀候选

Follow-up:

- no remaining plan-owned work
