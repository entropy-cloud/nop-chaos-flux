# Input Password 组件设计

## 1. 组件定位

- `input-password` 是 `input-text` 的密码语义特化版。
- 它主要区别在输入类型、安全显示策略和后续可能的 reveal/strength 能力。

## 2. 与 AMIS 或既有产品的能力对照

- amis 仅作参考之一，**非标尺**。能力裁决与决策表见 `input-text/design.md` §2 Flux 决策表（本组件沿用）。
- 当前最小能力与 `input-text` 一致。
- `minLength`/`maxLength`/`pattern` 同 input-text，已实现（双重生效：编译期 `collectSchemaValidationRules` 收集为 validation rule + `createInputRenderer` 透传原生 `<input>` 属性）。详见 `input-text/design.md` §2、§3。
- 显示切换、强度提示和自动生成密码属于后续增强，不应在首版文档里直接固化成复杂协议。
- **revealPassword 显示切换** 由 E2a-bis 工作项落地（基础能力，amis 默认开启；`revealPassword: true` 启用，详见 §2/§7/§10）。

### Flux 决策表

> Flux 决策主语。文本输入族共享面（`name`/`placeholder`/`required`/`minLength`/`maxLength`/`pattern` 双重生效/prefix/suffix/clearable/trimContents/showCounter/autoComplete/nativeAutoComplete/input-mask/amis `addOn`/amis `transform`/amis `borderMode`/amis `clearValueOnEmpty`/amis 组件级 `api`）见 `input-text/design.md` §2 Flux 决策表，本表只列 input-password **特化差异**。命名对齐 X3 基线（`docs/references/naming-conventions.md`）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                      | 采纳                                                                                                                                                                | 不采纳             | 理由                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTML input type           | **实现**：`type='input-password'` → 渲染 `<input type="password">`                                                                                                  | —                  | 密码语义特化；浏览器原生密码输入/凭据管理集成                                                                                                                                          |
| `revealPassword` 显示切换 | **实现**：`revealPassword: true` 时在 InputGroup inline-end addon 渲染 reveal toggle 按钮（Eye/EyeOff），点击切换 `<input type="password">` ↔ `<input type="text">` | —                  | 基础能力，amis 默认开启；明文状态为 `local` UI state，不写入表单值（见 §7）。字段加在共享 `InputSchema`，但仅 input-password renderer 消费（input-text/email 即便声明也不渲染 toggle） |
| 密码强度指示              | **暂不实现**                                                                                                                                                        | —                  | 后续按需；密码强度规则优先通过验证或辅助渲染层接入（见 §9）                                                                                                                            |
| 自动生成密码              | —                                                                                                                                                                   | **不采纳**（首版） | 引入随机生成逻辑耦合，后续如有需要按独立 feature plan 评估                                                                                                                             |
| 密码管理器专用字段        | —                                                                                                                                                                   | **不采纳**         | 浏览器原生 `autocomplete="current-password"`/`"new-password"` 已覆盖（见 input-text `nativeAutoComplete` 实现）；不在 schema 平行发明                                                  |

## 3. Flux 中的 renderer/type 定义

- `type: 'input-password'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: 标准 scalar field

## 4. schema 设计

- 沿用 `InputSchema`。
- `revealPassword?: boolean`（E2a-bis 新增，字段加在共享 `InputSchema`）—— `true` 时启用 reveal toggle；仅 input-password renderer 消费。
- 后续如果增加 strength，优先使用 `showStrength` 这类直接语义字段。

## 5. 字段分类

- 与 `input-text` 相同。

## 6. regions 与 slot 约定

- 与 `input-text` 相同。

## 7. 运行期状态归属

- 字段值归 form runtime。
- `revealPassword` 的明文态（`<input type>` 切换）是 **local UI state**（`useState`），不写入表单值，不调用 `handlers.onChange`，不参与提交；toggle 仅改变原生 input type。
- `revealPassword` toggle 的可点击态跟随 `presentation.interactive`（与 clearable 同源）；disabled / readOnly 时 reveal button `disabled`，点击无响应。

## 8. 事件、动作与组件句柄能力

- 与 `input-text` 相同。

## 9. 数据源、表达式、导入能力接入点

- `placeholder`、`disabled` 等可接表达式。
- 密码强度规则优先通过验证或辅助渲染层接入。

## 10. 样式与 DOM marker 约定

- 建议输出 `nop-input-password` marker，并复用共享 field frame。
- `revealPassword: true` 时包裹 `InputGroup`（即便无其他增强），reveal toggle 渲染在 inline-end addon，DOM marker：`<button data-slot="input-password-reveal">`（含 `aria-pressed`/`aria-label`）。end addon 子元素顺序：suffix → counter → clear button → reveal button。
- reveal button 用 `InputGroupButton`（ghost, `icon-xs`）+ `Eye`/`EyeOff`（lucide-react）；`aria-pressed={revealed}`，`aria-label` 随态切换（`Show password` / `Hide password`）。

## 11. 实现拆分建议

- 保持在通用 input renderer 体系中，通过 type 参数驱动差异。

## 12. 风险、取舍与后续阶段

- reveal、strength、password manager 集成等增强功能需要谨慎引入，避免把密码输入演变为复杂 widget。
- `revealPassword` 明文态为组件 local state，**不持久化**（组件卸载/重新挂载后回到 `password`）、**不写入表单值**（切换 toggle 不触发 `onChange`，提交值始终是密码字符串本身）。
- `revealPassword` 字段加在共享 `InputSchema` 是为复用 E2a `inputEnhancementFieldRules` + renderer 层分支的一致性，代价是 input-text/email schema 也能声明该字段；约束为"仅 input-password renderer 消费"，schema 层不阻止（Failure Path `e2abis-reveal-non-password`）。
- reveal toggle 的自定义 icon / 文案 / 位置 schema 首版固定（Eye/EyeOff + inline-end addon），自定义归 E3。
