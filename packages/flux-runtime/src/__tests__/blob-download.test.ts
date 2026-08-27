import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  downloadBlob,
  extractFilenameFromContentDisposition,
  normalizeBlobResponse,
  resolveDownloadFilename,
} from '../async-data/blob-download.js';

describe('extractFilenameFromContentDisposition', () => {
  it('extracts from plain filename="..." form', () => {
    expect(extractFilenameFromContentDisposition('attachment; filename="report.xlsx"')).toBe(
      'report.xlsx',
    );
  });

  it('extracts from RFC 5987 filename*=UTF-8 form with pct-encoding', () => {
    expect(
      extractFilenameFromContentDisposition(
        "attachment; filename*=UTF-8''%E6%8A%A5%E5%91%8A.xlsx",
      ),
    ).toBe('报告.xlsx');
  });

  it('prefers RFC 5987 form when both present', () => {
    const header = 'attachment; filename="fallback.xlsx"; filename*=UTF-8\'\'real.xlsx';
    expect(extractFilenameFromContentDisposition(header)).toBe('real.xlsx');
  });

  it('returns undefined when header is missing', () => {
    expect(extractFilenameFromContentDisposition(undefined)).toBeUndefined();
    expect(extractFilenameFromContentDisposition('')).toBeUndefined();
  });
});

describe('resolveDownloadFilename', () => {
  it('downloadFileName takes precedence over content-disposition', () => {
    expect(
      resolveDownloadFilename(
        { downloadFileName: 'custom.csv' },
        'attachment; filename="server.csv"',
      ),
    ).toBe('custom.csv');
  });

  it('falls back to content-disposition when downloadFileName absent', () => {
    expect(resolveDownloadFilename({}, 'attachment; filename="server.csv"')).toBe('server.csv');
  });

  it('returns undefined when neither is present', () => {
    expect(resolveDownloadFilename({}, undefined)).toBeUndefined();
  });
});

describe('downloadBlob', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates an object URL, clicks an anchor, and schedules revoke', () => {
    const revokeSpy = vi.fn();
    const createUrlSpy = vi.fn().mockReturnValue('blob:test-url');
    vi.stubGlobal('URL', { createObjectURL: createUrlSpy, revokeObjectURL: revokeSpy });

    const fakeAnchor = {
      href: '',
      download: '',
      rel: '',
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;

    const fakeBody = {
      appendChild: vi.fn().mockImplementation((node) => node),
      removeChild: vi.fn(),
    } as unknown as HTMLElement;

    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(fakeAnchor),
      body: fakeBody,
    });

    const blob = { type: 'text/plain' } as Blob;
    downloadBlob(blob, 'file.txt');

    expect(createUrlSpy).toHaveBeenCalledWith(blob);
    expect((fakeAnchor as { href: string }).href).toBe('blob:test-url');
    expect((fakeAnchor as { download: string }).download).toBe('file.txt');
    expect((fakeAnchor as { click: () => void }).click).toHaveBeenCalled();
  });
});

describe('normalizeBlobResponse', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('recovers JSON-in-blob error envelope when content-type is application/json', async () => {
    const errorEnvelope = { status: 500, msg: '导出失败', data: null };
    const blob = {
      type: 'application/json',
      text: async () => JSON.stringify(errorEnvelope),
    } as unknown as Blob;
    const result = await normalizeBlobResponse(blob, { url: '/dl' });

    expect(result.status).not.toBe(0);
    expect(result.status).toBe(500);
    expect(result.msg).toBe('导出失败');
  });

  it('downloads the blob and returns a synthetic success when content is binary', async () => {
    const revokeSpy = vi.fn();
    const createUrlSpy = vi.fn().mockReturnValue('blob:bin');
    vi.stubGlobal('URL', { createObjectURL: createUrlSpy, revokeObjectURL: revokeSpy });

    const fakeAnchor = { click: vi.fn() } as unknown as HTMLAnchorElement;
    const fakeBody = {
      appendChild: vi.fn().mockImplementation((node) => node),
      removeChild: vi.fn(),
    } as unknown as HTMLElement;
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(fakeAnchor),
      body: fakeBody,
    });

    const blob = { type: 'application/octet-stream' } as Blob;
    const headers = new Headers({ 'content-disposition': 'attachment; filename="data.bin"' });
    const result = await normalizeBlobResponse(blob, { url: '/dl' }, headers);

    expect(result.status).toBe(0);
    expect(result.status).toBe(0);
    expect((result.data as { msg: string }).msg).toBe('downloading');
    expect((fakeAnchor as { download: string }).download).toBe('data.bin');
  });

  it('uses downloadFileName over content-disposition filename', async () => {
    const revokeSpy = vi.fn();
    const createUrlSpy = vi.fn().mockReturnValue('blob:x');
    vi.stubGlobal('URL', { createObjectURL: createUrlSpy, revokeObjectURL: revokeSpy });

    const fakeAnchor = { click: vi.fn() } as unknown as HTMLAnchorElement;
    const fakeBody = {
      appendChild: vi.fn().mockImplementation((node) => node),
      removeChild: vi.fn(),
    } as unknown as HTMLElement;
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(fakeAnchor),
      body: fakeBody,
    });

    const blob = { type: 'application/octet-stream' } as Blob;
    const headers = new Headers({ 'content-disposition': 'attachment; filename="server.csv"' });
    await normalizeBlobResponse(blob, { downloadFileName: 'override.csv', url: '/dl' }, headers);

    expect((fakeAnchor as { download: string }).download).toBe('override.csv');
  });

  it('returns { ok: false } with diagnostics when JSON-in-blob body fails to parse (no synthetic success, no download)', async () => {
    const createUrlSpy = vi.fn().mockReturnValue('blob:bad');
    vi.stubGlobal('URL', { createObjectURL: createUrlSpy, revokeObjectURL: vi.fn() });
    const clickSpy = vi.fn();
    const fakeAnchor = { click: clickSpy } as unknown as HTMLAnchorElement;
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(fakeAnchor),
      body: { appendChild: vi.fn(), removeChild: vi.fn() } as unknown as HTMLElement,
    });

    const blob = {
      type: 'application/json',
      text: async () => 'not-json{{broken',
    } as unknown as Blob;
    const result = await normalizeBlobResponse(blob, { url: '/dl' });

    expect(result.status).not.toBe(0);
    expect(result.msg).toContain('application/json');
    expect(result.msg).toContain('/dl');
    expect(result.msg).toContain('JSON');
    expect(clickSpy).not.toHaveBeenCalled();
    expect(createUrlSpy).not.toHaveBeenCalled();
  });

  it('returns { ok: false } instead of a synthetic success when no filename can be resolved', async () => {
    const createUrlSpy = vi.fn().mockReturnValue('blob:noname');
    vi.stubGlobal('URL', { createObjectURL: createUrlSpy, revokeObjectURL: vi.fn() });
    const clickSpy = vi.fn();
    const fakeAnchor = { click: clickSpy } as unknown as HTMLAnchorElement;
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue(fakeAnchor),
      body: { appendChild: vi.fn(), removeChild: vi.fn() } as unknown as HTMLElement,
    });

    const blob = { type: 'application/octet-stream' } as Blob;
    const result = await normalizeBlobResponse(blob, { url: '/dl' });

    expect(result.status).not.toBe(0);
    expect(result.msg).toContain('filename');
    expect(clickSpy).not.toHaveBeenCalled();
    expect(createUrlSpy).not.toHaveBeenCalled();
  });
});
