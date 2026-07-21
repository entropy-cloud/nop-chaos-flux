# 新组件引入原则审计

> **定位**：引入任何新 renderer / 新组件包前的**强制审计入口**。本文只管"原则 + 边界 + 审计 checklist"，不重复流程与代码结构。
> **强制性**：未勾选的 invariant 项要么改设计、要么走 plan-first 例外流程；不可跳过。

## 0. 谁应该读这份文档

- 提议新 renderer（如 `ai-chat`、`kanban`、`gantt`）
- 提议新 renderer 包（如 `flux-renderers-ai`、`flux-renderers-im`）
- 对现有 renderer 做扩展时触碰了 IO / state ownership / 跨组件能力
- 评审他人提议的新组件

## 1. 硬性 Invariants（不可降级）

### INV-1：所有外部 IO 必须经 `RendererEnv` 抽象

渲染器**永不**直接调用以下全局/浏览器 API：

- `fetch` / `XMLHttpRequest` / `axios`
- `WebSocket` / `EventSource` / `RTCPeerConnection`
- `localStorage` / `sessionStorage` / `IndexedDB`
- `window.open` / `history.pushState`
- `import()` 动态加载远程模块

所有外部 IO 必须经 `RendererEnv`（`packages/flux-core/src/types/renderer-api.ts:83`）：

- `fetcher`：HTTP 请求（Promise-based）
- `notify` / `confirm` / `alert`：UI 反馈
- `navigate`：路由
- `loadPage` / `loadDict`：schema/字典加载
- `hasRole`：权限
- `importLoader` / `resolveImportUrl`：host 注入业务能力
- `monitor`：监控

**理由**：低代码框架是解释器，"系统调用"由宿主实现而不是框架硬编码——这让同一套框架可嵌入不同宿主（HTTP 库、路由库、鉴权方案、SDK 选择权都留在宿主侧）。参见 `docs/articles/flux-design-introduction.md:606`。

### INV-2：新 IO 类型经评审后可扩充 `RendererEnv`

当现有 env 能力不覆盖（如流式响应 / WebSocket / 本地持久化）时，按以下优先级处理：

| 优先级 | 方案                                             | 适用场景                                                                                        |
| ------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **A**  | 用现有 env 能力组合                              | 能用 `fetcher` + adapter / 现有 import 解决                                                     |
| **B**  | 走 `env.importLoader` + `xui:imports` 注入连接器 | 业务连接器（自家网关、第三方 SDK、自定义协议）                                                  |
| **C**  | **经架构评审后扩充 `RendererEnv` 接口**          | 通用系统调用（3+ 不相关组件都需要、属于 host transport boundary、不能被 importLoader 优雅覆盖） |

**C 方案的评审标准**（全部满足才能扩 env）：

- ✅ 通用性：3+ 个不相关组件都需要（不是某个业务组件专用）
- ✅ 属于 host transport boundary（系统调用，不是业务能力）
- ✅ 不能被 importLoader 优雅覆盖（import 适合"业务连接器"，env 适合"系统调用"）
- ✅ 跨多个 host 实现可统一抽象（web / SSR / test / 离线）
- ✅ 与现有 env 能力有强耦合（如 `fetch` + streaming 应是同一抽象的两个 mode，而非两个独立 API）

**C 方案的评审流程**：

1. 提案：在 `docs/discussions/` 起草，说明覆盖场景、为何 A/B 不够、提议的接口形状、向后兼容策略
2. 评审：discussion 收集意见；通过后更新 `docs/architecture/`（具体 owner doc 在评审中裁定）
3. 实现：扩 `RendererEnv` 接口（`packages/flux-core/src/types/renderer-api.ts`）；为所有 host 实现（`apps/playground` 等）补默认实现
4. 兼容：新字段必须 **optional**，不破坏现有 host

### INV-3：复用 flux runtime 能力，不重造

| 需求      | 必须复用                                              | 不可重造                             |
| --------- | ----------------------------------------------------- | ------------------------------------ |
| 表单      | `FormRuntime`（`flux-runtime/src/form-runtime-*.ts`） | 自实现表单引擎                       |
| 数据请求  | `ajax` action / `data-source` renderer                | 自实现 fetch pipeline                |
| 数据订阅  | `reaction` field / `data-source`                      | 自实现 scope watching                |
| 弹框/抽屉 | `dialog` / `drawer` / surface renderer                | 自实现 modal manager                 |
| 布局      | `page` / `container` / `flex` / `grid` / `panel`      | 自实现 layout engine                 |
| 表达式    | `FormulaCompiler`                                     | 自实现 DSL                           |
| 动作分发  | `ActionScope` / built-in actions                      | 自实现 action bus                    |
| UI 控件   | `@nop-chaos/ui`                                       | raw HTML（参见 AGENTS.md MANDATORY） |
| 业务能力  | `xui:imports`                                         | schema 硬编码 SDK 调用               |

