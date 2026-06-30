# NoticeBar 通知栏

> `notice-bar` 是展示型 renderer，提供滚动通知栏能力。

---

## Schema

```typescript
type NoticeBarVariant = 'info' | 'warning' | 'success' | 'error';

interface NoticeBarSchema extends BaseSchema {
  type: 'notice-bar';
  /** 通知文本，支持字符串或字符串数组 */
  text?: string | string[];
  /** 是否可滚动 */
  scrollable?: boolean;
  /** 滚动速度（px/s），默认 50 */
  speed?: number;
  /** 滚动方向，默认 'left' */
  direction?: 'left' | 'right';
  /** 是否循环滚动 */
  loop?: boolean;
  /** 是否可关闭 */
  closable?: boolean;
  /** 图标 */
  icon?: string;
  /** 视觉变体，默认 'info' */
  variant?: NoticeBarVariant;
}
```

### Events

```typescript
interface NoticeBarEvents {
  /** 点击通知栏时触发 */
  onClick?: ActionSchema;
  /** 关闭时触发 */
  onClose?: ActionSchema;
}
```

---

## 使用示例

### 基础通知

```json
{
  "type": "notice-bar",
  "text": "系统将于今晚 22:00 进行维护",
  "variant": "warning"
}
```

### 可关闭通知

```json
{
  "type": "notice-bar",
  "text": "您有 3 条未读消息",
  "variant": "info",
  "closable": true,
  "onClose": {
    "action": "setValue",
    "args": { "path": "noticeVisible", "value": false }
  }
}
```

### 点击跳转

```json
{
  "type": "notice-bar",
  "text": "查看最新活动",
  "variant": "info",
  "onClick": {
    "action": "navigate",
    "args": { "url": "/activity" }
  }
}
```

### 滚动通知

```json
{
  "type": "notice-bar",
  "text": "这是一条很长的通知内容，需要滚动显示，可能超出屏幕宽度...",
  "scrollable": true,
  "speed": 100,
  "variant": "info"
}
```

### 循环滚动

```json
{
  "type": "notice-bar",
  "text": "循环滚动的通知内容",
  "scrollable": true,
  "loop": true,
  "direction": "left",
  "variant": "info"
}
```

### 带图标

```json
{
  "type": "notice-bar",
  "text": "公告：新版本已发布",
  "icon": "info-circle",
  "variant": "success"
}
```

### 多条轮播

```json
{
  "type": "notice-bar",
  "text": ["第一条通知", "第二条通知", "第三条通知"],
  "scrollable": true,
  "variant": "info"
}
```

---

## 边界情况

| 场景              | 行为                     |
| ----------------- | ------------------------ |
| text 为空或未设置 | 不渲染                   |
| scrollable=false  | 文本不滚动，超出部分截断 |
| text 为数组       | 轮播显示多条             |
| closable=true     | 显示关闭按钮             |
| disabled          | 不显示                   |

---

## 包归属

| 文件     | 包                                     |
| -------- | -------------------------------------- |
| 组件实现 | `flux-renderers-mobile`                |
| schema   | `flux-renderers-mobile/src/schemas.ts` |
