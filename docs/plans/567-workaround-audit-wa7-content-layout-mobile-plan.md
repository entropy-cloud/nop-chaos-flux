# 567 workaround-audit WA-7 内容/布局/移动渲染器审计批（content + layout + mobile）

> Plan Status: completed
> Last Reviewed: 2026-10-11
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-7 工作项，Phase Status 第 8 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`（统一方法）；先例：`docs/plans/564/565/566`（保护区条款、在途文件规则、closure 迭代先例）
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`（对象清单来源）；`docs/audits/workaround-code-smell/wa-6/report.md`（前批沉淀：误报排除清单互通）；`docs/context/ai-autonomy-policy.md`

## Purpose

对内容/反馈/媒体（flux-renderers-content）、布局/流程/动作（flux-renderers-layout）、移动原生交互（flux-renderers-mobile）三包执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划。

## Current Baseline

- **对象清单**（WA-0 枚举器输出，三模块）：content 39 文件/5,879 行 + layout 19 文件/4,254 行 + mobile 11 文件/2,156 行 = **69 文件/12,289 行**（roadmap 行"约 11.7k"系拟制时估算/口径不同，以 inventory 为准；HEAD 口径 12,261）。
- **在途漂移口径（拟制时实测）**：layout 2 源文件在途（并行会话 dropdown-button 特性）——`dropdown-button-renderer.tsx` HEAD 182/live 204（+22）、`schemas.ts` HEAD 360/live 366（+6），另有 `dropdown-button-renderer.test.tsx` 在途（非测试源码不入 inventory）；inventory layout 4,254 行系在途编辑在场时盘点之 live 值，HEAD 口径 4,226 行（漂移 −28）。content/mobile 零在途（三口径逐字吻合）。全集 HEAD 口径 **12,261 行**。在途 2 文件取证按 HEAD 快照（`git show HEAD:<path>`）、修复不叠编辑，覆盖声明双口径逐字落字。
- **字面标记**：literalEn/literalZh 均为 0（inventory baseline，批内复核）。
- **模式候选基线**（inventory per-module，仅线索非定案）：typeBypass content 2（`test-support-runtime.tsx:21` + `test-support.ts:34`——inventory 生成器仅排 _.test._ 与 _.spec._，不排 test-support；mock 构造器预判为动态边界误报候选，仍逐个定性）+ layout 6（steps/wizard/grid/button-group/collapse/dropdown-button 六 renderer 各 1 处 `as unknown as`）+ mobile 1（`test-support.ts:34`）= 9 + setTimeoutCandidates 2+1+3 = 6 + domRaid 1+2+0 = 3，合计 **18 处候选**逐个人工定性；typeBypass 拟制时 grep 复核 content 2/layout 6/mobile 1 逐字吻合；silentCatch/keyRemount/pixelNudge/testEnvBranch 全零。
- **门禁交叉基线**（拟制时 live 实测，执行时复跑为准）：`check:audit-async-failure-paths` **11 行命中**（content 5：diff-view/adapters/syntax-highlight:73、diff-view/model/diff-inline:20、image:59、json-view:74、mapping:44；layout 4：wizard-renderer:504/:267/:454、dropdown-button-renderer:140[在途文件，HEAD 口径定性]；mobile 2：pull-refresh:158、infinite-scroll:138——逐个去重定性）；`check:audit-performance-suspects`/`check:audit-runtime-raw-schema-reads`/`check:audit-hardcoded-type-dispatch`/`check:audit-reactive-render-reads`/`check:audit-renderer-browser-io` 均 0（实跑留痕）。
- **oversized 登记债口径**：三包 ≥500 行文件全部 WARN 档（评估不拦 exit）——layout wizard-renderer.tsx 654、layout-renderer-definitions.ts 640、content content-renderer-definitions.ts 636、content diff-view/diff-view-renderer.tsx 553（共 4 件非测试源文件，余为测试文件）。已登记债不重复立案，但 ≥500 行源文件一律纳入结构走读。live 主树 `check:oversized-code-files` exit 1 系并行会话在途 `flux-runtime/runtime-factory.ts:701`（非本批、隔离 HEAD 口径下不存在）。
- **包特性与审计重心**：①content = 内容/反馈/媒体族，三方重库依赖（qrcode/diff-match-patch/lowlight）——懒加载边界、diff-view 双实现面（inline/split 分支）、media 生命周期（audio/video 播放器卸载清理）；②layout = 布局/流程/动作族（NEW app-level）——wizard 族（IS-8b/plan 553 刚修过 computeCanGoTo 校验跳过与 mountOnEnter 默认值，考古锚 a7d633a1e）与 dropdown-button（**在途特性，HEAD 口径取证**）、steps/timeline/resizable 单注册结论（plan 532 在案）；③mobile = 触摸交互族（pull-refresh/infinite-scroll/swipe-cell/countdown/notice-bar）——触摸监听器挂载/清理对称性、定时器族（countdown/notice-bar 轮播）、hasTouch 仿真边界（IS-8b 组 C 在案）。
- **交界防重复**：①plan 532/533/534（三包 dom-structure 契约收口，layout 9 cards/content 20 cards/mobile 5 cards）与 IS-8b/plan 553（交互透镜，向导族双 P1 已修）已从 DOM 结构/交互面覆盖，本批透镜=九信号临时方案与坏味道，结论不重复立案但可作考古线索；②CX-1（编译公式层收敛批）与 CX-11/CX-13 扩围（wa-6 刚登记）如遇消费侧新面显式引用不重复立案。
- **保护区与授权条款**：①三包 `src/index.ts` 公共导出 = **批内零变更**（确需增删 → CX-n/显式注记待人工确认；注意扩展名为 .ts 非 .tsx）。②Renderer definition fields = plan-first——本 plan 即载体。③样式契约 = plan-first（owner doc `docs/architecture/styling-system.md`；widget 件 self-styled 合法）。
- **已收敛模式三档**：live 可证档——cq-5（4ee46b668 i18n key merge/loading 约定/onSync rename）与 cq-6（2c94d9d7f type-safety seams）在三包的收敛点 live 复核零复发；历史教训档——`dataPath` 双词汇（不涉则记不适用）、strip errors/ajax（不涉则记不适用）；WA-1..6 已立案发现（CX-1..14 覆盖面）不重复立案。
- **工作树状态（拟制时点实测）**：layout 3 文件在途（2 源+1 测试，并行会话 dropdown-button 特性）；content/mobile 零在途。**取证口径**：在途 2 源文件按 HEAD 快照取证；**修复不叠编辑**（沿 564/566 规则：隔离 worktree 修复首选，P0/P1 不得借在途状态降级）。**中途漂移预案**：若并行会话执行中触及本批其他文件，取证以已完成的 HEAD 快照为准并就地注记。主树其他包在途变更（data×4/form×3/runtime×3/core×1）不属本批。全量门禁沿用隔离 worktree 方法（HEAD+本批 diff）。
- **五门禁基线**：WA-6 收口（aeaf14177）隔离验证全绿。

