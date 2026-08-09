import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActionSchema, RendererHelpers, ScopeRef } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  sanitizeGeojsonActionResult,
  type GeoJsonFeatureCollection,
} from './map-data.js';

export interface MapGeojsonState {
  loading: boolean;
  error: string | undefined;
  geojson: GeoJsonFeatureCollection | undefined;
}

const MAX_CACHE_ENTRIES = 8;

/**
 * `geojsonSource` action 加载 hook（对齐 `use-table-lazy-children.ts` 模式）：
 * - `helpers.dispatch(actionInput, { scope })` 经 RendererEnv 执行（无自定义 IO）；
 * - 结果经 `sanitizeGeojsonActionResult` 校验，非法 → error 态；
 * - 成功结果按 action 序列化 + scope id 缓存复用（同 key 不重复派发）；
 * - in-flight 去重 + 卸载守卫。
 */
export function useMapGeojson(input: {
  geojsonSource?: ActionSchema;
  helpers: RendererHelpers;
  scope?: ScopeRef;
}): MapGeojsonState & { reload: () => void } {
  const { geojsonSource, helpers, scope } = input;
  const [state, setState] = useState<{
    loading: boolean;
    error: string | undefined;
    geojson: GeoJsonFeatureCollection | undefined;
  }>({ loading: false, error: undefined, geojson: undefined });

  const cacheRef = useRef<Map<string, GeoJsonFeatureCollection>>(new Map());
  const cacheOrderRef = useRef<string[]>([]);
  const inFlightRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  const [reloadToken, setReloadToken] = useState(0);

  const cacheKey = useMemo(() => {
    if (!geojsonSource) {
      return undefined;
    }
    let serialized: string;
    try {
      serialized = JSON.stringify(geojsonSource);
    } catch {
      serialized = String(geojsonSource);
    }
    return `${scope?.id ?? ''}:${serialized}`;
  }, [geojsonSource, scope]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const dispatchGeojson = useCallback(() => {
    if (!geojsonSource || !cacheKey) {
      return;
    }
    if (inFlightRef.current.has(cacheKey)) {
      return;
    }
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setState({ loading: false, error: undefined, geojson: cached });
      return;
    }

    inFlightRef.current.add(cacheKey);
    setState((prev) => ({ ...prev, loading: true, error: undefined }));

    void helpers
      .dispatch(geojsonSource, { scope })
      .then((result) => {
        if (!mountedRef.current) {
          return;
        }
        if (result.ok) {
          const sanitized = sanitizeGeojsonActionResult(result.data);
          if (sanitized.ok) {
            cacheRef.current.set(cacheKey, sanitized.geojson);
            cacheOrderRef.current.push(cacheKey);
            while (cacheOrderRef.current.length > MAX_CACHE_ENTRIES) {
              const oldest = cacheOrderRef.current.shift();
              if (oldest) {
                cacheRef.current.delete(oldest);
              }
            }
            setState({ loading: false, error: undefined, geojson: sanitized.geojson });
          } else {
            setState({
              loading: false,
              error: t('flux.map.geojsonInvalid'),
              geojson: undefined,
            });
          }
        } else {
          const errorMsg =
            typeof result.error === 'string' && result.error
              ? result.error
              : result.error instanceof Error
                ? result.error.message
                : t('flux.map.loadRegionDataFailed');
          setState({ loading: false, error: errorMsg, geojson: undefined });
        }
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) {
          return;
        }
        setState({
          loading: false,
          error: err instanceof Error ? err.message : t('flux.map.loadRegionDataFailed'),
          geojson: undefined,
        });
      })
      .finally(() => {
        inFlightRef.current.delete(cacheKey);
      });
  }, [cacheKey, geojsonSource, helpers, scope]);

  useEffect(() => {
    dispatchGeojson();
  }, [dispatchGeojson, reloadToken]);

  const reload = useCallback(() => {
    if (!cacheKey) {
      return;
    }
    cacheRef.current.delete(cacheKey);
    setReloadToken((token) => token + 1);
  }, [cacheKey]);

  return { ...state, reload };
}
