# Programming Model Optimality Critique

## 第 1 轮

### 用户原始表述

用户要求对 `docs/architecture/frontend-programming-model.md` 做独立评审：是否认同它是下一代低代码框架的最优设计？如果不同意，必须提出深刻的反驳意见，附有明确依据和理由，不能为反驳而反驳。

### AI 复述

核心问题是：`frontend-programming-model.md` 所定义的七原语封闭集（Structure / Scope / Value / Resource / Reaction / Capability / Host Projection）在实际低代码场景下是否真的达到「最优」，还是存在结构性缺口。

### AI 分析

调研范围：`docs/architecture/frontend-programming-model.md`（全文 1088 行）、`docs/architecture/api-data-source.md`、`docs/architecture/action-scope-and-imports.md`、`docs/architecture/flux-core.md`、`docs/articles/flux-design-introduction.md`、`docs/discussions/2026-04-05-core-design-clarification.md`、`docs/architecture/flux-dsl-vm-extensibility.md`、`docs/analysis/2026-04-04-flux-architecture-evaluation.md`。

提出六条反驳：

#### 反驳一：「Final Execution Schema」假设对真实低代码场景过于乐观

文档断言 Flux 执行已装配完毕的最终模式，所有结构决策（权限、feature flag、wizard 步骤依赖、i18n）归入 loader 层。反驳理由是：许多结构决策天然是运行时决策，例如基于角色的字段权限必须等登录接口返回后才能确定，强推给 loader 层只是概念重标签。

#### 反驳二：Resource 的「one logical value」规则不足以覆盖现代异步数据模式

无限滚动/分页场景数据是累积的而非替换的；乐观更新需要同时维护 optimistic value 和 confirmed value；WebSocket 推送是 delta 流而非单值发布。TanStack Query 等主流方案表明这些是跨领域的稳定语义需求。

#### 反驳三：Reaction 非授权性规则在级联推导场景制造架构摩擦

字段 A 变化后字段 B = f(A) 的联动更新落在 Reaction（不能持有值）与 Resource（没有显式 watch 触发）之间的空隙，被迫走 capability 层，将简单派生逻辑外推给 host/domain 层。

#### 反驳四：Capability Primitive 将三种语义迥异的权限模型合并为「两种解析模式」

Built-in、Lexical、Instance 三者的失败语义、信任级别、组合语义均不同，文档合并后 schema 作者无法区分失败类型，缺乏 onError 分支处理能力。

#### 反驳五：Host Projection 严格只读与交互式 UI 产生结构性不对称

宿主字段的读路径（host projection）和写路径（capability）使用完全不同机制，造成认知负担；Angular/Vue/React 都证明双向绑定是普遍需求。

#### 反驳六：没有错误处理原语

Capability 执行失败语义未定义，结构渲染错误不在模型内，错误处理满足 promotion test 六条标准却被排除在原语集外。

---

## 第 2 轮

### 用户回答

**关于反驳一：**

字段权限/feature flag 通过后端 Java 端的 loader 处理，到了前端之后在送入 render 之前也可以在单纯的 JSON 结构层处理，不需要在 render 层处理。Wizard 步骤本质上在服务端就可以确定，页面中包含所有步骤，只是控制可见性而已。框架因为基于可逆计算理论，在模型结构层自动做大量处理，已对运行时引擎进行极大简化。i18n 等都在 loader 层完成变换。整体设计上从性能优化考虑，Flux 引擎已包含 `dynamic-renderer` 的 schema 动态加载设计。`visible`/`disabled` 条件表达本身就可以控制运行时结构，只是多占用了一些 JSON 内存而已。

**关于反驳二：**

数据累积问题（分页/无限滚动）对于表格等特殊场景存在特殊优化，table store 做一定处理即可；从 resource 抽象上说可以增加一个合并策略选项。WebSocket 推送本来就是这个设计可以容纳的内容（参见 AMIS service 等机制）。乐观更新+回滚不能在 resource 描述中增加标识来完成吗？

关于 `name` 设计：最基本的 `data-source` 可以具有 `name`，如果有 `name`，它就对应于一个数据对象，其中定义所需要的所有内部状态，`dataPath` 只是将这个对象中的内容再复制到其他地方而已。这对当前设计是一种改变，需要仔细评估这样设计是否更好。比较的选项包括：没有 `dataPath` 就更新当前 scope（当前非规范行为）、通过某种特殊的 `dataPath` 表示更新到当前 scope、还是通过某个开关属性来处理。TanStack Query 能直接改造作为 `data-source` 底层支撑吗？

**关于反驳三：**

不能直接通过表达式来表达 B = f(A) 吗？直接表达式绑定不就可以了吗？

**关于反驳四：**

触发 action 的时候如果失败需要有一个失败处理路径，这本身不应该是 action 抽象中需要做的事情吗？action 的每一步都应该有一个失败处理策略可配置，可能是调用其他的 action 等，类似于 then 这种有一个分叉不就可以了吗？框架底层有一个兜底策略就是弹出 toast 提示信息即可。

**关于反驳五：**

一个控件具有 `name`，它自然就是从 scope 中读取 value，它改变了就自动设置这个 value，这是 AMIS 模型中就已经具有的设计，这些常见层面根本不需要额外表达。

**关于反驳六：**

同样是 action 抽象的问题。

### AI 整理

逐条核实用户回答与现有文档的一致性后，各条反驳的结论如下。

#### 反驳一：撤回

文档调研确认：loader 层在多个文档中有完整说明。

- `docs/architecture/flux-dsl-vm-extensibility.md` 明确区分「Loader 装配期」与「Flux 运行期」，权限裁剪、i18n 替换、`x:extends` 结构继承、feature flag 静态裁剪全部归属装配期。
- `docs/articles/flux-design-introduction.md` §10（lines 345–429）详细描述 Nop 平台层在送入 Flux 前的四阶变换管线。
- `docs/discussions/2026-04-05-core-design-clarification.md`（lines 255–256）明确：「Loader 层负责装配最终模型，runtime 只执行 final model，这与可逆计算里变化应优先在模型空间中被处理而不是在运行时接口里漂移的原则一致。」
- `dynamic-renderer` 的动态 schema 加载设计（`docs/articles/flux-design-introduction.md` §7，lines 200–251）处理了确实需要运行时懒加载结构的场景。
- `visible`/`disabled` 统一值语义（`docs/references/flux-json-conventions.md` lines 21–22）正是不依赖结构变化来控制可见性的规范做法。

**结论：** `frontend-programming-model.md` 中对 loader 层的描述（lines 84–93，113–123）偏简略，但相关设计在其他文档中已有完整说明。该反驳基于对文档体系的不完整阅读，不成立。建议在 `frontend-programming-model.md` 中增加对 `flux-dsl-vm-extensibility.md` 的 cross-reference。

#### 反驳二：部分成立，核心转化为 `name` 字段设计问题

文档调研确认：

- 当前 `data-source` 设计无 `name` 字段，身份标识用继承自 base schema 的 `id`，发布目标用 `dataPath`（`docs/architecture/api-data-source.md` lines 183–201）。
- WebSocket 推送和 AMIS service 机制已在架构设计范围内（`docs/articles/flux-design-introduction.md` §7）。
- 分页合并策略尚未在 resource 规则中定义，是一个实际缺口。
- 乐观更新尚无 resource 层的显式设计。

