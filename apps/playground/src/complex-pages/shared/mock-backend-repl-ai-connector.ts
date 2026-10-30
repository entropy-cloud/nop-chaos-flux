/**
 * K1 connector mock delegate (plan 806; D3 §4.2 AI 域特别节). Split out of
 * `mock-backend-repl-ai.ts` under the CRM C2/C3 delegation pattern (line gate);
 * entity/hook types flow in from the fetcher module, so the fixture presets
 * and the persisted-row shape stay one source of truth.
 *
 * Four presets (D3 §4.2), dispatched per turn by the last user text
 * (mock-ai-env `pickAiWidgetsFixture` keyword precedent):
 *   knowledge-answer   「引用」 → [1][2] markers + terminal sources
 *   refusal-guardrail  「护栏」/forceGuardrail → refusal + finishReason 'content_filter' + refused
 *   tool-round-hitl    「审批」 → round 1 tool_calls ('tool_calls') → engine executor → follow-up
 *   slow-stream        「长答」 → 9 chunks, delayMs via `__replAiTestHooks.streamDelayMs`
 *
 * D6 复审前置义务 (plan 806 强制项): sources/refused/usage must be on the
 * final message by the time `ai-chat` hands `cloneMessage(last)` to
 * onResponseComplete. The generic `createStreamBasedAiConnector` OpenAI-chunk
 * mapper drops everything except delta/finish_reason/model, so this mock
 * implements the `AiConnector` interface DIRECTLY over engine-level
 * `AiConnectorChunk`s — the reused "createMockAiStream/createMockAiConnector
 * 契约" surface. Terminal chunk mechanics: `finishReason` →
 * `assistant.metadata.finishReason` and `metadata` → merged into
 * `assistant.metadata` (create-engine.ts L541-562), while `snapshot` merges
 * top-level (`applyChunk` → `combineDeltaData`), carrying `refused`/`sources`.
 */

import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
} from '@nop-chaos/flux-renderers-ai';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { readOptInHooks } from './mock-backend-replica-kit';
import type {
  ReplAiMessage,
  ReplAiSource,
  ReplAiTestHooks,
  ReplAiUsage,
} from './mock-backend-repl-ai';
import {
  DEFAULT_ANSWER_TEXT,
  KB_ANSWER_CONTENT,
  REFUSAL_CONTENT,
  REPL_AI_KB_SOURCES,
} from './mock-backend-repl-ai';

function readReplAiTestHooks(): ReplAiTestHooks | undefined {
  return readOptInHooks<ReplAiTestHooks>('__replAiTestHooks');
}

const CHUNK_DELAY_MS = 15;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Whitespace-preserving token split (mock-ai-env tokenizeMarkdown precedent). */
function tokenize(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

function lastUserText(request: AiConnectorRequest): string {
  const messages = Array.isArray(request.messages) ? request.messages : [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i] as Partial<ChatMessage>;
    if (message?.role === 'user' && typeof message.content === 'string') return message.content;
  }
  return '';
}

/** D5 tool-round detection (mock-ai-env precedent): a follow-up round request
 * ends with the `role:'tool'` executor result message. */
function lastMessageRole(request: AiConnectorRequest): string | null {
  const messages = Array.isArray(request.messages) ? request.messages : [];
  const last = messages[messages.length - 1] as Partial<ChatMessage> | undefined;
  return last && typeof last.role === 'string' ? last.role : null;
}

export type ReplAiPreset =
  | 'knowledge-answer'
  | 'refusal-guardrail'
  | 'tool-round-hitl'
  | 'slow-stream'
  | 'default';

/** D3 §4.2 fixture dispatch: keyword → preset; forceGuardrail wins. */
export function pickReplAiPreset(userText: string, hooks: ReplAiTestHooks | undefined): ReplAiPreset {
  if (hooks?.forceGuardrail === true) return 'refusal-guardrail';
  if (userText.includes('护栏')) return 'refusal-guardrail';
  if (userText.includes('引用')) return 'knowledge-answer';
  if (userText.includes('审批')) return 'tool-round-hitl';
  if (userText.includes('长答')) return 'slow-stream';
  return 'default';
}

const TOOL_FOLLOW_UP_ANSWER = '已调用知识库检索工具：审批流程为 提交 → 审批 → 归档。';

const SLOW_STREAM_SENTENCES = [
  '长回答开始：',
  '知识库检索按关键词召回候选段落，',
  '再由重排序器精排，',
  '随后拼装引用上下文，',
  '生成阶段逐 token 输出，',
  '期间可以随时停止，',
  '已产生的增量会保留，',
  '停止后输入框恢复可用，',
  '这是一段用于逐帧渲染采样的长答。',
];

const DEFAULT_USAGE: ReplAiUsage = { prompt_tokens: 128, completion_tokens: 96, total_tokens: 224, cost: 0.0021 };

/** Terminal projection chunk (D6 obligation): refused/sources/usage ride the
 * snapshot merge (top-level — the ReplAiMessage row shape, re-read by
 * messageSave), usage additionally into metadata (ai-token-usage reads
 * `message.metadata.usage`) and finishReason via the chunk merge. */
