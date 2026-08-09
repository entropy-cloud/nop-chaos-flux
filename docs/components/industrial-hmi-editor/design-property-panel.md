# 属性面板 schema 设计 design-property-panel.md

> 日期：2026-08-06
> 版本：v1（E2.2 产出）
> 上游：编辑器架构 `design-architecture.md`（E2.1，§4.5 编辑会话模型 + §8.5 句柄面扩展）、runtime 图元模型 `docs/components/industrial-hmi/design-symbols.md`（§4.1 ScadaSymbolDefinition / §4.2 ScadaSymbolProps / §4.4 图元分类 24 内置）、runtime 序列化 `docs/components/industrial-hmi/design-renderer.md`（§4.3 校验/序列化/diff）、立项材料 `docs/components/industrial-hmi/editor-initiation.md`（§2.1 属性面板功能域 + §3 复用点 #3 #4 + §6 R3 双维护）
> 下游：E5.3 属性面板实现（消费本档抽取方案 + 六类分类 + validate 衔接）；E2.6 renderer 契约（消费 inspector region 契约）
> 依据：roadmap `docs/components/roadmap-industrial-hmi-editor.md`（E2.2 + Cross-Cutting 平台能力复用 / 双态隔离）+ E2 plan `docs/plans/2026-08-06-1931-2-e2-editor-design-documents.md`

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent（fresh session，不复用编写者上下文）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。轮次记录如下：

- **Round 1（2026-08-06，fresh session 独立子 agent `ses_028f94ec8ffePU6ZSsAcFis6DV`）**：判定 `AGREE`——0 Blocker / 0 Major / 0 Minor / 1 Nit。4 项核对逐项 PASS：① schema 单源化方案无 R3 双维护（§4 抽取目标 = 同一 `ScadaSymbolDefinition.props`，扩展 `ScadaSymbolPropSchemaEntry` 而非新建面板 schema；§4.4 R3 防护表列 5 条风险路径，live 核对 `symbols/symbol-types.ts:54-60` 与现状一致）；② 六类字段覆盖 `editor-initiation.md §2.1` 属性面板边界（§5 几何/样式/绑定/状态/动画/事件，对应 `config-types.ts:18-24` ScadaBinding / `:28-35` ScadaAnimation / `:37-49` ScadaStateDeclaration / `:56-59` ScadaSymbolEvent live 一致）；③ validate 衔接路径 live 一致（§6 经 `validateScadaConfig`（`serialization/validate.ts:406` live）+ 复用 `SCADA_ERROR_CODES`（`renderer/scada-errors.ts:23` live，对齐 design-renderer.md §8.5），无第二套规则）；④ 只写声明结构不触发运行时改动（§7 标题 + §7.2 显式「运行时装配零改动」+ 装配链复用表列 runtime 提供方，禁止重复实现）。**1 Nit 落地**：**n-1** §4.1 引注 `symbols/composite.ts:114-134`（compositePropSchema）少含闭合 `};` 行（live 135），改为 `:114-135` 含闭合行。**Round 1 达成共识（连续一轮 0 Blocker/0 Major/0 Minor/0 新增 Nit，仅 1 项 cosmetic Nit 当场落地，未超 3 轮上限）**。本文件可作为 E5.3 属性面板实现的契约依据。E3 设计 gate（独立 plan）为终轮复核。

---

## 1. 组件定位

