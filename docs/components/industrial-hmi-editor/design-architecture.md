# 编辑器架构设计 design-architecture.md

> 日期：2026-08-06
> 版本：v1（E2.1 产出）
> 上游：选型裁定 `docs/analysis/industrial-hmi-editor/selection-gate-2026-08-06.md`（§3 路径 A 维持 + §5 9 条设计约束 + §6 watch-only residual）、编辑态包络 `docs/analysis/industrial-hmi-editor/editing-envelope-2026-08-06.md`（§3 五项裁定建议值 + §3.2 双态隔离声明）、spike 报告 `docs/analysis/industrial-hmi-editor/spike-2026-08-05.md`（§1.4 适配层 cost + §2.5 flux action 派发链 + §3.6 覆盖物方案 A）、立项材料 `docs/components/industrial-hmi/editor-initiation.md`（§3 复用点三态 + §6 R5 双态隔离）
> 下游：`design-property-panel.md`（E2.2）、`design-connection.md`（E2.3）、`design-undo-redo.md`（E2.4）、`design-toolbox.md`（E2.5）、`design-renderer.md`（E2.6）；E4.1 包结构裁定 / E5.1 编辑态画布组件 + 双态切换 / E7.2 多选 undo 落地的权威架构输入
> 依据：roadmap `docs/components/roadmap-industrial-hmi-editor.md`（E2.1 + Cross-Cutting 双态隔离 / 平台能力复用 / spike 先行纪律 / 文档共识审查）+ E2 plan `docs/plans/2026-08-06-1931-2-e2-editor-design-documents.md`

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent（fresh session，不复用编写者上下文）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。轮次记录如下：

- **Round 1（2026-08-06，fresh session 独立子 agent `ses_029031bedffeYSIyS3Sl64eWuo`）**：判定 `AGREE`——0 Blocker / 0 Major / 0 Minor / 1 Nit。8 项核对逐项 PASS：① 复用点三态标注（10 复用点 + 2 新造面 + 3 衔接扩展）逐项 live 一致（无 reuse-overclaim，抽查 `use-scada-handles.ts:11-21` + `scada-engine.ts` applyDiff:314 + `serialization/*.ts` 经 `rg "editable"` 返回空证实 editable 不进序列化）；② 9 条 spike 设计约束逐条落地（§4.8 9 行映射表 + §4.2/§4.3/§4.6 等价落地，无遗漏无矛盾）；③ 双态隔离机制无状态泄漏路径（§4.2 三层隔离 + 4 项不泄漏验证 live 核对全 PASS）；④ 与 runtime `design-engine.md §6:216` sky Group 预留 + §12.3 后续阶段 I16 + `design-renderer.md §12.3` 一致；⑤ 编辑态包络数字与 `editing-envelope-2026-08-06.md §3` 完全对齐（≥30fps@≤1k primary / <100ms / ≤320MB / extended ≤10k）；⑥ 引擎层衔接 trade-off（方案 A vs 方案 B）作为 E4.1 裁定 input 表达恰当（不预判裁定）；⑦ scope discipline（Non-Goals 明确 + 三次声明「不预判 E4.1 裁定」）；⑧ 12 节结构对齐 runtime design-\*.md 先例。**1 Nit 落地**：**n-1** §4.4 方案 A 复用点枚举「18 命令面」括号内 `zoomAt` 重复（实际 19 个 slash 项）→ 删除重复 `zoomAt`，与 `editor-initiation.md:53` 18 方法口径对齐。**Round 1 达成共识（连续一轮 0 Blocker/0 Major/0 Minor/0 新增 Nit，仅 1 项 cosmetic Nit 当场落地，未超 3 轮上限）**。本文件可作为 E2.2–E2.6 设计 + E4.1 包结构裁定 + E5.1 编辑态画布组件实现的权威架构契约。E3 设计 gate（独立 plan）为终轮复核。
- **E3.1 设计 gate 终轮复核（2026-08-06，独立子 agent `ses_028b89bd7ffe8o9V7HR3JaWLwn`，fresh session）**：判定 `pass-with-minors`（gate 文档 `docs/analysis/industrial-hmi-editor/e3-design-gate-review.md`，0B/0M/1m/1n）。本档 1 项 Nit 落地：**n-1** §8.5（:362）次级交叉引用「roadmap 总览 line 81」off-by-one（line 81 = 复用点 #4 组态 JSON 序列化，line 82 = #5 组件句柄面）→ 修正为「line 82」（权威引注 editor-initiation §3 #5 正确，仅次级 roadmap 行号修正）。gate 文档自身经独立子 agent 文档共识审查 Round 1 AGREE 达成共识（`ses_028b3425dffeydQh6pK5yp2hV6`，0 新增修正项）。**E3.1 gate 终轮复核闭环**——本文件作为 E4.1 包结构裁定 + E5.1 编辑态画布组件实现的权威架构契约依据。

---

## 1. 组件定位

- 本文档定义**编辑器整体架构**设计：编辑态画布的挂载形态（独立 sky Group 模型 + leafer Editor 内置覆盖物方案 A）、编辑态↔运行态双态隔离机制（editable 开关 + 编辑会话组态分离 + 提交语义 + 不泄漏 R5）、编辑器与 runtime 引擎层的衔接 trade-off（复用 `scada-engine` applyDiff 增量面 vs 独立 editor-engine，供 E4.1 包结构裁定）、编辑会话序列化暂存/提交语义、事件派发链编辑态预览派发策略，以及编辑态包络对架构的约束落地。
- 编辑器架构是 E2.2–E2.6 设计的**契约输入**：双态隔离边界 / 编辑会话组态存储模型 / 引擎层衔接 trade-off 在 E2.2 属性面板（提交语义消费）、E2.3 连线（编辑会话内 custom.connections 写入）、E2.4 undo-redo（编辑会话组态上的 diff 命令栈）、E2.5 工具箱（复用引擎命令面 + 句柄面）、E2.6 renderer 契约（scada-editor-canvas props/events/handles 桥接）逐项消费。
- 性能目标（**E1.2 裁定建议值，R7 待人工确认**，`editing-envelope-2026-08-06.md §3`）：拖拽响应 **≥30fps @ 选区 ≤1k**（primary）/ ≤10k（extended，留 E6/E9.2 数值化确认）；编辑操作响应 **<100ms**（per-call）；内存 **≤320MB**（运行态红线不变）；编辑器本体 runtime 最终验证留 E6（M1 gate）+ E9.2（M3 benchmark 复测）。
- 非目标：不定义属性面板字段级 schema（E2.2）、连线交互细节（E2.3）、undo-redo 命令栈实现（E2.4）、工具箱具体工具（E2.5）、renderer fields/events/handles 完整契约（E2.6）；不裁定包结构（E4.1 基于本文档 §5 trade-off 裁定）；不实现任何代码（E5+）。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无 canvas 组态编辑器先例。本编辑器为**首个 Canvas 编辑域**，对照调研结论（`research-render-engines.md §5` / `research-scada-apps.md`）：
  - **leafer Editor 插件**（render-engines §5，源码实锤）：Editor `extends Group`（`Editor.ts:24`），独立节点挂 sky 层；提供完整交互原语（TransformTool/EditBox/EditSelect + 8 向 resize + rotate/skew + group/ungroup + InnerEditor）；事件族（EditorMoveEvent/EditorScaleEvent/EditorRotateEvent/EditorSkewEvent/EditorGroupEvent/InnerEditorEvent）。**spike E0.1 已证手势仲裁成立**（`tree:viewport + move:drag:'auto' + editable:true + 真实点击`，深探针 P1）。
  - **meta2d**（scada-apps §2.1/§2.2）：内置 undo/redo 历史栈（`store.histories`/`historyIndex`，canvas.ts:4024-4048）+ `EditType.Add/Delete/Update`——设计蓝本可参考其模型（编辑操作→历史栈→逆操作），但实现走 diff 命令栈（E2.4，复用 runtime `serialization/diff.ts` `ScadaConfigDiff`）。
  - **maxGraph**（supplement §4.3 :133）：`undoable-change`（ChildChange/GeometryChange）——命令式可撤销操作模型，与本文 diff 事务语义对齐。
  - **vue-webtopo-svgeditor**（supplement §3）：connection-line/connection-panel 连线编辑 + right-panel 属性面板——**轻量参考层**（非主力蓝本）。
  - **FUXA**（scada-apps §3.5）：`gauges-property` 组件族 + flex-variable/flex-event/flex-action——属性面板 schema 驱动蓝本。

