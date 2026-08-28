# 3 声明与现状一致性收口（plan 状态失真 / 幽灵契约与文档 / surface 文档自相矛盾 / 异步失败传播契约）（component-audit-round2）

> Plan Status: completed（2026-08-24 执行完成：4 Phase 全 completed + 全量验证绿 + 独立 closure-audit approved（fresh sub-agent task `ses_fce641346ffefFiAY8zczltmW2`，零 Blocker/零 Major，2 Minor 非阻塞））
> Last Reviewed: 2026-08-24
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

Status: completed
Targets: `docs/plans/2026-07-25-2-gantt-ai-e2e-test-coverage-and-fix-plan.md`、`docs/plans/452-submitForm-...md`、`docs/plans/444-deep-audit-2026-06-02-...md`、`docs/plans/2026-07-28-1430-surface-lifecycle-callbacks.md`、`docs/plans/2026-08-06-0329-1-cr-cross-family-centralized-remediation.md`

- Item Types: `Fix | Decision`

- [x] Fix：gantt-ai-e2e plan（P1-03）：按 live 代码核对 Phase 0 的 7 项 Gantt 渲染缺陷修复落地情况；状态回退 `in progress`（或标注 superseded）；closure 声称「e2e 覆盖完成」改写为实际状态（gantt-bars-and-links / gantt-editor-and-keyboard spec 已由后续轮次补齐可注明）；未勾选项逐条标注或移入 Deferred 区（落地：`in progress` + Outdated Note；Phase 0 六项补勾一项 superseded 注记；失真 Closure Gates 撤回改 [ ] 并注记）
- [x] Fix：452 plan（P1-04 plan 部分）：状态回退 `in progress`；Phase 1/2 按 live 核对勾选已落地项、剩余项保持未勾选状态；Status Note 改写为真实状态（落地：全部 14 项核对后均已落地并补勾；Status Note 改写；schema.ts 幽灵字段移交 Phase 2 注记）
- [x] Fix：444 plan（P2-22）：completed 状态下 119 项未勾选——按 Rule 21 修复事实性错误：为未勾选项标注落地状态或整体加 Outdated Note（17-03 rename 确认未落地时保持未勾选并注记）（落地：Outdated Note + 11 workstream 逐项抽核补勾；17-03/15-01/17-04 三项偏差保持未勾选并移入 Deferred But Adjudicated）
- [x] Fix：2026-07-28-1430 plan（P2-23）：close 改 async 两项按实际落地形态（sync fire-and-forget，surface-runtime.ts:199-229）改写/勾选，加执行偏差摘要（落地：Phase 1/2/3 共 19 项补勾，close 两项按 sync fire-and-forget 形态改写，新增执行偏差摘要三条）
- [x] Fix：CR plan 2026-08-06-0329-1（P2-34）：4 项已落地 checkbox 勾选，或在 closure audit evidence 注明「落地后未回写 checkbox」；修正「全部 [x]」的错误声称（落地：4 项补勾附 live 锚点；Closure Audit Evidence 补修正注记）
- [x] Decision：以上修正按 Rule 21「事实性错误可修」执行，不动历史计划模板风格（各修正均为注记/勾选/状态回退，未重写原文叙述）

Exit Criteria:

- [x] 五份 plan 文件内不再存在「Plan Status: completed + 未勾选 in-scope item」矛盾（逐份核对）（gantt 回退 in progress + 452 回退 in progress + 444 偏差项显式移入 Deferred + 1430/CR 全项补勾；保留的未勾选项均处于非 completed 计划内或已显式裁定）
- [x] gantt plan 的 e2e 覆盖声称与实际运行记录一致；452 plan Status Note 与 Phase 状态一致
- [x] 修正记录（每份 plan 的改动摘要）写入 `docs/logs/2026/08-11.md`（2026-08-24 追记节）+ `docs/logs/2026/08-24.md`

### Phase 2 - componentName 幽灵契约消除 + targeting 文档同步（P1-04 代码部分 + 折叠 P2-11/P2-12）