- 本文档定义**属性面板 schema 设计**：图元定义属性 schema 的统一抽取方案（从 `symbols/register-builtin.ts` 24 定义导出声明式 props schema，单源化防 R3 双维护）、面板字段六类分类（几何/样式/绑定/状态/动画/事件）、编辑期校验衔接 runtime `serialization/validate.ts`（即时报错）、绑定/状态/动画/事件四类声明只写声明结构（运行时装配零改动）。
- 属性面板是编辑器的**核心 schema 驱动 UI**（editor-initiation §2.1 P0 M1 功能域）：面板字段从图元定义的 `props` schema 动态生成，编辑期写入编辑会话 working copy（`design-architecture.md §4.5`），经 `component:updateSymbol(nodeId, patch)` 句柄入栈（E2.4 落点）。
- 边界：本档**只定义 schema 抽取方案 + 字段分类 + validate 衔接契约**，不定义具体图元的字段级 schema 内容（I8/I9 已成型，E5.3 实现期补全 editor hints）、不定义面板 UI 组件（E5.3 落地，复用 `@nop-chaos/ui` Field/Input/Select/Combobox 等）、不定义事件 action 编辑器（事件 action 的 ActionSchema 编辑属 M3 工具箱 E9）。
- 非目标：不修改 runtime 图元定义的现有 `props` schema 字段集（E5.3 只**扩展** `ScadaSymbolPropSchemaEntry` 类型，不删改既有字段）；不重新实现 runtime validate 面（仅衔接调用）；不实现任何代码（E5.3+）。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无 schema 驱动 canvas 属性面板先例。对照调研结论：
  - **FUXA `gauge-property`**（scada-apps §3.5）：组件族 flex-variable/flex-event/flex-action——**字段分类蓝本**（变量/事件/action 三层），本档六类（几何/样式/绑定/状态/动画/事件）借鉴其分类粒度并扩展工业组态语义。
  - **vue-webtopo-svgeditor right-panel**（supplement §3）：轻量属性面板参考（教学/参考层，非主力蓝本）。
  - **maxGraph**（supplement §4.3 :133）：vertex/edge 属性表——通用属性面板模式参考。
  - **leafer**（render-engines §5）：Editor 插件 InnerEditor（双击文本编辑）——文本字段在画布上直接编辑（本档不替代，InnerEditor 与属性面板并存）。

### Flux 决策表（属性面板 schema 层）

| 能力                                                   | 采纳        | 不采纳                                     | 理由（依据）                                                                                                                                                                                                                  |
| ------------------------------------------------------ | ----------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| schema 单源化（从 `ScadaSymbolDefinition.props` 抽取） | **P0 采用** | 双 schema（面板 schema + 图元定义 schema） | R3 双维护防护（`editor-initiation.md §6 R3`）；图元定义的 `props: ScadaSymbolPropSchema` 已存在（`symbols/symbol-types.ts:72`），扩展其 entry 类型即可；面板直接消费 `getScadaSymbolDefinition(type).props`                   |
| 扩展 `ScadaSymbolPropSchemaEntry`（加 editor hints）   | **P0 采用** | 新建独立面板 schema 类型                   | 现有 entry 仅 `{type: ScadaSymbolPropType}`（6 种粗粒度类型）；面板需要更丰富元信息（label/group/widget/default/validation）。扩展同一类型保持单源（设计期契约，E5.3 落地）                                                   |
| 六类字段分类（几何/样式/绑定/状态/动画/事件）          | **P0 采用** | 平铺字段表                                 | `editor-initiation.md §2.1` 属性面板功能域 P0 M1 边界；FUXA 蓝本分类粒度；六类对应 config-types.ts 的不同字段区域（几何样式属 `ScadaSymbolProps` 主体 / 绑定 `bindings` / 状态 `states` / 动画 `animations` / 事件 `events`） |
| 编辑期校验衔接 runtime `validate.ts`                   | **P0 采用** | 重新实现校验器                             | 平台能力复用（roadmap Cross-Cutting + editor-initiation §3 复用点 #4）；`validateScadaConfig` 已 live（`serialization/validate.ts`）；面板编辑后调用 validate 即时反馈                                                        |
| 绑定/状态/动画/事件只写声明结构                        | **P0 采用** | 面板内运行时求值/装配                      | `editor-initiation.md §3` 复用点 #8：编辑期属性面板的绑定/状态/动画声明编辑**只写声明结构**（config-types.ts 类型），运行时装配零改动（与 runtime design-data-binding.md 装配链解耦）                                         |
| 字段 i18n（label/description/group 名）                | **P0 采用** | 字面量硬编码                               | 平台能力复用 `flux-i18n`（roadmap Cross-Cutting + editor-initiation §3）；schema entry 的 label/description 经 i18n key 解析                                                                                                  |

## 3. Flux 中的 renderer/type 定义

- 属性面板**不是独立 renderer type**：属性面板是 `scada-editor-canvas` 的 `inspector` region（`design-architecture.md §4.1`），由编辑器 renderer 在 React DOM 内渲染（canvas 外层）。
- 包归属：与编辑器 renderer 同包（**方案 A 裁定**，2026-08-06 E4.1——`flux-renderers-industrial` 的 `src/editor/` subpath，详见 design-architecture.md §4.4.1）。
- 注册机制：属性面板 UI 组件复用 `@nop-chaos/ui` 既有组件（Field/Input/Textarea/Select/NativeSelect/Combobox/Switch/Checkbox/Slider 等，AGENTS.md「UI Component Usage」清单），不引入新 UI 库。

