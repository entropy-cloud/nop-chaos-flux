# 11 lesson-11 扫描器盲区类沉淀（注释/字符串剥离 + 命中面校准）

> Plan Status: completed
> Last Reviewed: 2026-08-09
> Source: `docs/plans/2026-08-09-0444-1-round2-tool-governance-scanner-and-test-infra.md` Non-Blocking Follow-ups（「lessons 续写（如本轮沉淀新的扫描器盲区模式）：归后续 DG 类轮次，不阻塞本 plan」）+ `docs/logs/2026/08-09.md` 工具治理轮次节
> Related: `docs/lessons/07-tool-gate-sedimentation-with-committed-regression-tests.md`、`docs/lessons/10-pattern-family-rescan-scan-scope-must-cover-host-packages.md`
> Mission: component-audit-round2
> Work Item: lesson-11 扫描器盲区类（deferred：0444-1 Non-Blocking Follow-ups 工具治理轮次 lessons 续写）

## Purpose

把 2026-08-09 工具治理轮次（plan `2026-08-09-0444-1`，completed + closure-audit pass）沉淀的「审计扫描器注释/字符串剥离盲区 + 命中面校准」方法论写成 `docs/lessons/11-*.md`（编号接 10），同步 `docs/lessons/README.md` 索引与 daily log，收口 0444-1 Non-Blocking Follow-ups 中「lessons 续写（如本轮沉淀新的扫描器盲区模式）」的 deferred 条目——**触发条件已满足**（0444-1 确实沉淀了新的扫描器盲区模式：styling/performance/broad-scope/react19/async 五规则注释/字符串假阳性 + test-global-leaks 字符串假阳性），且该条目登记「归后续 DG 类轮次」后无任何轮次承接，仍悬挂。

## Current Baseline

- lessons 01–10 在案（`docs/lessons/README.md` 索引完整）；07 = 工具门禁沉淀法（每类模式落 check + committed 回归测试 + 基线零命中）；10 = 模式族回扫扫描范围必须覆盖 host 包。**缺口：扫描器自身的假阳性盲区类（注释/字符串剥离）无 lesson 覆盖。**
- 0444-1（2026-08-09 completed，closure 证据见 plan Closure 节）沉淀的扫描器盲区模式（live 证据已核对在案）：
  - **注释/字符串剥离盲区**：styling `scanBareDataSlotSelectors`（`rules.mjs:325` 起，逐行 `includes('[data-slot')` 无剥离，`flux-renderers-ai/src/styles.css:110` 块注释行假阳性实锤）；performance `scanJsonStringifyChangeDetection`（6 行窗口无剥离，icon.tsx:23 模板字符串假阳性）；broad-scope `scanBroadScopeSelectors`（正则无注释处理结构盲区）；react19 窗口规则（`graph-renderer.tsx:285` / `steps-renderer.tsx:142` / `timeline-renderer.tsx:161` 注释内触发窗口假阳性）；async 227→226 注释假阳性；test-global-leaks `c2-5-host-surfaces.spec.ts:67` 字符串假阳性（isCodePosition 修复）。
  - **修复模式**：行级规则复用 `getCodeTextForLine`/`isCodePosition`（`shared.mjs:45/:114`），react19 新增 `getCodeWindow`（`react19-rules.mjs:11` 起，注释剥离窗口、eslint-disable 仍读 raw 窗口）；committed 回归测试 `scripts/__tests__/find-tool-governance-gates.test.ts` **12 条先红后绿**（git stash 对照修复前基线 7/12 先红）；全量复扫对比零新增命中（styling 142→141、performance 22→21、react19 517/5→514/4、async 227→226、reactive 19→19，全部为注释/字符串假阳性移除）。
  - **命中面校准法**：test-global-leaks const 容器识别以 live 命中面校准——粗匹配 `^const X = [|{` 166 条未裁决命中，收敛为仅变异容器（`isMutatedConstContainer`，`shared.mjs:451`）+ 泛型构造器（`<() => void>` 箭头形态），终态 **57/2 = 47 基线 − 1 字符串假阳性 + 11 条 landed**（裁决表零悬挂）。
