# 578 workaround-audit WA-15c playground 审计批三（component-lab 组件实验场）

> Plan Status: active
> Last Reviewed: 2026-10-12
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-15c 工作项，Phase Status 对应行）+ `docs/skills/workaround-code-smell-audit-prompt.md`；先例：`docs/plans/577/576/575`
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`；`docs/audits/workaround-code-smell/wa-15b/report.md`（CX-19/CX-20 扩围在案）；`docs/context/ai-autonomy-policy.md`

## Purpose

对 playground `src/component-lab` 域（156 文件/17,614 行组件实验场：lab 注册面 + 149 个 per-component lab 页）执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制或并入既有 CX-19/CX-20 扩围。

## Current Baseline

- **对象清单**（WA-0 枚举器输出，单模块 pg-component-lab）：`apps/playground/src/component-lab` **156 文件/17,614 行**（根级 6 件[component-lab-page 302/multi-scenario-lab-page 122/renderer-lab-registry/schema-lab-page/scope-debug/index] + `renderers/` 子域 150 件=135 个 per-component lab 页+13 个 data-\*-host 宿主件+crud-lab-page-c4c2 辅助件+index）。目录原始口径 161 文件（差 5 个测试文件——枚举器排除；测试自身临时方案形态可立案）。
- **在途漂移口径（拟制时实测 2026-10-12）**：本目录 `git status` **零在途**。拟制时 HEAD = `ab6cc9fa4`（WA-15b 收口提交）。
- **字面标记**：literalEn **0**、literalZh **0**（第八个双零批组[wa-15b literalZh 3 说明性注释破档后重续]；inventory baseline，批内复核）。
- **模式候选基线**（inventory per-module，执行时以枚举器复测为准）：typeBypass **102**（**历批全部模块最高**——分布=data-\*-host ×13 件 76 处[75% 主体]+renderers lab 页 21 处+crud-lab-page-c4c2 5 处；cast 家族主体在 data 演示宿主件，逐个人工定性为重心：裁定「renderer/core 契约缺失症状[→CX-20 扩围，与 WA-pages-008 93 处同型]」vs「本地字面量的动态边界豁免」vs「可批内收敛的局部形态」）+ setTimeout **3** + silentCatch/keyRemount/domRaid/pixelNudge/testEnvBranch 全 0。
- **门禁交叉基线**（拟制时 live 实测，执行时复跑为准）：`check:audit-async-failure-paths` 过滤 **3 行**（button-lab-page.tsx:11/:18/:25 单文件）；`check:audit-performance-suspects`/`reactive-render-reads`/`runtime-raw-schema-reads`/`hardcoded-type-dispatch`/`renderer-browser-io` 均 **0**（实跑留痕）。
- **oversized 登记债口径**：非测试 ≥500 行 **1 件**（renderers/crud-lab-page.tsx 602）；≥500 行源文件全读。
- **包特性与审计重心**：①149 个 lab 页为**同构骨架疑云重灾区**——每页=组件 demo schema + env stub + 渲染壳，页间「刻意相似模板」vs「可提取共同件」的三问句裁定为本批核心（判例：wa-15b ④三页包装壳刻意模板豁免 + wa-15a 路由目录声明表纯数据豁免 vs WA-pages-001 demo-env 工厂立案）；②typeBypass 102 的家族归属裁定（CX-20 SchemaObject 索引签名同根因？）；③renderer-lab-registry 声明式注册面（134 条目=ALL_SHARED_RENDERER_ROUTES 134 路由，route-matrix.test 双向覆盖守卫）与 lab 页 boilerplate 的收敛潜力；④scope-debug.ts 实验工具的契约面。
- **承接转发核验**：wa-15a/15b 报告 watch 微注记与转发条款中无 component-lab 位点（notifyWithToast 既有消费者 multi-scenario-lab-page 已在案）——Phase 1 复核落字即可。
- **交界防重复**：①wa-11 已立案面（ai 渲染器本体——ai-\*-lab-page 14 页消费面接线属本批、renderer 本体非）不重复立案；②wa-15a/15b 已审面不重复立案；③CX-15（test-support 骨架）/CX-19（replica kit+demo-env 工厂——若 lab 页 env stub 与 demo-env 同型，Phase 1 裁定并入扩围而非新立案）/CX-20（cast 家族——同上裁定扩围或豁免）覆盖面不重复立案；④plan 526/530/549 等已收口结论直接引用。
- **保护区与授权条款**：①`apps/playground/package.json` 依赖声明**零变更**（15a/15b 同款条款）。②`component-lab/index.ts` 公共导出面 = 批内零变更（消费面已核验：App.tsx:27 路由消费+route-matrix.test 直引 registry）。③Renderer definition fields = plan-first。④样式契约 = plan-first。
- **跨包测试隔离条款（WA-7/14 教训固化）**：批内任何提取/重写不得把带副作用的调用提升进模块顶层求值路径；凡修复触及模块求值面，除 playground filter 四门禁外加跑 **flux-renderers-ai 全量 + flux-react 全量**（双哨兵）。
- **五门禁基线**：拟制时点 = WA-15b 收口（ab6cc9fa4）隔离全绿（日志 `_tmp/wa15b-gates-1..5[bc].log`）。
- **工作树状态（拟制时点实测）**：主树并行会话在途变更（packages/flux-runtime、flux-core、flux-renderers-data/form/layout 14 文件）与 `apps/playground/src/component-lab` 零交集；全量门禁沿用隔离 worktree 方法（HEAD+本批 diff）。

## Goals

- `docs/audits/workaround-code-smell/wa-15c/report.md`：逐条发现（prompt §6 单条 12 字段+归属裁定字段）+ 汇总五项 + 覆盖声明节（156 文件分档落字）。
- findings 全量登记 ledger（`WA-clab-001` 起三位零填充顺延，与既有前缀零撞号——以台账 live 为准），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修。
- 台账 modules 行翻转 `audited`，reconcile 通过（预期 uncovered 归 0）。
- 共性/结构性发现以 CX-n 插入或 CX-19/CX-20 扩围登记（lab 页骨架/cast 家族裁定落字）。

## Non-Goals

- 结构性重构的批内实施；`apps/playground/package.json` 依赖声明的任何增删。
- 与其他轨道重复立案；已登记 pre-existing 门禁红的重复立案；wa-1..15b 已立案发现重复立案；CX-1..20 覆盖面的重复立案（扩围登记除外）。
- 非 component-lab 域修改（含并行会话在途文件——登记转发不越权修）。

## Scope

### In Scope

- `apps/playground/src/component-lab/` 全部非测试源码的取证（prompt §5 全量协议）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试。
- `docs/audits/workaround-code-smell/wa-15c/report.md` + ledger 登记/翻转 + roadmap WA-15c 状态回写 + dev log。
- CX-n 工作项插入或 CX-19/CX-20 扩围登记（如触发共性裁定）。

### Out Of Scope

- 非 component-lab 域修改（含并行会话在途文件——登记转发不越权修）。
- 结构性重构实施；renderer/runtime 包侧契约修复（归 CX-n/successor）。

## Failure Paths

不适用（审计批无新增运行时错误处理面）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。P0/P1 修复先红后绿；行为保持型批内修特征化测试先钉后改；修复后跑 `pnpm --filter @nop-chaos/flux-playground typecheck/build/lint/test`；触及模块求值面的修复加跑 flux-renderers-ai 全量 + flux-react 全量（双哨兵）；批收口跑全量五门禁（隔离 worktree 方法）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: done（2026-10-12：独立取证 agent 产出报告落盘 5 findings[P2×1+P3×4 零 P0/P1]+watch 5 条+误报排除 14 项；156/156 覆盖三口径零差[17,614×3]；候选定性 typeBypass 102[4 立案+21 窗口探针豁免+余随 001 双峰归并]/setTimeout 3 全豁免/async 3 全豁免/其余 0；探针双版[逐字 97 对/归一 36,971 对]+80 处 cast 全目录剥离 tsc 实证；症状 message 抽检 60=0；专项裁定 A-D 落字：data-host 76 处=CX-20 同根因第三波/135 页三问句全豁免[刻意模板 kit-first]/scope-debug 健康/wa-15a/15b 转发零关联）
Targets: `apps/playground/src/component-lab/`（读）、`docs/audits/workaround-code-smell/wa-15c/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 协议全走——候选逐个定性（**typeBypass 102 历批最高逐个定性为重心**：家族归属三分裁定[CX-20 同根因/动态边界豁免/批内可收敛]+setTimeout 3+async 3 行+字面双零复核；其余门禁 0 实跑留痕）+ 重复块探针（双版；**149 lab 页同构骨架的「刻意模板 vs 可提取共同件」三问句裁定为本批核心**）+ 范围结构走读（156/156 覆盖分档落字；crud-lab-page 602 全读；同构页按族抽样精读+族代表全文落字）+ 三档处置 + 误报排除清单（与 wa-7..15b 清单互通）。
- [x] Proof：每个立案候选 git 考古（症状性 message 抽检 ≥20 条）。
- [x] Decision：严重度 + ROI + **归属裁定**（每条 demo 发现：renderer 契约缺失 vs demo 接线偷懒）+ 共性裁定——立案清单分档、去向四态零静默；共性/升级发现以 CX-n 插入或 CX-19/CX-20 扩围登记（零重复立案）。
- [x] Proof：`wa-15c/report.md` 落盘，findings 全量登记 ledger；reconcile 通过。

