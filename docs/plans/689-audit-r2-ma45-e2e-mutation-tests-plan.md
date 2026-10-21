# 689 审计修复 R2·MA4.5：测试有效性审计—全仓 e2e 有效性 + mutation 抽样 + 测试泄漏复扫

> Plan Status: completed
> Last Reviewed: 2026-10-22
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA4.5；`missions/audit-remediation-r2.json`；方法论 `docs/skills/exploratory-e2e-testing-prompt.md` + `exploratory-contract-testing-prompt.md`（探针面）+ 工具消费（`audit:mutants` / `check:audit-test-global-leaks` / `check:jsdom-pragma-whitelist` / `check:audit-todo-exitless` / `check:scanner-baselines`）；owner doc `docs/testing/e2e-standards.md` + `docs/testing/known-good-baselines.md`
> Related: matrix MA4 节（报告名模式 `*arm2-MA4.5-e2e-mutation-tests.md`）、`docs/audits/arm2-index.md`、MA4.1–4.4（先例 + 待消费线索：**P1-MA4.1-009 stryker config 裁决**、MA4.3 空壳 e2e〔kanban undo〕、MA4.4 断言级漂移〔note 37 词干〕与 trio pin 计数通胀、MA4.1 探针候选（P2-001 format validators 判别 + A-10/D-01 nested-regions 族）、validation 1.63% M0 登记）；`playwright.config.ts`（watch-only 机制 `E2E_EXCLUDE_WATCH_ONLY`）
> 方法先例沿用（MA4.1–4.4）：`_tmp/arm2-ma45/` 中间件（收口清理）；零**入库**代码变更——stryker 重测与契约探针使用 `_tmp/` 下临时配置/文件（不提交），探针转正归 MR2；P1 注册前执行者 grep 复核；显式路径提交。

## Purpose

全仓 e2e 有效性与 mutation 抽样审计：① **e2e 有效性**——干净跑（`E2E_EXCLUDE_WATCH_ONLY=1`）全量 276 spec（全 testDir 递归）实测 + watch-only 台账（gantt/kanban-perf 2 文件）重裁决 + skip/fixme 治理（9 处）+ 阈值类 perf spec（8 个）环境依赖归因 + 空壳/弱断言 spec 抽查（MA4.3/4.4 线索）；② **mutation 抽样**——以 `_tmp/` 临时配置修复 include 语义后重测 `flux-runtime/src/validation`（裁决 M0 的 1.63% 与 P1-MA4.1-009），并按核心契约模块抽样；③ **测试泄漏复扫**——三卫生扫描器收口核对 + MA4.1–4.4 各簇定性汇总归档；④ **探索式契约测试探针**——对 MA4.1–4.4 高价值无守护契约写临时失败探针验证（转正或删除）。产出 arm2 报告并登记 arm2-index；零入库代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-21 live 实测，HEAD 取证时点以日志为准；期间并发线 docs-only 提交可能发生——报告头记录双 HEAD 口径）