- 0444-1 Non-Blocking Follow-ups 原文：「lessons 续写（如本轮沉淀新的扫描器盲区模式）：归后续 DG 类轮次，不阻塞本 plan。」——触发条件满足后无后续轮次，条目未收口。

## Goals

- 新建 `docs/lessons/11-scanner-false-positive-comment-string-stripping.md`：扫描器假阳性盲区类（注释/字符串剥离缺失 → 假阳性与误判）+ 修复模式（共享 code-text helper + committed 回归测试 RED→GREEN + 全量复扫零新增对比）+ 命中面校准原则（以 live 命中面校准判定规则，166→57/2 证据链）。
- `docs/lessons/README.md` 索引登记 lesson 11（对齐 09/10 先例的编号行）。
- `docs/logs/2026/08-09.md` 追加收口条目；0444-1 Non-Blocking Follow-ups 条目终态注记。

## Non-Goals

- 不修改任何 audit 扫描器代码/测试（0444-1 已落地并 closure；本 plan 纯文档）。
- 不重跑全量复扫（证据已在 0444-1 Closure 记录，本 plan 只引用）。
- 不承接其他 deferred 条目：CX-13+ 插入（ss-3 P3-2/ss-6 P3-2/ss-10 P3-4/ss-3 P3-4，roadmap Rule 人工确认门）、DR-15/DR-16 公共 API 变更（人工确认门）、60Hz e2e 复测（环境条件，本机 50Hz）、`check:duplicates:detail` exit 1（非门禁 jscpd 固有）、comment 功能 UI 恢复（out-of-scope 无 successor）、industrial-hmi（mission 外）。
- 不写 test-support 隐式 hook 主题的独立 lesson（0150-3 已显式化 + 0444-1 Phase 4 裁决表在案；本 plan 只把「同型新发现按裁决表方法处理」记入 follow-up）。

## Scope

### In Scope

- `docs/lessons/11-*.md` 新建（内容按 `docs/lessons/README.md` Recommended Sections）
- `docs/lessons/README.md` 索引登记
- `docs/logs/2026/08-09.md` 收口条目
- `docs/plans/2026-08-09-0444-1-round2-tool-governance-scanner-and-test-infra.md` Non-Blocking Follow-ups 条目终态注记（历史 plan 注记先例：`2026-06-21-0527-e2a-bis-password-reveal-plan.md` 对 E2a follow-up 注记「已由 E2a-bis plan 收口」）

### Out Of Scope

- 扫描器代码/测试变更；其他 deferred 条目（见 Non-Goals）

## Failure Paths

不适用——纯文档计划，无错误处理/API 契约/鉴权/外部集成面。

## Test Strategy

本档选择：`不适用：纯文档计划`（仅修改 `docs/` 下文件，零代码与零行为变更——guide 纯文档计划条款：`pnpm test`/`lint`/`typecheck`/`build` 从 Closure Gates 移除；验证以 `pnpm check`（含 `check:active-doc-code-anchors`、`check:docs-garbled`）+ live 证据核对为准）。

## Execution Plan

### Phase 1 - lesson 11 撰写

Status: completed
Targets: `docs/lessons/11-scanner-false-positive-comment-string-stripping.md`

- Item Types: `Proof | Follow-up`

- [x] live 核对 0444-1 沉淀证据：`getCodeTextForLine`（`shared.mjs:45`）、`isCodePosition`（`shared.mjs:114`）、`getCodeWindow`（`react19-rules.mjs:11-19`）、`isMutatedConstContainer`（`shared.mjs:451`）、`scanBareDataSlotSelectors`（`rules.mjs:325-349`）在案；`find-tool-governance-gates.test.ts` 12 条用例在案；复扫计数（styling 142→141 等）与 plan Closure 节一致
- [x] 按 07/10 先例写 lesson 11（Recommended Sections 8 节：Problem Context / Initial Judgment / Why It Looked Plausible / Why It Was Wrong / Decisive Evidence / Correct Decision Rule / Preventive Checklist / Related Files / Docs）：核心 = ① 扫描器假阳性盲区类——行级/窗口级规则必须跑在注释/字符串剥离文本上，否则「全绿输出仍可能命中非代码文本」且假阳性是静默守卫噪音（styles.css:110 实锤）；② 修复模式——复用 `getCodeTextForLine`/`isCodePosition` + `getCodeWindow` 共享 helper + committed 回归测试先红后绿 + 全量复扫零新增对比；③ 命中面校准原则——判定规则以 live 命中面校准（166 粗命中 → 仅变异容器 + 泛型构造器 → 57/2 零悬挂）

