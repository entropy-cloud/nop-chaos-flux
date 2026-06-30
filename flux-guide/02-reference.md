# 核心机制参考

> 组件字段定义看 `flux-types/*.d.ts`。这里只记录跨组件的核心机制：表达式、API、事件、数据流。

---

## 1. 模板与表达式

### 模板语法 (在 `SchemaTpl` 字段中使用)

```
${variable}                          → 变量替换
${variable | filter:args}           → 带过滤器
```

### 条件表达式 (在 `SchemaExpression` 字段中使用)

```
${variable === 'value'}              → 等于
${variable > 10}                     → 比较
${a && b}                            → 与
${a || b}                            → 或
${!a}                                → 非
${a ? 'yes' : 'no'}                  → 三元
${arr | includes:'x'}                → 包含
${phone | match:/^1[3-9]/}           → 正则
```

### 常用过滤器

所有内置函数名**大写**。可通过 `${}` 管道语法 `value | FUNC:args` 调用。

| 过滤器        | 作用     | 示例                                    |
| ------------- | -------- | --------------------------------------- |
| `TRIM`        | 去空格   | `${s \| TRIM}`                          |
| `UPPER`       | 大写     | `${s \| UPPER}`                         |
| `LOWER`       | 小写     | `${s \| LOWER}`                         |
| `LEN`         | 长度     | `${s \| LEN}`                           |
| `INT`         | 取整     | `${n \| INT}`                           |
| `CONCATENATE` | 拼接     | `${a \| CONCATENATE:b}`                 |
| `REPLACE`     | 替换     | `${s \| REPLACE:old:new}`               |
| `SPLIT`       | 分割     | `${s \| SPLIT:delimiter}`               |
| `JOIN`        | 数组连接 | `${arr \| JOIN:,}`                      |
| `CONTAINS`    | 包含子串 | `${s \| CONTAINS:sub}`                  |
| `ISEMPTY`     | 是否为空 | `${x \| ISEMPTY}`                       |
| `SUM`         | 求和     | `${arr \| SUM}`                         |
| `AVG`         | 平均值   | `${arr \| AVG}`                         |
| `COUNT`       | 计数     | `${arr \| COUNT}`                       |
| `UNIQ`        | 去重     | `${arr \| UNIQ}`                        |
| `COMPACT`     | 过滤假值 | `${arr \| COMPACT}`                     |
| `IF`          | 条件     | `${IF(cond, val1, val2)}`               |
| `SWITCH`      | 多分支   | `${SWITCH(expr, case1, val1, default)}` |
| `t`           | 国际化   | `${t('key')}`                           |

此外还有 `$Math`、`$JSON`、`$Date` 命名空间可用：

```
${$Math.PI}
${$Date.format(value, 'YYYY-MM-DD')}
${$JSON.stringify(obj)}
```

### 适用字段

- `SchemaTpl` → `text`, `title`, `label`, `tpl`, `html`, `placeholder`, `tooltip`, `description`
- `SchemaExpression` → `when`, `visible`, `hidden`, `disabled`, `readOnly`

---

## 2. API 配置

### 简洁版

```json
{"api": "/api/users"}
{"api": "post:/api/save"}        // 指定方法
{"api": "delete:/api/users/1"}   // DELETE 请求
```

### 完整版 (看 `ApiSchema`)

```json
{
  "api": {
    "url": "/api/save",
    "method": "post",
    "data": { "name": "${name}" },
    "headers": { "Authorization": "Bearer ${token}" },
    "includeScope": ["userId", "token"],
    "params": { "page": "${page}" },
    "responseAdaptor": "return { ...payload, data: payload.data.list }",
    "requestAdaptor": "api.data.timestamp = Date.now(); return api;"
  }
}
```

### API 响应格式

```json
{"status": 0, "msg": "成功", "data": { ... }}
```

- `status: 0` → 成功；非 0 → 失败
- CRUD 的 data 必须是 `{"items": [...], "total": N}`

---

## 3. 事件与动作 (Action Algebra)

### 3a. 简单动作

按钮/组件上的 `onClick` / `onChange` / `onSubmit` 字段：

```json
{
  "type": "button",
  "label": "删除",
  "onClick": {
    "action": "ajax",
    "args": { "url": "/api/delete/1", "method": "delete" },
    "then": { "action": "showToast", "args": { "level": "success", "message": "已删除" } },
    "onError": { "action": "showToast", "args": { "level": "error", "message": "删除失败" } }
  }
}
```

### 3b. Action Algebra 系统 (推荐)

任意组件的事件字段携带 `ActionSchema`，支持链式、并行、条件分支：

```json
{
  "onClick": {
    "action": "ajax",
    "args": { "url": "/api/save", "method": "post" },
    "then": {
      "action": "showToast",
      "args": { "level": "success", "message": "完成" },
      "then": { "action": "closeSurface" }
    },
    "onError": {
      "action": "showToast",
      "args": { "level": "error", "message": "${error.message}" }
    }
  }
}
```

### ActionShapeFields 完整字段