- **e2e 面**：`tests/e2e/` **276 spec**（testDir 递归：根 218 + component-lab 50 + exploratory 8；`find tests/e2e -name "*.spec.ts" | wc -l`）；`@watch-only` 标签 2 文件 3 处（`gantt-perf.spec.ts`/`kanban-perf.spec.ts`）；`playwright.config.ts`：workers 2、retries 1、timeout 45s、`grepInvert: [/@watch-only/]` 受 `E2E_EXCLUDE_WATCH_ONLY` 控制、webServer 起 playground + xlang mock server；skip/fixme/only **24 处**（其中 9 处为根目录显式清单〔code-editor 截图、debugger 诊断、flow-designer ×2、IME fixme、large-dataset ×2、mobile 条件 skip、README describe.skip〕、15 处已由 plan 623 归类豁免〔exploratory/interaction-tests ×6、subagent-a ×7、crud-table-body-diag ×1、debug-canvas ×1——均有理由注释〕）；unit 级 `it.skip` 1 处（fm3-contract-probes）。
- **perf/阈值 spec**：8 个（calendar/diff/gantt/kanban/performance-table/scada-editor/scada/three-canvas-perf）——project-context 记录 scada-editor-perf 3 个阈值测试未经裁决（plan 623 盘点），本项现场重裁决。
- **mutation**：`stryker.runtime.conf.mjs`（mutate=validation/\*.ts、break 60）；M0 登记 1.63%（490/470/380）；**P1-MA4.1-009 已裁定其测量口径失效**（`vitest.stryker.config.ts` include 经 mergeConfig 并集不生效）——本项以 `_tmp/` 临时 vitest 配置（defineConfig 直接指定 include，绕过 mergeConfig）+ 临时 stryker 配置重测，裁决真实分数；不修改任何入库配置文件（config 修复归 MR2）。
- **测试泄漏**：`check:audit-test-global-leaks` 108 = M0（MA4.1–4.4 已将各簇命中逐处定性归档：C1-C2 5 处 / C3 19 处 / C4-C7 64 处 / C8-C12 13 处全良性或有界——本项汇总为长期台账并入报告）；jsdom pragma no new；todo-exitless 1。
- **历史材料（检测启发）**：MA4.3/4.4 已立案空壳/名实不符 e2e（kanban-demo.spec undo、note 37 词干断言）；`docs/audits/round2-p3-inventory.md` 与 `docs/audits/visual-quality-r2/watch-pool.md` 等 watch-only 历史台账（仅作线索，重裁决以 live 为准）。
- **执行状态**：roadmap MA4.5 `todo`；arm2-index MA4.5 行 `—`。

## Goals

- 产出 `docs/audits/2026-10-21-HHmm-arm2-MA4.5-e2e-mutation-tests.md`：双风格，七要素发现，P0–P3 分级（P1 ID `P1-MA4.5-<nnn>`），归族。
- 覆盖面：① 干净 e2e 实测（exit/通过数/失败归因逐条）；② watch-only 2 文件重裁决（各 test 独立判定 keep/drop/fix）；③ skip/fixme 9+1 处逐条裁决（恢复/删除/转正理由）；④ 8 个 perf spec 环境依赖归因（阈值 in-environment or 回归门）；⑤ 空壳/弱断言 spec 抽查（线索清单 + 定向取证 ≥5 件）；⑥ mutation：validation 重测分数 + ≥2 个核心契约模块抽样（formula/compile 选一）+ P1-MA4.1-009 终裁；⑦ 探针：对 MA4.1–4.4 ≥3 个高价值无守护契约写临时失败探针并实跑记录（转正/删除裁决——全部探针用后删除，转正归 MR2）；⑧ 泄漏台账归档 + 三扫描器终核。
- 登记 arm2-index（MA4.5 行 + P1 行如有）；BUILD_VERIFY = 全量 `pnpm test`（unit 线，与 Closure Gates 共用同一次运行；e2e 干净跑结果单列）。

## Non-Goals

- 不修改任何入库代码/测试/配置（stryker/vitest 临时配置、探针全部落 `_tmp/` 用后删除；config 修复与探针转正归 MR2）；不预载 MA4.1–4.4 finding（仅消费其已注册 P1 与线索）；不执行 MA5+。
- 不新建 `docs/analysis/` 目录（先例沿用）。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA4.5 报告 + arm2-index 登记回填。
- 只读取证 + `_tmp/` 临时工件实跑：e2e 干净跑/watch-only 子集跑/stryker 临时配置重测/探针临时文件实跑。
- `docs/logs/2026/10-21.md` 追加 MA4.5 条目；roadmap MA4.5 行状态流转；本 plan 状态流转；收口提交 `fix(audit-r2):` 格式。

### Out Of Scope

- 任何入库代码/测试/配置变更（P0 除外；stryker/vitest config 修复、探针转正归 MR2）；MA5+ / MR / MV / MG；并发线未提交变更（一律排除）。

## Failure Paths

