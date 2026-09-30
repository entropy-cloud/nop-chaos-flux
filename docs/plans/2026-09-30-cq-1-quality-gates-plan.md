# CQ-1 质量门禁与测试基建收口（代码质量轴第一轮）

> Plan Status: completed
> Last Reviewed: 2026-09-30
> Source: `docs/analysis/2026-09-30-code-quality-round1-deep-analysis.md`（CQ-T1 ~ T8）
> Related: `docs/analysis/2026-09-30-code-quality-round1-deep-analysis.md` 第五节（裁决记录）、`scripts/audit/shared.mjs`（runScanner advisory 机制）、`docs/audits/arm-index.md:182`（knip 旧登记）

## Purpose

把"工具就绪但无机制强制"的质量轴（死代码、重复代码、文档乱码、console 残留、advisory 扫描器基线、RTL cleanup、jsdom 残留登记）落成 committed 基线 + 门禁，使本报告之后的所有质量批（cq-2 ~ cq-6）的收益不再静默回退。本 plan 只建门禁与测试基建，不做死代码清理（清理在 cq-6）。

## Current Baseline

- `pnpm check` 链 17 项；`package.json` 共 34 个 `check:*`；`scripts/audit/` 16 个扫描器中 12 个经 `runScanner`（`shared.mjs:664`）只打印不失败。17 项链中只有 `check:audit-suspects` 来自扫描器族；`find-styling-suspects`、`find-test-global-leaks` 是未接链的独立脚本。
- `audit:knip`（knip 6.9.0）实测 exit 1：79 unused files / 402 unused exports / 581 unused exported types / 3 unused deps / 16 unused devDeps / 30 unlisted deps / 1 unlisted binary（基线落地时实测 exports 401 / devDeps 17——后者含 word-editor-renderers jest-dom 已知误报，见上）（起草时实测值；**最终以 Phase 1 基线快照输出为准**）。unlisted 分布：playground 约 11、`scripts/visual-quality/generate-visual-inventory.test.ts` 约 18、flux-renderers-data 1。不在任何门禁链；唯一登记（arm-index.md:182）只记 exit code 无数值，自 2026-07-27 起不可对账。knip 对 `scripts/__tests__/fixtures/**` 有误报（约 60 命中）需 ignore。
- `check:duplicates`（jscpd 包装，阈值 8%）实测 exit 0（597 clones / 2.99%），不在 check 链；脚本已输出 clones 总数（`scripts/check-duplicates.mjs:56`）但无基线比较。2026-08-08 登记 454 clones / 3.04%——当时无 clones 数门禁（脚本只比对 ratio），数量 +31% 未被捕捉。
- `check:docs-garbled` 脚本存在，check 链与 lint 链均未包含（全仓唯一双重遗漏的现成脚本）。
- console：eslint 无 `no-console` 规则。非测试 `console.log/debug` 可检测调用点 28 处（committed 基线口径）：apps 25（playground demo 页输出）+ packages 3（gantt undo-stack:185 log，cq-6 删除；word-editor-renderers 2 处 debug）；另有 2 处 eslint 不可见的字符串字面量（code-editor-page.tsx:19/:276）不计入。
- `vitest.shared.ts` 的 `createSharedVitestConfig` 未注入 RTL cleanup/jest-dom（根 devDeps 现无 `@testing-library/jest-dom`，需补）；现有 `setupFiles: [test-setup/strict-validation.ts]` 注入须 append 不得替换；手动 cleanup 口径：`^\s*cleanup();` 语句 625 处（packages+apps）。`word-editor-renderers/src/__tests__/setup.ts` 有 setup 先例。
- jsdom pragma 实为 **6** 处：`flux-renderers-content` 5 个测试文件（DOMPurify 需要，刻意决策）+ `flux-renderers-data/src/__tests__/table-quick-edit-savebar-order.test.tsx:1`；content 与 data 两包 devDeps 各含 jsdom。data 包的 jsdom pragma/依赖属刻意决策或待迁移，Phase 4 内裁定登记。`docs/logs/2026/05-14.md:131` 的"零残留"登记已过时；`scan-jsdom-usage.mjs` 未接任何 script。
- CQ-T12（origin=gitee，ci.yml 不触发）属基础设施观察，需人类确认托管策略；本 plan 不改 CI 配置。

