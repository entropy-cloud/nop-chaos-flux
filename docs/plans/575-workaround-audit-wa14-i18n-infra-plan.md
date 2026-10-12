# 575 workaround-audit WA-14 i18n 与外围基建审计批（flux-i18n + nop-debugger + flux-bundle + tailwind-preset + theme-tokens）

> Plan Status: completed
> Last Reviewed: 2026-10-12
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-14 工作项，Phase Status 第 16 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`；先例：`docs/plans/572/571/570`
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`；`docs/audits/workaround-code-smell/wa-12/report.md`（knip 135 条定性先例+误报排除清单互通）；`docs/context/ai-autonomy-policy.md`

## Purpose

对 i18n 与外围基建五包（flux-i18n、nop-debugger、flux-bundle、tailwind-preset、theme-tokens）执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划。

## Current Baseline

- **对象清单**（WA-0 枚举器输出，五模块）：flux-i18n 6 文件/4,254 行 + nop-debugger 30/7,429 + flux-bundle 3/149 + tailwind-preset 1/151 + theme-tokens 1/40 = **41 文件/12,023 行**（roadmap 行「约 11.5k」系拟制估算，以 inventory 为准）。
- **在途漂移口径（拟制时实测 2026-10-12）**：五包 `git status` **零在途**。拟制时 HEAD = `7ca9db722`（WA-12 收口提交，隔离五门禁全绿为生效基线）；执行时以当时 HEAD 快照注记。
- **字面标记**：literalEn/literalZh **0**（wa-10 起连续第六个双零批组[含 wa-10；wa-8/9 各有 live 非零字面破档]；inventory baseline，批内复核）。
- **模式候选基线**（inventory per-module，执行时以枚举器复测为准）：typeBypass **0**（历批唯一零 typeBypass 批组）+ setTimeoutCandidates **2** + domRaid **5**（均 nop-debugger）= **7 处候选**逐个人工定性。
- **门禁交叉基线**（拟制时 live 实测，执行时复跑为准）：`check:audit-async-failure-paths` **18 行命中**（grep 五包过滤实测全部位于 nop-debugger：controller-component-inspector ×3、controller-helpers ×7+、余散布——逐个去重定性）；`check:audit-performance-suspects` **1**（controller-component-inspector.ts:272）；reactive-render-reads/runtime-raw-schema-reads/hardcoded-type-dispatch/renderer-browser-io 均 **0**（实跑留痕）。
- **oversized 登记债口径**：五包 ≥500 行非测试源 **5 件**——nop-debugger types.ts 505 / panel.tsx 527 / panel/styles-css.ts 550 + flux-i18n locales en-US.ts 2,039 / zh-CN.ts 2,038（后两件系**已登记豁免债**：纯数据声明体，`check:i18n-keys` 门禁解析依赖该两文件路径，Plan 2026-08-07-1053-1 裁定不拆——不重复立案，但纳入结构走读；gate 读数各 +1 系无尾换行差，且 gate 另列 `store.test.ts` 系测试文件为「非测试源」限定词正确排除）；≥500 行源文件一律结构走读。
- **包特性与审计重心**：①**nop-debugger 为本批唯一实质审计面**（7.4k 行 devtool：controller-inspector/helpers 双热点+panel/styles-css.ts 内联 CSS 字符串[样式契约交界]）；②flux-i18n = **全仓 i18n 单例宿主**（initFluxI18n/resetFluxI18n 模块求值面——WA-content-009 教训的根因所在地，任何触碰求值面的修复触发双哨兵条款并单列定性；locales 两件为纯数据不立案面）；③flux-bundle/tailwind-preset/theme-tokens 三件为配置/打包微包（合计 340 行，走读+信号扫描档）。
- **knip 登记债口径**（draft review M1 修订）：`scripts/baselines/knip-baseline.json` 五包在案 **23 条**（nop-debugger 19[exports 6 + types 13] + flux-bundle 4[types 1 + devDependencies 3]；flux-i18n/tailwind-preset/theme-tokens 0）——①登记面作为 §5 取证证据输入逐档定性（I 类转正/W2 出口核对/收私候选/测试基建豁免）；②check 门禁 knip 相遇以批前基线为准，批内修复致符号路径变化沿 plan 571/572 Current Baseline「knip 登记债口径」条款先例**以修代重立基线**或收私并披露（571/573 两批 check 首跑即红先例在案，nop-debugger 持 19 条碰撞概率实在）；③执行时以基线 live 复测落字。
- **交界防重复**：①WA-1..12 已立案发现与 CX-1..18 覆盖面不重复立案（WA-content-009 i18n 单例教训为考古锚——本批在根因包侧复核其出口纪律）；②WA-12 批 knip dependencies 1 条转发（playground page-designer-core 依赖）不属本批范围（playground 侧归 WA-15a）。
- **保护区与授权条款**：①五包 `src/index.ts[x]` 公共导出 = **批内零变更**（flux-i18n initFluxI18n/t 契约为全仓消费面；nop-debugger/flux-bundle 入口为 index.tsx——diff 守卫按各包实际扩展名执行）。②Renderer definition fields 不涉（五包无 renderer）。③样式契约：nop-debugger styles-css.ts 为 devtool 自有样式（self-styled 合法域），变更 plan-first（本 plan 即载体）。
- **跨包测试隔离条款（WA-7/WA-content-009 教训固化）**：批内任何提取/重写**不得把带副作用的调用提升进模块顶层求值路径**；flux-i18n 单例语义为 content-009 回归根因——凡修复触及 flux-i18n 求值面或其消费链，除涉包 filter 四门禁外加跑 **flux-renderers-ai 全量 + flux-react 全量**（双哨兵——ai-test-support 模块顶层 reset+init 为 content-009 变体面、flux-react 为 t() 渲染宿主；flux-runtime validation formatter 读侧由收口全量 test 覆盖）。
- **五门禁基线**：拟制时点 = WA-12 收口（7ca9db722）隔离全绿。
- **工作树状态（拟制时点实测）**：主树并行会话在途变更（runtime/core/data/form/layout 14 文件）与五包零交集；全量门禁沿用隔离 worktree 方法（HEAD+本批 diff）。

