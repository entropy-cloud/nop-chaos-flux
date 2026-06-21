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

> Flux 决策主语。amis 仅作参考之一，**非标尺**。Flux 按自身原则（命名标准化 + shadcn/ui 对齐、核心简化、请求下沉）裁决能力，命名对齐 X3 基线（`docs/references/naming-conventions.md` §2/§3）。参见 `docs/components/existing-components-improvement-analysis.md` §0.2 与 §5 不采纳清单。列：`能力 | 采纳 | 不采纳 | 理由`。本表为**文本输入族（input-text/email/password）共享面**，input-email/input-password 各自特化差异见其 design.md 独立小表。

| 能力                                               | 采纳                                                                                                                                  | 不采纳                        | 理由                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| 字段基线                                           | **实现**：`name`/`placeholder`/`required`                                                                                             | —                             | 当前基线                                                          |
| 长度/模式约束（`minLength`/`maxLength`/`pattern`） | **实现**：schema 声明 → 编译期 `collectSchemaValidationRules` 收集为 validation rule + `createInputRenderer` 透传原生属性（双重生效） | —                             | 见 §2 上方双重生效路径说明                                        |
| `label` field rule                                 | **实现**：统一 field frame                                                                                                            | —                             | 当前基线                                                          |
| prefix/suffix 前后缀                               | **实现**：`@nop-chaos/ui` `InputGroup` + `InputGroupAddon`/`InputGroupText`（`align="inline-start"`/`"inline-end"`）                  | —                             | 命名对齐 X3 §2（`prefix`/`suffix`）；shadcn InputGroup addon 模式 |
| `clearable` 清空按钮                               | **实现**：值非空且非 disabled/readOnly 时渲染 `InputGroupButton`（ghost, `icon-xs`），点击清空为 `''`                                 | —                             | 明确布尔命名，对齐 shadcn（X3 §2/§4.1 肯定式）                    |
| `trimContents` blur 自动 trim                      | **实现**：blur handler 中 `String(value).trim()` 再写入 form runtime（onChange 不 trim）                                              | —                             | 常见需求；输入过程中空格保留                                      |
| `showCounter` 字数计数                             | **实现**：`<span data-slot="input-counter">`，有 `maxLength` 时显示 `n / max`，无时显示 `n`                                           | —                             | 与 maxLength 配合；实时更新                                       |
| `autoComplete` 异步建议下拉                        | **计划实现**：走 data-source                                                                                                          | amis 组件级 `api`/`initFetch` | 请求下沉 data-source + action，不在组件开 api（X3 §1/§3）         |
| `nativeAutoComplete`（HTML autocomplete 属性）     | **实现**：声明时透传 `<input autocomplete="...">`（值如 `'on'`/`'off'`/`'email'`/`'current-password'`）                               | —                             | 浏览器原生 autofill                                               |
| 输入掩码 input-mask                                | **暂不实现**                                                                                                                          | —                             | 场景窄，后续按需                                                  |
| amis `addOn` 按钮 addon                            | —                                                                                                                                     | **不采纳**                    | 用 prefix/suffix + button 组合替代                                |
| amis `transform: {lowerCase, upperCase}`           | **暂不实现**                                                                                                                          | —                             | 属 formatter 层，可由表达式/后处理                                |
| amis `borderMode`                                  | —                                                                                                                                     | **不采纳**                    | amis 皮肤变体，与 shadcn/ui 风格不匹配（X3 §3 样式 amis 化）      |
| amis `clearValueOnEmpty`                           | —                                                                                                                                     | **不采纳**                    | 通用字段行为，由 form 层统一处理                                  |

## 3. Flux 中的 renderer/type 定义

