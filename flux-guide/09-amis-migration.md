# 与 AMIS 的主要差异

| 特性     | AMIS                                                                 | Flux                                                                                                                                                                                                                                                            |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 动作系统 | `actionType` + `onEvent`                                             | Action Algebra (`onClick` + `action`)                                                                                                                                                                                                                           |
| 数据源   | 组件级 `api`/`source`；`service` 组合容器 + `schemaApi` 动态页面加载 | `data-source` 负责请求取数 + action 链编排；`dynamic-renderer` 替代 `schemaApi` 动态加载页面 schema。**Flux 无 `service` 组件**——其"基于数据态切换 body/empty/error/loading 渲染"的能力可由 `data-source formula` + `container`/`dynamic-renderer` 组合等价替代 |
| 表单提交 | `api` 直接配置                                                       | `submitAction` + `onSubmitSuccess/onSubmitError`                                                                                                                                                                                                                |
| 弹窗     | `actionType:'dialog'`                                                | `openDialog` action                                                                                                                                                                                                                                             |
| 类型系统 | `type` 字段                                                          | `type` 字段 + 编译期校验                                                                                                                                                                                                                                        |
| 样式     | className + CSS                                                      | Tailwind + `cn()` + `data-slot`                                                                                                                                                                                                                                 |
| 移动端   | 无专门支持                                                           | `flux-renderers-mobile` 包                                                                                                                                                                                                                                      |
| 表达式   | `${expr}`                                                            | `${expr}` (编译期预编译)                                                                                                                                                                                                                                        |
| 状态管理 | MobX store                                                           | Zustand + ScopeRef                                                                                                                                                                                                                                              |
| 校验     | 组件级 validations                                                   | 字段级属性 + 表单级 rules                                                                                                                                                                                                                                       |
| 结构节点 | 无                                                                   | fragment / loop / recurse / reaction                                                                                                                                                                                                                            |

---

## 属性映射总览

从 AMIS 迁移时，属性需要在转换层（`flux-web.xlib`）中处理。以下按组件类别列出所有映射。

### 全局属性（所有组件适用）

| AMIS 属性        | Flux 属性        | 说明                                                                         |
| ---------------- | ---------------- | ---------------------------------------------------------------------------- |
| `visibleOn`      | `visible`        | 条件显示表达式（Flux 中 `when`/`visible`/`hidden` 均为表达式字段，效果等价） |
| `hiddenOn`       | `hidden`         | 条件隐藏表达式                                                               |
| `disabledOn`     | `disabled`       | 条件禁用表达式                                                               |
| `className`      | `className`      | 直接对应                                                                     |
| `labelClassName` | `labelClassName` | 直接对应                                                                     |

### Button / DropdownButton

| AMIS 属性                 | Flux 属性  | 说明                                              |
| ------------------------- | ---------- | ------------------------------------------------- |
| `level`                   | `variant`  | AMIS `level="primary"` → Flux `variant="primary"` |
| `icon`                    | `icon`     | 直接对应                                          |
| `label`                   | `label`    | 直接对应                                          |
| `disabled`                | `disabled` | 直接对应                                          |
| `tooltip`                 | `tooltip`  | 直接对应                                          |
| `iconOnly`                | （删除）   | 由转换层根据 `icon` + `label` 自动推断            |
| `visibleOn`               | `visible`  | 条件显示表达式                                    |
| `level`（dropdown-group） | `variant`  | 同 button                                         |

### actionType → action 转换

AMIS 的 `actionType` + `api`/`dialog`/`drawer` 组合在 Flux 中被转换为具体的 action 类型：

| AMIS actionType      | Flux action                                        | 说明           |
| -------------------- | -------------------------------------------------- | -------------- |
| `ajax`（或有 `api`） | `{action: 'ajax', args: {url, method, data, ...}}` | API 调用       |
| `dialog`             | `{action: 'openDialog', args: {...}}`              | 打开弹窗       |
| `drawer`             | `{action: 'openDrawer', args: {...}}`              | 打开抽屉       |
| `reload`             | `{action: 'refreshNearest'}`                       | 刷新最近数据源 |
| `close` / `cancel`   | `{action: 'closeSurface'}`                         | 关闭弹窗/抽屉  |
| `copy`               | `{action: 'setValue', args: {path, value}}`        | 复制到剪贴板   |
| `toast`              | `{action: 'showToast', args: {message, level}}`    | 显示通知       |
| `link`               | `{action: 'navigate', args: {url}}`                | 页面跳转       |
| `url`                | `{action: 'navigate', args: {url, replace}}`       | URL 跳转       |
| `submit`             | `{action: 'submitForm'}`                           | 提交表单       |
| `custom`             | （保留 `onClick`）                                 | 自定义动作     |

