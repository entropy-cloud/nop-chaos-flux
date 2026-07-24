// ============================================
// @nop-chaos/flux-renderers-ai/rich-text — subpath entry
// ============================================
//
// P6 (A6): host-injected Tiptap rich-text editor for `ai-sender`. This subpath
// is OPT-IN: hosts that do not `import '@nop-chaos/flux-renderers-ai/rich-text'`
// never pull Tiptap into their bundle (Tiptap is an optional peerDep).
//
// Contract invariant (design.md §18.2 #11 + INV-1): `src/engine/`, `src/renderers/`
// and `src/adapters/` MUST NOT import Tiptap or anything from this folder —
// only host code (or the playground) imports from `./rich-text`. The
// `contract-honesty.test.ts` guard automates this invariant.
//
// Runtime: `createTiptapSender(options)` returns a `React.ComponentType<AiSenderExtensionProps>`
// that the host registers via `xui:imports` (typically `${$ai.tiptapSender}`)
// and binds to `ai-sender.senderExtensions`. The editor serializes content to
// plain text (`editor.getText()`) before emitting `onChange`/`onSubmit`, so the
// message-engine contract (`sendMessage(text: string)`) is unchanged.

import type { AiSenderExtensionProps } from '../schemas.js';
import type {
  TiptapSenderComponent,
  TiptapSenderOptions,
  TiptapMentionItem,
  TiptapTemplateItem,
  TiptapSlashCommandItem,
  TiptapBuiltinExtension,
} from './types.js';
import { TiptapSender } from './tiptap-sender.js';

// Re-export the public types so the subpath is self-contained. All erased at
// compile time — importing the types does NOT pull Tiptap into the host
// bundle.
export type {
  AiSenderExtensionProps,
  TiptapSenderComponent,
  TiptapSenderOptions,
  TiptapMentionItem,
  TiptapTemplateItem,
  TiptapSlashCommandItem,
  TiptapBuiltinExtension,
};

/**
 * Factory that returns a host-injectable Tiptap-backed `ai-sender` extension
 * component. The host calls this once (e.g. in the page module) and registers
 * the result via `xui:imports` so the schema can reference it as
 * `${$ai.tiptapSender}` on the `ai-sender.senderExtensions` field.
 *
 * Phase 2: returns the StarterKit-only Tiptap editor. Built-in @mention /
 * template / slash popups (Phase 3) are layered via `options.extensions`.
 */
export function createTiptapSender(options?: TiptapSenderOptions): TiptapSenderComponent {
  const resolvedOptions = options ?? {};
  return function TiptapSenderExtension(props: AiSenderExtensionProps): React.ReactElement | null {
    return TiptapSender({ ...props, options: resolvedOptions });
  };
}
