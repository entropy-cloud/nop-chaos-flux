# 通用引擎层设计：图元模型 design-symbols.md

> 日期：2026-08-03
> 版本：v1（I2.3 产出）
> 上游：调研汇总 `docs/analysis/industrial-hmi/research-summary.md`（§3 V5/§4.1 E7/§4.3 A4）、SCADA 应用调研 `docs/analysis/industrial-hmi/research-scada-apps.md`（§2.3 图元注册机制/§2.4 序列化字段/§6 #15）、渲染引擎调研 `docs/analysis/industrial-hmi/research-render-engines.md`（§8 #4/#6 按 tag 注册表与状态原语）、gate 结论 `docs/analysis/industrial-hmi/gate-1-review.md`（§6 约束映射：本档无新增约束）、讨论文件 `docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md`（Q4 核心全族/§九 待定事项）
> 下游：`design-renderer.md`（I2.4，图元 type 命名与组态 JSON schema 对齐）；实现 I5.4/I8/I9 引用本文件
> 依据：roadmap `docs/components/roadmap-industrial-hmi.md` I2.3 + Cross-Cutting（平台能力复用表/测试纪律）

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent（fresh session）反复审查直到共识（判据：连续一轮 0 新增修正项）。记录如下：

- **Round 1（2026-08-03）**：独立 agent（fresh session）审查，判定 `REVISE`——1 Major（§8 句柄面与 design-engine.md §8.2 冲突：`getSymbolProps`/`setSymbolProps` 标为引擎句柄但引擎只提供 `applyAttrs` 唯一写入入口，统一为便捷封装并在引擎档补列）+ 6 Minor（头部 E7/A4 引注归错文件；「I1.2 V5 实测兼容」超 gate 记录，改为 gate §6 裁定 + V5 留待 I5.4 实测；头部占位预写判定反模式；形状族缺 `scada-video`（I8.1）且 image/video 交付相位标注不清；design-renderer §4.2 `events` 未引用 `ScadaSymbolEvent` 类型；type 命名约定自相矛盾——形状族无前缀）——修正项全部落地，未裁决项 0。
- **Round 2（2026-08-03）**：独立 agent（fresh session）确认轮，判定 `REVISE`——Round 1 七项全部验证落地；新增 1 Minor（F8：instrument 行 `scada-gauge` 等与 sensor-control 行 `scada-sensor` 等缺族前缀，违反 §4.4 约定；§4.1 type 注释未含形状族豁免），已全部落地（统一为 `scada-instrument-*`/`scada-sensor-control-*`，约定行补族 key 与豁免说明）。
- **Round 3（2026-08-03）**：独立 agent（fresh session）确认轮，判定 `REVISE`——F8 落地验证全部通过（约定行/仪表族/传感控制族/§4.1 注释/§3 示例 `scada-device-motor` 逐项吻合）；新增 1 Minor（M1：头部记录缺 Round 2 条目，审查轨迹未闭环），已落地。
- **Round 4（2026-08-03）**：独立 agent（fresh session）确认轮，判定 `AGREE`——M1 落地验证（Round 1/Round 2 记录事实性逐项核对通过、无悬空引用），全文轻扫无新增修正项，**达成共识**（共识循环：R1-R3 修正 3 轮 + R4 确认轮，未超轮次上限）。
- **终轮复核说明（I3.1 review gate，2026-08-03）**：I3.1 gate 为本文件「文档共识审查」的终轮复核（roadmap Cross-Cutting「不叠加额外审查轮」），本文件可作为 I5.4/I8/I9 实现的契约依据。

---

## 1. 组件定位

