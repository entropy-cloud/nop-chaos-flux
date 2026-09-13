# nop-chaos-flux ECharts 集成分析报告

> Status: closed
> Date: 2026-09-06
> Revision: 3 (adjudications landed)
> Scope: nop-chaos-flux 图表渲染器
> Conclusion: closed（双渲染器架构裁定；遗留 2 项 Open Question 移交 E1/E2 plan 输入）

## Adjudications (Rev 3)

2026-09-06 用户裁决落地，修正 rev 2 与项目架构契约的三处不一致：

| #   | 主题     | 裁决                                                                                                                                                                                                                                                                               |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | 验证体系 | **删除 XDef 验证**，使用前端自己的验证体系：结构验证 = TS 类型 + flux-compiler schema-compiler（`createSchemaCompiler().validate()`，见 `docs/architecture/schema-file-validator.md`）；运行时语义验证 = renderer 防御性校验（沿用 chart 的 `sanitizeSeries`/`isChartDatum` 模式） |
| A2  | 数据绑定 | chart 数据由**外部获取**（data-source 加载到 scope），通过**表达式绑定**提供给内部；renderer 不做任何数据请求。除非 echarts 有**内置加载机制**（如 map 的 GeoJSON 注册、自定义资源加载），才需要桥接外部 data-source 等定义；一般场景表达式绑定即可                                |
| A3  | 事件机制 | echarts 事件**桥接到 flux 事件响应体系**：`events.*` declarative action 通道（`on*` 命名 → action graph），不发明平行命名（见 `docs/references/naming-conventions.md` §4.4）                                                                                                       |

## Context

当前 nop-chaos-flux 使用 recharts 作为图表库，仅支持 6 种图表类型。为支持更多图表类型（桑基图、树图、箱线图、瀑布图等），需要新增 ECharts 渲染器。

**核心设计目标**：

1. **保留现有 chart 渲染器**（recharts），零迁移成本
2. **新增 echarts 渲染器**，支持 22 种图表
3. 保持 ECharts 的原生 JSON 风格和语法
4. 数据驱动绑定（ECharts dataset 模式）
5. 编译期验证 JSON 格式正确性
6. 按需引入，不增加简单场景的包大小

---

## 一、当前状态对比

### 1.1 图表库对比

| 维度       | recharts (当前)        | ECharts (新增)                    |
| ---------- | ---------------------- | --------------------------------- |
| 图表类型   | 6                      | 22                                |
| 包大小     | ~50KB gzip             | ~200KB gzip (核心), ~800KB (完整) |
| 渲染方式   | React 组件             | Canvas (默认) / SVG (可选)        |
| TypeScript | 良好                   | 完整 (深度类型定义)               |
| 数据绑定   | React props            | dataset + encode + transform      |
| 交互系统   | 基础 (onClick/onHover) | 丰富 (dispatchAction + 事件系统)  |

### 1.2 支持的图表类型

**recharts 支持**（6种，保留）：

- ✅ bar, line, pie, scatter, area, heatmap

**ECharts 支持**（22 种 series 类型，官方全量）：

- 基础：line, bar, scatter, pie, gauge, funnel, radar
- 高级：sankey, treemap, tree, boxplot, candlestick, graph, sunburst, themeRiver, parallel, pictorialBar, effectScatter, lines, custom
- 地理：map (需注册 GeoJSON)
- 交集：heatmap 双渲染器共有（chart 自绘 SVG 实现，echarts 原生支持）
- 注意：chord 是 ECharts 2.x 遗留，不推荐使用

---

## 二、架构设计

### 2.1 双渲染器架构

```
┌─────────────────────────────────────────────────────────────┐
│                    渲染器注册表                               │
├─────────────────────────────────────────────────────────────┤
│  type: 'chart'        │  type: 'echarts'                    │
│  (recharts)           │  (ECharts)                         │
│  - 轻量级 (~50KB)     │  - 按需引入 (~200KB起)              │
│  - 6种基础图表        │  - 22种图表                         │
│  - 简单场景           │  - 复杂交互场景                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 渲染器选择策略

| 场景                      | 推荐渲染器 | 原因            |
| ------------------------- | ---------- | --------------- |
| 简单柱状图/折线图         | `chart`    | 轻量、快速      |
| 桑基图/树图/箱线图        | `echarts`  | recharts 不支持 |
| 丰富交互 (brush/dataZoom) | `echarts`  | 交互系统更强    |
| 与 Metabase/Superset 一致 | `echarts`  | 相同图表库      |
| 包大小敏感                | `chart`    | 更小            |

### 2.3 现有架构（保留不变）

```
ChartSchema (recharts)
    ↓
