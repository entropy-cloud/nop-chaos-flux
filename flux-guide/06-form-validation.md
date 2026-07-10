# 表单校验系统

> 组件字段定义看 `flux-types/*.d.ts`。这里只记录校验系统。

---

## 校验触发方式

| 字段          | 说明                                                     |
| ------------- | -------------------------------------------------------- |
| `validateOn`  | 校验触发时机：`change` / `blur` / `submit`               |
| `showErrorOn` | 错误显示时机：`touched` / `dirty` / `visited` / `submit` |

## 校验规则

Flux 校验分两层：**字段级**用字段自身的属性声明；**跨字段**用表单 `rules`。**没有** amis 式的 `validations` map。

字段级（写在字段上）：

```json
{
  "type": "input-email",
  "name": "email",
  "label": "邮箱",
  "required": true,
  "minLength": 5,
  "maxLength": 100,
  "pattern": "^[^@]+@[^@]+\\.[^@]+$"
}
```

跨字段（写在 form 的 `rules` 上）：

```json
{
  "type": "form",
  "rules": [
    { "rule": "equalsField", "field": "password", "target": "passwordConfirm", "message": "两次密码不一致" }
  ],
  "body": [ ... ]
}
```

异步校验（字段级 `validate`）：

```json
{
  "type": "input-text",
  "name": "username",
  "validate": {
    "action": "ajax",
    "args": { "url": "/api/check-username" },
    "debounce": 500,
    "message": "用户名已存在"
  }
}
```

## 可用校验 kind

字段属性：`required`、`pattern`、`minLength`/`maxLength`（文本）、`minItems`/`maxItems`（数组）。`input-email`/`input-url` 等类型自带格式校验。

表单 `rules` 的 `rule` 取值：`equalsField`、`notEqualsField`（仅这两种；`requiredWhen`/`uniqueBy`/`minItems` 等属于内部 `ValidationRule.kind`，由字段级/数组级声明引入，不经表单 `rules`）。

## 表单提交回调

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
