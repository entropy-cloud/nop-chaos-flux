import type { MapPinDatum, MapRegionDatum, MapType } from './schemas.js';

export interface GeoJsonGeometry {
  type: string;
  coordinates: unknown;
  [key: string]: unknown;
}

export interface GeoJsonFeature {
  type: 'Feature';
  id?: string | number;
  geometry?: GeoJsonGeometry | null;
  properties: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
  [key: string]: unknown;
}

export type GeojsonActionResult =
  | { ok: true; geojson: GeoJsonFeatureCollection }
  | { ok: false; reason: string };

/**
 * `geojsonSource` action 结果校验：必须是 FeatureCollection 结构。
 * 非法结果 → error 态（对齐 `sanitizeChildren` 三态模式），渲染器降级该层。
 */
export function sanitizeGeojsonActionResult(data: unknown): GeojsonActionResult {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, reason: 'expected an object FeatureCollection' };
  }
  const candidate = data as Partial<GeoJsonFeatureCollection>;
  if (candidate.type !== 'FeatureCollection') {
    return { ok: false, reason: `expected type "FeatureCollection", got ${String(candidate.type)}` };
  }
  if (!Array.isArray(candidate.features)) {
    return { ok: false, reason: 'FeatureCollection.features must be an array' };
  }
  if (candidate.features.some((feature) => feature === null || typeof feature !== 'object')) {
    return { ok: false, reason: 'FeatureCollection.features entries must be objects' };
  }
  return { ok: true, geojson: candidate as GeoJsonFeatureCollection };
}

export interface RegionLayerBuild {
  /** 与 regionData 匹配成功的 feature（properties 附上 name/value），供矢量层渲染。 */
  featureCollection: GeoJsonFeatureCollection;
  /** regionData 中未找到匹配 feature 的 name（dev warn 素材）。 */
  skipped: string[];
  /** 有效 value 的取值范围（色阶用）；无有效值时为 null。 */
  dataRange: { min: number; max: number } | null;
}

function collectDataRange(values: Array<number | undefined>): { min: number; max: number } | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  return Number.isFinite(min) ? { min, max } : null;
}

/**
 * region 模式：把 `[{ name, value }]` 映射到 geojson feature（按 properties.name 匹配）。
 * - 匹配成功 → feature 附 `properties.value`；
 * - 缺失值保留（defaultColor 路径），不参与色阶范围；
 * - 无匹配 feature 的 name 丢弃 + 计入 skipped（renderer 发 dev warn）。
 */
export function buildRegionFeatures(
  regionData: MapRegionDatum[],
  geojson: GeoJsonFeatureCollection,
): RegionLayerBuild {
  const valueByName = new Map<string, number | undefined>();
  for (const entry of regionData) {
    if (entry && typeof entry === 'object' && typeof entry.name === 'string') {
      valueByName.set(entry.name, entry.value);
    }
  }

  const skipped: string[] = [];
  const features: GeoJsonFeature[] = [];
  for (const feature of geojson.features) {
    const props = feature.properties ?? {};
    const name = props.name;
    if (typeof name !== 'string' || !valueByName.has(name)) {
      continue;
    }
    const value = valueByName.get(name);
    const matched: GeoJsonFeature = {
      ...feature,
      properties: { ...props, name, value },
    };
    features.push(matched);
  }

  for (const name of valueByName.keys()) {
    if (!features.some((feature) => feature.properties.name === name)) {
      skipped.push(name);
    }
  }

  return {
    featureCollection: { type: 'FeatureCollection', features },
    skipped,
    dataRange: collectDataRange([...valueByName.values()]),
  };
}

export interface PinLayerBuild {
  features: Array<{ name: string; value?: number; lat: number; lng: number }>;
  /** 非法坐标（越界/非有限数/缺失）丢弃数量（dev warn 素材）。 */
  skipped: number;
  dataRange: { min: number; max: number } | null;
}

function isValidCoordinate(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * pin 模式：校验 lat/lng 合法性，非法坐标丢弃 + 计入 skipped（renderer 发 dev warn）。
 * 返回纯净点位数据（无 OL 依赖），图层装配由 layer manager 完成。
 */
export function buildPinFeatures(pinData: MapPinDatum[]): PinLayerBuild {
  const features: PinLayerBuild['features'] = [];
  let skipped = 0;
  const values: Array<number | undefined> = [];

  for (const entry of pinData) {
    if (!entry || typeof entry !== 'object') {
      skipped += 1;
      continue;
    }
    if (!isValidCoordinate(entry.lat, entry.lng)) {
      skipped += 1;
      continue;
    }
    const name = typeof entry.name === 'string' ? entry.name : '';
    features.push({ name, value: entry.value, lat: entry.lat, lng: entry.lng });
    values.push(entry.value);
  }

  return { features, skipped, dataRange: collectDataRange(values) };
}

export interface MapClickPayloadInput {
  type: 'map:feature-click';
  mapType: MapType;
  name?: string;
  value?: unknown;
  feature?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * 点击 → feature 属性解析（纯函数契约）：从 feature properties 提取
 * name（`name` → `NAME` → id）、value、完整属性面。
 */
export function buildFeatureClickPayload(
  feature: GeoJsonFeature | Pick<GeoJsonFeature, 'properties'>,
  mapType: MapType,
): MapClickPayloadInput {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const rawName = props.name ?? props.NAME;
  const featureWithId = feature as GeoJsonFeature;
  const name =
    typeof rawName === 'string'
      ? rawName
      : typeof featureWithId.id === 'string'
        ? featureWithId.id
        : undefined;
  const value = props.value;
  return {
    type: 'map:feature-click',
    mapType,
    name,
    value,
    feature: props,
  };
}
