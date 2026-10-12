# 571 workaround-audit WA-11 AI 渲染器审计批（flux-renderers-ai）

> Plan Status: completed
> Last Reviewed: 2026-10-12
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-11 工作项，Phase Status 第 12 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`；先例：`docs/plans/570/569/568`（跨包测试隔离条款、执行期披露先例）
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`；`docs/audits/workaround-code-smell/wa-10/report.md`（误报排除清单互通）；`docs/context/ai-autonomy-policy.md`

## Purpose

对 AI 渲染器族（flux-renderers-ai：message bubble/streaming/conversation management/tool calls/HITL + framework-agnostic message engine + React adapter）单包执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划。

## Current Baseline

- **对象清单**（WA-0 枚举器输出，单模块）：flux-renderers-ai **70 文件/12,743 行**（roadmap 行"约 12.6k"系拟制估算，以 inventory 为准；wc 口径 12,741 的 ±2 差系两文件无尾换行约定差，closure m 实证在案）；顶层子域 **adapters/engine/renderers/rich-text/storage** 五个（嵌套：engine/plugins、renderers/ai-bubble、rich-text/extensions|components）。
- **在途漂移口径（拟制时实测 2026-10-12）**：本包 `git status` **零在途**。拟制时 HEAD = `b3fb1dbfe`（WA-10 收口提交）；执行时以当时 HEAD 快照注记。
- **字面标记**：literalEn **0**、literalZh **0**（连续第二个双零批；inventory baseline，批内复核）。
- **模式候选基线**（inventory per-module，执行时以枚举器复测为准）：拟制时点 grep 实测 async 密集（见门禁），typeBypass **14** + setTimeoutCandidates **6** + domRaid **2**（其余五项 0）= **22 处候选**逐个人工定性；**46 处 async 门禁命中为历批最高**（use-conversation ×8/ai-chat ×5/create-engine ×4/voice-input ×3/tool-call ×3/sender ×3/feedback ×3/markdown ×2/attachments ×2/autosave ×2 余散布——流式/异步管线密集所致，逐个去重定性）。
- **门禁交叉基线**（拟制时 live 实测，执行时复跑为准）：async **46**；reactive-render-reads/performance-suspects/runtime-raw-schema-reads/hardcoded-type-dispatch/renderer-browser-io 均 **0**（实跑留痕）。
- **oversized 登记债口径**：非测试源 ≥500 行 **5 件**全 WARN 档（engine/create-engine.ts 700、adapters/use-conversation.ts 676、renderers/ai-chat.tsx 619、renderers/ai-tool-call.tsx 555、renderers/ai-citations.tsx 524）；≥500 行源文件一律结构走读。
- **包特性与审计重心**：①engine（create-engine 700 行/message engine 框架无关层）——流式 back-pressure、插件管线（thinking-plugin 等）、错误通道；②adapters（use-conversation 676 行 + autosave）——会话状态机、持久化竞态；③renderers 族（ai-chat 619/tool-call 555/citations 524/bubble/markdown）——流式渲染边界、markdown 渲染安全面；④HITL/tool-call 审批链路——异步审批超时/取消语义；⑤WA-10 批 reactive 门禁对 ai 包 0 命中（graph 才是点亮包）——复核即可。
- **交界防重复**：①本包多轮密集审计先例（组件契约/交互状态轨道；plan 529 对话体验现代化——其 Deferred 登记"create→列表回路存量接线缺陷（import-stack 命名空间竞态嫌疑）"为本批考古线索）；②WA-7 批 ai 套件作跨包哨兵的惯例（本批修复触及模块求值面时沿用，850 用例口径以当次实测为准）；③WA-1..10 已立案发现与 CX-1..15 覆盖面不重复立案；④CX-15 覆盖面：createMockRendererProps ai 副本（×5 之列，src/test-support.ts 在盘）仅引用——注意 ai 的 `src/__tests__/contract-honesty.test.ts` 系 bundle-isolation 不变量测试（禁全局 IO/react/tiptap 越界），**非** CX-15 所列 content/layout/scheduling 骨架家族，Phase 1 须独立取证不漏。
- **保护区与授权条款**：①本包 `src/index.ts` 公共导出 = **批内零变更**。②Renderer definition fields = plan-first。③样式契约 = plan-first。
- **跨包测试隔离条款（WA-7 教训固化）**：批内任何提取/重写**不得把带副作用的调用提升进模块顶层求值路径**；凡修复触及模块求值面，除本包 filter 四门禁外加跑 **flux-renderers-ai 自身全量 + flux-react 全量**（双哨兵）。
- **五门禁基线**：拟制时点 = WA-10 收口（b3fb1dbfe）隔离全绿。
- **工作树状态（拟制时点实测）**：主树并行会话在途变更（runtime/core/data/form/dropdown/layout 14 文件）与本包零交集；全量门禁沿用隔离 worktree 方法（HEAD+本批 diff）。

