# nop-chaos-flux 独立架构设计评估

> 分析日期：2026-04-04
> 修订日期：2026-04-04（结合 `docs/architecture/flux-dsl-vm-extensibility.md` 修正）
> 方法：基于源码直接阅读，不依赖项目文档或其他平台文档的自我描述，从第一性原理独立评估。之后与架构文档核对，修正了若干误判。
> 参照平台：AMIS、Formily、LowCodeEngine、react-jsonschema-form、Retool、Appsmith。

---

## 重要前提：Flux 的定位

在对比任何具体维度之前，必须先理解 `docs/architecture/flux-dsl-vm-extensibility.md` 确立的定位：

> Flux 不是低代码平台的编辑器本体，而是 **DSL 虚拟机**——接收已经由后端 Loader 层装配完成的最终 schema，在浏览器端执行它。

这个定位决定了哪些"缺失"是设计上的刻意选择，哪些才是真正的短板。以下分析在此基础上评估。

---

## 执行摘要

nop-chaos-flux 在 **TypeScript 类型安全**、**两阶段编译**、**调试器**、**三棵树分离架构**上具有明显优势。核心短板是**无表达式依赖追踪**（导致响应性粒度粗）和 **Action 系统缺乏并行/分支/重试**。

若干初判中的"缺口"在阅读架构文档后确认为刻意的架构选择：视觉编辑器、Schema 版本迁移属于 Loader 层职责，不在运行时范围内。

---

## 一、响应性模型（最关键的设计决策）

### 当前实现

源码路径：`packages/flux-react/src/node-renderer.tsx:61-73`、`packages/flux-runtime/src/scope.ts:50-68`

```
scope.store 变化
→ useSyncExternalStoreWithSelector 通知所有订阅该 scope 的节点
→ 每个节点的 selector 都调用 resolveNodeMeta() + resolveNodeProps()
→ 对每个动态表达式执行 compiled.exec(context, env)
→ Object.is 比对结果，相同则复用引用，React 跳过 re-render
```

这是**拉取模型（Pull Model）**：scope 任何 key 发生变化，所有订阅该 scope 的节点都执行 JavaScript 表达式求值，再用引用比较决定是否 re-render。

`scope.ts:60-66` 中 `createCompositeScopeStore` 同时订阅 `ownStore` 和 `parent.store`，父 scope 任何一个 key 变化，所有子节点的 selector 都会运行。

**代价**：假设页面级 scope 有 50 个子节点，更新 `user.name` 触发 50 次 `resolveNodeMeta + resolveNodeProps` 调用，每次有若干 `compiled.exec()` 执行。复杂度 O(节点数 × 节点表达式数)。

### 这是已知问题，架构文档也指向它

`docs/architecture/performance-design-requirements.md` 第 3 条：

> "Subscription granularity over broad invalidation. Prefer selective subscriptions and scoped updates. Avoid full-tree updates for local state changes."

`docs/architecture/flux-dsl-vm-extensibility.md` §9.4：

> "读数据，只订阅必要 scope。"

这说明团队已经意识到这个方向，但当前实现尚未达到，属于**已识别待解决的短板**。

### 对比 Formily（@formily/reactive）

Formily 使用 MobX 风格的**追踪收集（autorun/computed）**，依赖在首次读取时自动记录：更新 `user.name` 只触发实际依赖它的字段重算，复杂度 O(依赖该 key 的节点数)。这是**推送模型（Push Model）**，大型表单（50+ 字段）下性能差距可达 10-50 倍。

### 结论

当前实现在中小规模场景表现良好（引用比较有效避免 re-render），但不具备规模伸缩性。根本缺陷是**没有依赖追踪**，这是单一影响最大的架构短板，且与项目自身性能要求文档的方向相符。

---

## 二、表达式系统

### 当前实现

源码路径：`packages/flux-formula/src/compile.ts`、`packages/flux-formula/src/evaluate.ts`

- 使用 `amis-formula` 作为底层解析器，在其上包装了编译层
- 编译期把 schema 值分类为 `static-node / expression-node / template-node / array-node / object-node`
- 求值通过 `RuntimeValueState` 做增量计算（`lastValue` + `Object.is` 短路）

