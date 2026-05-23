# nop-chaos-flux vs tiny-engine + tiny-vue 生态深度对比分析

> 日期: 2026-04-29
> 分析范围: `c:/can/nop/nop-chaos-flux` vs `c:/can/nop/templates/tiny-engine` + `c:/can/nop/templates/tiny-vue`
> 分析方法: 主仓静态阅读 + 多个独立子 agent 并行勘察 + 关键代码路径回读 + 多轮缺口审查

---

## 1. 执行摘要

这不是一个“单仓对单仓”的简单比较。

真正可比的对象是：

- `nop-chaos-flux`: 一个把低代码问题当作**前端执行模型**来设计的运行时平台。
- `tiny-engine + tiny-vue`: 一个把低代码问题拆成**设计器工作台 + 组件运行时/主题/生态 + 出码链路**的双仓生态。

但以当前仓库可见证据看，这里还需要补一句更准确的定位：在 designer 这一侧，`nop-chaos-flux` 首先仍是**执行/runtime core**，但它已经为一个**通用异构设计器内核**提供统一的 runtime support。它共享的是 host boundary、host projection、namespaced action、`WorkbenchShell`、selection-aware inspector 与 per-family override contract，从而支撑 `flow-designer`、`report-designer`、`spreadsheet-page`、`word-editor-page` 这类异构 host family。

最重要的结论有五条。

1. `nop-chaos-flux` 的强项在于**执行语义闭包**。它优先解决的是 `Final Execution Schema`、编译期/运行时边界、数据 owner、动作代数、宿主能力契约、调试可解释性等问题。
2. `tiny-engine + tiny-vue` 的强项在于**平台装配与产品化路径**。它优先解决的是注册表装配、插件/工具栏/设置器扩展、物料协议、跨组件库映射、设计器预览、出码与运行时独立部署。
3. 两边最根本的架构差异，不是 React 对 Vue，也不是“有无设计器”，而是**契约是集中还是分布**。
4. `nop-chaos-flux` 更像一个语义收敛的底层内核；`tiny-engine + tiny-vue` 更像一个由工作台、物料协议、组件库和代码生成器共同组成的上层生态。
5. 如果你的目标是“让 schema 本身成为长期稳定的运行时契约”，`nop-chaos-flux` 更强。如果你的目标是“快速构建并定制一个低代码设计器，再把结果交付为 Vue 应用代码”，`tiny-engine + tiny-vue` 更强。

### 1.1 如果只问“设计水平、架构水平、编码水平”

- 设计水平: 各胜一面。若重点看问题抽象、执行模型设计和长期语义闭包，`nop-chaos-flux` 更强；若重点看工作台产品化、组件生态装配和源码交付链设计，`tiny-engine + tiny-vue` 更强。
- 架构水平: 在本次审阅范围内，`nop-chaos-flux` 更高，因为 compile/runtime/host boundary、owner semantics、dependency tracking 和 action algebra 被更集中地正式化了。
- 编码水平: 需要拆开看。以当前仓库可见证据看，`flux` 核心代码整体更现代、更一致；`tiny-vue` 是成熟组件库工程水准；`tiny-engine` 更像承担平台胶水、动态装配和历史兼容负担的工程层。因此如果必须做粗粒度排序，更接近 `flux core > tiny-vue > tiny-engine`，而 Tiny 生态的工业成熟度又高于只看 `tiny-engine` 单仓时的观感。

---

## 2. 范围、方法与置信度

### 2.1 为什么这次必须把 `tiny-vue` 纳入比较范围

只看 `tiny-engine` 会得出错误结论，因为它并不是完整的“对手系统”。

- `tiny-engine/designer-demo/package.json` 直接依赖 `@opentiny/vue`、`@opentiny/vue-renderless`、`@opentiny/vue-theme`、`@opentiny/vue-icon` 等包。
- `tiny-engine/packages/design-core/package.json` 把 `@opentiny/vue`、`@opentiny/vue-runtime`、`@opentiny/vue-theme` 等声明为 peerDependencies。
- `tiny-engine/packages/vue-generator/src/templates/vue-template/templateFiles/packageJson.js` 默认生成的应用依赖里直接写入 `@opentiny/vue` 与 `@opentiny/vue-icon`。
- `tiny-engine/packages/design-core/src/preview/src/preview/importMap.js` 也默认围绕 OpenTiny Vue 运行时做 import map 拼装。

因此，`tiny-engine` 是工作台、物料、配置、预览、出码的一半；`tiny-vue` 是组件运行时、renderless 逻辑、主题、图标和运行时资源的另一半。把它们拆开评判，会系统性低估 tiny 生态的“实际执行层”。

### 2.2 同时也不能把 `tiny-engine` 误说成“只支持 tiny-vue”

这一点也需要纠正。

- `tiny-engine/designer-demo/public/mock/bundle.json` 的示例物料并不只指向 `@opentiny/vue`，其中就存在 `element-plus` 组件映射。
- `tiny-engine/scripts/buildMaterials.mjs` 展示了它的物料 bundle 是一个独立协议，核心是 `components / blocks / snippets / packages / componentsMap`，而不是直接读取 `tiny-vue` 源码。

所以更准确的说法是：

- 在本次审阅范围内，`tiny-engine` 的物料协议看起来**可以承载多组件库映射**，而不是只能表达 `tiny-vue`。
- 但以当前仓库可见证据看，它的官方工作台、预览、默认出码模板和产品发行方式，仍然**明显偏向 OpenTiny Vue 生态**。

### 2.3 方法与置信度说明

本报告的结论分三类：

- 高置信度: 直接由代码与文档共同支撑。
- 中置信度: 由多处实现和装配路径交叉推导。
- 低置信度: 只作为谨慎推测提出。

本报告尽量只给出高置信度或中置信度结论。

---

## 3. 生态边界与系统拓扑

### 3.1 `nop-chaos-flux` 的系统边界

`nop-chaos-flux` 是一个单仓的、强 owner-doc 驱动的平台。它的主干非常明确：

- `flux-core`
- `flux-formula`
- `flux-compiler`
- `flux-action-core`
- `flux-runtime`
- `flux-react`
- 各类 renderers / designers / debugger / playground

其特点是：

- 执行主干集中在一个 monorepo 内
- 运行时、编译器、React bridge、复杂 designer 子系统使用同一套术语和 owner 文档
- 复杂能力不是以“插件壳层”优先，而是以“统一执行模型上的派生系统”优先
- 在 designer 维度上，它并不是页面/组件树设计专用工作台；更准确地说，它为通用异构设计器内核提供统一 runtime support

