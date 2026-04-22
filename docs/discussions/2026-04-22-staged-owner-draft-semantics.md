# Staged Owner Draft Semantics Discussion

## Purpose

本文记录一个跨 `form` / `dialog` / `row` / `detail-*` 场景的统一讨论：

- 如果未来引入 `DraftScope` 类概念，最好的抽象边界应该是什么
- 哪些场景只是普通 scope 或 surface，不应被误建模成 draft
- staged editing 的输入同步、输出提交、校验归属、row identity 应如何统一

这是一份讨论稿，不是当前规范性架构文档。

## Current Baseline

当前仓库已经存在一条明确但局部的 staged editing 基线：

- `detail-field` / `detail-view` 打开时创建局部 draft form
- draft 内部独立编辑
- confirm 时执行 `validateAll()` -> `validateValueAction` -> `transformOutAction` -> 写回父 owner
- cancel 时直接 `dispose()` 丢弃 draft

这说明当前问题已经不是“是否需要局部草稿”，而是“是否要把这套语义提升为跨 owner family 的共享基底”。

## Core Claim

最好的设计不是把 `DraftScope` 定义成“又一个 scope 类型”。

最好的设计是引入一个更高层的统一概念：**Staged Owner**。

`DraftScope` 若存在，应只是 `Staged Owner` 的内部实现载体之一，而不是作者和架构讨论的主要中心词。

如果完全不考虑历史兼容性，从零开始设计，我会再往前收敛一步：

- 真正的一等原语不是 `DraftScope`
- 也不是 `ValidationScope`
- 而是 **Data Domain Owner**

`ValidationScope` 和 `Staged Owner` 都应被视为 Data Domain 的 facet，而不是平行的顶层体系。

原因：

- 真正需要统一的不是“有没有一个新 scope”
- 而是局部编辑 owner 与外部状态之间的同步契约
- 以及 confirm / cancel / validate / conflict / row retarget 这些 owner-level 语义

因此推荐心智模型是：

```text
Staged Owner =
  local editable state
  + ingress policy   (external -> local)
  + egress policy    (local -> external)
  + validation ownership
  + commit/discard lifecycle
  + identity / conflict policy
```

从零设计时，更推荐把它放进更完整的模型里：

```text
Data Domain Owner =
  data state
  + read view (scope)
  + validation facet
  + edit/publish policy
  + lifecycle
  + identity/conflict policy
```

## Zero-Baseline Architecture

如果项目从零开始重做，最佳设计应是：

1. 先定义 Data Domain Owner
2. `scope` 只是该数据域的读取视图
3. `validation` 直接挂在数据域上
4. `staged/live` 是该数据域的编辑发布模式
5. `dialog` / `drawer` 只是 surface，不拥有业务数据本身

也就是说：

- `form domain`
- `detail editor domain`
- `row editor domain`
- `filter panel domain`
- `wizard step domain`

都应被视为独立的数据域实例。

它们都可以有自己的 validation。

不同点不在于“有没有 validation”，而在于：

- 外部数据如何进入该域
- 本域修改何时对外发布
- 是否存在 confirm / cancel
- 是否需要 conflict / retarget 语义

## Relationship Between Validation Scope And Staged Owner

从零设计时，两者不应是并列的顶层概念。

更合适的关系是：

- `Validation Scope` = Data Domain 的校验能力面
- `Staged Owner` = Data Domain 的编辑/提交流程面

所以：

- 每个数据域都应有自己的 validation
- 不是每个数据域都必须 staged
- staged 数据域通常拥有独立 validation
- live 数据域同样拥有 validation，只是发布策略不同

推荐关系图：

```text
Data Domain Owner
  ├─ Read View / Scope
  ├─ Validation Facet
  └─ Editing Mode
       ├─ live
       └─ staged
```

这也解释了为什么“validation 是挂在数据域上的”是对的。

最自然的 ownership 规则不是“哪个 React 节点是 form”，而是：

- 谁拥有这份数据
- 谁决定何时校验
- 谁保存 error / dirty / touched / validating
- 谁负责 commit / discard / submit

谁就是 validation owner。

## Why `DraftScope` Alone Is Not Enough

如果只说“创建一个新的 scope”，会立刻遇到以下未定义问题：

