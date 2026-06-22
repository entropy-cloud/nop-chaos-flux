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

| 能力                                               | 采纳                                                                                                                                                                                                                                                                                                                                                                  | 不采纳                                                          | 理由                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 字段基线                                           | **实现**：`name`/`placeholder`/`required`                                                                                                                                                                                                                                                                                                                             | —                                                               | 当前基线                                                                                                                                                                                                                                                                                                                                                                      |
| 长度/模式约束（`minLength`/`maxLength`/`pattern`） | **实现**：schema 声明 → 编译期 `collectSchemaValidationRules` 收集为 validation rule + `createInputRenderer` 透传原生属性（双重生效）                                                                                                                                                                                                                                 | —                                                               | 见 §2 上方双重生效路径说明                                                                                                                                                                                                                                                                                                                                                    |
| `label` field rule                                 | **实现**：统一 field frame                                                                                                                                                                                                                                                                                                                                            | —                                                               | 当前基线                                                                                                                                                                                                                                                                                                                                                                      |
| prefix/suffix 前后缀                               | **实现**：`@nop-chaos/ui` `InputGroup` + `InputGroupAddon`/`InputGroupText`（`align="inline-start"`/`"inline-end"`）                                                                                                                                                                                                                                                  | —                                                               | 命名对齐 X3 §2（`prefix`/`suffix`）；shadcn InputGroup addon 模式                                                                                                                                                                                                                                                                                                             |
| `clearable` 清空按钮                               | **实现**：值非空且非 disabled/readOnly 时渲染 `InputGroupButton`（ghost, `icon-xs`），点击清空为 `''`                                                                                                                                                                                                                                                                 | —                                                               | 明确布尔命名，对齐 shadcn（X3 §2/§4.1 肯定式）                                                                                                                                                                                                                                                                                                                                |
| `trimContents` blur 自动 trim                      | **实现**：blur handler 中 `String(value).trim()` 再写入 form runtime（onChange 不 trim）                                                                                                                                                                                                                                                                              | —                                                               | 常见需求；输入过程中空格保留                                                                                                                                                                                                                                                                                                                                                  |
| `showCounter` 字数计数                             | **实现**：`<span data-slot="input-counter">`，有 `maxLength` 时显示 `n / max`，无时显示 `n`                                                                                                                                                                                                                                                                           | —                                                               | 与 maxLength 配合；实时更新                                                                                                                                                                                                                                                                                                                                                   |
| `autoComplete` 异步建议下拉（suggest）             | **实现**（E3 successor）：走 data-source composition —— renderer 持有 `suggestSource: <data-source-name>`，按 debounce 派发 `refreshSource { targetId: suggestSource }`；data-source `sendOn` 门控实际请求、`onSuccess` 写建议数组到 `scope.<suggestSource>`；renderer 读 `scope[suggestSource]` 渲染 Popover 浮层，选中后 `handlers.onChange(suggestion.value)` 回填 | amis 组件级 `api`/`initFetch`/`autoComplete` SchemaApi 生命周期 | 请求下沉 data-source + action，不在组件开 api（X3 §1/§3，roadmap 设计原则 4）。**Composition 裁定**：模式 A（`suggestSource` + `refreshSource`）—— 单标识符（data-source name）同时作 refresh target 与 scope 读路径，约定大于配置；模式 B（`suggestAction: ActionSchema`）更灵活但多一层绑定字段，降级为后续按需；模式 C（renderer 内联 `suggestApi`）违反请求下沉，**否决** |
| `nativeAutoComplete`（HTML autocomplete 属性）     | **实现**：声明时透传 `<input autocomplete="...">`（值如 `'on'`/`'off'`/`'email'`/`'current-password'`）                                                                                                                                                                                                                                                               | —                                                               | 浏览器原生 autofill                                                                                                                                                                                                                                                                                                                                                           |
| 输入掩码 input-mask                                | **暂不实现**                                                                                                                                                                                                                                                                                                                                                          | —                                                               | 场景窄，后续按需                                                                                                                                                                                                                                                                                                                                                              |
| amis `addOn` 按钮 addon                            | —                                                                                                                                                                                                                                                                                                                                                                     | **不采纳**                                                      | 用 prefix/suffix + button 组合替代                                                                                                                                                                                                                                                                                                                                            |
| amis `transform: {lowerCase, upperCase}`           | **暂不实现**                                                                                                                                                                                                                                                                                                                                                          | —                                                               | 属 formatter 层，可由表达式/后处理                                                                                                                                                                                                                                                                                                                                            |
| amis `borderMode`                                  | —                                                                                                                                                                                                                                                                                                                                                                     | **不采纳**                                                      | amis 皮肤变体，与 shadcn/ui 风格不匹配（X3 §3 样式 amis 化）                                                                                                                                                                                                                                                                                                                  |
| amis `clearValueOnEmpty`                           | —                                                                                                                                                                                                                                                                                                                                                                     | **不采纳**                                                      | 通用字段行为，由 form 层统一处理                                                                                                                                                                                                                                                                                                                                              |

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
- E3 新增字段（文本输入族 text/email/password 共享，`autoComplete` successor 落地，走 data-source composition 模式 A）：
  - `suggestSource?: string` — 绑定的 data-source **name**。renderer 按 debounce 派发 `refreshSource { action: 'refreshSource', targetId: suggestSource }`；data-source 的 `sendOn` 门控实际请求、`onSuccess`/`name` 把建议数组写到 `scope.<suggestSource>`。renderer 读 `scope[suggestSource]` 渲染浮层（约定 = data-source name，无单独 `suggestItemsPath` 字段）。
  - `suggestDebounce?: number` — 输入变化到派发 refresh 的 debounce 毫秒数，缺省 `300`。
  - `suggestTrigger?: 'input' | 'focus' | 'manual'` — 触发时机，缺省 `'input'`（每次值变化 debounce 后派发）。`'focus'`：仅 focus 时派发一次（用当前值）；`'manual'`：renderer 不自动派发，由外部 action 派发 `refreshSource`，renderer 仅负责渲染浮层。
  - `suggestMinInputLength?: number` — 派发 refresh 前的客户端最小输入长度 gate，缺省 `1`（避免空输入触发）。长度不足时不派发且关闭浮层。
  - `suggestTemplate?: BaseSchema[]` — per-suggestion 受控 region（`params: ['suggestion', 'index']`），声明时 renderer 通过 `props.regions.suggestTemplate.render({ bindings: { suggestion, index } })` 渲染每项；未声明时降级为 `suggestion.label` 纯文本（与 select `optionTemplate` 失败路径对称）。
  - `suggestEmpty?: string` — 建议数组为空或请求失败时的浮层空态文案，缺省走 i18n「无建议」。
