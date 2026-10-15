import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { AiChatRenderer } from './renderers/ai-chat.js';
import { AiMessageListRenderer } from './renderers/ai-message-list.js';
import { AiBubbleRenderer } from './renderers/ai-bubble/index.js';
import { AiSenderRenderer } from './renderers/ai-sender.js';
import { AiConversationsRenderer } from './renderers/ai-conversations.js';
import { AiWelcomeRenderer } from './renderers/ai-welcome.js';
import { AiPromptsRenderer } from './renderers/ai-prompts.js';
import { AiFeedbackRenderer } from './renderers/ai-feedback.js';
import { AiToolCallRenderer } from './renderers/ai-tool-call.js';
import { AiAttachmentsRenderer } from './renderers/ai-attachments.js';
import { AiCitationsRenderer } from './renderers/ai-citations.js';
import { AiVoiceInputRenderer } from './renderers/ai-voice-input.js';
import { AiTokenUsageRenderer } from './renderers/ai-token-usage.js';
import { AiSuggestionsRenderer } from './renderers/ai-suggestions.js';
import type {
  AiChatSchema,
  AiMessageListSchema,
  AiBubbleSchema,
  AiSenderSchema,
  AiConversationsSchema,
  AiWelcomeSchema,
  AiPromptsSchema,
  AiFeedbackSchema,
  AiToolCallSchema,
  AiAttachmentsSchema,
  AiCitationsSchema,
  AiVoiceInputSchema,
  AiTokenUsageSchema,
  AiSuggestionsSchema,
} from './schemas.js';

/**
 * AI renderer definitions. P0: ai-chat / ai-message-list / ai-bubble /
 * ai-sender. P1: ai-conversations / ai-welcome / ai-prompts / ai-feedback.
 * Fields follow the standard `prop / region / value-or-region / event` kinds
 * (no new RendererDefinition fields, design.md §18.1 #9).
 *
 * Plan 462 (2026-08-23): every union / literal / boolean prop below is
 * registered as a `propContracts` entry so the schema compiler catches
 * typos at compile time (e.g. `mode: "imag"` → `invalid-property-value`
 * listing the 3 valid modes). The contracts mirror the TypeScript
 * union declarations in `schemas.ts` 1:1; new fields added to
 * `schemas.ts` must also be added here.
 */

const SUBMIT_TYPE_LITERALS = ['enter', 'ctrlEnter', 'shiftEnter'] as const;
const BUBBLE_PLACEMENT_LITERALS = ['start', 'end', 'auto'] as const;
const BUBBLE_SHAPE_LITERALS = ['corner', 'rounded', 'none'] as const;
const WELCOME_ALIGN_LITERALS = ['left', 'center', 'right'] as const;
const PROMPTS_LAYOUT_LITERALS = ['vertical', 'horizontal', 'wrap'] as const;
const PROMPTS_SIZE_LITERALS = ['sm', 'md', 'lg'] as const;
const ATTACHMENTS_MODE_LITERALS = ['image', 'card', 'auto'] as const;
const CITATIONS_MODE_LITERALS = ['inline', 'list'] as const;
const SUGGESTIONS_OVERFLOW_LITERALS = ['expand', 'scroll', 'popover'] as const;
const FEEDBACK_ACTION_LITERALS = ['copy', 'refresh', 'like', 'dislike', 'sources'] as const;

const submitTypeContract = {
  displayName: 'Submit Type',
  shape: {
    kind: 'union' as const,
    anyOf: SUBMIT_TYPE_LITERALS.map((v) => ({ kind: 'literal' as const, value: v })),
  },
  editorType: 'select',
  defaultValue: 'enter',
};
const booleanContract = (displayName: string) => ({
  displayName,
  shape: { kind: 'boolean' as const },
  editorType: 'switch',
});

