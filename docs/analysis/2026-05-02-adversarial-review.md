# 对抗性审查报告 — 2026-05-02

> 审查范围：全部 24 个 packages，重点覆盖 flux-core、flux-runtime、flux-react、flux-compiler、flux-formula、flux-action-core、flux-i18n、以及四个 renderer 包。同时交叉比对 docs/architecture/ 与代码实现的一致性。

---

## 发现 1：`$Date` 符号表与实际 runtime 严重不一致 — 编译器误报 9/14 个合法方法

**在哪里**：`packages/flux-compiler/src/compile-symbol-table.ts:60`

**是什么**：编译器的 `$Date` 命名空间成员列表只列了 7 个方法：

```
['format', 'now', 'addDays', 'addMonths', 'addYears', 'startOfDay', 'endOfDay']
```

而 `packages/flux-formula/src/date-helper.ts:72-148` 的 `dateHelper` 对象实际暴露了 14 个方法：

```
now, today, parse, format, year, month, day, hours, minutes, seconds,
addDays, addMonths, addYears, diff
```

| 丢失（9 个，会产生 false-positive 诊断）                                        | 幽灵（2 个，runtime 不存在但编译器接受） |
| ------------------------------------------------------------------------------- | ---------------------------------------- |
| `today`, `parse`, `year`, `month`, `day`, `hours`, `minutes`, `seconds`, `diff` | `startOfDay`, `endOfDay`                 |

**为什么值得关心**：

- 使用 `${$Date.today()}` 或 `${$Date.year(date)}` 的合法 schema 会收到 `unknown-builtin-member` 编译错误
- 使用 `${$Date.startOfDay()}` 的 schema 会通过编译但在运行时崩溃（`dateHelper.startOfDay is not a function`）
- 这意味着 `$Date` 的符号表是一个从未被同步过的手动桩

**信心水平**：确定

**建议**：从 `dateHelper` 对象的程序化键列表生成 `members`，或手动更新为：

```ts
members: [
  'now',
  'today',
  'parse',
  'format',
  'year',
  'month',
  'day',
  'hours',
  'minutes',
  'seconds',
  'addDays',
  'addMonths',
  'addYears',
  'diff',
];
```

---

## 发现 2：`booleanStringAdapter` 名称暗示 string-to-boolean 转换，但实现只做 truthiness 强转

**在哪里**：`packages/flux-core/src/value-adapter.ts:160-169`

**是什么**：

```ts
export function booleanStringAdapter(): ValueAdapter<unknown, boolean> {
  return markSyncAdapter({
    in(value) {
      return Boolean(value);
    },
    out(value) {
      return Boolean(value);
    },
  });
}
```

`Boolean("false") === true`。名称 `booleanStringAdapter` 强烈暗示它会将字符串 `"true"`/`"false"` 转为布尔值，但它实际上只做 JS truthiness 强转。

**当前影响**：该适配器被 `CheckboxRenderer`（line 211）和 `SwitchRenderer`（line 239）使用。这两个组件在 `onChange` 中已经通过 `Boolean(checked)` 传入布尔值，所以数据流是一个封闭的布尔循环，不触发 bug。

**潜在影响**：如果 API 返回 `{ active: "false" }` 或 scope 初始化为字符串 `"false"`，checkbox 会显示为已选中（应为未选中）。Plan 121（`docs/plans/121-unified-value-adapter-for-all-field-types-plan.md:175`）已经记录了这个风险。

**信心水平**：确定

**建议**：修改 `in()` 方法：

```ts
in(value) {
  if (typeof value === 'string') return value === 'true';
  return Boolean(value);
}
```

---

## 发现 3：`compileActionNode` 无深度限制 — 深层嵌套 action 链可导致编译器栈溢出

**在哪里**：`packages/flux-compiler/src/action-compiler.ts:50-101`

**是什么**：`compileActionNode` 递归编译 `then`、`onError`、`onSettled`、`parallel` 四个分支，没有深度计数器。同文件的 `isNodeFullyStatic`（line 110）也是无界递归。

schema 的 region 嵌套受 `MAX_COMPILE_DEPTH = 64` 限制，但单个节点的事件处理链不受此限制。一个 `then` 嵌套 ~2000-3000 层的 schema 就能让 V8 栈溢出。

