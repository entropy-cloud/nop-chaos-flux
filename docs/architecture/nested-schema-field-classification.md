# 嵌套 Schema 字段的声明驱动分类（Nested Schema Field Classification）

> 状态：最终设计（v8 — 机制统一：schema-definition 为唯一嵌套分类机制，遗留 deepFields 机制删除）
> 日期：2026-08-02
> 关联讨论：`docs/discussions/2026-08-02-schema-subtree-recursive-classification.md`
> 适用范围：nop-chaos-flux 编译器 / 渲染器定义

---

## 1. 背景与问题

### 1.1 Bug：dropdown-button items 内嵌 openDialog 提交旧值

跨项目联调（nop-chaos-next host + 真实后端）发现：CRUD 行内"更多"下拉（`dropdown-button`）的"编辑"菜单项打开对话框编辑后，**提交的是行数据旧值**，而非表单编辑值。

根因链（已通过分层打点验证）：

1. host schema 的编辑按钮位于 `dropdown-button` 的 `items`（`columns[8].buttons[1]`），item 形如 `{ id, label, onClick: { action: 'openDialog', args: { body: { type: 'form', ... } } } }`；
2. **普通按钮**的 `onClick` 是**事件字段**（renderer `fields: [{ key: 'onClick', kind: 'event' }]` 声明）→ `classifyField` 归为 event → 编译进 `eventPlans` 保持模板 → 渲染期经 `node-renderer-resolved` 事件处理器 dispatch 预编译产物 → 提交时 `${field}` 用 form 实时 scope 求值 → **正确**；
3. **dropdown-button 的 `items` 是值字段（props）**：renderer 定义**有 `fields` 但无 `deepFields`**（`layout-renderer-definitions.ts:673-681` 仅声明 `items` 为普通 `prop`，items 描述为 "pure value prop, no nested regions"）→ 编译时 `compileNode` 对 items 走 `compileValue`（表达式编译）→ **item 里的 `onClick.args.body`（form schema）被当作普通对象编译**，`${nickName}` 编译为 dynamic 表达式；
4. 渲染时 `resolveNodeProps`（`packages/flux-runtime/src/node-runtime.ts:254`）对 dynamic propsProgram 用**行 scope** 求值 → `onClick.args.body.submitAction.args.data` 被行数据求值（`nickName: 'RowNick'`）→ 静态化；
5. 点击菜单项时 `dropdown-button-renderer.tsx:43` dispatch 已被污染的原始 action → openDialog body 旧值 → 提交旧值。

### 1.2 为什么测试没覆盖

- flux 单测与 playground 的行按钮 `onClick` 均为**事件字段**（不经 props 求值），路径天然正确；
- playground 未注册 `registerLayoutRenderers`，dropdown-button 在编译期被 registry 过滤——`compileSchemaToTemplateNodes` 对未注册类型**仅在 `diagnostics.enabled && continueOnError` 时返回空**，否则抛 `Renderer not found`（`schema-compiler.ts:161-167`）——该路径从未被渲染覆盖；
- 在 playground 注册 layout renderers 并把行按钮改为 dropdown-button items 后**已稳定复现**（提交 `RowNick` 旧值）。

### 1.3 机制缺口与现状

`FluxValueShape`（`flux-core/src/schema-diagnostics/manifest.ts:14-88`）已有递归容器结构（array.item/object.fields/record.value），`matchesFluxValueShape`（`value-shape-runtime.ts:11-62`）已按容器**递归校验**——但 shape 只描述**值类型**，**不携带 schema 字段语义**（event/region/value 分类）。现状 `array.item: { kind: 'unknown' }`（items 无字段定义）→ 编译时整值走 `compileValue` 表达式化 → 污染。

**现成载体**：`compileNode`（`flux-formula/src/compile/compile-node.ts:48-57`）对 `{ __nopPreserveLiteral: true, value }` envelope 短路为 static-node——**值原样保留、不表达式化**（wizard steps `disabled` 已是生产先例）。

