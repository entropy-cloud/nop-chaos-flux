# Phase 1 — 稳定契约清单

> Date: 2026-07-27
> Scope: core-cluster (flux-core, flux-formula, flux-compiler, flux-action-core) + runtime-cluster (flux-runtime, flux-react, flux-bundle)
> Method: Per `unit-test-logic-and-contract-coverage-audit-prompt.md` Step 1

## 去重基线（已扫描 docs/analysis/ 历史报告）

- 2026-05-23/24/06-02 deep-audit-full: 已记录 oversized test files, E2E name-to-behavior mismatch, test-global-leaks suspect 审查, flow-designer 隐式状态依赖
- 2026-06-26 deep-audit-amis-bug-driven: 已记录 7 个 >700 行文件（含 form-runtime-owner, node-compiler）, 4 包缺 coverage 阈值, 18 个冗余 happy-dom pragma
- 2026-07-22 scheduling deep-audit: 仅 scheduling 包，不重叠
- 2026-07-24/25 AI audits: 仅 AI 包，不重叠
- arm-MA2-core-schema-dispatch: 已记录 15 个 void-promise 合理, schema validation 选择性应用
- arm-MA3-core-runtime-code-quality: 已记录 MA3-F01~F09（空 catch, 大文件, React 19 冗余）

**去重规则**: 已记录的 oversized 文件 / void-promise / catch 模式不在本报告中重复。但若有新的跨层测试断层或契约覆盖缺口，仍然需要报告。

---

## 稳定契约清单

### A. flux-core — 基础契约与共享工具

| ID  | 契约                                                                               | 来源                                         | 类型           | 测试覆盖现状                                          |
| --- | ---------------------------------------------------------------------------------- | -------------------------------------------- | -------------- | ----------------------------------------------------- |
| C1  | ScopeRef 接口：get/has/readOwn/readVisible/materializeVisible/update/merge/replace | architecture docs + `types/renderer-core.ts` | public API     | `packages/flux-core/src/__tests__/` 有 scope 相关测试 |
| C2  | ScopeStore 接口：getSnapshot/getLastChange/setSnapshot/subscribe                   | architecture docs + `types/renderer-core.ts` | public API     | 需确认独立测试                                        |
| C3  | ScopeChange 路径报告：update 写精确路径, merge 报告 top-level keys                 | architecture docs                            | 用户可观察行为 | 间接覆盖                                              |
| C4  | 原型污染防御：`__proto__`/`constructor`/`prototype` 过滤                           | architecture docs                            | 安全契约       | 需确认是否存在负面测试                                |
| C5  | Scope 词法查找：先查当前 scope 顶层 key，若无则爬升 parent                         | architecture docs                            | 用户可观察行为 | 需确认贯通测试                                        |
| C6  | `getIn` / `setIn` / `parsePath` 路径解析：bracket 语法、LUR 缓存、原型防御         | architecture docs + `utils/path.ts`          | public API     | `path.test.ts` 存在                                   |
| C7  | `isPlainObject` / `shallowEqual` / `shallowEqualRecords` 等工具函数                | `utils/object.ts`                            | public API     | 有独立测试                                            |
| C8  | `buildCompiledFormValidationModel` / `buildCompiledValidationOrder` 验证模型构建   | architecture docs                            | public API     | 需确认测试                                            |
| C9  | `createNodeId` / `isSchema` / `isSchemaArray` / `isSchemaInput` Schema 识别        | `utils/schema.ts`                            | public API     | 需确认测试                                            |
| C10 | `decorateRendererEnv` 环境装饰                                                     | `utils/renderer-env.ts`                      | public API     | 间接覆盖                                              |
| C11 | `createPathBinding` 路径绑定服务                                                   | `utils/path-binding.ts`                      | public API     | 需确认测试                                            |
| C12 | `cancelPendingDebounce` / `scheduleDebounce` 防抖工具                              | `utils/debounce.ts`                          | public API     | 需确认测试                                            |
| C13 | `setMessageFormatter` / `getMessageFormatter` i18n 单例                            | `i18n-sink.ts`                               | 用户可观察行为 | 需确认测试                                            |
| C14 | `strict-mode.ts`: `isStrictValidationEnabled` / `shouldFailOnSchemaDiagnostics`    | public API                                   | 用户可观察行为 | 需确认测试                                            |
| C15 | `RendererDefinition` 注册：registry.register / registry.get / registry.has         | `registry.ts`                                | public API     | 需确认测试                                            |
| C16 | `resolveClassAliases` / `mergeClassAliases` class-alias 解析                       | `class-aliases.ts`                           | public API     | 需确认测试                                            |
| C17 | `normalizeInstancePath` / `buildScopeChain` / `isAbortError` 运行时工具            | public API                                   | public API     | 需确认测试                                            |
| C18 | `validationErrorsEqual` 错误比较                                                   | `utils/validation-utils.ts`                  | public API     | 需确认测试                                            |

