# 725 审计修复 R2·R2.3：mutation 测量装置修复+重测（P1-MA4.5-001 + P1-MA4.1-009 同根）

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R2.3（MR2.0/plan 713 展开，同根归并依据）；`docs/audits/2026-10-22-0045-arm2-MA4.5-e2e-mutation-tests.md` §P1-MA4.5-001（四层失效 + Fix direction ①②③④）；`docs/audits/2026-10-21-0415-arm2-MA4.1-core-runtime-tests.md` §P1-MA4.1-009（include mergeConfig 并集不生效，终裁 confirmed-and-broadened）；owner doc `docs/testing/known-good-baselines.md`
> Related: arm2-index 工具基线区 `audit:mutants` 行（1.63% 基线 = 无效测量）；`stryker.runtime.conf.mjs`、`packages/flux-runtime/vitest.stryker.config.ts`；并发线 pnpm-lock 3 行 additive delta（披露并入）
> 编号 runway：724 为 R2.2（本线）；725 本 plan；ARC 线从 726 起避开

## Purpose

修复 mutation 测量装置并重测登记基线：当前 `audit:mutants`（stryker 9.6.1 + vitest 5.0.1）四层失效——①include mergeConfig 数组并集不生效（全包 153 文件全跑）〔修正=覆盖式替换，非 spread 并集〕②runner 内联 `bail:1`/`related` 未禁③`disableBail` 缺省④sandbox 相对解析——最终 per-mutant 执行数非确定塌缩（0.28–217.85 tests/mutant 漂移，23/23 mutant `testsCompleted=0` 仍判 Survived），**1.63% 分数不构成任何守护力测量**（P1-MA4.1-009 基线行就此无效）。修复路径 = 审计 Fix direction 四条全落：runner 升级（stryker 10.1.1，peer `vitest>=2` 覆盖 vitest 5，node 25≥22 满足 engines）+ 四项配置修正固化 + canary mutant 自检棘轮（杀不死即装置无效）+ 重测回填（validation 主口径 + formula-engine 审计点名口径）。

## Current Baseline（2026-10-24 live，HEAD `fdc641adb` 实测）

- 装置现状：`stryker.runtime.conf.mjs`（mutate=validation/_.ts 排 index/test、testFiles=4 件、coverageAnalysis off、tempDir .stryker-tmp/runtime）；`packages/flux-runtime/vitest.stryker.config.ts` = `mergeConfig(base, {test:{include:['src/validation/_.test.ts']}})`——**并集不生效**（MA4.1 Round C mergeConfig 实测：合并 include = base ∪ override，153 文件全执行）；版本：`@stryker-mutator/core`/`vitest-runner` ^9.6.1，vitest ^5.0.1；registry 现价：core 10.1.1 / vitest-runner 10.1.1（peer vitest>=2.0.0）/ vitest-runner 9.6.1（peer 同样 vitest>=2 但实现存在 bail/related 内联缺陷）。
- 失效证据（MA4.5 §⑥ 实测，本 plan Phase 0 复现）：no-op email validator mutant 存活而 `validators.test.ts:401` 必挂测试存在；json 探针 23/23 `testsCompleted=0` 判 Survived。
- 基线面：arm2-index 工具基线区 `audit:mutants` 行记 1.63%（490/470/380，break 60 以下）；`docs/testing/known-good-baselines.md` 现无 mutation 节（基线表为全绿运行记录，mutation 基线需新增专节）。
- roadmap R2.3 行 `todo`（:100）；arm2-index :166（4.5-001）/ :140（4.1-009）状态 `open`。

## Goals

- 装置修复：stryker 升级 10.1.1 + 四项配置修正固化（spread include / related:false / disableBail:true / sandbox 解析）。
- canary 棘轮落地：`audit:mutants:canary` 脚本——注入已知必杀 mutant → stryker 跑切片 → 断言 killed + 无 testsCompleted=0 假 Survived；装置失效时脚本失败（防回退）。
- 重测登记：validation 口径（既有 conf）+ formula-engine 口径（审计点名）双基线回填 `known-good-baselines.md` 新专节 + arm2-index 工具基线区行勘正；双 finding `closed`。

## Non-Goals

- 不改任何产品代码语义（canary 变异为临时注入，复员后提交）；不做全仓 mutation 普测（范围 = validation + formula-engine 两口径）；不动 e2e 门禁（R2.12 独立行）；并发线隔离。

## Scope（必填节）

### In Scope