### 与既有 flux 架构的边界（E2.2 Decision）

| 边界         | 约定                                                                                                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 依赖   | 属性面板组件属 React 视图结构层；schema 抽取 + 字段元信息查询属域核心（无 React 依赖）                                                                                                                           |
| 数据流       | 面板从编辑会话 working copy（域内部 ref 持有）读当前选中图元 → 经 schema 抽取生成字段集 → 用户编辑写入 working copy（`component:updateSymbol` 句柄，E2.4 入栈）；**不直接读 flux scope**（编辑期不消费点表绑定） |
| 事件流       | 面板字段 onChange → 经 `component:updateSymbol` 句柄更新 working copy + undo 栈（不派发 `symbol:*` action，R5 隔离）；i18n key 解析经 `flux-i18n`                                                                |
| 注册机制     | 面板组件不进 `renderer-definitions.ts` 注册（属 region 内部 UI）；schema 抽取复用 runtime `registerScadaSymbol` 24 内置定义（**不重复注册图元定义**）                                                            |
| 测试句柄     | 面板交互经 `window.__flux_scada_editor_<cid>` 程序化驱动（E2.6 完整契约）                                                                                                                                        |
| 平台能力复用 | 复用 runtime 图元注册表（`getScadaSymbolDefinition` / `listScadaSymbols`）+ 序列化校验面（`validateScadaConfig`）+ UI 组件（`@nop-chaos/ui`）+ i18n（`flux-i18n`）；**禁止重复实现** schema 系统/校验器/UI 基元  |

## 4. schema 设计（图元定义属性 schema 统一抽取方案）

### 4.1 抽取目标：同一 `ScadaSymbolDefinition.props`

**单源化核心**：属性面板的字段元信息从 `ScadaSymbolDefinition.props: ScadaSymbolPropSchema` 直接抽取，**不新建面板 schema 类型**。

**现状**（runtime live，`symbols/symbol-types.ts:54-60`）：

```typescript
export type ScadaSymbolPropType = 'number' | 'string' | 'boolean' | 'array' | 'object' | 'any';

export interface ScadaSymbolPropSchemaEntry {
  type: ScadaSymbolPropType;
}

export type ScadaSymbolPropSchema = Record<string, ScadaSymbolPropSchemaEntry>;
```

24 内置图元定义各自声明 `props`（如 `scada-rect` 见 `symbols/base-shapes/rect.ts:11-27`，`scada-text` 见 `symbols/base-shapes/text.ts:42-57`，复合族共享 `compositePropSchema` 见 `symbols/composite.ts:114-135`）。当前 entry 仅含粗粒度 `type`（6 种），不足以驱动面板（缺 label/group/widget/default/validation 等 editor hints）。

### 4.2 扩展 `ScadaSymbolPropSchemaEntry`（设计期契约，E5.3 落地）

```typescript
export type ScadaSymbolPropType = 'number' | 'string' | 'boolean' | 'array' | 'object' | 'any';

/** 字段六类分类（§5），与 config-types.ts 字段区域对应 */
export type ScadaPropFieldGroup =
  | 'geometry'
  | 'style'
  | 'binding'
  | 'state'
  | 'animation'
  | 'event';

/** 字段编辑 widget 提示（面板渲染选 widget 用，E5.3 实现） */
export type ScadaPropEditorWidget =
  | 'number-input' // 数值输入（geometry/style 数值字段）
  | 'text-input' // 文本输入（style/text 字段）
  | 'textarea' // 多行文本（长字符串，如 expression）
  | 'color-picker' // 颜色选择器（fill/stroke/textColor）
  | 'select' // 下拉选择（枚举值，如 align/事件 on）
  | 'combobox' // 可输入下拉（如 pointId 引用）
  | 'switch' // 开关（visible/enabled 等布尔）
  | 'slider' // 滑块（数值 + 范围，如 opacity 0..1）
  | 'json-editor' // JSON 编辑器（object/array 字段，如 custom/bindings/states/animations/events）
  | 'point-ref' // 点表引用选择器（binding.point）
  | 'action-editor' // ActionSchema 编辑器（events.action，M3 工具箱 E9 完整落地）
  | 'readonly'; // 只读展示（如 id）

export interface ScadaSymbolPropSchemaEntry {
  /** 粗粒度类型（既有，不变） */
  type: ScadaSymbolPropType;
  /** 字段六类分类（新增，决定面板分组） */
  group?: ScadaPropFieldGroup;
  /** 字段标签 i18n key（新增，如 'industrial.scada.editor.props.fill'） */
  label?: string;
  /** 字段描述 i18n key（新增，hover tooltip） */
  description?: string;
  /** 编辑 widget 提示（新增，缺省按 type 推导：number→number-input/string→text-input/boolean→switch/...） */
  widget?: ScadaPropEditorWidget;
  /** 字段默认值（新增；与 ScadaSymbolDefinition.defaults 互为校验源，E5.3 实现期对齐） */
  defaultValue?: unknown;
  /** 数值范围（新增，widget=number-input/slider 时启用） */
  min?: number;
  max?: number;
  step?: number;
  /** 枚举可选值（新增，widget=select 时启用，如 align: ['left','center','right']） */
  enum?: Array<string | number>;
  /** 是否必填（新增，validate 衔接 §6） */
  required?: boolean;
  /** 是否只读（新增，id 等系统字段） */
  readonly?: boolean;
  /** 是否依赖其他字段（新增，如 textColor 仅 text 类图元显示；条件式显示规则） */
  visibleWhen?: { field: string; equals?: unknown; in?: unknown[] };
}
```

