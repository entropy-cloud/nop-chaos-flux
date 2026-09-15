# Three.js 3D 场景集成设计文档集（v5）

> **文档版本**: 5.0
> **状态**: 定稿（I1.1 共识审查通过：3 轮独立 sub-agent 审查，R1 3M/7m → R2 0B/0M/5m → R3 终审 0B/0M，plan `docs/plans/464-threejs-i1-design-review-plan.md` Review Rounds 留痕）
> **更新日期**: 2026-09-13
> **前置**: 调研 `docs/analysis/threejs-integration-analysis.md`（§7 复用点、§8 v4 核对表）；v4 历史版本归档于 `docs/analysis/threejs-integration-design-v4.md`
> **来源路线图**: `docs/backlog/threejs-integration-roadmap.md`

---

## 1. 目标与量化指标

| 目标     | 说明               | 量化指标                                                                                  |
| -------- | ------------------ | ----------------------------------------------------------------------------------------- |
| 简单性   | 方案易于理解和实现 | 核心接口 < 10 个 API                                                                      |
| 标准性   | 遵循现有渲染器架构 | 复用 `RendererComponentProps` 契约与 scada 数据合帧模式                                   |
| 高性能   | 60fps 实时渲染     | 状态更新→渲染延迟 < 16ms（CPU 段基线见调研文档 §10.3）                                    |
| 高可靠性 | 工业级稳定性       | 断开检测→首次重连尝试启动 < 1s（baseDelay 默认 500ms + ±25% 抖动，design-protocol.md §3） |
| AI 友好  | 接口规范清晰       | JSON Schema 完整覆盖，生成必经验证                                                        |

## 2. 总体架构

```
┌───────────────────────────────────────────────────────────────────┐
│                        Flux Application                           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Zustand Store (scope) ← 数据源: 页面状态 / sources / socket │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬───────────────────────────────────┘
                                │ useScopeSelector(paths 精确订阅)
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│        flux-renderers-3d  (新包, three-canvas 渲染器)              │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────────────┐  │
│  │ Schema 解析   │  │ 绑定桥接 hook  │  │ 协议适配(I3)           │  │
│  │ SceneManager │  │ useBinding    │  │ IndustrialAdapter      │  │
│  │ (裸 three)   │  │ Bridge        │  │ + ReconnectionManager  │  │
│  └──────────────┘  └───────┬───────┘  └────────────────────────┘  │
│        ▲                   │ pendingUpdates 队列                  │
│        │ rAF flush(合帧)   ▼                                      │
│        └──────── updateProperty(modelId, path, value)             │
└───────────────────────────────┬───────────────────────────────────┘
                                ▼
                    Three.js Scene Graph (r186)
```

与 scada-canvas（Leafer 2D）同构的组件形态：**React 组件壳 + 命令式引擎实例**，引擎自管 rAF 循环与 dispose 生命周期；React 只负责 schema 解析、scope 订阅与 hook 编排。

## 3. 包结构（决策 D2：新建 `flux-renderers-3d`）

```
packages/flux-renderers-3d/
├── src/
│   ├── index.tsx                  # 包入口（导出 renderer definition + 组件）
│   ├── schemas.ts                 # ThreeCanvasSchema 等类型
│   ├── renderer-definitions.ts    # RendererDefinition 注册体
│   ├── renderer/
│   │   ├── three-canvas.tsx       # 渲染器组件（React 壳）
│   │   └── hooks/
│   │       ├── use-scene-manager.ts    # 引擎实例生命周期
│   │       ├── use-binding-bridge.ts   # scope→3D 绑定桥接
│   │       └── use-three-events.ts     # 事件桥接（对齐 use-scada-events 模式）
│   ├── engine/
│   │   ├── scene-manager.ts       # three 场景组装/更新/dispose
│   │   └── model-loader.ts        # GLTF 加载（generation-guard 取消）
│   ├── binding/
│   │   ├── flux-eval.ts           # 求值与依赖提取（模式对齐 industrial 同名模块）
│   │   └── transform-engine.ts    # 值转换（range/convert/condition）
│   ├── data-source/
│   │   ├── industrial-adapter.ts  # openSocket 消费（I3.1）
│   │   └── reconnection-manager.ts# 指数退避重连（I3.1）
│   └── ai/
│       ├── schema-validator.ts    # 生成配置验证（I4.1）
│       └── schema-generator.ts    # 结构化生成接口（I4.1）
├── package.json / tsconfig.json / tsconfig.build.json
```

