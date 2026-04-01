# NOP Chaos Flux： 一个低代码渲染框架的设计哲学


## 1. 引言 — 为什么需要又一个低代码框架？

当我们谈论低代码渲染框架时，AMIS 是绕不过去的名字。它功能强大、文档丰富，被广泛用于各种企业级应用。但就像所有成功的老项目一样，它的架构也背负着历史包袱。随着功能不断叠加，各种 `disabledOn`、`visibleOn`、`hiddenOn`、`requiredOn`、`staticOn` 这样的平行字段家族不断膨胀——每个需要动态控制的属性都要配一个 `xxxOn` 变体。schema 变得越来越复杂，维护成本也水涨船高。

NOP Chaos Flux 是对 AMIS 的一次彻底重写。这不是为了换技术栈而重写，而是为了从根本上重新思考：一个基于 schema 驱动的渲染框架，应该如何设计才能既强大又可维护？

这个问题没有标准答案。但经过大量的实践和思考，我们形成了一套独特的设计哲学。这套哲学不是凭空想象的，而是来自对 AMIS 等现有框架的深入分析，以及对现代前端工程化的理解。
接下来，我想用一个工程师的视角，带你看看这个框架背后的核心设计。有些理念可能需要你稍微转换一下思维模式，但一旦理解了，你会发现很多曾经困扰的问题都有了优雅的解决方案。
## 2. 核心理念 — 统一值语义

这是 Flux 最核心的创新，也是和 AMIS 最本质的区别。

在 AMIS 的实现中，你会经常遇到这样的设计：一个属性既可以是静态值，也可以是表达式。为了区分这两种情况，AMIS 在 base schema（`amis-core/src/schema.ts`）里引入了一系列平行字段。每个需要动态控制的属性都被拆成了两份：一个静态字段和一个带 `On` 后缀的表达式变体——`disabled` / `disabledOn`、`visible` / `visibleOn`、 `hidden` / `hiddenOn`、`required` / `requiredOn`、`static` / `staticOn`。在某些渲染器里（如 Table/CRUD），还有 `classNameExpr` 这样的表达式变体。
这看起来没什么问题，但当你需要扩展时，事情就会变得失控。每当 schema 需要支持一个新字段的动态计算，就得为它新增一个 `xxxOn` 变体。字段数量翻倍。schema 作者不得不记住哪个用静态写法、哪个用表达式写法。更尴尬的是，这两者是互斥的——你写了 `disabled: true` 就不能同时写 `disabledOn`，但框架里并没有强制约束这一点。全靠约定和文档。

Flux 的解决方案是：**一个字段，多种形式**。

`disabled` 就是 `disabled`，它可以是静态布尔值 `true`，可以是表达式 `${form.submitting}`，也可以是模板 `"{{name}} is disabled"`。怎么区分这些形式？让编译器来做决定，而不是让 schema 作者记住各种后缀。
这背后的类型系统是这样的:

```typescript
type CompiledValueNode<T> =
  | { kind: 'static-node'; value: T }
  | { kind: 'expression-node'; source: string; compiled: CompiledExpression<T> }
  | { kind: 'template-node'; source: string; compiled: CompiledTemplate<T> }
  | { kind: 'array-node'; items: CompiledValueNode[] }
  | { kind: 'object-node'; keys: string[]; entries: Record<string, CompiledValueNode> }
```

编译器会在编译阶段分析每个字段的值，判断它是哪种节点，然后生成对应的编译结果。运行时只需要执行这个编译结果，不需要再做任何判断。

这样设计的好处显而易见：schema 更简洁，字段数量大幅减少,开发者不需要记住各种后缀规则。更重要的是，这种设计天然支持类型安全。因为每个节点都有明确的类型信息，TypeScript 可以在整个编译和执行过程中提供完整的类型检查。
## 3. 全值树编译 — 静态快路径与动态复用

统一值语义带来的一个重要特性是：我们可以编译整个 schema 值树而不只是其中的表达式。

传统框架通常只编译表达式，静态值在运行时直接使用。但 Flux 采用了更激进的做法:编译整个值树结构。这意味着什么?
假设你有一个静态的配置对象:

```json
{
  "type": "button",
  "label": "Submit",
  "disabled": false,
  "className": "btn-primary"
}
```

