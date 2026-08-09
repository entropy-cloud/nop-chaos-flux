# 连线设计 design-connection.md

> 日期：2026-08-06
> 版本：v1（E2.3 产出）
> 上游：编辑器架构 `design-architecture.md`（E2.1，§4.5 编辑会话模型 + §8.5 句柄面扩展）、属性面板 `design-property-panel.md`（E2.2，§4.5 声明结构写入语义）、runtime 图元模型 `docs/components/industrial-hmi/design-symbols.md`（§4.2 ScadaSymbolProps flow/dashOffset + §4.4 pipe-junction）、runtime 序列化 `docs/components/industrial-hmi/design-renderer.md`（§4.3 序列化往返）、`packages/flux-renderers-industrial/src/symbols/pipe/pipe-junction.ts`（I9.4 已落地 connections 结构）
> 下游：E7.1 端点吸附连线实现（消费本档端点吸附算法 + connections 写入 + 联动）；E2.4 undo-redo（消费结构 diff，连线变更入栈）；E2.6 renderer 契约（消费句柄面 group/ungroup + 连线相关 selection）
> 依据：roadmap `docs/components/roadmap-industrial-hmi-editor.md`（E2.3 + Cross-Cutting 平台能力复用 / 双态隔离）+ E2 plan `docs/plans/2026-08-06-1931-2-e2-editor-design-documents.md`

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent（fresh session，不复用编写者上下文）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。轮次记录如下：

- **Round 1（2026-08-06，fresh session 独立子 agent `ses_028f4ee8fffe9X6d53ItAMyUhj`）**：判定 `AGREE`——0 Blocker / 0 Major / 0 Minor / 0 Nit。4 项核对逐项 PASS：① connections 声明结构与 I9.4 live 一致（§4.1 ScadaPipeConnection 字段与 `pipe-junction.ts:8-14` 逐字段/逐类型对齐；create 流程 `:73-89` 经 props.custom?.connections 读取 + stubs.map 渲染）；② 端点吸附坐标模型可行（§4.1 归一化→世界公式 `junctionNode.x + connection.x * junctionNode.width` 与 live `pipe-junction.ts:83` stub 端点 `connection.x*width - centerX` 算术一致；§4.5 recomputeConnectionAnchor 是正确逆运算）；③ 序列化往返无丢失（`diff.ts:28` flow 在 SYMBOL_KEYS + `:29` custom 在 SYMBOL_KEYS 使 custom.connections 深度 diff 透传无 special-case；design-symbols.md §4.2 flow/dashOffset 既有）；④ 只写声明不动引擎（§1 Non-Goals + §3 边界 + §12.2 显式声明「编辑器只写 connections 声明 + 联动算法重算 x/y，不修改 runtime pipe-junction.ts」；复用 animator flow kind / serialize·diff / hit.getByPoint / InteractionOverlay 全部 live 核实无重复实现）。R5 双态隔离（编辑态不派发 symbol:\* action）+ spike §1.4/§2.5 transform 节流引用恰当。**Round 1 达成共识（连续一轮 0 新增修正项，未超 3 轮上限）**。本文件可作为 E7.1 端点吸附连线实现的契约依据。E3 设计 gate（独立 plan）为终轮复核。
- **plan 2026-08-07-1835-1 Phase 2 live baseline 同步（2026-08-07）**：multi P1-02（连线坐标空间）+ open P1-C1（嵌套 junction 联动发现）落地修复。**§4.4/§4.5 联动世界坐标**经共享 walker `collectWorldBounds(symbols, ox, oy)`（递归累加 parent offset）严格满足：先前 `collectSymbolBounds` / `findJunctionAtPoint` / `containsPoint` / `recomputeJunctionAfterMove` 把 group child 的 local `(x,y)` 当世界坐标（group world (300,200) 时偏差 300px）；现统一消费 `collectWorldBounds` —— 嵌套 child 的世界坐标 = local + parent offset 累加。**recomputeLinkagesForMovedNode**（§4.4）junction 发现循环改递归 `collectAllSymbols`（共享 walker），嵌套在 group 子树内的 pipe-junction 现可达（target 移动后 connection x/y 重算）。**§4.4 dangling 检测**（P2-C4 同根因顺手覆盖）：`listAllConnections` 存在 id 集合改用递归收集，group child target 不再被误报 dangling。focused proof 见 `scada-editor-canvas-grouping.test.tsx`（offset-group 联动重算 + nested junction target 移动后归一化点正确）。

