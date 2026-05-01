# 85 Formula Engine Self-Implementation Plan

> Plan Status: completed
> Last Reviewed: 2026-04-15
> Source: `docs/architecture/flux-formula.md`, `docs/architecture/dependency-tracking.md`, `docs/architecture/security-design-requirements.md`, `docs/architecture/action-scope-and-imports.md`, `packages/flux-core/src/types/compilation.ts`

## Purpose

本计划用于把 `@nop-chaos/flux-formula` 从 `amis-formula` 依赖切换为仓库内自研表达式引擎，并在不改变 `FormulaCompiler` / `ExpressionCompiler` 对外接口的前提下，收口一个可落地、可验证、可迁移的前端运行时公式实现。

本计划不重新讨论“是否继续依赖 amis-formula”或“是否引入 compile-time expression / Executable 编译 / 词法作用域分析”这类已在架构文档中否定的方向，而是把当前已经确认的自研 AST + evaluator 路线拆成明确执行切片。

## Current Baseline

- `packages/flux-formula/package.json` 当前直接依赖 `amis-formula`。
- `packages/flux-formula/src/compile.ts` 当前通过 `import { evaluate, parse } from 'amis-formula'` 调用外部 parser / evaluator。
- `packages/flux-formula/src/compile.ts` 当前还依赖 `env.functions` 和 `env.filters` 组装运行时调用上下文，这与新的全局注册机制不一致。
- `packages/flux-formula/src/scope.ts`、`evaluate.ts`、`index.ts` 已经有本仓库自己的 dependency collection / state reuse / compiled runtime value 框架，可继续复用。
- `packages/flux-formula/src/index.test.ts`、`evaluate.test.ts`、`scope.test.ts` 已存在，可作为迁移过程中的 baseline 和新增测试落点。
- `docs/architecture/flux-formula.md` 已确认以下约束：
  - parser 直接产出 AST，evaluator 直接在 AST 上求值
  - 不做 Executable 编译
  - 不做词法作用域分析
  - 不做编译期表达式、多阶段模板、扩展方法
  - 通过全局注册表提供顶层函数和 `$Math` / `$JSON` / `$Date` 命名空间对象
  - `IF` / `SWITCH` 采用 lazy thunk 调用，其余函数默认 eager
- 当前文档与 live code 之间的主要 gap 是：实现仍然完全依赖 amis-formula，而不是仓库内 parser / evaluator。

## Implementation Decisions Locked Before Execution

- **Filter-pipe compatibility** 只作为迁移兼容层存在，放在 `packages/flux-formula/src/compile.ts` 或紧邻的专用预处理模块中，不进入 parser 主语法。
- 兼容层只支持 `${expr | filter}` 和 `${expr | filter:arg1:arg2}` 这类历史 amis-formula 管道写法；更复杂的历史边界 case 不做隐式兼容。
- filter-pipe 预处理后的调用统一改写为普通函数调用，例如 `filter(expr, arg1, arg2)`，解析后从 **全局函数注册表** 解析，不再依赖 `env.filters`。
- imported alias 语法 `$demo.formatName(...)` 仍然由 `compile.ts` 的 rewrite/import-adapter 路径负责，不能因全局注册表引入而回归。
- v1 **保留 lambda 在 scope 内**，因为 `ARRAYMAP` / `ARRAYFILTER` / `ARRAYSOME` / `ARRAYEVERY` 等高阶函数依赖它；本计划不再把 lambda 作为可下放的 optional slice。
- 错误契约以 `docs/architecture/flux-formula.md` 为准：
  - `compileExpression` / `compileTemplate` 语法错误直接抛出
  - `compileNode` 对嵌入值场景保留静态回退策略
  - 运行时表达式错误必须走 `RendererEnv.monitor?.onError`，phase 为 `expression`

## Goals

- 在 `packages/flux-formula` 内实现可替代 amis-formula 的 lexer / parser / evaluator / registry 主链。
- 保持 `FormulaCompiler`、`ExpressionCompiler`、`CompiledRuntimeValue`、依赖收集和状态复用对上层调用者的接口不变。
- 落实 `docs/architecture/flux-formula.md` 中的 v1 语法面，不额外扩展高风险语法。
- 建立全局函数 / 命名空间注册机制，替代 `env.functions` 主路径。
- 为 parser、evaluator、template splitter、scope tracking、migration compatibility 建立大量单元测试。
- 对 `@nop-chaos/flux-formula` 建立 package-level coverage gate，目标调整为 **>=70% coverage**；同时要求 v1 语法面、内置函数/命名空间、错误语义、迁移矩阵各类别都必须有 focused tests，而不是只追求数字覆盖率。

## Non-Goals

