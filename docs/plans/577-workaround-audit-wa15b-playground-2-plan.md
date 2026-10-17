# 577 workaround-audit WA-15b playground 审计批二（pages 域 demo 页目录）

> Plan Status: completed
> Last Reviewed: 2026-10-12
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-15b 工作项，Phase Status 对应行）+ `docs/skills/workaround-code-smell-audit-prompt.md`；先例：`docs/plans/576/575/571`
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`；`docs/audits/workaround-code-smell/wa-15a/report.md`（承接转发三项+watch 5 条）；`docs/audits/workaround-code-smell/wa-11/report.md`（尾部勘误注记）；`docs/context/ai-autonomy-policy.md`

## Purpose

对 playground `src/pages` 域（106 文件/20,134 行 demo 页目录）执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划；同时收口 WA-11→15a→15b 与 WA-14→15b 两条转发链的本体位点与 WA-pgai-002 同族 notify 收敛面。

## Current Baseline

- **对象清单**（WA-0 枚举器输出，单模块 pg-pages）：`apps/playground/src/pages` **106 文件/20,134 行**。含 designer demo host 重页面（spreadsheet-demo 25 行 async 命中/report-designer-demo 687 行/print-designer-demo/dashboard-demo/debugger-lab-page/scada-demo/performance-table-page 685+`performance-table/` 子目录 6 件[diagnostics/index/measurement/runtime/schema/types，三主件=诊断器/runtime/schema]/m5-mobile-showcase-schemas 616）与 ai/demo 族、mobile/showcase 族。目录原始口径 118 文件/21,844 行；差值 = 9 个测试文件 1,097 行（枚举器 TEST_FILE_PATTERN 排除；测试自身临时方案形态可立案，同 15a 口径）+ 3 个 JSON schema（condition-builder-formula-schema/conditionBuilderSchema/fluxBasicPageSchema——非 TS 审计对象，行为面按 schema 取证）。
- **在途漂移口径（拟制时实测 2026-10-12）**：本目录 `git status` **零在途**。拟制时 HEAD = `491b32ddb`（WA-15a 收口提交）。
- **字面标记**：literalEn **0**、literalZh **3**（report-designer-cell-style-panel.tsx:4「绕过」/scada-demo.tsx:11「临时」/dashboard-demo.tsx:83「绕过」——三处初判均为说明性注释，Phase 1 逐个定性；字面扫描以枚举器口径为准）。
- **模式候选基线**（inventory per-module，执行时以枚举器复测为准）：typeBypass **44**（历批 playground 最高，逐个人工定性）+ setTimeout **7** + domRaid **4** + silentCatch/keyRemount/pixelNudge/testEnvBranch 全 0。
- **门禁交叉基线**（拟制时 live 实测，执行时复跑为准）：`check:audit-async-failure-paths` pages 过滤 **38 行**（spreadsheet-demo ×25[单文件密集，去重定性为重心]+report-designer-demo ×3+print-designer-demo ×2+env-stream-demo ×2+dashboard-demo ×2+cell-style-panel/debugger-lab/ai-persistence/ai-linkage 各 1）；`check:audit-performance-suspects` **6 行**（env-stream-demo:224 + performance-table/diagnostics:284 双报/:309 双报 + runtime.tsx:76）；`check:audit-reactive-render-reads` **1**（report-designer-host-demo:58）；raw-schema/hardcoded-type-dispatch/renderer-browser-io 均 **0**（实跑留痕）。
- **oversized 登记债口径**：非测试 ≥500 行 **4 件**（report-designer-demo 687/performance-table-page 685/m5-mobile-showcase-schemas 616/performance-table/schema 546）；≥500 行源文件一律结构走读、全读。
- **包特性与审计重心**：①demo 页目录=宿主装配面（RendererEnv 装配/schema 声明/action 接线/mock 连接器），九类信号的 B（静默兜底）/H（复制沉积）在「页间互相照抄」的 demo 族为本批重心——同族 demo（ai-×9/mobile showcase 族/w×4 族）出生波次密集；②designer demo host 面（spreadsheet/report/print/dashboard）与包内 renderer 域 wa-12/13 已审面交界，宿主侧接线缺陷属本批；③performance-table 子目录为性能演示专用域（诊断器/runtime/schema），perf 门禁 5 行集中于此。
- **承接转发四项（本批必读必裁，零静默）**：①**ai-conversations-demo.tsx create→列表回路接线缺陷**（WA-11 立案→wa-15a 承接转发①三段式裁决：本体位点在本批，携 wa-15a 报告 §承接转发① 证据与 WA-pgai-001 勘误注记执行半边修复；runtime namespace 面归 CX-n 不批内越权）；②**ai-hitl-demo.tsx:6 顶层带参 initFluxI18n**（WA-14 转发链本体位点：WA-i18n-001 根因包侧 warn 已可观测，本批裁定移入组件 effect 或改消费全局语言）；③**`toast.error(text || 'Error')` 族 12 处基线命中**（WA-pgai-002 同族收敛面：单源 `pages/notify-toast.ts` notifyWithToast 已存在，本批全量接线）；④wa-15a watch 微注记如有 pages 侧关联位点随取证裁定。
- **交界防重复**：①wa-11 已立案发现（renderer namespace 面/ok:false 无宿主观测通道——runtime 修复归 CX-n）不重复立案；②wa-15a 六模块已审面（complex-pages/taskflow/ai[包装层]/env/src-root）不重复立案——本批仅 pages/ 目录；③CX-15/CX-19 覆盖面（test-support 骨架/replica kit）不重复立案；④plan 549（IS-ai-conversations-001）/plan 547/550/551（taskflow/confirm-bridge/render-host）/plan 523（域路由）已收口结论直接引用不翻案；⑤IS 轨道交互状态工作项已收口交互面结论直接引用。
- **保护区与授权条款**：①`apps/playground/package.json` 依赖声明**零变更**（WA-15a 同款条款；knip dependencies 新命中沿「以修代重立」先例或 successor）。②Renderer definition fields = plan-first。③样式契约 = plan-first。④pages 目录无公共导出面（demo 页集合），不设 index.ts 条款。
- **跨包测试隔离条款（WA-7/14 教训固化）**：批内任何提取/重写不得把带副作用的调用提升进模块顶层求值路径；凡修复触及模块求值面（②ai-hitl init 半边必触），除 playground filter 四门禁外加跑 **flux-renderers-ai 全量 + flux-react 全量**（双哨兵）。
- **五门禁基线**：拟制时点 = WA-15a 收口（491b32ddb）隔离全绿（日志 `_tmp/wa15a-gates-1..5[bc]-*-final.log` 五件终态+首跑八件）。
- **工作树状态（拟制时点实测）**：主树并行会话在途变更（packages/flux-runtime、flux-core、flux-renderers-data/form/layout 14 文件）与 `apps/playground/src/pages` 零交集；全量门禁沿用隔离 worktree 方法（HEAD+本批 diff）。

## Goals

- `docs/audits/workaround-code-smell/wa-15b/report.md`：逐条发现（prompt §6 单条 12 字段+归属裁定字段）+ 汇总五项 + 覆盖声明节（106 文件分档落字）+ 承接转发四项核验结论节。
- findings 全量登记 ledger（`WA-pages-001` 起三位零填充顺延，与既有前缀零撞号——以台账 live 为准），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修；转发四项全部显式去向（批内修/挂账/CX 均须落字）。
- 台账 modules 行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发；demo 族复制沉积为潜在点）。

## Non-Goals

- 结构性重构的批内实施；`apps/playground/package.json` 依赖声明的任何增删。
- 与其他轨道重复立案；已登记 pre-existing 门禁红的重复立案；wa-1..15a 已立案发现重复立案；CX-1..20 覆盖面的重复立案。
- 非 pages 域（complex-pages/taskflow-designer-lib/component-lab 等已审/待审批面）。

## Scope

### In Scope

- `apps/playground/src/pages/` 全部非测试源码的取证（prompt §5 全量协议）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试；承接转发四项的批内修复半边。
- `docs/audits/workaround-code-smell/wa-15b/report.md` + ledger 登记/翻转 + roadmap WA-15b 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非 pages 域修改（含并行会话在途文件——登记转发不越权修）。
- 结构性重构实施；renderer/runtime 包侧契约修复（归 CX-n/successor）。

## Failure Paths

不适用（审计批无新增运行时错误处理面）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。P0/P1 修复先红后绿；行为保持型批内修特征化测试先钉后改；修复后跑 `pnpm --filter @nop-chaos/flux-playground typecheck/build/lint/test`；触及模块求值面的修复加跑 flux-renderers-ai 全量 + flux-react 全量（双哨兵）；批收口跑全量五门禁（隔离 worktree 方法）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: done（2026-10-12：独立取证 agent 产出报告落盘 9 findings[P2×4+P3×5 零 P0/P1]+watch 6 条+误报排除 20 项；106/106 全文覆盖三口径零差[20,134×3]；候选 44/7/4/3 逐个定性[30 并入 008+14 动态边界豁免/7 全豁免/4 全豁免/3 说明性注释豁免]；门禁实跑 async 38=37 豁免+1 立案[006]/perf 6+reactive 1 全豁免/其余 0；探针双版 886 对+4,002 对人工复核定案 4 组+内联 toast 体 12 份复制链；症状性 message 抽检 65=0；CX-19/CX-20 扩围拟制；承接转发四项三段式裁定落字）
Targets: `apps/playground/src/pages/`（读）、`docs/audits/workaround-code-smell/wa-15b/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 协议全走（独立取证 agent 产出报告）——候选逐个定性（typeBypass 44=30 并入 008+14 动态边界豁免；setTimeout 7 全豁免[演示延迟本体]；domRaid 4 全豁免[诊断仪表]；literalZh 3 全豁免[说明性注释]/literalEn 0；async 38=37 豁免+1 立案[006]；perf 6/reactive 1 全豁免；其余门禁 0 实跑留痕；另立 as never 79 处补充口径并入 008）+ 重复块探针（双版逐字 886 对/归一 4,002 对人工复核定案 4 组+toast 体 12 份复制链）+ 范围结构走读（106/106 全文覆盖；≥500 行 4 件全读）+ 误报排除 20 项。（typeBypass 44 历批 playground 最高逐个去重定性为重心 + setTimeout 7 + domRaid 4 + 字面 literalZh 3 逐个 + async 38 行[spreadsheet-demo ×25 单文件密集去重] + perf 6 + reactive 1；其余门禁 0 实跑留痕）+ 重复块探针（双版）+ 范围结构走读（106/106 覆盖分档落字；≥500 行 4 件全读）+ 三档处置 + 误报排除清单（与 wa-7..15a 清单互通）。
- [x] Proof：每个立案候选 git 考古（症状性 message 抽检 65 条=0；toast 族 729d77c18 M5 波首生→9 波连抄→单源晚生 3.5 月链在案）。
- [x] Decision：严重度 + ROI + **归属裁定**（7 条 demo 接线+2 条升级 renderer/core[001 并 CX-19/008 扩 CX-20]）+ 共性裁定——**9 条立案（P2×4+P3×5 零 P0/P1）**、去向四态零静默；CX-19/CX-20 扩围插入 roadmap。
- [x] Proof：承接转发四项核验结论落字（①机制已通+注释勘误 003+e2e 断言附带 ②删调用裁定 ③002 全量接线 ④无直接关联落字+m5-showcase-shared 同族新位点 watch #3）。
- [x] Proof：`wa-15b/report.md` 落盘，findings 全量登记 ledger（9 行）；reconcile 通过（215=92+7+116/未处置 0/violations 0/uncovered 1）。

