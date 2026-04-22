# v9 设计 vs nop-chaos-flux 当前实现 —— 对比分析

> **文档性质**: 将 v9 理想化设计与 nop-chaos-flux 当前架构和实现进行系统性对比，识别差距、共识和互补点。
>
> **对比原则**: 对比基于实际架构文档和代码组织，不基于假设。对两方均保持诚实评估。

---

## 1. 总体架构对比

### 1.1 架构理念

| 维度 | nop-chaos-flux (当前) | v9 (理想) |
|------|----------------------|-----------|
| **设计起源** | 从 AMIS 重写演化而来，逐步提炼 | 从零开始的理论设计 |
| **核心范式** | 编译一次执行多次 + Scope 链 + 依赖收集 | 编译/实例化/执行三阶段分离 + Signal 细粒度响应式 |
| **设计方法** | 实用主义，从实际需求驱动，渐进演化 | 理论驱动，先设计后实现，分阶段交付 |
| **文档风格** | 详尽的实现导向文档（模块边界、文件放置规则） | 架构导向文档（接口定义、行为规则） |

### 1.2 分层对比

| 层 | nop-chaos-flux | v9 |
|----|---------------|-----|
| **Schema 编译** | `SchemaCompiler` → `TemplateNode` → `CompiledTemplate` | 四阶段管线：Parse → Bind → Optimize → Emit IR |
| **值编译** | `CompiledValueNode` → `CompiledRuntimeValue`（static/dynamic） | `SchemaValue` 五变体：Literal/Expr/Template/Computed/Stream |
| **执行** | `RendererRuntime` + `NodeRenderer` 单节点编排 | `RuntimeInstance` + Reactor Engine |
| **渲染** | React 专用，深度集成 hooks | React MVP，预留多框架适配（V4） |

---

## 2. 子系统逐项对比

### 2.1 数据环境（Scope）

| 维度 | nop-chaos-flux | v9 | 分析 |
|------|---------------|-----|------|
| **核心抽象** | `ScopeRef`（纯数据查找/更新） | `Scope` + `Signal<T>` | v9 更细粒度：每个数据路径是独立 Signal |
| **继承** | 原型链支持（`readVisible` 零分配） | parent 链 + 遮蔽 | 机制等价，当前实现的原型链更高效 |
| **隔离** | 行 Scope 隔离 | 行 Scope 完全隔离 + projections | 概念等价，v9 的 projection 更显式 |
| **写入** | `scope.update()` | `scope.set()` / `scope.mutate()` / `ScopeTransaction` | v9 多了事务和结构化突变 |
| **路径解析** | `scope.get(path)` 沿链查找 | 同上 | 等价 |
| **快照** | `materializeVisible()`（惰性，仅需要时） | 无对应 | 当前实现更成熟——v9 未定义快照 API |
| **响应式原语** | 无独立 Signal，依赖 `ScopeStore.subscribe()` + `ScopeChange.paths` | `Signal<T>` 为一等原语 | **关键差异**：v9 的 Signal 是独立于 Scope 的响应式单元 |

**评估**：
- **当前实现优势**：`ScopeRef` 保持纯数据设计（无行为注册），原型链零分配快照，`materializeVisible()` 的惰性策略
- **v9 优势**：Signal 提供更精确的更新粒度，事务支持，结构化突变（Immer-style）
- **共识**：两者都认同 Scope 应保持纯数据、支持继承和隔离、通过路径访问

### 2.2 响应式系统

| 维度 | nop-chaos-flux | v9 | 分析 |
|------|---------------|-----|------|
| **更新粒度** | 节点级（`NodeRenderer` 检查依赖路径交集） | Signal 级（每个路径独立 Signal） | v9 理论上更精确 |
| **依赖收集** | `EvalContext.collector` + `ScopeDependencyCollector` | 模块级 `activeTracker` + Signal.get() 自动注册 | 机制等价，实现策略不同 |
| **订阅方式** | `useScopeSelector(selector)` 订阅 scope 快照 | `useSignalValue(signal)` 订阅单个 Signal | 当前更高级（selector 封装），v9 更底层 |
| **批量更新** | 依赖 Zustand store 的批量通知 | microtask 批量合并 | 机制等价 |
| **引用稳定** | 动态结果未变时复用上次引用 | Signal 的 `lastNotifiedValue` + `Object.is` | 等价策略 |

