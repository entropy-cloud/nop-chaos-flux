import type OlMap from 'ol/Map';
import type OlFeature from 'ol/Feature';
import type OlVectorLayer from 'ol/layer/Vector';
import type OlVectorSource from 'ol/source/Vector';
import type OlCluster from 'ol/source/Cluster';
import type { MapBasemapSchema } from './schemas.js';
import type {
  GeoJsonFeature,
  PinLayerBuild,
  RegionLayerBuild,
} from './map-data.js';
import type { MapColorScale } from './map-color.js';
import type { OlApi } from './map-ol-loader.js';

/** 主题映射：CSS 变量 → OL 样式的具体色值（renderer 侧解析注入）。 */
export interface MapThemeColors {
  border: string;
  background: string;
  text: string;
  accent: string;
}

export interface HitFeatureLike {
  getProperties(): Record<string, unknown>;
  get(name: string): unknown;
}

export interface MapLayerManager {
  setBasemap(config: MapBasemapSchema | undefined): void;
  setRegionLayer(build: RegionLayerBuild | null, scale: MapColorScale, options?: { fitView?: boolean }): void;
  setPinLayer(build: PinLayerBuild | null, cluster: boolean, scale: MapColorScale): void;
  setHighlight(feature: HitFeatureLike | null): void;
  setTheme(theme: MapThemeColors): void;
  getHitFeatureAtPixel(pixel: number[] | Uint8Array): HitFeatureLike | undefined;
  dispose(): void;
}

