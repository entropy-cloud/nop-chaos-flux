# Form External Publication And Reserved Bindings

## Purpose

本文定义 `form` 的最终有效设计，回答以下问题：

- `form.name` 代表什么
- form 内部如何读取 values 和 status
- form 外部如何读取 status 和 values
- 为什么这些职责必须分离
- 为什么不采用隐式 `formName.*` 或全局开关

本文只描述当前应采纳的设计，不记录历史方案或过渡实现。

## Position

- `docs/architecture/frontend-programming-model.md` 拥有顶层 primitive / boundary precedence
- `docs/architecture/data-domain-owner.md` 拥有 owner read facet / publish facet 的高层规则
- `docs/architecture/scope-ownership-and-isolation.md` 拥有 scope visibility / isolate 规则
- `docs/architecture/form-validation.md` 拥有 validation owner 与 field companion state 语义
- `docs/architecture/field-binding-and-renderer-contract.md` 拥有 editable field `name` 的绑定规则
- 本文只收口 `form` 作为 owner 时，对内读取与对外发布的正式边界

## Core Claim

`form.name` 是 **form owner identity**。

它不是：

- 普通 field value binding
- 内部 values alias
- 自动 external publication path

`form` 的正式设计应分成四个不同概念：

1. owner identity
2. owner-local value reads
3. owner-local status reads
4. external publication

## Final Contract

### 1. `form.name`

`form.name` 的职责只有一个：

- 标识当前 form owner

用途：

- owner identity
- component / lifecycle / debugging / status summary 中的标识信息

不承担：

- 内部 values 读取入口
- 外部 values 发布路径
- 外部 status 发布路径

### 2. In-form Values

form 内部 values 读取统一使用字段 `name`。

示例：

```yaml
type: form
body:
  - type: input-text
    name: username
  - type: text
    text: ${username}
```

规则：

- field `name` 是唯一推荐的 in-form value binding 入口
- form 内部不引入第二套 values alias
- 普通 authoring 不使用 `formName.*`

### 3. In-form Status

form 内部 status 读取统一使用 `$form`。

示例：

```yaml
type: form
body:
  - type: text
    text: ${$form.valid}
```

`$form` 用于只读摘要，例如：

- `submitting`
- `validating`
- `dirty`
- `touched`
- `visited`
- `hasErrors`
- `errorCount`
- `valid`
- `invalid`

`$form` 不是 values 对象，不暴露底层 store 或方法。

### 4. External Status Publication

form 外部若需要读取当前 form 的 status summary，使用 `statusPath`。

示例：

```yaml
type: form
statusPath: ui.profileFormStatus
```

外部读取：

```yaml
type: text
text: ${ui.profileFormStatus?.valid}
```

`statusPath` 的职责：

- external readonly summary publication
- 面向 parent / sibling / shell / page-level observers

### 5. External Values Publication

form 外部若需要读取当前 form values，不使用 `form.name`。

使用显式：

- `valuesPath`

示例：

```yaml
type: form
valuesPath: ui.profileDraft
```

语义：

- external readonly values snapshot publication
- 与 `statusPath` 分离
- 明确作者意图

## Common Principle Across Owners

本仓库所有 owner 的发布设计都遵循同一原则：

**内部读取与外部发布必须分离。**

### Read Facet

read facet 解决：

- owner subtree 如何读取内部值和内部状态

对 form：

- values -> field `name`
- status -> `$form`

### Publish Facet

publish facet 解决：

- owner 外部节点如何读取 owner summary 或 values

对 form：

- status -> `statusPath`
- values -> `valuesPath`

## Why The Split Matters

如果不分离，就会出现一个字段承担多种职责的混乱设计。

例如若把 `form.name` 同时解释成：

- owner identity
- values alias
- external values publication path

会造成：

1. 概念混乱
2. authoring 歧义
3. scope boundary 模糊
4. 更难定义 reactive contract
5. 更容易继续膨胀到 field companion state publication

因此：

- identity 不等于 value binding
- value binding 不等于 external publication

## Why `formName.*` Is Not Chosen

不采用 `formName.*` 作为正式设计，原因如下：

