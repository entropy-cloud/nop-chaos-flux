# Nop Chaos Flux：百度AMIS之后的下一代低代码渲染引擎

## 1. 引言 — 为什么需要又一个低代码框架？

[百度 AMIS 是一个非常优秀的设计](https://aisuda.bce.baidu.com/amis/zh-CN/docs/index)。它功能强大、文档丰富，被广泛用于各种企业级应用，在低代码渲染领域有着深远的影响力。然而，AMIS 的发展历史很长——在持续迭代的过程中，内部实现逐渐变得臃肿复杂，概念一致性在很多地方也没有做到最优。具体而言，以下几个问题尤为突出：

**Schema 层的表达式规则不一致。** AMIS 虽然通过 `getExprProperties` 的通用正则自动处理所有 `xxxOn` 后缀的布尔表达式和 `xxxExpr` 后缀的模板表达式，但普通字符串属性（如 `label: "Hello ${name}"`）上的模板插值并没有通用支持，深层嵌套对象中的表达式也不在处理范围内。同时，静态值和动态值在 schema 中使用不同的字段名：`disabled` / `disabledOn`、`options` / `source`，每个属性是否支持表达式、用什么语法支持，缺乏统一规则。

**运行时层的 store 职责过重，数据与行为未分离。** AMIS 的 MST store 既是数据容器（`data` 字段），又承担了数据操作（`updateData`、`changeValue`）、API 调用（`fetchData`、`saveRemote`）、对话框管理（`openDialog`、`closeDialog`）等职责——行为方法直接挂在 store 上。而 store 的 `data` 字段本身又是基于原型链（`Object.create(superProps)`）构建的作用域对象，数据继承隐含在对象结构中，响应式更新和变量查找交织在一起。

**系统环境依赖 props 层层传递。** AMIS 中所有系统级对象——store、env、data、render 函数等——都需要通过 React props 层层向下传递。渲染器的 props 接口日益膨胀，中间层即使不使用这些对象也必须透传，增加了组件间的耦合度，也让渲染器的接口变得臃肿。

此前，因为工作量过大，我只写了几篇文章，勾画了对于 AMIS 设计改进的思考，但并没有想过从零开始再造一个更好的低代码运行时框架(参见[为什么说百度AMIS框架是一个优秀的设计](https://mp.weixin.qq.com/s/kW_H7ZTZhwWG5KCFty7CoQ)和[再谈百度AMIS框架和声明式编程](https://mp.weixin.qq.com/s/kCR-NNIH9t-WoGTCe8HxaA))。但是在 AI 的加持下，现在单个架构师可以直接操刀完成一个复杂框架了。因此从 2026 年 4 月开始，我设计并实现了 Flux 架构。Flux 是对 AMIS 的一次彻底重写，但这次重写的目标不是更换技术栈，而是解决 AMIS 在 schema 层和运行时层的结构性限制。

Flux 是 Nop 平台的渲染层，不是独立框架。Nop 平台基于可逆计算原理，在 schema 到达渲染器之前提供了一系列结构变换能力——i18n 替换、权限裁剪、模块分解与继承、编译期元编程。这些关注点在 JSON 结构层面解决，不依赖任何前端框架的运行时机制。本文会在第10节详细介绍这些平台层能力。渲染框架层和平台层各司其职，这种分层是有意为之的架构决策：能在结构变换层解决的问题，就不带进渲染运行时。

同时，Flux 的设计假设 schema 的主要生产方式正在从人类手写转向 AI 生成。这一前提影响了多项设计决策——特别是样式系统的显式性和 schema 的冗余容忍度。对于 AI 来说，显式可预测的接口比隐式约定更友好；对于人类来说，审查和局部修改一个显式声明的 schema 也比理解隐式默认值更可靠。当然，这并不意味着框架对人类手写场景不可用，而是设计权衡的天平向确定性一侧倾斜。

## 2. 核心理念 — 统一值语义

Flux 与 AMIS 最核心的差异在于值的表达方式。

AMIS 的做法是：一个属性既可以是静态值，也可以是表达式。为了区分这两种情况，AMIS 在 base schema（`amis-core/src/schema.ts`）里引入了一系列平行字段。每个需要动态控制的属性都被拆成了两份：一个静态字段和一个带 `On` 后缀的表达式变体——`disabled` / `disabledOn`、`visible` / `visibleOn`、`hidden` / `hiddenOn`、`static` / `staticOn`。在表单项层级还有 `required` / `requiredOn`，在某些渲染器里（如 Table/CRUD）还有 `classNameExpr` 这样的表达式变体。

这种拆分在扩展时会遇到困难。字段数量翻倍，schema 作者不得不记住哪个用静态写法、哪个用表达式写法。更尴尬的是，这两者是互斥的——写了 `disabled: true` 就不能同时写 `disabledOn`，但框架里并没有强制约束这一点。全靠约定和文档。

AMIS 的平行字段是把值内部的语义差异——"这是静态的"还是"这是动态的"——提升到了对象的结构层面，用不同的字段名来表达这种差异。这种方式将本应属于**值**的内部判断外化成了**对象结构**，导致扩展时必须改变结构。

Flux 的做法是统一为一个字段名，由编译器区分值的类型。

`disabled` 就是 `disabled`，它可以是静态布尔值 `true`，可以是表达式 `${$form.submitting}`，也可以是包含表达式的模板字符串 `"${name} is disabled"`。怎么区分这些形式？让编译器来做决定，而不是让 schema 作者记住各种后缀。这个判断被限定在值的表达范围内，而不需要上升到对象结构层面。

这背后的类型系统是这样的：

```typescript
type CompiledValueNode<T> =
  | { kind: 'static-node'; value: T }
  | { kind: 'expression-node'; source: string; compiled: CompiledExpression<T> }
  | { kind: 'template-node'; source: string; compiled: CompiledStringTemplate<T> }
  | { kind: 'array-node'; items: CompiledValueNode[] }
  | { kind: 'object-node'; keys: string[]; entries: Record<string, CompiledValueNode> };
```

编译器会在编译阶段分析每个字段的值，判断它是哪种节点。运行时再根据编译结果将节点包装为 `CompiledRuntimeValue`——静态节点直接包装为 `StaticRuntimeValue`（零成本返回），动态节点包装为 `DynamicRuntimeValue`（携带求值闭包和状态追踪）。编译期的 `CompiledValueNode` 是纯数据树，运行时的 `CompiledRuntimeValue` 是可执行的包装：

```typescript
type CompiledRuntimeValue<T> =
  | { kind: 'static'; isStatic: true; node: StaticValueNode<T>; value: T }
  | {
      kind: 'dynamic';
      isStatic: false;
      node: DynamicValueNode<T>;
      createState(): RuntimeValueState<T>;
      exec(context, env, state): ValueEvaluationResult<T>;
    };
```

编译器会在编译阶段分析每个字段的值，判断它是哪种节点，然后生成对应的编译结果。运行时只需要执行这个编译结果，不需要再做任何判断。表达式编译时还会进行自动优化：如果发现表达式的值是固定的（如 `"${1 + 2}"` 会被优化为静态值 `3`），则直接返回静态值，不会产生额外的运行时开销。因此即使写的是表达式形式，只要结果是固定的，编译器会自动消除动态求值成本。如果需要在模板字符串中输出字面量 `$` 符号，可以使用 `${'$'}` 进行转义。

通过 `CompiledValueNode` 的五种节点类型，将"值可以是静态的或动态的"这一语义差异限定在值的层面，这带来了三方面的好处：

- **Schema 更简洁**：字段数量减半，schema 作者不需要记忆 `xxxOn` 规则，`disabled` 就是 `disabled`
- **组合与继承无歧义**：每个字段名唯一，不存在 `disabled` 与 `disabledOn` 同时出现时的优先级冲突，逐层覆盖时语义始终清晰
- **编译时分类为后续优化奠定基础**：`static-node` 走零成本快路径，`expression-node` 和 `object-node` 独立追踪引用，为第3节的全值树编译提供了结构前提

这种设计也为类型安全提供了结构基础：每个节点都有明确的类型标签，TypeScript 可以在绝大多数调用路径上提供有效的类型检查——实现层为了实用性保留了少量类型断言，类型安全是分层的而非绝对的。

这种区分不是语法层面的便利，而是将值的语义差异从对象结构下沉到值层面。Schema 作者看到的就是运行时存在的，没有认知鸿沟。

## 3. 全值树编译 — 静态快路径与动态复用

统一值语义带来的一个重要特性是：我们可以编译整个 schema 值树而不只是其中的表达式。

传统框架通常只编译表达式，静态值在运行时直接使用。Flux 的做法是编译整个值树结构。

假设你有一个静态的配置对象：

```json
{
  "type": "button",
  "label": "Submit",
  "disabled": false,
  "className": "btn-primary"
}
```

在传统框架里，每次渲染时，这个对象都需要被解析和传递。而在 Flux 里，当 schema 首次传入渲染器时，编译器触发一次性的 JIT 编译——它识别出这是一个纯静态节点，生成对应的编译结果并缓存。此后每次运行时访问这个编译结果时，直接返回原始对象的引用，不需要再做任何判断。

对于包含动态部分的对象：

```json
{
  "type": "button",
  "label": "Submit",
  "disabled": "${$form.submitting}",
  "className": "${$form.submitting ? 'btn-disabled' : 'btn-primary'}"
}
```

编译器会将这个对象编译为 `object-node`，其中每个表达式字段拥有独立的求值状态。运行时执行时，对每个字段分别跟踪上次的计算结果；最终通过 `shallowEqual` 比较组装后的对象与上次的结果——如果所有字段的引用均未变化，则直接返回之前计算出的对象引用，不创建新对象。

`RuntimeValueState` 为每个节点维护上一次的计算值，`ValueEvaluationResult` 中的 `reusedReference` 标志告知调用方是否复用了旧引用。这个机制对 schema 定义的对象结构（`object-node`）效果最稳定：每个字段的表达式单独追踪，只要字段值的引用不变，外层对象引用就不会变。

这个设计对 React 性能的影响是显著的。React 的重新渲染基于引用比较，稳定的对象引用让子组件可以跳过不必要的渲染。

## 4. 作用域链 — 显式词法接口与延迟合并

在低代码框架里，作用域是一个核心概念。组件需要访问表单数据、页面参数、环境变量等各种上下文信息。

AMIS 通过 `createObject`（`amis-core/src/utils/object.ts`）来构建作用域链，其实现是 JavaScript 原型链：子作用域通过 `Object.create(parentScope)` 创建，变量查找沿原型链向上，同名变量自动遮蔽父级。这个机制本身并不粗暴，但它的问题在于**隐式性**——一切都通过 JS 引擎内部的原型链机制实现，没有显式的接口约定，也没有办法在不了解内部实现的情况下准确区分"只读当前层"和"读整条链"这两种操作。

Flux 采用了显式的 `ScopeRef` 词法查找链：

```typescript
interface ScopeRef {
  id: string;
  path: string;
  parent?: ScopeRef;
  value: Record<string, any>;
  get(path: string): unknown;
  has(path: string): boolean;
  readOwn(): Record<string, any>;
  readVisible(): Record<string, any>;
  materializeVisible(): Record<string, any>;
}
```

每个作用域通过 `parent` 指针链接起来，形成链式结构。查找变量时，`get(path)` 方法会沿着链向上查找，直到找到对应的值或者到达链的根部。

这种设计有几个关键优势：

- **接口语义明确**：`readOwn()` 只返回当前层的数据，`readVisible()` 返回词法链可见视图，`materializeVisible()` 才在需要 plain object 时显式展开。底层实现借助原型链优化 `readVisible()` 的性能，但接口语义与 JS 原型链的隐式行为无关——这几种操作的边界一目了然，不需要了解底层实现
- **延迟展开**：只有在真正需要完整 plain object 时才执行 `materializeVisible()`，大部分时候通过 `get()` 或 `readVisible()` 访问单个变量，避免不必要的对象构造
- **可测试性**：`ScopeRef` 是一个普通接口，可以独立构造和测试，不依赖 JS 原型链的隐式行为
- **可追踪性**：`id` 和 `path` 字段让作用域在调试和日志中可以被精确定位

使用模式也很清晰：`scope.get(path)` 是高频操作的快路径，`scope.readVisible()` 适合词法可见视图，`scope.materializeVisible()` 才是低频 plain-object 兜底方案。

## 5. 数据、动作、组件 — 三棵树，三种来源

Flux 将运行时拆分为三个独立的树结构。

从面向对象 GUI 系统的基本结构出发，一个完整的 GUI 运行时本质上包含三个正交维度：**ComponentTree**（组件在界面上的组织结构）、**StateTree**（数据与状态的分布与流向）、以及 **ActionTree**（可以执行的操作及其命名与解析规则）。这三个维度虽然在同一个 UI 里协作，但它们有着根本不同的生长方式和生命周期。传统的面向对象设计把它们混在一个树里，是引发复杂性的根源。

在 Flux 中，这三个概念层维度对应到具体的运行时载体：**StateTree ≈ `ScopeRef`**（词法数据可见性链）、**ActionTree ≈ `ActionScope`**（命名空间动作解析链）、**ComponentTree ≈ 编译后的 `Template` 结构**（不可变的组件树描述）。`ComponentHandleRegistry` 是独立的实例级定位层，负责通过 `id`/`name` 查找组件句柄，它支撑了 `component:<method>` 这类实例目标动作的解析。

这一分治思路源于面向对象 GUI 系统的一个基本事实：面向对象技术在 GUI 领域的核心精华是 ComponentTree + StateTree + ActionTree 三者之间的组织关系——组件构成静态结构，数据在状态树中流动，事件沿动作树冒泡。Flux 将这一观察形式化为三个独立的运行时结构，并赋予每棵树显式的词法查找语义。

特别值得注意的是词法作用域与事件冒泡的同构性：如果我们约定向上传递的事件名就是函数名，则事件冒泡过程可以被看作词法作用域中解析函数名的过程。`xui:imports` 在不同层级创建不同的词法作用域，动作解析总是从最近的作用域开始，未找到则向父作用域查找——这与编程语言中的变量解析规则完全一致。三棵树的分离不是为了分离而分离，而是因为三者有根本不同的生长方式和生命周期，强行统一只会引入不必要的耦合。

在 AMIS 这样的传统低代码框架里，数据和行为混在同一个作用域对象里。你需要访问数据？从作用域里取。需要调用动作？也从作用域里取。这种设计在简单场景下很方便，但它掩盖了一个本质区别：**数据和行为的组合来源根本不同。**

**数据是结构性的（structural）。** 数据随组件树的渲染自然流入——一个表单组件挂载时，它的字段值进入作用域；一个 `data-source` 组件获取到响应后，结果写入作用域。数据作用域的生长与组件树的渲染过程严格绑定，是被动的、跟随结构的。

**行为是声明式引入的（declarative import）。** 通过 `xui:imports`，一个容器可以从外部库导入能力——`demo-lib`、`spreadsheet-lib`，这些库与当前组件在树中的位置无关，它们是异步加载的，有独立的初始化和销毁生命周期。行为的来源在组件树之外。

如果把数据和行为放在同一棵树里，就会产生根本性的生命周期冲突：数据作用域跟随组件的挂载/卸载；而 `xui:imports` 加载的库可能需要异步初始化，需要引用计数来管理多次导入，需要在卸载时独立 teardown。这些需求无法用同一套机制统一管理。

因此 Flux 将运行时拆分为三棵独立的树：

**ScopeRef** 负责数据层面，包括值、变量、表单状态等纯数据信息。`get(path)` 沿链向上查找变量名，`readOwn()` 只读当前层，`readVisible()` 返回词法链可见视图——三种操作的语义由接口名直接表达，而非依赖实现细节。

**ActionScope** 负责动作能力，也就是可以执行的操作。动作通过命名空间组织——`designer:addNode`、`spreadsheet:setCellValue`——命名空间由 `xui:imports` 动态注册，与数据作用域完全隔离，不会因动作的增减影响变量查找。动作的解析顺序在 action dispatcher 中有明确的优先级：先查内置平台动作（`setValue`、`ajax`、`dialog`），再查组件目标动作（`component:submit`、`component:validate`），最后查命名空间动作（`designer:export`、`spreadsheet:mergeRange`）。这种层级既保证了灵活性，又提供了合理的默认行为。

**ComponentHandleRegistry** 负责组件实例的定位和访问。`id` 是 page 范围内稳定唯一的定位锚点；`name` 是局部逻辑名，适合在不同局部边界内复用，但在同一解析边界内如果重复会触发显式 ambiguity 错误。schema 作者通过 `component:<method>` 配合 `componentId` 或 `componentName` 指定目标组件；运行时可对可静态解析的目标做内部索引优化，以降低常见查找成本。

这三棵树共享同一套设计直觉：**链式词法查找**。`ScopeRef.get(path)` 解析变量名，`ActionScope.resolve('demo:open')` 沿链查找 `demo` 命名空间（就像编程语言中词法作用域解析函数名一样），`ComponentHandleRegistry.resolve(target)` 定位组件句柄。三棵树各自维护独立的生命周期语义，但每棵树内部的查找逻辑都遵循相同的链式向上原则，保持了整体设计的一致性。

这种"三棵树分离"的设计延续了 MVC 等经典架构中关注点分离的思想，但将其落地为低代码领域的一套自洽的实现方案。

### 5.1 xui:actions — Schema-Local 命名动作链

三棵树的分离让动作的来源清晰可控，但在实际使用中还有一个反复出现的问题：可复用的动作序列如何在 schema 中表达？

在之前的实现中，如果多个 schema 节点需要执行相同的动作序列（例如一组参数固定的 `ajax` 调用），唯一的办法是将这些动作定义在高层级节点上并通过命名引用，或者在每个节点上重复定义。前者导致动作定义远离使用位置，后者造成冗余。

`xui:actions` 解决了这个问题。Schema 节点现在可以通过 `xui:actions` 声明命名动作链：

```json
{
  "type": "container",
  "xui:actions": {
    "myAction": [
      { "action": "ajax", "args": { "url": "/api/submit" } },
      { "action": "notify", "args": { "message": "提交成功" } }
    ]
  },
  "body": [
    {
      "type": "button",
      "onClick": {
        "action": "myAction"
      }
    }
  ]
}
```

编译时，`xui:actions` 中声明的动作链被编译并存储在模板节点上。运行时通过 ActionScope 提供访问——这是一个由编译结果驱动的合成命名空间，不需要通过 `xui:imports` 显式导入。

词法继承是关键设计：命名空间的提供者在当前层未找到请求的动作名时，会向上回退到父作用域继续查找。这意味着子节点自动继承父节点定义的命名动作，无需重新声明。这一行为与数据作用域的词法查找模型完全一致——动作的来源虽然与数据不同，但查找语义遵循相同的设计直觉。

动作的解析顺序因此扩展为：

1. **内置平台动作**（`setValue`、`ajax`、`dialog` 等）
2. **组件目标动作**（`component:submit`、`component:validate`）
3. **命名动作**（`xui:actions` 定义的局部动作链）
4. **命名空间动作**（`xui:imports` 导入的外部库）
5. **解析失败**：以上均未匹配时报错

`xui:actions` 的加入让"命名动作"成为解析链中的一等公民，与内置动作和命名空间动作并列，各层各有来源、各有优先级。这解决了之前的实际痛点：可复用的动作序列可以就近定义、词法继承，不再需要在全局层级与逐节点复制之间做二选一的妥协。

## 6. xui:imports — 声明式能力导入

`xui:imports` 是行为与数据分离的直接体现，解决的是一个很实际的问题：schema 作者不能写 `import` 语句，schema 可能从服务端动态加载，如何让 schema 片段声明它所依赖的外部能力，又不造成全局污染？

在传统框架里，通常通过全局注册引入第三方能力。问题是全局注册容易冲突，而且无法控制作用域。

Flux 借鉴了 ES 模块导入的设计，引入了 `xui:imports` 声明：

```json
{
  "type": "container",
  "xui:imports": [{ "from": "demo-lib", "as": "demo" }],
  "body": [
    {
      "type": "button",
      "onClick": {
        "action": "demo:open",
        "args": { "id": "${id}" }
      }
    }
  ]
}
```

`from` 指定要导入的库，`as` 指定导入后的命名空间前缀。导入的库被注册到当前容器的 `ActionScope` 中，成为该容器及其后代可用的动作命名空间。复杂宿主如 Flow Designer、Report Designer、Spreadsheet 也遵循同样的词法边界纪律：每个宿主页面建立自己的本地 `ActionScope`，再在该边界内注册宿主命名空间。

`xui:imports` 有几个关键特性：

- **声明式**：在 schema 里明确声明依赖，不需要在代码里注册
- **词法可见性**：子容器可以看到父容器的导入，但兄弟容器之间互相看不到——这符合直觉，也避免了命名冲突
- **幂等性与自动去重**：同一个库在多个层级导入时，模块加载会按规范化后的 import key 去重；scope 侧注册按容器生命周期维护。当前实现已经有 frame 级引用计数与释放路径，重复安装会增加 `refCount`，释放时通过 import stack 出栈并清理对应注册
- **安全性**：`from` 的值通过宿主提供的 `env.importLoader` 解析，框架本身不执行任何 URL 解析或脚本加载。安全边界的划分是明确的：框架负责管理导入的词法可见性和生命周期（注册与 teardown），宿主负责决定哪些库可以被加载以及如何加载。建议宿主实现时采用白名单机制，只允许加载预先注册的可信库标识符，而非接受任意 URL。当前实现下，如果宿主未提供 `importLoader`，导入不会被静默忽略，而是进入显式失败状态，并通过 `env.notify('error', ...)` 与 monitor 诊断暴露接线错误；后续对该命名空间的调用会返回失败结果。命名空间的隔离保证了导入的库不能覆盖内置平台动作（`setValue`、`ajax` 等），命名空间动作的解析优先级始终低于内置动作

这也解释了为什么 `ActionScope` 必须与 `ScopeRef` 分离：导入库的加载是异步的，并且拥有独立的注册、引用计数与 teardown 语义，这些特性与数据作用域的同步、结构性生长方式根本不兼容。

## 7. 数据获取与动态 Schema — Service 的拆分

在 AMIS 里，`Service` 是一个"全能"组件：它同时承担两项职责——通过 `api` 获取数据（`store.fetchData`）以及通过 `schemaApi` 动态加载 Schema（`store.fetchSchema`）。这两条路径共享同一个组件实例、共享同一个 store，生命周期紧密耦合在一起。如果你想只加载 Schema 同时还想获取数据，甚至加上轮询，`initFetch`、`initFetchSchema`、`interval`、`stopAutoRefreshWhen` 等属性必须组合在一起，schema 的意图就变得模糊。

而且，AMIS 里 API 请求的数据和作用域合并方式是隐式的——框架内部通过 `createObject` 将当前数据域合并到请求参数中，用户难以精确控制哪些数据会被发送到服务端。schema 作者必须理解这些隐式行为才能正确使用它们。

从计算模型的视角看，`api` 和 `schemaApi` 是两种根本不同的计算模式。`api` 本质上是一个**响应式异步计算**：它建立的是"状态 → 远程值"的映射关系，状态变化时重新触发请求，是异步版本的 `computed`——输入是作用域中的当前状态，输出是一个会随状态变化而更新的远程值。而 `schemaApi` 是一次性的**结构初始化**：它在组件首次挂载时触发，拿到的结果是渲染树的描述，用于决定"渲染什么"，而不是"显示什么数据"。将两者混合在同一个组件里，既是生命周期耦合，也是计算语义的类型混淆。

Flux 将这两项职责拆为独立的渲染器。远程调用统一通过 action dispatch 进入运行时：

```json
{
  "type": "container",
  "body": [
    {
      "type": "data-source",
      "action": "ajax",
      "args": {
        "url": "/api/user/${userId}",
        "includeScope": ["userId"]
      },
      "name": "user",
      "interval": 3000,
      "stopWhen": "${user.loaded}"
    },
    {
      "type": "text",
      "text": "Hello, ${user.name}"
    }
  ]
}
```

`data-source` 专门负责声明式数据获取。它是一个不直接渲染 UI 的副作用节点：通过 action 机制获取数据，按 `name` 将结果发布到当前作用域，并可选地通过 `interval` + `stopWhen` 轮询。它自身返回 `null`，因此 loading、空态或错误展示由同一作用域下的兄弟节点或宿主通知机制承担。

```json
{
  "type": "dynamic-renderer",
  "loadAction": {
    "action": "ajax",
    "args": { "url": "/api/schema/${pageId}" }
  },
  "body": {
    "type": "text",
    "text": "Loading..."
  }
}
```

`dynamic-renderer` 专门负责动态 Schema 加载。它通过 `loadAction` 声明加载动作（与 `data-source` 统一使用 action 机制），获取远端 Schema 并渲染，只关注"渲染什么"这一件事。

这种拆分带来了几个好处。首先，关注点更清晰：一个组件只做一件事，意图更容易理解。其次，生命周期独立——`data-source` 的轮询不会影响 `dynamic-renderer` 的 Schema 加载。最后，请求描述对象的语义也更精确：`includeScope` 明确声明哪些词法作用域变量会被注入请求，`params` 明确区分 URL 查询参数，而真正的执行路径则统一收敛到 `ajax` action 与运行时请求准备流程。

## 8. 字段元数据驱动 — 编译器而非渲染器做决策

一个 `title` 字段，可能是字符串 `"Hello"`，也可能是渲染片段 `{ "type": "text", "text": "Hello ${name}" }`，甚至可能是事件处理器。渲染器每次都要判断字段类型再分派逻辑——既容易出错，又影响性能。

Flux 的做法是：让渲染器定义字段元数据，由编译器在编译阶段完成规范化处理。

字段元数据包括字段的种类：`meta`、`prop`、`region`、`value-or-region`、`event`、`ignored` 等。最有趣的是 `value-or-region`，这允许同一个字段名根据输入类型采用不同的编译方式：

```json
{
  "type": "card",
  "title": "Simple Title"
}
```

这里 `title` 是一个字符串，编译后作为 `props.title` 直接传递给渲染器。

```json
{
  "type": "card",
  "title": {
    "type": "text",
    "text": "${name} - ${status}"
  }
}
```

这里 `title` 是一个 schema 片段。编译后作为 `regions.title`，渲染器会渲染这个片段的内容。

渲染器的代码非常简洁，不需要做任何判断：

```tsx
const titleContent = props.regions.title?.render() ?? props.props.title;
```

编译器已经把复杂的判断逻辑前置了，渲染器因此保持简洁，只消费编译输出。

## 9. 样式系统 — 可配置的显式样式

渲染器硬编码样式（比如容器默认 `gap-4`），schema 作者看不到默认值就难以调整；完全不提供样式，又导致每个使用场景都要重复配置。

Flux 的样式系统借鉴了 shadcn/ui 的设计思路，将样式职责分为两层：**组件库层的视觉默认**和**渲染器层的结构编排**。底层 UI 组件（shadcn/ui 基于 Base UI）自带合理的视觉默认样式——border、圆角、focus ring、间距等——一个 `{ "type": "input-text" }` 不需要任何额外类名就能渲染为风格一致的输入框。**渲染器层不在组件库默认样式之上注入额外的视觉偏好**，schema 中的 `className` 用于布局编排和视觉定制，而非提供基础外观。

核心原则是：渲染器层不注入与 schema 意图无关的默认视觉样式。基础组件的视觉表现由 shadcn/ui 提供，渲染器只负责结构语义（flex 方向、对齐方式等）的翻译。这意味着你查看一个组件的 schema 时，看到的 className 是布局和定制的声明，而非基础外观的重复定义。`nop-container`、`nop-flex` 这样的组件只负责结构语义，不携带固定的视觉风格。当渲染器根据 `direction`、`align` 等语义属性映射到 `flex`、`items-center` 等工具类时，这是对 schema 意图的直接翻译，而不是在 schema 之外引入隐式偏好。

这种做法有几个实际的好处：

- **完全可控**：所有渲染器层的样式都在 schema 中显式可见，不存在"这个间距是从哪来的"这样的困惑
- **覆盖无歧义**：由于渲染器不注入隐式样式，任何自定义类名都会直接生效，不需要用 `!important` 对抗框架默认值
- **项目级复用**：同一套 Tailwind 配置可以跨页面共享，保证视觉一致性
- **AI 友好**：显式可预测的样式接口对 AI 生成场景更有利——AI 不需要"知道"渲染器内部注入了什么，生成结果所见即所得

当同一组 Tailwind 类名在多个地方重复出现时，`classAliases` 提供了复用抽象：

```json
{
  "classAliases": {
    "card": "bg-white rounded-lg shadow-md p-4",
    "card-hover": "hover:shadow-lg hover:border-blue-300",
    "btn-primary": "bg-blue-500 text-white hover:bg-blue-600"
  }
}
```

在组件里使用时，直接引用这些别名：

```json
{
  "type": "card",
  "className": "card card-hover",
  "body": [
    {
      "type": "button",
      "className": "btn-primary",
      "label": "Submit"
    }
  ]
}
```

`classAliases` 是对 Tailwind 之上的一层命名抽象——它不改变"样式显式声明"的原则，schema 里依然写的是 `className: "card card-hover"`，没有任何样式是由渲染器悄悄注入的。它解决的是重复书写的问题，而非引入隐式行为。

作用域继承机制也很自然：子组件可以覆盖父组件的同名别名。比如在某个特定区域内，如果需要不同的 `card` 样式，只需要在该区域的 `classAliases` 中重新定义即可，不影响其他地方。

## 10. 分层职责 — 渲染器不需要知道的事情

低代码框架常见的设计倾向是把所有关注点都塞进渲染层：i18n 用 `t('key')` 函数、权限用 `v-if="hasPermission"` 条件渲染、模块化用全局注册。这导致渲染框架的职责边界模糊，内部复杂度不断膨胀。

Flux 采用了不同的策略：**明确划分哪些关注点属于渲染框架，哪些属于平台层或组件库层。**

```
Nop 平台层（结构变换）
  → i18n 文本替换（@i18n: 前缀，纯 JSON 操作）
  → 权限裁剪（xui:roles / xui:permissions，删除无权限节点）
  → 模块分解合并（x:extends / x:gen-extends）
  → 编译期元编程（XPL 模板语言）
  → XML/JSON 双向转换
         ↓ 输出处理后的纯净 JSON
Flux 渲染框架层
  → 统一值编译、作用域管理、动作分发、渲染协调
         ↓
shadcn/ui 组件层（Radix UI）
  → 组件级视觉默认样式
  → 组件级无障碍支持（ARIA 角色、焦点管理、键盘导航）
```

这种分层的核心原则是：每一层只解决属于自己的问题，不向相邻层泄漏职责。

### 10.1 国际化（i18n）— 平台层的结构变换

i18n 在平台层通过 JSON 结构变换完成，不涉及任何前端框架的运行时机制。Nop 平台提供两种互补的语法：

**值内嵌方式**——紧凑，适合新建 schema：

```json
{
  "label": "@i18n:common.batchDelete|批量删除"
}
```

`@i18n:` 前缀标识需要替换的国际化键，`|` 后的文本既是 fallback 也提供可读性——即使不查 i18n 字典也能看懂 schema 在说什么。

**伴随属性方式**——不侵入原有值，适合对已有 schema 做国际化改造：

```json
{
  "label": "批量删除",
  "@i18n:label": "common.batchDelete"
}
```

为需要国际化的 key 增加对应的 `@i18n:key` 属性，原有值不被修改。

处理完毕后，JSON 中不再存在 `@i18n:` 标记，渲染框架看到的就是当前语言环境下的最终文本。这意味着换任何渲染层——Flux、AMIS、甚至原生 React——i18n 都能工作。

### 10.2 权限控制 — 结构裁剪优于运行时隐藏

权限控制同样在平台层处理。Nop 平台规定了 `xui:roles` 和 `xui:permissions` 等权限相关属性，在接收到 JSON 格式的页面数据之后，自动验证权限属性是否满足，并**删除所有不满足权限要求的节点**。这一处理过程在 JSON 结构上进行，不涉及任何前端框架特有的知识。

这比运行时条件隐藏更安全：敏感结构从未离开服务端。渲染框架根本看不到用户无权访问的内容，不存在"组件在 DOM 中被隐藏但数据已经到达客户端"的风险。

### 10.3 Schema 模块化 — 可逆计算的分解与合并

Nop 平台基于可逆计算理论针对 JSON 和 XML 实现了通用的分解合并机制，可以按照通用的规则将很大的 JSON 文件分解为多个小型文件，相当于是为低代码 schema 补充了模块组织语法。

最常用的是两个语法：`x:extends` 用于表示继承外部的某个文件，`x:gen-extends` 表示动态生成可以被继承的 JSON 对象：

```yaml
x:gen-extends: |
  <web:GenPage view="NopAuthDept.view.xml" page="main"
               xpl:lib="/nop/web/xlib/web.xlib" />

body:
  name: crud-grid
  actions:
    - type: button
      id: test-button
      label: 'Test'
      onClick:
        action: dialog
        args:
          'x:extends': test.page.yaml
          title: 'Test Dialog'
```

以上示例表示：首先根据 `NopAuthDept.view.xml` 的配置动态生成一个 CRUD 页面，然后再在批量操作按钮区增加一个 Test 按钮，点击按钮弹出的对话框复用已有的 `test.page.yaml` 文件，`title` 属性会覆盖 `x:extends` 继承的内容，将对话框标题设置为 `Test Dialog`。

`x:extends` 相当于是在 Tree 结构上执行的、类似面向对象继承操作的通用操作符。这直接解决了大多数低代码框架中"一个大页面就是一个大 JSON 文件"的模块化难题。

`x:gen-extends` 进一步允许在编译期用 XPL 模板语言动态生成被继承的结构，实现编译期元编程。对于任意 JSON 格式的外部文件，只需将普通的加载函数修改为 Nop 平台提供的 ResourceLoader 调用，即可自动获得可逆计算所定义的分解、合并操作。

这些能力在 JSON 到达渲染器之前完成，Flux 不需要也不应该内置模块系统。

### 10.4 XML 与 JSON 的双向转换

在手工编写和阅读的时候，XML 格式相对于 JSON 格式有一定优势，特别是集成外部模板引擎用于动态生成的时候。Nop 平台为低代码 schema 增加了 XML 格式的语法表达形式，按照简单的几条规则实现 XML 和 JSON 之间的双向转换：

1. `type` 属性对应于标签名
2. 简单类型的属性对应于 XML 的属性名
3. 复杂类型的属性对应于 XML 的子节点
4. 如果是列表类型，则在节点上标注 `j:list=true`
5. `body` 属性会被特殊识别，不用明确标注 `j:list`

例如以下 JSON：

```json
{
  "type": "operation",
  "label": "操作",
  "buttons": [
    {
      "label": "详情",
      "type": "button",
      "level": "link",
      "onClick": {
        "action": "openDialog",
        "args": {
          "title": "查看详情",
          "body": {
            "type": "form",
            "body": [
              {
                "type": "input-text",
                "name": "browser",
                "label": "Browser"
              }
            ]
          }
        }
      }
    }
  ]
}
```

对应于 XML 格式：

```xml
<operation label="操作">
  <buttons j:list="true">
    <button label="详情" level="link">
      <onClick action="openDialog">
        <args title="查看详情">
          <body>
            <input-text name="browser" label="Browser" />
          </body>
        </args>
      </onClick>
    </button>
  </buttons>
</operation>
```

Nop 平台中的 XPL 模板语言为动态生成 XML 提供了诸多简化帮助：

```xml
<button xpl:if="xxx" label="${'$'}{grade}" icon="${icon}">
</button>
```

`xpl:if` 表示条件表达式，只有返回 true 时整个节点才会被生成。所有 XML 属性生成时如果属性值为 null，则自动忽略，不输出到最终结果中——借助这一 null 属性过滤机制，可以简洁地控制哪些属性会被生成。

转成 XML 后的 schema 很接近普通的 HTML 或 Vue 模板，大幅提升了手工编写和阅读的体验。

### 10.5 无障碍访问（a11y）— 组件库层的职责

无障碍访问由底层组件库承担。shadcn/ui 基于 Base UI 构建，后者提供了完整的 WAI-ARIA 支持：

- **Dialog**：自动焦点陷阱（focus trapping）、Escape 关闭、焦点恢复
- **Select / Combobox**：完整的 ARIA 角色、箭头键导航
- **Menu**：roving tabindex、aria-expanded 状态管理
- **Form 控件**：label 与 input 的自动关联、错误提示的 aria-describedby

Flux 渲染器的职责是**不破坏**这些已有的无障碍能力——透传 aria-\* 属性、不用 div 替代语义元素、不吞掉键盘事件。这是"不做错事"而非"主动做事"。

### 10.6 GraphQL 简化

GraphQL 总是需要指定返回字段列表，但对于低代码平台来说，表单中具有哪些字段是可以根据模型分析得到的。Nop 平台支持通过 REST 风格配置直接调用 GraphQL 后端：

```json
{
  "url": "/r/NopAuthUser__get",
  "data": { "id": "${id}" },
  "gql:selection": "xxx,yyy"
}
```

`gql:selection` 会根据当前表单的字段定义自动生成 GraphQL 的字段选择集，减少了 schema 作者需要手工维护的信息量。

### 10.7 小结

这种分层让 Flux 可以保持更小的职责范围和更简单的内部结构。渲染框架就是一个纯粹的 schema 解释器，它不需要知道 i18n、权限、模块化的存在——这些关注点已经在它看到 JSON 之前被解决了。a11y 由组件库层保障，渲染器只需要确保不破坏已有的无障碍能力。每一层的职责边界是显式的：能在结构变换层解决的问题不带进运行时，能在组件库层解决的问题不在渲染器中重复实现。

## 11. 技术栈与分层架构

Flux 采用 React 19、TypeScript 6.0 严格模式、Zustand 5、Vite 8、TailwindCSS 4、pnpm workspace。其中 Zustand vanilla stores 的选择有明确的架构动机：store 与 React 生命周期解耦，可以独立创建、更新和订阅，不绑定组件树——这直接对应了 AMIS MST 架构中 store 树与组件树紧耦合所带来的问题。

整个项目采用分层架构，包之间有清晰的依赖关系：

```
flux-core (类型定义、契约、纯工具函数)
  → flux-formula (表达式编译器、求值器)
    → flux-compiler (schema 编译、诊断、模板图构建)
      → flux-action-core (动作编译与调度语义)
        → flux-runtime (stores、生命周期、运行时桥接)
          → flux-react (React hooks、渲染层)
            → flux-renderers-* / 设计器 / 编辑器
              → apps/playground

flux-core
  → flux-i18n
    → flux-react / @nop-chaos/ui
```

每一层都有明确的职责，上层依赖下层，下层不依赖上层。依赖方向单向，包的职责边界清晰。

React 集成方式也很讲究：在边界处显式，在中间隐式。

- 渲染器的 props 包含 renderer-local 的数据：schema、node、props、meta、regions、events
- Hooks 提供运行时状态的访问：useRendererRuntime、useScopeSelector、useCurrentForm

这种划分让组件的接口更清晰，哪些数据是从 props 传入的，哪些是通过 hooks 获取的，一目了然。

## 12. 宿主契约 — RendererEnv

宿主契约并不是 Flux 的发明。AMIS 早已设计了 `RendererEnv`：渲染器不直接调用 `fetch()`，而是调用 `env.fetcher()`；不直接操作路由，而是调用 `env.jumpTo()`。这个模式的核心洞察是：**低代码框架本质上是一个解释器，它的"系统调用"应该由宿主实现，而不是由框架硬编码**。框架只规定接口，具体实现交给宿主——这让同一套框架可以嵌入不同的宿主环境，HTTP 库和路由库的选择权留在宿主侧。

Flux 在这个基础上做了两处完善。

第一处是 **`env.importLoader` 的引入**。`xui:imports` 是 Flux 新增的能力，AMIS 中没有对应机制，因此 AMIS 的 `RendererEnv` 自然也没有这个接口。`importLoader` 承接了 `xui:imports` 声明的库加载逻辑——加载哪个模块标识、如何缓存、如何处理加载失败——这些决策全部由宿主掌控，框架只负责在正确的时机调用它并管理词法可见性、注册与释放。安全边界也随之确立：框架负责执行 schema 中已进入运行时边界的声明，而外部库的加载与执行完全由宿主通过 `importLoader` 控制。

第二处是 **最小必选接口的明确化**。Flux 的 `RendererEnv` 将接口精简为两个必选字段——`fetcher`（网络请求）和 `notify`（消息通知），其余能力（`navigate`、`confirm`、`functions`、`filters`、`importLoader`、`monitor`）均为可选字段。当前 `fetcher` 接收的已经不是 author-facing `ApiSchema`，而是经过运行时请求准备后的 `ExecutableApiRequest`；也就是说，请求表达式求值、`includeScope` 合并、`params` 规范化与 adaptor 应用发生在 fetcher 之前，宿主看到的是最终可执行请求。

这两处完善合在一起，让 Flux 的宿主契约可以用一个公式来概括：

```
output = FluxPage(schema, env)
```

`schema` 是描述"渲染什么"的声明，`env` 是宿主提供的执行环境，`FluxPage` 是解释器。只要实现了 `RendererEnv`，Flux 就可以嵌入任意宿主框架，而不对宿主的路由库、请求库或模块系统做任何假设。这是 AMIS 奠定的抽象方向，Flux 沿着这个方向走得更彻底。

## 13. 性能设计原则

在 Flux 中，性能是架构决策，不是事后优化。Flux 的性能设计遵循几个优先级原则：

1. 保留静态快路径：静态值的访问应该零成本，直接返回对象引用
2. 保留动态引用复用：动态计算的结果如果没变，返回相同的对象引用
3. 避免热点路径中的合并对象构造：尽量用 `scope.get()` 而不是 `scope.materializeVisible()`
4. 保持 selector 订阅的精确性：只订阅真正需要的数据
5. 对高频动作应用防抖或取消机制

`useScopeSelector(selector, equalityFn)` 是一个重要的工具。它允许你选择性地访问作用域中的数据，而不是订阅整个作用域的变化。这避免了连锁重新渲染的问题。

React 上下文的拆分也很关键。runtime、scope、action-scope、component-registry、node-meta、form、page 等不同的上下文，各自的变化频率不同。把它们拆分开，可以减少不必要的重新渲染。

这些设计是框架级的通用保障，不依赖特定场景。

## 14. 错误处理与开发体验

**编译阶段**：当前基线下，表达式与模板编译失败不再作为默认的“静默降级”路径；编译/求值错误应按可能抛错来理解和处理。未知渲染器类型等结构性问题同样应由编译或运行时显式暴露，而不是依赖隐式回退。

**表达式求值**：运行时表达式求值的错误会向上传播。容错边界在宿主侧或 React 的 ErrorBoundary，而不在框架内部。

**动态 schema 加载**：`dynamic-renderer` 的 `loadAction` 请求失败时，渲染行内错误提示（Error: {message}）；body region 在 schema 加载完成前作为占位内容渲染。重试需由 loadAction 依赖项变化触发重新挂载。

**开发工具**：`nop-debugger` 当前提供浮动调试面板，可查看 compile、render、action、api、notify、error 等事件的时间线，以及 network 视图和基于 `data-cid` 的节点检查能力。结合组件句柄与表单 store，它已经能够展示部分组件状态与 form state 快照。`ActionScope` 的命名空间链和 `ComponentHandleRegistry` 的完整内部索引尚未作为稳定的调试 UI 暴露；表达式求值面板当前也保持禁用状态。动态节点（expression-node、template-node）在编译后保留 source 字段，可在调试时追溯到原始表达式文本；静态节点没有 source 字段。

**严格校验模式（Strict Validation）**：Schema 作者可以在 `SchemaRenderer` 上启用 `strictValidation: true` 来激活严格编译模式。在严格模式下，编译器对 schema 属性进行更严格的检查：对于封闭属性模型（closed-prop-model）的渲染器，未知的 schema 属性被报告为错误；对于开放渲染器，未知属性被报告为警告。这种区分既保证了严格性，又不影响那些设计上就接受任意属性的渲染器类型。

严格模式的实际价值在于前向兼容性安全：当渲染器的 schema 契约发生变化时（例如某个属性被重命名或移除），严格模式会立即捕获到残留的旧属性，而不是静默忽略它们。这种即时反馈机制避免了"schema 看起来正确但行为不符合预期"的隐蔽问题。严格模式也可以在运行时通过调试器动态切换，允许在不重新部署的情况下实时检查 schema 有效性。

## 15. 验证 Owner 分层

Flux 的验证系统围绕一个分层的 Owner 层次结构组织，每个 Owner 管理一组具有独立生命周期的验证合约。

**Form owner**：表单作用域内的主要验证 Owner，负责管理表单级字段验证。当渲染器检测到 `type: "form"` 时，自动创建 Form owner 并接管其下所有字段的验证生命周期。

**Page-root owner**：`SchemaRenderer` 在页面根级别创建一个验证 Owner，负责处理不属于任何表单的根级字段验证。这确保了即使没有显式表单包装，顶层字段也能获得验证支持。

**Surface owner**：由托管的对话框（dialog）或抽屉（drawer）表面创建的独立验证 Owner，为表面承载的内容提供作用域化的验证。Surface owner 的生命周期与表面的打开/关闭绑定，关闭时自动销毁其下所有验证状态。

**Detail-child owner**：`detail-field` / `detail-view` 创建的子验证合约，挂靠在父 Owner 上，支持分阶段编辑（staged editing）与草稿验证。子 Owner 可以独立验证而不影响父 Owner 的验证状态，提交时才将验证结果合并到父级。

每个 Owner 都有显式的生命周期阶段：`bootstrapping` → `active` → `refreshing` → `disposed`。`bootstrapping` 阶段完成字段注册与初始校验规则的挂载；`active` 阶段接受用户交互与实时验证；`refreshing` 阶段处理作用域数据刷新导致的验证状态同步；`disposed` 阶段清理所有验证资源。

`formId` 机制使得跨表单操作成为可能：`setValue` / `setValues` / `submitForm` 等动作可以通过 `formId` 精确指定目标表单，在 `formId` 不匹配时显式失败——这避免了动作误发到错误表单的隐蔽问题。

## 16. 总结 — 设计哲学

回顾整个 Flux 的设计，可以看到几个贯穿始终的核心原则：

1. **统一语义胜过平行字段家族**。值内部的语义差异限定在值的层面判断，不上升到对象结构；一个字段，多种形式，编译器负责判断，字段名唯一保证组合无歧义。

2. **编译一次，静态优化，动态复用**。schema 加载时触发一次性 JIT 编译，运行时享受静态分析和动态复用的双重好处。

3. **词法作用域链，显式接口，延迟合并**。`get()` 是快路径，`readVisible()` 是可见视图，`materializeVisible()` 是低频兜底，接口语义清晰可测。

4. **GUI 三棵树正交分治**。ComponentTree、StateTree、ActionTree 各自独立，共享词法查找的设计直觉但维护不同的生命周期语义。

5. **声明式导入与词法可见性**。ES 模块风格的导入，作用域内的能力可见性，独立生命周期管理（幂等加载 + 引用计数 + 释放）。

6. **字段元数据驱动编译，渲染器不做猜测**。编译器前置处理复杂逻辑，渲染器消费规范化的输出。

7. **职责单一，计算语义清晰**。`data-source` 是 runtime-owned 的值生产节点，`loadAction` 是一次性结构初始化；远程调用统一通过 action dispatch 进入运行时，而请求描述对象只负责 transport contract。

8. **可配置的显式样式**。渲染器层不注入与 schema 意图无关的默认视觉样式；基础组件视觉表现由 shadcn/ui 提供；布局和定制通过 Tailwind 工具类和 `classAliases` 在 schema 中显式声明，在可预测与可复用之间取得平衡。

9. **沿用并完善宿主契约**。`RendererEnv` 是 AMIS 奠定的抽象方向；Flux 在此基础上引入 `env.importLoader` 支持 `xui:imports`，并把 fetcher 收敛到最终可执行请求边界，让框架成为纯粹的 schema 运行时。

10. **分层解决，不越界处理**。i18n、权限、模块化在平台层通过 JSON 结构变换解决，a11y 在组件库层通过 Radix UI 解决，渲染框架层只处理属于自己的关注点——编译、作用域、动作、渲染协调。每一层的职责边界是显式的：能在结构变换层解决的问题不带进运行时，能在组件库层解决的问题不在渲染器中重复实现。

11. **性能设计前置到架构层**。不是事后修补，而是从第一行代码起就作为设计约束。

这些原则之间存在依赖关系：统一值语义让全值树编译成为可能，值层面的判断让字段组合无歧义；三棵树的正交分治让 `xui:imports` 的异步生命周期得以独立管理；`data-source` 与 `dynamic-renderer` 的计算语义分离让 Service 的拆分有了更坚实的理论基础；`RendererEnv` 让分层架构的最外层有了明确的宿主集成边界。Flux 不需要成为一个全能框架，它只需要把渲染层的事情做对，其余交给平台层和组件库层各司其职。

**nop-chaos-flux 已开源：**

- GitHub: https://github.com/entropy-cloud/nop-chaos-flux
- Gitee: https://gitee.com/canonical-entropy/nop-chaos-flux