在传统框架里，每次渲染时，这个对象都需要被解析和传递。而在 Flux 里，编译器会在构建阶段就把它识别为静态节点，并生成一个编译结果。运行时访问这个编译结果时,直接返回原始对象的引用,没有任何开销。
对于包含动态部分的对象:

```json
{
  "type": "button",
  "label": "Submit",
  "disabled": "${form.submitting}",
  "className": "${form.submitting ? 'btn-disabled' : 'btn-primary'}"
}
```

编译器会生成一个包含表达式节点的编译树。运行时执行时,如果表达式的结果没有变化,会返回之前计算出的对象引用。这确保了对象的稳定性。
运行时的包装类型是这样的:

```typescript
type CompiledRuntimeValue<T> =
  | { kind: 'static'; isStatic: true; value: T }
  | { kind: 'dynamic'; isStatic: false; exec(scope): T }
```

这个设计对 React 性能的影响是巨大的。React 的重新渲染基于引用比较。如果每次渲染时都返回相同的对象引用,React 就会跳过子组件的渲染。而 Flux 的动态复用机制正好保证了这一点:只要表达式的结果没变,对象引用就不变。

这不再是一个优化技巧，而是架构层面的保证。
## 4. 作用域链 — 词法查找优于对象合并

在低代码框架里，作用域是一个核心概念。组件需要访问表单数据、页面参数、环境变量等各种上下文信息。
传统框架通常采用对象合并的方式：把所有父级作用域合并成一个大的对象,然后在这个对象上查找。这种方式在简单场景下没问题，但很快就会暴露缺点。
首先，合并操作本身有开销，尤其是当作用域层级很深时。其次,合并会丢失作用域的词法关系，无法正确处理变量遮蔽。更重要的是,大多数时候我们只需要访问很少几个变量,却不得不构造整个合并后的对象。
Flux 采用了不同的方法：`ScopeRef` 词法查找链。
```typescript
interface ScopeRef {
  id: string;
  path: string;
  parent?: ScopeRef;
  value: Record<string, any>;
  get(path: string): unknown;
  has(path: string): boolean;
  readOwn(): Record<string, any>;
  read(): Record<string, any>;
}
```

每个作用域通过 `parent` 指针链接起来,形成链式结构。查找变量时,`get(path)` 方法会沿着链向上查找,直到找到对应的值或者到达链的根部。
这种设计有几个关键优势:

- 延迟合并：只有在真正需要合并对象时才执行 `read()`，大部分时候通过 `get()` 访问单个变量
- 保留遮蔽语义：子作用域的同名变量会正确地遮蔽父作用域的变量
- 减少内存分配：不需要为每个访问操作构造合并后的对象

使用模式也很清晰：`scope.get(path)` 是高频操作的快路径，`scope.read()` 是低频操作的兜底方案。
## 5. 数据、动作、组件 — 三权分立

这是 Flux 的第二个核心创新。

在传统的低代码框架里,所有的能力都混在一个作用域对象里。你需要访问数据?从作用域里取。需要调用动作?也从作用域里取。需要操作某个组件实例?还是从作用域里取。这种设计在简单场景下很方便,但随着复杂度增加,作用域会变得越来越臃肿,各种职责混杂在一起。
Flux 把这些能力拆分成了三个独立的运行时注册表:

**ScopeRef** 负责数据层面，包括值、变量、表单状态等纯数据信息。它是不可变的（或者说更新时生成新的引用），只负责提供数据访问能力。
**ActionScope** 负责动作能力，也就是可以执行的操作。动作通过命名空间组织,比如 `designer:addNode`、`spreadsheet:setCellValue`。命名空间的好处是可以独立扩展，不会污染数据作用域。
**ComponentHandleRegistry** 负责组件实例的定位和访问。它不是通过命名空间查找,而是通过组件的 id 或 name 精确定位。比如 `component:submit` 操作会找到对应的表单组件并调用它的提交方法。
为什么要分这么清楚?

