# Schema 子树的嵌套递归分类：props 求值不应污染嵌套 schema（dropdown-button items 内嵌 openDialog body 被行 scope 求值）

> 日期：2026-08-02
> 范围：nop-chaos-flux 运行时/编译器
> 起因：跨项目联调中发现 host（nop-chaos-next）编辑提交**旧值**的 bug，根因定位到 dropdown-button 的 items（props 字段）内嵌 openDialog body 在行 scope 下被表达式求值污染。

---

## 第 1 轮

### 用户原始表述

（用户原话大意）

> 这种不应该是嵌套递归来判断的吗？也就是 item 也有自己的 schema，然后判断到一个子部分就知道该子部分应该怎么处理？

### AI 复述

用户的核心观点是：**编译/求值机制应当对任何"子部分"做递归的 schema 识别与分类**。即：

1. 遇到一个子对象时，先判断它**是不是 schema**（或 schema 的组成部分）；
2. 如果是 schema，就按 schema 的语义处理（**保持模板、不求值**，其字段再按各自分类递归下去——event 保持模板、region 递归、value 按值处理）；
3. 只有确认是**数据**（普通值）时才做表达式求值。

这要求把"识别 schema 子树"从"顶层特判"（现有 `evaluateSurfaceArgs` 的 `isSchema` 顶层覆盖）提升为**编译/求值过程中的通用递归机制**——每个节点都自带"身份"，机制走到哪里都知道该子部分应该怎么处理，而不是靠调用方逐层特判兜底。

### AI 分析

#### 1. Bug 根因链（本讨论的背景事实，已通过跨项目联调验证）

- host 真实 schema 的编辑按钮位于 **`dropdown-button` 的 `items`**（`columns[8].buttons[1]`，items 元素是 button item schema，其 `onClick` 是 openDialog，args.body 是 form schema）。
- **普通按钮（页面 body / operation 列）的 `onClick` 是"事件字段"**：node-compiler 用 `classifyField` 识别为 `event` → 单独编译进 `eventPlans` → 渲染时经 `node-renderer-resolved` 事件处理器 dispatch **预编译产物（保持模板）** → 提交时 `submitAction` 的 `${field}` 才用 form 实时 scope 求值 → **正确**。
- **dropdown-button 的 `items` 是"值字段"（props）**：node-compiler 对非 region/event 字段统一走 `compileValue`（表达式编译）→ **items 里的 `onClick.args.body`（form schema）被当作普通对象编译**，`${nickName}` 编译为 dynamic 表达式 → 渲染时 `resolveNodeProps`（node-runtime.ts）用**行 scope** 对 dynamic props 求值 → `onClick.args.body.submitAction.args.data` 被行数据求值（`nickName: 'RowNick'`）→ dropdown 点击 dispatch 已污染的原始 action → openDialog body 旧值 → submitAction 编译产物静态化为旧值 → **提交旧值**。
- **playground / 单测为什么没复现**：它们的按钮 onClick 都是事件字段（不经过 props 求值）；且 playground 未注册 layout renderers，dropdown-button 编译时被 registry 过滤（buttons 区域为空数组），该路径在 flux 项目内从未被渲染覆盖。在 playground 注册 layout renderers 并把行按钮改成 dropdown-button items 后**已复现**（提交 `RowNick` 旧值）。

#### 2. 现有机制的"分类"基础已经存在，但只覆盖了 schema 顶层

- `classifyField(renderer, key)`（schema-compiler/fields.ts）已经按 renderer 字段元数据把顶层字段分成：`region` / `event` / `reaction` / `value-or-region` / `ignored` / `meta`。
- `compileNode`（node-compiler）据此**只对 region/event 做递归/独立处理，其余统一 `compileValue`**。
- `evaluateSurfaceArgs`（built-in-actions.ts）对 openDialog args 先整体 evaluate，再对**顶层** `isSchema(body)` 的字段用原始值覆盖——这是"特判式"的豁免，**不覆盖嵌套**（如 items 元素里的 onClick.args.body）。

#### 3. 问题的本质

**`compileValue` 是"纯表达式编译器"，不认识 schema**。它递归遍历对象时不会停下来识别"这是 schema、这是 item、这是 action args"——`${field}` 一律编译成表达式，求值时统一用当前 scope 求值。而 schema 子树（body/items 里的 action args）恰恰**不该在此时求值**：它们是"待渲染的 schema 模板"，其表达式应在各自的事件/提交时机（form scope、行数据之外）求值。