- 建议项形状：`scope[suggestSource]` 应为数组，每项遵循 `{ label: string; value: string | number | boolean }`（与 `SelectOptionSchema` 一致）。若 data-source 返回异构形状，作者用 `resultMapping`/`onSuccess` 归一化（请求下沉契约）。
- 建议正式契约同时允许 `label`、`hint`、`description` 这类 field frame 字段。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`placeholder`、`required`、`minLength`、`maxLength`、`pattern`、`prefix`、`suffix`、`nativeAutoComplete`: `value`（进入 `props` 通道）
- `clearable`、`trimContents`、`showCounter`: `value`（boolean，`valueType: 'boolean'`）
- `validate`: `value`，内部承接 async rule 描述
- E3 suggest 字段：`suggestSource`、`suggestDebounce`、`suggestTrigger`、`suggestMinInputLength`、`suggestEmpty`: `value`（进入 `props` 通道）；`suggestTemplate`: `region`（`params: ['suggestion', 'index']`）

## 6. regions 与 slot 约定

- `label` 可被编译为 region。
- 其他 field chrome 内容应复用统一 field frame，而不是为单个 input 定义新 slot。
- E3 `suggestTemplate`（受控参数化 region，`params: ['suggestion', 'index']`）：声明时 renderer 通过 `props.regions.suggestTemplate.render({ bindings: { suggestion, index } })` per-suggestion 调用，子节点通过 `$slot` frame 引用当前建议数据（与 select `optionTemplate` 同模式）。未声明时回退渲染 `suggestion.label` 纯文本（无回归）。region 渲染抛错时 `console.warn` 并降级为纯文本（Failure Path `suggest-template-region-fail`）。

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
- E3 suggest：renderer 不开请求短路径，触发链路为「renderer 派发 `refreshSource { targetId: suggestSource }` → data-source controller 走 `sendOn` 门控 → `onSuccess` 写 `scope.<suggestSource>`」。renderer 对 data-source 的寻址仅靠 `suggestSource`（source name），不依赖 componentId。`'manual'` 触发模式下，外部 action（如 button onClick）直接派发 `refreshSource`，renderer 只负责渲染浮层。选中建议后只写回当前字段值（`handlers.onChange(suggestion.value)`）；如需同时写其他字段，用 form scope action，不在 renderer 内直接写。

## 9. 数据源、表达式、导入能力接入点

- `placeholder`、`disabled` 和 label 可接表达式。
- 值写入通过 `name` 绑定，不建议额外引入 `valueSource` 之类平行字段。

## 10. 样式与 DOM marker 约定