## Goals

- `docs/audits/workaround-code-smell/wa-14/report.md`：逐条发现（prompt §6 单条 12 字段）+ 汇总五项 + 覆盖声明节（41 文件分档落字）。
- findings 全量登记 ledger（五前缀 `WA-i18n-001`/`WA-debugger-001`/`WA-bundle-001`/`WA-tailwind-001`/`WA-tokens-001` 起，与既有前缀零撞号——以台账 live 为准），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修；五包 `index.ts[x]` 零公共导出变更。
- 台账 modules 五行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发）。

## Non-Goals

- 结构性重构的批内实施；五包 `index.ts` 公共导出面的任何增删。
- flux-i18n locales 数据文件的内容治理（键值翻译质量归 i18n 键门禁域，非临时方案维度）。
- 与其他轨道重复立案；已登记 pre-existing 门禁红的重复立案（locales oversized 豁免债）；wa-1..12 已立案发现重复立案。
- playground 消费侧（WA-15a/b/c 批）。

## Scope

### In Scope

- 五包 `src/` 全部非测试源码的取证（prompt §5 全量协议）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试。
- `docs/audits/workaround-code-smell/wa-14/report.md` + ledger 登记/翻转 + roadmap WA-14 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非本批包/模块的任何修改（含并行会话在途文件——登记转发不越权修）。
- 结构性重构实施；playground 消费侧。

## Failure Paths