## Goals

- `docs/audits/workaround-code-smell/wa-11/report.md`：逐条发现（prompt §6 单条 12 字段）+ 汇总五项 + 覆盖声明节（70 文件分档、async 46 行分区落字）。
- findings 全量登记 ledger（`WA-ai-001` 起三位零填充顺延，与既有 22 前缀零撞号——执行时以台账 live 为准），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修；本包 `index.ts` 零公共导出变更。
- 台账 modules 行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发）。

## Non-Goals

- 结构性重构的批内实施；本包 `index.ts` 公共导出面的任何增删。
- 与其他轨道重复立案；已登记 pre-existing 门禁红的重复立案；wa-1..10 已立案发现重复立案；CX-15 覆盖面的重复立案。
- playground 消费侧（ai 域 demo 面）。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/` 全部非测试源码的取证（prompt §5 全量协议）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试。
- `docs/audits/workaround-code-smell/wa-11/report.md` + ledger 登记/翻转 + roadmap WA-11 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非本批包/模块的任何修改（含并行会话在途文件——登记转发不越权修）。
- 结构性重构实施；playground 消费侧。

## Failure Paths

不适用（审计批无新增运行时错误处理面）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。P0/P1 修复先红后绿；行为保持型批内修特征化测试先钉后改；修复后跑 `pnpm --filter @nop-chaos/flux-renderers-ai typecheck/build/lint/test`；触及模块求值面的修复加跑 flux-react 全量（双哨兵条款）；批收口跑全量五门禁（隔离 worktree 方法）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: completed
Targets: `packages/flux-renderers-ai/src/`（读）、`docs/audits/workaround-code-smell/wa-11/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 协议全走（独立取证 agent 产出报告）——候选 68 处全部逐个定性（async 46 行=43 豁免+0 独立立案+3 watch 微注记，历批最高命中数零静默；typeBypass 14=13 豁免+1 CX-15 引用；setTimeout 6=5 豁免+1 并入 WA-ai-002 本体；domRaid 2 豁免）+ 门禁交叉（reactive/perf/raw-schema/type-dispatch/browser-io 五门禁实跑 0）+ 重复块双探针（逐字版 8,983 窗→18 组坐实 3 簇/归一版 9,053 窗→121 组；走读补 3 组探针盲区）+ 范围结构走读（70/70 全文覆盖；≥500 行 5 件全读；三口径 12,743/12,741/12,741 逐文件对账——±2 差=两件无尾换行文件精确落位）+ 三档处置复核（cq-6 debug residue 零复发；WA-content-009 模块顶层教训正面复核发现 ai-test-support 一处→立案 006）+ 误报排除 25 项。contract-honesty.test.ts 独立取证=bundle-isolation 不变量测试非 CX-15 家族（m3 条款执行）。
- [x] Proof：每个立案候选 git 考古（15 commit 溯源；症状性 message 抽检 45/45=0——2026-06 后 45 条全集全查；C8 三波同日出生链 ea9f2c9b9/aa56bd207/df212e605 注释互证）。
- [x] Decision：严重度 + ROI + 共性裁定——**8 条立案（P2×1[ai-001 降档理由显式记录]+P3×7，零 P0/P1）**；去向=fixed 6+watch-only 2（005 公共面收缩/008 公共接口扩展均留人工）；**本批无新增 CX-n**（三族复制全部包内封闭）；转发 WA-15a 一项（plan 529 Deferred 线索携探针证据，playground 装配面归属）。
- [x] Proof：`wa-11/report.md` 落盘，findings 全量登记 ledger（8 行）；reconcile 通过（168=found 84+fixed 6+verified 78/未处置 0/violations 0）。