chart-renderer.tsx
    ↓
recharts 组件
    ↓
Canvas/SVG 渲染
```

### 2.4 新增 ECharts 架构

```
EChartsSchema (ECharts 原生 option)
    ↓
echarts-renderer.tsx
    ↓
echarts.init() + setOption()
    ↓
Canvas (默认) / SVG (可选) 渲染
```

---

## 三、Schema 设计

### 3.1 EChartsSchema（v2 修订版）

```typescript
interface EChartsSchema extends BaseSchema {
  type: 'echarts';

  // ECharts option (原生结构，直接复用 ECharts 文档)
  option: EChartsOption | Expression;

  // 数据源 (可选，用于动态数据绑定；数据由外部 data-source 加载到 scope，此处仅消费)
  // 裁决 A2：一般场景表达式绑定即可；echarts 内置加载机制（GeoJSON 等）才需桥接外部定义
  dataset?: {
    source: Expression; // 数据源表达式（scope 读取，renderer 不做请求）
    dimensions?: string[]; // 维度名称
    transform?: Transform[]; // 数据转换
  };

  // 渲染配置
  renderer?: 'canvas' | 'svg'; // 渲染方式
  initOptions?: {
    // echarts.init() 参数
    width?: number | string;
    height?: number | string;
    devicePixelRatio?: number;
    useDirtyRect?: boolean;
  };
  theme?: string | object; // 主题

  // 更新策略
  notMerge?: boolean; // 是否替换而非合并 option
  lazyUpdate?: boolean; // 是否延迟更新

  // 事件绑定 (裁决 A3：桥接 flux events.* 通道，on* 命名 → declarative action)
  // 键 = flux on* 事件名（进入 events.* 通道），值 = declarative action 对象（{ action, args, ... }）
  // ECharts 原生事件映射：onClick→click, onDblClick→dblclick, onMouseOver→mouseover,
  // onMouseOut→mouseout, onMouseDown→mousedown, onMouseUp→mouseup, onContextMenu→contextmenu,
  // onDataZoom→dataZoom, onLegendSelectChanged→legendselectchanged 等
  events?: Record<string, ActionSchema>;

