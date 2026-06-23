# PullRefresh 组件设计

## 1. 组件定位

`pull-refresh` 是一个**容器型** renderer，为移动端内容区域提供**下拉刷新**能力。它包裹子内容，在用户下拉拖拽操作后触发刷新回调。

- **不是**独立的页面行为——它依附于内容容器，配合 `infinite-scroll` 或 `page` 使用。
- **不是**数据源——刷新行为由 `onRefresh` 事件驱动，数据请求下沉到 action/data-source 层。
- **只支持下拉刷新**（`direction: 'down'`，OA-14）。上拉加载更多请使用 `infinite-scroll`（见 §8）。

## 2. 参考实现

| 来源                  | 文件/组件                                              | 行数 |
| --------------------- | ------------------------------------------------------ | ---- |
| AMIS PullRefresh      | `amis/packages/amis-ui/src/components/PullRefresh.tsx` | ~277 |
| Vant van-pull-refresh | Vant 4                                                 | —    |

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。命名对齐 shadcn/ui、请求下沉 data-source + action（X3 §1/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                                         | 采纳     | 不采纳     | 理由                                                           |
| ------------------------------------------------------------ | -------- | ---------- | -------------------------------------------------------------- |
| `body` region + 下拉刷新容器                                 | **实现** | —          | 核心能力：容器型 renderer 包裹子内容                           |
| `onRefresh` 事件驱动刷新                                     | **实现** | —          | 刷新行为由事件驱动，数据请求下沉 action/data-source            |
| `direction`/`threshold`/`disabled` 配置                      | **实现** | —          | 标准交互配置；`direction` 仅 `'down'`（OA-14）                 |
| `loadingText`/`pullingText`/`loosingText`/`successText` 文案 | **实现** | —          | i18n 友好的可配置文案                                          |
| amis 组件级 `api`/`initFetch`                                | —        | **不采纳** | 请求下沉 data-source + action（X3 §1/§3）                      |
| amis `source`/`schemaApi` 自动拉取                           | —        | **不采纳** | 组件级挂载时 auto-fetch 违反请求下沉（见 `docs/bugs/15-*.md`） |
| polling/interval 自动刷新                                    | —        | **不采纳** | 归 data-source `interval`（X4）                                |

## 3. Schema 设计

```typescript
interface PullRefreshSchema extends BaseSchema {
  type: 'pull-refresh';
  /** 子内容 region */
  body?: SchemaInput;
  /**
   * 刷新方向。OA-14：仅 `'down'`（下拉刷新）受支持；上拉加载使用
   * `infinite-scroll`（见 §8）。保留字段以兼容 `direction: 'down'` schema；
   * `'up'` 已从类型中移除。
   */
  direction?: 'down';
  /** 触发刷新的下拉距离阈值，默认 60px */
  threshold?: number;
  /** 加载中提示文本 */
  loadingText?: string;
  /** 下拉提示文本 */
  pullingText?: string;
  /** 到达释放阈值时提示文本 */
  loosingText?: string;
  /** 成功提示文本，默认 '刷新成功' */
  successText?: string;
  /** 成功提示持续时间 ms，默认 500 */
  successDuration?: number;
  /** 动画持续时间 ms，默认 300 */
  animationDuration?: number;
  /** 禁用下拉刷新 */
  disabled?: boolean;
}
```

- `body` 是 region 字段，在 renderer definition 中声明 `{ key: 'body', kind: 'region' }`，编译器预编译为 `props.regions.body`。author 在 schema 中写 `body: [{ type: '...' }]`。

### Events

```typescript
interface PullRefreshEvents {
  /** 触发刷新，由下层的 action 或 data-source 处理 */
  onRefresh?: ActionSchema;
}
```

## 4. 状态机

```
normal → pulling → loosing → loading → success → normal
```

| 状态      | 触发                             | 表现                                |
| --------- | -------------------------------- | ----------------------------------- |
| `normal`  | 初始 / 刷新完成                  | 无提示                              |
| `pulling` | touchmove 且 deltaY < threshold  | 提示"下拉刷新"，显示下拉指示器      |
| `loosing` | touchmove 且 deltaY >= threshold | 提示"释放刷新"                      |
| `loading` | touchend 且 deltaY >= threshold  | 显示加载 spinner，执行 `onRefresh`  |
| `success` | onRefresh 完成                   | 短暂提示"刷新成功"，自动回到 normal |

