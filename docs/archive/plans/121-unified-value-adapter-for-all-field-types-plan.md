# 121 Unified Value Adapter For All Field Types Plan

> Plan Status: completed
> Last Reviewed: 2026-04-21 (fresh closure audit after follow-up cleanup)
> Review Consensus: 3 review rounds completed. Round 1: 6 issues (all fixed). Round 2: 4 issues (all fixed). Round 3: 3 minor notes (all addressed). No remaining critical/major issues.
> Source: `docs/architecture/value-adaptation-and-detail-field.md`, `docs/experiments/flux-pragmatic-adoptable-runtime-upgrades.md` §3.4, `docs/experiments/variant-object-field-and-flow-designer-on-next-gen-kernel.md` §2-4, `docs/experiments/algebraic-kernel-design.md` §8
> Related: `docs/plans/70-composite-value-fields-and-validation-integration-plan.md` (completed predecessor)

## Purpose

收敛当前散落在 `input-text`、`checkbox`、`switch`、`textarea`、`select`、`radio-group`、`object-field`、`array-field`、`variant-field`、`detail-field`、`detail-view` 中的值适配逻辑，建立统一的 `ValueAdapter` 协议，使所有字段类型——从最简单的 input-text 到最复杂的 detail-field——共享同一套值进出语义，复杂度按需递增。

## Problem

当前值适配逻辑分散在三个互不关联的位置，且没有统一抽象：

1. **JSX 层散落**：`input-text`、`textarea`、`select`、`radio-group` 在 JSX 里做 `null → ''`、`String(value)`；`checkbox` 用 `coerceBooleanString` 作为 `toFormValue` 回调；`checkbox-group` 做 `Array.isArray(rawValue) ? rawValue : []`。这些逻辑不可复用、不可测试、不可声明。
2. **`toFormValue` 回调**：`useFormFieldController` 的读路径通过 `useBoundFieldValue` 返回原始值，不做入站转换；写路径通过 `toFormValue` 回调做单向转换。没有双向适配、没有 validate 阶段。
3. **detail staged-owner helper functions**：是三个无状态纯函数（`runTransformIn` / `runTransformOut` / `runValidate`），不持有 draft lifecycle 状态。`detail-field` / `detail-view` 的 staged lifecycle 由 renderer 自行管理，helper 只负责 action 执行和 payload/result 规则。但 `object-field` / `array-field` / `variant-field` 完全没用它——不是不需要值适配，而是当前 helper 的 API 以 action schema 为入参，对不需要 action 的简单字段不够轻量。

后果：

- 每新增一种字段类型（date-picker、time-input、rich-text 等），都需要在 renderer 里重新发明值转换。
- `object-field` 的 schema 已声明 `transformInAction`/`transformOutAction`，但 renderer 不调用它。
- 没有统一的地方可以声明"这个字段的 UI 值和存储值不一样"。

## Current Baseline

### Already Live

- `packages/flux-renderers-form-advanced/src/detail-view/value-adaptation-helper.ts` 提供了三个无状态纯函数 `runTransformIn` / `runTransformOut` / `runValidate`，接受 `ActionSchema` 和本地 runner 函数签名，返回 Promise。staged lifecycle（draft 创建、confirm/cancel）由 `detail-field.tsx` 和 `detail-view.tsx` 各自管理，不在 helper 内。
- `useFormFieldController` (`packages/flux-renderers-form/src/field-utils.tsx`) 通过 `useBoundFieldValue` 提供读路径，通过 `useFieldHandlers` 提供 `toFormValue` 写路径回调。
- `docs/architecture/value-adaptation-and-detail-field.md` 定义了两种 owner 模式（surface-backed staged vs inline live-edit）和共享 payload/result 规则。
- Plan 70 已完成 `object-field`、`array-field`、`variant-field`、`detail-field`、`detail-view` 的 renderer 实现。

### Remaining Gaps