**遗留机制（本设计取代）**：`RendererDeepFieldDefinition`（`renderer-definition-types.ts:103-108`）的 `nestedRegions`/`booleanKeys`/`normalize` 是嵌套结构的零散手工处理（region 提取靠 `extractNestedSchemaRegions` 手工调用、boolean 字面量 envelope 靠 normalize 手工包裹）——**与 schema-definition 职责重叠，最终设计将其整体取代并删除**（见 §3.6）。

### 1.4 现状确认：action args 的结构在编译/校验时均未被验证

| 层面                                                                   | 现状                                                                                                    | 证据                                                                                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **编译**（compileActions / compilePayload）                            | **完全不验证 args 结构**，只做表达式编译                                                                | `action-compiler.ts` compilePayload → compileValue                                                                              |
| **校验**（event 字段）                                                 | 只做浅校验：action 是对象、action 字段非空、args 是对象、action 选择器解析、ajax 的 `args.url` 是字符串 | `shape-validation-node-fields.ts:263`（event → validateActionShape 后 `continue`，不再递归）；`validateApiSchemaShape` 只查 url |
| **openDialog args 形状**（type/size/title/body）                       | **无校验**（TS 类型 `OpenDialogActionSchema` 仅编译期）                                                 | `BuiltInActionSchema`（actions.ts:246）无运行时定义                                                                             |
| **args.body（form schema）**                                           | **不被递归校验**（analyzeSchemaInput 不进入 action args）                                               | event 分支 `continue` 后不再递归                                                                                                |
| **ajax 的 method/data、submitAction/loadAction 的 args.data 字段形状** | **无校验**                                                                                              | validateApiSchemaShape 仅 url                                                                                                   |

**结论**：action args 内嵌套的 schema（openDialog 的 body）在编译期既不被识别（保持模板）也不被校验——与 dropdown item 是**同一类缺口的两个表现**：**无 type/无契约的内置嵌套结构，既无法编译分类也无法校验**。

---

## 2. 设计目标

1. **属性内联 schema definition**：主控件的属性定义（propContracts shape）直接内联嵌套部分的字段分类，不注册独立类型；
2. **容器形态自动确定**：`array.item`（数组元素）/ `record.value`（map 值）/ `object.fields`（对象字段）确定 definition 作用对象；
3. **统一字段分类词表**：顶层 `fields` 与嵌套 `fieldRules` 共用同一 `SchemaFieldKind` 词表；
4. **编译器自动化**：region 提取、字面量 envelope、action 保持模板均按 kind 自动处理——**取代 deepFields/nestedRegions/booleanKeys/normalize 手工机制**；
5. **编译与校验双路径**参考同一 definition，不漂移；
6. 内建 action **每类型一个 definition**。

## 3. 核心机制设计

### 3.1 本质：schema 能力围绕 definition 展开

- **渲染器**：`type` → renderer definition（`registry.get(type)`）——编译（字段分类）与校验（`analyzeSchemaInput`）统一入口；
- **属性嵌套部分**：在主控件的属性定义里直接内联 definition（`schema-definition` shape），容器形态由 shape 确定。

### 3.2 统一字段分类词表

顶层 `fields`（`SchemaFieldRule[]`）与嵌套 `fieldRules`（`Record<string, SchemaFieldKind>`）**共用同一词表**——`SchemaFieldKind` 扩展为：

```ts
export type SchemaFieldKind =
  | 'meta' // 元数据（不编译不求值）
  | 'prop' // 普通属性（表达式求值）
  | 'value' // 值字段（表达式求值；与 prop 语义一致，供嵌套词表使用）
  | 'region' // SchemaInput 子树 → 编译器自动提取 region
  | 'value-or-region' // 值或 schema（自动判别）
  | 'schema' // 单个 SchemaInput → 保持模板（envelope/region 语义）
  | 'schema-array' // SchemaInput[] → 保持模板
  | 'event' // ActionSchema | ActionSchema[] → 整值保持模板（envelope）
  | 'action' // 同 event（action 值语义）
  | 'literal' // 字面量保持（boolean/string 字面量不表达式化；取代 booleanKeys）
  | 'reaction' // 响应式 action 声明
  | 'ignored'; // 忽略
```