### B. flux-formula — 表达式基础

| ID  | 契约                                                   | 来源              | 类型           | 测试覆盖现状   |
| --- | ------------------------------------------------------ | ----------------- | -------------- | -------------- |
| F1  | `createFormulaCompiler` formula 编译入口               | public API        | public API     | 有测试         |
| F2  | `createExpressionCompiler` 表达式编译入口              | public API        | public API     | 有测试         |
| F3  | `parseFormula` formula 解析                            | public API        | public API     | 有测试         |
| F4  | `evaluateAst` AST 执行                                 | public API        | public API     | 有测试         |
| F5  | `createFormulaRegistry` 函数/过滤器注册                | public API        | public API     | 有测试         |
| F6  | `dateHelper` 日期辅助                                  | public API        | public API     | 需确认         |
| F7  | `bindAst` / `BindingContext` AST 绑定                  | public API        | public API     | 需确认         |
| F8  | `createScopeDependencyCollector` 作用域收集器          | public API        | public API     | 需确认         |
| F9  | 表达式/模板编译失败时作为静态值回退，保留 cause 细节   | architecture docs | 用户可观察行为 | 需确认负面测试 |
| F10 | scope proxy 拦截 `__proto__`/`constructor`/`prototype` | architecture docs | 安全契约       | 需确认         |

### C. flux-compiler — Schema 编译

| ID  | 契约                                                                                               | 来源              | 类型           | 测试覆盖现状   |
| --- | -------------------------------------------------------------------------------------------------- | ----------------- | -------------- | -------------- |
| P1  | `createSchemaCompiler` / `validateSchema` 编译入口 + 校验                                          | public API        | public API     | 有测试         |
| P2  | `compileAction` / `compileActions` action 编译                                                     | public API        | public API     | 有测试         |
| P3  | `compileDataSource` / `isDataSourceFullyStatic` 数据源编译                                         | public API        | public API     | 需确认         |
| P4  | `compileReaction` / `isReactionFullyStatic` reaction 编译                                          | public API        | public API     | 需确认         |
| P5  | `createCompileSymbolTable` / `createBaseCompileSymbolTable` symbol 表                              | public API        | public API     | 需确认         |
| P6  | Schema 编译：region 提取、字段分类（meta/prop/region/event/reaction/ignored）、props/meta 程序构建 | architecture docs | 用户可观察行为 | 有测试         |
| P7  | 声明式 lowering：data-source/reaction 自动识别并构建 compiledSources/compiledReactions             | architecture docs | 用户可观察行为 | 需确认贯通测试 |
| P8  | SchemaFieldRule `kind: 'reaction'` 编译为 CompiledReactionPlan                                     | architecture docs | 用户可观察行为 | 需确认贯通测试 |
| P9  | templateNodeId 在单 RendererRuntime 内全局唯一                                                     | architecture docs | 用户可观察行为 | 需确认         |
| P10 | 不存在 `CompiledSchemaNode` 中间步骤，直接产出 TemplateNode                                        | architecture docs | 架构承诺       | 无退化回归测试 |
| P11 | `collectSchemaValidationRules` / `mergeValidationRules` / `compileValidationRules` 校验规则降低    | public API        | public API     | 需确认         |
| P12 | shape-validation: deepFields 递归、boolean-like 字段校验、host-action 校验                         | architecture docs | 用户可观察行为 | 需确认         |

