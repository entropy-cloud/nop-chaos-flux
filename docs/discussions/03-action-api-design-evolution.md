# Action / Api / DataSource 设计讨论

## 第 1 轮

### 用户原始表述

需要开始一个新的讨论，用于改进 action 的设计，并参考 programming-model 相关内容。当前首先需要把 `ApiObject` / `Action` / `Reaction` / `data-source` 的关系清楚定义出来，并为不同使用场景确定更具体的 `DSL`。

用户特别提出了以下问题：

- `ApiObject` 中的 `cacheTTL` 一类字段是否应移除并上移到 action 层面
- 表达式中如何调用 import lib 中的函数，是否应该支持 `$libName.func(x)` 这种以 `$` 前缀变量方式引用
- `requestAdapter` / `responseAdapter` 本质上必须是表达式而不是普通字符串时，应该如何预编译
- `requestAdapter` / `responseAdapter` 到底属于 action 层面还是 api 层面的概念
- 整个 action 的完整定义应该是什么

本轮讨论的目标，是为后续更新 api 与 action 设计提供清晰的边界和决策基础。

### AI 复述

本轮讨论不是直接修改实现，而是先把“动作系统”的概念边界收敛清楚。核心任务可以拆成五个问题：

1. 定义四个概念的职责边界：`ApiObject`、`ActionSchema`、`DataSourceSchema`、`ReactionSchema`。
2. 明确哪些能力属于“传输描述”，哪些属于“执行控制”，哪些属于“消费方策略”。
3. 明确表达式能力与 action capability 的边界，尤其是 `xui:imports` 导入的库到底只用于 action，还是也能进入表达式求值环境。
4. 明确 adaptor（`requestAdaptor` / `responseAdaptor`）的语义归属、`DSL` 形式与预编译模型。
5. 在上述边界稳定后，给出 action 的完整 authoring surface，也就是最终需要支持的 `DSL` 形态。

换句话说，这一轮要先解决“概念分层是否正确”，然后才谈具体字段应该放在哪里。

### AI 分析

#### 一、当前文档基线已经给出的结论

根据 `docs/architecture/frontend-programming-model.md`、`docs/architecture/frontend-programming-model-improvement-design.md`、`docs/architecture/action-scope-and-imports.md`、`docs/architecture/api-data-source.md`，当前基线已经有几条重要结论：

1. `Action` 与 `Resource` 不能合并成一个 authoring shape。
   - `Action Algebra` 是 effect dispatch 的组合层。
   - `DataSource` / `Resource` 是 runtime-owned value producer。
   - 两者可以共享底层 execution substrate，但 authoring surface 必须区分。

2. `ApiObject` 不应该继续膨胀成“通用策略袋子”。
   - improvement design 已明确提出三层划分：
     - `ApiObject` = transport + adaptor contract
     - `Operation Control` = timeout / cancellation / debounce / retry / dedup / tracing 等执行协调
     - consumer-specific policy = resource polling / stale policy / merge policy / action branching / duplicate submit policy 等
   - 当前 `cacheTTL` / `cacheKey` / `dedupStrategy` 仍留在 `ApiObject` 上，被视为 compatibility-era placement，而不是目标形态。

3. `Reaction` 是 watch/effect primitive，不是 request carrier。
   - `ReactionSchema` 的职责是 watch 某些值，然后 dispatch `ActionSchema`。
   - 它不应直接吸收 `ApiObject` 的 transport 语义，也不应替代 action chain。

4. `xui:imports` 当前只定义了 capability import，不等于 expression import。
   - `action-scope-and-imports.md` 的当前设计里，`xui:imports` 负责向本地 `ActionScope` provision namespace provider。
   - 这套设计解决的是 `designer:addNode`、`spreadsheet:mergeRange` 一类 action capability 的解析问题。
   - 文档尚未定义“导入库函数进入表达式求值环境”的正式语义。

5. adaptor 当前被定义为“request/response transformation surface”。
   - `api-data-source.md` 已明确：adaptor 不是 arbitrary JS，也不是普通 Flux value expression。
   - 实现可以内部复用 expression compiler，但 public contract 应视为更窄的 adaptor-specific transformation surface。

#### 二、当前真正模糊的地方在哪里

虽然方向已有结论，但还有四个关键模糊点没有收敛。

##### 1. `ApiObject` 与 `Action` 的边界还没有落成稳定字段模型

目前文档已经说“`Operation Control` 在 `ApiObject` 之上”，但还没有稳定回答下面这些 authoring 问题：

- action 发起一次请求时，`retry` / `timeout` / `dedup` / `cache` 是写在 action 顶层，还是写在某个 `operation` / `control` 子对象中
- data-source 发起请求时，这些字段是沿用同一套 `control` 块，还是保留 resource-owning 的单独字段
- 如果 action 与 data-source 都能覆盖同一执行控制项，优先级规则是什么

如果这层没有明确，`ApiObject` 会继续承担不属于 transport contract 的职责。

##### 2. `requestAdaptor` / `responseAdaptor` 的归属还没有彻底说透

这里实际上有两个不同问题：

- 它们是否属于 transport pipeline 本身
- 它们是否应该以当前 `ApiObject` 字段的形式暴露给作者

从语义上看，`requestAdaptor` / `responseAdaptor` 更像是“请求前整形”和“响应后整形”，因此更接近 api transport pipeline，而不是 action branching。也就是说，它们更像 api-level concept，而不是 action-level concept。

但从 authoring surface 看，如果 action、data-source、form submit、validation submit 都复用同一个 request pipeline，那么 adaptor 应该写在什么地方才不会导致四套 `DSL` 不一致，当前还没有最终结论。

##### 3. 表达式导入与 action 导入现在是断开的

用户提出 `$libName.func(x)`，本质是在问：

- imported library 是否可以进入表达式 evaluator 的可见环境
- 如果可以，它是以“变量”的方式暴露，还是以“helper namespace”的方式暴露
- `$` 前缀是否应该继续保留给 runtime reserved bindings（如 `$form`、`$event`、`$dialog` 一类上下文），还是可以扩展为用户导入库的统一前缀

这不是语法小问题，而是 purity boundary 问题。

因为：

- expression 按理应尽量保持 pure / cacheable / dependency-trackable
- action capability 本质上允许 side effect
- 如果把 imported action namespace 和 imported expression helper 混成一类，后续 dependency tracking、sandbox、diagnostics、预编译缓存都会混乱

所以这里不能简单回答“支持 `$lib.func()` 就行”，而要先决定：是否需要独立的 expression import model。

##### 4. action 的“完整定义”仍停留在方向层，尚未形成一个可执行的总契约

当前文档已经给出了 action 的方向性结构：

- `action`
- `args`
- `when`
- `then`
- `onError`
- `parallel`
- `continueOnError`
- 部分 execution-control fields，如 `timeout` / `retry` / `debounce`

但仍未完全收敛以下问题：

- action 的保留字段全集是什么
- payload fields 与 control-flow fields 的分界是什么
- request-backed action 的 transport config 应如何嵌入
- 与 semantic lifecycle entry（如 `submitAction` / `initAction`）之间的关系是什么
- 哪些是 built-in action contract，哪些是 general action meta fields

因此，当前 action 有“方向”，但还没有“完整定义”。

#### 三、这一轮讨论建议优先回答的主问题

为了避免一次讨论发散过多，我建议本轮优先收敛下面四条主线。

##### 主线 A：先固定四层关系图

建议先确认如下关系是否成立：

- `ApiObject`：只描述 transport input/output adaptation，不表达 action branching，不直接拥有 consumer-specific lifecycle
- `ActionSchema`：描述 capability dispatch 与 control flow；当 action 需要发请求时，可以内嵌或引用一个 `ApiObject`
- `DataSourceSchema`：描述 runtime-owned producer；当 producer 是 request-backed 时，内部持有 `ApiObject`，同时额外拥有 polling / publication / merge / stale policy
- `ReactionSchema`：只负责 watch -> dispatch action，不直接承载 transport contract

如果这条关系图先确认，后续字段落位会容易很多。

##### 主线 B：把 `Operation Control` 从概念变成 authoring contract

从当前文档方向看，`cacheTTL` 一类字段大概率不应继续留在纯 `ApiObject` 概念里。

但这里仍有两种可能的目标形态：

方案 1：统一 `control` 块

```json
{
  "action": "ajax",
  "api": { "url": "/api/users" },
  "control": {
    "timeout": 5000,
    "retry": 2,
    "dedup": "cancel-previous",
    "cacheTTL": 60000
  }
}
```

方案 2：按 consumer 保持不同 surface，但概念同属 `Operation Control`

- action 用 `timeout` / `retry` / `debounce`
- data-source 用 `interval` / `stopWhen` / `cacheTTL`
- 运行时再 lower 到 shared substrate

这两个方案的差别不在实现，而在 `DSL` 是否追求显式统一。

##### 主线 C：表达式导入是否需要独立通道

如果支持 imported function 进入表达式，我倾向于不要直接把它等同于 `ActionScope` namespace，原因是：

- action namespace 的核心语义是 invoke capability
- expression helper 的核心语义是 pure evaluation helper
- 两者在权限、缓存、依赖跟踪、调试信息上都不同

因此更合理的方向可能是：

- `xui:imports` 继续服务于 action namespace
- 另行定义 expression helper import 或 expression namespace provisioning
- 只有显式声明为 pure helper 的导入内容才能进入表达式环境

至于 authoring 语法，`$libName.func(x)` 是否合适，需要和现有 `$` 前缀保留语义一起评估；它未必是最优语法。

##### 主线 D：adaptor 要不要从“字符串字段”升级为“显式表达式节点”

当前文档把 adaptor 写成字符串字段，但用户提出了一个关键问题：它们本质上是表达式，不应只被看作普通字符串。

这引出两个方向：

方向 1：保留当前 authoring 形态，例如 `${...}` 或字符串表达式，但在编译阶段将其识别为 adaptor node，并缓存编译结果。

方向 2：把 adaptor 显式建模为带类型的 expression carrier，例如：

```json
{
  "api": {
    "url": "/api/users",
    "requestAdaptor": {
      "kind": "expr",
      "body": "withRequestData(api.data, { token: session.token })"
    }
  }
}
```

方向 1 的优点是兼容现有 JSON authoring；方向 2 的优点是类型边界清晰、便于未来 editor/tooling 做精确识别。

#### 四、本轮讨论后理想输出应该是什么

如果这一轮讨论完成，理想上应至少产出下面四项结论：

1. 一张稳定关系图：`ApiObject` / `ActionSchema` / `DataSourceSchema` / `ReactionSchema` 各自的职责与嵌套关系。
2. 一份字段归属规则：哪些字段留在 `ApiObject`，哪些上移到 `Operation Control`，哪些属于 consumer-specific policy。
3. 一条表达式导入原则：imported lib 是否进入表达式环境，如果进入，采用什么语法和安全边界。
4. 一份 action 最小完整定义：保留字段、控制流字段、请求动作的嵌入方式、与 semantic lifecycle action 的关系。

### 待澄清问题

1. 是否确认这一轮的基础关系图为：`ApiObject` 只负责 transport + adaptor；`ActionSchema` 负责 dispatch + control flow；`DataSourceSchema` 负责 producer lifecycle；`ReactionSchema` 负责 watch -> dispatch？如果不同意，最希望调整的是哪一条边界？