### 三个结构性问题

**问题 1：表达式执行内核受上游约束**

`flux-formula/src/compile.ts` 直接调用 `amis-formula` 的 `parse` 和 `evaluate`。`amis-formula` 本身是开源依赖，不存在许可证问题；真正的问题是 Flux 当前仍然把表达式 AST、执行语义和安全边界部分托付给上游实现。也就是说，Flux 有自己的编译包装层，但没有完全拥有表达式 IR 与求值器。

**问题 2：无依赖追踪**

`evaluate.ts:110` 每次都调用 `node.compiled.exec(context, env)` 完整执行表达式，没有记录"这个表达式依赖了哪些 scope key"。（与第一节响应性问题同根，此处为表达式层面的具体原因。）

**问题 3：非标准语法**

用户必须学习专有的 `${expr}` 语法和 amis-formula 内置函数。LowCodeEngine、Retool 使用 JavaScript 子集，用户没有学习成本且有 IDE 支持。

### 对比

| 平台 | 表达式方案 | 依赖追踪 | IDE 支持 |
|------|------------|----------|----------|
| nop-chaos-flux | amis-formula（包装层） | 无 | 无 |
| Formily | @formily/reactive（MobX-like） | 自动 | 无 |
| LowCodeEngine | JavaScript eval | 无 | Monaco Editor |
| Retool | JavaScript | 无 | 自建 IDE |
| react-jsonschema-form | 无内置表达式 | N/A | N/A |

### 改进方向

在 `createFormulaScope` 的 Proxy 中增加依赖收集，在表达式执行期间拦截属性读取并记录到当前节点的依赖集。首次执行后，只有依赖集内的 key 发生变化时才重新求值。这是 Vue 3 `reactive` 和 Valtio 的实现方式，对现有 API 无破坏性变化。

---

## 三、Schema DSL 设计

### 优势

- 编译期字段分类（`meta / prop / region / event`）提前捕获错误
- `classAliases` 支持 CSS 抽象层，是同类平台中少见的设计
- `xui:imports` 命名空间隔离动作设计较优
- Loader 层前移（最终模型原则）将结构复杂性从运行时剥离，是比 AMIS/LowCodeEngine 更先进的架构分工

### 两个结构性问题

**问题 1：无 JSON Schema 标准合规**

Schema 是私有格式。不能用 `ajv` 做 schema 验证，不能用 JSON Schema 生态工具（quicktype、json-schema-to-typescript），与 AI 代码生成工具的集成成本高。

对比 Formily：完全遵循 JSON Schema draft-07，`x-component`、`x-decorator` 作为扩展字段，标准工具链可以直接使用。

**问题 2：Renderer type 命名空间冲突**

`RendererRegistry`（`packages/flux-runtime/src/registry.ts`）是简单的 `Map<string, RendererDefinition>`，没有包级命名空间。两个第三方包同时提供 `type: "button"` renderer 时，后注册的覆盖前者且无警告。

### ~~问题：无 Schema 版本迁移~~（初判误读，已修正）

初版分析将"Schema 没有版本迁移机制"列为缺口。读取 `flux-dsl-vm-extensibility.md` §2.1、§6.7 后确认这是**架构设计的刻意选择**：

> "浏览器端拿到的 schema 必须被视为最终模型……继承/覆盖/删除已经完成。"

版本迁移、schema 继承、默认值展开全部属于 Loader 层职责，运行时不应也不需要处理这些。把它列为运行时缺口是误判。

---

## 四、Action 系统

### 优势

命名空间动作系统（`namespace.method`）+ `xui:imports` 比 AMIS 的扁平 `actionType` 字符串列表干净很多，是业界较好的设计。

`flux-dsl-vm-extensibility.md` §6.4 明确固定了行为解析顺序：`built-in → component:<method> → namespaced actions`，这是正确的优先级设计。

### 三个结构性问题

**问题 1：无并行执行**

`action-runtime.ts` 中 `dispatch(actions[], ctx)` 是纯顺序执行（`for await` 循环），没有 `Promise.all` 等价物，无法并行触发多个 API 请求。

