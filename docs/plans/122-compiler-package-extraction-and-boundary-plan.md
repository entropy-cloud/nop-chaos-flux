# 122 Compiler Package Extraction And Boundary Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-21
> Source: `docs/architecture/schema-file-validator.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/frontend-baseline.md`, `docs/experiments/next-gen-low-code-framework-final/16-current-implementation-comparison.md`, `docs/experiments/next-gen-low-code-framework-final/02-execution-package-and-admission.md`
> Related: `docs/plans/41-compiler-integrated-schema-diagnostics-implementation-plan.md`, `docs/plans/116-module-cache-import-stack-compile-symbol-resolution-plan.md`, `docs/plans/119-action-precompile-and-args-unification-plan.md`, `docs/plans/118-flux-internal-kernel-session-refactor-plan.md`

## Purpose

在不引入 execution package / admission 重写的前提下，把当前实际已经成型但仍物理驻留在 `flux-runtime` 内的 compiler 责任独立成单独 package，形成更硬的 compile-time / runtime 边界。

这份计划的目标不是讨论抽象“未来 compiler 应该长什么样”，而是把 live repo 中已经存在的 schema compile、schema validate、action precompile、compile-time symbol resolution、compile diagnostics、validation model lowering 等职责从 `packages/flux-runtime` 拆到新的 `packages/flux-compiler`，并明确哪些依赖需要同步下沉到 `flux-core`，哪些仍然留在 runtime。

## Current Baseline

- `packages/flux-runtime/src/runtime-factory.ts` 当前默认直接创建 `expressionCompiler` 和 `schemaCompiler`，但 `RendererRuntime` 入口已经允许外部注入 `schemaCompiler`，说明 runtime 和 compiler 之间已经存在可利用的 seam。
- `packages/flux-runtime/src/schema-compiler.ts` 当前同时拥有 `compile(...)` 与 `validate(...)`，而 `docs/architecture/schema-file-validator.md` 已明确“schema compiler owns the structural analysis pass; diagnostics-only validation is a thin adapter over the same pass”。
- `packages/flux-runtime/src/schema-compiler/` 目录已经是一个独立子系统，包含 `fields.ts`、`regions.ts`、`tables.ts`、`validation-collection.ts`、`diagnostics.ts`、`shape-validation.ts`、`host-action-validation.ts`、`target-enrichment.ts`。
- `packages/flux-runtime/src/action-compiler.ts` 当前是纯 compile-time 逻辑，但仍与 runtime 同包导出；同时 runtime dispatch 路径也直接依赖它做 ad-hoc action precompile。
- `packages/flux-runtime/src/compile-symbol-table.ts` 当前只服务 compile-time `$` symbol resolution，属于 compiler substrate，而不属于 live runtime sidecar。
- `packages/flux-runtime/src/schema-compiler.ts` 当前仍依赖 `packages/flux-runtime/src/validation/rules.ts` 提供 `normalizeValidationTriggers(...)` / `normalizeValidationVisibilityTriggers(...)`，说明“validation schema normalization”与“runtime validation execution”还未物理分层。
- `packages/flux-runtime/src/schema-compiler.ts` 还依赖 `buildCompiledValidationOrder`、`createCompiledCidState`、`createNodeId`、`isSchemaInput` 等 `flux-core` 合同与纯函数；这些依赖本身已经符合 compiler package 方向。
- `packages/flux-formula` 已经是独立 expression compiler/evaluator package；当前 schema compiler 直接复用 `createExpressionCompiler(createFormulaCompiler())`，因此 schema compiler 进一步独立不会破坏现有公式编译架构。
- `docs/experiments/next-gen-low-code-framework-final/16-current-implementation-comparison.md` 与 `02-execution-package-and-admission.md` 都把“compiler 独立于 runtime”视为未来方向；但 live repo 目前仍是 “schema + runtime compile” 主入口。
- `docs/plans/118-flux-internal-kernel-session-refactor-plan.md` 已被取消；当前更现实的收口路径不是重写 `kernel/session`，而是先把 compile-time 责任从 runtime 包中拆出来。

## Goals

