import type {
  ChartBandSchema,
  ChartMarkersSchema,
  ChartReferenceLineSchema,
  ChartSeriesSchema,
  ChartType,
} from './chart-schemas.js';

export function isChartType(value: unknown): value is ChartType {
  return (
    value === 'bar' ||
    value === 'line' ||
    value === 'pie' ||
    value === 'scatter' ||
    value === 'area' ||
    value === 'heatmap'
  );
}

function isChartDatum(value: unknown): value is number | { name?: string; value: number } {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return true;
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { name?: unknown; value?: unknown };
  return (
    typeof candidate.value === 'number' &&
    Number.isFinite(candidate.value) &&
    (candidate.name === undefined || typeof candidate.name === 'string')
  );
}

export function sanitizeSeries(value: unknown): ChartSeriesSchema[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const candidate = entry as Record<string, unknown>;
    return [
      {
        name: typeof candidate.name === 'string' ? candidate.name : undefined,
        type: isChartType(candidate.type) ? candidate.type : undefined,
        data: Array.isArray(candidate.data) ? candidate.data.filter(isChartDatum) : undefined,
        dataRegionKey: typeof candidate.dataRegionKey === 'string' ? candidate.dataRegionKey : undefined,
        yAxisId:
          typeof candidate.yAxisId === 'number' && Number.isInteger(candidate.yAxisId) && candidate.yAxisId >= 0
            ? candidate.yAxisId
            : undefined,
        colors:
          Array.isArray(candidate.colors) && candidate.colors.every((c) => typeof c === 'string')
            ? (candidate.colors as string[])
            : undefined,
        colorRegionKey:
          typeof candidate.colorRegionKey === 'string' ? candidate.colorRegionKey : undefined,
      },
    ];
  });
}

export function sanitizeReferenceLines(value: unknown): ChartReferenceLineSchema[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const lines: ChartReferenceLineSchema[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const candidate = entry as Record<string, unknown>;
    const line: ChartReferenceLineSchema = {};
    if (typeof candidate.value === 'number' && Number.isFinite(candidate.value)) {
      line.value = candidate.value;
    }
    if (typeof candidate.label === 'string') {
      line.label = candidate.label;
    }
    if (typeof candidate.color === 'string') {
      line.color = candidate.color;
    }
    if (typeof candidate.dashed === 'boolean') {
      line.dashed = candidate.dashed;
    }
    if (line.value !== undefined) {
      lines.push(line);
    }
  }
  return lines;
}

export function sanitizeBand(value: unknown): ChartBandSchema | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const band: ChartBandSchema = {};
  if (typeof candidate.upper === 'number' && Number.isFinite(candidate.upper)) {
    band.upper = candidate.upper;
  }
  if (typeof candidate.lower === 'number' && Number.isFinite(candidate.lower)) {
    band.lower = candidate.lower;
  }
  if (typeof candidate.color === 'string') {
    band.color = candidate.color;
  }
  if (typeof candidate.opacity === 'number' && Number.isFinite(candidate.opacity)) {
    band.opacity = candidate.opacity;
  }
  if (band.upper === undefined || band.lower === undefined) {
    return undefined;
  }
  return band;
}

export function sanitizeMarkers(value: unknown): ChartMarkersSchema | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const markers: ChartMarkersSchema = {};
  if (typeof candidate.dataKey === 'string') {
    markers.dataKey = candidate.dataKey;
  }
  if (Array.isArray(candidate.indices)) {
    const indices = candidate.indices.filter(
      (item): item is number =>
        typeof item === 'number' && Number.isInteger(item) && item >= 0,
    );
    if (indices.length > 0) {
      markers.indices = indices;
    }
  }
  if (typeof candidate.color === 'string') {
    markers.color = candidate.color;
  }
  if (markers.dataKey === undefined && markers.indices === undefined) {
    return undefined;
  }
  return markers;
}