**扩展原则**：

1. **既有字段不变**：`type` 字段保留，所有现有 24 定义无需改动即可继续工作（runtime 装配不读新字段）；
2. **新增字段全部 optional**：图元定义可渐进式补全 editor hints（E5.3 实现期补全 24 内置；第三方扩展最小化兼容）；
3. **零 runtime 装配影响**：新增字段仅由属性面板消费，runtime `applyProps`/`create`/`bind-resolver` 等装配链**不读新字段**（只读 `defaults`/`props.type` 既有契约）。

### 4.3 schema 抽取 API（设计期契约，E5.3 落地）

```typescript
/** 从 ScadaSymbolDefinition 抽取属性面板字段集（按六类分组） */
export function extractPanelFields(definition: ScadaSymbolDefinition): PanelFieldGroup[];

export interface PanelFieldGroup {
  group: ScadaPropFieldGroup;
  /** i18n key（如 'industrial.scada.editor.group.geometry'） */
  label: string;
  fields: PanelField[];
}

export interface PanelField {
  key: string;
  entry: ScadaSymbolPropSchemaEntry;
  /** 当前值（从 working copy node 读取） */
  value: unknown;
  /** 默认值（从 definition.defaults 读取） */
  defaultValue: unknown;
}
```

**抽取规则**：

1. **几何/样式字段**：从 `definition.props` 抽取（type=number/string/boolean/array 的字段）；
2. **绑定/状态/动画/事件字段**：固定 4 个虚拟字段（对应 config-types.ts 的 `bindings`/`states`/`animations`/`events`），widget=json-editor/action-editor（§7）；
3. **id/type 字段**：固定只读字段（widget=readonly），不参与编辑；
4. **分组顺序**：geometry → style → binding → state → animation → event（§5 表）；
5. **字段可见性**：经 `visibleWhen` 规则评估（如 textColor 仅 `scada-text` 等含文本图元显示）。

### 4.4 双维护风险评估（R3 防护）

`editor-initiation.md §6 R3` 双维护风险 = 面板 schema 与图元定义 schema 双源化漂移。本档方案防护：

| 风险路径                                     | 本档防护                                                                                                                                                                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 图元定义新增字段未同步到面板                 | **单源化**：面板直接读 `definition.props`，新增字段经 `extractPanelFields` 自动出现在面板（按 group/widget 推导）—— 图元定义新增字段=面板新增字段，无人工同步义务                                                                  |
| 图元定义删除/重命名字段未同步到面板          | **单源化**：面板字段集是 `definition.props` 的投影，删除/重命名即面板同步删除/重命名                                                                                                                                               |
| 面板 widget 与图元定义 type 不一致           | **widget 缺省按 type 推导**（type=number→widget=number-input；type=string→widget=text-input；type=boolean→widget=switch；type=object/array→widget=json-editor）；自定义 widget 经 entry.widget 显式声明，type 仍由图元定义持有     |
| 默认值双源（entry.defaultValue vs defaults） | **defaults 为权威源**：`extractPanelField` 优先读 `definition.defaults[key]`，`entry.defaultValue` 为 fallback（用于无 defaults 的字段，如 bindings/states 等声明类）；E5.3 实现期对齐两者（如有冲突 defaults 优先 + warn）        |
| validate 规则与图元定义 type 不一致          | **validate 由 `serialization/validate.ts` 单一事实源**（runtime design-renderer.md §4.3）；面板调用同一 validate 函数，无第二套规则；entry.required/min/max 仅作面板前置 UI 反馈（即时客户端校验），最终校验仍走 validate.ts（§6） |

