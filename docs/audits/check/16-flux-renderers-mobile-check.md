# 16 flux-renderers-mobile 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-renderers-mobile/src/` 实现代码全量精读（排除 `*.test.*`、`__tests__`）。非测试源文件 10 个约 1981 行：`pull-refresh.tsx`(272)、`infinite-scroll.tsx`(271)、`swipe-cell.tsx`(375)、`countdown.tsx`(240)、`notice-bar.tsx`(305)、`schemas.ts`(107)、`mobile-renderer-definitions.ts`(207)、`index.ts`(24)、`hooks/use-touch.ts`(101)、`styles.css`(79)；另有测试支撑 `test-support.ts`(47)、`infinite-scroll-test-support.tsx`(98) 一并核查（未计入实现行数）。参照基线：`docs/references/quick-reference.md`、`docs/architecture/renderer-runtime.md`、`docs/architecture/mobile-responsive-baseline.md` §5、`docs/components/*/design.md`。
- 结论概览：**P0 x1 / P1 x1 / P2 x6 / P3 x7**。
- 总评：包体量小、整体工程质量高——监听器/定时器/observer 清理配对全绿，布尔 prop 严格比较、事件 payload 携带 `event + evaluationBindings + scope` 契约、i18n key 双语言完整注册、test-support 正确排除出构建产物，代码内 bugfix 注释密度高。核心风险集中在两处交互缺陷面：(1) `pull-refresh` 根元素 `touch-action: pan-x` 契约与浏览器祖先链 touch-action 交集规则组合，导致 body 内容（典型：长列表，playground `m5-showcase-app.json` 即此用法）在真机上**无法垂直触摸滚动**，且连带使同屏 `infinite-scroll` 失去滚动驱动（F-01，P0）；(2) 拖动进行中动态切换 `disabled` 会使 `onTouchEnd/onTouchCancel` 解绑，手势状态永久卡死（F-02，P1）。D3 泄漏维度除 F-02 外未发现任何未清理的监听器/定时器/observer。

## P0 缺陷

### F-01 `pull-refresh` 根元素 `touch-action: pan-x` 禁止 body 一切原生垂直滚动，长列表无法浏览，且连带废掉同屏 `infinite-scroll`

- 位置：`packages/flux-renderers-mobile/src/pull-refresh.tsx:220-242`
- 摘录：

```tsx
style={{
  position: 'relative',
  // ... `pan-x` reserves the VERTICAL axis for this element's JS ...
  touchAction: 'pan-x',
  overscrollBehaviorY: 'contain',
  transform: `translateY(${trackTranslate}px)`,
  ...
}}
onTouchStart={disabled ? undefined : touchHandlers.onTouchStart}
onTouchMove={disabled ? undefined : touchHandlers.onTouchMove}
```

- 输入→路径→错误结果推理链：
  1. 输入：`pull-refresh` 的 `body` region 放置高度超出视口的内容。这是组件最典型用法——playground 实例 `apps/playground/src/schemas/m5-showcase-app.json:80-128` 即在 `pull-refresh` body 内放商品 `loop` 长列表。
  2. 路径：用户在列表上垂直滑动时，触点元素位于 `pull-refresh` 后代内。按 CSS touch-action 规范（Chrome/Safari 实现），浏览器判定是否原生 pan 时对**触点元素到滚动容器（乃至文档）的整条祖先链**求 touch-action 交集；链上 `pull-refresh` 根为 `pan-x`（只允许水平 pan）→ 垂直原生 pan 被禁止 → 页面/列表完全不滚动，`touchmove` 全量交给组件 JS，`use-touch` 将 `deltaY` 转为 `pullDistance`，把整个列表 `translateY` 拉下并显示"下拉刷新"指示器。
  3. 错误结果：真机上列表无法触摸滚动浏览，任何向下滑动都变成下拉刷新拉动（超阈值松手即触发 `onRefresh`）；同屏组合 `infinite-scroll` 时，由于滚动无法发生，sentinel 除初始相交外永远不会滚入视口，无限加载失去驱动——正是"下拉刷新与无限滚动同屏竞争"的最坏形态。