## Goals

- 七个轴全部获得 committed 数值基线或规则门禁，新红（新增命中）即 `pnpm check` fail：knip、jscpd clones 数、docs-garbled、console.log/debug、styling-suspects、audit-suspects、test-global-leaks。
- RTL cleanup 上提共享 vitest setup；jsdom pragma 白名单门禁落地。
- 门禁行为均有先红后绿的脚本单测（仿 `scripts/__tests__/` 既有模式）。

## Non-Goals

- 不清理死文件/死导出（cq-6 承接）；不治理既有 console.log（本 plan 只建门禁 + 基线含既有命中，删除在 cq-6 后收缩基线）。
- 不给其余 9 个 advisory 扫描器建数值基线（裁定：只为上述 3 个高危轴建，其余保持趋势可见定位，见报告第五节）。
- 不改 CI 托管配置（CQ-T12 需人类决策）。
- 不删除存量手动 cleanup 调用（无害冗余，迁移 churn 无收益）。

## Scope

### In Scope

- `scripts/audit/`、`scripts/check-*.mjs`、`scripts/baselines/`（新增）、`vitest.shared.ts`、根 `package.json`（check 链追加 + jest-dom devDep）、`eslint.config.js`、`knip.json`、`scripts/__tests__/`、`docs/logs/2026/09-30.md`。

### Out Of Scope

- `packages/`、`apps/` 生产源码行为变更（cq-6 才动；console 基线以配置级 overrides 表达，不改源文件）；CI 托管；coverage 阈值补齐（CQ-T13 备忘）。

## Failure Paths

| 可测场景编号     | 触发                                                        | 行为                                                                                         | 可重试               | 用户可见表现                 |
| ---------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------- | ---------------------------- |
| baseline-new-red | 新增 1 个未登记命中（knip/console/jsdom pragma/扫描器计数） | `pnpm check` 对应步骤 exit 1，输出新增条目                                                   | 是（修复或登记基线） | check 红，错误信息含文件路径 |
| baseline-shrink  | 删除已登记命中                                              | 门禁提示基线可收缩，exit 0，`--update-baselines` 后快照收敛                                  | 是                   | 提示信息                     |
| jscpd-breach     | 重复率 > 8% 或 clones 数 > 基线                             | `check:duplicates` exit 1（counts+ratio 比较，不做单克隆身份对比——克隆清单顺序无稳定性保证） | 是                   | check 红                     |

## Test Strategy

档位：**必须自动化**。每个新门禁脚本在 `scripts/__tests__/` 配先红后绿单测（fixture 触发新增命中 → fail；基线内 → pass），与 `find-tool-governance-gates.test.ts` 同模式。**各 Phase 的 Proof（先红）排在 Fix 之前。**

## Execution Plan

### Phase 1 - knip 基线门禁

Status: completed
Targets: `knip.json`、`scripts/check-knip-baseline.mjs`（新增）、`scripts/baselines/knip-baseline.json`（新增）、根 `package.json`

- Item Types: `Proof | Fix`

- [x] Proof：先写基线 diff 脚本单测（临时 fixture 制造新增 unused file → 红；无新增 → 绿），先红（首跑因脚本缺失与断言修正两轮红，终 4/4 绿）
- [x] Fix：`knip.json` 增加 `scripts/__tests__/fixtures/**` ignore，消除 fixture 误报；锁定 knip 精确版本 6.9.0（package.json + lockfile）
- [x] Fix：生成 committed 基线快照（分类：unused files/exports/exported types/deps/devDeps/unlisted——unlisted 仅登记数量与分布供 CQ-S17 对账，不进 diff 判据，理由：与在链 manifest 门禁口径未对齐），文件头记录生成时 knip 6.9.0（committed 基线实测 28 files/401 exports/581 types/3 deps/17 devDeps/30 unlisted——devDeps 17 含 word-editor-renderers jest-dom types-only 已知误报；files 口径为 issues[].files 去重身份，与 text reporter 的 79 全仓口径不同已注明）
- [x] Fix：新增 `check:knip-baseline`：当前输出与基线按分类 diff，**新增**命中 exit 1（含路径），只减不增 exit 0 并提示可收缩（支持 --input/--baseline 隔离测试；knip issue 退出码非零时从 error.stdout 取 JSON）
- [x] Fix：接入 `pnpm check` 链（check:knip-baseline 追加至链尾）
- [x] Proof：CQ-S17 对账——knip unlisted 逐条与 `check-workspace-manifest-deps`（exit 0 权威）比对，结论写入基线文件头注记（manifest 门禁前向检查仅扫 packages/\*/src，apps/scripts 为盲区；30 项 = playground 11 + visual-quality 18 + data test jsdom 1，均经 hoisting 解析；playground 三包声明缺失转 cq-6 Phase 5）

