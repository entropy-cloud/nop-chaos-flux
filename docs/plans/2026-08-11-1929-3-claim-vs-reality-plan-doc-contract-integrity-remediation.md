# 3 声明与现状一致性收口（plan 状态失真 / 幽灵契约与文档 / surface 文档自相矛盾 / 异步失败传播契约）（component-audit-round2）

> Plan Status: active
> Last Reviewed: 2026-08-11
> Source: `docs/audits/2026-08-11-1929-multi-audit-component-audit-round2.md`（P1-03..P1-06；折叠 P2-11/P2-12/P2-13/P2-14/P2-15/P2-22/P2-23/P2-34/P2-35）
> Related: `docs/plans/2026-08-11-1929-1-renderer-core-path-defect-remediation.md`、`docs/plans/2026-08-11-1929-2-flux-bundle-facade-host-contract-remediation.md`（独立 closure surface）

## Purpose

收口 4 类「声明 ≠ 现状」的 P1：① 两份 `completed` 计划（gantt-ai-e2e、452）状态与实际文件内容矛盾（相位全 planned / 211+20 项未勾选 / closure 声称与自身注记冲突）；② schema 层 `ActionShapeLikeFields.componentName` 幽灵字段存续 + action-scope-and-imports.md 同步过时；③ surface-lifecycle-callbacks.md 内部自相矛盾（declarative surface callback 断言 vs 文档自身 §289 与 live 行为）；④ refreshSource/refreshNearest 在底层请求失败时把非抛出型失败重分类为 `{ok:true}` 成功。同 closure surface 的 P2（plan 状态族、componentName 文档族、surface 文档族、async-data 失败吞噬族）折叠进对应 phase。

## Current Baseline

- `docs/plans/2026-07-25-2-gantt-ai-e2e-test-coverage-and-fix-plan.md`：`Plan Status: completed`（:3），4 个 Phase 全 `planned`（:47/:68/:216/:432），211 项 `- [ ]` 未勾选；Closure Gates 勾选「Gantt ~80 功能点 e2e 覆盖完成」而 :446-458 自身注记「e2e 需 Playwright server，暂未执行」。违反 plan-guide Rule 19/20。
- `docs/plans/452-submitForm-surface-discovery-and-component-id-name-unification-plan.md`：`Plan Status: completed`（:3），Phase 1 `in_progress`（:94 含 3 个未勾选待办）、Phase 2 `planned`（:121）；Status Note（:198）声称「所有 Phase 和 Closure Gates 已通过」。live 侧 `packages/flux-core/src/types/schema.ts:83` `ActionShapeLikeFields.componentName?: string` 幽灵字段存续（零消费：编译 targeting 只读 `_targetCid/targetId/componentId`，action-compiler.ts:59-62 不复制该字段）；`component-handle-core.ts:31-34`/`actions.ts:435-442` 已确认移除 ComponentTarget.componentName。
- `docs/architecture/surface-lifecycle-callbacks.md:569-576` 断言「declarative surface 的 onSubmitSuccess/onSubmitError 由 form submit 触发，逻辑与 action-style 一致」；同文档 :289 明确「submit hooks 只对 action-style 有效，declarative surface 内的 form submit 不触发 surface callback」；live `use-surface-renderer.ts` 创建 declarative entry 不传 onSubmitSuccessNodes → triggerHook 走 `skipped` 分支（surface-runtime.ts:259-268）。文档自相矛盾且 :574 与 live 不符。
- `packages/flux-runtime/src/action-adapter.ts:408-425`（refreshSource/refreshNearest）：`runRequest`（api-data-source-controller.ts:140-154）内部 catch 全部失败为状态机错误态不 re-throw → `controller.refresh()` 永远 resolve（source-registry.ts:425-454 恒 `return true`）；refreshSource 在请求 500 时仍返回 `{ok:true, data:true}`。`DataSourceRefreshResult` 类型（flux-core/types/runtime.ts:423-426）只有 `skipped` 字段，契约层无错误通道。`refresh-nearest.ts:130-137` 同模式。
- 折叠 P2 的 live 事实（均已核对）：444 计划（2026-06-02）completed + 119 项未勾选（17-03 rename `use-form-hooks.ts` 未落地）；2026-07-28-1430 surface-lifecycle-callbacks 源计划 completed + 19 项未勾选（close 改 async 以相反方案落地仅散注）；CR plan 2026-08-06-0329-1 4 项已落地但 checkbox 未勾选且 closure evidence 声称「全部 [x]」；action-scope-and-imports.md:273-277 "Current live shape" 含已移除 componentName、:483-489 声称 `dialog`/`drawer` action 名 remains supported（live constants.ts:31-46 无此 selector）；surface-lifecycle-callbacks.md:446-483 伪代码与 live refresh-nearest.ts 不符（auto 漏 form、componentType vs type、已实现的 findFirstInScope 被描述为未实现）、:216-256 行号锚点漂移 3-31 行 + console.warn 片段实为 reportRuntimeHostIssue；`resolveInitFetch`（api-data-source-controller.ts:27-39）裸 catch 静默吞错返回 true；`blob-download.ts:74-106` JSON-in-blob 解析失败被空 catch 吞掉且无文件名时返回合成成功 `{ok:true,status:0,data:{msg:'downloading'}}`。

