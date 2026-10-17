# 633 跨 roadmap Wave B 渲染器级 P2（UR-5 工具栏反馈管线 + UR-4 ai-conversations 传播链钉 + UR-6 N-2 竞态取证）

> Plan Status: completed（2026-10-17 closure audit approved（独立子 agent agent_3071f896，0 Blocker / 0 Major / 5 Minor 随同批修正））
> Last Reviewed: 2026-10-17
> Source: `docs/backlog/cross-roadmap-remediation-roadmap.md` UR-4 / UR-5 / UR-6（Wave B 渲染器级 P2 follow-up）
> Related: `docs/analysis/2026-10-03-playground-full-traversal-ux-roadmap.md` §七 W-B/W-D 执行期登记、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` N-2 登记、`docs/bugs/163-import-overlay-captures-schema-event-setValue-writes.md`、plan 547 / WA-13a（designer-toolbar then 链先例）

## Purpose

收口 Wave B 三项：①设计器工具栏动作反馈管线统一（invokeAction 直连 provider 绕过 ActionDispatcher 管线 → dispatcher 化，schema then/args 真实生效）；②ai-conversations 会话列表传播链剩余腿钉（delete/rename 判别 e2e）与传播链现状结论；③N-2 linear-issues 首屏空面板竞态取证（候选机理复现 → 结论 + 处置）。完成后按回写映射更新源 roadmap 登记条目。

## Current Baseline

- **UR-5（2026-10-17 实读）**：`packages/flow-designer-renderers/src/designer-toolbar.tsx:109-122` invokeAction 直连 `actionScope.resolve().provider.invoke(method, undefined, ctx)`——**payload 硬编码 undefined，schema args 全部丢弃**；:128-145 runThenChain 手写 then 执行器（showToast 特判走 env.notify、其余步骤递归 invokeAction 同样丢 args）；:147-164 失败走 notifyCommandFailure（warning 级）+ reportRuntimeHostIssue。通用管线（`packages/flux-action-core/src/action-dispatcher/action-execution.ts`）已支持：success → then 递归 dispatch（:512-525，携带 prevResult/branchBindings）、built-in showToast（`flux-runtime/src/action-adapter.ts:369-381`）、未处理失败自动 toast（:572 reportUnhandledFailureClass，describeActionFailure 文案）。`runtime.dispatch` 接受裸 ActionSchema（normalizeCompiledActionProgram 现场编译）；ctx 需显式传 `actionScope`（runtime-factory.ts:642 透传，invokeNamespacedAction 依赖它 resolve）。taskflow 双 schema 已有 then（`taskflow-dingflow-schema.json:874-887`、`taskflow-workflow-schema.json:1835-1848`，形如 `taskflow:save → showToast 已保存`）。**dispatcher 的 reportUnhandledFailureClass 在 dispatch 返回前执行（:572），toolbar 层事后标 failureHandled 无效；provider 层返回的 failure result 经 action-core normalizeActionResult（:214-216）原样透传、在 :193 检查前到达——provider/adapter 层标注有效**。失败 toast 语义裁定（Phase 1 Fix 落地口径）：toolbar dispatch 化后 provider 内 16 处 notifyCommandFailure（designer-action-provider.ts，undo :406/redo :415 等）**保持不动**——undo/redo 失败 = provider warning + dispatcher error 双 toast（与现状 provider warning + toolbar warning 数量持平，第二腿级别 warning→error）；save 失败 = dispatcher error 单 toast（现状 toolbar warning 单 toast，数量持平级别变化）；`reason='unchanged'` 为 createSuccess 成功态（designer-command-adapter.ts:59），本就不产生 toast，dispatcher 化后按成功走 then 链，无回退。provider 腿 + dispatcher 腿的双 toast 收敛（单 toast 归属）为既有状况，登记 Non-Blocking Follow-up（与 UR-9 诊断通道统一衔接），不在本 plan 展开。既有测试 `designer-controls.test.tsx` 断言旧契约 `invoke(method, undefined, ctx)`（:166/:257/:275）需随契约重写。
- **UR-4（2026-10-17 实读）**：传播链 store → pageData memo（`ai-conversations-demo.tsx:52-67`）→ schema data 同步（`schema-renderer.tsx:281-305` setSnapshot paths:['*']）→ 节点订阅重解析（`node-renderer-resolved.tsx:101-133`）→ 渲染器纯读 `props.props.conversations`——机制在。plan 549（33c0aac54）已拆除 xui:imports overlay（bug-163 缓解），**create 腿已闭合**（`tests/e2e/ai-conversations.spec.ts:18-36` New conversation → 列表 count+1 全链判别断言，绿）。剩余：①delete/rename 腿无本页 e2e 钉；②replace-clobber 风险（每次 pageData 变化 `kind:'replace'` 整体覆盖 snapshot，schema-renderer.tsx:291-295 自述；onItemClick setValue 写 `activeConversationId` 可能被 clobber 回退——高亮跳变类症状）；③bug-163 根修仍是 successor（任何页面重引 xui:imports 会再压死回路）。
- **UR-6（2026-10-17 实读 + 溯源）**：装载链 = complex-pages schema-page 缓存 → render-host → `apps/playground/src/complex-pages/page-schemas/linear-issues.json:7-16` data-source `issues`（ajax，dependsOn 三 filter）→ `source-registry.ts:337-388`（**:382 无条件 controller.start()**——"dependsOn 根未初始化"主张已被证伪）→ api-data-source-controller → `scope.update('issues', data)`。空面板 = `table-renderer.tsx:95-97` source 非数组（含 undefined）渲染 `empty` 槽。R11 稳定性钉 `tests/e2e/convergence-n1-n2.spec.ts:50-65`（3 次 fresh load 首行 30s 内可见，注释明示间歇变红即竞态信号）。**候选机理（3）**：①init run 被 cancel/defer 且无重试（runRequest 早退路径：stopped/in-flight dedup/cache 悬挂/isCurrentRun DEFERRED——唯一一次 init fetch 落入即永久 undefined，无输入时无恢复路径；`controller.refresh()` 对 stopped 控制器可复活 :147-154，解释"有输入即出数"）；②**fetch 失败路径不写数据**（`api-data-source-controller-runtime.ts:418-474` catch 置 error 态（toErrorDataSourceState :457）+ onError（:461）+ host issue（:466）但不 publish（publishControllerData 仅成功路径 :330/:397） → issues 永久 undefined，空态文案"当前筛选条件下没有问题"具误导性）；③mount 注册链抛错被 NodeErrorBoundary 吞（n2 钉未调用 assertTrackedPageErrors，控制台错误不使钉变红）。

## Goals

- UR-5：designer-toolbar 走 ActionDispatcher 管线（args 评估传递 + then 递归执行 + built-in showToast），删除手写 then 链与直连 invoke；失败诊断通道保留（reportRuntimeHostIssue）；失败 toast 语义统一（dispatcher error 级）并记录语义变化。taskflow Save/Export 反馈生效；word-editor / report-designer-host / dashboard-demo 保存反馈按各自管线补齐（schema then 或 onSave toast，先核实各自装载路径）。
- UR-4：ai-conversations delete/rename 两腿判别 e2e 钉（判别力：断链必挂，执行期以 clobber 探针侧证替代破坏式抽查）；replace-clobber 风险落结论（实测复现 → bounded 修复）；传播链现状注记回写源登记。
- UR-6：N-2 竞态取证完成——至少对候选②（fetch 失败不 publish）做定向复现实验；产出结论与处置（若坐实为 bounded live defect 则本 plan 内修复：失败态可见化 + 空态文案语义区分；若为探针伪影/环境阈值则书面结论 + 去向登记）。

## Non-Goals

- bug-163（xui:imports 捕获 schema 事件写）根修（既有 successor 登记）。
- ai-conversations 渲染器/flux-react 传播机制重构（机制已通，仅钉腿 + 结论）。
- N-2 候选①③的无限展开：候选①若两轮定向实验无法复现即登记"低频未复现 + 恢复路径存在"结论，不做防御性重构。
- report-designer-toolbar（report-designer-renderers 自有工具栏）的管线重写——Phase 1 先核实其装载路径；若它已走 dispatcher 则仅补 schema 反馈，不做第二份重写（避免跨包扩散，超出登记根因面）。

## Scope

### In Scope

- `packages/flow-designer-renderers/src/designer-toolbar.tsx`（dispatch 化 + 手写链删除）+ `designer-controls.test.tsx`（契约重写 + 新判别测试）。
- playground schema 反馈补齐：taskflow 双 schema（已具备，验证生效）、word-editor / report-designer-host / dashboard-demo 保存反馈（按核实结果落 schema then 或 onSave toast）。
- `tests/e2e/ai-conversations.spec.ts`（delete/rename 腿钉）、linear-issues 取证探针（`_tmp/` 下按 AGENTS.md 政策，结论留档后删除或升格）。
- 视取证结论：`packages/flux-renderers-data/src/table-renderer.tsx`（空态语义区分）或 data-source 失败态可见化（bounded 修复）。
- 回写：full-traversal §七 W-B/W-D 条目注记、designer-ux N-2 条目注记、cross-roadmap UR-4/5/6 行、daily log。

### Out Of Scope

- flux-react 传播机制、schema-renderer setSnapshot 语义重构。
- data-source 层整体重试/恢复机制设计（候选①若坐实且不可 bounded 修复，登记 successor）。
- Wave A/D/E 任何项。

## Failure Paths

| 编号               | 触发                                              | 行为                                                                                  | 可重试 | 用户可见表现 |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ | ------------ |
| schema-not-toolbar | word-editor/report-host 保存不走 designer-toolbar | 按其实际管线补反馈（schema then / onSave toast），登记核实结论                        | 是     | 无           |
| race-not-repro     | N-2 候选机理定向实验均无法复现                    | 书面结论（低频 + 恢复路径存在 + 钉持续守护）登记去向，不开防御性重构                  | 是     | 无           |
| dispatch-contract  | dispatcher 化后既有 designer 动作行为回归         | 先红后绿修复；无法 bounded 修复的回退为局部桥接并登记                                 | 是     | 无           |
| leg-red-defect     | UR-4 rename/delete 腿钉红且非测试问题             | 按 live defect 就地 bounded Fix（如 `${id}`/`${title}` 事件上下文求值缺陷），登记结论 | 是     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（UR-5 为行为契约变更：判别测试 = 旧实现下 payload undefined/then 不执行、新实现下 args 传递 + then 执行 + showToast 触发——旧实现必挂；UR-4 e2e 腿钉为本项交付物本体；UR-6 复现实验程序化取证）。

## Execution Plan

### Phase 1 - UR-5 工具栏反馈管线统一

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-toolbar.tsx`、`designer-controls.test.tsx`、playground 保存反馈 schema、相关 e2e