顶层 `fields` 继续用数组形态（`SchemaFieldRule[]`，含 regionKey 等扩展），嵌套 `fieldRules` 用 Record 形态——**同一 kind 词表、同一分类语义**。

### 3.3 schema-definition shape（属性内联）

```ts
export interface FluxSchemaDefinitionShape extends FluxValueShapeBase {
  kind: 'schema-definition';
  /** 嵌套字段词表（统一 SchemaFieldKind；支持字符串简写（kind 名）或
   *  SchemaFieldRule 对象形态（params/isolate/regionKey/required/valueType/nonEmpty）） */
  fieldRules: Readonly<Record<string, SchemaFieldRule | SchemaFieldKind>>;
  /** 该属性的整体值是一个 ActionSchema（单 action 值字段）——整值保持模板 */
  actionValue?: true;
}
```

**fieldRules 载体**：嵌套 `fieldRules` 复用统一 `SchemaFieldKind` 词表 + `SchemaFieldRule` 对象形态（`flux-core/src/types/schema.ts`）——`params`/`isolate`/`regionKey`（compiledKey 载体）与顶层 `fields` 同构（`SchemaDefinitionFieldKind` 独立词表已在机制统一时合并删除）。对象形态 `SchemaFieldRule` 携带取值约束（`required`/`valueType`/`nonEmpty`，表达式字符串豁免）与 region 载体（`regionKey`/`regionKeySuffix`/`sourceKey`/`params`/`isolate`）。顶层 `fields` 继续用数组形态（`SchemaFieldRule[]`），嵌套 `fieldRules` 用 Record 形态——分类语义同源。

**容器形态自动确定 definition 作用对象**：

| 容器 shape                               | definition 作用对象                             |
| ---------------------------------------- | ----------------------------------------------- |
| `array.item: schema-definition`          | **数组元素**（dropdown/button-group 的 items）  |
| `record.value: schema-definition`        | **map 的值**（`Record<string, Item>` 形态属性） |
| `object.fields.<key>: schema-definition` | **对象字段**（form `validate` 的嵌套结构）      |

**整值 vs 逐字段由显式标记决定**（不靠结构识别）：

| 标记                | 语义                                          | 字段示例                                                                                   |
| ------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `actionValue: true` | **整值保持模板**（整体值是一个 ActionSchema） | select `searchSource`、crud `quickSaveAction`、picker `loadAction`、form `validate.action` |
| 无 `actionValue`    | **逐字段分类**（按 fieldRules 处理每个字段）  | dropdown/button-group 的 items                                                             |

### 3.4 编译路径（按 kind 自动分类）

`compileSingleNode`（node-compiler.ts）**新增 `renderer.propContracts?.[key]?.shape` 查找**（含 array.item/record.value/object.fields 容器遍历，**不依赖 deepFields**——deepFields 机制整体删除后此管道是唯一嵌套处理入口）。命中 `schema-definition` 按**固定顺序**：

1. **先 region 提取**：`region`/`schema`/`value-or-region` kind 字段自动提取为 region（编译器内置，取代 `extractNestedSchemaRegions` 手工调用）——**必须先于 envelope 包裹**，否则 envelope 挡住 args.body；
2. **再按 kind 处理**：
   - `event`/`action` 字段（item 内）→ `__nopPreserveLiteral` envelope；
   - `actionValue: true`（整值 action）→ 整值 envelope；
   - `literal` 字段（如 wizard disabled）→ envelope（取代 booleanKeys 手工包裹）；
   - `region`/`schema`/`schema-array` → region 提取/保持模板；
   - `prop`/`value` → 表达式求值；
3. `onClick` 归一化到 `action`（编译层 merge；renderer 解包链对三种产物形态闭环）。

**产物形态与解包点**：envelope 在**嵌套位置不自动解包**（全静态 item 存含 envelope 原始对象，`compile-node.ts:146-162`）——**renderer 侧 `unwrapPreservedLiteral` 解包是必须新增的代码**（wizard/collapse 先例：`wizard-renderer.tsx:64`、`collapse-renderer.tsx:25`）。编译层不解包。

