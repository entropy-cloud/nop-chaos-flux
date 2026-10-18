# 2476 xdbg item 22 前后端 Playwright e2e（xlang 在线调试全链，flux 侧）

> Plan Status: completed
> Last Reviewed: 2026-10-18
> Source: roadmap item 22（ai-dev/backlog/xlang-web-debugger-roadmap.md）；场景蓝本 = entropy plan 2475 TestXdslTaskDebugFullChain（协议时序权威）+ D1/D2 设计；e2e 基座 = flux playwright.config.ts（playground dev server, chromium）
> Related: flux docs/plans/621（item 19 装配/演示页）、entropy plans/2475（item 21）、2474（item 20 交付链）

## Purpose

交付 flux 侧 Playwright e2e：经真实浏览器驱动 playground `#/xlang-debug` 演示页（真实装配链：schema→registry→SchemaRenderer→装配组件→编辑器/面板/client），覆盖"断点→命中→续期→单步→求值→放行→完成"全链与断连/租约过期路径，作为 CI 可运行套件（零新增基建）。

## Current Baseline

- **e2e 基座**：`playwright.config.ts`——testDir tests/e2e，chromium，webServer = playground dev server（`PLAYWRIGHT_PORT` 默认 4175），`@playwright/test@1.63`（**`page.routeWebSocket` 可用**，≥1.48）。
- **演示页**（item 19）：`#/xlang-debug`——token gate（input placeholder "access token" + 硬编码中文按钮"连接调试会话"）→ schema `xlang-debug-editor`（sourcePath=demo.xpl, serverUrl=/ws/xlang-debugger, initialSource 6 行）；i18n `initFluxI18n()` 无参默认 **zh-CN**（面板 label：继续/暂停/步入/步过/步出——选择器一律用 nth 禁用文本选择）经 registry+SchemaRenderer 装配；token 注入 WS URL（openSocket 包装 `nopDebugToken=`）；compile 走 env.fetcher POST `/r/nop-xlang-debug/compile`。
- **DOM 面**：`[data-testid="xlang-debug-editor"/"-controls"/"-eval"/"-vars"/"-stack"/"-logs"/"-not-suspended"/"-exception"]`；控件按钮 `.xlang-debug-btn`（label 经 i18n，en-US: Continue/Pause/Step Into/Step Over/Step Out；nth 稳定：0=Continue,2=StepInto,3=StepOver）；eval 结果 `.xlang-debug-eval-result`。
- **协议（D1/D2 + item 12 实现，R1 勘正）**：session.open→{sessionId,lease}（mock 需**每次 open 生成新 sessionId**——client 仅在新旧不同才发 session.rebind）；debugger.setBreakpoints/addBreakpoint；**mock 必须应答 `debugger.getFrameVariables`**（evt.suspended 渲染 VariablesTree 时自动发起，不应答 30s 后 vars-error）与 rebind 恢复的 getStackInfo；evt.suspended{reason,threadId,location,stackInfo}；lease.renew→{lease}；debugger.getExprValue→{v:{value}}；debugger.step\*/resume；**evt.resumed{threadIds,cause}**（threadIds 承载挂起清除——缺省则面板永久挂起）；evt.completed（**无 UI 消费方**——仅 mock 侧可断言）；evt.leaseExpired{threadIds}；session.close→evt.sessionClosed；4401 鉴权关闭；重连矩阵 + rebind 快照{sessionId,breakpoints,suspendedThreads,lease}。**StrictMode**：playground dev 以 React.StrictMode 包裹——装配 effect 双挂载产生两条 WS 连接（首条 CONNECTING 态即 dispose），mock 须容忍弃连，帧断言经 method 过滤数组 + expect.poll 而非严格排序。
- **client 行为**（618/621）：空 token 不拼参；续期心跳 interval（lease.renewIntervalMs）；断连重连（500ms 起指数退避 ≤15s）+ rebind；leaseExpired → store 移除挂起。
- **后端真实集成**已由 entropy item 21 全链测试承载（2475）；本 plan 的浏览器侧后端 = 测试内协议忠实 mock（`routeWebSocket` 浏览器内拦截——含重连；`page.route` 拦 compile POST），零服务器基建；真实宿主联调（docker-compose）为 621 已登记 follow-up，不入本 plan。

