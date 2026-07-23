import type { ActionSchema, BaseSchema, SchemaInput, SchemaValue } from '@nop-chaos/flux-core';
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
