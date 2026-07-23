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
  /**
   * P2 agentic tool loop: expression resolving to `AiToolSchema[]` (host
   * injects via xui:imports). When set with `toolExecutor`, the engine runs a
   * multi-round tool_calls loop (design.md §engine §8.3).
   */
  tools?: SchemaValue;
  /** Expression resolving to a `ToolExecutor` (host injects via xui:imports). */
  toolExecutor?: SchemaValue;
  /** Max consecutive tool rounds before the loop terminates (default 8). */
  maxToolRounds?: number;
  /**
   * Layer C: explicit component identity for `component:<method>` actions.
   * Defaults to the node id / testid when omitted (design.md §11.1/§14.3).
   */
  componentId?: string;
  componentName?: string;

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
  /**
   * A-16 message branches: host-managed branch set + active id, projected into
   * the `ai-chat` context so each `ai-bubble` can render a prev/next picker for
   * messages that are branch points. The engine stores NO branch set; the host
   * owns full branch history and loads a branch via `component:setMessages`
   * (or `engine.setMessages`) on `onBranchChange`.
   */
  branches?: SchemaValue;
  activeBranchId?: SchemaValue;

  onBranchChange?: ActionSchema;
}

/**
 * A-16: a single message branch. The host builds this list (e.g. keyed by the
 * user message being regenerated) and the engine's `regenerate` stamps
 * `metadata.branchId` on the assistant messages it produces.
 */
export interface AiBranch {
  id: string;
  messageId: string;
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
  /**
   * A-16 message branches: the host-managed branch set this message belongs to.
   * Each entry maps a branch id to a message id; the picker renders prev/next +
   * a counter when the current message's id appears in the set. Omitting it
   * (or an empty list) renders no picker (`branch-no-host-data`).
   */
  branches?: SchemaValue;
  activeBranchId?: SchemaValue;

  onBranchChange?: ActionSchema;
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

// ---- P2 renderers (A3) ----

export interface AiToolCallSchema extends BaseSchema {
  type: 'ai-tool-call';
  /** Expression resolving to a `ChatToolCall`. */
  toolCall?: SchemaValue;
  /** Expression resolving to `ChatToolCallUIState` (status / open / result / approval). */
  state?: SchemaValue;
  /** Whether the args panel is open by default. */
  defaultOpen?: boolean;
  /**
   * P3 HITL (A-14): fired when the user clicks approve/reject. Payload is
   * `{ action: 'approve'|'reject', toolCall, toolCallId }`. The engine only
   * holds `state.approval`; it does NOT mutate it — the host action handler
   * decides the workflow outcome.
   */
  onApproval?: ActionSchema;
}

export interface AiAttachmentItem extends SchemaObject {
  id: string;
  /** Object URL or remote URL. */
  url: string;
  /** File name. */
  name?: string;
  /** MIME type. */
  contentType?: string;
  /** Size in bytes. */
  size?: number;
  /** Upload status (host-driven). */
  status?: 'uploading' | 'success' | 'error';
}

export interface AiAttachmentsSchema extends BaseSchema {
  type: 'ai-attachments';
  /** Controlled attachment list (expression-resolved). */
  value?: SchemaValue;
  /** `image` (thumbnails) or `card` (file rows). Default auto-detects by MIME. */
  mode?: 'image' | 'card' | 'auto';
  /** Accepted file types (HTML `accept` attribute). */
  accept?: string;
  /** Allow multiple files (default true). */
  multiple?: boolean;
  /** Max bytes per file. */
  maxSize?: number;
  /** Max number of files. */
  maxFiles?: number;
  /** Enable drag-and-drop + paste (default true). */
  enableDrop?: boolean;

  onChange?: ActionSchema;
  onError?: ActionSchema;
  onUpload?: ActionSchema;
}

// ---- P3 renderers (A4) ----

/**
 * A single citation source (A-13). `index` is the 1-based `[N]` marker it
 * resolves to; `title` / `url` / `snippet` populate the hover card.
 */
export interface AiCitationSource {
  index: number;
  title?: string;
  url?: string;
  snippet?: string;
}

export interface AiCitationsSchema extends BaseSchema {
  type: 'ai-citations';
  /** Expression resolving to a `ChatMessage` (content source for `[N]` parsing). */
  message?: SchemaValue;
  /** Explicit sources (overrides `metadata.sources` / `data-sources` part). */
  sources?: SchemaValue;
  /**
   * `inline` (default): parse `[N]` in `message.content` and render hoverable
   * `<sup>` markers. `list`: render the sources as a bottom reference list.
   */
  mode?: 'inline' | 'list';

  onSourceClick?: ActionSchema;
}

// ---- P4 renderers (A5) ----

/**
 * A-15: a standalone voice-input button widget. `SpeechRecognition` (Web Speech
 * API) is called directly — it is a user-gesture-triggered browser API (mic
 * input), NOT network IO, so per INV-1 adjudication (`improvement §5.3`) it does
 * NOT go through `RendererEnv`. The recognized transcript is emitted via
 * `onResult`; the host typically feeds it into `ai-sender` draft or
 * `component:sendMessage`.
 */
export interface AiVoiceInputSchema extends BaseSchema {
  type: 'ai-voice-input';
  /** BCP-47 language tag passed to `SpeechRecognition.lang` (e.g. `en-US`). */
  lang?: string;
  /** Continuous recognition (default false — single utterance). */
  continuous?: boolean;
  /** Emit interim (non-final) results (default false). */
  interimResults?: boolean;

  onResult?: ActionSchema;
  onError?: ActionSchema;
}

/**
 * A-17: a pure-display widget that reads token usage from
 * `message.metadata.usage` (populated by the connector) and renders a ring
 * (used / context limit) plus textual counts. When no usage is present it
 * degrades (`token-no-usage`). Cost accounting (rates / pricing) is a host
 * concern — this widget only renders the raw `usage` fields.
 */
export interface AiTokenUsageSchema extends BaseSchema {
  type: 'ai-token-usage';
  /** Expression resolving to a `ChatMessage` whose `metadata.usage` is read. */
  message?: SchemaValue;
  /** Explicit usage (overrides `message.metadata.usage`). */
  usage?: SchemaValue;
  /**
   * Context window cap (max tokens) used for the ring denominator. When
   * omitted the ring renders full / is omitted and only textual counts show.
   */
  contextLimit?: number;
  /** Render the cost field when present (default true). */
  showCost?: boolean;

  onClick?: ActionSchema;
}

/** OpenAI-compatible token usage shape (subset the widget renders). */
export interface AiTokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  /** Optional monetary cost (host/connector fills). */
  cost?: number;
}

/**
 * P4 `ai-suggestions` (demoted from P2 — `ai-prompts` already covers static
 * recommendations). Renders a list of suggestion pills; overflow collapses into
 * a Popover with a counter. `onSelect` fires `{ item, index }`.
 */
export interface AiSuggestionItem extends SchemaObject {
  text: string;
  icon?: string;
}

export interface AiSuggestionsSchema extends BaseSchema {
  type: 'ai-suggestions';
  items?: SchemaValue;
  /** `expand` (show all) / `scroll` (horizontal scroll, default) / `popover` (collapse overflow into a Popover). */
  overflowMode?: 'expand' | 'scroll' | 'popover';
  /** Popover open trigger (popover mode only). */
  trigger?: 'hover' | 'click' | 'manual';
  /** Max visible pills before overflow kicks in (popover mode, default 3). */
  maxVisible?: number;

  onSelect?: ActionSchema;
}
