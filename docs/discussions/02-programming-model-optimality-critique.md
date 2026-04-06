# Programming Model Optimality Critique

## 第 1 轮

### 用户原始表述

用户要求对 `docs/architecture/frontend-programming-model.md` 做独立评审：是否认同它是下一代低代码框架的最优设计？如果不同意，必须提出深刻的反驳意见，附有明确依据和理由，不能为反驳而反驳。

### AI 复述

核心问题是：`frontend-programming-model.md` 所定义的七原语封闭集（Structure / Scope / Value / Resource / Reaction / Capability / Host Projection）在实际低代码场景下是否真的达到「最优」，还是存在结构性缺口。

### AI 分析

调研范围：`docs/architecture/frontend-programming-model.md`（全文 1088 行）、`docs/architecture/api-data-source.md`、`docs/architecture/action-scope-and-imports.md`、`docs/architecture/flux-core.md`、`docs/articles/flux-design-introduction.md`、`docs/discussions/01-core-design-clarification.md`、`docs/architecture/flux-dsl-vm-extensibility.md`、`docs/analysis/2026-04-04-flux-architecture-evaluation.md`。

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
- `docs/discussions/01-core-design-clarification.md`（lines 255–256）明确：「Loader 层负责装配最终模型，runtime 只执行 final model，这与可逆计算里变化应优先在模型空间中被处理而不是在运行时接口里漂移的原则一致。」
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

| 维度 | 方案 A（name 字段） | 方案 B（无 dataPath = merge scope） | 方案 C（特殊 dataPath 语法） | 方案 D（开关属性） |
|---|---|---|---|---|
| 常见场景简洁性 | 高（只写 `name`） | 高（省略 `dataPath`） | 低（需要记住魔法值） | 低（两个字段） |
| namespace 安全 | 安全（发布到明确路径） | 不安全（污染当前 scope） | 不安全（同 B） | 不安全（同 B） |
| 身份与路径是否统一 | 是 | 否（仍需 `id`） | 否（仍需 `id`） | 否（仍需 `id`） |
| 向后兼容 | 兼容（`dataPath` 仍有效） | 已被架构文档标为非规范 | 增加隐性约定 | 增加隐性约定 |
| 乐观更新/内部状态扩展 | 自然（`name` 对象可包含内部字段） | 无明确路径 | 无明确路径 | 无明确路径 |

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

| TanStack Query 概念 | Flux resource 对应 |
|---|---|
| `queryKey` | 资源 `name`/`id` |
| `queryFn` | env.fetch 驱动的 producer 实现 |
| `data`, `isLoading`, `error`, `isFetching` | `dataPath` 发布的值，`statusPath` DTO 的各字段 |
| `staleTime`, `gcTime` | 资源配置中的 cache 策略 |
| `invalidateQueries` | `refreshSource` built-in capability |
| `useMutation` + `onMutate` (乐观更新) | capability handler + `optimistic: true` 资源标识 |
| `infiniteQuery` | `mergeStrategy: "append"` + 分页 cursor |
| `placeholderData` | `initialData` 字段（已存在） |

**结论：可行，且推荐作为 API 类资源的内部运行时实现**

TanStack Query 的查询缓存、去重、后台重试、失效传播机制与 Flux resource 原语的运行时责任高度重叠。将 TanStack Query 作为 api-backed resource 的 producer runtime 内部实现，可以获得成熟的 cache 管理而不改变 schema 层语义。关键一点：TanStack Query 的「一个 queryKey 对应一个 queryResult」与 Flux「一个资源发布一个逻辑值」完全对应，没有概念冲突。

注意这是实现层决策，不影响 schema 作者可见的 resource 原语语义。

---

### 待澄清问题

1. `name` 字段设计方案 A 是否确认采纳？`id` 是否应被标为 deprecated、可选，还是两者并存但语义互斥？
2. `mergeStrategy` 字段是否在当前阶段就需要设计进 `DataSourceSchema`，还是留给 table store 层的特殊 resource producer 处理？
3. `optimistic` 标识和 `statusPath` DTO 的扩展是否在 `api-data-source.md` 中作为 future section 记录，还是推迟到实际需求出现时？
4. 关于 action `onError` 分支：是否在 `action-scope-and-imports.md` 中增加 `onError: ActionStep[]` 字段规范，并明确与 `continueOnError` 的关系（`continueOnError` 简化为「不声明 `onError` 时的兜底行为」）？
