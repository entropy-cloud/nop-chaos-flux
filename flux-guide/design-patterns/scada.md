# Scada Canvas 组态画布

工业 HMI/SCADA 组态画布组件：设备图元 + 管道/仪表 + 点表绑定 + 事件联动 + 画布浏览交互（leafer 引擎，`@nop-chaos/flux-renderers-industrial`）。

## 基础用法

```json
{
  "type": "scada-canvas",
  "id": "scada-canvas-1",
  "width": 900,
  "height": 480,
  "viewport": { "fit": "contain" },
  "config": {
    "version": 1,
    "variables": [{ "id": "tankLevel", "source": "static", "value": 55 }],
    "symbols": [
      { "id": "pump-1", "type": "scada-device-pump", "x": 210, "y": 210 },
      {
        "id": "level-1",
        "type": "scada-instrument-level",
        "x": 60,
        "y": 110,
        "width": 60,
        "height": 140,
        "bindings": { "height": { "point": "tankLevel", "scale": { "k": 1.4 } } }
      },
      { "id": "pipe-1", "type": "scada-pipe", "x": 120, "y": 245, "width": 90, "height": 0 }
    ]
  },
  "loading": { "type": "text", "text": "场景加载中…" },
  "empty": { "type": "text", "text": "场景构建失败（config 非法）" }
}
```

> `config` 是**组态 JSON 单一字段**（可内嵌对象或 JSON 文本、可挂表达式/数据源）；`version` 恒为 1；`symbols[].type` 必须是已注册图元类型（内置 24 种：8 基础形状 + image/video 占位 + group + 设备/仪表/传感控制 4 族 12 个 + pipe-junction）。

## 点表三源

| 声明形态                     | 数据来源                                                               | 示例                                                                         |
| ---------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `source: 'static'` + `value` | 组态内自包含；`component:setPointValue` 句柄写入                       | `{ "id": "motorState", "source": "static", "value": 1 }`                     |
| `source: 'flux'` + `flux`    | 页面 scope 数据经桥接轨注入（`useScopeSelector` + 公式求值，合帧刷新） | `{ "id": "tankLevel", "source": "flux", "flux": "$tankLevel" }`              |
| `source: 'expression'`       | 表达式求值                                                             | `{ "id": "level2", "source": "expression", "expression": "$tankLevel * 2" }` |

```json
{
  "type": "scada-canvas",
  "config": {
    "version": 1,
    "variables": [
      { "id": "tankLevel", "source": "flux", "flux": "$tankLevel" },
      { "id": "motorState", "source": "static", "value": 1 }
    ],
    "symbols": [
      {
        "id": "motor-1",
        "type": "scada-device-motor",
        "x": 40,
        "y": 40,
        "bindings": { "fill": { "point": "motorState" } },
        "states": { "states": {}, "valueMap": { "1": "run", "0": "stop", "2": "fault" } }
      }
    ]
  }
}
```

> 绑定属性集（`BINDABLE_PROPERTIES`）：`fill`/`height`/`width`/`rotation`/`text`/`opacity` 等；绑定支持 `point`/`expression`/`map`/`scale`（量程换算 `k`/`b`）/`format`；状态声明 `valueMap` 把点值映射到状态（run=绿/stop=灰/fault=红惯例色，`when: {state:'run'}` 动画）。

## 事件联动

图元事件声明（组态内，声明优先）+ schema 级 `events`（兜底钩子）：

```json
{
  "type": "scada-canvas",
  "id": "scada-demo-canvas",
  "config": {
    "version": 1,
    "symbols": [
      {
        "id": "motor-1",
        "type": "scada-device-motor",
        "x": 40,
        "y": 40,
        "events": [
          {
            "on": "click",
            "action": {
              "action": "openDialog",
              "args": {
                "title": "电机 M-101 详情",
                "body": [{ "type": "text", "text": "运行状态由 static 点 motorState 驱动。" }]
              }
            }
          },
          {
            "on": "dblclick",
            "action": { "action": "navigate", "args": { "url": "#/flux-basic" } }
          }
        ]
      }
    ]
  },
  "events": {
    "onReady": { "action": "showToast", "args": { "message": "场景就绪" } },
    "onError": { "action": "showToast", "args": { "level": "error", "message": "配置无效" } }
  }
}
```

- 事件 `on` 枚举：`click` / `dblclick` / `hover`；载荷经 `createNormalizedActionEvent` 规范化（`symbolId`/`symbolType`/`pointValues`/`world`/`viewport`）。
- schema 级 `events` 整体为 prop（flux-compiler 无点号字段支持，D-1 裁定）：`onSymbolClick`/`onSymbolDblClick`/`onSymbolHover`/`onReady`/`onError`。
- hover 反馈：sky 层高亮覆盖物（线/多边形按 points 包围盒兜底，0 尺寸退化最小框）。

## 画布浏览与视口

- 滚轮缩放 / 指针拖动平移（wheel/pinch/drag，`move: { drag: 'auto', dragEmpty: true }`）；缩放钳制 [0.1, 20]。
- 初始视口 `viewport: { fit: 'contain' | 'fill', center }`；组件句柄 `component:fit` / `component:center` 命令式复位。
- 视口状态经测试句柄 `engine.getViewport()` / `engine.getViewportPoint(world)` 程序化断言。

## 性能注意

- 点表高频刷新走**刷新流水线合帧**（1 万点批量注入渲染增量 = 1）；不逐点 setState 直刷 React（性能红线）。
- 10 万图元首屏 <2s / 拖动 ≥45fps / 内存 ≤320MB（`docs/analysis/industrial-hmi/benchmark-report.md` 固化口径）。
- 图元事件命中经 `selector.getByPoint` O(候选) 预检；hover 事件经 App 视图面 `pointer.move` 驱动（真实 leafer 空白区 tree 面不派发，I15.1 修复）。

## 测试句柄（e2e 程序化断言）

`window.__flux_scada_<cid>`（恒开，生产裁剪属 host 配置）：

- `engine`：`getSymbols()` / `getSymbol(id)` / `getSymbolProps(id)`（**`ScadaSymbolProps` schema 键名**，与 `setSymbolProps` 对称，如 text 节点 `textSize`）/ `getViewport()` / `getViewportPoint(world)` / `setViewport` / `fit` / `center` / `reset`
- `tree`：`on('render')`（帧事件/性能测量）
- `app`：`app.sky`（hover 覆盖物 rect 断言）
- `getPointValue(pointId)` / `setPointValues(values)`（dev/test 批量注入通道）

## 字段参考

| 字段             | 类型                                            | 说明                                                                                        |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `config`         | `string \| object`（source-enabled）            | 组态 JSON 单一字段（version/variables/symbols）                                             |
| `width`/`height` | `number`                                        | 画布尺寸（缺省容器自适应）                                                                  |
| `viewport`       | `{ fit?: 'contain'\|'fill'; center?: boolean }` | 初始视口策略                                                                                |
| `events`         | `ScadaCanvasEvents`（整体 prop）                | `onSymbolClick`/`onSymbolDblClick`/`onSymbolHover`/`onReady`/`onError`                      |
| `loading`        | region                                          | 加载态模板（缺省轻量占位）                                                                  |
| `empty`          | region                                          | 空态/错误态模板（params `[{ error }]`，缺省错误文案经 i18n `industrial.scada.canvasError`） |

> 组态 JSON 内部结构（`variables`/`symbols`/`bindings`/`states`/`animations`/`custom`）由 `config` 整体承载，不进 renderer-definitions 字段（design-renderer.md §5）。
