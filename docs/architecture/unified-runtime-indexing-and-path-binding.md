# 运行时路径绑定与索引细化

## 目的

本文档只说明一件事：

- 在现有 `compiled template`、`runtime instance`、`runtime owner`、`scope` 体系不变的前提下，如何把路径绑定与索引职责说清楚，并减少 `object-field`、`variant-field`、`array-field` 里分散的 prefix 包装逻辑。

本文档不是新的总架构，不引入新的统一 runtime 抽象。

文档边界：

1. `templateNodeId` / `templatePath` / `instancePath` / `cid` 的规范语义，仍以 `docs/architecture/template-instantiation-and-node-identity.md` 为准
2. validation owner、`rootPath`、field path 的规范语义，仍以 `docs/architecture/form-validation.md` 为准
3. 本文档只收敛复合字段中的路径绑定实现思路，以及这些索引在当前实现中的职责边界

## 当前基线

现有实现已经有几类不同的 identity / path：

1. 编译结构 identity
   - `templateNodeId`
   - `templatePath`
   - `repeatedTemplateId`
2. 运行时实例 identity
   - `cid`
   - `instancePath`
3. 值与校验路径
   - `profile.firstName`
   - `items.3.name`

这些概念目前总体是合理的：

- `templateNodeId` / `templatePath` 负责编译结构
- `cid` 负责 mounted 节点 inspect / registry bridge
- `instancePath` 负责 repeated instance identity
- 值和 field validation state 仍按运行时绝对路径寻址

这一分层应保留，不要合并成一个万能 id。

## 为什么还需要补一层说明

当前复合字段实现里，路径绑定主要靠 prefix proxy 完成。

典型现状：

- `object-field` 用 prefixed form/store proxy
- `variant-field` 用 prefixed form/store proxy
- `array-field` item 用 item form/store proxy

这套做法能工作，也符合当前架构，但有两个问题：

1. path remap 逻辑分散在多个控件里
2. 容易让人误以为 proxy 是新的 owner/runtime，而实际上很多时候只是同一 owner 上的局部视图

因此，当前最值得补强的不是新的 runtime 大抽象，而是：

- 明确索引职责
- 显式化路径绑定服务

## 现有职责边界

### 1. `templateNodeId` / `templatePath`

负责回答：

- 这是哪个编译节点？
- 这是哪段模板结构？

不负责：

- mounted lookup
- 值写回地址

### 2. `cid`

负责回答：

- 当前 mounted 的 live node 是谁？
- debugger / registry / DOM bridge 该找谁？

不负责：

- repeated item continuity
- 值路径寻址

### 3. `instancePath`

负责回答：

- 当前节点属于哪个 repeated live instance？

不负责：

- 直接作为值地址
- 替代 owner root path

`instancePath` 是 repeated identity，不是值传输协议。

### 4. owner 已知前提下的运行时绝对路径

负责回答：

- 值存在哪里？
- `errors` / `touched` / `dirty` / `validating` 存在哪里？

例如：

- `profile.firstName`
- `items.3.name`

这里的“绝对路径”指：在当前 owner 已知前提下、相对其 owning scope address space 的 canonical field key。

它不是跨所有 owner/runtime 的全局统一地址。

## 为什么不建议 `setValue(name, value, instancePath)`

表面上看，这好像能避免 prefix 包装。

实际上不行，因为 `instancePath` 只说明“这是哪个 repeated instance”，它并不能单独回答：

1. 当前值属于哪个 owner
2. root path 是什么
3. 是 parent live value 还是 child draft value
4. `rowKey` / `itemKey` 当前映射到哪个 index path

所以如果底层 API 改成：

```ts
setValue(name, value, instancePath)
getValue(name, instancePath)
```

那同样的 path 解析复杂度只是被藏进底层，而不会消失。

更合适的基线仍然是：

```ts
setValue(absolutePath, value)
getValue(absolutePath)
```

只是相对路径到绝对路径的转换，不要再散落在各个控件里手写。

## 建议补充：显式路径绑定服务（非规范草案）

建议新增一个轻量的路径绑定服务，用于替代大部分 prefix 包装逻辑。

这里的接口只是实现草案，不是新的 owner/runtime contract。

它当前只解决一类问题：

- path 与 ownerPath 的 rebasing

它不直接替代：

- projected `ScopeRef` wrapper
- projected `FormStoreApi` / `FormStoreState` 视图
- 未来 repeated template matcher

最小形态：

