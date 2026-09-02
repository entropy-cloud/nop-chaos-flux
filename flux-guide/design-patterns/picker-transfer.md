# Picker 选择控件

> Design Status: stable (2026-09-02 计划 `2026-09-02-2028-1-flux-picker-schema-override.md` 已落地)
> Source: `flux-guide/09-amis-migration.md` Picker 节、`packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts`
> Related: AMIS `packages/amis/src/renderers/Form/Picker.tsx`、`docs/plans/2026-09-02-2028-1-flux-picker-schema-override.md`

> **v3.3 最终协议（2026-09-02 定稿）**：picker 与内容控件之间的绑定通道有且仅有两条，均为**通用机制、零组件 id、零类型嗅探**：
>
> 1. **scope 发布通道**：内容控件（CRUD 等）通过**自己的** `selectionStatePath` 配置把选中状态发布到 popup 局域 scope 的固定名 `$_picker.selection` / `$_picker.rows`（转换器/作者负责指向）；picker Confirm 读固定名做跨 scope 提交（值经 valueField/labelField 映射写入表单字段并关窗）。
> 2. **`pick` builtin action 通道**：内容元素以 `{ action: 'pick', args: { value, rows } }` 触发提交——注册为 Flux builtin action（无 id 假定），adapter 委托给 ambient `ctx.picker` 回调（镜像 `ctx.form` / `onSubmitSuccess` 先例）；picker 侧回调完成 valueField 映射 + 表单写回 + 关窗（single 即提交；multiple 累积、Confirm 一次性提交，累积用 ref 以免 popup 内容 fragment-scope 未提交窗口内重渲染破坏 region 行绑定）。
>
> 演进史：v3.1 读 CRUD selectionStatePath（越界）→ v3.2 PickerContext + pick action（React 上下文反向耦合，废弃）→ v3.3 纯 scope 发布 + builtin pick 回调（定稿）。全过程与机制层教训见 `nop-app-erp/docs/lessons/18-schema-contract-redesign-no-type-sniffing-no-sugar.md`。

## 设计原则

Picker 弹出的内容本质上是**任意可交互 schema**——可以是简单列表、CRUD 表单、tree、form（编辑后回填）、甚至自定义容器。Picker 不应耦合到特定的弹出层（dialog/drawer/popover）。Flux 设计目标：

1. **pickerSchema 是规范定义**：所有 picker 弹窗内容统一定义在 `pickerSchema`，不再使用散落的 `columns`/`loadAction`/`options`/`valueKey`/`labelKey` 直接属性
2. **pickerPopup 是弹出层规范定义**：picker 不应耦合到特定 surface 类型，由 `pickerPopup.type` 选择
3. **职责分离**：CRUD 多选/分页选择/行点击等机制属于 CRUD 自身能力（`rowSelection` / `keepOnPageChange` / `toggleOnRowClick`）；picker 不重复实现
4. **picker 只关注 picker 级 UX**：`labelTpl` / `overflowConfig` / `delimiter` / `valueField` / `labelField` / `autoFill` / `onPick` 是 picker 独有
5. **选择通过 CRUD 内置机制**：当 pickerSchema 是 CRUD 时，复用 CRUD 的 `selection` 机制（`selectionOwnership: 'scope'` + `selectionStatePath`）；picker 仅在 confirm 时读取并映射
6. **与 AMIS 对齐但不弱于 AMIS**：命名向 AMIS 看齐（`valueField`/`labelField` 而非 `valueKey`/`labelKey`）

## 职责边界

