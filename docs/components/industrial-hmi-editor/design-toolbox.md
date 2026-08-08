# 工具箱设计 design-toolbox.md

> 日期：2026-08-06
> 版本：v1（E2.5 产出）
> 实现收口：**E9.1 已落地**（2026-08-07，plan `docs/plans/2026-08-07-0906-2-e9-m3-toolbox-completion-and-closeout.md` Phase 1）—— `packages/flux-renderers-industrial/src/editor/toolbox/` 4 模块（align-distribute.ts/z-order.ts/clipboard.ts/toolbox-panel.tsx）+ use-editor-engine.ts 工具箱扩展句柄 + editor-test-handle.ts toolbox 子句柄 + operation-coalesce.ts M3 跨操作合并完善 + scada-editor-canvas-toolbox.test.tsx e2e。五项工具复用映射全部按本档 §4.1/§4.2/§4.3/§4.4/§4.5 落地（grep 证实无 runtime 命令面/serialize/registerScadaSymbol 重写）；T3（z 序经 symbols 数组）/T4（clipboard id 唯一）/T5（导入确认对话框）风险防护落地。
> 上游：编辑器架构 `design-architecture.md`（E2.1，§4.3 视口命令 + §8.5 句柄面扩展）、属性面板 `design-property-panel.md`（E2.2）、连线 `design-connection.md`（E2.3）、undo-redo `design-undo-redo.md`（E2.4，跨操作合并 M3 完善）、runtime 引擎层 `docs/components/industrial-hmi/design-engine.md`（§8.2 18 命令面 fit/center/setViewport/zoomAt + exportConfig/importConfig）、runtime renderer 句柄 `docs/components/industrial-hmi/design-renderer.md`（§8.5 component handles）、立项材料 `docs/components/industrial-hmi/editor-initiation.md`（§2.1 工具箱功能域 P2 M3）
> 下游：E9.1 工具箱完整实现（消费本档五项工具 + 复用映射）；E2.6 renderer 契约（消费 toolbox region 契约 + 句柄面扩展）
> 依据：roadmap `docs/components/roadmap-industrial-hmi-editor.md`（E2.5 + Cross-Cutting 平台能力复用）+ E2 plan `docs/plans/2026-08-06-1931-2-e2-editor-design-documents.md`

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent（fresh session，不复用编写者上下文）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。轮次记录如下：

- **Round 1（2026-08-06，fresh session 独立子 agent `ses_028d9884cffeuYnP0csV0mcoT3`）**：判定 `AGREE`——0 Blocker / 0 Major / 1 Minor / 0 Nit。4 项核对逐项 PASS：① 视图工具复用引擎命令面（§4.1 fit/center/setViewport/zoomAt/getViewport 逐项映射 runtime `scada-engine.ts` live :269/:275/:281/:287/:302，无重复实现）；② 导入导出复用句柄面（§4.4 exportConfig/importConfig 映射 runtime `use-scada-handles.ts:11-21` SCADA_HANDLE_METHODS live，无重复实现 serialize.ts）；③ 图元库管理只读（§4.5 显式「只读浏览」+ 禁止写入 registerScadaSymbol/unregisterScadaSymbol；listScadaSymbols() 经 `symbol-registry.ts:38` + `index.ts:43` live 核实）；④ 与 design-engine.md §8.2 命令面 live 一致（18 命令面 :246-255 + 工具箱映射表无命令增删改名）。**1 Minor 落地**：**m-1** §4.5 图元库枚举「10 基础形状 + image/video + group + 4 设备 + 4 仪表 + 4 传感控制 + pipe-junction」与 `editor-initiation.md:55` 口径「10 基础形状 + group + 4 设备 + 4 仪表 + 4 传感控制 + pipe-junction（=24）」不一致——image/video 已包含在 10 基础形状内（`base-shapes/` 目录 live 实证），原枚举可能误读为 26；改为对齐 editor-initiation.md 口径。**Round 1 达成共识（连续一轮 0 Blocker/0 Major/0 新增 Minor，仅 1 项 cosmetic Minor 当场落地，未超 3 轮上限）**。本文件可作为 E9.1 工具箱实现的契约依据。E3 设计 gate（独立 plan）为终轮复核。

---

## 1. 组件定位

