# Flux 标准化规范

本文档定义 Flux 引擎的标准化规范，解决 AMIS 设计中的不一致性问题，并确保与 shadcn/ui + Tailwind CSS 的良好集成。

## 1. 使用 shadcn/ui 实现

### 1.1 组件映射策略

Flux 基于 **shadcn/ui** 实现，遵循以下原则：

| Flux 组件 | shadcn/ui 组件 | 映射策略 |
|-----------|---------------|---------|
| Button | Button | 直接映射，支持 variant、size |
| Input | Input | 直接映射 |
| Select | Select | 直接映射 |
| Checkbox | Checkbox | 直接映射 |
| Radio | RadioGroup + RadioGroupItem | 组合映射 |
| Switch | Switch | 直接映射 |
| Dialog | Dialog | 直接映射 |
| Drawer | Sheet | 使用 Sheet 组件（side 属性） |
| Tabs | Tabs | 直接映射 |
| Card | Card | 直接映射 |
| Table | Table | 直接映射，结合 TanStack Table |
| Toast | Toast | 使用 Sonner（已在项目中） |
| Form | Form | 使用 react-hook-form + zod 集成 |
| DatePicker | DatePicker | 使用 react-day-picker |
| Slider | Slider | 直接映射 |
| Progress | Progress | 直接映射 |
| Avatar | Avatar | 直接映射 |
| Badge | Badge | 直接映射 |
| Tag | Badge | 使用 Badge 的 variant="outline" |
| Collapse | Accordion | 使用 Accordion 组件 |
| Breadcrumb | Breadcrumb | 直接映射 |
| Pagination | Pagination | 直接映射 |
| Spinner | 无 | 自定义实现，使用 Lucide Loader2 |

### 1.2 样式系统

**优先使用 Tailwind CSS + shadcn/ui 的设计系统**：

```json
{
  "type": "button",
  "label": "保存",
  "variant": "default",  // default | primary | destructive | outline | secondary | ghost | link
  "size": "default"      // default | sm | lg | icon
}
```

**不推荐**：自定义样式系统

```json
{
  "type": "button",
  "level": "primary",    // ❌ 使用 variant 替代
  "size": "md"           // ❌ 使用 shadcn 的 size
}
```

### 1.3 主题集成