**为什么值得关心**：

- 任何 schema 作者都可以触发（门槛极低）
- 在 `compiler.compile()` 路径上没有 try/catch，`RangeError` 会直接传播到调用方
- 崩溃时没有诊断信息，只有原始的 `Maximum call stack size exceeded`

**信心水平**：确定

**建议**：参照 `MAX_COMPILE_DEPTH` 模式，给 `compileActionNode` 添加 `depth` 参数，超过 128 或 256 时抛出描述性错误。

---

## 发现 4：`new RegExp(rule.value)` 无 try/catch — 无效正则表达式可导致编译崩溃

**在哪里**：`packages/flux-compiler/src/validation-lowering.ts:206`

**是什么**：

```ts
rule.kind === 'pattern'
  ? { regex: new RegExp(rule.value) }
  : undefined,
```

`new RegExp("[")` 抛出 `SyntaxError`。在 `compiler.validate()` 路径上有 try/catch 保护（schema-compiler.ts:543-563），但在 `compiler.compile()` 路径（line 580-585）和 `compiler.compileNode()` 路径（line 610）上没有保护。

**为什么值得关心**：`pattern: "["` 这种常见笔误（未闭合字符类）会在渲染时导致整个页面编译崩溃。

**信心水平**：确定

**建议**：在 `compileValidationRules` 内部用 try/catch 包裹 `new RegExp(rule.value)`，失败时发出诊断而非崩溃。

---

## 发现 5：Reaction 自毁机制使用生命周期计数器（上限 10）而非级联深度 — 合法 reaction 也会被终止

**在哪里**：`packages/flux-runtime/src/async-data/reaction-runtime-helpers.ts:19`（常量定义），`packages/flux-runtime/src/async-data/reaction-runtime.ts:210-223`（自毁逻辑）

**是什么**：`MAX_REACTION_FIRE_COUNT = 10`。这是一个硬编码的生命周期总计数器，不是级联深度计数器。一个 reaction 在生命周期内成功 dispatch 超过 10 次就会被 dispose。

**影响场景**：

| 场景                                              | 是否触发上限                    |
| ------------------------------------------------- | ------------------------------- |
| reaction 监听 `searchText` 字段，每次按键触发搜索 | 是，11 次按键后自毁             |
| reaction 监听轮询计数器（每 5 秒更新）            | 是，约 50 秒后自毁              |
| 自引用循环（reaction 改变自己监听的值）           | 是，10 次迭代后自毁（设计目标） |

自毁时会通过 `env.notify('warning', ...)` 发出通知并调用 `env.monitor.onError()`，但 reaction 会永久停止工作。

**为什么值得关心**：这个机制的文档（`docs/architecture/api-data-source.md:918-928`）描述为"对级联循环的安全保护"，但实际语义是"生命周期总 dispatch 次数上限"，两者不一致。schema 作者无法预期或配置这个限制。

**信心水平**：确定

**建议**：将计数器改为级联深度（每次 scope change 递增，scope 稳定后重置），或改为可配置参数，或大幅提高默认值（如 1000）。

---

## 发现 6：Plan 103 声称 `useNodeLifecycleActions` 已改为 ref 模式，但代码从未修改

**在哪里**：

- 文档：`docs/plans/103-flux-react-hot-path-remediation-plan.md`（Phase 2，声称将 `helpers` 和 `nodeInstance` 改为 ref）
- 代码：`packages/flux-react/src/node-renderer-effects.ts:85`（依赖数组仍为 `[input.helpers, input.lifecycleActions, input.nodeInstance]`）

**是什么**：Plan 103 的验证清单标记 `[x] Lifecycle refs + minimal deps confirmed`，但实际代码从未引入 `helpersRef` 或 `nodeInstanceRef`。git 历史确认 `node-renderer-effects.ts` 的 5 次提交中从未包含 ref 模式。

**当前实际风险**：`helpers` 对象的 8 个依赖（runtime、renderScope、currentForm 等）在正常运行中是结构稳定的，不会因数据变更而改变身份。因此 `onMount`/`onUnmount` 在实践中很少重复触发。但在动态 form 创建/销毁场景（如 dialog 内的 form）中，`helpers` 身份会改变，导致 lifecycle actions 重复执行。

**信心水平**：确定（文档声称与代码实现不匹配）

