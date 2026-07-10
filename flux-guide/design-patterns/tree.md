# Tree & TreeSelect 树形组件

## Tree（数据展示）

```json
{
  "type": "tree",
  "data": "${categories}",
  "labelField": "name",
  "keyField": "id",
  "childrenKey": "children",
  "searchable": true,
  "initiallyExpanded": 2
}
```

## Tree 自定义节点

```json
{
  "type": "tree",
  "data": "${orgTree}",
  "labelField": "label",
  "keyField": "value",
  "showIcon": true,
  "iconField": "icon",
  "showGuideLine": true,
  "node": [{ "type": "text", "text": "${node.label} (${node.count})" }]
}
```

## TreeSelect（表单字段）

```json
{
  "type": "tree-select",
  "name": "department",
  "label": "部门",
  "options": "${departments}",
  "treeMode": "checkbox",
  "cascade": true,
  "searchable": true,
  "clearable": true,
  "placeholder": "请选择部门"
}
```

## TreeSelect 单选

```json
{
  "type": "tree-select",
  "name": "category",
  "label": "分类",
  "options": "${categories}",
  "treeMode": "radio",
  "onlyLeaf": true,
  "showPathLabel": true
}
```

## TreeSelect 懒加载子节点

```json
{
  "type": "tree-select",
  "name": "region",
  "label": "地区",
  "options": "${topRegions}",
  "childrenSource": {
    "action": "ajax",
    "args": { "url": "/api/region-children?parentId=${value}" }
  }
}
```

## 字段参考

### Tree

| 字段                | 类型                | 说明                            |
| ------------------- | ------------------- | ------------------------------- |
| `data`              | `SchemaValue`       | 树数据                          |
| `labelField`        | `string`            | 显示标签字段（默认 'label'）    |
| `keyField`          | `string`            | 唯一键字段（默认 'value'）      |
| `childrenKey`       | `string`            | 子节点字段名（默认 'children'） |
| `node`              | `SchemaInput`       | 自定义节点渲染区域              |
| `initiallyExpanded` | `boolean \| number` | 默认展开深度                    |
| `searchable`        | `boolean`           | 可搜索                          |
| `showIcon`          | `boolean`           | 显示图标                        |
| `showGuideLine`     | `boolean`           | 显示连接线                      |
| `multiple`          | `boolean`           | 多选                            |
| `empty`             | `SchemaInput`       | 空状态                          |

### TreeSelect

| 字段             | 类型                                | 说明         |
| ---------------- | ----------------------------------- | ------------ |
| `options`        | `SelectOptionsValue`                | 选项数据     |
| `treeMode`       | `'normal' \| 'radio' \| 'checkbox'` | 选择模式     |
| `cascade`        | `boolean`                           | 级联选择     |
| `onlyLeaf`       | `boolean`                           | 仅叶节点可选 |
| `searchable`     | `boolean`                           | 可搜索       |
| `showPathLabel`  | `boolean`                           | 显示路径标签 |
| `clearable`      | `boolean`                           | 可清除       |
| `childrenSource` | `TreeSourceConfig`                  | 懒加载子节点 |
| `searchSource`   | `TreeSourceConfig`                  | 远程搜索     |
