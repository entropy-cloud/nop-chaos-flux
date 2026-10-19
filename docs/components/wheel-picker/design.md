# WheelPicker 家族组件设计（picker-view / wheel-picker / wheel-date-picker / wheel-time-picker / wheel-cascader）

> Source: plan 665（M7，2026-10-19）；内核路线依据 `docs/analysis/2026-10-19-mobile-advanced-libs-deep-research.md` §4.5/§8（TDesign rAF quartEaseOut + vant/arco/nutui 惯性参数组）

## 1. 组件定位

移动端**滚轮选择家族**，归属 `flux-renderers-mobile`，全部构建于同一 WheelView 内核（`src/wheel-view.tsx`，plan 665 Phase 1）之上：

| type                | 形态               | 用途                                                                                  |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| `picker-view`       | 内联滚轮（无弹层） | 页面内嵌多列滚轮；单列落定派发 `change`                                               |
| `wheel-picker`      | 弹出选择字段       | 触发器 + 底部弹层 + 取消/确认；单列/多列并列                                          |
| `wheel-date-picker` | 弹出日期字段       | `wheel-picker` 弹层壳 + 年/月/日列配置（`wheel-date-columns.ts`）；value `YYYY-MM-DD` |
| `wheel-time-picker` | 弹出时间字段       | 时/分列（`minuteStep`）；value `HH:mm`                                                |
| `wheel-cascader`    | 弹出级联字段       | 父→children 列联动；确认提交完整叶子路径                                              |

## 2. 命名裁定（记录在案）

- `type: 'picker'` 已被 `flux-renderers-form-advanced` 占用（桌面字段选择壳，`docs/components/picker/design.md` §3）——本家族不占用。
- `cascader` 名字被 missing-components roadmap L2.6 裁决保留（demand-gated 桌面列式形态）——本家族用 `wheel-cascader`。
- `date-picker`/`time-picker` 裸名当前无冲突，取 `wheel-` 前缀为家族一致性 + 避让 form 包 `input-date`/`input-time`/`input-datetime` 近邻族。
- 与 roadmap M7 行的关系：原行「picker/date-picker/cascader 派生」为提案时点命名，落地实名如上（roadmap 行已就地勘误）。

## 3. WheelView 内核契约（四组件共享）

- **几何**：行高默认 44px（M0 触摸目标基线）；可视行数默认 5；条带 translateY，index n 静止于 `-n·rowHeight`。
- **手势**：条带跟手；松手按 vant/arco/nutui 同参惯性（触发 <300ms 且位移 >15px，投影 `v/0.003`，`nearest` 行吸附，clamp [0, rowCount-1]）；非惯性松手按当前位移吸附。
- **落定派发**：`change`/`onSettle` 在动画落定帧恰一次（rAF MomentumAnimator 可打断——schema/受控中途变更立即 stop；判别：旧 CSS transition 路线不可打断）。
- **受控回写抑制**（draggingRef 范式）：手势进行中的外部 value 写入不打断手势；落定以落点为准派发，宿主回写后受控对齐。value 查找 miss（列缩短）时 clamp 到前次提交索引，仅视觉对齐、不派发。
- **touchcancel**（OA-05 谱系）：系统打断不提交、不派发，回弹到手势前索引。
- **DOM markers**：根 `nop-picker-view` + `data-slot="picker-view"`；列 `data-slot="picker-view-column"` + `data-column`；条带 `data-slot="picker-view-strip"`；行 `data-slot="picker-view-row"` + `data-index`；选中行 `data-active="true"`（e2e 断言通道）。
- **手势所有权**（baseline §5）：根元素 `touch-action: pan-x`（滚轮拥有垂直轴）。

## 4. 弹层壳契约（wheel-picker-popup，家族共享）

- 挂载即取 M0.1d 全局 z-index 栈一席（`useGlobalZIndex`）。
- M6 `useLockScroll` 全局模式：弹层开 → body `nop-scroll-lock`，关 → 移除。
- 面板 `nop-safe-bottom`（safe-area 类）；backdrop 点击 = 取消。
- 工具栏取消/确认按钮：i18n `flux.mobile.wheelPicker.cancel/confirm`。
- data-slot 族：`wheel-picker-popup` / `wheel-picker-backdrop` / `wheel-picker-panel` / `wheel-picker-toolbar` / `wheel-picker-cancel` / `wheel-picker-confirm`。

