# ECharts 渲染器设计（`type: 'echarts'`）

> Status: active（最终态设计文档）
> 来源：`analysis/echarts-migration-analysis.md`（rev 3，closed）+ 执行计划 E1.1–E5.1（`docs/plans/2026-09-13-2343-*` 至 `docs/plans/2026-09-14-0020-*`）

## 定位与双渲染器边界

`nop-chaos-flux` 的图表渲染采用**双渲染器并存**：

| 渲染器  | type      | 图表库                                      | 适用                                                                                                                                                                 |
| ------- | --------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chart   | `chart`   | recharts                                    | 普通图表（bar/line/pie/scatter/area/heatmap），轻量场景默认路径                                                                                                      |
| ECharts | `echarts` | Apache ECharts 6（optional peer，懒 chunk） | 扩展与复杂图表（sankey/treemap/tree/boxplot/gauge/funnel/radar/map/candlestick/graph/sunburst/themeRiver/custom 等 22 类 series）、dataset/encode 原生语义、丰富交互 |

边界契约：`chart` 不透传 echarts config（零迁移）；`echarts` 不复用 chart 的 recharts 代码路径、不污染 chart schema。

## Schema 契约（`EChartsSchema`）

| 字段                      | 类型                                  | 说明                                                                                                                              |
| ------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `option`                  | object / 表达式                       | ECharts 原生 option，透传给 `setOption`；含表达式字符串时由编译链求值                                                             |
| `dataset`                 | `{ source, dimensions?, transform? }` | schema 级数据绑定（裁决 A2）：`source` 为 scope 表达式或静态数组，支持对象数组 / 列式 / 二维数组；存在时**覆盖** `option.dataset` |
| `renderer`                | `'canvas' \| 'svg'`                   | init 渲染模式，缺省 canvas                                                                                                        |
| `initOptions`             | object                                | `echarts.init` 第三参透传（width/height/devicePixelRatio/useDirtyRect/locale）                                                    |
| `theme`                   | string / object                       | 缺省时应用自动注册的 `'flux'` 主题（见「主题 token 映射」）；指定时透传                                                           |
| `notMerge` / `lazyUpdate` | boolean                               | `setOption` 第二参透传                                                                                                            |
| `height`                  | number / string                       | 容器高度，缺省 400                                                                                                                |
| `events`                  | `Record<on*, ActionSchema>`           | 事件桥接（裁决 A3），键见「事件桥接」                                                                                             |
| `map`                     | `{ name, geoJson }`                   | map 类型 GeoJSON 注册桥接（裁决 A2 例外），仅注册地图数据，不生成 series——`option.series[].map` 由作者声明同名引用                |
| `empty`                   | string / schema / region              | 空态插槽（value-or-region），缺省 `flux.common.noData`                                                                            |
| `componentId`             | string                                | `component:<method>` 句柄定位                                                                                                     |

结构校验（authoring 期）：`invalid-property-shape` 诊断（option 形态、renderer 枚举、dataset/transform/events/map 形态、notMerge/lazyUpdate/height 类型）。运行时防御：畸形数据 warn + 降级，显式空态，永不抛错（chart DD1 契约同构）。

## 数据绑定（dataset/encode）

`schema.dataset.source` 经表达式绑定消费 scope 数据（数据由外部 data-source 加载到 scope，渲染器零请求——裁决 A2）。渲染器将解析结果组合进 `option.dataset`：

```json
{
  "type": "echarts",
  "dataset": { "source": "${salesRows}", "dimensions": ["month", "revenue"] },
  "option": {
    "xAxis": { "type": "category" },
    "yAxis": { "type": "value" },
    "series": [{ "type": "bar", "encode": { "x": "month", "y": "revenue" } }]
  }
}
```

三种 source 形态原生支持：对象数组、列式对象、二维数组。防御规则：source 解析为非法形态 → warn 且不注入 dataset；`dimensions` 与 source 键不一致、`encode` 引用未声明维度 → warn（echarts 语义继续）。空数组 → 显式空态。

图结构类（sankey/tree/treemap/radar/graph/sunburst）按 echarts 原生语义在 series 内嵌 `data`（及 `links`），不适用 dataset+encode；boxplot 惯用二维数组 dataset（预计算 `[min,Q1,median,Q3,max]` 统计行；`transform` 通道可用于原始观测）。

## 事件桥接（裁决 A3）

`events` 键为 flux `on*` 命名，映射 ECharts 原生事件：`onClick→click`、`onDblClick→dblclick`、`onMouseOver→mouseover`、`onMouseOut→mouseout`、`onMouseDown→mousedown`、`onMouseUp→mouseup`、`onContextMenu→contextmenu`、`onDataZoom→dataZoom`、`onLegendSelectChanged→legendselectchanged`。未知键 warn 忽略。

派发：`createNormalizedActionEvent({ type: <native>, ...echartsParams })` → `helpers.dispatch(action, { event, scope })`——action 上下文中 `event.*` 可达 echarts params（如 `event.name`）。

求值语义：`events` 在渲染器定义中为 `ignored` 字段（raw schema 直读，跳过编译期深求值），args 里的 `${event.*}` 模板在 **dispatch 期**结合 normalized event 求值（对齐 button onClick 语义）。若声明为普通 prop，编译器会在渲染期深求值 args 模板，而 `event` 此时不存在——已由 e2e 实证并修复（E5.1）。

