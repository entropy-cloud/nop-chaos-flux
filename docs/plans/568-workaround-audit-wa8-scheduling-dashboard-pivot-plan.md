# 568 workaround-audit WA-8 调度与企业排程审计批（scheduling + dashboard + pivot）

> Plan Status: completed
> Last Reviewed: 2026-10-12
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-8 工作项，Phase Status 第 9 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`（统一方法）；先例：`docs/plans/567`（ WA-7 批，含 closure 执行期披露回归 WA-content-009 教训）、`docs/plans/566/565/564`
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`（对象清单来源）；`docs/audits/workaround-code-smell/wa-7/report.md`（前批沉淀：误报排除清单互通、WA-content-009 模块顶层副作用教训）；`docs/context/ai-autonomy-policy.md`

## Purpose

对调度与企业排程（flux-renderers-scheduling）、仪表盘（flux-renderers-dashboard）、透视表（flux-renderers-pivot）三包执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划。

## Current Baseline

- **对象清单**（WA-0 枚举器输出，三模块）：scheduling 90 文件/13,436 行 + dashboard 16 文件/2,629 行 + pivot 7 文件/1,228 行 = **113 文件/17,293 行**（roadmap 行"约 17.1k"系拟制时估算，以 inventory 为准）。
- **在途漂移口径（拟制时实测 2026-10-12）**：三包 `git status` **零在途**。拟制时 HEAD = `815d026dd`；WA-7 批（30+ 文件，content/layout 面与本批零交集，精确计数以收口提交清单为准）收口提交合入后 HEAD 前移，执行时以当时 HEAD 快照注记双口径行数。
- **字面标记**：literalEn **1**（`gantt/undo-stack.ts:193` FIXME——Gantt/Kanban undo 命令族双轨注记，I 类候选逐字定性）；literalZh 0（inventory baseline，批内复核）。
- **模式候选基线**（inventory per-module，仅线索非定案）：typeBypass scheduling 15 + dashboard 2 + pivot 2 = **19**；setTimeoutCandidates scheduling **8**；domRaid scheduling **14**；silentCatch/keyRemount/pixelNudge/testEnvBranch 全零。合计 **41 处 + 字面 1 = 42 处候选**逐个人工定性，禁止按 grep 定案。
- **门禁交叉基线**（拟制时 live 实测，执行时复跑为准）：`check:audit-async-failure-paths` **20 行命中**（scheduling 13：barcode-input 族 11[barcode-input:151/scanner-overlay:139/use-barcode-camera:93/use-barcode-detect:110/use-barcode-torch:53,79,87/barcode-detector-utils:64,115,120/prepare-wasm-utils:30]+kanban 2[use-kanban-filter-card:38/kanban-export:66]；pivot 4：pivot-events:49/pivot-option:400/pivot-renderer:126,186；dashboard 3：editor 三件[dashboard-editor-renderer:69/editor-canvas:125/editor-inspector:293]——逐个去重定性）；`check:audit-performance-suspects`/`check:audit-runtime-raw-schema-reads`/`check:audit-hardcoded-type-dispatch`/`check:audit-reactive-render-reads`/`check:audit-renderer-browser-io` 均 0（实跑留痕）。
- **oversized 登记债口径**：scheduling 非测试源 ≥500 行 **3 件**全 WARN 档（gantt.tsx 680/calendar.tsx 643/kanban-board.tsx 572，另 gantt.test 699/barcode-input.test 557/kanban-renderer.test 545 为测试文件不入口径）；pivot pivot-option.ts 448 临界纳入走读；dashboard 无。已登记债不重复立案，但 ≥500 行源文件一律结构走读。
- **包特性与审计重心**：①scheduling = 重型交互族（gantt/kanban/calendar 拖拽与视口、barcode-input 相机/WASM/torch 生命周期）——触摸/指针监听器挂载清理对称性、WASM/相机异步资源释放、undo 命令族双轨（FIXME 在案）、setTimeout 8 处（轮询/动画时序逐个定性）；②dashboard = 编辑器三件套（editor-canvas/editor-inspector/dashboard-editor-renderer）+ echarts 面板失败观测（跨包集成测试 dashboard-echarts-panel[-failure].test 在盘；懒加载本体 getECharts 归 flux-renderers-data，WA-6 已收口，本批只验证不重案）+ layout-math/use-canvas-width 布局数学——canvas 事件接线、async 3 行命中定性；③pivot = 轻量 7 文件——pivot-option 448 行配置面、lazy-loading-guard 在盘（懒加载收敛 live 复核载体）、pivot-warn.ts 观测通道。
- **交界防重复**：①interaction-state 轨道 IS-2 gantt（plan 545）与 IS-3 calendar（plan 546/82ea5c5a2）刚收口、gantt 连线删除钮 hover 振荡修复（4e4fde426，IS-gantt-003 verified）——交互面结论不重复立案，修复质量可作考古锚；②IS-5 data-viz（plan 548/cb05858b0）收口了 dashboard-demo/table/map 消费侧交互缺陷——本批透镜=九信号临时方案与坏味道（生产包面），不重复其 demo 侧立案；③scheduling 包内已有 dom-structure-contract/visual-quality-guard/contract-honesty/scheduling-boundary-narrowing 四类契约测试在盘——其断言面结论直接引用不重跑定性。
- **已收敛模式三档**：live 可证档——`createLazyLibLoader`（c21e2dea9 重库统一懒加载：echarts/ol/zxing 模块级 + pivot 组件级）在三包装载点 live 复核零复发（barcode zxing 装载点 + pivot lazy-loading-guard.test）；cq-5（4ee46b668）/cq-6（2c94d9d7f）在三包收敛点 live 复核；历史教训档——`dataPath` 双词汇、strip errors/ajax 双份（不涉则记不适用）；WA-1..7 已立案发现（CX-1..15 覆盖面）不重复立案。
- **保护区与授权条款**：①三包 `src/index.ts` 公共导出 = **批内零变更**（确需增删 → CX-n/显式注记待人工确认；扩展名 .ts）。②Renderer definition fields = plan-first——本 plan 即载体。③样式契约 = plan-first（widget 件 self-styled 合法）。
- **跨包测试隔离条款（WA-7 教训固化）**：批内任何提取/重写**不得把带副作用的调用（`t()`、store 订阅、DOM 探测）提升进模块顶层求值路径**——WA-content-009（模块顶层 t() 冻结 i18n 单例，ai 套件 3 用例红）已实证 filter 级门禁对此盲区；凡修复触及模块求值面，除本包 filter 四门禁外必须加跑 **flux-renderers-ai 全量套件**（注册栈导入链最长的哨兵包，850 用例，2026-10-12 实测；执行时以当次实测为准）作为跨包回归探针。
- **五门禁基线**：拟制时点 = WA-6 收口（aeaf14177）隔离全绿；其后 815d026dd（bundle 提交）无全量门禁记录（拟制会话自述局部验证，repo 不可核验），故以 WA-7 收口提交的隔离五门禁全绿为生效基线。
- **工作树状态（拟制时点实测）**：主树并行会话在途变更（data×4/form×3/runtime×3/core×1 + WA-7 批收口中）与本批三包零交集；全量门禁沿用隔离 worktree 方法（HEAD+本批 diff）。