- 本文档定义**编辑器工具箱设计**：视图工具（缩放/平移/fit/center 复用引擎命令）、对齐/分布/层级（toTop/toBottom）、复制粘贴、导入导出（exportConfig/importConfig 复用句柄面）、图元库管理（注册表只读浏览）。
- 工具箱是编辑器的**P2 M3 功能域**（`editor-initiation.md §2.1` P2 M3）：M3 与「撤销深化」+「文档收尾」同期落地（roadmap §2.2）；M1/M2 不实现工具箱（M1/M2 范围见 roadmap §2.2）。
- 工具箱**绝大部分能力复用 runtime 已有命令面/句柄面**（roadmap Cross-Cutting 平台能力复用 + editor-initiation §2.1「组件句柄 fit/center/getSymbols/getSymbol/exportConfig/importConfig 已注册——工具箱大部分能力可直接消费句柄面」），本档核心是**复用映射 + 工具箱 UI 编排**。
- 边界：本档**只定义五项工具的复用映射 + 工具箱 UI 契约**，不定义具体 UI 组件布局（E9.1 实现期落地，复用 `@nop-chaos/ui`）、不实现任何代码（E9.1+）、不重新实现 runtime 命令面（runtime 复用点 #1 #5 已落地）。
- 非目标：不修改 runtime 18 命令面 + 9 句柄方法（runtime 已落地，编辑器消费）；不定义新命令（编辑器扩展命令 addSymbol/removeSymbol/updateSymbol/group/ungroup/undo/redo 属 design-architecture.md §8.5，不在本档）；不定义「撤销历史面板」UI（design-undo-redo.md §4.5 已声明，M3 可选项）。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无 canvas 编辑工具箱先例。对照调研结论：
  - **leafer Editor 插件**（render-engines §5）：成组/层级/锁定（group/ungroup/openGroup/closeGroup/toTop/toBottom/lock/unlock）——层级类操作蓝本，编辑器经适配层转 group/ungroup 结构 diff（design-undo-redo.md §4.3）；
  - **meta2d**（scada-apps §2.3）：图元注册表（`register({penName: drawFn})`）——图元库管理蓝本（只读浏览已注册图元）；
  - **SceneV 五类扩展**（scada-apps §4，宣传级）：工具分组（视图/编辑/对齐/分布/层级）——工具箱分类蓝本（本档按 editor-initiation §2.1 五项功能域分类）；
  - **FUXA**（scada-apps §3.5）：gridster 卡片布局 + GaugeSettings——图元库面板 + 拖入放置蓝本（图元库管理 + 拖入已在 M1 落地 E5.2，本档图元库管理只补「只读浏览」工具）。

### Flux 决策表（工具箱层）

| 能力                                                     | 采纳        | 不采纳                                 | 理由（依据                                                                                                                                                                                                                                  |
| -------------------------------------------------------- | ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 视图工具复用引擎命令面（fit/center/setViewport/zoomAt）  | **P0 采用** | 编辑器独立实现视口命令                 | runtime 复用点 #1（editor-initiation §3）：`scada-engine.ts` 18 命令面已含 fit/center/setViewport/zoomAt/getViewport；design-engine.md §8.2 live；编辑器经 `engine.fit()` 等直接调用                                                        |
| 对齐/分布 = 编辑器适配层算法（基于 selection 包围盒）    | **P0 采用** | runtime 引擎扩展                       | 对齐/分布是多图元相对位置算法（基于选区包围盒），不属于 runtime 单图元命令；编辑器适配层实现（纯逻辑单测先行，对齐 design-connection.md §4.5 联动算法模式）                                                                                 |
| 层级（toTop/toBottom）= 经 z 序命令（runtime tree z 序） | **P0 采用** | leafer Editor 内置 toTop/toBottom      | leafer Editor 提供成组/层级原语（render-engines §5），但 z 序 = 组态 JSON symbols 数组顺序（design-engine.md §4.3「组态 JSON 中同层节点数组序即 z 序」）；编辑器经适配层重排 symbols 数组（不依赖 leafer Editor toTop/toBottom）            |
| 复制粘贴 = clipboard（编辑会话 working copy 内）         | **P0 采用** | OS clipboard / 跨编辑器粘贴            | 编辑器内剪贴板（编辑会话 working copy 内 ref 持有），存储 ScadaSymbolNode 副本；粘贴时分配新 id（保证唯一性）；不接 OS clipboard（M3 后可选项）                                                                                             |
| 导入导出复用 runtime 句柄面（exportConfig/importConfig） | **P0 采用** | 编辑器独立序列化                       | runtime 复用点 #5（editor-initiation §3）：`use-scada-handles.ts:11-21` 既有 exportConfig/importConfig（design-renderer.md §8.5）；编辑器直接调用 `component:exportConfig()` / `component:importConfig(config)`                             |
| 图元库管理 = 只读浏览（listScadaSymbols）                | **P0 采用** | 注册新图元（写入 registerScadaSymbol） | editor-initiation §2.1「图元库管理（注册表只读浏览）」；写入路径（registerScadaSymbol）属扩展开发（第三方包 / runtime mission I8/I9），不在编辑器工具箱；编辑器经 `listScadaSymbols()` 列出 24 内置图元供面板浏览（M1 E5.2 已落地拖入放置） |