Exit Criteria:

- [x] `wa-11/report.md` 落盘且模板字段/汇总五项/覆盖声明节齐备（70 文件分档落字，行数双口径与 inventory 对账）。
- [x] ledger 与报告一一对应零遗漏（零撞号——WA-ai 前缀与既有 22 前缀零冲突）。
- [x] 每个立案有 git 考古读数；误报排除逐项有对照理由（25 项）。
- [x] 共性裁定落字（显式记"本批无新增 CX-n"+转发 WA-15a 登记）。

### Phase 2 - 批内自动修复（先红后绿）

Status: completed
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：逐项修复——零 P0/P1 无先红后绿项；行为保持型提取 4 项（ai-001 dispatch-ctx 13 位点/ai-002 clipboard.ts[adapter 迁移+useCopiedFlag，补 assistant-actions 清理+user-edit 改走 adapter 两处漂移]/ai-003 message-text.ts[谓词统一 typed 派]/ai-004 WordLimitCounter+renderBubble）+ai-006 测试骨架迁 `__tests__/`（15 消费方 import 改写）+ai-007 三处注释残迹清理（FIND-19 注释随类型迁回 contracts）；本体删除验证逐项落字（报告批内修复记录表）；类别清扫（extractText 家族全类收敛含 markdown 单 slice 变体旁证件）。
- [x] Proof：包 filter 四门禁全绿（typecheck/build/lint/test——**850/850** 含 contract-honesty 套件，lint 0 error）；模块求值面裁定：零生产求值面触碰（迁移件移出生产枚举、三个共享件纯函数无顶层副作用）→双哨兵按报告注记豁免；`index.ts` 零公共导出变更（`git diff --exit-code` 通过）。

Exit Criteria:

- [x] 本体删除验证逐项落字（报告批内修复记录表；判据 grep 全部达成）。
- [x] filter 级四门禁通过；台账无残留 `found` 未处置的 P0/P1（watch-only 2 条均 P3 公共面）；`index.ts` `git diff --exit-code` 通过。

### Phase 3 - 回写与收口

Status: completed
Targets: roadmap、ledger、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 modules 行翻转 `audited`；reconcile 通过（audited 30/uncovered 19）。
- [x] Proof：draft review 通过时 roadmap WA-11 回写 `todo → planned` 并填 plan 路径；`planned → done` 属 Closure Gates 收口动作。
- [x] Decision：批内修复行 `fixed → verified` 归属——closure 复检通过当场翻转（6 行于本收口 commit 翻转；复检证据=closure audit agent_b828ca56 六项修复逐一开档实证+动态判别 4/4 恰红→恢复绿）。
- [x] Proof：dev log 记录发现/修复/门禁计数。

Exit Criteria:

- [x] reconcile exit 0 且 wa-11 报告存在。
- [x] roadmap WA-11 行 `todo → planned` 已落并填 plan 路径。
- [x] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_2a67dac0-ac8e-42b7-881b-0b49fe9d53b3，review-only）
- Verdict: `revised`（零 Blocker、2 Major、4 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** 子域结构失实（extensions 非顶层子域，漏 rich-text/storage）→ 改五顶层子域+嵌套注记；**M2** 前缀计数 24 失实（两段式 18/三段式 22，且丢 hedge）→ 改 22+「以台账 live 为准」；**m1** 模式候选计数未落字 → 补 typeBypass 14/setTimeout 6/domRaid 2=22；**m2** roadmap 差额注记补齐（含 wc ±2 口径差）；**m3** contract-honesty 家族表述纠偏（ai 同名文件系 bundle-isolation 不变量测试非 CX-15 骨架族——Phase 1 须独立取证）；**m4** 850 口径补「以当次实测为准」hedge。审查员 20 项清单全部 live 实测（HEAD/零在途/字面双零/async 46 行逐 file 吻合/5 门禁 0/oversized 5 件数值吻合/子域/前缀/529 Deferred/CX-15 覆盖面/modules 行在案/双哨兵上游关系/wa-7 一致性）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（零 P0/P1；批内修 6 项行为保持提取+骨架归位；公共面 2 项以 watch-only 显式去向）
- [x] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向——001 注释锚漂移/002 双漂移随单源化消除）
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（判据 grep 全达成 + filter 四门禁 850/850；双哨兵按裁定豁免注记——零生产求值面触碰）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-11 回写 + dev log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 **approved**（agent_b828ca56，0B/0M/3m 随收口修正：m1 dev log 悬空引用→本 Evidence 节落盘闭合；m2 净删除估算 ~223→~280 勘误；m3 隔离树 stray 副本清理），详见 Closure Audit Evidence
- [x] `pnpm typecheck`（隔离 worktree HEAD+本批 diff，exit 0）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0）
- [x] `pnpm test`（同上，exit 0）
- [x] `pnpm check`（同上，exit 0——零新增未登记红；首跑 exit 1 逮 knip 三符号旧路径基线随迁转新命中，以修代重立基线后终态复跑过）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- 转发 WA-15a 一项（plan 529 Deferred「create→列表回路缺陷」线索，playground ai-conversations-demo 装配面归属，携报告探针证据）——归 WA-15a 批执行时必读线索，非本批 closure 项。