## Goals

- `docs/audits/workaround-code-smell/wa-8/report.md`：逐条发现（prompt §6 单条 12 字段）+ 汇总五项 + 覆盖声明节（含三包文件清单与行数双口径落字）。
- findings 全量登记 ledger（`WA-scheduling-001`/`WA-dashboard-001`/`WA-pivot-001` 起三位零填充顺延，与既有 13 前缀零撞号），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修；三包 `index.ts` 零公共导出变更。
- 台账 modules 三行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发）。

## Non-Goals

- 结构性重构的批内实施；三包 `index.ts` 公共导出面的任何增删。
- IS-2/IS-3/IS-5 等 interaction-state 轨道已收口交互面的重复立案与返工。
- 与其他轨道重复立案；已登记 pre-existing 门禁红的重复立案；wa-1..7 已立案发现重复立案。
- playground 消费侧（dashboard-demo/gantt-demo/kanban-demo 等 demo 接线归 playground 批次）。

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/`、`packages/flux-renderers-dashboard/src/`、`packages/flux-renderers-pivot/src/` 全部非测试源码的取证（prompt §5 全量协议）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试。
- `docs/audits/workaround-code-smell/wa-8/report.md` + ledger 登记/翻转 + roadmap WA-8 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非本批包/模块的任何修改（含并行会话在途文件——登记转发不越权修）。
- 结构性重构实施；playground 消费侧。

## Failure Paths

不适用（审计批无新增运行时错误处理面）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。P0/P1 修复先红后绿（Proof 与 Fix 合并表达，沿 561..567 先例）；行为保持型批内修特征化测试先钉后改；修复后跑各包 `pnpm --filter @nop-chaos/flux-renderers-{scheduling,dashboard,pivot} typecheck/build/lint/test`；触及模块求值面的修复加跑 flux-renderers-ai 全量套件（跨包测试隔离条款，850 用例口径以当次实测为准）；批收口跑全量五门禁（隔离 worktree 方法）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: completed
Targets: `packages/flux-renderers-{scheduling,dashboard,pivot}/src/`（读）、`docs/audits/workaround-code-smell/wa-8/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [ ] Proof：prompt §5 协议全走——42 处候选逐个定性（字面 1 + typeBypass 19 + setTimeout 8 + domRaid 14）+ 门禁交叉（async 20 行命中逐个去重定性；其余 5 门禁 0 实跑留痕）+ 重复块探针（token 归一化滑窗，人工复核同构性）+ 范围结构走读（113/113 覆盖：逐行精读 + 声明文件扫描分档落字；≥500 行 3 件全读）+ 三档处置（懒加载/cq-5/cq-6 live 复核零复发，教训档不涉则记不适用）+ 误报排除清单（含与 wa-7 误报排除清单互通引用）。
- [ ] Proof：每个立案候选 git 考古（`git log -L`/`blame` 溯源出生 commit；症状性 message 抽检 ≥20 条）。
- [ ] Decision：严重度 + ROI + 共性裁定——立案清单（P0/P1/P2/P3 分档）、去向四态零静默（fixed/successor-required/watch-only/withdrawn/n-a）；共性发现以 CX-n 插入 roadmap（或并入同类 CX 项扩围）。
- [ ] Proof：`wa-8/report.md` 落盘（模板字段/汇总五项/覆盖声明节齐备），findings 全量登记 ledger（三 ID 命名空间分行清晰）；reconcile 通过。