用户提出的"嵌套递归判断"正是修复方向：**编译（或求值）遇到任意子对象时，先判断它是否是 schema（isSchema：有 type 字段），是则切换到 schema 编译模式（按 renderer 字段分类递归：event → 保持模板、region → 递归 schema、value → 按值处理），否则才按普通数据编译表达式**。

#### 4. 两条可选实现路线（待澄清）

**路线 A：编译期递归识别 schema 子树（推荐）**

`compileNode` 在编译 value 字段时递归检测 `isSchema` 的子对象：

- 遇到 schema → 用 `compileSchemaToTemplateNodes` / `createCompileSingleNode` 递归进入 schema 编译（item 的 `onClick` 被分类为 event → 保持模板；`args.body` 是 schema → 递归保持）。
- 这样 `items` 里的 openDialog body 在编译期就被"归档"为 schema 子树（不进表达式编译），渲染期 `resolveNodeProps` 不会求值它，dropdown 点击时 dispatch 的 action args 仍是模板 → 提交时用 form 实时 scope → 正确。
- 语义与现有顶层机制（region/event 分类）完全同构，是"分类的递归化"。

**路线 B：求值期恢复模板**

`resolveNodeProps`（或 props 求值后）对结果里的 schema 子树（items 的 onClick.args.body）用原始值覆盖（类似 evaluateSurfaceArgs 的顶层恢复，但递归化）。改动集中在求值层，但需要"恢复模板"与"编译产物"的双份维护，且求值已经发生（浪费 + 污染风险仍在编译产物层面）。

**路线 C：特例豁免 dropdown-button**

只让 dropdown-button 的 items 不求值。改动最小但违背通用性原则——任何"props 里嵌 schema"的 renderer（picker 的 pickerSchema、tree-select 的 source 等）都会踩同样的坑。

### 待澄清问题

1. **路线选择**：修复落点更倾向 A（编译期递归识别 schema 子树，分类递归化）还是 B（求值期递归恢复模板）？我推荐 A，因为它是"分类机制的递归化"，与现有 region/event 分类同构，且从源头杜绝污染。
2. **schema 子树的编译产物语义**：递归进入 schema 编译后，item 的 `onClick` 应编译成"事件模板"（类似 eventPlans，dispatch 时才编译/求值）还是"原样模板"（renderer 拿到原始 schema 自行处理）？dropdown-button 目前是 renderer 直接取 `item.onClick` 原始 action dispatch 并依赖 dispatch 时的 `normalizeCompiledActionProgram` 编译——是否需要改为渲染期预编译（像 node-renderer-resolved 那样）？
3. **递归深度与范围**：识别应基于 `isSchema`（有 `type` 字段即视为 schema）还是需要更细的"动作参数容器"（action args 的 body/children 等键）？items 数组元素是 schema 但 items 本身不是 schema——递归判断的粒度如何定义？
4. **表达式保留方式**：schema 子树内若确实需要依赖外层 scope 的表达式（如 `title: '编辑-${nickName}'`），编译期保持模板后这些表达式何时求值？是否需要"惰性模板"（保留表达式 AST，渲染时按当前 scope 求值）？
5. **影响面**：除 dropdown-button 外，还有哪些 renderer 的 props 里嵌 schema 子树（picker 的 pickerSchema、select 的 source、tree 的 children 等）会受益于该机制？是否需要一并纳入契约测试？
6. **回归测试**：是否将"CRUD 行内 dropdown-button items 的 openDialog 编辑提交"补为正式测试场景（playground 需先注册 layout renderers）？

---

## 第 2 轮

### 用户回答

（用户原话大意）

> 那它不应该是 region 吗？

### AI 整理

用户指出：**嵌套 schema 子树的处理机制应该是现有的 region**——region 正是"schema 子树"的既有抽象（独立编译、保持模板、实例化时才按 scope 求值），而不是为这个问题发明新机制。

#### 1. 证据：region 机制已存在且被同类 renderer 使用

- **grid 的 `items`**（layout-renderer-definitions.ts:288-320）：`deepFields` → `nestedRegions: [{ key: 'body', regionKeySuffix: 'body', ... }]` + `extractNestedSchemaRegions`（把 item 里的 body 提取为独立 region，item 主体只剩非 schema 字段）。
- **wizard 的 `steps`**（同文件 :165-190）：step 的 title/body/actions 全部声明为 region。
- **tabs 的 `items`**（同文件 :424-431）：同样 nestedRegions 声明。