1. 初始值是只在打开时读取一次，还是持续从外部同步
2. 外部值变了，局部 draft 是否重置、重放、忽略、提示冲突
3. 内部修改是立刻写回外部，还是只在 confirm 时写回
4. draft 内的 validation / dirty / touched 是否独立
5. 父级 reaction 是否应该看到 draft 内的变化
6. row 编辑时，提交目标是 index 还是 rowKey 对应的当前记录

所以“新增一个 scope”只是实现细节，绝不是完整设计。

## Recommended Unified Model

### 1. Separate Owner Kinds From Draft Semantics

不要把 `form` / `dialog` / `row` / `detail-view` 混成一个“大 draft 类型”。

推荐保持现有 owner taxonomy：

- `form` 是 validation-capable semantic lifecycle owner
- `dialog` / `drawer` 是 surface owner
- `row` 是 collection owner 派生出来的 row-local owner context
- `detail-field` / `detail-view` 是 value-oriented staged owner

然后把 draft/staged 语义定义成这些 owner **可选择采用的一组策略**，而不是新的顶层 owner family。

### 2. One Shared Staged Contract, Multiple Concrete Owners

推荐统一抽象：

```ts
interface StagedOwnerContract {
  open(): void | Promise<void>;
  confirm(): Promise<StagedConfirmResult>;
  cancel(): void;

  readonly dirty: boolean;
  readonly validating: boolean;
  readonly canConfirm: boolean;
}
```

但不要求所有 concrete owner 都暴露完全相同的 author-facing schema。

例如：

- `detail-field` 的 confirm 目标是单个 `name`
- `detail-view` 的 confirm 目标可能是 `scopePath`、`updates`、或 `patch`
- row editor 的 confirm 目标必须经过 row identity resolve
- wizard step 的 confirm 目标可能只是提升到上层 staged owner，不一定立刻写回最终 form

### 3. Standardize Four Policy Axes

真正需要统一的是四类策略。

#### A. Ingress Policy: external -> local

推荐只保留三种基础模式：

1. `seed-on-open`
2. `sync-when-clean`
3. `rebase-on-conflict`

这三种本质上是在回答：

- 外部数据是只在初始化时使用一次
- 还是在 clean 状态下继续同步
- 还是在外部变更时触发重基/冲突处理

默认推荐：`seed-on-open`

原因：

- 最符合 confirm/cancel 场景的直觉
- 不会在用户编辑中途被外部更新覆盖
- 与当前 `detail-field` / `detail-view` 实现一致

不推荐把 `always-project` 当作 staged baseline。

那更像 live projection，不像 draft。

#### B. Egress Policy: local -> external

推荐只保留两种主要模式：

1. `commit-only`
2. `live-write-through`

必要时允许 owner-specific `publish-patch` 作为 `commit-only` 的特化输出，而不是第三套平行编辑模式。

默认推荐：`commit-only`

原因：

- 只要存在 confirm / cancel，就应优先采用 commit-only
- 否则 cancel 语义会被削弱甚至失真

`live-write-through` 应只用于 inline editor，不应伪装成 draft。

#### C. Validation Ownership

推荐规则：

- staged owner 默认拥有自己的局部 validation state
- 父 owner 默认不直接看到子 draft 的 field errors
- confirm 时由 staged owner 决定是否把错误摘要映射到父 owner

从零设计时，这一条应更明确表述为：

- 每个 Data Domain 都有自己的 validation facet
- child staged domain 与 parent domain 的 validation state 默认隔离
- 只有在 commit / publish 阶段，父域才消费子域的校验结论或提交结果

这与现有 `form-validation.md` 中“draft/detail/dialog validation boundaries”方向一致。

#### D. Identity / Conflict Policy

推荐按宿主场景区别：

- 普通 detail/dialog draft：默认无冲突检测，外部变化不自动重放
- row editor：必须有稳定 identity 目标，优先 `rowKey`
- 多方协作或长生命周期 draft：才进入 revision/conflict/replay-required 模型

不要把最重的 DraftSession 冲突协议强加给所有 staged owner。

## Scenario Decisions

### Form

`form` 是数据域，不是 draft。

`form` 是语义生命周期 owner，可以承载：

- 直接 live edit
- 局部 staged child owner
- 未来整表单 staged submit

推荐：