| 字段              | 类型                             | 说明                                   |
| ----------------- | -------------------------------- | -------------------------------------- |
| `action`          | `string`                         | 动作类型                               |
| `args`            | `Record<string, SchemaValue>`    | 动作参数                               |
| `when`            | `boolean \| string`              | 条件守卫                               |
| `then`            | `ActionSchema \| ActionSchema[]` | 成功后执行                             |
| `onError`         | `ActionSchema \| ActionSchema[]` | 失败后执行                             |
| `onSettled`       | `ActionSchema \| ActionSchema[]` | 完成后执行（无论成功失败）             |
| `parallel`        | `ActionSchema[]`                 | 并行执行                               |
| `timeout`         | `number`                         | 超时时间（ms）                         |
| `retry`           | `{ times, delay, strategy }`     | 重试配置                               |
| `debounce`        | `number`                         | 防抖时间（ms）                         |
| `control`         | `OperationControlConfig`         | 控制配置（含 retry/debounce/dedup 等） |
| `preventDefault`  | `boolean \| string`              | 阻止默认事件                           |
| `stopPropagation` | `boolean \| string`              | 阻止事件冒泡                           |
| `continueOnError` | `boolean`                        | 失败后继续执行                         |
| `targetId`        | `string`                         | 目标组件 ID                            |
| `componentId`     | `string`                         | 目标组件 ID（兼容）                    |
| `componentName`   | `string`                         | 目标组件名称                           |
| `dialogId`        | `string`                         | 目标弹窗 ID                            |
| `surfaceId`       | `string`                         | 目标 surface ID                        |

### 可用动作

| 动作类型                      | 说明             |
| ----------------------------- | ---------------- |
| `ajax`                        | 发起 HTTP 请求   |
| `submitForm`                  | 提交表单         |
| `openDialog` / `openDrawer`   | 打开弹窗/抽屉    |
| `closeDialog` / `closeDrawer` | 关闭弹窗/抽屉    |
| `closeSurface`                | 关闭任意 surface |
| `refreshTable`                | 刷新表格         |
| `refreshSource`               | 刷新数据源       |
| `setValue` / `setValues`      | 设置值           |
| `showToast`                   | Toast 通知       |
| `confirm`                     | 确认对话框       |
| `alert`                       | 警告对话框       |
| `navigate`                    | 页面跳转         |
| `component:method`            | 调用组件实例方法 |
| `namespace:method`            | 调用命名空间方法 |

### 事件数据流

```
ajax 输出 → 通过 result / prevResult 链式传递
dialog 输出 → ${result} (形态: {confirmed, value})
```

---

## 4. 数据流

### 数据域 (ScopeRef)

```
Page {data: {x:1}}              ← initApi 或 data 字段
  └── Form {name: "${x}"}       ← 继承 Page 的数据
      └── InputText              ← 继承 Form 的数据
```

子组件自动继承父组件词法作用域。同名变量子遮蔽父。

### 数据来源

| 方式           | 适用组件                    | 说明             |
| -------------- | --------------------------- | ---------------- |
| `data`         | page, form, dialog, drawer  | 静态初始数据     |
| `initApi`      | page, form, dialog, service | 初始化请求       |
| `submitAction` | form                        | 提交 API         |
| `source`       | 选项类控件, table, cards    | 数据源           |
| `data-source`  | data-source                 | 命名数据源节点   |
| `service`      | service                     | 可视数据组合容器 |

### 组件间通信

```json
// Form 提交后刷新 CRUD
{"type":"form","id":"form1","body":[...],
 "onSubmitSuccess":{"action":"refreshTable","args":{"target":"table1"}}}
{"type":"crud","name":"table1","api":"/api/list"}

// 按钮刷新指定组件
{"type":"button","label":"刷新","onClick":{"action":"refreshTable","args":{"target":"table1"}}}

// 调用组件实例方法
{"type":"button","label":"提交","onClick":{"action":"component:submit","args":{"_target":"form1"}}}
```

### Data Source (命名数据源)

```json
// 命名 data-source 节点
{"type":"data-source","name":"countries",
 "action":{"action":"ajax","args":{"url":"/api/countries"}},
 "mergeToScope":true}

// 轮询 + 条件停止
{"type":"data-source","name":"status",
 "action":{"action":"ajax","args":{"url":"/api/status"}},
 "interval":3000,"stopWhen":"${status.complete}"}

// 公式派生
{"type":"data-source","name":"summary",
 "formula":"{ total: users.length, active: users.filter(u => u.active).length }"}

// 条件发送
{"type":"data-source","name":"details",
 "action":{"action":"ajax","args":{"url":"/api/details?id=${id}"}},
 "sendOn":"${id}"}
```

### Data Source 合并策略

| 策略      | 说明              |
| --------- | ----------------- |
| `replace` | 替换（默认）      |
| `append`  | 追加              |
| `prepend` | 前置              |
| `merge`   | 合并              |
| `upsert`  | 按 key 更新或插入 |

```json
{
  "type": "data-source",
  "name": "list",
  "action": { "action": "ajax", "args": { "url": "/api/more" } },
  "mergeStrategy": "append",
  "mergeKey": "id"
}
```

---

## 5. 表单校验系统

### 校验触发方式

