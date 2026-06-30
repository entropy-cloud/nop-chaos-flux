# Dynamic Renderer 组件设计

## 1. 组件定位

- `dynamic-renderer` 是运行时装配 renderer，用来在已存在的 compile/runtime 模型之上接收一段动态 schema 并渲染。
- 它不是新的通用 DSL，也不是把任意业务逻辑搬回客户端组装的入口。

## 2. Flux 决策表（X5 扩展，E3）

> Flux 决策主语（不以 AMIS 为标尺）。AMIS 式组件级请求短路径不采纳——请求下沉 data-source + action（见 `docs/components/existing-components-improvement-analysis.md` §5）。`loadAction` 自身仍是 action（走 action graph），本组件只在其上加「何时触发」门控与「重新触发」句柄，不开新的请求短路径。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                                         | 采纳     | 不采纳 | 理由                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autoLoad?: boolean`（缺省 `true`，向后兼容）                | **采纳** | —      | 作者可控的 mount 自动加载门控。`autoLoad:false` 时 mount 不自动触发 `loadAction`，组件停留在 `body` region（或空态），等待 `component:refresh` 显式触发。模式对偶于 data-source 的 `initFetch: false`（`api-data-source-controller.ts:15-27` `resolveInitFetch`）。缺省 `true` 保持现状行为，无回归。 |
| `component:refresh` 句柄（X1 vocabulary `refresh`）          | **采纳** | —      | design.md §8 已承诺「可以提供 `component:refresh` 之类的重新解析能力」。调用时重新求值 `loadAction` 并触发 `loadSchema()`，abort 在途旧请求，返回 `{ok:true}` 或 `{ok:false, error}`。与 data-source 的 `component:refresh` 对偶（同一 vocabulary 词，按 `componentId` 寻址实例）。                   |
| amis 组件级 `api` / `initFetch` / `sendOn` / `interval`      | —        | 不采纳 | 分析报告 §5 明确拒绝：请求下沉 data-source + action，不在组件开短路径。本组件的 `loadAction` 仍是 action（走 action graph），`autoLoad` 只门控该 action 何时触发，`component:refresh` 只重新触发同一 action——二者都不是组件级请求短路径。`sendOn`/轮询归 data-source（X4）。                          |
| `fallback` / `empty` / `errorMode` / `onError` region        | —        | 不采纳 | 本节后续增强，非当前正式契约（见 §4/§8）。三态机（§7）已收口错误显示；本组件的 gate/refresh 不依赖这些 region。                                                                                                                                                                                       |
| `component:cancel` 句柄                                      | —        | 不采纳 | dynamic-renderer 已用 `AbortController` 在 cleanup/unload/`loadActionKey` 变化时 abort 旧请求；非数据轮询组件，无显式 cancel 句柄需求。data-source 的 `cancel` 是为轮询/订阅设计，本组件无对偶需求。                                                                                                  |
| `loadWhen?` 表达式 gate（类比 `sendOn`，作用于 schema 加载） | —        | 不采纳 | 当前 `autoLoad:false` + `component:refresh` 已覆盖「按需加载」场景；表达式 gate 需求出现后再加（见 Non-Blocking Follow-ups）。                                                                                                                                                                        |

**范围裁定**：这是 Flux 原生门控，不是 amis 组件级 api。`autoLoad`/`component:refresh` 与 X4 给 data-source 落地的 `initFetch: false` + `component:refresh` 是同一模式在不同 owner 上的投影。不含 `sendOn`/`interval`/轮询——dynamic-renderer 是 schema 装配组件，不是数据轮询组件。

## 3. Flux 中的 renderer/type 定义

- `type: 'dynamic-renderer'`
- `category: 'advanced'`
- `sourcePackage: '@nop-chaos/flux-renderers-basic'`
- 当前 regions: `body`

## 4. schema 设计

- 当前已落地的最小字段：`loadAction`、可选 `body`、可选 `autoLoad`。
- `loadAction` 负责获取最终 schema，`body` 用作宿主级补充内容或静态包裹区。
- `autoLoad?: boolean`（缺省 `true`，向后兼容）：mount 自动加载门控。`autoLoad:false` 时 mount 不自动触发 `loadAction`，组件停留在 `body` region（或空态），等待 `component:refresh` 显式触发；既不进入 loading 态，也不在 mount 时因「无 loadAction」报 required 错误（loadAction 可由后续 scope/refresh 提供）。
- `fallback`、`empty`、`errorMode`、`onError` 仍作为后续增强，不写成当前正式契约。

## 5. 字段分类

- `loadAction`: `prop`（C-02：声明为 `kind:'prop'`，编译期一次性把 `${}` 模板预编译进节点 propsProgram，prop channel 对当前 scope **reactive** 解析；renderer 消费 `props.props.loadAction` 的解析值。reload reactivity 经 `loadActionKey`（JSON 序列化）保留——scope 喂给 action 的数据变化时 prop channel 重新解析并触发 reload）。
- `autoLoad`: `prop`（`valueType: 'boolean'`，缺省 `true`）
- `body`: `region`
- `fallback`、`empty`: 仅作为潜在后续扩展

## 6. regions 与 slot 约定

- `body` 是主渲染入口。
- 如果后续增加 `fallback`/`empty`，它们应作为补充 UI，而不是和 `body` 形成双主内容区。
- **Lexical / per-instance scope（DD12 + DD13）**：加载的 schema 经 `props.helpers.render(schema)` 在 dynamic-renderer **自身的 lexical scope** 内渲染（非 page root、非共享单例）。因此：(DD12) prop channel reactive 读 live scope，`loadActionKey` 变化触发 reload；(DD13) 同名 componentId 的多个 instance **互不碰撞**——每个 instance 在各自 lexical scope 内解析绑定，定向其一不影响另一。回归锚见 `dynamic-renderer-lexical.test.tsx`（child/row scope 读取 + per-instance 隔离），cache dedup 的相反轴见 `basic-dynamic-renderer.test.tsx`（A11）。

## 7. 运行期状态归属

- 编译后的 fragment 归当前 owner node 的 compile context 管理。
- 加载态、错误态和最终 schema 值由 `dynamic-renderer` 自身持有；它们不是通用 render-boundary 的兜底责任。
- `loadAction` 结果必须先通过 action-shape validation；返回值必须是可编译的最终 schema，最小要求是 `{ type: string }` 形状。
- `loadAction` 执行失败或返回非法 schema 时，组件进入 renderer-owned error state，并在 `nop-dynamic-renderer` 壳内发布错误文本；不得伪装成普通 render-boundary 崩溃。
- 当新的 `loadAction` 输入替换旧值时，旧 schema 不再继续显示为当前成功状态；可见状态应与最新 `loadAction` 对齐。
- 当前 live loading baseline 为 renderer-owned visible pending UI：`nop-dynamic-renderer` 壳内会显示 spinner + loading text，并可继续渲染 authored `body` region 作为宿主补充内容。
- 因此 `dynamic-renderer` 当前可见状态收口为三态：loading（renderer-owned spinner + optional body）、schema-ready（动态 schema render result）、error（renderer-owned diagnostic text）。
- **`autoLoad:false` 初始态裁定**：`autoLoad:false` 时初始 `loading:false`（不进 loading 态）、初始 `error: undefined`（即便无 `loadAction` 也不报 required 错误，因 `autoLoad:false` 表达「作者显式不自动加载」，loadAction 可能由后续 scope/refresh 提供）。组件停留 body region（或空态），等待 `component:refresh`。`autoLoad:true`/缺省 + 无 `loadAction` 时维持既有 required 错误（向后兼容）。

## 8. 事件、动作与组件句柄能力

- `component:refresh` 是**正式契约**（X1 vocabulary `refresh`，对齐 `docs/references/component-handle-vocabulary.md`）。调用时重新求值 `loadAction`，经同一 `loadSchema()` 路径触发加载（复用既有 abort/状态机/stale-clear），返回 `{ok:true}` 或失败时 `{ok:false, error}`；不暴露底层 compiler 私有对象。
- **Failure paths**（与 plan `Failure Paths` 表一致）：
  - `refresh-triggers-load`：`component:refresh` 调用 → 重新求值 `loadAction` 并 `loadSchema()`，abort 在途旧请求，进入 loading 态 → schema-ready/error。
  - `refresh-no-loadaction`：无 `loadAction` 时调 `component:refresh` → 返回 `{ok:false, error}`，不抛，组件态不变。
  - `refresh-while-loading`：loading 中再次 `refresh` → abort 旧请求，发起新请求（既有 stale-clear 行为保留）。
  - `refresh-eval-error`：`loadAction` 求值抛错 → 返回 `{ok:false, error}`，组件态不变。
- 当前稳定基线里，错误处理优先走 renderer-owned diagnostic surface；`onError` / notify 仍可作为后续增强，而不是现有 contract。

## 9. 数据源、表达式、导入能力接入点

- 该组件是动态 schema 的主要接入点之一。
- 输入应尽量是“最终可编译 schema”，而不是原始业务数据加模板协议。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-dynamic-renderer` marker。
- 外层壳样式应最小化，避免覆盖内部动态片段的视觉边界。

## 11. 实现拆分建议

- schema 归一化、编译上下文继承、错误边界和 fallback 呈现应拆成独立模块。

## 12. 风险、取舍与后续阶段

- 这是最容易被滥用的逃逸口，必须在文档中强调“执行最终结构，而不是临时拼装业务 DSL”。
- 编译缓存、错误可观察性和 scope 继承需要持续回归验证。
