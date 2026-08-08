# 通用引擎层设计：序列化与 renderer 契约 design-renderer.md

> 日期：2026-08-03
> 版本：v1（I2.4 产出）
> 上游：调研汇总 `docs/analysis/industrial-hmi/research-summary.md`（§4.4 序列化清单 S1-S4/§5 差距分析）、SCADA 应用调研 `docs/analysis/industrial-hmi/research-scada-apps.md`（§2.4 序列化/§2.5 生命周期 hooks）、渲染引擎调研 `docs/analysis/industrial-hmi/research-render-engines.md`（§8 #7/#8 序列化与 React 桥接/§12 #21 fabric ref/effect 范本）、gate 结论 `docs/analysis/industrial-hmi/gate-1-review.md`（§4 A2/§6 约束映射）、讨论文件（Q8/Q10/§八 4/§九）、`docs/analysis/industrial-hmi/research-supplement.md`（S3 三件套约定）
> 下游：实现 I4.2/I5.3/I10/I11 引用本文件；I3.1 gate 为终轮复核
> 依据：roadmap `docs/components/roadmap-industrial-hmi.md` I2.4 + Cross-Cutting（平台能力复用表/测试纪律）+ `docs/references/new-renderer-introduction-audit.md`（INV-1–INV-5 renderer 契约审计）+ `docs/references/complex-component-design-process.md`（先 schema 后实现）+ `docs/references/renderer-implementation-guidelines.md`

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent（fresh session）反复审查直到共识（判据：连续一轮 0 新增修正项）。记录如下：

- **Round 1（2026-08-03）**：独立 agent（fresh session）审查，判定 `REVISE`——1 Major（`engine.applyDiff`/`engine.setSize` 未在 design-engine.md §8.2 句柄清单定义，补列）+ 5 Minor（`createNormalizedActionEvent` 示例签名与 renderer-helpers.ts:98 单参数实际 API 不符；头部占位预写判定反模式；§4.2 type 注释与交叉核对记录 row 1 缺形状族豁免；§1「见 §12.4」应为 §12.2；§2 meta2d Pen 字段引注错配 S2，应为 scada-apps §2.4）——修正项全部落地，未裁决项 0。
- **Round 2（2026-08-03）**：独立 agent（fresh session）确认轮，判定 `AGREE`——R1 六项全部验证落地（applyDiff/setSize 于 engine §8.2/§11 补列；createNormalizedActionEvent 单参数调用与源码 renderer-helpers.ts:98/actions.ts:307 逐字核对；头部记录事实化；形状族豁免双向一致；§1 指向 §12.2 审计摘要；Pen 字段引注改 scada-apps §2.4），全文轻扫无新增修正项，**达成共识**（共识循环：R1 修正 1 轮 + R2 确认轮，未超轮次上限）。
- **终轮复核说明（I3.1 review gate，2026-08-03）**：I3.1 gate 为本文件及全部 4 份设计文档「文档共识审查」的终轮复核（roadmap Cross-Cutting「不叠加额外审查轮」），本文件可作为 I4/I5/I10/I11 实现的契约依据。

### 四文档交叉一致性核对记录（I2.4 依赖 I2.2/I2.3 的核对项）

> plan Failure Paths `schema-field-drift`：`scada-canvas` fields 与组态 JSON schema 字段必须一致，发现即回写对应文档。核对记录（2026-08-03，I2.4 执行）：

| 核对面                                                             | 契约锚点                                                                                            | 结果                                                                                          |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 组态 JSON symbol 节点字段 ↔ `design-symbols.md` §4.2 属性 schema   | §4.2 图元树节点字段表 ↔ `ScadaSymbolProps`/`ScadaSymbolEvent`                                       | ✅ 一致（type 命名对齐 §4.4：形状族 `scada-<名>` 无前缀，其余族 `scada-<族>-<名>`，双向引用） |
| 组态 JSON 点表声明 ↔ `design-data-binding.md` §4.1 点表模型        | §4.1 `variables` ↔ `ScadaPointDeclaration` 三源                                                     | ✅ 一致（static/expression/flux 三源对齐）                                                    |
| 组态 JSON 绑定/状态/动画 ↔ `design-data-binding.md` §4.2/§4.4/§4.5 | `bindings`/`states`/`animations` 字段 ↔ `ScadaBinding`/`ScadaStateDeclaration`/`ScadaAnimation`     | ✅ 一致                                                                                       |
| `scada-canvas` fields ↔ 组态 JSON schema                           | §5 字段分类表 ↔ §4 组态 schema：`config` 单一字段承载组态 JSON，图元级字段不进 renderer-definitions | ✅ 一致（讨论 Q10 单容器决策）                                                                |
| 测试句柄 ↔ gate-1-review A2                                        | §8.4 `window.__flux_scada_<cid>` 含 `tree` 引用                                                     | ✅ 一致                                                                                       |

## 1. 组件定位

- 本文档定义 `scada-canvas` renderer 与组态 JSON 序列化契约：**组态 JSON schema**（图元树+点表+绑定+事件）与校验/序列化/反序列化/增量 diff；**`scada-canvas` renderer 契约**（fields/events/regions/handles，对齐 `RendererComponentProps` 与 renderer-definitions/schemas.ts 模式）；**React 桥接**（ref 同步/实例生命周期 mount/unmount/resize）；**事件→flux action 联动**（对齐 `props.events` + `createNormalizedActionEvent`）。
- 接入形态（讨论 Q10/§八 4）：**单容器 type 内嵌组态 JSON**——`scada-canvas` props 内嵌组态 JSON（图元树 + 点表），React 组件桥接 LeaferJS 场景图；图元级 type（scada-symbol）后续叠加（讨论 §九）。
- 非目标：不实现任何引擎/图元/绑定代码（I5+）；不做编辑器交互（I16）；不扩展 `RendererEnv` 接口（INV-2 未触发，见 §12.2 审计摘要）。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无 canvas 组态 renderer 先例。对照调研结论：
  - **meta2d.js**（scada-apps §2.4）：`Meta2dData` 根结构 = 视口 + 数据源声明 + pens 平铺 + 事件/触发器 + dataPoints（summary S1）；Pen 字段 `id/tags/parentId/type/name/children[]/canvasLayer`（scada-apps §2.4，含自定义扩展字段分层，summary S2）；`data()`/`open()` 直接读写 `store.data`（与引擎生命周期粘连，不直接复用）；
  - **FUXA/OSHMI**（summary S3）：SVG 画面 + 点表 + 视图配置「三件套」约定（SCADA 领域 20 年验证）——本组态 JSON = 画面（图元树）+ 点表（variables）+ 视图配置（viewport/background）的三件套对齐；
  - **leafer**（render-engines §8 #7）：`toJSON/toString` + `add(JSON)` 按 tag 工厂重建——序列化原语已有，但**无 schema 版本/自定义字段约定，组态 JSON 格式需自研**（summary §1）；
  - **React 桥接范本**：fabric 官方 README `useRef + useEffect + dispose` 命令式模式（render-engines §12 #21，fabric.js/README.md:179-193）。