Exit Criteria:

> 本 Phase 交付 repo-observable 结果：lesson 文件在案且内容与 live 证据一致。

- [x] `docs/lessons/11-*.md` 在案，Recommended Sections 全（对照 07/10 格式），每条证据可在 repo 中定位（`scripts/audit/rules.mjs`/`shared.mjs`/`react19-rules.mjs`、`scripts/__tests__/find-tool-governance-gates.test.ts`、0444-1 plan Closure 节）
- [x] lesson 内引用的路径/函数名/行号 live 核对通过（helper 位置、测试文件 12 条、复扫计数与 0444-1 Closure 记录一致；无引用漂移）

### Phase 2 - 索引与收口登记

Status: completed
Targets: `docs/lessons/README.md`、`docs/logs/2026/08-09.md`、`docs/plans/2026-08-09-0444-1-round2-tool-governance-scanner-and-test-infra.md`

- Item Types: `Fix | Follow-up`

- [x] `docs/lessons/README.md` 索引登记 lesson 11（编号行，对齐 09/10 先例格式）
- [x] `docs/logs/2026/08-09.md` 追加收口条目（lesson 11 落地 + 0444-1 follow-up 条目终态，含 Plan 状态翻转记录）
- [x] 0444-1 Non-Blocking Follow-ups「lessons 续写」条目注记收口（「已由 lesson-11 plan 收口（2026-08-09）」，先例：E2a-bis 对 E2a follow-up 注记）

Exit Criteria:

- [x] README 索引 11 登记在案且与 live 文件一致（编号/链接/标题）
- [x] daily log 08-09 含 lesson-11 收口条目；0444-1 follow-up 条目终态注记在案（rg 可查）

## Draft Review Record