- 不实现 compile-time expression。
- 不实现 AST -> Executable 编译层。
- 不实现词法作用域分析或声明语句支持。
- 不实现表达式内模板字符串、正则字面量、spread、后缀非空断言。
- 不在本计划中扩展到完整 amis-formula 函数全集；只实现当前文档和迁移矩阵要求的函数面。
- 不在本计划中处理 IDE 类型提示、静态类型推导、schema authoring tooling。

## Scope

### In Scope

- `docs/architecture/flux-formula.md`
- `docs/plans/85-formula-engine-self-implementation-plan.md`
- `packages/flux-formula/package.json`
- `packages/flux-formula/src/index.ts`
- `packages/flux-formula/src/compile.ts`
- `packages/flux-formula/src/evaluate.ts`
- `packages/flux-formula/src/scope.ts`
- `packages/flux-formula/src/template.ts`
- `packages/flux-formula/src/ast.ts`（new）
- `packages/flux-formula/src/lexer.ts`（new）
- `packages/flux-formula/src/parser.ts`（new）
- `packages/flux-formula/src/evaluator.ts`（new）
- `packages/flux-formula/src/registry.ts`（new）
- `packages/flux-formula/src/builtins.ts`（new）
- `packages/flux-formula/src/date-helper.ts`（new）
- `packages/flux-formula/src/**/*.test.ts`
- 相关 daily log

### Out Of Scope

- `flux-runtime` / `flux-react` 的对外接口重构
- action runtime、import loader、source registry 的架构改造
- 非公式引擎相关的 dependency tracking 语义重写
- playground authoring UX 和 expression editor 智能提示

## Execution Plan

### Phase 1 - Freeze V1 Contract And Baseline Tests

Status: completed
Targets: `docs/architecture/flux-formula.md`, `packages/flux-formula/src/index.test.ts`, `packages/flux-formula/src/evaluate.test.ts`, `packages/flux-formula/src/scope.test.ts`

- [x] 对照 live repo 再次冻结 v1 支持语法、函数面、命名空间对象、迁移矩阵和错误语义。
- [x] 为现有 compile/template/scope 行为补充基线测试，明确哪些行为必须保持不变。
- [x] 补充针对全局注册机制的文档和测试入口定义，避免后续实现时再次回到 `env.functions` 模式。
- [x] 先建立 coverage 基线命令和统计口径，明确“package-level coverage >=70% + 所有特性有 focused tests”具体覆盖哪些模块、特性面和迁移类别。
- [x] 明确 filter-pipe compatibility、imported alias compatibility、compile-time throw vs compileNode static fallback、monitor error reporting 都是必须保持的契约。

Exit Criteria:

- [x] `docs/architecture/flux-formula.md` 与 live baseline、`action-scope-and-imports.md`、`dependency-tracking.md`、`security-design-requirements.md` 的相关契约已逐条对齐。
- [x] 现有行为已通过测试被锁定，后续替换 parser/evaluator 时可检测回归。
- [x] 覆盖率范围定义清楚：至少包括 `compile.ts`、`template.ts`、`scope.ts`、`registry.ts`、`date-helper.ts`、`lexer.ts`、`parser.ts`、`evaluator.ts`、`builtins.ts` 的核心逻辑，以及文档列出的 v1 语法/函数/错误/迁移类别。
- [x] 形成 repo-observable 覆盖率命令和门槛定义，例如 package-level Vitest `>=70%` coverage gate，并补齐所有特性的 focused tests。

### Phase 2 - Registry, Namespaces, And Compiler Entry Refactor

Status: completed
Targets: `packages/flux-formula/src/registry.ts`, `packages/flux-formula/src/date-helper.ts`, `packages/flux-formula/src/compile.ts`, `packages/flux-formula/src/index.ts`, related tests

- [x] 实现全局函数注册表和命名空间注册表，提供 `registerFunction()`、`registerNamespace()`、读取快照的公共 API。
- [x] 注册 `$Math`、`$JSON`、`$Date` 默认命名空间对象。
- [x] 落地 `DateHelper`，只支持文档约定的命名格式，不引入 token formatter。
- [x] 调整 `compile.ts`，去除 `env.functions` 主路径，改用全局注册表 + imports 适配。
- [x] 明确 imported alias 调用与全局函数命名的优先级和冲突处理方式。
- [x] 明确 filter-pipe 预处理调用落到全局注册表，而不是重新引入 `env.filters`。

Exit Criteria:

- [x] `compile.ts` 不再依赖 `amis-formula` 的注册机制。
- [x] 全局注册 API 可被测试直接调用并验证生效。
- [x] `$Math` / `$JSON` / `$Date` 能通过编译执行路径访问到。
- [x] imported alias 与全局函数 / 命名空间对象的优先级有明确测试，不产生名称冲突回归。