**评估**：
- **当前实现优势**：`useScopeSelector` 提供了 selector 级别的订阅抽象，用户不需要直接操作 Signal
- **v9 优势**：Signal 作为一等原语可以独立于 Scope 使用，理论上更新粒度更精确
- **关键问题**：当前实现的 `ScopeChange.paths` + 依赖路径交集检查已经实现了"只更新受影响的节点"。v9 的 Signal 是否真的带来了可测量的性能提升？这需要基准测试验证。

### 2.3 表达式引擎

| 维度 | nop-chaos-flux | v9 | 分析 |
|------|---------------|-----|------|
| **包** | `@nop-chaos/flux-formula` | 内置于核心 runtime | 当前独立包更清洁 |
| **编译** | `FormulaCompiler` + `ExpressionCompiler` | 表达式编译为闭包 | 等价策略 |
| **安全** | 禁止 `new Function` / `with(scope)` | 同上 + 自定义树遍历解释器 | 等价原则 |
| **管道操作** | 无明确文档 | `items \| filter(...) \| map(...)` | v9 新增 |
| **空值安全** | 依赖 `getIn` 工具函数的空值处理 | 表达式引擎内置空值安全 | v9 更系统化 |
| **类型推断** | 无 | 有限的编译期类型检查 | v9 新增（但 MVP 不一定实现） |
| **内置函数** | 通过 `flux-formula` 提供 | 显式列举（数学/字符串/集合/日期/对象） | v9 更明确 |

**评估**：
- **当前实现优势**：独立的 `flux-formula` 包，职责分离更清晰
- **v9 优势**：管道操作符、系统化空值安全、显式的函数列表
- **共识**：禁止动态代码生成，编译一次执行多次

### 2.4 编译管线

| 维度 | nop-chaos-flux | v9 | 分析 |
|------|---------------|-----|------|
| **流程** | `SchemaCompiler.compile()` → `TemplateNode` → `CompiledTemplate` | 四阶段：Parse → Bind → Optimize → Emit | 当前更简洁，v9 更结构化 |
| **中间表示** | `CompiledValueNode`（内部）+ `CompiledRuntimeValue`（运行时） | `CompiledIR` | 等价概念 |
| **字段分类** | `SchemaFieldRule` 六类（meta/value/region/value-or-region/event/ignored） | `SchemaValue` 五变体 | **当前更成熟**：六类分类覆盖了更多实际场景 |
| **Region 提取** | 顶层 + 深层嵌套（`table.columns[].label`） | 顶层 + RegionDef | 当前更完善 |
| **诊断** | 编译期诊断收集 | 四层诊断（type/reference/performance/security） | v9 更全面 |
| **字段元数据** | `RendererDefinition.fields` 声明式定义 | `ComponentContract.propsSchema` | 等价理念 |

**评估**：
- **当前实现优势**：`SchemaFieldRule` 六类分类更精细，深层 Region 提取已实现，`CompiledSchemaNode` 已消除
- **v9 优势**：四阶段管线更结构化，诊断更全面
- **共识**：编译一次执行多次，字段分类驱动编译

### 2.5 动作系统

| 维度 | nop-chaos-flux | v9 | 分析 |
|------|---------------|-----|------|
| **派发路径** | 三路径：内置 → 组件实例 → 命名空间 | 三路径：Effect Handler → 组件实例 → 命名空间 | 等价架构 |
| **控制流** | `then`/`continueOnError` | `then`/`catch`/`finally`/`parallel`/`race` | v9 更丰富 |
| **异步** | 请求取消、防抖 | 请求取消、防抖、重试策略、超时 | v9 更完善 |
| **结果传播** | `prevResult` 传播 | `result`/`prevResults[]`/`error` 链 | v9 更系统化 |
| **副作用隔离** | `ActionRuntimeAdapter` 边界 | `Effect Channel` 可拦截管道 | **理念等价，v9 更显式** |
| **Action 编译** | `action-compiler.ts` 预编译 | 编译期绑定 | 等价 |

