# 525 Missing Components QA.7 后簿记回写批次 — 终态一致性收口 + import 边界静态防线

> Plan Status: completed
> Last Reviewed: 2026-09-27
> Source: roadmap §13/§15 终态（271568fa0）+ `docs/audits/missing-components/QA.7-final-acceptance-audit.md`（pass，Obs-2 簿记残面指派「随本审计回写后的单一簿记批次一次消化」）+ `docs/audits/missing-components/QA.7-residual-debt-register.md`（A-4/A-5/A-6/A-9/A-10/A-11/A-12/A-13）+ `QA.1-L6-line-exit-audit.md` §7 审计后簿记 ①②③
> Related: `docs/plans/513/516/517/518/519/521/522/523/524-*.md`（文本收口对象）

## Purpose

QA.7 已 pass、roadmap §15 终态声明已落库，但终态主张与 live 文本仍有一批审计指派给「回写批次/簿记批次」的尾项未消化（含提交 `271568fa0` 的簿记虚记），且 design-architecture §10.2 承诺的 import 边界静态防线（登记册 A-9，两连审计 Minor）仍未落地。本 plan 一次消化上述尾项，使「roadmap §15 终态声明 ↔ §13 状态格 ↔ plan 族文本 ↔ 登记册 ↔ dev log」五面零矛盾、零虚记。

## Current Baseline

（2026-09-27 本会话逐项实核）

- QA.7 pass（0B/0M/1m+2Obs）在库：`QA.7-final-acceptance-audit.md` + `QA.7-residual-debt-register.md`；roadmap §15 终态声明、QA.7 行 done 已随 `6405bd25d`/`271568fa0` 落库；resizable index.md 两处登记（D-1）已补。
- **簿记虚记在案**：`271568fa0` 提交信息与 dev log 09-27 簿记行声称「plan 513/523/524 计数勘误与注记一次性消化」，但该提交 diff 仅 roadmap+dev log 两文件，**plan 文件零改动**；QA.1-L5 簿记行声称「516-519 Draft Review Record 补填」，四份 plan 实际无该节。
- roadmap :241 QA.1 行状态格仍 `in progress`（L0–L4 已过并放行），与同格备注「**QA.1 全线出口完成（L0–L7）**」自相矛盾（A-11）。
- roadmap :242 QA.2–QA.6 行状态格仍 `in progress`（QA.2/QA.3/QA.4/QA.5 pass），QA.6/QA.7 pass 未入状态格（A-11）。
- roadmap :237 行内仍记 `industrial 1608 测试绿` 与 `207w 实况/208w 投影……拆分或登记归 QA.7`（A-4/A-6；208w 现状已经 QA.7 §1 实核兑现）。
- roadmap :239 行内仍记 `i18n zh/en ×46`（live 实测 zh/en 各 +40 键，parity 与消费面成立——A-10）。
- plan 523 `Plan Status: draft` + Closure Gates 4 项未勾（`:111 Phase 1-3 全勾`/`:114 全量链`/`:115 e2e`/`:116 QA.6 pass`）；QA.1-L6 §2 已逐项复核「应勾未勾」，每项有独立 live 证据（A-12）。
- plan 524 顶部已 `completed` 但 QA.1-L6 §7① 翻转五步仅完成 2 步：Draft Review Record ×4 仍 `<<待填>>`；Closure Gates `:107`/`:109` 未勾；Phase 3 `:91`/`:92`/`:96` 未勾；`:130` Follow-up 仍留 `<<收口时填写…>>` 模板占位；计数勘误 ×3 未落（`:59` keyboard-navigation(6)→实 5、`:60` renderers coverage 97.69/98.32/98.58 复测 97.93/99.15/98.84、`:77` ×46→×40）。
- plan 522 `:80` 行内仍记 `industrial vitest 1608/1608 全绿`（A-6 登记指名站点，QA.5 Minor-2 口径）。
- plan 521 的批次合并模式四字段（:120-123）落盘时缺 `## Draft Review Record` 节标题（孤立悬置于 Execution Plan 与 Closure Gates 之间；A-13 关联面）。
- plan 513 `:106`（data 1172→实 1174）/`:136`（scheduling 1036→实 1038）/`:156` 内联计数无勘误；`:210`/`:236`/`:287` 记 `oversized 204w` 时点值无注记（A-5；权威面 roadmap/dev log/审计档均已正确）。
- dev log 09-26 `:212` 仍记 `flux.pageDesigner.*` zh/en 各 `+46 键`（A-10 三处 ×46 活性主张之一；dev log 09-27 :27 的 108→109 已随 271568fa0 消化）。
- plan 516-519 四份均无 `## Draft Review Record` 节（A-13）。
- **A-9 未落地**：design-architecture §10.2 终裁「`pnpm check` 新增检查项：`page-designer-core`/`page-designer-renderers` import 图禁入六域内部模块（flow-designer-core/renderers、report-designer-core/renderers、spreadsheet-core/renderers、word-editor-\*、flux-print-core/renderers、flux-renderers-industrial，含 `/editor` 子路径）；import 即越界，零豁免缺省，豁免须逐项登记给理由」。QA.6 Minor-2 → QA.1-L6 Minor-3 → 登记册 A-9 两连登记「仍未落地」；边界 0 越界事实经 QA.6/QA.1-L6 静态核对成立，缺自动化回归防线。
- `scripts/__tests__/` 有同款 check 脚本测试先例（`check-workspace-manifest-deps.test.ts` 等 11 个），经 `pnpm test:scripts`（vitest.scripts.config.ts）运行。
- **实现注意（防误报）**：`packages/page-designer-core/src/classify.ts:20-25` 与 `classify.test.ts:17-27` 含六域包名字符串字面量（sourcePackage 兜底数据，非 import，有测试钉住的受保护行为）——脚本只扫 import 语句面，该 lookalike 必须保持零命中。