### D. flux-action-core — Action 执行框架

| ID  | 契约                                                                                                | 来源              | 类型           | 测试覆盖现状     |
| --- | --------------------------------------------------------------------------------------------------- | ----------------- | -------------- | ---------------- |
| A1  | `createActionDispatcher` action 分发入口                                                            | public API        | public API     | 有测试           |
| A2  | action dispatch 三条路径：built-in → component-targeted → namespaced                                | architecture docs | 用户可观察行为 | 需确认贯通测试   |
| A3  | `shouldRunActionWhen` / `shouldPreventDefault` / `shouldStopPropagation` 条件守卫                   | public API        | public API     | 需确认           |
| A4  | `evaluateInActionContext` / `evaluateCompiledInActionContext` / `evaluateActionArgs` 评估           | public API        | public API     | 需确认           |
| A5  | debounce / retry / timeout 控制流组合                                                               | architecture docs | 用户可观察行为 | 需确认测试       |
| A6  | `prevResult` 链式传递                                                                               | architecture docs | 用户可观察行为 | 需确认           |
| A7  | `createCancelledResult` / `createTimedOutResult` / `normalizeActionResult` / `classifyActionResult` | public API        | public API     | 需确认           |
| A8  | `withTimeout` / `withRetry` / `createAbortScope` 操作控制                                           | public API        | public API     | 需确认           |
| A9  | ActionRuntimeAdapter 注入，flux-action-core 不直接引用 flux-compiler                                | architecture docs | 架构承诺       | 需确认无反向依赖 |

### E. flux-runtime — 运行时核心

| ID  | 契约                                                                                                                       | 来源              | 类型           | 测试覆盖现状       |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------- | ------------------ |
| R1  | `createRendererRuntime` 运行时工厂（注入 compiler/env/registry/plugins）                                                   | public API        | public API     | 有测试             |
| R2  | `createActionScope` namespaced-action 注册/查找                                                                            | public API        | public API     | 需确认             |
| R3  | `createComponentHandleRegistry` component handle 注册/查找                                                                 | public API        | public API     | 需确认             |
| R4  | `createFormComponentHandle` / `createInputComponentHandle` / `createSurfaceComponentHandle` / `createCompositeFieldHandle` | public API        | public API     | 需确认             |
| R5  | `createReadonlyScopeBinding` 只读 scope 绑定                                                                               | public API        | public API     | 需确认             |
| R6  | `createProjectedScopeStore` 投影 scope store                                                                               | public API        | public API     | 需确认             |
| R7  | `publishOwnerStatus` 状态发布                                                                                              | public API        | public API     | 需确认             |
| R8  | `executeApiObject` API 请求执行                                                                                            | public API        | public API     | 需确认             |
| R9  | `buildFormStatusSummary` 状态汇总                                                                                          | public API        | public API     | 需确认             |
| R10 | FormRuntime: validateField / validateForm / submit / reset / setValue / setValues / array ops                              | architecture docs | 用户可观察行为 | 有测试             |
| R11 | ValidationScopeRuntime: validateAt / validateSubtree / validateAll / applyChangesAndRevalidate / applyExternalErrors       | architecture docs | 用户可观察行为 | 有测试             |
| R12 | SurfaceRuntime: open / close / closeTop / upsert / publishStatus / publishClosed                                           | architecture docs | 用户可观察行为 | 需确认             |
| R13 | PageRuntime: refresh / scope / validationOwner                                                                             | architecture docs | 用户可观察行为 | 需确认             |
| R14 | scope store 创建 + 词法查找 + 污染防御                                                                                     | architecture docs | 用户可观察行为 | 有测试             |
| R15 | form store: values / fieldStates / submitting / submitAttempted                                                            | architecture docs | 用户可观察行为 | 有测试             |
| R16 | async data: data-source controllers (formula + API) + reaction runtime                                                     | architecture docs | 用户可观察行为 | 需确认贯通测试     |
| R17 | source registry: 注册 / 替换 / 刷新 / 取消                                                                                 | architecture docs | 用户可观察行为 | 需确认             |
| R18 | reaction handle: dispatch / force / ready / pause / resume / dispose                                                       | architecture docs | 用户可观察行为 | 有部分测试         |
| R19 | import stack: load dedupe / alias visibility / frame push/pop                                                              | architecture docs | 用户可观察行为 | 需确认             |
| R20 | `resolveNodeMeta` / `resolveNodeProps` 节点解析                                                                            | architecture docs | public API     | 有测试             |
| R21 | `resolveTarget` 组件目标解析                                                                                               | architecture docs | public API     | 需确认             |
| R22 | validation runtime: sync validator / async debounce / stale cancellation                                                   | architecture docs | 用户可观察行为 | 有测试             |
| R23 | `closeSurface` 默认行为：无 surfaceId 时关闭当前                                                                           | architecture docs | 用户可观察行为 | 需确认             |
| R24 | runtime dispose 顺序：action dispatcher → forms/pages/surfaces → import frames                                             | architecture docs | 架构承诺       | 需确认生命周期测试 |