#### 2. dropdown-button 的定义与用法不符

dropdown-button 的 `items` 定义（layout-renderer-definitions.ts:608-615）：

```
items: {
  shape: { kind: 'array', item: { kind: 'unknown' } },
  description: 'Menu item collection (pure value prop, no nested regions). Each item: { label, action, disabled, destructive }.',
}
```

**明确写了 "no nested regions"**——但 host 真实 schema 的 item 是：

```json
{ "id": "row-update-button", "label": "编辑",
  "onClick": { "action": "openDialog", "args": { "type": "page", "body": { "type": "form", ... } } } }
```

**item 里带 action（openDialog），args.body 是 form schema**——定义与用法不符。renderer 代码（dropdown-button-renderer.tsx:43）也明确支持 `item.action ?? item.onClick` dispatch——能力在，定义没跟上。

#### 3. 深入：现成的 extractNestedSchemaRegions 也不够

`extractNestedSchemaRegions`（node-compiler-helpers.ts）只做**一层、按 key** 的判断：

```ts
const fieldValue = input.candidate[rule.key];
if (!isSchemaInput(fieldValue)) {
  continue; // ← 只认"直接是 schema"（有 type 字段）的值
}
```

对 dropdown item 而言：

- `onClick` 是 **action 结构**（`{ action: 'openDialog', args: {...} }`），**不是 schema**（无 `type`）→ 被跳过；
- `onClick.args.body`（form schema）**嵌套在 action 内部**，extractNestedSchemaRegions 不会递归进去。

**结论**：region 机制覆盖了"直接是 schema 的字段"（body/children/pickerSchema），但**没有覆盖"action 值"**（`onClick`/`action` 字段的值是 action schema）。而这正是本轮 bug 的缺口。

#### 4. 用户观点落地方案：把"嵌套递归判断"结构化

用户两次表述合起来，本质是**一个三分类的递归判断规则**，且与现有机制同构：

| 遇到的值                                    | 现有机制                      | 判断依据                           | 处理                                 |
| ------------------------------------------- | ----------------------------- | ---------------------------------- | ------------------------------------ |
| **schema 值**（body/children/pickerSchema） | region（已实现）              | `isSchemaInput`（有 type）         | 提取为 region，保持模板              |
| **action 值**（onClick/action 字段）        | **顶层 event 分类**（已实现） | `isActionSchema`（有 `action` 键） | **保持模板**，dispatch 时再编译/求值 |
| **普通值**（label/icon/disabled）           | value（已实现）               | 其余                               | `compileValue` 表达式求值            |

- 顶层已经有这套分类（`classifyField` 把 renderer 的字段分为 region/event/value），**缺的是把它递归化**：编译 value 字段时，递归检测子值是否为 schema 值/action 值，命中就按 region/事件语义处理，而不是一律 `compileValue`。
- 这样 dropdown-button 的 item 无需在渲染器里特判：item 的 `onClick` 是 action 值 → 保持模板；`onClick.args.body` 是 schema 值 → region 语义；`label` 是普通值 → 正常求值。**"判断到一个子部分就知道该子部分应该怎么处理"**即此意。

### 待澄清问题

1. **action 值的识别标准**：`isActionSchema` 如何定义——有 `action` 键且值为字符串？还是同时校验 `then`/`else` 分支？与 `classifyField` 的 event 判定（renderer fields 里声明 `{ key, kind: 'event' }`）如何统一——是否应该在编译层做"结构识别"（action 是自描述的，无需 renderer 声明）？
2. **action 值保持模板的编译产物形态**：是编译成"惰性 action 节点"（保留原始 action schema，dispatch 时经 `normalizeCompiledActionProgram` 编译，与现有未预编译 action 的 dispatch 路径一致）？dropdown-button 目前 dispatch 的是 `item.onClick` 原始对象并依赖 dispatch 时编译——保持模板后这条路径应该天然工作，对吗？
3. **schema 值的 region 化是否应自动化**：是否把 `extractNestedSchemaRegions` 的"按 key 声明"升级为"编译递归中自动识别 isSchemaInput 并 region 化"（无需 renderer 逐一声明）？还是维持"renderer 声明 nestedRegions"（grid/tabs 现状）+ 仅补 action 值识别？
4. **dropdown-button 定义修复**：至少应把 items 的字段定义从 "no nested regions" 修正（声明 action 支持），并给 item 的 onClick 走"保持模板"路径——是否一并补 layout-renderer-definitions 的 propContracts/region 声明？
5. **回归测试**：在 playground 注册 layout renderers 的前提下，"CRUD 行内 dropdown-button items 的 openDialog 编辑提交"作为正式测试场景，断言提交编辑值；另加单测覆盖"嵌套 action 值不被 props 求值污染"（compileNode 层）。

