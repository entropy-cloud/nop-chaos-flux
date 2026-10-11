# 562 workaround-audit WA-2 运行时层审计批（flux-action-core + flux-runtime）

> Plan Status: completed
> Last Reviewed: 2026-10-11
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-2 工作项，Phase Status 第 3 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`（统一方法）；先例：`docs/plans/561-workaround-audit-wa1-compile-formula-plan.md`（方法同构批首例）
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`（本批对象清单与 baseline 计数来源）；`docs/audits/workaround-code-smell/wa-1/report.md`（前批沉淀：误报排除清单互通、已收敛模式复核结论）

## Purpose

对运行时层两包（flux-action-core、flux-runtime，合计约 20.5k 行非测试源码）执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环（roadmap 自动修复契约）：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划。

## Current Baseline

- **对象清单**（WA-0 枚举器输出）：flux-action-core 2,087 行/11 文件、flux-runtime 18,420 行/84 文件（本批主对象；轨道内单包行数居 data/industrial 之后列第三）；两包字面标记（literalEn/literalZh）均为 0。
- **模式候选基线**（inventory per-module，仅线索非定案）：flux-action-core setTimeoutCandidates 2 处；flux-runtime typeBypass 1 处 + setTimeoutCandidates 5 处；silentCatch/keyRemount/domRaid/testEnvBranch 两包全零。
- **roadmap 显式排除档（本批必做全量取证）**：`flux-runtime` 的 `form-runtime*.ts` 文件族（live 21 个平铺文件）——历史教训记载过"19 文件合并为 5–6 模块"的意图但 live 未呈现收敛，**必须做全量 H 类（复制粘贴式增长）取证，不得按已收敛跳过**。
- **历史教训档（引用前须 live 复核）**：strip errors 六份合一、ajax 执行逻辑两份合一（`action-adapter.ts` ↔ `runtime-action-helpers.ts`——WA-1 批已证 value-adapter 是另一处独立重复）、surface 生命周期两份合一（dialog/drawer——归渲染器批复核）、`name` vs `dataPath` 双词汇（WA-1 已证三包零命中）。
- **live 可证档（只验证未复发）**：AbortController（`flux-runtime/src/abort-signal-helpers.ts` 在盘——验证 boolean cancelled/disposed 未复发）。
- **并行会话披露（本批特有前提）**：主工作树存在并行会话对 flux-runtime 的在途变更（runtime-factory.ts/scope.ts/runtime-dialogs-scope 测试，至拟制时点未提交；flux-action-core 干净）。**本批取证以 HEAD 提交态为基准快照**；全量门禁验证沿用 WA-1 的隔离 worktree 方法（HEAD+本批 diff）。**修复侧规则**：批内修复若触及在途未提交文件，不叠编辑——以 HEAD 快照在隔离 worktree 实施修复与验证，主树该文件留待并行会话收口后由其 owner 对账（或经协调后移植），报告就地注记。若并行会话在本批执行期间提交了对本批对象的变更，报告以取证时点快照为准并就地注记。
- **五门禁基线**：WA-1 收口（e44bd6965）隔离验证全绿。

## Goals

- `docs/audits/workaround-code-smell/wa-2/report.md`：两包逐条发现（prompt §6 单条 12 字段）+ 汇总五项 + 覆盖声明节。
- findings 全量登记 ledger（`WA-action-core-<seq>` / `WA-runtime-<seq>`），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修。
- 台账 modules 两行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发）。

## Non-Goals

- 结构性重构的批内实施（公共 API/包边界/编译期语义——CX-n + 人工确认载体）；form-runtime 文件族若坐实 H 类，其"合并为 5–6 模块"的结构性收敛以 CX-n 立案（涉 21 文件重组，plan-first），批内只做可独立收口的单点修复。
- 非本批包/模块的取证与修复。
- 与其他轨道重复立案（划界同 WA-1）；已登记 pre-existing 门禁红的重复立案。

## Scope

### In Scope

- `packages/flux-action-core/src/`、`packages/flux-runtime/src/` 全部非测试源码的取证（prompt §5 全量协议）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试。
- `docs/audits/workaround-code-smell/wa-2/report.md` + ledger 登记/翻转 + roadmap WA-2 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非本批包/模块的任何修改（含并行会话在途文件——发现其问题只登记转发，不越权修）。
- 结构性重构实施；playground 消费侧。