Exit Criteria:

- [x] `wa-15b/report.md` 落盘且模板字段/汇总五项/覆盖声明节/归属裁定节齐备（106 文件分档落字，行数三口径 20,134×3 零差）。
- [x] ledger 与报告一一对应零遗漏（零撞号——WA-pages- 前缀 live 核验零命中后启用）。
- [x] 每个立案有 git 考古读数+归属裁定结论；误报排除 20 项逐项有对照理由（判例：15a #5/#17/#19、wa-14 localStorage 族、wa-8 收敛面系）。
- [x] 共性裁定落字（CX-19/CX-20 扩围）；承接转发四项核验结论落字（报告专项节）。

### Phase 2 - 批内自动修复（先红后绿）

Status: done（2026-10-12：7 条位点全部落地[修复执行派驻 agent agent_8519d9ab 实施+附带转发① e2e 断言]；红→绿证据：pages-004 module-load 判别[en-US→zh-CN 恰红→绿]+pages-005/009①② identity 探针各恰红→绿；playground filter 四门禁全绿 typecheck/build/lint exit 0+test 49 文件/467 用例；**双哨兵 ai 850/850+flux-react 550/550**[004 触发]；验收 grep 全库口径=0[转发③闭合]；`git diff --exit-code apps/playground/package.json` 通过）
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：7 条位点全部落地（修复执行派驻 agent agent_8519d9ab 按报告清单实施+附带转发① e2e 断言特征化钉住）；pages-004 红→绿判别+005/009 identity 探针红→绿；④⑤豁免位点落台账零静默；001/008 不批内修（CX 去向登记）。
- [x] Proof：playground filter 四门禁全绿（typecheck/build/lint exit 0+test 49 文件/467 用例）；**双哨兵 ai 850/850+flux-react 550/550**（004 触发求值面条款）；`git diff --exit-code apps/playground/package.json` 通过。