### Flux 决策表（编辑器架构层）

| 能力                                              | 采纳                                    | 不采纳                        | 理由（依据）                                                                                                                                                                                                                                 |
| ------------------------------------------------- | --------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| leafer Editor 插件底座（路径 A）                  | **P0 采用**                             | 自研交互层（路径 B）          | E1.1 选型裁定维持路径 A（`selection-gate-2026-08-06.md §3`）：手势仲裁成立 + 事件族 0 漂移 + 适配层 cost 小～中（远 < 自研全量原语）；方案 A 覆盖物 10k 选区仍 32fps ≥30 候选；路径 B 作 fallback 保留（性能可行，作否决条件触发时切换路径） |
| 编辑态覆盖物形态：方案 A（leafer Editor 内置）    | **P0 采用**                             | 方案 B（独立 sky Group 自研） | E0.3 §3.6 推荐 + E1.2 calibration 评估：典型工业选区 ≤几百两方案持平 ~50fps，方案 A 开箱提供完整交互原语；方案 B 在极端 10k 略优 +4.2fps（仍 ≥30），作 fallback 保留                                                                         |
| 双态隔离（editable:true 开关）                    | **P0 采用**                             | 两套独立引擎实例              | spike §1.4 适配项「图元可编辑开关：必须显式 `editable:true`」；编辑态给目标图元加 `editable:true`，运行态关闭（同一引擎实例复用配置面，最小化状态泄漏面，见 §4.2）                                                                           |
| 编辑会话组态存储（与运行组态分离）                | **P0 采用**                             | 直接写回运行组态（无暂存）    | R5 双态隔离要求 + 提交语义衔接 `use-scada-config-sync.ts` full/diff 判定（design-renderer.md §4.3）：编辑会话维护「待提交组态 working copy」，提交时才走 config 同步链                                                                       |
| 编辑态事件不派发运行态 action                     | **P0 采用**                             | 编辑态预览派发运行态 action   | R5 不泄漏；编辑态交互（拖拽/缩放/选中）应**不派发** `symbol:click`/`symbol:dblclick`/`symbol:hover` 等运行态 action（编辑会话隔离）；InnerEditor 内文本编辑不触发运行事件                                                                    |
| transform 事件族适配层节流（起止帧）              | **P0 采用**                             | 每帧派发                      | spike §2.5 + selection-gate §5 约束 #3：`editor.move` 高频每帧（n=1k 8–10ms），适配层抽纯 payload + nodeId 后只入栈操作起止帧（E2.4 undo-redo 落点），防逐属性 applyAttrs 泄漏                                                               |
| 引擎层衔接：复用 scada-engine applyDiff           | **方案 A 采纳**（2026-08-06 E4.1 裁定） | 独立 editor-engine            | 见 §4.4.1 裁定结论：方案 A 经 subpath `/editor` + 独立注册函数 + 模块图隔离证明（main 入口导入图零触及 `@leafer-in/editor`），bundle 不污染 runtime + 命令面零复制 + 维护成本最低                                                            |
| 框选 selectArea：`selectKeep:true` 自定义 release | **P0 采用**                             | 默认 release 清空选区         | spike §1.4 + §2.3 双因发现：move:'auto' 冲突 + 默认 release 清空框选结果（finalListLen=0）；编辑态需保留框选结果，双态切换 move 配置或自定义 release                                                                                         |

## 3. Flux 中的 renderer/type 定义

- 编辑器架构层**注册 1 个新 renderer type**：`scada-editor-canvas`（编辑态画布，与运行态 `scada-canvas` 双态隔离）。完整 fields/events/regions/handles 契约属 E2.6（design-renderer.md）；本档只声明架构层契约：
  - `scada-editor-canvas` 与 `scada-canvas` **是两个独立 renderer type**（双态隔离在 renderer 注册层落地，非同 type 双开关）；编辑态与运行态在同一 React 树中并存时（如预览运行模式）经不同 React 节点挂载。
  - 包归属：**方案 A 裁定**（2026-08-06 E4.1）——放入既有 `flux-renderers-industrial`，经 subpath `/editor` + 独立注册函数 `registerScadaEditorRenderers` 隔离（详见 §4.4.1）。
  - 注册清单（roadmap「组件注册」条款）：`examples.manifest.json`、playground registry、i18n 文案（`flux-i18n`）、quick-reference 组件表（E5/E9 落地）。

### 与既有 flux 架构的边界（E2.1 Decision）

| 边界         | 约定                                                                                                                                                                                                                                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 依赖   | 编辑器组件（`scada-editor-canvas` renderer）属 React 视图结构层；编辑会话模型 + 适配层属域核心（无 React 依赖，对齐 `renderer-implementation-guidelines.md` Case 4）                                                                                                                                                                                  |
| 数据流       | 编辑器**不读 flux scope**（编辑期不消费点表绑定）；编辑会话组态存于域内部（ref 持有 working copy），提交时才经 `config` prop 同步链触发下游 `scada-canvas` 重建                                                                                                                                                                                       |
| 事件流       | 编辑态事件族（EditorMove/Scale/Rotate/Skew/Group/InnerEditor）经**薄适配层**抽纯 payload + nodeId 映射后入栈（E2.4 undo-redo 落点）；**不直传** `createNormalizedActionEvent`（leafer 事件携带循环 Leaf 引用，spike §2.5）；**不派发**运行态 `symbol:*` action（R5 隔离）                                                                             |
| 注册机制     | `scada-editor-canvas` 经 `registerRendererDefinitions` 标准注册（对齐 `scada-canvas` 模式）；图元库面板复用 runtime `registerScadaSymbol` 24 内置 + E2.2 抽取的 props schema                                                                                                                                                                          |
| 测试句柄     | dev/test 下经 `window.__flux_scada_editor_<cid>` 暴露编辑会话模型 + 适配层（句柄扩展属 E2.6）；复用 runtime `window.__flux_scada_<cid>` 投影下游 `scada-canvas` 场景树断言                                                                                                                                                                            |
| 平台能力复用 | 编辑器复用 runtime 引擎层（`scada-engine.ts` 18 命令面 + applyDiff + reset）+ ConfigAdapter nodeById O(1) + 图元注册表 + JSON 序列化（parse/validate/serialize/diff）+ 句柄面扩展（addSymbol/removeSymbol/updateSymbol）+ sky 交互覆盖物族 + 测试句柄 + benchmark 基座；**禁止重复实现**（roadmap Cross-Cutting 平台能力复用 + editor-initiation §3） |