1. 没有统一的 `ValueAdapter` 接口让编译器或 renderer 知道某个字段的 UI 值和存储值是什么关系。
2. `input-text`/`checkbox`/`switch`/`textarea`/`select`/`radio-group`/`checkbox-group` 的值转换散落在 JSX 和 `toFormValue` 回调中，没有声明式抽象。
3. `object-field`/`array-field` 的 schema 已声明 `transformInAction`/`transformOutAction`，但 renderer 不执行它们。
4. `variant-field` 的 variant option 各自持有 `transformInAction`（per-variant，不是 field-level），当前只在 switch 时内联调用，不复用共享 payload 规则。

## Goals

- 建立轻量的 `ValueAdapter` 接口，覆盖双向值转换（`in` + `out`，均支持 async）和可选 validate 阶段，与 draft lifecycle 解耦。
- 让 `input-text`、`checkbox`、`switch`、`textarea`、`select`、`radio-group`、`checkbox-group` 等简单字段也能通过声明式 adapter 表达值转换，替代 JSX 层散落的命令式逻辑。
- 让 `object-field`、`variant-field` 能复用 `ValueAdapter` 调用其已声明但未执行的 `transformInAction`/`transformOutAction`（`array-field` 不在本次 adapter 迁移范围——其 scalar item wrapping 是 scope projection 关注点，不是值适配）。
- `detail-field`/`detail-view` 继续使用完整 staged lifecycle，detail helper functions 内部委托给 `actionAdapter`。
- 所有 adapter 共享同一套 default payload / result shape 规则，与 `docs/architecture/value-adaptation-and-detail-field.md` 一致。

## Non-Goals

- 不引入全局 owner graph 或统一 `commit()` 事务。
- 不改变 `FormRuntime.setValue` 的行为——它仍然是纯结构写入。
- 不要求所有字段都走 action-based adapter；同步纯函数 adapter 是最常见形态。
- 不在本计划内实现 `date-picker`、`time-input`、`rich-text` 等新字段的 adapter——它们落地时按本计划定义的协议声明即可。
- 不把 detail helper functions 内联进 renderer——它们在 staged 场景下仍然是有价值的局部边界；Phase 4 仅重构其内部实现以委托给 `actionAdapter`。
- 不迁移 `array-field` 的 scalar item scope projection 到 adapter——这是 scope projection 关注点（`{ value, index, readOnly }` 命名空间），不是值形态转换。`array-field` 的 `transformInAction`/`transformOutAction` 支持可作为 follow-up。
- 不涉及 `RendererRuntime` 内部服务分层（plan 118）或 async epoch / scope write source metadata（plan 120）——这些是独立的架构改进方向。

## Scope

### In Scope

- `packages/flux-core/src/value-adapter.ts` (new) — `ValueAdapter` 接口定义（side-effect-free，无 React 依赖）
- `packages/flux-renderers-form/src/field-utils.tsx` — `useFormFieldController` 集成 adapter
- `packages/flux-renderers-form/src/renderers/input.tsx` — input-text/textarea/checkbox/switch/select/radio-group/checkbox-group 迁移
- `packages/flux-renderers-form-advanced/src/detail-view/value-adaptation-helper.ts` — 内部委托给 actionAdapter
- `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx` — 接入 adapter 支持 transformInAction/transformOutAction
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` — variant switch migration 复用 actionAdapter
- `docs/architecture/value-adaptation-and-detail-field.md` — 更新文档

### Out Of Scope

- `FormRuntime` 内部改造
- 新字段类型的实现
- `array-field` scalar item scope projection 的 adapter 化
- `RendererRuntime` 内部服务分层（plan 118 范畴）
- async epoch / scope write source metadata（plan 120 范畴）

## Execution Plan

### Phase 0 - Characterization Tests

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/detail-view/value-adaptation-helper.test.ts` (new), `packages/flux-renderers-form/src/renderers/input.test.tsx` (补充)

- [x] 为 detail helper functions 编写 characterization tests，覆盖：无 action 时的 fallback 行为（返回 rawValue/workingValue）、有 action 时的 payload 构造（`injectDefaultArgs`）、action 失败时的 fallback、`publishValidateResultErrors` 的 error 映射
- [x] 为 `input-text` 的 `null → ''` 和 `checkbox` 的 `coerceBooleanString` 编写 snapshot behavior tests（记录当前行为，用于 Phase 2 回归验证）