### 3.2 `tiny-engine + tiny-vue` 的系统边界

这个生态至少分成四层：

1. `tiny-engine`
2. `tiny-vue`
3. 物料协议与 bundle 层
4. 生成后的 Vue 应用运行时

其中：

- `tiny-engine` 负责 registry、meta service、layout、canvas、materials、configurators、preview、codegen。
- `tiny-vue` 负责 Vue 组件视图层、renderless 逻辑层、`vue-common` 适配层、主题、图标、运行时资源包。
- 物料协议负责把“低代码组件元数据”映射到真实组件包、导出名、设置器、插槽、嵌套规则、快捷属性等。
- 生成后的应用则绕开 engine 本身，直接依赖 `@opentiny/vue` 等运行。

### 3.3 一个关键结构差异

`nop-chaos-flux` 的主结构更像：

`authoring/assembly -> compiled execution -> runtime -> host designers`

`tiny-engine + tiny-vue` 的主结构更像：

`designer shell -> material protocol -> component runtime -> generated app`

这一差异决定了后面几乎所有技术判断。

### 3.4 证据锚点

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `tiny-engine/packages/design-core/src/init.js`
- `tiny-engine/designer-demo/registry.js`
- `tiny-vue/PACKAGES.md`
- `tiny-vue/package.json`

---

## 4. 顶层架构目标: 执行内核 vs 设计器工作台生态

### 4.1 `nop-chaos-flux` 的目标

`docs/architecture/frontend-programming-model.md` 直接给出核心定义: `Flux` 是 `Final Execution Schema` runtime。

这意味着它首先关心的是：

- 什么属于执行 primitive
- 什么必须在编译前完成
- 什么由运行时负责
- 什么属于 host/domain runtime，而不应反向污染执行核心

它的视角更像“做一门能长期演化的前端执行语言和运行时”，并在 designer 侧把这套边界沉淀为可供通用异构设计器内核复用的 runtime support。

### 4.2 `tiny-engine + tiny-vue` 的目标

`tiny-engine/README.md` 与 `docs/extension-capabilities-overview/registry.md` 的叙述中心则是：

- 平台可定制
- 可在线搭建设计器
- 可接入第三方组件和插件
- 可直接生成可部署源码

同时 `tiny-vue/README.md` 强调：

- Vue 2 / Vue 3 兼容
- PC / Mobile 兼容
- 组件支持配置化开发，可用于低代码平台
- Renderless 与视图层分离

这套生态的中心不是最小语义闭包，而是“如何围绕组件生态构造设计器与交付链路”。

### 4.3 这不是谁高谁低，而是谁在优化什么

- `nop-chaos-flux` 更偏**运行时哲学**。
- `tiny-engine + tiny-vue` 更偏**工作台哲学**。

前者的中心是执行一致性，后者的中心是平台组合能力。

### 4.4 证据锚点

- `docs/architecture/frontend-programming-model.md`
- `README.md`
- `tiny-engine/README.md`
- `tiny-engine/docs/extension-capabilities-overview/registry.md`
- `tiny-vue/README.md`

---

## 5. 核心处理逻辑: 端到端处理链条对比

这是本次修订后最重要的新增部分。

### 5.1 `nop-chaos-flux` 的处理链条

`nop-chaos-flux` 的主链条可以概括为：

`Schema -> schema compiler -> TemplateNode/CompiledActionProgram -> runtime instantiation -> dependency-aware node rendering -> capability/action dispatch`

具体表现为：

- `packages/flux-compiler/src/schema-compiler.ts` 对 schema 做 field inspection、`metaProgram` 构建、`propsProgram` 编译、event plan 编译、region 提取、import plan 构建、scope plan 决定。
- `packages/flux-react/src/node-renderer.tsx` 在节点级别使用 `useSyncExternalStoreWithSelector` 订阅 scope change，只在依赖命中时重新解析 props/meta。
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts` 则在动作层统一处理 `when`、`parallel`、`then`、`onError`、debounce、retry、timeout、result classification。

也就是说，Flux 把“结构编译”“数据读取”“渲染解析”“动作控制流”都收敛在同一套统一执行架构里。

### 5.2 `tiny-engine + tiny-vue` 的处理链条

tiny 生态至少存在三条主链。

第一条是设计器运行链：

`registry -> meta services -> materials -> canvas render -> preview/import map`

第二条是交付链：

`schema + materials + componentsMap -> vue-generator plugin pipeline -> generated Vue app -> tiny-vue runtime`

第三条是生成后应用运行链：

`generated page .vue files + generated stores + generated dataSource config + generated package.json -> ordinary Vue app runtime -> vue/pinia/vue-router/axios/@opentiny/vue 等运行时组合`

设计器运行链中，`tiny-engine/packages/canvas/render/src/render.ts` 的职责非常重：

- 遍历原始 schema 节点
- 处理 `condition`
- 处理 `loop` 与 `loopArgs`
- 做 slot/template 分组
- 处理 design mode 的事件拦截、拖拽标记、占位节点注入
- 根据 `componentName` 做组件解析

表达式和函数求值则落在 `packages/canvas/render/src/data-function/parser.ts`，其中：

- `JSExpression` 通过 `with($scope)` 执行
- `JSFunction` 通过 `newFn` 动态构造
- `loopArgs` 在运行时动态转出局部 item/index 绑定

交付链中，`packages/vue-generator/src/generator/generateApp.js` 使用 `transformStart / transform / transformEnd` 三阶段插件流水线，把 schema 转成最终项目文件；`parseImport.js` 再根据 `componentsMap` 解析出真实 import。

生成后应用运行链也不能忽略。`genPagePlugin.js` 会把 `pageSchema` 转成页面 Vue SFC，`genGlobalState.js` 会把 `globalState` 转成 Pinia store 文件，`genDataSourcePlugin.js` 会把 dataSource 转成 JSON 配置，而默认模板 `packageJson.js` 会生成最终应用依赖。这说明 Tiny 的实际运行语义并不是“只在设计器里解释一次”，而是被拆成：

- 设计器时的 schema 解释执行
- 预览时的 runtime helper 拼装
- 生成后应用中的 Vue + Pinia + dataSource 配置运行

只是这些语义没有像 Flux 那样被集中为一个统一运行时内核，而是分布在多条链路中。

### 5.3 关键差异

`nop-chaos-flux` 的核心处理逻辑是**先结构化、再执行**。

`tiny-engine + tiny-vue` 的核心处理逻辑则是**工作台解释 schema + 物料协议装配 + 并行 codegen + 生成后普通 Vue 应用运行**。

这不是“谁更完整”的区别，而是：

- Flux 把处理逻辑集中在运行时内核内。
- Tiny 生态把处理逻辑分布在设计器、画布解释器、物料协议、出码器、生成后应用和组件库之间。

### 5.4 证据锚点

- `packages/flux-compiler/src/schema-compiler.ts`
- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts`
- `tiny-engine/packages/canvas/render/src/render.ts`
- `tiny-engine/packages/canvas/render/src/data-function/parser.ts`
- `tiny-engine/packages/vue-generator/src/generator/generateApp.js`
- `tiny-engine/packages/vue-generator/src/generator/vue/sfc/parseImport.js`
- `tiny-engine/packages/vue-generator/src/plugins/genPagePlugin.js`
- `tiny-engine/packages/vue-generator/src/plugins/genGlobalState.js`
- `tiny-engine/packages/vue-generator/src/plugins/genDataSourcePlugin.js`