## 4. schema 设计（编辑器架构契约）

### 4.1 ScadaEditorCanvasSchema（架构层声明，完整 schema 属 E2.6）

```typescript
interface ScadaEditorCanvasSchema extends BaseSchema {
  type: 'scada-editor-canvas';
  /** 编辑会话初始组态（启动编辑器时装载的画面）；缺省为空场景 */
  config?: string | ScadaConfig;
  /** 画布尺寸（px）；缺省填满容器 */
  width?: number;
  height?: number;
  /** 编辑态运行模式（编辑态 / 预览运行态双向切换） */
  mode?: 'edit' | 'preview';
  /** 提交语义策略（见 §4.5）：缺省 'manual'（显式 save 句柄触发），可选 'auto'（每次编辑会话变更即同步） */
  commitPolicy?: 'manual' | 'auto';
  /** regions：图元库面板 / 属性面板 / 工具箱 / 状态栏 等子区域（E2.2/E2.5 完整定义） */
  palette?: RegionSchema;
  inspector?: RegionSchema;
  toolbox?: RegionSchema;
  statusBar?: RegionSchema;
  /** 事件（schema 级，完整契约属 E2.6） */
  events?: ScadaEditorCanvasEvents;
}

interface ScadaEditorCanvasEvents {
  /** 编辑会话组态变更（每次编辑操作入栈后派发，载荷含 canUndo/canRedo 标志） */
  onSessionChange?: ActionSchema;
  /** 提交（保存）：编辑会话组态 → 经 config 同步链触发下游 scada-canvas 重建 */
  onSave?: ActionSchema;
  /** 加载：外部 config 装入编辑会话（替换 working copy） */
  onLoad?: ActionSchema;
  /** 模式切换（edit ↔ preview） */
  onModeChange?: ActionSchema;
  /** 选中变化（载荷含 listNodeIds） */
  onSelectionChange?: ActionSchema;
}
```

> 完整 fields/events/regions/handles 规则注册（对齐 `RendererComponentProps` + `renderer-definitions.ts` 模式）属 E2.6（design-renderer.md）；本档只声明架构层契约（mode/commitPolicy/onSessionChange/onSave 等编辑会话生命周期事件）。

### 4.2 双态隔离机制（R5 落地，spike 约束 #1 + #6）

**双态隔离**是编辑器架构的核心约束（`editor-initiation.md §6 R5` + roadmap Cross-Cutting 双态隔离 + runtime `design-engine.md §6` 覆盖物最小化口径）。三层隔离：

| 隔离层                 | 机制                                                                                                                                                                                                                                                                                                                                                           | 落地点                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **图元 editable 开关** | 编辑态：目标图元 `editable: true`（spike §1.4 适配项）；运行态：所有图元 `editable: false`/缺省。Editor 插件**仅作用于编辑态画布**（`scada-editor-canvas`），不挂载到 `scada-canvas`。同一组态 JSON 在编辑态/运行态 renderer 内由各自引擎实例独立渲染——`editable` 字段为组态 JSON 内图元节点的运行时态（不入组态 JSON 序列化），编辑态 renderer 装配时动态注入 | 适配层在编辑会话组态装配阶段给所有图元注入 `editable:true`；运行态 renderer 不注入 |
| **编辑会话组态分离**   | 编辑器维护 **working copy**（`ScadaConfig` 副本，编辑期变更的全部落点）；运行态 `scada-canvas` 持有的组态**不被编辑期操作污染**。提交（save）时 working copy → config 同步链（`use-scada-config-sync.ts` full/diff 判定，design-renderer.md §4.3）触发下游重建                                                                                                 | 编辑会话模型（域内部，ref 持有）                                                   |
| **事件派发链隔离**     | 编辑态事件族（EditorMove/Scale/Rotate/Skew/Group/InnerEditor）经适配层**只入栈**（undo 命令栈，E2.4 落点）；**不派发**运行态 `symbol:click`/`symbol:dblclick`/`symbol:hover` action（R5 不泄漏）。运行态 action 派发仅发生在 `scada-canvas` renderer 内（用户在预览模式或运行态点击图元）                                                                      | 适配层事件处理（§4.6）                                                             |

**不泄漏验证（R5 closure）**：

1. `editable:true` 字段为运行时态，**不进组态 JSON 序列化**（`serialize.ts` 恒不输出 `editable`）——编辑态保存的 config 与运行态加载的 config 字段面完全一致；
2. 编辑会话 working copy 的变更**不直接修改** `scada-canvas` 持有的 config（域内部 ref 持有，仅在 save 时经 props.config 同步链传递）；
3. 适配层事件处理器**不调用** `helpers.dispatch` 派发 `symbol:*` action（事件派发链隔离）；
4. editor.unmount 后无残留：`editable:true` 注入为运行时态，editor 销毁时 runtime 不再注入，组态 JSON 不带该字段——下一次 runtime 加载该 config 时图元 `editable` 缺省即 `false`。

### 4.3 编辑态画布架构（独立 sky Group + 方案 A 覆盖物，spike 约束 #9 + #1）

**架构模型**（对齐 runtime `design-engine.md §6` sky 层 Editor 预留 + `research-summary §4.1 E12`）：

```
App（leafer 三层 ground/tree/sky，scada-editor-canvas renderer 持有）
├── ground（背景层：底色/网格，复用 runtime 引擎配置）
├── tree（图元层：viewport 插件，type:'viewport' + move:drag:'auto'）
│   └── 组态图元子树（编辑态：图元节点 editable:true 注入）
└── sky（交互覆盖层）
    ├── InteractionOverlay（runtime 既有，运行态 hover 高亮等反馈；编辑态可关闭）
    └── Editor（独立 sky Group，方案 A：leafer Editor 内置 EditBox/EditSelect/simulateTarget）
        ├── editMask（编辑态遮罩，非选中区点击清空选区）
        ├── selector（选区管理，editor.list）
        └── editBox（控制点：8 向 resizePoints + circle rotatePoints + dragPoint）
```

**关键架构决策**：

1. **Editor 实例由 scada-editor-canvas renderer 装配**（运行态 scada-canvas 不挂 Editor）——经 `new App({ editor: {} })`（spike §1.5 #1）注入 editor 实例到 `app.editor`；
2. **Editor 挂 sky 层**（独立 sky Group，对齐 design-engine.md §6「Editor=独立 sky Group」预留 + spike §1.5 #15 editor.children 含 editMask/selector/editBox）；
3. **InteractionOverlay 与 Editor 并存规则**：编辑态关闭 InteractionOverlay 的运行态 hover 高亮（避免与 Editor 选区反馈冲突）；预览模式（mode:'preview'）切换为运行态行为（Editor 卸载 + InteractionOverlay 启用）；
4. **viewport 插件配置**（spike §1.3 深探针 P1）：`tree: { type: 'viewport' }` + `move: { drag: 'auto', dragEmpty: true }`（与 runtime 一致）；
5. **框选 selectArea 配置**（spike 约束 #6）：编辑态需 `selectKeep:true` 或自定义 release handler 保留框选结果（spike §2.3 双因发现：默认 release 清空 finalListLen=0）；双态切换时可切换 move 配置（编辑态关闭 move:'auto' 走框选，运行态开启走画布平移）。