**问题 2：错误处理贫乏**

只有 `continueOnError: boolean`，缺少：重试策略（retry with backoff）、回退动作（fallback action）、条件分支（if/else based on result）、超时控制。

**问题 3：无可复用动作序列**

每个使用点都必须完整写出 action 定义，没有命名动作序列或动作模板机制。（可复用动作序列属于 Loader 层在 schema 中预展开的内容，但运行时支持引用命名序列会更自然。）

### 对比

| 平台 | 并行执行 | 错误处理 | 可复用序列 | 条件分支 |
|------|----------|----------|-----------|---------|
| nop-chaos-flux | 无 | continueOnError | 无 | 无 |
| AMIS | 无 | 有限 | 无 | 有限 |
| Appsmith | 有（JS 对象） | 完整 try/catch | JS 函数 | 完整 |
| Retool | 有（JS 对象） | 完整 | JS 函数 | 完整 |
| LowCodeEngine | 事件总线 | 有限 | 有 | 有限 |

### 改进方向

在 `ActionSchema`（`packages/flux-core/src/types/actions.ts`）中增加：
- `parallel: ActionSchema[]` — 并行执行
- `when: string` — 条件执行（表达式）
- `retry: { times: number; delay: number }` — 重试策略

---

## 五、Form 系统

### 优势

- 19 种验证规则，覆盖率高（`packages/flux-core/src/types/validation.ts`）
- 异步验证的 stale-run 取消机制（`form-runtime-validation.ts` 中 `validationRuns` runId 比较）
- 防抖异步验证
- 委托验证（`RuntimeFieldRegistration`）

### 两个结构性问题

**问题 1：无字段联动**

没有等价于 Formily `x-reactions` 的字段联动机制。当前实现依赖 scope 表达式间接实现，但没有字段间直接的响应关系声明，复杂联动难以维护：

```json
{
  "x-reactions": {
    "dependencies": ["type"],
    "fulfill": { "state": { "required": "{{$deps[0] === 'VIP'}}" } }
  }
}
```

注：字段联动规则也可以在 Loader 层通过 schema 展开提供，但运行时缺乏显式的联动执行机制仍然是短板。

**问题 2：无计算字段**

没有内置的 computed field（值由其他字段派生）。Formily 的 `x-value` 支持响应式计算值，nop-chaos-flux 无对等设计。

---

## 六、可扩展性架构

### 确实优秀的部分

**1. 三棵树分离 + 分层架构**

`flux-dsl-vm-extensibility.md` §3 确立的 ComponentTree / StateTree / ActionTree 三棵树分离，在代码中通过 `ScopeContext`（StateTree）、`ActionScopeContext`（ActionTree）、`ComponentRegistryContext`（ComponentTree）三个独立 context 体现。这是比 AMIS（将所有东西揉进 `props.data`）更清晰的设计。

**2. RendererPlugin**

`beforeCompile / afterCompile / beforeAction / onError` 钩子覆盖了 observability 需求。

**3. 调试器设计**

零开销（disabled 时 `decorateDebuggerEnv` 直接返回原 env）、事件批处理（`queueMicrotask`）、防重复渲染（100ms 节流），设计质量高于大多数开源低代码平台。

**4. 最终模型原则（Loader 前移）**

将结构复杂性（继承、裁剪、默认值展开）前移到 Loader 层，使运行时保持简单可预测，这是比 AMIS/LowCodeEngine 更有前瞻性的架构分工。LowCodeEngine 把很多结构组装逻辑放在浏览器端，导致运行时体积庞大。

### DomainBridge 的适用边界（需要修正的初判）

初版分析将 DomainBridge 列为"业界罕见的优雅设计"。读取 `flux-dsl-vm-extensibility.md` §5.3 后需要修正评价：

文档将 designer-specific bridge 列为**反模式**：

> "一旦给设计器单独设计协议，就会自然走向：designer-specific bridge / designer-specific manifest / designer-specific provider / designer-specific lifecycle。最后设计器会脱离统一组件系统，变成平台里的另一个平台。"