- 本文档定义**图元模型层**设计：Symbol 接口与属性 schema（几何/样式/文本/管线 + 状态样式）、图元注册机制（对齐 flux renderer registry 模式的 `registerScadaSymbol`）、复合图元（group 组合/instance 模板复用/实例属性覆盖）、基础形状与工业设备图元分类（形状族/设备族/仪表族/传感控制族，映射 I8/I9）。
- 图元模型层是引擎（`design-engine.md`）与数据绑定（`design-data-binding.md`）共同消费的**组态语义层**：符号定义是静态注册表（纯逻辑），实例是场景树节点（引擎持有）。
- **边界**：`design-symbols.md` 只定义 Symbol 接口/注册机制/分类与属性 schema 归属（讨论 §九：图元级 type `scada-symbol` 已评估裁定**不注册**（2026-08-04，§12.2 评估记录），本档只定义领域内符号注册表契约，不定义图元级 type 的注册契约）。
- 非目标：不定义具体图元实现细节（I8/I9）；不定义组态 JSON 顶层 schema（I2.4）；不定义动画/绑定语义（I2.2）。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无图元库先例。对照调研结论：
  - **meta2d.js**（scada-apps §2.3）：Pen=数据结构+绘制函数表；`register({penName: drawFn})` 函数注册 + svgPath 字符串注册；内置分类 `commonPens()`（基础几何/箭头/连线/DOM 型/组合）；Pen 字段 `id/tags/parentId/type/name/children[]/canvasLayer`（§2.4）；
  - **FUXA**（scada-apps §3.5）：GaugeSettings（id/type/property）+ SVG element ↔ 图元 id 一一对应；TypeTag 注册进 GaugesManager（`gauges.component.ts:80,112-121`）；
  - **leafer**（render-engines §8 #6/§12 #10）：`@registerUI()` + `UICreator.get(tag)` 按 tag 节点工厂——**已有按 tag 的注册表**，可映射为 `registerScadaSymbol`；无「符号实例化 + 参数化」语义（自研）；
  - **vue-webtopo-svgeditor**（summary A5）：四类图元注册模型（无状态/有状态/动画/自定义）；
  - **leafer `@leafer-in/state`**（summary A4/render-engines §8 #4）：hover/press 状态样式原语已有。

### Flux 决策表（图元模型层）

| 能力                                                            | 采纳        | 不采纳                         | 理由（依据）                                                                                                                                                                                                                                             |
| --------------------------------------------------------------- | ----------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 按 type 注册符号定义（`registerScadaSymbol`）                   | **P0 采用** | —                              | 对齐 flux renderer registry「注册表 + 工厂」模式（quick-reference.md RendererDefinition），映射 leafer `@registerUI` tag 工厂（research-summary §4.1 E7）；gate-1-review §6 裁定图元注册无 API 障碍（V5 自定义注册实测留待 I5.4 以单测/Playwright 覆盖） |
| 属性 schema 化（几何/样式/文本/管线 + 自定义扩展字段分层）      | **P0 采用** | Pen「数据结构+绘制函数」耦合体 | meta2d Pen 字段分层蓝本（scada-apps §2.4）；schema 化便于序列化/校验（I2.4）                                                                                                                                                                             |
| 复合图元：group（children 组合）+ instance（模板复用+属性覆盖） | **P0 采用** | —                              | meta2d parentId/children 组合 + 图元模板思想（scada-apps §2.4）；instance 属性覆盖为参数化语义（自研，leafer 无此语义）                                                                                                                                  |
| 状态样式（normal + 状态覆盖）                                   | **P0 采用** | 全状态全量样式表               | `@leafer-in/state` hover/press 原语（render-engines §8 #4）+ 业务多状态（I2.2 §4.5）；样式覆盖为增量                                                                                                                                                     |
| svgPath 字符串注册                                              | P1 评估     | —                              | meta2d `svgPath`（scada-apps §2.3）；fabric SVG parser 模块化（render-engines §12 #22）；需求未确认不引入                                                                                                                                                |
| 图元级 type `scada-symbol` 注册契约                             | —           | **不注册（已评估裁定）**       | 讨论 §九 评估触发点：I8/I9 图元库成型后评估——2026-08-04 已评估裁定不注册（无真实单图元独立用法 + 双 schema 漂移成本，§12.2 依据）                                                                                                                        |

## 3. Flux 中的 renderer/type 定义