---

## 第 3 轮

### 用户回答

（用户原话大意）

> item 不应该具有自己的 schema，通过 schema 定义它的 onClick 是 event，从而获知它应该怎么处理吗？

### AI 整理

用户进一步明确：**嵌套 item 应该有自己的 schema 定义（字段元数据），通过定义声明它的 onClick 是 event 字段**——编译时遇到 item 即通过其 schema 定义获知各字段的处理方式（onClick → event → 保持模板），而不是靠"结构识别"（isActionSchema 启发式）或调用方特判。

#### 1. 现有基础：item 的类型与顶层 event 声明都已存在

- **item 的 TS 类型已存在**：`DropdownButtonItemSchema`（schemas.ts:205）声明了 `action?: ActionSchema | ActionSchema[]`、`label`、`disabled`、`destructive`、`key`。
- **顶层 event 声明机制已存在**：renderer 定义用 `fields: [{ key: 'onClick', kind: 'event' }]`（如 basic-renderer-definitions.ts:272）声明字段分类，`classifyField` 据此把 onClick 归为 event → 独立编译进 eventPlans → 保持模板。
- **嵌套 region 声明机制已存在**：`deepFields: [{ key: 'items', nestedRegions: [...], normalize }]`（grid/wizard/tabs 的 items）。

**缺的是"嵌套 item 的 event 字段声明"**：`RendererDeepFieldDefinition`（renderer-definition-types.ts:133）目前只有 `nestedRegions` / `booleanKeys` / `normalize`，**没有嵌套 event 规则**；dropdown-button 的 items 甚至连 deepFields 声明都没有（定义明确写 "no nested regions"）。

#### 2. 用户观点的落地结构

| 层             | 机制                                                                           | 现状                            |
| -------------- | ------------------------------------------------------------------------------ | ------------------------------- |
| 顶层字段       | `fields: [{ key: 'onClick', kind: 'event' }]` → classifyField → eventPlans     | ✅ 已实现                       |
| 嵌套 item 字段 | **item 的字段元数据声明 onClick/action 为 event**（deepFields 扩展或等价机制） | ❌ 缺失                         |
| 编译递归       | 遇 item（schema）→ 查其定义 → 按字段分类处理                                   | ❌ item 无定义时被当 value 编译 |

修复即把**声明驱动的字段分类从顶层递归到嵌套 item**：

- dropdown-button 的 items 声明 item 的字段元数据：`onClick`/`action` → event（保持模板）、`label` → value-or-region、`disabled`/`destructive` → value；
- 编译时按声明把 item 的 event 字段排除出 `compileValue`（保持模板），renderer dispatch 时（dropdown-button-renderer 的 `item.action ?? item.onClick`）拿到模板 action → 经 `normalizeCompiledActionProgram` 编译求值 → 正确。

这与顶层 event 的语义完全一致，是"schema 定义驱动"而非"结构启发式"——schema 是权威，编译按定义处理，**"判断到一个子部分就知道该子部分应该怎么处理"**即由定义保证。

#### 3. 遗留兼容问题

- host 真实 schema 的 item 用 **`onClick` 键**（`{ id, label, onClick }`），而 `DropdownButtonItemSchema` 声明的是 **`action`**——renderer 代码兼容两者（`item.action ?? item.onClick`），字段元数据声明也需要同时覆盖两者（或归一化）。
- item 目前**没有 type 字段**（非 `isSchema`）——"item 有自己的 schema"在编译期如何体现：通过父级 deepFields 声明（推荐，无需 item 带 type）还是要求 item 显式带 type？

### 待澄清问题