## Goals

- 两份/关联的 `completed` 计划（gantt-ai-e2e、452、444、2026-07-28-1430、CR 2026-08-06-0329-1）状态与文件内容一致：按 Rule 21 修复事实性错误，状态回退 `in progress`/`superseded` 或按 live 核对勾选并注记，不残留「completed + 未勾选项」矛盾。
- `ActionShapeLikeFields.componentName` 幽灵字段消除（删除或编译期 `invalid-action-shape` 拒绝），action-scope-and-imports.md 与 live 三方一致（文档/类型/schema）。
- surface-lifecycle-callbacks.md 内部自洽且与 live 行为一致（declarative 仅 function-based onClose、schema-form submit hooks 仅 action-style 生效）。
- refreshSource/refreshNearest 失败语义收敛：请求失败不再被肯定性报告为成功；`DataSourceRefreshResult` 契约扩展（skipped 之外 ok/error），与 ajax 失败语义对齐；api-data-source.md 契约节同步。
- 折叠 P2（resolveInitFetch 诊断、blob-download 失败不吞、plan checkbox 族、文档锚点族）同步收口。

## Non-Goals

- 不实现 declarative surface 与 action-style 的 onSubmitSuccess 行为对齐（那是产品演进决策，审计建议「如要对齐则单独立项」，本 plan 只修正文档断言）
- 不处理其它零消费者导出/死代码（flux-compiler/flux-action-core/根入口族 P2-08/09/29/30/31 等，入 follow-up backlog）
- 不重写历史计划文本风格，只修复事实性错误（Rule 21 约束）

## Scope

### In Scope

- `docs/plans/2026-07-25-2-gantt-ai-e2e-test-coverage-and-fix-plan.md`、`docs/plans/452-submitForm-surface-discovery-and-component-id-name-unification-plan.md`、`docs/plans/444-deep-audit-2026-06-02-consolidated-remediation-plan.md`、`docs/plans/2026-07-28-1430-surface-lifecycle-callbacks.md`、`docs/plans/2026-08-06-0329-1-cr-cross-family-centralized-remediation.md`
- `packages/flux-core/src/types/schema.ts`（componentName 幽灵字段）+ 编译期拒绝路径（`packages/flux-compiler/src/action-compiler.ts`，若选拒绝方案）
- `docs/architecture/action-scope-and-imports.md`、`docs/architecture/surface-lifecycle-callbacks.md`
- `packages/flux-runtime/src/action-adapter.ts`、`packages/flux-runtime/src/async-data/source-registry.ts`、`packages/flux-runtime/src/refresh-nearest.ts`、`packages/flux-runtime/src/async-data/api-data-source-controller.ts`、`packages/flux-runtime/src/async-data/blob-download.ts`
- `packages/flux-core/src/types/runtime.ts`（DataSourceRefreshResult 扩展）
- `docs/architecture/api-data-source.md`（refresh 契约节）

### Out Of Scope

- surface callback 行为对齐（见 Non-Goals）
- flow-designer reason-only 失败降级（P2-16）、word-editor provider 契约（P2-07）等其它 P2（入 follow-up backlog）

