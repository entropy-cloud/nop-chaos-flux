# 46 User Management Schema And Authoring Contract Alignment Plan

> Plan Status: completed
> Last Reviewed: 2026-04-10; closure-audited against live repo
> Source: `docs/examples/user-management-schema.md`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/action-algebra-formal-spec.md`, `docs/architecture/action-graph-authoring.md`, `docs/architecture/action-interaction-state.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/api-data-source.md`, `docs/architecture/form-validation.md`
> Related: `docs/plans/47-form-status-visibility-and-reserved-form-binding-plan.md`

## Purpose

本计划用于收口 `docs/examples/user-management-schema.md` 与当前运行时实现之间的偏差，并补齐 action authoring、visual action projection、adaptor surface、dialog/form targeting、async pending state、`disabled` / `readOnly` 这些分散且部分缺失的文档契约。

目标不是立即重写所有 runtime，而是先把“当前实现已经支持什么”“推荐 authoring 应该怎么写”“哪些字段只是兼容残留”写清楚，避免示例继续误导后续 schema 编写。

## Current Baseline

- `then` / `onError` 当前都支持 `ActionSchema | ActionSchema[]`；数组形式表示顺序执行，`parallel` 才表示并发。
- `then` / `onError` 的 array 形态当前不只是兼容残留；它仍是最轻的 ordered-chain shorthand。
- `when = false` 当前会返回 `skipped`，这已经足以表达 optional single-step，不需要先新增 `sequence` 字段。
- 目标 authoring 设计中，form subtree 内应通过 `$form` 读取只读 form status；form 外部应通过显式 `statusPath` 读取同一份 summary DTO。
- adaptor 当前运行时上下文已经明确存在：
  - `requestAdaptor`: `api`, `scope`, `data`, `headers`
  - `responseAdaptor`: `payload` / `response`, `api`, `scope`
- adaptor 当前实现兼容 `return <expression>;` 形式，但本质上仍然是单表达式 surface，不是任意 JavaScript 语句块。
- `closeDialog` 当前已实现“缺省关闭最近活动对话框”；显式 `dialogId` 只是窄扩展路径。
- `component:<method>` + `componentId` / `componentName` 已是当前组件实例能力调用的推荐方向。
- `submitForm` 仍是 built-in action，但外部 targeting 的推荐入口已经转向 `component:submit`；`formId` 在当前契约中仍然存在，但缺少“normative vs compatibility”说明。
- `FormRuntime.submit(...)` 已有 duplicate-submit guard，重复提交会返回 `cancelled`，不是普通业务失败。
- 通用 button async pending/disable 契约目前没有统一 generic tracked-interaction surface；但 form semantic submit 的目标读面已经收口为 `$form` + `statusPath`。
- source-backed `select` / `radio-group` / `checkbox-group` 当前已经会在 options loading 时自动 disabled；这属于 field-local producer state，不是通用 action pending。
- 通用 `button` renderer 当前只有 `disabled`，没有 runtime-owned `loading` / `pending` surface。
- runtime presentation 已经有 `readOnly` 概念，但通用 schema 基线、输入 renderer authoring、以及文档说明还没有真正收口。

## Problems

- `docs/examples/user-management-schema.md` 仍混用了较早期写法与较新的 runtime 方向，读者难以判断哪些是“当前推荐”，哪些只是“暂时还能跑”。
- 当前文档还没有把“exported action DSL”与“未来 visual designer 的 authoring graph projection”明确分层，导致容易为了设计器便利去反向改写 `parallel` / ordered list / `when` 这些基础字段。
- 目前没有一份文档明确标注 `ActionSchema` 中各 targeting 字段的地位：
  - 哪些是 built-in 自身语义字段
  - 哪些是组件句柄 targeting 字段
  - 哪些只是兼容残留
- adaptor 文档虽然写了上下文名，但没有写清：
  - 是否允许 `return` 语法
  - `return` 只支持 expression sugar，不支持语句块
  - request adaptor 返回值是如何 merge 回请求对象的
  - response adaptor 当前拿不到哪些 fetch metadata
- form semantic submit 的推荐 authoring 已在代码与计划中存在，但代表性示例还没有迁移到 `submitAction` + `component:submit` 方向。
- `disabled` 与 `readOnly` 的关系目前只有局部 runtime state 和组件命名基线，没有统一 authoring contract。
- 对“异步 action 进行中时控件是否自动禁用、如何暴露 pending 状态、何时只靠取消/去重即可”的规则还没有完全实现，但目标设计文档已经收口。

## Goals

- 修正 `user-management-schema` 示例，使其体现当前推荐 authoring，而不是历史兼容写法的混合体。
- 把 action authoring 中的 control-flow、component targeting、dialog close 默认语义、adaptor surface 写成可直接查阅的当前基线。
- 明确 visual action designer 应投影到当前 `Action Algebra`，而不是反向要求 exported DSL 改成 `steps` 风格容器。
- 明确 `formId`、`componentPath`、`refreshTable`、`submitForm` 这类旧入口与较新推荐入口之间的关系。
- 明确 form meta-state 的推荐读取面：form 内 `$form`，form 外 `statusPath`，不使用 `$store`。
- 为 `disabled` / `readOnly` 提供统一命名和分层语义说明，并尽量与 `@nop-chaos/ui` / shadcn 风格保持一致。
- 为 async pending / duplicate-click 行为补一份最小但清晰的 author-visible 说明。

## Non-Goals

- 本计划不要求立即删除所有兼容字段。
- 本计划不要求先完成通用 pending-state runtime 再写文档。
- 本计划不要求一次性为所有复杂控件定义完整 `readOnly` 行为。
- 本计划不要求把 dialog 也强行改造成 `component:<method>` 模型；先说明当前 built-in dialog 语义边界即可。
- 本计划不要求为了 visual designer 先把 exported `ActionSchema` 重写成新的通用 graph container language。

## Scope

- `docs/examples/user-management-schema.md`
- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/action-algebra-formal-spec.md`
- `docs/architecture/action-graph-authoring.md`
- `docs/architecture/action-interaction-state.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/api-data-source.md`
- `docs/architecture/form-validation.md`
- `docs/plans/47-form-status-visibility-and-reserved-form-binding-plan.md`
- `docs/references/flux-json-conventions.md`
- `docs/components/index.md`
- relevant runtime anchors under:
  - `packages/flux-core/src/types/actions.ts`
  - `packages/flux-runtime/src/action-runtime.ts`
  - `packages/flux-runtime/src/request-runtime.ts`
  - `packages/flux-runtime/src/form-runtime.ts`
  - `packages/flux-renderers-form/src/field-utils.tsx`
  - `packages/flux-renderers-form/src/renderers/input.tsx`

