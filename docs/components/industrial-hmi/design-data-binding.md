# 通用引擎层设计：数据绑定与动画 design-data-binding.md

> 日期：2026-08-03
> 版本：v1（I2.2 产出）
> 上游：调研汇总 `docs/analysis/industrial-hmi/research-summary.md`（§3 V4/§4.2 设计清单 D1-D9）、SCADA 应用调研 `docs/analysis/industrial-hmi/research-scada-apps.md`（§2.1/§2.2/§6 衔接点清单）、gate 结论 `docs/analysis/industrial-hmi/gate-1-review.md`（§3.2 #9 实测/§4 A5/§6 约束映射）、讨论文件 `docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md`（Q3 双轨/Q6 验收）
> 下游：`design-renderer.md`（I2.4，点表 ↔ 组态 JSON 一致性）；实现 I6（Wave 2）与 I10.3 引用本文件
> 依据：roadmap `docs/components/roadmap-industrial-hmi.md` I2.2 + Cross-Cutting（性能红线：点表刷新合并帧 + 脏属性收集，禁止逐点 setState 直刷 React；平台能力复用表）

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent（fresh session）反复审查直到共识（判据：连续一轮 0 新增修正项）。记录如下：

- **Round 1（2026-08-03）**：独立 agent（fresh session）审查，判定 `REVISE`——3 Major（引擎写命令跨文档不一致，统一为 `applyAttrs`；多状态 schema 漂移 `stateBinding` 未定义/`ScadaStateDeclaration` 容器无字段归属；可绑定属性 `pathFlow` 与 I2.3 `flow` 不一致）+ 5 Minor（`ScadaSymbolStyle` 类型名不存在应为 `ScadaSymbolStylePatch`；§4.3 两处节引用错；头部占位预写判定反模式；§12.3 改写 roadmap I11.1 范围；`ScadaBinding.flux` 与统一归口原则矛盾，改为 flux 源声明于点表层级）——修正项全部落地，未裁决项 0。
- **Round 2（2026-08-03）**：独立 agent（fresh session）确认轮，判定 `REVISE`——R1 八项全部验证落地（含跨文档同步：engine applyAttrs 唯一写入口、renderer component:setPointValue 路径澄清、renderer/symbols `states` 容器类型对齐、`flow`/`ScadaSymbolStylePatch`/`@{}` 引用）；新增 1 Minor（N1：design-symbols.md §9 仍引「I2.2 §4.2 `flux` 绑定」——已不存在的绑定层字段，改为点表级 `source: 'flux'` 归口表述），已落地。
- **Round 3（2026-08-03）**：独立 agent（fresh session）确认轮，判定 `AGREE`——N1 落地验证（symbols §9 与 §4.1/§4.2/§9.1 归口口径逐字吻合、无残留绑定层 `flux` 引用），全文轻扫无新增修正项，**达成共识**（共识循环：R1-R2 修正 2 轮 + R3 确认轮，未超轮次上限）。
- **终轮复核说明（I3.1 review gate，2026-08-03）**：I3.1 gate 为本文件「文档共识审查」的终轮复核（roadmap Cross-Cutting「不叠加额外审查轮」），本文件可作为 I6 实现的契约依据。

---

## 1. 组件定位