2. 对 `cacheTTL` / `cacheKey` / `dedupStrategy` 这类字段，目标方向更倾向于哪一种？
   - A. 从 `ApiObject` 中移出，统一进入 action/data-source 可复用的 `control` 块
   - B. 概念上属于 `Operation Control`，但 authoring surface 允许 action 与 data-source 分别保留自己的字段
   - C. 继续留在 `ApiObject`，只做语义补充

3. `requestAdaptor` / `responseAdaptor` 你更倾向把它们视为：
   - A. api-level concept，因为它们属于 transport pipeline
   - B. action-level concept，因为它们主要服务于 ajax action
   - C. 分两层：transport adaptor 留在 api，action 再提供更上层的 result mapping / branch context 机制

4. 关于 imported lib 进入表达式环境，你更倾向哪一种方向？
   - A. 不允许，导入库只用于 action capability
   - B. 允许，但必须通过与 `ActionScope` 分离的 pure helper import 机制
   - C. 允许，并且与 action import 复用同一导入机制

5. 如果 imported function 允许进入表达式环境，语法层面你当前更倾向哪一种？
   - A. `$libName.func(x)`
   - B. `libName.func(x)`
   - C. 其他形式（请举例）

6. adaptor 的 authoring shape 你更倾向哪一种？
   - A. 继续用当前字符串 / `${...}` 形态，但在编译阶段识别并缓存
   - B. 升级成显式 expression node / object 形态
   - C. 两者都支持，但 object 形态作为未来规范方向

7. 对 action 的“完整定义”，你更希望最终落成的 authoring 体验是哪一种？
   - A. 保持扁平字段风格：`action` + 顶层保留字段 + 顶层 payload 字段
   - B. 改为更结构化的风格：`action` + `args` + `control` + `then` / `onError`
   - C. 简单场景扁平，复杂场景自动进入结构化子块

---

## 第 2 轮

### 用户回答

用户明确给出以下方向选择，并说明当前无需考虑历史兼容性，因为项目仍处于初始版本阶段。

1. 同意第 1 轮提出的基础关系图：
    - `ApiObject` 负责 transport + adaptor
    - `ActionSchema` 负责 dispatch + control flow
    - `DataSourceSchema` 负责 producer lifecycle
    - `ReactionSchema` 负责 watch -> dispatch

2. `cacheTTL` / `cacheKey` / `dedupStrategy` 等内容应从 `ApiObject` 中移出。

3. `requestAdaptor` / `responseAdaptor` 采用分层设计：
    - transport adaptor 留在 api 层
    - action 层可以再提供更上层的 result mapping / branch context 机制

4. imported lib 应允许进入表达式环境，并与 action import 复用同一导入机制，不再额外引入另一套 import 体系。

5. 表达式中必须能明确辨识出导入库，因此采用 `$libName.func(...)` 这种前缀形式。

6. adaptor 的 authoring shape 继续使用表达式即可，不必升级成显式 object 形态；关键是要支持预编译。

7. 用户进一步追问：对于 `control` 相关配置，到底应该展平在 action 顶层，还是嵌入 `control` 子块中；哪一种更适合 AI 自动生成和识别。

### AI 整理

基于用户的回答，本轮已经形成了几个比较明确的收敛结论。

#### 一、四层关系图已经基本确定

当前可以将动作相关模型先固定为下面这张关系图：

- `ApiObject`：请求传输描述与请求前/响应后 adaptor
- `ActionSchema`：能力分发、控制流、执行协调、结果传播
- `DataSourceSchema`：runtime-owned producer，以及发布/轮询/失效/合并等 producer policy
- `ReactionSchema`：观察变化并触发 `ActionSchema`

这个关系图的最大价值在于，它把“请求是什么”和“请求何时、如何执行”彻底拆开了。

因此可以先给出一个稳定边界：

- `ApiObject` 不是 action
- `ApiObject` 也不是 data-source
- 它只是 request-backed consumer 共同复用的 transport descriptor

这意味着后续无论是 ajax action、form submit、validation request 还是 api-backed data-source，都应共享同一套 `ApiObject` 语义，而不是各自发明 request 字段。

#### 二、`ApiObject` 应该收缩为纯 transport contract

既然不考虑历史兼容性，那么可以更彻底地收缩 `ApiObject`：

建议保留在 `ApiObject` 上的内容只包括：

- `url`
- `method`
- `params`
- `data`
- `headers`
- `includeScope`
- `requestAdaptor`
- `responseAdaptor`

建议移出 `ApiObject` 的内容包括：

- `cacheTTL`
- `cacheKey`
- `dedupStrategy`
- 未来同类的 timeout / retry / cancellation / tracing / debounce / throttle

这些字段本质上都不属于“请求长什么样”，而属于“请求如何执行”。

因此这里已经可以得出一个设计判断：

> `ApiObject` 的目标应该是一个可复用、可缓存编译、与 consumer 解耦的 request descriptor，而不是 execution policy bag。

#### 三、adaptor 采用“两层模型”是合理的

用户选择的 3-C 实际上是比较稳妥的方案。

可以先把两层清楚地区分为：

1. api transport adaptor
    - `requestAdaptor`
    - `responseAdaptor`
    - 作用于 transport pipeline
    - 输入上下文是 `api` / `scope` / `data` / `headers` / `payload` 这一类 request-response 语义对象

2. action result layer
    - 不负责改写 HTTP request / response 本身
    - 负责 `then` / `onError` / `result` / `error` / `prevResult` 这一层 control-flow branching
    - 如有 result mapping，也应视为 action result semantic，而不是 transport adaptor

这两层拆开后，一个重要收益是：

- `ApiObject` 的 adaptor 可以被 data-source、form submit、ajax action 统一复用
- action 自己不必吸收“请求整形”职责，只负责“收到结果之后如何继续”

#### 四、import 机制可以统一，但表达式与 action 的调用面仍需分开

用户希望复用同一导入机制，这个方向是可行的，而且可以保持简单。

这里最简单的设计不是再造第二套 import 系统，而是让同一个 import declaration 同时向运行时暴露两种可见面：

- action 调用面：`libName:method`
- expression 调用面：`$libName.func(...)`

例如：

```json
{
   "xui:imports": [
      {
         "from": "demo-lib",
         "as": "demo"
      }
   ]
}
```

那么它在 schema 中同时可以表现为：

```json
{
   "onClick": {
      "action": "demo:open",
      "args": {
         "id": "${row.id}"
      }
   }
}
```

以及：

```json
{
   "label": "${$demo.formatName(user.firstName, user.lastName)}"
}
```

这里虽然 import declaration 是统一的，但调用面仍然分成两类：

- `demo:open` 是 capability dispatch
- `$demo.formatName(...)` 是 expression helper call

这并不构成两套 import 机制，而只是同一导入对象在两个 runtime channel 中的可见投影。

#### 五、`$libName` 前缀是合适的，因为它解决了“可辨识性”问题

用户强调 imported library 必须一眼可辨识，这一点是对的。

如果表达式直接写 `demo.formatName(x)`，它会和普通 scope 数据字段发生歧义：

- `demo` 可能是 scope 中的普通对象
- 也可能是导入库

而 `$demo.formatName(x)` 可以明确表达：

- 这不是普通数据路径
- 这是 runtime 注入的导入库对象

因此 `$libName` 作为 expression namespace 前缀是合理的，而且也与现有 `$form`、`$event`、`$dialog` 一类保留绑定的思路一致。

后续真正要补的是一条规范：

- `$` 前缀名称保留给 runtime-injected special bindings
- 其中一类是 context binding，如 `$form`
- 另一类是 imported library binding，如 `$demo`

#### 六、adaptor 继续使用表达式 authoring 是可行的

用户选择 6-A，这个判断基本成立。

原因是 adaptor 的核心问题不是外层 JSON 是否是 object，而是：

- 它能否被静态识别为 adaptor expression
- 它能否在 schema compile 阶段预编译
- 它能否与普通 value expression 使用不同的上下文与诊断标签

因此更直接的方案是：

- authoring 继续使用表达式字符串
- compiler 在看到 `requestAdaptor` / `responseAdaptor` 字段时，按 adaptor channel 编译
- 缓存键包含字段位置与 schema identity，而不是仅按原始字符串缓存

这样既保留 JSON 的简洁性，又不会妨碍预编译。

#### 七、关于 `control`，更适合 AI 的方案是“嵌入 `control` 子块”，而不是全部展平

这是本轮用户追加提出的关键问题。

我的判断是：如果目标之一是让 AI 更容易自动生成、理解、校验 action，那么更合适的设计是：

- `args` 嵌入对象
- `control` 嵌入对象
- `when` / `then` / `onError` / `parallel` 保持顶层

也就是一种“半结构化”的 action shape，而不是完全展平，也不是把所有东西都塞进一个大对象。

推荐形态如下：

```json
{
   "action": "ajax",
   "args": {
      "target": "saveUser"
   },
   "api": {
      "url": "/api/users/save",
      "method": "post",
      "data": {
         "id": "${form.id}",
         "name": "${form.name}"
      },
      "requestAdaptor": "${$demo.withTenant(data, session.tenantId)}"
   },
   "control": {
      "timeout": 5000,
      "retry": {
         "times": 2,
         "delay": 200
      },
      "dedup": "cancel-previous",
      "cacheTTL": 60000
   },
   "when": "${form.valid}",
   "then": {
      "action": "toast",
      "args": {
         "level": "success",
         "message": "保存成功"
      }
   },
   "onError": {
      "action": "toast",
      "args": {
         "level": "error",
         "message": "${error.message}"
      }
   }
}
```

之所以这比完全展平更适合 AI，有四个原因：

1. 语义分组更稳定。
    - AI 在生成 schema 时，最怕的是“同一层同时混放 payload、control、control-flow、transport”。
    - 一旦字段都展平，模型很容易把 `timeout`、`nodeType`、`message`、`dataPath`、`then` 混写到一个层级里。

2. 更容易做结构化校验。
    - `control` 可以单独做 schema 校验与补全。
    - `args` 可以单独按 action contract 做校验。
    - `api` 可以单独按 `ApiObject` 做校验。

3. 更利于工具和 AI 做字段归属判断。
    - 顶层看到 `when` / `then` / `onError` 就知道是控制流。
    - 看到 `control` 就知道是执行协调。
    - 看到 `api` 就知道是 transport。
    - 看到 `args` 就知道是 action payload。

4. 更适合未来扩展。
    - 以后增加 tracing、circuit breaker、concurrency key、cancel scope 等字段，不会污染顶层命名空间。

相反，如果全部展平，短期看起来写起来省一点，但中长期问题会明显出现：

- action-specific payload 字段和 framework-reserved 字段很容易冲突
- AI 较难可靠判断一个顶层字段到底是 payload 还是 control
- 不同 built-in action 的顶层字段风格会越来越不一致

因此我的建议不是“完全嵌套 everything”，而是：

- 顶层保留 action graph 所需字段：`action` / `when` / `then` / `onError` / `parallel`
- payload 放进 `args`
- transport 放进 `api`
- execution coordination 放进 `control`

