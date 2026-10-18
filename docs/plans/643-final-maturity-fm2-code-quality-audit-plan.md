# 643 最终成熟度审计 FM-2：代码质量与反模式终审批（code-quality + workaround 残余复核 + deep-audit 核心维度 + adversarial 抽查）

> Plan Status: completed
> Last Reviewed: 2026-10-18
> Source: `docs/backlog/final-maturity-audit-roadmap.md` FM-2；`missions/final-maturity-audit.json` T2.1；口径 = `docs/skills/code-quality-audit-prompt.md`（主）+ `docs/skills/workaround-code-smell-audit-prompt.md`（残余复核）+ `docs/skills/deep-audit-prompts.md`（核心维度子集）+ `docs/skills/open-ended-adversarial-review-prompt.md`（抽查）
> Related: `docs/plans/642-final-maturity-fm0-table-interaction-plan.md`（completed，台账结构先例）；`docs/plans/628-deep-audit-remediation-plan.md`（active，去重对照）；`docs/audits/workaround-code-smell/ledger.md`（残余输入）

## Purpose

收官轮代码面终审：按 code-quality 口径对核心五包与抽样面跑最后一轮（真实实现质量导向，七维度；未抽样包由信号驱动 adversarial 覆盖），对 workaround 台账的 watch-only / successor-required 残余逐条现场复核，叠加 deep-audit 核心维度（contract drift / 死代码 / 错误吞噬）与 adversarial 信号驱动抽查。发现全部三态归族（P0/P1 当批消化、P2/P3 → FM-6/FM-7/watch-only），落 `docs/audits/final-maturity-audit/` 台账。审计批次本体是取证与归族，不以修复为主要交付面。

## Current Baseline（2026-10-18 live 核对）

- **workaround 残余**：`docs/audits/workaround-code-smell/ledger.md` findings 表实况 = 169 verified + 51 found（脚本按 status/disposition 列逐行统计）；51 条 found = 44 watch-only + 6 successor-required + 1 n-a（WA-form-010 排除记录）。FM-2 复核面 = 51 条 found 中的 50 条显式「不修」处置项（n-a 除外；roadmap 定义"真实残余"）——WA-0–WA-16 批次已全部 done，这些是终态裁定行非在途记录。
- **plan 628（active，去重对照）**：已登记并拥有——核心架构类型债（schema-renderer 失败态类型伪造、runtime.ts `any`、flux-react 双重断言 19 处、边界 devDep 耦合×2、依赖集归一化双层、宽门面两处、编译无跨实例缓存）；静态债全量 triage（knip 949 条 / scanner 七类 2,093 / duplicates 597-2.99% / 超大文件 103 个）；文档自认功能缺口（错误处理 5 缺口、monitor 事件、surface 生命周期、mobile 基础类、i18n runtime、picker 多选、ui package description 失配、node_modules 残留、taskflow/view 模式）以及 C 节的薄弱测试包 triage、flux-compiler 测试归位 `__tests__/`。**FM-2 审计发现与上述清单重叠时只注记归属不重复立案；重叠判定以 628 In Scope 全节为准**。xlang 域属并发会话领地（已收口 plan 621/2474 item 20，残余归其后续）——FM-2 排除 `packages/flux-xlang-*` 深审（撞见仅登记）。
- **审计脚本全家已在门禁常开**：`pnpm check` 含 audit-suspects / runtime-raw-schema-reads / renderer-metamodel-residue / styling-suspects / test-global-leaks 等 ratchet（exit 0 基线 2026-10-18 实测）；`audit:knip` / `audit:mutants` / `audit:semgrep` / `audit:react-doctor` 可手动跑，输出对照各自 baseline 判新增。ratchet 内的存量登记债归 628 triage，FM-2 不重扫。
- **既有台账面**：`docs/audits/final-maturity-audit/` 已建立（FM-0 批，FM-001–007）；`docs/audits/workaround-code-smell/`（本批输入）；interaction-state / dom-structure 队列全 done（不接管）。
- **门禁基线**：master @ ba222ad67；typecheck 42/44（playground vite.config 既有红，归 628）、test 82/82 全绿、lint 44/44、check exit 0。

