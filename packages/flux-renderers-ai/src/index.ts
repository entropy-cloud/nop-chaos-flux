// ============================================
// @nop-chaos/flux-renderers-ai — public entry (P0 + P1)
// ============================================
//
// P0: ai-chat / ai-message-list / ai-bubble / ai-sender renderers +
// framework-agnostic message engine + React adapter + stream-based connector
// host helper.
// P1 (A2): ai-conversations / ai-welcome / ai-prompts / ai-feedback renderers
// + useConversation host helper + ActionScope namespace `ai` (Layer B) +
// streaming markdown buffer + a11y baseline.

// ---- Group 1: Schema types (renderer authors) ----
export type {
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
  AiCitationSource,
  AiAttachmentItem,
  AiPromptItem,
  AiConversationMenuItem,
  AiBranch,
  AiTokenUsage,
  AiSuggestionItem,
  AiSenderExtensionProps,
} from './schemas.js';

// ---- Group 2a: Renderer entry components (schema-driven; for registry registration) ----
export { AiChatRenderer } from './renderers/ai-chat.js';
export { AiMessageListRenderer } from './renderers/ai-message-list.js';
export { AiBubbleRenderer } from './renderers/ai-bubble/index.js';
export { AiSenderRenderer } from './renderers/ai-sender.js';
export { AiConversationsRenderer } from './renderers/ai-conversations.js';
export { AiWelcomeRenderer } from './renderers/ai-welcome.js';
export { AiPromptsRenderer } from './renderers/ai-prompts.js';
export { AiFeedbackRenderer } from './renderers/ai-feedback.js';
export { AiToolCallRenderer } from './renderers/ai-tool-call.js';
export { AiAttachmentsRenderer, type AiAttachment } from './renderers/ai-attachments.js';
export { AiCitationsRenderer } from './renderers/ai-citations.js';
export { AiVoiceInputRenderer } from './renderers/ai-voice-input.js';
export { AiTokenUsageRenderer } from './renderers/ai-token-usage.js';
export { AiSuggestionsRenderer } from './renderers/ai-suggestions.js';

// ---- Group 2b: Programmatic view components (host composition / custom layouts) ----
export { AiMessageListView } from './renderers/ai-message-list.js';
export { AiBubbleView } from './renderers/ai-bubble/index.js';
export { AiSenderView } from './renderers/ai-sender.js';
export { AiToolCallView } from './renderers/ai-tool-call.js';
export { AiCitationsView } from './renderers/ai-citations.js';
export { AiTokenUsageView } from './renderers/ai-token-usage.js';
export { AiSuggestionsView } from './renderers/ai-suggestions.js';

// ---- Group 3: Host utilities (host app composition; NOT for use inside renderers) ----
export type {
  ChatRole,
  ChatMessage,
  ChatMessageContentPart,
  ChatToolCall,
  ChatToolCallFunction,
  ChatToolCallUIState,
  ChatMessageUIState,
  ChatMessageMetadata,
  AiConversationInfo,
  MessageEngine,
  MessageEngineState,
  MessageEnginePlugin,
  MessageEngineContext,
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  AiToolSchema,
  AiToolFunctionSchema,
  MaybePromise,
  RequestState,
  RequestProcessingState,
  ToolExecutor,
  ToolExecutionResult,
} from './engine/types.js';

export { createMessageEngine, type CreateMessageEngineOptions } from './engine/create-engine.js';
export { createThinkingPlugin } from './engine/plugins/thinking-plugin.js';
export { createToolPlugin } from './engine/plugins/tool-plugin.js';
export { createLengthPlugin } from './engine/plugins/length-plugin.js';
export { createNativeMessageAdapter } from './engine/native-adapter.js';
export { createReactMessageAdapter } from './adapters/react-adapter.js';
export type {
  MessageStateAdapter,
  MessageUpdateKind,
  InternalMessageState,
  PublicMessageState,
} from './engine/types.js';

export { useMessage, type UseMessageOptions, type UseMessageReturn } from './adapters/use-message.js';
export { useEngineView, type UseEngineViewReturn } from './adapters/use-engine-view.js';
export { useAutoScroll, type UseAutoScrollOptions, type UseAutoScrollReturn } from './adapters/use-auto-scroll.js';
export {
  createStreamBasedAiConnector,
  type CreateStreamBasedAiConnectorOptions,
} from './adapters/ai-connector-factory.js';
export { AiChatProvider, useAiChatContext, type AiChatContextValue } from './adapters/ai-chat-context.js';
export type { ConversationStorageStrategy } from './storage/types.js';

// ---- Group 3b: ActionScope namespace `ai` (Layer B, host wiring) ----
export {
  createAiActionProvider,
  AI_NAMESPACE_ACTIONS,
  type CreateAiActionProviderInput,
} from './adapters/ai-action-provider.js';
export {
  createAiComponentHandle,
  AI_COMPONENT_METHODS,
  type AiComponentMethod,
} from './adapters/ai-component-handle.js';
export type {
  AiConversationController,
} from './adapters/ai-conversation-controller.js';

// ---- Group 3c: Host-side conversation manager (P1) ----
export {
  useConversation,
  type UseConversationOptions,
  type UseConversationReturn,
  type AiConversationControllerBridge,
} from './adapters/use-conversation.js';

// ---- Group 4: Registry & registration (host startup) ----
import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { aiRendererDefinitions } from './ai-renderer-definitions.js';

export { aiRendererDefinitions } from './ai-renderer-definitions.js';
export type { AiRendererSchema } from './ai-renderer-definitions.js';

export function registerAiRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, aiRendererDefinitions);
}

export const AI_PACKAGE_VERSION = '0.1.0';