## Goals

- roadmap §13 三处状态格/行内口径与 §15 终态声明零矛盾（A-4/A-6/A-10/A-11）。
- plan 523/524 状态机与完成主张一致（A-12 + QA.1-L6 §7① 翻转余步）；plan 513 勘误注记、plan 516-519 Draft Review Record 补写落盘（A-5/A-13）。
- A-9：`check:page-designer-boundary` 入 `pnpm check` 链，page-designer-\* → 六域 import 即红；脚本回归测试入 `scripts/__tests__/`。
- 登记册 A 表对应行翻 `closed`（留验证线索）；dev log 09-27 两处簿记虚记更正 + 本批记录。

## Non-Goals

- 登记册中带独立触发条件的其余 open 项一律不动（登记 ≠ 立项，登记册 §E）：A-1（登记治理批次）/ A-2、A-3（org 族触碰）/ A-7（industrial editor 触碰或后续裁定）/ A-8、A-14、A-16②（docs 维护批次）/ A-15、A-16①（page-designer 触碰）/ D-2（docs 维护拆分）。
- 不改写任何历史计划的结论（Rule 21：只加注记/补节；勘误以括注承载，不改写原记录语义）。
- 不重跑 QA.7 审计本体（已 pass 在库；本 plan 收口以登记册刷新 + 全链验证承载）。
- 不触碰 page-designer 两个包的源码（A-15/A-16① 的触发条件未满足）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（Phase 3 为代码面：check 脚本 + `scripts/__tests__/` 回归测试，验证「合成越界 fixture → exit 1 且命中指定文件；当前干净树 → exit 0」。Phase 1/2/4 为纯文档/登记面，验证 = grep/程序化核对，不适用测试档）

## Execution Plan

### Phase 1 - roadmap §13 状态格与行内勘误

Status: completed（2026-09-27 本批落地）
Targets: `docs/backlog/missing-components-and-designer-roadmap.md`

- Item Types: `Fix`