```json
{
  "type": "echarts",
  "option": { "series": [{ "type": "gauge", "data": [{ "value": 68 }] }] },
  "events": {
    "onClick": {
      "action": "showToast",
      "args": { "level": "info", "message": "clicked: ${event.name}" }
    }
  }
}
```

## 主题 token 映射（E2.1 裁决）

`resolveFluxEChartsTheme()`（`echarts-theme.ts`）读取 CSS 变量 `--chart-1..5`（shadcn HSL 通道值，包 `hsl(...)`）、`--foreground`/`--muted-foreground`/`--border`/`--popover`/`--popover-foreground`，构建颜色/文本/轴/图例/tooltip token 主题，模块加载时 `registerTheme('flux', ...)`。`theme` 未指定 → 默认应用 `'flux'`（与 recharts 侧 `hsl(var(--chart-*))` 视觉一致）；指定 → 透传。变量缺失（SSR/jsdom）回退静态调色板。主题在 init 时解析，CSS 变量运行时切换需重挂载。

## map GeoJSON 注册（裁决 A2 例外）

```json
{
  "type": "echarts",
  "map": { "name": "world", "geoJson": "${worldGeo}" },
  "option": { "series": [{ "type": "map", "map": "world" }] }
}
```

`geoJson` 为 scope 表达式绑定（宿主经 data-source 加载 GeoJSON，渲染器零 fetch）；渲染器在 init 前 `registerMap(name, geoJson)`（幂等，重名覆盖）。GeoJSON 未就绪/非法 → warn + 显式空态；就绪后重走 init。

## custom series

`renderItem` 是函数，JSON 不可表达。sanctioned 路径：option 整体经表达式绑定由宿主提供（xui:imports 注册的 builder 返回含函数的 option 对象）——表达式求值结果保函数引用（真实编译链已验证）。

## 生命周期与失败路径

懒加载（`createLazyRendererComponent` + 模块级 import 去重）→ init（主题/渲染模式/initOptions）→ setOption（option 引用比对，引用变化才重设）→ ResizeObserver resize → 卸载 dispose。

| 失败路径                                     | 行为                                            |
| -------------------------------------------- | ----------------------------------------------- |
| echarts chunk 加载失败（optional peer 缺失） | `data-slot="echarts-error"` 占位 + warn，不崩溃 |
| option 非对象                                | `data-slot="echarts-empty"`，不 setOption       |
| dataset 空 / map GeoJSON 未就绪              | 显式空态，不 init                               |
| 事件 action 派发拒绝                         | 捕获 + warn，交互不受损                         |

## 按需引入与包体（E1.1 裁决 + E5.1 实测）

按需引入粒度 = **按功能模块**：echarts 符号仅经 `echarts-setup.ts`（单一注册模块）进入渲染器；渲染器组件懒加载使 echarts 全量位于懒 chunk——未挂载 `echarts` 渲染器的宿主零加载（flux-bundle 单文件构建亦 external，`vite.config.ts` `hostOwnedExternal` 含 `/^echarts(\/.*)?$/`）。裁剪点 = `echarts-setup.ts` 的注册清单（单一位置；当前注册全部 22 类以支撑 E3.1/E4.1 已验证类型）。

代理实测（echarts ^6.0.0 实装 6.1.0，vite 8.0.3 / rolldown 1.0.0-rc.12，es2022 minify）：setup 懒 chunk **1,418.99 kB min / 399.79 kB gzip**（entry chunk 0.16 kB）。口径说明：同 setup 注册清单下的代理实测——宿主懒 chunk 还含渲染器组件小 chunk，echarts 部分与实测一致。

可复现 harness（自包含；`@nop-chaos/*` stub 为空对象以隔离 workspace 依赖）：

```ts
// entry.ts
export async function bootstrap() {
  const mod = await import('<repo>/packages/flux-renderers-data/src/echarts-setup.js');
  return mod.getECharts();
}
void bootstrap;

// vite.config.ts（置于任意目录，路径按需调整）
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  build: {
    target: 'es2022',
    minify: true,
    lib: {
      entry: fileURLToPath(new URL('./entry.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
    },
    rolldownOptions: { external: [/^react(\/.*)?$/, /^@nop-chaos\//] },
  },
});
// 运行：npx vite build --config vite.config.ts --outDir dist
// 体积：dist/echarts-setup-*.js（gzip 列即懒 chunk 体积）
```

## 验证锚点

- 单元：`packages/flux-renderers-data/src/__tests__/echarts-*.test.ts(x)`（theme/dataset-binding/events-bridge/advanced-charts/full-features/schema-validation/renderer/load-failure/import-isolation/definition-contracts）
- 契约守卫：`contract-honesty.test.ts`（events?.<key> 字面引用）+ import isolation 守卫
- 真实浏览器：`tests/e2e/component-lab/echarts-lab.spec.ts`
- lab 场景：playground Renderer Lab → ECharts（dataset 切换/事件/主题/六类完整功能/七类高级图表）

## 原则审计

new-renderer-introduction-audit §A–F 已于 E1.1 执行并记录（`docs/plans/2026-09-13-2343-echarts-e1-1-renderer-skeleton-plan.md`「New Renderer Audit Record」）；§G 不适用（进现有包）。
