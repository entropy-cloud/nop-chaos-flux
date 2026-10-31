# 817 M3-V2 IoT OTA 灰度管理页复刻（business-page-replication roadmap M3-V2）

> Plan Status: completed
> Last Reviewed: 2026-10-31
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-V2（依赖 M2 done；roadmap 现值 `todo`，本 plan 激活时置 `planned`，收口置 `done`）
> Related: D1 总体设计；D4 §2.6（V2 页设计）/§4.3（iot 模块 V2 端点）/§5 V2（断言）；R3 §1 V2；plan 816（ReplIot 域）、plan 814（wizard beforeLeave/焦点先例）、plan 808（K3 steps 状态轴/timeline 先例）、plan 815（refreshNearest/dialog 先例）

## Purpose

落地 M3-V2「IoT OTA 灰度管理页」（桌面，直接组合）：`crud` 固件列表 → `wizard` 灰度指派三步（选设备〔form 宿主 checkbox-group 多选 + step formId 门禁〕→ 分批 → 确认下发，确认按钮 ajax `assignBatched`）→ `steps` 八态状态轴（QUEUED→…→UPDATED，FAILED=error 分叉）+ `timeline` 历史轨迹（选中设备）+ `table` 进度矩阵（设备×批次×状态+lastError，mapping 状态色）→ 门控 `activateNextBatch`（GATE_NOT_PASSED 时呈现 gate 数据且不推进）→ `dialog` 回滚确认（textarea 原因必填 → `rollbackPackage` → ROLLED_BACK alert）。ReplIot 域扩展 V2 五端点（delegate 模块）+ focused e2e + axe 分支 A 登记。收口为 roadmap §2 V2 `todo → planned → done`。

## Current Baseline

- 设施就绪：ReplIot 域与计数/钩子（plan 816：`apps/playground/src/complex-pages/shared/mock-backend-repl-iot.ts`，`__replIotCalls`/`__replIotTestHooks`，showcase-env 已挂载；Non-Blocking Follow-up 已预留 delegate 拆分位）。
- live 契约：`wizard` `steps[].beforeLeave` `ok:false` 阻断 + 失败仍阻断（plan 814 实证）；`steps` `items`（value/title/description/status）+ `data-status`/`data-current` DOM 面（layout schemas.ts L297-320、steps-renderer.tsx L94-95）；`timeline` `items[{value,time,title,detail,level}]`（L326-344）；`table` source 表达式 + cell status；`setAssignmentStatus(deviceId,status)` 钩子推进矩阵状态（D4 §4.3）；`error.responseData` 承载失败载荷字段（`createApiResponseError`，request-runtime.ts L80-105——错误 message 取顶层 msg，`responseData` 保留完整 data）。
- 真实缺口：ReplIot 无 V2 端点；无 V2 页/e2e。

## Goals

- ReplIot 域扩展 V2 五端点（D4 §4.3 逐名）：`ReplIot__firmwarePage`（get）/`ReplIot__assignBatched`（post，空集 → `REPL_IOT_BATCH_EMPTY`）/`ReplIot__assignmentMatrix`（get，八态）/`ReplIot__activateNextBatch`（post，`gate.completionRate/failRate/passed`，未达标 → `REPL_IOT_GATE_NOT_PASSED`）/`ReplIot__rollbackPackage`（post，空原因 → `REPL_IOT_ROLLBACK_REASON_REQUIRED`）+ 写镜像 + `setAssignmentStatus(deviceId,status)` 钩子 + showcase-env 挂载（delegate 模块 `mock-backend-repl-iot-v2.ts`，crm-c2/ai-k2 拆分先例）。
- `page-schemas/iot-ota-rollout.json` + entry + e2e `tests/e2e/replication-iot-ota-rollout.spec.ts` + axe 分支 A 登记；e2e 覆盖 D4 §5 V2 清单（①-⑤ + focus 两条），`--retries=0` 全绿。

## Non-Goals

- 不做断点续传呈现（D1 §1 #20）；不做真实固件签名校验/差分包、固件 input-file 上传与废弃操作、门控「暂停」（§5 V2 清单不含、无端点承载，逐名勘误 ⑤）；不做 OTA 任务调度器（推进由门控按钮 + 钩子驱动）；C2 calendar 时区窗口红与并行会话 WIP 归 Deferred。

## Scope

### In Scope