`DomainBridge<TSnapshot, TCommand, TResult>` 接口本身（`{ subscribe, getSnapshot, dispatch }`）是通用的 React-vanilla-store 桥接模式，不存在问题——这其实就是 `useSyncExternalStore` 的标准适配器形态。

但 `flux-react/src/workbench/` 下的 `WorkbenchShell`、`useHostScope`、`useNamespaceRegistration` 作为专门针对设计器类控件的 workbench 抽象层，有向"设计器是特殊平台实体"方向漂移的风险，需要注意保持它们的通用性或逐步归并进普通复杂组件模式。

### 一个结构性短板

**Renderer 元数据不足**

`RendererDefinition`（`packages/flux-core/src/types/renderer-core.ts`）缺少以下工具链所需字段：

```ts
// 当前已有：type, component, regions, fields, validation, wrap...
// 缺失的工具链元数据：
interface RendererDefinition {
  displayName?: string;
  icon?: string;
  category?: string;          // 表单/布局/数据
  propTypes?: PropTypeSchema; // 属性类型（用于 Loader 层工具生成 schema）
  defaultSchema?: SchemaObject;
}
```

即使编辑器不在运行时内，Loader 层工具（schema 生成器、AI 辅助）也需要这些元数据。

### ~~短板：没有视觉 Schema 编辑器~~（初判误读，已修正）

初版分析将"没有视觉编辑器"列为"最大功能缺口"。这是基于把 nop-chaos-flux 与 AMIS/LowCodeEngine 做横向对比时的误判——后两者把编辑器和运行时紧耦合在一起。

`flux-dsl-vm-extensibility.md` §1 明确：Flux 是 DSL 执行运行时，不是设计器平台本体。视觉编辑器属于 Loader 层/设计时工具，是 Flux 上层的应用，而不是 Flux 的职责。这是更清晰的职责分离，不是缺口。

---

## 七、Node-Renderer 的 Context Provider 层叠

`node-renderer.tsx:205-221` 中每个节点渲染都包了 7 层 Context Provider：

```tsx
<NodeMetaContext.Provider>         // ComponentTree
  <ActionScopeContext.Provider>    // ActionTree
    <ComponentRegistryContext.Provider>  // ComponentTree
      <ScopeContext.Provider>      // StateTree
        <FormContext.Provider>     // StateTree (form 子集)
          <PageContext.Provider>   // StateTree (page 子集)
            <ClassAliasesContext.Provider>  // 样式辅助
              {content}
```

`flux-dsl-vm-extensibility.md` §8.2 说"三者不要被'方便使用'而重新揉成一个大上下文对象"，这是针对不要把三棵树语义合并，而非针对 provider 数量本身。减少 provider 层数与保持三棵树分离不矛盾。

React 的 context 没有免费的 subscription batching。对于深层树（嵌套容器 5-10 层），7 层 × N 深度的 provider 链累积成可测量的开销。

**改进方向**：这里不能理解为把热数据揉成一个大 context。更安全的方向是只在同一棵树内部合并**稳定句柄**，例如稳定的 `ScopeRef` / `FormRuntime` / `PageRuntime` 或 `ActionScope` / `ComponentRegistry` 组合容器，并确保 provider value 经过 memo 化；`resolvedProps`、`resolvedMeta`、scope snapshot 这类高频热值不应放进合并后的 context。否则确实会把一点点变化扩散成大片 context 失效。

---

## 综合评分（修订版）