### Flux 决策表（renderer 契约层）

| 能力                                                                        | 采纳        | 不采纳                           | 理由（依据）                                                                                                |
| --------------------------------------------------------------------------- | ----------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 单容器 type `scada-canvas` 内嵌组态 JSON                                    | **P0 采用** | 图元级 type / 多容器拆分         | 讨论 Q10/§八 4 决策；桥接成本最低、性能可控（roadmap 总览）                                                 |
| 组态 JSON schema（version/视口/背景/点表/图元树/事件）                      | **P0 采用** | leafer toJSON 直出（含内部字段） | 需 schema 版本/自定义字段约定（render-engines §8 #7）；三件套对齐（S3）                                     |
| renderer-definitions 标准注册（fields/events/regions/handles + schemas.ts） | **P0 采用** | 自造第二组件协议                 | INV-5「不发明平行组件协议」；`registerRendererDefinitions` + `RendererComponentProps`（quick-reference.md） |
| React 桥接（ref/effect + dispose 命令式模式）                               | **P0 采用** | leafer React 适配（不存在）      | fabric 范本（render-engines §12 #21）；引擎纯逻辑（I2.1 §3 边界）                                           |
| 图元事件 → flux action（props.events + createNormalizedActionEvent）        | **P0 采用** | amis 字符串脚本事件              | 讨论 Q8；平台能力复用表（useActionDispatcher/createNormalizedActionEvent）                                  |
| 测试句柄 `window.__flux_scada_<cid>`                                        | **P0 采用** | 截图判定 / node-canvas           | roadmap 测试纪律 + gate-1-review A2                                                                         |

## 3. Flux 中的 renderer/type 定义

- `type: "scada-canvas"`
- `sourcePackage: "@nop-chaos/flux-renderers-industrial"`（I4 创建，`docs/references/quick-reference.md` 包目录图）
- 继承 `BaseSchema`；注册方式：`registerScadaRenderers(registry)`（对齐 `registerSchedulingRenderers` 模式，quick-reference.md「Scheduling Package」），I4.2 首期空壳注册（fields/events 随 I10 补全，roadmap I4.2）
- 同步清单（roadmap「组件注册」条款）：`examples.manifest.json`、playground registry、i18n 文案（flux-i18n，I15.1）、quick-reference 组件表（I15.2）

## 4. schema 设计

### 4.1 ScadaCanvasSchema（renderer 字段）

```typescript
interface ScadaCanvasSchema extends BaseSchema {
  type: 'scada-canvas';
  /** 组态 JSON：内嵌字符串（JSON 文本）或对象（已解析）；支持表达式绑定（source-enabled） */
  config: string | ScadaConfig;
  /** 画布尺寸（px）；缺省填满容器 */
  width?: number;
  height?: number;
  /** 加载态 region（config 尚未 resolve/校验中） */
  loading?: RegionSchema;
  /** 空态/错误态 region（config 非法或场景构建失败） */
  empty?: RegionSchema;
  /** 初始视口策略 */
  viewport?: { fit?: 'contain' | 'fill'; center?: boolean };
  /** 事件（schema 级） */
  events?: ScadaCanvasEvents;
}

interface ScadaCanvasEvents {
  /** 图元点击（组态内图元事件声明之外的全局钩子） */
  onSymbolClick?: ActionSchema;
  onSymbolDblClick?: ActionSchema;
  onSymbolHover?: ActionSchema;
  /** 场景就绪（首帧渲染完成） */
  onReady?: ActionSchema;
  /** 场景错误（config 校验失败/构建失败） */
  onError?: ActionSchema;
}
```

### 4.2 组态 JSON schema（ScadaConfig，序列化契约）

```typescript
interface ScadaConfig {
  /** schema 版本（迁移用，complex-component-design-process.md §2.2） */
  version: 1;
  /** 视图配置（三件套之「视图配置」） */
  viewport?: { x: number; y: number; scale: number };
  /** 背景层（design-engine.md §4.1） */
  background?: { color?: string; grid?: { size: number; color: string } };
  /** 点表声明（三件套之「点表」；design-data-binding.md §4.1 ScadaPointDeclaration[]） */
  variables?: ScadaPointDeclaration[];
  /** 图元树（三件套之「画面」；根为 scada-group） */
  symbols: ScadaSymbolNode[];
}

interface ScadaSymbolNode {
  /** 实例 id（组态内唯一） */
  id: string;
  /** 图元 type（design-symbols.md §4.4 对齐约定：形状族 `scada-<名>` 无前缀；其余族 `scada-<族>-<名>`；group 为 scada-group） */
  type: string;
  /** 几何与样式属性（design-symbols.md §4.2 ScadaSymbolProps 子集，序列化 JSON 化） */
  /** 节点原点 x（可选 + 默认 0；plan 2026-08-04-2242-2：type/validator/runtime-consumer 三层同读「可选 + 默认 0」，bounds consumer 经 `?? 0` 兜底，省略时按原点 0 计算） */
  x?: number;
  /** 节点原点 y（可选 + 默认 0；plan 2026-08-04-2242-2） */
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  scale?: number;
  visible?: boolean;
  opacity?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  textColor?: string;
  textSize?: number;
  /** 自定义扩展字段（图元私有 schema，design-symbols.md §4.2 custom） */
  custom?: Record<string, unknown>;
  /** 数据绑定声明（design-data-binding.md §4.2） */
  bindings?: Record<string, ScadaBinding>;
  /** 多状态声明容器（design-data-binding.md §4.5 ScadaStateDeclaration：states 映射 + ranges/booleanMap/valueMap 判定配置） */
  states?: ScadaStateDeclaration;
  /** 动画声明（design-data-binding.md §4.4） */
  animations?: ScadaAnimation[];
  /** 图元事件声明（design-symbols.md §4.2 ScadaSymbolEvent[]，事件联动见 §8.2） */
  events?: ScadaSymbolEvent[];
  /** 子图元（group 组合，design-symbols.md §4.3） */
  children?: ScadaSymbolNode[];
}
```

