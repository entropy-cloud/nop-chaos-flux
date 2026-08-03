# Chart 图表

## 基本柱状图

```json
{
  "type": "chart",
  "chartType": "bar",
  "source": "${monthlySales}",
  "xAxis": { "dataKey": "month" },
  "yAxis": { "label": "金额" },
  "height": 300,
  "title": "月度销售额"
}
```

## 折线图

```json
{
  "type": "chart",
  "chartType": "line",
  "source": "${trendData}",
  "xAxis": { "dataKey": "date" },
  "height": 250,
  "legend": true
}
```

## 饼图

```json
{
  "type": "chart",
  "chartType": "pie",
  "source": "${categoryData}",
  "height": 300
}
```

## 堆积面积图

```json
{
  "type": "chart",
  "chartType": "area",
  "source": "${regionSales}",
  "xAxis": { "dataKey": "quarter" },
  "height": 300,
  "stacked": true,
  "legend": true
}
```

## SPC 控制图（参考线 + 控制限带 + 异常点标记）

`referenceLines` 绘制 UCL/LCL/CL 水平参考线，`band` 在两条界限间绘制阴影带，`markers` 把数据中标记的点（如失控子组）以醒目圆点突出：

```json
{
  "type": "chart",
  "chartType": "line",
  "source": "${spcSamples}",
  "xAxis": { "dataKey": "subgroupNo" },
  "series": [{ "name": "均值", "dataRegionKey": "mean" }],
  "referenceLines": [
    { "value": 13.5, "label": "UCL", "dashed": true, "color": "#ef4444" },
    { "value": 10.2, "label": "CL", "color": "#16a34a" },
    { "value": 6.9, "label": "LCL", "dashed": true, "color": "#ef4444" }
  ],
  "band": { "upper": 13.5, "lower": 6.9 },
  "markers": { "dataKey": "isOutOfControl", "color": "#ef4444" }
}
```

- `referenceLines`: `{ value, label?, color?, dashed? }[]`，水平参考线，仅笛卡尔类型（line/bar/area）生效
- `band`: `{ upper, lower, color?, opacity? }`，上下界阴影带，缺任一边界则忽略
- `markers`: `{ dataKey?, indices?, color? }`，异常点标记。`dataKey` 按源数据行的布尔标志挑点（SPC 的 `isOutOfControl`/`violatedRules` 字段），`indices` 按点下标挑点；无 `markers` 时保持无点折线
- 参考线信息会同步进无障碍文本摘要（sr-only）

## 带点击事件

```json
{
  "type": "chart",
  "chartType": "bar",
  "source": "${chartData}",
  "height": 300,
  "onClick": {
    "action": "showToast",
    "args": { "level": "info", "message": "${event.dataKey}: ${event.value}" }
  }
}
```

## 字段参考

| 字段             | 类型                                              | 说明                              |
| ---------------- | ------------------------------------------------- | --------------------------------- |
| `chartType`      | `'bar' \| 'line' \| 'pie' \| 'scatter' \| 'area'` | 图表类型                          |
| `source`         | `SchemaValue`                                     | 数据绑定                          |
| `series`         | `SchemaValue`                                     | 系列配置                          |
| `title`          | `SchemaInput`                                     | 标题                              |
| `xAxis`          | `{ dataKey?, label? }`                            | X 轴                              |
| `yAxis`          | `{ label? }`                                      | Y 轴                              |
| `height`         | `number \| string`                                | 高度                              |
| `legend`         | `boolean`                                         | 是否显示图例                      |
| `stacked`        | `boolean`                                         | 是否堆积                          |
| `grid`           | `boolean`                                         | 是否显示网格                      |
| `colors`         | `string[]`                                        | 自定义颜色                        |
| `referenceLines` | `SchemaValue`                                     | 水平参考线（UCL/LCL/CL）          |
| `band`           | `SchemaValue`                                     | 上下界阴影带                      |
| `markers`        | `SchemaValue`                                     | 异常点标记（`dataKey`/`indices`） |
| `loading`        | `boolean`                                         | 加载状态                          |
| `empty`          | `SchemaInput`                                     | 空状态                            |
| `onClick`        | `ActionSchema`                                    | 点击事件                          |
| `onHover`        | `ActionSchema`                                    | 悬停事件                          |
