import type { OlApi } from '../map-ol-loader.js';

type Listener = (event: { pixel?: number[]; coordinate?: number[] }) => void;

/** 测试锚点：全部已创建 fake map 实例（按创建顺序）。 */
export const fakeMapInstances: FakeMap[] = [];

export class FakeMap {
  target: unknown;
  view: FakeView;
  layers: unknown[] = [];
  disposed = false;
  listeners: Record<string, Listener[]> = {};
  /** 测试锚点：forEachFeatureAtPixel 命中的 feature。 */
  __hitFeature: unknown = undefined;

  constructor(options: { target?: unknown; view: FakeView }) {
    this.target = options.target;
    this.view = options.view;
    fakeMapInstances.push(this);
  }

  addLayer(layer: unknown) {
    this.layers.push(layer);
  }

  removeLayer(layer: unknown) {
    this.layers = this.layers.filter((entry) => entry !== layer);
  }

  getView() {
    return this.view;
  }

  on(type: string, listener: Listener) {
    (this.listeners[type] ??= []).push(listener);
    return listener;
  }

  __emit(type: string, event: { pixel?: number[]; coordinate?: number[] } = {}) {
    for (const listener of this.listeners[type] ?? []) {
      listener(event);
    }
  }

  forEachFeatureAtPixel(_pixel: unknown, callback: (feature: unknown) => unknown) {
    return this.__hitFeature !== undefined ? callback(this.__hitFeature) : undefined;
  }

  setTarget(target: unknown) {
    this.target = target;
  }

  dispose() {
    this.disposed = true;
  }
}

export class FakeView {
  center: number[] | undefined;
  zoom: number | undefined;
  fitted: unknown[] = [];

  constructor(options: { center?: number[]; zoom?: number }) {
    this.center = options.center;
    this.zoom = options.zoom;
  }

  fit(extent: unknown, options?: Record<string, unknown>) {
    this.fitted.push([extent, options]);
    return true;
  }

  getCenter() {
    return this.center;
  }

  getZoom() {
    return this.zoom;
  }

  setCenter(center: number[]) {
    this.center = center;
  }

  setZoom(zoom: number) {
    this.zoom = zoom;
  }
}

export class FakeLayer {
  source: unknown = undefined;
  style: unknown = undefined;
  changedCount = 0;
  properties: Record<string, unknown> = {};

  constructor(options?: { source?: unknown }) {
    this.source = options?.source;
  }

  setSource(source: unknown) {
    this.source = source;
  }

  getSource() {
    return this.source;
  }

  setStyle(style: unknown) {
    this.style = style;
  }

  getStyle() {
    return this.style;
  }

  changed() {
    this.changedCount += 1;
  }

  set(key: string, value: unknown) {
    this.properties[key] = value;
  }

  get(key: string) {
    return this.properties[key];
  }
}

export class FakeVectorSource {
  features: FakeFeature[] = [];
  errorListeners: unknown[] = [];
  options: Record<string, unknown> = {};
  attributions: unknown[] = [];

  constructor(options?: Record<string, unknown>) {
    this.options = options ?? {};
  }

  clear() {
    this.features = [];
  }

  addFeatures(features: FakeFeature[]) {
    this.features.push(...features);
  }

  getFeatures() {
    return this.features;
  }

  getExtent() {
    if (this.features.length === 0) {
      return undefined;
    }
    return [0, 0, 10, 10];
  }

  on(type: string, listener: unknown) {
    if (type === 'tileloaderror') {
      this.errorListeners.push(listener);
    }
  }

  setAttributions(attributions: unknown[]) {
    this.attributions = attributions;
  }
}

export class FakeClusterSource {
  innerSource: FakeVectorSource;

  constructor(options: { source: FakeVectorSource }) {
    this.innerSource = options.source;
  }

  getSource() {
    return this.innerSource;
  }
}

export class FakeFeature {
  properties: Record<string, unknown>;
  geometry: unknown;

  constructor(properties?: Record<string, unknown>) {
    this.properties = properties ?? {};
    this.geometry = undefined;
  }

  set(key: string, value: unknown) {
    this.properties[key] = value;
  }

  get(key: string) {
    return this.properties[key];
  }

  getProperties() {
    return this.properties;
  }

  setGeometry(geometry: unknown) {
    this.geometry = geometry;
  }

  getGeometry() {
    return this.geometry;
  }
}

export class FakePoint {
  coordinates: unknown;

  constructor(coordinates: unknown) {
    this.coordinates = coordinates;
  }
}

class FakeStyleBase {
  options: Record<string, unknown>;

  constructor(options?: Record<string, unknown>) {
    this.options = options ?? {};
  }
}

export function createFakeOlApi(): OlApi {
  return {
    Map: FakeMap as never,
    View: FakeView as never,
    TileLayer: FakeLayer as never,
    VectorLayer: FakeLayer as never,
    VectorSource: FakeVectorSource as never,
    XYZ: FakeVectorSource as never,
    TileWMS: FakeVectorSource as never,
    Cluster: FakeClusterSource as never,
    GeoJSON: class FakeGeoJSON {
      readFeatures(collection: { features: Array<{ properties: Record<string, unknown> }> }) {
        return collection.features.map((feature) => new FakeFeature(feature.properties));
      }
    } as never,
    Feature: FakeFeature as never,
    Point: FakePoint as never,
    Style: FakeStyleBase as never,
    Fill: FakeStyleBase as never,
    Stroke: FakeStyleBase as never,
    Circle: FakeStyleBase as never,
    Text: FakeStyleBase as never,
    fromLonLat: ((coordinates: number[]) => [...coordinates]) as never,
  };
}
