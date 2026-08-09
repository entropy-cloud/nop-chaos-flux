# scada-canvas renderer 五边界审计（I10.2）

> 日期：2026-08-04
> 依据：`docs/references/new-renderer-introduction-audit.md`（INV-1–INV-5 + Checklist A–F）；roadmap I10「强制原则审计」条款
> 审计对象：`packages/flux-renderers-industrial/src/renderer/`（scada-canvas.tsx + hooks）+ renderer-definitions.ts + schemas.ts
> 用途：**I12 整体 gate 的强制输入**（roadmap I10；I7 deferred 触发点兑现）
> 结论：INV-1–INV-5 全部通过；1 项契约裁定（事件通道，见 D-1）记录供 I15.2 文档同步复核

## 审计范围

renderer 桥接层（I10.1/I10.2/I10.3 落地代码）——不重复审计 I5/I6/I8/I9 域核心（各自 plan 收口时已审计）。域核心引用仅按边界核对。

## INV-1 IO 边界

- **外部 IO 清单**：无 HTTP/WS/持久化/路由/权限/监控调用；图元图片 URL 加载走引擎 `cacheImage`（I8.1 注入点：桥接层 env.fetcher 加载结果经 `engine.cacheImage(url, resolved)` 注入，renderer 本身不直调 fetcher——I10.1 实现未触发注入路径，`resolveImageUrl` 直通 leafer 原生加载，注入接线属 I13.1 演示页/后续 wave）；组态 JSON 为内嵌 props 数据（非外部获取）。
- **归位情况**：无 env 字段直调需求；`window.__flux_scada_<cid>` 测试句柄为 dev/test 投影（引擎侧唯一所有权，design-engine.md §11，renderer 仅传 cid/exposeTestHandle 开关——本实现恒开 exposeTestHandle，生产裁剪属 host 配置，e2e I15.1 依赖该句柄）。
- **代码扫描**：`renderer/` 目录无 `fetch`/`WebSocket`/`EventSource`/`localStorage`/`sessionStorage`/`IndexedDB`/`history.pushState`/`window.open`/动态 `import()`。
- **例外项**：无。

## INV-2 新 IO 类型

- **未触发**。设计期预审结论（design-renderer.md §12.2）复核成立：无新 IO 类型需求，不扩 `RendererEnv`；协议适配器（socket 等）属 P2 评估项，走 INV-2 B 档注入（design-data-binding.md §9.2）。
- 复核证据：renderer 桥接全部数据流为 scope（useScopeSelector）+ 点表（域内 store）+ props（config 内嵌），无系统调用面。

## INV-3 复用边界

| 需求               | 复用                                                                              | 证据                                                             |
| ------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| scope 响应式取值   | `useScopeSelector`（paths 精细化失效）                                            | use-scada-points-bridge.ts                                       |
| 表达式编译求值     | flux-formula/flux-compiler（`expressionCompiler.compileValue`/`evaluateValue`）   | 同上（flux 点求值；私有求值子 scope 注入点表上下文，INV-4 边界） |
| 动作派发           | `helpers.dispatch` + `createNormalizedActionEvent`（平台 action dispatcher 通道） | use-scada-events.ts                                              |
| 跨组件命令式控制   | `ComponentHandleRegistry`（useCurrentComponentRegistry + register）               | use-scada-handles.ts                                             |
| UI 控件/class 合并 | `@nop-chaos/ui` 的 `cn`；loading/empty 缺省为轻量 div（无自造控件）               | scada-canvas.tsx / styles.css                                    |
| 布局结构           | 单容器 widget renderer（非 layout 组件，无布局复用需求）                          | —                                                                |

- **重造项检查**：无自造 scope 订阅、无自造表达式 DSL（点表 `@{pointId}` 子集属 I6 域核心既有契约，非本 wave 新造；flux 侧一律走平台编译器）；无自造 action bus。
- **判定**：符合。

## INV-4 内部 state 边界

- **state 清单 + ownership**：