**建议**：要么实现 ref 模式（按 plan 描述），要么将 plan 标记为部分完成并更新验证清单。

---

## 发现 7：`scopeChangeHitsDependencies` 热路径 O(n\*m) 性能瓶颈

**在哪里**：`packages/flux-runtime/src/scope-change.ts:119-127`

**是什么**：

```ts
for (const changePath of change.paths) {
  for (const depPath of dependencies.paths) {
    if (pathsOverlap(changePath, depPath)) {
      return true;
    }
  }
}
```

每次 scope 变更通知都会执行这段双重循环。对于有 50 个依赖路径的 scope，一次 `setValues` 更新 20 个路径，就是 1000 次字符串 `startsWith` 比较。

**为什么值得关心**：这是 reaction 调度、数据源订阅、表单依赖验证的共同热路径。在复杂 schema（100+ 字段，20+ 数据源，50+ reaction）下，每次用户交互都会反复执行。

**信心水平**：很可能

**建议**：用前缀树（Trie）或按路径深度分桶的索引结构替代双重循环，将匹配从 O(n\*m) 降到 O(n + m)。

---

## 发现 8：`findRuntimeRegistration` 在子路径查找时 O(n\*m) — 每个字段的验证和值同步都经过

**在哪里**：`packages/flux-runtime/src/form-runtime-registration.ts:18-25`

**是什么**：

```ts
for (const entry of sharedState.runtimeFieldRegistrations.values()) {
  if (entry.registration.childPaths?.includes(path)) {
    return { entry, childPath: path };
  }
}
```

当主查找（`pathToRegistrationId`）失败时（子路径场景），函数遍历所有注册，每个注册又检查 `childPaths` 数组。调用点包括 `validatePath`、`applyFieldValuePatch`、`syncRegisteredFieldValue`。

**为什么值得关心**：大型表单（100+ 复合字段，每个有多个子路径）中，每次字段变更都触发一次 O(n\*m) 查找。

**信心水平**：确定

**建议**：维护一个 `childPathToRegistrationId` 的反向索引 Map，使子路径查找为 O(1)。

---

## 发现 9：`actionAdapter` 静默吞没错误 — adapter 失败时数据可能被悄悄损坏

**在哪里**：`packages/flux-core/src/value-adapter.ts:234, 264`

**是什么**：

```ts
async in(value, ctx) {
  // ...
  } catch {
    return value;  // 静默回退到原始值
  }
},
async out(value, ctx) {
  // ...
  } catch {
    return value;  // 静默回退到工作值
  }
},
```

**为什么值得关心**：在低代码平台中，adapter 负责数据转换（如格式化、类型转换、校验）。一个失败的 adapter 静默返回未转换的原始值，意味着表单可能提交了从未正确转换的数据，而用户和开发者都不知道出了问题。

**信心水平**：确定

**建议**：在 catch 块中添加 `console.warn` 或通过 `ctx.reportDiagnostic` 报告诊断信息。

---

## 发现 10：`diffAndNotifyValuePaths` 每次值变更都遍历所有已订阅路径

**在哪里**：`packages/flux-runtime/src/form-store.ts:87-93`

**是什么**：

```ts
function diffAndNotifyValuePaths(before, after) {
  for (const path of pathListeners.keys()) {
    if (getIn(before, path) !== getIn(after, path)) {
      notifyPath(path);
    }
  }
}
```

每次 `setValues` 或 `setValue` 都对所有已订阅路径做 `getIn` 比较。100 个订阅路径 = 200 次 `getIn` 调用。`getIn` 每次都解析路径字符串。

**为什么值得关心**：在有很多已渲染字段的表单中，这增加了每次值变更的延迟。

**信心水平**：很可能

---

## 发现 11：`formula +` 运算符遵循 JS 字符串拼接语义，与其他算术运算符不一致

**在哪里**：`packages/flux-formula/src/evaluator.ts:56`

**是什么**：

```ts
case '+': return (left as any) + (right as any);
case '-': return Number(left) - Number(right);
```

`+` 是唯一不强制数值转换的算术运算符。`${"2" + 3}` 返回 `"23"` 而不是 `5`。`-`、`*`、`/`、`%`、`**` 都用 `Number()` 强转。