### 3.5 校验路径（按 kind 递归）

三处 shape 消费点同步扩展（漏一处即"一侧拒绝一侧放行"）：

1. `matchesFluxValueShape`（`flux-core/src/schema-diagnostics/value-shape-runtime.ts`，default false）；
2. `validateFluxValueShape`（`flux-compiler/src/schema-compiler/flux-value-shape-validation.ts:107`，default true；由 `shape-validation-node-fields.ts:57` 调用）；
3. `summarizeExpectedFluxValueShape`（同 :56）。

`schema-definition` case：按 `fieldRules` 校验；`actionValue` 字段走 `validateActionShape`（+ §3.7 内建 action definition）；`literal` 字段按字面量校验（取代 `booleanKeys`/`validateNestedBooleanFields`）。**包边界注**：`matchesFluxValueShape` 在 flux-core（无 validateActionShape），flux-core 侧需本地近似校验（isPlainObject + action 字符串键）。

#### 3.5.1 `analyzeSchemaInput` 主遍历的 kind 递归（schema 树统一递归入口）

除上述 shape 消费（schema-definition 内部 fieldRules 校验），`analyzeSchemaInput`（`shape-validation-analyze.ts`）还负责**整个 schema 树的递归遍历**——对每个节点先 `inspectSchemaNodeFields`（校验 fields，含 `event`→`validateActionShape`、`reaction`、`meta`、unknown-property 检测），再遍历子字段，按 `classifyField`（`fields.ts`）得到的 kind 决定是否递归进入子节点：

| kind                                                                  | 递归行为                                                                                |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `region`                                                              | 子节点（SchemaInput/SchemaInput[]）按 region 语义递归（`createRegionTraversalState`）   |
| `value-or-region`（且值是 SchemaInput）                               | 同 region 递归                                                                          |
| `schema-array` / `schema`                                             | 子节点（有 `type` 的 SchemaInput）按 child renderer 递归（`createChildTraversalState`） |
| `propContracts[key]` 声明 schema-definition shape                     | 走 `analyzeSchemaDefinitionField`（按 fieldRules / child renderer 递归，§3.3）          |
| `prop` / `event` / `reaction` / `meta` / `literal` / `ignored` / 其他 | 不递归（叶子值，或由独立校验路径处理）                                                  |

**编译/校验对称性**：编译路径（`node-compiler.ts` §3.4）对 `region`/`schema`/`schema-array` 都做 region 提取/保持模板；校验路径（`analyzeSchemaInput`）必须**同样递归**这三种 kind，否则"一侧编译一侧不校验"，嵌套 schema 的字段错误（未知属性、action 缺失等）会被静默放行。

#### 3.5.2 机制缺口修复：columns 不递归（2026-08-03）

`SchemaFieldKind` 早已定义 `schema-array`/`schema`（§3.2），但 `analyzeSchemaInput` 校验路径**只递归 `region`/`value-or-region`，漏了 `schema-array`/`schema`**。叠加 `DEFAULT_FIELD_RULES.columns`（`fields.ts`）原为 `kind:'prop'`——所有未显式声明 `propContracts.columns` 的 renderer（array-editor 等），columns 元素**完全不进校验**，column 内的 `onEvent`/action 字段错误被隐藏。

**实测后果**：ERP 采购订单 add 弹窗打不开。根因是 view.xml 的 gen-control 手写了 AMIS 格式 `onEvent: { change: { actions: [{ actionType: 'setValue' }] } }`（flux 用 renderer 显式声明的 `onChange`/`onClick`，值是单个 ActionSchema，不支持 AMIS 事件映射）。由于 columns 不递归校验，这个格式错误从不报错、也无 schema 路径，导致长时间定位（最终靠逐层二分到 column 的 onEvent）。

**修复**（统一机制，不每个组件单独处理）：