首先是关注点分离。数据作用域不应该被行为污染，它应该只关注"有什么值"。动作作用域关注"能做什么"组件注册表关注"在哪里做"。每个领域都有清晰的边界。
其次是可扩展性。命名空间允许不同的模块独立注册自己的动作，不需要协调。设计器模块注册 `designer:*` 动作，表格模块注册 `spreadsheet:*` 动作，互不干扰。
动作的解析顺序也很清晰：先查内置平台动作（`setValue`、`ajax`、`dialog`），再查组件目标动作（`component:submit`、`component:validate`），最后查命名空间动作（`designer:export`、`spreadsheet:mergeRange`）。这种层级关系既保证了灵活性，又提供了合理的默认行为。
## 6. xui:import — 声明式能力导入

这是 Flux 的第三个创新，解决的是一个很实际的问题：如何让 schema 片段使用外部库的能力，又不会造成全局污染?
在传统框架里,通常会通过全局注册的方式引入第三方能力。比如你想在 schema 里调用一个自定义的 API，你就得在某个全局的地方注册这个 API。问题是全局注册很容易冲突，而且很难控制作用域。
Flux 借鉴了 ES 模块导入的设计，引入了 `xui:import` 声明:

```json
{
  "type": "container",
  "xui:imports": [
    { "from": "demo-lib", "as": "demo" }
  ],
  "body": [
    {
      "type": "button",
      "onEvent": {
        "click": {
          "actions": [{ "action": "demo.open", "args": { "id": "${id}" } }]
        }
      }
    }
  ]
}
```

这看起来像是一个普通的配置项，但它的语义和 ES 模块导入非常相似。`from` 指定要导入的库，`as` 指定导入后的命名空间前缀。
`xui:import` 有几个关键特性:

- 声明式：在 schema 里明确声明依赖，不需要在代码里注册
- 顺序无关：导入的顺序不影响结果，编译器会统一处理
- 幂等性：重复导入同一个库不会产生副作用
- 自动去重：同一个库在多个层级导入时,只会加载一次

更重要的是，导入的可见性是词法的。子容器可以看到父容器的导入,但兄弟容器之间互相看不到导入。这符合直觉,也避免了命名冲突。
安全性方面，`from` 的值通过受信任的加载器解析,而不是直接执行任意脚本。这防止了脚本注入的风险。
这种设计让 schema 片段更加独立。一个复杂的页面可以拆分成多个组件，每个组件声明自己的依赖,组合时不会互相干扰。
## 7. 数据获取与动态 Schema — Service 的拆分

在 AMIS 里，`Service` 是一个"全能"组件：它同时承担两项职责——通过 `api` 获取数据（`store.fetchData`）以及通过 `schemaApi` 动态加载 Schema（`store.fetchSchema`）。这两条路径共享同一个组件实例、共享同一个 store，生命周期紧密耦合在一起。如果你你想只加载 Schema 同时还想获取数据，甚至加上轮询， `initFetch`、`initFetchSchema`、`interval`、`stopAutoRefreshWhen` 等属性必须组合在一起， schema 的意图就变得模糊。
而且，AMIS 里 API 请求的数据和作用域合并方式是隐式的——框架内部通过 `createObject` 将当前数据域合并到请求参数中，用户难以精确控制哪些数据会被发送到服务端。
schema 作者必须理解这些隐式行为才能正确使用它们。
Flux 的解决方案是：**职责拆分**。

将"获取数据"和"动态加载 Schema"拆成两个独立的渲染器：

各自有清晰的生命周期:

```json
{
  "type": "data-source",
  "api": {
    "url": "/api/user/${userId}",
    "includeScope": ["userId"]
  },
  "dataPath": "user",
  "interval": 3000,
  "stopWhen": "${user.loaded}",
  "body": {
    "type": "text",
    "text": "Hello, ${user.name}"
  }
}
```

`data-source` 专门负责数据获取。它通过 `api` 发起请求，通过 `dataPath` 将响应写入作用域,支持轮询（`interval` + `stopWhen`）并渲染 `body` 区域。它只关注"取什么数据"这一件事。
```json
{
  "type": "dynamic-renderer",
  "schemaApi": {
    "url": "/api/schema/${pageId}"
  },
  "body": {
    "type": "text",
    "text": "Loading..."
  }
}
```

