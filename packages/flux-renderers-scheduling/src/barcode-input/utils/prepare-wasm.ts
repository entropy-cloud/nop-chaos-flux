let wasmPromise: Promise<void> | null = null;

const DEFAULT_WASM_URL = 'https://unpkg.com/@zxing/library@0.21.3/umd/zxing_reader.wasm';

export function prepareWasm(wasmUrl?: string): Promise<void> {
  if (!wasmPromise) {
    wasmPromise = (async () => {
      const url = wasmUrl ?? DEFAULT_WASM_URL;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load ZXing WASM from ${url}: ${response.status}`);
      }
      await response.arrayBuffer();
    })();
  }
  return wasmPromise;
}

export function resetWasmPromise(): void {
  wasmPromise = null;
}
