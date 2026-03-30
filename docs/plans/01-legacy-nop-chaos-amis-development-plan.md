# NOP Chaos AMIS Renderer Development Plan

> **Implementation Status: SUPERSEDED — Replaced by `docs/plans/02-development-plan.md`.**
> All phases P0–P6 described in this plan have been completed. See Plan 02 for the current status of P7 (convergence/hardening).
>
> This document is preserved as historical context. Active planning continues in Plan 02 and later plans.

> Canonical planning and architecture references now live under `docs/`.
> Start with `docs/index.md`, then prefer `docs/plans/02-development-plan.md`, `docs/architecture/amis-core.md`, and `docs/architecture/renderer-runtime.md`.

## 1. Goal and Delivery Strategy

本计划用于把当前设计文档逐步落地为一个可运行、可测试、可扩展的低代码渲染框架，技术基线固定为：

- `pnpm` workspace
- `React 19`
- `Vite 7`
- `TypeScript`

整体策略不是一次性把所有能力堆上去，而是按“先框架、再核心、后高级能力”的顺序推进：

1. 先搭工作区和包结构
2. 先落表达式编译、schema 编译、runtime 三大核心
3. 先做最小可运行 renderer 集
4. 再做表单、表格、动作、对话框等复杂能力
5. 最后补齐插件、监控、调试、性能优化和工程化发布

这样做的原因是：低代码引擎最大的风险不是功能少，而是底层抽象在前期没有定住，后续每加一个控件都要返工。

## 2. Development Objectives

本阶段目标分为四类：

### 2.1 Functional objectives

- 支持 JSON schema 驱动的页面渲染
- 支持表达式求值和模板插值
- 支持词法作用域数据链
- 支持基础动作系统
- 支持表单、对话框、表格等核心场景
- 支持自定义组件方便地渲染局部 schema

### 2.2 Architecture objectives

- 编译期和运行期职责分离
- 表达式编译器通过 `amis-formula` 注入
- 无表达式时走 static fast path
- 动态结果不变时保持引用稳定
- renderer 内部采用 props + hooks 的混合契约

### 2.3 Engineering objectives

- 基于 `pnpm workspace` 组织 packages 和 playground app
- 全量 TypeScript 类型约束
- Vitest 单测覆盖核心编译和 runtime 行为
- 提供 playground 用于交互调试和 schema 验证

### 2.4 Performance objectives

- 编译结果缓存
- selector 级订阅
- 行/片段作用域延迟创建
- 静态对象零执行成本
- 动态 props 和 region handle 稳定引用

## 3. Reference Files and How They Are Used

以下文件是开发计划的直接参考依据，后续实现时必须持续对齐。

### 3.1 `docs/architecture/amis-core.md`

参考内容：

- 整体能力目标
- PageStore / FormStore 分层思路
- 数据域原型链作用域
- `amis-formula` 表达式方向
- 动作系统、API 对象、对话框、表格、表单验证等能力边界
- 用户管理 CRUD 示例 schema，用作后期联调样板

使用方式：

- 作为“产品级能力清单”和“阶段验收样例”的主参考
- 后续 playground 第一批 demo 直接优先实现其中的 CRUD 示例子集

### 3.2 `docs/architecture/frontend-baseline.md`

参考内容：

- `pnpm` monorepo 组织方式
- `React 19`、`Vite 7`、Zustand、Vitest 等工程基线
- 包职责划分和命名规范
- 路由、测试、store、包命名的约定

使用方式：

- 作为 workspace 和包命名、工程脚本、测试布局的规范参考
- 包结构优先遵守其中的 package extraction 和命名规则

### 3.3 `docs/architecture/renderer-runtime.md`

参考内容：

- `SchemaRenderer` 总体设计
- props vs `useXX` 的边界划分
- region handle 设计
- runtime / scope / render context 的拆分原则
- static fast path 和 identity reuse 的性能原则

使用方式：

- 作为实现时的“核心设计说明书”
- 开发过程中如果某项实现和本文档冲突，优先回到这份设计文档确认是否要改设计