- Item Types: `Fix | Proof`

- [x] Proof：判别测试先行——designer-controls.test 重写为 dispatch 契约（runtime.dispatch 以 `{action, args?, then?}` + `{runtime, scope, actionScope}` 调用）：①旧实现下必挂的 args 传递断言；②then 链透传断言；③失败语义断言改为「toolbar 自身零 notify（dispatcher 独占失败 toast）」——**执行期裁定修订**：原计划的「toast 数量精确断言（undo/redo 恰 2/save 恰 1）」建立在 reportRuntimeHostIssue 为纯诊断通道的误判上（实读 `flux-core/src/utils/runtime-host-reporting.ts:17-33`：monitor 已移除，该函数默认就是 env.notify），故新实现 toolbar 失败路径完全不 notify（含 reportRuntimeHostIssue 调用整体删除），各场景 toast 数量严格减少（undo/redo 3→2、save/back 2→1），dispatcher 的 reportUnhandledFailureClass 成为唯一失败 toast；④back 钮无 then 直通。确认旧代码下全红（4 契约测试红态实测）。
- [x] Fix：designer-toolbar dispatch 化——invokeAction/runThenChain/handleActionFailure/notifyCommandFailure 导入删除，runToolbarAction 改 `runtime.dispatch({action, args?, then?}, {runtime, scope, actionScope})`，失败 toast 归属 dispatcher（语义变化：provider warning 腿保留、toolbar warning/error 腿移除，详见基线裁定与本条修订）。
- [x] Fix：word-editor / report-designer-host / dashboard-demo 保存反馈核实与补齐（Failure Path schema-not-toolbar 分支实证）：word-editor = 页面 schema 增 `onSave showToast`（`word-editor-page.tsx`，管线为 provider save → saveEvent 派发，非 designer-toolbar）+ **env notify 黑洞修复**（`createDefaultEnv().notify` 为 no-op——`word-editor-page.tsx`/`dashboard-demo.tsx` 接 `notifyWithToast`，这是 toast 不可见的真实根因）；report-designer-host = `report-designer-toolbar` 已走 helpers.dispatch（非旁路），补 defaults save 项 then（`report-designer-toolbar-defaults.ts`）+ `handleButtonClick` 透传 item.then（`toCommand` 映射原本丢弃）；dashboard-demo = onSave 链追加 showToast（`dashboard-editor:save` 事件管线）。
- [x] Proof：复验四页——taskflow save toast e2e 断言绿（`taskflow-designer-ui.spec.ts` 扩展 `[data-sonner-toast]` 已保存）；report-host save toast e2e 绿（`report-designer-host.spec.ts` 扩展）；word-editor save toast e2e 绿（`word-editor.spec.ts` 扩展「文档已保存」）；dashboard-demo = **裁决改判**（见 Deferred But Adjudicated）：e2e toast 断言被既有页红（panel 渲染器缺失 console 噪声，stash 对照证实 HEAD 既有、归并发 plan 628 Phase① 领地）阻塞，以 unit pin 承载契约（`dashboard-editor-renderer.test.tsx` 新增「save surfaces schema onSave showToast through env.notify」+ demo 层 notifyWithToast 接线），e2e 断言待该页恢复后由 successor 补钉。flow-designer 既有套件回归 307/307 绿。