- 本文档定义**数据绑定与动画层**设计：点表/变量表模型（三源：静态值/表达式/flux scope 桥接，讨论 Q3 双轨）、绑定表达式 → 属性映射、订阅与节流（合并帧/脏属性收集刷新流水线）、状态驱动动画（旋转/闪烁/流动/位移）与动画生命周期（start/stop/pause）、多状态呈现（运行/停止/故障）。
- 本层是 `scada-canvas` 引擎（`design-engine.md`）之上的**组态语义层**：纯逻辑域核心（无 React 依赖），消费「组态 JSON 点表声明 + 外部数据」，向引擎写入「节点 id → 属性值」批量指令。
- **性能红线（roadmap Cross-Cutting）**：点表刷新走合并帧 + 脏属性收集，**禁止逐点 setState 直刷 React**；动画合帧调度，禁止每帧全量重建场景。
- 非目标：不设计引擎架构（I2.1）、图元模型（I2.3）、renderer 契约与事件→action 联动（I2.4）、网络协议适配器实现细节（I6.1 落地）、报警/趋势服务（借鉴 FUXA 语义，本期不内置，见 §9.3）。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无实时点表绑定先例。对照调研结论：
  - **meta2d.js**（scada-apps §2.1）：双通道绑定（属性级 `form.dataIds` + 绑定点级 `realTimes.bind`）、运行时反向索引表、`setDatas` 按 pen 批量合并 + 单次 render（`core.ts:3814-3890`）、数据事件/状态触发器条件-动作模型（§2.5）、帧动画模型（§2.2）；
  - **FUXA**（scada-apps §3.1/§3.6）：tag 点表（量程换算/死区）、按画面 tag 集合订阅/退订（`hmi.service.ts:428-451`）、`onlyChange` 值未变去重（`fuxa-view.component.ts:503-521`）、报警状态机（阈值-状态-ACK）；
  - **leafer**（render-engines §3.1/§12 #4）：Watcher 帧内节流（changed<100）+ partLayout/partRender 合帧——引擎侧合帧已有，上层（本层）仍需合并帧 + 脏属性收集（gate-1-review §4 A5）。

### Flux 决策表（数据绑定层）

| 能力                                                     | 采纳        | 不采纳                                            | 理由（依据）                                                                                                                |
| -------------------------------------------------------- | ----------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 双轨数据模型（点表自包含 + flux 表达式桥接）             | **P0 采用** | 纯 flux 表达式 / 独立订阅协议                     | 讨论 Q3 用户裁决；组态文件自包含可复用 + 接入既有 scope 数据流                                                              |
| 三源变量（静态/表达式/flux 桥接）                        | **P0 采用** | —                                                 | 双轨落地形态：静态值（画面内固定）、表达式（点表间派生）、flux `$xxx`（scope 桥接）                                         |
| 合并帧刷新流水线（脏属性收集 → 批量写入 → 单次渲染请求） | **P0 采用** | 逐点 set / 逐点 setState 直刷 React               | roadmap 性能红线 + gate-1-review A5（1 万点端到端实测 16.9–19.7ms 的前提）                                                  |
| 绑定反向索引（pointId → [{symbolId, property}]）         | **P0 采用** | 绑定求值全树扫描                                  | meta2d `bindDatas` 蓝本（scada-apps §2.1/§6 #2）；场景打开时构建                                                            |
| 值未变去重（onlyChange 语义）                            | **P0 采用** | —                                                 | FUXA 蓝本（§3.6）；减少引擎属性写入                                                                                         |
| 状态驱动动画（旋转/闪烁/流动/位移）+ 生命周期            | **P0 采用** | 每帧全量重建 / 依赖引擎动画原语直接驱动业务状态机 | 业务状态机（运行/停止/故障）自研（render-engines §8 #4 半自带判定）；动画原语直接可用                                       |
| 条件-动作触发（数据变化→状态判定→动作）                  | **P1 采用** | meta2d 完整 Trigger/EventAction 19 动作体系       | 借鉴事件-条件-动作纯数据模型（scada-apps §2.6「直接借鉴」）；本期只落地状态判定+动作钩子，完整触发器体系随 I11 事件联动评估 |
| 报警状态机（HH/H/L/INFO+ACK+历史）                       | —           | **本期不内置**                                    | FUXA 服务端能力（§3.2），超本 mission 范围；状态判定模型（§4.5）预留报警语义扩展点                                          |
| 网络协议适配器（websocket/mqtt/http/SSE）                | P2 评估     | meta2d 内嵌网络层（`core.ts:2520-3720`）          | 平台能力复用表：外部 IO 必须经 RendererEnv（INV-1）；协议适配器经 `xui:imports` 注入（INV-2 B 档），见 §9.2                 |

## 3. Flux 中的 renderer/type 定义

- 数据绑定层**不是 renderer type**：是 `scada-canvas` 引擎的组态语义层模块（包 `@nop-chaos/flux-renderers-industrial` 内 `binding/` 子目录），由 renderer 桥接层（I2.4）装配，flux 侧不暴露独立 type。
- 与 flux 既有能力边界：scope 响应式取值（`useScopeSelector`/`useRenderScope`）与表达式求值（flux-formula/flux-compiler）**复用平台能力**（roadmap 平台能力复用表），本层不重复实现。

