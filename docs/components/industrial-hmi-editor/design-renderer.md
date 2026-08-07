# renderer 契约设计 design-renderer.md

> 日期：2026-08-06
> 版本：v1（E2.6 产出）
> 上游：编辑器架构 `design-architecture.md`（E2.1，§4.1 ScadaEditorCanvasSchema 架构层声明 + §4.2 双态隔离 + §4.5 编辑会话模型 + §8 句柄/test-handle）、属性面板 `design-property-panel.md`（E2.2，§3 inspector region）、连线 `design-connection.md`（E2.3，§8.3 connection test-handle）、undo-redo `design-undo-redo.md`（E2.4，§8.3 undo-redo test-handle）、工具箱 `design-toolbox.md`（E2.5，§8.3 toolbox test-handle）、runtime 序列化与 renderer 契约 `docs/components/industrial-hmi/design-renderer.md`（I2.4 12 节结构先例 + §4 renderer 契约 + §8.5 句柄面 + §8.4 测试句柄 + §12.2 五边界审计）、runtime 引擎层 `docs/components/industrial-hmi/design-engine.md`（§8.2 18 命令面 + §8.3 runtime 测试句柄）、立项材料 `docs/components/industrial-hmi/editor-initiation.md`（§3 复用点 #5 #7 + §6 R5 R7）、E1 选型 `docs/analysis/industrial-hmi-editor/selection-gate-2026-08-06.md`（§5 9 设计约束）、E1.2 编辑态包络 `docs/analysis/industrial-hmi-editor/editing-envelope-2026-08-06.md`（§3 五项包络值）
> 下游：E3 设计 gate（独立 plan，本档 + 5 份 sibling 设计的终轮复核）；E4.1 包结构裁定（消费本档包归属声明 + §11 实现拆分）；E4.2 注册 scada-editor-canvas 空壳（消费本档 fields/events/regions/handles 完整契约）；E5.1 编辑态画布组件 + 双态切换实现（消费本档 React 桥接 + 句柄扩展 + 测试句柄）
> 依据：roadmap `docs/components/roadmap-industrial-hmi-editor.md`（E2.6 + Cross-Cutting 双态隔离 / 平台能力复用 / spike 先行纪律 / 文档共识审查）+ E2 plan `docs/plans/2026-08-06-1931-2-e2-editor-design-documents.md`

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent（fresh session，不复用编写者上下文）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。轮次记录如下：

- **Round 1（2026-08-06，fresh session 独立子 agent `ses_028d4cd80ffeViG8MGl0B7ROdY`）**：判定 `AGREE`——0 Blocker / 0 Major / 0 Minor / 2 Nit。6 项 mandatory 核对逐项 PASS：① renderer 契约对齐 `RendererComponentProps` + runtime `design-renderer.md` 12 节先例（§3 + §5 fields 规则经 D-1 裁定 events 整体 prop，对齐 runtime §5 D-1；§3 D 行数据从 props.props/meta/regions/events/helpers 读，无直读 store）；② 句柄扩展与 `use-scada-handles.ts:11-21` live 一致（§8.5.1 runtime 9 句柄与 SCADA*HANDLE_METHODS 逐项精确一致 + §8.5.2 编辑扩展 8 句柄独立子节明确区分不入 runtime 常量）；③ 双态隔离 + 包络满足（§4.2 三层隔离 + 4 验证与 architecture §4.2 一致；§4.7 五项包络与 `editing-envelope §3` 逐值对齐：≥30fps@≤1k primary / <100ms / ≤1k primary·≤10k extended / ≤320MB / E6·E9.2）；④ 消费 E2.1–E2.5 无矛盾（§11 引用 5 sibling 实现拆分 + §4.5 提交语义 + §4.4 inspector region + §8.4 sub-handle + §8.5.1 视图工具 + §4.6 undo 栈 forward+inverse 全部对齐）；⑤ renderer-definitions 注册对齐 `registerScadaRenderers` 模式；⑥ 测试句柄 `window.\_\_flux_scada_editor*<cid>`对齐 runtime`window.\__flux_scada_<cid>`模式（双态独立 cid 命名空间）。**2 Nit 落地**：**n-1** §8.4「5 sub-handle」标签与实列 3 项（undoRedo/connection/toolbox）+ property-panel/architecture 折叠入 session 字段不一致 → 改为「3 sub-handle + 折叠声明」；**n-2** §8.5.2 i18n 映射引注「经`scadaErrorI18nKey`」措辞过松（runtime `scada-errors.ts:41-47`硬编码前缀`industrial.scada.error`+ SCADA_ERROR_CODES 数组守卫，editor 新增码会 fallback`.unknown`）→ 改为「复用 `scadaErrorI18nKey` 模式但走 editor 专用映射函数（editor-errors.ts 内独立实现）」。**Round 1 达成共识（连续一轮 0 Blocker/0 Major/0 Minor/0 新增 Nit，2 项 cosmetic Nit 当场落地，未超 3 轮上限）**。本文件可作为 E4.2 注册 + E5.1 编辑态画布组件实现的契约依据。E3 设计 gate（独立 plan）为终轮复核。
- **plan 2026-08-07-1835-1 Phase 1 live baseline 同步（2026-08-07）**：open P1-A（panel 反应式断裂）+ multi P1-07（selection 双源同步）落地修复。**§4.1 session 反应式契约**经画布 `useReducer` session-version 计数器严格满足：`handleSessionChange` 在派发 schema 事件外 bump 计数器 → 触发画布重渲染 → 子 panel（toolbox Undo/Redo disabled、inspector fieldErrors）随之重渲染并读最新 `runtime.session.*`。属性编辑（无 selection 变更）后 Undo 按钮立即启用（无需重选）；Undo 耗尽后按钮置灰。**§4.6 selection 同步**经 `setSessionSelection(next)` 单一入口严格满足：先前 5 条 mutation 路径（remove/group/ungroup/cut/paste）+ load/importConfig（resetSession 清空 selection）静默直写 `session.selection` 致 React mirror 过期 → 现全部路由过 setSessionSelection（同时写 canonical + 触发 onSelectionChange 回调），React mirror 永远与 canonical 一致。focused proof 见 `scada-editor-canvas-reactivity.test.tsx`（属性编辑启用 Undo + Undo 耗尽置灰 + selection mirror 跨 mutation 同步）。

---

