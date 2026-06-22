# Input Number 组件设计

## 1. 组件定位

- `input-number` 是标准数字字段 renderer。
- 它承接数值输入、步进、范围约束与精度控制，不把货币、百分比、滑块等专门语义混进一个通用字段。

## 2. Flux 决策表（X5 扩展，E3）

- 对应 AMIS `input-number`，并吸收 `native-number` 这类宿主原生变体为同一 canonical family。
- Flux 正式契约优先对齐当前 field 体系与 UI primitive 命名，不保留历史 `readOnlyMode` 一类兼容噪音作为首版主轴。
- 列主语为 Flux 自身能力（不以 AMIS 为标尺），裁决记入下表。

| 能力                                                     | 首版决定       | 理由                                                                                                                                                  |
| -------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `min` / `max`                                            | **实现**       | 数字字段标配范围约束。                                                                                                                                |
| `step`                                                   | **实现**       | 步进器标配。                                                                                                                                          |
| `precision`                                              | **实现**       | 控制小数精度，数值字段必备。                                                                                                                          |
| `showStepper`（AMIS `showSteps`）                        | **实现**       | 步进按钮开关；命名对齐 shadcn/ui 风格（`showStepper` 而非 `showSteps`）。                                                                             |
| `prefix` / `suffix`                                      | **实现**       | 单位展示（如 "¥"、"$"、"%"、"px"）。                                                                                                                  |
| `keyboard`                                               | **实现**       | 键盘上下键单步，交互标配。                                                                                                                            |
| `placeholder`                                            | **实现**       | 继承自通用字段行为。                                                                                                                                  |
| `readOnly`                                               | **实现**       | 继承自 `BoundFieldSchemaBase`。                                                                                                                       |
| **长按连续步进**（stepper 按钮按住不放 → 连续递增/递减） | **实现**（E3） | 数字输入刚需；amis `rc-input-number` 内建能力。复用 `handleStep` 的 clamp+precision，不绕过 min/max。时序见下方 Decision。                            |
| `borderMode`                                             | 不采纳         | AMIS 皮肤变体，与 shadcn/ui 风格不匹配。                                                                                                              |
| `unitOptions`                                            | 不采纳         | 单位选择复杂，与 select 组件重叠，可用 `suffix` + `select` 组合替代。                                                                                 |
| `big`                                                    | 不采纳         | JS BigInt 场景窄；Flux 数值字段以 `number` 为契约，需 BigInt 时另立 `input-big` renderer，不在本字段透传。后续按需加。                                |
| `kilobitSeparator`                                       | 不采纳         | 千分位格式化属于 formatter 层，可由表达式或后处理完成；混入会破坏 `number` 值契约。                                                                   |
| `displayMode`（AMIS `'enhance'` 增强视觉）               | 不采纳         | AMIS 特有增强视觉风格，与 shadcn/ui 美学冲突。                                                                                                        |
| `showAsPercent`                                          | 不采纳         | 百分比是 `suffix` 的特化形式，用 `suffix: "%"` 替代；不引入平行字段以避免双真值源。                                                                   |
| `clearValueOnEmpty`                                      | 不采纳         | 通用字段行为，由 form 层统一处理（空输入统一归一为 `undefined`）。                                                                                    |
| `formatter` / `parser`                                   | 不采纳（后续） | 自定义格式化/解析会引入 display value 与 form value 双轨，需独立 adapter 协议；当前 `number` + `precision` 已覆盖数值字段核心，formatter 归后续评估。 |

