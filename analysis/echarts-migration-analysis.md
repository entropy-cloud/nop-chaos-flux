# nop-chaos-flux ECharts 集成分析报告

> Status: open
> Date: 2026-09-06
> Revision: 2 (after review)
> Scope: nop-chaos-flux 图表渲染器
> Conclusion: open

## Context

当前 nop-chaos-flux 使用 recharts 作为图表库，仅支持 6 种图表类型。为支持更多图表类型（桑基图、树图、箱线图、瀑布图等），需要新增 ECharts 渲染器。

**核心设计目标**：
1. **保留现有 chart 渲染器**（recharts），零迁移成本
2. **新增 echarts 渲染器**，支持 24+ 种图表
3. 保持 ECharts 的原生 JSON 风格和语法
4. 数据驱动绑定（ECharts dataset 模式）
5. 编译期验证 JSON 格式正确性
6. 按需引入，不增加简单场景的包大小

---

## 一、当前状态对比

### 1.1 图表库对比

| 维度 | recharts (当前) | ECharts (新增) |
|------|----------------|----------------|
| 图表类型 | 6 | 24+ |
| 包大小 | ~50KB gzip | ~200KB gzip (核心), ~800KB (完整) |
| 渲染方式 | React 组件 | Canvas (默认) / SVG (可选) |
| TypeScript | 良好 | 完整 (深度类型定义) |
| 数据绑定 | React props | dataset + encode + transform |
| 交互系统 | 基础 (onClick/onHover) | 丰富 (dispatchAction + 事件系统) |

### 1.2 支持的图表类型

**recharts 支持**（6种，保留）：
- ✅ bar, line, pie, scatter, area, heatmap

**ECharts 支持**（24种，新增）：
- 基础：line, bar, scatter, pie, gauge, funnel, radar
- 高级：sankey, treemap, tree, boxplot, candlestick, graph, sunburst, themeRiver, parallel, pictorialBar, effectScatter, lines, custom
- 地理：map (需注册 GeoJSON)
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
│  - 6种基础图表        │  - 24+种图表                        │
│  - 简单场景           │  - 复杂交互场景                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 渲染器选择策略

