# 563 workaround-audit WA-3 React 渲染层与 UI 库审计批（flux-react + ui）

> Plan Status: completed
> Last Reviewed: 2026-10-11
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md`（WA-3 工作项，Phase Status 第 4 行）+ `docs/skills/workaround-code-smell-audit-prompt.md`（统一方法）；先例：`docs/plans/561-workaround-audit-wa1-compile-formula-plan.md`、`docs/plans/562-workaround-audit-wa2-runtime-plan.md`（方法同构，隔离验证与保护区条款先例）
> Related: `docs/audits/workaround-code-smell/inventory/modules.json`（本批对象清单与 baseline 计数来源）；`docs/audits/workaround-code-smell/wa-2/report.md`（前批沉淀：误报排除清单互通、已收敛模式复核结论）；`docs/context/ai-autonomy-policy.md`（Protected Areas 表）

## Purpose

对 React 渲染层与 UI 库两包（flux-react、ui，inventory 合计 143 文件 / 18,494 行非测试源码）执行 prompt §5 全量取证协议，产出批次审计报告并完成批内自动修复闭环（roadmap 自动修复契约）：P0/P1 单点行为缺陷先红后绿修复并验证临时方案本体删除，P2/P3 显式裁决零静默，共性/结构性发现以 CX-n 拟制独立修改计划。

## Current Baseline

- **对象清单**（WA-0 枚举器输出）：flux-react 9,436 行/63 文件、ui 9,058 行/80 文件（roadmap 行的"约 17.8k"为拟制时估算，以 inventory 18,494 为准）；两包字面标记（literalEn/literalZh）均为 0。
- **模式候选基线**（inventory per-module，仅线索非定案）：flux-react typeBypass 14 处 + setTimeoutCandidates 3 处；ui typeBypass 1 处 + domRaid 4 处 + pixelNudge 1 处；silentCatch/keyRemount/testEnvBranch 两包全零。合计 23 处候选逐个人工定性，禁止按 grep 定案。
- **包特性与审计重心**：ui 为 shadcn/ui 惯例组件族（`components/ui/*`）+ toolbar 复合件——shadcn 源组件的手写偏离（`as any`、直接 DOM 触碰、radix 包装层偷懒）是本批信号热点（domRaid 4 + pixelNudge 1 全部在 ui）；flux-react 为 hooks 族（useRendererRuntime/useRenderScope 等渲染器契约 hook）、auto-renderer、dialog-host 族、bindings——重点走读 hook 依赖数组、外部同步 effect、订阅清理与 renderer 契约接线。
- **保护区条款（本批特有，mission description + autonomy policy 双依据）**：①`packages/ui/src/index.ts` 公共导出 = **ask-first**——本批批内修复约束为**零公共导出面变更**；修复若确需增删公共导出，不当场实施，以 CX-n/显式注记承载并说明理由待人工确认。②Renderer definition fields = plan-first——本 plan 即载体；批内修复不得改 Renderer 定义字段契约（对齐 `docs/references/renderer-interfaces.md`）。③样式契约 = plan-first——owner doc `docs/architecture/styling-system.md` 在案；批内修复遵守 Layout marker-classes-only / Widget self-styled 契约。④flux-react 不在 Protected Areas 表（flux-core 才是），但其暴露的渲染器契约 hook 语义视为公共面，签名级变更走 CX-n。
- **已收敛模式三档（roadmap 基线节）**：live 可证档——AbortController（flux-runtime abort-signal-helpers 在盘；本批验证 flux-react/ui 无 boolean cancelled/disposed 手写复发）、createLazyLibLoader（重库懒加载——ui/flux-react 预期无重库直连，验证即算）；历史教训档——surface 生命周期两份合一（dialog/drawer——先例 plan 562 基线注明"归渲染器批复核"；roadmap 仅将其列历史教训档并要求批内引用前 live 复核收敛仍在位——本批 flux-react 存在 `dialog-host.tsx`/`dialog-host-surface.tsx`，对其做同源取证，渲染器包侧留 WA-4+）；strip errors 合一 / ajax 两份合一 / `name` vs `dataPath` 双词汇（引用 wa-1/wa-2 结论，本包范围 grep 验证零命中即闭环）；明确不按已收敛处理——form-runtime 文件族属 flux-runtime（WA-2 已收口），不在本批。
- **工作树状态（拟制时点实测）**：flux-react 与 ui 在主树**零在途变更**（`git status` 空）；主树另有并行会话对 flux-core/flux-renderers-\*/flux-runtime 在途文件的变更（WA-2 收口提交披露在案；计数随并行会话自然漂移，以执行时 `git status` 实测为准），不属本批对象。**中途漂移预案**：若并行会话在本批执行期间提交或新改了对本批对象的变更，取证以 HEAD 快照为准并就地注记；批内修复触及在途文件时不叠编辑，以隔离 worktree 实施修复与验证或待其收口后对账，报告注记。**全量门禁沿用隔离 worktree 方法**（HEAD+本批 diff）以对冲并行在途对 check/typecheck 的干扰；批内修复直接在主树实施（两包干净无叠编辑风险）。
- **五门禁基线**：WA-2 收口（0b0f4cd00）隔离验证全绿。

