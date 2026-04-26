# Action Interaction State

## Purpose

本文档定义 action 执行相关的 `pending` / `loading` / `disabled` 交互状态应如何归属、暴露和消费。

它主要回答：

- button 点击后是否要自动 disabled / loading
- `select`、`radio-group` 一类控件在执行过程中是否要自动 disabled
- form、table、dialog、drawer、tabs、wizard 这类状态 owner 应如何分类
- 外部和内部分别如何读取状态

## Position

- `docs/architecture/action-algebra-formal-spec.md` 定义执行与分支语义。
- `docs/architecture/form-validation.md` 定义 form submit 的语义边界。
- `docs/architecture/api-data-source.md` 定义 producer/source 的状态发布边界。
- 本文档拥有 UI-facing interaction-state ownership 的统一规则。
- 对 surface family 的窄 owner 规则，以 `docs/architecture/surface-owner.md` 为准；本文只给出 taxonomy 和读取规则。

## Core Rules

1. 交互态不应从“某个按钮刚刚触发了一个 async action”这种事实里隐式推断。
2. correctness guard 由语义 owner 负责。
3. loading / disabled UX 也应优先由语义 owner 或显式 tracked operation 负责。
4. 总是优先选择最具体的自然 owner，而不是把子状态上卷到 `page`。
5. 外部读取 owner 状态优先通过显式 `statusPath`。
6. 内部只有在 subtree-local authoring 需求很强时，才增加只读保留绑定。
7. 不暴露 `$store`，也不允许把 `id` / `name` 当成隐式状态读取路径。
8. 对复杂宿主（designer/spreadsheet/report-designer），内部读取优先通过 `Host Projection`，外部摘要再通过 `statusPath` 发布。
9. owner-level async governance diagnostics 是 runtime/debugger 用的内部解释面，不等同于新的 author-visible interaction-state 绑定。

## Owner Taxonomy

| Owner kind | Typical examples | Owns what | External read surface | Local binding direction |
| --- | --- | --- | --- | --- |
| `Producer Owner` | `data-source`, options loader, autocomplete loader | `loading`, `ready`, `stale`, `error`, freshness | `statusPath` | usually none |
| `Semantic Lifecycle Owner` | `form submit`, future dialog confirm, future wizard step commit | `submitting`, `validating`, semantic success/failure/cancelled | `statusPath` | `$form` when subtree-local demand is strong |
| `Interaction Owner` | `table`, `tabs`, future wizard step switching | active/selected/current interaction state | optional `statusPath` | future `$table` / `$tabs` only if justified |
| `Surface Owner` | `dialog`, `drawer`, future sheet-if-surface | `open`, `active`, `opening`, `closing` | `statusPath` | prefer shared `$surface` over `$dialog` / `$drawer` |
| `Domain Host Owner` | `designer-page`, `spreadsheet-page`, `report-designer-page` | readonly host snapshot fields plus domain session summary | optional `statusPath` | internal reads use `Host Projection`, not `$designer` / `$spreadsheet` by default |
| `Shell Owner` | `page` | shell-level lifecycle such as initializing/refreshing/route readiness | `statusPath` | future `$page` only if page lifecycle becomes schema-visible |
| `Explicit Tracked Operation` | bulk delete, export, arbitrary async graph | tracked pending/result state for non-natural owners | explicit published summary path | none by default |

## Classification Heuristics

遇到一个新组件时，按下面顺序判断：

1. 它是否主要生产值或请求结果。
是的话，优先归 `Producer Owner`。

2. 它是否拥有明确的业务生命周期入口。
是的话，优先归 `Semantic Lifecycle Owner`。

3. 它是否主要维护当前选中项、当前步骤、当前分页、展开态这类 UI 交互状态。
是的话，优先归 `Interaction Owner`。

4. 它是否主要表现为一个弹层或浮层表面。
是的话，优先归 `Surface Owner`。

5. 它是否宿主化了一个 domain runtime/bridge，并通过固定 host scope + namespaced actions 暴露能力。
是的话，优先归 `Domain Host Owner`。

6. 它是否只是页面壳层本身。
是的话，才归 `Shell Owner`。

7. 如果以上都不自然，但仍需要作者可见的 pending/result。
这时才进入 `Explicit Tracked Operation`。

## Read Surfaces

统一规则：

- 外部读取：优先 `statusPath`
- 内部读取：仅在 subtree-local authoring 需求很强时提供只读保留绑定

当前与目标方向：

- `form` 内部：`$form`
- `form` 外部：`statusPath`
- `data-source` 外部：`statusPath`
- `table` 外部：如需摘要，使用 `statusPath`
- `crud` 外部：如需聚合读取 query + table interaction 结果，使用 `statusPath`
- `dialog` / `drawer` 外部：`statusPath`
- `dialog` / `drawer` 内部：如未来需要局部绑定，优先 `$surface`
- `designer-page` / `spreadsheet-page` / `report-designer-page` 内部：通过 `Host Projection` 读取固定宿主快照字段
- `designer-page` / `spreadsheet-page` / `report-designer-page` 外部：如需跨 region/宿主外部观察，只发布窄 `statusPath` 摘要
- `page` 内部：仅在 page lifecycle 真正 schema-visible 后再评估 `$page`