关于 `name` 设计的评估详见下方「待澄清问题」第 1 条。TanStack Query 作为 resource 运行时底层的可行性详见第 2 条。

#### 反驳三：撤回

用户的反驳完全成立。`B = f(A)` 在 Flux 中的正确表达是在字段 B 的 `value` 属性上写表达式 `"${f(A)}"`，这是 Value 原语的标准用法，不需要 Reaction。Reaction 只用于需要副作用的场景（如发送 API、弹出通知）。原来的反驳混淆了「表达式派生值」和「有副作用的级联写入」，错误在于没有充分利用 Value 原语已有的能力。

#### 反驳四：部分成立，确认为现有文档记录的缺口

文档调研确认：

- `when`、`parallel`、`retry`（固定次数/固定延迟）、`timeout` 已实现（`docs/architecture/action-scope-and-imports.md` lines 404–407，`docs/logs/2026/04-05.md` lines 40–56）。
- `continueOnError: boolean` 已有，但这是布尔开关而非分支。
- **`onError` 分支动作列表（失败时调用另一组 action 的能力）明确未设计**（`docs/analysis/2026-04-04-flux-architecture-evaluation.md` line 157 记录此为缺口）。
- 用户的解法方向正确：在 action 抽象中增加类似 `onError`/`catch` 的分支字段，框架提供 toast 兜底策略。

**结论：** 这不是「capability 原语需要分裂为三个」的问题，而是 action 控制流规范需要补充 `onError` 分支语义。原来反驳的表述方式有误，但指出的功能缺口是真实的。

#### 反驳五：撤回

用户的反驳完全成立。AMIS/Flux 中 form field 的 `name` 属性自动建立读写绑定到 scope 对应路径，无需 schema 作者额外声明。这与 host projection 的只读约束是两个不同层面：host projection 约束的是宿主投影进 scope 的快照数据（如 `session`、`doc`、`selection`），不约束 schema 自有表单字段的双向绑定。原来的反驳混淆了两者，不成立。

#### 反驳六：归并到反驳四

同反驳四的结论：这是 action 控制流中 `onError` 分支的设计缺口，不需要新增「错误处理原语」。

### 待澄清问题

**1. `data-source` 的 `name` 字段设计：如何选择最优方案？**

用户提出为 `data-source` 增加 `name` 字段，如果存在 `name`，则对应一个包含所有内部状态的数据对象，`dataPath` 将其内容投影到其他 scope 路径。用户同时要求评估以下三个竞争方案，并给出明确建议：

- **方案 A（name 字段）**：`name` 既是资源身份标识，又是默认 scope 发布路径；`dataPath` 作为显式覆盖。
- **方案 B（无 dataPath = 更新当前 scope）**：不指定 `dataPath` 时，API 响应字段直接 merge 进当前 scope。这是 AMIS `service` 的历史行为，但已被架构文档明确标注为非规范。
- **方案 C（特殊 dataPath 语法）**：用特殊值（如 `"."`）表示「发布到当前 scope」。
- **方案 D（开关属性）**：增加 `mergeScope: true` 之类的布尔开关。

**2. TanStack Query 能否作为 `data-source` 运行时底层？**

---

## 第 3 轮

### 用户回答

（待补充）

### AI 整理

以下为对上述两个待澄清问题的分析，供用户确认或修正。

---

#### 问题 1：`data-source` `name` 字段设计评估

**前提：当前设计的实际问题**

当前 `data-source` 使用继承自 base schema 的 `id` 作为资源身份（capability targeting 用 `targetId` 引用它），`dataPath` 作为 scope 发布路径，二者是独立字段。对于最常见的场景（资源 id 和发布路径同名），作者需要写两次相同的值：

```json
{ "id": "users", "dataPath": "users", "api": { "url": "/api/users" } }
```

**四个方案的比较**

| 维度                  | 方案 A（name 字段）               | 方案 B（无 dataPath = merge scope） | 方案 C（特殊 dataPath 语法） | 方案 D（开关属性） |
| --------------------- | --------------------------------- | ----------------------------------- | ---------------------------- | ------------------ |
| 常见场景简洁性        | 高（只写 `name`）                 | 高（省略 `dataPath`）               | 低（需要记住魔法值）         | 低（两个字段）     |
| namespace 安全        | 安全（发布到明确路径）            | 不安全（污染当前 scope）            | 不安全（同 B）               | 不安全（同 B）     |
| 身份与路径是否统一    | 是                                | 否（仍需 `id`）                     | 否（仍需 `id`）              | 否（仍需 `id`）    |
| 向后兼容              | 兼容（`dataPath` 仍有效）         | 已被架构文档标为非规范              | 增加隐性约定                 | 增加隐性约定       |
| 乐观更新/内部状态扩展 | 自然（`name` 对象可包含内部字段） | 无明确路径                          | 无明确路径                   | 无明确路径         |

方案 B/C/D 的根本问题是 namespace 安全：API 响应可以包含任意 key，merge 到当前 scope 会与其他 scope 字段发生不可预期的冲突。`docs/architecture/frontend-programming-model.md` 的 Scope Admission Rule（lines 520–543）和 resource 规则第 19 条（一个绑定路径只能有一个 active publisher）都在约束这类行为。方案 B 已被架构文档明确标注为非规范。

**推荐：方案 A，具体语义如下**

```json
// 只写 name：数据发布到 ${users}，capability 以 "targetId": "users" 引用
{ "type": "data-source", "name": "users", "api": { "url": "/api/users" } }

// name + dataPath：数据发布到 ${table.users}，capability 仍以 "targetId": "users" 引用
{ "type": "data-source", "name": "users", "dataPath": "table.users", "api": { "url": "/api/users" } }

// 只写 dataPath（向后兼容）：数据发布到 ${lookups.countries}，capability 以 id 引用
{ "type": "data-source", "id": "countries", "dataPath": "lookups.countries", "api": { "url": "/api/countries" } }
```

语义规则：

- `name` 存在时：资源身份 = `name`，默认 scope 发布路径 = `name`
- `dataPath` 存在时：scope 发布路径覆盖为 `dataPath`，身份仍为 `name`（或 `id`）
- `name` 与 `id` 都不存在时：匿名资源，无法被 capability 显式引用
- `id` 保留以向后兼容，语义不变；如果同时声明 `name` 和 `id`，`id` 优先作为 capability targeting 身份

**乐观更新和内部状态**

有了 `name`，资源的内部状态可以有结构化的表达方式。乐观更新建议通过资源配置标识实现，而不是把乐观值和确认值放到 scope 里的两个路径：

```json
{
  "type": "data-source",
  "name": "userProfile",
  "optimistic": true,
  "api": { "url": "/api/profile", "method": "get" }
}
```

`optimistic: true` 时，资源运行时内部维护 `{ committed, pending, rollback }` 三态，`statusPath`（若声明）的 DTO 增加 `optimisticPending: boolean` 和 `rollbackAvailable: boolean` 字段。scope 发布的仍是单一逻辑值（乐观值或确认值，取决于 pending 状态），与「一个资源发布一个逻辑值」的规则相容。

**分页/合并策略**