使用 CSS 变量（shadcn/ui 标准）：

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... */
}
```

Flux 主题通过 CSS 变量映射，无需额外主题系统。

## 2. 简化设计（去除与 Tailwind 重复）

### 2.1 废弃的布局属性

以下属性与 Tailwind CSS 重复，**应该废弃**：

| 废弃属性 | Tailwind 替代 | 说明 |
|---------|-------------|------|
| `gap` | `className="gap-4"` | 直接使用 Tailwind |
| `margin` | `className="m-4"` | 直接使用 Tailwind |
| `padding` | `className="p-4"` | 直接使用 Tailwind |
| `width` | `className="w-full"` | 直接使用 Tailwind |
| `height` | `className="h-full"` | 直接使用 Tailwind |
| `textAlign` | `className="text-center"` | 直接使用 Tailwind |
| `verticalAlign` | `className="items-center"` | 直接使用 Tailwind |

### 2.2 保留的语义属性

以下属性有语义价值，**应该保留**：

| 属性 | 说明 | 示例 |
|-----|------|------|
| `variant` | 组件变体 | `primary`, `destructive` |
| `size` | 组件尺寸 | `sm`, `default`, `lg` |
| `layout` | 布局方向 | `horizontal`, `vertical` |
| `columns` | 列数 | 表格列、Grid 列数 |
| `rows` | 行数 | Grid 行数 |

### 2.3 简化后的布局组件

#### Flex（弹性布局）

```json
{
  "type": "flex",
  "direction": "row",       // row | row-reverse | column | column-reverse
  "wrap": "nowrap",         // nowrap | wrap | wrap-reverse
  "justify": "start",       // start | end | center | between | around | evenly
  "items": "stretch",       // start | end | center | baseline | stretch
  "className": "gap-4 p-4", // Tailwind 样式
  "items": [
    { "type": "text", "value": "左侧" },
    { "type": "text", "value": "右侧" }
  ]
}
```

**废弃**：`gap`、`align`、`valign` 属性 → 使用 `className`

#### Grid（网格布局）

```json
{
  "type": "grid",
  "columns": 3,
  "rows": 2,
  "className": "gap-4",
  "cells": [
    { "type": "text", "value": "Cell 1" },
    { "type": "text", "value": "Cell 2" }
  ]
}
```

**废弃**：`gap`、`columnGap`、`rowGap` → 使用 `className`

## 3. 统一命名规范

### 3.1 标准属性名称

| 属性名 | 类型 | 说明 | 示例 |
|-------|------|------|------|
| `type` | string | 组件类型（必需） | `"button"`, `"input"` |
| `id` | string | 组件唯一标识 | `"submit-btn"` |
| `name` | string | 表单字段名 | `"username"` |
| `label` | string | 字段标签 | `"用户名"` |
| `title` | string | 标题 | `"编辑用户"` |
| `body` | Schema\|Schema[] | 内容体（子元素） | `{ "type": "text", ... }` |
| `className` | string | CSS 类名 | `"flex gap-4"` |
| `style` | object | 内联样式（不推荐） | `{ "color": "red" }` |
| `visible` | boolean\|string | 显示条件 | `true`, `"${isAdmin}"` |
| `hidden` | boolean\|string | 隐藏条件 | `false`, `"${isLocked}"` |
| `disabled` | boolean\|string | 禁用条件 | `false`, `"${!canEdit}"` |

### 3.2 废弃的不一致属性

| 废弃属性 | 标准属性 | 说明 |
|---------|---------|------|
| `disabledOn` | `disabled` | 不需要 On 后缀 |
| `hiddenOn` | `hidden` | 不需要 On 后缀 |
| `visibleOn` | `visible` | 不需要 On 后缀 |
| `show` | `visible` | 统一使用 visible |
| `hide` | `hidden` | 统一使用 hidden |
| `text` | `body` | 统一使用 body |
| `content` | `body` | 统一使用 body |
| `children` | `body` | 统一使用 body |
| `items` | `body` | 统一使用 body（除非语义明确） |
| `option` | `options` | 单选也使用数组 |
| `source` | `api` | 统一使用 api |

### 3.3 特定语义的 body 别名

以下属性是 `body` 的语义别名，**可以保留**：

| 属性 | 说明 | 使用场景 |
|-----|------|---------|
| `columns` | 表格列 | Table 组件 |
| `tabs` | 标签页配置 | Tabs 组件 |
| `steps` | 步骤配置 | Wizard 组件 |
| `nodes` | 流程节点 | Flow Designer |
| `edges` | 流程连线 | Flow Designer |
| `buttons` | 按钮组 | ButtonGroup、Dialog actions |

**注意**：这些是语义明确的场景，其他情况统一使用 `body`。

## 4. JSON 到 XML 的映射

### 4.1 基本映射规则

| JSON | XML | 说明 |
|------|-----|------|
| `type` | 标签名 | `<button>` |
| `body` | 标签内容 | `<button>内容</button>` |
| 其他属性 | 属性 | `<button variant="primary">` |

### 4.2 映射示例

**JSON**：
```json
{
  "type": "button",
  "variant": "primary",
  "size": "lg",
  "body": "保存"
}
```

**XML**：
```xml
<button variant="primary" size="lg">保存</button>
```

---

**JSON（嵌套）**：
```json
{
  "type": "form",
  "body": [
    {
      "type": "input",
      "name": "username",
      "label": "用户名"
    },
    {
      "type": "button",
      "variant": "primary",
      "body": "提交"
    }
  ]
}
```

**XML**：
```xml
<form>
  <input name="username" label="用户名" />
  <button variant="primary">提交</button>
