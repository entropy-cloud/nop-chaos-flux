/**
 * Business-replication AI-domain mock backend (plan 806; D3 §4.3/§4.5/§4.6).
 * `/r/ReplAi__` fetcher face — the K1 endpoint subset, named verbatim against
 * D3 §4.3: conversationFindPage / messageFindPage / conversationSave /
 * conversationRename / conversationDelete / messageSave / feedbackCreate
 * (Rename+Delete included per the §4.3 table). Session state (conversation
 * rows + saved messages) lives in the factory closure so writes are
 * observable across pages in one session. Envelopes per D1 §2: queries
 * `{status:0,data:{items,total}}`, mutations `{status:0,data:{...}}`, error
 * paths `{status:1,msg}`.
 *
 * The K1 connector mock (D3 §4.2 four fixture presets) is delegated to
 * `mock-backend-repl-ai-connector.ts` under the same line-gate delegation
 * pattern as the CRM C2/C3 delegates (`mock-backend-repl-crm-c2.ts`): shared
 * entity/hook types flow in from this module, the counter here stays the
 * single per-request count site for the fetcher face. The K2 ticket-console
 * endpoint subset (plan 807; D3 §4.3 K2 five — ticketFindPage/ticketActionFind/
 * ticketMutation/ticketReply/suggestionFind) is delegated to
 * `mock-backend-repl-ai-k2.ts` the same way: the branch hands unmatched K2
 * urls to `handleReplAiK2Branch`, and the K2 session rows (tickets/actions)
 * live in this module's factory closure so writes stay observable across
 * pages in one session.
 *
 * D6 复审前置义务 (plan 806 强制项): the engine's final message must carry
 * sources/refused/usage by the time `ai-chat` snapshots it into the
 * onResponseComplete payload (`cloneMessage(last)`). The persisted rows
 * therefore keep the snapshot shape — sources/usage/refused at the TOP LEVEL
 * (the G11 alert `${activeAnswer.refused}` and the citations explicit
 * `sources: "${activeAnswer.sources}"` read them directly) — and messageSave
 * stores whatever the connector mock projected. See the connector module
 * header for the chunk-level mechanics.
 *
 * Opt-in e2e observation (D3 §4.6): specs pre-create `window.__replAiCalls` +
 * `window.__replAiTestHooks` via addInitScript (replica-kit precedent);
 * production never sets them, so both stay no-ops.
 */

import type { AiConversationInfo } from '@nop-chaos/flux-renderers-ai';
import {
  createReplAiK2Seed,
  handleReplAiK2Branch,
  type ReplAiTicket,
  type ReplAiTicketAction,
} from './mock-backend-repl-ai-k2';
import {
  createEndpointCounter,
  createUrlParamReader,
  readOptInHooks,
  withOptInHooks,
  type ReplicaBranchInput,
  type ReplicaFetcherBranch,
} from './mock-backend-replica-kit';

/* ── Entities (D3 §4.5 ReplAiMessage / ReplAiConversation) ──────────────── */

export interface ReplAiConversation {
  id: string;
  title: string;
  updatedAt: number;
  messageCount: number;
  pinned: boolean;
}

/** Citation source shape (ai-citations AiCitationSource-compatible). */
export interface ReplAiSource {
  index: number;
  title: string;
  url: string;
  snippet: string;
}

export interface ReplAiUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost?: number;
}

/**
 * Persisted message row. The non-ChatMessage fields (sources/usage/refused)
 * are the D6 projection extension: they sit at the TOP LEVEL of the snapshot
 * so the G11 alert (`${activeAnswer.refused}`) and the citations explicit
 * sources prop (`${activeAnswer.sources}`) read them directly; usage also
 * mirrors into `metadata` (ai-token-usage reads `message.metadata.usage`).
 */
export interface ReplAiMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources: ReplAiSource[];
  usage: ReplAiUsage;
  refused: boolean;
  createdAt: number;
}

/* ── Opt-in test hooks (D3 §4.6) ────────────────────────────────────────── */