## Goals

- `docs/audits/workaround-code-smell/wa-3/report.md`：两包逐条发现（prompt §6 单条 12 字段）+ 汇总五项 + 覆盖声明节。
- findings 全量登记 ledger（`WA-react-<seq>` / `WA-ui-<seq>`），状态机与去向四态零静默。
- 批内 P0/P1 单点行为缺陷全部先红后绿修复 + 本体删除验证；P2 低成本当场修；`ui/src/index.ts` 零公共导出变更约束下实施。
- 台账 modules 两行翻转 `audited`，reconcile 通过。
- 共性/结构性发现以 CX-n 插入 roadmap（如触发）。

## Non-Goals

- 结构性重构的批内实施（公共 API/包边界/编译期语义——CX-n + 人工确认载体）；`ui/src/index.ts` 公共导出面的任何增删（ask-first）。
- 渲染器包（flux-renderers-\*）的取证与修复（WA-4+）；surface 生命周期收敛的渲染器包侧复核留对应批。
- 与其他轨道重复立案（组件契约/交互状态/视觉/DOM 轨道划界同 WA-1/2）；已登记 pre-existing 门禁红的重复立案。

## Scope

### In Scope

- `packages/flux-react/src/`、`packages/ui/src/` 全部非测试源码的取证（prompt §5 全量协议）。
- 上述范围内 P0/P1（及低成本 P2）发现的批内修复与回归测试（受保护区条款约束）。
- `docs/audits/workaround-code-smell/wa-3/report.md` + ledger 登记/翻转 + roadmap WA-3 状态回写 + dev log。
- CX-n 工作项插入（如触发共性裁定）。

### Out Of Scope

- 非本批包/模块的任何修改（含并行会话在途文件——发现其问题只登记转发，不越权修）。
- 结构性重构实施；playground 消费侧；ui 组件的视觉/交互契约问题（转发对应轨道）。

## Failure Paths

不适用（审计批无新增运行时错误处理面；修复项的失败行为随各发现的重构方向在报告内写明）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap Rule 1）。每个 P0/P1 修复先写钉住现有正确行为的回归测试（红）→ 重构 → 绿（Proof 与 Fix 在同一修复项内合并表达，沿 plan 561/562 豁免先例）；行为保持型批内修以特征化测试先钉后改；修复后跑受影响包 `pnpm --filter <pkg> typecheck/build/lint/test`；批收口跑全量五门禁（隔离 worktree 方法）。

## Execution Plan

### Phase 1 - 全量取证与报告

Status: completed
Targets: `packages/flux-react/src/`、`packages/ui/src/`（读，HEAD 快照口径）、`docs/audits/workaround-code-smell/wa-3/report.md`、`ledger.md`（写）

- Item Types: `Proof | Decision`

- [x] Proof：prompt §5 协议全走——字面扫描与模式扫描复核（23 处候选逐个定性：typeBypass 15 + setTimeout 3 + domRaid 4 + pixelNudge 1）+ 门禁交叉核对（check:audit-\* 族两包命中逐个定性）+ 重复块识别（两包 143 文件 token 归一化比对；ui 侧重 shadcn 组件族间手写偏离与 toolbar 复合件间复制；flux-react 侧重 hooks 族间复制与 dialog-host 两文件同源取证）+ 范围结构走读（flux-react：hooks 全读、auto-renderer、dialog-host 族全文、bindings、container/context hooks、defaults；ui：`components/ui/*` 结构走读 + toolbar 五件全读 + 高风险件抽读）+ 已收敛模式三档处置（AbortController/lazy-loader live 复核）+ 误报排除（与 wa-1/wa-2 排除清单互通）。——两包 143/143 文件全读（18,494 行实测吻合）；21 条立案（flux-react 13= P2×6+P3×7、ui 8= P2×4+P3×4）+ 56 项误报排除。
- [x] Proof：每个立案候选 git 考古（出生 commit + message 症状性判定），逐条 W1–W6 判定；根因失传单独标注。——症状性 message 3 处（WA-react-004 的 4a5f95662、WA-ui-006 的 a0678cf39、WA-ui-007 的 b6b4f4add）+ 根因半失传 1 项（WA-ui-007）。
- [x] Decision：严重度 + ROI + 共性裁定（含保护区触碰裁定：凡修复需动 `ui/src/index.ts` 公共导出或 Renderer 定义字段者一律 CX-n/人工确认，不得批内硬修）。——CX-6..9 插入 roadmap；WA-ui-002 导出合并路径与 CX-6/7 公共面均标人工确认门。
- [x] Proof：`wa-3/report.md` 按模板落盘，findings 全量登记 ledger。

