# Org Data Source Protocol

> Status: active owner doc
> Last Reviewed: 2026-09-25
> Sources: `docs/backlog/missing-components-and-designer-roadmap.md` §5（L2.0）；`docs/analysis/visual-quality/2026-09-24-missing-component-gap-analysis.md` §4 P1 / §8 Wave N1；`docs/architecture/renderer-env.md` §3.6 / §4

## 1. 定位与适用面

本协议是 **org 族 renderer 的数据面唯一契约**：凡以「组织架构/人员/行政区划」这类服务端拥有的层级数据为数据源的表单控件，其 schema 数据源字段、请求 scope 变量、响应 envelope、分页与回显语义都以本文为准。

首批消费方（roadmap 暂定名，最终 type 名以各实现计划命名 pass 为准，本协议对 type 名不敏感）：

| Renderer            | 数据形态             | 消费的操作                        |
| ------------------- | -------------------- | --------------------------------- |
| `user-select`       | 人员（挂在部门树下） | children / search / resolve       |
| `department-select` | 部门树               | children / search / resolve       |
| `region`            | 省市区层级           | children / resolve（search 可选） |

后续若出现同类 org 数据控件（如多租户组织树、角色组），直接复用本文，不得另立请求/响应形状。

协议只约定 **schema 层数据契约与消费端解析语义**；连接器实现（真正发 HTTP 的 action）是 host/后端职责，经既有 action 通道执行，不经本协议。

## 2. 为什么不扩 `RendererEnv`（INV-2 裁定）

org 数据获取满足 **A 档「用现有 env 能力组合」**（`renderer-env.md` §4）：

- 数据到达通道就是「dispatch 一个 `ActionSchema`」——action 内部由 host fetcher / 连接器完成 IO，渲染器不感知 transport（INV-1 已禁止渲染器直调 `fetch`）。
- 业务连接器（自家 HR 网关、多租户租户路由）走 B 档 `env.importLoader` + `xui:imports` 注入，注入的 action 与本协议形状解耦。
- 不满足 C 档任一必要条件：org 数据不是 host transport boundary 系统调用，且已被 action 通道优雅覆盖。

因此本协议 **不新增任何 `RendererEnv` 字段**。渲染器对数据的全部访问都经由：

```ts
helpers.dispatch(actionSchema, { scope: requestScope, signal });
```

先例：`packages/flux-renderers-form/src/renderers/use-select-remote-search.ts`（select 远程搜索）。

## 3. `OrgNode` 规范形状

```ts
export interface OrgNode {
  /** 节点唯一 id（稳定、在树内不重复；接受 string | number，消费端统一 String() 化） */
  id: string;
  /** 展示名 */
  name: string;
  /** 节点类型；org 族建议取值 'user' | 'department' | 'region'，协议不枚举封闭 */
  type?: string;
  /** 禁选（如离职人员、停用部门）；禁选节点仍参与层级展示与路径回显 */
  disabled?: boolean;
  /** 禁选原因提示 */
  disabledTip?: string;
  /**
   * 懒加载提示：true = 叶子（不得再发起 children）；
   * false / 缺省 = 未知，展开时必须尝试 children（空响应按 §5 终止）
   */
  leaf?: boolean;
  /** 内联子节点（非懒加载数据源直接给全量树） */
  children?: OrgNode[];
  /** 透传附加数据（avatar、title、pinyin、adPath、租户扩展字段……），消费端仅按需读取 */
  extra?: Record<string, unknown>;
}
```

**混合树的可选语义**：树中可能混有非本 renderer 目标类型的节点（如 user-select 树里的 department 节点）。规则：非可选类型节点正常参与层级展示与路径回显，但不可选中；各 renderer 的可选类型集合由其 schema 字段声明（如 `selectableTypes`，取值不封闭：user-select 默认 `['user']`、department-select 默认 `['department']`、region 默认全层级可选）。协议只约定「展示可选、路径参与」这条规则，不封闭类型枚举。

### 3.1 宽容解析规则