```ts
interface PathBindingContext {
  ownerRootPath: string;
  scalarValueAlias?: string;
}

interface PathBindingService {
  toAbsolute(relativePath: string): string;
  toRelative(absolutePath: string): string | undefined;
  owns(absolutePath: string): boolean;
}
```

例子：

对象字段：

```text
ownerRootPath = profile

toAbsolute('firstName') -> profile.firstName
toRelative('profile.firstName') -> firstName
```

数组 item：

```text
ownerRootPath = items.3

toAbsolute('name') -> items.3.name
toRelative('items.3.name') -> name
```

标量数组 item：

```text
ownerRootPath = tags.1
scalarValueAlias = value

toAbsolute('value') -> tags.1
toRelative('tags.1') -> value
```

这个服务的作用是：

1. 保留一个真实 owner
2. 把 path remap 从控件专属 proxy 中抽出来
3. 统一服务 value read/write、error projection、ownership 判断

## 现有 proxy 的共性

当前 `object-field`、`variant-field`、`array-field` 的 form/store proxy 虽然实现细节不同，但核心动作基本一致：

| 场景 | 当前做法 | 共同点 | 适合收敛到的能力 |
| --- | --- | --- | --- |
| `object-field` | `prefix = profile`，把 `firstName` 映射到 `profile.firstName` | 相对路径转绝对路径；绝对错误投影回相对路径 | `PathBindingService` |
| `variant-field` | `prefix = current variant root`，把局部字段映射回 parent form | 相对路径转绝对路径；绝对错误投影回相对路径 | `PathBindingService` |
| `array-field(item)` | `prefix = items.3` 或标量 alias `value -> items.3` | 相对路径转绝对路径；绝对错误投影回相对路径；局部 ownership 判断 | `PathBindingService` + 可选 alias |

因此当前最合理的收敛方向不是新增 owner，也不是改写值 API，而是把这三类重复动作抽成统一的路径绑定能力。

需要注意：

- 当前 proxy 还顺带承担局部状态投影
- 因此 `PathBindingService` 只能替掉其中的 rebasing 部分，不能假设引入后所有 proxy 立即消失

## 三条并行轴

```text
编译结构轴
  templateNodeId / templatePath

live 实例轴
  cid / instancePath

值与校验轴
  ownerRootPath + runtime field path
  例如: items.3.name
```

对于 repeated item / table row 子字段：

- `instancePath` 说明它属于哪个 repeated live instance
- `items.3.name` 说明值和 field state 落在哪个 owner-local path
- 复合字段 proxy / path binding 只负责在 owner root 下做 path rebasing，不创建新的 runtime identity

## repeated path 的合理基线

当前仓库里，值路径和 validation path 仍按 index-addressed。

例如：

- `items.0.name`
- `items.1.name`

这和现有 owner doc 的推荐基线一致：

- object array 的 item continuity 按 `itemKey`
- 但值与校验 remap 仍按 index 处理

需要注意：当前 live `array-field` 实现里，item subtree continuity 仍主要是 index-based；`itemKey` 代表的是推荐演进方向，不是该 renderer 已经完全落地的现状。

因此，当前最合理的设计不是一次性引入完整的模板路径运行时系统，而是：

1. 保留 runtime indexed path 作为当前 canonical field-state key
2. 如果未来 repeated validation/value matching 成为真实痛点，再补 runtime-path 到 template-path 的 matcher

也就是说：

- 现在优先解决 path binding
- template path matcher 是后续精细化步骤，不是当前必须前置的大改造

## 可以进一步改进的点

在当前基线下，索引与 path 设计还可以继续优化，但不需要跳到新的总架构：

1. 先统一 path rebasing
   - 把 `object-field`、`variant-field`、`array-field` 中重复的 `prefixPath` / `mapPath` / `ownerPath` remap 收敛到一个共享 helper
2. 再优化 owner-local field state 索引
   - 当前 projected store 往往要扫描 parent `errors` / `touched` / `dirty` / `visited` / `validating`
   - 如果后续大对象字段、大数组、editable table 成为热点，更值得优先补的是 owner-local prefix bucket / prefix index，而不是先做复杂 template matcher
3. repeated matching 真成瓶颈时，再补独立 matcher
   - 建议是独立的 `TemplatePathMatcher` 一类 focused service
   - 不建议一开始就把它塞进最小版 `PathBindingService`

因此当前更合理的演进顺序是：

- `PathBindingService`
- owner-local prefix index
- optional `TemplatePathMatcher`

## 是否需要新的统一索引 runtime

不需要。

原因：

