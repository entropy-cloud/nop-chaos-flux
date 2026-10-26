# 705 审计修复 R2·MA8.3：CI guard 激活与工具基线有效性验证

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA8.3；`docs/audits/arm2-scope-and-dimension-matrix.md` MA8.3 行（报告名注册 `*arm2-MA8.3-ci-guards.md`；`pnpm check` 26 项逐一激活验证（closure review M1 勘正：chain 实数 26——`check:windows-safe-filenames` 于 2026-10-22 437daede8 加入，roadmap/matrix 的「25 项」为过时读数，随本批收口附勘误）；knip/dependency-cruiser/semgrep 配置有效性；`check:scanner-baselines` 基线机制真实防回退〔含基线 key 行号脆弱性抽查——2026-10-19 已迁移内容锚定键〕）；owner doc `docs/context/project-context.md`
> Related: matrix MA8 节、`docs/audits/arm2-index.md`（工具基线区 :214-240 各扫描器基线数）、MA7.2 semgrep 未安装裁决（引用）、MA7.3 基线校准 255（MV 输入，引用）
> 方法先例沿用：`_tmp/arm2-ma83/` 中间件（收口清理）；零**入库**代码变更（P0 即时通道除外；防回退 mutation 试验在工作树进行、试验后逐字还原——不产生 commit）；P1 注册前执行者 live 复核；显式路径提交

## Purpose

CI guard 体系有效性审计：`pnpm check` 26 项逐一激活验证（closure review M1 勘正：chain 实数 26——`check:windows-safe-filenames` 于 2026-10-22 437daede8 加入，roadmap/matrix 的「25 项」为过时读数，随本批收口附勘误）（每项真的会跑、真的会挡？）；knip/dependency-cruiser/semgrep 配置有效性；`check:scanner-baselines` 基线机制**真实防回退**验证（注入试验性命中 → 守卫必须红 → 还原）；产出 arm2 报告并登记 arm2-index；零入库变更（试验还原后无痕）。

## Current Baseline（2026-10-23 live，HEAD `e4e76a713`）

- **工具链**：`pnpm check`（25 项静态检查链）；`audit:knip`、`audit:deps`（=57 基线）、semgrep（未安装——MA7.2 裁决在案）；`check:scanner-baselines`（基线防回退门禁）。
- **基线区**：arm2-index :214-240 各扫描器基线数（**多行过时**——closure review m3：styling 240→255、suspects 733→765、async 337→342、react19-opt 649-650→663 均已在 scanner-baselines.json 注册；本批报告须实录该漂移并在 Phase 3 刷新 index 基线区）.
- **执行状态**：roadmap MA8.3 `todo`；arm2-index MA8.3 行 `—`。

## Goals

- 产出 `docs/audits/2026-10-23-HHmm-arm2-MA8.3-ci-guards.md`（矩阵注册名 ci-guards）：finding P0–P3（P1 ID `P1-MA8.3-<nnn>`）。
- 覆盖面（单轮子代理 + 执行者 mutation 验证；字母批拆分预授权）：
  - ① **pnpm check 25 项逐一激活验证**（子代理）：每项单独跑（exit code + 耗时 + 是否真检查 vs 空转——用注入试验探针验证其拦截能力，试验后还原）
  - ② **knip/depcruise 配置有效性**（子代理）：配置规则实际生效面（规则数、ignore 面大小、生产 vs 误报构成）
  - ③ **执行者 · 基线防回退 mutation 验证**：向受基线保护的扫描器注入 1 条试验性未注册命中 → `check:scanner-baselines` 必须红 → 还原 → 复绿（防回退机制存在性证明）；**基线 key 行号脆弱性抽查**（对行号键基线做行移位试验——2026-10-19 已迁移内容锚定键的在案先例复核）
  - ④ **执行者对账**：25 项结论表 + 防回退证明记录；P1 live 复核
- 登记 arm2-index（MA8.3 行 + P1 行〔触发时〕）；BUILD_VERIFY = 全量 `pnpm test`。

## Non-Goals

- 不修复 guard 缺口（P0 即时通道除外；治理批归 MR/工具批）；semgrep 安装不实施（MA7.2 裁决引用）；全量 25 项 × 多注入试验矩阵不覆盖（每项 1 次注入试验抽样）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA8.3 报告 + arm2-index 登记回填；`_tmp/arm2-ma83/` 实跑（mutation 试验痕迹全部留在 \_tmp）；daily log 追加；roadmap MA8.3 行流转；本 plan 流转；收口提交。

### Out Of Scope

- guard 修复实现；semgrep 安装；MA8.1/8.2 / MA9+ / MR / MV / MG；并发线未提交变更。

## Failure Paths

