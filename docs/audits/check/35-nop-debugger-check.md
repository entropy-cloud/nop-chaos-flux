# 35 nop-debugger 实现代码检查报告

- 检查日期：2026-08-20
- 检查范围：`packages/nop-debugger/src/` 全部 25 个非测试源文件（约 7,037 行，不含 `*.test.*` / `*.test-support.*`），精读 24 个（controller / store / adapters / automation / controller-helpers / controller-component-inspector / diagnostics-core / diagnostics / diagnostics-failures / explanations / explanations-failure-async / redaction / panel.tsx / panel 全部子模块 / types / types-explanations / index / test-setup），`panel/styles-css.ts`（纯 CSS 字符串常量）抽查结构与行高相关段落。精读覆盖率约 96%（按文件数），观察点/快照/事件采集链路（store.append → plugin/env 装饰 → 派生计算 → 面板渲染）100% 精读。
- 消费者核查：本包唯一消费者是 `apps/playground`（`apps/playground/src/App.tsx:2,149,381`；多个 page 传入 controller 类型）。renderer 包与 flux-react 均不依赖本包。
- 结论概览：**P0 x1 / P1 x3 / P2 x5 / P3 x7**
  - 总评：包整体工程质量较高（无 `as any`/`@ts-ignore`、监听器清理完备、`sideEffects:false`、私有包不进生产链路、有事件环缓冲与节流意识），但存在一个系统性缺陷——`render:*` 与 `action:end` 事件在全仓**没有任何生产发射端**，导致面板核心诊断指标（最近动作、渲染性能、渲染过滤器）永久性显示错误/空白，且被测试直接注入假事件掩盖；其次是调试器与宿主之间双向缺乏隔离（无错误边界 + 采集路径无防御性 try/catch），以及面板在关闭状态下对每个事件做全量派生计算的开销问题。无时间旅行实现（`state:snapshot` 仅追加展示，无恢复路径），该缺陷面不存在。

## P0 缺陷

### F-01 `render:*` / `action:end` 事件无生产发射端，面板核心指标永久错误显示（D1 正确性 + D2 契约）

**证据**：

1. 本包唯一的事件采集端是 `createDebuggerPlugin`（compile:start/end、action:start、error）与 `decorateDebuggerEnv` 的 fetcher 包装（api:start/end/abort）、notify、以及 controller 的 `state:snapshot`/`onActionError`。`adapters.ts:68-85`（beforeAction 只发 `action:start`）：

```ts
    beforeAction(action, ctx) {
      if (!enabled) {
        return action;
      }
      store.append({
        kind: 'action:start',
        ...
```

2. `flux-core` 的 `RendererPlugin` 契约（`packages/flux-core/src/types/renderer-plugin.ts:7-15`）只有 `beforeCompile / afterCompile / wrapComponent / beforeAction / onError` —— 没有 afterAction / render 钩子，且本包未实现 `wrapComponent`。
3. 全仓 grep `'render:start'|'render:end'|'action:end'`：除本包 types/store/测试外，仅 `flux-i18n` 的文案键（"尚未捕获 render:end 事件"）出现；`flux-react`/`flux-runtime` 无任何发射代码。
4. 但消费端按这些 kind 计算：`diagnostics-core.ts:190,219,225-228`：

```ts
  const latestByKind = (kind: NopDebugEventKind) => events.find((event) => event.kind === kind);
  ...
    latestCompile: latestByKind('compile:end'),
    latestAction: latestByKind('action:end'),
    ...
    renderCommitCount: renderEndEvents.length,
    renderBurstCount: renderStartEvents.length,
```

5. `overview-tab.tsx:36-44` 直接展示 `overview.latestAction`；`node-tab.tsx:329-352` 的渲染性能卡片依赖 `kind === 'render:end'` 的事件，永远不渲染；`timeline` 默认过滤器含 `render` 组（`diagnostics-core.ts:13-21`），该 chip 永远过滤不出任何事件。
6. 掩盖证据：`store.ts:140-146` 的 render:start 节流、`diagnostics.test.ts:152` 等测试**直接手工 append** `action:end` / `render:end` 事件，单测全绿但生产链路永远不产生这些事件。

**推理链（输入→路径→错误结果）**：用户在 playground 触发任意动作（如提交表单）→ `plugin.beforeAction` 追加 `kind:'action:start'` → 概览计算 `latestByKind('action:end')` 永远 `undefined` → Overview「最近动作」恒显示「无」（i18n `notAvailable`）、「渲染提交提示」卡片恒显示「尚未捕获 render:end 事件」、节点页渲染性能区块永不出现。调试器对其两大核心观测维度（动作完成、渲染性能）给出**确定性错误输出**，用户会被误导认为无动作发生/无渲染。

