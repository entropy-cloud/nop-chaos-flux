# 174 Schema Strict Validation Mode

> Plan Status: partially completed
> Last Reviewed: 2026-05-03
> Source: User request for JSON schema property auto-validation during compilation
> Related: `docs/plans/151-json-schema-property-coverage-100-percent-plan.md`, `docs/analysis/2026-05-02-cascade-vs-flux-deep-comparison.md` (Reference 1)

## Purpose

实现一个可运行时切换的 strict validation mode，在 JSON schema 编译期自动检查所有属性是否在 renderer 定义的已知范围内。当开启时，未知属性产生编译期诊断；当关闭时，未知属性静默作为 props 的一部分传入运行时。该开关必须能在打包后开启（非仅开发阶段），并控制 nop-debugger 的行为。单元测试中的 JSON render 部分默认开启验证。

## Problem

当前 Flux 编译器对未知属性的处理存在两个缺陷：

1. **renderer 定义遗漏字段不报错**：如果 renderer 的 `fields`/`propContracts`/`propSchema` 遗漏了某个属性，`classifyField` 会将其默认分类为 `'prop'`，编译不报错，运行时静默丢失或行为异常。这导致属性重命名后难以发现遗漏。

2. **schema 属性拼写错误不报错**：作者写错了属性名（如 `lable` 而非 `label`），编译器将其视为未知 prop 并编译进 `propsProgram`，运行时不会产生任何警告。

现有机制 `hasClosedPropModel` + `unknownBarePropertyPolicy` 只对声明了 `propSchema` 或 `propContracts` 的 renderer 生效（当前只有 `button`、`form`、`crud` 三个 renderer 声明了），其余 renderer 的未知属性完全不受检查。

## Current Baseline

- **字段分类**：`classifyField()` (`packages/flux-compiler/src/schema-compiler/fields.ts`) 按 7 级优先级分类，最终 fallback 为 `'prop'`。所有未知属性静默成为 props。
- **已有验证**：`inspectSchemaNodeFields()` (`packages/flux-compiler/src/schema-compiler/shape-validation.ts`) 在 renderer 声明了 `propSchema` 或 `propContracts` 时，会根据 `unknownBarePropertyPolicy` 发出 `'unknown-property'` 诊断。默认 compile mode 为 `'warn'`，validate mode 为 `'error'`。
- **已接受键集**：`getAcceptedSchemaKeys()` (`packages/flux-compiler/src/schema-compiler/shape-validation-utils.ts`) 从 `META_FIELDS`、`defaultSchema`、`propSchema`、`propContracts`、`regions`、`fields` 收集已知键。
- **当前覆盖**：只有 3 个 renderer（`button`、`form`、`crud`）声明了 `propContracts`，其余 ~13 个 renderer 的未知属性完全不受检查。
- **Plan 151** 已确保所有声明属性有测试覆盖，但不覆盖拼写错误或遗漏声明的情况。
- **`SchemaRenderer`** 编译时通过 `runtime.schemaCompiler.compile(schema, options)` 调用，`options` 可传 `diagnostics` 和 `validation`。
- **nop-debugger** 通过 `onRuntimeChange`/`onComponentRegistryChange`/`onActionScopeChange` 回调获取 runtime 信息，未受编译期验证控制。

## Goals

1. 引入一个 runtime 可切换的 **strict validation mode** 开关，控制编译期对未知 schema 属性的检查行为。
2. strict mode 开启时，对所有 renderer（不仅仅是声明了 `propContracts` 的）检查未知属性，产生编译期诊断。
3. strict mode 关闭时，未知属性静默作为 props 传入运行时（当前行为不变）。
4. strict mode 可在打包后动态开启（通过 `localStorage` flag 或 URL query param），不依赖构建变量。
5. nop-debugger 的显示/行为受 strict mode 控制。
6. 单元测试中涉及 JSON schema render 的测试默认在 strict mode 下执行。
7. 当 renderer 的 `fields` 定义遗漏了某个属性时，strict mode 报 warning 而非 error（区分"定义遗漏"和"拼写错误"的启发式策略）。

## Non-Goals

- 不改变 `classifyField()` 的 fallback 行为（strict mode off 时行为完全不变）。
- 不为所有 renderer 一次性补全 `propContracts`（渐进式，Phase 1 先让机制跑起来）。
- 不引入 Cascade 式的完全类型化 capability 系统（超出本计划范围）。
- 不修改 `RenderRegionHandle` 或 fragment rendering 的行为。
- 不引入 IR 分发格式或 CompilationUnit 概念。

