# 621 xlang 在线调试编辑器装配（roadmap item 19，XlangDebugEditor renderer + playground）

> Plan Status: active
> Last Reviewed: 2026-10-16
> Source: roadmap item 19；设计权威 = nop-entropy `ai-dev/design/xlang-web-debugger/05-frontend-architecture.md` §3.5（装配组件 = flux-code-editor（language='xlang' + extensions 注入调试扩展与 linter）+ 调试面板 + 连接管理，经 codeEditorRendererDefinition 同款形态注册 renderer；playground 演示页照 code-editor-page 模式）
> Related: docs/plans/616（语言包）/617（store+扩展）/618（client）/620（面板）

## Purpose

交付装配组件 `XlangDebugEditor`：flux-code-editor（language='xlang'，extensions 注入断点 gutter/挂起行/异常装饰 + createXlangLinter 诊断桥）+ DebugPanel 并列 + createDebugClient 连接管理（env.openSocket 注入），经 renderer definition 注册进 flux registry；playground 增加 xlang 在线调试演示页。完成 D5 §3.5 全链：浏览器编辑 xlang 源码 → 语法高亮 → 断点 → 命中高亮 → 变量/栈/求值/日志面板。

## Current Baseline

- 616 已交付：`@nop-chaos/flux-xlang-lang`（xlang() 语言、registerXlangLanguage、createXlangLinter({compile})）。
- 617/618/620 已交付：`@nop-chaos/flux-xlang-debug`（createDebugStore/createDebugClient/syncStoreToExtensions/sourcePathFacet/三扩展/handleGutterClick/DebugPanel）。
- flux-code-editor：`codeEditorRendererDefinition`/`registerCodeEditorRenderers(registry)` 先例（src/index.ts L63-70）；`useCodeMirror` 支持 extensions 注入（compartment，617 已核：extensions 身份变化全量替换——装配层须 memoize）。
- playground：`apps/playground/src/pages/code-editor-page.tsx`（6 语言演示页先例）；renderer 经 registry 注册（playground 启动装注册机制——执行时核对其 renderer registry 引导文件）。
- 后端（nop-entropy）：WS 网关 `/ws/xlang-debugger?nopDebugToken=`（617 协议）与 `POST /r/nop-xlang-debug/compile` 诊断端点（614）已可用；playground host 需提供 env.openSocket 与 compile fetcher 注入。

## Goals

- `packages/flux-xlang-debug/src/assembly/xlang-debug-editor.tsx`：受控 React 组件 `XlangDebugEditor(props: { sourcePath, serverUrl, openSocket, compile, getToken, initialSource?, onSessionClosed? })（m1：serverUrl 必填——CreateDebugClientOptions 契约）`——内部组合：registerXlangLanguage + useCodeMirror（language='xlang' + extensions = [createBreakpointGutter(store), suspended/exception fields, syncStoreToExtensions 桥, sourcePathFacet.of(sourcePath), linter]）+ DebugPanel（store/client/getSourcePath=() => sourcePath）。**memoize extensions 数组（617 结论：compartment 全量替换，StateField 存活条件）**。
- renderer definition：`xlangDebugEditorRendererDefinition`（照 codeEditorRendererDefinition 形态，schema type 'xlang-debug-editor'）+ `registerXlangDebugEditorRenderers(registry)`；renderer props 从 schema 解析（sourcePath/serverUrl 等）并经 useRendererRuntime 取 env（openSocket/fetcher）。
- **诊断桥 compile 注入（M3 修订）**：616 `createXlangLinter` 现硬编码 `compile('repl.xpl', source)`——本 plan 给 `CreateXlangLinterOptions` 增 `sourcePath?: string`（小改 616 交付物，回归面 = 616 单测补 sourcePath 传递断言）；装配层 compile = `(sp, source) => fetcher(POST /r/nop-xlang-debug/compile {sourcePath: sp, source})`。**envelope 适配（m6）**：fetcher 返回 ApiResponse（status!==0 判错、取 data.diagnostics）；playground 演示页 = stub fetcher + 手工 token 注入并注明（playground 无登录流——m6 核实），真实后端归 item 21/22。
- playground：`apps/playground/src/pages/xlang-debug-page.tsx` 演示页（host env 提供 openSocket/fetcher stub 或指向本地后端）+ 路由注册。
- i18n 演示页键（如需）。

