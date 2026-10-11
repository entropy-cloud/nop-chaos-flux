# 566 workaround-audit WA-6 数据展示渲染器审计批（flux-renderers-data）

> Plan Status: completed
> Last Reviewed: 2026-10-11
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-6 工作项，Phase Status 第 7 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`（统一方法）；先例：`docs/plans/563/564/565`（保护区条款、在途文件规则、closure 迭代先例）
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`（对象清单来源）；`docs/audits/workaround-code-smell/wa-5/report.md`（前批沉淀：误报排除清单互通）；`docs/context/ai-autonomy-policy.md`

## Purpose

对数据展示渲染器包（flux-renderers-data，inventory 114 文件 / 22,319 行非测试源码，全集最大包）执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划。

## Current Baseline

- **对象清单**（WA-0 枚举器输出）：flux-renderers-data 22,319 行/114 文件（roadmap 行"约 22.1k"为拟制时估算，以 inventory 为准）。分区规模：`table-renderer/` 子目录 50 文件 9,418 行；crud 族（crud-_ + use-crud-_）18 文件 3,859 行；chart/echarts/sparkline/stat 族 20 文件 2,987 行；其余（batch-bar/list/tree/pagination/query/use-\* hooks/definitions/schemas）26 文件 6,055 行。
- **字面标记**：literalEn/literalZh 均为 0（inventory baseline，批内复核）。
- **模式候选基线**（inventory per-module，仅线索非定案）：typeBypass 6 + setTimeoutCandidates 7 + domRaid 5 = 18 处候选逐个人工定性；silentCatch/keyRemount/pixelNudge/testEnvBranch 全零。typeBypass 拟制时 grep 复核 6 行命中（crud-renderer-delegate ×4 含 1 注释行、共 3 cast 位点、crud-renderer-schema-builders、table-cell-popover），与 inventory 计数吻合口径批内核对。
- **门禁交叉基线**（拟制时 live 实测，执行时复跑为准）：`check:audit-async-failure-paths` 27 行命中（历批最大，涉及 15 文件：batch-bar 5 命中/3 唯一行（跨规则桶重复）、crud-infinite-scroll-area、list-renderer、table-editable-cell ×6、use-url-filter-sync、crud-renderer、echarts-renderer ×3、table-body-row-rendering、table-cell-popover、table-row-leading-cells、table-summary-row、use-row-drag-sort、use-row-quick-edit-draft、use-table-selection ×2、use-crud-polling，批内去重逐个定性）；`check:audit-performance-suspects` 2（column-width-measure:70、use-url-filter-sync:145）；`check:audit-runtime-raw-schema-reads` 实测 2（echarts-renderer.tsx:76-77，`props.schema?.events` 运行时读，批内按 D 类/compile-once 候选定性，不得预设门禁误报）；`check:audit-hardcoded-type-dispatch`/`check:audit-reactive-render-reads`/`check:audit-renderer-browser-io` 均 0。
- **oversized 登记债口径**：本包 ≥500 行文件全部处于 WARN 档（评估不拦 exit），非登记 ERROR 红——table-renderer.tsx 700/table-header-row.tsx 699/crud-renderer.tsx 695/chart-renderer.tsx 690/tree-renderer.tsx 666/data-renderer-definitions.ts 643/table-body-row-rendering.tsx 616/crud-renderer-state.ts 586/schemas.ts 502 等。已登记债不重复立案，但 ≥500 行文件一律纳入结构走读。注：live 主树 `check:oversized-code-files` exit 1 系并行会话在途 `flux-runtime/runtime-factory.ts:701`（非本批、隔离 HEAD 口径下不存在），不属本批登记。
- **包特性与审计重心**：data = 表格/CRUD/列表/树/图表/分页数据展示族，依赖 flux-core/flux-i18n/flux-react/flux-renderers-basic/ui/@tanstack/react-virtual。重点：①**crud 族 4 文件在途（见工作树状态）**——crud-renderer.tsx/crud-renderer-state.ts/crud-renderer-ownership.ts 为并行会话 form-target 特性在途文件，取证按 HEAD 快照、修复不叠编辑；②table-renderer/ 50 文件为包主体，列宽测量/虚拟滚动/行选择/分组/展开/行内编辑等交互 hook 族模板复制与漂移探查；③chart/echarts 族 domRaid 5 处定性（ECharts 容器 init/dispose 与实例逃逸 vs 突袭）；④use-crud-polling/use-infinite-scroll/use-url-filter-sync 等 hook 族 setTimeout 7 处与 async 失败路径 27 命中定性；⑤crud-renderer-delegate 的 `as unknown as` 跨泛型 cast 群（typeBypass 6 之 3）逐个定性（注释自证"仅真跨泛型字段 cast"，核实声明与实际一致性）。
- **交界防重复**：①CX-13 Tree 族收敛批（form/form-advanced 侧双声明）——本包 tree-renderer/use-table-tree/tree-focus-nav/tree-node-helpers 属消费侧新面，如立案显式引用 CX-13 不重复立案；②CX-11 field-frame aria 注入链——本包表单消费面（crud-query-form 等）如现新面显式引用；③plan 531（data dom-structure 契约收口，13 audit cards）与 IS-5/plan 548（data-viz 交互审计，table-column-width 实测列宽修复）已从 DOM 结构/交互透镜覆盖本包，本批透镜=九信号临时方案与坏味道，二者结论不重复立案但可作考古线索；④cq-3（5ad81bbf2 包内去重 table bridge）与 b5f585e6f（table-header-row 701 行 MUST-split → table-header-text.ts 提取）为本包已知重构史，git 考古直接引用。
- **保护区与授权条款**：①`src/index.tsx`（31 行）公共导出 = **批内零变更**（确需增删 → CX-n/显式注记待人工确认）。②Renderer definition fields = plan-first——本 plan 即载体。③样式契约 = plan-first（owner doc `docs/architecture/styling-system.md`；widget 件 self-styled 合法——本包 table/chart 族均为 widget 件）。
- **已收敛模式三档**：live 可证档——重库懒加载（echarts 模块级 `import()`，c21e2dea9 收口）live 复核零复发；AbortController（crud-renderer-load.ts 在案）live 复核；历史教训档——`dataPath` 双词汇（前批已证多包零命中，本包复核）、strip errors/ajax（不涉则记不适用）；WA-1..5 已立案发现（CX-1..14 覆盖面）不重复立案（消费侧新面显式引用）。
- **工作树状态（拟制时点实测）**：本包 **4 文件在途**（并行会话 form-target 特性）：`crud-renderer.tsx`、`crud-renderer-state.ts`、`crud-renderer-ownership.ts`、`__tests__/crud-renderer-state.unit.test.tsx`（末者非测试源码不入 inventory，仍属在途不触碰）。**取证口径**：在途 3 源文件按 HEAD 快照（`git show HEAD:<path>`）取证；inventory 行数口径（281/585/694）系 WA-0 盘点时在途编辑已在场之 live 值，HEAD 口径合计 22,302 行（漂移 −17：ownership +10/state +4/crud-renderer +3 live vs HEAD），覆盖声明双口径逐字落字并附逐文件分解。**修复不叠编辑**：在途文件如需批内修，沿 564 规则处置（隔离 worktree 修复首选；取证结论与 live 漂移就地注记；P0/P1 不得借在途状态降级）。**中途漂移预案**：若并行会话执行中触及本包其他文件，取证以已完成的 HEAD 快照为准并就地注记。主树其他包在途变更（form×3/layout×3/runtime×3/core×1）不属本批。全量门禁沿用隔离 worktree 方法（HEAD+本批 diff）。
- **五门禁基线**：WA-5 收口（8061a7b5c）隔离验证全绿。