- 图元模型层**不是 renderer type**：符号 type（如 `scada-device-motor`）是**组态 JSON 内部领域标识**（`design-renderer.md` 组态 schema 的 symbol 节点 `type` 字段），由引擎符号工厂在场景打开时解析；**不进 renderer-definitions、不注册 flux renderer type**（与 `scada-canvas` 单容器决策一致，讨论 Q10；`scada-symbol` 图元级 type 注册已评估裁定不注册，§12.2）。
- 包归属：`@nop-chaos/flux-renderers-industrial` 内 `symbols/` 子目录；符号注册 API 由包入口导出（`registerScadaSymbol`），供 I8/I9 图元库与第三方扩展消费。

## 4. schema 设计（Symbol 接口与属性 schema）

### 4.1 ScadaSymbolDefinition（注册契约）

```typescript
interface ScadaSymbolDefinition {
  /** 符号 type（组态 JSON 内唯一；命名 `scada-<族>-<名>`，形状族无前缀，见 §4.4 对齐约定） */
  type: string;
  /** 符号名（i18n key 或字面量，I15.1 消费） */
  name: string;
  /** 属性 schema（声明可序列化属性与类型） */
  props: ScadaSymbolPropSchema;
  /** 默认属性（实例未指定时生效） */
  defaults?: ScadaSymbolProps;
  /** 构造器：组态实例数据 → leafer 节点子树（返回 Group/UI 根节点） */
  create: (ctx: SymbolCreateContext) => LeafNode;
  /** 可选：实例属性变更增量应用（缺省走通用 set 路径） */
  applyProps?: (node: LeafNode, props: ScadaSymbolProps) => void;
  /** 可选：状态样式解析钩子（缺省通用解析） */
  resolveStateStyle?: (props, state) => ScadaSymbolStylePatch;
  /** 分类元信息（编辑器/图元库面板使用，I16 预留） */
  category?: 'shape' | 'device' | 'instrument' | 'sensor-control' | 'pipe';
}

interface SymbolCreateContext {
  id: string; // 实例 id
  props: ScadaSymbolProps; // 合并后的实例属性
  engine: ScadaCanvasEngine; // 引擎引用（design-engine.md）
  config: { world: { x: number; y: number; scale: number } };
}
```

> **强类型缺失注记（impl drift，2026-08-04）**：`SymbolCreateContext.engine` 在 impl `symbol-types.ts:64` 为 `unknown`，`ScadaTestHandle.engine/tree/app/getSymbol/getPointValue` 在 impl `engine/test-handle.ts:10-20` 亦为 `unknown`——根因为 `symbols/` 与 `engine/` 互相引用将形成循环导入（`ScadaCanvasEngine` 依赖 `SymbolCreateContext` 经 create 工厂，反向引用会环）。本档保留强类型接口面作契约示意；impl 走 `unknown` + 调用点局部窄化。e2e/单测消费时按 `design-engine.md §8.3` 结构断言。

- 注册表：`Map<type, ScadaSymbolDefinition>`；`registerScadaSymbol(def)`——同 type 重复注册**抛错**（`scada symbol type [...] is already registered`），需显式 `{ override: true }` 才替换（impl `symbol-registry.ts:18-22`，2026-08-04 措辞对齐）；`unregisterScadaSymbol(type)`。包入口另提供幂等的 `registerScadaSymbols()`（内置 24 图元注册，`hasScadaSymbol` 守卫，重复调用 no-op），由 `registerScadaRenderers` 内部调用，消费方亦可显式触发。
- 引擎侧映射：符号 `create` 返回 leafer 节点 → 挂入 `tree` 层；节点属性更新统一走 `leaf.set()` 批量路径（design-engine.md §4.5 合帧义务）；符号实例化即「按 tag 工厂」（leafer `UICreator.get`，research-summary §4.1 E7）的语义层封装。

### 4.2 属性 schema（ScadaSymbolProps）