| 功能                                        | 归属            | 说明                                   |
| ------------------------------------------- | --------------- | -------------------------------------- | -------- |
| `pickerSchema`                              | picker          | picker 弹窗内容定义（任意 BaseSchema） |
| `pickerPopup`                               | picker          | 弹出层类型/标题/大小/位置              |
| `valueField` / `labelField`                 | picker          | value/label 映射（picker 特有）        |
| `joinValues` / `delimiter` / `extractValue` | picker          | value 拼接/提取格式                    |
| `multiple`                                  | picker          | 单选/多选模式                          |
| `clearable`                                 | `itemClearable` | picker                                 | 清除行为 |
| `autoFill`                                  | picker          | 选中后回填其他字段                     |
| `onPick`                                    | picker          | 选中后动作                             |
| `embed`                                     | picker          | 内嵌模式                               |
| `labelTpl`                                  | picker          | 选中项显示模板（复合展示）             |
| `overflowConfig`                            | picker          | 多选标签溢出配置                       |
| `rowSelection.keepOnPageChange`             | **CRUD**        | 分页切换保留已选项                     |
| `rowSelection.toggleOnRowClick`             | **CRUD**        | 行点击即选                             |
| `rowSelection.modifierSelect`               | **CRUD**        | 修饰键多选手势                         |
| `rowSelection.selectAllMode`                | **CRUD**        | 全选范围                               |
| `selectionOwnership` / `selectionStatePath` | **CRUD**        | 选中状态归属/scope 路径                |
| `autoClearSelectionOnRefresh`               | **CRUD**        | 刷新时清空选择                         |
| `queryForm`                                 | **CRUD**        | 查询表单（搜索/过滤）                  |

## 选择提交机制（v3.2 统一 picker 上下文 + 显式 pick action）

v3.2 起，picker **不直接读取 pickerSchema 内部状态**（包括 CRUD 的 `selectionStatePath`），而是通过 React Context 注入统一的「picker 上下文」，由 pickerSchema 内的元素显式调用 `pick` action 提交选择。

### Picker 上下文

```typescript
// picker-context.tsx（plan 落地新增）
interface PickerContextValue {
  pickerId: string;
  multiple: boolean;
  selection: PickerValue[];
  rows: Map<PickerValue, { label: string; row: Record<string, unknown> }>;
  pick: (value: PickerValue, row?: Record<string, unknown>, label?: string) => void;
  unpick: (value: PickerValue) => void;
  clear: () => void;
}
```

picker 渲染 pickerSchema 时包裹 `PickerContext.Provider`。pickerSchema 内的任意 schema（包括 CRUD / tree / list / form）通过 `useCurrentPicker()` 拿到上下文。

### 「pick」action（v3.2 统一机制，所有 pickerSchema 类型通用）

```jsonc
{
  "type": "button",
  "label": "选择",
  "onClick": {
    "action": "pick", // ← picker 内置 action（无需 componentId）
    "args": { "value": "${item.id}", "rows": "${item}" },
  },
}
```

### picker 与 pickerSchema 的接线

```
1. picker 打开 popup，渲染 pickerSchema
2. picker 包裹 PickerContext.Provider，pickerSchema 内元素可消费
3. 用户操作 pickerSchema 内的元素（点行/勾选/显式按钮）
   - 行 checkbox / row click 只是视觉选中，picker 不读取（不耦合）
   - 显式 pick 按钮调用 {action: 'pick'} 累积到 PickerContext
4. 用户点击 picker 的「确认」按钮
5. picker 从 PickerContext.selection 读取已选项
6. picker 通过 valueField/labelField 映射（可选：拉取完整 row 数据用于 autoFill）
7. picker 写回表单字段、关闭 popup
```

### CRUD pickerSchema 的使用方式

CRUD pickerSchema 必须**显式**在操作列或事件中提供 pick 触发点（picker 不自动注入）：

```jsonc
{
  "type": "crud",
  "loadAction": {...},
  "columns": [
    { "name": "id", "label": "ID" },
    { "name": "name", "label": "Name" },
    { "type": "operation", "buttons": [
      { "label": "选择", "onClick": { "action": "pick", "args": { "value": "${item.id}", "rows": "${item}" } } }
    ] }
  ],
  "rowSelection": { "type": "checkbox" }   // 仅视觉反馈
}
```

> **职责完全分离**：CRUD 不知道 picker 存在，picker 不知道 pickerSchema 是 CRUD。双方通过 pick action 这个**通用接口**协作。

### 非 CRUD pickerSchema（tree / list / form / container）

pickerSchema 内的任意按钮通过 `{ action: 'pick', args: { value, rows } }` 提交。picker 不感知 pickerSchema 类型。

