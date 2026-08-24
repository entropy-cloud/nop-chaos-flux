# 12 flux-renderers-form 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-renderers-form/src/`，排除 `*.test.*` 与 `__tests__/` 后共 48 个实现文件约 9502 行（若含测试支持 `test-support.tsx`/`test-dom-polyfills.ts` 与 `form-renderers.css` 则 50 文件 9863 行）。FormRenderer 壳 + input/select/date 系精读，其余文件全文过读 + 定向 grep。
- 结论概览：P0 x1 / P1 x2 / P2 x7 / P3 x9 —— 渲染期创建 form runtime 的同步发布链（06 号 F-01 在本包侧核实成立）与远程搜索 echo 池重复项（基线 duplicate key `remote-1` 的确切根因）是两条必须修复的主线；quarter 年份输入受控回环是键盘不可用级缺陷。其余为约束突破、格式兼容与契约风险。

## P0 缺陷

### F-01 FormRenderer 渲染期 useMemo 创建 form runtime，构造尾部同步写 parentScope store（承接 06 号审计 F-01，本包侧核实）

- 位置（本包触发点）：`packages/flux-renderers-form/src/renderers/form.tsx:65-90`
- 位置（写入侧，已核实）：`packages/flux-runtime/src/form-runtime.ts:642`（构造尾部 `setupExternalPublication()`）→ `:246-290`（`publish()` 首次执行同步 `parentScope.update(valuesPath, values)` / `publishOwnerStatus(parentScope, statusPath, summary)`）
- 摘录（form.tsx:65-79）：
  ```tsx
  const ownedForm = useMemo(
    () =>
      runtime.createFormRuntime({
        id: formId, name: formName,
        initialValues: initialValuesRef.current,
        parentScope, statusPath, valuesPath, page: currentPage,
        validation: compileFormLevelValidationModel(...),
      }),
    [runtime, formId, formName, parentScope, statusPath, valuesPath, currentPage, props.templateNode.validationPlan],
  );
  ```
- 输入 → 路径 → 错误结果推理链：
  1. 输入：声明了 `statusPath` 或 `valuesPath` 的 `form` 节点。`setupExternalPublication` 的守卫是 `if (!parentScope || (!statusPath && !valuesPath)) return`（form-runtime.ts:250-252），因此**只有声明这两个 prop 之一的 schema 模式才触发**，普通 form 不触发。
  2. FormRenderer 渲染期 useMemo 执行 `runtime.createFormRuntime` → 工厂函数构造尾部（form-runtime.ts:642）同步调 `setupExternalPublication()`，其内部 `publish()` 首次执行：`valuesPath` 时 `lastPublishedValues` 初值 `undefined` 与初始 values 对象必然不等 → `parentScope.update(valuesPath, values)`；`statusPath` 时初始 summary 与 `lastStatusSummary=undefined` 必然不等 → `publishOwnerStatus(...)`。**构造期必有一次同步 store 写**。
  3. parentScope store（zustand vanilla）写入同步通知订阅者；任一已 mounted 的 `NodeRendererResolved`（`useSyncExternalStore` 订阅 scope store）在 FormRenderer 渲染期间被调度更新 → React 警告 `Cannot update a component (NodeRendererResolved) while rendering a different component (FormRenderer)`；并发渲染/StrictMode 下该次更新可能丢失或重排（tearing 风险）。
- 为何在渲染期创建（而非 effect/mount）：`FormContext.Provider value={ownedForm}` 与 `ScopeContext.Provider value={ownedForm.scope}`（form.tsx:477-478）在**首帧**就需要 form runtime，body 子树首个渲染就要通过 form scope 读写数据。若改为 commit 后创建，首帧子树要么挂到 parentScope（错误数据环境）、要么需要 preparing/null 空帧（`docs/architecture/renderer-runtime.md:98` 描述的目标基线）。文档矛盾：renderer-runtime.md:59 承认"renderer-owned form runtimes created during render"是 live baseline，而 :98 声称 commit-safe rule 已应用到 renderer-owned form runtimes —— 与 form.tsx 实况不符（文档超前于实现）。
- 影响面（哪些 schema 模式会看到警告/潜在 tearing）：
  1. 静态 `statusPath`/`valuesPath`：首次挂载即同步发布一次（挂载期订阅者少，警告通常不显式）。
  2. 动态表达式路由（复现用例 `form-submit-actions.values.test.tsx`："reroutes dynamic publication paths"，`valuesPath: 'forms.${activeId}.values'`）：表达式求值变化 → useMemo 依赖变化 → **每次 reroute 都在渲染期销毁旧 form、创建新 form 并同步写 parentScope** → 警告必现。
  3. `parentScope` 引用变化（上层 scope 重建）同样触发 useMemo 重建走该链。