服务端返回的节点进入渲染器前必须经过**唯一共享 normalizer**（实现随首个消费 renderer 落地，后续 renderer 一律复用，禁止各自 fork 解析逻辑——QA.3 零分叉验收对象）：

1. **别名**：`label` → `name`，`value` → `id`；`id` 与 `value` 同给时以 `id` 为准，`name` 与 `label` 同给时以 `name` 为准。
2. **缺失容错**：`id` 与 `value` 均缺失时以 `name`/`label` 字符串作为 id（静态小数据集场景）；`name` 缺失时以 `String(id)` 回退。两者皆缺失的节点丢弃。
3. **类型宽容**：`disabled` 仅在严格 `=== true` 时生效（对齐 `ChoiceOption` 语义）；`leaf` 仅接受 boolean；非对象条目丢弃；整个响应不是数组、或带 `nodes` 键但 `nodes` 不是数组时，一律按空结果处理（不抛错）。
4. **未知字段**：规范字段之外的一切字段收拢进 `extra`，不散落在节点顶层——消费方只允许依赖规范字段 + `extra`。
5. **子节点递归**：`children` 逐条递归应用同样规则；非数组的 `children` 视为缺省。

## 4. 三类操作契约

数据源以 **三个独立 schema 字段**表达，每个都是一个标准 `ActionSchema`（复用 `xui:actions` 全部能力：`api`/`adapter`、错误分支、`xui:import` 连接器）：

| schema 字段      | 语义                     | 何时派发                           |
| ---------------- | ------------------------ | ---------------------------------- |
| `sourceChildren` | 懒加载某节点的一层子节点 | 首次展开（根加载）或展开未加载节点 |
| `sourceSearch`   | 关键字检索（平铺结果）   | 搜索框输入（300ms debounce）       |
| `sourceResolve`  | 已选值 → 节点回显解析    | 初始化回显、表单回填、跨页恢复     |

三者均 optional：缺哪个就禁用对应交互（§7 降级）。

### 4.1 请求 scope 变量

每次派发通过 `helpers.createScope(patch)` 注入临时变量（先例：`use-select-remote-search.ts` 的 `searchQuery`）：

| 操作                  | 注入变量                                  | 说明                                                                                              |
| --------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| children              | `orgNodeId: string`（根加载为 `''`）      | 被展开节点 id                                                                                     |
|                       | `orgDepth: number`（根加载为 `0`）        | 期望返回层的深度（children 层的深度），region 分级取数依赖它                                      |
| search                | `searchQuery: string`（trim 后）          | 与既有 select 远程搜索同名同义，**不得另起名**                                                    |
| resolve               | `orgValues: string[]`                     | 待解析的已选值数组（单选场景为长度 1 数组）                                                       |
| children、search 共用 | `orgPage: number` / `orgPageSize: number` | 1 起始页码；pageSize 由渲染器 schema `pageSize` 决定，默认 50；两类操作的翻页请求都必须注入（§5） |
| 通用                  | `extraParams` 求值结果（§6）              | 多租户/场景参数逐键注入同一 scope                                                                 |

变量名是契约的一部分：连接器端按这些名字取参，消费端渲染器按这些名字注入。任何一方改名都构成协议破坏。

### 4.2 响应 envelope

action 成功后，消费端读取 `ActionResult.data`（`packages/flux-core/src/types/actions.ts`）。`data` 接受两种形状：

```ts
/** 规范形状 */
export interface OrgNodePage {
  nodes: OrgNode[];
  /** 全集总数（可选；供「共 N 项」提示与分页终止推断） */
  total?: number;
  /** 服务端显式续页开关（可选） */
  hasMore?: boolean;
}
/** 宽容形状：顶层裸数组 ≡ { nodes: array } */
```

- 裸 `OrgNode[]` 等价于 `{ nodes: [...] }`（`total`/`hasMore` 视为缺省）。
- 其余键形状（如 `{ list: [...] }`、`{ data: { nodes } }` 嵌套）**不在契约内**，由连接器的 `adapter` 负责改写成规范形状——协议不在消费端做第二层猜测。
- `result.ok === false` 或派发抛错走 §7 错误通道，不产生节点。

## 5. 分页语义与终止规则