### Phase 3 - Lexer And Parser Implementation

Status: completed
Targets: `packages/flux-formula/src/ast.ts`, `packages/flux-formula/src/lexer.ts`, `packages/flux-formula/src/parser.ts`, related tests

- [x] 定义 v1 AST 节点类型，严格对齐文档，不预留未实现节点。
- [x] 实现 lexer，覆盖数字、字符串、标识符、`and/or`、二元/一元运算符、数组/对象字面量、箭头函数、`${}` 内表达式模式。
- [x] 实现递归下降 parser，覆盖优先级、成员访问、调用、可选成员访问、三元、空值合并、`instanceof`、幂运算。
- [x] 明确 parser 错误对象格式，便于 compile 阶段观测失败并决定是否 fallback 为静态字符串。
- [x] 不实现文档已排除的语法：regex、template literal、spread、postfix non-null assertion、optional call、new。

Exit Criteria:

- [x] parser 能完整解析文档列出的 v1 语法面。
- [x] 所有不支持语法都有明确失败测试，而不是隐式接受后在 evaluator 崩溃。
- [x] parser 分支、优先级、错误路径具备 repo-observable coverage，并纳入 package-level `>=70%` gate；v1 parser 语法面和不支持语法必须均有 focused tests。

### Phase 4 - AST Evaluator And Lazy Function Invocation

Status: completed
Targets: `packages/flux-formula/src/evaluator.ts`, `packages/flux-formula/src/builtins.ts`, `packages/flux-formula/src/registry.ts`, related tests

- [x] 实现 AST tree-walking evaluator，不使用 `eval`、`new Function`、`with`。
- [x] 实现标识符解析顺序：lambda frame -> namespaces -> scope。
- [x] 实现普通函数调用与成员调用的 receiver 语义。
- [x] 实现函数元数据调用模式：默认 eager，`IF` / `SWITCH` 为 lazy。
- [x] 实现顶层函数：`IF`、`SWITCH`、`SUM`、`AVG`、`COUNT`、数组函数、文本函数及文档列出的 v1 必需函数。
- [x] 实现文档定义的自定义相等规则，而不是直接套用 JS `===`。
- [x] 明确 unknown identifier、null member access、bad call target 等错误路径。
- [x] 实现 monitor error reporting 适配，保证运行时表达式错误可观测。

Exit Criteria:

- [x] evaluator 覆盖文档中的核心表达式语义和错误语义。
- [x] `IF` / `SWITCH` 的 lazy 行为有 focused tests，能证明未命中分支不执行。
- [x] 调用语义、相等语义、lambda 参数遮蔽、成员 receiver 行为都有独立测试。
- [x] evaluator 和 builtins 的核心逻辑纳入 package-level `>=70%` coverage gate，且 lazy/eager、receiver、错误路径、内置函数/命名空间均有 focused tests。
- [x] 运行时错误会通过 `RendererEnv.monitor?.onError` 以 `expression` phase 上报，并有测试证明。

### Phase 5 - Template, Scope Tracking, And Runtime Integration

Status: completed
Targets: `packages/flux-formula/src/template.ts`, `packages/flux-formula/src/scope.ts`, `packages/flux-formula/src/compile.ts`, `packages/flux-formula/src/evaluate.ts`, related tests

- [x] 让 template splitter 与新 parser/evaluator 对接，保持 `${}` 模板行为稳定。
- [x] 保持 root-based dependency tracking 语义，不因新 evaluator 回退到 deep-path 或 whole-scope wildcard。
- [x] 让 compile/runtime value 路径继续复用现有 state reuse 逻辑。
- [x] 验证 imported alias syntax、namespace object、template segment 混排、fallback to static 等边界。
- [x] 实现 filter-pipe compatibility 预处理，并验证其只影响迁移兼容层，不污染 parser 主语法。
- [x] 审查 `compileExpression` / `compileTemplate` 的错误回退策略是否仍符合现有上层契约。

Exit Criteria:

- [x] 新 evaluator 已接入 `compile.ts` 主路径，`amis-formula` 不再参与执行。
- [x] `scope.ts` / `evaluate.ts` 行为与 dependency-tracking 文档保持一致。
- [x] template、scope、runtime state 相关测试全部通过，并覆盖关键分支。
- [x] filter-pipe 兼容、imported alias 兼容、compile-time throw / compileNode static fallback 行为均有 focused tests。

### Phase 6 - Migration Compatibility, Package Cleanup, And Verification

Status: completed
Targets: `packages/flux-formula/package.json`, `packages/flux-formula/src/**/*`, `docs/architecture/flux-formula.md`, `docs/logs/`, related tests