## Recommended Interactivity Baseline

- 建议把 `disabled` 和 `readOnly` 明确分开，不要收敛成一个统一字段。
- author-visible 标准名称应使用 `readOnly`，与 React DOM / `@nop-chaos/ui` / shadcn 风格保持一致，不使用 `readonly`。
- 语义区分应固定为：
  - `disabled`: 当前不可操作、通常不可聚焦，并允许采用更强的“不可用”视觉样式。
  - `readOnly`: 当前值可见但不可修改；在底层 primitive 支持时，应尽量保留可聚焦、可选择、可复制等能力，不应默认退化成“控件不可用”。
- 控件分层建议：
  - action trigger 类控件，如 `button`、toolbar action、submit trigger，只需要 `disabled`，不需要引入 `readOnly`。
  - 文本录入/编辑类控件，如 `input-*`、`textarea`、code editor，应支持 `disabled` 和 `readOnly` 两种状态。
  - 数据录入但非文本 primitive 的控件，如 `select`、combobox、date picker、checkbox-group、radio-group、array editor、key-value、condition builder，应以“最终支持两种状态”为目标；但如果某个控件当前还没有清晰的 readonly 交互定义，文档必须明确写出“暂未支持 readOnly”或“当前临时退化为 disabled”，不能在 contract 上静默混同。
  - 纯展示型控件不需要引入这两个字段。