---

## 1. 组件定位

- 本文档定义**连线交互设计**：pipe-junction 端点吸附（归一化坐标 / 流向 / 目标设备）、`custom.connections` 声明写入（I9.4 已落地的 connections 结构，编辑器只写声明）、折线重拖（端点重新吸附）、连接关系与图元移动联动（图元移动时连接线自动跟随）、序列化往返（flow / dashOffset 经 design-symbols.md §4.2 既有路径）。
- 连线是编辑器的**P1 M2 功能域**（`editor-initiation.md §2.1` P1 M2）：M1 不实现连线（M1 范围 = 双态切换 + 图元库 + 拖拽放置 + 属性面板 + 保存/加载 + 校验），M2 实现端点吸附连线 + 多选/框选 + undo-redo（roadmap §2.2）。
- 边界：本档**只定义连线交互契约 + connections 声明写入路径 + 联动算法**，不定义多选/框选交互（M2 但与本档正交，属 E7.2 多选 undo 范围）、不定义 InnerEditor（M3 后可选项）、不实现任何代码（E7.1+）。
- 非目标：不修改 runtime pipe-junction 图元定义（I9.4 已落地，编辑器只消费其 connections 结构）；不重新实现 runtime flow 动画（`binding/animator.ts` flow kind 已落地）；不定义连线 action 派发（连线本身是声明结构，事件 action 经图元 events 声明走 runtime 派发链，design-renderer.md §8.2）。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无 canvas 连线先例。对照调研结论：
  - **meta2d**（scada-apps §2.2）：`LineAnimateType` 水流/箭头动画——连线动画蓝本（本档 flow 动画经 runtime `binding/animator.ts` flow kind 已落地，不重复实现）。
  - **vue-webtopo-svgeditor**（supplement §3）：connection-line / connection-panel——连线编辑交互蓝本（参考层）。
  - **maxGraph**（supplement §4.4 :138）：vertex/edge + terminal 模型——**模型 API 形态参照**（vertex=device 图元 / terminal=junction 端点 / edge=连接线，本档连接关系模型借鉴）。
  - **leafer Editor**（render-engines §5）：Editor 不直接提供连线交互原语（提供 group/ungroup 但无 edge/junction）；连线交互全部由编辑器自研（基于 pipe-junction 既有 connections 结构 + 端点吸附算法）。

### Flux 决策表（连线设计层）

| 能力                                                  | 采纳        | 不采纳                | 理由（依据）                                                                                                                                                                                                                                          |
| ----------------------------------------------------- | ----------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 端点吸附坐标 = 归一化 0..1（相对图元尺寸）            | **P0 采用** | 绝对像素坐标          | I9.4 已落地（`pipe-junction.ts:8-14` ScadaPipeConnection x/y 为归一化）；图元 resize 时端点自动跟随（相对坐标不变）；端点吸附目标 = 图元边缘归一化点（0/0.5/1）                                                                                       |
| 连接关系 = `custom.connections` 声明（pipe-junction） | **P0 采用** | 顶层 connections 数组 | I9.4 已落地（`pipe-junction.ts:39-100` create 经 `props.custom?.connections` 读取并渲染 stub）；编辑器只写声明，不动引擎（editor-initiation §3 复用点 #3）；序列化经 custom 透传                                                                      |
| 流向 = in/out/bidirectional                           | **P0 采用** | 单向 out-only         | I9.4 已落地（`pipe-junction.ts:12` direction 三值 + `:87` out/bidirectional 渲染 endArrow，in 不渲染）                                                                                                                                                |
| 目标设备 = nodeId 引用（`target?: string`）           | **P0 采用** | 物理坐标引用          | I9.4 已落地（`pipe-junction.ts:13` target 为 nodeId 字符串）；编辑器吸附时写入目标 nodeId；图元移动时按 nodeId 反查跟随                                                                                                                               |
| 折线重拖 = 端点重新吸附                               | **P0 采用** | 自由折线（无吸附）    | 工业组态连线语义（管道连接设备端口）；自由折线无工业意义；折线重拖 = 拖动端点 → 重新吸附新目标                                                                                                                                                        |
| 连接关系与图元移动联动                                | **P0 采用** | 静态连接（不跟随）    | 工业组态核心交互：图元移动时连接线自动跟随（pipe-junction 主体移动 → stub 跟随；目标设备移动 → connection.target 仍指向同 nodeId，stub 终点跟随目标设备归一化点）                                                                                     |
| 序列化往返 flow/dashOffset                            | **P0 采用** | 编辑态独立动画状态    | design-symbols.md §4.2 既有（flow/dashOffset 经 ScadaSymbolProps）；`diff.ts:28` 已将 flow 纳入 SYMBOL_KEYS（plan 2026-08-05-0653-2 Phase 2 P1-1 fix）；编辑态保存的 flow 经 config 同步链运行时 animator 装配（design-data-binding.md §4.4 flow 行） |
| 连线声明编辑只写声明（运行时装配零改动）              | **P0 采用** | 编辑期运行 flow 动画  | editor-initiation §3 复用点 #3 + design-property-panel.md §7；编辑期只写 connections 声明结构，运行时装配经 runtime pipe-junction create/applyProps 已落地                                                                                            |

