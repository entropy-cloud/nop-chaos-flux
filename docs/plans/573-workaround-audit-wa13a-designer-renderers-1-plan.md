# 573 workaround-audit WA-13a 设计器渲染层审计批一（flow-designer-renderers + page-designer-renderers）

> Plan Status: completed
> Last Reviewed: 2026-10-12
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-13a 工作项，Phase Status 第 14 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`（统一方法）；先例：`docs/plans/567/568/569/570`（保护区条款、closure 迭代先例、ai 哨兵教训条款）
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`（对象清单来源）；`docs/audits/workaround-code-smell/wa-10/report.md`（前批沉淀：误报排除清单互通）；`docs/context/ai-autonomy-policy.md`

## Purpose

对设计器渲染层两包（flow-designer-renderers + page-designer-renderers，inventory 84 文件 / 14,225 行）执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划。

## Current Baseline

- **对象清单**（WA-0 枚举器输出，两模块）：flow-designer-renderers 59 文件/10,315 行 + page-designer-renderers 25 文件/3,910 行 = **84 文件/14,225 行**（roadmap 行"约 14.0k"为拟制时估算，以 inventory 为准）。
- **工作树状态（拟制时点实测）**：两包**零在途**（本包范围 git status 零命中；inventory=HEAD wc=live wc 三口径逐文件零差，全集 14,225 行）。主树并行会话在途变更（runtime/core/data/form/layout 14 文件 + plan 571/572 未跟踪稿）不属本批。全量门禁沿用隔离 worktree 方法（HEAD+本批 diff）。**中途漂移预案**：若并行会话执行中触及本批文件，取证以已完成的 HEAD 快照为准并就地注记；修复不叠编辑（沿 564 规则，P0/P1 不得借在途状态降级）。
- **字面标记**：literalEn/literalZh 均为 0（inventory baseline，批内复核）。
- **模式候选基线**（inventory per-module，仅线索非定案）：typeBypass flow 0 + page 17 = 17 + setTimeoutCandidates flow 7 + page 1 = 8 + domRaid flow 4 + page 8 = 12，合计 **37 处候选**逐个人工定性；typeBypass 拟制时 grep 复核（非测试 src）flow 0/page 17 逐字吻合；silentCatch/keyRemount/pixelNudge/testEnvBranch 全零。
- **门禁交叉基线**（拟制时 live 实测，执行时复跑为准）：`check:audit-async-failure-paths` **14 行命中**（page 9：template-gallery:72×2 桶重复+85、json-source-view:36、inspector-panel:188、expression-validation:26、data-binding-panel:41、canvas-bridge:230、actions-model:101；flow 5：tree-session:271/:296/:407、designer-tree-mode:104、designer-page-body:193——去重逐个定性）；`check:audit-performance-suspects` 3（page：actions-editor:55、actions-model:92、inspector-panel:181）；`check:audit-runtime-raw-schema-reads`/`check:audit-hardcoded-type-dispatch`/`check:audit-reactive-render-reads`/`check:audit-renderer-browser-io` 均 0（实跑留痕）。
- **oversized 登记债口径**：两包 ≥500 行非测试源 7 件全部 WARN 档（评估不拦 exit）——flow designer-page-body.tsx 612、designer-xyflow-canvas.tsx 567、designer-inspector.tsx 558、designer-action-provider.ts 553、designer-canvas.tsx 552、designer-manifest.ts 503 + page page-designer-page.tsx 608。已登记债不重复立案，但 7 件一律纳入结构走读。live 主树 `check:oversized-code-files` exit 1 系并行会话在途 `flux-runtime/runtime-factory.ts:701`（非本批、隔离 HEAD 口径下不存在）。
- **包特性与审计重心**：①flow = XYFlow 画布渲染族（designer-canvas/xyflow-canvas 双画布、inspector、action-provider、tree-session/designer-tree-mode 树模式、manifest）——重库 @xyflow/react 的懒加载边界（c21e2dea9 收口清单未含 xyflow，静态依赖属设计器工具链、核验定性）；tree-session 三处 async 命中与 IS-1（plan 544）视口保持修复面交界；②page = 页面设计器面板族（page-designer-page、canvas-bridge 桥接层、inspector-panel、actions-model/actions-editor 动作模型、template-gallery、expression-validation）——canvas-bridge 双向命令通道的 void/catch 面与 perf 命中 3 处定性；③两包均消费 designer-core（flow-designer-core/page-designer-core，WA-12 在途批对象）——消费侧发现显式引用 WA-12 不越界。
- **交界防重复**：①交互审计线（IS-1 plan 544 / IS-4 plan 547、plan 557 taskflow UI 质量、a001e1f6e B/P2、plan 558 designer 家族检查）已从交互透镜覆盖本两包（ledger IS-\* 行），本批透镜=九信号临时方案与坏味道，不重复立案但可作考古线索；②cq-2（5a0dcc401 shared primitives：pointer/clone/genId/host-action provider factory/debounce hooks）与 cq-6（2c94d9d7f type-safety seams/debug residue/route table）收敛点零复发核验；③b8ef4a555（P4.5 杂项清理：zustand 死 peerDep/杂散事件删除）为本包已知清理史，考古直接引用；④WA-12（designer cores，并行会话在途）发现不越界——core 侧问题登记转发。
- **保护区与授权条款**：①公共导出面 = **批内零变更**：flow `src/index.tsx`（.tsx 实测）+ page `src/index.ts`（确需增删 → CX-n/显式注记待人工确认）。②Renderer definition fields = plan-first——本 plan 即载体。③样式契约 = plan-first（owner doc `docs/architecture/styling-system.md`；designer 件 self-styled 合法）。
- **已收敛模式三档**：live 可证档——cq-2/cq-6 收敛点零复发核验；历史教训档——`dataPath` 双词汇（不涉则记不适用）、strip errors/ajax（不涉则记不适用）；WA-1..12 已立案发现（CX-1..15 覆盖面）不重复立案（消费侧新面显式引用）。
- **五门禁基线**：WA-10 收口（b3fb1dbfe）隔离验证全绿。

