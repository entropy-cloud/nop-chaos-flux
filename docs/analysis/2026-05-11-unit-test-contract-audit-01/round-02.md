# Round 02 - Bug Family And Async Boundary Audit

## Findings

### 1. P1 | 缺少历史回归保护 / 异步 stale-result 治理

- 契约：`SchemaRenderer` 的 schema import preload 必须满足 latest-wins；旧一轮 `prepareSchema()` 即使晚到，也不能覆盖新 schema 的 `preparedImports` 或错误状态。
- 位置：
  - 实现：`packages/flux-react/src/schema-renderer.tsx`
  - 测试：`packages/flux-react/src/__tests__/schema-renderer.test.tsx`，`packages/flux-react/src/__tests__/compilation-and-boundaries.test.tsx`
- 现状：
  - 现有测试覆盖 import preload 失败时的 root fallback，以及 schema 改变后 root import 被释放。
  - 但没有测试 A/B 两次 preload 并发时，A 晚于 B 返回是否被正确忽略。
- 为什么 coverage 会误导：
  - 代码里已经有 `AbortController`，加上“schema change 会 release imports”的测试，容易误以为 stale-result 已被保护。
  - 真正风险点在 React effect 的异步 settle 路径，runtime/import manager 单测并没有覆盖这个入口。
- 最小补强建议：
  - 增加一个 `SchemaRenderer` 级回归测试，构造两版 schema 的延迟 `prepareSchema()`；先切到 B，再让 A 晚到返回，断言最终渲染、`preparedImports`、root error 都只对应 B。

### 2. P1 | 生命周期处置 / StrictMode / source runtime

- 契约：owner doc 明确 source lifecycle 由 runtime owner 管；React host 只能 mount、subscribe、dispose，不能在 StrictMode replay 或快速 rerender 下把仍应存活的 source observer 提前 dispose，也不能让旧 source 结果回灌。
- 位置：
  - 实现：`packages/flux-react/src/use-source-value.ts`，`packages/flux-react/src/use-node-source-props.ts`，`packages/flux-react/src/node-source-prop-controller.ts`
  - 测试：`packages/flux-react/src/__tests__/use-source-value.test.tsx`，`packages/flux-react/src/__tests__/node-source-prop-controller.test.ts`，`packages/flux-react/src/__tests__/data-source-and-node-identity.test.tsx`
- 现状：
  - hook/controller 测试主要验证 value plumbing 和 `dispose()` 被调用。
  - 没有 StrictMode remount、in-flight source 在 input flip/unmount 时的 abort，以及“旧 source 晚到不覆盖新 source”的 React 入口测试。
- 为什么 coverage 会误导：
  - runtime 层 data-source/source 测试很多，hook 层也有单测，看起来像“source 已经全覆盖”。
  - 但这些测试基本都在 mock observer 或 runtime helper 层，没有保护 `flux-react` 这一层最容易复现生命周期问题的真实入口。
- 最小补强建议：
  - 用真实 `runtime.createSourceObserver()` 加延迟 fetcher，补一个 StrictMode + rerender 场景，验证旧请求 abort 或 stale-drop，新 source 才能 publish，unmount 后不会继续回写。

### 3. P1 | 验证 owner 仲裁 / 提交优先级

- 契约：`docs/architecture/form-validation.md` 要求 owner 级 `submit` / `commit` 必须 supersede 低优先级 `blur` / `change` / `manual` 验证，并阻止 stale async completion 发布旧结果。
- 位置：
  - 实现：`packages/flux-runtime/src/form-runtime-validation.ts`，`packages/flux-runtime/src/form-runtime-owner.ts`，`packages/flux-runtime/src/form-runtime-submit-flow.ts`
  - 测试：`packages/flux-runtime/src/__tests__/owner-validation-lifecycle-contracts.test.ts`，`packages/flux-runtime/src/__tests__/form-runtime-submit-flow.test.ts`
- 现状：
  - 现有测试覆盖 bootstrapping defer、debounce 期间 `validating` / `ready` 状态，以及 submit helper 的分支行为。
  - 但没有真实 `FormRuntime` 入口测试去证明“blur 中的异步校验被 submit supersede 后不会再 publish”。