## 1. 组件定位

- 本文档定义 `scada-editor-canvas` renderer 的**完整契约**：renderer type 注册（fields/events/regions/handles，对齐 `RendererComponentProps` + runtime `design-renderer.md` 12 节先例）、React 桥接（编辑会话与运行组态分离，save/load 提交语义）、句柄面扩展（addSymbol/removeSymbol/updateSymbol/group/ungroup/undo/redo/save/load 入编辑器扩展句柄面）、编辑态测试句柄 `window.__flux_scada_editor_<cid>`、满足编辑态包络（E1.2 裁定建议值，R7 待人工确认）+ 双态隔离（R5）、消费 E2.1–E2.5 设计（无跨文档矛盾）。
- 本档是编辑器 renderer 的**对外契约面**：消费 E2.1 架构 + E2.2 属性面板 + E2.3 连线 + E2.4 undo-redo + E2.5 工具箱 5 份 sibling 设计，整合为单一 renderer 注册契约供 E4.2 注册 + E5.1 实现。
- 性能目标（**E1.2 裁定建议值，R7 待人工确认**，`editing-envelope-2026-08-06.md §3`）：拖拽响应 **≥30fps @ 选区 ≤1k**（primary）/ ≤10k（extended）；编辑操作响应 **<100ms**；内存 **≤320MB**；编辑器本体 runtime 最终验证留 E6 / E9.2。
- 非目标：不实现任何代码（E5.1+）；不裁定包结构（E4.1 基于本档 §11 实现拆分 + design-architecture.md §4.4 trade-off 裁定）；不定义 ActionSchema 编辑器细节（M3 工具箱 E9）；不定义 InnerEditor 编辑交互细节（M2 后可选项）；不修改 runtime `scada-canvas` renderer（双态隔离在 renderer 注册层落地）。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无 canvas 编辑器 renderer 先例。本 `scada-editor-canvas` renderer 为**首个 Canvas 编辑域 renderer**，对照 runtime `scada-canvas` renderer（design-renderer.md §2）：
  - **scada-canvas**（runtime）：单容器 type 内嵌组态 JSON + 运行态渲染 + `symbol:*` action 派发 + 9 句柄方法（fit/center/getSymbols/getSymbol/setPointValue/getPointTable/exportConfig/importConfig/destroy）+ 测试句柄 `window.__flux_scada_<cid>`；
  - **scada-editor-canvas**（本档）：编辑态画布 + Editor 装配 + 编辑会话 working copy + 9 runtime 句柄 + **8 编辑扩展句柄**（addSymbol/removeSymbol/updateSymbol/group/ungroup/undo/redo/save/load）+ 测试句柄 `window.__flux_scada_editor_<cid>` + 5 DOM regions（palette/inspector/toolbox/statusBar + 内嵌 canvas）+ 不派发 `symbol:*` action（R5 隔离）。
  - **leafer Editor**（render-engines §5 + spike §1.5）：经 `new App({ editor: {} })` 装配 Editor 实例到 `app.editor`（spike §1.5 #1）；Editor extends Group 挂 sky 层（design-engine.md §6 预留）。

### Flux 决策表（renderer 契约层）

| 能力                                                           | 采纳        | 不采纳                                        | 理由（依据                                                                                                                                                                                                                                              |
| -------------------------------------------------------------- | ----------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 单独 type `scada-editor-canvas`（与 `scada-canvas` 双态隔离）  | **P0 采用** | 同 type 双开关（如 scada-canvas mode='edit'） | 双态隔离在 renderer 注册层落地（design-architecture.md §3）：编辑态与运行态是两个独立 React 节点挂载，无共享引擎实例 + 共享 Editor 装配面；防 R5 状态泄漏                                                                                               |
| renderer-definitions 标准注册（fields/events/regions/handles） | **P0 采用** | 自造第二组件协议                              | INV-5「不发明平行组件协议」（runtime design-renderer.md §2 决策表 + new-renderer-introduction-audit.md）；`registerRendererDefinitions` + `RendererComponentProps` 标准模式（quick-reference.md）                                                       |
| React 桥接（fabric ref/effect + dispose 范本 + 适配层节流）    | **P0 采用** | leafer React 适配（不存在）                   | runtime design-renderer.md §8.3 范本 + spike §2.5 适配层节流；Editor 实例 + 编辑会话模型为命令式副作用（useEffect）                                                                                                                                     |
| 句柄面扩展（runtime 9 + 编辑 8）                               | **P0 采用** | 新建独立 ComponentHandleRegistry              | runtime 复用点 #5（editor-initiation §3）：runtime 9 句柄已注册；编辑扩展句柄（addSymbol/removeSymbol/updateSymbol/group/ungroup/undo/redo/save/load）经同一 ComponentHandleRegistry（编辑器 renderer 实例化时注册，对齐 design-renderer.md §8.5 模式） |
| 编辑态测试句柄 `window.__flux_scada_editor_<cid>`              | **P0 采用** | 截图判定 / node-canvas                        | roadmap 测试纪律 + runtime design-renderer.md §8.4；与 runtime `window.__flux_scada_<cid>` 双态隔离（独立 cid 命名空间）                                                                                                                                |
| events 整体 prop（非 events.\* event 规则）                    | **P0 采用** | events.\* event 规则（split）                 | runtime design-renderer.md §5 D-1 裁定（flux-compiler classifyField 仅按顶层 key 精确匹配，无点号路径）；ActionSchema 字面量经 props 通道保留                                                                                                           |

## 3. Flux 中的 renderer/type 定义

- `type: "scada-editor-canvas"`
- `sourcePackage`: **方案 A 裁定**（2026-08-06 E4.1）——`@nop-chaos/flux-renderers-industrial`（编辑器实现放入既有包，经 subpath `/editor` + 独立注册函数 `registerScadaEditorRenderers` 隔离，详见 design-architecture.md §4.4.1）。
- 继承 `BaseSchema`；注册方式：`registerScadaEditorRenderers(registry)`（对齐 `registerScadaRenderers` 模式，runtime design-renderer.md §3），E4.2 首期空壳注册（fields/events 随 E5 补全）。
- 同步清单（roadmap「组件注册」条款）：`examples.manifest.json`、playground registry、i18n 文案（`flux-i18n`，E5/E9 落地）、quick-reference 组件表（E9.2 文档收尾）。