这比完全展平更适合 AI 自动生成，也更适合后续做静态分析、可视化编辑器和 schema lint。

#### 八、目前已经接近成形的 action 最小完整定义

基于本轮回答，可以先收敛出一版方向性的最小模型：

```ts
interface ActionSchema {
   action: string;
   args?: Record<string, SchemaValue>;
   api?: ApiObject;
   control?: ActionControl;
   when?: string;
   then?: ActionSchema | ActionSchema[];
   onError?: ActionSchema | ActionSchema[];
   parallel?: ActionSchema[];
}

interface ActionControl {
   timeout?: number;
   retry?: { times: number; delay?: number };
   debounce?: number;
   throttle?: number;
   dedup?: 'cancel-previous' | 'parallel' | 'ignore-new';
   cacheTTL?: number;
   cacheKey?: string;
}
```

这不是最终定稿，但已经比当前“顶层字段不断增长”的状态更清晰了。

### 待澄清问题

1. 如果按上面的方向推进，你是否同意 action 的目标 shape 采用“半结构化”方案：顶层保留 `action` / `when` / `then` / `onError` / `parallel`，其余分别进入 `args` / `api` / `control`？

2. 对 import 统一机制，是否同意把同一个导入别名同时投影为：
    - action 调用面的 `libName:method`
    - expression 调用面的 `$libName.func(...)`

3. 对 data-source 而言，是否也采用同样的 `api + control` 分层，也就是：
    - `api` 中只保留 transport + adaptor
    - `control` 中承载 cache / dedup / retry / timeout
    - `interval` / `stopWhen` / `mergeStrategy` / publication policy 仍保留在 data-source 自己这一层

---

## 第 3 轮

### 用户回答

用户继续追问以下问题：

1. `ActionSchema` 是什么时候使用的？它是否就是对应 JSON 中的定义？
2. 为什么其中的 `action` 是 `string` 类型？
3. action 还需要调用 `componentId` / `componentName` 对应的组件方法，另外还要调用导入库函数，这些关系应该怎么理解？
4. `data-source` 是否继承 `ActionSchema` 会更好，因为看起来它只是多了周期调度配置和消费端配置？

### AI 整理

这几个问题实际上是在追问一件事：当前设计里，`ActionSchema` 到底是“某种内部运行时对象”，还是“schema authoring contract”。先把这个点说清楚，后面的继承关系就容易判断。

#### 一、`ActionSchema` 就是 JSON 里 action 节点对应的类型契约

按当前代码定义，`ActionSchema` 是 `flux-core` 里对 schema action 节点的 TypeScript 类型描述。

也就是说：

- 在 JSON 中写的 `onClick`、`submitAction`、`then`、`onError`、`reaction.actions` 里的 action 节点
- 在 TypeScript 里对应的就是 `ActionSchema`

它不是“执行后的运行时对象”，而是“执行前 declarative schema 的类型定义”。

当前代码中的定义也印证了这一点：

- `packages/flux-core/src/types/actions.ts` 里 `ActionSchema` 直接定义了 schema authoring 会出现的字段，如 `action`、`args`、`api`、`componentId`、`componentName`、`when`、`then`、`onError`
- `docs/architecture/frontend-programming-model.md` 也明确把 `ActionSchema` 描述为 capability dispatch 的 schema descriptor type，而不是 executor 内部状态

所以可以先固定一个概念：

> `ActionSchema` 是 author-visible JSON DSL 的类型契约，不是 executor 专用内部对象。

运行时真正执行时，会把 `ActionSchema` 解释、求值、补上下文，然后得到 dispatch 行为和 `ActionResult`，但那是下一层。

#### 二、为什么 `action` 是 `string`

`action: string` 不是随便写成字符串，而是因为当前设计把“动作类型识别”统一收敛为一个调度键。

这个字符串实际承载了三类 dispatch 入口：

1. built-in action
   - 例如 `ajax`、`dialog`、`toast`

2. component-targeted action
   - 例如 `component:submit`
   - 再结合 `componentId` / `componentName` 去定位具体实例

3. namespaced library/host action
   - 例如 `designer:addNode`
   - 通过 `ActionScope` 和导入/宿主注册的 namespace provider 去解析

所以它不是“普通字符串字段”，而是统一的 dispatch selector。

这样设计有几个好处：

- built-in、component、namespace 三类 action 共用同一 authoring 入口
- 不需要再发明 `type: 'builtin' | 'component' | 'namespace'` 这一层 union 嵌套
- AI 和 schema author 看到 `action` 一眼就知道“这是要调用哪个 capability”

从这个角度看，`action` 用字符串不是因为类型太弱，而是因为它承担的是“统一命名入口”的职责。

更准确地说，它应该被理解为：

> `action` 是一个命名动作选择器，而不是任意文本。

后续如果需要加强类型系统，也更合理的方向是：

- 保持 JSON 里 `action` 为字符串
- 在编译期/工具层识别它的 pattern
- 比如识别为 built-in、`component:<method>`、`namespace:method`

而不是把它改造成多个互斥字段。

#### 三、`componentId` / `componentName` 与库函数调用，不是一个通道

这里最关键的是：action 虽然统一写在 `ActionSchema` 里，但背后并不是一条解析路径。

当前架构其实有三条不同的 capability 通道：

1. built-in dispatch
   - 由框架内置 dispatcher 处理
   - 例如 `ajax`、`toast`

2. component instance dispatch
   - action 名是 `component:<method>`
   - 再通过 `componentId` / `componentName` 去 `ComponentHandleRegistry` 找实例
   - 找到后调用该组件显式暴露的 capability

3. imported/host namespace dispatch
   - action 名是 `libName:method` 或 `designer:method`
   - 通过 `ActionScope` 去解析 namespace provider

因此：

- `componentId` / `componentName` 不是 action 类型本身
- 它们只是 `component:<method>` 这类 action 的目标定位参数

举例：

```json
{
  "action": "component:submit",
  "componentId": "shipping-form"
}
```

这里：

- `action` 说明要调用组件能力 `submit`
- `componentId` 说明要调用哪个具体组件实例

而库函数调用则是另一条路：

```json
{
  "action": "demo:open",
  "args": {
    "id": "${row.id}"
  }
}
```

这里根本不需要 `componentId`，因为它不是实例调用，而是 namespace provider 调用。

所以正确的理解不是“action 还要同时支持 componentId 和库函数，太杂了”，而是：

- `ActionSchema` 是统一的 dispatch envelope
- 真正的目标解析分成 built-in / component / namespace 三条通道

这个统一 envelope 是合理的，因为它们共享：

- `when`
- `then`
- `onError`
- `args`
- `control`

不同的只是 capability resolution path。

#### 四、`data-source` 不适合继承 `ActionSchema`

这是这轮最关键的设计判断。

虽然 `data-source` 和 action 都可能发请求、都可能需要 timeout/retry/cache、都可能最终调用同一条 `executeApiObject(...)` 底层链路，但它们在语义上仍然不是一类 schema 节点。

根本区别在于：

1. `ActionSchema` 是 effect dispatch
   - 它表示“做一件事”
   - 入口是交互、语义生命周期、reaction dispatch
   - 结果是 `ActionResult`
   - 重点是 control flow

2. `DataSourceSchema` 是 value producer
   - 它表示“产生并发布一个值”
   - 入口是 runtime registration、依赖失效、显式 refresh、轮询
   - 结果是 scope publication + status summary
   - 重点是 producer lifecycle

也就是说，它们共享的是 execution substrate，不是 authoring ontology。

如果让 `data-source` 继承 `ActionSchema`，会马上出现几个问题：

- `then` / `onError` / `parallel` 这些 action graph 字段对 `data-source` 没有自然语义
- `componentId` / `componentName` / `dialogId` / `value` / `values` 这些 action targeting/payload 字段会污染 source model
- `data-source` 的核心字段如 `name`、`dataPath`、`statusPath`、`mergeStrategy`、`interval`、`stopWhen` 并不是 action 的自然扩展字段
- 会把“derive value”误建模成“dispatch action then write value”，这会模糊 `Resource` 和 `Capability` 的边界

所以更合适的关系不是继承，而是分层复用。

#### 五、正确的复用方向：共享子结构，而不是 `DataSourceSchema extends ActionSchema`

更合理的模型是：

1. `ActionSchema` 和 `DataSourceSchema` 都可以引用同一个 `ApiObject`
2. 两者都可以引用一套共享的 `OperationControl` 结构
3. 但各自保留自己的顶层语义字段

也就是类似下面这样：

```ts
interface ApiObject {
  url: string;
  method?: string;
  params?: SchemaValue;
  data?: SchemaValue;
  headers?: Record<string, string>;
  includeScope?: '*' | string[];
  requestAdaptor?: string;
  responseAdaptor?: string;
}

interface OperationControl {
  timeout?: number;
  retry?: { times: number; delay?: number };
  debounce?: number;
  throttle?: number;
  dedup?: 'cancel-previous' | 'parallel' | 'ignore-new';
  cacheTTL?: number;
  cacheKey?: string;
}

interface ActionSchema {
  action: string;
  args?: Record<string, SchemaValue>;
  api?: ApiObject;
  control?: OperationControl;
  when?: string;
  then?: ActionSchema | ActionSchema[];
  onError?: ActionSchema | ActionSchema[];
  parallel?: ActionSchema[];
}

interface ApiDataSourceSchema {
  type: 'data-source';
  name?: string;
  dataPath?: string;
  statusPath?: string;
  api: ApiObject;
  control?: OperationControl;
  interval?: number;
  stopWhen?: string;
  mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
}
```

这个关系更干净，因为：

- transport contract 只定义一次
- execution control 只定义一次
- action 和 source 各自的 authoring ontology 仍然分离

#### 六、结论

这轮问题可以收敛为三条明确判断：

1. `ActionSchema` 是 JSON schema 中 action 节点的类型契约，不是 executor 内部对象。
2. `action: string` 是统一 dispatch selector，用来统一 built-in、`component:<method>`、`namespace:method` 三类入口。
3. `data-source` 不应继承 `ActionSchema`；正确方向是共享 `ApiObject` 和 `OperationControl`，但保留独立的 `DataSourceSchema`。

### 待澄清问题

1. 是否确认 `ActionSchema` 继续保持“统一 dispatch envelope”设计，也就是：
   - built-in action 用 `action: 'ajax'`
   - 组件实例能力用 `action: 'component:submit'` + `componentId`
   - 导入库/宿主能力用 `action: 'demo:open'`

2. 是否确认 `data-source` 不继承 `ActionSchema`，而是仅共享 `ApiObject` 和 `OperationControl` 这两个子结构？

3. 如果确认第 2 条，下一步是否要把 `DataSourceSchema` 也统一成 `api + control + sourcePolicy` 这种更清晰的结构？

---

## 第 4 轮

### 用户回答

用户继续追问：如果 `ApiObject` 对应于 JSON 中的配置，那么 fetcher 最终接收到的请求对象是不是就不应该再叫 `ApiObject`？换句话说，JSON 中的配置是否应该更准确地命名为 `ApiSchema`？

### AI 整理

这个问题问得很准，因为它实际上击中了当前命名里最容易混淆的一层：

- authoring 时写在 JSON 里的请求描述
- 运行时 canonicalize 之后交给 fetcher 的可执行请求对象

