import { describe, expect, it } from 'vitest';

// Live-model probe: OPTIONAL human verification, never a closure precondition.
// Gate contract and failure interpretation: docs/architecture/nop-debugger-ai.md
// §Verification Baseline (local-model probe section).
const ENABLED = process.env.NOP_AI_LOCAL_TEST === '1';
const BASE_URL = (process.env.NOP_AI_LOCAL_BASE_URL ?? 'http://127.0.0.1:11434/v1').replace(/\/$/, '');
const MODEL = process.env.NOP_AI_LOCAL_MODEL ?? 'qwen27b';
const API_KEY = process.env.NOP_AI_LOCAL_API_KEY ?? 'local';
// Fetch abort must fire before the per-test timeout override
// (TEST_TIMEOUT_MS = NOP_AI_LOCAL_TIMEOUT_MS + 5s, default 65s) so failures
// surface as clean HTTP errors, not vitest kills. (Erratum 2026-10-27, plan
// 773: the harness-wide vitest.scripts.config.ts value is 30s, but these two
// tests carry the per-test override — this annotation previously cited 30s.)
const TIMEOUT_MS = Number(process.env.NOP_AI_LOCAL_TIMEOUT_MS ?? 25_000);
const TEST_TIMEOUT_MS = Number(process.env.NOP_AI_LOCAL_TIMEOUT_MS ?? 60_000) + 5_000;

// PRODUCTION MIRROR — enforced from the other side by
// packages/nop-debugger-ai/src/__tests__/local-model-contract.test.ts
// (production face ⊇ these seed names, CI-enforced). Editing this set does not
// change the production tool face; it only re-points the live-model probe.
const DEBUGGER_TOOL_NAMES = new Set([
  'explain_node_failure',
  'get_node_diagnostics',
  'query_events',
  'propose_schema_patch',
]);

async function postChat(body: Record<string, unknown>, timeoutMs = TIMEOUT_MS): Promise<any> {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`local model HTTP ${response.status}: ${raw.slice(0, 500)}`);
  }
  return JSON.parse(raw);
}

describe.skipIf(!ENABLED)('local Qwen 27B AI-debugger probe', () => {
  it('returns a non-empty chat completion', { timeout: TEST_TIMEOUT_MS }, async () => {
    const data = await postChat({
      model: MODEL,
      messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
      stream: false,
      temperature: 0,
    });
    const content = data?.choices?.[0]?.message?.content;
    expect(typeof content).toBe('string');
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it('emits a debugger tool call with parseable arguments', { timeout: TEST_TIMEOUT_MS }, async () => {
    const data = await postChat({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content:
            'The node with cid 42 failed. Call explain_node_failure with {"cid": 42}. Use a tool call, do not answer in text.',
        },
      ],
      stream: false,
      temperature: 0,
      tools: [
        {
          type: 'function',
          function: {
            name: 'explain_node_failure',
            description: 'Explain why a mounted Flux node failed.',
            parameters: {
              type: 'object',
              properties: {
                cid: { type: 'number', description: 'Mounted node cid' },
              },
              required: ['cid'],
            },
          },
        },
      ],
    });

    const toolCalls = data?.choices?.[0]?.message?.tool_calls;
    expect(Array.isArray(toolCalls)).toBe(true);
    expect(toolCalls.length).toBeGreaterThan(0);

    const call = toolCalls[0];
    expect(DEBUGGER_TOOL_NAMES.has(call?.function?.name)).toBe(true);

    const args = JSON.parse(call.function.arguments);
    expect(args).toMatchObject({ cid: 42 });
  });
});
