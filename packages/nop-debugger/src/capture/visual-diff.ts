import { CaptureError } from './screenshot.js';

interface VisualDiffRegion {
  cid?: string;
  diffRatio: number;
  bbox: { x: number; y: number; width: number; height: number };
}

interface VisualDiffResult {
  match: boolean;
  diffRatio: number;
  missing?: true;
  regions?: VisualDiffRegion[];
}

interface YiqDiffOptions {
  /** YIQ delta above which a pixel counts as different (pixelmatch default 0.1). */
  threshold?: number;
  /** Ignore regions in image coordinates (from xui:visual-ignore / cid aggregation inputs). */
  ignoreRects?: Array<{ x: number; y: number; width: number; height: number }>;
}

export interface IgnoreRegionInput {
  cid?: string;
  rect?: { x: number; y: number; width: number; height: number };
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  reason?: string;
}

export function yiqPixelDiffWithSize(
  a: Uint8ClampedArray,
  b: Uint8ClampedArray,
  width: number,
  height: number,
  options: YiqDiffOptions = {},
): { diffRatio: number; diffMask: Uint8Array } {
  const threshold = options.threshold ?? 0.1;
  if (a.length !== b.length) {
    throw new CaptureError('size-mismatch', `image buffers differ: ${a.length} vs ${b.length}`);
  }
  const pixelCount = width * height;
  const diffMask = new Uint8Array(pixelCount);
  const ignoreRects = options.ignoreRects ?? [];
  let diffPixels = 0;
  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const r = a[offset] - b[offset];
    const g = a[offset + 1] - b[offset + 1];
    const bl = a[offset + 2] - b[offset + 2];
    const y = 0.29889531 * r + 0.58661147 * g + 0.11448223 * bl;
    const diff = ((0.80485 * y + 0.19615 * (0.5 * (r + g) - bl)) / 255) * 100;
    const x = i % width;
    const yCoord = Math.floor(i / width);
    const ignored = ignoreRects.some(
      (rect) => x >= rect.x && x < rect.x + rect.width && yCoord >= rect.y && yCoord < rect.y + rect.height,
    );
    if (!ignored && Math.abs(diff) > threshold) {
      diffMask[i] = 1;
      diffPixels += 1;
    }
  }
  return { diffRatio: pixelCount === 0 ? 0 : diffPixels / pixelCount, diffMask };
}

interface VisualBaselineEntry {
  key: string;
  bytes: Uint8ClampedArray;
  width: number;
  height: number;
  ignoreRegions: IgnoreRegionInput[];
}

interface VisualDiffEngine {
  putBaseline(entry: VisualBaselineEntry): void;
  getBaseline(key: string): VisualBaselineEntry | undefined;
  compare(current: { bytes: Uint8ClampedArray; width: number; height: number }, baselineKey: string, opts?: { cidRects?: Array<{ cid?: string; rect: { x: number; y: number; width: number; height: number } }>; ignoreRegions?: IgnoreRegionInput[] }): VisualDiffResult;
}

export function createVisualDiffEngine(): VisualDiffEngine {
  const baselines = new Map<string, VisualBaselineEntry>();
  return {
    putBaseline(entry) {
      baselines.set(entry.key, entry);
    },
    getBaseline(key) {
      return baselines.get(key);
    },
    compare(current, baselineKey, opts = {}) {
      const baseline = baselines.get(baselineKey);
      if (!baseline) return { match: false, diffRatio: 0, missing: true };
      if (baseline.width !== current.width || baseline.height !== current.height) {
        throw new CaptureError('size-mismatch', `baseline ${baseline.width}x${baseline.height} vs current ${current.width}x${current.height}`);
      }
      const ignoreRects = [
        ...(opts.ignoreRegions ?? []),
        ...baseline.ignoreRegions,
      ].flatMap((region) => {
        if (region.rect) return [region.rect];
        if (region.x !== undefined && region.y !== undefined) {
          return [{ x: region.x, y: region.y, width: region.width ?? 0, height: region.height ?? 0 }];
        }
        const cidEntry = opts.cidRects?.find((candidate) => candidate.cid === region.cid);
        return cidEntry ? [cidEntry.rect] : [];
      });
      const { diffRatio, diffMask } = yiqPixelDiffWithSize(
        current.bytes,
        baseline.bytes,
        current.width,
        current.height,
        { ignoreRects },
      );
      const regions: VisualDiffRegion[] = [];
      if (opts.cidRects) {
        for (const entry of opts.cidRects) {
          let diffPixels = 0;
          const total = entry.rect.width * entry.rect.height;
          for (let dy = 0; dy < entry.rect.height; dy++) {
            for (let dx = 0; dx < entry.rect.width; dx++) {
              const x = entry.rect.x + dx;
              const y = entry.rect.y + dy;
              if (x >= current.width || y >= current.height) continue;
              if (diffMask[y * current.width + x]) diffPixels += 1;
            }
          }
          regions.push({ cid: entry.cid, diffRatio: total === 0 ? 0 : diffPixels / total, bbox: entry.rect });
        }
      }
      return { match: diffRatio <= 0, diffRatio, regions: regions.length > 0 ? regions : undefined };
    },
  };
}