`dynamic-renderer` 专门负责动态 Schema 加载。它通过 `schemaApi` 获取远端 Schema 并渲染,只关注"渲染什么"这一件事。
这种拆分带来了几个好处。首先，关注点更清晰：一个组件只做一件事,意图更容易理解。其次,生命周期独立——`data-source` 的轮询不会影响 `dynamic-renderer` 的 Schema 加载。最后,API 对象的语义也更精确。
`includeScope` 字段让数据发送变得显式可控——schema 作者明确声明哪些作用域变量需要注入到请求中,而不是依赖框架内部的隐式合并。 `params` 字段将 URL 查询参数从请求体中分离出来,语义更加清晰。
## 8. 字段元数据驱动 — 编译器而非渲染器做决策

这个问题可能没那么直观：渲染器怎么知道某个字段的值应该怎么处理?
比如一个 `title` 字段,它可能是一个简单的字符串 `"Hello"`，也可能是一个复杂的 schema 片段 `{ "type": "tpl", "tpl": "Hello ${name}" }`，甚至可能是一个事件处理器。渲染器每次渲染时都要判断这个字段的类型，然后采用不同的处理逻辑。这种运行时判断既容易出错,又影响性能。
Flux 的做法是：让渲染器定义字段元数据,由编译器在编译阶段完成规范化处理。
字段元数据包括字段的种类:`meta`、`value`、`region`、`value-or-region`、`event`、`ignored` 等。最有趣的是 `value-or-region`，这允许同一个字段名根据输入类型采用不同的编译方式:

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
    "type": "tpl",
    "tpl": "{{name}} - {{status}}"
  }
}
```

这里 `title` 是一个 schema 片段。编译后作为 `regions.title`，渲染器会渲染这个片段的内容。
渲染器的代码非常简洁，不需要做任何判断:

```tsx
const titleContent = props.regions.title?.render() ?? props.props.title;
```

编译器已经把复杂的判断逻辑前置了，渲染器只需要消费规范化的输出。这不仅提高了性能,也让渲染器的代码更容易理解和维护。
## 9. 样式系统 — 零隐式样式

在低代码框架里,样式一直是个棘手的问题。如果渲染器硬编码了样式，比如一个容器默认有 `gap-4` 的间距，schema 作者想要调整就很麻烦,因为他们在 schema 里看不到这个默认样式。如果完全不提供默认样式,又会导致每个使用场景都要重复配置。
Flux 的解决方案是：**零隐式样式**。
核心原则是：渲染器只发出标记类,比如 `nop-container`、`nop-flex`。所有视觉样式都来自 schema 的显式配置，包括 className、classAliases 和语义属性。
这意味着什么？意味着你查看一个组件的 schema 时，能看到所有影响它外观的配置。没有任何隐藏的样式在某个地方偷偷生效。
`classAliases` 机制是一个重要的工具。它允许你定义可复用的样式模式，并且支持嵌套:

```json
{
  "classAliases": {
    "card": "bg-white rounded-lg shadow-md p-4",
    "card-hover": "hover:shadow-lg hover:border-blue-300",
    "btn-primary": "bg-blue-500 text-white hover:bg-blue-600"
  }
}
```

在组件里使用时,可以直接引用这些别名:

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

预定义的工具别名在 base.css 中提供，比如 `stack-sm`、`stack-md`、`hstack-sm` 等。这些别名封装了常用的间距模式,但都是显式的，可以在 schema 里看到和修改。
作用域继承机制也很自然：子组件可以覆盖父组件的同名别名。这让样式系统的组合更加灵活。
## 9. 样式系统 — 零隐式样式

在低代码框架里，样式一直是个棘手的问题。如果渲染器硬编码了样式，比如一个容器默认有 `gap-4` 的间距，schema 作者想要调整就很麻烦，因为他们在 schema 里看不到这个默认样式。如果完全不提供默认样式,又会导致每个使用场景都要重复配置。
Flux 的解决方案是：**零隐式样式**。
核心原则是：渲染器只发出标记类，比如 `nop-container`、`nop-flex`。所有视觉样式都来自 schema 的显式配置，包括 className、classAliases 和语义属性。
这意味着什么？意味着你查看一个组件的 schema 时,能看到所有影响它外观的配置。没有任何隐藏的样式在某个地方偷偷生效。
`classAliases` 机制是一个重要的工具。它允许你定义可复用的样式模式,并且支持嵌套:
```json
{
  "classAliases": {
    "card": "bg-white rounded-lg shadow-md p-4",
    "card-hover": "hover:shadow-lg hover:border-blue-300",
    "btn-primary": "bg-blue-500 text-white hover:bg-blue-600"
  }
}
```

在组件里使用时,可以直接引用这些别名:

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

预定义的工具别名在 base.css 中提供，比如 `stack-sm`、`stack-md`、`hstack-sm` 等。这些别名封装了常用的间距模式,但都是显式的，可以在 schema 里看到和修改。
作用域继承机制也很自然：子组件可以覆盖父组件的同名别名。这让样式系统的组合更加灵活。
## 10. 技术栈与分层架构

最后聊聊技术选型和架构分层。
Flux 采用了一套现代化的技术栈：React 19、TypeScript 5.9 严格模式、Zustand 5、Vite 8、TailwindCSS 4、pnpm workspace。这些技术本身不算新颖，关键是如何组合使用。
整个项目采用分层架构，包之间有清晰的依赖关系:

```
flux-core (类型定义、契约、纯工具函数)
  → flux-formula (表达式编译器、求值器)
    → flux-runtime (Zustand stores、动作、验证)
      → flux-react (React hooks、渲染层)
        → flux-renderers-* (页面、表单、数据渲染器)
          → apps/playground