## 4. schema 设计（点表/绑定/状态/动画声明）

> 完整字段进入组态 JSON（`design-renderer.md` 组态 schema），此处定义语义与求值规则。

### 4.1 点表/变量表模型（三源，讨论 Q3 双轨）

```typescript
interface ScadaPointDeclaration {
  /** 变量 id（组态内唯一；绑定表达式经 @{pointId} 引用） */
  id: string;
  /** 值源：static | expression | flux */
  source: 'static' | 'expression' | 'flux';
  /** source=static：常量值 */
  value?: ScadaPrimitive;
  /** source=expression：组态内表达式（可引用 @{pointId}，见 §4.2） */
  expression?: string;
  /** source=flux：桥接 flux scope 表达式（如 $tank.level），经公式编译器求值 */
  flux?: string;
  /** 量程换算（FUXA TagScale 蓝本）：线性 y = k*x + b，或表达式 */
  scale?: { k?: number; b?: number } | { expression: string };
  /** 死区（FUXA deadband 蓝本）：|Δ| < deadband 不派发 */
  deadband?: number;
  /** 单位/格式（仪表显示用，I9.2 消费） */
  unit?: string;
  format?: string;
  /** 初值 */
  init?: ScadaPrimitive;
}
```

- 运行时点表 store：`Map<pointId, { declaration, value, dirty }>`，三源统一归口 `setPointValue`/`setPointValues`。
- 值类型：`number | boolean | string`（派生类型经表达式换算）；点表值不进 flux scope（INV-4，域内部状态）。

### 4.2 绑定表达式 → 属性映射

```typescript
interface ScadaBinding {
  /** 单点绑定：值直接作为属性值（引用点表变量 id，如 "v1"） */
  point?: string;
  /** 表达式绑定：组态内表达式（引用 @{pointId}），返回属性值 */
  expression?: string; // 例："@{v1} > 50 ? '#f00' : '#0f0'"
  /** 值→属性映射（文本/颜色映射） */
  map?: Record<string, string | number | boolean>;
  /** 量程→单位换算（仪表类） */
  scale?: ScadaPointDeclaration['scale'];
  /** 格式化（文本属性） */
  format?: string;
}
```

> **统一归口**：绑定只引用**点表变量**（`point`/`expression` 均以点表为上下文）；flux 桥接值不在绑定层声明——`source: 'flux'` 的变量声明于点表（§4.1），由桥接层订阅 scope 后写入点表（§9.1），绑定经点表间接消费（单一刷新路径，§4.3）。

- 可绑定属性集合（I2.3 属性 schema 子集，`design-symbols.md` §4.2 `ScadaSymbolProps`）：`fill`/`stroke`/`strokeWidth`/`opacity`/`visible`/`text`/`textColor`/`rotation`/`x`/`y`/`width`/`height`/`flow`（管道流动参数）。
- **表达式求值边界**：`@{pointId}` 组态内引用 + 算术/比较/三元/字符串拼接子集，由**纯逻辑求值器**实现（Vitest 单测）；`$xxx` flux 表达式（仅存在于点表声明的 `source: 'flux'`）经 flux-formula/flux-compiler 编译求值（平台能力复用表），求值上下文为桥接层创建的**私有求值子 scope**（注入点表上下文，非 schema-visible scope，INV-4 边界，I10.3 落地）。
- 多状态呈现（值→状态判定）见 §4.5。

### 4.3 订阅与节流：刷新流水线（A5 固化，性能红线）

```
数据源（静态/表达式/flux scope 桥接/协议适配器）
  │
  ▼
PointStore.setPointValues(点表写入)           ← 值未变去重（deadband/onlyChange）
  │
  ▼
帧内脏收集（本层核心义务）：
  - 遍历反向索引 pointId → [{symbolId, property}]
  - 属性绑定求值 → 合并为 Map<symbolId, Map<property, value>>（脏属性收集）
  - 状态判定/动画触发标记（§4.5）
  │
  ▼
帧尾批量写入（rAF/节流窗口结束）：
  - engine.applyAttrs(Record<symbolId, Partial<ScadaSymbolProps>>)（单次批量调用，design-engine.md §8.2/§4.5 合帧义务）
  │
  ▼
leafer watcher（changed<100 帧内节流）→ partLayout → partRender（合帧局部重绘）
  │
  ▼
实测：1 万点端到端 16.9–19.7 ms（gate-1-review §3.2 #9，更新 1.7–2.6ms + 渲染 ~15–17ms）
```

