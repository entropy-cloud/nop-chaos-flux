# 数据源/表达式绑定面板设计 design-binding-panel.md

> 日期：2026-09-26
> 版本：v1（plan 522 / L5.3，gap audit `docs/analysis/2026-09-26-scada-designer-demo-gap-audit.md` §4.3 D1）
> 上游：`design-property-panel.md`（§4.2 widget 契约 + §7 声明结构写入语义）、`design-architecture.md` §9（编辑器不接数据源接入点）、gap audit §2.4（inspector 现状：binding/state/animation/event 四类均 json-editor fallback）
> 下游：`packages/flux-renderers-industrial/src/editor/inspector/`（binding-panel.tsx 落地）、`symbols/symbol-types.ts`（widget 枚举扩展）

## 1. 组件定位

- 本档定义 inspector 属性面板对 **binding/state 两类声明字段**的结构化编辑契约（D1）。现状四类虚拟字段（`bindings`/`states`/`animations`/`events`）全部经 `inspector-field.tsx` 的 `json-editor` textarea 裸 JSON 编辑——无结构化点表选择、无表达式编辑分离、无点引用存在性反馈。
- 本档**只升级 binding/state 两类**为结构化编辑面；`animations`/`events` 维持 json-editor（event 的 ActionSchema 结构化编辑器归 L5.8 O1，明确 Non-Goal；animation 需求未立）。
- 消费管道复用：编辑面板只写**声明结构**（`config-types.ts` 的 `ScadaBinding` / `ScadaStateDeclaration`），不触碰 runtime 装配链（`bind-resolver`/`point-store`/`animator` 零改动，`design-property-panel.md` §7.2 纪律不变）。运行态消费这些声明的完整管线见 `design-data-binding.md`。

## 2. 面板 schema 契约

### 2.1 widget 枚举扩展（`symbols/symbol-types.ts`）

`ScadaPropEditorWidget` 新增两个 editor-only widget 值：

| widget           | 消费字段                                              | 结构                     |
| ---------------- | ----------------------------------------------------- | ------------------------ |
| `binding-editor` | 虚拟字段 `bindings`（`Record<string, ScadaBinding>`） | 逐属性行编辑（§3.1）     |
| `state-editor`   | 虚拟字段 `states`（`ScadaStateDeclaration`）          | 状态声明结构化面（§3.2） |

- 与既有 `point-ref`/`action-editor` 枚举值的关系：`point-ref` 是**单字段**点引用 widget（第三方图元定义可用）；`binding-editor` 是 `bindings` **整张声明表**的结构化编辑面。二者不互斥，均不改变 runtime 装配（装配链不读 `widget` 字段，`design-property-panel.md` §4.2 扩展原则 3）。
- `schema-extractor.ts` 的 `injectVirtualField` 注入变化：`bindings` → `binding-editor`、`states` → `state-editor`、`animations`/`events` → 维持 `json-editor`。

### 2.2 点表引用源

- 点引用候选集 = `workingConfig.variables: ScadaPointDeclaration[]` 的 `id` 集（权威源 = working copy，编辑态不订阅 scope、不接外部数据源，`design-architecture.md` §9 纪律不变）。
- 候选集经 `inspector-panel.tsx` 从 `runtime.session.workingConfig.variables` 派生，向字段渲染层传递 `pointIds: string[]`。
- 点引用控件 = `Input` + `list` datalist（原生 combobox 语义：可输入自由 id，也可从候选下拉选择）。自由输入是合法路径（声明先行：变量表稍后补声明），但存在性反馈见 §5。

## 3. UI 契约

### 3.1 binding-editor（`node.bindings` 结构化编辑）

逐绑定行模型（draft，提交时折叠回 `Record<string, ScadaBinding>`）：

