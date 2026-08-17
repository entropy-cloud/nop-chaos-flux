# 日期时间字段族

> Flux 提供七种日期时间相关字段，共享 `BoundFieldSchemaBase` 基础属性。
>
> 所有字段定义见 `flux-types/schema.d.ts`，源码在 `packages/flux-renderers-form/src/renderers/{input-date,input-datetime,input-time,period,date-range}-renderer*`。

---

## 字段选型

| 字段             | 选择内容    | 交互形态                                                                             | 值格式                         |
| ---------------- | ----------- | ------------------------------------------------------------------------------------ | ------------------------------ |
| `input-date`     | 日期        | **popover 月历网格**（trigger 按钮 + 点选 + 清除）                                   | `YYYY-MM-DD`                   |
| `input-datetime` | 日期 + 时间 | popover 月历网格 + 时间数字输入（时/分/秒）                                          | `YYYY-MM-DD HH:mm:ss`          |
| `input-time`     | 时间        | 原生 `<input type="time">`；`steppers: true` 时切换为 Sundial 风格 ±小时/±分钟步进器 | `HH:mm:ss`                     |
| `input-month`    | 年月        | 下拉选择                                                                             | `YYYY-MM`                      |
| `input-quarter`  | 季度        | 下拉选择                                                                             | `YYYY-Q1` ~ `YYYY-Q4`          |
| `input-year`     | 年份        | 下拉选择                                                                             | `YYYY`                         |
| `date-range`     | 日期范围    | 两个 popover 日期（或起止输入）                                                      | `["YYYY-MM-DD", "YYYY-MM-DD"]` |

---

## 1. InputDate 日期（popover 月历选择器）

`input-date` 渲染为一个按钮触发器，点击弹出**月历网格**（单日选择、点选即回写），不是普通文本输入框。

```jsonc
{
  "type": "input-date",
  "name": "birthday",
  "label": "生日",
  "valueFormat": "YYYY-MM-DD",
  "displayFormat": "YYYY-MM-DD",
  "placeholder": "选择日期",
  "clearable": true,
  "minDate": "2020-01-01",
  "maxDate": "today",
}
```

| 属性                  | 说明                                      |
| --------------------- | ----------------------------------------- |
| `valueFormat`         | 值的存储格式（moment 风格 token）         |
| `displayFormat`       | 展示格式（默认等于 valueFormat）          |
| `clearable`           | 已选值后显示清除按钮                      |
| `minDate` / `maxDate` | 可选范围（支持相对值 `today` / `-7d` 等） |
| `utc`                 | 按 UTC 而非本地时区解析                   |

## 2. InputDatetime 日期时间

```jsonc
{
  "type": "input-datetime",
  "name": "meetingTime",
  "label": "会议时间",
  "valueFormat": "YYYY-MM-DD HH:mm",
  "timeFormat": "HH:mm",
  "clearable": true,
}
```

`valueFormat` 必须含时间部分；时间在 popover 内以时/分/秒数字框编辑（`timeFormat` 控制是否含秒）。

## 3. InputTime 时间

默认渲染为原生 `<input type="time">`（浏览器自带时间选择/步进），支持范围钳制与清除。

```jsonc
{
  "type": "input-time",
  "name": "workHours",
  "label": "工作时间",
  "valueFormat": "HH:mm",
  "minTime": "09:00",
  "maxTime": "18:00",
  "clearable": true,
}
```

### 步进器模式（Sundial 风格）

设置 `"steppers": true` 后切换为**小时/分钟两组循环步进按钮**（左：±hourStep 小时，右：±minuteStep 分钟，越过 23:59 自动回绕到 00:00），适合"时间选择器"类 UI：

```jsonc
{
  "type": "input-time",
  "name": "workHours",
  "label": "工作时间",
  "steppers": true,
  "hourStep": 1,
  "minuteStep": 5,
}
```

| 属性         | 默认  | 说明                                    |
| ------------ | ----- | --------------------------------------- |
| `steppers`   | false | 切换为小时/分钟步进器交互               |
| `hourStep`   | 1     | 小时步进量（0-23 循环）                 |
| `minuteStep` | 5     | 分钟步进量（分钟进位到小时，0-59 循环） |

步进器模式下不渲染原生 input，值仍按 `valueFormat` 写入表单/作用域。

## 4. InputMonth / InputQuarter / InputYear

```jsonc
{ "type": "input-month", "name": "reportMonth", "label": "报表月份", "valueFormat": "YYYY-MM" }
{ "type": "input-quarter", "name": "fiscalQuarter", "label": "财务季度", "valueFormat": "YYYY-Q1" }
{ "type": "input-year", "name": "birthYear", "label": "出生年份", "valueFormat": "YYYY" }
```

## 5. DateRange 日期范围

```jsonc
{
  "type": "date-range",
  "name": "dateRange",
  "label": "日期范围",
  "valueFormat": "YYYY-MM-DD",
  "placeholder": ["开始日期", "结束日期"],
  "presets": [{ "label": "近 7 天", "value": { "relative": "last7days" } }],
}
```

**值类型**：`[string, string]`（起止日期数组）

---

## 共享属性

| 属性                | 类型                | 说明                                           |
| ------------------- | ------------------- | ---------------------------------------------- |
| `valueFormat`       | `string`            | 值存储格式（moment 风格 token，不是 `format`） |
| `displayFormat`     | `string`            | 展示格式（默认 = valueFormat）                 |
| `placeholder`       | `string`            | 占位文本                                       |
| `clearable`         | `boolean`           | 是否可清空                                     |
| `disabled`          | `boolean \| string` | 禁用或条件禁用                                 |
| `minDate`/`minTime` | `string`            | 最小可选日期/时间（相对值如 `today` 可用）     |
| `maxDate`/`maxTime` | `string`            | 最大可选日期/时间                              |
| `utc`               | `boolean`           | 是否按 UTC 解析（date/datetime）               |

> 注意：历史文档曾出现 `format`、`min`、`max`、`showTime` 等属性名，**真实 schema 不接受**，请以上表为准。

---

## 展示示例

playground 复杂页面 `sundial-detail`（`apps/playground/src/complex-pages/page-schemas/sundial-detail.json`）演示了：

- `input-date` popover 月历（`sundial-input-date-demo` 区块）
- `input-time` 步进器模式（日期选择对话框的时间行，±1h/±5m，复刻 Sundial）