Exit Criteria:

- [x] 红→绿证据在案（004 恰红 en-US→绿 zh-CN；005/009 identity 各恰红→绿）；本体删除验证逐项落字（报告修复记录表）。
- [x] filter 级四门禁通过；台账零 P0/P1 残留（found 2 行全部显式 successor-required）；`package.json` `git diff --exit-code` 通过。

### Phase 3 - 回写与收口

Status: done（2026-10-12：台账 9 行登记+pg-pages 翻转+reconcile 通过[215=92+7+116 未处置 0 violations 0]；roadmap CX-19/CX-20 扩围；隔离五门禁全链 exit 0[日志 _tmp/wa15b-gates-1..5.log；终态复跑见 Closure]；closure audit R1 approved[agent_fc9316d2，0B/0M/2m——m1 报告判据措辞修正/m2 收口四件同 commit 提醒]后 7 行 fixed→verified+roadmap WA-15b done）
Targets: roadmap、ledger、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 modules 行翻转 `audited`；reconcile 通过（215=92+7+116/未处置 0/violations 0/uncovered 1[pg-component-lab 属 15c]）。
- [x] Proof：roadmap WA-15b 行 `planned`+进度注记已落并填 plan 路径；`planned → done` 已随 Closure Gates 收口翻转。
- [x] Decision：批内修复 7 行 `fixed → verified` 于本收口 commit 翻转；复检证据=closure audit（见 Closure Audit Evidence）。
- [x] Proof：dev log 记录发现/修复/门禁计数（条目已落，closure/门禁终态已回填）。

