import type { RendererRouteEntry } from './route-model.js';

/**
 * C8.1 ai conversation main-chain lab routes
 * (ai-chat / ai-message-list / ai-bubble / ai-sender / ai-conversations).
 * Extracted from route-model.ts to keep files within the lint max-lines budget
 * (content-renderer-routes.ts precedent).
 */
export const AI_RENDERER_ROUTES: RendererRouteEntry[] = [
  {
    id: 'ai-chat',
    title: 'AI Chat',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    description:
      'Conversation panel root: message engine lifecycle, host scope projection, stream/send/abort and bug 73 dialog hosting (lab: mock connector streaming).',
  },
  {
    id: 'ai-message-list',
    title: 'AI Message List',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    description:
      'Conversation message list: role=log aria-live, auto-scroll, 200-message virtual windowing and empty state.',
  },
  {
    id: 'ai-bubble',
    title: 'AI Bubble',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    description:
      'Conversation message bubble: content-renderer registry (markdown/error/loading), placement/shape, timestamp footer and branch picker.',
  },
  {
    id: 'ai-sender',
    title: 'AI Sender',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    description:
      'Conversation input: IME-guarded submit modes, word limit, loading cancel and host-injected rich-text extension path.',
  },
  {
    id: 'ai-conversations',
    title: 'AI Conversations',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    description:
      'Conversation list sidebar: new/switch/rename/delete schema events with scope-owned list data.',
  },
];