1. `analyzeSchemaInput`（`shape-validation-analyze.ts`）补全 `schema-array`/`schema` kind 的递归——对每个有 `type` 的元素按 child renderer `analyzeSchemaInput` 递归（`createChildTraversalState`）；
2. `DEFAULT_FIELD_RULES.columns`（`fields.ts`）kind 从 `'prop'` 改为 `'schema-array'`——让所有未显式声明 columns 的 renderer 自动递归校验列元素。

**效果**：array-editor/table 等的 columns 元素现在自动进入 `inspectSchemaNodeFields`，column 内的 `onEvent` 触发 `validateActionShape`，报 `invalid-action-shape`（路径如 `/columns/0/onEvent/action`），不再静默隐藏。renderer 显式声明的 `onChange` + flux `action` 格式合法不报错。

**待后续**（应用层，不在 flux 机制范围）：

- ERP view.xml 的 `onEvent`（AMIS 事件映射）+ `actionType`（253 处源文件）改为 flux 格式（`onChange` + `action`）；

**已落地（2026-08-04，plan 453）**：

- `classifyField` 正则 `/^on[A-Z]/`（`fields.ts`）已改为**显式声明驱动**：合法事件 = renderer.fields 声明 `kind:'event'` **∪** flux-core `COMMON_EVENT_FIELDS` 词表（onChange/onBlur/onFocus/onKeyDown/onKeyUp/onInput）；未声明/不在词表的 onXxx（如 AMIS 遗留 `onEvent`、拼写错误事件名）→ 落回 prop → 走 unknown-property 检测（closedModel/strictMode 下报错，带完整 schema 路径）。详见 `docs/plans/453-flux-event-field-explicit-declaration-and-validation-plan.md`。

### 3.6 机制统一：schema-definition 取代 deepFields（删除清单）

`RendererDeepFieldDefinition` 的三项职责全部被 schema-definition 取代：

| 遗留机制                                             | 取代方式                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `nestedRegions`                                      | `fieldRules` 的 `region`/`schema` kind（编译器自动提取）             |
| `normalize`（`extractNestedSchemaRegions` 手工调用） | 编译器按 kind 自动 region 提取                                       |
| `booleanKeys`（+ `validateNestedBooleanFields`）     | `fieldRules` 的 `literal` kind（编译器自动 envelope + 校验按字面量） |

**删除项**（实现落地后移除）：

- `RendererDeepFieldDefinition` 类型（`renderer-definition-types.ts`）；
- `deepFields` 声明（**7 处** renderer：tabs / wizard / grid / collapse / variant-field / table（含 `expandable.expandedRow` 第二项与 `label`）/ crud）→ 迁移到 propContracts.shape 内联 schema-definition；
- `shape-validation-deep-fields.ts`（`analyzeDeepSchemaField` 的 deepFields 分支）→ schema-definition 校验接管；
- `node-compiler.ts` 的 deepFields 分支（:297 附近 normalize/nestedRegions 处理）→ propContracts.shape 管道接管；
- `extractNestedSchemaRegions` 对外 API（region 提取逻辑保留为编译器内部工具，不再由 renderer 手工调用）；
- `validateNestedBooleanFields`（booleanKeys 校验）；
- `DEEP_FIELD_NORMALIZERS`（`flux-compiler/src/schema-compiler/tables.ts:223`，schema-compiler/index.ts:9 导出——随机制删除清理）。

### 3.7 内建 action definition

每个内建 action 类型单独关联一个 definition（`fieldRules` 形态），挂 `BUILT_IN_ACTION_REGISTRY`（`flux-core/src/constants.ts:18-34`，15 canonical + submit 别名）旁：

```ts
openDialog: {
  fieldRules: {
    body: 'schema',        // SchemaInput → 保持模板 + 校验递归
    actions: 'schema-array',
    data: 'prop',
    isolate: 'prop',
    onClose: 'action',     // → 整值保持
    onSubmitSuccess: 'action',
    onSubmitError: 'action',
    // title/type/size/... → host 透传（未知键放行）
  },
},
ajax: {
  argsRequired: true,      // args 必填（'ajax actions require args payload'）
  fieldRules: {
    url: { kind: 'value', required: true, valueType: 'string', nonEmpty: true }, // 非空字符串
    method: { kind: 'value', valueType: 'string' },
    data: { kind: 'value', valueType: 'object' },
    params: { kind: 'value', valueType: 'object' },
  },
},
```

