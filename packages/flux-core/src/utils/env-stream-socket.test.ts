import { describe, expect, it, vi } from 'vitest';
import {
  StreamChunkParseError,
  decorateRendererEnv,
  type ApiFetcher,
  type RendererEnv,
  type RendererEnvDecoratorHooks,
  type StreamApiRequest,
  type StreamFetchResult,
  type WebSocketOpener,
} from '../index.js';

function createEnv(overrides?: Partial<RendererEnv>): RendererEnv {
  const fetcher: ApiFetcher = async <T>(api: unknown) => ({
    ok: true,
    status: 200,
    data: api as T,
  });

  return {
    fetcher: vi.fn(fetcher) as unknown as ApiFetcher,
    notify: vi.fn(),
    navigate: vi.fn(),
    monitor: {},
    ...overrides,
  };
}

function asyncGen<T>(items: T[]): AsyncGenerator<T> {
  return (async function* () {
    for (const item of items) yield item;
  })();
}

function makeStreamResult<T>(items: T[]): StreamFetchResult<T> {
  return { response: { status: 200 }, chunks: asyncGen(items) };
}

describe('StreamChunkParseError', () => {
  it('is a throwable Error with required shape fields', () => {
    const cause = new SyntaxError('Unexpected token');
    let caught: unknown;
    try {
      throw new StreamChunkParseError({ chunkIndex: 3, rawChunk: '{bad', cause });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught).toBeInstanceOf(StreamChunkParseError);
    const err = caught as StreamChunkParseError;
    expect(err.name).toBe('StreamChunkParseError');
    expect(err.chunkIndex).toBe(3);
    expect(err.rawChunk).toBe('{bad');
    expect(err.cause).toBe(cause);
    expect(err.message).toContain('#3');
  });

  it('falls back to a sensible message when none is provided and tolerates missing cause', () => {
    const err = new StreamChunkParseError({ chunkIndex: 0, rawChunk: '' });
    expect(err.message).toBe('Failed to parse stream chunk #0');
    expect(err.cause).toBeUndefined();
  });

  it('supports instanceof checks up the prototype chain', () => {
    expect(new StreamChunkParseError({ chunkIndex: 1, rawChunk: 'x' })).toBeInstanceOf(Error);
  });
});

describe('decorateRendererEnv — stream hook', () => {
  it('returns the same env when only unrelated hooks are provided', () => {
    const env = createEnv();
    expect(decorateRendererEnv(env, {})).toBe(env);
  });

  it('passes through env.stream untouched when no stream hook is provided', () => {
    const originalStream = (async () => makeStreamResult<unknown>([])) as unknown as NonNullable<
      RendererEnv['stream']
    >;
    const env = createEnv({ stream: originalStream });
    const decorated = decorateRendererEnv(env, { notify: (next, lvl, msg) => next(lvl, msg) });
    expect(decorated.stream).toBe(originalStream);
  });

  it('chains the stream hook so the underlying stream is invoked and observable', async () => {
    const underlying = vi.fn((api: StreamApiRequest) => makeStreamResult<unknown>([{ echoed: api.url }]));
    const env = createEnv({ stream: underlying as unknown as NonNullable<RendererEnv['stream']> });

    const streamHook = vi.fn(async (next: NonNullable<RendererEnv['stream']>, api, ctx) =>
      next(api, ctx),
    ) as unknown as NonNullable<RendererEnvDecoratorHooks['stream']>;

    const decorated = decorateRendererEnv(env, { stream: streamHook });
    expect(decorated.stream).toBeDefined();

    const collected: unknown[] = [];
    const result = (await decorated.stream!<unknown>({ url: '/api/stream' }, {
      env: decorated,
      scope: {} as never,
    })) as StreamFetchResult<unknown>;
    for await (const chunk of result.chunks) collected.push(chunk);

    expect(streamHook).toHaveBeenCalledTimes(1);
    expect(underlying).toHaveBeenCalledTimes(1);
    expect(collected).toEqual([{ echoed: '/api/stream' }]);
  });

  it('does not add env.stream when the source env lacks one (no synthetic capability)', () => {
    const env = createEnv();
    const decorated = decorateRendererEnv(env, {
      stream: async (next, api, ctx) => next(api, ctx),
    });
    expect(decorated.stream).toBeUndefined();
  });
});

describe('decorateRendererEnv — openSocket hook', () => {
  it('passes through env.openSocket untouched when no hook is provided', () => {
    const originalSocket: WebSocketOpener = () => ({
      readyState: 'connecting',
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
    });
    const env = createEnv({ openSocket: originalSocket });
    const decorated = decorateRendererEnv(env, { notify: (next, lvl, msg) => next(lvl, msg) });
    expect(decorated.openSocket).toBe(originalSocket);
  });

  it('chains the openSocket hook so the underlying opener is invoked and observable', () => {
    const underlyingOpener = vi.fn<WebSocketOpener>(() => ({
      readyState: 'connecting',
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
    }));
    const env = createEnv({ openSocket: underlyingOpener });

    const socketHook = vi.fn((next, url, options, ctx) => next(url, options, ctx));
    const decorated = decorateRendererEnv(env, { openSocket: socketHook });

    decorated.openSocket!('wss://example.com', { binaryType: 'arraybuffer' });

    expect(socketHook).toHaveBeenCalledTimes(1);
    expect(socketHook.mock.calls[0][1]).toBe('wss://example.com');
    expect(socketHook.mock.calls[0][2]).toEqual({ binaryType: 'arraybuffer' });
    expect(underlyingOpener).toHaveBeenCalledTimes(1);
  });

  it('does not add env.openSocket when the source env lacks one', () => {
    const env = createEnv();
    const decorated = decorateRendererEnv(env, {
      openSocket: (next, url, opts) => next(url, opts),
    });
    expect(decorated.openSocket).toBeUndefined();
  });
});

describe('StreamApiRequest / StreamFetchResult type ergonomics', () => {
  it('StreamApiRequest accepts ExecutableApiRequest fields plus the two stream params', () => {
    const request = {
      url: '/api/chat',
      method: 'POST',
      data: { prompt: 'hi' },
      streamProtocol: 'sse' as const,
      streamChunkType: 'json' as const,
    };
    expect(request.streamProtocol).toBe('sse');
    expect(request.streamChunkType).toBe('json');
  });

  it('StreamFetchResult exposes response + chunks with the expected envelope shape', async () => {
    const result: StreamFetchResult<{ n: number }> = makeStreamResult([{ n: 1 }, { n: 2 }]);
    const out: number[] = [];
    for await (const chunk of result.chunks) out.push(chunk.n);
    expect(result.response.status).toBe(200);
    expect(out).toEqual([1, 2]);
  });
});