- 修复方向（与 06 号建议一致，本包侧确认优先级）：(a) `createManagedFormRuntime` 将首次 `publish()` 延迟到 microtask/首个订阅周期（runtime 侧一处修复全局生效）；(b) form.tsx 改 commit-safe 创建（首帧 preparing/null，对齐 renderer-runtime.md:98）；(c) flux-react 提供 commit-safe 的 `useOwnedRuntime` hook。修复后补"console 警告为零"回归测试，并同步 renderer-runtime.md:59/:98 两处互相矛盾的基线描述。

## P1 隐患

### F-02 select 远程搜索 duplicate key `remote-1`：echoOptions 把 remoteOptions 与 remoteEchoCache 并列拼接，同一 value 进入池两次（线索 2 归因，tooling-confirmed）

- 位置：`packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:177-180`（拼接）、`packages/flux-renderers-form/src/renderers/input-choice-utils.ts:196-209`（multiple filter 命中两次）、`input-choice-renderers.tsx:367-371`（chips 渲染 `key={getChoiceOptionKey(option.value)}`）
- 摘录（input-choice-renderers.tsx:177-180）：
  ```tsx
  const echoOptions =
    remoteOptions !== null || remoteEchoCache.length > 0
      ? [...allOptions, ...(remoteOptions ?? []), ...remoteEchoCache]
      : allOptions;
  ```
- 推理链（与测试 fixture `__tests__/select-remote-search.test.tsx:37-68` 完全吻合：本地 options=[admin]，远程返回 [{label:'RemoteOnly', value:'remote-1'}]）：
  1. 远程结果到达时，`use-select-remote-search.ts:81-92` 已把该批 options **去重合入 `remoteEchoCache`**；同一渲染里 `remoteOptions` 也持有同一批条目。
  2. `echoOptions = [...allOptions, ...remoteOptions, ...remoteEchoCache]` —— `remote-1` 在池中出现两次（echoCache 合入不去除 remoteOptions 中的在册项）。
  3. 用户选中该远程项后，multiple 模式 `resolveChoiceComboboxValue`（input-choice-utils.ts:197-209）`allOptions.filter(option => valueArray.some(Object.is(option.value, candidate)))` 把两个同 value 项**都**选入 chips。
  4. `ComboboxChip key={getChoiceOptionKey(option.value)}` → 两个 key `'remote-1'` → React `Encountered two children with the same key, remote-1`。**append 与 replace 两处同源**：echoOptions 构造与 `searchMergeMode` 无关，基线日志"append/replace 两处"完全由这一根因解释。
- 次要来源（同类，未在本测试触发但同在）：append 可见列表 `[...rawOptions, ...remoteOptions]`（input-choice-utils.ts:160）本地/远程同 value 交集时 `ComboboxItem key`（select-combobox-lists.tsx:64）重复；`use-select-remote-search.ts:70-76` 对远程 data 本身无按 value 去重（replace 模式直接展示远程原始重复）。mobile 路径 `renderMobileOptionRow` key 同源（select-mobile-renderer.tsx:59）。
- 影响：React duplicate key 下列表渲染行为未定义（可能丢项/复用错乱），选中态与高亮可能漂移；开发控制台噪音。
- 修复方向：echoOptions 构造按 `String(value)` 建seen 去重（echoCache 优先保留先到条目）；或 `resolveChoiceComboboxValue` multiple 分支输出前按 value 去重；`useSelectRemoteSearch` 对 `data.map` 结果与 append 合并同加按 value 去重。修复后用现有 select-remote-search 测试组验证警告为零。

### F-03 input-quarter 年份输入受控回环吞键入，键盘无法完成选择