## 3. Flux 中的 renderer/type 定义

- 工具箱**不是独立 renderer type**：工具箱是 `scada-editor-canvas` 的 `toolbox` region（`design-architecture.md §4.1`），由编辑器 renderer 在 React DOM 内渲染（canvas 外层）；
- 包归属：与编辑器 renderer 同包（**方案 A 裁定**，2026-08-06 E4.1——`flux-renderers-industrial` 的 `src/editor/` subpath，详见 design-architecture.md §4.4.1）。

### 与既有 flux 架构的边界（E2.5 Decision）

| 边界         | 约定                                                                                                                                                                                                                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 依赖   | 工具箱 UI（按钮/面板）属 React 视图结构层；对齐/分布算法属域核心（无 React 依赖）                                                                                                                                                                                                              |
| 数据流       | 工具箱工具触发 → 调用 runtime 引擎命令 / 句柄 / 编辑器扩展句柄 → 更新编辑会话 working copy（不直接读 flux scope）                                                                                                                                                                              |
| 事件流       | 工具箱触发不派发 `symbol:*` action（R5 隔离）；schema 级 `onSessionChange` 派发由底层句柄（addSymbol/removeSymbol/undo/redo 等）触发                                                                                                                                                           |
| 注册机制     | 工具箱不进 `renderer-definitions.ts` 注册（属 region 内部 UI）                                                                                                                                                                                                                                 |
| 测试句柄     | 工具箱操作经 `window.__flux_scada_editor_<cid>` 程序化驱动（E2.6 完整契约）                                                                                                                                                                                                                    |
| 平台能力复用 | 复用 runtime `scada-engine.ts` 18 命令面（视图工具）+ `use-scada-handles.ts:11-21` 9 句柄方法（导入导出）+ 编辑器扩展句柄（addSymbol/removeSymbol/updateSymbol/group/ungroup/undo/redo，design-architecture.md §8.5）+ `listScadaSymbols()` 图元注册表 API（图元库管理只读）；**禁止重复实现** |

## 4. schema 设计（五项工具复用映射）

### 4.1 视图工具（缩放/平移/fit/center 复用引擎命令，runtime 复用点 #1）

**复用 runtime `scada-engine.ts` 18 命令面**（design-engine.md §8.2 live）：

| 工具                           | UI 触发                             | 复用 runtime 命令                                                                                                                                             | 失败路径                                                                                |
| ------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 缩放（zoom in/out）            | toolbox 按钮 + 鼠标 wheel（编辑态） | `engine.zoomAt(worldPoint, factor)`（design-engine.md §8.2）；factor > 1 放大 / factor < 1 缩小；minScale/maxScale 钳制（design-engine.md §4.4，0.1/20 缺省） | 缩放边界：到达 minScale 时禁用 zoom out；到达 maxScale 时禁用 zoom in（statusBar 提示） |
| 平移（pan）                    | toolbox 按钮 + 鼠标 drag（空白区）  | runtime 已配 `move: { drag: 'auto', dragEmpty: true }`（design-engine.md §4.4 I14.1）；空白区拖动触发画布平移（编辑态保留，与运行态一致）                     | —                                                                                       |
| fit（适应画布）                | toolbox 按钮                        | `engine.fit()`（design-engine.md §8.2）；计算保持比例的最大缩放，使所有图元可见                                                                               | `not-visible`（空场景无 bounds，对齐 design-renderer.md §8.5 WD-5）                     |
| center（居中）                 | toolbox 按钮                        | `engine.center()`（design-engine.md §8.2）；计算将所有图元 bounds 中心对齐视口中心的平移量                                                                    | `not-visible`（空场景）                                                                 |
| 重置视口（reset zoom）         | toolbox 按钮                        | `engine.setViewport({ x: 0, y: 0, scale: 1 })`（design-engine.md §8.2）；恢复初始视口                                                                         | —                                                                                       |
| 当前视口查询（statusBar 显示） | 自动（视口变更后派发）              | `engine.getViewport()`（design-engine.md §8.2）；返回 `{x, y, scale}`                                                                                         | —                                                                                       |