```typescript
interface ScadaSymbolProps {
  // 几何
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number; // 度
  scale?: number; // 统一缩放（instance 覆盖用）
  visible?: boolean;
  opacity?: number;
  // 样式
  fill?: string; // 颜色/渐变/空
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: number[]; // 流动动画基础（dash-offset）
  fillStyle?: Record<string, unknown>; // 渐变/纹理参数（I8.1 落地细化）
  shadow?: { x: number; y: number; blur: number; color: string };
  // 文本
  text?: string;
  textColor?: string;
  textSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  align?: 'left' | 'center' | 'right';
  // 管线（flow 动画消费，I2.2 §4.4）
  flow?: { enabled: boolean; speed: number; dash?: number[] };
  dashOffset?: number; // 流动动画相位（flow 插值直接写入，I2.2 §4.4 flow 行 dash-offset 语义；I7 gate-3-review m-5 补列）
  // 自定义扩展字段（图元私有，schema 分层，meta2d 蓝本 scada-apps §2.4）
  custom?: Record<string, unknown>;
  // 状态声明容器（组态 JSON 字段类型 = I2.2 §4.5 ScadaStateDeclaration：states 映射 + 判定配置；样式增量覆盖经 ScadaStateDefinition.style = ScadaSymbolStylePatch）
  states?: ScadaStateDeclaration;
  // 数据绑定声明（I2.2 §4.2 消费）
  bindings?: Record<string, ScadaBinding>;
  // 动画声明（I2.2 §4.4 消费）
  animations?: ScadaAnimation[];
  // 事件声明（I2.4 消费：图元事件 → flux action）
  events?: ScadaSymbolEvent[];
}
type ScadaSymbolStylePatch = Partial<
  Pick<
    ScadaSymbolProps,
    | 'fill'
    | 'stroke'
    | 'strokeWidth'
    | 'opacity'
    | 'visible'
    | 'textColor'
    | 'shadow'
    | 'strokeDash'
  >
>;
```

- **样式解析与状态样式**（§10 详述）：normal 样式 = defaults 合并实例属性；状态样式 = 状态定义（I2.2 `states`）增量覆盖；`@leafer-in/state` 的 hover/press 交互样式为图元内部实现细节（I8.2 落地），不进组态 JSON。
- **状态覆盖不扩展 `fillStyle`（I8.1 Decision）**：渐变/纹理属图元静态样式，状态覆盖只作用于色值类既有 patch 字段（fill/stroke/strokeWidth/opacity/visible/textColor/shadow/strokeDash）；渐变状态覆盖需求未见确认场景，防止状态 patch 面膨胀。如实现期发现 leafer 渐变状态覆盖真实需求，按 I5/I6 plan Failure Paths `design-contract-conflict` 同口径记录并升级人工/下一 gate 评估。

### 4.3 复合图元（group/instance）

| 复合形态     | 语义                                          | 组态 JSON 表示                                                         | 序列化/覆盖规则                                                   |
| ------------ | --------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **group**    | 子图元组合（相对坐标 + 相对旋转），不引入模板 | symbol 节点 `type: "scada-group"` + `children[]`（子节点坐标相对父级） | 树递归序列化（I2.4）；子节点属性全量声明                          |
| **instance** | 注册符号模板复用（参数化实例）                | symbol 节点 `type: <已注册符号 type>` + 实例属性覆盖                   | 序列化时输出实例属性覆盖集（diff 于 defaults）；`custom` 字段透传 |

- instance 覆盖规则（深合并）：`defaults` ← 实例 JSON 属性 ← 绑定/动画/事件声明；`scale` 支持整体缩放；实例 id 唯一（组态内），同名引用场景（多台电机）各自实例化。
- group 与 leafer `Group` 节点一一映射（render-engines §2.1）；instance 复用与引擎节点工厂（§4.1 `create`）同路径。

### 4.4 图元分类（映射 I8/I9）