- 位置：`packages/flux-renderers-form/src/renderers/period-renderers.tsx:354-377`（年份 Input `value={yearValue}` + onChange）、`:293-295`（yearValue 来自 parse 回读）、`packages/flux-renderers-form/src/renderers/date/date-utils.ts:537`（quarter regex `^(\d{4})-Q([1-4])$` 强制 4 位年）
- 摘录（period-renderers.tsx:294-295, 370-377）：
  ```tsx
  const parsed = parsePeriod(value, kind, props.valueFormat);
  const yearValue = parsed ? String(parsed.getFullYear()) : '';
  ...
  onChange={(event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
    if (!digits || currentQuarter === 0) {
      onChange(undefined);
      return;
    }
    onChange(`${digits}-Q${currentQuarter}`);
  }}
  ```
- 输入 → 路径 → 错误结果：已选 Q3 后键入 '2' → onChange('2-Q3') → commitSingle 写 store → `parsePeriod('2-Q3')` regex 要求 `\d{4}` 解析失败 → yearValue='' → 受控 Input value 立即清空 → 用户键入被吞。逐键输入只能停留在 0 位，除非一次粘贴 4 位年份。未选季度时（currentQuarter===0）更直接：任何键入都走 `onChange(undefined)`，同样清空。**quarter picker 的年份字段键盘不可用**。
- 影响：`input-quarter` 无法通过键盘正常录入年份（只能粘贴或程序设值）；每次键入还向 store 写入一次非法中间值（'2-Q3'）随后被覆盖。
- 修复方向：year Input 改非受控缓冲（本地 state 保存编辑中文本，blur 或 4 位满时 commit），或受控 value 直接回显 store 原文（同 year kind 的做法 period-renderers.tsx:327 `value={value ?? ''}`），commit 校验失败时不清空显示。

## P2 风险

### F-04 form runtime 重建时沿用首帧 initialValues/rules（reroute 语义破坏）

- 位置：`packages/flux-renderers-form/src/renderers/form.tsx:55-63, 70, 77`
- 摘录：
  ```tsx
  const initialValuesRef = useRef(initialValues);   // 只取首帧值，后续渲染不更新
  const formRulesRef = useRef<FormSchema['rules']>((props.props as FormSchema).rules);
  ...
  initialValues: initialValuesRef.current, // intentional: initial values must not retrigger useMemo
  ```
- 问题：`form-definition.ts:137/144` 明确契约"Dynamic rerouting is supported and recreates the form owner"；但 `statusPath`/`valuesPath` 表达式变化触发 useMemo 重建 form runtime 时，新 form 的 `initialValues`/`rules` 仍是**首帧捕获的 ref 值**。reroute 后 `data`（表达式）已变，新 form 却以旧 data 初始化，且旧 rules 生效。ref 防重创建的意图是"不因值抖动重建"，副作用是"真重建时用旧值"。
- 影响：动态路由/动态 data 的 form 重建后初值错误、rules 陈旧；用户已输入值也随重建丢失（重建即换新 store，另半张问题）。
- 修复方向：重建路径上读取当帧 `initialValues`/`rules`（用 render-time 值而非 ref，配合依赖数组外移），或重建时显式 `setValues` 同步。

### F-05 checkbox-group 取消全选绕过 minSelected 并清空 disabled 已选项

- 位置：`packages/flux-renderers-form/src/renderers/checkbox-group-renderer.tsx:92-103`（对比 `:71-90` toggleOption 的保护）
- 摘录：
  ```tsx
  function handleCheckAllToggle(nextChecked: boolean) {
    ...
    if (nextChecked) {
      const target = selectableOptions.map((option) => option.value);
      const clamped = maxSelected !== undefined ? target.slice(0, maxSelected) : target;
      commit(clamped);
    } else {
      commit([]);            // 无 minSelected 保护；disabled 已选值一并清空
    }
  }
  ```
- 问题：单个取消（toggleOption）受 `minSelected` 约束（`:85-87`），取消全选直接 `commit([])` 可把选中数打到 0 以下，突破 `minSelected`；同时 `selectableOptions` 排除 disabled 选项（勾全选时不会选中它们），但取消全选清空**所有**值，包括 disabled 且已被程序预设选中的值。勾/取消两个方向语义不对称。
- 影响：`minSelected` 声明形同虚设（一键绕过）；disabled 预选值被意外清空，提交 payload 丢数据。
- 修复方向：`commit([])` 改为 `commit(selectableOptions.filter(isSelected).map(v=>v.value))` 之外保留 disabled 已选值，并施加 minSelected 下限（不足时按声明裁剪或拒绝）。

