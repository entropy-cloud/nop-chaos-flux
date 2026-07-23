/**
 * Playground host helper: a mock AI connector + env for the `ai-chat` demo.
 *
 * This lives in the host app (NOT in `@nop-chaos/flux-renderers-ai`, which
 * ships no concrete connectors — design.md §18.2 invariant 14). It builds an
 * `AiConnector` from `createStreamBasedAiConnector` backed by a mock
 * `env.stream` that yields canned OpenAI-shaped chunks token-by-token, so the
 * P0 "send → stream → bubble" loop runs without any backend.
 */
import type {
  ImportedLibraryModule,
  RendererEnv,
  StreamApiRequest,
  StreamFetchResult,
  StreamFetcher,
  XuiImportSpec,
} from '@nop-chaos/flux-core';
import {
  createStreamBasedAiConnector,
  type AiConnector,
} from '@nop-chaos/flux-renderers-ai';
import type { ChatMessage } from '@nop-chaos/flux-renderers-ai';

const CANNED_REPLY_WORDS = ['Hello', 'from', 'the', 'mock', 'AI', 'connector!', 'Streaming', 'works.'];

function extractLastUserText(messages: unknown): string {
  if (!Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as Partial<ChatMessage>;
    if (m && m.role === 'user' && typeof m.content === 'string') {
      return m.content;
    }
  }
  return '';
}

/**
 * Mock `env.stream`: ignores the URL entirely and returns canned OpenAI
 * ChatCompletion chunks derived from the last user message, streamed with a
 * small delay to simulate token-by-token output.
 */
export function createMockAiStream(delayMs = 15): StreamFetcher {
  const fn = async (api: StreamApiRequest): Promise<StreamFetchResult<unknown>> => {
    const body = (api.data ?? {}) as { messages?: unknown };
    const userText = extractLastUserText(body.messages);
    const echo = userText.length > 0 ? [`Echo:`, userText] : [];
    const words = [...echo, ...CANNED_REPLY_WORDS];

    async function* generate(): AsyncGenerator<unknown> {
      for (const word of words) {
        yield {
          model: 'flux-mock',
          choices: [{ index: 0, delta: { content: `${word} ` }, finish_reason: null }],
        };
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      yield { model: 'flux-mock', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] };
    }

    return {
      response: { ok: true, status: 200, headers: {} },
      chunks: generate(),
    } as StreamFetchResult<unknown>;
  };
  return fn as StreamFetcher;
}

/** Build a mock `AiConnector` from the given env (which must provide `stream`). */
export function createMockAiConnector(env: RendererEnv): AiConnector {
  return createStreamBasedAiConnector({
    env,
    buildRequest: (req) => ({
      url: 'mock://ai/chat/completions',
      method: 'POST',
      data: { messages: req.messages, stream: true } as unknown as StreamApiRequest['data'],
    }),
  });
}

/** Build a minimal env with a mock `stream` for the AI demo. */
export function createMockAiEnv(): RendererEnv {
  return {
    fetcher: (async () => ({ status: 200, data: null })) as RendererEnv['fetcher'],
    stream: createMockAiStream(),
    notify: () => undefined,
  };
}

/**
 * `xui:imports` loader exposing the `ai` namespace, so the schema can reference
 * the mock connector via `${$ai.connectors.mock}`. P1 also exposes a
 * conversation controller helper so hosts can bind `conversationController`
 * through `${$ai.controller}` if desired. P2 optionally exposes
 * `tools` / `toolExecutor` for the agentic tool-loop demo.
 */
export function createAiImportLoader(
  connector: AiConnector,
  extra?: { tools?: unknown; toolExecutor?: unknown },
): {
  importLoader: { load(spec: XuiImportSpec): Promise<ImportedLibraryModule> };
  resolveImportUrl: (schemaUrl: string, from: string) => string;
} {
  const module: ImportedLibraryModule = {
    createNamespace: () => ({
      listMethods: () => [],
      invoke: () => ({ ok: true }),
    }),
    createExpressionHelpers: () => ({
      connectors: { mock: connector },
      tools: extra?.tools,
      toolExecutor: extra?.toolExecutor,
    }),
  };
  return {
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