**字段约束载体**——取值约束随 definition 声明，校验器消费（统一 `SchemaFieldRule`，`flux-core/src/types/schema.ts`；嵌套形态复用同一类型）：

```ts
export interface SchemaFieldRule {
  key?: string; // 顶层 fields 必填；嵌套 fieldRules 由 record 键提供
  kind: SchemaFieldKind; // 统一词表（顶层与嵌套共用）
  /** 字段必填（缺失报错） */
  required?: boolean;
  /** 取值形状约束——对表达式字符串（${...}）豁免（编译期类型未知，运行时求值） */
  valueType?: 'boolean' | 'string' | 'number' | 'object' | 'array';
  /** 字符串非空（配合 valueType: 'string'，如 url） */
  nonEmpty?: boolean;
  regionKey?: string; // 双语义：顶层 = region 键；嵌套 = compiledKey 载体
  regionKeySuffix?: string; // 嵌套 region 键后缀（缺省 = 字段键，可含点）
  sourceKey?: string; // 嵌套 plain-object 字段的 schema 叶子键
  params?: readonly string[]; // region 参数（pushRegionParamSymbols）
  isolate?: boolean; // region 作用域隔离
}
```

**fieldRules 记录值形态**：`Record<string, SchemaFieldRule | SchemaFieldKind>`（字符串简写 = kind 名）。

**校验语义（含表达式豁免）**：

- `required` → 缺失报错；
- `valueType` → 非表达式时类型校验（`${...}` 表达式字符串豁免——运行时求值，编译期类型未知）；
- `nonEmpty` → 非表达式时字符串非空。

**约束消费范围**：字段约束仅由 **schema-definition / action definition** 消费（声明驱动）；顶层 renderer `fields` 暂不消费约束（`valueType === 'boolean'` 既有用法不受影响）——避免顶层声明约束静默无效。

约束全部在 definition 声明，`validateActionShape` 按 definition 消费——`validateApiSchemaShape` 的 action 场景由此取代（source/data-source 场景保留）。

**覆盖清单以代码为双重锚**：`BUILT_IN_ACTION_REGISTRY`（16 canonical，含 refreshNearest 补正）**∪** `runBuiltInAction` switch（`flux-action-core/src/action-dispatcher/built-in-actions.ts`）。编译按 definition 分类 args 字段；校验按 definition 递归（`args.body` 走 analyzeSchemaInput；action 链继承既有递归 `shape-validation-rules.ts:278-326`）。ajax 的硬编码 args 分支已删除（definition 接管：argsRequired + fieldRules；`validateApiSchemaShape` 的 action 场景已移除，仅 source/data-source 场景保留），由 `docs/plans/2026-08-02-3-ajax-validation-migration.md`（Plan 3）执行完成（2026-08-02）。

**兑现边界（选项①，已选定）**：`evaluateSurfaceArgs`（`built-in-actions.ts:19-40`）只对顶层 isSchema 键原始值覆盖——`onClose`/`onSubmitSuccess` 是 action 结构（非 isSchema），在 dispatch scope 仍会被整体求值。**扩展 evaluateSurfaceArgs 对契约标注 action 类键做原始值保留**，契约测试锁定"onClose/onSubmitSuccess 不被 dispatch scope 求值"。

### 3.8 item 显式 type 语义

item 元素可显式带 `type`（完整支持）：**有 `type` → 按 `registry.get(type)` 的 definition 处理**（完整 renderer 语义：字段分类、region 编译）；**无 `type` → 按内联 schema-definition 处理**。两者互斥时（item 既带 type 又被父级声明 fieldRules）以显式 type 为准并 emit `conflicting-field-definition` 诊断（warning）。typed item 走 region 化会改变 props 形状——renderer 按 props 契约消费（现有 dropdown/button-group 用无 type item，不受影响）。**未注册的 type 值**（如 table column 的 `type: 'operation'`/`'fixed'`）回退到内联 fieldRules，不触发诊断。

