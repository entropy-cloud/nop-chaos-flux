# Round 1 — 公开 API / 所有者契约 → 现有测试映射

> Date: 2026-07-27
> Scope: flux-core, flux-formula, flux-compiler, flux-action-core, flux-runtime, flux-react
> Method: Per the MA4.1 audit — 逐个契约检查，验证测试文件是否覆盖，识别 false patterns。

---

## 判定标准

| Status      | 含义                                                       |
| ----------- | ---------------------------------------------------------- |
| **covered** | 有直接测试，通过真实入口点，断言充分                       |
| **weak**    | 测试存在但覆盖率不全（缺少负面场景、断言过弱、仅间接覆盖） |
| **missing** | 无测试，或仅有类型级别的间接使用                           |

---

## A. flux-core — 基础契约与共享工具

### Finding R1-C1 — ScopeRef 接口测试覆盖

- **Severity**: P2
- **Category**: 契约未覆盖部分方法
- **Contract**: C1 — ScopeRef 接口：get/has/readOwn/readVisible/materializeVisible/update/merge/replace
- **Implementation**: `packages/flux-core/src/types/scope.ts` (interface), `packages/flux-runtime/src/scope.js` (createScopeRef)
- **Test files**: `packages/flux-runtime/src/__tests__/scope-ownership-lexical-and-nested.test.ts`, `packages/flux-runtime/src/__tests__/scope-dangerous-keys.test.ts`
- **Status**: **covered** for get/has/readOwn/readVisible/merge/replace/update; **weak** for materializeVisible (tested but only as part of dangerous keys filtering)
- **Why coverage is misleading**: materializeVisible is only tested in `scope-dangerous-keys.test.ts` for the visible-chain merged snapshot, not separately. The ScopeRef as interface has no test that exercises all ~10 methods together as a contract.
- **Recommendation**: Add a dedicated ScopeRef contract test that calls every method and verifies the return shape.

### Finding R1-C2 — ScopeStore 接口缺少独立测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: C2 — ScopeStore 接口：getSnapshot/getLastChange/setSnapshot/subscribe
- **Implementation**: `packages/flux-runtime/src/scope.js` (createScopeStore)
- **Test files**: No independent ScopeStore test file. ScopeStore is constructed as part of `createScopeRef` calls.
- **Status**: **weak** — ScopeStore 被作为 createScopeRef 内部实现间接覆盖，但 `getLastChange`、`subscribe` 的独立行为无专项测试
- **Why coverage is misleading**: `scope-ownership-lexical-and-nested.test.ts` creates stores via `createScopeStore(data)` but never isolates the store API. Store subscription/cancellation behavior and snapshot stability are not directly asserted.
- **Recommendation**: Add `scope-store.test.ts` with direct tests for getSnapshot, getLastChange, setSnapshot, subscribe/unsubscribe.

### Finding R1-C3 — ScopeChange 路径报告有独立测试，但绕过真实入口

- **Severity**: P2
- **Category**: 入口错误覆盖
- **Contract**: C3 — ScopeChange 路径报告：update 写精确路径，merge 报告 top-level keys
- **Implementation**: `packages/flux-runtime/src/scope-change.ts`
- **Test files**: `packages/flux-runtime/src/__tests__/scope-change.test.ts`
- **Status**: **covered** — 测试 `scopeChangeHitsDependencies`、`filterScopeChangeByIgnoredRoots`、`createRootDependencySet` 函数，断言充分
- **Why coverage is misleading**: 测试直接构造 ScopeChangeRecord 对象而非通过真实 scope.update()/scope.merge() 调用产生的 change 路径。这是 helper 级别的测试，未验证真实 scope.update() 是否产生精确路径、scope.merge() 是否报告 top-level keys
- **Recommendation**: 添加贯通测试：通过 scope.merge({a: 1, b: {c: 2}}) 验证返回的 change.paths 仅包含 ['a', 'b']，不包含 'b.c'

### Finding R1-C4 — 原型污染防御有专项负面测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: C4 — 原型污染防御：`__proto__`/`constructor`/`prototype` 过滤
- **Implementation**: `packages/flux-core/src/utils/path.ts` (getIn/setIn), `packages/flux-runtime/src/scope.js` (DANGEROUS_KEYS)
- **Test files**: `packages/flux-runtime/src/__tests__/scope-dangerous-keys.test.ts`, `packages/flux-core/src/utils/path.test.ts`
- **Status**: **covered** — 负面测试充分。`scope-dangerous-keys.test.ts` 验证 merge/replace/update/readVisible/materializeVisible 全部过滤三个危险 key；`path.test.ts` 验证 getIn/setIn 拦截 **proto**/constructor/prototype
- **Recommendation**: 无

### Finding R1-C5 — Scope 词法查找有贯通测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: C5 — Scope 词法查找：先查当前 scope 顶层 key，若无则爬升 parent
- **Implementation**: `packages/flux-runtime/src/scope.js`
- **Test files**: `packages/flux-runtime/src/__tests__/scope-ownership-lexical-and-nested.test.ts`
- **Status**: **covered** — 29 个测试，覆盖 parent/grandparent 查找、isolated scope 隔离、嵌套路径、undefined 行为
- **Recommendation**: 无

### Finding R1-C6 — getIn/setIn/parsePath 路径解析有完整测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: C6 — `getIn` / `setIn` / `parsePath` 路径解析：bracket 语法、LUR 缓存、原型防御
- **Implementation**: `packages/flux-core/src/utils/path.ts`
- **Test files**: `packages/flux-core/src/utils/path.test.ts`
- **Status**: **covered** — 测试 LUR 缓存的实例隔离、bracket 语法解析、原型防御、getIn/setIn 正确性
- **Recommendation**: 无

### Finding R1-C7 — 工具函数覆盖不足

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: C7 — `isPlainObject` / `shallowEqual` / `shallowEqualRecords` 等工具函数
- **Implementation**: `packages/flux-core/src/utils/object.ts`
- **Test files**: `packages/flux-core/src/utils/object.test.ts`
- **Status**: **weak** — 只有 3 个测试用例，仅覆盖 isPlainObject 和 shallowEqual；`shallowEqualRecords` 没有测试，边缘情况（null、undefined、Date、RegExp 值）缺失
- **Why coverage is misleading**: object.test.ts 只有 21 行，而 object.ts 导出更多函数。`shallowEqualRecords` 完全没有测试。
- **Recommendation**: 补充 shallowEqualRecords 测试，扩展 shallowEqual 测试覆盖特殊值和不同键顺序情况

### Finding R1-C8 — buildCompiledFormValidationModel 有专项测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: C8 — `buildCompiledFormValidationModel` / `buildCompiledValidationOrder` 验证模型构建
- **Implementation**: `packages/flux-core/src/validation-model.ts`
- **Test files**: `packages/flux-core/src/validation-model.test.ts`
- **Status**: **covered** — 387 行的详尽测试，覆盖所有导出函数、空值、边界情况、循环依赖处理
- **Recommendation**: 无