**影响**：面板概览页与节点页的渲染/动作指标全部失真；`slowestRenderMs`、`renderUniqueNodeCount` 等自动化 API 字段恒为空；诊断结论系统性偏差。

**修复方向**：三选一（按代价递增）：(a) `buildOverview` 回退到 `action:start`（`'action:end' ?? 'action:start'`）并注明语义；(b) 在 plugin 中实现 `wrapComponent` 捕获 render:start/end（`durationMs` 需在 render:end 记录）；(c) 扩展 `flux-core` 的 `RendererPlugin` 契约增加 afterAction/render 钩子并由 flux-react 调用。同时补一条"端到端（经 plugin 真实管线）事件存在性"测试，防止测试直接注入掩盖契约断裂。

## P1 隐患

### F-02 面板在关闭/最小化状态下，每个事件都对全量事件数组执行全部派生计算（D6 性能）

**证据**：`panel.tsx:235-261` 的全部派生计算位于早退分支（`:299 !chrome.enabled`、`:303 !chrome.panelOpen`、`:337 chrome.minimized`）**之前**：

```ts
  const filteredEvents = events.filter((event) => filters.includes(event.group));
  const searchedEvents = ...
  const networkEvents = filteredEvents.filter((event) => event.group === 'api');
  const mergedRequests = mergeNetworkRequests(networkEvents);
  const errorGroups = groupErrors(events);
  const overview = buildOverview(events);
  const latestTrace = (() => {
    void events;
    return props.controller.createDiagnosticReport({ eventLimit: 20, ... })
```

`useDebuggerSnapshot(controller, (s) => s.events)`（`:172`）在每次 append 后（store 以 microtask 批量 notify，`store.ts:58-66`）返回新数组引用触发整面板重渲染。`createDiagnosticReport` 内部（`diagnostics.ts:38`）还会**再算一次** `buildOverview`；`buildInteractionTrace` 对事件做多次全表扫描。

**条件与后果**：playground 默认 `enabled:true, defaultOpen:false`（`App.tsx:140-146`）——即面板关闭只剩 launcher 时，任意 compile/action/api 事件仍触发对 ≤400 条事件的 6+ 轮全量过滤、分组、网络合并、trace 推断。调试器成为被调试应用的常驻 CPU 开销，且事件越密集（高频交互/大环缓冲）放大越明显；launcher 只需要 `events.length` 和 `errorCount` 两个数字。`void events`（`:250`）表明作者曾与 React Compiler 的自动 memo 博弈，但 memo 也无法避免 events 引用每次变化后的全量重算。

**修复方向**：把派生计算下沉到各 Tab 子组件（仅挂载的 `TabsContent` 计算，Radix Tabs 默认非激活内容不挂载）；launcher/minimized 分支只订阅 `events.length`/`errorCount`（selector 返回原始值）；`createDiagnosticReport` 接受外部已算好的 overview 或做引用缓存。

### F-03 面板无错误边界，且存在今天即可触发的抛错路径（JSON.stringify 循环引用），调试器异常将击穿宿主应用（D5 隔离）

**证据**：grep `componentDidCatch|ErrorBoundary|getDerivedStateFromError` 在本包与 `apps/playground` 的挂载点均为 0 处。`App.tsx:378-383` 内联挂载：

```tsx
return (
  <div className="nop-theme-root">
    <Suspense fallback={<PageFallback />}>{renderPage(route, navigate)}</Suspense>
    <NopDebuggerPanel controller={debuggerController} />
  </div>
);
```

确定性可触发路径：`panel.tsx:224-233` 表达式求值器对**用户任意输入的公式**的求值结果直接 `JSON.stringify(evaluated.value, null, 2)`——公式可以引用 scope 中含循环引用的对象（scope 数据是宿主运行时活数据），`JSON.stringify` 抛 `TypeError: Converting circular structure to JSON`。渲染期同理：`latestTrace`/`overview`/`JsonViewer` 消费宿主事件流中的活数据，任何未来回归都会在宿主渲染树内抛出。

**条件与后果**：渲染期抛错 → React 卸载整个 playground 树（整页白屏）；事件处理器抛错（求值器）→ 开发环境错误浮层/生产环境 console 噪音。违反"调试器异常不应拖垮宿主"的根本约束——调试工具的故障被放大为宿主故障。