**复用约束**：

1. 编辑器**不重新实现**视口命令（runtime 复用点 #1 已落地）；
2. 视口命令失败路径（`not-mounted` / `not-visible`）对齐 runtime design-renderer.md §8.5；
3. 视口命令不影响编辑会话 working copy（视口是临时态，不入组态 JSON 序列化的 `viewport` 字段，design-renderer.md §4.2 视图配置）。

### 4.2 对齐/分布/层级（编辑器适配层算法 + symbols 数组重排）

#### 4.2.1 对齐/分布（基于 selection 包围盒，编辑器适配层算法）

**对齐工具**（左对齐/右对齐/水平居中/顶对齐/底对齐/垂直居中）：

- 输入：当前 selection（≥2 个 nodeId）+ 各图元的 bounds（x/y/width/height）；
- 算法（编辑器适配层，纯逻辑单测先行）：
  1. 计算选区包围盒（min x/y + max x/y）；
  2. 按对齐方向重排各图元 x/y（保持 width/height 不变）；
  3. 产出 forward diff = `{updated: [{id, patch: {x, y}}, ...]}`，operationKind=`transform-move`（多图元）；
  4. 入栈（design-undo-redo.md §4.2 transform 节流起止帧规则，整组对齐 = 1 个 diff）；
- 复用：`engine.getSymbol(id)` 查图元当前几何（design-engine.md §8.2，runtime 复用点 #1）。

**分布工具**（水平等距/垂直等距）：

- 输入：当前 selection（≥3 个 nodeId）+ 各图元的 bounds；
- 算法：按水平/垂直方向排序后等间距重排 x/y；
- forward diff 同对齐（多图元 transform-move）。

> **坐标语义裁定（M3 扁平算法 / T1 接受，plan `2026-08-09-0648-3` Phase 2 同步）**：对齐/分布按各图元**顶层 bounds 的局部 `x/y/width/height`** 计算，**不解析 group 嵌套相对坐标**（不把 group 子节点的 parent-relative local 换算成 world）。理由：① 与 snap/hit/linkage 统一 `collectWorldBounds`（世界坐标）不同，对齐/分布是**基于选区包围盒的多图元相对位置算法**，不是对场景的命中/吸附；② 同父兄弟的 local 坐标系一致，对齐在 local 空间自洽；仅「跨层级混选」（顶层节点 + 嵌套 group 子节点）会按各自原始 x/y 直接比较，结果落在混合坐标空间——此为**已接受的 M3 限制（T1 trade-off）**，非 P1-C2/C3 回归。代码 docstring（`align-distribute.ts:5-6`）+ 测试注释（`align-distribute.test.ts:174-185`「documented M3 flat-algorithm, T1 trade-off」）与本节三处口径一致。升级为 world 解析属未来 feature，非当前 contract 缺陷。

#### 4.2.2 层级（toTop/toBottom = symbols 数组重排）

**z 序规则**（design-engine.md §4.3）：组态 JSON symbols 数组顺序即 z 序（同层节点数组序即渲染顺序，无额外 zIndex 字段）。

