# 文件上传

> `input-file`/`input-image` 没有 `maxSize` 字段；数量上限用 `maxFiles`。实际文件上传靠字段上的 `uploadAction`（host 上传动作），表单 `submitAction` 只提交上传后的字段值（文件引用）。

## 基础文件上传

```json
{
  "type": "input-file",
  "name": "attachment",
  "label": "附件",
  "accept": ".pdf,.doc,.docx",
  "maxFiles": 3,
  "uploadAction": { "action": "ajax", "args": { "url": "/api/upload", "method": "post" } }
}
```

## 图片上传

```json
{
  "type": "input-image",
  "name": "avatar",
  "label": "头像",
  "accept": "image/*",
  "uploadAction": { "action": "ajax", "args": { "url": "/api/upload", "method": "post" } },
  "previewMode": "thumbnail"
}
```

## 多文件上传

```json
{
  "type": "input-file",
  "name": "files",
  "label": "多文件",
  "multiple": true,
  "accept": ".pdf,.doc,.docx,.xls,.xlsx",
  "maxFiles": 10,
  "uploadAction": { "action": "ajax", "args": { "url": "/api/upload", "method": "post" } }
}
```

## 带表单提交

```json
{
  "type": "form",
  "id": "uploadForm",
  "submitAction": { "action": "ajax", "args": { "url": "/api/save", "method": "post" } },
  "body": [
    { "type": "input-text", "name": "title", "label": "标题", "required": true },
    {
      "type": "input-file",
      "name": "file",
      "label": "文件",
      "required": true,
      "uploadAction": { "action": "ajax", "args": { "url": "/api/upload", "method": "post" } }
    },
    {
      "type": "button",
      "label": "提交",
      "variant": "default",
      "onClick": { "action": "component:submit", "componentId": "uploadForm" }
    }
  ]
}
```

## 多图片上传

```json
{
  "type": "input-image",
  "name": "images",
  "label": "图片集",
  "multiple": true,
  "accept": "image/*",
  "maxFiles": 9,
  "uploadAction": { "action": "ajax", "args": { "url": "/api/upload", "method": "post" } }
}
```

**关键点**：`uploadAction` 是字段级的实际上传入口（请求下沉到 action）。`valueMode`（`url`/`object`/`array`）决定字段值形态；`multiple` 为真或 `valueMode:'array'` 时值为数组。