---

## 6. 数据流、反应性与 owner 模型

### 6.1 `nop-chaos-flux`: 数据域、作用域、依赖集合是正式概念

Flux 在这方面的设计密度非常高。

- `docs/architecture/data-domain-owner.md` 明确区分 data domain owner、validation facet、publish facet、scope read facet。
- `docs/architecture/dependency-tracking.md` 定义了 `ScopeDependencySet`、`ScopeChange`、lexical root normalization、source/reaction invalidation。
- `docs/architecture/form-validation.md` 把 validation owner 从 React tree 中剥离出来，收敛到 `ValidationScopeRuntime` / `FormRuntime`。

这意味着 Flux 的数据流不是“React state 加一点表单逻辑”，而是：

- 读取视图
- 归属 owner
- 依赖收集
- 变更传播
- validation owner
- staged/live 发布语义

都被视为架构级问题。

### 6.2 `tiny-engine + tiny-vue`: 数据流是分层分布的

tiny 生态的数据流不是没有，而是更分散：

- `tiny-engine/packages/register/src/service.ts` 里 MetaService 用 Vue `reactive` 维护全局服务状态，并暴露 `getState` / `setState`。
- `tiny-engine/packages/settings/props/src/composable/useProperties.ts` 通过 `operateNode(changeProps)` 直接更新页面 schema。
- `tiny-engine/packages/canvas/render/src/render.ts` 通过 plain object 合并形成 loop scope 和 slot scope。
- `tiny-vue/packages/renderless/src/button/vue.ts`、`packages/vue/src/tree/src/pc.vue` 等组件内部再使用 Vue reactivity、computed、watch、inject、emit 维持组件级行为。

因此 tiny 生态的数据流实际上被拆成了至少三种 owner：

- 设计器全局服务 owner
- 页面/schema 编辑 owner
- 组件内部 renderless owner

这很实用，但没有收敛成一套统一的“低代码 runtime owner 语义”。

### 6.3 对长期演化的影响

- Flux 更容易在复杂场景下维持语义一致性，因为 owner 边界是显式的。
- Tiny 生态更容易快速接能力，因为很多语义可以直接落在 Vue reactive state 或组件内逻辑里，但跨层一致性更依赖团队纪律。

### 6.4 证据锚点

- `docs/architecture/data-domain-owner.md`
- `docs/architecture/dependency-tracking.md`
- `docs/architecture/form-validation.md`
- `tiny-engine/packages/register/src/service.ts`
- `tiny-engine/packages/settings/props/src/composable/useProperties.ts`
- `tiny-engine/packages/canvas/render/src/render.ts`
- `tiny-vue/packages/renderless/src/button/vue.ts`

---

## 7. 校验、诊断与作者反馈模型

### 7.1 `nop-chaos-flux`: 编译期校验和运行时校验是同一体系的不同阶段

在 Flux 中：

- schema compiler 本身就负责 host action validation、field classification、validation model collection、diagnostics 采集。
- 运行时 validation 不依赖“挂载了哪些 React 控件”临时重建，而依赖 `CompiledFormValidationModel` + owner runtime。
- debugger 还额外提供 explain 型接口去回答“为什么这个值/状态这样”。

这是一种“编译期诊断 + 运行时 owner 校验 + 自动化解释”的闭环。

### 7.2 `tiny-engine + tiny-vue`: 校验更像分布式约束

tiny 生态也有不少约束，但形态不同：

- 物料 bundle 在 `schema.properties` 里声明属性结构、编辑器 widget、required、defaultValue 等。
- `useProperties.ts` 根据物料元数据生成设置面板并提交属性变更。
- `tiny-vue` 组件自身则通过 props、validator、组件内部逻辑继续做运行时约束。

也就是说，作者反馈和校验来自三处：

- 物料元数据
- 设置器组件
- 组件运行时本身

它们组合起来能工作，但在本次审阅到的 tiny 侧代码与文档中，没有看到像 Flux 那样以 compiler/runtime owner 为中心收敛出的统一诊断系统。

### 7.3 一个重要的结构性差异

Flux 倾向于把“正确性”收敛到 runtime/compile contract。

Tiny 生态更倾向于把“正确性”分摊给：

- 物料作者
- 设置器作者
- 组件作者
- 代码生成器作者

这会带来更高的生态弹性，也会带来更高的 contract drift 风险。

### 7.4 证据锚点

- `packages/flux-compiler/src/schema-compiler.ts`
- `docs/architecture/form-validation.md`
- `docs/architecture/debugger-runtime.md`
- `tiny-engine/designer-demo/public/mock/bundle.json`
- `tiny-engine/packages/settings/props/src/composable/useProperties.ts`
- `tiny-vue/packages/vue/src/button/src/index.ts`

---

## 8. 动作、事件与控制流语义

### 8.1 `nop-chaos-flux`: 正式的 Action Algebra

`docs/architecture/action-algebra-formal-spec.md` 和 `packages/flux-action-core/src/action-dispatcher/action-execution.ts` 展示出一个很明确的系统：

- `when`
- `then`
- `onError`
- `parallel`
- debounce
- retry
- timeout
- `ActionResult` 分类

动作在编译后进入 `CompiledActionProgram`，运行时不再重新猜测结构。这使它具备很强的静态可分析性。

### 8.2 `tiny-engine + tiny-vue`: 事件与行为更偏动态脚本化

tiny 生态当然也有事件与行为，但风格完全不同：