> **`children` 字段契约（plan 2026-08-05-0653-4 C1，open-audit P2-3）**：`children` **仅 `type==='scada-group'` 节点允许**。
> 校验器（`validateScadaConfig`）对叶子 type（`scada-rect`/`scada-pipe`/instance 模板等）携带 `children` 一律 fail-fast
> 拒绝（错误消息 `<scope>.children is only allowed on scada-group nodes`）。`ConfigAdapter.buildNode` 的 `isContainer`
> 判别同步收紧为 `node.type === GROUP_CONTAINER_TYPE`——既对应 validator 拒绝的主流路径（renderer.parseAndValidateConfig /
> engine.importConfig），也作 defense-in-depth 守护 `engine.reset` 直调旁路：叶子带 children 时按 leaf 构建（保留
> `fill`/`stroke`/`width`/`height`），`children` 字段被忽略（author 应通过 validator 拒绝捕捉）。旧实现的
> `(node.children?.length ?? 0) > 0` fallback 把任何带 children 的节点静默降级为 Group，leaf 的 fill/stroke/width/height
> 经 Group 构造分支丢失——该 silent downgrade 已消除。

> 图元级字段（`bindings`/`states`/`animations`/`events`/`custom`）**不进 renderer-definitions**：renderer-definitions 只注册 `scada-canvas` 级 fields（讨论 Q10 单容器决策 + summary §5.4 #3）；组态 JSON 内部 schema 由本包 `schemas.ts` 类型 + 运行时校验器（纯逻辑，Vitest 单测）约束。

> **视图配置接线契约（2026-08-04 plan `{2}` Phase 3 落地）**：
>
> - `background.color` **已接线**：full/reset 路径（`engine.reset(config)`）应用到 ground 层填充，与构造期 `ScadaEngineOptions.background` 同口径，reset 覆盖构造值（config 经 props 到达，mount 期不可用，接线点在 reset/同步期而非 options 透传）。
> - `background.grid` **未接线（watch-only）**：validate 接受但无任何 runtime 消费面（v1 无兼容负担）；author 不应依赖 grid 底纹，后续图元样式轮或需求触发时再接线（roadmap Follow-up Backlog 登记）。
> - `viewport {x,y,scale}` **已接线（组态默认）**：full/reset 路径（含 importConfig）存在且无 props `viewport` policy 时作为初始视口经 `engine.setViewport` 应用；props `viewport` policy（fit/center）为**显式首选项**，两者都无时保持现状。diff 增量路径不重应用（用户画布平移/缩放不被重置，gate-4-review m-B）。

### 4.3 校验/序列化/反序列化/增量 diff