**结论**：本档方案**无 R3 双维护路径**（单源抽取 + validate 单源 + defaults 单源 + widget 自动推导）。

### 4.5 声明结构写入语义（编辑会话 working copy 写入路径）

字段编辑（用户在面板修改值）→ 写入编辑会话 working copy 的对应字段：

| 字段类别  | 写入路径                                                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 几何/样式 | `updateSymbol(nodeId, { [key]: value })` 句柄（`design-architecture.md §8.5`）→ working copy 对应 `ScadaSymbolNode` 字段（如 `fill`/`width`/`x`）           |
| 绑定      | `updateSymbol(nodeId, { bindings: { ...existing, [propKey]: newBinding } })` → working copy `node.bindings`（`ScadaBinding` 结构，`config-types.ts:18-24`） |
| 状态      | `updateSymbol(nodeId, { states: newStatesDeclaration })` → working copy `node.states`（`ScadaStateDeclaration`，`config-types.ts:37-49`）                   |
| 动画      | `updateSymbol(nodeId, { animations: newAnimationsArray })` → working copy `node.animations`（`ScadaAnimation[]`，`config-types.ts:28-35`）                  |
| 事件      | `updateSymbol(nodeId, { events: newEventsArray })` → working copy `node.events`（`ScadaSymbolEvent[]`，`config-types.ts:56-59`）                            |

写入经句柄入 undo 栈（E2.4 落点），不直接调 `engine.applyDiff`（编辑会话模型维护）。

## 5. 字段分类（六类）

> 对齐 `editor-initiation.md §2.1` 属性面板边界：六类字段覆盖几何/样式/绑定/状态/动画/事件声明编辑。每类对应 config-types.ts 的不同字段区域。

| 类别（group） | i18n key 后缀      | 包含字段（schema key）                                                                                                                                   | widget 提示                                                                                                                                                                        |
| ------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **geometry**  | `.group.geometry`  | `x`, `y`, `width`, `height`, `rotation`, `scale`, `visible`, `opacity`                                                                                   | number-input / switch（visible）/ slider（opacity 0..1）                                                                                                                           |
| **style**     | `.group.style`     | `fill`, `stroke`, `strokeWidth`, `strokeDash`, `dashOffset`, `fillStyle`, `shadow`, `text`, `textColor`, `textSize`, `fontFamily`, `fontWeight`, `align` | color-picker（fill/stroke/textColor）/ number-input（strokeWidth/textSize）/ text-input（text/fontFamily）/ select（align/fontWeight）/ json-editor（fillStyle/shadow/strokeDash） |
| **binding**   | `.group.binding`   | 虚拟字段：`bindings`（`ScadaBinding` map，`config-types.ts:18-24`）                                                                                      | json-editor（声明结构编辑器，§7）                                                                                                                                                  |
| **state**     | `.group.state`     | 虚拟字段：`states`（`ScadaStateDeclaration`，`config-types.ts:37-49`）                                                                                   | json-editor（声明结构编辑器，§7）                                                                                                                                                  |
| **animation** | `.group.animation` | 虚拟字段：`animations`（`ScadaAnimation[]`，`config-types.ts:28-35`）                                                                                    | json-editor（声明结构编辑器，§7）                                                                                                                                                  |
| **event**     | `.group.event`     | 虚拟字段：`events`（`ScadaSymbolEvent[]`，`config-types.ts:56-59`）                                                                                      | json-editor + action-editor（M3 工具箱 E9 完整落地，M1 走 json-editor）                                                                                                            |

**只读字段**（不入六类，固定展示在面板顶部）：`id`（widget=readonly）、`type`（widget=readonly，图元类型，不可编辑）。

**字段可见性**：

- `text`/`textColor`/`textSize`/`fontFamily`/`fontWeight`/`align`：仅 `scada-text` 等含文本图元显示（经 `visibleWhen` 或图元定义 props 显式声明）；
- `flow`/`dashOffset`：仅 `scada-pipe`/`scada-pipe-junction` 显示（管道族）；
- `connections`（custom.connections）：仅 `scada-pipe-junction` 显示（E2.3 连线设计落点）。

