# 570 workaround-audit WA-10 轻型可视化与打印/代码编辑审计批（3d + graph + map + print-core + print-renderers + code-editor）

> Plan Status: completed
> Last Reviewed: 2026-10-12
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-10 工作项，Phase Status 第 11 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`（统一方法）；先例：`docs/plans/569/568/567`（跨包测试隔离条款、执行期披露先例）
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`；`docs/audits/workaround-code-smell/wa-8/report.md`（误报排除清单互通）；`docs/context/ai-autonomy-policy.md`

## Purpose

对轻型可视化与打印/代码编辑六包（flux-renderers-3d、flux-renderers-graph、flux-renderers-map、flux-print-core、flux-print-renderers、flux-code-editor）执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划。

## Current Baseline

- **对象清单**（WA-0 枚举器输出，六模块）：3d 25 文件/2,950 行 + graph 10/1,402 + map 11/1,924 + print-core 10/1,548 + print-renderers 11/2,052 + code-editor 25/3,376 = **92 文件/13,252 行**（roadmap 行"约 12.7k"系拟制时估算，以 inventory 为准）。
- **在途漂移口径（拟制时实测 2026-10-12）**：六包 `git status` **零在途**。拟制时 HEAD = `a439c55a3`（WA-8 收口提交）；WA-9 收口提交合入后 HEAD 前移，执行时以当时 HEAD 快照注记。
- **字面标记**：literalEn **0**、literalZh **0**（历批首个双零批次；inventory baseline，批内复核）。
- **模式候选基线**（inventory per-module，仅线索非定案）：typeBypass **16**（3d 10/map 3/graph 2/print-renderers 1/其余 0）+ setTimeoutCandidates **4**（3d 2/print-core 1/print-renderers 1）+ domRaid **1**（print-renderers）= **21 处候选**逐个人工定性，禁止按 grep 定案。
- **门禁交叉基线**（拟制时 live 实测，执行时复跑为准）：`check:audit-async-failure-paths` **19 行命中**（初分：3d ×7[use-scene-manager:59/schema-generator:154/transform-engine:74,92/industrial-adapter:103/use-binding-bridge:117,130]、code-editor ×4[colorize:49/use-sql-editor-state:215/linter:18/variable-panel:42]、print-core ×6[barcode:23,53/bind:103,120,194/layout:350]、map ×2[map-renderer:71/use-map-geojson:49]——以执行时复跑逐行落字为准）；`check:audit-reactive-render-reads` **16 行命中（历批首次点亮）**——全部为 graph-renderer.tsx（:181/:185/:204/:225/:230/:235/:239/:244/:276/:280/:343/:345/:415/:418/:458/:639 密集），单文件 16 处 render 期响应式读取为重大信号，Phase 1 必须定性（真实响应式契约 vs 渲染期 store 直读越界）；`check:audit-performance-suspects` **2**（print-domain-adapter.ts:127 同 file:line 双报，stringify 相等性回退候选——单门禁内双报，非 async 面）；`check:audit-runtime-raw-schema-reads`/`check:audit-hardcoded-type-dispatch`/`check:audit-renderer-browser-io` 均 0（实跑留痕）。
- **oversized 登记债口径**：非测试源 ≥500 行 **2 件**全 WARN 档（graph/graph-renderer.tsx 650、3d/engine/scene-manager.ts 603——后者系 plan 559 抽 scene-json-assembly 后的守门残留行数）；≥500 行源文件一律结构走读。
- **包特性与审计重心**：①graph：graph-renderer.tsx 单文件 650 行且 reactive-render-reads 16 处密集——渲染期数据流所有权为本批第一焦点；②3d：plan 559 刚收口的 scene/three 桥接面（ObjectLoader/tween/keyframe 冻结裁定在案）+ binding/transform-engine 异步链（async 7 行）——其裁定注释直接引用不重案；③map：ol 懒加载（c21e2dea9 echarts/ol/zxing 模块级收敛）live 复核 + use-map-geojson 异步链；④print-core/print-renderers：导出 PDF/canvas 管线（async 6 行集中于 print-core）+ print-domain-adapter.ts:127（perf 门禁单门禁双报——stringify 相等性回退候选，定性方向 B/D 邻域而非异步失败路径）；⑤code-editor：codemirror 懒加载（lazy-lib 契约面）+ linter/colorize 异步链 + SQL 编辑器状态。
- **交界防重复**：①plan 559（completed，closure approved）3D/SCADA 桥接与演示面结论直接引用；②c21e2dea9 懒加载收敛（3d/graph/pivot 组件级 + echarts/ol/zxing 模块级）live 可证档——六包装载点 live 复核零复发；③IS-5（plan 548）map-demo 消费侧交互缺陷已收口（map 定罪链 6 探针在案）——本批透镜=生产包面九信号；④WA-1..9 已立案发现与 CX-1..15 覆盖面不重复立案。
- **保护区与授权条款**：①六包 `src/index.ts` 公共导出 = **批内零变更**（确需增删 → CX-n/显式注记待人工确认；六包扩展名实测均为 .ts）。②Renderer definition fields = plan-first——本 plan 即载体。③样式契约 = plan-first。
- **跨包测试隔离条款（WA-7 教训固化）**：批内任何提取/重写**不得把带副作用的调用（`t()`、store 订阅、DOM 探测）提升进模块顶层求值路径**；凡修复触及模块求值面，除本包 filter 四门禁外必须加跑 **flux-renderers-ai 全量套件**（哨兵包，850 用例口径以当次实测为准）。
- **五门禁基线**：拟制时点 = WA-8 收口（a439c55a3）隔离全绿；WA-9 收口后以收口提交的隔离五门禁全绿为生效基线。
- **工作树状态（拟制时点实测）**：主树并行会话在途变更（runtime/core/data/form/dropdown 六处）与六包零交集；全量门禁沿用隔离 worktree 方法（HEAD+本批 diff）。

