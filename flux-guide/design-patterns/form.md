# 表单提交与校验

> 表单初始化用 `initAction`（非 `initApi`）；提交用 `submitAction` + `onSubmitSuccess`/`onSubmitError`/`onValidateError`。跨字段校验用 `rules`。

## 基础表单

```json
{
  "type": "form",
  "id": "userForm",
  "submitAction": { "action": "ajax", "args": { "url": "/api/users", "method": "post" } },
  "onSubmitSuccess": {
    "action": "showToast",
    "args": { "level": "success", "message": "保存成功" }
  },
  "onSubmitError": {
    "action": "showToast",
    "args": { "level": "error", "message": "${error.message}" }
  },
  "body": [
    { "type": "input-text", "name": "name", "label": "姓名", "required": true },
    { "type": "input-email", "name": "email", "label": "邮箱", "required": true },
    { "type": "input-number", "name": "age", "label": "年龄", "min": 0, "max": 150 },
    {
      "type": "select",
      "name": "role",
      "label": "角色",
      "options": [
        { "label": "管理员", "value": "admin" },
        { "label": "普通用户", "value": "user" }
      ]
    },
    {
      "type": "button",
      "label": "提交",
      "variant": "default",
      "onClick": { "action": "component:submit", "componentId": "userForm" }
    }
  ]
}
```

## 嵌套表单 (Fieldset)

```json
{
  "type": "form",
  "id": "orderForm",
  "body": [
    {
      "type": "fieldset",
      "title": "基本信息",
      "body": [
        { "type": "input-text", "name": "orderNo", "label": "订单号", "required": true },
        { "type": "input-date", "name": "orderDate", "label": "订单日期" }
      ]
    },
    {
      "type": "fieldset",
      "title": "收货信息",
      "body": [
        { "type": "input-text", "name": "receiver", "label": "收货人", "required": true },
        { "type": "textarea", "name": "address", "label": "地址" }
      ]
    },
    {
      "type": "button",
      "label": "提交订单",
      "variant": "default",
      "onClick": { "action": "component:submit", "componentId": "orderForm" }
    }
  ]
}
```

## 弹窗表单（提交后刷新 CRUD）

> 提交成功后刷新上游数据源用 `refreshSource` + 顶层 `targetId`；或刷新 CRUD 用 `component:refresh` + `componentId`。

```json
{
  "type": "button",
  "label": "编辑",
  "onClick": {
    "action": "openDialog",
    "args": {
      "title": "编辑用户",
      "data": { "id": "${id}", "name": "${name}" },
      "body": {
        "type": "form",
        "id": "editForm",
        "submitAction": {
          "action": "ajax",
          "args": { "url": "/api/users/${id}", "method": "put" }
        },
        "onSubmitSuccess": {
          "action": "closeSurface",
          "then": { "action": "refreshSource", "targetId": "pagedUsers" }
        },
        "body": [
          { "type": "input-text", "name": "name", "label": "姓名", "required": true },
          { "type": "input-email", "name": "email", "label": "邮箱" }
        ]
      }
    }
  }
}
```

**关键点**：按钮是 `component:submit` 的薄触发器（目标用顶层 `componentId`），验证→提交→分支全部由表单节点拥有。

---

## 子作用域分区 (valuesPath)

表单的 `valuesPath` 把本表单的数据**发布到 scope 的一个命名子路径**下，而不是平铺到父 scope。常用于：

- 把一组筛选字段收拢成一个对象（供 `data-source` 的 `dependsOn` 监听）；
- wizard 里每步表单各占一个子路径，最后 `onComplete` 汇总；
- 主从联动里把"当前选中"写成一个过滤对象。

```jsonc
{
  "type": "form",
  "id": "treeFilterForm",
  "valuesPath": "treeFilter", // 表单值 → scope.treeFilter
  "bodyClassName": "p-0",
  "body": [
    {
      "type": "input-tree",
      "name": "deptId",
      "treeMode": "radio",
      "options": "${deptTree?.items}",
    },
  ],
}
```

兄弟节点即可监听该路径：

```jsonc
{
  "type": "data-source",
  "name": "usersDS",
  "dependsOn": ["treeFilter"], // treeFilter 变化即重跑
  "sendOn": "treeFilter?.deptId", // 有值才发请求
  "action": "ajax",
  "args": {
    "url": "/api/users",
    "method": "get",
    "data": { "deptId": "${treeFilter?.deptId ?? \"\"}" },
  },
}
```

**关键点**：

- `valuesPath` 写的是 scope 相对路径（如 `treeFilter`、`wizardData.step1`、`mdFilter`）；表单内字段值会落到该路径下，父 scope 通过 `${treeFilter.deptId}` 读取。
- 多个表单用不同 `valuesPath` 即可把数据分区隔离，互不覆盖。
- 与 `valueStatePath`（状态所有权三档中的 `scope` 档，见 `08-tabs-state.md`）不同：`valuesPath` 管的是**表单数据落点**，`valueStatePath` 管的是**控件受控状态落点**。

> 完整真实范例：树过滤 `apps/playground/src/complex-pages/page-schemas/tree-crud.json`、wizard 分步 `form-wizard.json`、主从联动 `master-detail.json`。组合示例见 `examples/master-detail.md` 与 `examples/wizard-values-path.md`。