### 4.4 编辑器 ↔ runtime 引擎层衔接（trade-off input，供 E4.1 裁定）

> **本节为 trade-off input，不预判裁定**。E4.1（包结构裁定）基于本节 + bundle size 影响 + 双态隔离强度 + 维护成本作出最终裁定（roadmap Cross-Cutting + Work Items E4.1）。

**方案 A：复用 runtime `scada-engine.ts` + applyDiff 扩展（不新建 editor-engine）**

- 复用点：`scada-engine.ts` 18 命令面（applyAttrs/getSymbol/getSymbols/getSymbolProps/setSymbolProps/fit/center/setViewport/zoomAt/setSize/getViewport/getWorldPoint/getViewportPoint/applyDiff/exportConfig/importConfig/reset/destroy）+ applyDiff 增量 + reset 全量重建 + ConfigAdapter nodeById O(1) 索引 + 序列化面（parse/validate/serialize/diff）。
- 扩展点（runtime 复用点三态「需扩展」3 处衔接语义之一，editor-initiation §3 + roadmap 总览 line 73）：
  - **编辑操作→diff 事务语义**（E2.4 设计 / E7.2 落地）：编辑操作（一次拖拽/缩放/旋转/skew/group/ungroup/addSymbol/removeSymbol）产出 `ScadaConfigDiff`（逆 diff 撤销），经 `engine.applyDiff` 应用到组态模型；事务边界 = transform 事件族节流起止帧（spike §2.5）。
  - **undo 栈衔接**（E2.4 设计 / E7.2 落地）：引擎层增加 undo 栈（栈元素 = `ScadaConfigDiff`），`engine.undo()` / `engine.redo()` 经逆 diff / 重放 diff 应用；栈深度上限对齐 §4.7 内存上限。
- 优点：复用 minimize 包结构变化（E4.1 倾向方案 A 不新建包，但仍需 E4.1 裁定）；零命令面复制；applyDiff 增量已有 runtime 单测覆盖；
- 缺点：编辑态与运行态共享同一引擎类，**双态隔离强度依赖 editable 开关 + Editor 挂载控制**（架构上可通过 renderer 注册层 + Editor 装配隔离，但引擎类层级无强隔离）；leafer-editor 依赖拖入 runtime bundle（若 scada-editor-canvas 与 scada-canvas 同包，运行态 bundle 也含 leafer-editor，bundle size 影响）。

**方案 B：独立 editor-engine（新建 `ScadaEditorEngine` 类）**

- 新建点：`ScadaEditorEngine extends ScadaCanvasEngine` 或独立类；持有 Editor 实例 + 编辑会话 working copy + undo 栈；命令面包含 runtime 18 命令 + 编辑操作命令（addSymbol/removeSymbol/updateSymbol/group/ungroup/undo/redo）。
- 优点：编辑态与运行态**强隔离**（不同引擎类，不同 bundle）；leafer-editor 依赖可放入独立包 `flux-renderers-industrial-editor`（不拖入 runtime bundle）；编辑会话/undo 栈/Editor 装配集中管理。
- 缺点：需复制/继承 runtime 命令面（成本中）；与 runtime 序列化面双源化风险（需明确共享 `serialization/` 模块归属，避免双维护）。

**E4.1 裁定 input**：

| 维度                   | 方案 A（复用 scada-engine）                              | 方案 B（独立 editor-engine）                 |
| ---------------------- | -------------------------------------------------------- | -------------------------------------------- |
| 双态隔离强度           | 中（依赖 editable 开关 + Editor 装配）                   | 强（不同引擎类 + 不同 bundle）               |
| bundle size（runtime） | 增加（leafer-editor 拖入 runtime bundle）                | 不变（leafer-editor 在独立包）               |
| 命令面复制成本         | 零                                                       | 中（复制/继承）                              |
| 序列化面归属           | 复用 `serialization/`                                    | 需明确共享 vs 复制                           |
| 维护成本               | 低（命令面单源）                                         | 中（双源化风险需显式治理）                   |
| E4.1 裁定结论          | **方案 A 采纳**（subpath 隔离，2026-08-06 裁定，§4.4.1） | 不采纳（隔离已由 module 图证明，无需独立包） |

> 本文档作为 E4.1 裁定 input，**不预判裁定**。E4.1 应综合 bundle size 评估（实际打包 leafer-editor 体积）+ 双态隔离强度需求（是否需要 bundle 级隔离）+ 维护成本作出最终决定。**watch-only residual**：bundle size 数字需 E4.1 实际打包后评估（当前未实测）。

### 4.4.1 E4.1 包结构裁定结论（2026-08-06 落地，方案 A）

> **裁定：方案 A**（编辑器实现放入既有 `flux-renderers-industrial`，经 subpath `/editor` + 独立注册函数 `registerScadaEditorRenderers` 隔离，不新建包）。依据本节 trade-off + bundle 实测 + 模块图隔离证明 + 维护成本综合裁定。plan `docs/plans/2026-08-06-2118-2-e4-package-infra-and-dependency.md` Phase 1 落地。

**裁定依据（综合 trade-off 表四维度）**：

1. **bundle size（runtime）— 经模块图证明可隔离，方案 A 不污染 runtime bundle**：
   - 实测 `@leafer-in/editor@2.2.9` 可发布产物：`editor.esm.min.js` = **~50 KB**（minified）；`editor.esm.js` = ~102 KB（unminified）。`editor-initiation.md §4.1` 口径「leafer-editor 244KB」含 leafer-in 共装 runtime + 双格式（esm/cjs），隔离后 editor 独占 chunk 实测 ~50 KB minified。
   - **模块图隔离证明**（`grep -rn "@leafer-in/editor" packages/flux-renderers-industrial/src/` = ZERO）：主入口 `src/index.ts` 的导入图（`symbols/register-builtin` → `renderer-definitions` → `renderer/scada-canvas` → engine/binding/serialization）**完全不触及** `@leafer-in/editor` 与 `src/editor/`。bundler（Vite/Rollup）按模块图静态追踪，无 main→editor 边 → `@leafer-in/editor` 永不进入 runtime `scada-canvas` chunk。
   - 隔离机制（三道）：① subpath export `./editor` → `src/editor/index.ts`（独立入口，主入口 `index.ts` 不 re-export editor 任何符号）；② 独立注册函数 `registerScadaEditorRenderers`（**不并入** `registerScadaRenderers`）；③ playground 经 `import { registerScadaEditorRenderers } from '@nop-chaos/flux-renderers-industrial/editor'` subpath import（禁从主入口 re-export）。对齐既有先例：`@nop-chaos/flux-renderers-ai/rich-text`（Tiptap ~100KB 经 subpath 隔离出主 bundle，App.tsx LazyAiRichTextDemoPage 注释明示）。
   - 结论：**bundle-isolation-fail Failure Path 不触发**——方案 A 隔离可行，无需升级方案 B。