## Scope

### In Scope

- `packages/flux-core/` — strict mode 开关类型、常量、读取 API
- `packages/flux-compiler/` — 编译期 unknown-property 检查增强
- `packages/flux-react/` — `SchemaRenderer` 传递 strict mode 到编译选项
- `packages/nop-debugger/` — 受 strict mode 控制
- `packages/flux-runtime/` — runtime 暴露 strict mode 状态
- 测试基础设施 — 单元测试中默认开启 strict mode

### Out Of Scope

- 为所有 renderer 补全 `propContracts`（属于后续渐进工作）
- 可视化编辑器集成（编辑器利用 strict mode 限制可选范围是 Plan 169 的范畴）
- Capability SemVer（属于 Plan 144 的范畴）

---

## Design Decisions

### DD-1: Strict Mode 开关的位置和形态

**选择**：在 `flux-core` 中定义一个 `FluxStrictMode` 模块，暴露 `isStrictValidationEnabled(): boolean` 函数。

**读取优先级**：

1. `SchemaRenderer` props 上的 `strictValidation?: boolean`（显式传入，最高优先级）
2. `window.__FLUX_STRICT_VALIDATION__` 全局变量（可在打包后通过 `localStorage` 或 URL param 设置）
3. `import.meta.env.DEV`（开发模式默认开启）
4. fallback 为 `false`

**理由**：

- 允许打包后动态开启：通过 `localStorage.setItem('__FLUX_STRICT_VALIDATION__', 'true')` 或 URL `?strictValidation=true` 即可
- 允许 SchemaRenderer 显式控制，便于测试和嵌入式场景
- 不使用构建时 `define` 替换（不满足"打包后也能开启"的需求）

### DD-2: Strict Mode 下的验证策略

**选择**：在 strict mode 下，对所有 renderer 执行 unknown-property 检查，但区分两种情况：

1. **Renderer 声明了 closed prop model（有 `propSchema` 或 `propContracts`）**：未知属性产生 `'error'` 级诊断
2. **Renderer 未声明 closed prop model**：未知属性产生 `'warning'` 级诊断

**理由**：

- 已声明 closed prop model 的 renderer，其属性列表是明确的，未知属性大概率是拼写错误
- 未声明 closed prop model 的 renderer，属性列表不完整（可能遗漏声明），未知属性可能是"定义遗漏"也可能是"拼写错误"，warning 级别更安全
- 渐进式：随着更多 renderer 补全 `propContracts`，越来越多的 renderer 会获得 error 级别保护

### DD-3: 已接受键集的扩展

**选择**：扩展 `getAcceptedSchemaKeys()` 以接受 `strictMode` 参数，在非 strict mode 下返回所有键（相当于不做检查），在 strict mode 下执行精确检查。

增加以下键到 always-accepted 集合（无论 strict mode）：

- `xui:imports`、`xui:actions`（namespaced 扩展属性）
- `onMount`、`onUnmount`（lifecycle）
- `submitAction`、`initAction`（semantic action slots）
- `name`（字段绑定名）
- `type`（renderer type）

增加以下键到 strict-mode accepted 集合（通过 classifyField 已知的 kind）：

- 所有 `META_FIELDS`
- 所有 `fields` 声明的键
- 所有 `regions` 声明的键
- 所有 `propSchema`/`propContracts` 声明的键
- 所有 `defaultSchema` 声明的键
- 匹配 `/^on[A-Z]/` 模式的键（event 约定）

### DD-4: 单元测试中的 strict mode

**选择**：在测试辅助函数（`createSchemaRenderer`、`renderSchema` 等）中默认设置 `strictValidation: true`。

如果测试需要测试非 strict 行为（如未知属性作为 props 传入），显式设置 `strictValidation: false`。

### DD-5: nop-debugger 受 strict mode 控制

**选择**：`nop-debugger` 的显示由 runtime 暴露的 `strictMode` 状态控制：

- strict mode on：debugger 显示编译期诊断信息（unknown-property warnings/errors）
- strict mode off：debugger 不显示编译期诊断（但仍然显示运行时状态）

---

## Execution Plan

### Phase 1 - Strict Mode Core Infrastructure

Status: completed
Targets: `packages/flux-core/src/strict-mode.ts`, `packages/flux-core/src/index.ts`, `packages/flux-compiler/src/schema-compiler/shape-validation.ts`, `packages/flux-compiler/src/schema-compiler/shape-validation-utils.ts`, `packages/flux-compiler/src/schema-compiler/diagnostics.ts`

