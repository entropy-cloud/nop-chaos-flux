# Input Password 组件设计

## 1. 组件定位

- `input-password` 是 `input-text` 的密码语义特化版。
- 它主要区别在输入类型、安全显示策略和增强能力（reveal 已落地、strength 已设计待实现）。

## 2. 与 AMIS 或既有产品的能力对照

- amis 仅作参考之一，**非标尺**。能力裁决与决策表见 `input-text/design.md` §2 Flux 决策表（本组件沿用）。
- 当前最小能力与 `input-text` 一致。
- `minLength`/`maxLength`/`pattern` 同 input-text，已实现（双重生效：编译期 `collectSchemaValidationRules` 收集为 validation rule + `createInputRenderer` 透传原生 `<input>` 属性）。详见 `input-text/design.md` §2、§3。
- 显示切换已由 E2a-bis 落地；强度指示已由 G1D 完成设计（§4a，实现归 G1I）；自动生成密码仍属后续增强，不在本文档固化成复杂协议。
- **revealPassword 显示切换** 由 E2a-bis 工作项落地（基础能力，amis 默认开启；`revealPassword: true` 启用，详见 §2/§7/§10）。

### Flux 决策表

> Flux 决策主语。文本输入族共享面（`name`/`placeholder`/`required`/`minLength`/`maxLength`/`pattern` 双重生效/prefix/suffix/clearable/trimContents/showCounter/autoComplete（suggest）/nativeAutoComplete/input-mask/amis `addOn`/amis `transform`/amis `borderMode`/amis `clearValueOnEmpty`/amis 组件级 `api`）见 `input-text/design.md` §2 Flux 决策表，本表只列 input-password **特化差异**。命名对齐 X3 基线（`docs/references/naming-conventions.md`）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                      | 采纳                                                                                                                                                                                                            | 不采纳             | 理由                                                                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTML input type           | **实现**：`type='input-password'` → 渲染 `<input type="password">`                                                                                                                                              | —                  | 密码语义特化；浏览器原生密码输入/凭据管理集成                                                                                                                                          |
| `revealPassword` 显示切换 | **实现**：`revealPassword: true` 时在 InputGroup inline-end addon 渲染 reveal toggle 按钮（Eye/EyeOff），点击切换 `<input type="password">` ↔ `<input type="text">`                                             | —                  | 基础能力，amis 默认开启；明文状态为 `local` UI state，不写入表单值（见 §7）。字段加在共享 `InputSchema`，但仅 input-password renderer 消费（input-text/email 即便声明也不渲染 toggle） |
| 密码强度指示              | **已设计（G1D，2026-10-24）**：`showStrength: true` 启用强度条；能力扩展非新 type，实现归 G1I（`docs/plans/710-arc-g1d-password-strength-design.md`，出处 `docs/backlog/arc-component-gap-roadmap.md` §5.1 G1） | —                  | 注册/改密表单高频能力（Arc `password-strength` 对照）；此前"暂不实现"裁定由 G1D 翻转，规则优先经辅助渲染层接入的原口径由本协议承接                                                     |
| 自动生成密码              | —                                                                                                                                                                                                               | **不采纳**（首版） | 引入随机生成逻辑耦合，后续如有需要按独立 feature plan 评估                                                                                                                             |
| 密码管理器专用字段        | —                                                                                                                                                                                                               | **不采纳**         | 浏览器原生 `autocomplete="current-password"`/`"new-password"` 已覆盖（见 input-text `nativeAutoComplete` 实现）；不在 schema 平行发明                                                  |

## 3. Flux 中的 renderer/type 定义

