/**
 * Playground host helper: a real OpenAI / DeepSeek connector.
 *
 * This lives in the host app (NOT in `@nop-chaos/flux-renderers-ai`, which
 * ships no concrete connectors — design.md §18.2 invariant 14). It builds an
 * `AiConnector` from `createStreamBasedAiConnector` against a host-supplied
 * `env.stream`, so the package itself never opens a socket or hardcodes a
 * backend.
 *
 * The host reads `baseURL` / `apiKey` / `model` from environment variables
 * (Vite exposes them through `import.meta.env.VITE_*`), keeping secrets in
 * the host boundary. The package never sees them.
 */
import type { RendererEnv, StreamApiRequest } from '@nop-chaos/flux-core';
import {
  createStreamBasedAiConnector,
  type AiConnector,
} from '@nop-chaos/flux-renderers-ai';

export interface OpenAICompatibleConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  /** Optional extra OpenAI-compatible params (temperature, top_p, …). */
  extraParams?: Record<string, unknown>;
}

/**
 * Build an OpenAI-compatible `AiConnector`. Works against OpenAI, DeepSeek,
 * Azure OpenAI, Together, OpenRouter, or any provider that speaks the
 * `/chat/completions` SSE protocol.
 */
export function createOpenAICompatibleConnector(
  env: RendererEnv,
  config: OpenAICompatibleConfig,
): AiConnector {
  return createStreamBasedAiConnector({
    env,
    buildRequest: (req) => ({
      url: `${config.baseURL.replace(/\/$/, '')}/chat/completions`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        model: config.model,
        messages: req.messages,
        tools: req.tools,
        stream: true,
        ...config.extraParams,
      } as unknown as StreamApiRequest['data'],
    }),
  });
}

/**
 * Resolve an OpenAI-compatible config from the playground environment.
 * Returns `null` when no API key is configured — the playground then falls
 * back to the mock connector so the demo still runs end-to-end.
 */
export function resolveOpenAIConfigFromEnv(): OpenAICompatibleConfig | null {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  const apiKey = env.VITE_OPENAI_API_KEY ?? env.VITE_DEEPSEEK_API_KEY;
  const baseURL = env.VITE_OPENAI_BASE_URL ?? env.VITE_DEEPSEEK_BASE_URL ?? 'https://api.openai.com/v1';
  const model = env.VITE_OPENAI_MODEL ?? env.VITE_DEEPSEEK_MODEL ?? 'gpt-4o-mini';
  if (!apiKey) return null;
  return { baseURL, apiKey, model };
}