Exit Criteria:

- [x] reconcile exit 0 且 wa-15b 报告存在。
- [x] roadmap WA-15b 行回写已落并填 plan 路径。
- [x] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_dfe99249-6db9-47de-9508-70d2b2d259f4，review-only）
- Verdict: `revised`（零 Blocker、1 Major、4 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** Phase 1 首条 Proof 项「singleth-demo ×25」笔误 → 改「spreadsheet-demo ×25」；**m1** performance-table 子目录件数口径 → 改「6 件[三主件=诊断器/runtime/schema]」；**m2** 补 `## Closure` 占位节（对照 00-guide 模板与 576 先例）；**m3** Scope 口径注记补齐（目录原始 118 文件/21,844 = +9 测试 1,097 行+3 JSON schema 豁免，同 15a 口径落字）；**m4** 门禁日志 glob 字面修正（`_tmp/wa15a-gates-1..5[bc]-*-final.log`）。审查员 20+ 项清单全部 live 实测：inventory 106/20,134 逐字节 wc 吻合、零在途、HEAD 491b32ddb、六门禁 38/6/1/0/0/0 逐 file:line 对账（async spreadsheet-demo 25 分解吻合/perf 284·309 双报逐字吻合）、oversized 恰 4 件、literalZh 3 处逐字吻合（pattern=test:93）、转发 12 处 toast.error 抽验吻合、前缀零撞号（WA-pages- ledger=0，与 WA-page- 不构成撞号）、模板 11 节齐备性、五 plan 收口状态、并行在途 14 文件零交集。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（零 P0/P1；批内修 7 条位点收口；结构性/共性以 CX-19/CX-20 扩围+successor-required 显式去向）
- [x] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向——008 flux-core 契约面→CX-20 扩围）
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（pages-004/005/009 红→绿判别 + 002/009③ 行为保持基线同绿 + filter 四门禁 + **双哨兵 ai 850/flux-react 550**）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（watch 6 条+009 ④⑤豁免+转发四项全部台账/报告落字）
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-15b 回写 + dev log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 **approved**（agent_fc9316d2，0B/0M/2m 随收口修正：m1=报告判据措辞[失实句本体 grep=0，修正文本合法指涉保留]/m2=收口四件同 commit 提醒），详见 Closure Audit Evidence
- [x] `pnpm typecheck`（隔离 worktree HEAD+本批 diff，exit 0——build 前置）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0）
- [x] `pnpm test`（同上，exit 0）
- [x] `pnpm check`（同上，exit 0——零新增未登记红；主树 oversized exit 1 系并行会话 runtime-factory.ts 701 行在途，HEAD 锚隔离树不含，已甄别）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- e2e ai-conversations create 用例计数断言已加（特征化钉住），运行时验证归 e2e 套件下次运行。
- WA-pages-001 demo-env 工厂（→CX-19 扩围）与 WA-pages-008 cast 族（→CX-20 扩围）执行归 CX plan。
- watch 6 条（报告 §watch 即登记）：m5-showcase-shared 未知 URL 静默兜底[wa-15a watch #2 同族]等——位点见报告。

## Closure

Status Note: done（2026-10-12 收口提交）

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_fc9316d2-c1a4-4585-a79e-de9c32dd5fec，review-only）
- Rounds: R1 `approved`（0 Blocker / 0 Major / 2 Minor 随收口修正）
- m1 报告修复记录表判据措辞修正（失实句本体 grep=0；修正文本内 `$ai.controller` 为对已废通道的合法指涉保留）；m2 收口四件（台账翻转/roadmap done/plan Closure/dev log 回填）确保同 commit 落地（本提交即证）。
- 审计员独立实证：七条修复逐一开档（位点/方式/范围三项全对；m3 保留 toast import 正确性核对[navigate 臂仍消费]；009③ diffChangedKeys 语义逐步核对等价）；动态判别 3 组恰红→字节级恢复→绿（①004 恢复顶层 init 恰 1 failed `en-US→zh-CN` 读数逐字一致②005 污染 update no-op 恰 1 failed `undefined to be 42`[行为契约断言有真实判别力]③009② 污染字段 id 恰 1 failed deep-equal）；越界排查（新增行零顶层副作用 API、批集合恰 35、notify-toast.ts/package.json 零触碰、packages/ 在途恰 14 文件并行集甄别）；reconcile 复跑 215=92+7+116 逐字一致；隔离五门禁日志复核（playground 49/467+哨兵 850/550 零真实 FAIL）；两树 35 路径逐字节 0 差+HEAD=491b32ddb。
- 隔离五门禁（HEAD 491b32ddb + 本批 diff）终态日志：`_tmp/wa15b-gates-1..5.log`（build/typecheck/lint/test/check 全链 exit 0；docs 收口回填后终态复跑记录见 dev log）。

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- （如共性裁定触发 CX-n，其执行归 CX-n plan；本节收口时按实际填写。）