## Goals

- `docs/audits/workaround-code-smell/wa-13a/report.md`：逐条发现（prompt §6 单条 12 字段）+ 汇总五项 + 覆盖声明节（三口径逐字落字）。
- findings 全量登记 ledger（`WA-flowr-001`/`WA-pager-001` 起各自顺延，三位零填充），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修；flow `index.tsx`/page `index.ts` 零公共导出变更。
- 台账 modules 两行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发）。

## Non-Goals

- 结构性重构的批内实施；两包 `index.ts` 公共导出面的任何增删。
- designer-core 包（flow-designer-core/page-designer-core）的任何修改——属 WA-12 范围（并行在途），登记转发不越权修。
- 与其他轨道重复立案；已登记 pre-existing 门禁红的重复立案；wa-1..12 已立案发现重复立案。
- playground 消费侧。

## Scope

### In Scope

- `packages/flow-designer-renderers/src/`、`packages/page-designer-renderers/src/` 全部非测试源码的取证（prompt §5 全量协议）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试。
- `docs/audits/workaround-code-smell/wa-13a/report.md` + ledger 登记/翻转 + roadmap WA-13a 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非本批包/模块的任何修改（含并行会话在途文件与 plan 571/572 在途稿——登记转发不越权修）。
- 结构性重构实施；playground 消费侧。

## Failure Paths

