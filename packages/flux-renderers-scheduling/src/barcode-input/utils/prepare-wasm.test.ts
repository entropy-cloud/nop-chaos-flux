import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prepareWasm, resetWasmPromise } from './prepare-wasm-utils.js';
import type { WasmFetcher, WasmFetchResponse } from './prepare-wasm-utils.js';

const WASM_URL = 'https://example.com/test.wasm';

function makeFetcher(overrides?: (url: string) => Partial<WasmFetchResponse>): {
  fetcher: WasmFetcher;
  calls: string[];
} {
  const calls: string[] = [];
  const fetcher: WasmFetcher = async (url) => {
    calls.push(url);
    const ov = overrides?.(url) ?? {};
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(0),
      ...ov,
    };
  };
  return { fetcher, calls };
}

describe('prepareWasm', () => {
  beforeEach(() => {
    resetWasmPromise();
    resetWasmPromise(WASM_URL);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a promise', () => {
    const { fetcher } = makeFetcher();
    const result = prepareWasm(WASM_URL, undefined, fetcher);
    expect(result).toBeInstanceOf(Promise);
  });

  it('should use the injected fetcher and never call the browser fetch API (INV-1)', async () => {
    const globalFetch = vi.fn().mockRejectedValue(new Error('global fetch must not be called'));
    vi.stubGlobal('fetch', globalFetch);
    const { fetcher, calls } = makeFetcher();

    await expect(prepareWasm(WASM_URL, undefined, fetcher)).resolves.toBeUndefined();
    expect(calls).toEqual([WASM_URL]);
    expect(globalFetch).not.toHaveBeenCalled();
  });

  it('should throw when no wasmUrl is provided (fail-closed, no bundled default endpoint)', () => {
    const { fetcher } = makeFetcher();
    expect(() => prepareWasm(undefined, undefined, fetcher)).toThrow(/explicit wasmUrl/);
  });

  it('should throw when no fetcher is injected (RendererEnv IO boundary)', () => {
    expect(() => prepareWasm(WASM_URL)).toThrow(/injected WasmFetcher/);
  });

  it('should return the same promise on concurrent calls', async () => {
    const { fetcher, calls } = makeFetcher();
    const p1 = prepareWasm(WASM_URL, undefined, fetcher);
    const p2 = prepareWasm(WASM_URL, undefined, fetcher);
    expect(p1).toBe(p2);
    await expect(p1).resolves.toBeUndefined();
    expect(calls).toEqual([WASM_URL]);
  });

  it('should return different promises for different URLs after reset', () => {
    const { fetcher } = makeFetcher();
    const p1 = prepareWasm('https://example.com/a.wasm', undefined, fetcher);
    resetWasmPromise();
    const p2 = prepareWasm('https://example.com/b.wasm', undefined, fetcher);
    expect(p1).not.toBe(p2);
  });

  it('should reject when the fetcher returns a non-ok response', async () => {
    const { fetcher } = makeFetcher(() => ({ ok: false, status: 404 }));
    await expect(prepareWasm('https://example.com/missing.wasm', undefined, fetcher)).rejects.toThrow();
  });

  it('should retry then reject when the fetcher keeps failing', async () => {
    let attempts = 0;
    const fetcher: WasmFetcher = async () => {
      attempts += 1;
      return { ok: false, status: 503, arrayBuffer: async () => new ArrayBuffer(0) };
    };
    await expect(prepareWasm('https://example.com/retry.wasm', undefined, fetcher)).rejects.toThrow();
    expect(attempts).toBeGreaterThan(1);
  });

  it('should NOT be poisoned by abort signal (WASM singleton cache)', async () => {
    const { fetcher } = makeFetcher();

    const p1 = prepareWasm('https://example.com/retry.wasm', new AbortController().signal, fetcher);
    const p2 = prepareWasm('https://example.com/retry.wasm', undefined, fetcher);
    expect(p1).toBe(p2);
    await expect(p1).resolves.toBeUndefined();
  });

  it('should throw AbortError when signal is already aborted at entry', () => {
    const abortController = new AbortController();
    abortController.abort();
    const { fetcher } = makeFetcher();
    expect(() => prepareWasm(WASM_URL, abortController.signal, fetcher)).toThrow('Aborted');
  });

  it('should clear all cached entries when resetWasmPromise is called without argument', async () => {
    const { fetcher } = makeFetcher();

    const p1 = prepareWasm('https://example.com/a.wasm', undefined, fetcher);
    const p2 = prepareWasm(WASM_URL, undefined, fetcher);
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    resetWasmPromise();
    const p3 = prepareWasm('https://example.com/a.wasm', undefined, fetcher);
    const p4 = prepareWasm(WASM_URL, undefined, fetcher);
    expect(p3).not.toBe(p1);
    expect(p4).not.toBe(p2);
  });
});
