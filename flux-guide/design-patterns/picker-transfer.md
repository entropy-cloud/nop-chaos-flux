# Picker & Transfer 选择类控件

## Picker（弹出选择器）

```json
{
  "type": "picker",
  "name": "userId",
  "label": "选择用户",
  "options": "${users}",
  "labelField": "name",
  "valueField": "id",
  "multiple": false,
  "clearable": true
}
```

### Picker 多选

```json
{
  "type": "picker",
  "name": "roleIds",
  "label": "分配角色",
  "options": "${roles}",
  "labelField": "roleName",
  "valueField": "roleId",
  "multiple": true
}
```

## Transfer（穿梭框）

```json
{
  "type": "transfer",
  "name": "assignedRoles",
  "label": "角色分配",
  "options": "${allRoles}",
  "labelField": "name",
  "valueField": "id"
}
```

### Transfer 带搜索

```json
{
  "type": "transfer",
  "name": "selectedUsers",
  "label": "用户",
  "options": "${allUsers}",
  "labelField": "displayName",
  "valueField": "userId",
  "searchable": true,
  "showCheckAll": true
}
```

### Transfer 数据源绑定

```json
{
  "type": "transfer",
  "name": "permissions",
  "label": "权限",
  "options": "${availablePermissions}",
  "labelField": "label",
  "valueField": "key"
}
```

## 字段参考

### Picker

| 字段         | 类型                 | 说明         |
| ------------ | -------------------- | ------------ |
| `options`    | `SelectOptionsValue` | 选项数据     |
| `labelField` | `string`             | 显示标签字段 |
| `valueField` | `string`             | 提交值字段   |
| `multiple`   | `boolean`            | 多选         |
| `clearable`  | `boolean`            | 可清除       |
| `searchable` | `boolean`            | 可搜索       |

### Transfer

| 字段           | 类型                 | 说明         |
| -------------- | -------------------- | ------------ |
| `options`      | `SelectOptionsValue` | 选项数据     |
| `labelField`   | `string`             | 显示标签字段 |
| `valueField`   | `string`             | 提交值字段   |
| `searchable`   | `boolean`            | 可搜索       |
| `showCheckAll` | `boolean`            | 显示全选按钮 |
