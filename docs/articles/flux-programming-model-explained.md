# Flux 编程模型：打破低代码框架的思维定式

> 本文的目标读者：已经阅读过 Flux 架构文档、但仍感觉"没有真正理解"的开发者或 AI。
> 
> 如果你带着"这是又一个低代码渲染框架"的预期来阅读 Flux 代码，你会困惑于很多设计选择。本文试图帮助你建立正确的心智模型。

**相关文档导航：**
- 如果你想了解 Flux 的设计决策和工程动机，先阅读 [`docs/articles/flux-design-introduction.md`](./flux-design-introduction.md)
- 如果你需要查阅具体接口和契约，阅读 `docs/architecture/` 目录下的规范文档
- 本文的目标是帮助你在阅读规范文档之前建立正确的心智模型

## 1. Flux 不是低代码框架，是前端 DSL 运行时

这是理解 Flux 的第一道门槛。

当我们说"低代码框架"时，通常想到的是：用户拖拽组件 → 生成配置 → 框架解释配置 → 渲染 UI。框架在运行时做大量的"组装"工作——判断条件、选择分支、动态构建组件树。

**Flux 不是这样工作的。**

Flux 的核心定义是：**Final Execution Schema frontend runtime**。

"Final Execution Schema"意味着：当 JSON schema 到达 Flux 时，所有的结构性决策已经完成。Flux 不做条件分支选择、不做模块加载、不做权限过滤——这些在 Nop 平台层已经处理完毕。Flux 收到的是一个**已经编译好的程序**，它只负责执行。

这就像 JVM 之于 Java 编译器的关系：
- Java 编译器负责语法分析、类型检查、优化、生成字节码
- JVM 只负责执行字节码

类似地：
- Nop 平台负责 schema 的分解合并、i18n 替换、权限裁剪、编译期元编程
- Flux 只负责执行最终的、已编译的 schema

**为什么这个区分重要？**

如果你把 Flux 当作"低代码框架"来理解，你会期望在 Flux 内部找到模块系统、权限控制、国际化机制。你找不到，然后你会困惑：这个框架是不是功能不完整？

不是。这些功能在 Flux 之外，在平台层。Flux 的"功能不完整"恰恰是它的设计目标：**单一职责，只做执行**。

### 声明式编程的终点

从更宏观的视角看，Flux 的设计反映了前端框架发展的一个趋势：**从命令式向声明式的范式转换**。

命令式编程关注"路径"——如何一步步修改状态到达目标。声明式编程关注"端点"——描述目标状态，让系统自动推导路径。

早期的 jQuery 是命令式的：你手动操作 DOM，手动管理状态变化。React 带来了声明式的 UI：你描述"UI 应该是什么样子"，React 自动计算 diff 和更新。

Flux 把这个趋势推向更远：**整个前端应用的行为都被声明式地描述在 schema 中**。Flux 作为运行时，负责把这个声明"执行"出来。

这就是为什么 Flux 可以被理解为一个"执行 DSL 的虚拟机"：`output = FluxPage(schema, input)`。所有的输入（用户交互、API 响应）和输出（UI 渲染、副作用执行）都被虚拟化，通过统一的接口进出。

## 2. 七原语不是功能分类，是语义完备的最小集合

Flux 的核心架构文档定义了七个原语：Base Tree、ScopeRef、Value、Resource、Reaction、Capability、Host Projection。

初次阅读时，很容易把它们当作"功能模块的分类"：这个管渲染、这个管数据、这个管副作用。这种理解是表面的。

**七原语是一个语义完备的最小集合**——就像 Lambda 演算只需要变量、抽象、应用三个构造，就能表达所有可计算函数一样。七原语定义的是：在一个 schema 驱动的响应式前端系统中，你需要且仅需要这七种语义单元。

让我们逐一理解它们的**语义角色**，而不是功能描述：

### Base Tree — 程序的静态结构

Base Tree 是 schema 编译后的 AST（抽象语法树）。它描述的是程序的静态结构：有哪些节点、节点之间的父子关系、每个节点的类型和属性。