Status: completed
Targets: `packages/flux-core/src/types/schema.ts`、`packages/flux-compiler/src/action-compiler.ts`（如选拒绝方案）、`docs/architecture/action-scope-and-imports.md`

- Item Types: `Fix | Decision | Proof`

- [x] Decision：裁决 `ActionShapeLikeFields.componentName` 处置——**采用 (a)+(b) 组合**：删除字段（类型面零消费已核实：`compileTargeting` 只读 `_targetCid/_targetTemplateId/targetId/componentId/dialogId/surfaceId`；index signature 使「类型不可写」断言不可行，`SchemaObject` 的 `[key: string]: SchemaValue` 吞掉 excess property），同时加编译期 `invalid-action-shape` 拒绝（对遗留 componentName 写法给出 componentId 迁移诊断，兑现 Failure Paths「编译期诊断而非静默丢弃」）
- [x] Fix：按裁决落地 schema.ts:83（删除字段）+ `flux-compiler/src/schema-compiler/shape-validation-rules-action.ts` `validateActionShape` 加 componentName 拒绝规则（message 提示「use componentId (resolves handle.id first, then handle.name)」）；同步删除 `flux-guide/flux-types/common.d.ts` `ActionShapeFields.componentName`（作者面类型同步）
- [x] Proof：编译期测试钉住：`packages/flux-compiler/src/schema-compiler-componentname-targeting.test.ts`——componentName 写法 → `invalid-action-shape` 诊断（**先红**：修复前 1 failed 实证；**后绿**：flux-compiler 40 files / 553 tests 全过）；componentId 写法零误伤断言
- [x] Fix：`action-scope-and-imports.md` 全文 componentName targeting 表述清除：:16 Purpose、:249 Component Handle Registry、:273-277 "Current live shape" ComponentTarget 代码块、:299 `_targetCid` 共存表述、:369/:655/:666/:675/:682/:683/:1243/:1294 共 12 处改 componentId-only（含 component:refresh 示例 JSON 的 componentName → componentId）
- [x] Fix：`action-scope-and-imports.md:483-489`：删除 `dialog`/`drawer` action 名「remains supported for compatibility」断言（live `BUILT_IN_ACTION_REGISTRY`（flux-core/constants.ts:30-47）无此 selector），改写为「canonical selectors；bare dialog/drawer 为 unknown action」；保留 closeDialog/closeDrawer 的准确断言（P2-11）
- [x] Fix（折叠 P2-12 componentName 文档族）：`capability-contract-model.md`（:270 warning-only 表述 + :293 lookup basis）、`flux-core.md:263`、`flux-runtime-module-boundaries.md:352`、`static-capability-validation.md`（:185/:261）、`surface-owner.md:370`、`template-instantiation-and-node-identity.md:504` ComponentTarget 代码块——全部改 componentId-only；:312 unsafe-lowering 反面示例与 :16 removal 注记保留

Exit Criteria:

- [x] schema.ts 无 componentName 幽灵字段（或编译期拒绝生效且有诊断测试）（两者均落地：字段已删 + 拒绝规则有红绿测试）
- [x] action-scope-and-imports.md 与 live ComponentTarget/注册表一致（doc ↔ type ↔ schema 三方核对：schema.ts actions.ts component-handle-core.ts 三类型无 componentName；docs/architecture 全域 targeting 语境零残留（反面示例/移除注记除外）；flux-guide d.ts 同步）
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-core typecheck`）（flux-core/flux-compiler/flux-runtime/flux-action-core 四包 typecheck 全绿）

### Phase 3 - surface-lifecycle-callbacks.md 自洽修订（P1-05 + 折叠 P2-13/P2-35）

Status: completed
Targets: `docs/architecture/surface-lifecycle-callbacks.md`

- Item Types: `Fix`

- [x] Fix：删除并改写 §Relationship With Declarative Surface（原 :569-576）「declarative surface 的 onSubmitSuccess/onSubmitError 由 form submit 触发」断言——改为：declarative surface 当前仅 function-based onClose 生效；submit hooks 只对 action-style 有效（use-surface-renderer 创建 declarative entry 不写 onSubmitSuccessNodes → triggerHook 走 skipped 分支，与 :289 及 live 一致）；删除「两种 authoring 入口 callback 行为对齐」失真描述，显式标注行为对齐为未承诺项（如要对齐则单独立项）
- [x] Fix：§Finding Algorithm 伪代码对齐 live refresh-nearest.ts（auto 匹配集含 form、属性名 `handle.type`、registry.parent 链遍历、runtime.findFirstInScope 数据源路径）；「实现注意事项」改写为已实现状态描述（`handlesByScopeId` scope-id 索引 + 两 registry findFirstInScope 均已落地）（P2-13）
- [x] Fix：精确行号锚点改函数名/调用点锚点（use-surface-renderer onClose 调用点、publishClosed 三调用点、close 调用方清单——原 :223/325/348、:328/:209/:239、:340/:358/:380 全部去行号）；"live implementation" close 片段同步为 `reportRuntimeHostIssue`（level warning）+ §Hook Error Semantics 对应 prose 同步；§字段命名说明的「编译后的 ActionNode[]」更正为 `ActionSchema | ActionSchema[]`（runtime dispatch 编译执行）；Owner Context Reconstruction 片段同步 live `dispatchInOwner`（ownerScope/ownerNodeInstance fallback 形态）（P2-35）

Exit Criteria:

- [x] surface-lifecycle-callbacks.md 全文自洽（无同一事实两处相反断言）；declarative submit-hook 断言与 live `use-surface-renderer.ts` 行为一致（新 §Relationship With Declarative Surface 与 §Submit Hooks「只对 action-style 有效」及 live skipped 分支三方一致）
- [x] 文档内行号锚点/代码片段与 live 代码一致（抽查 5 处：close 片段 reportRuntimeHostIssue（surface-runtime.ts:218-227）、ownerCtx 片段（surface-hooks.ts:40-53）、Finding Algorithm（refresh-nearest.ts:47-79）、form.tsx console.warn（:183）、request-runtime/action-execution 锚点区间（仍有效））
- [x] 无代码变更（纯文档 phase）

### Phase 4 - 异步失败传播契约收口（P1-06 + 折叠 P2-14/P2-15）

Status: completed
Targets: `packages/flux-runtime/src/action-adapter.ts`、`source-registry.ts`、`refresh-nearest.ts`、`async-data/api-data-source-controller.ts`、`async-data/blob-download.ts`、`packages/flux-core/src/types/runtime.ts`、`docs/architecture/api-data-source.md`

- Item Types: `Proof | Fix | Decision`

- [x] Proof：focused 测试先红：`packages/flux-runtime/src/__tests__/runtime-sources-refresh-failure.test.ts` 6 用例（mock 底层请求 500 → refreshSource/refreshNearest/refreshDataSource/controller.refresh 四层断言 `{ok:false, error}`；源未找到可区分；sendOn gate skipped 形态钉住；initFetch 诊断）+ `blob-download.test.ts` 2 用例（损坏 JSON / 无文件名）——**先红实证 8 failed**（修复前 ok:true 合成成功），后随 Fix 全绿
- [x] Decision：裁决 `DataSourceRefreshResult` 扩展形态——skipped 之外增加可选 `ok`/`error`（与 ajax 失败语义对齐：`skipped:true` = 门控/去重/被取代，既非成功也非失败、无 ok 通道；`ok:false` = 请求失败或取消；`ok:true` = 已完成发布）；新增 `DataSourceRefreshOutcome { found, result? }` 作为 `refreshDataSource` 返回契约，`found:false`（源未找到）与 `result.ok:false`（请求失败）两种失败可区分；action 层 `data` 语义保持「已调度/已刷新」布尔事实结构（成功 `data:true`、失败 `data:false`）；cancel-previous pending / ignore-new / stale-dropped 归入 `deferred → skipped:true`（该调用未观察到完成的请求周期，文档化于 api-data-source.md）
- [x] Fix：扩展 `DataSourceRefreshResult`（flux-core/types/runtime.ts）并实现失败传播链：`runRequest` 返回 `DataSourceRequestRunOutcome`（succeeded/failed/cancelled/deferred，api-data-source-controller-runtime.ts 全部 return 路径分类）→ `refresh()` 映射 ok/error（api-data-source-controller.ts；formula controller 同步补 `ok:true`，rejection 由 source-registry `runControllerRefresh` 归一化为 `ok:false`）→ `refreshDataSource` 返回 outcome（source-registry.ts:425-454 + runtime-factory/renderer-core 类型）→ refreshSource（action-adapter.ts：not-found 与 request-failed 两分支均可区分且 `{ok:false}`）/ refreshNearest（refresh-nearest.ts source 路径）→ `component:refresh` capability（flux-renderers-data/data-source-renderer.tsx 同步传播失败，附 focused 测试）
- [x] Fix：`api-data-source.md` 契约节同步（Refresh Mechanisms 节重写：DataSourceRefreshResult 三态契约 + component:refresh 结果语义 + refreshSource ok/error 与 not-found/failed 可区分说明；Component Handles 表同步）
- [x] Fix：`resolveInitFetch` 裸 catch 补 `reportRuntimeHostIssue`（level error，message「initFetch evaluation failed; treating as true (conservative fetch)」），保守 fetch 默认值保留（P2-14）；附带 `ActionDataSourceSchema.initFetch` 类型放宽 `boolean | string`（动态 `${...}` 表达式本就被 compileValue 编译为 CompiledRuntimeValue，类型面如实化）
- [x] Fix：`blob-download.ts` JSON 解析 catch 补诊断（msg 携带 blob type/url/parse error cause）；无法解析文件名时返回 `{ok:false, status:0, msg}` 而非合成成功（P2-15）
- [x] Proof：既有调用方回归——依赖 `{ok:true}` 成功分支的编排测试核对（runtime-actions-advanced.test.ts refreshSource formula 路径 / data-source-capabilities.test.ts component:refresh 成功+skipped 路径零回归）；blob-download 既有测试（含 JSON-in-blob 恢复路径）零回归；受契约变更影响的 7 个既有断言按新 outcome 形态更新（runtime-sources-refresh / dedup / lifecycle A19 / source-registry / action-adapter.builtins）

Exit Criteria:

- [x] refreshSource/refreshNearest 失败语义测试通过（先红后绿：8 failed → 全绿记录在案）；ok:true 不再在请求失败时出现（failure 测试断言 ok:false + error instanceof Error）
- [x] api-data-source.md 契约节与 live 一致
- [x] resolveInitFetch 失败有诊断通道（notify 'error' + 'initFetch' message 断言）；blob-download 不再返回合成成功（两用例断言 ok:false + 不触发下载）
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-runtime typecheck` + `pnpm --filter @nop-chaos/flux-core typecheck`）（全仓 37/37 亦绿）

