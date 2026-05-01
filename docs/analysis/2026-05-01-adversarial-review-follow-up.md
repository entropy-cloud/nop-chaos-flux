# Adversarial Review Follow-Up: 2026-05-01

第二轮开放式对抗性审查。此文件只记录相对 `docs/analysis/2026-05-01-adversarial-review.md` 的补充发现，不重复前一份里已经写过的问题。

## 1. Dialog/Drawer 的 owner scope key 会在同一触发点的多次打开之间冲突 (HIGH)

- 在哪里: `packages/flux-runtime/src/runtime-factory.ts:478-486`, `packages/flux-runtime/src/action-adapter.ts:127-139`, `packages/flux-runtime/src/action-adapter.ts:169-179`, `packages/flux-runtime/src/surface-runtime.ts:61-87`, `packages/flux-runtime/src/async-data/source-registry.ts:80-97`, `packages/flux-runtime/src/async-data/source-registry.ts:258-263`, `packages/flux-runtime/src/async-data/reaction-runtime.ts:370-387`, `packages/flux-runtime/src/async-data/reaction-runtime.ts:479-483`, `packages/flux-runtime/src/__tests__/runtime-dialogs-scope.test.ts:8-553`
- 是什么: `openDialog` 和 `openDrawer` 都按 `templateNode.id` 或当前 `scope.id` 生成固定的 `dialog-scope` / `drawer-scope` key。`SurfaceRuntime` 给 surface entry 分配的是唯一 `surfaceId`，但 source/reaction registry 的 owner 仍按 `scope.id` 建桶、替换和 dispose。结果是: 同一个节点连续打开两个 dialog 或 drawer 时，两个 surface entry 是独立的，但它们背后的 owner scope id 不是独立的。
- 为什么值得关心: 这是一个真实的跨子系统冲突。第二个 surface 注册 data source 或 reaction 时会替换掉第一个；关闭任意一个 surface 时，`surface-runtime` 又会按共享的 `scope.id` 去 dispose owner tree，可能把仍然打开的同胞 surface 的异步 owner 一并销毁。当前测试覆盖了 open/close 基本路径，但没有覆盖“同一触发点同时打开多个 surface”的情况，所以这个冲突现在是静默的。
- 信心水平: 确定

## 2. built-in form targeting 的 `formId` 目前基本只是表面契约 (HIGH)

- 在哪里: `packages/flux-core/src/types/actions.ts:35-45`, `packages/flux-core/src/types/actions.ts:295-303`, `packages/flux-runtime/src/action-adapter.ts:34-83`, `packages/flux-runtime/src/action-adapter.ts:111-119`, `docs/references/action-payload-matrix.md:66-67`, `docs/architecture/action-scope-and-imports.md:654-657`, `packages/flux-runtime/src/__tests__/runtime-actions-setvalues.test.ts:7-143`
- 是什么: action 契约公开了 `formId` 这个 targeting carrier，但 runtime adapter 没有真正“按 formId 找目标 form”的实现。`setValue` / `setValues` 只有在 `ctx.form.id === targeting.formId` 时才走 form API，否则会静默退回到 `ctx.scope.update(...)`。`submitForm` 更直接: 它完全忽略 `targeting.formId`，只要没有 `ctx.form` 就报错，有 `ctx.form` 就提交当前 form。
- 为什么值得关心: 这会把“兼容 carrier”变成“看起来支持、实际上不解析”的假接口。跨 form 写入时，值可能被悄悄写到当前 scope 而不是目标 form；`submitForm` 则根本不能靠 `formId` 跨上下文命中目标实例。更糟的是，`setValue` / `setValues` 在 mismatch 时不是失败，而是静默误写，这类 bug 在页面复杂后会非常难排查。现有测试只覆盖了“当前上下文已经就是目标 form”的 happy path。
- 信心水平: 确定

## 3. `summary-gate` 只影响 `canSubmit`，并不真正约束 submit 执行路径 (HIGH)

- 在哪里: `packages/flux-runtime/src/form-runtime-derived-state.ts:6-24`, `packages/flux-runtime/src/form-runtime-submit-flow.ts:129-195`, `docs/architecture/form-validation.md:995-1014`, `packages/flux-runtime/src/__tests__/plan-68-69-remaining-behaviors.test.ts:278-342`
- 是什么: 运行时当前会在 `computeCanSubmitState()` 中把 active 的 `summary-gate` child contract 计入 gating: child 未 ready、正在 validating、或 `valid === false` 时，parent `canSubmit` 返回 `false`。但真正的 `executeFormSubmit()` 只在本地 validation 之后迭代 `recurse-submit` contracts 并触发 `triggerValidation()`；它没有再次检查 `summary-gate` child state。
- 为什么值得关心: 这把“按钮可不可点”和“运行时是否允许提交”拆成了两套规则。任何直接调用 `form.submit()`、`submitForm`、或者绕过按钮禁用态的编排，都会跳过 `summary-gate` 的 child-owner gating。这既违背 `docs/architecture/form-validation.md:1013-1014` 的当前实现说明，也会把 parent/child owner 边界重新变成 UI 约定而不是 runtime invariant。
- 信心水平: 确定