关键点：Base Tree 在编译后就固定了，运行时不会改变。动态的不是树的结构，而是树上节点的值。

### ScopeRef — 词法作用域

ScopeRef 不是"数据容器"，它是**词法作用域**的具体实现。

在编程语言中，词法作用域决定了变量名如何解析：从当前作用域开始查找，找不到就到父作用域，直到全局作用域。JavaScript 的闭包、Python 的 LEGB 规则，都是词法作用域的实现。

ScopeRef 做的是同样的事情：当表达式中引用 `${user.name}` 时，运行时从当前 ScopeRef 开始查找 `user`，找不到就沿着 `parent` 链向上查找。

这意味着：**schema 中的变量引用，遵循的是词法作用域规则，而不是 DOM 结构或组件树**。一个深层嵌套的组件，可以直接访问其词法父作用域中的变量，不需要 props drilling。

### Value — 表达式求值

Value 是**表达式求值**的结果。`${1 + 2}` 是一个 Value，`${user.name}` 是一个 Value，`"Hello, ${name}"` 模板字符串也是一个 Value。

关键点：Value 是**纯计算**，没有副作用。给定相同的作用域状态，Value 总是返回相同的结果。

### Resource — 运行时拥有的值生产

Resource 是 Flux 中最容易被误解的概念。

它不是"数据"，而是**值的生产过程**。一个 API 请求就是一个 Resource：它发起请求、等待响应、返回结果。请求过程中它有状态（loading/success/error），请求完成后它有值。

Resource 和 Value 的关键区别：**Value 是同步的纯计算，Resource 是异步的有状态生产**。

如果你熟悉 Effect 系统（如 ZIO、Cats Effect），Resource 类似于 Effect——它描述的是"如何产生一个值"，而不是值本身。

**Resource 是 computed 的异步扩展**

如果你从响应式编程的角度来理解，这个关系会更清晰：

- `computed` 是对**同步函数**的 Ref 封装：`computed(() => a + b)` 包装了一个同步计算
- `Resource` 是对**异步函数**的 Ref 封装：`api({ url: '/user' })` 包装了一个异步请求

两者都是"值的生产者"，都支持依赖追踪和自动更新。区别只在于：computed 是同步的、无状态的；Resource 是异步的、有状态的（loading/success/error）。

这种理解帮助你看清 Flux 响应式系统的演化路径：从简单的响应式绑定（`${a + b}`），到 computed（同步派生值），到 Resource（异步派生值），是一条自然的扩展线。

但 Resource 的完整语义超出简单的"异步 computed"。Resource 还拥有：
- **生命周期所有权**（lifecycle ownership）：Resource 由所属 ScopeRef 管理生命周期
- **状态语义**（status semantics）：loading/success/error，不只是值
- **刷新/失效机制**（refresh/invalidation）：可以手动触发重新获取

这些特性让 Resource 成为一个完整的"异步值生产者"抽象，而不仅仅是 computed 的异步版本。

### Reaction — 响应式副作用

Reaction 是对状态变化的**响应**。当某个 Value 变化时，Reaction 被触发，执行相应的副作用。

关键点：Reaction 的生命周期由**词法作用域**决定，而不是 React 组件的挂载/卸载。当一个 ScopeRef 被销毁时，它内部的所有 Reaction 都会被清理。

这是一个重要的设计选择：Flux 的响应式系统独立于 React 的组件生命周期。你可以在不渲染任何 React 组件的情况下，创建 ScopeRef、设置 Reaction、触发副作用。React 只是 Flux 的一个渲染后端，不是它的核心。

### Capability — 效果权限

Capability 是 Flux 中最具"编程语言理论"色彩的概念。

在 Algebraic Effects 的理论中，副作用不是直接执行的，而是"抛出"给上层的 handler 来处理。这让副作用变得可组合、可测试、可替换。

Flux 的 Capability 借鉴了这一思想（但并非完整的 effect handler 系统）：**schema 不能直接执行副作用，所有副作用都必须通过 Capability 请求宿主执行**。

