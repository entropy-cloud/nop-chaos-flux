# E1 Flux 测试后端骨架（flux-test-server + 页内驱动 + ft.expect 骨架 + Locator 兼容层）

> Plan Status: completed
> Last Reviewed: 2026-11-18
> Source: docs/research/2026-11-17-flux-test-backend-design.md（§1.6、§2、§3.1、§3.2、§5.1）、docs/research/2026-11-17-flux-debugger-roadmap.md E 轨道 E1
> Related: docs/plans/2026-11-18-m0-devtools-protocol-freeze-plan.md、docs/plans/2026-11-18-m1-stability-snapshot-foundation-plan.md（已收敛的前置）

## Purpose

把 E 轨道的地基落地：新增 Node 侧 `@nop-chaos/flux-test-server`（裸 CDP launcher / 本地网关 / runner / reporter / spec-loader / CLI）与页内 `@nop-chaos/flux-test-driver`（无 UI 内核装配 + `ft` 全局 + `ft.expect` 语义断言骨架 + Locator 兼容层子集），并以 1 条最小冒烟链路（launcher 拉起真实浏览器 → 加载 playground 页 → 注入驱动 → 跑 1 个内嵌 demo 断言）证明全链路可用。本计划不迁移任何存量 Playwright spec（那归 E2/E3）。

## Current Baseline

- 前置已收敛：M0 协议 JSON Schema 已发布（`packages/nop-debugger/protocol/`）；M1 StabilityTracker/快照环/日志总线已落地；M2 capture（S2 截图）/预览协议已落地；M3 waitFor 断言桥已落地；M4 why/inspectByCid/selector 建议已落地；M5 录制回放已落地（见 roadmap 各阶段勘误附注）。
- `packages/nop-debugger` 暴露 `createNopDebugger`（controller，含 `screenshot`/`waitFor`/`dispatch`/`why`/`replaySession` 等 automation 面，见 `src/types.ts:459-480` 一带）与 `installNopDebuggerWindowFlag`；当前 `__NOP_DEBUGGER_API__` 仅 7 个顶层存量 spec 使用（另 `tests/e2e/exploratory/` 内 6 个）。
- e2e 现状：`tests/e2e/` 247 个顶层 spec（含子目录共 305 个） 全部基于 `@playwright/test`；`pnpm test:e2e` = `playwright test`；本机存在 Playwright chromium（`~/Library/Caches/ms-playwright/chromium-*`）与系统 Chrome（`/Applications/Google Chrome.app`）。
- 仓库尚无 `ws` 顶层依赖（Playwright 自带），新包需自声明 `ws` 依赖。
- 新包接入固定动作：`vite.workspace-alias.ts` 别名、根 `tsconfig.json` project references、`pnpm check` 门禁（`check-workspace-manifest-deps`、`check-oversized-code-files`、`check:audit-ui-consistency-gaps`——driver/server 为纯逻辑包无 JSX，不触发 raw-control-element）。
- 真正的 gap：自研测试后端三件套（Node 网关/裸 CDP launcher/页内驱动）完全不存在；`ft.expect`/`ft` 全局不存在。

## Goals

- 新包 `@nop-chaos/flux-test-server`：CLI（`pnpm test:e2e` 可选旁路入口 `pnpm test:flux`）+ 裸 CDP launcher（复用系统 Chrome 或 Playwright chromium，零 puppeteer/playwright 依赖，`ws` 直连 CDP）+ 本地 WSS 网关（M0 协议本地子集：`session.attach`/`log.emit`/`assert.result`/`capture.*`）+ runner（每 spec 干净 tab、超时、顺序/并发 worker、失败收集）+ reporter（终端 + JSON）+ spec-loader（Vite 打包 spec → `Runtime.evaluate` 注入）。
- 新包 `@nop-chaos/flux-test-driver`：`createTestKernel`（nop-debugger 无 UI 装配）+ `ft` 全局（`goto/reload/byCid/dispatch/waitFor/scope/snapshotAt/screenshot/evaluate`）+ `ft.expect` 语义断言骨架（`cid().meta/prop/rendered`、`scope().toEqual`、`event().ended`、`snapshotPath().writtenAtStep`——骨架级：覆盖 meta/prop/rendered/scope/event/snapshotPath，reaction/visual 断言留接口位）+ Locator 兼容层子集（`getByTestId`/`locator` 的 click/dblclick/fill/type/press/hover/text/innerHTML/attr/isVisible/isEnabled/count/nth/first/waitFor，合成 DOM 事件 + `whenStable` 门控 + actionability 检查 + 重试语义）。
- 冒烟链路 Proof：`pnpm test:flux --spec <demo>` 在本机真实 Chrome 上跑通 1 个内嵌 demo spec（非迁移 spec），程序化断言通过。
- 单测覆盖（Must automate 项）：CDP 客户端消息编解码与 launcher 生命周期（mock CDP server）、runner 编排（超时/失败收集/tab 清洁，mock launcher）、Locator 语义子集（真实 jsdom DOM，逐 API 对照表）、ft.expect 骨架语义（mock controller）。

