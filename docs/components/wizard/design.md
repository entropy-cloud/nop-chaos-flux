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
  valueOwnership?: 'local' | 'controlled' | 'scope';
  valueStatePath?: string;
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
  optional?: SchemaValue;
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

- `valueStatePath` 负责可写的当前步骤持久化
- 外部若需要只读摘要，可通过 `statusPath`

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

## 10. 可选步骤

step 是否 optional 是 step 级语义，不是整体 wizard 的隐式跳步协议。

推荐：

- `optional` 仅表达该 step 可以跳过
- 真正是否允许进入下一步，仍由 step commit / validation 语义决定
- 如果需要条件性跳过 step，优先通过 step `visible` 或更明确的 step guard 收口，不要把跳步逻辑塞进 page 或 host 私有脚本

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