| 可测场景编号         | 触发                                                          | 行为                                                                        | 是否可重试 | 用户可见表现   |
| -------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------- | -------------- |
| e2e-env-failure      | e2e 干净跑因环境（端口占用/webServer 启动失败）非测试原因失败 | 归因记录，修复环境后重跑（可重试）                                          | 是         | 无             |
| mutation-timeout     | stryker 临时配置重测超 30 分钟未完成                          | 缩小抽样范围（单文件级）重试；仍失败则报告记录 + 转入 MA4.5 deferred 附证据 | 是         | 无             |
| probe-irreproducible | 探针未复现对应 P1 声称                                        | 归因（P1 证据复核），必要时升级为对原 P1 的勘误                             | 是         | 无             |
| audit-p0-found       | 发现 P0——Rule 2 六类之一                                      | P0 即时通道：plan 内追加 Fix Phase 或异步注入独立修复 plan                  | 否         | 无（修复先行） |
| scanner-drift        | 三卫生扫描器 ≠ 基线                                           | 停止收口，归因，报告记录                                                    | 是         | 无             |

预期 e2e 可能出现真实失败（那正是审计输入）；其余预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan（实跑既有测试 + 临时探针，零入库变更）；全量 `pnpm test`（BUILD_VERIFY）与干净 e2e 为 Proof 交付物。若触发 P0 追加 Fix Phase，自动升档（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi：e2e 实测与台账重裁决

Status: completed
Targets: `_tmp/arm2-ma45/`（日志与中间件）

- Item Types: `Proof | Decision`

- [x] **干净 e2e 实跑**（执行者，后台）：`E2E_EXCLUDE_WATCH_ONLY=1 npx playwright test --reporter=list` 实测 **1931 tests：1620 passed / 263 failed / 46 skipped / 2 flaky**，exit 1（52.1m，HEAD 6498b5053）；263/263 两次 attempt 全红；失败逐条归因见 Round D 聚类（238 gate / 25 非 gate）+ 执行者 10 个 live 探针裁决（报告 §⑤）
- [x] **watch-only 重裁决**（子代理 A）：`--grep @watch-only` 实跑 3/3 绿（avg=60）；逐条 keep-watch-only ×3（A-W1/W2/W3）；**scada-editor-perf 3 阈值 live 数值全部达标（7.9ms/65.3MB/61fps）——Round A 的"真回归门"归因被推翻**（红因=console gate）
- [x] **skip/fixme 治理**（子代理 A）：24+1 处逐条裁决——恢复 1（IME fixme，复活条件已满足）/ 维持 23 / 删除 0 / 转 watch-only 0
- [x] **perf spec 环境依赖归因**（子代理 A）：8 spec 25 test 逐一归因，`[PERF]` 数值全录入报告（22 keep-gate + 3 watch-only）
- [x] **空壳/弱断言抽查**（子代理 B）：276 spec 8 类模式量化 + 14 件精读（空壳/名实不符 4、弱断言 3、头注虚报 1、钩子替代 1、正常 5）；B-01/B-02 复核成立 = 既有 P1-MA4.3-009/007
- [x] **mutation 重测**（执行者，后台）：sandbox 模式三次失败后改 inPlace；配置矩阵 R1–R4（spread include/root 钉根 → related:false → disableBail）+ registry/validators 切片探针 + formula-engine 抽样实跑——dry-run 精确命中（130/354/61）但 per-mutant 执行数 0–218 非确定漂移、no-op mutant 在必挂测试下 survived → **装置四层失效，真实分数按 Failure Path 转 MR2 deferred**（P1-MA4.5-001；P1-MA4.1-009 终裁 confirmed-and-broadened）
- [x] **探针实跑**（子代理 C）：4 探针实跑（P1-MA4.4-005 红证实 / P1-MA4.1-005 行为绿覆盖缺口成立 / P1-MA4.2-003 红且升级 live defect / P2-MA4.1-001 绿维持），用后删除，git 零泄漏
- [x] **工具消费**（执行者）：leaks 108 = M0 / jsdom no new / todo-exitless 1 / scanner-baselines within；泄漏台账 C1-C2 5 + C3 19 + C4-C7 64 + C8-C12 13 + apps 3 + tests 4 = 108 对账闭合
- [x] 交叉去重 + P 级判定 + 归族；P1 注册前执行者逐条复核（6 条新 P1 全部有 live 探针或实跑证据；B-01/B-02 并入既有 ID 不重复登记）