## Non-Goals

- 不迁移任何存量 Playwright spec；不动 `pnpm test:e2e` 的 Playwright 语义（双引擎 CI 归 E3）。
- 不做 Test Console UI（E2）；不做删除 Playwright/门禁（E4）；不做语义清零（E5）。
- 不承诺 Firefox/WebKit；仅 Chromium 系。
- 不实现 M6 网关的上传/鉴权/归档面（本地子集仅传结果与显式指令）。
- `ft.expect` 的 reaction 归因断言与 visual 基线断言：本计划仅留类型接口位，不实现（依赖 E3 期语义重写时的真实需求回灌）。

## Scope

### In Scope

- `packages/flux-test-server/`（新）：`src/cdp-client.ts`、`src/launcher.ts`、`src/gateway.ts`、`src/runner.ts`、`src/reporter.ts`、`src/spec-loader.ts`、`src/cli.ts` + 单测。
- `packages/flux-test-driver/`（新）：`src/kernel.ts`（createTestKernel）、`src/ft.ts`（全局对象）、`src/expect.ts`（语义断言骨架）、`src/locator.ts`（兼容层）+ 单测。
- 根配置接线：workspace alias、tsconfig references、`package.json` 新 script `test:flux`、`ws` 依赖声明。
- 冒烟 demo spec（`tests/e2e/flux/` 下 1 个文件，明确标注 demo、不注册进 Playwright 默认匹配——放独立目录避免 `playwright test` 收集）。
- `docs/logs/` 收口记录、roadmap E1 行勘误附注。

### Out Of Scope

- 247 个存量 spec 的任何改写；`playwright.config.ts` 变更。
- Test Console UI、Watch 模式、JUnit XML（reporter 仅终端+JSON；JUnit 归 E3 CI 接入时按消费格式补）。
- 视觉基线对比接线（M3 能力已在内核，driver 侧 `ft.visual()` 归 E2 试点时接）。
- CDP 杂项的可选通道实现（`Input.*` 真输入、`Fetch` 域拦截、多 tab 编排 API）——launcher 预留接口位，不实现。

## Failure Paths

| 可测场景编号          | 触发                                    | 行为（含错误码）                                                                           | 可重试                  | 用户可见表现                    |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------- |
| cdp-launch-fail       | 浏览器可执行文件不存在/启动退出         | `FluxTestError('cdp-launch-failed', {executable})`，runner 记该 spec failed 并聚合退出码 1 | 否（配置错误）          | 终端报错含 executable 路径      |
| cdp-connect-timeout   | CDP 端口 5s 无 `Target.getTargets` 响应 | `FluxTestError('cdp-connect-timeout')`，清理子进程                                         | 是（runner retry 策略） | 终端报超时                      |
| page-load-timeout     | tab 导航 30s 未 load                    | `FluxTestError('page-load-timeout', {url})`，关 tab                                        | 是                      | 终端报 URL                      |
| spec-timeout          | spec 执行超 runner timeout（默认 30s）  | 结果 `failed{reason:'timeout'}`，kill 注入执行上下文（关 tab）                             | 按 retry                | 报告标记 timeout                |
| kernel-attach-missing | 页面未装配内核即断言                    | `ft.expect` 抛 `FluxTestError('kernel-not-attached')`                                      | 否（spec 编写错误）     | 失败详情指明缺 createTestKernel |
| gateway-peer-lost     | 页面 WSS 断连（崩溃/关闭）              | gateway 标记 detach，runner 将未完成结果记 failed                                          | 是                      | 终端报会话中断                  |

## Test Strategy

档位选择：`必须自动化`

