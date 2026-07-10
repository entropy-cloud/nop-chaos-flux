# 表单基础字段

> 所有表单字段继承 `BoundFieldSchemaBase`：`name`, `label`, `required`, `readOnly`, `disabled`, `mode`, `labelAlign`, `labelWidth`, `hint`, `description`, `remark`, `labelRemark`。
>
> 所有字段定义见 `flux-types/schema.d.ts`。

---

## 1. Textarea 多行文本

```jsonc
{
  "type": "form",
  "body": [
    {
      "type": "textarea",
      "name": "bio",
      "label": "简介",
      "placeholder": "请输入个人简介",
      "rows": 4,
      "maxLength": 500,
      "showCount": true,
    },
  ],
}
```

---

## 2. Checkbox 单个复选框

```jsonc
{
  "type": "form",
  "body": [
    {
      "type": "checkbox",
      "name": "agree",
      "label": "同意协议",
      "required": true,
    },
  ],
}
```

**值类型**：`boolean`

---

## 3. Switch 开关

```jsonc
{
  "type": "form",
  "body": [
    {
      "type": "switch",
      "name": "enabled",
      "label": "启用状态",
    },
  ],
}
```

**值类型**：`boolean`

---

## 4. RadioGroup 单选组

```jsonc
{
  "type": "form",
  "body": [
    {
      "type": "radio-group",
      "name": "gender",
      "label": "性别",
      "options": [
        { "label": "男", "value": "male" },
        { "label": "女", "value": "female" },
      ],
    },
  ],
}
```

**值类型**：`string | number`

---

## 5. CheckboxGroup 复选组

```jsonc
{
  "type": "form",
  "body": [
    {
      "type": "checkbox-group",
      "name": "skills",
      "label": "技能",
      "options": [
        { "label": "JavaScript", "value": "js" },
        { "label": "TypeScript", "value": "ts" },
        { "label": "React", "value": "react" },
      ],
    },
  ],
}
```

**值类型**：`Array<string | number>`

---

## 6. InputNumber 数字输入

```jsonc
{
  "type": "form",
  "body": [
    {
      "type": "input-number",
      "name": "age",
      "label": "年龄",
      "min": 0,
      "max": 150,
      "step": 1,
    },
    {
      "type": "input-number",
      "name": "price",
      "label": "价格",
      "min": 0,
      "precision": 2,
      "prefix": "¥",
    },
  ],
}
```

**值类型**：`number`

---

## 7. InputDate 日期选择

```jsonc
{
  "type": "form",
  "body": [
    {
      "type": "input-date",
      "name": "birthday",
      "label": "生日",
      "format": "YYYY-MM-DD",
      "placeholder": "选择日期",
    },
  ],
}
```

**值类型**：`string`（格式化后的日期字符串）

---

## 8. Fieldset 表单分组

```jsonc
{
  "type": "form",
  "body": [
    {
      "type": "fieldset",
      "title": "基本信息",
      "body": [
        { "type": "input-text", "name": "name", "label": "姓名", "required": true },
        { "type": "input-email", "name": "email", "label": "邮箱" },
      ],
    },
    {
      "type": "fieldset",
      "title": "安全设置",
      "body": [
        { "type": "input-password", "name": "password", "label": "密码", "required": true },
        { "type": "input-password", "name": "confirmPassword", "label": "确认密码" },
      ],
    },
  ],
}
```

---

## 字段通用属性速查

| 属性          | 类型      | 说明                                                     |
| ------------- | --------- | -------------------------------------------------------- |
| `name`        | `string`  | 字段名（绑定到表单数据）                                 |
| `label`       | `string`  | 标签文本                                                 |
| `required`    | `boolean` | 是否必填                                                 |
| `readOnly`    | `boolean` | 只读                                                     |
| `disabled`    | `boolean` | 禁用                                                     |
| `placeholder` | `string`  | 占位文本                                                 |
| `hint`        | `string`  | 提示文本                                                 |
| `description` | `string`  | 描述文本                                                 |
| `validateOn`  | `string`  | 校验时机：`change` / `blur` / `submit`                   |
| `showErrorOn` | `string`  | 错误显示时机：`touched` / `dirty` / `visited` / `submit` |