- 根 `package.json`：`@stryker-mutator/core`/`@stryker-mutator/vitest-runner` ^9.6.1→^10.1.1（+`pnpm-lock.yaml`，含并发线 3 行 additive delta 披露）
- `packages/flux-runtime/vitest.stryker.config.ts`：include 并集→覆盖式替换（绕过 mergeConfig 数组合并）
- `stryker.runtime.conf.mjs`：`disableBail: true`、vitest runner `related:false`（经 10.x 对应配置键，落地时按 10.x 实际键名校正并 plan 补记）、temp/sandbox 解析修正（如 10.x 需要）
- `scripts/mutation/canary-selfcheck.mjs`（新建）+ `package.json` script `audit:mutants:canary`
- `packages/flux-formula/vitest.stryker.config.ts` + `stryker.formula.conf.mjs`（新建，formula-engine 口径）
- `docs/testing/known-good-baselines.md`：新增 Mutation Baselines 专节（scope/score/canary/日期/命令/边界）
- `docs/audits/arm2-index.md`：`audit:mutants` 基线行勘正 + 双 finding 回填 + Last Updated；roadmap R2.3 翻转（激活/收口两提交）；daily log

### Out Of Scope

- 产品代码变更（canary 注入临时、复员）；其余 P1-MA4.5-\*（R2.12/R2.13 独立行）；全仓 mutation 普测；并发线（ARC WIP、docs/index.md、platform-hardening-roadmap.md、P0-MA5.1-002 plan）。

## Failure Paths

| 可测场景编号   | 触发                                                                             | 行为                                                                                                                                                                                                                                                                                             | 用户可见表现                 | 可重试          |
| -------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | --------------- |
| upgrade-block  | stryker 10.1.1 与 vitest 5.0.1 仍不兼容（canary 仍存活或 testsCompleted=0 复现） | 降级试拳清单依序：①vitest runner `pool: 'forks'`/`isolate:false` 组合②stryker 10.0.0③vitest 降版钉扎（审计 fix direction ① 在册选项，MA4.5 audit:108/:84；爆炸半径入 Deferred 节裁决）④若全部无效——停，finding 改判「工具链不可修」并给出最小复现仓 + 上游 issue 链接，roadmap R2.3 改记 partial | 不适用（工具链内部测量装置） | 是（①②③各一轮） |
| runtime-blowup | validation 口径修复后单轮 > 40min                                                | 缩 mutate 集至 rules/validators 核心（plan 补记边界），仍 >40min 记 timeout 停                                                                                                                                                                                                                   | 不适用（工具链内部测量装置） | 是（一次）      |
| formula-scope  | formula 口径全包跑 > 40min                                                       | 缩至 compile/+evaluate.ts 核心（plan 补记边界）                                                                                                                                                                                                                                                  | 不适用（工具链内部测量装置） | 是（一次）      |

## Test Strategy

本档选择：**必须自动化**——canary 棘轮即自动化守卫。红证 = Phase 0 现状复现（canary 在坏装置上存活 = 装置无效的红证）；绿证 = canary 被杀 + 三连跑分数确定（漂移 < 0.5pp）+ 无 testsCompleted=0 假 Survived。判别机制（Rule 13）：canary mutant 指向 `validation/validators.ts` 一处测试必杀的分支（如比较符取反；in-scope 必杀证 `validators-edge-cases.test.ts:234-254`），坏装置必然放行（testsCompleted=0 机制），好装置必然击杀——装置有效性由 canary 单布尔判别，不依赖分数解读。

## Execution Plan

### Phase 0 - 现状复现（红证）

Status: completed
Targets: canary 注入 + 现装置实跑

- Item Types: `Proof`

- [ ] R0（探针口径：运行带 `--reporters json`——现 conf 仅 clear-text/progress，testsCompleted 仅存于 json 报告；下同）：canary 注入（`validation/validators.ts` 取一处比较符/布尔返回取反，测试必杀点）→ `pnpm audit:mutants` 现装置实跑 → 预期 canary **Survived**（红证成立，记录 testsCompleted 探针）→ git checkout 复员。若 canary 意外被杀：停，四层失效定性部分失效——按实际重裁（可能仅 include 层失效），plan 补记。

Exit Criteria:

- [x] 红证留痕：坏装置实跑输出入 plan（255/255 Survived、0.41 tests/mutant、254/316 testsCompleted=0）

### Phase 1 - 装置修复（升级 + 配置固化）

Status: completed
Targets: package.json、lock、两个 vitest.stryker config、stryker conf

- Item Types: `Fix`

