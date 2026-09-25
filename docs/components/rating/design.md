# rating

> Status: runtime（missing-components L1，plan 503，2026-09-25 flip）
> Owner package: `@nop-chaos/flux-renderers-form`
> ui primitive: `@nop-chaos/ui` `Rating`（flip 时新建，shadcn 约定）

## 1. 组件定位

星级评分表单控件：以整星/半星粒度提交一个标量数值。典型场景：满意度、打分、评价。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS `rating`：count、allowHalf、readOnly、texts（分档文案）。本实现取 count/allowHalf/readOnly + `allowClear`（点击当前值清空，AntD 同款语义）；分档文案 `texts` 不在 v1（demand-gated）。
- shadcn 无 Rating 基元——ui 层新建（放射状 radiogroup + roving 键盘）。

## 3. Flux 中的 renderer/type 定义

`type: 'rating'`，定义于 `renderers/form-atoms-renderer-definitions.ts`，组件 `RatingRenderer`，`wrap: true`。

## 4. schema 设计

```json
{
  "type": "rating",
  "name": "score",
  "label": "评分",
  "count": 5,
  "allowHalf": true,
  "allowClear": true
}
```

- `count`（默认 5，钳制 ≥1）、`allowHalf`（0.5 粒度）、`allowClear`。
- 继承 `BoundFieldSchemaBase`；值三态：undefined = 未评。

## 5. 字段分类

| 字段                       | 归属          | 说明                   |
| -------------------------- | ------------- | ---------------------- |
| count/allowHalf/allowClear | `props.props` | propContracts 已登记   |
| value                      | 三态数值      | `numberAdapter` 绑定   |
| readOnly/disabled          | presentation  | 只读不响应、禁用半透明 |

## 6. regions 与 slot 约定

无 regions。

## 7. 运行期状态归属

值归属 form store；hover 预览态是 ui Rating 内部瞬时 UI 态，不入 store。

## 8. 事件、动作与组件句柄能力

- 事件：`onChange`/`onBlur` 共享通道。
- 句柄：`clear` / `reset` / `focus`。

## 9. 数据源、表达式、导入能力接入点

value 支持 `${...}` 初值；无 IO。

## 10. 样式与 DOM marker 约定

- 根 marker：`nop-rating-field`。
- ui 侧 `data-slot="rating"`（role=radiogroup）/`data-slot="rating-star"`（role=radio，`data-level=full|half|empty`）；值回显 `data-slot="rating-value"`。
- 半星 = 溢出裁切双星叠层（`w-1/2`），无 canvas。

## 11. 实现拆分建议

ui `rating.tsx`（基元：radiogroup/键盘/hover/half 渲染）+ renderer（字段绑定/句柄）+ definitions/schemas/contracts。

## 12. 风险、取舍与后续阶段

- 键盘半步 = Shift+Arrow（0.5）；纯键盘整步 = Arrow（1）。
- `texts` 分档文案、自定义图标：demand-gated。

## 13. 响应式行为

星尺寸固定 `size-4`，随容器横向排列自然换行不折断（flex nowrap）；触控命中 ≥ 24px（p-0.5 + star 16px）。