| 字段          | 说明                                                     |
| ------------- | -------------------------------------------------------- |
| `validateOn`  | 校验触发时机：`change` / `blur` / `submit`               |
| `showErrorOn` | 错误显示时机：`touched` / `dirty` / `visited` / `submit` |

### 校验规则

```json
{
  "type": "input-text",
  "name": "email",
  "label": "邮箱",
  "required": true,
  "validations": {
    "isEmail": true,
    "maxLength": 100
  }
}
```

### 常用校验规则

| 规则                      | 说明     |
| ------------------------- | -------- |
| `required`                | 必填     |
| `isEmail`                 | 邮箱格式 |
| `isUrl`                   | URL 格式 |
| `isNumeric`               | 数字     |
| `minLength` / `maxLength` | 长度范围 |
| `minimum` / `maximum`     | 数值范围 |
| `pattern`                 | 正则匹配 |

### 表单提交回调

```json
{
  "type": "form",
  "id": "myForm",
  "submitAction": { "action": "ajax", "args": { "url": "/api/submit" } },
  "onSubmitSuccess": { "action": "showToast", "args": { "level": "success", "message": "成功" } },
  "onSubmitError": {
    "action": "showToast",
    "args": { "level": "error", "message": "${error.message}" }
  },
  "onValidateError": {
    "action": "showToast",
    "args": { "level": "warning", "message": "请修正表单错误" }
  }
}
```

---

## 6. 结构节点

### Fragment (分组)

```json
{
  "type": "fragment",
  "when": "${showAdvanced}",
  "body": [{ "type": "input-text", "name": "adminCode", "label": "管理员代码" }]
}
```

> `when=false` 的子树整体不激活、不参与生命周期。

### Loop (循环)

```json
{
  "type": "loop",
  "items": "${users}",
  "itemName": "user",
  "indexName": "idx",
  "body": [{ "type": "text", "text": "${idx + 1}. ${user.name}" }],
  "empty": [{ "type": "empty", "description": "暂无数据" }]
}
```

### Recurse (递归)

```json
{
  "type": "recurse",
  "items": "${treeData}",
  "body": [
    { "type": "text", "text": "${item.name}" },
    { "type": "recurse", "items": "${item.children}" }
  ]
}
```

### Reaction (响应式监听)

```json
{
  "type": "reaction",
  "watch": "${form.total}",
  "when": "${form.total > 1000}",
  "actions": { "action": "showToast", "args": { "level": "warning", "message": "金额超过 1000" } }
}
```

---

## 7. Tabs 状态管理

### 非受控 (默认)

```json
{
  "type": "tabs",
  "tabs": [
    { "title": "Tab 1", "body": [{ "type": "text", "text": "内容 1" }] },
    { "title": "Tab 2", "body": [{ "type": "text", "text": "内容 2" }] }
  ]
}
```

### 受控 (scope 持久化)

```json
{
  "type": "tabs",
  "activeKey": "${currentTab}",
  "activeKeyOwnership": "scope",
  "activeKeyStatePath": "currentTab",
  "tabs": [
    { "title": "列表", "body": [{ "type": "table" }] },
    { "title": "图表", "body": [{ "type": "chart" }] }
  ]
}
```

### Ownership 选项

| 值           | 说明                 |
| ------------ | -------------------- |
| `local`      | 组件内部管理（默认） |
| `controlled` | 外部受控             |
| `scope`      | 持久化到 scope 路径  |

---

## 8. 组件实例方法

通过 `component:method` 动作调用组件实例方法：

| 方法                 | 说明                        |
| -------------------- | --------------------------- |
| `component:submit`   | 提交表单                    |
| `component:reset`    | 重置表单                    |
| `component:setValue` | 设置值                      |
| `component:getValue` | 获取值                      |
| `component:refresh`  | 刷新组件                    |
| `component:loadMore` | 加载更多（infinite-scroll） |

```json
{
  "type": "button",
  "label": "提交",
  "onClick": { "action": "component:submit", "args": { "_target": "myForm" } }
}
```

---

## 9. 与 AMIS 的主要差异

| 特性     | AMIS                     | Flux                                             |
| -------- | ------------------------ | ------------------------------------------------ |
| 动作系统 | `actionType` + `onEvent` | Action Algebra (`onClick` + `action`)            |
| 数据源   | 组件级 `api`/`source`    | 下沉到 `data-source` 节点 + action               |
| 表单提交 | `api` 直接配置           | `submitAction` + `onSubmitSuccess/onSubmitError` |
| 弹窗     | `actionType:'dialog'`    | `openDialog` action                              |
| 类型系统 | `type` 字段              | `type` 字段 + 编译期校验                         |
| 样式     | className + CSS          | Tailwind + `cn()` + `data-slot`                  |
| 移动端   | 无专门支持               | `flux-renderers-mobile` 包                       |
| 表达式   | `${expr}`                | `${expr}` (编译期预编译)                         |
| 状态管理 | MobX store               | Zustand + ScopeRef                               |
| 校验     | 组件级 validations       | 表单级 validation model                          |
| 结构节点 | 无                       | fragment / loop / recurse / reaction             |
