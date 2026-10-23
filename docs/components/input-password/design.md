# Input Password 组件设计

## 1. 组件定位

- `input-password` 是 `input-text` 的密码语义特化版。
- 它主要区别在输入类型、安全显示策略和后续可能的 reveal/strength 能力。

## 2. 与 AMIS 或既有产品的能力对照

- amis 仅作参考之一，**非标尺**。能力裁决与决策表见 `input-text/design.md` §2 Flux 决策表（本组件沿用）。
- 当前最小能力与 `input-text` 一致。
- `minLength`/`maxLength`/`pattern` 同 input-text，已实现（双重生效：编译期 `collectSchemaValidationRules` 收集为 validation rule + `createInputRenderer` 透传原生 `<input>` 属性）。详见 `input-text/design.md` §2、§3。
- 显示切换（已实现）与自动生成密码属于后续增强，不应在首版文档里直接固化成复杂协议；强度提示契约已定稿（`showStrength`，实现随 arc-component-gap G1I 落地，见 §2/§4/§10）。
- **revealPassword 显示切换** 由 E2a-bis 工作项落地（基础能力，amis 默认开启；`revealPassword: true` 启用，详见 §2/§7/§10）。

### Flux 决策表

> Flux 决策主语。文本输入族共享面（`name`/`placeholder`/`required`/`minLength`/`maxLength`/`pattern` 双重生效/prefix/suffix/clearable/trimContents/showCounter/autoComplete（suggest）/nativeAutoComplete/input-mask/amis `addOn`/amis `transform`/amis `borderMode`/amis `clearValueOnEmpty`/amis 组件级 `api`）见 `input-text/design.md` §2 Flux 决策表，本表只列 input-password **特化差异**。命名对齐 X3 基线（`docs/references/naming-conventions.md`）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                      | 采纳                                                                                                                                                                | 不采纳                           | 理由                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTML input type           | **实现**：`type='input-password'` → 渲染 `<input type="password">`                                                                                                  | —                                | 密码语义特化；浏览器原生密码输入/凭据管理集成                                                                                                                                          |
| `revealPassword` 显示切换 | **实现**：`revealPassword: true` 时在 InputGroup inline-end addon 渲染 reveal toggle 按钮（Eye/EyeOff），点击切换 `<input type="password">` ↔ `<input type="text">` | —                                | 基础能力，amis 默认开启；明文状态为 `local` UI state，不写入表单值（见 §7）。字段加在共享 `InputSchema`，但仅 input-password renderer 消费（input-text/email 即便声明也不渲染 toggle） |
| 密码强度指示              | **实现**：`showStrength: true` 时在输入框下方渲染强度条（meter）：4 段 + 等级词，本地规则计分（见 §4/§10），纯展示反馈                                              | Arc 规则勾选清单 UI、motion 动效 | 规则清单属组合层职责，非 renderer 最小能力（`design.md` 首版原则）；本仓无动效引擎，过渡走 styling-system 现有约定（arc-component-gap §5.4 动效边界）；熵计算依赖零新增                |
| 自动生成密码              | —                                                                                                                                                                   | **不采纳**（首版）               | 引入随机生成逻辑耦合，后续如有需要按独立 feature plan 评估                                                                                                                             |
| 密码管理器专用字段        | —                                                                                                                                                                   | **不采纳**                       | 浏览器原生 `autocomplete="current-password"`/`"new-password"` 已覆盖（见 input-text `nativeAutoComplete` 实现）；不在 schema 平行发明                                                  |

## 3. Flux 中的 renderer/type 定义

- `type: 'input-password'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`
- 当前 validation contributor: 标准 scalar field

## 4. schema 设计

- 沿用 `InputSchema`。
- `revealPassword?: boolean`（E2a-bis 新增，字段加在共享 `InputSchema`）—— `true` 时启用 reveal toggle；仅 input-password renderer 消费。
- E3 suggest 字段（`suggestSource`/`suggestDebounce`/`suggestTrigger`/`suggestMinInputLength`/`suggestTemplate`/`suggestEmpty`）声明在共享 `InputSchema`，input-password renderer 共享消费（走 data-source composition 模式 A，详见 `input-text/design.md` §4 E3 新增字段）。密码字段的远程建议场景较少，但契约共享以保证输入族一致性。
- `showStrength?: boolean`（arc-component-gap G1 新增，字段加在共享 `InputSchema`）——`true` 时启用强度条；仅 input-password renderer 消费（`revealPassword` 同款先例：schema 层不阻止 input-text/email 声明，但只有 input-password renderer 渲染）。等级阈值与文案首版固定，不做 schema 化（同 reveal icon 先例 §12）。
- **强度等级算法**（本地确定性规则计分，value 的纯函数）：
  - 值为空 → 强度条整体不渲染；
  - 非空且长度 < 6 → level 0（太短）；
  - 否则 level = max(1, 满足计数)，计数四条目：长度 ≥ 8 / 同时含小写与大写字母 / 含数字 / 含符号（非字母数字字符）；计数 0–4 → level 落在 1–4。长度读法 = JS `.length`（UTF-16 code units）。