</form>
```

### 4.3 特殊处理

| 情况 | JSON | XML | 说明 |
|-----|------|-----|------|
| 布尔值 | `"disabled": true` | `disabled="true"` | 保留属性 |
| 表达式 | `"visible": "${isAdmin}"` | `visible="${isAdmin}"` | 保留表达式 |
| 数组 | `"body": [...]` | 多个子标签 | 展开为多个标签 |
| null | `"value": null` | 不输出属性 | 省略属性 |
| undefined | 未定义 | 不输出属性 | 省略属性 |

### 4.4 XML Schema 定义

```xml
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="Component">
    <xs:sequence>
      <xs:any minOccurs="0" maxOccurs="unbounded" processContents="lax"/>
    </xs:sequence>
    <xs:attribute name="type" type="xs:string" use="required"/>
    <xs:attribute name="id" type="xs:string"/>
    <xs:attribute name="name" type="xs:string"/>
    <xs:attribute name="label" type="xs:string"/>
    <xs:attribute name="className" type="xs:string"/>
    <xs:attribute name="visible" type="xs:string"/>
    <xs:attribute name="hidden" type="xs:string"/>
    <xs:attribute name="disabled" type="xs:string"/>
    <!-- 其他标准属性 -->
  </xs:complexType>
</xs:schema>
```

## 5. API 语义标准化

### 5.1 标准 API 属性

| 属性 | 类型 | 说明 | 使用场景 |
|-----|------|------|---------|
| `api` | ApiObject\|string | 主要数据源 | 表单提交、数据加载 |
| `initApi` | ApiObject\|string | 初始化数据源 | 组件挂载时加载初始数据 |
| `schemaApi` | ApiObject\|string | 动态 Schema 源 | 动态加载组件配置 |
| `saveApi` | ApiObject\|string | 保存数据源 | 保存操作专用 |
| `deleteApi` | ApiObject\|string | 删除数据源 | 删除操作专用 |

### 5.2 ApiObject 标准结构

```typescript
interface ApiObject {
  // 必需
  url: string                    // API 地址
  
  // HTTP 方法
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  
  // 请求数据
  data?: object                  // 请求体数据
  params?: object                // URL 查询参数
  headers?: Record<string, string>
  
  // 数据适配
  requestAdaptor?: string        // 请求适配器（表达式）
  responseAdaptor?: string       // 响应适配器（表达式）
  dataPath?: string              // 响应数据路径（如 "data.items"）
  
  // 缓存
  cache?: number | boolean       // 缓存时间（毫秒）或布尔值
  
  // 条件
  condition?: string             // 执行条件（表达式）
  
  // 重试
  retry?: number                 // 重试次数
  retryInterval?: number         // 重试间隔（毫秒）
  
  // 超时
  timeout?: number               // 超时时间（毫秒）
  
  // 事件
  onSuccess?: ActionSchema       // 成功回调
  onError?: ActionSchema         // 失败回调
  onFinally?: ActionSchema       // 完成回调
}
```

### 5.3 简写形式

```json
// 字符串简写
{
  "api": "/api/users"
}

// 等价于
{
  "api": {
    "url": "/api/users",
    "method": "GET"
  }
}

// POST 简写
{
  "api": "POST /api/users"
}