> 起草后、执行前的独立审查证据（guide `Plan Review Rule`）。由独立子 agent（fresh session）填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_01be5d46affey0NS3hpXmH84Yz`，2026-08-09）
- Verdict: `pass`（零 Blocker/Major，共识达成 → 升 active）
- Rounds: 1
- Findings addressed: Blocker/Major 零；Minor×2 已当场修正——① `getCodeWindow` 实际行域 `react19-rules.mjs:11-19`（起草文本 `:11-17` 闭合括号在 19）；② `scanBareDataSlotSelectors` 实际行域 `rules.mjs:325-349`（起草文本 `:325-340`）。两处仅结束行号漂移，起始锚点（:11 / :325）均精确，已改为精确行域。其余核对全 PASS：四维度检查（可想象性 / 格式完整性 / 内容稳健性 / 引用准确性）通过；纯文档计划正确移除 test/lint/typecheck/build 门禁（guide 纯文档条款）；CX-13+ / 60Hz / DR-15/16 等 deferred 条目正确列为 Non-Goals（roadmap Rule 人工确认门，不重触发）；Mission/Work Item 头格式合规；文件名无碰撞。

## Closure Gates

> 纯文档计划（guide：仅修改 `docs/` 下文件，`pnpm test`/`lint`/`typecheck`/`build` 从门禁移除，不执行）。

- [x] lesson 11 文件在案且证据 live 核对一致（Phase 1 Exit Criteria 全勾）
- [x] README 索引 + daily log 登记在案；0444-1 follow-up 条目收口（Phase 2 Exit Criteria 全勾）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项
- [x] `pnpm check` exit 0（docs 相关链 `check:active-doc-code-anchors` / `check:docs-garbled` 零新增命中；本 plan 零代码变更）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（无——本 plan 纯文档、范围最小，无 deferred 项）

## Non-Blocking Follow-ups

- test-support 同型隐式 hook 若未来有新发现：按 0444-1 Phase 4 裁决表方法处理并登记 daily log（维持既有纪律，非本 plan 承接）。
- 其余工具治理 deferred 条目（60Hz / CX-13+ / duplicates:detail）维持既有归因记录，本 plan 不触碰。

## Closure

Status Note: 2026-08-09 执行完毕（mission-driver 完整执行）——Phase 1 lesson 11 撰写（live 核对 0444-1 沉淀证据：`getCodeTextForLine` shared.mjs:45 / `isCodePosition` :114 / `getCodeWindow` react19-rules.mjs:11-19 / `isMutatedConstContainer` shared.mjs:451 / `scanBareDataSlotSelectors` rules.mjs:325-349 全部在案；`find-tool-governance-gates.test.ts` 12 条用例在案；复扫计数 styling 142→141 / performance 22→21 / react19 517/5→514/4 / async 227→226 / reactive 19→19 与 0444-1 Closure 节一致）→ 新建 `docs/lessons/11-scanner-false-positive-comment-string-stripping.md`（07/10 先例格式，Recommended Sections 8 节全：① 假阳性盲区类——行级/窗口级规则必须跑在注释/字符串剥离文本上（styles.css:110 块注释实锤），假阳性是静默守卫噪音；② 修复模式——`getCodeTextForLine`/`isCodePosition`/`getCodeWindow` 共享 helper + committed 回归测试 12 条先红后绿（git stash 对照 7/12 先红）+ 全量复扫零新增对比；③ 命中面校准原则——166 粗命中 → 仅变异容器 + 泛型构造器 → 57/2 零悬挂）。Phase 2 索引与收口登记——`docs/lessons/README.md` 索引行登记（对齐 09/10）；`docs/logs/2026/08-09.md` 顶部追加收口条目；0444-1 Non-Blocking Follow-ups「lessons 续写」条目注记「已由 lesson-11 plan 收口（2026-08-09）」（对齐 E2a-bis 对 E2a 注记先例）。验证（纯文档计划条款）：`pnpm check` exit 0（12 项 check:\* 链，`check:active-doc-code-anchors` 零命中）+ `pnpm check:docs-garbled` exit 0（零新增候选）；无代码变更，test/lint/typecheck/build 按 guide 纯文档条款移除。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）`ses_01be0237affe8pbM8GT3dZAGea`，2026-08-09
- Evidence: verdict `pass`——零 Blocker/Major。逐项核对：A. plan 执行态——Phase 1+2 全部 `[x]` + `Status: completed`（9 项）；B. lesson 11 文件 + live 证据——Recommended Sections 8/8 在案；全部锚点 live 核对（getCodeTextForLine :45 / isCodePosition :114 / isMutatedConstContainer :451 / getCodeWindow :11-19（`}` 在 :19）/ scanBareDataSlotSelectors :325-349（`}` 在 :349））；测试文件 12 条 `it(` 用例；复扫计数与 0444-1 Closure 节 :211 + 审计证据 :244 一致（142→141/22→21/517→514/5→4/227→226/19→19，166→57/2 = 47−1+11）；styles.css:110 块注释行（106 起 110 闭合含 `[data-slot]`）实锤在案；live 门禁 find-test-global-leaks 输出「57 suspect matches across 2 rule buckets」与 lesson 引用一致；README 索引行格式对齐 09/10；C. 登记与收口——daily log 08-09.md:3-10 新条目（reverse-chronological +9 行）+ 0444-1:206 注记样式对齐 E2a 先例（0331:245）；D. 零静默降级——4 项 in-scope 交付物全在案，Deferred 节 = 无；E. docs 完整性——审计方自跑 `pnpm check` exit 0（12 链，oversized 2 errors = 注册豁免）+ `pnpm check:docs-garbled` exit 0（lesson-11 文件零新增候选）。Minor×3 已修正——①daily log 验证行「check:docs-garbled」实为独立脚本，改述「`pnpm check` exit 0 + `pnpm check:docs-garbled` exit 0」；②0444-1 Closure.Follow-up 补「已由 lesson-11 plan 收口（2026-08-09）」一致性注记；③执行记录「15 链」改为 12 链。收口动作由执行 session 依本证据勾选 Closure Gates 审计门禁项（按既有 executor-backfill 机制，DV/DG/D3.2/0444-1/0444-2 同款）。

Follow-up:

- 无剩余 plan-owned 工作（test-support 同型隐式 hook 新发现按 0444-1 Phase 4 裁决表方法处理并登记 daily log，维持既有纪律，非本 plan 承接）