## 字段参考（Flux PickerSchema v3）

| 字段             | 类型                             | 说明                                    | 与 AMIS 对齐            |
| ---------------- | -------------------------------- | --------------------------------------- | ----------------------- |
| `type`           | `'picker'`                       | 组件类型                                | ✅ 一致                 |
| `name`           | `string`                         | 字段名（表单绑定）                      | ✅ 一致                 |
| `label`          | `string`                         | 显示标签                                | ✅ 一致                 |
| `multiple`       | `boolean`                        | 多选模式                                | ✅ 一致                 |
| `clearable`      | `boolean`                        | 整体可清除（默认 true）                 | ✅ 拆分自 itemClearable |
| `itemClearable`  | `boolean`                        | 单标签可清除（默认 true）               | ✅ 一致                 |
| `placeholder`    | `string`                         | 占位符                                  | ✅ 一致                 |
| `disabled`       | `boolean \| string`              | 禁用                                    | ✅ 一致                 |
| `readOnly`       | `boolean \| string`              | 只读                                    | ✅ 一致                 |
| `required`       | `boolean \| string`              | 必填                                    | ✅ 一致                 |
| `pickerPopup`    | `PickerPopupConfig \| boolean`   | 弹出层配置（**替代 pickerDialog**）     | ✅ 更通用               |
| `pickerSchema`   | `BaseSchema`                     | **弹窗内容 schema**（任意类型）         | ✅ 一致                 |
| `valueField`     | `string`                         | 选中值字段                              | ✅ 改用 AMIS 命名       |
| `labelField`     | `string`                         | 显示标签字段                            | ✅ 改用 AMIS 命名       |
| `labelTpl`       | `SchemaTpl`                      | 选中项显示模板（HTML 片段/Region 模板） | ✅ 一致                 |
| `joinValues`     | `boolean`                        | 多选时是否拼接为字符串（默认 true）     | ✅ 一致                 |
| `delimiter`      | `string`                         | joinValues 分隔符（默认 `,`）           | ✅ 一致                 |
| `extractValue`   | `boolean`                        | 是否提取嵌套值（默认 true）             | ✅ 一致                 |
| `overflowConfig` | `OverflowConfig`                 | 多选标签溢出配置                        | ✅ 一致                 |
| `autoFill`       | `Record<string, string>`         | 选中后回填其他字段                      | ✅ 一致                 |
| `onPick`         | `ActionSchema \| ActionSchema[]` | 选中后动作                              | ✅ 一致                 |
| `onItemClick`    | `ActionSchema \| ActionSchema[]` | 点击已选标签动作                        | ✅ 一致                 |
| `embed`          | `boolean`                        | 内嵌模式                                | ✅ 一致                 |
| `resetValue`     | `unknown`                        | 清除时写入的默认值                      | ✅ 一致                 |

### PickerPopupConfig（**替代 PickerDialogConfig**）

| 字段              | 类型                                                  | 说明                                 |
| ----------------- | ----------------------------------------------------- | ------------------------------------ |
| `type`            | `'dialog' \| 'drawer' \| 'popover'`                   | 弹出层类型（默认 `'dialog'`）        |
| `title`           | `string`                                              | 弹出层标题                           |
| `size`            | `'xs' \| 'sm' \| 'default' \| 'lg' \| 'xl' \| 'full'` | 弹出层大小（**与 AMIS 对齐 6 档**）  |
| `placement`       | `'left' \| 'right' \| 'top' \| 'bottom'`              | 抽屉/弹层位置（drawer/popover 模式） |
| `width`           | `string \| number`                                    | 自定义宽度（drawer/popover 模式）    |
| `height`          | `string \| number`                                    | 自定义高度（drawer/popover 模式）    |
| `closeOnEsc`      | `boolean`                                             | Esc 关闭（默认 true）                |
| `closeOnOutside`  | `boolean`                                             | 点击外部关闭（默认 true）            |
| `showMask`        | `boolean`                                             | 显示遮罩（popover 模式默认 false）   |
| `showCloseButton` | `boolean`                                             | 显示关闭按钮（默认 true）            |
| `confirmText`     | `string`                                              | 确认按钮文本（默认「确认」）         |
| `cancelText`      | `string`                                              | 取消按钮文本（默认「取消」）         |