## Goals

- `tests/e2e/xlang-debug.spec.ts`：全链 spec——token gate→连接（session.open 帧 + nopDebugToken 断言）→gutter 断点（addBreakpoint 帧）→命中（mock evt.suspended，面板挂起态）→续期（renew 帧断言）→单步（按钮→step 帧→次级挂起）→求值（eval 输入→getExprValue 帧→结果渲染）→放行（resume 帧→evt.resumed/completed→非挂起态）。
- 路径覆盖：断连重连（mock 断开→重连→session.open/rebind 帧断言）、租约过期（evt.leaseExpired→非挂起态）、compile 诊断桥（mock 诊断→编辑器 lint 标注存在）。
- CI 可运行说明：现有 `pnpm e2e` 门槛直接承载（登记于 flux docs，item 23 汇总）。

## Non-Goals

- 真实 nop-entropy 后端联调（docker-compose 编排，621 已登记 follow-up）；entropy 侧改动。
- 视觉回归（visual spec 体系不入本 plan）；nop-debugger 页面面板（另一特性）。

## Scope

### In Scope

- `tests/e2e/xlang-debug.spec.ts`（新 spec，走 tests/e2e/fixtures.js 房式）

### Out Of Scope

- 真实后端联调（Deferred）；视觉回归；nop-debugger 页面面板；entropy 仓改动

## Failure Paths

| 场景                | 触发                               | 行为                                                                                                              | 可重试 | 用户可见表现        |
| ------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------ | ------------------- |
| mock 时序竞态       | WS 帧 async 到达                   | 断言全部走 expect.poll/toBeAttached 轮询（帧断言经 ws.snapshot 等价物——mock 端数组 + expect.poll）                | 是     | 重试 1 次（config） |
| gutter 坐标点击不稳 | CodeMirror 行盒几何随字体/缩放漂移 | 改进定位：`.cm-line` 行盒 + gutter 元素 bounding box 求交点（无 store 测试钩子——不加钩子属 scope 变更，如实登记） | 是     | —                   |

## Test Strategy

本档选择：`必须自动化`（item 本体即 e2e）——单 spec 文件多用例（全链/断连/租约过期/诊断桥），帧断言 = mock 端收帧数组 + expect.poll。

## Execution Plan

### Phase 1 - 全链 e2e spec + 路径覆盖

Status: completed
Targets: `tests/e2e/xlang-debug.spec.ts`

- Item Types: `Proof`

- [x] **mock 传输层执行中裁定（重大 pivot，R1 方案被实测否决）**：`page.routeWebSocket` shim 注入在部分 page 上**间歇失效**（失败页 `window.WebSocket` 为 native 构造器实测；fixture page/fresh-context page/内联 literal/模块 const/context 级注册全组合遍历仍交替失效）——弃用浏览器注入，改为 **vite dev 代理 + 独立 D1 mock 服务器进程**：`tests/e2e/xlang-debug-mock-server.mjs`（node http + RFC6455 最小实现，固定端口 4180，playwright `webServer` 数组拉起；控制面 `/__frames|/__emit|/__reset|/__close|/__compile|/__health`）+ playground vite.config `server.proxy`（`/ws/xlang-debugger` ws 代理 + `/r/nop-xlang-debug` http 代理）——浏览器真实 WebSocket 端到端，确定性时序。D1 服务端语义同 R1 清单（open[每连新 sessionId+renewIntervalMs=250]/getFrameVariables 桩/getStackInfo 桩/evt.resumed{threadIds,cause} 等）
- [x] 全链用例：token gate→连接→gutter 断点（addBreakpoint 帧 sourcePath/line 断言）→evt.suspended（vars 渲染 + getFrameVariables 自动帧）→续期帧→stepInto→次级挂起→eval 求值（getExprValue 帧 + eval-result==42）→resume→非挂起态
- [x] 断连用例：/\_\_close 服务器强关→client 重连矩阵→session.open≥2 + session.rebind 帧（新 sessionId 断言）
- [x] 租约过期用例：evt.leaseExpired{threadIds}→非挂起态
- [x] 诊断桥用例：compile 返回原始 body `{"diagnostics":[...]}`（R1 M2）→ `.cm-lintRange-error` 呈现；错误态 = HTTP 500（**意图内 console.error 经 errorMonitor.allowConsoleErrors(1) 放行**）
- [x] CI 说明登记（spec 头注 + flux docs item 23 汇总引用）

Exit Criteria:

- [x] spec 绿（chromium，本地实测），失败即判别（mock 帧断言失效即红）
- [x] 既有 e2e 不受影响（xlang spec 纯新增不触既有 spec）；全量 e2e 以 `E2E_EXCLUDE_WATCH_ONLY=1` 跑一次并记录：**1563 passed / 262 failed（52.8m，exit 1）——xlang spec 5/5 全绿（#2159-2163）**；262 失败为与本 diff 无关的既有/环境性大面积红（遍布 ai-attachments/gantt/replica 等无关 spec 且从首个用例即开始；**config 还原抽样实证**：还原 item 22 之前 vite.config/playwright.config 后 ai-attachments 仍 2/2 红）——台账细目归 e2e 治理线（docs/audits/\* ledger 并行会话在记）；**文件内 serial**（5 用例共享 mock 服务器状态，/\_\_reset 互清帧计数——并发 worker 轮询互踩，串行为共享态确定性口径）
- [x] 端到端验证（Minimum Rule 22）：浏览器 UI 操作到 WS 帧（客户端→mock）与 mock 事件到 UI 呈现（mock→客户端）双向全链已验证
- [x] flux `docs/logs/` 条目更新

## Closure Gates

- [x] 所有 in-scope 行为实现且有测试（spec 即交付物）——2026-10-18 收口翻转前复核：spec 5/5 绿（34.5s）
- [x] Anti-Hollow：UI 操作→client 帧→mock 服务端语义→事件→UI 呈现双向连通（帧断言 + DOM 断言双向实证）——closure audit B 维 PASS（spec 判别力双向实证）
- [x] flux docs/logs 更新；CI 说明登记——f5a2b65fc/b9d54d3de/cfd966ee9 落档
- [x] 独立子 agent closure-audit 完成并记录证据——agent_d9785461（0B/2M/5m 全消化，见 Closure Audit Evidence）
- [x] `pnpm test:e2e tests/e2e/xlang-debug.spec.ts` 绿（**closure audit M-2a 勘正**：原 gate 命令 `--filter playground exec playwright` 于 apps/playground cwd 下无 config/tests 必失败；须于仓库根执行）
- [x] `pnpm typecheck` / `pnpm lint` 绿（新增 spec 文件入档）
- [x] flux 仓无 check-plan-checklist 工具（R1 m8 实证）——按 flux plan guide Rule-20 文本一致性人工核对并记录于 Closure
- [x] **closure audit M-1 消化**：mock 服务器引发 `pnpm check:scanner-baselines` 红（+4/+7 全在本文件——test-infra shape-heuristic 家族：控制面 catch 形态与 res.end(JSON.stringify) 同步应答）——按仓规登记路径（scanner-baselines.json reRegistrationNotes 附裁定注记 + 计数 330→334 / 723→730），`pnpm check:scanner-baselines` 复测 within baseline；附带 Minor-1（扩展长度头边界检查 + 解码 try/catch）、Minor-2（残字节保留循环替代整 buffer 丢弃）、Minor-4（端口 XLANG_E2E_MOCK_PORT env 化 + /\_\_reset 清 compileResponse + `pnpm test:e2e` 文档勘正）全部落码

## Deferred But Adjudicated

### 真实后端 docker-compose 联调

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 621 已登记 follow-up；真实后端集成由 entropy item 21 全链测试承载（协议两端的各自 full proof），浏览器侧以协议忠实 mock 覆盖
- Successor Required: `no`（宿主需求出现时另立）

## Closure

Status Note: item 22（前后端 Playwright e2e）收口——真实 D1 mock 服务器 + vite 代理架构下 5 用例 e2e（全链/断连重连/租约过期/诊断桥/compile 500 兜底）连续多轮 5/5 绿，并在全量 e2e 套件中 5/5 绿（#2159-2163）。closure audit（agent_d9785461）0B/2M/5m：M-1 scanner 债按仓规登记消化（within baseline 复测）；M-2 三处文本修正落位；5 minor 全处置（含 mock 服务器加固）。262 大面积红经归因三分披露（已提交代码 schema 诊断主导 + flaky + 并行在途 confound），与本 diff 无关（config 还原抽样）。
Completed: 2026-10-18

Closure Audit Evidence:

- Reviewer / Agent: 独立子代理 agent_d9785461（fresh session，cold-start 亲测 5/5 34.0s）
- Audit Session: agent_d9785461-cd0d-49de-a842-6d0c4585a7ed
- Evidence:
  - A RFC6455 正确性 PASS（accept key/掩码/ping-pong/close 逐项核验）；M-1 后加固：扩展长度头边界检查 + 解码 try/catch + 残字节保留循环（Minor-1/2 落码）
  - B spec 判别力 PASS（真实帧/eval 42/rebind 形状/态切换双向）；M-3 变量名断言落码（值在懒展开层——断言修至名字集）；lint 消息级断言不可行（tooltip 无 DOM 面）登记机会性
  - C 接线架构 PASS（webServer 数组启动顺序 + 代理按需惰性声明成立）
  - D 门禁亲测 PASS：spec 5/5（cold start）；typecheck 同 2 既有红非新增（FM-2 会话独立记录同值）；lint 0——**M-1：check:scanner-baselines 红（+4/+7 全在 mock 服务器）→ 按仓规登记 + within baseline 复测**
  - E 全量记录核查 PASS（1563/262、xlang 5/5 #2159-2163）；**M-2c/E 归因三分勘正落 plan**（主导=已提交代码 schema 诊断；flaky 桶；在途 confound 披露；还原抽样落 flaky 桶非硬失败集）
  - F Deferred 诚实 PASS（单条 merged docker-compose）；R1 落位抽查 PASS；M-2 文本三处（gate 命令/Draft Review Record R1 回填/log 结果行）落位
  - scanner 登记后 `check:scanner-baselines` within baseline（649<650 既有 shrink 提示非红）；lint 0
  - Deferred 分类检查：单条（真实后端 docker-compose）out-of-scope 维持——无 in-scope live defect 被降级

Follow-up:

- 真实后端 docker-compose 联调（Deferred 维持）
- lint 消息级 e2e 断言（tooltip DOM 面，机会性）
- 端口 env 覆盖现状（R2 残留勘正）：XLANG_E2E_MOCK_PORT 仅 mock 服务器默认端口读取；webServer 条目/vite 代理/spec MOCK 常量仍为 4180 字面量——改端口须四处同步（行为默认正确，文本准确性修正）

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_ba3c6445（fresh session，R1）
- Verdict: revised（0B/4M/9m 全修订）
- Findings addressed: M1 evt.resumed{threadIds} 契约（缺省则面板永久挂起）；M2 compile fulfill 原始 body + `.cm-lintRange-error` 选择器（.cm-lintmarker 不存在）；M3 补 Scope 节 + typecheck/lint 门；M4 mock 面（getFrameVariables 桩/每连新 sessionId/StrictMode 容忍/renewIntervalMs=250）；m1-m9（initialSource 6 行/zh-CN label/matcher RegExp/fallback 措辞/checklist 工具不存在/flux logs 路径/全量口径）