| state                                       | ownership                                          | 进出 scope                          |
| ------------------------------------------- | -------------------------------------------------- | ----------------------------------- |
| 引擎实例（场景树/图层/视口/测试句柄）       | 域内部（useScadaEngine 状态 + ref）                | 不进                                |
| 点表 store / 反向索引 / 脏收集 / 刷新流水线 | 域内部（同上，与引擎同生命周期）                   | 不进                                |
| 组态模型（当前 config 解析结果）            | 域内部（renderer useMemo + config-sync prevRef）   | 不进                                |
| 画布尺寸                                    | 域内部（引擎 size + ResizeObserver→setSize）       | 不进                                |
| loading/ready/error 状态                    | local（renderer useState，派生）                   | 不进（经 onReady/onError 事件投影） |
| flux 求值缓存                               | 域内部（compiledCache ref）                        | 不进                                |
| 私有求值子 scope                            | 域内部投影（createPrivateEvalScope，含点表上下文） | 非 schema-visible（不注册、不写回） |

- **环境稳定性**：env 引用经 `latest.current` 读取（engine 创建 effect 依赖仅 containerRef；handler 均走 latestRef），env 变化不重建引擎/绑定域（INV-4 环境稳定性条款）。
- **projection 通道**：component:\* 句柄（ComponentHandleRegistry）+ 测试句柄（window 投影）——均经既有通道。
- **判定**：符合（高频点表刷新不写 scope；React 侧仅订阅 scope 数据流本身，引擎写入走刷新流水线合帧）。

## INV-5 契约边界

- renderer 签名：`(props: RendererComponentProps<ScadaCanvasSchema>) => RendererRenderOutput` ✅
- 数据来源：props.props（config/width/height/viewport/events）/ meta（testid/cid/className）/ regions（loading/empty）/ helpers（dispatch）/ events 通道 ✅
- render path 无副作用：引擎副作用全部集中在 useEffect/useEffectEvent（引擎创建/destroy/resize/config 同步/桥接求值）；render 只读 props 派生 status ✅
- 响应式读：useScopeSelector（paths）✅；无 `scope.get`/`materializeVisible` 于 render path
- 无平行组件协议 ✅；无直接 store 访问（用标准 hooks）✅

### D-1 契约裁定：schema 级事件通道（`events.*` 点号字段）

- **现象**：design-renderer.md §5 字段分类表将 `events.onSymbolClick/onSymbolDblClick/onSymbolHover/onReady/onError` 归为 event 分类；但 flux-compiler `classifyField`（schema-compiler/fields.ts）仅按**顶层 key 精确匹配** renderer 字段规则，无点号路径支持——probe 实测（I10.2 执行期）`fields: [{ key: 'events.onClick', kind: 'event' }]` 不产生任何 eventPlans，`events` 对象落入 props 通道（ActionSchema 字面量原样保留，无破坏性编译）。
- **裁定**：`events` 对象整体注册为 `{ key: 'events', kind: 'prop' }`；renderer 事件桥接读 `props.props.events.*`（raw ActionSchema）→ `createNormalizedActionEvent`（renderer-helpers.ts:98 单参数签名）→ `helpers.dispatch(action, { event, scope })` 派发——**与平台 props.events 通道同源**（同一 action dispatcher + 事件规范化，raw ActionSchema 由 dispatcher 按需编译，normalizeCompiledActionProgram 契约），对齐 roadmap I10.3「事件经 action dispatcher 派发（对齐 props.events）」。
- **影响面**：schema 类型（design-renderer.md §4.1 `events?: ScadaCanvasEvents`）不变；renderer-definitions 注册形态偏离 §5 表文字（`events` prop + renderer 派发 vs `events.*` event 规则）——~~记录为 contract drift 供 I15.2 收尾同步~~ **已由 I15.2 同步闭环**（design-renderer.md §5 字段分类表/§5 注回写为 prop 注册形态，2026-08-04；flux-compiler 增加点号字段支持时仍可回切）；不构成 I10 in-scope 缺陷（行为语义：schema 事件经平台 dispatcher 派发——已达成）。
- **I11.1 边界**：组态内图元事件声明（config 内 `events`）→ 全链路派发属 I11.1，本裁定仅覆盖 schema 级 `events` 对象。

## 扩展点边界