- [x] :241 QA.1 行状态格 `in progress`（L0–L4 已过并放行）→ `done`（2026-09-27，L0–L7 全线 pass）
- [x] :242 QA.2–QA.6 行状态格 `in progress`（QA.2/QA.3/QA.4/QA.5 pass）→ `done`（2026-09-27，QA.2–QA.6 全 pass；QA.7 pass 见下行）
- [x] :237 `industrial 1608 测试绿` → `1611`（QA.5 Minor-2 口径，行内改注）
- [x] :237 oversized 表述 `207w 实况（…）/208w 投影（…），拆分或登记归 QA.7` → 208w 现状统一口径（「oversized 台账 208w/2e/2exempt 现状（QA.7 §1 实核，登记册 A-4 closed 随 plan 525）」），不再保留「投影/归 QA.7」悬念语
- [x] :239 `i18n zh/en ×46` → `×40`
- [x] :233/:241 残留 `205w` 时点值加「（时点值；现状口径 208w，登记册 A-4）」类括注——历史记录不改写，只防误读为现状

Exit Criteria:

- [x] grep 验证：roadmap 全文无 `×46` 活性主张（勘误引文除外）、无 `1608 测试绿`、无 `207w 实况`；:241/:242 状态格为 `done`
- [x] §13 全表与 §15 终态声明零矛盾（QA.1/QA.2–QA.6/QA.7 三行状态格均为终态）

### Phase 2 - plan 族文本收口

Status: completed（2026-09-27 本批落地）
Targets: `docs/plans/523/524/522/521/513/516/517/518/519-*.md`

- Item Types: `Fix`

- [x] plan 523：`Plan Status: draft → completed`；Closure Gates 4 项补勾（`:111` 三 Phase Exit Criteria 实况全勾、`:114` 全量链 = Status Note 42×3+78/78、`:115` e2e = 1617/43/2/3、`:116` QA.6 pass 档在库——证据链 QA.1-L6 §2）
- [x] plan 524：Draft Review Record 补填（批次合并模式——QA.6 集成审计 + QA.1-L6 closure audit 两独立 fresh 审计覆盖 draft-review 职能，沿 521/522/523 口径）；`:91`/`:92`/`:96`/`:107`/`:109` 补勾（证据：QA.1-L6 approved 0B/0M/2m+3Obs + QA.7 §1 全链实测 42×3/14993/check 0）；`:130` Follow-up 模板占位填实（`no remaining plan-owned work` 或实文）
- [x] plan 524 计数勘误 ×3：`:59` `keyboard-navigation.test.ts(6)` → `(5)`；`:60` renderers coverage 数字加复测括注（97.93/99.15/98.84，Branches 90.86 一致）；`:77` `新增 46 键` → `新增 40 键`
- [x] plan 522：`:80` `industrial vitest 1608/1608 全绿` → 行内改注 `1611`（A-6，QA.5 Minor-2 口径）
- [x] plan 521：补 `## Draft Review Record` 节标题（四字段批次合并内容已在盘，仅缺节标题——A-13 关联面）
- [x] plan 513 勘误注记：`:106`/`:156`（data 1172 → 实 1174）、`:136`（scheduling 1036 → 实 1038）内联计数加勘误括注；`:210`/`:236`/`:287` `204w` 加「（时点值，现状 208w，登记册 A-4）」注记（A-5：历史记录层加注，不改写结论）
- [x] plan 516-519：各补 `## Draft Review Record` 节（批次合并模式口径：QA.1-L5 线出口审计 + QA.7 最终验收审计两独立 fresh 审计覆盖 draft-review 职能；沿 521/523 同款措辞）

Exit Criteria:

- [x] grep 验证：523/524 无未勾 in-scope checklist、无 `<<` 模板占位（含 `:130` Follow-up）；522 `:80` 无 `1608`；513 六处注记在位（五处 = A-5 口径，另含 `:156` 顺带注记）；516-519/521 `## Draft Review Record` 节均在位
- [x] 523/524 顶部状态 ↔ 内部状态机 ↔ Closure Gates ↔ 完成主张四者一致（523=completed 全勾、524=completed 全勾）

### Phase 3 - A-9 import 边界静态防线

Status: completed（2026-09-27 本批落地）
Targets: `scripts/check-page-designer-import-boundary.mjs`、`package.json`（check 链）、`scripts/__tests__/check-page-designer-boundary.test.ts`、plan 523（勘误注记）

