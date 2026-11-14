import { useEffect, useMemo, useRef } from 'react';
import type { RendererEnv, SchemaInput } from '@nop-chaos/flux-core';
import { useConversation, type ChatMessage } from '@nop-chaos/flux-renderers-ai';
import { ShowcaseSchemaHost } from './shared/render-host';
import { PageFrame } from './shared/page-frame';
import { createMockAiConnector } from '../ai/mock-ai-env';
import { mockToolSchemas, mockToolExecutor } from '../ai/tool-mock';
import pihWorkspaceSchema from './page-schemas/pih-workspace.json';

const SEED_TS = 1_757_000_000_000;

/**
 * Seed conversation mirroring the reference screenshot: the user's "hi" and a
 * reasoning + tool-call assistant turn (rendered by the real `ai-bubble`
 * reasoning / tool-call renderers).
 */
const SEED_MESSAGES: ChatMessage[] = [
  {
    id: 'pih-seed-user',
    role: 'user',
    content: 'hi',
    metadata: { createdAt: SEED_TS },
  },
  {
    id: 'pih-seed-assistant',
    role: 'assistant',
    content: 'Hi! What can I help you with today?',
    reasoning_content: 'The user just said "hi". I should respond concisely and friendly.',
    tool_calls: [
      {
        index: 0,
        id: 'pih-seed-call-1',
        type: 'function',
        function: { name: 'read_file', arguments: '{"path":"src/index.ts"}' },
      },
    ],
    state: {
      thinking: { open: true },
      toolCall: {
        'pih-seed-call-1': { status: 'success', result: 'export const answer = 42;' },
      },
    },
    metadata: { createdAt: SEED_TS + 900, model: 'deepseek/deepseek-v4-pro' },
  },
];

/**
 * Pi-Harness workspace replica host. Unlike the pure `SchemaPage` complex
 * pages, this page needs host-owned AI state: a `useConversation` manager so
 * the `ai-conversations` sidebar (create / switch / rename / delete) and the
 * `ai-chat` surface share one engine set. That live state cannot live in the
 * static `PAGE_DATA` map, so the page overrides its registry entry with this
 * host and hands the controller / connector / conversations through the
 * `data` prop (the bug-163 `xui:imports`-free pattern).
 */
export function PihWorkspaceHost({ env }: { env: RendererEnv }) {
  const connector = useMemo(() => createMockAiConnector(env), [env]);
  const conversations = useConversation({
    connector,
    initialConversations: [{ id: 'hi', title: 'hi', createdAt: SEED_TS, updatedAt: SEED_TS }],
    createEngineOptions: {
      tools: mockToolSchemas,
      toolExecutor: mockToolExecutor,
      maxToolRounds: 5,
    },
  });

  const { activeEngine } = conversations;
  const seededRef = useRef(false);
  useEffect(() => {
    if (!activeEngine || seededRef.current) return;
    seededRef.current = true;
    if (activeEngine.getMessages().length === 0) {
      activeEngine.setMessages(SEED_MESSAGES);
    }
    // Seed conversation lands mid-scroll (message list restores scrollTop or
    // defaults to 0) — pin the initial view to the latest turn.
    const timer = window.setTimeout(() => {
      const list = document.querySelector('.nop-ai-message-list');
      if (list) list.scrollTop = list.scrollHeight;
    }, 400);
    return () => window.clearTimeout(timer);
  }, [activeEngine]);

  const data = useMemo(
    () => ({
      connector,
      controller: conversations.controller,
      activeEngine: conversations.activeEngine,
      conversations: conversations.conversations,
      activeConversationId: conversations.activeConversationId,
      tools: mockToolSchemas,
      toolExecutor: mockToolExecutor,
      usage: { prompt_tokens: 5000, completion_tokens: 27, total_tokens: 5027 },
      // Front-end UI state simulated in the schema (setValue targets). Seeded
      // here so every expression has a defined initial value.
      pihRail: 'work',
      pihSection: 'workspace',
      pihSidebarCollapsed: false,
      pihFilesOpen: false,
      pihSound: true,
      pihSearchOpen: false,
      pihHistoryOpen: false,
      pihModelMenu: false,
      pihToolMenu: false,
      pihModel: 'DeepSeek / DeepSeek-V4-Pro · ultra',
      pihToolPreset: 'default',
      // Project picker
      pihProjectDialogOpen: false,
      pihProject: '',
      // Git view
      pihGitBase: 'main',
      pihGitHead: 'feature/ui',
      pihGitFile: 'src/index.ts',
      pihGitDiffMode: 'unified',
      pihGitCommitMsg: '',
      // Model view
      pihModelDefault: 'DeepSeek / DeepSeek-V4-Pro · ultra',
      // Capabilities view
      pihCapRead: true,
      pihCapWeather: true,
      pihCapSearch: false,
      pihCapGit: true,
      // Preferences view
      pihTheme: 'light',
      pihFont: 'm',
      pihTelemetry: false,
    }),
    [
      connector,
      conversations.controller,
      conversations.activeEngine,
      conversations.conversations,
      conversations.activeConversationId,
    ],
  );

  return (
    <PageFrame testid="pih-workspace-frame">
      <ShowcaseSchemaHost
        schemaUrl="showcase://pih-workspace/page"
        schema={pihWorkspaceSchema as unknown as SchemaInput}
        env={env}
        data={data}
      />
    </PageFrame>
  );
}
