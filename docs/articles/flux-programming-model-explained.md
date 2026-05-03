# Flux 编程模型：打破低代码框架的思维定式

> 本文的目标读者：已经快速浏览过 `docs/architecture/frontend-programming-model.md`、但仍没把各份规范拼成完整执行模型的开发者或 AI。
>
> 如果你带着"这是又一个低代码渲染框架"的预期来阅读 Flux 代码，你会困惑于很多设计选择。本文试图帮助你建立正确的心智模型。

**相关文档导航：**

- 如果你想了解 Flux 的设计决策和工程动机，先阅读 [`docs/articles/flux-design-introduction.md`](./flux-design-introduction.md)
- 如果你需要查阅具体接口和契约，阅读 `docs/architecture/` 目录下的规范文档
- 本文的目标是帮助你在继续深入窄领域规范文档之前建立统一心智模型
- 如果本文与规范文档冲突，以 `docs/architecture/frontend-programming-model.md` 及对应窄领域架构文档为准

## 1. 理解 Flux 的第一步：它首先是前端 DSL 运行时

从产品定位看，Flux 当然服务于低代码平台；但从架构理解上，不要只把它想成"浏览器里做动态组装的低代码框架"。

当我们说"低代码框架"时，通常想到的是：用户拖拽组件 → 生成配置 → 框架解释配置 → 渲染 UI。框架在运行时做大量的"组装"工作——判断条件、选择分支、动态构建组件树。

Flux 不在这个方向上。它的核心定义是：**Final Execution Schema frontend runtime**。

"Final Execution Schema"意味着：当 JSON schema 到达 Flux 时，继承展开、默认值补齐、静态裁剪、i18n 替换等结构性决策原则上已经完成。Flux 不重新打开一套 loader 风格的结构装配流程。它收到的是一个**已经进入执行边界的程序**，核心职责是执行。

这并不意味着运行时完全没有结构语义。`when`、`loop`、`dynamic-renderer` 这类能力仍然在 Flux 内部执行；但它们属于 execution model 中受控的结构激活或实例化，不是重新在浏览器里做继承、权限过滤或模块合并。

这就像 JVM 之于 Java 编译器的关系：

- Java 编译器负责语法分析、类型检查、优化、生成字节码
- JVM 只负责执行字节码

类似地：

- loader / assembly 层负责 schema 的分解合并、默认展开、静态裁剪、i18n 替换等结构性决策
- 在 Nop 平台里，这层通常由平台侧承担；Flux 主要负责执行最终的、已进入执行边界的 schema

混淆这两层的代价很直接：如果你把 Flux 当作"低代码框架"来理解，你会期望在 Flux 内部找到模块系统、权限控制、国际化机制。你找不到，然后你会困惑：这个框架是不是功能不完整？

不是。这些功能在 Flux 之外，在平台层。Flux 的"功能不完整"正是它的设计目标：**单一职责，只做执行**。

### 声明式边界继续前移，但不是把一切都塞进 schema

对读者来说，更重要的问题不是抽象地判断“Flux 到底有多声明式”，而是：**哪些东西应该进入 schema，哪些东西不应该进入 Flux core**。

从更宏观的视角看，Flux 的设计反映了前端框架发展的一个趋势：**从命令式向声明式的范式转换**。

命令式编程关注"路径"——如何一步步修改状态到达目标。声明式编程关注"端点"——描述目标状态，让系统自动推导路径。

早期的 jQuery 是命令式的：你手动操作 DOM，手动管理状态变化。React 带来了声明式的 UI：你描述"UI 应该是什么样子"，React 自动计算 diff 和更新。

Flux 把这个趋势继续向前推进：**大量作者可见的结构、值、资源、反应和动作都可以在 schema 中表达**。Flux 作为运行时，负责把这部分声明执行出来。