1. form 内部已经有更直接的 value read 模型：字段 `name`
2. `formName.*` 会制造第二套 values 读取方式
3. 它会自然诱导出 form 外 sibling 也应可读的误解
4. 它把 owner identity 和 values binding 混在一起

因此正式设计中：

- 不定义 `formName.*` 为推荐 authoring
- 不定义 `formName.*` 为 external reactive contract

## Why No Global Switch Or Environment Flag

不采用：

- global switch
- release flag
- environment flag

原因：

1. 同一 schema 在不同环境行为不同
2. contract 不清晰
3. 调试困难
4. publish 语义不应退化成环境魔法

如果未来需要 form 外 values publication，应通过 schema 显式声明，而不是通过运行环境打开隐式能力。

## Field Companion State Visibility

field companion state 包括：

- `errors`
- `dirty`
- `touched`
- `visited`
- `validating`

正式规则：

- 它们属于 form / validation owner 内部状态
- 不默认暴露给 form 外部节点
- 外部只能读摘要，不直接读字段级伴随对象

因此不采用：

```text
userForm.username.$state.errors
```

如果未来确有外部字段级诊断需求，也应通过显式 projection/export 定义窄 DTO，而不是泄漏内部 owner 结构。

## Comparison With Other Owners

### Data-source

`data-source` 已经形成明确分层：

- `name` -> 主 value publication
- `statusPath` -> readonly summary publication

### Form

`form` 应采用对称但不完全相同的设计：

- `name` -> owner identity
- in-form values -> field `name`
- in-form status -> `$form`
- external status -> `statusPath`
- external values -> `valuesPath`

不同点在于：

- `data-source.name` 是外部主值发布
- `form.name` 不是

这不是不一致，而是因为二者的 owner role 不同：

- data-source 本身承担值发布
- form 本身承担局部编辑与提交/验证 owner 职责

## Comparison With AMIS React 19

AMIS 的 form/value 模型更偏向：

- 统一 data 链
- `getValueByName(...)`
- `canAccessSuperData`

这使它更容易形成隐式跨层读值。

Flux 不采用这一路线。

Flux 的正式设计更强调：

- owner boundary
- explicit publication
- local read facet 与 external publish facet 分离

因此即使 AMIS 允许更宽松的上层/跨层值可见性，Flux 也不应因此把 `form.name` 扩张成 values publication contract。

## Options Not Chosen

### Option A: `form.name` 兼做 values alias

不选，因为：

- 重复 value read 模型
- 模糊 identity 和 binding
- 易诱导 sibling visibility 误读

### Option B: `form.name` 自动 external publication

不选，因为：

- read facet 与 publish facet 混淆
- 默认 public API 太宽
- reactive contract 边界不清晰

### Option C: global switch / flag

不选，因为：

- 环境差异会破坏 schema contract
- 调试与文档成本高

### Option D: `publishWhen`

当前不选，因为：

- 它把“发布内容”和“发布时机”耦合到一起
- 会立刻引出 submit-success / validate-error / reset / initial publish 等额外 policy 问题
- 这些需求可以先由 form lifecycle actions 表达

因此当前推荐：

- 要么 `statusPath`
- 要么 `valuesPath`
- 不额外引入 `publishWhen`

## Quick Contract Table

| Mechanism                               | Scope                    | Meaning                                                |
| --------------------------------------- | ------------------------ | ------------------------------------------------------ |
| `form.name`                             | owner identity           | identify the form owner                                |
| direct field-name reads (`${username}`) | form subtree             | preferred in-form values read                          |
| `$form`                                 | form subtree / lifecycle | owner-local readonly status summary                    |
| `statusPath`                            | external scope           | explicit readonly external status publication          |
| `valuesPath`                            | external scope           | explicit readonly external values snapshot publication |

## Current Recommendation

最终采用的设计是：

- `form.name` = owner identity
- form 内部 values = direct field-name reads
- form 内部 status = `$form`
- form 外部 status = `statusPath`
- form 外部 values = `valuesPath`

不采用：

- `formName.*`
- automatic sibling-wide reactivity
- global switch / environment flag
- `publishWhen`