- 外部可定制结构：`loading`/`empty` region（受控，params `[{ error }]`）✅
- 行为扩展：schema 级事件（ActionSchema，onSymbolClick/onSymbolDblClick/onSymbolHover/onReady/onError）+ 组态内图元事件声明（config 内嵌，I11.1）✅
- 响应式扩展：config source-enabled（`config` prop 可挂表达式/data-source，编译期通道既有）✅
- 不在 schema 塞实现细节字段（引擎内部句柄经 component:\* 注册，非 schema 字段）✅

## 样式边界（INV-§3F / design-renderer.md §10）

| DOM 元素    | marker class       | data-slot              |
| ----------- | ------------------ | ---------------------- |
| 根容器      | `nop-scada-canvas` | `scada-canvas`         |
| canvas 画布 | —                  | `scada-canvas-canvas`  |
| 加载占位    | —                  | `scada-canvas-loading` |
| 错误提示    | —                  | `scada-canvas-error`   |

- 无 BEM、无新 token 命名空间（styles.css 仅布局/位置类）；`cn()` 合并（`@nop-chaos/ui`）；根容器 `width/height 100%` + canvas absolute 铺满 ✅
- 测试锚点优先级：`window.__flux_scada_<cid>` > data-slot > nop-\* ✅

## Checklist A–F 勾选快照

- **A. IO 边界**：✅ 全部勾选（IO 清单已列；归位 env/importLoader 无直调；无硬编码 endpoint/API key；INV-2 未触发）
- **B. 复用边界**：✅ 全部勾选（无重造 fetch pipeline / modal / layout / DSL；表达式走 FormulaCompiler；UI 走 @nop-chaos/ui；业务能力无 schema 硬编码 SDK）
- **C. 内部 state 边界**：✅ 全部勾选（ownership 表已列；域内部不进 scope；高频不写 scope；env 变化不重建；projection 通道既有）
- **D. 契约边界**：✅ 全部勾选（含 D-1 裁定记录；render path 无副作用；无平行协议）
- **E. 扩展点边界**：✅ 全部勾选
- **F. 样式边界**：✅ 全部勾选
- **G. 包结构**：跳过（非新建包）

## 例外与未决项

| 项                                  | 处置                                                                                                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events.*` 事件通道裁定（D-1）      | 本审计落盘 + **I15.2 已同步闭环**（design-renderer.md §5 回写为 prop 注册形态，2026-08-04）；flux-compiler 支持点号字段时可回切（watch-only residual，I15 plan Deferred）                                     |
| `viewport.fit: 'fill'` 语义         | 实现为 cover-fit（setViewport 计算 scale = max 比），引擎级 fit 为 contain；I11.2 画布浏览交互可细化                                                                                                          |
| `component:destroy()` 后句柄状态    | 句柄保持注册（invoke 返回 not-mounted），对齐 §8.5 失败路径语义；unmount 时退订                                                                                                                               |
| `onReady` 触发口径                  | 定义为场景构建成功（config 同步完成）；`leafer.ready`（首帧）未消费——gate-3-review §10 归属（ready/error 桥接属 renderer）兑现口径，记录供 I11.1/I14 复核                                                     |
| `exposeTestHandle` 恒开             | 生产裁剪属 host 配置；e2e（I15.1）依赖                                                                                                                                                                        |
| 绑定域重载（config 变更含点表变化） | 点表声明/反向索引重建 + 刷新流水线整体重建（synced 状态重置，表达式点重同步正确）——已实现，无遗留                                                                                                             |
| 动画时钟（Animator）装配            | engine hook 装配 `collect` → 帧内脏收集 + `requestFrame` → 流水线合帧（I9 状态动画契约在 renderer 生效：进入状态启动/退出停止，blink/rotate 等经合帧路径写入）——I10.1 落地，`animator` 随绑定域同生命周期销毁 |

## 审计结论

INV-1/INV-2/INV-3/INV-4/INV-5 全部通过；Checklist A–F 勾选完成；1 项契约裁定（D-1）落盘并明确 I15.2 同步路径。**本审计结论可作为 I12 整体 gate 输入**。
