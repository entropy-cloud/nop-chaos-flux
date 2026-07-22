# Diff View 差异对比

单文件或多文件差异对比视图，支持 split / unified 两种视图模式。

## 单文件对比

```json
{
  "type": "diff-view",
  "oldContent": "function add(a, b) {\n  return a + b;\n}",
  "newContent": "function add(a, b) {\n  return a + b + 1;\n}",
  "language": "typescript",
  "viewType": "split",
  "showLineNumbers": true
}
```

## 多文件对比

```json
{
  "type": "diff-view",
  "viewType": "unified",
  "files": [
    {
      "fileName": "src/utils.ts",
      "oldContent": "const x = 1;",
      "newContent": "const x = 2;",
      "status": "modified",
      "language": "typescript"
    },
    {
      "fileName": "src/new.ts",
      "oldContent": "",
      "newContent": "export const y = 3;",
      "status": "added",
      "language": "typescript"
    }
  ],
  "activeFileIndex": 0
}
```

## 展开收起控制

```json
{
  "type": "diff-view",
  "oldContent": "${oldCode}",
  "newContent": "${newCode}",
  "defaultCollapsedLines": 5,
  "viewType": "unified",
  "showInlineDiff": true
}
```

## 字段参考

| 字段                    | 类型                   | 说明                                |
| ----------------------- | ---------------------- | ----------------------------------- |
| `oldContent`            | `string`               | 旧内容（单文件模式）                |
| `newContent`            | `string`               | 新内容（单文件模式）                |
| `middleContent`         | `string`               | 三栏合并基准内容                    |
| `files`                 | `DiffFileMeta[]`       | 多文件对比（互斥于 old/newContent） |
| `activeFileIndex`       | `number`               | 当前激活文件索引（默认 0）          |
| `language`              | `string`               | 语法高亮语言                        |
| `viewType`              | `'split' \| 'unified'` | 视图模式（默认 split）              |
| `showLineNumbers`       | `boolean`              | 显示行号（默认 true）               |
| `showInlineDiff`        | `boolean`              | 行内差异高亮（默认 true）           |
| `defaultCollapsedLines` | `number`               | 折叠阈值行数（默认 10）             |
| `wrapLines`             | `boolean`              | 自动换行                            |

### DiffFileMeta

| 字段         | 类型                                 | 说明         |
| ------------ | ------------------------------------ | ------------ |
| `fileName`   | `string`                             | 文件名       |
| `oldContent` | `string`                             | 旧内容       |
| `newContent` | `string`                             | 新内容       |
| `language`   | `string`                             | 语法高亮语言 |
| `status`     | `'added' \| 'modified' \| 'deleted'` | 文件状态     |

### Events

| 事件           | 说明                                           |
| -------------- | ---------------------------------------------- |
| `onLineClick`  | 行点击，payload: `{ lineNumber, side, type }`  |
| `onHunkExpand` | 展开折叠块，payload: `{ hunkIndex, expanded }` |

### 组件句柄方法

| 方法                | 说明         |
| ------------------- | ------------ |
| `toggleViewType()`  | 切换视图模式 |
| `setViewType(type)` | 设置视图模式 |
| `expandAll()`       | 展开全部     |
| `collapseAll()`     | 折叠全部     |
