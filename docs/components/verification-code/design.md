# verification-code

> Status: runtime（missing-components L2.4，plan 508，2026-09-25 flip）
> Owner package: `@nop-chaos/flux-renderers-form`
> ui primitive: `@nop-chaos/ui` `InputOTP`（registration debt——基元先于 type 存在）
> AMIS 源 type: `input-verification-code`（`InputOTP` 系 antd/shadcn 命名）

## 1. 组件定位

OTP 验证码输入控件：`length` 个格子、输入自动跳格，值 = 完整验证码字符串。用于短信/邮箱验证码、二次验证场景。**值语义不变式：输入长度 < `length` ⇔ 值 `undefined`**——齐位提交后回退删位，值一律回落 undefined；陈旧已提交码永不保留。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS `input-verification-code`：单元格数量、自动聚焦、完成事件。本实现对齐公共核心；AMIS 的 status/发送按钮编排由 host `xui:actions` 承担。
- antd/shadcn `InputOTP`：ui 基元即此命名；本 renderer 消费其 `maxLength` 通路 + 槽位渲染（零 ui 改动）。

## 3. Flux 中的 renderer/type 定义

`type: 'verification-code'`，定义于 `renderers/verification-renderer-definitions.ts`（`inputVerificationRendererDefinition`），组件 `VerificationCodeRenderer`，`wrap: true`。

## 4. schema 设计

```json
{
  "type": "verification-code",
  "name": "smsCode",
  "label": "短信验证码",
  "length": 6,
  "masked": true
}
```

`VerificationCodeSchema` extends InputSchema（`src/schemas-verification.ts`）。`length` 默认 6；非正数/非整数 → 6（无上界钳制，lib `maxLength` 无上界）。`masked` 经容器 Tailwind arbitrary 类把槽字符置透明（input-otp@1.4.2 无 `mask` prop，CSS 等价实现）。

## 5. 字段分类

- 值字段：`name`（必绑）、`value`（完整码字符串 | undefined）。
- 呈现 prop：`label`/`length`/`masked`/`placeholder`/`description`/`readOnly`/`required`/`disabled`。

## 6. regions 与 slot 约定

无 region。

## 7. 运行期状态归属

- 值：form 字段（`stringAdapter`）。
- 中间输入文本：lib `input-otp` 内部状态（**renderer 故意非受控**——受控值经不变式门控会在每次中间键入时重置格子）；提交经 `handlers.onChange`。

## 8. 事件、动作与组件句柄能力

组件句柄：`clear`（清空并提交 undefined）、`reset`（回绑当前值）、`focus`（聚焦首个格子）。lib 的 `onComplete` 语义由不变式覆盖（齐位即值）。

## 9. 数据源、表达式、导入能力接入点

无外部数据源。IO 零需求（INV-1/2 不涉）。

## 10. 样式与 DOM marker 约定

ui InputOTP 自带 `data-slot="input-otp|input-otp-group|input-otp-slot"` 体系 + 本组件 `nop-verification-code-field` 根类、`data-masked` 标记、`data-testid="verification-code-slot-{i}"`；masked 的槽字符透明经容器 Tailwind arbitrary 类实现；无 BEM。

## 11. 实现拆分建议

单文件 `verification-code-renderer.tsx` + 定义模块分立（先例同 signature）。关键点：①renderer 对 lib **故意非受控**（不传 `value`——受控值经不变式门控会在每次中间键入重置格子）；②`length` → `maxLength` + n×Slot；③e2e 键入用 `page.keyboard.type`（信任事件），单测用 `fireEvent.change` + tracker 重置（React 受控输入的测试惯例）。

## 12. 风险、取舍与后续阶段

- v1 取舍：非受控（外部值回显不反映到格子）；无发送倒计时；`length` 无上界。
- 风险：lib `maxLength` 无上界 → 超大 `length` 渲染大量格子（host 自律）。

## 13. 响应式行为

格子固定 `size-8`，容器 flex；窄容器自然换行/滚动由 host 布局承载。
