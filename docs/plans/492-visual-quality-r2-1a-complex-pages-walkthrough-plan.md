# 492 视觉质量二期 R2-1a：复刻页与 complex-pages 域渲染面走查（40 页）

> Plan Status: completed
> Last Reviewed: 2026-09-23
> Source: `docs/backlog/visual-quality-r2-roadmap.md`（R2-1a work item）、`docs/skills/visual-page-quality-inspection-prompt.md`（走查口径）、`docs/audits/visual-quality-r2/README.md`（R2-0 批次裁定：R2-1a = complex-pages 全域 40 页）
> Related: `docs/plans/491-visual-quality-r2-coverage-infrastructure-plan.md`（R2-0，completed——本批消费其 inventory/ledger/capture 工具链）

## Purpose

对 complex-pages 域全部 40 页执行渲染面走查（迭代式多模态评审三步 + 程序化取证 + evidence card + A–H 评分卡），发现按三态强制归族（systemic→R2-3 / local→R2-4 / watch-only→台账），完成台账翻转（pending→carded→digested）。本批 closure 时按 roadmap 裁定**首批 systemic 族**（R2-3b 立项依据，本批终裁）与**最大 local 族的 R2-1a 侧输入**（R2-4 首批 = R2-1a/R2-2a 合并裁定，本批结论为输入）并登记台账。本 plan 不做任何产品修复（修复走 R2-3/R2-4 批）。

## Current Baseline（2026-09-23）

- 走查面 = `docs/audits/visual-quality-r2/inventory/pages.json` 中 batch=R2-1a 的 40 页（`#/<id>` hash 路由）：复刻页（antdpro×9、linear×6、sundial×5、cal×3、notion、airtable、stripe）+ CRUD/表单/审批类复杂页（standard-crud、tree-crud、inline-edit-table、advanced-query、master-detail、detail-subtables、business-document、combo-editor、form-wizard、complex-form、approval-tasks、dashboard、dynamic-tabs、crud-views-export 等）。
- 工具链就位（plan 491）：`pnpm visual:capture`（双主题×双视口截图矩阵 → `_tmp/`）、interactions.mjs（R2-1a 域已登记 6 键）、ledger.md（40 行 R2-1a 全 pending）、evidence-card 模板。
- 既有已知事实（去重对照输入，不重复立项）：①playground 宿主裸 `:root` 覆盖 `--popover` 致 dark 弹层亮底（plan 490 H/D 复检轮 P1，已归 local 族，本批确认其在 R2-1a 页面的影响面）；②master 存量 e2e 失败 9 例（与本批无关，走一期台账对账）；③replica 页样式与本项目其他页"不一致"不按本项目一致性判（检查提示词误报排除表）。
- 方法基线：检查提示词 A–H 维度 + 状态矩阵（light/dark 必查、~800 宽必查、弹层打开 ≥2、拖拽/异步态有则必查）+ 目视→程序化强制转换 + 独立复核强制。

## Goals

- 40 页逐页 evidence card（截图矩阵 + A–H 勾选 + 发现条目 ≥10 行/条 + 归族三态栏）落 `docs/analysis/2026-09-23-r2-1a-walkthrough/cards/`；每卡台账行翻转 `carded`。
- 每条 P0–P2 发现都有程序化证据（探针输出）或显式 `[visual-only]` + 独立复核结论；全部发现落入三态之一。
- `summary.md`：评分卡（40 页 × A–H）+ 系统性模式 Top N + 最大影响修复 Top 3 + **首批族裁定**（最大 systemic 族 → R2-3b 立项依据，本批终裁；最大 local 族的 R2-1a 侧输入 → R2-4）+ 与一期 r2/r3 裁决池、audit-followups、plan 490 复检轮发现的去重对照。
- 独立复核（fresh agent 重开页面重截同态截图、重跑探针）覆盖全部 P0/P1 发现与抽查 P2。

## Non-Goals

- 不修任何产品缺陷（含已知的 --popover P1）——本 plan 只产出 findings 与归族。
- 不走查 lab 124 页（R2-2 批）与其他域页面（R2-1b/c/d 批）。
- 不更换走查口径（roadmap Rule 4：更换口径须人工评审）。
- 不要求 glass 皮肤全覆盖（抽查即可，per 检查提示词状态矩阵）。

