/**
 * Host-side connectors for the `/#/ai-coverage` e2e page.
 *
 * Deterministic connectors backing the coverage scenarios:
 * - `mock`  fast canned stream (same words as mock-ai-env, short delay)
 * - `slow`  ~300ms per chunk so streaming states (data-streaming /
 *           data-state=processing / disabled widgets) are catchable
 * - `flaky` fails the FIRST request with HTTP 500, then succeeds (retry path)
 * - `eof`   streams two chunks then ends WITHOUT finish_reason (abrupt EOF)
 *
 * Also exposes `engines.nullEngine = null` so a schema can drive the
 * ai-chat `engine: null` switch window (data-state="empty").
 */
import type {
  ApiRequestContext,
  ImportedLibraryModule,
  RendererEnv,
  StreamApiRequest,
  StreamFetchResult,
  StreamFetcher,
  XuiImportSpec,
} from '@nop-chaos/flux-core';
import { toast } from '@nop-chaos/ui';
import { createStreamBasedAiConnector, type AiConnector } from '@nop-chaos/flux-renderers-ai';

const WORDS_FAST = ['Hello', 'from', 'coverage', 'mock', 'connector!'];
const WORDS_SLOW = ['Slowly', 'streamed', 'coverage', 'reply', 'done.'];
const WORDS_EOF = ['Partial', 'reply'];

function chunk(word: string, finish: string | null = null): unknown {
  return { model: 'flux-coverage', choices: [{ index: 0, delta: finish ? {} : { content: `${word} ` }, finish_reason: finish }] };
}

function wordsStream(words: string[], delayMs: number, abruptEof = false): StreamFetcher {
  const fn = async (_api: StreamApiRequest, _ctx: ApiRequestContext): Promise<StreamFetchResult<unknown>> => {
    async function* generate(): AsyncGenerator<unknown> {
      for (const word of words) {
        yield chunk(word);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      if (!abruptEof) {
        yield chunk('', 'stop');
      }
    }
    return { response: { status: 200, headers: {} }, chunks: generate() } as StreamFetchResult<unknown>;
  };
  return fn as StreamFetcher;
}

function flakyStream(failedOnce: { value: boolean }, delayMs: number): StreamFetcher {
  const fn = async (api: StreamApiRequest, _ctx: ApiRequestContext): Promise<StreamFetchResult<unknown>> => {
    if (!failedOnce.value) {
      failedOnce.value = true;
      return { response: { status: 500, headers: {}, msg: 'coverage first-call failure' } } as StreamFetchResult<unknown>;
    }
    void api;
    async function* generate(): AsyncGenerator<unknown> {
      for (const word of ['Recovered', 'after', 'retry.']) {
        yield chunk(word);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      yield chunk('', 'stop');
    }
    return { response: { status: 200, headers: {} }, chunks: generate() } as StreamFetchResult<unknown>;
  };
  return fn as StreamFetcher;
}

export interface CoverageConnectors {
  mock: AiConnector;
  slow: AiConnector;
  flaky: AiConnector;
  eof: AiConnector;
}

export function createCoverageConnectors(): { connectors: CoverageConnectors; env: RendererEnv; importLoader: { load(spec: XuiImportSpec): Promise<ImportedLibraryModule> }; resolveImportUrl: (schemaUrl: string, from: string) => string } {
  const failedOnce = { value: false };
  const stream: StreamFetcher = (async (api: StreamApiRequest, ctx: ApiRequestContext) => {
    const url = api.url as string;
    if (url.includes('slow')) return wordsStream(WORDS_SLOW, 300)(api, ctx);
    if (url.includes('flaky')) return flakyStream(failedOnce, 60)(api, ctx);
    if (url.includes('eof')) return wordsStream(WORDS_EOF, 60, true)(api, ctx);
    return wordsStream(WORDS_FAST, 20)(api, ctx);
  }) as StreamFetcher;

  const env: RendererEnv = {
    fetcher: (async () => ({ status: 0, data: null })) as RendererEnv['fetcher'],
    stream,
    notify: (level, message) => {
      const text = typeof message === 'string' ? message : String(message ?? '');
      if (level === 'error') toast.error(text || 'Error');
      else if (level === 'success') toast.success(text || 'Success');
      else if (level === 'warning') toast.warning?.(text || 'Warning');
      else toast.info?.(text || 'Info');
    },
  };

  const build = (url: string) =>
    createStreamBasedAiConnector({
      env,
      buildRequest: (req) => ({
        url,
        method: 'POST',
        data: { messages: req.messages, stream: true } as unknown as StreamApiRequest['data'],
      }),
    });

  const connectors: CoverageConnectors = {
    mock: build('coverage://mock/chat/completions'),
    slow: build('coverage://slow/chat/completions'),
    flaky: build('coverage://flaky/chat/completions'),
    eof: build('coverage://eof/chat/completions'),
  };

  const module: ImportedLibraryModule = {
    createNamespace: () => ({
      listMethods: () => [],
      invoke: () => ({ ok: true }),
    }),
    createExpressionHelpers: () => ({
      connectors,
      engines: { nullEngine: null },
    }),
  };

  return {
    connectors,
    env,
    importLoader: {
      load(spec: XuiImportSpec) {
        if (spec.from === 'ai://') {
          return Promise.resolve(module);
        }
        throw new Error(`Unknown AI import: ${spec.from}`);
      },
    },
    resolveImportUrl: (_schemaUrl: string, from: string) => (from === 'ai' ? 'ai://' : from),
  };
}