**修复方向**：`NopDebuggerPanel` 导出组件内部自带一层 ErrorBoundary（fallback 渲染一个降级 chip + 错误摘要，吞掉并向 store 记一条 error 事件）；`handleEvalExpression` 使用带 `WeakSet` seen 的安全 stringify 或 try/catch。

### F-04 事件采集路径（fetcher 包装 / plugin 钩子）在宿主管线内同步执行且无防御性 try/catch，可中断宿主请求与错误处理（D5 隔离）

**证据**：`adapters.ts:127-156`，在调用真实 fetcher **之前**同步执行 `redactData(api.data)`、`summarizeApi`、`buildNetworkSummary`：

```ts
    input.requestState.set(requestInstanceId, { ... });
    input.store.append({
      kind: 'api:start',
      ...
      exportedData: redactData(api.data, input.redaction),
      network: buildNetworkSummary({ api }),
    });
    try {
      const response = await next<T>(api, ctx);
```

`redactData`（`redaction.ts:60-77`）用 `Object.entries(value)` 遍历对象——**会触发对象 getter**；`plugin.onError` 里的 `formatErrorDetail`、`afterCompile` 里的 `normalizeCompiledRoot` 同样裸奔，无任何 try/catch 兜底。

**条件与后果**：当 `api.data` / `response.data` 是含抛异常 getter 的对象或已 revoke 的 Proxy（schema 把 scope 活数据直接作为请求体传出时可能出现）→ `redactData` 在 `next()` 之前抛 TypeError → **宿主请求被调试器中断、真实 fetcher 永不执行**；`onError` 钩子内抛错会掩盖宿主原始错误。调试器从"观测者"变成"故障注入者"。

**修复方向**：提供一个 `safeCapture(fn)` 包装：所有 store.append 的参数构造（redact/summarize/format）包在 try/catch 中，失败时降级为一条 `summary: 'capture failed'` 的事件；保证 `next(api, ctx)` 前的任何调试器代码不可抛。

## P2 风险

### F-05 每个请求/响应的深度拷贝驻留事件环缓冲，调试器内存放大（D3/D6）

`adapters.ts:154,175`：`exportedData: redactData(api.data, ...)` / `redactData(response.data, ...)` 对每个请求体和响应体做 ≤maxDepth(5) 的深拷贝并随事件进入 `maxEvents`(默认 400) 环缓冲（`store.ts:149`）。`redaction.ts` 只限**深度**不限**宽度/字节**：大列表接口（上千条记录的数组+对象在 5 层以内）会被近乎完整拷贝。特定条件：批量数据页面连续翻页/轮询 → 400 × 大响应拷贝全部驻留，调试器自身内存达数十至数百 MB，且这些引用由面板与 automation API 共享，无法提前释放。修复方向：对 exportedData 增加键数/节点数/字节预算（类似 `JsonViewer` 的 `slice(0,10)`+`moreItems` 策略），超限存 shape summary。

### F-06 redactData 破坏非纯 JSON 对象：Date/Map/Set 被替换为 `{}`（D1）

`redaction.ts:56-77`：对象一律走 `Object.entries` 重建。`Date` 实例无 own enumerable 属性 → 拷贝结果为 `{}`；Map/Set 同理；类实例丢原型。条件：宿主把含 Date 的对象作为 `api.data` 传出（运行时活数据常见）→ 时间线/网络页的请求与响应数据显示为 `{}`，调试信息失真且难以察觉（表面是"空对象"而非"不支持的类型"）。修复方向：在对象分支前识别 `value instanceof Date`（返回 ISO 字符串）等原生类型；无法识别的保留 `String(value)` 摘要。

### F-07 时间线虚拟列表固定行高 96px 与可变行高不符；展开事件即整体退出虚拟化导致滚动位置重置（D6/D1）

`timeline-tab.tsx:11-13,96-97,126-142`：`VIRTUAL_ROW_HEIGHT = 96`，`virtualizationEnabled = ... && expandedId == null && length > 60`，偏移按 `index * 96` 计算。但 `.ndbg-entry`（`styles-css.ts:139-147`）无固定高度、`.ndbg-entry-summary` 可换行——长 summary（如长 URL 的 API 事件）行高 >96px → `translateY` 偏移与真实累计高度漂移，表现为行间空隙/错位、滚动条映射失真、尾部条目可能滚不到。另外展开任意一条（`expandedId != null`）→ `virtualizationEnabled` 翻 false → 虚拟容器整体替换为全量渲染容器，`scrollTop` 归零——长列表底部展开一条事件，视图跳回顶部。修复方向：行内容固定高度+两行截断（CSS `line-clamp`），或动态测量行高；展开时保留容器结构与滚动位置（虚拟窗口内渲染展开行）。