**字段顺序**：组内按 schema key 顺序（图元定义声明的字段顺序），新增字段自动追加。

## 6. 编辑期校验衔接 runtime validate 面（runtime 复用点 #4）

### 6.1 校验调用契约

**单源校验**：属性面板编辑后调用 runtime `validateScadaConfig(workingConfig): { ok: true } | { ok: false; errors: string[] }`（`serialization/validate.ts`，`design-renderer.md §4.3`）。

```typescript
// 面板编辑后（写入 working copy 前/后均可，建议写入后即时校验）
const result = validateScadaConfig(session.workingConfig);
if (!result.ok) {
  // 解析 errors，定位到字段（error 含 scope path 如 'symbols[3].fill'）
  // 在对应字段下方显示红色错误提示 + tooltip
  setFieldErrors(parseFieldErrors(result.errors));
}
```

### 6.2 客户端前置校验（widget 级，可选）

除了 runtime validate.ts 的整树校验，面板可在 widget 级做前置 UI 反馈（即时，不等整树 validate）：

| widget       | 客户端前置校验（基于 entry）                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| number-input | `Number.isFinite`（NaN/±Infinity 拒绝，对齐 `validate.ts` `Number.isFinite` 检查）+ min/max 范围（entry.min/max） |
| color-picker | 颜色字符串格式（`#rrggbb` / `#rgb` / `rgb(...)` / `rgba(...)` / 命名色，对齐 leafer 接受的 CSS 颜色）             |
| slider       | min/max 范围 + step 离散化                                                                                        |
| select       | enum 必须命中                                                                                                     |
| combobox     | 引用必须存在（如 point-ref 的 pointId 必须在 `workingConfig.variables` 中声明，对齐 validate.ts 点表声明校验）    |
| json-editor  | JSON 语法（必须可解析）+ 形状校验（如 bindings 的 ScadaBinding 形状，对齐 validate.ts 内部结构校验）              |

**客户端前置校验 ≠ 权威校验**：最终校验仍走 `validateScadaConfig`（防止 widget 级规则与 runtime validate 漂移，R3 类风险）。

### 6.3 错误反馈 UI

- 字段级错误：字段下方红色文本 + tooltip（经 i18n key `industrial.scada.editor.validation.<code>`）；
- 错误码映射：runtime `SCADA_ERROR_CODES`（`design-renderer.md §8.5`）已注册 `config-parse`/`config-invalid`/`config-build-failed` 等，面板复用同一错误码注册表（不新建第二套）；
- 错误定位：`validate.ts` errors 含 scope path（如 `symbols[3].fill`），面板解析后定位到对应字段（按 nodeId + field key 反查）。

## 7. 绑定/状态/动画/事件只写声明结构（运行时装配零改动）

> 对齐 `editor-initiation.md §3` 复用点 #8：编辑器属性面板的绑定/状态/动画/事件声明编辑**只写声明结构**（config-types.ts 类型），运行时装配零改动。

### 7.1 四类声明结构（config-types.ts 类型）

| 类别 | config-types.ts 类型                                                                                                                                                                                                                                                                                 | 结构示例（声明结构）                                                                                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------- | ----------------- | ------------------------------------------------------------ |
| 绑定 | `ScadaBinding`（`config-types.ts:18-24`）：`{ point?: string; expression?: string; map?: Record<...>; scale?: ...; format?: string }`                                                                                                                                                                | `{ point: 'tank_level', scale: { k: 0.01, b: 0 }, format: '{:.2f}%' }`                                                                                                     |
| 状态 | `ScadaStateDeclaration`（`config-types.ts:37-49`）：`{ states: Record<string, ScadaStateDefinition>; ranges?: ...; booleanMap?: ...; valueMap?: ...; stateSource?: string }` + `ScadaStateDefinition`（`config-types.ts:51-54`）：`{ style?: ScadaSymbolStylePatch; animations?: ScadaAnimation[] }` | `{ states: { run: { style: { fill: '#0f0' } }, stop: { style: { fill: '#f00' }, animations: [{kind:'blink',period:500}] } }, booleanMap: { true: 'run', false: 'stop' } }` |
| 动画 | `ScadaAnimation[]`（`config-types.ts:28-35`）：`{ kind: 'rotate'                                                                                                                                                                                                                                     | 'blink'                                                                                                                                                                    | 'flow'                                                | 'move'; period?; from?; to?; when?: 'always'                    | {state}; loop? }` | `[{ kind: 'rotate', period: 2000, when: { state: 'run' } }]` |
| 事件 | `ScadaSymbolEvent[]`（`config-types.ts:56-59`）：`{ on: 'click'                                                                                                                                                                                                                                      | 'dblclick'                                                                                                                                                                 | 'hover'; action: unknown }`（action 为 ActionSchema） | `[{ on: 'click', action: { type: '...' /* ActionSchema */ } }]` |