Exit Criteria:

- [x] `wa-15c/report.md` 落盘且模板字段/汇总五项/覆盖声明节/归属裁定节齐备（156 文件分档落字，行数双口径与 inventory 对账）。
- [x] ledger 与报告一一对应零遗漏（零撞号）。
- [x] 每个立案有 git 考古读数+归属裁定结论；误报排除逐项有对照理由。
- [x] 共性裁定落字（CX-n 插入/扩围或显式记"本批无新增共性"）。

### Phase 2 - 批内自动修复（先红后绿）

Status: done（2026-10-12：3 条位点车全部落地[修复执行派驻 agent agent_6300c932 实施]；002 9 处失败形状契约化[data.message 全保 文案链不动]+003 tree-lab-host 工厂单源[identity 测试 4 用例]+004 清扫包[echo-fetcher Case F ×8/stub 整删 ×2/T 形 ×4]；零 P0/P1→双哨兵不触发[零顶层副作用新增在案]；playground filter 四门禁全绿 typecheck/build/lint exit 0+test 50 文件/471 用例；`git diff --exit-code apps/playground/package.json` 通过；执行期披露一处承重亚位点[dialog:106 loadDict]停手裁定并入 001/CX-20——见 Deferred But Adjudicated）
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：逐项修复——P0/P1 先红后绿（判别性测试点名判别机制）；行为保持型提取特征化测试先钉后改；临时方案本体删除验证；类别清扫；归属裁定为 renderer 侧的不批内修（CX-n/扩围/successor 登记）。
- [x] Proof：playground filter 四门禁全绿；触及模块求值面的修复加跑双哨兵；`package.json` 依赖声明零变更（`git diff --exit-code`）。