| 可测场景编号     | 触发                               | 行为                                                                                                                                                                                                                                                      | 可重试 |
| ---------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| tool-failure     | pnpm check 项失效                  | 归因记录（本身即 finding）+ 手动等价验证                                                                                                                                                                                                                  | 是     |
| mutation-unclean | 注入试验后还原不干净               | **备份优先还原**：注入前 `cp <file> _tmp/arm2-ma83/backup/`，还原从备份恢复（非 git checkout——并发线 MM 文件的未暂存半区会被静默销毁）；`git checkout` 仅限注入前即时核验 `git status` 无该文件并发变更时使用；每次 probe 的备份/还原记录 mutation-\*.log | 是     |
| audit-p0-found   | Rule 2 六类之一（如 guard 全空转） | 即时通道                                                                                                                                                                                                                                                  | 否     |
| subagent-quota   | 限流/模型失败                      | fresh 重启一次；再败执行者亲跑                                                                                                                                                                                                                            | 是     |
| round-overflow   | 单轮超上限                         | **字母批拆分（MA8.3-a/-b，Cross-Cutting 5 预授权）**                                                                                                                                                                                                      | 否     |

（"用户可见表现"列不适用——流程性失败路径。）

## Test Strategy

本档选择：**不适用**——纯审计取证（零入库变更；mutation 试验在工作树注入并逐字还原，痕迹仅 \_tmp）；`pnpm test` 为 Proof。触发 P0 自动升档。

## Execution Plan

### Phase 1 - single：激活验证 + 防回退 mutation

Status: completed
Targets: `_tmp/arm2-ma83/round-A.md`、`_tmp/arm2-ma83/mutation-*.log`

- Item Types: `Proof | Decision`

- [x] **Round A · 26 项逐一激活验证 + 配置有效性**（子代理）：26 项全跑（25 真门禁+1 report-only、零空转）；**11 注入探针全 RED**（备份优先+byte-identical 10/10）；knip.json/depcruise 有效性结论；**发现链当轮 RED**（P1-001 活状态案）+ depcruise 未入链（P1-002）
- [x] **执行者 · 基线防回退 mutation**：由 Round A 11 探针承载（含 scanner-baselines 棘轮探针——+1 翻红 5 次复现）；执行者抽检 3 份 mutation 日志全链在案；行号键零残留结论落定（m2 预裁定）
- [x] **执行者对账**：26 项结论表落字；P1-001 活状态归属裁决（并发线落地义务）+ P1-002 定级

Exit Criteria:

- [x] 26 项结论表（§0）+ 防回退证明（§2 11 探针）+ 行号脆弱性结论（§3 零残留）落字
- [x] mutation 试验还原清洁核验（cmp byte-identical 10/10 + git status 回到原始 churn）；P1 复核实录

### Phase 2 - open：live 信号驱动开放式追问

Status: completed

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（R1 链红归因——**closure R1 重定罪为 standing 双源在案红、归属 guard/工具批**；R2 守卫有效性终验——探针+活体双向成立），末轮显式停止
- [x] MR3 / 工具批 交叉线索分栏（工具批 +P1-002 depcruise 基线化入链 +P2-001 docs-garbled 裁决 +P3-2 链耗时；并发线 +knip 棘轮义务；MG 零新增）

Exit Criteria:

- [x] open ≥2 轮显式停止；P2/P3 入报告 deferred/watch 附理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed

- Item Types: `Proof | Decision`

- [x] 报告落盘（`docs/audits/2026-10-23-1150-arm2-MA8.3-ci-guards.md`：26 项表 + 防回退证明 + P1 ×2 + deferred + open 轮 + 收口补记；closure R1 M1 重定罪 P1-001 归属随收口修正）
- [x] arm2-index：MA8.3 行 + P1-MA8.3-001/002 行 + Last Updated 滚动（累计 69）+ **基线区漂移刷新**（m3 义务），grep 复核
- [x] daily log 追加（头部插入；计数 = 报告实数）
- [x] BUILD_VERIFY `pnpm test` 登记（exit 0，82/82）+ typecheck/build/lint（44/44 ×3，exit 0；同一运行登记复用于 Closure Gates）
- [x] 清理 `_tmp/arm2-ma83/`（closure audit R1 通过后执行；含 backup/）

Exit Criteria:

- [x] 报告与 arm2-index 逐条一致（grep：P1-MA8.3-001/002 双侧命中；基线区四项对齐 scanner-baselines.json——closure R1 M2 补完 react19 663）
- [x] BUILD_VERIFY exit 0 登记（gate-\*.exit 全 0）

### Phase 4 - 收口与状态流转

Status: completed

- Item Types: `Proof`

