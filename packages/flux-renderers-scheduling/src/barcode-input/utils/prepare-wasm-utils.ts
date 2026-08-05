const wasmPromises = new Map<string, Promise<void>>();

const DEFAULT_WASM_URL = 'https://unpkg.com/@zxing/library@0.21.3/umd/zxing_reader.wasm';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface WasmFetchResponse {
  ok: boolean;
  status: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * INV-1 (renderer-env.md): the renderer must never call the browser fetch API
 * directly. The caller (barcode-input) injects a fetcher backed by
 * `RendererEnv.fetcher` so WASM loading goes through the host IO boundary.
 */
export type WasmFetcher = (url: string, signal?: AbortSignal) => Promise<WasmFetchResponse>;

async function fetchWithRetry(
  url: string,
  retries: number,
  fetcher: WasmFetcher,
  signal?: AbortSignal,
): Promise<WasmFetchResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetcher(url, signal);
      if (response.ok) return response;
      lastErr = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastErr = err;
      if (signal?.aborted) break;
    }
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`Failed to load ZXing WASM from ${url} after ${retries} retries`);
}

export function prepareWasm(wasmUrl?: string, signal?: AbortSignal, fetcher?: WasmFetcher): Promise<void> {
  const url = wasmUrl ?? DEFAULT_WASM_URL;
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (!fetcher) {
    throw new Error('prepareWasm requires an injected WasmFetcher (RendererEnv IO boundary)');
  }
  if (!wasmPromises.has(url)) {
    wasmPromises.set(url, (async () => {
      const response = await fetchWithRetry(url, MAX_RETRIES, fetcher, signal);
      await response.arrayBuffer();
    })().catch((err) => {
      wasmPromises.delete(url);
      throw err;
    }));
  }
  return wasmPromises.get(url)!;
}

export function resetWasmPromise(url?: string): void {
  if (url) {
    wasmPromises.delete(url);
  } else {
    wasmPromises.delete(DEFAULT_WASM_URL);
  }
}