### Finding R1-C9 — Schema 识别函数部分未测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: C9 — `createNodeId` / `isSchema` / `isSchemaArray` / `isSchemaInput` Schema 识别
- **Implementation**: `packages/flux-core/src/utils/schema.ts`
- **Test files**: `packages/flux-core/src/utils/schema.test.ts`
- **Status**: **weak** — 仅测试了 `createNodeId`（18 个测试）；`isSchema`、`isSchemaArray`、`isSchemaInput` 没有测试
- **Why coverage is misleading**: schema.test.ts 只导入并测试了 createNodeId，其他三个函数未被引用
- **Recommendation**: 添加 isSchema/isSchemaArray/isSchemaInput 测试

### Finding R1-C10 — decorateRendererEnv 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: C10 — `decorateRendererEnv` 环境装饰
- **Implementation**: `packages/flux-core/src/utils/renderer-env.ts`
- **Test files**: `packages/flux-core/src/utils/renderer-env.test.ts`
- **Status**: **covered** — 测试无 hook 返回相同 env、fetcher/notify/navigate 独立装饰、未装饰字段保持不变
- **Recommendation**: 无

### Finding R1-C11 — createPathBinding 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: C11 — `createPathBinding` 路径绑定服务
- **Implementation**: `packages/flux-core/src/utils/path-binding.ts`
- **Test files**: `packages/flux-core/src/utils/path-binding.test.ts`
- **Status**: **covered** — 测试相对/绝对路径映射、scalar 值别名、projectBooleanMap、projectFieldStates
- **Recommendation**: 无

### Finding R1-C12 — 防抖工具完整测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: C12 — `cancelPendingDebounce` / `scheduleDebounce` 防抖工具
- **Implementation**: `packages/flux-core/src/utils/debounce.ts`
- **Test files**: `packages/flux-core/src/utils/debounce.test.ts`
- **Status**: **covered** — 完整测试覆盖解决、取消、多 key、同步/异步工厂、拒绝传播
- **Recommendation**: 无

### Finding R1-C13 — i18n sink 有测试但缺少模块隔离场景

- **Severity**: P2
- **Category**: 缺少负面场景
- **Contract**: C13 — `setMessageFormatter` / `getMessageFormatter` i18n 单例
- **Implementation**: `packages/flux-core/src/i18n-sink.ts`
- **Test files**: `packages/flux-core/src/i18n-sink.test.ts`
- **Status**: **covered** — 测试默认行为、set/get、参数传递、last-wins、恢复默认。54 行，较充分。
- **Why coverage is misleading**: 未测试多模块同时调用时的线程/模块隔离行为（mutable singleton 的实际风险场景）
- **Recommendation**: 添加测试：验证在一个模块中 setMessageFormatter 后，另一个模块中的 getMessageFormatter 确实读到新值（当前已覆盖），同时添加 import 顺序无关性测试

### Finding R1-C14 — strict-mode 中 shouldFailOnSchemaDiagnostics 未测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: C14 — `strict-mode.ts`: `isStrictValidationEnabled` / `shouldFailOnSchemaDiagnostics`
- **Implementation**: `packages/flux-core/src/strict-mode.ts`
- **Test files**: `packages/flux-core/src/strict-mode.test.ts`
- **Status**: **weak** — 仅测试了 `isStrictValidationEnabled` 和 `setStrictValidationGlobal`；`shouldFailOnSchemaDiagnostics` 和 `setFailOnSchemaDiagnosticsGlobal` **无测试**
- **Why coverage is misleading**: strict-mode.test.ts 只测试了 110 行源码中与 strict validation 相关的部分，忽略了 fail-on-schema-diagnostics 函数
- **Recommendation**: 添加 shouldFailOnSchemaDiagnostics 和 setFailOnSchemaDiagnosticsGlobal 测试

### Finding R1-C15 — registry 注册有完整测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: C15 — `RendererDefinition` 注册：registry.register / registry.get / registry.has
- **Implementation**: `packages/flux-core/src/registry.ts`
- **Test files**: `packages/flux-core/src/registry.test.ts`
- **Status**: **covered** — 182 行覆盖 create/get/has/list/register/override/duplicate/缺失 component
- **Recommendation**: 无

### Finding R1-C16 — class-aliases 测试过于简单

- **Severity**: P3
- **Category**: 断言过弱
- **Contract**: C16 — `resolveClassAliases` / `mergeClassAliases` class-alias 解析
- **Implementation**: `packages/flux-core/src/class-aliases.ts`
- **Test files**: `packages/flux-core/src/class-aliases.test.ts`
- **Status**: **weak** — 只有 3 个测试（递归展开、循环保护、merge）。缺少空值、undefined aliases、大递归深度、non-string alias values 等测试
- **Recommendation**: 添加空值 alias、大量 alias、非字符串别名值的边界测试

### Finding R1-C17 — normalizeInstancePath / buildScopeChain / isAbortError 已覆盖

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: C17 — `normalizeInstancePath` / `buildScopeChain` / `isAbortError` 运行时工具
- **Implementation**: `packages/flux-core/src/runtime-inspection.ts`, `packages/flux-core/src/utils/instance-path.ts`
- **Test files**: `packages/flux-core/src/misc.contract.test.ts`, `packages/flux-core/src/runtime-inspection.test.ts`
- **Status**: **covered** — normalizeInstancePath（null/undefined/empty/non-empty），isAbortError（全部 6 个 case），buildScopeChain（3 个 case）
- **Recommendation**: 无

### Finding R1-C18 — validationErrorsEqual 已覆盖

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: C18 — `validationErrorsEqual` 错误比较
- **Implementation**: `packages/flux-core/src/utils/validation-utils.ts`
- **Test files**: `packages/flux-core/src/misc.contract.test.ts`
- **Status**: **covered** — 测试 same reference、undefined、长度不同、结构相等、path 不同、message 不同、relatedPaths
- **Recommendation**: 无

---

## B. flux-formula — 表达式基础

### Finding R1-F1~F5 — 表达式基础设施有完整测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contracts**: F1 (`createFormulaCompiler`), F2 (`createExpressionCompiler`), F3 (`parseFormula`), F4 (`evaluateAst`), F5 (`createFormulaRegistry`)
- **Implementation**: `packages/flux-formula/src/`
- **Test files**: `packages/flux-formula/src/index.test.ts`, `packages/flux-formula/src/evaluate.test.ts`, `packages/flux-formula/src/evaluator.test.ts`, `packages/flux-formula/src/lexer.test.ts`, `packages/flux-formula/src/parser.test.ts`, `packages/flux-formula/src/registry.test.ts`, `packages/flux-formula/src/template.test.ts`, `packages/flux-formula/src/contract-boundary.test.ts`
- **Status**: **covered** — 大量贯通测试（630 行 contract-boundary.test.ts），包括语法解析、执行、模板、边界情况
- **Recommendation**: 无

