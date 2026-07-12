# Wizard: Flux vs AMIS 对比与改进计划

## 1. 架构差异总览

| 维度          | AMIS Wizard                                                          | Flux Wizard                                                                                        |
| ------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Step 本质** | `WizardStepSchema extends AMISFormBase`——每个 step 就是一个完整 Form | `WizardStepSchema` 声明 `body` region——step body 内容由用户自由组合（通常是 form，但不强制）       |
| **数据归属**  | 所有 step 共享一个 `ServiceStore`，数据自动浅合并                    | Wizard 不持有数据——每个 step body 内的 form 独立管理自己的 values                                  |
| **校验**      | Form 自带校验，Next 按钮触发 Form submit → 校验 → 通过才前进         | `onStepCommit` 事件钩子——用户在事件中自行校验（可调 form 的 `validate` capability）                |
| **API**       | 三层 API：wizard `initApi`/`api`、step `initApi`/`api`、action `api` | 无 wizard 级 API。step 的数据加载/提交由 step body 内的 form 自行管理                              |
| **导航**      | `isJumpable`（默认只能回退到已访问的 step）+ `goto-step` action      | `linear` + `allowStepJump` + `computeCanGoTo` 高水位线                                             |
| **状态分离**  | 单一 `WizardState`（currentStep + completeStep + rawSteps 混在一起） | 双层 state：`interaction`（step 切换）+ `lifecycle`（commit 状态），有 closure-gate 测试保证不混合 |

## 2. 功能差距清单

### 2.1 Flux 已有且优于 AMIS 的设计

| 能力                                 | 说明                                                                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **State 分层**                       | Flux 的 `interaction` / `lifecycle` 双层 state 避免 step 切换和 commit 状态互相污染；AMIS 是混合的                            |
| **`statusPath` 发布**                | Flux 通过 `statusPath` 发布结构化 `WizardStatusSummary`；AMIS 需要通过事件 + store data 间接读取                              |
| **Dead-field honesty gate**          | Flux 有测试确保声明的 schema 字段都有实现（已移除了 `valueOwnership`/`optional` 等死字段）；AMIS 有 `bulkSubmit` 等多个死字段 |
| **`mountOnEnter` / `unmountOnExit`** | Flux 实现了 keep-mounted 策略 + `hidden` 隐藏；AMIS 在 step 切换时直接 remount form                                           |

### 2.2 AMIS 有、Flux 缺失——需实现

| #   | AMIS 能力                         | AMIS schema 字段                                                                    | Flux 现状                                 | Flux 实现方案                                                               |
| --- | --------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| G1  | **垂直模式 step bar**             | `mode: 'vertical'`                                                                  | 声明但 renderer 无分支，总是水平渲染      | renderer 根据 `mode` 切换 `flex-row` / `flex-col` 布局                      |
| G2  | **Step description 渲染**         | `step.description`                                                                  | 声明但未渲染                              | step nav 项下方显示 description 文本                                        |
| G3  | **按钮标签自定义**                | `actionFinishLabel` / `actionNextLabel` / `actionPrevLabel` / `actionNextSaveLabel` | 声明但 renderer 用 i18n key 忽略这些 prop | 优先使用 prop 值，fallback 到 i18n                                          |
| G4  | **Step status 视觉指示**          | Steps 组件的 `wait`/`process`/`finish`/`error` 四态 + 图标                          | 仅 active/inactive 二态                   | step nav 项支持 `data-status` 属性 + finish 勾选图标 + error 关闭图标       |
| G5  | **`beforeEnter` / `beforeLeave`** | step 级                                                                             | 声明但未调用                              | 用 Flux action 执行；`beforeEnter` 返回 `{ok:false}` 阻止进入               |
| G6  | **组件句柄**                      | `goto-step` action / `next` / `prev` / `submit`                                     | 无组件句柄注册                            | `useComponentHandle` 注册 `next`/`prev`/`goToStep`/`commitStep` capability  |
| G7  | **Step 级 `loadAction`**          | `step.initApi` / `step.initFetch`                                                   | 无                                        | step schema 加 `loadAction`，进入 step 时执行（Flux-native 替代 `initApi`） |
| G8  | **Wizard 级 `loadAction`**        | `wizard.initApi`                                                                    | 无                                        | wizard schema 加 `loadAction`，mount 时执行                                 |
| G9  | **Wizard 级 `submitAction`**      | `wizard.api`（最终提交）                                                            | 无（用户在 `onComplete` 中自行写 action） | `onComplete` 已可覆盖；考虑加 `submitAction` 作为快捷方式                   |
| G10 | **Step `api` 响应驱动跳转**       | step `api` 返回 `step` 字段跳到指定 step                                            | 无                                        | `onStepCommit` 返回 `{ok:true, step:N}` 可驱动跳转                          |

### 2.3 AMIS 有、Flux 有意不做（架构约束）

| AMIS 能力                          | 不做的原因                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| **共享 ServiceStore**              | Flux 的数据归属原则——form 管自己的 values，wizard 不应成为 data owner          |
| **`api` / `initApi` / `asyncApi`** | Flux 用 `loadAction` / `submitAction`（reaction 模式），不用 AMIS 的 api 对象  |
| **`isolateScope`**                 | Flux 有 scope 层级，不需要显式隔离标志                                         |
| **`bulkSubmit`**                   | AMIS 自己也是死字段                                                            |
| **`redirect` / `reload`**          | Flux 的 action 系统已有 `navigate` / `component:refresh`，不需要 wizard 级别名 |
| **`wrapWithPanel`**                | Flux 不复制 AMIS 的 Panel 包装；样式由 schema 的 className 控制                |
| **Form remount on step change**    | Flux 用 `mountOnEnter`/`unmountOnExit` 精确控制，不粗暴 remount                |

## 3. 实现优先级

### P0（核心 UI — 直接影响用户体验）

- **G1**: `mode: 'vertical'` 布局实现
- **G2**: step description 渲染
- **G3**: 按钮标签 prop 生效
- **G4**: step status 四态视觉

### P1（功能完整性 — 影响 CRUD/表单工作流）

- **G6**: 组件句柄（`next`/`prev`/`goToStep`/`commitStep`）
- **G5**: `beforeEnter`/`beforeLeave` step 生命周期
- **G8**: wizard 级 `loadAction`

### P2（增强体验）

- **G7**: step 级 `loadAction`
- **G9**: wizard 级 `submitAction`
- **G10**: commit 响应驱动 step 跳转

## 4. Flux 架构约束检查清单

每个改进必须满足：

- [ ] 不在 wizard 中持有 form data（数据归属在 form）
- [ ] 用 `loadAction`/`submitAction` 而非 `api`/`initApi`
- [ ] 用 Flux action scope 执行事件（`props.events.*`）
- [ ] 用 `@nop-chaos/ui` 组件（Button, Badge 等），不用 raw HTML
- [ ] 用 `data-*` 属性 + marker class，不用 BEM
- [ ] 用 `statusPath` 发布状态摘要，不暴露内部信号
- [ ] Dead-field honesty：声明的 schema 字段必须有实现 + 测试
- [ ] 双层 state 分离不被打破（interaction / lifecycle）
