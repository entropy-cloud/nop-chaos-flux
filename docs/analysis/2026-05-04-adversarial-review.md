# 对抗性审查报告 — 2026-05-04

> 审查方式：按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。先读 `AGENTS.md`、`docs/index.md`，再并行调查 expression/formula、dependency tracking、store lifecycle、action system、compiler pipeline、React renderer patterns、cross-package contracts、i18n/accessibility、test coverage 共 9 条线索。重点追查跨包契约断裂、隐含语义冲突、生命周期泄漏和文档/实现偏移，不做风格清单。

---

## 发现 1：Formula evaluator 异常时 collector 状态被永久破坏

**在哪里**

- `packages/flux-formula/src/evaluate.ts:111-116`

**是什么**

`evaluateLeaf()` 在设置 `context.collector` 时没有 `try/finally` 保护：

```ts
const { collector, finalize } = createScopeDependencyCollector();
const prevCollector = context.collector;
context.collector = collector;
const value = node.compiled.exec(context, env); // 如果这里抛异常
context.collector = prevCollector; // 这行永远不会执行
const dependencies = finalize();
```

如果 `node.compiled.exec(context, env)` 抛出异常，`context.collector` 永远指向已失效的局部 collector。同一 `context` 上的后续求值会把依赖写入一个已经 finalize 过的 collector，导致依赖跟踪永久损坏。同时 `finalize()` 也会被跳过，当前节点的依赖集永远丢失。

**为什么值得关心**

这不是偶发的 UI 小问题，而是整个响应式系统的根基——依赖收集——在异常路径上会静默损坏。一旦触发：

- 后续所有求值使用的依赖集都是错误的
- 可能导致节点不再响应本该响应的 scope 变化，或者响应了不该响应的变化
- 没有任何崩溃或报错来提醒开发者，行为表现为"偶发不更新"或"偶发多余更新"

**信心水平**：确定

---

## 发现 2：`scopeChangeHitsDependencies(undefined, undefined)` 返回 `false`，文档三处说应该返回 `true`

**在哪里**

- `packages/flux-runtime/src/scope-change.ts:126-132`
- `docs/architecture/dependency-tracking.md:158, 232-233, 483`

**是什么**

代码：

```ts
export function scopeChangeHitsDependencies(
  change: ScopeChange | undefined,
  dependencies: ScopeDependencySet | undefined,
): boolean {
  if (!change || !dependencies) {
    return false;
  }
```

文档在三处明确写明：

> "If either is missing -> `true` (conservative: invalidate on everything)"

> "`scopeChangeHitsDependencies(change, undefined)` returns `true`."

> "Current `scopeChangeHitsDependencies(change, undefined) -> true` is correct for unknown dependencies."

实现和文档做了完全相反的事情。代码在依赖尚未收集时选择"不触发"（permissive），文档声称应该"全部触发"（conservative）。

**为什么值得关心**

- 在依赖尚未收集完成的窗口期内（比如 source 首次 evaluate 之前），scope 变化会被静默忽略
- 这与文档声明的"安全默认值"直接矛盾——依赖不确定时应该多触发，而不是少触发
- 消费者如果信任文档写了"conservative"语义来设计系统，可能会基于错误假设做优化
- 这种文档/代码分叉比纯代码 bug 更危险，因为审查者和实现者会各自相信不同的"真相"

**信心水平**：确定

---

## 发现 3：`submitForm` 的 bare catch 把所有错误替换成"Form not found"

**在哪里**

- `packages/flux-runtime/src/action-adapter.ts:143-166`

**是什么**

```ts
try {
  const handle = ctx.componentRegistry.resolve({
    componentId: invocation.targeting.formId,
  });
  if (!handle) {
    return { ok: false, error: new Error(`Form not found: ${invocation.targeting.formId}`) };
  }
  return handle.capabilities.invoke('submit', { ... }, ctx);
} catch {
  return { ok: false, error: new Error(`Form not found: ${invocation.targeting.formId}`) };
}
```

bare `catch`（没有 error binding）捕获 `resolve()` 和 `invoke()` 抛出的**所有异常**，然后统一替换成"Form not found"。这意味着：

- 网络错误 → "Form not found"
- 验证异常 → "Form not found"
- 服务端 500 → "Form not found"
- 权限错误 → "Form not found"

原始错误信息完全丢失。