Exit Criteria:

- [x] e2e 干净跑实测数字落字（exit/通过/失败/跳过 + 失败归因逐条）
- [x] watch-only/skip/perf 三台账逐条裁定落字；空壳抽查 ≥5 件落字（14 件）
- [x] mutation 真实分数落字（validation + formula-engine 两模块配置矩阵实跑数字全录；真实分数因装置无效按 Failure Path 落 deferred）+ P1-MA4.1-009 终裁落字
- [x] 探针 ≥3 条实跑红/绿记录落字 + 删除确认（4 条）
- [x] 四项工具输出消费行落字

### Phase 2 - open：live 信号驱动开放式追问

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] ≥2 轮追问（门语义是否掩蔽功能红 / 红潮时间线与过程性根因 / mutation 装置配置修完是否有效），三轮各有证据与「新增了什么」，第三轮显式停止
- [x] 深化机会与 MR2 / MG / MA5 交叉线索分栏记录（归族汇总 + Recommended Next Tests + 建议新增自动化检查）

Exit Criteria:

- [x] open 段 ≥2 轮且最后一轮显式停止（3 轮）
- [x] 全部发现归族 + P 级判定；P2/P3 入 deferred 附定级理由

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-22-0045-arm2-MA4.5-e2e-mutation-tests.md`（原计划 `2026-10-21-HHmm-*`——执行跨零点归档于 10-22，就地勘误）、`docs/audits/arm2-index.md`、`docs/logs/2026/10-22.md`（原计划 `10-21.md`，同上）

- Item Types: `Proof | Decision`

- [x] 报告按 MA4.1–4.4 同构格式落盘（含 e2e 实测节/mutation 节/探针节/台账裁定节/泄漏台账归档节/误报推翻清单/open 三轮）
- [x] arm2-index：MA4.5 行回填 + P1 ×6 行 + P1-MA4.1-009 终裁注记 + `audit:mutants` 工具基线行就地勘误注记 + Last Updated 滚动（累计 46）
- [x] daily log 10-22 追加 MA4.5 条目（计数 = 报告实数；新建 `docs/logs/2026/10-22.md`）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test` unit 线）并登记：exit 0（82/82，cached，HEAD 6498b5053 零源码变更）；复跑三卫生扫描器核对 = 基线（108 / no new / 1 / within）
- [x] 清理 `_tmp/arm2-ma45/`（closure audit 通过后、提交前执行——含探针删除确认；packages/ 下临时 stryker/vitest 配置已于 BUILD_VERIFY 前删除并复核 `git status` 零 packages/ 泄漏；`_tmp/arm2-ma45/` 整目录于提交前 `rm -rf`）

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致（grep 复核：P1-MA4.5-001..006 两侧均命中；index P1 行累计 46；报告路径行 L81 命中实存文件）
- [x] BUILD_VERIFY（`pnpm test`）exit 0（实数记录入报告收口补记 + log）；e2e 干净跑结果单列登记（1931/1620/263/46/2）

### Phase 4 - 收口与状态流转

