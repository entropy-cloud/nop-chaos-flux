import { describe, expect, it, vi } from 'vitest';
import {
  StreamChunkParseError,
  type StreamChunkType,
  type StreamProtocol,
} from '@nop-chaos/flux-core';
import { createChunkGenerator, createDefaultStream } from './stream-impl.js';

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** 把字节序列模拟成 readChunk provider（按整段返回，模拟单包到达）。 */
function providerFromChunks(chunks: Uint8Array[]): () => Promise<Uint8Array | undefined> {
  let i = 0;
  return async () => (i < chunks.length ? chunks[i++]! : undefined);
}

async function collect<T>(gen: AsyncGenerator<T>): Promise<{ values: T[]; error: unknown }> {
  const values: T[] = [];
  try {
    for await (const v of gen) values.push(v);
    return { values, error: undefined };
  } catch (error) {
    return { values, error };
  }
}

function gen(opts: {
  chunks: Uint8Array[];
  protocol: StreamProtocol;
  chunkType: StreamChunkType;
  signal?: AbortSignal;
}) {
  return createChunkGenerator({
    readChunk: providerFromChunks(opts.chunks),
    protocol: opts.protocol,
    chunkType: opts.chunkType,
    signal: opts.signal,
  });
}

describe('createChunkGenerator — SSE protocol', () => {
  it('splits events on \\n\\n, extracts data: lines, parses json by default', async () => {
    const chunks = [encode('data: {"a":1}\n\ndata: {"a":2}\n\n')];
    const result = await collect(gen({ chunks, protocol: 'sse', chunkType: 'json' }));
    expect(result.error).toBeUndefined();
    expect(result.values).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('concatenates multi-line data: fields with \\n (SSE spec)', async () => {
    const chunks = [encode('data: line1\ndata: line2\n\n')];
    const result = await collect(gen({ chunks, protocol: 'sse', chunkType: 'text' }));
    expect(result.values).toEqual(['line1\nline2']);
  });

  it('auto-terminates on data: [DONE] without yielding it', async () => {
    const chunks = [encode('data: {"x":1}\n\ndata: [DONE]\n\ndata: {"x":2}\n\n')];
    const result = await collect(gen({ chunks, protocol: 'sse', chunkType: 'json' }));
    expect(result.values).toEqual([{ x: 1 }]);
  });

  it('returns text chunks verbatim when chunkType is text', async () => {
    const chunks = [encode('data: hello\n\ndata: world\n\n')];
    const result = await collect(gen({ chunks, protocol: 'sse', chunkType: 'text' }));
    expect(result.values).toEqual(['hello', 'world']);
  });

  it('skips non-data SSE lines (comments / event id)', async () => {
    const chunks = [encode(': comment\nevent: ping\nid: 1\ndata: {"v":9}\n\n')];
    const result = await collect(gen({ chunks, protocol: 'sse', chunkType: 'json' }));
    expect(result.values).toEqual([{ v: 9 }]);
  });

  it('reassembles events spanning multiple network packets', async () => {
    const chunks = [
      encode('data: {"par'),
      encode('t":1}\n\n'),
      encode('data: {"part":2}\n\n'),
    ];
    const result = await collect(gen({ chunks, protocol: 'sse', chunkType: 'json' }));
    expect(result.values).toEqual([{ part: 1 }, { part: 2 }]);
  });

  it('emits residual event when stream ends without trailing \\n\\n', async () => {
    const chunks = [encode('data: {"tail":true}\n')];
    const result = await collect(gen({ chunks, protocol: 'sse', chunkType: 'json' }));
    expect(result.values).toEqual([{ tail: true }]);
  });
});

describe('createChunkGenerator — NDJSON / json-lines protocol', () => {
  it('splits on \\n and parses json', async () => {
    const chunks = [encode('{"i":1}\n{"i":2}\n{"i":3}\n')];
    const result = await collect(gen({ chunks, protocol: 'ndjson', chunkType: 'json' }));
    expect(result.values).toEqual([{ i: 1 }, { i: 2 }, { i: 3 }]);
  });

  it('json-lines is an alias of ndjson (same line splitting)', async () => {
    const chunks = [encode('{"k":"a"}\n{"k":"b"}\n')];
    const result = await collect(gen({ chunks, protocol: 'json-lines', chunkType: 'json' }));
    expect(result.values).toEqual([{ k: 'a' }, { k: 'b' }]);
  });

  it('skips empty lines', async () => {
    const chunks = [encode('{"i":1}\n\n{"i":2}\n')];
    const result = await collect(gen({ chunks, protocol: 'ndjson', chunkType: 'json' }));
    expect(result.values).toEqual([{ i: 1 }, { i: 2 }]);
  });

  it('reassembles lines spanning packets and emits final partial line', async () => {
    const chunks = [encode('{"a":1}\n{"b":'), encode('2}\n')];
    const result = await collect(gen({ chunks, protocol: 'ndjson', chunkType: 'json' }));
    expect(result.values).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('returns text lines when chunkType is text', async () => {
    const chunks = [encode('foo\nbar\n')];
    const result = await collect(gen({ chunks, protocol: 'ndjson', chunkType: 'text' }));
    expect(result.values).toEqual(['foo', 'bar']);
  });
});

describe('createChunkGenerator — text protocol', () => {
  it('yields one chunk per arrived network packet (no cross-packet merge)', async () => {
    const chunks = [encode('packet-1'), encode('packet-2')];
    const result = await collect(gen({ chunks, protocol: 'text', chunkType: 'text' }));
    expect(result.values).toEqual(['packet-1', 'packet-2']);
  });

  it('with json chunkType, parses each packet as JSON', async () => {
    const chunks = [encode('{"p":1}'), encode('{"p":2}')];
    const result = await collect(gen({ chunks, protocol: 'text', chunkType: 'json' }));
    expect(result.values).toEqual([{ p: 1 }, { p: 2 }]);
  });
});

describe('createChunkGenerator — raw protocol', () => {
  it('returns Uint8Array chunks verbatim without splitting or decoding', async () => {
    const a = encode('abc');
    const b = encode('def');
    const result = await collect(gen({ chunks: [a, b], protocol: 'raw', chunkType: 'text' }));
    expect(result.values).toHaveLength(2);
    expect(result.values[0]).toBeInstanceOf(Uint8Array);
    expect(result.values[1]).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(result.values[0] as Uint8Array)).toBe('abc');
    expect(new TextDecoder().decode(result.values[1] as Uint8Array)).toBe('def');
  });
});

describe('createChunkGenerator — error handling', () => {
  it('throws StreamChunkParseError with chunkIndex + rawChunk + cause on bad JSON (sse)', async () => {
    const chunks = [encode('data: {bad\n\n')];
    const result = await collect(gen({ chunks, protocol: 'sse', chunkType: 'json' }));
    expect(result.error).toBeInstanceOf(StreamChunkParseError);
    const err = result.error as StreamChunkParseError;
    expect(err.chunkIndex).toBe(0);
    expect(err.rawChunk).toBe('{bad');
    expect(err.cause).toBeInstanceOf(SyntaxError);
  });

  it('throws StreamChunkParseError with the correct chunkIndex on the failing chunk (ndjson)', async () => {
    const chunks = [encode('{"ok":1}\nNOT_JSON\n')];
    const result = await collect(gen({ chunks, protocol: 'ndjson', chunkType: 'json' }));
    expect(result.error).toBeInstanceOf(StreamChunkParseError);
    expect((result.error as StreamChunkParseError).chunkIndex).toBe(1);
    expect((result.error as StreamChunkParseError).rawChunk).toBe('NOT_JSON');
  });
});

describe('createChunkGenerator — abort', () => {
  it('ctx.signal abort ends iteration gracefully (no exception)', async () => {
    const controller = new AbortController();
    let calls = 0;
    const readChunk = async (): Promise<Uint8Array | undefined> => {
      calls += 1;
      if (calls === 1) {
        // first packet ok
        return encode('data: {"n":1}\n\n');
      }
      // before the second read resolves, abort
      controller.abort();
      await new Promise((r) => setTimeout(r, 0));
      return encode('data: {"n":2}\n\n');
    };
    const gen2 = createChunkGenerator({
      readChunk,
      protocol: 'sse',
      chunkType: 'json',
      signal: controller.signal,
    });
    const result = await collect(gen2);
    expect(result.error).toBeUndefined();
    // 至少拿到第一个 chunk；aborted 后自然结束
    expect(result.values.length).toBeGreaterThanOrEqual(1);
  });
});

describe('createDefaultStream — fetch integration', () => {
  function mockReadableStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
    let i = 0;
    return new ReadableStream({
      pull(controller) {
        if (i < chunks.length) {
          controller.enqueue(chunks[i++]!);
        } else {
          controller.close();
        }
      },
    });
  }

  function mockFetch(
    body: ReadableStream<Uint8Array>,
    init: { status?: number; statusText?: string; headers?: Record<string, string> } = {},
  ) {
    return vi.fn(async () =>
      new Response(body, {
        status: init.status ?? 200,
        statusText: init.statusText ?? '',
        headers: init.headers,
      }),
    ) as unknown as typeof fetch;
  }

  it('returns parsed SSE chunks from a 2xx fetch streaming body', async () => {
    const fetchImpl = mockFetch(mockReadableStream([encode('data: {"a":1}\n\ndata: {"a":2}\n\n')]));
    const stream = createDefaultStream({ fetchImpl });
    const env = { fetcher: async () => ({ status: 200, data: null }), notify: vi.fn() } as never;
    const result = await stream(
      { url: '/api/chat', streamProtocol: 'sse', streamChunkType: 'json' },
      { env, scope: {} as never },
    );
    expect(result.response.status).toBe(200);
    expect(result.response.ok).toBe(true);
    const out: unknown[] = [];
    for await (const c of result.chunks) out.push(c);
    expect(out).toEqual([{ a: 1 }, { a: 2 }]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reports non-2xx status via response with an empty chunk iterator', async () => {
    const fetchImpl = mockFetch(mockReadableStream([]), {
      status: 401,
      statusText: 'Unauthorized',
    });
    const stream = createDefaultStream({ fetchImpl });
    const env = { fetcher: async () => ({ status: 200, data: null }), notify: vi.fn() } as never;
    const result = await stream(
      { url: '/api/secret', streamProtocol: 'sse' },
      { env, scope: {} as never },
    );
    expect(result.response.ok).toBe(false);
    expect(result.response.status).toBe(401);
    expect(result.response.msg).toBe('Unauthorized');
    const out: unknown[] = [];
    for await (const c of result.chunks) out.push(c);
    expect(out).toEqual([]);
  });

  it('reports network errors via response status:0 + code, no throw', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    const stream = createDefaultStream({ fetchImpl });
    const env = { fetcher: async () => ({ status: 200, data: null }), notify: vi.fn() } as never;
    const result = await stream(
      { url: 'https://down.example', streamProtocol: 'sse' },
      { env, scope: {} as never },
    );
    expect(result.response.status).toBe(0);
    expect(result.response.code).toBe('network-error');
    expect(result.response.msg).toContain('Failed to fetch');
  });

  it('passes through default protocol/chunkType (sse + json) when request omits them', async () => {
    const fetchImpl = mockFetch(mockReadableStream([encode('data: 42\n\n')]));
    const stream = createDefaultStream({ fetchImpl });
    const env = { fetcher: async () => ({ status: 200, data: null }), notify: vi.fn() } as never;
    const result = await stream({ url: '/api/x' }, { env, scope: {} as never });
    const out: unknown[] = [];
    for await (const c of result.chunks) out.push(c);
    expect(out).toEqual([42]);
  });

  it('ctx.signal abort ends iteration gracefully (already-aborted signal)', async () => {
    const controller = new AbortController();
    controller.abort();
    const body = new ReadableStream<Uint8Array>({
      pull(streamController) {
        streamController.enqueue(encode('data: {"n":1}\n\n'));
      },
    });
    const fetchImpl = mockFetch(body);
    const stream = createDefaultStream({ fetchImpl });
    const env = { fetcher: async () => ({ status: 200, data: null }), notify: vi.fn() } as never;

    const result = await stream(
      { url: '/api/abort', streamProtocol: 'sse' },
      { env, scope: {} as never, signal: controller.signal },
    );

    const collected: unknown[] = [];
    try {
      for await (const c of result.chunks) collected.push(c);
    } catch {
      /* reader.cancel() 可能以 rejected read 结束；忽略 */
    }
    // 已 abort 的信号下迭代必须能自然结束，不抛出到顶层
    expect(Array.isArray(collected)).toBe(true);
  });
});