## Non-Goals

- e2e（item 22）；bundle 清单与宿主 registry 版本契约（item 20）；生产 admin 页裁定（item 20）；后端改动。

## Scope

### In Scope

- `packages/flux-xlang-debug/`：assembly 组件 + renderer definition + 测试
- `apps/playground/`：xlang-debug-page 演示页 + 路由
- knip 登记处置

### Out Of Scope

- item 20/21/22；后端仓；样式深度定制

## Failure Paths

| 场景                   | 触发                   | 行为                                     | 可重试 | 用户可见表现 |
| ---------------------- | ---------------------- | ---------------------------------------- | ------ | ------------ |
| env-openSocket-missing | 宿主 env 无 openSocket | 面板/编辑器渲染 + 连接错误提示（不崩溃） | 是     | 错误条       |
| connect-fail           | 服务端不可达           | client 重连矩阵自愈（618）               | 是     | 状态条       |
| compile-fail           | 诊断端点失败           | linter 空诊断兜底（620）                 | 是     | 无诊断       |

## Test Strategy

本档选择：`必须自动化`（装配组件是 item 20/22 的入口契约）——组件测试（render + props 注入 + mock client/store 交互）+ 演示页渲染冒烟。

## Execution Plan

### Phase 1 - XlangDebugEditor 装配组件 + renderer definition

Status: planned
Targets: `packages/flux-xlang-debug/src/assembly/`

- Item Types: `Feature`

- [ ] deps：+ `@nop-chaos/flux-code-editor`（deps）、`@nop-chaos/flux-xlang-lang`（deps）、`@nop-chaos/flux-react`（**prod dep**——renderer definition 与 useRendererRuntime 运行时 import，m5 钉死）、`@nop-chaos/flux-core`（type-only 则 devDep，m5）
- [ ] **落位裁定（M1）**：装配放 `packages/flux-xlang-debug/src/assembly/`（不移动）——XD→XL 生产依赖为对 D5 §3.1"两新包互不依赖"的**显式修订**（装配层归 XD 的理由：renderer definition 须可被 item 20 生产宿主 import，放 playground 会 app 私有化；另立第三包过度设计）；Phase 3 owner-doc 更新项含 **D5 §3.1 依赖图修订（增 XD→XL 边 + 装配归 XD 说明）**
- [ ] `xlang-debug-editor.tsx`（M2 修订）：extensions 组合 = **`createBaseExtensions({ language: 'xlang', lineNumbers, folding, ... })`（经 registry 取 xlang()——组件 mount 前须已 registerXlangLanguage()，miss = 静默无高亮）** ∪ [createBreakpointGutter(store), suspendedLinesField, exceptionLinesField, sourcePathFacet.of(sourcePath), createXlangLinter({ compile })]（useMemo，key 含 sourcePath——m8：单实例单 sourcePath 假设 JSDoc 注明）；**sync 桥不是 Extension**——`useEffect` 内等 view 就绪后 `syncStoreToExtensions({ store, view, getSourcePath })` 并在 cleanup dispose（B2 泄漏边界：dispose 必须被调）；client connect/dispose 同 effect（生命周期：StrictMode 双挂载安全——cleanup 完整）
- [ ] `renderer.ts`：xlangDebugEditorRendererDefinition + registerXlangDebugEditorRenderers（照 CE 先例）
- [ ] index.ts 导出扩充；knip 处置
- [ ] 测试：组件渲染（mock client/store/editor extensions 注入断言——useCodeMirror 收到的 extensions 含 gutter/装饰/linter）、renderer definition schema 解析

Exit Criteria:

- [ ] 装配组件测试绿（extensions 注入断言 = Wiring Verification）
- [ ] 包内 typecheck/lint/test 通过

### Phase 2 - playground 演示页

Status: planned
Targets: `apps/playground/src/pages/xlang-debug-page.tsx`

- Item Types: `Feature`