| 维度 | nop-chaos-flux | AMIS | Formily | LowCodeEngine | 评分说明 |
|------|:---:|:---:|:---:|:---:|---------|
| **TypeScript 类型安全** | ★★★★★ | ★★ | ★★★★ | ★★★ | 全面 strict 泛型，无 any 泄漏 |
| **架构分层清晰度** | ★★★★★ | ★★ | ★★★★ | ★★★ | 三棵树分离 + Loader 前移原则 |
| **编译期优化** | ★★★★ | ★★ | ★★★ | ★★★ | 两阶段编译是优势 |
| **响应式粒度** | ★★ | ★★ | ★★★★★ | ★★★ | 无依赖追踪是核心缺陷 |
| **Form 能力** | ★★★★ | ★★★ | ★★★★★ | ★★★ | 缺字段联动 |
| **Action 系统** | ★★★ | ★★ | N/A | ★★★ | 缺并行/重试/分支 |
| **可观测性/调试** | ★★★★★ | ★★ | ★★★ | ★★★ | 调试器是明显优势 |
| **Renderer 生态** | ★★ | ★★★★★ | ★★★★ | ★★★★ | 内置 renderer 数量少 |
| **标准合规性** | ★★ | ★★ | ★★★★★ | ★★★ | 无 JSON Schema 合规 |
| **运行时扩展性** | ★★★★ | ★★★ | ★★★★ | ★★★★★ | 最小扩展面 + xui:imports |

注：移除了"视觉编辑器"维度（不在运行时职责范围内）；新增"架构分层清晰度"维度。

---

## 优先改进建议（按影响/成本比排序）

### P1：表达式依赖追踪

在 `createFormulaScope`（`packages/flux-formula/src/scope.ts`）的 Proxy 中增加依赖收集。首次执行后，只有依赖集内的 key 变化时才重新求值。对现有 API 无破坏性变化，但能将大型页面的响应性开销从 O(n) 降至 O(依赖者数)。与 `performance-design-requirements.md` 第 3 条要求方向一致。

### P2：Action 系统增强

在 `ActionSchema`（`packages/flux-core/src/types/actions.ts`）中增加：
- `parallel: ActionSchema[]` — 并行执行
- `when: string` — 条件执行（表达式）
- `retry: { times: number; delay: number }` — 重试策略

### P3：Renderer 元数据协议

在 `RendererDefinition`（`packages/flux-core/src/types/renderer-core.ts`）中增加 `displayName`、`category`、`propTypes`、`defaultSchema` 字段。服务于 Loader 层工具（schema 生成、AI 辅助），而非运行时本身。

### P4：谨慎收敛 Context Provider 层数

这里只能合并低频、稳定引用的句柄型 context，不能把高频热值合成一个大 provider value。否则 React context 的引用失效会把局部变化扩散成更大的重渲染面。换句话说，这一项只是在不扩大失效面的前提下减少 provider 深度，优先级也低于订阅粒度修正。

---

## 具体落地修正清单（对应代码位置）

下面不是泛泛的方向，而是按当前实现可以直接下手的修改点整理的落地清单。

### 1. 为表达式求值增加依赖收集与依赖缓存

目标文件：`packages/flux-core/src/types/compilation.ts`、`packages/flux-formula/src/scope.ts`、`packages/flux-formula/src/evaluate.ts`

当前阻塞点：

- `LeafValueState` 只有 `initialized` 和 `lastValue`，没有依赖信息。
- `createFormulaScope()` 的 Proxy `get/has` 只读值，不记录读取过哪些 path。
- `evaluateLeaf()` 每次都直接 `node.compiled.exec(context, env)`，执行后不保留依赖集合。

建议修改：

- 在 `LeafValueState` 增加依赖字段，例如：

```ts
interface LeafValueState<T = unknown> {
  kind: 'leaf-state';
  initialized: boolean;
  lastValue?: T;
  dependencies?: readonly string[];
}
```

- 在 `packages/flux-formula/src/scope.ts` 为 `createFormulaScope()` 增加可选的依赖收集器；`get` 和 `has` 访问字符串 key 时记录 path。
- 在 `packages/flux-formula/src/evaluate.ts` 的 `evaluateLeaf()` 中用一次性 collector 包裹 `compiled.exec()`，把本次执行读到的 path 去重后写回 `stateNode.dependencies`。

预期收益：

- 先把"表达式依赖了哪些 key"显式化，这是后续 selective subscription 的前提。
- 这一层改动可以先独立落地，不必一次把订阅系统全部重写完。

### 2. 扩展 ScopeStore 订阅协议，让变更携带 changed paths

目标文件：`packages/flux-core/src/types/scope.ts`、`packages/flux-runtime/src/scope.ts`

当前阻塞点：