| 工具                 | UI 触发                 | 实现                                                                                                                                                                                                                  |
| -------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 置顶（toTop）        | toolbox 按钮 / 右键菜单 | 适配层：把 selection 的 nodeId 在 working copy `symbols` 数组中移到末尾（顶层）；产出 forward diff = 结构 diff（removed=[id] + added=[node]，等价于「先删后加到末尾」，对齐 design-undo-redo.md §4.3 结构 diff 模式） |
| 置底（toBottom）     | toolbox 按钮 / 右键菜单 | 同上，移到数组开头（底层）                                                                                                                                                                                            |
| 上移一层（moveUp）   | toolbox 按钮            | 与前一个数组元素交换位置（朝末尾方向）                                                                                                                                                                                |
| 下移一层（moveDown） | toolbox 按钮            | 与后一个数组元素交换位置（朝开头方向）                                                                                                                                                                                |

**为什么不直接用 leafer Editor toTop/toBottom**：runtime z 序 = symbols 数组顺序（非 leafer 内部 zIndex），编辑器必须维护组态 JSON 数组顺序一致；直接用 leafer Editor toTop 会绕过组态 JSON（双源化风险，R3 类防护），故编辑器经适配层重排 symbols 数组（与 runtime 序列化往返一致）。

### 4.3 复制粘贴（编辑器内 clipboard）

**clipboard 模型**（编辑会话 working copy 内，ref 持有）：

```typescript
interface EditorClipboard {
  /** 剪切/复制的图元节点副本（含 children 递归副本，深拷贝） */
  symbols: ScadaSymbolNode[];
  /** 操作类型（用于粘贴时的位移语义） */
  operation: 'copy' | 'cut';
  /** 复制时间戳（用于剪贴板过期清理，可选） */
  timestamp: number;
}
```

| 操作          | UI 触发           | 实现                                                                                                                                                                                                                                                                                                    |
| ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 复制（copy）  | Ctrl+C / 右键菜单 | 适配层：深拷贝 selection 的图元节点 → 存入 clipboard；不修改 working copy；不派发 action（仅 statusBar 提示「已复制 N 个图元」）                                                                                                                                                                        |
| 剪切（cut）   | Ctrl+X / 右键菜单 | 适配层：深拷贝 + 移除 selection（产出 forward diff = `{removed: [...ids], added: [], updated: []}`，结构 diff）；入栈                                                                                                                                                                                   |
| 粘贴（paste） | Ctrl+V / 右键菜单 | 适配层：读取 clipboard → 为每个图元分配新 id（保证唯一性，建议 `${原id}-copy-${timestamp}` 或 UUID）+ 应用位移偏移（避免与原图元重叠，建议 +20px/+20px）+ **重写 connection.target/id**（见下） → 产出 forward diff = `{added: [...新节点], removed: [], updated: []}`；入栈；新 selection = 新 id 列表 |

**id 唯一性保证**：

- 粘贴时分配新 id（不保留原 id，防止冲突）；
- 多次粘贴同一 clipboard：每次都分配新 id（用户可连续 Ctrl+V 粘贴多个副本）；
- id 生成策略：UUID v4 或 `${原id}-copy-${counter}`（编辑会话维护 counter 保证唯一）。

**connection target/id 重写**（粘贴含连线的 pipe-junction 子图）：

- 先对 clipboard.symbols 建 `oldId→newId` 全图映射（顶层 + group 子树递归），再重写每个含 `custom.connections` 节点的连线声明；
- `connection.target`：命中映射用副本 id（target 同在选区被一起复制时副本连线指向副本 target，而非原件）；未命中（target 未被复制）按 dangling-tolerant 保留原件 target（与 `listAllConnections` 的 dangling 诊断一致）；
- `connection.id`：经 `generateConnectionId(副本 junction id, ...)` 重新生成，不与原件重复（同一 junction 多条连线互不碰撞）。

**剪贴板隔离**：

- 编辑器内 clipboard（不接 OS clipboard，M3 后可选项）；
- 不同编辑器实例的 clipboard 独立（域内部 ref 持有）。

### 4.4 导入导出（复用 runtime 句柄面，runtime 复用点 #5）

**复用 runtime `use-scada-handles.ts:11-21` 既有 exportConfig/importConfig 句柄**（design-renderer.md §8.5 live）：