## 3. Flux 中的 renderer/type 定义

- 连线**不是独立 renderer type**：连线是 pipe-junction 图元的 `custom.connections` 字段编辑交互（编辑态）+ pipe-junction create/applyProps 的渲染（运行时）。
- 连线交互属 `scada-editor-canvas` 编辑器 renderer 的子能力（编辑态画布内），不注册独立 type。
- 包归属：与编辑器 renderer 同包（**方案 A 裁定**，2026-08-06 E4.1——`flux-renderers-industrial` 的 `src/editor/` subpath，详见 design-architecture.md §4.4.1）。

### 与既有 flux 架构的边界（E2.3 Decision）

| 边界         | 约定                                                                                                                                                                                                                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 依赖   | 连线交互（端点吸附 / 折线重拖 / 联动）属域核心（无 React 依赖）；UI 反馈（吸附提示高亮）属编辑器 React 视图结构层                                                                                                                                                                              |
| 数据流       | 连线编辑经适配层写入 working copy（`component:updateSymbol` 句柄，§5）；不直接调 runtime pipe-junction create/applyProps（编辑会话模型维护，提交后下游 scada-canvas 重建时装配）                                                                                                               |
| 事件流       | 连线编辑不派发 `symbol:*` action（R5 隔离）；端点吸附 / 折线重拖产生的 UI 交互（吸附高亮 / 端点 hover）经适配层只更新编辑会话 selection + working copy                                                                                                                                         |
| 注册机制     | 连线交互不进 `renderer-definitions.ts` 注册；端点吸附算法 + 联动算法属编辑器域核心（纯逻辑，Vitest 单测先行）                                                                                                                                                                                  |
| 测试句柄     | 连线交互经 `window.__flux_scada_editor_<cid>` 程序化驱动（E2.6 完整契约）；e2e 经测试句柄断言 working copy 的 connections 结构（不截图判定）                                                                                                                                                   |
| 平台能力复用 | 复用 runtime pipe-junction 图元定义（I9.4 已落地，**禁止重复实现**）+ runtime flow 动画（`binding/animator.ts`，**禁止重复实现**）+ runtime serialize/diff（connections 经 custom 透传 + flow 已纳入 SYMBOL_KEYS）+ runtime InteractionOverlay 模式（吸附提示高亮，复用运行态 hover 高亮模式） |

## 4. schema 设计（连线交互契约）

### 4.1 端点吸附坐标模型（归一化 0..1）

**I9.4 已落地的 ScadaPipeConnection 结构**（`pipe-junction.ts:8-14`）：

```typescript
export interface ScadaPipeConnection {
  id: string;
  /** 归一化 x 坐标（0..1，相对 pipe-junction 主体 width） */
  x: number;
  /** 归一化 y 坐标（0..1，相对 pipe-junction 主体 height） */
  y: number;
  /** 流向 */
  direction: 'in' | 'out' | 'bidirectional';
  /** 目标设备 nodeId（吸附时写入，声明连接关系） */
  target?: string;
}
```