严格来说，这两者不应该被视为同一个概念。

#### 一、从语义上讲，fetcher 拿到的对象已经不是“原始 JSON 配置”了

如果按目前的执行链看，请求会经过下面几个阶段：

1. schema authoring 中的 declarative request config
2. 在当前 scope 下对其中的动态值进行求值
3. 合并 `includeScope`
4. 处理 `params`
5. 执行 `requestAdaptor`
6. 生成 fetcher 真正拿到的 final executable request

因此 fetcher 拿到的对象，至少已经和原始 JSON 有这些区别：

- 动态表达式已求值
- `includeScope` 已合并进 `data`
- `params` 已 canonicalize 到最终 URL
- 某些声明字段可能已经被移除或归一化
- `requestAdaptor` 已经改写过请求对象

所以从严格语义上说：

> fetcher 拿到的对象不再是 authoring schema 本身，而是 executable request。

这也正是当前 runtime 里已经隐含存在的事实。

#### 二、当前代码其实已经有这个分层，只是命名还没有彻底拆开

当前 `request-runtime.ts` 里已经能看到这条链路：

- `executeApiObject(...)`
- `prepareApiRequestForExecution(...)`
- `PreparedApiRequest`
- `preparedRequest.request`

其中：

- 输入还是 declarative `ApiObject`
- 输出的 `preparedRequest.request` 已经是 fetcher-facing 的 canonical request

文档里也已经明确写了：

- runtime 会先把 declarative request 收敛成 final executable request shape
- fetcher 和 monitor 应看到最终 executable request，而不是 pre-canonical declarative object

所以问题不在于架构上有没有区分，而在于名字还不够准确。

#### 三、如果不考虑历史兼容性，的确应该把两个概念拆开命名

如果现在是初始版本，而且不需要背兼容包袱，那么更清晰的命名方式应该是：

1. JSON/schema 中的声明式请求配置
   - `ApiSchema` 或 `ApiRequestSchema`

2. 运行时 canonicalize 后交给 fetcher 的请求对象
   - `ExecutableApiRequest`
   - 或 `ResolvedApiRequest`

3. 带中间产物的准备结果
   - `PreparedApiRequest`
   - 其中包含 `request`、`finalUrl`、`params`、`data`

从语义清晰度上看，我更推荐：

- `ApiSchema` = JSON 中写的 declarative transport config
- `ExecutableApiRequest` = fetcher 真正接收的请求对象

因为这两个名字把 authoring layer 和 execution layer 区分得最明确。

#### 四、为什么不建议继续把两者都叫 `ApiObject`

如果 JSON 配置和 fetcher 请求都叫 `ApiObject`，会有几个持续问题：

1. 容易让人误以为 fetcher 看到的是原始 schema。

2. 容易把“声明字段”和“执行字段”混成一个模型。
   - 比如 `includeScope`、`requestAdaptor` 这种字段，显然更像 authoring/execution-preparation 阶段的输入，而不是底层 fetcher 必须理解的 transport shape。

3. 不利于后续把 `OperationControl` 从声明层继续抽离。
   - 一旦继续共用一个名字，大家会不断往里塞字段。

4. 不利于 AI 和工具做结构化理解。
   - AI 看到 `ApiSchema` 会知道这是 declarative DSL。
   - AI 看到 `ExecutableApiRequest` 会知道这是 runtime prepared object。

#### 五、建议的最终分层

如果沿着本轮讨论继续收敛，比较清晰的一组概念可以是：

```ts
interface ApiSchema {
  url: string;
  method?: string;
  data?: SchemaValue;
  params?: SchemaValue;
  headers?: Record<string, string>;
  includeScope?: '*' | string[];
  requestAdaptor?: string;
  responseAdaptor?: string;
}

interface ExecutableApiRequest {
  url: string;
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
}

interface PreparedApiRequest {
  request: ExecutableApiRequest;
  finalUrl: string;
  data?: unknown;
  params?: Record<string, unknown>;
}
```

其中：

- `ApiSchema` 属于 schema authoring contract
- `ExecutableApiRequest` 属于 runtime -> fetcher contract
- `PreparedApiRequest` 属于 request-runtime 内部的 preparation result

如果后面还需要保留 `responseAdaptor` 的结果处理，那么它应继续留在 `executeApiObject(...)` 这一层，而不进入 `ExecutableApiRequest`。

因为 `responseAdaptor` 不是 fetcher 的事情，而是 request-runtime 的后处理语义。

#### 六、结论

这轮可以先收敛成一个明确判断：

1. 是的，如果 `ApiObject` 指的是 JSON/schema 中的声明式配置，那么 fetcher 拿到的对象从语义上就不应再叫同一个名字。
2. 如果不考虑兼容性，JSON 侧更准确的名字确实应该是 `ApiSchema` 或 `ApiRequestSchema`。
3. fetcher 侧应使用独立名字，例如 `ExecutableApiRequest`。
4. 当前代码里已经有这个分层的雏形，只是命名还没有完全反映出来。

### 待澄清问题

1. 是否确认后续文档和类型命名采用这组分层：
   - `ApiSchema` = JSON 中的声明式配置
   - `ExecutableApiRequest` = fetcher 接收的最终请求对象
   - `PreparedApiRequest` = request-runtime 内部准备结果

2. 如果确认第 1 条，下一步 action/data-source 文档是否都应从 `api: ApiObject` 改写为 `api: ApiSchema`，以避免继续混淆 authoring layer 和 execution layer？

---

## 第 5 轮

### 用户回答

用户补充提出两个问题：

1. AMIS 中的 action 还包含 `dialog`、`drawer`、`toast` 等 UI 操作，特别是 `dialog` 会把嵌套内容放在 action 参数中。对于这类动作，应该如何设计更合理？
2. `onClick` 等事件字段的参数，是否应该只接受单个 `ActionSchema`，还是允许直接传 action list？用户倾向于单个 `ActionSchema`，这样可以保证从单节点进入，也更便于渐进式演化。

### AI 整理

这两个问题其实都在问同一件事：

- action 是否应该是统一的抽象语法树根节点
- UI 操作是作为普通 payload action 处理，还是作为有特殊语义的 built-in capability 处理

我的判断是：

1. `dialog` / `drawer` / `toast` 这类应该保留为 framework-level built-in UI capability。
2. 但 `dialog` / `drawer` 不应该继续采用“随便在 action 顶层塞一个大对象”的旧式做法，而应该使用结构清晰的 typed payload。
3. `onClick` / `onChange` / `submitAction` 这类事件入口，schema authoring 层最好只接受单个 `ActionSchema` 根节点，而不是直接接受数组。

#### 一、`toast`、`dialog`、`drawer` 本质上是 UI capability，不是普通业务 action

这些动作和 `ajax` 很不一样。

- `ajax` 是 transport-backed effect
- `component:submit` 是 instance capability
- `designer:addNode` 是 imported/host namespace capability
- `toast` / `dialog` / `drawer` 是 framework-owned UI capability

因此比较合适的定位是：

- 它们属于 built-in action family
- 由框架 runtime 直接解释
- 宿主只负责最终 UI 承载或桥接，不改变其 schema 语义

其中：

- `toast` 偏向瞬时反馈 capability
- `dialog` / `drawer` 偏向 overlay capability

这类能力是跨页面、跨表单、跨业务域都会稳定出现的，所以不应丢给 namespace import 去做，也不应退化成某个具体组件实例方法。

#### 二、`dialog` / `drawer` 最好设计成“overlay action + typed payload”

AMIS 那种 `dialog` 对象直接嵌在 action 参数里的做法，本质上是在表达：

- 要打开一个 overlay
- overlay 的 body/schema/props 作为该动作的负载

这个方向本身没有错，错的是负载结构过于松散，容易让 action 顶层被 overlay schema 污染。

如果按这轮讨论已经形成的“半结构化 action”方向推进，那么更合适的形态应该是：

```json
{
   "action": "dialog.open",
   "args": {
      "title": "编辑用户",
      "size": "lg",
      "data": {
         "userId": "${row.id}"
      },
      "body": {
         "type": "form",
         "name": "editUserForm",
         "submitAction": {
            "action": "ajax",
            "api": {
               "url": "/api/users/save",
               "method": "post"
            }
         }
      }
   }
}
```

或者 drawer：

```json
{
   "action": "drawer.open",
   "args": {
      "title": "筛选条件",
      "placement": "right",
      "body": {
         "type": "form",
         "name": "filterForm"
      }
   }
}
```

以及 toast：

```json
{
   "action": "toast.show",
   "args": {
      "level": "success",
      "message": "保存成功"
   }
}
```

这种做法比旧式的：

```json
{
   "action": "dialog",
   "dialog": {
      ...
   }
}
```

更好，原因有四个：

1. action selector 更清楚。
    - `dialog.open`
    - `drawer.open`
    - `toast.show`

2. payload 边界更清楚。
    - overlay 配置进入 `args`
    - 不污染 action 顶层保留字段

3. AI 更容易生成。
    - AI 能明确知道：顶层是 action graph，`args` 里才是具体 UI 负载

4. 更容易做 typed validation。
    - `dialog.open` 的 `args` 可以单独有一套 payload schema
    - `toast.show` 也可以有自己的 payload schema

#### 三、但要区分两种 dialog 语义：动作打开，与语义生命周期拥有

这里还要再分清一个边界：

1. action 驱动的 overlay open
    - 例如按钮点击后打开一个 dialog
    - 这适合建模为 built-in UI action：`dialog.open`

2. dialog 节点自身拥有的生命周期动作
    - 例如 dialog 的 `openAction`
    - dialog 的 `confirmAction`
    - dialog 的 `closeAction`

后者其实是前面 programming-model 已经在强调的 `Semantic Lifecycle Entry`。

所以最合理的体系不是只保留其中一种，而是两层都存在：

- `dialog.open` / `drawer.open` 负责“打开一个 overlay”
- 真正打开之后，dialog 节点自己再拥有 `openAction` / `confirmAction` / `closeAction`

这比把所有业务流程都揉进一个按钮 `onClick` 里的 `dialog` 大对象更清楚。

#### 四、事件字段最好只接受单个 `ActionSchema` 根节点

我同意你的判断。

对于 schema authoring，`onClick`、`onChange`、`onSubmit`、`submitAction` 这类入口最好只接受：

- 一个 `ActionSchema`

而不是：

- `ActionSchema | ActionSchema[]`

原因很明确。

##### 1. 单根节点更像真正的 AST

只要事件入口允许直接传数组，就等于 authoring surface 有两个根语法：

- 对象根
- 数组根

这会让 action graph 的抽象变得不统一。

如果统一要求入口是单个 `ActionSchema`，那么：

- sequence
- parallel
- branching

都必须通过这个根节点表达。

这更像一个真正可分析、可编译、可演化的 DSL。

##### 2. 更利于渐进式演化

这是你提到的重点，而且判断是对的。

一个简单事件开始时可以是：

```json
{
   "action": "toast.show",
   "args": {
      "message": "Hello"
   }
}
```

之后如果要扩展：

- 增加 `when`
- 增加 `then`
- 增加 `onError`
- 增加 `control`
- 增加 `parallel`

都还是在同一个根节点上逐步扩展。