| 工具           | UI 触发             | 复用 runtime 句柄                                                                                                                                                                                                                                                                                | 失败路径                                                    |
| -------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| 导出（export） | toolbox 按钮 / 菜单 | `component:exportConfig()`（design-renderer.md §8.5）：返回序列化的 ScadaConfig 字符串（含 working copy 当前状态）；编辑器把返回值写入文件下载 / 复制到 OS clipboard（host 决定）                                                                                                                | `not-mounted`（design-renderer.md §8.5）                    |
| 导入（import） | toolbox 按钮 / 菜单 | `component:importConfig(config)`（design-renderer.md §8.5）：装载外部 config 替换编辑会话 working copy（不保留编辑历史，重置 undo/redo 栈，对齐 design-undo-redo.md §8.2）；编辑器先弹确认对话框（提示「导入将清空当前编辑历史」）+ 经 host 文件选择 / clipboard 读取 config 字符串 → 调句柄装载 | `not-mounted` / `invalid-config`（design-renderer.md §8.5） |

**复用约束**：

1. 编辑器**不重新实现**序列化（runtime serialize.ts 已落地，design-renderer.md §4.3）；
2. 导入前经 `validateScadaConfig` 校验（runtime 复用点 #4，design-property-panel.md §6 同口径）；
3. 导入导出失败路径对齐 runtime design-renderer.md §8.5（错误码 + i18n）。

### 4.5 图元库管理（注册表只读浏览）

**只读浏览**（editor-initiation §2.1「图元库管理（注册表只读浏览）」）：

- 复用 runtime `listScadaSymbols()` 图元注册表 API（runtime 复用点 #3，editor-initiation §3 + design-renderer.md §11 公共导出面）；
- 列出 24 内置图元（10 基础形状 + group + 4 设备 + 4 仪表 + 4 传感控制 + pipe-junction，对齐 `editor-initiation.md:55` 口径；image/video 占位包含在 10 基础形状内）；
- UI：图元库面板（M1 E5.2 已落地拖入放置，本档补「只读浏览」工具 = 仅展示，无注册新图元）。

**禁止写入**：

- 编辑器工具箱**不提供** `registerScadaSymbol` / `unregisterScadaSymbol` 写入路径（属扩展开发，第三方包/runtime mission I8/I9 范围）；
- 编辑器是图元注册表的**消费者**，不是生产者。

## 5. 字段分类（工具箱相关字段）

| 字段                       | 归属                       | 说明                                           |
| -------------------------- | -------------------------- | ---------------------------------------------- |
| `clipboard.symbols`        | 编辑会话模型域内部         | §4.3                                           |
| `clipboard.operation`      | 编辑会话模型域内部         | 'copy' / 'cut'                                 |
| `clipboard.timestamp`      | 编辑会话模型域内部         | 过期清理用（可选）                             |
| 当前视口（statusBar 显示） | runtime 引擎域内部（派生） | `engine.getViewport()` 查询，不入 working copy |
| 当前 selection             | 编辑会话模型域内部         | 对齐/分布/层级/复制粘贴工具的输入              |

## 6. 图层与场景树（对应 regions 约定）

- 工具箱不产生新图层：所有工具经现有编辑器 + runtime 引擎渲染（视图工具影响视口 / 对齐分布层级重排 symbols / 复制粘贴增删图元 / 导入导出替换 working copy / 图元库浏览面板）；
- 工具箱 UI（按钮 / 面板）：canvas 外层 React DOM（design-architecture.md §6 HTML 覆盖层）。

## 7. 运行期状态归属

| 状态           | Owner                               | 说明                                                            |
| -------------- | ----------------------------------- | --------------------------------------------------------------- |
| clipboard      | **域内部（编辑会话模型 ref 持有）** | 不进 scope；ref 持有；copy/cut/paste 操作修改                   |
| 当前视口       | **域内部（runtime 引擎）**          | 经 `engine.getViewport()` 查询（视口变更派发 statusBar 重渲染） |
| 当前 selection | **域内部（编辑会话模型）**          | 多图元工具（对齐/分布/层级/复制粘贴）的输入                     |
| 工具箱 UI 状态 | **local（React）**                  | 按钮 disabled 状态（如 selection 为空时禁用对齐工具）           |

## 8. 事件、动作与组件句柄能力

### 8.1 工具箱事件流（不派发运行态 action）