参见 `docs/references/complex-component-design-process.md` §1.2、§5.2 反模式。

### INV-4：域内部 state 不进 schema-visible scope

- **schema-visible** = 经表达式 / `reaction` / `scope.readVisible` 可见的数据
- **域内部** = 渲染器内部状态机、协议、协作引擎、高频更新缓存等
- **规则**：域内部 state 用包内 store（Zustand-style + `useSyncExternalStore`），**不写 scope**

**例外（经显式 projection 可发布）**：

- `ComponentHandleRegistry` + `component:<method>` action（跨组件命令式控制）
- `ActionScope.registerNamespace` + `<ns>:<action>`（命名空间能力）
- `xui:imports` 的表达式 helper channel（只读摘要）
- `host projection`（host 拥有的只读快照）

**环境稳定性**：env 引用变化不应触发内部 state 重建（用 `useRef` lazy init + 接口适配；不要把 env 作为 useEffect dep）。参见 `docs/low-code-dsl-runtime-requirements.md:176,184`。

**判定：什么时候内部 state 应升级到 scope/component handle？**

- 多个独立组件需要读 → scope
- 父组件 / 兄弟组件需要命令式控制 → component handle
- 业务方能用 schema 表达式读到有意义 → 经 projection 进 scope
- 否则 → 保持内部

### INV-5：严守 `RendererComponentProps` 契约

- 渲染器签名：`(props: RendererComponentProps<XxxSchema>) => RendererRenderOutput`
- 数据从 `props.props` / `meta` / `regions` / `events` / `reactions` / `helpers` 读
- 响应式读**必须**走 `useScopeSelector` / `useCurrentFormState` / `useDataSourceStatus` 等 selector hooks（**禁止** `scope.get` / `scope.materializeVisible` 在 render path）
- ambient 能力用标准 hooks 表（参见 AGENTS.md）
- **不发明平行组件协议**（如自造 `<MyRenderer api={...} />` 之类的 second component API）

## 2. 能力归属判定表

引入新组件时遇到的所有"这个能力放哪里"问题，按下表裁决：

| 能力需求                                    | 归属                                              | 备注                       |
| ------------------------------------------- | ------------------------------------------------- | -------------------------- |
| HTTP 一次性请求                             | `env.fetcher` 或 `ajax` action 或 `data-source`   | 不要直 `fetch`             |
| HTTP 流式响应（SSE / chunked）              | `env.stream`（已评审通过，待 P-1 实施）           | 2026-07-21 走 C 档扩 env   |
| WebSocket / 长连接                          | `env.openSocket`（同上）                          | 同上                       |
| 文件上传                                    | `env.fetcher`（POST binary）                      | 标准路径                   |
| 鉴权 / 权限                                 | `env.hasRole` + 网关层                            | 不在前端硬编码             |
| 路由 / 导航                                 | `env.navigate`                                    | 不直接 `history.pushState` |
| 通知 / Toast                                | `env.notify`                                      | 不直调 toast 库            |
| 确认对话框                                  | `env.confirm` / `env.alert`                       | 不直调 `window.confirm`    |
| 加载页面 schema                             | `env.loadPage`                                    |                            |
| 加载字典                                    | `env.loadDict`                                    |                            |
| 监控 / 日志                                 | `env.monitor`                                     |                            |
| 表单                                        | `FormRuntime`                                     | 复用                       |
| 数据拉取/订阅                               | `data-source` / `reaction`                        | 复用                       |
| 弹框 / 抽屉 / 浮层                          | `dialog` / `drawer` / surface renderer            | 复用                       |
| 布局结构                                    | `page` / `container` / `flex` / `grid` / `panel`  | 复用                       |
| 业务函数库 / 第三方 SDK                     | `xui:imports` + `env.importLoader`                | host 注入                  |
| 渲染器内部 UI state（draft / hover / 展开） | `useState` / `useReducer`                         | 内部                       |
| 渲染器内部复杂状态机                        | 包内 store（参考 `flow-designer-core/src/core/`） | 内部                       |
| 跨组件命令式控制                            | `ComponentHandleRegistry` + `component:<method>`  | 经注册                     |
| 命名空间能力暴露                            | `ActionScope` + `<ns>:<action>`                   | 经注册                     |
| 表达式 helper（如 `$ai.isProcessing`）      | `xui:imports` 表达式 channel                      | 经 import                  |
| 自定义数据持久化                            | 包内 storage adapter（不直调 localStorage）       | host 可注入实现            |