如果一开始允许 list，那么一旦需要 `when` / `then` / `onError`，就会出现问题：

- `when` 是挂在列表上还是挂在每个元素上
- `onError` 是整个列表共享还是单个 action 自己处理
- list 自身是否算 sequence node

这会导致你迟早还要再发明一个“sequence action root”。

既然如此，不如一开始就只允许单根节点。

##### 3. 更利于 AI 自动生成和静态分析

单根节点有一个很现实的好处：

- AI 每次只需要生成一个根对象
- 工具每次只需要从一个根对象开始做 schema 校验
- 可视化编辑器也更容易围绕一个根节点建立 action graph 编辑体验

如果直接允许数组，工具总会需要先做一次额外归一化：

- `[{...}, {...}]` 实际上被 lower 成某个 sequence root

这只是把复杂度从 authoring surface 推迟到了 compiler。

##### 4. 运行时内部仍然可以保留“dispatch list”的便捷入口

需要区分两层：

- schema authoring contract
- runtime helper API

schema authoring 我建议只接受单个 `ActionSchema`。

但 runtime/helper 内部，保留：

- `dispatch(action: ActionSchema | ActionSchema[])`

作为程序式便捷入口是可以的，因为那是内部 API，不是最终 DSL 形态。

换句话说：

- 对用户写 JSON：单根节点
- 对框架内部工具函数：可以容忍 list 作为 convenience API

#### 五、如果只允许单根节点，那么需要一个显式 sequence 节点吗

如果事件入口不再允许 list，那么还需要回答一个后续问题：如何表达顺序执行多个 action？

这里有两条可选路线：

方案 A：继续依赖 `then`

```json
{
   "action": "ajax",
   "api": { ... },
   "then": {
      "action": "toast.show",
      "args": {
         "message": "保存成功"
      }
   }
}
```

方案 B：显式提供一个 sequence 根节点

```json
{
   "action": "sequence",
   "steps": [
      { "action": "ajax", "api": { ... } },
      { "action": "toast.show", "args": { "message": "保存成功" } }
   ]
}
```

从“渐进式演化”角度看，我倾向于：

- 简单场景先靠 `then`
- 如果后面 action graph 复杂度变高，再引入显式 `sequence`

原因是：

- 大量日常场景本来就是“先做 A，成功后做 B，失败后做 C”
- `then` / `onError` 与这个心智模型天然一致

所以在当前阶段，不必急着把 sequence 也立刻实体化成根节点类型。

#### 六、结论

这一轮可以先收敛成下面几个判断：

1. `toast`、`dialog`、`drawer` 应该作为 framework-level built-in UI capability。
2. `dialog` / `drawer` 不应继续用松散顶层嵌套对象，应该改为：
    - 明确的 action selector，例如 `dialog.open` / `drawer.open` / `toast.show`
    - typed payload 放在 `args` 中
3. dialog 的业务流仍应与 `Semantic Lifecycle Entry` 配合，也就是：
    - action 负责打开 overlay
    - dialog 节点自己负责 `openAction` / `confirmAction` / `closeAction`
4. schema authoring 层的事件入口最好只接受单个 `ActionSchema` 根节点，不直接接受 list。
5. runtime/internal helper API 可以继续允许 `ActionSchema[]` 作为便利接口，但不应把它当成正式 DSL。

### 待澄清问题

1. 是否确认 `toast` / `dialog` / `drawer` 采用 built-in selector + `args` payload 的方向，例如：
    - `toast.show`
    - `dialog.open`
    - `drawer.open`

2. 是否确认 schema authoring 层的 `onClick` / `onChange` / `submitAction` 等事件入口只接受单个 `ActionSchema` 根节点，而不直接接受数组？

3. 如果确认第 2 条，顺序执行多个 action 的 authoring，你更倾向先只用 `then` / `onError`，还是希望尽早引入显式 `sequence` 节点？

---

## 第 6 轮

### 用户回答

用户确认前一轮的三个结论：

1. 确认 `toast.show` / `dialog.open` / `drawer.open` 这种 built-in selector 方向。
2. 确认 schema authoring 层的事件入口只接受单个 `ActionSchema` 根节点。
3. 顺序执行暂时只使用 `then` / `onError`，不立即引入显式 `sequence` 节点。

在此基础上，用户提出新的问题：

`data-source` 能否作为匿名对象用于任意值？例如 `select` 控件的 `options` 数据源需要外部提供，可以是表达式，可以动态获取，并且还要自动更新：只要依赖字段变动就重新加载，或者重新调用 import 到的库函数。对此是否应该引入一个新的 schema 定义？

### AI 整理

这个问题很关键，因为它正好落在前面已经出现过但尚未落成具体形态的那条路径上：

- plain value
- expression value
- narrower anonymous dynamic-value form
- named `data-source`

我的判断是：

1. 不应该把 `data-source` 退化成“任意字段里随处可嵌的匿名对象”。
2. 但确实应该补一个新的、更窄的 schema carrier，用来表达“匿名动态值”。
3. 这个新 carrier 不应是一个完整的 `BaseSchema` 节点，而应是字段级的 value-source / resource-value 定义。

#### 一、为什么不建议把 `data-source` 直接用作匿名任意值

如果把 `data-source` 直接嵌到任意字段里，例如：

```json
{
   "type": "select",
   "options": {
      "type": "data-source",
      "api": { "url": "/api/countries" }
   }
}
```

短期看似方便，但会带来几个问题。

##### 1. `data-source` 的“命名动态值”语义会被冲淡

前面几轮已经逐步收敛出的结论是：

- `data-source` 是 named dynamic value registration
- 它的价值在于命名、发布、状态观察、refresh targeting、scope reuse

如果允许它到处以匿名对象方式嵌入字段，那么 `data-source` 就同时承担两种角色：

- named resource node
- anonymous field-local value producer

这会让概念边界再次变模糊。

##### 2. `data-source` 是 node-level schema，而字段需要的是 value-level carrier

`data-source` 当前是 `type: 'data-source'` 的 schema 节点，意味着它天然属于 base tree 中的一类节点。

但 `select.options`、`table.columns[i].options`、`chart.series` 这类需求，本质上不是“再插入一个 node”，而是“这个字段的值来自一个带 runtime lifecycle 的 producer”。

所以这里缺的不是再复用一个 node schema，而是一个字段级 value carrier。

##### 3. 匿名字段值通常不需要完整的 named-resource 能力

像 `select.options` 这种场景，大多数时候真正需要的是：

- 动态求值
- 依赖追踪
- 可能异步获取
- 依赖变动后自动重算或重拉

但它未必需要：

- 单独命名到 scope
- `refreshSource(targetId)` 这类显式 targeting
- 在别处复用同一 published path

如果不需要这些能力，就不应该被强制提升成 named `data-source`。

#### 二、因此更合理的方向是引入一个新的“匿名动态值”定义

我建议引入一个新的字段级 schema carrier，暂时可以叫：

- `ValueSourceSchema`

或者更明确一点：

- `DynamicValueSchema`
- `AnonymousResourceSchema`

其中我更倾向 `ValueSourceSchema`，因为：

- 它强调这是“值来源”
- 不会和 node-level `data-source` 混淆
- 它可以覆盖同步表达式、异步请求、导入库计算三类场景

#### 三、`ValueSourceSchema` 不应是 `BaseSchema` 节点，而应是字段级 carrier

建议它是一个“可嵌入到字段中的值定义”，而不是一个 `type: 'xxx'` 渲染节点。

大致形态可以是：

```ts
type ValueSourceSchema =
   | {
         sourceType: 'formula';
         formula: SchemaValue;
      }
   | {
         sourceType: 'api';
         api: ApiSchema;
         control?: OperationControl;
      }
   | {
         sourceType: 'invoke';
         invoke: string;
         args?: Record<string, SchemaValue>;
         control?: OperationControl;
      };
```

这里的关键点是：

- `formula` 对应同步动态值
- `api` 对应匿名异步动态值
- `invoke` 对应调用导入库方法或宿主暴露的纯/准纯 producer 方法

它们的共同点是：

- 目标只是“给当前字段产出一个值”
- 不要求先发布为命名 scope binding

#### 四、对 `select.options`，确实很适合使用这种新 carrier

例如：

```json
{
   "type": "select",
   "name": "country",
   "optionsSource": {
      "sourceType": "api",
      "api": {
         "url": "/api/countries",
         "params": {
            "region": "${form.region}"
         },
         "responseAdaptor": "${payload.items}"
      },
      "control": {
         "dedup": "cancel-previous",
         "cacheTTL": 60000
      }
   }
}
```

这里的语义就很自然：

- `select` 不需要知道“远程加载 options”这种组件特供机制
- 它只知道 `options` 这个字段来自一个动态 value source
- runtime 负责依赖追踪和重载

如果依赖字段 `form.region` 变化，就重新准备请求并加载。

#### 五、表达式与导入库函数，也应按同步/异步两类处理

你提到“重新调用 Import 到的库函数”，这里要分两种情况：

##### 1. 同步纯函数

如果导入库函数只是同步纯计算，例如：

```json
{
   "options": "${$dict.buildCountryOptions(form.region)}"
}
```

那么它本质上仍是普通 `Value` / expression value。

这种情况下：

- 不需要新 resource carrier
- 依赖变化后，表达式自然重算

##### 2. 异步或 runtime-owned producer

如果导入库函数需要：

- 异步返回
- 取消前一个请求
- 去重
- 缓存
- loading/error/stale

那它就不再适合放在普通 expression 里。

这时更适合进入新的 `ValueSourceSchema`，例如：

```json
{
   "type": "select",
   "optionsSource": {
      "sourceType": "invoke",
      "invoke": "dict:getCountryOptions",
      "args": {
         "region": "${form.region}"
      },
      "control": {
         "dedup": "cancel-previous"
      }
   }
}
```

这里 `invoke` 可以理解为：

- 通过统一 import 机制找到导入库/宿主 provider
- 调用其“值提供方法”
- 返回结果供该字段消费

这和 action 的区别在于：

- action 是 effect dispatch
- `ValueSourceSchema.invoke` 是 value producer invocation

两者调用的 provider 可以来自同一 import declaration，但 runtime channel 不同。

#### 六、这样就形成了一个更清楚的四级路径

可以把字段值的 authoring 路径收敛成：

1. 字面量

```json
{ "options": [{ "label": "A", "value": 1 }] }
```

2. 表达式值

```json
{ "options": "${lookups.countries}" }
```

3. 匿名动态值 `ValueSourceSchema`

```json
{
   "optionsSource": {
      "sourceType": "api",
      "api": { "url": "/api/countries" }
   }
}
```

4. 命名 `data-source`

```json
{
   "type": "data-source",
   "name": "lookups.countries",
   "api": { "url": "/api/countries" }
}
```

然后 select 只是读取：

```json
{ "options": "${lookups.countries}" }
```

这条路径非常符合前面已经建立的 progressive DSL 思路。

#### 七、是否需要一个“通用字段名”而不是每个组件各起一个 `xxxSource`

这里还要再做一个细化判断。

如果引入 `ValueSourceSchema`，有两种放法：

方案 A：每个字段自己有配套字段

- `optionsSource`
- `suggestionsSource`
- `treeDataSource`