### F-08 `capturePerformance` 选项是死参数（D2 契约）

`types.ts:426` 声明、`controller.ts:93` 默认 `options.capturePerformance ?? enabled`、`:331` 传入 `decorateDebuggerEnv`，但 `adapters.ts` 函数体从不读取 `input.capturePerformance`（grep 全包仅类型声明一处出现，见 `adapters.ts:107`）。后果：调用方设置 `capturePerformance: false` 期待关闭性能捕获毫无效果，公共 API 契约误导（本审计发现的 F-01 若按方向 (b)/(c) 修复，此参数正好应控制 render 事件捕获）。修复方向：实现其语义或先从 `NopDebuggerOptions` 移除。

### F-09 automation hub 注册后无法注销，controller 无 dispose 生命周期（D3 泄漏）

`automation.ts:135-158`：`registerAutomationApi` 把持有 store/事件闭包的 automation 对象写入 `window.__NOP_DEBUGGER_HUB__.controllers` 与 `window.__NOP_DEBUGGER_API__`，无 unregister；`NopDebuggerController`（`types.ts:433-496`）无 `dispose()`。条件：以不同 id 多次创建 controller（页面级实例、HMR 模块重评估、微前端多宿主）→ 已废弃 controller 的 automation API 连同其 ≤400 事件及 exportedData 引用被 window 全局强引用，永不可 GC——调试器自身泄漏并持续保留宿主数据快照。当前 playground 是模块级单例+固定 id（覆盖写）未实际触发，故列 P2 而非 P1。修复方向：controller 增加 `dispose()`（注销 hub 条目、`store` 清空、`setRuntime(null)`/`setComponentRegistry(null)`），hub 支持删除并维护 activeControllerId 回退。

## P3 提示

### F-10 notify 过滤器标签误用 `flux.common.more`（"更多"）（D7 i18n）

`panel.tsx:78`：`notify: t('flux.common.more')`——时间线 notify 组过滤器 chip 显示"更多/More"而非"通知"。`flux-i18n` 的 `flux.debugger` 命名空间无 notify 专用键（已核对 `zh-CN.ts:494-583` 全部键）。修复：新增 `flux.debugger.notifyEvents` 并替换。

### F-11 explanation/trace 输出硬编码英文，面板中英文混排（D7）

`event-groups.ts:24-27`（`'No correlated trace yet'` / `'N correlated event(s)'`）直接展示在 OverviewTab（`overview-tab.tsx:66-67`）；`explanations.ts` / `explanations-failure-async.ts` 的 `answer`/`limitations` 全部英文（若仅供 automation/AI 消费可接受，但 trace summary 明确进了 UI）。建议 UI 侧文案走 i18n。

### F-12 `lastRenderStartTimestamp` Map 无界且 `clear()` 不重置（D3；当前为死代码）

`store.ts:103`：按 nodeId 累积、永不清理；动态生成 nodeId 的长会话下缓慢增长（每项很小）。因 F-01（render 事件无发射端）当前是死路径，修复 F-01 时需一并加上限/清理。

### F-13 面板宽度拖拽中卸载不恢复 body 样式（D3）

`panel/hooks.ts:210-224`：pointerdown 时设置 `document.body.style.cursor='ew-resize'`、`userSelect='none'`，cleanup（`:203-207`）只移除监听器不还原样式。条件：拖拽中组件卸载（路由切换/面板关闭）→ 宿主页面光标与文本选择永久异常。修复：cleanup 中还原或在 clear 回调还原。

### F-14 检视状态长期持有已卸载 DOM 与运行时活引用（D3）

`use-inspect-mode.ts:88-91`：`selectedElement`（HTMLElement）与 `inspectData` 存 React state；`controller-component-inspector.ts:112` 的 `debugData` 是 `getDebugData()` 的**活引用**（非拷贝）。被检组件卸载后，其 DOM 子树与 debug 数据经由面板 state 持续保活，直到下一次选择/面板卸载。建议 inspect 时对 debugData 做浅拷贝或标注过期。

### F-15 检视/求值热路径小性能问题与子串误匹配（D6；一条 suspect）

- `controller-component-inspector.ts:447`：每次求值 `createFormulaCompiler()` 新建编译器（可复用单例）。
- `:271-272`：树排序比较器内 `JSON.stringify(instancePath)`（O(n log n) 次序列化）。
- `:402`：`buildGetComponentTree` 对每个 handle 执行一次 `querySelector`（O(n) 次 DOM 查询）。
- suspect：`explanations-failure-async.ts:225-237` `ownerMatchesQuery` 用 `ownerId.includes(nodeId)` 子串匹配，nodeId `a1` 会误匹配 ownerId `a12`，async 归因可能误报（未构造用例验证，标 suspect）。