- **禁止**：逐点 `setPointValue` 即触发引擎渲染请求；逐点 setState 直刷 React（React 只负责容器级 props 与事件回调，`research-summary.md` §5.4 #2）。
- 节流窗口：rAF 帧对齐（`requestRender` 由动画时钟统一调度，见 §4.4），帧内多次点表写入合并为一次批量写入。
- 订阅协议（FUXA 蓝本 §3.6）：按当前可见画面维护订阅集合（点表引用集合），画面切换时增删订阅——本期为组态内单画面（不涉及多画面切换，多画面导航后置评估）。

### 4.4 状态驱动动画与动画生命周期

```typescript
type ScadaAnimationKind = 'rotate' | 'blink' | 'flow' | 'move';

interface ScadaAnimation {
  kind: ScadaAnimationKind;
  /** 周期 ms（rotate=整圈周期；blink=明灭周期；flow=dash 位移周期；move=单程时长） */
  period?: number;
  /** rotate/move 幅度（rotate: 度；move: 目标位移 dx/dy） */
  from?: number | { x: number; y: number };
  to?: number | { x: number; y: number };
  /** 触发条件：always | { state: 'fault' }（状态触发） */
  when?: 'always' | { state: string };
  /** 循环次数（0=无限，对齐 meta2d animateCycle，scada-apps §2.2） */
  loop?: number;
}
```

- 动画类型与引擎实现映射：

| kind   | 语义                  | leafer 侧实现                                                                                                  |
| ------ | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| rotate | 持续旋转（电机/风机） | `rotation` 属性插值（`@leafer-in/animate` 过渡或自研插值写入，render-engines §8 #4 原语可用）                  |
| blink  | 报警闪烁              | `opacity`/`visible` 方波切换（FUXA blink 蓝本）                                                                |
| flow   | 管道/流体流动         | 路径 `dash-offset`/点阵动画（meta2d `LineAnimateType` 蓝本，scada-apps §2.2/§6 #11；leafer Pen/Path 局部更新） |
| move   | 位移（滑块/吊装）     | `x/y` 插值                                                                                                     |

- **动画生命周期**：`animator.start(symbolId, animation)` / `stop` / `pause` / `resume` / `isPlaying`；状态触发（`when: { state }`）由状态机联动（进入状态启动、退出停止，见 §4.5）；数据可动态替换动画参数（对齐 meta2d「数据动态替换动画帧」scada-apps §2.2）。
- **调度器**：单一动画时钟（rAF + interval 30ms 限频，meta2d `animateInterval` 蓝本，scada-apps §2.2/§6 #10），与 leafer 渲染循环分离；每 tick 计算各播放中动画的属性增量 → 汇入帧内脏收集 → 批量写入（动画合帧，禁止每帧全量重建场景——roadmap 性能红线）。

### 4.5 多状态呈现（运行/停止/故障）

```typescript
interface ScadaStateDeclaration {
  /** 状态集合：run/stop/fault + 自定义 */
  states: Record<string, ScadaStateDefinition>;
  /** 值→状态判定：区间映射 */
  ranges?: Array<{ min?: number; max?: number; state: string }>;
  /** 布尔映射（开关量）：true/false → state */
  booleanMap?: { true: string; false: string };
  /** 字符串映射（枚举值→状态） */
  valueMap?: Record<string, string>;
}
interface ScadaStateDefinition {
  /** 状态样式覆盖（normal 样式上的增量覆盖，I2.3 状态样式解析） */
  style?: ScadaSymbolStylePatch; // I2.3 类型（design-symbols.md §4.2）
  /** 状态触发动画 */
  animations?: ScadaAnimation[];
}
```