### Finding R1-F6 — dateHelper 有独立测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: F6 — `dateHelper` 日期辅助
- **Implementation**: `packages/flux-formula/src/date-helper.ts`
- **Test files**: `packages/flux-formula/src/date-helper.test.ts`
- **Status**: **covered** — 覆盖 parse/format/日期部分/日期运算/无效输入回退
- **Recommendation**: 无

### Finding R1-F7 — bindAst 无独立测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: F7 — `bindAst` / `BindingContext` AST 绑定
- **Implementation**: `packages/flux-formula/src/bind-ast.ts`
- **Test files**: 无独立测试。通过 compile/evaluate 链路被动覆盖
- **Status**: **missing** — 无 `bind-ast.test.ts`，无任何直接测试 bindAst 函数的测试
- **Why coverage is misleading**: bindAst 是编译链路的关键环节（标识符绑定定位到 scope/library/namespace），但没有任何测试独立验证其行为
- **Recommendation**: 添加 bindAst 测试，验证 IdentifierBinding 正确设置为 'scope'/'library'/'namespace'

### Finding R1-F8 — createScopeDependencyCollector 已测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: F8 — `createScopeDependencyCollector` 作用域收集器
- **Implementation**: `packages/flux-formula/src/scope.ts`
- **Test files**: `packages/flux-formula/src/scope.test.ts`
- **Status**: **covered** — 在 scope.test.ts 中作为 createFormulaScope 测试的一部分被测试（依赖路径记录、wildcard 回退、路径归一化）
- **Recommendation**: 无

### Finding R1-F9 — 表达式编译失败回退无测试

- **Severity**: P2
- **Category**: 缺少负面场景
- **Contract**: F9 — 表达式/模板编译失败时作为静态值回退，保留 cause 细节
- **Implementation**: 编译路径
- **Test files**: 无
- **Status**: **missing** — 无测试验证当编译抛出异常时是否正确回退为静态值并保留 cause 信息
- **Why coverage is misleading**: 现有测试都是成功路径，缺少「语法错误 → 回退」的测试
- **Recommendation**: 添加测试：传入非法表达式，验证 compileExpression 返回 isStatic:true 且 cause 记录了原始错误

### Finding R1-F10 — scope proxy 污染防御已测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: F10 — scope proxy 拦截 `__proto__`/`constructor`/`prototype`
- **Implementation**: `packages/flux-formula/src/scope.ts` (createFormulaScope)
- **Test files**: `packages/flux-formula/src/scope.test.ts`, `packages/flux-formula/src/contract-boundary.test.ts`
- **Status**: **covered** — 双重覆盖：scope.test.ts 直接测试 Proxy get 拦截，contract-boundary.test.ts 测试通过 evaluateAst 的 member expression + computed member + 对象字面量 key 的防御
- **Recommendation**: 无

---

## C. flux-compiler — Schema 编译

### Finding R1-P1 — schema compiler 入口有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: P1 — `createSchemaCompiler` / `validateSchema` 编译入口 + 校验
- **Implementation**: `packages/flux-compiler/src/schema-compiler.ts`
- **Test files**: `schema-compiler-contract-exploration.test.ts`, `schema-compiler-diagnostics-core.test.ts`, `schema-compiler-renderer-contracts.test.ts`, `schema-compiler-shape-validation-compile.test.ts`
- **Status**: **covered** — 大量测试覆盖编译和校验入口
- **Recommendation**: 无

### Finding R1-P2 — compileAction / compileActions 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: P2 — `compileAction` / `compileActions` action 编译
- **Implementation**: `packages/flux-compiler/src/action-compiler.ts`
- **Test files**: `packages/flux-compiler/src/action-compiler.test.ts`
- **Status**: **covered** — action 编译有独立测试
- **Recommendation**: 无

### Finding R1-P3 — compileDataSource / isDataSourceFullyStatic 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: P3 — `compileDataSource` / `isDataSourceFullyStatic` 数据源编译
- **Implementation**: `packages/flux-compiler/src/source-compiler.ts`
- **Test files**: `packages/flux-compiler/src/source-compiler.test.ts`
- **Status**: **covered** — 225 行测试覆盖 action/interval/stopWhen 等数据源编译
- **Recommendation**: 无

### Finding R1-P4 — compileReaction / isReactionFullyStatic 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: P4 — `compileReaction` / `isReactionFullyStatic` reaction 编译
- **Implementation**: `packages/flux-compiler/src/reaction-compiler.ts`
- **Test files**: `packages/flux-compiler/src/reaction-compiler.test.ts`
- **Status**: **covered** — 259 行测试覆盖基本 reaction、static watch、array watch、debounce 等
- **Recommendation**: 无

### Finding R1-P5 — createCompileSymbolTable / createBaseCompileSymbolTable 有测试

- **Severity**: P2
- **Category**: 弱覆盖
- **Contract**: P5 — `createCompileSymbolTable` / `createBaseCompileSymbolTable` symbol 表
- **Implementation**: `packages/flux-compiler/src/compile-symbol-table.ts`
- **Test files**: `packages/flux-compiler/src/symbol-helpers.test.ts`（间接使用）,+ `packages/flux-compiler/src/schema-compiler-contract-exploration.test.ts`
- **Status**: **weak** — symbol-helpers.test.ts 324 行测试 pushImportSymbols 等工具函数时使用 createCompileSymbolTable，但没有直接测试 symbol table 本身的 push/resolve 行为（尤其是 createBaseCompileSymbolTable 的 builtin 符号解析）
- **Why coverage is misleading**: symbol-helpers 测的是"往 symbol table 里推符号"的逻辑，而非 symbol table 本身的正确性
- **Recommendation**: 添加独立测试验证 createBaseCompileSymbolTable 返回包含 Math/JSON/console 等 builtin

### Finding R1-P6 — Schema 编译 region 提取和字段分类已测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: P6 — Schema 编译：region 提取、字段分类、props/meta 程序构建
- **Implementation**: `packages/flux-compiler/src/schema-compiler/`
- **Test files**: `schema-compiler-prop-coverage.test.ts`, `schema-compiler-prop-coverage-data-structures.test.ts`, `schema-compiler-prop-coverage-dialog-form.test.ts`, `schema-compiler-regions.test.ts`, `schema-compiler-static-analysis.test.ts`
- **Status**: **covered** — 大量测试覆盖 prop 覆盖、region 提取、静态分析
- **Recommendation**: 无

### Finding R1-P7 — 声明式 lowering (data-source/reaction) 缺少贯通测试

- **Severity**: P1
- **Category**: 跨层断层
- **Contract**: P7 — 声明式 lowering：data-source/reaction 自动识别并构建 compiledSources/compiledReactions
- **Implementation**: 编译路径
- **Test files**: 编译层有 source-compiler.test.ts 和 reaction-compiler.test.ts。但"自动识别并构建 → 产出 compiledSources"的贯通测试缺少
- **Status**: **weak** — 分段覆盖了 compileDataSource 和 compileReaction，但未验证 schema 中的 data-source/reaction 声明被编译器自动 lowered 为 compiledSources/compiledReactions
- **Recommendation**: 添加编译贯通测试：传入包含 data-source 声明的 schema，验证编译产物的 compiledSources 中包含正确 ID