## Failure Paths

| 场景                           | 触发                                                     | 预期行为                                                       | 可重试 | 用户可见表现            |
| ------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------- | ------ | ----------------------- |
| refreshSource 接口 500         | `{action:'refreshSource', then:{...showToast '已刷新'}}` | `ok:false` + error；then 不执行；onError 触发                  | 是     | 错误提示而非「已刷新」  |
| refreshNearest 源不存在        | 目标 handle 缺失                                         | `ok:false` + error（源未找到）                                 | 是     | 失败分支执行            |
| initFetch 表达式抛错           | 门表达式求值异常                                         | reportRuntimeHostIssue 记录 + 保守 fetch 照常                  | 是     | host issue 通道可见诊断 |
| blob 响应损坏 JSON             | 服务器返回错误信封                                       | 失败返回 `{ok:false, error}`（含 cause），不合成成功           | 否     | 下载不成功且错误可见    |
| 作者写 componentName targeting | schema `{action:'x', componentName:'y'}`                 | 编译期 `invalid-action-shape` 拒绝（或字段删除后文档不再承诺） | 否     | 编译期诊断而非静默丢弃  |
| 读者阅读 gantt/452 plan        | 打开 completed 计划                                      | 状态与内容一致，不误信「e2e 已覆盖」                           | 否     | 计划状态诚实可读        |

## Test Strategy

本档选择：`必须自动化` —— Phase 4 是公开动作契约（refreshSource 编排语义）变更，Proof 先于 Fix（该档位覆盖本 plan 唯一的代码行为变更面）；Phase 1-3 为文档/计划事实修正，无行为变更，其 Exit Criteria 以 repo-observable 文本一致性为准（该部分不适用自动化，理由已述）。

## Execution Plan

### Phase 1 - plan 状态事实性修正（P1-03 + P1-04 plan 部分 + 折叠 P2-22/P2-23/P2-34）

Status: planned
Targets: `docs/plans/2026-07-25-2-gantt-ai-e2e-test-coverage-and-fix-plan.md`、`docs/plans/452-submitForm-...md`、`docs/plans/444-deep-audit-2026-06-02-...md`、`docs/plans/2026-07-28-1430-surface-lifecycle-callbacks.md`、`docs/plans/2026-08-06-0329-1-cr-cross-family-centralized-remediation.md`

- Item Types: `Fix | Decision`

- [ ] Fix：gantt-ai-e2e plan（P1-03）：按 live 代码核对 Phase 0 的 7 项 Gantt 渲染缺陷修复落地情况；状态回退 `in progress`（或标注 superseded）；closure 声称「e2e 覆盖完成」改写为实际状态（gantt-bars-and-links / gantt-editor-and-keyboard spec 已由后续轮次补齐可注明）；未勾选项逐条标注或移入 Deferred 区
- [ ] Fix：452 plan（P1-04 plan 部分）：状态回退 `in progress`；Phase 1/2 按 live 核对勾选已落地项、剩余项保持未勾选状态；Status Note 改写为真实状态
- [ ] Fix：444 plan（P2-22）：completed 状态下 119 项未勾选——按 Rule 21 修复事实性错误：为未勾选项标注落地状态或整体加 Outdated Note（17-03 rename 确认未落地时保持未勾选并注记）
- [ ] Fix：2026-07-28-1430 plan（P2-23）：close 改 async 两项按实际落地形态（sync fire-and-forget，surface-runtime.ts:199-229）改写/勾选，加执行偏差摘要
- [ ] Fix：CR plan 2026-08-06-0329-1（P2-34）：4 项已落地 checkbox 勾选，或在 closure audit evidence 注明「落地后未回写 checkbox」；修正「全部 [x]」的错误声称
- [ ] Decision：以上修正按 Rule 21「事实性错误可修」执行，不动历史计划模板风格

Exit Criteria:

- [ ] 五份 plan 文件内不再存在「Plan Status: completed + 未勾选 in-scope item」矛盾（逐份核对）
- [ ] gantt plan 的 e2e 覆盖声称与实际运行记录一致；452 plan Status Note 与 Phase 状态一致
- [ ] 修正记录（每份 plan 的改动摘要）写入 `docs/logs/2026/08-11.md`