**端点吸附规则**：

1. **吸附目标 = 图元边缘归一化点**（0/0.5/1 三档位，对齐 maxGraph terminal 锚点语义）：拖动端点靠近图元边缘时吸附到最近的边缘归一化点；
   - 顶边：`{x: 0..1, y: 0}`（按 x 吸附 0/0.5/1）
   - 底边：`{x: 0..1, y: 1}`（按 x 吸附 0/0.5/1）
   - 左边：`{x: 0, y: 0..1}`（按 y 吸附 0/0.5/1）
   - 右边：`{x: 1, y: 0..1}`（按 y 吸附 0/0.5/1）
2. **吸附阈值**：端点在图元边缘 ±N px（建议 N=8px screen space，E7.1 实现期调参）内时吸附；
3. **吸附反馈**：吸附候选时显示高亮提示（圆点 + tooltip「吸附到 <图元 id>」），释放时写入 connections；
4. **多端点**：单个 pipe-junction 可有多个 connection（数组结构，I9.4 已支持）。

**坐标换算**（归一化 ↔ 世界 ↔ 屏幕）：

- 归一化 → 世界：`world.x = junctionNode.x + connection.x * junctionNode.width`；`world.y = junctionNode.y + connection.y * junctionNode.height`（对齐 `pipe-junction.ts:83` create 内 stub 端点计算 `connection.x * width - centerX`）；
- 世界 → 屏幕：经 `engine.getViewportPoint(world)`（design-engine.md §8.2）；
- 屏幕 → 世界：经 `engine.getWorldPoint(viewport)`；
- 归一化点坐标经图元 resize 自动跟随（相对坐标不变，pipe-junction create/applyProps 重新渲染 stub）。

### 4.2 端点吸附交互（三段式）

| 段                                  | 触发                                                           | 行为                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) 端点拾起**                    | 用户在 pipe-junction stub 端点（图元边缘外端）按下 pointerdown | 适配层进入「端点拖动模式」：记录起点 connection + 起始 nodeId（junctionId）；Editor 进入「连线编辑子模式」（与图元 transform 模式互斥）                                                                                                                                                                                                                 |
| **(b) 端点拖动 + 吸附候选**         | pointermove                                                    | 适配层计算 pointer 世界坐标 → 查找吸附候选（经引擎命中 `hit.ts getByPoint` 或 bounding box 预检）→ 候选图元边缘最近归一化点高亮；pointer 未靠近边缘时无吸附候选（自由拖动）；吸附候选 feedback 经 InteractionOverlay 模式（screen 坐标系，对齐 design-engine.md §6 P1-7 变换面对齐）                                                                    |
| **(c) 端点释放 + 写入 connections** | pointerup                                                      | 若有吸附候选 → 写入 `connection.target = candidate.nodeId` + `connection.x/y = candidate.normalizedPoint`；若无吸附候选 → 保持原 connection（或删除 connection，行为可配置，建议默认保持）；写入经 `component:updateSymbol(junctionId, { custom: { connections: newConnections } })` 句柄（design-architecture.md §8.5）+ undo 栈结构 diff（E2.4 落点） |

**关键约束**：

1. 端点拖动模式与图元 transform 模式互斥（Editor 单一交互子模式，spike §1.4 + §2.5）；
2. 端点吸附时 Editor 不接管 pointer（适配层处理，避免 Editor move/scale 事件族干扰）；
3. 吸附候选查询经引擎命中（`hit.ts getByPoint`，design-engine.md §4.6 两阶段命中），不重复实现命中；
4. 吸附高亮经 InteractionOverlay（screen 坐标系，design-engine.md §6），不重复实现覆盖物。

### 4.3 折线重拖（端点重新吸附）

**折线重拖 = 已有 connection 的端点拾起 + 重新吸附**：

- 触发：用户在已有 stub 端点按下 pointerdown（与 §4.2 (a) 同路径，但 connection 已存在）；
- 行为：进入「端点拖动模式」+ 起始 connection 为已有 connection；
- 释放：吸附新候选 → 写入新 connection（覆盖原 connection.target/x/y）；无候选 → 可选删除原 connection（用户释放到空白区表示「断开连接」）或恢复原 connection（建议 M2 默认恢复，M3 提供「断开连接」工具）。