### 3.9 与既有机制的关系

| 子部分                                         | 依据                                                       | 处理                                           |
| ---------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| 有 `type` 的节点                               | `registry.get(type)`（已有）                               | 编译 + 校验                                    |
| 无 type 的内置嵌套部分（item/map 值/对象字段） | **属性内联 `schema-definition`**                           | 编译按 fieldRules 分类；校验按 fieldRules 递归 |
| schema 子树（body/children）                   | fieldRules 的 `region`/`schema` kind（取代 nestedRegions） | 编译器自动 region 提取                         |
| action 值（onClick/action/searchSource/…）     | fieldRules 的 `event`/`action` kind / `actionValue`        | `__nopPreserveLiteral` envelope 保持模板       |
| 字面量（boolean/string 保护）                  | fieldRules 的 `literal` kind（取代 booleanKeys）           | envelope 自动包裹                              |
| 普通值                                         | `prop`/`value`                                             | 表达式求值                                     |

递归原则：**遇到任意子部分，按容器形态取到其 definition，按 definition 的字段分类决定处理方式**——"判断到一个子部分就知道该子部分应该怎么处理"。编译与校验统一参考同一 definition。

---

## 4. 需要采用本方式重构的控件清单

### 4.1 P0：props 里嵌 action/schema（live defect 面）

| 控件                                      | 包                           | 字段                                                                         | 形态                                                                       |
| ----------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **dropdown-button**                       | flux-renderers-layout        | `items`                                                                      | item 集合（array.item → schema-definition）                                |
| **button-group**                          | flux-renderers-layout        | `items`                                                                      | item 集合（button-group-renderer 只读 `item.action`，无 onClick fallback） |
| **select / radio-group / checkbox-group** | flux-renderers-form          | `searchSource`                                                               | 单 action 值（actionValue）                                                |
| **input-tree / tree-select**              | flux-renderers-form-advanced | `searchSource` / `childrenSource`                                            | 单 action 值                                                               |
| **crud / table**                          | flux-renderers-data          | `quickSaveAction` / `quickSaveItemAction`                                    | 单 action 值                                                               |
| **picker**                                | flux-renderers-form-advanced | `loadAction` / `labelResolveAction`（`pickerDialog` 为纯配置对象，无需处理） | 单 action 值                                                               |
| **input-file / input-image**              | flux-renderers-form-advanced | `uploadAction` / `deleteAction`                                              | 单 action 值                                                               |
| **input 系控件 validate**                 | flux-renderers-form          | `validate.action`                                                            | 单 action 值                                                               |
| **内建 action definition**                | flux-core / flux-action-core | 全部内建 action 的 args                                                      | 每类型一个 definition                                                      |

### 4.2 P1：既有 deepFields 声明迁移 + 待决策项

**deepFields 声明迁移（7 处）到 schema-definition**（迁移先行，删除后行——见 §5）：

| 控件          | 包                           | deepFields 位置                                                     | 迁移内容                                                                                                                                                                        |
| ------------- | ---------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tabs          | flux-renderers-basic         | `basic-renderer-definitions.ts:456`                                 | items 的 title/body/toolbar → fieldRules（title → value-or-region、body → region、toolbar → **region**、含既有 literal 语义）                                                   |
| wizard        | flux-renderers-layout        | `layout-renderer-definitions.ts:126`                                | steps 的 title/body/actions/disabled → fieldRules（disabled → literal；title → value-or-region；body/actions → region）；**补 beforeEnter/beforeLeave（event）并接线 renderer** |
| grid          | flux-renderers-layout        | `:296`                                                              | items 的 body → fieldRules（region，params/isolate 经 SchemaFieldRule 载体保留）                                                                                                |
| collapse      | flux-renderers-layout        | `:418`                                                              | items 的 title/body → fieldRules                                                                                                                                                |
| variant-field | flux-renderers-form-advanced | `variant-field.tsx:166`                                             | variants 的 content/viewer → fieldRules（region；无 propContracts 需新建声明）                                                                                                  |
| table         | flux-renderers-data          | `data-renderer-definitions.ts:282`（columns）+ `:311`（expandable） | columns 的 label/cell/buttons/quickEdit.body + **expandable.expandedRow（params/isolate）** → fieldRules                                                                        |
| crud          | flux-renderers-data          | `crud-renderer-definition.ts:400`                                   | columns 的 label/cell/buttons/quickEdit.body + **columns[].searchable（SchemaInput 形态被 table-header-row.tsx:226 消费）** → fieldRules                                        |