但这不是说“整个前端系统的一切都在 schema 里”。协作协议、session/workbench shell、高频手势循环、领域算法、宿主 bridge/controller 等，仍然在 Flux core 之外。它们只通过 `Host Projection` 与 `Capability` 这类窄边界进入系统；其中显式实例 targeting 也是 `Capability` 的一种解析路径。

所以 Flux 可以被理解为一个"执行 DSL 的虚拟机"：它执行的是**最终执行切片**，不是整个平台的全部实现。对 schema 作者可见的输入输出，尽量通过统一边界进出；超出这层的宿主与领域复杂性，则保持在 core 之外。

## 2. 七原语不是功能分类，而是必须分清的七类核心语义角色

Flux 的核心架构文档定义了七个原语：Template、ScopeRef、Value、Resource、Reaction、Capability、Host Projection。

初次阅读时，很容易把它们当作"功能模块的分类"：这个管渲染、这个管数据、这个管副作用。但这只触及了表面。

规范文档把七原语定义为一个闭合 primitive set。对读代码的人来说，更直接的理解是：**你必须把这七类语义角色分开看**，否则就会把结构、数据可见性、值派生、值生产、观察后果、效果权限和宿主快照混成一团。

逐一看它们的**语义角色**，而不是功能描述：

### Template — 编译期产出的不可变程序定义

Template 是编译期产出的不可变结构定义。运行时从不修改 Template，只消费和实例化它。在当前实现中，它主要由 `CompiledTemplate` / `TemplateNode` 承载。

Template 的物理形态不限于树。当前实现中它是 `TemplateNode` 层级树；实验性 IR 设计中它是 `ExecutionPackage.templates` 扁平表加引用关系。无论哪种形态，Template 的核心语义不变：**编译一次，实例化零或多次**。一个 Template 可以被多次实例化（如 loop 中的重复项、dialog 中的表单），每次产生独立的 `NodeInstance` 和运行时状态。`templateNodeId` 标识编译结构身份，`cid` 标识当前挂载的 live instance。

需要注意的是，Template 不负责开放式 runtime 组装。运行时允许的是对已进入 execution model 的结构做**受控激活或实例化**，例如 `when` 的结构参与、`loop` 的重复实例化、`dynamic-renderer` 的受控延迟片段装配；它不是重新打开 authoring/loader 阶段的继承或模块合并。

### ScopeRef — 词法作用域

ScopeRef 不是"数据容器"，它是**词法作用域**的具体实现。

在编程语言中，词法作用域决定了变量名如何解析：从当前作用域开始查找，找不到就到父作用域，直到全局作用域。JavaScript 的闭包、Python 的 LEGB 规则，都是词法作用域的实现。

ScopeRef 做的是同样的事情：当表达式中引用 `${user.name}` 时，运行时从当前 ScopeRef 开始查找 `user`，找不到就沿着 `parent` 链向上查找。

这意味着：**schema 中的变量引用，遵循的是词法作用域规则，而不是 DOM 结构或组件树**。一个深层嵌套的组件，可以直接访问其词法父作用域中的变量，不需要 props drilling。

### Value — 表达式求值

Value 是**表达式求值**的结果。`${1 + 2}` 是一个 Value，`${user.name}` 是一个 Value，`"Hello, ${name}"` 模板字符串也是一个 Value。

简单说，Value 是**纯计算**，没有副作用。给定相同的作用域状态，Value 总是返回相同的结果。

### Resource — 运行时拥有的值生产

Resource 不是"数据"，而是**值的生产过程**。API 请求是最常见的例子：它发起请求、等待响应、返回结果。请求过程中它有状态（loading/success/error），请求完成后它有值。

但要注意，`Resource` 的定义重点不是“它一定异步”，而是：**它的生产、发布、失效和刷新语义由 runtime 拥有**。很多常见 Resource 尤其是 API-backed producer 会表现为异步且有状态，这也是最容易理解的形态。

这里要特别小心，不要把 `Resource` 和 `Capability` 混成一件事。可以用一个简单分工来理解：