- 补充：实现与 `docs/architecture/mobile-responsive-baseline.md` §5 的契约表格（`pull-refresh → pan-x`）一致，且有 `getComputedStyle` 契约测试锁定——即**契约本身就是架构级缺陷**，注释中"避免浏览器与原生滚动竞争"的意图，实际效果恰恰是消灭了原生垂直滚动。经典 pull-refresh（如 Vant）不设 `pan-x`，而是在 `touchmove` 中检查最近滚动祖先 `scrollTop === 0` 后再激活 pull。本实现无任何 `scrollTop` 检查（grep 全包零命中）。
- 修复方向：根元素改为不声明 `pan-x`（或 `pan-y`），手势激活条件改为"最近垂直滚动祖先已滚到顶"（touchstart 时记录 `scrollTop`，touchmove 中 `scrollTop > 0` 时不拦截），保留 `overscroll-behavior-y: contain`；同步修订 `mobile-responsive-baseline.md` §5 契约行与对应契约测试，并用真机/Playwright `hasTouch` 场景回归长列表滚动。

## P1 隐患

### F-02 拖动进行中动态置 `disabled` 导致 touchend 丢失，手势状态永久卡死（pull-refresh 与 swipe-cell 双双命中）

- 位置：`packages/flux-renderers-mobile/src/pull-refresh.tsx:239-242`、`packages/flux-renderers-mobile/src/swipe-cell.tsx:306-309`
- 摘录（pull-refresh）：

```tsx
onTouchStart={disabled ? undefined : touchHandlers.onTouchStart}
onTouchMove={disabled ? undefined : touchHandlers.onTouchMove}
onTouchEnd={disabled ? undefined : handleTouchEnd}
onTouchCancel={disabled ? undefined : handleTouchCancel}
```

- 问题：`disabled` 常来自表达式绑定（如 `${loading}`）。当用户手指仍按住拖动、`disabled` 在拖动中翻转为 `true` 时，重渲染把四个触摸 handler 全部置 `undefined`；用户松手或系统 touchcancel 到达时组件不再收到任何事件，`use-touch` 的 `state.isTouching` 永远保持 `true`。
- 特定条件+后果：条件 = 拖动进行中 `disabled` 动态变 `true`（loading 联动禁用是高频写法）。后果：
  - pull-refresh：`resolvedStatus` 永久停在 `pulling/loosing`，`trackTranslate` 停留在最后 `pullDistance`，且 `transition: 'none'`（isTouching 为 true），指示器与位移永久卡住；此后 `disabled` 恢复 `false` 也无法自愈——新 touchstart 可恢复 state，但在此之前 UI 一直错乱。
  - swipe-cell：content 停留在最后拖动偏移（`activeDragOffset` 保持），`select-none` 持续生效，open/close 不提交。
- 修复方向：handler 解绑与手势状态解耦——`disabled` 只拦截**新手势**（在 `onTouchStart` 内判断），`onTouchEnd/onTouchCancel` 始终保持绑定；或用 effect 监听 `disabled` 翻转时对手势中的组件调用 `reset()` 强制复位。

## P2 风险

### F-03 swipe-cell `dragOffset` 以 `!== 0` 判定，拖动中经过原点瞬间跳变回 committed 偏移

- 位置：`packages/flux-renderers-mobile/src/swipe-cell.tsx:93-99`
- 摘录：

```tsx
const activeDragOffset = state.direction === 'horizontal' && state.isTouching ? state.deltaX : 0;
const computedOffset =
  openState === 'open-left' ? leftWidth : openState === 'open-right' ? -rightWidth : 0;
const dragOffset = activeDragOffset !== 0 ? activeDragOffset : computedOffset;
```

- 问题：`dragOffset` 的选择条件是数值 `activeDragOffset !== 0` 而非"是否处于水平拖动中"。cell 已 `open-left`（computedOffset=leftWidth）时，用户按住拖动使 `deltaX` 恰好经过 0 的那一帧，`activeDragOffset === 0` → `dragOffset` 瞬间取 `computedOffset`（跳回 leftWidth），下一帧又跳回 0 附近，`transition: none` 下是可见的位移闪跳。
- 修复方向：判定条件改为 `state.isTouching && state.direction === 'horizontal'`（与 `activeDragOffset` 的语义来源一致）。

### F-04 notice-bar 多文本轮播切换 item 时 marquee 动画不重启，新文本以中途相位出现

- 位置：`packages/flux-renderers-mobile/src/notice-bar.tsx:172-194, 264-282`
- 摘录：