- `ScopeStore.subscribe(listener)` 只有无参 listener，无法告诉订阅者这次到底是哪个 key 变了。
- `createCompositeScopeStore()` 只是把 parent/own 两个 store 的通知原样转发，子树只能全量失效。

建议修改：

- 为 `ScopeStore` 增加变更描述结构，例如：

```ts
interface ScopeChange {
  paths: readonly string[];
  sourceScopeId?: string;
}

interface ScopeStore<T = Record<string, any>> {
  getSnapshot(): T;
  setSnapshot(next: T, change?: ScopeChange): void;
  subscribe(listener: (change: ScopeChange) => void): () => void;
}
```

- 在 `packages/flux-runtime/src/scope.ts` 的 `update()` 中为单路径写入传入 `paths: [path]`。
- 在 `merge()` 中至少上报顶层 keys；后续如果需要可继续细化到 path 级别。
- 在 `createCompositeScopeStore()` 中保留父/子来源信息，避免父 scope 任意变化都被当成匿名全量失效。

预期收益：

- React 层终于能知道"这次变化和我有没有关系"。
- 这也是性能文档里 selective subscription 要求真正落地的接口基础。

### 3. 在 NodeRenderer 侧按依赖集做选择性失效

目标文件：`packages/flux-react/src/node-renderer.tsx`

当前阻塞点：

- `useSyncExternalStoreWithSelector()` 现在订阅的是整个 `scope.store`，一旦收到通知就执行 `resolveNodeMeta()` 和 `resolveNodeProps()`。
- 即使最后 `prev.meta === next.meta && prev.resolvedProps === next.resolvedProps`，前面的表达式求值成本已经发生。

建议修改：

- 在 node runtime state 中汇总 meta/props 动态值的依赖集合。
- 让 `subscribe` 接收 `ScopeChange`，如果 `change.paths` 与节点依赖集无交集，则直接跳过这轮解析。
- 初始阶段可以先按顶层 key 交集做粗筛，再逐步收紧到完整 path 匹配；这样改动风险更低。

预期收益：

- 把当前"所有节点都跑 selector"收敛为"只有依赖命中的节点才继续求值"。
- 这是当前最值得优先进入实现计划的性能修正点。

### 4. 扩展 ActionSchema，补齐最基础的控制流能力

目标文件：`packages/flux-core/src/types/actions.ts`、`packages/flux-runtime/src/action-runtime.ts`

当前阻塞点：

- `dispatch()` 在 `packages/flux-runtime/src/action-runtime.ts:479-506` 中是严格串行循环。
- 现有控制流只有 `continueOnError` 和 `then`，表达能力不够。

建议修改：

- 在 `ActionSchema` 增加最小必要字段：

```ts
interface ActionSchema extends SchemaObject {
  action: string;
  when?: string;
  parallel?: ActionSchema[];
  retry?: { times: number; delay?: number };
  timeout?: number;
}
```

- 在 `runSingleAction()` 前先处理 `when`，条件不满足时返回 `{ ok: true, cancelled: true }` 或专门的 skipped 结果。
- 在 `dispatch()` 中支持 `parallel` 分支，语义先限定为 `Promise.all` + 聚合结果，不要一开始就做复杂 DAG。
- 在 `runBuiltInAction/runComponentAction/runNamespacedAction` 外围增加统一 retry 包装，而不是把 retry 散落到每类 action 内部。

预期收益：

- 让 declarative action 真正具备最小可用的工作流能力。
- 仍然保持 Flux 的轻量动作模型，不会一下演化成另一套流程引擎。

### 5. 为 RendererDefinition 补充工具链元数据

目标文件：`packages/flux-core/src/types/renderer-core.ts`

当前阻塞点：

- `RendererDefinition` 目前只覆盖运行时渲染契约。
- Loader、schema 生成器、AI 辅助工具仍缺少稳定的 renderer 描述信息来源。

建议修改：

- 在 `RendererDefinition` 增加不影响运行时的可选元数据：