`sourceChildren` 与 `sourceSearch` 均受分页语义约束（resolve 一次性返回）：

- children 与 search 的翻页请求都注入 `orgPage` / `orgPageSize`（§4.1）；请求翻页时 `orgPage` 递增，渲染器合并既有结果 + 新页（按 `id` 去重，后者覆盖前者）。
- **加载终止**（停止继续取数）按以下顺序判定，命中即停：
  1. `hasMore === false`；
  2. `hasMore` 缺省且 `total` 存在，且已加载条数 ≥ `total`；
  3. 返回 `nodes` 为空页（空页终止：任何空响应都视为没有更多数据）；
  4. 新页去重后零新增 `id`（护栏：服务端漏发 `hasMore`/`total` 且重复回放同页时防止无限循环）。
- `leaf === true` 的节点不再发起 children 请求（请求前短路，不发空查询）。
- children 的 `hasMore` 表示「该节点同层还有下一页」，与树展开器内部分页 UI（如有）解耦。
- **根加载时机**：children 根层（`orgNodeId: ''`）在选择器首次呈现时拉取（弹层形态=首次打开弹层；内联形态=首次激活；一律 lazy，不在挂载时预取）；静态 `options` 存在时根层不拉取（§7 混合规则）。
- **空页缓存**：children 返回空页后该节点标记为「已加载（空）」，再次展开不重发；重新取数仅经显式刷新动作触发。

## 6. `extraParams`：表达式求值与多租户注入

```ts
/** org 族 schema 公共字段 */
extraParams?: Record<string, SchemaValue>;
```

- 字符串值视为**表达式**，在派发时刻对 **renderer 所属表单 scope** 求值（`helpers.evaluate`）——不是被展开树节点的上下文；需要节点上下文的连接器用 `orgNodeId` 自行取参。非字符串值原样透传。
- 求值结果逐键注入请求 scope，与 §4.1 操作变量并存（键冲突时 `extraParams` 覆盖操作变量——schema 作者显式选择的行为）。
- 典型用途：`{ "corpId": "${tenantId}", "scene": "approval" }`。多租户路由、审批场景标记等由 host 通过表单数据 + 表达式提供，协议不设专用租户字段。

## 7. 错误与降级

