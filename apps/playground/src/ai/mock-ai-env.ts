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
import { toast } from '@nop-chaos/ui';
import {
  createStreamBasedAiConnector,
  type AiConnector,
} from '@nop-chaos/flux-renderers-ai';
import type { ChatMessage } from '@nop-chaos/flux-renderers-ai';
import { pickAiWidgetsFixture } from './ai-widgets-fixture.js';

const CANNED_REPLY_WORDS = ['Hello', 'from', 'the', 'mock', 'AI', 'connector!', 'Streaming', 'works.'];

export interface MockAiEnvOptions {
  /** Delay between streamed chunks in ms. Default 15 (unchanged legacy behavior). */
  delayMs?: number;
  /** When true, replies are dispatched to the D1 rich markdown fixtures by keyword. Default false. */
  fixtures?: boolean;
}

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

/** D5 tool-round detection: the engine's follow-up request ends with the `role:'tool'` result message (tool-mock.ts round pattern). */
function lastMessageRole(messages: unknown): string | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const m = messages[messages.length - 1] as Partial<ChatMessage> | undefined;
  return m && typeof m.role === 'string' ? m.role : null;
}

/**
 * Split markdown text into whitespace-preserving chunks so that joining all
 * chunks reproduces the source exactly (markdown structure never depends on
 * characters split across chunks).
 */
function tokenizeMarkdown(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

/**
 * Mock `env.stream`: ignores the URL entirely and returns canned OpenAI
 * ChatCompletion chunks derived from the last user message, streamed with a
 * small delay to simulate token-by-token output.
 *
 * `fixtures = true` switches the reply source from the legacy 8-word canned
 * line to the D1 rich markdown fixtures (`ai-widgets-fixture.ts`), dispatched
 * by keyword; chunk shape and the trailing `finish_reason: 'stop'` marker are
 * identical in both modes.
 *
 * D5 structured emission (fixture mode only): a preset with `toolRound` emits
 * a `get_weather` `delta.tool_calls` + `finish_reason:'tool_calls'` on the
 * first round (arguments match the `tool-mock.ts` executor) and a normal
 * content stream once the engine's follow-up request arrives (detected by the
 * trailing `role:'tool'` message); a preset with `reasoning` streams
 * `delta.reasoning_content` chunks ahead of the content stream. Presets
 * without structured fields keep the exact D1 chunk sequence.
 */
export function createMockAiStream(delayMs = 15, fixtures = false): StreamFetcher {
  const fn = async (api: StreamApiRequest): Promise<StreamFetchResult<unknown>> => {
    const body = (api.data ?? {}) as { messages?: unknown };
    const userText = extractLastUserText(body.messages);
    const fixture = fixtures ? pickAiWidgetsFixture(userText) : undefined;
    const legacyChunks: string[] = [
      ...(userText.length > 0 ? [`Echo: `, `${userText} `] : []),
      ...CANNED_REPLY_WORDS.map((word) => `${word} `),
    ];
    const chunks: string[] = fixture
      ? tokenizeMarkdown(fixture.content)
      : legacyChunks;

    async function* generate(): AsyncGenerator<unknown> {
      if (fixture?.toolRound && lastMessageRole(body.messages) !== 'tool') {
        // D5 tool round: ask the weather tool, then hand control back to the
        // engine (agentic loop). Round shape mirrors `tool-mock.ts`.
        yield {
          model: 'flux-mock',
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_weather_widgets',
                    type: 'function',
                    function: {
                      name: 'get_weather',
                      arguments: '{"city":"Hangzhou"}',
                    },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        };
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        yield { model: 'flux-mock', choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] };
        return;
      }

      if (fixture?.reasoning) {
        for (const chunk of tokenizeMarkdown(fixture.reasoning)) {
          yield {
            model: 'flux-mock',
            choices: [{ index: 0, delta: { reasoning_content: chunk }, finish_reason: null }],
          };
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      for (const chunk of chunks) {
        yield {
          model: 'flux-mock',
          choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }],
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

/**
 * Build a minimal env with a mock `stream` for the AI demo.
 *
 * Zero-arg (or default) options keep the legacy behavior exactly: 15ms
 * chunk delay + echo + 8-word canned reply. `fixtures: true` dispatches to
 * the D1 rich markdown presets; a larger `delayMs` (e.g. 200 on the widgets
 * showcase, product-spec §5) makes the streaming cadence visible.
 */
export function createMockAiEnv(options?: MockAiEnvOptions): RendererEnv {
  const delayMs = options?.delayMs ?? 15;
  const fixtures = options?.fixtures ?? false;
  return {
    fetcher: (async () => ({ status: 200, data: null })) as RendererEnv['fetcher'],
    stream: createMockAiStream(delayMs, fixtures),
    // Plan 461: route `showToast` to the playground's sonner Toaster so wiring
    // actions like `ai-prompts.onSelect` produce visible feedback.
    notify: (level, message) => {
      const text = typeof message === 'string' ? message : String(message ?? '');
      if (level === 'error') toast.error(text || 'Error');
      else if (level === 'success') toast.success(text || 'Success');
      else if (level === 'warning') toast.warning?.(text || 'Warning');
      else toast.info?.(text || 'Info');
    },
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