Exit Criteria:

- [x] `wa-3/report.md` 落盘且模板字段/汇总五项/覆盖声明齐备（覆盖含 dialog-host 同源取证结论与保护区触碰裁定记录）。
- [x] ledger 与报告一一对应零遗漏；每行类别/严重度/位置/W 违约/去向齐备。
- [x] 每个立案有 git 考古读数；误报排除有对照理由。
- [x] 共性裁定落字（CX-n 插入或明示无）。

### Phase 2 - 批内自动修复（先红后绿）

Status: completed
Targets: Phase 1 裁定为批内修的发现所涉文件 + 对应包测试

- Item Types: `Fix | Proof`

- [x] Fix：逐项 P0/P1 修复（先红后绿 + 本体删除验证）；低成本 P2 当场修；其余显式去向。**约束：`ui/src/index.ts` 零公共导出变更；Renderer 定义字段与样式契约零违反。**——本批无 P0/P1；4 条 ui 批内修（WA-ui-005/006/008 红→绿 + WA-ui-007 微修）落地；flux-react 13 条全部显式去向（watch-only 6 + CX-6/7/8 去向 7——WA-react-007 虽 P3 但去向为 CX-6）；`git diff --exit-code packages/ui/src/index.ts` 通过。
- [x] Proof：每项修复后受影响包 filter 四门禁；类别清扫 grep 全类兄弟。——ui typecheck/build/lint/test 254/254 全绿（含新增 3 测试文件 10 用例：i18n-keys 1 + input-group-addon-focus 7 + json-viewer-yaml-error 2）；四项本体删除验证 + 类别清扫落报告《批内修复记录》。

Exit Criteria:

- [x] 红→绿证据在案，无"只修不加测试"；本体删除验证逐项落字。——三条红→绿（005 占位缺失红 2 失败、006 textarea 委托红 3 失败、008 存在性测试红恰好 2 缺键）+ 007 W5 零行为实证；删除验证落报告。
- [x] filter 级四门禁通过；批 closure 前台账无残留 `found` 未处置的 P0/P1；`git diff --exit-code packages/ui/src/index.ts`（零公共导出变更的机器判定）。——reconcile 未处置=0；index.ts 与 HEAD 逐字一致。

### Phase 3 - 回写与收口

Status: completed
Targets: roadmap、ledger、dev log

- Item Types: `Proof`

- [x] Proof：台账 modules 两行翻转 `audited`；reconcile 通过。——audited 7 / 未处置 0 / violations 0。
- [x] Proof：draft review 通过时 roadmap WA-3 回写 `todo → planned`；`planned → done` 属 Closure Gates 收口动作。
- [x] Decision：批内修复行 `fixed → verified` 归属——closure 复检通过当场翻转（WA-ui-005/006/007/008 于本收口 commit 翻转 verified，复检证据=closure audit agent_c6218731 独立实跑与四消费者套件核验）。
- [x] Proof：dev log 记录发现/修复/门禁计数。

Exit Criteria:

- [x] reconcile exit 0 且 wa-3 报告存在。
- [x] roadmap WA-3 行 `todo → planned` 已落。
- [x] dev log 条目落盘。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_7e5485dd-622e-4767-a6d2-af50d7aeb39e，review-only）
- Verdict: `revised`（零 Blocker、1 Major、4 Minor → 修正后共识达成）
- Rounds: 1
- Findings addressed: **M1** "归渲染器批复核"引述归属失实（该短语出自先例 plan 562 基线注记，非 roadmap 原文；roadmap 仅列历史教训档+live 复核要求）→ 已改为忠实归属表述，处置不变；**m1** 在途文件计数"13"随并行会话漂移 → 删除硬计数改"以执行时 git status 实测为准"；**m2** prompt §5 步号标签与 prompt 字面编号不符 → 去步号改内容枚举；**m3** 缺 562 式中途漂移预案 → 补"取证以 HEAD 快照为准+触及在途文件不叠编辑"条款；**m4** index.ts 零导出变更验证改 `git diff --exit-code` 机器判定。审查员对 23 候选计数、inventory 两模块行、保护区四条引述、toolbar 五件、dialog-host 两文件、wa-1/2 报告在盘等全部声称 live 复现通过。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（本批无 P0/P1；P2 单点行为缺陷 3 项红→绿批内修 + P3 微修 1 项；结构性/共性以 CX-6..9 显式去向）
- [x] 所有 in-scope confirmed contract drifts 已收敛（或显式登记去向）——跨包契约缺口 WA-react-004/005=CX-7（人工确认门）；i18n 键契约缺口批内修 + flux-i18n 词表补齐
- [x] 行为/契约结果已达成（报告 + 台账 + 修复 + 回写四件齐）
- [x] 必要 focused verification 已完成（批内修项红→绿证据：005 占位 2 failed→2/2、006 textarea 委托 3 failed→7/7、008 存在性守卫恰好 2 缺键红→绿 + ui filter 四门禁 254/254）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（reconcile 未处置=0，violations=0；17 条 found 全部带显式去向）
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap WA-3 回写 + CX-6..9 插入 + dev log；样式契约/renderer 接口文档未被批内修触及——修复均为行为级与内部模块，无需更新）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——R1 approved（agent_c6218731-3193-4d95-bf96-55ba22640e6f，0B/0M/4m，4 Minor 已随收口 commit 修正；审计员独立实跑 ui 254/254、flux-i18n 30/30、check-i18n-keys zh/en 1792/1792、下游 barcode 136/basic 33/content 7 全绿、reconcile 逐字吻合）
- [x] `pnpm typecheck`（隔离 worktree `../wa3-verify` HEAD `0b0f4cd00`+本批 14 文件 diff，exit 0）
- [x] `pnpm build`（同上，exit 0）
- [x] `pnpm lint`（同上，exit 0）
- [x] `pnpm test`（同上，exit 0；playground 452/452、flux 8/8 等）
- [x] `pnpm check`（同上，exit 0——首跑 check-i18n-keys 逮到 flux.jsonViewer.yamlError 词表缺失，补 flux-i18n zh/en 词表后复跑通过）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- （如共性裁定触发 CX-n，其执行归 CX-n plan；本节收口时按实际填写。）

## Closure

Status Note: 2026-10-11 收口。两模块（flux-react 63 文件/9,436 行 + ui 80 文件/9,058 行，143/143 全读）prompt §5 全量取证完成，21 findings 全量登记台账且去向四态零静默（fixed→verified 4 / successor-required 11→CX-6..9 / watch-only 6）；4 条 ui 批内修全部红→绿（或 W5 实证）+ 本体删除 + 类别清扫；`ui/src/index.ts` 零公共导出变更（git diff --exit-code 机器判定）；跨包契约缺口归 CX-7（人工确认门）、复制沉积归 CX-8/CX-9、flux-core 原语导出归 CX-6（人工确认门）。隔离五门禁 exit 0（首跑 check-i18n-keys 逮到 flux.jsonViewer.yamlError 词表缺失，补 flux-i18n zh/en 词表后复跑通过）。roadmap WA-3 → done。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_c6218731-3193-4d95-bf96-55ba22640e6f，review-only）
- Evidence: closure audit R1 `approved`（0 Blocker / 0 Major / 4 Minor，随收口 commit 修正：①plan Phase 2 计数错位 watch-only 7+CX 6 → 6+7；②diff 拆分口径滑差（声称文本，无 repo 影响）；③input-group ref 卸载语义补注释（React 19 cleanup 形态说明）；④i18n-keys 守卫潜在漏报面在案（动态键今日零实例））。审计员独立复现：ui 254/254、flux-i18n 30/30、两包 typecheck/build、批内文件 lint、check-i18n-keys 1792/1792、reconcile 逐字吻合、下游消费者套件（barcode-input 136、command-palette 33、json-view 7）全绿、`git diff --exit-code packages/ui/src/index.ts`；input-group 注册机制四项质量红线（多 control 语义/外部 ref/combobox render/StrictMode Set 对称性）逐项核验通过。全量五门禁隔离 worktree 冷复现未重建（worktree 已拆），依赖执行者隔离跑记录+审计员 filter 级/消费者套件佐证（审计任务书最低要求已超额覆盖）。

Follow-up:

- CX-6（WA-react-007/008）、CX-7（WA-react-004/005）、CX-8（WA-react-001/002/003）、CX-9（WA-ui-001/002/003/004）已插入 roadmap，各自由独立 plan 收口；CX-6/CX-7 与 CX-9 的导出路径执行前需人工确认；WA-16 收口前处理。
- i18n-keys 守卫扩展点（动态键/双引号形态）——出现实例时再扩展（closure m4 在案）。
- no remaining plan-owned work。