- 根节点延续 field frame 语义，并输出 `nop-input-text` marker。
- 无 prefix/suffix/clearable/showCounter/nativeAutoComplete 声明时，直接渲染 `<Input>`（bare styled `<input>`，`data-slot="input"`）。
- 声明任一增强时，用 `@nop-chaos/ui` `InputGroup` 包裹：外层 `<div data-slot="input-group">`，内部 `<input>` 改用 `InputGroupInput`（`data-slot="input-group-control"`，dropping 自身 border/ring，避免双重边框）。prefix → `InputGroupAddon align="inline-start"` + `InputGroupText`；suffix/clear/counter → `InputGroupAddon align="inline-end"`。DOM 结构在值变化时保持稳定（声明 clearable/showCounter 即始终包裹 InputGroup，不随按钮显隐切换）。
- `InputGroupFieldControl` 包装组件吸收 FieldFrame `cloneElement` 注入的 `id`/`aria-*`/`onFocus`/`onBlur`，转发到内部 `InputGroupInput`（避免 InputGroup div 与 input 重复 id/aria）。
- E3 suggest 浮层 DOM marker（基于 `@nop-chaos/ui` Popover，portal 渲染到 body）：
  - 浮层根：`data-slot="input-suggest-list"`（挂在 PopoverContent 上）。
  - 每条建议项：`data-slot="input-suggest-item"`（含 `data-index`、`aria-selected`；高亮项随键盘导航切换）。
  - 空态/错误态：`data-slot="input-suggest-empty"`（建议数组为空或请求失败时渲染 `suggestEmpty` 文案）。
  - 触发不渲染独立 marker —— 浮层锚定在既有 InputGroupInput/`<Input>` 上（Popover trigger 即输入框），不新增 DOM 节点。

## 11. 实现拆分建议

- 通用值读写、校验触发和错误展示逻辑放在 `field-utils`。
- `createInputRenderer('text')` 继续作为实现入口；`InputGroupFieldControl` 封装 InputGroup 渲染 + FieldFrame prop 吸收。

## 12. 风险、取舍与后续阶段

- 需要防止 `input-text` 再次吸收过多专有能力，导致其他输入类型无法共享基线。
- E3 suggest 与 `nativeAutoComplete`（HTML autocomplete 属性）**正交共存**：`nativeAutoComplete` 是浏览器原生 autofill（声明时透传 `<input autocomplete="...">`），suggest 是 data-source 驱动的远程建议浮层。两者互不干扰，可同时声明（Failure Path `suggest-native-autocomplete-coexist`：无交互冲突，前者由浏览器接管 input history，后者由 renderer 管 Popover）。
- **abort/慢请求时序**：依赖 data-source controller 现有 abort 语义（`dedup`/`cancel-previous`）。新输入触发 refresh 时，data-source controller 按其策略 abort/忽略前请求；renderer 不自维护 abort（请求下沉纪律）。浮层在新结果到达前保持上一次内容或 loading（Failure Path `suggest-source-slow-aborted`）。
- **空态/错误态**：建议数组空或请求失败 → 浮层显示 `suggestEmpty` 文案；`console.warn` 记录失败（不抛错，不阻塞输入）。输入框值不受影响（Failure Path `suggest-source-fetch-failed`）。
- **template region fail 降级**：`suggestTemplate` region 渲染抛错 → `console.warn` + 降级为 `suggestion.label` 纯文本（与 select `optionTemplate` 失败路径对称，Failure Path `suggest-template-region-fail`）。
- **no-source-configured**：声明了 `suggestDebounce`/`suggestTrigger` 但未配置 `suggestSource` → dev-warn，浮层不显示（Failure Path `suggest-no-source-configured`）。
- **disabled/readOnly 不触发**：字段 `disabled` 或 `readOnly` 时不派发 refresh，浮层不显示（Failure Path `suggest-disabled-or-readonly`）。
- **multi-value tags input / WebSocket 实时建议 / 本地点过滤**：本 plan 不覆盖（见 successor plan Non-Goals）。

## 13. 响应式行为

引用 `docs/architecture/mobile-responsive-baseline.md`（M0 基线 §3 触摸目标、§6 软键盘视口处理）。

| 断点              | 行为                                                                                                                 | 实现方式                                                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| < 768px (mobile)  | font-size ≥ 16px（防 iOS Safari focus 自动缩放）；focus 时 `scrollIntoView({ block: 'center', behavior: 'smooth' })` | font-size 由 `@nop-chaos/ui` `Input` 基础类 `text-base md:text-sm` 提供（mobile 即 text-base=16px）；scrollIntoView 由 renderer 内 `useIsMobile()` 分支 onFocus 触发 |
| ≥ 768px (desktop) | font-size 14px（text-sm），focus 不强制滚动（行为不变）                                                              | 同上基础类 + 仅 mobile 启用 scrollIntoView                                                                                                                           |

### 触摸适配

- **inputmode 映射**：renderer 根据 `inputType` 自动设置 `<input inputmode>` —— `email→email`、`tel→tel`、`search→search`、`url→url`；`text`/`password` 不设默认 inputmode。schema `inputMode` prop 可覆盖映射值（任意 inputType 均生效）。
- **触摸目标**：input 高度由 `@nop-chaos/ui` Input `data-[size=default]:h-9`（36px）提供；mobile 视口下软键盘正确性优先于 44px hit area（input 本身可点击区域足够）。
- **软键盘**：focus 时 scrollIntoView 保证当前 input 不被软键盘遮挡（mobile only）；iOS 缩放由 font-size ≥ 16px 防止。page-level fixed footer 的 VisualViewport 处理归 M3a（非本组件 scope）。
- **无新 schema surface / 无 mobileUI 标志位**：mobile 分支完全在 renderer 内部，由 `useIsMobile()` 决定。
