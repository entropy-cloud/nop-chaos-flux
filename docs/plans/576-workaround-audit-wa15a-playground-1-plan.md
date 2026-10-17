# 576 workaround-audit WA-15a playground 审计批一（complex-pages + taskflow-designer-lib + designer-hosts + ai + env + src 根级散文件）

> Plan Status: completed
> Last Reviewed: 2026-10-12
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-15a 工作项，Phase Status 第 17 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`；先例：`docs/plans/575/572/571`
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`；`docs/audits/workaround-code-smell/wa-11/report.md`（plan 529 Deferred 转发线索）；`docs/audits/workaround-code-smell/wa-14/report.md`（ai-hitl-demo init 时序转发）；`docs/context/ai-autonomy-policy.md`

## Purpose

对 playground 消费侧批一六模块（pg-complex-pages、pg-taskflow-designer-lib、pg-designer-hosts、pg-ai、pg-env、pg-src-root）执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划；**消费者归属裁定规则全程适用**（demo 临时方案先裁定归属：renderer 契约缺失→登记 CX-n/successor 修 renderer 优先；demo 接线偷懒→批内修 demo；裁定结论写进台账）。

## Current Baseline

- **对象清单**（WA-0 枚举器输出，六模块）：pg-complex-pages 33 文件/7,399 行 + pg-taskflow-designer-lib 7/2,213 + pg-designer-hosts 1/80 + pg-ai 7/1,171 + pg-env 2/438 + pg-src-root 17/2,562 = **67 文件/13,863 行**（roadmap 行「合计约 13.9k」一致；`*-replica/` 仅 CSS、`schemas/` 仅 JSON 非审计对象；复刻页 schema 与行为面[complex-pages/page-schemas/*.json + complex-pages/shared/mock-backend-*.ts]随 complex-pages 在范围内）。
- **在途漂移口径（拟制时实测 2026-10-12）**：`apps/playground` `git status` **零在途**。拟制时 HEAD = `07cf78dd2`（WA-14 收口提交，隔离五门禁全绿为生效基线）；执行时以当时 HEAD 快照注记。
- **字面标记**：literalEn **0** / literalZh **0**（inventory baseline，批内复核）。
- **模式候选基线**（inventory per-module，执行时以枚举器复测为准）：typeBypass **14**（complex-pages 1 + taskflow-lib 2 + ai 4 + env 7）+ setTimeoutCandidates **7**（ai）+ domRaid **1**（src-root）= **22 处候选**逐个人工定性；silentCatch/keyRemount/pixelNudge/testEnvBranch 全零。
- **门禁交叉基线**（拟制时 playground 全域 live 实测，执行时以六模块过滤复跑为准）：`check:audit-async-failure-paths` playground 全域 **48 行命中**（六模块过滤子集执行时落字）；`check:audit-performance-suspects` 全域 **10**（同上）；reactive/raw-schema/type-dispatch/browser-io 执行时实跑留痕。
- **oversized 登记债口径**（draft review 审查员实测落字）：六模块 ≥500 行非测试源 **2 件**（complex-pages/shared/showcase-env.ts 582、domain-route-entries.ts 565；gate +1 无尾换行差惯例注记）；≥500 行源文件一律结构走读。
- **包特性与审计重心**：①playground 为 renderer 契约的**纯消费者**（roadmap Cross-Cutting 归属裁定规则为本批第一裁定维度）；②complex-pages = 复刻页域（airtable/notion/sundial 等复刻 + page-schemas JSON 行为面 + mock-backend）——demo 数据兜底/假数据/接线特判高发面；③taskflow-designer-lib = 任务流设计器宿主库；④pg-ai = ai 域 demo 装配材料面（WA-11 线索消费支撑面，缺陷本体路径见承接转发节）；⑤pg-env = 环境装配（fetcher/stream 宿主实现）；⑥pg-src-root = App/main/route 散文件。
- **承接转发（前批登记，本批必查项；draft review F1 勘误：两线索缺陷本体位点经核在 `apps/playground/src/pages/` = WA-15b 范围，wa-11 报告「属 WA-15a 范围」前提失实——本节三段式裁决去向，wa-11 报告已随手就地勘误注记）**：①**WA-11 转发**——plan 529 Deferred「create→列表回路存量接线缺陷（import-stack 命名空间竞态嫌疑）」：缺陷本体位点 `apps/playground/src/pages/ai-conversations-demo.tsx`[WA-15b]，**装配材料消费链在 pg-ai 域**（mock-ai-env/openai-connector/ai-conversations-example.json 供其 import）；探针证据=「conversations prop 恒 []、零 console 错误、`ai:send` 可用而 `ai:createConversation` 静默无效（ok:false 无宿主观测通道）的路由不对称」。**裁决**：装配材料面取证归本批；本体位点的归属裁定结论本批落字（demo 接线 vs renderer/runtime 契约），修复执行=位点在 pages/ 归 WA-15b 批（successor 注记随台账行）、涉 runtime 契约走 CX-n。②**WA-14 转发**——`apps/playground/src/pages/ai-hitl-demo.tsx:6` 模块顶层 `initFluxI18n({lng:'en-US'})` init 时序活体[WA-15b]；**先行 init 半边 `apps/playground/src/main.tsx:13` 在 pg-src-root（本批）**——本批取证 main.tsx init 时序半边+与 WA-i18n-001 契约的交互，本体位点去向同①裁决。③**knip dependencies 1 条**——`apps/playground/package.json#@nop-chaos/page-designer-core` 依赖消费面核验（wa-12 转发）。
- **knip 登记债口径**（draft review F4 修订）：六模块 knip src 面 **0 条**、dependencies 1 条（`apps/playground/package.json#@nop-chaos/page-designer-core`，已列入承接转发③）——依赖声明零变更条款使该条不可被动；无 572/575 型量级碰撞风险。
- **交界防重复**：①WA-1..14 已立案发现与 CX-1..18 覆盖面不重复立案；②renderer 侧已收口批次的发现不得在 demo 侧重复修复（消费侧复制若根因在 renderer 已修面→直接改用单源）；③`*-replica/*.css` 与 `schemas/*.json` 非审计对象。
- **保护区与授权条款**：①playground 无 src/index.ts 公共导出面（app 包）——但 `apps/playground/package.json` 依赖声明变更 = plan-first；②demo 页面为 self-styled 合法域；③复杂页 schema JSON（page-schemas）为数据文件——行为面取证对象但 JSON 本体不立「坏味道」案。
- **跨包测试隔离条款（WA-7/WA-content-009 教训固化）**：批内任何提取/重写**不得把带副作用的调用提升进模块顶层求值路径**（pg-src-root `main.tsx:13` 为 initFluxI18n 先行 init 半边——单列定性；`src/ai/` 域系 fixtures/connectors/mock 域与求值面无关[draft review F2 勘误]）；凡修复触及模块求值面，除 playground filter 四门禁外加跑 **flux-renderers-ai 全量**（哨兵）。
- **五门禁基线**：拟制时点 = WA-14 收口（07cf78dd2）隔离全绿。
- **工作树状态（拟制时点实测）**：主树并行会话在途变更（runtime/core/data/form/layout 14 文件）与 playground 零交集；全量门禁沿用隔离 worktree 方法（HEAD+本批 diff）。

## Goals

- `docs/audits/workaround-code-smell/wa-15a/report.md`：逐条发现（prompt §6 单条 12 字段）+ 汇总五项 + 覆盖声明节（67 文件分档落字）+ **归属裁定节**（每条 demo 侧发现的归属结论）。
- findings 全量登记 ledger（六前缀 `WA-cpages-001`/`WA-taskflow-001`/`WA-dhosts-001`/`WA-pgai-001`/`WA-pgenv-001`/`WA-pgroot-001` 起，与既有前缀零撞号——以台账 live 为准），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修；playground 为 app 包无公共导出面（无需 index diff 守卫）；`apps/playground/package.json` 依赖声明零变更（护住 wa-12 转发 knip 条不被顺手处理）。
- 台账 modules 六行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发；消费者归属裁定升级 renderer 侧的走 CX-n/successor）。

## Non-Goals

- 结构性重构的批内实施；`apps/playground/package.json` 依赖声明面的任何增删。
- flux-runtime/flux-core 契约面的任何修改（ai 命名空间实例隔离等结构性背景——登记不越权修）。
- WA-15b（pages 域）/WA-15c（component-lab）范围；已登记 pre-existing 门禁红的重复立案；wa-1..14 已立案发现重复立案。
- e2e（playwright）面的修复——`tests/e2e/` 非本批对象（其复刻视觉基线由 CI 生成）。

## Scope

### In Scope

- `apps/playground/src/` 六模块全部非测试源码的取证（prompt §5 全量协议；42 个 playground vitest 测试文件为行为保持基线非审计对象，但测试自身的临时方案形态可立案）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试（含归属裁定为 demo 侧的修复）。
- `docs/audits/workaround-code-smell/wa-15a/report.md` + ledger 登记/翻转 + roadmap WA-15a 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定或归属裁定升级 renderer 侧）。

### Out Of Scope

- 非本批模块的任何修改（含 renderer 包与并行会话在途文件——归属裁定升级走 CX-n/successor 登记）。
- 结构性重构实施；WA-15b/15c 范围；e2e spec 文件。

## Failure Paths

不适用（审计批无新增运行时错误处理面）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。P0/P1 修复先红后绿（playground vitest 42 文件为行为基线池，新增判别测试落 `apps/playground/src` 就近测试文件）；行为保持型批内修特征化测试先钉后改；修复后跑 `pnpm --filter @nop-chaos/flux-playground typecheck/build/lint/test`（playground 包名以 package.json 为准，下同）；触及模块求值面的修复加跑 ai 哨兵；批收口跑全量五门禁（隔离 worktree 方法）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: done（2026-10-12：报告落盘 13 findings[P2×5+P3×8 零 P0/P1]+watch 5 条+误报排除 22 项；67/67 全文覆盖三口径零差；门禁实跑 async 六模块 7 行[6 豁免+1 watch]/perf 4[3 豁免+1 watch]/其余 4 门禁 0；CX-19/CX-20 插入 roadmap；承接转发三项三段式裁决落字）
Targets: `apps/playground/src/` 六模块（读）、`docs/audits/workaround-code-smell/wa-15a/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 协议全走（独立取证 agent 产出报告）——候选 22 处逐个定性（typeBypass 14 + setTimeout 7 + domRaid 1；字面双零第七个连续双零批组）+ 门禁交叉实跑（async 六模块 7 行=6 豁免+1 watch；perf 4=3 豁免+1 watch；其余 4 门禁 0）+ 重复块双版探针（逐字 56 组跨文件对/5 文件对+归一版家族簇坐实）+ 范围结构走读（67/67 全文覆盖三口径零差；≥500 行 2 件全读）+ 误报排除 22 项+watch 5 条。
- [x] Proof：每个立案候选 git 考古（症状性 message 抽检 200 条——症状性 20 条全部集中在 2026-07 crud-demo→complex-pages 迁移时代，plan 纪律确立后 0）。
- [x] Decision：严重度 + ROI + **归属裁定**（11 条 demo 接线 + 1 条升级 renderer/core[WA-pgai-003]）+ 共性裁定——**13 条立案（P2×5+P3×8 零 P0/P1）**、去向四态零静默；CX-19/CX-20 插入 roadmap。
- [x] Proof：`wa-15a/report.md` 落盘，findings 全量登记 ledger（13 行）；reconcile 通过。

Exit Criteria:

- [x] `wa-15a/report.md` 落盘且模板字段/汇总五项/覆盖声明节/归属裁定专项节齐备（67 文件分档落字，行数三口径逐文件零差）。
- [x] ledger 与报告一一对应零遗漏（零撞号——六前缀中 dhosts/pgenv 零使用仅翻转，live 核验在案）。
- [x] 每个立案有 git 考古读数+归属裁定结论；误报排除 22 项逐项有对照理由。
- [x] 共性裁定落字（CX-19/CX-20 插入）；承接转发三项三段式核验结论落字（报告 §承接转发节）。

### Phase 2 - 批内自动修复（先红后绿）

Status: done（2026-10-12：9 项批内修全部落地[修复执行派驻 agent agent_bcfeb780 实施并披露 pgai-002 验收口径差异=六模块子集口径]；红→绿证据：cpages-001 键集判别+cpages-004 identity 探针+taskflow-001 嵌套容器判别用例各先红后绿；playground filter 四门禁全绿 typecheck/build/lint exit 0 + test 45 文件/460 用例；`git diff --exit-code apps/playground/package.json` 通过；求值面无新增副作用调用→ai 哨兵条款不触发[报告 §批内修合计注记]）
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：9 项批内修复全部落地（修复执行派驻 agent agent_bcfeb780 按报告清单实施）；cpages-001/004+taskflow-001 三组先红后绿判别证据在报告回填表；②③挂账位点落台账零静默；零 P0/P1 立案故无 P0/P1 修复项。
- [x] Proof：playground filter 四门禁全绿（typecheck/build/lint exit 0 + test 45 文件/460 用例）；求值面无新增副作用调用→ai 哨兵条款不触发（报告注记在案）；`git diff --exit-code apps/playground/package.json` 通过。

Exit Criteria:

- [x] 红→绿证据在案（键集判别/identity 探针/嵌套容器判别各恰红→绿，closure audit 动态复现 3 组读数逐字一致）；本体删除验证逐项落字（报告回填表）。
- [x] filter 级四门禁通过；台账零 P0/P1 残留（found 4 行全部显式 successor-required）；`package.json` `git diff --exit-code` 通过。

### Phase 3 - 回写与收口

Status: done（2026-10-12：台账 13 行登记+modules 六行翻转+reconcile 通过[206=90+9+107 未处置 0 violations 0]；roadmap CX-19/CX-20 插入+WA-15a 行进度注记；隔离五门禁全链 exit 0[日志 _tmp/wa15a-gates-1..5.log；终态复跑见 Closure]；closure audit R1 approved[agent_bc35079a，0B/0M/1m——m1 批集合计数 22→23 修正：wa-11 报告勘误注记文件计入]后 9 行 fixed→verified 翻转+roadmap WA-15a done）
Targets: roadmap、ledger、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 modules 六行翻转 `audited`；reconcile 通过（206=90+9+107/未处置 0/violations 0/uncovered 2[pg-pages+pg-component-lab 属 15b/15c]）。
- [x] Proof：roadmap WA-15a 行 `planned` + Phase 进度注记已落并填 plan 路径；`planned → done` 已随 Closure Gates 收口翻转。
- [x] Decision：批内修复 9 行 `fixed → verified` 于本收口 commit 翻转；复检证据=closure audit agent_bc35079a 九项逐一开档实证+动态判别 3 组恰红→字节级恢复绿。
- [x] Proof：dev log 记录发现/修复/门禁计数（条目已落，closure/门禁终态已回填）。

Exit Criteria:

- [x] reconcile exit 0 且 wa-15a 报告存在。
- [x] roadmap WA-15a 行回写已落并填 plan 路径。
- [x] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_44bcefe6-eef4-448b-8100-b67ee9c27a97，review-only）
- Verdict: `revised`（零 Blocker、2 Major、3 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **F1** 两条承接转发缺陷本体位点物理在 `pages/`（WA-15b 范围）与 Non-Goals 冲突未裁决（wa-11 报告「属 WA-15a」前提失实）→ 承接转发节改三段式裁决（装配材料面/先行 init 半边归本批取证；本体位点归属裁定本批落字、修复执行归 WA-15b 或 CX-n）+ wa-11 报告就地勘误注记；**F2** 跨包测试隔离条款事实失实（pg-ai 域零 initFluxI18n 命中，活体=main.tsx:13[本批]+pages/ai-hitl-demo.tsx:6[15b]）→ 条款改 pg-src-root 半边表述；**F3** pg-ai 定位措辞改「装配材料面」；**F4** 补 knip 登记债 bullet（六模块 src 面 0 条+dependencies 1 条已在承接转发③，量级使 575 M1 两要件不成立故记 Minor）；**F5** Goals 两约束拆写。审查员 20 项清单全部 live 复现（对象清单 67/13,863 逐目录 wc、零在途、HEAD 锚、候选 14/7/1 逐目录、async 48/perf 10 全域+子集 5/3、双字面 0、转发三项原文核验、knip 条目实存、包名 @nop-chaos/flux-playground 实证、vitest 42 文件、oversized 2 件、前缀零撞号+reconcile regex 兼容、模板与 575 逐节一致）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（零 P0/P1；批内修 9 项红→绿/行为保持收口；结构性/共性以 CX-19/CX-20+successor-required 显式去向）
- [x] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向——pgai-003 flux-core 契约面→CX-20）
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（cpages-001/004+taskflow-001 三组红→绿判别 + taskflow-002/003 行为保持基线同绿 + playground filter 四门禁 + 求值面裁定[ai 哨兵不触发，报告注记]）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（watch 5 条+taskflow-003 ②③+转发 WA-15b 三项全部台账/报告落字）
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-15a 回写 + dev log + wa-11 报告勘误注记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 **approved**（agent_bc35079a，0B/0M/1m：m1=批集合计数 22→23 修正[wa-11 报告勘误注记文件计入收口提交]），详见 Closure Audit Evidence
- [x] `pnpm typecheck`（隔离 worktree HEAD+本批 diff，exit 0——build 前置规避新鲜 worktree dist 次序，WA-14 教训）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0）
- [x] `pnpm test`（同上，exit 0）
- [x] `pnpm check`（同上，exit 0——零新增未登记红）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- 转发 WA-15b 三项（台账/报告落字在案）：①ai-conversations-demo create→列表接线半边（WA-11 转发链本体位点，携本批 pgai-001 勘误与承接转发①证据）②ai-hitl-demo.tsx:6 顶层带参 initFluxI18n（WA-14 转发链本体位点，warn 已可观测）③pages/ 域 `toast.error(text || 'Error')` 族 12 处基线命中（WA-pgai-002 同族收敛面，notifyWithToast 单源已存在）。
- taskflow-003 ②③挂账（位点落台账）：DSL 镜像对[dsl.ts:30-69↔lowering.ts:10-51，化石字段 lowering:40-41]+validation 孪生对[validation.ts:148-177↔:223-250]。
- watch 微注记 5 条（报告 §watch 即登记）：stream-impl cancel 静默/showcase-env 未知端点静默/taskflow getDesignerDoc 观测/App routeKey stringify/confirm-bridge 漏挂确认。
- WA-pgroot-003 死依赖删除（successor-required，plan 零变更条款护住）——随 CX-19 批或 WA-15b/15c 收口波 knip 基线重立顺带。

## Closure

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_bc35079a-4090-4906-a637-1f5b707c5e1f，review-only）
- Rounds: R1 `approved`（0 Blocker / 0 Major / 1 Minor 随收口修正）
- m1 批文件集计数 22→23 修正：`docs/audits/workaround-code-smell/wa-11/report.md` 尾部 2 行勘误注记（plan 576 draft review F1 落字动作）在收口提交清单内计为一个文件（纯追加零删改，已核实）。
- 审计员独立实证：九项修复逐一开档（diff 对照报告建议修法逐项吻合+越界总排查：playground diff 恰好 14 文件+3 新测试、notify-toast.ts 本体 diff=0、package.json exit 0、模块顶层零新增副作用调用）；动态判别 3 组恰红→字节级恢复→绿（①cpages-001 死块置后获胜恰 1 failed 读数与回填表逐字一致+原位复原绿=出生即死论证；②taskflow-001 四文件退回旧码恰 2 failed[projection 盲区 2 位点]且全库零嵌套 workflow fixture 佐证等价域；③cpages-004 两文件退回 HEAD 恰 1 failed[旧码未导出]）；静态判据 grep 六组全过；reconcile 复跑 206=90+9+107/未处置 0/violations 0；两树 22 文件逐字节一致+wa15a-verify HEAD=07cf78dd2 隔离口径成立；\_tmp 遗留物甄别（审计员备份已自删，wa15a-\* 均执行方所有）。
- 隔离五门禁（HEAD 07cf78dd2 + 本批 diff）终态日志：`_tmp/wa15a-gates-1..5.log`（build/typecheck/lint/test/check 全链 exit 0；playground 45 文件/460 用例；终态 docs 回填后复跑记录见 dev log）。

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- （如共性裁定触发 CX-n，其执行归 CX-n plan；本节收口时按实际填写。）