不适用（审计批无新增运行时错误处理面）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。P0/P1 修复先红后绿（Proof 与 Fix 合并表达，沿 561..570 先例）；行为保持型批内修特征化测试先钉后改；修复后跑两包 `pnpm --filter @nop-chaos/flow-designer-renderers|@nop-chaos/page-designer-renderers typecheck/build/lint/test`；批收口跑全量五门禁（隔离 worktree 方法）+ **ai 哨兵套件**（`@nop-chaos/flux-renderers-ai` filter test，沿 WA-8 content-009 教训条款——共享单例/模块求值序回归的跨包哨兵）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: completed
Targets: `packages/flow-designer-renderers/src/`、`packages/page-designer-renderers/src/`（读）、`docs/audits/workaround-code-smell/wa-13a/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 协议全走——37 处候选全部复现逐个定性 + 门禁交叉（async 15 行原始/去重 14 处：11 豁免+2 立案[pager-002/003]+1 watch；perf 3→0 立案 1 watch 微注记；其余 4 门禁 0 实跑）+ 重复块双探针（逐字版 132 窗 0 命中——两包零逐字重复/归一版 460 窗 1 自重叠假阳性；重复组 7 组走读捕获）+ 范围结构走读（**84/84 全文覆盖**[另补读 1 件 __tests__/canvas-bridge-test-support.tsx 注记在案]；≥500 行 7 件全读；三口径逐文件零差落字）+ 三档处置（cq-2/cq-6 零复发/xyflow 静态依赖定性=设计内 renderer 级懒加载/dataPath 不适用）+ 误报排除 22 项+9 watch 微注记。
- [x] Proof：每个立案候选 git 考古（症状性 message 抽检 30=0；重点锚全核验——WA-flowr-001 的 plan-547 修复落死分支归因为考古新证）。
- [x] Decision：严重度 + ROI + 共性裁定——**14 条立案（P2×3+P3×11，零 P0/P1）**；去向=fixed 12+successor-required 1（pager-001→CX-16 新拟制：useContextMenuShell 跨包共享）+watch-only 1；**转发 WA-12=0**（14 条位点全在两包自身，仅 pager-004 helper 归属评估注记）。
- [x] Proof：`wa-13a/report.md` 落盘（369 行），findings 全量登记 ledger（14 行）；reconcile=133 findings（found 87+verified 46）/未处置 12（待 Phase 2 翻转）/violations 0（执行期修两处非法去向字串[fixed/P1 起评误入去向列]）。

Exit Criteria:

- [x] `wa-13a/report.md` 落盘且模板字段/汇总五项/覆盖声明齐备。
- [x] ledger 与报告一一对应零遗漏（两 ID 命名空间零撞号，14/14）。
- [x] 每个立案有 git 考古读数；误报排除 22 项有对照理由+9 条 watch 微注记。
- [x] 共性裁定落字（CX-16 插入 roadmap；转发 WA-12=0 已声明）。

### Phase 2 - 批内自动修复（先红后绿）

Status: completed
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：逐项修复——本批零 P0/P1；12 项批内修全部落地：flowr-001 主 switch 双死分支删除（树路径由 executeTreeCommand 拦截考古闭环+graph 模块承载 duplicateNode 实证，活体路径注记落字，'Nothing to delete' 裸英文随死分支消亡）+flowr-002 不可达 persistViewport action case 删除+发布决策注记+flowr-003 提取 designer-resolved-prop.ts（×4）+flowr-004 viewportsEqual 参数化统一（epsilon 缺省 0 走严格 ===，交互侧传 VIEWPORT*EPSILON——零行为变更）+flowr-005 inspector commitDraft 合一（withStateReset 参数吸收两路径差）+flowr-006 runTreeRelayout(requestId) useCallback 化+flowr-007 runToolbarAction 合一（back 不带 then 链以参数表达）+flowr-009 DINGFLOW_FALLBACK*\* 常量单源（'CC' 哨兵契约两侧同源）+flowr-010 五串 t() 化（'playground example' 措辞残留随迁清除+flux-i18n 补 5 键×2 locale+测试钉更新[adapter.test 钉改 zh 系 locale 实况]+pager-002 template-gallery 三链补 .catch（红恰 3 failed→13/13）+pager-003 json 字段 parse 先于清 draft+错误面镜像 raw 编辑器（红恰 1 failed→9/9）+pager-004 getSchemaType 单源（closure M1 补齐后 13 位点/6 文件，双跳断言归一）；flow `index.tsx`/page `index.ts` 零公共导出变更（git diff --exit-code）。
- [x] Proof：两包 filter 四门禁——typecheck/build/lint/test 全绿（flow 296/296[基线保持]/page 161/161；lint 0 error×2 包[react-hooks/exhaustive-deps 3 处以 useCallback 稳定化收敛+未用导入清理]）；ai 哨兵条款归隔离门禁全量 test 覆盖；类别清扫落报告（死分支/裸英文/双跳断言 grep=0 判据）。

Exit Criteria:

- [x] 红→绿证据在案（pager-002 恰 3 failed/pager-003 恰 1 failed 经 stash 对照留痕；其余行为保持提取/死代码删除同套同绿）；本体删除验证落字（死分支 grep=0/双跳断言非测试 src=0/裸英文串=0）。
- [x] filter 级四门禁通过；批 closure 前台账无残留 `found` 未处置的 P0/P1（reconcile 未处置=0/fixed 12/violations 0）；`git diff --exit-code` 两入口通过。

### Phase 3 - 回写与收口

Status: completed
Targets: roadmap、ledger、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 modules 两行翻转 `audited`；reconcile 通过。——audited 24 / 133 findings（fixed 0+verified 58）/ 未处置 0 / violations 0。
- [x] Proof：draft review 通过时 roadmap WA-13a 回写 `todo → planned` 并填 plan 路径；`planned → done` 属 Closure Gates 收口动作。——两步均已落。
- [x] Decision：批内修复行 `fixed → verified` 归属——closure 复检通过当场翻转（12 行于本收口 commit 翻转；复检证据=closure audit agent_08cc77dc 十二项修复逐一开档实证含 flowr-007 三态行为对照等价）。
- [x] Proof：dev log 记录发现/修复/门禁计数。

Exit Criteria:

- [x] reconcile exit 0 且 wa-13a 报告存在。
- [x] roadmap WA-13a 行 `todo → planned` 已落并填 plan 路径（收口时再落 `planned → done`）。
- [x] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_a2925feb-7918-4bbf-8aa6-7a7d72cb183d，review-only）
- Verdict: `revised`（零 Blocker、1 Major、2 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** 交互批编号误标两处（plan 544 实为 IS-1 非 IS-4；IS-4=plan 547——与 baseline 包特性①的正确标注内部矛盾）→ L21/L75 分别改"IS-1 plan 544 / IS-4 plan 547"与"d322c2195（IS-1/544）"；**m1** Phase 3 Item Types 漏 Decision（清单含 fixed→verified 归属裁定项）→ 改 `Proof | Decision` 沿 570 先例；**m2** Phase 2 exit 命令 flow index 路径残留 .ts（live 为 .tsx，字面执行守卫将空转）→ 改 .tsx 并删校正提示。审查员对其余清单项全部 live 复现通过（inventory 两包计数精确复算、37 候选三口径吻合、两包零在途且三口径逐文件零差、async 14 行逐 file:line 吻合、perf 3、四门禁 0、typeBypass 按 inventory 生成器规则复算 flow 0/page 17、oversized 7 件数字逐一吻合且 live exit 1 归因属实、index 扩展名、六考古锚存在且语义吻合[含 c21e2dea9 清单不含 xyflow 旁证]、模板合规与 570 条款对齐、ai 哨兵可执行、WA-flowr-/WA-pager- 与既有 22 前缀零撞号且 reconcile regex 兼容、WA-12 交界四处显式）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（本批零 P0/P1；12 项批内修全落地，pager-001 归 CX-16 显式去向）
- [x] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向）——successor-required 1+watch-only 1 零静默
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（pager-002/003 红→绿证据 + filter 四门禁 flow 296/296、page 161/161 + 隔离全量 test 78 tasks）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-13a 回写 + dev log + 报告）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 issues（agent_08cc77dc，0B/1M/3m：M1=pager-004 记录 11 位点/7 文件与实况 9 位点/5 文件漂移[inspector-field-model 2 位点漏接线]+m1 dev log 两句收口前置表述+m2 批集合 31 vs 实测 33+m3 判据字面自引）→修正后收口：M1 补接线至 13 位点/6 文件+三处记录如实改写、m3 注释去自引字面（grep=0 达成）、m1/m2 随本 Evidence 节与 33 文件口径落盘闭合；delta 复核见 Closure Audit Evidence
- [x] `pnpm typecheck`（隔离 worktree `../wa13a-verify` HEAD `b3fb1dbfe`+本批 34 文件 diff[含 closure M1 终态]，exit 0）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0）
- [x] `pnpm test`（同上，exit 0——78 tasks 含 ai 哨兵）
- [x] `pnpm check`（同上，exit 0——首跑 check-knip-baseline 逮 DINGFLOW_FALLBACK_DESC/LABEL_APPROVAL 未消费导出，收私后复跑通过）

## Deferred But Adjudicated

- WA-flowr-004：两份 viewportsEqual 语义真实有别（持久化去重须精确、xyflow float 回声须容差）——不做强并单一语义，参数化统一（epsilon=0 严格/ε 容差）零行为变更，语义注记双向落字。
- WA-flowr-002：persistViewport 作为宿主可调用动作的发布决策（manifest+listMethods 声明）留人工裁量，决策注记落码侧。
- WA-pager-004 helper 归属（page 包内 vs page-designer-core）：留 WA-12 评估注记，本批包内落地。

## Non-Blocking Follow-ups

- CX-16（WA-pager-001 设计器上下文菜单壳跨包共享）已插入 roadmap，归 CX plan 收口（涉跨包共享面新增，执行前人工确认归属）。
- watch-only 1 条（WA-flowr-008 xyflow onInit 300ms 调谐延迟→就绪信号方向）随下次触碰。
- flowr-010 考古线索：designer-command-adapter.test.ts 的错误串钉现按 zh locale 实况锚定，i18n 测试域语言约定如后续统一需同步。

## Closure

Status Note: 2026-10-12 收口。两包（flow-designer-renderers 59 文件/10,315 行 + page-designer-renderers 25 文件/3,910 行，84/84 全文覆盖，零在途三口径一致）prompt §5 全量取证完成，14 findings 全量登记台账且去向四态零静默（verified 12 / CX-16 去向 1 / watch-only 1；转发 WA-12=0）；批内修 12 项（死分支手术×2+提取合一×6+契约单源×2+观测补齐红→绿×2）；两包 index 零公共导出变更；隔离五门禁 exit 0（首跑 knip 逮 2 个未消费导出收私后复跑通过；closure M1 终态 34 文件同步后 R2 全链复跑 exit 0，运行凭证 \_tmp/wa13a-gates-1..5.log）。roadmap WA-13a → done。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_08cc77dc-b3c3-4752-be22-91b52438025c，review-only）
- Evidence: closure audit R1 `issues`（0 Blocker / 1 Major / 3 Minor——M1=pager-004 记录 11 位点/7 文件与实况 9 位点/5 文件漂移[inspector-field-model.ts 2 位点漏接线]；m1=dev log 两句收口前置表述[modules audited/Evidence 节引用]；m2=批集合计数 31 vs 实测 33；m3=flowr-010 判据字面被修复注释自引 1 处）→ 修正：M1 补接线至 13 位点/6 文件+plan/ledger 两处记录如实改写+报告两处 closure postscript（终态口径归 ledger 行）+page 包复绿 161/161；m3 注释去自引字面后 grep=0 达成；m1 随本 Evidence 节+modules 翻转+Phase 3 勾选闭合；m2 按实测 34 文件口径落字本节与收口 commit（R2 时点曾为 33 口径，R3 复核修至 34；R2 delta 复核 0B/2M/0m 逮出 evidence 集合漂移[33=不含 M1 前置态]与报告未改写——终态 34 文件同步 worktree 后五门禁复跑全绿[78/78+check exit 0]闭合）。审计员独立实证：十二项修复逐一开档核对、flowr-007 三态行为对照等价（含 back 声明 then 亦被忽略的原行为保持）、flowr-001 考古注记与活体路径核对、reconcile 复跑 133=75+58/未处置 0/violations 0、两包 filter typecheck/lint 实跑 exit 0、批集合 33 文件[R1 时点；R2 后终态 34]与并行在途 14 文件零交叠、两包 index 公共导出 git diff 零变更、CX-16 三方一致、双探针 \_tmp 保留属可复现证据不违用后即弃。
