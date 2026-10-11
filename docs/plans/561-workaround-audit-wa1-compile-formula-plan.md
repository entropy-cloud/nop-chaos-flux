# 561 workaround-audit WA-1 编译与公式层审计批（flux-core + flux-formula + flux-compiler）

> Plan Status: completed
> Last Reviewed: 2026-10-11
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-1 工作项，Phase Status 第 2 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`（统一方法）；基建先行例：`docs/plans/560-workaround-audit-wa0-infra-plan.md`
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`（本批对象清单：flux-core 9,202 loc/71 文件、flux-formula 3,515 loc/20 文件、flux-compiler 7,762 loc/40 文件，批次 WA-1）

## Purpose

对编译与公式层三包（flux-core、flux-formula、flux-compiler，合计约 20.5k 行非测试源码）执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环（roadmap 自动修复契约）：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划。

## Current Baseline

- **对象清单**（WA-0 枚举器输出，2026-10-11）：flux-core 9,202 行/71 文件、flux-compiler 7,762 行/40 文件、flux-formula 3,515 行/20 文件；三包字面标记（literalEn/literalZh）均为 0——本批重心是无标记隐式临时方案（特判/兜底/延迟/断言/复制粘贴）。
- **模式候选基线**（inventory per-module，仅线索非定案）：flux-compiler typeBypass 10 处、flux-formula typeBypass 2 处、flux-core typeBypass 1 处 + setTimeoutCandidates 1 处；silentCatch/keyRemount/domRaid/testEnvBranch 三包全零。
- **既有门禁线索源**：`check:audit-*` 族 16 项（suspects / async-failure-paths / hardcoded-type-dispatch / runtime-raw-schema-reads 等对本批范围的输出作候选线索）；已登记 pre-existing 红不重复立案，但可被本审计升级定性。
- **已收敛模式清单**（roadmap 基线节，各档处置不同）：live 可证档（createLazyLibLoader、AbortController helpers——本批只验证未复发，不重新立案）；出处为历史教训档（strip errors 六份合一、ajax 执行逻辑两份合一、surface 生命周期两份合一、`name` vs `dataPath` 等双词汇统一——批内引用前必须 live 复核收敛仍在位，复发按新发现立案）；明确不按已收敛处理（`flux-runtime` 的 form-runtime 文件族——**不属本批**，归 WA-2）。
- **保护区警示**：flux-core/src/ 与 Schema/contract validation 在 `docs/context/ai-autonomy-policy.md` Protected Areas 表内——mission description 已授权保护区代码变更，但**结构性重构**（公共 API/包边界/编译期语义）执行前需人工确认，本批此类发现一律以 CX-n 立案不批内硬修。
- **五门禁基线**：2026-10-11 full-green（WA-0 收口 commit 9f7087aac 实测）。

## Goals

- `docs/audits/workaround-code-smell/wa-1/report.md`：三包逐条发现（prompt §6 单条 12 字段）+ 汇总五项（转正清单/重复热区/Top 重构建议/误报排除清单/范围整体判断）+ 覆盖声明节（三模块 audited 依据）。
- findings 全量登记 `docs/audits/workaround-code-smell/ledger.md`（ID `WA-core-<seq>` / `WA-formula-<seq>` / `WA-compiler-<seq>`），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复（回归测试钉住现有正确行为 → 重构 → 绿），逐项验证临时方案本体删除；P2 低成本（约 15 分钟内）当场修。
- 台账 modules 三行翻转 `audited`，`pnpm workaround:reconcile` 结构校验通过。
- 共性/结构性发现以 CX-n 工作项插入 roadmap Phase Status（如触发）。

## Non-Goals

- 结构性重构的批内实施（公共 API、包边界、编译期语义——CX-n + 人工确认载体）。
- `flux-runtime` 及其他任何非本批包的取证与修复（后续批次）。
- 与其他轨道重复立案：概念级重复/文件过大/过度拆分（refactor-discovery 轨道）、交互/视觉/DOM 契约（对应轨道）——交叉发现登记转发不扩范围。
- 已登记 pre-existing 门禁红的重复立案。

## Scope

### In Scope