## Goals

- 50 条 workaround 残余处置项（44 watch-only + 6 successor-required）逐条现场复核完毕：每条得出「继续 watch 有效 / 条件已消（转 verified）/ 记录失效（勘误）/ 复活为真实缺陷（立案）」四值结论，台账同步。
- code-quality 七维度终审产出 findings 报告（P0–P3 + 位置 + 风险 + 修复方向），覆盖核心运行时（flux-core/flux-compiler/flux-runtime/flux-action-core/flux-react）与渲染器包抽样（data/basic/form 家族 + scheduling/content/layout 新包抽查）。
- deep-audit 核心维度（contract drift / 死代码 / 错误吞噬）+ adversarial 信号驱动抽查完成，findings 并入同一报告。
- 全部发现三态归族落台账；P0/P1 当批修复（不触保护区域，先红后绿）；P2/P3 归族 FM-6/FM-7/watch-only。
- 与 628/621/FM-0 去重注记完整（不双记账）。

## Non-Goals

- 628 已拥有的登记项的修复（类型债清偿、静态债收缩、文档缺口落地——归 628 生命周期）。
- ratchet 基线内的存量静态债重扫与收缩（归 628 Phase 静态债 triage）。
- xlang 域深审；FM-3 测试保护力（另批）；FM-4 react19/运行时门禁复核（另批——本批 react19 维度仅记录明显信号不展开）。
- 大规模重构（架构深化不进本轮）。
- code-quality 七维度中 §5 测试有效性 / §7 自动化覆盖面仅作服务实现质量判断的记录面，发现注记 FM-3/FM-4 归属不展开（同 react19 维度收窄口径）。

## Scope

### In Scope

- workaround 残余 50 条现场复核 + 台账回写。
- 核心五包（flux-core/flux-compiler/flux-runtime/flux-action-core/flux-react）全量 + flux-renderers-{data,basic,form} 抽样 + flux-renderers-{content,layout,scheduling} 新包抽查的 code-quality 七维度审计 + deep-audit 核心维度 + 全仓信号驱动 adversarial 抽查（未抽样包不作全维度结论），报告落 `docs/audits/final-maturity-audit/fm2-code-quality-report.md`。抽样清单由执行会话裁定并在报告开篇记录抽样面与理由（可对账）。
- P0/P1 缺陷当批修复（含判别测试先红后绿），P2/P3 归族登记。
- `docs/audits/final-maturity-audit/ledger.md` 新增 FM-2 批条目；roadmap/mission 回写。

### Out Of Scope

- 628 领地（见 Baseline）；e2e/视觉面（FM-1/FM-5）；测试保护力审计（FM-3）；运行时门禁复核（FM-4）。

## Failure Paths

| 编号           | 触发                                           | 行为                                                                                     | 可重试 | 用户可见表现 |
| -------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------- | ------ | ------------ |
| residual-stale | watch-only 条目的观察前提已消失（代码已重构）  | 台账该行转 verified + 勘误注记；不新立案                                                 | 是     | 无           |
| residual-alive | 复核发现 watch 项实际是活缺陷（P0/P1）         | 升级立案进 FM-2 findings，按 P0/P1 当批修复纪律处理；原 workaround 行注记升级去向        | 是     | 视缺陷       |
| overlap-628    | 新发现与 628 登记项同源                        | 台账注记「owned by 628」不重复立案；若严重度高于 628 登记时口径，注记升级建议归 628 评审 | 是     | 无           |
| protected-area | P0/P1 修复触及保护区域（flux-core 编译内核等） | 按 ai-autonomy-policy 停止修复、仅立案归族（successor = 独立 plan），披露于台账          | —      | 无           |