```json
{
  "type": "data-source",
  "name": "items",
  "mergeStrategy": "append",
  "api": { "url": "/api/items", "method": "get" }
}
```

`mergeStrategy` 可选值：`"replace"`（默认）、`"append"`（用于无限滚动，将新页数据 concat 到已有数组）、`"prepend"`。这个扩展不破坏「一个资源发布一个逻辑值」规则，因为 scope 里仍然只有一个 `items` 路径，只是更新策略变了。

---

#### 问题 2：TanStack Query 作为 `data-source` 运行时底层

**映射关系**

| TanStack Query 概念                        | Flux resource 对应                               |
| ------------------------------------------ | ------------------------------------------------ |
| `queryKey`                                 | 资源 `name`/`id`                                 |
| `queryFn`                                  | env.fetch 驱动的 producer 实现                   |
| `data`, `isLoading`, `error`, `isFetching` | `dataPath` 发布的值，`statusPath` DTO 的各字段   |
| `staleTime`, `gcTime`                      | 资源配置中的 cache 策略                          |
| `invalidateQueries`                        | `refreshSource` built-in capability              |
| `useMutation` + `onMutate` (乐观更新)      | capability handler + `optimistic: true` 资源标识 |
| `infiniteQuery`                            | `mergeStrategy: "append"` + 分页 cursor          |
| `placeholderData`                          | `initialData` 字段（已存在）                     |

**结论：可行，且推荐作为 API 类资源的内部运行时实现**

TanStack Query 的查询缓存、去重、后台重试、失效传播机制与 Flux resource 原语的运行时责任高度重叠。将 TanStack Query 作为 api-backed resource 的 producer runtime 内部实现，可以获得成熟的 cache 管理而不改变 schema 层语义。关键一点：TanStack Query 的「一个 queryKey 对应一个 queryResult」与 Flux「一个资源发布一个逻辑值」完全对应，没有概念冲突。

注意这是实现层决策，不影响 schema 作者可见的 resource 原语语义。

---

### 待澄清问题

1. `name` 字段设计方案 A 是否确认采纳？`id` 是否应被标为 deprecated、可选，还是两者并存但语义互斥？
2. `mergeStrategy` 字段是否在当前阶段就需要设计进 `DataSourceSchema`，还是留给 table store 层的特殊 resource producer 处理？
3. `optimistic` 标识和 `statusPath` DTO 的扩展是否在 `api-data-source.md` 中作为 future section 记录，还是推迟到实际需求出现时？
4. 关于 action `onError` 分支：是否在 `action-scope-and-imports.md` 中增加 `onError: ActionStep[]` 字段规范，并明确与 `continueOnError` 的关系（`continueOnError` 简化为「不声明 `onError` 时的兜底行为」）？

---

## 第 4 轮

### 用户回答

用户对上一轮分析提出了明确纠正，并要求后续讨论只保留带有可行改进设计的有效异议。用户的补充重点如下：

- 反驳必须附带一个可行的改进设计，不能停留在“无法证明最优”的抽象层面。
- 多人协作、CRDT、OT 等明显属于 editor-specific 或 host/domain 层问题，不应作为 `Flux` core programming model 的反驳点。
- 当前讨论的评价对象始终是 core engine design；此前把问题说成“评价对象被偷换”是口语抬杠，不是有效异议。
- `Capability` 更准确地说应理解为 `ActionScope` / authority organization；具体 `Action` 概念与控制流能力是独立问题。
- `Action` 的能力可以渐进扩充：先支持最简单的单步触发，再补 `then` / `catch`，再补 `parallel` / `sequential`，最后才考虑 `DAG` 级表达。
- `api` 应是发送给底层 fetcher 的完整输入/输出描述；`timeout`、`throttle` 等不应简单塞进 `ApiObject`，而应位于更高一层的执行控制。
- `data-source` 与 `action` 可以在操作控制层面共享底层实现，例如 `timeout`、`throttle`、cancellation、dedup，但 schema 形态未必需要完全相同。
- dependency tracking 是表达式语义天然隐含的基线；真正需要设计的是它与 `Reaction` / `Action` 的触发时机。
- `form` 进入时的 `init`、提交时的 `submit`、验证后再触发远程调用等流程都需要语义化建模，不能把完整 submit pipeline 直接塞到某个 `button.onClick` 内。

### AI 整理

本轮纠正后，前一轮里两类无效异议应当撤回：

- 不再把 collaboration / CRDT / OT / local-first 一类 editor-specific 议题当作 `Flux` core programming model 的反驳理由。`docs/architecture/frontend-programming-model.md:1128-1135` 已经明确把这类系统放在 host/domain 边界之外。
- 不再把问题表述成“评价对象被偷换”。当前讨论始终围绕 core engine design，只是前一轮在措辞上把“框架整体”与“执行内核”混说了。

保留的讨论点应收敛为五个，并且每个都必须给出最佳可行改进方向：

1. `Capability` 与 `Action` 控制流应如何分层。
2. `ApiObject` 与更高层执行控制应如何分离。
3. `data-source` 与 `action` 是否应共享一套操作控制底座。
4. dependency tracking 与 `Reaction` / `Action` 的调度时机如何固定为明确语义。
5. `form` / `page` / `dialog` 等语义生命周期入口如何建模，避免把完整流程写死在 UI 事件上。

在这个修正后的范围内，我的最新判断是：

- `docs/architecture/frontend-programming-model.md` 的主线方向仍然成立。
- 当前最值得继续打磨的不是 primitive 个数，而是 `Action` 代数、执行控制分层、依赖追踪调度、以及语义生命周期入口这几块尚未完全收敛的执行模型。

### AI 分析

#### 保留问题一：`Capability` 与 `Action` 控制流仍然耦合过紧，最佳方案是“authority layer + action algebra”两层模型

当前文档把 `Capability`、`ActionSchema`、`ActionResult`、`then/onError`、`parallel`、`Optimistic Update` 放在同一大节中描述，见 `docs/architecture/frontend-programming-model.md:686-918`，而当前类型层也把这些字段揉在同一个 `ActionSchema` 里，见 `packages/flux-core/src/types/actions.ts:6-33`。这不是 primitive closure 错误，而是**authority lookup** 与 **effect orchestration** 两层语义没有完全拆开。

我现在认为最佳方案不是拆 primitive，而是把模型明确分为两层：

- `Capability` 只回答“谁有 authority、如何 resolve”，也就是 `ActionScope`、`ComponentHandleRegistry`、built-in capability family，参考 `docs/architecture/action-scope-and-imports.md:302-410`。
- `Action` 单独回答“一个或多个 effect step 如何组织、分支、聚合、返回结果”。

推荐的渐进式 `Action` 设计是：

- Phase 1：单步 action，只支持 `{ action, args }`。
- Phase 2：在单步 action 上增加 `then` 和 `onError`，形成最小分支能力。
- Phase 3：增加 `parallel`，并把数组顺序执行继续作为默认 `sequence` 语义，而不是一开始就发明复杂图语言。
- Phase 4：只有在确实出现跨 step 依赖表达压力时，才引入显式 `DAG` 形态，例如 `steps + dependsOn`，而不是过早复杂化。

这个改进方向的好处是：