1. **声明载体**：嵌套 item 的 event 字段规则如何承载——扩展 `RendererDeepFieldDefinition`（新增 `nestedEvents?: readonly { key: string }[]`，与 nestedRegions 并列）？还是统一为"item 字段规则"（如 `itemFields`，能同时声明 region/event/value 分类）？
2. **item 是否要求显式 type**：编译递归识别 item 依赖"父级 deepFields 声明"（item 无需 type，兼容 host schema）还是"item 自带 type"（更自描述但 host schema 需后端改造）？我倾向前者（父级声明），与 grid/wizard/tabs 的 nestedRegions 模式一致。
3. **event 字段保持模板的产物**：item 的 onClick 保持模板后，编译产物形态是否就是"原始 action schema"（renderer dispatch 时经 `normalizeCompiledActionProgram` 编译）？与顶层未预编译 action 的 dispatch 路径（program-utils.ts:40 编译）是否天然一致？
4. **范围**：除 dropdown-button 外，哪些 renderer 的嵌套 item 也有 event 字段（wizard 的 steps 里若有按钮动作、picker 的 pickerSchema 等）——是否一并补声明？是否需要 compiler 层的"未声明 event 字段的自动保持模板"兜底（声明驱动为主、结构识别为辅）？
5. **回归测试**：单测覆盖"dropdown-button items 的 onClick 编译为模板（不进 props 表达式）"（compileNode 层断言）+ playground 场景断言提交编辑值。

---

## 第 4 轮

### 用户回答

（用户原话大意）

> 你注意一下，本质上是根据 type 来获取到 definition，这里也就是拥有 schema 校验能力，但是当某些控件内部具有内置的类似 region 的部分，但是缺少明确的 type 定义，这时就要把主控件的某个属性绑定到一个复杂 schema 上，支持嵌套验证和处理，编译和验证时都要参考这个 schema。这一点你明确吗？

### AI 整理

用户明确设计本质：**schema 的能力（校验 + 编译）统一围绕 `type → definition`**；对"控件内部内置的类 region 部分但缺少明确 type 定义"（dropdown item / wizard step / validate 回调），**主控件把属性绑定到一个复杂 schema**（等效隐含 type），**编译与验证都参考这个 schema**。

#### 1. 现状验证：type → definition 已是统一入口

- **校验**：`analyzeSchemaInput`（shape-validation-analyze.ts:66）——数组递归；对象**有 `type`** → `registry.get(type)` 取 definition 校验；对象**无 `type`** → 直接报错 `"Schema nodes require a non-empty type field"`；
- **编译**：`compileSchemaToTemplateNodes` 对 isSchema 节点取 definition 编译（region/event/value 字段分类）；
- **嵌套校验现状**：`analyzeDeepSchemaField`（shape-validation-deep-fields.ts）只遍历 nestedRegions 声明的字段，item 本身结构（label/action）无校验——dropdown item 实际违反"无 type 报错"，只是未开严格模式而未暴露。

#### 2. 用户方案落地

| 部分                           | 依据                              | 处理                                                                   |
| ------------------------------ | --------------------------------- | ---------------------------------------------------------------------- |
| 有 `type` 的节点               | `registry.get(type)`（已有）      | 编译 + 校验                                                            |
| 无 type 的内置嵌套部分（item） | **属性绑定 `itemSchema`（新增）** | 编译按 definition 分类字段（event → 保持模板）；校验按 definition 递归 |
| schema 子树（body/children）   | nestedRegions（已有）             | region                                                                 |
| 普通值                         | 其余                              | 表达式求值                                                             |

`RendererDeepFieldDefinition` 增加 `itemSchema?: string`；item schema 注册为可查找的 schema 类型（renderer 组件可空，纯元数据：fields 声明 action/onClick → event 等）。**编译与校验双路径参考同一 definition**，避免两套逻辑漂移。

### 待澄清问题

1. **itemSchema 的注册形态**：注册为独立 renderer（复用 `registry.get` 与 analyzeSchemaInput 递归）还是轻量字段规则集？倾向注册为可查找 schema 类型，与 type → definition 统一。
2. **显式 type 优先级**：item 自带 type 时以显式为准，无 type 时用绑定兜底——优先级与冲突诊断规则？
3. **校验对齐**：绑定 itemSchema 后，`analyzeSchemaInput` 的"无 type 报错"是否对绑定字段豁免（按绑定 definition 校验）？严格模式（**FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS**）下现有 dropdown schema 是否因此暴露更多诊断（需一并修复）？
4. **双路径一致性测试**：编译（字段分类）与校验（结构验证）共用 definition，是否需要契约测试锁定（如"fields 里声明 event 的字段，编译产物必须保持模板"）？

---

## 第 5 轮

### 用户回答

（用户原话大意）

> 首先 dropdown-item 不需要注册 render definition，items 是某个 render definition 的属性，在整个属性定义中直接指定一个 item 对应的 definition 不可以吗？然后根据它是 array 明确，这个实际上是 item 对应的 definition，或者区分对象的 definition 和 array 子对象的 definition，对于 map 是不是也要类似处理？你现在是这样处理的吗？对于 action 等，内置的每个类型都单独关联一个 renderer definition 是否就可以？