Exit Criteria:

- [x] `check:knip-baseline` 在当前树 exit 0，且人为新增死文件时 exit 1（单测钉住：4/4 用例含真树复跑 exit 0）
- [x] CQ-S17 对账结论已记录（两工具口径互补非矛盾；playground 三包缺失依赖转 cq-6 清理清单）

### Phase 2 - 重复代码门禁 + clones 数基线

Status: completed
Targets: `scripts/check-duplicates.mjs`、`scripts/baselines/duplicates-baseline.json`（新增）、根 `package.json`

- Item Types: `Proof | Fix`

- [x] Proof：阈值/基线比较逻辑单测先红（3 用例首轮全红——脚本不识别 flag 跑了真扫描；实现后 3/3 绿，含大小写断言修正）
- [x] Fix：`check:duplicates` 增加 clones 数与 `scripts/baselines/duplicates-baseline.json`（597 / 2.99%，附 CQ-T2 454→597 注记）比较：ratio > 8% 或 clones 数 > 基线即 exit 1（evaluateDuplicates 纯函数可测；--input/--baseline/--update-baseline 隔离）
- [x] Fix：接入 `pnpm check` 链（check:duplicates-baseline）

Exit Criteria:

- [x] `check:duplicates` 在当前树 exit 0 且输出包含 clones 数与基线对比（597=597 OK）；超基线场景单测变红

### Phase 3 - docs-garbled 接链 + console 门禁

Status: completed
Targets: 根 `package.json`、`eslint.config.js`、`scripts/check-console-baseline.mjs`（新增）、`scripts/baselines/console-log-baseline.json`（新增）

- Item Types: `Proof | Fix`

- [x] Proof：console-baseline 脚本单测（3 用例：committed 基线对真树绿 / 空基线对真树红且报 undo-stack.ts / file+text 模糊匹配防行号漂移假红；eslint no-console 真探针文件验证规则生效）
- [x] Fix：`check:docs-garbled` 加入 `pnpm check` 链（exit 0，18 处 informational）
- [x] Fix：eslint 增 `no-console: ['error', { allow: ['warn', 'error'] }]`，经 config overrides 仅对 `packages/*/src` 生效（存量命中 3 处以 overrides ignores 文件清单豁免至 cq-6 清理，不改源码；真探针文件验证 error 级生效）；apps 侧不启用 eslint 规则，由 baseline 脚本覆盖
- [x] Fix：`check:console-baseline`：非测试 src 的 `console.log/debug` 与 committed 基线（实测 28 处可检测调用点 = packages 3 + apps 25，条目格式：文件+行号+行文本，file+text 匹配容忍行漂移）diff，新增命中 exit 1；接入 check 链
- [x] Proof：lint 对 packages 新增 console.log 报错（真探针文件验证）；两门禁单测绿（console-baseline 3/3）

Exit Criteria:

- [x] `pnpm lint` 在当前树绿（packages 存量命中全部在 overrides ignores 内）
- [x] `check:console-baseline` 当前树 exit 0 且新增命中可红（单测钉住 + 空基线探针红）；`check:docs-garbled` 在链上且 exit 0

### Phase 4 - 测试基建：RTL cleanup 上提 + jsdom 白名单门禁

