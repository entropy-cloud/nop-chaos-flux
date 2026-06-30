# 移动端原生组件专题

> Flux 通过 `flux-renderers-mobile` 包提供移动端原生交互组件。这些组件专为移动端设计，遵循 M0 基线规范（44×44px 最小触摸目标）。

---

## 组件清单

| 组件              | 类型   | 说明           |
| ----------------- | ------ | -------------- |
| `pull-refresh`    | 容器型 | 下拉刷新容器   |
| `infinite-scroll` | 容器型 | 触底加载更多   |
| `swipe-cell`      | 容器型 | 左滑操作单元格 |
| `countdown`       | 展示型 | 倒计时组件     |
| `notice-bar`      | 展示型 | 通知栏组件     |

---

## 核心原则

### 1. 事件驱动，请求下沉

所有移动端组件**不持有数据请求逻辑**，数据请求统一通过 action/data-source 层处理：

```json
// 错误: 组件直接配置 api
{"type":"pull-refresh","api":"/api/refresh"}

// 正确: 通过事件驱动 action
{"type":"pull-refresh","onRefresh":{
  "action":"refreshTable","args":{"target":"list1"}
}}
```

### 2. 与 CRUD/Page 集成

移动端组件通常与其他组件组合使用：

```json
{
  "type": "page",
  "pullRefresh": true,
  "body": [
    {
      "type": "infinite-scroll",
      "body": [
        {"type": "list", "items": [...]}
      ]
    }
  ]
}
```

### 3. 触摸目标规范

所有可交互元素必须满足 M0 基线规范：

- 最小触摸区域：44×44px
- 触摸反馈：hover/active 状态
- 手势所有权：`touch-action` CSS 属性声明

---

## 与其他组件的关系

```
page (pullRefresh: true)
  └── pull-refresh (容器)
      └── infinite-scroll (容器)
          └── list / table / cards (内容)
```

| 组件                       | 层级 | 职责                  |
| -------------------------- | ---- | --------------------- |
| `page.pullRefresh`         | 外层 | 页面级下拉刷新配置    |
| `pull-refresh`             | 容器 | 下拉刷新手势检测 + UI |
| `infinite-scroll`          | 容器 | 触底加载手势检测 + UI |
| `list` / `table` / `cards` | 内容 | 实际数据展示          |

---

## 包归属

所有移动端组件统一归属 `flux-renderers-mobile` 包：

```typescript
// 独立使用
import { PullRefreshRenderer, InfiniteScrollRenderer } from '@nop-chaos/flux-renderers-mobile';

// 或通过 schema 注册
import { mobileRendererDefinitions } from '@nop-chaos/flux-renderers-mobile';
```

---

## 设计决策参考

| 决策                      | 采纳     | 不采纳     | 理由                                     |
| ------------------------- | -------- | ---------- | ---------------------------------------- |
| 事件驱动刷新/加载         | **采纳** | —          | 请求下沉 data-source + action (X3 §1/§3) |
| 组件级 api/initFetch      | —        | **不采纳** | 组件级挂载时 auto-fetch 违反请求下沉     |
| polling/interval 自动刷新 | —        | **不采纳** | 归 data-source `interval` (X4)           |
| 分页状态管理              | —        | **不采纳** | 分页状态归 crud/data-source              |