### F-06 搜索高亮 `<mark key={part}>` 在 query 多次命中时 key 重复

- 位置：`packages/flux-renderers-form/src/renderers/select-combobox-lists.tsx:16-33`
- 摘录：
  ```tsx
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  return parts.map((part) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={part} className="...">
        {part}
      </mark>
    ) : (
      part
    ),
  );
  ```
- 问题：label 中 query 出现 ≥2 次时产生多个 `<mark>`，key 均为匹配文本本身（如 "banana" 搜 "a" → 三个 key='a' 的 mark）→ duplicate key 警告 + 潜在高亮错乱。
- 影响：searchable select 输入任意多次命中字符即触发；与 F-02 同类的控制台噪音与渲染未定义行为。
- 修复方向：`parts.map((part, i) => <mark key={i}>...)`（内容互斥无需稳定语义 key）。

### F-07 相对日期值只在渲染期解析，提交原文 'today'（渲染不纯 + display/submit 数据不一致）

- 位置：`packages/flux-renderers-form/src/renderers/input-date-renderer.tsx:29`、`input-datetime-renderer.tsx:50`、`date-range-renderer.tsx:111-118`
- 摘录（input-date-renderer.tsx:27-29）：
  ```tsx
  // P1-05: the value path resolves relative expressions too (value:'today'
  // initializes to today); non-relative strings pass through unchanged.
  const storedValue = resolveRelativeDate(typeof value === 'string' ? value : undefined);
  ```
- 问题：`value:'today'` 经 `useDefaultValuePush`（field-handlers.tsx:487 `defaultValue: schemaProps.value`）把 **'today' 原文**推入 store；渲染期每次 `resolveRelativeDate('today')` 生成当下 ISO（含时分秒，两次渲染可能不同——渲染不纯），但从不写回 store。用户未交互时提交 payload 是 `'today'` 字符串而非解析后的绝对日期。date-range 同理（'today,today'）。
- 影响：display 显示"今天"、submit 却提交 `'today'` 原文，下游（服务端/校验）若不理解相对语义即静默脏数据；`requiredRange` 等按 valueFormat 解析规则的路径拿到 'today' 也解析失败。
- suspect 说明：若契约明确"相对值保留原文、由消费端解析"则本条降级 P3；但 `resolveRelativeDate` 只服务 display/min/max 的事实使 display/submit 分叉更像是遗漏。
- 修复方向：defaultValue push 前先 `resolveRelativeDate` 归一为绝对值再入 store（一次性写回，兼顾渲染纯度）。

### F-08 date-range `shortcuts` 不解析相对日期，与 value/presets 路径不一致

- 位置：`packages/flux-renderers-form/src/renderers/date-range-renderer.tsx:236-239`（对比 `:111-118` value 路径、`:241-250` presets 路径走 `resolveRelativePreset`）
- 摘录：
  ```tsx
  function applyShortcut(shortcut: RangeShortcut) {
    const normalized = normalizeRange(shortcut.start, shortcut.end, valueFormat, options);
    handlers.onChange(joinDateRange(normalized.start, normalized.end, delimiter));
  }
  ```
- 问题：`shortcuts` 声明 `start:'today'` / `'-7d'` 类相对值时：normalizeRange 内 parseDate 失败 → 原文入库 + start>end swap 判断失效；store 得到与 valueFormat 不符的相对原文。三条相对值路径（value / presets / shortcuts）只有 shortcuts 缺解析。
- 影响：shortcut 写入的值 display 靠渲染期 resolve 侥幸显示，但 submit/验证/min-max clamp 全部拿到不可解析原文；反向顺序 shortcut 不被交换。
- 修复方向：applyShortcut 先对两端 `resolveRelativeDate`（或统一抽 `resolveRangeEnds` 与 value 路径共用）。

### F-09 useSelectRemoteSearch 的 searchScope 在 dispatch 挂起时泄漏；abort 不取消底层请求

- 位置：`packages/flux-renderers-form/src/renderers/use-select-remote-search.ts:63-113`
- 摘录：
  ```ts
  const searchScope = helpers.createScope({ searchQuery: trimmed });
  helpers.dispatch(actionInput, { scope: searchScope, signal: controller.signal })
    .then(...)
    .finally(() => { ...; helpers.disposeScope(searchScope.id); });
  ```