## Goals

- `docs/audits/workaround-code-smell/wa-10/report.md`：逐条发现（prompt §6 单条 12 字段）+ 汇总五项 + 覆盖声明节（92 文件分档、typeBypass/reactive 命中分区落字）。
- findings 全量登记 ledger（`WA-3d-001`/`WA-graph-001`/`WA-map-001`/`WA-print-core-001`/`WA-print-renderers-001`/`WA-code-editor-001` 起，与既有前缀零撞号——拟制时点 17 前缀，WA-9 落账后 18，执行时以台账 live 为准），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修；六包 `index` 零公共导出变更。
- 台账 modules 六行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发）。

## Non-Goals

- 结构性重构的批内实施；六包 `index` 公共导出面的任何增删。
- plan 559 三维桥接面与 IS-5 map-demo 消费侧的重复立案。
- 与其他轨道重复立案；已登记 pre-existing 门禁红的重复立案；wa-1..9 已立案发现重复立案。
- playground 消费侧（three-gallery 等 demo 面）。

## Scope

### In Scope

- 六包 `src/` 全部非测试源码的取证（prompt §5 全量协议）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试。
- `docs/audits/workaround-code-smell/wa-10/report.md` + ledger 登记/翻转 + roadmap WA-10 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非本批包/模块的任何修改（含并行会话在途文件——登记转发不越权修）。
- 结构性重构实施；playground 消费侧。

## Failure Paths