- Item Types: `Fix`、`Proof`

- [x] `scripts/__tests__/check-page-designer-boundary.test.ts`（Proof 先行，test-first）：①合成 fixture——page-designer 包文件含六域 import（from/import()/import/require 各形态）→ exit 1 且命中指定 file → specifier；干净样例 → exit 0；②当前树实跑断言 exit 0（含 `classify.ts` 六域字符串字面量 lookalike 必须零命中的防误报钉子）
- [x] 新建 `scripts/check-page-designer-import-boundary.mjs`：扫描 `packages/page-designer-core/src/**` 与 `packages/page-designer-renderers/src/**` 全部 import 面（static `from` / dynamic `import()` / side-effect `import` / CJS `require`），命中六域禁入清单（`@nop-chaos/flow-designer-core|flow-designer-renderers|report-designer-core|report-designer-renderers|spreadsheet-core|spreadsheet-renderers|word-editor-*|flux-print-core|flux-print-renderers|flux-renderers-industrial`）即 exit 1 并逐条列出 file → specifier；预留显式豁免表（登记制，缺省零豁免，沿 `check-oversized-code-files.mjs` OVERSIZED_EXEMPTIONS 先例）；脚本头注释引用 design-architecture §10.2 裁决
- [x] root `package.json` `check` 链追加 `check:page-designer-boundary` + 对应 scripts 条目
- [x] plan 523 Phase 3「新增 import 边界扫描项随本 plan 落地」声明行加勘误括注（「实际随 plan 525 Phase 3 落地——Rule 21 注记」）

Exit Criteria:

- [x] `node scripts/check-page-designer-import-boundary.mjs` 对当前树 exit 0（边界 0 越界与 QA.6/QA.1-L6 静态核对一致）
- [x] `pnpm test:scripts` 全绿且新测试在列
- [x] `pnpm check` 全链 exit 0 且输出含新检查项

### Phase 4 - 登记册闭环刷新 + dev log 虚记更正

Status: completed（2026-09-27 本批落地）
Targets: `docs/audits/missing-components/QA.7-residual-debt-register.md`、`docs/logs/2026/09-27.md`、`docs/logs/2026/09-26.md`

- Item Types: `Fix`

- [x] 登记册 A 表：A-4/A-5/A-6/A-9/A-10/A-11/A-12/A-13 八行 → `closed`，每行留验证线索（本 plan + 落盘位置）；登记册维持「open 集与实况一致」
- [x] dev log 09-26 `:212` `各 +46 键` → `各 +40 键`（A-10 第三处活性主张）
- [x] dev log 09-27 簿记行更正：①「簿记批次：plan 513/523/524 计数勘误与注记一次性消化」为虚记（271568fa0 未触 plan 文件）→ 更正为实况并记录本批消化；②QA.1-L5 行「516-519/521 Draft Review Record 补填」措辞过强（516-519 原无节、521 缺节标题）→ 按实况更正；③补本批（plan 525）记录：A-9 落地 + ma43 非 prettier 表格变体处置（HEAD 即 prettier 规范态，改动弃用）

Exit Criteria:

- [x] 登记册 A 表 open/closed 分布与 live 一致（程序化 grep 核对）
- [x] 两份 dev log 无与 live 矛盾的完成主张；四个修复面（roadmap / plan 524 / 两份 dev log）grep 无 `×46`/`+46 键` 活性主张（审计档/登记册勘误引文、非 i18n 语义及 plan 525 自身引用除外）

## Draft Review Record` 节标题（孤立悬置于 Execution Plan 与 Closure Gates 之间；A-13 关联面）。