export interface ReplAiTestHooks {
  /** Next `feedbackCreate` mutation flips to `{status:1,msg:'FEEDBACK_REJECTED'}`. */
  failNextMutation?: boolean;
  /** Next connector.stream call rejects (ai-chat onError face). */
  forceStreamError?: boolean;
  /** Every connector stream answers with the refusal-guardrail preset. */
  forceGuardrail?: boolean;
  /** Per-chunk delay override for the slow-stream preset (ms). */
  streamDelayMs?: number;
  /** Mirror: last `messageSave` request body (落库体 field-by-field evidence). */
  lastMessageSaveBody?: Record<string, unknown>;
  /** Mirror: last `feedbackCreate` request body. */
  lastFeedbackBody?: Record<string, unknown>;
  /** K2 mirror: last `ticketMutation` request body (field-by-field evidence). */
  lastTicketMutationBody?: Record<string, unknown>;
  /** K2 mirror: last `ticketReply` request body. */
  lastTicketReplyBody?: Record<string, unknown>;
}

function readReplAiTestHooks(): ReplAiTestHooks | undefined {
  return readOptInHooks<ReplAiTestHooks>('__replAiTestHooks');
}

/* ── Deterministic seeds (shared by the host + the fetcher face) ────────── */

export const SEED_TS = 1_761_440_000_000;

/** Knowledge-answer citation sources (2 entries → citations list length 2). */
export const REPL_AI_KB_SOURCES: ReplAiSource[] = [
  {
    index: 1,
    title: 'flux 渲染器样式契约',
    url: 'https://kb.example.com/flux/styling-contract',
    snippet: '布局类 renderer 只发 marker 类，widget 类 renderer 自带完整样式。',
  },
  {
    index: 2,
    title: 'stack-* 间距别名规范',
    url: 'https://kb.example.com/flux/spacing-aliases',
    snippet: '间距在使用点显式声明 stack-*/hstack-* 别名，布局不写死 gap。',
  },
];

export const KB_ANSWER_CONTENT =
  '知识库命中：布局类 renderer 只发 marker 类，样式由 schema 驱动[1]；' +
  'widget 类 renderer 是自样式完整控件，内部布局属于视觉设计的一部分[2]。';

export const REFUSAL_CONTENT = '抱歉，该问题触及内容护栏，无法提供回答。请调整提问后重试。';

export const DEFAULT_ANSWER_TEXT = '这是默认知识库应答。试试「引用…」「护栏…」「长答…」三类预设问题。';

const DEFAULT_USAGE: ReplAiUsage = { prompt_tokens: 128, completion_tokens: 96, total_tokens: 224, cost: 0.0021 };

/** Conversation ids shared by the host list seed and the fetcher session. */
export const KB_MAIN_CONVERSATION_ID = 'conv-kb-001';
export const KB_ALT_CONVERSATION_ID = 'conv-kb-002';

/**
 * The host `useConversation` list seed. Kept in the mock module so the host
 * list and the fetcher session share one deterministic id/title source.
 */
export function replAiHostSeedConversations(): AiConversationInfo[] {
  return [
    { id: KB_MAIN_CONVERSATION_ID, title: '产品知识库', createdAt: SEED_TS, updatedAt: SEED_TS + 1 },
    { id: KB_ALT_CONVERSATION_ID, title: '部署手册问答', createdAt: SEED_TS, updatedAt: SEED_TS + 2 },
  ];
}