Exit Criteria:

- [x] detail helper characterization tests 全部通过
- [x] 简单字段值转换 snapshot tests 全部通过

### Phase 1 - 定义 ValueAdapter 核心接口

Status: completed
Targets: `packages/flux-core/src/value-adapter.ts` (new), `docs/architecture/value-adaptation-and-detail-field.md`

- [x] 定义 `ValueAdapter<TExternal, TInternal>` 接口

```ts
interface ValueAdapter<TExternal = unknown, TInternal = unknown> {
  in(value: TExternal, ctx: AdapterContext): TInternal | Promise<TInternal>;
  out(value: TInternal, ctx: AdapterContext): TExternal | Promise<TExternal>;
  validate?(
    value: TInternal,
    ctx: AdapterContext,
  ): AdapterValidationResult | Promise<AdapterValidationResult>;
}
```

`in`/`out` 从第一天起就支持 async 返回值——`actionAdapter` 需要。

- [x] 定义 `AdapterContext`

```ts
interface AdapterContext {
  name: string;
  readOnly: boolean;
}

interface AdapterActionContext extends AdapterContext {
  scope: ScopeRef;
  form: FormRuntime | null;
  dispatch: ActionDispatcher;
}
```

同步 adapter（`stringAdapter`、`booleanStringAdapter`）只需要 `AdapterContext`。`actionAdapter` 接收 `AdapterActionContext`，但 `dispatch` 已在工厂构造时捕获，context 中的 `dispatch` 仅作为 late-binding 备选路径（如需要重新绑定的场景）。接口分层避免同步 adapter 被迫接受它不需要的 scope/form/dispatch。

- [x] 定义 `AdapterValidationResult` 和 `AdapterValidationIssue`

```ts
type AdapterValidationResult = { valid: true } | { valid: false; issues: AdapterValidationIssue[] };

interface AdapterValidationIssue {
  level: 'error' | 'warning';
  message: string;
  path?: string;
}
```

- [x] 提供内置 adapter 工厂函数：
  - `identityAdapter()` — in/out 均为 identity
  - `stringAdapter()` — `in: v == null ? '' : String(v)`, `out: identity`
  - `booleanStringAdapter()` — `in: Boolean(v)`, `out: Boolean(v)`（当前 `coerceBooleanString` (`input.tsx:42`) 返回 boolean，不是 string；adapter 必须保持向后兼容）
  - `nullableAdapter(inner)` — 包装 inner adapter，额外处理 null/undefined
  - `actionAdapter(transformInAction, transformOutAction?, validateAction?, dispatch)` — 基于 action schema 执行，dispatch 在构造时捕获
- [x] 定义 `actionAdapter` 的 default payload 规则与 `value-adaptation-and-detail-field.md` 对齐：无显式 `args` 时注入 `{ value, name, readOnly }`，有显式 `args` 时 replace 不 merge
- [x] 定义 adapter 失败时的 fallback 语义：`in` 失败返回原始值；`out` 失败返回原始工作值；`validate` 失败返回 `{ valid: false, issues: [...] }`。与当前 detail helper 的 fallback 行为一致
- [x] 更新 `docs/architecture/value-adaptation-and-detail-field.md` 的 "Shared Wrapper" 章节，将 `ValueAdapter` 接口定位为所有值适配的统一协议

Exit Criteria:

- [x] `ValueAdapter` 接口已从 `@nop-chaos/flux-core` 导出且类型正确
- [x] 内置 adapter 工厂函数有 focused tests
- [x] `actionAdapter` 的 payload 规则测试与 `value-adaptation-and-detail-field.md` 一致
- [x] adapter fallback 行为有 focused tests
- [x] 文档已更新

### Phase 2 - 简单字段迁移

Status: completed
Targets: `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-renderers-form/src/renderers/input.tsx`