Exit Criteria:

- [x] 判别测试红→绿；focused 单测全绿（flow-designer-renderers 307/307、report-designer-renderers 221/221、flux-renderers-dashboard 94/94）。
- [x] 四页保存反馈断言在案（三页 e2e 绿 + dashboard unit pin）；管线语义变化（toast 数量严格减少、dispatcher 单一失败 toast）记录于 plan 与 daily log。

### Phase 2 - UR-4 ai-conversations 传播链钉与结论

Status: completed
Targets: `tests/e2e/ai-conversations.spec.ts`、源登记回写

- Item Types: `Proof | Fix`

- [x] Proof：delete/rename 两腿判别 e2e 落地（`ai-conversations.spec.ts` 新增 describe「delete/rename legs (plan 633 UR-4)」）——create 前置钉 → rename 腿（`ai-conversations-rename` → `ai-conversations-rename-input` fill → Enter → 列表项文本更新）→ delete 腿（`ai-conversations-delete` → `ai-conversations-delete-confirm` 确认 → count 回落）全链绿。判别力抽查改由 clobber 探针侧证（见下条——传播链断链会使 rename/delete 双腿必挂，与 stash 对照同效）。
- [x] Proof：replace-clobber 风险实测——**复现成功**（临时探针：click item[1] 经 schema setValue 写 activeId → aria-current="true"；rename item[0] 触发 pageData replace → aria-current=null，高亮回退）。**bounded 修复落地**（归属收敛方案，非 merge 改造）：`ai-conversations-demo.tsx` 注册 host namespace `conversationsDemo:setActive`（经 `useConversation.switchConversation`），schema `onItemClick` 从 scope-only setValue 改走 host action——activeId 所有权归 host store，pageData replace 写入同值，症状消除；修复后探针复验 stillActive="true"。schema-renderer replace 语义未动（Non-Goal 维持）。
- [x] Fix：传播链现状注记回写 full-traversal §七 W-D 条目（create 腿 plan 549 已通 + 本 plan 钉 delete/rename + clobber 复现与归属收敛修复）——见 Phase 5 回写。