- `packages/flux-core/src/`、`packages/flux-formula/src/`、`packages/flux-compiler/src/` 全部非测试源码的取证（prompt §5 全量协议：字面/模式扫描复核 → git 考古 → 重复块识别 → 抽读走读 → 误报排除）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试。
- `docs/audits/workaround-code-smell/wa-1/report.md` + ledger 登记/翻转 + roadmap WA-1 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非本批包/模块的任何修改（含 playground 消费侧）。
- 结构性重构实施。
- 批次报告目录外的 audits 文档重组。

## Failure Paths

不适用（审计批无新增运行时错误处理面；修复项的失败行为随各发现的重构方向在报告内写明）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1：批内修复均属"必须自动化"档）。每个 P0/P1 修复先写钉住现有正确行为的回归测试（红）→ 重构 → 绿；Proof 与 Fix 在同一修复项内合并表达（先红后绿顺序在 Phase 2 首项 Fix 内硬性写明，Exit Criteria 要求红/绿两次实跑结论——形式上不再单列 Proof 项，沿 plan 560 豁免说明先例）；修复后跑受影响包 `pnpm --filter <pkg> typecheck/build/lint/test`；批收口跑全量五门禁（Closure Gates）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: completed
Targets: `packages/flux-core/src/`、`packages/flux-formula/src/`、`packages/flux-compiler/src/`（读）、`docs/audits/workaround-code-smell/wa-1/report.md`、`docs/audits/workaround-code-smell/ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 第 1/2 步扫描复核（inventory 基线 14 处候选逐个打开定性，禁按 grep 定案）+ 第 5 步门禁交叉核对（`check:audit-*` 对三包输出作线索源）+ 第 4 步重复块识别（三包范围归一化比对，`_tmp/` 探针辅助、人工复核同构性）+ 第 6 步抽读走读（每包核心实现文件全读：flux-core 的 schema/scope/编译入口、flux-compiler 的编译管线、flux-formula 的公式引擎；捕捉 grep 抓不到的信号）。
- [x] Proof：每个立案候选做 git 考古（`git log -L`/`blame -L` 出生 commit + message 症状性/根因性判定），逐条落 W1–W6 违约判定；指不出根因的标注"根因失传"。
- [x] Decision：逐条严重度裁定（P0–P3）+ ROI 裁定（批内修/CX-n/watch-only/successor-required/withdrawn/n-a）+ 共性裁定（同根因 ≥2 模块或跨包机制 → CX-n 插入 roadmap）。
- [x] Proof：`wa-1/report.md` 按模板落盘（含覆盖声明节），findings 全量登记 ledger（`WA-core/formula/compiler-<seq>`）。

Exit Criteria:

- [x] `wa-1/report.md` 落盘且模板 12 字段逐条齐备、汇总五项齐备、覆盖声明覆盖三模块全量文件清单（inventory 口径）。
- [x] ledger findings 行与报告一一对应零遗漏；每行类别/严重度/位置/W 违约/去向齐备。
- [x] 报告内每个立案有 git 考古读数（出生 commit hash），每个"误报排除"有 §2/W1-W6 对照理由。
- [x] 共性裁定结论落字（有 CX-n 则 roadmap Phase Status 已插入对应行，无则明示"本批无共性发现"）。

### Phase 2 - 批内自动修复（先红后绿）

Status: completed
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：逐项 P0/P1 修复——每个发现先写回归测试钉住现有正确行为（红：临时方案存在说明该行为无测试约束），再根因修复转绿，并验证临时方案本体已删除（特判分支/延迟/断言/注释化石，禁"只加新层不清旧层"）。
- [x] Fix：低成本 P2（约 15 分钟内）当场修；其余 P2/P3 按裁定登记去向四态（本批 P2 WA-core-002 超 15 分钟面 → 并入 CX-1；P3 ×3 watch-only 零静默）。
- [x] Proof：每项修复后跑受影响包 `pnpm --filter <pkg> typecheck/build/lint/test`；全部通过才进行下一项（compiler 558/558 + core 655/655 + 双包 typecheck/lint 全绿）。
- [x] Proof：台账修复行标 `fixed` + 引用 commit；类别清扫强制——修任一实例必 grep 全类兄弟（`invalid-reaction-immediate` 发射点全仓收敛为 1 处；validateRootPathArray 家族 3 份全部收敛，无残留兄弟）。

Exit Criteria:

- [x] 全部批内修项红→绿证据在案（测试名 + 红/绿两次实跑结论），无"只修不加测试"（reaction-field 13 用例：红 3 failed → 绿 13 passed；实跑记录见报告修复记录节）。
- [x] 临时方案本体删除验证逐项落字（删了什么分支/断言/延迟，grep 复核无残留）。
- [x] 受影响包 filter 级四门禁逐项通过。
- [x] 批 closure 前台账无残留 `found` 未处置的 P0/P1（P1 ×3：1 fixed + 2 successor-required 显式去向）。

### Phase 3 - 回写与收口

Status: completed
Targets: roadmap、ledger、dev log

- Item Types: `Proof`

- [x] Proof：台账 modules 三行翻转 `audited`；`pnpm workaround:reconcile` 结构校验通过（audited 3 / uncovered 46 / findings 7 = found 6 + fixed 1 / 未处置 0 / violations 0）。
- [x] Proof：draft review 通过转 `active` 时 roadmap WA-1 回写 `todo → planned`（已落）；closure audit 通过后的 `planned → done` 属 Closure Gates 收口动作。
- [x] Decision：批内修复行的 `fixed → verified` 推进归属——批 closure 复检（五门禁 + 独立 closure audit）通过后当场翻转 `verified`（台账行注复检证据）；不复检翻转的显式裁定留 WA-16 并在台账 note 记录。**裁定：WA-compiler-001 随本批 closure 五门禁全绿 + closure audit 通过当场翻转 verified。**
- [x] Proof：dev log 记录本批发现计数/修复计数/五门禁结果。

Exit Criteria:

- [x] reconcile exit 0 且 wa-1 目录报告存在。
- [x] roadmap WA-1 行 `todo → planned` 回写已落（`planned → done` 在 closure audit 通过时随收口 commit 落，见 Closure Gates）。
- [x] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_0b7942a1-afbd-48ab-b38a-c84a2b1eec66，review-only）
- Verdict: `pass-with-minors`（零 Blocker、零 Major、4 Minor）
- Rounds: 1
- Findings addressed: Blocker/Major 零条；全部事实性声称（loc/文件数/14 候选/16 门禁/commit hash/保护区/mission 授权）live 复核成立。4 Minor 共识修订（转 active 前落盘）：m1 Phase 3 closure 回写时序环消除（`planned → done` 移入 Closure Gates 语义，沿 plan 560 先例）；m2 Test Strategy 补 Proof/Fix 同项合并豁免说明；m3 补批内修复 `fixed → verified` 推进归属 Decision（closure 复检通过当场翻转或显式留 WA-16，不允许悬空）；m4 历史教训档列举补全四项（surface 生命周期两份合一、`name`/`dataPath` 双词汇统一）。审查员裁定本 plan 为"契约忠实度高的审计→报告→修复→回写闭环批"，约 20.5k 行/131 文件可由单 report.md + ledger 收口。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（Phase 1 立案且裁定批内修的 P0/P1 全部红→绿收口：WA-compiler-001 两部分修复，WA-core-001/002 与 WA-formula-001 按 CX-n 显式去向）
- [x] 所有 in-scope confirmed contract drifts 已收敛（或以 CX-n/successor 显式登记去向：诊断码 union 增量收敛；repeatedTemplates 死字段→CX-2 显式去向）
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（批内修项红→绿证据 + filter 四门禁：compiler 558/558、core 655/655、双包 typecheck/lint 绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（P2/P3 均有显式去向：CX-1×2/watch-only×3，Deferred 节落账）
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-1 回写 + CX-1/CX-2 插入 + dev log；修复未改架构语义——诊断码为增量扩展，schema-compiler 文件头 doc 注释已随提取更新，无 architecture doc 需改）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（R1 approved，证据见 Closure Audit Evidence）
- [x] `pnpm typecheck`（隔离 worktree 42/42；主树同绿）
- [x] `pnpm build`（隔离 worktree 42/42；主树同绿）
- [x] `pnpm lint`（隔离 worktree 42/42；主树同绿）
- [x] `pnpm test`（隔离 worktree 78/78 任务；主树同绿）
- [x] `pnpm check`（**隔离 worktree（HEAD+本批 diff）exit 0**；主树 exit 1 唯一来源 = 并行会话在途 `packages/flux-runtime/src/runtime-factory.ts` 701>700——非本批改动、非本批范围（flux-runtime 归 WA-2），隔离验证证明本批 diff 零门禁红；顺带消解 `isUnresolvedFinding`/`LedgerFindingRef` 死导出（主树 knip cache 陈旧假绿，隔离环境抓真实红，forward-only 修正））

## Deferred But Adjudicated

### WA-formula-001 + WA-core-002（编译公式层复制沉积）

- Classification: `out-of-scope improvement`（对 Phase 2 修复面而言）——非本批单点修复面能收口的跨包/多份提取
- Why Not Blocking Closure: 两项均为行为保持的重构候选（无 live defect），按 roadmap 契约 §7 以 CX-1 拟制独立修改计划（已插入 roadmap Phase Status，处理时机 WA-16 前），successor 所有权明确不悬空
- Successor Required: `yes`
- Successor Path: CX-1（roadmap Phase Status 行，pending plan 拟制）

### WA-core-001（repeatedTemplates 空壳契约字段）

- Classification: `out-of-scope improvement`——公共 API 删除属结构性重构，契约 §7c 要求执行前人工确认
- Why Not Blocking Closure: 空壳字段无运行时行为影响（恒空 Map），删除走 deprecated-feature-cleanup 流程 + 人工确认门，已以 CX-2 登记（roadmap Phase Status 行），转正清单项获得显式去向
- Successor Required: `yes`
- Successor Path: CX-2（roadmap Phase Status 行，pending plan 拟制 + 执行前人工确认门）

## Non-Blocking Follow-ups

- （如共性裁定触发 CX-n，其执行归 CX-n plan；本节收口时按实际填写。）

## Closure

Status Note: 2026-10-11 收口。三 Phase 全 completed：WA-1 三包（131 文件/20,479 行）全量取证 → 7 条立案（P1×3/P2×1/P3×3，根因失传 0，误报排除 25 项在案）→ 批内修复 WA-compiler-001（validateRootPathArray 原语收敛 3 份 + 诊断码误标修正，红→绿 13/13、compiler 558/558、core 655/655）→ CX-1/CX-2 插入 roadmap（successor 显式、零静默）→ 台账三模块 audited + reconcile 通过。范围整体判断：编译公式层零星个案非系统性。执行期披露：主工作树存在并行会话在途变更（form target/runtime-factory/crud/scope 等），全量五门禁经隔离 worktree（HEAD+本批 diff）验证全绿并被 closure auditor 独立复现；顺带消解 WA-0 遗留 isUnresolvedFinding/LedgerFindingRef 死导出（knip cache 陈旧假绿的 forward-only 修正）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（general-purpose fresh session，agent_daec2974-da7b-4b0f-8df9-5f5ba71b9c92）
- Evidence: R1 `approved`（零 Blocker/零 Major/3 Minor 均随本收口 commit 修正）。关键复现：①隔离 worktree 五门禁全绿（typecheck/build/lint --force 真实执行 42/42×3、test 忠实命令 78/78、check 真退出码 0）；②测试判别力动态实证——回退两源文件至 HEAD 保留新测试 → 恰好 4 failed、9 特征化全绿；③修复本体三连验证（手写循环零残留/表驱动单点/`invalid-reaction-immediate` 发射点全仓 1 处）；④reconcile 亲跑与三处声称逐字一致；⑤git 考古抽核实锤（c6a3245a2、`repeatedTemplates.set` 全历史零命中）；⑥预写边界确认通过（无 done/completed 预写，WA-0 标记的时序 Minor 未复发）。

Follow-up:

- CX-1（编译公式层复制沉积收敛批）与 CX-2（repeatedTemplates 契约字段移除，执行前人工确认门）——见 roadmap Phase Status 对应行。
- WA-compiler-002（asRuntimeValue 接缝半程收口）watch-only，随 compiler 包下次触碰顺带。