- [x] 在 `packages/flux-core/src/strict-mode.ts` 创建 `FluxStrictMode` 模块：
  - `isStrictValidationEnabled(explicitOverride?: boolean): boolean` — 按优先级读取
  - `setStrictValidationGlobal(enabled: boolean): void` — 设置 `window.__FLUX_STRICT_VALIDATION__`
  - `STRICT_VALIDATION_KEY` 常量
  - 不依赖 `window`（SSR safe：`typeof window !== 'undefined'` 检查）
- [x] 从 `flux-core` 导出 strict mode API
- [x] 修改 `SchemaCompileValidationOptions` 增加 `strictMode?: boolean` 字段
- [x] 修改编译器 diagnostics 初始化逻辑：当 `strictMode` 为 true 时，对未声明 closed prop model 的 renderer 将 `unknownBarePropertyPolicy` 提升为 `'warn'`（而非默认的 `'ignore'`），对已声明 closed prop model 的 renderer 保持 `'error'`
- [x] 修改 `inspectSchemaNodeFields()` 或其调用处：当 `strictMode` 为 true 时，对未声明 closed prop model 的 renderer 也执行 unknown-property 检查（当前 `hasClosedPropModel` 为 false 时完全跳过检查）
- [x] 确保非 strict mode 下行为完全不变（零回归风险）

Exit Criteria:

- [x] `strictMode: true` 传入编译选项时，未声明 closed prop model 的 renderer 的未知属性产生 warning 诊断
- [x] `strictMode: false`（默认）时，行为与当前完全一致
- [x] `pnpm --filter @nop-chaos/flux-core typecheck` 通过
- [x] `pnpm --filter @nop-chaos/flux-compiler typecheck` 通过
- [x] 新增 strict mode 模块有单元测试覆盖
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - SchemaRenderer Integration

Status: in progress
Targets: `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/render-nodes.tsx`, `packages/flux-core/src/types/renderer-compiler.ts`

- [x] 在 `SchemaRendererProps` 增加 `strictValidation?: boolean`
- [x] `SchemaRenderer` 编译时读取 `strictValidation` prop，传入 `CompileSchemaOptions.validation.strictMode`
- [x] `RenderNodes` 中 `normalizeNodeInput` 和 fragment 编译路径也传入 strict mode
- [ ] 编译期产生的 diagnostics 通过 `onCompileError` 或新增回调传递给消费方

Exit Criteria:

- [x] `<SchemaRenderer strictValidation />` 开启 strict 验证
- [x] 不传 `strictValidation` 时，自动读取全局开关（`window.__FLUX_STRICT_VALIDATION__` 或 DEV mode）
- [x] `pnpm --filter @nop-chaos/flux-react typecheck` 通过
- [x] 现有 `schema-renderer.test.tsx` 测试全部通过（零回归）

### Phase 3 - Runtime Strict Mode State

Status: completed
Targets: `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/index.ts`

- [x] `RendererRuntime` 暴露 `strictMode: boolean` 只读属性
- [x] Runtime 创建时从 `SchemaRenderer` 传入的 strict mode 值初始化
- [x] `useStrictMode()` hook 供 renderer 和 debugger 读取

Exit Criteria:

- [x] `runtime.strictMode` 正确反映当前 strict 状态
- [x] `pnpm --filter @nop-chaos/flux-runtime typecheck` 通过
- [x] `pnpm --filter @nop-chaos/flux-react typecheck` 通过

### Phase 4 - nop-debugger Integration

Status: in progress
Targets: `packages/nop-debugger/src/`

- [x] debugger 读取 `runtime.strictMode` 状态
- [ ] strict mode on 时，debugger 面板显示编译期诊断（unknown-property warnings/errors）
- [ ] strict mode off 时，debugger 隐藏编译期诊断（保持当前行为）
- [ ] debugger 增加 strict mode 切换按钮（允许运行时动态切换）

Exit Criteria:

- [x] debugger 在 strict mode on 时显示属性验证诊断
- [x] debugger 在 strict mode off 时不显示属性验证诊断
- [x] `pnpm --filter @nop-chaos/nop-debugger typecheck` 通过

### Phase 5 - Test Infrastructure

Status: in progress
Targets: `packages/flux-react/src/test-support-runtime.tsx`, `packages/flux-react/src/test-support-core.tsx`, `packages/flux-compiler/src/schema-compiler-prop-coverage.test.ts`, 各 `*.test.ts(x)` 涉及 JSON render 的测试

