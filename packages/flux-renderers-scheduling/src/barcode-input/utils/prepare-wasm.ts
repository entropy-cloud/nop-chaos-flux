let wasmPromise: Promise<void> | null = null;

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

export function prepareWasm(wasmUrl?: string): Promise<void> {
  if (!wasmPromise) {
    wasmPromise = (async () => {
      const url = wasmUrl ?? DEFAULT_WASM_URL;
      const response = await fetchWithRetry(url, MAX_RETRIES);
      await response.arrayBuffer();
    })();
  }
  return wasmPromise;
}

export function resetWasmPromise(): void {
  wasmPromise = null;
}