- **Capability** 决定“作者可见副作用通过哪条 authority path 进入执行边界、由谁解析和执行”
- **Resource** 决定“这个交互在 Flux 内部如何被生命周期化、状态化，并发布为值”

以 API 请求为例：

- 真正跨到宿主 transport boundary 时，会落到 `env.fetcher` 这类 host wiring；这一侧属于 effect authority / host execution boundary
- 何时开始、何时取消、如何暴露 `loading/data/error`、如何 refresh/invalidate，是 `Resource` 的职责

如果你熟悉 Effect 系统（如 ZIO、Cats Effect），可以把 Resource 粗略类比为“被运行时拥有和管理的值生产描述”；但它的语义重点不是一般化 effect 编排，而是**发布一个 Logical Value**。

### 一个有用但必须收住的类比：Resource ≈ computed 的运行时扩展

这只是帮助理解的类比，Flux 并不存在规范意义上的 `computed` 原语。

如果你从响应式编程的角度来理解，这个关系会更清晰：

- `computed` 是对**同步函数**的 Ref 封装：`computed(() => a + b)` 包装了一个同步计算
- 常见的 API-backed `Resource` 可以近似看成对**异步值生产**的运行时封装：`api({ url: '/user' })` 是一个最直观的例子

两者都是"值的生产者"，都支持依赖追踪和自动更新。区别只在于：`computed` 这个类比对象是同步派生值；`Resource` 则是 runtime-owned 的值生产与发布单元，通常带有 status / refresh / invalidation 语义，并且常常会通过 capability boundary 触发实际的外部生产过程。

沿着这条线看 Flux 响应式系统的演化路径：从简单的响应式绑定（`${a + b}`），到同步派生值类比，再到 runtime-owned 的值生产单元，是一条自然的扩展线。

但 Resource 的完整语义仍然超出这个类比。Resource 还拥有：

- **词法所有权**（lexical ownership）：Resource 归属于某个词法 scope；实现上通常由 runtime 以 `ScopeRef.id` 为 key 管理 sidecar registry，而不是把行为方法塞回 `ScopeRef`
- **状态语义**（status semantics）：loading/success/error，不只是值
- **刷新/失效机制**（refresh/invalidation）：可以手动触发重新获取

这些特性使 Resource 成为一个完整的"runtime-owned 值生产者"抽象，而不仅仅是同步派生值的放大版。

### Reaction — 观察变化并排队后果

Reaction 是对状态变化的**声明式观察器**。当某个 Value 变化时，Reaction 会重新观察、判断条件，并在需要时排队后果。

真正跨入副作用边界时，仍然要通过 `Capability` 调度。也就是说，Reaction 负责的是“观察到变化后怎么办”的 runtime watch 语义，而不是绕过 Capability 直接执行外部效果。

重要的一点：Reaction 的生命周期由**词法作用域**决定，而不是 React 组件的挂载/卸载。更准确地说，它遵循 lexical ownership：当某个 scope 对应的 runtime sidecar bucket 被销毁时，该 scope 拥有的 Reaction 也会被清理。

这意味着 Flux 的响应式系统在语义上独立于 React 组件生命周期。当前实现通常仍通过 renderer/runtime wiring 注册这些 sidecar，但 React 只是 Flux 的一个渲染后端，不是它的核心本体。

### Capability — 效果权限

对大多数读者，先把 Capability 理解成一句最朴素的话：**schema 请求副作用权限的唯一入口**。

Capability 是 Flux 中理论色彩最浓的概念。

在 Algebraic Effects 的理论中，副作用不是直接执行的，而是"抛出"给上层的 handler 来处理。这让副作用变得可组合、可测试、可替换。

Flux 的 Capability 借鉴了这一思想（但并非完整的 effect handler 系统）：**schema 不能直接执行副作用，所有副作用都必须通过 Capability 解析出的 authority path 发生**。

对 schema 作者来说，更常见的入口是：`showToast`、`openDialog`、`component:submit`、`designer:addNode` 这类 action/capability path。