不适用（审计批无新增运行时错误处理面）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。P0/P1 修复先红后绿；行为保持型批内修特征化测试先钉后改；修复后跑六包 `pnpm --filter <pkg> typecheck/build/lint/test`；触及模块求值面的修复加跑 flux-renderers-ai 全量套件；批收口跑全量五门禁（隔离 worktree 方法）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: planned
Targets: 六包 `src/`（读）、`docs/audits/workaround-code-smell/wa-10/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 协议全走——21 处候选全部复现逐个定性 + 门禁交叉（async 19 行 3d 7/code-editor 4/print-core 6/map 2 与基线逐字吻合零升级；**reactive 16 行[历批首次点亮] 16/16 全豁免零立案**——事件回调 10/effect 2/命令式句柄 3/onClick 1，渲染面经 useStore 六选择器全订阅零 getState 直读，裁决依据逐行落字；perf 2 行同位双报 print-domain-adapter:127 R2-P20 修复现场排除+watch；其余 3 门禁 0）+ 重复块双版探针（逐字版 3,724 窗 0 命中/归一版 6,598 窗 11 区域→坐实 4 组+走读补 2 组）+ 范围结构走读（**92/92 全文读取** 零抽样；≥400 行 7 件全读含 oversized 2 件）+ 误报排除 24 项+4 微注记（微注记口径=取证简报计数；report 表内 watch 微注记 9 处+表外 2 条，以报告为准——closure m4 口径注）。
- [x] Proof：每个立案候选 git 考古（12 commit；症状性 message 抽检 22=0；行数三口径 13,252 零差）。
- [x] Decision：严重度 + ROI + 共性裁定——**6 条立案（全部 P3，零 P0/P1/P2——历批最轻）**；去向=批内修 6[含 002 ③修+余观察同行登记]+reactive 门禁 watch（graph local-store 先例注记）+CX-15 扩围 +2（graph/map createMockRendererProps，drift 证据 graph 版缺 node.scope）；graph/map 两包零立案。
- [x] Proof：`wa-10/report.md` 落盘（266 行），findings 全量登记 ledger（6 行）；reconcile=118 findings（found 78+verified 40；closure 勘误：可推导值 119=113 基线+6 新增/found 79——此行为取证时点快照，终态以收口复跑为准）/未处置 6[待 Phase 2 翻转]/violations 0。

Exit Criteria:

- [x] `wa-10/report.md` 落盘且模板字段/汇总五项/覆盖声明节齐备（92 文件分档落字，行数三口径与 inventory 零差）。
- [ ] ledger 与报告一一对应零遗漏（零撞号）。
- [x] 每个立案有 git 考古读数（12 commit）；误报排除 24+4 逐项有对照理由（reactive 16 行单列定性节另计）。
- [x] 共性裁定落字（CX-15 扩围 +2 登记 roadmap；无新增独立 CX）。

### Phase 2 - 批内自动修复（先红后绿）

Status: completed
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：逐项修复 6 项（全 P3 低成本）——3d-001 mock 死桩纯删除（grep 计数=0 判据达成）+ 3d-002 scene-manager 五处 cast 收窄（10→2，余 headless 探针豁免；dispose 路径按 headless 桩契约回改 removeChild+单次 HTMLElement 断言——报告原 remove() 建议与桩契约冲突，200/200 复绿）+ print-core-001 assertNoErrorDiagnostics 单份（消息逐字保持，83/83）+ print-renderers-001 EMPTY_SNAPSHOT 改 createEmptyPrintTemplate('')（78/78）+ code-editor-001 shared/editor-compartments 单份（quartet 工厂+四 builder+initial 装配+共享监听，双 hook 薄壳化，104/104）+ code-editor-002③ use-sql-editor-state 两处内联 walk 改调 getDataAtPath；reactive 门禁 watch 注记 + CX-15 扩围 +2 同行登记零静默。
- [x] Proof：四涉包 filter 四门禁——typecheck/build OK、lint **0 error**、test 3d **200/200**/print-core **83/83**/print-renderers **78/78**/code-editor **104/104** 全绿；ai 哨兵 **850/850**（008 修复未触生产模块求值面）；四包 `index.ts` 零公共导出变更（`git diff --exit-code` 逐一验证）；执行期尾修（print-core 未用导入 ×2 + dispose stub 契约回改）。

Exit Criteria:

- [ ] 红→绿证据在案；本体删除验证逐项落字。
- [ ] filter 级四门禁通过；台账无残留 `found` 未处置的 P0/P1；`index` `git diff --exit-code` 通过。

### Phase 3 - 回写与收口

Status: completed
Targets: roadmap、ledger、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 modules 六行翻转 `audited`；reconcile 通过（119 findings = found 73 + fixed 6 + verified 40 / 未处置 0 / violations 0）。
- [x] Proof：draft review 通过时 roadmap WA-10 回写 `todo → planned` 并填 plan 路径；`planned → done` 属 Closure Gates 收口动作。
- [x] Decision：批内修复行 `fixed → verified` 归属——closure 复检通过当场翻转（6 行）。
- [x] Proof：dev log 记录发现/修复/门禁计数。

Exit Criteria:

- [ ] reconcile exit 0 且 wa-10 报告存在。
- [ ] roadmap WA-10 行 `todo → planned` 已落并填 plan 路径。
- [ ] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_ef5fb10b-825c-478f-96c8-e4696c17f284，review-only）
- Verdict: `revised`（零 Blocker、2 Major、2 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** typeBypass 计数失实（17→16：inventory/live grep/plan 自身拆分加总三口径一致为 16，标题数 17 内部不自洽）→ 16、总候选 22→21；**M2** print-domain-adapter.ts:127 被幻影归入 async 与 reactive 两门禁（async 六包命中实为 19=7+4+6+2 无 print-renderers；reactive 恰 16 行全为 graph-renderer.tsx 且 16 个行号逐一吻合；adapter:127 系 perf 门禁单门禁双报[stringify 相等性回退]）→ async 初分删 print-renderers ×1、reactive 17→16 删 adapter、包特性④ 改写为 perf 单门禁双报并纠正定性方向（B/D 邻域而非异步失败路径）；**m1** roadmap "约 12.7k"与 inventory 13,252 差额无沿革注记 → 补注记；**m2** 六包 index 扩展名 hedge 偏弱 → 写实均为 .ts。审查员 22 项清单全部 live 实测（inventory/wc 双口径逐包吻合、零在途、字面双零、async 19 行前三组逐 file:line 吻合、reactive 16 行号逐一吻合、三门禁 0、oversized 2 件数值吻合、559/548 在盘、懒加载六包装载点在位、17 前缀零撞号且 WA-3d 前缀与 reconcile regex 兼容、台账六行 pending 在案）。

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复（批内修 P0/P1 红→绿收口；结构性/共性以 CX-n 显式去向）
- [ ] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向）
- [ ] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [ ] 必要 focused verification 已完成（批内修项红→绿证据 + filter 四门禁 + 跨包探针如触发）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline（roadmap WA-10 回写 + dev log）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`（隔离 worktree HEAD+本批 diff，exit 0）
- [ ] `pnpm build`（同上，exit 0）
- [ ] `pnpm lint`（同上，exit 0）
- [ ] `pnpm test`（同上，exit 0）
- [ ] `pnpm check`（同上，exit 0——零新增未登记红）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- （如共性裁定触发 CX-n，其执行归 CX-n plan；本节收口时按实际填写。）