```tsx
const carouselDwellMs = shouldScroll
  ? Math.max(CAROUSEL_INTERVAL_MS, animationDuration * 1000)
  : CAROUSEL_INTERVAL_MS;
...
<span
  ref={textRef}
  data-slot="notice-bar-text"
  style={shouldScroll ? { animationName: 'nop-notice-bar-marquee', ... } : undefined}
>
  {activeText}
</span>
```

- 问题：同一 `<span>` DOM 复用、无 `key={currentIndex}`，item 切换只替换文本节点，CSS animation 不重启。dwell 取 `max(3000, cycle)`：当某 item 溢出较少（cycle < 3000ms）时，dwell=3000 与 cycle 非整倍 → 切换发生在动画迭代中途，新文本直接以中途 transform 相位出现并继续滚动，视觉跳变；OA-20 注释声称的"item 完整滚完再切换"仅在 cycle ≥ 3000 时成立。另外相邻 item 宽度不同时 `animationDuration` 变化对进行中动画的重启行为浏览器间不一致。
- 修复方向：给文本 span 加 `key={currentIndex}`（或切 item 时重置动画），使每个 item 从 keyframe 起点滚入。

### F-05 countdown 未配置 `time`/`targetTime` 时仍派发一次 `onFinish`

- 位置：`packages/flux-renderers-mobile/src/countdown.tsx:51-62, 113-119, 208-222`
- 摘录：

```tsx
const computeInitialRemaining = React.useCallback(() => {
  if (typeof targetTime === 'number') { return Math.max(0, targetTime - Date.now()); }
  if (typeof time === 'number') { return time; }
  return 0;
}, [targetTime, time]);
...
React.useEffect(() => {
  if (!isFinished) return;
  if (!started || paused) return;
  if (finishedRef.current) return;
  finishedRef.current = true;
  onFinishRef.current();
}, [isFinished, started, paused]);
```

- 问题：`hasTimeConfig === false` 时组件渲染空 span，但 `useCountdownTimer` 在 early return 之前已运行：initial remaining = 0 → `isFinished = true`、`started` 默认 true → finish effect 照常派发 `onFinish`。`eventContracts` 定义为"countdown **reaches zero** 时恰好派发一次"，从未开始计时的 0 谈不上"归零"；design.md §边界行为（`docs/components/countdown/design.md:123`）只承诺"不渲染倒计时，显示空"，未定义事件。作者写 `{type:'countdown', onFinish:{action:'showToast',...}}` 漏配时间 → 挂载即弹 toast。
- 修复方向：`hasTimeConfig` 为 false 时不派发（将配置传入 hook 或在 onFinish 回调处短路），并在 design.md 补充该边界行为定义。

### F-06 countdown 无 `visibilitychange` 补偿，后台标签页中 `onFinish` 最多延迟约 1 分钟

- 位置：`packages/flux-renderers-mobile/src/countdown.tsx:121-154`
- 摘录：

```tsx
const tick = () => {
  const elapsed = Date.now() - startTimestampRef.current;
  const next = Math.max(0, remainingAtStartRef.current - elapsed);
  remainingRef.current = next;
  setRemaining(next);
};
const timer = setInterval(tick, interval);
return () => clearInterval(timer);
```

- 问题：wall-clock 派生（OA-21）保证了**显示值**不因后台节流漂移，但 `onFinish` 的触发时机依赖 tick 执行。后台标签页/移动端切走后 `setInterval` 被浏览器节流（Chrome 后台 ≥ 1 次/分钟），`targetTime` 已过而 tick 未跑 → `onFinish`（及其绑定的业务 action）延迟至下一次节流 tick 或回前台才触发。对"限时支付/订单超时"类精确到秒的结束回调是真实风险。
- 修复方向：增加 `visibilitychange` 监听（回前台立即重算一次），或对 `targetTime` 分支用一次性 `setTimeout(remaining)` 兜底触发 finish；顺带满足"可见性暂停"审计面（当前全包 grep 无 `document.hidden`/`visibilitychange`）。

### F-07 swipe-cell / countdown / notice-bar 的事件派发无 reject/同步异常防御，与 infinite-scroll 的 MA-14 防御不一致

- 位置：`packages/flux-renderers-mobile/src/swipe-cell.tsx:130-134, 143-147, 240-244`；`countdown.tsx:197-201`；`notice-bar.tsx:198, 204, 210`
- 摘录（swipe-cell.tsx:130-134）：

