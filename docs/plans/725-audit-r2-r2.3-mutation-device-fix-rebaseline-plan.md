# 725 审计修复 R2·R2.3：mutation 测量装置修复+重测（P1-MA4.5-001 + P1-MA4.1-009 同根）

> Plan Status: active
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

Status: planned
Targets: canary 注入 + 现装置实跑

- Item Types: `Proof`

- [ ] R0（探针口径：运行带 `--reporters json`——现 conf 仅 clear-text/progress，testsCompleted 仅存于 json 报告；下同）：canary 注入（`validation/validators.ts` 取一处比较符/布尔返回取反，测试必杀点）→ `pnpm audit:mutants` 现装置实跑 → 预期 canary **Survived**（红证成立，记录 testsCompleted 探针）→ git checkout 复员。若 canary 意外被杀：停，四层失效定性部分失效——按实际重裁（可能仅 include 层失效），plan 补记。

Exit Criteria:

- [ ] 红证留痕：坏装置放行 canary 的实跑输出（Survived + testsCompleted）入 plan

### Phase 1 - 装置修复（升级 + 配置固化）

Status: planned
Targets: package.json、lock、两个 vitest.stryker config、stryker conf

- Item Types: `Fix`

- [ ] 升级 `@stryker-mutator/core`+`vitest-runner` ^10.1.1（pnpm install；lock 并发 3 行 delta 随提交披露）
- [ ] `vitest.stryker.config.ts` include spread 修正（禁 mergeConfig 数组并集——改为显式 `test: { ...base.test, include: ['src/validation/*.test.ts'] }` 覆盖式替换（绕过 mergeConfig 数组并集；spread base include 会带回 `**/*` glob 并集——review R1 M1 勘正），以「dry-run 只收集 4 文件」为验收）
- [ ] `stryker.runtime.conf.mjs` 固化 reporters 增 `'json'`（testsCompleted 探针依赖，review R1 m2）+ `disableBail: true` + runner `related:false`（10.x 键名落地时按 changelog 校正）+ sandbox/temp 解析（如需）
- [ ] R1 绿证：canary 重新注入 → `pnpm audit:mutants` → canary **Killed** + dry-run 精确 4 文件 + json 无 testsCompleted=0 假 Survived → 复员
- [ ] R2 确定性：装置绿后同口径连跑 3 次，分数极差 < 0.5pp（MA4.5 实测漂移机制复查）

Exit Criteria:

- [ ] R1 红转绿 + R2 三连稳定留痕入 plan；devDep 升级无传递影响以 flux-runtime 包内 vitest 复验（全量四门归 Closure Gates，review R1 m4）

### Phase 2 - canary 棘轮脚本

Status: planned
Targets: scripts/mutation/canary-selfcheck.mjs、package.json

- Item Types: `Fix`

- [ ] `canary-selfcheck.mjs`（json 探针口径：断言读 stryker json 报告 per-mutant testsCompleted）：程序化注入 canary（精确行替换）→ 跑 scoped stryker（mutate 收缩至 validators 单文件以控时长）→ 断言 canary killed **且** 全体 mutant 无 testsCompleted=0 假 Survived → 复员注入；任一不满足 exit 1 并打印诊断
- [ ] `package.json` script `audit:mutants:canary`；脚本头注记用途（MV 门禁前置自检 + 防回退棘轮）

Exit Criteria:

- [ ] 脚本在修复后装置上 exit 0；人为破坏验证一次（如临时改回 disableBail 缺省或 canary 换成不可杀变异）→ exit 1 → 复员（棘轮自身有判别力）

### Phase 3 - 重测登记与收口

Status: planned
Targets: stryker.formula conf、known-good-baselines、arm2-index、roadmap、daily log

- Item Types: `Fix`