```

每一层都有明确的职责，上层依赖下层，下层不依赖上层。这种分层让代码更容易理解和维护。
React 集成方式也很讲究：在边界处显式，在中间隐式。
- 渲染器的 props 包含 renderer-local 的数据：schema、node、props、meta、regions、events
- Hooks 提供运行时状态的访问：useRendererRuntime、useScopeSelector、useCurrentForm

这种划分让组件的接口更清晰，哪些数据是从 props 传入的，哪些是通过 hooks 获取的，一目了然。
## 11. 性能设计原则

性能不是后来才考虑的优化问题，而是架构层面的设计决策。Flux 的性能设计遵循几个优先级原则:
1. 保留静态快路径：静态值的访问应该零成本，直接返回对象引用
2. 保留动态标识复用：动态计算的结果如果没变，返回相同的对象引用
3. 魅免热点路径中的合并对象构造：尽量用 `scope.get()` 而不是 `scope.read()``
4. 保持 selector 订阅的精确性：只订阅真正需要的数据
5. 对高频动作应用防抖或取消机制

`useScopeSelector(selector, equalityFn)` 是一个重要的工具。它允许你选择性地访问作用域中的数据,而不是订阅整个作用域的变化。这避免了连锁重新渲染的问题。
React 上下文的拆分也很关键。runtime、scope、action-scope、component-registry、node-meta、form、page 等不同的上下文，各自的变化频率不同。把它们拆分开，可以减少不必要的重新渲染。
这些设计不是针对特定场景的优化，而是为了保证整个框架在任何规模的应用中都能保持良好的性能。
## 12. 总结 — 设计哲学

回顾整个 Flux 的设计，可以看到几个贯穿始终的核心原则:

1. 统一语义胜过平行字段家族。一个字段，多种形式，编译器负责判断
2. 编译一次，静态优化，动态复用。编译阶段做尽可能多的工作，运行时享受静态分析和动态复用的双重好处
3. 词法作用域链胜过对象合并。延迟合并，保留词法关系,只在需要时构造完整对象
4. 数据、动作、组件分治。每个领域有清晰的边界，通过不同的注册表管理
5. 声明式导入与词法可见性。ES 模块风格的导入，作用域内的能力可见性
6. 字段元数据驱动编译，渲染器不做猜测。编译器前置处理复杂逻辑，渲染器消费规范化的输出
7. 职责单一，关注点清晰。获取数据与动态 Schema 拆分为独立组件，API 作用域注入语义显式可控
8. 零隐式样式。所有视觉决策都在 schema 中显式声明，渲染器只发出标记类
9. 性能是架构，不是优化。从第一行代码开始就考虑性能，而不是事后修补

这些原则不是孤立的技巧，而是相互支撑的整体。统一值语义让全值树编译成为可能，词法作用域链让动态复用更高效，字段元数据驱动让编译器和渲染器各司其职。
