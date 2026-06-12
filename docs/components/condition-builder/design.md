# Condition Builder 组件设计

## 1. 组件定位

- `condition-builder` 是面向规则表达式的复合字段组件。
- 它负责条件组、逻辑关系和字段-运算符-值三元组编辑，不是通用公式编辑器，也不是平台级设计器宿主。
- 该文档是 `condition-builder` 的长期 owner 文档；通用 renderer/runtime/form 规则仍由 architecture 文档负责。

## 2. 与 AMIS 或既有产品的能力对照

- 目标能力对标 AMIS `condition-builder`：字段类型、运算符映射、AND/OR 嵌套组、NOT、simple/full mode、embed/picker mode、远程字段配置、字段搜索、条件触发、unique fields。
- 当前仓库已落地基础 condition group 编辑、字段清单、值输入与 required 校验。
- 更复杂的嵌套逻辑、运算符扩展、异步字段元数据加载、公式增强属于后续阶段。

## 3. Flux 中的 renderer/type 定义

- `type: 'condition-builder'`
- `sourcePackage: '@nop-chaos/flux-renderers-form-advanced'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: `kind: 'field'`、`valueKind: 'scalar'`

## 4. schema 设计

组件正式 schema 以 `ConditionBuilderSchema` 为准。

```ts
interface ConditionBuilderSchema extends BaseSchema {
  type: 'condition-builder';
  name: string;

  fields: ConditionField[];
  source?: string | ApiSchema;

  builderMode?: 'full' | 'simple';
  embed?: boolean;
  title?: string;

  selectMode?: 'list' | 'tree' | 'chained';
  searchable?: boolean;

  draggable?: boolean;
  showAndOr?: boolean;
  showNot?: boolean;
  showIf?: boolean;
  uniqueFields?: boolean;

  formulas?: ConditionFormulaConfig;
  formulaForIf?: ConditionFormulaConfig;

  operators?: ConditionOperatorOverrides;
  addBtnVisibleOn?: string;
  addGroupBtnVisibleOn?: string;

  placeholder?: string;
  addConditionLabel?: string;
  addGroupLabel?: string;
  removeConditionLabel?: string;
  removeGroupLabel?: string;

  maxDepth?: number;
  maxItemsPerGroup?: number;
}
```

关键输入：

- 条件字段定义：`fields`
- 远程字段来源：`source`
- 编辑模式：`builderMode`、`embed`
- 逻辑和交互开关：`showAndOr`、`showNot`、`showIf`、`draggable`、`uniqueFields`
- 文案与按钮可见性：`placeholder`、`addConditionLabel`、`addGroupLabel`、`addBtnVisibleOn`、`addGroupBtnVisibleOn`

Operator naming baseline:

- 内置 operator id 当前 live baseline 仍使用 DSL token 形式的 snake_case，例如 `not_equal`、`less_or_equal`、`is_empty`
- 这些 id 属于 condition-builder 自己的 operator vocabulary，不是通用 schema field key
- 自定义 operator 的 `value` 应与同一 vocabulary 保持一致，避免同一个 builder 中混用多套命名

## 5. 字段分类

- `label`: `value-or-region`
- `fields`、`source`、`operators`、`formulas`、`formulaForIf`: `value`
- `builderMode`、`embed`、`selectMode`、`searchable`、`draggable`、`showAndOr`、`showNot`、`showIf`、`uniqueFields`: `value`
- `addConditionLabel`、`addGroupLabel`、`removeConditionLabel`、`removeGroupLabel`、`placeholder`: `value`

## 6. regions 与 slot 约定

- 首版不开放条件项任意 schema slot。
- 值输入类型切换通过内部适配完成，而不是暴露 render prop。
- 如果未来需要扩展 custom operator value UI，应继续作为组件内部 schema 位点，而不是直接把整棵 condition line 暴露成自由 region。

## 7. 运行期状态归属

- 条件值整体归 form runtime，通过 `name` 绑定读写。
- 展开态、局部编辑态、下拉打开态属于局部 UI 状态。
- 远程字段解析属于组件内受控加载逻辑，不应反向发明新的宿主级状态协议。

值结构：

```ts
interface ConditionGroupValue {
  id: string;
  conjunction: 'and' | 'or';
  not?: boolean;
  if?: string;
  children: Array<ConditionGroupValue | ConditionItemValue>;
}

