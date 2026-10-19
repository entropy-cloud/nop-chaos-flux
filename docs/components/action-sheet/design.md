# ActionSheet 组件设计

> Source: plan 666（M8d，2026-10-19）；交互基线 `docs/analysis/2026-10-19-mobile-advanced-libs-deep-research.md` §6（ActionSheet 共识 7/11 库）

## 1. 组件定位

- `action-sheet` 是移动端**操作菜单弹层** renderer：触发器 + 底部弹出 items 面板（list/grid 形态）+ 取消。
- 归属 `flux-renderers-mobile`；弹层承载复用 M7 弹层壳模式（useGlobalZIndex 栈位 + M6 useLockScroll + nop-safe-bottom）。

## 2. 形态决策记录（M8d Decision）

**裁定：mobile renderer 落地，非 ui Sheet 派生。**

| 维度           | mobile renderer（采纳）                                                     | ui Sheet 派生（否决）                                              |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| items 数据模型 | `items: {label, value, disabled}[]` 是渲染器 schema 契约，编译器可校验/覆盖 | ui Sheet 是无语义 surface，items 只能塞 children，丢类型与校验     |
| 事件           | `onSelect {type,index,value,label}` 一等事件（C7 payload 契约）             | 无事件位；派发需经 children 内 button 自行接 action                |
| 形态切换       | `display: list/grid` schema 一等字段                                        | 需调用方手写布局                                                   |
| 弹层机制       | 直接复用 z-index 栈 + 滚动锁 + safe-bottom（与 wheel-picker 弹层壳同构）    | 复用 Base-UI Dialog 全套（焦点陷阱/escape 等对操作菜单是过度承载） |
| ui 红线        | 不触碰 ui 包                                                                | 需给 ui Sheet 加 items/泛型扩展，污染通用面                        |

被否决方向不预留接口：若未来 ui 层出现通用 bottom-sheet 容器需求，另行立项（当前 wheel-picker/action-sheet 各自内聚的弹层壳先例已足够）。

## 3. Schema 设计

```typescript
interface ActionSheetItem {
  label: string;
  value: string | number;
  disabled?: boolean;
}
interface ActionSheetSchema extends BaseSchema {
  type: 'action-sheet';
  triggerText?: string;
  title?: string;
  items?: ActionSheetItem[];
  display?: 'list' | 'grid'; // 默认 list
  cancelText?: string; // 默认 i18n flux.mobile.actionSheet.cancel
  closeOnMask?: boolean; // 默认 true
  disabled?: boolean;
  onSelect?: ActionSchema | ActionSchema[]; // { type:'select', index, value, label }
  onCancel?: ActionSchema | ActionSchema[]; // { type:'cancel' }
}
```

## 4. 交互与 DOM

- 触发器 `data-slot="action-sheet-trigger"`；弹层 `action-sheet-popup`；遮罩 `action-sheet-mask`（closeOnMask 时点击=cancel）；面板 `action-sheet-panel`（nop-safe-bottom）；条目 `action-sheet-item` + `data-index` + `data-disabled`；容器 `action-sheet-items-{list|grid}`；取消 `action-sheet-cancel`。
- disabled item：`disabled` 属性 + opacity 0.5；点击不派发、不关闭。
- 条目点击：派发 `onSelect` 后关闭。遮罩/取消：派发 `onCancel` 后关闭。
- i18n：`flux.mobile.actionSheet.cancel`。
- 无新 CSS 字面量（分隔线用 `--nop-action-sheet-divider` 覆盖变量，缺省继承）。

## 5. 边界情况

| 场景                          | 行为                 |
| ----------------------------- | -------------------- |
| disabled item 点击            | 不派发、不关闭       |
| 遮罩点击（closeOnMask=false） | 无操作               |
| items 为空                    | 面板仅剩取消按钮     |
| 弹层打开滚动页面              | useLockScroll 阻穿透 |