- **meter 解剖**：固定 4 段；填充段数 = max(1, level)（level 0 与 level 1 同为 1 段填充，由等级词与 `aria-valuenow` 区分）；所有填充段统一取当前 level 的颜色，未填充段 `bg-muted`。
- **颜色语义**（等级 → 语义 token 工具类，禁原始色板色号）：level 0–1 `bg-destructive`、level 2 `bg-warning`、level 3–4 `bg-success`（对应 `@nop-chaos/theme-tokens` 的 `--destructive`/`--warning`/`--success` 族，与 alert renderer 语义色用法同源）。
- **a11y**：meter 容器 `role="meter"` + `aria-valuemin={0}` + `aria-valuemax={4}` + `aria-valuenow={level}` + `aria-valuetext`=等级词，`aria-label` 走 `flux.common.passwordStrength`（不可见）。**不改** input 的 `aria-describedby`——该链归 field frame 错误引用所有（有 pin 测试），强度条以 DOM 顺序紧随输入框成为可及读出。
- **与校验的关系**：强度条是纯展示反馈，不参与校验、不阻塞提交、不写表单值；强度策略强制走 `pattern`/`validate`（校验链既有职责）。`showStrength` 与 `pattern` 相互独立：声明 `pattern` 不影响等级计算，强度条不计入 `required`/`pattern` 的任何校验结论。

## 5. 字段分类

- 与 `input-text` 相同。

## 6. regions 与 slot 约定

- 与 `input-text` 相同。

## 7. 运行期状态归属

- 字段值归 form runtime。
- `revealPassword` 的明文态（`<input type>` 切换）是 **local UI state**（`useState`），不写入表单值，不调用 `handlers.onChange`，不参与提交；toggle 仅改变原生 input type。
- `revealPassword` toggle 的可点击态跟随 `presentation.interactive`（与 clearable 同源）；disabled / readOnly 时 reveal button `disabled`，点击无响应。
- `showStrength` 的强度等级是**渲染期派生值**（当前 value 的纯函数），不是 local state、不写表单值、不触发 `onChange`/`handlers`；值变化时随渲染直接重算。强度条是只读展示（无交互面），disabled / readOnly 态照常渲染（它是值的读出，不是控件）。

## 8. 事件、动作与组件句柄能力

- 与 `input-text` 相同（X1 起共享 `createInputRenderer` 工厂，同样发布 `component:clear`/`reset`/`focus`）。

## 9. 数据源、表达式、导入能力接入点

- `placeholder`、`disabled` 等可接表达式。
- 密码强度**规则强制**优先通过验证接入（`pattern`/`validate` 既有链）；`showStrength` 强度条是**纯展示辅助渲染层**（见 §4），二者独立、互不依赖。

## 10. 样式与 DOM marker 约定

- 输出 `nop-input-password` marker（控件根，随增强路径切换保持），并复用共享 field frame。
- `revealPassword: true` 时包裹 `InputGroup`（即便无其他增强），reveal toggle 渲染在 inline-end addon，DOM marker：`<button data-slot="input-password-reveal">`（含 `aria-pressed`/`aria-label`）。end addon 子元素顺序：suffix → counter → clear button → reveal button。
- reveal button 用 `InputGroupButton`（ghost, `icon-xs`）+ `Eye`/`EyeOff`（lucide-react）；`aria-pressed={revealed}`，`aria-label` 随态切换（`Show password` / `Hide password`）。
- `showStrength: true` 时在输入框（组）下方整行渲染强度条，marker：容器 `nop-input-password-strength` + `data-slot="input-password-strength"`（`role="meter"`）；`data-slot="input-password-strength-segment"`（4 段，aria-hidden）；`data-slot="input-password-strength-label"`（等级词，同值兼 `aria-valuetext`）。widget 自绘（renderer 包内实现，不新增 ui primitive）。
- 强度 i18n key：`flux.common.passwordStrength`（meter `aria-label`）+ `flux.common.passwordStrengthTooShort` / `passwordStrengthWeak` / `passwordStrengthFair` / `passwordStrengthGood` / `passwordStrengthStrong`（等级词，zh：密码强度/太短/弱/一般/良好/强；en：Password strength/Too short/Weak/Fair/Good/Strong）。

## 11. 实现拆分建议

- 保持在通用 input renderer 体系中，通过 type 参数驱动差异。

## 12. 风险、取舍与后续阶段

- reveal、strength、password manager 集成等增强功能需要谨慎引入，避免把密码输入演变为复杂 widget。
- `showStrength`（arc-component-gap G1）首版固定：4 段 meter、规则计分算法（§4）、语义 token 三色带、五级 i18n 词表均不做 schema 化——宿主要求不同强度策略时走 `validate` 自定义校验，不改强度条。强度计分为本地启发式，不承诺安全强度结论（安全策略仍是后端/校验层职责）；对照 Arc `password-strength`：不采纳其规则勾选清单与 motion 动效（无动效引擎，§12 首条）。
- `revealPassword` 明文态为组件 local state，**不持久化**（组件卸载/重新挂载后回到 `password`）、**不写入表单值**（切换 toggle 不触发 `onChange`，提交值始终是密码字符串本身）。
- `revealPassword` 字段加在共享 `InputSchema` 是为复用 E2a `inputEnhancementFieldRules` + renderer 层分支的一致性，代价是 input-text/email schema 也能声明该字段；约束为"仅 input-password renderer 消费"，schema 层不阻止（Failure Path `e2abis-reveal-non-password`）。
- reveal toggle 的自定义 icon / 文案 / 位置 schema 首版固定（Eye/EyeOff + inline-end addon），自定义归 E3。
