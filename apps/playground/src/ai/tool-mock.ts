/**
 * Playground host helper: a mock AI tool-execution scenario.
 *
 * Extends the canned mock stream so the first user turn emits a
 * `finish_reason:'tool_calls'` (so the engine enters the agentic loop), and a
 * `toolExecutor` resolves `get_weather` / `search` against canned data. On the
 * follow-up round (after the `role:'tool'` result message is present), the
 * stream emits a normal content reply that references the tool result.
 *
 * Lives in the host (NOT in `@nop-chaos/flux-renderers-ai`, design.md §18.2 #14).
 */
import type { StreamApiRequest, StreamFetchResult, StreamFetcher } from '@nop-chaos/flux-core';
import type { AiToolSchema, ChatMessage, ToolExecutor } from '@nop-chaos/flux-renderers-ai';

function extractLastRole(messages: unknown): { role: string; content: string } | null {
  if (!Array.isArray(messages)) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as Partial<ChatMessage>;
    if (m && typeof m.role === 'string') {
      const content = typeof m.content === 'string' ? m.content : '';
      return { role: m.role, content };
    }
  }
  return null;
}

/**
 * Mock stream: round 1 → tool_calls; round N (tool result present) → content.
 */
export function createMockToolStream(delayMs = 10): StreamFetcher {
  const fn = async (api: StreamApiRequest): Promise<StreamFetchResult<unknown>> => {
    const body = (api.data ?? {}) as { messages?: unknown };
    const last = extractLastRole(body.messages);

    async function* generate(): AsyncGenerator<unknown> {
      if (last?.role === 'tool') {
        // Follow-up round: summarize the tool result.
        const summary = `The weather tool returned: ${last.content}. It looks pleasant!`;
        for (const word of summary.split(' ')) {
          yield {
            model: 'flux-mock-tools',
            choices: [{ index: 0, delta: { content: `${word} ` }, finish_reason: null }],
          };
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        yield { model: 'flux-mock-tools', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] };
        return;
      }

      // Round 1: ask the weather tool.
      yield {
        model: 'flux-mock-tools',
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'call_weather_1',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"city":"San Francisco"}',
                  },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      };
      yield { model: 'flux-mock-tools', choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] };
    }

    return {
      response: { ok: true, status: 200, headers: {} },
      chunks: generate(),
    } as StreamFetchResult<unknown>;
  };
  return fn as StreamFetcher;
}

/** OpenAI-compatible tool schemas exposed to the model. */
export const mockToolSchemas: AiToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get the current weather for a city.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'The city name' },
        },
        required: ['city'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search',
      description: 'Search the knowledge base.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
        },
        required: ['query'],
      },
    },
  },
];

/** Host-provided tool executor with canned results. */
export const mockToolExecutor: ToolExecutor = async ({ toolCall }) => {
  const name = toolCall.function.name;
  if (name === 'get_weather') {
    return '18°C, sunny (San Francisco)';
  }
  if (name === 'search') {
    return '3 results found for your query.';
  }
  throw new Error(`Unknown tool: ${name}`);
};