### Finding R1-P8 — SchemaFieldRule `kind: 'reaction'` 编译为 CompiledReactionPlan — 无专项测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: P8 — SchemaFieldRule `kind: 'reaction'` 编译为 CompiledReactionPlan
- **Implementation**: 编译路径
- **Test files**: 未找到专门测试
- **Status**: **missing** — 无测试验证 field rule 中的 reaction 声明被正确降低
- **Recommendation**: 添加专项测试

### Finding R1-P9 — templateNodeId 全局唯一无测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: P9 — templateNodeId 在单 RendererRuntime 内全局唯一
- **Implementation**: 内部 ID 生成机制
- **Test files**: 无
- **Status**: **missing** — 无测试验证同一 runtime 内编译多个 schema 不会产生重复 templateNodeId
- **Recommendation**: 添加测试：多次 compile 并验证所有 templateNodeId 唯一

### Finding R1-P10 — 不存在 CompiledSchemaNode 中间步骤 — 架构承诺无退化测试

- **Severity**: P2
- **Category**: 缺少负面场景
- **Contract**: P10 — 不存在 `CompiledSchemaNode` 中间步骤，直接产出 TemplateNode
- **Implementation**: 编译路径整体设计
- **Test files**: 无
- **Status**: **missing** — 架构承诺无退化回归测试（无断言确保编译产物类型不包含 CompiledSchemaNode）
- **Recommendation**: 添加退化测试：通过类型守卫或属性检查验证编译结果不包含特定特征

### Finding R1-P11 — 校验规则降低（collect/merge/compile）有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: P11 — `collectSchemaValidationRules` / `mergeValidationRules` / `compileValidationRules` 校验规则降低
- **Implementation**: `packages/flux-compiler/src/validation-lowering.ts`
- **Test files**: `packages/flux-compiler/src/validation-lowering.test.ts`
- **Status**: **covered** — 284 行测试覆盖 collect/compile/merge/pattern unsafe 诊断
- **Recommendation**: 无

### Finding R1-P12 — shape-validation 有专项测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: P12 — shape-validation: deepFields 递归、boolean-like 字段校验、host-action 校验
- **Implementation**: `packages/flux-compiler/src/schema-compiler/shape-validation.ts`
- **Test files**: `schema-compiler-shape-validation-compile.test.ts`, `schema-compiler-shape-validation-value-shape.test.ts`, `schema-compiler-shape-validation-region.test.ts`, `schema-compiler-shape-validation-action-source.test.ts`, `schema-compiler-shape-validation-helpers.test.ts`
- **Status**: **covered** — 5 个专用测试文件覆盖 shape validation
- **Recommendation**: 无

---

## D. flux-action-core — Action 执行框架

### Finding R1-A1 — createActionDispatcher 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: A1 — `createActionDispatcher` action 分发入口
- **Implementation**: `packages/flux-action-core/src/action-dispatcher.ts`
- **Test files**: `action-dispatcher-routing.test.ts`, `action-dispatcher-control-flow.test.ts`, `action-dispatcher-error-guard.test.ts`, `action-dispatcher-monitoring.test.ts`
- **Status**: **covered** — 多文件覆盖分发入口
- **Recommendation**: 无

### Finding R1-A2 — action dispatch 三条路径缺少贯通混用测试

- **Severity**: P1
- **Category**: 跨层断层
- **Contract**: A2 — action dispatch 三条路径：built-in → component-targeted → namespaced
- **Implementation**: `packages/flux-action-core/src/action-dispatcher.ts`
- **Test files**: `action-dispatcher-routing.test.ts`
- **Status**: **weak** — 每条路径有独立测试，但缺少同一 dispatch 中三条路径混用的场景测试
- **Why coverage is misleading**: routing.test.ts 分别测了 built-in（setValue/showToast）、component: （component:doStuff）、namespace（dialog:open），但未测"一个 program 里既有 built-in 又有 component 又有 namespaced"的混用
- **Recommendation**: 添加混用测试

### Finding R1-A3 — shouldRunActionWhen / shouldPreventDefault / shouldStopPropagation — 无专项测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: A3 — `shouldRunActionWhen` / `shouldPreventDefault` / `shouldStopPropagation` 条件守卫
- **Implementation**: 内部
- **Test files**: 未找到直接测试
- **Status**: **missing** — 条件守卫函数无直接测试
- **Recommendation**: 添加单元测试，验证条件守卫在不同条件值下的返回

### Finding R1-A4 — evaluateInActionContext / evaluateCompiledInActionContext / evaluateActionArgs 无专项测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: A4 — `evaluateInActionContext` / `evaluateCompiledInActionContext` / `evaluateActionArgs` 评估
- **Implementation**: 内部
- **Test files**: 无专项测试，通过 dispatch 链路间接覆盖
- **Status**: **weak** — 间接覆盖，无独立测试验证参数评估的逻辑
- **Recommendation**: 添加独立单元测试

### Finding R1-A5 — debounce / retry / timeout 控制流组合有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: A5 — debounce / retry / timeout 控制流组合
- **Implementation**: `packages/flux-action-core/src/operation-control.ts`
- **Test files**: `contract-control-flow-retry-and-extras.test.ts`, `contract-control-flow-branches.test.ts`, `contract-control-flow-timeout-cancel.test.ts`, `contract-control-flow-parallel.test.ts`, `operation-control-timeout-retry.test.ts`, `operation-control.test.ts`
- **Status**: **covered** — 多文件覆盖 retry/times/timeout/abort/parallel/debounce
- **Recommendation**: 无

### Finding R1-A6 — prevResult 链式传递有测试

- **Severity**: P1
- **Category**: 弱覆盖
- **Contract**: A6 — `prevResult` 链式传递
- **Implementation**: 内部
- **Test files**: `contract-control-flow-branches.test.ts`
- **Status**: **weak** — 有测试验证 then 分支获取前一步结果，但 chain（多个顺序 action 的结果传递）的无干扰、prevResult 在 onError 中的行为未完全覆盖
- **Recommendation**: 补充 prevResult 在 chain 和 onError 中的行为测试

### Finding R1-A7 — createCancelledResult / createTimedOutResult / normalizeActionResult / classifyActionResult 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: A7 — `createCancelledResult` / `createTimedOutResult` / `normalizeActionResult` / `classifyActionResult`
- **Implementation**: `packages/flux-action-core/src/action-core.ts`
- **Test files**: `action-core-result.test.ts` (207 行), `action-core.test.ts`
- **Status**: **covered** — exhaustive classification 测试覆盖所有边缘 case
- **Recommendation**: 无