const CLUSTER_DISTANCE = 40;

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace(/^#/, '');
  if (normalized.length === 6 && /^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `#${normalized}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
  }
  return hex;
}

export function createMapLayerManager(input: {
  api: OlApi;
  map: OlMap;
  theme: MapThemeColors;
}): MapLayerManager {
  const { api, map } = input;
  let theme = input.theme;

  let basemapLayer: InstanceType<OlApi['TileLayer']> | null = null;
  let dataLayer: OlVectorLayer | null = null;
  let regionSource: OlVectorSource | null = null;
  let pinInnerSource: OlVectorSource | null = null;
  let clusterSource: OlCluster | null = null;
  let highlighted: HitFeatureLike | null = null;
  let basemapWarned = false;

  function ensureDataLayer(): OlVectorLayer {
    if (dataLayer) {
      return dataLayer;
    }
    dataLayer = new api.VectorLayer({ source: new api.VectorSource() });
    map.addLayer(dataLayer);
    return dataLayer;
  }

  function removeDataLayer() {
    if (dataLayer) {
      map.removeLayer(dataLayer);
      dataLayer = null;
    }
    regionSource = null;
    pinInnerSource = null;
    clusterSource = null;
  }

  function setBasemap(config: MapBasemapSchema | undefined) {
    const type = config?.type === 'wms' ? 'wms' : 'xyz';
    let source: InstanceType<OlApi['XYZ']> | InstanceType<OlApi['TileWMS']>;
    if (type === 'wms') {
      const wmsUrl = config?.url ?? 'https://ows.terrestris.de/osm/service';
      source = new api.TileWMS({
        url: wmsUrl,
        params: { LAYERS: 'OSM-WMS', VERSION: '1.1.1' },
        crossOrigin: 'anonymous',
      });
    } else {
      const url =
        config?.url ??
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      source = new api.XYZ({ url, crossOrigin: 'anonymous' });
    }
    source.on('tileloaderror', () => {
      if (!basemapWarned && typeof console !== 'undefined') {
        basemapWarned = true;
        console.warn('[map] basemap tile failed to load; vector layers keep rendering');
      }
    });

    if (basemapLayer) {
      basemapLayer.setSource(source);
    } else {
      basemapLayer = new api.TileLayer({ source });
      map.addLayer(basemapLayer);
    }
    if (config?.attribution && typeof (source as InstanceType<OlApi['XYZ']>).setAttributions === 'function') {
      (source as InstanceType<OlApi['XYZ']>).setAttributions([config.attribution]);
    }
  }

  function buildRegionStyle(scale: MapColorScale) {
    return (feature: HitFeatureLike) => {
      const value = feature.get('value') as number | undefined;
      const isHighlighted = feature === highlighted;
      return new api.Style({
        fill: new api.Fill({
          color: isHighlighted
            ? withAlpha(theme.accent, 0.55)
            : scale.color(value),
        }),
        stroke: new api.Stroke({
          color: isHighlighted ? theme.accent : theme.border,
          width: isHighlighted ? 2 : 1,
        }),
      });
    };
  }

  function setRegionLayer(
    build: RegionLayerBuild | null,
    scale: MapColorScale,
    options?: { fitView?: boolean },
  ) {
    if (!build) {
      removeDataLayer();
      return;
    }
    const layer = ensureDataLayer();
    if (!regionSource) {
      regionSource = new api.VectorSource();
    }
    const features = new api.GeoJSON().readFeatures(
      build.featureCollection as never,
    ) as OlFeature[];
    regionSource.clear();
    regionSource.addFeatures(features);
    layer.setSource(regionSource);
    layer.setStyle(buildRegionStyle(scale));
    layer.set('map-mode', 'region');

    if (options?.fitView) {
      const extent = regionSource.getExtent();
      if (extent) {
        map.getView().fit(extent, { maxZoom: 10 });
      }
    }
  }

  function buildClusterStyle(scale: MapColorScale) {
    return (feature: HitFeatureLike) => {
      const members = feature.get('features') as HitFeatureLike[] | undefined;
      const count = members?.length ?? 1;
      if (count === 1) {
        const member = members?.[0] ?? feature;
        const value = member.get('value') as number | undefined;
        return new api.Style({
          image: new api.Circle({
            radius: 6,
            fill: new api.Fill({ color: scale.color(value) }),
            stroke: new api.Stroke({ color: theme.background, width: 2 }),
          }),
        });
      }
      return new api.Style({
        image: new api.Circle({
          radius: 12 + Math.min(count, 20),
          fill: new api.Fill({ color: withAlpha(theme.accent, 0.65) }),
          stroke: new api.Stroke({ color: theme.border, width: 1 }),
        }),
        text: new api.Text({
          text: String(count),
          fill: new api.Fill({ color: theme.text }),
        }),
      });
    };
  }

  function buildPinStyle(scale: MapColorScale) {
    return (feature: HitFeatureLike) => {
      const value = feature.get('value') as number | undefined;
      return new api.Style({
        image: new api.Circle({
          radius: 6,
          fill: new api.Fill({ color: scale.color(value) }),
          stroke: new api.Stroke({ color: theme.background, width: 2 }),
        }),
      });
    };
  }

  function setPinLayer(build: PinLayerBuild | null, cluster: boolean, scale: MapColorScale) {
    if (!build) {
      removeDataLayer();
      return;
    }
    const layer = ensureDataLayer();
    const features = build.features.map(
      (pin) =>
        new api.Feature({
          geometry: new api.Point(api.fromLonLat([pin.lng, pin.lat])),
          name: pin.name,
          value: pin.value,
        }),
    );

    if (!pinInnerSource) {
      pinInnerSource = new api.VectorSource();
    }
    pinInnerSource.clear();
    pinInnerSource.addFeatures(features);

    const shouldCluster = cluster !== false;
    if (shouldCluster) {
      if (!clusterSource || clusterSource.getSource() !== pinInnerSource) {
        clusterSource = new api.Cluster({ source: pinInnerSource, distance: CLUSTER_DISTANCE });
      }
      layer.setSource(clusterSource);
      layer.setStyle(buildClusterStyle(scale));
    } else {
      clusterSource = null;
      layer.setSource(pinInnerSource);
      layer.setStyle(buildPinStyle(scale));
    }
    layer.set('map-mode', 'pin');
  }

  function setHighlight(feature: HitFeatureLike | null) {
    if (highlighted === feature) {
      return;
    }
    highlighted = feature;
    dataLayer?.changed();
  }

  function setTheme(next: MapThemeColors) {
    theme = next;
    dataLayer?.changed();
  }

  function getHitFeatureAtPixel(pixel: number[] | Uint8Array): HitFeatureLike | undefined {
    let hit: HitFeatureLike | undefined;
    map.forEachFeatureAtPixel(pixel as never, (feature: unknown) => {
      hit = feature as HitFeatureLike;
      return true;
    });
    return hit;
  }

  function dispose() {
    removeDataLayer();
    if (basemapLayer) {
      map.removeLayer(basemapLayer);
      basemapLayer = null;
    }
    highlighted = null;
  }

  return {
    setBasemap,
    setRegionLayer,
    setPinLayer,
    setHighlight,
    setTheme,
    getHitFeatureAtPixel,
    dispose,
  };
}

export type { GeoJsonFeature };