### 与既有 flux 架构的边界（E2.6 Decision）

| 边界         | 约定                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 依赖   | renderer 组件（`scada-editor-canvas.tsx`）属 React 视图结构层；编辑会话模型 + 适配层 + schema 抽取属域核心（无 React 依赖，对齐 `renderer-implementation-guidelines.md` Case 4）                                                                                                                                                                                                                                             |
| 数据流       | 编辑器**不读 flux scope**（编辑期不消费点表绑定）；编辑会话 working copy 存于域内部（ref 持有）；提交（save）时经 `config` prop 同步链触发下游 `scada-canvas` 重建（对齐 design-architecture.md §4.5 提交语义）                                                                                                                                                                                                              |
| 事件流       | 编辑态事件族（Editor 事件族）经适配层**只入栈**（undo 命令栈，design-undo-redo.md）；**不派发** `symbol:*` action（R5 隔离）；schema 级事件 `onSessionChange`/`onSave`/`onLoad`/`onModeChange`/`onSelectionChange` 经 `helpers.dispatch` 派发                                                                                                                                                                                |
| 注册机制     | `scada-editor-canvas` 经 `registerRendererDefinitions` 标准注册；图元库面板复用 runtime `registerScadaSymbol` 24 内置 + E2.2 抽取的 props schema（不重复注册图元定义）                                                                                                                                                                                                                                                       |
| 测试句柄     | dev/test 下经 `window.__flux_scada_editor_<cid>` 暴露编辑会话模型 + 适配层 + Editor 实例 + 3 sub-handle（undoRedo/connection/toolbox，property-panel/architecture 折叠入 session 字段，详见 §8.4 完整契约）；复用 runtime `window.__flux_scada_<cid>` 投影下游 `scada-canvas` 场景树断言（双态隔离：两套独立 cid 命名空间）                                                                                                  |
| 平台能力复用 | 编辑器复用 runtime 引擎层（`scada-engine.ts` 18 命令面 + applyDiff + reset，design-engine.md §8.2）+ ConfigAdapter nodeById O(1) + 图元注册表（24 内置 + listScadaSymbols 只读 API）+ JSON 序列化（parse/validate/serialize/diff，design-renderer.md §4.3）+ 句柄面扩展（runtime 9 + 编辑 8，design-renderer.md §8.5）+ sky 交互覆盖物族 + 测试句柄 + benchmark 基座；**禁止重复实现**（roadmap Cross-Cutting 平台能力复用） |

## 4. schema 设计（ScadaEditorCanvasSchema 完整契约）

### 4.1 ScadaEditorCanvasSchema（renderer 字段，完整版）

```typescript
interface ScadaEditorCanvasSchema extends BaseSchema {
  type: 'scada-editor-canvas';
  /** 编辑会话初始组态（启动编辑器时装载的画面）；缺省为空场景（EMPTY_SCADA_CONFIG，对齐 runtime design-renderer.md §8.5） */
  config?: string | ScadaConfig;
  /** 画布尺寸（px）；缺省填满容器 */
  width?: number;
  height?: number;
  /** 编辑态运行模式（编辑态 / 预览运行态双向切换）；缺省 'edit' */
  mode?: 'edit' | 'preview';
  /** 提交语义策略（design-architecture.md §4.5）：缺省 'manual'（显式 save 句柄触发），可选 'auto'（每次编辑会话变更即同步） */
  commitPolicy?: 'manual' | 'auto';
  /** 初始视口策略（与 runtime ScadaCanvasSchema.viewport 一致，复用引擎 fit/center 命令） */
  viewport?: { fit?: 'contain' | 'fill'; center?: boolean };
  /** regions：图元库面板（E5.2）/ 属性面板（E5.3）/ 工具箱（E9.1）/ 状态栏 等 DOM 子区域 */
  palette?: RegionSchema; // 图元库面板
  inspector?: RegionSchema; // 属性面板
  toolbox?: RegionSchema; // 工具箱
  statusBar?: RegionSchema; // 状态栏（含 undo/redo 边界提示，design-undo-redo.md §4.5）
  /** 事件（schema 级，整体 prop，对齐 runtime design-renderer.md §5 D-1） */
  events?: ScadaEditorCanvasEvents;
}

interface ScadaEditorCanvasEvents {
  /** 编辑会话组态变更（每次编辑操作入栈后派发，载荷含 canUndo/canRedo/selection/mode） */
  onSessionChange?: ActionSchema;
  /** 提交（保存）：编辑会话组态 → 经 config 同步链触发下游 scada-canvas 重建（载荷含 serializedConfig: string） */
  onSave?: ActionSchema;
  /** 加载：外部 config 装入编辑会话（替换 working copy + 重置 undo/redo 栈） */
  onLoad?: ActionSchema;
  /** 模式切换（edit ↔ preview） */
  onModeChange?: ActionSchema;
  /** 选中变化（载荷含 listNodeIds） */
  onSelectionChange?: ActionSchema;
  /** 编辑器就绪（Editor 装配 + 初始 config 装载完成，对应 runtime onReady） */
  onReady?: ActionSchema;
  /** 编辑器错误（config 校验失败 / Editor 装配失败 / 适配层异常，载荷含 code + message） */
  onError?: ActionSchema;
}
```

### 4.2 双态隔离机制（R5，对齐 design-architecture.md §4.2）

编辑器 renderer 与 runtime `scada-canvas` renderer 的双态隔离在 renderer 注册层 + Editor 装配 + 事件派发链三层落地（详见 design-architecture.md §4.2 三层隔离机制 + 4 项不泄漏验证）：

1. **图元 editable 开关**：编辑态 `scada-editor-canvas` renderer 装配时给所有图元注入 `editable:true`；运行态 `scada-canvas` renderer 不注入；
2. **编辑会话组态分离**：编辑器持 working copy（域内部 ref），运行态 `scada-canvas` 持独立 config（props 经 config 同步链）；
3. **事件派发链隔离**：编辑态事件族（Editor 事件族）经适配层**只入栈**（design-undo-redo.md §4.6），**不派发** `symbol:*` action；运行态 `scada-canvas` 经 `createNormalizedActionEvent` + `helpers.dispatch` 派发 `symbol:*` action（runtime design-renderer.md §8.2）。