## Goals

- `docs/audits/workaround-code-smell/wa-7/report.md`：逐条发现（prompt §6 单条 12 字段）+ 汇总五项 + 覆盖声明节（含 layout 在途 2 文件 HEAD 口径与 live 漂移逐文件分解）。
- findings 全量登记 ledger（`WA-content-001`/`WA-layout-001`/`WA-mobile-001` 起三位零填充顺延，与既有 10 前缀零撞号），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修；三包 `index.ts` 零公共导出变更。
- 台账 modules 三行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发）。

## Non-Goals

- 结构性重构的批内实施；三包 `index.ts` 公共导出面的任何增删。
- 并行会话在途 3 文件的任何叠编辑（含"顺手修正"）；登记转发不越权修。
- 与其他轨道重复立案；已登记 pre-existing 门禁红的重复立案；wa-1..6 已立案发现重复立案。
- playground 消费侧。

## Scope

### In Scope

- `packages/flux-renderers-content/src/`、`packages/flux-renderers-layout/src/`、`packages/flux-renderers-mobile/src/` 全部非测试源码的取证（prompt §5 全量协议；layout 在途 2 文件按 HEAD 快照）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试（在途文件除外——不叠编辑）。
- `docs/audits/workaround-code-smell/wa-7/report.md` + ledger 登记/翻转 + roadmap WA-7 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非本批包/模块的任何修改（含并行会话在途文件——登记转发不越权修）。
- 结构性重构实施；playground 消费侧。

## Failure Paths