在这些路径之下，运行时还会继续落到更底层的 host boundary，例如 `env.fetcher`、`env.notify`、`env.importLoader`。也就是说，schema 面向的是 capability authority path，而 `env.*` 更多是宿主实现这些 path 时提供的底层接线能力。

这条 authority path 的主要解析形态包括 built-in capability、显式实例 targeting 和 namespaced action；更底层的宿主 bridge/controller 则保持为 host-private wiring，不直接暴露为 schema primitive。

**Schema → Capability 是单一效果路径**。这意味着：

1. Schema 的行为是可预测的——它能做的事情都通过 Capability 接口定义
2. 运行时与宿主对效果边界有清晰控制——可以实现、模拟、限制任何 Capability
3. 测试变得简单——mock 掉 Capability 就能测试 schema 的行为

### Host Projection — 宿主快照进入 schema 的只读入口

Host Projection 容易被误读。它不是“把 Flux 内部状态暴露给宿主的调试接口”，而是**把宿主拥有的只读快照投影进 schema 可见环境**。

例如复杂宿主可以把 `doc`、`selection`、`activeNode` 这类 host-owned snapshot 只读地提供给 schema。schema 可以读取这些值，但不能直接修改；写回仍然必须通过 `Capability`。

这里的 host 指承载 Flux 的上层应用、工作台或领域运行时，不等于浏览器本身，也不等于 React 本身。

调试器、自动化检查、host tooling API 则是另一层东西。它们可以消费 runtime 的 inspection surface，但不属于 schema 可见 primitive 本身。

## 3. 为什么 Value / Resource / Reaction 必须区分？

在很多响应式框架中，computed 和 effect 是核心概念。Flux 把它们进一步细分为 Value、Resource、Reaction，原因是三者在运行时的处理方式完全不同。

### 依赖变化后，运行时对三者的处理不同

不需要从哲学层面证明三者有多\u201c优雅\u201d\u2014\u2014直接看依赖变化后 runtime 的行为差异。

可以把它们先粗略看成三种不同的运行时单元：

| 原语     | 你可以先把它理解成          | 依赖变化后 runtime 做什么                    |
| -------- | --------------------------- | -------------------------------------------- |
| Value    | 一个同步派生值              | 重新计算                                     |
| Resource | 一个 runtime-owned 值生产者 | 失效、取消、重算或刷新                       |
| Reaction | 一个声明式观察器            | 重新观察，并在需要时通过 Capability 排队后果 |

其中：

- **Value** 的重点是纯求值
- **Resource** 的重点是把值生产过程变成有生命周期、有状态、可发布的运行时实体
- **Reaction** 的重点是观察变化并决定是否跨入 effect path

### 因为它们对依赖变化的响应方式不同

| 原语     | 依赖变化时的行为                                 |
| -------- | ------------------------------------------------ |
| Value    | 同步重新计算，返回新值                           |
| Resource | 可能取消当前生产过程，重新开始生产               |
| Reaction | 重新观察，并在满足条件时通过 Capability 调度后果 |

考虑一个 API 请求的场景：

```json
{
  "type": "data-source",
  "action": "ajax",
  "args": { "url": "/api/user/${userId}" },
  "name": "user"
}
```

当 `userId` 变化时：

- 如果把它当作 Value（computed），会同步重新计算 URL——但这没有意义，URL 本身没用，我们需要的是请求结果
- 如果把它当作 Reaction（effect），会触发新请求——但旧请求可能还在进行中，需要取消
- 把它当作 Resource，运行时知道这是一个"值的生产过程"，可以：
  1. 取消正在进行的旧请求
  2. 发起新请求
  3. 在请求完成前保持 loading 状态
  4. 请求完成后更新值

这里的“发起新请求”仍然不是绕开 Capability 自己乱做网络访问；真正的 transport 仍然经由 fetch/capability boundary，只是 runtime 用 `Resource` 的语义把整个过程组织成一个可发布、可刷新、可失效的值生产者。