## Closure

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_b828ca56-8982-4536-9d1b-413731a4e3ce，review-only）
- Rounds: R1 `approved`（0 Blocker / 0 Major / 3 Minor 随收口修正）
- m1 dev log「详见 plan 571 Closure Audit Evidence」悬空引用 → 本节落盘闭合；m2 报告净删除估算 ~223 → ~280（生产文件口径 numstat gross del 434 − ins 154）；m3 隔离树 `docs/logs/10-12.md` stray 副本（同步时丢 2026/ 层级）→ 删除，主树正典路径无恙。
- 审计员独立实证：6 项修复逐一开档（判据 grep 全复现：evaluationBindings=1/裸 setTimeout=0/直连 clipboard 仅注释/定义点=1 共享件本体/span=1/mv 保史 R100/15 消费方旧路径=0/knip 三符号收私+基线零改动）；测试断言弱化检查=0（expect/toBe/toEqual 增删行零命中）；reconcile 复跑 168=84+0+84/未处置 0/violations 0；inventory↔live 逐文件对账（±2 差=两件无尾换行文件 tail -c 实证）；两树批文件集 45/47 逐字节一致（2 处 docs 差均判定合法回写时点差）；watch-only 2 项原样在位。
- 动态判别 4/4（隔离树污染→恰红→字节级恢复→绿）：①useCopiedFlag 单源路由——markCopied 永不置位→ai-feedback 恰 1 failed→31/31 绿；②extractMessageText 单源路由——前置返回污染→citations/feedback/assistant-actions 恰 13 failed→53/53 绿；③no-join 独立性——同一污染下 ai-message-list loop-termination+error-banner 6/6 仍绿（实测 measureMessageTextLength 不委托 extractMessageText，R2-P20 语义真实独立）；④buildDispatchCtx 判别（唯一 P2）——删 evaluationBindings 行→恰 2 failed 且恰为两条事件派发 ctx 契约测试→49/49 绿。审计员独立复跑 ai 全量 850/850。
- 执行期披露：check 门禁首跑 exit 1——knip 三符号（旧 src 根路径 ai-test-support 的 aiScopeProbeRenderer/getCapturedActionScope/resetCapturedActionScope，前两条基线在案 scripts/baselines/knip-baseline.json:109-111）随 ai-006 迁移路径变化转新命中；处置=以修代重立基线（probe renderer 转包内私有+两零消费函数删除，全仓 grep 零消费实证），终态五门禁复跑全链 exit 0。
- inventory 重生成注记（审计员观察项采纳）：本次全量重枚举刷新 modules.json 24 个非 ai 模块行 loc/fileCount（上次全量重生成停在 WA-1 时代，本次吸收 WA-2..13b 各批已提交修复现实+主树并行在途漂移）——status/batch 零变化、findings 区仅新增 8 条 ai 行，成因随本 commit message 注明。
- 隔离五门禁（HEAD 9854a8b61 + 本批 diff）终态日志：`_tmp/wa11-gates-1..5.log`（typecheck 42/42、build 42/42、lint 42/42、test 78/78+ai 850/850、check 全链 designer-conformance passed 收尾）。