依赖策略：`three`（精确版本锁 r186）为本包 dependencies；`@types/three` 为 devDependencies；对 `@nop-chaos/flux-core`/`flux-react` 用 `workspace:*`。**不依赖** `flux-renderers-industrial`（复用的是模式而非代码实体，见 D4）。

新包接入清单（I2.1 执行）：`vite.workspace-alias.ts` 增别名；`tsconfig.base.json` `paths` 增映射（注意：仓库现有缺口——`flux-renderers-form-advanced` 无 paths 映射，fresh checkout 无 dist 时 `flux-bundle` typecheck 失败，新包必须同步补映射避免重蹈）；root `tsconfig.json` project references 增条目。

## 4. 决策记录（I1.1 共识审查裁定）

每项含决策、理由、被拒替代方案与 live 证据。修改这些决策需人工评审。

### D1 渲染技术：裸 Three.js，不引入 React Three Fiber

- **决策**：组件内直接使用 three r186 命令式 API，自管 rAF 循环。
- **理由**：(1) 与 scada-canvas（Leafer 命令式引擎 + React 壳）同构，团队已有生命周期/dispose/诊断模式沉淀；(2) 免去 react-reconciler 自定义渲染器栈的依赖与心智负担；(3) 绑定热路径本就是「订阅回调写缓存 → 帧边界批量应用」，不依赖 R3F 的 reconciler 调度。
- **被拒替代**：R3F v9（官方支持 React 19）——声明式 JSX 有吸引力，但引入 reconciler 栈且与仓库命令式引擎先例分裂。
- **证据**：`packages/flux-renderers-industrial` 引擎形态；three 0.186 独立 rAF 成本可忽略（调研文档 §10.3 场景组装 ~60µs）。

### D2 包落点：新建 `flux-renderers-3d`

- **决策**：不并入 `flux-renderers-industrial`。
- **理由**：industrial 绑定 Leafer（2D 引擎），并入使单包携带两套渲染引擎；仓库先例按域拆渲染器包（map/graph/dashboard/industrial 各自独立）；I3/I4 复用的是 flux-core/flux-react 层能力。
- **被拒替代**：扩展 industrial——bundle 体积与发布面耦合。
- **证据**：`packages/` 渲染器包粒度现状；调研文档 §8.2。

### D3 事件契约：`events` 对象整体注册为 `kind: 'prop'`，渲染器内经 `helpers.dispatch` 桥接

- **决策**：沿用 v4 方案——`ThreeCanvasEvents`（onObjectClick/onObjectHover/onReady/onError，ActionSchema 字面量）整体走 prop 通道；渲染器通过 `createNormalizedActionEvent` + `helpers.dispatch(action, { event, scope })` 派发。
- **理由**：这正是 v4 所称"compiler 约束"的实体：**平台 compiler 仅按顶层 key 分类字段（`flux-compiler` `classifyField` 精确匹配，无点号路径支持），`events.*` 子键无法注册为 event 字段**。scada 已按同约束落地：`packages/flux-renderers-industrial/src/renderer-definitions.ts:37-38`（注释）与 `:201`（`{ key: 'events', kind: 'prop' }`）；派发模式见 `use-scada-events.ts:65-88`。
- **被拒替代**：每个事件顶层平铺为 `kind: 'event'` 字段（`onObjectClick`/`onObjectHover`/…各自一条 rule）——技术上可行（标准通道 `props.events[key]`），但与 scada 的 `events` 对象契约不一致，跨工业渲染器的 author 体验分裂；若未来 I3 需要 per-model 事件声明再评估。
- **证据**：`renderer-definitions.ts:201`、`use-scada-events.ts`、`docs/references/quick-reference.md` 字段生命周期。