  // 尺寸
  height?: string; // 高度，渲染器解析为数字
}
```

### 3.2 JSON 示例

**示例1：直接使用 ECharts JSON**

```json
{
  "type": "echarts",
  "option": {
    "xAxis": { "type": "category", "data": ["Mon", "Tue", "Wed"] },
    "yAxis": { "type": "value" },
    "series": [{ "type": "bar", "data": [120, 200, 150] }]
  }
}
```

**示例2：使用 dataset 数据绑定**

```json
{
  "type": "echarts",
  "dataset": {
    "source": "${salesData}",
    "dimensions": ["product", "2015", "2016"]
  },
  "option": {
    "xAxis": { "type": "category" },
    "yAxis": { "type": "value" },
    "series": [
      { "type": "bar", "encode": { "x": "product", "y": "2015" } },
      { "type": "bar", "encode": { "x": "product", "y": "2016" } }
    ]
  }
}
```

**示例3：桑基图**

```json
{
  "type": "echarts",
  "option": {
    "series": [
      {
        "type": "sankey",
        "data": [{ "name": "Source A" }, { "name": "Target B" }],
        "links": [{ "source": "Source A", "target": "Target B", "value": 10 }]
      }
    ]
  }
}
```

**示例4：带主题和交互（裁决 A3：事件走 flux events._ 通道，on_ 命名 + declarative action）**

```json
{
  "type": "echarts",
  "theme": "dark",
  "renderer": "svg",
  "option": { "..." },
  "events": {
    "onClick": {
      "action": "toast",
      "args": { "msg": "chart clicked" }
    },
    "onDataZoom": {
      "action": "setValue",
      "args": { "path": "zoomRange", "value": "${event.params}" }
    }
  }
}
```

### 3.3 数据映射机制

采用 ECharts 原生的 `dataset` + `encode` 模式。**schema 级 `dataset.source` 一律为表达式绑定**（裁决 A2，数据由外部 data-source 加载到 scope）；静态内联示例数据（如直接抄写 ECharts 文档示例）放 `option.dataset`（echarts 原生位置），不经 schema 级 dataset：

```json
{
  "type": "echarts",
  "dataset": {
    "source": "${salesData}",
    "dimensions": ["product", "2015", "2016"]
  },
  "option": {
    "xAxis": { "type": "category" },
    "yAxis": { "type": "value" },
    "series": [
      { "type": "bar", "encode": { "x": "product", "y": "2015" } },
      { "type": "bar", "encode": { "x": "product", "y": "2016" } }
    ]
  }
}
```

**注意**：`encode` 只能放在 `series` 上，不能放在 `xAxis`/`yAxis` 上。

**支持的数据格式**：

- 对象数组（推荐）：`[{ product: "A", value: 100 }]`
- 列式数据：`{ product: ["A", "B"], value: [100, 200] }`
- 二维数组：`[["A", 100], ["B", 200]]`

### 3.4 数据流

数据由外部 data-source 加载到 scope，渲染器通过表达式绑定消费（裁决 A2），不发起任何数据请求：

```typescript
// echarts-renderer.tsx
const resolvedData = helpers.evaluate(schema.dataset.source);
const finalOption = {
  ...schema.option,
  dataset: {
    ...schema.dataset,
    source: resolvedData,
  },
};
chart.setOption(finalOption, schema.notMerge);
```

**例外（内置加载机制桥接）**：仅当 echarts 能力本身需要外部资源时才桥接外部定义，例如：

- map 类型的 GeoJSON 注册：`registerMap` 所需地图数据经 scope / `xui:imports` 或宿主环境提供，不走组件级请求
- 其他 echarts 内置的异步加载能力：逐项评估后经 data-source / action 桥接，renderer 不直接 fetch

### 3.5 生命周期

```typescript
// 初始化
const chart = echarts.init(dom, theme, initOptions);

// 响应式调整
useEffect(() => {
  const observer = new ResizeObserver(() => chart.resize());
  observer.observe(dom);
  return () => observer.disconnect();
}, []);

// 事件绑定（裁决 A3：桥接 flux events.* 通道）
// on* 键 → 映射 ECharts 原生事件名 → 经 flux 事件通道 dispatch declarative action
useEffect(() => {
  if (schema.events) {
    const NATIVE_EVENT: Record<string, string> = {
      onClick: 'click',
      onDblClick: 'dblclick',
      onMouseOver: 'mouseover',
      onMouseOut: 'mouseout',
      onMouseDown: 'mousedown',
      onMouseUp: 'mouseup',
      onContextMenu: 'contextmenu',
      onDataZoom: 'dataZoom',
      onLegendSelectChanged: 'legendselectchanged',
    };
    Object.entries(schema.events).forEach(([fluxEvent, action]) => {
      const native = NATIVE_EVENT[fluxEvent];
      if (native)
        chart.on(native, (params) => props.events[fluxEvent]?.dispatch(action, { params }));
    });
    return () => {
      Object.keys(schema.events).forEach((fluxEvent) => {
        const native = NATIVE_EVENT[fluxEvent];
        if (native) chart.off(native);
      });
    };
  }
}, [schema.events]);