- 判定链：点表值 → 换算（scale）→ 区间/映射判定 → 状态 → 样式覆盖 + 动画启停；判定纯逻辑（`value-to-state.ts`，Vitest 单测）。
- 示例：阀门开度 0-100% → run（开度>0）+ fault（开度=0 且点位故障标志 true）+ stop（默认）；故障态自动 blink（报警闪烁，FUXA 报警语义蓝本）。

## 5. 字段分类

| 声明字段                 | 归属                     | 说明                                                                                                |
| ------------------------ | ------------------------ | --------------------------------------------------------------------------------------------------- |
| `variables`（点表声明）  | 组态 JSON 顶层           | I2.4 组态 schema；本层消费                                                                          |
| `bindings`               | 图元节点字段             | I2.3 属性 schema；`ScadaBinding`                                                                    |
| `states`（状态声明容器） | 图元节点字段             | `ScadaStateDeclaration`（states 映射 + ranges/booleanMap/valueMap 判定配置）；I2.3 属性 schema 对齐 |
| `animations`             | 图元节点字段             | `ScadaAnimation[]`；I2.3 属性 schema 对齐                                                           |
| 点表运行值               | **域内部（点表 store）** | 不进 flux scope（INV-4）；`window.__flux_scada_<cid>.getPointValue` 投影                            |
| 绑定反向索引             | **域内部**               | 场景打开时构建（meta2d 蓝本）                                                                       |
| 动画播放状态             | **域内部（动画时钟）**   | 不进 scope                                                                                          |

## 6. 图层与场景树（对应 regions 约定）

- 数据绑定层不产生图层/region：绑定结果写入引擎图元层节点属性（`design-engine.md` §6 图元层）；状态样式覆盖走引擎交互覆盖层（hover 高亮等反馈）之外——状态呈现直接改图元层属性（报警闪烁描边等可选 sky 覆盖物，I8.2 视觉状态落地）。
- 绑定目标解析：`bindings` 声明挂在图元节点（I2.3 symbol 属性 schema），运行时反向索引 `pointId → [{symbolId, property}]`（meta2d `bindDatas` 蓝本，scada-apps §6 #2）；场景打开/图元增删时增量维护。

## 7. 运行期状态归属

| 状态                       | Owner                                     | 说明                                        |
| -------------------------- | ----------------------------------------- | ------------------------------------------- |
| 点表值（含三源派生值）     | **域内部（点表 store，Zustand vanilla）** | 高频更新不进 scope（订阅风暴，INV-4）       |
| 绑定反向索引               | **域内部**                                | 场景打开构建                                |
| 帧内脏集合（属性变更累积） | **域内部**                                | 帧尾批量写入后清空                          |
| 状态判定结果               | **域内部（派生）**                        | 值→状态纯逻辑，不持久化                     |
| 动画播放状态/时钟          | **域内部（animator）**                    | 生命周期 start/stop/pause/resume 命令式控制 |
| 测试投影                   | **dev/test**                              | `getPointValue(pointId)`（I2.4 测试句柄）   |

## 8. 事件、动作与组件句柄能力

### 8.1 数据层事件

| 事件                   | 载荷                               | 说明                                                                                                       |
| ---------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `point:change`         | `{ pointId, value, prev, state? }` | 点表值变化（去重后）；桥接层可映射为数据事件 → 条件 → 动作（meta2d `dataEvents` 蓝本，I11 评估触发器体系） |
| `state:change`         | `{ symbolId, state }`              | 状态切换（如进入 fault → 桥接层触发报警动作）                                                              |
| `animation:start/stop` | `{ symbolId, kind }`               | 动画生命周期事件                                                                                           |

### 8.2 数据层句柄

- `setPointValues(Record<pointId, value>)`：批量写入入口（协议适配器/flux 桥接调用）；
- `getPointValue(pointId)` / `getPointState(pointId)`；
- `subscribe(pointIds, cb)`：订阅（内部索引维护，FUXA 订阅协议蓝本）；
- `animator.start/stop/pause/resume(symbolId, animation)`；
- `flushFrame()`：强制帧尾批量写入（测试/性能测量用）。

## 9. 数据源、表达式、导入能力接入点

### 9.1 三源接入