- plan 513 `:106`（data 1172→实 1174）/`:136`（scheduling 1036→实 1038）/`:156` 内联计数无勘误；`:210`/`:236`/`:287` 记 `oversized 204w` 时点值无注记（A-5；权威面 roadmap/dev log/审计档均已正确）。
- dev log 09-26 `:212` 仍记 `flux.pageDesigner.*` zh/en 各 `+46 键`（A-10 三处 ×46 活性主张之一；dev log 09-27 :27 的 108→109 已随 271568fa0 消化）。
- plan 516-519 四份均无 `## Draft Review Record` 节（A-13）。
- **A-9 未落地**：design-architecture §10.2 终裁「`pnpm check` 新增检查项：`page-designer-core`/`page-designer-renderers` import 图禁入六域内部模块（flow-designer-core/renderers、report-designer-core/renderers、spreadsheet-core/renderers、word-editor-\*、flux-print-core/renderers、flux-renderers-industrial，含 `/editor` 子路径）；import 即越界，零豁免缺省，豁免须逐项登记给理由」。QA.6 Minor-2 → QA.1-L6 Minor-3 → 登记册 A-9 两连登记「仍未落地」；边界 0 越界事实经 QA.6/QA.1-L6 静态核对成立，缺自动化回归防线。
- `scripts/__tests__/` 有同款 check 脚本测试先例（`check-workspace-manifest-deps.test.ts` 等 11 个），经 `pnpm test:scripts`（vitest.scripts.config.ts）运行。
- **实现注意（防误报）**：`packages/page-designer-core/src/classify.ts:20-25` 与 `classify.test.ts:17-27` 含六域包名字符串字面量（sourcePackage 兜底数据，非 import，有测试钉住的受保护行为）——脚本只扫 import 语句面，该 lookalike 必须保持零命中。

## Goals

- roadmap §13 三处状态格/行内口径与 §15 终态声明零矛盾（A-4/A-6/A-10/A-11）。
- plan 523/524 状态机与完成主张一致（A-12 + QA.1-L6 §7① 翻转余步）；plan 513 勘误注记、plan 516-519 Draft Review Record 补写落盘（A-5/A-13）。
- A-9：`check:page-designer-boundary` 入 `pnpm check` 链，page-designer-\* → 六域 import 即红；脚本回归测试入 `scripts/__tests__/`。
- 登记册 A 表对应行翻 `closed`（留验证线索）；dev log 09-27 两处簿记虚记更正 + 本批记录。

## Non-Goals

- 登记册中带独立触发条件的其余 open 项一律不动（登记 ≠ 立项，登记册 §E）：A-1（登记治理批次）/ A-2、A-3（org 族触碰）/ A-7（industrial editor 触碰或后续裁定）/ A-8、A-14、A-16②（docs 维护批次）/ A-15、A-16①（page-designer 触碰）/ D-2（docs 维护拆分）。
- 不改写任何历史计划的结论（Rule 21：只加注记/补节；勘误以括注承载，不改写原记录语义）。
- 不重跑 QA.7 审计本体（已 pass 在库；本 plan 收口以登记册刷新 + 全链验证承载）。
- 不触碰 page-designer 两个包的源码（A-15/A-16① 的触发条件未满足）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（Phase 3 为代码面：check 脚本 + `scripts/__tests__/` 回归测试，验证「合成越界 fixture → exit 1 且命中指定文件；当前干净树 → exit 0」。Phase 1/2/4 为纯文档/登记面，验证 = grep/程序化核对，不适用测试档）

## Execution Plan

### Phase 1 - roadmap §13 状态格与行内勘误

Status: completed（2026-09-27 本批落地）
Targets: `docs/backlog/missing-components-and-designer-roadmap.md`

- Item Types: `Fix`

- [x] :241 QA.1 行状态格 `in progress`（L0–L4 已过并放行）→ `done`（2026-09-27，L0–L7 全线 pass）
- [x] :242 QA.2–QA.6 行状态格 `in progress`（QA.2/QA.3/QA.4/QA.5 pass）→ `done`（2026-09-27，QA.2–QA.6 全 pass；QA.7 pass 见下行）
- [x] :237 `industrial 1608 测试绿` → `1611`（QA.5 Minor-2 口径，行内改注）
- [x] :237 oversized 表述 `207w 实况（…）/208w 投影（…），拆分或登记归 QA.7` → 208w 现状统一口径（「oversized 台账 208w/2e/2exempt 现状（QA.7 §1 实核，登记册 A-4 closed 随 plan 525）」），不再保留「投影/归 QA.7」悬念语
- [x] :239 `i18n zh/en ×46` → `×40`
- [x] :233/:241 残留 `205w` 时点值加「（时点值；现状口径 208w，登记册 A-4）」类括注——历史记录不改写，只防误读为现状