> 分类命名与 `design-renderer.md` 组态 JSON schema 的 symbol `type` 字段**对齐约定**（I2.3 Decision）：**形状族 `scada-<名>`（无族前缀，如 `scada-rect`）；其余族 `scada-<族>-<名称>`（族 key：`device`/`instrument`/`sensor-control`/`pipe`）**；属性 schema 归属本档 §4.2；具体图元实现与属性细化属 I8/I9（Non-Goals 不在此展开）。

| 族             | 分类       | 基础符号（I5.4：8 形状；I8.1：image/video 占位）                                                                                                                                 | 设备符号（I9.1）                                                                                              | 仪表符号（I9.2）                                                                                                                                               | 传感控制符号（I9.3）                                                                                                                                                   | 管线（I9.4）                                                           |
| -------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| shape          | 形状族     | `scada-rect`/`scada-round-rect`/`scada-ellipse`/`scada-line`/`scada-arrow`/`scada-pipe`/`scada-text`/`scada-polygon`（I5.4）；`scada-image`/`scada-video`（图片/视频占位，I8.1） | —                                                                                                             | —                                                                                                                                                              | —                                                                                                                                                                      | —                                                                      |
| device         | 设备族     | —                                                                                                                                                                                | `scada-device-motor`/`scada-device-pump`/`scada-device-valve`/`scada-device-fan`（含旋转/开关状态动画，I9.1） | —                                                                                                                                                              | —                                                                                                                                                                      | —                                                                      |
| instrument     | 仪表族     | —                                                                                                                                                                                | —                                                                                                             | `scada-instrument-gauge`/`scada-instrument-level`/`scada-instrument-thermometer`/`scada-instrument-progress`（量程换算+指针动画，I9.2 消费 I2.2 scale/format） | —                                                                                                                                                                      | —                                                                      |
| sensor-control | 传感控制族 | —                                                                                                                                                                                | —                                                                                                             | —                                                                                                                                                              | `scada-sensor-control-sensor`/`scada-sensor-control-indicator`/`scada-sensor-control-switch`/`scada-sensor-control-button`（报警闪烁+状态色，I9.3 消费 I2.2 状态样式） | —                                                                      |
| pipe           | 管道族     | —                                                                                                                                                                                | —                                                                                                             | —                                                                                                                                                              | —                                                                                                                                                                      | `scada-pipe-junction`（连接点+流动方向动画，I9.4 消费 I2.2 flow 动画） |

- 注册 API 归属：基础形状（8 形状）注册于 I5.4（引擎 Wave 1 内随 `BaseSymbol` 基类）；image/video 占位与设备/仪表/传感控制/管线族注册于 I8/I9（图元库 Wave 3/4）；本档只定契约与分类，不定义注册时的具体实现。

## 5. 字段分类

| 字段                                      | 归属                            | 说明                                                                             |
| ----------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| symbol 节点 `type`/`id`/`children[]`      | 组态 JSON 图元树（I2.4 schema） | 本档定义 type 命名规则（§4.4）                                                   |
| 几何/样式/文本/管线属性                   | 组态 JSON symbol 节点           | §4.2 `ScadaSymbolProps`                                                          |
| `custom` 扩展字段                         | 组态 JSON symbol 节点           | 图元私有 schema 分层（meta2d 蓝本），序列化透传                                  |
| `states`/`bindings`/`animations`/`events` | 组态 JSON symbol 节点           | 语义归属 I2.2（绑定/动画/状态）与 I2.4（事件）；本档只声明字段存在与 schema 对齐 |
| 符号定义注册表                            | **域内部（静态注册表）**        | `registerScadaSymbol`；不进 scope                                                |
| 实例节点/属性                             | **域内部（引擎场景树）**        | 引擎持有（design-engine.md §7）                                                  |

## 6. 图层与场景树（对应 regions 约定）

- 图元模型层不产生图层：符号实例挂入引擎图元层（`tree`），复合图元（group）为树内子层结构；实例化/销毁与 z 序规则见 `design-engine.md` §4.3。
- instance 节点引用语义：组态 JSON 内 instance 节点是**声明**（type + 属性覆盖），运行时经符号工厂展开为 leafer 节点树（引用计数由引擎节点索引管理）。

