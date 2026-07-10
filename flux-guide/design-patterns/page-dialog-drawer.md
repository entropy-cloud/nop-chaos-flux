# Page / Dialog / Drawer

> `page` 是页面根容器，`dialog` 和 `drawer` 是浮层容器。三者都支持 `body` region 和 `data` 数据域。
>
> 所有字段定义见 `flux-types/schema.d.ts`。

---

## 1. Page 页面根容器

```jsonc
{
  "type": "page",
  "title": "用户管理",
  "subTitle": "管理系统中的所有用户",
  "body": [{ "type": "text", "text": "欢迎使用用户管理系统" }],
  "header": [{ "type": "button", "label": "设置" }],
  "footer": [{ "type": "text", "text": "© 2024 Company" }],
}
```

**Page 区域**：

| 区域     | 说明                              |
| -------- | --------------------------------- |
| `body`   | 主内容区                          |
| `header` | 顶部栏                            |
| `footer` | 底部栏                            |
| `aside`  | 侧边栏（需 `asidePosition` 配合） |

**Page 属性**：

| 属性            | 类型     | 说明                         |
| --------------- | -------- | ---------------------------- |
| `title`         | `string` | 页面标题                     |
| `subTitle`      | `string` | 副标题                       |
| `data`          | `object` | 静态初始数据                 |
| `statusPath`    | `string` | 状态数据路径                 |
| `asidePosition` | `string` | 侧边栏位置：`left` / `right` |

---

## 2. Page 带数据请求

```jsonc
{
  "type": "page",
  "title": "仪表盘",
  "body": [
    {
      "type": "data-source",
      "name": "stats",
      "action": "ajax",
      "args": { "url": "/api/dashboard" },
    },
    { "type": "text", "text": "用户数: ${stats.userCount}" },
  ],
}
```

---

## 3. Dialog 弹窗

```jsonc
{
  "type": "button",
  "label": "打开弹窗",
  "onClick": {
    "action": "openDialog",
    "args": {
      "title": "编辑用户",
      "size": "lg",
      "data": { "id": "${id}", "name": "${name}" },
      "body": {
        "type": "form",
        "id": "editForm",
        "submitAction": {
          "action": "ajax",
          "args": { "url": "/api/users/${id}", "method": "put" },
        },
        "onSubmitSuccess": { "action": "closeSurface" },
        "body": [{ "type": "input-text", "name": "name", "label": "姓名" }],
      },
    },
  },
}
```

**Dialog 属性**：

| 属性    | 类型          | 说明                                         |
| ------- | ------------- | -------------------------------------------- |
| `title` | `string`      | 弹窗标题                                     |
| `size`  | `string`      | 弹窗大小：`sm` / `md` / `lg` / `xl` / `full` |
| `data`  | `object`      | 传入弹窗的初始数据                           |
| `body`  | `SchemaInput` | 弹窗内容                                     |

---

## 4. Drawer 抽屉

```jsonc
{
  "type": "button",
  "label": "查看详情",
  "onClick": {
    "action": "openDrawer",
    "args": {
      "title": "用户详情",
      "placement": "right",
      "size": "md",
      "data": { "id": "${id}" },
      "body": {
        "type": "form",
        "id": "detailForm",
        "body": [{ "type": "input-text", "name": "name", "label": "姓名", "readOnly": true }],
      },
    },
  },
}
```

**Drawer 额外属性**：

| 属性        | 类型     | 说明                                          |
| ----------- | -------- | --------------------------------------------- |
| `placement` | `string` | 弹出位置：`left` / `right` / `top` / `bottom` |

---

## 5. 关闭 Surface

弹窗/抽屉打开后，通过 `closeSurface` 关闭：

```jsonc
{
  "type": "form",
  "id": "myForm",
  "submitAction": { "action": "ajax", "args": { "url": "/api/save" } },
  "onSubmitSuccess": {
    "action": "closeSurface",
    "then": { "action": "refreshSource", "targetId": "listData" },
  },
}
```

---

## page vs dialog vs drawer 选型

| 特性     | page          | dialog             | drawer           |
| -------- | ------------- | ------------------ | ---------------- |
| 位置     | 全屏          | 居中浮层           | 侧边浮层         |
| 遮罩     | 无            | 有                 | 有               |
| 关闭方式 | 导航          | `closeSurface`     | `closeSurface`   |
| 适用场景 | 主页面        | 表单编辑、确认操作 | 详情查看、长表单 |
| 数据传递 | `data` 初始化 | `args.data` 传入   | `args.data` 传入 |
