# NOP Chaos Flux 架构演变史：从 AMIS 重写到现代低代码运行时

> 本文基于 `docs/logs/2026/` 下 37 天的开发日志（2026-03-20 至 2026-04-25），梳理整个框架从零到成型过程中的架构决策、模块拆分、性能优化和平台化演进。每个阶段都附有关键代码路径和文档链接，便于溯源。

---

## 目录

1. [序章：修复遗产 Bug 与调试器诞生](#1-序章修复遗产-bug-与调试器诞生)
2. [第一阶段：核心概念确立与包结构搭建](#2-第一阶段核心概念确立与包结构搭建)
3. [第二阶段：Flow Designer 从概念验证到生产级](#3-第二阶段flow-designer-从概念验证到生产级)
4. [第三阶段：重命名、样式系统与组件迁移](#4-第三阶段重命名样式系统与组件迁移)
5. [第四阶段：复杂渲染器与设计器生态](#5-第四阶段复杂渲染器与设计器生态)
6. [第五阶段：代码审计与质量收敛](#6-第五阶段代码审计与质量收敛)
7. [第六阶段：运行时架构收敛与性能优化](#7-第六阶段运行时架构收敛与性能优化)
8. [第七阶段：前端编程模型定型](#8-第七阶段前端编程模型定型)
9. [第八阶段：模板实例化与节点身份体系](#9-第八阶段模板实例化与节点身份体系)
10. [第九阶段：编译器独立与包边界硬化](#10-第九阶段编译器独立与包边界硬化)
11. [架构演变的关键原则](#11-架构演变的关键原则)
12. [附录：时间线总览](#12-附录时间线总览)

---

## 1. 序章：修复遗产 Bug 与调试器诞生

**时间**：2026-03-20

框架开发以一系列从 AMIS 遗产中发现的运行时缺陷为起点。这些 Bug 揭示了旧架构中更深层的结构性问题：

- **双状态反同步**（Bug #1）：`ArrayEditor`/`KeyValue` 用 `useState` 管理本地状态，外部的 `reset()`/`setValue()` 无法同步到组件内部。**决策**：复杂字段不能维护并行本地状态，必须从 store 单一读取。
- **并发提交竞争**（Bug #2）：`submit()` 没有并发保护，快速双击会触发两次 API 调用。
- **验证覆盖**（Bug #3）：`validateForm()` 用 `setErrors(fieldErrors)` 替换整个错误映射，抹掉了不在遍历路径上的错误。
- **Checkbox 值类型漂移**（Bug #5）：数组值被 JSON 序列化后回传，导致类型不一致。

同一天，第一个 `@nop-chaos/amis-debugger` 包被创建。调试器从一开始就被设计为 AI 优先的诊断工具，而不仅仅是人类调试面板。它提供了结构化的自动化 API（`queryEvents`、`getLatestError`、`createDiagnosticReport`），并支持通过 `window.__NOP_FLUX_DEBUGGER_API__` 直接访问。

> 关键路径：`packages/nop-debugger/src/`，`docs/analysis/2026-03-21-framework-debugger-design.md`

---

## 2. 第一阶段：核心概念确立与包结构搭建

**时间**：2026-03-22 ~ 2026-03-23

### 2.1 Action Scope 与 Import 语义

`docs/architecture/action-scope-and-imports.md` 确立了 Flux 最核心的概念分层之一：

- **`ScopeRef`** 是纯数据作用域，只承载数据读写。
- **`ActionScope`** 是能力作用域，承载命名空间动作和导入库的能力。
- **`xui:import`** 是声明式导入语义（声明顺序无关、可重复、按规范化键去重），不是执行顺序语义。

分发路径固定为：`built-in → component:<method> → namespaced action`。

### 2.2 Flow Designer 包创建

`@nop-chaos/flow-designer-core` 和 `@nop-chaos/flow-designer-renderers` 两个包在这一阶段创建。Core 包含纯图运行时（`GraphDocument`、`GraphNode`、`GraphEdge`、`DesignerConfig`），Renderers 包含 `designer-page`、`designer-field`、`designer-canvas`、`designer-palette` 渲染器定义。

### 2.3 协作文档体系

Flow Designer 的复杂度催生了一套分层文档体系：

- `docs/architecture/flow-designer/design.md` — 目标架构
- `docs/architecture/flow-designer/runtime-snapshot.md` — 当前实现快照
- `docs/architecture/flow-designer/collaboration.md` — 运行时协作边界
- `docs/architecture/flow-designer/canvas-adapters.md` — 画布适配器边界

**关键决策**：将文档分为"目标态"和"快照态"，避免目标架构与当前实现的混淆。

> 关键路径：`packages/flux-runtime/src/action-runtime.ts`，`packages/flow-designer-core/src/core.ts`，`docs/architecture/action-scope-and-imports.md`

---

## 3. 第二阶段：Flow Designer 从概念验证到生产级

**时间**：2026-03-24 ~ 2026-03-27

### 3.1 画布桥接模式

引入了 `DesignerCardCanvasBridge` 合约，将画布交互（选择、删除、移动、连线、重连、视口同步）抽象为桥接回调，使卡牌画布和 XYFlow 画布共享同一套命令适配器。

```
Renderer UI Events → Bridge Callbacks → Command Adapter → Core Mutations
```

**关键决策**：画布渲染替换不需要重新引入直接的图变更路径。所有变更都通过共享命令适配器。

### 3.2 命令适配器

`designer-command-adapter.ts` 引入了目标侧命令规范化层，提供统一的 `ok`/`snapshot`/`data`/`error`/`reason` 结果形态。Provider 和画布桥接都通过这个表面分派命令，避免碎片化的语义拒绝逻辑。

### 3.3 Schema 驱动的设计器

Flow Designer 完成了从硬编码 React 组件到 JSON 配置驱动的迁移。节点/边渲染通过 `body: SchemaInput` 字段定义，支持用 `flex`、`container`、`tpl`、`icon` 等 AMIS schema 组合出复杂的节点外观。`classAliases` 和 `themeStyles` 实现了主题可定制性。

### 3.4 生产级视觉对齐

完成了与 `flow-editor-static.html` 原型的视觉对齐，统一了节点两行语义、选中态、调色板图标芯片、快速操作按钮、边线/标签 token、minimap 锚点位置等。

> 关键路径：`packages/flow-designer-renderers/src/canvas-bridge.tsx`，`packages/flow-designer-renderers/src/designer-command-adapter.ts`，`apps/playground/src/schemas/workflow-designer-schema.json`

---

## 4. 第三阶段：重命名、样式系统与组件迁移

**时间**：2026-03-25 ~ 2026-03-29

### 4.1 AMIS → Flux 重命名

全面将包引用和文档从 AMIS 命名空间迁移到 Flux 命名空间：

- `amis-schema` → `flux-core`
- `amis-runtime` → `flux-runtime`
- `amis-react` → `flux-react`
- `amis-debugger` → `nop-debugger`
- Window 全局变量从 `__NOP_AMIS_*` 更名为 `__NOP_FLUX_*`

### 4.2 flux-core 模块化拆分

`packages/flux-core/src/index.ts`（1183 行）被拆分为模块化结构：

- `types.ts`（687 行）— 所有类型定义
- `validation-model.ts`（174 行）— 验证模型函数
- `utils/object.ts` — 对象工具
- `utils/path.ts` — 路径工具
- `utils/schema.ts` — Schema 工具
- `constants.ts` — 常量

### 4.3 样式系统确立

`docs/architecture/styling-system.md` 确立了 TailwindCSS 优先的样式方案：

- **语义属性**（`direction`、`gap`、`align`）作为 Tailwind 类的语法糖
- **`classAliases`** 机制实现可复用的 Tailwind 类定义，支持嵌套别名展开和作用域继承
- **布局渲染器只发射标记类**（`nop-container`、`nop-flex`），标记类不携带任何视觉样式
- **间距通过 `stack-*`/`hstack-*` 别名在 schema 中显式声明**

### 4.4 shadcn/ui 迁移

创建 `@nop-chaos/ui` 包，基于 shadcn/ui 组件库（radix-ui + class-variance-authority + tailwind-merge + lucide-react）：

- Button、Input 为首批迁移组件
- 逐步覆盖 Textarea、Checkbox、Switch、RadioGroup、Select、Dialog、Tabs、Table、Card 等全系列组件
- 所有渲染器迁移到 `@nop-chaos/ui` 组件，消除原生 HTML 元素使用

### 4.5 RendererComponentProps 合约

确立了所有渲染器必须遵循的 `RendererComponentProps` 模式：

| 数据源 | 提供内容 | 用途 |
|--------|---------|------|
| `props.props` | 编译后的运行时值 | Schema 驱动的值 |
| `props.meta` | 编译后的元数据 | 控制状态 |
| `props.regions` | 预编译的子渲染句柄 | 渲染子片段 |
| `props.events` | 运行时事件处理器 | 事件绑定 |
| `props.helpers` | 稳定的运行时辅助 | dispatch、evaluate |

### 4.6 FieldFrame 与渲染器包装合约

`FieldFrame` 组件被引入 `flux-react` 层，统一处理表单标签/错误/提示的包装。`RendererDefinition.wrap` 标记让 `NodeRenderer` 自动为需要字段包装的渲染器添加标签和错误展示。

> 关键路径：`packages/ui/src/`，`docs/architecture/styling-system.md`，`packages/flux-react/src/field-frame.tsx`

---

## 5. 第四阶段：复杂渲染器与设计器生态

**时间**：2026-03-30 ~ 2026-03-31

### 5.1 Code Editor 包

`@nop-chaos/flux-code-editor` 基于 CodeMirror 6 创建，统一了表达式编辑器和 SQL 编辑器。特性包括：8 种语言支持、表达式/SQL 补全、表达式校验、友好名标记、模板模式、全屏切换、明暗主题。

### 5.2 Condition Builder

完整的 `condition-builder` 渲染器在 `flux-renderers-form` 中实现，支持嵌入式/选择器模式、AND/OR/NOT 逻辑、字段搜索、分组、唯一字段、嵌套分组、自定义操作符。

### 5.3 Word Editor 包

`@nop-chaos/word-editor-core`（零 React 依赖的框架无关桥接层 + Store）和 `@nop-chaos/word-editor-renderers`（EditorCanvas、RibbonToolbar、FontControls、WordEditorPage）创建。集成 `@hufe921/canvas-editor` 作为画布渲染引擎，模板表达式存储为超链接。

### 5.4 Report Designer 迁移

从 `nop-chaos-next` 迁移四个包：

- `@nop-chaos/spreadsheet-core` / `spreadsheet-renderers`
- `@nop-chaos/report-designer-core` / `report-designer-renderers`

### 5.5 架构审计

对核心包（flux-core、flux-runtime、flux-react、flux-formula、3 个渲染器包）进行了全面审计，分析了约 32,000 行非测试源代码。发现：flux-core 的设计是正确的（它是一个基础包，包含共享纯工具，不是纯类型包），form-runtime 已经分解为 10 个子模块，依赖流向干净。

> 关键路径：`packages/flux-code-editor/src/`，`packages/word-editor-core/src/`，`packages/spreadsheet-renderers/src/`

---

## 6. 第五阶段：代码审计与质量收敛

**时间**：2026-04-01 ~ 2026-04-03

### 6.1 代码审计修复计划（Plan #25）

执行了 14 项修复，涵盖 8 个包：

- **构建卫生**：移除陈旧的 tsconfig include 路径，创建 `scripts/verify-no-src-artifacts.mjs` CI 守卫
- **逻辑正确性**：修复 Flow Designer `allowMultiEdge` 逻辑错误，统一 `executeApiObject()` 请求管线
- **防御性修复**：`NodeRenderer` 包裹 `React.memo`，`evaluateArray`/`evaluateObject` 添加边界保护
- **性能优化**：API 缓存 LRU 淘汰，Proxy 缓存 WeakMap

### 6.2 全面代码整改（Plan #27）

执行了全面的代码整改工作，包括：

- 渲染阶段保持无副作用
- 表单路径状态 `relatedPaths` 修复
- 表单字段控制器共享 Hook 提取
- 动态渲染器 API 载荷验证
- 根组件注册表从模块级可变状态改为实例级状态
- `ScopeRef.merge()` 方法添加变更检测

### 6.3 数据源重设计

`DataSourceSchema` 移除了 `body` 区域，改为向当前作用域注入数据。如果设置 `dataPath`，将响应写入 `scope[dataPath]`；否则将响应作为普通对象合并到当前作用域。

### 6.4 依赖与 Lint 升级

工作区升级到 `eslint-plugin-react-hooks` `recommended-latest` 严格规则集，完成了 Lucide React 补丁修复，清理了所有 `src/` 目录中的构建产物泄漏。

> 关键路径：`packages/flux-runtime/src/request-runtime.ts`，`packages/flux-renderers-data/src/data-source-renderer.tsx`，`scripts/verify-no-src-artifacts.mjs`

---

## 7. 第六阶段：运行时架构收敛与性能优化

**时间**：2026-04-04 ~ 2026-04-05

### 7.1 Formily 对比分析与性能方向

完成了与 10 个低代码平台（AMIS、Formily、LowCode Engine、RJSF、Appsmith 等）的详细对比。核心发现：

- **响应性模型是最关键短板**：当前 Pull Model 在父 scope 变化时触发 O(节点数 × 表达式数) 求值，而 Formily 的 Push Model 是 O(依赖者数)
- Flux 的 AOT 编译、正交作用域设计、字段元数据驱动编译是独特的架构优势
- **决策**：保持 Flux 的编译优先通用平台基线，只允许表单子域本地的薄能力扩展

### 7.2 依赖追踪与变更路径通知

实现了 ScopeChange 依赖追踪基线：

- `ScopeStore` 携带 `ScopeChange`（变更路径集合）
- 公式叶求值在每次成功运行后刷新依赖集
- `NodeRenderer` 订阅通过依赖路径交集门控元数据/属性重计算
- 后续演进为**词法根绑定**模型：依赖追踪收敛到 `user`、`row`、`record` 这样的词法根

### 7.3 源注册表与反应运行时

- **源注册表**（`source-registry.ts`）：`RendererRuntime` 暴露 `registerDataSource(...)`，源按 `ScopeRef.id` 分桶，`data-source` 渲染器只负责注册/释放生命周期
- **反应运行时**（`reaction-runtime.ts`）：`ReactionSchema` 支持 `watch`、`when`、`immediate`、`debounce`、`once`，反应执行异步调度在写入稳定后
- **自级联保护**：排队反应触发器按待处理回合合并变更路径，自级联反应在有限次数后硬停止

### 7.4 动作控制流扩展

动作系统增加了 `when`/`parallel`/`timeout`/`retry`：

- `when`：前置条件检查，假时返回结构化跳过结果
- `parallel`：`Promise.all` 并行执行
- `timeout`：结构化超时结果，可取消的请求类动作参与真实取消
- `retry`：固定次数/固定延迟的重试策略

### 7.5 复杂渲染器状态所有权

Table 渲染器引入了三级状态所有权模型：

- `local`（默认）— 渲染器内部状态
- `controlled` — 外部 schema/runtime 驱动
- `scope` — 直接从当前渲染作用域读写响应式状态

### 7.6 前端编程模型文档

`docs/architecture/frontend-programming-model.md` 确立为顶层架构基线文档，定义了 Flux 的七个核心原语（Value、Action、Scope、Host Projection、Reaction、Resource、Component Handle）及其边界。

> 关键路径：`packages/flux-runtime/src/source-registry.ts`，`packages/flux-runtime/src/reaction-runtime.ts`，`packages/flux-runtime/src/action-runtime.ts`，`docs/architecture/frontend-programming-model.md`

---

## 8. 第七阶段：前端编程模型定型

**时间**：2026-04-06 ~ 2026-04-09

### 8.1 编程模型演进讨论

经历了多轮深度讨论（8 轮讨论记录在 `docs/discussions/02-programming-model-optimality-critique.md`），最终确立了：

- 保持七个原语的闭合，不引入替代原语系统
- `data-source` 理解为"命名动态值注册到作用域"
- `name` 作为唯一的规范化发布路径，`mergeToScope: true` 是唯一的特殊发布模式
- 动作语义（`when` + `then` + `onError` + `parallel`）在执行时已经形成 DAG
- 区分"渐进式创作表面"与"DAG 执行语义"

### 8.2 Action/API 收敛建构

- 声明式请求从 `ApiObject` 重命名向 `ApiSchema`
- `type: 'source'` 作为基于动作的匿名值消费形式
- `data-source` 作为 `source` 的命名/调度扩展
- 内置动作命名标准化为 camelCase（`openDialog`、`showToast`）

### 8.3 验证体系深度设计

完成了统一的验证设计（`docs/analysis/2026-04-11-flux-validation-unified-design.md`），涵盖：

- `modelGeneration` 计数器追踪验证模型替换
- 异步运行身份五元组（`ownerId`、`modelGeneration`、`path`、`ruleId`、`runGeneration`）
- 两种生命周期路径：所有者兼容模型刷新 vs 所有者边界变更
- 状态保留规则：始终重置具现化缓存和异步运行

### 8.4 表单联动与隐藏字段策略

- `HiddenFieldPolicy` 合约确立：`clearValueWhenHidden`、`validatePath` 跳过、`notifyFieldHidden`
- 约束性声明式联动（`xui:linkage`）编译到现有节点元数据/属性和验证流中
- 字段展示快照（`effectiveDisabled`/`effectiveRequired`）

### 8.5 Owner Status 模型

将 loading/pending/status 统一为所有者特定的只读摘要：

- 表单内部表达式标准化为 `$form` 绑定
- 跨表单观察者标准化为显式 `statusPath`
- 表面所有者（dialog/drawer）通过 `statusPath` 暴露外部只读状态

> 关键路径：`docs/architecture/frontend-programming-model.md`，`docs/architecture/api-data-source.md`，`docs/architecture/action-scope-and-imports.md`

---

## 9. 第八阶段：模板实例化与节点身份体系

**时间**：2026-04-07 ~ 2026-04-08

### 9.1 模板实例化架构

`docs/architecture/template-instantiation-and-node-identity.md` 确立了"编译一次模板，运行时多次实例化"的架构：

- `cid` 严格为挂载时活跃节点桥接 ID
- 结构解析属于运行时拥有的解析器
- 规范运行时地址为 `NodeLocator = runtimeId + templateGraphId + templateNodeId + instancePath`

### 9.2 重复实例身份传播

表格行子渲染（cell、buttons、expanded）传入 `[{ repeatedTemplateId: 'table.row', instanceKey: rowKey }]`，行子级调试定位器数据现在可以看到真实的 `instancePath`。

### 9.3 NodeRenderer 兼容性迁移

通过 Plan 40 分阶段将 `CompiledSchemaNode` 依赖迁移到 `NodeInstance`/`templateNode`：

- `NodeFrameWrapper` 消费 `templateNode` + 显式渲染器 `wrap` 元数据
- `RendererComponentProps` 和 `useCurrentNodeMeta()` 镜像 `templateNode` + 可选 `locator`
- 片段/对话框所有权缝迁移到活跃节点优先回退

### 9.4 编译器集成诊断

Plan 41 实现了编译器集成的 Schema 诊断：

- `flux-core` 暴露正式的 Schema 诊断合约
- `CompileSchemaOptions` 携带诊断/验证策略
- `RendererDefinition` 可贡献 `schemaValidator`
- 表单和表格渲染器贡献了渲染器拥有的 schema 验证器检查

### 9.5 BEM 迁移完成

所有内部 `__` 标记清理完成，字段框架、代码编辑器、电子表格/报表设计器、工作台区域迁移到 `data-slot`/`data-*`。

> 关键路径：`docs/architecture/template-instantiation-and-node-identity.md`，`packages/flux-react/src/node-instance.ts`，`packages/flux-runtime/src/node-resolver.ts`

---

## 10. 第九阶段：编译器独立与包边界硬化

**时间**：2026-04-21 ~ 2026-04-25

### 10.1 编译器包提取

从 `flux-runtime` 中提取出 `@nop-chaos/flux-compiler` 包：

- Schema 编译/验证
- 动作预编译
- 编译符号表
- 诊断与验证降低
- `flux-runtime` 保留为兼容性重导出层

### 10.2 Base Tree → Template 重命名

编程模型的第一个原语从 `Base Tree` 重命名为 `Template`，强调其作为编译时不可变程序定义的本质。`SchemaCompiler` 产出不可变 `TemplateNode` 图，运行时只消费和实例化。

### 10.3 DingFlow 树模式

引入了结构化进程树合约：节点可以拥有分支组，分支组隐式合并，延续流进入所有者节点的下游 `child`。树模式下禁用了自由连接、自由重连和手动节点拖动。

### 10.4 CRUD 组件与共享上下文菜单

- CRUD 渲染器实现，支持选择摘要和刷新
- 电子表格共享上下文菜单基线（复制、剪切、粘贴、清除、插入/删除行列）
- 填充柄双击使用相邻数据区域自动向下填充

> 关键路径：`packages/flux-compiler/src/`，`docs/architecture/flux-runtime-module-boundaries.md`

---

## 11. 架构演变的关键原则

纵观 37 天的演变历史，以下原则反复出现在关键决策中：

### 11.1 编译优先

Flux 始终在编译阶段尽可能多地做工作：值分类、表达式编译、动作预编译、Schema 诊断。运行时只执行编译产物，不做额外判断。这一原则从 `CompiledValueNode` 的五种节点类型贯穿到 `TemplateNode`/`NodeInstance` 分离。

### 11.2 数据与能力分离

`ScopeRef` 纯承载数据，`ActionScope` 纯承载能力，两者正交分离。这一决策避免了将 `ScopeRef` 变成通用方法注册表，保持了作用域模型的简洁性。

### 11.3 渲染器合约一致性

所有渲染器遵循统一的 `RendererComponentProps` 模式，数据来自 `props.props`/`props.meta`/`props.regions`/`props.events`/`props.helpers`，不直接访问 store。这确保了渲染器的可替换性和可测试性。

### 11.4 标记类不携带样式

布局渲染器只发射语义标记类（`nop-container`、`nop-flex`），标记类不携带任何视觉样式。所有间距/方向/填充通过 schema 中的 `classAliases` 或语义属性显式声明。这避免了隐式布局和样式漂移。

### 11.5 域桥接模式

复杂设计器（Flow Designer、Report Designer、Spreadsheet）通过域桥接（DomainBridge）模式集成：核心包提供纯逻辑运行时，渲染器包提供 React 集成，画布通过桥接回调解耦。这使得画布实现可以替换而不影响核心逻辑。

### 11.6 文档即架构

从 Flow Designer 的分层文档体系到前端编程模型的多轮讨论，Flux 项目始终将文档作为架构决策的载体。目标态与快照态分离、讨论记录与规范性文档分离，确保了架构知识的可持续维护。

### 11.7 AI 优先的可观测性

调试器从一开始就被设计为 AI 优先：结构化自动化 API、诊断报告、会话导出、交互追踪。后续的依赖追踪变更路径、源/反应注册表快照、节点定位器身份，都遵循了"机器可读优于人眼可读"的可观测性设计。

---

## 12. 附录：时间线总览

| 阶段 | 时间 | 关键事件 |
|------|------|---------|
| 序章 | 03-20 | Bug #1~#5 修复，调试器诞生 |
| 第一阶段 | 03-22 ~ 03-23 | ActionScope/Import 语义确立，Flow Designer 包创建 |
| 第二阶段 | 03-24 ~ 03-27 | 画布桥接、命令适配器、Schema 驱动设计器、生产级视觉对齐 |
| 第三阶段 | 03-25 ~ 03-29 | AMIS→Flux 重命名，flux-core 拆分，样式系统，shadcn/ui 迁移，FieldFrame |
| 第四阶段 | 03-30 ~ 03-31 | Code Editor、Condition Builder、Word Editor、Report Designer 迁移、架构审计 |
| 第五阶段 | 04-01 ~ 04-03 | 代码审计修复、全面整改、数据源重设计、依赖/Lint 升级 |
| 第六阶段 | 04-04 ~ 04-05 | Formily 对比、依赖追踪、源注册表、反应运行时、动作控制流、编程模型文档 |
| 第七阶段 | 04-06 ~ 04-09 | 编程模型定型、Action/API 收敛、验证设计、表单联动、Owner Status |
| 第八阶段 | 04-07 ~ 04-08 | 模板实例化、重复实例身份、NodeRenderer 迁移、编译器诊断、BEM 清理 |
| 第九阶段 | 04-21 ~ 04-25 | 编译器包提取、Base Tree→Template、DingFlow 树模式、CRUD、共享上下文菜单 |

---

## 结语

NOP Chaos Flux 的架构演变展示了一个现代低代码渲染框架从重写到成型的完整过程。它的核心动力不是更换技术栈，而是解决 AMIS 在 Schema 层（平行字段膨胀）和运行时层（MST 紧耦合）的结构性限制。

37 天内，框架经历了从 Bug 修复到概念确立、从概念验证到生产级、从单体到模块化、从隐式到显式、从 Pull Model 到依赖追踪、从编译运行混合到编译/运行分离的六次重大架构跃迁。每一次跃迁都伴随着明确的文档记录和回归测试覆盖，确保了架构决策的可追溯性。

最终形成的架构——编译优先 + 正交作用域 + 模板实例化 + 域桥接 + AI 优先可观测——为低代码渲染框架提供了一个清晰的现代参考。
