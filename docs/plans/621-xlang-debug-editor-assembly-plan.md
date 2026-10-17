# 621 xlang 在线调试编辑器装配（roadmap item 19，XlangDebugEditor renderer + playground）

> Plan Status: completed
> Last Reviewed: 2026-10-18
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

Status: completed
Targets: `packages/flux-xlang-debug/src/assembly/`

- Item Types: `Feature`

- [x] deps：+ `@nop-chaos/flux-code-editor`（deps）、`@nop-chaos/flux-xlang-lang`（deps）、`@nop-chaos/flux-react`（**prod dep**——renderer definition 与 useRendererRuntime 运行时 import，m5 钉死）、`@nop-chaos/flux-core`（type-only 则 devDep，m5）
- [x] **落位裁定（M1）**：装配放 `packages/flux-xlang-debug/src/assembly/`（不移动）——XD→XL 生产依赖为对 D5 §3.1"两新包互不依赖"的**显式修订**（装配层归 XD 的理由：renderer definition 须可被 item 20 生产宿主 import，放 playground 会 app 私有化；另立第三包过度设计）；Phase 3 owner-doc 更新项含 **D5 §3.1 依赖图修订（增 XD→XL 边 + 装配归 XD 说明）**
- [x] `xlang-debug-editor.tsx`（M2 修订）：extensions 组合 = **`createBaseExtensions({ language: 'xlang', lineNumbers, folding, ... })`（经 registry 取 xlang()——组件 mount 前须已 registerXlangLanguage()，miss = 静默无高亮）** ∪ [createBreakpointGutter(store), suspendedLinesField, exceptionLinesField, sourcePathFacet.of(sourcePath), createXlangLinter({ compile })]（useMemo，key 含 sourcePath——m8：单实例单 sourcePath 假设 JSDoc 注明）；**sync 桥不是 Extension**——`useEffect` 内等 view 就绪后 `syncStoreToExtensions({ store, view, getSourcePath })` 并在 cleanup dispose（B2 泄漏边界：dispose 必须被调）；client connect/dispose 同 effect（生命周期：StrictMode 双挂载安全——cleanup 完整）
- [x] `renderer.ts`：xlangDebugEditorRendererDefinition + registerXlangDebugEditorRenderers（照 CE 先例）
- [x] index.ts 导出扩充；knip 处置
- [x] 测试：组件渲染（mock client/store/editor extensions 注入断言——useCodeMirror 收到的 extensions 含 gutter/装饰/linter）、renderer definition schema 解析

Exit Criteria:

- [x] 装配组件测试绿（extensions 注入断言 = Wiring Verification）——assembly.test 3 用例（vi.mock CE 捕获 extensions ≥5 含语言/gutter/装饰/facet/linter + 幂等注册 + DOM 结构；良性假连接消未处理拒绝）
- [x] 包内 typecheck/lint/test 通过

### Phase 2 - playground 演示页

Status: completed
Targets: `apps/playground/src/pages/xlang-debug-page.tsx`

- Item Types: `Feature`