### Finding R1-A8 — withTimeout / withRetry / createAbortScope 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: A8 — `withTimeout` / `withRetry` / `createAbortScope` 操作控制
- **Implementation**: `packages/flux-action-core/src/operation-control.ts`
- **Test files**: `operation-control.test.ts` (307 行)
- **Status**: **covered** — 测试超时、重试（次数/延迟）、重试计数、AbortSignal 传播
- **Recommendation**: 无

### Finding R1-A9 — ActionRuntimeAdapter 注入无反向依赖

- **Severity**: P3
- **Category**: 架构承诺
- **Contract**: A9 — ActionRuntimeAdapter 注入，flux-action-core 不直接引用 flux-compiler
- **Implementation**: 包设计
- **Test files**: 无直接测试验证无反向依赖
- **Status**: **missing** — 架构约束没有退化测试
- **Recommendation**: 添加退化测试：验证 flux-action-core 的 package.json 不存在对 flux-compiler 的依赖

---

## E. flux-runtime — 运行时核心

### Finding R1-R1 — createRendererRuntime 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: R1 — `createRendererRuntime` 运行时工厂
- **Implementation**: `packages/flux-runtime/src/index.ts`
- **Test files**: `runtime-factory-utils.test.ts` (318 行), `runtime-sources.test.ts`, `runtime-reactions.test.ts`, `runtime-validation.test.ts`, `runtime-ajax.test.ts`
- **Status**: **covered** — 大量集成测试
- **Recommendation**: 无

### Finding R1-R2 — createActionScope 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: R2 — `createActionScope` namespaced-action 注册/查找
- **Implementation**: `packages/flux-runtime/src/action-scope.ts`
- **Test files**: `action-scope-and-adaptor.test.ts` (323 行)
- **Status**: **covered** — 测试 register/replace/resolve/unregister/parent scope fallback
- **Recommendation**: 无

### Finding R1-R3 — createComponentHandleRegistry 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: R3 — `createComponentHandleRegistry` component handle 注册/查找
- **Implementation**: `packages/flux-runtime/src/component-handle-registry.ts`
- **Test files**: `component-handle-registry.test.ts` (267 行)
- **Status**: **covered** — 测试 cid/name resolve、parent 遍历、ambiguity、unregister
- **Recommendation**: 无

### Finding R1-R4 — createFormComponentHandle / createInputComponentHandle / createSurfaceComponentHandle / createCompositeFieldHandle — 测试不全

- **Severity**: P1
- **Category**: 契约未覆盖
- **Contract**: R4 — 四种 handle 工厂
- **Implementation**: 多个文件
- **Test files**: `input-component-handle.test.ts` 存在，但其他 handle 无专项测试
- **Status**: **weak** — 只有 input-component-handle 有测试，其他三种 handle 无专项测试
- **Recommendation**: 确认是否有测试覆盖、补充缺失的 handle 工厂测试

### Finding R1-R5 — createReadonlyScopeBinding 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: R5 — `createReadonlyScopeBinding` 只读 scope 绑定
- **Implementation**: `packages/flux-runtime/src/status-owner.ts`
- **Test files**: `status-owner.test.ts` (210 行)
- **Status**: **covered** — 测试 get/has/非绑定路径 delegate/set 拒绝
- **Recommendation**: 无

### Finding R1-R6 — createProjectedScopeStore 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: R6 — `createProjectedScopeStore` 投影 scope store
- **Implementation**: `packages/flux-runtime/src/projected-scope-store.ts`
- **Test files**: `runtime-factory-utils.test.ts` (14-55 行)
- **Status**: **covered** — 测试投影缓存、derived store、setSnapshot 拒绝
- **Recommendation**: 无

### Finding R1-R7 — publishOwnerStatus 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: R7 — `publishOwnerStatus` 状态发布
- **Implementation**: `packages/flux-runtime/src/status-owner.ts`
- **Test files**: `status-owner.test.ts`
- **Status**: **covered** — 测试 undefined scope/statusPath 和正常路径
- **Recommendation**: 无

### Finding R1-R8 — executeApiObject 缺少独立测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: R8 — `executeApiObject` API 请求执行
- **Implementation**: 内部
- **Test files**: 未找到直接测试 executeApiObject 的测试
- **Status**: **missing** — 通过 dispatch('ajax') 间接覆盖，但 executeApiObject 本身无独立测试
- **Recommendation**: 添加 executeApiObject 的独立单元测试

### Finding R1-R9 — buildFormStatusSummary 缺少测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: R9 — `buildFormStatusSummary` 状态汇总
- **Implementation**: 内部
- **Test files**: 未找到直接测试
- **Status**: **missing** — 无直接测试
- **Recommendation**: 添加 buildFormStatusSummary 测试

### Finding R1-R10 — FormRuntime 核心路径有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: R10 — FormRuntime: validateField / validateForm / submit / reset / setValue / setValues / array ops
- **Test files**: 大量 runtime form 测试文件（form-runtime-values.test.ts, form-runtime-submit-flow.test.ts, form-runtime-array.test.ts, form-runtime-array-ops.test.ts, form-runtime-registration.test.ts, form-runtime-owner-lifecycle.test.ts, form-runtime-publication.test.ts, form-runtime-commits.test.ts 等 20+ files）
- **Status**: **covered** — 运行时 form 核心路径覆盖非常充分
- **Recommendation**: 无

### Finding R1-R11 — ValidationScopeRuntime 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: R11 — ValidationScopeRuntime: validateAt / validateSubtree / validateAll / applyChangesAndRevalidate / applyExternalErrors
- **Test files**: `runtime-validation.test.ts` (530 行), `runtime-validation-compiled.test.ts`, `validation-async-cancel-and-full-pipeline.test.ts`, `validation-rule-semantics-and-lifecycle.test.ts`, `owner-validation-lifecycle-contracts.test.ts`
- **Status**: **covered** — 验证运行时测试全面
- **Recommendation**: 无

### Finding R1-R12 — SurfaceRuntime 缺少独立测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: R12 — SurfaceRuntime: open / close / closeTop / upsert / publishStatus / publishClosed
- **Implementation**: `packages/flux-runtime/src/`
- **Test files**: `surface-teardown-gc.test.ts` 测试 open/close 循环但不测试所有方法
- **Status**: **weak** — 仅覆盖 open/close，closeTop/upsert/publishStatus/publishClosed 无直接测试
- **Recommendation**: 添加 SurfaceRuntime 方法专项测试

### Finding R1-R13 — PageRuntime 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: R13 — PageRuntime: refresh / scope / validationOwner
- **Test files**: `page-runtime.test.ts` (168 行), `status-owner.test.ts`
- **Status**: **covered** — 测试 createManagedPageRuntime 的 data/scope/store/validationOwner/modalContainer
- **Recommendation**: 无

### Finding R1-R14 — scope store 创建 + 词法查找 + 污染防御已覆盖

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: R14 — scope store 创建 + 词法查找 + 污染防御
- **Test files**: 多重覆盖
- **Status**: **covered**
- **Recommendation**: 无