1. compiled 和 runtime 本来就分层明确
2. `cid`、`instancePath`、owner、scope 各自职责已经存在
3. 当前问题主要是路径绑定和 repeated matching 不够显式，不是 runtime family 不够统一

因此更合理的方向是：

- 保持现有大架构
- 在现有 runtime / validation / composite control 实现里补统一的 path-binding 逻辑
- 必要时再补 focused matcher，而不是再抽一个新的总控 substrate

## 建议落地顺序

1. 明确 `cid` / `instancePath` / 绝对值路径 / owner root path 的职责边界
2. 抽出通用 `PathBindingService`
3. 让 `object-field`、`variant-field`、`array-field` 逐步改用该服务，减少重复 prefix 包装代码
4. 只有当 repeated validation/value lookup 真正成为热点时，再补 runtime-path -> template-path matcher

## 如果目标是达到或超过 Formily 的性能

只靠把 prefix wrapper 换成 `resolvePath` 还不够。

要达到 Formily 级别，甚至在低代码框架场景里超过它，至少需要下面几类能力一起成立。

### 1. 保留现有大架构，不改成 Formily 的 field graph 中心模型

这点很重要。

Flux 当前的优势是：

- `compiled template`
- `runtime instance`
- `runtime owner`
- `scope`

边界更清楚，也更适合低代码 renderer/runtime 架构。

因此优化方向不应是抄 Formily 的整体运行时模型，而应是：

- 保留现有 owner/runtime/template 分层
- 在热路径上补足索引、rebasing、状态 patch 能力

### 2. 先解决 path rebasing 的重复实现

当前 `object-field`、`variant-field`、`array-field` 都在重复做：

- `prefixPath`
- 错误路径投影
- 局部 ownership 判断

这一步本身更多是收敛实现，而不是决定性性能优化。

但它是后续所有优化的前置条件，因为：

- 如果 rebasing 逻辑仍散落在各个控件里
- 后面很难稳定加入 prefix index、state patch、matcher cache

需要强调：

- `resolvePath` / `PathBindingService` 只是第一阶段
- 它解决的是 rebasing 重复实现，不是完整性能答案

### 3. 真正的性能关键：owner-local prefix index

当前复合字段的 projected store 往往要从 parent state 中扫描：

- `errors`
- `validating`
- `touched`
- `dirty`
- `visited`

这在大对象字段、大数组、editable table 中会形成明显热点。

因此比 `templatePath` matcher 更优先的优化是：

- 给 owner-local field state 增加 prefix index / prefix bucket

目标不是改变 canonical key，而是让这些操作从“扫描全表”变成“按前缀取子集”。

如果这一层做好，`object-field(profile)`、`array item(items.3)`、`variant-field(active branch)` 的局部视图成本会显著下降。

另一个低侵入的潜在优化试验点是：

- `ScopeStore` 已经发布 `ScopeChange.paths`
- 但当前 `useScopeSelector` 还没有利用这些变更路径对 selector 执行做预过滤

因此，如果未来为 selector 提供显式依赖 roots，或补一层专用依赖收集，那么在 React hook 层增加基于 `change.paths` 的预过滤，会是一条值得优先验证的小优化路线。

在这类前提成立之前，不能把 generic `useScopeSelector` 的预过滤视为可直接落地的既成方案。

### 4. 数组/重复结构必须做状态级 patch，而不只是 values 更新

Formily 在数组性能上强，不只是因为 path matcher，而是因为它在 insert/remove/move 时会同步 patch：

- field state
- 索引
- child cleanup

当前 Flux 已经有一部分基础能力：

- `form-runtime-array.ts` 会 remap
  - `errors`
  - `touched`
  - `dirty`
  - `visited`
  - `validating`
  - `validationRuns`
  - `pendingValidationDebounces`

这条路线是对的，而且是 Flux 最有希望快速追上 Formily 的地方。

需要特别注意：

- `rowKey` / `itemKey` 解决的是 repeated item continuity
- 它们不应直接替代 canonical value path 或 validation path

也就是说，更合理的方向是：

1. React key / repeated identity 用稳定 `rowKey` / `itemKey`
2. 值路径和 field validation state 仍按 index-addressed path 维护
3. insert/remove/move 时做状态 remap/patch

不建议把 canonical state key 直接改写成 `items.${rowKey}.name` 一类形式。

如果要进一步达到更强性能，数组/重复结构上的目标应该是：

1. 所有 owner-local field state 都有成体系的 remap/patch 协议
2. repeated item 的 runtime registration/index 也能一起 patch
3. 不依赖大范围重新扫描或整片 subtree 重建