- 视图工具：直接调 runtime `engine.fit()` 等命令；不修改 working copy；不派发 action；
- 对齐/分布/层级/复制/剪切/粘贴：经编辑器扩展句柄（addSymbol/removeSymbol/updateSymbol）+ undo 栈；派发 `onSessionChange`（schema 级）；
- 导入/导出：经 runtime 句柄（exportConfig/importConfig）；导入派发 `onSessionChange`（重置 undo/redo 栈后）；
- 图元库浏览：只读查询，不派发 action；
- 全部不派发 `symbol:*` action（R5 隔离）。

### 8.2 工具箱使用的句柄（消费 design-architecture.md §8.5 + runtime §8.5）

| 句柄                                                                                 | 工具箱使用场景                                                                        |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `engine.fit()` / `center()` / `setViewport()` / `zoomAt()` / `getViewport()`         | 视图工具（§4.1）                                                                      |
| `component:exportConfig()` / `importConfig(config)`                                  | 导入导出（§4.4，runtime 复用）                                                        |
| `component:addSymbol(node)` / `removeSymbol(nodeId)` / `updateSymbol(nodeId, patch)` | 粘贴（addSymbol）/ 剪切（removeSymbol）/ 对齐分布层级（updateSymbol 结构 diff，§4.2） |
| `listScadaSymbols()`                                                                 | 图元库浏览（§4.5 只读，runtime 复用）                                                 |

### 8.3 编辑期测试句柄（架构层声明，完整契约属 E2.6）

```typescript
interface ScadaEditorToolboxTestHandle {
  /** 程序化触发视图工具（e2e 用） */
  fit(): void;
  center(): void;
  zoomAt(worldPoint: { x: number; y: number }, factor: number): void;
  /** 程序化对齐/分布/层级 */
  align(direction: 'left' | 'right' | 'top' | 'bottom' | 'hcenter' | 'vcenter'): void;
  distribute(direction: 'horizontal' | 'vertical'): void;
  toTop(): void;
  toBottom(): void;
  /** 程序化复制/剪切/粘贴 */
  copy(): void;
  cut(): void;
  paste(): void;
  /** 查询 clipboard 状态 */
  getClipboard(): { symbols: ScadaSymbolNode[]; operation: 'copy' | 'cut' } | null;
  /** 程序化导入/导出 */
  exportConfig(): string;
  importConfig(config: string | ScadaConfig): void;
  /** 列出图元库（只读） */
  listSymbolLibrary(): Array<{ type: string; name: string; category: string }>;
}
```

经 `window.__flux_scada_editor_<cid>.toolbox` 暴露（E2.6 完整契约）。

## 9. 数据源、表达式、导入能力接入点

- 工具箱**不接数据源**：所有工具操作内存态 working copy；
- 工具箱**不参与表达式求值**；
- 导入/导出文件 IO：经 host（文件下载 / 文件选择 / clipboard），不直调 fetch（INV-1，对齐 design-renderer.md §9）；
- i18n：工具箱按钮 label + tooltip + statusBar 提示经 `flux-i18n`（复用 runtime，roadmap Cross-Cutting）。

## 10. 样式与 DOM marker 约定

- 工具箱 UI 使用 `@nop-chaos/ui` 既有组件（Button / ButtonGroup / Tooltip / DropdownMenu / Separator 等，AGENTS.md「UI Component Usage」）；
- 根容器 marker（架构层声明）：`nop-scada-editor-toolbox` + `data-slot="scada-editor-toolbox"`；
- 子标记（plan 2026-08-08-0900-2 Phase 4 / #14 文档化——发射为识别钩子，无专用 CSS 规则；视觉样式经 `@nop-chaos/ui` 组件 + `data-slot` 查询锚点承载）：
  - `nop-scada-editor-toolbox-btn`（每个按钮）—— 识别钩子，无专用样式（按钮视觉由 `@nop-chaos/ui` Button 提供）；
  - `nop-scada-editor-toolbox-sep`（每个分隔符）—— 识别钩子，无专用样式（Separator 视觉由 `@nop-chaos/ui` 提供）；
  - `nop-scada-editor-toolbox-status` + `data-slot="scada-editor-toolbox-status"`（状态消息 span）—— 测试查询锚点（`data-slot`）+ 识别钩子；
  - `nop-scada-editor-toolbox-import-textarea` + `data-slot="scada-editor-toolbox-import-textarea"`（导入对话框 textarea）—— 测试查询锚点 + 识别钩子；
