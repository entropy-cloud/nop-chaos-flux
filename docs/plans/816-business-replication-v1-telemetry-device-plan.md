# 816 M3-V1 IoT 设备遥测详情页复刻（business-page-replication roadmap M3-V1）

> Plan Status: draft
> Last Reviewed: 2026-10-31
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-V1（依赖 M2 done；roadmap 现值 `todo`，本 plan 激活时置 `planned`，收口置 `done`）
> Related: D1 总体设计；D4 §2.5（V1 页设计）/§4.3（iot 模块 V1 端点）/§5 V1（断言，含 D6 MIN-6 防 flake 口径）；R3 §1 V1；plan 809（M1 interval 轮询 + 确定性相位先例）、plan 800（W3 form valuesPath 过滤 + focus 首站先例）、plan 815（crud onRowClick dialog + refreshNearest 先例）

## Purpose

落地 M3-V1「IoT 设备遥测详情页」（桌面，直接组合）：设备/时间窗过滤（form `valuesPath`）→ `data-source` interval 轮询遥测 → `stat-tile`×3（温度/湿度/电压，含 `sparkline` 概览）+ `echarts` line 实时曲线 → `status` + `mapping` 数据质量位（GOOD/UNCERTAIN/BAD）→ `crud` 告警联动（随设备过滤，severity 标色，行点击 dialog 确认/关闭，AlarmLifecycleService 语义）。新建 ReplIot mock 域（V1 五端点，V2/V3 后续扩展）+ focused e2e + axe 分支 A 登记。收口为 roadmap §2 V1 `todo → planned → done`。

## Current Baseline

- 设施就绪：replication helpers 六件套；showcase-env `createReplicaBranches`（各域 `create<Domain>FetcherBranches()` 挂载，plan 814 新增 ReplDoc 先例）；`mock-backend-replica-kit`；strict 全量校验；axe 分支 A 登记设施。
- live 先例：data-source `interval` + `silent` 轮询（M1 `mes-shopfloor-board.json`：`interval: 15000, silent: true, initFetch: true`；DataSourceSchema `interval/stopWhen/silent`——flux-core `types/schema.ts` L305-307）；M1 mock 相位为确定性纯函数（D1 §2 禁随机漂移）；form `valuesPath` 过滤 + data-source `dependsOn` 重取（W3 `wms-stock-ledger.json`）；stat-tile `sparkline` 收 number[] 表达式（`packages/flux-renderers-data/src/stat-tile-renderer-definition.ts` L63-69）；echarts 结构化 option + 表达式字段（C3/M1）；`mapping` `value/map/defaultLabel`（content schemas.ts L286-294）；crud `onRowClick` → openDialog + dialog 内 `refreshNearest {targetType:'crud'}`（plan 815 勘误 7——`component:refresh` 跨运行期片段报 unvalidated-component-target）；crud `loadAction.dependsOn` 声明 scope 路径（flux-guide/design-patterns/crud.md L165-169 示例）。
- 真实缺口：ReplIot 域不存在（无 `mock-backend-repl-iot.ts`）；无 V1 页/e2e。

## Goals

- ReplIot 域新建（V1 子集，D4 §4.3 逐名）：`ReplIot__telemetryQuery`（get）/`ReplIot__telemetryLatest`（get）/`ReplIot__alarmPage`（get）/`ReplIot__alarmAck`（post）/`ReplIot__alarmClose`（post）+ 计数 `__replIotCalls` + 钩子 `__replIotTestHooks`（`tickTelemetry()` 分支发布推进相位、`forceAlarmAckError` consume-once、写镜像）+ showcase-env 挂载。
- `page-schemas/iot-telemetry-device.json` + entry + e2e `tests/e2e/replication-iot-telemetry-device.spec.ts` + axe 分支 A 登记；e2e 覆盖 D4 §5 V1 清单（①-④ + focus 两条），`--retries=0` 全绿。

## Non-Goals

- 不接真实设备/MQTT/时序库；不做 trackExpression（runtime 未实现，D5 勘误已删）；不做告警升级调度（escalationTier 仅展示）；不实现 V2/V3 端点（ReplIot 域留扩展位）。

## Scope

### In Scope

