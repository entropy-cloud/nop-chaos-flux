# 布局容器选型

## 三种容器定位

| 容器        | 适用场景                                 | 关键能力                                             |
| ----------- | ---------------------------------------- | ---------------------------------------------------- |
| `container` | 内容壳层，需要 header/body/footer 三段式 | semantic prop + `bodyClassName` 控制内部布局         |
| `flex`      | 纯 flex 布局，无需 header/footer 壳层    | direction/wrap/align/justify/alignContent + 单层 DOM |
| `grid`      | CSS Grid 二维布局（colSpan/rowSpan）     | columns/colSpan/rowSpan + 响应式                     |

## Container 的双层 DOM（重要）

```html
<div class="nop-container [className]">
  ← className 挂在这里，不影响子节点排列
  <div data-slot="container-body" class="[flex 类来自 direction/wrap/align/gap] [bodyClassName]">
    ← 这才是实际布局层 ...children...
  </div>
</div>
```

- `className` → 外层 `nop-container`，`type: "flex"` 则直接控制根节点
- `bodyClassName` → 内层 `data-slot="container-body"`（仅 container 有）
- semantic props（`direction`/`wrap`/`gap`/`align`）→ 内层 body div（container 和 flex 都支持）

## 选型指南

```json
// 场景1：纯 flex 行 + 换行（推荐 flex，单层 DOM）
{ "type": "flex", "direction": "row", "wrap": true, "gap": 12,
  "body": [ { "type": "text", "text": "A" }, { "type": "text", "text": "B" } ] }

// 场景2：已有 container 加 flex（用 semantic prop，不可用 className）
{ "type": "container", "direction": "row", "gap": 12,
  "body": [ { "type": "text", "text": "左" }, { "type": "text", "text": "右" } ] }

// 场景3：container 内用 CSS Grid（用 bodyClassName）
{ "type": "container",
  "bodyClassName": "grid grid-cols-3 gap-4",
  "body": [ { "type": "text", "text": "1" }, { "type": "text", "text": "2" }, { "type": "text", "text": "3" } ] }

// 场景4：container 三层壳层
{ "type": "container",
  "header": [{ "type": "text", "text": "标题" }],
  "body": [{ "type": "text", "text": "内容" }],
  "footer": [{ "type": "text", "text": "底部" }] }
```