2. **双态隔离强度 — module/subpath 级足够**：
   - runtime `scada-canvas` renderer（主入口）与 editor `scada-editor-canvas` renderer（`/editor` subpath）是**两个独立 renderer type**，经两个独立注册函数注册；
   - 主入口导入图可证排除 `@leafer-in/editor`，等效于 bundle 级隔离（消费者不 import `/editor` 即不拉入 editor 代码）；
   - 引擎实例隔离（§4.2 三层机制）+ cid 命名空间独立（`__flux_scada_<cid>` vs `__flux_scada_editor_<cid>`）+ 事件派发链隔离（§4.6）在 renderer 注册层 + 适配层落地，与包结构正交。方案 A 的 module 级隔离 + renderer 注册层隔离共同满足 R5。

3. **命令面复制成本 — 零（方案 A 核心优势）**：
   - editor 适配层经**相对路径**直接 import runtime 引擎面（`scada-engine.ts` 18 命令面 + applyDiff）、序列化面（`serialization/`）、图元注册表（`symbols/`）、句柄面（`renderer/hooks/use-scada-handles.ts`）；
   - 零命令面复制 / 零 re-export ceremony / 零序列化面双源化风险。方案 B 需 workspace 依赖 + re-export 或复制，维护成本更高。

4. **维护成本 — 最低**：单源命令面 + 单包单 CI 单 vitest 配置；新增图元 / 引擎命令只需在一处落地，editor 自动复用。

**方案 A 隔离策略（E4.2 落地结构）**：

```
packages/flux-renderers-industrial/
├── src/
│   ├── index.ts                  # 主入口：registerScadaRenderers（runtime，不 import editor/）
│   ├── editor/                   # E4.2 新增 subpath 模块（独立入口，import @leafer-in/editor）
│   │   ├── index.ts              # registerScadaEditorRenderers + 类型（/editor subpath 入口）
│   │   ├── schemas.ts            # ScadaEditorCanvasSchema 最小字段（完整属 E5）
│   │   ├── renderer-definitions.ts # scada-editor-canvas 空壳定义
│   │   └── styles.css            # editor 样式（空壳期占位）
│   ├── engine/ ... renderer/ ... # runtime 面（editor/ 经相对路径复用）
├── package.json                  # exports 新增 "./editor" subpath；deps 新增 @leafer-in/editor@2.2.9
```

- 工程接线三通道（subpath 级）：① `tsconfig.base.json` paths `@nop-chaos/flux-renderers-industrial/editor` → `src/editor/index.ts`；② `vite.workspace-alias.ts` 同名 alias；③ `package.json` exports `./editor`（types + default）。三通道对齐既有 `/styles.css` subpath 先例 + I4 三通道纪律。
- **不触发 R-人工**：roadmap「人工确认阈值」不含「新建包」，且本裁定采方案 A（不新建包）；roadmap 总览原占位（不新建包 vs 新建 1 包，授权 E4.1 裁定）已显式授权本裁定，裁定 rationale 完整记录于此（占位已于本裁定回写为「方案 A 裁定」）。

### 4.5 编辑会话序列化暂存/提交语义（runtime 复用点 #4 衔接扩展，editor-initiation §3）

**编辑会话模型**（域内部，ref 持有，不进 flux scope）：

```typescript
interface ScadaEditorSession {
  /** 编辑会话 working copy（编辑期变更全部落点） */
  workingConfig: ScadaConfig;
  /** 上次提交的基线（用于 diff 计算 + 提交语义判定） */
  committedBaseline: ScadaConfig;
  /** undo 命令栈（栈元素 = ScadaConfigDiff，E2.4 设计） */
  undoStack: ScadaConfigDiff[];
  /** redo 命令栈 */
  redoStack: ScadaConfigDiff[];
  /** 当前选区（nodeId 列表） */
  selection: string[];
  /** 当前模式（edit / preview） */
  mode: 'edit' | 'preview';
}
```

**提交语义**（衔接 `use-scada-config-sync.ts` full/diff 判定，design-renderer.md §4.3）：

| commitPolicy     | 触发                                           | 路径                                                                                                                                                                                                                                                   |
| ---------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `manual`（缺省） | 用户显式调用 `component:save()` 句柄           | working copy → `serializeScadaConfig(workingConfig)` → 经 props.events.onSave 或上层 host 写回源（如服务端 / localStorage）→ 触发 `scada-canvas` props.config 变化 → `diffScadaConfig(committedBaseline, workingConfig)` → `engine.applyDiff` 增量应用 |
| `auto`           | 每次编辑操作入栈后（onSessionChange 派发时机） | 同 manual 路径，但每次变更即同步（高频，可能影响性能，建议仅用于「编辑即生效」场景）                                                                                                                                                                   |

**边界**：

1. 编辑会话 working copy 与运行态 `scada-canvas` config **完全分离**（R5）；
2. 编辑期操作（addSymbol/removeSymbol/updateSymbol/transform/group/ungroup）只修改 working copy，**不直接调** `engine.applyDiff`（编辑会话模型在适配层维护，事务入栈后再统一 applyDiff，详见 E2.4）；
3. `component:load(config)` 句柄替换 working copy（不保留编辑历史，重置 undo/redo 栈）；
4. `component:exportConfig()` 句柄导出 working copy 序列化结果（不修改 committedBaseline）。

### 4.6 事件派发链编辑态预览派发策略（runtime 复用点 #9 衔接扩展，editor-initiation §3）

**Decision：编辑态不派发运行态 action**（R5 不泄漏）。

| 事件族                                        | 编辑态处理（适配层）                                                                                                                                                                                                                                               | 是否派发运行态 action                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `editor.move` / `scale` / `rotate` / `skew`   | 适配层抽纯 payload（`{moveX/moveY, scaleX/scaleY, rotation, skewX/skewY, targetNodeId}`）+ nodeId 映射 → 入栈（节流起止帧，E2.4 落点） + 更新 working copy 几何字段（x/y/width/height/rotation/scale）                                                             | **否**（仅入栈 + working copy 更新）                         |
| `editor.select` / `hover`                     | 直接映射 `{type, listNodeIds}` → 更新 session.selection → 派发 `onSelectionChange`（schema 级事件）                                                                                                                                                                | **否**（仅 schema 级事件派发，不派发 `symbol:hover` action） |
| `editor.group` / `ungroup`                    | 适配层转结构 diff（addSymbol/removeSymbol，非属性增量）+ nodeId 重映射 → 入栈（E2.4 落点） + 更新 working copy 树结构                                                                                                                                              | **否**                                                       |
| `editor.open_group` / `close_group`           | 直接映射（低频）→ 更新 session 进入/退出组编辑态                                                                                                                                                                                                                   | **否**                                                       |
| `innerEditor.open` / `before_close` / `close` | 直接映射（低频）→ 更新 session InnerEditor 状态（依赖 `@leafer-in/text-editor` 插件装载，spike 约束 #8）                                                                                                                                                           | **否**                                                       |
| **预览模式（mode:'preview'）**                | Editor 卸载 + 图元 `editable:false` + InteractionOverlay 启用 → 行为完全等同运行态 `scada-canvas` → **派发** `symbol:click`/`symbol:dblclick`/`symbol:hover` action（经 `createNormalizedActionEvent` + `helpers.dispatch`，对齐 runtime design-renderer.md §8.2） | **是**（预览模式即运行态行为，无隔离）                       |