`env.fetcher` 是一个 Capability：schema 说"我要发请求"，但如何发、用什么 HTTP 库、如何处理错误，都由宿主决定。
`env.notify` 是一个 Capability：schema 说"我要显示消息"，但用什么 UI、显示多久，都由宿主决定。
`env.importLoader` 是一个 Capability：schema 说"我要加载这个库"，但从哪加载、是否允许加载，都由宿主决定。

**Schema → Capability 是单一效果路径**。这意味着：
1. Schema 的行为是可预测的——它能做的事情都通过 Capability 接口定义
2. 宿主有完全的控制权——可以实现、模拟、限制任何 Capability
3. 测试变得简单——mock 掉 Capability 就能测试 schema 的行为

### Host Projection — 外部只读快照

Host Projection 是 Flux 运行时状态的**只读投影**，供宿主消费。

调试器看到的节点树、表单状态、动作日志，都是 Host Projection。宿主可以读取这些信息，但不能通过 Projection 修改运行时状态——修改只能通过 Capability 进行。

## 3. 为什么 Value / Resource / Reaction 必须区分？

这是理解 Flux 响应式系统的关键。

在很多响应式框架中，computed 和 effect 是核心概念。Flux 把它们进一步细分为 Value、Resource、Reaction。为什么需要这种细分？

### 值与函数的对偶视角

要理解这个问题，需要引入一个更深层的视角：**值与函数的对偶性**。

在信息流中，我们可以用两种视角来解释同一件事：
- **函数→数据→函数**：函数处理数据，产生新数据，传给下一个函数
- **数据→函数→数据**：数据流经函数，被转换为新数据

这两种视角是对偶的。响应式编程的核心洞察是：**一个值可以被看作"返回该值的零参函数"**。

- `const a = 1` 可以看作 `const a = () => 1`
- `${user.name}` 可以看作 `() => scope.get('user').name`

当你接受这个视角后，Value、Resource、Reaction 的区分就变得自然了：

| 原语 | 视角 | 本质 |
|------|------|------|
| Value | 同步零参函数的封装 | `() => expression` |
| Resource | 异步零参函数的封装 | `async () => await fetch(...)` |
| Reaction | 副作用函数的调度 | `() => { sideEffect(); }` |

它们都是"函数的封装"，但函数的性质不同：
- **Value** 封装的是纯函数——无副作用，同步返回
- **Resource** 封装的是异步函数——无副作用，但需要等待
- **Reaction** 封装的是副作用函数——执行时会改变外部状态

### 因为它们对依赖变化的响应方式不同

| 原语 | 依赖变化时的行为 |
|------|-----------------|
| Value | 同步重新计算，返回新值 |
| Resource | 可能取消当前生产过程，重新开始生产 |
| Reaction | 重新执行副作用 |

考虑一个 API 请求的场景：