function terminalChunk(finishReason: string, refused: boolean, sources: ReplAiSource[]): AiConnectorChunk {
  return {
    finishReason,
    snapshot: { refused, sources, usage: DEFAULT_USAGE } as Partial<ChatMessage>,
    metadata: { model: 'repl-ai-mock', usage: DEFAULT_USAGE },
  };
}

/** Push whitespace-preserved content pieces of `text`, sleeping between yields
 * (delay must sit BETWEEN chunks — pre-building the array then flushing would
 * make the stream arrive at once and the 逐帧 sampling assertions would see a
 * single jump). */
async function* emitContent(text: string, delayMs: number): AsyncGenerator<AiConnectorChunk> {
  // No `role` in the deltas: the engine's assistant placeholder already carries
  // it, and combineDeltaData CONCATENATES repeated string fields.
  for (const piece of tokenize(text)) {
    yield { delta: { content: piece } };
    await sleep(delayMs);
  }
}

async function* emitPresetChunks(
  preset: ReplAiPreset,
  request: AiConnectorRequest,
  hooks: ReplAiTestHooks | undefined,
): AsyncGenerator<AiConnectorChunk> {
  const slowDelay =
    typeof hooks?.streamDelayMs === 'number' && hooks.streamDelayMs > 0 ? hooks.streamDelayMs : 90;

  switch (preset) {
    case 'knowledge-answer': {
      yield* emitContent(KB_ANSWER_CONTENT, CHUNK_DELAY_MS);
      yield terminalChunk('stop', false, REPL_AI_KB_SOURCES);
      return;
    }
    case 'refusal-guardrail': {
      yield* emitContent(REFUSAL_CONTENT, CHUNK_DELAY_MS);
      yield terminalChunk('content_filter', true, []);
      return;
    }
    case 'tool-round-hitl': {
      if (lastMessageRole(request) !== 'tool') {
        // Round 1: ask the kb search tool (tool-mock.ts two-round precedent),
        // then hand control back to the engine's agentic loop.
        await sleep(slowDelay);
        yield {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: 'call_kb_search_1',
                type: 'function',
                function: { name: 'search', arguments: '{"query":"审批流程"}' },
              },
            ],
          },
        };
        yield { finishReason: 'tool_calls' };
        return;
      }
      // Follow-up round (role:'tool' result present) → content answer.
      yield* emitContent(TOOL_FOLLOW_UP_ANSWER, CHUNK_DELAY_MS);
      yield terminalChunk('stop', false, []);
      return;
    }
    case 'slow-stream': {
      for (const sentence of SLOW_STREAM_SENTENCES) {
        yield { delta: { content: sentence } };
        await sleep(slowDelay);
      }
      yield terminalChunk('stop', false, []);
      return;
    }
    default: {
      yield* emitContent(DEFAULT_ANSWER_TEXT, CHUNK_DELAY_MS);
      yield terminalChunk('stop', false, []);
      return;
    }
  }
}

/**
 * The K1 connector mock. Implements `AiConnector` directly over engine-level
 * chunks (see module header for why the env.stream detour cannot carry the
 * D6 projection extension); hooks re-read per stream call.
 */
export function createReplAiConnector(): AiConnector {
  return {
    stream(request: AiConnectorRequest) {
      const hooks = readReplAiTestHooks();
      const preset = pickReplAiPreset(lastUserText(request), hooks);
      async function* generate(): AsyncGenerator<AiConnectorChunk> {
        if (hooks?.forceStreamError === true) {
          throw new Error('stream forced error (forceStreamError)');
        }
        for await (const chunk of emitPresetChunks(preset, request, hooks)) {
          if (request.signal.aborted) return;
          yield chunk;
        }
      }
      return generate();
    },
  };
}

/**
 * History replay helper (host 回显面, D3 MAJ-B): fetch one conversation's
 * persisted messages and project them into `ChatMessage`s for
 * `engine.setMessages`. Rows keep the snapshot shape, so sources/usage/refused
 * survive the save→find→hydrate round-trip.
 */
export async function loadReplAiConversationHistory(
  env: Pick<RendererEnv, 'fetcher'>,
  conversationId: string,
): Promise<ChatMessage[]> {
  // The shared showcase fetcher face is the 1-arg mock signature (FetcherApi);
  // ApiFetcher's ctx param is unused by the mock — narrow cast, host-side only.
  const fetch = env.fetcher as unknown as (
    api: { url: string; method: string },
  ) => Promise<{ status: number; data: { items?: ReplAiMessage[] } | null }>;
  const response = await fetch({
    url: `/r/ReplAi__messageFindPage?conversationId=${encodeURIComponent(conversationId)}`,
    method: 'get',
  });
  const items = response.data?.items ?? [];
  // sources/refused are the deliberate snapshot projection extension (D6
  // obligation) — extra keys survive engine.setMessages display rendering.
  return items.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    sources: row.sources ?? [],
    refused: row.refused === true,
    metadata: {
      createdAt: row.createdAt,
      usage: row.usage,
      sources: row.sources ?? [],
    },
  })) as unknown as ChatMessage[];
}