### F. flux-react — React 集成

| ID  | 契约                                                                                                                                                                                 | 来源                       | 类型              | 测试覆盖现状                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | ----------------- | --------------------------- | -------------- |
| X1  | `createSchemaRenderer` SchemaRenderer 创建                                                                                                                                           | public API                 | public API        | 有测试                      |
| X2  | `createDefaultEnv` / `createDefaultRegistry` 默认环境/注册表                                                                                                                         | public API                 | public API        | 间接覆盖                    |
| X3  | NodeRenderer: 解析 meta/props/events/regions/helpers, 调用渲染器                                                                                                                     | architecture docs          | 用户可观察行为    | 有测试                      |
| X4  | hooks: useRendererRuntime / useRenderScope / useScopeSelector / useOwnScopeSelector / useActionDispatcher / useCurrentForm / useCurrentPage / useCurrentNodeMeta / useRenderFragment | public API + `hooks.ts`    | public API        | 有部分测试                  |
| X5  | FieldFrame: wrap 行为, `frameRootTag`, `data-cid`, `data-testid`                                                                                                                     | architecture docs          | 用户可观察行为    | 有测试                      |
| X6  | DialogHost: dialog/drawer 渲染, surface 堆栈                                                                                                                                         | architecture docs          | 用户可观察行为    | 需确认                      |
| X7  | RenderNodes: normalize schema → compiled fragment rendering                                                                                                                          | architecture docs          | 用户可观察行为    | 有测试                      |
| X8  | `createNormalizedActionEvent` 事件规范化                                                                                                                                             | public API                 | public API        | 需确认                      |
| X9  | `RendererComponentProps` 合同：props/meta/regions/events/reactions/helpers                                                                                                           | architecture docs          | 架构承诺          | 需确认贯通测试              |
| X10 | boolean-like props 只暴露 `boolean                                                                                                                                                   | undefined`，无 truthy 强制 | architecture docs | 用户可观察行为              | 需确认负面测试 |
| X11 | 事件转发规则：DOM event → props.events.onXxx(event)                                                                                                                                  | architecture docs          | 用户可观察行为    | 有部分测试                  |
| X12 | `preventDefault` / `stopPropagation` schema 声明式同步执行                                                                                                                           | architecture docs          | 用户可观察行为    | `event-prevention.test.tsx` |
| X13 | ReactionHandle lazy proxy: StrictMode-safe, buffer pre-activation calls, flush on ready                                                                                              | architecture docs          | 用户可观察行为    | 需确认                      |
| X14 | lifecycle actions: onMount / onUnmount 编译 + 自动分发                                                                                                                               | architecture docs          | 用户可观察行为    | 需确认                      |
| X15 | source-enabled props + executeSource: 保持 action context 形状                                                                                                                       | architecture docs          | 用户可观察行为    | 需确认                      |
| X16 | `useSourceValue` / `useDataSourceStatus` 数据源 hook                                                                                                                                 | public API                 | public API        | 需确认                      |
| X17 | `useInputComponentHandle` / `useSurfaceComponentHandle` / `useCompositeFieldHandle`                                                                                                  | public API                 | public API        | 需确认                      |