- primitive 仍然可以保持闭合；不需要为了 action algebra 把 `Capability` 再拆成多个 primitive。
- `docs/architecture/action-scope-and-imports.md:360-410` 已经具备 `when`、`parallel`、`retry`、`timeout`、`then`、`onError` 的第一版骨架，适合继续演进。
- schema 作者能更清楚地区分“authority resolution”与“control flow composition”，不会再把 action 能力增长误解为 capability primitive 失控。

#### 保留问题二：`ApiObject` 应收敛为 fetcher 输入输出契约，执行控制应上移为独立层

`docs/architecture/api-data-source.md:30-60` 目前把 `ApiObject` 定义为请求配置对象，`docs/architecture/api-data-source.md:137-149` 又让 `executeApiObject(...)` 成为统一执行入口。这个方向是对的，但后续扩展时必须守住一个边界：

- `ApiObject` 负责 fetcher 关心的输入输出描述：`url`、`method`、`headers`、`params`、`data`、`requestAdaptor`、`responseAdaptor`。
- `timeout`、`throttle`、`debounce`、`retry`、cancellation mode、dedup policy 这类内容不应简单并入 `ApiObject`，因为它们属于**操作控制**，而不是请求对象本身。

最佳改进设计是把运行时合同拆成三层：

- `ApiObject`：纯 transport / adaptor contract。
- `OperationControl`：`timeout`、`throttle`、`debounce`、`retry`、dedup、cancellation、concurrency mode。
- consumer-specific policy：`Action` 侧的 branch / chain control，`Resource` 侧的 polling / refresh / merge / stale policy。

这意味着：

- 同一个 `ApiObject` 可以被 `submit`、`ajax action`、`data-source refresh` 复用，而不必把 submit 场景的控制策略写死进请求对象。
- `executeApiObject(...)` 继续作为统一请求执行入口，但接收的是“`ApiObject` + 上层 operation control + 当前上下文”这组输入，而不是让 `ApiObject` 本身无限膨胀。
- `docs/architecture/frontend-programming-model.md:598-599,618-619` 已经在方向上承认 transport timeout 不等于 primitive；接下来更适合把这个边界写得更清楚，而不是继续把更多时序控制混进 request 对象。

#### 保留问题三：`data-source` 与 `action` 应共享操作控制底座，但 schema 形态应分别设计

这不是要求把 `data-source` 和 `action` 合成一个 primitive，而是要求它们不要在 runtime 层各长一套独立的 `timeout`、`throttle`、cancellation、dedup 实现。

最佳方案是建立一个共享的 runtime execution substrate，例如：

- 统一的 abort / timeout / cancellation 控制。
- 统一的 throttle / debounce / dedup 协调器。
- 统一的 monitor / tracing / structured result 包装。

然后分别暴露两套 schema：

- `ActionSchema` 继续强调 `then`、`onError`、`parallel`、`retry` 这类一次性 effect orchestration 语义，参考 `packages/flux-core/src/types/actions.ts:22-32`。
- `DataSourceSchema` 继续强调 `interval`、`stopWhen`、`mergeStrategy`、`statusPath`、publication path 等 runtime-owned producer 语义，参考 `docs/architecture/api-data-source.md:181-215,278-317`。

这套设计比“完全共用 schema”更好，因为：

- `Action` 的核心是一次 dispatch 的控制流。
- `Resource` / `data-source` 的核心是拥有生命周期的 value producer。
- 它们可以共用工具，不必共用 authoring shape。

#### 保留问题四：dependency tracking 应从实现提示上升为顶层执行基线，并明确与 `Reaction` / `Action` 的时机关系

用户指出 dependency tracking 本来就是表达式语义的隐含基线，这个纠正是成立的。`docs/architecture/api-data-source.md:295-317` 已经把 source dependency tracking 说得比较清楚，但 `frontend-programming-model.md` 目前还没有把它提升为整个 programming model 的显式执行规则。

最佳改进设计不是新增 primitive，而是补一条 shared execution rule：

- 每次动态表达式求值都可以产出“值 + 依赖路径集合”。
- `ScopeChange` 持续携带 changed paths，当前 `ScopeRef` / `ScopeStore` 合同已经有这个方向，见 `docs/architecture/flux-core.md:238-270`。
- `Value` 的依赖命中只触发局部重新求值。
- `Resource` 根据依赖命中决定 dirty、refresh、或同步重算后再 publish。
- `Reaction` 只在相关依赖 settled 后重算 watched value，并在该轮 settled update turn 之后 dispatch action，见 `docs/architecture/frontend-programming-model.md:1058-1081` 与 `docs/architecture/api-data-source.md:521-545`。
- dependency change 本身不直接触发任意 `Action`；要跨过 effect boundary，仍然必须经过 `Reaction` 或语义 lifecycle trigger。

这个改进的意义在于：

- 它把“表达式天然数据驱动”从直觉变成可实现、可调试、可优化的合同。
- 它也回答了 dependency tracking 与 action 的关系：**dependency tracking 驱动重算与 watch，effect 仍然通过 `Reaction` 或语义 lifecycle 进入 `Action` 层。**

#### 保留问题五：`form` / `page` / `dialog` 需要语义生命周期入口，不能让完整流程退化为 UI 事件内联脚本

这一点是我现在最认同的新增设计要求。当前 runtime 其实已经部分具备正确方向：

- `FormRuntime.submit(api?)` 先做 touch + validate，再决定是否执行提交，见 `docs/architecture/form-validation.md:236-241`。
- 实际代码里 `packages/flux-runtime/src/form-runtime.ts:403-499` 也明确先验证、后提交、最后落回 `ActionResult`。
- 当前 action 层已经支持 `submitForm` built-in action 与 `component:submit` instance capability，见 `docs/architecture/action-scope-and-imports.md:448-474`。

但 schema 层还可以更进一步，最佳方案是把 `form` 的语义生命周期显式建模出来，而不是把完整 submit pipeline 塞到某个 button 的 `onClick` 里。

推荐的收敛方式是：

- `form` 自身拥有语义入口，例如 `initAction`、`submitAction`、`onSubmitSuccess`、`onSubmitError`、`onValidateError`。
- `submitAction` 可以是 action pipeline，也可以在最简形态下只是一个 `api` 描述；但它始终挂在 form semantic boundary 上，而不是挂在某个 button 上。
- `button`、Enter 键、wizard 下一步、外部 toolbar 等都只触发 `component:submit` 或 `submitForm` 这一语义入口，不重复声明完整提交流程。
- `page` / `dialog` / special host 以后也可以采用同样模式，提供 `init` / `enter` / `open` / `close` 这一类语义生命周期，而不是一律回退到零散 `onClick` 或 ad hoc `useEffect`。

一个更合理的 authoring 形态接近：

```json
{
  "type": "form",
  "id": "shipping-form",
  "initAction": {
    "action": "refreshSource",
    "targetId": "countries"
  },
  "submitAction": {
    "action": "ajax",
    "api": {
      "url": "/api/shipping/submit",
      "method": "post",
      "data": "${$form.values}"
    }
  },
  "onSubmitSuccess": [{ "action": "navigate", "args": { "to": "/confirmation" } }],
  "onSubmitError": [{ "action": "toast", "level": "error", "message": "${error.message}" }]
}
```