```tsx
const closePayload = { type: 'close', side: previous };
void props.events.onClose?.(closePayload, {
  event: closePayload,
  evaluationBindings: closePayload,
  scope: nodeScopeRef.current,
});
```

- 问题：`infinite-scroll.tsx:120-143`（MA-14）专门用 `try + .catch` 包裹 `onLoadMore` 派发并 DEV-diagnostic，注释明言"防 failing action 崩溃 renderer"；但同包其余四个渲染器的 `onRefresh` 之外的 `onOpen/onClose/onAction/onFinish/notice-bar onClick/onClose` 均为裸 `void` 派发。若 handler 同步 throw（如 action 参数表达式求值错误），countdown 的派发发生在 effect 内会直接向上抛穿组件树；若 reject 则成为 unhandled rejection。pull-refresh 对 `onRefresh` 有 `.catch`（但只回退状态，无 DEV 日志），防御层级在包内三处三种口径。
- 修复方向：统一为 infinite-scroll 的防御模式（提取共享的 `dispatchMobileEvent` helper），至少覆盖 effect 内派发路径。

### F-08 use-touch 以 `e.touches[0]` 单指假设跟踪，多指触摸导致位移跳变

- 位置：`packages/flux-renderers-mobile/src/hooks/use-touch.ts:58-86`
- 摘录：

```tsx
const onTouchStart = useCallback((e: React.TouchEvent) => {
  const touch = e.touches[0];
  if (!touch) return;
  startRef.current = { x: touch.clientX, y: touch.clientY };
  ...
const onTouchMove = useCallback((e: React.TouchEvent) => {
  const touch = e.touches[0];
  ...
  const deltaX = touch.clientX - startRef.current.x;
```

- 问题：无 `e.touches.length > 1` 守卫，也不跟踪 `identifier`。双指场景（误触第二指）下，第一指抬起后 `touches[0]` 变为第二指，后续 move 的 delta 相对第一指起点计算，pull-refresh 的拉动量与 swipe-cell 的 `deltaX` 瞬间跳变；swipe-cell 的 `handleTouchEnd` 用跳变后的 `state.deltaX` 判阈值，可能在非预期方向意外提交 open。
- 修复方向：touchstart 记录 `touch.identifier`，move 中按 identifier 查找对应 touch（找不到则忽略）；`touches.length > 1` 时直接取消手势（走 touchcancel 路径）。

## P3 提示

### F-09 pull-refresh 未绑定 `onRefresh` 时仍走完 loading → "刷新成功" 假状态机

- 位置：`pull-refresh.tsx:145-170`。`props.events.onRefresh?.(...)` 为 undefined 时 Promise 立即 resolve → 组件显示"刷新成功"500ms。未配置刷新动作的页面会出现无意义的成功提示。建议无 handler 时超阈值释放直接回 `normal`。

### F-10 infinite-scroll 在 host 永不更新 `loading`/`error` props 时 `isLoadingRef` 永久锁死

- 位置：`infinite-scroll.tsx:94-111, 189-197`。守卫仅在 `loading`/`error` prop 变化时释放；host 只消费 `onLoadMore` 却不回写 `loading` 时，首次加载后自动加载永久停止。注释已声明这是"保守安全失败模式"（宁锁死不重复请求），属文档化行为，但建议在 eventContracts description 中向 action 作者显式说明"必须回写 loading/hasMore/error 之一"。

### F-11 swipe-cell `disabled` 翻转后已展开的 cell 无法自动关闭

- 位置：`swipe-cell.tsx:152-164`。`closeOnOutside` 监听在 `disabled` 时整个卸载，已 `open` 的 cell 停留展开态直到重新启用。`disabled` 语义建议同时关闭已展开侧。

### F-12 countdown hook 的 `reset()`/`start()` 未被渲染器接线，属未暴露能力

- 位置：`countdown.tsx:168-179`。`useCountdownTimer` 返回的 `reset/start` 在 `CountdownRenderer` 中无人调用，也无 `component:method` 句柄或事件可触达；`autoStart:false` 只能靠 host 运行时改 prop 启动。要么删除，要么注册 component capability。

### F-13 notice-bar `direction` 语义与直觉相反（`'left'` 实际向左→右运动）