Status: completed
Targets: `vitest.shared.ts`、`test-setup/`（新增共享 dom setup）、`packages/word-editor-renderers/src/__tests__/setup.ts`、`scripts/check-jsdom-pragma-whitelist.mjs`（新增）、`scripts/baselines/jsdom-pragma-whitelist.json`（新增）、根 `package.json`

- Item Types: `Proof | Fix`

- [x] Proof：jsdom 白名单脚本单测（3 用例：committed 白名单对真树绿 / 部分白名单红且列缺失项 / 全量+已消失项绿且列收缩提示）
- [x] Fix：`createSharedVitestConfig` 对 happy-dom 档 append `test-setup/dom.ts`（RTL cleanup + jest-dom，根 devDep 补装 ^6.9.1）；word-editor-renderers 本地 setup 删除、setupFiles override 移除，运行时由根共享 setup 供给；**包内 jest-dom devDep 以 types-only 形态保留**（closure audit M1 as-built 修正：先移除后回补——`src/__tests__/jest-dom.d.ts` 的类型增强 import 需要包内可解析，运行时 setup 不再使用它；knip 将其计为 unused devDep 属已知误报，已在基线文件头注记）；strict-validation 保留
- [x] Fix：`check:jsdom-pragma-whitelist` 脚本 + 基线（6 条：content 5 + data 1，文件:行号身份）；data 包裁定为刻意保留并记入基线文件头；接入 check 链
- [x] Proof：受影响包 focused 全绿（basic 627、data 1200、form 943、scheduling 1070、layout 140、word-editor-renderers 164、content 341 含 jsdom pragma 组、nop-debugger 130、word-editor-core 274、playground 406）。**修复一处被共享 cleanup 暴露的泄漏依赖测试**：`form-package-exports.test.tsx` FieldsetRenderer 用例此前靠上一条测试的 DOM 泄漏碰巧通过（querySelector 拿到旧 fieldset），断言 `data-collapsible === 'true'` 本身违背非 collapsible 契约——修正为 `toBeUndefined()`（clean-HEAD worktree 对照确认该失败由本 Phase 引入的隔离修复所暴露）
- [x] Proof：`docs/logs/2026/09-30.md` 记录 05-14 "零残留"登记的修正口径（本 plan 收口时写入）

Exit Criteria:

- [x] 新建测试文件无需手动 cleanup（共享 setup 对全部 happy-dom 包生效，上列 10 包 focused 全绿；无手动 cleanup 的文件在同套件内互不泄漏）
- [x] jsdom pragma 新增未登记时 check 红（单测钉住）

### Phase 5 - 三个高危 advisory 扫描器数值基线门禁

Status: completed
Targets: `scripts/check-scanner-baselines.mjs`（新增共享机制）、`scripts/baselines/scanner-baselines.json`（新增：styling-suspects=221 / audit-suspects=716 / test-global-leaks=108，执行时以实测刷新）、根 `package.json`

- Item Types: `Proof | Fix`

- [x] Proof：基线比较机制单测（3 用例：等于绿 / 超 1 红 / 低于绿+收缩提示；evaluateScannerCounts 纯函数 + 真扫描集成）
- [x] Fix：`check:scanner-baselines` 通用数值基线包装（`Found N ... matches` 解析，只比总数不比条目身份）；**check 链中 `check:audit-suspects` 原位替换为 `check:scanner-baselines`**（一个包装覆盖三轴，styling/test-global-leaks 随之入链）
- [x] Proof：三扫描器实测 221/716/108 与基线相等，真树绿；人为制造红路径由单测钉住（基线 220 → exit 1）

Exit Criteria:

- [x] 三个扫描器轴在 `pnpm check` 上具备"新红即 fail"能力且当前树绿
- [x] 单测钉住超基线变红路径

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_8e2a25ed，两轮）
- Verdict: 首轮 `revised`（1 Blocker + 4 Major）→ 修订 → 第二轮 `pass`（零 Blocker/Major；备注：Phase 5 只比总数不比条目身份属已声明取舍）
- Rounds: 2
- Findings addressed: B1（三扫描器基线落地为 Phase 5，修正"在链"表述与 Closure Gates 句）、M1（jsdom pragma 5→6 + data 包裁定项）、M2（console 双机制职责明确 + 条目格式行文本 + overrides 不改源码）、M3（各 Phase Proof 前置）、M4（knip 数值改 live 实测 402/581/16 + 版本锁定 + unlisted 分布）；Minor 6 条全吸收