- `type: 'input-text'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: 标准 scalar field，`wrap: true`
- 校验规则来源：schema 级规则（`required`/`minLength`/`maxLength`/`pattern` 等）由 schema 编译期 `collectSchemaValidationRules` 收集；renderer 的 `createFieldValidation.collectRules` 仅负责 renderer 专属规则（`email`、`validate.action` async）。两者经 `mergeValidationRules` 合并。
- 原生属性透传：`createInputRenderer('text')` 把 `minLength`/`maxLength`/`pattern` 作为原生 `<input>` 属性传给 `@nop-chaos/ui` Input。

## 4. schema 设计

- 继承 `InputSchema`：`name`、`placeholder`、`required`、`minLength`、`maxLength`、`pattern`、`validate`。
- E2a 新增字段（文本输入族 text/email/password 共享）：
  - `prefix?: string` — 纯文本前缀（InputGroup inline-start addon）。
  - `suffix?: string` — 纯文本后缀（InputGroup inline-end addon）。
  - `clearable?: boolean` — 值非空且非 disabled/readOnly 时显示清空按钮（点击清空为 `''`）。
  - `trimContents?: boolean` — blur 时自动 trim 首尾空白（onChange 不 trim）。
  - `showCounter?: boolean` — 字数计数，有 `maxLength` 时显示 `n / max`，无时显示 `n`。
  - `nativeAutoComplete?: string` — HTML `autocomplete` 属性透传（如 `'on'`/`'off'`/`'email'`/`'current-password'`）。
- E2a-bis 新增字段（声明在共享 `InputSchema`，但**仅 input-password renderer 消费**；input-text/email 即便声明 `revealPassword: true` 也不渲染 reveal toggle）：
  - `revealPassword?: boolean` — `true` 时在 InputGroup inline-end addon 渲染 reveal toggle 按钮（Eye/EyeOff）。详见 `input-password/design.md` §2/§4。
- 建议正式契约同时允许 `label`、`hint`、`description` 这类 field frame 字段。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`placeholder`、`required`、`minLength`、`maxLength`、`pattern`、`prefix`、`suffix`、`nativeAutoComplete`: `value`（进入 `props` 通道）
- `clearable`、`trimContents`、`showCounter`: `value`（boolean，`valueType: 'boolean'`）
- `validate`: `value`，内部承接 async rule 描述

## 6. regions 与 slot 约定

- `label` 可被编译为 region。
- 其他 field chrome 内容应复用统一 field frame，而不是为单个 input 定义新 slot。

## 7. 运行期状态归属

- 字段值默认归 `FormRuntime`；没有 form 时退回当前 scope。
- 焦点、touched、visited、dirty 和 validating 都由表单状态机统一维护。

## 8. 事件、动作与组件句柄能力

- 当前交互通过标准输入行为和表单 runtime 完成。
- X1 起落地 `component:clear`/`reset`/`focus` handle（renderer definition 已发布 `componentCapabilityContracts`，共享 `useInputComponentHandle` hook + `createInputComponentHandle` 工厂）。详见 `docs/references/component-handle-vocabulary.md`。
  - `clear`：清空值为 `''`（disabled/readOnly 时 `{ok:true, skipped:true}`）。
  - `reset`：还原到 mount 时捕获的 initial value。
  - `focus`：focus 底层 `<input>` 元素（卸载时 `{ok:false, code:'not-mounted'}`，`when:false` 时 `{ok:false, code:'not-visible'}`）。
- 与 `form.reset` 的语义区别：`form.reset` 还原整个表单；`component:reset`（field-level）只还原单个字段。
- input-email/input-password 共享同一 `createInputRenderer` 工厂，因此同样发布 clear/reset/focus。

## 9. 数据源、表达式、导入能力接入点

- `placeholder`、`disabled` 和 label 可接表达式。
- 值写入通过 `name` 绑定，不建议额外引入 `valueSource` 之类平行字段。

## 10. 样式与 DOM marker 约定

- 根节点延续 field frame 语义，并输出 `nop-input-text` marker。
- 无 prefix/suffix/clearable/showCounter/nativeAutoComplete 声明时，直接渲染 `<Input>`（bare styled `<input>`，`data-slot="input"`）。
- 声明任一增强时，用 `@nop-chaos/ui` `InputGroup` 包裹：外层 `<div data-slot="input-group">`，内部 `<input>` 改用 `InputGroupInput`（`data-slot="input-group-control"`，dropping 自身 border/ring，避免双重边框）。prefix → `InputGroupAddon align="inline-start"` + `InputGroupText`；suffix/clear/counter → `InputGroupAddon align="inline-end"`。DOM 结构在值变化时保持稳定（声明 clearable/showCounter 即始终包裹 InputGroup，不随按钮显隐切换）。
- `InputGroupFieldControl` 包装组件吸收 FieldFrame `cloneElement` 注入的 `id`/`aria-*`/`onFocus`/`onBlur`，转发到内部 `InputGroupInput`（避免 InputGroup div 与 input 重复 id/aria）。

## 11. 实现拆分建议

- 通用值读写、校验触发和错误展示逻辑放在 `field-utils`。
- `createInputRenderer('text')` 继续作为实现入口；`InputGroupFieldControl` 封装 InputGroup 渲染 + FieldFrame prop 吸收。

## 12. 风险、取舍与后续阶段

- 需要防止 `input-text` 再次吸收过多专有能力，导致其他输入类型无法共享基线。