理由：runner 编排（超时/隔离/失败收集）、Locator 兼容层语义（决定迁移正确性）、CDP 客户端生命周期是核心回归路径，按设计 §6 全部 Must automate。Proof 项（冒烟链路）在 Fix 项完成后必须可重复执行。

## Execution Plan

### Phase 1 - flux-test-server 骨架（CDP 客户端 / launcher / gateway / runner / reporter / spec-loader / CLI）

Status: completed
Targets: `packages/flux-test-server/`、`vite.workspace-alias.ts`、`tsconfig.json`、root `package.json`

- Item Types: `Fix | Proof`

- [x] 新包脚手架：`package.json`（`ws` 依赖、`bin`、workspace:\* 引用）、`tsconfig.json`/`tsconfig.build.json`、`src/index.ts` 单入口；接入 `vite.workspace-alias.ts` 与根 tsconfig project references。
- [x] `src/errors.ts` + `src/cdp-client.ts`：`ws` 直连 CDP JSON 协议（id 关联 request/response、事件订阅、`FluxTestError` 错误面）；单测用内存 mock WebSocket server 覆盖编解码/超时/关闭语义。
- [x] `src/launcher.ts`：发现浏览器可执行文件（系统 Chrome → `CHROME_PATH` env → Playwright chromium 缓存），spawn + `--remote-debugging-port=0` 解析 ws url、`Target.createTarget`/`Page.navigate`/`Runtime.evaluate`/`Page.captureScreenshot`/`Emulation.setDeviceMetricsOverride` 最小面、关闭时 kill 子进程 + 关 tab；单测以 mock CDP server 覆盖 launch-fail/connect-timeout/page-load-timeout。
- [x] `src/gateway.ts`：本地 WSS（`ws` server），M0 本地子集消息（`session.attach`/`session.detach`/`log.emit`/`assert.result`/`capture.upload`），peer-lost 处理；单测覆盖 attach/断连/消息路由。
- [x] `src/spec-loader.ts`：spec TS → esbuild/Vite API 打包为单文件 IIFE → `Runtime.evaluate` 注入字符串；单测覆盖打包产物可执行形状（node 侧 eval 冒烟）。
- [x] `src/runner.ts`：每 spec 新 tab、顺序/并发 worker、per-spec 超时、失败收集（错误信息与耗时进结果对象，落 `tests/e2e/artifacts/` 政策路径 JSON 报告；per-spec DevSession 诊断包落盘归 E4 Console v2 接线）；单测以 mock launcher/gateway 覆盖 spec-timeout/failure 聚合/退出码。
- [x] `src/reporter.ts` + `src/cli.ts`：终端列表 + JSON 报告（`tests/e2e/artifacts/flux-test-report.json`）、CLI 参数 `--spec/--timeout/--workers/--report`、非零退出码语义；单测覆盖退出码映射。

Exit Criteria:

- [x] flux-test-server 的根配置接线完成（alias/references/`test:flux` script），`pnpm --filter @nop-chaos/flux-test-server typecheck` 通过。
- [x] Phase 1 全部单测绿（36/36，含 cdp-connect-timeout/cdp-launch-failed（browser-not-found）/page-load-timeout/spec-timeout/gateway-peer-lost 五个 server 侧场景）。
- [x] `pnpm check` 无新增红项。

### Phase 2 - flux-test-driver（内核装配 / ft 全局 / ft.expect 骨架 / Locator 兼容层）

Status: completed
Targets: `packages/flux-test-driver/`

- Item Types: `Fix | Proof`