**关键约束**：

1. leafer Editor 事件携带**循环 Leaf 引用**（target/editor/value/drag 均为 Leaf 实例），**不能直传** `createNormalizedActionEvent`（spike §2.5 关键约束）；适配层必须先抽纯 primitive payload + nodeId 映射（组态 nodeId）。
2. transform 事件族节流：起止帧入栈（`editor.before_move` 起始 + `editor.move` 终止，或连续帧的去抖），**不每帧入栈**（防 undo 栈爆炸 + 逐属性 applyAttrs 泄漏，spike §2.5 + E2.4）。
3. InnerEditor 事件依赖 `@leafer-in/text-editor` 插件装载注册 `TextEditor`（spike 约束 #8 + §2.3），编辑器包需引入对应 inner-editor 插件（E4.2 落地）。

### 4.7 满足编辑态包络（E1.2 裁定建议值，R7 待人工确认）

`editing-envelope-2026-08-06.md §3` 五项包络对架构的约束落地：

| 包络维度                | 裁定建议值                   | 架构层落地点                                                                                                                                               |
| ----------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 拖拽响应 fps 阈值       | ≥30fps @ 选区 ≤1k（primary） | 方案 A 覆盖物（§4.3）+ transform 事件族节流（§4.6）+ React 桥接节流回写（不每帧，spike §2.5）                                                              |
| 编辑操作响应延迟        | <100ms（per-call）           | editor.move per-call 同步 8–10ms（n≤1k，spike §3.4）远低于；适配层读 target 几何叠加极小                                                                   |
| 选区规模上限            | ≤1k primary / ≤10k extended  | 编辑器架构不硬限选区规模（用户行为决定）；undo 栈 + diff 应用按选区规模线性增长，extended（≤10k）有 7% 余量风险（留 E6/E9.2 数值化确认）                   |
| 内存上限                | ≤320MB（运行态红线不变）     | 编辑会话 working copy + undo 栈 = `ScadaConfigDiff` 增量（不用全量快照，R4 + E2.4）；10 万图元 working copy ≈ 11.6MB（gate-1-review §3.2 #8）+ undo 栈增量 |
| 编辑器本体 runtime 验证 | 留 E6 / E9.2                 | 本档不闭环（编辑器 renderer 未实现，E5+）；架构层为 E6/E9.2 验证预留测量句柄 `window.__flux_scada_editor_<cid>`（E2.6 落地）                               |

### 4.8 9 条 spike 设计约束落地映射（selection-gate §5）

| #   | spike 约束                                                                                                | 本文档落地点                                                                |
| --- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | 图元必须显式 `editable:true`（双态切换）                                                                  | §4.2 双态隔离机制（图元 editable 开关行）+ §4.3 架构模型（编辑态注入）      |
| 2   | 选中触发必须真实点击（不能用 `editor.select()` API 替代）                                                 | §4.3 架构模型（Editor 默认行为，适配层零适配）                              |
| 3   | 拖拽事件经 `editor.move` 派发，需适配层抽纯 payload + nodeId（禁直传 leafer 事件）→ 转 diff（节流起止帧） | §4.6 事件派发链策略（transform 族行）+ §4.4 引擎层衔接（diff 事务语义）     |
| 4   | 清空选区用 `editor.cancel()` 替代 `editor.list = []`（API 漂移 #4 规避）                                  | §4.6 适配层（选区管理 API 用 `editor.cancel()`，不暴露 `editor.list = []`） |
| 5   | scale 默认 `editSize:'size'` 改写 width/height；rotate `rotateGap:45` 吸附；skew 触发 = ctrl+resize-line  | §4.6 适配层（transform 族读 target 几何而非 deltas）+ E2.2 属性面板写回语义 |
| 6   | 框选 selectArea：move:'auto' 冲突 + 默认 release 清空选区 → 需 `selectKeep:true` 或自定义 release         | §4.3 架构模型（框选 selectArea 配置）                                       |
| 7   | group/ungroup 需适配层转组态模型结构 diff（addSymbol/removeSymbol）                                       | §4.6 事件派发链策略（group/ungroup 行）+ E2.4 undo-redo（结构 diff）        |
| 8   | InnerEditor 事件依赖 inner-editor 插件装载（`@leafer-in/text-editor` 注册 TextEditor）                    | §4.6 事件派发链策略（innerEditor 行）+ §4.3 架构模型（依赖装载，E4.2 落地） |
| 9   | 编辑态覆盖物采用方案 A（leafer Editor 内置）                                                              | §4.3 架构模型（Editor 挂 sky 层，方案 A 采纳）                              |

## 5. 字段分类

| 字段                                                                                   | 归属                   | 说明                                                                            |
| -------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `config`                                                                               | prop (source-enabled)  | 编辑会话初始组态（启动装载画面）                                                |
| `width`/`height`                                                                       | prop                   | 画布尺寸（缺省容器自适应）                                                      |
| `mode`/`commitPolicy`                                                                  | prop                   | 编辑态运行模式 + 提交策略（架构层契约）                                         |
| `palette`/`inspector`/`toolbox`/`statusBar`                                            | region                 | 编辑器子区域（E2.2/E2.5 完整定义）                                              |
| `events`（onSessionChange/onSave/onLoad/onModeChange/onSelectionChange 为对象字段）    | prop                   | ActionSchema 对象整体经 props 通道保留（与 design-renderer.md §5 D-1 裁定一致） |
| `id`/`className`/`disabled`/`visible`/`hidden`/`testid`                                | meta                   | 继承 BaseSchema 元数据通道                                                      |
| 编辑会话 working copy（workingConfig/committedBaseline/undoStack/redoStack/selection） | **域内部（ref 持有）** | 不进 scope（INV-4）；ref 持有，提交时经 config 同步链传递                       |
| Editor 实例（app.editor）                                                              | **域内部**             | 经 `new App({ editor: {} })` 装配（spike §1.5 #1）；卸载时 destroy              |
| 测试句柄                                                                               | **dev/test 投影**      | `window.__flux_scada_editor_<cid>`（E2.6 完整契约）                             |

## 6. 图层与场景树（对应 regions 约定）

> 编辑器复用 runtime leafer App 三层模型（ground/tree/sky，design-engine.md §6），并在 sky 层增加 Editor 独立 Group（§4.3 架构模型）：

| 层                 | leafer 载体                      | 编辑器职责                                                                                                                     |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 背景层             | `App.ground`                     | 画面底色/网格背景（复用 runtime 引擎配置）；编辑态可加额外网格点状/标尺装饰（M3 工具箱可选，E2.5 落地）                        |
| 图元层             | `App.tree`（`type: 'viewport'`） | 全部组态图元子树（编辑态：图元节点 editable:true 注入）；命中检测/渲染帧事件均挂此层（与 runtime 一致）                        |
| 交互覆盖层（运行） | `App.sky` InteractionOverlay     | 编辑态关闭（避免与 Editor 选区反馈冲突）；预览模式启用                                                                         |
| 交互覆盖层（编辑） | `App.sky` Editor（独立 Group）   | 方案 A：EditBox/EditSelect/simulateTarget + 8 向 resizePoints + rotatePoints + dragPoint；编辑态启用，预览模式卸载             |
| HTML 覆盖层        | React DOM（canvas 外层）         | 图元库面板 / 属性面板 / 工具箱 / 状态栏 等编辑器 DOM UI（经 `@nop-chaos/ui` 既有样式体系，roadmap 平台能力复用）；不进入场景树 |

