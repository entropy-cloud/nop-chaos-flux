# 815 M3-O2 HITL 审批收件箱页复刻（business-page-replication roadmap M3-O2）

> Plan Status: active
> Last Reviewed: 2026-11-01
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-O2（依赖 M2 done；roadmap 现值 `todo`，本 plan 激活时置 `planned`，收口置 `done`）
> Related: D1 总体设计；D4 §2.4（O2 页设计）/§4.2（doc 模块 O2 端点）/§5 O2（断言）；R3 §1 O2（maker-checker 04 契约）；R4 §4.1（keepOnPageChange 强制）；plan 814（ReplDoc 域、valuesPath 草稿先例）、plan 813（query-filter→crud `component:querySubmit` 先例）、plan 808（K3 crud 行详情 + ai-tool-call HITL onApproval 先例）、plan 804（I1 batch-bar 先例）、plan 807（K2 ai-suggestions 先例）

## Purpose

落地 M3-O2「HITL 审批收件箱页」（桌面，能力扩展）：`query-filter`（业务对象/动作/仅高危）→ `crud` 待办八列（时限升序、`selection.keepOnPageChange` 跨页保留）+ `batch-bar` 批量通过（影响行数）→ 行点击 `dialog`：staleness 横幅（过期禁用批准）+ 高危横幅 + `ai-suggestions` AI 预审建议 + `ai-tool-call` HITL 交接卡 + `tabs` 变更对比三视图（字段对照 / `tree` diffTree / `json-view` rawRequest）+ 意见 form（驳回必填）+ 批准/驳回。ReplDoc 域扩展 O2 五端点 + focused e2e + axe 分支 A 登记。收口为 roadmap §2 O2 `todo → planned → done`。

## Current Baseline

- 设施就绪：ReplDoc 域与计数/钩子（plan 814：`apps/playground/src/complex-pages/shared/mock-backend-repl-doc.ts`，`__replDocCalls`/`__replDocTestHooks`，showcase-env 已挂载）；replication helpers 六件套；strict 全量校验；axe 分支 A 登记设施。
- live 先例：query-filter 内嵌 form 提交管线的 `setValue` 写 form 本层作用域，驱动 crud 须经 `component:querySubmit` + `args.values`，crud loadAction 读 `${query.xxx}`（plan 813 / D4 §2.2 S2 勘误 5）；form `valuesPath` 把本地值发布到作用域供外部按钮读取（plan 814 / D4 §2.3 O1 勘误 4）；crud `onRowClick` → 详情 surface（K3 `ai-approval-trail.json` openDrawer，data 透传行字段）；`ai-tool-call` `toolCall`/`state`/`onApproval`（when `${action === 'approve'}` 分支）+ pending 态 `data-requires-approval`/`[data-slot="ai-tool-call-approve"]`（K3 spec L109-125）；`ai-suggestions` `items`/`onSelect`（K2 `ai-ticket-console.json`）；batch-bar `selectionPath: "$crud.selectedRowKeys"` + `countTemplate`（子作用域 `{count, selectedRowKeys}`）+ `actions`（渲染于 crud toolbar 作用域，载荷读 `${$crud.selectedRowKeys}`）（I1 `itam-asset-inventory.json`、`batch-bar.tsx`）；行勾选 `tbody [role="checkbox"]`（I1 spec L356）。
- crud `CrudSelectionConfig.keepOnPageChange`（`packages/flux-renderers-data/src/crud-schema.ts` L170-172，improvement §4 #4 已修复 E0c）；`tree` `data`（`packages/flux-renderers-data/src/schemas.ts` L269）；`json-view` `value`（content schemas.ts）。
- 真实缺口：ReplDoc 域无 O2 端点；无 O2 页面/e2e。

## Goals

- ReplDoc 域扩展 O2 五端点（D4 §4.2 逐名）：`ReplDoc__inboxPage`（get，≥25 行，时限升序，分页 + bizObject/action/riskOnly 过滤）/`ReplDoc__reviewDetail`（get ?id=）/`ReplDoc__approve`（post，STALE_DECISION / SOD_VIOLATION）/`ReplDoc__reject`（post，OPINION_REQUIRED）/`ReplDoc__batchApprove`（post，BATCH_STALE）+ 写镜像 + `forceApproveStale(approvalNo)` 钩子。
- `page-schemas/doc-hitl-inbox.json` + entry + e2e `tests/e2e/replication-doc-hitl-inbox.spec.ts` + axe 分支 A 登记；e2e 覆盖 D4 §5 O2 清单（①-⑤ + focus），`--retries=0` 全绿。

## Non-Goals

- 不实现真实 maker-checker 工作流引擎、审批权限体系或 SoD 配置界面（SoD 以 mock 固定 checker 身份判定）；不做 Mode A 专用 diff renderer（G22，字段对照以 table 近似）、不做专用 diffTree renderer（G21，tree 承载）；不实现 `setInboxOrder` 排序切换（时限升序由 mock 端点固定保证，无排序切换交互验收面）。