- [x] 扩展 `useFormFieldController` 接受 `adapter?: ValueAdapter` 参数
- [x] 当 `adapter` 存在时，读路径使用 `adapter.in(rawValue, ctx)` 替代 JSX 层散落逻辑；写路径使用 `adapter.out(uiValue, ctx)` 替代 `toFormValue`
- [x] 当 `adapter` 不存在时，保持当前 `toFormValue` 回退行为（向后兼容）
- [x] `input-text` 迁移：声明 `stringAdapter`（`in: v == null ? '' : String(v)`, `out: identity`）
- [x] `textarea` 迁移：同 `input-text`，声明 `stringAdapter`
- [x] `select` 迁移：声明 `stringAdapter`
- [x] `radio-group` 迁移：声明 `stringAdapter`
- [x] `checkbox` 迁移：声明 `booleanStringAdapter`（`in: Boolean(v)`, `out: Boolean(v)`）。注意：当前 `onCheckedChange` 发送 `String(Boolean(checked))`（字符串 "true"/"false"），经 `coerceBooleanString`（`v === 'true'`）转为 boolean。迁移时需同步修改 `onCheckedChange` 直接发送 boolean，否则 `Boolean("false")` = `true` 会破坏行为。Phase 0 snapshot tests 兜底回归检测。
- [x] `switch` 迁移：同 checkbox（共享同一 `booleanStringAdapter`）
- [x] `checkbox-group` 迁移：声明自定义 adapter（`in: Array.isArray(v) ? v : []`, `out: identity`）
- [x] 保留 `toFormValue` 作为 fallback，不破坏已有自定义字段

Exit Criteria:

- [x] `input-text` 不再在 JSX 中做 `null → ''` 转换，改用 `adapter.in()`
- [x] `checkbox` 不再使用 `coerceBooleanString` 作为 `toFormValue`，改用 adapter
- [x] Phase 0 的简单字段 snapshot tests 全部通过（行为不变）
- [x] 无 `adapter` 的字段行为不变（向后兼容验证）