## Goals

- `docs/audits/workaround-code-smell/wa-6/report.md`：逐条发现（prompt §6 单条 12 字段）+ 汇总五项 + 覆盖声明节（含在途 3 文件 HEAD 口径与 live 漂移逐文件分解）。
- findings 全量登记 ledger（`WA-data-<seq>`），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修；`index.tsx` 零公共导出变更。
- 台账 modules 行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发）。

## Non-Goals

- 结构性重构的批内实施；`index.tsx` 公共导出面的任何增删。
- 并行会话在途 4 文件的任何叠编辑（含"顺手修正"）；登记转发不越权修。
- 与其他轨道重复立案；已登记 pre-existing 门禁红的重复立案；wa-1..5 已立案发现重复立案。
- playground 消费侧。

## Scope

### In Scope

- `packages/flux-renderers-data/src/` 全部非测试源码的取证（prompt §5 全量协议；在途 3 文件按 HEAD 快照）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试（在途文件除外——不叠编辑）。
- `docs/audits/workaround-code-smell/wa-6/report.md` + ledger 登记/翻转 + roadmap WA-6 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非本批包/模块的任何修改（含并行会话在途文件——登记转发不越权修）。
- 结构性重构实施；playground 消费侧。

## Failure Paths

不适用（审计批无新增运行时错误处理面）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。P0/P1 修复先红后绿（Proof 与 Fix 合并表达，沿 561..565 先例）；行为保持型批内修特征化测试先钉后改；修复后跑 `pnpm --filter @nop-chaos/flux-renderers-data typecheck/build/lint/test`；批收口跑全量五门禁（隔离 worktree 方法）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: completed
Targets: `packages/flux-renderers-data/src/`（读）、`docs/audits/workaround-code-smell/wa-6/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 协议全走——18 处 inventory 候选逐个定性 + 门禁交叉（async 27 行命中去重定性/performance-suspects 2/raw-schema-reads 2（echarts-renderer.tsx:76-77）逐个定性/hardcoded-type-dispatch 等实跑留痕）+ 重复块识别（12 行滑窗 token 归一化探针，table-renderer hook 族与 crud/chart/list/tree 分区重点）+ 范围结构走读（114/114 覆盖；逐行精读+核心区+声明扫描三档分配如实落字；22,302 HEAD 口径/22,319 inventory 口径双口径落字）+ 三档处置（懒加载/AbortController/dataPath 零复发核验）+ 误报排除清单。
- [x] Proof：每个立案候选 git 考古（16 commit 溯源；重点面 cq-3 5ad81bbf2/b5f585e6f/4cabab47c/8e8381d94/c21e2dea9 全部落字）；症状性 message 抽检 25 commit=0。
- [x] Decision：严重度 + ROI + 共性裁定——12 条立案（P2×4+P3×8，零 P0/P1）；去向=fixed 7+successor-required 2（006→CX-13 扩围、012→CX-11 扩围）+watch-only 3（003/007/011）；在途载体发现 1 条（007）按不叠编辑裁决。
- [x] Proof：`wa-6/report.md` 落盘（294 行），findings 全量登记 ledger（WA-data-001..012）；reconcile=78 findings（found 69+verified 9）/未处置 7（待 Phase 2 翻转）/violations 0；执行期修一处台账行内未转义管道符（reconcile 计数 77≠78 定位）。

Exit Criteria:

- [x] `wa-6/report.md` 落盘且模板字段/汇总五项/覆盖声明齐备（覆盖声明含在途 3 文件 HEAD 口径 + live 漂移逐文件分解 + wc 计数约定差注记）。
- [x] ledger 与报告一一对应零遗漏（12/12）。
- [x] 每个立案有 git 考古读数（16 commit）；误报排除 24 项有对照理由 + 4 条 watch 微注记。
- [x] 共性裁定落字（CX-13 扩围 WA-data-006、CX-11 扩围 WA-data-012；无新设 CX——roadmap 行登记归 Phase 3 收口批）。

### Phase 2 - 批内自动修复（先红后绿）

Status: completed
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：逐项修复——本批零 P0/P1；7 项批内修全部落地：WA-data-001 提取 infinite-load.ts（interpretActionResultError + consumeLoadResult，三文件改 import，本体六处手写删除）+ WA-data-002 提取 table-body-shell.tsx（renderGroupHeaderRow + withRadioGroupBody，双路径三块收敛）+ WA-data-004 提取 parse-column-width.ts（toWidth/toNumericWidth 双份删除）+ WA-data-005 提取 query-form-carrier.ts（resolveFormMode 迁入+re-export 兼容，buildEmbeddedQueryFormCarrier 双载体收敛；默认按钮语义差保留调用方，variant 别名差注记）+ WA-data-008 耗尽 warnOnce（红→绿：恰 1 failed→10/10）+ WA-data-009 四处 silent 派 warnOnce + batch-bar 双 .catch（红→绿：恰 4 failed→全绿；expandable warn 断言并入首触发钉测试避 session-once 抑制）+ WA-data-010 签名并集收窄删 cast（typecheck 自证）；在途 3 文件零叠编辑；`index.tsx` 零公共导出变更（git diff --exit-code）。
- [x] Proof：包 filter 四门禁——typecheck/build/lint/test 全绿（全量 176 文件/1217 测试通过，较基线 +6 新钉测试；lint 唯一 warning 经 stash 对照证实 HEAD pre-existing）；类别清扫落报告（本地副本 5 处删除验证：toWidth/toNumericWidth/双 retry 块/group-header 块/radio 块 grep=0）。

Exit Criteria:

- [x] 红→绿证据在案（008/009 新钉先红后绿；001/002/004/005 行为保持提取同套同绿）；本体删除验证逐项落字。
- [x] filter 级四门禁通过；批 closure 前台账无残留 `found` 未处置的 P0/P1（reconcile 未处置=0/fixed 7/violations 0）；`git diff --exit-code packages/flux-renderers-data/src/index.tsx` 通过。

### Phase 3 - 回写与收口

Status: completed
Targets: roadmap、ledger、dev log

- Item Types: `Proof`

- [x] Proof：台账 modules 行翻转 `audited`；reconcile 通过。——audited 11 / 78 findings（found 62+fixed 0+verified 16）/ 未处置 0 / violations 0。
- [x] Proof：draft review 通过时 roadmap WA-6 回写 `todo → planned` 并填 plan 路径；`planned → done` 属 Closure Gates 收口动作。——两步均已落。
- [x] Decision：批内修复行 `fixed → verified` 归属——closure 复检通过当场翻转（7 行于本收口 commit 翻转；复检证据=closure audit agent_f9669419 七项修复逐一实证含 consumeLoadResult 与被删 HEAD 块逐点等价对照）。
- [x] Proof：dev log 记录发现/修复/门禁计数。

Exit Criteria:

- [x] reconcile exit 0 且 wa-6 报告存在。
- [x] roadmap WA-6 行 `todo → planned` 已落并填 plan 路径（收口时再落 `planned → done`）。
- [x] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_cb842b99-0520-40bf-bbbf-3e337a000266，review-only）
- Verdict: `revised`（零 Blocker、2 Major、3 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** chart 族分区数字失实（23 文件/3,710 行不可复算，实为 20 文件/2,987 行；其余区 26 文件/6,055 行）→ 改可复算口径；**M2** raw-schema-reads 基线"预计 0（renderer 包非 runtime）"失实——实测 2 命中（echarts-renderer.tsx:76-77）且归因理由错误（该门禁本就扫描 renderer 包）→ 改实测口径+批内逐个定性不预设误报；**m1** async 命中乘数错位（table-editable-cell ×6 非 ×7；batch-bar 5 命中/3 唯一行跨桶重复）→ 修正；**m2** typeBypass 分布列举 5≠6（delegate 实为 ×4 含 1 注释行/3 cast 位点）→ 修正自洽；**m3** Execution-slice Status 词表越轨（pending→planned ×3）→ 修正。审查员对其余清单项全部 live 复现通过（inventory 三区计数精确吻合、在途 4 文件与漂移逐字节吻合、HEAD 口径 22,302 可复算[注明 column-width-measure.ts 无尾换行的 wc 计数约定差]、oversized WARN 档与 runtime-factory.ts:701 归因、先例条款一致性、规范合规、CX-13/11 交界文件在册、五 commit 考古线索存在且语义吻合）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（本批零 P0/P1；7 项批内修全落地，P2×4 中 006 归 CX-13 扩围显式去向）
- [x] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向）——successor-required 2（CX-11/13 扩围）+ watch-only 3 零静默
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（008/009 红→绿证据 + 001/002/004/005 同套同绿 + filter 四门禁 1217/1217）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-6 回写 + dev log + 报告修复记录）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 issues（agent_f9669419，0B/1M/2m：dev log 两句预写口径领先实况+\_tmp 空探针残留；七项修复/在途纪律/门禁/台账力学全独立实证）→修正后收口，delta 复核见 Closure Audit Evidence
- [x] `pnpm typecheck`（隔离 worktree `../wa6-verify` HEAD `8061a7b5c`+本批 30 文件 diff，exit 0）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0）
- [x] `pnpm test`（同上，exit 0）
- [x] `pnpm check`（同上，exit 0——首跑 check-knip-baseline 逮到新模块 EmbeddedQueryFormCarrierArgs 未消费导出，收私后复跑通过）

## Deferred But Adjudicated

- WA-data-005（批内修时裁定）：variant 词汇'两派'不做统一改动——'default'/'primary' 为渲染恒等的 schema 别名（G1-视角2-01 在案），统一属 schema 字节变更需契约测试同步，ROI 不足；已在 query-form-carrier.ts 注记别名关系。收敛载体本体（envelope+layout 透传）已提取落地。
- WA-data-008 根因部分（form handle 注册就绪信号，涉 flux-react form bridge 跨包）：watch 注记不立案，随 CX-7（ScopeRef 自省族）方向归口。

## Non-Blocking Follow-ups

- CX-13 扩围（WA-data-006 Crud*/Table* 声明镜像）与 CX-11 扩围（WA-data-012 tree-focus-nav 位点）已登记 roadmap，各自由 CX plan 收口（CX-13 有执行前人工确认门）。
- watch-only 3 条（WA-data-003 dev-runtime 归置 / 007 keywordField 显式化[载体在途] / 011 Fix 3 注记改写）随下次触碰顺带。

## Closure

Status Note: 2026-10-11 收口。单模块（flux-renderers-data 114 文件/22,319 行 inventory 口径，114/114 覆盖[87 逐行+27 核心区]，在途 3 源文件 HEAD `8061a7b5c` 快照取证零叠编辑）prompt §5 全量取证完成，12 findings 全量登记台账且去向四态零静默（fixed→verified 7 / CX-11+CX-13 扩围 2 / watch-only 3）；批内修 7 项（提取×4 删六处手写本体+观测×2 红→绿+签名收窄×1）；`index.tsx` 零公共导出变更；隔离五门禁 exit 0（首跑 knip 逮到 1 个未消费导出收私后复跑通过）。roadmap WA-6 → done。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_f9669419-b470-4406-8193-2611108fd033，review-only）
- Evidence: closure audit R1 `issues`（0 Blocker / 1 Major / 2 Minor——M1=dev log "modules 行翻转 audited" 领先实况[翻转归 Phase 3]、m1=dev log closure-audit 句预写且引用未落地的 Evidence 节、m2=\_tmp 0 字节探针残留 wa6-eval-probe.mjs）→ 三项全修（dev log 两句改实况口径、探针删除、本 Evidence 节落盘使引用成立）+ Phase 3 全部回写执行（fixed 7→verified、modules→audited、roadmap→done）后 reconcile 终态=78 findings（found 62+verified 16）/未处置 0/violations 0。审计员独立实证：七项修复逐一打开文件核对、consumeLoadResult 与被删 HEAD 块逐点等价对照、在途 4 文件 diff 全属并行会话 form-target 特性零交叠、隔离 worktree 30 文件精确清单、reconcile 复跑、包 typecheck/lint/全量测试 1217/1217、M1/M2 draft-review 修正落盘抽验。