- [x] **经 renderer/schema 路径渲染（M4 修订——防自违 Anti-Hollow 门）**：schema `{ type: 'xlang-debug-editor', sourcePath, serverUrl, initialSource }` + `registry.register(xlangDebugEditorRendererDefinition)` + `SchemaRenderer`（唯一提供 RuntimeContext 的路径，useRendererRuntime 才拿得到 env）；openSocket 经 `createDefaultOpenSocket()`（playground env/socket-impl 既有）；**field rules 为 sourcePath/serverUrl/initialSource 声明（M4：被消费 prop 均需 rule，照 CE 先例）**——执行补记：registry 另需 `registerBasicRenderers`（'page' 容器 renderer 属 flux-renderers-basic，只注册 xlang-debug-editor 时 page schema 不解析——冒烟测试抓住并修复，照 code-editor-page 注册先例）
- [x] 路由：domain-route-entries.ts + domain-route-pages.tsx 配对注册（双向对账测试强制；m3：静态 import 会使 lezer 产物进主 chunk——**用 React.lazy() 惰性加载**（Ai 系页面先例））；app.test.tsx pages mock 跟进——执行裁定：**无需 mock**（lazy 化后 app.test 模块图不再含 xlang-debug-page，Ai 系 lazy 页同样不 mock；app.test/app-route-resilience 实测 7/7 绿）；补 home-families.ts `DOMAIN_HOME_FAMILY['xlang-debug']='diagnostics'`（route-matrix drift guard 红修复——路由已登记但 family 缺失致 invariant 1/2 红）
- [x] 演示页渲染冒烟测试（先例 = condition-builder-page.test.tsx / performance-table-page.test.tsx——code-editor-page 无测试文件，m4 勘正）——`xlang-debug-page.test.tsx` 2 用例（token gate + 连接后 schema→registry→SchemaRenderer→装配组件 wiring，mock 边界同 assembly.test：CE 传输面/socket-impl 假连接）

Exit Criteria:

- [x] 演示页渲染冒烟绿（xlang-debug-page 2/2；domain-route-pages + route-matrix + app 级 54+7 全绿）
- [x] playground typecheck/lint 通过（typecheck 仅 2 个既有 vite.config 红——与 46799d3be 提交 stash 验证口径一致；lint 0）

### Phase 3 - 独立 closure audit 与收口

Status: completed
Targets: 全部 + roadmap（owner 仓）

- Item Types: `Proof`

- [x] 独立子代理 closure audit：D5 §3.5 装配全链对账（语言注册→extensions 注入→gutter/装饰→面板→client）、memoize 约束核实（617 compartment 结论）、playground 接线、门禁——R1（agent_7d93827f，fresh session，verdict **issues**：1B/4M/4m，九维度 A-I 两 FAIL 三 PARTIAL）
  - **B1 Blocker 断点下行链死**：装配 extensions 缺 `breakpointsField`——gutter lineMarker 读 `field(breakpointsField,false)` 恒 undefined，标记永不渲染；617 测试手动构造 state 掩盖、621 两测试 mock useCodeMirror 双重掩盖
  - **B2 M3 承诺未实现**：`CreateXlangLinterOptions.sourcePath` 缺失，linter 硬编码 `'repl.xpl'`——诊断永远按错误文档锚点编译
  - **B3 StrictMode 静默不连接**：dispose 永久闩锁 + connect 早退静默 resolve——demo 宿主 main.tsx 包 StrictMode，首连接永不发生
  - **B4 token 双注入**：client 空 token 拼 `?nopDebugToken=` + demo 页 wrapper 追加第二参——servlet 首值语义取空 → 4401
  - **B5 装配测试无判别力**：仅 `length≥5`——移除任一调试扩展仍绿（B1 因此不可见）
  - minors：B6 opener 同步抛错走未处理拒绝（Failure Paths 契约不完整）/B7 field rules 缺 required/B8 DebugPanel.getSourcePath 声明未消费（620 残留）/B9 browserOpenSocket 零消费导出