方案 B：通过 field metadata 声明“这个字段接受 value-source”

例如：

```json
{
   "options": {
      "$source": {
         "sourceType": "api",
         "api": { "url": "/api/countries" }
      }
   }
}
```

从统一性看，我更倾向方案 B，原因是：

- 不需要为每个组件重复发明 `xxxSource`
- 更符合“字段值可以有不同 carrier”的思路
- 更适合通过编译器和 field metadata 统一解释

但方案 B 也要求更强的 field typing 和 compiler 识别能力。

如果当前想先快速落地，短期可以从组件级配套字段开始；长期规范仍建议走统一 carrier。

#### 八、结论

这轮我建议先收敛成下面几个判断：

1. 不应把 `data-source` 直接作为匿名对象嵌入任意字段。
2. 应该引入一个新的字段级 schema carrier，用于表达“匿名动态值”。
3. 这个新 carrier 更适合命名为 `ValueSourceSchema`，并且不应是 `BaseSchema` 节点。
4. 同步导入库函数仍属于普通 expression；只有异步/带 lifecycle 的值提供，才进入 `ValueSourceSchema`。
5. 命名 `data-source` 继续保留为更高一级的“named dynamic value registration”。

### 待澄清问题

1. 是否确认新增一个字段级的 `ValueSourceSchema`，而不是把 `data-source` 直接匿名嵌入字段？

2. 对这个新 carrier，你更倾向哪种 authoring 形态？
    - A. 统一内嵌 carrier，例如 `options: { "$source": {...} }`
    - B. 组件配套字段，例如 `optionsSource: {...}`

3. 对异步导入库值提供，是否确认采用类似：
    - `sourceType: 'invoke'`
    - `invoke: 'libName:method'`
    - `args` + `control`
    的方向，而不是把异步调用直接塞进普通 expression？

---

## 第 7 轮

### 用户回答

用户指出：

1. `optionsSource` 这种 suffix 字段设计，本质上类似 AMIS 的 `visibleOn` 一类做法，在当前框架中属于已经废弃的设计方向。
2. 希望 `data-source` / `Action` / `SourceValue` 三者的格式尽量统一。
3. 不希望额外增加一层包装，或者再发明一个特殊标记字段，例如 `__source: true`。
4. 用户建议可以考虑直接通过内联值对象区分，例如：

```json
{
   "options": {
      "type": "source"
   }
}
```

### AI 整理

这里用户指出的问题是对的，我需要先纠正上一轮里一个不够理想的建议：

- `optionsSource` 这一类 suffix 字段不应该作为规范方向。

这和当前框架已经明确的原则一致：

- 不要回到 `visibleOn` / `disabledOn` / `xxxSource` / `xxxExpr` 这一类平行字段族
- 同一个字段应尽量保持统一值语义，再通过 carrier 区分值的来源类型

所以，如果要支持匿名动态值，正确方向不是 `optionsSource`，而是你现在提出的：

```json
{
   "options": {
      "type": "source",
      ...
   }
}
```

#### 一、应该尽量统一，但不能把三者强行做成同一个根抽象

你提出“`data-source` / `Action` / `SourceValue` 能不能尽量统一”，这个方向是对的，但这里要分清“统一到什么层级”。

我认为可以统一到下面两层：

1. 共享子结构
    - `api`
    - `control`
    - `args`
    - `invoke`

2. 共享判别风格
    - `type: 'data-source'`
    - `type: 'source'`
    - `action: 'xxx'`

但不应该统一成“所有东西都通过 `action` 表示”。

因为：

- `Action` 的核心是 effect dispatch
- `source` / `data-source` 的核心是 value production

如果 source 也改成通过 `action` 来指定具体动作，那么语义会再次混淆成：

- “产出一个值”是否等于“执行一个动作再取返回值”

这在运行时实现上可以复用底层，但在 authoring model 上不够清楚。

所以我的判断是：

> 应该尽量统一 schema 形状和共享字段，但不应把 `source` 建模为一种 `ActionSchema`。

#### 二、内联 `type: 'source'` 是比 `optionsSource` 更好的方向

你给的例子：

```json
{
   "options": {
      "type": "source"
   }
}
```

方向上是正确的，原因有五个：

1. 不引入 suffix 字段族。

2. 不需要 `__source: true` 这种额外魔法标记。

3. `type` 已经是现有框架最自然的 discriminant。

4. 语义上它仍然是“`options` 这个字段的值”，而不是“多出来一个旁路字段”。

5. 更符合统一值语义。

也就是说，字段值的 authoring 可以统一为：

- 普通数组/对象/表达式，表示普通值
- 当该字段需要 runtime-owned 动态生产语义时，就写一个 `type: 'source'` 的内联值对象

这比 `optionsSource`、`treeDataSource`、`suggestionsSource` 一类平行字段更干净。

#### 三、推荐的新统一形状

如果沿这个方向走，我建议把“匿名动态值”和“命名动态值”收敛成同一套 producer body，只是外层壳不同。

例如：

```ts
interface SourceValueSchema {
   type: 'source';
   source: 'formula' | 'api' | 'invoke';
   formula?: SchemaValue;
   api?: ApiSchema;
   invoke?: string;
   args?: Record<string, SchemaValue>;
   control?: OperationControl;
}

interface DataSourceSchema {
   type: 'data-source';
   name?: string;
   dataPath?: string;
   statusPath?: string;
   source: 'formula' | 'api' | 'invoke';
   formula?: SchemaValue;
   api?: ApiSchema;
   invoke?: string;
   args?: Record<string, SchemaValue>;
   control?: OperationControl;
   interval?: number;
   stopWhen?: string;
   mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
}
```

这里统一的地方是：

- 都有 `source`
- 都可以有 `formula` / `api` / `invoke`
- 都可以有 `args`
- 都可以有 `control`

不同的地方是：

- `type: 'source'` 是匿名字段值
- `type: 'data-source'` 是命名发布节点

这样其实已经把两者统一到很高程度了。

#### 四、为什么我仍然不建议“通过 action 指定 source 的具体动作”

你问“能不能通过 action 来指定具体动作”，我认为不建议。

例如如果写成：

```json
{
   "options": {
      "type": "source",
      "action": "dict:getOptions",
      "args": {
         "region": "${form.region}"
      }
   }
}
```

它表面上很统一，但会造成两个问题：

1. `action` 这个词在整个 DSL 中已经非常明确地绑定到 effect dispatch。
    - `then`
    - `onError`
    - `ActionResult`
    - capability resolution

2. source produce value 时，最自然的语义不是“执行动作”，而是“采用某种 producer 生产值”。

所以更合适的字段名仍然应该是：

- `source: 'invoke'`
- `invoke: 'dict:getOptions'`

而不是直接写 `action`。

这既保留了统一性，也不会污染 `ActionSchema` 的词义。

#### 五、`type: 'source'` 内联值对象如何与普通对象值区分

采用这个方案后，还需要明确一个实现前提：

- 不是所有对象值都能写 `type`
- 而是只有 field metadata 已知允许“plain value 或 source carrier”的字段，编译器才会把 `type: 'source'` 识别为 `SourceValueSchema`

例如：

- `select.options`
- `autocomplete.suggestions`
- `cascader.options`

这些字段可以在 field metadata 中声明为：

- plain value
- source value

而像普通任意 JSON 对象字段，不应该一看到 `type` 就被错误当成 source carrier。

所以真正的规则应该是：

> `type: 'source'` 不是一个全局任意位置都生效的魔法值，而是字段类型系统允许时的内联值 carrier。

这也和当前框架“由 field metadata 决定字段解释方式”的方向一致。

#### 六、最终可以形成一个更统一的三层模型

到这里，三者可以比较清楚地统一成：

1. `ActionSchema`
    - effect dispatch
    - `action` + `args` + `control`

2. `SourceValueSchema`
    - anonymous value producer
    - `type: 'source'` + `source` + `api|formula|invoke` + `args` + `control`

3. `DataSourceSchema`
    - named value producer
    - `type: 'data-source'` + publish/source policy + `source` + `api|formula|invoke` + `args` + `control`

这三者不是完全相同，但已经共享了：

- producer/dispatch 配置风格
- `api` / `args` / `control` 这套公共结构
- 渐进式 authoring 路径

这是“尽量统一”与“保持语义边界”之间比较平衡的方案。

#### 七、结论

这轮应当明确修正上一轮的一个方向：

1. 不采用 `optionsSource` 这类 suffix 字段族。
2. 改为支持字段值内联的 `type: 'source'` carrier。
3. `type: 'source'` 与 `type: 'data-source'` 尽量共享同一套 producer body：`source` / `formula` / `api` / `invoke` / `args` / `control`。
4. 不建议用 `action` 来表达 source producer；`action` 仍然保留给 effect dispatch。

### 待澄清问题

1. 是否确认放弃 `optionsSource` 一类 suffix 字段，改为内联值 carrier：

```json
{
   "options": {
      "type": "source",
      "source": "api",
      "api": {
         "url": "/api/countries"
      }
   }
}
```

2. 是否确认 `type: 'source'` 与 `type: 'data-source'` 共享同一套 producer body 字段：
    - `source`
    - `formula`
    - `api`
    - `invoke`
    - `args`
    - `control`

3. 是否确认 source producer 不使用 `action` 字段，而继续用 `source` / `invoke` 这类命名，以保持和 `ActionSchema` 的语义边界？

---

## 第 8 轮

### 用户回答

用户继续追问：

1. 为什么不把 source 统一到 `action`？
2. 如果 source 不统一到 `action`，那么请求执行前/执行后想插入一些调试动作，现在似乎没有方便的方法。
3. 是否可以把 `type: 'source'` 作为与 `${expr}` 同级的一种一级约定，也就是字段值统一走三类 carrier：`staticValue | exprValue | sourceValue`？

### AI 整理

这轮问题抓住了真正的分歧点：不是“能不能复用底层执行器”，而是“在 authoring model 里，动态值生产是否应该被建模成 action graph 的一个子集”。

先给结论：

1. 我仍然不建议把 source 完全统一成 `ActionSchema`。
2. 但我同意你提出的另一个更强的方向：`sourceValue` 完全可以成为与静态值、表达式值并列的一级值约定。
3. 你担心的“执行前/执行后调试动作”问题，确实是 source 模型需要补的能力，但这不一定要求把 source 变成 action；更合理的是给 source 增加独立的调试/观测 hook，或者给 runtime 统一加 operation monitor。

#### 一、为什么“统一到底层执行器”是对的，但“统一到 ActionSchema”未必对

这里要区分两层统一：

##### 1. 底层 operation 执行层统一

这是应该做的。

无论是：

- `ajax` action
- `data-source`
- 匿名 `sourceValue`

它们只要涉及：

- 请求执行
- `invoke`
- retry / timeout / dedup / cache
- tracing / diagnostics

都应该落到同一套 operation runtime 上。

这一点前面几轮其实已经在逐渐收敛。

##### 2. authoring DSL 统一成 `ActionSchema`

这一点我仍然认为不合适。

因为一旦统一成 `ActionSchema`，就意味着 source 也天然拥有或暗示拥有下面这些语义：

- `then`
- `onError`
- `parallel`
- `ActionResult`
- effect dispatch continuation

但一个字段值的生产，最自然的语义其实是：