```
┌──────────────────────────────────────────────────────────┐
│ [property ▾ select]  [来源: 点|表达式|无 ▾]  [移除]        │
│   点引用   [Input list=pointIds datalist]  （mode=点 时）  │
│   表达式   [Textarea rows=2]               （mode=表达式时）│
│   高级     [Textarea rows=2 JSON：map/scale/format]        │
└──────────────────────────────────────────────────────────┘
[+ 添加绑定]
```

- **property**：`NativeSelect`，选项 = `BINDABLE_PROPERTIES`（`binding/bind-resolver.ts` 常量，单一事实源）∪ 该节点 `bindings` 已声明的非标准 key（防第三方扩展属性丢失）。重复 property 的行在提交时后行覆盖前行（与对象字面量语义一致）。
- **mode 三态**：`point`（仅 `binding.point` 生效）/ `expression`（仅 `binding.expression` 生效）/ `none`（空绑定占位行，提交时跳过）。**point 与 expression 互斥写入**——一次编辑只写选中 mode 对应的键，另一键不落进声明（消除现 json-editor 时代 point/expression 并存歧义）。
- **高级 JSON**：`{ map?, scale?, format? }` 三键的紧凑编辑面（本档不做 map 值映射表格化/量程换算表单化——需求未立，JSON 面已比裸整表编辑收敛）。parse 失败时该行显示 field-error 且**不提交**该行高级键（行级隔离，不阻断其它行提交）。
- 行增删：`+ 添加绑定` 追加空行；行内 `移除` 删除该行（提交时即从声明对象删除该 property）。

### 3.2 state-editor（`node.states` 结构化编辑）

```
状态驱动点 [Input list=pointIds]        （states.stateSource）
状态定义（逐状态行）：
  [状态名 Input] [定义 JSON Textarea：{style?,animations?}] [移除]
[+ 添加状态]
布尔映射  [true→Input] [false→Input]     （states.booleanMap）
高级     [Textarea rows=3 JSON：ranges/valueMap]
```

- `stateSource`：点引用控件（同 §2.2 语义；`config-types.ts` 格式 `"pointId"` / `"pointId.property"`，自由输入合法）。
- 状态名行：状态名自由输入（状态集是开放枚举，`style-resolver` 按声明消费）；定义 JSON 必须 parse 成功且为 object，失败显示行级 field-error 不提交该状态。
- `booleanMap`：true/false 两输入（对应状态名，自由输入）。
- `ranges`/`valueMap`：紧凑 JSON 面（本档不做区间表格化——需求未立）。
- 全部键缺省/空时提交 `undefined`（清空 `node.states`），与 json-editor 时代语义一致。

## 4. 写入语义

- 单一写入路径不变：`InspectorField.onChange(nextValue)` → `runtime.updateWorkingNode(nodeId, { bindings | states: nextValue })` → working copy + undo 栈 + `syncWorkingCopy`（`design-property-panel.md` §4.5 表）。
- draft → 声明的提交时机：任一控件变更即尝试整表提交（行级失败只剔除失败行，不阻断其它行）。与 `JsonEditorField` 相同的「parse 成功才提交」纪律（plan 2026-08-08-0900-1 / P2 #6 语义继承）：**非法输入永不写裸字符串/半成品对象进 working copy**。
- 外部值同步：沿用 JsonEditorField 的「render 期 derived state + selfUpdate flag」模式——自身提交的 canonical 回写不打断正在输入的 draft；外部变更（undo/load/其它面板）重置 draft。

## 5. 校验

- **前置 UI 反馈（本面板）**：点引用值非空且不在 `pointIds` → 行内黄色/红色提示（`industrial.scada.editor.inspector.binding.unknownPoint`）；**不阻断提交**（声明先行合法，validate 最终裁决）。
- **权威校验（不变）**：`validateScadaConfig(workingConfig)` 单一事实源（`serialization/validate.ts`），inspector 既有 `fieldErrors` 通道照常工作——面板不新建第二套规则。

## 6. i18n

新增键（zh/en 双语，`flux-i18n` locales `industrial.scada.editor.inspector.*`）：