### Finding R1-R15 — form store 状态已覆盖

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: R15 — form store: values / fieldStates / submitting / submitAttempted
- **Test files**: `form-runtime-status-contract.test.ts`, `owner-registration-contracts.test.ts`, `form-runtime-owner-field-states.test.ts`
- **Status**: **covered**
- **Recommendation**: 无

### Finding R1-R16 — async data: data-source controllers — 贯通测试存在但 API 级测试不全

- **Severity**: P1
- **Category**: 跨层断层
- **Contract**: R16 — async data: data-source controllers (formula + API) + reaction runtime
- **Test files**: `runtime-sources-lifecycle.test.ts`, `runtime-sources.test.ts`, `runtime-sources-dedup.test.ts`, `runtime-sources-refresh.test.ts`, `runtime-sources-merge.test.ts`, `formula-data-source-lifecycle.test.ts`, `formula-data-source-recovery.test.ts`, `source-registry.test.ts`, `source-observer-action-context.test.ts`
- **Status**: **covered** — 大量测试覆盖生命周期、dedup、refresh、merge、formula 源
- **Why coverage is misleading**: 虽然测试数量多，但每个测试都是集成级的（通过 createRendererRuntime + compileDataSource + registerDataSource），缺少对 internal controller API 的独立测试
- **Recommendation**: 当前层级可以接受

### Finding R1-R17 — source registry 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: R17 — source registry: 注册 / 替换 / 刷新 / 取消
- **Test files**: `source-registry.test.ts` (300 行)
- **Status**: **covered**
- **Recommendation**: 无

### Finding R1-R18 — reaction handle: dispatch / force / ready / pause / resume / dispose 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: R18 — reaction handle: dispatch / force / ready / pause / resume / dispose
- **Test files**: `reaction-runtime.test.ts` (423 行), `runtime-reactions.test.ts` (350 行), `renderer-reaction-handle.test.ts` (387 行)
- **Status**: **covered** — 全生命周期测试，包括 race condition（dispose 与 microtask 竞态）
- **Recommendation**: 无

### Finding R1-R19 — import stack 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: R19 — import stack: load dedupe / alias visibility / frame push/pop
- **Test files**: `import-stack.test.ts`, `import-stack-rollback.test.ts`, `import-stack-install-prepared.test.ts`, `runtime-imports.test.ts`
- **Status**: **covered** — 全面覆盖
- **Recommendation**: 无

### Finding R1-R20 — resolveNodeMeta / resolveNodeProps 有测试

- **Severity**: P1
- **Category**: 弱覆盖
- **Contract**: R20 — `resolveNodeMeta` / `resolveNodeProps` 节点解析
- **Implementation**: 内部
- **Test files**: `runtime-scope-props.test.ts` 等存在
- **Status**: **weak** — 有测试但主要通过集成测试覆盖，resolveNodeMeta 和 resolveNodeProps 的独立单元测试有限
- **Recommendation**: 确认专用测试是否存在，必要时补充

### Finding R1-R21 — resolveTarget 缺少独立测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: R21 — `resolveTarget` 组件目标解析
- **Test files**: 未找到直接测试
- **Status**: **missing** — 通过 action dispatch 链路间接覆盖
- **Recommendation**: 添加 resolveTarget 的独立测试

### Finding R1-R22 — validation runtime: sync validator / async debounce / stale cancellation 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: R22 — validation runtime: sync validator / async debounce / stale cancellation
- **Test files**: `validation-async-cancel-and-full-pipeline.test.ts`, `runtime-validation.test.ts`, `validation-dependency-closure.test.ts`, `validators.test.ts`, `validation-rules.test.ts`, `validation-message.test.ts`, `form-validation-resilience.test.ts`
- **Status**: **covered** — 验证层覆盖全面，包括异步取消、stale 处理
- **Recommendation**: 无

### Finding R1-R23 — closeSurface 默认行为无测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: R23 — `closeSurface` 默认行为：无 surfaceId 时关闭当前
- **Implementation**: 内部
- **Test files**: 未找到直接测试默认关闭当前 surface 的行为
- **Status**: **missing** — 无测试验证 closeSurface 在不传 surfaceId 时的行为
- **Recommendation**: 添加测试：调用 closeSurface 无参数，验证关闭当前顶层 surface

### Finding R1-R24 — runtime dispose 顺序无专项测试

- **Severity**: P2
- **Category**: 缺少负面场景
- **Contract**: R24 — runtime dispose 顺序：action dispatcher → forms/pages/surfaces → import frames
- **Implementation**: 生命周期
- **Test files**: 未找到测试 dispose 顺序的专项测试
- **Status**: **missing** — 架构承诺无退化测试
- **Recommendation**: 添加生命周期 dispose 顺序测试

---

## F. flux-react — React 集成

### Finding R1-X1 — createSchemaRenderer 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: X1 — `createSchemaRenderer` SchemaRenderer 创建
- **Test files**: `schema-renderer.test.tsx`, `schema-renderer-contracts.test.tsx`
- **Status**: **covered**
- **Recommendation**: 无

### Finding R1-X2 — createDefaultEnv / createDefaultRegistry 无直接测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: X2 — `createDefaultEnv` / `createDefaultRegistry` 默认环境/注册表
- **Test files**: 无直接测试
- **Status**: **missing** — 未找到直接测试这两个函数的文件
- **Recommendation**: 添加测试验证默认 env/registry 的结构完整性

### Finding R1-X3 — NodeRenderer 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: X3 — NodeRenderer: 解析 meta/props/events/regions/helpers, 调用渲染器
- **Test files**: `schema-renderer.test.tsx`, `schema-renderer-contracts.test.tsx`, `defaults-and-auto-renderer.test.tsx`
- **Status**: **covered**
- **Recommendation**: 无

### Finding R1-X4 — hooks 有部分测试

- **Severity**: P1
- **Category**: 契约未覆盖
- **Contract**: X4 — hooks: useRendererRuntime / useRenderScope / useScopeSelector / useOwnScopeSelector / useActionDispatcher / useCurrentForm / useCurrentPage / useCurrentNodeMeta / useRenderFragment
- **Test files**: `hook-contracts.test.tsx` (462 行)
- **Status**: **weak** — hook-contracts.test.tsx 仅覆盖了 useActionDispatcher、useCurrentForm、useOwnScopeSelector、useScopeSelector、useRenderFragment；**useRenderScope、useCurrentPage、useCurrentNodeMeta 没有测试**
- **Why coverage is misleading**: 462 行的测试文件测试了 9 个 hooks 中的 5 个，剩下 4 个依赖未被覆盖
- **Recommendation**: 补充 useRenderScope、useCurrentPage、useCurrentNodeMeta 测试

### Finding R1-X5 — FieldFrame 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: X5 — FieldFrame: wrap 行为, `frameRootTag`, `data-cid`, `data-testid`
- **Test files**: `slot-frame.test.ts`
- **Status**: **covered**
- **Recommendation**: 无