**评估**：
- **当前实现优势**：`ActionRuntimeAdapter` 已实现，`ActionScope` 边界清晰，`xui:imports` 集成
- **v9 优势**：Effect Channel 更显式（可拦截/可替换/可测试），控制流更丰富（`catch`/`finally`/`race`）
- **共识**：三路径派发，动作预编译，副作用隔离

### 2.6 表单与校验

| 维度 | nop-chaos-flux | v9 | 分析 |
|------|---------------|-----|------|
| **表单运行时** | `FormRuntime` extends `ValidationScopeRuntime` | `FormState`（Signal-based） | 当前更成熟（Phase 2 实现中） |
| **校验模型** | `CompiledFormValidationModel` 编译图 + 运行时参与 | `ValidationGraph` DAG + 增量校验 | 等价理念 |
| **校验时机** | `showErrorOn: ['touched', 'submit']` | `trigger: submit/change/blur/manual` | 不同分类维度 |
| **异步校验** | generation-aware, stale-run suppression | 取消机制 | 等价策略 |
| **草稿隔离** | 渲染器级别（临时 FormRuntime） | `DraftFormHandle` commit/discard | v9 更显式 |
| **跨字段依赖** | 三源合并（规则/表达式/聚合），owner-local | `crossFields` 声明 + DAG 传递闭包 | 当前更成熟 |
| **子校验协调** | `ChildValidationContract`（ignore/summary-gate/recurse-submit） | 未明确 | **当前更完善** |
| **错误结构** | `ValidationError` + `sourceKind` 区分 | `FieldError` + `severity` | 等价 |

**评估**：
- **当前实现优势**：`ValidationScopeRuntime` 基类使校验不限于表单，`ChildValidationContract` 子校验协调，运行时参与模型更成熟，Phase 2 已在实现中
- **v9 优势**：`DraftFormHandle` 更显式，校验 DAG 概念更清晰
- **共识**：编译期校验图 + 运行时执行，增量校验，异步校验取消

### 2.7 渲染系统

| 维度 | nop-chaos-flux | v9 | 分析 |
|------|---------------|-----|------|
| **组件契约** | `RendererComponentProps<S>` + `RendererDefinition` | `ComponentContract<P>` + `RendererProps<P>` | 等价理念 |
| **Props/Meta 分离** | `props`（业务）+ `meta`（控制）+ `regions` + `events` + `helpers` | 同上 | **完全一致** |
| **Region 句柄** | `RenderRegionHandle.render({ bindings, instancePath })` | `RegionHandle.render(overrides?)` | 等价 |
| **参数化区域** | `$slot` frame 绑定 | `$slot` 参数化 | 等价 |
| **组件分类** | instance/flux-owner/domain-host 三类 | layout/widget/editor/data/form 五类 | 分类维度不同 |
| **React 集成** | 深度集成（8+ hooks） | `useSignalValue` + 标准 hooks | 当前更丰富 |
| **Surface 管理** | `SurfaceRuntime` + `SurfaceStore`，栈式 | `SurfaceManager` + 栈式 | 等价 |
| **DOM 调试** | `cid` + `data-node-id` | `data-node-id` + `nodeId` | 等价 |
| **生命周期** | `onMount`/`onUnmount` on `TemplateNode` | `lifecycle.onMount`/`onUnmount` | 等价 |

**评估**：
- **当前实现优势**：8+ 专用 hooks，三类渲染器分类更贴合实际，`RenderRegionHandle` 更成熟，React 上下文拆分更精细（8 个独立 context）
- **v9 优势**：`ComponentContract` 接口更简洁，预留多框架适配
- **共识**：Props/Meta/Regions/Events 分离，参数化区域，栈式 Surface 管理

### 2.8 数据源