Exit Criteria:

- [x] 红→绿证据在案；本体删除验证逐项落字。
- [x] filter 级四门禁通过；台账无残留 `found` 未处置的 P0/P1；`package.json` `git diff --exit-code` 通过。

### Phase 3 - 回写与收口

Status: done（2026-10-12：台账 5 行登记+pg-component-lab 翻转+reconcile 通过[220=94+3+123 **uncovered 0 全库 49 模块 audited 归零**]；roadmap CX-20 第三波扩围；隔离五门禁全链 exit 0[日志 _tmp/wa15c-gates-1..5.log；终态复跑见 Closure]；closure audit R1 approved[agent_edcc7623，0B/0M/0m]后 3 行 fixed→verified+roadmap WA-15c done）
Targets: roadmap、ledger、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 modules 行翻转 `audited`；reconcile 通过。
- [x] Proof：draft review 通过时 roadmap WA-15c 回写 `todo → planned` 并填 plan 路径；`planned → done` 属 Closure Gates 收口动作。
- [x] Decision：批内修复行 `fixed → verified` 归属——closure 复检通过当场翻转。
- [x] Proof：dev log 记录发现/修复/门禁计数。

Exit Criteria:

- [x] reconcile exit 0 且 wa-15c 报告存在。
- [x] roadmap WA-15c 行 `todo → planned` 已落并填 plan 路径。
- [x] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_c3c02d53-68ef-4640-9ffd-054edf054b65，review-only）
- Verdict: `revised`（零 Blocker、1 Major、3 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** typeBypass 102 家族归属 gloss 失实（主体=data-\*-host ×13 件 76 处 75%+lab 页 21+crud 辅助 5，非 149 lab 页）→ 分布改写实并强化 CX-20 假说表述；**m1** 根级/子域计数（根级 6 件+renderers 150=135 页+13 host+crud+index）→ 改写实；**m2** 双零序数「连续」链已断（wa-15b literalZh 3 破档）→ 改「破档后重续」；**m3** registry「56 页消费？」无出处 → 改实测 134 条目+route-matrix 双向守卫。审查员 12 项清单全部 live 实测（inventory 156/17,614、161−5 口径、零在途、HEAD ab6cc9fa4、并行 14 文件零交集、六门禁 3/0×5、oversized 1 件、双零、typeBypass 102/setTimeout 3[全在 dialog-lab-page]、前缀零撞号、index.ts 消费面 App.tsx:27+route-matrix、模板 11 节、交界防重复、roadmap todo 行、双哨兵+零变更条款三重落字）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（批内修红→绿收口；结构性/共性以 CX-n/扩围显式去向）
- [x] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向）
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（批内修项红→绿证据 + filter 四门禁 + 双哨兵如触发）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-15c 回写 + dev log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（隔离 worktree HEAD+本批 diff，exit 0）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0）
- [x] `pnpm test`（同上，exit 0）
- [x] `pnpm check`（同上，exit 0——零新增未登记红）