```json
{
  "type": "data-source",
  "api": { "url": "/api/user/${userId}" },
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

**Resource 的语义比 computed 或 effect 更精确**，它明确表达了"这是一个异步的、有状态的值生产过程"。

## 4. Template/Instance 分离是语义分离，不只是性能优化

另一个容易被误解的设计是 Template/Instance 分离。

很多框架也有类似的优化：编译一次、实例化多次。Flux 的 Template/Instance 分离看起来类似，但它的动机不只是性能。

**Template 是程序定义，Instance 是程序执行。**

一个 Template 可以被多次实例化，每次实例化产生独立的运行时状态。这就像：
- 一个函数定义可以被多次调用，每次调用有独立的局部变量
- 一个类定义可以创建多个对象，每个对象有独立的字段

这种分离带来的能力：
1. **同一 schema 可以在多处渲染**，每处有独立的状态
2. **schema 可以递归引用自身**，因为每次引用创建新实例
3. **调试器可以追踪"这个实例是从哪个模板创建的"**

如果没有这种分离，schema 和运行时状态就会耦合在一起，上述能力都无法实现。

## 5. 词法所有权：生命周期由作用域决定

在 React 中，副作用的生命周期通常由组件的挂载/卸载决定。`useEffect` 的清理函数在组件卸载时执行。

**Flux 采用不同的模型：词法所有权。**

Resource 和 Reaction 的生命周期由它们所属的 ScopeRef 决定。当 ScopeRef 被销毁时，它"拥有"的所有 Resource 和 Reaction 都会被清理。

为什么这样设计？

1. **与 React 解耦**：Flux 的响应式系统可以独立于 React 运行。你可以在 Node.js 环境中创建 ScopeRef、执行 Resource、触发 Reaction，不需要 React。

2. **更精确的生命周期控制**：React 组件的挂载/卸载可能因为父组件重渲染而发生，这是"实现细节"而非"业务语义"。词法作用域的创建/销毁更直接地对应业务逻辑。

3. **嵌套作用域的自然清理**：当父 ScopeRef 销毁时，其所有子 ScopeRef 及其拥有的资源都会被清理，不需要手动管理。

### 与 React Hooks 的对比

React Hooks 有一个著名的限制：只能在组件顶层调用，不能在循环、条件分支或嵌套函数中调用。

这个限制源于一个根本约束：**React 通过调用顺序来关联 Hook 状态**。因为 JavaScript 没有声明级的语法来标识"这是组件的依赖声明"，Hook 只能借用函数体的顶部，并通过运行时规则来强制执行调用顺序的稳定性。

Flux 不需要这种限制，因为依赖关系被**显式地编码在 schema 结构中**。`${expression}` 引用、Resource 声明、Reaction 定义——它们在 schema 中的位置就是它们的身份标识。运行时不需要依赖"第 3 次调用是 useState"这样的隐式约定。

这是 DSL 相对于通用语言的结构优势：**声明式 schema 的结构是显式的，而 JavaScript 函数体的结构是隐式的**。

## 6. 三棵树正交分治：ComponentTree、StateTree、ActionTree

传统的 GUI 框架通常把组件、状态、行为混在一起。一个组件既有视觉表现，又持有状态，又响应事件。这种耦合在简单场景下很方便，但在复杂场景下会导致问题。

Flux 采用正交分治：**三棵树各自独立生长，有不同的生命周期**。

这个思想来源于对面向对象 GUI 框架的反思。传统的 OO GUI（如 Swing、WinForms）把组件作为核心抽象——组件持有状态、响应事件、绑定子组件。但当响应式数据绑定被全面采用后，**组件对象本身的重要性下降了**。组件变成了"数据到 UI 的映射函数"，真正重要的是数据流。

三棵树分离是这个演化的自然结果：既然组件只是"渲染函数"，那就让它只关心渲染；数据和行为交给专门的树来管理。

> **术语映射**：本节使用的 "ComponentTree、StateTree、ActionTree" 是概念层面的抽象。在 Flux 实现中，它们对应于：
> - StateTree → `ScopeRef` 链（词法作用域数据）
> - ActionTree → `ActionScope` 链（动作命名空间）
> - ComponentTree → `Base Tree`（编译后的模板结构）+ `ComponentHandleRegistry`（运行时实例定位）

### ComponentTree — 静态结构

ComponentTree 描述 UI 的组织结构：哪些组件、如何嵌套、父子关系。这棵树在 schema 编译后就确定了，运行时不会动态增删节点。

### StateTree — 数据流向

StateTree 描述数据的分布和流向。它的结构与 ComponentTree 不一定一致——一个深层嵌套的组件可能直接访问顶层的状态，不需要逐层传递。

StateTree 通过 ScopeRef 链实现，遵循词法作用域规则。

### ActionTree — 行为解析

ActionTree 描述可以执行的操作。动作通过命名空间组织（`designer:addNode`、`form:submit`），解析时沿 ActionScope 链向上查找。

这个解析过程可以类比为**词法作用域中的函数名解析**。在编程语言中，当你调用一个函数时，运行时会在当前作用域中查找函数定义，找不到就到父作用域，直到全局作用域。

ActionTree 做的是同样的事情：当 schema 中触发 `form:submit` 时，运行时从当前 ActionScope 开始查找 `form` 命名空间下的 `submit` 动作，找不到就沿着 parent 链向上查找。

`xui:imports` 机制让这个过程变得动态：你可以在运行时向某个 ActionScope 注册新的动作命名空间，就像动态加载一个模块并将其导出的函数注入当前作用域。

**为什么要分离？因为它们的生长方式不同。**

- ComponentTree 在编译期确定，运行时静态
- StateTree 在运行时动态变化，数据随用户交互更新
- ActionTree 在运行时按需加载，`xui:imports` 动态注册新的命名空间

如果把它们混在一起，就会遇到生命周期冲突：
- 组件卸载时，它持有的状态是否应该清除？
- 动态加载的 action 库，应该挂在哪个组件上？
- 跨组件共享状态，需要把状态"提升"到公共祖先？

三棵树分离后，这些问题都有清晰的答案：
- 状态的生命周期由 ScopeRef 管理，与组件无关
- Action 库注册到 ActionScope，有独立的引用计数和 teardown
- 跨组件共享状态通过词法作用域链实现，不需要 props drilling

## 7. 现有文档是"规范文档"而非"解释文档"

如果你读完了 `docs/architecture/` 目录下的所有文档，仍然感觉"没有真正理解"，这是正常的。

**那些文档是规范文档**——它们精确定义了每个接口、每个契约、每个边界条件。它们回答的是"是什么"和"如何使用"，而不是"为什么这样设计"。

规范文档假设读者已经理解了设计意图，只需要查阅具体细节。但如果你带着错误的心智模型来阅读，规范文档只会强化你的困惑。

本文试图填补这个空白：提供设计意图的解释，帮助你建立正确的心智模型。有了正确的心智模型，再去阅读规范文档，一切都会变得清晰。

## 8. 实践建议：如何阅读 Flux 代码

如果你要深入理解 Flux，以下是建议的阅读顺序：

### 第一步：理解编译器

从 `packages/flux-formula/src/compile.ts` 开始。理解 Flux 如何将 schema 中的值编译为 `CompiledValueNode`，这是统一值语义的实现。

然后看 `packages/flux-runtime/src/schema-compiler.ts`，理解整个 schema 如何被编译为可执行的结构。

### 第二步：理解作用域

看 `packages/flux-runtime/src/scope.ts`，理解 ScopeRef 的实现。特别注意这几个方法的区别：
- `get(path)` — 沿链向上查找单个变量（高频快路径）
- `readOwn()` — 只返回当前层的数据
- `readVisible()` — 返回 prototype-backed 词法可见视图（零分配热路径）
- `materializeVisible()` — 显式展开为 plain object（低频兜底）

### 第三步：理解动作系统

看 `packages/flux-runtime/src/action-scope.ts` 和 `packages/flux-runtime/src/action-runtime.ts`。理解 ActionScope 如何组织动作、如何解析命名空间、如何与 `xui:imports` 配合。

### 第四步：理解 React 集成

最后看 `packages/flux-react/`。注意 React 只是渲染后端，核心逻辑在 runtime 层。hooks 提供的是对 runtime 状态的订阅，而不是状态本身。

### 补充：顶层概念入口

如果你想从更高层次理解七原语的设计，可以阅读 `docs/architecture/frontend-programming-model.md`，它定义了 Flux 编程模型的规范语义。

## 9. 总结：Flux 的核心心智模型

1. **Flux 是 DSL 运行时**，不是低代码框架。它执行已编译的程序，不做运行时组装。

2. **七原语是语义完备集**，不是功能分类。它们定义了前端响应式系统的最小语义单元。

3. **Value/Resource/Reaction 的区分是必要的**，因为它们对依赖变化的响应方式不同。

4. **生命周期由词法作用域决定**，不是 React 组件。这让 Flux 可以独立于任何 UI 框架运行。

5. **三棵树正交分治**：组件结构、数据流向、行为解析各自独立，有不同的生长方式和生命周期。

6. **Capability 是单一效果出口**：所有副作用都通过 Capability 请求宿主执行，schema 不能直接执行副作用。

7. **规范文档 ≠ 解释文档**：理解设计意图后，再阅读规范文档。

带着这个心智模型，再去阅读 Flux 的代码和文档，你会发现很多之前困惑的设计选择都变得合理了。