| key 后缀                             | zh                            | en                               |
| ------------------------------------ | ----------------------------- | -------------------------------- |
| `inspector.binding.property`         | 属性                          | Property                         |
| `inspector.binding.source`           | 来源                          | Source                           |
| `inspector.binding.sourcePoint`      | 点                            | Point                            |
| `inspector.binding.sourceExpression` | 表达式                        | Expression                       |
| `inspector.binding.sourceNone`       | 无                            | None                             |
| `inspector.binding.point`            | 点引用                        | Point ref                        |
| `inspector.binding.expression`       | 表达式                        | Expression                       |
| `inspector.binding.advanced`         | 高级（map/scale/format JSON） | Advanced (map/scale/format JSON) |
| `inspector.binding.addRow`           | + 添加绑定                    | + Add binding                    |
| `inspector.binding.remove`           | 移除                          | Remove                           |
| `inspector.binding.unknownPoint`     | 点未在变量表声明              | Point not declared in variables  |
| `inspector.binding.empty`            | 无绑定声明                    | No bindings                      |
| `inspector.state.stateSource`        | 状态驱动点                    | State source                     |
| `inspector.state.statesList`         | 状态定义                      | State definitions                |
| `inspector.state.addState`           | + 添加状态                    | + Add state                      |
| `inspector.state.stateKey`           | 状态名                        | State key                        |
| `inspector.state.stateDef`           | 定义（JSON）                  | Definition (JSON)                |
| `inspector.state.booleanMap`         | 布尔映射                      | Boolean map                      |
| `inspector.state.advanced`           | 高级（ranges/valueMap JSON）  | Advanced (ranges/valueMap JSON)  |
| `inspector.state.remove`             | 移除                          | Remove                           |
| `inspector.state.empty`              | 无状态声明                    | No state declarations            |

## 7. 实现拆分

```
packages/flux-renderers-industrial/src/editor/inspector/
├── binding-panel.tsx        # BindingEditorField + StateEditorField（新增）
├── binding-panel.test.tsx   # focused 单测（新增）
├── inspector-field.tsx      # widget 路由 + pointIds 透传（修改）
├── inspector-panel.tsx      # pointIds 派生 + 透传（修改）
└── schema-extractor.ts      # injectVirtualField widget 变更（修改）
packages/flux-renderers-industrial/src/symbols/symbol-types.ts   # widget 枚举扩展（修改）
```

## 8. 非目标

- **ActionSchema 事件动作编辑器**（event 类）→ L5.8 O1（demand-gated，需先补设计）。
- `animations` 结构化面（period/from/to 表单化）→ 未立需求，维持 json-editor。
- map 值映射表格 / ranges 区间表格 / 量程换算表单 → 本档以紧凑 JSON 面覆盖，表格化属后续增强。
- 编辑期求值/预览 → `design-property-panel.md` §7.3 纪律不变（编辑态不消费点表绑定，R5）。

## 9. 自检记录（设计 → 实现前置 gate）

| 核对项                                                    | 结论                                                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| widget 扩展零 runtime 装配影响（装配链不读 widget）       | PASS（`design-property-panel.md` §4.2 原则 3；`bind-resolver`/`animator` 无 widget 依赖） |
| 点引用权威源 = working copy variables（不订阅 scope，R5） | PASS（§2.2；与 `design-architecture.md` §9「编辑器不接数据源」一致）                      |
| 非法输入不写 working copy（继承 P2 #6 纪律）              | PASS（§4 提交时机；行级失败隔离）                                                         |
| point/expression 互斥写入（消除并存歧义）                 | PASS（§3.1 mode 三态）                                                                    |
| validate 单一事实源不破（无第二套规则）                   | PASS（§5）                                                                                |
| 写入路径复用 updateWorkingNode（不新开写通道）            | PASS（§4）                                                                                |
| animations/events 维持 json-editor（O1 边界不越）         | PASS（§1/§8）                                                                             |