- 编辑器 DOM regions（palette/inspector/toolbox/statusBar）渲染在 canvas 外层 React DOM，**不产 canvas 内 DOM marker**（与 runtime design-renderer.md §10 一致：HTML 覆盖层走 React DOM）。

## 7. 运行期状态归属

| 状态                                  | Owner                    | 说明                                                                                                   |
| ------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| Editor 实例                           | **域内部（ref 持有）**   | `useRef` 惰性创建（env 引用变化不重建，INV-4）；卸载时 destroy；不进 scope                             |
| 编辑会话 working copy                 | **域内部（ref 持有）**   | workingConfig/committedBaseline/undoStack/redoStack/selection/mode；不进 scope；提交时经 config 同步链 |
| 当前选中图元（selection nodeId 列表） | **域内部**               | `editor.list` ↔ session.selection 双向同步（适配层维护）                                               |
| 画布尺寸                              | **域内部 + resize 同步** | ResizeObserver（复用 runtime 引擎 setSize，design-renderer.md §8.3）                                   |
| 测试句柄                              | **dev/test 投影**        | `window.__flux_scada_editor_<cid>`（E2.6 完整契约）                                                    |
| 加载/错误状态                         | **local（派生）**        | region 切换依据（loading/empty region，复用 runtime 设计）                                             |

## 8. 事件、动作与组件句柄能力

### 8.1 架构层 schema 级事件（完整契约属 E2.6）

- `onSessionChange`：编辑会话组态变更（每次编辑操作入栈后派发，载荷含 canUndo/canRedo/selection 等）；
- `onSave`：提交（保存）触发，载荷含 serializedConfig（string）；
- `onLoad`：加载外部 config 装入编辑会话；
- `onModeChange`：模式切换（edit ↔ preview），载荷含 mode；
- `onSelectionChange`：选中变化（载荷含 listNodeIds）。

> 事件派发链 + 载荷规范化属 E2.6 完整定义；本档只声明架构层契约。

### 8.2 编辑态事件族 → 适配层（不派发运行态 action，spike §2.5）

详见 §4.6 事件派发链策略表。架构层关键约束：**禁直传 leafer 事件**（循环 Leaf 引用，spike §2.5）；**禁派发 `symbol:*` action**（R5 隔离）；**transform 族节流起止帧**（E2.4 落点）。

### 8.3 React 桥接（架构层声明，完整桥接属 E2.6）

- **生命周期**（fabric ref/effect 范本，对齐 design-renderer.md §8.3）：
  - `mount`：`useEffect` 内 `new App({ editor: {} })` 装配 Editor → 装载初始 config → 注入 editable:true → 挂测试句柄；
  - `unmount`：destroy 释放 Editor + App + 编辑会话 + 测试句柄；
  - `resize`：ResizeObserver → `engine.setSize(w, h)`；
- **props 同步**：
  - `config` 变化 → 装载到编辑会话 working copy（不直接触发下游 scada-canvas）；
  - `mode` 变化 → 切换 Editor 装配（edit）或卸载（preview）；
  - `width`/`height` 变化 → `engine.setSize`；
- **React Compiler 基线**：Editor 实例 + 编辑会话为命令式副作用，生命周期放 `useEffect`；渲染函数内不触碰 Editor/session（INV-5）。

### 8.4 测试句柄契约（架构层声明，完整契约属 E2.6）