| 场景 | 推荐渲染器 | 原因 |
|------|-----------|------|
| 简单柱状图/折线图 | `chart` | 轻量、快速 |
| 桑基图/树图/箱线图 | `echarts` | recharts 不支持 |
| 丰富交互 (brush/dataZoom) | `echarts` | 交互系统更强 |
| 与 Metabase/Superset 一致 | `echarts` | 相同图表库 |
| 包大小敏感 | `chart` | 更小 |

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
  
  // 数据源 (可选，用于动态数据绑定)
  dataset?: {
    source: Expression;           // 数据源表达式
    dimensions?: string[];        // 维度名称
    transform?: Transform[];      // 数据转换
  };
  
  // 渲染配置
  renderer?: 'canvas' | 'svg';   // 渲染方式
  initOptions?: {                 // echarts.init() 参数
    width?: number | string;
    height?: number | string;
    devicePixelRatio?: number;
    useDirtyRect?: boolean;
  };
  theme?: string | object;        // 主题
  
  // 更新策略
  notMerge?: boolean;             // 是否替换而非合并 option
  lazyUpdate?: boolean;           // 是否延迟更新
  
  // 事件绑定
  events?: Record<string, Expression>;
  
  // 尺寸
  height?: string;  // 与 XDef 保持一致，渲染器解析为数字
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
    "source": "{{salesData}}",
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
    "series": [{
      "type": "sankey",
      "data": [
        { "name": "Source A" },
        { "name": "Target B" }
      ],
      "links": [
        { "source": "Source A", "target": "Target B", "value": 10 }
      ]
    }]
  }
}
```

**示例4：带主题和交互**
```json
{
  "type": "echarts",
  "theme": "dark",
  "renderer": "svg",
  "option": { "..." },
  "events": {
    "click": "{{handleChartClick}}"
  }
}
```

### 3.3 数据映射机制

采用 ECharts 原生的 `dataset` + `encode` 模式：

```json
{
  "type": "echarts",
  "dataset": {
    "source": [
      { "product": "Matcha", "2015": 43.3, "2016": 85.8 },
      { "product": "Milk", "2015": 83.1, "2016": 73.4 }
    ]
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

当 schema 定义了 `dataset` 时，渲染器执行以下流程：

```typescript
// echarts-renderer.tsx
const resolvedData = helpers.evaluate(schema.dataset.source);
const finalOption = {
  ...schema.option,
  dataset: {
    ...schema.dataset,
    source: resolvedData
  }
};
chart.setOption(finalOption, schema.notMerge);
```

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

// 事件绑定
useEffect(() => {
  if (schema.events) {
    Object.entries(schema.events).forEach(([event, handler]) => {
      chart.on(event, handler);
    });
    return () => {
      Object.keys(schema.events).forEach(event => {
        chart.off(event);
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

| 层级 | 验证内容 | 实现方式 | 时机 |
|------|---------|---------|------|
| **结构验证** | 顶层字段存在性和类型 | XDef schema | 编译期 |
| **类型验证** | TypeScript 类型检查 | IDE/TS | 开发时 |
| **语义验证** | option 合法性 | 运行时 validator | 运行时 |

### 4.2 结构验证（XDef）

```xml
<xdef name="io.nop.flux.echarts">
  <root>
    <prop name="type" required="true" constant="echarts"/>
    <prop name="option" type="object" required="true"/>
    <prop name="dataset" type="object">
      <prop name="source" type="expression" required="true"/>
      <prop name="dimensions" type="array" itemType="string"/>
      <prop name="transform" type="array"/>
    </prop>
    <prop name="renderer" type="string" enum="canvas,svg"/>
    <prop name="initOptions" type="object"/>
    <prop name="theme" type="string"/>
    <prop name="notMerge" type="boolean"/>
    <prop name="lazyUpdate" type="boolean"/>
    <prop name="events" type="object"/>
    <prop name="height" type="string"/>
  </root>
</xdef>
```

### 4.3 语义验证（运行时）

```typescript
export function validateEChartsOption(option: any, dataset?: any): ValidationResult {
  const errors: string[] = [];
  
  // 验证 series 存在且为非空数组
  if (!option.series || !Array.isArray(option.series) || option.series.length === 0) {
    errors.push('option.series must be a non-empty array');
  }
  
  // 验证 series 类型有效
  const validTypes = ['line', 'bar', 'scatter', 'pie', 'gauge', 'funnel', 
    'radar', 'sankey', 'treemap', 'tree', 'boxplot', 'candlestick', 
    'graph', 'sunburst', 'themeRiver', 'parallel', 'heatmap', 'map',
    'effectScatter', 'lines', 'pictorialBar', 'custom'];
  
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

| 风险 | 描述 | 缓解措施 |
|------|------|---------|
| **包大小** | ECharts 完整包 ~800KB | 作为可选依赖，按需引入核心图表 |
| **主题一致性** | recharts 和 ECharts 主题不统一 | 设计统一的主题 token 系统 |
| **API 稳定性** | ECharts 版本升级可能有 breaking changes | 锁定版本，定期评估升级 |
| **无障碍性** | Canvas 渲染对屏幕阅读器不友好 | 使用 SVG 渲染器或添加 ARIA 标签 |
| **SSR/SEO** | Canvas 无法 SSR 渲染 | 提供静态图片回退方案 |
| **内存泄漏** | 未调用 dispose() 导致内存泄漏 | 组件卸载时确保调用 dispose() |
| **动态尺寸** | initOptions 宽高为一次性 | 使用 ResizeObserver 响应式调整 |

---

## 七、结论

**推荐方案：双渲染器架构（新增，非迁移）**
- **保留** `chart` 渲染器（recharts）：简单图表、轻量场景
- **新增** `echarts` 渲染器：复杂图表、24+ 种类型

**预期收益**：
- 零迁移成本
- 图表类型从 6 种扩展到 24+ 种
- 按需引入，不增加简单场景包大小
- 与 Metabase/Superset 图表能力对齐
- 原生 ECharts JSON，复用生态和文档

---

## Open Questions

- [ ] 统一主题 token 系统如何设计？
- [ ] 按需引入的粒度（按图表类型 or 按功能模块）？
- [ ] nop-datav 的 panel 如何指定使用哪个渲染器？

---

## References

- ECharts 源码: ~/sources/echarts
- ECharts 文档: https://echarts.apache.org/
- 当前图表实现: flux-renderers-data/src/chart-*.tsx
- ECharts 类型定义: echarts/types/dist/