| 源              | 接入方式                                 | 落点                                                                                                                                                                                                                                                                                                        |
| --------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 静态值          | 组态 JSON `value`                        | 打开场景即写入点表                                                                                                                                                                                                                                                                                          |
| 表达式          | 组态内 `expression`（`@{pointId}` 子集） | 纯逻辑求值器（§4.2），点表依赖链变化时重算                                                                                                                                                                                                                                                                  |
| flux scope 桥接 | `flux: "$xxx"`                           | **`useScopeSelector`（带 `paths` 精细化失效）在 renderer 桥接层订阅**（`@nop-chaos/flux-react`，quick-reference.md:521,526），变化 → `setPointValues` 注入点表；flux 表达式经 flux-formula/flux-compiler 编译求值（I10.3 落地）——复用平台能力，禁止重复实现 scope 订阅/表达式编译（roadmap 平台能力复用表） |

### 9.2 外部数据通道（INV-1/INV-2）

- 组态画面需要接入实时数据源（socket.io 推送等）时：**外部 IO 必须经 `RendererEnv`**（fetcher/stream/openSocket，`docs/architecture/renderer-env.md`），或经 `xui:imports` 注入协议适配器（INV-2 B 档，`new-renderer-introduction-audit.md` §2 能力归属表）；**禁止引擎/数据层直调 `fetch`/`WebSocket`**（INV-1）。
- 协议适配器契约：`(env) => { connect(): Promise<void>; disconnect(): void; onMessage(cb) }`，消息 → `setPointValues`（统一值回调入口，meta2d `socketCallback` 蓝本，scada-apps §2.1/§6 #6）；本期实现以 flux 桥接 + 静态/表达式为主（I6.1），协议适配器为 P2 评估项。

### 9.3 报警/趋势边界

- 报警状态机（阈值-ACK-历史，FUXA §3.2）与趋势查询（§3.3）**本期不内置**（超 mission 范围）；本层状态判定模型（§4.5）预留报警语义扩展点（fault 状态 + 阈值区间 + 动作钩子），供后继 roadmap 项评估。

## 10. 样式与 DOM marker 约定

- 数据绑定层无 DOM；状态样式（运行/停止/故障色、报警闪烁）经引擎图元层属性呈现（I2.3 §10 状态样式解析）。
- 多状态样式建议色（惯例）：run=绿、stop=灰、fault=红（闪烁）；具体色值属图元库实现细节（I8.2/I9），不在此固化。

## 11. 实现拆分建议

```
packages/flux-renderers-industrial/src/binding/       （域核心，无 React 依赖）
├── point-store.ts              # 点表 store（三源/去重/死区/换算）（I6.1，纯逻辑单测）
├── bind-resolver.ts            # 绑定表达式求值（@{pointId} 子集）+ 属性映射（I6.2，纯逻辑单测）
├── expression-evaluator.ts     # 组态内表达式求值器（依赖链 + 缓存）（I6.2，纯逻辑单测）
├── reverse-index.ts            # pointId → [{symbolId, property}] 反向索引（I6.1，纯逻辑单测）
├── dirty-collector.ts          # 帧内脏属性收集 + 帧尾批量写入（I6.1，纯逻辑单测）
├── value-to-state.ts           # 值→状态判定（区间/布尔/枚举映射）（I6.2，纯逻辑单测）
└── animator.ts                 # 动画时钟 + 生命周期 + 状态联动（I6.3，纯逻辑单测）
```

- 拆分依据：`renderer-implementation-guidelines.md` Case 2（纯数据变换 → helper 模块）；全部纯逻辑模块 Vitest 单测先行（roadmap 测试纪律）；flux 桥接（useScopeSelector/公式编译器）在 renderer 桥接层实现（I10.3），不落入本层（保持域核心无 React）。

## 12. 风险、取舍与后续阶段

### 12.1 I1.2 API 风险清单 → 规避策略映射（gate-1-review §4 逐条回应）

| #   | 风险项                                                                                                                                         | 本设计规避/接受                                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A5  | 批量属性更新走 watcher→partLayout→partRender 合帧（实测 1 万点端到端 ~17–20ms）；**上层仍需合并帧 + 脏属性收集**，避免逐点 setState 直刷 React | **固化**：§4.3 刷新流水线 = 数据层合并帧 → 引擎批量 set → 单次渲染请求；引擎侧 watcher 节流仅作第二道防线（design-engine.md §4.5）；禁逐点 setState 直刷 React（roadmap 性能红线）；实测基线 16.9–19.7ms（gate-1-review §3.2 #9） |