对应地，按钮只需要：

```json
{
  "type": "button",
  "label": "Submit",
  "onClick": {
    "action": "component:submit",
    "componentId": "shipping-form"
  }
}
```

这套设计的优点是：

- 语义入口挂在真正拥有生命周期的节点上。
- UI 触发器只负责触发语义入口，不复制业务流程。
- `submit` 继续保留“validate -> submit api -> success/error branches”的统一合同，不会被不同触发方式写散。

### 待澄清问题

1. 你是否同意把 `Capability` 与 `Action algebra` 明确拆成两个文档层次：primitive closure 里保留 `Capability`，动作控制流单独作为 `Action` 运行时合同持续扩展？
2. 对 `ApiObject`，你是否倾向于进一步瘦身为纯 fetcher contract，并把 `timeout` / `throttle` / `retry` / dedup 等全部放到更高层的 operation control？
3. 对 `form` 语义生命周期，你更倾向于字段名采用 `initAction` / `submitAction` / `onSubmitSuccess` / `onSubmitError`，还是采用更统一的 `onInit` / `onSubmit` / `onSuccess` / `onError` 事件式命名？

---

## 纠正

> 针对第 1 轮到第 3 轮中关于最优性评审的若干表述，用户纠正如下：
>
> - 多人协作、CRDT、OT、local-first 等属于 editor-specific 或 host/domain 层议题，不应作为 `Flux` core programming model 的反驳点。`frontend-programming-model.md` 已经把这类问题明确放在 core boundary 之外。
> - 当前讨论的评价对象始终是 core engine design；此前把问题表述成“评价对象被偷换”不成立。
> - `Capability` 更准确地说是 authority / `ActionScope` 组织问题；action algebra 的不足不应直接归因于 primitive category 定义本身。
> - 后续所有保留异议都必须附带可行的改进设计，不能停留在“证明不了最优”式的抽象反驳。

---

## 第 5 轮

### 用户回答

用户进一步补充了一个此前没有被充分纳入判断的前提条件：

- 后端是 Java 服务端。
- XML / JSON 转换、DSL Loader、结构装配、权限裁剪、i18n 等大量平台层工作在 Java 端完成。
- 需要重新判断：这一前提是否会改变对 `docs/architecture/frontend-programming-model.md` “是否最优”的评价。

### AI 整理

这一轮的关键不是“后端语言偏好”，而是**系统总体分层是否会改变前端 core programming model 的最优解**。

如果 Java 服务端已经承担：

- final schema 装配
- XML / JSON 双向转换
- 权限裁剪与 feature 结构裁剪
- i18n 文本替换
- profile / inheritance / metaprogramming 变换

那么前端 `Flux` 的最优目标就不再是“尽量做成一个更强的统一前端程序运行时”，而更可能是：

- 一个更窄的 final-model runtime
- 一个更稳定、更语言中立的 DSL VM
- 一个与 Java loader 共享清晰 JSON / DTO 契约的 execution engine

### AI 分析

#### 影响一：`Final Execution Schema` 假设在 Nop 里更成立，而不是更弱

此前对 `Final Execution Schema` 的质疑，更适合 generic low-code 框架语境，不完全适合 Nop 当前架构。

现有文档已经多次明确：

- `docs/discussions/2026-04-05-core-design-clarification.md:95-113`：XML / JSON 转换与很多结构变换在 Java 端 DSL Loader 完成。
- `docs/articles/flux-design-introduction.md:350-429`：Nop 平台层在送入 Flux 前执行 i18n、权限裁剪、模块合并、编译期元编程与 XML/JSON 转换。
- `docs/discussions/2026-04-06-programming-model-optimality-critique.md:79-89`：此前围绕 loader 不充分的反驳已经撤回。

因此，在 Nop 架构下，`Final Execution Schema` 不是抽象乐观假设，而是前后端分工的一部分。对这点估计不足，会把本应放在 Java loader 的复杂性错误地重新拉回前端 runtime。

#### 影响二：前端公开模型应更强调语言中立性，而不是更强的前端运行时统一性

既然后端是 Java，前后端之间真正稳定的共享面应当是：

- 标准字段命名
- 明确的 JSON / DTO 合同
- 可分析、可诊断的 declarative schema 与 action
- 少量稳定 primitive

这会强化当前文档的若干主张：

- `Value` / `Resource` / `Reaction` / `Capability` / `Host Projection` 继续保持职责分离
- `Schema-visible Scope` 不进入 imperative object / bridge / controller
- effect 仍然只通过 `Capability` 发生
- 运行时不应为了前端 convenience 重新发明一套厚重的 runtime object protocol

换言之，Java backend 的存在会提高“更窄、更稳定、更语言中立”的设计价值，降低“更强的前端统一 runtime 图模型”的必要性。

#### 影响三：SSR / hydration 不再适合作为 primitive 设计的主导目标

在 React / Node 全栈语境里，SSR / hydration 很容易被提升为顶层目标。

但在 Nop 里，后端主体系是 Java，这意味着：

- SSR 可以是宿主集成能力
- server-side pre-render 可以存在
- loader 可以运行在 server / pre-render infrastructure
- 但前端 core primitive 不应为了适应 `RSC` / hydration-first 叙事而重构

因此，先前把 SSR / hydration readiness 视为“下一代前端低代码框架必须内建的一等原语驱动力”，这个判断在 Nop 架构下需要降权。它仍然重要，但更像 host integration concern，而不是 primitive redesign 的首要依据。

#### 影响四：协作 / patch / version 更应先表述为 host protocol + backend contract，而不是 core primitive 压力

Java 服务端天然更适合承接：

- 文档版本
- patch DTO 校验
- 并发控制
- 持久化
- 审计与回滚

因此，在 Nop 的真实架构里，更合理的补强方向不是把 collaboration 提升成新的 core primitive，而是：

- 保持 `Host Projection` 只读
- 通过 `Capability` 写回
- 但把 projection side 的 patch / version feed 契约写得更明确

这说明此前分析中的“统一 `Binding` + patch-driven collaborative host”那部分并非完全无价值，但更适合下沉为 host/runtime 边界补强，而不是上升为替换整套 primitive closure 的理由。

#### 修正后的判断

在 generic next-generation low-code runtime 语境里，一个更强的 staged reactive model 仍然有吸引力。

但在 Nop 这个**Java loader 主导**、前端被明确收敛为 final-model runtime 的体系里，判断需要修正为：

- `docs/architecture/frontend-programming-model.md` 更接近正确方向。
- 先前提出的替代方案不应被视为新的 baseline。
- 它更适合被降格为“边界补强素材来源”，只保留少数仍然对 Nop 有价值的点，例如：
  - 更硬的 `dynamic-renderer` / composition boundary wording
  - 更明确的 multi-surface / multi-runtime boundary wording
  - 更清楚的 projection patch / version feed contract

### 待澄清问题

1. 是否需要在 `docs/architecture/frontend-programming-model.md` 中显式增加对 Java loader / Nop 平台层的 cross-reference，避免未来再次按 Node/SSR-first 前提误判？
2. 是否应把替代方案里仍有价值的 3 个补强点拆成更窄的 follow-up docs，而不是继续讨论整套 primitive replacement？

---

## 第 6 轮