- 新增独立 `@nop-chaos/flux-compiler` package，成为 schema compile / validate / action precompile 的物理 owner。
- 把 compile-time 纯逻辑从 `flux-runtime` 中移出，同时保持现有 public runtime 用法基本兼容。
- 明确 compiler 与 runtime 的边界：compiler 负责 schema 结构分析、静态语义校验、lowering、compiled validation model 组装；runtime 负责 live scope、instantiation、dispatch、request/source/reaction/form/page/surface 生命周期与 runtime value validation execution。
- 让 `validateSchema(...)` 与 `createSchemaCompiler(...)` 的 owner 与文档表述一致，不再继续驻留在 runtime package。
- 为后续 execution package / admission / IDE tooling / CI validation 预留正确的 package 边界，但本计划本身不强推这些上层能力落地。

## Non-Goals

- 不在本计划中引入新的 `ExecutionPackage` 公共 contract。
- 不在本计划中重做 `RendererRuntime` 的 facade、kernel/session、mount session 拓扑。
- 不在本计划中修改 author-visible schema 写法。
- 不在本计划中重写 `flux-formula` parser/evaluator 或改变表达式语义。
- 不在本计划中重写 runtime form validation orchestration、async validation、submit lifecycle。
- 不在本计划中一次性做完整 LSP / editor / CLI schema validation 产品化。

## Scope

### In Scope

- 新增 `packages/flux-compiler/` package 与公共导出面。
- `schema-compiler.ts` 及其子模块从 `flux-runtime` 迁移到 `flux-compiler`。
- `action-compiler.ts` 与 `compile-symbol-table.ts` 的迁移与适配。
- compiler 相关测试迁移到 `flux-compiler`。
- `flux-runtime`, `flux-core`, `flux-formula`, `flux-react`, renderer packages 的 import/export 跟随调整。
- 必要的纯函数下沉到 `flux-core`，用于切断 compiler 对 runtime 包的错误依赖。
- 相关 architecture docs、plan docs、daily log 同步。

### Out Of Scope

- runtime source/reaction/request/import/page/form/surface 模块迁移。
- debugger 事件模型、compile trace UI、execution package persistence。
- host manifest / capability manifest 的全量重构。
- 任何需要引入新 authoring DSL 或 breaking public runtime API 的工作。

## Target Package Structure

目标结构如下：

```text
packages/
  flux-core/
    src/
      types/
      schema-diagnostics/
      validation-model.ts
      compile-utils/                # 如有需要，用于纯 compile-time shared helpers

  flux-formula/
    src/
      compile.ts
      evaluate.ts
      parser.ts

  flux-compiler/
    src/
      index.ts
      schema-compiler.ts
      action-compiler.ts
      compile-symbol-table.ts
      schema-compiler/
        diagnostics.ts
        fields.ts
        host-action-validation.ts
        index.ts
        regions.ts
        shape-validation.ts
        tables.ts
        target-enrichment.ts
        validation-collection.ts
      __tests__/
        schema-compiler-registry.test.ts
        action-compiler.test.ts     # 若现有测试需要补齐
      schema-compiler-*.test.ts

  flux-runtime/
    src/
      runtime-factory.ts            # 改为 import compiler package
      action-runtime.ts             # 改为 import compileActions from flux-compiler
      validation/
      form-runtime*.ts
      request-runtime.ts
      ...
```

约束：

- `flux-compiler` 只依赖 `flux-core` 与 `flux-formula`，不反向依赖 `flux-runtime`。
- `flux-runtime` 依赖 `flux-compiler`，但不能再承载 compiler 实现本体。
- renderer packages、playground、tooling 需要 compile/validate 时，优先直接依赖 `@nop-chaos/flux-compiler`；若只是通过 runtime 默认装配间接获得 compiler，则无需立即改调用形态。

## Ownership Boundary Decisions

### Compiler Owns

- schema root shape analysis
- renderer lookup and field classification
- prop/meta/event/region lowering
- compile diagnostics context and `validateSchema(...)`
- `xui:imports` / host-action static validation
- compile-time symbol table and `$` symbol visibility metadata
- compiled action program assembly
- compiled validation model collection and ordering helper glue
- compiled node id enrichment and compile-only target metadata shaping

### Runtime Owns

- expression evaluation at runtime
- live scope creation and mutation
- action dispatch and handler execution
- request/source/reaction runtime lifecycle
- form/page/surface runtime ownership
- runtime validation execution against live values
- imported namespace loading, registration, and teardown

### `flux-core` Owns