- [x] 修复审计发现——B1：`breakpointsField` 入装配 memoized 数组（含注释）+ 三字段逐个判别断言（`toContain` 单例）+ 真实 EditorState 消费（facet 值/字段注册断言）；B2：diagnostics.ts `sourcePath` 参数化（缺省 'repl.xpl' 保持 REPL 语义）+ 装配传 sourcePath + lang 包 2 用例（传递/缺省，EditorView+forceLinting 实跑）+ 装配层 linter 捕获断言；B3：connect() dispose 复活语义（复位闩锁+重连退避，stopped 终态不复活）+ 3 用例（复活重连/authFailed 不复活/openSocket-missing 契约修订为终态回调呈现）；B4：空 token 不拼参数（单注入点归宿主包装层）+ URL 判别用例；B5：装配测试判别化重写（vi.mock 提升变换下跨工厂边界共享 vi.fn 的 mock.calls 两侧不一致——捕获面改 plain 数据容器，实测踩坑记录在案）；B6：opener 同步抛错 → 终态 onSessionClosed（detail 携带错误信息）不进重连矩阵 + 用例；B7：sourcePath/serverUrl `required: true`；B8：DebugPanelProps.getSourcePath 摘除（接口+装配点）；B9：browserOpenSocket 零消费导出摘除（index.ts+实现）
- [x] **R2 复审（同审计线 agent_7d93827f，verdict issues→窄口径：R1 九项全数确认修复，B1 双重回归钉/B2 实跑 forceLinting/B3 双向闩锁测试/B5 hoisted 容器重构均判 sound）**——新发现 N1（Major，门禁矛盾）：修复残留 3 处未用变量致 flux-xlang-debug 包 lint 红（WebSocketConnection 死类型导入/EditorView 死导入/url 参数未下划线）→ 三处一行修复，复测 lint exit 0 + 39/39 保持；N2（Minor，非阻塞观察）登记 Non-Blocking Follow-ups
- [x] flux docs/logs 更新；roadmap item 19 → done；提交

Exit Criteria:

- [x] audit 发现全修复（R1 9/9 + R2 N1 全部落位，R2 逐项 PASS 判定）
- [x] `pnpm typecheck/build/lint/test/check` 全绿（或仅既有红——stash 验证）：debug 39/39、lang 10/10、playground 定向 61/61、typecheck 仅 2 既有 vite.config 红（46799d3be stash 验证口径）、debug 包 lint 0（R2 N1 修复后复测）、check exit 0、双包 build 绿（playground build 同一既有 vite.config 红）
- [x] roadmap item 19 `done`

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_09c3a75f（fresh session）
- Verdict: revised（0 Blocker / 5 Major / 8 Minor 全部修订）
- Rounds: 1
- Findings addressed: M1 装配落位显式裁定+D5 §3.1 修订入 owner-doc 更新项；M2 extensions 组合改 createBaseExtensions 路径+sync 桥出 extensions 清单改 effect 接线；M3 616 linter sourcePath 参数化（回归面 616 单测）；M4 演示页钉死 schema+registry+SchemaRenderer 路径+field rules；M5 REPL execute 半边 Deferred 裁定+引用勘正（(614)→roadmap item 14/plan 2473）；m1 props 补 serverUrl；m2 DebugPanel getSourcePath 装配；m3 路由配对+React.lazy 惰性加载+stub-only 声明；m4 冒烟先例勘正；m5 deps 分类钉死（flux-react prod/flux-core type-only devDep）+ 616 lang 包 CE devDep 归位；m6 envelope 适配+playground stub 声明；m7 测试断言边界（不 mock CE、facet/field 断言、initFluxI18n）+ renderer definition 照 contract-smoke 先例；m8 memo key/sourcePath 假设 JSDoc

## Closure Gates