| 能力      | 契约                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 实现落点                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 校验      | `validateScadaConfig(json): { ok: true } \| { ok: false; errors: string[] }`——version 检查、symbol 树结构（id 唯一/children 递归/type 已注册/**`children` 仅 `type==='scada-group'` 允许**，plan 2026-08-05-0653-4 C1）、点表声明（id 唯一/三源字段合法）、绑定/状态/动画字段类型；**fail-closed 边界 + 判等正确性（plan 2026-08-06-0900-1）**：数值字段 `Number.isFinite` 拒绝 NaN/±Infinity（`JSON.parse('1e400')→Infinity` 不再放行）、`validateSymbolNode`/`scanLegacyAtSyntax`/`deepEqual` 递归深度上限 cap ~100（~10k 层恶意/损坏 host JSON 不再 stack overflow，溢出返结构化错误/判不等）、`assertShape` helper 覆盖 `shadow`/animation `from,to`/`background`/declaration `scale.k,b`/`init` 子形状（surface-only → 子字段 malformed 被拒）、`scanLegacyAtSyntax` 递归 `scada-group` children（嵌套子图元 `@{pointId}` 方言 warn）；`deepEqual`（`serialization/equality.ts`）array/object 形态分歧判 false（`deepEqual([1,2],{0:1,1:2})===false`），为 `diff.valuesEqual` + `compound.deepEquals` 单一事实源 | 纯逻辑模块 `serialization/validate.ts`（Vitest 单测，roadmap 测试纪律） |
| 反序列化  | `parseScadaConfig(input: string \| object): ScadaConfig`——字符串先 JSON.parse（错误归入 onError）；对象浅拷贝防御外部突变                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `serialization/parse.ts`                                                |
| 序列化    | `serializeScadaConfig(config): string`——图元树递归、点表、视图配置；version 恒定 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `serialization/serialize.ts`                                            |
| 增量 diff | `diffScadaConfig(prev, next): ScadaConfigDiff`——顶层：symbols 增删/属性变更/点表变更；属性变更收敛为 `{ added: ScadaSymbolNode[], removed: string[], updated: Array<{ id, patch }> }`（`added` 为完整节点数组——applyDiff 需节点实例化入树，I5 closure audit + I7 gate-3-review m-3 修正，对齐 `serialization/config-types.ts`）。契约补充（plan-2026-08-04-1235-1 修正）：同 id 图元 `type` 变更不产出 `updated` patch，改产出 `removed`（旧 id）+ `added`（新节点）——`applyDiff` 按 `removed → added → updated` 顺序执行 remove-then-rebuild，且更新路径同步 `nodeById` 索引/声明（diff 应用必须收敛场景树 + 索引 + 基线单一事实源）；`children` 差异为 `undefined`（group 变叶子/删除子树）产出显式 `children: []` patch                                                                                                                                                                                                                                                                                            | `serialization/diff.ts`（Vitest 单测）                                  |

- diff 消费方：renderer props `config` 变化 → `diffScadaConfig` → 引擎增量应用（`engine.applyDiff`，避免全量重建，I5.3/design-engine.md §4.2 reset 仅用于全量替换）；点表 diff 直接走数据层 `setPointValues`（design-data-binding.md §4.3）。
- 绑定域重载 live 值合并语义（plan 2026-08-04-1558-2 Phase 1）：config 变化触发 `reloadBindings` 重建点表声明 + 反向索引 + 刷新流水线/动画时钟时，**props full/diff 路径按 pointId 保留现存 live 点值**（经 `PointStore.snapshotValues` + `restoreValues` 直接回填，绕过 convert 防二次量程换算）；声明已删除的 id 丢弃，新增声明用 init。**`component:importConfig` 为显式全量替换契约**（author 意图是换画面），重置为 init 不保留 live 值。full/reset 构建失败（`config-build-failed`）后 `prevRef` 置空，强制下次同步走 full 重建（不基于损坏基线 diff）。
- 序列化/反序列化与 leafer 引擎的边界：组态 JSON 是**唯一事实源**（single source of truth），leafer 场景树是其渲染投影；引擎导出（`exportConfig`）从组态模型生成，不反向依赖 leafer toJSON（render-engines §8 #7 直出格式含内部字段，不可作组态契约）。
- 序列化函数导出归属（plan 2026-08-04-1558-1 Phase 3 Decision）：`serializeScadaConfig` 为 design-contract 函数，**保留导出**（包入口 `@nop-chaos/flux-renderers-industrial`），供 host 侧工具链（config 迁移/校验/审计）直接调用；运行期消费经 `component:exportConfig`/`component:importConfig` 句柄（内部转发至 `engine.exportConfig()`），renderer 不直调 `serializeScadaConfig`——故该函数无 live 内部消费者，保留导出为契约诚实（非死代码）。`parseScadaConfig`/`validateScadaConfig`/`diffScadaConfig` 为内部实现（renderer/handles 经 relative path 消费），不经包入口导出。

## 5. 字段分类

| 字段                                                                                | 分类                   | 说明                                                                                    |
| ----------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| `config`                                                                            | prop (source-enabled)  | 表达式或静态；组态 JSON 单一字段承载（讨论 Q10）                                        |
| `width`/`height`                                                                    | prop                   | 画布尺寸（缺省容器自适应）                                                              |
| `viewport`                                                                          | prop                   | 初始视口策略                                                                            |
| `loading`                                                                           | region                 | 加载态模板                                                                              |
| `empty`                                                                             | region                 | 空态/错误态模板                                                                         |
| `events`（onSymbolClick/onSymbolDblClick/onSymbolHover/onReady/onError 为对象字段） | prop                   | ActionSchema 对象整体经 props 通道保留；**非 event 规则分类**（D-1 裁定，见下方 §5 注） |
| `id`/`className`/`disabled`/`visible`/`hidden`/`testid`                             | meta                   | 继承 BaseSchema 元数据通道                                                              |
| 组态 JSON 内部字段（variables/symbols/bindings/...）                                | ignored（renderer 级） | 图元级字段不进 renderer-definitions（§4.2 注）；由 `config` 字段整体承载                |

- renderer-definitions `fields` 规则（I10.2 落地，I15.2 D-1 同步回写）：`config: { key: 'config', kind: 'prop' }`、`width/height/viewport/events: { kind: 'prop' }`、`loading/empty: { kind: 'region' }`。**`events` 注册为整体 prop（非 `events.*` event 规则）**：flux-compiler `classifyField` 仅按顶层 key 精确匹配、无点号路径支持（probe 实测 `events.onClick` 规则不产生 eventPlans），ActionSchema 字面量经 props 通道保留，事件派发由 renderer 桥接层经 `createNormalizedActionEvent` + `helpers.dispatch` 落地（renderer-boundary-audit.md D-1 契约裁定 :65-70，I15.2 已同步闭环）；与组态内图元事件声明（§8.2）并存。

## 6. regions 与 slot 约定

- `loading`：受控 region，`params: []`。config 未 resolve/校验中渲染；缺省为轻量占位（避免默认空屏闪烁）。
- `empty`：受控 region，`params: [{ error }]`。config 非法（校验失败）或场景构建失败时渲染错误提示；缺省显示错误文案（i18n，I15.1）。
- 根容器 slot：`data-slot="scada-canvas"`（canvas 元素）。HTML 覆盖层（hover/selected 反馈）渲染在 leafer sky 层（`InteractionOverlay`），**不产 DOM marker / 不占 data-slot**（与 §10 一致；弹窗走既有 dialog/drawer）。

## 7. 运行期状态归属

| 状态                             | Owner                    | 说明                                                                  |
| -------------------------------- | ------------------------ | --------------------------------------------------------------------- |
| 引擎实例（场景树/图层/视口）     | **域内部（ref 持有）**   | `useRef` 惰性创建（env 引用变化不重建，INV-4 环境稳定性）；不进 scope |
| 点表 store/绑定索引/动画时钟     | **域内部**               | design-data-binding.md §7                                             |
| 组态模型（当前 config 解析结果） | **域内部**               | 反序列化缓存；`config` props 变化经 diff 增量应用                     |
| 画布尺寸                         | **域内部 + resize 同步** | ResizeObserver（§8.3）                                                |
| 测试句柄                         | **dev/test 投影**        | `window.__flux_scada_<cid>`（§8.4）                                   |
| 加载/错误状态                    | **local（派生）**        | region 切换依据；可选经 `onReady`/`onError` 事件对外暴露              |

## 8. 事件、动作与组件句柄能力

### 8.1 schema 级事件（props.events）

- `onSymbolClick`/`onSymbolDblClick`/`onSymbolHover`：图元交互全局钩子（除组态内图元事件声明外的统一出口）；
- `onReady`（场景构建完成，`scada:ready`）：**按构建触发**——每次实际执行非空构建（mount/full reset/importConfig 全量构建、非空 diff 增量）恰 dispatch 1 次；空 diff 重跑（宿主每渲染传同值新对象身份、绑定域重建引起的 effect 重跑）不触发（change 基准守卫，P1-3 fix）。
- `onError`（`scada:error`，载荷 `{ code, message }`）：**仅 config 校验/构建失败**（config-parse/config-invalid/config-build-failed/engine-create-failed）。**运行期数据错误（flux 编译/求值失败）不升级画布 error、不派发 `scada:error`**：按声明跳过（失败点不更新）+ 桥接层单次去重上报（同表达式同错误码仅在变化时上报一次，求值成功后清空去重记录），scope 数据修复后点值自动回流，画面保持 ready（P1-8 fix）。
- **运行期诊断出口（非升级，plan 2026-08-04-2242-1）**：flux 编译/求值失败（`flux-compile-failed`/`flux-evaluate-failed`）、复杂表达式订阅路径收集失败（`flux-deps-empty`，plan 2026-08-05-0325-1）与用户侧图元事件处理器 throw（`handler-error`）的去重上报在 React renderer 层经 `scada-canvas.tsx` 的 `reportDiagnostic` 出口消费——`console.warn('[scada-canvas]', code, message)` 保底可见（dev+prod；去重在上游 hook/engine 层完成，每唯一错误仅 fire 一次）。**两条 telemetry 路径对称**：flux 表达式错误（含 `flux-deps-empty`）经**窄** telemetry 面 `RendererEnv.monitor.onError`（`ExpressionExecutionEnv.monitor`，phase:'expression'）；handler-error（用户侧 action 处理器 throw）经**宽** telemetry 面 `RendererPlugin.onError`（`ErrorMonitorPayload`，phase:'action'，plan 2026-08-06-0746-3 Phase 1 / multi P2-5）——由 `rendererRuntime.plugins` 迭代转发，每 plugin per-plugin try/catch 隔离。两条路径都透传原始 Error（cause 链保留）。该出口**不升级画布 status、不派发 `scada:error`**（诊断 ≠ error status，与 §8.1 降级契约一致）：不动 `setStatus`/`setErrorInfo`/`notifyError`，画布保持 `ready`。出口实现含 try/catch 自保护（通道自身 throw 不得回流 engine/hook）。telemetry 面选择理由（Decision）：不扩 `ExpressionExecutionEnv.monitor` 的 `'expression'` 字面量限定（窄面刻意限定 expression-phase，扩 `phase` 联合会模糊窄面语义且需改公共类型），优先用已存在、已接 `'action'` phase 的宽面 `RendererPlugin.onError`（`flux-action-core/action-execution.ts` 已用此面转发 action 错误）。
- **诊断通道 cause 透传（plan 2026-08-05-0653-4 C3，multi-audit P2-4）**：`UseScadaPointsBridgeArgs.onError` 第三参 `error?` 透传原始 error 实例（旧签名 `(code, message)` 把 `error:unknown` 降为 `errorMessage(error)` string 再包成无 cause 的 fresh `new Error(message)`，host 监控无法定位 formula evaluator 源）。`reportOnce` 把原始 error 经第三参透传；`reportDiagnostic(code, message, error?)` 在 telemetry 转发处用 `new Error(message, error ? { cause: error } : undefined)` 包装（保留原始 stack/cause 链）——host 监控收到的 Error 经 `Error.cause` 可定位 formula evaluator 源。参数序刻意保留 `(code, message, error?)`（非 roadmap 建议的 `(code, error, message)`）以维持现有 2-arg 桩位置稳定，仅追加 `error?`（可选 → 向后兼容）。**handler-error 路径同样透传原始 error**（plan 2026-08-06-0746-3 Phase 1 / multi P2-5）：`onHandlerError` 把 `EventBridge.reportHandlerError` 透传的原始 throw 实例经第三参传给 `reportDiagnostic`，经宽面 `RendererPlugin.onError`（phase:'action'）转发时同样 `new Error(message, { cause: error })` 包装，host 监控收到的 Error.cause 可归因 handler 源（旧实现仅传 message，cause 链丢失）。
- **pipeline onError 通道接线（plan 2026-08-05-2129-3 Phase 3，multi P1-2）**：`RefreshPipeline.onError` 签名对齐桥接层 `(code, message, error?)`，经 `createBindingDomain` 注入 `reportDiagnostic`（`use-scada-engine` `onPipelineError` ← `scada-canvas` `reportDiagnostic`），使 pipeline 层 **expression-point（`source:'expression'`）/ `binding.expression` / `scale.expression`** 求值失败经**同一**诊断出口上报。错误码统一为 `flux-compile-failed`（编译失败）/ `flux-evaluate-failed`（求值失败 / 环 / 迭代预算超限），与桥接层 `source:'flux'` 通道 **observably symmetric**——三个声明源（flux 点 / binding.expression / scale.expression）的求值错误都到达 `console.warn` + `env.monitor.onError`（phase:'expression'，code 属 flux-\* 码族）。`evaluateFlux` 改返 discriminated `FluxEvalOutcome`（区分 compile-failed/evaluate-failed）使 `reportError` 能 emit 对称错误码（旧实现 compile/evaluate catch 塌缩为 undefined，caller 无法区分阶段）。修复前 `createBindingDomain` 构造 `RefreshPipeline` 时无 `onError` → pipeline 三类求值错误全部静默（对比：桥接层 `source:'flux'` 通道已接线）。回归经 `scada-canvas-diagnostic-channels.test.tsx` pipeline 通道用例 + 对称性用例守护。

### 8.2 图元事件 → flux action 联动（讨论 Q8）

- 组态 JSON 图元事件声明（§4.2 `events`）→ 引擎事件桥（design-engine.md §8.1 `symbol:click` 等）→ **事件载荷规范化**：
  ```typescript
  interface ScadaSymbolEventPayload {
    symbolId: string;
    symbolType: string;
    pointValues?: Record<string, unknown>; // 命中的绑定点值快照（只读）
    world?: { x: number; y: number };
    viewport?: { x: number; y: number };
  }
  ```
- 派发路径：`createNormalizedActionEvent({ type: 'symbol:click', symbolId, ...payload })`（单参数签名 `(event: unknown) => ActionContext['event']`，`@nop-chaos/flux-react` renderer-helpers.ts:98，返回 `FluxActionEvent`，actions.ts:307）→ `const normalized = createNormalizedActionEvent(...)` → `useActionDispatcher()`/`helpers.dispatch(action, { event: normalized })` 执行组态内声明的 `action`（ActionSchema）；symbolId/点值等载荷经事件体承载（FluxActionEvent 扩展字段）；与 `props.events.onSymbolClick` 并存（图元声明优先，全局钩子兜底）。
- 命中解析：引擎事件经 leafer `selector.getByPoint`（O(候选) 预检，gate-1-review §4 A3/§6 design-renderer 约束）定位命中的图元 id → 查事件声明 → 派发；`dblclick` 由交互层合并（leafer pointer 事件流）。

### 8.3 React 桥接（ref 同步/实例生命周期）

- **生命周期**（fabric ref/effect 范本，render-engines §12 #21）：
  - `mount`：`useEffect` 内 `ScadaCanvasEngine.create(options)` → 解析 config → 构建场景 → 挂测试句柄；清理函数内 `destroy()`（幂等）；
  - `unmount`：destroy 释放 canvas/事件/动画时钟/测试句柄；
  - `resize`：ResizeObserver 观察容器 → `engine.setSize(w, h)`（防抖到帧）；容器尺寸变更不重建引擎；
- **props 同步**：
  - `config` 变化 → `diffScadaConfig` → 引擎增量应用（§4.3）或全量 `reset`（diff 不可用/版本变更）；
  - 点表 flux 桥接：`useScopeSelector`（paths 精细化，从 config 提取 `${...}` 引用路径；复杂表达式经平台依赖收集产出根级订阅路径，design-data-binding.md §9.1/plan 2026-08-04-1558-2 Phase 3）订阅 scope → 公式编译器求值 → `setPointValues` 注入点表（I10.3）——**不逐点 setState 直刷 React**（性能红线）；
  - `width`/`height`/`viewport` 变化 → 引擎命令式 API（**`width`/`height` props 变更触发 `engine.setSize`**：plan 2026-08-04-1558-2 Phase 4 WD-1/m10 落地，effect deps 含 width/height；**`viewport` policy 仅在 full/reset 路径应用**：diff 增量重应用会重置用户在画布上的平移/缩放，保持现状契约，不自动重应用）；
- **React Compiler 基线**：引擎实例为命令式副作用，生命周期放 `useEffect`（`useEffectEvent` 用于事件桥接注册/注销，research-summary §5.2 差距项）；渲染函数内不触碰引擎（INV-5：render path 无副作用）。
- **销毁状态可见性**（plan 2026-08-04-1558-2 Phase 1 OP-4）：`component:destroy` 后 wrapper `data-status` 反映 `destroyed` 态（非 `ready`），e2e/tooling 不再把已销毁画布报为健康；后续句柄命令返回 `not-mounted`。
- **reset 清覆盖物对称**（plan 2026-08-06-0900-3 Phase 2 multi P2-10）：`engine.reset(config)`（importConfig/version-change 全量重建路径）末尾清 `InteractionOverlay`（`this.interaction?.clear()`），重建后无残留 hover 高亮；`use-scada-events` config-change effect 重置 `lastHoverSymbolRef`，使 hover 状态机基线与新 config 对齐（与 reset 清覆盖物同口径，覆盖 hook 侧 stale 基线）。`use-scada-handles` handle 注册 effect deps 移除 `runtime`（invoke 经 ref 读最新），config reload 不冗余重注册 handle（multi P2-11）。

### 8.4 测试句柄契约（A2 固化，I2.4 Decision）

- dev/test 构建下引擎创建后写入 `window.__flux_scada_<cid>`（cid 来自 `RendererResolvedProps.cid`，quick-reference.md，**经 `ScadaEngineOptions.cid` 传入引擎**，design-engine.md §4.1）；**句柄挂载/移除为引擎侧唯一所有权**（`engine/test-handle.ts`，design-engine.md §11），renderer 只负责传 cid 与开关；**含 `tree` 引用**（gate-1-review §4 A2：render 帧事件/性能测量挂 tree 层）；结构见 `design-engine.md` §8.3。
- e2e（I15）经 `page.evaluate(() => window.__flux_scada_<cid>.getSymbol('pump-1').fill)` 等程序化断言场景树/点表/视口（roadmap 测试纪律，禁截图判定）。

### 8.5 组件句柄（component:<method>）

| 句柄                                                          | 说明                                                                                                                                                                                                                                | 失败路径                                                                                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `component:fit()` / `component:center()`                      | 视口命令                                                                                                                                                                                                                            | `not-mounted`/`not-visible`（plan 2026-08-04-1558-2 Phase 4 WD-5 落地：空场景无 bounds 时返回 `not-visible`，对齐本表语义） |
| `component:getSymbols()` / `component:getSymbol(id)`          | 场景树只读                                                                                                                                                                                                                          | `not-mounted`/`symbol-not-found`                                                                                            |
| `component:setPointValue(pointId, value)`                     | 点表写入（经数据层点表 store → 刷新流水线 → `engine.applyAttrs`，design-data-binding.md §4.3）；**value 经 `isScadaPrimitive` 校验**（plan 2026-08-04-2243-2 W4：非 number/boolean/string 拒绝，与 flux 桥接对称，不 corrupt 点表） | `not-mounted`/`point-not-found`/`invalid-point-value`（非原始值）                                                           |
| `component:getPointTable()`                                   | 点表快照                                                                                                                                                                                                                            | `not-mounted`                                                                                                               |
| `component:exportConfig()` / `component:importConfig(config)` | 序列化契约                                                                                                                                                                                                                          | `not-mounted`/`invalid-config`                                                                                              |
| `component:destroy()`                                         | 命令式销毁（`data-status` 转为 `destroyed`，后续句柄返回 `not-mounted`）                                                                                                                                                            | `not-mounted`                                                                                                               |

- 错误码注册表 + i18n 文案映射（plan 2026-08-04-1558-2 Phase 4 WD-6）：全部错误码（`config-parse`/`config-invalid`/`config-build-failed`/`engine-create-failed`/`flux-compile-failed`/`flux-evaluate-failed`/`flux-deps-empty`/`handler-error`/`not-visible`/`not-mounted`/`symbol-not-found`/`point-not-found`/`invalid-config`）集中登记于 `scada-errors.ts` `SCADA_ERROR_CODES`，code→i18n key 经 `scadaErrorI18nKey` 映射（`industrial.scada.error.<code>`），locale 文案在 `flux-i18n` `locales/{zh-CN,en-US}.ts`；scada-canvas 错误区经 `useScadaErrorText` 解析本地化文案，未知码 fallback 原始 message（向后兼容）。`flux-deps-empty`（plan 2026-08-05-0325-1）为复杂表达式订阅路径收集失败的**非升级**诊断码，与 `flux-compile-failed`/`flux-evaluate-failed` 同经 `reportDiagnostic` 出口（详见 design-data-binding.md §9.1）。
- 缺 `config` 兜底（plan 2026-08-04-1558-1 Phase 3 落地 + plan 2026-08-04-1558-2 Phase 4 doc 注记）：author 未提供 config 时 renderer 兜底构造最小合法空场景（`EMPTY_SCADA_CONFIG`），画布进入 `ready`（**非永久 loading**）；本行为由 plan `{1}` 实现收口，本档同步实际契约。
- 注册：`ComponentHandleRegistry`（`useCurrentComponentRegistry`，INV-4 例外通道）——I10.2 落地；I16 编辑器场景可经句柄扩展（增删图元）。

## 9. 数据源、表达式、导入能力接入点

- `config` source-enabled（静态 JSON / 表达式 / data-source，对齐 kanban `data` 模式，quick-reference.md DataSourceSchema）；
- 点表 flux 桥接：`useScopeSelector` + flux-formula（§8.3，平台能力复用表）；**禁止重复实现 scope 订阅/表达式编译**；
- 外部数据通道（socket.io 等）：经 `RendererEnv`（fetcher/stream/openSocket）或 `xui:imports` 注入适配器（INV-1/INV-2，design-data-binding.md §9.2）；
- 图元资源（图片 URL）：经引擎图片缓存 + 桥接层 env.fetcher（design-engine.md §9）；
- i18n：`flux-i18n` locale（图元名/错误文案，I15.1）。

## 10. 样式与 DOM marker 约定

| DOM 元素    | marker class               | data-slot              |
| ----------- | -------------------------- | ---------------------- |
| 根容器      | `nop-scada-canvas`         | `scada-canvas`         |
| canvas 画布 | `nop-scada-canvas-canvas`  | `scada-canvas-canvas`  |
| 加载占位    | `nop-scada-canvas-loading` | `scada-canvas-loading` |
| 错误提示    | `nop-scada-canvas-error`   | `scada-canvas-error`   |

- 根容器尺寸策略：`width: 100%; height: 100%`（`width`/`height` props 显式覆盖）；canvas 绝对定位铺满根容器；
- `data-slot="scada-canvas-canvas"` 落在真实 leafer `<canvas>` DOM 元素上（plan 2026-08-04-1558-3 Phase 1：引擎创建后由 renderer effect 标注），DOM 断言直接命中渲染画布（TE-3 黑屏兜底基础）；wrapper 占位 div 仅保留 `nop-scada-canvas-canvas` marker class 供 CSS 定位规则稳定命中（F8）；
- HTML 覆盖层（hover/selected 反馈）渲染在 leafer sky 层（`InteractionOverlay`），**不产 DOM marker / 不占 data-slot**——此前的 `scada-canvas-overlay` slot 行永不渲染，已移除；
- canvas 渲染层不额外产 DOM marker（引擎内部绘制）；测试锚点优先顺序：`window.__flux_scada_<cid>`（程序化断言）> data-slot > `nop-*`（对齐既有约定）。
- **画布交互面 a11y（HCAX-2 / HCA1 P2-1）**：根容器 `data-slot="scada-canvas"` div 携带 `role="application"` + `aria-label={t('industrial.scada.canvasLabel')}`（i18n key 经 `flux-i18n` 双 locale 注册：zh-CN `工业组态画面` / en-US `Industrial SCADA canvas`），为读屏/键盘用户提供画布角色语义（canvas 元素本身无原生 a11y 角色，LeaferJS 交互层非标准 web content）。

## 11. 实现拆分建议

```
packages/flux-renderers-industrial/src/
├── engine/                       # 引擎域核心（design-engine.md §11）
├── binding/                      # 数据绑定域核心（design-data-binding.md §11）
├── symbols/                      # 图元模型域核心（design-symbols.md §11）
├── serialization/                # 组态 JSON 序列化（纯逻辑）
│   ├── config-types.ts           # ScadaConfig/ScadaSymbolNode 类型（schemas.ts 再导出）
│   ├── validate.ts               # validateScadaConfig（I5.3，Vitest 单测）
│   ├── parse.ts / serialize.ts   # 反序列化/序列化（I5.3，Vitest 单测）
│   ├── diff.ts                   # diffScadaConfig（I5.3，Vitest 单测）
│   └── equality.ts               # 共享 deepEqual（plan 2026-08-05-0653-4 C2 / W5）
├── renderer/
│   ├── scada-canvas.tsx          # 主渲染器：RendererComponentProps 装配 + 桥接（I10.1）
│   ├── scada-errors.ts           # SCADA_ERROR_CODES 注册表 + i18n 映射（plan 2026-08-04-1558-2 Phase 4，§10 错误码段落）
│   ├── hooks/
│   │   ├── use-scada-engine.ts   # 引擎实例生命周期（mount/unmount/resize，I10.1）
│   │   ├── use-scada-config-sync.ts # config diff 同步（I10.1）
│   │   ├── use-scada-points-bridge.ts # useScopeSelector 点表桥接（I10.3）
│   │   ├── use-scada-events.ts   # 图元事件→createNormalizedActionEvent→dispatch（I10.3/I11.1）
│   │   └── use-scada-handles.ts  # component:* 句柄注册（I10.2/I11.1）
│   └── （测试句柄挂载/移除属 engine/test-handle.ts，design-engine.md §11；renderer 仅经 ScadaEngineOptions 传 cid/exposeTestHandle，I10.1）
├── schemas.ts                    # 包 schema 类型 barrel（I4.1，与 index.ts 同级）
├── renderer-definitions.ts       # registerScadaRenderers：fields/events/regions/handles（I4.2 空壳/I10.2 完整，与 index.ts 同级）
└── index.ts                      # 公共面：registerScadaRenderers/registerScadaSymbols/registerScadaSymbol + 符号注册表 API + 类型（plan 2026-08-04-1558-1 Phase 2 收敛）
```

- **公共导出面**（plan 2026-08-04-1558-1 Phase 2 收敛后）：`registerScadaRenderers` / `registerScadaSymbols` / 符号注册表 API（`registerScadaSymbol`/`unregisterScadaSymbol`/`hasScadaSymbol`/`getScadaSymbolDefinition`/`listScadaSymbols`）/ `builtinScadaSymbolDefinitions` / `serializeScadaConfig`（序列化契约函数，design-contract 导出供 host 工具链直调，§4.3 裁定保留导出）/ 类型（`ScadaCanvasSchema`/`ScadaCanvasEvents`/`ScadaConfig`/`ScadaSymbolNode`/`ScadaPointDeclaration`/`ScadaSymbolDefinition`/`ScadaSymbolProps` 等 + 序列化 companion 类型）。engine/binding/symbols 内部实现类（`ScadaCanvasEngine`/`PointStore`/`DirtyCollector`/`BindResolver`/`Animator`/`EventBridge`/viewport 工具等）不再经包入口导出——内部测试走 relative path（`../engine/...`），零外部消费者（audit dim 03 实核）。

- 拆分依据：`renderer-implementation-guidelines.md` Case 4（引擎/绑定/图元为域核心）+ Case 1/3（renderer 壳薄、桥接 hooks 本地化）；`complex-component-design-process.md` 分层（schema → 编译（序列化/校验）→ 运行时（引擎）→ 样式）。
- 实现阶段映射：I4.1 包基建（schemas.ts/renderer-definitions.ts 骨架）、I4.2 空壳注册、I5.3 序列化（本档 §4.3）、I10.1/I10.2/I10.3 桥接与完整注册、I11.1/I11.2 事件联动与画布交互。

## 12. 风险、取舍与后续阶段

### 12.1 I1.2 API 风险清单 → 规避策略映射（gate-1-review §4/§6 逐条回应）

| #        | 风险项                                                                           | 本设计规避/接受                                                                                                        |
| -------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| A2       | 渲染帧事件/测试句柄需含 `tree` 引用（App 层不转发 render 计数）                  | **固化**：§8.4 测试句柄含 `tree` 字段（引用 design-engine.md §8.3）；I14 性能测量基于 tree 事件                        |
| A3       | 命中 `selector.getByPoint` 为 O(候选) 包围盒预检（10 万级 ≤2.4ms 屏内/0ms 屏外） | **接受**：§8.2 命中解析直接用 `selector.getByPoint` 作为事件→图元解析引擎接口（gate-1-review §6 design-renderer 约束） |
| A1/A4/A5 | viewport 类型配置/测量口径/上层合帧                                              | 转发约束：design-engine.md §4.2（A1）、§4.6（A4）；design-data-binding.md §4.3（A5）                                   |

### 12.2 renderer 契约审计摘要（new-renderer-introduction-audit.md，设计期预审）

> I10.2 将执行**完整五边界审计**（roadmap I10 强制原则审计，结论作 I12 gate 输入）；本节为设计期预审快照：

| 审计面                      | 设计期结论                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. IO 边界（INV-1/INV-2）   | 无直接 `fetch`/`WebSocket`/`localStorage`/`history` 调用；外部数据经 RendererEnv 或 xui:imports；**无新 IO 类型需求，不扩 env**（组态协议适配器走 INV-2 B 档注入） |
| B. 复用边界（INV-3）        | 表达式/scope/action/UI 全部复用平台能力（§9）；弹窗走 dialog/drawer；无自造 fetch pipeline/DSL                                                                     |
| C. 内部 state 边界（INV-4） | 引擎实例/点表/动画时钟全为域内部（§7），高频更新不进 scope；测试句柄为 dev/test 投影；component handles 经 ComponentHandleRegistry                                 |
| D. 契约边界（INV-5）        | 严格 `RendererComponentProps`（§1/§8）；数据从 props.props/meta/regions/events/helpers 读；render path 无 scope.get/副作用                                         |
| E. 扩展点边界               | 事件（ActionSchema）+ region（loading/empty）+ 图元事件声明内嵌 config；不塞实现细节字段                                                                           |
| F. 样式边界                 | `nop-scada-canvas` marker + data-slot（§10）；无 BEM/新 token 命名空间                                                                                             |

### 12.3 风险与取舍

- **组态 JSON 与 renderer-definitions 双层 schema**：组态 JSON 内部 schema 与 flux schema 体系并存（讨论 Q10 决策）；风险 = 双 schema 漂移——由 §4.2 注 + 交叉一致性核对记录 + I10.2 审计兜底；图元级 type 注册（scada-symbol）后置（讨论 §九）。
- **React Compiler 与命令式引擎**：引擎副作用集中在 useEffect/useEffectEvent（§8.3）；若编译器优化引入意外重复执行，以 ref 幂等守卫（I10.1 落地验证）。
- **config 大对象性能**：内嵌组态 JSON 可达 MB 级（10 万 symbol 11.6 MB，gate-1-review §3.2 #8）；`config` 变化频率预期低（编辑期/换面），diff 增量应用防全量重建；props 传递走引用（对象形态）防序列化开销——字符串形态仅用于外部来源。
- **错误面**：config 校验失败 → `empty` region + `onError`（不崩溃渲染树）；引擎创建失败（canvas 不可用）同路径。
- **架构冲突记录（I15.2）**：renderer 契约与 `docs/architecture/renderer-runtime.md` 差异（如 fields 规则/句柄注册时序）记录于 plan Failure Paths `design-contract-conflict`，架构文档同步属 I15.2。

### 12.4 后续阶段

| 阶段        | 内容                                                                         |
| ----------- | ---------------------------------------------------------------------------- |
| I4.1/I4.2   | 包基建 + `scada-canvas` 空壳注册（本档 §3/§11）                              |
| I5.3        | 组态 JSON 解析/序列化/增量 diff（本档 §4.3，纯逻辑单测）                     |
| I10.1       | renderer 组件 + 实例生命周期 + ref 同步（本档 §8.3）                         |
| I10.2       | renderer-definitions 完整注册 + 五边界审计（本档 §12.2 预审快照 → 全量执行） |
| I10.3       | 点表 ↔ flux 桥接（useScopeSelector + 公式编译器，本档 §8.3/§9）              |
| I11.1/I11.2 | 图元事件→action 全链路 + 画布浏览交互（本档 §8.2/句柄）                      |
| I15.1/I15.2 | e2e 程序化断言（测试句柄）+ 文档收尾（quick-reference/flux-guide）           |
| I14         | 性能基准固化（测试句柄 + tree 事件测量口径）                                 |