**Resource 的语义比 computed 或 effect 更精确**，它明确表达了"这是一个由 runtime 拥有、可发布、可失效、可刷新的值生产过程"；很多常见例子恰好表现为异步且有状态。

## 4. Template/Instance 分离是语义分离，不只是性能优化

很多框架也有"编译一次、实例化多次"的优化。Flux 的 Template/Instance 分离看起来类似，但动机不只是性能。

**Template 是程序定义，Instance 是程序执行。**

一个 Template 可以被多次实例化，每次实例化产生独立的运行时状态。这就像：

- 一个函数定义可以被多次调用，每次调用有独立的局部变量
- 一个类定义可以创建多个对象，每个对象有独立的字段

这种分离带来了几项能力：

1. **同一 schema 可以在多处渲染**，每处有独立的状态
2. **schema 可以递归引用自身**，因为每次引用创建新实例
3. **调试器可以追踪"这个实例是从哪个模板创建的"**

如果没有这种分离，schema 和运行时状态就会耦合在一起，上述能力都无法实现。

更具体地说：`templateNodeId` 标识编译结构，`cid` 标识当前挂载的 live node instance，`instancePath` 只在重复结构中补充结构上下文。

这里还要再加一个现实提醒：**Template/Instance 分离已经是当前架构基线。** 但阅读当前代码时，仍然要区分规范中的本体模型和实现里的某些过渡形态，不要把临时兼容对象误认成最终架构本体。

## 5. 词法所有权：生命周期由作用域决定

在 React 中，副作用的生命周期通常由组件的挂载/卸载决定。`useEffect` 的清理函数在组件卸载时执行。

**Flux 采用不同的模型：词法所有权。**

Resource 和 Reaction 的生命周期遵循它们所属的词法作用域。当该 scope 对应的 runtime-owned sidecar entries 被释放时，它"拥有"的 Resource 和 Reaction 也会被清理。

这样设计有三个原因：

1. **与 React 解耦**：这些语义不是由 React 组件生命周期定义的。你可以在不依赖 React Hooks 调用顺序的前提下理解、测试这些 runtime 单元；当前工程目标仍然是浏览器前端执行，但它们的语义边界不以 React 为本体。

2. **更精确的生命周期控制**：React 组件的挂载/卸载可能因为父组件重渲染而发生，这是"实现细节"而非"业务语义"。词法作用域的创建/销毁更直接地对应业务逻辑。

3. **嵌套作用域的自然清理**：当父级词法 scope 对应的 runtime entries 释放时，其子级 scope 及其拥有的资源也会沿归属关系一起清理，不需要手动管理。

再说一遍：这里的含义不是把 `ScopeRef` 设计成"数据 + 行为 + 生命周期"的大对象。`ScopeRef` 仍然保持纯数据词法环境；source/reaction 的生命周期所有权是在 runtime sidecar 中按 scope 归属实现的。

### 与 React Hooks 的对比

React Hooks 有一个著名的限制：只能在组件顶层调用，不能在循环、条件分支或嵌套函数中调用。

这个限制源于一个根本约束：**React 通过调用顺序来关联 Hook 状态**。因为 JavaScript 没有声明级的语法来标识"这是组件的依赖声明"，Hook 只能借用函数体的顶部，并通过运行时规则来强制执行调用顺序的稳定性。

Flux 不需要这种限制，因为依赖关系被**显式地编码在 schema 结构中**。`${expression}` 引用、Resource 声明、Reaction 定义都有明确的结构位置；更准确地说，它们的身份来自编译后的结构身份和运行时实例身份，例如 `templateNodeId`、`cid`、`instancePath`，而不是"第 3 次调用是 useState"这样的隐式约定。

这是 DSL 相对于通用语言的结构优势：**声明式 schema 的结构和依赖声明更显式，而 JavaScript 函数体的依赖声明更多依赖约定和调用纪律**。这个对比只是帮助理解两种系统的声明方式，并不是在说 Flux 可以脱离自身的边界约束随意创建运行时实体。