### OverflowConfig

| 字段                 | 类型            | 说明                                |
| -------------------- | --------------- | ----------------------------------- |
| `maxTagCount`        | `number`        | 最大展示标签数（-1 = 不限制，默认） |
| `overflowTagPopover` | `PopoverConfig` | 收纳标签的 Popover 配置             |

### 弹出层类型选择

| 场景                           | 推荐类型                         | 理由                         |
| ------------------------------ | -------------------------------- | ---------------------------- |
| 单条记录选择（用户、订单）     | `dialog`                         | 居中弹层，聚焦用户注意       |
| 多条记录选择（关联订单、附件） | `drawer`（`placement: 'right'`） | 屏幕利用率高，可对比已有表单 |
| 简单选项（状态、分类）         | `popover`                        | 轻量，不打断当前操作         |
| 树形选择（分类、组织）         | `dialog` 或 `drawer`             | 视树深度而定                 |
| 内嵌选择（表单内筛选）         | `embed: true`（不用 popup）      | 不打断当前表单               |

### 命名决策

**为什么用 `pickerPopup` 而非 `pickerDialog`**：

1. `pickerDialog` 暗示弹出层总是 dialog，与「支持多种 surface 类型」的设计目标冲突
2. `pickerPopup` 是中性术语，覆盖 dialog/drawer/popover 三种 surface
3. 与 HTML popover 标准、Material UI Popover 等业界约定对齐
4. `PickerPopupConfig.type` 显式指定 surface 类型，比 `pickerDialog.placement` 隐式推断更清晰

**为什么不用 `pickerSurface`**：

1. Flux 内部「surface」术语已用于 action 上下文（`surfaceId` 等），与 picker popup 概念重叠
2. `popup` 在 web UI 中更直观

## label 解析（已选 value 显示 label）

ERP 编辑表单核心需求：已选 value（`customerId: 'cust-123'`）必须显示对应 label（'Acme Corp'），不能显示原始 ID。

### 解析机制

1. **picker mount 时**：根据现有 `value` + `valueField` + pickerSchema 提供的 `loadAction` 拉取对应选项
2. **反应式更新**：外部 `value` 变化时重新解析（mobx-style reaction）
3. **复用 pickerSchema 数据源**：不引入额外的 label 解析机制

### 实现思路

- pickerSchema 是 CRUD 时：CRUD 的 `loadAction` 已存在，picker 在 mount 时通过 `params: {id: value}` 等方式拉取对应项
- pickerSchema 是简单数据源（如 list 的 `/api/options`）：picker 在 mount 时附加 `filter` 参数（`{id: value}`）拉取对应项
- 非 CRUD schema（tree/list）：同理

## 选择提交流程

### 单选流程（CRUD pickerSchema）

```
1. 用户点击 picker 触发按钮
2. picker 打开 popup，渲染 pickerSchema（CRUD）
3. CRUD 加载数据，初始化选中状态（从 selectionStatePath 读取）
4. 用户点击行（toggleOnRowClick: true）或操作列按钮（pick action）选中一项
5. CRUD 自动更新 selectionStatePath 中的选中状态
6. 用户点击 picker 的「确认」按钮
7. picker 从 selectionStatePath 读取选中项 rowKey（单值）
8. picker 通过 valueField/labelField 映射
9. picker 写回表单字段、关闭 popup
10. picker 触发 onPick action
```

### 多选流程（CRUD pickerSchema）

```
1-5 同上（CRUD 处理多选累积、跨页保留）
6. 用户多次点击/勾选/全选/取消选中，CRUD 自动维护 selectionStatePath 中的数组
7. 用户点击 picker 的「确认」按钮
8. picker 从 selectionStatePath 读取选中项 rowKey 数组
9. picker 通过 valueField/labelField 映射每个值
10. picker 写回表单字段（数组）、关闭 popup
```

### 非 CRUD pickerSchema（tree/list/form）

