# 76 Scada Hover Overlay Real-Browser Drift Fix（gate-3 类：单测绿但真机失效，I15.1 e2e 断言矩阵暴露）

## Problem

scada-canvas 的 hover 交互反馈在**真实浏览器**有两个失效面（I15.1 断言矩阵补强时实测暴露，包级单测全绿）：

1. **覆盖物移出后不消失**：hover 图元 → sky 层出现高亮覆盖物；指针移到画布空白区后覆盖物**永不清除**（`symbol:hover-miss` 未发射）。
2. **多边形覆盖物几何错误**：hover 多边形图元（`scada-polygon`，`custom.points` 包围盒 160×120）时 sky 层覆盖物为 **100×100 默认框**而非真实包围盒。

## Diagnostic Method

- 先按断言矩阵写 e2e（`tests/e2e/scada-edge-cases.spec.ts`、`scada-demo.spec.ts` hover 用例）——测试句柄读 `app.sky` 覆盖物组 rect 面断言，两个用例先后红灯。
- **漂移 1 定位**：在真实浏览器注入探针 spec，分别监听 `tree.on('pointer.move')` 与 `app.on('pointer.move')`，移动指针到画布空白角——`tree.move` 计数不变、`app.move` 恒增（探针证据）；对照阅读 leafer 源码 `@leafer-ui/interaction/src/Interaction.ts` `pointerMoveReal → checkPath → emit()`：命中路径为空时事件沿 defaultPath 派发（`emitAppChildren` 仅放行 `move/zoom/rotate/key` 前缀类型，`pointer.move` 不匹配），tree 层收不到 `pointer.move`。
- **漂移 2 定位**：e2e 断言多边形覆盖物 160×120 得到 100×100；探针读真实 leafer 节点 attrs——`Polygon` 节点 `width=100, height=100`（Path 形状默认值），`points` 才是真实几何（`Line` 同理 width=100/height=0）；mock 的 `MockLine`/`MockPolygon` 不含默认 width/height（`toShapeAttrs` 已删 width/height），points 分支在 mock 恒优先、掩盖了真实节点默认值分支抢先。

## Root Cause

- **漂移 1**：`EventBridge` 把 `pointer.move` 挂在 `tree` 层（design-engine.md §8.1 原始设计）。真实 leafer 交互层仅当命中路径含 tree 时向 tree 派发 `pointer.move`；指针位于空白画布时命中路径为空/defaultPath，tree 收不到事件 → `handleHover` 的 miss 分支永不执行 → hover 覆盖物遗留。I11.2 的 hover-miss 单测由 mock 建模（mock 的 tree 无条件收全部事件）未暴露。
- **漂移 2**：`interaction-overlay.ts` `resolveOverlayGeometry` 先读 `node.width/height`（>0 即采用），points 兜底仅在宽高为 0 时生效。真实 leafer 的 Path 形状（Line/Polygon）节点 `width/height` 为默认占位值（100），不反映 points 几何 → 多边形覆盖物退化为默认框。gate-4 m-C 修复的单测基于 mock（mock 节点无默认 width/height）未暴露。

## Fix

- **漂移 1（`engine/event-bridge.ts` + `engine/scada-engine.ts`）**：`pointer.move`/`pointer.leave` 改挂 **App 视图面**（`EventBridgeOptions.moveTarget`，引擎传 `this.app`）——app 对画布内任意位置（含空白区）恒发射 `pointer.move`（实测探针佐证），`pointer.leave` 覆盖指针离开画布场景；`tap`/`double_tap` 保持 tree 面。`symbol:hover-miss` 语义不变（命中空且前一命中存在 → miss；A→B 切换不发 miss）。
- **漂移 2（`engine/interaction-overlay.ts`）**：`resolveOverlayGeometry` 改为 **points 优先**——节点携带非空 `points` 时恒按 points 包围盒兜底（line/arrow/pipe/polygon 等 Path 形状），矩形语义图元（无 points）走 x/y/width/height 分支，0 尺寸退化最小框（MIN_OVERLAY_SIZE=8）不变。

## Tests

- `packages/flux-renderers-industrial/src/engine/event-bridge.test.ts`：pointer.move/leave 改挂 app 面（`createBridge` 增 `app = new MockApp(...)`）+ 新增 2 个 focused 回归（`pointer.leave` 发射 hover-miss / 未 hover 时不发射）；既有 hover-miss/A→B/未命中用例全部保留（仅事件发射面迁移）。
- `packages/flux-renderers-industrial/src/renderer/{scada-events,scada-event-actions,scada-hover-overlay}.test.tsx` + `engine/scada-engine.test.ts`：hover 驱动事件发射面迁移到 `engine.app`。
- e2e 断言矩阵（交付物）：`scada-edge-cases.spec.ts` 线/多边形 hover 覆盖物（尺寸 >0、多边形 160×120 精确断言、A→B 切换、空白区清除）+ `scada-demo.spec.ts` hover 出现/清除——先红后绿。
- 包级 462 tests / 34 files 全绿；scada-\* e2e 23/23 全绿。

## Affected Files

- `packages/flux-renderers-industrial/src/engine/event-bridge.ts`（moveTarget + pointer.leave）
- `packages/flux-renderers-industrial/src/engine/scada-engine.ts`（传 `moveTarget: this.app`）
- `packages/flux-renderers-industrial/src/engine/interaction-overlay.ts`（points 优先）
- `packages/flux-renderers-industrial/src/engine/event-bridge.test.ts` + 4 个 hover 相关测试文件
- `tests/e2e/scada-edge-cases.spec.ts`、`tests/e2e/scada-demo.spec.ts`（断言矩阵）

## Notes For Future Refactors

- leafer 事件挂载面语义：**命中驱动事件（tap/double_tap）挂 tree，位置驱动事件（pointer.move/leave）挂 App**——空白区移动只有 App 面能收到；`emitAppChildren` 只放行 `move/zoom/rotate/key` 前缀。
- leafer Path 形状节点（Line/Polygon/Arrow）的 `width/height` 是**默认占位值**（100），真实几何只在 `points`；任何基于节点尺寸的几何计算必须 points 优先。
- mock↔真实漂移防线：hover 反馈类行为断言必须含真实浏览器 e2e（测试句柄读 sky 层 rect），单测 mock 建模无法覆盖 leafer 交互层派发与 Path 形状默认值语义。