### AMIS action 中被删除的属性

以下 AMIS action 属性在 Flux 中不存在，直接删除：

| AMIS 属性     | 说明                                           |
| ------------- | ---------------------------------------------- |
| `actionType`  | 转换为 `action` 类型                           |
| `type`        | 重复的类型标识                                 |
| `actions`     | 子动作列表（Flux 用 `parallel`）               |
| `api`         | 转换为 `ajax` action 的 `args.url`             |
| `dialog`      | 转换为 `openDialog` action                     |
| `drawer`      | 转换为 `openDrawer` action                     |
| `feedback`    | Flux 无此概念                                  |
| `confirmText` | 保留在 `ajax` action 中                        |
| `messages`    | 保留在 `ajax` action 中                        |
| `initApi`     | Flux 无此概念                                  |
| `onEvent`     | Flux 用 reaction 系统                          |
| `content`     | 转换为 action args                             |
| `link`        | 转换为 `navigate` action                       |
| `url`         | 转换为 `navigate` action                       |
| `blank`       | 转换为 `navigate` action 的 `replace` 参数     |
| `copyFormat`  | 转换为 `setValue` action                       |
| `target`      | Flux 用 `targetId`                             |
| `batch`       | Flux 无此概念（批量操作用 checkbox selection） |
| `source`      | 转换为 `loadAction`                            |

### Grid Column

| AMIS 属性         | Flux 属性        | 说明                                        |
| ----------------- | ---------------- | ------------------------------------------- |
| `id`              | `name`           | 列字段名                                    |
| `label`           | `label`          | 列标题（支持 i18n）                         |
| `width`           | `width`          | 直接对应                                    |
| `sortable`        | `sortable`       | 直接对应                                    |
| `align`           | `align`          | 直接对应                                    |
| `fixed`           | `fixed`          | 直接对应                                    |
| `toggled`         | `toggled`        | 列是否默认显示                              |
| `visibleOn`       | `visible`        | 条件显示表达式                              |
| `disabledOn`      | `disabled`       | 条件禁用表达式                              |
| `className`       | `className`      | 直接对应                                    |
| `labelClassName`  | `labelClassName` | 直接对应                                    |
| `classNameExpr`   | `className`      | Flux 所有属性支持表达式，直接用 `className` |
| `headerAlign`     | `headerAlign`    | Flux 支持                                   |
| `vAlign`          | `vAlign`         | Flux 支持                                   |
| `minWidth`        | `minWidth`       | Flux 支持                                   |
| `maxWidth`        | `maxWidth`       | Flux 支持                                   |
| `resizable`       | `resizable`      | Flux 支持                                   |
| `copyable`        | `copyable`       | Flux 支持                                   |
| `searchable`      | `searchable`     | 直接对应                                    |
| `filterable`      | `filterable`     | 直接对应                                    |
| `quickEdit`       | `quickEdit`      | 直接对应                                    |
| `editable`        | `editable`       | 直接对应                                    |
| `popOver`         | `popOver`        | 直接对应                                    |
| `breakpoint`      | （删除）         | AMIS 响应式列配置，Flux 不支持              |
| `backgroundScale` | （删除）         | AMIS 特有，Flux 不支持                      |
| `groupName`       | （删除）         | AMIS 分组列配置，Flux 不支持                |

### Picker

AMIS picker 弹出一个 CRUD 表格页面供用户选择。`pickerSchema` 定义了弹出页面的 CRUD schema。

**v3.2 落地状态（2026-09-02 计划完成）**：Flux picker 已完成职责分离重写。picker 不再重复实现 CRUD 多选/分页保留等机制（已下放给 CRUD 原生 rowSelection）。picker 通过 React Context 注入统一选择累积，所有 pickerSchema（包括 CRUD）通过显式 `pick` action 提交选择。

在 Flux v3 中，picker 的结构是：

```jsonc
{
  "type": "picker",
  "pickerPopup": { "type": "dialog", "size": "lg", "title": "选择..." },  // 弹出层配置（替代 pickerDialog）
  "pickerSchema": {                            // 弹窗内容（任意 BaseSchema）
    "type": "crud",
    "loadAction": { ... },
    "columns": [ ... ],
    "rowSelection": { "type": "checkbox", "keepOnPageChange": true }   // 多选由 CRUD 原生支持
  },
  "valueField": "id",                          // 值字段
  "labelField": "name",                        // 标签字段
  "multiple": true,
  "delimiter": ","
}
```