### Phase 2 - componentName 幽灵契约消除 + targeting 文档同步（P1-04 代码部分 + 折叠 P2-11/P2-12）

Status: planned
Targets: `packages/flux-core/src/types/schema.ts`、`packages/flux-compiler/src/action-compiler.ts`（如选拒绝方案）、`docs/architecture/action-scope-and-imports.md`

- Item Types: `Fix | Decision | Proof`

- [ ] Decision：裁决 `ActionShapeLikeFields.componentName` 处置——(a) 删除字段（零消费，最简）；或 (b) 保留类型但加编译期 `invalid-action-shape` 拒绝并诊断「componentName targeting 已移除」。默认 (a)，除非 schema 向后兼容面要求 (b)
- [ ] Fix：按裁决落地 schema.ts:83（删除或加拒绝规则），`packages/flux-compiler/src/action-compiler.ts`（:59-62 不复制该字段的现有实现）对仍写入 componentName 的作者输入给出编译期诊断（选 (b) 时）
- [ ] Proof：编译期测试钉住：schema 写入 componentName → 删除方案下类型不可写（typecheck 断言）/ 拒绝方案下产生 invalid-action-shape 诊断（先红后绿）
- [ ] Fix：`action-scope-and-imports.md:273-277` "Current live shape" 代码块移除 componentName；:16/:249/:299 等处「by componentId or componentName」表述改为 componentId-only
- [ ] Fix：`action-scope-and-imports.md:483-489`：删除 `dialog`/`drawer` action 名「remains supported for compatibility」断言（live 无此 selector），或显式标注「已移除/未实现」；保留 closeDialog/closeDrawer 的准确断言（P2-11）

Exit Criteria:

- [ ] schema.ts 无 componentName 幽灵字段（或编译期拒绝生效且有诊断测试）
- [ ] action-scope-and-imports.md 与 live ComponentTarget/注册表一致（doc ↔ type ↔ schema 三方核对）
- [ ] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-core typecheck`）

### Phase 3 - surface-lifecycle-callbacks.md 自洽修订（P1-05 + 折叠 P2-13/P2-35）

Status: planned
Targets: `docs/architecture/surface-lifecycle-callbacks.md`

- Item Types: `Fix`

- [ ] Fix：删除或改写 :569-576「declarative surface 的 onSubmitSuccess/onSubmitError 由 form submit 触发」断言，明确：declarative surface 当前仅 function-based onClose 生效；schema-form submit hooks 仅 action-style 生效（与 :289 一致）；删除「两种 authoring 入口 callback 行为对齐」的失真描述（若要对齐则单独立项）
- [ ] Fix：§Finding Algorithm 伪代码对齐 live refresh-nearest.ts（auto 匹配集含 form、属性名 handle.type）；「实现注意事项」中已实现的 findFirstInScope/handlesByScopeId 改写为已实现状态描述（P2-13）
- [ ] Fix：精确行号锚点改函数名锚点（:216/:254/:256/:423 等，P2-35）；"live implementation" 片段同步为 reportRuntimeHostIssue 或加「示意片段」注记

Exit Criteria:

- [ ] surface-lifecycle-callbacks.md 全文自洽（无同一事实两处相反断言）；:574 断言与 live `use-surface-renderer.ts` 行为一致
- [ ] 文档内行号锚点/代码片段与 live 代码一致（抽查 3 处以上）
- [ ] 无代码变更（纯文档 phase）

### Phase 4 - 异步失败传播契约收口（P1-06 + 折叠 P2-14/P2-15）

Status: planned
Targets: `packages/flux-runtime/src/action-adapter.ts`、`source-registry.ts`、`refresh-nearest.ts`、`async-data/api-data-source-controller.ts`、`async-data/blob-download.ts`、`packages/flux-core/src/types/runtime.ts`、`docs/architecture/api-data-source.md`

- Item Types: `Proof | Fix | Decision`

- [ ] Proof：focused 测试先红：mock 底层请求失败（runRequest 错误态）→ `refreshSource` 返回 `{ok:false, error}`（当前返回 ok:true）；refreshNearest 同型；`DataSourceRefreshResult` 断言含 ok/error 通道
- [ ] Decision：裁决 `DataSourceRefreshResult` 扩展形态（skipped 之外增加 `ok`/`error`，与 ajax 失败语义对齐；`data` 语义声明为「已调度/已刷新」事实结构），记录于 phase 内
- [ ] Fix：扩展 `DataSourceRefreshResult`（flux-core/types/runtime.ts:423-426）并实现 refreshSource/refreshNearest 在请求失败时返回 `{ok:false, error}`（chain：api-data-source-controller-runtime.ts:186-201 的 runRequest → api-data-source-controller.ts:140-154 → async-data/source-registry.ts:425-454 → action-adapter.ts:408-425 / refresh-nearest.ts:130-137）；保持「源未找到」与「请求失败」两种失败可区分
- [ ] Fix：`api-data-source.md:761-770` 契约节同步（component:refresh 的 skipped 语义 + refreshSource 动作结果 ok/error 语义）
- [ ] Fix：`resolveInitFetch`（api-data-source-controller.ts:27-39）裸 catch 补 `reportRuntimeHostIssue`（level error，说明 treating as true），保留保守 fetch 默认值（P2-14）
- [ ] Fix：`blob-download.ts:74-106` JSON 解析 catch 补诊断（携带 blob type/url）；无法解析文件名时返回 `{ok:false, error: new Error(..., {cause: parseError})}` 而非合成成功（P2-15）
- [ ] Proof：既有调用方回归——依赖 `{ok:true}` 成功分支的编排测试核对；blob-download 既有测试（含 JSON-in-blob 恢复路径）零回归

Exit Criteria:

- [ ] refreshSource/refreshNearest 失败语义测试通过（先红后绿）；ok:true 不再在请求失败时出现
- [ ] api-data-source.md 契约节与 live 一致
- [ ] resolveInitFetch 失败有诊断通道；blob-download 不再返回合成成功
- [ ] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-runtime typecheck` + `pnpm --filter @nop-chaos/flux-core typecheck`）

