# nop-datav 集成评估 — dashboard panel 指定 ECharts 渲染器

> Status: concluded（2026-09-13，E5.2）
> 证据：`packages/flux-renderers-dashboard/src/dashboard-echarts-panel.test.tsx`、`dashboard-echarts-panel-failure.test.tsx`
> 来源：roadmap E5.2（analysis Open Question「渲染器选择策略」的机制评估移交项）

## 结论

**零包装层可用。** dashboard panel 经通用机制（`panel.type` → `registry.has` → fragment 装配 → `helpers.render`）即可挂载 `echarts` 渲染器——`echarts` 自 E1.1 起在 `dataRendererDefinitions` 注册，宿主调用 `registerDataRenderers(registry)` 后 dashboard 的 `type: 'echarts'` 面板直接生效，无需任何 dashboard/echarts 包装代码。机制证明测试（真实 dashboard renderer + 真实 echarts 渲染器定义，仅 mock echarts-setup 模块边界）已断言 setOption 收到面板 option、props 表达式求值生效。

## 前置条件

1. 宿主安装 `echarts`（optional peer，`peerDependenciesMeta.echarts.optional: true`）。
2. 宿主注册 `registerDataRenderers(registry)`（E1.1 起包含 `type: 'echarts'`）。
3. 懒加载自动：echarts 全量代码位于懒 chunk，仅在首个 echarts 面板挂载时加载。

## 面板适配点（authoring 指引）

```json
{
  "type": "dashboard",
  "panels": [
    {
      "id": "revenue-chart",
      "type": "echarts",
      "x": 0,
      "y": 0,
      "w": 6,
      "h": 4,
      "props": {
        "height": 260,
        "dataset": { "source": "${salesRows}", "dimensions": ["month", "revenue"] },
        "option": {
          "tooltip": {},
          "xAxis": { "type": "category" },
          "yAxis": { "type": "value" },
          "series": [{ "type": "bar", "encode": { "x": "month", "y": "revenue" } }]
        },
        "events": {
          "onClick": {
            "action": "showToast",
            "args": { "level": "info", "message": "clicked: ${event.name}" }
          }
        }
      }
    }
  ]
}
```

- 面板数据经 `props.option/dataset` 表达式传数（表达式可达 dashboard scope）。
- 事件/dataset/主题（`flux` 注册主题，CSS 变量继承 dashboard 宿主主题）/ResizeObserver（面板 resize 自动触发 `chart.resize()`）全部复用渲染器既有行为。

## 边界（已实证）

1. **`panel.source` 绑定路径与 echarts 渲染器不兼容**：`buildPanelFragment` 在 `panel.source` 存在时向 fragment 顶层注入 `data`/`source` 键，而 echarts 定义 fields 未声明二者（closed prop model + strict 校验 → `unknown-property` error，数据被跳过）。对照：`tree`/`sparkline` 显式声明 `data` field，panel.source 对它们可用。**authoring 指引：echarts 面板一律经 `props.option/dataset` 表达式传数，不使用 `panel.source`。**（证据：`dashboard-echarts-panel.test.tsx` 边界断言）
2. **宿主未安装 echarts**：echarts 面板降级为 `data-slot="echarts-error"` 占位（面板级，console.warn 一次），兄弟面板不受影响（证据：`dashboard-echarts-panel-failure.test.tsx` 双面板用例）。
3. 包体：echarts 懒 chunk（约 400 KB gzip，见 design.md「按需引入与包体」）仅在使用 echarts 面板的 dashboard 页面加载；纯 chart/table 面板零成本。

## 后续（非阻塞）

- dashboard-editor 编辑态 palette/inspector 对 echarts 面板的适配 → 编辑态 UI 演进独立驱动（E5.2 Non-Goals）。