**为什么值得关心**：在低代码表达式引擎中，用户可能不会预期 `"2" + 3` 是字符串拼接。这与 AMIS 的行为一致（AMIS 也遵循 JS 语义），但如果 flux 试图做更安全的表达式引擎，这是一个设计决策需要明确的地方。

**信心水平**：确定（可能是设计意图）

---

## 发现 12：`flux-i18n` 声明 `sideEffects: false` 但模块有全局副作用

**在哪里**：`packages/flux-i18n/package.json:5`

**是什么**：`"sideEffects": false` 声明模块无副作用，但 `initFluxI18n()` 调用 `setMessageFormatter()`（flux-core 的全局单例）并创建 i18next 实例。如果 bundler 通过 tree-shaking 移除了看似未使用的 i18n 导入，`setMessageFormatter` 可能永远不会被调用。

**为什么值得关心**：在当前使用模式下（`initFluxI18n` 返回值被使用），不太可能被 tree-shake。但 `sideEffects: false` 的声明在技术上不准确，可能在某些 bundler 配置下导致问题。

**信心水平**：很可能

---

## 发现 13：`resolveFormTarget` 中 `as any` 鸭子类型可能导致错误的行为分支

**在哪里**：`packages/flux-runtime/src/action-adapter.ts:46-51`

**是什么**：

```ts
if (
  handle?.capabilities?.store &&
  typeof (handle.capabilities.store as any).getState === 'function'
) {
  const store = handle.capabilities.store as any;
  const state = store.getState();
  if (state && 'values' in state && 'fieldStates' in state) {
    return { kind: 'not-found', formId };
  }
}
```

逻辑检查 store 是否有 `values` 和 `fieldStates`（即是否为 form store），但找到后却返回 `not-found`。这段代码的意图不清晰 —— 它似乎是在排除 form store 而不是解析它。`as any` 绕过了类型检查，使得这个可能的逻辑错误无法被编译器捕获。

**信心水平**：很可能（可能是防御性检查，但意图不明确）

---

## 发现 14：`api-cache.ts` 的 `stableStringify` 对循环引用会栈溢出

**在哪里**：`packages/flux-runtime/src/async-data/api-cache.ts:26-38`

**是什么**：`stableStringify` 递归遍历对象生成缓存键，没有深度限制或循环引用检测。如果 API 数据中包含循环引用（例如 scope 对象或带 `parent` 指针的数据），函数会无限递归直到栈溢出。

**为什么值得关心**：缓存键的输入来自用户控制的 API 响应数据。如果后端返回的 JSON 解析后的对象被注入了循环引用（通过 scope overlay 或 host 扩展），整个应用会崩溃。

**信心水平**：有趣的猜测（需要特定条件才会触发）

---

## 发现 15：`Promise.all` 在多 source prop 节点上丢失部分成功结果

**在哪里**：`packages/flux-react/src/node-source-prop-controller.ts:103-158`

**是什么**：当一个节点有多个 source prop（如 dropdown 同时有选项 source 和初始值 source），`Promise.all` 在任何一个失败时拒绝，丢弃所有其他成功的结果。

**为什么值得关心**：用户看到所有 source 依赖的 prop 同时失败（空/undefined），而实际上只有一个有问题。用 `Promise.allSettled` 可以允许部分成功，显著改善用户体验。

**信心水平**：确定

---

## 发现 16：`ownKeys` 触发 `recordWildcard()` 禁用细粒度依赖追踪

**在哪里**：`packages/flux-formula/src/scope.ts:142-143`

**是什么**：任何调用 `ownKeys` 的操作（`Object.keys()`、展开运算符、`for...in`）都会触发 `recordWildcard()`，将依赖追踪从路径级退化为全量监听。

**为什么值得关心**：表达式 `${{ ...obj }}` 或 `${Object.keys(data)}` 会使所在 reaction/数据源的依赖追踪变成"监听整个 scope"，抵消了细粒度响应式的优化效果。这是一个设计权衡（Proxy 的 `ownKeys` trap 无法知道哪些 key 被实际使用），但可能值得在文档中说明哪些表达式模式会"破坏"细粒度追踪。

**信心水平**：确定（设计权衡）

---

## 文档与代码一致性发现

### D1：模块边界文档落后于代码 19+ 个文件