interface ConditionItemValue {
  id: string;
  left: {
    type: 'field';
    field: string;
  };
  op: string;
  right?: unknown;
}
```

### 7.1 值净化（Sanitization）

外部输入数据（AMIS 格式或内部格式）在进入运行时树之前必须经过净化。

规则：

- `right: null` → `undefined`
- `right: [undefined]` → `undefined`（全 undefined 元素的数组没有语义）
- `right: [undefined, undefined]` → `undefined`
- `right: [null, null]` → `undefined`
- `right: [1, undefined]` → 保持不变（部分填充的 between 值）
- `right: "active"` → 保持不变
- `right: ["a", "b"]` → 保持不变

实现位置：`sanitizeRight()` 和 `sanitizeNode()` 在 `utils.ts` 中，由 `condition-builder.tsx` 的 `toGroupValue()` 和 `convertAmisRule()` 调用。

此外，`ValueInput` 组件在分发给具体输入控件前，对非 between 运算符调用 `coerceScalar(value)` 将数组值回退为 `undefined`，防止 `String([undefined])` → `"[undefined]"` 被渲染到输入框。

## 7.2 字段类型 → 运算符 → 值控件映射

condition-builder 采用 **三层映射** 决定每个条件项的值输入控件。

### 层 1：字段类型 → 可用运算符

`operators.ts` 中的 `OPERATORS_BY_TYPE` 定义每种字段类型可用的运算符列表和默认运算符。

| 字段类型 | 默认运算符      | 可用运算符                                                                                                                         |
| -------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| text     | `equal`         | `equal`, `not_equal`, `is_empty`, `is_not_empty`, `like`, `not_like`, `starts_with`, `ends_with`                                   |
| number   | `equal`         | `equal`, `not_equal`, `less`, `less_or_equal`, `greater`, `greater_or_equal`, `between`, `not_between`, `is_empty`, `is_not_empty` |
| date     | `equal`         | 同 number                                                                                                                          |
| time     | `equal`         | 同 number                                                                                                                          |
| datetime | `equal`         | 同 number                                                                                                                          |
| select   | `select_equals` | `select_equals`, `select_not_equals`, `select_any_in`, `select_not_any_in`                                                         |
| boolean  | `equal`         | `equal`, `not_equal`                                                                                                               |
| custom   | `equal`         | （空，由 schema 定义）                                                                                                             |

覆盖优先级（高→低）：

1. 字段级覆盖：`field.operators` 和 `field.defaultOp`
2. Schema 级覆盖：`schema.operators.operatorsByType[fieldType]` 和 `schema.operators.defaultOpByType[fieldType]`
3. 内置默认：`OPERATORS_BY_TYPE[fieldType]`

### 层 2：运算符覆盖解析

`resolveOperators()` 和 `resolveDefaultOp()` 实现上述三级覆盖合并。

### 层 3：运算符 + 字段类型 → 值控件

`value-input.tsx` 中的 `ValueInput` 使用两层分派：

**第 1 级：运算符级覆盖（优先）**

| 运算符                     | 控件             | 说明                                        |
| -------------------------- | ---------------- | ------------------------------------------- |
| （无运算符）               | `null`           | 不渲染                                      |
| `is_empty`, `is_not_empty` | `null`           | 一元运算符，无需值输入                      |
| `between`, `not_between`   | `<BetweenInput>` | 两个输入框（根据字段类型为 number 或 text） |

**第 2 级：字段类型分派（默认回退）**

| 字段类型 | 控件             | 说明               |
| -------- | ---------------- | ------------------ |
| text     | `<TextInput>`    | 文本输入           |
| number   | `<NumberInput>`  | 数字输入           |
| select   | `<SelectInput>`  | 内含子分派（见下） |
| boolean  | `<BooleanInput>` | True/False 选择    |
| default  | `<TextInput>`    | 兜底文本输入       |

**SelectInput 子分派：**

| 条件                                                                         | 控件                                                     |
| ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| `op === 'select_any_in'` 或 `op === 'select_not_any_in'` 或 `field.multiple` | `<MultiSelectInput>`（Badge 式多选 + NativeSelect 添加） |
| 其他                                                                         | 单个 `<Select>` 下拉                                     |

**完整映射矩阵：**

| 字段类型           | 运算符                                                           | 值控件                           | right 值类型       |
| ------------------ | ---------------------------------------------------------------- | -------------------------------- | ------------------ |
| text               | equal, not_equal, like, not_like, starts_with, ends_with         | TextInput                        | `string`           |
| text               | is_empty, is_not_empty                                           | （无）                           | `undefined`        |
| number             | equal, not_equal, less, less_or_equal, greater, greater_or_equal | NumberInput                      | `number`           |
| number             | between, not_between                                             | BetweenInput (两个 NumberInput)  | `[number, number]` |
| number             | is_empty, is_not_empty                                           | （无）                           | `undefined`        |
| date/time/datetime | equal, not_equal, less, less_or_equal, greater, greater_or_equal | TextInput (暂无 DatePicker)      | `string`           |
| date/time/datetime | between, not_between                                             | BetweenInput (两个 TextInput)    | `[string, string]` |
| select             | select_equals, select_not_equals                                 | Select (单选下拉)                | `string`           |
| select             | select_any_in, select_not_any_in                                 | MultiSelectInput (Badge 多选)    | `string[]`         |
| boolean            | equal, not_equal                                                 | BooleanInput (True/False Select) | `boolean`          |

### 自定义运算符的值控件

`ConditionCustomOperator` 类型支持 `values?: ConditionCustomOperatorValueField[]`，可定义自定义运算符的值字段元数据。当前 `ValueInput` 尚未消费此字段做控件渲染，自定义运算符的 right 值按字段类型的默认控件处理。后续可扩展为基于 `values` 定义的动态表单。

### 7.3 自定义值编辑器扩展原则

condition-builder 的值编辑器扩展必须遵守 Flux 的 declarative schema 与编译期归一化原则。

禁止方向：

- 不通过 React 组件注册表暴露 `valueWidget -> React.ComponentType` 扩展点
- 不要求应用层在 condition-builder 之外先注册一个运行时 React 组件名，再由 condition-builder 直接实例化该组件
- 不把值编辑器扩展设计成 React-only plugin 机制

原因：

- 这会绕开 Flux 的 schema/compiler/runtime 契约
- 会让外部 JSON 不再是纯声明式 schema，而是隐式依赖宿主侧组件注册
- 会让 condition-builder 自己发明一套脱离 renderer registry 的私有扩展协议
- 与 `docs/architecture/field-metadata-slot-modeling.md` 和 `docs/architecture/renderer-runtime.md` 的 owner 规则冲突

#### 正确方向：组件内部 schema 位点

如果未来需要扩展 custom operator value UI，应继续作为 **condition-builder 内部的 schema 位点** 落地。

含义：

- 扩展输入仍然是 Flux JSON schema
- 运行时仍通过标准 renderer/compiler/render path 渲染
- 自定义值编辑器读取的 `name`、`value`、`disabled`、上下文变量等，都通过 Flux scope / props / compiled bindings 提供
- 它本质上仍然是 Flux renderer 片段，而不是 React 组件注入

推荐形态：

```ts
interface ConditionCustomField extends BaseConditionField {
  type: 'custom';
  value: BaseSchema;
}
```

或在后续演进中，引入更明确的值编辑 schema 位点，但仍保持：

- authored input 是 `BaseSchema` / `SchemaInput`
- 由编译器预编译
- 在 `ValueInput` / condition-builder 内部通过标准 fragment/render helper 消费

#### 正确的 schema 约束

推荐约束：

- 自定义字段类型可以继续用 `field.type` + `field.operators` / `schema.operators.operatorsByType[fieldType]` 决定运算符集合
- 自定义值编辑器本身必须是一个 Flux schema 片段，而不是字符串形式的 widget 名称
- 组件可约定值编辑 schema 读取 `name`、`value`、`field`、`op` 等上下文变量，但这些变量必须通过 Flux scope 约定暴露，而不是通过 React props registry 私下传递

示意：

```json
{
  "name": "roleId",
  "label": "角色",
  "type": "custom",
  "operators": ["equal", "not_equal", "in"],
  "value": {
    "type": "select",
    "name": "value",
    "source": {
      "type": "source",
      "formula": "${roleOptions}"
    }
  }
}
```

这里的关键不是示例字段名本身，而是：

- 值编辑器配置是 Flux schema
- schema 内部可以通过表达式读取上下文
- 约定输入/输出围绕 `name` 和 `value` 等标准字段进行

当前 live contract：

- `field.type === 'custom'` 时，`field.value` 必须提供一个可直接渲染的 Flux schema 片段
- 该片段运行在 condition item 为 `right` 建立的投影 owner 上，标准写法是把实际值字段命名为 `name: 'value'`
- 片段表达式可读取 `value`、`field`、`op`、`disabled` 等投影 scope 变量，但这些都属于 Flux scope 约定，不是 React props 注入
- 如果 `field.value` 指向无效或未注册的 renderer，运行时会如实失败；condition-builder 不再回退到旧的 React widget registry 或其他无关内置控件

#### ValueInput 分派原则

正确的长期分派顺序应是：

```
1. op 为空 / is_empty / is_not_empty → null
2. op 为 between / not_between → BetweenInput
3. field 提供组件内部 schema 位点 → 按 Flux fragment/schema 渲染该位点
4. 按 field.type 分派到内置控件（TextInput / NumberInput / SelectInput / BooleanInput）
5. 兜底 → TextInput
```

#### resolveOperators 对自定义类型的支持

`resolveOperators()` 继续支持为任意字段类型名提供运算符覆盖。无需在 `OPERATORS_BY_TYPE` 中注册：

1. `field.operators` → 直接指定运算符列表
2. `schema.operators.operatorsByType['roleId']` → schema 级按类型名注册
3. `OPERATORS_BY_TYPE[fieldType]` → 内置默认（仅限已知类型）

这允许 `type: 'roleId'` 或其他业务类型通过字段级或 schema 级覆盖定义运算符，而值编辑器本身仍保持 Flux schema 扩展路线。

## 8. 事件、动作与组件句柄能力

- 当前对外主语义仍是字段值变化。
- 长期可以提供 `component:addCondition`、`component:addGroup`、`component:normalizeValue` 一类组件能力，但不应成为首要交互入口。
- `showIf` / 公式配置属于 value 语义扩展，不应演变成第二套 action 脚本协议。

## 8.1 i18n 约定

- `condition-builder` 的内置文案必须统一走 `@nop-chaos/flux-i18n`，不再维护组件私有本地文本表。
- 内置 key 归属 `conditionBuilder.*`，资源定义位于 `packages/flux-i18n/src/locales/{zh-CN.ts,en-US.ts}`。
- schema 侧自定义文案仍通过 `placeholder`、`addConditionLabel`、`addGroupLabel`、`removeGroupLabel` 等显式字段覆盖，而不是通过组件私有 override API 注入。

## 9. 数据源、表达式、导入能力接入点

- 字段元数据可来自内联 `fields`，或来自 `source` 指向的 scope/api 数据源。
- `source` 返回的数据应解析为字段配置，而不是任意 UI 片段。
- 条件 DSL 本身是 value，不应再内嵌动作脚本或平台宿主桥接语义。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-condition-builder` marker。
- 视觉层遵循 field frame 和 group/card 类 UI primitives，不内嵌组件私有布局体系。
- 组容器、条件项、拖拽柄、删除按钮等视觉结构应使用稳定 marker 以便外部主题和测试定位。

