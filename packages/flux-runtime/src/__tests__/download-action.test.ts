import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiRequestExecutor } from '../async-data/request-runtime.js';
import { executeRuntimeDownloadAction } from '../runtime-action-helpers.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function createExecutor() {
  const click = vi.fn();
  const createObjectURL = vi.fn(() => 'blob:mock');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { ...globalThis.URL, createObjectURL, revokeObjectURL });
  const anchor = { href: '', download: '', rel: '', click };
  vi.stubGlobal('document', {
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    },
    createElement: vi.fn(() => anchor),
  });
  return { anchor, click, createObjectURL };
}

const noopScope = { id: 'test-scope' } as never;

describe('executeRuntimeDownloadAction', () => {
  it('form 3: endpoint envelope carries url + filename → saves the decoded data URL', async () => {
    const { anchor, click, createObjectURL } = createExecutor();
    const csv = 'a,b\n1,2';
    const dataUrl = `data:text/csv;base64,${btoa(csv)}`;
    const executeApiRequest = vi.fn(async () => ({
      status: 0,
      data: { url: dataUrl, filename: 'users-1.csv', count: 1 },
    })) as unknown as ApiRequestExecutor;

    const result = await executeRuntimeDownloadAction(
      { url: '/r/User__export' },
      { executeApiRequest, scope: noopScope, signal: undefined, notifyError: () => {} },
    );

    expect(result).toEqual({ ok: true });
    expect(executeApiRequest).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(anchor.download).toBe('users-1.csv');
    expect(anchor.href).toBe('blob:mock');
  });

  it('form 2: data: URL with explicit filename saves directly', async () => {
    const { anchor } = createExecutor();
    const executeApiRequest = vi.fn() as unknown as ApiRequestExecutor;

    const result = await executeRuntimeDownloadAction(
      { url: 'data:text/plain;base64,aGVsbG8=', filename: 'hello.txt' },
      { executeApiRequest, scope: noopScope, signal: undefined, notifyError: () => {} },
    );

    expect(result).toEqual({ ok: true });
    expect(executeApiRequest).not.toHaveBeenCalled();
    expect(anchor.download).toBe('hello.txt');
  });

  it('non-success envelope notifies the download error and fails the action', async () => {
    const createObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...globalThis.URL, createObjectURL, revokeObjectURL: vi.fn() });
    const notifyError = vi.fn();
    const executeApiRequest = vi.fn(async () => ({
      status: 500,
      data: null,
    })) as unknown as ApiRequestExecutor;

    const result = await executeRuntimeDownloadAction(
      { url: '/r/User__export' },
      { executeApiRequest, scope: noopScope, signal: undefined, notifyError },
    );

    expect(result.ok).toBe(false);
    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('empty args fail without notifying a download error', async () => {
    const notifyError = vi.fn();
    const executeApiRequest = vi.fn() as unknown as ApiRequestExecutor;

    const result = await executeRuntimeDownloadAction(
      {},
      { executeApiRequest, scope: noopScope, signal: undefined, notifyError },
    );

    expect(result.ok).toBe(false);
    expect(executeApiRequest).not.toHaveBeenCalled();
  });
});