**不泄漏验证**（design-architecture.md §4.2 4 项）：editable 不进组态 JSON 序列化（`rg "editable" serialization/*.ts` 返回空，live 核实）/ working copy 不直接修改下游 scada-canvas config / 适配层不调 helpers.dispatch for symbol:\* / unmount 后无残留。

### 4.3 renderer fields 规则（D-1 裁定同步，对齐 runtime design-renderer.md §5）

`renderer-definitions.ts` 注册的 fields 规则（I4.2 空壳 / E5 完整落地）：

| 字段                                                                                                | 规则                              | 说明                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `config`                                                                                            | `{ key: 'config', kind: 'prop' }` | source-enabled（静态 / 表达式 / data-source，对齐 runtime）                                                                                                                                                                                |
| `width`/`height`                                                                                    | `{ kind: 'prop' }`                | 画布尺寸（缺省容器自适应）                                                                                                                                                                                                                 |
| `mode`/`commitPolicy`/`viewport`                                                                    | `{ kind: 'prop' }`                | 编辑态运行模式 + 提交策略 + 初始视口                                                                                                                                                                                                       |
| `palette`/`inspector`/`toolbox`/`statusBar`                                                         | `{ kind: 'region' }`              | DOM 子区域                                                                                                                                                                                                                                 |
| `events`（onSessionChange/onSave/onLoad/onModeChange/onSelectionChange/onReady/onError 为对象字段） | `{ kind: 'prop' }`                | **整体 prop（非 events.\* event 规则）**（runtime design-renderer.md §5 D-1 裁定：flux-compiler classifyField 仅按顶层 key 精确匹配；ActionSchema 字面量经 props 通道保留，事件派发经 `createNormalizedActionEvent` + `helpers.dispatch`） |
| `id`/`className`/`disabled`/`visible`/`hidden`/`testid`                                             | `{ kind: 'meta' }`                | 继承 BaseSchema 元数据通道                                                                                                                                                                                                                 |

### 4.4 regions 与 slot 约定

| region      | params                                             | 说明                                                                                                    |
| ----------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `palette`   | `[]`（无参数）                                     | 图元库面板（E5.2）：列出 24 内置图元（`listScadaSymbols()` 只读），支持拖入放置                         |
| `inspector` | `[{ nodeId }]`                                     | 属性面板（E5.3）：消费 schema 抽取 + 字段六类（design-property-panel.md §5），nodeId 来自当前 selection |
| `toolbox`   | `[]`（无参数）                                     | 工具箱（E9.1）：视图工具 + 对齐分布层级 + 复制粘贴 + 导入导出 + 图元库浏览（design-toolbox.md §4）      |
| `statusBar` | `[{ canUndo, canRedo, viewport, selectionCount }]` | 状态栏：undo/redo 边界提示（design-undo-redo.md §4.5）+ 当前视口显示 + selection 计数                   |

**根容器 slot**：`data-slot="scada-editor-canvas"`（与运行态 `scada-canvas` 区分，双态隔离在 DOM marker 层落地）；canvas 元素 `data-slot="scada-editor-canvas-canvas"`（对齐 runtime §10 + plan 2026-08-04-1558-3 Phase 1 落地模式）。

### 4.5 提交语义（save/load，对齐 design-architecture.md §4.5）

