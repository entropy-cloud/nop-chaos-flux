# E2 Test Console v1 + T0 试点（2 spec 双引擎迁移）

> Plan Status: completed
> Last Reviewed: 2026-11-18
> Source: docs/research/2026-11-17-flux-test-backend-design.md（§3.3 Test Console、§5.2 T0/T1）、docs/research/2026-11-17-flux-debugger-roadmap.md E 轨道 E2
> Related: docs/plans/2026-11-18-e1-flux-test-backend-foundation-plan.md（completed，fb15ef273）

## Purpose

在 E1 骨架上交付 E2 两件事：① Test Console v1——`pnpm test:flux --open` 起一个浏览器可开的管控页（Launchpad：spec 树选择；Runner：运行结果流 + 内核 Command Log 实时树）；② T0 试点——选 1 个纯交互 spec + 1 个 visual spec 完成"引擎替换"迁移（新 `.flux-spec.ts` 全绿 + 旧 Playwright spec 同 commit 删除，断言强度不降级），并把兼容层缺口清单回灌设计文档。

## Current Baseline

- E1 已收口（commit fb15ef273）：flux-test-server（CDP launcher/gateway/runner/reporter/CLI）+ flux-test-driver（installFt/ft/expect/Locator）均绿；冒烟链路与 fail-as-expected 判别通路真实浏览器通过；`pnpm test:flux` 为独立引擎入口。
- `TestGateway` 已有 M0 本地子集 WSS（session.attach/log.emit/assert.result/capture.upload + 双向 request），但 CLI 无 HTTP 静态服务、无 Console 页。
- 驱动侧 `log.emit` 事件已在 gateway 协议中，但 runner/spec 未把内核 Log 树流接到 gateway（Console Command Log 树的数据源缺口）。
- 存量 e2e：247 顶层 spec（Playwright）。候选试点已勘定：
  - 交互：`tests/e2e/boolean-control-value-contract.spec.ts`（101 行，goto/heading/role 点击/text 断言/poll——兼容层能力内；语义升级点：poll 换 `ft.waitFor({type:'stability'})` 门控 + 保留值文本结论）。
  - visual：`tests/e2e/ai-chat-ux-visual.spec.ts`（104 行，程序化断言零截图；嵌套定位可平铺为后代 CSS 选择器；`getBoundingClientRect`/computed style 经 `ft.evaluate` 兜底——登记 evaluate 债务）。
- Locator 兼容层已知缺口（试点回灌输入）：无嵌套 `locator.locator()`（用后代选择器绕行）、无元素级 `evaluate`、无 `getByRole`（用 CSS/属性选择器绕行）、无键盘组合键（Chord/ControlOrMeta，试点未触及）。

## Goals

- Console v1：`pnpm test:flux --open --dir tests/e2e/flux` 在 `http://127.0.0.1:<port>/__flux_test__` 提供 Launchpad（spec 列表 + 点击运行）与 Runner（per-spec 结果 + 实时 log.emit Command Log 流展示）；使用 `@nop-chaos/ui` 组件（过 ui-consistency 门禁）；同端口 WSS 复用（HTTP 升级共存）。
- 驱动→gateway 的 `log.emit` 接线：spec 执行期间内核事件摘要流（kind/summary/cid）经 gateway 到 Console。
- 试点 2 spec：两个 `.flux-spec.ts` 在 flux 引擎全绿，旧 Playwright spec 同 commit 删除；`pnpm test:flux --dir tests/e2e/flux` 全绿、`npx playwright test` 剩余套件不受影响。
- 缺口清单回灌：设计文档 §3.2/§5.1 追加"试点实测缺口与绕行"勘误附注。

## Non-Goals

- 页面预览 iframe 投影与时间旅行 scrub（Console v1 的 M2 预览协议接线）——E2 交付为 Launchpad+Runner 结果流+Command Log 树；预览/scrub 移交 E3 Console 增强（诚实记账，见 Deferred）。
- Watch 模式、断言详情抽屉、历史 run 落库（E3/E4）。
- 批量迁移（E3）；JUnit reporter（E3）；删除 Playwright（E4）。

## Scope

### In Scope

- `packages/flux-test-server/`：HTTP 静态服务与 WSS 共存（`--open` 模式）、Console 页面（esbuild 打包的 React+ui 应用，路由 `/__flux_test__`）、run 请求/结果流协议、log.emit 接线。
- `packages/flux-test-driver/`：`ft.logStream`/内核事件 → gateway `log.emit` 发送（spec 执行期）。
- `tests/e2e/flux/boolean-control-value-contract.flux-spec.ts`、`tests/e2e/flux/ai-chat-ux-visual.flux-spec.ts`（新）+ 删除对应两个旧 spec。
- `docs/research/2026-11-17-flux-test-backend-design.md` 缺口清单勘误附注、roadmap E2 行勘误附注、daily log。