- [ ] **经 renderer/schema 路径渲染（M4 修订——防自违 Anti-Hollow 门）**：schema `{ type: 'xlang-debug-editor', sourcePath, serverUrl, initialSource }` + `registry.register(xlangDebugEditorRendererDefinition)` + `SchemaRenderer`（唯一提供 RuntimeContext 的路径，useRendererRuntime 才拿得到 env）；openSocket 经 `createDefaultOpenSocket()`（playground env/socket-impl 既有）；**field rules 为 sourcePath/serverUrl/initialSource 声明（M4：被消费 prop 均需 rule，照 CE 先例）**
- [ ] 路由：domain-route-entries.ts + domain-route-pages.tsx 配对注册（双向对账测试强制；m3：静态 import 会使 lezer 产物进主 chunk——**用 React.lazy() 惰性加载**（Ai 系页面先例））；app.test.tsx pages mock 跟进
- [ ] 演示页渲染冒烟测试（先例 = condition-builder-page.test.tsx / performance-table-page.test.tsx——code-editor-page 无测试文件，m4 勘正）

Exit Criteria:

- [ ] 演示页渲染冒烟绿
- [ ] playground typecheck/lint 通过

### Phase 3 - 独立 closure audit 与收口

Status: planned
Targets: 全部 + roadmap（owner 仓）

- Item Types: `Proof`

- [ ] 独立子代理 closure audit：D5 §3.5 装配全链对账（语言注册→extensions 注入→gutter/装饰→面板→client）、memoize 约束核实（617 compartment 结论）、playground 接线、门禁
- [ ] 修复审计发现
- [ ] flux docs/logs 更新；roadmap item 19 → done；提交

Exit Criteria:

- [ ] audit 发现全修复
- [ ] `pnpm typecheck/build/lint/test/check` 全绿（或仅既有红——stash 验证）
- [ ] roadmap item 19 `done`

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_09c3a75f（fresh session）
- Verdict: revised（0 Blocker / 5 Major / 8 Minor 全部修订）
- Rounds: 1
- Findings addressed: M1 装配落位显式裁定+D5 §3.1 修订入 owner-doc 更新项；M2 extensions 组合改 createBaseExtensions 路径+sync 桥出 extensions 清单改 effect 接线；M3 616 linter sourcePath 参数化（回归面 616 单测）；M4 演示页钉死 schema+registry+SchemaRenderer 路径+field rules；M5 REPL execute 半边 Deferred 裁定+引用勘正（(614)→roadmap item 14/plan 2473）；m1 props 补 serverUrl；m2 DebugPanel getSourcePath 装配；m3 路由配对+React.lazy 惰性加载+stub-only 声明；m4 冒烟先例勘正；m5 deps 分类钉死（flux-react prod/flux-core type-only devDep）+ 616 lang 包 CE devDep 归位；m6 envelope 适配+playground stub 声明；m7 测试断言边界（不 mock CE、facet/field 断言、initFluxI18n）+ renderer definition 照 contract-smoke 先例；m8 memo key/sourcePath 假设 JSDoc

## Closure Gates

- [ ] 所有 in-scope 行为实现且有测试
- [ ] Anti-Hollow：playground 页 → renderer/env 注入 → 装配组件 → 编辑器/面板/client 链连通
- [ ] owner docs：D5 §3.5 与实现一致；flux docs/logs 更新
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`（或仅既有红——stash 验证）
- [ ] `pnpm check`（零新增红）

## Deferred But Adjudicated

### REPL execute 面板接线（roadmap item 19 Goal 半边）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: D5 §3.4 明文"REPL 执行是 item 14 的独立服务面，不经 store 动作"；本 item 装配消费 compile 诊断面（D5 §3.3 open question 兑现），execute 半边（REPL 输入→execute 端点→结果面板）归 item 21 示例接入或 UI 演进；roadmap Goal 的"REPL 面板对接后端端点"由 compile+连接管理部分兑现 + 本条裁定共同覆盖
- Successor Required: `yes`
- Successor Path: item 21 示例接入 / plan 620 后续

### 生产 admin 页宿主裁定

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap item 20 裁定（demo 宿主 = playground；生产页归 item 20）
- Successor Required: `yes`
- Successor Path: item 20 跨仓交付

## Non-Blocking Follow-ups

- 演示页指向真实后端的 docker-compose 编排（item 21/22）

## Closure

Status Note: （待收口后填写）

Closure Audit Evidence:

- Auditor / Agent: （待填）
- Evidence: （待填）