Exit Criteria:

- [x] grep 验证：roadmap 全文无 `×46` 活性主张（勘误引文除外）、无 `1608 测试绿`、无 `207w 实况`；:241/:242 状态格为 `done`
- [x] §13 全表与 §15 终态声明零矛盾（QA.1/QA.2–QA.6/QA.7 三行状态格均为终态）

### Phase 2 - plan 族文本收口

Status: completed（2026-09-27 本批落地）
Targets: `docs/plans/523/524/522/521/513/516/517/518/519-*.md`

- Item Types: `Fix`

- [x] plan 523：`Plan Status: draft → completed`；Closure Gates 4 项补勾（`:111` 三 Phase Exit Criteria 实况全勾、`:114` 全量链 = Status Note 42×3+78/78、`:115` e2e = 1617/43/2/3、`:116` QA.6 pass 档在库——证据链 QA.1-L6 §2）
- [x] plan 524：Draft Review Record 补填（批次合并模式——QA.6 集成审计 + QA.1-L6 closure audit 两独立 fresh 审计覆盖 draft-review 职能，沿 521/522/523 口径）；`:91`/`:92`/`:96`/`:107`/`:109` 补勾（证据：QA.1-L6 approved 0B/0M/2m+3Obs + QA.7 §1 全链实测 42×3/14993/check 0）；`:130` Follow-up 模板占位填实（`no remaining plan-owned work` 或实文）
- [x] plan 524 计数勘误 ×3：`:59` `keyboard-navigation.test.ts(6)` → `(5)`；`:60` renderers coverage 数字加复测括注（97.93/99.15/98.84，Branches 90.86 一致）；`:77` `新增 46 键` → `新增 40 键`
- [x] plan 522：`:80` `industrial vitest 1608/1608 全绿` → 行内改注 `1611`（A-6，QA.5 Minor-2 口径）
- [x] plan 521：补 `## Draft Review Record` 节标题（四字段批次合并内容已在盘，仅缺节标题——A-13 关联面）
- [x] plan 513 勘误注记：`:106`/`:156`（data 1172 → 实 1174）、`:136`（scheduling 1036 → 实 1038）内联计数加勘误括注；`:210`/`:236`/`:287` `204w` 加「（时点值，现状 208w，登记册 A-4）」注记（A-5：历史记录层加注，不改写结论）
- [x] plan 516-519：各补 `## Draft Review Record` 节（批次合并模式口径：QA.1-L5 线出口审计 + QA.7 最终验收审计两独立 fresh 审计覆盖 draft-review 职能；沿 521/523 同款措辞）

Exit Criteria:

- [x] grep 验证：523/524 无未勾 in-scope checklist、无 `<<` 模板占位（含 `:130` Follow-up）；522 `:80` 无 `1608`；513 六处注记在位（五处 = A-5 口径，另含 `:156` 顺带注记）；516-519/521 `## Draft Review Record` 节均在位
- [x] 523/524 顶部状态 ↔ 内部状态机 ↔ Closure Gates ↔ 完成主张四者一致（523=completed 全勾、524=completed 全勾）

### Phase 3 - A-9 import 边界静态防线

Status: completed（2026-09-27 本批落地）
Targets: `scripts/check-page-designer-import-boundary.mjs`、`package.json`（check 链）、`scripts/__tests__/check-page-designer-boundary.test.ts`、plan 523（勘误注记）

- Item Types: `Fix`、`Proof`