Exit Criteria:

- [x] 两腿 e2e 钉绿（ai-conversations 5/5）；clobber 复现→修复→复验闭环在案；源登记注记完成（执行中内联回写）。

### Phase 3 - UR-6 N-2 竞态取证与处置

Status: completed
Targets: 取证探针（\_tmp/）、`packages/flux-renderers-data/src/`（若坐实 bounded 缺陷）、designer-ux N-2 条目回写

- Item Types: `Proof | Fix`

- [x] Proof：候选②定向复现——按 `__linearTestHooks` 先例给 linear mock 加 opt-in 失败钩子（`failNextIssuesReads: N`，生产不设即 no-op；同文件 lastBulkUpdate 同款）。实验矩阵（探针记录 \_tmp，结论入 daily log）：**单次失败自愈**——首次读失败后 dependsOn 初始化 refresh（第 2 次读）成功出数，恢复路径存在（解释 R11 竞态稀有性：需早期全部读失败或精确时序）；**3 连败坐实候选②**——页面落到误导性空态「当前筛选条件下没有问题」，零错误提示、零重试入口（旧实现）。候选①（cancel/defer 永久 undefined）与候选③（boundary 吞错）未单独复现：3 连败落点是 error 态（非 undefined 悬挂），且取证实测零 console error/零 pageerror——candidates ①③ 记录为「本轮注入路径未复现，失败可见化后后续发生即有用户可见信号」。
- [x] Decision：裁定 = 坐实 bounded live defect（失败不可见 + 误导文案）→ 本 plan 修复，走 statusPath 首选机制。
- [x] Fix：bounded 修复落地（零 runtime/渲染器改动，纯 schema + mock 钩子）——`linear-issues.json` data-source 声明 `"statusPath": "issuesStatus"` + empty 槽改错误态感知文案（`${issuesStatus.hasError ? '数据加载失败，请重试' : '当前筛选条件下没有问题'}`）+ 重试按钮（`visible: hasError`，`refreshSource targetId: issues`——执行期勘误：targetId 是 action 级字段而非 args，`sundial-workbench.json:1779` 惯例）。判别测试 `tests/e2e/linear-issues-fetch-failure.spec.ts`（3 连败注入 → 错误文案断言 + 旧实现必挂红态实测 + 双 retry 确定性恢复链 + allowConsoleErrors(4) 容忍注入型预期 action error）。
- [x] Proof：n2 钉回归绿（convergence-n1-n2 2/2；同场 ai-conversations 全 spec 绿）；n2 钉补 assertTrackedPageErrors 评估结论 = 不加（失败可见性由新判别测试承载，严格 console 断言会对注入型预期错误误报）；取证材料与结论落 plan/daily log。

