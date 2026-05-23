# Round 01 - Contract To Test Mapping

## Findings

### 1. P1 | 跨层断层 / 只测 helper，不测公开契约

- 契约：`create-owner` 子 owner 的提交门控，必须由真实 schema 编译结果一路驱动到父 owner 的 `submit()` / `canSubmit` 行为，而不是只在 runtime child-contract helper 层成立。
- 位置：
  - 实现：`packages/flux-runtime/src/form-runtime-submit-flow.ts`，`packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`，`packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`
  - 测试：`packages/flux-runtime/src/__tests__/owner-submit-contracts.test.ts`，`packages/flux-renderers-form-advanced/src/__tests__/composite-form-detail-and-loop.test.tsx`，`packages/flux-renderers-form-advanced/src/variant-field/variant-field-owner-contract.test.tsx`
- 现状：
  - `owner-submit-contracts.test.ts` 主要直接手工注册 child contract，验证的是 `form-runtime-submit-flow` 的局部逻辑。
  - `variant-field-owner-contract.test.tsx` 大面积 mock 掉 `@nop-chaos/flux-react`、projected owner 和 runtime，只证明组件内部调用 `registerChildContract`。
  - 真实 schema 集成主要集中在 detail family；`variant-field` 的非 form owner / page-root owner 场景没有同等级 live schema submit-gating 覆盖。
- 为什么 coverage 会误导：
  - 表面看 child contract、summary-gate、recurse-submit 都有测试，但大部分只保护手工 contract 对象或 mock owner。
  - 一旦 `validationOwnerPlan` 编译、provider 装配、projected owner 注册时机或非 form owner 路径出问题，helper 级测试仍会全绿。
- 最小补强建议：
  - 增加 1 个真实 `SchemaRenderer` 契约测试：`page` 根下放 `variant-field` 或等价 `create-owner` 子控件，打开子 owner 但保持无效，然后验证父级 `component:submit` 被 `summary-gate` / `recurse-submit` 阻断。
  - 同一测试里断言关闭或修复子 owner 后，父级提交恢复，覆盖注册与卸载两端。

### 2. P1 | 入口错误覆盖 / 过度 mock

