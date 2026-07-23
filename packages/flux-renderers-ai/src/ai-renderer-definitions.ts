import type { RendererDefinition } from '@nop-chaos/flux-core';
import { AiChatRenderer } from './renderers/ai-chat.js';
import { AiMessageListRenderer } from './renderers/ai-message-list.js';
import { AiBubbleRenderer } from './renderers/ai-bubble/index.js';
import { AiSenderRenderer } from './renderers/ai-sender.js';
import { AiConversationsRenderer } from './renderers/ai-conversations.js';
import { AiWelcomeRenderer } from './renderers/ai-welcome.js';
import { AiPromptsRenderer } from './renderers/ai-prompts.js';
import { AiFeedbackRenderer } from './renderers/ai-feedback.js';
import type {
  AiChatSchema,
  AiMessageListSchema,
  AiBubbleSchema,
  AiSenderSchema,
  AiConversationsSchema,
  AiWelcomeSchema,
  AiPromptsSchema,
  AiFeedbackSchema,
} from './schemas.js';

/**
 * AI renderer definitions. P0: ai-chat / ai-message-list / ai-bubble /
 * ai-sender. P1: ai-conversations / ai-welcome / ai-prompts / ai-feedback.
 * Fields follow the standard `prop / region / value-or-region / event` kinds
 * (no new RendererDefinition fields, design.md §18.1 #9).
 */
export const aiRendererDefinitions: RendererDefinition[] = [
  {
    type: 'ai-chat',
    displayName: 'AI Chat',
    category: 'ai',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    defaultSchema: { type: 'ai-chat' },
    component: AiChatRenderer,
    fields: [
      { key: 'connector', kind: 'prop' },
      { key: 'placeholder', kind: 'prop' },
      { key: 'systemPrompt', kind: 'prop' },
      { key: 'submitType', kind: 'prop' },
      { key: 'maxLength', kind: 'prop' },
      { key: 'showWordLimit', kind: 'prop', valueType: 'boolean' },
      { key: 'autofocus', kind: 'prop', valueType: 'boolean' },
      { key: 'initialMessages', kind: 'prop' },
      { key: 'conversationController', kind: 'prop' },
      { key: 'activeConversationId', kind: 'prop' },
      { key: 'header', kind: 'region', regionKey: 'header' },
      { key: 'beforeMessages', kind: 'value-or-region', regionKey: 'beforeMessages' },
      { key: 'afterMessages', kind: 'value-or-region', regionKey: 'afterMessages' },
      { key: 'emptyState', kind: 'value-or-region', regionKey: 'emptyState' },
      { key: 'footer', kind: 'region', regionKey: 'footer' },
      { key: 'onSend', kind: 'event' },
      { key: 'onResponseComplete', kind: 'event' },
      { key: 'onError', kind: 'event' },
      { key: 'onAbort', kind: 'event' },
      { key: 'onConversationChange', kind: 'event' },
    ],
  },
  {
    type: 'ai-message-list',
    displayName: 'AI Message List',
    category: 'ai',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    defaultSchema: { type: 'ai-message-list' },
    component: AiMessageListRenderer,
    fields: [
      { key: 'groupStrategy', kind: 'prop' },
      { key: 'dividerRole', kind: 'prop' },
      { key: 'autoScroll', kind: 'prop', valueType: 'boolean' },
      { key: 'maxGroupSize', kind: 'prop' },
      { key: 'itemRegion', kind: 'region', regionKey: 'itemRegion' },
      { key: 'emptyRegion', kind: 'value-or-region', regionKey: 'emptyRegion' },
    ],
  },
  {
    type: 'ai-bubble',
    displayName: 'AI Bubble',
    category: 'ai',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    defaultSchema: { type: 'ai-bubble' },
    component: AiBubbleRenderer,
    fields: [
      { key: 'message', kind: 'prop' },
      { key: 'placement', kind: 'prop' },
      { key: 'shape', kind: 'prop' },
      { key: 'showAvatar', kind: 'prop', valueType: 'boolean' },
      { key: 'showTimestamp', kind: 'prop', valueType: 'boolean' },
      { key: 'avatarRegion', kind: 'region', regionKey: 'avatarRegion' },
      { key: 'contentResolverName', kind: 'prop' },
    ],
  },
  {
    type: 'ai-sender',
    displayName: 'AI Sender',
    category: 'ai',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    defaultSchema: { type: 'ai-sender' },
    component: AiSenderRenderer,
    fields: [
      { key: 'placeholder', kind: 'prop' },
      { key: 'loading', kind: 'prop' },
      { key: 'autofocus', kind: 'prop', valueType: 'boolean' },
      { key: 'maxLength', kind: 'prop' },
      { key: 'showWordLimit', kind: 'prop', valueType: 'boolean' },
      { key: 'submitType', kind: 'prop' },
      { key: 'clearOnSubmit', kind: 'prop', valueType: 'boolean' },
      { key: 'actions', kind: 'region', regionKey: 'actions' },
      { key: 'onSubmit', kind: 'event' },
      { key: 'onCancel', kind: 'event' },
      { key: 'onChange', kind: 'event' },
    ],
  },
  {
    type: 'ai-conversations',
    displayName: 'AI Conversations',
    category: 'ai',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    defaultSchema: { type: 'ai-conversations' },
    component: AiConversationsRenderer,
    fields: [
      { key: 'conversations', kind: 'prop' },
      { key: 'activeId', kind: 'prop' },
      { key: 'showRenameControls', kind: 'prop', valueType: 'boolean' },
      { key: 'menuItems', kind: 'prop' },
      { key: 'onItemClick', kind: 'event' },
      { key: 'onItemRename', kind: 'event' },
      { key: 'onItemDelete', kind: 'event' },
      { key: 'onCreate', kind: 'event' },
    ],
  },
  {
    type: 'ai-welcome',
    displayName: 'AI Welcome',
    category: 'ai',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    defaultSchema: { type: 'ai-welcome' },
    component: AiWelcomeRenderer,
    fields: [
      { key: 'title', kind: 'prop' },
      { key: 'description', kind: 'prop' },
      { key: 'icon', kind: 'prop' },
      { key: 'align', kind: 'prop' },
      { key: 'footer', kind: 'value-or-region', regionKey: 'footer' },
    ],
  },
  {
    type: 'ai-prompts',
    displayName: 'AI Prompts',
    category: 'ai',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    defaultSchema: { type: 'ai-prompts' },
    component: AiPromptsRenderer,
    fields: [
      { key: 'items', kind: 'prop' },
      { key: 'layout', kind: 'prop' },
      { key: 'size', kind: 'prop' },
      { key: 'onSelect', kind: 'event' },
    ],
  },
  {
    type: 'ai-feedback',
    displayName: 'AI Feedback',
    category: 'ai',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    defaultSchema: { type: 'ai-feedback' },
    component: AiFeedbackRenderer,
    fields: [
      { key: 'message', kind: 'prop' },
      { key: 'actions', kind: 'prop' },
      { key: 'onAction', kind: 'event' },
    ],
  },
];

export type AiRendererSchema =
  | AiChatSchema
  | AiMessageListSchema
  | AiBubbleSchema
  | AiSenderSchema
  | AiConversationsSchema
  | AiWelcomeSchema
  | AiPromptsSchema
  | AiFeedbackSchema;