## 7. 运行期状态归属

| 状态               | Owner                  | 说明                                      |
| ------------------ | ---------------------- | ----------------------------------------- |
| 符号定义注册表     | **域内部（静态）**     | 场景无关，包加载时注册（I8/I9）           |
| 实例属性（当前值） | **域内部（引擎节点）** | 绑定/动画写入引擎节点属性；投影经测试句柄 |
| 实例-符号引用关系  | **域内部（节点索引）** | `id → Leaf`（design-engine.md §4.3）      |
| 状态样式解析结果   | **域内部（派生）**     | 值→状态→样式覆盖（I2.2 §7）               |

## 8. 事件、动作与组件句柄能力

- 符号级事件声明（`ScadaSymbolEvent`）：`{ on: 'click' | 'dblclick' | 'hover'; action: ActionSchema }`——事件载荷规范化与 flux action 派发属 `design-renderer.md`（I2.4 事件联动）；本档只声明字段位置（§4.2 `events`）。
- 引擎句柄（图元层，design-engine.md §8.2 命令句柄的图元便捷封装）：`getSymbol(id)`/`getSymbols()`/`getSymbolProps(id)`（读节点索引/属性）；`setSymbolProps(id, patch)`（= `engine.applyAttrs({[id]: patch})`，仍走 design-engine.md §4.5 合帧路径，不另设逐点写入口）；实例增删（`addSymbol`/`removeSymbol`，场景编辑场景，I16 预留）。

## 9. 数据源、表达式、导入能力接入点

- 图元模型层不接数据源：绑定/动画消费（I2.2）与事件联动（I2.4）；`custom` 字段内容由符号定义解释（图片 URL 等外部资源经 RendererEnv 归位，INV-1——符号 `create` 中图片加载走引擎图片缓存 + 桥接层 env.fetcher，design-engine.md §9）。
- 表达式：符号属性值经点表绑定消费表达式（I2.2 §4.2 统一归口：绑定只引用点表变量；`source: 'flux'` 点表声明经桥接层订阅 scope 写入，I2.2 §4.1/§9.1），flux 表达式经 flux-formula 编译求值（平台能力复用表）。

## 10. 样式与 DOM marker 约定

- **状态样式解析规则**（纯逻辑，Vitest 单测）：`effectiveStyle = defaults ∪ 实例属性 ∪ statePatch(state)`；优先级：实例属性 > defaults；statePatch 覆盖实例属性（状态优先，FUXA 报警变色蓝本）。
- 样式值域：颜色/渐变/纹理字符串透传 leafer 样式系统（I8.1 细化）；`visible: false` 用 leafer 节点 `visible` 而非移除节点（保持绑定索引稳定）。
- 图元库视觉规范（stroke 宽度/状态色）属 I8.2/I9 实现细节，不进本档；canvas 内图元不产 DOM marker。

## 11. 实现拆分建议

```
packages/flux-renderers-industrial/src/symbols/       （域核心，无 React 依赖）
├── symbol-registry.ts        # registerScadaSymbol/unregister + 定义校验（纯逻辑单测）
├── symbol-factory.ts         # 实例化：type → leafer 节点（映射 UICreator tag 工厂）（I5.4）
├── symbol-types.ts           # ScadaSymbolDefinition/ScadaSymbolProps/类型定义
├── style-resolver.ts         # 样式解析（defaults ∪ 实例 ∪ 状态覆盖）（I5.4，纯逻辑单测）
├── compound.ts               # group 建树/instance 覆盖深合并（I8.3，纯逻辑单测）
├── base-shapes/              # 基础形状符号实现（rect/round-rect/ellipse/line/arrow/pipe/text/polygon）（I5.4）；image/video 占位符号（I8.1）
└── register-builtin.ts       # 包加载时注册基础形状（I5.4）
```