- [x] 移除 `amis-formula` 依赖。
- [x] 对照迁移矩阵实现最小必要兼容：过滤器管道预处理、直接兼容路径、明确失败路径。
- [x] 补充与 amis-formula 差异对应的 focused migration tests。
- [x] 加入 package-level coverage gate，并将 `>=70% coverage + 所有特性 focused tests` 作为 CI/本地验证门槛。
- [x] 运行并修复 `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test`。
- [x] 写 daily log，记录实现范围、关键决策、未实现项和后续方向。

Exit Criteria:

- [x] `amis-formula` 已从 `packages/flux-formula` 移除。
- [x] 迁移矩阵中“自动迁移 / 直接兼容 / 手工迁移 / 不支持”都有对应测试或明确错误断言。
- [x] package-level coverage 报告可证明 `@nop-chaos/flux-formula` 达到 `>=70% coverage`，同时 v1 语法面、函数面、错误语义和迁移矩阵类别均有 focused tests。
- [x] `pnpm --filter @nop-chaos/flux-formula typecheck`、`build`、`lint`、`test`、`test:coverage` 通过；workspace-level verification remains outside this plan and may fail on unrelated packages.

## Validation Checklist

- [x] `packages/flux-formula` 不再依赖 `amis-formula`
- [x] `FormulaCompiler` / `ExpressionCompiler` 对上层接口保持不变
- [x] 全局 `registerFunction()` / `registerNamespace()` 机制已落地并有测试
- [x] `$Math` / `$JSON` / `$Date` 可通过表达式访问
- [x] `IF` / `SWITCH` lazy 调用语义已实现并有 focused tests
- [x] `&&` / `||` / `and` / `or` 逻辑短路由 AST evaluator 直接保证
- [x] root-based dependency tracking 语义无回退
- [x] imported alias 表达式调用（如 `$demo.formatName(...)`）保持可用并有测试
- [x] filter-pipe 兼容层改写到全局注册函数，并有 focused tests
- [x] `compileExpression` / `compileTemplate` 抛错与 `compileNode` 静态回退语义均有测试
- [x] 运行时表达式错误通过 `RendererEnv.monitor?.onError` 上报，并有测试
- [x] 迁移矩阵中每一类至少有一个测试样例
- [x] 编写大量单元测试覆盖 parser、evaluator、template、scope、registry、builtins 核心分支，并显式覆盖 v1 语法面、内置函数/命名空间、错误语义、迁移矩阵每一类
- [x] `compile.ts` / `date-helper.ts` / `lexer.ts` / `parser.ts` / `evaluator.ts` / `registry.ts` / `builtins.ts` / `template.ts` / `scope.ts` 纳入 package-level `>=70% coverage` gate
- [x] `pnpm --filter @nop-chaos/flux-formula typecheck`
- [x] `pnpm --filter @nop-chaos/flux-formula build`
- [x] `pnpm --filter @nop-chaos/flux-formula lint`
- [x] `pnpm --filter @nop-chaos/flux-formula test`
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据

## Risks And Rollback

- parser 语法面如果放得过大，最容易在优先级和边界 case 上失控；应严格按文档收敛，不临时追加语法。
- template splitter 与表达式 parser 的边界若处理不稳，容易把无效模板错误地吞成静态字符串；必须有专门回归测试。
- 全局注册机制如果直接暴露可变对象引用，可能引入测试污染；实现时需要提供 reset / snapshot 辅助，保证测试隔离。
- lambda 已被锁定为本计划 scope 内能力；若实现出现超预算迹象，应先收缩高阶函数面或拆细内部实现，但不能在执行中悄悄把 lambda 移出当前计划。

## Closure

Status Note: plan-owned formula engine self-hosting is now landed. `@nop-chaos/flux-formula` no longer depends on `amis-formula`, the package ships its own parser/evaluator/registry/builtins stack, and focused verification plus package-level coverage now satisfy the plan exit criteria.

Closure Audit Evidence:

- Reviewer / Agent: fresh `explore` subagent closure audit
- Evidence: task `ses_273330812ffexq2k1OIo2sYexw` found no remaining plan-owned implementation gaps. It confirmed that `packages/flux-formula/package.json` has no `amis-formula` dependency, `src/compile.ts` uses local parser/evaluator plus filter-pipe/import compatibility and monitor reporting, `src/registry.ts` / `src/builtins.ts` expose the required global registry and builtins, `packages/flux-formula/vitest.config.ts` enforces the package-level `>=70%` coverage gate, and `pnpm --filter @nop-chaos/flux-formula typecheck`, `build`, `lint`, `test`, and `test:coverage` all pass.

Follow-up:

- No remaining plan-owned work. Any future builtin expansion, authoring tooling, or type-inference work should start as a new successor plan instead of reopening this file.