**Decision（长按连续步进时序，E3）**：stepper 按钮 `onPointerDown` → 启动**初始延迟 `400ms`** timer → 延迟到达后切换为**重复间隔 `80ms`** 的间隔 timer，每次复用 `handleStep(direction)`（含 clamp+precision，不绕过 min/max）；越界（clamp 到 min/max）后**立即停止连续步进**（不溢出，Failure Path `longpress-clamp`）。取消路径：`onPointerUp` / `onPointerLeave` / `onBlur` / `ESC` 清理 timer（Failure Path `longpress-cancel`）。短按（pointer-up 在初始延迟内）保持 `onClick` 单步兼容；若 pointer-up 发生在连续步进已启动之后，用 `steppedViaLongPressRef` 守卫抑制后续 `onClick` 的多余单步。`onPointerDown` 调 `event.preventDefault()` 避免 text selection。时序常数（400ms/80ms）参考业界 input-number 控件默认值（amis/antd 一致区间），可在不破坏契约前提下调整。

## 3. Flux 中的 renderer/type 定义

- `type: 'input-number'`
- 归属 `@nop-chaos/flux-renderers-form`
- `wrap: true`

## 4. Schema 设计

```typescript
interface InputNumberSchema extends BoundFieldSchemaBase {
  type: 'input-number';
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  prefix?: string;
  suffix?: string;
  showStepper?: boolean;
  keyboard?: boolean;
  validate?: {
    action?: ActionSchema;
    debounce?: number;
    message?: string;
  };
  hiddenFieldPolicy?: HiddenFieldPolicy;
}
```

### 字段默认值

| 字段          | 默认值 | 说明                         |
| ------------- | ------ | ---------------------------- |
| `step`        | `1`    | 步长默认为 1                 |
| `precision`   | 不限   | undefined 表示不限制小数位数 |
| `showStepper` | `true` | 默认显示步进按钮             |
| `keyboard`    | `true` | 默认启用键盘上下键步进       |

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`placeholder`、`min`、`max`、`step`、`precision`、`prefix`、`suffix`、`showStepper`、`keyboard`、`required`: `value`
- `validate`: `value`
- `onChange`: `event`

## 6. ValueAdapter 设计

### numberAdapter

需要一个 `numberAdapter` 负责表单值与渲染值之间的类型转换：

- `in(external)`: `null`/`undefined` → `undefined`（渲染层用 undefined 表示空）；`string` → `Number(string)` 或 `undefined`（无效字符串）；`number` → 原值
- `out(internal)`: `undefined`/`null`/`''` → `undefined`（清空表单值）；`number` → 原值
- `validate`: 检查值是否为有效数字（非 NaN）

### min/max/step 约束

min/max 约束不放在 adapter 的 validate 中，而是放在渲染器内部的 clamp 逻辑中：

- 用户输入时，将值 clamp 到 `[min, max]` 范围
- 步进时（点击按钮或键盘），值在 `[min, max]` 范围内按 step 步进
- precision 控制输出值的小数位数（`toFixed` 处理）

## 7. regions 与 slot 约定

- `label` 继续复用统一 field frame 语义。
- `input-number` 不额外开放自由 regions。

## 8. 运行期状态归属

- 值、错误、dirty、touched、validating 继续归最近的 `FormRuntime`。
- 无 form 时退回当前 scope owner。

## 9. 事件、动作与组件句柄能力

- 数值变化继续通过标准字段写回路径完成。
- X1 起落地 `component:clear`/`reset`/`focus` handle。renderer definition 已发布 `componentCapabilityContracts`：
  - `clear`：清空数值到 `undefined`。
  - `reset`：还原到 mount 时捕获的 initial value（无 initial 时 `{ok:true, fellBackToDefault:true}`）。
  - `focus`：focus 底层 `<input type="number">`。
- 详见 `docs/references/component-handle-vocabulary.md`。

## 10. 数据源、表达式、导入能力接入点

- `placeholder`、`min`、`max`、`disabled` 等字段可由表达式求值。
- 绑定入口仍是 `name`，不新增平行 `valueSource` 协议。

## 11. 样式与 DOM marker 约定