**折线本身（pipe-junction 主体）不重拖几何**：stub 几何由 connection 归一化坐标 + 主体 width/height 决定（pipe-junction create 计算），用户编辑的是 connection 归一化点而非 stub 几何本身（防止双源化，对齐 design-property-panel.md §4.4 R3 防护思路）。

### 4.4 连接关系与图元移动联动

**图元移动联动场景**（pipe-junction 主体或目标设备移动时连接线跟随）：

| 移动对象                   | 联动行为                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **pipe-junction 主体移动** | stub 几何自动跟随（pipe-junction 主体 x/y 改变 → create/applyProps 重新渲染 stub 端点：centerX/centerY 跟随主体，stub 终点 = 主体 + 归一化偏移，pipe-junction.ts:78-89 已落地）；connection.target 不变（仍指向原目标设备）；适配层无需额外处理（runtime 已落地）                                                                                                                                                                      |
| **目标设备移动**           | connection.target 仍指向同 nodeId（声明不变）；stub 终点 = 目标设备的归一化吸附点（如目标设备 right-middle = `{x:1, y:0.5}`）→ stub 几何需重新计算（stub 从 junction 中心到目标设备归一化点的世界坐标）；**联动算法**（§4.5）：经 nodeId 反查目标设备当前 x/y/width/height → 重新算 stub 终点世界坐标 → 触发 pipe-junction 重新渲染                                                                                                    |
| **目标设备删除**           | **两条路径分工**：① **编辑器驱动删除**（`removeWorkingSymbol`/`cutSelection`）主动 prune：同一次 diff 内扫所有 junction 的 `custom.connections`，删除 `target===被删id` 的条目（`pruneDanglingConnections`，snapshot-based undo 经 prevSnapshot 完整恢复）；② **外部 config / 运行态**加载产生 target 不存在的 connection → 标记为「dangling」（声明保留 target，运行时不渲染 stub），由 `listAllConnections` 诊断检出，用户可手动清理 |

**联动算法属编辑器适配层**（不进 runtime pipe-junction）：runtime pipe-junction create/applyProps 只读 connection.x/y（归一化，相对主体），不读 connection.target 几何（target 是声明，运行时不解析为目标设备几何）；编辑器适配层在「目标设备移动」场景下重新算 connection.x/y（让 stub 终点视觉上跟随目标设备）。

### 4.5 联动算法（编辑器适配层，纯逻辑，Vitest 单测先行）

```typescript
/**
 * 目标设备移动时重新计算 connection 归一化点（让 stub 视觉跟随目标设备）。
 *
 * 输入：当前 connection + pipe-junction 主体几何 + 目标设备几何 + 目标设备上的吸附锚点（如 right-middle）。
 * 输出：新的 connection.x/y（归一化，相对 pipe-junction 主体），使 stub 终点世界坐标 = 目标设备锚点世界坐标。
 */
export function recomputeConnectionAnchor(args: {
  connection: ScadaPipeConnection;
  junction: { x: number; y: number; width: number; height: number };
  targetDevice: { x: number; y: number; width: number; height: number };
  /** 目标设备上的吸附锚点（归一化，相对目标设备） */
  targetAnchor: { x: number; y: number };
}): { x: number; y: number } {
  // stub 终点目标世界坐标 = 目标设备锚点世界坐标
  const targetWorldX = args.targetDevice.x + args.targetAnchor.x * args.targetDevice.width;
  const targetWorldY = args.targetDevice.y + args.targetAnchor.y * args.targetDevice.height;
  // 转换为相对 pipe-junction 主体的归一化坐标
  return {
    x: (targetWorldX - args.junction.x) / args.junction.width,
    y: (targetWorldY - args.junction.y) / args.junction.height,
  };
}
```

**说明**：

1. 联动算法在编辑器适配层（不进 runtime pipe-junction）；目标设备移动时经 Editor move 事件触发（节流起止帧，spike §2.5）；
2. 算法纯逻辑（无 React 依赖，Vitest 单测先行，roadmap 测试纪律）；
3. 算法不改变 connection.target（声明关系不变），只改 connection.x/y（视觉跟随）；
4. 算法输出的归一化点可能超出 [0,1] 范围（目标设备远离 pipe-junction 时）——此时 stub 视觉延伸到主体外（pipe-junction create 已支持，归一化坐标可为任意值）。