- `type: 'input-password'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: 标准 scalar field

## 4. schema 设计

- 沿用 `InputSchema`。
- `revealPassword?: boolean`（E2a-bis 新增，字段加在共享 `InputSchema`）—— `true` 时启用 reveal toggle；仅 input-password renderer 消费。
- E3 suggest 字段（`suggestSource`/`suggestDebounce`/`suggestTrigger`/`suggestMinInputLength`/`suggestTemplate`/`suggestEmpty`）声明在共享 `InputSchema`，input-password renderer 共享消费（走 data-source composition 模式 A，详见 `input-text/design.md` §4 E3 新增字段）。密码字段的远程建议场景较少，但契约共享以保证输入族一致性。
- **strength（G1D 已设计，实现归 G1I）**：`showStrength?: boolean`（字段加在共享 `InputSchema`，与 `revealPassword` 同一先例——仅 input-password renderer 消费，input-text/email 即便声明也不渲染强度条）。完整协议见 §4a。

### 4a. `showStrength` 强度指示协议（G1D 设计，实现归 G1I）

**字段**：`showStrength?: boolean`（共享 `InputSchema`，仅 input-password renderer 消费）。命名 pass 结论见 §4b。

**评分规则**（纯 renderer 内派生，无第三方依赖、无异步）：

- 字符类别四类：小写 / 大写 / 数字 / 符号（非字母数字可打印字符）。
- `weak`：长度 < 8，或仅含 1 个字符类别。
- `fair`：长度 ≥ 8 且含 2 个字符类别。
- `good`：长度 ≥ 8 且含 3 个字符类别；或长度 ≥ 10 且含 2 类。
- `strong`：长度 ≥ 12 且含 3 个以上字符类别。
- 空值：不渲染整个强度行（无轨道、无文案）。

**四档配色语义**（一律走语义 token，禁止 raw emerald/amber 类；badge/button-status 测试已强制状态色走 token）：

| 档位   | token           | 文案 i18n key（`flux.common.*`，camelCase，先例 `showPassword`/`hidePassword`） |
| ------ | --------------- | ------------------------------------------------------------------------------- |
| weak   | `--destructive` | `flux.common.pwdStrengthWeak`                                                   |
| fair   | `--warning`     | `flux.common.pwdStrengthFair`                                                   |
| good   | `--secondary`   | `flux.common.pwdStrengthGood`                                                   |
| strong | `--success`     | `flux.common.pwdStrengthStrong`                                                 |

强度条文案标签的可见文本 i18n key：`flux.common.pwdStrengthLabel`（"Password strength"）。

**落位与 DOM marker**：强度条渲染在 `InputGroup` **下方独立行**（不在 inline-end addon 内——addon 已承载 suffix → counter → clear → reveal 四元素，强度属状态展示行，与 description/error 同侧）。结构：

- 根：`<div data-slot="input-password-strength">`（4 段轨道，每段 `<span data-slot="input-password-strength-segment" data-level="weak|fair|good|strong" data-active="true|false">`）。
- 文案：`<span data-slot="input-password-strength-label">`（i18n 文案，随档位变色）。

**a11y**：

- 轨道容器 `role="meter"` + `aria-label={pwdStrengthLabel}` + `aria-valuemin=0` / `aria-valuemax=4` / `aria-valuenow={1..4}`（档位序号）。
- `<input>` 增加 `aria-describedby` 指向 label 元素 id（与既有 description/error describedby 链拼接，不覆盖）；label 元素 `aria-live="polite"`（输入过程中档位变化播报）。

**与校验链的关系**：强度指示是**纯展示性反馈**，不参与 validation rule 收集、不产生错误态、不阻断提交；`pattern` / `required` / minLength 等校验照常独立生效（强度高 + `pattern` 失败时强度条与校验错误并存，见 Failure Path）。`disabled` / `readOnly` 时强度条随当前值静态展示。

### 4b. 命名 pass（对照 `docs/references/naming-conventions.md` §1/§2）

- **采纳 `showStrength`**：肯定式布尔（与 `showCounter`/`clearable`/`searchable` 同式）；该字段名系 G1D 之前本文档 §4 的既存预留（"优先使用 `showStrength` 这类直接语义字段"），roadmap §5.1 G1 一致性分析确认沿用。
- 拒绝 `strengthIndicator` / `strengthMeter`：把 UI 呈现形态写进 schema 名，违反"直接语义字段"预留口径。
- 拒绝 `passwordStrength`：组件本身即 password，前缀冗余；且该词指"强度的值"（名词），而字段语义是"是否显示"（开关）。
- 拒绝 `strengthLevel`（数字 0–4 输入）：强度是 renderer 派生结果不是作者输入，禁止组件级受控覆盖。

## 5. 字段分类

- 与 `input-text` 相同。

## 6. regions 与 slot 约定

- 与 `input-text` 相同。

## 7. 运行期状态归属

- 字段值归 form runtime。
- `revealPassword` 的明文态（`<input type>` 切换）是 **local UI state**（`useState`），不写入表单值，不调用 `handlers.onChange`，不参与提交；toggle 仅改变原生 input type。
- `revealPassword` toggle 的可点击态跟随 `presentation.interactive`（与 clearable 同源）；disabled / readOnly 时 reveal button `disabled`，点击无响应。

## 8. 事件、动作与组件句柄能力

- 与 `input-text` 相同（X1 起共享 `createInputRenderer` 工厂，同样发布 `component:clear`/`reset`/`focus`）。

## 9. 数据源、表达式、导入能力接入点

- `placeholder`、`disabled` 等可接表达式。
- 密码强度反馈不走 validation 通道：`showStrength` 强度条为纯展示派生（§4a）；安全策略类强校验仍归 validation rule（`pattern` 等）。

## 10. 样式与 DOM marker 约定

- 输出 `nop-input-password` marker（控件根，随增强路径切换保持），并复用共享 field frame。
- `revealPassword: true` 时包裹 `InputGroup`（即便无其他增强），reveal toggle 渲染在 inline-end addon，DOM marker：`<button data-slot="input-password-reveal">`（含 `aria-pressed`/`aria-label`）。end addon 子元素顺序：suffix → counter → clear button → reveal button。
- reveal button 用 `InputGroupButton`（ghost, `icon-xs`）+ `Eye`/`EyeOff`（lucide-react）；`aria-pressed={revealed}`，`aria-label` 随态切换（`Show password` / `Hide password`）。

## 11. 实现拆分建议

- 保持在通用 input renderer 体系中，通过 type 参数驱动差异。

## 12. 风险、取舍与后续阶段

- reveal、password manager 集成等增强功能需要谨慎引入，避免把密码输入演变为复杂 widget。（勘误：原文将 strength 与上述增强并列为"需谨慎引入"；G1D 已裁决 strength 以最小协议落地，见 §4a，历史表述不再成立。）
- `revealPassword` 字段加在共享 `InputSchema` 是为复用 E2a `inputEnhancementFieldRules` + renderer 层分支的一致性，代价是 input-text/email schema 也能声明该字段；约束为"仅 input-password renderer 消费"，schema 层不阻止（Failure Path `e2abis-reveal-non-password`）。
- `revealPassword` 明文态为组件 local state，**不持久化**（组件卸载/重新挂载后回到 `password`）、**不写入表单值**（切换 toggle 不触发 `onChange`，提交值始终是密码字符串本身）。
- `showStrength` 强度评分为**纯派生值**（每轮渲染由当前值即时计算），不引入 local state、不写入表单值、不参与提交与校验（§4a）。
- reveal toggle 的自定义 icon / 文案 / 位置 schema 首版固定（Eye/EyeOff + inline-end addon），自定义归 E3。
