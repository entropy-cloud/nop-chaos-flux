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

| 字段        | 类型                                              | 说明         |
| ----------- | ------------------------------------------------- | ------------ |
| `chartType` | `'bar' \| 'line' \| 'pie' \| 'scatter' \| 'area'` | 图表类型     |
| `source`    | `SchemaValue`                                     | 数据绑定     |
| `series`    | `SchemaValue`                                     | 系列配置     |
| `title`     | `SchemaInput`                                     | 标题         |
| `xAxis`     | `{ dataKey?, label? }`                            | X 轴         |
| `yAxis`     | `{ label? }`                                      | Y 轴         |
| `height`    | `number \| string`                                | 高度         |
| `legend`    | `boolean`                                         | 是否显示图例 |
| `stacked`   | `boolean`                                         | 是否堆积     |
| `grid`      | `boolean`                                         | 是否显示网格 |
| `colors`    | `string[]`                                        | 自定义颜色   |
| `loading`   | `boolean`                                         | 加载状态     |
| `empty`     | `SchemaInput`                                     | 空状态       |
| `onClick`   | `ActionSchema`                                    | 点击事件     |
| `onHover`   | `ActionSchema`                                    | 悬停事件     |