### Out Of Scope

- 其余 245 个 Playwright spec 的任何改动。
- Console 的视觉回归/像素级保真（ui 组件 Tailwind 样式在独立 bundle 中以功能可用为准，视觉打磨随 E3）。
- 多浏览器、并行 worker Console 视图。

## Failure Paths

| 可测场景编号          | 触发                             | 行为                                                                                 | 可重试 | 用户可见表现                    |
| --------------------- | -------------------------------- | ------------------------------------------------------------------------------------ | ------ | ------------------------------- |
| console-run-conflict  | Console 触发 run 时已有 run 在途 | `FluxTestError('gateway-no-peer')` 系错误映射为 409 语义，Console 显示"运行中"       | 否     | Runner 区显示 in-progress 状态  |
| console-page-no-specs | `--dir` 下无 spec                | Console 显示空态，run 按钮 disabled                                                  | 否     | 空态文案                        |
| log-emit-backpressure | 内核事件速率过高                 | driver 发送侧限频 20 条/秒（唯一 owner），超出丢弃并计数入 payload；gateway 侧只透传 | 是     | Console 日志区显示 dropped 计数 |

## Test Strategy

档位选择：`必须自动化`

理由：run 编排（单飞/并发拒绝）、log.emit 限频、Console 服务路由是回归路径；试点 spec 的等价性是迁移铁律的根基。

## Execution Plan

### Phase 1 - Console v1（HTTP 服务 + Console 页 + run 流协议 + log.emit 接线）

Status: completed
Targets: `packages/flux-test-server/src/{console-server,console/*}.ts(x)`、`packages/flux-test-driver/src/kernel.ts`

- Item Types: `Fix | Proof`

- [x] `gateway.ts` 扩展：TestGateway 接受可选外部 http server（WSS noServer 模式 + upgrade 路由），新增 console 专用 peer 身份（保留 peer id `__console__`，不占浏览器 target 命名空间）与 run 状态广播事件（run started/finished 由 Node 侧主动通知 Console）。
- [x] `console-server.ts`：CLI `--open` 模式——静态服务 Console bundle（`/__flux_test__`）、`GET /__flux_test__/api/specs`、`POST /__flux_test__/api/run`（启动单飞 run，返回 409 若在途）、结果经 gateway WS 推给 Console 页。
- [x] `console/app.tsx`：Launchpad（spec 列表，ui `Button`/`Badge`/`ScrollArea`）+ Runner（结果列表 + log.emit Command Log 流 + dropped 计数）。esbuild 打包为自包含 IIFE + HTML 壳。
- [x] driver `kernel.ts`：`installFt({gateway:true})` 后订阅内核事件（automation api `queryEvents` 轮询），限频（20 条/秒，超出丢弃计数入 payload）在 driver 发送侧执行——单测覆盖限频/丢弃计数；gateway 侧只透传不合流。
- [x] 单测：console-server 路由（specs 列表/run 409/静态页）、gateway upgrade 共存、log.emit 限频。

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-test-server test`、`flux-test-driver test` 全绿（新增用例覆盖 run 单飞 409、限频、upgrade 共存）。
- [x] 真机 Proof：`pnpm test:flux --open --dir tests/e2e/flux` 起服务后，浏览器页 `http://127.0.0.1:4175`（任意 tab）打开 Console，点击运行 demo-smoke → 结果 passed 且 Command Log 区有内核事件流（`curl` + 页面 evaluate 程序化断言，截图仅诊断）。
- [x] `pnpm check` 无新增红项。

### Phase 2 - T0 试点迁移（2 spec，新全绿 + 旧删除同 commit）

Status: completed
Targets: `tests/e2e/flux/*.flux-spec.ts`、删除 `tests/e2e/boolean-control-value-contract.spec.ts`、`tests/e2e/ai-chat-ux-visual.spec.ts`

- Item Types: `Fix | Proof`

- [x] 交互试点：`boolean-control-value-contract.flux-spec.ts` 覆盖旧 spec 全部 4 个用例（checkbox/switch trueValue-falseValue ×2 + fallback ×2）；断言强度不降级：旧 `expect.poll(text)` 升级为 `ft.waitFor({type:'stability'})` + 值文本结论保留；页面错误监控以 kernel `getLatestError` 空检查替代 `assertTrackedPageErrors`（更强：内核白盒）。
- [x] visual 试点：`ai-chat-ux-visual.flux-spec.ts` 覆盖旧 spec 全部 5 个用例（语言标签头/三点脉冲/sender 自增高与同位切换/hover 浮现/会话检索）；`getBoundingClientRect`/computed opacity 经 `ft.evaluate` 兜底并登记 evaluate 债务（2 处，文件级白名单记录于缺口清单）。
- [x] 双引擎验证：新 spec 在 flux 引擎全绿；`npx playwright test tests/e2e/boolean-control-value-contract.spec.ts tests/e2e/ai-chat-ux-visual.spec.ts` 确认旧 spec 仍绿后，同 commit 删除两个旧文件。
- [x] 缺口清单回灌：design doc §3.2/§5.1 追加实测缺口勘误附注（嵌套 locator/元素 evaluate/getByRole/键盘组合键/viewport/mouse.move），标 E3 处置。

Exit Criteria:

- [x] `pnpm test:flux --dir tests/e2e/flux` 全绿（含 2 个新试点 + demo 2 个）。
- [x] 删除旧 spec 后 `npx playwright test boolean-control ai-chat-ux-visual` 报"test not found"，其余套件文件数 245（247-2）。
- [x] design doc 勘误附注 + roadmap E2 行附注 + daily log 完成。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session, agent_530f551a）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 4 Minor，已全部处置）
- Rounds: 1
- Findings addressed: Minor-1 行数 105→104 已改；Minor-2 run.request 方向歧义——改为 console 保留 peer id `__console__` + Node 主动广播 run 状态；Minor-3 Console peer 身份命名已写入 gateway 扩展项；Minor-4 限频 owner 裁定为 driver 发送侧唯一 owner，gateway 只透传（Failure Paths/Phase 1 同步修订）

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope confirmed contract drifts 已收敛
- [x] 行为/契约结果已达成：Console v1 真机可用 + 2 试点迁移完成（新绿旧删同 commit）
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（预览/scrub 是 E2 范围裁决的 Deferred——见 Deferred 节）
- [x] 受影响的 owner docs 已同步（design doc 缺口附注 + roadmap + daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### Console 页面预览 + 时间旅行 scrub（roadmap E2 原文范围）

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: M2 预览协议（enterPreview/DOM 影子）挂接 Console 需要被测页 iframe 投影 + 跨 frame 网关通道，属 E3 Console 增强工作面；E2 的 Launchpad+Runner+Command Log 树已构成 Console v1 的可用管控闭环，T0 试点的验证目标（全链路真实迁移）不依赖预览/scrub。
- Successor Required: `yes`
- Successor Path: E3 plan（Console 增强：Watch 模式、断言详情抽屉 + 预览/scrub 接线）

## Non-Blocking Follow-ups

- Console 视觉打磨（Tailwind 预览样式、布局细节）随 E3。
- `ft.evaluate` 债务 2 处（visual 试点）登记于缺口清单，E3 语义重写时优先清偿。

## Closure

Status Note: 已收口（2026-11-18）。Console v1 + T0 试点 2 spec 落地；独立 closure audit（agent_d1689e46）pass-with-minors，1 Major（roadmap E2 行勘误附注缺失）+ 4 Minor 全部处置：F1 roadmap 勘误已落、F2 checklist 全勾、F3 dead code 清除、F4 run 400/409 校验顺序修正（path-escape 先于 single-flight）、F5 登记为 follow-up。范围裁决：预览/scrub 归 E3（见 Deferred）。

Closure Audit Evidence:

- Auditor / Agent: agent_d1689e46（fresh session，仅以 plan + diff summary + verification output 三件套为输入）
- Evidence: verdict pass-with-minors（0 Blocker / 1 Major / 4 Minor）；审计会话独立复现验证：flux-test-server 41 passed、flux-test-driver 47 passed、`pnpm test:flux` 4 passed（含真实 Chrome 链路与 Console 真机探针：HTTP 200 / specs 4 / run 202 / 并发 409）；迁移等价性逐用例对照 `git show HEAD` 确认（boolean 4/4、ai-chat 5/5，断言强度不降级）；Playwright `--list` 0 收集 flux-spec、存量 spec 245；Major-1 = roadmap E2 行勘误缺失（处置：已补落地附注）。F1–F5 修复后 focused tests 复跑绿（server 41 / driver 47 / flux 4）。

Follow-up:

- Console 视觉打磨与预览/scrub 归 E3。
- F5：`test:flux` 默认 baseUrl `127.0.0.1:4175` 与默认 `pnpm dev`（绑定 localhost/::1）不匹配，需显式 `--base-url http://localhost:5173`——E1 既有 ergonomics，E3 顺手修正。
