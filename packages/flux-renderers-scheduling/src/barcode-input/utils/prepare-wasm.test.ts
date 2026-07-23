import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prepareWasm, resetWasmPromise } from './prepare-wasm.js';

describe('prepareWasm', () => {
  beforeEach(() => {
    resetWasmPromise();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a promise', () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
    const result = prepareWasm('https://example.com/test.wasm');
    expect(result).toBeInstanceOf(Promise);
  });

  it('should return the same promise on concurrent calls', () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
    const p1 = prepareWasm('https://example.com/test.wasm');
    const p2 = prepareWasm('https://example.com/test.wasm');
    expect(p1).toBe(p2);
  });

  it('should return different promises for different URLs after reset', () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
    const p1 = prepareWasm('https://example.com/a.wasm');
    resetWasmPromise();
    const p2 = prepareWasm('https://example.com/b.wasm');
    expect(p1).not.toBe(p2);
  });

  it('should reject when fetch fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(prepareWasm('https://example.com/missing.wasm')).rejects.toThrow();
  });

  it('should return different promises for different URLs (per-URL isolation)', () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
    const p1 = prepareWasm('https://example.com/a.wasm');
    const p2 = prepareWasm('https://example.com/b.wasm');
    expect(p1).not.toBe(p2);
  });

  it('should return the same promise for the same URL (caching)', () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
    const p1 = prepareWasm('https://example.com/same.wasm');
    const p2 = prepareWasm('https://example.com/same.wasm');
    expect(p1).toBe(p2);
  });

  it('should NOT be poisoned by abort signal (WASM singleton cache)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });

    const p1 = prepareWasm('https://example.com/retry.wasm', new AbortController().signal);
    const p2 = prepareWasm('https://example.com/retry.wasm');
    expect(p1).toBe(p2);
    await expect(p1).resolves.toBeUndefined();
  });

  it('should throw AbortError when signal is already aborted at entry', () => {
    const abortController = new AbortController();
    abortController.abort();
    expect(() => prepareWasm('https://example.com/aborted.wasm', abortController.signal)).toThrow('Aborted');
  });

  it('should only clear default URL when resetWasmPromise is called without argument', () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });

    const p1 = prepareWasm('https://example.com/a.wasm');
    const p2 = prepareWasm('https://unpkg.com/@zxing/library@0.21.3/umd/zxing_reader.wasm');
    // Both URLs cached
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    resetWasmPromise();
    // After reset without URL: default URL cleared, custom URL still cached
    const p3 = prepareWasm('https://example.com/a.wasm');
    const p4 = prepareWasm('https://unpkg.com/@zxing/library@0.21.3/umd/zxing_reader.wasm');
    // p3 should be the same as p1 (custom URL still cached)
    expect(p3).toBe(p1);
    // p4 should be different from p2 (default URL was cleared)
    expect(p4).not.toBe(p2);
  });
});