// 销毁（防止内存泄漏）
useEffect(() => {
  return () => chart.dispose();
}, []);
```

---

## 四、编译期验证

### 4.1 验证层级

| 层级         | 验证内容             | 实现方式                                                  | 时机   |
| ------------ | -------------------- | --------------------------------------------------------- | ------ |
| **结构验证** | 顶层字段存在性和类型 | TS 类型（`EChartsSchema`）+ flux-compiler schema-compiler | 编译期 |
| **类型验证** | TypeScript 类型检查  | IDE/TS                                                    | 开发时 |
| **语义验证** | option 合法性        | 运行时 validator（防御性校验）                            | 运行时 |

### 4.2 结构验证（前端验证体系，裁决 A1）

**删除 XDef XML 方案**（XDef 是 Nop 后端框架概念，本项目为纯前端 TS 栈）。改用：

1. **TS 类型**：`EChartsSchema` 类型定义承载顶层结构约束（type/option/dataset/renderer/initOptions/theme/notMerge/lazyUpdate/events/height）。
2. **flux-compiler schema-compiler**：`createSchemaCompiler().validate(...)` 复用编译器自有分析 pass 做结构验证与诊断（见 `docs/architecture/schema-file-validator.md`，不维护第二个验证引擎）。
3. **schema 编译**：`option`/`dataset.source` 等表达式字段经 flux-formula 编译，非法表达式在编译期报诊断。

### 4.3 语义验证（运行时）

**ECharts 官方无内置 option 验证器**（apache/echarts issue #19046，2023 提出至今 open，核心开发者确认 "There is not such checker"；官网示例编辑器的校验为 try-catch 模拟）；npm 无成熟社区验证包（`echarts-validator` 不存在）。因此运行时语义验证必须自写，但**只做轻量防御，不做全量 schema 校验**：

- `option` 字段的编译期验证由官方 `ComposeOption<SeriesOption | ComponentOption>` TS 类型体系承担（按需注册组件后类型精确到 series/component 级）
- 运行时 validator 沿用 chart 渲染器的 `sanitizeSeries`/`isChartDatum` 模式：畸形 option/dataset 被过滤或降级为空态，**显式空态永不抛错**（与 chart DD1 硬契约同构）；校验范围聚焦决定渲染成败的关键结构（series 存在性/类型、dimensions/encode 一致性）

```typescript
export function validateEChartsOption(option: any, dataset?: any): ValidationResult {
  const errors: string[] = [];
  const isEmpty = !option.series || !Array.isArray(option.series) || option.series.length === 0;

  // 空 series 是合法空态（DD1 显式空态契约）：返回 empty 信号，渲染器降级空态而非抛错
  if (isEmpty) {
    return { valid: true, errors: [], empty: true };
  }

  // 验证 series 类型有效
  const validTypes = [
    'line',
    'bar',
    'scatter',
    'pie',
    'gauge',
    'funnel',
    'radar',
    'sankey',
    'treemap',
    'tree',
    'boxplot',
    'candlestick',
    'graph',
    'sunburst',
    'themeRiver',
    'parallel',
    'heatmap',
    'map',
    'effectScatter',
    'lines',
    'pictorialBar',
    'custom',
  ];

  // 验证 dimensions 一致性
  if (dataset?.dimensions && dataset?.source) {
    const source = dataset.source;
    if (Array.isArray(source) && source.length > 0) {
      const firstRow = source[0];
      if (typeof firstRow === 'object') {
        const sourceKeys = Object.keys(firstRow);
        for (const dim of dataset.dimensions) {
          if (!sourceKeys.includes(dim)) {
            errors.push(`Dimension "${dim}" not found in source data`);
          }
        }
      }
    }
  }

  // 验证 encode 引用有效
  if (dataset?.dimensions && option.series) {
    for (const s of option.series) {
      if (s.encode) {
        for (const [key, dimName] of Object.entries(s.encode)) {
          if (!dataset.dimensions.includes(dimName as string)) {
            errors.push(`encode.${key} references unknown dimension: ${dimName}`);
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
```

---

## 五、实施路径

### Phase 1：基础设施（1周）

1. 安装 ECharts 依赖（可选 peer dependency）
2. 创建 `echarts-renderer.tsx` 基础组件
3. 创建 `echarts-schema.ts` 类型定义
4. 创建 `echarts-schema-validator.ts` 验证器
5. 注册 `echarts` 渲染器（与 `chart` 并存）

### Phase 2：核心图表（2周）

1. 实现 dataset 数据绑定
2. 支持基础图表（bar/line/pie/scatter/gauge/funnel/radar）
3. 添加 tooltip/legend 交互
4. 支持主题配置

### Phase 3：高级图表（2周）

1. 桑基图 (sankey)
2. 树图 (treemap/tree)
3. 箱线图 (boxplot)
4. 旭日图 (sunburst)
5. 力导向图 (graph)
6. K线图 (candlestick)

### Phase 4：完整功能（2周）

1. 地理图 (map) + GeoJSON 注册
2. 主题河流 (themeRiver)
3. 平行坐标 (parallel)
4. 自定义图表 (custom)
5. 象形柱图 (pictorialBar)
6. 涟漪散点图 (effectScatter)

### Phase 5：集成优化（1周）

1. 与 nop-datav 集成
2. 性能优化（按需引入）
3. 文档和示例
4. 测试覆盖

---

## 六、风险与缓解

| 风险           | 描述                                    | 缓解措施                        |
| -------------- | --------------------------------------- | ------------------------------- |
| **包大小**     | ECharts 完整包 ~800KB                   | 作为可选依赖，按需引入核心图表  |
| **主题一致性** | recharts 和 ECharts 主题不统一          | 设计统一的主题 token 系统       |
| **API 稳定性** | ECharts 版本升级可能有 breaking changes | 锁定版本，定期评估升级          |
| **无障碍性**   | Canvas 渲染对屏幕阅读器不友好           | 使用 SVG 渲染器或添加 ARIA 标签 |
| **SSR/SEO**    | Canvas 无法 SSR 渲染                    | 提供静态图片回退方案            |
| **内存泄漏**   | 未调用 dispose() 导致内存泄漏           | 组件卸载时确保调用 dispose()    |
| **动态尺寸**   | initOptions 宽高为一次性                | 使用 ResizeObserver 响应式调整  |

---

## 七、结论

**推荐方案：双渲染器架构（新增，非迁移）**

- **保留** `chart` 渲染器（recharts）：简单图表、轻量场景
- **新增** `echarts` 渲染器：复杂图表、22 种类型

**预期收益**：

- 零迁移成本
- 图表类型从 6 种扩展到 22 种
- 按需引入，不增加简单场景包大小
- 与 Metabase/Superset 图表能力对齐
- 原生 ECharts JSON，复用生态和文档

**Rev 3 落地裁决**（详见文件头 Adjudications）：

- A1：删除 XDef 验证，结构验证走 TS 类型 + flux-compiler schema-compiler，运行时语义验证自写轻量防御性校验（官方无内置验证器，事实依据见 §4.3）
- A2：数据由外部 data-source 加载到 scope，表达式绑定消费；仅 echarts 内置加载机制（GeoJSON 等）才桥接外部定义
- A3：事件桥接 flux `events.*` declarative action 通道，`on*` 命名，不发明平行命名

---

## Open Questions

- [x] 渲染器选择策略 → **resolved**（rev 2 已定双渲染器原则；nop-datav panel 指定渲染器的**机制**归 E5 集成评估，roadmap E5.2）
- [x] 按需引入的粒度（按图表类型 or 按功能模块）→ **resolved**（2026-09-13，E1.1 plan 裁决：**按功能模块**——统一经 `echarts/core` + `echarts/charts` + `echarts/components` + `echarts/renderers` 官方 tree-shaking 入口，集中注册于 `flux-renderers-data/src/echarts-setup.ts` 单一模块；渲染器组件动态 import 使 echarts 全量位于懒 chunk，未挂载 `echarts` 渲染器的宿主零加载；E5.1 在该单一模块收窄注册清单做包体控制。证据：`docs/plans/2026-09-13-2343-echarts-e1-1-renderer-skeleton-plan.md` Phase 1 Decision）
- [ ] 统一主题 token 系统如何设计 → **移交 E2 plan 裁决**（recharts CSS 变量体系与 ECharts 主题的映射方案）

---

## References

- ECharts 源码: ~/sources/echarts
- ECharts 文档: https://echarts.apache.org/
- 当前图表实现: flux-renderers-data/src/chart-\*.tsx
- ECharts 类型定义: echarts/types/dist/