## 5. Schema 契约

### picker-view

```typescript
interface PickerViewSchema extends BaseSchema {
  type: 'picker-view';
  columns?: WheelPickerOption[][]; // { label, value } 按列
  value?: (string | number)[]; // 受控选中值（按列）
  rowHeight?: number; // 默认 44
  visibleRows?: number; // 默认 5
  disabled?: boolean;
  onChange?: ActionSchema | ActionSchema[];
}
```

- `onChange` payload：`{ type: 'change', column, index, value, label }`（单列落定）。

### wheel-picker / wheel-date-picker / wheel-time-picker / wheel-cascader

公共字段：`label`/`name`（FieldFrame 字段包裹）/`value`/`placeholder`/`disabled`/`required`/`onConfirm`/`onCancel`。

- `wheel-picker`：`columns`（同 picker-view）；confirm payload `{ type: 'confirm', value: (string|number)[], labels: string[] }`；cancel payload `{ type: 'cancel' }`。
- `wheel-date-picker`：`min`/`max`（`YYYY-MM-DD`，默认 1900-01-01/2100-12-31）；value `YYYY-MM-DD`；年列 = 范围年集；月列同年范围时钳制到 [min.m, max.m]、跨年全 1–12；日列恒 1–31、按选中年月收敛（闰年/月长）+ 范围钳制（`dateSelectionFor`）。
- `wheel-time-picker`：`minuteStep`（默认 1）；value `HH:mm`；分钟列按步进取值、选择值 floor 到步进倍数。
- `wheel-cascader`：`options` 树（`{ label, value, children? }`）；value = 自根到叶值数组；父列换选 → 子列重置为新父首孙链；确认在非叶节点提交时补全首孙路径到叶子。

### 表单绑定

`name` + form owner（`useCurrentForm`）在场时：confirm 调 `form.setValue(name, value)`，并按能力判断调用 `form.validateField(name, 'change')`（ValidationScopeRuntime 无此方法——能力探测而非类型断言）。无 form owner 时仅派发事件。

## 6. 边界情况

| 场景                                 | 行为                                                     |
| ------------------------------------ | -------------------------------------------------------- |
| columns 为空                         | picker-view 渲染空壳不抛错、不派发                       |
| value 含未知值                       | 该列回退索引 0（初装）；受控更新中 miss → clamp 前次索引 |
| 列缩短至当前索引之外                 | 视觉 clamp 到新末项（不派发，见 §3）                     |
| 惯性落点越界                         | clamp 边界索引回弹                                       |
| 触摸中途多指/滚动接管（touchcancel） | 回弹不提交（OA-05）                                      |
| 级联叶子提前选中                     | 叶子层无 children → 不再展开空列                         |
| 弹层打开滚动页面                     | useLockScroll 位掩码阻穿透                               |

## 7. 与 input-city / L2.6 的对账

- **`input-city`（missing-components L2.2 落地物，plan 506）**：省市区字段已自带移动 wheel 分支（`flux-renderers-form/src/renderers/org/region-wheel.tsx`，CSS scroll-snap `snap-y snap-mandatory` 形态）。本家族不改动它；若日后追求全仓滚轮手感一致性（rAF 惯性/吸附/受控抑制），可将其 wheel 分支迁移到 WheelView 内核——已登记为本计划 Non-Blocking Follow-up（optimization candidate）。
- **L2.6 cascader 裁决**（`docs/analysis/cascader-vs-tree-select-decision.md`）：桌面 cascader 认定独立交互形态、demand-gated。`wheel-cascader` 不占用 `cascader` 类型名（§2），二者互不阻塞；未来桌面 cascader 若立项，数据面可复用本家族的树→列派生思路。

## 8. 包归属

| 文件                                                                          | 包                                             |
| ----------------------------------------------------------------------------- | ---------------------------------------------- |
| `wheel-view.tsx`（内核）/ `wheel-picker-popup.tsx`（弹层壳）/ 全部 5 renderer | `flux-renderers-mobile`                        |
| `wheel-column-logic.ts` / `wheel-date-columns.ts`（纯函数）                   | `flux-renderers-mobile`                        |
| schema 定义                                                                   | `flux-renderers-mobile/src/schemas.ts`         |
| 注册                                                                          | `mobile-renderer-definitions.ts`（共 10 定义） |