- 为什么 coverage 会误导：
  - validation 相关测试数量很多，`executeFormSubmit()` 也有大量分支单测，容易给出“提交与校验并发已覆盖”的错觉。
  - 实际上 `supersedeLowerPriorityWork` 在相关测试里更多是 mock 字段，没有断言它真的参与 runtime 行为。
- 最小补强建议：
  - 增加一个 `FormRuntime` 级回归：先启动带 debounce 的 async blur validation，再立即 `submit()` 或 `validateAll('submit')`，断言旧 run 被取消或 stale-dropped，最终 store/result 只反映 submit 那一轮。

### 4. P2 | Owner boundary 真实入口覆盖不足

- 契约：`ActionScope`、`ComponentHandleRegistry`、import/host 边界必须分离；`component:*` 应通过真实 mounted registry 解析，尤其是 `componentRegistryPolicy: 'new'` 创建的子 registry。
- 位置：
  - 实现：`packages/flux-runtime/src/component-handle-registry.ts`，`packages/flux-react/src/use-node-scopes.ts`，`packages/flux-react/src/schema-renderer.tsx`，`packages/flux-runtime/src/action-adapter.ts`
  - 测试：`packages/flux-runtime/src/__tests__/action-adapter.unit.test.ts`，`packages/flux-runtime/src/__tests__/component-handle-registry.test.ts`，`packages/flux-renderers-data/src/__tests__/crud-selection-and-features.test.tsx`
- 现状：
  - registry 机制和 adapter 路由测得很多。
  - 真实 schema action 入口更多只覆盖平面 `crud` 的 `component:refresh`，没有 mounted tree 场景验证 `component:submit`、`componentName`、嵌套 child registry、歧义目标等。
- 为什么 coverage 会误导：
  - 单看测试分布会觉得 component handle 已经很全。
  - 但大部分覆盖停留在 registry / adaptor 模块内，真实入口里 `NodeRenderer` 如何创建和链接子 registry、schema action 如何穿过 owner boundary，保护仍弱。
- 最小补强建议：
  - 增加一个 `SchemaRenderer` 集成测试，渲染带 `componentRegistryPolicy: 'new'` 的嵌套 form / crud，分别用 `componentId` 和 `componentName` 触发 `component:submit` / `component:refresh`，再补一个 ambiguous target 断言。

### 5. P2 | Scope / import boundary 真实入口覆盖不足

- 契约：`docs/architecture/action-scope-and-imports.md` 要求 `ImportFrame`、`ActionScope`、Host Projection 语义彼此独立，import alias shadowing 必须严格按 lexical boundary 生效和恢复。
- 位置：
  - 实现：`packages/flux-react/src/node-renderer.tsx`
  - 测试：`packages/flux-runtime/src/__tests__/runtime-imports.test.ts`，`packages/flux-runtime/src/__tests__/import-stack.test.ts`，`packages/flux-react/src/__tests__/compilation-and-boundaries.test.tsx`
- 现状：
  - runtime 侧已经测试 child import 覆盖 parent alias、release 后恢复、同 scope collision。
  - React 侧只测 no-import fast path、abort-before-commit、root import release。没有 mounted schema 级测试证明嵌套 import boundary 下 `${$demo...}` 和 `demo:*` 的可见性会随 subtree mount/unmount 正确切换。
- 为什么 coverage 会误导：
  - runtime/import-stack 单测很强，容易让人以为 import boundary 已被封口。
  - 实际入口还多了一层 `useLayoutEffect` 安装、`return null` 等待 import frame、`createChildScope(...importBindings)` 投影，这些都没被真实渲染路径验证。
- 最小补强建议：
  - 增加一个 `SchemaRenderer` 集成测试，构造 parent/child 两层同 alias import，验证 child 内表达式和 namespaced action 读到 child alias，移除 child 后恢复 parent，且 sibling 不串漏。

## 本轮新增证据 / 新增结论

- 本轮显示，历史 bug family 在 runtime/helper 层的回归比表面更完整，但 `flux-react` 真实入口上的 stale-result、dispose、boundary 切换保护仍明显偏弱。
- async cancellation 相关保护目前最强的是 `flux-runtime` 内部 substrate；最薄弱的是 `SchemaRenderer` import preload、source hook，以及 validation owner entry arbitration 这些从 React 入口跨到 runtime owner 的位置。
- owner boundary 语义里，`component handle` 与 `import frame` 都存在“模块内直测很多，真实入口覆盖弱”的结构性缺口。