### 用户回答

用户补充了一个更底层的设计准则，并要求后续判断始终以 DSL 层语义是否保持渐进演化为核心标准。要点如下：

- 系统设计不应从各种业务场景 / 业务需求中提取抽象；传统那种按业务场景归纳概念的抽象方式本身就是错的。
- 设计必须是渐进式的：在 DSL 层面必须允许从简单到复杂的演化；如果一个简单需求已经有最直观最简单的表达，那么需求变复杂后，这个简单表达不能被推翻。
- 对 `Value` / `Resource` 的直觉应回到“组件只消费内存中的值，不关心值的来源；值变动后触发重新渲染或后续动作”。这些值由 store 统一管理，并形成词法作用域可见的树。
- `attrName: attrValue` 中，`attrValue` 可以是静态值、表达式值、动态 API 拉取到的值、或动态函数执行得到的值。
- `data-source` 的本质不是另一类完全不同的值，而是“把一个动态值命名后注册到 scope 中”，并顺带提供 `status` / `error` / 事务态等外围监控信息。没有 `dataPath` 时，通过 `name` 就自动完成注册；`dataPath` 更像额外的复制/投影机制。
- 也可以把动态值机制直接内嵌到某个 `attrValue` 上，但这样会失去精细的状态、错误、刷新、定向操作能力，因为它没有被命名。
- 在结构 DSL 层面，可以直接给节点增加 `when` 表达式来做条件选择，也可以有 `type:loop` 这种循环节点负责循环渲染。
- `dynamic-render` 本身不一定有问题；需要重点考虑的是：任何调用 API 的地方在执行层本质上都像 action 调用，因此需要考虑它与 `ActionScope` 函数调用、远程 API 调用之间是否应该复用同一执行逻辑，甚至是否应进一步统一到某种更一般的 action 抽象或 DAG 编排上。

### AI 整理

这一轮把评判标准从“primitive 是否足够优雅”进一步压到了更硬的一层：

> 任何架构判断都必须先看 DSL 层是否保持了从简单到复杂的稳定语义演化，而不是先看 runtime 内部是否实现得整齐。

这个标准非常重要，因为它会直接改变对若干设计分歧的判断方式：

- 不再先问 `Value` / `Resource` 在 runtime ontology 上是否应该彻底合并。
- 而是先问：在 DSL 层，简单值、表达式值、匿名动态值、可命名动态值，是否能构成一条连续、可提升、但不破坏已有简单写法的演化路径。

### AI 分析

#### 结论一：最核心的抽象单位应当是“可见语义的渐进演化”，而不是“按业务场景归纳能力类别”

这一点我认同，而且它会强化当前文档中的 primitive closure 方向，同时约束它的写法。

更准确地说：

- 不应该从“表单场景需要什么、表格场景需要什么、设计器场景需要什么”出发发明新概念。
- 应该从“DSL 作者最先看到的简单表达是什么；当需求变复杂时，是否只是显式提升，而不是改写原有世界观”出发设计概念。

这意味着，一个设计即使 runtime 内部非常漂亮，只要它让 DSL 从简单到复杂时发生概念断裂，它就不是好设计。

#### 结论二：`Value` / `Resource` 的正确理解应分成“消费视角”和“生产视角”

用户给出的直觉很重要：对 renderer / component 的消费视角来说，前端只是在消费内存中的值，并不关心值来自：

- 字面量
- 表达式
- API 拉取
- 动态函数
- 其他动态机制

这个消费视角在 DSL 层必须保持稳定。

但在生产侧，仍然需要区分：

- 一个值是否只是临时求值结果
- 还是一个需要被命名、被追踪状态、被刷新、被显式操作的动态值实体

因此，一个更贴近当前体系、又满足“渐进演化”原则的表达应是：

- `Value` 是消费侧统一语义：字段读取的是值。
- `data-source` / `Resource` 是生产侧提升语义：当一个动态值需要具名、可观测、可刷新、可定向操作时，把它提升为一个被注册到 scope 的命名动态值。

这样理解后，`Value` / `Resource` 不是在 DSL 层彼此竞争的两种世界观，而是同一条演化路径上的两个层次：

1. 最简单：静态值
2. 其次：表达式值
3. 再进一步：匿名动态值
4. 需要可操作性时：具名 `data-source`

这里真正需要补强的是文档对这条“promotion path”的明确描述，而不是急于改 primitive taxonomy。

#### 结论三：`data-source` 的本质确实更接近“命名后的动态值注册”，但 `dataPath` 仍需严格界定为投影还是第二权威写点

用户这里提出的判断我大体认同：`data-source` 的核心不是“另一类渲染节点”，而是：

- 给动态值一个名字
- 把它注册进 scope
- 暴露状态和错误等附属信息
- 允许后续刷新、失效、定向操作

这比单纯把它理解成“远程请求节点”要准确得多。

同时，`dataPath` 作为额外复制/投影机制的说法也有启发性，但这里必须补一条硬约束：

- 从 DSL authoring 角度，可以把 `dataPath` 看成额外投影。
- 但从 runtime ownership 角度，不能把它变成第二个独立权威写入点。

更稳妥的说法应当是：

- `name` 定义被操作、被识别的动态值身份。
- 默认情况下，它也定义默认注册路径。
- `dataPath` 若存在，最好被定义为运行时维护的额外只读投影 / alias / projection，而不是另一个可独立写入的业务值根。

否则 DSL 虽然表面简化了，但 runtime 会失去“一个动态值只有一个权威来源”的可诊断性。

#### 结论四：允许“匿名动态值”是对的，但它应该被明确定位为低能力等级写法

用户提出：`attrValue` 本身也可以内嵌动态 API 拉取或动态函数值；只是没有名字时，就会失去精细的 `status` / `error` / `refresh` / targeted control。

这个判断我认同，而且它非常符合“渐进演化”原则。

更好的表述是：

- 匿名动态值可以作为 DSL 的简写层。
- 它适合只关心“拿到值就渲染”的简单场景。
- 一旦需要可观测状态、重试、刷新、错误分支、跨节点复用、或外部 action 定向操作，就应提升为具名 `data-source`。

这比“一开始就要求所有动态值都写成具名 data-source”更符合 DSL 的自然学习路径。

#### 结论五：`when` 和 `loop` 应作为比 `dynamic-renderer` 更基础的结构 DSL，`dynamic-renderer` 保持窄边界即可

用户这里的判断也是对的。

对于普通结构表达，最自然的 DSL 层演化应当是：

- `when`：条件出现 / 条件替换
- `loop`：循环展开 / collection rendering
- `dynamic-renderer`：只有在确实需要动态加载外部 fragment、远程 schema、或宿主延迟组装片段时才使用

也就是说：

- `dynamic-renderer` 不是错。
- 真正的问题是不要让它吞掉本该由更简单、更基础的结构 DSL 表达的 `when` / `loop` 语义。

这和前一轮“Java loader 主导”的判断并不冲突：

- 能在 loader 解决的结构装配仍然前移。
- 留到 runtime 的结构变化，也应先用最简单的 DSL 结构节点表达，而不是先上重型动态加载机制。

#### 结论六：`api` 调用、`ActionScope` 函数调用、`data-source` producer 可以共享执行底座，但不应过早统一成同一种 authoring DSL