## Test Strategy

档位选择（三选一）：`建议有测`

本档选择：**建议有测**——审计批次本体以证据（报告 + 台账 + 复核记录）为交付；当批 P0/P1 修复按 Fix 纪律携带判别测试（先红后绿）。复核与审计产出本身无新行为，不需要新测试面。

## Execution Plan

### Phase 1 - workaround 残余现场复核（50 条）

Status: completed
Targets: `docs/audits/workaround-code-smell/ledger.md`、`docs/audits/final-maturity-audit/ledger.md`

- Item Types: `Proof | Follow-up`

- [x] Proof：fresh sub-agent 按包族分片并行逐条复核（core 五包 / renderers 三家族 / 其余，分片表合并；输入 = 台账行 + live code；每条结论必须给 live file:line + 复核时点的当前状态引文——不得复述台账原文）；四值结论分布（继续 watch / 转 verified / 记录失效 / 复活立案）在结果表汇总可数；结果落 `docs/audits/final-maturity-audit/fm2-workaround-residual-review.md`。
- [x] 台账回写（列操作逐值定义）：继续 watch 有效 → 该行 note 增补「FM-2 复核仍有效（日期）」；条件已消转 verified → status 置 `verified` + note 注记「FM-2 复核：观察前提已消」（与该台账 verified=复检通过语义一致）；记录失效 → disposition 置 `withdrawn` + note 勘误；复活立案 → 本批 FM-2 findings 立案 + 原行 note 注记升级去向。回写后运行 `pnpm workaround:reconcile` 验证台账一致。

Exit Criteria:

- [x] 50/50 条有四值结论与 live 证据指针（still-watch 48 / resolved 2 / stale 0 / revived 0）；`pnpm workaround:reconcile` 通过（violations 0、uncovered 0；报告 `fm2-workaround-residual-review.md` + 分片文件）；台账回写多面一致（2 行转 verified 清 disposition，48 行 note 增补复核戳）。

### Phase 2 - code-quality 七维度终审 + deep-audit 核心维度

Status: completed
Targets: 核心五包 + 渲染器抽样、`docs/audits/final-maturity-audit/fm2-code-quality-report.md`

- Item Types: `Proof`

- [x] Proof：fresh sub-agent 按包族/维度分片并行审计（分片表合并后由执行会话做一轮合并复核），口径 = code-quality 七维度（P0–P3 + Overall Assessment + Automation 三分类输出）+ deep-audit 核心维度（执行期映射到 deep-audit-prompts.md 维度号并记录于报告：contract drift ≈ 03 契约一致性 + 16 文档-代码一致性；死代码 ≈ 02 + 23 相关面；错误吞噬 ≈ 19 错误传播保真度）；范围 = 核心五包全量 + 渲染器抽样/新包抽查（抽样面记录于报告）；与 628 登记项去重。deep-audit 口径的阶段二「独立子 agent 维度复核」简化为执行会话合并复核（就地记录，不声称全口径执行）。
- [x] 报告落盘（`docs/audits/final-maturity-audit/fm2-code-quality-report.md`：分片 D 核心五包 0P0/2P1/3P2/5P3 + 分片 E 渲染器抽样 0P0/0P1/3P2/9P3 + 628 去重注记 + 抽样记录）。

Exit Criteria:

- [x] 报告覆盖七维度与五维映射（03/16/02/23/19），findings 有 live 位置证据，628 去重注记完整（11 条归属 + 错误处理同族注记）。

### Phase 3 - adversarial 信号驱动抽查

Status: completed
Targets: 信号热点（错误处理路径、竞态窗口、边界收口、并发写）、报告并入 Phase 2 文件

- Item Types: `Proof`

- [x] Proof：fresh sub-agent 对 6 个信号热点完成证伪式审查（fragment-scope 状态机/form-runtime 验证链/编译缓存/action 执行链/quick-edit 链/form-store summary）；5 条新发现（2 P2 + 3 P3）+ 2 热点 verified-clean。
- [x] findings 并入报告 §Adversarial + Shard F（FM-010/011/012/019/020 立案；两个 P1 信号确认与主报告一致）。

