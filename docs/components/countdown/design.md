# Countdown 组件设计

## 1. 组件定位

- `countdown` 是一个**展示型** renderer，用于显示倒计时数字，支持自定义格式化和结束回调。
- 典型场景：秒杀倒计时、验证码重发倒计时、活动截止时间、订单支付超时。
- 它不是表单字段（不参与 value/validation 通道），不是交互控件，是纯时间展示组件。
- 它不是数据源——倒计时的目标时间由 schema 静态值或表达式提供。

## 2. 与 AMIS 或既有产品的能力对照

| 来源                 | 组件             | 特点                                      |
| -------------------- | ---------------- | ----------------------------------------- |
| Vant van-count-down  | Vant 4           | 自定义格式、毫秒精度、暂停/重置、结束回调 |
| AMIS countdown       | 无独立组件       | 未提供                                    |
| newbee-mall-vue3-app | 未直接使用       | —                                         |
| litemall-vue         | 自定义倒计时实现 | 订单超时倒计时                            |

### Flux 决策表

| 能力                   | 采纳                                                      | 不采纳 | 理由                           |
| ---------------------- | --------------------------------------------------------- | ------ | ------------------------------ |
| 目标时间（到时停止）   | **实现**：`time`（ms）或 `targetTime`（时间戳）           | —      | 核心能力                       |
| 自定义格式化           | **实现**：`format`（`HH:mm:ss` / `DD:HH:mm:ss` / 自定义） | —      | 高频需求                       |
| 毫秒精度               | **实现**：`millisecond`（boolean）                        | —      | 秒杀场景需要                   |
| 结束回调               | **实现**：`onFinish: ActionSchema`                        | —      | 标准事件                       |
| 暂停/恢复              | **实现**：`paused`（受控 boolean）                        | —      | 外部控制                       |
| 每帧回调（自定义渲染） | **暂不实现**                                              | —      | 低频，用 format 已覆盖多数场景 |
| 前缀/后缀文本          | **实现**：`prefix` / `suffix`（value-or-region）          | —      | 展示辅助                       |
| 自动开始               | **实现**：默认自动开始；`autoStart: false` 延迟           | —      | 标准行为                       |

## 3. Flux 中的 renderer/type 定义

- `type: 'countdown'`
- `sourcePackage: '@nop-chaos/flux-renderers-mobile'`
- 无 regions（纯展示），支持 `prefix` / `suffix` 作为 value-or-region

## 4. Schema 设计

```typescript
interface CountdownSchema extends BaseSchema {
  type: 'countdown';
  /** 倒计时总时长（毫秒），与 targetTime 二选一 */
  time?: number;
  /** 目标时间戳（毫秒），与 time 二选一 */
  targetTime?: number;
  /** 格式化模板，默认 'HH:mm:ss'。
   *  支持：YYYY MM DD HH mm ss SSS */
  format?: string;
  /** 是否显示毫秒，默认 false */
  millisecond?: boolean;
  /** 暂停状态（受控） */
  paused?: boolean;
  /** 是否自动开始，默认 true */
  autoStart?: boolean;
  /** 前缀文本 */
  prefix?: string;
  /** 后缀文本 */
  suffix?: string;
}
```

### Events

```typescript
interface CountdownEvents {
  /** 倒计时结束时触发 */
  onFinish?: ActionSchema;
}
```

### 字段分类

- `time`、`targetTime`、`format`、`millisecond`、`paused`、`autoStart`、`prefix`、`suffix`: `value`
- `onFinish`: `event`

## 5. 格式化规则

| 占位符 | 含义 | 范围    |
| ------ | ---- | ------- |
| `DD`   | 天   | 00-99   |
| `HH`   | 时   | 00-23   |
| `mm`   | 分   | 00-59   |
| `ss`   | 秒   | 00-59   |
| `SSS`  | 毫秒 | 000-999 |

示例：

- `"HH:mm:ss"` → `"02:30:45"`
- `"DD:HH:mm:ss"` → `"01:02:30:45"`
- `"mm:ss"` → `"30:45"`
- `"ss"` → `"1845"`

## 6. 定时器实现

- 使用 `setInterval` 驱动（毫秒精度用 `setInterval` + `requestAnimationFrame` 补偿）
- `paused` 变为 `true` 时暂停计时器，`false` 时恢复
- 组件卸载时清理定时器
- 剩余时间 = `targetTime - Date.now()` 或 `time - elapsed`

## 7. 样式与 DOM marker

```html
<span class="nop-countdown" data-slot="countdown">
  <span data-slot="countdown-prefix">还剩 </span>
  <span data-slot="countdown-value">02:30:45</span>
  <span data-slot="countdown-suffix"> 结束</span>
</span>
```

- 根节点 `nop-countdown` marker
- 数字部分使用 `tabular-nums` font-feature 确保等宽数字
- 前缀/后缀通过 `prefix`/`suffix` region 渲染

## 8. 边界情况

| 场景                            | 行为                                                 |
| ------------------------------- | ---------------------------------------------------- |
| `time` 和 `targetTime` 都未提供 | 不渲染倒计时，显示空                                 |
| `time` 和 `targetTime` 同时提供 | `targetTime` 优先                                    |
| 倒计时已结束                    | 显示 `00:00:00`（或格式化后的零值），触发 `onFinish` |
| `paused=true`                   | 冻结当前显示值，暂停计时器                           |
| `autoStart=false`               | 不自动开始，等待外部设置 `paused=false` 启动         |
| 时间为负数                      | 视为已结束，显示零值                                 |
| 快速切换 `paused`               | 正确恢复，不丢失已过时间                             |

## 9. 包归属

| 文件                | 包                                        |
| ------------------- | ----------------------------------------- |
| renderer definition | `flux-renderers-mobile`                   |
| 运行时组件          | `flux-renderers-mobile/src/countdown.tsx` |
| schema              | `flux-renderers-mobile/src/schemas.ts`    |

## 10. 实现拆分建议

- `Countdown` renderer：纯展示组件，接收 `RendererComponentProps`，通过 `props.props` 读取配置
- 格式化逻辑抽成 pure helper `formatCountdown(time, format)` 放在同包 utils 中
- 定时器逻辑可用 local controller hook `useCountdownTimer(targetTime, paused, onFinish)` 管理
- 不需要 store 或 scope 状态——倒计时是纯展示，不参与表单

## 11. 风险、取舍与后续阶段

- `setInterval` 在后台标签页可能被节流（浏览器策略），对精度要求高的场景可考虑 `requestAnimationFrame` 补偿
- **触摸目标**：倒计时组件本身是展示型，不需要触摸交互。但如果倒计时结束后有操作按钮，按钮需满足 M0 基线规范（`docs/architecture/mobile-responsive-baseline.md` §3）的 44×44px 最小尺寸
- 后续可考虑 `autoStart` 配合表达式实现条件触发倒计时
- 毫秒精度场景（`millisecond: true`）性能开销略高，仅在秒杀等场景启用