- `JSExpression` 与 `JSFunction` 在 `parser.ts` 中动态求值。
- 页面保存、属性编辑、区块加载等流程主要由服务和工具栏插件用命令式方式驱动。
- 生成后应用中的事件、状态和数据源逻辑还会进一步被拆分到页面 SFC、Pinia store、dataSource 配置和组件库 emit 中。
- `tiny-vue` 组件内部仍遵循普通 Vue `emit` 模式。

这使 tiny 生态在作者体验上更自由，但基于当前审阅到的实现，也更容易出现以下倾向：

- 控制流较难收敛成统一 IR
- 静态校验边界较弱
- 运行时信任边界更宽

### 8.3 设计后果

- Flux 更适合做可组合、可调试、可验证的 schema action language。
- Tiny 更适合做“允许写自定义函数和自定义交互逻辑”的灵活平台。

### 8.4 证据锚点

- `docs/architecture/action-algebra-formal-spec.md`
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts`
- `tiny-engine/packages/canvas/render/src/data-function/parser.ts`
- `tiny-engine/packages/toolbars/save/src/js/index.ts`
- `tiny-engine/packages/vue-generator/src/plugins/genPagePlugin.js`
- `tiny-engine/packages/vue-generator/src/plugins/genGlobalState.js`
- `tiny-engine/packages/vue-generator/src/plugins/genDataSourcePlugin.js`
- `tiny-vue/packages/vue/src/tree/src/pc.vue`

---

## 9. 身份模型、组件解析与契约集中度

这是两边最深的一条分野。

### 9.1 `nop-chaos-flux`: 契约集中

Flux 在一个地方同时定义了很多关键事实：

- `TemplateNode` / `templateNodeId`
- `cid` / `instancePath`
- `RendererDefinition`
- `RendererComponentProps`
- `propContracts`
- `eventContracts`
- `componentCapabilityContracts`
- `hostContract`

换句话说，渲染器实现、作者可见契约、宿主能力契约、编译期分类逻辑，都是相互可见、相互约束的。

这让它更像一个“单一执行内核里的正式语言系统”。

### 9.2 `tiny-engine + tiny-vue`: 契约分布

Tiny 生态的同类信息分散在多处：

- `tiny-vue` 组件源码里有真实 props、theme import、renderless wiring。
- `tiny-engine` 的物料 bundle 里有 `configure`、`schema.properties`、`widget.component`、`slots`、`contextMenu`、`nestingRule`。
- `buildMaterials.mjs` 又把 material json 汇总成 bundle 和 `componentsMap`。
- `parseImport.js` 再根据 `componentsMap` 把 schema 里出现的 `componentName` 翻译成真实包名和导出名。
- `material-getter.ts` 则在设计时/预览时使用 `Mapper`、`window.TinyLowcodeComponent`、`window.blocks`、`defineAsyncComponent(loadBlockComponent)` 去解析真实组件。

这意味着 tiny 生态的低代码契约不是一个中心定义，而是一组跨仓、跨文件、跨阶段的协作协议。

### 9.3 这条差异的意义

这不是小事。

- Flux 的优势是契约收敛，修改一个 renderer 更容易同时收敛运行时、作者侧和宿主侧。
- Tiny 的优势是契约可拆层，组件库、物料、设置器、出码器可以相对独立演化。

代价也对应存在：

- Flux 更重，需要更强架构纪律。
- Tiny 更容易发生跨层 drift，需要更强生态协调。

### 9.4 证据锚点

- `docs/architecture/template-instantiation-and-node-identity.md`
- `docs/architecture/component-resolution.md`
- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flow-designer-renderers/src/designer-manifest.ts`
- `tiny-engine/designer-demo/public/mock/bundle.json`
- `tiny-engine/scripts/buildMaterials.mjs`
- `tiny-engine/packages/canvas/render/src/material-function/material-getter.ts`
- `tiny-engine/packages/vue-generator/src/generator/vue/sfc/parseImport.js`
- `tiny-vue/packages/vue/src/button/src/index.ts`
- `tiny-vue/packages/vue/src/button/src/pc.vue`

---

## 10. 扩展面: 语义扩展 vs 工作台扩展

### 10.1 `nop-chaos-flux`: 语义扩展更强

Flux 的扩展面主要体现在：

- renderer definitions
- action namespace
- host capability projection manifest
- `xui:imports`
- component handle registry
- schema compiler diagnostics

这些扩展点大多能进入编译器或运行时正式边界，因此具备：

- 更好的静态约束
- 更好的工具发现能力
- 更少的隐式全局依赖

### 10.2 `tiny-engine + tiny-vue`: 平台扩展更强

tiny 生态的扩展面则非常宽：

- registry: `root / config / layout / themes / toolbars / plugins / settings / canvas`
- MetaService / MetaApp 分离
- configurator registry
- material bundle
- codegen plugins
- tiny-vue renderless / designConfig / theme presets / runtime bundles

这使得它很适合构造不同发行版、不同 UI 工作台、不同 codegen 定制路线。

### 10.3 二者擅长的“扩展”不是一回事

- Flux 擅长的是**运行时语言和宿主协议扩展**。
- Tiny 生态擅长的是**工作台、物料、组件和交付流程扩展**。

这里还要补一个在本次审阅后必须写清的区分：

- 在 Flux 里，`hostContract` / manifest 负责的是 host boundary: projection、capability、version 与编译期校验。
- 在 Flux 里，实际显示出来的工作台内容并不由 manifest 描述；更准确的说法是：各 host family 采用“内置缺省 UI + 选定区域允许 owner schema / domain config 差量覆盖”的模式。
- Flow Designer / Report Designer 等当前已经暴露出明确的 schema/config override 面，例如：
  - `designer-page.toolbar / inspector / dialogs: SchemaInput`
  - `NodeTypeConfig.body / inspector.body / createDialog.body / quickActions: SchemaInput`
  - `report-designer-page.toolbar / fieldPanel / inspector / dialogs: SchemaInput`
- live code 也按“默认内置 + 差量覆盖”这条线工作：`packages/flow-designer-renderers/src/designer-page.tsx`、`designer-inspector.tsx`、`packages/report-designer-renderers/src/page-renderer.tsx`、`packages/word-editor-renderers/src/word-editor-page.tsx` 都保留了 built-in default UI，同时对选定区域开放 schema/config override。

所以如果要把 tiny 的统一 workbench registry 哲学对位到 Flux，更准确的说法不是“Flux 也缺一个 registry”，而是：

- Flux 已经把 tiny registry 里混在一起的几类职责拆开了
- host boundary -> manifest
- visible workbench content -> built-in default UI + schema/config override surfaces
- shell reuse -> `WorkbenchShell`
- 默认 baseline 与 override 入口装配 -> loader / tooling / owner renderer