```
1-2 同上
3. 内层 schema 通过 {action: 'pick', args: {value, rows}} 累积选择到 picker 上下文
4. 用户点击 picker 的「确认」按钮
5. picker 从累积状态读取（值数组或单值）
6-10 同上
```

### 未选中流程（Confirm 时无选择）

- 单选：写回 `null`（不修改表单字段，保留原值）
- 多选：写回 `[]`（清空已选项）
- 通过 picker 控件本身的「清除」按钮（`clearable: true`）可主动清空，写回 `resetValue ?? null`

### keyboard 可访问性

- `Space` 键打开 picker
- `Backspace` 键在多选模式下删除最后一个标签（当 input 获得焦点时）

## 与 AMIS picker 的对比

| 维度         | AMIS Picker                                 | Flux Picker v3                                           |
| ------------ | ------------------------------------------- | -------------------------------------------------------- |
| 弹窗内容定义 | `pickerSchema: any`（实际只支持 CRUD-like） | `pickerSchema: BaseSchema`（**任意**）                   |
| 多选机制     | 内置 CRUD selection                         | **复用** CRUD selection（不重复实现）                    |
| 行点击即选   | `checkOnItemClick`                          | `pickerSchema.rowSelection.toggleOnRowClick`             |
| 分页保留已选 | `keepItemSelectionOnPageChange`             | `pickerSchema.rowSelection.keepOnPageChange`             |
| 弹出层类型   | `modalMode: 'dialog' \| 'drawer'`           | `pickerPopup.type: 'dialog' \| 'drawer' \| 'popover'`    |
| 弹出层大小   | `xs/sm/md/lg/xl/full`（6 档）               | `xs/sm/default/lg/xl/full`（**6 档对齐**）               |
| 值字段       | `valueField: string`                        | `valueField: string`（对齐）                             |
| 标签字段     | `labelField: string`                        | `labelField: string`（对齐）                             |
| 标签模板     | `labelTpl: SchemaTpl`                       | `labelTpl: SchemaTpl`（对齐）                            |
| 多选分隔符   | `delimiter: string`                         | `delimiter: string`（对齐）                              |
| 标签溢出     | `overflowConfig`                            | `overflowConfig`（对齐）                                 |
| 清除行为     | `clearable` + `itemClearable`               | `clearable` + `itemClearable`（对齐）                    |
| 选中动作     | `onChange`（隐式）                          | `onPick: ActionSchema[]`（命令式 action）                |
| 已选标签点击 | `onEvent.itemClick`                         | `onItemClick: ActionSchema[]`（对齐）                    |
| 清除重置值   | `resetValue`                                | `resetValue`（对齐）                                     |
| 简写数据源   | `options` / `source`                        | ❌（强制走 `pickerSchema`，不保留简写）                  |
| 默认内容     | `pickerSchema: {mode: 'list'}`              | 缺省时由 Flux runtime 提供最小 CRUD（复用 rowSelection） |
| 表达式       | `${expr}` 字符串                            | `${expr}` 编译期预编译（更强）                           |
| 反应式选中   | ❌                                          | ✅（CRUD 内置 + reaction）                               |
| label 解析   | mobx reaction                               | Flux reaction（更强）                                    |

## 转换规则（AMIS → Flux）