- [ ] 测试辅助函数（`createSchemaRenderer` 等）默认传入 `strictValidation: true`
- [ ] 所有涉及 JSON schema render 的现有测试在 strict mode 下通过
- [ ] 如果现有测试因 strict mode 报出真正的 unknown-property 诊断，修复方式有两种：
  - 如果是 renderer 定义遗漏：在 renderer 定义中补全 `fields`/`propContracts`
  - 如果是测试 schema 使用了扩展属性：在测试中显式 `strictValidation: false` 并加注释说明
- [x] 新增测试：验证 strict mode on/off 切换行为
- [x] 新增测试：验证属性拼写错误在 strict mode 下被检测

Exit Criteria:

- [x] 所有涉及 JSON schema render 的测试在 strict mode 下通过
- [x] 属性拼写错误检测有专门测试覆盖
- [x] `pnpm test` 全量通过
- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [x] `pnpm lint` 通过
- [x] `docs/logs/` 对应日期条目已更新

---

## Validation Checklist

> **关闭条件**：只有本 section 所有条目及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] strict mode 开关可在打包后通过 `window.__FLUX_STRICT_VALIDATION__` 或 `localStorage` 动态开启
- [x] strict mode 开启时，所有 renderer 的未知属性产生编译期诊断
- [x] strict mode 关闭时，行为与当前完全一致（零回归）
- [ ] nop-debugger 受 strict mode 控制
- [ ] 单元测试中 JSON render 部分默认在 strict mode 下执行
- [x] 属性拼写错误在 strict mode 下被检测
- [x] renderer 定义遗漏属性在 strict mode 下产生 warning（不是 error）
- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [x] `pnpm lint` 通过
- [x] `pnpm test` 通过
- [ ] 相关 `docs/architecture/` 已更新（`field-metadata-slot-modeling.md` 增加严格验证描述）
- [x] `docs/logs/` 对应日期条目已更新

## Closure

Status Note: Keep this plan `partially completed`. The core strict-validation infrastructure landed across `flux-core`, `flux-compiler`, `flux-react`, and `flux-runtime`, but the live repo still does not satisfy the full plan scope recorded here: `SchemaRenderer` does not expose a compile-diagnostics callback surface, `nop-debugger` currently publishes strict-mode status rather than a real strict-mode toggle plus diagnostics gating path, test helpers do not default JSON render tests to `strictValidation: true`, and the planned owner-doc target (`docs/architecture/field-metadata-slot-modeling.md`) was not updated with strict-validation guidance.

Closure Audit Evidence:

- Reviewer / Agent: no independent closure audit recorded
- Evidence: 2026-05-03 plan-hygiene re-audit re-read the live repo and confirmed the landed strict-mode foundation (`packages/flux-core/src/strict-mode.ts`, compiler strict-mode diagnostics tests, `SchemaRendererProps.strictValidation`, `runtime.strictMode`, and debugger strict-mode status display), but also found remaining in-scope gaps: no `onCompileError`-style diagnostics handoff, no debugger strict-mode toggle or diagnostics gating logic, no test-support defaulting of JSON render tests to `strictValidation: true`, and no strict-validation wording in `docs/architecture/field-metadata-slot-modeling.md`. Under the plan authoring guide, that means the plan cannot remain `completed`.

Follow-up:

- Reconcile the still-open in-scope items before any future `completed` claim: either land the missing `SchemaRenderer` diagnostics handoff, debugger toggle/diagnostics gating, test-support default strict mode behavior, and owner-doc update, or explicitly re-scope those items out of this plan.
- Record a fresh independent closure audit after the remaining in-scope gaps are either landed or formally moved out of scope.
- 渐进式为所有 renderer 补全 `propContracts`，使更多 renderer 获得 error 级别保护（不属于本计划）
- 可视化编辑器利用 strict mode 限制属性选择器范围（属于 Plan 169 范畴）

## Risks And Rollback

- **Risk 1**：strict mode 可能对现有测试产生大量 warning，需要逐个评估和修复。缓解：Phase 5 专门处理，区分"遗漏声明"和"测试需要非 strict"两种情况。
- **Risk 2**：`window.__FLUX_STRICT_VALIDATION__` 全局变量可能与宿主环境冲突。缓解：使用 `__FLUX_` 前缀减少冲突概率；支持 `SchemaRenderer` props 显式传入覆盖。
- **Rollback**：strict mode 默认关闭，所有改动仅在显式开启时生效。如果发现问题，关闭开关即可恢复当前行为。