- [x] draft review 通过后：roadmap MA8.3 `todo`→`planned`，plan→`active`
- [x] closure audit（fresh subagent `agent_cf7f6666`）R1 `issues`（0B/2M/3m——M1 P1-001 归因证伪：knip 2 命中为 standing 双源在案红非并发线诱发〔staged 删除文件仍在盘/测试无引用/HEAD 即复现/arm2-index :252 自 M0 在案〕→ 重定罪归属 guard/工具批；M2 react19-opt index 行未刷新 → 663 补完；3m：Phase 3 勾选流转、25 项表→26、deps exit 57 措辞；review-M1 erratum 25 项→26 落 roadmap/matrix 随本 commit）approved 后：roadmap MA8.3 `planned`→`done`（行号 surgery + sed 回读核验），plan→`completed`
- [x] 提交前零残留 grep + prettier + `_tmp` 已清 + 入库面 diff 仅 In Scope 文档
- [x] 单次提交（显式路径；并发线不入 stage；临时 index）

Exit Criteria:

- [x] roadmap 与 plan 状态流转一致（sed 回读核验）
- [x] 提交仅含 In Scope 文件

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_88ea064c`（roadmap :87 / 矩阵 :141 / arm2-index :97、HEAD `e4e76a713`、check chain 程序化计数 26、scanner-baselines.json + 守卫红行为、2026-10-19 迁移记录、git status 并发线 98 行 churn 实测、guide 合规）
- Verdict: R1 `revised`（0B/2M/3m）→ 回修共识
- Rounds: 1
- Findings addressed: M1 计数勘正 25→26（windows-safe-filenames 2026-10-22 加入；roadmap/matrix 过时读数随收口附勘误）；M2 mutation 还原改**备份优先**（git checkout 会静默销毁并发 MM 文件未暂存半区、且状态核验无法察觉——备份优先 + 即时核验限定 + probe 日志）；m1 Last Reviewed 落日期；m2 行号脆弱性抽查预裁定（无残留+先例复核为显式 finding）；m3 index 基线区过时漂移实录义务（Phase 3 刷新）——均已落字

## Closure Gates

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足
- [x] arm2-index 登记与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记
- [x] 不存在被静默降级的 in-scope 项（watch-only 附理由入台账）
- [x] 探针与临时配置已全部删除（`_tmp/arm2-ma83/` 清理含 backup/；mutation 试验零残留核验——cmp byte-identical 10/10 记录在案）
- [x] roadmap Work Item Status MA8.3 行已流转 `done`（closure audit 通过后，sed 回读核验）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（44/44） / `pnpm build`（44/44） / `pnpm lint`（44/44） / `pnpm test`（82/82）登记（exit 0 ×4）

## Deferred But Adjudicated

（无——执行中改判当场落本节。）

## Non-Blocking Follow-ups

- （待执行中落账）

## Closure

Status Note: CI guard 审计收官——**MA8 批次（8.1–8.3）全部 done**（P1 ×2 新案〔链当轮 RED standing 双源在案红——closure R1 重定罪非并发线诱发 / depcruise standing-red 未入链未基线化〕+ P2 ×1 + P3 ×3；26 项激活验证 25 真门禁零空转 + 11 注入探针全 RED 备份优先零残留 + 行号键零残留 + 基线区刷新对齐）；字母批裁定：未拆分；零业务代码变更核验通过（mutation 备份还原零残留）。可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_cf7f6666`（R1）
- Evidence: R1 **`issues`**（0B/2M/3m）→ 回修 → 全部落地。审计员独立复核：**P1-001 活体复现**（check:knip-baseline 2 命中逐字）+ **归因证伪**（staged 删除文件仍在盘/被删测试无引用/xlang spec net-identical/arm2-index :252 自 M0 在案/UseDataSourcesArgs 9-16 引入 git log -S 空）→ 重定罪 standing 双源、归属 guard/工具批；**P1-002 全链核**（depcruise 3 error 规则、exit 57、57 no-circular、check 链无 depcruise、scanner-baselines 无条目）；**11 mutation 日志抽检 3 全链**（pre-churn/sha256 双记/注入红/备份还原 cmp byte-identical/复绿）+ 棘轮 +1 翻红 5×复现；26 项 chain 程序化计数 + 表位核对（knip #22/docs-garbled #20/windows #26）；M2 react19 663 补完。

Follow-up:

- no remaining plan-owned work；P1-MA8.3-001 修复行在 guard/工具批（两身份注册 knip-baseline 或修复本体——独立于并发线）；P1-MA8.3-002 + P2-001 修复行在工具批；MV 终验注意 check 链当前红状态（P1-001 未修复前 full pnpm check = exit 1 在案）；MA9.1（开放式对抗审计 core/runtime）为下一工作项。

Follow-up:
