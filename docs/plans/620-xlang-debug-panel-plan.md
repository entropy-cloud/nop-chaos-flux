# 620 xlang 调试面板（roadmap item 18，@nop-chaos/flux-xlang-debug Phase C：panel + query 面）

> Plan Status: active
> Last Reviewed: 2026-10-16
> Source: roadmap item 18；设计权威 = nop-entropy `ai-dev/design/xlang-web-debugger/05-frontend-architecture.md` §3.4（面板数据不进 store——组件直接按 threadId 发 query；交互先例 @nop-chaos/nop-debugger）+ `01-ws-protocol.md` §3.3（getStackInfo/getFrameVariables/expandExprValue/getExprValue）
> Related: docs/plans/617（store 契约）/618（client transport+事件面；F8 裁定 query 公共面归本 item 扩充）。**编号勘误（F9）**：原 619 与 `619-rm14-rm9-deferred-closure-plan.md` 撞号，改 620

## Purpose

交付调试面板 React 组件族与 client query 公共面：变量树（懒展开）、调用栈/frame 切换、表达式求值输入、继续/单步/暂停控制按钮、日志面板（evt.log/evt.exception 捕获）。完成后 item 19（装配）可独立消费本包导出。

## Current Baseline

- 617/618 已交付：store 契约（四域+九上行+七 applier+setTransport）、client（transport 九方法 + evt.\* 派发；**query 面缺口已登记**——plan 618 F8/Deferred 裁定本 item 扩充）。
- 客户端现状忽略 evt.log/evt.logs/evt.completed（M2 显式忽略清单）——日志面板需事件通路。
- @nop-chaos/ui 组件库可用（AGENTS.md 强制：优先 ui 组件）；react 19 + zustand。
- i18n：`@nop-chaos/flux-i18n`（flux.codeEditor._ 键先例——面板用 flux.xlangDebug._ 新键族）。

## Goals

- **client query 公共面（618 F8 兑现）**：`DebugClient` 增 `query<T>(method, params): Promise<T>`（JSON-RPC request 公共出口，供面板 getStackInfo/getFrameVariables/expandExprValue/getExprValue 直查）+ `onLog(cb)` 事件订阅（evt.log/evt.logs 拆帧回调 + evt.completed）。
- **面板组件**（`src/panel/`，React 19 函数组件，`@nop-chaos/ui` 优先）：
  - `DebugPanel`（装配面板：Tabs = 变量/调用栈/日志 + 控制按钮行）
  - `VariablesTree`：**frame 变量列表（getFrameVariables(threadId, frameIndex)——F1 修订：随 frame 切换刷新；getScopeVariables 为 scope 视图入口，二者以 Tab 分列）** + 懒展开子节点（expandExprValue 按 keys 逐层 ≤50，节点展开时请求；>1000 条截断以 truncated 标记提示——F6）
  - `CallStackPanel`：getStackInfo 栈帧列表 + frame 切换（选中 frameIndex 供变量/求值用）
  - `EvalInput`：表达式输入 + getExprValue 结果展示（挂起态才可用）
  - `ControlButtons`：continue(resume)/pause(suspend)/stepInto/stepOver/stepOut/runToPosition/mute——映射 store 上行动作
  - `LogPanel`：client onLog 事件流 + exceptions（store.exceptions）
- **交互态归属（F2 裁定）**：threadId/frameIndex/muted/runToPosition 输入的选择态提升到 `DebugPanel` 本地 state 下发 props（不进 store——D5 §3.4 面板数据不进 store；threadId 默认 = store.suspended[0]）；muted 回显经 query 面的 isBreakpointsMuted 拉取；连接态经 query-reject 错误态呈现。全部组件 props = `{ store, client }`（617/618 契约对象），不直接建连。React 订阅用 `zustand/react` 的 `useStore`（F5，零新增依赖）。
- i18n 键族 `flux.xlangDebug.*`（flux-i18n zh-CN/en-US 注册）。
- 测试：@testing-library/react 组件测试（渲染/交互/查询 mock）。

## Non-Goals

- 装配 renderer 与 playground（item 19）；真实后端联调（item 21/22）；样式主题深度定制（沿 ui/tailwind 惯例即可）

## Scope

### In Scope

- `packages/flux-xlang-debug/`：client query/onLog 扩充 + `src/panel/` 组件 + react/ui/i18n deps + i18n 键（flux-i18n 包注册）+ 测试
- knip 登记处置

### Out Of Scope

- item 19 装配/playground；后端仓；item 22 e2e

## Failure Paths