### G. flux-bundle — Host Facade

| ID  | 契约                                                                    | 来源       | 类型       | 测试覆盖现状     |
| --- | ----------------------------------------------------------------------- | ---------- | ---------- | ---------------- |
| B1  | `createFluxRendererRegistry()` 创建注册表 + 注册默认渲染器              | public API | public API | `index.test.tsx` |
| B2  | `createDefaultFluxEnv()` 默认环境                                       | public API | public API | 间接覆盖         |
| B3  | `createFluxSchemaRenderer()` / `createFluxSchemaRendererWithRegistry()` | public API | public API | `index.test.tsx` |

### H. 跨层契约

| ID  | 契约                                                                                        | 来源              | 类型           | 测试覆盖现状                 |
| --- | ------------------------------------------------------------------------------------------- | ----------------- | -------------- | ---------------------------- |
| L1  | compile → runtime: CompiledTemplate.TemplateNode 被 runtime 消费，不经过 CompiledSchemaNode | architecture docs | 架构承诺       | 无退化测试                   |
| L2  | runtime → react: NodeRenderer 消费 ResolvedNodeMeta/ResolvedNodeProps → 传递给渲染器        | architecture docs | 架构承诺       | 分段覆盖，但缺少完整贯通测试 |
| L3  | scope 链: page scope → form scope → fragment scope 的正确传播                               | architecture docs | 用户可观察行为 | 有部分测试                   |
| L4  | action dispatch: schema compile → runtime eval → react dispatch → adapter 的完整链路        | architecture docs | 用户可观察行为 | 分段覆盖，缺少贯通           |
| L5  | data-source: compile-lowered → runtime controller → react source-enabled props              | architecture docs | 用户可观察行为 | 需确认贯通测试               |
| L6  | reaction: compile-lowered → runtime ReactionHandle → react props.reactions                  | architecture docs | 用户可观察行为 | 需确认贯通测试               |
| L7  | validation: compile model → runtime validate → React error display                          | architecture docs | 用户可观察行为 | 分段覆盖                     |

## Coverage 总体评估

当前测试在以下方面较强：

- flux-formula 表达式编译 + 执行
- flux-runtime form runtime 核心路径（submit / validation / field ops）
- flux-react NodeRenderer / FieldFrame / 基础渲染
- flux-core path utils / object utils
- flux-compiler 基本 schema 编译

当前测试在以下方面较弱或存在缺口：

1. **跨层贯通测试**（L1-L7）：大部分是分段覆盖，缺少从 compile → runtime → react → renderer 的完整契约测试
2. **负面/异常场景**：大多数契约缺少空值、缺字段、错误类型、竞态、销毁后行为的负面测试
3. **scope 原型污染防御**（C4/F10）：缺少专门针对 `__proto__`/`constructor`/`prototype` 防御的负面测试
4. **action dispatch 三条路径的贯通测试**（A2）：built-in/component/namespaced 各有测试但缺少混用场景
5. **ReactionHandle 全生命周期**（X13/R18）：ready/pause/resume/dispose 的状态机测试不足
6. **i18n sink 单例**（C13）：无测试验证线程/模块隔离
7. **flux-bundle**（B1-B3）：仅有 2 个测试文件，覆盖率估计 ~30%