| 维度 | nop-chaos-flux | v9 | 分析 |
|------|---------------|-----|------|
| **管理器** | `DataSourceRuntime` + `SourceRegistry` | `DataSourceManager` + `DataSourceHandle` | 等价 |
| **类型** | 未在文档中详述 | fetch/poll/computed/ws/sse/custom | v9 更全面 |
| **刷新策略** | 依赖变更触发 | dependency/interval/manual + 缓存 + staleWhileRevalidate | v9 更丰富 |
| **加载状态** | `SourceTransientState` (loading/error/status) | Signal-based (data/loading/error) | 等价 |
| **请求取消** | 有（AbortController） | 有（AbortController，显式协议） | 等价 |
| **缓存** | `api-cache.ts` | `CachePolicy` (TTL + staleWhileRevalidate) | v9 更系统化 |
| **级联交互** | 隐式（依赖变更链） | 显式时序图 + 取消协议 | v9 更明确 |

**评估**：
- **当前实现优势**：已实现，`api-cache.ts` 存在
- **v9 优势**：显式的刷新策略模型，缓存策略更系统化，级联交互时序图

### 2.9 错误处理

| 维度 | nop-chaos-flux | v9 | 分析 |
|------|---------------|-----|------|
| **表达式错误** | 抛出异常 | 返回 `undefined` + Reactor error 状态 | v9 更宽容（不崩溃） |
| **结构化错误** | `ValidationError` + `sourceKind` | `FrameworkError` + `code`/`category`/`nodeId` | v9 更系统化 |
| **错误边界** | 依赖 React Error Boundary | 三层 Error Boundary + `SchemaErrorBoundary` 实现 | v9 更明确 |
| **校验错误** | `FieldError` + `sourceKind` | `FieldError` + `severity` | 等价 |
| **Action 错误** | `ActionResult` 分类 | `ActionResult.status` (success/failure/skipped/cancelled) | v9 更系统化 |

**评估**：
- **当前实现优势**：已实现，`sourceKind` 区分错误来源更实用
- **v9 优势**：三层错误边界，`FrameworkError` 统一错误格式，表达式空值安全
- **共识**：结构化错误，校验错误独立于渲染错误

### 2.10 测试

| 维度 | nop-chaos-flux | v9 | 分析 |
|------|---------------|-----|------|
| **框架** | Vitest | Vitest | 一致 |
| **DOM 独立** | 核心逻辑大部分可独立测试 | 核心 runtime 完全无 DOM 依赖 | v9 目标更纯粹 |
| **Mock** | 宿主 mock | `createMockHost()` | 等价理念 |

### 2.11 样式系统

| 维度 | nop-chaos-flux | v9 | 分析 |
|------|---------------|-----|------|
| **基础** | TailwindCSS + shadcn/ui | CSS 变量 + 宿主样式系统 | 当前更具体 |
| **布局 vs 控件** | 布局只输出标记类名，控件自包含 | 同上 | **完全一致** |
| **语义间距** | `stack-*`/`hstack-*` 别名 | schema 驱动 | 当前更成熟 |
| **classAliases** | 有（继承 + 展开 + 循环检测） | 未涉及 | 当前更完善 |
| **标记类名** | `nop-` 前缀，`data-slot`，`data-*` | `markerClass` | 等价理念 |
| **主题** | 无 ThemeProvider，CSS 变量对接 | 同上 | **完全一致** |

**评估**：
- **当前实现优势**：完整的 TailwindCSS 集成，`classAliases` 系统，shadcn/ui 组件库，语义间距别名
- **v9 优势**：更通用的主题对接模型
- **共识**：无运行时主题系统，标记类名约定，布局/控件分离

---

## 3. v9 独有创新（当前项目缺失）