### D4 表达式求值：`compileValue()`/`evaluateValue()` 路径 + 本包私有求值工具

- **决策**：绑定表达式一律 `expressionCompiler.compileValue()` 编译、`evaluateValue(compiled, evalScope, env)` 求值；复杂表达式订阅路径经 probe 模式提取（compileValue → 判 `kind === 'dynamic'` → createState → 宽容 Proxy scope 求值 → 读 `state.root.dependencies.paths`，五态判别）。工具落在本包 `binding/flux-eval.ts`，语义对齐 industrial 同名模块。
- **理由**：v4 §4 的 `formulaCompiler.compileExpression()` 产物（`CompiledExpression`）不是 `DynamicRuntimeValue`，喂 `evaluateWithState` 无法通过类型检查（`compiled-value-types.ts:19-24,117-128,139-144`）；scada live 路径是唯一已验证实现。
- **被拒替代**：跨包 import industrial 的 `flux-eval.ts`——渲染器包之间不应互相依赖；提取到 flux-react 属平台契约变更，当前仅两个消费者，不预扩。
- **证据**：`flux-renderers-industrial/src/binding/flux-eval.ts:17-111`、`use-scada-points-bridge.ts:357-367`、调研文档 §7/§8.1#1/#2。

### D5 模型加载取消：generation-guard，不用 AbortSignal

- **决策**：`GLTFLoader.loadAsync(url, onProgress)`（2 参）；场景重建/卸载时 bump generation，迟到结果按代判弃（判弃点尚无 GPU 资源上传，直接丢弃即可；已注册进场景的资源由 dispose 链回收）。
- **理由**：three 0.186 `Loader.loadAsync` 无 signal 参数（`three/src/loaders/Loader.js:91`），v4 的 4 参写法不存在。
- **证据**：调研文档 §8.1#3。

### D6 错误处理：非升级诊断通道 + 单项失败跳过

- **决策**：绑定编译/求值失败按 (表达式, 错误码) 去重上报 `onError`（第三参透传原始 error），不中断其余绑定，不升级画布状态；配置结构错误才走画布级错误。
- **理由**：对齐 scada 桥接降级契约（`use-scada-points-bridge.ts:209,290-296`）。
- **被拒替代**：失败即置画布级 error 状态——单条绑定表达式写错会拖垮整块 3D 画布可用性，与低代码平台容错预期相反。
- **证据**：调研文档 §7.1。

## 5. 文档集索引

| 分册                      | 内容                                                                                  | 主要消费者 |
| ------------------------- | ------------------------------------------------------------------------------------- | ---------- |
| `design.md`（本册）       | 目标、架构、包结构、决策记录                                                          | 全体       |
| `design-renderer.md`      | Schema 类型、RendererDefinition、组件壳、SceneManager、生命周期与 dispose、事件桥接   | I2.1       |
| `design-data-binding.md`  | DataBinding、表达式求值与订阅路径提取、绑定桥接 hook、TransformEngine、数据流全链路   | I2.1/I2.2  |
| `design-protocol.md`      | IndustrialAdapter、`RendererEnv.openSocket` 消费、ReconnectionManager、tag→scope 写入 | I3.1       |
| `design-ai-generation.md` | JSON Schema、SchemaValidator、AISchemaGenerator 接口面、验证门禁原则                  | I4.1       |

## 6. 跨切面

- **测试策略**：I2.1 起每个 execution plan 内声明 tier；绑定桥接与协议重连属「必须自动化」，纯渲染组装「建议有测」。
- **性能验证**：CPU 侧基线已建（`scripts/three-perf/bench-scene-graph.mjs`，调研文档 §10.3）；浏览器 fps 挂接 e2e 属 I2.1 successor 项。
- **AI 生成安全**：AI 输出必须过 `SchemaValidator` 才进入渲染管线（design-ai-generation.md）。
- **文档维护**：I2–I4 各 plan 关闭时，若实现与本设计集出现漂移，以 live code 为准回写分册并在 plan 记录。