Status: completed
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA4.5 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理 `agent_3e67c823`，R1 `approved` 0B/0M/4m）通过后：roadmap MA4.5 `planned`→`done`（行内附 audit:mutants 基线无效勘误注记，m4），本 plan→`completed`
- [x] 提交前 `grep -nE "^- \[ \]|^Status: (planned|in progress)"` 本 plan 零残留 + grep roadmap MA4.5 行字面值 `done` + prettier 五文件 + 确认 `_tmp/` 探针/临时配置已删 + `git status` 无 packages/ 泄漏
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`；显式路径提交，并发线文件不入 stage

Exit Criteria:

- [x] roadmap MA4.5 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_e7a62ccd`（五项检查 + 全量复算：watch-only 2 文件 3 处逐行、playwright config 五项、skip 9 处逐条实存但总数 24 勘正、perf 8 名单、scada-editor-perf 3 阈值出处〔project-context + plan 623 :109〕、待消费线索四处实存但探针候选归因勘正 MA4.2→MA4.1、stryker/vitest.shared 机制复核〔mergeConfig 并集 + alias 解析风险〕、mission commitFormat）
- Verdict: R1 `revised`（0B/3M/4m）→ 回修共识
- Rounds: 1
- Findings addressed: M1 e2e 计数 218→276（递归口径 + 台账覆盖全 testDir）；M2 skip 计数 9→24（15 处 623 豁免复核纳入范围）；M3 探针候选归因 MA4.2→MA4.1；m1 历史台账路径勘正（docs/audits/ + watch-pool.md）；m2 泄漏台账补簇外 apps/tests 对齐 108；m3 临时 vitest 配置机制补注（spread 覆盖保留 alias/setupFiles）；m4 Goals ⑥ 措辞消歧——均已落字

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明（unit 线；e2e 干净跑单列）。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（双风格两段齐备、七要素齐全、收口补记实数）
- [x] arm2-index 登记（MA4.5 行 + P1 ×6 + P1-MA4.1-009 终裁注记 + 工具基线行勘误）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（exit 0，82/82 cached）
- [x] 执行期间核对 `check:audit-test-global-leaks`=108 / `check:jsdom-pragma-whitelist` no new / `check:audit-todo-exitless`=1 / `check:scanner-baselines` within（执行前 + 收口后各一次）
- [x] 不存在被静默降级的 in-scope 项（P2/P3 只入报告 deferred 区附定级理由；mutation 真实分数与 13 处功能红逐条复裁落 Deferred But Adjudicated 附 successor）
- [x] 探针与临时配置已全部删除（`_tmp/arm2-ma45/` 清理 + `git status` 无 packages/ 泄漏）——packages/ 侧于 BUILD_VERIFY 前删并复核；`_tmp/arm2-ma45/` 整目录于 closure audit 通过后、提交前 `rm -rf`
- [x] roadmap Work Item Status MA4.5 行已流转 `done`（closure audit 通过后；行内附 audit:mutants 基线勘误注记）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据：`agent_3e67c823` R1 `approved`（0B/0M/4m），证据见 `## Closure`；执行 session 仅做回写勾选
- [x] `pnpm typecheck`（44/44 cached，零新增）
- [x] `pnpm build`（44/44 cached）
- [x] `pnpm lint`（44/44 cached）
- [x] `pnpm test`（82/82 cached，exit 0）

## Deferred But Adjudicated

### mutation「真实分数」交付（validation + formula-engine）

- Classification: `out-of-scope improvement`（Failure Path `mutation-timeout` 同型落账：装置不可用→报告记录 + deferred 附证据）
- Why Not Blocking Closure: 本 plan 为零入库变更的审计项（roadmap Cross-Cutting 9）；配置层缺陷已以临时配置全部修正并实测（dry-run 130/354/61 精确命中），残余失效在 stryker 9.6.1 × vitest 5.0.1 runner 交互（per-mutant 执行数 0–218 非确定漂移、json 探针 testsCompleted=0），属工具链代码/依赖修复——审计项不得实施；装置无效本身已作为 P1-MA4.5-001 登记并构成本项的有效审计产出（P1-MA4.1-009 终裁）。
- Successor Required: `yes`
- Successor Path: MR2.0 展开器 → P1-MA4.5-001 修复行（runner 兼容修复 + 四项配置固化 + canary mutant 自检 + 重测回填 arm2-index `audit:mutants` 基线行）