## Scope

### In Scope

- R2-1a 40 页的走查、取证、评分卡、归族、台账翻转（pending→carded→digested——digested 于归族进入对应批时翻转）。
- 首批族裁定记录（写入 summary.md 与 ledger 注记）。
- 独立复核报告（review.md，保留/降级/驳回逐条）。
- 复检轮（对修复前的走查轮，指 R2+ 定向深挖轮直至收敛，上限 6 轮——修复本身的复检在 R2-3/R2-4 批做）。

### Out Of Scope

- 任何 `packages/`、`apps/` 产品代码改动；`tests/e2e/` 改动。
- ledger 状态机 `verified` 翻转（属 R2-3b/R2-4 批内复检与 R2-5 全量轮）。

## Failure Paths

| 可测场景编号             | 触发                   | 行为                                                                                               | 可重试 | 用户可见表现   |
| ------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------- | ------ | -------------- |
| walk-route-dead          | 走查页打不开/白屏/报错 | 记 suspect 页卡（评分卡总评 fail(A5)），探针留存 console 错误，发现按 P0 归族 local                | 是     | 页卡标注       |
| probe-contradicts-visual | 探针推翻目视疑点       | 进"误报排除记录"，不进发现                                                                         | 是     | 页卡排除记录节 |
| family-tie               | 首批族裁定出现并列最大 | 以"影响页数多者 > findings 条数多者"为序；仍并列则两条族一并登记，由 R2-3b/R2-4 立项 plan 各自消化 | 否     | summary 裁定节 |

## Test Strategy

档位选择：**不适用：走查产档（docs/analysis + 台账翻转）+ capture 工具交互注册表扩面（scripts/visual-quality/interactions.mjs，仅手动 runner 消费、无测试消费），无产品代码与测试行为变更；程序化判据由每条发现的探针承担（探针脚本落 `_tmp/`，有回归价值的由 R2-5 评审提升进 e2e helpers）。**

## Execution Plan

### Phase 1 - 走查执行（40 页 × 三步评审）

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1a-walkthrough/cards/*.md`、`scripts/visual-quality/interactions.mjs`、`_tmp/visual-inspection-*/`

- Item Types: `Fix`（走查产出本身）| `Proof`（程序化取证）

- [x] Fix：按复刻家族分 6 波并行走查（6 路 fresh agent 并行；其中 antdpro/dashboard 两波曾因账户限流中断、低并发重跑完成）（antdpro 9 / linear+sundial 11 / cal+notion+airtable+stripe 6 / dashboard+approval-tasks+dynamic-tabs+crud-views-export 4 / form 族 form-wizard+complex-form+combo-editor 3 / 其余 CRUD 7 页：standard-crud、tree-crud、inline-edit-table、advanced-query、master-detail、detail-subtables、business-document）——每页：runner 截图矩阵 → ①自由 critique ②A–H 清单 grounding ③疑点程序化取证，产出 evidence card
- [x] Proof：128 条发现（P0×3/P1×21/P2×49/P3×47+深挖轮新增）逐条附探针输出或 [visual-only]+复核；探针脚本约 110 个留 `_tmp/r2-1a-probes/`
- [x] Fix：interactions.mjs 扩面——R2-1a 批 14 键（新增 11 + 沿用 3；antdpro-form-dialog/standard-crud 注册弹层打开态，实测产出 interaction 截图；其余 waitFor 锚点；无弹层页裁剪理由在卡内）
- [x] Fix：台账 40 行翻转 `carded`（card 列填卡路径），后随归族翻转 `digested`

Exit Criteria:

- [x] 40 张 evidence card 齐备且每张含状态矩阵截图清单（双主题 × 双视口 + 中间态；裁剪注明理由——约 200 张截图）与 A–H 勾选；台账 R2-1a 行全 `carded`→`digested`
- [x] `pnpm visual:reconcile` 保持 uncovered=0（翻转经再生成合并语义验证保留）

### Phase 2 - 独立复核（fresh agent）

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1a-walkthrough/review.md`

