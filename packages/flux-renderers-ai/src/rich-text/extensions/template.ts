// ============================================
// Template insertion extension (P6 Phase 3)
// ============================================
//
// Inserts predefined text snippets into the editor at the caret. The host
// supplies the template list via `TiptapSenderOptions.templates`; the host
// decides how to surface the trigger (toolbar button, slash subcommand, or
// any custom UI). This module provides the insertion primitive only.

import type { Editor } from '@tiptap/react';
import type { TiptapTemplateItem } from '../types.js';

/**
 * Insert a template's `content` at the current caret position. If the editor
 * is not focused, it focuses first (so the caret lands in the editor).
 */
export function insertTemplate(editor: Editor | null, template: TiptapTemplateItem): void {
  if (!editor) return;
  editor.chain().focus().insertContent(template.content).run();
}