| 场景                                    | 行为                                                                                                                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sourceChildren` 缺失                   | 仅支持静态 `options`（schema 内联 `OrgNode[]`，经同一 normalizer）；无展开交互                                                                                                                                                                         |
| `sourceSearch` 缺失                     | 不渲染搜索框；本地静态 options 内做大小写不敏感的 `name` 包含匹配（有 options 时）                                                                                                                                                                     |
| `sourceResolve` 缺失                    | 回显依赖会话内已加载节点缓存（echo 缓存，先例 `remoteEchoCache`）；缓存未命中显示原始值字符串                                                                                                                                                          |
| action `result.ok === false`            | 不抛异常；渲染器内联错误态 + 重试入口，错误文案走 §9 固定的 `flux.form.org*Failed` i18n 键（沿用 `flux.form.searchFailedDetail` 的 cause 文本插值模式）                                                                                                |
| 派发抛错（网络/连接器异常）             | 同上，视为失败而非崩溃                                                                                                                                                                                                                                 |
| abort（换词/换节点/卸载）               | `AbortSignal` 取消前次派发；`AbortError` 静默吞掉，不进错误态（先例：`use-select-remote-search.ts`）                                                                                                                                                   |
| 静态 `options` 与 `sourceChildren` 并存 | options 中的节点作为已加载子树直接展示——带 `children` 或 `leaf: true` 的 options 节点视为已加载，不再派发；childless 且未标 `leaf` 的 options 节点仍按 §3 规则尝试 children，返回节点按 `id` 去重合并（后者覆盖前者）；不在 options 中的节点正常懒加载 |
| 静态 `options` 与 `sourceSearch` 并存   | schema 字段 `searchMergeMode: 'append' \| 'replace'` 裁决（默认 `'append'`，对齐 select 先例 `packages/flux-renderers-form/src/schemas.ts:158`）：`append` = 静态命中项在前、远程结果按 `id` 去重跟随后；`replace` = 有搜索词时仅展示远程结果          |
| `resolve` 结果处理                      | resolve 成功后节点写入 echo 缓存；回显优先命中 echo 缓存（命中即不派发），仅对未命中值派发 resolve；结果按 `orgValues` 顺序对位返回，未解析值以原始值字符串回显，不进错误态                                                                            |

## 8. 与既有 select 数据通道的一致性与边界

| 通道                                                                                                                                                                                                                                     | 关系                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| select `searchSource`                                                                                                                                                                                                                    | org 协议的 `sourceSearch` 复用其全部机制（ActionSchema 派发、`searchQuery` 变量、300ms debounce、echo 缓存、失败文案模式）；差异仅在响应按 `OrgNodePage` 解析与 normalizer 共享。字段名刻意用 `sourceSearch`（`source` 前缀族）与 select 的 `searchSource` 区分——两者是不同 schema 字段，L2.1 schema 文档须显式警示这组近似异位词 |
| `input-tree` 懒加载通道（`childrenSource: TreeSourceConfig` + `deferChildren` + `${expandedNodeValue}`，经 `executeTreeSource` 封装的 `helpers.dispatch` + 一次性子 scope——刻意不经 `helpers.executeSource`，因后者不透传 caller scope） | **不复用、不混用**：该通道是通用树的既有能力（无分页/搜索/回显解析/normalizer 契约，变量与懒标记词汇均不同）。org 族 renderer 一律走本协议，使 user-select / department-select / region 三者数据面共享同一套实现（本协议存在的目的）；通用树场景继续用 `input-tree` 原通道，两者互不迁移                                          |
| `env.loadDict(name)`                                                                                                                                                                                                                     | **不适用**于 org 族：静态字典无层级懒加载/分页/搜索语义。小体量静态部门表可用 loadDict 拉取后交给静态 options，但那是 host 的选择，不构成协议分支                                                                                                                                                                                 |
| `SourceSchema`/`data-source` 组件                                                                                                                                                                                                        | org 族数据源是 **renderer 自有 schema 字段（ActionSchema）**，不是独立 `data-source` 节点；`initFetch` 等词汇不进入 org 协议                                                                                                                                                                                                      |

## 9. 消费方清单与零分叉验收

- **共享实现模块**（随首个消费 renderer 落地，模块内一次性固定）：normalizer（§3.1）、envelope 解析（§4.2）、scope 变量注入（§4.1）、分页终止判定（§5）、错误 i18n 键——键名固定为 `flux.form.orgChildrenFailed` / `flux.form.orgSearchFailed` / `flux.form.orgResolveFailed`（沿用 `flux.form.searchFailedDetail` 的 cause 文本插值模式）。
- **L2.1**：`user-select` / `department-select`（暂定名）——两 renderer 必须共用上述共享模块；允许呈现层（弹窗形态、单/多选）不同，**不允许**出现第二份 envelope 解析、第二套变量名、第二套错误文案键族。
- **L2.2**：`region`（暂定名）——同样消费共享模块；region 的省市区分级即 `orgDepth` 语义，不得为分级另立字段。
- **QA.3 验收口径**：三个 renderer 的数据面代码经审计——envelope 解析、变量注入、分页终止、错误降级各只有一份实现（共享模块），即「零分叉」。

## 10. 与其他 owner doc 的关系

| 关注点                                          | 看                                                      |
| ----------------------------------------------- | ------------------------------------------------------- |
| env 字段全集与 INV-2 扩充流程                   | `docs/architecture/renderer-env.md`                     |
| action 派发与 `ActionResult`                    | `docs/architecture/action-scope-and-imports.md`         |
| fetcher / host transport                        | `docs/architecture/api-data-source.md`                  |
| ApiResponse envelope                            | `docs/architecture/api-response-envelope.md`            |
| 渲染器 hooks（dispatch/createScope 的消费方式） | `docs/architecture/renderer-runtime.md`                 |
| 组件契约（各 renderer design.md）               | `docs/components/<type>/design.md`（随 L2.1/L2.2 交付） |