## Deferred But Adjudicated

- **WA-clab-004① 执行期承重亚位点裁定（2026-10-12）**：dialog-lab-page.tsx:106 `editSubmitProbeLoadDict` 的 `['loadDict']` cast 修复 agent 试探删除后 typecheck TS2322 ×2（:441/:447 使用点 value number vs DictBean.options[].value string 契约冲突）——零 cast 唯一路径是改 mock 数据 1/2→'1'/'2'（dict 选项值类型变更，违反行为保持铁律）。**裁定：保留 cast，位点并入 WA-clab-001/CX-20 第三波承重亚族**（与报告 own 判例 button:121 countDownStorage 同属「mock 数据违反契约类型」——非机械可清扫），已落台账 001 行与 roadmap CX-20 扩围条目。

## Non-Blocking Follow-ups

- （如共性裁定触发 CX-n/扩围，其执行归 CX plan；本节收口时按实际填写。）

## Closure

Status Note: done（2026-10-12 收口提交）

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_edcc7623，review-only）
- Rounds: R1 `approved`（0 Blocker / 0 Major / 0 Minor-defect；1 项收口余项=by-design 待办[勾选框/翻转/回填四件——本收口提交即证落地]）
- 审计员独立实证：三条修复逐一开档（002 九位点 reshape 逐字吻合+data.message 文案 diff 前后不变+错误链契约面实证[flux-core ApiResponse 无 ok 字段/request-runtime :431 status===0/:434 errorPayload=response.data]；003 工厂新鲜态语义[每页模块单例保持]；004 Case F 与判例形一致+dialog:106 停手位点类型面实据[renderer-api.ts:47 DictBean value string vs mock number]）；动态判别 2 组（003 identity 污染实验[工厂 Map 提升模块级恰红 `not.toBe` 断言]→sha256 三重恢复→4/4 绿；002 验收 grep 五组读数逐字复现[双跳 9→1/Partial 5→0/T 4→0/ok:false 仅 c5c1 豁免例/窗口 21 未动]）；越界排查全净（index.ts 零 diff/package.json exit 0/隔离树零 packages 变更）；reconcile 复跑逐字一致（uncovered 0）；隔离五门禁日志复核（50/471）；两树 23 路径逐字节一致+HEAD=ab6cc9fa4。
- 隔离五门禁（HEAD ab6cc9fa4 + 本批 23 路径）终态日志：`_tmp/wa15c-gates-1..5.log`（build/typecheck/lint/test/check 全链 exit 0；docs 收口回填后终态复跑记录见 dev log）。