function seedMessages(): ReplAiMessage[] {
  return [
    {
      id: 'seed-kb-001-user',
      conversationId: KB_MAIN_CONVERSATION_ID,
      role: 'user',
      content: 'flux 渲染器的样式契约是什么？',
      sources: [],
      usage: DEFAULT_USAGE,
      refused: false,
      createdAt: SEED_TS + 10,
    },
    {
      id: 'seed-kb-001-assistant',
      conversationId: KB_MAIN_CONVERSATION_ID,
      role: 'assistant',
      content: KB_ANSWER_CONTENT,
      sources: REPL_AI_KB_SOURCES,
      usage: DEFAULT_USAGE,
      refused: false,
      createdAt: SEED_TS + 20,
    },
    {
      id: 'seed-kb-002-user',
      conversationId: KB_ALT_CONVERSATION_ID,
      role: 'user',
      content: '如何部署 playground？',
      sources: [],
      usage: DEFAULT_USAGE,
      refused: false,
      createdAt: SEED_TS + 30,
    },
    {
      id: 'seed-kb-002-assistant',
      conversationId: KB_ALT_CONVERSATION_ID,
      role: 'assistant',
      content: '先执行 pnpm install 安装依赖，再执行 pnpm build 产出各包 dist 构建物。',
      sources: [],
      usage: DEFAULT_USAGE,
      refused: false,
      createdAt: SEED_TS + 40,
    },
  ];
}

/* ── Session state ──────────────────────────────────────────────────────── */

export interface ReplAiSessionState {
  conversations: ReplAiConversation[];
  /** Flat message store, filtered by conversationId on read (ASC by createdAt). */
  messages: ReplAiMessage[];
  dbSeq: number;
  /** K2 ticket-console rows (plan 807): ticket queue + trajectory actions. */
  tickets: ReplAiTicket[];
  ticketActions: ReplAiTicketAction[];
  actionSeq: number;
}

export function createReplAiSession(): ReplAiSessionState {
  return {
    conversations: [
      { id: KB_MAIN_CONVERSATION_ID, title: '产品知识库', updatedAt: SEED_TS + 1, messageCount: 2, pinned: true },
      { id: KB_ALT_CONVERSATION_ID, title: '部署手册问答', updatedAt: SEED_TS + 2, messageCount: 2, pinned: false },
    ],
    messages: seedMessages(),
    dbSeq: 0,
    ...createReplAiK2Seed(),
  };
}

/* ── Fetcher face: the /r/ReplAi__ branch ───────────────────────────────── */

