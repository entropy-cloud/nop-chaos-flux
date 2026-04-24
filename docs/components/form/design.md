# Form 组件设计

## 1. 组件定位

- `form` 是表单容器 renderer，用来创建 `FormRuntime`、收集字段验证并组织提交与重置语义。
- 它是表单字段的作用域边界，不是普通容器的视觉别名。

## 2. 与 AMIS 或既有产品的能力对照

- 目标契约中，`form` 不只承载 `body` / `actions` / `data`，还应拥有语义生命周期入口与状态读面。
- 提交、验证失败、提交成功/失败 follow-up 都归 `form` 节点所有；触发器只负责调用 `component:submit`。

## 3. Flux 中的 renderer/type 定义

- `type: 'form'`
- `category: 'form'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 regions: `body`、`actions`
- 当前 runtime policy: `scopePolicy: 'form'`、`componentRegistryPolicy: 'new'`

## 4. schema 设计

- 目标导出字段为 `body`、`actions`、`data`、`statusPath`、`initAction`、`submitAction`、`onSubmitSuccess`、`onSubmitError`、`onValidateError`。
- `statusPath` 用于把当前 form 的只读语义状态摘要发布到外层 scope。
- 提交逻辑继续以 action/runtime 为主，不直接把请求逻辑塞进 renderer JSX。
- 命名上不应把 `initAction`、`submitAction` 机械改为 `onInit`、`onSubmit`。它们表示 form owner 的主生命周期入口；`onSubmitSuccess`、`onSubmitError`、`onValidateError` 才是 follow-up hook 风格的结果分支入口。

## 5. 字段分类

- `body`、`actions`: `region`
- `data`: `value`
- `statusPath`: `value`
- `initAction`、`submitAction`、`onSubmitSuccess`、`onSubmitError`、`onValidateError`: `event`

## 6. regions 与 slot 约定

- `body` 承接字段区域。
- `actions` 承接提交、重置、辅助按钮等动作区。

## 7. 运行期状态归属

- 表单值、校验状态、访问状态、提交状态和数组操作统一归 `FormRuntime`。
- 字段 renderer 不应自行再维护第二套验证图。
- form subtree 内的表达式通过只读 `$form` 读取当前 form 语义状态，例如 `${$form.submitting}`。
- form subtree 外若需要读取同一状态，应通过 `statusPath` 读取只读 summary DTO，而不是通过 `id` / `name` 做隐式查找。
- `$form` 和 `statusPath` 都不暴露底层 store 或可调用方法。

## 8. 事件、动作与组件句柄能力

- `form` 应长期支持 `component:submit`、`component:reset`、`component:validate` 一类句柄能力。
- `component:setValue`、`component:setValues` 也属于合理的 form instance capability。
- 当前动作和事件语义应以 `FormRuntime` 暴露的 API 为准。

## 9. 数据源、表达式、导入能力接入点

- 初始值通过 `data` 注入。
- 表单内字段表达式读取 form scope。
- 表单内元状态表达式读取 `$form`，不读取 `$store`。
- 异步校验和提交请求应复用统一 API/DataSource 契约。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-form` marker。
- 字段布局、actions 对齐和分组视觉应遵循 field frame 与 styling system，而不是让 `form` 固定一种页面布局。

## 11. 实现拆分建议

- renderer 只负责 form shell 和 regions。
- runtime、validation、field chrome 和数组操作都应保持独立模块。

## 12. 风险、取舍与后续阶段

- 需要避免把 React 表单库生命周期重新耦合回 runtime。
- `submitApi` 与 `data-source` 的边界需要后续文档统一，不宜各组件各说各话。
