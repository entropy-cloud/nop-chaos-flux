import { describe, it, expect, vi } from 'vitest';
import {
  StreamChunkParseError,
  type RendererEnv,
  type StreamApiRequest,
  type StreamFetchResult,
  type StreamFetcher,
} from '@nop-chaos/flux-core';
import { createStreamBasedAiConnector } from '../ai-connector-factory.js';
import type { AiConnectorRequest } from '../../engine/types.js';

function makeEnv(stream: StreamFetcher): RendererEnv {
  return {
    fetcher: (async () => ({ status: 200, data: null })) as RendererEnv['fetcher'],
    stream,
    notify: () => undefined,
  };
}

const OPENAI_CHUNKS = [
  { model: 'gpt-4', choices: [{ index: 0, delta: { role: 'assistant', content: 'Hel' }, finish_reason: null }] },
  { model: 'gpt-4', choices: [{ index: 0, delta: { content: 'lo' }, finish_reason: null }] },
  { model: 'gpt-4', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
];

function cannedStream(chunks: unknown[], status = 200): StreamFetcher {
  const fn = async (): Promise<StreamFetchResult<unknown>> => {
    async function* gen() {
      for (const c of chunks) yield c;
    }
    return { response: { ok: status === 200, status, headers: {} }, chunks: gen() };
  };
  return fn as StreamFetcher;
}

function buildReq(url: string, body: unknown): StreamApiRequest {
  return { url, method: 'POST', data: body as StreamApiRequest['data'] };
}

function baseRequest(signal?: AbortSignal): AiConnectorRequest {
  return {
    messages: [{ id: 'u1', role: 'user', content: 'hi' }],
    signal: signal ?? new AbortController().signal,
  };
}

describe('createStreamBasedAiConnector', () => {
  it('maps OpenAI chunks to AiConnectorChunk and accumulates content', async () => {
    const env = makeEnv(cannedStream(OPENAI_CHUNKS));
    const connector = createStreamBasedAiConnector({
      env,
      buildRequest: (req) => buildReq('https://example/v1/chat/completions', { messages: req.messages }),
    });
    const gen = await connector.stream(baseRequest());
    const out = [];
    for await (const c of gen) out.push(c);

    expect(out[0].delta?.role).toBe('assistant');
    expect(out[0].delta?.content).toBe('Hel');
    expect(out[0].metadata?.model).toBe('gpt-4');
    expect(out[1].delta?.content).toBe('lo');
    expect(out[2].finishReason).toBe('stop');
  });

  it('maps streamed tool_calls', async () => {
    const chunks = [
      {
        choices: [
          {
            delta: {
              tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'f', arguments: '{}' } }],
            },
            finish_reason: null,
          },
        ],
      },
      { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
    ];
    const env = makeEnv(cannedStream(chunks));
    const connector = createStreamBasedAiConnector({ env, buildRequest: () => buildReq('x', {}) });
    const gen = await connector.stream(baseRequest());
    const out = [];
    for await (const c of gen) out.push(c);
    expect(out[0].delta?.tool_calls?.[0]).toMatchObject({
      index: 0,
      id: 'call_1',
      function: { name: 'f', arguments: '{}' },
    });
    expect(out[1].finishReason).toBe('tool_calls');
  });

  it('throws when env.stream is missing', async () => {
    const env: RendererEnv = {
      fetcher: (async () => ({ status: 200, data: null })) as RendererEnv['fetcher'],
      notify: () => undefined,
    };
    const connector = createStreamBasedAiConnector({ env, buildRequest: () => buildReq('x', {}) });
    await expect(connector.stream(baseRequest())).rejects.toThrow(/env\.stream is not available/);
  });

  it('throws on non-200 response status', async () => {
    const env = makeEnv(cannedStream([], 401));
    const connector = createStreamBasedAiConnector({ env, buildRequest: () => buildReq('x', {}) });
    await expect(connector.stream(baseRequest())).rejects.toThrow(/HTTP 401/);
  });

  it('forwards the request signal into the stream context', async () => {
    const seenSignals: (AbortSignal | undefined)[] = [];
    const fn = async (_api: StreamApiRequest, ctx: ApiRequestCtxStub): Promise<StreamFetchResult<unknown>> => {
      seenSignals.push(ctx.signal);
      async function* gen() {
        yield { choices: [{ delta: { content: 'ok' }, finish_reason: 'stop' }] };
      }
      return { response: { ok: true, status: 200, headers: {} }, chunks: gen() };
    };
    const env = makeEnv(fn as unknown as StreamFetcher);
    const connector = createStreamBasedAiConnector({
      env,
      buildRequest: (req) => buildReq('x', { messages: req.messages }),
    });
    const controller = new AbortController();
    const gen = await connector.stream(baseRequest(controller.signal));
    for await (const _c of gen) { void _c; }
    expect(seenSignals[0]).toBe(controller.signal);
  });

  it('propagates StreamChunkParseError from a malformed chunk', async () => {
    const fn = async (): Promise<StreamFetchResult<unknown>> => {
      // Generator intentionally throws without yielding (chunk parse failure).
      // eslint-disable-next-line require-yield
      async function* gen() {
        throw new StreamChunkParseError({ chunkIndex: 0, rawChunk: 'not-json' });
      }
      return { response: { ok: true, status: 200, headers: {} }, chunks: gen() };
    };
    const env = makeEnv(fn as unknown as StreamFetcher);
    const connector = createStreamBasedAiConnector({ env, buildRequest: () => buildReq('x', {}) });
    const gen = await connector.stream(baseRequest());
    await expect(
      (async () => {
        for await (const _c of gen) { void _c; }
      })(),
    ).rejects.toBeInstanceOf(StreamChunkParseError);
  });
});

describe('createStreamBasedAiConnector — buildRequest receives the connector request', () => {
  it('passes messages through to buildRequest', async () => {
    const build = vi.fn(() => buildReq('x', {}));
    const env = makeEnv(cannedStream(OPENAI_CHUNKS));
    const connector = createStreamBasedAiConnector({ env, buildRequest: build });
    const req = baseRequest();
    const gen = await connector.stream(req);
    for await (const _c of gen) { void _c; }
    expect(build).toHaveBeenCalledWith(req);
  });
});

interface ApiRequestCtxStub {
  signal?: AbortSignal;
}
