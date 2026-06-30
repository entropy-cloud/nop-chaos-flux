# Countdown 倒计时

> `countdown` 是展示型 renderer，提供倒计时显示能力。

---

## Schema

```typescript
interface CountdownSchema extends BaseSchema {
  type: 'countdown';
  /** 倒计时总时长（毫秒） */
  time?: number;
  /** 目标时间戳（毫秒），与 time 二选一 */
  targetTime?: number;
  /** 显示格式，默认 'HH:mm:ss'。支持占位符：DD HH mm ss SSS；其它字符按字面输出 */
  format?: string;
  /** 是否显示毫秒 */
  millisecond?: boolean;
  /** 是否暂停 */
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

---

## 格式说明

| 占位符 | 说明         | 示例     |
| ------ | ------------ | -------- |
| `DD`   | 天数（补零） | 01, 31   |
| `HH`   | 小时（补零） | 01, 12   |
| `mm`   | 分钟（补零） | 00, 59   |
| `ss`   | 秒（补零）   | 01, 30   |
| `SSS`  | 毫秒（补零） | 001, 999 |

> 注意：不支持 `H`/`m`/`s`（不补零）占位符，只支持补零版本。

---

## 使用示例

### 基础倒计时（毫秒）

```json
{
  "type": "countdown",
  "time": 60000,
  "format": "mm:ss"
}
```

### 目标时间倒计时

```json
{
  "type": "countdown",
  "targetTime": 1735689600000,
  "format": "HH:mm:ss"
}
```

### 格式化显示

```json
{
  "type": "countdown",
  "time": 3661000,
  "format": "HH:mm:ss"
}
```

### 带毫秒

```json
{
  "type": "countdown",
  "time": 10000,
  "format": "ss.SSS",
  "millisecond": true
}
```

### 倒计时结束回调

```json
{
  "type": "countdown",
  "time": 300000,
  "format": "mm:ss",
  "onFinish": {
    "action": "showToast",
    "args": { "level": "info", "message": "倒计时结束" }
  }
}
```

### 暂停/恢复控制

```json
{
  "type": "countdown",
  "time": 60000,
  "format": "mm:ss",
  "paused": "${isPaused}"
}
```

### 带前缀/后缀

```json
{
  "type": "countdown",
  "time": 60000,
  "format": "mm:ss",
  "prefix": "剩余 ",
  "suffix": " 秒"
}
```

---

## 边界情况

| 场景                        | 行为                   |
| --------------------------- | ---------------------- |
| time 和 targetTime 都未设置 | 不渲染倒计时           |
| time <= 0                   | 立即触发 onFinish      |
| paused=true                 | 倒计时暂停，显示当前值 |
| autoStart=false             | 倒计时不自动开始       |
| 组件卸载时倒计时未结束      | 自动清理定时器         |

---

## 包归属

| 文件     | 包                                     |
| -------- | -------------------------------------- |
| 组件实现 | `flux-renderers-mobile`                |
| schema   | `flux-renderers-mobile/src/schemas.ts` |
