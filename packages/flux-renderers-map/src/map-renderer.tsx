import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RendererComponentProps, RendererEventHandler } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Spinner, cn } from '@nop-chaos/ui';
import type { MapSchema, MapType } from './schemas.js';
import {
  buildFeatureClickPayload,
  buildPinFeatures,
  buildRegionFeatures,
  type GeoJsonFeatureCollection,
} from './map-data.js';
import { buildColorScale, type MapColorScale } from './map-color.js';
import {
  createMapLayerManager,
  type HitFeatureLike,
  type MapThemeColors,
} from './map-layer-manager.js';
import { loadOlApi, type OlApi } from './map-ol-loader.js';
import { useMapGeojson } from './use-map-geojson.js';
import chinaProvinces from './map-data/china-provinces.json';
import worldCountries from './map-data/world-countries.json';

const BUILTIN_GEOJSON: Record<string, GeoJsonFeatureCollection> = {
  'china-provinces': chinaProvinces as GeoJsonFeatureCollection,
  'world-countries': worldCountries as GeoJsonFeatureCollection,
};

const DEFAULT_CENTER: Record<string, number[]> = {
  'china-provinces': [104, 35],
  'world-countries': [0, 20],
  pin: [104, 35],
};
const DEFAULT_ZOOM: Record<string, number> = {
  'china-provinces': 4,
  'world-countries': 2,
  pin: 4,
};

/**
 * token 原始值 → 具体色值（ux-r3 RC-3）：本仓主题 token 为裸 HSL 三元组
 * （shadcn 约定，消费形如 `hsl(var(--token))`）。此前的 `var(--token)` 裸探针
 * 对三元组取 computed 色恒退化 `rgb(0,0,0)`（guard 只拦透明色），主题四色
 * 全黑。这里直接读 token 原始值：三元组包装 hsl()，完整色值直通，非法回退。
 */
export function resolveTokenColor(rawTokenValue: string, fallback = '#0969da'): string {
  const raw = rawTokenValue.trim();
  if (raw.length === 0) {
    return fallback;
  }
  if (/^#[0-9a-fA-F]{3,8}$/.test(raw)) {
    return raw;
  }
  if (/^(rgb|rgba|hsl|hsla)\(/i.test(raw)) {
    return raw;
  }
  // 裸 HSL 三元组："217 91% 60%" / "217, 91%, 60%"
  if (/^\d+(?:\.\d+)?[ ,]+\d+(?:\.\d+)?%[ ,]+\d+(?:\.\d+)?%$/.test(raw)) {
    return `hsl(${raw})`;
  }
  return fallback;
}

function resolveThemeColor(cssVariable: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback;
  }
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVariable);
    return resolveTokenColor(raw, fallback);
  } catch {
    return fallback;
  }
}

// 测试/程序化断言锚点：以 schema id 为键（pivot `__flux_pivot_<id>` 先例的 id 化变体）。
function exposeMapInstance(key: string, map: unknown): void {
  if (typeof window === 'undefined' || key.length === 0) {
    return;
  }
  (window as unknown as Record<string, unknown>)[`__flux_map_${key}`] = { map };
}

function clearExposedMapInstance(key: string): void {
  if (typeof window === 'undefined' || key.length === 0) {
    return;
  }
  delete (window as unknown as Record<string, unknown>)[`__flux_map_${key}`];
}

/** 主题映射：CSS 变量 → OL 样式色值（data-theme/data-mode 翻转时重解析并触发重绘）。 */
function resolveMapTheme(): MapThemeColors {
  return {
    border: resolveThemeColor('--border', '#d0d7de'),
    background: resolveThemeColor('--background', '#ffffff'),
    text: resolveThemeColor('--foreground', '#1f2328'),
    accent: resolveThemeColor('--primary', '#0969da'),
  };
}