### 4.6 多连接处理

- 单个 pipe-junction 可有多个 connection（I9.4 create 已支持数组渲染，`pipe-junction.ts:73-89`）；
- 多连接的编辑交互：每个 stub 端点独立拾起 / 拖动 / 释放（适配层维护当前编辑中的 connectionId）；
- 多连接的视觉：每个 stub 独立渲染（pipe-junction.ts:78-89 stubs.map），无相互依赖。

## 5. 字段分类（连线相关字段）

| 字段                                | 归属                         | 说明                                                                                                                          |
| ----------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `custom.connections`                | 组态 JSON pipe-junction 节点 | I9.4 已落地，编辑器只写声明（§4.1 / §4.2 / §4.3）                                                                             |
| `flow`（`{enabled, speed, dash?}`） | 组态 JSON pipe-junction 节点 | 流动动画参数，design-symbols.md §4.2 既有；编辑器属性面板 style 组（design-property-panel.md §5）                             |
| `dashOffset`                        | 组态 JSON pipe-junction 节点 | 流动动画相位，runtime animator flow kind 写入（design-data-binding.md §4.4）                                                  |
| `stroke`/`strokeWidth`/`strokeDash` | 组态 JSON pipe-junction 节点 | stub 样式（pipe-junction create 经 `props.stroke ?? props.fill` + `props.strokeWidth ?? 4`，:84-85）                          |
| connection.id                       | custom.connections 元素      | 端点 id（组态内唯一，`${junctionId}-conn-${index}` 自动生成，生产拖拽读现有 connections 碰撞避让 → conn-0/conn-1/... 不覆盖） |
| connection.x/y                      | custom.connections 元素      | 归一化坐标（0..1，端点吸附写入 / 联动算法重算）                                                                               |
| connection.direction                | custom.connections 元素      | in/out/bidirectional（流向，决定 endArrow 渲染）                                                                              |
| connection.target                   | custom.connections 元素      | 目标设备 nodeId（吸附写入，声明连接关系）                                                                                     |

## 6. 图层与场景树（对应 regions 约定）

- 连线本身不产生新图层：stub 渲染在 pipe-junction 主体内（pipe-junction create 挂 stub 为子节点，pipe-junction.ts:95-98）；
- 吸附高亮 / 端点 hover 反馈：经编辑器 InteractionOverlay 模式（screen 坐标系，design-engine.md §6 P1-7 变换面对齐）渲染在编辑器 sky 层（与 Editor 选区反馈并存）；
- 「端点拖动模式」期间的临时连线（pointer 到吸附候选的虚线提示）：经 InteractionOverlay 模式渲染（不入组态 JSON，编辑会话临时态）。

## 7. 运行期状态归属

| 状态                              | Owner                    | 说明                                                                                       |
| --------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| 当前编辑中的 connectionId         | **域内部（ref 持有）**   | 适配层维护（编辑会话 working copy 外的临时 UI 状态）                                       |
| 当前吸附候选（nodeId + 归一化点） | **域内部**               | pointermove 时算出，pointerup 时消费或丢弃                                                 |
| working copy 内的 connections     | **域内部（编辑会话）**   | 经 `component:updateSymbol` 句柄写入；提交时经 config 同步链触发下游 scada-canvas 重建装配 |
| 吸附高亮覆盖物                    | **域内部（编辑器 sky）** | 经 InteractionOverlay 模式渲染（screen 坐标系）                                            |

## 8. 事件、动作与组件句柄能力

### 8.1 连线交互事件流（不派发运行态 action）

连线交互属编辑态行为，**不派发** `symbol:*` action（R5 隔离，对齐 design-architecture.md §4.6）：