- 根节点输出 `nop-input-number` marker。
- 步进按钮区域输出 `data-slot="stepper"` marker。
- 步进减按钮输出 `data-slot="stepper-decrease"` marker。
- 步进加按钮输出 `data-slot="stepper-increase"` marker。
- 前缀区域输出 `data-slot="prefix"` marker。
- 后缀区域输出 `data-slot="suffix"` marker。
- 视觉层应复用 `@nop-chaos/ui` Input 组件组合。
- 长按连续步进（E3）：stepper 按钮 `onPointerDown` 启动初始延迟 `400ms` + 重复间隔 `80ms`；`onPointerUp`/`onPointerLeave`/`onBlur` 取消；越界 clamp 后停止。短按保持 `onClick` 单步；长按释放后用 `steppedViaLongPressRef` 守卫抑制多余 `onClick` 单步。

## 12. 实现拆分建议

- 通用字段值读写与校验继续放在共享 field utils。
- `numberAdapter` 放在 `flux-core/src/value-adapter.ts`，与 `stringAdapter`/`booleanStringAdapter` 并列。
- 数值 clamp 和 precision 格式化工具函数放在渲染器内部。

## 13. 风险、取舍与后续阶段

- 主要风险是把 `input-number` 再次做成"所有数值场景"的大一统字段，导致 slider、currency、rating 等边界再次模糊。
- 首版明确不包含 unitOptions、big、kilobitSeparator、displayMode、showAsPercent。

## 14. 测试覆盖计划

每个特性对应至少一个测试用例：

| 特性              | 测试用例                                  |
| ----------------- | ----------------------------------------- |
| 基础渲染          | 渲染 type=number 的 Input，初始值正确显示 |
| 空值处理          | undefined/null/空字符串均显示为空输入框   |
| 值绑定            | 输入数字后表单值正确更新为 number 类型    |
| 非数字输入        | 输入非数字字符时不更新表单值              |
| min 约束          | 步进/输入低于 min 时 clamp 到 min         |
| max 约束          | 步进/输入高于 max 时 clamp 到 max         |
| step 步进         | 步进按钮按 step 值递增/递减               |
| precision 精度    | 输出值按 precision 截断小数位             |
| showStepper=false | 不渲染步进按钮                            |
| prefix 显示       | 前缀文本正确渲染在输入框内                |
| suffix 显示       | 后缀文本正确渲染在输入框内                |
| keyboard=false    | 键盘上下键不触发步进                      |
| disabled          | 禁用状态下不可输入、不可步进              |
| readOnly          | 只读状态下显示值但不可编辑                |
| placeholder       | 空值时显示 placeholder                    |
| required 校验     | 必填时提交前校验错误显示                  |

## 15. 响应式行为

引用 `docs/architecture/mobile-responsive-baseline.md`（M0 基线 §3 触摸目标、§6 软键盘视口处理）。

| 断点              | 行为                                                                                                                 | 实现方式                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| < 768px (mobile)  | font-size ≥ 16px（防 iOS Safari focus 自动缩放）；focus 时 `scrollIntoView({ block: 'center', behavior: 'smooth' })` | font-size 由 `@nop-chaos/ui` `Input` 基础类 `text-base md:text-sm` 提供；scrollIntoView 由 renderer 内 `useIsMobile()` 分支 onFocus 触发 |
| ≥ 768px (desktop) | font-size 14px（text-sm），focus 不强制滚动（行为不变）                                                              | 同上基础类 + 仅 mobile 启用 scrollIntoView                                                                                               |

### 触摸适配

- **inputmode**：默认 `<input inputmode="decimal">`（移动端弹出含小数点的数字键盘）；schema `inputMode` prop 可覆盖（如 `'numeric'`）。
- **stepper 触摸目标**：stepper +/- 按钮在桌面为小尺寸（`h-4 w-6`），mobile 长按连续步进（LONG_PRESS）已支持；icon-only hit area 增强归 Non-Blocking Follow-up。
- **软键盘**：focus 时 scrollIntoView 保证当前 input 不被软键盘遮挡（mobile only）；iOS 缩放由 font-size ≥ 16px 防止。
- **无新 schema surface / 无 mobileUI 标志位**：mobile 分支完全在 renderer 内部，由 `useIsMobile()` 决定。
