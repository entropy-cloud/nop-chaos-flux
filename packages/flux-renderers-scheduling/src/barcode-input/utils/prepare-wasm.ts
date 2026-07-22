const wasmPromises = new Map<string, Promise<void>>();

const DEFAULT_WASM_URL = 'https://unpkg.com/@zxing/library@0.21.3/umd/zxing_reader.wasm';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function fetchWithRetry(url: string, retries: number): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastErr = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastErr = err;
    }
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`Failed to load ZXing WASM from ${url} after ${retries} retries`);
}

export function prepareWasm(wasmUrl?: string, signal?: AbortSignal): Promise<void> {
  const url = wasmUrl ?? DEFAULT_WASM_URL;
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (!wasmPromises.has(url)) {
    wasmPromises.set(url, (async () => {
      const response = await fetchWithRetry(url, MAX_RETRIES);
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
    wasmPromises.clear();
  }
}