**v3 转换规则（已落地）**：

| AMIS 属性            | Flux 属性             | 说明                                                       |
| -------------------- | --------------------- | ---------------------------------------------------------- |
| `valueField`         | `valueField`          | 直接对应（**改名**：原 Flux `valueKey` → `valueField`）    |
| `labelField`         | `labelField`          | 直接对应（**改名**：原 Flux `labelKey` → `labelField`）    |
| `labelTpl`           | `labelTpl`            | 复合模板显示已选标签                                       |
| `pickerSchema`       | `pickerSchema`        | 直接对应（任意 BaseSchema）                                |
| `modalMode`          | `pickerPopup.type`    | 直接对应（`dialog` / `drawer` / `popover`）                |
| `modalSize`          | `pickerPopup.size`    | 直接对应（`xs` / `sm` / `default` / `lg` / `xl` / `full`） |
| `modalTitle`         | `pickerPopup.title`   | 直接对应                                                   |
| `pickerDialog`       | `pickerPopup`         | 重命名（`pickerDialog` → `pickerPopup`）                   |
| `delimiter`          | `delimiter`           | 多选分隔符（默认 `,`）                                     |
| `overflowConfig`     | `overflowConfig`      | 多选标签溢出（`maxTagCount` + `overflowTagPopover`）       |
| `itemClearable`      | `itemClearable`       | 单标签可清除                                               |
| `clearable`          | `clearable`           | 整体可清除                                                 |
| `onEvent.itemClick`  | `onItemClick`         | 点击已选标签动作                                           |
| `resetValue`         | `resetValue`          | 清除重置值                                                 |
| `embed`              | `embed`               | 内嵌模式                                                   |
| `options` / `source` | `pickerSchema.source` | 移入 `pickerSchema`（list/tree/source 类型）               |
| `multiple`           | `multiple`            | 直接对应                                                   |
| `placeholder`        | `placeholder`         | 直接对应                                                   |

**v3 选择提交机制（picker 上下文 + pick action）**：

1. picker 渲染 pickerSchema 时包裹 `PickerContext.Provider`，暴露 `{ pickerId, pick, unpick, clear, selection }`
2. pickerSchema 内的按钮通过 `{ action: 'pick', args: { value, rows } }` 累积选择
3. 行选择（checkbox / row click）只是视觉反馈，picker 不读取 CRUD selectionStatePath
4. 用户点 picker 确认 → picker 从 `PickerContext.selection` 读取累积值 → 写表单

**已移除字段**（破坏性变更）：`valueKey` / `labelKey` / `pickerDialog` / 顶层 `options` / 顶层 `loadAction` / 顶层 `columns` / 顶层 `searchable` / 顶层 `source`。调用方需迁移至 v3 schema。

### Select

| AMIS 属性     | Flux 属性     | 说明         |
| ------------- | ------------- | ------------ |
| `valueField`  | `valueKey`    | 选项值字段   |
| `labelField`  | `labelKey`    | 选项标签字段 |
| `source`      | `loadAction`  | 远程数据源   |
| `multiple`    | `multiple`    | 直接对应     |
| `searchable`  | `searchable`  | 直接对应     |
| `clearable`   | `clearable`   | 直接对应     |
| `options`     | `options`     | 直接对应     |
| `placeholder` | `placeholder` | 直接对应     |

### Form Field（输入框、选择框等）

AMIS 的 `validations` 对象会被展平为 Flux 的字段级属性：

**AMIS 写法**：

```jsonc
{
  "type": "input-text",
  "validations": {
    "isRequired": true,
    "maxLength": 10,
    "isEmail": true,
  },
}
```

**Flux 写法**：

```jsonc
{
  "type": "input-text",
  "required": true,
  "maxLength": 10,
  "format": "email",
}
```

**转换规则**：

| AMIS 属性                | Flux 属性           | 说明                            |
| ------------------------ | ------------------- | ------------------------------- |
| `validations.isRequired` | `required`          | 必填                            |
| `validations.maxLength`  | `maxLength`         | 最大长度                        |
| `validations.minLength`  | `minLength`         | 最小长度                        |
| `validations.minimum`    | `min`               | 最小值（input-number）          |
| `validations.maximum`    | `max`               | 最大值（input-number）          |
| `validations.pattern`    | `pattern`           | 正则表达式                      |
| `validations.isEmail`    | `format: "email"`   | 邮箱格式                        |
| `validations.isUrl`      | `format: "url"`     | URL 格式                        |
| `validations.isInt`      | `format: "integer"` | 整数格式                        |
| `validations`（转换后）  | （删除）            | 转换后删除整个 validations 对象 |
| `validationErrors`       | （删除）            | 运行时错误，非 schema 属性      |
| `readOnly`               | `readOnly`          | 直接对应                        |
| `placeholder`            | `placeholder`       | 直接对应                        |
| `disabled`               | `disabled`          | 直接对应                        |
| `required`               | `required`          | 直接对应                        |
| `label`                  | `label`             | 直接对应                        |
| `name`                   | `name`              | 直接对应                        |
| `submitOnChange`         | （删除）            | 表单级属性，不需要在字段上      |
| `step`                   | （删除）            | AMIS 特有，Flux 不支持          |