- shared compile/runtime contracts and public types
- diagnostics model types
- pure validation-model data structures and ordering helpers
- pure schema/path/node-id helpers
- any pure normalization helpers that must be used by both compiler and runtime packages

## File Movement Plan

### Move To `packages/flux-compiler`

- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-runtime/src/schema-compiler/fields.ts`
- `packages/flux-runtime/src/schema-compiler/regions.ts`
- `packages/flux-runtime/src/schema-compiler/tables.ts`
- `packages/flux-runtime/src/schema-compiler/validation-collection.ts`
- `packages/flux-runtime/src/schema-compiler/diagnostics.ts`
- `packages/flux-runtime/src/schema-compiler/shape-validation.ts`
- `packages/flux-runtime/src/schema-compiler/host-action-validation.ts`
- `packages/flux-runtime/src/schema-compiler/target-enrichment.ts`
- `packages/flux-runtime/src/schema-compiler/index.ts`
- `packages/flux-runtime/src/action-compiler.ts`
- `packages/flux-runtime/src/compile-symbol-table.ts`
- compiler-owned tests:
  - `packages/flux-runtime/src/__tests__/schema-compiler-registry.test.ts`
  - `packages/flux-runtime/src/schema-compiler-diagnostics.test.ts`
  - `packages/flux-runtime/src/schema-compiler-host-contract.test.ts`
  - `packages/flux-runtime/src/schema-compiler-renderer-contracts.test.ts`
  - `packages/flux-runtime/src/schema-compiler-table.test.ts`
  - `packages/flux-runtime/src/schema-compiler-validate-schema-adapter.test.ts`

### Keep In `packages/flux-runtime`

- `runtime-factory.ts`
- `runtime-eval-helpers.ts`
- `action-runtime.ts`
- `action-runtime-core.ts`
- `action-runtime-handlers.ts`
- `request-runtime.ts`
- `data-source-runtime.ts`
- `source-registry.ts`
- `reaction-runtime.ts`
- `imports.ts`
- `import-stack.ts`
- `form-runtime*.ts`
- `page-runtime.ts`
- `surface-runtime.ts`
- `validation-runtime.ts`
- sync/async validator registry and execution helpers under `src/validation/`

### Move Or Duplicate As Pure Helpers In `packages/flux-core`

这部分要在 execution 中逐项判断，避免把 runtime-specific 代码硬搬到 core：

- `normalizeValidationTriggers(...)`
- `normalizeValidationVisibilityTriggers(...)`

判断原则：

- 如果 helper 只是对 schema authoring 值做纯归一化，且 compiler/runtime 都要调用，则应移动到 `flux-core`。
- 如果 helper 依赖 runtime owner semantics、validator registry、或 live field behavior，则必须留在 `flux-runtime`。

当前 live code 看，`normalizeValidationTriggers(...)` 与 `normalizeValidationVisibilityTriggers(...)` 是纯函数，更适合作为 `flux-core` 共享 helper，而不是继续从 runtime 反向被 compiler 借用。

## Public API Target State

### New `@nop-chaos/flux-compiler` exports

- `createSchemaCompiler`
- `validateSchema`
- `compileAction`
- `compileActions`
- `createCompileSymbolTable`
- `createBaseCompileSymbolTable`
- compiler-specific helper types when they are already public by contract

### `@nop-chaos/flux-runtime` exports after migration

- 默认不再导出 compiler implementation，本体 owner 改到 `@nop-chaos/flux-compiler`。
- 为减少第一阶段破坏，可保留一轮 compatibility re-export：
  - `export { createSchemaCompiler, validateSchema } from '@nop-chaos/flux-compiler'`
  - `export { compileAction, compileActions } from '@nop-chaos/flux-compiler'`
- 这类 re-export 仅作为迁移兼容层，不应继续让 runtime 成为 compiler 的物理 owner。

### `RendererRuntime` assembly target state

- `packages/flux-runtime/src/runtime-factory.ts` 改为从 `@nop-chaos/flux-compiler` import `createSchemaCompiler`。
- `RendererRuntime` 继续允许宿主注入 `schemaCompiler`。
- 默认 runtime 装配仍可提供“开箱即用 compile”，但实际实现 owner 已是独立 compiler package。

## Required Package And Config Changes

- 新增 `packages/flux-compiler/package.json`
- 新增 `packages/flux-compiler/tsconfig.json`
- 新增 `packages/flux-compiler/tsconfig.build.json`
- 更新 workspace package references 与可能的 `vite.workspace-alias.ts`
- 若 playground 或测试直接引用 workspace alias，需要补 `@nop-chaos/flux-compiler` alias
- 更新根级验证命令覆盖，让 `pnpm -r build/typecheck/test/lint` 自动包含新包

## Execution Plan

### Phase 1 - Freeze Live Baseline And Compiler Boundary Contract

Status: planned
Targets: `docs/architecture/schema-file-validator.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/plans/41-compiler-integrated-schema-diagnostics-implementation-plan.md`, `packages/flux-runtime/src/index.ts`, compiler-related tests

- [ ] Re-audit current compiler-owned files and tests against the live repo so the migration starts from current reality rather than older plan text.
- [ ] Freeze the package-boundary target in docs: compiler owns compile/validate/lowering; runtime owns live execution.
- [ ] Decide whether `flux-runtime` keeps temporary compiler re-exports, and write that migration policy explicitly into the plan/docs before moving code.
- [ ] Add or refresh focused tests if any current compiler behavior is untested but will become migration-sensitive.

Exit Criteria:

- [ ] The repo has one explicit written baseline for compiler ownership and public entry points.
- [ ] Migration-sensitive compiler behavior has focused tests or documented evidence.

### Phase 2 - Create `@nop-chaos/flux-compiler` Package Skeleton

Status: planned
Targets: `packages/flux-compiler/`, workspace configs, alias/config files, root package references

- [ ] Create `packages/flux-compiler/package.json` with `build`, `typecheck`, `test`, and `lint` scripts following workspace conventions.
- [ ] Create `tsconfig.json` and `tsconfig.build.json` for the new package.
- [ ] Add the package to workspace references and any workspace alias files needed for playground/test resolution.
- [ ] Add a minimal `src/index.ts` export surface without moving implementation yet.

Exit Criteria:

- [ ] `pnpm --filter @nop-chaos/flux-compiler typecheck` runs.
- [ ] The package exists as a first-class workspace member with no ad-hoc config drift.

### Phase 3 - Move Schema Compiler Subsystem Into `flux-compiler`

Status: planned
Targets: `packages/flux-compiler/src/schema-compiler.ts`, `packages/flux-compiler/src/schema-compiler/*`, related tests

- [ ] Move `schema-compiler.ts` and all files under `packages/flux-runtime/src/schema-compiler/` into `packages/flux-compiler/src/`.
- [ ] Move compiler-owned tests into `packages/flux-compiler/src/` and update imports.
- [ ] Update package-local relative imports so the compiler package no longer reads from `flux-runtime` internals.
- [ ] Keep code movement minimal; do not combine large behavior changes with the physical move.

Exit Criteria:

- [ ] `createSchemaCompiler(...)` and `validateSchema(...)` are implemented only in `flux-compiler`.
- [ ] Compiler-focused tests run from `@nop-chaos/flux-compiler` instead of `@nop-chaos/flux-runtime`.

### Phase 4 - Move Action Precompile And Symbol Table Ownership

Status: planned
Targets: `packages/flux-compiler/src/action-compiler.ts`, `packages/flux-compiler/src/compile-symbol-table.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/runtime-factory.ts`

- [ ] Move `action-compiler.ts` into `flux-compiler` and update runtime dispatch code to import it from the new package.
- [ ] Move `compile-symbol-table.ts` into `flux-compiler` and update schema compiler imports.
- [ ] Confirm no live runtime-only module still imports compiler internals via old relative paths.
- [ ] If action precompile tests are missing, add focused coverage in the new package before deleting old copies.

Exit Criteria:

- [ ] `compileAction(...)`, `compileActions(...)`, `createCompileSymbolTable(...)`, and `createBaseCompileSymbolTable(...)` are owned by `flux-compiler`.
- [ ] Runtime action dispatch still compiles ad-hoc actions without behavior regression.

### Phase 5 - Cut Compiler-To-Runtime Pure Helper Dependencies

Status: planned
Targets: `packages/flux-core/src/`, `packages/flux-runtime/src/validation/rules.ts`, `packages/flux-compiler/src/schema-compiler.ts`, `packages/flux-compiler/src/schema-compiler/validation-collection.ts`

- [ ] Identify every compiler import that still points into `flux-runtime` after the move.
- [ ] Move pure shared helpers into `flux-core` when they are compile/runtime shared contracts rather than runtime semantics.
- [ ] Initially target `normalizeValidationTriggers(...)` and `normalizeValidationVisibilityTriggers(...)` as shared pure helpers.
- [ ] Keep validator registry, runtime validation execution, and owner orchestration inside `flux-runtime`.

Exit Criteria:

- [ ] `flux-compiler` no longer imports any source file from `flux-runtime`.
- [ ] Any helper moved to `flux-core` is demonstrably pure and shared by contract.

### Phase 6 - Rewire Public Exports And Downstream Consumers

Status: planned
Targets: `packages/flux-compiler/src/index.ts`, `packages/flux-runtime/src/index.ts`, `packages/flux-renderers-*/src/*.test.ts*`, `packages/flux-react/src/*`, docs and examples

- [ ] Export compiler public APIs from `@nop-chaos/flux-compiler`.
- [ ] Update runtime assembly to consume compiler from the new package.
- [ ] Update tests and packages that currently import compiler APIs from `@nop-chaos/flux-runtime` to either use `@nop-chaos/flux-compiler` directly or intentionally rely on temporary runtime re-exports.
- [ ] Document the migration policy for downstream callers so future code does not continue adding new compiler imports to `flux-runtime`.

Exit Criteria:

- [ ] New code has a single obvious import path for compiler APIs.
- [ ] Downstream packages compile without depending on `flux-runtime` as compiler owner.

### Phase 7 - Docs, Verification, And Boundary Audit

Status: planned
Targets: `docs/architecture/schema-file-validator.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/index.md`, `docs/logs/2026/04-21.md`, affected package docs/tests

- [ ] Update architecture docs so code anchors and owner language point to `packages/flux-compiler` instead of `packages/flux-runtime` for compiler topics.
- [ ] Update any remaining plan or reference docs that still say compiler code lives inside runtime.
- [ ] Run required verification: `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`.
- [ ] Do a closure audit specifically checking that compiler code is physically separated, not just re-exported under new names.

Exit Criteria:

- [ ] Docs and code agree on compiler ownership.
- [ ] Full workspace verification passes.
- [ ] Closure audit confirms `flux-compiler` is a real owner package, not a thin alias over runtime implementation.

## Validation Checklist

- [ ] `@nop-chaos/flux-compiler` exists as a first-class workspace package.
- [ ] Schema compile/validate implementation no longer resides in `packages/flux-runtime/src/`.
- [ ] Action precompile and compile symbol table no longer reside in `packages/flux-runtime/src/`.
- [ ] `flux-compiler` depends only on `flux-core` and `flux-formula`, not on `flux-runtime`.
- [ ] Runtime still supports default schema compilation through its facade without semantic regression.
- [ ] Shared pure helpers moved to `flux-core` are minimal and contract-driven.
- [ ] Relevant architecture docs and the daily dev log are updated.
- [ ] Focused compiler and runtime regression tests pass.
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Risks And Rollback

- `schema-compiler.ts` 当前与 runtime validation helpers 有少量纯函数级耦合；如果切分时把 runtime semantics 误搬进 core，会污染 `flux-core` 的职责边界。
- `flux-runtime` 若长期保留 compiler re-export，团队可能继续误把 runtime 当作 compiler owner；因此兼容层必须明确标为迁移过渡，而不是长期基线。
- 部分 renderer/tests 当前直接从 `@nop-chaos/flux-runtime` import compiler APIs；若迁移节奏过快，可能造成多包 import churn。第一阶段应优先保证 compatibility re-export，再逐步切 direct imports。
- 如果执行中发现 compile-time validation normalization 与 runtime validation normalization 的 shared helper 实际上并不纯，应停止下沉到 `flux-core`，改为在 `flux-compiler` 内复制最小必要逻辑并单独命名，避免错误抽象。

## Closure

Status Note: Pending execution.

Closure Audit Evidence:

- Reviewer / Agent: not yet run
- Evidence: not yet run

Follow-up:

- No remaining plan-owned follow-up is defined yet. Any post-extraction work such as execution package IR, admission, or compiler CLI should be captured in successor plans rather than silently expanding this one.