### Finding R1-X6 — DialogHost 有测试（但深度不足）

- **Severity**: P1
- **Category**: 弱覆盖
- **Contract**: X6 — DialogHost: dialog/drawer 渲染, surface 堆栈
- **Test files**: `dialog-host.test.tsx`, `dialog-host-responsive.test.tsx`, `dialog-host-surface.test.tsx`, `dialog-host-close-behavior.test.tsx`, `schema-renderer-dialog-container.test.tsx`, `schema-renderer-runtime-dialogs.test.tsx`, `surface-lifecycle-contracts.test.tsx`
- **Status**: **covered** — dialog 测试文件多，覆盖打开/关闭/close behavior
- **Why coverage is misleading**: 测试使用大量 mock（Dialog/Drawer 组件被 mock），不验证真实渲染；`dialog-host-close-behavior.test.tsx` 几乎全部是 mock。surface 堆栈渲染未通过真实 schema 验证。
- **Recommendation**: 减少 mock，增加通过真实 SchemaRenderer 渲染的贯通测试

### Finding R1-X7 — RenderNodes 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: X7 — RenderNodes: normalize schema → compiled fragment rendering
- **Test files**: `structural-loop-provider.test.tsx`, `scope-and-reactivity.test.tsx`, `data-source-and-node-identity.test.tsx`
- **Status**: **covered**
- **Recommendation**: 无

### Finding R1-X8 — createNormalizedActionEvent 无测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: X8 — `createNormalizedActionEvent` 事件规范化
- **Implementation**: 内部
- **Test files**: 未找到直接测试
- **Status**: **missing** — 无测试
- **Recommendation**: 添加 createNormalizedActionEvent 单元测试

### Finding R1-X9 — RendererComponentProps 合同无专项贯通测试

- **Severity**: P2
- **Category**: 跨层断层
- **Contract**: X9 — `RendererComponentProps` 合同：props/meta/regions/events/reactions/helpers
- **Implementation**: 类型定义
- **Test files**: 无测试确保每个属性都在运行时被正确构建
- **Status**: **weak** — props/meta/events 有间接覆盖，但 regions/reactions/helpers 的运行时存在性无贯通测试
- **Recommendation**: 添加合成渲染器测试，验证所有属性在渲染器函数中均可访问

### Finding R1-X10 — boolean-like props 无负面测试

- **Severity**: P2
- **Category**: 缺少负面场景
- **Contract**: X10 — boolean-like props 只暴露 `boolean | undefined`，无 truthy 强制
- **Test files**: 未找到
- **Status**: **missing** — 无测试验证 boolean-like props 不会被强制转换为 boolean
- **Recommendation**: 添加测试：传字符串 "true" 或 1，验证渲染器收到的是原始值而非 true

### Finding R1-X11 — 事件转发规则有部分测试

- **Severity**: P1
- **Category**: 弱覆盖
- **Contract**: X11 — 事件转发规则：DOM event → props.events.onXxx(event)
- **Test files**: `event-prevention.test.tsx`, `schema-renderer.test.tsx`
- **Status**: **weak** — 有测试验证事件被调用，但未覆盖所有事件类型和各选项
- **Recommendation**: 补充多个事件类型和选项的测试

### Finding R1-X12 — preventDefault / stopPropagation 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: X12 — `preventDefault` / `stopPropagation` schema 声明式同步执行
- **Test files**: `event-prevention.test.tsx` (410 行)
- **Status**: **covered** — 详尽测试 preventDefault/stopPropagation/stopPropagationAndPreventDefault 组合
- **Recommendation**: 无

### Finding R1-X13 — ReactionHandle lazy proxy 有测试

- **Severity**: P0
- **Category**: 无（已覆盖）
- **Contract**: X13 — ReactionHandle lazy proxy: StrictMode-safe, buffer pre-activation calls, flush on ready
- **Test files**: `reaction-handle-proxy.test.ts` (178 行)
- **Status**: **covered** — 测试 proxy 创建、pre-activation buffer、激活后直接委托、debug state
- **Recommendation**: 无

### Finding R1-X14 — lifecycle actions (onMount / onUnmount) 缺少测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: X14 — lifecycle actions: onMount / onUnmount 编译 + 自动分发
- **Test files**: 未找到专项测试验证 onMount/onUnmount 的自动分发
- **Status**: **missing** — 无测试验证 schema 中的 onMount/onUnmount 被编译并自动执行
- **Recommendation**: 添加测试：渲染含 onMount 的 schema，验证 action 被自动调用

### Finding R1-X15 — source-enabled props + executeSource 缺少测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: X15 — source-enabled props + executeSource: 保持 action context 形状
- **Test files**: `node-source-prop-controller.test.ts` 测试 controller 逻辑，但 executeSource 保持 action context 形状无测试
- **Status**: **weak** — controller 有测试，但 context 形状未验证
- **Recommendation**: 添加测试验证 source-enabled props 执行时 action context 包含正确字段

### Finding R1-X16 — useSourceValue / useDataSourceStatus 有测试

- **Severity**: P1
- **Category**: 弱覆盖
- **Contract**: X16 — `useSourceValue` / `useDataSourceStatus` 数据源 hook
- **Test files**: `use-source-value.test.tsx`, `use-node-source-props.test.tsx`
- **Status**: **weak** — use-source-value 有测试，但通过大量 mock 绕过真实运行时。数据源状态变化时 hook 重新渲染的测试有限
- **Recommendation**: 减少 mock，增加通过真实运行时渲染的贯通测试

### Finding R1-X17 — useInputComponentHandle / useSurfaceComponentHandle / useCompositeFieldHandle 无直接测试

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contract**: X17 — `useInputComponentHandle` / `useSurfaceComponentHandle` / `useCompositeFieldHandle`
- **Test files**: 未找到
- **Status**: **missing** — 这三个 hook 没有直接的 React 组件测试
- **Why coverage is misleading**: Renderer 测试可能间接使用了它们，但无专项测试
- **Recommendation**: 添加测试验证这些 hook 返回正确的 handle 接口

---

## G. flux-bundle — Host Facade

### Finding R1-B1~B3 — flux-bundle 测试薄弱

- **Severity**: P2
- **Category**: 契约未覆盖
- **Contracts**: B1 (`createFluxRendererRegistry`), B2 (`createDefaultFluxEnv`), B3 (`createFluxSchemaRenderer`)
- **Status**: **weak** — 仅有 `index.test.tsx`，覆盖率估计 30%
- **Note**: 这些已在阶段报告中标记为"仅 2 个测试文件"
- **Recommendation**: bundle 层是最终 API 入口，应显著提升测试覆盖

---

## H. 跨层契约 (L1-L7)

### Finding R1-L1 — compile → runtime 无退化测试

- **Severity**: P1
- **Category**: 跨层断层
- **Contract**: L1 — compile → runtime: CompiledTemplate.TemplateNode 被 runtime 消费，不经过 CompiledSchemaNode
- **Status**: **missing** — 无退化测试确保编译产出不被 runtime 错误解释
- **Recommendation**: 添加 cross-layer smoke test