```ts
interface RendererDefinition<S extends BaseSchema = BaseSchema> {
  type: S['type'];
  component: ComponentType<RendererComponentProps<any>>;
  displayName?: string;
  icon?: string;
  category?: string;
  defaultSchema?: SchemaObject;
  propSchema?: SchemaObject;
}
```

- `propSchema` 比 `propTypes` 更贴近当前 schema-first 体系，也更方便后续让 Loader 或 AI 生成默认片段。

预期收益：

- 让运行时注册表可以兼作工具链事实来源，而不是再维护一套平行 manifest。
- 这也有助于避免 workbench/designer 侧再次长出独立协议。

### 6. 谨慎收敛 NodeRenderer 的 provider 组合方式，但不要破坏三棵树语义

目标文件：`packages/flux-react/src/contexts.ts`、`packages/flux-react/src/node-renderer.tsx`

当前阻塞点：

- `contexts.ts` 中 `ScopeContext`、`FormContext`、`PageContext`、`ActionScopeContext`、`ComponentRegistryContext`、`NodeMetaContext`、`ClassAliasesContext` 全部独立存在。
- `node-renderer.tsx:205-220` 每个节点都逐层包裹这些 provider。

建议修改：

- 不要把三棵树揉成一个 mega context，也不要把 `resolvedMeta`、`resolvedProps`、scope snapshot 这类热值塞进去。
- 只有在 provider value 本身是稳定引用时，才适合合并承载容器。例如把 `ScopeRef/FormRuntime/PageRuntime` 这类句柄型对象组合成 `RenderStateContext`，把 `ActionScope/ComponentRegistry` 组合成 `RenderCapabilityContext`；并且 provider value 必须 `useMemo` 保持引用稳定。
- `ClassAliasesContext` 这种派生值要单独评估，它不一定适合并入通用容器，因为 class alias 解析链本身可能按节点变化。
- 先做 provider 数量收敛，不急着一次性改所有 hooks API；可先在 hooks 层做兼容包装。

预期收益：

- 在不扩大 context 失效面的前提下降低深层树的 provider 嵌套成本。
- 仍然符合 `flux-dsl-vm-extensibility.md` 中三棵树分离的原则，因为这里合并的是稳定句柄容器，不是把语义模型和热状态重新揉成一个对象。

### 7. 重新约束 workbench 抽象，避免演化成 designer-specific 平台层

目标文件：`packages/flux-react/src/workbench/*`

当前阻塞点：

- `WorkbenchShell` 本身作为纯 React 布局组件没有问题。
- 风险在于 `workbench/` 如果继续增长 host scope、namespace registration、designer lifecycle 等专门协议，就会与 `flux-dsl-vm-extensibility.md` 反对的 designer-specific bridge 路线靠近。

建议修改：

- 保持 `WorkbenchShell` 只做布局与通用 UI 壳层，不承载特定领域协议。
- 若后续确实需要 host-bridge 行为，优先下沉为普通复杂控件共享 hook，而不是在 `workbench/` 名义下扩成二级平台。
- 文档上也应明确：`workbench` 是表现层复用，不是 Flux 的第四棵树。

预期收益：

- 避免架构边界再次漂移。
- 让复杂设计器控件继续留在"特殊 schema 类型 + 通用 runtime 合同"这条正确轨道上。

---

## 初版分析与架构文档的差异对照表

| 初版结论 | 修正后结论 | 来源文档 |
|---------|-----------|---------|
| 无视觉编辑器是最大功能缺口 | 刻意设计，不在运行时职责 | `flux-dsl-vm-extensibility.md` §1 |
| 无 Schema 版本迁移是短板 | 属于 Loader 层职责，运行时不应承担 | `flux-dsl-vm-extensibility.md` §6.7 |
| DomainBridge 是优雅创新 | 通用桥接模式可以保留，但 workbench 抽象需警惕漂移 | `flux-dsl-vm-extensibility.md` §5.3 |
| 响应式粒度粗是原创发现 | 项目自身性能文档也要求选择性订阅，属于已知待解决问题 | `performance-design-requirements.md` §3 |
| Context Provider 层叠改进方向 | 方向仍然成立，但需注意保持三棵树语义分离 | `flux-dsl-vm-extensibility.md` §8.2 |