**待决策项（v8 裁定）**：

| 项                                 | 裁定                                                                                                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| wizard `beforeEnter`/`beforeLeave` | **接线 renderer**（step 切换生命周期 dispatch）+ fieldRules 声明（event）                                                                                               |
| crud `columns[].searchable`        | **SchemaInput 形态保留并 region 化**（table-header-row.tsx:226 消费 placeholder 配置；若含表达式需保持模板）——kind 用 `value-or-region`（boolean/SchemaInput 自动判别） |
| carousel `items[].body`            | **删除类型声明**（carousel.tsx 只渲染 image/title/caption，body 无人消费——过时实现删除）                                                                                |

### 4.3 无风险（已有声明或设计内语义）

- 顶层 `onClick`：card / link / image / notice-bar 等均已声明 event；
- data-source 的 onSuccess/onError：走 `compiledSources` artifact，编译期已安全；
- source 字段的 url 对象：渲染期求值是**设计内语义**（`use-source-value`）。

---

## 5. 实施顺序

1. **P0 修复（已立项）**：`docs/plans/2026-08-02-1-nested-schema-field-classification.md`（schema-definition 机制 + P0 声明 + 契约测试）。
2. **机制统一（后续计划）**：词表统一（fieldRules 复用 SchemaFieldRule 对象形态）→ **编译器自动化与声明迁移（新管道接管、deepFields 并行保留）→ 既有 7 处声明迁移完成 → 删除 deepFields 机制（含 DEEP_FIELD_NORMALIZERS）** → P1 决策项 → typed item 语义 → 全仓审计与定稿。**顺序约束：声明迁移必须在删除之前完成**（删除后无 deepFields 支撑，未迁移的声明将失效）。

## 6. 风险与待定事项

- **词表合并影响**：`SchemaFieldKind` 扩展后，既有顶层 fields 声明不受影响（新增 kind 为增量）；`reaction`/`ignored`/`meta` 仅顶层语义，嵌套 fieldRules 不强制支持全部 kind（按需子集）。
- **迁移回归面**：6 处 deepFields 声明迁移必须逐控件核对渲染行为不变（region 提取语义一致），契约测试锁定。
- **envelope 解包点**：renderer 侧 `unwrapPreservedLiteral` 是唯一解包点；全静态 items 运行时契约测试防行为分裂。
- **typed item 与 region 化**：typed item 的 props 形状变化由 renderer 契约保证；无 type item（host 现状）不受影响。
- **编译/校验双路径一致性**：契约测试锁定（"fieldRules 里声明 event 的字段，编译产物必须保持模板"）。
- **性能**：schema-definition 仅影响声明了该形状的属性；region 提取自动化后无额外运行时开销。
- **跨仓库节奏**：flux 先发版，nop-chaos-next 重打包验证 host 编辑提交修复。

---

## 7. 一句话总结

> schema 的能力（校验 + 编译）围绕 definition 展开；dropdown-button / searchSource / quickSaveAction / 内建 action args 等"内置类 region 部分"缺少字段语义，被当作普通值编译导致行 scope 污染。**方案：属性定义（FluxValueShape）内联 `schema-definition`（统一 `SchemaFieldKind` 词表 + `actionValue` 标记），容器形态（array.item / record.value / object.fields）确定作用对象，编译器按 kind 自动分类（event/action/literal → envelope 保持模板、region/schema → region 提取、prop/value → 表达式），校验按同一 definition 递归——并整体取代并删除遗留的 deepFields/nestedRegions/booleanKeys/normalize 手工机制**——"判断到一个子部分就知道该子部分应该怎么处理"由属性定义保证。