- 依赖变化
- 标记 dirty
- 重新计算/重新加载
- 发布一个值
- 维护 loading/error/stale 状态

这和 action graph 的心智模型并不一样。

也就是说：

> 底层 operation runtime 应统一，但 authoring DSL 不必统一成 `ActionSchema`。

#### 二、你提到的“前后插入调试动作”是一个真实缺口，但它不必用 `ActionSchema` 来补

你的担忧是合理的。

如果 source 只是：

```json
{
   "type": "source",
   "source": "api",
   "api": { ... }
}
```

那么我想在：

- before execute
- after success
- after failure

这几个点插入调试、埋点、日志，似乎不如 action 那样方便。

这说明 source 模型确实需要一个更强的可观测性设计。

但这里有三种补法，不是只有“统一到 action”这一条路。

##### 方案 A：统一到 action

优点：

- `then` / `onError` 现成可用
- 调试动作插入很自然

缺点：

- value producer 和 effect graph 语义混在一起
- 字段值生产会被误建模成“执行动作并消费结果”
- 很多 action 字段对 source 实际无意义

##### 方案 B：source 自带 lifecycle hook

例如：

```json
{
   "type": "source",
   "source": "api",
   "api": { ... },
   "debug": {
      "before": { "action": "debug.log", "args": { "message": "loading options" } },
      "success": { "action": "debug.log", "args": { "message": "options loaded" } },
      "error": { "action": "debug.log", "args": { "message": "load failed" } }
   }
}
```

优点：

- 不混淆 source 和 action 的主语义
- 又能插调试动作

缺点：

- 又会长出一套 source-specific hook fields

##### 方案 C：统一由 runtime operation monitor 处理

也就是不把调试动作写进每个 source/action schema，而是 runtime 对所有 operation 暴露统一监控事件：

- operation:start
- operation:success
- operation:error
- operation:cancel

然后 debugger / monitor / devtools / tracing 在 runtime 层订阅。

优点：

- 不污染 authoring DSL
- action/source 共用
- 最适合真正的调试体系

缺点：

- 不适合做业务级“调试动作”，更偏框架诊断

我的判断是：

- 真正的调试/埋点体系应该优先走方案 C
- 如果确实要在 schema 里声明 source 的前后调试行为，再考虑小范围方案 B
- 不应仅仅因为需要 debug hook，就把 source 整体改造成 `ActionSchema`

#### 三、但你提出的 `staticValue | exprValue | sourceValue` 路径，我认为是对的

这其实比“统一到 action”更准确地抓住了问题本质。

你真正想要的，不一定是“字段值也是 action”；你想要的是：

- `sourceValue` 不是二级补丁能力
- 它和 `${expr}` 一样，是一级值约定

这个判断我认同。

也就是说，字段值的统一语义可以明确提升为：

1. `staticValue`
    - 字面量对象、数组、字符串、数字

2. `exprValue`
    - `${...}`

3. `sourceValue`
    - `type: 'source'`

这是一个很强的统一思路，而且比 `optionsSource`、`visibleOn` 那种平行字段方案更干净。

#### 四、在这个模型下，`type: 'source'` 确实可以成为一级约定

如果正式采用这个方向，那么值语义可以明确写成：

```text
FieldValue := StaticValue | ExprValue | SourceValue
```

例如：

```json
{
   "options": [
      { "label": "A", "value": 1 }
   ]
}
```

```json
{
   "options": "${lookups.countries}"
}
```

```json
{
   "options": {
      "type": "source",
      "source": "api",
      "api": {
         "url": "/api/countries",
         "params": {
            "region": "${form.region}"
         }
      },
      "control": {
         "dedup": "cancel-previous"
      }
   }
}
```

这个模型的优点非常明确：

1. 没有 suffix 字段。
2. 没有额外魔法属性。
3. `sourceValue` 与 `exprValue` 一样，是值语义，而不是组件特供能力。
4. 命名 `data-source` 仍然是更高一级的 named producer 语义。

所以如果要“一级化”，我支持的是：

- `sourceValue` 一级化

而不是：

- `sourceValue` 退化成 `ActionSchema`

#### 五、如何让 `sourceValue` 与 `data-source` 更统一

如果按你这个方向收敛，我建议直接把两者统一为同一 producer body：

```ts
interface ProducerBody {
   source: 'formula' | 'api' | 'invoke';
   formula?: SchemaValue;
   api?: ApiSchema;
   invoke?: string;
   args?: Record<string, SchemaValue>;
   control?: OperationControl;
}

interface SourceValueSchema extends ProducerBody {
   type: 'source';
}

interface DataSourceSchema extends ProducerBody {
   type: 'data-source';
   name?: string;
   dataPath?: string;
   statusPath?: string;
   interval?: number;
   stopWhen?: string;
   mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
}
```

这样：

- 匿名 sourceValue 与命名 data-source 的 body 100% 共享
- 两者差别只在：
   - 一个是字段级值 carrier
   - 一个是命名发布节点

这已经是非常高程度的统一。

#### 六、如果未来真要给 sourceValue 加“前后触发动作”，更合理的扩展方式是什么

如果后面确认 sourceValue 也需要业务级 hook，我认为更合理的扩展形态不是直接继承 `ActionSchema`，而是：

```ts
interface SourceLifecycleHooks {
   before?: ActionSchema;
   success?: ActionSchema;
   error?: ActionSchema;
}

interface SourceValueSchema extends ProducerBody {
   type: 'source';
   hooks?: SourceLifecycleHooks;
}
```

这样做的好处是：

- hook 继续复用 `ActionSchema`
- source 本体仍然不是 action
- 语义上也更清楚：
   - source produce value
   - hooks dispatch effects

换句话说，action 应该是 source 的 hook language，而不是 source 的本体 language。

#### 七、结论

这轮可以收敛成以下判断：

1. 不建议把 source 完全统一成 `ActionSchema`。
2. 但完全同意把 `sourceValue` 提升为与静态值、表达式值并列的一级值约定。
3. 更好的统一方式是：
    - `FieldValue = staticValue | exprValue | sourceValue`
    - `DataSourceSchema` 与 `SourceValueSchema` 共享同一套 producer body
4. 调试/埋点问题应优先通过 runtime operation monitor 解决；若 schema 侧确实需要，再给 source 补独立 hook，而不是把 source 改造成 action。

### 待澄清问题

1. 是否确认将字段值的统一模型正式收敛为：
    - `staticValue`
    - `exprValue`
    - `sourceValue`

2. 是否确认 `sourceValue` 采用：

```json
{
   "type": "source",
   "source": "api|formula|invoke",
   ...
}
```

并且与 `data-source` 共享同一套 producer body？

3. 对你提到的“执行前/执行后调试动作”，你更倾向先采用哪一层来解决？
    - A. runtime 统一 operation monitor
    - B. source 自带 `hooks.before/success/error`
    - C. 仍然坚持把 source 本体统一成 `ActionSchema`

---

## 第 9 轮

### 用户回答

用户认为前一轮的设计仍然过于复杂，并提出更直接的收敛方向：

1. `source` 应该只是 `ActionSchema` 的一种扩展。
2. `action` 本来就是一种动作，因此所有执行动作的地方都可以统一为 action。
3. `data-source` 比 `source` 多出来的只是状态跟踪、动态调度、命名绑定等额外控制能力。
4. `source` 是匿名执行动作并消费其返回值，但它的状态跟踪同样有用。
    - 例如 `select` 的 `options` 还没有加载完成时，控件可能需要显示 loading 图标。

### AI 整理

这一轮你的收敛方向是成立的，而且相比我前一轮把 `sourceValue` 完全独立成一套一级 carrier，确实更简单。

我同意把模型进一步收窄为：

- `ActionSchema` = 所有“会执行”的东西的基础动作描述
- `Source` = 匿名 action producer，用于把执行结果当成值消费
- `DataSource` = 命名 source，额外拥有发布、状态、调度、刷新、轮询等资源语义

这个方向比我前一轮单独抬出完整 `SourceValueSchema` 体系更直接，也更符合你一直强调的“尽量统一”。

#### 一、我现在同意：`source` 可以视为 `ActionSchema` 的值消费扩展

按你这个方向，可以把整体模型改写成：

1. `ActionSchema`
    - 表达一个可执行动作
    - 可以是 built-in、component、namespace、request、invoke 等

2. `SourceSchema`
    - 在结构上复用 `ActionSchema`
    - 但语义上不是 effect-only action，而是“执行一个 action 并把结果作为值使用”

3. `DataSourceSchema`
    - 是带命名、状态、调度、刷新能力的 source node
    - 可以看作 named + managed source

也就是说，你提出的是一种三层关系：

```text
ActionSchema
   -> SourceSchema
      -> DataSourceSchema
```

这个继承/扩展方向现在看是可以接受的，前提是要把三者的“消费语义”区分清楚，而不是只看结构字段。

#### 二、为什么这个方案比前一轮更简单

你指出“太复杂”的地方，核心是对的。

如果专门再定义：

- `staticValue`
- `exprValue`
- `sourceValue`

再给 `sourceValue` 一套独立 producer body，确实会让 authoring 心智多一层。

而如果直接说：

- 只要是执行某件事，就先是 action
- 如果这个 action 的结果被当值消费，它就是 source
- 如果这个 source 还要命名、跟踪状态、动态调度，它就是 data-source

那整个心智就顺很多。

这等于把前面几轮里“operation substrate shared”的想法，直接上推到了 authoring 层，但只上推一步，不再新增完全独立的一套 source DSL。

#### 三、你说得对：匿名 source 的状态也确实有价值

这是我这一轮认同的关键点。

前面我把匿名 source 和命名 data-source 分得太硬了，默认匿名 source 只需要值、不太需要状态；但你举的 `select.options` 例子说明，这不对。

即使 source 是匿名的，消费者也可能需要：

- `loading`
- `error`
- `stale`
- `empty`

例如：

- `select` 加载 options 时显示 spinner
- `tree-select` 拉取节点时显示 skeleton
- `autocomplete` 正在请求 suggestions 时显示 loading 状态

所以这里确实应该承认：

> 匿名 source 也可能需要状态跟踪，只是它的状态作用域主要局限在字段/组件本地，而不一定需要命名发布到外部 scope。

这点支持你提出的统一方向。

#### 四、因此更合理的模型不再是“source 没状态，data-source 才有状态”

更准确的分法应该变成：

1. `ActionSchema`
    - 关注执行本身
    - 返回 `ActionResult`

2. `SourceSchema`
    - 复用 action 的执行描述
    - 但它的消费结果不是 `ActionResult` 本身，而是“值 + 状态”
    - 状态主要服务当前字段/当前消费者

3. `DataSourceSchema`
    - 在 `SourceSchema` 基础上再增加：
       - 命名发布
       - scope binding
       - 显式 refresh/targeting
       - interval / stopWhen / mergeStrategy
       - 更稳定的可复用状态面

也就是说：

- `source` 和 `data-source` 都可以有状态
- 差别不在“有没有状态”
- 差别在“是否命名发布、是否拥有资源级调度和外部可控性”

这个区分比我前面那种“匿名 source 主要只是值 carrier”更准确。

#### 五、如果按这个方向收敛，最简单的 authoring 可以是什么样

