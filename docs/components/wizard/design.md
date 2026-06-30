# Wizard 组件设计

## 1. 组件定位

- `wizard` 是分步式任务容器 renderer，用来组织多个 step、step 切换、前进/后退、以及可选的 step 提交语义。
- 它不是 `tabs` 的简单视觉别名，也不是 `page` 的轻量变体。

## 2. 核心设计判断

`wizard` 在 owner taxonomy 中应被视为 **组合 owner**：

- step 切换属于 `Interaction Owner`
- step 提交 / 下一步校验 / 最终完成属于 `Semantic Lifecycle Owner`

因此不应把所有状态压成一个模糊的 `wizard.loading` 或 `wizard.status`。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'wizard'`
- 归属 `@nop-chaos/flux-renderers-layout`（roadmap §102 authoritative；首次 bootstrap 该包）
- 预期 category: `layout`

## 4. schema 设计

建议正式字段：

```ts
interface WizardSchema extends BaseSchema {
  type: 'wizard';
  steps: WizardStepSchema[];
  value?: string | number;
  defaultValue?: string | number;
  statusPath?: string;
  linear?: boolean;
  allowStepJump?: boolean;
  mountOnEnter?: boolean;
  unmountOnExit?: boolean;
  onChange?: ActionSchema;
  onStepCommit?: ActionSchema | ActionSchema[];
  onComplete?: ActionSchema | ActionSchema[];
  onStepError?: ActionSchema | ActionSchema[];
}

