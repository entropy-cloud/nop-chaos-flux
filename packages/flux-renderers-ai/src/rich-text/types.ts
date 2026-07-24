// ============================================
// @nop-chaos/flux-renderers-ai/rich-text — types
// ============================================
//
// Type-only module so the `./rich-text` subpath compiles even before the
// concrete Tiptap editor is implemented. Importing these types does NOT pull
// Tiptap into the host bundle (they are erased at compile time).

import type { Extension } from '@tiptap/react';
import type { ComponentType } from 'react';
import type { AiSenderExtensionProps } from '../schemas.js';

/** A single @-mention source entry. */
export interface TiptapMentionItem {
  id: string;
  label: string;
  avatar?: string;
}

/** A single template-insert entry. */
export interface TiptapTemplateItem {
  label: string;
  content: string;
}

/** A single slash-command entry. */
export interface TiptapSlashCommandItem {
  label: string;
  /** Optional title/description shown in the command menu. */
  description?: string;
  /** Optional icon name (rendered if the host provides an icon resolver). */
  icon?: string;
  /**
   * If set, the command inserts this text into the editor at the caret and
   * `action` is ignored. If omitted, `action` is invoked instead.
   */
  insertText?: string;
  /** Custom action invoked when the command is selected. */
  action?: () => void;
}

/** Built-in extension keys selectable via `TiptapSenderOptions.extensions`. */
export type TiptapBuiltinExtension = 'mention' | 'template' | 'slash';

/**
 * Options for `createTiptapSender`. All fields optional — defaults yield a
 * minimal StarterKit-only editor (no popups). Data sources for the built-in
 * extensions are passed in here so the editor never touches IO.
 */
export interface TiptapSenderOptions {
  /**
   * Built-in extensions to enable. When omitted/empty the editor is StarterKit
   * only. `host` can also pass `extraExtensions` for raw Tiptap `Extension`s.
   */
  extensions?: TiptapBuiltinExtension[];
  /** Data source for the @-mention extension (required when `'mention'`). */
  mentions?: TiptapMentionItem[];
  /** Data source for the template-insert extension (required when `'template'`). */
  templates?: TiptapTemplateItem[];
  /** Data source for the slash-command extension (required when `'slash'`). */
  slashCommands?: TiptapSlashCommandItem[];
  /**
   * Extra raw Tiptap extensions appended after the built-ins (host advanced
   * usage — e.g. `Link`, `Table`, `TaskList`). Host-supplied; the package does
   * not depend on any extension beyond `StarterKit`.
   */
  extraExtensions?: Extension[];
  /** Placeholder text forwarded to the Tiptap Placeholder extension. */
  placeholder?: string;
  /**
   * Fired once after the editor instance is created (host may use it for
   * imperative integration — focus management, programmatic insert, etc.).
   * Not called on rebuilds triggered by `extraExtensions` identity changes.
   */
  onReady?: (editor: import('@tiptap/react').Editor) => void;
}

/** Type alias for the component returned by `createTiptapSender`. */
export type TiptapSenderComponent = ComponentType<AiSenderExtensionProps>;