- [ ] formula-engine 口径落地（`stryker.formula.conf.mjs` + `packages/flux-formula/vitest.stryker.config.ts`，mutate=src 核心、testFiles 同域；超时按 Failure Path 缩界）
- [ ] 双口径正式测量各 1 轮 → 分数 + mutant 三元组 + canary 状态入册
- [ ] `known-good-baselines.md` 新增 `## Mutation Baselines` 专节（表格：Date/Scope/Mutants/Killed/Score/Canary/Command/Commit/Boundary），节首注明边界句：mutation 基线为**时点测量记录**（装置/口径变更时刷新），豁免本文件全绿 Baselines 表的 Rules（:30-34）——防文档内规则冲突（review R1 m6）
- [ ] arm2-index：工具基线区 `audit:mutants` 行勘正（1.63% 无效 → 新分数 + canary 自检在位）+ :166（4.5-001）/ :140（4.1-009）→ `closed` + 注记；Last Updated 滚动
- [ ] roadmap R2.3 `planned`→`done`（IN closure commit；激活提交先行 `todo`→`planned`）；daily log 条目

Exit Criteria:

- [ ] 双基线入册（分数非 0 且非 1.63% 遗留、canary PASS、命令可复跑）；arm2-index 双 finding `closed`；roadmap R2.15 不受影响仍 `todo`

## Closure Gates

- [ ] 全量门禁：typecheck / build / lint（44/44）+ test 82/82（升级 devDep 后复验，防 instrumenter 传递影响）
- [ ] `pnpm check` 零新增红（并发线 console-baseline 归因口径沿 722/723/724 先例）
- [ ] canary 棘轮两态验证留痕（正常 exit 0 + 人为破坏 exit 1）
- [ ] 独立 closure audit（fresh sub-agent，输入=plan+diff summary+验证输出）：装置有效性复核（auditor 独立跑 canary）、基线可复跑性（命令+数字一致）、双 finding 闭环判定
- [ ] 收口提交（flip `done` IN commit；记录复核结论）

## Deferred But Adjudicated

- **重测范围裁决**：审计 Fix direction ④ 点名「validation + formula-engine」——validation 为既有基线口径必须重测；formula-engine 为审计点名口径，落地受 40min timebox 约束（Failure Path formula-scope 缩界规则），缩界时 boundary 显式入册，不静默缩。
- **升级 vs 配置修复优先序**：MA4.5 残余根因判定「非配置可修复」（worker 快照时序疑似），故升级为第一动作、配置修正并行固化；若升级后 canary 即绿，配置修正仍保留（防御 9.x 已知内联缺陷面回退）。

## Draft Review Record

- R1（fresh sub-agent agent_c66f0a3d，2026-10-24）：**FAIL** 0B/2M/7m——M1 计划内 spread-include 表达式自身复现并集缺陷（修正：覆盖式替换措辞+表达式删除）；M2 升级失败梯缺审计在册救济 vitest 降版钉扎（修正：梯③补入）；m1 arm2-index 行号互换（:166=4.5-001/:140=4.1-009）；m2 json 探针依赖未列项（--reporters json + conf reporters+'json'）；m3 Phase Status 词表 planned；m4 Phase 1 exit 收窄包内复验（全量归 Closure Gates）；m5 Failure Paths 补第 5 列；m6 baselines 专节边界句；m7 canary 必杀证引 in-scope validators-edge-cases.test.ts:234-254。锚点核验：conf/conf-config/版本/registry/行号全实match。
- R2（同一评审 agent 复审，2026-10-24）：**PASS 共识**（pass-with-minors，0B/0M/2m）——M1/M2/m1-m7 全数确认已解；m-a 残留 spread 措辞三处（已随本激活提交统一为「覆盖式替换」）；m-b 复审轮次标注 R1→R2（本条即修正）。canary 判别力（必挂于旧装置、通过于新装置）与升级优先序裁定认可。准予 `active`。

## Non-Blocking Follow-ups

- 无（其余 P1-MA4.5-\* 归 R2.12/R2.13 独立行，非本 plan 剩余工作）。

## Closure

- [x] R2 复审共识（PASS pass-with-minors）后激活提交（Status→`active` + roadmap R2.3 `todo`→`planned` IN commit）
- [ ] 执行 Phase 0-3 → Closure Gates 全过 → closure audit PASS → 收口提交（Status→`completed`、flip `done` IN commit、记录复核结论于本节）