interface WizardStepSchema extends BaseSchemaWithoutType {
  key?: string | number;
  title?: SchemaValue | SchemaInput;
  description?: SchemaValue | SchemaInput;
  body?: SchemaInput;
  actions?: SchemaInput;
  visible?: SchemaValue;
  disabled?: SchemaValue;
  beforeEnter?: ActionSchema | ActionSchema[];
  beforeLeave?: ActionSchema | ActionSchema[];
}
```

## 5. 字段分类

- `steps`: renderer-owned structured field
- `value` / `defaultValue`: `value`
- `statusPath`: `value`
- `onChange` / `onStepCommit` / `onComplete` / `onStepError`: `event`

## 6. 状态 ownership

### 6.1 Step Switching

当前步骤切换属于 interaction owner：

- `value`
- `currentStepKey`
- `currentStepIndex`
- `canGoNext`
- `canGoPrev`

这部分与 `tabs` 更接近。

因此：

- step 切换交互态是 **local controlled**（renderer 自维护）；`value`/`defaultValue` 仅作初始种子读一次，运行时不响应 `value` 变更（见 §10.1）。
- 外部若需要只读摘要，可通过 `statusPath`（真实实现、保留）。

### 6.2 Step Commit

下一步前的校验、提交、异步检查等属于 semantic lifecycle owner：

- `committing`
- `validating`
- `lastCommitStatus`
- `stepError`

这部分与 `form submit` 更接近。

### 6.3 Summary Shape

如果 `wizard` 提供 `statusPath`，推荐摘要至少包含：

```ts
interface WizardStatusSummary {
  currentStepKey?: string | number;
  currentStepIndex: number;
  stepCount: number;
  canGoNext: boolean;
  canGoPrev: boolean;
  committing: boolean;
  validating: boolean;
  lastCommitStatus?: 'idle' | 'success' | 'error' | 'cancelled' | 'timedOut' | 'validationError';
}
```

## 7. 事件、动作与组件句柄能力

推荐支持：

- `component:setValue`
- `component:getValue`
- `component:next`
- `component:prev`
- `component:goToStep`
- `component:commitStep`

说明：

- `component:next` / `component:prev` 解决 step navigation
- `component:commitStep` 解决 semantic step-commit 入口
- 不应把二者混为同一个模糊动作

## 8. 表达式与局部绑定

局部绑定策略：

- 不建议一开始就引入 `$wizard`
- 先用 `statusPath` 收口外部读取
- 如果后续证明确有强烈 subtree-local 读取需求，再评估 `$wizard`

原因：

- `wizard` 天然是组合 owner，局部绑定很容易变成过宽对象
- 在语义稳定前，直接发布一个大而全的 `$wizard` 容易把 interaction state 和 semantic lifecycle state 混在一起

## 9. 与 page / tabs / form 的边界

- 与 `page` 的边界：`wizard` 不属于 page shell，状态不应上卷到 `page`
- 与 `tabs` 的边界：`wizard` 有 step commit 语义，不能只当作换皮 tabs
- 与 `form` 的边界：如果某一步内部有 form，该 form 仍然拥有自己的 submit/validate 状态；wizard 只拥有 step-level commit 语义

## 10. 可选步骤（optional）

`WizardStepSchema` 不再声明 `optional` 字段。早期 schema 曾为 step 声明 `optional`，但渲染器从未实现「可跳过」语义（`computeCanGoTo` 不放行 optional 步骤），是暗示了未实现能力的死字段，故已移除（见 `docs/plans/2026-06-25-0510-1-wizard-boolean-literal-normalization-correctness-plan.md` Phase 1 Decision）。

- `step.disabled`（经编译器 `__nopPreserveLiteral` 包裹后由 `unwrapBooleanLiteral` 解包）才是真正的步骤门禁：disabled step 不可进入、不可点、不计入 `canGoNext`。
- 如果未来需要「条件性跳过 step」，优先通过 step `visible` 或更明确的 step guard 收口，不要把跳步逻辑塞进 page 或 host 私有脚本。
- 若要重新引入显式「可跳过」语义，必须同步实现 `computeCanGoTo` 放行逻辑并补 focused 测试，再恢复字段声明——不得再次保留暗示了未实现能力的死字段。

## 10.1 步骤切换 value ownership 字段（valueOwnership / valueStatePath）

`WizardSchema` 不再声明 `valueOwnership` / `valueStatePath`。早期 schema 曾声明二者（仿 steps/collapse 的 local/controlled/scope 三态分层），但 wizard renderer 从未读取它们——step 切换是 **local controlled interaction state**，`value`/`defaultValue` 仅作受控**种子**读一次（运行时改 `value` 不移动步骤），外部只读摘要经 `statusPath` 发布。二者属于「发布了 renderer 本体从不接线的契约」，已移除（见 `docs/plans/2026-06-25-0510-2-new-package-advertised-contract-and-lifecycle-honesty-plan.md` WS-A，per-component 裁定 (B) 移除并文档化为 local-only）。

- canonical 三态分层（`valueOwnership`/`valueStatePath` 真正实现）只保留在 steps/collapse duo；wizard 与之边界不同：wizard 是组合 owner（interaction + lifecycle 分层），步骤切换交互态本身就是 local controlled。
- 若未来需要 wizard 的当前步骤受外部受控/scope 驱动，应重新引入 ownership 契约**并同时实现** controlled/scope 的读/写管线（对齐 steps/collapse 范式），再恢复字段声明——不得再次保留死字段。
- `statusPath`（只读摘要发布）是真实实现的能力，保留不变。

## 11. 样式与 DOM marker 约定

- 根节点保留 `nop-wizard` marker
- step 导航、进度条、body、actions 使用稳定 `data-slot`
- 视觉变体不应影响 owner 边界与状态语义

## 12. 风险与取舍

- 最大风险是把 step switching 和 step commit 混成一个宽状态对象，导致按钮 disabled、异步提交、step 跳转语义互相污染。
- 第二个风险是过早引入 `$wizard`，让 schema 依赖一个尚未稳定分层的大对象。

## 13. 结论

`wizard` 的最佳设计不是“一个更复杂的 tabs”，也不是“一个页面内的小 page”。

最佳方向是：

- interaction state 和 semantic lifecycle state 分层
- 外部统一通过 `statusPath` 读取摘要
- 动作上区分 navigation 与 commit
- 不把状态上卷到 `page`