这个方向下，一个字段值可以直接写成：

```json
{
   "options": {
      "type": "source",
      "action": "ajax",
      "api": {
         "url": "/api/countries",
         "params": {
            "region": "${form.region}"
         },
         "responseAdaptor": "${payload.items}"
      },
      "control": {
         "dedup": "cancel-previous",
         "cacheTTL": 60000
      }
   }
}
```

或者调用 import 到的库：

```json
{
   "options": {
      "type": "source",
      "action": "dict:getCountryOptions",
      "args": {
         "region": "${form.region}"
      },
      "control": {
         "dedup": "cancel-previous"
      }
   }
}
```

这里的统一性就很强了：

- source 也用 `action`
- 也用 `args`
- 也用 `api`
- 也用 `control`

只是外层 `type: 'source'` 告诉编译器：

- 这个 action 不是拿来 dispatch effect
- 而是拿来生产值

这个内联形式确实比我前面拆出 `source/invoke/formula` 多字段判别更简单。

#### 六、那 `${expr}` 怎么办

如果按你的方向继续收敛，我认为字段值可以更简单地分成三类：

1. 静态值
2. 表达式值 `${...}`
3. `type: 'source'` 值

这时：

- `${expr}` 仍然负责同步纯求值
- `type: 'source'` 负责执行动作并拿回值

也就是说，`source` 不必再被定义为一个完全独立的新“值系统”，而是：

- `${expr}` = 同步 value carrier
- `type: 'source'` = 执行型 value carrier

这个层次比前一轮更简洁。

#### 七、还需要保留的一条边界：`DataSourceSchema` 仍然不宜简单等同于匿名 source

虽然我现在认同 `source` 应该是 `ActionSchema` 扩展，但我仍然建议保留：

- `type: 'source'`
- `type: 'data-source'`

两个壳。

理由是：

匿名 source 和 data-source 在作者视角仍然有明显区别：

##### `type: 'source'`

- 就地为一个字段提供动态值
- 状态主要服务当前控件
- 生命周期跟随当前字段/当前节点
- 不强调命名复用

##### `type: 'data-source'`

- 命名绑定到 scope
- 可被其他字段复用
- 可被显式 refresh/target
- 更像资源节点

所以我现在的判断变成：

> `source` 应该是 `ActionSchema` 的扩展，这是对的；但 `data-source` 仍然应保留为更高一级的命名资源节点，而不是被完全吸平。

#### 八、关于调试动作，我会修正上一轮结论

前一轮我倾向先把调试问题放到 runtime monitor 里解决，但按你现在的统一方向，source/action 共用 schema 更自然之后，确实可以接受：

- source 直接复用 action 的前后分支能力

不过这里还要慎重一点。

如果 source 直接继承全部 `then` / `onError`，要避免一个问题：

- `then` 是继续 dispatch effect
- 还是用来变换 source 返回值？

我倾向于这样定：

- `source` 可以有 `onError` 用于失败副作用或降级处理
- 但不建议直接把 `then` 解释成“source 值转换链”
- source 的值转换仍然优先通过 `responseAdaptor` 或更窄的 value transform 处理

也就是说，虽然统一到 action，但 source 仍然应限制 action graph 的部分语义，避免把字段值生产写成一整棵 effect DAG。

#### 九、新的收敛结论

这一轮之后，我的观点已经发生了明确调整：

1. 同意把 `source` 视为 `ActionSchema` 的扩展，而不是完全平行的一套新 DSL。
2. 同意 `type: 'source'` 作为与 `${expr}` 并列的一种一级约定。
3. 同意匿名 source 也应该有状态跟踪，因为消费者本身可能需要 loading/error 状态。
4. `data-source` 则是在 `source` 基础上增加命名绑定、动态调度、资源级控制的更强形态。

### 待澄清问题

1. 是否确认新的统一方向为：

```text
ActionSchema = 所有执行动作的基础描述
SourceSchema = ActionSchema 的值消费扩展
DataSourceSchema = SourceSchema 的命名/调度扩展
```

2. 是否确认字段值层只保留三种一级约定：
    - 静态值
    - `${expr}`
    - `type: 'source'`

3. 对 source 复用 action 语义，你更倾向：
    - A. 只复用 `action` / `args` / `api` / `control` / `onError`
    - B. 全量复用 `then` / `onError` / `parallel` 等完整 action graph

---

## 第 10 轮

### 用户回答

用户确认：

1. 接受新的统一方向：
    - `ActionSchema` = 基础执行动作
    - `SourceSchema` = `ActionSchema` 的值消费扩展
    - `DataSourceSchema` = `SourceSchema` 的命名/调度扩展
2. 接受字段值只保留三种一级约定：
    - 静态值
    - `${expr}`
    - `type: 'source'`
3. `source` 复用 action 语义时，接受全量复用 action graph。

在此基础上，用户继续追问：

- 内置 action 的命名到底采用哪种形式更好：
   - `dialog.open`
   - `openDialog`
   - `open-dialog`
- 内置 action 是否需要改成对象调用形式？

### AI 整理

这一轮可以把内置 action 的命名规则彻底定下来。

我的明确建议是：

1. 内置 action 继续使用字符串 selector，不改成对象调用形式。
2. 内置 action 采用 camelCase 动宾式命名，例如：
    - `openDialog`
    - `closeDialog`
    - `openDrawer`
    - `closeDrawer`
    - `showToast`
3. `namespace:method` 这种带 `:` 的形式保留给组件实例动作和导入/宿主命名空间动作。
4. 不建议内置 action 使用 `dialog.open` 这种点号形式。
5. 也不建议使用 `open-dialog` 这种 kebab-case 形式。

#### 一、为什么不建议把内置 action 改成对象调用形式

例如下面这些形式，我都不建议作为公开 DSL：

```json
{
   "action": {
      "builtin": "dialog",
      "method": "open"
   }
}
```

或者：

```json
{
   "kind": "builtin",
   "namespace": "dialog",
   "method": "open"
}
```

原因很简单：

1. 现有 action 入口已经足够稳定，就是一个 selector string。
2. 对 built-in 而言，对象调用形式没有增加新的表达力，只增加了 authoring 噪音。
3. AI 生成时，string selector 远比对象 selector 更稳定。
4. 运行时分派也不需要额外拆对象，字符串模式已经足够清楚。

尤其在前面几轮已经确认：

- 事件入口只接受一个 `ActionSchema` 根节点
- `action` 是统一 dispatch selector

那么再把 `action` 从 string 改成 object，实际上是在打破已经建立的统一性。

所以这一点我倾向直接定死：

> 内置 action 不改成对象调用形式，继续保留 `action: string`。

#### 二、为什么我现在不建议使用 `dialog.open`

前面我临时给过 `dialog.open` / `toast.show` 这类例子，但现在回看，作为最终规范并不理想。

主要有三个原因。

##### 1. `:` 已经有明确语义，`.` 最好不要再引入另一套分派暗示

当前动作系统里最稳定的模式其实已经在形成：

- `component:submit`
- `designer:addNode`
- `dict:getCountryOptions`

也就是说：

- `:` 表示“通过 capability namespace / component namespace 分派”

如果再引入：

- `dialog.open`
- `toast.show`

那 `.` 就会变成另一套“伪 namespace”语义。

但 built-in action 本身并不需要 namespace lookup，它们是框架保留动作，不需要再假装成对象方法。

##### 2. `.` 很容易和表达式/属性访问心智混在一起

在表达式里：

- `$lib.func()`
- `obj.prop`

点号已经天然表示成员访问。

如果 action selector 里再写：

- `dialog.open`

虽然技术上可行，但心智上会让人误以为：

- 这是不是一个对象方法调用？
- 它和 `$dialog.open()` 是不是同一种东西？

我认为没有必要制造这种额外歧义。

##### 3. 现有 built-in 已经大量采用 camelCase 动词风格

仓库现有和讨论中已经反复出现的 built-in 都更接近：

- `ajax`
- `setValue`
- `refreshSource`
- `closeDialog`
- `submitForm`
- `navigate`

这其实已经形成了一条隐含风格：

- built-in 用简洁的动词 / 动宾短语
- namespace action 才用 `namespace:method`

因此从统一性看，继续把 built-in 收敛到 camelCase 动宾式，反而更自然。

#### 三、为什么不建议 `open-dialog`

`open-dialog` 的问题倒没有 `dialog.open` 那么大，但我仍然不推荐。

原因是：

1. 当前 JSON key 约定已经明确更偏向 camelCase。
2. action selector 虽然是字符串值，不是 key，但整体 authoring 风格仍然更适合 camelCase。
3. 现有 built-in 生态已经偏向 camelCase：`setValue`、`refreshSource`、`closeDialog`。
4. TypeScript 中将 built-in action 类型收敛成 union 时，camelCase 也更顺手。

所以如果要三选一，我的排序会是：

1. `openDialog`
2. `open-dialog`
3. `dialog.open`

#### 四、推荐的最终命名规则

我建议把动作命名规则正式分成三类：

##### 1. built-in action

规则：camelCase 动词或动宾短语

示例：

- `ajax`
- `navigate`
- `setValue`
- `refreshSource`
- `openDialog`
- `closeDialog`
- `openDrawer`
- `closeDrawer`
- `showToast`

##### 2. component action

规则：`component:<method>`

示例：

- `component:submit`
- `component:validate`
- `component:refresh`

##### 3. namespace/import/host action

规则：`namespace:method`

示例：

- `designer:addNode`
- `dict:getCountryOptions`
- `demo:open`

这样三类动作的视觉和语义都很清楚：

- camelCase = framework built-in
- `component:` = 实例能力
- `namespace:` = 外部/宿主/导入能力

这套规则比 `dialog.open` 那种中间形态清楚很多。

#### 五、如果 source 也复用 action，那么这套命名规则同样成立

既然前一轮已经确认：

- `source` 是 `ActionSchema` 的值消费扩展

那么 source 里也可以完全沿用同一套 action selector 规则。

例如：

```json
{
   "options": {
      "type": "source",
      "action": "ajax",
      "api": {
         "url": "/api/countries"
      }
   }
}
```

或者：

```json
{
   "options": {
      "type": "source",
      "action": "dict:getCountryOptions",
      "args": {
         "region": "${form.region}"
      }
   }
}
```

而打开 dialog 仍然是：

```json
{
   "onClick": {
      "action": "openDialog",
      "args": {
         "title": "编辑用户",
         "body": {
            "type": "form"
         }
      }
   }
}
```

这就把命名彻底统一了。

#### 六、结论

这一轮可以明确收敛为：

1. 内置 action 不改为对象调用形式。
2. 内置 action 使用 camelCase 动宾式命名。
3. `namespace:method` 保留给导入/宿主/组件命名空间动作，不与 built-in 混用。
4. 因此 `dialog.open` / `drawer.open` / `toast.show` 这类例子应收敛改写为：
    - `openDialog`
    - `openDrawer`
    - `showToast`

### 待澄清问题

1. 是否确认 built-in action 的最终命名规则为 camelCase 动宾式，例如：
    - `openDialog`
    - `closeDialog`
    - `openDrawer`
    - `showToast`

2. 是否确认不采用对象调用形式，继续保留 `action: string` 作为唯一 selector 入口？

---