- [x] 升级 `@stryker-mutator/core`+`vitest-runner` ^10.1.1（+65/-20 包，1m28s；lock 并发 3 行 delta 随提交披露）；`/reports/` 入 .gitignore（json 报告产物目录）
- [ ] `vitest.stryker.config.ts` include spread 修正（禁 mergeConfig 数组并集——改为显式 `test: { ...base.test, include: ['src/validation/*.test.ts'] }` 覆盖式替换（绕过 mergeConfig 数组并集；spread base include 会带回 `**/*` glob 并集——review R1 M1 勘正），以「dry-run 只收集 4 文件」为验收）
- [x] `stryker.runtime.conf.mjs` 固化 reporters `+'json'` + `disableBail: true`；〔执行注记：`related:false` 单列键在 10.1.1 实测无需——升级+include 修复后 per-mutant 执行数确定（0.41→5.08 恒定），9.x runner 内联 related 缺陷面随升级消除，未引入无效键〕
- [x] R1 绿证：validators.ts 切片实跑 **177 killed / 79 survived / 61 nocov = 55.84%（covered 69.14%）、5.08 tests/mutant、12s**；canary 探针：email 函数（:202）EqualityOperator mutants :198/:204 **Killed（testsCompleted 3-5）**；**false-survivors 0**
- [x] R2 确定性：3/3 连跑**逐位恒定**（55.84% / 177/79/61 / 5.08 tests/mutant——修复前装置在 0.28–217.85 间非确定漂移）

Exit Criteria:

- [x] R1 红转绿 + R2 三连稳定留痕入 plan；devDep 升级无传递影响以 flux-runtime 包内 vitest 复验（153 文件/1557 用例全绿；全量四门归 Closure Gates）

### Phase 2 - canary 棘轮脚本

Status: completed
Targets: scripts/mutation/canary-selfcheck.mjs、package.json

- Item Types: `Fix`

- [x] `scripts/mutation/canary-selfcheck.mjs`：报告断言式（见 Phase 0 注记）——动态定位 `email(input)` 函数体窗口（至下一兄弟 validator，排除邻位 NoCoverage）→ scoped stryker 实跑 → 断言窗口内 EqualityOperator canaries 全 Killed/Timeout **且**全文件零 `Survived+testsCompleted=0`；任一不满足 exit 1
- [x] `package.json` script `audit:mutants:canary`；脚本头注记用途（P1-MA4.5-001 fix direction ③ 棘轮 + 装置失效判别）

Exit Criteria:

- [x] 两态验证：正常 **exit 0**（2 canaries killed, 0 false survivors across 317 mutants）；人为破坏 **exit 1**（email 比较符 `.length>0` 语义等价替换→窗口 canary 消失/掩蔽→「canary escaped: 1/3 not killed (line 204:Survived testsCompleted=5)」→复员）——棘轮判别力实证

### Phase 3 - 重测登记与收口

Status: completed
Targets: stryker.formula conf、known-good-baselines、arm2-index、roadmap、daily log

- Item Types: `Fix`

- [x] formula-engine 口径落地（`stryker.formula.conf.mjs` + `packages/flux-formula/vitest.stryker.config.ts` 同构覆盖式替换 + root 钉扎；`thresholds.break: null` registration-only；全程 3min 无需缩界）
- [x] 双口径正式测量：**validation 全口径 493 mutants / 266 killed / 137 survived / 90 nocov = 53.96%（covered 66.00%）、8.88 tests/mutant、false-survivors 0、15s**；**formula 3190 / 2093 / 767 / 325 = 65.61%、44.83 tests/mutant、false-survivors 0、3min**；逐文件：rules.ts 10/10 NoCoverage（=MA4.1 P2-001 已登记 18 行零守护文件，独立行处置）、message.ts 31.48% 最弱已覆盖文件、registry.ts 100%
- [x] `known-good-baselines.md` `## Mutation Baselines` 专节落地（边界句 + 三行基线表：validation 全口径 / validators canary 切片 / formula 口径，含命令+commit+边界列）
- [x] arm2-index：工具基线区 `audit:mutants` 行复测登记追加（1.63% 作废→新基线数字+棘轮在位）+ :140（4.1-009）/ :166（4.5-001）→ `closed` + 注记；Last Updated 滚动（open 58→56）
- [ ] roadmap R2.3 `planned`→`done`（IN closure commit；激活提交 3f9eeea09 已先行翻转）；daily log 条目（随收口落）

Exit Criteria:

- [x] 双基线入册（53.96% / 65.61%，非 0 非 1.63% 遗留、canary PASS、命令可复跑）；arm2-index 双 finding `closed`（open 58→56）；roadmap R2.15 不受影响仍 `todo`

## Closure Gates

- [x] 全量门禁：typecheck 44/44 + build 44/44 + lint 44/44 + test 82/82（升级 devDep 后复验；flux-runtime 包内 153 文件/1557 用例）
- [x] `pnpm check`：唯一红=并发 ARC 未提交 markdown-lab-page.tsx:30（本会话 R2.2 轮 stash 对照已证干净树零新红；本 plan 新文件零 baseline 命中）
- [x] canary 棘轮两态验证留痕（正常 exit 0〔2 killed/0 false survivors〕+ 人为破坏 exit 1〔canary escaped〕；auditor 独立重演两态 byte-identical）
- [x] 独立 closure audit（fresh sub-agent `agent_71006cc4`，输入=plan+diff summary+验证输出）：**approved** 0B/0M/2m（m1 tests/mutant 统计口径澄清句已并入收口提交、m2 门禁覆盖注记=收口提交复验）——checklist 1-8 全 PASS，auditor 独立重跑 canary（exit 0）+ 双口径实测（formula 65.61% 精确复现）+ 棘轮两态 byte-identical 重演
- [x] 收口提交（flip `done` IN commit；记录复核结论）

## Deferred But Adjudicated

- **重测范围裁决**：审计 Fix direction ④ 点名「validation + formula-engine」——validation 为既有基线口径必须重测；formula-engine 为审计点名口径，落地受 40min timebox 约束（Failure Path formula-scope 缩界规则），缩界时 boundary 显式入册，不静默缩。
- **升级 vs 配置修复优先序**：MA4.5 残余根因判定「非配置可修复」（worker 快照时序疑似），故升级为第一动作、配置修正并行固化；若升级后 canary 即绿，配置修正仍保留（防御 9.x 已知内联缺陷面回退）。

## Draft Review Record

- R1（fresh sub-agent agent_c66f0a3d，2026-10-24）：**FAIL** 0B/2M/7m——M1 计划内 spread-include 表达式自身复现并集缺陷（修正：覆盖式替换措辞+表达式删除）；M2 升级失败梯缺审计在册救济 vitest 降版钉扎（修正：梯③补入）；m1 arm2-index 行号互换（:166=4.5-001/:140=4.1-009）；m2 json 探针依赖未列项（--reporters json + conf reporters+'json'）；m3 Phase Status 词表 planned；m4 Phase 1 exit 收窄包内复验（全量归 Closure Gates）；m5 Failure Paths 补第 5 列；m6 baselines 专节边界句；m7 canary 必杀证引 in-scope validators-edge-cases.test.ts:234-254。锚点核验：conf/conf-config/版本/registry/行号全实match。
- R2（同一评审 agent 复审，2026-10-24）：**PASS 共识**（pass-with-minors，0B/0M/2m）——M1/M2/m1-m7 全数确认已解；m-a 残留 spread 措辞三处（已随本激活提交统一为「覆盖式替换」）；m-b 复审轮次标注 R1→R2（本条即修正）。canary 判别力（必挂于旧装置、通过于新装置）与升级优先序裁定认可。准予 `active`。

## Non-Blocking Follow-ups

- 无（其余 P1-MA4.5-\* 归 R2.12/R2.13 独立行，非本 plan 剩余工作）。

## Closure

- [x] R2 复审共识（PASS pass-with-minors）后激活提交（Status→`active` + roadmap R2.3 `todo`→`planned` IN commit `3f9eeea09`）
- [x] 执行 Phase 0-3 → Closure Gates 全过 → closure audit **approved**（`agent_71006cc4`，0B/0M/2m：m1 统计口径句、m2 门禁收口复验注记）→ 收口提交（Status→`completed`、flip `done` IN commit）
- [x] Closure audit 记录：装置修复完整性（4 config 实读）、auditor 独立 canary exit 0 + 全口径 validation 53.96%/formula 65.61% 精确复现 + 棘轮两态重演；闭环判定 ①②③④ 全落位；include-union 修复结构性+经验性双证（4 文件收集/12s/testsCompleted≤130 不可能出自 153 文件并集）；零产品源码变更（git diff HEAD 空）；无 overclaim（3/3 恒定正确标注为切片口径）。
- [ ] 执行 Phase 0-3 → Closure Gates 全过 → closure audit PASS → 收口提交（Status→`completed`、flip `done` IN commit、记录复核结论于本节）