| AMIS 属性                               | Flux 属性                                    | 处理                                                                         |
| --------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| `valueField`                            | `valueField`                                 | 直接对应（**改名**：原 Flux `valueKey` → `valueField`）                      |
| `labelField`                            | `labelField`                                 | 直接对应（**改名**：原 Flux `labelKey` → `labelField`）                      |
| `labelTpl`                              | `labelTpl`                                   | 直接对应                                                                     |
| `pickerSchema`                          | `pickerSchema`                               | 直接对应（核心保留）                                                         |
| `modalMode`                             | `pickerPopup.type`                           | 直接对应                                                                     |
| `modalSize`                             | `pickerPopup.size`                           | 直接对应（xs/sm/md/lg/xl/full 已对齐）                                       |
| `modalTitle`                            | `pickerPopup.title`                          | 直接对应                                                                     |
| `delimiter`                             | `delimiter`                                  | 直接对应                                                                     |
| `overflowConfig`                        | `overflowConfig`                             | 直接对应                                                                     |
| `clearable`                             | `clearable`                                  | 直接对应（拆分自 itemClearable）                                             |
| `itemClearable`                         | `itemClearable`                              | 直接对应                                                                     |
| `onEvent.itemClick`                     | `onItemClick`                                | 直接对应                                                                     |
| `resetValue`                            | `resetValue`                                 | 直接对应                                                                     |
| `options` + `source`                    | `pickerSchema`                               | 移入 `pickerSchema.loadAction`（AMIS 简写也强制走 pickerSchema，不保留简写） |
| `embed`                                 | `embed`                                      | 直接对应                                                                     |
| CRUD 内 `keepItemSelectionOnPageChange` | `pickerSchema.rowSelection.keepOnPageChange` | 直接对应（已在 CRUD）                                                        |
| CRUD 内 `checkOnItemClick`              | `pickerSchema.rowSelection.toggleOnRowClick` | 直接对应（已在 CRUD）                                                        |

> AMIS `pickerSchema` 内的 CRUD 配置（如 `columns`/`headerToolbar`）直接对应 Flux `pickerSchema`，无需特殊处理。

## 迁移影响

### 现有 Flux 调用点改动

1. **`packages/flux-renderers-form-advanced/src/picker-renderer.tsx`**：
   - 删除 `loadAction`/`columns`/`options`/`valueKey`/`labelKey` 直接属性分支
   - 新增 `pickerSchema` 渲染分支（任意 BaseSchema）
   - 新增 `pickerPopup.type` 分支（dialog/drawer/popover）
   - confirm 逻辑：CRUD pickerSchema 时读取 `selectionStatePath`；非 CRUD 时读取 picker 上下文累积状态
   - 删除「自动注入 picker CRUD props」逻辑（CRUD 已原生支持）

2. **`packages/flux-renderers-form-advanced/src/picker-helpers.ts`**：
   - `createPickerCrudSchema` 简化：不再注入 `selectionOwnership`/`selectionStatePath` 等 picker 专用机制
   - 改为通用 CRUD schema builder：仅当 pickerSchema 缺省时由 picker 自动构建默认 CRUD

3. **`packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts`**：
   - `PickerDialogConfig` 重命名为 `PickerPopupConfig`，新增 `type`/`placement` 等字段
   - PickerSchema 类型定义更新：删除旧字段，新增 `pickerSchema`/`pickerPopup`/`valueField`/`labelField`/`labelTpl`/`delimiter`/`overflowConfig`/`itemClearable`/`onItemClick`/`resetValue`

4. **`nop-entropy/nop-frontend-support/nop-web/.../flux-web.xlib`**：AMIS→Flux 转换层 `pickerDialog` → `pickerPopup` 转换；`valueField`/`labelField` 命名替换 `valueKey`/`labelKey`

5. **`flux-guide/design-patterns/picker-transfer.md`**：所有示例更新

### 测试用例改动

- `picker-renderer.test.tsx`：测试用例改用 `pickerSchema`/`pickerPopup` 与 `valueField`/`labelField`
- 新增 `picker-schema-override.test.tsx`：验证 pickerSchema 覆盖默认 CRUD 行为
- 新增 `picker-popup-types.test.tsx`：验证 dialog/drawer/popover 三种 popup 类型
- 新增 `picker-label-parse.test.tsx`：验证 label 反应式解析（已选 value 显示 label）
- 新增 `picker-overflow-config.test.tsx`：验证多选标签溢出
- 现有 `picker-crud-row-isolation.test.tsx`/`picker-autofill-scope-dispose.test.tsx`/`picker-label-resolve-retry.test.tsx`：适配新字段名

## 示例

### 示例 1：单选用户（CRUD pickerSchema，复用 rowSelection）