## Draft Review Record

> 起草后、执行前的独立审查证据。见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。

- Reviewer / Agent: 独立子 agent fresh session（round 1 `ses_00efef550ffe9e8YB08gqugdDr`；round 2 `ses_00ef5f528ffe9HWl7q5uXS7HIp`；round 3 `ses_00eeca7efffe8K596ShPfA17uo`）
- Verdict: `pass`
- Rounds: 3
- Findings addressed: round 1 Major（Phase 2 Targets 错误路径 `packages/flux-core/src/compile/action-compiler.ts` → 改为存在的 `packages/flux-compiler/src/action-compiler.ts`）已修复并经 round 2/3 复核确认；Minors 已吸收——In Scope 补全 flux-runtime async-data 全路径、Test Strategy 档位声明含逐 phase 理由、action-compiler 引用范围改 :59-62、refreshSource 失败链锚点改为 runRequest 实际位置（api-data-source-controller-runtime.ts:186-201）

## Closure Gates

- [ ] 所有 in-scope confirmed live defects / contract drifts 已修复（P1-03..P1-06 及折叠 P2 按 phase 完成）
- [ ] 五份 plan 文件无「completed + 未勾选」矛盾残留；无被静默降级到 deferred 的 in-scope 项
- [ ] componentName 幽灵字段消除；action-scope-and-imports.md 与 live 一致
- [ ] surface-lifecycle-callbacks.md 与 live 行为自洽
- [ ] refreshSource/refreshNearest 失败语义测试（先红后绿）记录在案；api-data-source.md 同步
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### declarative surface onSubmitSuccess 行为对齐

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本 plan 只修正文档失真（P1-05 要求「删除或改写断言」）；行为对齐是产品演进决策，审计明确「如要对齐则单独立项」
- Successor Required: `no`
- Successor Path: 入 follow-up backlog 登记，若产品侧要求对齐再立新 plan

## Non-Blocking Follow-ups

- 无（其余发现入 `docs/backlog/audit-followups-2026-08-11-1929.md`）

## Closure

Status Note: 待完成

Closure Audit Evidence:

- Auditor / Agent: 待定
- Evidence: 待定

Follow-up:

- 待完成时填写