Exit Criteria:

- [x] `wa-8/report.md` 落盘且模板字段/汇总五项/覆盖声明节齐备（113 文件覆盖分档落字，行数三口径与 inventory 零差）。
- [x] ledger 与报告一一对应零遗漏（三 ID 命名空间，零撞号）。
- [x] 每个立案有 git 考古读数（12 commit）；误报排除 22+3 逐项有对照理由。
- [x] 共性裁定落字（CX-15/CX-11 扩围登记 roadmap；无新增独立 CX）。

### Phase 2 - 批内自动修复（先红后绿）

Status: completed
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [ ] Fix：逐项修复——P0/P1 先红后绿（判别性测试：旧实现下必挂、新实现下通过，点名判别机制）；行为保持型提取特征化测试先钉后改；临时方案本体删除验证（特判分支/延迟/断言/注释化石 grep=0 或显式残差注记）；类别清扫（修任一实例必 grep 全类兄弟，≥2 处同模式升级 CX-n）。
- [ ] Proof：三包 filter 四门禁——typecheck/build/lint/test 全绿；触及模块求值面的修复加跑 flux-renderers-ai 全量套件（跨包测试隔离条款，850 用例口径以当次实测为准）；三包 `index.ts` 零公共导出变更（`git diff --exit-code`）。

Exit Criteria:

- [ ] 红→绿证据在案（判别性测试点名）；本体删除验证逐项落字。
- [ ] filter 级四门禁通过；台账无残留 `found` 未处置的 P0/P1；三包 `index.ts` `git diff --exit-code` 通过。

### Phase 3 - 回写与收口

Status: completed
Targets: roadmap、ledger、dev log

- Item Types: `Proof`

- [ ] Proof：台账 modules 三行翻转 `audited`；reconcile 通过。
- [ ] Proof：draft review 通过时 roadmap WA-8 回写 `todo → planned` 并填 plan 路径；`planned → done` 属 Closure Gates 收口动作。
- [x] Decision：批内修复行 `fixed → verified` 归属——closure 复检通过当场翻转（8 行，closure audit agent_04abedba approved 0B/0M/2m）。
- [ ] Proof：dev log 记录发现/修复/门禁计数。

Exit Criteria:

- [ ] reconcile exit 0 且 wa-8 报告存在。
- [ ] roadmap WA-8 行 `todo → planned` 已落并填 plan 路径。
- [ ] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_d729a26f-ff92-4193-bf9d-00816be7cbb8，review-only）
- Verdict: `revised`（零 Blocker、1 Major、3 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** 跨包探针基线"851 用例"失实（主树双路径实测 850/850 全绿；根源=wa-7 报告 WA-content-009 条目自身 847+3 算术笔误被本 plan 忠实转录，另有拟制会话首个复绿读数把未清理的临时探针文件计入）→ 三处改 850 并加"执行时以当次实测为准"hedge，wa-7 报告/台账/dev log 同步勘误；**m1** WA-7 在途文件计数内部不一致（32 vs 31）→ 统一"30+ 文件（精确计数以收口提交清单为准）"；**m2** dashboard 审计重心归属失准（echarts 懒加载本体在 flux-renderers-data echarts-setup.ts，dashboard 包内仅跨包集成观测测试）→ 改写为"失败观测+只验证不重案"；**m3** 815d026dd "flux build/test 8/8" 引文不可独立核验 → 改为"无全量门禁记录（拟制会话自述局部验证）"并立 WA-7 收口门禁为生效基线。审查员 16 项清单全部 live 实测（inventory 三包计数逐字吻合、async 20 行逐 file:line 一致、5 门禁 0、字面恰 1 处、oversized 含 pivot-option 448 复核、plans 545/546/548 与三 commit 在盘、四契约测试在盘、createLazyLibLoader live 在位、index.ts 扩展名、ledger 13 前缀零撞号、行数 17,293 精确吻合、ai 850/850 全绿）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（批内修 P0/P1 红→绿收口；结构性/共性以 CX-n 显式去向）
- [x] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向）
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（批内修项红→绿证据 + filter 四门禁 + ai 850 哨兵）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-8 回写 + dev log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure）
- [x] `pnpm typecheck`（隔离 worktree HEAD+本批 diff，exit 0）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0）
- [x] `pnpm test`（同上，exit 0）
- [x] `pnpm check`（同上，exit 0——零新增未登记红）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- （如共性裁定触发 CX-n，其执行归 CX-n plan；本节收口时按实际填写。）

## Closure

Status Note: WA-8 三包审计批按自动修复契约完整收口——13 findings 全量落账零静默（fixed→verified 8 + successor-required 1[WA-scheduling-002 kanban-export 接线，DESIGN-RESERVE 文件头显式登记] + watch-only 4）；隔离五门禁（HEAD 6fee267cb + 本批 29 文件）R2 全链 exit 0；draft review R1 共识（0B/1M/3m 全修）+ closure audit R1 approved（0B/0M/2m 随收口修正）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（general-purpose fresh session，agent_04abedba-9d13-4544-b779-e5a9c766ac81，review-only）
- Evidence: R1 approved（0 Blocker/0 Major/2 Minor 随收口修正）——①落地实证 11 项全过（moveGridFocus 三视图调用+选择器裁定注释/html2canvas 单一 loader[生产 src 静态 import=0]/DESIGN-RESERVE 头/as any=0[余量 7 处均误报排除在案]/FIXME=0/键盘微原语/layout-math builder 单份+双消费/initFluxI18n 工厂体+三表派生/pivot-vocabulary 三处改引/三包 index.ts 零变更/尾修三处）；②动态判别实证 2/2（dashboard-003 deps 回退→判别测试恰 1 failed 逐字 expected 2 to be 1；scheduling-001 共享模块 ArrowDown 改用 colStride→钉测试恰 1 failed[7/8]——用后恢复零残留）；③五件一致性（台账 13=报告 13、reconcile 105=71+8+26 未处置 0、roadmap CX 扩围落字、dev log 计数一致）；④批次边界 29 文件两树逐字节一致（六处并行在途+plans/569 零交集）；⑤R2 五标记独立复核 + pivot 66/66 当场实跑 + reconcile 当场复跑；⑥knip 叙事（R1 逮 GridRovingFocusOptions→收私→R2 零命中）；⑦预写诚实性+epilogue（\_tmp/wa8 三探针声明在案）。m1（报告四处 finding ID 错位：:34/:52/:54/候选清单表 006/007 行）m2（modules 三行 audited 翻转须在收口提交完成——本节即证）均随收口落盘。

Follow-up:

- WA-scheduling-002 kanban-export 产品接线（KanbanHandle+toolbar+toast）归 successor——design-export-snapshot.md 出口在案，台账行显式登记。
- watch-only 4（拖拽视觉态声明化/gantt-links 合成 PointerEvent/torch readiness promise/date 原语拍板）随对应族下次触碰。
- CX-15 扩围（dashboard-002 定义表）与 CX-11 扩围（use-gantt-keyboard updateRowAria）按 roadmap 时机执行。