```jsonc
{
  "type": "picker",
  "name": "ownerId",
  "label": "负责人",
  "valueField": "id",
  "labelField": "userName",
  "pickerPopup": {
    "type": "dialog",
    "title": "选择负责人",
    "size": "default",
  },
  "pickerSchema": {
    "type": "crud",
    "loadAction": {
      "action": "ajax",
      "args": {
        "url": "@query:NopAuthUser__findPage",
        "selection": "total,page,items{id,userName,displayName}",
      },
    },
    "columns": [
      { "name": "userName", "label": "用户名", "sortable": true },
      { "name": "displayName", "label": "显示名" },
    ],
    "rowSelection": {
      "type": "radio", // ← 单选
      "toggleOnRowClick": true, // ← 行点击即选（AMIS checkOnItemClick）
    },
  },
}
```

> CRUD 自带 `rowSelection`，picker 无需额外机制。

### 示例 2：多选订单（CRUD pickerSchema，跨页保留）

```jsonc
{
  "type": "picker",
  "name": "orderIds",
  "label": "关联订单",
  "multiple": true,
  "valueField": "id",
  "labelField": "orderNo",
  "delimiter": ",", // ← 多选分隔符
  "overflowConfig": {
    "maxTagCount": 5, // ← 超过5个标签折叠
    "overflowTagPopover": { "placement": "top" },
  },
  "pickerPopup": {
    "type": "drawer",
    "placement": "right",
    "title": "选择订单",
    "size": "lg",
  },
  "pickerSchema": {
    "type": "crud",
    "loadAction": {
      "action": "ajax",
      "args": { "url": "@query:ErpSalOrder__findPage", "selection": "..." },
    },
    "queryForm": {
      "body": [{ "type": "input-text", "name": "keyword", "label": "订单号/客户" }],
    },
    "columns": [
      { "name": "orderNo", "label": "订单号", "sortable": true, "toggled": true },
      { "name": "customer", "label": "客户", "toggled": true },
      { "name": "amount", "label": "金额", "align": "right", "toggled": true },
    ],
    "rowSelection": {
      "type": "checkbox", // ← 多选
      "keepOnPageChange": true, // ← 跨页保留（AMIS keepItemSelectionOnPageChange）
      "toggleOnRowClick": true, // ← 行点击即选
      "modifierSelect": true, // ← shift/ctrl 多选
      "selectAllMode": "all", // ← 全选范围
    },
  },
}
```

> CRUD 内置多选 + 跨页保留 + 行点击即选 + shift/ctrl 多选。picker 无需介入。

### 示例 3：标签模板（labelTpl 复合展示）

```jsonc
{
  "type": "picker",
  "name": "customerId",
  "label": "客户",
  "valueField": "id",
  "labelField": "name",
  "labelTpl": "<div class='flex items-center gap-2'>"
           +   "<img src='${logo}' class='w-5 h-5 rounded' />"
           +   "<span>${name}</span>"
           +   "<span class='badge badge-${creditLevel}'>${creditLevelName}</span>"
           + "</div>",
  "pickerPopup": {
    "type": "dialog",
    "title": "选择客户",
    "size": "lg"
  },
  "pickerSchema": {
    "type": "crud",
    "loadAction": { "action": "ajax", "args": { "url": "@query:ErpMdPartner__findPage", "selection": "..." } },
    "columns": [
      { "name": "name", "label": "名称" },
      { "name": "creditLevelName", "label": "信用等级" }
    ],
    "rowSelection": { "type": "radio", "toggleOnRowClick": true }
  }
}
```

### 示例 4：autoFill 回填（CRUD pickerSchema）

```jsonc
{
  "type": "picker",
  "name": "customerId",
  "label": "客户",
  "valueField": "id",
  "labelField": "name",
  "autoFill": {
    "customerName": "name",
    "customerCode": "code",
    "customerAddress": "address",
  },
  "pickerPopup": { "type": "dialog", "title": "选择客户" },
  "pickerSchema": {
    "type": "crud",
    "loadAction": {
      "action": "ajax",
      "args": { "url": "@query:ErpMdPartner__findPage", "selection": "..." },
    },
    "columns": [
      { "name": "code", "label": "编码" },
      { "name": "name", "label": "名称" },
      { "name": "address", "label": "地址" },
    ],
    "rowSelection": { "type": "radio", "toggleOnRowClick": true },
  },
}
```