## 11. 实现拆分

文件拆分现状：

```text
packages/flux-renderers-form-advanced/src/condition-builder/
  index.tsx                  (re-export)
  types.ts                   (类型定义)
  operators.ts               (运算符注册表、覆盖解析)
  utils.ts                   (sanitizeRight, sanitizeNode, computeUsedFields, groupValuesEqual)
  id-utils.ts                (genId)
  condition-builder.tsx       (主 renderer + PickerModeContent)
  condition-group.tsx         (ConditionGroup + SortableItem)
  condition-item.tsx          (ConditionItem)
  value-input.tsx             (ValueInput + schema-driven custom editor host + TextInput, NumberInput, SelectInput, MultiSelectInput, BooleanInput, BetweenInput)
  field-select.tsx            (FieldSelect)
  operator-select.tsx         (OperatorSelect)
```

## 12. 风险、取舍与后续阶段

- 最主要风险是把条件构建器演变成通用公式 IDE，导致契约失控。
- 字段类型系统与 value editor 的映射需要持续文档化。
- custom operator、remote field loading、deep nesting、picker mode 都应按组件 owner 路线扩展，不应再把组件设计散落回 architecture 顶层。

## 13. 相关文档

- `docs/architecture/renderer-runtime.md` - 通用 renderer contract
- `docs/architecture/form-validation.md` - 表单校验参与规则
- `docs/architecture/styling-system.md` - 样式系统约束
- `docs/architecture/api-data-source.md` - 远程字段加载模式
- `docs/references/flux-json-conventions.md` - JSON 命名与表达式约定