| # | 创新 | 描述 | 采纳价值 |
|---|------|------|---------|
| 1 | **Signal 一等原语** | 每个数据路径是独立 Signal，可独立订阅和派生 | **观察级**：当前 ScopeChange.paths + 依赖路径交集已实现节点级更新粒度，Signal 的边际收益需基准测试验证 |
| 2 | **Effect Channel** | 副作用通过可拦截管道，可替换/可测试 | **高**：改善动作系统的可测试性 |
| 3 | **三层 Error Boundary** | 表达式/组件/页面三层隔离 + React Error Boundary 实现 | **高**：当前错误处理较弱 |
| 4 | **空值安全表达式** | `user.address.city` 遇到 null 返回 undefined | **中高**：减少运行时崩溃 |
| 5 | **管道操作符** | `items \| filter(...) \| map(...)` | **中**：改善表达式表达力 |
| 6 | **ScopeTransaction** | 事务性批量更新 + rollback | **中**：表单提交等场景有用 |
| 7 | **UndoManager** | 基于 Scope 事务的撤销/重做 | **中**：企业表单常见需求 |
| 8 | **DraftFormHandle** | 显式的草稿提交/丢弃 | **中**：当前已实现类似能力 |
| 9 | **DataSource 级联交互协议** | 显式时序图 + 取消协议 | **中**：当前隐式处理 |
| 10 | **Renderer Ecosystem 计划** | MVP 20 渲染器 + V2 40+ + CRUD 抽象 | **中**：当前项目正在建设中 |

---

## 4. 当前项目独有优势（v9 缺失）

| # | 优势 | 描述 | v9 如何借鉴 |
|---|------|------|------------|
| 1 | **SchemaFieldRule 六类分类** | meta/value/region/value-or-region/event/ignored 更精细 | v9 应采纳六类分类 |
| 2 | **深层 Region 提取** | `table.columns[].label` 等嵌套提取已实现 | v9 需补充 |
| 3 | **ValidationScopeRuntime 基类** | 校验不限于表单（过滤面板、搜索面板等） | v9 应采纳——校验是通用能力 |
| 4 | **ChildValidationContract** | 子校验协调（ignore/summary-gate/recurse-submit） | v9 需补充 |
| 5 | **30+ 专用 React Hooks** | useScopeSelector/useCurrentForm/useFieldError/useRenderFragment 等 | v9 MVP 缺少这些实用 hook |
| 6 | **12 个独立 React Context** | runtime/scope/action-scope/component-registry/form/page/surface 等精细拆分 | v9 未细化到这个程度 |
| 7 | **classAliases 系统** | 别名继承、展开、循环检测 | v9 未涉及 |
| 8 | **三类渲染器分类** | instance/flux-owner/domain-host 覆盖更复杂场景 | v9 的五类分类维度不同但缺少 domain-host |
| 9 | **materializeVisible()** | 惰性快照，仅需要时生成 | v9 缺少快照 API |
| 10 | **Phase 2 校验实现进行中** | 不是设计文档，是正在落地的代码 | v9 是纯设计 |
| 11 | **ActionRuntimeAdapter 边界** | 动作框架与运行时效应分离 | v9 的 Effect Channel 是等价理念但更泛化 |
| 12 | **Spreadsheet Canvas 混合 CSS** | 高性能域专用渲染策略 | v9 未涉及性能关键域 |

---

## 5. 关键差距分析

### 5.1 最大差距：v9 是设计，当前项目是运行中的代码

这是最根本的差异。nop-chaos-flux 是一个**正在开发的、有实际代码和测试的项目**：
- 有完整的包结构（14+ workspace packages）
- 有实际的 TypeScript 实现
- 有 Vitest 测试
- 有 playground 应用
- 有日常开发日志

v9 是一个**从零开始的设计文档**，没有代码、没有测试、没有验证过的原型。

**这意味着**：v9 中的许多"优势"是理论性的，需要实际实现才能验证。而当前项目的"劣势"可能只是文档未充分描述的部分。

### 5.2 架构理念差距

