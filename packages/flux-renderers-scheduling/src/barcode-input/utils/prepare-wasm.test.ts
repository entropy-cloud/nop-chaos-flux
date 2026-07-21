import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prepareWasm, resetWasmPromise } from './prepare-wasm.js';

describe('prepareWasm', () => {
  beforeEach(() => {
    resetWasmPromise();
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
});