- Item Types: `Proof`

- [x] Proof：两路独立复核 agent（review-crud-form.md 15/15 保留含 3 P0 坐实；review-replicas.md 10 保留/1 降级/1 驳回）重开页面重截同态截图重跑探针；P1 覆盖 21 条 = 16 条逐一 live 复核 + linear C-01 家族 6/6 schema 静态坐实；P2 抽查 7 条

Exit Criteria:

- [x] review-\*.md 落盘且每条 P0/P1 有独立复核结论；驳回 1 条（notion A2-01）已从发现池移除并记入误报排除（卡与 review 双记录）

### Phase 3 - 归族、首批族裁定与汇总

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1a-walkthrough/summary.md`、`docs/audits/visual-quality-r2/ledger.md`

- Item Types: `Decision` | `Fix`

- [x] Fix：评分卡汇总（summary.md §1：fail 21 / 有风险 18 / pass 1）（40 页 × A–H，pass/warn/fail/—）+ 系统性模式 Top N + Quick Wins + 最大影响修复 Top 3 + 与一期 r2/r3 裁决池、audit-followups、plan 490 复检发现的去重对照（同根因默认维持原裁决，推翻须新证据）
- [x] Decision：**首批族裁定**（summary.md §6：首批 systemic = 弹层/表单 actions 左对齐族 ≥10 页 P1×4 本批终裁；最大 local 族 R2-1a 侧输入 = dark 平价族 ≈14 页 P1×3，终裁待 R2-2a 合并；窄视口渲染器侧根因登记第二 systemic 族 → R2-3c 候选）——最大 systemic 族（→R2-3b 立项依据，本批终裁）与最大 local 族的 R2-1a 侧输入（→R2-4 立项依据之一；roadmap 定义 R2-4 首批 = R2-1a/R2-2a 归族后合并裁定，R2-2a 完成前本批结论为输入非终裁；含 --popover P1 所在宿主主题族），写入 summary.md 与 ledger 注记
- [x] Fix：watch-only 发现登记进 `docs/audits/visual-quality-r2/watch-pool.md`（9 行，含 plan 490 遗留 P3） `docs/audits/visual-quality-r2/watch-pool.md`（id + 一句话 + 发现链接 + 登记日期；独立文件规避 ledger.md 被再生成整文件重写的冲突——closure audit M3 裁定）；plan 490 遗留的 P3 watch-only（header padding 不对称）同批入册
- [x] Fix：归族落定后 40 行全翻 `digested`

Exit Criteria:

- [x] summary.md 含评分卡 + 首批族裁定（两族各有 findings 清单与影响面统计）+ Top3 + Quick Wins + 去重对照
- [x] 已归族发现对应台账行 `digested`（40/40）；`pnpm visual:reconcile` 保持 uncovered=0

### Phase 4 - R2+ 定向深挖（至收敛）

Status: completed
Targets: `docs/analysis/2026-09-23-r2-1a-walkthrough/rounds/`

- Item Types: `Follow-up`（轮次记录）| `Proof`

- [x] Proof：定向深挖轮 round-01——7 项存疑/[visual-only] 复测：无新 P0–P2（P0 幻影校验根因坐实至 combo-renderer 缺 getChildFieldPathPrefix，修复一行），新增 3 条 P3 local 已归族；**连续一轮新发现均为 LOW → 收敛**（1/6 轮即达终止条件）

Exit Criteria:

- [x] 达到终止条件并记录（rounds/round-01.md）；无未归族的悬挂发现

## Closure Gates

- [x] 40 张卡齐备、台账 R2-1a 全 `carded`→`digested`（40/40）、reconcile uncovered=0（closure audit 实测两轮 closed）
- [x] 每条 P0–P2 发现满足：程序化证据或 [visual-only]+复核结论；三态归族无空缺（audit 全量 awk 扫描 0 缺归族栏）
- [x] 独立复核完成且 P0/P1 全覆盖（21 = 16 live + 5 家族静态；3 P0 全坐实）
- [x] 首批族裁定（systemic + local）落 summary §6 与 ledger note 列
- [x] 深挖轮达到终止条件（round-01 无新 P0–P2，1/6 轮收敛）
- [x] 独立子 agent（fresh session）closure audit 完成并记录证据（见 Closure Audit Evidence）
- [x] roadmap R2-1a 行状态回写（done）+ `Last Updated` 与 `docs/logs/` 同步
- [x] `pnpm typecheck` / `pnpm lint` / `pnpm check`（全链 exit 0）；`pnpm build` / `pnpm test` exit 0

## Deferred But Adjudicated

### glass 皮肤抽查

- Classification: `watch-only residual`
- Why Not Blocking Closure: 检查提示词状态矩阵将 glass 定为抽查项，本批按波统一裁剪未跑 glass（卡内注明）；不影响 light/dark 结论成立。
- Successor Required: `no`
- Successor Path: R2-5 全量复检轮顺带覆盖（watch-pool 已有 sundial-settings 分节同类先例）

## Non-Blocking Follow-ups

- glass 皮肤抽查发现（若有）登记 `docs/audits/visual-quality-r2/watch-pool.md`，不阻塞本批。
- 探针中具回归价值者由 R2-5 评审提升进 `tests/e2e/helpers/`。

## Closure

Status Note: 四 Phase 全部 completed、Closure Gates 全勾（2026-09-23）。40 页走查产出 128+ 条发现（P0×3 全部经独立复核坐实），归族无空缺；独立复核两路 27 条判定（保留 25/降级 1/驳回 1）；深挖轮 1 轮收敛；首批 systemic 族（弹层/表单 actions 左对齐族）与最大 local 族 R2-1a 侧输入（dark 平价族）已裁定登记，R2-3b/R2-4 立项依据就绪。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session）
- Evidence: verdict `approved`——产出真实性（40 卡抽 3 结构齐、评分卡一致、ledger 40/40 digested）、程序化验证（reconcile 两轮 closed、inventory 合并语义保留状态、typecheck/lint/check/build/test 全过）、复核可信度（notion A2-01 驳回由审计员第三次独立 live 复测确认）、首批族裁定健全性（同根因口径 + family-tie 规则不触发）全部通过。2 Major 为卡面记录未随裁定回写的文本一致性缺口（notion A2-01 驳回未回写卡内节、dynamic-tabs A1-02 归族栏与 watch-pool 不一致），已随收口修复；4 Minor（计数口径注记、interactions 键数、评分卡 C 列口径、先行批 roadmap 行遗留）已修或随本批回写修正（roadmap R2-0/R2-3a 行 `todo`→`done` 系此前 replace 因表格重排+反引号单元格比较失配静默未命中，本次按单元格值精确改写并回读验证）。

Follow-up:

- interactions.mjs 注册表随 R2-1b–d/R2-2 批扩面（各批 plan 范围）。
- 深挖轮发现的探针改进点（逐层合成对比度、覆盖检查+像素仲裁）随 R2-5 探针固化评审提升。

## Draft Review Record

- Reviewer / Agent: 独立 draft reviewer（fresh sub-agent session，round 1 → 修订回送 round 2 → M3 定点修复）
- Verdict: `revised` 后达成通过线（Round 2 残留 1 Major 修复面极小，审计员明示"M3 修复后无需第三轮全量复审，定点复核落点一致即可升 active"；M3 修复 = Watch Pool 改落独立文件 watch-pool.md，与 plan 表述一致）
- Rounds: 2 + M3 定点修复
- Findings addressed: Round 1（revised，2 Major / 6 Minor）——M1 波计数与族计数改正（linear×6/sundial×5；波 9/11/6/4/3/7）；M2 补 interactions.mjs 扩面 Fix 项 + Phase 1 Exit 收紧为完整状态矩阵口径。Round 2（residual 1 Major）——M3 Watch Pool 落点由 ledger.md 手工节（会被再生成整文件重写清除）改落独立 watch-pool.md；另落 m1 轮上限对齐 6 轮、m2 local 族"输入非终裁"限定、m3 Top3+audit-followups 去重池、m5 roadmap/logs 回写 Gate、m6 Closure 占位、两处 nit（Targets 补 interactions.mjs、Test Strategy 理由补注册表说明）