### 10.4 证据锚点

- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flow-designer-renderers/src/designer-manifest.ts`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/config-schema.md`
- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flow-designer-renderers/src/designer-inspector.tsx`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `tiny-engine/docs/extension-capabilities-overview/registry.md`
- `tiny-engine/docs/extension-capabilities-overview/meta-services-and-meta-apps.md`
- `tiny-engine/packages/register/src/service.ts`
- `tiny-engine/designer-demo/registry.js`
- `tiny-vue/AGENTS.md`

---

## 11. 复杂设计器与复杂宿主的承载方式

### 11.1 `nop-chaos-flux`: 复杂设计器是领域 runtime

从包结构和文档路由可以看出，Flow/Report/Spreadsheet/Word 在 Flux 中不是普通插件，而是架构级子系统：

- `flow-designer-core` / `flow-designer-renderers`
- `report-designer-core` / `report-designer-renderers`
- `spreadsheet-core` / `spreadsheet-renderers`
- `word-editor-core` / `word-editor-renderers`

这说明它承认一个事实：复杂设计器应该拥有自己的 core，而不是永远当成工作台壳上的小插件。

更重要的是，在 Flux 里这些复杂设计器并不是靠一个统一工作台注册表来定义可见内容。以当前仓库可见证据看：

- `designer-page`、`report-designer-page`、`word-editor-page` 这类 host family 都已经暴露出一部分可由 schema/config 覆盖的区域
- Flow Designer 的节点正文、节点 inspector、创建对话框、quick actions 也都是 `SchemaInput`
- 但这不等于所有工作台可见内容都必须 schema 化；更准确的说法是 Flux 把“默认内置什么、哪些区域允许覆盖”当成 host family 自己的 contract，而不是 manifest 或 plugin 壳层问题

这条边界很关键：

- `hostContract` 负责的是宿主边界与校验
- `SchemaInput` / domain config 负责的是选定区域的差量覆盖内容；built-in default UI 仍由 owner renderer 保留

### 11.2 `tiny-engine`: 复杂能力更多通过统一工作台接线

Tiny 这边并非没有复杂宿主结构。`packages/canvas/README.md` 已经说明：

- canvas-container 与 canvas 是分离构建的
- 真正 canvas 在 iframe 中渲染
- 内外依赖和 Vue 版本可以解耦

这其实是很强的宿主设计决定。

但至少在本次审阅到的 `tiny-engine + tiny-vue` 代码范围内，tiny-engine 仍然优先把复杂能力放到统一设计器工作台、统一 registry、统一 plugin/setter 体系里，而不是拆成多个一等领域 kernel。

### 11.3 判断

- Flux 更适合承载“强领域、强语义”的 designer runtime，并为这些 designer family 提供可收敛到同一通用异构设计器内核的 runtime support。
- Tiny 更适合承载“统一工作台中的多种产品能力模块”。

### 11.4 证据锚点

- `docs/index.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/report-designer/design.md`
- `tiny-engine/packages/canvas/README.md`
- `tiny-engine/designer-demo/registry.js`

---

## 12. 代码生成、预览、部署与运行时独立性

### 12.1 `nop-chaos-flux`: runtime-first

Flux 的设计哲学是：schema 本身就是执行契约，runtime 是首要交付形态。

这使它更适合：

- 让 schema 持续在线执行
- 在宿主中嵌入统一 runtime
- 围绕 runtime 做 diagnostics、debugger、host capability

### 12.2 `tiny-engine + tiny-vue`: workbench-first + codegen-first

Tiny 明显更重视这条链：

`设计器 -> 预览 -> 生成源码 -> 交付应用`

几个证据非常直白：

- `packages/vue-generator/README.md` 把 codegen plugin pipeline 作为正式公开能力。
- `generateApp.js` 里 `transformStart / transform / transformEnd` 是一级扩展点。
- `generate.js` 会在预览时生成 `locales.js`、`dataSource.js`、`stores.js`、`bridge.js`、`utils.js`。
- 默认模板 `packageJson.js` 生成的是一个普通 Vue 项目，而不是要求继续依赖 engine runtime。

进一步看生成物，Tiny 的交付链已经隐含了一套“生成后应用运行时分解”：

- `genPagePlugin.js` 生成页面 Vue SFC
- `genGlobalState.js` 生成 Pinia store
- `genDataSourcePlugin.js` 生成 dataSource 配置
- 模板 `packageJson.js` 生成最终应用依赖

这说明 Tiny 的运行时独立性不是一句口号，而是建立在“把低代码语义拆进普通 Vue 工程结构”的架构选择上。

### 12.3 预览路径也说明了这种哲学

Tiny 的预览不是“同一个 runtime 换个壳”，而是一套独立的 preview assembly：

- import map
- 运行时依赖拼装
- 预览 helper 文件生成
- iframe canvas

这对产品交付很友好，但也意味着设计时与真正运行时之间天然存在额外转换层。

### 12.4 结论

- 在本次审阅范围内，若你关心“schema 持续是最终执行契约”，Flux 覆盖得更系统化。
- 以当前仓库可见证据看，若你关心“设计器主要是生产代码的上游工具”，Tiny 生态覆盖得更系统化。

### 12.5 证据锚点

- `docs/architecture/frontend-programming-model.md`
- `tiny-engine/packages/vue-generator/README.md`
- `tiny-engine/packages/vue-generator/src/generator/generateApp.js`
- `tiny-engine/packages/design-core/src/preview/src/preview/generate.js`
- `tiny-engine/packages/design-core/src/preview/src/preview/importMap.js`
- `tiny-engine/packages/vue-generator/src/templates/vue-template/templateFiles/packageJson.js`
- `tiny-engine/packages/vue-generator/src/plugins/genPagePlugin.js`
- `tiny-engine/packages/vue-generator/src/plugins/genGlobalState.js`
- `tiny-engine/packages/vue-generator/src/plugins/genDataSourcePlugin.js`

---

## 13. 主题、样式、设计系统与兼容性策略

### 13.1 `nop-chaos-flux`: 主题是 CSS contract，不是 runtime state

`docs/architecture/theme-compatibility.md` 明确写出：

`theme compatibility is a CSS contract, not a runtime provider contract`

也就是说：

- 主题不进入 `RendererEnv`
- 不进入 `ScopeRef`
- 不进入 `ActionScope`
- 不进入 `PageRuntime` / `FormRuntime`

这种方式非常适合嵌入式 host integration 和多宿主场景。

### 13.2 `tiny-engine + tiny-vue`: 设计系统资源是完整生态的一部分

tiny 生态在这一点上走的是另一条路线：

- `tiny-engine/packages/design-core/src/init.js` 用 `TinyThemeTool` 初始化主题，从 `localStorage` 读取主题，再写回 `document.documentElement[data-theme]`。
- `tiny-vue` 有 `theme`、`theme-saas`、`design/*`、`vue-runtime` 等多个设计系统相关包。
- 组件内部直接 import 各自主题样式，例如 `@opentiny/vue-theme/button/index.less`。

这种方式更利于做一个完整、统一、视觉风格强的组件生态，但 runtime 上更耦合设计系统设施。

### 13.3 兼容性策略也不同

`tiny-vue/README.md` 和 `AGENTS.md` 明确强调：

- Vue 2.6 / 2.7 / 3 共存
- PC / Mobile 共存
- Renderless 保持逻辑复用

而 Flux 明显选择了更现代、更收敛的运行时基线：React 19、TypeScript strict、Vite 8、Tailwind v4、shadcn/ui。

### 13.4 取舍

- Flux 的优势是内核纯度与 host theme 兼容性。
- Tiny 生态的优势是组件设计系统完备度与兼容范围。

### 13.5 证据锚点

- `docs/architecture/theme-compatibility.md`
- `tiny-engine/packages/design-core/src/init.js`
- `tiny-vue/README.md`
- `tiny-vue/AGENTS.md`
- `tiny-vue/packages/vue/src/button/src/pc.vue`
- `tiny-vue/packages/vue-runtime/README.md`

---

## 14. 安全边界与信任模型

### 14.1 `nop-chaos-flux`: 显式收紧信任边界

Flux 在安全文档中给出了一组很清楚的底线：

- 禁止 `new Function`
- 禁止 `eval`
- 禁止 `with(scope)` 风格执行
- 权限裁剪应在上游平台完成，不由 runtime 做权限表达式计算
- action namespace 必须显式解析，不允许退化成全局可变注册表

这代表它在架构上把“低代码表达能力”和“任意代码执行能力”严格分开。

### 14.2 `tiny-engine + tiny-vue`: 更宽的作者权力，也意味着更宽的信任边界

在 tiny 生态中：

- `parser.ts` 通过 `with($scope)` 运行表达式。
- `parseJSFunction` / `parseJSXFunction` 会动态构造函数。
- `generate.js` 用 `Function(...)` 校验和生成函数字符串。
- `material-getter.ts` 依赖 `window.TinyLowcodeComponent`、`window.blocks` 和异步 block blob import。

这显然给了作者和平台更高自由度，但也意味着：

- 如果 schema / material / JSFunction 来源不可信，风险更大。
- 系统默认更适合“内部平台、受控作者”的信任模型。

### 14.3 判断

- Flux 更适合把 runtime 当作需要正式安全审查的执行内核。
- Tiny 生态更适合受控环境里的高灵活度平台。

### 14.4 证据锚点

- `docs/architecture/security-design-requirements.md`
- `tiny-engine/packages/canvas/render/src/data-function/parser.ts`
- `tiny-engine/packages/design-core/src/preview/src/preview/generate.js`
- `tiny-engine/packages/canvas/render/src/material-function/material-getter.ts`

---

## 15. 性能模型与扩展到大规模时的成本

### 15.1 `nop-chaos-flux`: 热路径约束更明确

在本次审阅范围内，Flux 在性能相关架构形态上有三个更明确的特征：

1. compile once, execute many
2. selective subscription 与 dependency tracking
3. owner 和 identity 都是正式概念，因此更容易做局部优化

`docs/architecture/performance-design-requirements.md` 甚至把很多性能规则写成了强约束，而不是“以后再看”。

### 15.2 `tiny-engine + tiny-vue`: 兼容性与工作台需求会提高运行时成本

tiny 生态的热路径里有更多动态工作：

- canvas 渲染时反复做 `parseData`
- 动态 condition 与 loop 展开
- slot/template 分组
- design mode 事件拦截和 marker 注入
- 组件解析依赖 `Mapper + window.* + block loader`

此外 `tiny-vue` 自身还承担了：

- Vue 2 / Vue 3 兼容
- PC / Mobile 模式
- renderless -> template 的多层封装

这不一定意味着慢，但意味着它更像一个“为兼容性和产品性支付额外复杂度”的系统，而不是一个“从内核开始为 hot path 收紧语义面”的系统。

### 15.3 另一种理解

Flux 更擅长把性能优化做成运行时原则。

Tiny 生态更擅长把兼容性、组件生态与设计器体验放在第一位，再在工程上补足性能。这里更准确的理解应是“架构上更动态、更分布式”，而不是已经由基准测试证明“整体性能更差”。

### 15.4 证据锚点

- `docs/architecture/performance-design-requirements.md`
- `docs/architecture/dependency-tracking.md`
- `packages/flux-react/src/node-renderer.tsx`
- `tiny-engine/packages/canvas/render/src/render.ts`
- `tiny-engine/packages/canvas/render/src/data-function/parser.ts`
- `tiny-vue/README.md`

---

## 16. 可观测性、调试能力与 AI 可操作性补充观察

这一节是补充观察，不与前面的执行模型、数据模型、扩展模型和交付模型等核心架构维度等权。

### 16.1 `nop-chaos-flux`: 调试与自动化操作面覆盖更系统化

Flux 在这个维度上很突出：

- `AGENTS.md` 是 repo-local maintainer operating manual
- `docs/index.md` 是 docs routing baseline
- `docs/references/maintenance-checklist.md` 把文档同步工程化
- `docs/architecture/debugger-runtime.md` 直接公开 automation API 与 explain-oriented API

尤其是 debugger 的这些方法：

- `getSnapshot()`
- `inspectByCid()`
- `inspectByElement()`
- `explainNodeValue()`
- `explainNodeMeta()`
- `explainNodeFailure()`
- `explainNodeAsync()`

这意味着它不仅能让人调试，也在主动为自动化系统和 AI agent 提供较低歧义的操作面。

### 16.2 `tiny-engine + tiny-vue`: 自动化与 AI 相关支持分布在不同仓位

Tiny 生态在这方面不能一概而论。

`tiny-engine`：

- 有公开贡献流程、PR 模板、issue 模板、CI
- 但缺少类似 `docs/index.md + AGENTS.md + debugger automation contract` 这样的一体化维护操作面

`tiny-vue`：

- 有独立 `AGENTS.md`
- README 公开了 `tiny-vue-skill`
- 有 GPT review workflow
- 有相对清晰的 Renderless 约束和测试规则

因此更准确的结论是：

- tiny 生态在“AI 辅助组件库开发”和“OSS 工作流自动化”上并不弱。
- 但在“低代码 runtime/debugger 的 explainability 和 agent-operable architecture”上，以当前仓库可见证据看，`tiny-engine` 文档与代码中没有发现与 Flux debugger automation contract 对应的正式机制。

### 16.3 证据锚点

- `AGENTS.md`
- `docs/index.md`
- `docs/references/maintenance-checklist.md`
- `docs/architecture/debugger-runtime.md`
- `tiny-engine/.github/PULL_REQUEST_TEMPLATE.md`
- `tiny-vue/AGENTS.md`
- `tiny-vue/README.md`
- `tiny-vue/.github/workflows/gpt-ci.yaml`

---

## 17. 工程治理、测试、文档与组织扩展性补充观察

这一节同样是补充观察，主要讨论协作与治理成本，不与前面的核心执行语义判断等权。

### 17.1 `nop-chaos-flux`: 单仓收敛能力强

Flux 的优势在于单仓 convergence：

- runtime、react、renderers、designers、docs、tests 都在一个收敛空间
- root scripts 统一提供 `typecheck/build/test/lint/test:e2e`
- 文档 owner 体系明确
- daily logs、analysis、plans、architecture docs 形成完整维护闭环

这使它在本次审阅范围内非常适合一个强调架构一致性的内部平台团队。

### 17.2 `tiny-engine + tiny-vue`: 生态拆仓更利于专业分工，但合同同步成本更高

Tiny 生态的好处是：

- 组件库团队可以独立演化 `tiny-vue`
- 设计器团队可以独立演化 `tiny-engine`
- 工作台、物料、组件生态、出码器可以由不同角色分别负责

但代价也明显：

- 组件源码、低代码物料元数据、设置器、出码映射分散在不同位置
- 版本协调是跨仓问题，而不是单仓问题
- engine 的 CI 与 tiny-vue 的 CI 不在同一个治理闭环里

### 17.3 测试成熟度也要分层看

之前只看 `tiny-engine` 会得出“测试很弱”的判断，这不完整。

- `tiny-engine` 的 root test / typecheck / CI 仍偏轻，而且文档与脚本确实存在可验证漂移，例如 `docs/development-getting-started/dev-quick-start.md` 仍写 `pnpm dev:demo`，`CONTRIBUTING.md` 仍写 `npm install` / `npm run serve`，而 root `package.json` 的实际命令是 `pnpm dev`、`serve:frontend`、`serve:backend`。
- `tiny-vue` 则已经有更完整的 unit/E2E workflow、AGENTS、测试触发规范。

因此生态整体的工程成熟度高于 `tiny-engine` 单仓，但以当前仓库可见证据看，仍弱于 Flux 在“单一语义内核全链收敛”上的系统化程度。

### 17.4 一个很关键的组织结论

- Flux 更适合一个高架构纪律的核心平台团队。
- Tiny 生态更适合组件库团队、设计器团队、物料团队分工协作的组织结构。

### 17.5 证据锚点

- `package.json`
- `docs/index.md`
- `docs/logs/index.md`
- `tiny-engine/package.json`
- `tiny-engine/.github/workflows/push-check.yml`
- `tiny-vue/package.json`
- `tiny-vue/.github/workflows/test-unit-pr.yml`
- `tiny-vue/AGENTS.md`

---

## 18. 强项、成本与适用场景

### 18.1 如果强行压缩成三句判断

- 设计水平: 各胜一面；若重点看执行模型与抽象密度，Flux 更强；若重点看工作台、生态和交付链设计，Tiny 生态更强。
- 架构水平: 在本次审阅范围内，Flux 更高。原因不是功能更多，而是核心执行语义、边界和契约更集中。
- 编码水平: 需要拆开看。以当前仓库可见证据看，Flux 核心代码整体最干净一致，`tiny-vue` 体现出成熟组件库工程能力，`tiny-engine` 则更像承担平台胶水、动态装配和历史兼容负担的工程层。

| 维度                           | nop-chaos-flux 更强的地方                                                                                                                                                                  | tiny-engine + tiny-vue 更强的地方                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| 运行时语义                     | 在本次审阅范围内，compile/runtime 边界、owner 语义、action algebra、dependency tracking 更集中                                                                                             | 语义更多分布在 canvas 解释器、material protocol、codegen 和生成后 Vue 应用运行链里      |
| 设计器工作台                   | 复杂 designer 可共享同一套 runtime support；更准确地说，Flux 仍是 execution/runtime core，但它已经为通用异构设计器内核提供了“内置缺省 UI + 选定区域 schema/config 覆盖”的清晰支撑 contract | 以当前仓库可见证据看，registry、plugins、toolbars、settings、configurators 覆盖更系统化 |
| 组件与设计系统生态             | 当前更偏 runtime/renderers 自有体系                                                                                                                                                        | `tiny-vue` 的组件、主题、图标、运行时资源更完整                                         |
| 出码与交付                     | 不是当前中心叙事                                                                                                                                                                           | codegen pipeline 与 deploy-without-engine 路线更完整                                    |
| 嵌入式宿主与 host contract     | 在本次审阅范围内，host projection/capability manifest 更清晰                                                                                                                               | 更偏产品型工作台集成                                                                    |
| 安全与信任边界                 | 更严格、更明确                                                                                                                                                                             | 更灵活，但边界更宽                                                                      |
| 可观测性与 AI 可操作性（补充） | debugger automation + owner docs 覆盖更系统化                                                                                                                                              | tiny-vue 对 AI 辅助组件开发更友好，但 engine runtime explainability 较弱                |
| 组织模式                       | 单仓语义收敛强                                                                                                                                                                             | 分仓生态与专业分工更自然                                                                |

### 18.2 更适合参考 `nop-chaos-flux` 的情况

- 你要做的是低代码执行内核，不是单纯设计器产品
- 你需要统一 action、validation、scope、host integration 语义
- 你希望自动化系统或 AI agent 能参与长期维护与调试，且这不是唯一主导因素
- 你预期未来会有多个复杂领域设计器在同一执行模型上共存

### 18.3 更适合参考 `tiny-engine + tiny-vue` 的情况

- 你要尽快搭建可二开的设计器工作台
- 你重视物料协议、设置器、插件面板、工具栏布局
- 你希望直接导出可部署 Vue 应用
- 你已经拥有或计划构建一个大型 Vue 组件/主题生态

---

## 19. 双方最值得互相借鉴的点

### 19.1 `nop-chaos-flux` 可以借鉴 tiny 生态

- 更成熟的 loader/tooling 层工作台 baseline 生成能力，但前提仍是围绕现有 override 面做差量配置，而不是要求把所有默认 UI 转成 registry 驱动或全量 schema 化
- 更面向生态贡献者的插件/设置器/工具栏故事
- 更成熟的 schema-to-code plugin pipeline
- 更强的组件库/主题生态包装能力

### 19.2 `tiny-engine + tiny-vue` 可以借鉴 Flux

- 更高密度的 contract locality
- 更明确的 compile-time / runtime / host boundary
- 更正式的 action/control-flow/validation owner 模型
- 更强的 debugger automation 和 explainability
- 更强的 docs routing 与 owner-doc 维护体系

---

## 20. 最稳健的结论

1. 这不是 `tiny-engine` 单仓对 `nop-chaos-flux` 单仓的公平对比，公平边界必须是 `tiny-engine + tiny-vue` 生态。
2. 在本次审阅范围内，`nop-chaos-flux` 的核心竞争力不只在“把低代码执行语义做成正式 runtime architecture”，也在于它已经为可承载多种文档模型与交互模型的通用异构设计器内核提供了统一 runtime support。
3. 以当前仓库可见证据看，`tiny-engine + tiny-vue` 的核心竞争力在“把低代码设计器、组件生态、物料协议和代码生成做成可组合生态”。
4. Flux 的架构更集中，Tiny 生态的架构更分布。
5. 更具体地说，Flux 更接近“schema/compiled program 作为稳定执行契约”，Tiny 更接近“schema + materials/componentsMap + preview assembly + generated app 作为分布式契约”。
6. 如果强行比较设计水平，那么更准确的说法不是“谁全面碾压谁”，而是 Flux 更强于执行模型与系统抽象设计，Tiny 生态更强于工作台、组件生态与交付链设计。
7. 如果强行比较架构水平，那么在本次审阅范围内，Flux 更高，因为它把 compile/runtime/host contract、owner semantics 和依赖追踪更系统化地收敛成了一套统一内核。
8. 如果强行比较编码水平，那么以当前仓库可见证据看，Flux 核心代码整体更现代、更一致，`tiny-vue` 体现出成熟组件库工程能力，`tiny-engine` 则更像承担平台胶水、动态装配和历史兼容负担的工程层。
9. 在数据 owner、依赖追踪、动作代数、宿主能力 manifest、以及“manifest 只负责边界，host family 自己定义默认 UI 与 override 面”这类边界清晰度维度上，Flux 在本次审阅范围内更占优。
10. 在 registry、插件面板、设置器、物料 bundle、组件生态、主题资源、导出源码交付这些维度上，Tiny 生态在本次审阅范围内更占优。
11. Tiny 的低代码契约不是只来自 `tiny-vue` 源码，也不是只来自独立 material protocol；以当前仓库可见证据看，它更像由 material protocol、preview assembly、codegen 映射和生成后应用共同组成的分布式契约。这是它灵活性的来源之一，也是 drift 风险的来源之一。
12. Flux 的单仓 owner-doc 与统一 runtime 让长期语义收敛更容易，但也意味着更高的抽象与维护门槛。
13. Tiny 生态的分仓与分层让专业分工更自然，但也把版本协调、物料契约、组件契约和出码契约分散成跨仓治理问题。
14. 若目标是“运行时长期可解释、可验证、并具备更系统化的自动化操作面”，Flux 在本次审阅范围内更适合作为优先参考。
15. 若目标是“设计器快速产品化、组件生态复用、交付为普通 Vue 工程”，Tiny 生态在本次审阅范围内更适合作为优先参考。

### 20.1 限定语

以上结论应理解为“基于本次审阅到的 `nop-chaos-flux`、`tiny-engine`、`tiny-vue` 三个仓库当前代码与文档状态的相对判断”，而不是对整个 OpenTiny 外围生态或未来演进路径的绝对判定。

---

## 21. 附: 本文使用的关键一级证据

### `nop-chaos-flux`

- `docs/index.md`
- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/data-domain-owner.md`
- `docs/architecture/dependency-tracking.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/action-algebra-formal-spec.md`
- `docs/architecture/template-instantiation-and-node-identity.md`
- `docs/architecture/component-resolution.md`
- `docs/architecture/theme-compatibility.md`
- `docs/architecture/security-design-requirements.md`
- `docs/architecture/performance-design-requirements.md`
- `docs/architecture/debugger-runtime.md`
- `packages/flux-compiler/src/schema-compiler.ts`
- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts`
- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flow-designer-renderers/src/designer-manifest.ts`

### `tiny-engine`

- `README.md`
- `docs/README.md`
- `docs/extension-capabilities-overview/registry.md`
- `docs/extension-capabilities-overview/meta-services-and-meta-apps.md`
- `packages/design-core/src/init.js`
- `packages/design-core/src/preview/src/preview/generate.js`
- `packages/design-core/src/preview/src/preview/importMap.js`
- `packages/register/src/service.ts`
- `packages/canvas/README.md`
- `packages/canvas/render/src/render.ts`
- `packages/canvas/render/src/data-function/parser.ts`
- `packages/canvas/render/src/material-function/material-getter.ts`
- `packages/plugins/materials/src/composable/useMaterial.ts`
- `packages/settings/props/src/composable/useProperties.ts`
- `packages/toolbars/save/src/js/index.ts`
- `packages/vue-generator/README.md`
- `packages/vue-generator/src/generator/generateApp.js`
- `packages/vue-generator/src/generator/vue/sfc/parseImport.js`
- `packages/vue-generator/src/plugins/genPagePlugin.js`
- `packages/vue-generator/src/plugins/genGlobalState.js`
- `packages/vue-generator/src/plugins/genDataSourcePlugin.js`
- `packages/vue-generator/src/templates/vue-template/templateFiles/packageJson.js`
- `designer-demo/registry.js`
- `designer-demo/public/mock/bundle.json`
- `scripts/buildMaterials.mjs`

### `tiny-vue`

- `README.md`
- `AGENTS.md`
- `PACKAGES.md`
- `package.json`
- `packages/vue/src/button/src/index.ts`
- `packages/vue/src/button/src/pc.vue`
- `packages/renderless/src/button/vue.ts`
- `packages/vue-common/src/index.ts`
- `packages/vue-runtime/README.md`
- `packages/vue/src/tree/src/pc.vue`
- `packages/vue/src/tree/src/tree-node.vue`
- `.github/workflows/test-unit-pr.yml`
- `.github/workflows/gpt-ci.yaml`