Exit Criteria:

- [x] 候选②定向实验 + 修复 + 判别测试闭环（红态实测）；候选①③书面结论在案；N-2 源条目回写完成（执行中内联回写）。

## Draft Review Record

- Reviewer / Agent: agent_4f58aad4（fresh session 独立子 agent，2026-10-17）
- Verdict: `pass-with-minors`（R1 `revised` 0B/2M/4m → 修订全落地 → R2 delta 复核 0B/0M，余 Minor-A 一处新路径誊写（已修正：mock-backend-linear.ts 实际在 apps/playground/src/complex-pages/shared/）+ 1 措辞 nit（statusPath 观测口径已收紧），均不阻塞；共识达成）
- Rounds: 2
- Findings addressed: Major-1（失败 toast 语义裁定补全：provider 层 failureHandled 有效性区分、16 处 provider notify 归属、双 toast 数量持平裁定、unchanged 成功态说明、Proof ③ 精确断言）；Major-2（候选②探针机制改 \_\_linearTestHooks 先例——addInitScript 够不着模块内 mock fetcher）；Minor-1（3 处路径漂移修正 + workflow schema 行号）；Minor-2（leg-red-defect Failure Path + rename/delete 驱动步骤）；Minor-3（statusPath 首选 bounded 机制写入 Decision）；Minor-4（本记录回填）

## Closure Gates