Exit Criteria:

- [x] 抽查覆盖 6 个信号热点（≥5），findings 有证据；2 个热点记录"查证过无问题"（五类攻击序列收敛）。

### Phase 4 - 归族消化（P0/P1 当批 + 三态登记）

Status: completed
Targets: 视 findings 而定；`docs/audits/final-maturity-audit/ledger.md`

- Item Types: `Fix | Follow-up`

- [x] Fix：P1-1 编译缓存二级 WeakMap（runtime 身份键）。判别测试（closure audit R1 Major-1 要求的真判别）：`compile-cache-runtime-identity.test.ts` 直调 `normalizeNodeInput` 断言同 schema 对象在两 runtime 下各自内嵌自己的组件（`node.component.component`）——旧单级缓存实测红（临时回退实验在案）、新实现绿。机制勘误（R1）：组件与 providerPlan 均为**编译期内嵌**（`compiled-renderer-contract.ts:67`/`node-renderer-resolved.tsx:401`），渲染路径零 registry 组件查找——初版"渲染期 context 解析"归因有误已就地勘误；`schema-renderer-compile-cache.test.tsx` 保留为渲染路径守卫（其走 per-instance useMemo、对模块缓存无判别力，已在测试头注说明）。
- [x] Fix：P1-2 validateRegisteredChildren 套用 V18/M-09 收口（AbortError 透传 + 诊断缝 + form-level error）；判别红→绿（旧实现裸 reject 必挂；flux-runtime 1543/1543 全绿）。无 P0；无保护区域触发。
- [x] 台账登记：FM-008–FM-021 共 14 条三态归族（fixed 2 / verified 1 [FM-015 兼 watch-only 热点观察 disposition] / watch-only 3 / local→FM-6 候选 7 [含 FM-021 批量行] / systemic→FM-7 候选 1）；Phase 1 复活项 0。

Exit Criteria:

- [x] P0/P1 全部修复且判别绿（P1-2 红→绿实测；P1-1 真判别测试旧缓存红/新实现绿，临时回退实验在案；无 protected-area 触发）；台账 FM-2 批 uncovered=0。

### Phase 5 - 回写收口

Status: completed
Targets: roadmap、mission、daily log

- Item Types: `Proof`

- [x] 回写：roadmap FM-2 行 `done` + Plan 列 643 + `Last Updated`；mission T2.1 `done`；daily log 收口记录——随本收口提交落盘。

Exit Criteria:

- [ ] 多面回写一致。

## Draft Review Record

- Reviewer / Agent: agent_e2a89719（fresh session 独立子 agent，两轮）
- Verdict: `pass-with-minors`（R1 fail 0B/3M/5m → 全量修订 → R2 pass-with-minors 0B/0M）
- Rounds: 2
- Findings addressed: R1-M1 "51 条 found 不在复核面"定性自相矛盾 → 两维表述（169 verified + 51 found = 44 watch-only + 6 successor-required + 1 n-a；复核面 = 50 条显式不修处置项）；R1-M2 In Scope "全仓"与抽样实况落差 → 精确覆盖面 + 抽样清单授权执行期裁定并记录报告开篇；R1-M3 Phase 1/2 单 agent 工作量 → 包族分片并行 + live file:line/时点引文/禁复述台账原文 + 四值分布可数 + deep-audit 阶段二简化就地记录 + 维度号映射钉死；m1 §5/§7 收窄句；m2 维度映射；m3 四值列操作逐值定义 + workaround:reconcile 验证点；m4 628 C 节两项补充 + In Scope 全节兜底；m5 Closure 骨架节；R2 m-R2-1 Purpose "全仓"措辞修正（随手落）。

## Closure Gates