// 带参数简写
{
  "api": "/api/users/${id}"
}
```

### 5.4 API 使用场景

#### Form 组件

```json
{
  "type": "form",
  "initApi": "/api/users/${id}",     // 加载初始数据
  "api": "POST /api/users",          // 提交数据
  "body": [
    { "type": "input", "name": "name", "label": "姓名" }
  ]
}
```

#### Table 组件

```json
{
  "type": "table",
  "api": {
    "url": "/api/users",
    "method": "GET",
    "dataPath": "data.items"
  },
  "columns": [
    { "name": "name", "label": "姓名" }
  ]
}
```

#### Select 组件（远程数据）

```json
{
  "type": "select",
  "name": "userId",
  "label": "用户",
  "api": {
    "url": "/api/users",
    "method": "GET",
    "dataPath": "data.items",
    "labelField": "name",
    "valueField": "id"
  }
}
```

### 5.5 废弃的 API 属性

| 废弃属性 | 标准属性 | 说明 |
|---------|---------|------|
| `source` | `api` | 统一使用 api |
| `fetchOn` | `api.condition` | 使用 condition 表达式 |
| `dataProvider` | `api` | 统一使用 api |

## 6. Validation 标准化

### 6.1 标准 Validation 规则

```typescript
type ValidationRule =
  // 必填
  | { type: 'required'; message?: string }
  
  // 字符串长度
  | { type: 'minLength'; value: number; message?: string }
  | { type: 'maxLength'; value: number; message?: string }
  | { type: 'length'; value: number; message?: string }
  
  // 数值范围
  | { type: 'min'; value: number; message?: string }
  | { type: 'max'; value: number; message?: string }
  | { type: 'range'; min: number; max: number; message?: string }
  
  // 数组长度
  | { type: 'minItems'; value: number; message?: string }
  | { type: 'maxItems'; value: number; message?: string }
  
  // 正则匹配
  | { type: 'pattern'; value: string | RegExp; message?: string }
  
  // 预设规则
  | { type: 'email'; message?: string }
  | { type: 'url'; message?: string }
  | { type: 'phone'; message?: string }
  | { type: 'idCard'; message?: string }
  
  // 字段比较
  | { type: 'equals'; field: string; message?: string }
  | { type: 'notEquals'; field: string; message?: string }
  
  // 条件必填
  | { type: 'requiredIf'; field: string; value: any; message?: string }
  | { type: 'requiredUnless'; field: string; value: any; message?: string }
  
  // 自定义
  | { type: 'custom'; validator: string; message?: string }
  
  // 异步验证
  | { type: 'async'; api: ApiObject; message?: string }