export function createReplAiFetcherBranch(
  session: ReplAiSessionState = createReplAiSession(),
): ReplicaFetcherBranch {
  const countEndpointCall = createEndpointCounter({
    countersKey: '__replAiCalls',
    prefix: 'ReplAi__',
    hooksKey: '__replAiTestHooks',
  });

  function conversationMessageCount(conversationId: string): number {
    return session.messages.filter((m) => m.conversationId === conversationId).length;
  }

  function handleReplAiBranch<T>(input: ReplicaBranchInput): { status: number; data: T } | null {
    if (!input.url.includes('/r/ReplAi__')) return null;
    countEndpointCall(input.url);
    const method = input.method.toLowerCase();
    const hooks = readReplAiTestHooks();
    const read = createUrlParamReader(input.url, input.params, input.body);

    // ----- reads (K1) -----
    if (input.url.includes('/r/ReplAi__conversationFindPage') && method === 'get') {
      const items = session.conversations
        .slice()
        .sort((a, b) => (a.pinned === b.pinned ? b.updatedAt - a.updatedAt : a.pinned ? -1 : 1))
        .map((c) => ({ ...c, messageCount: conversationMessageCount(c.id) }));
      return { status: 0, data: { items, total: items.length } as unknown as T };
    }

    if (input.url.includes('/r/ReplAi__messageFindPage') && method === 'get') {
      const conversationId = read('conversationId') ?? '';
      const items = session.messages
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => a.createdAt - b.createdAt);
      return { status: 0, data: { items, total: items.length } as unknown as T };
    }

    // ----- writes (K1) -----
    if (input.url.includes('/r/ReplAi__conversationSave') && method === 'post') {
      const id = typeof input.body.id === 'string' && input.body.id ? input.body.id : '';
      const title = typeof input.body.title === 'string' ? input.body.title : '新会话';
      const existing = id ? session.conversations.find((c) => c.id === id) : undefined;
      if (existing) {
        existing.title = title;
        existing.updatedAt = Date.now();
        return { status: 0, data: { id: existing.id } as unknown as T };
      }
      session.dbSeq += 1;
      const createdId = id || `conv-db-${String(session.dbSeq).padStart(3, '0')}`;
      session.conversations.unshift({
        id: createdId,
        title,
        updatedAt: Date.now(),
        messageCount: 0,
        pinned: false,
      });
      return { status: 0, data: { id: createdId } as unknown as T };
    }

    if (input.url.includes('/r/ReplAi__conversationRename') && method === 'post') {
      const id = typeof input.body.id === 'string' ? input.body.id : '';
      const title = typeof input.body.title === 'string' ? input.body.title : '';
      const target = session.conversations.find((c) => c.id === id);
      if (!target || !title) {
        return { status: 1, data: { msg: 'conversation not found' } as unknown as T };
      }
      target.title = title;
      target.updatedAt = Date.now();
      return { status: 0, data: { id: target.id, title: target.title } as unknown as T };
    }

    if (input.url.includes('/r/ReplAi__conversationDelete') && method === 'post') {
      const id = typeof input.body.id === 'string' ? input.body.id : '';
      if (!session.conversations.some((c) => c.id === id)) {
        return { status: 1, data: { msg: 'conversation not found' } as unknown as T };
      }
      session.conversations = session.conversations.filter((c) => c.id !== id);
      session.messages = session.messages.filter((m) => m.conversationId !== id);
      return { status: 0, data: { id } as unknown as T };
    }

    if (input.url.includes('/r/ReplAi__messageSave') && method === 'post') {
      if (hooks) hooks.lastMessageSaveBody = { ...input.body };
      const conversationId = typeof input.body.conversationId === 'string' ? input.body.conversationId : '';
      const message = input.body.message;
      if (!conversationId || typeof message !== 'object' || message === null) {
        return { status: 1, data: { msg: 'messageSave requires {conversationId, message}' } as unknown as T };
      }
      const row = message as Partial<ReplAiMessage>;
      if (typeof row.id !== 'string' || typeof row.role !== 'string' || row.content === undefined) {
        return { status: 1, data: { msg: 'messageSave payload malformed' } as unknown as T };
      }
      const persisted: ReplAiMessage = {
        id: row.id,
        conversationId,
        role: row.role === 'user' ? 'user' : 'assistant',
        content: typeof row.content === 'string' ? row.content : String(row.content ?? ''),
        sources: Array.isArray(row.sources) ? row.sources : [],
        usage: (typeof row.usage === 'object' && row.usage !== null ? row.usage : DEFAULT_USAGE) as ReplAiUsage,
        refused: row.refused === true,
        createdAt: Date.now(),
      };
      const existingIndex = session.messages.findIndex((m) => m.id === persisted.id);
      if (existingIndex >= 0) session.messages[existingIndex] = persisted;
      else session.messages.push(persisted);
      const conversation = session.conversations.find((c) => c.id === conversationId);
      if (conversation) conversation.updatedAt = Date.now();
      return { status: 0, data: { id: persisted.id, conversationId } as unknown as T };
    }

    if (input.url.includes('/r/ReplAi__feedbackCreate') && method === 'post') {
      if (hooks) hooks.lastFeedbackBody = { ...input.body };
      if (hooks?.failNextMutation === true) {
        hooks.failNextMutation = false;
        return { status: 1, data: { msg: 'FEEDBACK_REJECTED' } as unknown as T };
      }
      return { status: 0, data: { ok: true } as unknown as T };
    }

    // ----- K2 ticket-console subset (plan 807; delegate module) -----
    const k2Handled = handleReplAiK2Branch<T>({
      url: input.url,
      method,
      read,
      body: input.body,
      session,
      hooks,
    });
    if (k2Handled) return k2Handled;

    return null;
  }

  // Opt-in hook lifecycle: the spec owns the global and recreates it per test
  // (CRM/WMS module precedent) — nothing to reset here.
  withOptInHooks<ReplAiTestHooks>('__replAiTestHooks', () => {});

  return handleReplAiBranch;
}

/** `[prefix, handler]` pair consumed by showcase-env createReplicaBranches. */
export function createReplAiFetcherBranches(): Array<readonly [string, ReplicaFetcherBranch]> {
  return [['/r/ReplAi__', createReplAiFetcherBranch()]];
}