- 问题：(1) `disposeScope` 只在 promise settle 后执行——若 action 实现挂起（无超时的 fetcher），每次搜索泄漏一个 runtime-owned child scope 到 `ownedScopeDisposers`（违反 renderer-runtime.md 一次性求值 scope 纪律的 settle-time 配对要求，配对本身正确但无超时兜底）。(2) `controller.abort()` 只标记 signal；请求是否真取消取决于 action/fetcher 是否透传 signal，未透传时旧请求继续发出（结果被 `controller.signal.aborted` 正确丢弃，无后发先至，仅浪费请求）。
- 影响：慢/挂接口下 scope 累积（内存+runtime 销毁负担）；重复搜索期间网络冗余请求。
- 修复方向：给 dispatch 加超时兜底 dispose（如 `setTimeout` 强制 settle 分支），或 effect cleanup 中记录 pending scope id 并在卸载时 dispose；文档化 searchSource action 必须透传 signal。

### F-10 input-month 自定义 valueFormat 与原生 month 控件不兼容（无格式转换层）

- 位置：`packages/flux-renderers-form/src/renderers/period-renderers.tsx:297-316`
- 摘录：
  ```tsx
  if (kind === 'month') {
    return (
      <Input type="month" value={value ?? ''} ... onChange={(event) => onChange(event.target.value || undefined)} />
    );
  }
  ```
- 问题：原生 `type="month"` 只认 `YYYY-MM` 且 onChange 只产 `YYYY-MM`；这里 value 直接用 valueFormat 字符串、onChange 直接入库，**没有 input-time-renderer.tsx:58-61 那样的 `convertValueFormat` 桥接**。`valueFormat: 'YYYY/MM'` 时初始值不显示；用户选择后 store 存入 `YYYY-MM`，`parsePeriod('2026-08', ..., 'YYYY/MM')` 失败 → 回显又清空。
- 影响：默认 `YYYY-MM` 恰与原生一致所以默认路径无恙；任何自定义 month valueFormat 直接不可用（显示/回写双向失败）。suspect（若 schema 校验层限制 valueFormat 为默认值则降 P3，未发现该校验）。
- 修复方向：仿 input-time 的 native↔valueFormat 双向 `convertValueFormat`；或在 schemaValidator 中拒绝非 `YYYY-MM` 的 valueFormat。

## P3 提示

### F-11 useDictOptions：死 AbortController + render 期重复 console.warn

- 位置：`packages/flux-renderers-form/src/renderers/use-dict-options.ts:26, 48-50, 55-60`
- `const controller = new AbortController()` 创建后 signal 从未传入 `loadDict`，cleanup 的 `controller.abort()` 是无副作用的空调用（竞态实际由 `genRef` 正确兜住，无错误结果，纯死代码）；`!loadDict` 分支在 render body 中每次渲染都 `console.warn`（无去重，长列表字典组件会刷屏）。建议：删除 controller 或把 signal 接入 loadDict；warn 挪到 effect 或加 once 标记。

### F-12 input-suggest：focus 模式无防抖 + refreshSource 失败静默 + 建议项 key 无去重

- 位置：`packages/flux-renderers-form/src/renderers/input-suggest.tsx:146-165, 132/156, 322`
- focus trigger 的 effect 依赖 `inputValue`，用户聚焦后每键入一字同步 refetch（input 模式有 300ms debounce，focus 模式没有，语义漂移）；两处 `.catch(() => undefined)` 吞掉 refreshSource 派发失败（无 monitor/上报，D5 盲区）；`key={String(suggestion.value)}` 对重复 value 的建议源会 duplicate key（与 F-02 同类）。

### F-13 createFormLifecycleScope 代理 ScopeRef 不完整

- 位置：`packages/flux-renderers-form/src/renderers/form-lifecycle-helpers.ts:22-77`
- 手写代理对象缺 `dispose()`/`isolate` 转发（ScopeRef 接口含 dispose，quick-reference.md ScopeRef 定义）；`readVisible()` 每次复用并覆写同一 `visibleView` 对象（外部持有返回引用会被下一次调用改写）。当前消费方（action ctx.scope）不调 dispose、不持有快照，未爆发；契约层面应补全或改用 `runtime.createChildScope` 原生机制。