- ReplIot 域 V1 五端点 + 钩子 + showcase-env 挂载；V1 页 schema + entry + e2e + axe 分支 A；roadmap §2 V1 回写；D4 §2.5/§4.3/§5 V1 勘误就地落档，**逐名**：① §4.3 增补错误分支 `REPL_IOT_ALARM_ACK_FAILED`（forceAlarmAckError 强制失败码，D4 原表只列 ALREADY_CLOSED）；② telemetryQuery 契约形状调整为 288 点确定性序列 + `timeAxis` + `latest` + 按设备 `quality`（D4 原为 {series,latest,chartOption}、quality 按点）且 echarts option 改 schema 内结构化声明（C3/M1 先例）不再由 mock 下发 chartOption；③ form 免去 metric 控件（三指标同屏并列）；④ 告警 dialog 免去「开始处理」动作（ack/close 承担 AlarmLifecycle 语义）。

### Out Of Scope

- V2/V3 页；C2 calendar 时区窗口红（plan 814 Deferred，归 P1）；并行会话 WIP。

## Failure Paths

| 编号       | 触发                                      | 行为                                                                        | 可重试 | 用户可见表现            |
| ---------- | ----------------------------------------- | --------------------------------------------------------------------------- | ------ | ----------------------- |
| ack-closed | 对已关闭告警确认/再关闭                   | alarmAck/alarmClose 返回 `status:1 REPL_IOT_ALARM_ALREADY_CLOSED`           | 否     | 错误 toast，dialog 停留 |
| ack-forced | 钩子 `forceAlarmAckError`（consume-once） | alarmAck 返回 `status:1 REPL_IOT_ALARM_ACK_FAILED`（强制传输失败演练）      | 是     | 错误 toast，状态不变    |
| poll-stale | 轮询期间相位推进                          | 下一 interval 拉取新相位；断数据面不断时间窗（D6 MIN-6）                    | —      | tile 文本更新           |
| e2e-fail   | focused e2e 失败                          | 定位修复 → 重跑至绿（`--retries=0`）；设计与 live 不符以 live 为准并勘误 D4 | 是     | e2e 全绿                |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿；strict schema 校验零诊断。e2e 以独立 `PLAYWRIGHT_PORT` + `--output=_tmp/...` 运行（共享工作树）。轮询断言按 D6 MIN-6：钩子推进相位后直接断数据面，`toHaveText` 显式 timeout ≥ interval + 余量（interval 5000 → timeout ≥ 8000）。

## Execution Plan

### Phase 1 - V1 页全链实现

Status: planned
Targets: `apps/playground/src/complex-pages/shared/mock-backend-repl-iot.ts`（新）、`showcase-env.ts`（挂载）、`page-schemas/iot-telemetry-device.json`（新）、`complex-pages-entries.ts`、`tests/e2e/replication-iot-telemetry-device.spec.ts`（新）、`tests/e2e/a11y-axe-baseline.spec.ts` + `__fixtures__/axe-baseline.json`

- Item Types: `Fix | Proof`

