# 日期时间字段族

> Flux 提供六种日期时间相关字段，共享 `BoundFieldSchemaBase` 基础属性。
>
> 所有字段定义见 `flux-types/schema.d.ts`。

---

## 字段选型

| 字段             | 选择内容    | 值格式                         |
| ---------------- | ----------- | ------------------------------ |
| `input-date`     | 日期        | `YYYY-MM-DD`                   |
| `input-datetime` | 日期 + 时间 | `YYYY-MM-DD HH:mm:ss`          |
| `input-time`     | 时间        | `HH:mm:ss`                     |
| `input-month`    | 年月        | `YYYY-MM`                      |
| `input-quarter`  | 季度        | `YYYY-Q1` ~ `YYYY-Q4`          |
| `input-year`     | 年份        | `YYYY`                         |
| `date-range`     | 日期范围    | `["YYYY-MM-DD", "YYYY-MM-DD"]` |

---

## 1. InputDate 日期

```jsonc
{
  "type": "input-date",
  "name": "birthday",
  "label": "生日",
  "format": "YYYY-MM-DD",
  "placeholder": "选择日期",
}
```

---

## 2. InputDatetime 日期时间

```jsonc
{
  "type": "input-datetime",
  "name": "meetingTime",
  "label": "会议时间",
  "format": "YYYY-MM-DD HH:mm",
  "showTime": true,
}
```

---

## 3. InputTime 时间

```jsonc
{
  "type": "input-time",
  "name": "workHours",
  "label": "工作时间",
  "format": "HH:mm",
  "placeholder": "选择时间",
}
```

---

## 4. InputMonth 月份

```jsonc
{
  "type": "input-month",
  "name": "reportMonth",
  "label": "报表月份",
  "format": "YYYY-MM",
}
```

---

## 5. InputQuarter 季度

```jsonc
{
  "type": "input-quarter",
  "name": "fiscalQuarter",
  "label": "财务季度",
  "format": "YYYY-[Q]Q",
}
```

---

## 6. InputYear 年份

```jsonc
{
  "type": "input-year",
  "name": "birthYear",
  "label": "出生年份",
  "format": "YYYY",
}
```

---

## 7. DateRange 日期范围

```jsonc
{
  "type": "date-range",
  "name": "dateRange",
  "label": "日期范围",
  "format": "YYYY-MM-DD",
  "placeholder": ["开始日期", "结束日期"],
}
```

**值类型**：`[string, string]`（起止日期数组）

---

## 共享属性

| 属性          | 类型                | 说明                     |
| ------------- | ------------------- | ------------------------ |
| `format`      | `string`            | 值格式（moment.js 格式） |
| `placeholder` | `string`            | 占位文本                 |
| `clearable`   | `boolean`           | 是否可清空               |
| `disabled`    | `boolean \| string` | 禁用或条件禁用           |
| `min`         | `string`            | 最小可选日期             |
| `max`         | `string`            | 最大可选日期             |