## Draft Review Record

> 起草后、执行前的独立审查证据。见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。

- Reviewer / Agent: 独立子 agent fresh session（round 1 `ses_00efef550ffe9e8YB08gqugdDr`；round 2 `ses_00ef5f528ffe9HWl7q5uXS7HIp`；round 3 `ses_00eeca7efffe8K596ShPfA17uo`）
- Verdict: `pass`
- Rounds: 3
- Findings addressed: round 1 Major（Phase 2 Targets 错误路径 `packages/flux-core/src/compile/action-compiler.ts` → 改为存在的 `packages/flux-compiler/src/action-compiler.ts`）已修复并经 round 2/3 复核确认；Minors 已吸收——In Scope 补全 flux-runtime async-data 全路径、Test Strategy 档位声明含逐 phase 理由、action-compiler 引用范围改 :59-62、refreshSource 失败链锚点改为 runRequest 实际位置（api-data-source-controller-runtime.ts:186-201）

## Closure Gates

- [x] 所有 in-scope confirmed live defects / contract drifts 已修复（P1-03..P1-06 及折叠 P2 按 phase 完成）
- [x] 五份 plan 文件无「completed + 未勾选」矛盾残留；无被静默降级到 deferred 的 in-scope 项（gantt/452 回退 in progress；444 三项偏差显式裁定入 Deferred；closure-audit 逐份核对确认）
- [x] componentName 幽灵字段消除；action-scope-and-imports.md 与 live 一致（字段删除 + 编译期拒绝 + 文档族 7 份清扫）
- [x] surface-lifecycle-callbacks.md 与 live 行为自洽（declarative submit-hook 断言、Finding Algorithm、锚点/片段三面修正）
- [x] refreshSource/refreshNearest 失败语义测试（先红后绿 8 failed → 全绿）记录在案；api-data-source.md 同步
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（auditor `ses_fce641346ffefFiAY8zczltmW2` verdict **approved**——零 Blocker/零 Major；2 Minor 非阻塞：452 可在后续 hygiene pass 回升 completed；gantt plan 历史 [x] gates 带诚实注记无需处理。逐 Phase live 证据 + flux-compiler/flux-runtime 独立复跑见 Closure Audit Evidence）
- [x] `pnpm typecheck`（37/37）
- [x] `pnpm build`（37/37）
- [x] `pnpm lint`（37/37，0 error）
- [x] `pnpm test`（68/68 tasks 全绿：flux-runtime 1431 / flux-renderers-data 871 / flux-compiler 553 / flux-core 513 等；`pnpm check` exit 0 仅既有登记红）