### Form Container

| AMIS 属性          | Flux 属性          | 说明       |
| ------------------ | ------------------ | ---------- |
| `api`              | `submitAction`     | 提交 API   |
| `initApi`          | `initAction`       | 初始化 API |
| `source`           | `loadAction`       | 数据加载   |
| `submitOnChange`   | `submitOnChange`   | 直接对应   |
| `bodyClassName`    | `bodyClassName`    | 直接对应   |
| `actionsClassName` | `actionsClassName` | 直接对应   |

---

## 校验系统详解

### 字段级校验属性

Flux 支持以下字段级校验属性（直接在字段上声明）：

| Flux 属性   | 类型                            | 说明               |
| ----------- | ------------------------------- | ------------------ |
| `required`  | `boolean`                       | 必填               |
| `format`    | `'email' \| 'url' \| 'integer'` | 值格式校验         |
| `minLength` | `number`                        | 最小长度（字符串） |
| `maxLength` | `number`                        | 最大长度（字符串） |
| `min`       | `number`                        | 最小值（数字）     |
| `max`       | `number`                        | 最大值（数字）     |
| `pattern`   | `string`                        | 正则表达式         |

### 表单级校验规则

Flux 表单支持 `rules` 属性定义跨字段校验规则：

```jsonc
{
  "type": "form",
  "rules": [
    { "kind": "requiredWhen", "path": "endDate", "equals": true },
    { "kind": "atLeastOneOf", "paths": ["phone", "email"] },
  ],
}
```

### 可用的 ValidationRule 类型

| kind               | 说明         |
| ------------------ | ------------ |
| `required`         | 必填         |
| `requiredRange`    | 范围必填     |
| `minLength`        | 最小长度     |
| `maxLength`        | 最大长度     |
| `minItems`         | 最少项数     |
| `maxItems`         | 最多项数     |
| `atLeastOneFilled` | 至少一个有值 |
| `allOrNone`        | 全部或全空   |
| `uniqueBy`         | 唯一性校验   |
| `atLeastOneOf`     | 至少一个有值 |
| `pattern`          | 正则表达式   |
| `email`            | 邮箱格式     |
| `url`              | URL 格式     |
| `integer`          | 整数格式     |
| `format`           | 自定义格式   |
| `equalsField`      | 字段相等     |
| `notEqualsField`   | 字段不等     |
| `requiredWhen`     | 条件必填     |
| `requiredUnless`   | 反向条件必填 |
| `async`            | 异步校验     |

---

## button.variant 取值

AMIS `level` 与 Flux `variant` 的对应关系：

| AMIS level  | Flux variant | 视觉效果     |
| ----------- | ------------ | ------------ |
| `primary`   | `primary`    | 蓝色填充     |
| `secondary` | `secondary`  | 灰色填充     |
| `info`      | `info`       | 蓝色信息填充 |
| `success`   | `success`    | 绿色填充     |
| `warning`   | `warning`    | 橙色填充     |
| `danger`    | `danger`     | 红色填充     |
| `light`     | `light`      | 浅色/透明    |
| `dark`      | `dark`       | 深色背景     |
| `default`   | `default`    | 默认填充     |
| `link`      | `link`       | 链接样式     |

---

## 转换层实现位置

所有转换在 `nop-frontend-support/nop-web/src/main/resources/_vfs/nop/web/xlib/flux-web.xlib` 中实现：

| 转换函数            | 职责                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| `GenFormSimpleCell` | 表单字段属性转换（level→variant, visibleOn→visible, validations→字段属性）  |
| `GenGridCol`        | 表格列属性转换（visibleOn→visible, disabledOn→disabled）                    |
| `NormalizeAction`   | 动作属性转换（actionType→action, api→ajax, dialog→openDialog 等）           |
| `page_picker.xpl`   | Picker 页面结构（valueKey/labelKey 转换）                                   |
| `grid_crud.xpl`     | CRUD/Picker 表格结构（source→loadAction, size/modalSize→pickerDialog.size） |