## 4. `submitWhenHidden` 已被公开到 schema/compiler，但 runtime 根本没有对应实现 (HIGH)

- 在哪里: `packages/flux-renderers-form/src/renderers/form-definition.ts:89-108`, `packages/flux-compiler/src/schema-compiler.ts:478-481`, `packages/flux-core/src/types/validation.ts:4-7`, `packages/flux-core/src/validation-model.ts:10-27`, `packages/flux-runtime/src/form-runtime-submit-flow.ts:197-200`, `packages/flux-runtime/src/form-runtime-validation.ts:391-397`, `packages/flux-compiler/src/schema-compiler-prop-coverage.test.ts:470-480`
- 是什么: authoring schema 和 renderer definition 明确暴露了 `hiddenFieldPolicy.submitWhenHidden`，compiler 也把它原样塞进 `defaultHiddenFieldPolicy`。但 core 的 `HiddenFieldPolicy` 类型根本没有这个字段，默认合并逻辑也只认识 `validateWhenHidden` / `clearValueWhenHidden`。runtime 里实际参与 hidden-field 逻辑的只有 validation 与 clear 路径；默认 submit 仍直接把 `store.getState().values` 交给 submit result，没有任何 hidden submit policy 分支。
- 为什么值得关心: 这不是单纯的“文档超前”，而是“schema surface、compiler、prop coverage test 一起对外承诺了一个 runtime 不会执行的能力”。调用方会以为 hidden-field submit policy 已经存在，但实际行为仍是全量值提交。既然编译测试已经把它视为受支持输入，这个漂移会越来越难回收。
- 信心水平: 确定

## 5. collapsible `fieldset` 现在是纯鼠标交互，测试也把这种无障碍缺口固化了 (MEDIUM-HIGH)

- 在哪里: `packages/flux-renderers-form/src/renderers/fieldset.tsx:42-58`, `docs/components/fieldset/design.md:64-79`, `packages/flux-renderers-form/src/__tests__/form-package-exports.test.tsx:34-64`
- 是什么: 折叠/展开行为直接挂在 `<legend onClick>` 上，并通过 `cursor: 'pointer'` 暗示可点。这里没有 `<button>` 语义，没有 `aria-expanded`，没有 `aria-controls`，也没有 Enter/Space 的键盘处理。回归测试只验证了 mouse click 会切换折叠态。
- 为什么值得关心: `fieldset` 是表单体系里的基础分组 primitive，不是边角组件。当前实现对键盘和读屏用户几乎不可操作，也不可发现。更糟的是，测试已经把“点击 legend”当成唯一正确交互固定下来，后续很容易一直漏掉 a11y 维度。
- 信心水平: 确定

## 6. spreadsheet 的多列过滤状态不是可组合的，第二个过滤条件会覆盖第一个的行效果 (HIGH)

- 在哪里: `packages/spreadsheet-core/src/core/filter-operations.ts:5-52`, `packages/spreadsheet-core/src/types.ts:88-96`, `packages/spreadsheet-core/src/__tests__/core-basics.test.ts:433-478`, `docs/logs/2026/04-25.md:94-99`
- 是什么: `WorksheetFilterState.columns` 明确允许同时保存多个列过滤条件，但 `applyFilterRowsByCellValue()` 在每次调用时都只按“当前列 + 当前值”重算 `rows[*].filteredOut`。它会把 metadata 中其他列的 filter 保留下来，却不会把这些旧条件一起参与行过滤判定。
- 为什么值得关心: 这会制造一种很危险的“元数据说有两个 filter，实际行效果只有最后一个 filter”状态。任何更丰富的 header filter UI、持久化导出、或 report-designer 上层逻辑，只要信任 `sheet.filters.columns` 是真实 owner model，就会建立在一个已经自相矛盾的底座上。现有测试只验证了单列 filter 和 clear path，没有覆盖多条件组合。
- 信心水平: 确定

## 总评

- 第一优先方向是把 runtime 里的 owner identity / targeting contract 收紧。`surface` 多实例冲突、`formId` 只剩表面语义、`summary-gate` 只管按钮不管执行，本质上都在说明“owner 边界已经被设计出来，但运行时还没有把它当成硬约束执行”。
- 第二优先方向是停止继续公开没有 runtime owner 的 schema 能力。`submitWhenHidden` 这种能力一旦进入 renderer definition、compiler 和 prop-coverage test，就已经不再是 harmless placeholder，而是在制造对外假承诺。
- 第三优先方向是补 adversarial regression tests，而不是只补 happy path。这个仓库已经有大量单路径测试，但缺少“同一节点开两个 surface”“跨 form targeting”“programmatic submit 绕过 UI gate”“多列 filter 组合”这类边界组合测试；而这正是本轮最有价值的问题集中出现的地方。