| 交互                | 适配层处理                                                                                                                                               | 是否派发 action                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 端点拾起            | 进入「端点拖动模式」+ 记录起始 connection                                                                                                                | **否**（仅适配层状态更新）                  |
| 端点拖动 + 吸附候选 | pointermove → 计算吸附候选 → 渲染高亮（InteractionOverlay 模式）                                                                                         | **否**                                      |
| 端点释放 + 写入     | 写入 connection（`updateSymbol` 句柄）+ undo 栈结构 diff（E2.4）+ working copy 更新                                                                      | **否**（仅 schema 级 onSessionChange 派发） |
| 折线重拖            | 同上（端点拾起路径，起始 connection 为已有）                                                                                                             | **否**                                      |
| 图元移动联动        | Editor move 事件（pipe-junction 或目标设备）→ 节流起止帧 → 联动算法重算 connection.x/y（§4.5）→ 写入 working copy（updateSymbol 句柄）+ undo 栈属性 diff | **否**                                      |

### 8.2 连线相关句柄（消费 design-architecture.md §8.5）

| 句柄                                                 | 连线场景使用                                                                                                                                                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `component:updateSymbol(nodeId, patch)`              | 写入 connection（patch = `{custom: {connections: newConnections}}`）                                                                                                                                              |
| `component:addSymbol(node)` / `removeSymbol(nodeId)` | 添加 / 删除 pipe-junction 图元时，相关 connection 视情况清理；**编辑器驱动删除**（removeSymbol/cutSelection）主动 prune 其它 junction 上 `target===被删id` 的 connection 声明（§4.4，snapshot-based undo 可恢复） |

### 8.3 编辑期测试句柄（架构层声明，完整契约属 E2.6）

```typescript
interface ScadaEditorConnectionTestHandle {
  /** 程序化端点吸附（e2e 用） */
  connect(args: {
    junctionId: string;
    connectionId: string;
    targetNodeId: string;
    targetAnchor: { x: number; y: number };
    direction?: 'in' | 'out' | 'bidirectional';
  }): void;
  /** 程序化断开连接 */
  disconnect(args: { junctionId: string; connectionId: string }): void;
  /** 查询当前 working copy 的所有 connections（含 dangling 标记） */
  listConnections(): Array<{
    junctionId: string;
    connection: ScadaPipeConnection;
    dangling: boolean;
  }>;
}
```

经 `window.__flux_scada_editor_<cid>.connection` 暴露（E2.6 完整契约）。

## 9. 数据源、表达式、导入能力接入点

- 连线**不接数据源**：connection.target 是 nodeId 声明（编辑会话 working copy 内），不订阅 scope；
- 连线**不参与表达式求值**：connection.x/y 是归一化数值（编辑期 + 联动算法算出），非表达式；
- flow 动画参数（`flow`/`dashOffset`）在编辑期只声明（属性面板 style 组），运行时装配经 runtime animator flow kind（design-data-binding.md §4.4）；
- 序列化往返（§7.2）经 custom 透传 + flow 经 SYMBOL_KEYS，无需新 IO。

## 10. 样式与 DOM marker 约定

- 连线视觉（stub / endArrow / dashPattern）由 runtime pipe-junction create/applyProps 渲染（不进 DOM marker）；
- 吸附高亮 / 端点 hover 反馈 / 端点拖动虚线提示：经编辑器 InteractionOverlay 模式渲染在 sky 层（screen 坐标系），**不产 DOM marker**（对齐 runtime design-renderer.md §10 + design-engine.md §6）；
- 「端点拖动模式」cursor：经 React 渲染层设置 canvas 元素 style.cursor（不新增 token，复用 CSS cursor 关键字）。

## 11. 实现拆分建议（设计期契约，完整拆分属 E7.1）

```
packages/flux-renderers-industrial-editor/src/   （方案 B；E4.1 裁定最终归属）
OR packages/flux-renderers-industrial/src/editor/（方案 A）
├── connection/
│   ├── anchor-snap.ts                  # 端点吸附算法（归一化点 + 吸附候选查询，纯逻辑单测先行）
│   ├── connection-adapter.ts           # 端点拾起/拖动/释放交互 + 程序化连线/断开/查询（适配层，与 Editor 事件族互斥）
│   ├── connection-drag-controller.ts   # pointer 事件 → 状态机驱动器（依赖注入，纯逻辑单测先行）
│   ├── connection-link.ts              # recomputeConnectionAnchor 联动算法（纯逻辑单测先行）
│   ├── connection-overlay.ts           # overlay 状态机（吸附高亮/虚线提示投影，纯逻辑）
│   └── connection-overlay-renderer.ts  # overlay React 渲染（消费 overlay 状态 → sky 层覆盖物 DOM）
└── （编辑器主 renderer / 适配层 / 编辑会话模型 等，见 design-architecture.md §11）
```

