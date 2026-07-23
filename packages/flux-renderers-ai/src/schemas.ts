import type { ActionSchema, BaseSchema, SchemaInput, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';
import type { ChatRole } from './engine/types.js';

export interface AiChatSchema extends BaseSchema {
  type: 'ai-chat';
  /** Expression resolving to an `AiConnector` instance (host injects via xui:imports). */
  connector?: SchemaValue;
  conversationId?: string;
  placeholder?: string;
  systemPrompt?: string;
  autofocus?: boolean;
  submitType?: 'enter' | 'ctrlEnter' | 'shiftEnter';
  maxLength?: number;
  showWordLimit?: boolean;
  initialMessages?: SchemaValue;
  /**
   * Optional host-side conversation controller (expression-resolved, typically
   * `${$ai.controller}`). When bound, the `ai` namespace's conversation actions
   * delegate to it. P1 (design.md §14.2).
   */
  conversationController?: SchemaValue;
  /** Optional scope-owned active conversation id (host manages via useConversation). */
  activeConversationId?: SchemaValue;

  header?: SchemaInput;
  footer?: SchemaInput;
  beforeMessages?: SchemaInput;
  afterMessages?: SchemaInput;
  emptyState?: SchemaInput;

  onSend?: ActionSchema;
  onResponseComplete?: ActionSchema;
  onError?: ActionSchema;
  onAbort?: ActionSchema;
  onConversationChange?: ActionSchema;
}

export interface AiMessageListSchema extends BaseSchema {
  type: 'ai-message-list';
  groupStrategy?: 'consecutive' | 'divider' | 'none';
  dividerRole?: ChatRole;
  autoScroll?: boolean;
  maxGroupSize?: number;
  itemRegion?: SchemaInput;
  emptyRegion?: SchemaInput;
}

export interface AiBubbleSchema extends BaseSchema {
  type: 'ai-bubble';
  message?: SchemaValue;
  placement?: 'start' | 'end' | 'auto';
  shape?: 'corner' | 'rounded' | 'none';
  showAvatar?: boolean;
  showTimestamp?: boolean;
  avatarRegion?: SchemaInput;
  contentResolverName?: string;
}

export interface AiSenderSchema extends BaseSchema {
  type: 'ai-sender';
  placeholder?: string;
  loading?: SchemaValue;
  autofocus?: boolean;
  maxLength?: number;
  showWordLimit?: boolean;
  submitType?: 'enter' | 'ctrlEnter' | 'shiftEnter';
  clearOnSubmit?: boolean;
  actions?: SchemaInput;

  onSubmit?: ActionSchema;
  onCancel?: ActionSchema;
  onChange?: ActionSchema;
}

// ---- P1 renderers (A2) ----

export interface AiConversationMenuItem extends SchemaObject {
  key: string;
  label?: string;
}

export interface AiConversationsSchema extends BaseSchema {
  type: 'ai-conversations';
  /** Expression resolving to `AiConversationInfo[]` (scope-owned, host manages). */
  conversations?: SchemaValue;
  /** Expression resolving to the active conversation id. */
  activeId?: SchemaValue;
  showRenameControls?: boolean;
  menuItems?: SchemaValue;

  onItemClick?: ActionSchema;
  onItemRename?: ActionSchema;
  onItemDelete?: ActionSchema;
  onCreate?: ActionSchema;
}

export interface AiWelcomeSchema extends BaseSchema {
  type: 'ai-welcome';
  title?: string;
  description?: string;
  icon?: string;
  align?: 'left' | 'center' | 'right';
  footer?: SchemaInput;
}

export interface AiPromptItem extends SchemaObject {
  label: string;
  description?: string;
  icon?: string;
  badge?: string;
}

export interface AiPromptsSchema extends BaseSchema {
  type: 'ai-prompts';
  items?: SchemaValue;
  layout?: 'vertical' | 'horizontal' | 'wrap';
  size?: 'sm' | 'md' | 'lg';

  onSelect?: ActionSchema;
}

export interface AiFeedbackSchema extends BaseSchema {
  type: 'ai-feedback';
  /** Expression resolving to a `ChatMessage` (content source for copy / refresh). */
  message?: SchemaValue;
  actions?: SchemaValue;

  onAction?: ActionSchema;
}