## Closure

Status Note: WA-10 六包审计批按自动修复契约完整收口——6 findings（全 P3，历批最轻）全量落账零静默（fixed→verified 6 + reactive 门禁 watch + CX-15 扩围 +2）；graph/map 零立案；隔离五门禁（HEAD 2fc5e782d + 本批 17 文件[12 代码+1 bind 注释+4... 按提交清单]）R2 全链 exit 0；draft review R1 共识（0B/2M/2m 全修）+ closure audit R1 approved（0B/0M/6m 随收口修正）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（general-purpose fresh session，agent_74649143-0e84-4ef2-8ea3-74b077aa5e82，review-only）
- Evidence: R1 approved（0 Blocker/0 Major/6 Minor 随收口修正）——①落地实证 11 项全过（死桩 grep=0/scene-manager as unknown as=2/断言单份+消息逐字对照 HEAD/createEmptyPrintTemplate 接线/editor-compartments 单份+quartet grep=0/getDataAtPath 导出+两处改调/四包 index.ts 零变更）；②动态判别+行为保持实证 4 组（print 回退 HEAD 孪生版 83/83 绿=行为等价；共享版错误码前缀变异→恰 2 failed/83 证双出口真走单源；共享监听 docChanged 反转→恰 2 failed/104；:167 回退双跳 cast typecheck 仍过=冗余性证明）；③五件一致性+批次边界（批集合 12 代码+5 docs 两树逐字节一致；14 并行在途不在批内）；④R2 五标记独立复核 + print-core 83/83、code-editor 104/104 独立实跑 + reactive 16 行/async 19 行复现 + reconcile 复跑；⑤m1 bind 注释随收口补落（report 承诺兑现）、m2 3d-002 行注 remove()→parentNode.removeChild、m3 plan 快照 118/78 加历史勘误注、m4 微注记口径、m5 validate 注释 pinned 表述、m6 简报算术澄清（无工件）——均随收口落盘。

Follow-up:

- reactive 门禁 watch：graph local-store 先例注记入 rules.mjs（docs-only，随门禁下次迭代）。
- CX-15 扩围（graph/map createMockRendererProps +2）按 roadmap 时机执行。
- code-editor-002 余项：bind.resolveDataPath 字面键优先注释已补；与 flux-core getIn 合并挂账观察（本行即登记）。