## 5. 触摸交互

- 使用 `useTouch` Hook 检测垂直拖拽
- 仅垂直方向触发（`direction: 'vertical'`）；`direction` 字段仅 `'down'`（OA-14），不提供上拉分支
- 拖拽距离弹性阻尼：`Math.min(deltaY * 0.5, maxPullDistance)`
- 松手回弹动画：`transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- 几何跟手 1:1（OA-09）：indicator 绝对定位（`position:absolute; transform:translateY(-100%)`）被提出文档流，translated track 内 `body` 是唯一 in-flow 子元素，因此 body 屏幕位移 === 根 translate === 手指位移（不再因 indicator 堆叠高度造成 ~2× 过冲）
- `pulling`/`loosing` 标签渲染期派生（MA-10）：`status` state 只承载真实状态机迁移（normal/loading/success），touchmove 过程中的瞬态标签由 `state.isTouching && directionalDelta > 0` 派生，无 `useEffect+setState` 镜像
- `statusRef` 同步镜像（NEW-MM-03）：`statusRef.current` 在每个 handler 内与 `setStatus(...)` 同步赋值（与 swipe-cell 的同步镜像模式收敛），被动 `useEffect` 镜像仅作 safety net，确保连续 touchEnd 的 re-entrancy 守卫读到最新值
- 根 `touch-action: pan-x` + `overscroll-behavior-y: contain`（MA-07）：声明垂直手势所有权，浏览器不与原生滚动/overscroll 竞争

## 6. 与 Page / CRUD 的集成

- `page` renderer 可选启用 pull-refresh：`page.pullRefresh: PullRefreshSchema | true`
- `crud` renderer 内部集成 pull-refresh，刷新后重新加载数据
- 当 `page.pullRefresh` 启用时，page body 自动包裹 PullRefresh 容器

## 7. 包归属

| 文件                | 包                                             |
| ------------------- | ---------------------------------------------- |
| renderer definition | `flux-renderers-mobile`                        |
| 运行时组件          | `flux-renderers-mobile/src/pull-refresh.tsx`   |
| schema              | `flux-renderers-mobile/src/schemas.ts`         |
| useTouch Hook       | `flux-renderers-mobile/src/hooks/use-touch.ts` |

## 8. 边界情况

| 场景                                                          | 行为                                                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 页面内容不足一屏                                              | PullRefresh 仍可拖拽                                                                                      |
| 与 InfiniteScroll 共存                                        | 上拉加载使用 InfiniteScroll，下拉刷新使用 PullRefresh，不互斥（OA-14：PullRefresh 仅 `'down'`）           |
| 嵌套滚动容器                                                  | PullRefresh 不在 JS 层阻止滚动；手势所有权由 CSS `touch-action` 提供（见 plan 3 MA-07）                   |
| disabled=true                                                 | 完全不响应触摸事件                                                                                        |
| loading 状态再次拖拽                                          | 忽略，不重复触发（`statusRef` 同步镜像守卫，NEW-MM-03）                                                   |
| 系统 touchcancel（多点/滚动接管/来电，2026-06-23 OA-05 裁定） | **不提交**：恢复到 `normal`（回弹），不触发 `onRefresh`。touchcancel 与 touchend 拆分为两条独立路径       |
| onRefresh reject（2026-06-23 MA-01 裁定）                     | `status` 回到 `normal`（不卡 `loading`），用户可再次下拉重试                                              |
| 卸载时 in-flight refresh（NEW-MM-04）                         | `isMountedRef` 守卫阻止 `.then()` 在 unmount 后调度 success `setTimeout`（由 focused 测试验证可观测信号） |
| **触摸目标**                                                  | 触摸区域需满足 M0 基线规范（`docs/architecture/mobile-responsive-baseline.md` §3）的 44×44px 最小尺寸     |
