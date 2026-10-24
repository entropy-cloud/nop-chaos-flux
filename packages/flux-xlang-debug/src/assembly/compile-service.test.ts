import { describe, expect, it, vi } from 'vitest';
import { createCompileService } from './compile-service.js';

// P1-MA4.4-010 regression guard: the env.fetcher -> XlangCompileService
// envelope mapping (ApiResponse: status===0 -> data.diagnostics passthrough
// or empty set; non-zero statuses (401/403/500...) -> a single error
// diagnostic, never a throw). Zero tests referenced createCompileService
// before this file (audit Round H / H-01 + Round J / J-05).

function makeAdapter(
  respond: () => Promise<{ status: number; data?: unknown }>,
  overrides: Partial<{ endpoint: string; headers: Record<string, string> }> = {},
) {
  const fetcher = vi.fn(respond);
  const adapter = { fetcher, ...overrides };
  return { fetcher, service: createCompileService(adapter as never) };
}

describe('createCompileService envelope mapping (P1-MA4.4-010)', () => {
  it('status 0 passes server diagnostics through verbatim', async () => {
    const diagnostics = [
      { line: 3, severity: 'error', message: 'unknown identifier', errorCode: 'X001' },
    ];
    const { service } = makeAdapter(() => Promise.resolve({ status: 0, data: { diagnostics } }));

    await expect(service('/flows/main.x', 'export const a = 1;')).resolves.toEqual(diagnostics);
  });

  it('status 0 with null data yields an empty diagnostic set (linter fallback)', async () => {
    const { service } = makeAdapter(() => Promise.resolve({ status: 0, data: null }));

    await expect(service('/flows/main.x', 'src')).resolves.toEqual([]);
  });

  it.each([401, 403, 500])('status %i maps to a single error diagnostic naming the status', async (status) => {
    const { service } = makeAdapter(() => Promise.resolve({ status, data: null }));

    const diagnostics = await service('/flows/main.x', 'src');

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      line: 1,
      severity: 'error',
      message: expect.stringContaining(`status ${status}`),
    });
  });

  it('requests the default compile endpoint with the POST payload shape and header passthrough', async () => {
    const { fetcher, service } = makeAdapter(() => Promise.resolve({ status: 0, data: null }), {
      headers: { Authorization: 'Bearer t' },
    });

    await service('/flows/main.x', 'SRC');

    expect(fetcher).toHaveBeenCalledTimes(1);
    const request = (fetcher.mock.calls as unknown as Array<[
      { url: string; method: string; headers: Record<string, string>; data: { sourcePath: string; source: string } },
    ]>)[0][0];
    expect(request.url).toBe('/r/nop-xlang-debug/compile');
    expect(request.method).toBe('POST');
    expect(request.headers).toEqual({ Authorization: 'Bearer t' });
    expect(request.data).toEqual({ sourcePath: '/flows/main.x', source: 'SRC' });
  });

  it('a custom endpoint overrides the default', async () => {
    const { fetcher, service } = makeAdapter(() => Promise.resolve({ status: 0, data: null }), {
      endpoint: '/custom/compile',
    });

    await service('/flows/main.x', 'SRC');

    const customRequest = (fetcher.mock.calls as unknown as Array<[{ url: string }]>)[0][0];
    expect(customRequest.url).toBe('/custom/compile');
  });
});