## 6. 三棵树是有用的工程直觉，但优先级低于七原语

传统的 GUI 框架通常把组件、状态、行为混在一起。一个组件既有视觉表现，又持有状态，又响应事件。这种耦合在简单场景下很方便，但在复杂场景下会导致问题。

用“三棵树”来理解 Flux 很有帮助，因为它能快速解释为什么结构、数据和行为不会被揉成一个大对象。

但必须记住：**三棵树是工程直觉，不是比七原语更高优先级的本体论**。更精确的规范仍然是 `Template + ScopeRef + Value/Resource/Reaction + Capability + Host Projection`。三棵树只是帮助你把这些东西先分层看清。

甚至可以把它理解为一种压缩视图：

- `StateTree` 只是 `ScopeRef + Resource publication + host snapshot visibility` 的粗略合称
- `ActionTree` 只是 `Capability` 某一部分解析直觉的粗略合称
- 它们都不能替代七原语本身的边界定义

这个思想来源于对面向对象 GUI 框架的反思。传统的 OO GUI（如 Swing、WinForms）把组件作为核心抽象——组件持有状态、响应事件、绑定子组件。但当响应式数据绑定被全面采用后，**组件对象本身的重要性下降了**。组件变成了"数据到 UI 的映射函数"，真正重要的是数据流。

三棵树分离是这个演化的自然结果：既然组件只是"渲染函数"，那就让它只关心渲染；数据和行为交给专门的树来管理。

> **术语映射**：本节使用的 "ComponentTree、StateTree、ActionTree" 只是概念层抽象，可以近似对应为：
>
> - StateTree ≈ `ScopeRef` 这层词法数据可见性，再加上 `Resource` 的发布结果与宿主快照可见性
> - ActionTree ≈ `Capability` 的一部分解析直觉，其中 `ActionScope` 是 namespaced action 的主要 supporting layer
> - ComponentTree ≈ `Template` 这层结构直觉
> - `ComponentHandleRegistry` 是单独的实例级 capability targeting 层，不应把它误当成 ComponentTree 本身

### ComponentTree — 静态结构

ComponentTree 描述 UI 的组织结构：哪些组件、如何嵌套、父子关系。它的作者可见结构基线在编译/装配后就确定了；运行时允许的只是受控的结构激活、重复实例化或延迟片段引入，而不是重新发明一套开放式组装流程。

### StateTree — 数据流向

StateTree 描述数据的分布和流向。它的结构与 ComponentTree 不一定一致——一个深层嵌套的组件可能直接访问顶层的状态，不需要逐层传递。

StateTree 的核心载体是 `ScopeRef` 链，遵循词法作用域规则。

### ActionTree — 行为解析

ActionTree 描述可以执行的操作。命名空间动作如 `designer:addNode`、`spreadsheet:setCellValue` 会沿 `ActionScope` 链向上查找。

这个解析过程可以类比为**词法作用域中的函数名解析**。在编程语言中，当你调用一个函数时，运行时会在当前作用域中查找函数定义，找不到就到父作用域，直到全局作用域。

ActionTree 做的是同样的事情：当 schema 中触发 `designer:addNode` 时，运行时从当前 `ActionScope` 开始查找 `designer` 命名空间下的 `addNode` 动作，找不到就沿着 parent 链向上查找。

`xui:imports` 机制让这个过程变得动态：你可以在运行时向某个 ActionScope 注册新的动作命名空间，就像动态加载一个模块并将其导出的函数注入当前作用域。

需要再补一个边界：**并不是所有 capability lookup 都属于 ActionTree。** `component:<method>` 这类显式实例 targeting 走的是 `ComponentHandleRegistry`，它与 `ActionScope` 并列，同属 `Capability` 的 supporting layer。

三者分离的原因在于它们的生命周期和变化节奏不同：