| 差距 | v9 理念 | 当前实现 | 桥接路径 |
|------|---------|---------|---------|
| **Signal vs ScopeStore** | 每个路径独立 Signal | Zustand-style Store + paths 通知 | 在 ScopeStore 内部引入 Signal 粒度 |
| **Effect Channel vs ActionAdapter** | 所有副作用经过可拦截管道 | ActionRuntimeAdapter 边界 | 将 ActionAdapter 泛化为 Effect Channel |
| **四阶段编译 vs 单步编译** | 结构化多阶段 | `SchemaCompiler.compile()` 单步 | 单步编译器内部可渐进引入阶段化 |
| **表达式空值安全** | 内置 null-safe | 依赖工具函数 | 在 `flux-formula` 中引入空值安全模式 |

### 5.3 不存在差距的领域

以下领域两方设计理念完全一致，不需要改动：

1. **编译一次执行多次**
2. **Scope 继承 + 遮蔽 + 隔离**
3. **Props/Meta/Regions/Events 分离**
4. **三路径动作派发**
5. **布局只输出标记类名，控件自包含**
6. **无运行时主题系统**
7. **禁止 new Function / eval**
8. **Surface 栈式管理 + 独立 Scope**
9. **校验编译图 + 增量校验**

---

## 6. 采纳建议

### 6.1 高价值采纳（建议纳入当前项目）

| v9 理念 | 采纳方式 | 工作量 |
|---------|---------|--------|
| **Effect Channel** | 将 `ActionRuntimeAdapter` 泛化为可拦截管道 | 中 |
| **空值安全表达式** | 在 `flux-formula` 中引入 null-safe 求值路径 | 低 |
| **三层 Error Boundary** | 添加 `SchemaErrorBoundary` + Reactor error 状态 | 中 |
| **管道操作符** | 在 `flux-formula` 中添加 pipe 表达式类型 | 低 |
| **ScopeTransaction** | 在 Scope 上添加 begin/commit/rollback | 低 |
| **结构化错误 FrameworkError** | 统一表达式/动作/校验错误格式 | 低 |

### 6.2 中等价值采纳（可渐进引入）

| v9 理念 | 采纳方式 | 备注 |
|---------|---------|------|
| **Signal 一等原语** | 在 ScopeStore 内部引入 Signal，不改变外部 API | 需要基准测试验证收益 |
| **UndoManager** | 基于 ScopeTransaction 构建 | 仅在有需求时实现 |
| **DataSource 级联协议** | 文档化当前隐式行为 | 低成本高收益 |
| **CRUD 领域抽象** | 基于 table + form 组合实现 | 已有基础 |

### 6.3 不建议采纳的 v9 理念

| v9 理念 | 原因 |
|---------|------|
| **多目标编译** | 当前项目 React 深度集成，多框架适配 ROI 低 |
| **四阶段编译管线** | 当前单步编译器已够用，重构为四阶段 ROI 低 |
| **类型推断引擎** | 投入大收益小，JSON Schema 验证更实用 |
| **时间旅行调试** | 高实现成本，devtools 扩展已足够 |
| **SSR** | 非当前优先级 |

---

## 7. 总结判断

### 7.1 架构成熟度对比

| 维度 | nop-chaos-flux | v9 | 优势方 |
|------|---------------|-----|--------|
| **理论完备性** | 7/10 | 8.5/10 | v9（更系统的理论框架） |
| **实现成熟度** | 7/10 | 0/10 | 当前项目（有实际代码） |
| **错误处理** | 5/10 | 8/10 | v9（三层 Error Boundary） |
| **副作用管理** | 7/10 | 8.5/10 | v9（Effect Channel） |
| **校验系统** | 8/10 | 7/10 | 当前项目（ValidationScopeRuntime 更成熟） |
| **渲染系统** | 8.5/10 | 7/10 | 当前项目（30+ hooks + 12 contexts + 三类渲染器） |
| **编译系统** | 8/10 | 7.5/10 | 当前项目（六类字段分类 + 深层 Region） |
| **样式系统** | 9/10 | 5/10 | 当前项目（完整 TailwindCSS + classAliases） |
| **可测试性** | 7/10 | 8.5/10 | v9（核心无 DOM 依赖目标更纯粹） |
| **渐进采纳** | 6/10 | 8/10 | v9（明确的渐进采纳指南） |