### 5. repeated matcher 不是第一步，但最终会需要

如果未来要在这些场景里和 Formily 正面对比：

- 大 editable table
- 大对象数组
- 高频联动校验
- aggregate rule 很多的 repeated collection

那最终还是需要：

- runtime indexed path -> template field path matcher

但它应该建立在前面几层已经稳定之后。

原因：

1. 当前已知更高风险的热点不是 matcher 缺失，而是 rebasing 重复和 projected state 扫描；最终排序仍应以 editable table / object array 的 profile 结果为准
2. matcher 只有在 repeated rule lookup 成为真实热点时才值得进入热路径
3. 过早上 matcher，会把系统复杂度提高，但不一定先解决主要瓶颈

因此更合理的顺序是：

- `PathBindingService`
- owner-local prefix index
- array/repeated state patch protocol
- optional `TemplatePathMatcher`

### 6. 为什么这条路线有机会超过 Formily

Formily 的强项在：

- 细粒度响应式 field runtime 成熟
- 路径系统与字段索引成熟
- 数组/重复结构的状态 patch 深

但它的运行时中心仍然是 field graph / form runtime 本身。

Flux 如果把上面的几层补齐，理论上有一类场景可以反超：

- schema compile-once
- runtime instantiate-many
- owner 边界明确
- 渲染层、值层、surface 层不混用

在这些前提下，Flux 有两个潜在优势：

1. 编译结构和 runtime owner 已经分层，未来更容易把编译期结构信息直接前推到运行时专用索引，而不必像字段中心运行时那样主要依赖运行时字段索引/查询结构来恢复目标关系
2. page/form/surface/local draft 的 owner 边界更清楚，后续更容易做 owner-local 优化，而不是让所有状态都沉到一个 field graph 里

但这里还有一个前提：

- `renderer-runtime` 的 selective subscription
- `dependency-tracking` 的失效粒度

不能退化。

否则即使 path lookup 和 field-state index 足够快，局部写入仍可能触发过大的 composite subtree rerender，端到端体验仍不可能超过 Formily。

因此要把“超过 Formily”理解成四条轴同时成立：

1. render invalidation 粒度足够细
2. path rebasing / lookup 足够低成本
3. owner-local field-state index 足够强
4. repeated identity 与 state patch 足够稳定

也就是说：

- Formily 的强项是“今天已经很成熟的字段运行时”
- Flux 的潜力是“在编译模板 + owner runtime 清晰分层的前提下，把热路径专门优化到低代码框架真正需要的位置”

### 7. 判断标准

如果未来要说“已经达到或超过 Formily 的性能”，至少应该满足：

1. 复合字段局部视图不再依赖全量扫描 parent field state map
2. 大数组 / repeated collection 的 insert/remove/move 不再主要依赖重算和临时投影
3. repeated item / table row 的 identity、scope reuse、row-local invalidation 已稳定落地，而不是仍主要依赖 index continuity
4. repeated validation/value lookup 至少具备稳定的 focused matcher 或等价索引能力；这是 Flux 在 compile-once 架构下的专用优化方向，不是 Formily 现有 path matcher 的直接对应物
5. 大 editable table / row-local draft 场景下，owner-local update 和 revalidation 成本可控
6. unrelated path writes 不会触发过大的 composite subtree 或 row-wide rerender
7. 这些优化没有破坏当前 `compiled template` / `runtime owner` / `scope` 分层

如果只做到 `resolvePath`，还达不到这个级别。

需要注意：

- 当前 live `array-field` 仍主要按 index continuity 工作
- 因此在 repeated identity 这一条补齐之前，不能宣称已经达到上述级别

## 结论

当前架构总体是合理的：

1. 编译结构 identity、运行时实例 identity、值路径寻址已经基本分层正确
2. `cid`、`instancePath`、owner、scope 不需要再提升为新的总 runtime 抽象
3. 当前最值得改进的是路径绑定服务、owner-local prefix index、以及 repeated state patch，而不是大规模重做 identity 模型

一句话总结：

- 保留现有大架构
- 明确各类索引职责
- 用显式 `resolvePath` / `PathBindingService` 逐步替代散落的 prefix proxy
- 真正追上甚至超过 Formily，关键在 owner-local index 和 repeated state patch，而不是先引入更大的抽象

## 相关文档

- `docs/architecture/template-instantiation-and-node-identity.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/composite-value-owner-clean-slate.md`
- `docs/architecture/array-field.md`
- `docs/architecture/table-row-identity-and-scope-performance.md`