- ReplIot V2 五端点（delegate 模块）+ 钩子；V2 页 schema + entry + e2e + axe 分支 A；roadmap §2 V2 回写；D4 §2.6/§4.3/§5 V2 勘误就地落档，**逐名**预登记（执行期可能偏离）：① §4.3 `assignmentMatrix` 返回 `{items:[{deviceId,batchNo,status,statusTime,lastError,history:[{status,statusTime}]}]}` 形状与 `selectedDevice` 查询参数（D4 原无查询参数与 history 锚定）；② 门控失败呈现面——`activateNextBatch` 失败载荷 `{msg, gate:{completionRate,failRate,passed}}` 经 `error.responseData.gate` 写入 scope 由 alert 呈现（D4「呈现 gate 数据」未指定承载）；③ steps `items` 以表达式投影会话状态（D4 片段 `${selectedAssignment.status}` 为单设备语义，页面按「选中设备」作用域）。④ 步骤 1 门禁机制：D4「table 多选 + onStepCommit 门禁」→ 落地为 form（`valuesPath: otaSelect`）内 `checkbox-group` 设备多选 `required` + 步骤 `formId` 校验阻断（table selection 非 form 字段、不可被 step formId 校验；O1 plan 814 formId 实证机制）；⑤ crud 固件列表免 input-file 上传/verifySignature/废弃操作、门控免「暂停」（§5 V2 断言清单不含，无端点承载）；⑥ §4.3 载荷形状——`assignBatched` 请求 `{packageId, deviceIds, batchSize}`、响应 `{rolloutId, batches}`；`rollbackPackage` 请求 `{rolloutId, reason}`、响应 `{rolloutId, status:'ROLLED_BACK'}`；`activateNextBatch` 失败信封 `data:{gate}`（`error.responseData` 只承载信封 data 字段）。

### Out Of Scope

- V3 页；真实 OTA 引擎；C2 calendar 时区窗口红（plan 814 Deferred，归 P1）；并行会话 WIP。

## Failure Paths

| 编号            | 触发                    | 行为                                                                                                                                           | 可重试 | 用户可见表现                |
| --------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------- |
| batch-empty     | 未选设备                | 第一道：步骤 1 form `checkbox-group required` + step `formId` 校验阻断 next；第二道（服务端兜底）：assignBatched 空集 → `REPL_IOT_BATCH_EMPTY` | 是     | 字段错误提示，停留步骤 1    |
| gate-not-passed | 批次完成率/失败率未达标 | activateNextBatch 返回 `REPL_IOT_GATE_NOT_PASSED` + gate 数据 → alert 呈现、不推进                                                             | 是     | 门控横幅 + 批次不变         |
| rollback-reason | 回滚原因为空            | 前端 required 拦截；服务端兜底 `REPL_IOT_ROLLBACK_REASON_REQUIRED`                                                                             | 是     | 字段错误/toast，dialog 停留 |
| e2e-fail        | focused e2e 失败        | 定位修复 → 重跑至绿（`--retries=0`）；以 live 为准并勘误 D4                                                                                    | 是     | e2e 全绿                    |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿；strict schema 校验零诊断。e2e 以独立 `PLAYWRIGHT_PORT` + `--output=_tmp/...` 运行。

## Execution Plan

### Phase 1 - V2 页全链实现

Status: completed
Targets: `apps/playground/src/complex-pages/shared/mock-backend-repl-iot-v2.ts`（新 delegate）、`mock-backend-repl-iot.ts`（会话/钩子扩展）、`showcase-env.ts`、`page-schemas/iot-ota-rollout.json`（新）、`complex-pages-entries.ts`、`tests/e2e/replication-iot-ota-rollout.spec.ts`（新）、`tests/e2e/a11y-axe-baseline.spec.ts` + `__fixtures__/axe-baseline.json`

- Item Types: `Fix | Proof`