### 7.2 编辑器只写声明，运行时装配零改动

**核心约束**：属性面板编辑四类声明时，**只生成/修改 config-types.ts 的声明结构**，**不调用** runtime 装配链（`bind-resolver`/`animator`/`event-bridge`/`use-scada-events.ts` 等）。运行时装配发生在：

1. **提交（save）后**：working copy 经 config 同步链触发下游 `scada-canvas` 重建 → runtime 装配链（`bind-resolver`/`animator`/`event-bridge`）按声明结构装配；
2. **预览模式（mode:'preview'）**：编辑器切换为运行态行为，Editor 卸载 + 装配链启用，按 working copy 装配（不修改 working copy）。

**装配链复用**（runtime，**禁止重复实现**）：

| 装配链                             | runtime 提供方（`packages/flux-renderers-industrial/src/`）                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| 点表 store + 三源解析              | `binding/point-store.ts`（`design-data-binding.md §4.1`）                                    |
| 绑定解析 + flux 求值               | `binding/bind-resolver.ts` + `binding/flux-eval.ts`（`design-data-binding.md §4.2`）         |
| 反向索引 + 脏属性收集 + 合帧       | `binding/reverse-index.ts` + `binding/dirty-collector.ts`（`design-data-binding.md §7`）     |
| 动画引擎（rotate/blink/flow/move） | `binding/animator.ts`（`design-data-binding.md §4.4`）                                       |
| 状态样式解析                       | `symbols/style-resolver.ts`（`design-symbols.md §10`）                                       |
| 事件声明索引 + 派发链              | `renderer/hooks/use-scada-events.ts` + `engine/event-bridge.ts`（`design-renderer.md §8.2`） |

### 7.3 编辑期不做预览动画/求值

- 绑定字段的 expression/flux 在编辑期**不求值**（仅声明结构校验，§6）；
- 状态样式在编辑期**不应用**到画布图元（仅在面板预览缩略图，可选 M3 工具箱 E9 落地）；
- 动画在编辑期**不播放**（仅声明结构校验）；
- 事件 action 在编辑期**不派发**（仅声明结构编辑 + ActionSchema 校验）。

**理由**：R5 双态隔离（编辑期不消费运行态行为）+ 性能（编辑期求值/动画/事件派发开销大且无价值，编辑会话只关心声明结构正确性）。

### 7.4 编辑期可选「即时预览」（M2 后可选项）

- 绑定字段的 static source 点值（`source: 'static'`）可在编辑期预览（仅静态值，无表达式求值）；
- 状态样式可在编辑期临时应用到选中图元（仅选中，非全画布）；
- 这些为 M2 后可选项（roadmap §2.1 备注），M1 不实现（避免编辑态运行态行为纠缠）。

## 8. 事件、动作与组件句柄能力

- 属性面板字段 onChange 经 `component:updateSymbol(nodeId, patch)` 句柄写入 working copy（`design-architecture.md §8.5`），不入事件派发链；
- 字段级错误反馈为 React local state（不进 scope）；
- 面板不派发 schema 级事件（onSessionChange 等由 updateSymbol 句柄内部派发，对齐 `design-architecture.md §8.1`）。

## 9. 数据源、表达式、导入能力接入点

- 面板**不直接接数据源**：绑定字段的 pointId 引用是声明（仅在 point-ref widget 选择时列出 `workingConfig.variables` 中的点表声明，不订阅 scope）；
- 表达式编辑：expression/flux 字段经 json-editor 或 text-input 编辑声明字符串（不求值）；
- i18n：字段 label/description/group 名/error message 经 `flux-i18n` 解析（复用 runtime 错误码注册表 `SCADA_ERROR_CODES` + i18n key 映射）。

## 10. 样式与 DOM marker 约定