| commitPolicy     | 触发                                                     | 路径                                                                                                                                                                                                                                                                                                            |
| ---------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manual`（缺省） | 用户显式调用 `component:save()` 句柄                     | working copy → `serializeScadaConfig(workingConfig)` → 经 `props.events.onSave` 派发（载荷含 serializedConfig）或上层 host 写回源（如服务端 / localStorage）→ 触发 `scada-canvas` props.config 变化 → `diffScadaConfig(committedBaseline, workingConfig)` → `engine.applyDiff` 增量应用                         |
| `auto`           | 每次编辑操作后 notifySession（onSessionChange 派发时机） | 同 manual 路径，但每次变更即 save+onSave（编辑即持久化）。**实现（plan 2026-08-07-1835-2 Phase 2 / P1-05 方案 A）**：`notifySession` 在 `commitPolicy='auto'` 且非事务期（`undoRedo.isInTransaction=false`）时触发 `ctx.save()`；transform 拖拽逐帧由 `commitTransaction` 的 notifySession 兜底（防逐帧序列化） |

`component:load(config)` 句柄替换 working copy + 重置 undo/redo 栈（design-undo-redo.md §8.2）+ 派发 `scada-editor:load`（payload=parsed config，host `events.onLoad` 接收，plan 2026-08-07-1835-2 Phase 2 / P1-04）；`component:exportConfig()` 导出 working copy 序列化结果（不修改 committedBaseline）。

**controlled 推回（plan 2026-08-07-1835-2 Phase 2 / P1-09 方案 A）**：host 改 `config` prop → `useEditorEngine` effect watcher 监听 `initialConfig` 变化 → `runtime.load(next)`（初次 mount 跳过，避免 load↔config 循环）；host 改 `mode` prop → `runtime.switchMode(next)`。三态 ownership（local/controlled/scope）仍为 future work（§4.5 已注明）。

### 4.6 运行期状态归属

| 状态                                                                                        | Owner                    | 说明                                                                       |
| ------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------- |
| Editor 实例（app.editor）                                                                   | **域内部（ref 持有）**   | `useRef` 惰性创建（env 引用变化不重建，INV-4）；卸载时 destroy；不进 scope |
| 编辑会话 working copy（workingConfig/committedBaseline/undoStack/redoStack/selection/mode） | **域内部（ref 持有）**   | design-architecture.md §4.5；不进 scope；提交时经 config 同步链传递        |
| 当前选中图元（selection nodeId 列表）                                                       | **域内部**               | `editor.list` ↔ session.selection 双向同步（适配层维护）                   |
| 画布尺寸                                                                                    | **域内部 + resize 同步** | ResizeObserver（复用 runtime 引擎 setSize，design-renderer.md §8.3）       |
| 测试句柄                                                                                    | **dev/test 投影**        | `window.__flux_scada_editor_<cid>`（§8.4 完整契约）                        |
| 加载/错误状态                                                                               | **local（派生）**        | region 切换依据（loading/empty region，复用 runtime 设计）                 |

### 4.7 满足编辑态包络（E1.2 裁定建议值，R7 待人工确认）

| 包络维度                | 裁定建议值                   | renderer 契约层落地点                                                                                                                        |
| ----------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 拖拽响应 fps 阈值       | ≥30fps @ 选区 ≤1k（primary） | §8.3 React 桥接经适配层节流（transform 事件族节流起止帧，design-undo-redo.md §4.2 + spike §2.5）+ §4.2 双态隔离（Editor 仅作用于编辑态）     |
| 编辑操作响应延迟        | <100ms（per-call）           | editor.move per-call 同步 8–10ms（n≤1k，spike §3.4）远低于；适配层读 target 几何叠加极小                                                     |
| 选区规模上限            | ≤1k primary / ≤10k extended  | renderer 不硬限选区规模（用户行为决定）；undo 栈 + diff 应用按选区规模线性增长，extended（≤10k）有 7% 余量风险（留 E6/E9.2 数值化确认）      |
| 内存上限                | ≤320MB（运行态红线不变）     | 编辑会话 working copy + undo 栈（forward + inverse 增量 diff，design-undo-redo.md §4.1.2，不用全量快照 R4）+ 10 万图元 working copy ≈ 11.6MB |
| 编辑器本体 runtime 验证 | 留 E6 / E9.2                 | 本档为 E6/E9.2 验证预留测量句柄 `window.__flux_scada_editor_<cid>`（§8.4 完整契约）                                                          |

## 5. 字段分类（完整字段表）

| 字段                                                                                                                | 分类                   | 说明                                                                             |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| `config`                                                                                                            | prop (source-enabled)  | 编辑会话初始组态（启动装载画面）                                                 |
| `width`/`height`                                                                                                    | prop                   | 画布尺寸（缺省容器自适应）                                                       |
| `mode`/`commitPolicy`/`viewport`                                                                                    | prop                   | 编辑态运行模式 + 提交策略 + 初始视口                                             |
| `palette`/`inspector`/`toolbox`/`statusBar`                                                                         | region                 | 编辑器 DOM 子区域                                                                |
| `events`（onSessionChange/onSave/onLoad/onModeChange/onSelectionChange/onReady/onError 为对象字段）                 | prop                   | ActionSchema 对象整体经 props 通道保留（对齐 runtime design-renderer.md §5 D-1） |
| `id`/`className`/`disabled`/`visible`/`hidden`/`testid`                                                             | meta                   | 继承 BaseSchema 元数据通道                                                       |
| Editor 实例 + 编辑会话 working copy（workingConfig/committedBaseline/undoStack/redoStack/selection/mode/clipboard） | **域内部（ref 持有）** | 不进 scope（INV-4）；ref 持有，提交时经 config 同步链传递                        |
| 测试句柄                                                                                                            | **dev/test 投影**      | `window.__flux_scada_editor_<cid>`（§8.4）                                       |

## 6. 图层与场景树（对应 regions 约定）

> 编辑器复用 runtime leafer App 三层模型（ground/tree/sky，design-engine.md §6 + design-architecture.md §6），并在 sky 层增加 Editor 独立 Group：

| 层                 | leafer 载体                      | 编辑器 renderer 职责                                                                                                                              |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 背景层             | `App.ground`                     | 画面底色/网格背景（复用 runtime 引擎配置）；编辑态可加额外网格点状/标尺装饰（M3 工具箱可选）                                                      |
| 图元层             | `App.tree`（`type: 'viewport'`） | 全部组态图元子树（编辑态：图元节点 editable:true 注入）；命中检测/渲染帧事件均挂此层                                                              |
| 交互覆盖层（运行） | `App.sky` InteractionOverlay     | 编辑态关闭（避免与 Editor 选区反馈冲突）；预览模式启用                                                                                            |
| 交互覆盖层（编辑） | `App.sky` Editor（独立 Group）   | 方案 A（design-architecture.md §4.3）：EditBox/EditSelect/simulateTarget + 8 向 resizePoints + rotatePoints + dragPoint；编辑态启用，预览模式卸载 |
| HTML 覆盖层        | React DOM（canvas 外层）         | palette/inspector/toolbox/statusBar 4 DOM regions（经 `@nop-chaos/ui` 既有样式体系）；不进入场景树                                                |

## 7. 运行期状态归属（见 §4.6）

## 8. 事件、动作与组件句柄能力

### 8.1 schema 级事件（props.events）

- `onSessionChange`：编辑会话组态变更（载荷 `{ canUndo, canRedo, selection: string[], mode }`）；
- `onSave`：提交（载荷 `{ serializedConfig: string }`）；
- `onLoad`：加载外部 config 装入编辑会话；
- `onModeChange`：模式切换（载荷 `{ mode }`）；
- `onSelectionChange`：选中变化（载荷 `{ listNodeIds: string[] }`）；
- `onReady`：编辑器就绪（Editor 装配 + 初始 config 装载完成）；
- `onError`：编辑器错误（载荷 `{ code, message }`）。

派发路径：`createNormalizedActionEvent({ type, ...payload })`（单参数签名 `renderer-helpers.ts:98`，对齐 runtime design-renderer.md §8.2 + spike §2.5 关键约束：禁直传 leafer 事件循环引用）→ `helpers.dispatch(action, { event: normalized, scope })`。

### 8.2 编辑态事件族 → 适配层（不派发运行态 action，design-architecture.md §4.6）

| 事件族                                        | 适配层处理                                                                                                                                                                  | 是否派发 action                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `editor.move` / `scale` / `rotate` / `skew`   | 抽纯 payload + nodeId 映射 → 入栈（节流起止帧，design-undo-redo.md §4.2）+ 更新 working copy 几何                                                                           | **否**（仅入栈 + working copy 更新） |
| `editor.select` / `hover`                     | 直接映射 `{type, listNodeIds}` → 更新 session.selection → 派发 `onSelectionChange`                                                                                          | **否**（仅 schema 级事件）           |
| `editor.group` / `ungroup`                    | 转结构 diff + nodeId 重映射 → 入栈（design-undo-redo.md §4.3）+ 更新 working copy 树结构                                                                                    | **否**                               |
| `editor.open_group` / `close_group`           | 直接映射（低频）→ 更新 session 进入/退出组编辑态                                                                                                                            | **否**                               |
| `innerEditor.open` / `before_close` / `close` | 直接映射（低频）→ 更新 session InnerEditor 状态（依赖 `@leafer-in/text-editor` 插件装载，spike 约束 #8 + design-architecture.md §4.6）                                      | **否**                               |
| **预览模式（mode:'preview'）**                | Editor 卸载 + 图元 `editable:false` + InteractionOverlay 启用 → 行为完全等同运行态 `scada-canvas` → **派发** `symbol:*` action（经 runtime design-renderer.md §8.2 派发链） | **是**（预览模式即运行态行为）       |

### 8.3 React 桥接（fabric ref/effect + dispose 范本，对齐 runtime design-renderer.md §8.3）

- **生命周期**：
  - `mount`：`useEffect` 内 `new App({ editor: {} })` 装配 Editor（spike §1.5 #1）→ 装载初始 config（parseScadaConfig + validateScadaConfig）→ 注入 `editable:true` → 挂测试句柄；清理函数内 `destroy()`（幂等）；
  - `unmount`：destroy 释放 Editor + App + 编辑会话 + 测试句柄；
  - `resize`：ResizeObserver → `engine.setSize(w, h)`（防抖到帧）；
- **props 同步**：
  - `config` 变化 → 装载到编辑会话 working copy（不直接触发下游 scada-canvas）；
  - `mode` 变化 → 切换 Editor 装配（edit）或卸载（preview）；
  - `width`/`height`/`viewport` 变化 → 引擎命令式 API；
- **React Compiler 基线**：Editor 实例 + 编辑会话为命令式副作用，生命周期放 `useEffect`；渲染函数内不触碰 Editor/session（INV-5）。
- **销毁状态可见性**（对齐 runtime design-renderer.md §8.3 OP-4）：`component:destroy` 后 wrapper `data-status` 反映 `destroyed` 态。

### 8.4 编辑态测试句柄契约（完整版，对齐 design-architecture.md §8.4）

dev/test 构建下编辑器创建后写入 `window.__flux_scada_editor_<cid>`（cid 来自 `RendererResolvedProps.cid`，与 runtime `window.__flux_scada_<cid>` 双态隔离：独立 cid 命名空间）：

```typescript
interface ScadaEditorTestHandle {
  /** 编辑会话模型（只读投影） */
  session: {
    workingConfig: ScadaConfig;
    committedBaseline: ScadaConfig;
    canUndo: boolean;
    canRedo: boolean;
    selection: string[];
    mode: 'edit' | 'preview';
  };
  /** Editor 实例（leafer Editor） */
  editor: unknown; // 避免强类型循环导入（对齐 runtime design-engine.md §8.3 注记）
  /** 引擎实例（复用 scada-engine 时为 ScadaCanvasEngine） */
  engine: unknown; // ScadaCanvasEngine 实例
  /** App 实例 */
  app: unknown; // leafer App 实例
  /** 程序化操作（e2e 用） */
  switchMode(mode: 'edit' | 'preview'): void;
  setSelection(nodeIds: string[]): void;
  clearSelection(): void;
  save(): string; // 返回 serializedConfig
  load(config: string | ScadaConfig): void;
  /** 3 sub-handle（undoRedo/connection/toolbox 各自声明）+ property-panel/architecture 折叠入 session 字段 + 顶层方法（5 份 sibling 设计各自声明，整合为单一 test-handle） */
  undoRedo: ScadaEditorUndoRedoTestHandle; // design-undo-redo.md §8.3
  connection: ScadaEditorConnectionTestHandle; // design-connection.md §8.3
  toolbox: ScadaEditorToolboxTestHandle; // design-toolbox.md §8.3
}
```

> 完整契约经 `window.__flux_scada_editor_<cid>` 暴露；e2e 经 `page.evaluate` 程序化断言场景树/编辑会话/选区/undo 栈（roadmap 测试纪律：禁截图判定）。

### 8.5 组件句柄（component:<method>，runtime 9 + 编辑 8）

> runtime 复用点 #5（editor-initiation §3 + roadmap Cross-Cutting）：runtime 9 句柄 + 编辑扩展 9 句柄**合并注册**（plan 2026-08-07-1835-2 Phase 2 / P1-06：`useEditorHandles` 注册全部 18 方法，runtime 9 委派 EditorEngineRuntime 等价能力，destroy 置 `data-status="destroyed"`；此前 runtime 9 对 editor 实例不可达）。

#### 8.5.1 runtime 9 句柄（runtime `scada-canvas` 既有，编辑器合并注册——plan 2026-08-07-1835-2 Phase 2 / P1-06）

| 句柄                                                          | 说明                                                                                                                                  | 失败路径                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `component:fit()` / `component:center()`                      | 视口命令（design-toolbox.md §4.1 复用）                                                                                               | `not-mounted`/`not-visible`                           |
| `component:getSymbols()` / `component:getSymbol(id)`          | 场景树只读（编辑会话 working copy 投影）                                                                                              | `not-mounted`/`symbol-not-found`                      |
| `component:setPointValue(pointId, value)`                     | 点表写入（编辑态通常不调用，运行态语义保留）                                                                                          | `not-mounted`/`point-not-found`/`invalid-point-value` |
| `component:getPointTable()`                                   | 点表快照                                                                                                                              | `not-mounted`                                         |
| `component:exportConfig()` / `component:importConfig(config)` | 序列化契约（design-toolbox.md §4.4 复用；编辑器 exportConfig 导出 working copy / importConfig 替换 working copy + 重置 undo/redo 栈） | `not-mounted`/`invalid-config`                        |
| `component:destroy()`                                         | 命令式销毁（`data-status` 转为 `destroyed`，后续句柄返回 `not-mounted`）                                                              | `not-mounted`                                         |

#### 8.5.2 编辑扩展 8 句柄（编辑器 renderer 实例化时注册，对齐 design-architecture.md §8.5）

| 句柄                                    | 说明                                                                                                                                | 失败路径                                                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `component:addSymbol(node)`             | 添加图元（编辑会话 working copy + undo 栈结构 diff，design-undo-redo.md §4.3）                                                      | `not-mounted`/`invalid-node`（node 不符合 ScadaSymbolNode 形状）/`duplicate-id`（id 已存在） |
| `component:removeSymbol(nodeId)`        | 删除图元（编辑会话 working copy + undo 栈结构 diff）                                                                                | `not-mounted`/`symbol-not-found`                                                             |
| `component:updateSymbol(nodeId, patch)` | 更新图元属性（编辑会话 working copy + undo 栈属性 diff，design-property-panel.md §4.5 + design-connection.md §4.2 connection 写入） | `not-mounted`/`symbol-not-found`/`invalid-patch`（patch 字段非法）                           |
| `component:group(nodeIds)`              | 成组（结构 diff，design-undo-redo.md §4.3 + spike 约束 #7）                                                                         | `not-mounted`/`empty-selection`/`symbol-not-found`                                           |
| `component:ungroup(groupId)`            | 解组（结构 diff）                                                                                                                   | `not-mounted`/`symbol-not-found`/`not-a-group`（type !== 'scada-group'）                     |
| `component:undo()` / `component:redo()` | undo/redo（design-undo-redo.md §4.1 apply forward/inverse）                                                                         | `not-mounted`/`no-undo`（undoStack 空）/`no-redo`（redoStack 空）                            |
| `component:save()`                      | 提交（§4.5：序列化 working copy + 经 onSave 或同步链触发下游）                                                                      | `not-mounted`                                                                                |
| `component:load(config)`                | 加载（替换 working copy + 重置 undo/redo 栈）                                                                                       | `not-mounted`/`invalid-config`                                                               |

**错误码注册表 + i18n 文案**：复用 runtime `SCADA_ERROR_CODES` 注册模式（design-renderer.md §8.5）+ 新增编辑器错误码（`invalid-node`/`duplicate-id`/`invalid-patch`/`empty-selection`/`not-a-group`/`no-undo`/`no-redo`），code→i18n key 映射复用 `scadaErrorI18nKey` 模式但走 editor 专用映射函数（`editor-errors.ts` 内独立实现，前缀 `industrial.scada.editor.error.<code>`；runtime `scadaErrorI18nKey` 硬编码前缀 `industrial.scada.error` + SCADA_ERROR_CODES 数组守卫，editor 新增码不在 runtime 数组内会返回 `.unknown` fallback，故 editor 需自有映射），locale 文案在 `flux-i18n`（E5 落地）。

## 9. 数据源、表达式、导入能力接入点

- 编辑器 renderer**不接数据源**（编辑期不消费点表绑定，R5 隔离）；
- 预览模式（mode:'preview'）切换为运行态行为，复用 runtime `useScopeSelector` + flux-formula 订阅 scope（design-renderer.md §9）；
- 图片资源：图元背景图经引擎图片缓存 + 桥接层 `RendererEnv.fetcher`（INV-1，对齐 runtime）；
- 表达式：编辑期不参与求值；属性面板绑定/状态/动画/事件声明**只写声明结构**（design-property-panel.md §7）；
- i18n：图元库/属性面板/工具箱/状态栏/错误文案经 `flux-i18n`（复用 runtime）。

## 10. 样式与 DOM marker 约定

| DOM 元素    | marker class                     | data-slot                    |
| ----------- | -------------------------------- | ---------------------------- |
| 根容器      | `nop-scada-editor-canvas`        | `scada-editor-canvas`        |
| canvas 画布 | `nop-scada-editor-canvas-canvas` | `scada-editor-canvas-canvas` |
| 图元库面板  | `nop-scada-editor-palette`       | `scada-editor-palette`       |
| 属性面板    | `nop-scada-editor-inspector`     | `scada-editor-inspector`     |
| 工具箱      | `nop-scada-editor-toolbox`       | `scada-editor-toolbox`       |
| 状态栏      | `nop-scada-editor-status-bar`    | `scada-editor-status-bar`    |
| 加载占位    | `nop-scada-editor-loading`       | `scada-editor-loading`       |
| 错误提示    | `nop-scada-editor-error`         | `scada-editor-error`         |

- 根容器尺寸策略：`width: 100%; height: 100%`（`width`/`height` props 显式覆盖）；canvas 绝对定位铺满根容器（对齐 runtime design-renderer.md §10）；
- DOM regions 使用 `@nop-chaos/ui` 既有样式体系（不新增 token 命名空间，对齐 `new-renderer-introduction-audit.md §3F`）；
- 主题独立性（roadmap Cross-Cutting + runtime design-renderer.md §10）：CSS 变量 + 稳定 class 名，不引入 React ThemeProvider；
- 不产生 canvas 内 DOM marker（Editor 渲染在 leafer sky 层 + InteractionOverlay 模式，对齐 runtime design-engine.md §10）。

## 11. 实现拆分建议（完整版，E4.1 裁定方案 A 落地，2026-08-06）

```
packages/flux-renderers-industrial/src/editor/   （方案 A 裁定，经 subpath /editor + 独立注册函数隔离；不新建包）
├── editor-engine.ts            # ScadaEditorEngine（方案 B 独立类 / 方案 A 复用 scada-engine + 编辑会话模型）
├── editor-session.ts           # ScadaEditorSession：working copy + undo/redo 栈 + selection + mode（design-architecture.md §4.5）
├── editor-adapter.ts           # 适配层：leafer Editor 事件族 → 抽纯 payload + nodeId 映射 → 入栈（节流起止帧，spike §2.5）
├── editor-test-handle.ts       # window.__flux_scada_editor_<cid> 挂载/移除（§8.4 完整契约）
├── inspector/                  # 属性面板（design-property-panel.md §11）
│   ├── schema-extractor.ts     # extractPanelFields（纯逻辑单测先行）
│   ├── field-errors.ts         # parseFieldErrors（纯逻辑单测）
│   └── panel-*.tsx             # UI 组件（@nop-chaos/ui）
├── connection/                 # 连线（design-connection.md §11）
│   ├── anchor-snap.ts          # 端点吸附算法（纯逻辑单测先行）
│   ├── connection-adapter.ts   # 端点拾起/拖动/释放交互
│   ├── connection-link.ts      # recomputeConnectionAnchor 联动算法（纯逻辑单测先行）
│   └── connection-overlay.ts   # 吸附高亮/虚线提示
├── undo-redo/                  # undo-redo（design-undo-redo.md §11）
│   ├── compute-inverse.ts      # computeInverse（push 时预计算 inverse diff，纯逻辑单测先行）
│   ├── undo-stack.ts           # UndoStackEntry 栈管理
│   ├── operation-coalesce.ts   # 跨操作合并规则（M2 基础 + M3 完善）
│   └── undo-redo-adapter.ts    # 编辑操作事件 → 入栈（事务语义 + 节流起止帧）
├── toolbox/                    # 工具箱（design-toolbox.md §11）
│   ├── align-distribute.ts     # 对齐分布算法（纯逻辑单测先行）
│   ├── z-order.ts              # 层级（symbols 数组重排，纯逻辑单测先行）
│   ├── clipboard.ts            # 剪贴板模型 + copy/cut/paste
│   └── toolbox-panel.tsx       # 工具箱 UI
├── renderer/
│   ├── scada-editor-canvas.tsx # 主渲染器：RendererComponentProps 装配 + 桥接（E5.1）
│   ├── editor-errors.ts        # SCADA_ERROR_CODES + 编辑器扩展错误码 + i18n 映射（§8.5.2）
│   └── hooks/
│       ├── use-editor-engine.ts    # Editor 实例生命周期（mount/unmount/resize，§8.3）
│       ├── use-editor-session.ts   # 编辑会话模型 + undo/redo 状态
│       ├── use-editor-events.ts    # Editor 事件族 → 适配层（不派发运行态 action，§8.2）
│       └── use-editor-handles.ts   # component:* 句柄注册（runtime 9 + 编辑 8，§8.5）
├── schemas.ts                   # ScadaEditorCanvasSchema 类型（§4.1 完整）
├── renderer-definitions.ts      # registerScadaEditorRenderers：fields/events/regions/handles（§4.3 完整 + E4.2 注册）
└── index.ts                     # 公共面：registerScadaEditorRenderers + 类型
```

- 拆分依据（对齐 runtime design-renderer.md §11 + `renderer-implementation-guidelines.md` Case 4）：编辑会话模型 + 适配层 + 5 域核心算法为域核心（无 React 依赖，纯逻辑单测先行）；renderer 组件 + hooks 为 React 视图结构层。
- 实现阶段映射：E4.1（包结构裁定，方案 A vs B）→ E4.2（注册 `scada-editor-canvas` 空壳 + 引入 `@leafer-in/editor` + `@leafer-in/text-editor` 依赖）→ E5.1（编辑态画布组件 + 双态切换 + React 桥接）→ E5.2（图元库面板 + 拖拽放置）→ E5.3（属性面板 schema）→ E5.4（句柄扩展 + save/load）→ E7.1（端点吸附连线）→ E7.2（多选/框选 + undo-redo）→ E9.1（工具箱完整）→ E9.2（M3 收尾 + benchmark 复测）。

## 12. 风险、取舍与后续阶段

### 12.1 renderer 契约审计摘要（设计期预审，完整五边界审计 E6/E8/E10 落地）

> E6.1 / E8.1 / E10.1 gate 将执行**完整五边界审计**（roadmap 强制原则审计，结论作 gate 输入）；本节为设计期预审快照（对齐 runtime design-renderer.md §12.2 模式）：

| 审计面                      | 设计期结论                                                                                                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. IO 边界（INV-1/INV-2）   | 编辑器本体无直接 `fetch`/`WebSocket`/`localStorage`/`history`（导入导出文件 IO 经 host）；预览模式复用 runtime RendererEnv；**无新 IO 类型需求，不扩 env**                         |
| B. 复用边界（INV-3）        | 表达式/scope/action/UI/序列化/引擎命令/句柄/测试句柄全部复用平台能力（§3 + §9）；无自造 fetch pipeline/DSL                                                                         |
| C. 内部 state 边界（INV-4） | Editor 实例 + 编辑会话 working copy + undoStack/redoStack/clipboard 全为域内部（§4.6），高频更新不进 scope；测试句柄为 dev/test 投影；component handles 经 ComponentHandleRegistry |
| D. 契约边界（INV-5）        | 严格 `RendererComponentProps`（§3 + §8）；数据从 props.props/meta/regions/events/helpers 读；render path 无 scope.get/副作用                                                       |
| E. 扩展点边界               | schema 级事件（ActionSchema） + 4 regions（palette/inspector/toolbox/statusBar）+ 编辑器扩展句柄（addSymbol/removeSymbol/...）；不塞实现细节字段                                   |
| F. 样式边界                 | 8 个 marker + data-slot（§10）；无 BEM/新 token 命名空间；CSS 变量 + 稳定 class 名                                                                                                 |

### 12.2 风险与取舍

- **R5 双态隔离**：§4.2 三层隔离 + 4 项不泄漏验证；与 runtime `scada-canvas` 在 renderer 注册层独立（不共享引擎实例 + 不共享 Editor 装配 + cid 命名空间独立）；
- **R7 编辑态包络**：§4.7 五项包络对齐 E1.2 裁定建议值（R7 待人工确认）；编辑器本体 runtime 最终验证留 E6 / E9.2；
- **renderer 契约审计**：设计期预审快照（§12.1）+ E6.1/E8.1/E10.1 gate 完整五边界审计落地；
- **错误码 i18n 注册**：§8.5.2 编辑器扩展错误码与 runtime `SCADA_ERROR_CODES` 注册表统一管理（不新建第二套）；
- **架构冲突记录**：若 E5.1 实现期发现本契约与 `docs/architecture/`（renderer-runtime/模块边界）冲突，按 plan Failure Paths `design-contract-conflict` 记录并升级。

### 12.3 后续阶段

| 阶段      | 内容                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| E3        | 设计 gate（独立 plan，6 份设计文档终轮复核 + 跨文档一致性核对）                                                          |
| E4.1      | 包结构裁定（方案 A vs B，依据 design-architecture.md §4.4 + 本档 §11）                                                   |
| E4.2      | 注册 `scada-editor-canvas` 空壳 + 引入 `@leafer-in/editor` + `@leafer-in/text-editor`（InnerEditor 插件，spike 约束 #8） |
| E5.1      | 编辑态画布组件 + 双态切换（落地本档 React 桥接 + 句柄扩展 + 测试句柄）                                                   |
| E5.2      | 图元库面板 + 拖拽放置                                                                                                    |
| E5.3      | 属性面板 schema 实现                                                                                                     |
| E5.4      | 句柄面扩展 + save/load（runtime 9 + 编辑 8）                                                                             |
| E7.1      | 端点吸附连线实现                                                                                                         |
| E7.2      | 多选/框选 + undo-redo 实现                                                                                               |
| E9.1      | 工具箱完整                                                                                                               |
| E9.2      | M3 收尾 + benchmark 复测 + 文档收尾                                                                                      |
| E6/E8/E10 | M1/M2/M3 整体 gate（五边界完整审计）                                                                                     |