- 视觉建议：
  - `disabled` 可以继续使用明显的 unavailable 样式。
  - `readOnly` 应保持内容可读性，样式弱于 `disabled`，避免直接套用禁用态的低透明度和不可用提示。
- 落地建议：
  - 不要在全局 schema contract 层把 `readOnly` 自动别名成 `disabled`。
  - 允许少数具体控件在过渡期声明“`readOnly` 当前等同 `disabled`”，但这必须是文档化的控件级临时行为，而不是全局规则。

## Workstreams

### Workstream 1 - Example Correction

Status: completed

Targets:

- `docs/examples/user-management-schema.md`

Tasks:

- replace form-local `submitForm + formId` example with form-owned `submitAction` plus trigger-side `component:submit`
- prefer `component:refresh` with explicit table identity when the example intends instance refresh rather than page-wide legacy `refreshTable`
- keep `closeDialog` without `dialogId` for nearest-dialog default behavior
- remove or annotate `${searching}` / `${saving}` placeholders unless the example also documents where those pending flags come from
- add notes that clearly label any remaining compatibility-only field as non-preferred authoring

Exit criteria:

- example can be read as “current preferred writing style” without requiring the reader to reverse-engineer runtime tests

### Workstream 2 - Action Authoring Contract Clarification

Status: completed