- [x] UR-5 管线统一落地（判别测试红→绿 + 四页复验断言在案 + 语义变化记录）
- [x] UR-4 两腿 e2e 钉绿 + clobber 结论落档 + 源登记注记
- [x] UR-6 取证三候选结论在案 + 处置按裁定落地
- [x] 回写完成（full-traversal W-B/W-D + designer-ux N-2 + cross-roadmap UR-4/5/6 + daily log），done 翻转与 closure 证据同批
- [x] 不存在被静默降级的 in-scope live defect（dashboard e2e 断言改判已落 Deferred 节 + successor 归属 plan 628）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_3071f896，见 Closure Audit Evidence）
- [x] `pnpm typecheck`（81/82；唯红 = playground vite.config 既有披露红，归并发 plan 628 Phase①）
- [x] `pnpm build`（43/44；同上既有红）
- [x] `pnpm lint`（绿——执行中修 3 处我引入的问题：useMemo 依赖、scanner ratchet 以 `cause:` 结构化失败路径清零零注册）
- [x] `pnpm test`（除 playground 3 文件既有登记红（归并发 plan 621）外全绿；focused：307/307 + 221/221 + 94/94 + 新钉绿）

## Deferred But Adjudicated

### dashboard-demo 保存 toast e2e 断言（Phase 1）

- Classification: `watch-only residual`
- Why Not Blocking Closure: dashboard-demo 页存在 stash 对照证实的**既有** e2e 红（`panel` 渲染器缺失 → unknown-renderer-type console 噪声 → 同页 5 个既有测试在 HEAD 无本 plan diff 时同型失败；2026-10-17 归因记录于 daily log），归并发 plan 628 Phase①「验证门禁基线恢复」领地。本 plan 以 unit pin（dashboard-editor-renderer.test 94/94 含新增 toast 契约测试）+ demo 层 notifyWithToast 接线承载保存反馈契约；e2e 断言待该页基线恢复后由 successor 补钉。
- Successor Required: `yes`
- Successor Path: 归 plan 628（`docs/plans/628-deep-audit-remediation-plan.md`）Phase ① e2e 基线恢复范围；补钉断言 = `[data-sonner-toast]` 含「布局已保存」（driver：面板编辑使 editor-save enable → click）。

## Non-Blocking Follow-ups

- bug-163 根修（xui:imports 捕获 schema 事件写）——既有 successor 登记，非本 plan。
- 候选①防御性恢复机制（若取证未坐实）——optimization candidate，登记去向。
- designer 失败 toast 单一归属收敛（provider 腿 warning + dispatcher 腿 error 双 toast 为既有状况，本 plan 数量持平不改；与 UR-9 诊断通道统一时收敛）——watch-only residual / successor 衔接 UR-9。

## Closure

Status Note: 2026-10-17 收口。UR-5（toolbar dispatch 化 + 三页保存反馈 + notify 黑洞修复 + 失败 toast 归属 dispatcher）、UR-4（delete/rename 腿钉 + clobber 复现→归属收敛修复→复验）、UR-6（取证 3 连败坐实失败不可见 → statusPath 首选机制修复 → 判别 e2e 先红后绿）全闭环。执行期裁定 3 项如实落账（失败 toast 数量严格减少 / dashboard e2e 断言改判 unit pin + successor / 判别力抽查改判 clobber 探针侧证）。

Closure Audit Evidence:

- Auditor / Agent: agent_3071f896（独立 fresh-session sub-agent，2026-10-17）
- Evidence: Verdict `approved`（0 Blocker / 0 Major / 5 Minor）——独立实跑四组 focused 全绿 + 两条新钉绿；声称-实况对账 16 处全 PASS；判别力、Deferred 诚实性（successor 归属不悬空）、回写完成度、Closure Gates 既有红零新增口径、语义变化披露六项全 PASS。Minor 1-4（cross-roadmap Plan 列、Phase 5 悬空引用、n2 计数、UR-4 措辞改判同步）+ Minor 5（scanner-baselines.json whitespace 还原）随 closing batch 修正。审计输入 = plan + diff 摘要 + 验证输出三件套。

Follow-up:

- 见 Non-Blocking Follow-ups。
