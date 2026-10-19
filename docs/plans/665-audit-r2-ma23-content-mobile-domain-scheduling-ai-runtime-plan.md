# 665 审计修复 R2·MA2.3：content+mobile+domain+scheduling+ai 异步安全与 IO 边界审计

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` MA2.3；`missions/audit-remediation-r2.json`；方法论 `docs/skills/deep-audit-prompts.md`（§B 维度 06/07 + §F 维度 19 + 附录 A）
> Related: `docs/audits/arm2-scope-and-dimension-matrix.md` MA2 节、`docs/audits/arm2-index.md`、MA2.1（reactive 勘正基线 21——口径参照不预载 finding）、MA2.2（non-retained P2-001 清单陈旧家族——检测启发）、owner doc `renderer-env.md`（INV-1/INV-2/§6 使用规则）

## Purpose

对 C4 content 族（content/layout/dashboard/pivot/mobile）+ C5 domain 族（industrial/3d/graph/map）+ C6 scheduling + C7 ai，共 11 包执行运行时正确性审计（matrix MA2.3：**异步安全 + 浏览器 IO 边界**，对照 `renderer-env.md` INV-1/INV-2）。产出 arm2 报告并登记 arm2-index；零代码变更（P0 即时通道除外）。

## Current Baseline（2026-10-20 live 实测，HEAD `f60c8840c`，工作树含并发线未提交文件——mobile/platform-hardening/index.md/10-19 log 非本 entry——本项产物与提交不含之）

- **四零面扫描器（=M0）**：runtime-raw-schema-reads 0 / fieldframe-bypasses 0 / hardcoded-type-dispatch 0 / event-dispatch-ctx 0；本轮另测 browser-io **0**、ai-engine-invariants **0**——但 browser-io 扫描器 10 条 RULES（fetch/XHR/storage/indexedDB/open/history/WebSocket/beacon/navigation/remote-import）**不含 camera/mediaDevices 族**（`scripts/audit/find-renderer-browser-io.mjs` RULES 数组亲核）——盲区见 P1 候选。
- **async-failure-paths = 337**（=M0 基线 337，零漂移；3 rule buckets：high void-promise-no-catch / medium then-chain-no-catch / catch-without-structured-failure-path）；MA2.3 目标包命中 **108**：ai 46 / industrial 23 / scheduling 12 / 3d 7 / content 5 / pivot 4 / layout 4 / dashboard 3 / mobile 2 / map 2；其中 **high 档 23 条**（ai 14 / industrial 6 / layout 1 / 3d 1 / mobile 1）。
- **reactive-render-reads = 21**（=MA2.1 勘正基线 21，零漂移）；MA2.3 目标包命中 **16**（全部 graph-renderer.tsx:177–657）。
- **non-retained = 146**（=142 M0 + 3 MA2.1 报告自扫伪影 + 1 MA2.2 报告自扫伪影，代码面零漂移）；MA2.3 目标包命中 **27**（scheduling 18 / mobile 4 / map 4 / dashboard 1；另 docs/audits 的 calendar/map 行各 1 在 visual-quality-r2 inventory controls.json，不计入包内命中）——已核 scheduling `calendar`（scheduling-renderer-definitions.ts:257）与 flux-renderers-map `map`（map-renderer-definitions.ts:72）为**已注册类型撞基线清单**（与 MA2.2 P2-001 同族）。
- **IO 边界正面/负面对照（live 亲核）**：barcode WASM 网络 IO 显式经 `env.fetcher`（barcode-input.tsx:199 在案注释 "INV-1 (renderer-env.md): WASM loading goes through the host RendererEnv fetcher"）+ fail-closed 重试（prepare-wasm-utils.ts:42 "no bundled default endpoint (INV-1/R5)"，throw 在 :46）；ai/voice-input SpeechRecognition 直调但在案豁免（ai-voice-input.tsx:60 "INV-1 adjudication (improvement §5.3)"）；ai/clipboard 直调但在案豁免（clipboard.ts:5，2026-08-11 R2-F2/WA-ai-002）；**barcode camera 无任何豁免直调**（use-barcode-camera.ts:67 getUserMedia）——见 P1 候选。map geojson 经 `helpers.dispatch` 走 env（use-map-geojson.ts:22 契约注释）。
- **env.clipboard 时序事实**：env `clipboard/print/location` 三通道 2026-09-26 经 INV-2 评审落地（renderer-env.md §4.3）；ai clipboard 豁免注记 2026-08-11 **早于**通道收编——前提过期信号。
- **抽样审读锚点域**：异步取消（AbortController/session 计数/信号双检）；StrictMode 双触发（pull-refresh MA-02 handler-body 派发、voice-input P2-6 in-flight 守卫、AI-31 eventsRef 依赖收窄）；错误传播（ai state.lastError 带 cause、industrial reportHandlerError 去重+上限、point-store emitWith per-emit 归因、scheduling i18n error 态）；定时器清理（countdown/carousel/preview-injector 配对实测）。
- **执行状态**：roadmap MA2.3 当前 `todo`；无 `arm2-MA2.3-*` 报告。

## Goals

- 产出 `docs/audits/2026-10-20-HHmm-arm2-MA2.3-content-mobile-domain-scheduling-ai-runtime.md`：双风格（multi + open），P0/P1/P2/P3 分级（P1 入 arm2-index，ID `P1-MA2.3-<nnn>`）。
- 覆盖面（matrix MA2.3 + §B 维度 06/07 + §F 维度 19）：① **IO 边界**（browser-io 扫描器 + RULES 盲区人工补扫 camera/clipboard/设备 API 全族 + INV-1 逐包对照 + env 通道消费抽样）；② **异步取消安全**（108 条 async 嫌疑按包分层裁定：**high 23 条全读**〔ai 14/industrial 6/layout 1/3d 1/mobile 1〕+ medium 每包代表点 + 定时器清理全扫）；③ **错误传播**（各包 catch 去向结构化核对：i18n error 态 / DiagnosticEvent / reportStorageError / runtime 错误路由）；④ **StrictMode/scope 生命周期抽样**（4 锚点）；⑤ **non-retained 27 条逐类型裁定**（calendar/map 注册体证据）；⑥ reactive graph 16 条性质裁定（处理器内 vs render 期）；⑦ 深化机会。
- 产出即登记 `docs/audits/arm2-index.md`（MA2.3 行 + P1 行如有）。
- BUILD_VERIFY：全量 `pnpm test`（Cross-Cutting 9，在 Closure Gates）。

## Non-Goals

- 零代码变更；命中只定级登记（修复归 MR）。不排 MR/R\*.n；不改写历史文档；不预载 MA1.4/1.5/1.6/MA2.1/MA2.2 finding（同族信号仅作检测启发，须本轮重新取证）。
- camera/clipboard IO 的实际修复（env 扩充 C 档评审 / importLoader B 档 / 迁移 env.clipboard）不在本项——本项只定级登记修复方向；渲染器视觉/交互行为归 MA5.5/5.2/5.6；测试质量归 MA4.3；reactive 深裁归 MA7.1（graph 16 条若判为 render 期才路由）。
- 不执行 MA2.4 及以后工作项；flux-code-editor clipboard 直调（C10）属 MA2.4 面，本项仅作 family 交叉信号登记。

## Scope（必填节）

### In Scope

- `docs/audits/` 新建 1 份 arm2-MA2.3 报告 + `docs/audits/arm2-index.md` 登记回填。
- 只读取证：六零扫描器复跑、async 108 条分层抽样（high 23 条全读 + medium 每包 ≥2 代表点）、browser-io RULES 盲区人工补扫（camera/clipboard/AudioContext/Notification/SW/WebRTC/geolocation）、定时器清理扫描（setInterval/clearInterval 配对）、non-retained 27 条类型归属裁定、reactive 16 条性质裁定、git churn top-5、owner doc 契约对照。
- `docs/logs/2026/10-20.md` 当日 log 新建并追加 MA2.3 条目（当日文件为本项新建，无并发 hunk 冲突）；roadmap MA2.3 行状态流转。
- 收口提交：`fix(audit-r2):` 格式。

### Out Of Scope

- 任何代码/测试/配置变更（P0 即时通道除外）；定级命中修复；MA2.4+ / MR / MV / MG；并发线未提交变更（mobile/platform-hardening/index.md/10-19 log——一律排除）。

## Failure Paths

| 可测场景编号   | 触发                                                                                                                                            | 行为                                                                                                 | 是否可重试 | 用户可见表现   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- | -------------- |
| audit-p0-found | 发现 P0——Rule 2 全六类适用（本项高概率实例：异步竞态致数据损坏、运行时崩溃；示例须可归入六类之一，否则按 P1/报告登记，不得走 P0 通道）          | P0 即时通道：plan 内追加 Fix Phase（判别测试先红后绿）或异步注入独立修复 plan，登记 arm2-index P0 区 | 否         | 无（修复先行） |
| scanner-drift  | 六零扫描器复跑 >0 或 async ≠337 / reactive ≠21 / non-retained 代码面漂移（146−4 报告自扫=142 代码面恒定；本报告落盘后自扫 +N 属预期伪影需注记） | 停止收口，归因（应零代码变更），报告记录                                                             | 是         | 无             |

预期不触发；预声明仅为通道完整性。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯审计取证 plan，零行为变更；全量 `pnpm test`（BUILD_VERIFY，即 Closure Gates 预声明门禁）为 Proof 交付物。若触发 P0 追加 Fix Phase，该 Fix 自动升档 `必须自动化`（Cross-Cutting 11）。

## Execution Plan

### Phase 1 - multi 维度清单取证（IO 边界 / 异步取消 / 错误传播 / 生命周期 / non-retained 裁定）

Status: completed
Targets: 报告草稿、`_tmp/`

- Item Types: `Proof | Decision`

- [x] **IO 边界**：browser-io 扫描器 0 复核 + RULES 盲区人工补扫（camera/mediaDevices/BarcodeDetector/AudioContext/Notification/serviceWorker/WebRTC/geolocation/navigator.onLine 全 renderer 包 grep）；INV-1 逐包对照（11 包网络/设备/存储 IO 通道盘点：WASM env.fetcher 正面对照、map helpers.dispatch、content markdown env 消费）；env.clipboard 时序核对（§4.3 2026-09-26 vs 在案豁免 2026-08-11）
- [x] **异步取消安全**：async 108 条分层裁定——**high 23 条全读**（ai 14〔engine/adapter/renderers 面〕/ industrial 6 / layout 1〔wizard:528〕/ 3d 1〔use-scene-manager:59〕/ mobile 1〔pull-refresh:158〕）+ medium 每包 ≥2 代表点（scheduling barcode-detect/torch/wasm/kanban、content image/json-view/diff、pivot/dashboard/map 等）；定时器清理全扫（setInterval/clearInterval 配对：countdown/carousel/preview-injector）；AbortController vs boolean 守卫形态登记
- [x] **错误传播**（维度 19 口径）：各包 catch 去向结构化核对——ai（lastError 带 cause / toolError 保真 / reportStorageError）、industrial（safeRun + reportHandlerError 去重上限 + emitWith 归因）、scheduling（i18n error 态 + wasm 重试后 throw）、mobile（pull-refresh error 状态可见化 MA-01）、content（语法高亮降级 + dev warn）
- [x] **StrictMode/scope 生命周期抽样 4 锚点**：pull-refresh（MA-02 handler-body 派发）、voice-input（P2-6 in-flight 双击守卫 + AI-31 eventsRef）、wizard（P1-03 committing 锁）、ai-chat（订阅 prev-state 翻转检测）
- [x] **non-retained 27 条逐类型裁定**：calendar@scheduling:257 / map@flux-renderers-map:72 注册体证据；mobile/dashboard 命中位定性（语义 payload 字面 / palette 引用）；MA2.2 P2-001 家族扩展判定
- [x] **reactive graph 16 条性质裁定**：逐条核 :177–657 调用语境（事件处理器/命令句柄 vs render 期）——处理器内=误报排除，render 期=路由 MA7.1
- [x] 深化机会：发现即记 systemic 候选

Exit Criteria:

- [x] IO 边界盲区补扫结果 + INV-1 对照行 + camera/clipboard 两面证据链在报告落字
- [x] async 抽样裁定表（high 23 条全读结论 + medium 代表点判定）+ 定时器配对结果落字
- [x] non-retained 类型裁定行（calendar/map 注册证据）+ reactive 16 条逐条定性落字

### Phase 2 - open 开放式追问（live 信号驱动）

Status: completed
Targets: 报告 open 段落

- Item Types: `Proof | Decision`

- [x] live 信号探针：MA2.3 包 churn top-5（近 1 个月窗口实测：industrial scada-editor-canvas 13 / scheduling kanban+gantt 各 10 / dashboard editor 10 / calendar 9）、已知失败模式 #7（async void）/ #9（owner doc）、MA1.4/1.5/1.6 交叉引用点（重新取证）
- [x] ≥2 轮开放式追问，每轮 live 证据或显式"未命中"；候选方向：媒体 IO 家族还有第几个成员、AI 流式中断→autosave 幽灵写、长会话编辑器内存（graph/3d instance 释放）
- [x] 深化机会与 MA5.5/MA7.1/MA7.2 交叉线索分栏记录

Exit Criteria:

- [x] open 段 ≥2 轮且每轮有证据；发现全部完成归族 + P 级判定

### Phase 3 - 报告落盘、arm2-index 登记与 BUILD_VERIFY

Status: completed
Targets: `docs/audits/2026-10-20-0335-arm2-MA2.3-content-mobile-domain-scheduling-ai-runtime.md`、`docs/audits/arm2-index.md`、`docs/logs/2026/10-20.md`

- Item Types: `Proof | Decision`

- [x] 报告按附录 A 格式落盘（收口补记门禁节 + 复核统计 + 分母口径 + 自扫伪影注记），文件名含时间戳
- [x] arm2-index：MA2.3 行回填；P1（P1-MA2.3-001）入索引区
- [x] daily log `docs/logs/2026/10-20.md` 新建并追加 MA2.3 条目（计数=报告实数）
- [x] 执行 Closure Gates 预声明的 BUILD_VERIFY（全量 `pnpm test`）并登记

Exit Criteria:

- [x] 报告存在且 arm2-index 与报告逐条一致
- [x] BUILD_VERIFY（`pnpm test`）exit 0（记录入报告收口补记/log）

### Phase 4 - 收口与状态流转

Status: in progress
Targets: roadmap、本 plan、git

- Item Types: `Proof | Follow-up`

- [x] draft review 通过后：roadmap MA2.3 `todo`→`planned`，本 plan `draft`→`active`
- [x] closure audit（独立 fresh-session 子代理）通过后：roadmap MA2.3 `planned`→`done`，本 plan→`completed`
- [x] 单次提交入库（本 plan + 报告 + arm2-index + log + roadmap），`fix(audit-r2):` 格式；标题不声称 `full-green verification`（typecheck/build 既有 playground 登记红）

Exit Criteria:

- [x] roadmap MA2.3 与 plan 状态流转一致
- [x] `git status` 复核提交仅含 In Scope 文件（并发线除外且未触碰）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh-session 子代理填写。

- Reviewer / Agent: 独立 fresh-session 审查子代理（五项检查 + 声称-实况逐条对账，扫描器实跑复现）
- Verdict: R1 `revised`（0B/2M/4m）→ 回修 → R2 `仍有问题`（0B/1M/1m——两处 token 级残留）→ 回修 → R3 字符级复核 `pass`（0B/0M/0m）
- Rounds: 3
- Findings addressed: M1 non-retained 目标包计数 26→**27**（scheduling 18/mobile 4/map 4/dashboard 1，Baseline/Goals/Phase1/InScope 四处一致 + docs/audits controls.json 注记）；M2 async high 档 3→**23 条全读**（ai 14/industrial 6/layout 1/3d 1/mobile 1，五处一致）；m1 prepare-wasm-utils :32→**:42**（throw :46）；m2 §B 06/07/19→§B 06/07 + §F 19（Source+Goals 两处）；m3 Failure Paths P0 示例删摄像头项 + 加六类归类限定；m4 churn 加近 1 个月窗口口径注记

## Closure Gates

> 全量验证归此处（Rule 18）；BUILD_VERIFY 按 Cross-Cutting 9 预声明。

- [x] arm2 报告落盘且 Phase 1–3 Exit Criteria 全部满足（n/a 显式理由、双风格两段齐备、收口补记门禁节实数）
- [x] arm2-index 登记（MA2.3 行 + P1-MA2.3-001 行）与报告逐条一致
- [x] BUILD_VERIFY 全量 `pnpm test` 通过并登记（82/82 任务，78 cached——零代码变更输入哈希一致）
- [x] 执行期间核对六零扫描器输出不高于 M0（全 0）；async=337 / reactive=21 / non-retained 代码面 142 对照（自扫伪影注记）
- [x] 不存在被静默降级的 in-scope 项（P2×2 入报告 deferred 区附定级理由）
- [x] roadmap Work Item Status MA2.3 行已流转 `done`（closure audit 通过后）
- [x] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（首轮 `approved` 0B/0M/4m——m1–m4 文字级 minor 同 commit 回修）
- [x] `pnpm typecheck`（既有登记红 playground vite.config 口径——零新增即通过）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 deferred 预期；执行中若出现改判，当场落本节。）

## Non-Blocking Follow-ups

- no remaining plan-owned work（MG 候选：browser-io 扫描器补 camera 族规则〔P1-001 棘轮〕、amis-baseline-matrix Retained 段 calendar/map 补录〔P2-002，并 MA2.2 P2-001〕、owner-doc §6 通道枚举同步 + 剪贴板 4 位点迁移/豁免条款二选一〔P2-001〕、reactive/non-retained 扫描器分层降噪——均已在报告"建议新增的自动化检查"与 P2 deferred 区排账）

## Closure

Status Note: MA2.3 全部 Phase 交付完成——报告双风格落盘（multi 五维度 + open 三轮）、arm2-index 登记（MA2.3 行 + P1-MA2.3-001）、daily log 10-20 新建、BUILD_VERIFY 与四门禁实测（test 82/82、lint 44/44、typecheck/build 既有登记红零新增）、零代码变更纪律经独立实测核验（git status 无 packages/apps/scripts 变更）。closure audit 首轮 `approved`（0B/0M/4m——m1 scheduling 构成差一/m2 mobile 命中字面/m3 142 口径术语/m4 reactive :339/:341 归类，均文字级、不改变头条计数与定级，同 commit 回修）。P0=0、P1=1（barcode-input 摄像头 IO 无 env 通道无豁免 + 扫描器盲区）、P2=2（剪贴板治理漂移 4 位点、non-retained calendar/map 清单陈旧）；async 108 条嫌疑（high 23 全读 + medium 每包 ≥2）全数有结构化失败路径；MA2.1 路由的 graph×16 reactive 收口为处理器内读取误报排除。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure auditor（子代理，19 项声称-实况对账全 PASS：P1-001 全证据链行号精确、剪贴板 4 位点亲核、non-retained 27=18/4/4/1 实跑复现、async 337/high 23=14/6/1/1/1 复现、reactive 21/graph 16 抽 6 处语境亲验、BUILD_VERIFY 独立复跑 exit 0、零代码变更 git status 核验）
- Evidence: auditor 报告结论 "approved（可关闭）——全部关键声称经独立实测全部成立；4 条 Minor 均为构成叙述/引证字面/术语口径级瑕疵，不改变任何头条计数、定级、路由或门禁结论"；m1–m4 回修随本收口 commit 落盘

Follow-up:

- no remaining plan-owned work