局部绑定规则：

- 不要默认给每个 owner 都增加 `$owner`
- 只暴露 readonly semantic summary
- 对共享同一状态模型的 owner family，应优先共用一个绑定名

## Naming Rules

- `statusPath`：owner-level readonly summary DTO 的发布路径
- `<axis>StatePath`：某一可写交互轴的持久化路径
- 二者不能互相替代

例子：

- `form.statusPath` -> 外部观察 form summary
- `table.selectionStatePath` -> 持久化可写 selection 轴
- `table.sortStatePath` / `table.filterStatePath` -> 持久化可写 sort/filter 轴
- `table.columnSettings.toggledColumnsStatePath` / `table.columnSettings.orderedColumnsStatePath` -> 持久化可写 visible-columns / ordered-columns 轴
- `crud.queryStatePath` / `crud.paginationStatePath` 等内部 owner path 只服务 renderer 与子 owner 协作，不替代 `statusPath`
- `tabs.valueStatePath` -> 持久化当前 active tab
- future `tabs.statusPath` -> 只读 tabs summary

## Canonical Scenarios

### Form Submit

form submit 是 `Semantic Lifecycle Owner`。

- 内部按钮：`${$form.submitting}`
- 外部 trigger：读取 form `statusPath`
- `component:submit` 只是触发入口，不是状态 owner

推荐 `FormStatusSummary`：

```ts
interface FormStatusSummary {
  id?: string;
  name?: string;
  submitting: boolean;
  validating: boolean;
  dirty: boolean;
  touched: boolean;
  visited: boolean;
  valid: boolean;
  invalid: boolean;
  hasErrors: boolean;
  errorCount: number;
  submitCount: number;
  lastSubmitStatus: 'idle' | 'success' | 'error' | 'cancelled' | 'timedOut' | 'validationError';
}
```

### Source-Backed Field Loading

source-backed `select` / `radio-group` / `checkbox-group` 的 options loading 属于 `Producer Owner`。

- 可以自动 disabled
- 可以显示局部 loading
- 阻塞的是该字段自己的 options 交互，而不是一个通用 action graph

### CRUD And Table

`CRUD` 不是一个单独的大 owner，而是多个 owner 的组合：

- 查询条件提交 -> `form`
- 列表数据加载/刷新 -> `data-source` 或 list query owner
- 表格分页/选择/排序/筛选 -> `table`
- 新增/编辑弹窗提交 -> 弹窗里的 `form`
- 批量动作 -> `Explicit Tracked Operation`

典型状态会并存：

- `searchFormStatus.submitting`
- `usersStatus.loading`
- `usersTableStatus.selectionCount`
- `bulkDeleteStatus.pending`

table loading 规则：

- rows loading 默认属于上游 query/source owner
- table 的 `loading` prop 只是消费该状态的 UI 投影
- table 自己拥有的是 selection、pagination、sort、filter、inline-edit draft 这类 interaction state

### Page, Dialog, Drawer

`page` 是 `Shell Owner`，只拥有 page shell 自己的状态，例如：

- `initializing`
- `refreshing`
- `route-ready` / `route-error`
- shell-level blocking overlay

`page` 不应直接拥有：

- 某个 dialog 的 open/close
- 某个 drawer 的 open/close
- 某个 form 的 submitting
- 某个表格 query 的 loading

`dialog` / `drawer` 是 `Surface Owner`，拥有：

- `open`
- `active`
- `opening`
- `closing`

如果后续某类 dialog/drawer 还需要 confirm/commit 生命周期，那是叠加在 surface 之上的 `Semantic Lifecycle Owner`，不应与 open-state 混成一份 summary。

### Domain Hosts

`designer-page`、`spreadsheet-page`、`report-designer-page` 不应简单归到 `Interaction Owner`。

更准确的分类是 `Domain Host Owner`：

- 它们内部承载 domain runtime / bridge
- 它们对内部 schema 片段暴露 readonly `Host Projection`
- 它们对写方向暴露 namespaced actions

内部读取规则：

- 通过固定 host scope / `Host Projection` 读取 `doc`、`selection`、`runtime` 等字段
- 不暴露 core/store/bridge 对象给 schema

外部读取规则：

- 如果宿主外部也需要观测该 domain host 的状态，应通过显式 `statusPath` 发布一份窄摘要 DTO
- 不应把整份 host projection 提升为全局可见字段

因此：

- 内部 host 片段读取 = `Host Projection`
- 外部 schema 观察 = `statusPath`
- 写入 domain host = namespaced actions

### Tabs, Wizard, Sheet