- ComponentTree 的作者可见结构基线在编译/装配后确定，但 runtime 仍允许受控的结构激活、重复实例化和受约束的延迟 fragment 准入
- StateTree 在运行时动态变化，数据随用户交互更新
- ActionTree 在运行时按需加载，`xui:imports` 动态注册新的命名空间

如果把它们混在一起，就会遇到生命周期冲突：

- 组件卸载时，它持有的状态是否应该清除？
- 动态加载的 action 库，应该挂在哪个组件上？
- 跨组件共享状态，需要把状态"提升"到公共祖先？

三棵树分离后，这些问题都有清晰的答案：

- 数据可见性通过 `ScopeRef` 管理；source/reaction 的生命周期则由 runtime sidecar 按词法归属管理，与组件无关
- Action 库通过 `ActionScope` 与导入生命周期管理，而不是附着在某个组件实例上
- 跨组件共享状态通过词法作用域链实现，不需要 props drilling

## 7. 现有文档是"规范文档"而非"解释文档"

读完了 `docs/architecture/` 目录下的所有文档却仍然感觉"没有真正理解"——这不是你的问题。

那些文档是规范文档，精确定义了每个接口、每个契约、每个边界条件。它们回答"是什么"和"如何使用"，不回答"为什么这样设计"。

规范文档假设读者已经理解了设计意图，只需要查阅具体细节。带着错误的心智模型去读，只会越读越困惑。

本文试图填补这个空白：提供设计意图的解释，帮助建立正确的心智模型。但始终记住本文的角色：**它是解释文档，不是最高优先级的规范文档。** 当本文与 `docs/architecture/frontend-programming-model.md` 或更窄 owning doc 冲突时，应以后者为准。

## 8. 一个最小执行例子：七原语如何一起工作

看一个极小的 schema 片段：

```json
{
  "type": "container",
  "body": [
    {
      "type": "text",
      "text": "Hello, ${userId}"
    },
    {
      "type": "data-source",
      "name": "user",
      "action": "ajax",
      "args": { "url": "/api/user/${userId}" },
      "statusPath": "userStatus"
    },
    {
      "type": "reaction",
      "watch": "${user && user.vip}",
      "when": "${value === true && prev !== true}",
      "actions": {
        "action": "showToast",
        "args": { "message": "VIP user loaded" }
      }
    }
  ]
}
```

运行时可以这样理解它：

1. **Template**：先确定这里有一个 `container`、一个 `text`、一个 `data-source`、一个 `reaction`——这些都是编译期确定的结构。
2. **ScopeRef**：当前作用域里可以看到 `userId`，也可能还能看到来自 host 的只读快照。
3. **Value**：`text` 里的 `${userId}` 先被当作普通同步求值来读。
4. **Resource**：`data-source` 声明一个名为 `user` 的 runtime-owned 值生产者；它负责生命周期、发布路径、`loading/error` 状态和 refresh/invalidation。
5. **Capability**：这里最容易混的是 effect authority 与 `Resource` 生命周期。前者是跨边界权限/执行通道，后者是值生产语义；真正的 transport 则由 runtime 经 `env.fetcher` 这类 host wiring 完成。
6. **Host Projection**：如果宿主还投影了诸如 `doc.readonly`、`selection.id` 这类只读快照，schema 也能一起读取，但不能直接写回。
7. **Reaction**：当 `user.vip` 从 false 变成 true 时，reaction 观察到变化，并通过 `Capability` 调度 `showToast` 这类后果。

这个例子里最关键的不是 schema 有多复杂，而是你能看到：**结构、作用域、值、资源、观察器、效果权限、宿主快照**，在运行时各自扮演不同角色。

## 9. 实践建议：如何阅读 Flux 代码

建议的阅读顺序：

### 第零步：先看文档入口和顶层契约

先读 `docs/index.md`，再读 `docs/architecture/frontend-programming-model.md`。

前者告诉你文档地图，后者告诉你什么是七原语、什么属于 core、什么属于 derived runtime system、什么留在 host/domain 外部。没有这层 baseline，后面看代码时很容易把局部实现误当成整体定义。