## Failure Paths

不适用（审计批无新增运行时错误处理面；修复项的失败行为随各发现的重构方向在报告内写明）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。每个 P0/P1 修复先写钉住现有正确行为的回归测试（红）→ 重构 → 绿；Proof 与 Fix 在同一修复项内合并表达（沿 plan 561 豁免先例）；修复后跑受影响包 `pnpm --filter <pkg> typecheck/build/lint/test`；批收口跑全量五门禁（隔离 worktree 方法）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: completed
Targets: `packages/flux-action-core/src/`、`packages/flux-runtime/src/`（读，HEAD 快照口径）、`docs/audits/workaround-code-smell/wa-2/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 第 1/2 步扫描复核（8 处候选逐个定性）+ 第 5 步门禁交叉核对 + 第 4 步重复块识别（**form-runtime\*.ts 文件族 21 文件全量 H 类取证为必做项**，两包范围归一化比对）+ 第 6 步抽读走读（action-core 调度全读；runtime 的 store/scope/字段运行时/动作执行/abort 管线走读）+ 第 7 步已收敛模式三档处置（AbortController live 复核）+ 第 8 步误报排除（与 wa-1 排除清单互通）。
- [x] Proof：每个立案候选 git 考古（出生 commit + message 症状性判定），逐条 W1–W6 判定；根因失传单独标注。
- [x] Decision：严重度 + ROI + 共性裁定（form-runtime 族 H 类坐实与否及其载体：批内单点修 vs CX-n 结构性收敛）。
- [x] Proof：`wa-2/report.md` 按模板落盘，findings 全量登记 ledger。

Exit Criteria:

- [x] `wa-2/report.md` 落盘且模板字段/汇总五项/覆盖声明齐备（覆盖含 form-runtime 族取证结论）。
- [x] ledger 与报告一一对应零遗漏；每行类别/严重度/位置/W 违约/去向齐备。
- [x] 每个立案有 git 考古读数；误报排除有对照理由。
- [x] 共性裁定落字（CX-n 插入或明示无）。

### Phase 2 - 批内自动修复（先红后绿）

Status: completed
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：逐项 P0/P1 修复（先红后绿 + 本体删除验证）；低成本 P2 当场修；其余显式去向。——裁定记录：本批 3 条 P1 与 3 条 P2 全部为多文件同根因复制沉积/包间契约发现（非单点行为缺陷），按契约 §2 归 CX-3/CX-4/CX-5（roadmap 已插入）；唯一批内修候选 WA-action-core-001（P3，三组逐字 case ~70 行）经裁量实施批内修：特征化测试 8 条先钉现状（先绿）→ fallthrough/helper 收敛（净删 54 行）→ 复跑同绿，本体删除验证 + 类别清扫落报告《批内修复记录》。
- [x] Proof：每项修复后受影响包 filter 四门禁；类别清扫 grep 全类兄弟。——flux-action-core typecheck/build/lint/test 220/220 全绿。

Exit Criteria:

- [x] 红→绿证据在案，无"只修不加测试"；本体删除验证逐项落字。——P3 行为保持修的证据形态=特征化测试先钉后改（同套前后全绿）；P0/P1 无批内修项（全数 CX-n 显式去向，零静默）。
- [x] filter 级四门禁通过；批 closure 前台账无残留 `found` 未处置的 P0/P1。——reconcile 未处置=0；P1 三条均 successor-required 显式去向。

### Phase 3 - 回写与收口

Status: completed
Targets: roadmap、ledger、dev log

- Item Types: `Proof`

- [x] Proof：台账 modules 两行翻转 `audited`；reconcile 通过。
- [x] Proof：转 `active` 时 roadmap WA-2 回写 `todo → planned`；`planned → done` 属 Closure Gates 收口动作。
- [x] Decision：批内修复行 `fixed → verified` 归属——closure 复检通过当场翻转（WA-action-core-001 于本收口 commit 翻转 verified，复检证据=closure audit agent_944a328c 三组收敛逐字等价核对 + 测试实跑）。
- [x] Proof：dev log 记录发现/修复/门禁计数。

Exit Criteria:

- [x] reconcile exit 0 且 wa-2 报告存在。
- [x] roadmap WA-2 行 `todo → planned` 已落。
- [x] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_84b14963-b6ed-4d77-bbed-03b99e24ea41，review-only）
- Verdict: `revised`（零 Blocker、1 Major、2 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** "本轨道最大单包"声称与 live 不符（最大为 flux-renderers-data 22,319，runtime 18,420 列第三）→ 改为准确排序表述；**m1** 修复侧在途文件快照基准规则补写（触及在途文件不叠编辑，隔离 worktree 实施修复，报告注记）；**m2** Related 补 inventory modules.json 引用。审查员 15 项声称-实况对账全部 live 复现通过（含 8 候选计数、form-runtime 21 文件、abort-signal-helpers 在盘、并行会话 3 在途文件实证）；四个特别审查点全部通过（form-runtime 处置忠实 roadmap 三档、隔离方法对冲充分、豁免链 560→561→562 有据、差异面真实重写非复制）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（批内修 P0/P1 红→绿收口；结构性/共性以 CX-n 显式去向）——本批 P0/P1 均为多文件同根因复制沉积/包间契约发现，非单点行为缺陷，按契约 §2 显式归 CX-3/CX-4/CX-5（roadmap 已插入），零静默
- [x] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向）——WA-runtime-001 跨包字符串契约弱点=CX-4；其余 9 条台账去向四态齐备
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（批内修项特征化测试先钉后改 220/220 + filter 四门禁）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（reconcile 未处置=0，violations=0）
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-2 回写 + CX-3/4/5 插入 + dev log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 approved（agent_944a328c-e8ff-40db-ab14-a1373e419383，0B/0M/3m，3 Minor 已随收口 commit 修正；审计员自建隔离 worktree 独立复现五门禁全绿）
- [x] `pnpm typecheck`（隔离 worktree 口径，见 Current Baseline 并行会话披露——`../wa2-verify` HEAD+本批 7 文件 diff，exit 0）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0；唯一 warning 在 flux-renderers-data 属 HEAD 既有非 error）
- [x] `pnpm test`（同上，exit 0；playground 452/452、form-advanced 1150/1150 等）
- [x] `pnpm check`（同上，exit 0）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- （如共性裁定触发 CX-n，其执行归 CX-n plan；本节收口时按实际填写。）

## Closure

Status Note: 2026-10-11 收口。两模块（flux-action-core 11 文件/2,087 行 + flux-runtime 84 文件/18,416 行 HEAD 口径）prompt §5 全量取证完成，10 findings 全量登记台账且去向四态零静默（fixed 1 / successor-required 6→CX-3/4/5 / watch-only 3）；唯一批内修候选 WA-action-core-001 已实施（特征化 8 条先钉后改、净删 54 行、filter 四门禁 220/220）；全量五门禁经隔离 worktree（HEAD+本批 7 文件）验证 exit 0，并由 closure auditor 独立重建复现全绿。form-runtime 族 H 类坐实但结构性收敛归 CX-3；包间契约发现归 CX-4/CX-5（执行前人工确认门）。roadmap WA-2 → done。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_944a328c-e8ff-40db-ab14-a1373e419383，review-only）
- Evidence: closure audit R1 `approved`（0 Blocker / 0 Major / 3 Minor，Minor 均随本收口 commit 修正：①plan Phase 3 dev log 勾选滞后补勾；②误报排除计数 25→28（§4 实表行数）；③首版"审计 worktree 已拆除"注记失实——已实际拆除 /tmp/wa2-audit 并 prune）。审计员独立复核：自建隔离 worktree（HEAD e44bd6965+本批 7 文件）冷跑五门禁全绿（typecheck 42/42、build 42/42、lint exit 0、test 78/78 含 1 例并行抖动单跑复绿、check exit 0）；built-in-actions 三组收敛逐字等价 + 21 case 无丢失；8 条特征化断言实读 + filter 四门禁 220/220 实跑；ledger↔report 一一对应；reconcile 独立实跑计数吻合；CX-3/4/5 行字段齐备；P1 三条"非单点行为缺陷"定性核验成立（无静默降级）；下游 `requires args payload` 零耦合 grep。

Follow-up:

- CX-3（WA-runtime-002/003/004/005）、CX-4（WA-runtime-001）、CX-5（WA-action-core-002）已插入 roadmap，各自由独立 plan 收口；WA-16 收口前处理。
- no remaining plan-owned work。