- [ ] mock：新建 `mock-backend-repl-iot.ts`——`telemetryQuery`（get ?deviceKey=；确定性函数 f(deviceKey, metric, i, phase)：三设备〔DEV-1001/1002/1003〕× 三指标〔temperature/humidity/voltage〕，24h×5min 288 点序列 + `timeAxis` + `latest` + `quality`〔DEV-1001 GOOD / DEV-1002 UNCERTAIN / DEV-1003 BAD〕；相位仅由钩子推进，不随调用漂移）/`telemetryLatest`（get，`{latest:{metric:{value,ts}}}`）/`alarmPage`（get ?deviceId=；12 行 `{alarmId,deviceId,severity,status,triggerValue,thresholdValue,ackAt,escalationTier}`，会话级状态）/`alarmAck`（post；CLOSED → ALREADY_CLOSED；`forceAlarmAckError` → ACK_FAILED；成功 ACTIVE→ACKED + ackAt；写镜像 `lastAlarmAckBody`）/`alarmClose`（post；已 CLOSED → ALREADY_CLOSED；成功 →CLOSED；写镜像 `lastAlarmCloseBody`）；`tickTelemetry()` 由分支发布到 opt-in hooks（S1/O2 同款形态）；showcase-env `createReplIotFetcherBranches()` 挂载
- [ ] schema JSON：form（id `iot-telemetry-device-filter`，`valuesPath: telemetryFilter`，deviceKey select 默认 DEV-1001 + 时间窗 select）；data-source `telemetry`（telemetryQuery，params deviceKey，`dependsOn: [telemetryFilter]`，`interval: 5000`，`silent: true`）；stat-tile×3（value=`telemetry.latest.*`，`sparkline`=序列尾段 number[]）；echarts line（结构化 option：xAxis timeAxis + 三 series）；status+mapping 质量位；crud 告警（loadAction alarmPage 读 `${telemetryFilter.deviceKey}`，`dependsOn` 含 telemetryFilter；severity/status 标色；`onRowClick` → openDialog 详情 + 确认/关闭按钮 → alarmAck/alarmClose，成功 `refreshNearest {targetType:'crud'}` + closeSurface，onError toast）；testid `iot-telemetry-device-<element>`；strict 零诊断
- [ ] entry（category `business-replication`）
- [ ] e2e spec（D4 §5 V1）：前置〔三 tile 首相位值 + echarts 实例三 series + 质量位 GOOD + 告警行集 + 端点计数〕/交互① `tickTelemetry` → 温度 tile 文本 = 推进后相位值（`toHaveText` timeout ≥ 8s，D6 MIN-6）+ telemetryQuery 计数增长/交互② 告警行点击 → dialog → 确认 → alarmAck +1 + 载荷镜像 + 行状态 mapping ACTIVE→ACKED/交互③ `forceAlarmAckError` → ACK_FAILED toast；已关闭告警再关闭 → ALREADY_CLOSED toast/交互④ 切 deviceKey → telemetryQuery +1 + tile 更新 + 质量位变化 + 告警行集按设备过滤/focus ① 过滤 form 首控件为页面 Tab 首站（W3 focus ① 口径）② 告警 dialog 焦点落入 + Esc 关闭后焦点回文档；预期拒绝分支 `allowConsoleErrors` 按 W3 先例登记；`--retries=0`
- [ ] axe 分支 A 登记：ROUTES + `complex-pages/iot-telemetry-device` 基线键（首跑实测 + `_notes` 节点溯源）
- [ ] 验证：focused e2e `--retries=0` 全绿 + axe spec 绿 + replication 全族回归 + strict 校验

Exit Criteria:

- [ ] V1 页可达可交互且列表页收录，strict validation 零诊断
- [ ] focused e2e `--retries=0` 全绿（`__replIotCalls` 计数 + 写镜像载荷断言在；轮询断言为钩子推进后的数据面断言）
- [ ] axe 分支 A 基线登记绿

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（agent_26324ac9-00e6-4772-9741-a23ad0e8453f）
- Verdict: pass（零 Blocker / 零 Major / 4 Minor）
- Rounds: 1
- Findings addressed: Minor-① Last Reviewed 日期笔误已改；Minor-②③④ 四项 D4 偏离逐名写入 In Scope 与 Closure Gate 勘误清单（ACK_FAILED 错误分支增补、telemetryQuery 契约形状与 echarts option 声明面、form 免 metric、dialog 免「开始处理」）。

## Closure Gates

- [ ] in-scope 工作全部落地（V1 页 + ReplIot 域 + roadmap 回写）
- [ ] 行为/契约结果已达成（D4 §5 V1 断言清单全绿，`--retries=0`）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级的 in-scope 缺口
- [ ] 受影响 owner docs 已同步（daily log；D4 §2.5/§4.3/§5 V1 勘误——含 ①ACK_FAILED 错误分支增补 ②telemetryQuery 契约形状 ③form 控件 ④dialog 动作 四项逐名）
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新增未登记命中）

## Deferred But Adjudicated

### （继承）C2 calendar 月初时区窗口红

- Classification: `watch-only residual`
- Why Not Blocking Closure: plan 814 已裁决为 HEAD 既有、与 V1 触达面零交集；本 plan 全族回归若复现按同口径归因。
- Successor Required: `yes`
- Successor Path: roadmap M3-P1 开发阶段深度审计

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段
- ReplIot 域 V2/V3 扩展时按 crm-c2/ai-k2 先例拆 delegate 模块，控制单文件行数

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent 填写
- Evidence: 待填写

Follow-up:

- 待收口填写