/**
 * 主题响应：监听 document root 的 data-theme/data-mode 属性翻转 → 重解析 CSS 变量
 * （全仓 dark 触发器为 `[data-mode="dark"]` + `data-theme` 双属性，无 `.dark` 类切换点；
 * resolveMapTheme 读取的四 token 随双属性变化，任一翻转都需重解析）。
 * OL 是 canvas 渲染（样式函数在创建时固化色值），CSS 变量本身不会自动生效，
 * 需要显式重建主题色 + 触发重绘（manager.setTheme → layer.changed）。
 */
function useMapTheme(): MapThemeColors {
  const [theme, setTheme] = useState<MapThemeColors>(() => resolveMapTheme());

  useEffect(() => {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return;
    }
    const observer = new MutationObserver(() => {
      setTheme(resolveMapTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-mode'],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function MapRenderer(props: RendererComponentProps<MapSchema>) {
  const resolved = props.props;
  const mapType: MapType = resolved.mapType === 'region' ? 'region' : 'pin';
  const cluster = resolved.cluster !== false;
  const geojsonName =
    resolved.geojsonName === 'world-countries' ? 'world-countries' : 'china-provinces';
  const height = typeof resolved.height === 'number' ? resolved.height : 400;
  const externalLoading = resolved.loading === true;

  const regionData = useMemo(
    () =>
      Array.isArray(resolved.regionData)
        ? (resolved.regionData as Array<{ name: string; value?: number }>)
        : [],
    [resolved.regionData],
  );
  const pinData = useMemo(
    () =>
      Array.isArray(resolved.pinData)
        ? (resolved.pinData as Array<{ name?: string; lat: number; lng: number; value?: number }>)
        : [],
    [resolved.pinData],
  );

  const [olApi, setOlApi] = useState<OlApi | null>(null);
  const [olError, setOlError] = useState<string | null>(null);
  const theme = useMapTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<InstanceType<OlApi['Map']> | null>(null);
  const managerRef = useRef<ReturnType<typeof createMapLayerManager> | null>(null);
  const fitDoneRef = useRef(false);
  const latestRef = useRef<{
    mapType: MapType;
    onClick: RendererEventHandler | undefined;
    scope: RendererComponentProps<MapSchema>['node']['scope'] | undefined;
    center: number[] | undefined;
    zoom: number | undefined;
    geojsonName: 'china-provinces' | 'world-countries';
    theme: MapThemeColors;
  }>({
    mapType: 'pin',
    onClick: undefined,
    scope: undefined,
    center: undefined,
    zoom: undefined,
    geojsonName: 'china-provinces',
    theme: { border: '#d0d7de', background: '#ffffff', text: '#1f2328', accent: '#0969da' },
  });

  const geojsonAction = useMapGeojson({
    geojsonSource: resolved.geojsonSource,
    helpers: props.helpers,
    scope: props.node.scope,
  });

  const geojson: GeoJsonFeatureCollection | undefined = resolved.geojsonSource
    ? geojsonAction.geojson
    : BUILTIN_GEOJSON[geojsonName];

  const center = useMemo(() => {
    if (Array.isArray(resolved.center) && resolved.center.length === 2) {
      const [lng, lat] = resolved.center;
      if (typeof lng === 'number' && typeof lat === 'number') {
        return [lng, lat];
      }
    }
    return undefined;
  }, [resolved.center]);
  const centerKey = center ? center.join(',') : '';
  const zoom = typeof resolved.zoom === 'number' ? resolved.zoom : undefined;
  const hasExplicitView = Boolean(center || zoom !== undefined);

  // 懒加载 OL 模块（map-ol-import-fail → 错误占位，不白屏）
  useEffect(() => {
    let cancelled = false;
    loadOlApi()
      .then((api) => {
        if (!cancelled) {
          setOlApi(api);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error('[map] failed to load OpenLayers modules', error);
          setOlError(
            error instanceof Error
              ? t('flux.map.mapLoadFailedDetail', { message: error.message })
              : t('flux.map.mapLoadFailed'),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 最新交互镜像（renderer-runtime 契约：事件 handler + scope 经 ref 读最新值）
  useEffect(() => {
    latestRef.current = {
      mapType,
      onClick: props.events.onClick,
      scope: props.node.scope,
      center,
      zoom,
      geojsonName,
      theme,
    };
  }, [mapType, props.events.onClick, props.node.scope, center, zoom, geojsonName, theme]);

  const regionBuild = useMemo(() => {
    if (mapType !== 'region' || !geojson) {
      return null;
    }
    return buildRegionFeatures(regionData, geojson);
  }, [mapType, regionData, geojson]);

  const pinBuild = useMemo(
    () => (mapType === 'pin' ? buildPinFeatures(pinData) : null),
    [mapType, pinData],
  );

  const dataRange = mapType === 'region' ? (regionBuild?.dataRange ?? null) : (pinBuild?.dataRange ?? null);
  const colorScale: MapColorScale = useMemo(
    () => buildColorScale(resolved.visualMap, dataRange),
    [resolved.visualMap, dataRange],
  );

  // 畸形数据 dev warn（一次）
  useEffect(() => {
    if (mapType === 'region' && regionBuild && regionBuild.skipped.length > 0) {
      console.warn(
        `[map] ${regionBuild.skipped.length} region data entr(ies) without matching geojson feature`,
        regionBuild.skipped,
      );
    }
  }, [mapType, regionBuild]);
  useEffect(() => {
    if (mapType === 'pin' && pinBuild && pinBuild.skipped > 0) {
      console.warn(`[map] dropped ${pinBuild.skipped} pin(s) with invalid coordinates`);
    }
  }, [mapType, pinBuild]);

  const geojsonLoading = Boolean(resolved.geojsonSource) && geojsonAction.loading;
  const geojsonError = resolved.geojsonSource ? geojsonAction.error : undefined;

  const regionEmpty =
    mapType === 'region' &&
    (regionData.length === 0 || (regionBuild !== null && regionBuild.featureCollection.features.length === 0));
  const pinEmpty = mapType === 'pin' && (pinData.length === 0 || (pinBuild !== null && pinBuild.features.length === 0));
  const empty = (mapType === 'region' && regionEmpty) || (mapType === 'pin' && pinEmpty);

  const showLoading = externalLoading || geojsonLoading;
  const showError = Boolean(olError) || Boolean(geojsonError);
  const mapVisible = !showLoading && !empty && !showError;

  // 地图实例生命周期（创建/销毁；无 remount 契约——数据更新走 layer manager，
  // center/zoom 变化走视图同步 effect，不重建实例；初始视图经 latestRef 读取）
  useEffect(() => {
    if (!olApi || !mapVisible || !containerRef.current) {
      return;
    }
    const initial = latestRef.current;
    const viewCenter = initial.center ?? DEFAULT_CENTER[initial.mapType === 'pin' ? 'pin' : initial.geojsonName];
    const viewZoom = initial.zoom ?? DEFAULT_ZOOM[initial.mapType === 'pin' ? 'pin' : initial.geojsonName];
    const view = new olApi.View({
      center: olApi.fromLonLat(viewCenter),
      zoom: viewZoom,
    });
    const map = new olApi.Map({ target: containerRef.current, view });
    const manager = createMapLayerManager({ api: olApi, map, theme: latestRef.current.theme });
    mapRef.current = map;
    managerRef.current = manager;
    exposeMapInstance(props.id, map);

    map.on('singleclick', (event: { pixel?: number[] }) => {
      if (!event.pixel) {
        return;
      }
      const hit = manager.getHitFeatureAtPixel(event.pixel);
      if (!hit) {
        return; // map-click-no-feature：空白区域不派发
      }
      const hitProps = hit.getProperties();
      const members = Array.isArray(hitProps.features) ? (hitProps.features as HitFeatureLike[]) : undefined;
      if (members && members.length > 1) {
        // cluster 聚合点击：放大一级，不派发单点事件
        const currentZoom = map.getView().getZoom() ?? DEFAULT_ZOOM.pin;
        map.getView().setZoom(currentZoom + 1);
        return;
      }
      const target = members && members.length === 1 ? members[0] : hit;
      const payload = buildFeatureClickPayload(
        { properties: target.getProperties() },
        latestRef.current.mapType,
      );
      const handler = latestRef.current.onClick;
      if (handler) {
        void handler(payload, {
          event: payload,
          evaluationBindings: payload,
          scope: latestRef.current.scope,
        });
      }
    });

    map.on('pointermove', (event: { pixel?: number[] }) => {
      if (!event.pixel) {
        return;
      }
      manager.setHighlight(manager.getHitFeatureAtPixel(event.pixel) ?? null);
    });

    return () => {
      clearExposedMapInstance(props.id);
      manager.dispose();
      map.setTarget(undefined);
      map.dispose();
      mapRef.current = null;
      managerRef.current = null;
      fitDoneRef.current = false;
    };
  }, [olApi, mapVisible, props.id]);

  // 主题变化 → 更新 manager 主题色 + 触发重绘（canvas 无 CSS 变量自动生效）
  useEffect(() => {
    managerRef.current?.setTheme(theme);
  }, [theme]);
  // 视图更新：显式 center/zoom 变化 → 同步 view（无 remount）
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !olApi) {
      return;
    }
    if (center && centerKey.length > 0) {
      map.getView().setCenter(olApi.fromLonLat(center));
    }
    if (zoom !== undefined) {
      map.getView().setZoom(zoom);
    }
  }, [olApi, centerKey, zoom, center]);

  // 图层装配/更新（数据变化 → 对应层/样式更新，无 remount，DD2 契约；
  // olApi 到达时 manager 就绪，需重跑装配）
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || !mapVisible) {
      return;
    }
    manager.setBasemap(resolved.basemap);
    if (mapType === 'region') {
      const build = regionBuild;
      const fitView = !hasExplicitView && !fitDoneRef.current;
      if (fitView) {
        fitDoneRef.current = true;
      }
      manager.setRegionLayer(build, colorScale, { fitView });
    } else {
      manager.setPinLayer(pinBuild, cluster, colorScale);
    }
  }, [olApi, mapVisible, mapType, regionBuild, pinBuild, cluster, colorScale, resolved.basemap, hasExplicitView]);

  const emptyContent = resolveRendererSlotContent(props, 'empty', {
    fallback: t('flux.common.noData'),
  });
  const retryAvailable = Boolean(resolved.geojsonSource);
  // [G5-视角9-01] accessible name for the interactive viewport.
  const viewportLabel = String(
    resolved.label || resolved.title || props.id || t('flux.map.viewport'),
  );

  return (
    <div
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="map"
      data-state={showLoading ? 'loading' : showError ? 'error' : empty ? 'empty' : undefined}
      data-map-type={mapType}
      className={cn('nop-map', props.meta.className)}
      style={{ height }}
    >
      {mapVisible ? (
        // [G5-视角9-01] the viewport hosts pan/zoom/click interactions injected
        // by OL — role="application" + an accessible name (schema label/title →
        // renderer id → generic key) instead of an anonymous div.
        <div
          ref={containerRef}
          data-slot="map-viewport"
          className="h-full w-full"
          role="application"
          aria-label={viewportLabel}
        />
      ) : null}
      {showLoading ? (
        <div role="status" aria-live="polite" data-slot="map-loading">
          <Spinner className="size-4" aria-hidden="true" />
          <span>{t('flux.common.loading')}</span>
        </div>
      ) : null}
      {empty ? (
        <div data-slot="map-empty">
          {emptyContent}
        </div>
      ) : null}
      {showError ? (
        <div data-slot="map-error">
          <span>{olError ?? geojsonError}</span>
          {retryAvailable ? (
            <Button variant="outline" size="sm" onClick={() => geojsonAction.reload()}>
              {t('flux.common.retry')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