## Deferred But Adjudicated

### declarative surface onSubmitSuccess 行为对齐

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本 plan 只修正文档失真（P1-05 要求「删除或改写断言」）；行为对齐是产品演进决策，审计明确「如要对齐则单独立项」
- Successor Required: `no`
- Successor Path: 入 follow-up backlog 登记，若产品侧要求对齐再立新 plan

## Non-Blocking Follow-ups

- 无（其余发现入 `docs/backlog/audit-followups-2026-08-11-1929.md`）

## Closure

Status Note: completed（2026-08-24）。四 Phase 收口：①五份历史 plan 状态事实性修正（gantt/452 回退 in progress、444 checklist 回写 + 3 项偏差裁定、1430/CR 补勾 + 偏差摘要），修正摘要双登记（08-11.md 追记 + 08-24.md）；②componentName 幽灵契约消除（类型删除 + `invalid-action-shape` 编译期拒绝 + 7 份文档清扫，红绿测试钉住）；③surface-lifecycle-callbacks.md 与 live 三方自洽（declarative submit-hook 断言修正为核心）；④refreshSource/refreshNearest/blob-download/initFetch 失败传播契约收口（`DataSourceRefreshResult` ok/error 三态 + outcome found/result 可区分，8 用例先红后绿，7 既有断言更新，api-data-source.md 同步）。执行中发现并裁定的历史偏差（444 的 17-03/15-01/17-04）均已登记 Deferred + successor 路径。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent task `ses_fce641346ffefFiAY8zczltmW2`（closure audit，2026-08-24）
- Evidence: verdict **approved**——零 Blocker / 零 Major；2 Minor 非阻塞（452 残留 status 可后续 hygiene 回升；gantt 历史 [x] gates 注记已足够）。独立复跑：flux-compiler 40 files/553 tests（含 componentName 拒绝测试）、flux-runtime `runtime-sources-refresh-failure.test.ts` + `blob-download.test.ts` 19/19 green；逐 Phase live 锚点核对（shape-validation-rules-action.ts:164-175 / action-adapter.ts:437-456 / refresh-nearest.ts:125-150 / blob-download.ts:100-116 / surface-lifecycle-callbacks.md:580-587 / 五份 plan 逐份一致性）；失败路径确认「request failure cannot reach the {ok:true} return」。

Follow-up:

- 452 plan 可在后续 hygiene pass 回升 `completed`（其唯一残留幽灵字段已由本 plan Phase 2 收口）——Minor，非阻塞
- 444 Deferred 三项（17-03 rename / 15-01 stopWhen null-member fail-closed / 17-04 命名映射文档）按各自 successor 路径处理；15-01 与本 plan Phase 4 的 async-data 失败语义族联动
- declarative surface onSubmitSuccess 行为对齐（本 plan Deferred But Adjudicated，out-of-scope improvement）
- 其余 P2 发现见 `docs/backlog/audit-followups-2026-08-11-1929.md`