- [x] 50 条残余复核完成且回写（四值结论 + 证据）
- [x] code-quality 报告落盘（七维度 + 五维映射 + adversarial，去重注记完整）
- [x] P0/P1 修复判别绿（或 protected-area 立案披露）
- [x] 台账 FM-2 批登记完毕，uncovered=0
- [x] owner docs 与 live 一致（修复未触及公共契约面——P1-1 为内部缓存结构、P1-2 为错误收口语义与在册注释声称一致；无需 owner doc 更新）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（P2/P3 归族各有台账行与 FM-6/FM-7/628 去向）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（42/44 为执行方运行时点数——分母随并发在途任务波动；closure R2 复核实测 43/44，唯一红 = playground vite.config 既有登记红不变）
- [x] `pnpm build`（唯一红 = 同一既有登记红）
- [x] `pnpm lint`（44/44 绿）
- [x] `pnpm test`（exit 0 全任务绿）
- [x] `pnpm check`（exit 1：+9 全部来自并发 xlang 提交 176032924..cfd966ee9——async-without-failure-path ×3（xlang-debug-mock-server.mjs）+ discover-audit-suspects ×6；基线 723/330 经 HEAD 双工作树实测吻合，FM-2 diff 净零命中；按 knip xlang 先例登记并发归属，归该工作流收口）

## Deferred But Adjudicated

（起草期无；执行中改判当场落此节。）

## Closure

Status Note: FM-2 三路终审全部落地：workaround 残余 50 条现场复核（48 still-watch / 2 resolved 转 verified / 0 stale / 0 revived，reconcile violations 0）；code-quality 七维度 + deep-audit 五维映射 + adversarial 六热点（0 P0 / 2 P1 / 7 P2 / 17 P3），两个 P1 当批修复且经真判别测试红→绿（P1-2 旧实现 reject 必挂；P1-1 旧缓存实测红——临时回退实验双方审计员各自独立复现）；台账新增 FM-008–FM-021 14 条三态归族，uncovered=0。check +9 为并发 xlang 提交（176032924..cfd966ee9）引入、diff 净零，归属已登记。

Closure Audit Evidence:

- Auditor / Agent: agent_fa76e354（fresh session，R1 + R2 同审计员两轮）
- Evidence: R1（2026-10-18）verdict `issues`——实质交付全部独立实证成立（50/50 复核有证、P1-2 判别红→绿为真[审计员独立回退实验]、台账/回写/去重诚实、FM-010 P3 评级核验站得住），3 Major 均为收口文本与实况不符（P1-1 判别测试无判别力且机制归因错误、check 门描述不完整 [实为 +9：async ×3 + discover ×6]、roadmap FM-2 行畸形 11 列）+ 3 Minor → 全部处置：真判别测试 `compile-cache-runtime-identity.test.ts` 直调 normalizeNodeInput（审计员 R2 独立回退实验复现 RED→GREEN）、机制勘误三处（组件编译期内嵌）、check 门如实描述、roadmap 行重写、计数口径统一、M-09 注释补 FM-010 指针、Phase 4 EC 对齐、typecheck 时点注。R2 verdict `issues`（1 Major + 3 Minor 全部机械项）——审计员明确授权「四项落盘后即可标 completed，无需第三轮全量审计」；四项 delta 复核（执行会话按授权逐项核对）：R2-M1 测试头注如实化、R2-m2 plan/ledger 计数统一、R2-m3 报告编号、R2-m4 typecheck 时点注，全部落盘。详见 `docs/logs/2026/10-18.md`。

Follow-up:

- FM-008–FM-021 中 watch-only / FM-6 / FM-7 候选各条（台账跟踪，FM-6/FM-7 首批裁定消化清单）；c1a console 门禁与 check +9 归并发 xlang/RM 工作流（FM-005、门禁注记）。

## Non-Blocking Follow-ups

- P2/P3 归族项由 FM-6/FM-7 首批裁定是否消化（台账跟踪）。