- 设备族/仪表族/传感控制族/管道族实现位于 `src/symbols/device/`、`instrument/`、`sensor-control/`、`pipe/`（I9.1–I9.4），复用本档契约。

## 12. 风险、取舍与后续阶段

### 12.1 I1.2 API 风险清单 → 规避策略映射（gate-1-review §6 结论：design-symbols.md 无新增约束）

- gate 结论 §6：「design-symbols.md：无新增约束（命中/属性模型与图元注册无 API 障碍）」——本档不承载 A1–A5 新规避项；图元注册无 API 障碍为 I1.1 gate 审查裁定；V5 目标（自定义注册 20+ 工业图元并加载）的实测留待 I5.4 以单测/Playwright 覆盖（spike 仅实测内置 Rect 的 JSON→Group.add 路径，gate-1-review §3.3 #6）。

### 12.2 风险与取舍

- **`scada-symbol` 图元级 type 注册契约评估落地（2026-08-04，I9 plan Phase 4 Decision）**：触发点兑现（讨论 §九「I8/I9 图元库成型后评估」；本档 §1 边界预留）。以 **24 个内置符号成型**（8 形状 + image/video + group + 设备 4 + 仪表 4 + 传感控制 4 + pipe-junction 1）为评估事实，裁定为 **不注册**，依据：
  - **价值面**：单图元独立 renderer 用法（`{type:'scada-symbol', symbolType:'scada-device-motor', ...}`）当前无真实消费场景——Q10 裁定消费路径为 `scada-canvas` 单容器内嵌组态 JSON（I13.1 scada-demo、I16 编辑器均为容器内用法）；「画布外单图元复用」（表单内嵌/属性面板预览）无确认需求。
  - **成本面**：注册引入「renderer type schema ↔ 组态 JSON symbol schema」双 schema 漂移面（renderer fields 需镜像 `ScadaSymbolProps` 子集 + `custom` 透传，与 design-renderer.md 组态 schema 同步义务）；注册实现依赖 renderer 桥接层上下文（I10.1 组件生命周期/I10.2 renderer-definitions），当前无挂载点。
  - **结论**：不注册、不产出注册契约草案（不注册路径）；若后续出现画布外单图元复用真实需求（触发点：I13.1 演示页或 I16 编辑器预览需求），按 roadmap 新评估项重新评估（watch-only residual，I9 plan Deferred But Adjudicated 记录）。
- **instance 覆盖语义复杂度**：深合并规则（defaults/实例/绑定/动画分层）需交叉验证；I8.3 实现时以纯逻辑单测覆盖（实例属性覆盖、缩放、custom 透传）。
- **自定义扩展字段膨胀**：`custom` 字段为图元私有；过度使用将削弱组态 JSON 通用性——审计约束：自定义字段需符号定义声明 schema（I4 包基建时以 TS 类型约束，I15.2 文档收尾复核）。
- **架构冲突记录（I15.2）**：符号注册模式与 flux renderer registry 的差异（领域标识 vs renderer type）如有冲突，记录于 plan Failure Paths `design-contract-conflict`，不提前改架构文档。

### 12.3 后续阶段

| 阶段      | 内容                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| I5.4      | 图元基类 `BaseSymbol` + 基础形状（8 形状，本档 §4.1/§11 base-shapes）                                             |
| I8.1      | 基础图元族样式属性细化（渐变/阴影/线宽）+ image/video 占位符号（本档 §4.4 形状族）                                |
| I8.2      | 视觉状态（选中/悬停/报警闪烁状态样式，与 I6.3 动画联动）                                                          |
| I8.3      | 复合图元（group/instance/属性覆盖，本档 §4.3）                                                                    |
| I9.1–I9.4 | 设备/仪表/传感控制/管道图元库（本档 §4.4 分类）——**已完成（2026-08-04，I9 plan 收口，24 内置符号）**              |
| I8/I9 后  | 评估 `scada-symbol` 图元级 type 注册契约（讨论 §九 待定事项）——**已评估（2026-08-04）：裁定不注册，依据见 §12.2** |