### AI 整理

用户明确修正设计方向：**item 的 definition 应内联在主控件的属性定义中，不注册独立 render definition**；按**容器形态**（array / object / map）自动确定 definition 的作用对象（数组元素 / 对象本身 / map 值）；action 等内置类型**每个单独关联一个 definition**。

#### 1. 现状验证：属性 shape 体系已具备递归容器结构

`FluxValueShape`（`flux-core/src/schema-diagnostics/manifest.ts`）已有：

- `FluxArrayShape`：`kind: 'array'; item: FluxValueShape` —— **数组元素的 shape**（"根据 array 明确 item definition"的载体已存在）；
- `FluxObjectShape`：`kind: 'object'; fields: Record<string, FluxValueShape>` —— 对象字段 shape；
- `FluxRecordShape`：`kind: 'record'; value: FluxValueShape` —— **map 的值 shape**（用户问的 map 载体已存在）；
- `matchesFluxValueShape`（`value-shape-runtime.ts:11-50`）已按 `array.item` / `record.value` / `object.fields` **递归校验**。

**缺的只是"schema 字段语义"**（event/region/value 分类）——现有 shape 只描述值类型（string/number/object…），`array.item: { kind: 'unknown' }` 是现状（items 无字段定义）。

#### 2. 用户方案落地：属性内联 definition

- **扩展 FluxValueShape 新增 `schema-definition` kind**（携带 `fields` 分类，复用 `SchemaFieldRule`）：

```ts
export interface FluxSchemaDefinitionShape extends FluxValueShapeBase {
  kind: 'schema-definition';
  fields: Readonly<Record<string, SchemaFieldRule>>; // event/region/value 分类
}
```

- **propContracts / deepFields 属性定义直接内联**：

```ts
items: {
  shape: {
    kind: 'array',
    item: {
      kind: 'schema-definition',
      fields: {
        action: { kind: 'event' },   // → 编译保持模板
        onClick: { kind: 'event' },  // 兼容 host 键
        label: { kind: 'value' },
        disabled: { kind: 'value' },
      },
    },
  },
},
```

- **容器形态自动确定**：`array.item` → 数组元素 definition；`record.value` → map 值 definition；`object.fields` → 对象字段 definition；
- **无需注册独立类型**：registry 放宽（前几轮的阻塞）**消失**——definition 跟随主控件声明，`registry.get(itemSchema)` 不再需要。

#### 3. 编译/校验消费

- **编译**（compileNode deepFields 分支）：属性 shape 含 `schema-definition` → 按 fields 分类——event 字段包 `__nopPreserveLiteral` envelope 保持模板；region 字段走既有 region 提取；value 字段表达式求值；
- **校验**：`matchesFluxValueShape` 增加 `schema-definition` case（按 fields 校验 + 消除"无 type 报错"）；action 值字段（`actionValue`）整值走 `validateActionShape`；
- **action 每个内置类型单独关联 definition**：`openDialog` / `ajax` / `submitForm` / `refreshNearest` 等各自一个 definition（fields 形态描述 args 字段分类：body → schema、onClose → action 等），替代前几轮"参数契约表"的松散形态——与 renderer definition 同构。

### 待澄清问题

1. **`schema-definition` shape 与 `actionValue` 的关系**：单 action 值字段（searchSource）用 `array.item`/`record.value`/`object.fields` 内联一个"action definition"（fields: { action: ..., args: ... }）还是独立 `actionValue` 标记？倾向：统一用 `schema-definition`（fields 里 action 键声明为 event 判别键），`actionValue` 作为便捷标记或省略。
2. **schema-definition 的 fields 消费方**：编译（compileNode）与校验（matchesFluxValueShape/validateFluxValueShape）都能消费同一 fields——是否需要复用 `classifyField`（按 renderer fields 分类）的既有实现？
3. **内建 action definition 的注册载体**：挂 `BUILT_IN_ACTION_REGISTRY` 旁（definition 表）还是独立常量？与 `classifyActionSelector`（按选择器解析）的关系？
4. **object 形态的 definition 应用**：`object.fields` 内联 definition 后，是"字段级"分类（每个字段按 rule）还是整体按 definition 处理？
5. **map（record）场景**：当前哪些 renderer 有 map 形态属性需要 value definition（如条件映射、字典映射）？

---