### F-16 零散死代码与语义偏差（D8）

- `controller-helpers.ts:95` `formatActionResult` 全包无使用（仅测试）；`:155` 冗余 re-export `buildScopeChain`（调用方已直接 import）。
- `controller.ts:203-209` `waitForEvent` 立即命中分支不带 `sinceTimestamp` 时可被**调用前早已存在**的事件满足，与"等待新事件"语义有偏差（automation 调用方需自行传 sinceTimestamp 防串扰）。
- `store.ts:106-117` `positionPersistTimerId` 无清理时机（store 无 dispose），且 `createDebuggerStore` 的 `persistPosition` 入参实际从未被传入（controller 在 store 外部自行 persist，见 `controller.ts:292-295`）——死参数。

## 检查过程记录

1. **结构与方法**：先读 `package.json`（`private:true`、`sideEffects:false`、依赖 flux-core/formula/i18n/ui）→ `find` 列出 30 个源文件、`wc -l` 排除测试后 25 文件/7,037 行 → grep 全仓确认消费者仅 `apps/playground` → 按链路精读：`createNopDebugger`（controller）→ `createDebuggerStore`（环缓冲/节流/microtask notify）→ `createDebuggerPlugin`/`decorateDebuggerEnv`（采集端）→ 派生层（diagnostics-core/-failures、explanations）→ UI 层（panel + 4 tab + hooks/inspect-mode/json-viewer/styles）。
2. **D3 泄漏专项**：逐一核对所有 `addEventListener`（hooks.ts 三个拖拽 hook、use-inspect-mode 三处、timeline-tab resize）均有对称 remove；overlay 元素有 mount/unmount 清理；`waitForEvent` 超时与命中两路均正确 unsubscribe（`controller.ts:213-229`，`timer` 无 TDZ 风险——subscribe 不会同步回调）。确认的泄漏面为 F-05（环缓冲深拷贝驻留）、F-09（window hub 无注销）、F-12/13/14（小项）。
3. **时间旅行**：无快照恢复/回放实现，`state:snapshot`（`controller.ts:70-88`）只追加展示且内容仅为 action scope 的 namespace/method 名单（已核对 `flux-runtime/src/action-scope.ts:82-91`），不含用户数据——"快照恢复正确性"缺陷面不存在；顺带排除了"scope 快照未脱敏"的疑似误报。
4. **生产构建隔离**：本包 `private` + 仅 playground 依赖 + `sideEffects:false`，无 renderer 包 import 它，`index.tsx` 无副作用导出——调试器代码不会进入生产 bundle。此项健康。
5. **grep 扫描结果**：`as any`/`@ts-ignore`/`@ts-expect-error` = 0；`console.*` 仅 `controller-component-inspector.ts:17` 一处 `console.warn`（合理降级）；空 catch 集中在 storage 读写与 `formatErrorDetail` 的 `JSON.stringify` 兜底（`controller-helpers.ts`），均有降级返回值，无吞错导致的静默失败；`JSON.parse/stringify` 热路径仅 `redaction` 相关（F-05/F-06）与求值器（F-03），storage 均为冷路径。
6. **D8 结构**：`scripts/check-oversized-code-files.mjs` 实跑（只读脚本，非 pnpm 命令）：本包 3 个文件处 WARN 级（>500 行）：`panel.tsx` 515、`panel/styles-css.ts` 507、`types.ts` 505；无 >700 ERROR 级、无豁免名单需求，不在已注册红名单内。按 AGENTS 规则"over 500 lines should be evaluated for extraction"记录：`panel.tsx`（搜索/过滤逻辑约 130 行可抽离）、`types.ts`（explanation 类型已拆至 types-explanations.ts，可继续拆 query/trace 类型）。
7. **反误报核验**：(a) `decorateEnv` 多次调用不产生包装器堆叠——`decorateRendererEnv` 每次包裹原始 env（`flux-core/src/utils/renderer-env.ts:41-69`），playground 各页 useMemo/useEffect 调用安全；(b) F-01 曾怀疑 flux-react 有 render 事件发射，grep `flux-react`/`flux-runtime` 全量确认无；(c) action scope 快照数据内容已到 flux-runtime 实现核实，排除数据泄漏误报；(d) `mergeNetworkRequests` 对倒序事件流的 start/end 合并逻辑核对无误。
