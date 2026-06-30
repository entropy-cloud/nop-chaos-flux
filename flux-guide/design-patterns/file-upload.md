# 文件上传

## 基础文件上传

```json
{
  "type": "input-file",
  "name": "attachment",
  "label": "附件",
  "accept": ".pdf,.doc,.docx",
  "maxSize": 10485760,
  "maxCount": 3
}
```

## 图片上传

```json
{
  "type": "input-image",
  "name": "avatar",
  "label": "头像",
  "accept": "image/*",
  "maxSize": 2097152
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
  "maxCount": 10
}
```

## 带表单提交

```json
{
  "type": "form",
  "id": "uploadForm",
  "submitAction": { "action": "ajax", "args": { "url": "/api/upload", "method": "post" } },
  "body": [
    { "type": "input-text", "name": "title", "label": "标题", "required": true },
    { "type": "input-file", "name": "file", "label": "文件", "required": true },
    {
      "type": "button",
      "label": "上传",
      "level": "primary",
      "onClick": {
        "action": "component:submit",
        "args": { "_target": "uploadForm" }
      }
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
  "maxCount": 9,
  "maxSize": 5242880
}
```

**关键点**：`input-file` 和 `input-image` 是表单字段，文件上传后值存储为文件引用，由 `submitAction` 统一提交。