用户提出的方向非常值得保留：

- 远程 API 调用
- namespaced action 调用
- 具名动态值的 producer 执行

在执行层确实都像“一个可取消、可超时、可重试、可追踪的 operation”。

因此，更合理的架构不是让它们各长一套 runtime，而是：

- 底层共享同一个 operation execution substrate
- 上层 authoring 仍然保留不同 DSL 语义

建议把三层区别说清楚：

1. `Action`：一次 effect dispatch / control flow
2. `data-source`：一个具名动态值的注册与生命周期管理
3. `ApiObject`：底层 transport / adaptor contract

这三者在 runtime 可以共享：

- timeout
- cancellation
- retry
- dedup
- monitor / tracing
- structured result

但 DSL 层不必一开始就强行统一成一个“大而全”的 DAG 语言。

更符合渐进原则的路径应是：

1. 单步 action
2. `then` / `onError`
3. `parallel` / `sequence`
4. 只有在确实出现复杂依赖图 authoring 压力时，才提升到显式 DAG

同理，`data-source` 也不应被动作编排 DSL 吞掉，因为它除了“执行一次 operation”之外，还承担了“注册一个具名动态值”这一更稳定的 DSL 角色。

### 待澄清问题

1. 对 `name + dataPath`，你更倾向于：`dataPath` 是只读投影 / alias，还是允许它成为第二个完整注册路径？
2. 对匿名动态值，你更倾向于先作为解释层概念存在，还是希望尽快给出明确的 DSL 语法形态？
3. 对结构 DSL，你更偏向于 `when` 作为普通节点字段、`loop` 作为专用节点类型，还是两者都做成 wrapper node 以便统一编译？

---

## 第 8 轮

### 用户回答

用户进一步确认并补充如下：

- 对 `data-source` 的特殊发布语义，选择 `mergeToScope: true`。
- `when` 在内部实现时可以 lowering 成一个 wrap 结构；这属于编译 / runtime 内部组织问题，不必强迫外部 DSL 也写成 wrapper node。
- 在记录 discussion 之后，需要根据当前讨论结论回头修正 `docs/analysis/2026-04-06-frontend-programming-model-staged-reactive-alternative.md`，并重新判断其中原先提出的整套设计现在是否还合适。

### AI 整理

这一轮实际上完成了三个关键收口：

1. `data-source` 的 authoring 形态正式收敛为 `name` 为主，`mergeToScope: true` 作为唯一明确的特殊发布扩展。
2. `when` 的 DSL 形态继续保持“节点属性”更自然，而编译后是否转成 wrapper 是内部实现自由度。
3. 需要把先前提出的 staged-reactive alternative 从“潜在替代 baseline”重新降格评估为“分析性备选”，只保留仍然有价值的窄结论。

### AI 分析

#### 结论一：`mergeToScope: true` 现在是比 `dataPath` 更合适的唯一特殊发布语义

在前几轮讨论后，这一点已经足够明确：

- 新 DSL 的正常路径应当只有 `name`
- `name` 同时承担资源身份与默认注册路径
- `dataPath` 不再适合作为主设计继续扩展

唯一需要单独保留的特殊情况是：

- 结果是 object / map
- 希望把结果顶层字段浅合并到当前 scope

因此 `mergeToScope: true` 比 `publishMode: 'merge-scope'` 更合适，因为：

- 它只表达一个非常具体的特例
- 它不会重新引入一个看似可无限扩展的发布模式体系
- 它更符合“简单 DSL 不为未来假想复杂度预留过多形态”的原则

推荐语义应固定为：

1. `name` 仍然是资源身份
2. 默认仍注册 `${name}`
3. `mergeToScope: true` 时，若结果为 object，则其顶层字段额外浅合并进当前 scope
4. 这不是第二个独立权威写点，而是一次额外投影/灌入语义

#### 结论二：`when` 的正确分层是“外部属性 + 内部 wrapper lowering”

这也是一个很清晰的收口：

- DSL authoring 上，`when` 继续做属性更自然
- 编译器 / runtime 内部完全可以把它 lowering 成一个 wrapper-like operator

这说明此前围绕 `when` 是否必须成为独立结构 primitive 的争论，其实混淆了两层：

- DSL 形态
- 内部执行形态

更合理的结论是：

- 外部 DSL 优先自然表达
- 内部实现优先统一编译

所以，`when` 这个名字和形态都可以保留，只要继续坚持：

- `visible` 控制显示
- `when` 控制激活 / 结构存在性 / 生命周期

#### 结论三：先前 staged-reactive alternative 中“大范围 primitive replacement”的部分现在看起来已经不合适

经过第 5 至第 8 轮讨论，原替代方案里几块大的改造现在都显得过头了：

1. 用 `Compiled Program` 替代 `Final Execution Schema` 作为新总纲，不再合适。
   原因：Nop 的 Java loader / platform layer 已经承担了大量装配工作，前端仍应以 final-model runtime 为主定位。

2. 用统一 `Binding` primitive 替代 `Value` / `Resource` / `Host Projection`，不再合适。
   原因：这会削弱 DSL 从“静态值 -> 表达式值 -> 匿名动态值 -> 具名动态值”这条渐进演化路径的可见性。

3. 把 `SSR` / hydration 作为 primitive redesign 的主驱动力，不再合适。
   原因：在 Nop 的 Java 服务端前提下，这不是最优先的前端 core 设计约束。

4. 把大量结构问题优先上升为 `Composition Boundary` primitive，不再合适。
   原因：`when` / `loop` / `dynamic-renderer` 本身已经构成更自然的 DSL 分层，没必要先统一为更重的总括原语。

因此，原替代方案不应再被当成新的潜在 baseline，而应改写成：

- 对当前基线的反思性分析
- 只保留少数仍有价值的补强建议

#### 结论四：原替代方案中仍然保留价值的部分，只剩窄边界补强

在当前讨论结论下，仍然值得保留的点主要有：

- `dynamic-renderer` 边界需要更清晰的窄定义
- 多 surface / 多 runtime 边界仍值得更明确建模，但未必要上升为新 primitive
- host projection 一侧的 patch / version feed 契约仍值得补充
- `action` / `data-source` / `api` 共享执行底座仍然是正确方向
- `Action` 的执行语义应明确承认是 DAG，而 authoring surface 继续保持渐进写法

### 待澄清问题

1. 是否现在就把 `docs/analysis/2026-04-06-frontend-programming-model-staged-reactive-alternative.md` 改写为“已收缩的反思性分析”，明确撤回其中的大范围 primitive replacement 主张？
2. 在 architecture 文档真正修改前，是否还需要在 discussion 中单独补一轮最小 action DAG 语义规则？

---

## 第 7 轮

### 用户回答

用户进一步收敛了几个具体判断：