- 拆分依据：`renderer-implementation-guidelines.md` Case 4（吸附算法 + 联动算法为域核心，纯逻辑单测先行；适配层 + overlay 为编辑器视图层）。
- 实现阶段映射：E4.1（包结构裁定）→ E4.2（注册空壳）→ E7.1（端点吸附连线实现）→ E9（M3 完善，如「断开连接」工具）。

## 12. 风险、取舍与后续阶段

### 12.1 风险清单

| #   | 风险                                                         | 本档防护/接受                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | connection.x/y 超出 [0,1] 范围（目标设备远离 pipe-junction） | **接受**：pipe-junction create/applyProps 已支持任意归一化值（stub 视觉延伸到主体外）；算法输出不钳制（保持视觉准确）                                                                                                                                                                                                   |
| C2  | dangling connection（目标设备删除后 connection.target 失效） | **编辑器驱动删除主动 prune**：`removeWorkingSymbol`/`cutSelection` 删节点时同 diff 内扫所有 junction，删除 `target===被删id` 的 connection（snapshot-based undo 可恢复）。**外部 config / 运行态**产生 target 不存在的 connection → 接受 + 标记（声明保留 target，运行时不渲染 stub），由 `listAllConnections` 诊断检出 |
| C3  | 多 connection 同时编辑时的事件冲突                           | **防护**：适配层维护「当前编辑中的 connectionId」（单一活动端点拖动），其他 connection 不响应 pointerdown                                                                                                                                                                                                               |
| C4  | connection.id 唯一性                                         | **防护**：自动生成 `${junctionId}-conn-${index}`（`generateConnectionId` 经现有 connections 碰撞避让）。生产拖拽路径（`beginDrag`）读现有 connections 喂生成器 → 同一 junction 连续拖拽产出 conn-0/conn-1/... 不碰撞（commit 端 push 而非覆盖，junction 可扇出到多设备）；折线重拖路径经显式 connectionId 覆盖原条目    |
| C5  | 联动算法节流（Editor move 高频每帧）                         | **防护**：复用 spike §2.5 + design-architecture.md §4.6 transform 事件族节流起止帧策略（目标设备移动时 connection 重算只在起止帧）                                                                                                                                                                                      |

### 12.2 风险与取舍

- **不重复实现 runtime pipe-junction**：本档显式声明编辑器只写 connections 声明 + 联动算法重算 x/y，**不修改** runtime pipe-junction.ts（I9.4 已落地）；任何对 pipe-junction 渲染的修改属 runtime mission 范围（本档 Non-Goals）。
- **不重复实现 runtime flow 动画**：flow/dashOffset 经 runtime animator flow kind 装配（design-data-binding.md §4.4），编辑期只声明。
- **架构冲突记录**：若 E7.1 实现期发现联动算法需要 runtime pipe-junction 配合（如 stub 渲染需要感知 target 几何），按 plan Failure Paths `design-contract-conflict` 记录并升级（可能需要 runtime pipe-junction 扩展，属 runtime mission 同步）。

### 12.3 后续阶段

| 阶段 | 内容                                                                                       |
| ---- | ------------------------------------------------------------------------------------------ |
| E2.4 | undo-redo 设计（消费本档连线变更入栈：connection 写入 = 结构 diff + 联动重算 = 属性 diff） |
| E2.6 | renderer 契约（消费本档连线相关句柄扩展 + connection test-handle）                         |
| E3   | 设计 gate（独立 plan，6 份设计文档终轮复核）                                               |
| E4.1 | 包结构裁定                                                                                 |
| E4.2 | 注册 `scada-editor-canvas` 空壳 + 引入依赖                                                 |
| E7.1 | 端点吸附连线实现（落地本档契约）                                                           |
| E9   | M3 完善（「断开连接」工具 + dangling connection 清理 + 多 connection 批量编辑）            |