- 面板 DOM regions 使用 `@nop-chaos/ui` 既有样式体系（Field/Input/Select/Combobox 等，AGENTS.md「UI Component Usage」）；
- 根容器 marker（架构层声明）：`nop-scada-editor-inspector` + `data-slot="scada-editor-inspector"`；
- 字段错误反馈样式：复用 `@nop-chaos/ui` Field 组件的 error 状态（不新增 token 命名空间，对齐 runtime design-renderer.md §10 + `new-renderer-introduction-audit.md §3F`）；
- 主题独立性：面板 DOM 走 CSS 变量 + 稳定 class 名（不引入 React ThemeProvider，roadmap Cross-Cutting + runtime design-renderer.md §10）。

## 11. 实现拆分建议（设计期契约，完整拆分属 E5.3）

```
packages/flux-renderers-industrial-editor/src/   （方案 B；E4.1 裁定最终归属）
OR packages/flux-renderers-industrial/src/editor/（方案 A）
├── inspector/
│   ├── schema-extractor.ts      # extractPanelFields(definition) → PanelFieldGroup[]（纯逻辑单测先行）
│   ├── field-errors.ts          # parseFieldErrors(validateErrors) → 字段级错误映射（纯逻辑单测）
│   ├── inspector-field.tsx      # 单字段 UI 组件（按 widget 渲染，复用 @nop-chaos/ui）
│   └── inspector-panel.tsx      # 属性面板根组件（消费 runtime.session 选中图元 + extractPanelFields；分组折叠内聚于本组件，无独立 panel-group 模块）
└── （编辑器主 renderer / 适配层 / 编辑会话模型 等，见 design-architecture.md §11）
```

- 拆分依据：`renderer-implementation-guidelines.md` Case 4（schema 抽取为域核心，纯逻辑单测先行；panel UI 组件为 React 视图结构层）。
- 实现阶段映射：E4.1（包结构裁定）→ E4.2（注册空壳）→ E5.3（属性面板实现，扩展 `ScadaSymbolPropSchemaEntry` + 24 内置图元补全 editor hints + inspector UI）。

## 12. 风险、取舍与后续阶段

### 12.1 R3 双维护风险（已规避，§4.4）

| 风险路径            | 本档防护                                                                |
| ------------------- | ----------------------------------------------------------------------- |
| 双 schema 漂移      | **单源化**：面板直接读 `definition.props`，无第二套 schema（§4.1/§4.4） |
| widget 与 type 漂移 | widget 缺省按 type 推导，自定义 widget 显式声明（§4.4）                 |
| 默认值双源          | defaults 为权威源，entry.defaultValue 为 fallback（§4.4）               |
| validate 双源       | validate.ts 单一事实源，widget 前置校验非权威（§6）                     |

### 12.2 风险与取舍

- **24 内置图元 editor hints 补全工作量**：E5.3 实现期需对 24 定义逐个补全 `group`/`label`/`widget`/`description` 等 editor hints（M1 工作量 L 档，对齐 editor-initiation §5.1）；本档不预判具体字段内容（设计期契约）。
- **ActionSchema 编辑器复杂度**：事件 action 的 ActionSchema 编辑器复杂（M3 工具箱 E9 完整落地），M1 走 json-editor（声明结构 JSON 编辑）作为 fallback；本档声明 widget=action-editor 为目标态。
- **第三方扩展兼容**：新增 `ScadaSymbolPropSchemaEntry` 字段全部 optional，第三方图元定义无需改动即可继续工作（runtime 装配不读新字段，§4.2）。
- **架构冲突记录**：若 E5.3 实现期发现 schema 抽取与 runtime `validate.ts` 字段集不一致（如新字段未在 validate 注册），按 plan Failure Paths `design-contract-conflict` 记录并修正 validate.ts（属 runtime mission 同步，本档不预改）。

### 12.3 后续阶段

| 阶段 | 内容                                                                                                        |
| ---- | ----------------------------------------------------------------------------------------------------------- |
| E2.6 | renderer 契约（消费本档 inspector region 契约 + schema 抽取 API）                                           |
| E3   | 设计 gate（独立 plan，6 份设计文档终轮复核）                                                                |
| E4.1 | 包结构裁定（消费 design-architecture.md §4.4 trade-off）                                                    |
| E4.2 | 注册 `scada-editor-canvas` 空壳 + 引入依赖                                                                  |
| E5.3 | 属性面板实现（扩展 `ScadaSymbolPropSchemaEntry` + 24 内置补全 editor hints + inspector UI + validate 衔接） |
| E9   | 工具箱完整（ActionSchema 编辑器 M3 落地）                                                                   |
