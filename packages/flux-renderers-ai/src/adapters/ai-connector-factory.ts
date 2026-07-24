import type {
  ApiRequestContext,
  RendererEnv,
  StreamApiRequest,
  ScopeRef,
} from '@nop-chaos/flux-core';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorDeltaToolCall,
  AiConnectorRequest,
  ChatRole,
} from '../engine/types.js';

export interface CreateStreamBasedAiConnectorOptions {
  /** Host renderer env; must provide `env.stream`. */
  env: RendererEnv;
  /** Scope forwarded into the stream request context (optional; for monitor). */
  scope?: ScopeRef;
  /**
   * Build the `StreamApiRequest` from an `AiConnectorRequest`. The host owns
   * baseURL/apiKey/model here (INV: the package never hardcodes them,
   * design.md §18.2 #12/#14). `env.stream` already defaults to
   * `streamProtocol:'sse'` + `streamChunkType:'json'` so callers usually only
   * need url/method/headers/body.
   */
  buildRequest: (request: AiConnectorRequest) => StreamApiRequest;
}

/**
 * Host helper: assemble an `AiConnector` from `env.stream`. The package does
 * NOT implement SSE/NDJSON parsing (that lives inside `env.stream`,
 * design.md §18.2 #15) nor hardcode any backend config (#12/#14). This factory
 * only maps the OpenAI ChatCompletion chunk structure to `AiConnectorChunk`.
 */
export function createStreamBasedAiConnector(
  options: CreateStreamBasedAiConnectorOptions,
): AiConnector {
  const { env, scope, buildRequest } = options;

  return {
    async stream(request: AiConnectorRequest) {
      if (typeof env.stream !== 'function') {
        throw new Error(
          'createStreamBasedAiConnector: env.stream is not available. The host must provide a stream fetcher.',
        );
      }

      const api = buildRequest(request);
      const ctx = { env, scope, signal: request.signal } as ApiRequestContext;

      const { response, chunks } = await env.stream<OpenAIChatCompletionChunk>(api, ctx);

      if (response.status !== 200 && !(response.status === 0 && response.ok)) {
        const detail = response.msg ? ` ${response.msg}` : '';
        throw new Error(`AI stream request failed: HTTP ${response.status}${detail}`);
      }

      async function* generate(): AsyncGenerator<AiConnectorChunk> {
        for await (const raw of chunks) {
          // F2.3: cheap abort guard so abort takes effect even when the host
          // `env.stream` does not actively observe the signal between chunks.
          if (request.signal.aborted) return;
          if (raw && typeof raw === 'object') {
            yield mapOpenAIChunk(raw);
          }
        }
      }

      return generate();
    },
  };
}

/** Minimal OpenAI ChatCompletion chunk shape (only fields this mapper reads). */
interface OpenAIChatCompletionChunk {
  model?: string;
  id?: string;
  choices?: Array<{
    index?: number;
    delta?: {
      role?: ChatRole;
      content?: string;
      reasoning_content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
}

function mapOpenAIChunk(raw: OpenAIChatCompletionChunk): AiConnectorChunk {
  const choice = raw.choices?.[0];
  const delta = choice?.delta;
  const finishReason = choice?.finish_reason ?? undefined;

  const mapped: AiConnectorChunk = {};

  if (delta) {
    const toolCalls = delta.tool_calls?.map<AiConnectorDeltaToolCall>((tc) => ({
      index: tc.index,
      id: tc.id,
      type: tc.type,
      function: tc.function
        ? { name: tc.function.name, arguments: tc.function.arguments }
        : undefined,
    }));
    mapped.delta = {
      role: delta.role,
      content: delta.content,
      reasoning_content: delta.reasoning_content,
      tool_calls: toolCalls,
    };
  }

  if (finishReason) {
    mapped.finishReason = finishReason;
  }

  if (raw.model) {
    mapped.metadata = { model: raw.model };
  }

  return mapped;
}