`tabs` 属于 `Interaction Owner`。

- active item / active key / active index 属于 tabs 自己
- `valueStatePath` 负责可写 active 轴
- 若后续需要外部只读摘要，再补 `statusPath`

future `wizard` 应按组合 owner 处理：

- step switching -> `Interaction Owner`
- step commit / next-step validation -> `Semantic Lifecycle Owner`

future `sheet` 的规则不是按名字命名，而是先归类：

- 如果它本质是 dialog/drawer 一类弹层表面，归 `Surface Owner`
- 如果它更接近 tabs/panels 这类切换容器，归 `Interaction Owner`

不要因为名字不同就单独发明 `$sheet`。

## Quick Classification Table

| Component/domain | Recommended owner kind | Why |
| --- | --- | --- |
| `form` submit | `Semantic Lifecycle Owner` | validate -> submit -> success/error 业务管道 |
| `data-source` | `Producer Owner` | 生产值并发布 loading/error/freshness |
| source-backed `select` options | `Producer Owner` | owner 是 options producer，不是 select shell |
| `table` selection/pagination | `Interaction Owner` | 核心是局部交互状态 |
| `table` rows loading | `Producer Owner` upstream | 真正 owner 是 query/source |
| `tabs` active item | `Interaction Owner` | 核心是当前激活项切换 |
| future `wizard` step switching | `Interaction Owner` | 核心是当前步骤切换 |
| future `wizard` step commit | `Semantic Lifecycle Owner` | 核心是 next/commit/validate 业务入口 |
| `dialog` / `drawer` open state | `Surface Owner` | 核心是弹层表面开合 |
| `designer-page` host state | `Domain Host Owner` | 内部读面是 `Host Projection`，不是普通局部绑定 |
| `spreadsheet-page` host state | `Domain Host Owner` | 内部读面是 domain host snapshot，外部才是窄摘要 |
| `report-designer-page` host state | `Domain Host Owner` | 同时承载 domain snapshot 与 namespaced action boundary |
| `page` refresh/init shell state | `Shell Owner` | 核心是页面壳层生命周期 |
| bulk delete/export | `Explicit Tracked Operation` | 没有更自然的单一 owner |

## Auto-Disable Rules

| Surface | Owner-known state | Recommended auto disabled/loading | Why |
| --- | --- | --- | --- |
| form 内部语义 submit trigger | `$form.submitting` | Yes | correctness 与 UX 都属于 form semantic boundary |
| 外部 `component:submit` trigger | target form `statusPath` summary | Yes | owner 仍然是 form，不是 button |
| source-backed `select` / `radio-group` / `checkbox-group` | source `loading` | Yes | 阻塞的是字段自己的 options 交互 |
| generic button `onClick` arbitrary async graph | none | No | runtime 不应猜测主操作 |
| field `onChange` 触发的 arbitrary async action | none | No | 不应因为不相关异步链静默冻结字段 |

## Generic Trigger Controls

button 属于 trigger control，不属于 semantic owner。

因此：

- button 需要 `disabled`
- button 可以后续支持 `loading`
- 但 button 不应因为自己触发了一个 async action graph 就自动持有业务 pending state

button 上的 loading / disabled 只有两条稳定来源：

- semantic owner 暴露的状态，例如 `$form` 或 owner `statusPath`
- author 显式绑定的 tracked interaction state

## Tracked Operations

如果一个 generic action chain 需要作者可见的 pending / loading / disabled，应走显式 tracked operation，而不是推断。

方向上类似：

```ts
interface InteractionStateSummary {
  pending: boolean;
  status: 'idle' | 'pending' | 'success' | 'error' | 'cancelled' | 'timedOut';
  startedAt?: number;
  finishedAt?: number;
  lastResult?: ActionResult;
  error?: unknown;
}
```

原则保持不变：先显式标识 tracked operation，再暴露 UI state。

## Rejected Direction

不推荐：

- broad hidden auto-inference
- `$store` 作为公开 schema 读取面
- 单独发明 `publishScope` 作为与 `statusPath` 平行的新字段名
- 用 `page` 兜底所有子状态
- 因组件名字不同就膨胀 `$dialog` / `$drawer` / `$sheet` / `$wizard`

原因：

- hidden coupling：UI 行为依赖内部 action graph 细节
- unstable semantics：改 follow-up step 就可能改变 pending 结束时机
- poor composability：external trigger、toolbar、快捷键、host dispatch 很难共享同一规则

## Current Authoring Guidance

在 generic interaction-state 统一 contract 落地前：

- form submit correctness 依赖现有 duplicate-submit guard
- source-backed selector loading 依赖现有 source transient state
- 通用按钮如果需要 pending UI，不要假设 runtime 会自动提供；应由宿主或作者显式提供状态来源

## Related Documents

- `docs/architecture/action-algebra-formal-spec.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/api-data-source.md`
- `docs/components/button/design.md`