- 契约：非 form validation owner（page-root / surface-root）必须通过 `useCurrentValidationScope()`、`notifyFieldHidden()`、`validateSubtree()`、`applyExternalErrors()` 等公开面与复杂 renderer 正确协作。
- 位置：
  - 实现：`packages/flux-react/src/schema-renderer.tsx`，`packages/flux-react/src/dialog-host.tsx`，`packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
  - 测试：`packages/flux-react/src/__tests__/schema-renderer-validation-owner-boundary.test.tsx`，`packages/flux-renderers-form-advanced/src/variant-field/variant-field-owner-contract.test.tsx`
- 现状：
  - React 层已验证 page-root owner 会 bootstrapping -> active，surface-root owner 在无 validation plan 时保持 bootstrapping。
  - 复杂控件对 non-form owner 的真实协作仍大量停留在 mock contract 级。
  - 没看到真实 `SchemaRenderer(page)` 或 `DialogHost(surface-root)` 下，复杂控件通过 live validation context 与 owner 完成隐藏参与、子契约注册、提交阻断/放行的整链路测试。
- 为什么 coverage 会误导：
  - page-root/surface-root 看起来“有测试”，但实际只保护 owner 是否存在，不保护 owner 是否被复杂 renderer 正确消费。
  - 这类断层容易表现为浏览器里坏、单测里绿。
- 最小补强建议：
  - 各补 1 个真实入口测试：
  - `page` 根下 non-form owner 场景，复杂控件触发 `validateSubtree` / `applyExternalErrors` / `notifyFieldHidden` 的用户可见结果。
  - dialog 或 declarative `dialog` 下 surface-root owner 场景，验证 surface body 内字段或复杂控件的 validation context 真正生效。

### 3. P1 | 历史回归缺口 / 跨层断层

- 契约：runtime 生命周期与 owner/state 保活必须在真实 React StrictMode 与真实宿主边界下成立，而不是只在局部 runtime/form helper 下成立。
- 位置：
  - 历史 bug：`docs/bugs/39-schema-renderer-strictmode-runtime-dispose-form-reset-fix.md`，`docs/bugs/36-detail-field-strict-mode-mounted-guard-dialog-open-fix.md`，`docs/bugs/48-tabs-form-panel-unmount-reset-fix.md`
  - 现有测试：对应的 `schema-renderer`、`detail-field`、`tabs` 回归测试
- 现状：
  - StrictMode/live-only bug family 已有点状回归，但仍偏“哪个地方坏了补哪个”。
  - 还缺少一个统一跨层 contract，覆盖 owner runtime 在不同 visibility container / surface / nested owner 组合下的稳定保活与会话隔离。
- 为什么 coverage 会误导：
  - 容易让人误以为 StrictMode/owner lifetime 风险已经“被回归覆盖”，其实保护的是几个已知复现点，不是这类 defect family 的共性契约。
- 最小补强建议：
  - 增加 1 组参数化 contract 测试，覆盖 owner 在容器切换 / StrictMode remount / close-reopen 下的值保持与重新打开隔离。
  - 至少补 `dialog` / `drawer` 或另一类 visibility container。

### 4. P2 | 只测编译产物，不测公开行为

- 契约：编译出的 relational validation 依赖图（`equalsField` / `requiredWhen` 等）必须驱动 runtime 的依赖重验与 UI 行为，而不仅是 `validationPlan` 结构正确。
- 位置：
  - 实现：`packages/flux-runtime/src/form-runtime-owner.ts` 的 dependent revalidation 路径
  - 测试：`packages/flux-runtime/src/__tests__/runtime-validation-compile.test.ts`，`packages/flux-renderers-form/src/__tests__/form-validation-rules.test.tsx`
- 现状：
  - 一类测试证明 compile 后 `dependencyPaths` / `dependents` 存在。
  - 另一类测试证明 UI 上最终出现或消失错误。
  - 中间缺一个更直接的契约证明：runtime 确实按 dependency graph 做定向重验，而不是因为整表单粗暴重跑也碰巧通过。
- 为什么 coverage 会误导：
  - 容易把“compile 结构有断言 + UI 最终行为没坏”误当成 runtime 依赖增量语义已被保护。
  - 如果 runtime 回退成 broad invalidation / 全量重验，现有测试多数仍会过。
- 最小补强建议：
  - 增加 1 个 focused integration test：用真实 schema 跑 `requiredWhen` / `equalsField`，并验证只有受影响 path 被重验、非依赖字段不被触发。

### 5. P2 | Happy path only / 断言过弱

- 契约：surface-root validation owner 在 dialog/drawer 里的公开行为，不只是“存在/关闭”，还包括 lifecycle 和 validation context 对 surface body 的实际可见影响。
- 位置：
  - 实现：`packages/flux-react/src/dialog-host.tsx`
  - 测试：`packages/flux-react/src/__tests__/schema-renderer-runtime-dialogs.test.tsx`，`packages/flux-react/src/__tests__/dialog-host-surface.test.tsx`，`packages/flux-react/src/__tests__/schema-renderer-validation-owner-boundary.test.tsx`
- 现状：
  - dialog 测试主要覆盖能打开/关闭、provider fallback、form 状态保活、polling source 停止。
  - validation owner 侧更多是存在性与 bootstrapping 行为，缺少 surface body 中真实字段或复杂控件通过 owner 生效的 live 行为断言。
- 为什么 coverage 会误导：
  - dialog 测试数量不少，容易误判 surface family 已被充分保护。
  - 实际上它们更偏 surface 壳与 provider/async source，对 validation owner 公开契约仍是弱覆盖。
- 最小补强建议：
  - 增加 1 个 dialog 集成用例：在 body 放真实字段或复杂控件，断言 owner 从 bootstrapping 到 active 后，`validateAll` / `submit` 或错误显示真实可见，并验证 close 后 summary/status 不被错误复用。

## 本轮新增证据 / 新增结论

- 相对旧报告，本轮新增的重点不是“哪些模块没直测”，而是更具体地识别出几处“看起来测试很多，实际只保护 helper、mock 或局部 family”的断层。
- 其中最重要的是 child owner submit-gating、page-root / surface-root non-form owner 协作，以及 relational validation 的 runtime dependency graph 消费契约，都存在比旧报告更具体的 live 证据。