> **注意**：v9 分数反映设计意图，当前项目分数反映已验证的实现。"文档诚实度"不纳入评分——比较设计文档的自省性和实现项目的文档性是不同维度。

### 7.1.1 域覆盖范围（v9 未涉及的领域）

当前项目在以下领域有实际实现，v9 完全未涉及：

| 领域 | 当前包 | 状态 |
|------|--------|------|
| 流程设计器 | `flow-designer-core` + `renderers` | 已实现 |
| 电子表格 | `spreadsheet-core` + `renderers` | 已实现 |
| 报表设计器 | `report-designer-core` + `renderers` | 已实现 |
| 文档编辑器 | `word-editor-core` + `renderers` | 已实现 |
| 代码编辑器 | `flux-code-editor` | 已实现 |
| 调试器 | `nop-debugger` | 已实现 |
| 国际化 | `flux-i18n` (zh-CN/en-US) | 已实现 |
| UI 组件库 | `ui` (shadcn/ui) | 已实现 |
| Playground | `flux-playground` | 已实现 |

### 7.2 最终判断

**v9 是一个高质量的架构设计，但它应该作为当前项目的演进指南，而非替代方案。**

理由：
1. **核心架构理念高度一致**：两方在编译一次执行多次、Scope 模型、三路径派发、Props/Meta 分离等核心决策上完全一致。这说明从需求出发推导出的架构选择是稳健的
2. **v9 的优势在于"补丁"而非"重构"**：Effect Channel、Error Boundary、空值安全、管道操作符都可以作为增量改进引入当前项目
3. **当前项目的优势在于"已经做了"**：SchemaFieldRule、ValidationScopeRuntime、30+ hooks、12 contexts、classAliases、4 个域编辑器——这些是实际开发中积累的智慧，v9 作为纯设计无法覆盖
4. **域覆盖差距巨大**：当前项目已覆盖流程/表格/报表/文档编辑器、代码编辑器、调试器、i18n、Playground 等完整生态。v9 只有核心 runtime 设计
5. **最大风险是重写而非演进**：试图用 v9 替代当前实现会丢失已验证的代码、测试和实际经验

### 7.3 推荐路径

分三个优先级层次，渐进采纳 v9 的理念：

**第一优先级 —— 低风险高价值，可立即实施**：

| 改进 | 实施方式 | 预估工作量 |
|------|---------|-----------|
| 空值安全表达式 | 在 `flux-formula` 中引入 null-safe 求值路径 | 2-3 天 |
| 管道操作符 | 在 `flux-formula` 中添加 pipe 表达式类型 | 3-5 天 |
| SchemaErrorBoundary | 添加 React Error Boundary 包装 | 1-2 天 |

**第二优先级 —— 需要先设计再实施**：

| 改进 | 前置条件 | 预估工作量 |
|------|---------|-----------|
| FrameworkError 统一错误格式 | 需先统一表达式/动作/校验/渲染的错误结构 | 5-7 天 |
| Effect Channel | 需先理解所有 ActionRuntimeAdapter 调用点 | 5-10 天 |
| DataSource 级联协议文档化 | 整理当前隐式行为，写成交互时序文档 | 2-3 天 |

**第三优先级 —— 待验证后再决定**：

| 改进 | 触发条件 |
|------|---------|
| Signal 一等原语 | 当基准测试显示 scope 通知成为 1000+ 节点 schema 的瓶颈时 |
| ScopeTransaction | 当出现具体的批量更新+回滚需求时 |
| UndoManager | 当 Undo/Redo 成为用户需求时 |
| CRUD 领域抽象 | 当 table+form 组合使用模式稳定后 |

**不建议采纳**：

| v9 理念 | 原因 |
|---------|------|
| 多目标编译 | React 深度集成，多框架 ROI 低 |
| 四阶段编译管线 | 当前单步编译器够用 |
| 类型推断引擎 | JSON Schema 验证更实用 |
| 时间旅行调试 | 实现成本高，debugger 已足够 |
| SSR | 非当前优先级 |
