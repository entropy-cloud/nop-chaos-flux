# 字段控件统一事件派发 + 事件字段显式声明设计

> 日期：2026-08-03（初稿）→ 2026-08-04（修订：事件字段显式声明驱动 + 非法事件名报错 + onChange/onBlur 事件载荷）
> 状态：设计（待实现）—— §3 已于 2026-08-04 落地（plan 453）；§4 统一事件派发待实现（plan 454）
> 关联：`nop-app-erp/docs/analysis/2026-08-03-gen-control-special-cases-and-flux-solution.md`、`docs/architecture/nested-schema-field-classification.md` §3.5.2

## 1. 背景与问题

ERP view.xml 的 gen-control 大量使用 AMIS 格式的字段联动：

```json
onEvent: { change: { actions: [{ actionType: 'setValue', args: { value: { amount: '${...}' } } }] } }
```

flux 的等价表达是 renderer 声明式事件字段：

```json
onChange: { action: 'setValue', args: { path: 'amount', value: '${...}' } }
```

三个问题：(1) 事件字段靠 `classifyField` 正则 `/^on[A-Z]/` 启发式归类（未声明的 onXxx 也被"合法化"为 event）；(2) 字段控件的值变化**不派发** schema 声明的 `onChange` action（编译过、运行时不触发）；(3) 缺少统一派发层，每个控件要自己调 `props.events`。

## 2. 机制现状（实证）

### 2.1 事件编译与派发机制（存在）

- `node-renderer-resolved.tsx:243-266`：schema 声明的 `event` kind 字段自动编译为 `props.events[key]` 派发函数（`RendererEventHandler = (event?, ctx?) => Promise<ActionResult>`，`renderer-core.ts:174`）。
- renderer **显式调用** `props.events.onClick?.(event)` 才派发（`button.tsx:219` 先例）。
- **renderer 已显式声明大量事件**（fields kind:'event'）：onChange 18 / onClick 14 / onError 9 / onSelectionChange 8 / onLoadError 8 / onClose 8 / onUnmount 7 / onMount 7 / onRefresh 6 / onItemClick 6 / onSelect 4 / onRowClick 4 / onPageChange 4 / onOpen 4 / onLoadMore 4 等。

### 2.2 classifyField 正则的缺陷（需改）

`fields.ts:44`：`if (/^on[A-Z]/.test(key)) return { key, kind: 'event' };` —— **任何** onXxx 都被归为 event，且 `shape-validation-node-fields.ts:221` 对 event kind 分支 `continue`，**跳过 unknown-property 检测**。后果：

- AMIS 遗留的 `onEvent`（事件映射）被"合法化"为 event，编译校验不报错（只报 action 格式错）；
- 未声明的非法事件名（拼写错误、AMIS 特有事件）静默放行。

### 2.3 统一抽象的历史与现状（plan 2026-07-30 遗留）

- **`useFormFieldFromProps` 由 `docs/plans/2026-07-30-field-default-value-and-surface-context-fix.md` 引入**：统一入口（自动提取 value/disabled/required/readOnly + `useDefaultValuePush` 默认值推入），Phase 1-5 已完成并收口。
- **Phase 6「统一迁移 22 个 renderer 到 useFormFieldFromProps」Status: deferred**（optimization candidate，非阻塞）：当时 22 个调用点用手动 `defaultValue: props.props.value` 补齐，功能正确，`useFormFieldFromProps` 成为**死代码**（plan 明确记录"定义了但无人调用"）。**迁移至今未执行**——当前仅 hidden-renderer 使用。
- 本次设计（§4 统一派发）为 Phase 6 迁移提供了**实质动机**（不只是代码整洁性，还承载 onChange/onBlur 事件派发），迁移范围即 plan 的 22 个调用点（12 个 renderer 文件）。

### 2.4 字段控件缺统一派发（缺口）

带 name/value 的字段控件（**12 个 renderer 文件 / 15 个调用点**：input-number/input-text/select/checkbox/switch/date-range 等）通过 `useFormFieldController` 处理值：

- `createFieldHandlers.onChange`（field-handlers.tsx:84-128）：只做 `setValue` + `shouldValidateOn('change')` 校验——**不派发 schema onChange action**；
- 这些控件无一处调用 `props.events.onChange`（flux-renderers-form 内 `props.events` 仅 form.tsx 与 test-support 使用）；
- 现有 `form-input-onchange.test.tsx` 只验证值绑定，不验证 action 派发。

## 3. 设计一：事件字段显式声明驱动（classifyField 改造）

### 3.1 原则

**每个事件都要有定义（声明）**：合法事件 = renderer.fields 显式声明的 `kind:'event'` 字段 **∪** 通用事件词表（flux-core 集中定义）。**不再靠正则启发式合法化**。

### 3.2 通用事件词表（flux-core）

`flux-core/src/constants.ts` 新增（值控件通用事件，集中定义一次，所有 renderer 可用）：

```ts
/** 通用事件词表：值控件（表单字段）统一可用的事件。renderer 特有事件在 renderer.fields 声明。 */
export const COMMON_EVENT_FIELDS = new Set([
  'onChange', // 值变化（字段联动主事件）
  'onBlur', // 失焦
  'onFocus', // 聚焦
  'onKeyDown',
  'onKeyUp',
  'onInput',
]);
```

renderer 特有事件（onClick/onSelectionChange/onRowClick/onPageChange/onLoadMore 等）继续由 **renderer.fields 显式声明**（既有实践，不改）。

### 3.3 classifyField 改造