- [x] 新包脚手架（同 Phase 1 接线），依赖 `@nop-chaos/nop-debugger` workspace:\*。
- [x] `src/kernel.ts`：`createTestKernel(mount, opts)` —— 无 UI 装配 `createNopDebugger` + `__NOP_DEBUGGER_API__` 窗口旗标 + 可选 gateway 连接（浏览器侧 `WebSocket`）；单测以 mock controller deps 覆盖 attach/detach。
- [x] `src/ft.ts`：`ft` 全局（`goto/reload`（Node 协同桩：经 gateway 指令）、`byCid`、`dispatch`、`waitFor`（M3 谓词透传）、`scope`、`snapshotAt`、`screenshot`、`evaluate` 兜底）；kernel 未装配时抛 `kernel-not-attached`；单测覆盖各桩与错误面。
- [x] `src/expect.ts`：`ft.expect` 骨架——`cid(id).meta(partial)/prop(name,expected)/rendered()/not.rendered({because})`、`scope(path).toEqual(expected)`、`event(name).ended({status})`、`snapshotPath(path).writtenAtStep(n)`；断言失败返回结构化 `{passed, actual, expected, because}` 并写 `assert.result`；`reaction()/visual()` 仅类型接口位（抛 `not-implemented-in-e1`）；单测以 mock controller 逐断言覆盖通过/失败/归因字段。
- [x] `src/locator.ts`：Locator 兼容子集（设计 §3.2 接口逐项）：`getByTestId/locator` 解析（CSS 子集 + `[data-testid="x"]`）、`click/dblclick/fill/type/press/hover`（合成事件序列 + actionability：可见/可点/无 `disabled`）、`text/innerHTML/attr/isVisible/isEnabled/count/nth/first`、`waitFor('visible'|'hidden'|'attached')`；查询重试（默认 5s）+ 动作执行一次 + 动作后 `whenStable` 门控；单测用 jsdom DOM 逐 API 对照（每方法至少 1 正 1 负用例）。
- [x] `check-jsdom-pragma-whitelist`：`packages/flux-test-driver/src/locator.test.ts`（jsdom DOM 语义测试）已登记进 `scripts/baselines/jsdom-pragma-whitelist.json`。

Exit Criteria:

- [x] 打包入口裁决：driver 为框架无关纯 TS 包，运行时绑定 `window.__NOP_DEBUGGER_API__`（不 import nop-debugger 实现），由 flux-test-server 的 esbuild bundleStandalone 打为 IIFE（globalName `flux_test_driver`）经 `Runtime.evaluate` 注入；冒烟链路已证明可注入（kernel attached + gateway attach 事件到达）。
- [x] `pnpm --filter @nop-chaos/flux-test-driver typecheck` 通过，全部单测绿（43/43）；Locator 每个接口方法均有正负用例（判别性：重试语义在"元素延迟出现"用例下必过、无重试实现会挂——判别机制：用例内延迟 200ms 挂载目标元素）。
- [x] ft.expect 每个断言原语（meta/prop/rendered/not.rendered/scope/event/snapshotPath）均有失败路径用例，且失败结构含 `actual/expected/because`（expect.test.ts 13 用例）。
- [ ] `pnpm check` 无新增红项。

### Phase 3 - 冒烟链路 Proof + 收口

Status: completed
Targets: `tests/e2e/flux/demo-smoke.flux-spec.ts`、`docs/logs/2026/11-18.md`、roadmap E1 行

- Item Types: `Proof | Decision`

- [x] 冒烟 demo spec：playground 页加载 → `ft.waitFor(stability)` → `ft.getByTestId('<一个已知 testid>').text()` 非空断言 → `ft.expect.cid(...).meta(...)` 至少一条语义断言 → 通过；经 `pnpm test:flux` 在本机 Chrome 实跑通过（产物 JSON 留 `tests/e2e/artifacts/`，gitignore）。
- [x] 判别性冒烟：demo spec 中含 1 条故意失败断言的 `--spec-must-fail` 通路（runner 对预期失败的反向验证：fail-as-expected 模式退出码 0），证明失败收集真实工作（旧式"只测通过"无法证明 runner 会正确报告失败）。
- [x] roadmap E1 行落地勘误附注 + `docs/logs/2026/11-18.md` 记录。

Exit Criteria:

- [x] `pnpm test:flux --spec tests/e2e/flux/demo-smoke.flux-spec.ts` 退出码 0（passed, ~1.5s）。
- [x] fail-as-expected：`--expected-fail demo-must-fail` 退出码 0、报告标记 `expected-failure`；去掉标记的负向核对退出码 1（判别成立）。
- [x] 文档回写完成（roadmap E1 附注 + daily log，见同批 commit）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session, agent_e1fd963f）
- Verdict: `pass`（首轮 fail：1 Major；修订后复审通过）
- Rounds: 2
- Findings addressed: Major-1 `__NOP_DEBUGGER_API__` 使用计数 4→7（已改为 7 顶层 + 6 exploratory）；Minor-1 spec 总数表述（247 顶层/305 含子目录）；Minor-2 Phase 2 增加 IIFE 打包入口裁决 exit item；Minor-3 Phase 1 接线表述改为仅 flux-test-server

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复——执行中发现并修复 1 个 in-scope live defect：playground App.tsx DevToolsHost 面板先于内核 assignment 挂载的竞态崩溃（M7 stub getSnapshot=undefined → React 树崩溃白屏）；修复 + 判别性回归测试（app-devtools-host.test.tsx，旧接线恰红 → 新接线绿，双向验证）
- [x] 所有 in-scope confirmed contract drifts 已收敛——M7 收口遗留的 types→diagnostic-bundle 环依赖（新引入）已消除（DiagnosticBundle 移入 types.ts 叶子）；nop-debugger controller.ts 超 700 行红线回撤（704→690）
- [x] 行为/契约结果已达成：两新包交付且冒烟链路真实浏览器通过（重构后复跑仍绿，1.0s）
- [x] 必要 focused verification 已完成：flux-test-server 36/36、flux-test-driver 43/43、playground 570/570；全量 `pnpm test` 17,208 passed / 0 failed
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（Deferred 节三项均为 out-of-scope improvement，附理由）
- [x] 受影响的 owner docs 已同步：roadmap E1 行勘误附注 + daily log（No other owner-doc update required——新包无既有架构文档归属；driver/server 设计描述已在 research 文档中，不新增 architecture doc）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure Audit Evidence）
- [x] `pnpm typecheck`（48/48 tasks）
- [x] `pnpm build`（48/48 tasks）
- [x] `pnpm lint`
- [x] `pnpm test`（17,208 passed / 0 failed；e2e 存量 Playwright 套件未动，E1 冒烟走独立引擎）
- [x] `pnpm check`（exit 0；新增命中已按规则登记：scanner-baselines/console-log/knip-baseline，controller.ts 红线回撤）

## Deferred But Adjudicated

### ft.expect reaction()/visual() 断言实现

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: E1 只要求骨架；reaction 归因断言依赖 M4 demand-time 读边记录的真实数据形态，visual 断言依赖 E2 试点对基线流程的裁决——现在实现必然返工。
- Successor Required: `yes`
- Successor Path: E3 批量迁移（语义重写步）回灌需求后在本包内补实现

### JUnit XML reporter

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: E1 无 CI 消费方；E3 双引擎 CI 接入时按现有 CI 消费格式补齐。
- Successor Required: `yes`
- Successor Path: E3 plan

## Non-Blocking Follow-ups

- `--expected-fail` 参数值校验守卫已加（closure audit Minor-3：不再吞并下一个 flag）；跨 tab 编排、CDP 杂项通道的 CLI 面留 E2 试点按需补。
- launcher 浏览器发现顺序在 CI（linux）上的验证留 E3 CI 接入时核对（本机 darwin 已验证）。
- spec-loader 对 import CSS/asset 的处理策略（当前仅 TS→IIFE）留缺口清单归 E2 试点回灌。

## Closure

Status Note: 收口。E1 交付面完整落地并通过独立 closure audit（approved，3 Minor 已当场处置：scope 文本漂移 2 处就地勘误、CLI 参数守卫补齐）。全量门禁绿：typecheck/build 48/48、lint、check exit 0（新增命中按规则登记）、test 17,208 passed / 0 failed；真实 Chrome 冒烟链路与 fail-as-expected 判别通路经审计员独立复跑确认。Plan Status: completed。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session, agent_1fa62960）
- Evidence: audit 报告 verdict `approved`，0 Blocker / 0 Major / 3 Minor。审计员独立复跑：flux-test-server 36/36、flux-test-driver 43/43、playground 回归 1/1、Playwright 不收集 .flux-spec（grep=0）、冒烟 spec passed 1104ms exit 0、--expected-fail 通路 exit 0 / 无标记 exit 1；workspace 接线（alias/tsconfig/test:flux）、四个 baseline 登记文件、App.tsx devtoolsReady 修复、roadmap 附注与 daily log 均逐一开档核对。Minors 处置：Minor-1/2 计划文本漂移就地勘误（session-store.ts 移除、DevSession 占位措辞改实况）；Minor-3 CLI --expected-fail 值校验守卫当场补齐（malformed→exit 2）。

Follow-up:

- 见 Non-Blocking Follow-ups（linux CI 浏览器发现验证归 E3；Console/多 tab/CDP 杂项归 E2）
