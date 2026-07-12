# Page / Dialog / Drawer

> `page` 是页面根容器，`dialog` 和 `drawer` 是浮层容器。三者都支持 `body` region 和 `data` 数据域。
>
> 所有字段定义见 `packages/flux-renderers-basic/src/schemas.ts`。

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

| 属性               | 类型               | 说明                            |
| ------------------ | ------------------ | ------------------------------- |
| `title`            | `string`           | 页面标题                        |
| `subTitle`         | `string`           | 副标题                          |
| `remark`           | `string`           | 标题旁 Tooltip 提示             |
| `data`             | `object`           | 静态初始数据                    |
| `statusPath`       | `string`           | 状态数据路径                    |
| `asidePosition`    | `string`           | 侧边栏位置：`left` / `right`    |
| `asideResizable`   | `boolean`          | 侧边栏可拖拽调整宽度            |
| `asideMinWidth`    | `number \| string` | 侧边栏最小宽度（默认 200px）    |
| `asideMaxWidth`    | `number \| string` | 侧边栏最大宽度（默认 600px）    |
| `asideSticky`      | `boolean`          | 侧边栏粘性定位（不随内容滚动）  |
| `asideClassName`   | `string`           | 侧边栏额外 CSS 类               |
| `bodyClassName`    | `string`           | body 区域额外 CSS 类            |
| `headerClassName`  | `string`           | header 区域额外 CSS 类          |
| `footerClassName`  | `string`           | footer 区域额外 CSS 类          |
| `toolbarClassName` | `string`           | header slot 内容区域额外 CSS 类 |

> **命名注意**：`headerClassName` 样式化标题栏（title + subTitle + remark），`header` slot 内容渲染在 `data-slot="page-toolbar"` 区域，由 `toolbarClassName` 样式化。

---

## 2. Page 带侧栏（aside）

```jsonc
{
  "type": "page",
  "title": "用户管理",
  "asidePosition": "left",
  "asideResizable": true,
  "asideSticky": true,
  "aside": [
    { "type": "tree", "source": "/r/departments", "onSelect": { "action": "loadData", "args": { "deptId": "${event.value.id}" } } }
  ],
  "header": [
    { "type": "button", "label": "新建用户", "onClick": { "action": "dialog", "args": { "schema": { "type": "form", "body": [...] } } } }
  ],
  "body": [
    { "type": "table", "source": "/r/users?deptId=${scope.deptId}", "columns": [...] }
  ]
}
```

**Aside 行为**：

| 场景     | 行为                                      |
| -------- | ----------------------------------------- |
| 桌面端   | 内联渲染 aside，可拖拽调整宽度            |
| 移动端   | aside 折叠为 Sheet 滑出，点击菜单按钮触发 |
| 空 aside | 自动折叠，不渲染占位列                    |

---

## 3. Page 带数据请求

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

## 4. Dialog 弹窗

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

| 属性    | 类型          | 说明                                                |
| ------- | ------------- | --------------------------------------------------- |
| `title` | `string`      | 弹窗标题                                            |
| `size`  | `string`      | 弹窗大小：`xs` / `sm` / `md` / `lg` / `xl` / `full` |
| `data`  | `object`      | 传入弹窗的初始数据                                  |
| `body`  | `SchemaInput` | 弹窗内容                                            |

---

## 5. Drawer 抽屉

```jsonc
{
  "type": "button",
  "label": "查看详情",
  "onClick": {
    "action": "openDrawer",
    "args": {
      "title": "用户详情",
      "side": "right",
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

| 属性        | 类型      | 说明                                          |
| ----------- | --------- | --------------------------------------------- |
| `side`      | `string`  | 弹出位置：`left` / `right` / `top` / `bottom` |
| `resizable` | `boolean` | 可拖拽调整宽度                                |

---

## 6. 关闭 Surface

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

## 7. page vs dialog vs drawer 选型

| 特性     | page          | dialog             | drawer           |
| -------- | ------------- | ------------------ | ---------------- |
| 位置     | 全屏          | 居中浮层           | 侧边浮层         |
| 遮罩     | 无            | 有                 | 有               |
| 关闭方式 | 导航          | `closeSurface`     | `closeSurface`   |
| 适用场景 | 主页面        | 表单编辑、确认操作 | 详情查看、长表单 |
| 数据传递 | `data` 初始化 | `args.data` 传入   | `args.data` 传入 |