- `dataPath` 不应作为一个普遍存在的“任意路径发布机制”。对于一般变量命名，`name` 就足够了，根本没有必要使用 `dataPath`。
- 真正常见的特殊情况只有一种：如果动态值是一个 `Map` / object，可能希望把结果合并到当前 scope 中。这时需要一个专门属性来表达“合并到当前 scope”的语义；如果 `dataPath` 这个名字不合适，可以另设一个更窄的属性。
- `when` 和 `loop` 若考虑可视化设计，适合作为 wrap 节点；若考虑 DSL 自然性，则 `loop` 更像节点，而 `when` 更像类似 `visible` 的属性。
- 需要评估 `when` 这个命名是否会和现有其他语义冲突。
- `Action` 很容易扩展：
  - 基本 action 是单步
  - 通过 `when` 控制是否执行
  - 通过 `then` 构成串行执行
  - 通过 `onError` 引入错误处理
  - 通过 `parallel` 引入并行子分支
  - 并行分支结束后自然合并到 `then`
- 因此从执行结构上说，这本身天然就是一个 `DAG`，不需要人为把 “DAG” 当成另一个遥远阶段才考虑。

### AI 整理

这一轮让几个此前还模糊的方向进一步收紧了：

1. `data-source` authoring 形态应强烈偏向 `name`，并把“合并到当前 scope”压缩成一个单独的窄特例，而不是保留宽泛的 `dataPath`。
2. `when` / `loop` 的外部 DSL 应优先服从自然表达；编译后是否统一为 wrapper node 是内部实现问题。
3. 对 `Action`，重点不应是“未来是否升级到 DAG”，而应承认：一旦引入 `when`、`then`、`onError`、`parallel`，其执行图语义事实上已经是一个 DAG，只是 authoring surface 仍然可以保持渐进和直观。

### AI 分析

#### 结论一：`dataPath` 最好退化为历史兼容字段，新 DSL 应以 `name` 为唯一正常路径

这一点我现在基本认同。

如果按 DSL 渐进演化原则看：

- 最简单的具名动态值写法应当只有 `name`
- 作者无需再同时思考“身份”和“发布路径”两套概念
- 复杂性只应在确实存在特殊需求时才显式出现

因此，更合理的方向是：

- `name` = 动态值身份
- `name` = 默认注册路径
- `dataPath` 不再作为推荐主路径，只保留兼容语义

这比继续把 `dataPath` 保持为通用路径映射能力更符合 DSL 的自然性。

#### 结论二：特殊场景不应再依赖宽泛 `dataPath`，而应单独提供一个窄语义属性

用户指出的真实特殊情况非常具体：

- 动态值结果是 object / map
- 希望把结果的顶层字段并入当前 scope

这不是“任意路径发布”问题，而是“是否把结果浅合并到当前 scope”的问题。

因此更合适的 DSL 不是保留一个过宽的 `dataPath`，而是给一个更窄、更可诊断的属性，例如：

- `mergeToScope: true`
- 或 `publishMode: 'named' | 'merge-scope'`

我更倾向于后一种，因为它更便于未来扩展同时仍保持语义集中，例如：

```json
{
  "type": "data-source",
  "name": "userProfile",
  "api": {
    "url": "/api/profile"
  },
  "publishMode": "merge-scope"
}
```

语义固定为：

- `name` 仍然是资源身份
- 默认仍然存在具名注册 `${userProfile}`
- `merge-scope` 只是把 object 顶层字段额外浅合并进当前 scope
- 这是一种特殊发布策略，不是第二个独立权威根

如果担心 authoring 太重，也可以用更直接的 `mergeToScope: true`。两者中我略偏向 `mergeToScope: true`，因为它最直观，也最符合“只覆盖一个特殊情况”的目标。

#### 结论三：`when` 这个命名可以保留，但必须把它定义成统一的 guard 概念，并和 `visible` 明确分层

关于命名冲突，我的建议是：

- 保留 `when`
- 不要改成 `visibleWhen`、`renderWhen`、`mountWhen` 这一类更长名字

原因不是因为它绝对不会冲突，而是因为它最容易形成 DSL 级统一语义：

- 节点上的 `when`：该节点是否激活
- action 上的 `when`：该 step 是否执行
- reaction / effect 上的 `when`：该观察结果是否允许触发

这样 `when` 在整个 DSL 中始终表达的是同一件事：

> guard / activation condition

真正需要严格区分的是：

- `visible`：仅影响显示，不改变节点身份和生命周期
- `when`：影响节点是否存在 / 是否激活，可能导致挂载、卸载、注册、dispose

所以问题不在于 `when` 这个词能不能用，而在于文档必须把 `when` 与 `visible` 的生命周期语义明确切开。

#### 结论四：外部 DSL 上，`loop` 更适合做节点，`when` 更适合做属性；编译后可统一降成 wrapper

用户给出的区分我认同。

如果从 DSL 自然性看：

- `when` 更像给现有节点加 guard，因此适合做属性
- `loop` 会引入 `item` / `index` / `key` / `empty` / child scope 等结构语义，因此更适合做节点

这意味着最自然的 authoring shape 是：

- `when` 作为普通节点字段
- `type: 'loop'` 作为专用结构节点

而在编译器内部：

- 完全可以把两者都 lowering 成 wrapper-like structural operators

这样可视化设计器和 runtime 实现都能获益，但不会把 authoring DSL 反向拉得不自然。

#### 结论五：`Action` 不是“未来可能升级成 DAG”，而是现在这种递进式语法天然就已经是 DAG

这一点是本轮最重要的修正。

此前说“先 sequence，再 parallel，以后有压力再提升到 DAG”是不准确的，因为：

- 单步 action 是一个节点
- `when` 是节点 guard
- `then` 是成功边
- `onError` 是失败边
- `parallel` 是一个 fan-out 聚合节点
- `parallel` 结束后继续流入 `then`

从执行图角度，这已经天然构成了一个 DAG。

所以更准确的表述应当是：

- DSL authoring surface 可以保持渐进和简单
- 但 runtime / semantics 层应当明确承认它的执行模型本质上是 DAG

这不是要求立刻引入复杂的显式 `steps + dependsOn` authoring 语法；而是要求文档不要把 DAG 说成一个遥远的未来阶段，仿佛只有显式图语法才算 DAG。

#### 结论六：更好的分层方式是“DAG execution semantics + progressive authoring surface”

结合这一轮和前一轮，`Action` 更合理的最终判断应当是：

- authoring surface 保持渐进：单步、`when`、`then`、`onError`、`parallel`
- runtime execution semantics 明确认定为 DAG
- `ActionScope` / `Capability` 继续只解决 authority lookup，不吞掉 action graph semantics

这样有几个好处：

- 对 DSL 作者，仍然是直观写法，不必一开始学习图语言
- 对 runtime，实现上可以统一处理调度、结果归并、错误传播、取消、超时、监控
- 对后续扩展，如果真的需要显式步骤图，只是 authoring 上层新增一种更显式写法，而不是语义基础重做

### 待澄清问题

1. 对 `data-source` 的特殊发布语义，你更倾向于 `mergeToScope: true` 这种直接字段，还是 `publishMode: 'merge-scope'` 这种更可扩展但稍重的写法？
2. 对 `when`，你是否同意把它定义为统一 guard 概念，并明确与 `visible` 做生命周期级别的区分？
3. 对 `Action`，下一步是否应该在讨论层先明确一份“DAG 语义但渐进 authoring”的最小执行规则，而不是继续停留在字段直觉层？
4. 对结构 DSL，你更偏向于 `when` 作为普通节点字段、`loop` 作为专用节点类型，还是两者都做成 wrapper node 以便统一编译？