```ts
export function classifyField(renderer: RendererDefinition, key: string): SchemaFieldRule {
  const explicit = renderer.fields?.find((field) => field.key === key);
  if (explicit) return explicit;
  if (META_FIELDS.has(key)) return { key, kind: 'meta' };
  if (LIFECYCLE_KEYS.has(key)) return { key, kind: 'ignored' };
  if (/^on[A-Z]/.test(key)) {
    // 显式声明驱动：通用词表 ∪ renderer 声明（explicit 已查）才归为 event；否则不归 event（走 unknown-property 检测）
    if (COMMON_EVENT_FIELDS.has(key)) return { key, kind: 'event' };
    return DEFAULT_FIELD_RULES[key] ?? { key, kind: 'prop' };
  }
  return DEFAULT_FIELD_RULES[key] ?? { key, kind: 'prop' };
}
```

### 3.4 编译验证效果（已落地，plan 453）

- 声明的合法事件（onChange/onBlur/onFocus + renderer 特有）→ event kind → `validateActionShape` 校验 action 格式；
- **未声明/不在词表的 onXxx（如 AMIS 遗留 `onEvent`）→ 落回 prop → 走 unknown-property 检测**（`shape-validation-node-fields.ts:246`，closedModel 或 strictMode 时报 `unknown-property`，路径带完整 schema 位置）；
- `getAcceptedSchemaKeys`（shape-validation-utils.ts:34）已补 COMMON_EVENT_FIELDS——词表事件在 closedModel 下不再误报。
- 实现记录：`COMMON_EVENT_FIELDS` 词表（flux-core constants.ts）、`classifyField` 声明驱动（fields.ts）、renderer 事件声明审计（补 `onUploadSuccess`/`onUploadError` 等声明）、`getAcceptedSchemaKeys` 合并词表——见 `docs/plans/453-*.md`。

## 4. 设计二：字段控件统一事件派发（useFormFieldController 扩展）

### 4.1 触发时机（组件库惯例）

React Hook Form / Formik / VeeValidate 一致：**值变化处理器直接触发，validation 独立**（联动不等待校验通过；校验 gate 错误显示/提交，不 gate 联动）。flux 顺序：`值变化 → ① setValue → ② events.onChange 派发 → ③ validateField`。

### 4.2 统一派发点（field-handlers.tsx）

`useFormFieldController` 扩展 `events` 选项；包装 `wrappedHandlers.onChange` **与 `wrappedHandlers.onBlur`（现在就加）**：

```ts
// 事件载荷：字段事件传值变化信息（不传 undefined）
type FieldEventPayload = { name: string; value: unknown };

const wrappedHandlers = {
  ...handlers,
  onChange(nextValue: unknown) {
    if (readOnly) return; // gate：readOnly 不派发
    defaultPush.markUserEdited();
    handlers.onChange(nextValue); // ① setValue + shouldValidateOn('change')
    dispatchFieldEvent('onChange', { name, value: nextValue });
  },
  onBlur() {
    if (readOnly) return;
    handlers.onBlur(); // 既有 touch + shouldValidateOn('blur')
    dispatchFieldEvent('onBlur', { name, value: valueRef.current });
  },
};

function dispatchFieldEvent(eventName: 'onChange' | 'onBlur', payload: FieldEventPayload) {
  const handler = events?.[eventName];
  if (!handler) return;
  void handler(payload, { form: currentForm }).catch((error: unknown) => {
    reportRuntimeHostIssue({
      env: runtime.env,
      level: 'warning',
      message: `${eventName} action failed`,
      error,
      phase: 'action',
      path: name,
    });
  });
}
```

**事件载荷**：`{ name, value }`（值变化信息）。action 内可引用（表达式求值时 scope 已有值，载荷供 handler 读取 name/value）。

**边界**：

- 默认值 push（`useDefaultValuePush`）直接 `setValue`，不走 wrappedHandlers——**不派发 onChange**（避免挂载假联动）；
- action 的 `setValue` 改他字段不回环触发 onChange（reaction/watch 系统的职责）；
- 异步 adapter（当前均同步）：store 写入延后时 action 读到旧值，当前无实际影响。

### 4.3 统一入口：useFormFieldFromProps 透传 events

签名改为 `RendererComponentProps<P>`（含 events），透传 `events: props.events`；带 name/value 的控件统一改走 FromProps（12 文件/15 调用点，可先只传 events 降低风险）。

## 5. 迁移路径

1. **flux-core**：新增 `COMMON_EVENT_FIELDS` 词表；
2. **flux-compiler**：classifyField 改造 + `getAcceptedSchemaKeys` 补词表；测试（未声明 onXxx → unknown-property；onEvent → 报错）；
3. **flux-renderers-form**：useFormFieldController 扩展 events + 包装 onChange/onBlur + useFormFieldFromProps 透传；测试（onChange action 派发、载荷 {name,value}、顺序、默认值不派发、onBlur 派发）；
4. **控件迁移**：12 文件逐个改走 useFormFieldFromProps（= plan 2026-07-30 Phase 6 遗留的 22 个调用点迁移，本次赋予实质动机）（或先传 events）；
5. **应用侧**：ERP view.xml onEvent → onChange（purchase 先行验证联动）。

## 6. 验证

- flux-compiler / flux-renderers-form 全量测试；
- ERP purchase 弹窗：quantity 输入 → amount 联动重算（e2e）；
- 编译校验：onEvent（未声明）报 unknown-property；onChange 的 action 格式由 validateActionShape 校验。