> CRUD 选中 row 后，picker 通过 autoFill 配置回填其他字段。

### 示例 5：树形选择（pickerSchema = tree，非 CRUD）

```jsonc
{
  "type": "picker",
  "name": "categoryId",
  "label": "选择分类",
  "valueField": "id",
  "labelField": "name",
  "pickerPopup": { "type": "dialog", "title": "选择分类", "size": "sm" },
  "pickerSchema": {
    "type": "tree",
    "source": "/api/categories",
    "selectable": true,
    "itemBody": {
      "type": "button",
      "variant": "ghost",
      "label": "${node.name}",
      "onClick": {
        "action": "pick",
        "args": { "value": "${node.id}", "rows": "${node}" },
      },
    },
  },
}
```

> 非 CRUD pickerSchema，使用内置 `pick` action 提交选择（无需 componentId）。

### 示例 6：状态选择（pickerPopup = popover，pickerSchema = list）

```jsonc
{
  "type": "picker",
  "name": "status",
  "label": "状态",
  "valueField": "value",
  "labelField": "label",
  "pickerPopup": {
    "type": "popover",
    "placement": "bottom",
    "showMask": false,
  },
  "pickerSchema": {
    "type": "list",
    "source": [
      { "label": "草稿", "value": "draft" },
      { "label": "已提交", "value": "submitted" },
      { "label": "已审核", "value": "approved" },
    ],
    "item": {
      "type": "button",
      "block": true,
      "variant": "ghost",
      "label": "${item.label}",
      "onClick": {
        "action": "pick",
        "args": { "value": "${item.value}" },
      },
    },
  },
}
```

### 示例 7：内嵌模式（不弹窗）

```jsonc
{
  "type": "picker",
  "name": "categoryId",
  "label": "分类",
  "valueField": "id",
  "labelField": "name",
  "embed": true,
  "pickerSchema": {
    "type": "tree",
    "source": "/api/categories",
    "selectable": true,
    "itemBody": {
      "type": "button",
      "label": "${node.name}",
      "onClick": { "action": "pick", "args": { "value": "${node.id}" } },
    },
  },
}
```

## 当前状态（2026-09-02 v3.2 落地）

✅ **`pickerSchema` 属性已在 Flux PickerSchema 中声明**（`composite-schemas.ts` PickerSchema v3）
✅ **`pickerPopup` 重命名完成**（`pickerDialog` 已彻底移除，不保留别名）
✅ **picker 上下文机制落地**（`picker-context.tsx` + PickerContextProvider 包裹）
✅ **职责分离**：picker 不再重复实现 CRUD 多选/分页保留等机制；CRUD `selectionStatePath` 不再被 picker 读取
✅ **label 反应式解析机制实现**：picker mount 时通过 `loadAction` 或 `labelResolveAction` 拉取已选 value 的 label
✅ **AMIS 字段补齐**：`labelTpl` / `overflowConfig` / `delimiter` / `itemClearable` / `onItemClick` / `resetValue` / `embed` / `pickerPopup.type`
✅ **转换层 `flux-web/grid_crud.xpl` 改造完成**：picker 模式输出嵌套 `picker > pickerSchema > crud` 结构
✅ **业务侧 5 个 view.xml 同步迁移**：`ErpSalDelivery` / `ErpSalInvoice` / `ErpPurReceive` / `ErpPurInvoice` / `ErpFinVoucherLine`
⏳ **测试用例**:6 个现有测试已迁移字段名(`valueKey` → `valueField` 等);5 个新测试文件待 Phase 3 收尾(plan 范围内)
✅ **`pick` action 注册**:已注册为 Flux builtin action(BUILT_IN_ACTION_REGISTRY/DEFINITIONS + dispatcher case + adapter 委托 `ctx.picker` ambient 回调),无组件 id 假定

**已知 partial 状态**:Phase 1-2 + Phase 2.5 + Phase 4 已完成;Phase 3(测试)与 Phase 5(全量验证)收尾中。具体状态见 `docs/plans/2026-09-02-2028-1-flux-picker-schema-override.md` Closure Gates。