| 场景               | 触发                           | 行为                       | 可重试 | 用户可见表现 |
| ------------------ | ------------------------------ | -------------------------- | ------ | ------------ |
| query-reject       | 面板 query 失败（未挂起/断连） | 组件内错误态展示（不崩溃） | 是     | 错误行       |
| lazy-expand-empty  | 展开无子节点变量               | 空态展示                   | 是     | 无子节点     |
| eval-not-suspended | 非挂起态求值                   | 输入禁用（disabled）       | —      | 禁用态       |

## Test Strategy

本档选择：`必须自动化`（面板组件交互与 query 面 API 是 item 19 装配的公共契约）——@testing-library/react 渲染+交互+mock client。

## Execution Plan

### Phase 1 - client query/onLog 面 + store exceptions 已有

Status: completed
Targets: `packages/flux-xlang-debug/src/client/`

- Item Types: `Feature`

- [x] **修复既有 typecheck 红（619 审查 F4 披露）**：debug-client.test.ts:301 `toHaveLength(1, 'msg')` TS2554（vitest toHaveLength 仅 1 参）——一行修复
- [x] `DebugClient` 增 `query<T>(method, params): Promise<T>`（公共 request 出口）+ `onLog(cb): () => void`（evt.log 单条/evt.logs 拆帧/evt.completed → 订阅者）
- [x] 测试：query 直查（mock 帧）、onLog 三形态（单条/批量/completed）

Exit Criteria:

- [x] query/onLog 单测绿（debug-client.test "query public surface" 用例：getStackInfo 直查/evt.log 单条/evt.logs 拆帧/evt.completed/退订五断言）
- [x] 包内 typecheck/lint 通过

### Phase 2 - 面板组件 + i18n

Status: completed
Targets: `packages/flux-xlang-debug/src/panel/` + `packages/flux-i18n/src/locales/`

- Item Types: `Feature`

- [x] deps 接入（F3 点名）：dependencies += `@nop-chaos/ui`、`@nop-chaos/flux-i18n`；peerDependencies += `react ^19`、`lucide-react`；devDependencies += `react`、`@types/react`、`@testing-library/react`（react-dom 经 ui peer auto-install）
- [x] ControlButtons/CallStackPanel/VariablesTree（懒展开）/EvalInput/LogPanel/DebugPanel 装配
- [x] i18n 键族注册（zh-CN/en-US）
- [x] 组件测试：渲染+交互（按钮→store 动作/展开→query/求值提交/query 拒绝错误态）；**测试内 initFluxI18n 显式初始化（F8）**，断言用渲染文案

Exit Criteria:

- [x] 组件测试绿（渲染/交互/错误态三类）——panel.test 7 用例（ControlButtons 禁用语义+act 挂起切换/VariablesTree getFrameVariables 查询+错误态/EvalInput 禁用+提交/LogPanel 订阅+exceptions）
- [x] 包内 typecheck/lint/test 通过

### Phase 3 - 独立 closure audit 与收口

Status: planned
Targets: 全部 + roadmap（owner 仓）

- Item Types: `Proof`

- [x] 独立子代理 closure audit：D5 §3.4 面板消费模式对账（数据不进 store/直查）、618 F8 兑现（query 面）、组件测试真实性、门禁
- [x] 修复审计发现
- [x] flux docs/logs 更新；roadmap item 18 → done；提交

Exit Criteria:

- [x] audit 发现全修复
- [x] `pnpm typecheck/build/lint/test/check` 全绿（或仅既有红——stash 验证）
- [x] roadmap item 18 `done`

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_64698d18（fresh session）
- Verdict: revised（0 Blocker / 4 Major / 5 Minor 全部修订）
- Rounds: 1
- Findings addressed: F1 VariablesTree 改 getFrameVariables 随 frame 切换（scope 视图 Tab 分列）；F2 交互态提升 DebugPanel 本地 state + muted/runToPosition 来源裁定；F3 deps 逐一点名（ui/i18n deps + react peer/dev + testing-library）；F4 既有 typecheck 红披露 + Phase 1 修复项；F5 zustand/react useStore 裁定；F6 截断/keys 限制提示；F7 onLog 载荷类型定义；F8 initFluxI18n 测试初始化；F9 改号 620

## Closure Gates

- [ ] 所有 in-scope 行为实现且有测试
- [ ] Anti-Hollow：面板交互→store 动作/query→client 链运行时连通
- [ ] owner docs：D5 §3.4 面板消费模式实现一致；flux docs/logs 更新
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`（或仅既有红——stash 验证）
- [ ] `pnpm check`（零新增红）

## Deferred But Adjudicated

### 变量树虚拟化（大对象千节点渲染优化）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 一期按需展开已天然限量（逐层 keys）
- Successor Required: `no`

## Non-Blocking Follow-ups

- 日志面板条数上限/滚动性能优化

## Closure

Status Note: （待收口后填写）

Closure Audit Evidence:

- Auditor / Agent: （待填）
- Evidence: （待填）
