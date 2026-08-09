import type { ActionSchema, BaseSchema, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';

/** 瓦片底图配置（缺省 OSM xyz；中国场景可配天地图/高德 url，key 由应用侧注入 url）。 */
export interface MapBasemapSchema extends SchemaObject {
  /** 瓦片 url 模板（xyz: `{x}`/`{y}`/`{z}`；wms: 完整 GetMap 请求）。缺省 OSM。 */
  url?: string;
  /** 底图版权声明，渲染为地图 attribution。 */
  attribution?: string;
  /** 瓦片服务类型：xyz（瓦片坐标模板）| wms（WMS GetMap 服务）。缺省 xyz。 */
  type?: 'xyz' | 'wms';
}

/** 色阶配置（region 区域着色 / pin 点位按值着色）。 */
export interface MapVisualMapSchema extends SchemaObject {
  min?: number;
  max?: number;
  /** 由低到高的颜色数组（CSS 颜色值）。缺省主题色阶。 */
  colors?: string[];
  /** 无值 / 超出数据范围的缺省颜色。 */
  defaultColor?: string;
}

/** region 模式数据项：`{ name: '北京', value: 123 }`。 */
export interface MapRegionDatum {
  name: string;
  value?: number;
  [key: string]: unknown;
}

/** pin 模式数据项：`{ name, lat, lng, value? }`。 */
export interface MapPinDatum {
  name?: string;
  lat: number;
  lng: number;
  value?: number;
  [key: string]: unknown;
}

/** 内建 geojson 资源名（包内 `src/map-data/*.json` 静态 JSON，随 lazy chunk 加载）。 */
export type MapBuiltinGeojsonName = 'china-provinces' | 'world-countries';

export type MapType = 'pin' | 'region';

/** 点击事件 payload（仅 feature 命中时派发）。 */
export interface MapClickPayload {
  type: 'map:feature-click';
  mapType: MapType;
  name?: string;
  value?: unknown;
  feature?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MapSchema extends BaseSchema {
  type: 'map';
  /** 双模式：pin（点位 + cluster 聚合）| region（区域着色 choropleth）。缺省 pin。 */
  mapType?: MapType;
  basemap?: MapBasemapSchema;
  /** region 模式数据：`[{ name, value }]`，scope/data-source 表达式求值。 */
  regionData?: SchemaValue;
  /** 内建 geojson 资源选择（region 模式）。与 geojsonSource 二选一，geojsonSource 优先。 */
  geojsonName?: MapBuiltinGeojsonName;
  /** 自定义边界数据：action 加载（helpers.dispatch → FeatureCollection 校验 → 缓存复用）。 */
  geojsonSource?: ActionSchema;
  /** pin 模式数据：`[{ name, lat, lng, value? }]`，表达式求值。 */
  pinData?: SchemaValue;
  /** 点位聚合开关（OL 内置 Cluster 源）。缺省 true。 */
  cluster?: boolean;
  visualMap?: MapVisualMapSchema;
  /** 初始中心 `[lng, lat]`。 */
  center?: number[];
  /** 初始缩放级别。 */
  zoom?: number;
  /** 容器高度（px）。缺省 400。 */
  height?: number;
  /** 空态内容（value-or-region）。 */
  empty?: SchemaValue;
  /** 外部 loading 状态（false 时渲染 loading 态）。 */
  loading?: boolean;
  onClick?: ActionSchema;
}