## 3. 引入新组件的强制审计 Checklist

引入任何新 renderer 之前，必须**逐条**勾选。未勾选项要么改设计、要么走 plan-first 例外流程。

### A. IO 边界（对应 INV-1、INV-2）

- [ ] 列出组件所有外部 IO（HTTP / WS / 文件 / 通知 / 路由 / 权限 / 持久化 / ...）
- [ ] 每个 IO 都已归位到 env 现有字段、importLoader、或评审通过的新 env 字段
- [ ] 渲染器代码内**没有**直接调用 `fetch` / `WebSocket` / `EventSource` / `localStorage` / `sessionStorage` / `IndexedDB` / `history.pushState` / `window.open`
- [ ] 渲染器代码内**没有**硬编码 API key / baseURL / endpoint / model name
- [ ] 如有"新 IO 类型"需求，已按 INV-2 走评审流程或退化为 import 方案

### B. 复用边界（对应 INV-3）

- [ ] 表单需求已确认走 `FormRuntime`（不重造）
- [ ] 数据请求已确认走 `ajax` / `data-source`（不重造 fetch pipeline）
- [ ] 弹框/抽屉需求已确认走 `dialog` / `drawer`（不重造 modal manager）
- [ ] 业务能力注入已确认走 `xui:imports`（不在 schema 硬编码 SDK）
- [ ] UI 元素已确认走 `@nop-chaos/ui`（不写 raw HTML）
- [ ] 表达式已确认走 `FormulaCompiler`（不发明新 DSL）
- [ ] 布局结构已确认复用 `page` / `container` / `flex` / `grid` / `panel`（不重造 layout engine）

### C. 内部 state 边界（对应 INV-4）

- [ ] 列出组件所有 state，标注 ownership：`local` / `controlled` / `scope-owned` / `域内部`
- [ ] 域内部 state（状态机、协议、协作引擎）**不进** schema-visible scope
- [ ] 高频更新的 state（流式 chunk、动画帧）**不写** scope（避免订阅风暴）
- [ ] env 引用变化**不触发**内部 state 重建（lazy init + ref + 适配层）
- [ ] 需暴露给 schema 的 state 用 projection 通道之一（component handle / ActionScope / import helper）
- [ ] 复杂内部 state 已参考 `flow-designer-core/src/core/` 的拆分模式

### D. 契约边界（对应 INV-5）

- [ ] 渲染器签名为 `(props: RendererComponentProps<XxxSchema>) => RendererRenderOutput`
- [ ] 数据从 `props.props` / `meta` / `regions` / `events` / `reactions` / `helpers` 读
- [ ] 响应式读走 `useScopeSelector` / `useCurrentFormState` 等 selector hooks（带 `paths` 优化）
- [ ] render 期**没有** `scope.get` / `scope.materializeVisible` / 任何 side effect
- [ ] **没有**发明平行组件协议（无 second component API）
- [ ] **没有**直接访问 stores（用标准 hooks）

### E. 扩展点边界（让组件可被 schema 驱动扩展）

- [ ] 外部可定制结构用 `region` / `value-or-region` 描述
- [ ] 行为扩展用 `event` + `ActionSchema`
- [ ] 响应式扩展用 `reaction`（带 `dependsOn`）
- [ ] 业务能力扩展用 `xui:imports`（同时获得 action namespace + 表达式 helper）
- [ ] 不在 schema 里塞"实现细节字段"（如 `apiClient` / `sdkInstance` / `internalState`）

### F. 样式边界

- [ ] 根 marker class 符合 `nop-<type>` 规范（如 `nop-ai-chat`）
- [ ] 内部 region 用 `data-slot="<role>"`（**禁止** BEM，如 `nop-ai-chat__header`）
- [ ] 状态用 `data-*` / `aria-*`（presence-only，**禁止** BEM modifier 如 `nop-ai-chat--streaming`）
- [ ] Layout vs Widget 二分清晰：Layout 渲染器只发 marker，Widget 渲染器可自样式
- [ ] 不引入新 token 命名空间（除非评审通过）
- [ ] 用 `cn()` from `@nop-chaos/ui` 合并 class

详见 `docs/architecture/styling-system.md`、`docs/architecture/renderer-markers-and-selectors.md`。

### G. 包结构（仅新建包必勾；新 renderer 进现有包跳过）