### F-14 多处毫秒常量硬编码

- `form.tsx:393`（submitOnChange debounce 300ms，propContracts 描述里也写死 300ms）、`use-select-remote-search.ts:114`（300ms）、`input-suggest.tsx:14/16`（300ms/150ms）、`input-choice-renderers.tsx:123`（virtualThreshold=100）。不可配置且互不共享；建议集中为常量模块并开放 schema 覆盖（至少 debounce 类）。

### F-15 useAdaptedFieldValue 异步 adapter 路径的 context 依赖不稳定（未来风险）

- 位置：`packages/flux-renderers-form/src/field-utils/field-handlers.tsx:397-400, 244-282`
- `adapterContext = { name, readOnly }` 每渲染新对象且作为 effect 依赖（:282）：一旦出现非 `__syncIn` 的异步 adapter，effect 将每渲染重跑，若 `adapter.in` 同步返回新引用对象则 `queueMicrotask setAdaptedValue` 形成渲染循环。当前包内全部 adapter（string/number/booleanMapping/choice）经 `flux-core/src/value-adapter.ts` `markSyncAdapter` 标记 sync（已核实 :42-65），路径不激活，故仅提示：接入异步 adapter 前需把 context 稳定化（useMemo 或字段级比较）。

### F-16 date/datetime popover 时间输入无法清空重输

- 位置：`packages/flux-renderers-form/src/renderers/date/date-field-control.tsx:166-167, 313-351`
- `handleTimeChange` 对 `raw === ''` 直接 return，受控 `value={String(hour)}` 立即回填旧值——用户删除时间数字想重输时第一个删除动作即被回滚，只能全选覆盖。建议空值期保留本地空态。

### F-17 大 options 列表默认无虚拟化

- 位置：`packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:122-123, 140`
- `virtual` 默认 false 且阈值 100：schema 未显式声明 `virtual: true` 时 5000 项 options 走 `StaticComboboxList` 全量 DOM（D6）。建议超阈值自动切换虚拟化（virtual prop 仅作强制开关）。

### F-18 日期解析边角：quarter 忽略自定义 format；多段 range 忽略第三段起

- 位置：`packages/flux-renderers-form/src/renderers/date/date-utils.ts:534-543`（quarter parse/format 硬编码 `YYYY-Qq` 语法，自定义 quarter format 不生效）、`:410-414` / `:631-635`（`value.split(delimiter)` 取 parts[0]/[1]，多余段静默丢弃）。低风险提示：在 schemaValidator 限制或文档声明即可。

### F-19 线索 3 归因核实：surface-event-ctx 失败（dialog 确认按钮缺失）与本包无关（D2 排除记录）

- 基线（docs/audits/check/00-baseline-tooling.md §偏离 2）：`flux-renderers-basic/src/__tests__/surface-event-ctx.test.tsx` 第 2 条用例走**声明式** `type:'dialog'` + `open:true` 受控路径，失败现象为 `[data-testid="surface-confirm-submit"]` 确认按钮缺失；05 号已裁定 root cause 不在 flux-runtime。
- 本包侧证据：`grep -rn "confirm"` 在本包 src 无任何 confirm 按钮编译/渲染代码（dialog renderer 与确认按钮解析属 flux-renderers-basic / flux-react DialogHost 的 `resolveConfirmButtons` 门控）。本包参与的是按钮**点击后**的链路：`submitForm` → `ctx.form` → `setSurfaceForm`（form.tsx:152-154，effect 时机注册）→ `ownedForm.submit()`；注册/卸载对称（form.tsx:266-269 cleanup 置 undefined），`submitScope:'surface'` 的 hook 触发链（form.tsx:162-185）逻辑自洽。按钮缺失发生在渲染门控阶段、先于任何 form 交互，本包链路无法影响按钮是否存在。
- 结论：维持 05/06 号归因方向（受控 open 分支 resolveConfirmButtons 门控，责任在 flux-react/flux-renderers-basic），本包排除；修复验证时可顺带跑该用例确认 form submit 链未受牵连。

## 检查过程记录

