# SwipeCell 左滑操作

> `swipe-cell` 是容器型 renderer，为移动端列表项提供左滑显示操作按钮的能力。

---

## Schema

```typescript
interface SwipeCellSchema extends BaseSchema {
  type: 'swipe-cell';
  /** 主体内容 region */
  body?: SchemaInput;
  /** 左滑露出的操作区 region */
  left?: SchemaInput;
  /** 右滑露出的操作区 region */
  right?: SchemaInput;
  /** 滑动触发阈值（px），默认 30 */
  threshold?: number;
  /** 限制滑动方向，默认 'both' */
  direction?: 'left' | 'right' | 'both';
  /** 禁用滑动交互 */
  disabled?: boolean;
  /** 点击外部区域自动关闭，默认 true */
  closeOnOutside?: boolean;
}
```

### Events

```typescript
interface SwipeCellEvents {
  /** 执行操作时触发 */
  onAction?: ActionSchema;
  /** 打开时触发 */
  onOpen?: ActionSchema;
  /** 关闭时触发 */
  onClose?: ActionSchema;
}
```

---

## 使用示例

### 基础用法 - 右滑删除

```json
{
  "type": "swipe-cell",
  "right": [
    {
      "type": "button",
      "label": "删除",
      "level": "danger",
      "onClick": { "action": "ajax", "args": { "url": "/api/delete/${id}", "method": "delete" } }
    },
    {
      "type": "button",
      "label": "收藏",
      "onClick": { "action": "ajax", "args": { "url": "/api/favorite/${id}" } }
    }
  ],
  "body": [
    {
      "type": "container",
      "body": [
        { "type": "text", "text": "${item.title}" },
        { "type": "text", "text": "${item.description}" }
      ]
    }
  ]
}
```

### 双向滑动

```json
{
  "type": "swipe-cell",
  "left": [
    {
      "type": "button",
      "label": "置顶",
      "level": "primary",
      "onClick": { "action": "setValue", "args": { "path": "item.pinned", "value": true } }
    }
  ],
  "right": [
    {
      "type": "button",
      "label": "删除",
      "level": "danger",
      "onClick": { "action": "ajax", "args": { "url": "/api/delete/${id}", "method": "delete" } }
    }
  ],
  "body": [{ "type": "text", "text": "${item.title}" }]
}
```

### 限制滑动方向

```json
{
  "type": "swipe-cell",
  "direction": "right",
  "right": [{ "type": "button", "label": "删除", "level": "danger" }],
  "body": [{ "type": "text", "text": "仅支持右滑" }]
}
```

### 在 Loop 中使用

```json
{
  "type": "loop",
  "items": "${list}",
  "itemName": "item",
  "body": [
    {
      "type": "swipe-cell",
      "right": [
        {
          "type": "button",
          "label": "删除",
          "level": "danger",
          "onClick": {
            "action": "ajax",
            "args": { "url": "/api/delete/${item.id}", "method": "delete" }
          }
        }
      ],
      "body": [{ "type": "text", "text": "${item.name}" }]
    }
  ]
}
```

### 自定义阈值

```json
{
  "type": "swipe-cell",
  "threshold": 50,
  "right": [{ "type": "button", "label": "操作" }],
  "body": [{ "type": "text", "text": "需要滑动 50px 才露出操作区" }]
}
```

---

## 边界情况

| 场景                | 行为                             |
| ------------------- | -------------------------------- |
| disabled=true       | 完全不响应滑动                   |
| direction='left'    | 仅支持左滑（露出 left 操作区）   |
| direction='right'   | 仅支持右滑（露出 right 操作区）  |
| direction='both'    | 支持双向滑动（默认）             |
| 快速滑动            | 不触发操作，自动回弹             |
| 点击操作按钮        | 执行对应 action                  |
| 多个 SwipeCell      | 各自独立，互不影响               |
| closeOnOutside=true | 点击外部区域自动关闭             |
| threshold=30        | 滑动 30px 后才露出操作区（默认） |
| 触摸目标            | 操作按钮需满足 44×44px 最小尺寸  |

---

## 包归属

| 文件          | 包                                             |
| ------------- | ---------------------------------------------- |
| 组件实现      | `flux-renderers-mobile`                        |
| schema        | `flux-renderers-mobile/src/schemas.ts`         |
| useTouch Hook | `flux-renderers-mobile/src/hooks/use-touch.ts` |