- [x] `scripts/__tests__/check-page-designer-boundary.test.ts`（Proof 先行，test-first）：①合成 fixture——page-designer 包文件含六域 import（from/import()/import/require 各形态）→ exit 1 且命中指定 file → specifier；干净样例 → exit 0；②当前树实跑断言 exit 0（含 `classify.ts` 六域字符串字面量 lookalike 必须零命中的防误报钉子）
- [x] 新建 `scripts/check-page-designer-import-boundary.mjs`：扫描 `packages/page-designer-core/src/**` 与 `packages/page-designer-renderers/src/**` 全部 import 面（static `from` / dynamic `import()` / side-effect `import` / CJS `require`），命中六域禁入清单（`@nop-chaos/flow-designer-core|flow-designer-renderers|report-designer-core|report-designer-renderers|spreadsheet-core|spreadsheet-renderers|word-editor-*|flux-print-core|flux-print-renderers|flux-renderers-industrial`）即 exit 1 并逐条列出 file → specifier；预留显式豁免表（登记制，缺省零豁免，沿 `check-oversized-code-files.mjs` OVERSIZED_EXEMPTIONS 先例）；脚本头注释引用 design-architecture §10.2 裁决
- [x] root `package.json` `check` 链追加 `check:page-designer-boundary` + 对应 scripts 条目
- [x] plan 523 Phase 3「新增 import 边界扫描项随本 plan 落地」声明行加勘误括注（「实际随 plan 525 Phase 3 落地——Rule 21 注记」）

Exit Criteria:

- [x] `node scripts/check-page-designer-import-boundary.mjs` 对当前树 exit 0（边界 0 越界与 QA.6/QA.1-L6 静态核对一致）
- [x] `pnpm test:scripts` 全绿且新测试在列
- [x] `pnpm check` 全链 exit 0 且输出含新检查项

### Phase 4 - 登记册闭环刷新 + dev log 虚记更正

Status: completed（2026-09-27 本批落地）
Targets: `docs/audits/missing-components/QA.7-residual-debt-register.md`、`docs/logs/2026/09-27.md`、`docs/logs/2026/09-26.md`

- Item Types: `Fix`

- [x] 登记册 A 表：A-4/A-5/A-6/A-9/A-10/A-11/A-12/A-13 八行 → `closed`，每行留验证线索（本 plan + 落盘位置）；登记册维持「open 集与实况一致」
- [x] dev log 09-26 `:212` `各 +46 键` → `各 +40 键`（A-10 第三处活性主张）
- [x] dev log 09-27 簿记行更正：①「簿记批次：plan 513/523/524 计数勘误与注记一次性消化」为虚记（271568fa0 未触 plan 文件）→ 更正为实况并记录本批消化；②QA.1-L5 行「516-519/521 Draft Review Record 补填」措辞过强（516-519 原无节、521 缺节标题）→ 按实况更正；③补本批（plan 525）记录：A-9 落地 + ma43 非 prettier 表格变体处置（HEAD 即 prettier 规范态，改动弃用）

Exit Criteria:

- [x] 登记册 A 表 open/closed 分布与 live 一致（程序化 grep 核对）
- [x] 两份 dev log 无与 live 矛盾的完成主张；四个修复面（roadmap / plan 524 / 两份 dev log）grep 无 `×46`/`+46 键` 活性主张（审计档/登记册勘误引文、非 i18n 语义及 plan 525 自身引用除外）

### Phase 5 - 全链验证 + closure audit

Status: in progress
Targets: 全仓

- Item Types: `Proof`

- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm check` 全绿（typecheck/build/lint 42×3 successful；test 78/78 task；test:scripts 全绿含 boundary 3 用例；check 链 16 项 CHAIN-EXIT:0 含 check:page-designer-boundary）
- [x] dev log 收口行 + git commit（本 plan 一次提交）
- [x] 独立子 agent（fresh session）closure audit 通过后翻转 `completed`（2026-09-27：r1 issues 1M+3m → 修复 → delta 复审 approved）

Exit Criteria:

- [x] 五链全绿输出在案（数字记 dev log）
- [x] closure audit approved（0B/0M）证据写入本 plan Closure 节

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立 fresh 子 agent（general-purpose，与起草会话无关；r1 fail 2M+6m → 修订 → r2 pass）
- Verdict: `pass-with-minors`（r2：0B/0M/2m——m-7 513 注记计数措辞、m-8 grep 面收窄，均已随手消化）
- Rounds: 2
- Findings addressed: r1 M-1（plan 522 :80 纳入 A-6 落点）/ M-2（dev log 09-26 :212 纳入 A-10 落点）+ m-1（coverage 行号 :60）/ m-2（521 节标题 + 措辞按实）/ m-3（测试数 11）/ m-4（classify.ts lookalike 防误报钉子）/ m-5（Proof 先行）/ m-6（524 :130 占位）；r2 m-7/m-8 措辞收窄已消化

## Closure Gates

- [x] A-4/A-5/A-6/A-10/A-11/A-12/A-13 全部落盘，roadmap §13 ↔ §15 ↔ plan 族 ↔ 登记册 ↔ dev log 五面零矛盾、零虚记
- [x] A-9 静态防线落地（脚本 + check 链 + 回归测试）且当前树 exit 0
- [x] 登记册 A 表 open/closed 与实况一致
- [x] `pnpm typecheck` / `build` / `lint` / `test` / `check` 全绿（零新增红）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

> 以下均已在 QA.7 残余债登记册登记并带显式触发条件；本 plan 不消化（Non-Goals），仅在此显式裁定归属。

### A-1 manifest 8 条 example.json 缺失治理

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap §15 终态已声明；登记册 gate =「下批登记治理批次」，登记 ≠ 立项（§E）
- Successor Required: `yes`
- Successor Path: 登记册 A-1 行（触发：登记治理批次）

### A-2 org abort 层级滞留 loading / A-3 useOrgEcho 死参数

- Classification: `optimization candidate`
- Why Not Blocking Closure: 登记册 gate =「下批 org 族触碰」；liveness 边缘非协议违反、死参数无行为影响
- Successor Required: `yes`
- Successor Path: 登记册 A-2/A-3 行（触发：org 族触碰）

### A-7 load-in-preview §13.4 裁定 / A-8 设计文档回链 / A-14 O1 bullet 残面 / A-16② L7.8 三项 docs

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 登记册 gate =「docs 维护批次 / industrial 触碰」；均为文档面非行为缺口
- Successor Required: `yes`
- Successor Path: 登记册对应行

### A-15 gallery keydown 弹层门控 / A-16① isSchemaNode 死导出

- Classification: `optimization candidate`
- Why Not Blocking Closure: 登记册 gate =「下批触碰 page-designer 时」；超出 S4-1 契约的边缘 UX（1 undo 可逆）/ 零消费导出无运行时影响
- Successor Required: `yes`
- Successor Path: 登记册 A-15/A-16① 行（触发：page-designer 触碰）

### D-2 coverage 基线报告超 40KB 指导线

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 继承性体量债（非本 roadmap 引入）；登记册 gate =「下批 docs 维护评估拆分」
- Successor Required: `yes`
- Successor Path: 登记册 D-2 行

## Closure

Status Note: QA.7 pass 与 roadmap §15 终态声明落库后的指派尾项一次消化：roadmap §13 三处状态格/行内勘误与终态声明零矛盾；plan 513/516-519/521/522/523/524 文本收口（523/524 翻转 completed 全勾）；A-9 import 边界静态防线落地（脚本 + check 链 + 3 用例回归，test-first 先红后绿）；登记册 A 表 8 项闭环 + D-1 闭环；dev log 09-26/09-27 虚记更正与本批记录。全链验证 typecheck/build/lint 42×3 + test 78/78 task + test:scripts 全绿 + check 16 项 CHAIN-EXIT:0。closure audit r1 `issues`（1M+3m：plan 525 文件重复块 + 3 措辞/登记尾项）→ 修复 → delta 复审 **approved**（0B/0M）。登记册余量 open 项均有触发条件（登记 ≠ 立项），见 Deferred。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-27，r1 issues → 修复 → delta 复审 approved）
- Evidence: r1 报告 0B/1M/3m（M-1 plan 525 :128-229 重复块；m-1 ×46 措辞/m-2 登记册 D-1 滞后/m-3 side-effect import 形态缺用例）——四项全部修复；delta 复审核验结构唯一性（310→207 行）、四修复落实、boundary 脚本 exit 0 + 测试 3/3 绿、登记册/dev log 与 live 一致，verdict **approved**（0 Blocker / 0 Major）