- [x] mock：delegate 模块 `mock-backend-repl-iot-v2.ts`（复用 kit 的 counter——同 `__replIotCalls` 前缀段）——`firmwarePage`（4 行 `{packageId,title,versionNo,checksum,fileUrl,deprecated}`）/`assignBatched`（`{batches:[{batchNo,deviceIds[]}]}`；空集 → BATCH_EMPTY；写镜像 `lastAssignBatchedBody`；会话矩阵初始化 QUEUED）/`assignmentMatrix`（`{items:[{deviceId,batchNo,status,statusTime,lastError,history}]}` 八态；`setAssignmentStatus(deviceId,status)` 钩子推态并追加 history；FAILED 行带 lastError）/`activateNextBatch`（`{batchNo}`；完成率/失败率门：矩阵中该批次 UPDATED 比例 ≥ 阈值且 FAILED 比例 ≤ 阈值 → `{batchNo,gate:{completionRate,failRate,passed:true}}` 推进批次；否则 `status:1 msg REPL_IOT_GATE_NOT_PASSED` + 信封 `data:{gate}`；写镜像 `lastActivateBatchBody`）/`rollbackPackage`（`{rolloutId,reason}`；空原因 → ROLLBACK_REASON_REQUIRED；成功矩阵全批 → ROLLED_BACK + history；写镜像 `lastRollbackBody`）；`setAssignmentStatus` 挂入 `__replIotTestHooks`（plan 816 `tickTelemetry` 同款分支发布）
- [x] schema JSON：`crud` 固件列表（firmwarePage；deprecated status 列）→ `wizard` 三步（步骤 1 选设备：form `iot-ota-rollout-select-form`〔`valuesPath: otaSelect`，固件 select + 设备 `checkbox-group` required〕+ 步骤 `formId` 指向该 form——空选 next 被校验阻断；步骤 2 分批：form〔`valuesPath: otaBatch`，batchSize select required〕+ formId；步骤 3 确认下发：beforeLeave 不用，确认按钮 ajax assignBatched 读 `${otaSelect}`/`${otaBatch}`，onError toast）→ `steps` 八态（items 表达式投影选中设备状态映射——mock 投影 stepItems，FAILED 行显式 `status:'error'`〔否则当前项派生为 process〕，error 分叉）+ `timeline` history（选中设备）+ `table` 进度矩阵（mapping 状态色：UPDATED success/FAILED error/UPDATING warning/其余 info）→ 门控按钮组（activateNextBatch；onError `setValue otaGate = ${error?.responseData?.gate ?? null}` + toast；otaGate alert 呈现完成率/失败率）→ 回滚 dialog（textarea required + rollbackPackage；成功 ROLLED_BACK alert + refreshNearest）；testid `iot-ota-rollout-<element>`；strict 零诊断
- [x] entry（category `business-replication`）
- [x] e2e spec（D4 §5 V2）：前置〔固件 4 行 + 矩阵种子（批次 1 = 1/2 UPDATED + UPDATING、批次 2 QUEUED）+ steps 首态〕/交互① 未选设备 next 被 formId 校验拦截（停留步骤 1、assignBatched 计数 0）→ 选 3 台 → assignBatched 载荷 batches 断言 + 进入矩阵态/交互② `setAssignmentStatus('DEV-1001','FAILED')` → steps 当前项 error 分叉（data-status=error）+ 矩阵行 FAILED + lastError/交互③ 回滚：空原因 required 拦（rollbackPackage 计数 0）→ 填原因 → rollbackPackage +1 + 载荷 + ROLLED_BACK alert/交互④ 门控：未达标批次 activateNextBatch → GATE_NOT_PASSED toast + gate alert（完成率/失败率文本）+ 批次不推进；达标批次推进成功/交互⑤ 矩阵 mapping 状态文本（UPDATED/FAILED）；focus ① wizard 步进按钮 tab 可达 ② 回滚 dialog 焦点落入 + Esc 返回；预期拒绝分支 `allowConsoleErrors` 按 W3 先例登记；`--retries=0`
- [x] axe 分支 A 登记：ROUTES + `complex-pages/iot-ota-rollout` 基线键（首跑实测 + `_notes`）
- [x] 验证：focused e2e `--retries=0` 全绿 + axe spec 绿 + replication 全族回归 + strict 校验

执行期适配（以 live 为准；D4 §2.6「V2 实现勘误」8 条 + §4.3/§5 就地注——评审逐名六项全部落档为勘误 1-6）：

- delegate 模块 `mock-backend-repl-iot-v2.ts` 由 IoT 分支直接传入共享 opt-in hooks 对象（`ReplIotTestHooks` 结构上为 `ReplIotV2Hooks` 超集），计数沿用 `__replIotCalls`。
- 回滚成功链 `setValue rollbackResult` 写入回滚 form 本层作用域 → ROLLED_BACK alert 移入该 form body（勘误 7，§2.2 S2 勘误 5 同源）。
- axe 新发现：checkbox-group `role=group` 携 `aria-required`（ARIA 不允许）——form 渲染器 owner 债，基线登记 `_notes` 溯源（勘误 8），不越权修组件。
- replication 全族回归 195/197：C2 calendar（既有时区窗口红，03:51 CST 仍在 00:00-08:00 窗口内）+ M1 交互① 一例负载抖动（单跑 8/8、`--repeat-each=3` 3/3，本 diff 零触达 MES 面）。

