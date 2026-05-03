# NOP Chaos Flux 架构演变史：从 AMIS 重写到现代低代码运行时

> 本文基于 `docs/logs/2026/` 下的开发日志（2026-03-20 至 2026-04-25），梳理整个框架从零到成型过程中的架构决策、模块拆分、性能优化和平台化演进。每个阶段都附有关键代码路径和文档链接，便于溯源。
>
> 本文是历史演化与实现轨迹整理，不是当前规范性 owner doc。凡涉及现行 primitive 边界、动作执行模型、资源发布契约、模板实例化或包边界的判断，应以 `docs/architecture/README.md` 指向的当前 owner docs 和 live code 为准。
>
> 文中出现的“关键路径”文件名按当时仓库状态记录，个别路径今天可能已经迁移、拆分或删除，不应被当作当前入口索引。

---

## 前提：设计思想的源头

Flux 的核心设计思想并不是在实现过程中逐步发现的，而是早在 AMIS 理论研究阶段就已经确立。`nop-entropy/docs/theory/amis/` 下的两篇文章——[为什么说百度AMIS框架是一个优秀的设计](https://zhuanlan.zhihu.com/p/599773955)和[再谈百度AMIS框架和声明式编程](https://zhuanlan.zhihu.com/p/601375558)——为整个项目奠定了理论基础：

- **Env 环境抽象**：AMIS 的 `env` 对象将所有 I/O 操作虚拟化，使得 `output = AmisPage(Input)` 成为可能。Flux 的 `RendererEnv` 正是这一思想的现代化实现。
- **Api 与值/函数对偶**：Api 对象是对远程异步调用的 Ref 封装，本质上是 `computed` 的异步升级版。Flux 的 Resource（`data-source`）原语直接继承了这一思想。
- **数据链 = 词法作用域**：AMIS 的数据链本质上是 DSL 层面的词法作用域查找，Flux 的 `ScopeRef` 链式结构是对这一模型的编译期强化。
- **`xui:import` 动作模块化**：Nop 平台为 AMIS 引入的 `xui:import` 属性，将外部函数库按词法作用域注入到动作系统中。Flux 的 `xui:imports` + `ActionScope` 是这一机制的完整编译期实现。
- **声明式优先**：从命令式 DOM 操作到响应式数据绑定，再到编译产物执行——每一步都是声明式比例的提升。Flux 的编译优先原则正是这一演化路线的终点。

因此，Flux 的架构演变不是"在设计中发现原则"，而是"将已确立的原则在现代技术栈（React 19、Zustand、TypeScript 6.0）上系统化实现"。演变史记录的是实现路径上的拆分决策、性能瓶颈突破和合约细化，而非设计方向的摇摆。

### 最根本的转变：从运行时解释到编译执行

上述原则回答了"设计什么"，整个演变过程中最根本的实现转变则是"怎么执行"：

**AMIS 本质上是一个 runtime interpreter**——拿到 JSON schema，边读边执行。数据链运行时查、动作运行时分发、验证运行时触发、字段可见性运行时判断。所有设计原则都是在运行时层面运作的。

**Flux 在 DSL 和运行时之间插入了一个编译阶段**，把 AMIS 运行时做的事情逐类前移到编译产物：

| AMIS 运行时行为       | Flux 编译产物                                     |
| --------------------- | ------------------------------------------------- |
| 值类型运行时判断      | `CompiledValueNode` 五种静态节点                  |
| Schema 结构运行时遍历 | `TemplateNode` 不可变图（编译一次，实例化多次）   |
| 动作运行时解析        | `CompiledActionProgram` / `CompiledActionNode` IR |
| 宿主合约运行时接线    | `CapabilityProjectionManifest` 编译期可见、可校验 |
| Schema 问题运行时暴露 | 编译期诊断（未知属性、合约形状校验）              |

这一转变不是一次完成的，而是贯穿整个演变过程的主线：从值编译（03-25）到模板实例化（04-07）到动作预编译（04-20）到编译器包提取（04-21），每一步都是"把运行时判断前移到编译期"的同一条路线上的里程碑。最终的 `flux-compiler` / `flux-action-core` / `flux-runtime` 三层拆分，是这一转变的物理形态：编译器负责产出不可变制品，运行时只消费和实例化。

---

## 目录

1. [第一阶段：核心概念确立与包结构搭建](#1-第一阶段核心概念确立与包结构搭建)
2. [第二阶段：Flow Designer 从概念验证到生产级](#2-第二阶段flow-designer-从概念验证到生产级)
3. [第三阶段：重命名、样式系统与组件迁移](#3-第三阶段重命名样式系统与组件迁移)
4. [第四阶段：复杂渲染器与架构审计](#4-第四阶段复杂渲染器与架构审计)
5. [第五阶段：代码审计与质量收敛](#5-第五阶段代码审计与质量收敛)
6. [第六阶段：运行时架构收敛与性能优化](#6-第六阶段运行时架构收敛与性能优化)
7. [第七阶段：前端编程模型定型与深度设计](#7-第七阶段前端编程模型定型与深度设计)
8. [第八阶段：模板实例化与节点身份体系](#8-第八阶段模板实例化与节点身份体系)
9. [第九阶段：深度审计、性能优化与架构收敛](#9-第九阶段深度审计性能优化与架构收敛)
10. [第十阶段：编译器独立与包边界硬化](#10-第十阶段编译器独立与包边界硬化)
11. [架构演变的关键原则](#11-架构演变的关键原则)
12. [附录：时间线总览](#12-附录时间线总览)

---

## 1. 第一阶段：核心概念确立与包结构搭建

**时间**：2026-03-20 ~ 2026-03-23

03-20 完成了对 Flux 早期运行时的系统性 Bug 分析和首轮修复（双状态反同步、并发提交竞争、验证覆盖等），同日创建了 `@nop-chaos/amis-debugger`（后更名为 `nop-debugger`），从一开始就定位为 AI 优先的结构化诊断工具。

### 1.1 Action Scope 与 Import 语义

`docs/architecture/action-scope-and-imports.md` 确立了 Flux 最核心的概念分层之一：

- **`ScopeRef`** 是纯数据作用域，只承载数据读写。
- **`ActionScope`** 是能力作用域，承载命名空间动作和导入库的能力。
- **`xui:import`** 是声明式导入语义（声明顺序无关、可重复、按规范化键去重），不是执行顺序语义。

分发路径固定为：`built-in → component:<method> → namespaced action`。

### 1.2 Flow Designer 包创建

`@nop-chaos/flow-designer-core` 和 `@nop-chaos/flow-designer-renderers` 两个包在这一阶段创建。Core 包含纯图运行时（`GraphDocument`、`GraphNode`、`GraphEdge`、`DesignerConfig`），Renderers 包含 `designer-page`、`designer-field`、`designer-canvas`、`designer-palette` 渲染器定义。

### 1.3 协作文档体系

Flow Designer 的复杂度催生了一套分层文档体系：

- `docs/architecture/flow-designer/design.md` — 目标架构
- `docs/architecture/flow-designer/runtime-snapshot.md` — 当前实现快照
- `docs/architecture/flow-designer/collaboration.md` — 运行时协作边界
- `docs/architecture/flow-designer/canvas-adapters.md` — 画布适配器边界

**关键决策**：将文档分为"目标态"和"快照态"，避免目标架构与当前实现的混淆。

> 关键路径：`packages/flux-runtime/src/action-runtime.ts`，`packages/flow-designer-core/src/core.ts`，`docs/architecture/action-scope-and-imports.md`

---

## 2. 第二阶段：Flow Designer 从概念验证到生产级

**时间**：2026-03-23 ~ 2026-03-27

### 2.1 画布桥接模式

引入了 `DesignerCardCanvasBridge` 合约，将画布交互（选择、删除、移动、连线、重连、视口同步）抽象为桥接回调，使卡牌画布和 XYFlow 画布共享同一套命令适配器。

```
Renderer UI Events → Bridge Callbacks → Command Adapter → Core Mutations
```

**关键决策**：画布渲染替换不需要重新引入直接的图变更路径。所有变更都通过共享命令适配器。

### 2.2 命令适配器

`designer-command-adapter.ts` 引入了目标侧命令规范化层，提供统一的 `ok`/`snapshot`/`data`/`error`/`reason` 结果形态。Provider 和画布桥接都通过这个表面分派命令，避免碎片化的语义拒绝逻辑。

### 2.3 Schema 驱动的设计器

Flow Designer 完成了从硬编码 React 组件到 JSON 配置驱动的迁移。节点/边渲染通过 `body: SchemaInput` 字段定义，支持用 `flex`、`container`、`tpl`、`icon` 等 AMIS schema 组合出复杂的节点外观。`classAliases` 和 `themeStyles` 实现了主题可定制性。

### 2.4 生产级视觉对齐

完成了与 `flow-editor-static.html` 原型的视觉对齐，统一了节点两行语义、选中态、调色板图标芯片、快速操作按钮、边线/标签 token、minimap 锚点位置等。

> 关键路径：`packages/flow-designer-renderers/src/canvas-bridge.tsx`，`packages/flow-designer-renderers/src/designer-command-adapter.ts`，`apps/playground/src/schemas/workflow-designer-schema.json`

---

## 3. 第三阶段：重命名、样式系统与组件迁移

**时间**：2026-03-25 ~ 2026-03-29

### 3.1 AMIS → Flux 重命名

全面将包引用和文档从 AMIS 命名空间迁移到 Flux 命名空间：

- `amis-schema` → `flux-core`
- `amis-runtime` → `flux-runtime`
- `amis-react` → `flux-react`
- `amis-debugger` → `nop-debugger`
- Window 全局变量从 `__NOP_AMIS_*` 更名为 `__NOP_FLUX_*`

### 3.2 flux-core 模块化拆分

`packages/flux-core/src/index.ts`（1183 行）被拆分为模块化结构：

- `types.ts`（687 行）— 所有类型定义
- `validation-model.ts`（174 行）— 验证模型函数
- `utils/object.ts` — 对象工具
- `utils/path.ts` — 路径工具
- `utils/schema.ts` — Schema 工具
- `constants.ts` — 常量

### 3.3 样式系统确立

`docs/architecture/styling-system.md` 确立了 TailwindCSS 优先的样式方案：

- **语义属性** (`direction`, `gap`, `align`) 作为 Tailwind 类的语法糖
- **`classAliases`** 机制实现可复用的 Tailwind 类定义，支持嵌套别名展开和作用域继承
- **布局渲染器只发射标记类**（`nop-container`、`nop-flex`），标记类不携带任何视觉样式
- **间距通过 `stack-*`/`hstack-*` 别名在 schema 中显式声明**

### 3.4 shadcn/ui 迁移

创建 `@nop-chaos/ui` 包，基于 shadcn/ui 组件库模式（class-variance-authority + tailwind-merge + lucide-react），底层从 radix-ui 迁移到 base-ui：

- Button、Input 为首批迁移组件
- 逐步覆盖 Textarea、Checkbox、Switch、RadioGroup、Select、Dialog、Tabs、Table、Card 等全系列组件
- 首批渲染器（Button、Input、Form）完成 `@nop-chaos/ui` 迁移，后续渲染器分批跟进

### 3.5 RendererComponentProps 合约

确立了所有渲染器必须遵循的 `RendererComponentProps` 模式：

| 数据源          | 提供内容           | 用途               |
| --------------- | ------------------ | ------------------ |
| `props.props`   | 编译后的运行时值   | Schema 驱动的值    |
| `props.meta`    | 编译后的元数据     | 控制状态           |
| `props.regions` | 预编译的子渲染句柄 | 渲染子片段         |
| `props.events`  | 运行时事件处理器   | 事件绑定           |
| `props.helpers` | 稳定的运行时辅助   | dispatch、evaluate |

### 3.6 FieldFrame 与渲染器包装合约

`FieldFrame` 组件被引入 `flux-react` 层，统一处理表单标签/错误/提示的包装。`RendererDefinition.wrap` 标记让 `NodeRenderer` 自动为需要字段包装的渲染器添加标签和错误展示。

### 3.7 Report Designer 与 Spreadsheet 迁移

从 `nop-chaos-next` 迁移四个包到工作区（03-25 完成）：

- `@nop-chaos/spreadsheet-core` / `spreadsheet-renderers`
- `@nop-chaos/report-designer-core` / `report-designer-renderers`

集成工作区配置（tsconfig references、path aliases、Vite aliases），修复运行时/测试问题，确保所有测试通过。

### 3.8 testid 与架构一致性

03-29 为 `BaseSchema` 添加 `testid` 字段，贯穿编译→解析管线，所有生产渲染器在根元素应用 `data-testid`。同日完成架构一致性审计，发现渲染器隐式布局注入、验证触发语义漂移、主题 token 命名漂移等问题，建立了两阶段修复策略。

> 关键路径：`packages/ui/src/`，`docs/architecture/styling-system.md`，`packages/flux-react/src/field-frame.tsx`，`packages/spreadsheet-renderers/src/`，`packages/report-designer-renderers/src/`

---

## 4. 第四阶段：复杂渲染器与架构审计

**时间**：2026-03-28 ~ 2026-03-31

### 4.1 shadcn/ui 全量迁移

03-28 完成了 shadcn/ui 组件库的全面迁移。`@nop-chaos/ui` 包扩展到覆盖 Inputs/fields、Overlay、Layout/feedback 等全系列组件。Flow Designer、表单渲染器、代码编辑器等全面切换到 shadcn/ui 组件。

### 4.2 Code Editor 包

03-30 `@nop-chaos/flux-code-editor` 基于 CodeMirror 6 创建，统一了表达式编辑器和 SQL 编辑器。特性包括：8 种语言支持、表达式/SQL 补全、表达式校验、友好名标记、模板模式、全屏切换、明暗主题。后续 03-31 完成 SQL 增强（格式化、代码片段模板、变量面板、SQL 执行结果预览）。

### 4.3 Condition Builder

03-30 完整的 `condition-builder` 渲染器在 `flux-renderers-form` 中实现，支持嵌入式/选择器模式、AND/OR/NOT 逻辑、字段搜索、分组、唯一字段、嵌套分组、自定义操作符。

### 4.4 Word Editor 包

03-31 `@nop-chaos/word-editor-core`（零 React 依赖的框架无关桥接层 + Store）和 `@nop-chaos/word-editor-renderers`（EditorCanvas、RibbonToolbar、FontControls、WordEditorPage）创建。集成 `@hufe921/canvas-editor` 作为画布渲染引擎，模板表达式存储为超链接。同日完成 Phase 1 基础编辑器集成和 Phase 1~4 工具栏控件。

### 4.5 架构审计

03-31 对核心包（flux-core、flux-runtime、flux-react、flux-formula、3 个渲染器包）进行了全面审计，分析了约 32,000 行非测试源代码。发现：flux-core 的设计是正确的（它是一个基础包，包含共享纯工具，不是纯类型包），form-runtime 已经分解为 10 个子模块，依赖流向干净。

> 关键路径：`packages/ui/src/`，`packages/flux-code-editor/src/`，`packages/word-editor-core/src/`

---

## 5. 第五阶段：代码审计与质量收敛

**时间**：2026-04-01 ~ 2026-04-03

### 5.1 代码审计修复计划（Plan #25）

执行了 14 项修复，涵盖 8 个包：

- **构建卫生**：移除陈旧的 tsconfig include 路径，创建 `scripts/verify-no-src-artifacts.mjs` CI 守卫
- **逻辑正确性**：修复 Flow Designer `allowMultiEdge` 逻辑错误，统一 `executeApiObject()` 请求管线
- **防御性修复**：`NodeRenderer` 包裹 `React.memo`，`evaluateArray`/`evaluateObject` 添加边界保护
- **性能优化**：API 缓存 LRU 淘汰，Proxy 缓存 WeakMap

### 5.2 全面代码整改（Plan #27）

执行了全面的代码整改工作，包括：

- 渲染阶段保持无副作用
- 表单路径状态 `relatedPaths` 修复
- 表单字段控制器共享 Hook 提取
- 动态渲染器 API 载荷验证
- 根组件注册表从模块级可变状态改为实例级状态
- `ScopeRef.merge()` 方法添加变更检测

### 5.3 数据源重设计

`DataSourceSchema` 移除了 `body` 区域，改为向当前作用域注入数据。如果设置 `dataPath`，将响应写入 `scope[dataPath]`；否则将响应作为普通对象合并到当前作用域。

### 5.4 useOwnScopeSelector 双钩子与 @nop-chaos/ui 全量采纳

04-03 `flux-react` 暴露 `useOwnScopeSelector()` 与词法 `useScopeSelector()` 并行，Report Designer shell 渲染器迁移到 own-scope 钩子，只消费片段宿主数据。同日完成 `word-editor-renderers`、`report-designer-renderers`、`spreadsheet-renderers` 的 `@nop-chaos/ui` 采纳迁移。

### 5.5 依赖与 Lint 升级

04-02 ~ 04-03 工作区升级到 `eslint-plugin-react-hooks` `recommended-latest` 严格规则集（后续 04-16 进一步深化为 React 19 严格 lint 基线），完成了 Lucide React 补丁修复，清理了所有 `src/` 目录中的构建产物泄漏。

> 关键路径：`packages/flux-runtime/src/request-runtime.ts`，`packages/flux-renderers-data/src/data-source-renderer.tsx`，`scripts/verify-no-src-artifacts.mjs`

---

## 6. 第六阶段：运行时架构收敛与性能优化

**时间**：2026-04-04 ~ 2026-04-06

### 6.1 Formily 对比分析与性能方向

完成了与 10+ 个低代码平台（AMIS、Formily、LowCode Engine、Appsmith、ToolJet、Retool 等）的详细对比。核心发现：

- **响应性模型是最关键短板**：当前 Pull Model 在父 scope 变化时触发 O(节点数 × 表达式数) 求值，而 Formily 的 Push Model 是 O(依赖者数)
- Flux 的 AOT 编译、正交作用域设计、字段元数据驱动编译是独特的架构优势
- **决策**：保持 Flux 的编译优先通用平台基线，只允许表单子域本地的薄能力扩展

### 6.2 依赖追踪与变更路径通知

实现了 ScopeChange 依赖追踪基线：

- `ScopeStore` 携带 `ScopeChange`（变更路径集合）
- 公式叶求值在每次成功运行后刷新依赖集
- `NodeRenderer` 订阅通过依赖路径交集门控元数据/属性重计算
- 后续演进为**词法根绑定**模型：依赖追踪收敛到 `user`、`row`、`record` 这样的词法根

### 6.3 源注册表与反应运行时

- **源注册表**（`source-registry.ts`）：`RendererRuntime` 暴露 `registerDataSource(...)`，源按 `ScopeRef.id` 分桶，`data-source` 渲染器只负责注册/释放生命周期
- **反应运行时**（`reaction-runtime.ts`）：`ReactionSchema` 支持 `watch`、`when`、`immediate`、`debounce`、`once`，反应执行异步调度在写入稳定后
- **自级联保护**：排队反应触发器按待处理回合合并变更路径，自级联反应在有限次数后硬停止

### 6.4 动作控制流扩展

动作系统增加了 `when`/`parallel`/`timeout`/`retry`：

- `when`：前置条件检查，假时返回结构化跳过结果
- `parallel`：`Promise.all` 并行执行
- `timeout`：结构化超时结果，可取消的请求类动作参与真实取消
- `retry`：固定次数/固定延迟的重试策略

### 6.5 复杂渲染器状态所有权

04-05 Table 渲染器引入了 `local`/`controlled` 两级状态所有权模型，04-06 扩展为三级并补充 `scope` 模式：

- `local`（默认）— 渲染器内部状态
- `controlled` — 外部 schema/runtime 驱动
- `scope`（04-06 补充）— 直接从当前渲染作用域读写响应式状态

### 6.6 前端编程模型文档

`docs/architecture/frontend-programming-model.md` 确立为顶层架构基线文档，定义了 Flux 的七个核心原语（当时第一原语仍称 Base Tree，04-21 正式重命名为 Template）。七个原语为：Template（原 Base Tree）、ScopeRef、Value、Resource、Reaction、Capability、Host Projection。

### 6.7 WorkbenchShell 提取

04-04 从各设计器中提取共享的 `WorkbenchShell` React 组件到 `packages/flux-react/src/workbench/`，Flow Designer 和 Report Designer 的页面渲染器从手写三栏布局迁移到统一的 `WorkbenchShell`。Shell 纯展示，不携带 Flux 作用域或域知识。

> 关键路径：`packages/flux-runtime/src/source-registry.ts`，`packages/flux-runtime/src/reaction-runtime.ts`，`packages/flux-runtime/src/action-runtime.ts`，`packages/flux-react/src/workbench/workbench-shell.tsx`，`docs/architecture/frontend-programming-model.md`

---

## 7. 第七阶段：前端编程模型定型与深度设计

**时间**：2026-04-06 ~ 2026-04-11

> 注：本阶段与第八阶段（模板实例化）存在并行工作，两者日期有重叠。

### 7.1 编程模型演进讨论

经历了多轮深度讨论（8 轮讨论记录在 `docs/discussions/2026-04-06-programming-model-optimality-critique.md`），最终确立了：

- 保持七个原语的闭合，不引入替代原语系统
- `data-source` 理解为"命名动态值注册到作用域"
- `name` 作为唯一的规范化发布路径，`mergeToScope: true` 是唯一的特殊发布模式
- 动作语义（`when` + `then` + `onError` + `parallel`）在执行时已经形成 DAG
- 区分"渐进式创作表面"与"DAG 执行语义"

### 7.2 Action/API 收敛建构

- 声明式请求从 `ApiObject` 重命名为 `ApiSchema`
- `type: 'source'` 作为基于动作的匿名值消费形式
- `data-source` 作为 `source` 的命名/调度扩展
- 内置动作命名标准化为 camelCase（`openDialog`、`showToast`）

### 7.3 验证体系深度设计

04-11 完成了统一的验证设计（`docs/analysis/2026-04-11-flux-validation-unified-design.md`），涵盖：

- `modelGeneration` 计数器追踪验证模型替换
- 异步运行身份五元组（`ownerId`、`modelGeneration`、`path`、`ruleId`、`runGeneration`）
- 两种生命周期路径：所有者兼容模型刷新 vs 所有者边界变更
- 状态保留规则：始终重置具现化缓存和异步运行

### 7.4 表单联动与隐藏字段策略

04-11 `HiddenFieldPolicy` 合约完整实现（Plan 67）：`clearValueWhenHidden`、`validatePath` 跳过、`notifyFieldHidden`，21 个新测试。
约束性声明式联动（`xui:linkage`）编译到现有节点元数据/属性和验证流中。
字段展示快照（`effectiveDisabled`/`effectiveRequired`）。

### 7.5 Owner Status 模型

04-09 将 loading/pending/status 统一为所有者特定的只读摘要：

- 表单内部表达式标准化为 `$form` 绑定
- 跨表单观察者标准化为显式 `statusPath`
- 表面所有者（dialog/drawer）通过 `statusPath` 暴露外部只读状态

### 7.6 组件文档体系与 xui:imports 表达式投影

04-07 建立了 `docs/components/` 组件文档体系，每个组件目录携带 `design.md` + `example.json`，区分已注册渲染器与计划中渲染器。组件命名标准化为 Flux 原生词汇而非 AMIS 遗留名称。

同日完成 `xui:imports` 表达式投影，导入别名现在可以在表达式中以 `$alias.method(...)` 形式使用，与现有的 `namespace:method` 动作分派共享同一导入命名空间提供者映射。

> 关键路径：`docs/architecture/frontend-programming-model.md`，`docs/architecture/api-data-source.md`，`docs/architecture/action-scope-and-imports.md`

---

## 8. 第八阶段：模板实例化与节点身份体系

**时间**：2026-04-07 ~ 2026-04-08

### 8.1 模板实例化架构

`docs/architecture/template-instantiation-and-node-identity.md` 确立了"编译一次模板，运行时多次实例化"的架构：

- `cid` 严格为挂载时活跃节点桥接 ID
- 结构解析属于运行时拥有的解析器
- 规范运行时地址为 `NodeLocator = runtimeId + templateGraphId + templateNodeId + instancePath`

### 8.2 重复实例身份传播

表格行子渲染（cell、buttons、expanded）传入 `[{ repeatedTemplateId: 'table.row', instanceKey: rowKey }]`，行子级调试定位器数据现在可以看到真实的 `instancePath`。

### 8.3 NodeRenderer 兼容性迁移

通过 Plan 40 分阶段将 `CompiledSchemaNode` 依赖迁移到 `NodeInstance`/`templateNode`：

- `NodeFrameWrapper` 消费 `templateNode` + 显式渲染器 `wrap` 元数据
- `RendererComponentProps` 和 `useCurrentNodeMeta()` 镜像 `templateNode` + 可选 `locator`
- 片段/对话框所有权缝迁移到活跃节点优先回退

### 8.4 编译器集成诊断

Plan 41 实现了编译器集成的 Schema 诊断：

- `flux-core` 暴露正式的 Schema 诊断合约
- `CompileSchemaOptions` 携带诊断/验证策略
- `RendererDefinition` 可贡献 `schemaValidator`
- 表单和表格渲染器贡献了渲染器拥有的 schema 验证器检查

### 8.5 BEM 迁移完成

所有内部 `__` 标记清理完成，字段框架、代码编辑器、电子表格/报表设计器、工作台区域迁移到 `data-slot`/`data-*`。

> 关键路径：`docs/architecture/template-instantiation-and-node-identity.md`，`packages/flux-react/src/node-instance.ts`，`packages/flux-runtime/src/node-resolver.ts`

---

## 9. 第九阶段：深度审计、性能优化与架构收敛

**时间**：2026-04-12 ~ 2026-04-20

> 注：本阶段是整个项目密度最高的收敛期，代码变更、文档审计、性能优化和架构决策密集交织。

### 9.1 架构文档一致性审计与治理体系成型

04-12 完成了首次全范围架构文档一致性审计，检查 `docs/architecture/` 下所有文件与代码和彼此之间的一致性。发现了跨文档冲突（`Final Execution Schema` 措辞、节点身份模型、`xui:imports` 边界、样式契约漂移等），建立了按文档族分片的修复策略。

这一阶段也标志着 Flux 特有的开发治理方法正式成型：

- 先写 owner doc（目标态架构文档）
- 再写执行 plan
- 执行后写 daily log
- 最后用独立子审计确认 closure

后续的大量 Plan（73~121）都遵循了这套方法。

### 9.2 Plan 82：架构合约实现收敛

Plan 82 是 04-12~04-14 的核心收敛计划，覆盖了多条并行的合约对齐线：

- **xui:imports 节点生命周期收紧**（Phase 5）：导入声明节点的 `ActionScope` 创建和命名空间注册开始从渲染器策略中分离，模块加载去重与作用域命名空间生命周期初步独立。最终的 import-owned boundary 定型在 04-23 的 Plan 133 完成（见第十阶段 10.3）
- **Surface 家族提取**（Phase 5）：dialog/drawer 状态从 `page.store` 抽出到独立的 `SurfaceStore`，`SurfaceRuntime` 成为 dialog/drawer/surface 的统一所有者
- **值适配合约收敛**（Phase 6）：`detail-field`、`detail-view`、`object-field`、`array-field`、`variant-field` 逐步对齐到共享的 value-adaptation helper 和统一的 scope 模型
- **架构窄化决策**：经过多轮实现尝试后，架构文档明确将 `object-field`、`array-field`、`variant-field` 定位为 inline live-edit 控件（编辑直写父表单），只有 `detail-field`/`detail-view` 保持 staged owner 语义（确认/取消边界）

### 9.3 ScopeRef 读写分离与 per-path 订阅

04-14~04-15 对 ScopeRef 的核心 API 进行了重大重构：

- **`read()` → `readVisible()` + `materializeVisible()`**（Plan 89）：`readVisible()` 使用 prototype 链提供惰性词法视图，`materializeVisible()` 仅在显式展平边界（公式 broad-access、调试器 dump、请求 `includeScope: '*'`）时调用
- **per-path 精细订阅**（Plan 90）：`FormStore` 增加了 `subscribeToPath(path)` 机制，字段 A 的按键不再唤醒字段 B 的订阅者，实现 O(1) 字段级失效
- **Host Projection scope 基底**（Plan 87）：`RendererRuntime.createHostProjectionScope(...)` 将宿主投影的只读/写保护边界从 React hook 移入共享运行时合约

### 9.4 性能优化系列（Plans 100~110）

04-16 执行了一整个性能优化计划系列，从审计到逐包落地：

- **Playground 加载与 bundle 边界**（Plan 102）
- **Flux React 热路径修复**（Plan 103）：`NodeRenderer` 的 `useSyncExternalStore` 选择器稳定化、`ClassAliasesContext` 广播去抖
- **Formula 运行时热路径**（Plan 104）
- **Spreadsheet 性能与虚拟化**（Plan 105）：`setCells()` 批量操作、网格虚拟化（二分搜索可见范围）、`requestAnimationFrame` 批量选择/填充/缩放
- **运行时与表单失效性能**（Plan 106）：并行字段验证、`computeScopeState` 缓存、`publishStatus` 跳过无变化更新
- **集合渲染器可伸缩性**（Plan 107）：表格视口驱动虚拟化（阈值 50 行、overscan 10）、行作用域缓存从全量克隆改为原地变异 + 代计数器
- **表单字段消费者性能**（Plan 108）：`useBoundFieldValue()` 使用 `UNUSED_VALUE` 哨兵选择器避免不活跃订阅
- **Flow Designer 性能卫生**（Plan 109）：节点同步从 O(n²) 降为 O(n)
- **API 请求与缓存卫生**（Plan 110）：源刷新 O(1) 名称索引、轮询从 `setInterval` 改为 `setTimeout` 链

### 9.5 @nop-chaos/flux-renderers-form-advanced 拆分

04-16 从 `flux-renderers-form`（~15,800 行）中拆出 11 个高级渲染器到新的 `@nop-chaos/flux-renderers-form-advanced` 包：condition-builder、variant-field、detail-view、detail-field、object-field、array-field、array-editor、tag-list、key-value 等。`flux-renderers-form` 降至 ~3,000 行。依赖方向确认为 form-advanced → form → basic（无循环）。

### 9.6 Capability Projection Manifest

04-16 引入了 Capability Projection Manifest 架构（Plan 112），让宿主协议从运行时接线约定升级为编译期可见、可校验的静态契约：

- `HostCapabilityProjectionManifest` 声明宿主投影字段和命名空间能力方法
- `RendererDefinition.hostContract` 让渲染器定义携带宿主合约元数据
- Flow Designer 作为首版试点，声明了 30 个 `designer:*` 方法
- 编译器集成诊断：`validateActionShape()` 现在可校验宿主动作参数形状

### 9.7 @nop-chaos/flux-i18n 国际化包

04-17 创建了 `@nop-chaos/flux-i18n` 包，基于 i18next 和 react-i18next，支持 zh-CN（默认）和 en-US。所有翻译键使用 `flux.` 前缀。后续将 condition-builder、report-designer、code-editor、form-advanced 等包的硬编码字符串迁移到 `t()` 调用，ESLint `i18next/no-literal-string` 规则从 `warn` 升级为 `error`，确保新增硬编码字符串会导致构建失败。

### 9.8 ValueAdapter 统一协议

04-20 `docs/architecture/value-adaptation-and-detail-field.md` 确立 `ValueAdapter` 为规范共享协议（Plan 121）：

- 简单字段使用声明式适配器：`stringAdapter()`、`booleanStringAdapter()`、数组适配器
- 复合所有者（object-field、variant-field）统一接入 `actionAdapter()` 用于 `transformInAction` / `transformOutAction`
- detail-field/detail-view 的 staged helper 内部委托给 `actionAdapter()`，保持公开 API 不变
- `ValueAdapter` 成为新增值导向字段的标准接入方式，取代 JSX 局部类型转换

### 9.9 CompiledSchemaNode 彻底消除

04-16 编译管线不再经过 `CompiledSchemaNode` 中间层，直接从 `SchemaInput` 生成 `TemplateNode`。`CompiledSchemaMeta` 和 `CompiledNodeRuntimeState` 降级为类型别名。这一清理简化了编译管线，消除了模板/实例分离落地后不再有价值的间接层。

### 9.10 Renderers 合约统一静态元数据

04-20（Plan 117）为 `RendererDefinition` 添加了统一的静态合约字段：`rendererClass`、`rendererTraits`、`propContracts`、`eventContracts`、`componentCapabilityContracts`、`scopeExportContracts`。`propContracts` 立即参与编译器未知属性检查，其余字段为工具化（Inspector、在线编辑器）预留。button、form、crud、designer-page 作为首批试点。

### 9.11 动作预编译与异步治理

04-20（Plans 119~120）将动作系统推入编译期：

- **CompiledActionProgram IR**：`compileAction()` 将 `ActionSchema` 编译为 `CompiledActionProgram`/`CompiledActionNode`，运行时执行器内部不再混合原始 schema 执行路径
- **异步治理收敛**：共享 `async-governance.ts` 基底统一了 data-source、reaction、async validation 三类运行时异步所有者的 run 身份、过时发布门控和调试诊断

### 9.12 文档治理与深度审计

04-12~04-19 期间产生了多轮深度审计（12 个审计维度覆盖 API 表面、状态所有权、响应精度、异步安全、验证一致性、渲染器合约、样式合规、字段槽建模、生命周期等），每轮审计后仅修复仍在当前代码中复现的真实缺陷，避免过度修复。

> 关键路径：`packages/flux-core/src/value-adapter.ts`，`packages/flux-runtime/src/async-governance.ts`，`packages/flux-runtime/src/action-compiler.ts`，`packages/flux-i18n/src/`，`packages/flux-renderers-form-advanced/`

---

## 10. 第十阶段：编译器独立与包边界硬化

**时间**：2026-04-21 ~ 2026-04-25

### 10.1 编译器包提取

从 `flux-runtime` 中提取出 `@nop-chaos/flux-compiler` 包：

- Schema 编译/验证
- 动作预编译
- 编译符号表
- 诊断与验证降低
- `flux-runtime` 短暂保留兼容性重导出层（04-22 Plan 124 已移除，runtime 侧不再持有任何编译器代码）

### 10.2 动作核心包提取

04-22 从 `flux-runtime` 中再次提取出 `@nop-chaos/flux-action-core` 包，`ActionRuntimeAdapter` 成为统一的动作调用边界。到这一步，Flux 完成了三层拆分：

- `flux-compiler` 负责"把 schema 变成可执行产物"
- `flux-action-core` 负责"动作调度、控制流和统一调用出口"
- `flux-runtime` 负责"把编译产物和宿主环境接起来并持有生命周期"

### 10.3 Import Boundary 语义收敛

04-23 `xui:imports` 的 ActionScope 创建从 renderer-policy 分离为 import-owned boundary 语义（Plan 133）。模块加载去重与作用域命名空间注册独立运作，导入生命周期与编译期诊断参与编译管线，完成了 3 月下旬提出的 `ActionScope` / `xui:imports` 模型的第二阶段。

同日 Plan 132 消除了运行时对原始 `Schema` 对象的回退读取——`DataSource` 和 `Reaction` 全面迁移到编译后的数据，运行时不再持有未编译的 schema。这是编译前移主线的直接体现。

### 10.4 Base Tree → Template 重命名

04-21 编程模型的第一个原语从 `Base Tree` 重命名为 `Template`，强调其作为编译时不可变程序定义的本质。`SchemaCompiler` 产出不可变 `TemplateNode` 图，运行时只消费和实例化。

### 10.5 Data Domain Owner 架构

04-22 `Data Domain Owner` 概念正式提升为架构基线文档（`docs/architecture/data-domain-owner.md`）。`object-field`、`array-field`、`variant-field` 对齐到 Data Domain Owner 基线——复合字段成为显式的数据域所有者，拥有明确的值适配、验证协调和子作用域生命周期。这与 `detail-field`/`detail-view` 的 staged owner 语义形成互补：inline live-edit（直写）和 staged（确认/取消边界）两种所有权模式覆盖了所有复合字段范式。

### 10.6 DingFlow 树模式

引入了结构化进程树合约：节点可以拥有分支组，分支组隐式合并，延续流进入所有者节点的下游 `child`。树模式下禁用了自由连接、自由重连和手动节点拖动。

### 10.7 CRUD 契约收口与共享上下文菜单

CRUD 的设计与实现跨越多个阶段：04-12 完成组件合约文档（`docs/components/crud/design.md`），04-17 左右进入实现阶段，04-24 ~ 04-25 完成交互与契约收口：

- CRUD 选择摘要和刷新行为稳定
- 电子表格共享上下文菜单基线（复制、剪切、粘贴、清除、插入/删除行列）
- 填充柄双击使用相邻数据区域自动向下填充

04-25 Plan 139 删除了 `DataSourceSchema.api` 字段，所有远程调用统一通过 `{ action: 'ajax', args: ... }` 分发。`ApiSchema` 被明确为 `ajax` action 内部使用的 transport contract，作者侧不再直接接触独立的 API 定义——从独立执行路径到统一动作分发的收敛在此完成。

> 关键路径：`packages/flux-compiler/src/`，`packages/flux-action-core/src/`，`docs/architecture/flux-runtime-module-boundaries.md`，`docs/architecture/capability-projection-manifest.md`

---

## 11. 架构演变的关键原则

纵观 2026-03-20 至 2026-04-25 期间的演变历史，以下原则反复出现在关键决策中：

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

### 11.8 设计先行，实现逼近

Flux 的核心设计思想（Env 环境抽象、Api/Resource 异步响应式值、词法作用域数据链、`xui:imports` 动作模块化、声明式优先）早在 AMIS 理论研究阶段就已确立。架构演变记录的不是设计方向的发现，而是实现精度对设计原则的逐步逼近——从运行时解释到编译期静态化，从隐式约定到显式合约，从单体到分层包边界。

### 11.9 宿主边界试验田

Flow Designer 是 Flux 验证宿主协议的第一块试验田。Flux 从 Flow Designer 学到的不是"怎么做一个流程图编辑器"，而是复杂控件必须通过宿主边界、命名空间动作、桥接快照和配置驱动来接入运行时。同一套总运行时后来成功容纳了结构化流程树（DingFlow）和 Excel 原生工作台（Spreadsheet/Report Designer）两种截然不同的复杂宿主范式。

### 11.10 实现驱动收敛

设计思想虽然早已确立，但实现路径并非一蹴而就。Flux 的架构是在持续的实现、失败、回归、拆分、重命名、重写文档、再由子审计逼着收敛的过程中逐步精确化的。每一步实现跃迁都伴随着明确的文档记录和回归测试覆盖，确保了实现决策的可追溯性。

---

## 12. 附录：时间线总览

| 阶段     | 时间          | 关键事件                                                                                                                                                                                                                                                       |
| -------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 第一阶段 | 03-20 ~ 03-23 | Bug #1~#5 分析与修复，调试器诞生，ActionScope/Import 语义确立，Flow Designer 包创建，画布桥接初始实现                                                                                                                                                          |
| 第二阶段 | 03-23 ~ 03-27 | 画布桥接、命令适配器、Schema 驱动设计器、生产级视觉对齐                                                                                                                                                                                                        |
| 第三阶段 | 03-25 ~ 03-29 | AMIS→Flux 重命名，flux-core 拆分，样式系统，shadcn/ui 迁移，FieldFrame，Report/Spreadsheet 迁移，testid                                                                                                                                                        |
| 第四阶段 | 03-28 ~ 03-31 | shadcn/ui 全量迁移，Code Editor，Condition Builder，Word Editor，架构审计                                                                                                                                                                                      |
| 第五阶段 | 04-01 ~ 04-03 | 代码审计修复、全面整改、数据源重设计、双钩子设计、@nop-chaos/ui 全量采纳                                                                                                                                                                                       |
| 第六阶段 | 04-04 ~ 04-06 | Formily 对比、依赖追踪、源注册表、反应运行时、动作控制流、WorkbenchShell、表格状态所有权、编程模型文档                                                                                                                                                         |
| 第七阶段 | 04-06 ~ 04-11 | 编程模型定型、Action/API 收敛、Owner Status、组件文档体系、imports 表达式投影、验证设计、HiddenFieldPolicy                                                                                                                                                     |
| 第八阶段 | 04-07 ~ 04-08 | 模板实例化、重复实例身份、NodeRenderer 迁移、编译器诊断、BEM 清理                                                                                                                                                                                              |
| 第九阶段 | 04-12 ~ 04-20 | 深度审计、架构文档一致性、Plan 82 合约收敛、ScopeRef 读写分离、per-path 订阅、性能优化系列（Plans 100~110）、form-advanced 拆分、Capability Projection Manifest、flux-i18n 国际化、ValueAdapter 统一协议、CompiledSchemaNode 消除、动作预编译 IR、异步治理收敛 |
| 第十阶段 | 04-21 ~ 04-25 | 编译器包提取、动作核心包提取、Import Boundary 收敛、Base Tree→Template、DingFlow 树模式、CRUD、共享上下文菜单                                                                                                                                                  |

---

## 结语

NOP Chaos Flux 的架构演变，是一个将已确立的设计思想在现代技术栈上系统化实现的过程。核心设计——Env 环境抽象、Api/Resource 作为异步响应式值、词法作用域数据链、`xui:imports` 动作模块化、声明式优先——早在 AMIS 理论研究阶段就已经确立（参见 `c:/can/nop/nop-entropy/docs/theory/amis/`）。Flux 所做的不是发明这些原则，而是解决 AMIS 在 Schema 层（平行字段膨胀）和运行时层（MST 紧耦合）的结构性限制，将这些原则以编译优先、类型安全、包边界清晰的方式落地。

整个演变的最强主线是从运行时解释到编译执行：值分类、模板实例化、动作预编译、宿主合约静态化、编译器包提取——每一步都是把运行时判断前移到编译期的同一条路线上的里程碑。但这条主线不是唯一的。与之并行且同等重要的还有两条：owner / validation / surface 的所有权收敛（从隐式双状态到显式 staged owner），以及 host contract / import boundary / capability manifest 的边界显式化（从运行时接线约定到编译期可见合约）。最终的 `flux-compiler` / `flux-action-core` / `flux-runtime` 三层拆分，是编译前移主线的物理形态。

最终形成的架构——DSL 优先 + 编译/执行分离 + 正交作用域 + 模板实例化 + 域桥接 + 编译期宿主契约——为声明式前端低代码 DSL 提供了一个清晰的现代运行时参考。

---

**nop-chaos-flux 已开源：**

- GitHub: https://github.com/entropy-cloud/nop-chaos-flux
- Gitee: https://gitee.com/canonical-entropy/nop-chaos-flux