不适用（审计批无新增运行时错误处理面）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。P0/P1 修复先红后绿（Proof 与 Fix 合并表达，沿 561..566 先例）；行为保持型批内修特征化测试先钉后改；修复后跑各包 `pnpm --filter @nop-chaos/flux-renderers-{content,layout,mobile} typecheck/build/lint/test`；批收口跑全量五门禁（隔离 worktree 方法）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: completed
Targets: `packages/flux-renderers-{content,layout,mobile}/src/`（读）、`docs/audits/workaround-code-smell/wa-7/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 协议全走——18 处 inventory 候选逐个定性 + 门禁交叉（async 11 行命中：1 立案沉淀 P1[content-007]+2 立案 P3[content-005/layout-003]+1 在途转发不立案[dropdown:140]+7 排除；其余 5 门禁 0 实跑）+ 重复块探针（35 组原始→生产坐实 6 组+测试面 2 组+排除 27 组）+ 范围结构走读（**69/69 全文读取**，零核心区档；≥500 行 4 件全读[+1 口径差注记]；双口径 12,261 HEAD/12,289 inventory 落字）+ 三档处置（cq-5/cq-6 零复发/dataPath 不适用）+ 误报排除 24 项（含 4 watch 微注记+2 表外微注记）。
- [x] Proof：每个立案候选 git 考古（14 commit；锚点核验 a7d633a1e IS-8b 双 P1 两侧落地 ✅；症状性 message 抽检 25=0）。
- [x] Decision：严重度 + ROI + 共性裁定——**13 条立案（P1×1[WA-content-007 语法高亮整体静默失效]+P2×6+P3×6）**；去向=fixed 9+successor-required 2（layout-004→CX-11 扩围、mobile-001→CX-15 新拟制）+watch-only 2；在途载体发现 1 条（layout-002 第 6 位点）不叠编辑随合入后执行；**CX-15 插入 roadmap**（渲染器包测试支撑收敛批，跨包测试基建非生产面）。**closure 执行期披露**：隔离五门禁首跑逮到批内提取引入的回归 1 条（WA-content-009，模块顶层 t() 冻结 i18n 单例，ai 套件 3 用例红）——按自动修复契约当场修复+判别性回归测试，合计立案 14 条。
- [x] Proof：`wa-7/report.md` 落盘（323 行），findings 全量登记 ledger（13 行，三命名空间零撞号）；reconcile=91 findings（found 75+verified 16）/未处置 9（待 Phase 2 翻转）/violations 0。

Exit Criteria:

- [x] `wa-7/report.md` 落盘且模板字段/汇总五项/覆盖声明齐备（覆盖声明含 layout 在途 2 文件 HEAD 口径 + live 漂移逐文件分解 + 漂移 hunk 内容定性）。
- [x] ledger 与报告一一对应零遗漏（三 ID 命名空间分行清晰，13/13）。
- [x] 每个立案有 git 考古读数（14 commit）；误报排除 24 项有对照理由。
- [x] 共性裁定落字（CX-11 扩围 + CX-15 插入 roadmap 均已落）。

### Phase 2 - 批内自动修复（先红后绿）

Status: completed
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：逐项修复——P1×1 先红后绿（WA-content-007 lowlight `createLowlight(common)` 注册 37 语言+别名映射+未知语言 dev warn 一次+hl-\* CSS 令牌化补齐[29 处 var]——红态 stash 对照恰 2 failed→4/4 绿）；content-005 image fetcher 双失败分支补 onLoadError（红恰 2 failed→6/6）；content-004 受控传播替换 remountKey 强制重挂载（DiffHunk 渲染期派生 override+from 标记，红恰 1 failed→绿，`git grep remountKey`=0 本体删除验证）+content-001 提取 use-diff-line-maps.ts+content-002 提取 media-shared.tsx（audio/video 四块收敛）+content-003 提取三栏参数化 pane renderer（rowFlags 每行一次）；layout-001 提取 value-ownership.ts（steps↔timeline 逐字 64 行收敛+collapse 走原语保特化+step-index.ts W5 注记回写）+layout-002 提取 compiled-items.ts 命名 seam（5/6 位点，在途 dropdown-button 不叠编辑）+layout-003 guard 双静默分支分键 dev warn（blocked/threw，红恰 1 failed→6/6）；三包 `index.ts` 零公共导出变更（git diff --exit-code）。
- [x] Proof：三包 filter 四门禁——typecheck/build/lint/test 全绿（content 352/layout 147/mobile 189；全程 lint 0 error，react-compiler 逮到 effect 内 setState→改渲染期派生+memo×useCallback 冲突→去 useCallback 两处当场收敛）；类别清扫落报告。

Exit Criteria:

- [x] 红→绿证据在案（007/005/004/003·layout-003 红态经 stash 对照/先行测试留痕；001/002/layout-001/002 行为保持提取同套同绿）；本体删除验证逐项落字（remountKey=0、toWidth 类推本地副本 grep=0、三份 ownership 钩子删除）。
- [x] filter 级四门禁通过；批 closure 前台账无残留 `found` 未处置的 P0/P1（reconcile 未处置=0/fixed 9/violations 0）；三包 `index.ts` `git diff --exit-code` 通过。

### Phase 3 - 回写与收口

Status: completed
Targets: roadmap、ledger、dev log

- Item Types: `Proof`

- [x] Proof：台账 modules 三行翻转 `audited`；reconcile 通过（快照 91 findings；**closure 终态 92 = found 66 + fixed 10 + verified 16 / 未处置 0 / violations 0**，差 1 = 执行期披露 WA-content-009 落账）。
- [x] Proof：draft review 通过时 roadmap WA-7 回写 `todo → planned` 并填 plan 路径；`planned → done` 属 Closure Gates 收口动作。
- [x] Decision：批内修复行 `fixed → verified` 归属——closure 复检通过当场翻转（10 行，closure audit agent_e12a5bea approved 0B/0M/2m）。
- [x] Proof：dev log 记录发现/修复/门禁计数（`docs/logs/2026/10-12.md`，closure 行待收口补录）。

Exit Criteria:

- [x] reconcile exit 0 且 wa-7 报告存在。
- [x] roadmap WA-7 行 `todo → planned` 已落并填 plan 路径。
- [x] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_3dc96012-21a4-4aac-9799-7e05a925eaf8，review-only）
- Verdict: `revised`（零 Blocker、2 Major、4 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** roadmap 引文失实（WA-7 行实为"约 11.7k"，plan 虚构"约 12.3k 一致"）→ 如实引 11.7k 并标注估算/口径差，以 inventory 为准；**M2** oversized 非测试源清单漏 content diff-view/diff-view-renderer.tsx 553（"余为测试文件"失实）→ 补列（4 件非测试 ≥500）；**m1** Last Reviewed 缺日期 → 随本记录落 2026-10-11；**m2** typeBypass 9 处未落位点且 content 2/mobile 1 实居 test-support 文件（inventory 生成器不排 test-support）→ 位点+归属注记落 baseline；**m3** live 主树 oversized exit 1 归因（在途 runtime-factory.ts:701，非本批）→ 照 566 先例补注记；**m4** ledger ID 格式钉死三位零填充（WA-content-001 起，与既有 10 前缀零撞号）。审查员对其余清单项全部 live 复现通过（inventory 三包计数精确复算、在途 3 文件与漂移逐字节吻合、layout HEAD 4,226/全集 HEAD 12,261 可复算、async 11 行分布逐行号吻合、五门禁 0、index.ts 扩展名、532/533/534 卡片数与 a7d633a1e 考古锚、与 566 条款逐条对齐）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（批内修 P0/P1 红→绿收口；结构性/共性以 CX-n 显式去向）
- [x] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向）
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（批内修项红→绿证据 + filter 四门禁 + ai 850/850 跨包探针）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-7 回写 + dev log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（见 Closure Audit Evidence）
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

Status Note: WA-7 三包审计批按自动修复契约完整收口——14 findings（含执行期披露回归 WA-content-009）全量落账零静默（fixed→verified 10 + successor-required 2[CX-11 扩围/CX-15 拟制] + watch-only 2）；隔离五门禁（HEAD 815d026dd + 本批 31 文件）R3 全链 exit 0；draft review R1 共识（0B/2M/4m 全修）+ closure audit R1 approved（0B/0M/2m 随收口修正，审计员动态判别实证两处均精确命中红态）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（general-purpose fresh session，agent_e12a5bea-e81e-4254-8d8b-48adc9135454，review-only）
- Evidence: R1 approved（0 Blocker/0 Major/2 Minor 随收口修正）——①落地实证 10 项全过（remountKey 代码引用 0/compiled-items 5/6 位点/value-ownership 三消费/syntax-highlight createLowlight(common)+CSS 令牌 7 组×3 档/media-shared 四块/three-column headerKey 渲染期翻译/wizard guard 分键 warn/image onLoadError/三包 index.ts 零变更 git diff --exit-code）；②红→绿判别力动态实证 2 处（WA-content-009 合成模块顶层 t() 版→content 恰 1 failed 恢复后 353/353；WA-content-007 checkout HEAD 零参版→恰 2 failed 恢复后定向 5/5）；③五件一致性（台账 14=报告 14、reconcile 92=66+10+16 未处置 0 violations 0、roadmap 三处落字、plan 勾选实况符）；④851→850 勘误链四处闭合 grep 验证；⑤批次边界 31 文件两树逐字节比对（唯一差异=主树 roadmap WA-8 行系 plan 568 并行叠编辑，非本批）；⑥在途三文件零叠编辑；⑦R3 五标记独立复核 + content 353/353、layout 145/145 独立复现；⑧预写诚实性（dev log 待补录行即本审计结论，诚实留白）；⑨epilogue 零探针残留。m1（reconcile 快照数注记终态）m2（renderPane 命名对齐代码符号 ThreeColPaneRow/THREE_COL_PANES）均随本收口落盘。

Follow-up:

- WA-layout-002 第 6 位点（dropdown-button，并行会话在途文件）随其合入后改 compiledItems 调用——台账行已显式登记残差，非静默。
- CX-15（渲染器包测试支撑收敛批）与 CX-11 扩围（WA-layout-004）按 roadmap 时机执行。