Targets:

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/action-algebra-formal-spec.md`
- `docs/architecture/action-graph-authoring.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/references/flux-json-conventions.md`

Tasks:

- document that `then` / `onError` accept both single object and array, and that arrays are sequential shorthand, not parallel shorthand
- document when nested `then` is useful versus when array chaining is sufficient
- document that exported node optionality uses `when`, not a new bare `optional` field
- document that `parallel` remains an explicit aggregate node; do not rename it to `steps` + mode boolean
- document that a future visual designer may use `next` edges / guarded groups in authoring IR, but must lower back to ordered arrays + `when` + `then` + `onError` + `parallel`
- add one “preferred targeting matrix”:
  - component instance -> `component:<method>` + `componentId` / `componentName`
  - dialog stack -> built-in `closeDialog` with nearest default, optional `dialogId`
  - source/runtime entry -> built-in `refreshSource` with `targetId`
- explicitly mark compatibility carriers such as `formId` and any overloaded path-style fields that remain in types/code but are not preferred for new schema

Exit criteria:

- one reader can tell which target field family belongs to which action family without reading runtime code

### Workstream 3 - Adaptor Surface Documentation

Status: completed

Targets:

- `docs/architecture/api-data-source.md`
- `docs/references/flux-json-conventions.md`

Tasks:

- document exact adaptor context objects for request and response
- document the current lexical-scope proxy behavior of `scope`
- document that `return <expression>;` is accepted today as compatibility sugar
- document that adaptor strings are still expression surface, not general statement blocks
- document request-adaptor merge behavior and the fact that request adaptor may still rewrite `params` / `data` before final URL canonicalization
- document current response-adaptor limits, especially unavailable response metadata when relevant

Exit criteria:

- adaptor authors can answer “what variables are available?” and “can I write `return ...;`?” from docs alone

### Workstream 4 - Form Submit And Pending-State Guidance

Status: completed

Targets:

- `docs/architecture/form-validation.md`
- `docs/architecture/action-interaction-state.md`
- `docs/components/button/design.md`

Tasks:

- document the current semantic-submit entry points: `FormRuntime.submit(...)`, built-in `submitForm`, preferred `component:submit`
- document duplicate-submit guard semantics as `cancelled`, not business failure
- document the target form-state read surface:
  - current form subtree -> `$form`
  - outside the form subtree -> `statusPath`
  - reject `$store`
- document that generic async button pending state is not yet a unified runtime contract and should not be inferred from arbitrary async action graphs
- define owner-first auto-state guidance:
  - form submit pending belongs to `form`
  - source-backed selector loading belongs to the field/source owner
  - generic button pending needs explicit tracked interaction state once that surface lands
- define short-term guidance for examples:
  - semantic form submit can rely on runtime duplicate-submit guard for correctness
  - explicit disabled/loading UI still needs author-visible state until a shared pending contract lands
- keep cross-action pending state in a dedicated interaction-state doc, while leaving timeout/retry/debounce in `Operation Control`

Exit criteria:

- docs distinguish correctness guarantees from UX-state exposure guarantees

### Workstream 5 - Field Interactivity Contract

Status: completed

Targets:

- `docs/components/index.md`
- `docs/architecture/form-validation.md`
- possibly a new dedicated field-interactivity doc or section

Tasks:

- standardize the author-visible name as `readOnly`, not `readonly`
- state clearly that `disabled` and `readOnly` are separate semantics
- document the recommended control-family split:
  - trigger controls -> `disabled` only
  - text/editor controls -> support both
  - selector/composite field controls -> converge to both, with explicit temporary fallback notes where not yet implemented
- define minimum shared meaning:
  - `disabled`: not interactive, generally not focusable
  - `readOnly`: value not editable, but may remain focusable/selectable where the underlying primitive supports it
- document that text-entry controls should align first with `@nop-chaos/ui` / React DOM `readOnly`
- document that select/checkbox/switch-style controls need explicit per-control `readOnly` semantics instead of assuming HTML text-input behavior
- document that `readOnly` should not automatically inherit disabled visual treatment
- identify implementation follow-up needed because current generic form input renderers still mostly wire only `disabled`

Exit criteria:

- naming and semantics are stable even before all renderers are fully implemented

## Recommended Update Order

1. fix the representative example
2. tighten action authoring rules in architecture + conventions docs
3. tighten adaptor surface docs
4. add form submit / pending-state guidance
5. finalize `disabled` / `readOnly` contract and list implementation follow-ups

## Validation Checklist

- [x] example no longer recommends `submitForm + formId` for normal new form authoring
- [x] docs explicitly state `then` / `onError` single-or-array support
- [x] docs explicitly state that `when` is the exported optional-step mechanism
- [x] docs explicitly state that `parallel` remains an explicit aggregate node, not `steps` + mode boolean
- [x] docs explicitly list adaptor context variables
- [x] docs explain `return <expression>;` compatibility semantics
- [x] docs explicitly state `closeDialog` nearest-dialog default behavior
- [x] docs define preferred component targeting via `component:<method>` + `componentId` / `componentName`
- [x] docs define `readOnly` as canonical name
- [x] docs distinguish `disabled` from `readOnly`
- [x] docs define which control families need both states and which only need `disabled`
- [x] docs explain current pending-state gap for generic async button actions
- [x] docs distinguish semantic-owner auto state from generic tracked-interaction state
- [x] docs define form-state read surface as `$form` + `statusPath`

## Closure

Status Note: The representative example and the normative authoring docs now align on the current runtime baseline: form-owned submit lifecycle, current action-control-flow projection, adaptor context and compatibility sugar, preferred targeting, nearest-dialog close behavior, pending-state ownership, and `disabled` versus `readOnly` naming.

Follow-up:

- renderer-by-renderer `readOnly` implementation convergence remains a normal implementation backlog, not remaining plan-owned documentation debt

## Success Criteria

本计划完成后，读者应能只通过文档回答以下问题，而不必再去翻测试和 runtime 代码：

- `then` 能不能写数组，什么时候该写嵌套
- 为什么 visual designer 不应倒逼 exported DSL 改成 `steps`
- optional step / guarded segment 应该落在 `when` 还是新字段
- adaptor 里能用哪些变量，`return` 到底是不是正式支持的写法
- `closeDialog` 为什么默认不需要 `dialogId`
- 外部如何正确触发表单/表格这类组件实例能力
- `formId` 这类字段是否仍应出现在新示例中
- 表单内部和外部分别如何读取 form status，以及为什么不应暴露 `$store`
- 异步按钮为什么不会自动拥有统一 pending disabled 语义
- 哪些控件可以因为 owner-known state 自动 disabled，哪些不能靠 runtime 猜测
- `disabled` 和 `readOnly` 应该如何区分，以及为什么标准名应是 `readOnly`
