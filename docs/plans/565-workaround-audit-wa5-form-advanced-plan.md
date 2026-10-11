# 565 workaround-audit WA-5 表单进阶渲染器审计批（flux-renderers-form-advanced）

> Plan Status: completed
> Last Reviewed: 2026-10-11
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-5 工作项，Phase Status 第 6 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`（统一方法）；先例：`docs/plans/563/564`（保护区条款、双探针取证、closure 迭代先例）
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`（对象清单来源）；`docs/audits/workaround-code-smell/wa-4/report.md`（前批沉淀：误报排除清单互通）；`docs/context/ai-autonomy-policy.md`

## Purpose

对表单进阶渲染器包（flux-renderers-form-advanced，inventory 70 文件 / 17,863 行非测试源码）执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划。

## Current Baseline

- **对象清单**（WA-0 枚举器输出）：flux-renderers-form-advanced 17,863 行/70 文件（roadmap 行"约 17.3k"为拟制时估算，以 inventory 为准）。
- **字面标记**：literalEn/literalZh 均为 0（inventory baseline，批内复核）。
- **模式候选基线**（inventory per-module，仅线索非定案）：typeBypass 5 + setTimeoutCandidates 3 + domRaid 4 = 12 处候选逐个人工定性；silentCatch/keyRemount/pixelNudge/testEnvBranch 全零。
- **包特性与审计重心**：form-advanced = 进阶复合字段族（cascader/tree/range/矩阵级联类）。重点：①**Tree 双声明（本批拟制时 live 复核识别；wa-4 报告未登记此发现，非前批交接）**——form 包 `schemas.ts` HEAD:183-248 `InputTreeSchema`↔`TreeSelectSchema` 字段集全同仅 `@see` 互指，renderer 本体在本包 `tree-controls.tsx`；本批对 Tree 渲染器侧同读并裁定收敛载体（裁定输入含既有守卫测试 `__tests__/c3-5-schema-contract-honesty.test.ts`——跨包读取 form schemas.ts、钉住 key 注册，约束可行收敛空间）；②同族复合字段间的受控值/选项加载模板复制；③domRaid 4 处定性（焦点/滚动管理 vs 突袭）。
- **保护区与授权条款**：①`src/index.tsx` 公共导出 = **批内零变更**（确需增删 → CX-n/显式注记待人工确认）。②Renderer definition fields = plan-first——本 plan 即载体。③样式契约 = plan-first（owner doc `docs/architecture/styling-system.md`；widget 件 self-styled 合法）。
- **已收敛模式三档**：live 可证档——AbortController/重库懒加载 live 复核零复发；历史教训档——`dataPath` 双词汇（前批已证多包零命中，本包复核）、strip errors/ajax（不涉则记不适用）；form-runtime 族（WA-2/CX-3）与 wa-3/wa-4 已立案发现不重复立案（消费侧新面显式引用）。
- **工作树状态（拟制时点实测）**：本包零在途变更（本包范围 `git status` 零命中），批内修复直接主树实施；主树另有并行会话在其他包的在途变更（计数随漂移，以执行时实测为准），不属本批。全量门禁沿用隔离 worktree 方法（HEAD+本批 diff）。**中途漂移预案**：若并行会话执行中触及本包文件，取证以已完成的 HEAD 快照为准并就地注记；修复不叠编辑——沿 564 在途文件规则处置（隔离 worktree 修复首选，P0/P1 不得借在途状态降级）。
- **五门禁基线**：WA-4 收口（1aacab37b）隔离验证全绿。

## Goals

- `docs/audits/workaround-code-smell/wa-5/report.md`：逐条发现（prompt §6 单条 12 字段）+ 汇总五项 + 覆盖声明节。
- findings 全量登记 ledger（`WA-form-adv-<seq>`），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修；`index.tsx` 零公共导出变更。
- 台账 modules 行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发）；含 Tree 双声明（本批 live 复核识别）收敛载体裁定落字。

## Non-Goals