### 12.2 风险与取舍

- **双轨一致性**：flux 桥接值写点表后与组态内表达式/静态值同构（统一经点表归口），避免两套刷新路径；`$xxx` 表达式与 `@{pointId}` 引用语法冲突风险 → 语法前缀隔离（`$`=flux scope、`@{}`=组态点表），I3.1 gate 复核。
- **订阅风暴**：点表高频刷新不进 scope（INV-4）；flux 桥接按声明路径订阅（`useScopeSelector` paths 精细化），避免整 scope 订阅。
- **动画性能**：动画合帧 + 独立时钟（§4.4）；闪烁等高频动画限制为状态触发（避免全画面常驻动画）；若 I14 实测动画路径不达标，按 roadmap「人工确认阈值」处理。
- **组态内表达式能力边界**：`@{pointId}` 子集刻意收窄（算术/比较/三元/拼接），避免自研 DSL 膨胀（复用边界 INV-3：表达式能力以 flux-formula 为主）；超范围表达式引导作者改用 flux 桥接。
- **架构冲突记录（I15.2）**：与 `docs/architecture/`（form-validation/模块边界）冲突项记录在案（plan Failure Paths `design-contract-conflict`），不提前改架构文档。

### 12.3 后续阶段

| 阶段  | 内容                                                                                                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I6.1  | 点表模型 + 订阅节流 + 刷新流水线（本档 §4.1/§4.3）                                                                                                       |
| I6.2  | 属性绑定解析 + 多状态呈现 + 量程换算（本档 §4.2/§4.5）                                                                                                   |
| I6.3  | 状态动画引擎 + 生命周期（本档 §4.4）                                                                                                                     |
| I10.3 | 点表 ↔ flux 表达式桥接（useScopeSelector + 公式编译器，本档 §9.1）                                                                                       |
| I11.1 | 图元事件→flux action 全链路（roadmap I11.1 口径；本档 §8.1 数据事件条件-动作钩子为 `point:change`/`state:change` 事件源，是否扩展触发器体系随 I11 评估） |

> **触发器体系评估裁定（I11，2026-08-04）**：以 `point:change`/`state:change` 事件源 + 既有事件派发链
> （`createNormalizedActionEvent` + `helpers.dispatch`，I11.1 交付）评估条件-动作触发扩展
> （meta2d `dataEvents` 蓝本）——**裁定：不扩展完整触发器体系**。依据：
> ① 需求场景：条件-动作的**视觉面**已由 I6.2/I6.3 交付（`value-to-state` 量程/布尔/值映射 → 状态样式 +
> 状态动画，§4.2/§4.5）；**动作面**中 flux 桥接点源场景可直接复用平台既有 `reaction` renderer
> （scope 值变化 → 条件 → 动作，复用边界 INV-3 禁止重复实现）；剩余 gap 仅为「组态内非 flux 点的阈值动作」，
> roadmap 内无已承诺消费场景（I13 demo 为点击联动）。② 成本：完整 meta2d 19 动作体系明确不在 I11 范围
> （plan Non-Goals）；最小实现仍需新声明面（组态 JSON `triggers`）+ 刷新流水线条件求值钩子 +
> 与点表/状态模型边界划分。③ 与既有事件体系边界：`point:change`/`state:change` 为**数据源触发**，
> 与 I11.1 图元**交互触发**（click/dblclick/hover → action）属不同触发源，共享派发链已复用，无架构新增；
> 「进入 fault → 报警动作」属报警状态机边界（§9.3 报警/趋势本期不内置，FUXA 式报警状态机超范围）。
> **最小扩展路径（后继评估触发时）**：组态 JSON 图元级 `triggers: [{ on: 'point:change'|'state:change',
when: 条件表达式, action: ActionSchema }]` 声明 + RefreshPipeline 事件源条件求值 → 复用 I11.1 派发链；
> 实现归属 roadmap 后续项。