### 3.4 `docs/references/renderer-interfaces.md`

参考内容：

- 当前 renderer 核心接口草案
- expression compiler / schema compiler / runtime / action / region / scope 主要类型边界

使用方式：

- 作为第一阶段代码落地的接口蓝图
- 实现时允许迭代，但要保持变更可追踪，并同步更新设计文档

### 3.5 `docs/references/expression-processor-notes.md`

参考内容：

- 编译一次、多次执行的核心思路
- 结果不变时复用对象引用的缓存语义
- 静态/动态节点递归求值的大致思路

不直接参考的内容：

- `new Function(...)`
- 自定义字符串表达式执行方案

使用方式：

- 只作为“优化语义原型”参考
- 正式实现必须换成 `amis-formula` 注入式编译器

## 4. Recommended Workspace Structure

建议一开始就按 workspace 形式搭好，不要先把所有代码堆到一个 package 里。

```text
apps/
  playground/                交互调试和 demo 验证

packages/
  schema/                    基础 schema 类型和公共常量
  formula/                   amis-formula 适配层与表达式编译
  runtime/                   schema compiler、runtime、scope、action 核心
  react/                     React 上下文、hooks、SchemaRenderer 根组件
  renderers-basic/           page/button/container/text 等基础 renderer
  renderers-form/            form 和输入类 renderer
  renderers-data/            table/service/crud 相关 renderer
  ui-adapter/                对接 shadcn/ui 或未来 UI 系统
  testing/                   测试辅助、mock env、schema fixtures
```

建议 package 命名：

- `@nop-chaos/flux-core`
- `@nop-chaos/flux-formula`
- `@nop-chaos/flux-runtime`
- `@nop-chaos/flux-react`
- `@nop-chaos/flux-renderers-basic`
- `@nop-chaos/flux-renderers-form`
- `@nop-chaos/flux-renderers-data`
- `@nop-chaos/amis-testing`

说明：

- `runtime` 不依赖 React，保持可测试性和纯逻辑边界
- `react` 只负责 React integration，不承载核心编译逻辑
- renderer 包按能力分层，避免单包膨胀
- `playground` 永远先于业务接入，用来验证架构是否正确

## 5. Phase Overview

整个开发拆成 8 个阶段，按依赖顺序推进。

| Phase | 目标 | 核心产物 |
| --- | --- | --- |
| P0 | 工程初始化 | workspace、脚本、基础包、playground |
| P1 | 表达式核心 | `amis-formula` 适配层、ExpressionCompiler |
| P2 | Schema 编译核心 | SchemaCompiler、node model、region 提取 |
| P3 | Runtime 与 React 集成 | runtime、scope、hooks、SchemaRenderer |
| P4 | 基础 renderer 集 | page/container/text/button 等 |
| P5 | 表单与动作系统 | form runtime、input、submit、ajax、dialog |
| P6 | 数据型 renderer | service、table、pagination、row scope |
| P7 | 完善阶段 | 插件、监控、调试、性能、文档、发布 |

## 6. Detailed Phase Plan

## 6.1 P0 - Workspace and Framework Bootstrap

### Goal

先把开发基座搭稳，确保后续代码有明确归属。

### Tasks

1. 初始化 `pnpm-workspace.yaml`
2. 创建 root `package.json`
3. 配置统一 TypeScript 基线：
   - `tsconfig.base.json`
   - 各 package `tsconfig.json`