### 非 gate 功能红 13 处未逐条 live 复裁（P2-MA4.5-003）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 25 处非 gate 红已全部按簇归因（real defect / test drift）并以 10 个 live 探针裁决其中 12 处（ai-bubble ×2 降 P2、flow-designer 拦截 ×3 + 裁剪 ×2 升 P1、路由 meta ×1 test drift、cron ×2 升 P1、antdpro bulk ×1 升 P1、confirm-password ×1 test drift）；余 13 处为 demo/lab 页面交互级功能红，逐条取证属 MA5.1/5.4/5.5 功能走查面的本职（roadmap 矩阵已分配），MA4.5 的口径（e2e 判别力）对其结论为"e2e 判别诚实"（closure audit m2 勘正计数 11→13）。
- Successor Required: `yes`
- Successor Path: MA5.1 / MA5.4 / MA5.5 走查 plan（逐条取证升降级）+ MR3.0 展开

### 报告/log 归档日期（10-21 → 10-22）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 执行跨零点（前会话 10-21 中断、本会话接管），产物按实际落盘日期归档；plan Phase 3 Targets 已就地勘误注记，Related/Current Baseline 的"2026-10-21"为取证时点真实记录不改写。
- Successor Required: `no`

## Non-Blocking Follow-ups

- MG 沉淀候选（记录级）：① "诊断策略变更类提交必须全量 e2e 复跑或显式登记 e2e 债"（plan 595 → 12 天盲窗教训）；② stryker canary-mutant 装置自检；③ 阈值归因必须引用当轮 `[PERF]` 实测行（Round A 静态外推被 live 数值推翻的教训）。
- plan 628:127（scada-editor-perf 3 阈值）应按本轮归因改走语料/门路径而非"真回归修复"——报告误报/推翻清单第 1 条已记录，由 plan 628 owner 消费。

## Closure

Status Note: 五口径全部落地（干净 e2e 1931/1620/263/46/2 归因逐簇 + 10 live 探针裁决；三台账逐条；空壳 14 件；mutation 配置矩阵 9 行实跑定位四层失效；泄漏 108 对账闭合）；6 条新 P1 + 2 条既有 P1 升级/终裁登记 arm2-index；零入库代码变更核验通过；BUILD_VERIFY exit 0；两项 deferred 均有 Failure Path/roadmap 矩阵预授权与具体 successor；closure audit 独立通过。可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor `agent_3e67c823`（三件套输入：plan + diff summary + `_tmp/arm2-ma45/` 全部验证输出）
- Evidence: R1 **`approved`**（0 Blocker / 0 Major / 4 Minor）。审计员亲自重算：e2e 1931/1620/263/46/2 与 238/25+2 gate 拆分（failures-structured.json）、watch-only 3/3 avg=60、stryker dry-run 130/354/61 与 tests/mutant 七值与五张分数表逐一在日志命中、`email-probe.json` 23/23 Survived testsCompleted=0、no-op survivor `validators.ts:202:16`（final log L4927）与必挂测试 `__tests__/validators.test.ts:395-402` 实存、`[PERF-EDITOR]` 三值与 Round A 推翻（failure 244 为零错误门）、PROBE A2/B/C/D/E/E2/F/G/H 九行 JSON 与报告表述逐一吻合、泄漏台账按包重算 5/19/64/13/3/4=108、四扫描器亲跑 108/no new/1/within、`git status` 零 packages/ 与零 stryker 残留、arm2-index 6 行 + 46 累计 + 两处注记为纯追加、plan 内部一致性与 deferred 诚实性、`form-runtime.ts:234-296`/owner doc :154,:358/`dashboard-demo.tsx:168`/`schema-diagnostics-reporter.ts:13`/fixtures :79,:82-90,:119 语义抽查全部准确。Minor m1（泄漏子项 26/12/12→32/11/9）、m2（P2-003 计数 11→13）、m3（typecheck/build/lint 留痕 `build-verify-tbl.log` + 缓存前提注记）、m4（roadmap 行就地勘误注记）——全部随本收口 hunk 落地。worksheet `_tmp/arm2-ma45/closure-audit-R1.md`（随 `_tmp` 清理，结论已录此处）。

Follow-up:

- no remaining plan-owned work；MR2 successor：P1-MA4.5-001（工具链）/-002（e2e 门禁语料）/-003/-004/-005/-006 修复行；MA5.1/5.4/5.5 消费 P2-MA4.5-003 的 13 处功能红逐条取证。