```

### 6.2 Validation 配置方式

#### 方式一：简写（推荐）

```json
{
  "type": "input",
  "name": "username",
  "label": "用户名",
  "required": true,
  "minLength": 3,
  "maxLength": 20
}
```

#### 方式二：完整配置

```json
{
  "type": "input",
  "name": "username",
  "label": "用户名",
  "validation": {
    "rules": [
      { "type": "required", "message": "用户名不能为空" },
      { "type": "minLength", "value": 3, "message": "至少 3 个字符" },
      { "type": "maxLength", "value": 20, "message": "最多 20 个字符" }
    ],
    "trigger": "blur",        // change | blur | submit
    "showErrorOn": "touched"  // touched | dirty | submit
  }
}
```

### 6.3 Validation 时机

| 属性 | 值 | 说明 |
|-----|---|------|
| `validateOn` | `change` | 值变化时验证 |
| `validateOn` | `blur` | 失焦时验证（默认） |
| `validateOn` | `submit` | 提交时验证 |
| `validateOn` | `["change", "blur"]` | 多个时机 |

| 属性 | 值 | 说明 |
|-----|---|------|
| `showErrorOn` | `touched` | 触摸后显示（默认） |
| `showErrorOn` | `dirty` | 值变化后显示 |
| `showErrorOn` | `submit` | 提交后显示 |

### 6.4 废弃的 Validation 属性

| 废弃属性 | 标准属性 | 说明 |
|---------|---------|------|
| `requiredOn` | `required` | 不需要 On 后缀 |
| `validations` | `validation.rules` | 统一结构 |
| `validateApi` | `validation.rules[type=async]` | 统一到 rules |

## 7. 其他标准化需求

### 7.1 事件命名

**统一使用 on 前缀**：

| 事件名 | 说明 | 参数 |
|-------|------|------|
| `onClick` | 点击事件 | `{ event, scope }` |
| `onChange` | 值变化事件 | `{ value, oldValue, scope }` |
| `onFocus` | 聚焦事件 | `{ event, scope }` |
| `onBlur` | 失焦事件 | `{ event, scope }` |
| `onSubmit` | 提交事件 | `{ values, scope }` |
| `onReset` | 重置事件 | `{ scope }` |
| `onInit` | 初始化事件 | `{ scope }` |
| `onMount` | 挂载事件 | `{ scope }` |
| `onUnmount` | 卸载事件 | `{ scope }` |
| `onSuccess` | 成功事件 | `{ result, scope }` |
| `onError` | 失败事件 | `{ error, scope }` |

### 7.2 Action 命名

**统一使用命名空间:方法 格式**：

```json
{
  "onClick": {
    "action": "dialog:open",
    "dialog": { "type": "form", "body": [...] }
  }
}
```

| Action | 说明 | 参数 |
|--------|------|------|
| `ajax` | 发送请求 | `api` |
| `dialog:open` | 打开对话框 | `dialog` |
| `dialog:close` | 关闭对话框 | `dialogId` |
| `drawer:open` | 打开抽屉 | `drawer` |
| `drawer:close` | 关闭抽屉 | `drawerId` |
| `form:submit` | 提交表单 | `formId` |
| `form:reset` | 重置表单 | `formId` |
| `form:validate` | 验证表单 | `formId` |
| `page:refresh` | 刷新页面 | - |
| `page:redirect` | 重定向 | `url` |
| `url:open` | 打开链接 | `url`, `target` |
| `url:redirect` | 重定向 | `url` |
| `value:set` | 设置值 | `name`, `value` |
| `value:get` | 获取值 | `name` |
| `component:<method>` | 调用组件方法 | `componentId`, `args` |
| `custom` | 自定义动作 | `handler` |

### 7.3 组件 ID 引用

**统一使用 componentId**：

| 废弃属性 | 标准属性 | 说明 |
|---------|---------|------|
| `target` | `componentId` | 目标组件 ID |
| `form` | `componentId` | 表单 ID |
| `dialog` | `componentId` | 对话框 ID |

### 7.4 数据路径

**统一使用点号分隔**：

```json
{
  "value": "${user.profile.name}",    // ✅ 推荐
  "value": "${user['profile']['name']}"  // ❌ 避免
}
```

### 7.5 国际化

**统一使用 i18n key**：

```json
{
  "label": "$t:user.username",  // ✅ 推荐
  "label": "用户名"             // ❌ 避免（不支持多语言）
}
```

### 7.6 图标

**统一使用 Lucide Icons**：

```json
{
  "icon": "save",          // ✅ 推荐（kebab-case）
  "icon": "Save",          // ❌ 避免（PascalCase）
  "icon": "fa fa-save"     // ❌ 避免（其他图标库）
}
```

### 7.7 颜色

**使用 Tailwind 颜色系统**：

```json
{
  "color": "primary",      // ✅ 推荐（语义化）
  "color": "red-500",      // ✅ 推荐（Tailwind 颜色）
  "color": "#ff0000"       // ❌ 避免（硬编码）
}
```

### 7.8 尺寸

**统一使用 sm/default/lg**：

```json
{
  "size": "sm",            // ✅ 推荐
  "size": "small",         // ❌ 避免
  "size": "mini"           // ❌ 避免
}
```

## 8. 完整示例

### 8.1 Form 示例

```json
{
  "type": "form",
  "id": "user-form",
  "initApi": "/api/users/${id}",
  "api": {
    "url": "/api/users/${id}",
    "method": "PUT",
    "onSuccess": {
      "action": "toast:show",
      "message": "保存成功"
    }
  },
  "body": [
    {
      "type": "input",
      "name": "username",
      "label": "用户名",
      "required": true,
      "minLength": 3,
      "maxLength": 20
    },
    {
      "type": "input",
      "name": "email",
      "label": "邮箱",
      "required": true,
      "validation": {
        "rules": [
          { "type": "email", "message": "邮箱格式不正确" }
        ]
      }
    },
    {
      "type": "select",
      "name": "role",
      "label": "角色",
      "api": {
        "url": "/api/roles",
        "dataPath": "data.items"
      }
    }
  ],
  "actions": [
    {
      "type": "button",
      "variant": "primary",
      "body": "保存",
      "onClick": {
        "action": "form:submit",
        "componentId": "user-form"
      }
    },
    {
      "type": "button",
      "variant": "outline",
      "body": "取消",
      "onClick": {
        "action": "dialog:close"
      }
    }
  ]
}
```

### 8.2 Table 示例

```json
{
  "type": "table",
  "id": "users-table",
  "api": {
    "url": "/api/users",
    "method": "GET",
    "dataPath": "data.items"
  },
  "columns": [
    { "name": "id", "label": "ID", "hidden": true },
    { "name": "username", "label": "用户名" },
    { "name": "email", "label": "邮箱" },
    { "name": "role", "label": "角色" },
    {
      "type": "operation",
      "label": "操作",
      "buttons": [
        {
          "type": "button",
          "variant": "ghost",
          "size": "sm",
          "body": "编辑",
          "onClick": {
            "action": "dialog:open",
            "dialog": {
              "type": "form",
              "title": "编辑用户",
              "initApi": "/api/users/${record.id}",
              "body": "..."
            }
          }
        },
        {
          "type": "button",
          "variant": "ghost",
          "size": "sm",
          "body": "删除",
          "onClick": {
            "action": "ajax",
            "api": {
              "url": "/api/users/${record.id}",
              "method": "DELETE"
            },
            "then": {
              "action": "component:refresh",
              "componentId": "users-table"
            }
          }
        }
      ]
    }
  ],
  "pagination": {
    "pageSize": 20,
    "showSizeChanger": true
  }
}
```

## 9. 迁移指南

### 9.1 从 AMIS 迁移

| AMIS | Flux | 说明 |
|------|------|------|
| `disabledOn` | `disabled` | 去掉 On 后缀 |
| `hiddenOn` | `hidden` | 去掉 On 后缀 |
| `visibleOn` | `visible` | 去掉 On 后缀 |
| `source` | `api` | 统一使用 api |
| `level` (Button) | `variant` | 使用 variant |
| `items` | `body` | 统一使用 body |
| `children` | `body` | 统一使用 body |

### 9.2 自动迁移脚本

```typescript
function migrateAmisToFlux(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema
  
  const migrated = { ...schema }
  
  // 去掉 On 后缀
  if (migrated.disabledOn) {
    migrated.disabled = migrated.disabledOn
    delete migrated.disabledOn
  }
  if (migrated.hiddenOn) {
    migrated.hidden = migrated.hiddenOn
    delete migrated.hiddenOn
  }
  if (migrated.visibleOn) {
    migrated.visible = migrated.visibleOn
    delete migrated.visibleOn
  }
  
  // source -> api
  if (migrated.source) {
    migrated.api = migrated.source
    delete migrated.source
  }
  
  // level -> variant (Button)
  if (migrated.type === 'button' && migrated.level) {
    migrated.variant = migrated.level
    delete migrated.level
  }
  
  // children -> body
  if (migrated.children && !migrated.body) {
    migrated.body = migrated.children
    delete migrated.children
  }
  
  // 递归处理
  for (const key of Object.keys(migrated)) {
    if (Array.isArray(migrated[key])) {
      migrated[key] = migrated[key].map(migrateAmisToFlux)
    } else if (typeof migrated[key] === 'object') {
      migrated[key] = migrateAmisToFlux(migrated[key])
    }
  }
  
  return migrated
}
```

## 10. 参考资料

- [shadcn/ui 组件库](https://ui.shadcn.com/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [AMIS 官方文档](https://aisuda.bce.baidu.com/amis/)
- [Flux 架构文档](./architecture/flux-core.md)
- [Flux 组件列表](./component-list.md)