`docs/architecture/flux-runtime-module-boundaries.md` 缺少以下活跃文件的记录：

**form-runtime 子系统**（7 个文件未记录）：

- `form-runtime-derived-state.ts`
- `form-runtime-owner-external-errors.ts`
- `form-runtime-owner-lifecycle.ts`
- `runtime-host-projection-scope.ts`
- `runtime-owned-factories.ts`
- `form-path-state.ts`
- `error-utils.ts`

**async-data 子系统**（7 个文件未记录）：

- `source-executor.ts`
- `data-source-state.ts`
- `data-source-runtime-utils.ts`
- `reaction-runtime-helpers.ts`
- `formula-data-source-controller.ts`
- `api-data-source-controller.ts`
- `api-data-source-controller-helpers.ts`

**schema-compiler 子模块**（5 个文件未记录）：

- `symbol-helpers.ts`
- `static-analysis.ts`
- `shape-validation-utils.ts`
- `shape-validation-rules.ts`
- `authoring-transform.ts`

### D2：`resolveGap` 文档说已迁移，但代码仍有两份副本

`docs/architecture/flux-runtime-module-boundaries.md:348` 声称 `resolveGap` 已从 `flux-renderers-basic` 迁移到 `flux-react`。但实际上两个包都有副本，`flux-renderers-basic` 的 container/flex 仍使用本地副本。

### D3：`useFormLayout` 和 `rendererHooks` 未记录在 renderer-runtime.md 的 "Current Hooks" 部分

这两个导出存在于代码中但不在文档的 hooks 列表里。

### D4：`NodeLocator` 在 dist 目录仍有残留引用

`packages/flux-react/dist/useFormComponentHandleRegistration.d.ts` 仍引用已退役的 `NodeLocator` 类型。需要重新构建 dist。

### D5：Renderer 包中多个组件未发出 `data-testid` / `data-cid`

以下 widget renderer 未在 DOM 输出中包含 `props.meta.testid` / `props.meta.cid`：

- `array-editor.tsx` (line 258)
- `key-value.tsx` (line 336)
- `tag-list.tsx` (line 71)
- `tree-controls.tsx` InputTreeRenderer / TreeSelectRenderer (lines 141-256)
- `composite-field/array-field.tsx` (line 344)
- `composite-field/object-field.tsx` (line 377)

### D6：`crud-renderer-toolbar.tsx` 使用原生 `<label>` 而非 `@nop-chaos/ui` 的 `Label`

违反了 AGENTS.md 中 "NEVER use raw HTML elements when `@nop-chaos/ui` provides a component" 的规则。

---

## 总评

### 最值得关注的 3 个方向

**1. 编译器与 runtime 的约定一致性（发现 1、3、4）**

`$Date` 符号表与实际 runtime 的 9/14 不匹配（发现 1）是最典型的"维护者灯下黑"问题 —— 手动维护的列表在 runtime 添加新方法时从未被同步更新。类似地，`compileActionNode` 的无界递归（发现 3）和 `new RegExp` 的未捕获异常（发现 4）都属于"编译器信任输入太深"的问题。这些问题的共同特征是：编译器缺少对边界条件的防御性处理，而且在正常的 `validate()` 路径上被 try/catch 掩盖了，但在 `compile()` 路径上会直接崩溃。

**2. 热路径性能（发现 7、8、10）**

`scopeChangeHitsDependencies` 的 O(n*m) 双重循环（发现 7）和 `findRuntimeRegistration` 的 O(n*m) 子路径查找（发现 8）都在每次用户交互的热路径上。单个发现的独立影响可接受，但叠加起来，在 100+ 字段的表单中，每次按键可能触发数千次不必要的字符串比较。这些是"今天不疼、明天会疼"的渐进性问题 —— schema 越复杂，性能退化越明显。

**3. 静默错误吞没（发现 9、11、12）**

`actionAdapter` 的静默 catch（发现 9）是最值得修复的低垂果实 —— 一个失败的值转换被静默忽略，可能导致表单提交错误数据而无人知晓。结合 `booleanStringAdapter` 的名称误导（发现 2）和 `formula +` 的隐式字符串拼接（发现 11），这些问题的共同特征是"行为与预期不符但没有可见的错误信号"。在低代码平台中，schema 作者的调试能力有限，静默错误会极大增加排查成本。