### Finding R1-L2 — runtime → react 分段覆盖，缺少贯通

- **Severity**: P1
- **Category**: 跨层断层
- **Contract**: L2 — runtime → react: NodeRenderer 消费 ResolvedNodeMeta/ResolvedNodeProps → 传递给渲染器
- **Status**: **weak** — 分段覆盖但缺少 schema input → react renderer output 的完整贯通
- **Recommendation**: 添加端到端渲染测试（插入真实渲染器组件，验证 props）

### Finding R1-L3 — scope 链正确传播有测试

- **Severity**: P1
- **Category**: 弱覆盖
- **Contract**: L3 — scope 链: page scope → form scope → fragment scope 的正确传播
- **Test files**: `scope-and-reactivity.test.tsx`, `scope-and-reactivity-generation.test.tsx`, `scope-and-reactivity-imports.test.tsx`
- **Status**: **weak** — 有部分测试但未全面验证三层 scope 链的隔离和穿透
- **Recommendation**: 补充明确的三层 scope 链测试

### Finding R1-L4 — action dispatch 完整链路分段覆盖

- **Severity**: P1
- **Category**: 跨层断层
- **Contract**: L4 — action dispatch: schema compile → runtime eval → react dispatch → adapter 的完整链路
- **Status**: **weak** — 分段覆盖但缺少从 schema 定义到 adapter 调用的全链路贯通
- **Recommendation**: 添加从 SchemaRenderer 渲染到 adapter.invokeBuiltInAction 的全链路测试

### Finding R1-L5 — data-source 贯通测试存在但有限

- **Severity**: P1
- **Category**: 跨层断层
- **Contract**: L5 — data-source: compile-lowered → runtime controller → react source-enabled props
- **Test files**: 分段覆盖
- **Status**: **weak** — 编译和 runtime 分段有测试，但"编译产物 → runtime controller → React 渲染结果"贯通测试不足
- **Recommendation**: 添加通过真实 SchemaRenderer 渲染 data-source schema 并验证 scope 数据的贯通测试

### Finding R1-L6 — reaction 贯通测试存在但有限

- **Severity**: P1
- **Category**: 跨层断层
- **Contract**: L6 — reaction: compile-lowered → runtime ReactionHandle → react props.reactions
- **Test files**: 分段覆盖
- **Status**: **weak** — 编译和 runtime 分段有测试，但通过 SchemaRenderer 渲染含 reaction 的 schema 并验证 behavior 的贯通测试有限
- **Recommendation**: 添加贯通测试

### Finding R1-L7 — validation 贯通存在

- **Severity**: P1
- **Category**: 弱覆盖
- **Contract**: L7 — validation: compile model → runtime validate → React error display
- **Test files**: `schema-renderer-validation-owner-boundary.test.tsx`, `form-state.test.ts`
- **Status**: **weak** — 验证贯通路径存在测试，但错误显示层（React UI 层面的 error message rendering）测试有限
- **Recommendation**: 验证 UI 层面错误显示的完整性

---

## 总体测试覆盖评估

### 覆盖最强的区域

| 区域                              | 覆盖级别    | 说明                                                                |
| --------------------------------- | ----------- | ------------------------------------------------------------------- |
| flux-formula 表达式编译/执行      | **covered** | compiler/parser/evaluator/registry 都有全面测试，包含边界和负面场景 |
| flux-core path/utils              | **covered** | path.test.ts、validation-model.test.ts、debounce.test.ts 等覆盖充分 |
| flux-core registry                | **covered** | 完整的 register/get/has/list/override 测试                          |
| flux-action-core 控制流           | **covered** | retry/timeout/parallel/branches/result classification 覆盖全面      |
| flux-runtime form runtime         | **covered** | 20+ 测试文件覆盖 form 核心路径，从注册到提交到验证                  |
| flux-runtime reaction             | **covered** | 全生命周期测试，包括竞态条件                                        |
| flux-runtime scope 污染防御       | **covered** | 双重覆盖（core 路径 + runtime scope）                               |
| flux-runtime import stack         | **covered** | 多文件覆盖加载/回滚/安装                                            |
| flux-compiler validation lowering | **covered** | collect/compile/merge 全面测试                                      |
| flux-compiler shape-validation    | **covered** | 5 个专用测试文件                                                    |

### 覆盖最弱的区域

| 区域                                              | 覆盖级别            | 说明                                                                      |
| ------------------------------------------------- | ------------------- | ------------------------------------------------------------------------- |
| flux-react hook 完整性                            | **weak**            | 9 hooks 中 4 个无测试（useRenderScope/useCurrentPage/useCurrentNodeMeta） |
| flux-react X6 Dialog                              | **covered**但重mock | 大量 mock 导致测试不可靠                                                  |
| flux-core C14 `shouldFailOnSchemaDiagnostics`     | **weak**            | 关键函数无测试                                                            |
| flux-core C9 isSchema/isSchemaArray/isSchemaInput | **weak**            | 3/4 函数无测试                                                            |
| flux-formula F7 bindAst                           | **missing**         | 核心编译环节无独立测试                                                    |
| flux-formula F9 编译失败回退                      | **missing**         | 无负面测试                                                                |
| flux-runtime R4 handle 工厂                       | **weak**            | 3/4 handle 工厂无专项测试                                                 |
| flux-runtime R12 SurfaceRuntime                   | **weak**            | 6 方法仅 2 个有测试                                                       |
| flux-runtime R21 resolveTarget                    | **missing**         | 无独立测试                                                                |
| flux-runtime R24 dispose 顺序                     | **missing**         | 无退化测试                                                                |
| flux-react X8 createNormalizedActionEvent         | **missing**         | 无测试                                                                    |
| flux-react X10 boolean-like props                 | **missing**         | 无负面测试                                                                |
| flux-react X14 onMount/onUnmount                  | **missing**         | 无生命周期测试                                                            |
| flux-react X17 useInput/Surface/Composite handle  | **missing**         | 3 hooks 无测试                                                            |
| 跨层 L1-L7                                        | **weak**            | 全部分段覆盖，缺少贯通测试                                                |
| flux-bundle B1-B3                                 | **weak**            | ～30% 估计覆盖率                                                          |

### 重点关注的 false coverage 模式

1. **入口错误覆盖**: C3 (scope-change) 直接构造内部状态而非通过 scope.update()/scope.merge()
2. **过度 mock**: X6 Dialog 测试大量使用 mock Dialog/Drawer 组件，不验证真实渲染
3. **契约未覆盖**: F7 bindAst、C9 部分函数、X14 onMount/onUnmount 等完全没有测试
4. **缺少负面场景**: F9 编译失败回退、X10 boolean-like props、所有空值/错误类型/竞态场景
5. **跨层断层**: L1-L7 全部缺少从 compile → runtime → react → renderer 的贯通测试