## Scope

### In Scope

- ReplDoc O2 五端点 + 钩子；O2 页 schema + entry + e2e + axe 分支 A；roadmap §2 O2 回写；D4 §2.4/§4.2/§5 O2 勘误就地落档（至少：**§4.2 `ReplDoc__reviewDetail` 契约形状增补 `fieldDiffs[{path,before,after}]`（字段对照视图数据面）与 `aiSuggestionItems`（ai-suggestions items 投影）及 `hitlToolCall`/`hitlToolCallState`（ai-tool-call 输入投影）**、Mode A 由 labelRemark+inputClassName 改 table 字段对照〔inputClassName 为类型死字段，improvement §4 #9〕、批准按钮读意见经 valuesPath、staleness 兜底直调的承载面）。

### Out Of Scope

- V1-V3 页；G21/G22 专用 renderer 立项（只登记不越权）；C2 calendar 时区窗口红（plan 814 Deferred，归 P1）。

## Failure Paths

| 编号            | 触发                                                | 行为                                                                          | 可重试 | 用户可见表现                             |
| --------------- | --------------------------------------------------- | ----------------------------------------------------------------------------- | ------ | ---------------------------------------- |
| stale-decision  | 过期审批（remainingSeconds≤0 或 forceApproveStale） | 批准按钮 disabled；兜底直调 approve → `REPL_DOC_STALE_DECISION`               | 否     | staleness 横幅 + 批准不可点 + 错误 toast |
| sod-violation   | checker 与 maker 同一人                             | approve → `REPL_DOC_SOD_VIOLATION`                                            | 否     | 错误 toast，dialog 停留                  |
| opinion-missing | 驳回意见为空                                        | 前端 required 拦截（reject 计数不变）；服务端兜底 `REPL_DOC_OPINION_REQUIRED` | 是     | 字段错误提示，dialog 停留                |
| batch-stale     | 批量集合含过期项                                    | batchApprove → `REPL_DOC_BATCH_STALE` 整批拒绝                                | 是     | 错误 toast，选择保留                     |
| e2e-fail        | focused e2e 失败                                    | 定位修复 → 重跑至绿（`--retries=0`）；设计与 live 不符以 live 为准并勘误 D4   | 是     | e2e 全绿                                 |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿；strict schema 校验零诊断。e2e 以独立 `PLAYWRIGHT_PORT` + `--output=_tmp/...` 运行（共享工作树并行会话会清空 `test-results/`，见 docs/logs/2026/11-01.md）。

## Execution Plan

### Phase 1 - O2 页全链实现

Status: planned
Targets: `apps/playground/src/complex-pages/shared/mock-backend-repl-doc.ts`（O2 段）、`page-schemas/doc-hitl-inbox.json`（新）、`complex-pages-entries.ts`、`tests/e2e/replication-doc-hitl-inbox.spec.ts`（新）、`tests/e2e/a11y-axe-baseline.spec.ts` + `__fixtures__/axe-baseline.json`

- Item Types: `Fix | Proof`