dev/test 构建下编辑器创建后写入 `window.__flux_scada_editor_<cid>`（cid 来自 `RendererResolvedProps.cid`，对齐 runtime test-handle.ts 模式），架构层契约：

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
  editor: unknown; // leafer Editor 实例（避免强类型循环导入，对齐 design-engine.md §8.3 注记）
  /** 引擎实例（复用 scada-engine 时为 ScadaCanvasEngine） */
  engine: unknown; // ScadaCanvasEngine 实例
  /** App 实例 */
  app: unknown; // leafer App 实例
  /** 程序化操作（e2e 用） */
  undo(): void;
  redo(): void;
  save(): string; // 返回 serializedConfig
  load(config: string | ScadaConfig): void;
  setSelection(nodeIds: string[]): void;
  clearSelection(): void;
  switchMode(mode: 'edit' | 'preview'): void;
}
```

> 完整句柄面（addSymbol/removeSymbol/updateSymbol + SCADA_HANDLE_METHODS 扩展，对齐 design-renderer.md §8.5 + use-scada-handles.ts）属 E2.6。

### 8.5 组件句柄扩展（架构层声明，runtime 复用点 #5 衔接扩展）

runtime `use-scada-handles.ts:11-21` 现有 9 方法（fit/center/getSymbols/getSymbol/setPointValue/getPointTable/exportConfig/importConfig/destroy）需扩展编辑操作命令（**runtime 复用点三态「需扩展」**，editor-initiation §3 #5 + roadmap 总览 line 82）：

| 扩展句柄                                     | 说明                                                          |
| -------------------------------------------- | ------------------------------------------------------------- |
| `component:addSymbol(node: ScadaSymbolNode)` | 添加图元（编辑会话 working copy 增量 + undo 栈结构 diff）     |
| `component:removeSymbol(nodeId: string)`     | 删除图元（编辑会话 working copy 增量 + undo 栈结构 diff）     |
| `component:updateSymbol(nodeId, patch)`      | 更新图元属性（编辑会话 working copy 增量 + undo 栈属性 diff） |
| `component:group(nodeIds: string[])`         | 成组（结构 diff，spike 约束 #7）                              |
| `component:ungroup(groupId: string)`         | 解组（结构 diff，spike 约束 #7）                              |
| `component:undo()` / `component:redo()`      | undo/redo（逆 diff / 重放 diff，E2.4 落点）                   |
| `component:save()`                           | 提交（序列化 working copy + 经 onSave 或同步链触发下游）      |
| `component:load(config)`                     | 加载（替换 working copy + 重置 undo/redo 栈）                 |

> 完整句柄面 + 失败路径 + 错误码注册属 E2.6（对齐 design-renderer.md §8.5 模式）。

## 9. 数据源、表达式、导入能力接入点

- **编辑器不接数据源**：编辑期不消费点表绑定（R5）；预览模式（mode:'preview'）切换为运行态行为，经 `useScopeSelector` + flux-formula 订阅 scope（复用 runtime design-renderer.md §9）；
- **图片资源**：图元背景图经引擎图片缓存 + 桥接层 `RendererEnv.fetcher`（INV-1，对齐 runtime design-engine.md §9）；
- **表达式**：编辑期不参与表达式求值；属性面板的绑定/状态/动画声明编辑**只写声明结构**（config-types.ts 类型，editor-initiation §3 复用点 #8），运行时装配零改动；
- **i18n**：图元库面板/属性面板/工具箱文案经 `flux-i18n`（复用 runtime，I15.1 后续 mission 同步）。

## 10. 样式与 DOM marker 约定

- 编辑器**DOM regions**（palette/inspector/toolbox/statusBar）使用 `@nop-chaos/ui` 既有样式体系（不新增 token 命名空间，对齐 runtime design-renderer.md §10 + `new-renderer-introduction-audit.md §3F`）；
- 根容器 marker（架构层声明，完整 marker 属 E2.6）：`nop-scada-editor-canvas` + `data-slot="scada-editor-canvas"`（与运行态 `nop-scada-canvas` 区分，双态隔离在 DOM marker 层落地）；
- canvas 渲染层不额外产 DOM marker（Editor 渲染在 leafer sky 层，对齐 runtime design-engine.md §10）；
- 主题独立性（roadmap Cross-Cutting + runtime design-renderer.md §10）：编辑器 DOM regions 走 CSS 变量 + 稳定 class 名，不引入 React ThemeProvider。

## 11. 实现拆分建议（架构层声明，完整拆分属 E2.6 + E5）

```
packages/flux-renderers-industrial/src/editor/   （方案 A 裁定落地，E4.1 2026-08-06；经 subpath /editor + 独立注册函数隔离）
├── editor-engine.ts            # ScadaEditorEngine（方案 B 独立类，方案 B 落地）/ 编辑会话模型（方案 A 复用 scada-engine）
├── editor-session.ts           # ScadaEditorSession：working copy + undo/redo 栈 + selection + mode（域核心，无 React 依赖）
├── editor-adapter.ts           # 适配层：leafer Editor 事件族 → 抽纯 payload + nodeId 映射 → 入栈（节流起止帧）
├── editor-test-handle.ts       # window.__flux_scada_editor_<cid> 挂载/移除（对齐 engine/test-handle.ts 模式）
├── renderer/
│   ├── scada-editor-canvas.tsx # 主渲染器：RendererComponentProps 装配 + 桥接（E5.1）
│   └── hooks/
│       ├── use-editor-engine.ts    # Editor 实例生命周期（mount/unmount/resize）
│       ├── use-editor-session.ts   # 编辑会话模型 + undo/redo 状态（E5/E7 落地）
│       └── use-editor-events.ts    # Editor 事件族 → 适配层（不派发运行态 action）
├── schemas.ts                   # ScadaEditorCanvasSchema 类型（E2.6 完整）
├── renderer-definitions.ts      # registerScadaEditorRenderers：fields/events/regions/handles（E2.6 完整 + E4.2 注册）
└── index.ts                     # 公共面：registerScadaEditorRenderers + 类型
```

- 拆分依据（对齐 runtime design-renderer.md §11 + `renderer-implementation-guidelines.md` Case 4）：编辑会话模型 + 适配层为域核心（无 React 依赖，纯逻辑单测可先行）；renderer 组件 + hooks 为 React 视图结构层。
- 实现阶段映射：E4.1（包结构裁定）→ E4.2（注册空壳 + 依赖引入）→ E5.1（编辑态画布组件 + 双态切换）→ E5.4（句柄扩展）→ E7（连线 + undo-redo）→ E9（工具箱完整）。

## 12. 风险、取舍与后续阶段

### 12.1 spike 风险清单 → 规避策略映射（selection-gate §6 watch-only residual）

| #   | 风险项                                                                                 | 本设计规避/接受                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1  | rAF 驱动 fps 测量口径 nuance（大规模选区首次拖拽 simulateTarget 初始化延迟未单独捕获） | **接受并保持感知**（roadmap Follow-up Backlog `[E1.1-sg]`）：编辑器架构层不强限选区规模（用户行为决定）；E6（M1 gate）+ E9.2（M3 benchmark 复测）在 runtime 3 层 App 下加测端到端指针延迟，必要时调整包络 |
| W2  | editor.move per-call 同步成本随选区规模线性增长（n=10k 时 20.7ms，spike §3.4）         | **接受**：n≤1k 时 8–10ms 远低于 100ms 候选；extended（≤10k）作降级包络留 E6/E9.2 确认                                                                                                                     |

### 12.2 风险与取舍

- **R1（选型变更）不触发**：路径 A 维持（E1.1 裁定）；本档设计基于路径 A，若实现期发现路径 A 不可调和的架构阻断（非 spike 已知），触发 `design-path-blocker` Failure Path 标记人工确认（plan Failure Paths）。
- **R3（属性 schema 双维护漂移）**：本档声明属性 schema 单源化（从 `symbols/register-builtin.ts` 24 定义导出声明式 props schema）属 E2.2 落地细节；本档架构层不预判实现路径。
- **R4（undo-redo 内存）**：本档声明 undo 栈元素 = `ScadaConfigDiff` 增量（不用全量快照）；详细内存上限 + 栈深度上限属 E2.4 落地。
- **R5（双态隔离状态泄漏）**：本档 §4.2 三层隔离机制 + 不泄漏验证（4 项）落地；架构层契约保证 editable 开关 + 编辑会话分离 + 事件派发链隔离 + unmount 无残留。
- **R7（编辑态包络数字）**：本档 §4.7 落地五项包络对架构约束；最终阈值经 R7 人工确认（不在本档闭环）。
- **架构冲突记录（E15.2）**：若实现期发现本设计与 `docs/architecture/`（renderer-runtime/模块边界）冲突，按 plan Failure Paths `design-contract-conflict` 记录冲突点与取舍理由，架构文档同步属后继 mission 收尾，不提前修改。

### 12.3 后续阶段

| 阶段    | 内容                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------ |
| E2.2    | 属性面板 schema 设计（消费本档编辑会话模型 + 提交语义 + 单源化 props schema 抽取）                                       |
| E2.3    | 连线设计（消费本档编辑会话 working copy 内 custom.connections 写入 + 联动）                                              |
| E2.4    | undo-redo 设计（消费本档编辑会话 undoStack/redoStack + diff 事务语义 + 引擎层 applyDiff + undo 栈衔接扩展）              |
| E2.5    | 工具箱设计（消费本档引擎层命令面 + 句柄面扩展）                                                                          |
| E2.6    | renderer 契约设计（消费本档架构层 schema/events/handles/test-handle 声明 + 双态隔离 + 包络）                             |
| E3      | 设计 gate（独立 plan，6 份设计文档终轮复核）                                                                             |
| E4.1    | 包结构裁定（基于本档 §4.4 trade-off input + bundle size 实测）                                                           |
| E4.2    | 注册 `scada-editor-canvas` 空壳 + 引入 `@leafer-in/editor` + `@leafer-in/text-editor`（InnerEditor 插件，spike 约束 #8） |
| E5.1    | 编辑态画布组件 + 双态切换（落地本档架构层契约）                                                                          |
| E5.4    | 句柄面扩展（addSymbol/removeSymbol/updateSymbol + undo/redo/save/load，落地本档 §8.5）                                   |
| E7.2    | undo-redo diff 命令栈（落地本档 §4.4 引擎层衔接扩展 + E2.4 设计）                                                        |
| E6/E9.2 | runtime 验证 + benchmark 复测（落地本档 §4.7 包络 + W1/W2 watch-only 复核）                                              |
