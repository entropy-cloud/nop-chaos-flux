# Input Text 组件设计

## 1. 组件定位

- `input-text` 是标准单行文本字段 renderer。
- 它是表单字段体系的基线实现，其他字符串类输入控件应优先复用它的校验和 field chrome 规则。

## 2. 与 AMIS 或既有产品的能力对照

- amis 仅作参考之一，**非标尺**。Flux 按自身原则（命名标准化 + shadcn/ui 对齐、核心简化、请求下沉）裁决能力，参见 `docs/components/existing-components-improvement-analysis.md` §0.2 与 §5 不采纳清单。
- 当前**实际已实现**：`name`、`placeholder`、`required`、label field rule、标准 scalar validation contributor（async rule）。
- `minLength`/`maxLength`/`pattern` 已实现，按**双重生效路径**工作：
  - **校验规则收集**：由 schema 编译期的 `collectSchemaValidationRules`（`packages/flux-compiler/src/validation-lowering.ts`）从 schema 收集为 `{ kind: 'minLength' | 'maxLength' | 'pattern', value }`，与 renderer 的 `collectRules`（email / async）经 `mergeValidationRules` 合并后进入 form runtime。违反约束时按现行 `validateOn` / `showErrorOn` 行为输出错误（如 `Email must be at least 5 characters`）。
  - **原生属性透传**：`createInputRenderer` 把 `minLength` / `maxLength` / `pattern` 作为原生 `<input>` 属性透传（HTML 渲染为 `minlength` / `maxlength` / `pattern`），使浏览器原生约束（如 `maxlength` 截断、`pattern` 候选提示）按 HTML 语义生效。值未声明时不传，避免覆盖 `@nop-chaos/ui` Input 默认行为。
  - 缺省 message 由 runtime `buildValidationMessage`（`packages/flux-runtime/src/validation/message.ts`）按 i18n 模板生成。

### Flux 决策表

| 能力                                           | 决定                | 理由                                                                                                                        |
| ---------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `name`/`placeholder`/`required`                | **实现**            | 字段基线                                                                                                                    |
| `minLength`/`maxLength`/`pattern`              | **实现**            | schema 声明 → 编译期 `collectSchemaValidationRules` 收集为 validation rule + `createInputRenderer` 透传原生属性（双重生效） |
| `label` field rule                             | **实现**            | 统一 field frame                                                                                                            |
| prefix/suffix 前后缀                           | **计划实现（E2a）** | shadcn Input addon 模式；高频                                                                                               |
| `clearable` 清空按钮                           | **计划实现（E2a）** | 明确布尔命名，对齐 shadcn                                                                                                   |
| `trimContents` blur 自动 trim                  | **计划实现（E2a）** | 常见需求                                                                                                                    |
| `showCounter` 字数计数                         | **计划实现（E2a）** | 与 maxLength 配合                                                                                                           |
| `autoComplete` 异步建议下拉                    | **计划实现（E2a）** | 走 data-source，不在组件开 api                                                                                              |
| `nativeAutoComplete`（HTML autocomplete 属性） | **计划实现（E2a）** | 浏览器原生 autofill                                                                                                         |
| 输入掩码 input-mask                            | **暂不实现**        | 场景窄，后续按需                                                                                                            |
| amis `addOn` 按钮 addon                        | **不采纳**          | 用 prefix/suffix + button 组合替代                                                                                          |
| amis `transform: {lowerCase, upperCase}`       | **暂不实现**        | 属 formatter 层，可由表达式/后处理                                                                                          |
| amis `borderMode`                              | **不采纳**          | amis 皮肤变体，与 shadcn/ui 风格不匹配                                                                                      |
| amis `clearValueOnEmpty`                       | **不采纳**          | 通用字段行为，由 form 层统一处理                                                                                            |
| amis 组件级 `api`/`initFetch`                  | **不采纳**          | 请求下沉 data-source + action                                                                                               |

## 3. Flux 中的 renderer/type 定义

- `type: 'input-text'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: 标准 scalar field，`wrap: true`
- 校验规则来源：schema 级规则（`required`/`minLength`/`maxLength`/`pattern` 等）由 schema 编译期 `collectSchemaValidationRules` 收集；renderer 的 `createFieldValidation.collectRules` 仅负责 renderer 专属规则（`email`、`validate.action` async）。两者经 `mergeValidationRules` 合并。
- 原生属性透传：`createInputRenderer('text')` 把 `minLength`/`maxLength`/`pattern` 作为原生 `<input>` 属性传给 `@nop-chaos/ui` Input。

## 4. schema 设计

- 继承 `InputSchema`：`name`、`placeholder`、`required`、`minLength`、`maxLength`、`pattern`、`validate`。
- 建议正式契约同时允许 `label`、`hint`、`description` 这类 field frame 字段。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`placeholder`、`required`、`minLength`、`maxLength`、`pattern`: `value`
- `validate`: `value`，内部承接 async rule 描述

## 6. regions 与 slot 约定

- `label` 可被编译为 region。
- 其他 field chrome 内容应复用统一 field frame，而不是为单个 input 定义新 slot。

## 7. 运行期状态归属

- 字段值默认归 `FormRuntime`；没有 form 时退回当前 scope。
- 焦点、touched、visited、dirty 和 validating 都由表单状态机统一维护。

## 8. 事件、动作与组件句柄能力

- 当前交互通过标准输入行为和表单 runtime 完成。
- 后续如需 `component:focus`、`component:setValue`，应遵循统一 field handle 语言。

## 9. 数据源、表达式、导入能力接入点

- `placeholder`、`disabled` 和 label 可接表达式。
- 值写入通过 `name` 绑定，不建议额外引入 `valueSource` 之类平行字段。

## 10. 样式与 DOM marker 约定

- 根节点延续 field frame 语义，并输出 `nop-input-text` marker。
- 视觉交互尽量复用 `@nop-chaos/ui` Input。

## 11. 实现拆分建议

- 通用值读写、校验触发和错误展示逻辑放在 `field-utils`。
- `createInputRenderer('text')` 继续作为实现入口。

## 12. 风险、取舍与后续阶段

- 需要防止 `input-text` 再次吸收过多专有能力，导致其他输入类型无法共享基线。