### Phase 3 - 复合字段接入

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`

**架构约束**（来自 `docs/architecture/value-adaptation-and-detail-field.md` §Two Ownership Modes）：`object-field` 和 `variant-field` 属于 inline live-edit owner。adapter 只处理值形态转换，**不引入 staged owner-submit lifecycle**。这是刻意边界，不是遗漏。

- [x] `object-field`：当 schema 声明了 `transformInAction` 时，在 `createObjectFieldChildScope` 初始化阶段用 `actionAdapter.in(rawValue, ctx)` 得到编辑工作值（替代直接透传 rawValue）。当 schema 声明了 `transformOutAction` 时，在 projected form proxy 的 setValue 路径上拦截父表单写回，先经过 `actionAdapter.out(workingValue, ctx)` 转换。没有声明 transform 的 object-field 行为不变（直接 live-edit 透传）
- [x] `variant-field`：variant switch 时 per-option 的 `transformInAction` 调用迁移为 `actionAdapter.in()`，复用共享 default payload 规则（替代当前内联的 `injectVariantTransformInArgs` + `props.helpers.dispatch`）。当前 variant-field 使用 `{ value, variant, readOnly }` payload（`variant-field.tsx:142-146`），其中 `variant` 携带目标 option key。迁移决策：将 `variant` 映射到 `AdapterContext.name`（variant option key 在语义上就是当前正在选择的字段名），保持 `AdapterActionContext` 不增加额外字段。adapter 内部通过 `ctx.name` 获取 variant key
- [x] `array-field`：**不在本 phase 迁移**。其 scalar item `{ value }` 包装是 scope projection 机制（由 `array-field-runtime.ts` 的 `projectValues` 管理），不是值适配。`transformInAction`/`transformOutAction` 支持作为 follow-up

**迁移风险**：现有 schema 如果已声明 `transformInAction`/`transformOutAction` 但预期它们不执行（因为当前 renderer 忽略它们），启用后行为会变化。缓解措施：

- grep playground schemas 中所有 `transformInAction`/`transformOutAction` 声明，确认不存在因 renderer 忽略而依赖 no-op 语义的 schema
- 如果发现此类 schema，考虑在 Phase 3 增加 opt-in 机制（如 schema 级 `enableTransform: true` 标记）而非默认启用

Exit Criteria:

- [x] `object-field` 当声明 `transformInAction` 时，子 scope 收到的是转换后的值而非原始值（有 focused test）
- [x] `object-field` 当声明 `transformOutAction` 时，写回父表单的值经过转换（有 focused test）
- [x] `object-field` 未声明 transform 时行为不变（回归测试通过）
- [x] `variant-field` switch migration 使用 `actionAdapter` 和共享 payload 规则
- [x] variant-field 的 per-option `variant` 上下文在 adapter 迁移后正确传递（有 focused test）
- [x] playground schemas 中不存在因 renderer 忽略 transform 而依赖 no-op 语义的 object-field/variant-field schema（已 grep 验证）
- [x] 现有复合字段测试全部通过

### Phase 4 - detail-field / detail-view 内部统一

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/detail-view/value-adaptation-helper.ts`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`

- [x] 重构 detail helper functions 内部实现：`runTransformIn` 委托给 `actionAdapter.in()`，`runTransformOut` 委托给 `actionAdapter.out()`，`runValidate` 委托给 `actionAdapter.validate()`；后续继续保留函数级边界而不是对象包装，detail-field/detail-view 调用方只做最小改动
- [x] staged lifecycle 调度（`runTransformIn → createDraft → validate → runTransformOut → commit`）继续由 `detail-field.tsx` 和 `detail-view.tsx` 管理，不在 helper 内
- [x] 保留当前 fallback 语义：`runTransformIn` 失败返回 `input.rawValue`；`runTransformOut` 失败返回 `input.workingValue`。与 `actionAdapter` 的 fallback 行为一致
- [x] Phase 0 的 detail helper characterization tests 全部通过

Exit Criteria:

- [x] detail helper functions 内部基于 `actionAdapter` 实现
- [x] detail-field/detail-view 继续通过局部 helper 边界调用，不直接内联 `actionAdapter`
- [x] Phase 0 的 characterization tests 全部通过（行为与重构前一致）

## Validation Checklist

- [x] `ValueAdapter` 接口已从 `@nop-chaos/flux-core` 导出，内置工厂函数有 focused tests
- [x] `AdapterContext` / `AdapterActionContext` 分层正确，同步 adapter 不被迫接受 scope/form/dispatch
- [x] `actionAdapter` 的 dispatch 机制在构造时捕获，不依赖运行时注入
- [x] adapter fallback 行为与当前 detail helper 一致
- [x] 简单字段（input-text、textarea、select、checkbox、switch、radio-group、checkbox-group）已迁移到声明式 adapter，JSX 层不再有值转换逻辑
- [x] 复合字段（object-field、variant-field）能通过 adapter 调用 transformInAction/transformOutAction
- [x] `array-field` 的 scope projection 机制未被误改为 adapter
- [x] detail-field / detail-view 行为不变，detail helper 边界保持稳定
- [x] `docs/architecture/value-adaptation-and-detail-field.md` 已更新反映 ValueAdapter 接口
- [x] Phase 0 characterization tests 全部通过
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: 统一 `ValueAdapter` 协议、简单字段迁移、`object-field` / `variant-field` 接入、以及 `detail-field` / `detail-view` 内部统一都已 landed。2026-04-21 对后续 helper cleanup 的 fresh audit 未发现 reopened gap，workspace verification 也保持全绿；无剩余 plan-owned work。

Closure Audit Evidence:

- Reviewer / Agent: independent `general` subagent closure audit (`task_id: ses_254973942ffeFkqWx9maZuGkkr`)
- Evidence: fresh-session audit rechecked live code, docs, and tests after final fixes; confirmed `packages/flux-core/src/value-adapter.ts`, `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/value-adaptation-helper.ts`, focused tests, architecture doc, and daily log all satisfy the plan scope. A fresh 2026-04-21 audit after detail-helper cleanup again found no reopened plan-owned gap. Final verification passed: `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`.

Follow-up:

- 新字段类型（date-picker、time-input、rich-text）落地时按 ValueAdapter 协议声明
- `array-field` 的 `transformInAction`/`transformOutAction` 支持可按同一 adapter 协议接入，作为 follow-up
- 如果后续需要 `ValueAdapter` 支持 streaming / incremental 模式（如大文件编辑），需扩展接口
