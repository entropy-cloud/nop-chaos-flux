import type { RendererDefinition } from '@nop-chaos/flux-core';
import { AiChatRenderer } from './renderers/ai-chat.js';
import { AiMessageListRenderer } from './renderers/ai-message-list.js';
import { AiBubbleRenderer } from './renderers/ai-bubble/index.js';
import { AiSenderRenderer } from './renderers/ai-sender.js';
import type {
  AiChatSchema,
  AiMessageListSchema,
  AiBubbleSchema,
  AiSenderSchema,
} from './schemas.js';

/**
 * P0 AI renderer definitions. Fields follow the standard `prop / region /
 * value-or-region / event` kinds (no new RendererDefinition fields, design.md
 * §18.1 #9).
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
];

export type AiRendererSchema =
  | AiChatSchema
  | AiMessageListSchema
  | AiBubbleSchema
  | AiSenderSchema;