- [ ] mock：ReplDoc 分支加 O2 段——`inboxPage`（27 行确定性 ladder，`{approvalNo,bizObject,bizKey,action,maker,submittedAt,remainingSeconds,changeSummary,riskFlag}`，remainingSeconds 升序；page/pageSize + bizObject/action/riskOnly 过滤；固定 1 行 maker = 当前 checker 供 SoD 分支）/`reviewDetail`（`{beforeData,expectedAfter,changedPaths,fieldDiffs[{path,before,after}],diffTree,rawRequest,remainingSeconds,riskFlag,aiSuggestion{verdict,confidence,risks[]},aiSuggestionItems,hitl,hitlToolCall,hitlToolCallState}`——diffTree 节点数确定、hitl 构造 ChatToolCall 形状（K3 先例）；id miss → placeholder）/`approve`（stale → STALE_DECISION；maker=checker → SOD_VIOLATION；写镜像 `lastApproveBody`）/`reject`（空意见 → OPINION_REQUIRED；写镜像 `lastRejectBody`）/`batchApprove`（`approvalNos[]` 含 stale → BATCH_STALE；成功 `{approved,skipped,affectedRows}`；写镜像 `lastBatchApproveBody`）；`forceApproveStale(approvalNo)` 由分支发布到 opt-in hooks（S1 `advanceFlashSaleClock` 同款形态），标记会话级 stale 集合
- [ ] schema JSON：query-filter（bizObject/action select + riskOnly）→ `component:querySubmit` crud；crud（loadAction inboxPage 读 `${query.*}`、`selection {type:'checkbox', keepOnPageChange:true}`、itemKey approvalNo、表头钉死为 D4/04 契约 9 字段〔审批单号/业务对象/业务键/动作/制单人/提交时间/剩余时限/变更摘要/高危；D4「八列」命名与 9 字段清单不一致，收口勘误 §2.4 命名〕〔剩余时限文本、高危 status 标色〕、toolbar batch-bar〔countTemplate「批量通过：影响 ${count} 行」+ actions 批量通过 ajax batchApprove `{approvalNos: ${$crud.selectedRowKeys}}` + onError toast〕、`onRowClick` → openDialog（data approvalNo））；dialog body：data-source review（reviewDetail?id=）+ staleness alert（visible remainingSeconds≤0）+ 高危 alert + ai-suggestions + ai-tool-call HITL 卡（onApproval approve → ReplDoc__approve；reject → 仅写回卡片状态）+ tabs 三视图（字段对照 table / tree diffTree / json-view rawRequest）+ 意见 form（textarea opinion required、`valuesPath`发布草稿、submitAction → reject）+ 按钮组（驳回 = component:submit 意见 form；批准 = ajax approve 读意见草稿、disabled 表达式；兜底演练 ghost 按钮直调 approve，W3「非法格式演练」先例）；成功链 closeSurface +`component:refresh`crud；testid`doc-hitl-inbox-<element>`；strict 零诊断
- [ ] entry（category `business-replication`）
- [ ] e2e spec（D4 §5 O2）：前置〔crud 首页行集按 remainingSeconds 升序 + 9 字段表头集合 + inboxPage 计数〕/交互① 跨页批量：页 1 勾 2 行 → 翻页 → 页 2 勾 1 行 → batch-bar「影响 3 行」+ data-count=3 → 批量通过 → batchApprove +1 且载荷 approvalNos 恰为所勾 3 键/交互② staleness：`forceApproveStale` → 开行 → staleness 横幅可见 + 批准 disabled → 兜底直调 → STALE_DECISION toast/交互③ 驳回空意见 → reject 计数 0 + dialog 停留 → 填写 → reject +1 + 载荷意见逐字段 + dialog 关闭/交互④ 三视图：字段对照行数 = fieldDiffs 数、tree 节点数 = diffTree 节点数、json-view 含 rawRequest 键/交互⑤ HITL 卡 pending `data-requires-approval` → approve → approve 计数 +1 + 卡片转 approved/附加 SoD 分支 toast/focus ① dialog 焦点落入 + Esc 关闭后焦点回文档 ② staleness 场景焦点落入 dialog 且不在禁用的批准按钮；预期拒绝分支 `allowConsoleErrors` 按 W3 先例登记；`--retries=0`
- [ ] axe 分支 A 登记：ROUTES + `complex-pages/doc-hitl-inbox` 基线键（首跑实测 + `_notes` 节点溯源）
- [ ] 验证：focused e2e `--retries=0` 全绿 + axe spec 绿 + replication 全族回归 + strict 校验

Exit Criteria:

- [ ] O2 页可达可交互且列表页收录，strict validation 零诊断
- [ ] focused e2e `--retries=0` 全绿（`__replDocCalls` 计数 + 写镜像载荷断言在，跨页批量载荷恰 3 键）
- [ ] axe 分支 A 基线登记绿

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（agent_3c4f40c8-e51e-4156-8233-302f156dfde3）
- Verdict: pass（round-1 fail：1 Major + 3 Minor → 修复后 round-2 零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed: Major-1 D4 §4.2 `ReplDoc__reviewDetail` 契约形状增补（fieldDiffs/aiSuggestionItems/hitlToolCall/hitlToolCallState）未纳入勘误面——In Scope 与 Closure Gate 勘误清单改为 §2.4/§4.2/§5 并显式列出增补项。

## Closure Gates

- [ ] in-scope 工作全部落地（O2 页 + ReplDoc O2 段 + roadmap 回写）
- [ ] 行为/契约结果已达成（D4 §5 O2 断言清单全绿，`--retries=0`）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级的 in-scope 缺口
- [ ] 受影响 owner docs 已同步（daily log；D4 §2.4/§4.2/§5 O2 勘误——含 §4.2 reviewDetail 契约形状增补）
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新增未登记命中）

## Deferred But Adjudicated

### （继承）C2 calendar 月初时区窗口红

- Classification: `watch-only residual`
- Why Not Blocking Closure: plan 814 已裁决为 HEAD 既有、与 O2 触达面零交集；本 plan 全族回归若复现按同口径归因。
- Successor Required: `yes`
- Successor Path: roadmap M3-P1 开发阶段深度审计

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段
- G21 diffTree / G22 字段对照专用 renderer → 维持 R4 §2 登记线（本计划不扩约）

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent 填写
- Evidence: 待填写

Follow-up:

- 待收口填写