- [x] 所有 in-scope 行为实现且有测试（装配链/extensions 注入/client 生命周期/renderer 契约/playground 接线——B1-B9 修复均带判别测试）
- [x] Anti-Hollow：playground 页 → renderer/env 注入 → 装配组件 → 编辑器/面板/client 链连通（xlang-debug-page.test 连接后 `[data-testid="xlang-debug-editor"]` 只能经 schema→registry→SchemaRenderer→definition 出现；装配三字段经真实 EditorState 消费验证）
- [x] owner docs：D5 §3.1（XD→XL 边 + 装配归 XD 修订）与 §3.5（as-built 装配形态）已更新；flux docs/logs 已更新
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（R1 agent_7d93827f issues→修复；R2 同线复审九项全 PASS + N1 修复复测）
- [x] `pnpm typecheck`（playground 仅 2 既有 vite.config 红——46799d3be stash 验证口径；两包 typecheck 绿）
- [x] `pnpm build`（双包绿；playground 同一既有 vite.config 红）
- [x] `pnpm lint`（debug 包 0——R2 N1 修复后复测；playground 0；lang 0）
- [x] `pnpm test`（定向全绿：debug 39/39、lang 10/10、playground 61/61；仓库级仅既有红——check-scanner-baselines.test 内联钉数过期，HEAD 干净 worktree 实证 240/723/108 与 621 diff 无关）
- [x] `pnpm check`（exit 0——metamodel whitelist 行锚 440→446 重对齐为同命中锚定修正，非新增豁免）

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
- **N2（R2 审计观察，watch-only residual）**：direct-API dispose(connected)→revive 路径可对已销毁会话循环 rebind——dispose 已发 session.close 但保留 currentSessionId，revive 重开新会话后 rebind 旧 id，rebind catch 对非 BOUND_ELSEWHERE 错误一律 scheduleReconnect（15s 上限退避、无次数上限）。**shipped 装配不可达**（effect 重跑换 client 实例；StrictMode 周期 dispose 发生在 session 建立前）；属既有 rebind-catch 语义被 revive 放宽了触达面。归 item 24 并发/会话隔离深审消化（bound rebind 重试或 session-not-found 类错误采纳过渡会话）。

## Closure

Status Note: item 19（REPL 面板 + 编辑器装配）全链收口——Phase 1 装配组件/renderer definition、Phase 2 playground 演示页（schema→registry→SchemaRenderer 路径 + lazy 路由 + home 家族）、Phase 3 两轮独立审计（R1 1B/4M/4m 全修复，R2 九项全数确认 + N1 门禁矛盾修复后 approved 口径达成）。D5 §3.5 断点调试全链在装配层真实连通（B1 断点下行 StateField 缺位为 R1 抓获的空壳装配，修复后三族字段经真实 EditorState 判别钉验证）。
Completed: 2026-10-18

Closure Audit Evidence:

- Reviewer / Agent: 独立子代理 agent_7d93827f（fresh session；R1 issues 1B/4M/4m → 修复 → R2 同线复审）
- Audit Session: agent_7d93827f-7aec-4c68-b8f0-b1e8c3171b9b
- Evidence:
  - R1 逐项（B1-B9）R2 判定全 PASS，file:line 证据见 R2 复审记录（B1: xlang-debug-editor.tsx:100 + assembly.test toContain/EditorState 双重回归钉；B2: diagnostics.ts:24/52/60 + language.test 实跑 forceLinting；B3: connect() revive + 双向闩锁用例；B4: 空 token URL 判别用例；B5: hoisted plain 容器 + 判别断言组；B6: 终态回调契约 + 无重连风暴实证；B7/B8/B9 摘除面 grep 零残留）
  - 门禁实测（R2 审计亲跑 + N1 修复后复测）：debug 39/39、lang 10/10、playground 61/61、debug lint exit 0、check exit 0、双包 build/typecheck 绿
  - Anti-Hollow：playground 页→definition→装配链连通由页面测试承载（data-testid 仅能经 schema 路径出现）
  - 既有红披露与核实：playground typecheck 2 红（vite.config，stash 验证）；check-scanner-baselines.test 内联钉数过期（HEAD 干净 worktree 实证与 621 diff 无关）；metamodel whitelist 行锚重对齐（同命中，非新增）
- Deferred 项分类检查：REPL execute 半边→item 21（D5 §3.4 依据成立）；生产 admin 页→item 20（D5 §3.5 依据成立）；N2→item 24 深审消化——无 in-scope live defect 被降级

Follow-up:

- 演示页真实后端 docker-compose 编排（item 21/22）
- N2 rebind 复活循环观察项 → item 24 深审
- no remaining plan-owned work
