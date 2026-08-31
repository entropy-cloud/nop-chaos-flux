import { Button, Card, CardContent, CardHeader, cn } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerMapRenderers } from '@nop-chaos/flux-renderers-map';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { ArrowLeft } from 'lucide-react';

interface MapDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerContentRenderers(registry);
registerMapRenderers(registry);
const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

/** 演示用边界数据：`geojsonSource` action 返回的小型 FeatureCollection（两块简单多边形）。 */
const DEMO_BOUNDARIES = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: '华东区' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [118, 30],
            [122, 30],
            [122, 34],
            [118, 34],
            [118, 30],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: '华北区' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [114, 36],
            [118, 36],
            [118, 41],
            [114, 41],
            [114, 36],
          ],
        ],
      },
    },
  ],
};

const env: RendererEnv = {
  fetcher: async function <T>(req: { url: string }) {
    if (req.url.includes('/api/map/regions')) {
      return { status: 0, data: DEMO_BOUNDARIES as T };
    }
    return { status: 0, data: null as T };
  },
  notify: (level, msg) => console.log(`[${level}] ${msg}`),
};

const REGION_SCHEMA = {
  type: 'map',
  id: 'demoChinaSales',
  label: '中国省市销售',
  mapType: 'region',
  geojsonName: 'china-provinces',
  height: 420,
  regionData: [
    { name: '北京市', value: 128 },
    { name: '上海市', value: 96 },
    { name: '广东省', value: 88 },
    { name: '浙江省', value: 72 },
    { name: '江苏省', value: 66 },
    { name: '四川省', value: 54 },
    { name: '湖北省', value: 47 },
    { name: '山东省', value: 41 },
  ],
  visualMap: {
    colors: ['#c7e4ff', '#1e88e5', '#7b1fa2'],
  },
  onClick: {
    action: 'showToast',
    args: { level: 'info', message: '${event.name}：${event.value}' },
  },
};

const PIN_SCHEMA = {
  type: 'map',
  id: 'demoStorePins',
  label: '门店点位',
  mapType: 'pin',
  cluster: true,
  height: 420,
  pinData: [
    { name: '北京国贸店', lat: 39.9087, lng: 116.4584, value: 32 },
    { name: '北京中关村店', lat: 39.9847, lng: 116.3167, value: 18 },
    { name: '北京望京店', lat: 39.9964, lng: 116.4737, value: 25 },
    { name: '上海陆家嘴店', lat: 31.2381, lng: 121.5017, value: 41 },
    { name: '上海静安店', lat: 31.2304, lng: 121.4578, value: 12 },
    { name: '上海虹桥店', lat: 31.1979, lng: 121.3364, value: 9 },
    { name: '广州天河店', lat: 23.1291, lng: 113.3214, value: 27 },
    { name: '深圳南山店', lat: 22.5267, lng: 113.9315, value: 33 },
  ],
  visualMap: {
    min: 0,
    max: 50,
    colors: ['#9be7ff', '#1e88e5', '#b23c17'],
  },
  center: [113, 31],
  zoom: 4,
  onClick: {
    action: 'showToast',
    args: { level: 'info', message: '${event.name}：${event.value}' },
  },
};

const CUSTOM_GEOJSON_SCHEMA = {
  type: 'map',
  id: 'demoCustomGeojson',
  label: '自定义边界（geojsonSource action 加载）',
  mapType: 'region',
  geojsonSource: { action: 'ajax', args: { url: '/api/map/regions' } },
  height: 420,
  regionData: [
    { name: '华东区', value: 64 },
    { name: '华北区', value: 35 },
  ],
  center: [118, 35],
  zoom: 5,
  onClick: {
    action: 'showToast',
    args: { level: 'info', message: '${event.name}：${event.value}' },
  },
};

const EMPTY_SCHEMA = {
  type: 'map',
  id: 'demoEmptyMap',
  label: '空态',
  mapType: 'region',
  height: 240,
  regionData: [],
  empty: { type: 'text', text: '暂无区域数据' },
};

function DemoSchemaCard(props: {
  title: string;
  description: string;
  schema: unknown;
  className?: string;
}) {
  return (
    <Card className={cn('flex flex-col', props.className)}>
      <CardHeader>
        <h2 className="text-sm font-medium">{props.title}</h2>
        <p className="text-xs text-muted-foreground">{props.description}</p>
      </CardHeader>
      <CardContent className="min-h-80 flex-1">
        <SchemaRenderer
          schemaUrl={`map://demo-${props.title}`}
          schema={props.schema as never}
          registry={registry as never}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </CardContent>
    </Card>
  );
}

export function MapDemoPage({ onBack }: MapDemoPageProps) {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Map Demo (OpenLayers)</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <DemoSchemaCard
            title="Region 区域着色"
            description="内建中国省市 geojson（china-provinces）+ regionData 销售着色 + visualMap 色阶 + 区域点击事件"
            schema={REGION_SCHEMA}
            className="h-[500px]"
          />
          <DemoSchemaCard
            title="Pin 点位聚合"
            description="门店点位 + OL 内置 cluster 聚合（多点点击放大，单点点击派发事件）"
            schema={PIN_SCHEMA}
            className="h-[500px]"
          />
          <DemoSchemaCard
            title="自定义边界（geojsonSource）"
            description="边界数据经 flux action 加载（helpers.dispatch → RendererEnv fetcher），非内建资源"
            schema={CUSTOM_GEOJSON_SCHEMA}
            className="h-[460px]"
          />
          <DemoSchemaCard
            title="空态"
            description="regionData 为空 → empty slot（缺省 noData / 自定义 empty 内容）"
            schema={EMPTY_SCHEMA}
            className="h-[280px]"
          />
        </div>
      </div>
    </div>
  );
}