### 第一步：理解编译器

从 `packages/flux-formula/src/compile.ts` 开始。理解 Flux 如何将 schema 中的值编译为 `CompiledValueNode`，这是统一值语义的实现。

然后看 `packages/flux-compiler/src/schema-compiler.ts`，理解 execution compiler 如何把 final execution schema 降到 runtime template；它展示的是执行侧编译，不是重新执行 platform / loader assembly。

### 第二步：理解作用域

看 `packages/flux-runtime/src/scope.ts`，理解 ScopeRef 的实现。特别注意这几个方法的区别：

- `get(path)` — 沿链向上查找单个变量（高频快路径）
- `readOwn()` — 只返回当前层的数据
- `readVisible()` — 返回 prototype-backed 词法可见视图（零分配热路径）
- `materializeVisible()` — 显式展开为 plain object（低频兜底）

### 第三步：理解动作系统

先看 `packages/flux-runtime/src/action-scope.ts`，再看 `packages/flux-action-core/src/action-dispatcher.ts` 与 `packages/flux-runtime/src/action-adapter.ts`。这样更容易看清：`ActionScope` 负责命名空间解析，`flux-action-core` 负责 selector 分类与控制流语义，runtime adapter 负责最终 built-in / component / namespaced 调用边界。

同时配合 `docs/architecture/action-scope-and-imports.md` 一起看。否则你很容易把 `ActionScope`、`ComponentHandleRegistry`、built-in actions 这三条 capability 路径混为一谈。

### 第三步半：理解 Resource / Reaction 的运行时边界

配合 `docs/architecture/api-data-source.md` 阅读 `data-source`、`source`、`reaction` 的实现。重点不是“某个组件怎么发请求”，而是理解：**为什么 source/reaction 是 runtime-owned sidecar，而不是 renderer-owned state**。

### 第四步：理解 Template / Instance

看 `docs/architecture/template-instantiation-and-node-identity.md`，再回到 runtime 代码中对照 `templateNodeId`、`cid`、`instancePath`、重复实例化等概念。

这一步很重要，因为很多人第一次读代码时会不自觉地把“编译节点”和“运行时实例”混成一个对象。

### 第五步：理解 React 集成

最后看 `packages/flux-react/`。注意 React 只是渲染后端，核心逻辑在 runtime 层。hooks 提供的是对 runtime 状态的订阅，而不是状态本身。

### 补充：顶层概念入口

如果你想从更高层次理解三棵树与七原语如何对应，可以把 `docs/architecture/frontend-programming-model.md`、`docs/architecture/flux-dsl-vm-extensibility.md`、`docs/architecture/template-instantiation-and-node-identity.md` 连起来读。

## 10. 总结：Flux 的核心心智模型

1. **从架构理解上，Flux 首先是 DSL 运行时。** 它服务于低代码平台，但不等于浏览器里做开放式结构组装的低代码引擎。

2. **七原语是必须分清的核心语义角色**，不是功能分类。它们定义了 Flux execution model 的基本边界。

3. **Value/Resource/Reaction 的区分是必要的**，因为它们对依赖变化的响应方式不同。

4. **生命周期由词法所有权决定**，不是 React 组件。它说明这些语义边界不由 React 生命周期定义。

5. **三棵树是有用的工程直觉**：组件结构、数据流向、行为解析各自独立；但更高优先级的规范仍然是七原语模型。

6. **Capability 是单一效果 authority path**：所有作者可见副作用都必须通过 Capability 解析出的路径发生，schema 不能直接执行副作用。

7. **Host Projection 是只读宿主快照进入 schema 的入口**，不是第二条写入路径，也不是把整个宿主 runtime 暴露进 scope。

8. **不是所有前端复杂性都属于 Flux core**：host shell、协作协议、领域算法、高频手势循环等仍应留在 core 之外。

9. **规范文档 ≠ 解释文档**：理解设计意图后，再阅读规范文档；如有冲突，以规范文档为准。