**为什么值得关心**

- 这是 CRUD 场景的核心路径——提交表单。用户在提交失败时永远看到"Form not found"，无法定位真实问题
- 调试时，开发者也无法从错误信息推断出真正发生了什么
- 这个 catch 同时吞掉了 `resolve()` 的错误（可能是合理的"找不到"）和 `invoke('submit')` 的错误（绝对不应该被替换成"找不到"）

**信心水平**：确定

---

## 发现 4：ActionDispatcher 没有 dispose 机制，debounced actions 在 runtime 销毁后仍会触发

**在哪里**

- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:408-426`
- `packages/flux-runtime/src/runtime-factory.ts:451-493`

**是什么**

`createActionDispatcher` 返回的对象只有 `dispatch` 方法，没有 `dispose`/`cancelAll`：

```ts
return {
  dispatch: (action, actionCtx) => dispatch(ctx, action, actionCtx),
};
```

`runtime-factory.ts` 的 `dispose()` 清理了 pages、surfaces、forms、validation、imports 等等，但**完全不触碰 actionDispatcher**。`pendingDebounces` Map 中的 `setTimeout` 定时器继续持有对整个 runtime 图的引用。

**为什么值得关心**

- 一个 debounced `setValue` 或 `ajax` action 可以在 runtime 销毁后执行，对已 dispose 的 scope/form 进行写操作
- 泄漏的定时器闭包持有 `ctx` → 持有 `runtime` → 持有所有 store、scope、form runtime
- 在 SPA 路由切换场景下，如果 runtime 被频繁创建和销毁，debounce 泄漏会导致旧 runtime 整个无法被 GC

**信心水平**：确定

---

## 发现 5：ComponentHandleRegistry 的子注册表永远不会从父级移除——内存泄漏

**在哪里**

- `packages/flux-runtime/src/component-handle-registry.ts:402-408`

**是什么**

子注册表在创建时被加入父级的 `__childRegistries` Set：

```ts
if (input.parent) {
  const parentWithChildren = input.parent as RegistryWithChildren;
  if (!parentWithChildren.__childRegistries) {
    parentWithChildren.__childRegistries = new Set<ComponentHandleRegistry>();
  }
  parentWithChildren.__childRegistries.add(registry);
}
```

在整个 411 行的文件中，**没有任何代码**从 `__childRegistries` 中移除子注册表。没有 `dispose()` 方法，没有 `delete` 调用。通过 `use-node-scopes.ts` 为每个 `componentRegistryPolicy: 'new'` 节点创建的子注册表，在节点卸载后仍然被父级引用。

**为什么值得关心**

- `resolveInScope()` 在每次查找时遍历所有 `__childRegistries`，随时间推移查找性能退化
- 每个子注册表持有自己的 handles Set、多个 Map（`handlesByCid`、`handlesById`、`handlesByName`），以及回指父级的引用
- 长生命周期的页面（如 dashboard）如果有频繁挂载/卸载的动态组件，泄漏会持续累积

**信心水平**：确定

---

## 发现 6：Compiler diagnostics 默认关闭，`compileNode()` 硬编码禁用——表达式编译错误被静默吞掉

**在哪里**

- `packages/flux-compiler/src/schema-compiler.ts:580-611`
- `packages/flux-compiler/src/schema-compiler/diagnostics.ts:275-278`

**是什么**

`compile()` 方法不传 diagnostics 配置，默认 `enabled: false`：

```ts
compile(schema, options) {
  const nodes = compileSchemaToTemplateNodes(schema, options);
  return { root: nodes, repeatedTemplates: new Map() };
},
```

`compileNode()` 更直接——**硬编码** `enabled: false`：

```ts
compileNode(schema, options) {
  const diagnostics = createSchemaCompilerDiagnosticsContext(
    { schemaUrl: options.schemaUrl, diagnostics: { enabled: false } },
    'compile', options.schemaUrl,
  );
```

Diagnostics context 的 enabled 条件：

```ts
const enabled =
  mode === 'validate' || diagnosticsOptions?.enabled === true || options?.validation !== undefined;
```

当 mode 是 `'compile'` 且调用方不传 `diagnostics: { enabled: true }` 时，所有表达式编译错误、未知属性、无效 action 形状都被静默丢弃。

**为什么值得关心**

- 开发者写了一个有语法错误的表达式 `"${user..name}"`，编译器发现错误但丢弃诊断，运行时直接把原始字符串当静态值使用
- 用户看到 `"${user..name}"` 显示在界面上，而不是一个有用的错误提示
- `compileNode()` 没有任何方式让调用方启用 diagnostics
- 配合 `compile-node.ts:59-69` 的 fallback-to-static 行为，整个管线变成了"有错误但不告诉任何人"

**信心水平**：确定

---

## 发现 7：Formula 数据源写入 scope 后缺少 cascade depth 限制——相互依赖的数据源可以无限循环

**在哪里**

- `packages/flux-runtime/src/async-data/source-registry.ts:177-197`
- `packages/flux-runtime/src/async-data/reaction-runtime.ts:259-268`

**是什么**

Reactions 有 `MAX_CASCADE_DEPTH = 100` 的限制，超过后自动 dispose。但 **Sources 没有 cascade depth 限制**。如果两个 formula source 互相依赖：

- Source A 发布到 `total`，依赖 `price`
- Source B 发布到 `price`，依赖 `total`

自写保护（`filterScopeChangeByIgnoredRoots`）只过滤自己发布的路径，不会检测 A ↔ B 之间的循环依赖。每个 refresh 触发另一个 refresh，形成无限循环。

**为什么值得关心**

- 这种循环依赖在 schema 设计时很难被肉眼发现（两个 source 分别定义在不同的 schema 片段里）
- 不会崩溃，只会让浏览器卡死或持续触发网络请求（如果是 API source）
- 不太常见的场景，但一旦出现极难定位

**信心水平**：很可能

---

## 发现 8：全局可变单例 Formula Registry——多 runtime 实例之间状态泄漏

**在哪里**

- `packages/flux-formula/src/registry.ts:15-19`
- `packages/flux-formula/src/builtins.ts:46-48`

**是什么**

```ts
const defaultFunctions = new Map<string, FormulaFunction>();
const defaultFunctionMeta = new Map<string, FormulaFunctionMeta>();
const defaultNamespaces = new Map<string, unknown>();
let cachedSnapshot: FormulaRegistrySnapshot | undefined;
let builtinsInstalled = false;
```

Formula registry 是模块级全局可变单例。这意味着：

1. 多个 `createRendererRuntime` 实例共享同一个 registry
2. 一个 runtime 注册的自定义函数对所有 runtime 可见
3. `cachedSnapshot` 在每次 `registerFunction`/`registerNamespace` 时被置为 `undefined`，但没有锁，两个并发编译可能看到不一致的快照
4. `builtinsInstalled` 存在 TOCTOU 竞态——检查和设置之间没有原子保护

**为什么值得关心**

- 在测试环境、SSR 环境、或同页多 runtime 场景中，注册的函数和命名空间会互相污染
- 如果一个 runtime 调用 `resetFormulaRegistry()`，所有其他 runtime 的 registry 都受影响
- 当 `builtinsInstalled` 竞态发生时，builtins 可能被注册两次

**信心水平**：很可能

---

## 发现 9：`$JSON.parse` 和 `instanceof` 的 `Symbol.hasInstance` 打开了沙箱逃逸向量

**在哪里**

- `packages/flux-formula/src/builtins.ts:50-51`
- `packages/flux-formula/src/evaluator.ts:87-88`

**是什么**

```ts
registerNamespace('$JSON', JSON);    // 暴露 JSON.parse
registerNamespace('$Math', Math);

// evaluator.ts
case 'instanceof':
  return typeof right === 'function' ? left instanceof (right as any) : false;
```

1. `$JSON.parse` 允许在表达式内解析任意 JSON。如果下游代码不做 prototype 污染清理，`${$JSON.parse('{"__proto__":{"polluted":true}}')}` 可能造成 prototype pollution。
2. `instanceof` 操作符会调用右操作数的 `Symbol.hasInstance` 静态方法，等价于执行任意代码：`${data instanceof maliciousConstructor}`

**为什么值得关心**

- 项目文档 `docs/architecture/security-design-requirements.md` 明确要求表达式求值必须在沙箱内运行
- 如果 schema 来自不可信来源（用户输入、远程加载），这些向量可以被利用
- 即使当前 schema 都是可信的，"防御性设计"原则应该从一开始就堵住这些门

**信心水平**：很可能（在 schema 不可信场景下确定）

---

## 发现 10：`retry` 机制对非抛出型失败不递增 `failureCount`——指数退避策略失效

**在哪里**

- `packages/flux-action-core/src/operation-control.ts:182-224`

**是什么**

`withRetry` 函数只在 `catch` 块内递增 `failureCount`：

```ts
try {
  lastResult = await fn();
} catch (error) {
  failureCount += 1; // 只有 throw 才递增
  // ...
}
// 如果 fn() 返回 { ok: false } 而不是 throw，failureCount 不变
```

但 `runSingleAction` 的 try/catch 把所有 adapter 异常转换为 `{ ok: false }` 返回值——也就是说**大多数 action 失败都走非抛出路径**。指数退避使用 `failureCount` 计算延迟，结果是非抛出型失败永远使用基础延迟，不执行指数退避。

**为什么值得关心**

- 配置了 `retry: { strategy: 'exponential', times: 3, delay: 1000 }` 的 `setValue` action，实际重试间隔永远是 1000ms，而不是期望的 1000 → 2000 → 4000ms
- 这个 bug 隐藏在两层函数的交互中：`runSingleAction` 把异常转为返回值 + `withRetry` 只对异常计数
- 对网络型 action（ajax）可能关系不大（它们走 HTTP 层重试），但对 namespaced action 和自定义 adapter 重试策略会完全失效

**信心水平**：确定

---

## 发现 11：Accessibility——form fields 没有 `aria-describedby` 关联错误消息，违反 WCAG 3.3.1

**在哪里**

- `packages/flux-renderers-form/src/renderers/input.tsx:54-55`（以及所有 form field renderer）
- `packages/flux-renderers-form/src/renderers/shared/label.tsx:3-12`

**是什么**

所有 form input 设置了 `aria-invalid={true}` 但**没有 `aria-describedby`** 指向错误消息元素。屏幕阅读器会播报"字段无效"但无法朗读具体的错误文本。

同时，`FieldLabel` 组件只渲染 `<span>` 或 `<legend>`，从不使用 `<label htmlFor={inputId}>` 进行程序化关联。点击标签文本不会聚焦到对应的输入框。

影响的组件：`Input`、`Select`、`Textarea`、`Checkbox`、`Switch`、`RadioGroup`、`CheckboxGroup`——全部 form 控件。

**为什么值得关心**

- WCAG 2.1 Level A 要求 3.3.1（Error Identification）和 1.3.1（Info and Relationships）
- 如果产品需要通过无障碍合规审查，这是一个阻塞性问题
- 对使用屏幕阅读器的用户，这实质上把表单变成了不可用的

**信心水平**：确定

---

## 发现 12：Composite scope 的 `readVisible()` 每次父级变化都创建新对象——深层嵌套时级联通知

**在哪里**

- `packages/flux-runtime/src/scope.ts:197-237`
- `packages/flux-runtime/src/scope.ts:121-195`

**是什么**

`createCompositeScopeStore` 在父级 scope 变化时用引用比较判断是否通知子订阅者：

```ts
const unsubParent = parent.store?.subscribe((change) => {
  const nextVisible = readVisible();
  if (nextVisible === lastVisibleForParent) {
    return;
  } // 引用比较
  lastVisibleForParent = nextVisible;
  listener(change);
});
```

但 `readVisible()` 使用 `Object.assign(safeCreate(parentVisible), ownSnapshot)` 创建新对象——即使数据完全相同，引用也永远不同。结果是**每个父级变化都会通知所有子订阅者**，无论子 scope 的可见数据是否真的变了。

在深度嵌套的场景中（page > form > detail > array-item），一个顶层 scope 变量变化会触发 O(depth × subscribers_per_level) 的通知。

**为什么值得关心**

- 这是系统级的性能特征，不是个别组件的问题
- 在表格行内编辑、嵌套表单、master-detail 布局等常见低代码场景中，scope 嵌套深度通常 ≥ 4
- 当前的影响被 static node optimization 和 dependency filtering 部分缓解，但在高频更新场景（实时数据、轮询 API）下可能成为瓶颈

**信心水平**：确定

---

## 发现 13：大量 renderer 硬编码英文字符串——i18n 覆盖不完整

**在哪里**

- `packages/flux-renderers-form/src/renderers/input.tsx:147, 259` — "Loading..."、"On"/"Off"
- `packages/flux-renderers-form-advanced/src/key-value.tsx:70-71, 116, 376` — "Key"、"Value"、"Add entry"
- `packages/flux-renderers-form-advanced/src/array-editor.tsx:247, 321` — 验证消息
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:50` — "Edit"
- `packages/flux-renderers-data/src/table-renderer/table-pagination-bar.tsx:145-147` — "X of Y"
- `packages/flux-renderers-basic/src/button.tsx:25` — "Button"
- `packages/flux-renderers-basic/src/dynamic-renderer.tsx:55` — "Invalid schema received from API"

共发现 **17 处**硬编码英文字符串，覆盖 6 个 renderer 文件。

**为什么值得关心**

- 项目已经建立了完整的 i18n 系统（zh-CN/en-US 两种语言，250+ 翻译键），但 renderer 层没有完全接入
- 切换到英文后，这些字符串会保持中文/英文混合状态
- Condition-builder 组件有 27 处 `t()` 调用使用不带 `flux.` 前缀的 key（如 `t('conditionBuilder.addCondition')`），与项目约定的 `flux.` 前缀不一致，虽然功能上能工作但会造成维护混乱

**信心水平**：确定

---

## 发现 14：Spreadsheet/Flow Designer/Report Designer 包的测试覆盖率显著低于核心包

**在哪里**

| Package                   | Source/Test 比率 | 评估         |
| ------------------------- | ---------------- | ------------ |
| `spreadsheet-renderers`   | 0.18 (38/7)      | Critical gap |
| `spreadsheet-core`        | 0.32             | Weak         |
| `flow-designer-renderers` | 0.30             | Weak         |
| `flux-renderers-basic`    | 0.35             | Weak         |

特别是 `spreadsheet-core/src/command-handlers/`（8 个文件）有 **0 个专用测试**。

同时，`flux-runtime/src/__tests__/` 中有 **110+ 处** `from '../` 相对路径导入\*\*，测试与内部实现高度耦合。如果内部模块被重命名或拆分，所有测试都会断裂，即使公共 API 没变。

**为什么值得关心**

- 低代码平台的 spreadsheet 和 designer 是功能最复杂、边界条件最多的部分
- 没有测试覆盖的 command handler 意味着 cell 操作、clipboard、undo/redo 的回归完全靠人工发现
- 内部路径导入使测试变成"实现测试"而非"契约测试"，重构时成本极高

**信心水平**：确定

---

## 总评

这次审查覆盖了 expression/formula、dependency tracking、store lifecycle、action system、compiler pipeline、React renderer、cross-package contracts、i18n/accessibility、test coverage 共 9 条线索。共发现 14 个值得报告的问题。以下是最值得关注的 3 个方向：

### 1. 依赖收集/响应式系统的异常安全性

发现 1（collector 腐败）和发现 2（scopeChangeHitsDependencies 文档/代码矛盾）共同指向一个问题：响应式系统在异常和初始化边界上的行为没有被系统性地保护。这两个问题不会在日常 happy path 上暴露，但会制造"偶发不更新"或"偶发多余更新"的幽灵行为。修复方案都很简单（加 try/finally、改 return false 为 return true），但影响范围涉及整个响应式基础。

### 2. 跨包契约断裂的三个典型案例

发现 3（submitForm bare catch）、发现 4（dispatcher 无 dispose）、发现 5（子注册表泄漏）分别代表了三种不同的跨包契约断裂模式：

- **语义替换**：adapter 层吞掉真实错误，替换成无关信息
- **生命周期缺口**：一个包的清理路径没有被上游包调用
- **隐含所有权**：子对象被加入父级集合但永远不被移除

这三种模式如果不在核心路径上修复，会在未来新增包和 feature 时持续扩散。

### 3. Schema 安全性和开发者体验的基础设施缺口

发现 6（diagnostics 默认关闭）和发现 9（$JSON.parse / instanceof 沙箱逃逸）是两个方向相反但同样重要的基础设施问题。前者让开发者看不到错误，后者让不可信 schema 能做不该做的事。配合发现 8（全局单例 registry 的状态泄漏），整个表达式基础设施在多实例隔离和安全边界方面存在系统性缺口。这不是某个函数的 bug，而是基础设施级别的架构债务。
