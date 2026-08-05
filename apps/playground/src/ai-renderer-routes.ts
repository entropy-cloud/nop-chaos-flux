import type { RendererRouteEntry } from './route-model.js';

/**
 * C8.1/C8.2/C8.3 ai renderer lab routes
 * (ai-chat / ai-message-list / ai-bubble / ai-sender / ai-conversations /
 * ai-tool-call / ai-attachments / ai-citations / ai-feedback / ai-token-usage /
 * ai-prompts / ai-suggestions / ai-voice-input / ai-welcome).
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
  {
    id: 'ai-tool-call',
    title: 'AI Tool Call',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    description:
      'Tool invocation card: status transitions, args expand/collapse, HITL approval with focus trap and dialog hosting (bug 73 pattern).',
  },
  {
    id: 'ai-attachments',
    title: 'AI Attachments',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    description:
      'Multimodal attachment uploader/preview: image/card modes, validation, URL/file-name safety and dialog hosting (bug 73 pattern).',
  },
  {
    id: 'ai-citations',
    title: 'AI Citations',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    description:
      'Inline [N] citation markers with hoverable source cards, popover source body and schema-driven onSourceClick payload resolution.',
  },
  {
    id: 'ai-feedback',
    title: 'AI Feedback',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    description:
      'Message footer action bar: copy/refresh/like/dislike/sources with local echo and schema-driven onAction payload resolution.',
  },
  {
    id: 'ai-token-usage',
    title: 'AI Token Usage',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    description:
      'Pure-display token/cost widget reading message.metadata.usage: SVG context ring, data-empty placeholder and onClick payload resolution.',
  },
  {
    id: 'ai-prompts',
    title: 'AI Prompts',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    description:
      'Static recommendation prompt cards (vertical/horizontal/wrap + sm/md/lg): schema-driven items and onSelect payload resolution (bug 73 dialog hosting).',
  },
  {
    id: 'ai-suggestions',
    title: 'AI Suggestions',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    description:
      'In-conversation suggestion pills: expand/scroll/popover overflow modes with +N collapse and onSelect payload resolution.',
  },
  {
    id: 'ai-voice-input',
    title: 'AI Voice Input',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    description:
      'Web Speech API microphone button (user-gesture browser API, non-IO per INV-1): onResult/onError payload resolution and unsupported-browser degradation.',
  },
  {
    id: 'ai-welcome',
    title: 'AI Welcome',
    category: 'advanced',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    description:
      'Empty-state welcome panel: icon/title/description/align plus a footer value-or-region slot for nested host components.',
  },
];