## Closure Gates

- [ ] 七个轴（knip/duplicates/docs-garbled/console/styling/audit-suspects/test-global-leaks）门禁全部在 `pnpm check` 链上且当前树全绿
- [x] 每个门禁脚本有先红后绿单测（check-knip-baseline 4 + check-duplicates 3 + check-console-baseline 3 + check-jsdom-pragma-whitelist 3 + check-scanner-baselines 3 = 16 用例全绿）
- [x] RTL cleanup 共享 setup 生效且有 focused 证明（10 包 focused 全绿；共享 cleanup 暴露并修复 form-package-exports 泄漏依赖断言）
- [x] 不存在被静默降级的 in-scope live defect（其余 9 个 advisory 扫描器不建基线的裁定已记录于分析报告第五节与本 plan Non-Goals）
- [x] owner docs 已同步（daily log 2026-09-30 记录门禁清单与 05-14 jsdom 登记修正口径）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure；首轮 issues → remediation → 聚焦复审）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### 其余 9 个 advisory 扫描器的数值基线

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 全量基线的维护成本高于趋势可见价值；三个高危轴已硬化，其余保持 advisory 定位（裁定记录于分析报告第五节）
- Successor Required: `no`
- Successor Path: —

### CI 托管镜像（Gitee Go / 迁移）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 涉及托管基础设施决策（origin=gitee vs ci.yml=GitHub Actions），需人类确认方向；本地 `pnpm check` 链硬化后门禁本身已可执行
- Successor Required: `yes`
- Successor Path: 待人类裁决后另立 plan

## Non-Blocking Follow-ups

- CQ-T13：5 包 coverage 阈值补齐
- CQ-T14：playground 并发偶发失败 watch-only（如复现转立案）

## Closure

Status Note: 五个 Phase 全部落地并经独立 fresh-session closure audit。首轮 verdict `issues`（1 Blocker：Phase 3 条目未回填勾选——行为已实证但文本不一致；1 Major：word-editor-renderers jest-dom devDep 勾选表述与 as-built 不符；3 Minor：401/17 数值勘误、28 口径、log 13/16 措辞）。全部 remediation 后（as-built 如实改写 + 数值勘误 + 基线已知误报注记），聚焦复审通过。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_8837226d，首轮 → 聚焦复审两轮）
- Verdict: 首轮 `issues`（B1 + M1 + 3 Minor）→ remediation → 第二轮确认
- Evidence: 审计独立复跑全部红绿路径探针（knip 造死文件 exit 1、空 console 基线 exit 1、scanner 基线 -1 exit 1、jsdom 白名单缺项 exit 1、eslint no-console 三方探针、16 门禁单测复跑绿、word-editor-renderers 164/164 复跑绿）；确认行为层五 Phase exit criteria 全部 repo-observable 成立、deferred 分类诚实、无 in-scope 静默丢弃。remediation diff：plan 文本回填（Phase 3 六项勾选 + M1 as-built 改写 + 401/17 与 28 口径勘误）+ knip 基线文件头 knownFalsePositives 注记 + daily log 措辞修正。
- 第二轮聚焦复审（同 agent）：发现 M1 处置依据虚假——`src/__tests__/jest-dom.d.ts` 被 lint 链 `clean-src-artifacts`（禁止 packages/\*/src 下 .d.ts）在验证期删除，提交树缺类型增强致包级 typecheck 82 错（turbo 缓存键未捕获删除造成假绿，M3）。终 remediation：类型增强迁至根 `types/testing-library-jest-dom.d.ts`（tsconfig 既有 include 挂载点，不受 clean-src-artifacts 影响），`turbo run typecheck --force` 42/42 真绿复验；plan 残留 402/16 勘误同步。

Follow-up:

- CQ-T13 coverage 阈值补齐（Non-Blocking Follow-ups 既有）
- CQ-T14 playground 并发偶发 watch-only（既有）
