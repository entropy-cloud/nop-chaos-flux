# Image Compare 组件设计

## 1. 组件定位

- `image-compare` 是前后对比滑块 renderer：双图叠加 + 可拖动分隔线，用于修图前后、地图变更、商品图差异等场景（Arc `ImageCompare` 对照，arc-component-gap G7）。
- 场景型中低频（P3）；实现完全自包含，Playwright 可程序化断言。
- 归属 `@nop-chaos/flux-renderers-content` media 家族，与 `image` 共享加载/占位/错误降级约定。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无对应 type；flux media 家族（image/audio/video/carousel）无双图对比能力（roadmap §5.1 G7 live 实测）。
- **落点裁决：新 type `image-compare`**——决策表：

| 候选                                      | 裁决     | 理由                                                                                                                                                                           |
| ----------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| (a) 新 type `image-compare`               | **采纳** | 双图输入 + 分隔线位置交互 + 双层裁切渲染是独立契约边界（`image` 是单 src 展示，无可承载第二个图源与交互状态的字段面）；ui 无 primitive，renderer 内部自绘（无 ask-first 触碰） |
| (b) `image` 能力扩展（`compareSrc` 字段） | 拒绝     | 单一展示控件被注入第二数据源 + 拖拽交互状态，字段面/渲染路径分叉过半；对照 G5（dropdown-button 分体，协议 90% 复用）不成立——这里无既有协议可复用                               |
| (c) 宿主组合（两个 image + 宿主脚本）     | 拒绝     | 分隔线裁切需要双层同步几何（clip-path + 拖拽状态），宿主自拼绕开低代码一致渲染——正是 roadmap G7 立项的缺口本体                                                                 |

- **matrix 门禁**：新 type 经 CC2——matrix 增行提案已随本设计提交，flip 归人工确认（G7I 实现勘误：flip 目标状态为词表内 `runtime`，本文初稿误写 `retained`——词表无该态；已获人工批准 flip 为 `runtime`，G7I 解冻）。

## 3. Flux 中的 renderer/type 定义

- `type: 'image-compare'`
- 归属 `@nop-chaos/flux-renderers-content`
- 渲染器内部自绘（clip-path 双层 + pointer/键盘拖拽），零新依赖、零 ui primitive。

## 4. schema 设计

```typescript
interface ImageCompareSchema extends BaseSchema {
  type: 'image-compare';
  /** 前图（overlay 层，随分隔线裁切显示） */
  before: SchemaValue; // 图片 URL/路径，数据下沉约束：不做组件级 fetch 字段
  /** 后图（base 层，完整显示） */
  after: SchemaValue;
  /** 分隔线初始位置（0-100 百分比，默认 50；受控初始播种，非 reactive） */
  defaultPosition?: number;
  /** alt 文案（双图共用；无障碍基线） */
  alt?: string;
  /** 分隔线拖拽方向：'horizontal'（默认，左右对比）| 'vertical'（上下对比） */
  orientation?: 'horizontal' | 'vertical';
}
```

- `before`/`after`/`alt`: `value`（语义分类；definition 落位按 image 家族先例登记为 `prop`）；`defaultPosition`/`orientation`: `prop`（`defaultPosition` clamp 到 [0,100]）。G7I 实现注记：`before`/`after` 实现为可选（缺省/加载失败优雅落入 error 占位），较本节必填标注宽松。
- 分隔线运行时位置 = 组件 local UI state（不写 scope、无受控通道——首版无回写需求）。

## 5. 字段分类

见 §4 内联标注。

## 6. regions 与 slot 约定

- 首版无 regions（双图即内容本体）。

## 7. 运行期状态归属

- 分隔线位置（百分比）为组件 local UI state；`defaultPosition` 仅播种。
- 拖拽：pointer 事件（`onPointerDown` on handle/容器 + `setPointerCapture` + `onPointerMove`）；位置按容器 boundingRect 换算百分比并 clamp [0,100]。
- 键盘：handle `role="slider"` + `aria-label`（handle 自身可访问名，由 `alt` 派生为 "<alt> divider"——独立于 img 的 alt 复用）+ `aria-valuemin/max/now`（0-100）；方向键按模式成对——horizontal：ArrowLeft/ArrowRight ±1；vertical：ArrowUp/ArrowDown ±1；PageUp/PageDown ±10（沿轴向）；Home/End 0/100。
- 触摸：pointer events 天然覆盖。
- 图片加载失败：复用 `image` 的错误降级约定（失败侧显示占位错误文案，不阻断另一侧）。
- 双图加载独立（各自 onLoad/onError），加载中显示既有骨架/占位样式。

## 8. 事件、动作与组件句柄能力

- 首版无事件、无组件句柄（纯展示交互控件；`onPositionChange` 归后续 demand）。

## 9. 数据源、表达式、导入能力接入点

- `before`/`after` 支持表达式求值（`${...}` 图片地址）。
- **数据下沉约束**：零组件级 fetch 字段（不声明 `api`/`src` 拉取协议）——这是 roadmap G7 立项对本项的新增约束（注：既有 `image` 实际有组件级 `fetcher` 字段，非既有约定）。

## 10. 样式与 DOM marker 约定

- 根节点 `nop-image-compare` marker（widget 自样式：内部布局类合法）。
- `data-slot="image-compare-root"`；base 层 `data-slot="image-compare-after"`；overlay 层 `data-slot="image-compare-before"`（clip-path 裁切）；分隔线 `data-slot="image-compare-divider"`；拖拽 handle `data-slot="image-compare-handle"`（`role="slider"`）。
- overlay 裁切：horizontal 模式 `clip-path: inset(0 ${100-pos}% 0 0)`（显示 before 左侧）；vertical 模式 `inset(0 0 ${100-pos}% 0)`。
- 加载失败侧：`data-slot="image-compare-error"`（对齐 `image` 错误降级文案）。

## 11. 实现拆分建议

- `image-compare.tsx` 单文件自绘（双 img + divider/handle + 指针/键盘处理）；测试 `src/image-compare.test.tsx`（位置换算、键盘、降级、缺省渲染判别）。

## 12. 风险、取舍与后续阶段

- 双图尺寸不一致：base 层 `object-fit: contain` 统一（首版不裁切对齐，说明于文档）。
- clip-path 百分比换算与 RTL：首版仅 LTR 语义（divider 从左/上起），RTL 归后续。
- 后续候选：`onPositionChange` 事件、标签文案（before/after 角标）、RTL。