export const aiRendererDefinitions: RegisteredRendererDefinition[] = [
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
      { key: 'submitType', kind: 'prop', contract: submitTypeContract },
      { key: 'maxLength', kind: 'prop' },
      { key: 'showWordLimit', kind: 'prop', valueType: 'boolean', contract: booleanContract('Show Word Limit') },
      { key: 'showTimestamp', kind: 'prop', valueType: 'boolean', contract: booleanContract('Show Timestamp') },
      { key: 'showAvatar', kind: 'prop', valueType: 'boolean', contract: booleanContract('Show Avatar') },
      { key: 'initialMessages', kind: 'prop' },
      { key: 'senderExtensions', kind: 'prop' },
      { key: 'conversationController', kind: 'prop' },
      { key: 'activeConversationId', kind: 'prop' },
      { key: 'engine', kind: 'prop' },
      { key: 'tools', kind: 'prop' },
      { key: 'toolExecutor', kind: 'prop' },
      { key: 'maxToolRounds', kind: 'prop' },
      { key: 'componentId', kind: 'prop' },
      { key: 'componentName', kind: 'prop' },
      { key: 'header', kind: 'region', regionKey: 'header' },
      { key: 'beforeMessages', kind: 'value-or-region', regionKey: 'beforeMessages' },
      { key: 'afterMessages', kind: 'value-or-region', regionKey: 'afterMessages' },
      { key: 'emptyState', kind: 'value-or-region', regionKey: 'emptyState' },
      { key: 'footer', kind: 'region', regionKey: 'footer' },
      { key: 'onResponseComplete', kind: 'event' },
      { key: 'onError', kind: 'event' },
      { key: 'onAbort', kind: 'event' },
      { key: 'onConversationChange', kind: 'event' },
      { key: 'branches', kind: 'prop' },
      { key: 'activeBranchId', kind: 'prop' },
      { key: 'onBranchChange', kind: 'event' },
      { key: 'onApproval', kind: 'event' },
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
      { key: 'autoScroll', kind: 'prop', valueType: 'boolean', contract: booleanContract('Auto Scroll') },
      { key: 'showTimestamp', kind: 'prop', valueType: 'boolean', contract: booleanContract('Show Timestamp') },
      { key: 'showAvatar', kind: 'prop', valueType: 'boolean', contract: booleanContract('Show Avatar') },
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
      {
        key: 'placement',
        kind: 'prop',
        contract: {
          displayName: 'Placement',
          shape: {
            kind: 'union',
            anyOf: BUBBLE_PLACEMENT_LITERALS.map((v) => ({ kind: 'literal', value: v })),
          },
          editorType: 'select',
          defaultValue: 'auto',
        },
      },
      {
        key: 'shape',
        kind: 'prop',
        contract: {
          displayName: 'Shape',
          shape: {
            kind: 'union',
            anyOf: BUBBLE_SHAPE_LITERALS.map((v) => ({ kind: 'literal', value: v })),
          },
          editorType: 'select',
          defaultValue: 'corner',
        },
      },
      { key: 'showAvatar', kind: 'prop', valueType: 'boolean', contract: booleanContract('Show Avatar') },
      { key: 'showTimestamp', kind: 'prop', valueType: 'boolean', contract: booleanContract('Show Timestamp') },
      { key: 'avatar', kind: 'prop' },
      { key: 'branches', kind: 'prop' },
      { key: 'activeBranchId', kind: 'prop' },
      { key: 'onBranchChange', kind: 'event' },
      { key: 'onApproval', kind: 'event' },
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
      { key: 'maxLength', kind: 'prop' },
      { key: 'showWordLimit', kind: 'prop', valueType: 'boolean', contract: booleanContract('Show Word Limit') },
      { key: 'submitType', kind: 'prop', contract: submitTypeContract },
      { key: 'clearOnSubmit', kind: 'prop', valueType: 'boolean', contract: booleanContract('Clear On Submit') },
      { key: 'senderExtensions', kind: 'prop' },
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
      {
        key: 'showRenameControls',
        kind: 'prop',
        valueType: 'boolean',
        contract: booleanContract('Show Rename Controls')
      },
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
      { key: 'iconLucide', kind: 'prop' },
      {
        key: 'align',
        kind: 'prop',
        contract: {
          displayName: 'Align',
          shape: {
            kind: 'union',
            anyOf: WELCOME_ALIGN_LITERALS.map((v) => ({ kind: 'literal', value: v })),
          },
          editorType: 'select',
          defaultValue: 'center',
        },
      },
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
      {
        key: 'layout',
        kind: 'prop',
        contract: {
          displayName: 'Layout',
          shape: {
            kind: 'union',
            anyOf: PROMPTS_LAYOUT_LITERALS.map((v) => ({ kind: 'literal', value: v })),
          },
          editorType: 'select',
          defaultValue: 'vertical',
        },
      },
      {
        key: 'size',
        kind: 'prop',
        contract: {
          displayName: 'Size',
          shape: {
            kind: 'union',
            anyOf: PROMPTS_SIZE_LITERALS.map((v) => ({ kind: 'literal', value: v })),
          },
          editorType: 'select',
          defaultValue: 'md',
        },
      },
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
      {
        key: 'actions',
        kind: 'prop',
        contract: {
          displayName: 'Actions',
          shape: {
            kind: 'array',
            item: {
              kind: 'union',
              anyOf: FEEDBACK_ACTION_LITERALS.map((v) => ({ kind: 'literal', value: v })),
            },
          },
          editorType: 'multi-select',
          defaultValue: ['copy', 'refresh', 'like', 'dislike', 'sources'],
        },
      },
      { key: 'onAction', kind: 'event' },
    ],
  },
  {
    type: 'ai-tool-call',
    displayName: 'AI Tool Call',
    category: 'ai',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    defaultSchema: { type: 'ai-tool-call' },
    component: AiToolCallRenderer,
    fields: [
      { key: 'toolCall', kind: 'prop' },
      { key: 'state', kind: 'prop' },
      { key: 'defaultOpen', kind: 'prop', valueType: 'boolean', contract: booleanContract('Default Open') },
      { key: 'onApproval', kind: 'event' },
    ],
  },
  {
    type: 'ai-attachments',
    displayName: 'AI Attachments',
    category: 'ai',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    defaultSchema: { type: 'ai-attachments' },
    component: AiAttachmentsRenderer,
    fields: [
      { key: 'value', kind: 'prop' },
      {
        key: 'mode',
        kind: 'prop',
        contract: {
          displayName: 'Mode',
          shape: {
            kind: 'union',
            anyOf: ATTACHMENTS_MODE_LITERALS.map((v) => ({ kind: 'literal', value: v })),
          },
          editorType: 'select',
          defaultValue: 'auto',
        },
      },
      { key: 'accept', kind: 'prop' },
      { key: 'multiple', kind: 'prop', valueType: 'boolean', contract: booleanContract('Multiple') },
      { key: 'maxSize', kind: 'prop' },
      { key: 'maxFiles', kind: 'prop' },
      { key: 'enableDrop', kind: 'prop', valueType: 'boolean', contract: booleanContract('Enable Drop') },
      { key: 'onChange', kind: 'event' },
      { key: 'onError', kind: 'event' },
      { key: 'onUpload', kind: 'event' },
    ],
  },
  {
    type: 'ai-citations',
    displayName: 'AI Citations',
    category: 'ai',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    defaultSchema: { type: 'ai-citations' },
    component: AiCitationsRenderer,
    fields: [
      { key: 'message', kind: 'prop' },
      { key: 'sources', kind: 'prop' },
      {
        key: 'mode',
        kind: 'prop',
        contract: {
          displayName: 'Mode',
          shape: {
            kind: 'union',
            anyOf: CITATIONS_MODE_LITERALS.map((v) => ({ kind: 'literal', value: v })),
          },
          editorType: 'select',
          defaultValue: 'inline',
        },
      },
      { key: 'onSourceClick', kind: 'event' },
    ],
  },
  {
    type: 'ai-voice-input',
    displayName: 'AI Voice Input',
    category: 'ai',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    defaultSchema: { type: 'ai-voice-input' },
    component: AiVoiceInputRenderer,
    fields: [
      { key: 'lang', kind: 'prop' },
      { key: 'continuous', kind: 'prop', valueType: 'boolean', contract: booleanContract('Continuous') },
      { key: 'interimResults', kind: 'prop', valueType: 'boolean', contract: booleanContract('Interim Results') },
      { key: 'onResult', kind: 'event' },
      { key: 'onError', kind: 'event' },
    ],
  },
  {
    type: 'ai-token-usage',
    displayName: 'AI Token Usage',
    category: 'ai',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    defaultSchema: { type: 'ai-token-usage' },
    component: AiTokenUsageRenderer,
    fields: [
      { key: 'message', kind: 'prop' },
      { key: 'usage', kind: 'prop' },
      { key: 'contextLimit', kind: 'prop' },
      { key: 'showCost', kind: 'prop', valueType: 'boolean', contract: booleanContract('Show Cost') },
      { key: 'onClick', kind: 'event' },
    ],
  },
  {
    type: 'ai-suggestions',
    displayName: 'AI Suggestions',
    category: 'ai',
    sourcePackage: '@nop-chaos/flux-renderers-ai',
    defaultSchema: { type: 'ai-suggestions' },
    component: AiSuggestionsRenderer,
    fields: [
      { key: 'items', kind: 'prop' },
      {
        key: 'overflowMode',
        kind: 'prop',
        contract: {
          displayName: 'Overflow Mode',
          shape: {
            kind: 'union',
            anyOf: SUGGESTIONS_OVERFLOW_LITERALS.map((v) => ({ kind: 'literal', value: v })),
          },
          editorType: 'select',
          defaultValue: 'expand',
        },
      },
      { key: 'maxVisible', kind: 'prop' },
      { key: 'onSelect', kind: 'event' },
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
  | AiFeedbackSchema
  | AiToolCallSchema
  | AiAttachmentsSchema
  | AiCitationsSchema
  | AiVoiceInputSchema
  | AiTokenUsageSchema
  | AiSuggestionsSchema;