- 结构性重构的批内实施；`index.tsx` 公共导出面的任何增删。
- form 包侧 schemas 双声明的删除实施（本批只做本包侧同读与裁定；跨包收敛载体归 CX-n 如触发）。
- 与其他轨道重复立案；已登记 pre-existing 门禁红的重复立案；wa-1..4 已立案发现重复立案。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/` 全部非测试源码的取证（prompt §5 全量协议）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试。
- `docs/audits/workaround-code-smell/wa-5/report.md` + ledger 登记/翻转 + roadmap WA-5 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非本批包/模块的任何修改（含并行会话在途文件——登记转发不越权修）。
- 结构性重构实施；playground 消费侧。

## Failure Paths

不适用（审计批无新增运行时错误处理面）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。P0/P1 修复先红后绿（Proof 与 Fix 合并表达，沿 561..564 先例）；行为保持型批内修特征化测试先钉后改；修复后跑 `pnpm --filter <pkg> typecheck/build/lint/test`；批收口跑全量五门禁（隔离 worktree 方法）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/`（读）、`docs/audits/workaround-code-smell/wa-5/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 协议全走——12 处候选逐个定性 + 门禁交叉（raw-schema-reads/hardcoded-type-dispatch 本包 0；suspects/async 11 命中 10 排除 1 watch）+ 重复块识别（12 对候选坐实 5 组）+ 范围结构走读（33 逐行+21 核心区+16 声明文件扫描；70/70、17,863 行逐字吻合）+ 三档处置（AbortController/重库/dataPath 零复发）+ 误报排除 24 项。
- [x] Proof：每个立案候选 git 考古（14 commit 溯源：9e97ba665 双落、41ebe4db4→61b18ca8d 2 天时差逐字、5ad81bbf2 cq-3 止步、6bbece7d2 sweep 主动写入第 10 份 cast 等）；症状性 message 0。
- [x] Decision：严重度 + ROI + 共性裁定——10 条立案（P2×4+P3×6，其中 006/007 为 CX-11 跨引用扩围）；CX-13/14 插入 + CX-11 扩围（依据升级为 sweep 主动扩散）；公共面触碰（fadv-002/004/005）均标人工确认门；Tree 双声明收敛载体裁定落报告专项小节。
- [x] Proof：`wa-5/report.md` 落盘，findings 全量登记 ledger（10 行）。

Exit Criteria:

- [x] `wa-5/report.md` 落盘且模板字段/汇总五项/覆盖声明齐备（覆盖含 Tree 双声明同读裁定及其出处口径——plan 565 M1 勘误在案）。
- [x] ledger 与报告一一对应零遗漏。
- [x] 每个立案有 git 考古读数；误报排除有对照理由。
- [x] 共性裁定落字（CX-13/14 插入 + CX-11 扩围）。

### Phase 2 - 批内自动修复（先红后绿）

Status: completed
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：逐项修复——本批无 P0/P1；唯一批内修候选 WA-fadv-003（P2 低成本逐字复制 66 行）实施：提取 projected-validation-projection.ts 单份、两文件改 import（净删 141 行）；其余 9 条显式去向（fixed 1 + successor-required 6 + watch-only 3）；`index.tsx` 零公共导出变更。
- [x] Proof：包 filter 四门禁——typecheck/build/lint/test 1150/1150 全绿（detail 族 3 套件先钉后改 12/12 同绿）；类别清扫落报告（两份本地副本删除验证+未用导入清理）。

Exit Criteria:

- [x] 红→绿证据在案（行为保持提取：detail 族先钉后改同套同绿）；本体删除验证逐项落字。
- [x] filter 级四门禁通过；批 closure 前台账无残留 `found` 未处置的 P0/P1；`git diff --exit-code packages/flux-renderers-form-advanced/src/index.tsx` 通过。——reconcile 未处置=0/violations=0。

### Phase 3 - 回写与收口

Status: completed
Targets: roadmap、ledger、dev log

- Item Types: `Proof`

- [x] Proof：台账 modules 行翻转 `audited`；reconcile 通过。——audited 10 / 未处置 0 / violations 0。
- [x] Proof：draft review 通过时 roadmap WA-5 回写 `todo → planned` 并填 plan 路径；`planned → done` 属 Closure Gates 收口动作。
- [x] Decision：批内修复行 `fixed → verified` 归属——closure 复检通过当场翻转（WA-fadv-003 于本收口 commit 翻转 verified，复检证据=closure audit agent_928f0699 归一化 diff 逐字 IDENTICAL 对照）。
- [x] Proof：dev log 记录发现/修复/门禁计数。

Exit Criteria:

- [ ] reconcile exit 0 且 wa-5 报告存在。
- [ ] roadmap WA-5 行 `todo → planned` 已落并填 plan 路径。
- [ ] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_adf09a27-4066-4b80-b93d-766eb281af25，review-only）
- Verdict: `revised`（零 Blocker、1 Major、5 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** Tree 双声明的 wa-4 交接出处失实（该注记仅存在于取证 agent 返回稿，wa-4 报告/台账/commit 均无记录——审查员 grep 全 audits 目录零命中；底层代码事实 live 为真）→ 六处统一重锚为"本批拟制时 live 复核识别（wa-4 报告未登记此发现，非前批交接）"，审计焦点保留；**m1** 补 roadmap 估算差免责句；**m2** 补 Draft Review Record 第四字段；**m3** "git status 空"改"本包范围零命中"；**m4** 补中途漂移预案句；**m5** Tree 裁定输入补 c3-5-schema-contract-honesty 守卫测试。审查员对 inventory 计数、本包零在途、HEAD=1aacab37b、index.tsx 扩展名、schemas.ts HEAD:183-248 双接口等全部声称 live 复现通过。

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复（批内修 P0/P1 红→绿收口；结构性/共性以 CX-n 显式去向）
- [ ] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向）
- [ ] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [ ] 必要 focused verification 已完成（批内修项红→绿证据 + filter 四门禁）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline（roadmap WA-5 回写 + dev log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 issues（agent_928f0699，0B/1M/4m：Major-1=plan :17/:20 的 M1/m3 勘误静默未落地）→ 修正后 delta 复核 approved（0B/0M/0m）；审计员独立复现 1150/1150+knip exit 0+reconcile 逐字+9 处 live 抽查全中+两副本与共享模块归一化 diff IDENTICAL
- [x] `pnpm typecheck`（隔离 worktree `../wa5-verify` HEAD `1aacab37b`+本批 8 文件 diff，exit 0）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0）
- [x] `pnpm test`（同上，exit 0）
- [x] `pnpm check`（同上，exit 0——首跑 check-knip-baseline 逮到新模块 2 个未消费导出，收为模块私有后复跑通过）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- （如共性裁定触发 CX-n，其执行归 CX-n plan；本节收口时按实际填写。）

## Closure

Status Note: 2026-10-11 收口。单模块（form-advanced 70 文件/17,863 行，70/70 覆盖）prompt §5 全量取证完成，10 findings 全量登记台账且去向四态零静默（fixed→verified 1 / successor-required 6→CX-13/14+CX-11 扩围 / watch-only 3）；唯一批内修 WA-fadv-003 行为保持提取（净删 148 行+共享模块 83 行）；`index.tsx` 零公共导出变更；隔离五门禁 exit 0（首跑 knip 逮到 2 个未消费导出收私后复跑通过）。roadmap WA-5 → done。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_928f0699，review-only）
- Evidence: closure audit R1 `issues`（0 Blocker / 1 Major / 4 Minor——Major-1=plan :17/:20 的 draft-review 勘误静默未落地，根因为 replace 匹配串笔误致静默未中）→ 修正后 **delta 复核 approved**（0B/0M/0m）：勘误链四处闭合 grep 验证、Decision 补勾带实质、reconcile 34 逐字、净删行数终态口径逐位吻合、005-010 现状字段补齐抽验吻合。审计员独立复现：filter 四门禁（lint 唯一 warning 属 transfer-renderer pre-existing 非本批）、knip exit 0（仅 4 条 3d 包既有登记债）、reconcile 逐字、9 处 live 抽查全中、提取深度感知对照（归一化 diff IDENTICAL）。

Follow-up:

- CX-13（WA-fadv-004/005，人工确认门）、CX-14（WA-fadv-001）、CX-11 扩围（WA-fadv-002/006/007）已插入 roadmap，各自由独立 plan 收口；WA-16 收口前处理。
- no remaining plan-owned work。