- 普通表单字段默认 live edit
- 局部复杂编辑器可嵌套 staged owner
- 不要把整个 `FormRuntime` 默认改造成 draft runtime

### Dialog / Drawer

`dialog` / `drawer` 不是 draft。

它们是 surface owner。

但 surface 内部可以承载一个或多个数据域 owner，其中某些数据域可以采用 staged 模式。

推荐：

- `open` / `close` 仍属于 surface owner
- `confirm` / `commit` 属于内部 semantic lifecycle owner 或 staged owner
- 不要把 surface state 和 draft lifecycle 压成一个 `dialogDraftState`

### Row

row editor 是最需要单独处理的场景。

推荐：

- row-local edit 若采用 staged 模式，提交目标必须按 `rowKey` 重定位
- 不应把提交目标冻结为旧 index
- row owner 负责把 local changes 应用到当前仍匹配该 `rowKey` 的记录
- 如果记录已消失或 shape 已变化到不可安全重放，应返回 reject / reopen-required

也就是说，row 场景的关键不是 draft 本身，而是：

- `rowKey` identity
- 提交目标重定位
- 与 table row scope isolation 的配合
- 以及 row domain 自己的 validation 与父 collection domain 的边界

### Detail Field / Detail View

这两个是当前最明确的 staged owner 基线。

推荐保持：

- `seed-on-open`
- `commit-only`
- local validation isolation
- confirm 时 `validate` -> `transformOut` -> writeback
- cancel 直接 discard

短期内不建议用更重的共享 draft substrate 替换它们。

## Best Practical Architecture

如果问“最好的设计方案是什么”，当前最实用、最稳的答案是：

1. 不把 `DraftScope` 作为新的顶层 author-facing 原语直接推广
2. 定义一个内部共享的 `Staged Owner` 语义框架
3. 当前默认策略固定为：
   - ingress: `seed-on-open`
   - egress: `commit-only`
   - validation: local isolated state
   - conflicts: only row/collaboration flows need stronger handling
4. `detail-field` / `detail-view` 继续作为第一批 concrete staged owners
5. row editor 若引入 staged 模式，必须先解决 `rowKey` retarget / reject 语义
6. dialog/drawer 继续只做 surface，不吸收 draft 生命周期
7. 只有当 wizard、row editor、detail owner、局部 subform 明确重复同一套生命周期时，才抽取共享 runtime substrate

如果完全不考虑历史包袱，这 7 条还应再收敛成一个更统一的架构原则：

1. 所有业务可编辑状态都属于某个 Data Domain Owner
2. 所有 validation 都挂在对应 Data Domain 上
3. live / staged 只是 Data Domain 的发布模式
4. scope 是读取视图，不是首要 ownership 单元
5. surface 只承载，不拥有业务数据

## Why This Is Better Than A Universal `DraftScope`

这种方案比“统一上一个 DraftScope”更好，原因是：

- 它不破坏现有 owner taxonomy
- 它能同时覆盖 form/dialog/row/detail，而不强迫它们变成同一类东西
- 它把最重要的差异点放在 policy，而不是名词
- 它允许从当前已经落地的 `detail-*` 模式渐进收敛
- 它把最复杂的 row conflict / retarget 问题留给真正需要它的 collection owner，而不是污染所有 draft 语义

## Suggested Next Questions

如果未来继续推进这个方向，建议按以下顺序讨论，而不是先实现统一 DraftScope：

1. staged owner 是否需要共享 status summary（例如 `dirty` / `confirming` / `validating`）
2. row staged editor 的 `rowKey` retarget / reject 结果模型
3. detail owner 与 future wizard 是否真的共享同一套 confirm/cancel/validate contract
4. 是否需要独立于 `FormRuntime` 的轻量 `ValidationScopeRuntime` 工厂，作为 staged owner 的更窄 validation substrate

## Provisional Conclusion

当前最好的方向不是“设计一个万能 DraftScope”。

当前最好的方向是：

- 保持 owner taxonomy 稳定
- 把 draft 视为数据域的 staged editing policy，而不是新的万能节点类型
- 以 `detail-field` / `detail-view` 为已落地 baseline
- 在 row editor / wizard / local subform 真正出现共享生命周期时，再提炼共享 substrate

这条路径既能覆盖 `form` / `dialog` / `row` 的差异，也能避免为了统一名词而过早统一实现。