- [ ] `package.json` 符合 workspace 模板（`private: true` / `"type": "module"` / `sideEffects: ["*.css"]` / workspace 协议）
- [ ] `tsconfig.json` extends `../../tsconfig.base.json` + `noEmit: true`
- [ ] `tsconfig.build.json` 配置 `declaration:true` / `outDir:dist` + 排除测试
- [ ] `vitest.config.ts` 用 `createSharedVitestConfig`
- [ ] 已在 `vite.workspace-alias.ts` 注册别名
- [ ] 已在 root `tsconfig.json` 加 project reference
- [ ] 已在 `apps/playground/src/styles.css` 加 `@import`（如有 CSS）
- [ ] 已在 playground host 调用 `registerXxxRenderers(registry)`
- [ ] 单一 `src/index.ts` 入口，内部相对路径带 `.js` 后缀

## 4. 审计产出

每次审计应产出一份审计记录（可放在组件 design.md 的"原则审计"章节，或独立文件）：

```markdown
## 原则审计（日期：YYYY-MM-DD，审计人：xxx）

### INV-1 IO 边界

- 已列出 IO：[清单]
- 归位情况：[说明]
- 例外项：[无 / 列出 + plan 链接]

### INV-2 新 IO 类型

- 是否触发：[否 / 是 → 评审链接]

### INV-3 复用边界

- 重造项检查：[结果]

### INV-4 内部 state 边界

- state 清单 + ownership 分类表
- projection 通道选择

### INV-5 契约边界

- contract drift 检查

### Checklist A-G 勾选状态

[勾选快照]

### 例外与未决项

[无 / 清单 + 后续 plan]
```

## 5. 已知待裁定项

以下项**已裁定**（2026-07-21 INV-2 评审完成）：

| 项                                         | 裁定                                        | 落地位置                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **流式响应（SSE）**                        | **C 档：扩 env**（已评审通过，待 P-1 实施） | `env.stream?: StreamFetcher`，见 `docs/architecture/renderer-env.md` §3.2 + `docs/discussions/2026-07-21-env-stream-and-websocket-extension.md` |
| **WebSocket 长连接**                       | **C 档：扩 env**（同上）                    | `env.openSocket?: WebSocketOpener`，见 `docs/architecture/renderer-env.md` §3.3                                                                 |
| **本地持久化（IndexedDB / localStorage）** | **B 档：import 注入**（不扩 env）           | host 经 `xui:imports` 提供 `ConversationStorageStrategy` 实现                                                                                   |

以下项仍归 INV-2 未来提案处理：

- **文件系统访问**（File System Access API / Node fs）：跨 host 场景暂无强需求
- **蓝牙 / USB / 串口等设备 IO**：暂无需求
- **chunk 级监控 hook**（`monitor.onStreamChunk`）：当前监控覆盖连接级，chunk 级留作后续
- **built-in `stream` / `openSocket` action**：本次未加，schema 侧只能通过渲染器内部消费；如未来 schema 作者需声明式消费，按 §INV-2 评审流程提 built-in action 提案
- **`useEnvCapability(name)` hook**：本次未加；调用方直接 `if (env.stream)` 判断

## 6. 与现有文档的关系

本文只管"原则 + 边界 + 审计 checklist"。具体内容指向：

| 关注点                                                    | 看                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| 5 阶段设计流程（领域分析 → Schema → 编译 → 运行时 → CSS） | `docs/references/complex-component-design-process.md`      |
| 代码结构选择（单文件 / 纯 helper / 本地 hook / 域 core）  | `docs/references/renderer-implementation-guidelines.md`    |
| 渲染器/运行时契约细节                                     | `docs/architecture/renderer-runtime.md`                    |
| 字段绑定与 field-like renderer 规则                       | `docs/architecture/field-binding-and-renderer-contract.md` |
| 复杂控件层级规则                                          | `docs/architecture/flux-dsl-vm-extensibility.md`           |
| 样式契约                                                  | `docs/architecture/styling-system.md`                      |
| marker / data-slot / data-state 协议                      | `docs/architecture/renderer-markers-and-selectors.md`      |
| action / scope / imports 细节                             | `docs/architecture/action-scope-and-imports.md`            |
| 模块边界                                                  | `docs/architecture/flux-runtime-module-boundaries.md`      |
| env 设计哲学（为什么所有 IO 经 env）                      | `docs/articles/flux-design-introduction.md:606`            |
| runtime requirements（环境稳定性 / 域私有通道）           | `docs/low-code-dsl-runtime-requirements.md`                |
| Plan 起草 / 评审 / 收尾                                   | `docs/plans/00-plan-authoring-and-execution-guide.md`      |
| Protected Areas / 自治策略                                | `docs/context/ai-autonomy-policy.md`                       |