- 不产生 canvas 内 DOM marker（工具箱是 DOM UI）；
- 主题独立性：CSS 变量 + 稳定 class 名（不引入 React ThemeProvider，roadmap Cross-Cutting）。

## 11. 实现拆分建议（设计期契约，完整拆分属 E9.1）

```
packages/flux-renderers-industrial-editor/src/   （方案 B；E4.1 裁定最终归属）
OR packages/flux-renderers-industrial/src/editor/（方案 A）
├── toolbox/
│   ├── align-distribute.ts      # alignDistribute(selection, bounds, direction) 算法（纯逻辑单测先行）
│   ├── z-order.ts               # toTop/toBottom/moveUp/moveDown 经 symbols 数组重排（纯逻辑单测先行）
│   ├── clipboard.ts             # clipboard 模型 + copy/cut/paste 操作（含 id 重新分配）
│   └── toolbox-panel.tsx        # 工具箱 UI（按钮编排 + @nop-chaos/ui 组件）
└── （编辑器主 renderer / 适配层 / 编辑会话模型 等，见 design-architecture.md §11）
```

- 拆分依据：`renderer-implementation-guidelines.md` Case 4（align-distribute + z-order + clipboard 为域核心，纯逻辑单测先行；toolbox-panel 为编辑器视图层）。
- 实现阶段映射：E4.1（包结构裁定）→ E4.2（注册空壳）→ E9.1（工具箱完整实现，M3）→ E9.2（M3 收尾 + benchmark 复测）。

## 12. 风险、取舍与后续阶段

### 12.1 风险清单

| #   | 风险                                            | 本档防护/接受                                                                                                                                                                   |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | 对齐/分布算法在多 group 嵌套场景下的语义        | **接受 + 留 E9.1 实测**：本档定义基于 selection bounds 的扁平算法；group 嵌套场景（选中 group 内子图元）的相对坐标处理留 E9.1 实现期细化（可选限制 M3 不支持跨 group 嵌套对齐） |
| T2  | clipboard 跨编辑器实例（用户期望 OS clipboard） | **接受 + 留 M3 后选项**：M3 编辑器内 clipboard（不接 OS）；M3 后可选项（如 host 提供 OS clipboard 桥接）                                                                        |
| T3  | 层级（z 序）与 leafer Editor toTop 不一致       | **防护**：本档显式声明编辑器经 symbols 数组重排（与 runtime 序列化往返一致），不调 leafer Editor toTop/toBottom（避免双源化，§4.2.2）                                           |
| T4  | 复制粘贴 id 冲突                                | **防护**：粘贴时分配新 id（§4.3，`${原id}-copy-${counter}` 或 UUID）；编辑会话维护 counter 保证唯一                                                                             |
| T5  | 导入清空编辑历史用户感知丢失                    | **防护**：导入前弹确认对话框（提示「导入将清空当前编辑历史」，§4.4）；默认取消，需用户显式确认                                                                                  |

### 12.2 风险与取舍

- **不重复实现 runtime 命令面/句柄面**：本档显式声明编辑器复用 runtime 18 命令面（视图工具）+ 9 句柄方法（导入导出）+ 编辑器扩展句柄（addSymbol/removeSymbol 等）+ listScadaSymbols 图元库 API；对齐/分布/层级/clipboard 是编辑器域核心算法（runtime 不提供，因 runtime 无编辑场景）。
- **架构冲突记录**：若 E9.1 实现期发现某工具需要 runtime 扩展（如对齐算法需要 runtime 引擎提供 bounds 查询 API），按 plan Failure Paths `design-contract-conflict` 记录并升级（可能需要 runtime 引擎扩展，属 runtime mission 同步）。

### 12.3 后续阶段

| 阶段 | 内容                                                                      |
| ---- | ------------------------------------------------------------------------- |
| E2.6 | renderer 契约（消费本档 toolbox region 契约 + 工具箱句柄扩展 + 测试句柄） |
| E3   | 设计 gate（独立 plan，6 份设计文档终轮复核）                              |
| E4.1 | 包结构裁定                                                                |
| E4.2 | 注册 `scada-editor-canvas` 空壳 + 引入依赖                                |
| E9.1 | 工具箱完整实现（M3，落地本档五项工具契约）                                |
| E9.2 | M3 收尾 + benchmark 复测 + 文档收尾                                       |