4. 创建 `apps/playground`，使用 `React 19 + Vite 7`
5. 创建上述 packages 目录和最小入口文件
6. 配置基础脚本：
   - `pnpm dev`
   - `pnpm build`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm lint`
7. 配置 Vitest 基线
8. 配置 ESLint 和必要格式化规则

### Deliverables

- workspace 可安装依赖
- playground 可启动
- 所有 package 可 typecheck
- 测试框架可运行

### Exit criteria

- `pnpm install` 成功
- `pnpm --filter playground dev` 可打开页面
- `pnpm typecheck` 通过
- 至少 1 个 smoke test 通过

### References

- `docs/architecture/frontend-baseline.md`: monorepo、命名、测试脚本、React 19、Vite 7 基线

## 6.2 P1 - Expression Compiler Foundation

### Goal

先把最关键也最容易后期返工的表达式层做好。

### Tasks

1. 在 `packages/formula` 中实现 `FormulaCompiler`
2. 用 `amis-formula` 封装：
   - `hasExpression`
   - `compileExpression`
   - `compileTemplate`
3. 实现 `ExpressionCompiler`：
   - `compileNode`
   - `compileValue`
   - `createState`
   - `evaluateValue`
   - `evaluateWithState`
4. 实现 static fast path：
   - 无表达式返回原始引用
5. 实现 dynamic identity reuse：
   - 结果不变复用上次对象/数组引用
6. 为对象、数组、模板字符串、纯表达式分别补单测
7. 增加 benchmark 风格测试或最小性能验证用例

### Deliverables

- 可独立运行的表达式编译包
- 明确的 stateful evaluation 机制
- 单测覆盖静态和动态语义

### Exit criteria

- static subtree 始终返回原始引用
- 动态 subtree 在值不变时复用旧引用
- 不使用 `new Function(...)`
- 对 `docs/references/expression-processor-notes.md` 中总结的语义有等价测试

### References

- `docs/architecture/renderer-runtime.md`: 表达式注入、static fast path、identity reuse
- `docs/references/renderer-interfaces.md`: 类型契约
- `docs/references/expression-processor-notes.md`: 仅参考缓存语义，不参考执行方式

## 6.3 P2 - Schema Compiler Core

### Goal

把 raw schema 编译成真正可执行的 compiled node tree。

### Tasks

1. 在 `packages/runtime` 中实现 `SchemaCompiler`
2. 实现字段分类规则：
   - `meta`
   - `prop`
   - `region`
   - `ignored`
3. 实现默认 field classification
4. 支持 renderer 自定义 field rules
5. 生成稳定的：
   - `path`
   - `node.id`
   - `region.path`
6. 编译：
   - `meta`
   - `staticProps`
   - `dynamicProps`
   - `regions`
7. 实现 `createRuntimeState()`
8. 处理数组 schema、对象 schema、单节点 schema
9. 为 path/id 稳定性和 region 提取补测试

### Deliverables

- schema -> compiled node tree
- 节点级 runtime state 构造能力
- 可被 runtime 直接消费的 region 模型

### Exit criteria

- 同一 schema 重复编译结果结构一致
- renderer 能正确声明 `body` / `actions` / `columns` 等 region
- `CompiledSchemaNode.flags.isStatic` 行为正确

### References

- `docs/architecture/renderer-runtime.md`: compiled node、region handle、scope policy
- `docs/references/renderer-interfaces.md`: `CompiledSchemaNode`、`SchemaFieldRule`、`SchemaCompileContext`
- `docs/architecture/amis-core.md`: 页面、表单、对话框、表格等 schema 特征字段

## 6.4 P3 - Runtime and React Integration

### Goal

把纯逻辑核心接到 React 上，但仍保持 runtime 和 React 分层。

### Tasks

1. 在 `packages/runtime` 中实现：
   - `RendererRegistry`
   - `RendererRuntime`
   - `ScopeRef`
   - `createChildScope`
   - `resolveNodeMeta`
   - `resolveNodeProps`
2. 在 `packages/react` 中实现：
   - `SchemaRenderer`
   - `RendererRuntimeContext`
   - `RenderScopeContext`
   - `RenderNodeContext`
   - `FormRuntimeContext`
3. 实现 hooks：
   - `useRendererRuntime`
   - `useRenderScope`
   - `useScopeSelector`
   - `useRenderFragment`
   - `useCurrentNodeMeta`
4. 实现 `RenderRegionHandle`
5. 先支持最小递归渲染闭环
6. 增加 React 级别测试

### Deliverables

- 能在 React 中渲染 compiled schema tree
- 自定义组件可通过 `regions.render()` 渲染子片段
- scope selector 可用

### Exit criteria

- playground 中能渲染最小 page -> container -> text 树
- 自定义组件可传 `{ data, scopeKey }` 渲染局部 schema
- 大 context 不引发明显的无关 rerender

### References

- `docs/architecture/renderer-runtime.md`: props/hook 边界、context 拆分、local fragment render
- `docs/references/renderer-interfaces.md`: runtime、hooks、region、scope 接口

## 6.5 P4 - Basic Renderer Set

### Goal

先实现最小可运行页面，不急于表单和数据能力。

### First batch renderers

- `page`
- `container`
- `flex`
- `text`
- `tpl`
- `button`
- `divider`
- `html` 或 `rich-text` 的最小安全版本

### Tasks

1. 建立基础 renderer registry
2. 实现基础布局 renderer
3. 实现简单文本/模板 renderer
4. 实现 `button` 动作入口占位
5. 在 playground 中做基础 schema demo
6. 建立 renderer snapshot/behavior test

### Deliverables

- 一个可手写 schema 的基础页面渲染器
- 可视化验证页面

### Exit criteria

- playground 中能渲染一个纯静态页面
- 支持少量动态文本表达式
- region render 和 custom renderer 流程可工作

### References

- `docs/architecture/amis-core.md`: page/body/button 基础字段
- `docs/architecture/renderer-runtime.md`: 自定义组件如何消费 `regions`

## 6.6 P5 - Form and Action System

### Goal

进入低代码系统的第一个复杂闭环：表单 + 动作 + API。

### Tasks

1. 实现 `PageStore` 和 `FormStore` 最小版本
2. 实现 `FormRuntime`
3. 集成 React Hook Form
4. 设计字段与表单 store 的映射方式
5. 实现动作调度器：
   - `setValue`
   - `ajax`
   - `submitForm`
   - `dialog`
   - `closeDialog`
6. 实现基础 input renderer：
   - `input-text`
   - `input-email`
   - `input-password`
   - `select` 最小版
7. 实现 API 请求封装和 adaptor 处理
8. 接入防抖和 `AbortController`
9. 增加表单场景 demo 和测试

### Deliverables

- 可提交表单
- 可调用 API action
- 可弹出和关闭 dialog

### Exit criteria

- playground 中可完成“新增用户”最小 demo
- 表单内外更新模型可工作
- action chain 可串联执行

### References

- `docs/architecture/amis-core.md`: FormStore、动作系统、API 对象、dialog 模型、表单验证思路
- `docs/architecture/renderer-runtime.md`: form runtime、dispatch、scope 传递策略
- `docs/references/renderer-interfaces.md`: action/runtime/form 接口

## 6.7 P6 - Data Renderers and CRUD Scenario

### Goal

实现数据型 renderer，打通第一个真实 CRUD 页面。

### Tasks

1. 实现 `service` 或 page `initApi` 能力
2. 实现 `table` renderer
3. 实现 `pagination`
4. 实现 `operation` column
5. 实现 row scope 和 row-level region render
6. 视情况接入虚拟滚动：
   - 第一版可先不做复杂虚拟化
   - 第二版接入 `react-window` 或等价方案
7. 用 `docs/examples/user-management-schema.md` 中用户管理示例裁剪出首个 CRUD demo
8. 补 table 和 row scope 性能测试

### Deliverables

- 可搜索、分页、编辑、删除的 CRUD demo
- row scope 和 operation action 可运行

### Exit criteria

- 用户管理 demo 可基本跑通
- `record` / `index` / `dialogId` 等局部上下文传递正确
- 表格数据更新不会导致整页明显无差别重渲染

### References

- `docs/examples/user-management-schema.md`: 完整 CRUD JSON 示例
- `docs/architecture/renderer-runtime.md`: row scope、local fragment render、性能约束

## 6.8 P7 - Plugin, Debugging, Performance, and Release Hardening

### Goal

把系统从“能跑 demo”提升到“可接入业务”的层级。

### Tasks

1. 插件机制：
   - `beforeCompile`
   - `afterCompile`
   - `wrapComponent`
   - `beforeAction`
2. 错误处理：
   - Error Boundary
   - expression/action/api 错误格式化
3. 监控与调试：
   - render timing
   - action timing
   - api hooks
   - debug path labels
4. 性能专项：
   - compiled schema 缓存
   - resolve props 缓存
   - region handle 稳定引用
   - table 虚拟化
5. 文档完善：
   - package README
   - renderer authoring guide
   - custom component guide
6. 发布准备：
   - tsup / vite library mode / rollup 选型
   - 导出边界整理
   - 版本策略

### Deliverables

- 可扩展、可调试、可发布的 renderer framework

### Exit criteria

- 核心 API 有 README
- 至少 1 个自定义 renderer 示例完整文档化
- build、typecheck、test 稳定通过

### References

- `docs/architecture/amis-core.md`: 错误处理、监控、扩展性设计
- `docs/architecture/frontend-baseline.md`: 包职责、测试、发布和命名约束
- `docs/architecture/renderer-runtime.md`: runtime 稳定引用和性能设计

## 7. Suggested Milestone Outputs

建议把阶段交付物定义成可以演示和验收的里程碑，而不是抽象的“完成若干任务”。

### M1 - Framework Skeleton

- workspace 搭好
- playground 能启动
- packages 可互相引用

### M2 - Expression Engine Ready

- `amis-formula` 适配层完成
- static/dynamic 语义测试通过

### M3 - Minimal Renderer Loop

- schema compile -> runtime -> React render 跑通
- 基础 renderer 可展示

### M4 - Form and Dialog Demo

- 可弹窗
- 可输入
- 可提交 action

### M5 - CRUD Demo

- 搜索
- 表格
- 新增/编辑/删除
- 分页

### M6 - Business-ready Alpha

- 插件、监控、文档、测试、性能基线齐备

## 8. Testing Strategy by Stage

### 8.1 Unit tests

重点覆盖：

- expression compile/evaluate
- schema compile
- runtime resolve props/meta
- action dispatcher
- scope creation and selector behavior

### 8.2 React integration tests

重点覆盖：

- region render
- custom renderer nested rendering
- form control with scope/action integration
- dialog open/close lifecycle

### 8.3 Demo verification

playground 中至少长期保留以下 demo：

- static page demo
- dynamic text demo
- custom renderer local fragment demo
- form submit demo
- table row operation demo
- CRUD demo

### 8.4 Performance regression tests

重点关注：

- static object fast path
- dynamic identity reuse
- row scope creation count
- large table rerender behavior

## 9. Development Rules During Implementation

后续开发过程中建议遵守以下规则：

1. 先写接口和测试，再写实现
2. `runtime` 层禁止直接依赖 React
3. 表达式层必须通过 `amis-formula` 注入，不允许回退到 `new Function`
4. static fast path 和 identity reuse 必须有测试，不接受“靠约定”
5. 每增加一个复杂 renderer，必须先写 playground demo
6. 自定义 renderer 体验要持续检查，不能让 authoring API 越做越重
7. 如果实现与文档冲突，先更新设计再改代码，不要偷偷偏离

## 10. Immediate Next Actions

建议按以下顺序开始实际编码：

1. 初始化 workspace 和 `apps/playground`
2. 创建 `packages/formula`，先实现 `FormulaCompiler` 空壳和测试基线
3. 创建 `packages/runtime`，接入 `docs/references/renderer-interfaces.md` 中整理后的接口边界
4. 把现有接口草案拆分进对应 package
5. 优先完成 P1，而不是先写一堆 renderer

原因很简单：表达式编译和引用稳定策略一旦定错，后面 schema compiler、runtime、renderer 全都要返工。

## 11. Final Recommendation

这个项目最容易失败的方式，不是实现难度太高，而是过早进入控件堆叠阶段。因此建议开发节奏始终保持：

- 先基础设施
- 再核心编译器
- 再 runtime
- 再 renderer
- 最后高级场景

只要严格按阶段推进，并始终以 `docs/architecture/renderer-runtime.md` 和 `docs/references/renderer-interfaces.md` 作为核心约束，框架会更稳，也更容易在后期扩展到 designer、plugin、schema market 等能力。