Exit Criteria:

- [x] V2 页可达可交互且列表页收录，strict validation 零诊断
- [x] focused e2e `--retries=0` 全绿（`__replIotCalls` 计数 + 写镜像载荷断言在；gate 呈现与不推进断言在）
- [x] axe 分支 A 基线登记绿

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（agent_5e3a7fbd-34f8-4eff-ae89-cefe5537983d）
- Verdict: revised（round-3 pass，零 Blocker / 零 Major；轮数超出模板「≤2」建议——round-2 修复引入一词级 type 名错误需第三轮核对，如实记账）
- Rounds: 3
- Findings addressed: Major M-1 步骤 1「未选设备 next 被拦」门禁机制未写明——改 form 宿主设备多选 required + step formId 校验阻断、D4 onStepCommit 偏离入勘误 ④；Major M-2（round-2 引入）`checkboxes` 非 live type——四处改 `checkbox-group`（form/input.tsx L512-530）。Minor 6 项（gate 信封 data:{gate}、上传/废弃/暂停与载荷形状入勘误 ⑤⑥、FAILED 投影 status:'error'、Purpose 口径对齐）均已修。

## Closure Gates

- [x] in-scope 工作全部落地（V2 页 + ReplIot V2 段 + roadmap 回写）
- [x] 行为/契约结果已达成（D4 §5 V2 断言清单全绿，`--retries=0`：focused 7/7）
- [x] 必要 focused verification 已完成（focused 7/7 + axe 27/27 + strict 64/64 + playground unit 566/566；replication 全族 195/197——C2 calendar 既有红 + M1 负载抖动单跑 8/8 复核绿）
- [x] 不存在被静默降级的 in-scope 缺口
- [x] 受影响 owner docs 已同步（daily log；D4 §2.6 V2 勘误 8 条——含评审逐名六项 + §4.3/§5 就地注）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据（agent_f9f6dcbb，approved）
- [x] `pnpm typecheck`（exit 0）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0）
- [x] `pnpm test`（exit 0，86/86）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

### （继承）C2 calendar 时区窗口红 / 并行会话 WIP

- Classification: `watch-only residual`
- Why Not Blocking Closure: plan 814/816 已裁决 C2 为 HEAD 既有月初时区窗口红、并行会话 WIP 阻断全仓链——均与本 plan 触达面零交集；复现按同口径归因。
- Successor Required: `yes`
- Successor Path: roadmap M3-P1 开发阶段深度审计

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段
- V3 扩展时沿用 delegate 拆分（`mock-backend-repl-iot-v3.ts`）

## Closure

Status Note: V2 页全链落地（ReplIot V2 delegate 五端点 + schema strict 零诊断 + entry + focused e2e 7 测试 + axe 分支 A 登记），D4 §5 V2 断言清单（①-⑤ + focus 两条）全部 `--retries=0` 实跑通过；评审三轮（revised→pass）逐名六项 D4 偏离全部落档（§2.6 勘误 8 条）；axe 新发现 checkbox-group aria-required 归组件 owner 债登记。全仓五门禁（typecheck/build/lint/test/check）收口时点全绿。Deferred（C2 calendar 时区窗口红、并行会话 WIP）与本 diff 零交集。独立 closure audit approved，无剩余 plan-owned work。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（agent_f9f6dcbb-efc5-45b6-b8ff-4e485eaeabd3）
- Evidence: verdict **approved**（零 Blocker / 零 Major / 3 Minor）。审计员独立实跑 focused 7/7、strict 64/64、axe 27/27、M1 单跑 8/8、playground unit 566/566、typecheck exit 0；e2e 五项断言逐条覆盖审查（allowConsoleErrors 仅一处预期分支）；评审六项勘误落档核验；delegate hooks 传递正确性核验（写镜像与 spec 读取为同一 window 对象）。Minor-①（focus ① 以 focus()+Enter 驱动，未走真实 Tab 遍历——口径差已登记）；Minor-②（plan 前置「矩阵 QUEUED」措辞与种子不一致）——已随本回写同步；Minor-③（收口时点并行会话 check:test-barrels 未跟踪文件红）非本 plan 触达面。

Follow-up:

- no remaining plan-owned work（Non-Blocking：全量 test:e2e 与 C2 calendar 根因归 P1；checkbox-group aria-required 修组件归 form 渲染器 owner）