1. 前置阅读：`docs/architecture/form-validation.md`（V23 fieldErrors 契约、hidden-field 参与规则、C10 submit 投影）、`docs/references/quick-reference.md`（RendererComponentProps/hooks/FormRuntime/ScopeRef 契约）、`docs/architecture/renderer-runtime.md`（渲染纯度 guardrail、:59/:98 StrictMode 与 commit-safe 基线、one-shot scope 纪律）。
2. 枚举源文件：`find src -type f ! -name "*.test.*" ! -path "*__tests__*"` 共 50 文件 9863 行（含 css 与 2 个测试支持文件）；按行数排序确定精读范围。
3. 精读（全文）：form.tsx、form-definition.ts、form-init-action.ts、form-load-action.ts、form-lifecycle-helpers.ts、form-rules.ts、input.tsx、input-choice-renderers.tsx、input-choice-utils.ts、use-select-remote-search.ts、use-dict-options.ts、select-combobox-lists.tsx、select-mobile-renderer.tsx、checkbox-group-renderer.tsx、button-group-select-renderer.tsx、textarea-renderer.tsx、input-number-renderer.tsx、input-suggest.tsx、date/date-utils.ts、date/date-field-control.tsx、date/date-presets.ts、input-date-renderer.tsx、input-datetime-renderer.tsx、input-time-renderer.tsx、date-range-renderer.tsx、period-renderers.tsx、markdown-editor-renderer.tsx、fieldset.tsx、hidden-renderer.tsx、field-utils/_（handlers/reading/presentation/validation/hidden-policy）、shared/_、mobile-touch-utils.ts、hidden-field-policy-schema.ts、date-renderer-definitions.ts、stepper-button.tsx、index.tsx、definitions.ts、field-utils.tsx、schemas.ts（FormSchema 段）、form-renderers.css。
4. 跨包证据核实（只读）：`flux-runtime/src/form-runtime.ts:246-290, 642`（setupExternalPublication 构造尾部同步 publish）；`flux-core/src/value-adapter.ts:42-65, 182-260`（全部内置 adapter 为 markSyncAdapter，booleanMappingAdapter.in 语义、numberAdapter 空串处理）。
5. 线索核实：06 号 F-01 原文比对（归因一致，本包侧补充"为何渲染期创建"与影响面分级）；`__tests__/select-remote-search.test.tsx:37-100, 322-347` fixture 比对（确认 duplicate key 来自 remoteOptions+remoteEchoCache 双份，append/replace 同根因）；`docs/audits/check/00-baseline-tooling.md` 偏离 2 全文 + 本包 grep（排除本包对 surface-event-ctx 的责任）。
6. 定向 grep 扫描（均排除 `__tests__`/`*.test.*`）：`as any`/`@ts-ignore`/`@ts-expect-error`（0 命中）；空 catch 块（0，仅 input-suggest 两处 `.catch(() => undefined)` 记入 F-12）；`addEventListener`/`setInterval`/`setTimeout`（全部有对应清理：input-number:83-94、form.tsx:399-405、input-suggest:184-190、use-select-remote-search:115-118）；`new Date(`（ISO-only 输入或构造器重载，无非 ISO 字符串解析风险；date-utils.ts:189 有 regex 前置）；JSX 硬编码中文（0 命中，文案全部走 `t()`/`useFluxTranslation`，i18n key 存在 `flux.*`/`date.*`/`markdown.*` 前缀——注意 date-field-control.tsx 用 `date.hour` 而 input-time/date-range 用 `flux.date.hour` 两套前缀并存，未发现缺 key，记为风格提示不单列）。
7. 反误报核对：input-number 小数点输入经 React bailout 推演确认**不受控回环影响**（'1.' 中间态 state 不变不重渲染，NaN 不 setState），不构成 finding；checkbox/switch 的 checked 经 booleanMappingAdapter.in 恒为 boolean（无 uncontrolled 警告）；radio-group 的 `value == null ? ''` 防止 uncontrolled→controlled 翻转（代码注释自证）；use-select-remote-search 的后发先至由 AbortController+aborted 检查正确防护；form-init/load-action 的 StrictMode 双挂载已通过 controller-identity-guarded 的 marker 清理处理。
8. 报告口径：行号以当前工作区文件为准；`docs/architecture/renderer-runtime.md:59 与 :98 的基线矛盾`作为 F-01 的一部分记录，供文档侧同步。