- 位置：`notice-bar.tsx:222-227`。`direction:'left'`（默认）播放 `reverse` 使文本左→右移入，OA-22 注释表明这是被测试锁定的公共契约（MM-24）。保留记录：语义命名反直觉，未来 host 文档需显著说明。

### F-14 swipe-cell 根元素 `pan-y` 会禁掉 cell 内部的横向原生滚动容器

- 位置：`swipe-cell.tsx:304`。与 F-01 同理（祖先链交集），行内如嵌横向轮播/scroll-snap 容器将无法触摸滚动。swipe-cell 行内横向滚动属低频场景，仅提示。

### F-15 touchmove 高频 `setState` 无 rAF 节流（有意设计，性能注记）

- 位置：`use-touch.ts:70-86`。每个 touchmove 触发一次 `setState`（120Hz 设备约 120 render/s，组件树小、渲染轻）。MA-10 注释表明已把派生状态从"每帧双渲染"优化为渲染期推导，剩余开销为位移驱动 UI 的必要更新；如后续出现卡顿，可在 hook 内做 rAF 合帧（仅保留每帧最后一次 delta）。

## 检查过程记录

1. 阅读基线：`docs/references/quick-reference.md`（RendererComponentProps/hooks 契约）、`docs/architecture/renderer-runtime.md`（事件透传/evaluationBindings 契约、布尔 prop 严格透传规则）。
2. 精读全部 10 个非测试源文件 + 2 个 test-support 文件 + `styles.css`；对照 `schemas.ts` 与 `mobile-renderer-definitions.ts` 的 fields/eventContracts 声明逐项核对。
3. grep 扫描与结果：
   - `addEventListener/removeEventListener`：4 组（notice-bar matchMedia、notice-bar root hover/focus、swipe-cell window pointerdown、swipe-cell container click capture），**全部在 cleanup 中配对移除，capture 标志一致**。
   - `setInterval/clearInterval`、`setTimeout/clearTimeout`：countdown tick（effect cleanup 清理）、notice-bar 轮播（cleanup + `visible` 入 deps）、pull-refresh successTimer（unmount 清理 + `isMountedRef` 双保险）——**配对完整**。
   - `IntersectionObserver`：`disconnect()` 于 effect cleanup ✓；`ResizeObserver`（swipe-cell ×2、notice-bar ×1）全部 `disconnect()` ✓。
   - `document.hidden`/`visibilitychange`：全包零命中（见 F-06）。
   - `as any`：零命中（test-support 中 `as never`/`as S` 属测试构造器，已被 build 排除）。空 catch：零命中（infinite-scroll 的 catch 均带 DEV 日志）。
   - 硬编码中文：仅作为 `t(key, { defaultValue })` 回退文案与 schemas 注释，`flux.mobile.pullRefresh/infiniteScroll/noticeBar` 三组 key 已在 `packages/flux-i18n/src/locales/en-US.ts:1152-1168` 与 `zh-CN.ts:1151-1167` 完整注册，D7 通过。
   - body scroll lock / 点透：包内无 `document.body.style.overflow` 类锁定写入，无恢复遗漏问题。
4. 构建边界核查：`tsconfig.build.json:12-21` 将 `*.test.*`、`__tests__`、`test-support*`、`*-test-support*` 全部排除，`dist/` 实测无 test-support 产物（`infinite-scroll-test-support.tsx` 引入的 `@testing-library/react`/`vitest` 不会进入生产包），D8 通过。
5. 契约核查（D2）：五个渲染器均从 `props.props/meta/regions/events` 取数，布尔 prop 一律 `=== true`/`!== false` 严格比较（符合 Resolved Boolean Props 规则），无直接 store 访问，无自建 context，`meta.className/testid/cid` 落根元素，事件派发统一携带 `event + evaluationBindings + scope`（node.scope 经 ref 镜像保持 handler 稳定），`data-slot` 命名无 BEM——通过。
6. F-01 事实性验证：`docs/architecture/mobile-responsive-baseline.md:178-190` 确认 `pan-x` 是文档化契约；playground `m5-showcase-app.json:80-128` 确认长列表是实际用法；全包 grep 确认无 `scrollTop` 手势激活检查；`resolveLucideIconStrict`（`packages/ui/src/lib/icon-utils.ts:296-306`）确认返回 `null` 不抛错，notice-bar 图标解析安全。
7. 本审计为只读检查，未修改 `packages/` 下任何文件，未运行任何 pnpm 命令。