不适用（审计批无新增运行时错误处理面）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。P0/P1 修复先红后绿；行为保持型批内修特征化测试先钉后改；修复后跑涉包 `pnpm --filter <pkg> typecheck/build/lint/test`；触及 flux-i18n 求值面或其消费链的修复加跑双哨兵（ai 全量+flux-react 全量）；批收口跑全量五门禁（隔离 worktree 方法）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: completed
Targets: 五包 `src/`（读）、`docs/audits/workaround-code-smell/wa-14/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 协议全走（独立取证 agent 产出报告）——候选 26 处逐个定性（async 17+1 行口径分解+perf 1+setTimeout 2+domRaid 5；typeBypass 0 历批唯一复核成立；四门禁 0 实跑留痕；window.\_\_ 三键契约通道核对）——16 豁免/排除+1 随家族立案+余立案；重复块双探针（逐字 52 组[跨文件 18]+归一 197 组，坐实 6 组立案级）+ 范围结构走读（41/41 全文覆盖；≥500 行 5 件全读，locales 豁免债两件结构走读+键集程序化验证 1,810/1,810 零差豁免理由仍成立）+ 三档处置 + knip 五包 23 条逐档定性 + 误报排除 19 项+watch 微注记 8 条。
- [x] Proof：每个立案候选 git 考古（12 commit；症状性 message 抽检 100 条[五包各 25]——症状性 6 条全部位于 2026-03 前纪律时代，近期 0）。
- [x] Decision：严重度 + ROI + 共性裁定——**12 条立案（P2×3+P3×9，零 P0/P1）**；去向=fixed 12；**本批无新增 CX-n**（共性门槛不触发）；转发 WA-15a 注记 1 条（ai-hitl-demo init 时序活体）。
- [x] Proof：`wa-14/report.md` 落盘，findings 全量登记 ledger（12 行）；reconcile 通过（193=found 86+fixed 12+verified 95/未处置 0/violations 0）。

Exit Criteria:

- [x] `wa-14/report.md` 落盘且模板字段/汇总五项/覆盖声明节齐备（41 文件分档落字，行数三口径零差）。
- [x] ledger 与报告一一对应零遗漏（零撞号——五前缀含 WA-bundle 首条）。
- [x] 每个立案有 git 考古读数；误报排除逐项有对照理由（19 项+knip 23 条逐档）。
- [x] 共性裁定落字（显式记"本批无新增 CX-n"+转发 WA-15a 注记）。

### Phase 2 - 批内自动修复（先红后绿）

Status: completed
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [ ] Fix：逐项修复——P0/P1 先红后绿（判别性测试点名判别机制）；行为保持型提取特征化测试先钉后改；临时方案本体删除验证；类别清扫。
- [x] Proof：涉包 filter 四门禁全绿；触及 flux-i18n 求值面的修复加跑双哨兵；五包 `index.ts[x]` 零公共导出变更（`git diff --exit-code`，nop-debugger/flux-bundle 按 .tsx 路径）。

Exit Criteria:

- [x] 红→绿证据在案（i18n-001 判别测试红读数在报告修复记录表）；本体删除验证逐项落字。
- [x] filter 级四门禁通过；台账无残留 `found` 未处置的 P0/P1（零 P0/P1 立案）；五包 `index.ts[x]` `git diff --exit-code` 通过。

### Phase 3 - 回写与收口

Status: completed
Targets: roadmap、ledger、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 modules 五行翻转 `audited`；reconcile 通过（audited 41/uncovered 8）。
- [x] Proof：draft review 通过时 roadmap WA-14 回写 `todo → planned` 并填 plan 路径；`planned → done` 属 Closure Gates 收口动作。
- [x] Decision：批内修复行 `fixed → verified` 归属——closure 复检通过当场翻转（12 行于本收口 commit 翻转；复检证据=closure audit agent_36669faf 十二项修复逐一开档实证+动态判别 3/3 恰红→字节级恢复绿）。
- [x] Proof：dev log 记录发现/修复/门禁计数。

Exit Criteria:

- [x] reconcile exit 0 且 wa-14 报告存在。
- [x] roadmap WA-14 行 `todo → planned` 已落并填 plan 路径。
- [x] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_e5330445-d08e-4ad7-9014-abdbd32fc018，review-only）
- Verdict: `revised`（零 Blocker、1 Major、4 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** knip 登记债条款缺失+悬空「⑤」引用（五包 23 条[nop-debugger 19=exports 6+types 13、flux-bundle 4=types 1+devDeps 3]未落字；571/573 check 首跑即红先例使碰撞概率实在）→ 增设独立「knip 登记债口径」bullet（量级+三操作子项承接 572 条款、具名引用弃序号）；**m1** 五包入口扩展名失实（nop-debugger/flux-bundle 为 index.tsx，字面 diff 守卫将空转）→ 三处改 `index.ts[x]`+按实际扩展名执行注记；**m2** oversized gate +1 无尾换行口径差+store.test.ts 测试文件排除说明补注；**m3** 双零批序数措辞勘误（wa-10 起连续第六个[含 wa-10]）；**m4** 双哨兵条款补 flux-runtime validation formatter 读侧由收口全量 test 覆盖说明。审查员 17 项清单全部 live 复现（对象清单 41/12,023 精确、五包零在途、async 18 行逐 file:line、perf 1、四门禁 0、typeBypass 0 历批唯一、setTimeout 2+domRaid 5、oversized 5 件+豁免出处可考、前缀零撞号含 reconcile regex 兼容、knip 23 条、HEAD 锚、消费面 304 文件/~1,900 处 t()、模板与 572 逐节一致）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（零 P0/P1；批内修 12 项红→绿/行为保持收口）
- [x] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向）
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（i18n-001 红→绿 + 五项行为保持基线同绿 + 六项门禁族 + 双哨兵 ai 850/flux-react 550）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-14 回写 + dev log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 **approved**（agent_36669faf，0B/0M/3m 随收口修正：m1=plan Phase 2 勾选框漂移补勾；m2=debugger-009 计数口径统一「独立声明块 2→1」；m3=debugger-001 判据限定词注记[无需改代码]），详见 Closure Audit Evidence
- [x] `pnpm typecheck`（隔离 worktree HEAD+本批 diff，exit 0——首跑失败系新鲜 worktree 依赖 dist 未构建次序，build 前置后重跑过，已披露）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0）
- [x] `pnpm test`（同上，exit 0）
- [x] `pnpm check`（同上，exit 0——零新增未登记红；knip 删除条目转 stale 无害）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- 转发 WA-15a 注记 1 条（playground ai-hitl-demo.tsx init 时序活体，WA-i18n-001 下游症状核验）——归 WA-15a 批必读线索。
- debugger-001 onTap 支路无测试判别面（审计员动态判别附注）——非缺陷，后续触碰拖拽面时可顺带补钉。

## Closure

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_36669faf-e2e1-4be1-9622-f361735622bf，review-only）
- Rounds: R1 `approved`（0 Blocker / 0 Major / 3 Minor 随收口修正）
- m1 plan Phase 2 两勾选框漂移补勾；m2 debugger-009 计数口径统一（report+ledger「独立声明块 2→1[选择器写点 3→2]」）；m3 debugger-001 判据「拖拽面收敛 1 处」限定词经核已准确、无需改码（hooks.ts:144 原语 + :258 场外 resizer 非本条范围）。
- 审计员独立实证：12 项修复逐一开档（i18n-001 warn 无环境门控+幂等语义未动核验/debugger-002 引用化方向相反效果等同判定/persistPanelOpen grep=1/五包 index CLEAN/console-baseline 门禁语义核对[warn 不入扫] / knip 门禁语义核对[no new hits+stale 可收缩]/oversized locales 2044/2043 [exempt] 数学吻合）；reconcile 复跑 193=86+12+95（翻转后 86+0+107 数学成立）/未处置 0/violations 0；两树 26 文件逐字节一致；watch 8 条锚点未被顺手修掉（panel.tsx:263 void events、store.ts 未触碰）；转发 WA-15a 注记在位。
- 动态判别 3/3（隔离树污染→恰红→字节级恢复→绿）：①i18n-001 warn 块删除→flux-i18n 恰 1 failed（判别测试精确指向）→32/32；②debugger-008 空值守卫删 null 臂→恰 1 failed→135/135；③debugger-001 docked 盒换算短路→恰 1 failed→135/135。附注：onTap 支路删除仍绿（tap 由 React onClick 承载）——无判别面非缺陷，记 Non-Blocking Follow-ups。
- 隔离五门禁（HEAD 7ca9db722 + 本批 diff）终态日志：`_tmp/wa14-gates-1..5.log`（typecheck/build/lint 42/42、test 78/78+ai 850/850+flux-react 550/550、check 22 子检查链 designer-conformance passed 收尾）。
